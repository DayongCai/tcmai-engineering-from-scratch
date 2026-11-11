# -*- coding: utf-8 -*-
"""17-jichu-biye-sheji（基础医学毕业设计与知识移交·sem910，6 章）：派生 + 收尾。

章节名与顺序取自 chapters.json（由 scaffold_sem910.js 生成，不手改）。
"""
import io
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
PY = sys.executable
SUB = "jichu-biye-sheji"
DEPT_REL = "departments/09-jichu/17-jichu-biye-sheji"
D = os.path.join(ROOT, DEPT_REL)
TITLE = "基础医学毕业设计与知识移交"

PARENTS = {
 "liuxingbing-xue": ("流行病学", json.load(io.open(os.path.join(S, "liuxingbing-xue", "units.json"), encoding="utf-8"))),
 "shenghua-xue": ("生物化学", json.load(io.open(os.path.join(S, "shenghua-xue", "units.json"), encoding="utf-8"))),
}

CH = json.load(io.open(os.path.join(D, "chapters.json"), encoding="utf-8"))["chapters"]
SLUG = {int(c["n"]): c["slug"] for c in CH}
TITLES = {int(c["n"]): c["title"] for c in CH}

SRC = {
 1: [("liuxingbing-xue", 16, (1, 12))],
 2: [("liuxingbing-xue", 10, (1, 6)), ("liuxingbing-xue", 12, (1, 6))],
 3: [("shenghua-xue", 21, (1, 6)), ("liuxingbing-xue", 13, (1, 6))],
 4: [("liuxingbing-xue", 11, (1, 12))],
 5: [("liuxingbing-xue", 16, (1, 6)), ("liuxingbing-xue", 2, (1, 6))],
 6: [("liuxingbing-xue", 13, (7, 12)), ("shenghua-xue", 21, (7, 12))],
}
PLANES = {"选题与方案": [1, 2], "实施与记录": [3], "数据与论文": [4, 5], "移交": [6]}
VIEWS = {"问题与设计": ["问题", "假设", "设计", "对照", "样本", "偏倚"],
         "记录与数据": ["记录", "数据", "分析", "结果", "表格", "可重复"],
         "写作与移交": ["论文", "写作", "答辩", "报告", "移交", "协议"]}


def pick(sub, ch, rng):
    us = [u for u in PARENTS[sub][1]["units"] if int(u["chapter"]) == ch]
    return us if rng is None else us[rng[0] - 1:rng[1]]


units, CM = [], {}
for n in sorted(SLUG):
    us = []
    for sub, ch, rng in SRC[n]:
        us += pick(sub, ch, rng)
    assert us, f"第 {n} 章无单元"
    subs, srcs = [], []
    for k, u in enumerate(us, 1):
        nu = json.loads(json.dumps(u))
        pname = next(PARENTS[s][0] for s, c, _ in SRC[n] if int(u["chapter"]) == c)
        nu.update({"chapter": str(n), "chapterTitle": f"第{n}章 {TITLES[n]}", "sub": f"{n}.{k}",
                   "secNo": f"{n}.{1 + (k - 1) // 3}", "locator": f"派生·第{n}章·{n}.{k}",
                   "source": f"{pname}:{u['locator']}"})
        m = dict(nu.get("measure") or {})
        m["view"] = {k2: sum(nu.get("body", "").count(w) for w in ws) for k2, ws in VIEWS.items()}
        m["views"] = dict(m["view"])
        nu["measure"] = m
        subs.append(nu)
        tag = f"{pname}第{u['chapter']}章"
        if tag not in srcs:
            srcs.append(tag)
    units += subs
    CM[SLUG[n]] = {"n": n, "title": TITLES[n], "units": [u["sub"] for u in subs], "srcChapters": srcs,
                   "why": f"{TITLES[n]}：毕设第 {n} 阶段，材料取自{'、'.join(srcs)}",
                   "derivedFrom": "、".join(PARENTS[s][0] for s, c, _ in SRC[n])}

