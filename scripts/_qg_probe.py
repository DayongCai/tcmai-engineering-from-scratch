# -*- coding: utf-8 -*-
"""中医气功学：结构 + 词频探底。"""
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-中医气功学.xlsx"
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
first = [s for s in wb.sheetnames if re.match(r"^\d{2}[\s　]", s)][0]
ws0 = wb[first]
print("首章表", ws0.max_row, ws0.max_column)
for row in ws0.iter_rows(min_row=1, max_row=8, values_only=True):
    print([str(x)[:24] if x is not None else "" for x in row])

C1 = {
    "功法操作": ["姿势", "呼吸", "意念", "动作", "操作", "练功", "吐纳", "调息", "入静"],
    "理论原理": ["气", "经络", "脏腑", "精气神", "阴阳", "三调", "机理"],
    "应用与注意": ["主治", "适应证", "禁忌", "偏差", "注意", "疗效", "康复"],
}
C2 = {
    "传统功法": ["八段锦", "五禽戏", "六字诀", "易筋经", "太极拳", "内养功", "放松功"],
    "医理与三调": ["调身", "调息", "调心", "三调", "精", "气", "神"],
    "临床与康复": ["康复", "临床", "慢性病", "高血压", "糖尿病", "失眠", "肿瘤"],
    "古典文献": ["内经", "素问", "灵枢", "诸病源候", "导引", "养生"],
}
for title, C in (("三辨候选", C1), ("四位面候选", C2)):
    print(f"\n== {title}")
    tot = {k: sum(whole.count(w) for w in ws) for k, ws in C.items()}
    for k, v in tot.items():
        print(f"  {k:10} {v:>5}")
    print("  ratio", round(max(tot.values()) / max(1, min(tot.values())), 1))
