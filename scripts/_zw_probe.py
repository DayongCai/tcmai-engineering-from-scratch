# -*- coding: utf-8 -*-
"""药用植物学：扫 12 个内容章 sheet，给候选三辨/四位面的词频。"""
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-药用植物学.xlsx"
wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
texts = []
for name in wb.sheetnames:
    if not re.match(r"^\d{2}\s", name):
        continue
    ws = wb[name]
    buf = []
    for row in ws.iter_rows(values_only=True):
        for c in row:
            if isinstance(c, str):
                buf.append(c)
    texts.append((name, "\n".join(buf)))
whole = "\n".join(t for _, t in texts)
hz = len(re.findall(r"[\u4e00-\u9fff]", whole))
print("章", len(texts), "汉字", hz)
for name, t in texts:
    print(f"  {name[:26]:30} {len(re.findall(r'[一-龥]', t)):>6}")

CAND = {
    "形态描述": ["根", "茎", "叶", "花", "果实", "种子", "形状", "表面", "毛", "刺", "颜色", "断面"],
    "显微结构": ["细胞", "组织", "维管束", "皮层", "木质部", "韧皮部", "气孔", "导管", "纤维", "淀粉粒", "晶体", "腺"],
    "分类鉴定": ["科", "属", "种", "拉丁", "学名", "检索表", "分类", "鉴定", "特征", "区别"],
    "资源应用": ["资源", "分布", "产地", "保护", "栽培", "药用", "功效", "成分", "利用", "濒危", "分子"],
}
print("\n== 三辨候选")
for k, ws in CAND.items():
    n = sum(whole.count(w) for w in ws)
    print(f"  {k:8} {n:>5}")

CAND2 = {
    "器官：根茎叶": ["根", "茎", "叶"],
    "器官：花果实种子": ["花", "果实", "种子", "花序"],
    "类群：低等": ["藻", "菌", "地衣", "苔藓", "蕨"],
    "类群：高等": ["裸子", "被子", "双子叶", "单子叶", "离瓣", "合瓣"],
    "层次：细胞组织": ["细胞", "组织"],
    "层次：器官": ["器官"],
}
print("\n== 四位面候选")
for k, ws in CAND2.items():
    n = sum(whole.count(w) for w in ws)
    print(f"  {k:14} {n:>5}")