for u in units:
    u["measure"]["levels"] = {p: (u["hanzi"] if int(u["chapter"]) in chs else 0) for p, chs in PLANES.items()}
tv = {k: sum(u["measure"]["view"][k] for u in units) for k in VIEWS}
tp = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in chs) for k, chs in PLANES.items()}
U = {"source": {"file": "派生：无独立教材（母本 流行病学 / 生物化学）", "sha256": PARENTS["liuxingbing-xue"][1]["source"]["sha256"],
                "script": "scripts/_derive_jichu_biye.py"},
     "counts": {"chapters": len(CM), "units": len(units), "hanzi": sum(u["hanzi"] for u in units), "valueLike": 0},
     "views": VIEWS, "levels": {k: [k] for k in PLANES}, "probe": {"view": tv, "A_part": tp},
     "ratio": {"view": round(max(tv.values()) / max(1, min(tv.values())), 1),
               "A_part": round(max(tp.values()) / max(1, min(tp.values())), 1)},
     "chapters": [{"no": v["n"], "title": v["title"], "units": len(v["units"])} for v in CM.values()],
     "units": units}

os.makedirs(os.path.join(S, SUB), exist_ok=True)
json.dump(U, io.open(os.path.join(S, SUB, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "sem910 派生课：6 阶段 ←《流行病学》《生物化学》，正文逐字不改。", "chapters": CM},
          io.open(os.path.join(S, SUB, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "派生课：三辨按词表现算；四位面按阶段分区。", "views": VIEWS, "levelsA": PLANES,
           "probe": U["probe"], "ratio": U["ratio"]},
          io.open(os.path.join(S, SUB, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

fb = {s: [f"〔派生〕{v['title']}", f"材料：{'、'.join(v['srcChapters'])}"] for s, v in CM.items()}
cq = {s: [f"{v['title']}：这一阶段要交什么、怎么算过关", v["why"]] for s, v in CM.items()}
json.dump({"courseTitle": TITLE, "deptPath": DEPT_REL, "xlsx": "派生：无独立教材（毕设课）",
           "chain": "选题 → 方案与伦理 → 实施与记录 → 数据分析 → 论文答辩 → 知识移交",
           "levelLabel": "毕设阶段", "objectPressure": "毕设的判据是「问题—证据—可复算」三件套：问得出、证得了、别人算得出",
           "reportRule": "记录写：日期、做了什么、原始数据在哪、异常与处置、结论与依据",
           "gapNote": "派生课，无独立教材；不写真实课题数据、不写知情同意样式条款、不写统计阈值",
           "chapterQ": cq, "fallback": fb, "defaultCite": ["〔派生〕母本章名", "母本章名级"]},
          io.open(os.path.join(S, SUB, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print(f"plan: {len(CM)} 章 / {len(units)} 单元 / {U['counts']['hanzi']:,} 汉字 · 三辨 {U['ratio']['view']}× · 四位面 {U['ratio']['A_part']}×")
chdir = os.path.join(D, "chapters")
if os.path.isdir(chdir):
    left = [x for x in os.listdir(chdir) if os.path.exists(os.path.join(chdir, x, "docs", "zh.md"))]
    assert not left, f"已有正文 {len(left)} 章，拒绝重建"
for cmd in ([PY, "scripts/scaffold_huli_chapter.py", SUB, DEPT_REL, "--all"],
            [PY, "scripts/build_huli_docs.py", SUB, DEPT_REL]):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print("  ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])

# ── 毕设实例对接（数字全部从实例 JSON 现算）──
INST = json.load(io.open(os.path.join(S, "biye", "instances", "09-jichu.json"), encoding="utf-8"))
base, item2, item3, item4, cases = INST["base"], INST["item2"], INST["item3"], INST["item4"], INST["cases"]
money = lambda x: f"{x:,.0f}"
doc = f"""# 基础医学院毕设实例对接

> 本文件由 `scripts/_derive_jichu_biye.py` 从 `standards/biye/instances/09-jichu.json` **现算生成**，手改无效。
> 重算命令：`{INST['复算']}`。

## 一、本系毕设产物

**{INST['product']}**

三份可交付案例：{'、'.join(cases)}

## 二、七项检查表状态

| 项 | 状态 | 证据 |
|---|---|---|
| 1 产物可复算 | 齐备 | `{INST['复算'].split('&&')[0].strip()}` |
| 2 客群与渗透 | 齐备 | 客群 {item2['客群']} · SAM {money(item2['SAM'])}（{item2['SAM来源']}）· 客户数 {item2['客户数']} · 隐含渗透率 {item2['隐含渗透率%']}% → {item2['判定']} |
| 3 客单与营收锚 | 齐备 | 客单 {money(item3['客单'])} 元 · 占客群营收 {item3['客单占营收%']}% → {item3['判定']} |
| 4 成本与收入敏感性 | 齐备 | 成本侧 {len(item4['成本侧'])} 档 · 收入侧 {len(item4['收入侧'])} 档 |
| 5 假设与口径 | 齐备 | 成熟度系数 {INST['assumptions']['成熟度系数']} · 产品化人月 {INST['assumptions']['产品化人月']} |
| 6 工时台账 | 见台账 | `standards/biye/工时台账.json`（0/占位值不计） |
| 7 欠账登记 | 见清单 | `standards/biye/欠账清单.json` |

## 三、基准值

| 项 | 值 |
|---|---:|
| 三年客户数 | {base['客户数']} |
| 首年客户 | {base.get('首年客户', '—')} |
| 建设成本 | {money(base['建设'])} 元 |
| 三年收入 | {money(base['三年收入'])} 元 |
| 三年成本 | {money(base['三年成本'])} 元 |
| 三年毛利 | {money(base['三年毛利'])} 元 |
| 回本中位 | {base['回本中位']} 月 |
| 是否亏损 | {'是' if base['亏损'] else '否'} |

## 四、口径提醒

- SAM、客户数、客单均为**教学假设**，不构成商业承诺；
- 本课的「数据分析与结果呈现」一章讲的是**统计与呈现**，与本节「投入产出」是两条线，不可混算；
- 毕设不允许出现真实课题数据、真实患者信息与真实机构名。

## 五、章节对位

| 课章 | 对应实例字段 |
|---|---|
| 01 选题 | `product`＋`cases`（题目必须落到可交付产物） |
| 02 实验方案与伦理审批 | `assumptions`＋合规口径 |
| 03 实验实施与原始记录 | `复算` 命令与原始数据位置 |
| 04 数据分析与结果呈现 | `item4` 敏感性（成本的档位思维类比统计的稳健性） |
| 05 论文写作与答辩 | `通用检查表.md` 七项 |
| 06 知识移交 | `复算`＋工时台账＋欠账清单 |
"""
io.open(os.path.join(D, "毕设对接.md"), "w", encoding="utf-8").write(doc)
print("毕设对接.md 已生成")

doc_total = figs = 0
for slug in CM:
    doc_total += len(re.sub(r"\s", "", io.open(os.path.join(D, "chapters", slug, "docs", "zh.md"), encoding="utf-8").read()))
table = "\n".join(f"| {v['n']} | {v['title']} | `{s}` | {len(v['units'])} |" for s, v in sorted(CM.items(), key=lambda kv: kv[1]["n"]))
readme = f"""# {TITLE}

**17-jichu-biye-sheji** · 基础医学院 · 第 10 学期 · {len(CM)} 阶段 · {U['counts']['units']} 单元 · {U['counts']['hanzi']:,} 汉字〔派生〕

> 判据是「问题—证据—可复算」：问得出、证得了、别人算得出。

## 一、性质

| 项 | 值 |
|---|---|
| 课程类型 | **sem910 毕设课**（第 10 学期） |
| 教材 | 无独立教材；材料逐字取自《流行病学》《生物化学》 |
| 章节结构 | 由 `scaffold_sem910.js` 从 `data/new-subjects-chapters.json` 生成，**不手改** |
| 课程正文 | {doc_total:,} 非空白字 |
| 毕设实例 | `standards/biye/instances/09-jichu.json` → 见 `毕设对接.md` |

## 二、六阶段

| # | 阶段 | slug | 单元 |
|--:|---|---|--:|
{table}

## 三、本课与实例的关系

本系毕设实例的产物是「{INST['product']}」，三份案例：{'、'.join(cases)}。
`毕设对接.md` 由脚本从实例现算生成，给出七项检查表状态、基准值与章节对位；答辩时必须能对上那七项。

## 四、不写什么

1. 不写真实课题的数据、图表与结论；
2. 不写知情同意书条款样式——以机构伦理委员会模板为准；
3. 不写统计阈值与样本量取值；
4. 不替学生决定选题，只给判据。

## 五、章内可执行验证

```bash
node code/main.js
node --test code/main.test.js
node scripts/scaffold_sem910.js --check
```

**免责声明：** 本课为教学材料，不构成伦理审查意见；一切人体与动物研究须先经所在机构伦理审查与备案。
"""
io.open(os.path.join(D, "README.md"), "w", encoding="utf-8").write(readme)

gap = f"""# {TITLE} 缺口登记

## 一、无独立教材

sem910 毕设课，六阶段材料逐字取自《流行病学》《生物化学》。汉字不与母本相加。

## 二、不写的内容

| 类型 | 处理 |
|---|---|
| 真实课题数据与结论 | 不写 |
| 知情同意书条款 | 不写（以机构模板为准） |
| 统计阈值与样本量 | 不写 |
| 伦理审批流程细节 | 只写顺序（申报—审查—批件—备案），不写时限与文书格式 |

## 三、与 `standards/biye` 的关系

七项检查表、预算模型、工时台账与欠账清单都在 `standards/biye/`，本课**不复制这些数据**，只做对位（`毕设对接.md` 现算生成）。
工时台账 81 行仍未填人月，`check_biye_timelog.py` 会拒绝 0/占位值——这是毕设收口的已知欠账。

## 四、不做的事

1. 不替学生定题；
2. 不承诺结论可发表；
3. 不替代伦理审查与学术不端审查。
"""
io.open(os.path.join(D, "缺口登记.md"), "w", encoding="utf-8").write(gap)

cl = os.path.join(ROOT, "CHANGELOG.md")
s = io.open(cl, encoding="utf-8").read()
if "建 17-jichu-biye-sheji" not in s:
    add = f"""### 建 17-jichu-biye-sheji（基础医学毕业设计与知识移交·sem910 派生课）

六阶段 ←《流行病学》《生物化学》→ **6 阶段 / {U['counts']['units']} 单元 / {U['counts']['hanzi']:,} 汉字**，正文逐字不改。

- `chapters.json` 由 `scaffold_sem910.js` 生成；状态按磁盘现算
- 三辨 {U['ratio']['view']}×、四位面 {U['ratio']['A_part']}×（阶段分区）
- **毕设对接.md** 由脚本从 `standards/biye/instances/09-jichu.json` 现算：七项检查表、基准值、章节对位
- 不写真实课题数据、知情同意条款、统计阈值

"""
    s = s.replace("\n## ", "\n" + add + "\n## ", 1)
    io.open(cl, "w", encoding="utf-8").write(s)
    print("CHANGELOG 已补")
print(f"6 阶段 · 正文 {doc_total:,} · 三辨 {U['ratio']['view']}× · 四位面 {U['ratio']['A_part']}×")
