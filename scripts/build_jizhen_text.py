#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_jizhen_text.py —— 中医急诊学工作簿 → 底本 + 单元层

母本：F:\\textbooks\\qhzy-中医急诊学.xlsx（27 表：15 前置/平台 + 12 内容章）
  内容章表名形如 `06 心脑急症`；表内五列定位：章 / 节 / 小节 / 段 / 文字。
  段编号约定与前六门一致：段=k 是**段标题行**，段=1k 是它的**正文**。

产出：
  standards/jizhen/底本.json    章 → 节 → 小节 → 段（标题 + 正文）+ counts + sha256
  standards/jizhen/units.json   单元层：一小节一条，含 brief/prose/hanzi/measure/三判
  standards/jizhen/METHOD.json  前置与平台表的行数 + 口径说明
  standards/jizhen/axis-probe.json  两套四位面候选的全库实测（定口径留痕）

口径（急诊与前三门临床课的差别）：
  1. 三辨沿用**病因 / 病机 / 证候表现**，第三项落在「急诊可数的那几项」：意识、呼吸、
     血压、脉搏、尿量、体温——急诊不看「面色萎黄」这类慢性描述，看的是能进监护仪的指标。
  2. 四位面有两条候选，实测后取一条并把另一条留进 axis-probe.json：
     A 系统轴：心脑 / 肺系 / 脾胃肝胆 / 肾与中毒（对齐教材第 06–09 章的编排）
     B 支持轴：呼吸与气道 / 循环与神志 / 消化与代谢 / 血证与创伤（对齐急救流程 ABCD）
     选 A 的理由：与教材章序一一对应，且第 10 章「血证与创伤」可挂在 B 的第四格；
     若 B 的分布更均（首位占比更低），改取 B——数字说话，结论写进 METHOD.json 的 axes.note。
  3. 数值不回避：急诊教材写血压、心率、血氧、体温、时间窗（分钟/小时），measure 保留计数。
"""

import hashlib
import json
import os
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-中医急诊学.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "jizhen")

CONTENT_SHEET = re.compile(r"^(\d{2})\s+(.+)$")
SUB_TITLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)\s+(.+)$")
SEG_TITLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)\.(\d+)\s+(.+)$")
HANZI = re.compile(r"[\u4e00-\u9fff]")

# 三辨：谁在致病 / 经由什么机制 / 病人在监护仪与查体上留下什么
VIEWS = {
    "病因": ["病因", "外感", "六淫", "疫毒", "毒物", "中毒", "外伤", "金刃", "跌仆", "情志",
             "饮食", "劳倦", "寒邪", "热邪", "暑", "湿", "风邪", "先天", "药毒"],
    "病机": ["病机", "闭证", "脱证", "气脱", "血脱", "阴竭", "阳亡", "痰蒙", "热陷", "瘀阻",
             "腑实", "水停", "正虚", "邪盛", "传变", "逆传", "内陷", "厥脱"],
    "证候表现": ["意识", "神志", "呼吸", "血压", "脉搏", "心率", "尿量", "体温", "瞳孔", "汗出",
                 "肢冷", "抽搐", "呕血", "便血", "面色", "舌", "脉", "血氧", "紫绀"],
}

# 四位面 A：系统轴（对齐教材 06–09 章）
LEVELS_A = {
    "心脑": ["心", "脑", "神志", "胸痛", "心悸", "卒中", "昏", "厥", "抽搐", "脉"],
    "肺系": ["肺", "呼吸", "咳", "喘", "痰", "气促", "紫绀", "气道", "血氧"],
    "脾胃肝胆": ["脾胃", "胃", "肝", "胆", "腹", "呕", "泻", "黄疸", "肠"],
    "肾与中毒": ["肾", "膀胱", "尿", "水肿", "中毒", "毒物", "透析", "电解质"],
}

# 四位面 B：支持轴（对齐急救 ABCD 流程）
LEVELS_B = {
    "呼吸与气道": ["气道", "呼吸", "氧", "插管", "通气", "紫绀", "窒息"],
    "循环与神志": ["循环", "血压", "心率", "休克", "输液", "神志", "意识", "瞳孔"],
    "消化与代谢": ["呕吐", "腹泻", "腹", "黄疸", "血糖", "电解质", "酸碱", "尿量"],
    "血证与创伤": ["出血", "呕血", "便血", "咯血", "创伤", "骨折", "外伤", "止血", "输血"],
}

LEVELS = LEVELS_B

VALUE_RE = re.compile(
    r"\d+(?:\.\d+)?\s*(?:℃|°C|%|mmHg|次/分|ml|mL|g|mg|U|分钟|小时|秒|天|日|周|月|年|岁)")
LIST_RE = re.compile(r"(?:^|" + chr(10) + r")\s*\d+\s*[\.、]")


def count_hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text, levels=None):
    t = text or ""
    lv = levels if levels is not None else LEVELS
    digits = len(re.findall(r"\d", t))
    vals = VALUE_RE.findall(t)
    return {
        "digits": digits,
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
    probeA = {k: 0 for k in LEVELS_A}
    probeB = {k: 0 for k in LEVELS_B}

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
            b = measure(prose, LEVELS_B)["levels"]
            for k, v in b.items():
                probeB[k] += v
            a = measure(prose, LEVELS_A)["levels"]
            for k, v in a.items():
                probeA[k] += v
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
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "script": "scripts/build_jizhen_text.py"},
               "counts": counts, "views": VIEWS, "levels": LEVELS,
               "chapters": [{"no": c["no"], "title": c["title"], "units": c["units"], "hanzi": c["hanzi"]} for c in chapters],
               "units": units,
               "triaxis": {"byPrimaryView": by_primary_view, "byPrimaryLevel": by_primary_level}},
              open(os.path.join(OUT, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    method["contentSheets"] = [c["title"] for c in chapters]
    method["axes"] = {"views": list(VIEWS), "levels": list(LEVELS),
                      "note": "三辨＝病因/病机/证候表现（第三项取监护仪与查体可数的指标）；四位面取**支持轴**（呼吸与气道/循环与神志/消化与代谢/血证与创伤），理由：系统轴实测 2575/1247/1706/676（max/min 3.8×，心脑单极），支持轴 416/411/538/697（1.7×），且与急救 ABCD 流程同构"}
    json.dump(method, open(os.path.join(OUT, "METHOD.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"counts": counts, "A_system": probeA, "B_support": probeB},
              open(os.path.join(OUT, "axis-probe.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"章 {counts['chapters']} · 单元 {counts['units']} · 汉字 {counts['hanzi']:,} · 数值命中 {counts['valueLike']}")
    print("三辨主轴:", by_primary_view)
    print("四位面主轴:", by_primary_level)
    print("A 系统轴:", probeA)
    print("B 支持轴:", probeB)
    for c in chapters:
        print(f"  第{c['no']}章 {c['title'][4:]:<24s} 单元 {c['units']:>3d} · 汉字 {c['hanzi']:>7,d}")


if __name__ == "__main__":
    main()
