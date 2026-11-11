#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""用「读屏字幕」当答案给 ASR 打分：字幕行有多少字能在 ASR 文本里按序找到（LCS 召回）。
为何这样打分：读屏字幕是画面上的真文本（人工读出的），但它是**分段配的**，只覆盖部分时长；
所以衡量的是「ASR 在字幕出现处的覆盖质量」，不是全文准确率。
用法: python score_asr.py <asr.json> <samples.json(第19讲)> [windowBefore] [windowAfter]
"""
import json
import sys
from difflib import SequenceMatcher

asr_path, cap_path = sys.argv[1], sys.argv[2]
before = float(sys.argv[3]) if len(sys.argv) > 3 else 1.5
after = float(sys.argv[4]) if len(sys.argv) > 4 else 3.5

asr = json.load(open(asr_path, encoding="utf-8"))
caps = json.load(open(cap_path, encoding="utf-8"))["samples"]
caps = [c for c in caps if c.get("line")]
# 只评「落在转写范围内」的字幕行 —— 切片外的行没有 ASR 文本可比，算 0 分是评测错误
hi = asr["segments"][-1]["end"] if asr["segments"] else 0
inRange = [c for c in caps if c["sec"] <= hi]
skipped = len(caps) - len(inRange)
caps = inRange

def lcs_len(a, b):
    m = SequenceMatcher(None, a, b, autojunk=False)
    return sum(bl.size for bl in m.get_matching_blocks())

rows, hits = [], 0
for c in caps:
    win = "".join(s["text"] for s in asr["segments"]
                  if s["end"] >= c["sec"] - before and s["start"] <= c["sec"] + after)
    if not win:
        rows.append((c["mmss"], 0.0, 0, c["line"], ""))
        continue
    r = lcs_len(c["line"], win) / len(c["line"])
    rows.append((c["mmss"], r, len(c["line"]), c["line"], win))
    hits += 1 if r >= 0.8 else 0

cov = [r for _, r, _, _, _ in rows]
nz = [r for r in cov if r > 0]
print(f"{asr_path}  模型 {asr['model']}  倍速 {asr['speed']}×  段 {len(asr['segments'])}")
print(f"转写时长 {hi:.0f}s · 范围内字幕行 {len(rows)} 条（范围内 {hits} 条召回≥80%；范围外 {skipped} 条不计）")
print(f"平均召回 {sum(cov)/len(cov):.3f} · 有重叠行平均 {sum(nz)/len(nz) if nz else 0:.3f} · 零重叠 {len(cov)-len(nz)} 条")
for mm, r, n, cap, win in rows[:6]:
    print(f"  {mm} 召回 {r:.2f}  字幕「{cap}」← ASR「{win[:60]}」")
