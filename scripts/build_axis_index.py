#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""病机轴索引：把 57 个语义群（29 讲）与 23 个内容表语义群抽到九轴上，供按轴检索。

数据来源（都可复核）：
  1. standards/shanghan/semtensor-398.json —— 398 条 × 九轴（0-3），带命中词 hit；
  2. semantic-summaries-A/B.json —— 每组的条范围、名称、病理生理段；
  3. standards/shanghan/tiao-398.json —— 组的代表方与原文首句。

组的轴向量 = 该组覆盖条目的向量均值（round 2）；无条号的组（P29 概念组等）
改用「组文本按轴词表命中」兜底，并在 src 字段标注来源，避免把两种口径混成一种。

输出：standards/materials/shanghan-quannao/axis-index.json
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAT = os.path.join(ROOT, "standards", "materials", "shanghan-quannao")
SEM = os.path.join(ROOT, "standards", "shanghan", "semtensor-398.json")
TIAO = os.path.join(ROOT, "standards", "shanghan", "tiao-398.json")
OUT = os.path.join(MAT, "axis-index.json")

AXES = ["热势", "津伤", "阳衰", "水饮", "气滞", "血瘀", "神乱", "里实", "表郁"]

# 每轴的判族口诀（hermesagent 自写，落到具体方与条）
RULE = {
    "热势": "看到「身热、汗自出、不恶寒反恶热」＋「腹满、便秘」就归热势族（白虎/承气），别再往表证上想。",
    "津伤": "看到「汗出多、口渴、小便不利、舌干」就归津伤族：先问津液够不够，再问该不该发汗。",
    "阳衰": "看到「脉微（细）、但欲寐、四肢厥冷」＋方为四逆辈/附子剂，就归阳衰族——不必等其他症状集齐。",
    "水饮": "看到「心下悸、头眩、小便不利、起则头眩、身瞤动」就归水饮族（苓桂/五苓/真武），不问是哪个脏腑的水。",
    "气滞": "看到「胸满、腹满、胁下满、心中结痛」而按之柔软，就归气滞族（厚朴/枳实/柴胡），不当里实攻。",
    "血瘀": "看到「喜忘、如狂、少腹急结、大便黑」就归血瘀族（抵当/桃核承气），热与血结不在气分。",
    "神乱": "看到「烦躁、谵语、不得眠、恍惚心乱」先分虚实：脉实属热扰，脉微属阳衰烦躁。",
    "里实": "看到「潮热、腹满痛拒按、大便硬、谵语」就归里实族（三承气），按痞满燥实分层取方。",
    "表郁": "看到「脉浮、头项强痛、恶寒、无汗」就归表郁族（麻黄/桂枝），先辨有汗无汗再选方。",
}


def parse_nos(t):
    """把 '4-5' / '97' / '1-398' / '概念 1-4' 等解析成条号列表（解析不了返回 []）。"""
    if not t:
        return []
    nums = re.findall(r"\d+", t)
    if not nums:
        return []
    if len(nums) >= 2 and "-" in t:
        a, b = int(nums[0]), int(nums[1])
        if a <= b and b - a <= 400:
            return list(range(a, b + 1))
    return [int(nums[0])]


