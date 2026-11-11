# -*- coding: utf-8 -*-
"""骨伤系 01 中医运动学（派生课，8 章）：单元取自气功学、康复护理、正骨学、筋伤学等父课。"""
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

SUB = "zhongyi-yundong"
DEPT = "departments/04-gushang/01-zhongyi-yundong-xue"
TITLE = "中医运动学"

VIEWS = {
    "导引功法": ["导引", "气功", "八段锦", "五禽戏", "六字诀", "易筋经", "吐纳", "调息"],
    "运动训练": ["运动", "训练", "肌力", "关节活动", "平衡", "步态", "牵伸", "抗阻"],
    "理论与防护": ["气血", "筋骨", "脏腑", "损伤", "预防", "禁忌", "风险"],
}

PLANES = {
    "理论与源流": [1, 2],
    "功法与处方": [3, 4],
    "体能训练": [5, 6],
    "平衡与损伤防护": [7, 8],
}

PLAN = [
 (1, "01-gailun-yuanliu", "中医运动学概论与源流", "导引不是「活动活动」：它有明确的三调操作与剂量", 
  [("qigong", ["导引", "起源", "简史", "五禽戏", "八段锦"]), ("zhenggu", ["练功", "导引"])], 6),
 (2, "02-lilun-jichu", "运动的中医理论基础", "气血、筋骨、脏腑是解释框架，不是修辞",
  [("qigong", ["气血", "经络", "脏腑", "精", "神"]), ("zhenggu", ["筋骨", "气血"])], 6),
 (3, "03-gongneng-suzhi", "运动功能与体能要素", "力量、柔韧、平衡、耐力四要素各管一段",
  [("kangfu-huli", ["肌力", "关节活动", "平衡", "耐力", "体能"]), ("qigong", ["体能"])], 6),
 (4, "04-daoyin-chufang", "导引功法与运动处方", "处方要写清练什么、练多久、练到什么程度",
  [("qigong", ["功法", "练功", "处方", "强度", "时间"]), ("kangfu-huli", ["运动处方", "训练"])], 6),
 (5, "05-guanjie-jianrou", "关节活动与柔韧训练", "先测活动度，再谈牵伸",
  [("kangfu-huli", ["关节活动", "牵伸", "柔韧", "活动度"]), ("zhenggu", ["关节", "筋"])], 6),
 (6, "06-jili-naili", "肌力与耐力训练", "抗阻训练的剂量是次数×组数×负荷",
  [("kangfu-huli", ["肌力", "抗阻", "训练", "力量"]), ("shoufa", ["肌力"])], 6),
 (7, "07-pingheng-diedao", "平衡、协调与跌倒预防", "跌倒风险是老年人运动干预的第一终点",
  [("kangfu-huli", ["平衡", "跌倒", "步态", "协调"]), ("laonian-huli", ["跌倒", "平衡"])], 6),
 (8, "08-shanghai-yufang", "运动损伤的预防与康复", "热身、负荷递增、恢复三件事决定伤不伤",
  [("gushang-jinshang", ["筋伤", "损伤", "劳损"]), ("zhenggu", ["损伤", "预防"])], 6),
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
    json.dump({"note": "中医运动学派生课：一章一主题；四位面＝章群结构分区。",
               "chapters": {slug: {"n": n, "title": t, "units": [u["sub"] for u in units if u["chapter"] == str(n)],
                                   "srcChapters": [f"派生#{n}"], "why": why,
                                   "derivedFrom": "、".join(p for p, _ in srcs)}
                            for n, slug, t, why, srcs, K in PLAN},
               },
              io.open(os.path.join(out, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": "三辨按词表现算；四位面＝章群结构分区（不用词频）。",
               "views": VIEWS, "levelsA": PLANES, "probe": probe, "ratio": ratio},
              io.open(os.path.join(out, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    fb = {slug: [f"《{TITLE}·{t}》", "派生课：篇名为本课程章名，出处见 units.json 的 source 字段"]
          for n, slug, t, why, srcs, K in PLAN}
    json.dump({"courseTitle": TITLE, "deptPath": DEPT,
               "xlsx": "派生课（无教材）：单元取自气功学、康复护理、正骨学、筋伤学等已建课程",
               "chain": " → ".join(t for n, s, t, w, src, K in PLAN),
               "levelLabel": "章群结构",
               "objectPressure": "中医运动学的判据是「可执行」：练什么、练多少、练到什么反应、什么时候停",
               "reportRule": "运动处方写：功法/动作、强度、时长、频次、禁忌与停止指征",
               "gapNote": "无独立教材；功法视频与动作分解图缺失，见骨伤系图示缺口",
               "chapterQ": {slug: [f"{t}的处方怎么写才算完整", why] for n, slug, t, why, srcs, K in PLAN},
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
