# -*- coding: utf-8 -*-
"""骨伤系四门派生课：07 筋伤 / 08 手法治疗 / 10 脊柱病 / 12 骨质疏松。

派生规则：正文逐字取自父课；locator `派生·第N章·m.k`；source 记「父课:父locator」；
四位面一律用**章群结构分区**（关键词统计会被父课泛词支配）。
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

COURSES = {
 "gushang-jinshang": {
  "dept": "departments/04-gushang/07-zhongyi-jinshang-xue", "title": "中医筋伤学",
  "views": {"筋伤病理": ["筋伤", "劳损", "瘀血", "粘连", "瘢痕", "挛缩", "病理"],
            "手法治疗": ["手法", "推拿", "按摩", "理筋", "弹拨", "拔伸"],
            "分期与康复": ["分期", "功能锻炼", "康复", "固定", "制动", "护理"]},
  "planes": {"总论与诊查": [1, 2], "病理与手法": [3, 4, 5], "颈肩腰膝": [6, 7, 8], "其他与康复": [9, 10]},
  "plan": [
   (1, "01-jinshang-zonglun", "筋伤总论", "筋伤不是「软组织损伤」的同义词：中医按筋、肉、骨分层", [("zhenggu", ["筋伤", "软组织"]), ("gushang-jichu", ["筋伤"])], 6),
   (2, "02-bingli-fenqi", "筋伤的病理与分期", "急性期、缓解期、恢复期，手法强度随期而变", [("zhenggu", ["筋伤", "瘀血", "分期"]), ("gushang-jichu", ["筋伤", "瘀"])], 6),
   (3, "03-zhencha", "筋伤的诊查", "压痛点在哪儿，比疼多久更有信息量", [("zhenggu", ["压痛", "诊查", "体征"]), ("gushang-jichu", ["诊查"])], 6),
   (4, "04-shoufa-guding", "理筋手法与固定", "先松解再固定，顺序反了会加重", [("shoufa", ["手法", "理筋", "弹拨"]), ("zhenggu", ["固定", "手法"])], 6),
   (5, "05-jingbu", "颈部筋伤", "落枕与颈型颈椎病常被混为一谈", [("zhenggu", ["颈", "落枕"]), ("tuina", ["颈"])], 6),
   (6, "06-jianbu", "肩部筋伤", "肩袖与肩周：一个要练，一个要松", [("zhenggu", ["肩", "肩袖"]), ("zhiliao", ["肩"])], 6),
   (7, "07-yaobei", "腰背部筋伤", "急性腰扭伤与慢性劳损的处理相反", [("zhenggu", ["腰", "劳损"]), ("zhiliao", ["腰"])], 6),
   (8, "08-xihuai", "膝、踝部筋伤", "韧带与半月板：一个靠固定，一个靠评估", [("zhenggu", ["膝", "踝", "韧带"]), ("gushang-jichu", ["膝", "踝"])], 6),
   (9, "09-qita", "其他部位筋伤", "腕、肘、跟腱：小部位大影响", [("zhenggu", ["腕", "肘", "跟腱"]), ("shoufa", ["腕", "肘"])], 6),
   (10, "10-kangfu", "筋伤的康复与预防", "复发率取决于恢复期做了什么", [("kangfu-huli", ["康复", "功能锻炼"]), ("zhenggu", ["功能锻炼"])], 6),
  ]},

 "gushang-shoufa-zhiliao": {
  "dept": "departments/04-gushang/08-gushang-shoufa-zhiliao", "title": "骨伤科手法治疗学",
  "views": {"手法技术": ["手法", "推拿", "理筋", "弹拨", "拔伸", "端提", "旋转"],
            "适应证与量": ["适应证", "强度", "力度", "时间", "频次", "疗程"],
            "风险与禁忌": ["禁忌", "风险", "意外", "骨折", "神经", "血管", "并发症"]},
  "planes": {"基础与手法": [1, 2, 3], "整复与部位": [4, 5], "部位与小儿": [6, 7, 8], "安全与评价": [9, 10]},
  "plan": [
   (1, "01-shoufa-jichu", "手法治疗的基础", "手法的力学：力的大小、方向、作用点", [("shoufa", ["手法", "力学", "力度"]), ("zhenggu", ["手法"])], 6),
   (2, "02-zhenggu-bafa", "正骨八法与常用手法", "八法是骨伤手法的主干", [("zhenggu", ["正骨", "八法", "拔伸", "旋转"]), ("shoufa", ["整复"])], 6),
   (3, "03-ruanzuzhi-shoufa", "软组织手法", "滚、揉、拿、按：松解类手法的作用层次", [("shoufa", ["滚法", "揉法", "拿法", "按法"]), ("tuina", ["手法"])], 6),
   (4, "04-zhenggu-shoufa", "整复类手法", "复位是高风险动作：先评估再动手", [("zhenggu", ["复位", "整复", "牵引"]), ("shoufa", ["复位"])], 6),
   (5, "05-jingjian", "颈肩部手法", "颈椎手法是风险最高的一类", [("zhenggu", ["颈", "肩"]), ("shoufa", ["颈", "肩"])], 6),
   (6, "06-yaotui", "腰腿部手法", "腰腿痛的手法选择取决于病因", [("zhenggu", ["腰", "腿"]), ("zhiliao", ["腰", "腿"])], 6),
   (7, "07-guanjie-songdong", "关节松动手法", "松动与整复不是一回事", [("shoufa", ["关节", "松动", "活动"]), ("kangfu-huli", ["关节活动"])], 6),
   (8, "08-xiaoer-shoufa", "小儿骨伤手法", "小儿不是「小号成人」", [("zhenggu", ["小儿", "儿童"]), ("xiaoer-tuina", ["小儿"])], 6),
   (9, "09-fengxian-jinji", "风险、禁忌与意外处理", "三类意外必须写死：骨折、神经、血管", [("zhenggu", ["禁忌", "意外", "神经", "血管"]), ("shoufa", ["禁忌"])], 6),
   (10, "10-pingjia", "疗效评价与方案设计", "手法疗效要能落到可测指标", [("zhenggu", ["疗效", "评价"]), ("kangfu-huli", ["评定", "评价"])], 6),
  ]},

 "gushang-jizhu-bing": {
  "dept": "departments/04-gushang/10-jizhu-bing-xue", "title": "脊柱病学",
  "views": {"解剖与力学": ["椎", "间盘", "韧带", "生物力学", "稳定", "序列"],
            "诊断与影像": ["影像", "X线", "CT", "MRI", "体征", "分型"],
            "治疗与康复": ["手法", "牵引", "手术", "康复", "锻炼", "支具"]},
  "planes": {"基础与影像": [1, 2], "颈椎": [3, 4], "腰椎": [5, 6], "畸形骨折与康复": [7, 8, 9, 10]},
  "plan": [
   (1, "01-jiepou-lixue", "脊柱解剖与生物力学", "稳定性判断比影像描述更重要", [("zhenggu", ["脊柱", "生物力学", "稳定"]), ("gushang-jichu", ["脊柱"])], 6),
   (2, "02-yingxiang-zhenduan", "脊柱影像诊断", "先看序列与稳定性，再看信号", [("gushang-yingxiang", ["脊柱", "MRI", "CT"]), ("gushang-jichu", ["影像"])], 6),
   (3, "03-jingzhuibing", "颈椎病", "分型决定治法，不只看片子", [("zhenggu", ["颈椎", "颈"]), ("zhiliao", ["颈椎"])], 6),
   (4, "04-jingzhu-sunshang", "颈椎损伤", "搬运与固定优先于任何手法", [("gushang-yingxiang", ["颈椎", "脊髓"]), ("zhenggu", ["颈椎", "损伤"])], 6),
   (5, "05-yaojianpan", "腰椎间盘突出症", "手术指征与保守指征的界线", [("zhenggu", ["腰椎", "间盘"]), ("zhiliao", ["腰痛", "腰椎"])], 6),
   (6, "06-yaozhuiguan-xiazhai", "腰椎管狭窄与滑脱", "间歇性跛行是关键线索", [("zhenggu", ["腰椎", "狭窄", "滑脱"]), ("gushang-yingxiang", ["腰椎"])], 6),
   (7, "07-cewan", "脊柱侧弯与畸形", "青少年筛查与支具时机", [("zhenggu", ["侧弯", "畸形"]), ("gushang-bing", ["畸形"])], 6),
   (8, "08-guzhishusong-guzhe", "骨质疏松性椎体骨折", "这类骨折的固定与止痛策略不同", [("gushang-bing", ["骨质疏松", "骨折"]), ("zhenggu", ["脊柱骨折"])], 6),
   (9, "09-shoufa-shoushu", "手法与手术的边界", "哪些能做手法，哪些一碰就出事", [("zhenggu", ["手法", "手术", "禁忌"]), ("shoufa", ["手法"])], 6),
   (10, "10-kangfu", "脊柱康复与长期管理", "核心训练是复发率的分水岭", [("kangfu-huli", ["康复", "训练", "核心"]), ("zhenggu", ["功能锻炼"])], 6),
  ]},

 "gushang-guzhishusong": {
  "dept": "departments/04-gushang/12-guzhishusong-tuibian", "title": "骨质疏松与退行性疾病",
  "views": {"骨代谢": ["骨密度", "钙", "骨吸收", "骨形成", "代谢", "激素"],
            "诊断与评估": ["诊断", "骨密度", "量表", "评估", "骨折风险"],
            "治疗与管理": ["药物", "运动", "康复", "跌倒", "随访", "长期"]},
  "planes": {"基础与诊断": [1, 2], "骨质疏松与退变": [3, 4], "影像与药物": [5, 6], "康复与长期管理": [7, 8]},
  "plan": [
   (1, "01-gudaixie-jichu", "骨代谢基础", "骨重建的平衡点在哪，治疗就打在哪", [("gushang-bing", ["骨代谢", "钙", "骨形成", "骨吸收"]), ("zhongyao-xue", ["补骨"])], 6),
   (2, "02-zhenduan-pinggu", "诊断与骨折风险评估", "骨密度是数，不是结论", [("gushang-bing", ["骨密度", "诊断", "骨量"]), ("kangfu-huli", ["评估"])], 6),
   (3, "03-guzhishusong", "骨质疏松症", "无症状期才是干预窗口", [("gushang-bing", ["骨质疏松", "骨量减少"]), ("zhenggu", ["骨质疏松"])], 6),
   (4, "04-guguanjieyan", "骨关节炎", "影像退变与疼痛常常不同步", [("gushang-bing", ["骨关节炎", "退行性", "增生"]), ("zhenggu", ["骨关节炎"])], 6),
   (5, "05-tuibian-yingxiang", "退行性变的影像评估", "分级用于沟通，不用于代替症状", [("gushang-yingxiang", ["退变", "关节", "增生"]), ("gushang-bing", ["退变"])], 6),
   (6, "06-yaowu", "药物与非药物治疗", "补钙不是治疗的全部", [("gushang-bing", ["药物", "治疗", "补钙"]), ("linchuang-zhongyao", ["补益"])], 6),
   (7, "07-kangfu-diedao", "运动康复与跌倒预防", "防跌倒比补钙更快见效", [("kangfu-huli", ["跌倒", "运动", "平衡"]), ("laonian-huli", ["跌倒"])], 6),
   (8, "08-changqi-guanli", "长期管理与随访", "依从性决定结局", [("kangfu-huli", ["随访", "长期", "管理"]), ("laonian-huli", ["长期"])], 6),
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
                hay = (u.get("title") or "") + prose0[:1500]
                score = sum(hay.count(k) for k in kws)
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
               "xlsx": "派生课（无教材）：单元取自骨伤系与针灸系已建课程，见 units.json source",
               "chain": " → ".join(t for n, s, t, w, src, K in plan),
               "levelLabel": "章群结构",
               "objectPressure": "骨伤课的共同判据：先排危险（感染/结核/肿瘤/神经血管），再谈手法与康复",
               "reportRule": "记录写：部位、病程、体征与影像、分型、处理、随访",
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
