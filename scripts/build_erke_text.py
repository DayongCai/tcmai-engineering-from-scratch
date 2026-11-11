#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_erke_text.py —— 中医儿科学工作簿 → 底本 + 单元层

母本：F:\\textbooks\\qhzy-中医儿科学.xlsx（31 表：17 前置/平台 + 14 内容章）
  内容章表名形如 `06 肺系疾病`；表内五列定位：章 / 节 / 小节 / 段 / 文字。
  段编号约定与外科学、病理学一致：段=k 是**段标题行**，段=1k 是它的**正文**。

产出：
  standards/erke/底本.json    章 → 节 → 小节 → 段（标题 + 正文）+ counts + sha256
  standards/erke/units.json   单元层：一小节一条，含 brief/goals/prose/hanzi/measure/三判
  standards/erke/METHOD.json  前置与平台表的行数 + 口径说明

口径（儿科与外科/病理学的差别，写在这里以免后人误套）：
  1. 三辨第三项改叫**证候表现**，不叫「局部表现」：儿科四诊以望诊为主，
     指纹、舌苔、二便、精神状态都是全身性观察，叫「局部」会把这一轴限死在皮损上。
     实测（229,503 汉字）：证候表现 2,106 > 病因 1,346 > 病机 845 —— 三轴都够重，不虚。
  2. 四位面用**肺系 / 脾胃系 / 心肝系 / 肾系**，因为这就是儿科教材自己的编排与辨证纲领
     （肺常不足、脾常不足、肾常虚、心肝常有余 —— 「三不足两有余」）。
     不用卫气营血：实测卫分 35 / 气分 137 / 营分 76 / 血分 111，只在传染病一章发热，
     其余 13 章近乎全 0，做四层位面会得到一张大部分是空格的表；
     也不用「皮肤-筋肉-脏腑-全身」：脏腑一词独占 4,200 次，会把这一轴吃成单极。
     温病传变层（卫气营血）留在第 10 章按小节叙述，不进入四面统计。
  3. 数值不回避：儿科教材写年龄、体重、剂量、体温、病程（「6 个月～3 岁」「38.5℃」），
     measure 保留 digits / valueLike 计数，供门去断言「正文不改写教材数值」。
