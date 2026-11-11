# -*- coding: utf-8 -*-
"""管理系第二批：9 门合成课（材料取自本系已建 12 门 + 智能/中医既有单元层）。"""
import io
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")

V = {"制度与规则": ["制度", "政策", "法规", "规定", "标准", "职责"],
     "组织与流程": ["组织", "流程", "部门", "岗位", "运行", "协作"],
     "绩效与评价": ["绩效", "评价", "指标", "成本", "质量", "效率"]}

PLANS = {
    "02-zhongyiyao-zhengce-fagui": {
        "title": "中医药政策法规",
        "note": "合成课：法条与制度侧取《卫生法学》（本系 20 课），政策与治理侧取《卫生管理学》（04 课）；中医药专项取卫生法学第 13 章。",
        "levels": {"法理与体系": [1, 2], "主体与行为": [3, 4], "药械与公卫": [5, 6], "中医药与救济": [7, 8]},
        "chapters": [
            {"title": "卫生法与中医药法的法理基础", "picks": [["20-weisheng-fa-xue", 1], ["20-weisheng-fa-xue", 2]]},
            {"title": "立法、执法与行政责任", "picks": [["20-weisheng-fa-xue", 3], ["20-weisheng-fa-xue", 4]]},
            {"title": "机构与人员管理制度", "picks": [["20-weisheng-fa-xue", 5], ["20-weisheng-fa-xue", 6]]},
            {"title": "医疗行为与质量安全", "picks": [["20-weisheng-fa-xue", 7], ["20-weisheng-fa-xue", 8]]},
            {"title": "药品、器械与消毒产品监管", "picks": [["20-weisheng-fa-xue", 9], ["20-weisheng-fa-xue", 10]]},
            {"title": "公共卫生与健康促进法制", "picks": [["20-weisheng-fa-xue", 11], ["20-weisheng-fa-xue", 12]]},
            {"title": "中医药法律制度与政策工具", "picks": [["20-weisheng-fa-xue", 13], ["04-weisheng-shiye-guanli", 2]]},
            {"title": "新兴技术立法与权益救济", "picks": [["20-weisheng-fa-xue", 15], ["20-weisheng-fa-xue", 16]]},
        ],
    },
    "03-zhongyi-guanli-xue": {
        "title": "中医管理学",
        "note": "合成课：管理原理取《管理学基础》（17 课），卫生体制与中医专项取《卫生事业管理》（04 课）与《医院管理学》（06 课）的中医章。",
        "levels": {"原理与决策": [1, 2], "组织与人力": [3, 4], "质量与绩效": [5, 6], "中医专项": [7, 8]},
        "chapters": [
            {"title": "中医机构的管理原理", "picks": [["17-guanli-xue-jichu", 1], ["17-guanli-xue-jichu", 3]]},
            {"title": "中医机构的决策与计划", "picks": [["17-guanli-xue-jichu", 4], ["17-guanli-xue-jichu", 5]]},
            {"title": "组织设计与人力资源", "picks": [["17-guanli-xue-jichu", 7], ["17-guanli-xue-jichu", 9]]},
            {"title": "领导、激励与沟通", "picks": [["17-guanli-xue-jichu", 10], ["17-guanli-xue-jichu", 11]]},
            {"title": "质量控制与绩效评价", "picks": [["17-guanli-xue-jichu", 13], ["04-weisheng-shiye-guanli", 7]]},
            {"title": "中医药机构的管理专题", "picks": [["17-guanli-xue-jichu", 17], ["06-yiyuan-guanli-xue", 9]]},
            {"title": "中医医院的运行管理", "picks": [["06-yiyuan-guanli-xue", 3], ["06-yiyuan-guanli-xue", 5]]},
            {"title": "中医政策与治理趋势", "picks": [["04-weisheng-shiye-guanli", 1], ["04-weisheng-shiye-guanli", 8]]},
        ],
    },
    "05-zhongyi-wenhua-chuanbo": {
        "title": "中医文化传播",
        "note": "合成课：史料侧取《中国医学史》（中医系 03 课，8 章 94,294 字）的医家、典籍与近现代章；传播方法侧取《卫生信息管理》（10 课）的资源与检索章。库内无传播学教材，已在缺口登记声明。",
        "levels": {"源流与典籍": [1, 2], "近现代与制度": [3], "传播与检索": [4, 5], "当代与边界": [6]},
        "chapters": [
            {"title": "中医文化的源流：从先秦到汉唐", "picks": [["zhongguo-yixue-shi", 1], ["zhongguo-yixue-shi", 2]]},
            {"title": "典籍与医家：可传播的内容从哪来", "picks": [["zhongguo-yixue-shi", 3]]},
            {"title": "近现代转型与制度化", "picks": [["zhongguo-yixue-shi", 5], ["zhongguo-yixue-shi", 6]]},
            {"title": "信息组织与检索：把典籍变成可查资源", "picks": [["10-yixue-xinxi-guanli", 1], ["10-yixue-xinxi-guanli", 5]]},
            {"title": "传播内容的标准与证据", "picks": [["10-yixue-xinxi-guanli", 2], ["zhongguo-yixue-shi", 7]]},
            {"title": "当代传播与边界：不神化、不虚构", "picks": [["zhongguo-yixue-shi", 8]]},
        ],
    },
    "08-jiankang-fuwu-guanli": {
        "title": "健康服务管理",
        "note": "合成课：公共服务与供给侧取《公共管理学》（16 课）的公共服务、基层治理与绩效章；卫生体系侧取《卫生事业管理》（04 课）。",
        "levels": {"供给与体系": [1, 2], "基层与社区": [3, 4], "绩效与质量": [5, 6], "改革与协同": [7, 8]},
        "chapters": [
            {"title": "健康服务的供给主体", "picks": [["16-gonggong-guanli-xue", 9], ["04-weisheng-shiye-guanli", 3]]},
            {"title": "分级诊疗与服务体系", "picks": [["04-weisheng-shiye-guanli", 3], ["04-weisheng-shiye-guanli", 4]]},
            {"title": "基层与社区健康服务", "picks": [["16-gonggong-guanli-xue", 16], ["04-weisheng-shiye-guanli", 4]]},
            {"title": "公共卫生服务管理", "picks": [["04-weisheng-shiye-guanli", 4], ["16-gonggong-guanli-xue", 11]]},
            {"title": "服务质量与绩效评价", "picks": [["16-gonggong-guanli-xue", 10], ["04-weisheng-shiye-guanli", 7]]},
            {"title": "支付方式与激励机制", "picks": [["04-weisheng-shiye-guanli", 6], ["16-gonggong-guanli-xue", 8]]},
            {"title": "健康服务改革与政策", "picks": [["16-gonggong-guanli-xue", 4], ["16-gonggong-guanli-xue", 17]]},
            {"title": "多部门协同与应急", "picks": [["16-gonggong-guanli-xue", 11], ["04-weisheng-shiye-guanli", 8]]},
        ],
    },
    "11-yiyuan-xinxihua-bingan": {
        "title": "医院信息化与病案",
        "note": "合成课：系统与病案侧取《卫生信息管理》（10 课）的系统、电子病历、病案与标准章。",
        "levels": {"系统与标准": [1, 2], "病历与病案": [3, 4], "数据与质量": [5, 6], "建设与治理": [7, 8]},
        "chapters": [
            {"title": "医院信息系统的构成", "picks": [["10-yixue-xinxi-guanli", 3]]},
            {"title": "标准、编码与互操作", "picks": [["10-yixue-xinxi-guanli", 2]]},
            {"title": "电子病历与临床信息系统", "picks": [["10-yixue-xinxi-guanli", 3]]},
            {"title": "病案管理与首页数据", "picks": [["10-yixue-xinxi-guanli", 6]]},
            {"title": "数据质量与统计上报", "picks": [["10-yixue-xinxi-guanli", 6], ["01-yixue-tongjixue", 1]]},
            {"title": "信息安全与权限", "picks": [["10-yixue-xinxi-guanli", 4]]},
            {"title": "项目实施与验收", "picks": [["10-yixue-xinxi-guanli", 7]]},
            {"title": "智慧医院与规划", "picks": [["10-yixue-xinxi-guanli", 8]]},
        ],
    },
    "12-zhongyiyao-biaozhunhua": {
        "title": "中医药标准化",
        "note": "合成课：标准与编码侧取《卫生信息管理》（10 课）第 2 章，术语与知识组织侧取《中医知识图谱》（05 课）与《中医信息学》（17 智能课）。库内无标准化专书，已在缺口登记声明。",
        "levels": {"标准与术语": [1, 2], "数据元与编码": [3, 4], "知识组织": [5, 6], "实施与评价": [7, 8]},
        "chapters": [
            {"title": "标准化的对象：从术语到数据元", "picks": [["10-yixue-xinxi-guanli", 2]]},
            {"title": "标准体系与层级", "picks": [["10-yixue-xinxi-guanli", 2], ["zhongyi-xinxi-xue", 3]]},
            {"title": "编码与分类", "picks": [["zhongyi-xinxi-xue", 2]]},
            {"title": "数据元与元数据", "picks": [["zhongyi-xinxi-xue", 3]]},
            {"title": "知识组织与本体", "picks": [["zhongyi-zhishishu", 1], ["zhongyi-zhishishu", 2]]},
            {"title": "映射与对齐", "picks": [["zhongyi-zhishishu", 3], ["zhongyi-zhishishu", 4]]},
            {"title": "标准落地：系统与流程", "picks": [["10-yixue-xinxi-guanli", 3], ["10-yixue-xinxi-guanli", 7]]},
            {"title": "标准评价与合规", "picks": [["10-yixue-xinxi-guanli", 4], ["10-yixue-xinxi-guanli", 8]]},
        ],
    },
    "13-linchuang-keyan-fangfa": {
        "title": "临床科研方法",
        "note": "合成课：设计与统计侧取《医学统计学》（01 课），研究流程侧取《卫生信息管理》（10 课）的项目管理与数据章。",
        "levels": {"问题与设计": [1, 2], "抽样与测量": [3, 4], "统计与推断": [5, 6], "报告与复现": [7, 8]},
        "chapters": [
            {"title": "从临床问题到可检验假设", "picks": [["01-yixue-tongjixue", 1]]},
            {"title": "研究设计与对照", "picks": [["01-yixue-tongjixue", 4]]},
            {"title": "抽样、样本量与测量", "picks": [["01-yixue-tongjixue", 3]]},
            {"title": "偏倚与质量控制", "picks": [["01-yixue-tongjixue", 2]]},
            {"title": "统计检验的选择", "picks": [["01-yixue-tongjixue", 5], ["01-yixue-tongjixue", 6]]},
            {"title": "关联与回归模型", "picks": [["01-yixue-tongjixue", 7], ["01-yixue-tongjixue", 8]]},
            {"title": "多重比较与可复现", "picks": [["01-yixue-tongjixue", 9], ["01-yixue-tongjixue", 10]]},
            {"title": "数据管理与项目执行", "picks": [["10-yixue-xinxi-guanli", 7]]},
        ],
    },
    "19-shehui-yixue": {
        "title": "社会医学",
        "note": "合成课：社会与政策侧取《公共管理学》（16 课），卫生体系与健康决定因素侧取《卫生事业管理》（04 课），测量侧取《医学统计学》（01 课）。库内无社会医学教材，已在缺口登记声明。",
        "levels": {"社会与健康": [1, 2, 3, 4], "体系与政策": [5, 6, 7, 8, 9], "测量与评价": [10, 11, 12, 13], "干预与治理": list(range(14, 19))},
        "chapters": [
            {"title": "社会医学的对象与方法", "picks": [["04-weisheng-shiye-guanli", 1]]},
            {"title": "健康的社会决定因素", "picks": [["16-gonggong-guanli-xue", 9]]},
            {"title": "社会分层与健康公平", "picks": [["16-gonggong-guanli-xue", 4]]},
            {"title": "行为、生活方式与健康", "picks": [["24-zhongyi-jiankang-guanli", 1]]},
            {"title": "卫生服务体系与社会", "picks": [["04-weisheng-shiye-guanli", 3]]},
            {"title": "基层与社区卫生", "picks": [["04-weisheng-shiye-guanli", 4]]},
            {"title": "医疗保障与社会救助", "picks": [["09-yiliao-baoxian-jingji", 5]]},
            {"title": "卫生政策的社会过程", "picks": [["04-weisheng-shiye-guanli", 2]]},
            {"title": "卫生资源与公平配置", "picks": [["04-weisheng-shiye-guanli", 3]]},
            {"title": "健康测量的指标体系", "picks": [["01-yixue-tongjixue", 2]]},
            {"title": "调查设计与抽样", "picks": [["01-yixue-tongjixue", 3]]},
            {"title": "生命统计与疾病统计", "picks": [["01-yixue-tongjixue", 9]]},
            {"title": "评价方法与经济学视角", "picks": [["09-yiliao-baoxian-jingji", 7]]},
            {"title": "健康促进与干预", "picks": [["24-zhongyi-jiankang-guanli", 12]]},
            {"title": "社区干预的组织", "picks": [["16-gonggong-guanli-xue", 16]]},
            {"title": "弱势人群与健康照护", "picks": [["04-weisheng-shiye-guanli", 5]]},
            {"title": "社会医学与中医", "picks": [["24-zhongyi-jiankang-guanli", 14]]},
            {"title": "治理与改革趋势", "picks": [["16-gonggong-guanli-xue", 17]]},
        ],
    },
    "21-yixue-lunli-xue": {
        "title": "医学伦理学",
        "note": "合成课：伦理与法治侧取《卫生法学》（20 课）的生命伦理与权益救济章，数据与隐私伦理取《医学数据安全与隐私》（14 智能课），机构治理取（04 课）。库内无伦理学教材，已在缺口登记声明。",
        "levels": {"原则与历史": [1, 2, 3], "临床伦理": [4, 5, 6, 7], "研究伦理": [8, 9, 10, 11], "数据与治理": [12, 13, 14, 15, 16, 17, 18]},
        "chapters": [
            {"title": "伦理学的对象：从德性到规范", "picks": [["20-weisheng-fa-xue", 1]]},
            {"title": "生命伦理四原则", "picks": [["20-weisheng-fa-xue", 15]]},
            {"title": "知情同意与代理决定", "picks": [["20-weisheng-fa-xue", 15], ["14-yixue-shuju-anquan-yinsi", 4]]},
            {"title": "医患关系与告知义务", "picks": [["20-weisheng-fa-xue", 7]]},
            {"title": "隐私与保密", "picks": [["14-yixue-shuju-anquan-yinsi", 4]]},
            {"title": "医疗差错与道歉", "picks": [["20-weisheng-fa-xue", 8]]},
            {"title": "资源分配与公平", "picks": [["20-weisheng-fa-xue", 12]]},
            {"title": "研究伦理与伦理审查", "picks": [["14-yixue-shuju-anquan-yinsi", 4]]},
            {"title": "受试者保护与风险最小化", "picks": [["14-yixue-shuju-anquan-yinsi", 5]]},
            {"title": "动物与替代方法", "picks": [["14-yixue-shuju-anquan-yinsi", 5]]},
            {"title": "利益冲突与科研诚信", "picks": [["20-weisheng-fa-xue", 15]]},
            {"title": "健康数据伦理", "picks": [["14-yixue-shuju-anquan-yinsi", 8]]},
            {"title": "算法与 AI 伦理", "picks": [["14-yixue-shuju-anquan-yinsi", 3]]},
            {"title": "中医伦理传统", "picks": [["20-weisheng-fa-xue", 13]]},
            {"title": "机构伦理委员会", "picks": [["04-weisheng-shiye-guanli", 5]]},
            {"title": "伦理与法律的边界", "picks": [["20-weisheng-fa-xue", 2]]},
            {"title": "救济与责任", "picks": [["20-weisheng-fa-xue", 16]]},
            {"title": "伦理治理趋势", "picks": [["14-yixue-shuju-anquan-yinsi", 7]]},
        ],
    },
}

for sub, plan in PLANS.items():
    plan.setdefault("views", V)
    os.makedirs(os.path.join(S, sub), exist_ok=True)
    json.dump(plan, io.open(os.path.join(S, sub, "plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    r = subprocess.run([sys.executable, "scripts/build_mixed.py", sub], cwd=ROOT, capture_output=True,
                       text=True, encoding="utf-8", errors="replace")
    out = (r.stdout or r.stderr).strip().splitlines()
    print(out[-1] if out else f"{sub}: 无输出")
