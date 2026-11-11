#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_fuke_text.py —— 中医妇科学工作簿 → 底本 + 单元层

母本：F:\textbooks\qhzy-中医妇科学.xlsx（30 表：17 前置/平台 + 13 内容章）
  内容章表名形如 `07 月经病·期量色质异常`；表内五列定位：章 / 节 / 小节 / 段 / 文字。
  段编号约定与前五门（病理学/中药学/外科学/儿科学）一致：段=k 是**段标题行**，段=1k 是它的**正文**。

产出：
  standards/fuke/底本.json    章 → 节 → 小节 → 段（标题 + 正文）+ counts + sha256
  standards/fuke/units.json   单元层：一小节一条，含 brief/goals/prose/hanzi/measure/三判
  standards/fuke/METHOD.json  前置与平台表的行数 + 口径说明

口径（妇科与前五门的差别，写在这里以免后人误套）：
  1. 三辨沿用**病因 / 病机 / 证候表现**，但第三项的落点不同：妇科看的是「期、量、色、质」
     （经期、经量、经色、经质、带下的量色质味）。实测（240,348 汉字）：
     病机 2,683 > 证候表现 2,104 > 病因 1,189 —— **病机居首**，因为妇科的核心是
     肾—天癸—冲任—胞宫的失调，不是外邪。
  2. 四位面用**肾 / 肝脾 / 冲任 / 胞宫**，即教材第 02 章的生理轴（肾—天癸—冲任—胞宫）。
     天癸归入「肾」（肾精所化；单列会出现「多数章近乎 0」的空轴：实测天癸仅 102 次）；
     肝脾合为一轴，因为妇科里二者分工固定（肝主疏泄、脾主生血与统摄）；单列会把 984 次「肝」
     与 848 次「脾」摊成两个互相抵消的轴。实测四轴：肾 699 / 肝脾 400 / 冲任 591 / 胞宫 478，
     13 章每章四轴皆非零，首位分布为 肾 7 章、肝脾 3 章、冲任 1 章、胞宫 1 章（方法章）。
     不用「气血-脏腑-经络-全身」：脏腑一词独占 4,318 次，会吃成单极。
  3. 数值不回避：教材写月经周期、经量、孕周、产程、出血量，measure 保留 digits / valueLike 计数。
"""

import hashlib
import json
import os
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-中医妇科学.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "fuke")

CONTENT_SHEET = re.compile(r"^(\d{2})\s+(.+)$")
SUB_TITLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)\s+(.+)$")
SEG_TITLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)\.(\d+)\s+(.+)$")
HANZI = re.compile(r"[\u4e00-\u9fff]")

# 三辨（谁在致病 / 经由什么机制 / 病人身上看见什么）
VIEWS = {
    # 只收多字词：单字（寒/热/虚/瘀）在妇科教材里到处出现，会把这一轴拉成噪声
    "病因": ["病因", "外感", "六淫", "寒邪", "热邪", "湿邪", "风邪", "情志", "所愿不遂",
             "饮食", "劳倦", "房劳", "多产", "房事", "手术", "金刃", "外伤", "痰湿",
             "先天", "禀赋", "环境", "药食"],
    "病机": ["病机", "肾虚", "肝郁", "脾虚", "血瘀", "血热", "血寒", "气滞", "气虚",
             "冲任", "胞宫", "天癸", "气血失调", "阴阳失调", "虚实", "痰湿阻滞"],
    "证候表现": ["经量", "经色", "经质", "经期", "带下", "色质", "气味", "腹痛", "腰酸",
                 "乳房胀", "舌质", "舌苔", "脉象", "面色", "头晕", "烦躁", "小腹"],
}
# 四位面（教材第 02 章的生理轴：肾—天癸—冲任—胞宫；肝脾为疏泄与生化之枢）
LEVELS = {
    "肾": ["肾气", "肾阴", "肾阳", "肾精", "肾虚", "肾水", "天癸"],
    "肝脾": ["肝郁", "肝气", "肝血", "肝火", "肝阴", "肝经", "脾虚", "脾阳", "脾运", "肝脾"],
    "冲任": ["冲任", "冲脉", "任脉", "督脉", "带脉"],
    "胞宫": ["胞宫", "子宫", "血室"],
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
        "source": {"file": os.path.basename(SRC), "sha256": sha, "script": "scripts/build_fuke_text.py"},
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
                      "note": "三辨＝病因/病机/证候表现；四位面＝肾/肝脾/冲任/胞宫（教材第 02 章生理轴，天癸归肾）"}
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
