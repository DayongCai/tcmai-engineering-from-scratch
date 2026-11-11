# -*- coding: utf-8 -*-
"""17 骨伤毕设：把课程正文与 standards/biye 的骨伤实例接上。

产出：
  departments/04-gushang/17-gushang-biye-sheji/毕设对接.md
  每章 docs/zh.md 末尾追加「与骨伤毕设实例的对应」段（数字全部从实例 JSON 现算）
"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INST = os.path.join(ROOT, "standards", "biye", "instances", "04-gushang.json")
DEPT = os.path.join(ROOT, "departments", "04-gushang", "17-gushang-biye-sheji")

D = json.load(io.open(INST, encoding="utf-8"))
base = D["base"]
item2, item3, item4 = D["item2"], D["item3"], D["item4"]
cases = D["cases"]
costs = item4["成本侧"]
revs = item4["收入侧"]

def money(x):
    return f"{x:,.0f}"

doc = f"""# 骨伤毕设实例对接（课程 ↔ `standards/biye`）

> 本文件由 `scripts/_gushang_biye_link.py` 从 `standards/biye/instances/04-gushang.json` **现算生成**，
> 手改无效。重算命令：`{D['复算']}`。

## 一、本系毕设产物（实例 `product`）

**{D['product']}**

三份可交付案例：

{chr(10).join(f'{i}. {c}' for i, c in enumerate(cases, 1))}

## 二、七项检查表状态

| 项 | 状态 | 证据 |
|---|---|---|
| 1 产物可复算 | 齐备 | `{D['复算'].split('&&')[0].strip()}` |
| 2 客群与渗透 | 齐备 | 客群 {item2['客群']} · SAM {money(item2['SAM'])}（{item2['SAM来源']}）· 客户数 {item2['客户数']} · 隐含渗透率 {item2['隐含渗透率%']}% → {item2['判定']} |
| 3 客单与营收锚 | 齐备 | 客单 {money(item3['客单'])} 元 · 占客群年营收 {item3['客单占营收%']}% → {item3['判定']} |
| 4 成本与收入敏感性 | 齐备 | 成本侧 {len(costs)} 档 · 收入侧 {len(revs)} 档 · 首次转亏系数 {item4['首次转亏的客户数系数']} |
| 5 假设与口径 | 齐备 | 成熟度系数 {D['assumptions']['成熟度系数']} · 产品化人月 {D['assumptions']['产品化人月']} |
| 6 工时台账 | 见台账 | `standards/biye/工时台账.json`（0/占位值不计） |
| 7 欠账登记 | 见清单 | `standards/biye/欠账清单.json` |

## 三、基准值（`base`，全部现算）

| 项 | 值 |
|---|---:|
| 三年客户数 | {base['客户数']} |
| 首年客户 | {base['首年客户']} |
| 建设成本 | {money(base['建设'])} 元 |
| 首年获客 | {money(base['获客'])} 元 |
| 年运维 | {money(base['运维'])} 元 |
| 三年收入 | {money(base['三年收入'])} 元 |
| 三年成本 | {money(base['三年成本'])} 元 |
| 三年毛利 | {money(base['三年毛利'])} 元 |
| 回本中位 | {base['回本中位']} 月 |
| 是否亏损 | {'是' if base['亏损'] else '否'} |

## 四、成本侧敏感性（人月单价四档）

| 人月单价 | 建设 | 三年毛利 | 回本月数 |
|---:|---:|---:|---:|
{chr(10).join(f"| {money(c['人月单价'])} | {money(c['建设'])} | {money(c['三年毛利'])} | {c['回本']} |" for c in costs)}

## 五、收入侧敏感性（客户数系数五档）

| 系数 | 客户数 | 三年收入 | 三年毛利 | 回本月数 |
|---:|---:|---:|---:|---:|
{chr(10).join(f"| {r['客户数系数']} | {r['客户数']} | {money(r['三年收入'])} | {money(r['三年毛利'])} | {r['回本']} |" for r in revs)}

## 六、口径提醒

