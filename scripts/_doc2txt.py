# -*- coding: utf-8 -*-
"""doc → docx（Word COM），再用 python-docx 抽文本。两步合一。"""
import os
import sys

import win32com.client as win32
from docx import Document

src = os.path.abspath(sys.argv[1])
tmp = os.path.abspath(sys.argv[2])
dst = os.path.abspath(sys.argv[3])

word = win32.gencache.EnsureDispatch("Word.Application")
word.Visible = False
doc = word.Documents.Open(src, ReadOnly=True)
try:
    doc.SaveAs(tmp, FileFormat=16)
finally:
    doc.Close(False)
    word.Quit()

d = Document(tmp)
lines = []
for p in d.paragraphs:
    t = p.text.strip()
    if t:
        lines.append(t)
for tb in d.tables:
    for row in tb.rows:
        cells = [c.text.strip() for c in row.cells]
        if any(cells):
            lines.append(" | ".join(cells))
txt = "\n".join(lines)
open(dst, "w", encoding="utf-8", newline="\n").write(txt)
print("paras", len(lines), "chars", len(txt))
print(txt[:300])
