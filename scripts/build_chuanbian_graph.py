#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""六经传变总图的数据层：节点（六经＋变证＋自愈）与有向边（传变类型＋代表条号）。

边的证据一律回查 standards/shanghan/tiao-398.json：
  · 每条边的 tiao 必须存在，脚本把「原文首句」抄进 ev，避免手写错条号。
  · tier：条号 ≤100 → "视频覆盖"（P01-P28 讲过）；>100 → "宋本原文·视频未讲"。
输出：standards/materials/shanghan-quannao/chuanbian-graph.json
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAT = os.path.join(ROOT, "standards", "materials", "shanghan-quannao")
TIAO = os.path.join(ROOT, "standards", "shanghan", "tiao-398.json")
OUT = os.path.join(MAT, "chuanbian-graph.json")

NODES = [
    {"key": "太阳", "name": "太阳", "sub": "表·膀胱经", "tigang": 1,
     "core": "脉浮、头项强痛、恶寒——病位在最外一层，机体反应以体表血管收缩与肌张力升高为主。"},
    {"key": "阳明", "name": "阳明", "sub": "里实·胃肠", "tigang": 179,
     "core": "胃家实——热与糟粕相结，代谢率与肠腔壅滞同时升高。"},
    {"key": "少阳", "name": "少阳", "sub": "半表半里·枢", "tigang": 263,
     "core": "口苦、咽干、目眩——正邪分争于胁下，寒热往来、休作有时。"},
    {"key": "太阴", "name": "太阴", "sub": "里虚寒·脾", "tigang": 273,
     "core": "腹满而吐、食不下、自利益甚——消化吸收功能低下，属虚寒。"},
    {"key": "少阴", "name": "少阴", "sub": "心肾·阳衰", "tigang": 281,
     "core": "脉微细、但欲寐——心搏出量与末梢灌注双降，中枢抑制。"},
    {"key": "厥阴", "name": "厥阴", "sub": "阴阳错杂·心包", "tigang": 326,
     "core": "消渴、气上撞心、心中疼热——寒热错杂、厥热胜复，最深一层。"},
    {"key": "变证", "name": "坏病·变证", "sub": "误治产物", "tigang": 16,
     "core": "汗吐下温针后仍不解、证候随干预而变形——不是传经，是治疗塑造出来的第二病程。"},
    {"key": "自愈", "name": "自愈·外出", "sub": "转归", "tigang": 8,
     "core": "七日行经尽、冒家汗出、战汗而解——机体自己找到出口。"},
]

# (起点, 终点, 类型, 条号列表, 一句说明)
EDGES = [
    ("太阳", "阳明", "循经传", [70, 182],
     "汗后「不恶寒但热」＝由表转里实，当和胃气（调胃承气）；阳明外证身热汗自出、反恶热，即此端的判据。"),
    ("太阳", "少阳", "循经传", [97, 99],
     "「血弱气尽、腠理开、邪气因入、结于胁下」是转入半表半里的机制句；四五日胁下满而手足温＝太阳少阳并见。"),
    ("太阳", "少阴", "越经传·直中", [92, 61, 82],
     "发热头痛而「脉反沉」＝症状在表、动力在里；下后复发汗见昼躁夜静；汗出不解见心下悸、头眩、身瞤动。"),
    ("太阳", "太阴", "误汗入里", [89, 273],
     "素寒之人复发汗则「胃中冷、必吐蚘」，直接把病推进中焦虚寒；太阴提纲腹满吐利即此端的定型。"),
    ("太阳", "变证", "误治变证", [16, 90, 93],
     "汗吐下温针仍不解＝坏病，「观其脉证，知犯何逆，随证治之」；汗下先后颠倒则为逆；先下后汗致表里俱虚而冒。"),
    ("太阳", "自愈", "自解·外出", [8, 30, 93, 94],
     "七日行经尽自愈、针足阳明使经不传；「夜半手足当温」是阳复的时间窗；冒家汗出自愈；脉阴阳俱停者振慄汗出而解。"),
    ("太阳", "阳明", "合病并病", [32, 36],
     "太阳与阳明合病：一自下利（葛根汤）、一喘而胸满不可下（麻黄汤）——同一条边，出口不同则方不同。"),
    ("太阳", "少阳", "合病并病", [99],
     "身热恶风、颈项强（太阳）＋胁下满（少阳）并见，主小柴胡——两经同起时以枢机为主。"),
    ("少阳", "阳明", "枢机失守", [99, 100],
     "「手足温而渴」示里热已起；腹中急痛先与小建中、不差再与小柴胡——枢不解则热内结。"),
    ("阳明", "少阴", "下多亡阳", [91, 92],
     "医下之续得「下利清谷不止」而身疼痛，急当救里用四逆汤——攻下把里实打成里虚寒。"),
    ("变证", "少阴", "坏病入阴", [61, 69, 82],
     "反复攻伐后依次落到干姜附子汤（昼躁夜静）、茯苓四逆汤（烦躁）、真武汤（眩悸瞤动）——同一条坏病线的三个刻度。"),
    ("太阴", "少阴", "循经传", [273, 281],
     "太阴腹满吐利（消化层）→少阴脉微细但欲寐（循环-中枢层）：虚寒由中焦深入到心肾。"),
    ("少阴", "厥阴", "循经传", [281, 327],
     "少阴阳衰到极点则见厥热胜复；P29 概念给出「厥阴＝心包」的落点，把这一层接到心包急症。"),
    ("厥阴", "自愈", "阳复·欲愈", [327],
     "「脉微浮为欲愈，不浮为未愈」——厥阴的转归只看阳气能否回来，这是全书最深层的自愈判据。"),
]

