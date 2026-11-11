# -*- coding: utf-8 -*-
"""骨伤系 04 创伤急救学（派生课，8 章）。

父课：gushang-jichu（创伤急救章）、jijiu-huli（急救护理）、zhenggu（骨折脱位）、waike（外伤）、kangfu-huli。
注：jijiu-huli 的单元是**章级长文**（18 单元 / 31 万字），故每章最多取 2 个，避免一章过载。
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
HANZI = re.compile(r"[\u4e00-\u9fff]")

SUB = "gushang-chuangshang-jijiu"
DEPT = "departments/04-gushang/04-chuangshang-jijiu-xue"
TITLE = "创伤急救学"

VIEWS = {
    "评估与识别": ["评估", "判断", "识别", "体征", "意识", "分级", "分型", "指征"],
    "急救措施": ["止血", "包扎", "固定", "搬运", "通气", "复苏", "输液", "手术"],
    "风险与转运": ["休克", "并发症", "感染", "转运", "监护", "死亡", "禁忌"],
}

PLANES = {"总论与评估": [1], "现场与休克": [2, 3], "系统损伤": [4, 5, 7], "四肢与转运": [6, 8]}

PLAN = [
 (1, "01-jijiu-gailun", "创伤急救总论与评估", "先看气道与呼吸，再看出血与意识——顺序错了会死人",
  [("gushang-jichu", ["急救", "创伤", "评估", "现场"]), ("jijiu-huli", ["急救", "评估", "检伤"])], 6),
 (2, "02-xianchang-huli", "现场救护与搬运固定", "搬运姿势错，会让稳定骨折变不稳",
  [("gushang-jichu", ["搬运", "固定", "止血", "包扎"]), ("jijiu-huli", ["搬", "固定", "包扎"])], 6),
 (3, "03-chuxue-shuke", "出血与休克", "休克的第一信号是意识与脉搏，不是血压",
  [("jijiu-huli", ["休克", "出血", "补液", "循环"]), ("gushang-jichu", ["出血", "休克"])], 5),
 (4, "04-lunao-jizhu", "颅脑与脊柱损伤", "疑似脊柱损伤先固定，再动",
  [("gushang-jichu", ["颅脑", "脊柱", "脊髓", "损伤"]), ("jijiu-huli", ["颅脑", "意识"])], 6),
 (5, "05-xiongfu", "胸部与腹部创伤", "张力性气胸与腹腔内出血是两个夺命点",
  [("gushang-jichu", ["胸", "腹", "气胸", "内伤"]), ("waike", ["腹部", "损伤"])], 6),
 (6, "06-sizhi-guzhe-tuowei", "四肢骨折与脱位的急救", "急救处理定的是保肢，不是复位质量",
  [("zhenggu", ["骨折", "脱位", "固定", "急救"]), ("gushang-jichu", ["骨折", "脱位", "急救"])], 6),
 (7, "07-shaoshang-jishang", "烧伤、挤压伤与多发伤", "挤压伤的关键是肌红蛋白与肾",
  [("jijiu-huli", ["烧伤", "挤压", "多发伤", "创面"]), ("gushang-jichu", ["创", "损伤"])], 5),
 (8, "08-zainan-zhuanyun", "灾难救援与转运", "转运决策：能就地稳定就不急着走",
  [("jijiu-huli", ["转运", "灾难", "批量", "分诊"]), ("gushang-jichu", ["转运", "急救"])], 5),
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

    used, units = set(), []
    probe = {"view": {k: 0 for k in VIEWS}, "A_part": {k: 0 for k in PLANES}}
    missing = []
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
                hay = (u.get("title") or "") + prose0[:2000]
                score = sum(hay.count(k) for k in kws)
                if score:
                    cand.append((score, parent, u, key))
        cand.sort(key=lambda x: -x[0])
        picked, budget = [], 0
        for sc, parent, u, key in cand:
            hz0 = hanzi(u.get("prose") or u.get("rawBody") or "")
            if picked and (len(picked) >= K or (len(picked) >= 2 and budget + hz0 > 20000)):
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
    json.dump({"note": "创伤急救学 派生课：一章一主题；四位面＝章群结构分区。",
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
               "xlsx": "派生课（无教材）：单元取自骨伤科学、急救护理、正骨学、中医外科学等已建课程",
               "chain": " → ".join(t for n, s, t, w, src, K in PLAN),
               "levelLabel": "章群结构",
               "objectPressure": "创伤急救的判据是「顺序与时限」：先保命、再保肢、最后谈功能",
               "reportRule": "急救记录写：时间、受伤机制、意识与生命体征、处置、转运去向",
               "gapNote": "无独立教材；急救流程与药物剂量以现行规范为准，本课不代填",
               "chapterQ": {slug: [f"{t}的处置顺序能不能说清", why] for n, slug, t, why, srcs, K in PLAN},
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
