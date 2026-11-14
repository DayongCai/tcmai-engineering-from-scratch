# -*- coding: utf-8 -*-
"""scripts/zgh_ocr/run_ocr.py —— 把指定页段渲染成灰度图并逐页 OCR（可断点续跑）

为什么这么写（都是踩过的坑）：
  · det_limit_side_len 必须是 2000：默认 736 会把相邻两行并成一个框，只认第一行，
    第二行**在 0.99 置信度下静默消失**（见 scanned-book-reconstruction skill 第 2 节）。
  · 200 dpi 灰度：本机 8 核，200 dpi 约 2150 px 宽，配 det_limit 2000 基本不缩样；
    250 dpi 更清楚但慢 1.5 倍，这一批书是大字排版，200 dpi 够。
  · 一页一个 JSON、存在即跳过：OCR 跑 50 分钟，中途断必须能续。
  · 多进程而不是多线程：onnxruntime 的 session 不是线程安全的。

用法：
  python scripts/zgh_ocr/run_ocr.py --vol zhong --from 205 --to 599 --workers 4
  python scripts/zgh_ocr/run_ocr.py --vol xia   --from 392 --to 760 --workers 4
"""
import argparse
import json
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed

os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("ORT_NUM_THREADS", "1")

import pymupdf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from _paths import DATA  # noqa: E402  数据目录（scratch，不进 git）
PAGES = os.path.join(DATA, "pages")
OCR = os.path.join(DATA, "ocr")
os.makedirs(PAGES, exist_ok=True)
os.makedirs(OCR, exist_ok=True)

VOLS = {
    "shang": (r"C:\Users\user\Desktop\中医证候学\1-中医证候学上.pdf", 55),
    "zhong": (r"C:\Users\user\Desktop\中医证候学\2-中医证候学中.pdf", 681),
    "xia": (r"C:\Users\user\Desktop\中医证候学\3-中医证候学下.pdf", 1534),
}

_ENGINE = None


def _engine():
    global _ENGINE
    if _ENGINE is None:
        from rapidocr_onnxruntime import RapidOCR
        # intra_op=2：实测 1 线程 27.3s/页、2 线程 19.6s、默认（全核）18.5s —— 边际收益在 2 就没了。
        # 4 进程 × 2 线程 = 8 核跑满，约 12 页/分；用默认会把 8 核全吃在一个进程里，多进程毫无收益（实测过）。
        _ENGINE = RapidOCR(det_limit_side_len=2000, det_limit_type="min",
                           intra_op_num_threads=1, inter_op_num_threads=1, use_cls=False)
    return _ENGINE


def one(job):
    vol, pno = job
    out = os.path.join(OCR, "%s-%04d.json" % (vol, pno))
    if os.path.exists(out) and os.path.getsize(out) > 200:
        return (vol, pno, "skip", 0)
    path, off = VOLS[vol]
    t0 = time.time()
    img = os.path.join(PAGES, "%s-%04d.png" % (vol, pno))
    try:
        if not os.path.exists(img):
            doc = pymupdf.open(path)
            doc[pno - 1].get_pixmap(dpi=200, colorspace=pymupdf.csGRAY).save(img)
            doc.close()
        res, _ = _engine()(img)
    except Exception as e:                      # 单页失败不许拖垮整个池（第一版就这么崩过）
        err = {"vol": vol, "page": pno, "error": "%s: %s" % (type(e).__name__, e)}
        with open(os.path.join(OCR, "%s-%04d.ERR.json" % (vol, pno)), "w", encoding="utf-8") as f:
            json.dump(err, f, ensure_ascii=False)
        return (vol, pno, "ERR", 0)
    items = []
    for box, text, score in (res or []):
        xs = [float(p[0]) for p in box]
        ys = [float(p[1]) for p in box]
        items.append({"text": text, "score": round(float(score), 4),
                      "x0": round(min(xs), 1), "y0": round(min(ys), 1),
                      "x1": round(max(xs), 1), "y1": round(max(ys), 1)})
    payload = {"vol": vol, "page": pno, "printed": pno + off,
               "items": items, "sec": round(time.time() - t0, 1)}
    tmp = out + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    os.replace(tmp, out)
    return (vol, pno, "ok", len(items))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vol", required=True, choices=list(VOLS))
    ap.add_argument("--from", dest="a", type=int, required=True)
    ap.add_argument("--to", dest="b", type=int, required=True)
    ap.add_argument("--workers", type=int, default=4)
    ns = ap.parse_args()

    jobs = [(ns.vol, p) for p in range(ns.a, ns.b + 1)]
    todo = [j for j in jobs if not (os.path.exists(os.path.join(OCR, "%s-%04d.json" % j))
                                   and os.path.getsize(os.path.join(OCR, "%s-%04d.json" % j)) > 200)]
    print("[%s] 页段 %d–%d 共 %d 页，待跑 %d 页，%d 进程"
          % (ns.vol, ns.a, ns.b, len(jobs), len(todo), ns.workers), flush=True)
    if not todo:
        print("全部已存在，跳过。", flush=True)
        return 0

    t0 = time.time()
    done = 0
    boxes = 0
    with ProcessPoolExecutor(max_workers=ns.workers, max_tasks_per_child=None) as ex:
        futs = {ex.submit(one, j): j for j in todo}
        for f in as_completed(futs):
            vol, pno, status, n = f.result()
            done += 1
            boxes += n
            if done % 2 == 0 or done == len(todo):
                el = time.time() - t0
                eta = el / done * (len(todo) - done)
                print("  %d/%d  %s p%d %s(%d 框)  %.1f 页/分  预计还需 %.0f 分"
                      % (done, len(todo), vol, pno, status, n, done / el * 60, eta / 60), flush=True)
    print("完成：%d 页 · %d 个文本框 · 用时 %.1f 分" % (done, boxes, (time.time() - t0) / 60), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
