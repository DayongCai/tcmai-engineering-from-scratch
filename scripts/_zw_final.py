# -*- coding: utf-8 -*-
"""药用植物学收尾：chapters.json / README / CHANGELOG。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT = "yaoyong-zhiwu-xue", "departments/02-zhongyao/02-yaoyong-zhiwu-xue"
base = os.path.join(ROOT, "standards", SUB)
dpath = os.path.join(ROOT, DEPT)

U = json.load(io.open(os.path.join(base, "units.json"), encoding="utf-8"))
CM = json.load(io.open(os.path.join(base, "chapter-map.json"), encoding="utf-8"))["chapters"]
C, P = U["counts"], U["probe"]
R = U["ratio"]
by = {u["sub"]: u for u in U["units"]}

rows, tbl, tot = [], [], 0
for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]):
    hz = sum(by[x]["hanzi"] for x in v["units"])
    tot += hz
    rows.append({"n": v["n"], "slug": slug, "title": v["title"], "status": "🚧",
                 "docs": "docs/zh.md", "code": "code/main.js"})
    tbl.append(f"| {v['n']} | {v['title']} | 教材 {'、'.join(v['srcChapters'])} | {len(v['units'])} | {hz:,} |")
json.dump({"note": "药用植物学 9 章 ← 教材 12 章（1:1 或 2:1 归并，无单元复用）。", "chapters": rows},
          io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

readme = f"""# 药用植物学

**02-yaoyong-zhiwu-xue** · 中药学院 · {C['chapters']} 章 · {C['units']} 单元 · {tot:,} 汉字

> 章链：绪论 → 细胞与组织 → 根与茎 → 叶 → 花·果实·种子 → 分类学基础与低等植物 → 苔藓·蕨类·裸子 → 被子植物 → 资源与分子鉴定

## 一、底本

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/qhzy-药用植物学.xlsx`（12 内容章） |
| sha256 | `{U['source']['sha256'][:16]}…` |
| 规模 | 12 章 / 52 单元 / 155,909 汉字（教材口径） |

## 二、章表（9 课程章 ← 12 教材章）

| # | 章 | 教材章 | 单元 | 汉字 |
|--:|---|---|--:|--:|
{chr(10).join(tbl)}

**归并理由**：教材按「器官 + 类群」两个维度各写一遍，课程按「先器官后类群」重排，
1:1 或 2:1 归并，**无单元复用**（同一单元只落一章）。

## 三、三辨与四位面（实测）

| 三辨 | 词频 | 四位面（观察视角） | 词频 |
|---|--:|---|--:|
| **分类与鉴定** | **{P['view']['分类与鉴定']}** | 分类依据 | {P['A_part']['分类依据']} |
| **形态描述** | **{P['view']['形态描述']}** | 内部结构 | {P['A_part']['内部结构']} |
| **显微结构** | **{P['view']['显微结构']}** | 外部形态 | {P['A_part']['外部形态']} |
| | | 资源利用 | {P['A_part']['资源利用']} |

三辨极差 **{R['view']}×**；四位面极差 **{R['A_part']}×**。

**未取：器官层次**（细胞与组织 {P['B_hand']['细胞与组织']} / 营养器官 {P['B_hand']['营养器官']} /
生殖器官 {P['B_hand']['生殖器官']} / 类群 {P['B_hand']['类群']}，**{R['B_hand']}×**）——
**类群只有 {P['B_hand']['类群']} 次**，教材把类群写在章名上、正文里却按科描述，取它会把四类拉成 8 倍差。

**为什么四位面取「观察视角」**：外部形态、内部结构、分类依据、资源利用是**同一株植物的四种读法**，
四类都不薄（{R['A_part']}×），也正是本课要求学生反复切换的四层。

## 四、这门课不教什么

1. **不替代实验切片**：显微结构只讲判据，不给镜下图谱（缺口见 `缺口登记.md`）。
2. **不列全科属检索表**：只到代表科与药典常见基原。
3. **不写栽培技术**：那是《中药资源学》的范围（本系已建，第 4 章规范化种植）。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "02-yaoyong-zhiwu"
node tests/test_chapter_code.js | grep -c "02-yaoyong-zhiwu"
python scripts/build_yaoyong_zhiwu_text.py
```

**免责声明：** 本课为教学材料，基原与分类以《中国药典》一部及《中国植物志》现行版为准；不构成鉴定或用药依据。
"""
io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

gap = f"""# 药用植物学 缺口登记

## 一、显微图谱与实验切片

教材正文给出显微判据（细胞壁、维管束、气孔、淀粉粒等），但**镜下图谱未入正文**。
补法：以药典一部显微鉴别项 + 教学切片照片为源，按《补源约定》逐条登记（A 级＝药典/国家级标本馆）。

## 二、科属检索表只到代表科

全书 12 章覆盖藻、菌、地衣、苔藓、蕨、裸子、被子（离瓣/合瓣/单子叶），
但**每科只列代表药用植物**，未做全科属检索表。补法：《中国植物志》对应卷册。

## 三、分子鉴定只到方法层

第 9 章讲 DNA 条形码与分子标记的**用途与判据**，未给具体引物与序列（属技术细节，随药典更新）。

## 四、数值口径

教材可数数值仅 **{C['digits']} 处**（多为尺寸范围），本课不据此做量化结论。
"""
io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
tag = "建 02-药用植物学"
if tag not in s:
    add = f"""
### 建 02-药用植物学（中药系第 17 门）

底本 `qhzy-药用植物学.xlsx`（12 内容章）。`scripts/build_yaoyong_zhiwu_text.py`
（由鉴定学脚本改写，轴全部换过）产出 `standards/yaoyong-zhiwu-xue/{{底本,units,类群库,axis-probe}}.json`。

- **12 教材章 → 9 课程章**，52 单元无复用；{tot:,} 汉字
- 三辨 分类与鉴定 {P['view']['分类与鉴定']} / 形态描述 {P['view']['形态描述']} / 显微结构 {P['view']['显微结构']}（**{R['view']}×**）
- 四位面 观察视角（{R['A_part']}×）；**器官层次 {R['B_hand']}× 未取**（类群仅 {P['B_hand']['类群']} 次）
- 产物：`chapter-map.json` / `axes.json` / `doc-config.json` / 9 章 code+docs+outputs+quiz
- 章节目标仍 8，实际 9 章：资源与分子鉴定独立成章（教材第 12 章 19,505 字，与前章主题不同）

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("changelog appended")
print("done:", len(rows), "章", tot, "汉字")
