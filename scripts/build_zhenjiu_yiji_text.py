# -*- coding: utf-8 -*-
"""针灸医籍选读：底本 → standards/zhenjiu-yiji/{units,axis-probe,医籍库}.json

版式（5 列：章/节/小节/段/内容）与针法灸法那本不同：
  **编号写在「内容」列**，数字列只放层级。
  - 内容以 `1.1 ` 开头 → 节标题
  - 内容以 `1.1.1 ` 开头 → 小节标题（= 一个单元）
  - 内容以 `1.1.1.1 ` 开头 → 段标题（单元内小标题）
  - 段列 = '11' → 正文
"""
import hashlib
import io
import json
import os
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-针灸医籍选读.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "zhenjiu-yiji")

HANZI = re.compile(r"[\u4e00-\u9fff]")
SEC = re.compile(r"^(\d+\.\d+)\s+(.+)$")
SUB = re.compile(r"^(\d+\.\d+\.\d+)\s+(.+)$")
SEG = re.compile(r"^(\d+\.\d+\.\d+\.\d+)\s+(.+)$")

VIEWS = {
    "临证应用": ["治", "证", "病", "用针", "临床", "取穴"],
    "义理发挥": ["义", "理", "故", "谓", "按语", "发挥"],
    "训释校勘": ["注", "校", "释", "通假", "音义", "原文"],
}
LEVELS_A = {
    "经典经文": ["素问", "灵枢", "难经", "甲乙经", "经文"],
    "医家医论": ["医家", "医论", "千金", "外台", "东垣", "丹溪", "景岳", "张介宾"],
    "针灸歌赋": ["歌赋", "赋", "歌", "标幽", "通玄指要", "百症赋", "玉龙歌", "马丹阳"],
    "医案": ["医案", "案", "治验", "效案"],
}
LEVELS_B = {
    "内经": ["素问", "灵枢", "黄帝内经", "九针", "经脉"],
    "难经与甲乙": ["难经", "甲乙经", "针灸甲乙经", "八十一难"],
    "晋唐宋金元": ["千金", "外台", "铜人", "资生", "子午流注", "标幽赋"],
    "明清近代": ["针灸大成", "金针赋", "医宗金鉴", "针灸聚英", "杨继洲"],
}
LEVELS_C = {
    "原文与训释": ["原文", "注", "校", "释", "通假", "音义"],
    "义理与发挥": ["义", "理", "故", "谓", "发挥", "按"],
    "临证与应用": ["临床", "治", "病", "证", "用针", "刺"],
}


def hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text):
    return {
        "digits": len(re.findall(r"\d", text)),
        "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:次|分钟|天|日|周|疗程|寸|度|°|次/分)", text)),
        "views": {k: sum(text.count(w) for w in kws) for k, kws in VIEWS.items()},
        "levels": {k: sum(text.count(w) for w in kws) for k, kws in LEVELS_A.items()},
    }


def main():
    os.makedirs(OUT, exist_ok=True)
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    sha = hashlib.sha256(open(SRC, "rb").read()).hexdigest()
    books = [(n, int(m.group(1)), m.group(2).strip())
             for n in wb.sheetnames
             for m in [re.match(r"^(\d{2})\s+(.+)$", n.strip())] if m]

    chapters, units, book_entries = [], [], []
    for sname, no, title in books:
        chap_units = []
        sec_no = sec_title = ""
        sub_id = sub_title = ""
        seg_titles = []
        body = []

        def flush():
            nonlocal body, seg_titles
            if not body:
                return
            t = "\n".join(body).strip()
            body, seg_titles = [], []
            if not t:
                return
            chap_units.append({
                "chapter": str(no), "chapterTitle": f"第{no}章 {title}",
                "sec": sec_title, "secNo": sec_no,
                "sub": sub_id, "title": sub_title,
                "locator": f"教材·第{no}章·{sub_id}",
                "brief": f"{sec_title}／{sub_title} 正文 {hanzi(t)} 字",
                "goals": [], "rawBody": t, "body": t, "prose": t,
                "segments": [{"title": sub_title or sub_id, "hanzi": hanzi(t)}],
                "hanzi": hanzi(t), "measure": measure(t),
            })

        for row in ws_rows(wb[sname]):
            _ch, _s, _ss, seg_v, text = row
            text = text.strip() if isinstance(text, str) else ""
            seg = str(seg_v).strip() if seg_v not in (None, "") else ""
            if not text:
                continue
            m_seg = SEG.match(text)
            m_sub = SUB.match(text)
            m_sec = SEC.match(text)
            if m_seg:
                seg_titles.append(m_seg.group(2))
                continue
            if m_sub:
                flush()
                sec_no, sec_title = m_sub.group(1).rsplit(".", 1)[0], sec_title
                sub_id, sub_title = m_sub.group(1), m_sub.group(2)
                continue
            if m_sec:
                flush()
                sec_no, sec_title = m_sec.group(1), m_sec.group(2)
                sub_id, sub_title = "", ""
                continue
            if len(seg) >= 2 and seg.startswith("1") and text and not text.startswith("【tcmP"):
                body.append(text)

        flush()
        chapters.append({"no": str(no), "title": f"第{no}章 {title}",
                         "units": len(chap_units), "hanzi": sum(u["hanzi"] for u in chap_units)})
        units += chap_units
        book_entries.append({"chapter": str(no), "name": title, "units": len(chap_units)})

    whole = "\n".join(u["rawBody"] for u in units)
    probe = {"view": {k: sum(whole.count(w) for w in kws) for k, kws in VIEWS.items()},
             "A_part": {k: sum(whole.count(w) for w in kws) for k, kws in LEVELS_A.items()},
             "B_hand": {k: sum(whole.count(w) for w in kws) for k, kws in LEVELS_B.items()},
             "C_stage": {k: sum(whole.count(w) for w in kws) for k, kws in LEVELS_C.items()}}
    ratio = {k: round(max(v.values()) / max(1, min(v.values())), 1) for k, v in probe.items()}

    payload = {
        "source": {"file": os.path.basename(SRC), "sha256": sha,
                   "script": "scripts/build_zhenjiu_yiji_text.py"},
        "counts": {"chapters": len(chapters), "units": len(units),
                   "hanzi": sum(c["hanzi"] for c in chapters),
                   "diseases": len(book_entries),
                   "digits": sum(u["measure"]["digits"] for u in units),
                   "valueLike": sum(u["measure"]["valueLike"] for u in units)},
        "views": VIEWS, "levels": LEVELS_A, "probe": probe, "ratio": ratio,
        "chapters": chapters, "units": units,
    }
    json.dump(payload, io.open(os.path.join(OUT, "units.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    json.dump({**{k: payload[k] for k in ("source", "counts", "probe", "ratio")},
               "views": VIEWS, "levelsA": LEVELS_A, "levelsB": LEVELS_B, "levelsC": LEVELS_C},
              io.open(os.path.join(OUT, "axis-probe.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    json.dump({"note": "医籍库＝教材十章（每章一部/一类医籍）；单元数按小节计。",
               "count": len(book_entries), "entries": book_entries},
              io.open(os.path.join(OUT, "医籍库.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"章 {len(chapters)} · 单元 {len(units)} · 医籍 {len(book_entries)} · 汉字 {payload['counts']['hanzi']} · 数值 {payload['counts']['valueLike']}")
    print("词频:", json.dumps(probe, ensure_ascii=False))
    print("比值:", json.dumps(ratio))


def ws_rows(ws):
    for row in ws.iter_rows(values_only=True):
        cells = (list(row) + [None] * 5)[:5]
        yield cells


if __name__ == "__main__":
    main()
