# -*- coding: utf-8 -*-
"""针灸医籍选读：结构 + 词频探底。"""
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-针灸医籍选读.xlsx"
wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
print("sheets", len(wb.sheetnames))
chunks = []
for name in wb.sheetnames:
    if not re.match(r"^\d{2}[\s　]", name):
        continue
    ws = wb[name]
    buf = []
    for row in ws.iter_rows(values_only=True):
        for c in row:
            if isinstance(c, str):
                buf.append(c)
    chunks.append((name.strip(), "\n".join(buf)))
print("内容章", len(chunks))
whole = "\n".join(t for _, t in chunks)
print("汉字", len(re.findall(r"[\u4e00-\u9fff]", whole)))
for n, t in chunks:
    print(f"  {n[:30]:32} {len(re.findall(r'[一-龥]', t)):>6}")
ws0 = wb[[s for s in wb.sheetnames if re.match(r'^\d{2}[\s　]', s)][0]]
print("首章表", ws0.max_row, ws0.max_column)
for row in ws0.iter_rows(min_row=1, max_row=6, values_only=True):
    print([str(x)[:26] if x is not None else "" for x in row])

C1 = {
    "原文与训释": ["原文", "注", "校", "释", "通假", "音义"],
    "义理与发挥": ["义", "理", "故", "谓", "发挥", "按"],
    "临证与应用": ["临床", "治", "病", "证", "用针", "刺"],
}
C2 = {
    "内经": ["素问", "灵枢", "黄帝内经", "九针", "经脉"],
    "难经与甲乙": ["难经", "甲乙经", "针灸甲乙经", "八十一难"],
    "晋唐宋金元": ["千金", "外台", "铜人", "资生", "子午流注", "标幽赋"],
    "明清近代": ["针灸大成", "金针赋", "医宗金鉴", "针灸聚英", "杨继洲"],
}
for title, C in (("三辨候选", C1), ("四位面候选：医籍来源", C2)):
    print(f"\n== {title}")
    tot = {k: sum(whole.count(w) for w in ws) for k, ws in C.items()}
    for k, v in tot.items():
        print(f"  {k:10} {v:>5}")
    print("  ratio", round(max(tot.values()) / max(1, min(tot.values())), 1))
