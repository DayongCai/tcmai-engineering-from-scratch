# -*- coding: utf-8 -*-
"""智能系余下五门的合成课计划（04 NLP / 07 图像 / 10 大模型 / 11 机器人 / 12 数字人体）。

每门都是「单元逐字取自既有单元层」的合成课：locator 保留原出处，缺口登记里写明「无同名教材」。
"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S = os.path.join(ROOT, "standards")


def w(sub, plan):
    os.makedirs(os.path.join(S, sub), exist_ok=True)
    json.dump(plan, io.open(os.path.join(S, sub, "plan.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("plan", sub, len(plan["chapters"]), "章")


w("zhongyi-ziran-yuyan-chuli", {
    "title": "中医自然语言处理",
    "note": "合成课：文本侧取《中医信息学》《中医知识图谱》，模型侧取《机器学习》（概率图、半监督、规则学习、评估）。库内无 NLP 专书，分词/语言模型等章节为方法移植，已在缺口登记声明。",
    "views": {"文本与术语": ["文本", "术语", "分词", "标注", "语料", "实体"],
              "模型与推断": ["模型", "概率", "分类", "推断", "训练", "规则"],
              "评测与落地": ["评测", "召回", "精确", "一致", "落地", "边界"]},
    "levels": {"语料与术语": [1, 2], "模型与抽取": [3, 4, 5, 7], "检索与规则": [6, 8], "评测与边界": [9, 10]},
    "chapters": [
        {"title": "中医文本从哪来：语料、文体与噪声", "picks": [["zhongyi-xinxi-xue", 3]]},
        {"title": "分词、术语与规范化", "picks": [["zhongyi-zhishishu", 2]]},
        {"title": "语言模型与概率推断", "picks": [["jiqi-xuexi", 14]]},
        {"title": "文本分类：从词袋到判别", "picks": [["jiqi-xuexi", 3]]},
        {"title": "序列标注与标注成本", "picks": [["jiqi-xuexi", 13]]},
        {"title": "检索与排序", "picks": [["zhongyi-xinxi-xue", 4]]},
        {"title": "实体与关系抽取", "picks": [["zhongyi-zhishishu", 3]]},
        {"title": "规则与知识约束", "picks": [["jiqi-xuexi", 15]]},
        {"title": "评测：精确率、召回率与人工一致性", "picks": [["jiqi-xuexi", 2]]},
        {"title": "落地边界：能抽不能断", "picks": [["yixue-shuju-anquan-yinsi", 8]]},
    ],
})

w("yixue-tuxiang-shezhen", {
    "title": "医学图像识别",
    "note": "合成课：图像侧取《中医智能设备》（舌象/面象采集与质控），模型侧取《机器学习》（降维、神经网络、评估、集成）。临床影像不引入，见缺口登记。",
    "views": {"图像与采集": ["图像", "采集", "舌", "面", "像素", "质控"],
              "模型与训练": ["模型", "网络", "特征", "训练", "分类", "降维"],
              "评测与边界": ["评测", "误判", "一致", "标注", "可解释", "隐私"]},
    "levels": {"采集与质控": [1, 2], "特征与模型": [3, 4, 5], "稳健与标注": [6, 7, 8], "解释与边界": [9, 10]},
    "chapters": [
        {"title": "中医图像从哪来：舌象、面象与图谱", "picks": [["zhongyi-zhineng-yiqi", 4]]},
        {"title": "采集与质控：光照、色卡与重复性", "picks": [["zhongyi-zhineng-yiqi", 2]]},
        {"title": "图像特征与降维", "picks": [["jiqi-xuexi", 10]]},
        {"title": "卷积与表征学习", "picks": [["jiqi-xuexi", 5]]},
        {"title": "分类任务的写法：样本、标签与代价", "picks": [["jiqi-xuexi", 6]]},
        {"title": "类别不平衡与误判的代价", "picks": [["jiqi-xuexi", 2]]},
        {"title": "集成与稳健性", "picks": [["jiqi-xuexi", 8]]},
        {"title": "标注规范与判读一致性", "picks": [["zhongyi-xinxi-xue", 6]]},
        {"title": "可解释输出：图上看什么", "picks": [["zhongyi-zhishishu", 3]]},
        {"title": "边界：影像不外流、结果不下诊断", "picks": [["yixue-shuju-anquan-yinsi", 5]]},
    ],
})

w("llm-yu-zhongyi-zhinengti", {
    "title": "大模型与中医智能体",
    "note": "合成课：方法侧取《机器学习》（神经网络、表征、概率图、半监督、理论、规则、强化学习、评估），工程与治理侧取《中医软件架构》《医学数据安全》。库内无大模型专书，预训练/微调/对齐按方法层映射，已在缺口登记声明。",
    "views": {"表示与生成": ["表示", "嵌入", "生成", "网络", "概率", "特征"],
              "训练与对齐": ["训练", "泛化", "过拟合", "强化", "对齐", "规则"],
              "评估与治理": ["评估", "基准", "幻觉", "合规", "成本", "责任"]},
    "levels": {"基础与表示": [1, 2, 3], "概率与学习": [4, 5, 6], "知识、对齐与评测": [7, 8, 9], "工程与治理": [10, 11, 12]},
    "chapters": [
        {"title": "从统计学习到表示学习", "picks": [["jiqi-xuexi", 1]]},
        {"title": "神经网络：层、激活与反向传播", "picks": [["jiqi-xuexi", 5]]},
        {"title": "表征与嵌入：把词与证候放进同一空间", "picks": [["jiqi-xuexi", 10]]},
        {"title": "概率图与序列生成", "picks": [["jiqi-xuexi", 14]]},
        {"title": "半监督与自训练：标注不够时怎么办", "picks": [["jiqi-xuexi", 13]]},
        {"title": "泛化从哪来：计算学习理论的回答", "picks": [["jiqi-xuexi", 12]]},
        {"title": "知识增强：规则与图谱怎么进模型", "picks": [["jiqi-xuexi", 15]]},
        {"title": "强化学习与对齐", "picks": [["jiqi-xuexi", 16]]},
        {"title": "评估：基准分、幻觉与人工评", "picks": [["jiqi-xuexi", 2]]},
        {"title": "智能体的工具与检索", "picks": [["zhongyi-xinxi-xue", 4]]},
        {"title": "部署与成本：算力、延迟与更新", "picks": [["zhongyi-ruanjian-jiagou", 5]]},
        {"title": "生成内容的责任与合规", "picks": [["yixue-shuju-anquan-yinsi", 3]]},
    ],
})

w("zhongyi-jiqiren-xue", {
    "title": "中医机器人学",
    "note": "合成课：设备与执行侧取《中医智能设备》，决策侧取《机器学习》（强化学习、规则、线性模型），集成与安全侧取《中医软件架构》《医学数据安全》。库内无机器人学专书，运动控制/标定等内容缺口已登记。",
    "views": {"感知与执行": ["传感器", "执行", "设备", "信号", "控制", "反馈"],
              "决策与规划": ["决策", "规划", "策略", "奖励", "规则", "优化"],
              "集成与安全": ["集成", "接口", "安全", "失效", "边界", "责任"]},
    "levels": {"感知与执行": [1, 2, 5], "决策与规划": [3, 4], "集成": [6], "安全与场景": [7, 8]},
    "chapters": [
        {"title": "机器人是什么：从器械到执行体", "picks": [["zhongyi-zhineng-yiqi", 1]]},
        {"title": "感知：传感器与信号", "picks": [["zhongyi-zhineng-yiqi", 2]]},
        {"title": "决策：强化学习与序贯选择", "picks": [["jiqi-xuexi", 16]]},
        {"title": "规划与规则约束", "picks": [["jiqi-xuexi", 15]]},
        {"title": "控制与反馈：线性模型的视角", "picks": [["jiqi-xuexi", 3]]},
        {"title": "系统集成与接口", "picks": [["zhongyi-ruanjian-jiagou", 2]]},
        {"title": "安全与失效处理", "picks": [["yixue-shuju-anquan-yinsi", 5]]},
        {"title": "中医场景：推拿、灸疗机器人的边界", "picks": [["zhongyi-zhineng-yiqi", 5]]},
    ],
})

w("shuzi-renti-xuni-fangzhen", {
    "title": "数字人体虚拟仿真",
    "note": "合成课：结构与层级取《中医知识图谱》，采集与体表取《中医智能设备》，建模与评估取《机器学习》，隐私与治理取《医学数据安全》。库内无解剖建模/仿真专书，几何建模与求解器缺口已登记。",
    "views": {"结构与层级": ["结构", "层级", "实体", "关系", "图谱", "组织"],
              "建模与计算": ["模型", "建模", "降维", "聚类", "计算", "仿真"],
              "验证与治理": ["验证", "评估", "一致", "隐私", "伦理", "复用"]},
    "levels": {"结构与采集": [1, 2], "组织与建模": [3, 4], "分型与验证": [5, 6], "交互与治理": [7, 8]},
    "chapters": [
        {"title": "数字人体的概念与来源", "picks": [["zhongyi-zhineng-yiqi", 1]]},
        {"title": "数据从哪里来：体表、影像与传感", "picks": [["zhongyi-zhineng-yiqi", 4]]},
        {"title": "结构与层级：把人体写成知识组织", "picks": [["zhongyi-zhishishu", 1]]},
        {"title": "建模：降维、嵌入与参数化", "picks": [["jiqi-xuexi", 10]]},
        {"title": "人群分型与聚类", "picks": [["jiqi-xuexi", 9]]},
        {"title": "仿真结果怎么验：评估与对照", "picks": [["jiqi-xuexi", 2]]},
        {"title": "可视化与交互：系统怎么长", "picks": [["zhongyi-ruanjian-jiagou", 4]]},
        {"title": "隐私：人体数据是敏感信息", "picks": [["yixue-shuju-anquan-yinsi", 8]]},
    ],
})
