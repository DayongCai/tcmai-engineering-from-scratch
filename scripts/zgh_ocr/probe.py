# -*- coding: utf-8 -*-
"""scripts/zgh_ocr/probe.py —— 定位《中医证候学》火门(L18-L23)与虚门(L42-L45)的起止页

为什么先探针不直接跑全量：
  三册是同一部书的连续扫描，书签在印张 551 之后全部失效（page=-1），
  所以「第七章 火证门在哪一页」这个问题没有目录可查。全量 OCR 一遍 2,400 页再找边界
  是浪费；先按候选点抽 12 页，用候码（L18…L45）当路标二分，几十秒就能定位。

用法：python scripts/zgh_ocr/probe.py 725 760 800 ...
"""
import json
import os
import re
import sys

import pymupdf
from rapidocr_onnxruntime import RapidOCR

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "probe")
os.makedirs(OUT, exist_ok=True)

# det_limit_side_len 默认 736 会把两行并成一个框、只认第一行（见 skill 第 2 节）。
# 这里固定 2000，宁可慢一点，也不接受「静默丢行」。
ocr = RapidOCR(det_limit_side_len=2000, det_limit_type="min")

VOLS = [
    ("shang", r"C:\Users\user\Desktop\中医证候学\1-中医证候学上.pdf", 0),
    ("zhong", r"C:\Users\user\Desktop\中医证候学\2-中医证候学中.pdf", 681),
    ("xia", r"C:\Users\user\Desktop\中医证候学\3-中医证候学下.pdf", 1534),
]
DOCS = {k: pymupdf.open(p) for k, p, _ in VOLS}
OFF = {k: o for k, _, o in VOLS}

CODE_RE = re.compile(r"L(\d{2})")
MEN_RE = re.compile(r"第[一二三四五六七八九十]+章")


def page_text(vol, pno):
    pg = DOCS[vol][pno - 1]
    pix = pg.get_pixmap(dpi=200, colorspace=pymupdf.csGRAY)
    img = os.path.join(OUT, "%s-%04d.png" % (vol, pno))
    pix.save(img)
    res, _ = ocr(img)
    items = [(r[1], float(r[2])) for r in (res or [])]
    txt = "\n".join(t for t, _ in items)
    printed = pno + OFF[vol]
    json.dump({"vol": vol, "page": pno, "printed": printed, "items": items},
              open(os.path.join(OUT, "%s-%04d.json" % (vol, pno)), "w", encoding="utf-8"),
              ensure_ascii=False)
    return txt


def main():
    for spec in sys.argv[1:]:
        if ":" not in spec:
            continue
        vol, p = spec.split(":")
        p = int(p)
        txt = page_text(vol, p)
        codes = sorted({int(c) for c in CODE_RE.findall(txt)})
        men = MEN_RE.findall(txt)
        head = " / ".join(t for t in txt.split("\n")[:3])
        print("[%s p%d → 印张 %d] 章:%s 候码档:%s | 首行: %s"
              % (vol, p, p + OFF[vol], "、".join(men[:2]) or "-",
                 ",".join(map(str, codes[:12])) or "-", head[:60]))


if __name__ == "__main__":
    main()
