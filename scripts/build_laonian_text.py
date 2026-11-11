#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_laonian_text.py —— 中医老年病学工作簿 → 底本 + 单元层

母本：F:\\textbooks\\qhzy-中医老年病学.xlsx（29 表：17 前置/平台 + 12 内容章）
  内容章表名形如 `08 老年心脑血管病证`；表内五列定位：章 / 节 / 小节 / 段 / 文字。
  段编号约定与前八门一致：段=k 是**段标题行**，段=1k 是它的**正文**。

产出：
  standards/laonian/底本.json     章 → 节 → 小节 → 段 + counts + sha256
  standards/laonian/units.json    单元层：一小节一条，含 brief/prose/hanzi/measure/三判
  standards/laonian/METHOD.json   前置与平台表行数 + 口径说明
  standards/laonian/axis-probe.json  四套四位面候选的全库实测（定口径留痕）

口径（老年病学与内科的分工）：
  内科学按「病」分章，老年病学按「老年的人」分章：同样的病，老年人的证不同（多虚、多瘀、
  多痰、多郁），治法也不同（缓图、顾护脾胃、忌峻猛）。本章的判据因此落在
  1. 三辨＝病因 / 病机 / 证候表现，第三项取老年特有的可观察项：
     步态、跌倒、认知、纳食、二便、睡眠、体重、乏力、舌脉。
  2. 四位面有四条候选，实测后取一条，其余留 axis-probe.json：
     A 脏腑系统：心脑 / 肺系 / 脾胃肝胆 / 肾与骨关节（对齐教材 08–11 章）
     B 虚损四分：气虚 / 血虚 / 阴虚 / 阳虚（老年病的共同底色）
     C 病邪四分：痰 / 瘀 / 郁 / 毒（老年病的常见标实）
     D 形神四分：神志 / 形体 / 脏腑 / 经络（老年综合征的落点）
  3. 数值不回避：老年病写年龄、剂量、评分、时限，measure 保留 valueLike 计数。
