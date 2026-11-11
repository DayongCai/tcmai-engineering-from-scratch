# -*- coding: utf-8 -*-
"""02 骨伤解剖学收尾：补源登记（图源探测）+ 图版清单 + chapters/README/缺口/CHANGELOG。"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
SUB, DEPT, TITLE = "gushang-jiepou", "departments/04-gushang/02-yao-shang-jiepou", "骨伤解剖学"
dpath = os.path.join(ROOT, DEPT)

U = json.load(io.open(os.path.join(S, SUB, "units.json"), encoding="utf-8"))
CM = json.load(io.open(os.path.join(S, SUB, "chapter-map.json"), encoding="utf-8"))["chapters"]
C, P, R = U["counts"], U["probe"], U["ratio"]
used = sorted({u["srcSub"] for u in U["units"]})

PROBE = [
    ("upload.wikimedia.org", "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Gray188_grays_anatomy.png/200px-Gray188_grays_anatomy.png", "000", "连接失败（本机网络不可达）"),
    ("commons.wikimedia.org", "https://commons.wikimedia.org/wiki/Main_Page", "000", "连接失败"),
    ("archive.org", "https://archive.org/advancedsearch.php?q=grays+anatomy&output=json", "000", "连接失败"),
    ("openlibrary.org", "https://openlibrary.org/", "000", "连接失败"),
    ("en.wikisource.org", "https://en.wikisource.org/wiki/Anatomy_of_the_Human_Body", "000", "连接失败"),
    ("www.bartleby.com", "https://www.bartleby.com/107/", "403", "拒绝访问（反爬）"),
    ("www.gutenberg.org", "https://www.gutenberg.org/ebooks/search/?query=anatomy", "200", "可达，但检索无 Gray's Anatomy（1918）；仅有 Surgical Anatomy 等其他书"),
    ("api.github.com", "https://api.github.com/search/repositories?q=grays+anatomy", "200", "可达；检索到 12 个仓库，**均无 license 字段与版本说明**"),
    ("cdn.jsdelivr.net", "https://cdn.jsdelivr.net/gh/awatson1978/images-grays-anatomy@master/grays.anatomy.anchors/AtlasJoint.jpg", "200", "可达，镜像有图，但仓库**无授权声明、无版本出处**，不能据以主张公有领域"),
]

json.dump({
    "note": "图源探测记录：只为求一张可主张公有领域的骨伤解剖图版。结论＝本轮未取得合规件（补源约定第⑩条：缺口也登记）。",
    "probedAt": "2026-11-07",
    "protocol": "补源约定.md（仓库根）",
    "attempts": [{"host": h, "url": u, "http": c, "verdict": v} for h, u, c, v in PROBE],
    "conclusion": {
        "obtained": 0,
        "reason": "公有领域骨伤解剖图版的常用源（Wikimedia / archive.org / Wikisource / OpenLibrary）在本机均不可达；"
                  "可达的 GitHub 镜像无授权与版本说明，达不到《补源约定》对「来源资格＋五项指纹」的要求。",
        "policy": "未取得即不引入图片；正文以文字解剖描述为准，图版需求入清单，待图源可达或用户提供后再补。",
    },
    "nextSteps": [
        "若用户可提供 Gray's Anatomy 1918 图版原件（或可访问的镜像地址），按本文件格式登记 sha256 后入正文。",
        "或改用自绘线图：须标「示意图（据本库正文重绘），非教材原图」，不得据图给出教材未给数值。",
    ],
}, io.open(os.path.join(S, SUB, "补源登记.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("补源登记.json 写入（9 次探测，0 取得）")

rows, tbl, tot = [], [], 0
for slug, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]):
    keep = set(v["units"])
    us = [x for x in U["units"] if x["sub"] in keep]
    hz = sum(x["hanzi"] for x in us)
    tot += hz
    rows.append({"n": v["n"], "slug": slug, "title": v["title"], "status": "🚧",
                 "docs": "docs/zh.md", "code": "code/main.js"})
    tbl.append(f"| {v['n']} | {v['title']} | {v['derivedFrom']} | {len(us)} | {hz:,} |")
json.dump({"note": "骨伤解剖学 派生课：10 章，单元取自父课（locator 派生·），本课内无复用。", "chapters": rows},
          io.open(os.path.join(dpath, "chapters.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# ── 图版清单 ───────────────────────────────────────────────
plates = [
    ("1", "骨的构造（骨密质/骨松质/骨膜）", "长骨纵剖面线图", "未取得", "Gray's 1918 相应图版；或自绘"),
    ("2", "骨的发生与骨骺", "骨骺板分区示意", "未取得", "自绘（分层示意）"),
    ("3", "关节结构", "滑膜关节剖面", "未取得", "Gray's 1918；或自绘"),
    ("4", "肌与肌腱", "肌腹—肌腱—骨附着示意", "未取得", "自绘"),
    ("5", "神经血管走行", "上/下肢主要神经血管投影", "未取得", "Gray's 1918 图版（公有领域，待可达）"),
    ("6", "脊柱三柱", "脊柱三柱分区示意", "未取得", "自绘（按正文三柱描述）"),
    ("7", "上肢骨与关节", "肩、肘、腕正位线图", "未取得", "Gray's 1918；或自绘"),
    ("8", "下肢骨与关节", "髋、膝、踝正位线图", "未取得", "Gray's 1918；或自绘"),
    ("9", "体表标志", "体表骨性标志点位图", "未取得", "自绘（按教材文字标注）"),
    ("10", "影像解剖对照", "X 线/CT/MRI 同层面并列", "**不引入**", "临床影像属敏感信息，本库不引入"),
]
plate_md = ["# 骨伤解剖学 图版清单",
            "",
            "> 本课**目前没有一张图**。不是没找，是找不到能合规使用的。探测记录见 `standards/gushang-jiepou/补源登记.json`（9 个源、0 张取得）。",
            "",
            "## 一、需要的图（按章）",
            "",
            "| 章 | 内容 | 需要的图 | 当前状态 | 候选来源 |",
            "|---|---|---|---|---|"]
for a, b, c, d, e in plates:
    plate_md.append(f"| {a} | {b} | {c} | {d} | {e} |")
plate_md += [
    "",
    "## 二、为什么取不到（实测，不是推测）",
    "",
    "| 源 | 状态 | 结论 |",
    "|---|---|---|",
    "| upload.wikimedia.org / commons.wikimedia.org | 000 | 连接失败 |",
    "| archive.org / openlibrary.org / en.wikisource.org | 000 | 连接失败 |",
    "| www.bartleby.com/107（Gray's 在线版） | 403 | 反爬拒绝 |",
    "| www.gutenberg.org | 200 | **没有** Gray's Anatomy 1918 |",
    "| cdn.jsdelivr.net（GitHub 镜像） | 200 | 有图，但**无授权声明、无版本出处** |",
    "",
    "结论：**公有领域图版的常用源在本机全部不可达**；可达的镜像达不到《补源约定》对来源资格与指纹的要求。",
    "",
    "## 三、三条可选路径",
    "",
    "1. **等你给图**：若能提供 Gray's Anatomy 1918 图版原件或可访问地址，我按 `补源登记.json` 格式登记 sha256、尺寸、页号后入正文；",
    "2. **自绘线图**：按正文文字重绘（骨构造、三柱、关节剖面、体表标志），标注「示意图（据本库正文重绘），非教材原图」，**不据图给数值**；",
    "3. **维持无图**：正文继续以文字描述，每章在 docs 里写明「本课无图，定位靠体表标志与影像」。",
    "",
    "## 四、不可能做的",
    "",
    "- **不用临床影像**：患者影像属敏感个人信息，且公开数据集多为单部位、与中医骨伤场景不匹配；",
    "- **不把镜像图说成公有领域**：没有授权声明就不能主张，哪怕是 1918 年的书；",
    "- **不用 AI 生成「解剖图」**：解剖结构错一处即误导，比没有图更糟。",
]
io.open(os.path.join(dpath, "图版清单.md"), "w", encoding="utf-8").write("\n".join(plate_md) + "\n")
print("图版清单.md 写入（10 条需求，0 张取得）")

readme = f"""# 骨伤解剖学

