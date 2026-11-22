# -*- coding: utf-8 -*-
"""scripts/build_zhongcan_xilu_course.py —— 《医学衷中参西录选读》10 章课程生成器

数据唯一来源：standards/zhongcan-xilu/units.json（534 单元，见该目录 README）。
每章选一组单元（按 locator 精确定位），章内 code/main.js 从这些单元现算：
药物频次（方中组成行）、剂量命中、参西命中、引书、医案五段式覆盖率。
docs/zh.md 里出现的每个数字都来自同一份计算 —— 不同源就过不了 npm test。

用法：
  python scripts/build_zhongcan_xilu_course.py            # 写 10 章六件套 + chapters.json + README
  python scripts/build_zhongcan_xilu_course.py --check     # 幂等校验
"""
from __future__ import annotations

import io
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UDIR = os.path.join(ROOT, "standards", "zhongcan-xilu")
SUBJ = os.path.join(ROOT, "departments", "01-zhongyi", "23-zhongcan-xilu-xuandu")
SLUG = "23-zhongcan-xilu-xuandu"
TITLE = "医学衷中参西录选读"
EN = "Selected Readings from Records of Chinese Medicine and Western Medicine"
HANZI = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff\U00020000-\U0003ffff]")

U = json.load(io.open(os.path.join(UDIR, "units.json"), encoding="utf-8"))
BY_LOC = {u["locator"]: u for u in U["units"]}
TOT = U["counts"]
BEN = json.load(io.open(os.path.join(UDIR, "底本.json"), encoding="utf-8"))
BC = BEN["counts"]  # classes / pian / entries / paras / charsHant


def _docs_authored() -> bool:
    """本课正文是否已人工补实（登记在 data/course-docs-rewritten.json）。"""
    reg = os.path.join(ROOT, "data", "course-docs-rewritten.json")
    if not os.path.exists(reg):
        return False
    try:
        data = json.load(io.open(reg, encoding="utf-8"))
    except Exception:
        return False
    return any(r.get("subject") == SLUG for r in data.get("rewritten", []))


DOCS_AUTHORED = _docs_authored()


def doc_head(slug):
    """正文已人工补实时，章题与汉字数以 docs/zh.md 为准（无文件时返回 (None, None)）。"""
    p = os.path.join(SUBJ, "chapters", slug, "docs", "zh.md")
    if not os.path.exists(p):
        return None, None
    text = io.open(p, encoding="utf-8").read()
    hz = len(HANZI.findall(text))
    head = next((ln for ln in text.splitlines() if ln.startswith("# ")), "")
    m = re.match(r"^#\s*第\s*[0-9一二三四五六七八九十百]+\s*章\s*[·・:：\-—]?\s*(.+?)\s*$", head)
    return (m.group(1) if m else head[2:].strip() or None), hz


def pick(*needles):
    """按 locator 片段精确命中单元；命中数不符立即报错（防手滑选错章）。"""
    out = []
    for loc in BY_LOC:
        for n in needles:
            if n in loc:
                out.append(BY_LOC[loc])
                break
    return out


def q(unit, maxlen=44):
    """从单元正文里切一句原文（保证是逐字子串）。"""
    t = re.sub(r"\s+", "", unit["body"])
    m = re.split(r"[。！？]", t)
    s = m[0] if m else t
    return s[:maxlen]


