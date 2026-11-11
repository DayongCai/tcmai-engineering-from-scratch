# -*- coding: utf-8 -*-
"""第二批四门收尾：chapters.json / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")

COURSES = {
 "zhengchang-renti-xue": ("departments/09-jichu/05-zhengchang-renti-xue", "正常人体学",
   "层次—结构—功能：说得清在哪一层、由什么构成、维持什么，才算认得", None),
 "jibing-xue-jichu": ("departments/09-jichu/14-jibing-xue-jichu", "疾病学基础",
   "病因—机制—表现：说得清从哪来、怎么发生、看见什么，才算读懂",
   "教材「0目录」的中篇、下篇标题沿用了护理教材模板（「精神障碍病人的护理」「康复与安全管理」），与本书内容不符；本课按章段命名为「病理过程与系统疾病」「治疗与防治」。"),
 "liuxingbing-xue": ("departments/09-jichu/15-liuxingbing-xue", "流行病学",
   "设计—测量—推断：说得清怎么选的样本、算的什么率、能不能下因果结论，才算会读一篇研究", None),
 "mianyi-bingyuan-shengwu": ("departments/09-jichu/13-mianyi-bingyuan-shengwu", "免疫学基础与病原生物学",
   "识别—应答—结局：认得谁、怎么应答、结局是清除还是损伤，说得清才算读懂", None),
}

bits = []
for sub, (dept_rel, title, motto, note) in COURSES.items():
    U = json.load(io.open(os.path.join(S, sub, "units.json"), encoding="utf-8"))
    CM = json.load(io.open(os.path.join(S, sub, "chapter-map.json"), encoding="utf-8"))["chapters"]
    DEPT = os.path.join(ROOT, dept_rel)
    C, P, R = U["counts"], U["probe"], U["ratio"]

    rows, doc_total = [], 0
    for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]):
        p = os.path.join(DEPT, "chapters", slug, "docs", "zh.md")
        n = len(re.sub(r"\s", "", io.open(p, encoding="utf-8").read()))
        doc_total += n
        rows.append({"n": v["n"], "slug": slug, "title": v["title"], "status": "🚧",
                     "docs": "docs/zh.md", "code": "code/main.js"})
    json.dump({"slug": os.path.basename(dept_rel), "title": title,
               "note": f"{len(rows)} 章 = 教材 {len(rows)} 章（1:1）。", "chapters": rows},
              io.open(os.path.join(DEPT, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    table = "\n".join(f"| {r['n']} | {r['title']} | `{r['slug']}` | {len(CM[r['slug']]['units'])} |" for r in rows)
    planes = "\n".join(f"| {k} | {v:,} |" for k, v in P["A_part"].items())
    readme = f"""# {title}

**{os.path.basename(dept_rel)}** · 基础医学院 · {len(rows)} 章 · {C['units']} 单元 · 底本 {C['hanzi']:,} 汉字

> {motto}。

## 一、底本与规模

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/{U['source']['file']}` |
| sha256 | `{U['source']['sha256'][:16]}…` |
| 规模 | **{C['chapters']} 章 / {C['units']} 单元 / {C['hanzi']:,} 汉字** |
| 章节目标 | {len(rows)}（**1:1 对应教材，无合并拆分，无单元复用**） |
| 课程正文 | {len(rows)} 章 docs 合计 **{doc_total:,} 非空白字** |

## 二、章表

| # | 章 | slug | 单元 |
|--:|---|---|--:|
{table}

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
{chr(10).join(f"| **{k}** | **{v:,}** |" for k, v in P['view'].items())}

三辨极差 **{R['view']}×**（先量多组候选再选一组，取其极差最接近 3 的一组，理由与方法见 `standards/{sub}/axes.json`）。

| 四位面（教材篇结构） | 汉字 |
|---|--:|
{planes}

四位面 **{R['A_part']}×**——按教材「上/中/下/末」四篇分区，不按词频造面。

## 四、插图与图注

本课教材无插图，采取「**图注先行、图版待补**」：每章每节一条图注（`figures.json` + docs「图注（可独立阅读）」），
四要素齐备（部位与切面 / 方位与参照 / 可见与不可见 / 判据），**只看图注也能复述结论**；
正文提图只写图号，不写「见上图」。图版 0 张，登记在 `图示缺口.md`。

## 五、章内可执行验证

```bash
node code/main.js              # 本章规模与三辨/位面读数（由 units.json 现算）
node --test code/main.test.js  # 章内单测
```

**免责声明：** 本课为教学材料，讲结构与机制，不作诊断与预测结论，不替代临床与公共卫生规范。
"""
    if note:
        readme = readme.replace("## 三、三辨与四位面（实测）", f"## 底本缺陷说明\n\n{note}\n\n## 三、三辨与四位面（实测）")
    io.open(os.path.join(DEPT, "README.md"), "w", encoding="utf-8").write(readme)

    gap = f"""# {title} 缺口登记

## 一、无原图

教材为纯文字，本课以「图注先行」应对（见 `图示缺口.md`）：图注独立成文，图版待补；不引任何临床影像与标本照片。

## 二、不写参数

本课只写结构与机制，不写尺寸、剂量、率值等参数；教材未给的参数，本课也不补。

## 三、三辨偏斜

三辨极差 **{R['view']}×**（{('、'.join(f'{k} {v:,}' for k, v in P['view'].items()))}），为教材写法所致，如实保留。
"""
    if note:
        gap += f"\n## 四、底本缺陷\n\n{note}\n"
    io.open(os.path.join(DEPT, "缺口登记.md"), "w", encoding="utf-8").write(gap)
    bits.append((sub, title, len(rows), C["units"], C["hanzi"], doc_total, R["view"], R["A_part"]))
    print(f"{sub}: {len(rows)} 章 · 正文 {doc_total:,} · 三辨 {R['view']}× · 四位面 {R['A_part']}×")

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "第二批四门基础教材课" not in s:
    lines = "\n".join(f"- `{sub}`（{t}）：{n} 章 / {u} 单元 / 底本 {h:,} 汉字 · 正文 {d:,} 非空白字 · 三辨 {rv}× · 四位面 {ra}×"
                      for sub, t, n, u, h, d, rv, ra in bits)
    add = f"""### 建第二批四门基础教材课（正常人体学/疾病学基础/流行病学/免疫病原）

{lines}

共同口径：1:1 对应教材章；四位面按教材四篇；三辨先量多组候选再选；图注层同批落位（figures.json + 图示缺口.md）。
底本缺陷：`jibing-xue-jichu` 的教材目录篇名沿用护理模板（「精神障碍病人的护理」「康复与安全管理」），本课按章段重命名并登记。

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("CHANGELOG 已补")
