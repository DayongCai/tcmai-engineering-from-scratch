#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/probe_duli_sources.py —— 打印外源 PDF 的文本层与关键条号（只读，用来决定能引哪几条）"""
import os
import re

import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'standards', 'zhongyao-du-li', 'sources')

for fn in sorted(os.listdir(SRC)):
    if not fn.endswith('.pdf'):
        continue
    p = os.path.join(SRC, fn)
    try:
        with pdfplumber.open(p) as pdf:
            pages = len(pdf.pages)
            txt = "\n".join((pg.extract_text() or "") for pg in pdf.pages[:3])
    except Exception as e:  # noqa
        print(f"{fn}: 打不开 {e}")
        continue
    print(f"\n=== {fn} · {pages} 页 · 前三页 {len(txt)} 字符 ===")
    print(txt[:900].replace("\n\n", "\n"))
    nums = re.findall(r"^\s*(\d{1,2})\.\s", txt, re.M)
    print("条号样本:", sorted({int(n) for n in nums})[:18])
