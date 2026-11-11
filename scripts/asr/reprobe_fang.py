#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""对「待人工」的模糊段做第二次重转：initial_prompt 里塞进全部方名。

背景：audit_all 把 21 段判成「待人工」，多是方名连读（茯苓桂枝白朮甘草、桂枝加附子汤…）。
whisper 的 initial_prompt 能显著抬高这些专名的先验，所以只对这 21 段再转一次，
用「第一次单段重转」作对照，看方名提示到底有没有把话说清楚。

用法: python scripts/asr/reprobe_fang.py
输出: asr/gap-audit/fang-probe.json
"""
import difflib
import json
import os
import re
import wave

import numpy as np
from faster_whisper import WhisperModel

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MAT = os.path.join(ROOT, "standards", "materials", "shanghan-quannao")
GA = os.path.join(MAT, "asr", "gap-audit")
TMP = os.path.join(os.environ.get("LOCALAPPDATA", "."), "Temp", "sqn")
MODEL = os.path.join(os.environ.get("LOCALAPPDATA", ""), "Temp", "models", "faster-whisper-turbo")
BASE = ("《伤寒论》原文背诵。太阳病、阳明病、少阳病、太阴病、少阴病、厥阴病、"
        "记忆宫殿、记忆桩、任脉、督脉、十二正经、经络穴位。")


def norm(s):
    return re.sub(r"[^一-鿿0-9]", "", s or "")


def fang_names():
    d = json.load(open(os.path.join(ROOT, "standards", "shanghan", "tiao-398.json"), encoding="utf-8"))
    out = []
    for t in d["tiao"]:
        f = t.get("fang")
        if isinstance(f, list):
            out += f
        elif f:
            out.append(f)
    seen, res = set(), []
    for n in out:
        if n not in seen:
            seen.add(n)
            res.append(n)
    return res


def main():
    import sys
    short = "--short" in sys.argv
    rows = [r for r in json.load(open(os.path.join(GA, "all.json"), encoding="utf-8"))
            if r["verdict"] == "待人工"]
    names = fang_names()
    eps = {e["no"]: e for e in json.load(open(os.path.join(MAT, "sources", "episodes.json"),
                                             encoding="utf-8"))["episodes"]}
    tiao_fang = {t["no"]: (t.get("fang") or []) for t in json.load(
        open(os.path.join(ROOT, "standards", "shanghan", "tiao-398.json"), encoding="utf-8"))["tiao"]}
    prompt = BASE + "本方涉及方剂：" + "、".join(names) + "。"
    print(f"待人工 {len(rows)} 段 · 提示词含 {len(names)} 个方名 · {len(prompt)} 字", flush=True)
    model = WhisperModel(MODEL, device="cpu", compute_type="int8", cpu_threads=6)
    out = []
    for i, r in enumerate(rows, 1):
        wav = os.path.join(TMP, f"a{r['no']:02d}.wav")
        if not os.path.exists(wav):
            continue
        with wave.open(wav, "rb") as w:
            arr = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
        dur = len(arr) / 16000.0
        o = norm(r["old"])
        s0 = max(0.0, r["start"] - 0.8)
        s1 = min(dur, r["start"] + max(2.5, len(o) / 4.0) + 1.2)
        clip = arr[int(s0 * 16000):int(s1 * 16000)]
        pr = prompt
        if short:   # 只给本讲涉及的那几个方名（≤8 个），避免长提示把模型带成复述
            loc = []
            for n in eps.get(r["no"], {}).get("tiao", []):
                loc += tiao_fang.get(n, [])
            loc = list(dict.fromkeys(loc))[:8]
            pr = BASE + ("本讲涉及方剂：" + "、".join(loc) + "。" if loc else "")
        segs, _ = model.transcribe(clip, language="zh", beam_size=5, vad_filter=False,
                                   initial_prompt=pr, condition_on_previous_text=False)
        alt2 = "".join(x.text.strip() for x in segs)
        sim2 = difflib.SequenceMatcher(None, o, norm(alt2)).ratio()
        prev = r.get("simAlt") or 0
        out.append({"no": r["no"], "start": r["start"], "old": r["old"],
                    "alt1": r.get("alt") or "", "sim1": round(prev, 2),
                    "alt2": alt2, "sim2": round(sim2, 2),
                    "gain": round(sim2 - prev, 2),
                    "hit_fang": [n for n in names if n in alt2]})
        print(f"{i:02d}/{len(rows)} P{r['no']:02d} {int(r['start']) // 60}:{int(r['start']) % 60:02d} "
              f"旧 {prev:.2f} → 方名提示 {sim2:.2f} ({sim2 - prev:+.2f}) | {alt2[:40]}", flush=True)
    json.dump(out, open(os.path.join(GA, "fang-probe-short.json" if short else "fang-probe.json"),
                        "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    up = [x for x in out if x["gain"] >= 0.15]
    ok = [x for x in out if x["sim2"] >= 0.75]
    print(f"\n改善≥0.15：{len(up)} 段；提到 ≥0.75（可判为同音字改写）：{len(ok)} 段")
    if ok:
        print("可判段：", [(x["no"], f"{int(x['start']) // 60}:{int(x['start']) % 60:02d}", x["sim2"]) for x in ok])


if __name__ == "__main__":
    main()
