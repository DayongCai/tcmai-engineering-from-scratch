# -*- coding: utf-8 -*-
"""按历史先后演绎中医药知识树：数据构建。

输出 data/kt-history.json，供 assets/kt-history.template.html 渲染。

判据分三层，互不冒充（写进产物里，读者能自己复核）：

  1. 源流判定（era.nodes[].basis）—— 两类证据，逐条带标签：
       · 典籍同名     学科名/章名与某部典籍直接同名（可复核：看目录即可）
       · 学科史通说   教材《中国医学史》的通行结论（该学科公认由某书某派奠基）
     两类都不是"本库数据推出来的"，只是把史实挂到树上。
  2. 本库实测（era.measured / node.chapters|units|hanzi）—— 取自
     curriculum.json（章数）、data/kt-sphere.json（单元数、字数），可复算。
  3. 坐标系命中（coordinates[]）—— 扫 standards/*/units.json 全文，统计
     阴阳/六经/卫气营血… 这些"坐标词"在多少个学科、多少个知识单元里出现。
     这是唯一由本库语料直接测出来的那一层，用来回答"古人的坐标系今天还在承重吗"。
     注意：学派的文本亲和度（kt-sphere 的 school/schoolHits，阈值 60 的词频判定）
     不是源流证据，本产物只当旁证陈列，不参与分期计数。
"""
from __future__ import annotations

import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STD = os.path.join(ROOT, "standards")
DEPTS = os.path.join(ROOT, "departments")

