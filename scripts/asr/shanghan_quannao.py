#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""《伤寒论》原文全脑记忆（B站 BV13shNz8ECv）→ 音频 / 语音识别 / 画面切片

子命令:
  manifest                重建分 P 清单（含标题条号）
  fetch  [lo] [hi]        取音频（DASH 最优音轨 → 16k 单声道 WAV，时长校核）
  asr    [lo] [hi]        WAV → faster-whisper 转写（asr/pNN.json）
  frames [lo] [hi]        取低码率视频 → 每 5s 抽帧 → frames/pNN/fNNNN.jpg
  pick   [lo] [hi]        从帧中挑「画面内容最丰富」的若干张 → assets/palace/pNN-k.jpg

网络全部带重试；单页失败不中断整批（记 errors 后继续）。
"""
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MAT = os.path.join(ROOT, "standards", "materials", "shanghan-quannao")
SRC = os.path.join(MAT, "sources")
ASRD = os.path.join(MAT, "asr")
FRD = os.path.join(MAT, "frames")
AST = os.path.join(ROOT, "assets", "shanghan-palace")
TMP = os.path.join(os.environ.get("LOCALAPPDATA", "."), "Temp", "sqn")
FFDIR = os.path.join(os.environ.get("LOCALAPPDATA", ""), "ffmpeg", "ffmpeg-9.0.2-essentials_build", "bin")
FF = os.path.join(FFDIR, "ffmpeg.exe")
FP = os.path.join(FFDIR, "ffprobe.exe")
MODEL = os.path.join(os.environ.get("LOCALAPPDATA", ""), "Temp", "models", "faster-whisper-turbo")
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")
BV = "BV13shNz8ECv"
FRAME_EVERY = 5  # 秒

PROMPT = (
    "《伤寒论》原文背诵。太阳病、阳明病、少阳病、太阴病、少阴病、厥阴病、辨太阳病脉证并治、"
    "麻黄汤、桂枝汤、葛根汤、小柴胡汤、大承气汤、小承气汤、调胃承气汤、白虎汤、白虎加人参汤、"
    "五苓散、理中丸、四逆汤、通脉四逆汤、真武汤、附子汤、乌梅丸、黄连阿胶汤、栀子豉汤、"
    "半夏泻心汤、大陷胸汤、桃核承气汤、桂枝加附子汤、苓桂术甘汤、吴茱萸汤、麻黄细辛附子汤、"
    "脉浮、头项强痛、恶寒、汗出、恶风、脉浮紧、无汗而喘、胃家实、口苦咽干目眩、"
    "腹满而吐、脉微细但欲寐、消渴气上撞心、记忆宫殿、记忆桩、照相记忆、成像记忆、"
    "任脉、督脉、十二正经、经络穴位。"
)


def get_bytes(url, tries=4, timeout=120):
    last = None
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA,
                                                       "Referer": f"https://www.bilibili.com/video/{BV}/"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 + 3 * i)
    raise RuntimeError(f"取失败 {url[:90]}: {last}")


def get_json(url, **kw):
    return json.loads(get_bytes(url, **kw).decode("utf-8", "replace"))


def manifest(force=False):
    os.makedirs(SRC, exist_ok=True)
    path = os.path.join(SRC, "episodes.json")
    if os.path.exists(path) and not force:
        return json.load(open(path, encoding="utf-8"))
    raw = get_json(f"https://api.bilibili.com/x/web-interface/view?bvid={BV}")
    d = raw["data"]
    json.dump(raw, open(os.path.join(SRC, "api-view.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    eps = []
    for p in d["pages"]:
        nums = []
        m = re.search(r"第([\d、\-—,，]+)条?", p["part"])
        if m:
            for piece in m.group(1).replace("—", "-").replace("，", "、").split("、"):
                if "-" in piece:
                    a, b = piece.split("-")[:2]
                    if a.isdigit() and b.isdigit():
                        nums += list(range(int(a), int(b) + 1))
                elif piece.isdigit():
                    nums.append(int(piece))
        eps.append({"no": p["page"], "bvid": BV, "cid": p["cid"], "dur": p["duration"],
                    "part": p["part"], "tiao": sorted(set(nums))})
    out = {"$generated": "python scripts/asr/shanghan_quannao.py manifest",
           "note": "B站 BV13shNz8ECv 分 P 清单；dur=页面标注秒；tiao=标题所标条文号",
           "season": {"title": d["title"], "owner": d["owner"]["name"], "pages": len(eps),
                      "totalDurSource": sum(e["dur"] for e in eps), "pubdate": d["pubdate"]},
           "episodes": eps}
    json.dump(out, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return out


def playurl(cid):
    j = get_json(f"https://api.bilibili.com/x/player/playurl?bvid={BV}&cid={cid}"
                 "&qn=32&fnval=16&fnver=0&platform=pc&fourk=0")
    dash = (j.get("data") or {}).get("dash") or {}
    return dash.get("audio") or [], dash.get("video") or []


def probe(path):
    out = subprocess.run([FP, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True).stdout.strip()
    try:
        return float(out)
    except ValueError:
        return 0.0


def download(url, dest, min_bytes=200_000):
    data = get_bytes(url, timeout=900)
    if len(data) < min_bytes:
        raise RuntimeError(f"下载过小 {len(data)}B")
    with open(dest, "wb") as f:
        f.write(data)
    return len(data)


def fetch_audio(ep):
    os.makedirs(TMP, exist_ok=True)
    no, exp = ep["no"], ep["dur"]
    wav = os.path.join(TMP, f"a{no:02d}.wav")
    if os.path.exists(wav) and abs(probe(wav) - exp) <= max(2.0, exp * 0.02):
        return wav, probe(wav)
    aud, _ = playurl(ep["cid"])
    if not aud:
        raise RuntimeError("无 DASH 音轨")
    a = sorted(aud, key=lambda x: x.get("bandwidth") or 0)[-1]
    raw = os.path.join(TMP, f"v{no:02d}.m4s")
    download(a.get("baseUrl") or a.get("base_url"), raw)
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", raw, "-vn", "-ac", "1", "-ar", "16000",
                    "-c:a", "pcm_s16le", wav], check=True)
    os.remove(raw)
    return wav, probe(wav)


def transcribe(no, wav):
    os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")
    os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
    import numpy as np
    from faster_whisper import WhisperModel
    with wave.open(wav, "rb") as w:
        arr = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
    model = WhisperModel(MODEL, device="cpu", compute_type="int8",
                         cpu_threads=int(os.environ.get("THREADS", "8")))
    t0 = time.time()
    segs, _ = model.transcribe(arr, language="zh", beam_size=5, vad_filter=True,
                               vad_parameters={"min_silence_duration_ms": 500},
                               initial_prompt=PROMPT, condition_on_previous_text=False)
    rec_segs = [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()}
                for s in segs if s.text.strip()]
    wall = time.time() - t0
    aud = len(arr) / 16000.0
    os.makedirs(ASRD, exist_ok=True)
    rec = {"no": no, "model": os.path.basename(MODEL), "beam": 5, "audioSec": round(aud, 1),
           "wallSec": round(wall, 1), "speed": round(aud / wall, 2),
           "chars": sum(len(s["text"]) for s in rec_segs), "segments": rec_segs}
    json.dump(rec, open(os.path.join(ASRD, f"p{no:02d}.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"[{no:02d}] 音频 {aud:.0f}s / 用时 {wall:.0f}s = {aud/wall:.2f}x · "
          f"段 {len(rec_segs)} · 字 {rec['chars']}", flush=True)


def fetch_frames(ep):
    no = ep["no"]
    d = os.path.join(FRD, f"p{no:02d}")
    if os.path.isdir(d) and len([f for f in os.listdir(d) if f.endswith(".jpg")]) >= max(4, ep["dur"] // FRAME_EVERY - 2):
        return d
    os.makedirs(d, exist_ok=True)
    _, vid = playurl(ep["cid"])
    if not vid:
        raise RuntimeError("无 DASH 视频轨")
    # 最低码率（够看清画面插图），优先 avc
    v = sorted([x for x in vid if (x.get("codecs") or "").startswith("avc")] or vid,
               key=lambda x: (x.get("bandwidth") or 0))[0]
    raw = os.path.join(TMP, f"m{no:02d}.m4s")
    download(v.get("baseUrl") or v.get("base_url"), raw, min_bytes=100_000)
    subprocess.run([FF, "-y", "-loglevel", "error", "-i", raw, "-vf",
                    f"fps=1/{FRAME_EVERY},scale=720:-1", "-q:v", "4",
                    os.path.join(d, "f%04d.jpg")], check=True)
    os.remove(raw)
    return d


def score_img(path):
    """图文区分：文字页面 = 高边缘密度 + 低色彩 → 分数低；插图 = 色彩丰富。"""
    from PIL import Image, ImageStat
    import numpy as np
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(np.float32)
    sat = np.asarray(im.convert("HSV")).astype(np.float32)[:, :, 1].mean() / 255.0
    g = np.asarray(im.convert("L")).astype(np.float32)
    edge = float(np.abs(np.diff(g, axis=0)).mean() + np.abs(np.diff(g, axis=1)).mean()) / 255.0
    color = float(np.abs(a[:, :, 0] - a[:, :, 1]).mean() + np.abs(a[:, :, 1] - a[:, :, 2]).mean()) / 255.0
    mean = ImageStat.Stat(im).mean
    dark = 1.0 - (sum(mean) / 3 / 255.0)
    return round(sat * 2 + color * 2 + dark - edge * 1.2, 4)


def pick(ep, k=3):
    d = os.path.join(FRD, f"p{ep['no']:02d}")
    files = sorted(f for f in os.listdir(d) if f.endswith(".jpg"))
    if not files:
        return []
    scored = sorted(((score_img(os.path.join(d, f)), f) for f in files), reverse=True)
    # 相邻去重：间隔至少 2 帧（≥10s），避免同一画面选多次
    chosen, idx = [], []
    for s, f in scored:
        i = files.index(f)
        if any(abs(i - j) < 2 for j in idx):
            continue
        chosen.append((s, f, (i * FRAME_EVERY) + ep.get("start", 0)))
        idx.append(i)
        if len(chosen) >= k:
            break
    os.makedirs(os.path.join(AST, "raw"), exist_ok=True)
    out = []
    for s, f, sec in chosen:
        dest = os.path.join(AST, "raw", f"p{ep['no']:02d}-{sec:04d}.jpg")
        subprocess.run([FF, "-y", "-loglevel", "error", "-i", os.path.join(d, f),
                        "-vf", "scale=1280:-1", "-q:v", "2", dest], check=True)
        out.append({"no": ep["no"], "file": dest, "sec": sec, "score": s, "frame": f})
    return out


def pages(man, lo, hi):
    return [e for e in man["episodes"] if lo <= e["no"] <= hi]


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "manifest"
    man = manifest("--force" in sys.argv)
    if cmd == "manifest":
        print(f"[manifest] {len(man['episodes'])} P · {man['season']['totalDurSource']}s")
        return
    lo = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    hi = int(sys.argv[3]) if len(sys.argv) > 3 else lo
    force = "--force" in sys.argv
    errors = []
    for ep in pages(man, lo, hi):
        try:
            if cmd == "fetch":
                wav, got = fetch_audio(ep)
                print(f"[{ep['no']:02d}] 音频 {got:.1f}s / 页面 {ep['dur']}s", flush=True)
            elif cmd == "asr":
                dest = os.path.join(ASRD, f"p{ep['no']:02d}.json")
                if os.path.exists(dest) and not force:
                    print(f"[{ep['no']:02d}] 已转写，跳过")
                    continue
                wav, got = fetch_audio(ep)
                transcribe(ep["no"], wav)
            elif cmd == "frames":
                d = fetch_frames(ep)
                print(f"[{ep['no']:02d}] 帧 {len(os.listdir(d))} 张", flush=True)
            elif cmd == "pick":
                got = pick(ep)
                print(f"[{ep['no']:02d}] 选图 {[(g['sec'], g['score']) for g in got]}", flush=True)
        except Exception as e:  # noqa: BLE001
            errors.append({"no": ep["no"], "cmd": cmd, "error": str(e)[:200]})
            print(f"[{ep['no']:02d}] 失败：{str(e)[:160]}", flush=True)
    if errors:
        json.dump(errors, open(os.path.join(MAT, f"errors-{cmd}.json"), "w", encoding="utf-8"),
                  ensure_ascii=False, indent=1)
        print(f"失败 {len(errors)} 页 → errors-{cmd}.json")


if __name__ == "__main__":
    main()
