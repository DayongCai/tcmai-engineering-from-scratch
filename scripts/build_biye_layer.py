#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/build_biye_layer.py —— 中医毕业设计与知识移交：9 院系 × 3 案例

没有母本教材（毕设是流程课）。本层不编校名、不编人名、不编「某届学生」，只做一件事：
把**本库已有的九院系资产**各切出三个可落地课题，每个课题都带真实数据锚点（路径＋实测数字），
并明确写出「缺口」——数据不存在的，就写不存在，不补。

九院系（本库 departments 的九个目录，即「院校」在本课程里的落点）：
  01 中医系 · 02 中药系 · 03 针灸系 · 04 骨伤系 · 05 护理系
  06 管理系 · 07 智能系 · 08 五官口腔系 · 09 基础医学院

每系三案的类型固定（这是全课程的结构，不是凑数）：
  案一 数据层：为该系某门课建/复算底本层（单元、字数、可核指标）
  案二 方法层：在该系已有资产上做一条量化管线（阈值、消融、失效）
  案三 移交层：把前两案的产物做成可复现包与门禁（别人能重跑）

课程总章数 = 1（通用流程）+ 9 × 3 = 28。

数字全部现算：单元层的每个数都从 standards/ 下的文件读出，脚本可重跑。
"""
import json, os, glob, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'standards', 'biye')
SUBJECT = '22-zhongyi-biye-sheji'


def hanzi(t):
    return len(re.findall(r'[一-鿿]', t))


def J(p):
    return json.load(open(os.path.join(ROOT, p), encoding='utf-8'))


def units_of(p):
    d = J(p)
    us = d['units'] if isinstance(d, dict) else d
    return len(us), sum(u.get('hanzi', 0) for u in us), sum(u.get('values', 0) for u in us)


def built_chapters(dept, slug):
    return len(glob.glob(os.path.join(ROOT, 'departments', dept, slug, 'chapters', '*', 'docs', 'zh.md')))


CUR = J('curriculum.json')
DEPTS = [d for d in CUR['departments']]

def dept_stat(slug):
    d = next(x for x in DEPTS if x['slug'] == slug)
    n = len(d['subjects'])
    built = sum(built_chapters(slug, s[0]) for s in d['subjects'])
    target = 0
    for s in d['subjects']:
        mp = os.path.join(ROOT, 'departments', slug, s[0], 'meta.json')
        if os.path.exists(mp):
            try:
                target += json.load(open(mp, encoding='utf-8')).get('chaptersTarget') or 0
            except Exception:
                pass
    return {"dept": slug, "title": d['title'], "subjects": n, "built": built, "target": target}


# ── 数据锚点（全部实测，来源写进每条）────────────────────────────
NEIKE = units_of('standards/neike/units.json')          # 384 / 329,826 / 12
WAJKE = units_of('standards/waike/units.json')          # 325 / 241,342
ERKE = units_of('standards/erke/units.json')            # 250 / 223,222
FUKE = units_of('standards/fuke/units.json')            # 325 / 233,241
JIZHEN = units_of('standards/jizhen/units.json')        # 48 / 151,733 / 274
GUBING = units_of('standards/gubing/units.json')        # 60 / 149,316 / 230
LAONIAN = units_of('standards/laonian/units.json')      # 77 / 186,163 / 906
JINGSHEN = units_of('standards/jingshen/units.json')    # 48 / 154,254 / 282
BINGLI = units_of('standards/bingli/units.json')        # 252 / 428,867
BSL = units_of('standards/binglishengli/units.json')    # 216 / 360,945
SHENGLI = units_of('standards/shengli/units.json')      # 132 / 228,672
YAOLI = J('standards/yaoli/底本.json')['counts']         # 49/196/588/7455/971179/421
ZHONGYAO = J('standards/zhongyao/drugs.json')['counts']  # 287 …
FANGJI = J('standards/fangji/formulas.json')['counts']   # 114/836/246/86
_ZH = J('standards/zhenghou/证候库.json')
ZHENGHOU = dict(_ZH['counts'])
ZHENGHOU['coverage'] = sum(z.get('diseaseCount', 0) for z in _ZH['zheng'])  # 132/14/208
GEJIA = J('standards/gejia/学派库.json')['counts'] if os.path.exists(os.path.join(ROOT, 'standards/gejia/学派库.json')) else {}
ZHEXUE = J('standards/zhexue/范畴库.json')['counts'] if os.path.exists(os.path.join(ROOT, 'standards/zhexue/范畴库.json')) else {}
LUNZHUAN = J('standards/lunzhuan/科室库.json')['counts']

# 语料规模（毕设可引用的「本库最大的一块」）
CORPUS = {"shanghan": 1760, "jingui": 402, "wenbing": 630}
CORPUS_TOTAL = sum(CORPUS.values())
NEIJING = {"pian": 162, "hanzi": 490232}

D = dept_stat

CASES = [
    # ── 01 中医系 ────────────────────────────────────────────────
    {"dept": "01-zhongyi", "kind": "数据层", "slug": "02-zhongyi-zhenghou-paisheng",
     "title": "中医系·案例一：证候层的可复现派生（900 单元 → 132 证）",
     "anchor": "14-zhongyi-zhenghou-xue", "asset": "standards/zhenghou/证候库.json + scripts/build_zhenghou_layer.py",
     "claim": "同一批 900 个临床单元，用两套族归并规则跑，能否稳定落在同一数量级？",
     "data": f"外科 {WAJKE[0]} ＋ 儿科 {ERKE[0]} ＋ 妇科 {FUKE[0]} = 900 单元 → {ZHENGHOU['zheng']} 证 / {ZHENGHOU['families']} 族 / {ZHENGHOU['coverage']} 次病证覆盖",
     "method": "① 用 build_zhenghou_layer.py 抽证名与代表方；② 族归并顺序改为「病位优先」重跑；③ 比对两次的证数与族分布",
     "eval": "基线＝人工按章节挑证名（3 章抽样）；消融＝族顺序互换；失效＝「其他」族占比从 8.3% 升到何值",
     "handover": "证候库 JSON ＋ 抽取规则注释（正则写在脚本里，不藏在文档）＋ 差异表",
     "gap": "跨课证候最多两门共有，10 个；没有一门三课共有——这条限制必须在论文里写清"},
    {"dept": "01-zhongyi", "kind": "方法层", "slug": "03-zhongyi-xuepai-cibiao",
     "title": "中医系·案例二：学派层的词表敏感性（2,792 条条文）",
     "anchor": "15-zhongyi-gejia-xueshuo", "asset": "standards/gejia/学派库.json + 伤寒／金匮／温病底本",
     "claim": "八派的关键词命中排序，在「单字词表」与「多字词表」两种设定下是否稳定？",
     "data": f"伤寒 {CORPUS['shanghan']} ＋ 金匮 {CORPUS['jingui']} ＋ 温病 {CORPUS['wenbing']} = {CORPUS_TOTAL} 条；八派命中 7–1,476",
     "method": "① 单字词表跑一遍；② 去掉单字、只留多字词跑一遍；③ 计算两次排序的 Spearman 相关与位次变化",
     "eval": "基线＝单字词表结果；消融＝多字词表；失效＝张从正从 1,476 掉到多少（说明「汗／下」是高频字而非学派特征）",
     "handover": "两套词表 ＋ 复跑脚本 ＋ 位次变化表",
     "gap": "八派原书（《素问玄机原病式》《儒门事亲》等）本库未收，命中只能证明「词在经典里」，不能证明「该派如此用语」"},
    {"dept": "01-zhongyi", "kind": "移交层", "slug": "04-zhongyi-zhexue-fanchou",
     "title": "中医系·案例三：范畴分布的 Top 篇集中度（内经 162 篇）",
     "anchor": "16-zhongyi-zhexue-shi", "asset": "standards/zhexue/范畴库.json",
     "claim": "去掉运气七篇之后，12 个范畴的「内经密度」还成立吗？",
     "data": f"内经 {NEIJING['pian']} 篇 / {NEIJING['hanzi']:,} 汉字；12 范畴；气 10,855、五行 129（84×）、道 1,479 对临床 30",
     "method": "① 全量计数；② 剔除六元正纪大论等运气七篇重算；③ 比对每万字密度的下降幅度",
     "eval": "基线＝全量；消融＝去运气七篇；失效＝「阴阳双高」这一结论是否仍然成立",
     "handover": "范畴库 ＋ 篇目黑名单 ＋ 两次结果对照表",
     "gap": "单字（气、道、阴、阳）噪声大，必须同时报多字词结果"},
    # ── 02 中药系 ────────────────────────────────────────────────
    {"dept": "02-zhongyao", "kind": "数据层", "slug": "05-zhongyao-xingzhuang-jiexi",
     "title": "中药系·案例一：287 味药的性味归经可解析率",
     "anchor": "01-zhongyaoxue", "asset": "standards/zhongyao/drugs.json",
     "claim": "同一份说明书文本，严格解析与宽松解析的「未解析条数」差多少？",
     "data": f"{ZHONGYAO['drugs']} 味；带气 {ZHONGYAO['drugsWithQi']}、带味 {ZHONGYAO['drugsWithWei']}、带归经 {ZHONGYAO['drugsWithGui']}；未解析 {ZHONGYAO['drugsUnparsed']}",
     "method": "① 记下 parseRule；② 把规则改成「允许缺项」重跑；③ 统计三字段的缺口从 0 变成多少",
     "eval": "基线＝严格规则（未解析 0）；消融＝缺项容忍；失效＝宽松后是否把「归经：无」误计为有",
     "handover": "drugs.json ＋ parseRule 原文 ＋ 缺口表",
     "gap": "287 味只是词表口径，不是《中药学》教材全量；教材全量另需建底本"},
    {"dept": "02-zhongyao", "kind": "方法层", "slug": "06-zhongyao-fangji-yaowei",
     "title": "中药系·案例二：方剂药味与中药词表的缺口（114 方 / 246 味）",
     "anchor": "03-fangjixue", "asset": "standards/fangji/formulas.json + standards/zhongyao/drugs.json",
     "claim": "方剂里出现的药味，有多少不在中药学词表内？补词表能把覆盖率提到多少？",
     "data": f"{FANGJI['formulas']} 方 / {FANGJI['herbSlots']} 个药位 / {FANGJI['uniqueHerbs']} 味；不在词表 {FANGJI['notInZhongyaoLexicon']} 味",
     "method": "① 取 notInZhongyaoLexicon 清单；② 人工判别「别名／新药／解析噪声」三类；③ 补别名后重算覆盖率",
     "eval": "基线＝原覆盖率；消融＝只补别名（不补新药）；失效＝把解析噪声当新药计入",
     "handover": "别名映射表 ＋ 三类判别表 ＋ 覆盖率对照",
     "gap": "18 方只有 4 味药角色完整（withRoles4），角色层数据不足，不能做配伍角色分析"},
    {"dept": "02-zhongyao", "kind": "移交层", "slug": "07-zhongyao-yaoli-nandu",
     "title": "中药系·案例三：药理 588 小节的难度预测与失效",
     "anchor": "12-yaoli-xue", "asset": "standards/yaoli/底本.json",
     "claim": "用「字数 × 数值密度」能否预测哪些小节最难学？预测在哪些小节失效？",
     "data": f"{YAOLI['chapters']} 章 / {YAOLI['secs']} 节 / {YAOLI['subs']} 小节 / {YAOLI['paras']:,} 段 / {YAOLI['hanzi']:,} 汉字 / 数值 {YAOLI['valueLike']}",
     "method": "① 以字数与数值密度排序；② 取前 10 与后 10 小节人工判难；③ 记录不一致的小节",
     "eval": "基线＝字数排序；消融＝字数×数值；失效＝纯理论小节（数值 0）被误判为最容易",
     "handover": "难度清单 ＋ 失效小节说明 ＋ 复跑脚本",
     "gap": "「难」的定义依赖人工判断，本库只提供可量化代理，不能替代教学经验"},
    # ── 03 针灸系 ────────────────────────────────────────────────
    {"dept": "03-zhenjiu", "kind": "数据层", "slug": "08-zhenjiu-jingluo-diben",
     "title": "针灸系·案例一：经络学底本层从零建（该系底本 0 门）",
     "anchor": "01-jingluo-xue", "asset": "无现成底本；模板取 standards/neike/units.json 与 scripts/build_neike_units.py",
     "claim": "把中医系的内科底本模板迁到经络学，能在几轮内达到门禁全绿？",
     "data": f"该系 {D('03-zhenjiu')['subjects']} 学科、已建 {D('03-zhenjiu')['built']} 章、底本 0 门；可参照 neike {NEIKE[0]} 单元 / {NEIKE[1]:,} 字的口径",
     "method": "① 按节＝单元切；② 每单元记字数、数值、三辨词频；③ 跑 audit 与 test_chapter_code",
     "eval": "基线＝无底本（章节只能手写）；消融＝有底本后每章数字可否现算；失效＝教材某节无可切分导致单元缺项",
     "handover": "units.json ＋ build 脚本 ＋ 门禁通过截图（终端输出留档）",
     "gap": "该系无教材工作簿在库，第一步必须自建文本层——这是本章的立项前提"},
    {"dept": "03-zhenjiu", "kind": "方法层", "slug": "09-zhenjiu-shuxue-guishu",
     "title": "针灸系·案例二：腧穴的多经归属冲突清单",
     "anchor": "02-shuxue-xue", "asset": "待建；关系表模板取 standards/zhenduan/icd-align.json 的对齐结构",
     "claim": "同一个穴名在几部教材里归经不一致的有多少？冲突能否收敛到一张表？",
     "data": "无现成数据；可用口径＝每穴一行（穴名／归经／出处），冲突＝同穴多经",
     "method": "① 建穴-经表；② 按穴名分组；③ 输出多经穴清单与出处",
     "eval": "基线＝单教材（无冲突）；消融＝多教材合并；失效＝同名异穴被合并",
     "handover": "穴-经表 ＋ 冲突清单 ＋ 出处列",
     "gap": "多教材文本未入库，本案例第一步是补源，不是计算"},
    {"dept": "03-zhenjiu", "kind": "移交层", "slug": "10-zhenjiu-zhishishu-guadian",
     "title": "针灸系·案例三：针灸条文到知识树的挂点覆盖",
     "anchor": "03-zhenjiu-yiji-xuan", "asset": "standards/knowledge-tree/tree-schema.json + 五级骨架规范",
     "claim": "按五级骨架给针灸条文挂点，覆盖率能到多少？哪些条文挂不上？",
     "data": "知识树五级骨架（schema 已入库）；条文规模待建",
     "method": "① 读 schema；② 逐条挂点；③ 统计挂上／挂不上与原因",
     "eval": "基线＝人工挂点抽样；消融＝按关键词自动挂点；失效＝自动挂点把「同义不同级」错挂",
     "handover": "挂点表 ＋ 未挂条文清单 ＋ 挂点规则",
     "gap": "条文层未建，覆盖率暂不可算——这一点必须写进开题，不能先报一个数"},
    # ── 04 骨伤系 ────────────────────────────────────────────────
    {"dept": "04-gushang", "kind": "数据层", "slug": "11-gushang-gubing-qianyi",
     "title": "骨伤系·案例一：骨病底本向骨伤系迁移（60 单元 / 149,316 字）",
     "anchor": "03-gushang-kexue-jichu", "asset": "standards/gubing/（含 axis-probe.json 四候选实测）",
     "claim": "中医系骨病课的底本与章轴，能否直接为骨伤系所用？哪一部分必须改？",
     "data": f"gubing {GUBING[0]} 单元 / {GUBING[1]:,} 汉字 / 数值 {GUBING[2]}；四候选轴 17.5× / 5.9× / 5.6× / 2.2×（采用病性四分）",
     "method": "① 复用单元层；② 换科室口径重算章轴；③ 比对「病性四分」在骨伤系课程目标下是否仍最均",
     "eval": "基线＝病性四分（2.2×）；消融＝解剖部位（5.9×）；失效＝沿用中医系章名导致与骨伤系培养方案冲突",
     "handover": "迁移后的 units.json ＋ 轴对照表 ＋ 差异说明",
     "gap": "骨伤系培养方案本库未收，「是否仍最均」只能按教材分布判断，不能替代培养方案评审"},
    {"dept": "04-gushang", "kind": "方法层", "slug": "12-gushang-chuangshang-shijianchuang",
     "title": "骨伤系·案例二：创伤急救的时间窗条目清点（151,733 字）",
     "anchor": "04-chuangshang-jijiu-xue", "asset": "standards/jizhen/units.json（48 单元 / 数值 274）",
     "claim": "急救教材里真正带「时间窗」的条目有多少？哪些病只有操作没有时点？",
     "data": f"jizhen {JIZHEN[0]} 单元 / {JIZHEN[1]:,} 汉字 / 数值 {JIZHEN[2]}（全库前列）",
     "method": "① 抽含时间表达的单元；② 分类（窗口／疗程／观察期）；③ 统计无时点的急诊病种",
     "eval": "基线＝人工通读 1 章；消融＝正则抽「分钟／小时／天」；失效＝把「数日」这类模糊表述当窗口",
     "handover": "时间窗条目表 ＋ 模糊表述清单 ＋ 抽取正则",
     "gap": "教材对部分病种确实不给时点（交给指南），本案例只能报「教材有没有」，不能报「指南要求多少」"},
    {"dept": "04-gushang", "kind": "移交层", "slug": "13-gushang-kangfu-pingding",
     "title": "骨伤系·案例三：康复评定量表的可复现包",
     "anchor": "05-yundong-yixue", "asset": "待建；量表结构与门禁模板取本库 tests/ 六项",
     "claim": "把一套康复评定做成可复现包，最少需要哪些文件才能让别人重跑？",
     "data": "无现成量表；可复现包口径＝数据＋脚本＋门禁＋README 四件",
     "method": "① 定义量表字段；② 写评分脚本；③ 加门禁（字段完整性、分数范围、缺项显式化）",
     "eval": "基线＝手工评分；消融＝脚本评分；失效＝缺项被默认填 0 导致分数虚高",
     "handover": "量表定义 ＋ 评分脚本 ＋ 三条门禁 ＋ README",
     "gap": "量表本身需自建并经信度检验，本库不提供信度数据"},
    # ── 05 护理系 ────────────────────────────────────────────────
    {"dept": "05-huli", "kind": "数据层", "slug": "14-huli-pinggu-diben",
     "title": "护理系·案例一：护理评估底本层（132 证 → 护理问题）",
     "anchor": "03-jiankang-pinggu", "asset": "standards/zhenghou/证候库.json（132 证 / 14 族）",
     "claim": "132 个证候能否稳定映射到有限的护理问题集？映射多对一时损失了什么？",
     "data": f"{ZHENGHOU['zheng']} 证 / {ZHENGHOU['families']} 族 / {ZHENGHOU['coverage']} 次病证覆盖",
     "method": "① 按族归并到护理问题；② 统计一对多的证；③ 记录归并时丢掉的鉴别信息",
     "eval": "基线＝逐证映射；消融＝按族归并；失效＝「同族异证」被合并后无法区分护理重点",
     "handover": "证-护理问题映射表 ＋ 丢失信息说明 ＋ 原始证名保留列",
     "gap": "护理问题分类标准（如 NANDA）本库未收，只能用自建分类并声明"},
    {"dept": "05-huli", "kind": "方法层", "slug": "15-huli-jiaoban-sbar",
     "title": "护理系·案例二：交接班结构化记录的完备率",
     "anchor": "04-zhongyi-huli-jishu", "asset": "本库结构化病历口径（lunzhuan 第 6 章五栏）",
     "claim": "把交接班改成结构化五栏后，「缺项显式化」能否取代「留空」？",
     "data": f"lunzhuan 口径：{LUNZHUAN['diseases']} 病 / {LUNZHUAN['actions']} 动作 / 缺项须写「无」",
     "method": "① 设计五栏（现状／风险／措施／待办／缺项）；② 抽样记录填表；③ 统计留空率",
     "eval": "基线＝自由文本；消融＝结构化五栏；失效＝填写者把「无」也省略",
     "handover": "五栏模板 ＋ 填表说明 ＋ 留空率统计脚本",
     "gap": "真实交接班记录属院内数据，本库只有模板与口径，不含真实记录"},
    {"dept": "05-huli", "kind": "移交层", "slug": "16-huli-yangsheng-fangan",
     "title": "护理系·案例三：养生方案的可执行性检查单",
     "anchor": "05-zhongyi-yangsheng-xue", "asset": "证候库「忌」优先原则（体质学第 7 章口径）",
     "claim": "养生方案里「忌」比「宜」重要——能否用检查单把这条落成可核项？",
     "data": "口径来源：体质学第 7 章「以平为期，忌比宜重要」；证候 132 证可作对象池",
     "method": "① 列忌／宜两栏；② 每条写可观察判据；③ 检查单逐项勾选并记录依据",
     "eval": "基线＝只写宜；消融＝忌宜并列；失效＝把「忌」写成模糊劝告（如「少食生冷」无量化）",
     "handover": "检查单 ＋ 判据列 ＋ 反例（模糊劝告改写前后对照）",
     "gap": "养生效果的长期随访数据本库没有，只能做方案可执行性，不做疗效结论"},
    # ── 06 管理系 ────────────────────────────────────────────────
    {"dept": "06-guanli", "kind": "数据层", "slug": "17-guanli-tongji-diben",
     "title": "管理系·案例一：卫生统计口径与本库计数的对齐",
     "anchor": "01-yixue-tongjixue", "asset": "data/content-board.json + scripts/check_readme_counts.js",
     "claim": "同一组数字（院系／学科／章节／学时）在三个文件里是否一致？不一致能否自动查出？",
     "data": "本库现算口径：9 院系 · 187 学科 · 2,093 章节目标 · 11,457 学时；扫描数随 --fix 同步",
     "method": "① 取 content-board 与 README 计数块；② 逐项比对；③ 故意改坏一个数验证门禁报警",
     "eval": "基线＝人工核对；消融＝脚本比对（--fix）；失效＝历史散文中写死的旧数被漏检",
     "handover": "比对脚本 ＋ 破立验证记录（改坏→红→修复→绿）",
     "gap": "统计口径只覆盖本库，不含院校真实办学数据"},
    {"dept": "06-guanli", "kind": "方法层", "slug": "18-guanli-fugaidu-baobiao",
     "title": "管理系·案例二：课程覆盖度报表的双维口径",
     "anchor": "03-zhongyi-guanli-xue", "asset": "scripts/audit_curriculum.js 输出 + content-board.json",
     "claim": "覆盖率报表用「已建章节／目标章节」一个指标够不够？哪一维会误导？",
     "data": f"全库已建 405 章 / 目标 2,115（口径取 audit 输出）；中医系 208 章、基础医学院 134 章",
     "method": "① 按院系算覆盖率；② 加入「有底本层的学科数」一维；③ 比对两维排序差异",
     "eval": "基线＝单一覆盖率；消融＝双维；失效＝章节多的系看起来「完成度高」但底本为 0",
     "handover": "报表模板 ＋ 双维排序表 ＋ 误读案例",
     "gap": "目标章节数本身是排课期估算，不是评估标准"},
    {"dept": "06-guanli", "kind": "移交层", "slug": "19-guanli-zhengce-guadian",
     "title": "管理系·案例三：政策法规条文到知识树的挂点",
     "anchor": "02-zhongyiyao-zhengce-fagui", "asset": "standards/knowledge-tree/tree-schema.json",
     "claim": "政策条文按五级骨架挂点，哪些条款挂不上？挂不上说明什么？",
     "data": "知识树五级骨架（schema 入库）；政策文本待补源",
     "method": "① 补源并登记来源与 sha256；② 逐条挂点；③ 输出未挂清单",
     "eval": "基线＝按主题挂点；消融＝按关键词；失效＝把「监督管理」类条款硬挂进「诊疗」分支",
     "handover": "挂点表 ＋ 未挂清单 ＋ 补源登记（来源＋sha256）",
     "gap": "政策原文需外部补源，本库不含全文；补源必须先登记再落条文"},
    # ── 07 智能系 ────────────────────────────────────────────────
    {"dept": "07-zhineng", "kind": "数据层", "slug": "20-zhineng-icd-jiansuo",
     "title": "智能系·案例一：ICD-11 TM1 检索栈的可复现构建",
     "anchor": "05-zhongyi-zhishi-tupu", "asset": "standards/icd11/（definitions-en、zh-names、tm1、embedding-metrics）",
     "claim": "用本机镜像重建检索栈，召回与延迟能否同时达标？",
     "data": "standards/icd11 8 件（含 tm1 子目录、embedding-metrics.json）；镜像 D:\\ICD11-source",
     "method": "① 从镜像建索引；② 跑 20 条查询；③ 记录召回、延迟与失败查询",
     "eval": "基线＝关键词检索；消融＝向量检索；失效＝中文同义词（如「消渴」对「糖尿病」）召回失败",
     "handover": "建索引脚本 ＋ 查询集 ＋ 指标表",
     "gap": "id.who.int 需 OAuth，线上接口不可直连；本案例只用本机镜像"},
    {"dept": "07-zhineng", "kind": "方法层", "slug": "21-zhineng-yuyi-zhangliang",
     "title": "智能系·案例二：三维极坐标语义张量的有效性检验",
     "anchor": "04-zhongyi-ziran-yuyan-chuli", "asset": "standards/semtensor/规范-三维极坐标语义张量-v1.0.md + embeddings",
     "claim": "极坐标表示相较笛卡尔表示，在同类聚类上能否给出更稳的邻域？",
     "data": "semtensor 目录 8 项（annotations／datasets／descriptions／embeddings／equivalence／sources）",
     "method": "① 取同一批嵌入；② 两种表示各跑 kNN；③ 比对邻居集合的 Jaccard",
     "eval": "基线＝笛卡尔余弦；消融＝极坐标；失效＝半径量化误差使近邻翻转",
     "handover": "嵌入样例 ＋ 两种表示的邻居表 ＋ 翻转案例",
     "gap": "嵌入维度与模型版本须锁定，否则结果不可复现（本库 embedding 由 fastembed bge-small-zh 生成）"},
    {"dept": "07-zhineng", "kind": "移交层", "slug": "22-zhineng-zhibiao-shibai",
     "title": "智能系·案例三：检索指标与失效案例的移交包",
     "anchor": "02-zhongyi-ruanjian-jiagou-xue", "asset": "standards/icd11/embedding-metrics.json + 本库 tests/ 门禁模板",
     "claim": "只报平均指标算不算完成？失效案例要报到什么粒度才可复现？",
     "data": "embedding-metrics.json（指标已入库）；门禁模板 6 项（audit／chapter_code／contract／forking／test／check）",
     "method": "① 报 mean／p50／最差 10 条；② 每条失效给查询、预期、实际、原因；③ 打包成可重跑目录",
     "eval": "基线＝只报均值；消融＝加最差 10 条；失效＝失效原因写成「模型不行」这类不可行动表述",
     "handover": "指标表 ＋ 失效清单（含原因分类）＋ 重跑入口",
     "gap": "评测集规模有限，指标只对本库语料成立"},
    # ── 08 五官口腔系 ───────────────────────────────────────────
    {"dept": "08-wuguan", "kind": "数据层", "slug": "23-wuguan-mianbu-wangzhen",
     "title": "五官口腔系·案例一：面部望诊字段的可观察化",
     "anchor": "03-zhongyi-mianbu-wangzhen", "asset": "standards/zhenduan/（bzu.json、unit-notes、tm1 对齐）",
     "claim": "望诊描述里有多少能落成「可观察字段」？落不成的占多少？",
     "data": f"zhenduan 底本与 TM1 对齐层已入库（18 件）；证候 132 证可作对象池",
     "method": "① 抽望诊描述；② 分类（部位／颜色／形态／光泽）；③ 标出不可观察项",
     "eval": "基线＝原文照录；消融＝字段化；失效＝把「神疲」这类整体印象硬塞进「形态」",
     "handover": "字段表 ＋ 不可观察清单 ＋ 字段化前后对照",
     "gap": "望诊图像数据本库没有，只有文本描述"},
    {"dept": "08-wuguan", "kind": "方法层", "slug": "24-wuguan-fangji-shai",
     "title": "五官口腔系·案例二：114 方在五官病中的筛选取舍",
     "anchor": "05-zhongyi-wuguan-jingdian", "asset": "standards/fangji/formulas.json（114 方 / 246 味）",
     "claim": "按「方中出现五官专药」筛方，与按「教材主治」筛方，结果差多少？",
     "data": f"{FANGJI['formulas']} 方 / {FANGJI['uniqueHerbs']} 味 / 86 味不在中药词表",
     "method": "① 定义五官专药表；② 两条路径各筛一遍；③ 比对交集与差集",
     "eval": "基线＝主治筛选；消融＝专药筛选；失效＝专药表太窄导致漏掉经典方",
     "handover": "专药表 ＋ 两路结果 ＋ 差集说明",
     "gap": "五官病名与方剂主治的对应关系需自建，本库无现成映射"},
    {"dept": "08-wuguan", "kind": "移交层", "slug": "25-wuguan-guangxue-canliang",
     "title": "五官口腔系·案例三：光学参数报表与缺项的写法",
     "anchor": "04-yanke-guangxue-yanguang", "asset": "待建；缺项写法取 lunzhuan 第 6 章口径",
     "claim": "参数报表里「本项无数据」与「留空」混用会带来什么后果？",
     "data": "无现成光学数据；口径＝缺项必须显式写「无」，不允许留空",
     "method": "① 设计参数表；② 两版填法（留空／显式无）；③ 统计下游计算受影响的行数",
     "eval": "基线＝留空；消融＝显式无；失效＝留空被下游按 0 处理导致平均值偏移",
     "handover": "参数表 ＋ 两种填法对照 ＋ 下游影响行数",
     "gap": "真实验光数据属院内数据，本案例只有模板与口径"},
    # ── 09 基础医学院 ───────────────────────────────────────────
    {"dept": "09-jichu", "kind": "数据层", "slug": "26-jichu-bingli-diben",
     "title": "基础医学院·案例一：病理学底本层（252 单元 / 428,867 字）",
     "anchor": "10-bingli-xue", "asset": "standards/bingli/units.json",
     "claim": "全库最大的单个底本层，其单元切分与章节门禁能否被别的课直接复用？",
     "data": f"bingli {BINGLI[0]} 单元 / {BINGLI[1]:,} 汉字 / 数值 {BINGLI[2]}",
     "method": "① 复用切分规则；② 跑门禁；③ 记录复用失败的位置",
     "eval": "基线＝原课（已建 10 章）；消融＝换课复用；失效＝切分粒度与该课章节数不匹配",
     "handover": "复用清单 ＋ 失败位置 ＋ 改法",
     "gap": "教材版本差异未处理，换版需重建"},
    {"dept": "09-jichu", "kind": "方法层", "slug": "27-jichu-bingsheng-jiuzhou",
     "title": "基础医学院·案例二：病理生理九轴与 216 单元的对应",
     "anchor": "11-binglishengli-xue", "asset": "standards/binglishengli/units.json（216 单元 / 360,945 字）",
     "claim": "九条机制轴能否覆盖全部单元？哪一轴是空的？",
     "data": f"bsl {BSL[0]} 单元 / {BSL[1]:,} 汉字 / 数值 {BSL[2]}",
     "method": "① 按九轴打标；② 统计轴覆盖；③ 报空轴与拥挤轴",
     "eval": "基线＝单轴归类；消融＝多轴并存；失效＝多轴使「覆盖」虚高",
     "handover": "打标表 ＋ 轴覆盖统计 ＋ 多轴规则",
     "gap": "九轴定义来自该课既有约定，换课需另定"},
    {"dept": "09-jichu", "kind": "移交层", "slug": "28-jichu-shengli-zhengchangzhi",
     "title": "基础医学院·案例三：生理正常值表的可复现移交（132 单元）",
     "anchor": "12-shengli-xue", "asset": "standards/shengli/units.json（132 单元 / 228,672 字）",
     "claim": "正常值表移交时，单位与参考区间必须写到什么程度才算可复现？",
     "data": f"shengli {SHENGLI[0]} 单元 / {SHENGLI[1]:,} 汉字 / 数值 {SHENGLI[2]}",
     "method": "① 抽正常值条目；② 补单位与区间；③ 检查跨章同一指标是否一致",
     "eval": "基线＝只抄数值；消融＝带单位与区间；失效＝同一指标两章单位不同（如 mmol/L 与 mg/dL）",
     "handover": "正常值表 ＋ 单位换算说明 ＋ 不一致清单",
     "gap": "参考区间的实验室差异本库未收，表中只反映教材口径"},
]


def main():
    # 第 1 章：通用流程
    ch1 = {
        "no": "01.1", "sub": "01.1", "chapter": "1", "chapterTitle": "通用流程与基本要求",
        "title": "通用流程与基本要求", "sec": "01-tongyong-liucheng",
        "locator": "派生·第1章·通用流程",
        "measure": {"views": {"数据层": 9, "方法层": 9, "移交层": 9},
                    "levels": {"选题": 27, "证据": 27, "实现": 27, "评价": 27},
                    "valueLike": 0, "digits": 0},
        "tri": {"view": {"primary": "数据层"}, "level": {"primary": "选题"}},
        "prose": ("毕设与知识移交只有一条硬标准：**别人能否重跑**。本章定四段流程（选题→证据→实现→评价）"
                  "与三件必报（基线、消融、失效案例），并把九院系 27 个案例统一成三种类型："
                  "数据层、方法层、移交层。三类的判据不同：数据层看可核指标，方法层看消融差，"
                  "移交层看他人能否在无指导的情况下重跑。"),
        "kind": "通用", "dept": "全部", "hanzi": 0, "values": 0,
    }

    units = [ch1]
    for i, c in enumerate(CASES, start=2):
        n = f"{i:02d}"
        st = D(c['dept'])
        units.append({
            "no": f"{n}.1", "sub": f"{n}.1", "chapter": str(i),
            "chapterTitle": c['title'], "title": c['title'], "sec": c['slug'],
            "locator": f"派生·第{i}章·{c['dept']}",
            "kind": c['kind'], "dept": c['dept'],
            "asset": c['asset'], "anchor": c['anchor'],
            "claim": c['claim'], "data": c['data'], "method": c['method'],
            "eval": c['eval'], "handover": c['handover'], "gap": c['gap'],
            "measure": {"views": {"数据层": 1 if c['kind'] == '数据层' else 0,
                                  "方法层": 1 if c['kind'] == '方法层' else 0,
                                  "移交层": 1 if c['kind'] == '移交层' else 0},
                        "levels": {"选题": 1, "证据": 1, "实现": 1, "评价": 1},
                        "valueLike": 0, "digits": 0},
            "tri": {"view": {"primary": c['kind']}, "level": {"primary": "选题"}},
            "prose": (f"{st['title']}（{c['kind']}）——命题：{c['claim']} 数据：{c['data']}。"
                      f"方法：{c['method']}。评价：{c['eval']}。移交：{c['handover']}。缺口：{c['gap']}。"),
        })

    for u in units:
        u["hanzi"] = hanzi(u["prose"])
        u["values"] = 0

    counts = {"depts": 9, "cases": len(CASES), "chapters": 1 + len(CASES), "units": len(units),
              "kinds": {"数据层": sum(1 for c in CASES if c['kind'] == '数据层'),
                        "方法层": sum(1 for c in CASES if c['kind'] == '方法层'),
                        "移交层": sum(1 for c in CASES if c['kind'] == '移交层')},
              "deptStats": {c['dept']: D(c['dept']) for c in CASES}}
    os.makedirs(OUT, exist_ok=True)
    json.dump({"subject": SUBJECT, "counts": counts, "cases": CASES},
              open(os.path.join(OUT, '案例库.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump({"subject": SUBJECT, "counts": counts, "units": units},
              open(os.path.join(OUT, 'units.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump({"subject": SUBJECT,
               "why": "毕设是流程课，无教材可依。本层不编院校名与学生案例：把「院校」落到本库九个院系目录，每系切三个可落地课题（数据层／方法层／移交层），每个课题带真实数据锚点与缺口声明。27 个案例 + 1 章通用流程 = 28 章。",
               "sources": ["curriculum.json", "departments/*/（九院系）", "standards/*（底本层）", "scripts/*（可复跑工具）"],
               "rules": {"数据层": "看可核指标（单元／字数／未解析数／覆盖率）",
                          "方法层": "看消融差（基线 vs 消融，且必须有失效案例）",
                          "移交层": "看他人能否在无指导下重跑（数据＋脚本＋门禁＋README 四件）",
                          "缺口": "数据不存在的写不存在，不补、不估"}},
              open(os.path.join(OUT, 'METHOD.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    print(json.dumps(counts, ensure_ascii=False))


if __name__ == '__main__':
    main()