# ── 一、分期骨架 ────────────────────────────────────────────────────────────
# 采纳仓库《中国医学史》自己的分期（03-zhongguo-yixue-shi 第 2–7 章），
# 不另立一套，避免产物和教材互相打架。
ERAS = [
    {
        "id": "origin",
        "span": "远古—西周",
        "title": "起源",
        "gist": "经验先于理论",
        "shape": "没有文本，只有器物与口传：砭石、火、酒、汤液。知识以「术」的形态存在，还不能叫树。",
        "works": [
            {"name": "（无成书）", "when": "史前—西周", "note": "砭石、灸焫、汤液、酒，见《中国医学史》第2章"},
        ],
        "people": ["巫医", "医缓、医和（春秋）"],
        "empty": "本库暂无对应结点 —— 这一期只有器物与口传，没有可挂的底本。",
        "nodes": [],
    },
    {
        "id": "han",
        "span": "前770—220",
        "title": "奠基",
        "gist": "范畴成型：阴阳、五行、藏象、经脉",
        "shape": "《内经》把身体写成一张「坐标图」：阴阳是二分，五行是五分，藏象是映射表，经脉是连线。此后两千年，中医的每一次扩张都是在这张图上加坐标，而不是换一张图。",
        "works": [
            {"name": "《黄帝内经》", "when": "战国—西汉成编", "note": "素问81篇＋灵枢81篇，理论总纲"},
            {"name": "《难经》", "when": "约东汉", "note": "以问难体补《内经》之未备，独取寸口、八十一难"},
            {"name": "《神农本草经》", "when": "约东汉", "note": "365 味，三品分类——药物学的第一个分类轴"},
            {"name": "《伤寒杂病论》", "when": "约200—210", "note": "张仲景；六经辨证＋脏腑杂病，把「证」写成可判定的状态"},
        ],
        "people": ["扁鹊（秦越人）", "张仲景", "华佗"],
        "nodes": [
            {"slug": "06-neijing-xuandu", "basis": "典籍同名", "why": "《素问》《灵枢》选读"},
            {"slug": "07-shanghanlun", "basis": "典籍同名", "why": "《伤寒杂病论》伤寒部分"},
            {"slug": "08-jingui-yaolue", "basis": "典籍同名", "why": "《伤寒杂病论》杂病部分，宋人析出"},
            {"slug": "16-zhongyi-zhexue-shi", "basis": "学科史通说", "why": "阴阳五行、气一元论的思想源头在先秦两汉"},
            {"slug": "01-zhongyaoxue", "basis": "学科史通说", "why": "现代中药学的分类与性能体系承《神农本草经》三品与《本经》序例"},
            {"slug": "03-fangjixue", "basis": "学科史通说", "why": "方剂学以《伤寒论》113 方为配伍范式的原点"},
            {"slug": "01-jingluo-xue", "basis": "学科史通说", "why": "经脉学说定型于《内经》《难经》"},
        ],
    },
    {
        "id": "weijin",
        "span": "220—960",
        "title": "集成",
        "gist": "分科成书，知识从「论」变「书」",
        "shape": "单篇论述被编成可检索的专书：脉有《脉经》，穴有《甲乙经》，病源有《病源论》，方有《千金》《外台》。知识第一次有了「卷—门—方」的目录结构，也就第一次可被搬运、抄写、考试。",
        "works": [
            {"name": "《脉经》", "when": "西晋·王叔和", "note": "10 卷，24 脉，寸关尺分候脏腑"},
            {"name": "《针灸甲乙经》", "when": "西晋·皇甫谧", "note": "349 穴，按部位分部——腧穴学的第一个坐标"},
            {"name": "《诸病源候论》", "when": "隋·巢元方", "note": "1739 候，中国第一部病因病候学专著"},
            {"name": "《备急千金要方》", "when": "唐·孙思邈", "note": "30 卷，232 门，医德（大医精诚）与临床并置"},
            {"name": "《外台秘要》", "when": "唐·王焘", "note": "40 卷，1104 门，先列病候后列方，文献汇编体的成熟"},
            {"name": "《新修本草》", "when": "唐·659", "note": "国家颁行的第一部药典性本草，850 种"},
            {"name": "《雷公炮炙论》", "when": "南朝·雷斅", "note": "炮制成为独立技术门类"},
        ],
        "people": ["王叔和", "皇甫谧", "巢元方", "孙思邈", "王焘"],
        "nodes": [
            {"slug": "03-zhenjiu-yiji-xuan", "basis": "典籍同名", "why": "跨代选读：灵枢/素问/难经→甲乙经→宋金元→明清", "coupling": "跨代"},
            {"slug": "02-shuxue-xue", "basis": "学科史通说", "why": "腧穴归经与定位承《甲乙经》，宋《铜人图经》定型"},
            {"slug": "04-qigong-xue", "basis": "学科史通说", "why": "导引行气在魏晋隋唐成体系（《诸病源候论》导引法）"},
            {"slug": "08-zhongyao-paozhi-xue", "basis": "学科史通说", "why": "炮制以《雷公炮炙论》为技术起点"},
        ],
    },
    {
        "id": "songjin",
        "span": "960—1368",
        "title": "争鸣与建制",
        "gist": "国家校书、分科立科、四大家分派",
        "shape": "两件事同时发生：国家设校正医书局、编《局方》，知识第一次被「标准化出版」；同时金元四大家各自把「病机」推到一个极端，形成可辩论的立场。树从此分叉——同一棵树，长出四种解释世界的角度。",
        "works": [
            {"name": "《太平惠民和剂局方》", "when": "宋", "note": "官定成方，配伍与剂型的标准化"},
            {"name": "《铜人腧穴针灸图经》", "when": "宋·王惟一 1026", "note": "354 穴＋铸铜人，腧穴的官方定本"},
            {"name": "《小儿药证直诀》", "when": "宋·钱乙", "note": "儿科第一部专科体系书，五脏辨证"},
            {"name": "《妇人大全良方》", "when": "宋·陈自明 1237", "note": "妇科独立成科"},
            {"name": "《三因极一病证方论》", "when": "宋·陈言", "note": "三因学说：病因的第一个统一分类"},
            {"name": "刘完素·火热论", "when": "金", "note": "六气皆从火化，主寒凉"},
            {"name": "张从正·攻邪论", "when": "金", "note": "病由邪生，汗吐下三法"},
            {"name": "李杲·脾胃论", "when": "金元", "note": "内伤脾胃，百病由生；升阳益气"},
            {"name": "朱震亨·滋阴论", "when": "元", "note": "阳有余阴不足，相火妄动"},
        ],
        "people": ["钱乙", "陈自明", "刘完素", "张从正", "李杲", "朱震亨"],
        "nodes": [
            {"slug": "15-zhongyi-gejia-xueshuo", "basis": "典籍同名", "why": "各家学说：刘完素→张从正→李杲→朱震亨→张景岳→叶天士"},
            {"slug": "13-zhongyi-erke-xue", "basis": "学科史通说", "why": "儿科以钱乙《小儿药证直诀》为专科奠基"},
            {"slug": "12-zhongyi-fuke-xue", "basis": "学科史通说", "why": "妇科以陈自明《妇人大全良方》为专科奠基"},
        ],
    },
    {
        "id": "mingqing",
        "span": "1368—1911",
        "title": "温病与考据",
        "gist": "外感另立坐标，药物学变成分类学",
        "shape": "伤寒之外，吴又可到叶天士把外感病重新切了一遍：卫气营血是四层状态机，三焦是纵向病位坐标。同一批症状，换一个坐标系，治法次序就变了——这是中医史上最大的一次「范式并存」。同时《本草纲目》把 1892 种药按 16 部 60 类编目，药物学第一次有了可扩展的分类树。",
        "works": [
            {"name": "《本草纲目》", "when": "明·李时珍 1578", "note": "52 卷，16 部 60 类，1892 种"},
            {"name": "《针灸大成》", "when": "明·杨继洲 1601", "note": "针灸集大成，歌赋与手法体系化"},
            {"name": "《外科正宗》", "when": "明·陈实功 1617", "note": "外科第一部体系性专著"},
            {"name": "《温疫论》", "when": "明·吴有性 1642", "note": "戾气学说，外感病因的第一次断裂"},
            {"name": "《医宗金鉴》", "when": "清·1742", "note": "官修教材，院校教育前身"},
            {"name": "《温病条辨》", "when": "清·吴瑭 1798", "note": "三焦辨证＋上中下焦治法次序"},
            {"name": "《医林改错》", "when": "清·王清任 1830", "note": "瘀血证治，解剖纠错的第一次尝试"},
            {"name": "《本草纲目拾遗》", "when": "清·赵学敏 1765", "note": "对《纲目》的增补与纠谬"},
        ],
        "people": ["李时珍", "杨继洲", "吴有性", "叶天士", "吴瑭", "王清任"],
        "nodes": [
            {"slug": "09-wenbing-xue", "basis": "典籍同名", "why": "《温疫论》《温热论》《温病条辨》一系"},
            {"slug": "11-zhongyi-waike-xue", "basis": "学科史通说", "why": "外科体系化以《外科正宗》为标志"},
            {"slug": "05-zhongyi-wuguan-jingdian", "basis": "典籍同名", "why": "五官科经典选读（明清眼科/喉科专书）"},
        ],
    },
    {
        "id": "jindai",
        "span": "1840—1949",
        "title": "汇通与转型",
        "gist": "中西并置，理论开始被检验",
        "shape": "张锡纯「衷中参西」第一次把两套坐标系并排写进同一张方；恽铁樵、唐宗海尝试用西医术语重述中医。知识形态从「注疏」转向「论文」，为下一期的院校建制铺路。",
        "works": [
            {"name": "《医学衷中参西录》", "when": "张锡纯 1918—1934", "note": "中西药并用，重镇潜阳、大气下陷"},
            {"name": "《中西汇通医书五种》", "when": "唐宗海 1892", "note": "以西医解剖比附中医脏腑"},
            {"name": "《群经见智录》", "when": "恽铁樵 1922", "note": "首次系统回应「中医是否科学」"},
        ],
        "people": ["张锡纯", "唐宗海", "恽铁樵", "裘吉生", "曹炳章"],
        "empty": "本库已有独立学科：2026-11 起《医学衷中参西录选读》（10 章 / 534 单元）承载该期，不再是「有底本、无课程」。",
        "nodes": [
            {"slug": "03-zhongguo-yixue-shi", "basis": "学科史通说", "why": "通史载体：八章即八期，不给任何单期记功", "coupling": "跨代"},
            {"slug": "23-zhongcan-xilu-xuandu", "basis": "典籍同名", "why": "《医学衷中参西录》唯一课程载体：五类各取代表作，10 章 534 单元"},
        ],
    },
    {
        "id": "dangdai",
        "span": "1956—今",
        "title": "建制与数字化",
        "gist": "教材化、实验化，本库即此期的产物",
        "shape": "1956 年四所中医学院成立，1962 年统编教材把「经典」切成课程；此后实验针灸、中药药理、循证、AI 逐层叠加。今天这棵树上 90% 的枝条是这一期长出来的，但它们的根系全部指向前面五期的坐标。",
        "works": [
            {"name": "统编教材体系", "when": "1956—今", "note": "把典籍拆成《中基》《中诊》《中药》《方剂》等课程模块"},
            {"name": "实验针灸学 / 中药药理", "when": "1960s—", "note": "把针灸与方药送进实验室"},
            {"name": "本库 tcmai", "when": "2025—2026", "note": "3432 万字底本、19580 个知识单元——本期知识的工程化沉淀"},
        ],
        "people": [],
        "empty": "本期不是没有结点，而是结点太多：170 门建制学科、15,802 个知识单元长在这一期，见下方「根系与冠层」。",
        "nodes": [],
    },
]

