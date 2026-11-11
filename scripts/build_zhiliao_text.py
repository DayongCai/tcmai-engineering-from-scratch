#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_zhiliao_text.py —— 《推拿治疗学》工作簿 → 底本 + 单元层

母本：F:\\textbooks\\qhzy-推拿治疗学.xlsx（29 表 = 17 前置/平台 + 12 内容章）
  内容章表名形如 `03 脊柱病证推拿治疗`；五列：章 / 节 / 小节 / 段 / 内容；节 `3.1`（= 一个病证）、小节 `3.1.1`。
  段=k 是段标题行，段=1k 是正文（与其余各门同约定）。

产出（standards/zhiliao/）：底本.json · 病证库.json · units.json · METHOD.json · axis-probe.json

口径：
  三辨＝**病证辨识 / 手法方案 / 疗程调护**
    辨识——分型、辨证、诊断要点、鉴别；
    方案——取穴与部位、手法组合、操作顺序；
    调护——疗程、频次、禁忌、功能锻炼与注意事项。
  四位面取 A 病证部位（实测 2.8× 最小）；B 手法类 9.2×、C 治疗环节 5.4× 留痕不取。
    A 病证部位：脊柱 / 四肢关节筋伤 / 内科 / 妇科儿科五官
    B 手法类别：摆动摩擦 / 挤压 / 叩击振动 / 运动关节
    C 治疗环节：评估诊断 / 手法治疗 / 调护康复 / 疗效
"""
import hashlib
import json
import os
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-推拿治疗学.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "zhiliao")

SUB_TITLE = re.compile(r"^(\d+\.\d+\.\d+)\s+(.+)$")
SEG_TITLE = re.compile(r"^(\d+\.\d+\.\d+\.\d+)\s+(.+)$")
HANZI = re.compile(r"[\u4e00-\u9fff]")

VIEWS = {
    "病证辨识": ["辨证", "分型", "诊断", "鉴别", "病因", "病机", "症状", "体征", "试验", "影像", "舌", "脉"],
    "手法方案": ["手法", "取穴", "穴位", "部位", "操作", "顺序", "力度", "频率", "时间", "施术", "按揉", "推拿"],
    "疗程调护": ["疗程", "频次", "每日", "每次", "分钟", "注意", "禁忌", "调护", "锻炼", "巩固", "复发", "预防"],
}

LEVELS_A = {
    "脊柱": ["颈", "腰", "胸椎", "骶", "脊柱", "椎间盘", "颈椎", "腰椎"],
    "四肢关节筋伤": ["肩", "肘", "腕", "膝", "踝", "腱", "筋", "关节", "肌肉", "韧带"],
    "内科": ["胃", "肠", "便秘", "泄泻", "头痛", "失眠", "高血压", "咳", "喘", "中风"],
    "妇科儿科五官": ["月经", "痛经", "产后", "乳", "小儿", "儿", "目", "耳", "鼻", "咽"],
}

LEVELS_B = {
    "摆动摩擦": ["一指禅", "滚法", "㨰法", "揉法", "摩法", "推法", "擦法", "搓法", "抹法"],
    "挤压": ["按法", "点法", "拿法", "捏法", "拨法", "弹拨", "掐法"],
    "叩击振动": ["拍法", "击法", "叩", "振法", "抖法", "弹法"],
    "运动关节": ["摇法", "扳法", "拔伸", "牵引", "斜扳", "旋转"],
}

LEVELS_C = {
    "评估诊断": ["辨证", "诊断", "分型", "检查", "试验", "影像", "鉴别"],
    "手法治疗": ["手法", "操作", "取穴", "施术", "按揉", "推拿", "治疗"],
    "调护康复": ["调护", "锻炼", "功能", "预防", "巩固", "注意", "禁忌"],
    "疗效": ["疗效", "有效", "显效", "治愈", "评价", "随访", "复发"],
}


def hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text, levels=None):
    t = text or ""
    out = {"digits": len(re.findall(r"\d", t)), "valueLike": 0, "levels": {}}
    if levels:
        for k, kws in levels.items():
            out["levels"][k] = sum(t.count(w) for w in kws)
    out["valueLike"] = len(re.findall(r"\d+(?:\.\d+)?\s*(?:次|分钟|天|日|周|疗程|寸|度|°|次/分)", t))
    return out


def main():
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    sha = hashlib.sha256(open(SRC, "rb").read()).hexdigest()

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
                            "levels": measure(prose, LEVELS_A)["levels"]},
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
        for g, lv in (("view", VIEWS), ("A_part", LEVELS_A), ("B_hand", LEVELS_B), ("C_stage", LEVELS_C)):
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
               "counts": counts, "chapters": chapters, "diseases": diseases},
              open(os.path.join(OUT, "底本.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha},
               "counts": {"病证": len(diseases)}, "diseases": diseases},
              open(os.path.join(OUT, "病证库.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "script": "scripts/build_zhiliao_text.py"},
               "counts": counts, "views": VIEWS, "levels": LEVELS_A, "probe": probe, "ratio": ratios,
               "chapters": [{"no": c["no"], "title": c["title"], "units": c["units"], "hanzi": c["hanzi"]} for c in chapters],
               "units": units},
              open(os.path.join(OUT, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "sheets": len(wb.sheetnames)},
               "contentSheets": [c["title"] for c in chapters],
               "platformSheets": [n for n in wb.sheetnames if not re.match(r"^(\d{2})\s+", n.strip())],
               "axes": {"views": list(VIEWS), "levels": list(LEVELS_A), "probe": probe, "ratio": ratios,
                        "note": "三辨＝病证辨识/手法方案/疗程调护；四位面取三候选比值最小者"}},
              open(os.path.join(OUT, "METHOD.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"counts": counts, "probe": probe, "ratio": ratios},
              open(os.path.join(OUT, "axis-probe.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    wb.close()
    print(f"章 {counts['chapters']} · 单元 {counts['units']} · 病证 {counts['diseases']} · 汉字 {counts['hanzi']:,} · 数值 {counts['valueLike']}")
    print("词频:", json.dumps(probe, ensure_ascii=False))
    print("比值:", json.dumps(ratios, ensure_ascii=False))


if __name__ == "__main__":
    main()
