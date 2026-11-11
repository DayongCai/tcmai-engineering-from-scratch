# -*- coding: utf-8 -*-
"""医学细胞生物学（09-jichu/03-yixue-xibao-shengwu-xue）：派生课。

母本三门（正文逐字不改）：
  《组织学与胚胎学》 ch1/2/3/4/5/18/19
  《生理学》        ch2（细胞的基本功能）
  《生物化学》      ch5/17/19/20/21
12 课程章，locator 一律「派生·第N章·m.k」，source 记「<母本>:<母本 locator>」。
"""
import io
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
PY = sys.executable
SUB = "yixue-xibao-shengwu-xue"
DEPT = "departments/09-jichu/03-yixue-xibao-shengwu-xue"
TITLE = "医学细胞生物学"

PARENTS = {
 "zuzhi-peitai-xue": ("组织学与胚胎学", json.load(io.open(os.path.join(S, "zuzhi-peitai-xue", "units.json"), encoding="utf-8"))),
 "shengli": ("生理学", json.load(io.open(os.path.join(S, "shengli", "units.json"), encoding="utf-8"))),
 "shenghua-xue": ("生物化学", json.load(io.open(os.path.join(S, "shenghua-xue", "units.json"), encoding="utf-8"))),
}

CHAPTERS = [
 (1, "xibao-shengwuxue-gailun", "细胞生物学概论", [("zuzhi-peitai-xue", 1, None)]),
 (2, "xibaomo-yu-kuamo-yunshu", "细胞膜与跨膜运输", [("shengli", 2, None)]),
 (3, "xibao-lianjie-yu-nianfu", "细胞连接与细胞黏附", [("zuzhi-peitai-xue", 2, None)]),
 (4, "xibao-waijizhi", "细胞外基质与细胞微环境", [("zuzhi-peitai-xue", 3, None)]),
 (5, "xibao-gujia-yu-yundong", "细胞骨架与细胞运动", [("zuzhi-peitai-xue", 4, None)]),
 (6, "shenjingyuan-xinxi-chuandi", "神经元与细胞间信息传递", [("zuzhi-peitai-xue", 5, None)]),
 (7, "xibaohe-yu-ransezhi", "细胞核与染色质", [("shenghua-xue", 5, None)]),
 (8, "jiyin-biaoda-tiaokong", "基因表达调控", [("shenghua-xue", 20, None)]),
 (9, "xibao-zhouqi-yu-dna-fuzhi", "细胞周期与 DNA 复制", [("shenghua-xue", 17, None)]),
 (10, "danbaizhi-hecheng-yu-xibao-gongneng", "蛋白质合成与细胞功能", [("shenghua-xue", 19, None)]),
 (11, "xibao-fenhua-yu-qiguan-fasheng", "细胞分化与器官发生",
      [("zuzhi-peitai-xue", 18, (1, 6)), ("zuzhi-peitai-xue", 19, (7, 12))]),
 (12, "xibao-yu-fenzi-jishu", "细胞与分子常用技术", [("shenghua-xue", 21, None)]),
]

PLANES = {"膜与胞外环境": [2, 3, 4], "骨架与信息传递": [5, 6],
          "核与基因表达与技术": [7, 8, 9, 10, 12], "概论与分化发生": [1, 11]}

VIEWS = {"结构与成分": ["结构", "成分", "组成", "膜", "骨架", "纤维"],
         "功能与过程": ["功能", "运输", "合成", "复制", "分化", "调控"],
         "观察与技术": ["观察", "技术", "染色", "方法", "检测", "标本"]}


def pick(sub, ch, rng):
    us = [u for u in PARENTS[sub][1]["units"] if int(u["chapter"]) == ch]
    if rng is None:
        return us
    a, b = rng
    return us[a - 1:b]


