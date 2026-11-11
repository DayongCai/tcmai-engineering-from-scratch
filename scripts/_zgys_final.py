# -*- coding: utf-8 -*-
"""中国医学史收尾：chapters.json / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT_REL = "zhongguo-yixue-shi", "departments/01-zhongyi/03-zhongguo-yixue-shi"
D = os.path.join(ROOT, DEPT_REL)
U = json.load(io.open(os.path.join(ROOT, "standards", SUB, "units.json"), encoding="utf-8"))
CM = json.load(io.open(os.path.join(ROOT, "standards", SUB, "chapter-map.json"), encoding="utf-8"))["chapters"]
C, P, R = U["counts"], U["probe"], U["ratio"]

rows, doc_total, figs = [], 0, 0
for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]):
    p = os.path.join(D, "chapters", slug, "docs", "zh.md")
    doc_total += len(re.sub(r"\s", "", io.open(p, encoding="utf-8").read()))
    fp = os.path.join(D, "chapters", slug, "figures.json")
    if os.path.exists(fp):
        figs += len(json.load(io.open(fp, encoding="utf-8"))["figures"])
    rows.append({"n": v["n"], "slug": slug, "title": v["title"], "status": "🚧",
                 "docs": "docs/zh.md", "code": "code/main.js"})
json.dump({"slug": "03-zhongguo-yixue-shi", "title": "中国医学史",
           "note": "12 教材章 → 8 课程章（按朝代合并）。", "chapters": rows},
          io.open(os.path.join(D, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

table = "\n".join(f"| {v['n']} | {v['title']} | `{s}` | {len(v['units'])} | 教材第 {'、'.join(v['srcChapters'])} 章 |"
                  for s, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]))
readme = f"""# 中国医学史

**03-zhongguo-yixue-shi** · 中医学院 · {len(CM)} 章 · {C['units']} 单元 · {C['hanzi']:,} 汉字

> 判据是「人物—著作—制度」三件套：谁写的、写了什么、当时怎么组织医疗。

## 一、底本与结构

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/qhzy-中国医学史.xlsx`（12 内容章 / 95,999 汉字） |
| 课程章 | **{len(CM)} 章**（curriculum 目标 8） |
| 单元 | {C['units']} 个 |
| 课程正文 | {doc_total:,} 非空白字 · 图注 {figs} 条 |

**12 教材章 → 8 课程章**，四个合并点按朝代成对：

| 课程章 | 教材章 | 合并理由 |
|---|--:|---|
| 春秋战国至秦汉 | 3 + 4 | 由诸子争鸣到体系奠基，是一条连续线 |
| 魏晋南北朝至隋唐五代 | 5 + 6 | 分科细化到官修集成 |
| 近代与当代 | 9 + 10 | 冲击—回应—重建，同一问题的两段 |
| 少数民族医学、中外交流与数字化 | 11 + 12 | 两条「边缘视角」，与主线互照 |

## 二、章表

| # | 章 | slug | 单元 | 来源 |
|--:|---|---|--:|---|
{table}

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
{chr(10).join(f"| **{k}** | **{v:,}** |" for k, v in P['view'].items())}

三辨极差 **{R['view']}×**——三条线（医家著作 / 制度教育 / 疾病诊疗）基本齐平。
这是通史教材的形态：每个朝代都同时讲人、讲书、讲官制、讲病。

| 四位面（时代阶段） | 汉字 |
|---|--:|
{chr(10).join(f"| {k} | {v:,} |" for k, v in P['A_part'].items())}

四位面 **{R['A_part']}×**。

## 四、这门课的读法

读医学史最容易犯两个错：**用现代概念倒推古代**（把「辨证论治」当成自古如此的体系）、**把传说当史实**（三皇五帝、神农尝百草）。
本课的处理：

1. 人物与著作按**可考的成书年代**排，传说部分标注「传说」并说明其史学功能；
2. 制度沿革（太医署、医政、教育）单列，因为制度决定了知识怎么传；
3. 疾病与诊疗只写教材所述，**不用现代病名反推古代证候**。

## 五、插图与图注

{figs} 条图注（时间轴与人物关系），四要素齐备；正文只按图号回指。图版 0 张，见 `图示缺口.md`。

## 六、章内可执行验证

```bash
node code/main.js
node --test code/main.test.js
```

**免责声明：** 本课为教学材料，讲史学脉络，不作医学价值判断，不替代史料考据与医史文献学训练。
"""
io.open(os.path.join(D, "README.md"), "w", encoding="utf-8").write(readme)

gap = f"""# 中国医学史 缺口登记

## 一、无图像与出土文献

教材为通史文字体，**无图**。本课图注 {figs} 条为文字形态（时间轴与人物关系），图版 0 张。

缺的三类：

| 缺什么 | 影响 |
|---|---|
| 医书书影与版本图 | 无法核对版本差异 |
| 出土医简、帛书图版 | 先秦两汉部分只能转述教材结论 |
| 医家画像与器物图 | 人物与器具只能文字描述 |

## 二、传说与史实的分界

教材对三皇五帝、神农尝百草等传说有叙述。本课按「传说」标注，并说明其作为**史学功能**（解释医学起源的叙事）而非史实。
**不把传说当证据**，也不因此否定早期经验的真实性——两件事不能混。

## 三、不做现代概念倒推

「辨证论治」「整体观」等提法是后世（尤其近代）的概括。本课按教材所述年代呈现，**不用现代术语重构古代实践**。

## 四、不做的事

1. 不作医学价值判断（某朝代医学「先进/落后」）；
2. 不引未见于教材的史料；
3. 不替代医史文献学、版本学与出土文献研读。
"""
io.open(os.path.join(D, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 03-zhongguo-yixue-shi" not in s:
    add = f"""### 建 03-zhongguo-yixue-shi（中国医学史·教材课，中医系最后一门）

底本 `qhzy-中国医学史.xlsx`（12 内容章 / 95,999 汉字）→ **{len(CM)} 课程章 / {C['units']} 单元 / {C['hanzi']:,} 汉字**。

- 12 → 8 按朝代合并：3+4（秦汉）、5+6（隋唐）、9+10（近当代）、11+12（少数民族与交流、数字化）
- curriculum 章节目标 8 不变
- 三辨 医家与著作 / 制度与教育 / 疾病与诊疗 = {R['view']}×（通史形态，三条线齐平）
- 四位面 按时代阶段 = {R['A_part']}×
- 传说标注「传说」、不作现代概念倒推（缺口登记第二、三节）
- **建完中医系 22/22 满科**

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("CHANGELOG 已补")
print(f"8 章 · 正文 {doc_total:,} · 图注 {figs} · 三辨 {R['view']}× · 四位面 {R['A_part']}×")
