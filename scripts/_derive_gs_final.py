# -*- coding: utf-8 -*-
"""骨伤四门派生课收尾 + 骨伤系「图示缺口」总表。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")

COURSES = [
 ("gushang-jinshang", "departments/04-gushang/07-zhongyi-jinshang-xue", "中医筋伤学",
  "筋伤不是「软组织损伤」的同义词：按筋、肉、骨分层，按病理分期选手法"),
 ("gushang-shoufa-zhiliao", "departments/04-gushang/08-gushang-shoufa-zhiliao", "骨伤科手法治疗学",
  "手法的力学三要素是力的大小、方向、作用点；风险最高的动作往往收益也最大"),
 ("gushang-jizhu-bing", "departments/04-gushang/10-jizhu-bing-xue", "脊柱病学",
  "脊柱的判据是稳定性：先看序列与神经，再谈手法与康复"),
 ("gushang-guzhishusong", "departments/04-gushang/12-guzhishusong-tuibian", "骨质疏松与退行性疾病",
  "骨密度是数、不是结论；防跌倒比补钙更快见效"),
]


def build(sub, dept, title, thesis):
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

三辨极差 **{R['view']}×**。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
{chr(10).join(f"| {k} | {v:,} |" for k, v in P['A_part'].items())}

四位面极差 **{R['A_part']}×**。派生课一律用结构分区：父课的泛词（「治疗」「患者」「手法」）会把关键词轴压成假平衡。

## 四、判据

{thesis}。每章要求写清：**部位与病程、必须排除的危险诊断、处理顺序、可核的随访指标**。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "{os.path.basename(dept)}"
node tests/test_chapter_code.js | grep -c "{os.path.basename(dept)}"
python scripts/_derive_gs.py
```

**免责声明：** 本课为教学材料；无独立教材，内容为本库已建课程的**二次编排**。
具体操作、剂量与手术指征须由执业人员判断，不构成诊疗建议。
"""
    io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

    gap = f"""# {title} 缺口登记

## 一、无独立教材（派生课）

单元逐字取自：{('、'.join(f'`{p}`' for p in used))}。
**后果**：①本课汉字不与父课相加；②章的切分是本课程设计，`locator` 用 `派生·`，回查走 `source` 字段。

## 二、无插图（骨伤系共性缺口）

本课与骨伤系其他课一样，**没有体表标志图、示意图与影像片**。分型、移位方向、操作体位都依赖图示。
统一对策见 `departments/04-gushang/图示缺口.md`。

## 三、补教材后升级

取得对应教材后按「教材课」流程重建：单元 `locator` 改 `教材·第N章·`，**替换而非叠加**。

## 四、不做的事

1. **不编造父课没有的技术细节**——只重排与串联。
2. **不给剂量、角度、疗程数值**——父课给了照录，没给的写「父课未给」。
3. **不把派生当原创**——README 与缺口登记均标注来源。
"""
    io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)

    cl = os.path.join(ROOT, "CHANGELOG.md")
    s = io.open(cl, encoding="utf-8").read()
    if f"建 {os.path.basename(dept)}" not in s:
        add = f"""### 建 {os.path.basename(dept)}（{title}·派生课）

- {len(rows)} 章 / {C['units']} 单元 / {tot:,} 汉字；单元取自 {len(used)} 门父课，locator `派生·`，无复用
- 三辨 {R['view']}×；四位面＝章群结构分区 {R['A_part']}×
- 无独立教材；骨伤系共性缺口「无插图/影像片」汇总见 `departments/04-gushang/图示缺口.md`

"""
        s = s.replace("\n## ", "\n" + add + "\n## ", 1)
        io.open(cl, "w", encoding="utf-8").write(s)
    return rows, C, tot


