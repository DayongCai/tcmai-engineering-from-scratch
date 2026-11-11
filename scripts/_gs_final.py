# -*- coding: utf-8 -*-
"""骨伤三本教材课收尾：chapters.json / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")

COURSES = [
 ("gushang-jichu", "departments/04-gushang/03-gushang-kexue-jichu", "中医骨伤科学基础",
  "骨伤科的第一条纪律是「先诊断、再动手」：分类、诊查、治疗三步不能跳",
  "本课是骨伤系的总论课：分类、诊查、治疗、急救四块打底，骨折/脱位/筋伤/内伤/骨病各论在此只作入门。"),
 ("zhenggu", "departments/04-gushang/06-zhongyi-zhenggu-xue", "中医正骨学",
  "正骨的核心是「手摸心会」：复位、固定、练功三件事的顺序不能倒",
  "本课是骨伤系的手法主课：八法与常用手法、骨折各论、脱位、筋伤、小儿骨伤。"),
 ("gushang-yingxiang", "departments/04-gushang/09-guke-yingxiang-zhenduan", "骨科影像诊断学",
  "影像课的判据是「看得见、说得清、能鉴别」：技术选择、征象识别、鉴别诊断三步",
  "本课是骨伤系的影像判读课：技术选择、正常解剖、基本病变、按部位分论的诊断与鉴别。"),
]


def build(sub, dept, title, thesis, scope):
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
    json.dump({"note": f"{title}：{len(rows)} 章 ← 教材 {C['chapters']} 章（无单元复用）。", "chapters": rows},
              io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    readme = f"""# {title}

**{os.path.basename(dept)}** · 骨伤学院 · {len(rows)} 章 · {C['units']} 单元 · {tot:,} 汉字

> {thesis}

## 一、底本

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/{U['source']['file']}` |
| sha256 | `{U['source']['sha256'][:16]}…` |
| 规模 | {C['chapters']} 章 / {C['units']} 单元 / {C['hanzi']:,} 汉字（教材口径） |

{scope}

## 二、章表（{len(rows)} 课程章 ← {C['chapters']} 教材章）

| # | 章 | 教材章 | 单元 | 汉字 |
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

四位面极差 **{R['A_part']}×**。

**为什么四位面用结构分区**：骨伤教材的部位与病种词高度重叠（「骨折」既在总论也在各论），
关键词统计会把总论算进各论；按教材章归属分区更可靠，与《针灸学》《医古文》同一做法。

## 四、判据

{thesis}。每章要求写清：**部位与分型、诊断依据（体征/影像）、处理顺序、可核的随访指标**。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "{os.path.basename(dept)}"
node tests/test_chapter_code.js | grep -c "{os.path.basename(dept)}"
python scripts/build_course_generic.py --sub {sub} --xlsx "F:/textbooks/{U['source']['file']}" \\
  --views '<同 axes.json>' --levels '<同 axes.json>'
```

**免责声明：** 本课为教学材料。骨伤科的操作（复位、固定、手术）须由执业医师在具备条件的机构完成；
教材未给的数值（角度、时限、剂量）本课一律标「教材未给」，不自行补。
"""
    io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

    gap = f"""# {title} 缺口登记

## 一、教材无插图与影像片

本教材以文字描述体征、分型与影像征象，**没有线图、没有 X 线／CT／MRI 片子**。
这是骨伤类课程最大的缺口：分型与移位程度的判断高度依赖图示。
补法：以公开影像图谱与国家标准为源，按《补源约定》登记（sha256＋版本＋校勘）后再入正文。

## 二、数值型参数的边界

| 类型 | 教材状态 | 本课处理 |
|---|---|---|
| 骨折分型（如 Garden、Neer） | 文字描述分型名 | 照录分型名，不给角度阈值 |
| 固定角度／牵引重量 | 多数不给具体数 | 标「教材未给」 |
| 愈合时间 | 按部位给区间 | 照录区间，不取单值 |

## 三、不做的事

1. **不补操作参数**——复位角度、牵引重量、手术指征一律随教材，没写的写「教材未给」。
2. **不给「疗效承诺」**——康复周期按教材区间，附个体差异。
3. **不把影像描述当诊断结论**——影像章只讲征象与鉴别，落诊断须结合临床。
"""
    io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)

    cl = os.path.join(ROOT, "CHANGELOG.md")
    s = io.open(cl, encoding="utf-8").read()
    tag = f"建 {os.path.basename(dept)}"
    if tag not in s:
        add = f"""### 建 {os.path.basename(dept)}（{title}·教材课）

底本 `qhzy-{U['source']['file'].replace('.xlsx','').replace('qhzy-','')}.xlsx`（{C['chapters']} 内容章 / {C['units']} 单元 / {C['hanzi']:,} 汉字）。

- **{C['chapters']} 教材章 → {len(rows)} 课程章**，无单元复用；{tot:,} 汉字
- 三辨极差 {R['view']}×；四位面＝章群结构分区 {R['A_part']}×
- 解析器：`scripts/build_course_generic.py`（新增「小节编号在列不在正文」的识别，含骨伤系四本）

"""
        s = s.replace("\n## ", "\n" + add + "\n## ", 1)
        io.open(cl, "w", encoding="utf-8").write(s)
    print(f"{sub}: {len(rows)} 章 / {C['units']} 单元 / {tot:,} 汉字")


if __name__ == "__main__":
    for sub, dept, title, thesis, scope in COURSES:
        build(sub, dept, title, thesis, scope)
