# -*- coding: utf-8 -*-
"""针灸治疗学：底本 → standards/zhenjiu-zhiliao/{底本,units,病证库,axis-probe}.json

版式为 5 列：章 / 节 / 小节 / 段 / 内容
  - 段 = ''  且内容非空 → 节标题（如「第一节中风」「一、治神守气」）
  - 段 = '10'           → 小节标题（如「1.2.1 （一）虚则补之」）
  - 段 = '11'           → 正文
单元 = 一个(节, 小节)对的正文；节级概述（小节=0）也各成一个单元。
"""
import hashlib
import io
import json
import os
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-针灸治疗学.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "zhenjiu-zhiliao")

HANZI = re.compile(r"[\u4e00-\u9fff]")

VIEWS = {
    "治法与处方": ["治法", "处方", "取穴", "配穴", "主穴", "选穴"],
    "操作与疗程": ["操作", "手法", "留针", "灸", "疗程", "次数", "每日"],
    "辨证与分型": ["辨证", "证型", "分型", "病机", "虚实", "寒热"],
}

LEVELS_A = {
    "痛证": ["痛证", "疼痛", "头痛", "腰痛", "颈", "肩", "膝"],
    "内科病证": ["内科", "中风", "面瘫", "眩晕", "失眠", "胃", "便秘"],
    "妇儿科病证": ["妇科", "月经", "痛经", "小儿", "遗尿", "绝经"],
    "皮外五官急症": ["带状疱疹", "湿疹", "痤疮", "眼", "耳", "鼻", "急症", "高热"],
}
LEVELS_B = {
    "选穴配穴": ["取穴", "配穴", "主穴", "选穴", "穴位", "腧穴"],
    "手法与量": ["手法", "操作", "补泻", "留针", "刺激", "针感", "得气"],
    "疗程频次": ["疗程", "次数", "每日", "隔日", "每次", "分钟"],
    "调护禁忌": ["调护", "饮食", "注意", "禁忌", "预防", "护理"],
}
LEVELS_C = {
    "治疗手段": ["针刺", "毫针", "电针", "火针", "皮肤针", "三棱针", "灸法", "艾灸"],
    "辨证要素": ["寒", "热", "虚", "实", "气滞", "血瘀", "痰", "湿"],
    "疗程调护": ["疗程", "调护", "预防", "注意", "禁忌"],
}


def hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text, levels):
    out = {"levels": {k: sum(text.count(w) for w in kws) for k, kws in levels.items()},
           "views": {k: sum(text.count(w) for w in kws) for k, kws in VIEWS.items()}}
    out["digits"] = len(re.findall(r"\d", text))
    out["valueLike"] = len(re.findall(r"\d+(?:\.\d+)?\s*(?:次|分钟|天|日|周|疗程|寸|度|°|次/分)", text))
    return out


def as_int(x):
    if x in (None, "", "章", "节", "小节", "段"):
        return None
    s = str(x).strip()
    return int(s) if s.isdigit() else None


