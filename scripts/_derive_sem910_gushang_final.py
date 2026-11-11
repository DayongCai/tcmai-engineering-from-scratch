# -*- coding: utf-8 -*-
"""16/17 收尾：README / 缺口登记 / CHANGELOG。

**不写 chapters.json**——sem910 两门的章名与顺序由 `scripts/scaffold_sem910.js` 从
data/new-subjects-chapters.json 生成，status 按磁盘现算；手写会被 --check 判漂移。
"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")

COURSES = [
 ("gushang-lunzhuan", "departments/04-gushang/16-gushang-linchuang-lunzhuan", "骨伤临床轮转",
  "轮转学的不是「看会了」，而是能不能独立完成一次接诊并讲清依据",
  "六站：正骨 / 筋伤 / 脊柱 / 关节 / 急诊创伤 / 出科考核。每站都按「进科三问 → 执行 → 复盘」组织。"),
 ("gushang-biye", "departments/04-gushang/17-gushang-biye-sheji", "骨伤毕业设计与知识移交",
  "毕设的判据是「可复算」：数据能重算、结论能回到数据、规范能被人照做",
  "六阶：选题 → 数据准备 → 实现 → 疗效与并发症评价 → 写作答辩 → 知识移交。"),
]


def build(sub, dept, title, thesis, scope):
    base = os.path.join(S, sub)
    U = json.load(io.open(os.path.join(base, "units.json"), encoding="utf-8"))
    CM = json.load(io.open(os.path.join(base, "chapter-map.json"), encoding="utf-8"))["chapters"]
    C, P, R = U["counts"], U["probe"], U["ratio"]
    used = sorted({u["srcSub"] for u in U["units"]})
    dpath = os.path.join(ROOT, dept)

    tbl, tot = [], 0
    for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]):
        keep = set(v["units"])
        us = [x for x in U["units"] if x["sub"] in keep]
        hz = sum(x["hanzi"] for x in us)
        tot += hz
        tbl.append(f"| {v['n']} | {slug} | {v['title']} | {len(us)} | {hz:,} |")

    readme = f"""# {title}

**{os.path.basename(dept)}** · 骨伤学院 · {C['chapters']} 章 · {C['units']} 单元 · {tot:,} 汉字

> {thesis}

**课程类型：派生课（无教材，sem910 模板课）**。
章名与顺序来自 `data/new-subjects-chapters.json`，由 `scripts/scaffold_sem910.js` 生成，**不得手改**；
`locator` 一律 `派生·第N章·m.k`，单元正文逐字取自父课。

{scope}

## 一、父课

{chr(10).join(f'- `{p}`' for p in used)}

## 二、章表

| # | slug | 章 | 单元 | 汉字 |
|--:|---|---|--:|--:|
{chr(10).join(tbl)}

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
{chr(10).join(f"| **{k}** | **{v}** |" for k, v in P['view'].items())}

三辨极差 **{R['view']}×**。{"" if R['view'] < 5 else "偏斜原因见下方说明。"}

| 四位面（章群结构分区） | 汉字 |
|---|---:|
{chr(10).join(f"| {k} | {v:,} |" for k, v in P['A_part'].items())}

四位面极差 **{R['A_part']}×**。

## 四、判据

{thesis}。{scope}

## 五、章内可执行验证

```bash
node scripts/scaffold_sem910.js --check
node scripts/audit_curriculum.js | grep -A2 "{os.path.basename(dept)}"
node tests/test_chapter_code.js | grep -c "{os.path.basename(dept)}"
python scripts/_derive_sem910_gushang.py
```

**免责声明：** 本课为教学材料；无独立教材，内容为本库已建课程的二次编排。
轮转中的临床决策与毕设中的数据结论，须由执业医师与导师复核，不构成诊疗或研究结论。
"""
    io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

    skew = ""
    if R["view"] >= 5:
        top = max(P["view"].items(), key=lambda kv: kv[1])
        low = min(P["view"].items(), key=lambda kv: kv[1])
        skew = f"""
## 三、三辨偏斜（{R['view']}×）的原因

| 项 | 词频 |
|---|---:|
| {top[0]}（主导） | {top[1]} |
| {low[0]}（最低） | {low[1]} |

父课（骨伤系各临床课）几乎全写「怎么做」，极少写「怎么准备」与「怎么复盘」。
这与护理临床轮转（15.2×）是同一形态：**执行厚、准备与复盘薄**。
本课没有把「准备/复盘」的词硬塞进去凑平，而是把这两块作为**每章开头的固定结构**（进科三问 / 复盘四问）补上。
"""
    gap = f"""# {title} 缺口登记

## 一、无独立教材（派生课 + sem910 模板）

单元逐字取自：{('、'.join(f'`{p}`' for p in used))}。
本课汉字不与父课相加；`locator` 用 `派生·`。

## 二、章节名不可手改

`chapters.json` 由 `scripts/scaffold_sem910.js` 从 `data/new-subjects-chapters.json` 生成，
`status` 按磁盘现算；手改会被 `--check` 判为漂移。要改章名，改 data 文件后重跑脚本。
{skew}
## 四、不做的事

1. 不编造父课没有的临床细节；
2. 不给剂量、时限、手术指征数值；
3. 不把轮转见闻写成病例结论（无隐私与伦理审查，不写任何真实病例）。
"""
    io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)

    cl = os.path.join(ROOT, "CHANGELOG.md")
    s = io.open(cl, encoding="utf-8").read()
    if f"建 {os.path.basename(dept)}" not in s:
        add = f"""### 建 {os.path.basename(dept)}（{title}·派生课·sem910）

- {C['chapters']} 章 / {C['units']} 单元 / {tot:,} 汉字；单元取自 {len(used)} 门父课，locator `派生·`
- 章名与顺序由 `data/new-subjects-chapters.json` 固定（脚本断言一致），`status` 按磁盘现算
- 三辨 {R['view']}×（{"" if R['view'] < 5 else "执行厚、准备与复盘薄，父课形态所致，未凑平"}）；四位面＝章群结构分区 {R['A_part']}×

"""
        s = s.replace("\n## ", "\n" + add + "\n## ", 1)
        io.open(cl, "w", encoding="utf-8").write(s)
    print(f"{sub}: {C['chapters']} 章 / {C['units']} 单元 / {tot:,} 汉字")


if __name__ == "__main__":
    for sub, dept, title, thesis, scope in COURSES:
        build(sub, dept, title, thesis, scope)
