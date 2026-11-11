# -*- coding: utf-8 -*-
"""按汉字总量把教材章均分成 k 组，输出 --groups 串（供 build_zhangjie_book.py）。

用法: python scripts/balance_groups.py <sub> <k>
读取 standards/<sub>/units.json 的 locator（含「原第N章」或「第N章」）统计每章汉字。
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sub, k = sys.argv[1], int(sys.argv[2])
U = json.load(io.open(os.path.join(ROOT, "standards", sub, "units.json"), encoding="utf-8"))
per = {}
for u in U["units"]:
    m = re.search(r"第(\d+)章", u.get("locator", "")) or re.search(r"第(\d+)章", u.get("source", ""))
    if not m:
        continue
    per[int(m.group(1))] = per.get(int(m.group(1)), 0) + u["hanzi"]
chs = sorted(per)
total = sum(per.values())
target = total / k
groups, cur, acc = [], [], 0
for i, c in enumerate(chs):
    cur.append(c)
    acc += per[c]
    left = len(chs) - i - 1
    need = k - len(groups) - 1
    if len(groups) < k - 1 and (acc >= target * (len(groups) + 1) or left == need):
        groups.append(cur)
        cur = []
if cur:
    groups.append(cur)
print(",".join(f"{g[0]}-{g[-1]}" for g in groups))
print("各组汉字:", [sum(per[c] for c in g) for g in groups], "总计", total)
