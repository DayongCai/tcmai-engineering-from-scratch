# -*- coding: utf-8 -*-
"""针灸系 6 门派生课：09 康复医学基础 / 11 物理治疗与运动康复 / 12 耳穴诊治学 /
13 针刀医学 / 14 针灸镇痛与麻醉 / 15 中医康复学。

派生规则：单元正文取自父课 units.json，不改字；locator 一律 `派生·第N章·m.k`；
unit.source 记 `父课:父locator`；同一父单元在本课内只用一次；两课汉字不可相加。
"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")
HANZI = re.compile(r"[\u4e00-\u9fff]")

COURSES = {
 "kangfu-yixue-jichu": {
  "dept": "departments/03-zhenjiu/09-kangfu-yixue-jichu",
  "title": "康复医学基础",
  "views": {"功能评定": ["评定", "评估", "量表", "分级", "肌力", "关节活动", "平衡", "步态"],
            "治疗技术": ["训练", "治疗", "疗法", "运动", "作业", "物理", "针灸", "推拿"],
            "照护与团队": ["团队", "照护", "康复科", "长期照护", "转介", "多学科"]},
  "levels": {"运动功能": ["肌力", "关节", "平衡", "步态", "转移", "运动"],
             "日常生活": ["日常生活", "ADL", "进食", "穿衣", "洗漱", "如厕"],
             "言语认知": ["言语", "吞咽", "认知", "失语", "记忆"],
             "并发症与风险": ["压疮", "跌倒", "挛缩", "深静脉", "误吸", "风险"]},
  "plan": [
   (1, "01-kangfu-gailun", "康复医学概论", "康复不是「养病」：目标是功能，不是治愈", [("kangfu-huli", ["康复", "功能", "残疾"]), ("zhenjiu-zhiliao", ["康复"])], 5),
   (2, "02-gongneng-pingding", "功能评定", "没有评定量表，康复就没有终点", [("kangfu-huli", ["评定", "评估", "量表", "肌力", "ADL"]), ("jichu-huli", ["评估"])], 5),
   (3, "03-yundong-gongneng", "运动功能与训练", "肌力、关节活动度、平衡、步态四条线", [("kangfu-huli", ["肌力", "关节活动", "平衡", "步态", "训练"]), ("tuina", ["关节", "肌肉"])], 5),
   (4, "04-richeng-shenghuo", "日常生活活动与作业治疗", "ADL 是康复的最终考场", [("kangfu-huli", ["日常生活", "进食", "穿衣", "如厕", "转移"]), ("laonian-huli", ["日常生活"])], 5),
   (5, "05-yanyu-yinshi", "言语、吞咽与认知康复", "这三块最容易被忽略，也最影响安全", [("kangfu-huli", ["言语", "吞咽", "认知", "失语"]), ("jichu-huli", ["吞咽", "误吸"])], 5),
   (6, "06-kangfu-huli", "康复护理与并发症预防", "压疮、跌倒、挛缩、深静脉——四类可防", [("kangfu-huli", ["压疮", "跌倒", "挛缩", "深静脉", "体位"]), ("jichu-huli", ["压疮", "跌倒"])], 5),
   (7, "07-shequ-changqi", "社区与长期照护", "康复的主战场在出院之后", [("shequ-huli-xue", ["社区", "家庭", "随访"]), ("laonian-huli", ["长期", "照护"])], 5),
   (8, "08-tuandui-lunli", "康复团队与伦理", "团队分工与「谁说了算」", [("kangfu-huli", ["团队", "康复科", "医师", "治疗师"]), ("huli-lunli-fagui", ["伦理", "知情"])], 5),
  ]},

 "wuli-zhiliao": {
  "dept": "departments/03-zhenjiu/11-wuli-zhiliao",
  "title": "物理治疗与运动康复",
  "views": {"物理因子": ["电", "光", "热", "冷", "超声", "磁", "激光", "蜡"],
            "运动疗法": ["运动", "训练", "牵伸", "肌力", "关节", "平衡", "步态"],
            "剂量与安全": ["剂量", "时间", "强度", "禁忌", "注意", "烫伤", "电极"]},
  "levels": {"电疗": ["电针", "电疗", "电流", "频率", "电极", "刺激"],
             "热与光": ["热", "红外", "光", "激光", "蜡疗", "温热"],
             "冷与机械": ["冷", "冰", "超声", "牵引", "压力"],
             "运动与方案": ["运动", "训练", "方案", "疗程", "康复"]},
  "plan": [
   (1, "01-wuli-gailun", "物理治疗概论", "物理因子的共同逻辑：给组织一个可承受的刺激", [("cifa-jiufa", ["物理", "刺激", "疗法"]), ("kangfu-huli", ["物理", "治疗"])], 5),
   (2, "02-dianliao", "电疗与电针", "参数决定作用，也决定风险", [("cifa-jiufa", ["电针", "电流", "频率", "波型"]), ("shiyan-zhenjiu", ["电针", "参数"])], 5),
   (3, "03-reliao-guangliao", "热疗与光疗", "温度与时间是唯一可核的量", [("cifa-jiufa", ["灸", "温针", "红外"]), ("kangfu-huli", ["热", "光"])], 5),
   (4, "04-lengliao-chaosheng", "冷疗、超声与牵引", "冷与机械力：适应证窄，禁忌明确", [("kangfu-huli", ["冷", "超声", "牵引"]), ("tuina", ["牵引"])], 5),
   (5, "05-yundong-jichu", "运动疗法基础", "先评再练：没有评定就没有处方", [("kangfu-huli", ["运动", "训练", "评定"]), ("tuina", ["功能", "训练"])], 5),
   (6, "06-guanjie-jili", "关节活动与肌力训练", "被动、助力、主动、抗阻四级", [("kangfu-huli", ["关节活动", "肌力", "抗阻", "牵伸"]), ("shoufa", ["手法"])], 5),
   (7, "07-pingheng-butai", "平衡、协调与步态训练", "跌倒风险是这一章的主指标", [("kangfu-huli", ["平衡", "步态", "跌倒", "协调"]), ("laonian-huli", ["跌倒"])], 5),
   (8, "08-fangan-fengxian", "运动康复方案与风险控制", "把前七章收成一张可执行的处方", [("kangfu-huli", ["方案", "运动", "风险"]), ("zhenjiu-zhiliao", ["康复"])], 5),
  ]},

 "erxue-zhenduan-xue": {
  "dept": "departments/03-zhenjiu/12-erxue-zhenduan-xue",
  "title": "耳穴诊治学",
  "views": {"定位与解剖": ["耳廓", "耳穴", "定位", "分区", "解剖", "耳轮", "耳甲"],
            "诊断方法": ["诊断", "望诊", "压痛", "电阻", "阳性", "反应"],
            "治疗应用": ["耳针", "耳穴", "埋豆", "压丸", "放血", "适应证"]},
  "levels": {"理论源流": ["内经", "耳", "经络", "脏腑", "全息"],
             "诊断": ["诊断", "阳性", "压痛", "电阻", "望诊"],
             "治疗": ["耳针", "压丸", "埋豆", "放血", "刺激"],
             "安全规范": ["消毒", "感染", "禁忌", "孕妇", "意外"]},
  "plan": [
   (1, "01-yuanliu-lilun", "耳穴诊治的源流与理论", "耳与经络脏腑的联系是被反复引用的一句话", [("zhenjiu-xue", ["耳", "耳穴", "耳针"]), ("jingluo", ["耳"])], 5),
   (2, "02-jiepou-fenqu", "耳廓解剖与分区", "先认清耳廓的沟、脊、窝", [("zhenjiu-xue", ["耳", "解剖"]), ("shuxue", ["耳"])], 5),
   (3, "03-dingwei", "耳穴定位", "定位是这门课的地基：差一毫米就换穴", [("zhenjiu-xue", ["耳穴", "定位"]), ("cifa-jiufa", ["耳针"])], 5),
   (4, "04-zhenduan", "耳穴诊断", "望、压、电测三种方法各自的限度", [("zhenjiu-xue", ["诊断", "阳性", "压痛"]), ("zhenjiu-zhiliao", ["辨证"])], 5),
   (5, "05-zhiliao-fangfa", "耳穴治疗方法", "针、压丸、埋豆、放血：刺激量差别很大", [("cifa-jiufa", ["耳针", "埋豆", "压丸", "放血"]), ("zhenjiu-xue", ["耳穴"])], 5),
   (6, "06-neike-yingyong", "耳穴在内科的应用", "从失眠、疼痛到功能性胃肠病", [("zhenjiu-zhiliao", ["失眠", "胃", "痛", "眩晕"]), ("zhenjiu-xue", ["耳穴"])], 5),
   (7, "07-fuer-wuguan", "耳穴在妇儿与五官的应用", "人群不同，禁忌与刺激量都要改", [("zhenjiu-zhiliao", ["月经", "小儿", "眼", "鼻", "耳"]), ("zhenjiu-xue", ["耳穴"])], 5),
   (8, "08-anquan-guifan", "耳穴操作安全与规范", "软骨感染是这门技术最实在的风险", [("cifa-jiufa", ["消毒", "感染", "禁忌"]), ("zhenjiu-xue", ["耳", "禁忌"])], 5),
  ]},

 "zhendao-yixue": {
  "dept": "departments/03-zhenjiu/13-zhendao-yixue",
  "title": "针刀医学",
  "views": {"器械与操作": ["针刀", "刀", "进针", "松解", "操作", "角度", "深度"],
            "病理与解剖": ["粘连", "瘢痕", "挛缩", "解剖", "软组织", "力学", "筋膜", "肌腱", "韧带", "肌"],
            "病证与安全": ["痛", "颈", "肩", "腰", "膝", "禁忌", "并发症"]},
  "levels": {"颈肩腰腿": ["颈", "肩", "腰", "腿", "痛"],
             "关节腱鞘": ["膝", "踝", "肘", "腕", "腱鞘", "关节"],
             "神经卡压": ["神经", "卡压", "麻木", "放射"],
             "安全边界": ["禁忌", "并发症", "感染", "出血", "神经损伤"]},
  "plan": [
   (1, "01-zhendao-gailun", "针刀医学概论", "「针」与「刀」合一的器械，风险也随之合一", [("cifa-jiufa", ["针具", "刺法", "操作"]), ("zhenjiu-zhiliao", ["软组织"])], 5),
   (2, "02-qixie-guifan", "器械、进针与操作规范", "刀口方向是这门技术的第一条纪律", [("cifa-jiufa", ["进针", "角度", "深度", "消毒"]), ("shuxue", ["定位", "层次"])], 5),
   (3, "03-ruanzuzhi-bingli", "软组织解剖与病理", "粘连、瘢痕、挛缩：三种可触的病理", [("zhenjiu-zhiliao", ["软组织", "粘连", "挛缩"]), ("tuina", ["肌肉", "筋膜"])], 5),
   (4, "04-jingjian-yaotui", "颈肩腰腿痛", "针刀最主要的适应证群", [("zhenjiu-zhiliao", ["颈", "肩", "腰", "痛"]), ("zhiliao", ["腰痛", "颈椎"])], 5),
   (5, "05-guanjie-jianqiao", "关节与腱鞘疾病", "膝、踝、肘、腕：进针点与安全三角", [("zhenjiu-zhiliao", ["膝", "踝", "肘", "腕", "腱鞘"]), ("gubing", ["关节"])], 5),
   (6, "06-shenjing-kaya", "神经卡压", "麻木与放射痛要追问到具体神经", [("zhenjiu-zhiliao", ["神经", "麻木", "放射"]), ("zhenjiu-xue", ["神经"])], 5),
   (7, "07-anquan-jinji", "安全性：禁忌与并发症", "感染、出血、神经损伤三件事必须写死", [("cifa-jiufa", ["禁忌", "意外", "感染"]), ("zhenjiu-zhiliao", ["禁忌"])], 5),
   (8, "08-liaoxiao-zhengju", "疗效评价与循证", "针刀的证据基础目前薄在哪里", [("shiyan-zhenjiu", ["证据", "研究", "评价"]), ("zhenjiu-zhiliao", ["疗效"])], 5),
  ]},

 "zhenjiu-zhentong-mazui": {
  "dept": "departments/03-zhenjiu/14-zhenjiu-zhentong-mazui",
  "title": "针灸镇痛与麻醉",
  "views": {"镇痛机制": ["镇痛", "内啡肽", "闸门", "通路", "递质", "机制"],
            "刺激参数": ["电针", "频率", "强度", "参数", "留针", "刺激量"],
            "临床与安全": ["术后", "麻醉", "疼痛", "评估", "禁忌", "不良反应"]},
  "levels": {"急性痛": ["急性", "术后", "创伤", "手术"],
             "慢性痛": ["慢性", "腰痛", "头痛", "神经病理性", "反复"],
             "针刺麻醉": ["针刺麻醉", "辅助", "麻醉", "围手术"],
             "评估与安全": ["评估", "量表", "VAS", "不良反应", "禁忌"]},
  "plan": [
   (1, "01-tengtong-shengli", "疼痛生理与评估", "先能说清「痛在哪一层」", [("shiyan-zhenjiu", ["疼痛", "镇痛", "评估"]), ("zhenjiu-zhiliao", ["痛证", "疼痛"])], 5),
   (2, "02-zhentong-jizhi", "针刺镇痛机制", "闸门、内源性阿片、下行抑制", [("shiyan-zhenjiu", ["镇痛", "内啡肽", "闸门", "机制"]), ("zhenjiu-xue", ["镇痛"])], 6),
   (3, "03-dianzhen-canshu", "电针参数与量效", "频率与强度是唯一可调的两个把手", [("cifa-jiufa", ["电针", "频率", "强度", "参数"]), ("shiyan-zhenjiu", ["电针"])], 5),
   (4, "04-jixing-tong", "急性痛与术后镇痛", "术后是最容易被验证的场景", [("zhenjiu-zhiliao", ["急性", "术后", "痛"]), ("shiyan-zhenjiu", ["术后"])], 5),
   (5, "05-manxing-tong", "慢性痛", "腰痛、头痛、神经病理性疼痛", [("zhenjiu-zhiliao", ["腰痛", "头痛", "慢性", "神经"]), ("zhenjiu-xue", ["痛证"])], 6),
   (6, "06-zhenci-mazui", "针刺辅助麻醉", "不是替代全麻，是减少药量", [("cifa-jiufa", ["针刺麻醉", "麻醉"]), ("shiyan-zhenjiu", ["麻醉"])], 5),
   (7, "07-weishouqi", "围手术期应用", "术前焦虑、术后恶心、肠功能恢复", [("zhenjiu-zhiliao", ["术后", "恶心", "呕吐"]), ("kangfu-huli", ["术后"])], 5),
   (8, "08-anquan-zhengju", "安全与证据等级", "把「有效」与「证据充分」分开写", [("shiyan-zhenjiu", ["证据", "研究", "系统评价"]), ("zhenjiu-zhiliao", ["疗效"])], 5),
  ]},

 "zhongyi-kangfu-xue": {
  "dept": "departments/03-zhenjiu/15-zhongyi-kangfu-xue",
  "title": "中医康复学",
  "views": {"中医技术": ["针灸", "推拿", "中药", "导引", "气功", "艾灸", "拔罐"],
            "康复评定": ["评定", "辨证", "证候", "功能", "评估"],
            "调护与养生": ["饮食", "情志", "起居", "养生", "调护", "禁忌"]},
  "levels": {"中风与脑病": ["中风", "偏瘫", "失语", "脑"],
             "骨伤与疼痛": ["骨伤", "骨折", "腰痛", "颈", "关节"],
             "慢病与内科": ["糖尿病", "高血压", "慢阻肺", "心", "胃"],
             "社区与家庭": ["社区", "家庭", "随访", "长期", "照护"]},
  "plan": [
   (1, "01-zhongyi-kangfu-gailun", "中医康复学概论", "中医康复不是「针灸+锻炼」，是一套辨证—调护体系", [("zhenjiu-zhiliao", ["康复"]), ("zhongyi-yangsheng-xue", ["康复", "养生"])], 5),
   (2, "02-bianzheng-pingding", "辨证与功能评定", "证候与功能是两套坐标，必须同时记", [("zhenjiu-zhiliao", ["辨证", "证候"]), ("kangfu-huli", ["评定", "功能"])], 5),
   (3, "03-zhongyao-kangfu", "中药康复", "内服与外用两条路", [("linchuang-zhongyao", ["康复", "调补", "补益"]), ("zhongyao-xue", ["补虚"])], 5),
   (4, "04-zhenjiu-kangfu", "针灸康复", "取穴与疗程要跟着功能目标走", [("zhenjiu-zhiliao", ["康复", "中风", "偏瘫"]), ("cifa-jiufa", ["灸", "电针"])], 6),
   (5, "05-tuina-kangfu", "推拿康复", "手法是康复里最依赖人的一项", [("zhiliao", ["推拿", "手法", "康复"]), ("shoufa", ["手法"])], 5),
   (6, "06-qigong-kangfu", "气功导引康复", "呼吸与动作的自控训练", [("qigong", ["导引", "气功", "康复", "呼吸"])], 6),
   (7, "07-yinshi-qingzhi", "饮食与情志康复", "「忌口」与「安心」都有边界", [("zhongyi-yangsheng-xue", ["饮食", "情志", "起居"]), ("zhongyi-xinli-xue", ["情志"])], 5),
   (8, "08-zhongfeng-kangfu", "中风康复", "中医康复最成熟的一个病种", [("zhenjiu-zhiliao", ["中风", "偏瘫", "失语"]), ("kangfu-huli", ["中风", "偏瘫"])], 6),
   (9, "09-gushang-manbing", "骨伤与慢病康复", "骨折术后与糖尿病、高血压的功能维持", [("zhenjiu-zhiliao", ["骨伤", "腰痛", "颈"]), ("kangfu-huli", ["骨折", "慢病"])], 5),
   (10, "10-shequ-jiating", "社区与家庭康复", "把康复交到患者家里需要什么条件", [("shequ-huli-xue", ["社区", "家庭", "随访"]), ("zhongyi-huli-jishu", ["家庭", "护理"])], 5),
  ]},
}

PLANES = {
 "kangfu-yixue-jichu": {"评定与功能": [1, 2, 3], "生活与言语": [4, 5], "护理与并发症": [6], "社区与团队": [7, 8]},
 "wuli-zhiliao": {"物理因子": [1, 2, 3, 4], "运动疗法基础": [5], "训练技术": [6, 7], "方案与风险": [8]},
 "erxue-zhenduan-xue": {"理论与解剖": [1, 2, 3], "诊断": [4], "治疗与病证": [5, 6, 7], "安全规范": [8]},
 "zhendao-yixue": {"概论与器械": [1, 2], "病理与解剖": [3], "病证": [4, 5, 6], "安全与证据": [7, 8]},
 "zhenjiu-zhentong-mazui": {"机制与参数": [1, 2, 3], "疼痛临床": [4, 5], "麻醉与围术期": [6, 7], "安全与证据": [8]},
 "zhongyi-kangfu-xue": {"概论与评定": [1, 2], "中药与针灸": [3, 4], "推拿气功与调护": [5, 6, 7], "病种与社区": [8, 9, 10]},
}


def load(sub):
    p = os.path.join(S, sub, "units.json")
    return json.load(io.open(p, encoding="utf-8")) if os.path.exists(p) else None


def hanzi(s):
    return len(HANZI.findall(s or ""))


def measure(text, lv):
    return {k: sum(text.count(w) for w in ws) for k, ws in lv.items()}


def build(sub, cfg):
    plan = cfg["plan"]
    used, units = set(), []
    cfg["planes"] = PLANES[sub]
    probe = {"view": {k: 0 for k in cfg["views"]}, "A_part": {k: 0 for k in cfg["planes"]}}
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
                            "views": measure(prose, cfg["views"]), "levels": measure(prose, cfg["levels"])},
                "srcSub": parent, "source": f"{parent}:{u['locator']}"})
            for k, v in units[-1]["measure"]["views"].items():
                probe["view"][k] += v
            pass

    # 四位面：按章群结构分区（不用词频，避免被泛词支配）
    planes = cfg["planes"]
    for n in range(1, len(plan) + 1):
        hz = sum(u["hanzi"] for u in units if u["chapter"] == str(n))
        for pname, chs in planes.items():
            if n in chs:
                probe["A_part"][pname] += hz
    for u in units:
        ch = int(u["chapter"])
        u["measure"]["levels"] = {p: (u["hanzi"] if ch in chs else 0) for p, chs in planes.items()}

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
    json.dump({"note": "派生课：一章一主题，单元按关键词从父课选题；本课内无单元复用。",
               "chapters": {slug: {"n": n, "title": t, "units": [u["sub"] for u in units if u["chapter"] == str(n)],
                                   "srcChapters": [f"派生#{n}"], "why": why,
                                   "derivedFrom": "、".join(p for p, _ in srcs)}
                            for n, slug, t, why, srcs, K in plan}},
              io.open(os.path.join(out, "chapter-map.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"note": "三辨按主题词表现算；四位面＝章群结构分区（不用词频）。", "views": cfg["views"], "levelsA": cfg["planes"]},
              io.open(os.path.join(out, "axes.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    fb = {slug: [f"《{cfg['title']}·{t}》", "派生课：篇名为本课程章名，出处见 units.json 的 source 字段"]
          for n, slug, t, why, srcs, K in plan}
    json.dump({"courseTitle": cfg["title"], "deptPath": cfg["dept"],
               "xlsx": "派生课（无教材）：单元取自针灸系与护理系已建课程，见 units.json source",
               "chain": " → ".join(t for n, s, t, w, src, K in plan),
               "levelLabel": "观察视角", "objectPressure": "派生课的判断力来自把父课的片段重排成一条决策链",
               "reportRule": "父课教材与现行规范（须注明出处）", "gapNote": "无独立教材；未覆盖主题见各章 why 与 README",
               "chapterQ": {slug: [f"{t}的核心判据是什么", why] for n, slug, t, why, srcs, K in plan},
               "fallback": fb, "defaultCite": [f"《{cfg['title']}》", "派生课篇名"]},
              io.open(os.path.join(out, "doc-config.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    per_ch = {}
    for u in units:
        per_ch[int(u["chapter"])] = per_ch.get(int(u["chapter"]), 0) + u["hanzi"]
    lo = min(per_ch.items(), key=lambda kv: kv[1]) if per_ch else (0, 0)
    print(f"{sub}: {counts['chapters']} 章 / {counts['units']} 单元 / {counts['hanzi']:,} 汉字 · ratio {ratio} · 最薄章 {lo}")
    if missing:
        print("  缺父课:", sorted(set(missing)))


if __name__ == "__main__":
    for sub, cfg in COURSES.items():
        build(sub, cfg)
