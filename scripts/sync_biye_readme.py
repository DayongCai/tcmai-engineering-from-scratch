#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/sync_biye_readme.py —— 把 checklists/<dept>.json 的七项状态同步进各系毕设课 README

为什么需要：
  `build_biye_checklist.py` 只写 `standards/biye/checklists/*.json` 与 `通用检查表.md`，
  八份 README 里的「七项」表格是另一份拷贝——两处不同步就会一边写「齐备」、一边写「待补」。

用法：
  python scripts/sync_biye_readme.py          # 就地更新 8 份 README 的七项表格
  python scripts/sync_biye_readme.py --check  # 只对账，不一致即 exit 1
"""
import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STD = os.path.join(ROOT, "standards", "biye")
NAMES = {
    "1": "四分类", "2": "客户数", "3": "客单", "4": "敏感性",
    "5": "欠账", "6": "工时台账", "7": "复算入口",
}


def targets():
    out = []
    cdir = os.path.join(STD, "checklists")
    if not os.path.isdir(cdir):
        return out
    for fn in sorted(os.listdir(cdir)):
        if not fn.endswith(".json"):
            continue
        ck = json.load(open(os.path.join(cdir, fn), encoding="utf-8"))
        dept, course = (fn[:-5].split("__", 1) if "__" in fn[:-5] else (ck["dept"], ck["subject"]))
        rd = os.path.join(ROOT, "departments", dept, course, "README.md")
        if os.path.exists(rd):
            out.append((dept, ck, rd))
    return out


ROW = re.compile(r"^\|\s*([1-7])\s*\|\s*([^|]+?)\s*\|\s*(齐备|部分|待补|不适用)\s*\|\s*(.*?)\s*\|\s*$")


def main():
    check = "--check" in sys.argv
    drift, fixed = [], 0
    for dept, ck, path in targets():
        lines = io.open(path, encoding="utf-8").read().split("\n")
        changed = False
        for i, ln in enumerate(lines):
            m = ROW.match(ln)
            if not m:
                continue
            idx = m.group(1)
            item = ck["七项"].get(idx)
            if not item:
                continue
            want = f"| {idx} | {m.group(2).strip()} | {item['status']} | {item['说明']} |"
            if ln.strip() != want:
                drift.append(f"{dept} 第 {idx} 项：README=「{m.group(3)}」 checklist=「{item['status']}」")
                lines[i] = want
                changed = True
        if changed:
            fixed += 1
            if not check:
                io.open(path, "w", encoding="utf-8").write("\n".join(lines))
    if check:
        if drift:
            print("\n".join(drift))
            print(f"✗ {len(drift)} 处 README 与 checklist 不一致")
            sys.exit(1)
        print("✓ 8 份 README 七项表格与 checklist 一致")
    else:
        print(f"✓ 已同步 {fixed} 份 README（{len(drift)} 处改动）")


if __name__ == "__main__":
    main()
