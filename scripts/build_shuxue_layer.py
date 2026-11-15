#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_shuxue_layer.py —— 《经络腧穴学》工作簿 → 腧穴学的穴位库 + 单元层

教材的「重点穴」小节（每经 X.3.x）正文按穴分块，但**格式有两种**：

  A 式（肺经等）：  中府 Zhōngfǔ（LU1）肺之募穴
                    【定位】…【解剖】…【主治】…【刺灸】…【针刺安全，临床红线】…【配伍】…

  B 式（大肠经等）：1.商阳（Shāngyáng，LI1）井穴
                    定位：…解剖：…主治：…刺灸法：…配伍：…

两种都要认，否则只解析出第一条经。产出：

  standards/shuxue/穴位库.json   points[]：经/穴名/编号/特定穴/定位/解剖/主治/刺灸/安全红线/配伍/部位/locator
  standards/shuxue/units.json    单元层（从 standards/jingluo/units.json 取本章所需单元，重算三辨与四位面）
  standards/shuxue/chapter-map.json  课程 12 章 → 单元号
  standards/shuxue/METHOD.json
"""
import hashlib
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = r"F:\textbooks\qhzy-经络腧穴学.xlsx"
JL = os.path.join(ROOT, "standards", "jingluo")
OUT = os.path.join(ROOT, "standards", "shuxue")

VIEWS = {
    "定位": ["定位", "骨度", "体表标志", "简便取穴", "同身寸", "凹陷", "横平", "旁开", "纹头", "髂", "脐", "寸"],
    "主治": ["主治", "病证", "疼痛", "热", "虚", "实证", "配穴", "配伍", "治"],
    "操作": ["刺", "灸", "直刺", "斜刺", "平刺", "浅刺", "深", "角度", "留针", "点刺", "禁针", "禁灸", "可灸"],
}

LEVELS = {
    "头面颈项": ["头", "面", "眉", "目", "眼", "耳", "鼻", "口", "唇", "颊", "颏", "颈", "项", "枕", "颞", "额", "发际", "乳突"],
    "胸腹": ["胸", "乳", "腹", "脐", "肋", "剑突", "耻骨", "胁"],
    "背腰": ["背", "腰", "脊", "椎", "肩胛", "骶", "髂", "臀"],
    "四肢": ["臂", "肘", "腕", "手", "指", "掌", "腿", "膝", "踝", "足", "趾", "跟", "胫", "腓", "股", "肩", "腋"],
}

HEAD_A = re.compile(r"^([\u4e00-\u9fff]{1,4})\s+[^\s（(]{1,26}\s*[（(]([A-Z]{2}\d{1,2})[）)]\s*(.*)$")
HEAD_B = re.compile(r"^\d{1,3}[.、]\s*([\u4e00-\u9fff]{1,4})\s*[（(][^）)]{0,40}?([A-Z]{2}\d{1,2})[）)]\s*(.*)$")
FIELD_A = re.compile(r"【([^】]+)】")
FIELD_B = re.compile(r"(定位|解剖|主治|刺灸法|刺灸|配伍|按语)\s*[:：]")
REDLINE_KEYS = ("针刺安全，临床红线", "红线", "安全")

MERIDIAN_OF = {
    "4": "手太阴肺经", "5": "手阳明大肠经", "6": "足阳明胃经", "7": "足太阴脾经",
    "8": "手少阴心经", "9": "手太阳小肠经", "10": "足太阳膀胱经", "11": "足少阴肾经",
    "12": "手厥阴心包经", "13": "手少阳三焦经", "14": "足少阳胆经", "15": "足厥阴肝经",
}

CHAPTER_MAP = {
    "01-fenlei-dingwei": {"n": 1, "title": "腧穴的分类、命名与定位方法", "units": ["2.1.1", "2.1.2", "2.2.1"]},
    "02-gudu-fencun": {"n": 2, "title": "骨度分寸与体表标志", "units": ["2.3.1", "2.3.2", "2.3.3", "2.3.4"]},
    "03-shou-san-yin": {"n": 3, "title": "手三阴经腧穴", "units": ["4.3.1", "8.3.1", "12.3.1"]},
    "04-shou-san-yang": {"n": 4, "title": "手三阳经腧穴", "units": ["5.3.1", "9.3.1", "13.3.1"]},
    "05-zu-san-yang": {"n": 5, "title": "足三阳经腧穴", "units": ["6.3.1", "6.3.2", "6.3.3", "10.3.1", "10.3.2", "14.3.1", "14.3.2"]},
    "06-zu-san-yin": {"n": 6, "title": "足三阴经腧穴", "units": ["7.3.1", "11.3.1", "11.3.2", "15.3.1"]},
    "07-ren-du-xue": {"n": 7, "title": "任督二脉腧穴", "units": ["16.2.2", "16.3.2"]},
    "08-jingwai-qixue": {"n": 8, "title": "经外奇穴与阿是穴", "units": ["17.1.1", "17.2.1"]},
    "09-teding-xue": {"n": 9, "title": "特定穴：五输、原络、俞募", "units": ["2.5.1", "2.5.2", "2.5.3"]},
    "10-zhuzhi-guilv": {"n": 10, "title": "腧穴的主治规律与配穴", "units": ["2.4.1", "2.4.2", "2.4.3"]},
    "11-weixian-shendu": {"n": 11, "title": "危险穴位与针刺安全深度", "units": ["4.3.1", "6.3.1", "8.3.1", "10.3.1", "12.3.1", "14.3.1"]},
    "12-dingwei-sanwei": {"n": 12, "title": "腧穴定位的数字化与三维模型", "units": ["19.4.1", "19.4.2"]},
}


def hanzi(s):
    return len(re.findall(r"[\u4e00-\u9fff]", s or ""))


def split_fields(block):
    """同时支持【字段】与「字段：」两种写法；返回 dict + 安全红线。"""
    parts = {}
    marks = [(m.start(), m.group(1)) for m in FIELD_A.finditer(block)]
    if marks:
        for i, (pos, name) in enumerate(marks):
            end = marks[i + 1][0] if i + 1 < len(marks) else len(block)
            body = block[pos:end]
            body = body[body.index("】") + 1:] if "】" in body else body
            parts[name] = body.strip()
    else:
        marks = [(m.start(), m.group(1)) for m in FIELD_B.finditer(block)]
        for i, (pos, name) in enumerate(marks):
            end = marks[i + 1][0] if i + 1 < len(marks) else len(block)
            body = block[pos:end]
            body = re.sub(r"^(定位|解剖|主治|刺灸法|刺灸|配伍|按语)\s*[:：]", "", body).strip()
            parts[name] = body

    red = ""
    for k in list(parts):
        if any(key in k for key in REDLINE_KEYS):
            red = parts.pop(k).strip()
            break
    if not red:
        # B 式把红线写在句中：抓「不可…以免…」一句
        m = re.search(r"(不可[^。]{0,60}?(?:以免|防止)[^。]{0,40}。)", block)
        if m:
            red = m.group(1).strip()
    sj = parts.get("刺灸法") or parts.get("刺灸") or ""
    marker = "【" + REDLINE_KEYS[0] + "】"
    if marker in sj:
        cut = sj.index(marker)
        red = red or sj[cut + len(marker):].strip()
        parts["刺灸法"] = sj[:cut].strip()
    elif REDLINE_KEYS[0] in sj:
        cut = sj.index(REDLINE_KEYS[0])
        red = red or sj[cut + len(REDLINE_KEYS[0]):].strip()
        parts["刺灸法"] = sj[:cut].strip()
    return parts, red


PT_PAT = re.compile(r"([一-鿿]{2,4})\s*[*＊]?\s*[A-Za-zÀ-ɏ]{0,20}\s*[（(]\s*[^）)]{0,40}?((?:EX-)?[A-Z]{2}\d{1,2})\s*[）)]")
BAD_NAMES = ("经外奇穴", "尚有", "其", "本经", "以上")


def parse_points(unit, meridian):
    """按「穴名（拼音，编号）」在全文中的位置切块——教材有四种写法（【字段】/「字段：」/带序号/带中文序号），
    只有这个锚点是共有的；按锚点切，四种写法一次覆盖。"""
    prose = unit["prose"]
    ms = list(PT_PAT.finditer(prose))
    out = []
    for i, m in enumerate(ms):
        name = m.group(1)
        if any(name.startswith(b) for b in BAD_NAMES):
            continue
        end = ms[i + 1].start() if i + 1 < len(ms) else len(prose)
        block = prose[m.end():end]
        block = re.sub(r"^[）。：:，,、\s]+", "", block)
        parts, red = split_fields(block)
        tag = ""
        for t in ("八脉交会穴", "八会穴", "下合穴", "背俞穴", "募穴", "原穴", "络穴", "郄穴",
                  "五输穴", "井穴", "荥穴", "输穴", "经穴", "合穴", "交会穴"):
            if t in block[:40]:
                tag = t
                break
        loc = parts.get("定位", "")
        if not loc:
            m2 = re.search(r"^([^。]{6,60}。)", block)
            loc = m2.group(1) if m2 else ""
        lv = {k: sum(loc.count(w) for w in kws) for k, kws in LEVELS.items()}
        out.append({
            "经": meridian, "穴名": name, "编号": m.group(2), "特定穴": tag,
            "定位": loc, "解剖": parts.get("解剖", "") or parts.get("局部解剖", ""),
            "主治": parts.get("主治", ""),
            "刺灸": parts.get("刺灸法") or parts.get("刺灸", "") or parts.get("操作", ""),
            "安全红线": red, "配伍": parts.get("配伍", ""),
            "部位": max(lv, key=lv.get) if any(lv.values()) else "",
            "hanzi": hanzi(block), "locator": unit["locator"],
        })
    return out


def main():
    jl = json.load(open(os.path.join(JL, "units.json"), encoding="utf-8"))
    bysub = {u["sub"]: u for u in jl["units"]}

    point_units = [u for u in jl["units"]
                   if re.match(r"^\d+\.3\.[123]$", u["sub"]) or u["sub"] in ("16.2.2", "16.3.2", "17.1.1", "17.2.1")]
    points = []
    for u in point_units:
        if u["sub"].startswith("17"):
            mer = "经外奇穴"
        elif u["sub"].startswith("16"):
            mer = "任督二脉"
        else:
            mer = MERIDIAN_OF.get(u["chapter"], f"第{u['chapter']}章")
        points.extend(parse_points(u, mer))

    used = sorted({k for c in CHAPTER_MAP.values() for k in c["units"]})
    units = []
    for k in used:
        u = bysub[k]
        prose = u["prose"]
        views = {kk: sum(prose.count(w) for w in ws) for kk, ws in VIEWS.items()}
        lev = {kk: sum(prose.count(w) for w in ws) for kk, ws in LEVELS.items()}
        units.append({
            "chapter": u["chapter"], "chapterTitle": u["chapterTitle"], "sec": u.get("sec", ""),
            "sub": u["sub"], "title": u["title"], "locator": u["locator"], "brief": u["brief"], "goals": [],
            "rawBody": prose, "body": prose, "prose": prose, "segments": u.get("segments", []),
            "hanzi": u["hanzi"],
            "measure": {"digits": u["measure"]["digits"], "valueLike": u["measure"]["valueLike"],
                        "views": views, "levels": lev},
        })

    counts = {
        "points": len(points),
        "pointsWithRedline": sum(1 for p in points if p["安全红线"]),
        "pointsWithTag": sum(1 for p in points if p["特定穴"]),
        "byMeridian": {m: sum(1 for p in points if p["经"] == m) for m in sorted({p["经"] for p in points})},
        "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
        "pointHanzi": sum(p["hanzi"] for p in points),
    }

    os.makedirs(OUT, exist_ok=True)
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": hashlib.sha256(open(SRC, "rb").read()).hexdigest(),
                          "derivedFrom": "standards/jingluo/units.json"},
               "counts": counts, "points": points},
              open(os.path.join(OUT, "穴位库.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": hashlib.sha256(open(SRC, "rb").read()).hexdigest(),
                          "derivedFrom": "standards/jingluo/units.json",
                          "external": "GB/T 12346-2021《经穴名称与定位》：国标 362 条，教材 253 条对齐，外源补入 109 条（见 补源登记.json）"},
               "counts": counts, "views": VIEWS, "levels": LEVELS,
               "chapters": [{"no": c["n"], "title": c["title"], "units": len(c["units"])}
                            for c in sorted(CHAPTER_MAP.values(), key=lambda x: x["n"])],
               "units": units},
              open(os.path.join(OUT, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(CHAPTER_MAP, open(os.path.join(OUT, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"counts": counts,
               "note": "一穴一条；两种教材格式（【字段】式 / 「字段：」式）都要认，漏一种就只剩第一条经"},
              open(os.path.join(OUT, "METHOD.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"穴位 {counts['points']} 个（带红线 {counts['pointsWithRedline']} · 带特定穴标注 {counts['pointsWithTag']}）"
          f"· 穴位汉字 {counts['pointHanzi']:,}")
    print("各经穴数:", json.dumps(counts["byMeridian"], ensure_ascii=False))
    print(f"单元 {counts['units']} · 汉字 {counts['hanzi']:,}")


if __name__ == "__main__":
    main()
