# -*- coding: utf-8 -*-
"""骨伤系三门派生课：13 中医整脊学 / 14 康复工程与支具学 / 15 骨伤康复评定。"""
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

COURSES = {
 "gushang-zhengji": {
  "dept": "departments/04-gushang/13-zhongyi-zhengji-xue", "title": "中医整脊学",
  "views": {"脊柱力学": ["脊柱", "椎", "序列", "曲度", "力线", "稳定", "生物力学"],
            "手法整复": ["手法", "整复", "复位", "旋转", "拔伸", "松解"],
            "评估与风险": ["评估", "影像", "分型", "风险", "禁忌", "神经", "血管"]},
  "planes": {"理论与影像": [1, 2, 3], "手法与颈椎": [4, 5], "胸腰骨盆": [6, 7], "风险与疗效": [8]},
  "plan": [
   (1, "01-yuanliu-lilun", "整脊源流与理论", "整脊不是「掰响」，是可解释的力学与序列调整", [("zhenggu", ["脊柱", "整复", "手法"]), ("shoufa", ["脊柱"])], 6),
   (2, "02-jiepou-lixue", "脊柱解剖与生物力学", "先懂序列与曲度，再谈复位", [("zhenggu", ["脊柱", "生物力学", "稳定"]), ("gushang-jichu", ["脊柱", "解剖"])], 6),
   (3, "03-yingxiang-pinggu", "影像评估与适应证", "影像不是用来「找问题」，是用来排除禁忌", [("gushang-yingxiang", ["脊柱", "X线", "MRI", "CT"]), ("zhenggu", ["影像"])], 6),
   (4, "04-shoufa-tixi", "整脊手法体系", "手法分级：松解、松动、整复三层", [("zhenggu", ["手法", "整复", "旋转"]), ("shoufa", ["手法", "拔伸"])], 6),
   (5, "05-jingzhui", "颈椎整脊", "颈椎是风险最高的一段", [("zhenggu", ["颈椎", "颈"]), ("gushang-jizhu-bing", ["颈椎"])], 6),
   (6, "06-xiongyaozhui", "胸腰椎整脊", "胸椎手法要防肋骨与椎体骨折", [("zhenggu", ["胸椎", "腰椎"]), ("gushang-jizhu-bing", ["腰椎", "胸椎"])], 6),
   (7, "07-gupen-xiayao", "骨盆与下肢力线", "骶髂与髋膝踝是一条链", [("zhenggu", ["骨盆", "骶", "髋", "膝"]), ("zhiliao", ["骨盆"])], 6),
   (8, "08-fengxian-liaoxiao", "风险、禁忌与疗效评价", "三类禁忌写死：骨折、肿瘤、脊髓压迫", [("zhenggu", ["禁忌", "风险", "神经"]), ("gushang-jizhu-bing", ["禁忌", "风险"])], 6),
  ]},

 "gushang-kangfu-gongcheng": {
  "dept": "departments/04-gushang/14-kangfu-gongcheng-zhiju", "title": "康复工程与支具学",
  "views": {"支具与材料": ["支具", "矫形器", "材料", "塑料", "金属", "石膏", "固定"],
            "适配与制作": ["适配", "取型", "测量", "制作", "调整", "穿戴", "试戴", "修型", "石膏模型"],
            "评估与随访": ["评估", "随访", "依从", "皮肤", "并发症", "更换"]},
  "planes": {"概论与材料": [1, 2], "脊柱与上肢": [3, 4], "下肢与足部": [5, 6], "辅具与随访": [7, 8]},
  "plan": [
   (1, "01-gailun", "康复工程概论", "支具的作用是「替代、限制、矫正」三选一", [("kangfu-huli", ["康复", "支具", "矫形"]), ("zhenggu", ["固定", "支具"])], 6),
   (2, "02-fenlei-cailiao", "支具分类与材料", "材料决定强度与重量，也决定依从性", [("kangfu-huli", ["支具", "材料", "固定"]), ("zhenggu", ["夹板", "石膏"])], 6),
   (3, "03-jizhu-zhiju", "脊柱支具", "脊柱支具的关键是三点受力", [("kangfu-huli", ["支具", "脊柱"]), ("zhenggu", ["脊柱", "固定"])], 6),
   (4, "04-shangzhi-zhiju", "上肢支具", "手部支具最讲精细", [("kangfu-huli", ["上肢", "支具", "手"]), ("shoufa", ["腕", "手"])], 6),
   (5, "05-xiazhi-zhiju", "下肢支具", "负重与步态是下肢支具的两条指标", [("kangfu-huli", ["下肢", "支具", "步态"]), ("zhenggu", ["下肢", "固定"])], 6),
   (6, "06-zuxie-yali", "矫形鞋与压力治疗", "压力治疗的关键是梯度，不是越紧越好", [("kangfu-huli", ["压力", "弹力", "足"]), ("zhenggu", ["足", "踝"])], 6),
   (7, "07-zhuxing-fuzhu", "助行器、轮椅与转移辅具", "辅具选错，比不用更容易跌倒", [("kangfu-huli", ["助行", "拐杖", "轮椅", "转移", "辅具", "辅助器具"]), ("zhenggu", ["拐杖", "助行"])], 6),
   (8, "08-pinggu-suifang", "适配评估与随访", "皮肤压红是最早的失效信号", [("kangfu-huli", ["评估", "随访", "皮肤", "压疮"]), ("jichu-huli", ["皮肤", "压疮"])], 6),
  ]},

 "gushang-kangfu-pingding": {
  "dept": "departments/04-gushang/15-gushang-kangfu-pingding", "title": "骨伤康复评定",
  "views": {"关节与肌力": ["关节活动", "肌力", "肌张力", "握力", "ROM", "量角", "活动度", "肌肉", "肌群", "关节"],
            "功能与步态": ["步态", "平衡", "转移", "步行", "日常生活", "ADL", "行走", "站立", "坐位"],
            "量表与报告": ["量表", "评分", "评定", "信度", "效度", "报告", "记录", "分级"]},
  "planes": {"概论与关节": [1, 2], "平衡步态与ADL": [3, 4], "疼痛心理与影像": [5, 6], "量表与报告": [7, 8]},
  "plan": [
   (1, "01-pingding-gailun", "康复评定概论", "评定不是打分，是给下一个决策提供依据", [("kangfu-huli", ["评定", "评估", "康复"]), ("gushang-jichu", ["诊查"])], 6),
   (2, "02-guanjie-jili", "关节活动度与肌力评定", "量角与徒手肌力：两个最基础也最易做错的测量", [("kangfu-huli", ["关节活动", "肌力", "量角"]), ("shoufa", ["关节", "肌力"])], 6),
   (3, "03-pingheng-butai", "平衡与步态评定", "跌倒风险是骨伤康复的第一指标", [("kangfu-huli", ["平衡", "步态", "跌倒"]), ("laonian-huli", ["跌倒"])], 6),
   (4, "04-adl-shenghuo", "日常生活活动与生活质量", "ADL 分数要能指到具体动作", [("kangfu-huli", ["日常生活", "ADL", "进食", "穿衣"]), ("jichu-huli", ["日常生活"])], 6),
   (5, "05-tengtong-xinli", "疼痛与心理评定", "疼痛评分是主观的，但可以标准化地问", [("kangfu-huli", ["疼痛", "评分", "心理"]), ("zhenjiu-zhiliao", ["疼痛"])], 6),
   (6, "06-yingxiang-gongneng", "影像与功能的对应", "影像严重不等于功能差", [("gushang-yingxiang", ["影像", "骨折", "关节"]), ("kangfu-huli", ["功能"])], 6),
   (7, "07-liangbiao", "评定量表的选择与信效度", "选错量表比不评更糟", [("kangfu-huli", ["量表", "评分", "信度"]), ("huli-yanjiu-zhengxun", ["量表", "信度", "效度"])], 6),
   (8, "08-baogao-suifang", "评定报告与随访", "报告要能被下一个人直接执行", [("kangfu-huli", ["报告", "记录", "随访"]), ("huli-yanjiu-zhengxun", ["记录"])], 6),
  ]},
}


