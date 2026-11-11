# -*- coding: utf-8 -*-
"""针灸系 6 门派生课收尾：chapters.json / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")

COURSES = [
 ("kangfu-yixue-jichu", "departments/03-zhenjiu/09-kangfu-yixue-jichu", "康复医学基础",
  "康复不是「养病」，目标是把功能拿回来；评定是起点也是终点",
  ["kangfu-huli", "jichu-huli", "laonian-huli", "shequ-huli-xue", "zhenjiu-zhiliao", "tuina", "huli-lunli-fagui"]),
 ("wuli-zhiliao", "departments/03-zhenjiu/11-wuli-zhiliao", "物理治疗与运动康复",
  "物理因子的共同逻辑：给组织一个可承受的刺激；剂量与禁忌同样重要",
  ["cifa-jiufa", "shiyan-zhenjiu", "kangfu-huli", "tuina", "shoufa"]),
 ("erxue-zhenduan-xue", "departments/03-zhenjiu/12-erxue-zhenduan-xue", "耳穴诊治学",
  "定位是地基，诊断靠望压电三法，治疗靠刺激量分级",
  ["zhenjiu-xue", "cifa-jiufa", "zhenjiu-zhiliao", "jingluo", "shuxue"]),
 ("zhendao-yixue", "departments/03-zhenjiu/13-zhendao-yixue", "针刀医学",
  "针与刀合一，风险也合一：刀口方向、深度、禁忌是第一纪律",
  ["cifa-jiufa", "zhenjiu-zhiliao", "zhenjiu-xue", "shuxue", "tuina", "zhiliao", "gubing", "shiyan-zhenjiu"]),
 ("zhenjiu-zhentong-mazui", "departments/03-zhenjiu/14-zhenjiu-zhentong-mazui", "针灸镇痛与麻醉",
  "镇痛机制与电针参数是两条腿；麻醉是辅助不是替代",
  ["shiyan-zhenjiu", "zhenjiu-zhiliao", "cifa-jiufa", "zhenjiu-xue", "kangfu-huli"]),
 ("zhongyi-kangfu-xue", "departments/03-zhenjiu/15-zhongyi-kangfu-xue", "中医康复学",
  "辨证与功能两套坐标同时记；中医技术要跟功能目标走",
  ["zhenjiu-zhiliao", "cifa-jiufa", "qigong", "tuina", "zhiliao", "shoufa",
   "zhongyi-yangsheng-xue", "linchuang-zhongyao", "zhongyao-xue", "kangfu-huli", "shequ-huli-xue"]),
]


def build(sub, dept, title, thesis, parents):
    base = os.path.join(S, sub)
    U = json.load(io.open(os.path.join(base, "units.json"), encoding="utf-8"))
    CM = json.load(io.open(os.path.join(base, "chapter-map.json"), encoding="utf-8"))["chapters"]
    dpath = os.path.join(ROOT, dept)
    C, P, R = U["counts"], U["probe"], U["ratio"]

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

    used = sorted({u["srcSub"] for u in U["units"]})
    readme = f"""# {title}

**{os.path.basename(dept)}** · 针灸推拿学院 · {len(rows)} 章 · {C['units']} 单元 · {tot:,} 汉字

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

三辨极差 **{R['view']}×**。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
{chr(10).join(f"| {k} | {v:,} |" for k, v in P['A_part'].items())}

四位面极差 **{R['A_part']}×**。这一轴按**章群归属**直接分区，不用词频——
派生课的关键词统计容易被父课的泛词（「患者」「治疗」）支配，结构分区更诚实。

## 四、判据

{thesis}。本课每章要求写清：**适应证边界、操作要点、可核的记录项、禁忌与风险**。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "{os.path.basename(dept)}"
node tests/test_chapter_code.js | grep -c "{os.path.basename(dept)}"
python scripts/_derive6_zj.py
```

**免责声明：** 本课为教学材料；无独立教材，内容取自本库已建课程，属**二次编排**。
具体操作与剂量须以现行规范与执业人员判断为准，不构成诊疗建议。
"""
    io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

    gap = f"""# {title} 缺口登记

## 一、无独立教材

本课是**派生课**：没有对应 `qhzy-*.xlsx` 教材，正文逐字取自下列父课：
{chr(10).join(f'- `{p}`' for p in used)}

**后果**：
1. 本课汉字**不与父课相加**（同一批字读第二遍）；
2. 章的切分是本课程设计的，不是教材原章；`locator` 用 `派生·` 前缀，回查须走 `source` 字段。

## 二、补教材后可升级

若取得对应教材（如《康复医学基础》《针刀医学》），按「教材课」流程重建：
底本 `standards/<sub>/units.json` 换为教材解析结果，单元 `locator` 改 `教材·第N章·`，
**替换而非叠加**。

## 三、不做的事

1. **不编造父课没有的内容**——本课不新增技术细节，只重排与串联。
2. **不给剂量与疗程数值**——父课给了照录，没给的写「父课未给」。
3. **不把派生当原创**——README 与每章 docs 均标注派生来源。
"""
    io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)

    cl = os.path.join(ROOT, "CHANGELOG.md")
    s = io.open(cl, encoding="utf-8").read()
    tag = f"建 {os.path.basename(dept)}"
    if tag not in s:
        add = f"""### 建 {os.path.basename(dept)}（{title}·派生课）

- {len(rows)} 章 / {C['units']} 单元 / {tot:,} 汉字；单元取自 {len(used)} 门父课，locator `派生·`，无复用
- 三辨极差 {R['view']}×；四位面＝章群结构分区 {R['A_part']}×
- 无独立教材，已在 `缺口登记.md` 与 README 标注「派生、汉字不与父课相加」

"""
        s = s.replace("\n## ", "\n" + add + "\n## ", 1)
        io.open(cl, "w", encoding="utf-8").write(s)
    print(f"{sub}: {len(rows)} 章 / {C['units']} 单元 / {tot:,} 汉字")


if __name__ == "__main__":
    for sub, dept, title, thesis, parents in COURSES:
        build(sub, dept, title, thesis, parents)
