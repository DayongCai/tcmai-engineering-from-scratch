# -*- coding: utf-8 -*-
"""针法灸法学：结构 + 词频探底。"""
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-针法灸法学.xlsx"
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
    print(f"  {n[:26]:28} {len(re.findall(r'[一-龥]', t)):>6}")
ws0 = wb[wb.sheetnames[0]]
print("首表列", ws0.max_column, "行", ws0.max_row)
for row in ws0.iter_rows(min_row=1, max_row=4, values_only=True):
    print([str(x)[:22] if x is not None else "" for x in row])

C1 = {
    "手法操作": ["手法", "进针", "行针", "捻转", "提插", "得气", "角度", "深度", "留针"],
    "灸法与器材": ["艾灸", "艾炷", "艾条", "温针", "壮", "器具", "针具", "九针"],
    "应用与宜忌": ["适应证", "禁忌", "注意", "晕针", "意外", "处理", "预防"],
}
C2 = {
    "刺法": ["刺法", "进针", "行针", "补泻", "毫针", "得气"],
    "灸法": ["灸法", "艾灸", "艾炷", "艾条", "温针灸", "壮"],
    "其他疗法": ["拔罐", "三棱针", "皮肤针", "火针", "电针", "穴位注射", "埋线"],
    "规范与安全": ["规范", "标准", "消毒", "无菌", "意外", "禁忌"],
}
for title, C in (("三辨候选", C1), ("四位面候选", C2)):
    print(f"\n== {title}")
    tot = {}
    for k, ws in C.items():
        tot[k] = sum(whole.count(w) for w in ws)
    for k, v in tot.items():
        print(f"  {k:10} {v:>5}")
    print("  ratio", round(max(tot.values()) / max(1, min(tot.values())), 1))
