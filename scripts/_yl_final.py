# -*- coding: utf-8 -*-
"""药理学收尾：chapters.json / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
SUB, DEPT, TITLE = "yaoli-xue", "departments/09-jichu/12-yaoli-xue", "药理学"

U = json.load(io.open(os.path.join(S, SUB, "units.json"), encoding="utf-8"))
CM = json.load(io.open(os.path.join(S, SUB, "chapter-map.json"), encoding="utf-8"))["chapters"]
C, P, R = U["counts"], U["probe"], U["ratio"]
dpath = os.path.join(ROOT, DEPT)

rows, tbl, tot = [], [], 0
for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]):
    keep = set(v["units"])
    us = [x for x in U["units"] if x["sub"] in keep]
    hz = sum(x["hanzi"] for x in us)
    tot += hz
    rows.append({"n": v["n"], "slug": slug, "title": v["title"], "status": "🚧",
                 "docs": "docs/zh.md", "code": "code/main.js"})
    tbl.append(f"| {v['n']} | {v['title']} | {len(us)} | {hz:,} |")
json.dump({"note": "药理学 49 章 = 教材 49 章（1:1）。", "chapters": rows},
          io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

blocks = "\n".join(
    f"### {v['n']:02d} {v['title']}\n\n" + "\n".join(f"- {u['title']}（{u['hanzi']} 字）"
                                                    for u in U["units"] if u["chapter"] == str(v["n"])) + "\n"
    for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]))

readme = f"""# 药理学

**12-yaoli-xue** · 基础医学院 · {len(rows)} 章 · {C['units']} 单元 · {tot:,} 汉字

> 药理学的判据是「靶点—效应—风险」三件套：说得出靶点，才说得清不良反应。

## 一、底本

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/{U['source']['file']}` |
| sha256 | `{U['source']['sha256'][:16]}…` |
| 规模 | **49 章 / {C['units']} 单元 / {C['hanzi']:,} 汉字**（教材口径） |
| 章节目标 | 49（**1:1，无合并拆分，无单元复用**） |

## 二、章表

| # | 章 | 单元 | 汉字 |
|--:|---|--:|--:|
{chr(10).join(tbl)}

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
{chr(10).join(f"| **{k}** | **{v}** |" for k, v in P['view'].items())}

三辨极差 **{R['view']}×**——「药效与机制」占绝对多数（{P['view'].get('药效与机制',0):,}），
「临床应用与不良反应」只有 {P['view'].get('临床应用与不良反应',0):,}。这不是切分错误：**药理教材七成篇幅在讲作用与机制**，
适应证与不良反应写得更简，且常用具体病名（「高血压」「心衰」）而非「临床应用」四字。偏斜如实保留。

| 四位面（教材章群结构） | 章 | 汉字 |
|---|---|--:|
| 总论 | 1–4 | {P['A_part']['总论']:,} |
| 传出神经与中枢 | 5–21 | {P['A_part']['传出神经与中枢']:,} |
| 心血管与内脏 | 22–37 | {P['A_part']['心血管与内脏']:,} |
| 化疗与免疫 | 38–49 | {P['A_part']['化疗与免疫']:,} |

四位面极差 **{R['A_part']}×**（结构分区，不靠词频）。

## 四、这门课的读法

49 章按「总论 → 传出神经 → 中枢 → 心血管与内脏 → 化疗与免疫」排，每章都要求回答三问：

1. **靶点在哪儿**（受体/酶/通道/转运体/病原体结构）；
2. **效应是什么**（治疗作用与主要不良反应往往是同一靶点的两面）；
3. **风险怎么来的**（剂量、途径、相互作用、特殊人群）。

第 2、3 章（药效学、药动学）是全书的工具章，后面 46 章都在这两根轴上展开。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "12-yaoli-xue"
node tests/test_chapter_code.js | grep -c "12-yaoli-xue"
python scripts/build_course_generic.py --sub yaoli-xue --xlsx "F:/textbooks/{U['source']['file']}" \\
  --views '<同 axes.json>' --levels '<同 axes.json>'
```

**免责声明：** 本课为教学材料。**具体剂量、给药间隔、儿童与孕产妇用法一律以现行药典与药品说明书为准**；
本课只讲机制与风险，不给处方建议。
"""
io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

gap = f"""# 药理学 缺口登记

## 一、无剂量与说明书级信息（本课最硬的自我限制）

| 类型 | 处理 |
|---|---|
| 具体剂量（mg/kg、日剂量） | 不写——随药典与说明书，教材版本随时过期 |
| 给药间隔与疗程 | 只写机制决定的「为什么这样给」，不写数字 |
| 儿童/孕产妇/肝肾功能调整 | 标「须查说明书」 |

原因：剂量写错比不写更危险。教材上的剂量也不宜作为处方依据。

## 二、无图表（教材与课程都缺）

剂量—效应曲线、受体信号通路、药动学曲线本应以图呈现，**教材为纯文字**，本课亦无图。

## 三、三辨偏斜说明

三辨极差 {R['view']}×：「药效与机制」{P['view'].get('药效与机制',0):,} vs「临床应用与不良反应」{P['view'].get('临床应用与不良反应',0):,}。
原因是教材的写法，不是切分错误；已如实标注，未通过换词凑平。

## 四、与《中药药理学》的分工

本库另有 `07-zhongyao-yaoli-xue`（中药药理学，11 章）。两者**不重复**：
本课讲**化学药物**的靶点与机制（西医基础课），那门讲**中药**的效应与机制。
汉字不相加，引用时须分清。

## 五、不做的事

1. 不给处方与用药方案；
2. 不把动物实验结论当人体结论（机制章尤其要分开写）；
3. 不替代《临床药理学》与各科治疗学。
"""
io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)

# 章内单元清单（便于逐章核对）
io.open(os.path.join(dpath, "章内单元清单.md"), "w", encoding="utf-8").write(
    "# 药理学 章内单元清单\n\n> 由 `scripts/_yl_final.py` 从 `standards/yaoli-xue/units.json` 现算。\n\n" + blocks)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 12-yaoli-xue" not in s:
    add = f"""### 建 12-yaoli-xue（药理学·教材课，基础医学院第 4 门）

底本 `qhzy-药理学.xlsx`（49 内容章 / {C['units']} 单元 / {C['hanzi']:,} 汉字）。

- **49 教材章 → 49 课程章（1:1）**，无合并拆分、无单元复用；{tot:,} 汉字；目标 49 不变
- 三辨 药效与机制 {P['view'].get('药效与机制',0):,} / 药动与用法 {P['view'].get('药动与用法',0):,} / 临床应用与不良反应 {P['view'].get('临床应用与不良反应',0):,}（**{R['view']}×**，教材写法所致）
- 四位面＝章群结构分区（**{R['A_part']}×**）：总论 / 传出与中枢 / 心血管内脏 / 化疗免疫
- **不写剂量与疗程数值**：只讲机制与风险，剂量随药典与说明书（缺口登记第一节）
- 与《中药药理学》分工写明：本课化学药、那门中药，汉字不相加

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("changelog appended")
print(f"done: {len(rows)} 章 {tot:,} 汉字")