"""

import hashlib
import json
import os
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-中医儿科学.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "erke")

CONTENT_SHEET = re.compile(r"^(\d{2})\s+(.+)$")
SUB_TITLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)\s+(.+)$")
SEG_TITLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)\.(\d+)\s+(.+)$")
HANZI = re.compile(r"[\u4e00-\u9fff]")

# 三辨（谁在致病 / 经由什么机制 / 病人身上看见什么）
VIEWS = {
    # 只收多字词：单字（风/热/虚/痰）在儿科教材里到处出现，会把这一轴拉成噪声
    "病因": ["病因", "外感", "六淫", "风邪", "寒邪", "暑邪", "湿邪", "燥邪", "火邪",
             "疫毒", "疠气", "时邪", "胎毒", "胎禀", "禀赋", "先天", "喂养", "乳食",
             "饮食", "惊恐", "虫积", "感染", "外伤"],
    "病机": ["病机", "稚阴稚阳", "纯阳", "脏腑娇嫩", "形气未充", "传变", "易虚易实",
             "易寒易热", "肺气", "脾虚", "肾虚", "心火", "肝风", "食积", "痰湿",
             "气滞", "脾胃虚弱", "肺脾气虚", "气阴两虚"],
    "证候表现": ["发热", "咳嗽", "气喘", "喉鸣", "泄泻", "呕吐", "皮疹", "疱疹", "舌质",
                 "舌苔", "指纹", "神志", "抽搐", "惊厥", "面色", "纳差", "汗出",
                 "小便", "大便", "脉象", "烦躁", "嗜睡"],
}
# 四位面（教材自己的五脏系编排：肺常不足 / 脾常不足 / 肾常虚 / 心肝常有余）
LEVELS = {
    "肺系": ["肺", "咳嗽", "喘", "鼻", "咽喉", "感冒", "肺炎", "皮毛"],
    "脾胃系": ["脾", "胃", "乳食", "泄泻", "疳", "积滞", "呕", "腹胀", "运化"],
    "心肝系": ["心", "肝", "惊", "抽搐", "神昏", "癫痫", "多动", "夜啼", "肝风"],
    "肾系": ["肾", "水肿", "遗尿", "尿", "阴囊", "精", "膀胱", "骨"],
}

VALUE_RE = re.compile(
    r"\d+(?:\.\d+)?\s*(?:℃|°C|%|cm|mm|kg|g|ml|厘米|毫米|千克|克|毫升|天|日|周|月|年|岁|小时|次|度|分)")
LIST_RE = re.compile(r"(?:^|" + chr(10) + r")\s*\d+\s*[\\.、]")


def count_hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text):
    t = text or ""
    digits = len(re.findall(r"\d", t))
    vals = VALUE_RE.findall(t)
    views = {k: sum(t.count(w) for w in ws) for k, ws in VIEWS.items()}
    levels = {k: sum(t.count(w) for w in ws) for k, ws in LEVELS.items()}
    return {
        "digits": digits,
        "valueLike": len(vals),
        "valueSamples": vals[:6],
        "listItems": len(LIST_RE.findall(t)),
        "views": views,
        "levels": levels,
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

    for name, _m in other_sheets:
        ws = wb[name]
        rows = 0
        for _ in ws.iter_rows(values_only=True):
            rows += 1
        method["prefaceSheets"].append({"sheet": name, "rows": rows})

    for name, m in content_sheets:
        no, title = m.group(1), m.group(2).strip()
        ws = wb[name]
        sec = sub = None
        pending = None          # 当前段标题
        subs = []
        secs = []
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
                    body = text
                    if pending is not None and sub is not None:
                        pending["body"] = body
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
            bodies = [s2["body"] for s2 in sub["segs"] if s2.get("body")]
            prose = "\n".join(bodies)
            if not prose.strip():
                continue
            titles = [s2["title"] for s2 in sub["segs"]]
            head = sub["title"] or ""
            unit = {
                "chapter": str(int(no)),
                "chapterTitle": f"第{int(no)}章 {title}",
                "sec": next((s3["title"] or s3["no"] for s3 in secs if sub in s3["subs"]), ""),
                "sub": sub["sub"],
                "title": head or f"{sub['sub']}",
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
    by_primary_view = {}
    by_primary_level = {}
    for u in units:
        for key, bucket in (("view", by_primary_view), ("level", by_primary_level)):
            p = u["tri"][key]["primary"]
            if p:
                bucket[p] = bucket.get(p, 0) + 1

    os.makedirs(OUT, exist_ok=True)
    di = {
        "source": {"file": os.path.basename(SRC), "sha256": sha, "sheets": len(wb.sheetnames)},
        "counts": counts,
        "chapters": chapters,
    }
    json.dump(di, open(os.path.join(OUT, "底本.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    ui = {
        "source": {"file": os.path.basename(SRC), "sha256": sha, "script": "scripts/build_erke_text.py"},
        "counts": counts,
        "views": VIEWS,
        "levels": LEVELS,
        "chapters": [{"no": c["no"], "title": c["title"], "units": c["units"], "hanzi": c["hanzi"]} for c in chapters],
        "units": units,
        "triaxis": {"byPrimaryView": by_primary_view, "byPrimaryLevel": by_primary_level},
    }
    json.dump(ui, open(os.path.join(OUT, "units.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    method["contentSheets"] = [c["title"] for c in chapters]
    method["axes"] = {"views": list(VIEWS), "levels": list(LEVELS),
                      "note": "三辨＝病因/病机/证候表现；四位面＝肺系/脾胃系/心肝系/肾系（教材编排纲）"}
    json.dump(method, open(os.path.join(OUT, "METHOD.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    print(f"章 {counts['chapters']} · 单元 {counts['units']} · 汉字 {counts['hanzi']:,}")
    print(f"数值类命中 {counts['valueLike']} · 数字字符 {counts['digits']}")
    print("三辨主轴:", by_primary_view)
    print("四位面主轴:", by_primary_level)
    for c in chapters:
        print(f"  第{c['no']}章 {c['title'][4:]:<22s} 单元 {c['units']:>3d} · 汉字 {c['hanzi']:>7,d}")


if __name__ == "__main__":
    main()