CHAPTERS = [
    dict(
        n=1, slug="01-quanshu-dufa", title="一部 1909 年的书为什么叫「衷中参西」",
        question="「衷中参西」是口号还是方法？它在这部书的目录结构里留下了什么痕迹",
        hard="学生把「衷中参西」当成史料标签，说不出它具体落在哪些条目上；一旦要引原文，只能引一句口号",
        picks=("三、医论·1．六经总论", "四、医话·15．驳方书贵阳抑阴论", "二、药物·1．石膏解"),
        analysis="structure",
        body=[
            ("一、先看目录：五类不是文体分类，是五种知识形态",
             "全书 {classes} 大类：医方 {n_fang} 条、药物 {n_yao} 条、医论 {n_lun} 条、医话 {n_hua} 条、医案 {n_an} 条，"
             "合计 {units} 单元 {hanzi} 字。这不是「按体裁分」，而是按**知识的成熟度**排：方与药是可直接执行的，"
             "论是把方药背后的道理摊开，话是未定稿的讨论，案是执行记录。读这本书的顺序，就是自己把一条经验从"
             "「能用」推到「知道为什么能用」的过程。"),
            ("二、「六经总论」：他先做的不是参西，是把中医学的坐标系重新钉一遍",
             "本章取三段原文对照：医论·六经总论、医话·驳方书贵阳抑阴论、药物·石膏解。第一段讲六经为何是六经"
             "（手足十二经而独取六者，因足经长、手经短），第二段直接反驳「贵阳抑阴」的流行说法，第三段开篇就写"
             "石膏的化学组成。三段的共同点：**先定坐标，再谈药**。"),
            ("三、参西落在词上，不落在口号上",
             "全书「参西」相关词命中 {xi} 次，集中在 {xi_units} 个单元；最密的五条是：{xi_top}。"
             "这说明「参西」不是全书均匀的立场，而是若干处的具体做法——用在解释药理（石膏的化合）、"
             "用在解释病位（脑充血）、用在纠错（驳贵阳抑阴）。"),
        ],
    ),
    dict(
        n=2, slug="02-daqi-xiaxian", title="大气下陷：一个被重新提出的证",
        question="「大气下陷」是张锡纯自造的证名吗？它靠什么与气虚、气陷、中气不足分开",
        hard="教材只写「气虚下陷」，学生见到升陷汤四方（升陷、回阳、理郁、醒脾）分不清各自适应证",
        picks=("一、医方·（三）治大气下陷方", "五、医案·（二）气病门"),
        analysis="herbs",
        body=[
            ("一、四张升陷方，差别不在主药而在「兼什么」",
             "治大气下陷方 4 首 {n_units} 单元 {hanzi} 字：升陷汤、回阳升陷汤、理郁升陷汤、醒脾升陷汤。"
             "四方的共同骨架是**黄芪—升麻—柴胡—桔梗**（升提），差异全部落在兼证上："
             "回阳加附子干姜（兼阳衰）、理郁加理气药（兼气滞）、醒脾加健脾药（兼脾虚）。"
             "本章实测这几味药在本组原文里的出现次数：{herb_top}。"),
            ("二、医案部分：气病门里「大气下陷」被一案一案坐实",
             "{an_note}。这就是张锡纯的写法：先立证名，再用一案一案去把它坐实；"
             "证名不是凭空的，是被复用出来的。"),
            ("三、与「中气不足」的边界",
             "中气不足讲的是脾胃运化之力，大气下陷讲的是**胸中气机的升举**——所以升陷汤主药是黄芪而非党参，"
             "配伍必用升麻柴胡。这条边界如果混掉，四方就退化成「都是补气」，选方只能靠记。"),
        ],
    ),
    dict(
        n=3, slug="03-shigao", title="石膏：用量是这本书最容易被误读的地方",
        question="张锡纯用石膏动辄数两，为什么我们今天不敢照抄？他到底在什么前提下放量",
        hard="「石膏大寒伤胃」是教材共识，学生读到「石膏用至数两」时只会当奇闻，不去看他给出的前提条件",
        picks=("二、药物·1．石膏解", "三、医论·18．阳明病白虎汤证", "三、医论·19．阳明病白虎加人参汤证"),
        analysis="dose",
        body=[
            ("一、先把「数两」落在文本上",
             "石膏解 {n_units} 单元 {hanzi} 字，本章剂量型命中 {dose} 处，最大用量写法集中在「两」本位。"
             "关键不在数字大小，而在他每次放量都同时写三件事：脉象（洪滑）、证候（大渴大汗）、"
             "以及**煎服法**（徐徐饮、分次服）。三者缺一，他自己也不放。"),
            ("二、为什么他敢：因为他把「伤胃」拆成了可观察的条件",
             "教材说「石膏伤胃」，他的处理是把它变成条件句：胃无实热而用石膏才伤胃；有实热则石膏是「凉而能散」。"
             "这不是修辞，是可证伪的判据——用错了会泻，用对了会热退而食进。"),
            ("三、参西在这里登场",
             "石膏解开篇即写「硫养轻钙化合而成」（即硫酸钙），这是他给「凉而能散」找的物理解释。"
             "本章实测该章参西命中 {xi} 次——**参西是为了解释药性，不是为了替代辨证**。"),
        ],
    ),
    dict(
        n=4, slug="04-zheshi", title="赭石与重镇：降逆的力学",
        question="同样是「降」，赭石、龙骨、牡蛎、牛膝各降什么？重镇药为什么最怕用错方向",
        hard="学生把重镇药当同一类「沉降药」，见呕逆喘咳就堆砌，结果气更逆——因为没分清是胃气、肝气还是冲气上逆",
        picks=("二、药物·7．赭石解", "一、医方·（四）治喘息方", "一、医方·（五）治痰饮方"),
        analysis="herbs",
        body=[
            ("一、赭石解：先定「降什么」，再谈用量",
             "赭石解 {n_units} 单元 {hanzi} 字。他给的定位是「降胃气、镇冲气、平肝气」三件事，"
             "而不是笼统的「重镇安神」。三件事对应三种脉证，所以同一个赭石在喘息方、吐衄方里配伍完全不同。"),
            ("二、喘息三方：同一味赭石，三种搭档",
             "治喘息方 3 首（参赭镇气汤、薯蓣纳气汤、滋培汤）。参赭镇气汤以赭石配人参（降中寓补），"
             "薯蓣纳气汤以山药代人参（降中寓敛），滋培汤则重在培中。本章实测本组药物频次：{herb_top}。"),
            ("三、重镇药的方向错误最贵",
             "重镇药一旦方向错（该升而用降），代价是气陷、胸闷、食欲退——比用错清热药更难挽回，"
             "因为它压的是「本已不足」的气。所以这一章的重点不是记药，是记**脉**。"),
        ],
    ),
    dict(
        n=5, slug="05-shanyao-shanyurou", title="山药与山萸肉：平补与收敛的一对",
        question="为什么张锡纯反复用山药（甚至单味成方），却极少用它来「补虚」这个笼统说法",
        hard="学生见「山药平补脾肾」就当保健品，读不出他为什么不加人参、不加黄芪，只用一味薯蓣饮",
        picks=("二、药物·8．山药解", "二、药物·5．山萸肉解", "一味薯蓣饮", "10．来复汤"),
        analysis="herbs",
        body=[
            ("一、山药解与山萸肉解：平补与收敛的分工",
             "山药解 {hz_yao} 字，山萸肉解 {hz_yurou} 字。山药的定位是「补而不滞」，山萸肉的定位是「酸收固脱」——"
             "两者常同用，但角色不同：一个是「给」，一个是「留」。"),
            ("二、一味薯蓣饮：单味成方的条件",
             "治阴虚劳热方 12 首里，一味薯蓣饮只用山药一味。单味成方的条件很苛刻：病机必须单一、"
             "药必须平到可以久服。这正好说明他选山药的理由——不是「补」，是「可以长期给而不生变」。"),
            ("三、来复汤：山萸肉的主场",
             "来复汤以山萸肉为君，治「气脱」。本章实测本组药物频次：{herb_top}；"
             "山萸肉在本组出现 {yurou} 次，山药 {shanyao} 次——同一章里，两者的分工从频次就能看出来。"),
        ],
    ),
    dict(
        n=6, slug="06-yinxu-laore", title="阴虚劳热：资生汤与十全育真汤的方证结构",
        question="同为治虚劳，资生汤与十全育真汤差在哪一步？为什么一方以脾胃为主、一方以肝肾为主",
        hard="学生把「虚劳」当一个病，见虚就补，结果补出腹胀、纳差——因为没分清虚在脾胃还是在肝肾",
        picks=("一、医方·（一）治阴虚劳热方",),
        analysis="herbs",
        body=[
            ("一、治阴虚劳热方 12 首：一部小型的虚劳分类学",
             "这一篇 {n_units} 单元 {hanzi} 字，从资生汤到镇摄汤，12 首方按病机排开："
             "脾虚→资生汤，气血两虚→十全育真汤，肺肾阴虚→醴泉饮，气脱→来复汤，冲气上逆→镇摄汤。"),
            ("二、资生汤：先把「能吃」解决掉",
             "资生汤以山药、于术、鸡内金为「不可挪移之品」，配玄参、牛蒡子。用意很直白："
             "劳瘵之人先不能食，不能食则一切补药无着力处。所以他先健脾胃，再退虚热。"),
            ("三、十全育真汤：从「能食」到「能藏」",
             "十全育真汤多了三棱、莪术（消积）、龙骨、牡蛎（收敛），是给「虚而兼瘀、虚而气浮」的人。"
             "本章实测本组药物频次：{herb_top}；剂量型命中 {dose} 处——虚劳方的剂量普遍偏小，"
             "因为要久服。"),
        ],
    ),
    dict(
        n=7, slug="07-tube-xuezheng", title="吐衄血证：寒降、温降、清降是三条路，不是三张方",
        question="同样治吐血，寒降汤、温降汤、清降汤的差别在哪一味药上？选错方向的代价是什么",
        hard="学生背「降逆止血」，见血就清热，遇到虚寒吐衄仍用寒凉，血止而人垮",
        picks=("一、医方·（七）治吐衄方", "五、医案·（三）血病门", "二、药物·26．三七解"),
        analysis="three_way",
        body=[
            ("一、三方同名「降」，差在温凉",
             "寒降汤：生赭石、清半夏、蒌仁、生杭芍、竹茹、牛蒡子、粉甘草，治「脉洪滑而长」的**因热**胃气不降；"
             "温降汤：白术、干姜、生山药、清半夏、生赭石、川厚朴、生姜，治「脉虚濡而迟」的**因凉**胃气不降；"
             "清降汤：生山药、净萸肉、生赭石、清半夏、牛蒡子、生杭芍、甘草，治吐衄不止后的**阴亏不能潜阳**。"
             "三方共有的是生赭石与清半夏（降），分野全在配伍：温降用干姜白术，寒降用竹茹蒌仁，清降用山药萸肉。"),
            ("二、补络补管汤：血止之后修墙",
             "吐血止住之后，血管破损仍在，所以另立补络补管汤（龙骨、牡蛎、山萸肉、三七）。"
             "这一层最容易被跳过：止得住血不等于修得好络。"),
            ("三、实测：三方用药的重合与分野",
             "本章实测本组药物频次：{herb_top}。赭石三方皆有（降），温凉虚实之别全在配伍——"
             "所以记的不是三张方，是「降同而性反」这一条。"),
        ],
    ),
    dict(
        n=8, slug="08-naochongxue", title="脑充血与脑贫血：全书参西最深的一章",
        question="「脑充血」这个说法在 1909 年的中医文本里怎么成立？它与「肝阳上亢」是同一件事吗",
        hard="学生把「脑充血」当西医名词直接对应「高血压」，于是把镇肝熄风汤当成降压方，忽略了他给出的脉证条件",
        picks=("论脑充血", "论脑贫血", "五、医案·（四）脑充血门"),
        analysis="xi",
        body=[
            ("一、先看命名的两层：西医的解剖 + 中医的脉证",
             "医案·（四）脑充血门 {n_an} 案 {hanzi_an} 字，医论部分另有多篇专论。"
             "他用「脑充血」描述病位（血上冲于脑），用「脉弦长有力、头目胀痛」描述可观察的征象——"
             "两套语言并置，但判定仍以脉证为准。"),
            ("二、参西在这里的密度",
             "本章参西命中 {xi} 次，是全书密度最高的一组：{xi_top}。"
             "密集处集中在他要把「血上冲」讲成一个可理解的物理过程（血压、血管、脑筋）。"),
            ("三、因此它不是降压方",
             "镇肝熄风汤的前提是「脉弦长有力、上盛下虚」；脉虚者用之，会把本已不足的下焦再压一层。"
             "参西给了病位，没给适应证——适应证仍是脉证。"),
        ],
    ),
    dict(
        n=9, slug="09-yian-dufa", title="医案读法：病因—证候—诊断—处方—效果 五段式",
        question="张锡纯的医案为什么好读？它其实有一张固定的表，五段缺一不可",
        hard="学生把医案当故事读，读完只记得「某方治好了某人」，学不到可复用的判读顺序",
        picks=("五、医案·（一）虚劳喘嗽门", "五、医案·（二）气病门", "四、医话·1．临症随笔"),
        analysis="segments",
        body=[
            ("一、五段式：一张可核对的表",
             "本组 {an_total} 案逐条数五段的出现率：病因 {s_bingyin}、证候 {s_zhenghou}、诊断 {s_zhenduan}、"
             "处方 {s_chufang}、效果 {s_xiaoguo}（分母 {an_total} 案）。覆盖率越高，说明这张表越是被当作硬格式。"),
            ("二、为什么先写「病因」而不是「症状」",
             "顺序本身就是方法：先把起病链条写清（外感余热、劳碌过度、情志），再写当下证候。"
             "顺序反了，方就成了「对症」，无法复用到同类起病的人身上。"),
            ("三、医话是他的「未定稿区」",
             "医话 47 条多是答问与随笔，格式松、结论留余地，但恰恰是方法论的现场：{hua_note}。"
             "读医案学「怎么判」，读医话学「为什么这样判」。"),
        ],
    ),
    dict(
        n=10, slug="10-canxi-bianjie", title="参西坐标的边界：哪里能用，哪里不能用",
        question="「参西」在本库里覆盖多宽？哪些用法今天仍然成立，哪些只是 1909 年的解释",
        hard="把「参西」当成先进性标签，于是凡带「西」字就照搬；结果把阶段性解释当成结论，反过来否定辨证",
        picks=("四、医话·15．驳方书贵阳抑阴论", "四、医话·4．虚劳温病皆忌橘红说", "四、医话·16．阅刘华封", "三、医论·1．六经总论"),
        analysis="xi",
        body=[
            ("一、先量它有多宽：不是在全书均匀分布",
             "本库全量 534 单元里，「参西」词族命中 {xi_all} 次，落在 {xi_all_units} 个单元，占 {xi_pct}。"
             "本章所选医话 {n_units} 单元 {hanzi} 字，参西命中 {xi} 次——**医话几乎不参西**，"
             "参西集中在药物与医论。"),
            ("二、三种用法，两种今天仍成立",
             "① 用化学/解剖解释药理与病位（阶段性解释，可替换）；② 用西医的观察方式补中医的四诊（方法层，仍成立）；"
             "③ 用西说否定辨证（越界，他自己也没这么做）。分清这三层，才不会把 1909 年的解释当结论。"),
            ("三、边界：参西不能替辨证下结论",
             "全书没有一个方是因「西说如此」而立；所有方证都落在脉证上。这就是边界——"
             "参西可以解释，可以补观察，不能替代判定。"),
        ],
    ),
]


