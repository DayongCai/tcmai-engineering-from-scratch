# -*- coding: utf-8 -*-
"""把 .docx 正文抽成 .txt（保留段落，表格按行拼接）。用法：python _docx2txt.py in.docx out.txt"""
import io
import sys

from docx import Document

src, dst = sys.argv[1], sys.argv[2]
d = Document(src)
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
io.open(dst, "w", encoding="utf-8", newline="\n").write(txt)
print("paras", len(lines), "chars", len(txt))
print(txt[:160])
