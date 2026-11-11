#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_zjgejia_text.py —— 《各家针灸学说》工作簿 → 底本 + 单元层

母本：F:\\textbooks\\qhzy-各家针灸学说.xlsx（29 表 = 17 前置/平台 + 12 内容章）
  内容章表名形如 `03 《内经》针灸学术思想`；表内五列：章 / 节 / 小节 / 段 / 内容。
  与《经络腧穴学》不同，本表的「节」「小节」列**自带完整编号**（3.1 / 3.1.1），可直接取用。
  段编号约定不变：段=k 是段标题行，段=1k 是它的正文。

产出（standards/zhenjiu-gejia/）：
  底本.json      章 → 节 → 小节 → 段 + counts + sha256
  units.json     单元层：一小节一条，含 brief/prose/hanzi/measure(三辨＋四位面词频)/数值计数
  METHOD.json    平台表清单 + 口径
  axis-probe.json 三套四位面候选的全库实测（定口径留痕）

口径（各家针灸学说的三层）：
  1. 三辨＝**学说主张 / 文献依据 / 临证应用**：
     主张——某家对针灸提出的核心论断（如「针道自然」「灸法温补」）；
     依据——他引的经典与自著（《内经》《难经》《针灸甲乙经》《针灸大成》…）；
     应用——落在刺灸手法、选穴配穴、临床主治上的具体做法。
     这三项取自教材每节固定的写法（人物 → 主张 → 依据 → 应用），不另造分类。
  2. 四位面三条候选实测后取一条，其余留进 axis-probe.json：
     A 时代：先秦两汉 / 晋唐 / 宋金元 / 明清近代
     B 载体：经典注疏 / 专著 / 医案 / 教材与流派
     C 主题：理论 / 手法 / 灸法 / 临床
  3. 数值不回避：壮数、深度、留针时间、穴位数、年代，measure 保留 valueLike 计数。
