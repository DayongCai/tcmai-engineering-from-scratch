#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_biye_cside.py —— C 端渠道与合规口径

上一版 27 案全是对机构（B 端）。本层补两件事：
  1. 每个案例给出「C 端可为／不可为」的判定与理由（27 条，逐案）；
  2. 对可为的 10 案，按独立的 C 端预算口径算一遍（客单、转化、获客、分成、退款）。

合规四问（依据已核，条款写在 合规口径.json）：
  器械  《人工智能医用软件产品分类界定指导原则》（2021 年第 47 号）：
        辅助决策（给出诊断／用药／治疗计划）→ 三类；非辅助决策（处理与测量）→ 二类；
        因此「AI 舌诊自测能不能说诊断」不是口味问题，是注册类别问题。
  广告  《广告法》第十六条：医疗、药品、医疗器械广告不得含功效／安全性的断言或保证，
        不得用代言人作推荐证明；第四十六条：发布前须经审查。
  个保  《个人信息保护法》第二十八条（医疗健康属敏感个人信息）、第二十九条（单独同意）。
  诊疗  《互联网诊疗管理办法（试行）》：不得对首诊患者开展互联网诊疗；
        《互联网诊疗监管细则（试行）》第十八条：须提供明确诊断的病历资料，由医师判断是否符合复诊条件。

