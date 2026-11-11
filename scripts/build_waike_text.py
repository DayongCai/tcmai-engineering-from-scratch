#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_waike_text.py —— 中医外科学工作簿 → 底本 + 单元层

母本：F:\\textbooks\\qhzy-中医外科学.xlsx（30 表：17 前置/平台 + 13 内容章）
  内容章表名形如 `05 疮疡`；表内四列定位：章 / 节 / 小节 / 段，第五列才是文字。
  段编号约定：段=k 是**段标题行**（如「5.1.1.1 概念与源流」），段=1k 是它的**正文**。
  —— 与病理学同一个坑：标题只写在段列的兄弟行里，不在同一行的文字里。

产出：
  standards/waike/底本.json    章 → 节 → 小节 → 段（标题 + 正文）+ counts + sha256
  standards/waike/units.json   单元层：一小节一条，含 brief/goals/prose/hanzi/measure/三判
  standards/waike/METHOD.json  前置与平台表的行数（17 张）

口径（外科与病理学的差别，写在这里以免后人误套）：
  1. 三视角换成外科自己的三辨：**病因 / 病机 / 局部表现**（形、色、脓、痛、痒）；
     病理学的「形态」在外科要落到可观察的局部征象上，否则这一轴会虚。
  2. 四层级换成**皮肤 / 筋肉 / 脏腑 / 全身**：外科讲传变说的是「毒邪由浅入深」，
     用细胞-组织-器官-系统那套会与教材语言错位。
  3. 数值不回避：外科教材本身写直径、度数、天数（「3 厘米左右」「7～10 天」），
     所以 measure 里保留 digits / valueLike 计数，供门去断言「正文不改写教材数值」。
"""

import hashlib
import json
import os
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-中医外科学.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "waike")

CONTENT_SHEET = re.compile(r"^(\d{2})\s+(.+)$")
SUB_TITLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)\s+(.+)$")
SEG_TITLE = re.compile(r"^(\d+)\.(\d+)\.(\d+)\.(\d+)\s+(.+)$")
HANZI = re.compile(r"[\u4e00-\u9fff]")

# 三视角（外科三辨：谁在致病 / 经由什么机制 / 局部留下什么可观察征象）
VIEWS = {
    # 只收多字词：单字（风/热/毒/虚）在外科教材里到处出现，会把这一轴拉成噪声
    "病因": ["病因", "外感", "内伤", "六淫", "风热", "风湿", "湿热", "火毒", "热毒",
             "暑湿", "寒湿", "情志", "饮食", "房劳", "外伤", "禀赋", "体虚", "素体",
             "劳倦", "感染", "毒邪外侵"],
    "病机": ["病机", "气血凝滞", "经络", "脏腑", "凝滞", "壅滞", "郁滞", "传变", "内陷",
             "走黄", "伤筋", "蚀骨", "正虚", "毒邪", "化脓", "成脓", "托毒", "透托",
             "气血两虚", "痰瘀"],
    "局部表现": ["红肿", "热痛", "肿势", "根脚", "成脓", "脓液", "脓水", "腐肉", "溃疡",
                 "疮面", "色泽", "疼痛", "瘙痒", "作痒", "麻木", "结节", "肿块", "渗液",
                 "肉芽", "边界", "范围", "敛口", "收口"],
}
# 四层级（毒邪由浅入深的四个位面）
LEVELS = {
    "皮肤": ["皮肤", "肌肤", "腠理", "表皮", "毛囊", "皮色", "皮疹", "皮下"],
    "筋肉": ["肌肉", "筋肉", "筋膜", "肌腱", "筋骨", "筋脉", "关节", "骨膜"],
    "脏腑": ["脏腑", "乳房", "胃肠", "膀胱", "前列腺", "冲任", "胞宫", "肝郁", "脾虚",
             "肛管", "直肠", "肾气"],
    "全身": ["全身", "发热", "寒战", "神昏", "走黄", "内陷", "毒血症", "整体", "传变",
             "正气", "气血两燔"],
}

VALUE_RE = re.compile(
    r"\d+(?:\.\d+)?\s*(?:℃|°C|%|cm|mm|厘米|毫米|天|日|周|月|年|岁|小时|次|度|分|cm2|cm²)")
LIST_RE = re.compile(r"(?:^|" + chr(10) + r")\s*\d+\s*[\.、]")
CODE_RE = re.compile(r"\b(?:WK|BZ|FZ|T)-?\d{1,3}\b")


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
        "codes": len(CODE_RE.findall(t)),
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

    for name, m in other_sheets:
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
        subs = []               # 本章小节（单元）
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
                # 节标题一般与 sec 同一行落在「内容」列，或下一行；此处先记编号
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
        "source": {"file": os.path.basename(SRC), "sha256": sha, "script": "scripts/build_waike_text.py"},
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
    json.dump(method, open(os.path.join(OUT, "METHOD.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    print(f"章 {counts['chapters']} · 单元 {counts['units']} · 汉字 {counts['hanzi']:,}")
    print(f"数值类命中 {counts['valueLike']} · 数字字符 {counts['digits']}")
    print("三视角主轴:", by_primary_view)
    print("四层级主轴:", by_primary_level)
    for c in chapters:
        print(f"  第{c['no']}章 {c['title'][4:]:<22s} 单元 {c['units']:>3d} · 汉字 {c['hanzi']:>7,d}")


if __name__ == "__main__":
    main()