**02-yao-shang-jiepou** · 骨伤学院 · {len(rows)} 章 · {C['units']} 单元 · {tot:,} 汉字

> 解剖学的判据是「摸得到、指得出、看得懂」：体表能定位，影像能对上。

**课程类型：派生课（无独立教材、无图版）**。单元正文逐字取自父课，`locator` 一律 `派生·第N章·m.k`。

## 一、父课

{chr(10).join(f'- `{p}`' for p in used)}

## 二、章表

| # | 章 | 父课来源 | 单元 | 汉字 |
|--:|---|---|--:|--:|
{chr(10).join(tbl)}

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
{chr(10).join(f"| **{k}** | **{v}** |" for k, v in P['view'].items())}

三辨极差 **{R['view']}×**——三条解剖视角在父课里几乎等重，这是本库最平的一套三辨之一。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
{chr(10).join(f"| {k} | {v:,} |" for k, v in P['A_part'].items())}

四位面极差 **{R['A_part']}×**。

## 四、图版：本轮一张也没拿到（如实记）

按你的指示先探测公有领域图源，实测 9 个源、**0 张取得**：

| 源 | 状态 |
|---|---|
| Wikimedia / archive.org / Wikisource / OpenLibrary | **不可达（000）** |
| Bartleby（Gray's 在线版） | 403 反爬 |
| Gutenberg | 可达，但**没有** Gray's Anatomy 1918 |
| jsDelivr（GitHub 镜像） | 可达有图，但**无授权声明、无版本出处** |

