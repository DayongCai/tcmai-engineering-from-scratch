# -*- coding: utf-8 -*-
"""骨伤系 05 运动医学与损伤防护（派生课，8 章）。"""
import io
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
PY = sys.executable
HANZI = re.compile(r"[\u4e00-\u9fff]")

SUB = "gushang-yundong-yixue"
DEPT = "departments/04-gushang/05-yundong-yixue"
TITLE = "运动医学与损伤防护"

VIEWS = {
    "损伤识别": ["劳损", "扭伤", "拉伤", "过用", "撕裂", "断裂", "急性损伤", "筋伤", "损伤"],
    "处理与康复": ["处理", "固定", "康复", "功能锻炼", "分期", "理筋", "手法", "训练"],
    "评定与重返": ["评估", "评定", "量角", "肌力", "重返", "随访", "复发", "平衡", "步态"],
}

PLANES = {"概论与机制": [1, 2], "评估与处理": [3, 4], "部位损伤": [5, 6], "防护与重返": [7, 8]}

PLAN = [
 (1, "01-gailun", "运动医学概论", "运动医学管的是「能不能练、练多少、何时回归」",
  [("zhongyi-yundong", ["运动", "体能", "训练"]), ("kangfu-huli", ["运动", "康复"])], 6),
 (2, "02-sunshang-jizhi", "运动损伤的机制与分类", "急性与过用性损伤的机制完全不同",
  [("gushang-jinshang", ["损伤", "劳损", "扭伤", "筋伤"]), ("zhenggu", ["损伤", "筋伤"])], 6),
 (3, "03-pinggu-yingxiang", "损伤评估与影像", "先排骨折与神经血管，再谈软组织",
  [("gushang-kangfu-pingding", ["评估", "评定", "量角", "肌力"]), ("gushang-yingxiang", ["影像", "X线", "MRI"])], 6),
 (4, "04-jixing-chuli", "急性损伤处理与康复分期", "急性期目标不是「练回来」，是控制出血与肿胀",
  [("gushang-jinshang", ["急性", "处理", "固定", "分期"]), ("kangfu-huli", ["急性", "康复", "分期"])], 6),
 (5, "05-sizhi-sunshang", "上肢与下肢常见损伤", "踝、膝、肩、肘：四条高发线",
  [("zhenggu", ["踝", "膝", "肩", "肘"]), ("gushang-jinshang", ["踝", "膝", "肩"])], 6),
 (6, "06-qugan-guoyong", "躯干损伤与过用性损伤", "过用性损伤的本质是负荷与恢复不匹配",
  [("gushang-jinshang", ["腰", "劳损", "过用", "反复"]), ("gushang-jizhu-bing", ["腰", "劳损"])], 6),
 (7, "07-fanghu-xunlian", "运动防护与体能训练", "热身、负荷递增、恢复三件事决定伤不伤",
  [("zhongyi-yundong", ["热身", "负荷", "训练", "防护"]), ("kangfu-huli", ["训练", "力量", "平衡"])], 6),
 (8, "08-chongfan-yundong", "重返运动与复发预防", "重返标准要写数值，不写「感觉好了」",
  [("gushang-kangfu-pingding", ["重返", "随访", "功能", "评定"]), ("kangfu-huli", ["重返", "随访", "复发"])], 6),
]


def load(sub):
    p = os.path.join(S, sub, "units.json")
    return json.load(io.open(p, encoding="utf-8")) if os.path.exists(p) else None


def hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text, lv):
    return {k: sum(text.count(w) for w in ws) for k, ws in lv.items()}


