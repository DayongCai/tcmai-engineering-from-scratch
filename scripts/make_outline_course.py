# -*- coding: utf-8 -*-
"""大脑课通用收尾（用于 07-zhineng 的纲要型底本课）：chapter-map → 脚手架 → docs → 收尾。

用法: python scripts/make_outline_course.py <sub> <dept_rel> <title> <prefix> <chain> <pressure>
prefix 用于 slug：课程章 slug = NN-<prefix><n>（因为教材章名是长句，不做逐个造词）
"""
import io
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable
sub, dept_rel, title, prefix, chain, pressure = sys.argv[1:7]
S = os.path.join(ROOT, "standards", sub)
D = os.path.join(ROOT, dept_rel)
U = json.load(io.open(os.path.join(S, "units.json"), encoding="utf-8"))
C, P, R = U["counts"], U["probe"], U["ratio"]

CM = {}
for c in U["chapters"]:
    n = c["no"]
    t = re.sub(r"[^\u4e00-\u9fffA-Za-z0-9]+", "", c["title"])[:10] or f"di{n}zhang"
    slug = f"{n:02d}-{prefix}{n}"
    CM[slug] = {"n": n, "title": c["title"], "units": [u["sub"] for u in U["units"] if int(u["chapter"]) == n],
                "srcChapters": [str(n)], "why": f"{c['title']}：本课第 {n} 章", "derivedFrom": f"教材第{n}章"}
json.dump({"note": f"{title}：{len(CM)} 章 = 教材 {len(CM)} 章。", "chapters": CM},
          io.open(os.path.join(S, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

fb = {s: [f"《{U['source']['file'].replace('qhzy-','').replace('.xlsx','')}·{v['title'][:16]}》", f"教材第{v['n']}章"] for s, v in CM.items()}
cq = {s: [f"{v['title']}：这一章要回答什么", v["why"]] for s, v in CM.items()}
json.dump({"courseTitle": title, "deptPath": dept_rel, "xlsx": f"F:/textbooks/{U['source']['file']}",
           "chain": chain, "levelLabel": "章群结构", "objectPressure": pressure,
           "reportRule": "记录写：对象与情境、依据的指标、与教材表述的差异",
           "gapNote": "教材为提纲型，原文仅数百字/章；本课按骨架补判据与边界，不按完整教材课看待",
           "chapterQ": cq, "fallback": fb, "defaultCite": [f"《{title}》", "教材章名级"]},
          io.open(os.path.join(S, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

chdir = os.path.join(D, "chapters")
if os.path.isdir(chdir):
    left = [d for d in os.listdir(chdir) if os.path.exists(os.path.join(chdir, d, "docs", "zh.md"))]
    assert not left, f"已有正文 {len(left)} 章，拒绝重建"
for cmd in ([PY, "scripts/scaffold_huli_chapter.py", sub, dept_rel, "--all"],
            [PY, "scripts/build_huli_docs.py", sub, dept_rel]):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print("  ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])

rows, doc_total = [], 0
for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]):
    p = os.path.join(D, "chapters", slug, "docs", "zh.md")
    doc_total += len(re.sub(r"\s", "", io.open(p, encoding="utf-8").read()))
    rows.append({"n": v["n"], "slug": slug, "title": v["title"], "status": "🚧", "docs": "docs/zh.md",
                 "code": "code/main.js"})
json.dump({"slug": os.path.basename(dept_rel), "title": title,
           "note": f"{len(CM)} 章 = 教材 {len(CM)} 章。", "chapters": rows},
          io.open(os.path.join(D, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

ratio_src = C["hanzi"] / max(1, doc_total)
table = "\n".join(f"| {v['n']} | {v['title'][:26]} | `{s}` | {len(v['units'])} |" for s, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]))
readme = f"""# {title}

**{os.path.basename(dept_rel)}** · 智能医学院 · {len(CM)} 章 · {C['units']} 单元 · 底本 {C['hanzi']:,} 汉字

> {pressure}。

## 一、底本强度（先看这一节）

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/{U['source']['file']}` |
| 教材正文 | **{C['hanzi']:,} 汉字**（约 {C['hanzi'] // max(1, len(CM))} 字/章） |
| 课程正文 | {doc_total:,} 非空白字 |
| **原文占比** | **约 {ratio_src:.0%}** |

**这是提纲型教材**：每章正文只有几百字，本课的正文主体是按骨架补出的判据与边界，不是教材转述。
要达「教材课」水准（原文占比 50% 以上），须补完整教材或按补源约定引外部权威资料。

## 二、章表

| # | 章 | slug | 单元 |
|--:|---|---|--:|
{table}

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
{chr(10).join(f"| **{k}** | **{v:,}** |" for k, v in P['view'].items())}

三辨 **{R['view']}×**；四位面 **{R['A_part']}×**（章群分区）。

## 四、不写什么

1. 不写真实患者数据、方药剂量与诊疗结论；
2. 不写平台/框架的版本、表结构与语法；
3. 不把设计当作已上线系统。

## 五、章内可执行验证

```bash
node code/main.js
node --test code/main.test.js
```

**免责声明：** 本课为教学材料，讲方法与结构，不构成医疗决策依据。
"""
io.open(os.path.join(D, "README.md"), "w", encoding="utf-8").write(readme)

gap = f"""# {title} 缺口登记

## 一、底本强度不足（最重要）

| 项 | 实测 |
|---|---|
| 教材正文 | **{C['hanzi']:,} 汉字**（{len(CM)} 章，约 {C['hanzi'] // max(1, len(CM))} 字/章） |
| 课程正文 | {doc_total:,} 非空白字 |
| 原文占比 | **约 {ratio_src:.0%}** |

教材是**提纲**：`节` 与 `正文` 行合计只有数千字，另有 `表格`/`代码` 行未入正文。
本课按骨架补判据与边界，**不能当作教材全文替代**。

## 二、无插图

教材无图，本课未加图注层——底本过薄时加图注只是灌水（同批的 05 中医知识图谱即因此撤掉图注层）。

## 三、表格与代码未入正文

教材 `表格` 与 `代码` 行留在底本 `units.json` 的原始行中，可按 locator 回查。

## 四、不做的事

1. 不写真实患者数据与方药剂量；
2. 不写平台版本与语法；
3. 不把设计当成果。
"""
io.open(os.path.join(D, "缺口登记.md"), "w", encoding="utf-8").write(gap)
print(f"{title}: {len(CM)} 章 · 正文 {doc_total:,} · 原文占比 {ratio_src:.0%} · 三辨 {R['view']}× · 四位面 {R['A_part']}×")
