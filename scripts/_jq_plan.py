# -*- coding: utf-8 -*-
"""16-jiqi-xuexi（机器学习·教材课，16 章 1:1）：chapter-map → 脚手架 → docs。"""
import io
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
PY = sys.executable
SUB, DEPT = "jiqi-xuexi", "departments/07-zhineng/16-jiqi-xuexi"
TITLE = "机器学习"

SLUGS = ["xulun", "moxing-pinggu-yu-xuanze", "xianxing-moxing", "juece-shu", "shenjing-wangluo",
         "zhichi-xiangliang-ji", "beiyesi-fenleiqiu", "jicheng-xuexi", "julei", "jiangwei-yu-duliang",
         "tezheng-xuanze-yu-xishu", "jisuan-xuexi-lilun", "banyou-jian-xuexi", "gailv-tu-moxing",
         "guize-xuexi", "qianghua-xuexi"]
WHY = ["绪论：机器学习解决什么问题、凭什么说它成立", "评估与选择：过拟合是这门课的第一敌人",
       "线性模型：从最小二乘到逻辑回归", "决策树：划分准则决定树的形状",
       "神经网络：多层与反向传播", "支持向量机：间隔与核技巧",
       "贝叶斯分类器：先验与似然的合成", "集成学习：偏差—方差的两条路",
       "聚类：无标签时的相似性定义", "降维与度量学习：把距离学出来",
       "特征选择与稀疏：稀疏是一种先验", "计算学习理论：泛化界说明了什么",
       "半监督学习：少量标注如何放大", "概率图模型：把依赖写成图",
       "规则学习：可解释性与覆盖", "强化学习：序贯决策与回报"]
PLANES = {"基础与评估": [1, 2], "经典模型": [3, 4, 5, 6], "进阶与集成": [7, 8, 9, 10, 11, 12],
          "应用与前沿": [13, 14, 15, 16]}

U = json.load(io.open(os.path.join(S, SUB, "units.json"), encoding="utf-8"))
CH = {c["no"]: c["title"] for c in U["chapters"]}
by = {}
for u in U["units"]:
    by.setdefault(int(u["chapter"]), []).append(u)

CM = {}
for n in sorted(by):
    slug = f"{n:02d}-{SLUGS[n - 1]}"
    assert slug == slug.lower()
    CM[slug] = {"n": n, "title": CH[n], "units": [u["sub"] for u in by[n]], "srcChapters": [str(n)],
                "why": WHY[n - 1], "derivedFrom": f"教材第{n}章"}
json.dump({"note": "机器学习 16 章 = 教材 16 章（1:1）。", "chapters": CM},
          io.open(os.path.join(S, SUB, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

for u in U["units"]:
    u["measure"]["levels"] = {p: (u["hanzi"] if int(u["chapter"]) in chs else 0) for p, chs in PLANES.items()}
tp = {p: sum(u["hanzi"] for u in U["units"] if int(u["chapter"]) in chs) for p, chs in PLANES.items()}
U["levels"] = {k: [k] for k in PLANES}
U["probe"]["A_part"] = tp
U["ratio"]["A_part"] = round(max(tp.values()) / max(1, min(tp.values())), 1)
json.dump(U, io.open(os.path.join(S, SUB, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
ax = json.load(io.open(os.path.join(S, SUB, "axes.json"), encoding="utf-8"))
ax.update({"levelsA": PLANES, "probe": U["probe"], "ratio": U["ratio"]})
json.dump(ax, io.open(os.path.join(S, SUB, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

fb = {s: [f"《机器学习·{v['title']}》", f"教材第{v['n']}章；章号一一对应"] for s, v in CM.items()}
cq = {s: [f"{v['title']}：这一章的判据是什么，什么算「会用」", v["why"]] for s, v in CM.items()}
json.dump({"courseTitle": TITLE, "deptPath": DEPT, "xlsx": f"F:/textbooks/{U['source']['file']}",
           "chain": "问题与评估 → 经典模型 → 进阶与集成 → 应用与前沿",
           "levelLabel": "章群结构",
           "objectPressure": "机器学习的判据是「假设—损失—泛化」三件套：假设空间多大、损失怎么定、泛化凭什么保证",
           "reportRule": "实验记录写：数据与切分、模型与超参、评估指标、与基线的差",
           "gapNote": "教材无插图；图注独立成文。**不写可直接运行的患者数据与诊疗结论**",
           "chapterQ": cq, "fallback": fb, "defaultCite": ["《机器学习》", "教材章名级"]},
          io.open(os.path.join(S, SUB, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"plan: {len(CM)} 章 / {len(U['units'])} 单元 · 三辨 {U['ratio']['view']}× · 四位面 {U['ratio']['A_part']}×")

chdir = os.path.join(ROOT, DEPT, "chapters")
if os.path.isdir(chdir):
    left = [d for d in os.listdir(chdir) if os.path.exists(os.path.join(chdir, d, "docs", "zh.md"))]
    assert not left, f"已有正文 {len(left)} 章，拒绝重建"
for cmd in ([PY, "scripts/scaffold_huli_chapter.py", SUB, DEPT, "--all"],
            [PY, "scripts/build_huli_docs.py", SUB, DEPT]):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print("  ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])
