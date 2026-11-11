#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_tuina_text.py —— 《推拿学》工作簿 → 底本 + 单元层

母本：F:\\textbooks\\qhzy-推拿学.xlsx（29 表 = 17 前置/平台 + 12 内容章）
  内容章表名形如 `06 成人推拿手法`；五列：章 / 节 / 小节 / 段 / 内容。
  节号形如 `6.1`，小节号 `6.1.1`；段=k 是段标题行，段=1k 是正文（与其余各门同约定）。

产出（standards/tuina/）：底本.json · units.json · METHOD.json · axis-probe.json

口径：
  三辨＝**手法操作 / 作用机理 / 临床应用**
    操作——着力部位、方向、频率、力度、时间（「以…着力」「频率每分钟…次」「持续…分钟」）；
    机理——中医作用（疏通经络、理筋整复、滑利关节、调整脏腑）与现代机制（血流量、肌电、炎症因子）；
    应用——适应证、辨病辨证选法、疗程与注意事项。
  四位面三条候选，实测后取一条，其余留痕：
    A 部位：头面颈项 / 胸腹 / 背腰 / 四肢
    B 手法六类的四分归并：摆动摩擦 / 挤压振动 / 叩击 / 运动关节
    C 作用：疏通经络 / 理筋整复 / 滑利关节 / 调整脏腑
"""
import hashlib
import json
import os
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-推拿学.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "tuina")

SUB_TITLE = re.compile(r"^(\d+\.\d+\.\d+)\s+(.+)$")
SEG_TITLE = re.compile(r"^(\d+\.\d+\.\d+\.\d+)\s+(.+)$")
HANZI = re.compile(r"[\u4e00-\u9fff]")

VIEWS = {
    "手法操作": ["着力", "方向", "频率", "力度", "轻重", "持续", "分钟", "次/分", "节律", "手法", "操作",
                 "拇指", "掌", "指腹", "肘", "揉", "推", "拿", "按", "摩", "滚", "拨", "点", "拍", "抖"],
    "作用机理": ["机理", "机制", "作用", "疏通", "理筋", "整复", "滑利", "调整", "气血", "经络", "脏腑",
                 "血流", "肌电", "炎症", "代谢", "神经", "镇痛", "免疫"],
    "临床应用": ["适应", "禁忌", "主治", "治疗", "疗程", "辨证", "选穴", "注意", "慎用", "禁", "病证", "疗效"],
}

LEVELS_A = {
    "头面颈项": ["头", "面", "颈", "项", "枕", "颞", "额", "眉", "目", "耳", "鼻", "颏"],
    "胸腹": ["胸", "腹", "胁", "脐", "肋"],
    "背腰": ["背", "腰", "脊", "椎", "骶", "肩胛", "臀"],
    "四肢": ["肩", "臂", "肘", "腕", "手", "指", "髋", "腿", "膝", "踝", "足", "趾", "股", "胫"],
}

LEVELS_B = {
    "摆动摩擦": ["摆动", "滚法", "一指禅", "揉法", "摩法", "推法", "擦法", "搓法", "抹法"],
    "挤压振动": ["按法", "压法", "拿法", "捏法", "拨法", "振法", "颤法", "点法", "掐法"],
    "叩击": ["叩", "击", "拍", "捶", "弹", "劈"],
    "运动关节": ["摇", "扳", "拔伸", "牵引", "背", "屈伸", "旋转", "牵抖", "斜扳"],
}

LEVELS_C = {
    "疏通经络": ["疏通", "经络", "行气", "活血", "化瘀", "温经", "散寒"],
    "理筋整复": ["理筋", "整复", "复位", "松解", "剥离", "解痉", "粘连", "筋出槽"],
    "滑利关节": ["滑利", "关节", "活动度", "僵硬", "粘连", "屈伸", "弹响"],
    "调整脏腑": ["脏腑", "脾胃", "气血", "阴阳", "安神", "补虚", "泻实", "调和"],
}


def hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text, levels=None):
    t = text or ""
    out = {"digits": len(re.findall(r"\d", t)), "valueLike": 0, "levels": {}}
    if levels:
        for k, kws in levels.items():
            out["levels"][k] = sum(t.count(w) for w in kws)
    out["valueLike"] = len(re.findall(r"\d+(?:\.\d+)?\s*(?:次/分|次|分钟|秒|公斤|kg|N|牛顿|度|°|寸|cm|天|周|疗程)", t))
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
        for g, lv in (("view", VIEWS), ("A_part", LEVELS_A), ("B_hand", LEVELS_B), ("C_effect", LEVELS_C)):
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
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "script": "scripts/build_tuina_text.py"},
               "counts": counts, "views": VIEWS, "levels": LEVELS_C, "probe": probe, "ratio": ratios,
               "chapters": [{"no": c["no"], "title": c["title"], "units": c["units"], "hanzi": c["hanzi"]} for c in chapters],
               "units": units},
              open(os.path.join(OUT, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "sheets": len(wb.sheetnames)},
               "contentSheets": [c["title"] for c in chapters],
               "platformSheets": [n for n in wb.sheetnames if not re.match(r"^(\d{2})\s+", n.strip())],
               "axes": {"views": list(VIEWS), "levels": list(LEVELS_C), "probe": probe, "ratio": ratios,
                        "note": "三辨＝手法操作/作用机理/临床应用；四位面取三候选比值最小且与教材结构同构者"}},
              open(os.path.join(OUT, "METHOD.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"counts": counts, "probe": probe, "ratio": ratios},
              open(os.path.join(OUT, "axis-probe.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    wb.close()
    print(f"章 {counts['chapters']} · 单元 {counts['units']} · 汉字 {counts['hanzi']:,} · 数值命中 {counts['valueLike']}")
    print("词频:", json.dumps(probe, ensure_ascii=False))
    print("比值:", json.dumps(ratios, ensure_ascii=False))


if __name__ == "__main__":
    main()
