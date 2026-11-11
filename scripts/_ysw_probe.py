# -*- coding: utf-8 -*-
"""医学生物学（09-jichu/04-yixue-shengwu-xue，目标 16 章）：版式 + 规模 + 词频探底。"""
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-医学生物学.xlsx"
wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
print("sheets", len(wb.sheetnames))
print(wb.sheetnames[:20])

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
for n, t in chunks[:6]:
    print(f"  {n[:30]:32} {len(re.findall(r'[一-龥]', t)):>6}")
if chunks:
    ws0 = wb[chunks[0][0]]
    print("首章表", ws0.max_row, ws0.max_column)
    for row in ws0.iter_rows(min_row=1, max_row=6, values_only=True):
        print([str(x)[:20] if x is not None else "" for x in row])

C1 = {
    "结构与功能": ["结构", "膜", "细胞器", "核", "功能", "组成"],
    "遗传与变异": ["基因", "染色体", "突变", "遗传", "等位", "表型"],
    "技术与应用": ["技术", "检测", "培养", "克隆", "测序", "诊断", "治疗"],
}
C2 = {
    "细胞层": ["细胞膜", "细胞质", "细胞核", "细胞器", "细胞骨架"],
    "发育与工程": ["增殖", "分化", "衰老", "死亡", "干细胞", "工程"],
    "遗传规律": ["单基因", "多基因", "染色体病", "群体", "系谱", "连锁"],
    "临床与中医": ["临床", "诊断", "治疗", "中医", "体质", "证"],
}
for title, C in (("三辨候选", C1), ("四位面候选", C2)):
    print(f"\n== {title}")
    tot = {k: sum(whole.count(w) for w in ws) for k, ws in C.items()}
    for k, v in tot.items():
        print(f"  {k:10} {v:>5}")
    print("  ratio", round(max(tot.values()) / max(1, min(tot.values())), 1))