- 客单、客户数、渗透率均为**教学假设**，不是市场报价，不构成商业承诺；
- 公开数字（S1/S17 等）只用于说明市场与政策方向，不用于估收入；
- 本课的「疗效与并发症评价」一章讲的是**临床指标**，与本节「投入产出」是两条线，不可混算。

## 七、章节对位

| 课章 | 对应实例字段 |
|---|---|
| 01 选题 | `product`＋`cases`（题目必须落到可交付产物） |
| 02 数据准备 | `product` 的单元层规模＋`复算` 命令 |
| 03 实现 | `cases[1]` 轴选择留痕报告 |
| 04 疗效评价 | `cases[2]` 康复量表可复现包＋`item4` 敏感性 |
| 05 写作答辩 | `通用检查表.md` 七项＋本节判定 |
| 06 知识移交 | `assumptions`＋`复算`＋工时台账/欠账清单 |
"""
io.open(os.path.join(DEPT, "毕设对接.md"), "w", encoding="utf-8").write(doc)
print("毕设对接.md 写入")

# 每章追加一段（各章不同）
add = {
 "01-xuan-ti": f"""## 与骨伤毕设实例的对应

本系实例的产物是「{D['product']}」，三份可交付案例为{'、'.join(cases)}。
选题时必须先指认自己要交付其中哪一份、或是它的子集——指不出来，题目就还没成形。
客群口径见 `standards/biye/instances/04-gushang.json` 的 `item2`（{item2['客群']}，客户数 {item2['客户数']}）。
""",
 "02-yingxiang-shuju": f"""## 与骨伤毕设实例的对应

实例的产物规模是**{D['product']}**：数据准备做到这一步，才谈得上「可复算」。
复算命令写在实例的 `复算` 字段（`{D['复算']}`），答辩前必须自己能跑通一次。
影像与生物力学数据属**测量层**，不是结论层——这一点在实例里没有对应字段，需要在本章自建。
""",
 "03-shoufa-zhiju": f"""## 与骨伤毕设实例的对应

实例三案中的「{cases[1]}」就是本章的交付物形态：**轴的选择要留痕**，四候选轴的实测值、否决理由都要写下。
只写「我选了某轴」，等于没写。
""",
 "04-liaoxiao-pingjia": f"""## 与骨伤毕设实例的对应

临床侧交付物是「{cases[2]}」：量表与评分必须能被别人重算。
经济侧见实例 `item4` 的敏感性——成本侧 {len(costs)} 档（人月单价 {money(costs[0]['人月单价'])}–{money(costs[-1]['人月单价'])}），
收入侧 {len(revs)} 档（系数 {revs[0]['客户数系数']}–{revs[-1]['客户数系数']}），基准回本 {base['回本中位']} 月。
**两条线不可混算**：临床疗效不是收入，敏感性不是疗效。
""",
 "05-lunwen-dabian": f"""## 与骨伤毕设实例的对应

答辩要能对上 `standards/biye/通用检查表.md` 的七项，其中 1–5 项在本系实例里已齐备
（产物可复算、客群、客单锚、敏感性、假设口径），第 6 项看工时台账、第 7 项看欠账清单。
讲台上有三个必答：产物是什么、凭什么说它可复算、哪一档参数会让结论翻转（回本中位 {base['回本中位']} 月的那一档）。
""",
 "06-zhishi-yijiao": f"""## 与骨伤毕设实例的对应

移交的最小集是三样：`assumptions`（假设：成熟度系数 {D['assumptions']['成熟度系数']}、产品化人月 {D['assumptions']['产品化人月']}）、
`复算` 命令（`{D['复算']}`）、以及工时台账与欠账清单。
少了任何一样，接手的人只能重做，不能接着做。
""",
}

for slug, text in add.items():
    p = os.path.join(DEPT, "chapters", slug, "docs", "zh.md")
    s = io.open(p, encoding="utf-8").read()
    marker = "## 与骨伤毕设实例的对应"
    if marker in s:
        s = s.split(marker)[0].rstrip() + "\n\n" + text
    else:
        s = s.rstrip() + "\n\n" + text
    io.open(p, "w", encoding="utf-8").write(s)
    print("docs 追加:", slug, len(re.findall(r"[\u4e00-\u9fff]", s)), "汉字")
