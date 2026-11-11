# -*- coding: utf-8 -*-
"""针灸治疗学收尾：chapters.json / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT = "zhenjiu-zhiliao", "departments/03-zhenjiu/08-zhenjiu-zhiliao-xue"
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
json.dump({"note": "针灸治疗学 12 章 ← 教材 14 章（1+2、3+4、11+12 合并；第 7 章按节序二分；无单元复用）。",
           "chapters": rows},
          io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

readme = f"""# 针灸治疗学

**08-zhenjiu-zhiliao-xue** · 针灸推拿学院 · {len(rows)} 章 · {C['units']} 单元 · {tot:,} 汉字

> 章链：治疗原则 → 诊治特点与处方 → 特定穴 → 头面躯体痛证 → 内科（一）（二） → 妇儿科 → 皮外科 → 五官科 → 急症与其他 → 时间针法 → 研究进展

## 一、底本

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/qhzy-针灸治疗学.xlsx`（14 内容章） |
| sha256 | `{U['source']['sha256'][:16]}…` |
| 规模 | 14 章 / 472 单元 / {C['hanzi']:,} 汉字（教材口径） |
| 病证条目 | **{C['diseases']}** 条（教材节标题，逐条保留章号，同名不合并） |

**版式**：5 列（章/节/小节/段/内容）。`段=''` 是节标题、`段='10'` 是小节标题、`段='11'` 是正文——
与药植/针法灸法那几本的编号式（3.1.1）不同，所以这门课的解析器是**单写**的（`build_zhenjiu_zhiliao_text.py`），不是克隆。

## 二、章表（12 课程章 ← 14 教材章）

| # | 章 | 教材章 | 单元 | 汉字 |
|--:|---|---|--:|--:|
{chr(10).join(tbl)}

**合并与拆分理由**：1+2（原则/作用）、3+4（诊治特点/处方）、11+12（急症/其他）同属一层意思，各合并；
教材第 7 章「内科病证」4.4 万字独占全书的 30%，**按节序一分为二**，避免一章压死。
章节目标 12 未改；**无单元复用**。

## 三、三辨与四位面（实测）

| 三辨 | 词频 | 四位面（病证门类） | 词频 |
|---|--:|---|--:|
| **治法与处方** | **{P['view']['治法与处方']}** | 内科病证 | {P['A_part']['内科病证']} |
| **操作与疗程** | **{P['view']['操作与疗程']}** | 皮外五官急症 | {P['A_part']['皮外五官急症']} |
| **辨证与分型** | **{P['view']['辨证与分型']}** | 痛证 | {P['A_part']['痛证']} |
| | | 妇儿科病证 | {P['A_part']['妇儿科病证']} |

三辨极差 **{R['view']}×**；四位面极差 **{R['A_part']}×**（与教材 6–12 章的分部同构）。

**未取「处方四要素」**（选穴配穴 {P['B_hand']['选穴配穴']} / 手法与量 {P['B_hand']['手法与量']} /
疗程频次 {P['B_hand']['疗程频次']} / 调护禁忌 {P['B_hand']['调护禁忌']}，**{R['B_hand']}×**）。
这条轴看起来最「专业」，但「取穴/配穴/主穴」是治疗学的**词根**，几乎每段都出现，
取它只会得到一条被选穴支配的假轴——与各家针灸学说的「灸」同类。

**妇儿科只有 {P['A_part']['妇儿科病证']} 次**，是因为教材在妇科病下直接写病名（月经不调、痛经），
少用「妇科」二字，不是内容缺。四个门类的最小值仍在 150 以上，故保留该轴并如实标注。

## 四、这门课的判据：处方要能被别人照做

一张合格的针灸处方至少写全四件：**辨证分型、主穴＋配穴、操作（手法/补泻/留针）、疗程频次**。
缺一项，别人拿着这张单子做不出来。教材未给证据等级的病种，本课一律写「教材未标证据等级」，不替它补。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "08-zhenjiu-zhiliao"
node tests/test_chapter_code.js | grep -c "08-zhenjiu-zhiliao"
python scripts/build_zhenjiu_zhiliao_text.py
```

**免责声明：** 本课为教学材料，处方与操作须由执业医师依具体病情确定；不构成对任何个体的诊疗建议。
"""
io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

gap = f"""# 针灸治疗学 缺口登记

## 一、证据等级缺失

教材按病种给「主穴/配穴/操作」，**不给证据等级**（RCT／系统评价／专家共识）。
本课不代填：每个病种都标「教材未标证据等级」，第 12 章讲怎么自己判。

## 二、病种覆盖不均

| 门类 | 教材篇幅 | 病证条目 |
|---|---|---|
| 内科病证 | 44,384 字（占全书 30%） | 最多，单列两章 |
| 妇儿科病证 | 18,386 字 | 条目偏少，妇科多用病名不用「妇科」二字 |
| 皮外伤科病证 | 17,414 字 | 中等 |
| 五官科病证 | 13,467 字 | 中等 |
| 急症 | 9,803 字 | 少，但风险最高，单列在第 10 章前半 |

## 三、不做的事

1. **不合并病证名**——教材同一病名在不同章出现（如「头痛」在痛证与内科），逐条保留章号。
2. **不补剂量与疗程数值**——教材给区间就写区间，没给的写「教材未给」，不按经验补。
3. **不把时间针法写成疗效承诺**——第 11 章只讲推算规则（可复现），疗效主张与规则分开写。
"""
io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 08-针灸治疗学" not in s:
    add = f"""### 建 08-针灸治疗学（针灸系第 13 门）

底本 `qhzy-针灸治疗学.xlsx`（14 内容章，5 列版式：章/节/小节/段/内容）。
**解析器单写**（`scripts/build_zhenjiu_zhiliao_text.py`）：本册节、小节是纯整数且用 `段=10/11` 区分标题与正文，
与药植、针法灸法那几本的 `3.1.1` 编号式不同，克隆会得到 2 个单元（实测过）。

- **14 教材章 → 12 课程章**（1+2、3+4、11+12 合并；第 7 章内科 4.4 万字按节序二分），472 单元无复用；{tot:,} 汉字；目标 12 不变
- 三辨 治法与处方 {P['view']['治法与处方']} / 操作与疗程 {P['view']['操作与疗程']} / 辨证与分型 {P['view']['辨证与分型']}（**{R['view']}×**）
- 四位面 病证门类（**{R['A_part']}×**，与教材 6–12 章同构）；处方四要素 {R['B_hand']}× 未取（「选穴」是词根）
- 病证库 **{C['diseases']} 条**，同名不合并、保留章号

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("changelog appended")
print("done:", len(rows), "章", tot, "汉字")
