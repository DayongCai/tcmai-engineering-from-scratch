# -*- coding: utf-8 -*-
"""针灸学：结构 + 词频探底（30 章目标，全库最大单课）。"""
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-针灸学.xlsx"
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
    print(f"  {n[:34]:36} {len(re.findall(r'[一-龥]', t)):>6}")
first = [s for s in wb.sheetnames if re.match(r"^\d{2}[\s　]", s)][0]
ws0 = wb[first]
print("首章表", ws0.max_row, ws0.max_column)
for row in ws0.iter_rows(min_row=1, max_row=7, values_only=True):
    print([str(x)[:24] if x is not None else "" for x in row])
