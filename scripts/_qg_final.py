# -*- coding: utf-8 -*-
"""中医气功学收尾：chapters.json / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT = "qigong", "departments/03-zhenjiu/04-qigong-xue"
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
json.dump({"note": "中医气功学 7 章 ← 教材 13 章（1+2、3+4、6+7、8+9、10+11+12 合并；无单元复用）。",
           "chapters": rows},
          io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

readme = f"""# 中医气功学

**04-qigong-xue** · 针灸推拿学院 · {len(rows)} 章 · {C['units']} 单元 · {tot:,} 汉字

> 章链：概论与简史 → 理论与三调 → 练功反应与偏差 → 静功与动功 → 太极与健身气功 → 辨证施功 → 现代研究与治未病

## 一、底本

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/qhzy-中医气功学.xlsx`（13 内容章） |
| sha256 | `{U['source']['sha256'][:16]}…` |
| 规模 | 13 章 / {C['units']} 单元 / {C['hanzi']:,} 汉字（教材口径） |

## 二、章表（7 课程章 ← 13 教材章）

| # | 章 | 教材章 | 单元 | 汉字 |
|--:|---|---|--:|--:|
{chr(10).join(tbl)}

**为什么 7 章而不是目标 6 章**：教材 13 章里，第 6+7 章（静功、动功）合计 5.4 万字、
第 8+9 章（太极武术、健身气功）2.8 万字——两块分开才各有可读篇幅；合成一章会得到一章 8 万字的「全书压缩版」。
**章节目标由 6 调为 7**，其余合并（1+2、3+4、10+11+12）均同属一条线。无单元复用。

## 三、三辨与四位面（实测）

| 三辨 | 词频 | 四位面（三调与临床） | 词频 |
|---|--:|---|--:|
| **功法操作** | **{P['view']['功法操作']}** | 调息 | {P['A_part']['调息']} |
| **理论原理** | **{P['view']['理论原理']}** | 调身 | {P['A_part']['调身']} |
| **临床运用** | **{P['view']['临床运用']}** | 调心 | {P['A_part']['调心']} |
| | | 临床应用 | {P['A_part']['临床应用']} |

三辨极差 **{R['view']}×**；四位面极差 **{R['A_part']}×**。

**三辨为什么偏斜（4.6×）**：这是本教材的真实形态——气功学用大量篇幅写**怎么练**（姿势、呼吸、意守、动作），
临床应用只用第 10–12 章（3.8 万字）承担，且用词偏病名而非「临床」二字。
没有为了凑平而把「气」「功」这类词根塞进临床类——那是造假轴。

**未取「功法类型」**（静功 {P['B_hand']['静功']} / 动功 {P['B_hand']['动功']} /
太极武术 {P['B_hand']['太极武术']} / 当代健身气功 {P['B_hand']['当代健身气功']}，**{R['B_hand']}×**）：
教材把八段锦、五禽戏散写在多章，按功法类型切会得到一条 97 次的空桶。

## 四、这门课的风险判据

气功课与其他课最不同的地方：**读者会自己练**。所以每章都要求写清三件事：
①这个功法**禁用于什么状态**（急性期、精神疾病、严重心肺疾病等）②出现什么反应必须**立即停**
（头晕、心悸、气促、情绪失控）③找谁处理（第 3 章流程：停功 → 记录 → 就医）。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "04-qigong"
node tests/test_chapter_code.js | grep -c "04-qigong"
python scripts/build_qigong_text.py
```

**免责声明：** 本课为教学材料。气功锻炼存在练功偏差风险，慢性病与精神类疾病患者须在医师指导下进行；
本课不构成任何自我治疗建议。
"""
io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

gap = """# 中医气功学 缺口登记

## 一、无影像与动作分解

教材以文字描述姿势与动作，**没有照片、没有动作分解图、没有视频**。
这是本课最大的缺口：气功的「规格」高度依赖视觉示范，文字只能到「大致」。补法：以国家体育总局健身气功管理中心
公开发布的功法为标准源，按《补源约定》登记（sha256＋版本＋校勘）后再入正文。

## 二、现代研究的证据等级未标

第 13 章「现代研究」列了机制与临床观察，但**未标证据等级**（RCT／队列／动物）。本课不代填。

## 三、练功偏差的边界

教材讲偏差的识别与纠治，本课**不写具体纠治手法**（如自发功处置、点穴纠偏）——
这类内容必须面授，文字描述反而有害。只保留「停功—记录—就医」三步。

## 四、不做的事

1. **不编功法参数**——练功时长、次数、意守部位一律照教材，教材没给的写「教材未给」。
2. **不承诺疗效**——所有适应证表述随教材口径，附「个体差异」。
3. **不把现代研究写成结论**——机制与终点指标分开写，缺终点指标的标「仅有机制」。
"""
io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 04-中医气功学" not in s:
    add = f"""### 建 04-中医气功学（针灸系第 15 门）

底本 `qhzy-中医气功学.xlsx`（13 内容章）。

- **13 教材章 → 7 课程章**，{C['units']} 单元无复用；{tot:,} 汉字；**章节目标 6 → 7**（静功/动功与太极/健身气功不合并，否则一章 8 万字）
- 三辨 功法操作 {P['view']['功法操作']} / 理论原理 {P['view']['理论原理']} / 临床运用 {P['view']['临床运用']}（**{R['view']}×**，教材真实形态，未造假轴凑平）
- 四位面 三调与临床应用（**{R['A_part']}×**）；功法类型 {R['B_hand']}× 未取（当代健身气功仅 {P['B_hand']['当代健身气功']} 次）
- 风险判据：每章写清禁用状态、必须停功的反应、处理流程；不写纠治手法（须面授）

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("changelog appended")
print("done:", len(rows), "章", tot, "汉字")
