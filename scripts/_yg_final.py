# -*- coding: utf-8 -*-
"""医古文收尾：chapters.json / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT = "yiguwen", "departments/01-zhongyi/02-yi-gu-wen"
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
json.dump({"note": "医古文 8 章 ← 教材 12 章（1+2、3+4、6+7、10+11 合并；无单元复用）。", "chapters": rows},
          io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

readme = f"""# 医古文

**02-yi-gu-wen** · 中医学院 · {len(rows)} 章 · {C['units']} 单元 · {tot:,} 汉字

> 章链：概论与工具书 → 汉字词汇 → 语法 → 断句今译 → 传记 → 医经医论 → 序文医案 → 数字人文

## 一、底本

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/qhzy-医古文.xlsx`（12 内容章） |
| sha256 | `{U['source']['sha256'][:16]}…` |
| 规模 | 12 章 / {C['units']} 单元 / {C['hanzi']:,} 汉字（教材口径） |

## 二、章表（8 课程章 ← 12 教材章）

| # | 章 | 教材章 | 单元 | 汉字 |
|--:|---|---|--:|--:|
{chr(10).join(tbl)}

**合并理由**：1+2（概论/工具书）、3+4（汉字/词汇）、6+7（断句/今译）、10+11（序文/医话医案）各属同一台阶。
章节目标 8 未改；**无单元复用**。

## 三、三辨与四位面（实测）

| 三辨 | 词频 | 四位面（教材四板块） | 汉字 |
|---|--:|---|--:|
| **字词训释** | **{P['view']['字词训释']}** | 语言通论（1–7） | {P['A_part']['语言通论']:,} |
| **语法句读** | **{P['view']['语法句读']}** | 序文医案与数字人文（10–12） | {P['A_part']['序文医案与数字人文']:,} |
| **文选与医理** | **{P['view']['文选与医理']}** | 医经医论（9） | {P['A_part']['医经医论']:,} |
| | | 医家传记（8） | {P['A_part']['医家传记']:,} |

三辨极差 **{R['view']}×**；四位面极差 **{R['A_part']}×**。

**为什么三辨偏到 5.5×**：这本教材 7 章通论（6.5 万字）讲字词语法，4 章文选（6.3 万字）讲怎么读篇目，
而「文选」类词汇在通论章里几乎不出现。**偏斜是教材结构，不是统计问题**；我没有把「字」「句」这类词根
硬塞进文选类去凑平。

**四位面为什么不用词频**：试过的「文选四体」关键词轴实测 **{R['B_hand']}×**（文化层类词只有 105 次），
已弃；改用**按教材章归属的结构分区**（3.2×），这与《针灸学》同一做法——教材本身的篇幅分配就是最有信息量的轴。

## 四、这门课的判据：能不能独立读一段原文

不是「背过多少通假字」，而是：给一段**没有标点**的医经原文，能不能断句、能不能译对、依据哪部辞书。
本课每章都要求写出四件：出处（书名·篇名）、原文、断句、今译与依据。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "02-yi-gu-wen"
node tests/test_chapter_code.js | grep -c "02-yi-gu-wen"
python scripts/build_yiguwen_text.py
```

**免责声明：** 医古文释读以教材与通行校注本为准；异文与通假判断需核对原始版本，本课不作为版本依据。
"""
io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

gap = """# 医古文 缺口登记

## 一、文选为节选，且无影印

第 8–11 章的文选是**节选**，教材未附影印页，也没有异文对照表。
本课不代补全文：需要读全篇时，回查原书或校注本。

## 二、无录音与朗读示范

医古文的诵读（句读、语气）教材无法体现。本课只到「断句规则」，不提供示范音频。

## 三、不做的事

1. **不臆改通假**——教材若写「某字通某」，照录；无据的「通假」一律不写。
2. **不给「标准今译」**——译文标注「参考译法」，与原文分栏，不混排。
3. **不把数字人文工具当校勘依据**——第 8 章明确：检索工具能定位，不能定版本。

## 四、与《针灸医籍选》的分工

两门课都用古籍，但判据不同：
- 《医古文》：**语言文字**——字词、语法、句读、今译；
- 《针灸医籍选》：**医理与针法主张**——这段原文说了什么技术。
同一段原文在两课里的读法不同，汉字**不相加**。
"""
io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 02-医古文" not in s:
    add = f"""### 建 02-医古文（中医系第 20 门）

底本 `qhzy-医古文.xlsx`（12 内容章 / {C['units']} 单元 / {C['hanzi']:,} 汉字）。

- **12 教材章 → 8 课程章**（1+2、3+4、6+7、10+11 合并），无单元复用；{tot:,} 汉字；目标 8 不变
- 三辨 字词训释 {P['view']['字词训释']} / 语法句读 {P['view']['语法句读']} / 文选与医理 {P['view']['文选与医理']}（**{R['view']}×**，教材通论重、文选轻的结构所致）
- 四位面 **教材四板块结构分区**：通论 {P['A_part']['语言通论']:,} / 序文医案与数字人文 {P['A_part']['序文医案与数字人文']:,} / 医经医论 {P['A_part']['医经医论']:,} / 传记 {P['A_part']['医家传记']:,}（{R['A_part']}×）
- 「文选四体」关键词轴 {R['B_hand']}× 已弃（文化层类词仅 105 次）
- 与《针灸医籍选》分工写明：本课判语言文字，那门判医理与针法；汉字不相加

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("changelog appended")
print("done:", len(rows), "章", tot, "汉字")
