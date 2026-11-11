# -*- coding: utf-8 -*-
"""诊断 P02/P05/P13 的校勘差异。"""
import io
import json
import re

import pdfplumber

P = "standards/yaoshi-guanli/外源条文.json"
d = json.load(io.open(P, encoding="utf-8"))
by = {c["id"]: c for c in d["clauses"]}

with pdfplumber.open("standards/yaoshi-guanli/sources/GMP-2010.pdf") as pdf:
    txt = "\n".join((pg.extract_text() or "") for pg in pdf.pages)

LIG = {"\ufb01": "fi", "\ufb02": "fl", "\ufb00": "ff"}
PAGE = re.compile(r'^\s*(\d{1,3})\s*$|[—–-]\s*\d{1,3}\s*[—–-]|国家市场监督管理总局发布|国家市场监督管理总局规章|卫生部发布|-\s*\d{1,3}\s*-\s*X?', re.M)


def norm(s):
    for k, v in LIG.items():
        s = s.replace(k, v)
    s = s.replace("\u00ad", "")
    s = PAGE.sub("", s)
    s = re.sub(r"-\s*\n\s*", "", s)
    return re.sub(r"\s+", "", s)


corp = norm(txt)
for cid in ("P02", "P05", "P13"):
    body = by[cid]["原文"]
    n = norm(body)
    print("=", cid, "条", by[cid]["clause"], "len", len(n))
    print("  原文尾:", repr(body[-40:]))
    i = corp.find(n[:30])
    print("  前30字命中位置:", i)
    if i >= 0:
        for k in range(20, min(len(n), 400)):
            if corp[i + k] != n[k]:
                print("  分歧@", k, repr(n[k - 25:k + 15]), "||", repr(corp[i + k - 25:i + k + 15]))
                break
    else:
        # 找出原文里第 30 字之前在语料里能命中的最长前缀
        for L in range(30, 5, -1):
            if corp.find(n[:L]) >= 0:
                print("  最长可命中前缀", L, repr(n[:L][-12:]))
                break
