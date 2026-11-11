#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_neike_units.py —— 中医内科学：底本 → 单元层（一病一节 → 五段式单元）

母本：`E:/textbooks/qhzy-中医内科学.xlsx`（12 章 / 83 节 / 384 小节 / 329,826 汉字），
已由既有 `standards/neike/底本.json` 结构化（段序号=1 是条目标题、11 是正文）。

与本库前五门课同一契约：
- `units.json`：一单元＝一个小节（4.1.1 概述 / 4.1.2 病因病机 / 4.1.3 辨证论治 …），
  正文取该小节下所有条目的 body 拼接；
- 每单元带 `hanzi`（汉字数）、`terms`（关键词计数）、`values`（数值计数）；
- 另出 `axis-probe.json`：三辨／四位面候选轴的全库词频实测，供定口径用（口径一旦定下写进 METHOD.json）。

运行：python scripts/build_neike_units.py
"""
import hashlib
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "standards", "neike", "底本.json")
OUT_DIR = os.path.join(ROOT, "standards", "neike")

HANZI = re.compile(r"[\u4e00-\u9fff]")
VALUE = re.compile(r"\d+(?:\.\d+)?\s*(?:%|mL|ml|g|mg|mmHg|℃|天|日|周|月|年|次|岁|小时|分钟)")

# 三辨候选（每单元分别计数，全部是字面出现次数，不做推断）
VIEW_TERMS = {
    "病因": ["病因", "风寒", "风热", "暑湿", "燥", "湿邪", "疫毒", "情志", "饮食", "劳倦", "房劳", "外伤", "虫"],
    "病机": ["病机", "病位", "病性", "虚实", "传变", "化热", "伤阴", "气滞", "血瘀", "痰", "水饮", "阳衰", "阴亏"],
    "证候表现": ["症见", "舌", "脉", "主症", "次症", "症状", "表现", "恶寒", "发热", "疼痛", "呕", "泻"],
}

# 四位面候选 A：脏腑四组（教科书第 4–10 章的编排纲）
SURFACE_A = {
    "肺系": ["肺", "大肠", "鼻", "咽喉", "卫表", "咳", "喘"],
    "心系": ["心", "小肠", "神", "悸", "胸痹", "脉"],
    "脾胃系": ["脾", "胃", "肠", "脘", "腹", "食", "呕", "泻"],
    "肝肾系": ["肝", "胆", "肾", "膀胱", "腰", "筋", "水", "尿"],
}

# 四位面候选 B：三焦
SURFACE_B = {
    "上焦": ["上焦", "肺", "心", "胸", "咽喉"],
    "中焦": ["中焦", "脾", "胃", "脘", "腹"],
    "下焦": ["下焦", "肾", "膀胱", "肝", "二便", "腰"],
}

# 四位面候选 C：气血津液 + 形体
SURFACE_C = {
    "气": ["气", "气虚", "气滞", "气逆"],
    "血": ["血", "血虚", "血瘀", "出血"],
    "津液": ["津液", "痰", "饮", "水", "湿", "汗"],
    "形体": ["形", "肌", "骨", "肢", "经络", "关节"],
}


def count_terms(text, groups):
    return {g: sum(text.count(t) for t in terms) for g, terms in groups.items()}


def main():
    book = json.load(open(SRC, encoding="utf-8"))
    units = []
    probe = {"views": {}, "surfaceA": {}, "surfaceB": {}, "surfaceC": {}}

    for ch in book["chapters"]:
        for sec in ch["secs"]:
            for sub in sec["subs"]:
                prose = "\n".join(it.get("body") or "" for it in sub.get("items") or [])
                hanzi = len(HANZI.findall(prose))
                units.append({
                    "chapter": ch["no"],
                    "chapterTitle": re.sub(r"^第\d+章\s*", "", ch["title"]),
                    "sec": sec["no"],
                    "secTitle": sec["title"],
                    "no": sub["no"],
                    "title": sub["title"],
                    "items": len(sub.get("items") or []),
                    "hanzi": hanzi,
                    "values": len(VALUE.findall(prose)),
                    "terms": count_terms(prose, VIEW_TERMS),
                    "prose": prose,
                })
                for key, groups in (("views", VIEW_TERMS), ("surfaceA", SURFACE_A),
                                    ("surfaceB", SURFACE_B), ("surfaceC", SURFACE_C)):
                    for g, n in count_terms(prose, groups).items():
                        probe[key][g] = probe[key].get(g, 0) + n

    counts = {
        "chapters": len(book["chapters"]),
        "secs": sum(len(ch["secs"]) for ch in book["chapters"]),
        "units": len(units),
        "hanzi": sum(u["hanzi"] for u in units),
        "values": sum(u["values"] for u in units),
    }
    units_doc = {
        "subject": "10-zhongyi-neike-xue",
        "title": "中医内科学",
        "source": book["source"],
        "counts": counts,
        "unitRule": "一单元＝一个小节（X.Y.Z），正文＝该小节全部条目 body 拼接；章号＝教材章号",
        "units": units,
    }
    json.dump(units_doc, open(os.path.join(OUT_DIR, "units.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    method = {
        "subject": "中医内科学",
        "textbook": book["source"],
        "counts": counts,
        "why": "教材 12 章与课程 chapters.json 一一对应（原排课期 14 章粗分作废）；"
               "总论 1–3 章讲方法与治则，各论 4–12 章按脏腑／病类分章。",
        "axisProbe": probe,
        "note": "口径（三辨／四位面）由 axis-probe.json 实测后定，理由写进 README 与章内正文。",
    }
    json.dump(method, open(os.path.join(OUT_DIR, "METHOD.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    json.dump({"probe": probe, "counts": counts},
              open(os.path.join(OUT_DIR, "axis-probe.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    sha = hashlib.sha256(open(SRC, "rb").read()).hexdigest()[:12]
    print(f"底本 sha256:{sha} · {counts['chapters']} 章 / {counts['secs']} 节 / "
          f"{counts['units']} 单元 / {counts['hanzi']:,} 汉字 · 数值 {counts['values']}")
    for key in ("views", "surfaceA", "surfaceB", "surfaceC"):
        print(f"  {key}: " + "、".join(f"{g} {n:,}" for g, n in probe[key].items()))


if __name__ == "__main__":
    main()