def main():
    import shutil
    shutil.rmtree(os.path.join(ROOT, DEPT, "chapters"), ignore_errors=True)

    used, units = [], []
    probe = {"view": {k: 0 for k in VIEWS}, "A_part": {k: 0 for k in PLANES}}
    missing = []
    used = set()
    for n, slug, title, why, srcs, K in PLAN:
        assert slug == slug.lower(), slug
        cand = []
        for parent, kws in srcs:
            d = load(parent)
            if not d:
                missing.append(parent)
                continue
            for u in d["units"]:
                key = f"{parent}:{u['locator']}"
                if key in used:
                    continue
                prose0 = u.get("prose") or u.get("rawBody") or ""
                score = sum(((u.get("title") or "") + prose0[:1500]).count(k) for k in kws)
                if score:
                    cand.append((score, parent, u, key))
        cand.sort(key=lambda x: -x[0])
        picked, budget = [], 0
        for sc, parent, u, key in cand:
            hz0 = hanzi(u.get("prose") or u.get("rawBody") or "")
            if picked and (len(picked) >= K or (len(picked) >= 3 and budget + hz0 > 12000)):
                continue
            picked.append((sc, parent, u, key))
            budget += hz0
            if len(picked) >= K:
                break
        for i, (sc, parent, u, key) in enumerate(picked, 1):
            used.add(key)
            prose = u.get("prose") or u.get("rawBody") or ""
            units.append({
                "chapter": str(n), "chapterTitle": f"第{n}章 {title}", "sec": "", "secNo": "",
                "sub": f"{n}.{i}", "title": f"{n}.{i} {u.get('title','')}",
                "locator": f"派生·第{n}章·{n}.{i}",
                "brief": u.get("brief", ""), "goals": [], "rawBody": prose, "body": prose, "prose": prose,
                "segments": u.get("segments", []), "hanzi": hanzi(prose),
                "measure": {"digits": len(re.findall(r"\d", prose)), "valueLike": 0,
                            "views": measure(prose, VIEWS), "levels": {k: 0 for k in PLANES}},
                "srcSub": parent, "source": f"{parent}:{u['locator']}"})
            for k, v in units[-1]["measure"]["views"].items():
                probe["view"][k] += v

    for u in units:
        for p, chs in PLANES.items():
            if int(u["chapter"]) in chs:
                u["measure"]["levels"][p] = u["hanzi"]
                probe["A_part"][p] += u["hanzi"]

    ratio = {}
    for g, b in probe.items():
        vals = [v for v in b.values() if v]
        ratio[g] = round(max(b.values()) / min(vals), 1) if len(vals) > 1 and min(vals) else None
    counts = {"chapters": len(PLAN), "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
              "digits": sum(u["measure"]["digits"] for u in units), "valueLike": 0}
    out = os.path.join(S, SUB)
    os.makedirs(out, exist_ok=True)
    json.dump({"source": {"kind": "派生", "from": sorted({u["srcSub"] for u in units}),
                          "note": "单元正文取自父课，未改字；locator 一律「派生·」；两课汉字不可相加。"},
               "counts": counts, "views": VIEWS, "levels": PLANES,
               "probe": probe, "ratio": ratio, "units": units},
              io.open(os.path.join(out, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": "运动医学与损伤防护 派生课：一章一主题；四位面＝章群结构分区。",
               "chapters": {slug: {"n": n, "title": t, "units": [u["sub"] for u in units if u["chapter"] == str(n)],
                                   "srcChapters": [f"派生#{n}"], "why": why,
                                   "derivedFrom": "、".join(p for p, _ in srcs)}
                            for n, slug, t, why, srcs, K in PLAN}},
              io.open(os.path.join(out, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": "三辨按词表现算；四位面＝章群结构分区（不用词频）。",
               "views": VIEWS, "levelsA": PLANES, "probe": probe, "ratio": ratio},
              io.open(os.path.join(out, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    fb = {slug: [f"《{TITLE}·{t}》", "派生课：篇名为本课程章名，出处见 units.json 的 source 字段"]
          for n, slug, t, why, srcs, K in PLAN}
    json.dump({"courseTitle": TITLE, "deptPath": DEPT,
               "xlsx": "派生课（无教材）：单元取自筋伤学、运动学、康复评定、正骨学、影像学、康复护理",
               "chain": " → ".join(t for n, s, t, w, src, K in PLAN),
               "levelLabel": "章群结构",
               "objectPressure": "运动医学的判据是「何时能回到运动」：不是不疼，而是功能达标",
               "reportRule": "记录写：受伤机制、部位与组织、影像、分期、负荷方案、重返标准",
               "gapNote": "无独立教材；重返运动的量化标准（如跳跃测试阈值）教材未给，本课不代填",
               "chapterQ": {slug: [f"{t}之后，凭什么说他可以回到运动", why] for n, slug, t, why, srcs, K in PLAN},
               "fallback": fb, "defaultCite": [f"《{TITLE}》", "派生课篇名"]},
              io.open(os.path.join(out, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    per_ch = {}
    for u in units:
        per_ch[int(u["chapter"])] = per_ch.get(int(u["chapter"]), 0) + u["hanzi"]
    print("plan:", counts["chapters"], "章 /", counts["units"], "单元 /", counts["hanzi"], "汉字 /", ratio)
    print("每章:", sorted(per_ch.items()))
    if missing:
        print("缺父课:", sorted(set(missing)))

    for cmd in ([PY, "scripts/scaffold_huli_chapter.py", SUB, DEPT, "--all"],
                [PY, "scripts/build_huli_docs.py", SUB, DEPT]):
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
        print("  ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])


if __name__ == "__main__":
    main()
