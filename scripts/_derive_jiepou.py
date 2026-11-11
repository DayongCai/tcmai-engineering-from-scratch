# -*- coding: utf-8 -*-
"""骨伤系 02 骨伤解剖学（派生课，10 章）+ 公有领域图版取源登记。

图源探测结论（2026-11-07 实测，见 standards/gushang-jiepou/补源登记.json）：
  upload.wikimedia.org / commons.wikimedia.org / archive.org / openlibrary.org → 000 不可达
  www.bartleby.com → 403；www.gutenberg.org → 可达但无 Gray's Anatomy 1918
  api.github.com / cdn.jsdelivr.net → 可达，但仓库镜像无授权与版本说明（不能据以主张公有领域）
→ 本轮**未取得合规图版**，正文以文字解剖描述为准，图版需求入清单。
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

SUB = "gushang-jiepou"
DEPT = "departments/04-gushang/02-yao-shang-jiepou"
TITLE = "骨伤解剖学"

VIEWS = {
    "骨与关节结构": ["骨小梁", "骨膜", "骨质", "骨皮质", "关节囊", "关节面", "韧带", "骨骺", "骨化", "软骨"],
    "肌与神经血管": ["肌腱", "筋膜", "神经", "血管", "动脉", "静脉", "支配", "肌群", "肌肉"],
    "体表与影像": ["体表", "标志", "定位", "影像", "X线", "CT", "MRI", "层面", "投影"],
}

PLANES = {"骨与关节结构": [1, 2, 3], "肌与软组织": [4], "神经血管与脊柱": [5, 6], "部位与影像": [7, 8, 9, 10]}

PLAN = [
 (1, "01-gu-jiegou", "骨的形态与构造", "骨的强弱由骨小梁排列与皮质厚度共同决定",
  [("gushang-jichu", ["骨的结构", "骨质", "骨密质", "骨松质", "骨膜"]), ("zhenggu", ["骨", "皮质"])], 6),
 (2, "02-gu-fayu", "骨的发生、生长与骨化", "骨骺线是儿童骨折分型的解剖基础",
  [("gushang-jichu", ["骨骺", "骨化", "生长", "发育", "儿童"]), ("zhenggu", ["骨骺", "小儿"])], 6),
 (3, "03-guanjie", "关节结构与运动学", "关节面、关节囊、韧带三者决定活动方向与稳定",
  [("zhenggu", ["关节", "关节囊", "韧带"]), ("kangfu-huli", ["关节活动"])], 6),
 (4, "04-ji-jinmo", "肌、肌腱与筋膜", "肌的起止点决定它的功能，也决定损伤模式",
  [("shoufa", ["肌", "肌腱", "筋膜"]), ("tuina", ["肌肉"])], 6),
 (5, "05-shenjing-xueguan", "神经与血管走行", "入路设计的第一约束是神经血管",
  [("zhenggu", ["神经", "血管", "动脉"]), ("gushang-yingxiang", ["神经", "血管"])], 6),
 (6, "06-jizhu-jiepou", "脊柱解剖", "三柱理论解释稳定性",
  [("gushang-jichu", ["脊柱", "椎"]), ("gushang-jizhu-bing", ["脊柱", "椎"])], 6),
 (7, "07-shangzhi", "上肢解剖", "上肢以灵活为先，稳定靠软组织",
  [("zhenggu", ["肩", "肘", "腕", "肱骨", "尺骨", "桡骨"]), ("gushang-jichu", ["上肢"])], 6),
 (8, "08-xiazhi", "下肢解剖", "下肢以负重为先，力线决定成败",
  [("zhenggu", ["髋", "膝", "踝", "股骨", "胫骨", "腓骨"]), ("gushang-jichu", ["下肢"])], 6),
 (9, "09-biaozhi", "体表标志与定位", "体表标志是手摸得到的解剖",
  [("zhenggu", ["标志", "体表", "定位"]), ("gushang-jichu", ["体表", "标志"])], 6),
 (10, "10-yingxiang-jiepou", "影像解剖对照", "同一结构在 X 线、CT、MRI 上不是同一个样子",
  [("gushang-yingxiang", ["正常", "解剖", "X线", "CT", "MRI"]), ("gushang-jichu", ["影像"])], 6),
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
    json.dump({"note": "骨伤解剖学派生课：一章一主题；四位面＝章群结构分区。",
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
               "xlsx": "派生课（无教材）：单元取自骨伤科学、正骨学、影像学、推拿手法学等已建课程",
               "chain": " → ".join(t for n, s, t, w, src, K in PLAN),
               "levelLabel": "章群结构",
               "objectPressure": "解剖学的判据是「摸得到、指得出、看得懂」：体表能定位，影像能对上",
               "reportRule": "记录写：部位、层次（皮/肉/骨）、体表标志、影像切面",
               "gapNote": "本课无图版（公有领域图源在本机网络不可达，见 补源登记.json）；仅文字描述",
               "chapterQ": {slug: [f"{t}能在体表或影像上指出来吗", why] for n, slug, t, why, srcs, K in PLAN},
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