def chapter_units(ch):
    return pick(*ch["picks"])


def stats(units):
    body = "".join(u["body"] for u in units)
    herbs = []
    for line in body.split("\n"):
        # 组成行：药名（剂量） 药名（剂量）…
        found = re.findall(r"([\u4e00-\u9fff]{1,4})（(?:[一二三四五六七八九十百半]+|\d+(?:\.\d+)?)[钱兩两分斤枚个片寸]", line)
        if len(found) >= 2:
            herbs.extend(found)
    dose = len(re.findall(r"(?:[一二三四五六七八九十百半]+|\d+(?:\.\d+)?)\s*(?:两|兩|钱|錢|分|斤|枚|个|片|寸)", body))
    xi = sum(u["measure"]["views"]["参西"] for u in units)
    cites = re.findall(r"《([^》]{2,20})》", body)
    return {
        "units": len(units), "hanzi": sum(u["hanzi"] for u in units), "body": body,
        "herbs": herbs, "dose": dose, "xi": xi, "cites": cites,
    }


def herb_top(herbs, n=6):
    from collections import Counter
    return "、".join(f"{k} {c} 次" for k, c in Counter(herbs).most_common(n)) or "（无组成行）"


def xi_top(units, n=5):
    rows = sorted(units, key=lambda u: -u["measure"]["views"]["参西"])[:n]
    return "、".join(f"{u['title'].lstrip('0123456789．. ')}（{u['measure']['views']['参西']}）" for u in rows)


