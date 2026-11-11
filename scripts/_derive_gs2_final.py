# -*- coding: utf-8 -*-
"""骨伤三门派生课收尾：13 整脊 / 14 支具 / 15 康复评定。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")

COURSES = [
 ("gushang-zhengji", "departments/04-gushang/13-zhongyi-zhengji-xue", "中医整脊学",
  "整脊不是「掰响」，是可解释的力学与序列调整；先排禁忌再动手",
  "三辨 1.2×——整脊的力学、手法、风险三块在教材里几乎是等重的，这是本库最平的一套。"),
 ("gushang-kangfu-gongcheng", "departments/04-gushang/14-kangfu-gongcheng-zhiju", "康复工程与支具学",
  "支具的作用只有三种：替代、限制、矫正；材料决定强度，也决定患者愿不愿意戴",
  "三辨 5.1×——「评估/随访」在父课里是高频词（护理文本特点），而「取型/制作」写得少；偏斜如实保留。"),
 ("gushang-kangfu-pingding", "departments/04-gushang/15-gushang-kangfu-pingding", "骨伤康复评定",
  "评定不是打分，是给下一个决策提供依据；选错量表比不评更糟",
  "三辨 6.6×——「评定」是父课的词根（康复护理正文几乎每段都有），无法通过换词消除；已如实标注，不做假轴。"),
]


def build(sub, dept, title, thesis, note):
    base = os.path.join(S, sub)
    U = json.load(io.open(os.path.join(base, "units.json"), encoding="utf-8"))
    CM = json.load(io.open(os.path.join(base, "chapter-map.json"), encoding="utf-8"))["chapters"]
    dpath = os.path.join(ROOT, dept)
    C, P, R = U["counts"], U["probe"], U["ratio"]
    used = sorted({u["srcSub"] for u in U["units"]})

    rows, tbl, tot = [], [], 0
    for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]):
        keep = set(v["units"])
        us = [x for x in U["units"] if x["sub"] in keep]
        hz = sum(x["hanzi"] for x in us)
        tot += hz
        rows.append({"n": v["n"], "slug": slug, "title": v["title"], "status": "🚧",
                     "docs": "docs/zh.md", "code": "code/main.js"})
        tbl.append(f"| {v['n']} | {v['title']} | {v['derivedFrom']} | {len(us)} | {hz:,} |")
    json.dump({"note": f"{title} 派生课：{len(rows)} 章，单元取自父课（locator 派生·），本课内无复用。",
               "chapters": rows},
              io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    readme = f"""# {title}

**{os.path.basename(dept)}** · 骨伤学院 · {len(rows)} 章 · {C['units']} 单元 · {tot:,} 汉字

> {thesis}

**课程类型：派生课（无独立教材）**。单元正文逐字取自父课，`locator` 一律 `派生·第N章·m.k`，
`source` 记 `父课:父locator`；本课汉字**不与父课相加**。

## 一、父课

{chr(10).join(f'- `{p}`' for p in used)}

## 二、章表

| # | 章 | 父课来源 | 单元 | 汉字 |
|--:|---|---|--:|--:|
{chr(10).join(tbl)}

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
{chr(10).join(f"| **{k}** | **{v}** |" for k, v in P['view'].items())}

三辨极差 **{R['view']}×**。{note}

| 四位面（章群结构分区） | 汉字 |
|---|---:|
{chr(10).join(f"| {k} | {v:,} |" for k, v in P['A_part'].items())}

四位面极差 **{R['A_part']}×**（结构分区，不用词频）。

## 四、判据

{thesis}。每章要求写清：**适应证与禁忌、操作/适配要点、可核的记录项、随访节点**。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "{os.path.basename(dept)}"
node tests/test_chapter_code.js | grep -c "{os.path.basename(dept)}"
python scripts/_derive_gs2.py
```

**免责声明：** 本课为教学材料；无独立教材，内容为本库已建课程的**二次编排**。
手法、支具适配与评定须由执业人员执行，不构成诊疗建议。
"""
    io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

    gap = f"""# {title} 缺口登记

## 一、无独立教材（派生课）

单元逐字取自：{('、'.join(f'`{p}`' for p in used))}。
**后果**：①本课汉字不与父课相加；②章切分为本课程设计，`locator` 用 `派生·`，回查走 `source`。

## 二、无插图（骨伤系共性）

体表标志、支具结构、评定操作体位都依赖图示。统一对策见 `departments/04-gushang/图示缺口.md`：
线图可自制（标「示意，非原图」）、解剖底图用公有领域图谱、临床影像不引入。

## 三、三辨偏斜的说明

本课三辨极差 **{R['view']}×**。原因见 README 第三节；**没有为了凑平而把父课的词根塞进弱势类**。

## 四、不做的事

1. 不编造父课没有的技术细节；
2. 不给剂量、角度、穿戴时长等数值（父课给了照录，没给的写「父课未给」）；
3. 不把派生当原创。
"""
    io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)

    cl = os.path.join(ROOT, "CHANGELOG.md")
    s = io.open(cl, encoding="utf-8").read()
    if f"建 {os.path.basename(dept)}" not in s:
        add = f"""### 建 {os.path.basename(dept)}（{title}·派生课）

- {len(rows)} 章 / {C['units']} 单元 / {tot:,} 汉字；单元取自 {len(used)} 门父课，locator `派生·`，无复用
- 三辨 {R['view']}×（{note.split('——')[0].replace('三辨 ','')}原样保留）；四位面＝章群结构分区 {R['A_part']}×
- 无独立教材；骨伤系共性缺口见 `departments/04-gushang/图示缺口.md`

"""
        s = s.replace("\n## ", "\n" + add + "\n## ", 1)
        io.open(cl, "w", encoding="utf-8").write(s)
    print(f"{sub}: {len(rows)} 章 / {C['units']} 单元 / {tot:,} 汉字")


if __name__ == "__main__":
    for sub, dept, title, thesis, note in COURSES:
        build(sub, dept, title, thesis, note)
