#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_jingshen_text.py —— 中医精神病学工作簿 → 底本 + 单元层

母本：F:\\textbooks\\qhzy-中医精神病学.xlsx（29 表：17 前置/平台 + 12 内容章）
  内容章表名形如 `06 癫证与狂证`；表内五列定位：章 / 节 / 小节 / 段 / 文字。
  段编号约定与前九门一致：段=k 是**段标题行**，段=1k 是它的**正文**。

产出：
  standards/jingshen/底本.json     章 → 节 → 小节 → 段 + counts + sha256
  standards/jingshen/units.json    单元层：一小节一条，含 brief/prose/hanzi/measure/三判
  standards/jingshen/METHOD.json   前置与平台表行数 + 口径说明
  standards/jingshen/axis-probe.json  四套四位面候选的全库实测（定口径留痕）

口径（精神病学与内科/老年病学的分工）：
  精神病学的对象是「神志与情志」——教材的判据不靠影像与化验，靠**精神检查**：
  神志、意识、言语、行为、情绪、幻觉、妄想、自知力、睡眠、纳食。
  1. 三辨＝病因 / 病机 / 证候表现，第三项落在上述精神检查可观察项。
  2. 四位面有四条候选，实测后取一条，其余留 axis-probe.json：
     A 病类四分：癫 / 狂 / 郁 / 痫（中医神志病的经典四分，对应教材 06–09 章）
     B 症状群四分：神志意识 / 情感情绪 / 行为言语 / 认知睡眠（现代症状学）
     C 脏腑四分：心 / 肝 / 脾 / 肾（教材 02–05 章的辨证落点）
     D 病程四分：急性 / 亚急性 / 慢性 / 缓解（病程与转归）
  3. 数值不回避：教材写疗程、评分、剂量、频次，measure 保留 valueLike 计数。
"""

import hashlib
import json
import os
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-中医精神病学.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "jingshen")

CONTENT_SHEET = re.compile(r"^(\d{2})\s+(.+)$")
SUB_TITLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)\s+(.+)$")
SEG_TITLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)\.(\d+)\s+(.+)$")
HANZI = re.compile(r"[\u4e00-\u9fff]")

VIEWS = {
    "病因": ["病因", "情志", "七情", "痰", "火", "气", "瘀", "先天", "禀赋", "外伤",
             "中毒", "药", "酒", "惊恐", "思虑", "恼怒", "久病"],
    "病机": ["病机", "痰迷", "痰火", "气郁", "肝郁", "心脾", "阴阳", "虚实", "神明",
             "蒙蔽", "上扰", "扰神", "气血", "脏躁", "传变", "瘀阻", "亏虚"],
    "证候表现": ["神志", "意识", "谵妄", "昏", "言语", "言语错乱", "行为", "情绪", "情感",
                 "抑郁", "焦虑", "烦躁", "易怒", "幻觉", "妄想", "自知力", "睡眠", "失眠",
                 "纳食", "舌", "脉", "表情", "目光"],
}

# A 病类四分（教材 06–09 章）
LEVELS_A = {
    "癫": ["癫", "癫证", "癫病", "痴呆", "淡漠", "独语", "自语", "精神分裂"],
    "狂": ["狂", "狂证", "狂病", "躁狂", "烦躁", "骂詈", "毁物", "打人", "兴奋"],
    "郁": ["郁", "郁病", "抑郁", "情绪低落", "焦虑", "忧思", "悲伤", "兴趣"],
    "痫": ["痫", "痫证", "抽搐", "发作", "昏仆", "两目上视", "口吐涎沫"],
}

# B 症状群四分
LEVELS_B = {
    "神志意识": ["神志", "意识", "谵妄", "昏", "昏迷", "恍惚", "定向", "错乱"],
    "情感情绪": ["情绪", "情感", "抑郁", "焦虑", "烦躁", "易怒", "悲伤", "恐惧", "淡漠"],
    "行为言语": ["行为", "言语", "动作", "毁物", "打人", "自伤", "自杀", "独语", "骂詈"],
    "认知睡眠": ["认知", "记忆", "注意", "思维", "幻觉", "妄想", "自知力", "睡眠", "失眠"],
}

# C 脏腑四分
LEVELS_C = {
    "心": ["心", "心神", "心血", "心火", "心脾", "神明", "神志"],
    "肝": ["肝", "肝郁", "肝火", "肝阳", "肝气", "胆"],
    "脾": ["脾", "脾胃", "痰湿", "气血生化", "纳"],
    "肾": ["肾", "肾阴", "肾阳", "精", "髓", "脑"],
}

# D 病程四分
LEVELS_D = {
    "急性": ["急性", "突然", "骤", "首发", "急起"],
    "亚急性": ["亚急性", "数周", "逐渐加重", "反复"],
    "慢性": ["慢性", "迁延", "多年", "反复发作", "久病"],
    "缓解": ["缓解", "痊愈", "恢复期", "稳定期", "巩固"],
}

LEVELS = LEVELS_B

VALUE_RE = re.compile(
    r"\d+(?:\.\d+)?\s*(?:°|度|cm|mm|kg|g|mg|ml|mL|%|岁|天|日|周|月|年|小时|分钟|次|分|mg/d)")
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
              (("A_disease", LEVELS_A), ("B_symptom", LEVELS_B),
               ("C_organ", LEVELS_C), ("D_course", LEVELS_D))}

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
            for key, lv in (("A_disease", LEVELS_A), ("B_symptom", LEVELS_B),
                            ("C_organ", LEVELS_C), ("D_course", LEVELS_D)):
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
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "script": "scripts/build_jingshen_text.py"},
               "counts": counts, "views": VIEWS, "levels": LEVELS,
               "chapters": [{"no": c["no"], "title": c["title"], "units": c["units"], "hanzi": c["hanzi"]} for c in chapters],
               "units": units,
               "triaxis": {"byPrimaryView": by_primary_view, "byPrimaryLevel": by_primary_level}},
              open(os.path.join(OUT, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    method["contentSheets"] = [c["title"] for c in chapters]
    method["axes"] = {"views": list(VIEWS), "levels": list(LEVELS),
                      "note": "三辨＝病因/病机/证候表现（第三项取精神检查可观察项：神志、意识、言语、行为、情绪、幻觉、妄想、自知力、睡眠、纳食），按单元首位 病因 40 / 证候表现 8——精神病学讲的是「什么在致病」；四位面取**症状群四分**（神志意识/情感情绪/行为言语/认知睡眠），实测 634/651/470/547（max/min 1.4×），即精神检查的四个域。弃用：病类四分 622/691/1381/410（3.4×，郁单极占 27/48 单元）、脏腑四分 2000/684/492/2427（4.9×，心肾单极）、病程四分 117/85/111/84（计数仅 397，覆盖过稀）。四套全留 axis-probe.json"}
    json.dump(method, open(os.path.join(OUT, "METHOD.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"counts": counts, **probes},
              open(os.path.join(OUT, "axis-probe.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    print(f"章 {counts['chapters']} · 单元 {counts['units']} · 汉字 {counts['hanzi']:,} · 数值命中 {counts['valueLike']}")
    print("三辨主轴:", by_primary_view)
    print("四位面主轴:", by_primary_level)
    for k, v in probes.items():
        print(f"  {k}: {v}")
    for c in chapters:
        print(f"  第{c['no']}章 {c['title'][4:]:<26s} 单元 {c['units']:>3d} · 汉字 {c['hanzi']:>7,d}")


if __name__ == "__main__":
    main()
