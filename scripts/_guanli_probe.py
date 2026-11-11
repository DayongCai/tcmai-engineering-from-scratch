# -*- coding: utf-8 -*-
"""管理系教材盘点：每本书的章数、汉字量、版式（sheet 命名与列数）。"""
import re

import openpyxl

BOOKS = [
    "qhzy-管理学基础.xlsx", "qhzy-公共管理学.xlsx", "qhzy-管理心理学.xlsx",
    "qhzy-卫生管理学.xlsx", "qhzy-卫生法学.xlsx", "qhzy-卫生经济学.xlsx",
    "qhzy-医院管理学.xlsx", "qhzy-医院会计与财务管理.xlsx", "qhzy-医药人力资源管理.xlsx",
    "qhzy-中医健康管理.xlsx", "qhzy-卫生信息管理.xlsx", "qhzy-卫生统计学.xlsx",
]
HANZI = re.compile(r"[\u4e00-\u9fff]")

print(f"{'书':34s} {'章':>3s} {'汉字':>9s}  版式")
for b in BOOKS:
    try:
        wb = openpyxl.load_workbook("F:/textbooks/" + b, read_only=True, data_only=True)
    except Exception as e:
        print(f"{b:34s}  打不开：{e}")
        continue
    chs = [n for n in wb.sheetnames if re.match(r"^\d{2}\s", n)] or \
          [n for n in wb.sheetnames if re.match(r"^第[一二三四五六七八九十百]+章", n)] or \
          [n for n in wb.sheetnames if re.match(r"^\d{2}[ \u3000]", n)]
    tot, cols = 0, set()
    for n in chs:
        ws = wb[n]
        cols.add(ws.max_column)
        for r in ws.iter_rows(values_only=True):
            for v in r:
                if v:
                    tot += len(HANZI.findall(str(v)))
    style = "-"
    if chs:
        cols_s = sorted(set(c for c in cols if c))
        style = f"{len(chs)}章 / 列 {cols_s} / 例「{chs[0][:14]}」"
    print(f"{b:34s} {len(chs):3d} {tot:9,d}  {style}")