def main():
    os.makedirs(OUT, exist_ok=True)
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    sha = hashlib.sha256(open(SRC, "rb").read()).hexdigest()

    books = []
    for name in wb.sheetnames:
        mm = re.match(r"^(\d{2})\s+(.+)$", name.strip())
        if mm:
            books.append((name, int(mm.group(1)), mm.group(2).strip()))

    chapters, units, entries = [], [], []
    for sname, no, title in books:
        ws = wb[sname]
        sec_no = 0
        sec_title, sub_no, sub_title = "", None, ""
        body = []
        chap_units = []
        sec_map = {}

        def flush(sub_id, stitle, btxt):
            if not btxt:
                return
            t = "\n".join(btxt).strip()
            if not t:
                return
            chap_units.append({
                "chapter": str(no), "chapterTitle": f"第{no}章 {title}",
                "sec": stitle, "secNo": f"{no}.{sec_no}",
                "sub": sub_id, "title": sub_id,
                "locator": f"教材·第{no}章·{sub_id}",
                "brief": f"{stitle}／{sub_id} 正文 {hanzi(t)} 字",
                "goals": [], "rawBody": t, "body": t, "prose": t,
                "segments": [{"title": stitle or sub_id, "hanzi": hanzi(t)}],
                "hanzi": hanzi(t),
                "measure": measure(t, LEVELS_A),
                "view": {k: sum(t.count(w) for w in kws) for k, kws in VIEWS.items()},
            })

        for row in ws.iter_rows(values_only=True):
            ch_v, s_v, ss_v, seg_v, text = (list(row) + [None] * 5)[:5]
            text = text.strip() if isinstance(text, str) else ("" if text in (None, "") else str(text).strip())
            s_i, ss_i = as_int(s_v), as_int(ss_v)
            seg = (str(seg_v).strip() if seg_v not in (None, "") else "")

            if s_i is not None and s_i != sec_no:
                flush(f"{no}.{sec_no}.{sub_no if sub_no is not None else 0}", sec_title, body)
                body = []
                sec_no, sec_title, sub_no, sub_title = s_i, "", None, ""
            if seg == "":
                if text and not text.startswith("第") and "章" not in text[:3] and hanzi(text):
                    sec_title = text
                    sec_map[s_i] = text
                continue
            if seg == "10":
                flush(f"{no}.{sec_no}.{sub_no if sub_no is not None else 0}", sec_title, body)
                body = []
                sub_no, sub_title = ss_i if ss_i is not None else 0, text
                continue
            if text:
                body.append(text)

        flush(f"{no}.{sec_no}.{sub_no if sub_no is not None else 0}", sec_title, body)

        total = sum(u["hanzi"] for u in chap_units)
        chapters.append({"no": str(no), "title": f"第{no}章 {title}", "units": len(chap_units), "hanzi": total})
        units += chap_units
        for s_no, s_title in sec_map.items():
            if hanzi(s_title) >= 2:
                entries.append({"chapter": str(no), "no": f"{no}.{s_no}", "name": s_title})

    whole = "\n".join(u["rawBody"] for u in units)
    probe = {"view": {k: sum(whole.count(w) for w in kws) for k, kws in VIEWS.items()},
             "A_part": {k: sum(whole.count(w) for w in kws) for k, kws in LEVELS_A.items()},
             "B_hand": {k: sum(whole.count(w) for w in kws) for k, kws in LEVELS_B.items()},
             "C_stage": {k: sum(whole.count(w) for w in kws) for k, kws in LEVELS_C.items()}}
    ratio = {k: round(max(v.values()) / max(1, min(v.values())), 1) for k, v in probe.items()}

    payload = {
        "source": {"file": os.path.basename(SRC), "sha256": sha,
                   "script": "scripts/build_zhenjiu_zhiliao_text.py"},
        "counts": {"chapters": len(chapters), "units": len(units),
                   "hanzi": sum(c["hanzi"] for c in chapters), "diseases": len(entries),
                   "digits": sum(u["measure"]["digits"] for u in units),
                   "valueLike": sum(u["measure"]["valueLike"] for u in units)},
        "views": VIEWS, "levels": LEVELS_A, "probe": probe, "ratio": ratio,
        "chapters": chapters, "units": units,
    }
    json.dump(payload, io.open(os.path.join(OUT, "units.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    json.dump({"source": payload["source"], "counts": payload["counts"], "views": VIEWS,
               "levelsA": LEVELS_A, "levelsB": LEVELS_B, "levelsC": LEVELS_C,
               "probe": probe, "ratio": ratio},
              io.open(os.path.join(OUT, "axis-probe.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    json.dump({"note": "病证＝教材节标题（第 6–14 章为主）；同名不合并，跨章重名保留章号。",
               "count": len(entries), "entries": entries},
              io.open(os.path.join(OUT, "病证库.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"章 {len(chapters)} · 单元 {len(units)} · 病证 {len(entries)} · 汉字 {payload['counts']['hanzi']} · 数值 {payload['counts']['valueLike']}")
    print("词频:", json.dumps(probe, ensure_ascii=False))
    print("比值:", json.dumps(ratio))


if __name__ == "__main__":
    main()
