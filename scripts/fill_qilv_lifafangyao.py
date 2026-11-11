#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""给桌面「伤寒理解-病理生理.xlsx / 01七言」逐条填 理／法／方／药 四栏（病理生理注释）。

数据：standards/materials/shanghan-qilv/rows-*.json（按行号：2-41、42-81、83-122）
做法：① 先备份原文件到同目录 .bak-时间戳；② 只写 F/G/H/I，不动 C/D 与表头；
      ③ 按列宽估算行高（原表行高被固定为 15，不重算会把字裁掉）。
"""
import json
import math
import os
import shutil
from datetime import datetime

import openpyxl
from openpyxl.styles import Alignment, Font

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "standards", "materials", "shanghan-qilv")
XLSX = os.path.join(os.path.expanduser("~"), "Desktop", "伤寒理解-病理生理.xlsx")

COLS = {"理": 6, "法": 7, "方": 8, "药": 9}
WIDTH = {"理": 44, "法": 30, "方": 24, "药": 62}


def load_rows():
    rows = {}
    for fn in sorted(os.listdir(DATA)):
        if not fn.endswith(".json"):
            continue
        rows.update(json.load(open(os.path.join(DATA, fn), encoding="utf-8"))["rows"])
    return rows


def lines_of(text, width):
    """按列宽（Excel 字符宽）估算中文折行数：1 个汉字 ≈ 2 个宽度单位。"""
    if not text:
        return 1
    per = max(6, int(width / 2.05))
    n = 0
    for seg in str(text).split("\n"):
        n += max(1, math.ceil(len(seg) / per))
    return n


def main():
    rows = load_rows()
    if not os.path.exists(XLSX):
        raise SystemExit(f"找不到 {XLSX}")
    bak = XLSX.replace(".xlsx", f".bak-{datetime.now():%Y%m%d-%H%M}.xlsx")
    shutil.copy2(XLSX, bak)
    print("备份:", bak)

    wb = openpyxl.load_workbook(XLSX)
    ws = wb["01七言"]
    for k, w in WIDTH.items():
        ws.column_dimensions[openpyxl.utils.get_column_letter(COLS[k])].width = w

    font = Font(name="等线", size=10)
    align = Alignment(horizontal="left", vertical="top", wrap_text=True)

    done, skipped = 0, []
    for r in range(2, ws.max_row + 1):
        key = str(r)
        code = ws.cell(r, 3).value
        poem = ws.cell(r, 4).value
        if not key in rows:
            skipped.append((r, code, (poem or "")[:16]))
            continue
        item = rows[key]
        for lab, col in COLS.items():
            c = ws.cell(r, col)
            c.value = item.get(lab, "")
            c.font = font
            c.alignment = align
        need = max(lines_of(item.get(k, ""), WIDTH[k]) for k in COLS)
        ws.row_dimensions[r].height = max(15.0, need * 13.2 + 3)

    wb.save(XLSX)
    print(f"填好 {len(rows)} 行 · 跳过 {len(skipped)} 行（表头/无数据）")
    for s in skipped:
        print("   跳过", s)
    print("saved", XLSX)


if __name__ == "__main__":
    main()
