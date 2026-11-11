#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把「抽听」从 P10/P12 推广到全部 29 讲，并把同音字差异沉淀成术语纠错表。

三段式（和 P10/P12 那次同一口径，只是规模化）：
  ① 对齐：旧（vad 版）逐段 → 新（vad=false 版）按四字窗口覆盖率，<0.60 记「疑似丢句」；
  ② 判定：旧句 vs 新版最像等长串 / 可选单段重转，相似度 ≥0.75 同音字、0.50-0.75 切句合并/打散、
     <0.50 且有片头水印词 → 水印/幻觉，其余进「待人工」；
  ③ 沉淀：把「同音字改写」两两做字符级 diff，取 1-3 字的替换对，按出现次数排序；
     一侧命中 361 穴名 / 113 方名 / 底本高频术语 的，标为「可采信（术语）」，其余留「待裁定」。

用法:
  python scripts/asr/audit_all.py                 # 只做①②③，不重转音频（快）
  python scripts/asr/audit_all.py --audio         # 对相似度<0.5 的模糊段再切音频重转（慢）
输出:
  asr/gap-audit/all.json            逐段明细（29 讲）
  asr/gap-audit/summary.json        逐讲统计
  asr/gap-audit/corrections.json    同音字/术语纠错候选
"""
import argparse
import collections
import difflib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MAT = os.path.join(ROOT, "standards", "materials", "shanghan-quannao")
ASRD = os.path.join(MAT, "asr")
OUT = os.path.join(ASRD, "gap-audit")
TMP = os.path.join(os.environ.get("LOCALAPPDATA", "."), "Temp", "sqn")

WATER = ("优优", "独播剧场", "YoYo", "字幕志愿者", "点赞", "投币", "收藏", "转发", "三连",
         "大家再见", "微信")
CJK = re.compile(r"[^一-鿿0-9]")


def norm(s):
    return CJK.sub("", s or "")


def vocab():
    """术语库：361 穴名 + 113 方名 + 398 条原文里的 2-4 字词。"""
    v = set()
    xr = os.path.join(MAT, "xue-route.json")
    if os.path.exists(xr):
        v |= {r["xue"] for r in json.load(open(xr, encoding="utf-8"))["rows"]}
    tj = os.path.join(ROOT, "standards", "shanghan", "tiao-398.json")
    if os.path.exists(tj):
        for t in json.load(open(tj, encoding="utf-8"))["tiao"]:
            txt = t["text"]
            for m in re.finditer(r"[\u4e00-\u9fff]{2,5}汤", txt):
                v.add(m.group(0))
            for m in re.finditer(r"[\u4e00-\u9fff]{2,4}(?:汤|散|丸|承气汤)", txt):
                v.add(m.group(0))
    v |= {"脉浮", "脉沉", "脉微", "脉细", "脉紧", "脉弦", "恶寒", "恶风", "发热", "汗出",
          "心下", "胸胁", "口渴", "小便不利", "大便硬", "谵语", "烦躁", "厥逆", "下利",
          "太阳病", "阳明病", "少阳病", "太阴病", "少阴病", "厥阴病", "桂枝汤", "麻黄汤"}
    # 底本 398 条里的 2-4 字高频片段：单字纠错（脉→麦）要能落到「脉」上，
    # 就不能只认整方名；这里把出现 ≥3 次的片段都收进来
    text_all = ""
    if os.path.exists(tj):
        text_all = "".join(t["text"] for t in json.load(open(tj, encoding="utf-8"))["tiao"])
    frag = collections.Counter()
    for n in (2, 3):
        for i in range(len(text_all) - n + 1):
            frag[text_all[i:i + n]] += 1
    v |= {w for w, c in frag.items() if c >= 3 and re.fullmatch(r"[一-鿿]+", w)}
    # 方名去尾（桂枝汤 → 桂枝）
    v |= {w[:-1] for w in list(v) if len(w) == 3 and w.endswith(("汤", "散", "丸"))}
    return v


def best_match(o, hay):
    L = len(o)
    if L == 0:
        return 0.0, ""
    best, seg = 0.0, ""
    # 粗筛：先用旧句首 3 字定位候选窗口，避免整篇滑窗（29 讲时能快两个量级）
    anchors = [o[:3]] if L >= 3 else []
    idxs = []
    for a in anchors:
        start = 0
        while True:
            k = hay.find(a, start)
            if k < 0:
                break
            idxs.append(max(0, k - 3))
            start = k + 1
    if not idxs:
        idxs = range(0, max(1, len(hay) - L + 3), 2)
    for i in idxs:
        w = hay[i:i + L + 2]
        r = difflib.SequenceMatcher(None, o, w).ratio()
        if r > best:
            best, seg = r, hay[i:i + L]
    return best, seg


def diff_pairs(o, n):
    """旧 → 新 的替换对（只取 1-3 字的等长替换）。"""
    out = []
    sm = difflib.SequenceMatcher(None, o, n)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "replace" and 1 <= (i2 - i1) == (j2 - j1) <= 3:
            out.append((o[i1:i2], n[j1:j2]))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", action="store_true", help="对相似度<0.5 的段切音频重转")
    ap.add_argument("--th", type=float, default=0.60)
    a = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    V = vocab()

    rows, summary = [], []
    for no in range(1, 30):
        old_p = os.path.join(ASRD, "vad-backup", f"p{no:02d}.vad.json")
        new_p = os.path.join(ASRD, f"p{no:02d}.json")
        if not (os.path.exists(old_p) and os.path.exists(new_p)):
            continue
        old = json.load(open(old_p, encoding="utf-8"))
        new = json.load(open(new_p, encoding="utf-8"))
        hay = norm("".join(s["text"] for s in new["segments"]))
        cnt = collections.Counter()
        for s in old["segments"]:
            o = norm(s["text"])
            if len(o) < 4:
                continue
            hit = sum(1 for i in range(len(o) - 3) if o[i:i + 4] in hay)
            cover = hit / (len(o) - 3)
            if cover >= a.th:
                continue
            b, seg = best_match(o, hay)
            body = s["text"] + seg
            if any(w in body for w in WATER):
                v = "水印/幻觉"
            elif b >= 0.75:
                v = "同音字改写"
            elif b >= 0.50:
                v = "切句合并/打散"
            else:
                v = "待人工"
            pairs = diff_pairs(o, seg) if v in ("同音字改写", "切句合并/打散") else []
            rows.append({"no": no, "start": s["start"], "old": s["text"], "new": seg,
                         "cover": round(cover, 2), "sim": round(b, 2), "verdict": v,
                         "pairs": pairs})
            cnt[v] += 1
        summary.append({"no": no, "oldSegs": len(old["segments"]), "newSegs": len(new["segments"]),
                        "oldChars": old["chars"], "newChars": new["chars"],
                        "gaps": sum(cnt.values()), **cnt})
        print(f"P{no:02d} 旧{old['chars']:>5}字 新{new['chars']:>5}字 · 疑似 {sum(cnt.values()):>3} "
              f"(同音 {cnt['同音字改写']}, 切句 {cnt['切句合并/打散']}, 水印 {cnt['水印/幻觉']}, 待人工 {cnt['待人工']})",
              flush=True)

    # 模糊段重转（可选）
    if a.audio:
        import numpy as np
        import wave
        from faster_whisper import WhisperModel
        model = None
        for r in rows:
            if r["verdict"] != "待人工":
                continue
            wav = os.path.join(TMP, f"a{r['no']:02d}.wav")
            if not os.path.exists(wav):
                r["alt"] = ""
                continue
            if model is None:
                model = WhisperModel(os.path.join(os.environ.get("LOCALAPPDATA", ""), "Temp", "models",
                                                  "faster-whisper-turbo"),
                                     device="cpu", compute_type="int8", cpu_threads=6)
            with wave.open(wav, "rb") as w:
                arr = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
            s0 = max(0.0, r["start"] - 0.6)
            s1 = min(len(arr) / 16000.0, r["start"] + max(2.0, len(norm(r["old"])) / 4.2) + 0.8)
            segs, _ = model.transcribe(arr[int(s0 * 16000):int(s1 * 16000)], language="zh",
                                       beam_size=5, vad_filter=False)
            r["alt"] = "".join(x.text.strip() for x in segs)
            ra = difflib.SequenceMatcher(None, norm(r["old"]), norm(r["alt"])).ratio()
            r["simAlt"] = round(ra, 2)
            if max(r["sim"], ra) >= 0.75:
                r["verdict"] = "同音字改写"
            elif max(r["sim"], ra) >= 0.50:
                r["verdict"] = "切句合并/打散"
            print(f"  P{r['no']:02d} {int(r['start']) // 60}:{int(r['start']) % 60:02d} "
                  f"重转像 {ra:.2f} → {r['verdict']}", flush=True)

    # 复用上一次 --audio 留下的证据（alt/simAlt）：不必每次重转，但判决要按它升级
    prev = os.path.join(OUT, "all.json")
    if not a.audio and os.path.exists(prev):
        pm = {(x["no"], round(x["start"], 2)): x for x in json.load(open(prev, encoding="utf-8"))
              if x.get("alt")}
        for r in rows:
            k = (r["no"], round(r["start"], 2))
            if k not in pm:
                continue
            r["alt"] = pm[k]["alt"]
            r["simAlt"] = pm[k].get("simAlt", 0)
            top = max(r["sim"], r["simAlt"] or 0)
            if r["verdict"] == "待人工":
                if top >= 0.75:
                    r["verdict"] = "同音字改写"
                elif top >= 0.50:
                    r["verdict"] = "切句合并/打散"

    # 音频复核会改判 → 统计必须按最终 verdict 重算（第一版把 summary 算在复核之前，数字对不上）
    for r in rows:
        if r.get("alt") and r["verdict"] in ("同音字改写", "切句合并/打散") and not r["pairs"]:
            r["pairs"] = diff_pairs(norm(r["old"]), norm(r["alt"]))
    per = {}
    for r in rows:
        d = per.setdefault(r["no"], collections.Counter())
        d[r["verdict"]] += 1
    for x in summary:
        c = per.get(x["no"], collections.Counter())
        x["gaps"] = sum(c.values())
        for k in ("同音字改写", "切句合并/打散", "水印/幻觉", "待人工"):
            x[k] = c.get(k, 0)

    json.dump(rows, open(os.path.join(OUT, "all.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    json.dump(summary, open(os.path.join(OUT, "summary.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    # ---------- ③ 术语纠错候选
    cnt = collections.Counter()
    ex = {}
    for r in rows:
        for old_w, new_w in r["pairs"]:
            k = (old_w, new_w)
            cnt[k] += 1
            ex.setdefault(k, f"P{r['no']:02d} {int(r['start']) // 60}:{int(r['start']) % 60:02d}「{r['old'][:14]}」")
    # 方向不能靠「哪个版本」定，也不能靠单字频次硬判（甘草/干呕、风家/加 都会判反）。
    # 只在两边证据不对等时才给建议，其余并列，把「底本各出现几次」写进依据列。
    FUNC = set("的了一是在有和就不人都这那吗呢吧啊他它她我你我们他们得地着过还很也都说"
               "个上下来去出到把被给对从与而且但所以因为如果就是")
    tj_txt = "".join(t["text"] for t in json.load(open(os.path.join(ROOT, "standards", "shanghan",
                                                                   "tiao-398.json"), encoding="utf-8"))["tiao"])
    CLS = collections.Counter(tj_txt)

    def freqc(w):
        return min((CLS.get(ch, 0) for ch in w), default=0)

    corr = []
    for (o, n), c in cnt.most_common():
        fo, fn = freqc(o), freqc(n)
        basis = f"底本出现：{o} 最少字 {fo} 次 / {n} 最少字 {fn} 次"
        if len(n) >= 2 and (n in V) != (o in V):
            fix = n if n in V else o
            asr_w = o if fix == n else n
            src = "可采信（术语库唯一命中）"
        elif fo == 0 and fn >= 5:
            asr_w, fix, src = o, n, "可采信（另一侧底本零次）"
        elif fn == 0 and fo >= 5:
            asr_w, fix, src = n, o, "可采信（另一侧底本零次）"
        else:
            if all(ch in FUNC for ch in n) and all(ch in FUNC for ch in o):
                src = "虚词/口语（不入表）"
            else:
                src = "待裁定（两侧底本都常见）"
            corr.append({"pair": f"{o}／{n}", "asr": o, "fix": "", "count": c,
                         "source": src, "basis": basis, "example": ex[(o, n)]})
            continue
        corr.append({"pair": f"{asr_w}→{fix}", "asr": asr_w, "fix": fix, "count": c,
                     "source": src, "basis": basis, "example": ex[(o, n)]})
    corr.sort(key=lambda x: (-x["count"], x["fix"]))
    json.dump(corr, open(os.path.join(OUT, "corrections.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    tot = collections.Counter()
    for s in summary:
        for k in ("同音字改写", "切句合并/打散", "水印/幻觉", "待人工"):
            tot[k] += s.get(k, 0)
    print("\n合计 疑似", sum(tot.values()), dict(tot))
    print("纠错候选", len(corr), "｜可采信",
          sum(1 for c in corr if c["source"].startswith("可采信")), "｜待裁定",
          sum(1 for c in corr if c["source"].startswith("待")), "｜虚词",
          sum(1 for c in corr if c["source"].startswith("虚")))
    print("Top15：", "、".join(f"{c['pair']}×{c['count']}" for c in corr[:15]))


if __name__ == "__main__":
    sys.exit(main())
