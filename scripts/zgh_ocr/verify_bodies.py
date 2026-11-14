# -*- coding: utf-8 -*-
"""scripts/zgh_ocr/verify_bodies.py —— 核对「正文层」是否真进了辞典正文（全十二门）

三问：
  1. 每门：正文层条数 / 应有条数；
  2. 正文层里的每个候码，能不能在本门章节 md 里找到（找不到 = 只写进 JSON、没进书）；
  3. 每条是否带印张页码（出处）、是否至少 3 个原书字段。
"""
import glob
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TB = os.path.join(ROOT, "textbooks", "01-zhongyi", "14-zhongyi-zhenghou-xue")
STD = os.path.join(ROOT, "standards", "zhenghou-cidian")


def chapter_of(men):
    """M01→第1章、M12→第12章：先按 M 码找文件，找不到再按序号的两种写法兜底。"""
    n = int(men[1:])
    hits = [p for p in glob.glob(os.path.join(TB, "%02d-*.md" % n))]
    return hits[0] if hits else None


def main():
    ok = True
    tot_got = tot_exp = tot_chars = 0
    for f in sorted(glob.glob(os.path.join(STD, "正文-M*.json"))):
        men = os.path.basename(f)[3:6]
        d = json.load(open(f, encoding="utf-8"))
        md_path = chapter_of(men)
        md = open(md_path, encoding="utf-8").read() if md_path else ""
        items = d["items"]
        c = d["counts"]
        not_in_md = [k for k in items if k not in md]
        no_page = [k for k, v in items.items() if not v.get("page")]
        thin = [k for k, v in items.items() if len(v.get("fields") or {}) < 3]
        tot_got += len(items)
        tot_exp += c["expected"]
        tot_chars += c["chars"]
        print("%s %-8s %3d/%3d · 进正文 %3d · 缺少印张 %d · 字段<3 %d · %6.1f 万字 · 印张 %s–%s"
              % (men, (d.get("book") or "")[:8], len(items), c["expected"],
                 len(items) - len(not_in_md), len(no_page), len(thin),
                 c["chars"] / 10000, c["pageFrom"], c["pageTo"]))
        if not_in_md or no_page:
            print("    没进正文/缺印张：", (not_in_md or no_page)[:6])
            ok = False
    print("合计 %d/%d（%.1f%%）· %.1f 万字" % (tot_got, tot_exp, 100.0 * tot_got / max(1, tot_exp), tot_chars / 10000))
    print("VERIFY", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
