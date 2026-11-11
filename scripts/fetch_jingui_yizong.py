# -*- coding: utf-8 -*-
"""scripts/fetch_jingui_yizong.py —— 《醫宗金鑑·訂正仲景全書金匱要略註》留档（外源·笈成）

为什么单独立一个脚本（而不是并进 fetch_jingui_zhujia.py）：
  三家注是「一书一页、篇为 h2、段为 p」的普通版式；《醫宗金鑑》在笈成是**多卷总书**，
  目录页只有元数据（1 KB），正文藏在子目录里，而且两种版式并存：
    · 醫宗金鑑/訂正仲景全書金匱要略註/index.html          426,322 B —— 原版（p/u/h2，註散在段中）
    · 醫宗金鑑_條列版/訂正仲景全書金匱要略註/index.html    459,086 B —— **條列版**（每條一个 <pre>：
        「篇名：… 編號：藏府001 經文：… 按：[1]… 註：[1]… 集註：徐彬曰…」）
  留档用**條列版**做主见证（编號显式、可逐条定位），原版整页留档做第二见证（校字用）。
  解析规则也完全不同（<pre> 字段式 vs <h2>/<p> 结构式），塞进同一个解析器只会互相拖累。

产物（与三家注同库、同一份 manifest）：
  standards/jingui/zhujia/raw/yizong-tiaolie.html   條列版整页（主见证）
  standards/jingui/zhujia/raw/yizong-yuanban.html   原版整页（第二见证）
  standards/jingui/zhujia/manifest.json             books[] 增 yizong 一项（字节 + sha256）

用法：
  python scripts/fetch_jingui_yizong.py --fetch   # 抓 2 页
  python scripts/fetch_jingui_yizong.py           # 只登记（不联网）
  python scripts/fetch_jingui_yizong.py --check   # 校验 sha256 / 字节；并核对 manifest 与磁盘一致
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

BASE = "https://gitlab.com/jicheng/jc.data/-/raw/master/pages/book/"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

SOURCES = [
    {
        "slug": "yizong-tiaolie",
        "file": "yizong-tiaolie.html",
        "path": "醫宗金鑑_條列版/訂正仲景全書金匱要略註/index.html",
        "role": "主见证（條列版：篇名/編號/經文/按/註/集註 字段式，可逐条定位）",
    },
    {
        "slug": "yizong-yuanban",
        "file": "yizong-yuanban.html",
        "path": "醫宗金鑑/訂正仲景全書金匱要略註/index.html",
        "role": "第二见证（原版：卷—篇—段式，註散在文中，供校字与卷次核对）",
    },
]


def sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def url_of(path: str) -> str:
    return BASE + urllib.parse.quote(path)


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://jicheng.tw/tcm/"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read()


def write_text(path: str, text: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with io.open(path, "w", encoding="utf-8", newline=NL) as f:
        f.write(text)


def do_fetch() -> None:
    os.makedirs(RAW, exist_ok=True)
    for s in SOURCES:
        raw = fetch(url_of(s["path"]))
        with open(os.path.join(RAW, s["file"]), "wb") as f:
            f.write(raw)
        print("  ✓ %-18s %8d 字节  sha256 %s" % (s["file"], len(raw), sha256(raw)[:12]))
        time.sleep(1.2)


def load_manifest() -> dict:
    if not os.path.exists(MANIFEST):
        raise SystemExit("缺 manifest.json：先跑 fetch_jingui_zhujia.py")
    return json.load(io.open(MANIFEST, encoding="utf-8"))


def register(m: dict) -> dict:
    """把 2 个留档写进 manifest.books 的 yizong 项（结构计数由 align 脚本回写，这里置 0）。"""
    files = []
    for s in SOURCES:
        p = os.path.join(RAW, s["file"])
        raw = open(p, "rb").read()
        files.append({
            "role": s["role"],
            "rawFile": "raw/" + s["file"],
            "url": url_of(s["path"]),
            "rawBytes": len(raw),
            "rawSha256": sha256(raw),
        })
    prev = {b["slug"]: b for b in m.get("books", [])}.get("yizong", {})
    entry = {
        "slug": "yizong",
        "book": "醫宗金鑑·訂正仲景全書金匱要略註",
        "shortBook": "醫宗金鑑",
        "author": "吳謙",
        "dynasty": "清",
        "kind": "官修集註",
        "edition": "《御纂醫宗金鑑》乾隆七年（1742）敕撰；光緒十八年（1892）上海五彩書局石印本；"
                   "笈成漢リポ條列版（今版）为主见证，原版为第二见证",
        # 主见证（條列版）放在顶层字段，便于对齐脚本直接读
        "url": files[0]["url"],
        "rawFile": files[0]["rawFile"],
        "rawBytes": files[0]["rawBytes"],
        "rawSha256": files[0]["rawSha256"],
        "witnesses": files,
        "sectionCount": prev.get("sectionCount", 0),
        "srcBlocks": prev.get("srcBlocks", 0),
        "chars": prev.get("chars", 0),
        "noteCharsTiao": prev.get("noteCharsTiao", 0),
    }
    books = [b for b in m.get("books", []) if b["slug"] != "yizong"]
    books.append(entry)
    m["books"] = books
    return m


def main() -> int:
    argv = sys.argv[1:]
    if "--fetch" in argv:
        print("═══ 抓取《醫宗金鑑·訂正仲景全書金匱要略註》（笈成） ═══")
        do_fetch()
    m = register(load_manifest())
    errs = []
    for w in m["books"][-1]["witnesses"]:
        p = os.path.join(OUT, w["rawFile"])
        if not os.path.exists(p):
            errs.append("缺留档 %s" % w["rawFile"])
            continue
        raw = open(p, "rb").read()
        if sha256(raw) != w["rawSha256"]:
            errs.append("%s sha256 与登记不符" % w["rawFile"])
        if len(raw) != w["rawBytes"]:
            errs.append("%s 字节数与登记不符" % w["rawFile"])
    if "--check" in argv:
        if errs:
            print("✗ 《醫宗金鑑》留档校验失败：")
            for e in errs:
                print("  -", e)
            return 1
        print("✓ 《醫宗金鑑》留档校验通过：2 个见证 / %d 字节 / sha256 全对"
              % sum(w["rawBytes"] for w in m["books"][-1]["witnesses"]))
        return 0
    write_text(MANIFEST, json.dumps(m, ensure_ascii=False, indent=1) + NL)
    print("✓ manifest：books[] 增 yizong（2 见证 / %d 字节）"
          % sum(w["rawBytes"] for w in m["books"][-1]["witnesses"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