def figure_plan():
    """骨伤系图示缺口总表：按课列需要什么图、能不能合法取得。"""
    docs = [
        ("03 中医骨伤科学基础", "骨折移位类型、夹板固定、创伤急救搬运、牵引", "线图可自制（按教材文字重绘，标「示意，非原文图」）"),
        ("06 中医正骨学", "正骨八法手位、拔伸方向、夹板与石膏范围", "线图可自制；手位图需真人示范或授权照片"),
        ("09 骨科影像诊断学", "X 线/CT/MRI 征象（骨折线、骨膜反应、坏死分期）", "**不可自制**：须临床影像授权或开放数据集"),
        ("07 中医筋伤学", "筋膜链、压痛点分布、理筋手法层次", "解剖底图可用公有领域图谱（Gray's Anatomy 1918）"),
        ("08 骨伤科手法治疗学", "手法力线示意、关节松动分级、颈椎手法风险区", "线图可自制；颈椎风险区须标注血管走行"),
        ("10 脊柱病学", "椎间盘突出分型、椎管测量、侧弯 Cobb 角", "分型线图可自制；测量图须与影像配套"),
        ("11 关节病学", "关节间隙分级、股骨头坏死分期、关节穿刺入路", "**不可自制**：分期依赖影像；穿刺入路可自制线图"),
        ("12 骨质疏松与退行性疾病", "骨密度 T 值示意、椎体压缩分级、跌倒风险因素", "线图可自制；T 值曲线可程序生成"),
    ]
    lines = [
        "# 骨伤系图示缺口（共性）",
        "",
        "骨伤系已建 8 门课，**全部没有插图**：教材只给文字描述，本库也未引入任何图片。",
        "这不是排版问题——分型、移位方向、体位与入路都靠图示才说得清。",
        "",
        "## 一、按课列的图示需求",
        "",
        "| 课 | 需要的图 | 可否合法取得 |",
        "|---|---|---|",
    ]
    for a, b, c in docs:
        lines.append(f"| {a} | {b} | {c} |")
    lines += [
        "",
        "## 二、三类来源与各自的红线（按《补源约定》）",
        "",
        "1. **公有领域解剖图谱**（如 Gray's Anatomy 1918 版 plate）：可引用，须登记来源、版本、sha256；",
        "   只用于**解剖底图**，不得标成教材原图。",
        "2. **自制线图**：按教材文字重绘（移位方向、手位、夹板范围、入路），**必须标注「示意图（据教材文字重绘），非教材原图」**；",
        "   红线：不得把自制图说成教材插图；不得据自制图给出教材未给的数值（角度、深度、重量）。",
        "3. **临床影像**（X 线/CT/MRI）：**本库不引入**。理由：①患者影像属敏感个人信息，须单独授权；",
        "   ②公开数据集（如 MURA、RSNA 系列）多为单部位、非中医骨伤场景，混用会误导。",
        "   → 影像章（09、11 的分期部分）**保持文字描述 + 「教材未附影像」标注**，不伪造图片。",
        "",
        "## 三、当前处置",
        "",
        "| 课 | 处置 |",
        "|---|---|",
        "| 03 / 06 / 07 / 08 / 10 / 12 | 缺口登记已写明「无插图」；线图可后续按上述规则补 |",
        "| 09 / 11 | 分型与分期**不配图**，正文明确「教材未附影像，分期以影像为准」 |",
        "",
        "## 四、如果要补图，先做哪几张",
        "",
        "优先级按「没有图就讲不清」排序：",
        "",
        "1. **骨折移位五种基本类型**（03/06 共用）——一条线图顶十段文字；",
        "2. **正骨八法手位**（06/08）——手放哪儿是核心，文字描述损耗最大；",
        "3. **夹板与石膏固定范围**（03/06）——范围画错直接影响疗效判断；",
        "4. **颈椎手法风险区**（08/10）——椎动脉走行，属安全类图；",
        "5. **筋膜与压痛点分布**（07）——可用公有领域解剖底图叠加。",
        "",
        "**结论**：骨伤系的图示缺口，**一半可补（线图与公有领域解剖图），一半不补（临床影像）**。",
        "不补的那一半要在正文里说清「为什么没有图」，而不是留白。",
    ]
    p = os.path.join(ROOT, "departments/04-gushang/图示缺口.md")
    io.open(p, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("图示缺口.md →", p)


if __name__ == "__main__":
    for sub, dept, title, thesis in COURSES:
        rows, C, tot = build(sub, dept, title, thesis)
        print(f"{sub}: {len(rows)} 章 / {C['units']} 单元 / {tot:,} 汉字")
    figure_plan()
