# -*- coding: utf-8 -*-
"""04 创伤急救学收尾：chapters.json / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
SUB, DEPT, TITLE = "gushang-chuangshang-jijiu", "departments/04-gushang/04-chuangshang-jijiu-xue", "创伤急救学"

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
json.dump({"note": "创伤急救学 派生课：8 章，单元取自父课（locator 派生·），本课内无复用。", "chapters": rows},
          io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

readme = f"""# 创伤急救学

**04-chuangshang-jijiu-xue** · 骨伤学院 · {len(rows)} 章 · {C['units']} 单元 · {tot:,} 汉字

> 创伤急救的判据是「顺序与时限」：先保命、再保肢、最后谈功能。

**课程类型：派生课（无独立教材）**。单元正文逐字取自父课，`locator` 一律 `派生·第N章·m.k`；
本课汉字**不与父课相加**。

## 一、父课

{chr(10).join(f'- `{p}`' for p in used)}

## 二、章表

| # | 章 | 父课来源 | 单元 | 汉字 |
|--:|---|---|--:|--:|
{chr(10).join(tbl)}

**第 1、8 章各 3.4 万字**，因为父课（急救护理）的「急救总论」「灾难救援」两章本身就是整章长文；
第 5、7 章较薄（7.6k / 9.0k），因为骨伤科学与外科学在胸腹创伤、烧伤上写得相对少。这是父课文本重心的如实反映。

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
{chr(10).join(f"| **{k}** | **{v}** |" for k, v in P['view'].items())}

三辨极差 **{R['view']}×**。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
{chr(10).join(f"| {k} | {v:,} |" for k, v in P['A_part'].items())}

四位面极差 **{R['A_part']}×**。

## 四、这门课的三条硬顺序

1. **ABCDE 的顺序不能换**：气道 → 呼吸 → 循环 → 意识 → 暴露；换一步就可能漏掉致命伤。
2. **疑似脊柱损伤：先固定，再搬动**。搬运姿势错，稳定骨折会变成不稳定。
3. **保肢优先于复位质量**：急救阶段的目标是止血、固定、转运，不是解剖复位。

每章要求写清：**受伤机制、生命体征、处置动作、时限、转运去向**——缺一项就无法复盘。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "04-chuangshang-jijiu"
node tests/test_chapter_code.js | grep -c "04-chuangshang-jijiu"
python scripts/_derive_jijiu.py
```

**免责声明：** 本课为教学材料，**不能替代急救培训与执业资格**。实际急救须由受过训练的人员按现行指南实施；
本课不给药物剂量与操作参数。
"""
io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

gap = """# 创伤急救学 缺口登记

## 一、无独立教材（派生课）

单元逐字取自骨伤科学、急救护理学、正骨学、中医外科学、康复护理学。本课汉字不与父课相加。

## 二、不写剂量与参数（本课最硬的自我限制）

| 类型 | 处理 |
|---|---|
| 升压药、镇痛药、液体量 | **不写**——须按现行指南与患者状态，文字教学无法承载 |
| 止血带时间、气道器械型号 | **不写** |
| 分诊分级阈值 | 只写方法名（如「检伤分类」），不写数值分界 |

原因：急救参数一旦写错或过时，读者照做会致命。本课只教**顺序与识别**，参数留给规范与培训。

## 三、无图（骨伤系共性）

包扎、固定、搬运体位高度依赖图示。见 `departments/04-gushang/图示缺口.md`；
本课正文以文字描述动作要点（如「搬运时保持头颈躯干一条线」），不给示意手势图。

## 四、不做的事

1. 不给「急救流程图」的图形复刻（版权与准确性双重风险）；
2. 不写个案处置——急救是个体化决策；
3. 不把中医外治（如外用止血药）写成一线措施，须标「辅助、循证有限」。
"""
io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 04-chuangshang-jijiu-xue" not in s:
    add = f"""### 建 04-chuangshang-jijiu-xue（创伤急救学·派生课）

- 8 章 / {C['units']} 单元 / {tot:,} 汉字；单元取自 {len(used)} 门父课，locator `派生·`，无复用
- 三辨 评估与识别 {P['view'].get('评估与识别',0)} / 急救措施 {P['view'].get('急救措施',0)} / 风险与转运 {P['view'].get('风险与转运',0)}（**{R['view']}×**）
- 四位面＝章群结构分区（**{R['A_part']}×**）
- **不写药物剂量、止血带时间、分诊阈值**：只教顺序与识别，参数留给规范与培训（已写进缺口登记）
- 三条硬顺序写进 README：ABCDE 不可换序 / 疑似脊柱损伤先固定 / 保肢优先于复位质量

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("changelog appended")
print(f"done: {len(rows)} 章 {tot:,} 汉字")
