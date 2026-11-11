# -*- coding: utf-8 -*-
"""管理系第一批：7 门 1:1 教材课 + 4 门合并教材课（解析 → 单元层 → 章目录/docs → README）。"""
import io
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY = sys.executable
DEPT = "departments/06-guanli"

JOBS = [
    # (subject, book, target, groups, titles|None, levels, chain, pressure, prefix)
    ("16-gonggong-guanli-xue", "公共管理学", 18, None, None,
     {"理论与组织": [1, 2, 3], "职能与政策": [4, 5, 6], "财政与供给": [7, 8, 9], "治理与专题": list(range(10, 19))},
     "理论 → 组织 → 政策 → 供给 → 绩效", "公共管理的判据是「谁授权、对谁负责、怎么评」三问，答不上就不是公共管理", "g"),
    ("17-guanli-xue-jichu", "管理学基础", 18, None, None,
     {"理论与决策": [1, 2, 3, 4], "计划与战略": [5, 6], "组织与人力": [7, 8, 9], "领导与控制": list(range(10, 19))},
     "决策 → 计划 → 组织 → 领导 → 控制", "管理的判据是「目标可量、责任到岗、偏差可纠」", "m"),
    ("18-guanli-xinli-xue", "管理心理学", 18, None, None,
     {"导论与人性假设": [1, 2, 3], "个体心理": [4, 5, 6, 7], "群体与沟通": [8, 9, 10, 11, 12], "领导与健康": list(range(13, 19))},
     "人性假设 → 个体 → 群体 → 领导 → 健康", "管理心理学的判据是「说得清行为、测得准差异、改得动环境」", "p"),
    ("20-weisheng-fa-xue", "卫生法学", 18, None, None,
     {"总论与法治": [1, 2, 3, 4], "机构与人员": [5, 6, 7], "药品与器械": [8, 9, 10], "公卫与救济": list(range(11, 19))},
     "原则 → 主体 → 行为 → 责任 → 救济", "卫生法学的判据是「找出义务主体与责任条款」，不是背条文", "f"),
    ("22-yiyao-renli-ziyuan", "医药人力资源管理", 18, None, None,
     {"规划与岗位": [1, 2, 3], "招培评": [4, 5, 6], "绩效薪酬": [7, 8, 9], "合规与趋势": list(range(10, 19))},
     "规划 → 招培 → 评价 → 激励 → 合规", "人力资源的判据是「岗位有说明书、绩效有证据、用工有合规」", "r"),
    ("23-yiyuan-kuaiji-caiwu", "医院会计与财务管理", 18, None, None,
     {"制度与会计": [1, 2, 3, 4], "资产与负债": [5, 6, 7], "成本与预算": [8, 9, 10], "内控与信息化": list(range(11, 19))},
     "制度 → 核算 → 成本 → 预算 → 内控", "财务的判据是「账实相符、钱从哪里来到哪里去说得清」", "k"),
    ("24-zhongyi-jiankang-guanli", "中医健康管理", 18, None, None,
     {"理论与辨识": [1, 2, 3, 4], "干预": [5, 6, 7, 8, 9], "服务与教育": [10, 11, 12, 13], "产业与研究": list(range(14, 19))},
     "辨识 → 干预 → 服务 → 产业", "健康管理的判据是「状态说得清、干预有依据、效果可复评」", "j"),
    ("04-weisheng-shiye-guanli", "卫生管理学", 8, "1-2,3-4,5-6,7-8,9-10,11-13,14-16,17-18",
     "卫生管理体制与组织体系|政策法规与资源配置|服务体系与分级诊疗|基层卫生与公共卫生|医疗与人力资源管理|财务·保障与药械|信息·绩效与监督|中医管理·国际比较",
     {"体制与政策": [1, 2], "体系与基层": [3, 4], "资源与保障": [5, 6], "绩效与专题": [7, 8]},
     "体制 → 体系 → 资源 → 绩效", "卫生事业管理的判据是「谁管、管什么、拿什么评」，不是口号", "w"),
    ("06-yiyuan-guanli-xue", "医院管理学", 10, "1-2,3-4,5-6,7-8,9-10,11-12,13-14,15-16,17-18,19-20",
     "绪论与基本原理|组织与人力资源|医疗与护理管理|药事·医技与感染|质量与财务管理|绩效与信息|后勤设备与科教|战略与风险|文化与中医医院|社区服务与数字医院",
     {"基础与组织": [1, 2], "业务与质量": [3, 4, 5], "绩效与后勤": [6, 7], "战略与专题": [8, 9, 10]},
     "组织 → 业务 → 质量 → 绩效 → 战略", "医院管理的判据是「流程有人负责、质量有指标、风险有预案」", "y"),
    ("09-yiliao-baoxian-jingji", "卫生经济学", 8, "1,2-3,4-5,6-7,8-9,10-11,12-14,15-18",
     "导论：健康与经济|需求与供给|市场与政府作用|筹资与卫生总费用|医疗保险的经济学分析|价格与成本核算|经济学评价与药物经济学|资源配置·政策·中医与智能",
     {"需求与供给": [1, 2], "筹资与保险": [3, 4], "价格与评价": [5, 6], "政策与专题": [7, 8]},
     "需求 → 供给 → 筹资 → 评价", "卫生经济的判据是「花了多少、换来什么、跟谁比」", "e"),
    ("10-yixue-xinxi-guanli", "卫生信息管理", 8, "1-2,3-4,5-6,7,8-9,10-11,12-14,15-18",
     "导论与数据资源|标准编码与法规伦理|系统与电子病历|信息安全管理|技术与资源检索|统计分析与病案|项目管理与决策支持|规划·中医信息化·智慧医疗",
     {"资源与标准": [1, 2], "系统与安全": [3, 4], "技术与数据": [5, 6, 7], "规划与专题": [8]},
     "资源 → 标准 → 系统 → 服务", "信息管理的判据是「数据可溯源、标准可对齐、系统可交接」", "i"),
]


def run(cmd):
    r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")
    out = (r.stdout or r.stderr).strip().splitlines()
    return out[-1] if out else ""


ONLY={"04-weisheng-shiye-guanli","09-yiliao-baoxian-jingji","10-yixue-xinxi-guanli"}
for (sub, book, target, groups, titles, levels, chain, pressure, prefix) in JOBS:
    if sub not in ONLY:
        continue
    xlsx = f"F:/textbooks/qhzy-{book}.xlsx"
    cmd = [PY, "scripts/build_guanli_course.py", sub, xlsx, str(target),
           "--views", json.dumps({"制度与规则": ["制度", "政策", "法规", "规定", "标准", "职责"],
                                  "组织与流程": ["组织", "流程", "部门", "岗位", "运行", "协作"],
                                  "绩效与评价": ["绩效", "评价", "指标", "成本", "质量", "效率"]}, ensure_ascii=False),
           "--levels", json.dumps(levels, ensure_ascii=False)]
    if groups:
        cmd += ["--groups", groups]
    if titles:
        cmd += ["--titles", titles]
    print(run(cmd))
    r2 = run([PY, "scripts/make_outline_course.py", sub, f"{DEPT}/{sub}", book, prefix, chain, pressure])
    print("  ", r2)
