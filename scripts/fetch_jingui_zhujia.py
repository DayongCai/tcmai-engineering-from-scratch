# -*- coding: utf-8 -*-
"""scripts/fetch_jingui_zhujia.py —— 《金匮要略》三家注 留档（外源·笈成）

分工（两个脚本，一件事只做一遍）：
  · 本脚本：**只做留档**——按字节存 raw/、登记文件大小与 sha256、记录书目元数据。
    不做结构解析、不数篇块字（那是 build_jingui_zhujia_align.py 的事）。
    早先版本在这里顺手解析一次，结果 --check 每次都把 align 写好的结构计数覆盖成 0，
    于是 align --check 必红——两个生成器写同一份 manifest 的同一个字段，就是这个下场。
  · build_jingui_zhujia_align.py：结构化（篇→块）+ 逐条对齐 + 校勘登记，并**回写**结构计数。

三家注（笈成漢リポ 文字化本，取 raw 以便按字节复算）：
  · 金匱要略心典        尤怡（清·雍正十年）     —— 义理，逐条串讲
  · 金匱要略淺註        陳念祖（清·嘉慶）       —— 训释，夹注在句
  · 金匱玉函要略輯義    丹波元簡（日本·寬政）   —— 考据，校异文

产物：standards/jingui/zhujia/raw/<slug>.html + manifest.json

用法：
  python scripts/fetch_jingui_zhujia.py --fetch   # 联网抓 3 页（1.5 s/页）
  python scripts/fetch_jingui_zhujia.py           # 只重建 manifest（不联网）
  python scripts/fetch_jingui_zhujia.py --check   # 校验：raw 齐全 + sha256 + 字节数
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import sys
import time
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "jingui", "zhujia")
RAW = os.path.join(OUT, "raw")
MANIFEST = os.path.join(OUT, "manifest.json")
NL = chr(10)

BOOK_LIST = [
    dict(slug="xindian", book="金匱要略心典", author="尤怡", dynasty="清",
         edition="雍正十年（1729）初刻一系；笈成漢リポ文字化本（早稲田大学図書館掃描本为底）", kind="义理"),
    dict(slug="qianzhu", book="金匱要略淺註", author="陳念祖", dynasty="清",
         edition="嘉慶一系；笈成漢リポ文字化本", kind="训释"),
    dict(slug="jiyi", book="金匱玉函要略輯義", author="丹波元簡", dynasty="日本·江戶",
         edition="寬政一系；笈成漢リポ文字化本", kind="考据"),
]
BASE = "https://gitlab.com/jicheng/jc.data/-/raw/master/pages/book/"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"


def sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://jicheng.tw/tcm/"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read()


def write_text(path: str, text: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with io.open(path, "w", encoding="utf-8", newline=NL) as f:
        f.write(text)


def do_fetch():
    os.makedirs(RAW, exist_ok=True)
    for b in BOOK_LIST:
        url = BASE + urllib.parse.quote(b["book"]) + "/index.html"
        raw = fetch(url)
        with open(os.path.join(RAW, b["slug"] + ".html"), "wb") as f:
            f.write(raw)
        print("  ✓ %-16s %8d 字节  sha256 %s" % (b["book"], len(raw), sha256(raw)[:12]))
        time.sleep(1.5)


def build() -> dict:
    """只写留档元数据；结构计数（sectionCount/srcBlocks/chars）由 align 脚本回写，这里原样保留。"""
    old = {}
    if os.path.exists(MANIFEST):
        prev = json.load(io.open(MANIFEST, encoding="utf-8"))
        old = {b["slug"]: b for b in prev.get("books", [])}
        old_counts = prev.get("counts", {})
    else:
        old_counts = {}
    books = []
    for b in BOOK_LIST:
        p = os.path.join(RAW, b["slug"] + ".html")
        raw = open(p, "rb").read()
        prev = old.get(b["slug"], {})
        books.append({
            "slug": b["slug"],
            "book": b["book"],
            "author": b["author"],
            "dynasty": b["dynasty"],
            "kind": b["kind"],
            "edition": b["edition"],
            "url": BASE + urllib.parse.quote(b["book"]) + "/index.html",
            "rawFile": "raw/%s.html" % b["slug"],
            "rawBytes": len(raw),
            "rawSha256": sha256(raw),
            # 结构计数：只有 align 脚本能算，这里沿用上次的结果
            "sectionCount": prev.get("sectionCount", 0),
            "srcBlocks": prev.get("srcBlocks", 0),
            "chars": prev.get("chars", 0),
        })
    return {
        "source": {
            "provider": "jicheng",
            "providerTitle": "中醫笈成（漢リポ 文字化本）",
            "rawBase": BASE,
            "fetchedAt": time.strftime("%Y-%m-%d"),
            "role": "注家层（逐条注文的唯一来源）；不替代底本，不并入 402 条统计",
            "citeFormat": "外源·笈成·<书名> <卷/篇>（注家原文逐字）",
        },
        "books": books,
        "counts": old_counts or {"books": len(books)},
    }


def main() -> int:
    argv = sys.argv[1:]
    if "--fetch" in argv:
        print("═══ 抓取《金匮》三家注（笈成） ═══")
        do_fetch()
    m = build()
    check = "--check" in argv
    errs = []
    for b in m["books"]:
        p = os.path.join(OUT, b["rawFile"])
        if not os.path.exists(p):
            errs.append("缺留档 %s" % b["rawFile"])
            continue
        raw = open(p, "rb").read()
        if sha256(raw) != b["rawSha256"]:
            errs.append("%s sha256 与登记不符（留档被改或站点改版）" % b["book"])
        if len(raw) != b["rawBytes"]:
            errs.append("%s 字节数与登记不符" % b["book"])
    if check:
        if errs:
            print("✗ 三家注留档校验失败：")
            for e in errs:
                print("  -", e)
            return 1
        print("✓ 三家注留档校验通过：%d 书 / %d 字节 / sha256 全对（结构计数由 align 脚本负责，本脚本不写）"
              % (len(m["books"]), sum(b["rawBytes"] for b in m["books"])))
        return 0
    write_text(MANIFEST, json.dumps(m, ensure_ascii=False, indent=1) + NL)
    print("✓ manifest：%d 书 / %d 字节 → standards/jingui/zhujia/manifest.json"
          % (len(m["books"]), sum(b["rawBytes"] for b in m["books"])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