TYPE_STYLE = {
    "循经传": {"color": "#8A6A2F", "ls": "-"},
    "越经传·直中": {"color": "#8C3B2E", "ls": "-"},
    "误汗入里": {"color": "#A2503C", "ls": "--"},
    "误治变证": {"color": "#6B4A8A", "ls": "--"},
    "自解·外出": {"color": "#3E7A5C", "ls": ":"},
    "合病并病": {"color": "#3E5C7A", "ls": "-."},
    "枢机失守": {"color": "#B07A2A", "ls": "--"},
    "下多亡阳": {"color": "#8C3B2E", "ls": "-."},
    "坏病入阴": {"color": "#6B4A8A", "ls": "-."},
    "阳复·欲愈": {"color": "#3E7A5C", "ls": ":"},
}


def main():
    src = json.load(open(TIAO, encoding="utf-8"))
    m = {r["no"]: r for r in src["tiao"]}

    def ev(n):
        r = m[n]
        text = r.get("text") or ""
        first = "，".join([x for x in text.split("，")[:2]])[:26]
        return {"no": n, "liu": r.get("liu"), "fang": r.get("fang") or [],
                "head": first, "chars": r.get("chars"),
                "tier": "视频覆盖" if n <= 100 else "宋本原文·视频未讲"}

    nodes = []
    for nd in NODES:
        e = ev(nd["tigang"])
        nodes.append({**nd, "tigangHead": e["head"], "tigangTier": e["tier"]})

    edges = []
    for a, b, typ, nos, note in EDGES:
        evs = [ev(n) for n in nos]
        edges.append({
            "from": a, "to": b, "type": typ,
            "tiao": nos,
            "tier": "视频覆盖" if all(n <= 100 for n in nos) else
                    ("原文·视频未讲" if all(n > 100 for n in nos) else "混合"),
            "ev": evs, "note": note,
            "style": TYPE_STYLE.get(typ, {"color": "#5C4B33", "ls": "-"}),
        })

    # 判据四件（来自条 4、5、8、90 与各讲总结）
    crit = [
        {"k": "脉（动力）", "tiao": "92", "t": "发热头痛而脉反沉＝症状在表、动力在里；脉沉微则入阴。"},
        {"k": "证（部位）", "tiao": "4", "t": "「颇欲吐、若躁烦」提示由表入里；阳明少阳证不见者不传（条5）。"},
        {"k": "反应性", "tiao": "61", "t": "昼日烦躁、夜而安静＝尚有反应储备但已失代偿；若昼夜皆躁则属实热。"},
        {"k": "时间（节律）", "tiao": "8", "t": "七日行经尽自愈；「夜半手足当温」（条30）＝阳复的时间窗。"},
    ]
    out = {
        "generated": "chuanbian-graph.json",
        "note": "节点＝六经＋坏病变证＋自愈；边＝传变类型，证据条号回查 tiao-398.json 原文首句。tier 区分「视频覆盖（条≤100）」与「宋本原文·视频未讲」。",
        "nodes": nodes,
        "edges": edges,
        "criteria": crit,
        "counts": {
            "nodes": len(nodes), "edges": len(edges),
            "by_type": {t: sum(1 for e in edges if e["type"] == t) for t in TYPE_STYLE},
            "video_covered": sum(1 for e in edges if e["tier"] == "视频覆盖"),
        },
    }
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("saved", OUT)
    print("nodes", len(nodes), "edges", len(edges))
    for t, c in out["counts"]["by_type"].items():
        if c:
            print(f"  {t}: {c}")


if __name__ == "__main__":
    main()
