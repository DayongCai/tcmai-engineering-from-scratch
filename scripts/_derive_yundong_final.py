# -*- coding: utf-8 -*-
"""01 中医运动学收尾：chapters.json / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
SUB, DEPT, TITLE = "zhongyi-yundong", "departments/04-gushang/01-zhongyi-yundong-xue", "中医运动学"

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
json.dump({"note": "中医运动学 派生课：8 章，单元取自父课（locator 派生·），本课内无复用。", "chapters": rows},
          io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

readme = f"""# 中医运动学

**01-zhongyi-yundong-xue** · 骨伤学院 · {len(rows)} 章 · {C['units']} 单元 · {tot:,} 汉字

> 中医运动学的判据是「可执行」：练什么、练多少、练到什么反应、什么时候停。

**课程类型：派生课（无独立教材）**。单元正文逐字取自父课，`locator` 一律 `派生·第N章·m.k`，
`source` 记 `父课:父locator`；本课汉字**不与父课相加**。

## 一、父课

{chr(10).join(f'- `{p}`' for p in used)}

## 二、章表

| # | 章 | 父课来源 | 单元 | 汉字 |
|--:|---|---|--:|--:|
{chr(10).join(tbl)}

**篇幅不均**：第 3、6、7 章（功能要素、肌力、平衡）各 5 万字，因为父课（康复护理）在这些主题上写得最厚；
第 1、2、4、5、8 章各 1.1 万字左右。这不是切分错误，是父课文本重心的如实反映。

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
{chr(10).join(f"| **{k}** | **{v}** |" for k, v in P['view'].items())}

三辨极差 **{R['view']}×**。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
{chr(10).join(f"| {k} | {v:,} |" for k, v in P['A_part'].items())}

四位面极差 **{R['A_part']}×**。

## 四、辨清一件事：中医运动学 ≠ 康复训练

两者都讲「练」，但来源与判据不同：

| | 中医运动学 | 康复训练 |
|---|---|---|
| 来源 | 导引、气功、功法（三调） | 功能评定与训练处方 |
| 判据 | 功法规格与练功反应 | 肌力/活动度/平衡的量化改善 |
| 风险 | 练功偏差（意守过度、呼吸憋气） | 训练过量、跌倒 |

本课把两条线并置：第 1–4 章是导引侧，第 5–8 章是训练侧，**不把二者混成一锅**。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "01-zhongyi-yundong"
node tests/test_chapter_code.js | grep -c "01-zhongyi-yundong"
python scripts/_derive_yundong.py
```

**免责声明：** 本课为教学材料。功法与训练均有风险（练功偏差、运动损伤、跌倒），
须在专业指导下进行；本课不构成自我训练方案。
"""
io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

gap = """# 中医运动学 缺口登记

## 一、无独立教材（派生课）

单元逐字取自父课（见 README §1）。**后果**：①本课汉字不与父课相加；②章切分为本课程设计，`locator` 用 `派生·`。

## 二、功法缺影像与动作分解图（本课最硬缺口）

导引功法（八段锦、五禽戏、六字诀）**没有视频、没有分解图**，只有文字描述姿势与呼吸。
这直接影响「可执行性」——本课的核心判据恰恰是可执行。

对策（同 `departments/04-gushang/图示缺口.md`）：
- 动作线图可自制（按文字重绘，标「示意图，非教材原图」）；
- 呼吸节律与意守部位**只能用文字**，不给「最佳时长」等教材未给的数值。

## 三、运动处方参数缺数值

| 类型 | 父课状态 | 本课处理 |
|---|---|---|
| 训练强度（次数/组数/负荷） | 部分给区间 | 照录区间 |
| 功法练习时长 | 多写「循序渐进」 | 标「父课未给具体时长」 |
| 停止指征 | 分散在各章 | 汇总进第 8 章 |

## 四、不做的事

1. 不给「最佳运动量」——个体差异大，父课没给的不补；
2. 不把导引写成「包治」——适应证随父课口径；
3. 不把康复训练术语套到功法上（如把「抗阻训练」硬说成「站桩」）。
"""
io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 01-zhongyi-yundong-xue" not in s:
    add = f"""### 建 01-zhongyi-yundong-xue（中医运动学·派生课）

- 8 章 / {C['units']} 单元 / {tot:,} 汉字；单元取自 {len(used)} 门父课，locator `派生·`，无复用
- 三辨 导引功法 {P['view'].get('导引功法',0)} / 运动训练 {P['view'].get('运动训练',0)} / 理论与防护 {P['view'].get('理论与防护',0)}（**{R['view']}×**）
- 四位面＝章群结构分区（**{R['A_part']}×**）：理论与源流 / 功法与处方 / 体能训练 / 平衡与损伤防护
- 明确「中医运动学 ≠ 康复训练」：导引侧（1–4 章）与训练侧（5–8 章）并置不混
- 功法影像与动作分解图缺失，已登记缺口

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("changelog appended")
print(f"done: {len(rows)} 章 {tot:,} 汉字")
