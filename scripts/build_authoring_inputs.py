#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""生成「条文 → 宫殿桩位」的写作任务输入包（供分篇撰写记忆图像与病生注释）

输出 standards/materials/shanghan-quannao/authoring/in-NN.json
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAT = os.path.join(ROOT, "standards", "materials", "shanghan-quannao")
OUTD = os.path.join(MAT, "authoring")

CHUNKS = [
    ("01-taiyang-shang", 1, 30),
    ("02-taiyang-zhong-a", 31, 79),
    ("03-taiyang-zhong-b", 80, 127),
    ("04-taiyang-xia", 128, 178),
    ("05-yangming", 179, 262),
    ("06-shaoyang-taiyin", 263, 280),
    ("07-shaoyin", 281, 325),
    ("08-jueyin", 326, 381),
    ("09-huoluan-chahou", 382, 398),
]


def main():
    os.makedirs(OUTD, exist_ok=True)
    tiao = {t["no"]: t for t in json.load(open(os.path.join(ROOT, "standards", "shanghan", "tiao-398.json"),
                                               encoding="utf-8"))["tiao"]}
    route = json.load(open(os.path.join(MAT, "palace-route.json"), encoding="utf-8"))
    zi = {int(k): v for k, v in route["assign"].items()}
    for name, lo, hi in CHUNKS:
        rows = []
        for n in range(lo, hi + 1):
            t, z = tiao[n], zi[n]
            rows.append({"no": n, "liu": t["liuKey"], "pian": t["pian"],
                         "text": t["text"], "fang": t["fang"],
                         "gong": z["gong"], "gongName": z["gongName"],
                         "xue": z["xue"], "jing": z["jing"], "zhuang": z["zhuang"]})
        doc = {"chunk": name, "from": lo, "to": hi, "n": len(rows),
               "schema": {"no": "条号(int)", "baihua": "白话直译≤40字",
                          "image": "记忆图像≤40字：把条文关键信息钉到本宫桩位上的具体画面，须荒诞/可成像/含文字锚",
                          "pathophys": "病理生理注释≤70字：机制链(刺激→效应)+可量化指标或鉴别锚",
                          "hook": "认知钩≤24字：为什么这样记不会串条",
                          "tag": "病机关键词≤12字"},
               "rows": rows}
        p = os.path.join(OUTD, f"in-{name}.json")
        json.dump(doc, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(p, len(rows))


if __name__ == "__main__":
    main()
