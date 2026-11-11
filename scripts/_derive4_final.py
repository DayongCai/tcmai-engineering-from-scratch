# -*- coding: utf-8 -*-
"""4 门派生课收尾：chapters.json + README + 缺口登记 + CHANGELOG。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")

COURSES = [
 ("zhongyao-yaodai-donglixue", "departments/02-zhongyao/11-zhongyao-yaodai-donglixue", "11-中药药代动力学",
  "把「成分进了血以后发生什么」写成一条可测的链：吸收→分布→代谢→排泄→参数→方法学",
  ["单元正文取自中药化学、中药药理学、中药药剂学、中药分析学、中药毒理学", "无独立教材：本课是**派生课**，两课汉字不可相加"]),
 ("daodi-yaocai", "departments/02-zhongyao/12-daodi-yaocai", "12-道地药材与产地加工",
  "把「同一品种换个地方就不是那个味」拆成产区、生态、种质、加工、商品、评价六段",
  ["单元正文取自中药资源学、中药鉴定学、中药商品学、中药炮制学、中药分析学", "无独立教材：本课是**派生课**"]),
 ("zhongchengyao-linchuang", "departments/02-zhongyao/13-zhongchengyao-linchuang", "13-中成药与临床用药",
  "从剂型到病证到联合用药：中成药的三段判断",
  ["单元正文取自中药药剂学、中药分析学、临床中药学、中药药理学、中药毒理学、中药学", "无独立教材：本课是**派生课**"]),
 ("peiwu-yu-jinji", "departments/02-zhongyao/14-peiwu-yu-jinji", "14-中药配伍与禁忌",
  "七情—君臣佐使—十八反十九畏—妊娠与证候禁忌—中西药联用：五层禁忌的判断顺序",
  ["单元正文取自中药学、临床中药学、中药药理学、中药毒理学、中药炮制学、中药分析学",
   "方剂学底本无 units.json，本章只用中药学单元（已在缺口登记标明）", "无独立教材：本课是**派生课**"]),
]

log = []
for sub, dept, code, one, notes in COURSES:
    base = os.path.join(S, sub)
    dpath = os.path.join(ROOT, dept)
    U = json.load(io.open(os.path.join(base, "units.json"), encoding="utf-8"))
    CM = json.load(io.open(os.path.join(base, "chapter-map.json"), encoding="utf-8"))["chapters"]
    C, P, R = U["counts"], U["probe"], U["ratio"]
    by = {}
    for u in U["units"]:
        by[u["sub"]] = u

    rows, tbl = [], []
    for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]):
        us = [x for x in U["units"] if x["chapter"] == str(v["n"])]
        rows.append({"n": v["n"], "slug": slug, "title": v["title"], "status": "🚧",
                     "docs": "docs/zh.md", "code": "code/main.js"})
        tbl.append(f"| {v['n']} | {v['title']} | {len(us)} | {sum(x['hanzi'] for x in us):,} |")
    json.dump({"note": f"{code}（派生课）：单元取自父课，locator 一律「派生·」；无单元复用。", "chapters": rows},
              io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    srcs = sorted({u["srcSub"] for u in U["units"]})
    view_tbl = "\n".join(f"| **{k}** | **{v}** |" for k, v in sorted(P["view"].items(), key=lambda kv: -kv[1]))
    lv_tbl = "\n".join(f"| {k} | {v} |" for k, v in sorted(P["A_part"].items(), key=lambda kv: -kv[1]))
    readme = f"""# {code.split('-', 1)[1]}

**{code}** · 中药学院 · **派生课（无教材）** · {C['chapters']} 章 · {C['units']} 单元 · {C['hanzi']:,} 汉字

> {one}

## 一、为什么要派生

{chr(10).join('- ' + n for n in notes)}

派生规则（与中药 19/20、针灸 21/22 一致）：
1. 单元正文**取自父课 units.json，不改字**；
2. `locator` 一律写 `派生·第N章·m.k`，不写 `教材·`；
3. `source` 记 `父课:父 locator`，可逐条回溯；
4. 同一父单元在本课内只用一次；**两课汉字不可相加**。

**父课**：{'、'.join(srcs)}

## 二、章表

| # | 章 | 单元 | 汉字 |
|--:|---|--:|--:|
{chr(10).join(tbl)}

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
{view_tbl}

| 四位面（观察视角） | 词频 |
|---|--:|
{lv_tbl}

三辨极差 **{R['view']}×**；四位面极差 **{R['A_part']}×**。

## 四、口径

- **派生≠教材**：本课不冒充有教材，篇名一律《{code.split('-', 1)[1]}·章名》，出处看 `units.json` 的 `source`。
- **不重复计数**：与父课的字数、章数分别统计，禁止相加。
- 缺口见 `缺口登记.md`。

**免责声明：** 本课为教学材料，临床用药与配伍判断须以现行药典、说明书与临床指南为准，不构成处方依据。
"""
    io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

    gap = f"""# {code.split('-', 1)[1]} 缺口登记

## 一、无独立教材

本课为**派生课**：单元正文取自 {'、'.join(srcs)}，按本课主题重排。
派生能保证「有正文、可追溯」，**不能保证覆盖一个独立学科应有的全部主题**。

## 二、未覆盖 / 覆盖不足

{chr(10).join('- ' + n for n in notes[1:]) if len(notes) > 1 else '- 见各章 why'}

## 三、派生单元的可反驳性

每条单元的 `source` 写着父课与父 locator；若父课改版，本课须重跑 `scripts/_derive4.py`。
**派生课的字数不能与父课相加**——那是同一批字被读了第二遍。
"""
    io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)
    log.append((code, C["chapters"], C["units"], C["hanzi"], R))

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
tag = "中药系补 4 门派生课"
if tag not in s:
    rows = "\n".join(f"| {c} | {ch} | {un} | {hz:,} | 三辨 {r['view']}× / 四位面 {r['A_part']}× |"
                     for c, ch, un, hz, r in log)
    add = f"""
### 中药系补 4 门派生课（11/12/13/14）

中药系剩余 5 门里只有《药用植物学》有教材（已单独建成 9 章），其余 4 门无 xlsx。
按既有派生路线（中药 19/20、针灸 21/22）建课：`scripts/_derive4.py` 用关键词从父课选题，
单元正文不改字，`locator` 一律 `派生·`，`source` 记「父课:父locator」。

| 课 | 章 | 单元 | 汉字 | 轴 |
|---|--:|--:|--:|---|
{rows}

- 父课：中药化学 / 中药药理学 / 中药药剂学 / 中药分析学 / 中药毒理学 / 中药鉴定学 / 中药商品学 /
  中药资源学 / 中药炮制学 / 中药学 / 临床中药学
- 已知缺口：**方剂学底本无 units.json**，14 章「君臣佐使」只用中药学单元，已在缺口登记标明
- 4 门均生成 code/docs/outputs/quiz，章节目标与 curriculum 一致（8/8/10/8）

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("changelog appended")

for c, ch, un, hz, r in log:
    print(f"{c}: {ch} 章 / {un} 单元 / {hz:,} 汉字")
