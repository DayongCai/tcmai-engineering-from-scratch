# -*- coding: utf-8 -*-
"""针灸治疗学：结构 + 词频探底。"""
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-针灸治疗学.xlsx"
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
    t = "\n".join(buf)
    chunks.append((name.strip(), t))
print("内容章", len(chunks))
whole = "\n".join(t for _, t in chunks)
print("汉字", len(re.findall(r"[\u4e00-\u9fff]", whole)))
for n, t in chunks:
    print(f"  {n[:30]:32} {len(re.findall(r'[一-龥]', t)):>6}")

C1 = {
    "病证与辨证": ["病", "证", "辨证", "分型", "证候"],
    "治法与处方": ["治法", "处方", "取穴", "配穴", "主穴", "操作"],
    "疗效与转归": ["疗效", "疗程", "预后", "随访", "评价", "证据"],
}
C2 = {
    "内科病证": ["中风", "头痛", "眩晕", "面瘫", "咳嗽", "胃痛", "泄泻", "便秘", "消渴"],
    "妇儿病证": ["月经", "痛经", "绝经", "不孕", "小儿", "遗尿"],
    "骨伤皮外": ["腰痛", "颈椎", "肩", "膝", "扭伤", "带状疱疹", "痤疮", "湿疹"],
    "五官神志": ["眼", "耳", "鼻", "咽", "牙", "失眠", "抑郁", "戒断"],
}
for title, C in (("三辨候选", C1), ("四位面候选", C2)):
    print(f"\n== {title}")
    tot = {k: sum(whole.count(w) for w in ws) for k, ws in C.items()}
    for k, v in tot.items():
        print(f"  {k:10} {v:>5}")
    print("  ratio", round(max(tot.values()) / max(1, min(tot.values())), 1))