结论口径：**C 端能做的是「测量与记录」，不是「诊断与处方」。** 越过这条线，先补注册，再谈定价。
"""
import json, os, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'standards', 'biye')

LAW = {
    "S12": {"name": "《人工智能医用软件产品分类界定指导原则》（国家药监局 2021 年第 47 号）",
            "key": "辅助决策→三类；非辅助决策（数据处理与测量）→二类"},
    "S13": {"name": "《中华人民共和国广告法》第十六条、第四十六条",
            "key": "医疗／药品／医疗器械广告不得含功效或安全性的断言或保证；发布前须审查"},
    "S14": {"name": "《中华人民共和国个人信息保护法》第二十八条、第二十九条",
            "key": "医疗健康属敏感个人信息；处理须取得单独同意"},
    "S15": {"name": "《互联网诊疗管理办法（试行）》《互联网诊疗监管细则（试行）》第十八条",
            "key": "不得对首诊患者开展互联网诊疗；须有明确诊断的病历资料方可复诊"},
}

CPARAMS = {
    "付费转化率": 0.02,      # 注册用户 → 付费用户
    "CAC": 80,               # 元/付费用户（线上投放，含内容制作）
    "渠道分成": 0.3,         # 小程序／应用商店抽成
    "退款与纠纷率": 0.05,
    "合规一次性": 150000,    # 元：二类器械注册或算法备案 + 隐私合规整改（可不做的方案则为 0）
    "说明": "C 端参数与 B 端分开：客单低、转化低、获客贵、抽成高。器械类若需注册，一次性成本单列。",
}

# slug → (是否可做 C 端, 形态, 客单元/年, 三年注册用户, 合规结论, 理由, 是否需器械注册)
C = {
'02-zhongyi-zhenghou-paisheng': (True, "个人体质—证候自测（只给测量结果与就医建议，不给诊断与处方）", 99, 60000,
    "仅测量：不做诊断、不推荐处方；不宣称疗效", "C 端用户最想「知道自己是什么证」，但只能给测量与解释，越线即涉诊疗", False),
'03-zhongyi-xuepai-cibiao': (True, "学派词表课（知识付费 12 讲，附可复算讲义）", 199, 8000,
    "科普与教育，不涉诊疗与器械", "内容型产品，合规压力最小；客单高于工具型", False),
'04-zhongyi-zhexue-fanchou': (True, "内经范畴检索年卡（含图表导出）", 69, 20000,
    "知识服务，不涉诊疗", "研究型用户愿意为「可引用的图表」付费", False),
'05-zhongyao-xingzhuang-jiexi': (False, "—", 0, 0,
    "不做：药表对个人无直接价值", "C 端买不到「API」，药名查询已有免费替代", False),
'06-zhongyao-fangji-yaowei': (False, "—", 0, 0,
    "不做：集采与配方核账属机构流程", "个人无法使用配伍对账", False),
'07-zhongyao-yaoli-nandu': (True, "药理难点精讲订阅（按章节付费）", 129, 30000,
    "教育服务，不涉诊疗", "备考人群规模大，失效清单可做差异化卖点", False),
'08-zhenjiu-jingluo-diben': (True, "经络学 40 讲训练营（含底本对照练习）", 299, 15000,
    "教育培训，不涉诊疗", "基层从业者与爱好者的培训付费意愿强", False),
'09-zhenjiu-shuxue-guishu': (False, "—", 0, 0,
    "不做：冲突表服务对象是标准与器械方", "个人无使用场景", False),
'10-zhenjiu-zhishishu-guadian': (False, "—", 0, 0,
    "不做：挂点服务属图谱团队工作流", "个人用户不需要挂点", False),
'11-gushang-gubing-qianyi': (False, "—", 0, 0,
    "不做：专科路径属机构建设内容", "个人不需要科室路径模板", False),
'12-gushang-chuangshang-shijianchuang': (False, "—", 0, 0,
    "不做：时间窗提醒若面向个人即构成急救指导，风险最高", "C 端急救提示一旦延误，责任无法承担", False),
'13-gushang-kangfu-pingding': (True, "居家康复自评（量表自填＋趋势记录，不替代评估）", 159, 25000,
    "仅记录与自评：不做诊断、不调整治疗方案", "术后人群有长期记录需求；越线做「康复方案」即涉诊疗", False),
'14-huli-pinggu-diben': (False, "—", 0, 0,
    "不做：护理问题映射属护理部与排班系统", "个人无对应角色", False),
'15-huli-jiaoban-sbar': (False, "—", 0, 0,
    "不做：交接记录属院内流程", "个人无使用场景", False),
'16-huli-yangsheng-fangan': (True, "养生「忌」清单订阅（按体质出忌宜清单＋打卡）", 99, 80000,
    "健康管理，不宣称疗效；不得出现「治疗」「根治」等表述", "药食同源与养生付费成熟，但文案是最大风险点", False),
'17-guanli-tongji-diben': (False, "—", 0, 0,
    "不做：报表口径属管理职能", "个人无使用场景", False),
'18-guanli-fugaidu-baobiao': (False, "—", 0, 0,
    "不做：院校诊断报告是 B 端交付", "个人不订阅覆盖率报表", False),
'19-guanli-zhengce-guadian': (True, "政策合规库个人版（检索＋条款解读）", 299, 6000,
    "信息服务，不涉诊疗", "医院合规岗与咨询顾问会自费订阅", False),
'20-zhineng-icd-jiansuo': (False, "—", 0, 0,
    "不做：编码检索属病案与结算系统", "个人不需要 TM1 编码", False),
'21-zhineng-yuyi-zhangliang': (False, "—", 0, 0,
    "不做：表示层检验是研发工具", "个人无使用场景", False),
'22-zhineng-zhibiao-shibai': (False, "—", 0, 0,
    "不做：失效包是采购与验收材料", "个人不采购可审计包", False),
'23-wuguan-mianbu-wangzhen': (True, "舌面象自测（拍照记录＋趋势，明确「非诊断」）", 199, 100000,
    "仅测量与记录：若做「辨证结论」须按二类器械注册（S12）", "拍照记录需求真实，但一旦输出诊断即需注册，成本 15 万起", True),
'24-wuguan-fangji-shai': (False, "—", 0, 0,
    "不做：选品依据是药企与药房工具", "个人不买选品报告", False),
'25-wuguan-guangxue-canliang': (True, "视力与用眼记录（自测趋势，不替代验光）", 79, 50000,
    "仅记录：不得给屈光度诊断结论", "家长群体刚性需求，但「测度数」极易越线", False),
'26-jichu-bingli-diben': (False, "—", 0, 0,
    "不做：课程底本属院校交付", "个人不订阅底本层", False),
'27-jichu-bingsheng-jiuzhou': (False, "—", 0, 0,
    "不做：轴覆盖诊断是教学管理工具", "个人无使用场景", False),
'28-jichu-shengli-zhengchangzhi': (True, "化验单解读订阅（只做参考区间解释，不给诊断）", 129, 70000,
    "仅解释参考区间：不得对个体作诊断结论；引用须标版本与单位", "体检后查报告是高频场景，单位换算是真实痛点", False),
}


def cside(price, users, need_device, nickname=""):
    p = CPARAMS
    paid = int(users * p['付费转化率'])
    gross = paid * price
    net = gross * (1 - p['渠道分成']) * (1 - p['退款与纠纷率'])
    cac = paid * p['CAC']
    dev = p['合规一次性'] if need_device else 0
    return {"客单": price, "注册用户": users, "付费用户": paid, "付费转化率": p['付费转化率'],
            "渠道分成": p['渠道分成'], "退款率": p['退款与纠纷率'], "CAC": p['CAC'],
            "毛收入": gross, "净收入": round(net), "获客成本": cac,
            "合规一次性": dev, "年净贡献": round(net - cac - dev),
            "获客成本占比": None if net == 0 else round(cac / net * 100, 1)}


def main():
    mk = json.load(open(os.path.join(OUT, '市场层.json'), encoding='utf-8'))
    cases = mk['cases']
    tot = {"可为": 0, "不可为": 0, "需器械注册": 0, "C端净收入合计": 0, "C端获客合计": 0, "C端合规一次性合计": 0}
    for slug, (ok, form, price, users, concl, why, need_dev) in C.items():
        c = cases[slug]
        if ok:
            b = cside(price, users, need_dev)
            c['cside'] = {"可行": True, "形态": form, "合规结论": concl, "理由": why,
                          "需器械注册": need_dev, "budget": b}
            tot['可为'] += 1
            tot['C端净收入合计'] += b['净收入']
            tot['C端获客合计'] += b['获客成本']
            tot['C端合规一次性合计'] += b['合规一次性']
            if need_dev:
                tot['需器械注册'] += 1
        else:
            c['cside'] = {"可行": False, "形态": "—", "合规结论": concl, "理由": why, "需器械注册": False}
            tot['不可为'] += 1
    mk['cparams'] = CPARAMS
    mk['law'] = LAW
    mk['ctotals'] = tot
    json.dump(mk, open(os.path.join(OUT, '市场层.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    json.dump({"subject": "22-zhongyi-biye-sheji",
               "what": "C 端渠道的四类合规口径与判定树；27 案逐案判定（可为 10／不可为 17）。",
               "laws": LAW,
               "tree": [
                   {"问": "输出的是「测量与记录」还是「诊断与用药」？",
                    "答测量": "按非辅助决策处理，一般无需器械注册，但文案不得暗示诊断",
                    "答诊断": "按辅助决策处理：三类；若仅提供临床参考信息则二类（S12）"},
                   {"问": "有没有对外宣传功效或安全性？", "答复否": "可；但需避开「治疗」「根治」「无副作用」等表述（S13）",
                    "答是": "不可：属违法广告，且发布前须审查（S13 第四十六条）"},
                   {"问": "是否采集舌象、面色、病历等健康数据？", "答复否": "常规隐私政策",
                    "答是": "属敏感个人信息：须单独同意、告知处理目的与方式（S14）"},
                   {"问": "是否给出线上诊疗或处方？", "答复否": "可",
                    "答是": "不可：不得对首诊开展互联网诊疗；复诊须有明确诊断病历并由医师判断（S15）"}],
               "conclusion": "C 端能做的是「测量与记录」，不是「诊断与处方」。越过这条线，先补注册，再谈定价。",
               "cparams": CPARAMS},
              open(os.path.join(OUT, '合规口径.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print(json.dumps(tot, ensure_ascii=False))
    for slug, v in [(s, cases[s]['cside']) for s in C]:
        if v['可行']:
            b = v['budget']
            print(f"{slug:34s} 客单{b['客单']:>4} 付费{b['付费用户']:>5} 净收入{b['净收入']:>9,} 获客{b['获客成本']:>8,} 器械{b['合规一次性']:>7,} 净贡献{b['年净贡献']:>9,}")


if __name__ == '__main__':
    main()
