# -*- coding: utf-8 -*-
"""针灸医籍选收尾：chapters.json / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT = "zhenjiu-yiji", "departments/03-zhenjiu/03-zhenjiu-yiji-xuan"
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
json.dump({"note": "针灸医籍选 8 章 ← 教材 10 章（2+3、4+5 合并；无单元复用）。", "chapters": rows},
          io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

readme = f"""# 针灸医籍选

**03-zhenjiu-yiji-xuan** · 针灸推拿学院 · {len(rows)} 章 · {C['units']} 单元 · {tot:,} 汉字

> 章链：《灵枢》→《素问》《难经》→《甲乙经》与隋唐 → 宋金元 → 明清 → 歌赋 → 医案 → 数字化

## 一、底本

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/qhzy-针灸医籍选读.xlsx`（10 内容章） |
| sha256 | `{U['source']['sha256'][:16]}…` |
| 规模 | 10 章 / {C['units']} 单元 / {C['hanzi']:,} 汉字（教材口径） |
| 医籍 | **10 部（类）**：灵枢、素问、难经、甲乙经、隋唐医论、宋金元医论、明清医论、歌赋、医案、数字化 |

**版式**：这本的编号**写在「内容」列**（`1.1.1 成书与流传`），数字列只放层级；
正文行的 `段` 是 `11 / 12 / 13…`（第 N 段的正文），不是统一的 `11`。
前两本（针法灸法、针灸治疗学）的解析器都不适用，解析器单写。

## 二、章表（8 课程章 ← 10 教材章）

| # | 章 | 教材章 | 单元 | 汉字 |
|--:|---|---|--:|--:|
{chr(10).join(tbl)}

**合并理由**：第 2+3 章（素问／难经）、第 4+5 章（甲乙经／隋唐医论）各属同一条源流，合并后仍各 3 万字上下。
章节目标 8 未改；**无单元复用**。

## 三、三辨与四位面（实测）

| 三辨 | 词频 | 四位面（医籍文体） | 词频 |
|---|--:|---|--:|
| **临证应用** | **{P['view']['临证应用']}** | 针灸歌赋 | {P['A_part']['针灸歌赋']} |
| **义理发挥** | **{P['view']['义理发挥']}** | 经典经文 | {P['A_part']['经典经文']} |
| **训释校勘** | **{P['view']['训释校勘']}** | 医案 | {P['A_part']['医案']} |
| | | 医家医论 | {P['A_part']['医家医论']} |

三辨极差 **{R['view']}×**；四位面极差 **{R['A_part']}×**。

**未取「医籍来源」**（内经 {P['B_hand']['内经']} / 晋唐宋金元 {P['B_hand']['晋唐宋金元']} /
难经与甲乙 {P['B_hand']['难经与甲乙']} / 明清近代 {P['B_hand']['明清近代']}，**{R['B_hand']}×**）。
原因不是数字难看，而是**书名本身就是章名**：用它当四位面，等于把目录抄一遍，四类之间没有分析价值。

**医家医论只有 {P['A_part']['医家医论']} 次**：教材在宋金元、明清两章多写医家名（刘完素、张介宾、杨继洲）而非「医家」二字，
与针灸治疗学「妇儿科」是同一类词面偏薄，已如实标注。

## 四、这门课的核心判据：三层要分得清

读一段医籍，必须能指着文本说清三件事：**①哪句是原文 ②哪句是注家的话 ③哪句是教材作者的按语**。
分不清这三层，就会把「注家的发挥」当成本经原意，这是医籍课最常见也最难纠正的错。

本课的引文一律标到**书名＋篇名**（如《灵枢·九针十二原》），教材只写书名的，标「教材只写书名」。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "03-zhenjiu-yiji"
node tests/test_chapter_code.js | grep -c "03-zhenjiu-yiji"
python scripts/build_zhenjiu_yiji_text.py
```

**免责声明：** 医籍原文有版本差异，本课以教材所据版本为准；引文不作临床直接依据，用前须核对通行校注本。
"""
io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

gap = """# 针灸医籍选 缺口登记

## 一、没有影印本与版本对照

教材给原文与注释，**未附影印页、未列版本对照表**。同一段在《灵枢》不同刻本有异文时，教材只取一说。
本课一律标「教材取某本」，不代做版本判断。补法：以国家图书馆/中华医典等公开影印为源，按《补源约定》登记。

## 二、三层文本的界线

| 层 | 教材里的表现 | 本课处理 |
|---|---|---|
| 原文 | 引号内或独立成段 | 逐字照录，不改字 |
| 注家 | 「王冰注」「张介宾曰」 | 标出注家名 |
| 教材按语 | 无标记的评述段 | 标「教材按语」 |

教材并非每段都标清这三层，**本课不替它补标**：拿不准的写「层级未标」。

## 三、不做的事

1. **不改原文用字**——通假、异体一律保留，只在旁注说明。
2. **不把歌赋的韵文改写为白话当正文**——白话转述另起一段并标注。
3. **不用 AI 生成「原文」**——第 8 章讲检索工具时明确：模型可以定位，不可以充当版本依据。
"""
io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 03-针灸医籍选" not in s:
    add = f"""### 建 03-针灸医籍选（针灸系第 14 门）

底本 `qhzy-针灸医籍选读.xlsx`（10 内容章）。**解析器第三次单写**（`scripts/build_zhenjiu_yiji_text.py`）：
本册编号写在「内容」列、正文 `段` 是 `11/12/13…`（第 N 段正文），前两本的解析器都不适用。

- **10 教材章 → 8 课程章**（2+3、4+5 合并），{C['units']} 单元无复用；{tot:,} 汉字；目标 8 不变
- 三辨 临证应用 {P['view']['临证应用']} / 义理发挥 {P['view']['义理发挥']} / 训释校勘 {P['view']['训释校勘']}（**{R['view']}×**）
- 四位面 医籍文体（**{R['A_part']}×**）；医籍来源 {R['B_hand']}× 未取（书名即章名，等于抄目录）
- 医籍库 10 条；三层文本（原文/注家/按语）为本课核心判据

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("changelog appended")
print("done:", len(rows), "章", tot, "汉字")
