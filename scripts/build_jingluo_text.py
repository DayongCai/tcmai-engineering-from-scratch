#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_jingluo_text.py —— 《经络腧穴学》工作簿 → 底本 + 单元层

母本：F:\\textbooks\\qhzy-经络腧穴学.xlsx（36 表：16 前置/平台 + 20 内容章）
  内容章表名形如 `04 手太阴肺经及其腧穴`；表内五列定位：章 / 节 / 小节 / 段 / 文字。
  段编号约定与前八门一致：段=k 是**段标题行**，段=1k 是它的**正文**。

产出：
  standards/jingluo/底本.json     章 → 节 → 小节 → 段（标题 + 正文）+ counts + sha256
  standards/jingluo/units.json    单元层：一小节一条，含 brief/prose/hanzi/measure/三判
  standards/jingluo/METHOD.json   前置与平台表的行数 + 口径说明
  standards/jingluo/axis-probe.json  三套四位面候选的全库实测（定口径留痕）

口径（经络腧穴学的三层）：
  1. 三辨＝**循行 / 定位 / 主治**：
     循行——经脉起止、属络、支脉、交接；
     定位——骨度分寸、体表标志、简便取穴、同身寸；
     主治——腧穴主治、配伍、操作（刺灸法、深度、角度、禁忌）。
     三辨取自教材自身的小节序（每经章固定写「经脉循行 → 主要病候 → 腧穴各论（定位·主治·操作）」），
     不另造分类。
  2. 四位面三条候选实测后取一条，其余留进 axis-probe.json：
     A 经脉分区：手三阴 / 手三阳 / 足三阳 / 足三阴（教材 04–15 章一一对应）
     B 特定穴类别：五输 / 原络 / 俞募 / 八脉交会（教材散见，不按章分）
     C 篇章职能：总论 / 分经 / 奇经奇穴 / 现代研究（与教材 01–03、04–17、18–20 同构）
  3. 数值不回避：骨度分寸、穴位数、刺灸深度与角度、留针时间，measure 保留 valueLike 计数。