def main():
    sem = json.load(open(SEM, encoding="utf-8"))
    axes_def = {a["name"]: a for a in sem["axes"]}
    rows = {r["no"]: r for r in sem["rows"]}
    tiao = {r["no"]: r for r in json.load(open(TIAO, encoding="utf-8"))["tiao"]}

    ovp = os.path.join(MAT, "axis-overrides.json")
    OV = json.load(open(ovp, encoding="utf-8"))["overrides"] if os.path.exists(ovp) else {}

    summaries = {}
    for fn in ("semantic-summaries-A.json", "semantic-summaries-B.json"):
        summaries.update(json.load(open(os.path.join(MAT, fn), encoding="utf-8"))["sheets"])

    groups = []
    for key, blk in summaries.items():
        for i, g in enumerate(blk.get("groups", []), 1):
            nos = [n for n in parse_nos(g.get("tiao", "")) if n in rows]
            vmean = {a: 0.0 for a in AXES}
            fangs, heads = [], []
            if nos:
                for a in AXES:
                    vmean[a] = round(sum(rows[n]["vec"][a] for n in nos) / len(nos), 2)
                for n in nos:
                    for f in (tiao.get(n, {}).get("fang") or []):
                        if f not in fangs:
                            fangs.append(f)
                heads.append({"no": nos[0], "head": (tiao.get(nos[0], {}).get("text") or "")[:28]})
            # 组自身文本（病理生理＋传变）按轴词表命中：条词表漏词时兜底
            text = g.get("name", "") + g.get("patho", "") + g.get("cb", "")
            vtext = {a: float(min(3, sum(text.count(w) for w in axes_def[a]["lexicon"])))
                     for a in AXES}
            vec = {a: (vmean[a] if vmean[a] >= vtext[a] else vtext[a]) for a in AXES}
            src = "条向量均值" if all(vmean[a] >= vtext[a] for a in AXES) else (
                "组文本词表" if not nos else "条向量＋组文本（取高）")
            order = sorted(AXES, key=lambda a: (-vec[a], -vtext[a], AXES.index(a)))
            auto_main = order[0] if vec[order[0]] >= 0.5 else "（无轴）"
            main, reason = auto_main, ""
            ov = OV.get(f"{key}|{i}")
            if ov:
                main = ov["axis"] if ov["axis"] != "无轴" else "（无轴）"
                reason = ov.get("reason", "")
                src = "人工裁定"
                if main in AXES and vec[main] < 1.0:
                    vec[main] = 1.0      # 人工判定即视为该轴至少 1 档（显示与检索用）
            groups.append({
                "sheet": key, "i": i, "name": g["name"], "tiao": g.get("tiao", ""),
                "vmean": vmean, "vtext": vtext,
                "nos": nos[:1] + nos[-1:] if nos else [],
                "n": len(nos), "vec": vec, "main": main, "autoMain": auto_main,
                "override": reason, "second": order[1],
                "secondScore": vec[order[1]], "mainScore": vec[order[0]],
                "fang": fangs[:6], "src": src, "head": heads[0] if heads else None,
            })

    # 每轴一张检索表
    axis_tables = []
    for a in AXES:
        lst = sorted([g for g in groups if g["vec"][a] > 0 and g["main"] != "（无轴）"],
                     key=lambda g: (-g["vec"][a], -g["mainScore"]))
        fang_count = {}
        for g in lst:
            for f in g["fang"]:
                fang_count[f] = fang_count.get(f, 0) + 1
        top_fang = [k for k, _ in sorted(fang_count.items(), key=lambda kv: -kv[1])[:8]]
        axis_tables.append({
            "axis": a, "mech": axes_def[a]["mech"], "lexicon": axes_def[a]["lexicon"][:10],
            "rule": RULE[a],
            "groups": [{"sheet": g["sheet"], "name": g["name"], "score": g["vec"][a],
                        "main": g["main"], "tiao": g["tiao"], "fang": g["fang"][:4],
                        "excerpt": (g["head"]["head"] if g["head"] else "")} for g in lst],
            "n_groups": len(lst),
            "n_strong": sum(1 for g in lst if g["vec"][a] >= 1.5),
            "top_fang": top_fang,
        })

    out = {
        "generated": "scripts/build_axis_index.py",
        "note": "组向量＝该组条目的九轴均值（semtensor-398.json）；无条号的组用组文本词表兜底，src 字段标明口径。",
        "axes": axis_tables,
        "groups": groups,
        "counts": {
            "groups": len(groups),
            "with_axis": sum(1 for g in groups if g["main"] != "（无轴）"),
            "no_axis": sum(1 for g in groups if g["main"] == "（无轴）"),
            "by_axis_main": {a: sum(1 for g in groups if g["main"] == a) for a in AXES},
            "overridden": sum(1 for g in groups if g["src"] == "人工裁定"),
        },
    }
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("saved", OUT)
    print("groups", len(groups), "| 主轴分布", out["counts"]["by_axis_main"])
    print("按轴语义群数：", {t["axis"]: t["n_groups"] for t in axis_tables})
    print("强档(≥1.5)：", {t["axis"]: t["n_strong"] for t in axis_tables})


if __name__ == "__main__":
    main()
