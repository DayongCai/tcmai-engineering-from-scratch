#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_zhenghou_units.py —— 中医证候学：病证概论 → 单元层（units.json）

## 换了母本

第一版从《中医诊断学》辨证篇切（87 单元 / 8,292 字），那是「另一本书的经典层」。
本课程的母本其实是《中医证候学》**第一章 病证概论**（上卷印张 113–139，10 节 / 27,241 字），
它自己就把全部内容分成三段：基本理论（节 1–7）、基本方法（节 8–9）、基本技能（节 10）。
所以单元层直接从概论切，`locator` 用「概论·第九节·二·（十二）」这种印在书上的层级，
不再借道别的教材。辨证篇那一版存档为 `units-辨证篇.json`，只作对照，不进本门。

## 切法

- 一级：节（10 个，每节必成单元）
- 二级：一、/二、/三、（第八节 3 个、第九节 2 个）
- 三级：（一）…（十五）（第八节 4+3+2，第九节 15+12）
正文一字不改，取 `正文-概论.json` 的 text；字数按汉字计，父子不重复计。

用法：
    python scripts/build_zhenghou_units.py            # 写 units.json
    python scripts/build_zhenghou_units.py --check    # 只比对
"""
import argparse
import hashlib
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "zhenghou")
SRC = os.path.join(ROOT, "standards", "zhenghou-cidian", "正文-概论.json")
OUT = os.path.join(D, "units.json")
HANZI = re.compile(r"[\u4e00-\u9fff]")
PART = {"1": "基本理论", "2": "基本理论", "3": "基本理论", "4": "基本理论", "5": "基本理论",
        "6": "基本理论", "7": "基本理论", "8": "基本方法", "9": "基本方法", "10": "基本技能"}


def units_of(sec, part):
    out = []
    loc = "概论·第%s节" % "一二三四五六七八九十"[sec["no"] - 1]
    out.append({
        "part": part, "sec": sec["no"], "secTitle": sec["title"],
        "level": 1, "sub": "", "title": sec["title"], "locator": loc,
        "printed": sec["printed"], "body": sec["text"], "hanzi": len(HANZI.findall(sec["text"])),
    })
    for sub in sec["subs"]:
        sloc = "%s·%s" % (loc, sub["n"])
        out.append({
            "part": part, "sec": sec["no"], "secTitle": sec["title"],
            "level": 2, "sub": sub["n"], "title": sub["title"], "locator": sloc,
            "printed": sec["printed"], "body": sub["text"], "hanzi": len(HANZI.findall(sub["text"])),
        })
        for it in sub["items"]:
            out.append({
                "part": part, "sec": sec["no"], "secTitle": sec["title"],
                "level": 3, "sub": "%s·（%s）" % (sub["n"], it["n"]), "title": it["title"],
                "locator": "%s·（%s）" % (sloc, it["n"]), "printed": sec["printed"],
                "body": it["text"], "hanzi": len(HANZI.findall(it["text"])),
            })
    return out


def build():
    src = json.load(io.open(SRC, encoding="utf-8"))
    raw = io.open(SRC, "rb").read()
    units = []
    for sec in src["sections"]:
        units.extend(units_of(sec, PART[str(sec["no"])]))

    def s(part):
        us = [u for u in units if u["part"] == part]
        return {"units": len(us), "hanzi": sum(u["hanzi"] for u in us),
                "sections": sorted({u["sec"] for u in us})}

    counts = {
        "units": len(units),
        "hanzi": sum(u["hanzi"] for u in units),
        "byPart": {p: s(p) for p in ("基本理论", "基本方法", "基本技能")},
        "sections": len(src["sections"]),
        "subs": sum(1 for u in units if u["level"] == 2),
        "items": sum(1 for u in units if u["level"] == 3),
    }
    return {
        "$about": "中医证候学单元层：母本为《中医证候学》第一章 病证概论（10 节 / 27,241 汉字）。"
                  "节/小节/条目三级各成一单元，locator 与印在书上的层级一致，正文一字未改。",
        "source": {
            "file": "standards/zhenghou-cidian/正文-概论.json",
            "book": "中医证候学 第一章 病证概论（上卷印张 113–139）",
            "sha256": hashlib.sha256(raw).hexdigest(),
            "script": "scripts/build_zhenghou_units.py",
            "upstream": "scripts/zgh_ocr/parse_gl.py（OCR 层 → 节/小节/条目）",
        },
        "basis": {
            "unit": "节一级必成单元；一、二级与（一）三级各成单元（父子不重复计字）",
            "locator": "概论·第N节[·一][·（一）]，与书上编号一致",
            "axes": "未设三辨/位面：本课以基本理论—基本方法—基本技能三篇为纲，见 part 字段",
            "legacy": "units-辨证篇.json（旧版：中医诊断学辨证篇 87 单元）只作对照，不进本门",
        },
        "counts": counts,
        "units": units,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    data = build()
    txt = json.dumps(data, ensure_ascii=False, indent=1) + "\n"
    if a.check:
        old = io.open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else ""
        if old != txt:
            print("DRIFT: standards/zhenghou/units.json —— 请跑 python scripts/build_zhenghou_units.py")
            return 1
        c = data["counts"]
        print(f"✓ zhenghou units: {c['units']} 单元 / {c['hanzi']:,} 汉字")
        return 0
    io.open(OUT, "w", encoding="utf-8", newline="\n").write(txt)
    c = data["counts"]
    print(f"✓ 概论单元层：{c['units']} 单元（节 {c['sections']} · 小节 {c['subs']} · 条目 {c['items']}）"
          f" / {c['hanzi']:,} 汉字 → standards/zhenghou/units.json")
    for p, v in c["byPart"].items():
        print(f"   {p}: {v['units']:2d} 单元 / {v['hanzi']:6,d} 汉字（第 {'/'.join(map(str, v['sections']))} 节）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
