# -*- coding: utf-8 -*-
"""骨伤系 16 临床轮转 / 17 毕业设计（两门 sem910 派生课）。

章节名与顺序以 data/new-subjects-chapters.json 为准（脚本内断言），不手改。
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

DATA = json.load(io.open(os.path.join(ROOT, "data", "new-subjects-chapters.json"), encoding="utf-8"))
CH = {it["key"]: it["chapters"] for it in DATA["subjects"]}

COURSES = [
 {
  "sub": "gushang-lunzhuan", "dept": "departments/04-gushang/16-gushang-linchuang-lunzhuan",
  "key": "04-gushang/16-gushang-lunzhuan" if False else "04-gushang/16-gushang-linchuang-lunzhuan",
  "title": "骨伤临床轮转",
  "views": {"临床执行": ["操作", "复位", "固定", "手法", "处理", "查体", "评估", "记录"],
            "考核复盘": ["考核", "复盘", "病历", "总结", "评价", "标准", "带教"],
            "轮转准备": ["准备", "入科", "熟悉", "流程", "制度", "职责"]},
  "planes": {"正骨与筋伤": [1, 2], "脊柱与关节": [3, 4], "急诊创伤": [5], "考核复盘": [6]},
  "plan": [
   (1, "zhenggu-lunzhuan", "正骨科轮转：骨折复位与固定", "先看复位标准，再动手；固定方式决定复查节奏",
    [("zhenggu", ["骨折", "复位", "固定", "夹板", "石膏"]), ("gushang-jichu", ["复位", "固定"])], 6),
   (2, "jinshang-lunzhuan", "筋伤科轮转：软组织损伤", "筋伤科的门诊量大，辨证与手法要同时过关",
    [("gushang-jinshang", ["筋伤", "手法", "劳损", "理筋"]), ("zhenggu", ["筋伤", "软组织"])], 6),
   (3, "jizhu-lunzhuan", "脊柱科轮转", "脊柱科先看稳定性与神经，再谈手法",
    [("gushang-jizhu-bing", ["脊柱", "颈椎", "腰椎"]), ("gushang-yingxiang", ["脊柱", "MRI"])], 6),
   (4, "guanjie-lunzhuan", "关节科轮转", "关节科的鉴别比治疗更重要：感染、结核、肿瘤先排",
    [("gushang-bing", ["关节", "退行性", "骨关节炎"]), ("zhenggu", ["关节"])], 6),
   (5, "jizhen-chuangshang", "急诊创伤与院前处置", "急诊先保命：ABCDE 顺序不可换",
    [("gushang-chuangshang-jijiu", ["急救", "创伤", "搬运", "休克"]), ("gushang-jichu", ["急救", "创伤"])], 6),
   (6, "chuke-kaohe", "出科考核与病例复盘", "考核考的不是背，是能不能把一次接诊讲清楚",
    [("gushang-jichu", ["病历", "记录", "诊查", "考核"]), ("zhenggu", ["病历", "记录"])], 6),
  ]},
 {
  "sub": "gushang-biye", "dept": "departments/04-gushang/17-gushang-biye-sheji",
  "key": "04-gushang/17-gushang-biye-sheji",
  "title": "骨伤毕业设计与知识移交",
  "views": {"选题与数据": ["选题", "命题", "数据", "样本", "测量", "指标"],
            "实现与评价": ["手法", "支具", "方案", "实现", "疗效", "并发症", "评价"],
            "写作与移交": ["论文", "答辩", "规范", "交接", "文档", "移交"]},
  "planes": {"选题与数据": [1, 2], "实现与评价": [3, 4], "写作答辩": [5], "知识移交": [6]},
  "plan": [
   (1, "xuan-ti", "选题：从复位方案到可量化命题", "毕设题目必须能被测量，否则写不出结论",
    [("gushang-kangfu-pingding", ["评估", "指标", "量表", "测量"]), ("gushang-jichu", ["诊查", "分型"])], 6),
   (2, "yingxiang-shuju", "影像与生物力学数据准备", "影像与力学数据要能复算，不能只贴图",
    [("gushang-yingxiang", ["影像", "X线", "CT", "MRI", "测量"]), ("zhenggu", ["生物力学", "力线"])], 6),
   (3, "shoufa-zhiju", "手法与支具的系统实现", "实现部分要写清「怎么做、谁做、做多久」",
    [("gushang-shoufa-zhiliao", ["手法", "整复", "规范"]), ("gushang-kangfu-gongcheng", ["支具", "矫形", "适配"])], 6),
   (4, "liaoxiao-pingjia", "疗效与并发症评价", "没有并发症统计的疗效结论不成立",
    [("gushang-kangfu-pingding", ["评定", "疗效", "随访", "量表"]), ("gushang-jinshang", ["疗效", "并发症"])], 6),
   (5, "lunwen-dabian", "论文写作与答辩", "论文的每一句话都要能回到数据",
    [("huli-yanjiu-zhengxun", ["论文", "写作", "报告", "证据"]), ("gushang-kangfu-pingding", ["报告", "记录"])], 6),
   (6, "zhishi-yijiao", "知识移交：操作规范与交接", "移交的标准是别人拿着能照做",
    [("gushang-chuangshang-jijiu", ["规范", "流程", "记录"]), ("gushang-jichu", ["规范", "记录"])], 6),
  ]},
]


def load(sub):
    p = os.path.join(S, sub, "units.json")
    return json.load(io.open(p, encoding="utf-8")) if os.path.exists(p) else None


def hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text, lv):
    return {k: sum(text.count(w) for w in ws) for k, ws in lv.items()}


def build(cfg):
    import shutil
    sub, dept, title = cfg["sub"], cfg["dept"], cfg["title"]
    chs = CH[cfg["key"]]
    plan = cfg["plan"]
    assert [p[1] for p in plan] == [c[0] for c in chs], f"{sub} 章 slug 与 data 不一致"
    assert [p[2] for p in plan] == [c[1] for c in chs], f"{sub} 章标题与 data 不一致"

    shutil.rmtree(os.path.join(ROOT, dept, "chapters"), ignore_errors=True)
    used, units = set(), []
    probe = {"view": {k: 0 for k in cfg["views"]}, "A_part": {k: 0 for k in cfg["planes"]}}
    missing = []
    for n, slug, ttl, why, srcs, K in plan:
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
                "chapter": str(n), "chapterTitle": f"第{n}章 {ttl}", "sec": "", "secNo": "",
                "sub": f"{n}.{i}", "title": f"{n}.{i} {u.get('title','')}",
                "locator": f"派生·第{n}章·{n}.{i}",
                "brief": u.get("brief", ""), "goals": [], "rawBody": prose, "body": prose, "prose": prose,
                "segments": u.get("segments", []), "hanzi": hanzi(prose),
                "measure": {"digits": len(re.findall(r"\d", prose)), "valueLike": 0,
                            "views": measure(prose, cfg["views"]), "levels": {k: 0 for k in cfg["planes"]}},
                "srcSub": parent, "source": f"{parent}:{u['locator']}"})
            for k, v in units[-1]["measure"]["views"].items():
                probe["view"][k] += v

    for u in units:
        for p, chs_ in cfg["planes"].items():
            if int(u["chapter"]) in chs_:
                u["measure"]["levels"][p] = u["hanzi"]
                probe["A_part"][p] += u["hanzi"]

    ratio = {}
    for g, b in probe.items():
        vals = [v for v in b.values() if v]
        ratio[g] = round(max(b.values()) / min(vals), 1) if len(vals) > 1 and min(vals) else None
    counts = {"chapters": len(plan), "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
              "digits": sum(u["measure"]["digits"] for u in units), "valueLike": 0}
    out = os.path.join(S, sub)
    os.makedirs(out, exist_ok=True)
    json.dump({"source": {"kind": "派生", "from": sorted({u["srcSub"] for u in units}),
                          "note": "单元正文取自父课，未改字；locator 一律「派生·」；两课汉字不可相加。"},
               "counts": counts, "views": cfg["views"], "levels": cfg["planes"],
               "probe": probe, "ratio": ratio, "units": units},
              io.open(os.path.join(out, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": f"{title} 派生课：章名与顺序来自 data/new-subjects-chapters.json（脚本断言一致）。",
               "chapters": {slug: {"n": n, "title": t, "units": [u["sub"] for u in units if u["chapter"] == str(n)],
                                   "srcChapters": [f"派生#{n}"], "why": why,
                                   "derivedFrom": "、".join(p for p, _ in srcs)}
                            for n, slug, t, why, srcs, K in plan}},
              io.open(os.path.join(out, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": "三辨按词表现算；四位面＝章群结构分区（不用词频）。",
               "views": cfg["views"], "levelsA": cfg["planes"], "probe": probe, "ratio": ratio},
              io.open(os.path.join(out, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    fb = {slug: [f"《{title}·{t}》", "派生课：篇名为本课程章名，出处见 units.json 的 source 字段"]
          for n, slug, t, why, srcs, K in plan}
    json.dump({"courseTitle": title, "deptPath": dept,
               "xlsx": "派生课（无教材）：单元取自骨伤系已建课程",
               "chain": " → ".join(t for n, s, t, w, src, K in plan),
               "levelLabel": "章群结构",
               "objectPressure": "骨伤临床判据始终是「先排危险，再谈手法」；轮转与毕设都要能复述这句话的证据",
               "reportRule": "记录写：站点/题目、观察或测量项、过程、结果、结论与局限",
               "gapNote": "无独立教材；章节名与顺序由 data/new-subjects-chapters.json 固定，不得手改",
               "chapterQ": {slug: [f"{t}这一段，能不能独立完成并讲清依据", why] for n, slug, t, why, srcs, K in plan},
               "fallback": fb, "defaultCite": [f"《{title}》", "派生课篇名"]},
              io.open(os.path.join(out, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    per_ch = {}
    for u in units:
        per_ch[int(u["chapter"])] = per_ch.get(int(u["chapter"]), 0) + u["hanzi"]
    print(f"{sub}: {counts['chapters']} 章 / {counts['units']} 单元 / {counts['hanzi']:,} 汉字 / {ratio}")
    print("  每章:", sorted(per_ch.items()))
    if missing:
        print("  缺父课:", sorted(set(missing)))

    for cmd in ([PY, "scripts/scaffold_huli_chapter.py", sub, dept, "--all"],
                [PY, "scripts/build_huli_docs.py", sub, dept],
                ["node", "scripts/scaffold_sem910.js"]):
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
        print("  ", cmd[1] if cmd[0] == PY else cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])


if __name__ == "__main__":
    for cfg in COURSES:
        build(cfg)