"""

import hashlib
import json
import os
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-中医老年病学.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "laonian")

CONTENT_SHEET = re.compile(r"^(\d{2})\s+(.+)$")
SUB_TITLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)\s+(.+)$")
SEG_TITLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)\.(\d+)\s+(.+)$")
HANZI = re.compile(r"[\u4e00-\u9fff]")

VIEWS = {
    "病因": ["病因", "年老", "衰老", "体虚", "禀赋", "劳倦", "情志", "饮食", "外感", "六淫",
             "寒", "湿", "痰", "久病", "药毒", "跌倒", "外伤", "多产", "房劳"],
    "病机": ["病机", "虚", "气虚", "血虚", "阴虚", "阳虚", "肾虚", "脾虚", "痰", "瘀", "郁",
             "正虚", "邪恋", "本虚标实", "气机", "阴阳", "脏腑", "传变", "失养", "不通"],
    "证候表现": ["步态", "跌倒", "认知", "记忆", "纳食", "食欲", "二便", "便秘", "尿频", "睡眠",
                 "失眠", "体重", "乏力", "倦怠", "头晕", "心悸", "咳喘", "水肿", "疼痛",
                 "舌", "脉", "畏寒", "盗汗", "情志"],
}

# A 脏腑系统（对齐教材 08–11 章）
LEVELS_A = {
    "心脑": ["心", "脑", "神志", "胸痹", "心悸", "眩晕", "中风", "痴呆", "失眠", "脉"],
    "肺系": ["肺", "咳", "喘", "痰", "气短", "感冒", "卫表", "呼吸"],
    "脾胃肝胆": ["脾", "胃", "肝", "胆", "纳", "脘", "腹", "便", "食", "泻"],
    "肾与骨关节": ["肾", "膀胱", "骨", "关节", "腰", "膝", "尿", "骨质疏松", "痿", "痹"],
}

# B 虚损四分
LEVELS_B = {
    "气虚": ["气虚", "乏力", "倦怠", "气短", "自汗", "纳差", "脾虚", "中气"],
    "血虚": ["血虚", "面色", "苍白", "头晕", "心悸", "失眠", "血亏", "贫血"],
    "阴虚": ["阴虚", "口干", "盗汗", "五心烦热", "潮热", "舌红", "少苔", "津亏"],
    "阳虚": ["阳虚", "畏寒", "肢冷", "便溏", "夜尿", "水肿", "舌淡胖", "脉沉迟"],
}

# C 病邪四分
LEVELS_C = {
    "痰": ["痰", "痰浊", "痰湿", "痰瘀", "咳痰", "苔腻"],
    "瘀": ["瘀", "血瘀", "瘀血", "紫暗", "瘀点", "刺痛", "络阻"],
    "郁": ["郁", "肝郁", "气滞", "情志", "抑郁", "焦虑", "太息"],
    "毒": ["毒", "热毒", "湿毒", "浊毒", "邪毒", "感染"],
}

# D 形神四分
LEVELS_D = {
    "神志": ["神", "神志", "认知", "记忆", "痴呆", "失眠", "情志", "抑郁", "焦虑"],
    "形体": ["形", "体", "肌", "消瘦", "体重", "步态", "跌倒", "活动", "卧床"],
    "脏腑": ["脏腑", "心", "肝", "脾", "肺", "肾", "胃", "胆"],
    "经络": ["经络", "络", "筋", "骨", "关节", "肢体", "麻木", "痹"],
}

LEVELS = LEVELS_A

VALUE_RE = re.compile(
    r"\d+(?:\.\d+)?\s*(?:°|度|cm|mm|kg|g|mg|ml|mL|%|岁|天|日|周|月|年|小时|分钟|次|分)")
LIST_RE = re.compile(r"(?:^|" + chr(10) + r")\s*\d+\s*[\.、]")


def count_hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text, levels=None):
    t = text or ""
    lv = levels if levels is not None else LEVELS
    vals = VALUE_RE.findall(t)
    return {
        "digits": len(re.findall(r"\d", t)),
        "valueLike": len(vals),
        "valueSamples": vals[:6],
        "listItems": len(LIST_RE.findall(t)),
        "views": {k: sum(t.count(w) for w in ws) for k, ws in VIEWS.items()},
        "levels": {k: sum(t.count(w) for w in ws) for k, ws in lv.items()},
    }


def tri(m):
    def pick(d):
        tot = sum(d.values())
        if not tot:
            return {"primary": None, "share": 0.0, "mix": "", "counts": d}
        order = sorted(d.items(), key=lambda kv: -kv[1])
        return {"primary": order[0][0], "share": round(order[0][1] / tot, 3),
                "mix": ">".join(k for k, v in order if v), "counts": d}
    return {"view": pick(m["views"]), "level": pick(m["levels"])}


def main():
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    sha = hashlib.sha256(open(SRC, "rb").read()).hexdigest()

    content_sheets, other_sheets = [], []
    for name in wb.sheetnames:
        m = CONTENT_SHEET.match(name)
        (content_sheets if m else other_sheets).append((name, m))

    chapters, units = [], []
    method = {"source": os.path.basename(SRC), "sha256": sha, "prefaceSheets": []}
    probes = {k: {kk: 0 for kk in lv} for k, lv in
              (("A_system", LEVELS_A), ("B_deficiency", LEVELS_B),
               ("C_pathogen", LEVELS_C), ("D_form_spirit", LEVELS_D))}

    for name, _m in other_sheets:
        ws = wb[name]
        rows = sum(1 for _ in ws.iter_rows(values_only=True))
        method["prefaceSheets"].append({"sheet": name, "rows": rows})

    for name, m in content_sheets:
        no, title = m.group(1), m.group(2).strip()
        ws = wb[name]
        sec = sub = None
        pending = None
        subs, secs = [], []
        for row in ws.iter_rows(min_row=2, values_only=True):
            ch, s_val, sub_val, seg, text = (list(row) + [None] * 5)[:5]
            text = (text or "").strip() if isinstance(text, str) else (str(text).strip() if text else "")
            s_val = (str(s_val).strip() if s_val not in (None, "·") else "")
            sub_val = (str(sub_val).strip() if sub_val not in (None, "·") else "")
            seg = (str(seg).strip() if seg not in (None, "·") else "")

            if s_val:
                sec = {"no": s_val, "title": "", "subs": []}
                secs.append(sec)
                sub = None
                pending = None
            if sub_val:
                sub = {"sub": sub_val, "title": "", "segs": []}
                subs.append(sub)
                if sec is None:
                    sec = {"no": sub_val.rsplit(".", 1)[0], "title": "", "subs": []}
                    secs.append(sec)
                sec["subs"].append(sub)
                pending = None
            if not text:
                continue
            if seg:
                if seg.isdigit() and len(seg) >= 2 and seg.startswith("1"):
                    if pending is not None and sub is not None:
                        pending["body"] = text
                        pending = None
                else:
                    mm = SEG_TITLE.match(text)
                    t = mm.group(5) if mm else text
                    if sub is None:
                        sub = {"sub": (sec["no"] + ".1") if sec else f"{no}.1", "title": "", "segs": []}
                        subs.append(sub)
                        if sec:
                            sec["subs"].append(sub)
                    pending = {"seg": seg, "title": t, "body": ""}
                    sub["segs"].append(pending)
            else:
                if sub is not None and not sub["title"]:
                    mm = SUB_TITLE.match(text)
                    sub["title"] = (mm.group(1) + "." + mm.group(2) + "." + mm.group(3) + " " + mm.group(4)) if mm else text
                elif sec is not None and not sec["title"]:
                    sec["title"] = text

        n_units = 0
        hanzi = 0
        for sub in subs:
            prose = "\n".join(s2["body"] for s2 in sub["segs"] if s2.get("body"))
            if not prose.strip():
                continue
            titles = [s2["title"] for s2 in sub["segs"]]
            unit = {
                "chapter": str(int(no)),
                "chapterTitle": f"第{int(no)}章 {title}",
                "sec": next((s3["title"] or s3["no"] for s3 in secs if sub in s3["subs"]), ""),
                "sub": sub["sub"],
                "title": sub["title"] or f"{sub['sub']}",
                "locator": f"教材·第{int(no)}章·{sub['sub']}",
                "brief": "／".join(t for t in titles if t),
                "goals": [],
                "rawBody": prose,
                "body": prose,
                "prose": prose,
                "segments": [{"title": s2["title"], "hanzi": count_hanzi(s2.get("body", ""))} for s2 in sub["segs"]],
                "hanzi": count_hanzi(prose),
                "measure": measure(prose),
            }
            for key, lv in (("A_system", LEVELS_A), ("B_deficiency", LEVELS_B),
                            ("C_pathogen", LEVELS_C), ("D_form_spirit", LEVELS_D)):
                for k, v in measure(prose, lv)["levels"].items():
                    probes[key][k] += v
            unit["tri"] = tri(unit["measure"])
            units.append(unit)
            n_units += 1
            hanzi += unit["hanzi"]

        chapters.append({
            "no": str(int(no)), "title": f"第{int(no)}章 {title}", "units": n_units, "hanzi": hanzi,
            "secs": [{"no": s["no"], "title": s["title"], "subs": [x["sub"] for x in s["subs"]]} for s in secs],
        })

    counts = {
        "chapters": len(chapters),
        "units": len(units),
        "hanzi": sum(c["hanzi"] for c in chapters),
        "digits": sum(u["measure"]["digits"] for u in units),
        "valueLike": sum(u["measure"]["valueLike"] for u in units),
    }
    by_primary_view, by_primary_level = {}, {}
    for u in units:
        for key, bucket in (("view", by_primary_view), ("level", by_primary_level)):
            p = u["tri"][key]["primary"]
            if p:
                bucket[p] = bucket.get(p, 0) + 1

    os.makedirs(OUT, exist_ok=True)
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "sheets": len(wb.sheetnames)},
               "counts": counts, "chapters": chapters},
              open(os.path.join(OUT, "底本.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "script": "scripts/build_laonian_text.py"},
               "counts": counts, "views": VIEWS, "levels": LEVELS,
               "chapters": [{"no": c["no"], "title": c["title"], "units": c["units"], "hanzi": c["hanzi"]} for c in chapters],
               "units": units,
               "triaxis": {"byPrimaryView": by_primary_view, "byPrimaryLevel": by_primary_level}},
              open(os.path.join(OUT, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    method["contentSheets"] = [c["title"] for c in chapters]
    method["axes"] = {"views": list(VIEWS), "levels": list(LEVELS),
                      "note": "三辨＝病因/病机/证候表现（第三项取老年特有条目：步态/跌倒/认知/纳食/二便/睡眠/体重/乏力）；四位面取**脏腑系统**（心脑/肺系/脾胃肝胆/肾与骨关节），实测 2386/1378/3304/2018（max/min 2.4×），且与教材 08–11 章一一对应。虚损四分（气虚569/血虚458/阴虚374/阳虚387，**1.5×**）分布异常均匀，说明「虚」是全书底色、不区分章节，故不作四位面，改作横向观察轴写进各章正文。病邪四分 933/888/580/163（5.7×，毒过稀）与形神四分 1180/1510/3657/999（3.7×，脏腑单极）均弃用，全部实测留在 axis-probe.json"}
    json.dump(method, open(os.path.join(OUT, "METHOD.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"counts": counts, **probes},
              open(os.path.join(OUT, "axis-probe.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"章 {counts['chapters']} · 单元 {counts['units']} · 汉字 {counts['hanzi']:,} · 数值命中 {counts['valueLike']}")
    print("三辨主轴:", by_primary_view)
    print("四位面主轴:", by_primary_level)
    for k, v in probes.items():
        print(f"  {k}: {v}")
    for c in chapters:
        print(f"  第{c['no']}章 {c['title'][4:]:<24s} 单元 {c['units']:>3d} · 汉字 {c['hanzi']:>7,d}")


if __name__ == "__main__":
    main()