units, CM = [], {}
for n, slug, title, src in CHAPTERS:
    us, src_loc = [], []
    for sub, ch, rng in src:
        part = pick(sub, ch, rng)
        assert part, f"第 {n} 章取不到母本 {sub} ch{ch}"
        us += part
        src_loc.append((sub, ch))
    subs = []
    for k, u in enumerate(us, 1):
        nu = json.loads(json.dumps(u))
        parent_title = PARENTS[[s for s, c, _ in src if int(u["chapter"]) == c][0]][0] if False else None
        nu["chapter"] = str(n)
        nu["chapterTitle"] = f"第{n}章 {title}"
        nu["sub"] = f"{n}.{k}"
        nu["secNo"] = f"{n}.{1 + (k - 1) // 3}"
        nu["locator"] = f"派生·第{n}章·{n}.{k}"
        # 找到母本名
        pname = None
        for s2, c2, _ in src:
            if int(u["chapter"]) == c2:
                pname = PARENTS[s2][0]
        nu["source"] = f"{pname}:{u['locator']}"
        m = dict(nu.get("measure") or {})
        m["view"] = {k2: sum(nu.get("body", "").count(w) for w in ws) for k2, ws in VIEWS.items()}
        m["views"] = dict(m["view"])
        nu["measure"] = m
        subs.append(nu)
    units += subs
    CM[f"{n:02d}-{slug}"] = {"n": n, "title": title, "units": [u["sub"] for u in subs],
                             "srcChapters": [f"{PARENTS[s][0]}第{c}章" for s, c, _ in src],
                             "why": f"{title}：本课第 {n} 章，正文逐字取自{'、'.join(PARENTS[s][0] for s, c, _ in src)}",
                             "derivedFrom": "、".join(PARENTS[s][0] for s, c, _ in src)}

tot_view = {k: sum(u["measure"]["view"][k] for u in units) for k in VIEWS}
tot_part = {k: sum(u["hanzi"] for u in units if int(u["chapter"]) in chs) for k, chs in PLANES.items()}
for u in units:
    u["measure"]["levels"] = {p: (u["hanzi"] if int(u["chapter"]) in chs else 0) for p, chs in PLANES.items()}

U = {"source": {"file": "派生：无独立教材（母本 组织学与胚胎学 / 生理学 / 生物化学）",
                "sha256": PARENTS["zuzhi-peitai-xue"][1]["source"]["sha256"], "script": "scripts/_derive_xbsw.py",
                "parents": {k: v[1]["source"]["file"] for k, v in PARENTS.items()}},
     "counts": {"chapters": len(CM), "units": len(units), "hanzi": sum(u["hanzi"] for u in units), "valueLike": 0},
     "views": VIEWS, "levels": {k: [k] for k in PLANES},
     "probe": {"view": tot_view, "A_part": tot_part},
     "ratio": {"view": round(max(tot_view.values()) / max(1, min(tot_view.values())), 1),
               "A_part": round(max(tot_part.values()) / max(1, min(tot_part.values())), 1)},
     "chapters": [{"no": v["n"], "title": v["title"], "units": len(v["units"])} for v in CM.values()],
     "units": units}

os.makedirs(os.path.join(S, SUB), exist_ok=True)
json.dump(U, io.open(os.path.join(S, SUB, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "派生课：12 课程章 ←《组织学与胚胎学》《生理学》《生物化学》相关章，正文逐字不改。", "chapters": CM},
          io.open(os.path.join(S, SUB, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"note": "派生课：三辨按词表现算；四位面按课程章群结构分区。", "views": VIEWS,
           "levelsA": PLANES, "probe": U["probe"], "ratio": U["ratio"]},
          io.open(os.path.join(S, SUB, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

fb = {s: [f"〔派生〕{v['title']}", f"母本：{'、'.join(v['srcChapters'])}"] for s, v in CM.items()}
cq = {s: [f"{v['title']}：这一章的判据是什么，什么算「看懂了」", v["why"]] for s, v in CM.items()}
json.dump({"courseTitle": TITLE, "deptPath": DEPT, "xlsx": "派生：无独立教材",
           "chain": "概论与观察 → 膜与胞外环境 → 骨架与信号 → 核与基因表达 → 分化与发生 → 技术",
           "levelLabel": "章群结构",
           "objectPressure": "细胞生物学的判据是「结构—功能—方法」三件套：看得见什么、靠什么实现、用什么看见",
           "reportRule": "记录写：标本与制样方式、所见结构层级、与教材表述的差异",
           "gapNote": "派生课，无独立教材；正文逐字取自《组织学与胚胎学》《生理学》《生物化学》，不含独立新增内容",
           "chapterQ": cq, "fallback": fb, "defaultCite": ["〔派生〕母本章名", "母本章名级"]},
          io.open(os.path.join(S, SUB, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

print(f"plan: {len(CM)} 章 / {len(units)} 单元 / {U['counts']['hanzi']:,} 汉字 · 三辨 {U['ratio']['view']}× · 四位面 {U['ratio']['A_part']}×")
chdir = os.path.join(ROOT, DEPT, "chapters")
if os.path.isdir(chdir):
    left = [d for d in os.listdir(chdir) if os.path.exists(os.path.join(chdir, d, "docs", "zh.md"))]
    assert not left, f"已有正文 {len(left)} 章，拒绝重建"
for cmd in ([PY, "scripts/scaffold_huli_chapter.py", SUB, DEPT, "--all"],
            [PY, "scripts/build_huli_docs.py", SUB, DEPT]):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    print("  ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])