# 分期落点：哪些学科是该期典籍的直接载体（全部在 ERAS[].nodes 里，这里只做校正表）
CANON_SLUGS = {
    "06-neijing-xuandu", "07-shanghanlun", "08-jingui-yaolue",
    "16-zhongyi-zhexue-shi", "01-zhongyaoxue", "03-fangjixue", "01-jingluo-xue",
    "03-zhenjiu-yiji-xuan", "02-shuxue-xue", "04-qigong-xue", "08-zhongyao-paozhi-xue",
    "15-zhongyi-gejia-xueshuo", "13-zhongyi-erke-xue", "12-zhongyi-fuke-xue",
    "09-wenbing-xue", "11-zhongyi-waike-xue", "05-zhongyi-wuguan-jingdian",
    "03-zhongguo-yixue-shi", "23-zhongcan-xilu-xuandu",
}

# ── 二、坐标系词表 ──────────────────────────────────────────────────────────
# 每个坐标按「写法族」统计：一个坐标系在正文里往往不写真名（《伤寒论》通篇写
# 「太阳病/阳明病」，几乎不出现「六经」二字），只数真名会把补进来的底本全数漏掉。
# 成员词逐条列出、在页面上公开，读者可自行复核口径。
COORDINATES = [
    ("阴阳", "han", "《内经》二分坐标", ["阴阳"]),
    ("五行", "han", "《内经》五分坐标", ["五行"]),
    ("藏象", "han", "脏腑功能映射表", ["藏象", "五脏", "六腑"]),
    ("六经", "han", "《伤寒论》状态机", ["六经", "太阳病", "阳明病", "少阳病", "太阴病", "少阴病", "厥阴病"]),
    ("卫气营血", "mingqing", "叶天士四层状态机", ["卫气营血", "卫分", "气分", "营分", "血分"]),
    ("三焦", "mingqing", "吴瑭纵向病位坐标", ["三焦", "上焦", "中焦", "下焦"]),
    ("八纲", "mingqing", "阴阳表里寒热虚实的二维表", ["八纲"]),
    ("气血津液", "han", "物质层坐标", ["气血津液", "气血", "津液"]),
    ("经络", "han", "体表连线坐标", ["经络", "经脉", "络脉"]),
    ("脏腑辨证", "han", "病位坐标的临床化", ["脏腑辨证", "脏腑"]),
    # 汇通期（1840—1949）唯一的实测坐标。成员词只取清末旧译写法：
    # 「西医/西药/化合/氧气/蛋白质/血管/解剖」在现代教材里是日常词汇（泄漏 3,240/625/454/… 次），
    # 拿它们当坐标会把《解剖学》算成会通之作。真正的判别词是 西人·泰西·原质·养气·炭气·铁锈。
    ("参西", "jindai", "张锡纯汇通坐标（清末旧译写法，仅文献层）",
     ["西人", "泰西", "原质", "养气", "炭气", "轻气", "淡气", "脑筋", "铁锈", "微丝"]),
]