"""

import hashlib
import json
import os
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-经络腧穴学.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "jingluo")

CONTENT_SHEET = re.compile(r"^(\d{2})\s+(.+)$")
SUB_TITLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)\s+(.+)$")
SEG_TITLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)\.(\d+)\s+(.+)$")
HANZI = re.compile(r"[\u4e00-\u9fff]")

VIEWS = {
    "循行": ["循行", "起于", "属", "络", "支脉", "别络", "交接", "出于", "入", "上行", "下行", "抵", "循",
             "经筋", "皮部", "经别", "流注", "走向", "表里"],
    "定位": ["定位", "骨度", "分寸", "寸", "体表标志", "简便取穴", "同身寸", "横指", "凹陷", "纹头",
             "髂前上棘", "脐", "两乳", "肩胛", "解剖", "取穴"],
    "主治": ["主治", "病候", "配穴", "配伍", "刺", "灸", "针刺", "艾灸", "操作", "深度", "角度", "留针",
             "泻法", "补法", "禁针", "禁灸", "直刺", "斜刺", "平刺", "温针灸"],
}

# A 经脉分区（教材 04–15 章）
LEVELS_A = {
    "手三阴": ["手太阴", "手厥阴", "手少阴", "肺经", "心包经", "心经"],
    "手三阳": ["手阳明", "手少阳", "手太阳", "大肠经", "三焦经", "小肠经"],
    "足三阳": ["足阳明", "足少阳", "足太阳", "胃经", "胆经", "膀胱经"],
    "足三阴": ["足太阴", "足厥阴", "足少阴", "脾经", "肝经", "肾经"],
}

# B 特定穴类别
LEVELS_B = {
    "五输穴": ["井穴", "荥穴", "输穴", "经穴", "合穴", "五输"],
    "原络穴": ["原穴", "络穴", "别络"],
    "俞募穴": ["背俞", "募穴", "俞穴"],
    "八脉交会": ["八脉交会", "交会穴", "八会穴", "郄穴"],
}

# C 篇章职能
LEVELS_C = {
    "总论": ["概述", "理论", "发展", "源流", "形成"],
    "分经": ["循行", "病候", "定位", "主治", "腧穴"],
    "奇经奇穴": ["奇经", "八脉", "督脉", "任脉", "冲脉", "带脉", "阳维", "阴维", "阳跷", "阴跷", "奇穴", "经外"],
    "现代研究": ["研究", "实验", "机制", "临床研究", "影像", "电生理", "指标"],
}


def count_hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text, levels=None):
    t = text or ""
    out = {"digits": len(re.findall(r"\d", t)), "valueLike": 0, "levels": {}}
    if levels:
        for k, kws in levels.items():
            out["levels"][k] = sum(t.count(w) for w in kws)
        out["valueLike"] = len(re.findall(r"\d+(?:\.\d+)?\s*(?:寸|cm|mm|°|度|分钟|次|壮|mm|厘米|指)", t))
    else:
        out["valueLike"] = len(re.findall(r"\d", t))
    return out


def tri(m):
    v = m["levels"] if "levels" in m else {}
    return {"view": {"primary": ""}, "level": {"primary": ""}, "levels": v}


def main():
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    sha = hashlib.sha256(open(SRC, "rb").read()).hexdigest()

    content = []
    for name in wb.sheetnames:
        mm = re.match(r"^(\d{2})\s+(.+)$", name.strip())
        if mm:
            content.append((name, int(mm.group(1)), mm.group(2)))

    chapters, units = [], []
    method = {"source": {"file": os.path.basename(SRC), "sha256": sha, "sheets": len(wb.sheetnames)},
              "contentSheets": [], "platformSheets": []}

    for sname, no, title in content:
        ws = wb[sname]
        secs, subs = [], []
        sec = None
        sub = None
        pending = None
        for row in ws.iter_rows(values_only=True):
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
                    mm2 = SEG_TITLE.match(text)
                    t = mm2.group(5) if mm2 else text
                    if sub is None:
                        sub = {"sub": (sec["no"] + ".1") if sec else f"{no}.1", "title": "", "segs": []}
                        subs.append(sub)
                        if sec:
                            sec["subs"].append(sub)
                    pending = {"seg": seg, "title": t, "body": ""}
                    sub["segs"].append(pending)
            else:
                if sub is not None and not sub["title"]:
                    mm2 = SUB_TITLE.match(text)
                    sub["title"] = (mm2.group(1) + "." + mm2.group(2) + "." + mm2.group(3) + " " + mm2.group(4)) if mm2 else text
                elif sec is not None and not sec["title"]:
                    sec["title"] = text

        n_units = hanzi_sum = 0
        for sub in subs:
            prose = "\n".join(s2["body"] for s2 in sub["segs"] if s2.get("body"))
            if not prose.strip():
                continue
            titles = [s2["title"] for s2 in sub["segs"]]
            mm3 = re.match(r"^(\d+\.\d+\.\d+)\s+(.+)$", sub["title"] or "")
            sub_id = mm3.group(1) if mm3 else sub["sub"]
            sub_name = mm3.group(2) if mm3 else (sub["title"] or f"{sub['sub']}")
            unit = {
                "chapter": str(no),
                "chapterTitle": f"第{no}章 {title}",
                "sec": next((s3["title"] or s3["no"] for s3 in secs if sub in s3["subs"]), ""),
                "sub": sub_id,
                "title": sub_name,
                "locator": f"教材·第{no}章·{sub_id}",
                "brief": "／".join(t for t in titles if t),
                "goals": [],
                "rawBody": prose,
                "body": prose,
                "prose": prose,
                "segments": [{"title": s2["title"], "hanzi": count_hanzi(s2.get("body", ""))} for s2 in sub["segs"]],
                "hanzi": count_hanzi(prose),
                "measure": {"digits": measure(prose)["digits"],
                            "valueLike": measure(prose)["valueLike"],
                            "views": measure(prose, VIEWS)["levels"],
                            "levels": measure(prose, LEVELS_A)["levels"]},
            }
            unit["tri"] = tri(unit["measure"])
            units.append(unit)
            n_units += 1
            hanzi_sum += unit["hanzi"]

        chapters.append({"no": str(no), "title": f"第{no}章 {title}", "units": n_units, "hanzi": hanzi_sum,
                         "secs": [{"no": s["no"], "title": s["title"], "subs": [x["sub"] for x in s["subs"]]} for s in secs]})

    counts = {"chapters": len(chapters), "units": len(units), "hanzi": sum(c["hanzi"] for c in chapters),
              "digits": sum(u["measure"]["digits"] for u in units),
              "valueLike": sum(u["measure"]["valueLike"] for u in units)}

    # 三辨与四位面实测（全库词频，不判主副，先看看分布）
    probe = {}
    for u in units:
        for gname, levels in (("view", VIEWS), ("A_part", LEVELS_A), ("B_special", LEVELS_B), ("C_function", LEVELS_C)):
            m = measure(u["prose"], levels)["levels"]
            bucket = probe.setdefault(gname, {k: 0 for k in levels})
            for k, v in m.items():
                bucket[k] += v
    ratios = {}
    for g, b in probe.items():
        vals = [v for v in b.values() if v]
        ratios[g] = round(max(b.values()) / min(vals), 1) if len(vals) > 1 and min(vals) else None

    os.makedirs(OUT, exist_ok=True)
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "sheets": len(wb.sheetnames)},
               "counts": counts, "chapters": chapters},
              open(os.path.join(OUT, "底本.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "script": "scripts/build_jingluo_text.py"},
               "counts": counts, "views": VIEWS, "levels": LEVELS_A,
               "probe": probe, "ratio": ratios,
               "chapters": [{"no": c["no"], "title": c["title"], "units": c["units"], "hanzi": c["hanzi"]} for c in chapters],
               "units": units},
              open(os.path.join(OUT, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    method["contentSheets"] = [c["title"] for c in chapters]
    method["platformSheets"] = [n for n in wb.sheetnames if not re.match(r"^(\d{2})\s+", n.strip())]
    method["axes"] = {"views": list(VIEWS), "levels": list(LEVELS_A),
                      "probe": probe, "ratio": ratios,
                      "note": "三辨＝循行/定位/主治（取自教材每经章固定小节序）；四位面候选三条见 probe，取比值最小者"}
    json.dump(method, open(os.path.join(OUT, "METHOD.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"counts": counts, "probe": probe, "ratio": ratios},
              open(os.path.join(OUT, "axis-probe.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    wb.close()

    print(f"章 {counts['chapters']} · 单元 {counts['units']} · 汉字 {counts['hanzi']:,} · 数值命中 {counts['valueLike']}")
    print("词频分布:", json.dumps(probe, ensure_ascii=False))
    print("比值:", json.dumps(ratios, ensure_ascii=False))


if __name__ == "__main__":
    main()