所以本课**只有文字，没有图**。两份文件把这件事写清：
- `standards/gushang-jiepou/补源登记.json`——9 次探测的 URL、状态、结论；
- `图版清单.md`——10 条图版需求、状态、候选来源，以及三条可选路径。

**没有拿 AI 生成解剖图，也没有把镜像图说成公有领域**——前者错一处即误导，后者是无授权主张。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "02-yao-shang-jiepou"
node tests/test_chapter_code.js | grep -c "02-yao-shang-jiepou"
python scripts/_derive_jiepou.py
```

**免责声明：** 本课为教学材料，无图版；解剖定位与影像判读以正规解剖学图谱与影像资料为准，
本课不构成诊疗依据。
"""
io.open(os.path.join(dpath, "README.md"), "w", encoding="utf-8").write(readme)

gap = f"""# 骨伤解剖学 缺口登记

## 一、无独立教材（派生课）

单元逐字取自：{('、'.join(f'`{p}`' for p in used))}。本课汉字不与父课相加；`locator` 用 `派生·`。

## 二、无图版——本课最硬缺口（已登记探测过程）

| 项 | 值 |
|---|---|
| 探测源 | 9 个（Wikimedia / archive.org / Wikisource / OpenLibrary / Bartleby / Gutenberg / jsDelivr / api.github.com / cdn.jsdelivr.net） |
| 取得图版 | **0** |
| 记录 | `standards/gushang-jiepou/补源登记.json` |
| 需求清单 | `图版清单.md`（10 条） |

**为什么不将就**：解剖课没有图，等于让人靠文字想象骨头怎么长。但拿一张授权不明的图，比没有图更糟——
一旦有人据此做定位，责任无法追溯。

## 三、体表定位目前靠什么

第 9 章「体表标志与定位」用父课的骨性标志文字（如「髂前上棘」「肱骨内上髁」），
**这些是可以摸到的，不需要图也能验证**——这是本课在无图状态下唯一站得住的判据。

## 四、不做的事

1. 不用临床影像（敏感个人信息）；
2. 不把无授权镜像说成公有领域；
3. 不用 AI 生成解剖图；
4. 不据自绘图给出教材未给的数值（角度、长度、层面）。
"""
io.open(os.path.join(dpath, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 02-yao-shang-jiepou" not in s:
    add = f"""### 建 02-yao-shang-jiepou（骨伤解剖学·派生课·无图版）

- 10 章 / {C['units']} 单元 / {tot:,} 汉字；单元取自 {len(used)} 门父课，locator `派生·`，无复用
- 三辨 骨与关节结构 {P['view'].get('骨与关节结构',0)} / 肌与神经血管 {P['view'].get('肌与神经血管',0)} / 体表与影像 {P['view'].get('体表与影像',0)}（**{R['view']}×**）
- 四位面＝章群结构分区（**{R['A_part']}×**）
- **图版 0 张**：公有领域图源 9 个全部探测，Wikimedia/archive.org/Wikisource/OpenLibrary 不可达、Bartleby 403、Gutenberg 无此书、GitHub 镜像无授权；探测记录入 `standards/gushang-jiepou/补源登记.json`，需求清单入 `图版清单.md`
- 按「缺口也登记」原则，未取得即不引入图片，正文以文字解剖描述为准

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("changelog appended")
print(f"done: {len(rows)} 章 {tot:,} 汉字")