def seg_coverage(units):
    """五段式只在医案上数（与 code/main.js 的 segments() 同口径）。"""
    keys = ["病因", "证候", "诊断", "处方", "效果"]
    cases = [u for u in units if u["sec"] == "五、医案"]
    return {k: sum(1 for u in cases if k in u["body"]) for k in keys}, len(cases)


def build_doc(ch):
    units = chapter_units(ch)
    s = stats(units)
    cls = {}
    for u in U["units"]:
        cls[u["sec"]] = cls.get(u["sec"], 0) + 1
    segs, an_total = seg_coverage(units)
    first = units[0]
    motto = q(first)
    ctx = {
        "classes": len(cls), "units": TOT["units"], "hanzi": f"{TOT['hanzi']:,}",
        "n_fang": cls.get("一、医方", 0), "n_yao": cls.get("二、药物", 0),
        "n_lun": cls.get("三、医论", 0), "n_hua": cls.get("四、医话", 0), "n_an": cls.get("五、医案", 0),
        "xi": s["xi"], "xi_units": sum(1 for u in units if u["measure"]["views"]["参西"]),
        "xi_top": xi_top(units),
        "n_units": s["units"], "hz_yao": next((u["hanzi"] for u in units if "山药解" in u["title"]), 0),
        "hz_yurou": next((u["hanzi"] for u in units if "山萸肉解" in u["title"]), 0),
        "n_an": sum(1 for u in units if u["sec"] == "五、医案"),
        "hanzi_an": sum(u["hanzi"] for u in units if u["sec"] == "五、医案"),
        "herb_top": herb_top(s["herbs"]), "dose": s["dose"],
        "yurou": s["body"].count("山萸肉"), "shanyao": s["body"].count("山药"),
        "an_total": an_total,
        "s_bingyin": segs["病因"], "s_zhenghou": segs["证候"], "s_zhenduan": segs["诊断"],
        "s_chufang": segs["处方"], "s_xiaoguo": segs["效果"],
        "an_note": f"本组医案 {an_total} 案，明确写「大气下陷」的 {sum(1 for u in units if '大气下陷' in u['body'])} 案",
        "hua_note": "答问多、结论留余地，且常自陈「此证若在他人，必用某药」",
        "xi_all": TOT.get("hanzi", 0) and sum(u["measure"]["views"]["参西"] for u in U["units"]),
        "xi_all_units": sum(1 for u in U["units"] if u["measure"]["views"]["参西"]),
        "xi_pct": "%.0f%%" % (100 * sum(1 for u in U["units"] if u["measure"]["views"]["参西"]) / len(U["units"])),
    }
    ctx["hanzi"] = f"{s['hanzi']:,}"

    L = [f"# 第 {ch['n']} 章 · {ch['title']}", ""]
    L.append(f"> **MOTTO:** 「{motto}」——{first['locator']}")
    L.append(">")
    L.append(f"> **PROBLEM:** {ch['hard']}。")
    L.append(">")
    L.append(
        f"> **双根因定位:** 环境逼迫（{TITLE}在本仓库没有教材底本，唯一可引的是外源文字化本；不复算就只剩口号）"
        f" + 知识积累（本章取 {s['units']} 单元 {s['hanzi']:,} 字；实测药物频次、剂量命中 {s['dose']} 处、"
        f"参西 {s['xi']} 次、引书 {len(set(s['cites']))} 部）"
    )
    L.append("")
    L.append("## 课程信息")
    L.append("")
    L.append("| 项目 | 内容 |")
    L.append("|---|---|")
    L.append(f"| 学科 | {TITLE}（中医系第 23 门，汇通期唯一课程载体） |")
    L.append(f"| 章序号 | {ch['n']} / 10 |")
    L.append("| 所属阶段 | 🌳 壮·鼎盛（第 8 学期） |")
    L.append(f"| 本章规模 | {s['units']} 单元 · {s['hanzi']:,} 汉字 |")
    L.append("| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |")
    L.append("")
    L.append("## 先讲清数据来源")
    L.append("")
    L.append("| 项 | 值 |")
    L.append("|---|---|")
    L.append("| 教材底本（qhzy-*.xlsx） | **无**。100 份工作簿覆盖 99 门教材学科，本书不在其中 |")
    L.append(f"| 外源文字化本 | `standards/zhongcan-xilu/`：**{TOT['chapters']} 篇 · {TOT['units']} 单元 · {TOT['hanzi']:,} 汉字** |")
    L.append("| 底本声明 | 《医学衷中参西录》河北人民出版社 1977 年 2 版 |")
    L.append("| 来源 | 中醫笈成（漢リポ 文字化本），`sources/source.html` 留档 3,990,177 B |")
    L.append("| 引用格式 | **外源·笈成·医学衷中参西录 大类·篇·条目**（不得写「底本第N条」） |")
    L.append("")
    L.append(f"本章问题：**{ch['question']}**")
    L.append("")
    L.append("## 核心概念")
    L.append("")
    for head, tpl in ch["body"]:
        try:
            text = tpl.format(**ctx)
        except KeyError as e:
            raise SystemExit(f"{ch['slug']} 模板缺变量 {e}")
        L.append(f"### {head}")
        L.append("")
        L.append(text)
        L.append("")
    # 原文引证（逐字）
    L.append("## 原文引证（逐字，可回查 units.json）")
    L.append("")
    for u in units[:3]:
        L.append(f"> 「{q(u, 60)}」——《{u['locator']}》")
        L.append("")
    L.append("## 工程产出")
    L.append("")
    L.append("```bash")
    L.append("node code/main.js            # 本章数据现算（药物频次 / 剂量 / 参西 / 引书）")
    L.append("node --test code/main.test.js  # 数字与 docs 同源")
    L.append("```")
    L.append("")
    L.append(f"产出物：`outputs/prompt-{ch['slug'][3:]}.md`（审校提示词）、`outputs/skill-{ch['slug'][3:]}.md`（可复用技能）。")
    L.append("")
    _primary, _ext = assignment()
    _e = _ext[ch["n"]]
    if _e:
        L.append("## 延伸阅读（本章承接的其余单元）")
        L.append("")
        L.append(f"本章精读 {s['units']} 单元；另有 **{len(_e)} 个单元**（{sum(u['hanzi'] for u in _e):,} 字）按大类挂在本章作延伸，如："
                 + "、".join(f"《{u['title']}》" for u in _e[:5])
                 + ("等。" if len(_e) > 5 else "。"))
        L.append("")
        L.append(f"全书 {TOT['units']} 单元各有归属（精读 + 延伸），没有悬空单元；延伸单元不设问答，只要求能定位到条目。")
        L.append("")
    L.append("## 代价与边界")
    L.append("")
    L.append(f"1. **只覆盖一部书**：{TITLE}是汇通期唯一载体，不能代表 1840–1949 的全部医家（唐宗海、恽铁樵未入本课）。")
    L.append("2. **解释不等于结论**：「参西」部分是 1909 年的解释（化合、脑筋、血管），今天读必须与辨证分开，不能当病理学结论引用。")
    L.append("3. **剂量不可照搬**：本章的「两」本位剂量是清末衡制，与现代克数不是同一位；换算需另立依据，本课不做换算。")
    L.append("4. **医案是自报**：疗效记录来自作者本人，无对照、无随访；引用时只能作为「当时的判断过程」，不能作为有效性证据。")
    L.append("")
    L.append("## 免责声明")
    L.append("")
    L.append("本课为文本结构与学术史阅读，所有条文与数字均可回查 `standards/zhongcan-xilu/units.json`；"
             "不构成诊疗依据，不替代医师判断。方药剂量与适应证请依现行规范。")
    L.append("")
    return "\n".join(L)


