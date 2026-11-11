#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_huli_course.py —— 护理系通用底本构建器（读 standards/<sub>/axes.json）

用法：
  python scripts/build_huli_course.py waike-huli "F:/textbooks/qhzy-外科护理学.xlsx"

为什么要有通用版：
  护理系要连建多门课，每门的差别只在「三辨/四位面的词表」与「母本文件」。
  把词表外置成 `standards/<sub>/axes.json`，一门课只剩一个数据文件要写，脚本不再复制粘贴。

axes.json 结构：
  {
    "note": "为什么取这三辨、这组四位面",
    "views":  {"一辨": [词…], "二辨": [词…], "三辨": [词…]},
    "levelsA": {"位面1": [词…], …},   # 候选一
    "levelsB": {…},                    # 候选二
    "levelsC": {…}                     # 候选三
  }
产物与单科版完全一致：底本.json / units.json / axis-probe.json / METHOD.json / 成分库.json
"""
import hashlib
import json
import os
import re
import sys

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SUB_TITLE = re.compile(r"^(\d+\.\d+\.\d+)\s+(.+)$")
SEG_TITLE = re.compile(r"^(\d+\.\d+\.\d+\.\d+)\s+(.+)$")
HANZI = re.compile(r"[\u4e00-\u9fff]")


def hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text, levels=None):
    t = text or ""
    out = {"digits": len(re.findall(r"\d", t)), "valueLike": 0, "levels": {}}
    if levels:
        for k, kws in levels.items():
            out["levels"][k] = sum(t.count(w) for w in kws)
    out["valueLike"] = len(re.findall(r"\d+(?:\.\d+)?\s*(?:次|分钟|天|日|周|疗程|寸|度|°|次/分|mmHg|ml|%|小时)", t))
    return out


def main():
    if len(sys.argv) < 3:
        sys.exit("用法: build_huli_course.py <standards 子目录> <xlsx 路径>")
    sub, src = sys.argv[1], sys.argv[2]
    out = os.path.join(ROOT, "standards", sub)
    cfg = json.load(open(os.path.join(out, "axes.json"), encoding="utf-8"))
    VIEWS, LA, LB, LC = cfg["views"], cfg["levelsA"], cfg["levelsB"], cfg["levelsC"]

    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    sha = hashlib.sha256(open(src, "rb").read()).hexdigest()

    content = []
    for name in wb.sheetnames:
        mm = re.match(r"^(\d{2})\s+(.+)$", name.strip())
        if mm:
            content.append((name, int(mm.group(1)), mm.group(2)))

    chapters, units, diseases = [], [], []
    for sname, no, title in content:
        ws = wb[sname]
        secs, subs = [], []
        sec = sub = pending = None
        for row in ws.iter_rows(values_only=True):
            _ch, s_val, sub_val, seg, text = (list(row) + [None] * 5)[:5]
            text = (text or "").strip() if isinstance(text, str) else (str(text).strip() if text else "")
            s_val = (str(s_val).strip() if s_val not in (None, "·", "章", "节") else "")
            sub_val = (str(sub_val).strip() if sub_val not in (None, "·", "小节") else "")
            seg = (str(seg).strip() if seg not in (None, "·", "段") else "")

            if s_val and re.match(r"^\d+\.\d+$", s_val):
                sec = {"no": s_val, "title": "", "subs": []}
                secs.append(sec)
                sub = pending = None
            if sub_val and re.match(r"^\d+\.\d+\.\d+$", sub_val):
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
                    t = mm2.group(2) if mm2 else text
                    if sub is None:
                        sub = {"sub": (sec["no"] + ".1") if sec else f"{no}.1.1", "title": "", "segs": []}
                        subs.append(sub)
                        if sec:
                            sec["subs"].append(sub)
                    pending = {"seg": seg, "title": t, "body": ""}
                    sub["segs"].append(pending)
            else:
                if sub is not None and not sub["title"]:
                    mm2 = SUB_TITLE.match(text)
                    sub["title"] = (mm2.group(1) + " " + mm2.group(2)) if mm2 else text
                elif sec is not None and not sec["title"]:
                    sec["title"] = text

        n_units = hs = 0
        for sb in subs:
            prose = "\n".join(s2["body"] for s2 in sb["segs"] if s2.get("body"))
            if not prose.strip():
                continue
            mm3 = SUB_TITLE.match((sb["title"] or "").strip())
            sub_id = mm3.group(1) if mm3 else sb["sub"]
            sub_name = mm3.group(2) if mm3 else (sb["title"] or sb["sub"])
            sec_title = next((s3["title"] or s3["no"] for s3 in secs if sb in s3["subs"]), "")
            units.append({
                "chapter": str(no), "chapterTitle": f"第{no}章 {title}",
                "sec": sec_title, "secNo": next((s3["no"] for s3 in secs if sb in s3["subs"]), ""),
                "sub": sub_id, "title": sub_name, "locator": f"教材·第{no}章·{sub_id}",
                "brief": "／".join(t for t in (s2["title"] for s2 in sb["segs"]) if t),
                "goals": [], "rawBody": prose, "body": prose, "prose": prose,
                "segments": [{"title": s2["title"], "hanzi": hanzi(s2.get("body", ""))} for s2 in sb["segs"]],
                "hanzi": hanzi(prose),
                "measure": {"digits": measure(prose)["digits"], "valueLike": measure(prose)["valueLike"],
                            "views": measure(prose, VIEWS)["levels"],
                            "levels": measure(prose, LA)["levels"]},
            })
            n_units += 1
            hs += units[-1]["hanzi"]

        chapters.append({"no": str(no), "title": f"第{no}章 {title}", "units": n_units, "hanzi": hs,
                         "secs": [{"no": s["no"], "title": s["title"], "subs": [x["sub"] for x in s["subs"]]} for s in secs]})
        for s in secs:
            if s["title"] and int(no) >= 3:
                diseases.append({"病证": s["title"], "章": int(no), "章名": title, "单元": [x["sub"] for x in s["subs"]]})

    counts = {"chapters": len(chapters), "units": len(units), "hanzi": sum(c["hanzi"] for c in chapters),
              "diseases": len(diseases),
              "digits": sum(u["measure"]["digits"] for u in units),
              "valueLike": sum(u["measure"]["valueLike"] for u in units)}

    probe = {}
    for u in units:
        for g, lv in (("view", VIEWS), ("A_part", LA), ("B_hand", LB), ("C_stage", LC)):
            m = measure(u["prose"], lv)["levels"]
            bucket = probe.setdefault(g, {k: 0 for k in lv})
            for k, v in m.items():
                bucket[k] += v
    ratios = {}
    for g, b in probe.items():
        vals = [v for v in b.values() if v]
        ratios[g] = round(max(b.values()) / min(vals), 1) if len(vals) > 1 and min(vals) else None

    os.makedirs(out, exist_ok=True)
    json.dump({"source": {"file": os.path.basename(src), "sha256": sha, "sheets": len(wb.sheetnames)},
               "counts": counts, "chapters": chapters, "diseases": diseases},
              open(os.path.join(out, "底本.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"file": os.path.basename(src), "sha256": sha},
               "counts": {"病证": len(diseases)}, "diseases": diseases},
              open(os.path.join(out, "成分库.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"file": os.path.basename(src), "sha256": sha, "script": "scripts/build_huli_course.py"},
               "counts": counts, "views": VIEWS, "levels": LA, "probe": probe, "ratio": ratios,
               "chapters": [{"no": c["no"], "title": c["title"], "units": c["units"], "hanzi": c["hanzi"]} for c in chapters],
               "units": units},
              open(os.path.join(out, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"file": os.path.basename(src), "sha256": sha, "sheets": len(wb.sheetnames)},
               "contentSheets": [c["title"] for c in chapters],
               "platformSheets": [n for n in wb.sheetnames if not re.match(r"^(\d{2})\s+", n.strip())],
               "axes": {"views": list(VIEWS), "levelsA": list(LA), "levelsB": list(LB), "levelsC": list(LC),
                        "probe": probe, "ratio": ratios, "note": cfg.get("note", "")}},
              open(os.path.join(out, "METHOD.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"counts": counts, "probe": probe, "ratio": ratios},
              open(os.path.join(out, "axis-probe.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    wb.close()
    print(f"{sub}: 章 {counts['chapters']} · 单元 {counts['units']} · 汉字 {counts['hanzi']:,} · 数值 {counts['valueLike']}")
    print("词频:", json.dumps(probe, ensure_ascii=False))
    print("比值:", json.dumps(ratios, ensure_ascii=False))


if __name__ == "__main__":
    main()