DEPT_TITLES = {}
SKIP_STD = {"__crossrefs.json"}

# 典籍结点 → standards/ 下的底本目录（不是 1:1，slug 是课程名，目录是底本名）
STD_MAP = {
    "07-shanghanlun": ["shanghan"],
    "08-jingui-yaolue": ["jingui"],
    # 中药学有两套底本：zhongyao 放原文/药物库（无 units），zhongyao-xue 放切好的单元层
    "01-zhongyaoxue": ["zhongyao-xue", "zhongyao"],
    "03-fangjixue": ["fangji"],
    "09-wenbing-xue": ["wenbing"],
    "08-zhongyao-paozhi-xue": ["zhongyao-paozhi"],
    "13-zhongyi-erke-xue": ["erke"],
}
RAW_MARKERS = ("底本.json", "底本.md", "source.html", "drugs.json", "formulas.json", "semtensor-398.json")


def load_json(path):
    with io.open(path, encoding="utf-8") as f:
        return json.load(f)


def subject_index():
    """slug → {title, dept, chapters, units, hanzi, school, schoolHits}"""
    sphere = load_json(os.path.join(ROOT, "data", "kt-sphere.json"))
    depts = {d["slug"]: d["title"] for d in sphere["depts"]}
    cur = load_json(os.path.join(ROOT, "curriculum.json"))
    # curriculum 里 subject 是元组数组，顺序见 subjectTuple
    order = cur.get("subjectTuple", [])
    out = {}
    for s in sphere["subjects"]:
        dept_slug = cur["departments"][s["d"]]["slug"]
        out[s["slug"]] = {
            "title": s["title"],
            "dept": depts.get(dept_slug, cur["departments"][s["d"]]["title"]),
            "deptSlug": dept_slug,
            "chapters": s["chapters"],
            "units": s["units"],
            "hanzi": s["hanzi"],
            "school": s.get("school", "none"),
            "schoolHits": s.get("schoolHits", 0),
            "sem": s.get("sem"),
        }
    assert order, "curriculum.subjectTuple missing"
    return out, sphere


