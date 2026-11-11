# -*- coding: utf-8 -*-
"""针灸学收尾：chapters.json / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT = "zhenjiu-xue", "departments/03-zhenjiu/16-zhenjiu-xue"
base = os.path.join(ROOT, "standards", SUB)
dpath = os.path.join(ROOT, DEPT)

U = json.load(io.open(os.path.join(base, "units.json"), encoding="utf-8"))
CM = json.load(io.open(os.path.join(base, "chapter-map.json"), encoding="utf-8"))["chapters"]
C, P, R = U["counts"], U["probe"], U["ratio"]
PL = U["planes"]

rows, tbl, tot = [], [], 0
for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]):
    keep = set(v["units"])
    us = [x for x in U["units"] if x["sub"] in keep]
    hz = sum(x["hanzi"] for x in us)
    tot += hz
    rows.append({"n": v["n"], "slug": slug, "title": v["title"], "status": "🚧",
                 "docs": "docs/zh.md", "code": "code/main.js"})
    tbl.append(f"| {v['n']} | {slug} | {v['title']} | {len(us)} | {hz:,} |")
json.dump({"note": "针灸学 30 章 = 教材 30 章（1:1）。", "chapters": rows},
          io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

readme = f"""# 针灸学

**16-zhenjiu-xue** · 针灸推拿学院 · {len(rows)} 章 · {C['units']} 单元 · {tot:,} 汉字

> 全库最大单课：30 章、27 万字，把经络、腧穴、刺灸、治疗四块合成一本。

## 一、底本

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/qhzy-针灸学.xlsx`（30 内容章） |
| sha256 | `{U['source']['sha256'][:16]}…` |
| 规模 | 30 章 / {C['units']} 单元 / {C['hanzi']:,} 汉字（教材口径） |
| 章节目标 | 30（**1:1，无合并、无拆分、无单元复用**） |

## 二、章表

| # | slug | 章 | 单元 | 汉字 |
|--:|---|---|--:|--:|
{chr(10).join(tbl)}

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
| **临床治疗** | **{P['view']['临床治疗']}** |
| **刺灸技术** | **{P['view']['刺灸技术']}** |
| **经络腧穴** | **{P['view']['经络腧穴']}** |

三辨极差 **{R['view']}×** —— 全库最平的三辨之一，因为针灸学本身就是三块合订，教材不敢偏。

**四位面＝教材四板块（结构分区，不靠词频）**：

| 板块 | 教材章 | 单元 | 汉字 |
|---|---|--:|--:|
| 基础总论 | 1–3 | {P['A_part_units']['基础总论']} | {P['A_part']['基础总论']:,} |
| 经络腧穴各论 | 4–18 | {P['A_part_units']['经络腧穴各论']} | {P['A_part']['经络腧穴各论']:,} |
| 刺灸技法 | 19–22 | {P['A_part_units']['刺灸技法']} | {P['A_part']['刺灸技法']:,} |
| 临床治疗 | 23–30 | {P['A_part_units']['临床治疗']} | {P['A_part']['临床治疗']:,} |

极差 **{R['A_part']}×**。这一轴**不用关键词统计**，而是按教材章归属直接分区——因为
「经络腧穴各论」15 章 10.4 万字是客观事实，用词频凑平反而失真。

**两条被否的轴**：部位轴（上肢 2,642 / 头面躯干 4,502 / 下肢 1,782 / 奇穴 202，**22.3×**）、
主治轴（内科 1,663 / 五官急症 1,616 / 妇儿 364 / 皮外 191，**8.7×**）。都因桶太浅而废弃。

## 四、这门课的用法

教材是「合订本」，本课按原书 30 章逐章铺开，但每章都要求**回指四板块**：
学第 6 章（足阳明胃经）时要能说出它的哪些穴进了第 25 章（内科病证）的哪个处方。
**经络—腧穴—手法—治疗必须能互相对上**，这是本课唯一的硬判据。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "16-zhenjiu-xue"
node tests/test_chapter_code.js | grep -c "16-zhenjiu-xue"
python scripts/build_zhenjiu_xue_text.py
```

**免责声明：** 本课为教学材料。经穴定位与针刺深度须以国家标准（GB/T 12346）与现行教材为准；
胸背部穴位深刺有气胸风险，本课不构成自我操作依据。
"""
io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

gap = """# 针灸学 缺口登记

## 一、无穴位图与解剖剖面

30 章里「经络腧穴各论」15 章占 10.4 万字，但**没有一张穴位图、没有解剖剖面**。
定位只能靠文字（骨度分寸＋体表标志）。这是本课最大缺口：针灸定位高度依赖图示。
补法：以 GB/T 12346-2021《经穴名称与定位》为源（本库已有官方 PDF 与 362 穴库），
按《补源约定》登记后再入正文。

## 二、证据等级只在治疗篇个别提及

第 24–29 章（治疗各论）讲病证与处方，**多数病种未标证据等级**。本课不代填。

## 三、与既有单科课的关系

本库已有《经络学》《腧穴学》《刺法灸法学》《针灸治疗学》《实验针灸学》五门单科课。
《针灸学》是**合订本**，内容与它们大面积重叠：
- 本课汉字**不与单科课相加**；
- 单科课深、本课全；读者应先单科再合订，或用本课做检索索引。

## 四、不做的事

1. **不改穴位定位**——一律随教材，遇与国标不一致处标「教材写法，国标见 GB/T 12346」。
2. **不补针刺深度数值**——教材给了就给，没给的写「教材未给」。
3. **不把治疗篇写成临床路径**——处方是教学示例，不构成诊疗方案。
"""
io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 16-针灸学" not in s:
    add = f"""### 建 16-针灸学（针灸系第 16 门，全库最大单课）

底本 `qhzy-针灸学.xlsx`（30 内容章 / {C['units']} 单元 / {C['hanzi']:,} 汉字）。

- **30 教材章 → 30 课程章（1:1）**，无合并拆分、无单元复用；{tot:,} 汉字；目标 30 不变
- 三辨 临床治疗 {P['view']['临床治疗']} / 刺灸技术 {P['view']['刺灸技术']} / 经络腧穴 {P['view']['经络腧穴']}（**{R['view']}×**，全库最平）
- 四位面 **教材四板块（结构分区）**：基础 {P['A_part']['基础总论']:,} / 经穴 {P['A_part']['经络腧穴各论']:,} / 技法 {P['A_part']['刺灸技法']:,} / 治疗 {P['A_part']['临床治疗']:,}（{R['A_part']}×）
- 部位轴 22.3×、主治轴 8.7× 均否；四板块按章归属直接分区，不用词频凑
- 与五门单科课（经络/腧穴/刺灸/治疗/实验）大面积重叠，**汉字不相加**，已在缺口登记写明

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("changelog appended")
print("done:", len(rows), "章", tot, "汉字")