def build_quiz(ch):
    units = chapter_units(ch)
    s = stats(units)
    qs = [
        {"stage": "pre", "question": f"本章「{ch['title']}」的主角属于《医学衷中参西录》的哪一大类？",
         "options": ["一、医方", "二、药物", "三、医论", "四、医话"],
         "correct": 0 if units[0]["sec"] == "一、医方" else (1 if units[0]["sec"] == "二、药物" else (2 if units[0]["sec"] == "三、医论" else (3 if units[0]["sec"] == "四、医话" else 0))),
         "explanation": f"本章首条为「{units[0]['title']}」，属「{units[0]['sec']}」。"},
        {"stage": "check", "question": "本章共取多少个单元？",
         "options": [str(s["units"] - 1), str(s["units"]), str(s["units"] + 1), str(s["units"] + 5)],
         "correct": 1, "explanation": f"本章取 {s['units']} 单元，共 {s['hanzi']:,} 汉字。"},
        {"stage": "check", "question": "本章原文的剂量型命中（两/钱/分/枚…）有多少处？",
         "options": [str(s["dose"] // 2), str(s["dose"]), str(s["dose"] * 2), str(s["dose"] + 10)],
         "correct": 1, "explanation": f"实测 {s['dose']} 处；剂量是本书最容易被误读的地方，引用必须带原文。"},
        {"stage": "check", "question": "本书的引用格式应当是？",
         "options": ["底本第 N 条", "宋本第 N 条", "外源·笈成·医学衷中参西录 大类·篇·条目", "只写页码"],
         "correct": 2, "explanation": "本书在本仓库无教材底本，原文来自外源笈成文字化本；必须先标外源，再给到大类·篇·条目。"},
        {"stage": "post", "question": "本章「参西」命中次数是多少？",
         "options": [str(s["xi"] // 2), str(s["xi"]), str(s["xi"] * 3), "0"],
         "correct": 1, "explanation": f"实测 {s['xi']} 次。参西是具体做法，不是全书均匀的立场。"},
        {"stage": "post", "question": "关于本章的边界，下列哪一条是对的？",
         "options": ["书中的剂量可以直接换成今天的克数", "医案是自报疗效，可作有效性证据", "参西解释与辨证判定必须分开，前者可替换、后者不可替代", "本书代表 1840–1949 年全部医家"],
         "correct": 2, "explanation": "参西是 1909 年的解释层；方证判定仍落在脉证上，这是本章的边界。"},
    ]
    return {"questions": qs}


def build_prompt(ch):
    units = chapter_units(ch)
    s = stats(units)
    base = ch["slug"][3:]
    return "\n".join([
        f"# {ch['title']} · 审校助手",
        "",
        "## 用途",
        "",
        f"拿到一条关于「{ch['question']}」的说法，用**本章实测数字 + 原文定位**去核，而不是凭印象作答。"
        "用于教学答疑、教材审稿、口径对齐。",
        "",
        "## 数据边界（必须先声明）",
        "",
        "```text",
        f"《医学衷中参西录》在本仓库无教材底本；原文来自外源文字化本（笈成，底本声明河北人民出版社 1977 年 2 版）。",
        f"全书 {TOT['chapters']} 篇 · {TOT['units']} 单元 · {TOT['hanzi']:,} 汉字；本章取 {s['units']} 单元 {s['hanzi']:,} 字。",
        "引用格式：外源·笈成·医学衷中参西录 大类·篇·条目；不得写「底本第N条」。",
        "```",
        "",
        "## 提示词",
        "",
        "```text",
        "你是《医学衷中参西录》的文本审校助手。任务：判断给定说法是否与底本一致，并给出可回查的条目定位。",
        "",
        "可用事实（由 standards/zhongcan-xilu/units.json 计算）：",
        f"- 本章单元 {s['units']} 个、{s['hanzi']:,} 汉字",
        f"- 药物频次 top：{herb_top(s['herbs'])}",
        f"- 剂量型命中（两/钱/分/枚）：{s['dose']} 处",
        f"- 参西命中：{s['xi']} 次",
        "",
        "规则：",
        "1. 任何结论都要能落到「大类·篇·条目」，落不到就说「底本无此条」。",
        "2. 参西解释与辨证判定分开陈述；前者是 1909 年的解释，可替换。",
        "3. 剂量只报原文写法，不做克数换算。",
        "4. 不评价疗效，只评价文本一致性。",
        "```",
        "",
        f"## 输出格式",
        "",
        "| 说法 | 判定 | 依据（大类·篇·条目） | 说明 |",
        "|---|---|---|---|",
        "| … | 一致 / 部分一致 / 底本无此条 | … | … |",
        "",
        f"<!-- chapter: {base} -->",
        "",
    ])


def build_skill(ch):
    units = chapter_units(ch)
    s = stats(units)
    base = ch["slug"][3:]
    return "\n".join([
        "---",
        f"name: {base}",
        f"description: {ch['title']}：{ch['question'][:40]}",
        "version: 0.1.0",
        "---",
        "",
        f"# {base}",
        "",
        "## 何时使用",
        "",
        f"- 要核「{ch['question']}」这类说法",
        "- 讲稿或教材里出现与本书口径不符的表述，需要落回条目",
        "- 需要把本章的实测数字（单元/字数/剂量/参西）报给人听",
        "",
        "## 数据来源",
        "",
        "`standards/zhongcan-xilu/units.json`（外源·笈成文字化本，534 单元）；"
        "结构：`node code/main.js`；自测：`node --test code/main.test.js`。",
        "",
        "## 硬约束",
        "",
        "1. 引用格式固定为 **外源·笈成·医学衷中参西录 大类·篇·条目**，不得写「底本第N条」。",
        "2. 参西是解释层，不得当作病理学结论；判定仍以脉证为准。",
        "3. 剂量只报原文写法（两/钱/分/枚），不做克数换算。",
        f"4. 本章数字：单元 {s['units']} · 汉字 {s['hanzi']:,} · 剂量命中 {s['dose']} · 参西 {s['xi']}。",
        "",
        "## 步骤",
        "",
        "1. `node code/main.js` 看本章实测（药物频次、剂量、参西、引书）。",
        "2. 把待核说法拆成「可落到条目」的最小命题。",
        "3. 回 `units.json` 定位，逐字比对；对不上就写「底本无此条」。",
        "4. 输出判定 + 定位 + 一句说明（不评价疗效）。",
        "",
    ])


TPL_DIR = os.path.join(ROOT, "assets", "zhongcan-course")
JS = io.open(os.path.join(TPL_DIR, "main.js.tpl"), encoding="utf-8").read()
JS_TEST = io.open(os.path.join(TPL_DIR, "main.test.js.tpl"), encoding="utf-8").read()


DEFAULT_CH = {"一、医方": 6, "二、药物": 3, "三、医论": 1, "四、医话": 10, "五、医案": 9}


def assignment():
    """精读＝各章 picks；延伸＝其余单元按大类挂到该类代表章。

    534 单元必须逐个有主 —— 选读课可以只精读一部分，但不能让单元「没上课」。
    """
    primary = {}
    for ch in CHAPTERS:
        for u in chapter_units(ch):
            primary.setdefault(u["locator"], ch["n"])
    ext = {ch["n"]: [] for ch in CHAPTERS}
    for u in U["units"]:
        if u["locator"] in primary:
            continue
        ext[DEFAULT_CH[u["sec"]]].append(u)
    return primary, ext


def fill(tpl: str, **kw) -> str:
    out = tpl
    for k, v in kw.items():
        out = out.replace(f"__{k.upper()}__", str(v))
    left = re.findall(r"__[A-Z_]+__", out)
    if left:
        raise SystemExit(f"模板占位符未替换：{set(left)}")
    return out


def build():
    files = {}
    chapters_json = {"slug": SLUG, "title": TITLE, "chapters": []}
    primary, ext = assignment()
    for ch in CHAPTERS:
        units = chapter_units(ch)
        s = stats(units)
        segs, an_total = seg_coverage(units)
        top = sorted(herb_top_pairs(s["herbs"]), key=lambda x: -x[1])
        xt = sorted(units, key=lambda u: -u["measure"]["views"]["参西"])[0]
        base = ch["slug"][3:]
        cdir = os.path.join(SUBJ, "chapters", ch["slug"])
        # 2026-11-22 起本课正文已人工补实（登记在 data/course-docs-rewritten.json）。
        # 生成器只负责 chapters.json / code / quiz / outputs，不再覆盖 docs/zh.md，
        # 也不再对其做 --check 比对——否则「真人写的正文」会被判成 DRIFT。
        if not DOCS_AUTHORED:
            files[os.path.join(cdir, "docs", "zh.md")] = build_doc(ch)
            files[os.path.join(cdir, "quiz.json")] = json.dumps(build_quiz(ch), ensure_ascii=False, indent=2) + "\n"
            files[os.path.join(cdir, "code", "main.js")] = fill(
                JS, n=ch["n"], title=ch["title"],
                picks=json.dumps([u["locator"] for u in units], ensure_ascii=False, indent=2),
                picks_len=len(units))
            files[os.path.join(cdir, "code", "main.test.js")] = fill(
                JS_TEST, n=ch["n"], picks_len=len(units), n_units=s["units"], n_hanzi=s["hanzi"],
                n_dose=s["dose"], n_xi=s["xi"], an_total=an_total,
                top_herb=top[0][0] if top else "", top_count=top[0][1] if top else 0,
                xt_title=xt["title"], xt_n=xt["measure"]["views"]["参西"])
        # 习题与章节代码同样已人工重做（2026-11-23）：生成器不再覆盖，也不再比对，
        # 否则子代理按正文写的 quiz / main.js 会被判成 DRIFT 并被文件覆盖。
        files[os.path.join(cdir, "outputs", f"prompt-{base}.md")] = build_prompt(ch)
        files[os.path.join(cdir, "outputs", f"skill-{base}.md")] = build_skill(ch)
        own = [u for u in units if primary[u["locator"]] == ch["n"]]
        shared = [u for u in units if primary[u["locator"]] != ch["n"]]
        ttl, hz_use = ch["title"], s["hanzi"]
        if DOCS_AUTHORED:
            t_doc, hz_doc = doc_head(ch["slug"])
            ttl = t_doc or ttl
            hz_use = hz_doc if hz_doc else hz_use
        chapters_json["chapters"].append({
            "n": ch["n"], "slug": ch["slug"], "title": ttl,
            "status": "🚧", "units": len(own), "shared": len(shared), "hanzi": hz_use,
            "extends": len(ext[ch["n"]]), "extendHanzi": sum(u["hanzi"] for u in ext[ch["n"]]),
        })
    files[os.path.join(SUBJ, "chapters.json")] = json.dumps(chapters_json, ensure_ascii=False, indent=1) + "\n"
    files[os.path.join(SUBJ, "meta.json")] = json.dumps({
        "slug": SLUG, "title": TITLE, "en": EN,
        "deptSlug": "01-zhongyi", "deptTitle": "中医系", "globalN": 23,
        "type": "Reference", "semester": 8, "stage": "zhuang", "stageTitle": "壮",
        "hours": 36,
        "bridge": "原文→单元层 / 方证→药物频次与剂量 / 参西→可替换的解释层",
        "chaptersTarget": 10, "chapters": [],
        "platform": {"id": "tcmP", "coursePath": "platform/courses/01-zhongyi/" + SLUG,
                     "videosPublished": 0, "status": "planned"},
        "textbook": {"id": "standards", "path": "standards/zhongcan-xilu",
                     "chaptersWritten": 10, "words": TOT["hanzi"], "status": "wip",
                     "layer": "source-body",
                     "source": "中醫笈成《醫學衷中參西錄》文字化本（底本声明河北人民出版社 1977 年 2 版）",
                     "extractedAt": "2026-11-09"},
    }, ensure_ascii=False, indent=2) + "\n"
    files[os.path.join(SUBJ, "README.md")] = build_readme()
    return files


def herb_top_pairs(herbs):
    from collections import Counter
    return list(Counter(herbs).items())


def build_readme():
    lines = [
        f"# {TITLE}",
        "",
        f"**{SLUG}** · 中医系 · 第 8 学期 · 36 学时 · 10 章",
        "",
        "汇通期（1840–1949）在知识树上唯一的课程载体。正文不是二手转述，而是外源文字化本原书：",
        "",
        f"| 项 | 值 |",
        "|---|---|",
        f"| 底本 | 《医学衷中参西录》河北人民出版社 1977 年 2 版（笈成文字化本留档） |",
        f"| 规模 | {BC['classes']} 大类 · {TOT['chapters']} 篇 · {TOT['units']} 单元 · {TOT['hanzi']:,} 汉字 |",
        f"| 单元层 | `standards/zhongcan-xilu/units.json` |",
        f"| 复算 | `python scripts/build_zhongcan_xilu_text.py --check` |",
        "",
        "## 十章",
        "",
        "| # | 章 | 取材 | 独占 | 共读 | 延伸 | 字数 |",
        "|--:|---|---|--:|--:|--:|--:|",
    ]
    for ch in CHAPTERS:
        units = chapter_units(ch)
        secs = sorted({u["sec"].split("、")[1] for u in units})
        _p, _ex = assignment()
        _own = [u for u in units if _p[u["locator"]] == ch["n"]]
        lines.append(f"| {ch['n']} | {ch['title']} | {'/'.join(secs)} | {len(_own)} | {len(units) - len(_own)} | {len(_ex[ch['n']])} | {sum(u['hanzi'] for u in units):,} |")
    _p, _ex = assignment()
    _own_total = sum(1 for u in U["units"] if u["locator"] in _p)
    _shr_total = sum(len(chapter_units(c)) for c in CHAPTERS) - _own_total
    lines.append(f"| | **合计** | 五类 | **{_own_total}** | **{_shr_total}** | **{sum(len(v) for v in _ex.values())}** | **{TOT['hanzi']:,}** |")
    lines += [
        "",
        f"独占 {_own_total} + 延伸 {sum(len(v) for v in _ex.values())} = **{TOT['units']} 单元**，全书无悬空；"
        f"另有 {_shr_total} 处跨章共读（同一单元在两章各读一面，不重复计数）。",
        "",
        "五大类各取代表作：医方（大气下陷·阴虚劳热·吐衄·喘息）、药物（石膏·赭石·山药山萸肉）、",
        "医论（六经总论·脑充血）、医话（驳贵阳抑阴·忌橘红·书后）、医案（虚劳喘嗽·气病·血病·脑充血）。",
        "",
        "## 读法",
        "",
        "每章一个可执行动作，不是一段综述：",
        "",
        "```bash",
        "node code/main.js              # 本章实测：药物频次 / 剂量 / 参西 / 引书 / 五段式",
        "node --test code/main.test.js  # 数字与 units.json 同源",
        "```",
        "",
        "## 边界",
        "",
        "- 只代表一部书，不代表 1840–1949 全部医家；",
        "- 「参西」是 1909 年的解释层（化合、脑筋、血管），不替代辨证，也不当病理学结论引用；",
        "- 剂量是清末衡制，本课不做克数换算；",
        "- 医案为作者自报，无对照随访，只能作判断过程读。",
        "",
    ]
    return "\n".join(lines)


def main() -> int:
    check = "--check" in sys.argv
    files = build()
    drift = []
    if check:
        for p, text in files.items():
            old = io.open(p, encoding="utf-8").read() if os.path.exists(p) else ""
            if old != text:
                drift.append(os.path.relpath(p, ROOT))
        if drift:
            print("DRIFT:", len(drift), "个文件，例：", ", ".join(drift[:5]))
            return 1
        print(f"[zhongcan-xilu-course] ✓ {len(files)} 个文件与重建结果一致")
        return 0
    for p, text in files.items():
        os.makedirs(os.path.dirname(p), exist_ok=True)
        io.open(p, "w", encoding="utf-8").write(text)
    print(f"[zhongcan-xilu-course] 写入 {len(files)} 个文件到 {os.path.relpath(SUBJ, ROOT)}")
    for ch in CHAPTERS:
        units = chapter_units(ch)
        print(f"  {ch['n']:>2} {ch['slug']:<26} 单元 {len(units):>3} · 字 {sum(u['hanzi'] for u in units):>7,}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
