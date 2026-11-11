# -*- coding: utf-8 -*-
"""探四本教材的版式：解剖 / 组胚 / 生化 / 局部解剖。"""
import re

import openpyxl

BOOKS = {
    "解剖": r"F:\textbooks\qhzy-人体解剖学.xlsx",
    "组胚": r"F:\textbooks\qhzy-组织学与胚胎学.xlsx",
    "生化": r"F:\textbooks\qhzy-生物化学.xlsx",
    "局部": r"F:\textbooks\qhzy-局部解剖学.xlsx",
}
for tag, src in BOOKS.items():
    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    chs = [n for n in wb.sheetnames if re.match(r"^\d{2}[\s　]", n)]
    if not chs:
        chs = [n for n in wb.sheetnames if re.match(r"^第?\d+[\s　章]", n)]
    whole = 0
    for n in chs:
        t = "\n".join(str(c) for row in wb[n].iter_rows(values_only=True) for c in row if isinstance(c, str))
        whole += len(re.findall(r"[\u4e00-\u9fff]", t))
    print(f"\n== {tag} {src.split('\\\\')[-1]} · sheets {len(wb.sheetnames)} · 内容章 {len(chs)} · 汉字 {whole:,}")
    print("  章名:", [c[:14] for c in chs[:6]])
    if chs:
        ws = wb[chs[0]]
        print("  列数", ws.max_column, "行数", ws.max_row)
        for row in ws.iter_rows(min_row=1, max_row=5, values_only=True):
            print("   ", [str(x)[:16] if x is not None else "" for x in row][:6])