"""

import hashlib
import json
import os
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-各家针灸学说.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "zhenjiu-gejia")

SUB_TITLE = re.compile(r"^(\d+\.\d+\.\d+)\s+(.+)$")
SEG_TITLE = re.compile(r"^(\d+\.\d+\.\d+\.\d+)\s+(.+)$")
HANZI = re.compile(r"[\u4e00-\u9fff]")

VIEWS = {
    "学说主张": ["主张", "认为", "提出", "强调", "倡导", "重视", "反对", "发挥", "阐发", "立论", "学说", "思想", "观点"],
    "文献依据": ["《素问", "《灵枢", "《难经", "《甲乙经", "《针灸大成", "《千金", "《外台", "《铜人", "《资生", "《神应",
                 "《针灸问对", "《医宗金鉴", "撰", "著", "辑", "注", "引", "据", "本于"],
    "临证应用": ["刺法", "灸法", "针法", "取穴", "配穴", "选穴", "手法", "补泻", "壮", "留针", "主治", "临床应用",
                 "治疗", "禁针", "禁灸", "透刺", "火针", "温针", "化脓灸"],
}

LEVELS_A = {
    "先秦两汉": ["内经", "《素问", "《灵枢", "《难经", "伤寒", "仲景", "扁鹊", "仓公", "华佗"],
    "晋唐": ["晋", "唐", "皇甫谧", "甲乙经", "葛洪", "孙思邈", "王焘", "杨上善"],
    "宋金元": ["宋", "金", "元", "铜人", "王惟一", "窦汉卿", "窦默", "滑寿", "张从正", "李东垣", "朱丹溪", "刘完素"],
    "明清近代": ["明", "清", "杨继洲", "高武", "汪机", "李梃", "吴谦", "医宗金鉴", "近代", "民国", "承淡安", "当代", "现代"],
}

LEVELS_B = {
    "经典注疏": ["注", "疏", "校", "释", "素问", "灵枢", "难经"],
    "专著": ["甲乙经", "铜人", "针灸大成", "资生经", "神应经", "针灸问对", "专著", "全书"],
    "医案": ["医案", "案", "治验", "病案", "验案"],
    "教材与流派": ["教材", "流派", "学派", "传承", "教学", "课程"],
}

LEVELS_C = {
    "理论": ["理论", "经络", "脏腑", "病机", "阴阳", "气血", "学说"],
    "手法": ["手法", "补泻", "捻转", "提插", "透刺", "进针", "行针", "针法"],
    "灸法": ["灸", "艾", "壮", "化脓灸", "温针", "灯火", "瘢痕灸"],
    "临床": ["临床", "主治", "治疗", "病证", "应用", "医案", "疗效"],
}


def count_hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text, levels=None):
    t = text or ""
    out = {"digits": len(re.findall(r"\d", t)), "valueLike": 0, "levels": {}}
    if levels:
        for k, kws in levels.items():
            out["levels"][k] = sum(t.count(w) for w in kws)
    out["valueLike"] = len(re.findall(r"\d+(?:\.\d+)?\s*(?:寸|壮|cm|mm|分钟|次|度|年|篇|卷|穴|种)", t))
    return out


def main():
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    sha = hashlib.sha256(open(SRC, "rb").read()).hexdigest()

    content = []
    for name in wb.sheetnames:
        mm = re.match(r"^(\d{2})\s+(.+)$", name.strip())
        if mm:
            content.append((name, int(mm.group(1)), mm.group(2)))

    chapters, units = [], []
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

            if s_val:
                sec = {"no": s_val, "title": "", "subs": []}
                secs.append(sec)
                sub = pending = None
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

        n_units = hanzi_sum = 0
        for sb in subs:
            prose = "\n".join(s2["body"] for s2 in sb["segs"] if s2.get("body"))
            if not prose.strip():
                continue
            mm3 = SUB_TITLE.match((sb["title"] or "").strip())
            sub_id = mm3.group(1) if mm3 else sb["sub"]
            sub_name = mm3.group(2) if mm3 else (sb["title"] or sb["sub"])
            unit = {
                "chapter": str(no),
                "chapterTitle": f"第{no}章 {title}",
                "sec": next((s3["title"] or s3["no"] for s3 in secs if sb in s3["subs"]), ""),
                "sub": sub_id,
                "title": sub_name,
                "locator": f"教材·第{no}章·{sub_id}",
                "brief": "／".join(t for t in (s2["title"] for s2 in sb["segs"]) if t),
                "goals": [],
                "rawBody": prose,
                "body": prose,
                "prose": prose,
                "segments": [{"title": s2["title"], "hanzi": count_hanzi(s2.get("body", ""))} for s2 in sb["segs"]],
                "hanzi": count_hanzi(prose),
                "measure": {
                    "digits": measure(prose)["digits"],
                    "valueLike": measure(prose)["valueLike"],
                    "views": measure(prose, VIEWS)["levels"],
                    "levels": measure(prose, LEVELS_A)["levels"],
                },
            }
            units.append(unit)
            n_units += 1
            hanzi_sum += unit["hanzi"]

        chapters.append({"no": str(no), "title": f"第{no}章 {title}", "units": n_units, "hanzi": hanzi_sum,
                         "secs": [{"no": s["no"], "title": s["title"], "subs": [x["sub"] for x in s["subs"]]} for s in secs]})

    counts = {"chapters": len(chapters), "units": len(units), "hanzi": sum(c["hanzi"] for c in chapters),
              "digits": sum(u["measure"]["digits"] for u in units),
              "valueLike": sum(u["measure"]["valueLike"] for u in units)}

    probe = {}
    for u in units:
        for gname, lv in (("view", VIEWS), ("A_era", LEVELS_A), ("B_carrier", LEVELS_B), ("C_theme", LEVELS_C)):
            m = measure(u["prose"], lv)["levels"]
            bucket = probe.setdefault(gname, {k: 0 for k in lv})
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
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "script": "scripts/build_zjgejia_text.py"},
               "counts": counts, "views": VIEWS, "levels": LEVELS_A, "probe": probe, "ratio": ratios,
               "chapters": [{"no": c["no"], "title": c["title"], "units": c["units"], "hanzi": c["hanzi"]} for c in chapters],
               "units": units},
              open(os.path.join(OUT, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "sheets": len(wb.sheetnames)},
               "contentSheets": [c["title"] for c in chapters],
               "platformSheets": [n for n in wb.sheetnames if not re.match(r"^(\d{2})\s+", n.strip())],
               "axes": {"views": list(VIEWS), "levels": list(LEVELS_A), "probe": probe, "ratio": ratios,
                        "note": "三辨＝学说主张/文献依据/临证应用（取自教材每节固定写法）；四位面取三候选比值最小者"}},
              open(os.path.join(OUT, "METHOD.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"counts": counts, "probe": probe, "ratio": ratios},
              open(os.path.join(OUT, "axis-probe.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    wb.close()

    print(f"章 {counts['chapters']} · 单元 {counts['units']} · 汉字 {counts['hanzi']:,} · 数值命中 {counts['valueLike']}")
    print("词频:", json.dumps(probe, ensure_ascii=False))
    print("比值:", json.dumps(ratios, ensure_ascii=False))


if __name__ == "__main__":
    main()
