# -*- coding: utf-8 -*-
"""通用教材底本生成器（cifa 型版式：节列 1.1 / 小节列 1.1.1 / 段 1、11、12…）

用法：
  python scripts/build_course_generic.py --sub gushang-jichu \
      --xlsx "F:/textbooks/qhzy-中医骨伤科学.xlsx" \
      --views '<json 三辨词表>' --levels '<json 四位面词表>'

输出 standards/<sub>/{units.json,axis-probe.json,类群库.json}。
单元 = 小节；locator 一律 `教材·第N章·m.k.l`；正文按「段以 1 开头且长度≥2」收集（11/12/13…）。
"""
import argparse
import hashlib
import io
import json
import os
import re

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HANZI = re.compile(r"[\u4e00-\u9fff]")
SEC = re.compile(r"^(\d+\.\d+)\s+(.+)$")
SUB_T = re.compile(r"^(\d+\.\d+\.\d+)\s+(.+)$")
SEG_T = re.compile(r"^(\d+\.\d+\.\d+\.\d+)\s+(.+)$")


def hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text, views, levels):
    return {
        "digits": len(re.findall(r"\d", text)),
        "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:次|分钟|天|日|周|疗程|寸|度|°|次/分|周)", text)),
        "views": {k: sum(text.count(w) for w in ws) for k, ws in views.items()},
        "levels": {k: sum(text.count(w) for w in ws) for k, ws in levels.items()},
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sub", required=True)
    ap.add_argument("--xlsx", required=True)
    ap.add_argument("--views", required=True)
    ap.add_argument("--levels", required=True)
    a = ap.parse_args()
    views, levels = json.loads(a.views), json.loads(a.levels)

    out = os.path.join(ROOT, "standards", a.sub)
    os.makedirs(out, exist_ok=True)
    wb = openpyxl.load_workbook(a.xlsx, read_only=True, data_only=True)
    sha = hashlib.sha256(open(a.xlsx, "rb").read()).hexdigest()
    books = [(n, int(m.group(1)), m.group(2).strip())
             for n in wb.sheetnames
             for m in [re.match(r"^(\d{2})\s+(.+)$", n.strip())] if m]

    chapters, units, groups = [], [], []
    for sname, no, title in books:
        cu, secs = [], {}
        sec_no = sec_title = sub_id = sub_title = ""
        body = []

        def flush():
            nonlocal body
            if not body:
                return
            t = "\n".join(body).strip()
            body = []
            if not t:
                return
            cu.append({
                "chapter": str(no), "chapterTitle": f"第{no}章 {title}",
                "sec": sec_title, "secNo": sec_no, "sub": sub_id, "title": sub_title,
                "locator": f"教材·第{no}章·{sub_id}",
                "brief": f"{sec_title}／{sub_title} 正文 {hanzi(t)} 字",
                "goals": [], "rawBody": t, "body": t, "prose": t,
                "segments": [{"title": sub_title or sub_id, "hanzi": hanzi(t)}],
                "hanzi": hanzi(t), "measure": measure(t, views, levels),
            })

        for row in wb[sname].iter_rows(values_only=True):
            _c, sec_v, sub_v, seg_v, text = (list(row) + [None] * 5)[:5]
            text = text.strip() if isinstance(text, str) else ""
            seg = str(seg_v).strip() if seg_v not in (None, "") else ""
            sec_c = str(sec_v).strip() if sec_v not in (None, "") else ""
            sub_c = str(sub_v).strip() if sub_v not in (None, "") else ""
            if not text:
                continue
            m_seg, m_sub, m_sec = SEG_T.match(text), SUB_T.match(text), SEC.match(text)
            if m_seg:
                continue
            if m_sub or (re.fullmatch(r"\d+\.\d+\.\d+", sub_c) and seg == ""):
                flush()
                sub_id = m_sub.group(1) if m_sub else sub_c
                sub_title = m_sub.group(2) if m_sub else text
                continue
            if m_sec or (re.fullmatch(r"\d+\.\d+", sec_c) and seg == ""):
                flush()
                sec_no = m_sec.group(1) if m_sec else sec_c
                sec_title = m_sec.group(2) if m_sec else text
                secs[sec_no] = sec_title
                sub_id, sub_title = "", ""
                continue
            if len(seg) >= 2 and seg.startswith("1") and not text.startswith("【tcmP"):
                body.append(text)

        flush()
        chapters.append({"no": str(no), "title": f"第{no}章 {title}",
                         "units": len(cu), "hanzi": sum(u["hanzi"] for u in cu)})
        units += cu
        for k, v in secs.items():
            if hanzi(v) >= 2:
                groups.append({"chapter": str(no), "no": k, "name": v})

    whole = "\n".join(u["rawBody"] for u in units)
    probe = {"view": {k: sum(whole.count(w) for w in ws) for k, ws in views.items()},
             "A_part": {k: sum(whole.count(w) for w in ws) for k, ws in levels.items()}}
    ratio = {g: round(max(b.values()) / max(1, min([v for v in b.values() if v] or [1])), 1)
             for g, b in probe.items()}
    counts = {"chapters": len(chapters), "units": len(units),
              "hanzi": sum(c["hanzi"] for c in chapters), "diseases": len(groups),
              "digits": sum(u["measure"]["digits"] for u in units),
              "valueLike": sum(u["measure"]["valueLike"] for u in units)}

    json.dump({"source": {"file": os.path.basename(a.xlsx), "sha256": sha,
                          "script": "scripts/build_course_generic.py"},
               "counts": counts, "views": views, "levels": levels,
               "probe": probe, "ratio": ratio, "chapters": chapters, "units": units},
              io.open(os.path.join(out, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"file": os.path.basename(a.xlsx), "sha256": sha},
               "counts": counts, "views": views, "levelsA": levels, "probe": probe, "ratio": ratio},
              io.open(os.path.join(out, "axis-probe.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": "条目＝教材节标题（章内唯一）。", "count": len(groups), "entries": groups},
              io.open(os.path.join(out, "类群库.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{a.sub}: 章 {counts['chapters']} · 单元 {counts['units']} · 汉字 {counts['hanzi']} · 数值 {counts['valueLike']}")
    print("  三辨:", json.dumps(probe["view"], ensure_ascii=False), "→", ratio["view"], "×")
    print("  四位面:", json.dumps(probe["A_part"], ensure_ascii=False), "→", ratio["A_part"], "×")
    print("  sha:", sha[:16])


if __name__ == "__main__":
    main()
