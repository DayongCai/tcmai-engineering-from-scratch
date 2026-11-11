# -*- coding: utf-8 -*-
"""11-关节病学收尾：chapters.json / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
SUB, DEPT = "gushang-bing", "departments/04-gushang/11-guanjie-bing-xue"
TITLE = "关节病学"

U = json.load(io.open(os.path.join(S, SUB, "units.json"), encoding="utf-8"))
CM = json.load(io.open(os.path.join(S, SUB, "chapter-map.json"), encoding="utf-8"))["chapters"]
C, P, R = U["counts"], U["probe"], U["ratio"]
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
json.dump({"note": "关节病学 10 章 ← 《中医骨病学》12 章（1+2、11+12 合并；无单元复用）。", "chapters": rows},
          io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

readme = f"""# 关节病学

**11-guanjie-bing-xue** · 骨伤学院 · {len(rows)} 章 · {C['units']} 单元 · {tot:,} 汉字

> 关节病学的判据是「先排危险」：感染、结核、肿瘤三类必须在慢性关节痛中被主动排除。

## 一、底本

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/{U['source']['file']}` |
| sha256 | `{U['source']['sha256'][:16]}…` |
| 规模 | **12 章 / 60 单元 / {C['hanzi']:,} 汉字**（教材口径） |

**口径说明（重要）**：本课底本是《中医骨病学》，它**覆盖面宽于「关节病学」这个课名**。
按本轮决策**并入 11-关节病学、不新开学科**，因此：

- 第 1–5、9 章是纯关节病内容（总论、感染性关节炎、结核、退行性、免疫性）；
- 第 6 章（骨肿瘤）、第 7 章（骨代谢）、第 10 章（畸形）**超出课名范围**，保留为**鉴别与转诊**内容——
  它们不是凑数：慢性关节痛必须先排除肿瘤与骨代谢病。

## 二、章表（10 课程章 ← 12 教材章）

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

## 四、判据

每章要求写清四件：**病程与部位、必须排除的危险诊断、分型分期依据、处理与随访节点**。
尤其是「排除」——关节痛最容易被当成劳损，而结核、感染、肿瘤的早期都像劳损。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "11-guanjie-bing"
node tests/test_chapter_code.js | grep -c "11-guanjie-bing"
python scripts/_gs_bing.py
```

**免责声明：** 本课为教学材料。关节感染、结核、肿瘤三类须由具备条件的医疗机构确诊与处置；
教材未给的数值（分期阈值、用药剂量）本课一律标「教材未给」。
"""
io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

gap = f"""# 关节病学 缺口登记

## 一、底本覆盖面与课名不一致（已按决策保留）

底本《中医骨病学》12 章里，**骨肿瘤（第 7 章）、骨代谢（第 8 章）、骨畸形（第 11 章）**不属于
「关节病学」的标准范围。本轮按「并入 11、不新开学科」的决策，把它们保留为**鉴别与转诊**内容：

| 教材章 | 在本课的位置 | 保留理由 |
|---|---|---|
| 7 骨肿瘤 | 第 6 章 | 慢性关节痛必须排除恶性 |
| 8 骨代谢 | 第 7 章 | 骨质疏松是关节置换前的必查项 |
| 11 骨畸形 | 第 10 章 | 畸形矫正与关节力线直接相关 |

**若要严格按课名授课，第 6、7、10 章可标为选读**——内容已在，不闲置。

## 二、无影像片与插图

教材以文字描述分型与影像征象，**没有 X 线／CT／MRI 片子**。关节病的分期（如股骨头坏死分期）
高度依赖影像。补法：以公开影像图谱与国家标准为源，按《补源约定》登记后再入正文。

## 三、数值型参数

| 类型 | 教材状态 | 本课处理 |
|---|---|---|
| 分期分级（Ficat、Kellgren 等） | 给分期名与文字描述 | 照录分期名，不给阈值角度 |
| 用药剂量 | 多数只给方名 | 标「教材未给」 |
| 随访间隔 | 部分给区间 | 照录区间 |

## 四、不做的事

1. **不给手术指征的数值门槛**——随教材口径。
2. **不把「排除诊断」写成确诊路径**——只讲要查什么，不讲结论。
3. **不承诺疗程与预后**。
"""
io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 11-guanjie-bing-xue" not in s:
    add = f"""### 建 11-guanjie-bing-xue（关节病学·教材课）

底本 `qhzy-中医骨病学.xlsx`（12 内容章 / 60 单元 / {C['hanzi']:,} 汉字）。

- **12 教材章 → 10 课程章**（1+2、11+12 合并），60 单元无复用；{tot:,} 汉字
- 三辨 病因病机 {P['view'].get('病因病机',0)} / 辨证内治 {P['view'].get('辨证内治',0)} / 外治与手术 {P['view'].get('外治与手术',0)}（**{R['view']}×**）
- 四位面＝章群结构分区（**{R['A_part']}×**）：基础与诊查 / 感染与结核 / 肿瘤代谢与坏死 / 退变畸形与康复
- **按决策并入 11，不新开学科**；骨肿瘤/骨代谢/骨畸形三章保留为鉴别与转诊内容，未闲置，README 与缺口登记均写明「可标选读」

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("changelog appended")
print(f"done: {len(rows)} 章 {tot:,} 汉字")