def load(sub):
    p = os.path.join(S, sub, "units.json")
    return json.load(io.open(p, encoding="utf-8")) if os.path.exists(p) else None


def hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text, lv):
    return {k: sum(text.count(w) for w in ws) for k, ws in lv.items()}


def build(sub, cfg):
    plan, planes = cfg["plan"], cfg["planes"]
    used, units = set(), []
    probe = {"view": {k: 0 for k in cfg["views"]}, "A_part": {k: 0 for k in planes}}
    missing = []
    for n, slug, title, why, srcs, K in plan:
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
                            "views": measure(prose, cfg["views"]), "levels": {k: 0 for k in planes}},
                "srcSub": parent, "source": f"{parent}:{u['locator']}"})
            for k, v in units[-1]["measure"]["views"].items():
                probe["view"][k] += v

    for u in units:
        for p, chs in planes.items():
            if int(u["chapter"]) in chs:
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
               "counts": counts, "views": cfg["views"], "levels": planes,
               "probe": probe, "ratio": ratio, "units": units},
              io.open(os.path.join(out, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": "派生课：一章一主题；四位面＝章群结构分区。",
               "chapters": {slug: {"n": n, "title": t, "units": [u["sub"] for u in units if u["chapter"] == str(n)],
                                   "srcChapters": [f"派生#{n}"], "why": why,
                                   "derivedFrom": "、".join(p for p, _ in srcs)}
                            for n, slug, t, why, srcs, K in plan}},
              io.open(os.path.join(out, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": "三辨按词表现算；四位面＝章群结构分区（不用词频）。",
               "views": cfg["views"], "levelsA": planes, "probe": probe, "ratio": ratio},
              io.open(os.path.join(out, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    fb = {slug: [f"《{cfg['title']}·{t}》", "派生课：篇名为本课程章名，出处见 units.json 的 source 字段"]
          for n, slug, t, why, srcs, K in plan}
    json.dump({"courseTitle": cfg["title"], "deptPath": cfg["dept"],
               "xlsx": "派生课（无教材）：单元取自骨伤系与针灸/护理系已建课程，见 units.json source",
               "chain": " → ".join(t for n, s, t, w, src, K in plan),
               "levelLabel": "章群结构",
               "objectPressure": "骨伤课的共同判据：先排危险（骨折/肿瘤/神经血管），再谈手法、支具与评定",
               "reportRule": "记录写：部位、病程、体征与影像、分型/分级、处理、随访",
               "gapNote": "无独立教材；单元为父课重排，未覆盖主题见各章 why 与 README",
               "chapterQ": {slug: [f"{t}的核心判据是什么", why] for n, slug, t, why, srcs, K in plan},
               "fallback": fb, "defaultCite": [f"《{cfg['title']}》", "派生课篇名"]},
              io.open(os.path.join(out, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    per_ch = {}
    for u in units:
        per_ch[int(u["chapter"])] = per_ch.get(int(u["chapter"]), 0) + u["hanzi"]
    lo = min(per_ch.items(), key=lambda kv: kv[1]) if per_ch else (0, 0)
    print(f"{sub}: {counts['chapters']} 章 / {counts['units']} 单元 / {counts['hanzi']:,} 汉字 · {ratio} · 最薄章 {lo}")
    if missing:
        print("  缺父课:", sorted(set(missing)))
    for cmd in ([PY, "scripts/scaffold_huli_chapter.py", sub, cfg["dept"], "--all"],
                [PY, "scripts/build_huli_docs.py", sub, cfg["dept"]]):
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
        print("   ", cmd[1], "→", (r.stdout or r.stderr).strip().splitlines()[-1:])


if __name__ == "__main__":
    import shutil
    for sub, cfg in COURSES.items():
        shutil.rmtree(os.path.join(ROOT, cfg["dept"], "chapters"), ignore_errors=True)
        build(sub, cfg)
