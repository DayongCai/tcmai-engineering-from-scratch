# -*- coding: utf-8 -*-
"""针灸学（30 章 · 全库最大单课）：底本 → standards/zhenjiu-xue/

版式：5 列（章/节/小节/段/内容），编号写在「内容」列；正文 `段` 为 11/12/13…
四位面＝教材四板块（结构分区，按教材章归属）：
  基础总论 1–3 ｜ 经络腧穴各论 4–18 ｜ 刺灸技法 19–22 ｜ 临床治疗 23–30
"""
import hashlib
import io
import json
import os
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-针灸学.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "zhenjiu-xue")

HANZI = re.compile(r"[\u4e00-\u9fff]")
SEC = re.compile(r"^(\d+\.\d+)\s+(.+)$")
SUB = re.compile(r"^(\d+\.\d+\.\d+)\s+(.+)$")
SEG = re.compile(r"^(\d+\.\d+\.\d+\.\d+)\s+(.+)$")

VIEWS = {
    "临床治疗": ["治疗", "病证", "辨证", "处方", "主治", "疗效", "取穴"],
    "刺灸技术": ["刺法", "灸法", "针刺", "艾灸", "手法", "操作", "得气", "留针"],
    "经络腧穴": ["经络", "腧穴", "经穴", "循行", "定位", "归经"],
}

PLANES = {
    "基础总论": (1, 3),
    "经络腧穴各论": (4, 18),
    "刺灸技法": (19, 22),
    "临床治疗": (23, 30),
}


def plane_of(no):
    for name, (a, b) in PLANES.items():
        if a <= no <= b:
            return name
    return "基础总论"


def hanzi(s):
    return len(HANZI.findall(s or ""))


def main():
    os.makedirs(OUT, exist_ok=True)
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    sha = hashlib.sha256(open(SRC, "rb").read()).hexdigest()
    books = [(n, int(m.group(1)), m.group(2).strip())
             for n in wb.sheetnames
             for m in [re.match(r"^(\d{2})\s+(.+)$", n.strip())] if m]

    chapters, units = [], []
    for sname, no, title in books:
        cu = []
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
            pl = plane_of(no)
            cu.append({
                "chapter": str(no), "chapterTitle": f"第{no}章 {title}",
                "sec": sec_title, "secNo": sec_no, "sub": sub_id, "title": sub_title,
                "locator": f"教材·第{no}章·{sub_id}",
                "brief": f"{sec_title}／{sub_title} 正文 {hanzi(t)} 字",
                "goals": [], "rawBody": t, "body": t, "prose": t,
                "segments": [{"title": sub_title or sub_id, "hanzi": hanzi(t)}],
                "hanzi": hanzi(t),
                "measure": {
                    "digits": len(re.findall(r"\d", t)),
                    "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:次|分钟|天|日|周|疗程|寸|度|°|次/分)", t)),
                    "views": {k: sum(t.count(w) for w in kws) for k, kws in VIEWS.items()},
                    "levels": {k: (hanzi(t) if k == pl else 0) for k in PLANES},
                },
            })

        for row in ws_rows(wb[sname]):
            _c, _s, _ss, seg_v, text = row
            text = text.strip() if isinstance(text, str) else ""
            seg = str(seg_v).strip() if seg_v not in (None, "") else ""
            if not text:
                continue
            m_seg, m_sub, m_sec = SEG.match(text), SUB.match(text), SEC.match(text)
            if m_seg:
                continue
            if m_sub:
                flush()
                sub_id, sub_title = m_sub.group(1), m_sub.group(2)
                continue
            if m_sec:
                flush()
                sec_no, sec_title = m_sec.group(1), m_sec.group(2)
                sub_id, sub_title = "", ""
                continue
            if len(seg) >= 2 and seg.startswith("1") and not text.startswith("【tcmP"):
                body.append(text)

        flush()
        chapters.append({"no": str(no), "title": f"第{no}章 {title}",
                         "units": len(cu), "hanzi": sum(u["hanzi"] for u in cu)})
        units += cu

    whole = "\n".join(u["rawBody"] for u in units)
    probe = {"view": {k: sum(whole.count(w) for w in kws) for k, kws in VIEWS.items()}}
    plane_hz = {p: 0 for p in PLANES}
    plane_units = {p: 0 for p in PLANES}
    for u in units:
        p = plane_of(int(u["chapter"]))
        plane_hz[p] += u["hanzi"]
        plane_units[p] += 1
    probe["A_part"] = plane_hz
    probe["A_part_units"] = plane_units
    ratio = {"view": round(max(probe["view"].values()) / max(1, min(probe["view"].values())), 1),
             "A_part": round(max(plane_hz.values()) / max(1, min(plane_hz.values())), 1)}

    payload = {
        "source": {"file": os.path.basename(SRC), "sha256": sha,
                   "script": "scripts/build_zhenjiu_xue_text.py"},
        "counts": {"chapters": len(chapters), "units": len(units),
                   "hanzi": sum(c["hanzi"] for c in chapters), "diseases": 0,
                   "digits": sum(u["measure"]["digits"] for u in units),
                   "valueLike": sum(u["measure"]["valueLike"] for u in units)},
        "views": VIEWS, "levels": {k: [k] for k in PLANES},
        "probe": probe, "ratio": ratio, "chapters": chapters, "units": units,
        "planes": {k: {"chapters": list(v)} for k, v in PLANES.items()},
    }
    json.dump(payload, io.open(os.path.join(OUT, "units.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"章 {len(chapters)} · 单元 {len(units)} · 汉字 {payload['counts']['hanzi']} · 数值 {payload['counts']['valueLike']}")
    print("三辨:", json.dumps(probe["view"], ensure_ascii=False))
    print("四板块(汉字):", json.dumps(plane_hz, ensure_ascii=False), "| 单元:", json.dumps(plane_units, ensure_ascii=False))
    print("比值:", json.dumps(ratio, ensure_ascii=False))


def ws_rows(ws):
    for row in ws.iter_rows(values_only=True):
        yield (list(row) + [None] * 5)[:5]


if __name__ == "__main__":
    main()
