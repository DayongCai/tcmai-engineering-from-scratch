# -*- coding: utf-8 -*-
"""中药系 4 门派生课：11 药代动力学 / 12 道地药材 / 13 中成药 / 14 配伍与禁忌。

派生规则（与 19/20 一致）：
  - 单元正文取自父课 units.json，**不改字**；locator 一律 `派生·第N章·m.k`；
  - unit.source 记 `父课:父locator`，两课汉字不可相加；
  - 同一父单元在本课内只用一次；跨课复用允许（不同课各自成篇）。
"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
HANZI = re.compile(r"[\u4e00-\u9fff]")


def load(sub):
    p = os.path.join(S, sub, "units.json")
    if not os.path.exists(p):
        return None
    return json.load(io.open(p, encoding="utf-8"))


COURSES = {
 "zhongyao-yaodai-donglixue": {
  "dept": "departments/02-zhongyao/11-zhongyao-yaodai-donglixue",
  "title": "中药药代动力学",
  "views": {"体内过程": ["吸收", "分布", "代谢", "排泄", "血药", "浓度", "半衰期", "生物利用度", "曲线"],
            "成分与转运": ["成分", "转运", "转运体", "蛋白结合", "首过", "肝", "肠"],
            "方法与评价": ["测定", "方法", "验证", "参数", "模型", "评价", "样本", "色谱"]},
  "levels": {"给药与剂型": ["剂型", "给药", "口服", "注射", "外用"],
             "体内处置": ["吸收", "分布", "代谢", "排泄", "消除"],
             "相互作用": ["诱导", "抑制", "联用", "相互作用", "合用"],
             "复方与个体": ["复方", "配伍", "个体", "证候", "人群"]},
  "plan": [
   (1, "01-adme-gailun", "中药药代动力学概论", "先立 ADME 框架与中药的特殊性", [("zhongyao-yaoli", ["吸收", "分布", "代谢", "排泄", "药动"]), ("zhongyao-huaxue", ["吸收", "代谢"])], 5),
   (2, "02-tinei-guocheng", "体内过程与生物利用度", "生物利用度是剂型与工艺的最终检验", [("zhongyao-yaoji", ["生物利用度", "溶出", "释放", "吸收"]), ("zhongyao-yaoli", ["生物利用度", "吸收"])], 5),
   (3, "03-canshu-moxing", "药动学参数与房室模型", "参数是「能不能比较」的前提", [("zhongyao-fenxi", ["血药", "浓度", "测定", "方法学"]), ("zhongyao-yaoli", ["半衰期", "清除", "参数"])], 5),
   (4, "04-chengfen-zhuanyun", "成分吸收与转运", "多成分体系里「谁进了血」", [("zhongyao-huaxue", ["吸收", "转运", "苷", "生物碱"]), ("zhongyao-yaoli", ["转运", "成分"])], 5),
   (5, "05-daixie-daixiewu", "代谢与代谢物", "代谢决定半衰期，也决定毒性", [("zhongyao-huaxue", ["代谢", "水解", "氧化", "结合"]), ("zhongyao-du-li", ["代谢", "毒性"])], 5),
   (6, "06-xianghu-zuoyong", "药物相互作用与酶", "联用时代谢酶是主战场", [("zhongyao-yaoli", ["相互作用", "诱导", "抑制", "联用"]), ("linchuang-zhongyao", ["联用", "合用"])], 5),
   (7, "07-fufang-tedian", "中药复方药动学特点", "复方不是单成分的叠加", [("linchuang-zhongyao", ["复方", "配伍", "方剂"]), ("zhongyao-yaoli", ["复方", "配伍"])], 5),
   (8, "08-fangfaxue-guifan", "方法学与研究规范", "没有方法学验证，参数不可比", [("zhongyao-fenxi", ["方法学", "验证", "专属性", "线性", "回收"]), ("zhongyao-huaxue", ["色谱", "测定"])], 5),
  ]},
 "daodi-yaocai": {
  "dept": "departments/02-zhongyao/12-daodi-yaocai",
  "title": "道地药材与产地加工",
  "views": {"产地与区划": ["道地", "产区", "区划", "分布", "地理", "气候", "土壤"],
            "品质与评价": ["品质", "质量", "成分", "含量", "评价", "标准", "规格"],
            "生产与加工": ["栽培", "种植", "采收", "加工", "干燥", "产地", "炮制"]},
  "levels": {"基原与品种": ["基原", "品种", "种质", "鉴定", "性状"],
             "生态与产区": ["生态", "气候", "土壤", "海拔", "产区", "区划"],
             "生产与加工": ["栽培", "种植", "采收", "加工", "干燥"],
             "商品与流通": ["商品", "规格", "等级", "市场", "价格", "流通"]},
  "plan": [
   (1, "01-daodi-gainian", "道地药材的概念与源流", "先辨「道地」是质量判断还是产地标签", [("zhongyao-ziyuan", ["道地", "产区", "区划"]), ("zhongyao-shangpin", ["道地", "产地"])], 5),
   (2, "02-quhua-fenbu", "产区分布与区划", "道地性首先是一条地理事实", [("zhongyao-ziyuan", ["分布", "区划", "产区", "地理"]), ("zhongyao-jianding", ["产地"])], 5),
   (3, "03-shengtai-pinzhi", "生态因子与品质形成", "同一品种换个地方就不是那个味", [("zhongyao-ziyuan", ["生态", "气候", "土壤", "品质"]), ("zhongyao-huaxue", ["成分", "含量"])], 5),
   (4, "04-jiyuan-pinzhong", "基原、品种与种质", "道地的前提是「先认对是什么」", [("zhongyao-jianding", ["基原", "品种", "性状", "鉴定"]), ("zhongyao-ziyuan", ["种质"])], 5),
   (5, "05-zaipei-caishou", "栽培与采收", "规范化种植改的是变异幅度", [("zhongyao-ziyuan", ["栽培", "种植", "采收", "规范化"]), ("zhongyao-jianding", ["采收"])], 5),
   (6, "06-chandi-jiagong", "产地加工", "产地那一步决定后续能不能标准化", [("zhongyao-paozhi", ["净制", "切制", "干燥"]), ("zhongyao-ziyuan", ["加工", "产地"])], 5),
   (7, "07-guige-dengji", "规格等级与商品", "等级是市场语言，不等于疗效排序", [("zhongyao-shangpin", ["规格", "等级", "商品", "市场"]), ("zhongyao-jianding", ["性状"])], 5),
   (8, "08-pingjia-zhuisu", "品质评价与追溯", "评价要能落到指标，追溯要能落到地块", [("zhongyao-fenxi", ["含量", "指纹", "测定"]), ("zhongyao-shangpin", ["追溯", "质量"])], 5),
  ]},
 "zhongchengyao-linchuang": {
  "dept": "departments/02-zhongyao/13-zhongchengyao-linchuang",
  "title": "中成药与临床用药",
  "views": {"剂型与工艺": ["剂型", "工艺", "提取", "浓缩", "干燥", "制丸", "压片"],
            "质量与标准": ["标准", "含量", "鉴别", "指纹", "限度", "检验"],
            "临床与安全": ["主治", "证候", "用法", "禁忌", "不良反应", "联合"]},
  "levels": {"内科病证": ["感冒", "咳嗽", "胃", "泻", "失眠", "眩晕", "中风"],
             "妇儿骨皮": ["月经", "带下", "小儿", "骨伤", "疮", "皮肤"],
             "急重症": ["急救", "休克", "高热", "注射"],
             "用药管理": ["处方", "审核", "联合", "监测", "疗程"]},
  "plan": [
   (1, "01-gailun-fenlei", "中成药概论与分类", "先分清「成药」与「汤剂」的差别", [("zhongyao-yaoji", ["中成药", "剂型", "分类"]), ("linchuang-zhongyao", ["中成药"])], 5),
   (2, "02-jixing-gongyi", "剂型与制备工艺", "剂型决定释放，工艺决定批间一致", [("zhongyao-yaoji", ["丸剂", "片剂", "胶囊", "提取", "浓缩"]), ("zhongyao-yaoli", ["释放"])], 5),
   (3, "03-zhiliang-biaozhun", "质量标准与检验", "成药的合规底线在标准", [("zhongyao-fenxi", ["含量测定", "鉴别", "指纹", "限度"]), ("zhongyao-yaoji", ["质量", "稳定"])], 5),
   (4, "04-zhusheji", "中药注射剂与特殊剂型", "风险最高的剂型，要求也最严", [("zhongyao-yaoji", ["注射剂", "无菌", "热原"]), ("zhongyao-du-li", ["注射"])], 5),
   (5, "05-neike-yongyao", "内科常用中成药", "按病证选药，而不是按药名选", [("linchuang-zhongyao", ["感冒", "咳嗽", "胃", "泻", "失眠"]), ("zhongyao-xue", ["功效"])], 6),
   (6, "06-fuke-erke", "妇科与儿科用药", "人群差异改变剂量与疗程", [("linchuang-zhongyao", ["月经", "带下", "小儿", "妊娠"]), ("zhongyao-xue", ["妇科", "小儿"])], 5),
   (7, "07-gushang-pifu", "骨伤与皮肤科用药", "外用与内服的边界", [("linchuang-zhongyao", ["骨伤", "疮", "皮肤", "外用"]), ("zhongyao-jianding", ["外用"])], 5),
   (8, "08-lianhe-yongyao", "联合用药与相互作用", "联用是最常见的风险来源", [("zhongyao-yaoli", ["联合", "相互作用", "合用"]), ("linchuang-zhongyao", ["联合", "同用"])], 5),
   (9, "09-buliang-fanying", "不良反应与监测", "中成药也有剂量与毒性边界", [("zhongyao-du-li", ["不良反应", "毒性", "剂量"]), ("zhongyao-yaoli", ["不良反应"])], 9),
   (10, "10-heli-yongyao", "合理使用与处方审核", "把前面九章收成一张可执行的核对表", [("linchuang-zhongyao", ["合理", "处方", "辨证", "禁忌"]), ("zhongyao-xue", ["用法", "禁忌"])], 6),
  ]},
 "peiwu-yu-jinji": {
  "dept": "departments/02-zhongyao/14-peiwu-yu-jinji",
  "title": "中药配伍与禁忌",
  "views": {"配伍理论": ["七情", "相须", "相使", "相畏", "相杀", "相恶", "相反", "君臣佐使"],
            "禁忌规则": ["十八反", "十九畏", "妊娠", "禁忌", "忌"],
            "证据与机制": ["成分", "毒性", "代谢", "实验", "研究", "机制"]},
  "levels": {"药对与方剂": ["药对", "方剂", "配伍", "组方"],
             "证候与人群": ["证候", "妊娠", "老人", "小儿", "体质"],
             "毒性药物": ["毒性", "有毒", "大毒", "峻烈"],
             "评价方法": ["实验", "测定", "模型", "评价", "证据"]},
  "plan": [
   (1, "01-qiqing-lilun", "七情与配伍理论", "七情不是修辞，是七种相互作用", [("zhongyao-xue", ["七情", "相须", "相使", "相畏", "相杀", "相恶", "相反"])], 6),
   (2, "02-junchenzuoshi", "君臣佐使与组方", "结构决定一张方子的重心", [("zhongyao-xue", ["君臣佐使", "配伍", "组方"]), ("fangji", ["君臣佐使", "组成"])], 5),
   (3, "03-shihba-fan", "十八反与十九畏", "本课最硬的一张清单", [("zhongyao-xue", ["十八反", "十九畏", "相反", "相畏"]), ("zhongyao-du-li", ["相反", "配伍"])], 6),
   (4, "04-renshen-jinji", "妊娠与哺乳期禁忌", "禁忌的对象是人，不只是药", [("zhongyao-xue", ["妊娠", "禁忌", "孕妇"]), ("linchuang-zhongyao", ["妊娠", "禁忌"])], 5),
   (5, "05-zhenghou-jinji", "证候禁忌", "同病异治的另一面：同药异禁", [("linchuang-zhongyao", ["禁忌", "证候", "不宜"]), ("zhongyao-xue", ["忌用", "慎用"])], 5),
   (6, "06-zhongxi-lianyong", "中西药联用禁忌", "最容易被忽略的一类相互作用", [("zhongyao-yaoli", ["联合", "合用", "相互作用"]), ("linchuang-zhongyao", ["西药", "联用"])], 5),
   (7, "07-duyao-peiwu", "毒性药的配伍", "减毒是配伍最古老的目的", [("zhongyao-du-li", ["毒性", "有毒", "减毒", "剂量"]), ("zhongyao-paozhi", ["减毒"])], 5),
   (8, "08-fangfa-pingjia", "配伍研究的证据方法", "从文献经验到可验证的证据", [("zhongyao-fenxi", ["测定", "含量", "方法"]), ("zhongyao-yaoli", ["实验", "模型"])], 5),
  ]},
}


def hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text, lv):
    return {k: sum(text.count(w) for w in ws) for k, ws in lv.items()}


def build(sub, cfg):
    plan = cfg["plan"]
    used = set()
    units, probe = [], {"view": {k: 0 for k in cfg["views"]}, "A_part": {k: 0 for k in cfg["levels"]}}
    missing = []
    for n, slug, title, why, srcs, K in plan:
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
                hay = (u["title"] or "") + (u["prose"] or "")[:1500]
                score = sum(hay.count(k) for k in kws)
                if score:
                    cand.append((score, parent, u, key))
        cand.sort(key=lambda x: -x[0])
        take = cand[:K]
        for i, (sc, parent, u, key) in enumerate(take, 1):
            used.add(key)
            prose = u["prose"]
            units.append({
                "chapter": str(n), "chapterTitle": f"第{n}章 {title}", "sec": "", "secNo": "",
                "sub": f"{n}.{i}", "title": f"{n}.{i} {u['title']}",
                "locator": f"派生·第{n}章·{n}.{i}",
                "brief": u.get("brief", ""), "goals": [], "rawBody": prose, "body": prose, "prose": prose,
                "segments": u.get("segments", []), "hanzi": hanzi(prose),
                "measure": {"digits": len(re.findall(r"\d", prose)), "valueLike": 0,
                            "views": measure(prose, cfg["views"]), "levels": measure(prose, cfg["levels"])},
                "srcSub": parent, "source": f"{parent}:{u['locator']}"})
            for k, v in units[-1]["measure"]["views"].items():
                probe["view"][k] += v
            for k, v in units[-1]["measure"]["levels"].items():
                probe["A_part"][k] += v
    ratio = {}
    for g, b in probe.items():
        vals = [v for v in b.values() if v]
        ratio[g] = round(max(b.values()) / min(vals), 1) if len(vals) > 1 and min(vals) else None
    counts = {"chapters": len(plan), "units": len(units), "hanzi": sum(u["hanzi"] for u in units),
              "digits": sum(u["measure"]["digits"] for u in units), "valueLike": 0}
    out = os.path.join(S, sub)
    os.makedirs(out, exist_ok=True)
    json.dump({"source": {"kind": "派生", "from": [p for *_ , p, _k in []] or sorted({u["srcSub"] for u in units}),
                          "note": "单元正文取自父课，未改字；locator 一律「派生·」；两课汉字不可相加。"},
               "counts": counts, "views": cfg["views"], "levels": cfg["levels"],
               "probe": probe, "ratio": ratio, "units": units},
              io.open(os.path.join(out, "units.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": "派生课：一章一主题，单元按关键词从父课选题；无单元复用。",
               "chapters": {slug: {"n": n, "title": t, "units": [f"{n}.{i}" for i in range(1, K + 1)],
                                   "srcChapters": [f"派生#{n}"], "why": why, "derivedFrom": "、".join(cfg.get("parents", [])) or ""}
                            for n, slug, t, why, srcs, K in plan}},
              io.open(os.path.join(out, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": "派生课轴：三辨与四位面按本课主题词表现算。", "views": cfg["views"], "levelsA": cfg["levels"]},
              io.open(os.path.join(out, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    fb = {slug: [f"《{cfg['title']}·{t}》", "派生课：篇名为本课程章名，出处见 units.json 的 source 字段"]
          for n, slug, t, why, srcs, K in plan}
    json.dump({"courseTitle": cfg["title"], "deptPath": cfg["dept"],
               "xlsx": "派生课（无教材）：单元取自中药系已建课程，见 units.json source",
               "chain": " → ".join(t for n, s, t, w, src, K in plan),
               "levelLabel": "观察视角", "objectPressure": "派生课的判断力来自「把父课的片段重新排成一条决策链」",
               "reportRule": "父课教材与《中国药典》相关项", "gapNote": "无独立教材；未覆盖主题见各章 why 与 README",
               "chapterQ": {slug: [f"{t}的核心判据是什么", why] for n, slug, t, why, srcs, K in plan},
               "fallback": fb, "defaultCite": [f"《{cfg['title']}》", "派生课篇名"]},
              io.open(os.path.join(out, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{sub}: {counts['chapters']} 章 / {counts['units']} 单元 / {counts['hanzi']:,} 汉字 · ratio {ratio}")
    if missing:
        print("  缺父课:", sorted(set(missing)))


if __name__ == "__main__":
    for sub, cfg in COURSES.items():
        cfg["parents"] = sorted({p for n, s, t, w, srcs, K in cfg["plan"] for p, _ in srcs})
        build(sub, cfg)
