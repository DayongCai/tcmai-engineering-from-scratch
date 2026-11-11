# -*- coding: utf-8 -*-
"""刺法灸法学收尾：chapters.json / README / 缺口登记 / CHANGELOG。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUB, DEPT = "cifa-jiufa", "departments/03-zhenjiu/07-cifa-jiufa-xue"
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
json.dump({"note": "刺法灸法学 10 章 ← 教材 12 章（9+10、11+12 各合并；无单元复用）。", "chapters": rows},
          io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

readme = f"""# 刺法灸法学

**07-cifa-jiufa-xue** · 针灸推拿学院 · {len(rows)} 章 · {C['units']} 单元 · {tot:,} 汉字

> 章链：概论源流 → 毫针刺法 → 内经难经 → 金针赋与针灸大成 → 灸法 → 特种针法 → 微针系统 → 电针与穴位注射 → 埋线与激光 → 安全与数字化

## 一、底本

| 项 | 值 |
|---|---|
| 教材 | `F:/textbooks/qhzy-针法灸法学.xlsx`（12 内容章） |
| 主编 | 王富春（长春中医药大学）；审稿 吕景山（第二届国医大师） |
| sha256 | `{U['source']['sha256'][:16]}…` |
| 规模 | 12 章 / 114 单元 / {C['hanzi']:,} 汉字（教材口径） |

## 二、章表（10 课程章 ← 12 教材章）

| # | 章 | 教材章 | 单元 | 汉字 |
|--:|---|---|--:|--:|
{chr(10).join(tbl)}

**合并理由**：第 9 章（埋线、磁疗）与第 10 章（激光照射与进展）同属「刺激方式的替换」；
第 11 章（安全与临床运用）与第 12 章（数字化 AI）同属「边界与收口」。**无单元复用**，章节目标 10 未改。

## 三、三辨与四位面（实测）

| 三辨 | 词频 | 四位面（技术谱系） | 词频 |
|---|--:|---|--:|
| **操作手法** | **{P['view']['操作手法']}** | 现代技术 | {P['A_part']['现代技术']} |
| **应用与安全** | **{P['view']['应用与安全']}** | 刺法技术 | {P['A_part']['刺法技术']} |
| **器械与技术** | **{P['view']['器械与技术']}** | 灸法技术 | {P['A_part']['灸法技术']} |
| | | 古代针法 | {P['A_part']['古代针法']} |

三辨极差 **{R['view']}×**；四位面极差 **{R['A_part']}×** —— 四类 391–620，**全库最平的四位面之一**。

**未取「操作环节」**（手法操作 {P['B_hand']['手法操作']} / 应用与宜忌 {P['B_hand']['应用与宜忌']} /
灸法与器材 {P['B_hand']['灸法与器材']}，**{R['B_hand']}×**）。原因：教材对「手法」的用词重复度极高
（进针、行针、捻转、提插几乎每章都出现），把它单列成面会得到一条虚假的平坦轴。

## 四、这门课的判据是「可复核」，不是「知道」

每种技术都必须写清：**器具（针具/艾炷规格）＋部位（穴位）＋手法（角度、深度、频率）＋时长＋反应**。
五项缺一项，操作就不可复现；教材里没写死的（如灸量），本课一律标「教材未给数，按临床常规区间」，不自行编数。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "07-cifa-jiufa"
node tests/test_chapter_code.js | grep -c "07-cifa-jiufa"
python scripts/build_cifa_jiufa_text.py
```

**免责声明：** 本课为教学材料，具体操作须在执业人员指导与规范环境下进行；针刺与艾灸均有创伤与烫伤风险，
本课不构成任何自我操作的依据。
"""
io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

gap = """# 刺法灸法学 缺口登记

## 一、没有操作影像与图谱

教材给文字描述与操作要点，**无视频、无针刺深度剖面图**。补法：以公开发布的国家标准
（如 GB/T 21709 系列针灸技术操作规范）为源，按《补源约定》逐条登记后再入正文。

## 二、各技术证据强弱不均

| 技术 | 教材篇幅（章） | 证据状态 |
|---|---|---|
| 毫针刺法 | 34,867 字 | 最厚，手法与量效关系最清楚 |
| 灸法 | 21,387 字 | 厚，但灸量多以「壮」计，无统一换算 |
| 特种针法 | 16,184 字 | 中，适应证依赖各技术自身传统 |
| 电针/穴位注射 | 16,972 字 | 中，参数（频率/波型/剂量）差异大 |
| 埋线/磁疗/激光 | 11,361 + 11,539 字 | **偏弱**，章内已标「证据层次需自行判定」 |

## 三、不做的事

1. **不给具体留针时长与灸量的统一数值**——教材按技术与部位分别给区间，本课不合并成一个数。
2. **不写「疗效保证」**——适应证表述一律随教材口径，加「个体差异」限定。
3. **不把数字化章节写成产品介绍**——第 10 章只讲可验证的部分（记录、教学、质控）。
"""
io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 07-刺法灸法学" not in s:
    add = f"""### 建 07-刺法灸法学（针灸系第 12 门）

底本 `qhzy-针法灸法学.xlsx`（王富春主编，12 内容章）。`scripts/build_cifa_jiufa_text.py` 产出
`standards/cifa-jiufa/{{底本,units,类群库,axis-probe}}.json`。

- **12 教材章 → 10 课程章**（9+10、11+12 合并），114 单元无复用；{tot:,} 汉字；目标 10 不变
- 三辨 操作手法 {P['view']['操作手法']} / 应用与安全 {P['view']['应用与安全']} / 器械与技术 {P['view']['器械与技术']}（**{R['view']}×**）
- 四位面 技术谱系（**{R['A_part']}×**，四类 391–620）；操作环节 {R['B_hand']}× 未取（「手法」是词根，会造出虚假平坦轴）

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("changelog appended")
print("done:", len(rows), "章", tot, "汉字")
