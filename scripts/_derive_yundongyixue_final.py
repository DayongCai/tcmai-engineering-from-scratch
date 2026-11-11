# -*- coding: utf-8 -*-
"""05 运动医学与损伤防护收尾。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
SUB, DEPT, TITLE = "gushang-yundong-yixue", "departments/04-gushang/05-yundong-yixue", "运动医学与损伤防护"

U = json.load(io.open(os.path.join(S, SUB, "units.json"), encoding="utf-8"))
CM = json.load(io.open(os.path.join(S, SUB, "chapter-map.json"), encoding="utf-8"))["chapters"]
C, P, R = U["counts"], U["probe"], U["ratio"]
used = sorted({u["srcSub"] for u in U["units"]})
dpath = os.path.join(ROOT, DEPT)

rows, tbl, tot = [], [], 0
for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]):
    keep = set(v["units"])
    us = [x for x in U["units"] if x["sub"] in keep]
    hz = sum(x["hanzi"] for x in us)
    tot += hz
    rows.append({"n": v["n"], "slug": slug, "title": v["title"], "status": "🚧",
                 "docs": "docs/zh.md", "code": "code/main.js"})
    tbl.append(f"| {v['n']} | {v['title']} | {v['derivedFrom']} | {len(us)} | {hz:,} |")
json.dump({"note": "运动医学与损伤防护 派生课：8 章，单元取自父课（locator 派生·），本课内无复用。", "chapters": rows},
          io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

readme = f"""# 运动医学与损伤防护

**05-yundong-yixue** · 骨伤学院 · {len(rows)} 章 · {C['units']} 单元 · {tot:,} 汉字

> 运动医学的判据是「何时能回到运动」：不是不疼，而是功能达标。

**课程类型：派生课（无独立教材）**。单元正文逐字取自父课，`locator` 一律 `派生·第N章·m.k`；
本课汉字**不与父课相加**。

## 一、父课

{chr(10).join(f'- `{p}`' for p in used)}

## 二、章表

| # | 章 | 父课来源 | 单元 | 汉字 |
|--:|---|---|--:|--:|
{chr(10).join(tbl)}

**第 1、7、8 章各 5 万字**（概论、防护训练、重返运动），第 2、5、6 章各 1.1–1.2 万字。
原因是父课（康复护理、运动学）在「训练与重返」上写得最厚，而部位损伤分散在筋伤与正骨的多章里。如实记录。

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
{chr(10).join(f"| **{k}** | **{v}** |" for k, v in P['view'].items())}

三辨极差 **{R['view']}×**——「处理与康复」高达 {P['view'].get('处理与康复',0)}，因为父课（康复护理）以干预为主线写；
「损伤识别」只有 {P['view'].get('损伤识别',0)}，是这门课的真实短板：**教材讲怎么练，讲怎么认伤少**。这个偏斜没有通过换词消除。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
{chr(10).join(f"| {k} | {v:,} |" for k, v in P['A_part'].items())}

四位面极差 **{R['A_part']}×**。

## 四、这门课的三个判据

1. **先排危险**：任何运动损伤先排除骨折、脱位、神经血管损伤，再谈软组织；
2. **分期处理**：急性期目标是控制出血与肿胀，不是「练回来」；
3. **重返要写数值**：重返运动的标准不能是「感觉好了」，须落到可测指标（活动度、肌力、平衡、专项动作）。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "05-yundong-yixue"
node tests/test_chapter_code.js | grep -c "05-yundong-yixue"
python scripts/_derive_yundongyixue.py
```

**免责声明：** 本课为教学材料。损伤诊断与重返决策须由执业医师与康复治疗师共同判断；
教材未给的量化阈值本课一律标「父课未给」，不代填。
"""
io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

gap = """# 运动医学与损伤防护 缺口登记

## 一、无独立教材（派生课）

单元逐字取自筋伤学、中医运动学、康复评定、正骨学、影像学、康复护理学。本课汉字不与父课相加。

## 二、重返运动的量化标准缺失

教材讲「可以逐步恢复运动」，但**不给可执行的阈值**（如跳跃测试对称度、单腿蹲次数、专项动作达标线）。
本课处理：只写「用什么测」，不写「多少分算过」——阈值须查现行运动医学共识。

## 三、损伤识别内容偏薄（三辨数据已显示）

三辨中「损伤识别」仅 %(id)s 次，而「处理与康复」%(rx)s 次。这不是切分问题，是父课文本的真实形态：
康复护理以干预为主线。本课已在第 2、3 章尽量补足识别与评估，但**无法超出父课现有内容**。

## 四、无图（骨伤系共性）

损伤部位图、检查手法图、训练动作图全缺。见 `departments/04-gushang/图示缺口.md`。

## 五、不做的事

1. 不给康复周期天数（个体差异大，父课也只给区间）；
2. 不把「中医理筋手法」写成唯一方案——与运动训练并列，不替代；
3. 不写职业运动员的专项负荷方案（属队医范畴）。
"""

i = gap.replace("%(id)s", str(P["view"].get("损伤识别", 0))).replace("%(rx)s", str(P["view"].get("处理与康复", 0)))
io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(i)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 05-yundong-yixue" not in s:
    add = f"""### 建 05-yundong-yixue（运动医学与损伤防护·派生课）

- 8 章 / {C['units']} 单元 / {tot:,} 汉字；单元取自 {len(used)} 门父课，locator `派生·`，无复用
- 三辨 损伤识别 {P['view'].get('损伤识别',0)} / 处理与康复 {P['view'].get('处理与康复',0)} / 评定与重返 {P['view'].get('评定与重返',0)}（**{R['view']}×**）
- 四位面＝章群结构分区（**{R['A_part']}×**）
- **重返运动只写「用什么测」，不写阈值**：阈值须查现行共识（缺口登记已写明）
- 三辨偏斜（识别薄、干预厚）是父课文本形态，未通过换词消除

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("changelog appended")
print(f"done: {len(rows)} 章 {tot:,} 汉字")
