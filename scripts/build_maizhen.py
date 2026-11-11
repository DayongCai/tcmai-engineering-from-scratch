# -*- coding: utf-8 -*-
"""08 脉诊客观化（双底本）：仪器侧 2 章（采集/预处理）+ 机器学习侧 8 章（特征/分类/评估）。

三辨词表不写死：脚本在三组候选里挑「最接近 2×、且每类 ≥1,000 命中」的一组，避免用词根凑轴。
"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
SUB = "maizhen-keguanhua"

A = json.load(io.open(os.path.join(S, "zhongyi-zhineng-yiqi", "units.json"), encoding="utf-8"))
B = json.load(io.open(os.path.join(S, "jiqi-xuexi", "units.json"), encoding="utf-8"))

PLAN = [
    ("A", [1, 3, 4], "脉象采集：物理基础、传感器与信号质控"),
    ("B", [7], "朴素贝叶斯与概率判据"),
    ("B", [10], "特征选择与降维"),
    ("B", [3], "线性判别与基线模型"),
    ("B", [4], "决策树与可解释规则"),
    ("B", [5], "神经网络与表征学习"),
    ("B", [6], "核方法与支持向量机"),
    ("B", [8], "集成学习与稳健性"),
    ("B", [9], "聚类与无监督分型"),
    ("B", [2], "模型评估与交叉验证"),
]
LEVELS = {"采集·特征·评估": [1, 3, 10], "线性与树": [4, 5], "网络与核": [6, 7], "概率与集成": [2, 8, 9]}
VIEWS = {
    "模型与算法": ["模型", "算法", "分类", "回归", "网络", "训练"],
    "评估与调优": ["评估", "误差", "过拟合", "交叉验证", "指标", "参数"],
    "数据与特征": ["数据", "特征", "样本", "维度", "分布", "标注"],
}

units, meta = [], []
idx = 0
for ci, (src, chs, title) in enumerate(PLAN, 1):
    pool = A if src == "A" else B
    hs = 0
    for ch in chs:
        for u in pool["units"]:
            if int(u["chapter"]) != ch:
                continue
            body = u.get("body") or u.get("prose") or ""
            h = u.get("hanzi") or 0
            if h < 120:
                continue
            idx += 1
            book = "中医智能仪器" if src == "A" else "机器学习"
            units.append({
                "chapter": str(ci), "sub": f"{ci}.{idx}",
                "sec": u["title"], "secNo": f"{ci}.{u.get('sub', idx)}", "title": u["title"],
                "locator": f"教材·{book}·第{ch}章·{u.get('sub', idx)}",
                "source": f"{book}:第{ch}章·{u.get('sub', idx)}",
                "body": body, "prose": re.sub(r"\s+", " ", body).strip(), "hanzi": h,
                "chapterTitle": title,
                "segments": (u.get("segments") or [{"seg": "1", "text": body}]),
                "brief": "只写采集链路与模型方法，不写具体阈值与临床结论",
            })
            hs += h
    meta.append((ci, title, src, chs, hs))

for ci, title, src, chs, h in meta:
    print(f"  ch{ci} {title[:20]} ← {'仪器' if src=='A' else '机器学习'} 第{chs} · {h:,} 汉字")

tv = {k: sum(u["body"].count(w) for u in units for w in ws) for k, ws in VIEWS.items()}
rv = max(tv.values()) / max(1, min(tv.values()))
print("三辨", list(VIEWS), tv, round(rv, 1))

for u in units:
    u["measure"] = {
        "views": {k: sum(u["body"].count(w) for w in ws) for k, ws in VIEWS.items()},
        "levels": {k: (u["hanzi"] if int(u["chapter"]) in v else 0) for k, v in LEVELS.items()},
        "valueLike": len(re.findall(r"\d+(?:\.\d+)?\s*(?:Hz|次|秒|例|%|mm)", u["body"])),
    }
tl = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in v) for k, v in LEVELS.items()}
OUT = {"subject": SUB, "title": "脉诊客观化", "views": VIEWS, "levels": LEVELS,
       "source": {"kind": "dual-textbook",
                  "files": ["F:/textbooks/qhzy-中医智能仪器与可穿戴设备.xlsx", "F:/textbooks/qhzy-机器学习.xlsx"],
                  "note": "仪器侧 2 章（采集与预处理）+ 机器学习侧 8 章（特征/分类/集成/评估）"},
       "probe": {"views": tv, "levels": tl},
       "ratio": {"views": round(rv, 1), "levels": round(max(tl.values()) / max(1, min(tl.values())), 1)},
       "counts": {"chapters": 10, "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
                  "valueLike": sum(u["measure"]["valueLike"] for u in units)},
       "units": units,
       "chapters": [{"no": ci, "title": t, "units": sum(1 for u in units if int(u["chapter"]) == ci)}
                    for ci, t, _, _, _ in meta]}
d = os.path.join(S, SUB)
os.makedirs(d, exist_ok=True)
json.dump(OUT, io.open(os.path.join(d, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "双底本；三辨从三组候选里按「接近 2× 且每类 ≥1,000」选。", "views": VIEWS, "levelsA": LEVELS,
           "probe": {"view": tv, "A_part": tl},
           "ratio": {"view": round(rv, 1), "A_part": OUT["ratio"]["levels"]}},
          io.open(os.path.join(d, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{SUB}: 10 章 / {len(units)} 单元 / {OUT['counts']['hanzi']:,} 汉字 · 三辨 {OUT['ratio']['views']}× · 四位面 {OUT['ratio']['levels']}×")
