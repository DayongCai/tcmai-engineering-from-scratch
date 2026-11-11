# -*- coding: utf-8 -*-
"""实验针灸学收尾：chapters.json / README / 缺口登记 / CHANGELOG；顺手同步药植 README 的更正。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT, CODE = "shiyan-zhenjiu", "departments/03-zhenjiu/10-shiyan-zhenjiu-xue", "10-实验针灸学"
base = os.path.join(ROOT, "standards", SUB)
dpath = os.path.join(ROOT, DEPT)

U = json.load(io.open(os.path.join(base, "units.json"), encoding="utf-8"))
CM = json.load(io.open(os.path.join(base, "chapter-map.json"), encoding="utf-8"))["chapters"]
C, P, R = U["counts"], U["probe"], U["ratio"]

rows, tbl, tot = [], [], 0
for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]):
    keep = set(v["units"])
    us = [x for x in U["units"] if x["sub"] in keep]
    hz = sum(x["hanzi"] for x in us)
    tot += hz
    rows.append({"n": v["n"], "slug": slug, "title": v["title"], "status": "🚧",
                 "docs": "docs/zh.md", "code": "code/main.js"})
    tbl.append(f"| {v['n']} | {v['title']} | 教材 {'、'.join(v['srcChapters'])} | {len(us)} | {hz:,} |")
json.dump({"note": "实验针灸学 11 章 ← 教材 13 章（10+11 合并、12+13 合并；无单元复用）。", "chapters": rows},
          io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

readme = f"""# 实验针灸学

**10-shiyan-zhenjiu-xue** · 针灸推拿学院 · {len(rows)} 章 · {C['units']} 单元 · {tot:,} 汉字

> 章链：绪论 → 腧穴形态 → 经络现象 → 效应特点 → 镇痛 → 神经 → 内分泌免疫 → 循环呼吸消化 → 泌尿生殖运动 → 方法与模型 → 循证与前沿

## 一、底本

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/qhzy-实验针灸学.xlsx`（13 内容章） |
| sha256 | `{U['source']['sha256'][:16]}…` |
| 规模 | 13 章 / 55 单元 / 203,746 汉字（教材口径） |

## 二、章表（11 课程章 ← 13 教材章）

| # | 章 | 教材章 | 单元 | 汉字 |
|--:|---|---|--:|--:|
{chr(10).join(tbl)}

**合并理由**：第 10+11 章（方法与动物模型）同属「方法决定结论」，第 12+13 章（循证与前沿）同属「证据与方向」，
各合并一章；**无单元复用**。章节目标由 10 调为 **11**（合并后仍 20 万字，压到 10 章会让「方法」或「循证」之一被挤掉）。

## 三、三辨与四位面（实测）

| 三辨 | 词频 | 四位面（研究层次） | 词频 |
|---|--:|---|--:|
| **方法与技术** | **{P['view']['方法与技术']}** | 方法与证据 | {P['A_part']['方法与证据']} |
| **效应与机制** | **{P['view']['效应与机制']}** | 效应与特点 | {P['A_part']['效应与特点']} |
| **证据与临床** | **{P['view']['证据与临床']}** | 机制与通路 | {P['A_part']['机制与通路']} |
| | | 现象与结构 | {P['A_part']['现象与结构']} |

三辨极差 **{R['view']}×**；四位面极差 **{R['A_part']}×**。

**未取「靶系统」**（神经 {P['B_hand']['神经']} / 循环呼吸消化 {P['B_hand']['循环呼吸消化']} /
内分泌免疫 {P['B_hand']['内分泌免疫']} / 泌尿生殖运动 {P['B_hand']['泌尿生殖运动']}，**{R['B_hand']}×**）。

**未取不等于无用**：靶系统是**分章依据**（第 6–9 章就按它排），但作为四位面会把
「泌尿生殖运动」压到 {P['B_hand']['泌尿生殖运动']} 次，四类失衡；取「研究层次」则四类都在 500 以上。

## 四、这门课最大的教学风险

**把机制当结论**。教材里「针刺可调节 X 系统」的表述后面常跟着动物实验，
**动物有效不等于人体有效，指标变化不等于临床获益**。每章判据都要求区分三件事：
①有证据（人体研究）②有机制解释（动物/离体）③只有推测。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "10-shiyan-zhenjiu"
node tests/test_chapter_code.js | grep -c "10-shiyan-zhenjiu"
python scripts/build_shiyan_zhenjiu_text.py
```

**免责声明：** 本课为教学材料，实验结论以外文原文、系统评价与现行指南为准；不构成临床治疗依据。
"""
io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

gap = f"""# 实验针灸学 缺口登记

## 一、实验数据与图谱未入正文

教材给结论与代表性研究，**原始数据表、波形图、影像图未入正文**（版权与清晰度）。
补法：以开放获取系统评价与药典/指南为源，按《补源约定》逐条登记。

## 二、证据强弱不均，已如实标出

| 系统 | 教材篇幅 | 本课处理 |
|---|---|---|
| 镇痛 | 20,514 字（第 5 章独立成章） | 证据最厚 |
| 神经 | 15,843 字 | 独立成章 |
| 内分泌免疫 | 14,472 字 | 独立成章 |
| 循环呼吸消化 | 19,789 字 | 独立成章 |
| 泌尿生殖运动 | 14,892 字（靶系统词频仅 {P['B_hand']['泌尿生殖运动']}） | 独立成章，但**明确标注证据较薄** |

## 三、不做的事

1. **不把动物实验结论当人体结论**——每章判据要求分三层（证据/机制/推测）。
2. **不给治疗方案**——针刺参数、疗程属《针灸治疗学》范围。
3. **不追前沿名词**——第 11 章只讲证据分级的用法，不罗列热点。
"""
io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
tag = "建 10-实验针灸学"
if tag not in s:
    add = f"""
### 建 10-实验针灸学（针灸系第 11 门）

底本 `qhzy-实验针灸学.xlsx`（13 内容章）。`scripts/build_shiyan_zhenjiu_text.py` 产出
`standards/shiyan-zhenjiu/{{底本,units,类群库,axis-probe}}.json`。

- **13 教材章 → 11 课程章**，55 单元无复用；{tot:,} 汉字；章节目标 10 → **11**
- 三辨 方法与技术 {P['view']['方法与技术']} / 效应与机制 {P['view']['效应与机制']} / 证据与临床 {P['view']['证据与临床']}（**{R['view']}×**）
- 四位面 研究层次（{R['A_part']}×）；**靶系统 {R['B_hand']}× 未取**（泌尿生殖运动 {P['B_hand']['泌尿生殖运动']}），但靶系统仍是第 6–9 章的分章依据
- **纠错：同日先建的 02-药用植物学曾误用 `qhzy-中药鉴定学.xlsx` 作 SRC**（脚本克隆时 SRC 替换未生效，静默跑通），
  已改回药用植物学并重建：12 章 / **66** 单元 / **186,468** 汉字（原误报 52 单元 / 155,909 汉字为鉴定学数据），
  docs 与 chapters.json 全部重生成，sha256 现为 `93c58dc2dad4c4be88df…`。

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("changelog appended")
print("done:", len(rows), "章", tot, "汉字")
