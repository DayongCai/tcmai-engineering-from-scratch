# -*- coding: utf-8 -*-
"""重写 12-yaoli-xue 的 README / 缺口登记 / 章内小节清单（数据源：standards/yaoli/底本.json + 磁盘）。"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEPT = os.path.join(ROOT, "departments", "09-jichu", "12-yaoli-xue")
DB = json.load(io.open(os.path.join(ROOT, "standards", "yaoli", "底本.json"), encoding="utf-8"))
CH = json.load(io.open(os.path.join(DEPT, "chapters.json"), encoding="utf-8"))["chapters"]
C = DB["counts"]

rows, tot_doc = [], 0
for c in CH:
    p = os.path.join(DEPT, "chapters", c["slug"], "docs", "zh.md")
    doc = io.open(p, encoding="utf-8").read()
    n = len(re.sub(r"\s", "", doc))
    tot_doc += n
    rows.append((c["n"], c["slug"], c.get("part", ""), n))

tbl = "\n".join(f"| {n} | {slug} | {part} | {d:,} |" for n, slug, part, d in rows)

readme = f"""# 药理学

**12-yaoli-xue** · 基础医学院 · {len(CH)} 章 · {C['subs']} 小节 · 底本 {C['hanzi']:,} 汉字

> 药理学的判据是「靶点—效应—风险」三件套：说得出靶点，才说得清不良反应。

## 一、底本与规模

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/qhzy-药理学.xlsx` |
| 结构化底本 | `standards/yaoli/底本.json`（{C['chapters']} 章 / {C['secs']} 节 / {C['subs']} 小节 / {C['hanzi']:,} 汉字 / 量值 {C['valueLike']} 处） |
| 章节目标 | {len(CH)}（**1:1 对应教材，无合并拆分，无单元复用**） |
| 课程正文 | 49 章 docs 合计 **{tot_doc:,} 非空白字**（每章 3,000–14,000，见下表） |

## 二、这门课的写法（与「教材搬字」的区别）

每章 4 节 12 小节，正文按「问题 → 机制链 → 判据 → 记录」组织，不逐句复述教材：

1. **引文逐字**：每章 ≥6 条引文用「」括起，同一行标 `教材·药理学·第N章·M.K.L` 三级出处，回查不到就不引；
2. **非引文行不写量值**：剂量、浓度、时程一律写「剂量与用法照底本」，量值只允许出现在带出处的引文行（见 `## 代价与边界`）；
3. **可复算**：每章 `code/main.js` 读底本现算规模与词频，`code/main.test.js` 六项单测把关。

## 三、章表（章 / slug / 篇 / 正文非空白字）

| # | slug | 篇 | 正文 |
|--:|---|---|--:|
{tbl}

## 四、门

| 门 | 命令 | 判据 |
|---|---|---|
| 章门 | `node tests/test_yaoli_chapters.js` | 11 项：6 文件齐 / 引文逐字回查 / 三级 locator 与章号对得上 / 12 小节号全在 / 篇幅 / quiz 六题与阶段 / outputs 与 skill frontmatter / 章内单测与末行边界 / 数值口径 B 支 / 旁白层 / 成片时长 |
| 全库门 | `npm run check` | 含 `audit_curriculum`、`test_chapter_code`、`yaoli:yaml:check` |

**免责声明：** 本课为教学材料。剂量、给药间隔、特殊人群用法一律以现行药典与药品说明书为准；本课只讲机制与风险，不构成用药建议。
"""

gap = f"""# 药理学 缺口登记

## 一、剂量与说明书级信息（本课最硬的自我限制）

| 类型 | 处理 |
|---|---|
| 具体剂量、浓度、滴速 | 不写——只写「剂量与用法照底本」 |
| 给药间隔与疗程 | 只写机制决定的「为什么这样给」 |
| 儿童 / 孕产妇 / 肝肾功能调整 | 标「须查说明书」，不给换算 |

原因：教材底本本身带 {C['valueLike']} 处量值，抄错一位或把成人量当儿童量都能「读起来像教材」。门因此走 B 支：量值只许出现在带三级出处的引文行。

## 二、无图表

剂量—效应曲线、受体信号通路、药动学曲线本应以图呈现；教材为纯文字，本课亦无图。

## 三、平台旁白与正文的偏差（**已知不一致，须重渲染才能消除**）

2026-11-07 重建正文时，`platform/courses/09-jichu/12-yaoli-xue/` 下的旁白、幻灯片与成片（49 章 · 约 18 小时 · 4.0 GB）**仍是早前一轮正文的成品**，
它们对应的文稿在这次重建中被替换。门 `tests/test_yaoli_chapters.js` 的第 10、11 项只核旁白结构（段数 / 角色 / 时长 / 字幕轨）与成片时长，**不核旁白是否为当前正文**。

消除办法：按新正文重跑旁白抽取与渲染（`narration → slides → video`），或将本课正文回改为旁白口径。当前**未做**。

## 四、与《中药药理学》的分工

本库另有 `07-zhongyao-yaoli-xue`（中药药理学）。本课讲化学药物的靶点与机制，那门讲中药的效应与机制；汉字不相加。

## 五、不做的事

1. 不给处方与用药方案；
2. 不把动物实验结论当人体结论；
3. 不替代《临床药理学》与各科治疗学。
"""
io.open(os.path.join(DEPT, "README.md"), "w", encoding="utf-8").write(readme)
io.open(os.path.join(DEPT, "缺口登记.md"), "w", encoding="utf-8").write(gap)

blocks = []
for c in CH:
    ch = [x for x in DB["chapters"] if x["no"] == c["n"]][0]
    lines = []
    for s in ch["secs"]:
        lines.append(f"\n**{s['no']} {s['title']}**\n")
        for u in s["subs"]:
            lines.append(f"- {u['no']} {u['title']} · {len(u.get('body',''))} 字")
    blocks.append(f"## {c['n']:02d} {ch['title']}\n" + "\n".join(lines) + "\n")
io.open(os.path.join(DEPT, "章内单元清单.md"), "w", encoding="utf-8").write(
    "# 药理学 章内小节清单\n\n> 由 `scripts/_yl_final2.py` 从 `standards/yaoli/底本.json` 现算（字数取 body 汉字）。\n\n" + "\n".join(blocks))

print(f"README / 缺口登记 / 章内小节清单 已重写；正文合计 {tot_doc:,} 非空白字")
