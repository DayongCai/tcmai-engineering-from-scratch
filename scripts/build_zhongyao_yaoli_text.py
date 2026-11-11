#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_zhongyao_yaoli_text.py —— 《中药化学》工作簿 → 底本 + 单元层

母本：F:\\textbooks\\qhzy-中药化学.xlsx（29 表 = 17 前置/平台 + 12 内容章）
  内容章表名形如 `03 脊柱病证推拿治疗`；五列：章 / 节 / 小节 / 段 / 内容；节 `3.1`（= 一个病证）、小节 `3.1.1`。
  段=k 是段标题行，段=1k 是正文（与其余各门同约定）。

产出（standards/zhiliao/）：底本.json · 成分库.json · units.json · METHOD.json · axis-probe.json

口径：
  三辨＝**结构特征 / 理化性质 / 提分与检识**
    结构——骨架类型、母核、苷元与糖基、取代基与立体构型；
    性质——溶解度、极性、酸碱性、显色与沉淀反应（决定怎么分）；
    提分与检识——溶剂选择、色谱方法、显色剂与 Rf（决定怎么拿到手、怎么认出来）。
    三者是一条链：结构决定性质，性质决定方法；教材每类化合物都按这条链写。
  四位面取 A 生源途径（实测比值最小，且是教材分类的底层依据）；B 手法类 9.2×、C 治疗环节 5.4× 留痕不取。
    A 生源途径：乙酸-丙二酸 / 莽草酸 / 甲戊二羟酸 / 氨基酸（中药化学的骨架分类依据）
    B 手法类别：摆动摩擦 / 挤压 / 叩击振动 / 运动关节
    C 治疗环节：评估诊断 / 手法治疗 / 调护康复 / 疗效
"""
import hashlib
import json
import os
import re

import openpyxl

SRC = r"F:\textbooks\qhzy-中药药理学.xlsx"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "standards", "zhongyao-yaoli")

SUB_TITLE = re.compile(r"^(\d+\.\d+\.\d+)\s+(.+)$")
SEG_TITLE = re.compile(r"^(\d+\.\d+\.\d+\.\d+)\s+(.+)$")
HANZI = re.compile(r"[\u4e00-\u9fff]")

VIEWS = {
    "药理作用": ["作用", "效应", "抑制", "兴奋", "增强", "降低", "扩张", "收缩", "抗炎", "抗菌",
                 "抗氧化", "调节", "改善", "保护", "促进", "减少"],
    "作用机制": ["机制", "通路", "受体", "信号", "表达", "上调", "下调", "介导", "靶点", "酶",
                 "细胞因子", "炎症因子", "自由基", "通路"],
    "实验证据": ["实验", "模型", "大鼠", "小鼠", "细胞", "体外", "体内", "剂量", "灌胃", "给药",
                 "对照", "阳性药", "统计学", "观察", "检测", "指标"],
}

# A 生源途径（中药化学的骨架分类依据）
LEVELS_A = {
    "心脑血管": ["心血管", "心肌", "血压", "血管", "血栓", "血小板", "心律", "微循环", "脑缺血", "血脂"],
    "消化与代谢": ["胃肠", "胃", "肠", "消化", "肝", "血糖", "血脂", "代谢", "胆汁"],
    "免疫与肿瘤": ["免疫", "巨噬", "淋巴细胞", "抗体", "肿瘤", "抑瘤", "细胞因子"],
    "神经与内分泌": ["神经", "中枢", "镇静", "催眠", "镇痛", "体温", "内分泌", "激素", "下丘脑"],
}

LEVELS_B = {
    "解表清热": ["解表", "发汗", "清热", "解毒", "抗菌", "抗病毒", "抗炎", "退热"],
    "活血止血": ["活血", "化瘀", "止血", "抗血栓", "血小板", "微循环", "血流"],
    "补虚与免疫": ["补虚", "补气", "补血", "补阴", "补阳", "免疫", "强壮"],
    "化痰安神平肝": ["化痰", "止咳", "平喘", "安神", "镇静", "平肝", "息风", "抗惊厥"],
}

LEVELS_C = {
    "药效学": ["药效", "量效", "剂量-效应", "ED50", "作用强度", "时效"],
    "药动学": ["药动", "吸收", "分布", "代谢", "排泄", "血药浓度", "半衰期", "生物利用度"],
    "毒理与安全": ["毒性", "毒理", "安全", "不良反应", "LD50", "靶器官"],
    "方法学与证据": ["模型", "方法", "指标", "证据", "评价", "规范", "转化"],
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
              open(os.path.join(OUT, "成分库.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"source": {"file": os.path.basename(SRC), "sha256": sha, "script": "scripts/build_zhongyao_yaoli_text.py"},
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
