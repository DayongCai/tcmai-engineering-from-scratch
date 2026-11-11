#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_biye_market.py —— 为 27 个毕设案例补四件市场要素

四件：服务对象（市场定位）／服务内容／网络服务投入产出预算／AI 时代创新点。
另据公开数字给每个案例起一个「亮点题名」。

**预算不是报价。** 全部由 `预算模型.json` 的参数按固定公式算出，参数可替换后重算；
四个参数（人月单价、云资源、数据标注、合规备案）与每个案例的人月、客单、客户数都写死在
下面的表里，任何人改一处都能立刻看到回本期变化。

公开数字只用来定「市场有多大／政策在推什么」，不用来估自己的收入：
  S1 2025 年我国卫生健康事业发展统计公报（中医类机构 112,032；中医类诊所 100,885；
     中医类医院 6,498；中医类别执业〔助理〕医师 104.5 万；中医药人员 123.6 万；
     中医类诊疗 18.5 亿人次；中医类服务占比 20.2%）
  S2 国家卫健委《中医药在全世界璀璨绽放》2025-05（基层中医馆 4.2 万个；
     国家中医优势专科 1,100 余个；中西医协同旗舰科室 559 个）
  S3 国办发〔2025〕11 号《关于提升中药质量促进中医药产业高质量发展的意见》
  S4 国家医保局：全国中药饮片联盟采购（2025-04 落地；追溯体系计分）
  S5 健康报：2026-01-01 起所有医药机构药品追溯码全量采集上传
  S6 国家中医药管理局：传统医学章节纳入 ICD-11（2019 年第 72 届世界卫生大会通过）
  S7 国家中医药管理局：我国已发布 23 项针灸国家标准；ISO 16843-2:2025 针灸表达语义
  S8 《全国护理事业发展规划（2021—2025 年）》：护士总数目标 550 万、每千人口 3.8 人；
     ICN 2025 报告：全球护士缺口约 590 万
  S9 新京报《一台数万元，诊疗机构抢滩「赛博中医」》：中医四诊仪价格从数千元到百万元
  S10 券商研报口径：中医诊断与治疗服务市场 5,760 亿元（2022）→ 9,890 亿元（2025）；
     中医药全产业链 2025 约 2.2 万亿元；药食同源终端 3,700 亿元
  S11 IDC／智研咨询：全球医疗 AI 解决方案 400 亿元（2024）→ 449 亿元（2025）；
     讯飞医疗 2025 上半年营收 2.99 亿元（基层解决方案 0.84 亿元）