def chapter_titles(dept_slug, slug, limit=12):
    p = os.path.join(DEPTS, dept_slug, slug, "chapters.json")
    if not os.path.exists(p):
        return []
    try:
        d = load_json(p)
    except Exception:
        return []
    chs = d.get("chapters", d) if isinstance(d, dict) else d
    out = []
    for c in chs:
        if not isinstance(c, dict):
            continue
        t = c.get("title") or c.get("name") or ""
        if t:
            out.append(t)
    return out[:limit]


def scan_coordinates():
    """扫 standards/*/units.json 正文，统计坐标词覆盖的学科数与单元数。"""
    stats = {t: {"subjects": 0, "units": 0, "hits": 0, "subjectsWith": []} for t, _, _, _ in COORDINATES}
    scanned_units = 0
    scanned_dirs = 0
    for name in sorted(os.listdir(STD)):
        d = os.path.join(STD, name)
        if not os.path.isdir(d) or name.startswith("_") or name.startswith("."):
            continue
        up = os.path.join(d, "units.json")
        if not os.path.exists(up):
            continue
        try:
            data = load_json(up)
        except Exception:
            continue
        units = data.get("units") or []
        scanned_dirs += 1
        per_subject = {t: 0 for t, _, _, _ in COORDINATES}
        for u in units:
            # 两种写法都要接手：一半学科只写 body，只查 rawBody 会静默漏掉 7,849 个单元
            body = u.get("rawBody") or u.get("body") or ""
            if not body:
                continue
            scanned_units += 1
            for term, _, _, members in COORDINATES:
                n = sum(body.count(m) for m in members)
                if n:
                    per_subject[term] += n
                    stats[term]["units"] += 1
                    stats[term]["hits"] += n
        for term, n in per_subject.items():
            if n:
                stats[term]["subjects"] += 1
                stats[term]["subjectsWith"].append(name)
    top = {}
    for term, s in stats.items():
        top[term] = s["subjectsWith"][:8]
        s["subjectsWith"] = len(s["subjectsWith"])
    return stats, scaled(scanned_units), scanned_dirs


def scaled(n):
    return n


