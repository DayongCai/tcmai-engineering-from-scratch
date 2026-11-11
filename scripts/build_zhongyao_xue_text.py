#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_zhongyao_xue_text.py —— 《中药学》工作簿 → 底本 + 单元层 + 药物库

母本：F:\\textbooks\\qhzy-中药学.xlsx（43 表 = 13 前置/平台 + 30 内容章）
  内容表名 `9解表药`…`30临床中药应用`；五列：章 / 节 / 小节 / 段 / 内容。
  **章号只写在首行标题「第9章　解表药」里**，节与小节是裸数字，药名是小节标题。
  段标题形如「麻黄·来源与性味归经」「麻黄·功效与主治」——按「·」可拆出字段。

产出（standards/zhongyao-xue/）：
  底本.json     章 → 节 → 小节（=一味药）→ 段 + counts + sha256
  units.json    单元层：一小节一条（即一味药），带三辨/四位面词频与数值计数
  药物库.json   drugs[]：药名 / 性味 / 归经 / 功效 / 主治 / 用法用量 / 使用注意 / locator
  METHOD.json / axis-probe.json

口径：
  三辨＝**性能 / 功效 / 应用**
    性能——四气、五味、归经、升降浮沉、毒性（「性温，味辛、微苦，归肺、膀胱经」）；
    功效——四字或两字词组（发汗解表、宣肺平喘、利水消肿）；
    应用——主治病证、配伍、使用注意、用法用量。
  四位面三条候选，实测后取一条：
    A 四气：寒 / 凉 / 温 / 热（平归入相邻或单列，按实测定）
    B 归经脏腑：肺系 / 脾胃 / 心肝 / 肾与膀胱
    C 功效大类：解表清热 / 泻下祛湿 / 理气活血 / 补虚收涩