"""
import json, os, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'standards', 'biye')

PARAMS = {
    "人月单价": 20000,          # 元/人月（含社保与场地的教学口径）
    "云资源月费": 1200,         # 元/月（1 台 4C8G + 对象存储 + 备份）
    "数据标注一次性": 8000,     # 元（按 2,000 条 × 4 元估算）
    "合规与备案": 5000,         # 元（等保测评咨询／算法备案材料）
    "首年客户系数": 0.05,       # 第三年客户数的 5% 视为首年签约（渠道与口碑起量需要时间）
    "获客成本_小微": 300,       # 元/客户（馆所、诊所类，线上渠道为主）
    "获客成本_机构": 3000,      # 元/客户（医院、院校、药企类，需投标或面谈）
    "年运维人月": 0.5,          # 人月/年（上线后第 2、3 年的运维与迭代）
    "说明": "本模型只用于教学演示投入产出结构；单价与客单均为假设值，不是市场报价，也不构成任何商业承诺。",
}

SOURCES = {
    "S1": "2025 年我国卫生健康事业发展统计公报",
    "S2": "国家卫健委《中医药在全世界璀璨绽放》2025-05",
    "S3": "国办发〔2025〕11 号",
    "S4": "国家医保局：全国中药饮片联盟采购（2025-04 落地）",
    "S5": "健康报：2026-01-01 起药品追溯码全量采集上传",
    "S6": "国家中医药管理局：传统医学章节纳入 ICD-11（2019）",
    "S7": "国家中医药管理局：23 项针灸国家标准；ISO 16843-2:2025",
    "S8": "《全国护理事业发展规划（2021—2025 年）》；ICN 2025",
    "S9": "新京报：一台数万元，诊疗机构抢滩「赛博中医」",
    "S10": "券商研报口径：中医诊疗服务 5,760 亿→9,890 亿元；全产业链 2.2 万亿元",
    "S11": "IDC／智研咨询：全球医疗 AI 400 亿→449 亿元；讯飞医疗 2025H1 2.99 亿元",
}

# slug → 客户 / 服务内容 / AI 创新点 / 亮点题名 / 依据 / 人月 / 客单（元/年）/ 三年客户数
M = {
'02-zhongyi-zhenghou-paisheng': dict(
    title="中医系·案例一：证候词典即服务——900 单元派生的 132 证基层辨证底座",
    client="县域中医馆与基层 HIS 厂商（S1：中医类诊所 100,885 个；S2：基层中医馆 4.2 万个）",
    service="以 132 证／14 族为词表，提供「症状串→证候候选→代表方」的检索与校验接口；按机构年订阅，含季度词表更新",
    ai="证候归族规则显式化，可做「同证异名」消歧；给大模型的辨证输出提供可核对的词表边界，抑制编造证名",
    refs=["S1", "S2"], months=3, price=6000, clients=800),
'03-zhongyi-xuepai-cibiao': dict(
    title="中医系·案例二：给「张从正＝攻邪」祛魅——学派词表消融的检索产品",
    client="中医文献研究室、期刊编辑部、继续教育机构",
    service="八派关键词命中与位次变化查询；一键生成「词表敏感性报告」，用于审稿质疑与课程讲义",
    ai="把「某派主张」这类断言转成可复算的词频对照，作为审稿与教学的证据插件",
    refs=["S10"], months=2, price=12000, clients=120),
'04-zhongyi-zhexue-fanchou': dict(
    title="中医系·案例三：内经范畴检索——49 万字里的 12 个范畴与 Top 篇",
    client="中医药文化传播机构、通识课程、出版社数字产品线",
    service="12 范畴 × 162 篇的分布检索与「去运气七篇」重算对照；输出可直接引用的图表与页码",
    ai="范畴级检索替掉关键词搜索，回答「这个概念在哪几篇最密」而非「哪篇提到过」",
    refs=["S10"], months=2, price=9000, clients=150),
'05-zhongyao-xingzhuang-jiexi': dict(
    title="中药系·案例一：287 味药性味归经 API——给四诊仪与 HIS 补一张结构化药表",
    client="中医四诊仪厂商、饮片企业、区域处方审核平台（S9：四诊仪数千元至百万元一台）",
    service="药名→气／味／归经／毒性结构化查询；批量校验处方中「十八反十九畏」与药味缺失",
    ai="解析规则与缺口一并交付（未解析 0 可复算），避免把「解析失败」当成「无此字段」",
    refs=["S3", "S4", "S9"], months=3, price=30000, clients=60),
'06-zhongyao-fangji-yaowei': dict(
    title="中药系·案例二：方剂-药味对账——饮片集采时代的配伍可核账本",
    client="中药饮片集采参与企业、医院药事科、经典名方开发方（S4、S5）",
    service="114 方 836 药位与 287 味词表的对账；输出「不在词表的 86 味」清单与别名映射建议",
    ai="把「配伍」从文本描述变成可比对的药位表，支持集采报量与处方合理性核查",
    refs=["S3", "S4", "S5"], months=2, price=45000, clients=40),
'07-zhongyao-yaoli-nandu': dict(
    title="中药系·案例三：药理 97 万字难度图谱——教培与继续教育的选题引擎",
    client="医药院校、执业药师继续教育机构、药企医学部",
    service="588 小节的难度代理指标（字数×数值密度）与失效清单；按岗位生成 12 学时课程包",
    ai="用可量化代理定位「哪几节最容易教错」，并对纯理论小节给出失效提醒（不硬套模型）",
    refs=["S8"], months=3, price=18000, clients=90),
'08-zhenjiu-jingluo-diben': dict(
    title="针灸系·案例一：经络学底本从零建——4.2 万中医馆的培训基建",
    client="基层中医馆、针灸推拿培训机构、院校针灸系（S2：中医馆 4.2 万个）",
    service="按节切分的经络学单元层＋每单元 5 项动作模板；附门禁脚本，保证讲义数字不手抄",
    ai="底本层即训练料：为经络问答模型提供可追溯的段落级出处",
    refs=["S2", "S7"], months=4, price=4000, clients=1200),
'09-zhenjiu-shuxue-guishu': dict(
    title="针灸系·案例二：腧穴多经归属冲突表——ISO 针灸标准的落地校验",
    client="针灸器械与教学设备厂商、标准起草组、海外针灸学院（S7：ISO 16843-2:2025）",
    service="穴-经对照表与多经穴冲突清单（含出处）；提供标准落地时的差异比对报告",
    ai="把「同名异穴／同穴多经」做成可查询冲突表，供器械固件与教材同步",
    refs=["S7"], months=3, price=24000, clients=50),
'10-zhenjiu-zhishishu-guadian': dict(
    title="针灸系·案例三：条文挂知识树——中医知识图谱的挂点服务",
    client="中医知识图谱团队、智慧医院平台、教材数字出版方",
    service="按五级骨架给条文挂点，输出挂上率与未挂清单；附挂点规则与复核表",
    ai="挂点即实体对齐：给检索与推理提供层级路径，而非平铺文本",
    refs=["S7", "S11"], months=3, price=20000, clients=60),
'11-gushang-gubing-qianyi': dict(
    title="骨伤系·案例一：骨病底本迁移——骨伤专科的路径化底座",
    client="骨伤专科医院与康复机构、中医优势专科建设单位（S2：1,100 余个国家中医优势专科）",
    service="60 单元／149,316 字底本迁移，四候选轴实测后选定病性四分；输出科室路径模板",
    ai="轴选择留痕（17.5×/5.9×/5.6×/2.2×），让「为什么这样分章」变成可复核决策",
    refs=["S2"], months=3, price=36000, clients=45),
'12-gushang-chuangshang-shijianchuang': dict(
    title="骨伤系·案例二：创伤时间窗清点——急诊骨伤的时点提醒器",
    client="急诊科与创伤中心、区域急救平台",
    service="从 48 单元／151,733 字里清点时间窗条目并分类（窗口／疗程／观察期）；输出提醒规则草案",
    ai="把「教材有没有给时点」与「指南要求多少」分开记账，避免用模型幻觉补数字",
    refs=["S1"], months=2, price=52000, clients=30),
'13-gushang-kangfu-pingding': dict(
    title="骨伤系·案例三：康复评定可复现包——社区康复的量表合规盒",
    client="社区卫生服务中心、康复专科联盟、第三方评估机构",
    service="量表定义＋评分脚本＋三条门禁＋README 的四件包；缺项显式化，禁止默认填 0",
    ai="评分脚本可审计：每一步中间量落盘，供复核与申诉",
    refs=["S1", "S8"], months=3, price=8000, clients=300),
'14-huli-pinggu-diben': dict(
    title="护理系·案例一：132 证→护理问题——中医护理的评估翻译器",
    client="中医院护理部、护理院校、居家护理平台（S8：护士 550 万目标、全球缺口约 590 万）",
    service="证候到护理问题的映射表（保留原始证名），一对多时标注丢失的鉴别信息",
    ai="把中医证候翻译成护理语言，供排班与人力测算使用；映射规则公开可改",
    refs=["S8"], months=3, price=15000, clients=180),
'15-huli-jiaoban-sbar': dict(
    title="护理系·案例二：交接班五栏——护理交接的缺项显性化",
    client="医院护理部、医养结合机构",
    service="五栏模板（现状／风险／措施／待办／缺项）＋留空率统计脚本；缺项必须写「无」",
    ai="结构化交接即训练数据：为交接摘要模型提供合规样例与反例",
    refs=["S8"], months=2, price=10000, clients=220),
'16-huli-yangsheng-fangan': dict(
    title="护理系·案例三：养生方案检查单——治未病的「忌」清单产品",
    client="中医馆治未病室、健康管理机构、药食同源品牌（S2：中医馆须设治未病室；S10：药食同源终端 3,700 亿元）",
    service="忌／宜两栏＋可观察判据的检查单；把模糊劝告改写成可核对条目",
    ai="以「忌」为主要约束生成方案，减少模型给出千篇一律的「多喝热水」式建议",
    refs=["S2", "S10"], months=2, price=7000, clients=400),
'17-guanli-tongji-diben': dict(
    title="管理系·案例一：统计口径对齐——中医机构报表的守门员",
    client="中医医院管理科室、县域医共体、行业统计部门（S1：机构 112,032 个）",
    service="同一组指标在多份报表间的比对脚本与破立验证记录；改坏一个数即报警",
    ai="把「数字漂移」变成自动门禁，替代人工对表",
    refs=["S1"], months=2, price=26000, clients=70),
'18-guanli-fugaidu-baobiao': dict(
    title="管理系·案例二：覆盖度双维报表——院校学科建设的诊断仪",
    client="中医药院校教务处、专业认证机构",
    service="已建章节／目标章节＋「有底本层的学科数」双维报表；输出误读案例",
    ai="单维覆盖率会被「章节多但底本为零」的学科误导，双维排序更正",
    refs=["S6"], months=2, price=22000, clients=40),
'19-guanli-zhengce-guadian': dict(
    title="管理系·案例三：政策条文挂点——中医药政策的可检索合规库",
    client="中医药管理部门、医院合规岗、行业协会（S3、S4）",
    service="政策条文按五级骨架挂点，输出未挂清单；补源须登记来源与 sha256",
    ai="政策与业务的挂点即检索入口，回答「哪条政策管这件事」",
    refs=["S3", "S4", "S5"], months=3, price=30000, clients=35),
'20-zhineng-icd-jiansuo': dict(
    title="智能系·案例一：ICD-11 TM1 检索栈——中医病证的编码翻译层",
    client="医院病案室、医保结算平台、中医优势专科（S6：ICD-11 传统医学章节；S1：诊疗 18.5 亿人次）",
    service="本机镜像构建的中文病证检索栈（含同义词映射），输出召回、延迟与失败查询",
    ai="把「消渴／糖尿病」这类跨体系同义问题做成可评测的检索任务，而不是靠模型自由发挥",
    refs=["S6", "S1"], months=4, price=60000, clients=50),
'21-zhineng-yuyi-zhangliang': dict(
    title="智能系·案例二：三维极坐标张量——中医语义表示的邻域稳定性",
    client="医疗 AI 厂商、中医知识图谱团队（S11：医疗 AI 449 亿元）",
    service="同一嵌入下笛卡尔与极坐标两种表示的 kNN 邻居对比与翻转案例包",
    ai="表示层的邻域稳定性检验：换表示就翻邻居的模型，不适合上临床",
    refs=["S11"], months=3, price=40000, clients=30),
'22-zhineng-zhibiao-shibai': dict(
    title="智能系·案例三：指标与失效移交包——医疗 AI 的可审计交付",
    client="医院信息科、AI 产品评审方、第三方检测机构",
    service="均值＋最差 10 条＋原因分类的失效包；配 6 项门禁的复跑入口",
    ai="把「模型不行」改写成可行动的原因分类（数据／方法／口径），供采购与验收引用",
    refs=["S11"], months=2, price=35000, clients=40),
'23-wuguan-mianbu-wangzhen': dict(
    title="五官口腔系·案例一：望诊字段化——中医面诊的可观察化接口",
    client="四诊仪厂商、中医眼科与耳鼻喉科（S9：四诊仪数千元至百万元一台）",
    service="望诊描述→部位／颜色／形态／光泽四类字段；标注不可观察项，禁止硬塞",
    ai="字段化让图像模型有明确标签体系，减少「望神」这类整体判断被误当分类标签",
    refs=["S9"], months=3, price=28000, clients=45),
'24-wuguan-fangji-shai': dict(
    title="五官口腔系·案例二：114 方五官筛——专科中成药的选品依据",
    client="中成药企业、五官专科药房、医院制剂室",
    service="「五官专药」与「教材主治」两条筛选路径的差集与交集说明",
    ai="选品依据可复算：专药表与判定规则一并交付，避免黑箱推荐",
    refs=["S3", "S4"], months=2, price=25000, clients=35),
'25-wuguan-guangxue-canliang': dict(
    title="五官口腔系·案例三：光学参数缺项写法——眼科数据报表的合规底线",
    client="眼科连锁机构、视光中心、区域眼健康平台",
    service="参数报表模板＋两种填法（留空／显式无）的下游影响行数统计",
    ai="缺项显式化：让「没有测」与「测了是 0」在数据层分开，避免平均值被污染",
    refs=["S1"], months=2, price=12000, clients=120),
'26-jichu-bingli-diben': dict(
    title="基础医学院·案例一：病理 252 单元底本——基础医学的课程数字化底座",
    client="医学院校教务处、住院医师规范化培训基地",
    service="252 单元／428,867 字底本与门禁；输出可复用的切分规则与失败位置",
    ai="课程数字化底座即教学大模型的语料锚点，杜绝「无出处的讲解」",
    refs=["S8"], months=4, price=32000, clients=60),
'27-jichu-bingsheng-jiuzhou': dict(
    title="基础医学院·案例二：病理生理九轴——机制教学的覆盖度仪表",
    client="医学院校、执医考试培训机构",
    service="216 单元按九轴打标，输出空轴与拥挤轴；多轴规则单独说明",
    ai="用轴覆盖度诊断讲义偏科，替掉「凭感觉加课时」",
    refs=["S8"], months=3, price=20000, clients=55),
'28-jichu-shengli-zhengchangzhi': dict(
    title="基础医学院·案例三：生理正常值表——可复现的参考区间交付",
    client="医院检验科、健康管理机构、体检连锁",
    service="正常值表＋单位与区间＋跨章不一致清单；附单位换算说明",
    ai="参考区间的版本与单位可追溯，避免 AI 把 mg/dL 与 mmol/L 混算",
    refs=["S1"], months=3, price=18000, clients=90),
}


# 客群 SAM 与「合理带」——客户数不再手设，而是手设值取 min(手设, SAM×带中位)
SAM = {
    "基层中医馆": (42000, 0.1, 3.0, "S2"),
    "中医类诊所": (100885, 0.1, 3.0, "S1"),
    "中医类医院": (6498, 1.0, 10.0, "S1"),
    "院校": (60, 5.0, 40.0, "估计"),
    "药企与器械": (200, 1.0, 15.0, "估计"),
}
SEG = {
 '02-zhongyi-zhenghou-paisheng': "基层中医馆", '03-zhongyi-xuepai-cibiao': "院校",
 '04-zhongyi-zhexue-fanchou': "院校", '05-zhongyao-xingzhuang-jiexi': "药企与器械",
 '06-zhongyao-fangji-yaowei': "药企与器械", '07-zhongyao-yaoli-nandu': "院校",
 '08-zhenjiu-jingluo-diben': "基层中医馆", '09-zhenjiu-shuxue-guishu': "药企与器械",
 '10-zhenjiu-zhishishu-guadian': "院校", '11-gushang-gubing-qianyi': "中医类医院",
 '12-gushang-chuangshang-shijianchuang': "中医类医院", '13-gushang-kangfu-pingding': "基层中医馆",
 '14-huli-pinggu-diben': "中医类医院", '15-huli-jiaoban-sbar': "中医类医院",
 '16-huli-yangsheng-fangan': "基层中医馆", '17-guanli-tongji-diben': "中医类医院",
 '18-guanli-fugaidu-baobiao': "院校", '19-guanli-zhengce-guadian': "院校",
 '20-zhineng-icd-jiansuo': "中医类医院", '21-zhineng-yuyi-zhangliang': "药企与器械",
 '22-zhineng-zhibiao-shibai': "药企与器械", '23-wuguan-mianbu-wangzhen': "药企与器械",
 '24-wuguan-fangji-shai': "药企与器械", '25-wuguan-guangxue-canliang': "中医类诊所",
 '26-jichu-bingli-diben': "院校", '27-jichu-bingsheng-jiuzhou': "院校",
 '28-jichu-shengli-zhengchangzhi': "中医类医院",
}


def cap_clients(slug, hand):
    n, lo, hi, src = SAM[SEG[slug]]
    mid = (lo + hi) / 2 / 100
    cap = max(1, round(n * mid))
    used = min(hand, cap)
    return used, {"客群": SEG[slug], "SAM": n, "SAM来源": src, "带": [lo, hi],
                  "带中位渗透率%": round(mid * 100, 2), "手设": hand, "上限": cap,
                  "采用": used, "修正": used != hand}


def budget(months, price, clients3y, cac_unit):
    p = PARAMS
    build = months * p['人月单价'] + 12 * p['云资源月费'] + p['数据标注一次性'] + p['合规与备案']
    c1 = max(1, math.ceil(clients3y * p['首年客户系数']))
    cac = cac_unit * c1
    opex = p['年运维人月'] * p['人月单价'] * 2          # 第 2、3 年
    rev1 = price * c1
    rev2 = price * min(clients3y, c1 * 3)
    rev3 = price * clients3y
    rev3sum = rev1 + rev2 + rev3
    cost3 = build + cac + opex
    payback = (build + cac) / (rev1 / 12) if rev1 else None
    return {"人月": months, "首年投入": build, "获客成本": cac, "三年运维": opex,
            "三年总成本": cost3, "首年客户": c1, "三年客户": clients3y, "客单": price,
            "首年收入": rev1, "三年收入": rev3sum,
            "回本月数": None if payback is None else round(payback, 1),
            "三年毛利": rev3sum - cost3,
            "毛利口径": "三年合计收入 − （建设＋获客＋两年运维）；不含税费与人力社保之外的开支"}


def main():
    cases = json.load(open(os.path.join(OUT, '案例库.json'), encoding='utf-8'))['cases']
    units = json.load(open(os.path.join(OUT, 'units.json'), encoding='utf-8'))
    market = {}
    for c in cases:
        m = M[c['slug']]
        cac = PARAMS['获客成本_小微'] if m['clients'] >= 150 else PARAMS['获客成本_机构']
        used, clientNote = cap_clients(c['slug'], m['clients'])
        b = budget(m['months'], m['price'], used, cac)
        market[c['slug']] = {
            "slug": c['slug'], "title": m['title'],
            "client": m['client'], "service": m['service'], "ai": m['ai'],
            "refs": [{"id": r, "name": SOURCES[r]} for r in m['refs']],
            "budget": b, "clientBasis": clientNote,
        }
        c['title_new'] = m['title']
        c['market'] = market[c['slug']]
        c['clientBasis'] = clientNote
    tot = {"cases": len(market),
           "首年投入合计": sum(v['budget']['首年投入'] for v in market.values()),
           "三年收入合计": sum(v['budget']['三年收入'] for v in market.values()),
           "回本最快": min(market.items(), key=lambda kv: kv[1]['budget']['回本月数'] or 99)[0],
           "回本最慢": max(market.items(), key=lambda kv: kv[1]['budget']['回本月数'] or 0)[0],
           "median回本月数": sorted(v['budget']['回本月数'] for v in market.values())[len(market)//2]}
    json.dump({"params": PARAMS, "sources": SOURCES, "cases": market, "totals": tot},
              open(os.path.join(OUT, '市场层.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump({"subject": "22-zhongyi-biye-sheji",
               "what": "网络服务投入产出预算模型：四个成本参数 + 每案例三参数（人月／客单／三年客户数），公式固定，参数可替换重算。",
               "params": PARAMS,
               "formula": {
                   "首年投入": "人月×人月单价 + 12×云资源月费 + 数据标注一次性 + 合规与备案",
                   "首年客户": "ceil(三年客户数 × 首年客户系数)",
                   "首年收入": "首年客户 × 客单",
                   "三年收入": "三年客户数 × 客单",
                   "回本月数": "(建设成本 + 首年获客) ÷ （首年收入 ÷ 12）",
                   "三年毛利": "三年收入 −（建设 + 获客 + 第 2/3 年运维）"},
               "caveat": "所有客单与客户数为教学假设，不是市场报价；公开数字（S1–S11）只用于说明市场与政策方向。"},
              open(os.path.join(OUT, '预算模型.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump({"subject": "22-zhongyi-biye-sheji", "counts": units['counts'], "units": units['units']},
              open(os.path.join(OUT, 'units.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump({"subject": "22-zhongyi-biye-sheji",
               "counts": {"depts": 9, "cases": len(cases), "chapters": 1 + len(cases)},
               "cases": cases},
              open(os.path.join(OUT, '案例库.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print(json.dumps({"cases": tot['cases'], "首年投入合计": tot['首年投入合计'],
                      "三年收入合计": tot['三年收入合计'], "median回本": tot['median回本月数'],
                      "回本最快": tot['回本最快'], "回本最慢": tot['回本最慢']}, ensure_ascii=False))
    for slug, v in market.items():
        b = v['budget']
        print(f"{slug:34s} 人月{b['人月']:2d} 投入{b['首年投入']:>7,} 客单{b['客单']:>6,} 客户{b['三年客户']:>5,} 回本{b['回本月数']:>5} 月")


if __name__ == '__main__':
    main()
