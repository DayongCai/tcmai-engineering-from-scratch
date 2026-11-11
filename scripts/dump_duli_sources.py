#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把外源 PDF 的正文导出成 txt（供人工挑句），写到 standards/zhongyao-du-li/sources/_text/。"""
import os

import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'standards', 'zhongyao-du-li', 'sources')
OUT = os.path.join(SRC, '_text')
os.makedirs(OUT, exist_ok=True)

for fn in sorted(os.listdir(SRC)):
    if not fn.endswith('.pdf'):
        continue
    p = os.path.join(SRC, fn)
    with pdfplumber.open(p) as pdf:
        txt = "\n".join((pg.extract_text() or "") for pg in pdf.pages)
    out = os.path.join(OUT, fn.replace('.pdf', '.txt'))
    open(out, 'w', encoding='utf-8').write(txt)
    print(fn, '->', len(txt), '字符')
