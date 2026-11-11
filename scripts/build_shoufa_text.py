#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_shoufa_text.py —— 《推拿手法学》工作簿 → 底本 + 单元层

母本：F:\\textbooks\\qhzy-推拿手法学.xlsx（29 表 = 17 前置/平台 + 12 内容章）
  内容章表名形如 `05 摆动类手法`；五列：章 / 节 / 小节 / 段 / 内容；节 `5.1`、小节 `5.1.1`。
  段=k 是段标题行，段=1k 是正文（与其余各门同约定）。

产出（standards/shoufa/）：底本.json · units.json · METHOD.json · axis-probe.json

口径：
  三辨＝**手法动作 / 操作要领 / 临床应用**
    动作——着力部位、方向、节律、幅度（「以…着力」「腕关节摆动」「频率每分钟…次」）；
    要领——沉肩垂肘、持久有力均匀柔和、功力与训练要求；
    应用——适应证、部位选择、与其它手法的组合。
  四位面三条候选实测后取一条，其余留痕：
    A 手法六类并四：摆动摩擦 / 振动 / 挤压叩击 / 运动关节
    B 部位：头面颈项 / 胸腹 / 背腰 / 四肢
    C 着力面：指 / 掌 / 肘臂 / 其它（器械、足）
"""
import hashlib
import json
import os
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-推拿手法学.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "shoufa")

SUB_TITLE = re.compile(r"^(\d+\.\d+\.\d+)\s+(.+)$")
SEG_TITLE = re.compile(r"^(\d+\.\d+\.\d+\.\d+)\s+(.+)$")
HANZI = re.compile(r"[\u4e00-\u9fff]")

VIEWS = {
    "手法动作": ["着力", "方向", "节律", "频率", "幅度", "摆动", "旋转", "按压", "摩擦", "叩击", "振",
                 "拇指", "掌", "指腹", "肘", "腕", "前臂", "动作", "操作"],
    "操作要领": ["要领", "沉肩", "垂肘", "悬腕", "持久", "有力", "均匀", "柔和", "深透", "功力", "训练",
                 "姿势", "呼吸", "不可", "切忌", "要求"],
    "临床应用": ["主治", "适应", "临床", "应用", "部位", "配合", "组合", "疗程", "注意", "禁忌", "用于", "治疗"],
}

LEVELS_A = {
    "摆动摩擦": ["摆动", "一指禅", "滚法", "揉法", "摩法", "推法", "擦法", "搓法", "抹法", "推"],
    "振动": ["振法", "颤法", "抖法", "振动"],
    "挤压叩击": ["按法", "压法", "拿法", "捏法", "拨法", "点法", "掐法", "拍法", "击法", "叩", "弹法", "捻法"],
    "运动关节": ["摇法", "扳法", "拔伸", "牵引", "背法", "屈伸", "旋转", "斜扳", "牵抖"],
}

LEVELS_B = {
    "头面颈项": ["头", "面", "颈", "项", "枕", "颞", "额", "眉", "目", "耳", "鼻"],
    "胸腹": ["胸", "腹", "胁", "脐", "肋"],
    "背腰": ["背", "腰", "脊", "椎", "骶", "肩胛", "臀"],
    "四肢": ["肩", "臂", "肘", "腕", "手", "指", "髋", "腿", "膝", "踝", "足", "趾", "股", "胫"],
}

LEVELS_C = {
    "指": ["拇指", "食指", "中指", "手指", "指腹", "指端", "一指禅"],
    "掌": ["掌根", "掌心", "掌面", "全掌", "鱼际", "手掌"],
    "肘臂": ["肘尖", "肘", "前臂", "尺骨", "臂"],
    "其它": ["足", "膝", "器械", "工具", "踩跷", "桑枝"],
}


def hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text, levels=None):
    t = text or ""
    out = {"digits": len(re.findall(r"\d", t)), "valueLike": 0, "levels": {}}
    if levels:
        for k, kws in levels.items():
            out["levels"][k] = sum(t.count(w) for w in kws)
    out["valueLike"] = len(re.findall(r"\d+(?:\.\d+)?\s*(?:次/分|次|分钟|秒|公斤|kg|N|牛顿|度|°|寸|cm|周|疗程)", t))
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
            units.append({
                "chapter": str(no), "chapterTitle": f"第{no}章 {title}",
                "sec": next((s3["title"] or s3["no"] for s3 in secs if sb in s3["subs"]), ""),
                "secNo": next((s3["no"] for s3 in secs if sb in s3["subs"]), ""),
                "sub": sub_id, "title": sub_name, "locator": f"教材·第{no}章·{sub_id}",
                "brief": "／".join(t for t in (s2["title"] for s2 in sb["segs"]) if t),
                "goals": [], "rawBody": prose, "body": prose, "prose": prose,
                "segments": [{"title": s2["title"], "hanzi": hanzi(s2.get("body", ""))} for s2 in sb["segs"]],
                "hanzi": hanzi(prose),
                "measure": {"digits": measure(prose)["digits"], "valueLike": measure(prose)["valueLike"],
                            "views": measure(prose, VIEWS)["levels"],
                            "levels": measure(prose, LEVELS_C)["levels"]},
            })
            n_units += 1
            hs += units[-1]["hanzi"]

        chapters.append({"no": str(no), "title": f"第{no}章 {title}", "units": n_units, "hanzi": hs,
                         "secs": [{"no": s["no"], "title": s["title"], "subs": [x["sub"] for x in s["subs"]]} for s in secs]})

    counts = {"chapters": len(chapters), "units": len(units), "hanzi": sum(c["hanzi"] for c in chapters),
              "digits": sum(u["measure"]["digits"] for u in units),
              "valueLike": sum(u["measure"]["valueLike"] for u in units)}

    probe = {}
    for u in units:
        for g, lv in (("view", VIEWS), ("A_class", LEVELS_A), ("B_part", LEVELS_B), ("C_contact", LEVELS_C)):
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
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "script": "scripts/build_shoufa_text.py"},
               "counts": counts, "views": VIEWS, "levels": LEVELS_C, "probe": probe, "ratio": ratios,
               "chapters": [{"no": c["no"], "title": c["title"], "units": c["units"], "hanzi": c["hanzi"]} for c in chapters],
               "units": units},
              open(os.path.join(OUT, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "sheets": len(wb.sheetnames)},
               "contentSheets": [c["title"] for c in chapters],
               "platformSheets": [n for n in wb.sheetnames if not re.match(r"^(\d{2})\s+", n.strip())],
               "axes": {"views": list(VIEWS), "levels": list(LEVELS_C), "probe": probe, "ratio": ratios,
                        "note": "三辨＝手法动作/操作要领/临床应用；四位面取三候选比值最小且与教材章序同构者"}},
              open(os.path.join(OUT, "METHOD.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"counts": counts, "probe": probe, "ratio": ratios},
              open(os.path.join(OUT, "axis-probe.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    wb.close()
    print(f"章 {counts['chapters']} · 单元 {counts['units']} · 汉字 {counts['hanzi']:,} · 数值命中 {counts['valueLike']}")
    print("词频:", json.dumps(probe, ensure_ascii=False))
    print("比值:", json.dumps(ratios, ensure_ascii=False))


if __name__ == "__main__":
    main()
