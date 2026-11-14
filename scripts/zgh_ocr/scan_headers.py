import sys
# -*- coding: utf-8 -*-
"""scripts/zgh_ocr/scan_headers.py —— 只 OCR 页眉/页脚，快速量出每页属于哪一章

为什么另写一个：整页 OCR 17.6 s/页，全书 2408 页要 12 小时；但定位章节边界只要知道
「这一页的页眉写第几章」。页眉只占页面顶部 7%，裁下来识别约 1.3 s/页（det 限长用 max
模式，别用 min —— 用 min 会把 160px 高的长条放大到 2000px 高，一页 19 s）。

用法：
  python scan_headers.py --vol shang --from 1 --to 3000 --step 6
产出：scripts/zgh_ocr/headers-<vol>.json  {"<vol>": {"页号": {"head": "...", "foot": "..."}}}
"""
import argparse
import json
import os

import fitz
from rapidocr_onnxruntime import RapidOCR

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from _paths import DATA  # noqa: E402  数据目录（scratch，不进 git）
OUT = os.path.join(DATA, "headers-%s.json")
PDFS = {
    "shang": r"C:\Users\user\Desktop\中医证候学\1-中医证候学上.pdf",
    "zhong": r"C:\Users\user\Desktop\中医证候学\2-中医证候学中.pdf",
    "xia": r"C:\Users\user\Desktop\中医证候学\3-中医证候学下.pdf",
}
_E = None


def engine():
    global _E
    if _E is None:
        _E = RapidOCR(det_limit_side_len=1400, det_limit_type="max", use_cls=False,
                      intra_op_num_threads=2, inter_op_num_threads=1)
    return _E


def read_band(doc, pno, top=True):
    """取页眉（顶部 7%）或页脚（底部 5%）的 PNG。带宽越窄越快，也不会把正文吸进来。"""
    pg = doc[pno]
    h = pg.rect.height
    clip = fitz.Rect(0, 0, pg.rect.width, h * 0.07) if top else \
        fitz.Rect(0, h * 0.95, pg.rect.width, h)
    return pg.get_pixmap(matrix=fitz.Matrix(200 / 72, 200 / 72), clip=clip,
                         colorspace=fitz.csGRAY).tobytes("png")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vol", required=True, choices=list(PDFS))
    ap.add_argument("--from", dest="a", type=int, required=True)
    ap.add_argument("--to", dest="b", type=int, required=True)
    ap.add_argument("--step", type=int, default=1)
    args = ap.parse_args()

    path = OUT % args.vol
    doc = fitz.open(PDFS[args.vol])
    data = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
    vol = data.setdefault(args.vol, {})
    todo = [p for p in range(args.a, min(args.b, doc.page_count - 1) + 1, args.step)
            if str(p) not in vol]
    print("%s %d–%d step %d：待扫 %d 页（已缓存 %d）" % (args.vol, args.a, args.b, args.step,
                                                    len(todo), len(vol)), flush=True)
    for n, p in enumerate(todo, 1):
        head, foot = "", ""
        try:
            r, _ = engine()(read_band(doc, p, True))
            head = " ".join(x[1] for x in (r or []))
            r2, _ = engine()(read_band(doc, p, False))
            foot = " ".join(x[1] for x in (r2 or []))
        except Exception as e:  # noqa: BLE001 —— 单页失败不拖垮整轮
            head = "ERR " + str(e)[:40]
        vol[str(p)] = {"head": head.strip(), "foot": foot.strip()}
        if n % 10 == 0 or n == len(todo):
            print("  %d/%d  p%d  %s" % (n, len(todo), p, head[:34]), flush=True)
            json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("完成：", path, flush=True)


if __name__ == "__main__":
    main()