"""
import hashlib
import json
import os
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-中药学.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "zhongyao-xue")

HANZI = re.compile(r"[\u4e00-\u9fff]")

VIEWS = {
    "性能": ["性寒", "性热", "性温", "性凉", "性平", "味辛", "味甘", "味苦", "味酸", "味咸", "归", "经",
             "升降", "浮沉", "有毒", "无毒", "小毒", "性味", "归经"],
    "功效": ["功效", "功能", "发汗", "解表", "清热", "解毒", "泻下", "祛风", "化湿", "利水", "温里", "理气",
             "消食", "止血", "活血", "化瘀", "化痰", "止咳", "安神", "平肝", "开窍", "补", "收涩"],
    "应用": ["主治", "用于", "配伍", "用量", "用法", "注意", "忌", "慎", "煎服", "入丸散", "外用", "孕妇"],
}

LEVELS_A = {
    "寒凉": ["性寒", "性凉", "寒", "凉"],
    "温热": ["性温", "性热", "温", "热"],
    "平": ["性平", "平性"],
    "有毒": ["有毒", "小毒", "大毒", "毒性"],
}

LEVELS_B = {
    "肺系": ["归肺", "肺经", "肺、", "肺胃", "肺脾"],
    "脾胃": ["归脾", "归胃", "脾经", "胃经", "脾胃"],
    "心肝": ["归心", "归肝", "心经", "肝经", "心肝"],
    "肾与膀胱": ["归肾", "肾经", "膀胱经", "肾、", "肾与"],
}

LEVELS_C = {
    "解表清热": ["解表", "发散风寒", "疏散风热", "清热", "泻火", "解毒", "凉血"],
    "泻下祛湿": ["泻下", "润下", "峻下", "祛风湿", "化湿", "利水", "渗湿", "利尿"],
    "理气活血": ["理气", "行气", "消食", "活血", "化瘀", "止血", "化痰", "止咳", "平喘"],
    "补虚收涩": ["补气", "补血", "补阴", "补阳", "补益", "收涩", "固涩", "安神", "开窍"],
}


def hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text, levels=None):
    t = text or ""
    out = {"digits": len(re.findall(r"\d", t)), "valueLike": 0, "levels": {}}
    if levels:
        for k, kws in levels.items():
            out["levels"][k] = sum(t.count(w) for w in kws)
    out["valueLike"] = len(re.findall(r"\d+(?:\.\d+)?\s*(?:g|克|钱|两|ml|毫升|片|枚|次|日|天)", t))
    return out


def main():
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    sha = hashlib.sha256(open(SRC, "rb").read()).hexdigest()

    sheets = []
    for name in wb.sheetnames:
        mm = re.match(r"^(\d{1,2})\s*(.+)$", name.strip())
        if mm and not name.startswith("0"):
            sheets.append((name, int(mm.group(1)), mm.group(2)))

    chapters, units, drugs = [], [], []
    for sname, no, stitle in sheets:
        ws = wb[sname]
        title = f"第{no}章 {stitle}"
        secs, subs = [], []
        sec = sub = pending = None
        for row in ws.iter_rows(values_only=True):
            _ch, s_val, sub_val, seg, text = (list(row) + [None] * 5)[:5]
            text = (text or "").strip() if isinstance(text, str) else (str(text).strip() if text else "")
            s_val = (str(s_val).strip() if s_val not in (None, "·", "章", "节") else "")
            sub_val = (str(sub_val).strip() if sub_val not in (None, "·", "小节") else "")
            seg = (str(seg).strip() if seg not in (None, "·", "段") else "")

            if text.startswith("第") and "章" in text[:4]:
                title = text.replace("\u3000", " ").strip()
                continue
            if s_val:
                sec = {"no": s_val, "title": "", "subs": []}
                secs.append(sec)
                sub = pending = None
            if sub_val:
                sub = {"sub": sub_val, "title": "", "segs": []}
                subs.append(sub)
                if sec is None:
                    sec = {"no": f"{no}.{sub_val}", "title": "", "subs": []}
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
                    elif sub is not None and sub["segs"]:
                        # 本书一节正文常分多行（段=11/12/13），后续行续接上一段，不能丢
                        sub["segs"][-1]["body"] = (sub["segs"][-1]["body"] + text).strip()
                else:
                    if sub is None:
                        sub = {"sub": "1", "title": "", "segs": []}
                        subs.append(sub)
                        if sec:
                            sec["subs"].append(sub)
                    pending = {"seg": seg, "title": text, "body": ""}
                    sub["segs"].append(pending)
            else:
                if sub is not None and not sub["title"]:
                    sub["title"] = text
                elif sec is not None and not sec["title"]:
                    sec["title"] = text

        n_units = hs = 0
        for sb in subs:
            prose = "\n".join(s2["body"] for s2 in sb["segs"] if s2.get("body"))
            if not prose.strip():
                continue
            name = (sb["title"] or "").strip()
            sub_id = f"{no}.{sb['sub']}"
            fields = {}
            for s2 in sb["segs"]:
                head = (s2["title"] or "")
                key = head.split("·")[-1].strip() if "·" in head else head.strip()
                if key and s2.get("body"):
                    fields.setdefault(key, s2["body"])
            views = {k: sum(prose.count(w) for w in ws_) for k, ws_ in VIEWS.items()}
            lev = {k: sum(prose.count(w) for w in ws_) for k, ws_ in LEVELS_A.items()}
            unit = {
                "chapter": str(no), "chapterTitle": title,
                "sec": next((s3["title"] or s3["no"] for s3 in secs if sb in s3["subs"]), ""),
                "sub": sub_id, "title": name or sub_id, "locator": f"教材·第{no}章·{sub_id}",
                "brief": "／".join(t for t in (s2["title"] for s2 in sb["segs"]) if t),
                "goals": [], "rawBody": prose, "body": prose, "prose": prose,
                "segments": [{"title": s2["title"], "hanzi": hanzi(s2.get("body", ""))} for s2 in sb["segs"]],
                "hanzi": hanzi(prose),
                "measure": {"digits": measure(prose)["digits"], "valueLike": measure(prose)["valueLike"],
                            "views": views, "levels": lev},
            }
            units.append(unit)
            n_units += 1
            hs += unit["hanzi"]

            # 性味归经的三种教材写法：①「性温，味辛，归肺经」②「甘，微寒；归心经」（药典式，无「性/味」前缀）
            # ③ 只在正文叙述里出现。统一三种都要抓，抓不到就留空并登记缺口，不补写。
            pool = "\n".join([prose] + list(fields.values()))
            sx = ""
            for pat in (r"性[寒热温凉平][^。；]{0,40}?归[^。；]{2,20}?经",
                        r"[，、；\s]?(?:甘|辛|苦|酸|咸|淡|涩|微苦|微甘|微辛)[^。；]{0,40}?(?:寒|热|温|凉|平)[^。；]{0,20}?归[^。；]{2,20}?经"):
                m = re.search(pat, pool)
                if m:
                    sx = m.group(0).lstrip("，、； ")
                    break
            if not sx:
                m = re.search(r"性[寒热温凉平][^。；]{0,30}", pool)
                sx = m.group(0) if m else ""
            gm = re.search(r"归([^。；]{2,24}?)经", sx or pool[:400])
            gy = gm.group(1) if gm else ""
            drugs.append({
                "药名": name, "章": no, "章名": stitle, "小节": sub_id,
                "性味归经": sx, "归经": gy,
                "气": next((q for q in ("寒", "热", "温", "凉", "平") if q in sx), ""),
                "味": "／".join(w for w in ("辛", "甘", "苦", "酸", "咸", "淡", "涩") if w in sx),
                "功效": fields.get("功效与主治", "")[:120],
                "用法用量": next((v for k, v in fields.items() if "用法" in k or "用量" in k), "")[:120],
                "使用注意": next((v for k, v in fields.items() if "注意" in k or "禁忌" in k), "")[:120],
                "hanzi": unit["hanzi"], "locator": unit["locator"],
                "字段": list(fields),
            })

        chapters.append({"no": str(no), "title": title, "units": n_units, "hanzi": hs,
                         "secs": [{"no": s["no"], "title": s["title"], "subs": [x["sub"] for x in s["subs"]]} for s in secs]})

    counts = {"chapters": len(chapters), "units": len(units), "drugs": len(drugs),
              "hanzi": sum(c["hanzi"] for c in chapters),
              "digits": sum(u["measure"]["digits"] for u in units),
              "valueLike": sum(u["measure"]["valueLike"] for u in units)}

    probe = {}
    for u in units:
        for g, lv in (("view", VIEWS), ("A_qi", LEVELS_A), ("B_organ", LEVELS_B), ("C_effect", LEVELS_C)):
            m = measure(u["prose"], lv)["levels"]
            bucket = probe.setdefault(g, {k: 0 for k in lv})
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
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "script": "scripts/build_zhongyao_xue_text.py"},
               "counts": counts, "views": VIEWS, "levels": LEVELS_A, "probe": probe, "ratio": ratios,
               "chapters": [{"no": c["no"], "title": c["title"], "units": c["units"], "hanzi": c["hanzi"]} for c in chapters],
               "units": units},
              open(os.path.join(OUT, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"counts": {"drugs": len(drugs)}, "drugs": drugs},
              open(os.path.join(OUT, "药物库.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "sheets": len(wb.sheetnames)},
               "contentSheets": [c["title"] for c in chapters],
               "axes": {"views": list(VIEWS), "levels": list(LEVELS_A), "probe": probe, "ratio": ratios,
                        "note": "三辨＝性能/功效/应用；四位面取三候选比值最小且与教材章序同构者"}},
              open(os.path.join(OUT, "METHOD.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"counts": counts, "probe": probe, "ratio": ratios},
              open(os.path.join(OUT, "axis-probe.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    wb.close()
    print(f"章 {counts['chapters']} · 单元/药 {counts['units']} · 汉字 {counts['hanzi']:,} · 数值 {counts['valueLike']}")
    print("词频:", json.dumps(probe, ensure_ascii=False))
    print("比值:", json.dumps(ratios, ensure_ascii=False))


if __name__ == "__main__":
    main()
