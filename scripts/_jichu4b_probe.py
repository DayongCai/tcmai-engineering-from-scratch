# -*- coding: utf-8 -*-
"""探四本基础教材：正常人体学 / 疾病学基础 / 流行病学 / 免疫学基础与病原生物学。"""
import re

import openpyxl

BOOKS = {
    "正常人体学": r"F:\textbooks\qhzy-正常人体学.xlsx",
    "疾病学基础": r"F:\textbooks\qhzy-疾病学基础.xlsx",
    "流行病学": r"F:\textbooks\qhzy-流行病学.xlsx",
    "免疫病原": r"F:\textbooks\qhzy-免疫学基础与病原生物学.xlsx",
}
for tag, src in BOOKS.items():
    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    chs = [n for n in wb.sheetnames if re.match(r"^\d{2}[\s　]", n)]
    whole = 0
    for n in chs:
        t = "\n".join(str(c) for row in wb[n].iter_rows(values_only=True) for c in row if isinstance(c, str))
        whole += len(re.findall(r"[\u4e00-\u9fff]", t))
    print(f"\n== {tag} · sheets {len(wb.sheetnames)} · 内容章 {len(chs)} · 汉字 {whole:,}")
    print("  章名:", [c[:16] for c in chs])
    if chs:
        ws = wb[chs[0]]
        print("  列数", ws.max_column)
        for row in ws.iter_rows(min_row=1, max_row=5, values_only=True):
            print("   ", [str(x)[:18] if x is not None else "" for x in row][:6])
    plan = [n for n in wb.sheetnames if "目录" in n]
    if plan:
        for row in wb[plan[0]].iter_rows(values_only=True):
            line = " ".join(str(c) for c in row if c is not None)
            if "篇" in line:
                print("  篇:", line[:70])