def main():
    idx, sphere = subject_index()

    # 语料扫描（33M 字，几秒）
    sys.stdout.write("scanning standards/*/units.json ...\n")
    sys.stdout.flush()
    coords, scanned_units, scanned_dirs = scan_coordinates()

    # 分期节点：补标题、章数、单元、字数、章标题
    seen = set()
    for era in ERAS:
        for node in era["nodes"]:
            slug = node["slug"]
            meta = idx.get(slug)
            if not meta:
                node.update({"missing": True, "title": slug, "chapters": 0, "units": 0, "hanzi": 0})
                continue
            seen.add(slug)
            node.update({
                "title": meta["title"],
                "dept": meta["dept"],
                "chapters": meta["chapters"],
                "units": meta["units"],
                "hanzi": meta["hanzi"],
                "school": meta["school"],
                "schoolHits": meta["schoolHits"],
                "detail": chapter_titles(meta["deptSlug"], slug),
            })
        for node in era["nodes"]:
            node.setdefault("coupling", "断代")
        span_nodes = [n for n in era["nodes"] if n["coupling"] != "跨代"]
        cross_nodes = [n for n in era["nodes"] if n["coupling"] == "跨代"]
        era["measured"] = {
            "subjects": len(span_nodes),
            "chapters": sum(n.get("chapters", 0) for n in span_nodes),
            "units": sum(n.get("units", 0) for n in span_nodes),
            "hanzi": sum(n.get("hanzi", 0) for n in span_nodes),
        }
        era["bottoms"] = []
        era["cross"] = {
            "subjects": len(cross_nodes),
            "chapters": sum(n.get("chapters", 0) for n in cross_nodes),
            "units": sum(n.get("units", 0) for n in cross_nodes),
            "hanzi": sum(n.get("hanzi", 0) for n in cross_nodes),
        }

    # 未挂课底本：单元已切分、但没有对应课程学科（当前只有汇通期的《医学衷中参西录》）。
    # 这类东西不进「学科」计数，但必须让读者看见它在库里，否则「汇通期 0 结点」会被误读成「库里没有」。
    used_std = {s.get("std") for s in sphere["subjects"] if s.get("std")}
    unattached = []
    for name in sorted(os.listdir(STD)):
        up = os.path.join(STD, name, "units.json")
        if not os.path.exists(up) or name in used_std:
            continue
        try:
            U = load_json(up)
        except Exception:
            continue
        c = U.get("counts") or {}
        if c.get("units"):
            unattached.append({"dir": name, "units": c["units"], "hanzi": c.get("hanzi", 0),
                               "chapters": c.get("chapters", 0)})

    # 未挂课底本挂到它所属的断代（目前只有汇通期的《医学衷中参西录》）
    BOTTOM_ERA = {"zhongcan-xilu": "jindai"}
    BOTTOM_TITLES = {"zhongcan-xilu": "医学衷中参西录"}
    for u in unattached:
        eid = BOTTOM_ERA.get(u["dir"])
        if eid:
            for era in ERAS:
                if era["id"] == eid:
                    era["bottoms"].append({
                        **u,
                        "title": BOTTOM_TITLES.get(u["dir"], u["dir"]),
                        "note": "底本已入库、单元已切分，尚无课程载体",
                    })

    # 现代建制：不在分期节点里的学科
    modern = [s for s, m in idx.items() if s not in seen]
    modern_measured = {
        "subjects": len(modern),
        "chapters": sum(idx[s]["chapters"] for s in modern),
        "units": sum(idx[s]["units"] for s in modern),
        "hanzi": sum(idx[s]["hanzi"] for s in modern),
    }

    # 学派：作为旁证陈列（文本亲和，不是源流）
    schools = []
    for sch in sphere["schools"]:
        key = None
        # sphere 的 schools 没有 key 字段时按 name 前缀匹配 subject.school 值
        for s, m in idx.items():
            pass
        schools.append({
            "name": sch["name"],
            "dynasty": sch["dynasty"],
            "claim": sch["claim"],
        })

    coord_rows = []
    for term, era_id, note, members in COORDINATES:
        s = coords[term]
        coord_rows.append({
            "term": term,
            "era": era_id,
            "note": note,
            "members": members,
            "subjects": s["subjects"],
            "units": s["units"],
            "hits": s["hits"],
        })
    coord_rows.sort(key=lambda r: -r["units"])

    # 缺口：分成"原文在库未切单元"与"底本目录缺席"两类——二者的补法完全不同。
    bottoms = {"withUnits": [], "rawOnly": [], "none": []}
    for era in ERAS:
        for n in era["nodes"]:
            std_dirs = STD_MAP.get(n["slug"]) or []
            std_dir = next((d for d in std_dirs if os.path.exists(os.path.join(STD, d, "units.json"))), None)
            entry = {
                "title": n.get("title"),
                "slug": n["slug"],
                "era": era["title"],
                "chapters": n.get("chapters", 0),
                "coupling": n.get("coupling"),
            }
            if std_dir and os.path.exists(os.path.join(STD, std_dir, "units.json")):
                entry["dir"] = std_dir
                bottoms["withUnits"].append(entry)
            elif std_dir and os.path.isdir(os.path.join(STD, std_dir)):
                files = sorted(os.listdir(os.path.join(STD, std_dir)))
                entry["dir"] = std_dir
                entry["has"] = [f for f in files if f in RAW_MARKERS]
                bottoms["rawOnly"].append(entry)
            else:
                bottoms["none"].append(entry)

    empty_eras = [{"id": e["id"], "title": e["title"], "span": e["span"]}
                  for e in ERAS if e["measured"]["subjects"] == 0]
    thin_coords = [{"term": r["term"], "units": r["units"], "subjects": r["subjects"]}
                   for r in coord_rows if r["units"] < 100]

    gaps = {
        "bottoms": bottoms,
        "emptyEras": empty_eras,
        "thinCoords": thin_coords,
        "note": "原文在库、但没切成 units.json 的，单元层为 0——它们不是「没内容」，而是没进统计口径；"
                "底本目录缺席的，才是真要补源。坐标系命中偏低处，须先看这两类缺口，再谈术语稀疏。",
    }

    out = {
        "generated": "scripts/build_kt_history.py",
        "basis": {
            "spine": "仓库《中国医学史》(03-zhongguo-yixue-shi) 第2–7章的分期",
            "node_basis": ["典籍同名", "学科史通说"],
            "measured": "curriculum.json 章数 + data/kt-sphere.json 单元/字数",
            "coordinates": "standards/*/units.json 全量正文字数命中",
            "not_evidence": "kt-sphere 的 school/schoolHits 是术语词频（阈值60），只作旁证",
        },
        "eras": ERAS,
        "coordinates": coord_rows,
        "corpus": {
            "scannedDirs": scanned_dirs,
            "scannedUnits": scanned_units,
            "totalUnits": sphere["totals"]["units"],
            "totalHanzi": sphere["totals"]["hanzi"],
            "totalSubjects": sphere["totals"]["subjects"],
            "totalChapters": sphere["totals"]["chapters"],
        },
        "modern": modern_measured,
        "schools": schools,
        "unattached": unattached,
        "gaps": gaps,
        "totals": {
            "canonSubjects": len(seen),
            "canonChapters": sum(idx[s]["chapters"] for s in seen),
            "eras": len(ERAS),
        },
    }

    dst = os.path.join(ROOT, "data", "kt-history.json")
    text = json.dumps(out, ensure_ascii=False, indent=1)
    check = "--check" in sys.argv
    if check:
        old = io.open(dst, encoding="utf-8").read() if os.path.exists(dst) else ""
        if old == text:
            print("kt-history.json 与重建结果一致 ✓")
            return 0
        print("DRIFT data/kt-history.json 与重建结果不一致 —— 请跑 npm run kt:history")
        return 1
    with io.open(dst, "w", encoding="utf-8") as f:
        f.write(text)
    print("saved", dst, round(os.path.getsize(dst) / 1024, 1), "KB")
    print("canon subjects", len(seen), "of", len(idx))
    for era in ERAS:
        m = era["measured"]
        print(f"  {era['span']:>12}  {era['title']:<6} 节点{m['subjects']:>3}  章{m['chapters']:>5}  单元{m['units']:>6}  字{m['hanzi']:>9}")
    print(f"  {'现代建制':>12}  {'':<6} 节点{modern_measured['subjects']:>3}  章{modern_measured['chapters']:>5}  单元{modern_measured['units']:>6}  字{modern_measured['hanzi']:>9}")
    print("coordinates:", ", ".join(f"{r['term']}{r['units']}单元" for r in coord_rows[:5]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
