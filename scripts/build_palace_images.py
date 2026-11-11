#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""从视频抽帧里切出「条文 + 联想图像」画面，按条文对齐，供 xlsx 内嵌。

对齐算法：用该 P 的 ASR 分段文本与条文原文做字符二元组重叠，找该条被念出的时间窗，
再在窗内按插图度（饱和度/色彩/暗度 − 边缘密度）挑一帧；找不到匹配就退回该 P 最佳插图帧。
切图：去掉底部水印条（y > 0.87H），宽 720。
"""
import json
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAT = os.path.join(ROOT, "standards", "materials", "shanghan-quannao")
FRD = os.path.join(MAT, "frames")
ASRD = os.path.join(MAT, "asr")
OUTD = os.path.join(ROOT, "assets", "shanghan-palace")
FFDIR = os.path.join(os.environ.get("LOCALAPPDATA", ""), "ffmpeg", "ffmpeg-9.0.2-essentials_build", "bin")
FF = os.path.join(FFDIR, "ffmpeg.exe")
EVERY = 5


def bigrams(s):
    s = re.sub(r"[^\u4e00-\u9fff]", "", s)
    return {s[i:i + 2] for i in range(len(s) - 1)}


def score_img(path):
    """插图度：下半屏颜色种类（ncol）+ 色彩强度。纯文字页底色单一、白框占满，
    联想图页则布满彩色形状；ncol 在实测样本里是区分度最好的量（文字页 ≈90-110，插图页 ≈140-180）。"""
    from PIL import Image
    import numpy as np
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(np.int16)
    h = a.shape[0]
    b = a[int(h * 0.45):int(h * 0.87)]
    q = b // 32
    ncol = len(np.unique(q[:, :, 0] * 64 + q[:, :, 1] * 8 + q[:, :, 2]))
    colorf = float(np.abs(b[:, :, 0] - b[:, :, 1]).mean() + np.abs(b[:, :, 1] - b[:, :, 2]).mean()) / 255.0
    return round(ncol / 100.0 + colorf, 4)


def crop(src, dest, w=720):
    from PIL import Image
    im = Image.open(src)
    W, H = im.size
    im = im.crop((0, 0, W, int(H * 0.87)))
    if im.width > w:
        im = im.resize((w, int(im.height * w / im.width)), Image.LANCZOS)
    im.save(dest, quality=86, optimize=True)
    return im.size


def main():
    tiao = {t["no"]: t for t in json.load(open(os.path.join(ROOT, "standards", "shanghan", "tiao-398.json"),
                                               encoding="utf-8"))["tiao"]}
    man = json.load(open(os.path.join(MAT, "sources", "episodes.json"), encoding="utf-8"))
    os.makedirs(OUTD, exist_ok=True)
    out = {"$generated": "python scripts/build_palace_images.py",
           "note": "切图来源：B站 BV13shNz8ECv 低码率视频轨每 5s 抽帧；切掉底部水印条",
           "images": {}, "perPage": {}}
    for ep in man["episodes"]:
        no = ep["no"]
        d = os.path.join(FRD, f"p{no:02d}")
        if not os.path.isdir(d):
            continue
        frames = sorted(f for f in os.listdir(d) if f.endswith(".jpg"))
        if not frames:
            continue
        # 该 P 的 ASR
        segs = []
        ap = os.path.join(ASRD, f"p{no:02d}.json")
        if os.path.exists(ap):
            segs = json.load(open(ap, encoding="utf-8"))["segments"]
        picks = {}
        # 时间轴锚点：视频每教一条都会先念「第N条」，用它切块最稳（比原文二元组匹配可靠——
        # 第77条曾因原文复述被 ASR 打散而匹配到 19s，窗口一路吃到第78条的画面）
        DIG = {"零": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5,
               "六": 6, "七": 7, "八": 8, "九": 9}

        def cn2int(z):
            if z.isdigit():
                return int(z)
            if "百" in z:
                a, _, b = z.partition("百")
                return (DIG.get(a, 1) if a else 1) * 100 + (cn2int(b) if b else 0)
            if "十" in z:
                a, _, b = z.partition("十")
                return (DIG.get(a, 1) if a else 1) * 10 + (DIG.get(b, 0) if b else 0)
            return DIG.get(z, 0)

        marks = []
        for sg in segs:
            for m in re.finditer(r"第([一二三四五六七八九十百零两\d]{1,4})条", sg["text"]):
                v = cn2int(m.group(1))
                if 1 <= v <= 398 and all(v != x[1] for x in marks):
                    marks.append((sg["start"], v))
        marks.sort()
        for i, (t0, t) in enumerate(marks):
            if t not in ep["tiao"] and t not in tiao:
                continue
            nxt = marks[i + 1][0] if i + 1 < len(marks) else min(ep["dur"], t0 + 240)
            span = max(40.0, nxt - t0)
            # 画面切换滞后于口播 20-40s：窗口取本条中后段，避免抓到上一条「回放」的图，
            # 也避免抓到本条刚开场还没出图的文字页（条9 曾抓到条8 的回放图）
            a, b = t0 + span * 0.28, t0 + span * 0.95
            lo = max(0, int(a / EVERY))
            hi = min(len(frames) - 1, int(b / EVERY))
            if hi <= lo:
                hi = min(len(frames) - 1, lo + 12)
            best_s = 1.0
            cand = frames[lo:hi + 1] or frames
            ranked = sorted(((score_img(os.path.join(d, f)), f) for f in cand), reverse=True)
            src = os.path.join(d, ranked[0][1])
            dest = os.path.join(OUTD, f"p{no:02d}-t{t:03d}.jpg")
            size = crop(src, dest)
            picks[t] = {"file": os.path.basename(dest), "frame": ranked[0][1],
                        "match": round(best_s, 2), "size": size,
                        "sec": (frames.index(ranked[0][1]) * EVERY),
                        "win": [lo * EVERY, hi * EVERY]}
        # 每 P 两幅总览图（方法/插图）
        ranked = sorted(((score_img(os.path.join(d, f)), f) for f in frames), reverse=True)
        gen = []
        used = set()
        for s, f in ranked:
            i = frames.index(f)
            if any(abs(i - j) < 6 for j in used):
                continue
            used.add(i)
            dest = os.path.join(OUTD, f"p{no:02d}-v{len(gen) + 1}.jpg")
            crop(os.path.join(d, f), dest)
            gen.append({"file": os.path.basename(dest), "frame": f, "sec": i * EVERY})
            if len(gen) >= 2:
                break
        out["images"][str(no)] = picks
        out["perPage"][str(no)] = gen
        print(f"[{no:02d}] 条图 {len(picks)} · 总览图 {len(gen)}")
    json.dump(out, open(os.path.join(MAT, "palace-images.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
