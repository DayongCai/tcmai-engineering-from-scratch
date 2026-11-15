#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_kouqiang_sources.py —— 口腔修复学 / 口腔正畸学 外源补源登记 + 逐字校勘

用法：
  python scripts/build_kouqiang_sources.py kouqiang-xiufu
  python scripts/build_kouqiang_sources.py kouqiang-zhengji
  python scripts/build_kouqiang_sources.py --all --check

按 补源约定.md 做三件事：
  1. 对 standards/<sub>/sources/*.pdf 现算 sha256、bytes、页数、文本层字符数（五项指纹，不手抄）；
  2. 把 外源条文.json 每条「原文」按 " ... " 切段，逐段回查 PDF 文本层（四项归一后必须完整命中）；
  3. 写 补源登记.json（产物，不许手改；改了就重跑）。

本课没有教材底本：`底本统计只算底本`，外源条文单独计数，不并入汉字数（约定第七节）。
"""
import hashlib
import io
import json
import os
import re
import sys

import pdfplumber

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUBS = ["kouqiang-xiufu", "kouqiang-zhengji"]

LIGATURES = {"\ufb01": "fi", "\ufb02": "fl", "\ufb00": "ff", "\ufb03": "ffi", "\ufb04": "ffl"}
# 页眉页脚：标准号行、孤立页码、发布单位行
PAGE_JUNK = re.compile(r"\s*T/CHSA\s*\d{3}\s*[—-]\s*\d{4}\s*|^\s*\d{1,3}\s*$", re.M)


def norm(s):
    for k, v in LIGATURES.items():
        s = s.replace(k, v)
    s = s.replace("\u00ad", "")
    s = PAGE_JUNK.sub("", s)
    s = re.sub(r"-\s*\n\s*", "", s)
    return re.sub(r"\s+", "", s)


def build(sub, check=False):
    d = os.path.join(ROOT, "standards", sub)
    src = os.path.join(d, "sources")
    clauses_doc = json.load(io.open(os.path.join(d, "外源条文.json"), encoding="utf-8"))

    reg = {"note": f"{sub} 外源补源登记：每条记来源、URL、五项指纹与逐字校勘结论。查不到的句子不入库（补源约定.md）。",
           "convention": "补源约定.md", "sources": {}, "clauses": []}

    texts = {}
    for key, meta in clauses_doc["sources"].items():
        p = os.path.join(src, meta["file"])
        if not os.path.exists(p):
            reg["sources"][key] = {**meta, "exists": False}
            print(f"  ✗ {key}: 缺 {meta['file']}")
            continue
        sha = hashlib.sha256(open(p, "rb").read()).hexdigest()
        with pdfplumber.open(p) as pdf:
            pages = len(pdf.pages)
            txt = "\n".join((pg.extract_text() or "") for pg in pdf.pages)
        texts[key] = txt
        reg["sources"][key] = {**meta, "exists": True, "sha256": sha,
                               "bytes": os.path.getsize(p), "pages": pages,
                               "textChars": len(txt), "textLayer": len(txt) > 2000}

    ok = 0
    for c in clauses_doc["clauses"]:
        txt = texts.get(c["source"], "")
        parts = [x for x in c["原文"].split(" ... ") if x.strip()]
        miss = [x for x in parts if norm(x) not in norm(txt)]
        verified = not miss and bool(txt)
        ok += verified
        reg["clauses"].append({
            "id": c["id"], "source": c["source"], "clause": c["clause"],
            "sourceTitle": clauses_doc["sources"].get(c["source"], {}).get("title", ""),
            "url": clauses_doc["sources"].get(c["source"], {}).get("url", ""),
            "verified": verified, "missing": [x[:60] for x in miss],
            "locator": f"外源·{clauses_doc['sources'].get(c['source'], {}).get('title', c['source'])} {c['clause']}",
        })
    reg["counts"] = {"sources": len(reg["sources"]), "clauses": len(reg["clauses"]),
                     "verified": ok, "unverified": len(reg["clauses"]) - ok}

    text = json.dumps(reg, ensure_ascii=False, indent=1)
    out = os.path.join(d, "补源登记.json")
    if check:
        old = io.open(out, encoding="utf-8").read() if os.path.exists(out) else ""
        if old != text:
            print(f"✗ {sub}: 补源登记.json 与重算不一致（请重跑不带 --check）")
            return 1
        print(f"  ✓ {sub}: 补源登记一致 · 条文 {reg['counts']['clauses']} · 逐字可查 {ok}")
        return 0

    io.open(out, "w", encoding="utf-8", newline="\n").write(text)
    print(f"✓ {sub}: 来源 {reg['counts']['sources']} · 条文 {reg['counts']['clauses']} · 逐字可查 {ok}")
    for s, m in reg["sources"].items():
        print(f"   {s:3} {m.get('pages', '—'):>2} 页 · {m.get('textChars', 0):>6} 字符 · "
              f"{(m.get('sha256') or '')[:16]}… · 文本层 {m.get('textLayer')}")
    for c in reg["clauses"]:
        if not c["verified"]:
            print("   ✗ 未通过", c["id"], c["missing"])
    return 0 if ok == reg["counts"]["clauses"] else 1


def main():
    argv = sys.argv[1:]
    check = "--check" in argv
    subs = [a for a in argv if not a.startswith("--")]
    if not subs or "--all" in argv:
        subs = SUBS
    bad = 0
    for sub in subs:
        bad += build(sub, check)
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
