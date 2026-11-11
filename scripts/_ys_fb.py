# -*- coding: utf-8 -*-
"""重设 18 的 doc-config fallback 为「《规范名·条》」，并打印抽样。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
base = os.path.join(ROOT, "standards", "yaoshi-guanli")
BOOK = {"NMPA-注册办法-2020": "药品注册管理办法（总局令第 27 号，2020）",
        "NPC-药品管理法-2019": "中华人民共和国药品管理法（2019）",
        "STATE-实施条例-828": "药品管理法实施条例（国务院令第 828 号，2026）",
        "NMPA-GVP-2021": "药物警戒质量管理规范（2021）",
        "MOH-GMP-2010": "药品生产质量管理规范（2010 年修订）",
        "MOH-GSP-2016": "药品经营质量管理规范（2016 年修正）"}
SRC = json.load(io.open(os.path.join(base, "外源条文.json"), encoding="utf-8"))
src = {c["id"]: c for c in SRC["clauses"]}
CM = json.load(io.open(os.path.join(base, "chapter-map.json"), encoding="utf-8"))["chapters"]
cfg = json.load(io.open(os.path.join(base, "doc-config.json"), encoding="utf-8"))
fb = {}
for slug, info in CM.items():
    c = src[info["srcChapters"][0].replace("外源#", "").split(",")[0]]
    fb[slug] = [f"《{BOOK[c['source']]}·{c['clause']}》",
                f"外源课：条文依据为「外源·{BOOK[c['source']]} {c['clause']}」，非教材原文篇名"]
cfg["fallback"] = fb
json.dump(cfg, io.open(os.path.join(base, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("set", len(fb), "->", fb["01-dingyi-fenlei"][0], "|", fb["28-gsp-sizhizhu"][0])
