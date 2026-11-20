# 第 2 章 · 药材源头：GACP 与可持续供应

> **层次**：本文件是**本库撰写层**（无底本表，不是源正文层）。依据是 WHO《GACP for medicinal plants》（2003）与《质量与污染物评估指南》，条文登记于 `standards/zhongyao-xinyao/外源条文.json`，逐字可核。
> **依据**：`standards/zhongyao-xinyao/补源登记.json`（`python scripts/build_zhongyao_xinyao_sources.py --check` 现算）。
> **免责**：本章为药材源头管控的教学整理，不构成诊断或治疗建议。

## 本章要回答的问题

同一种药材，甘肃产的与安徽产的、野生采的与家种的、霜降前收的与霜降后收的，检验都能合格，疗效却不同——这不是检验不准，而是**检验只能证明「合格」，不能证明「一样」**。本章讲 GACP 到底管什么、它为什么只是第一步，以及「可持续供应」为什么是质量标准的一部分而不是环保口号。

> 「Good agricultural and collection practices for medicinal plants is only the first step in quality assurance, on which the safety and efficacy of herbal medicinal products directly depend upon, and will also play an important role in the protection of natural resources of medicinal plants for sustainable use.」（外源·good agricultural and collection practices 第2条）

## N.1 概念与出处

三句话搭起本章骨架：

1. **质控直接影响安全与有效性**——「Quality control directly impacts the safety and efficacy of herbal medicinal products.」（外源·good agricultural and collection practices 第1条）
2. **GACP 是质量保证的第一步，不是全部**——上引第2条，句中的「only the first step」是关键限定词。
3. **没有源头措施就没有稳定供应**——「Safety and quality assurance measures are needed to overcome these problems and to ensure a steady, affordable and sustainable supply of medicinal plant materials of good quality.」（外源·good agricultural and collection practices 第3条）

三句合起来是一个判断：**药材质量不是生产出来的，是种（采）出来的，生产只能「保持」它**。这也解释了为什么 GACP 条文会把「资源的可持续利用」和「质量保证」写在同一句里——资源断了，质量就无从稳定。

## N.2 为什么可以这样翻译：源头五要素与两条底线

GACP 讲的是「农业与采集」这一段的规范，落到教学上可拆成五个要素，每个要素都有可观测的后果：

| 要素 | 要定的事 | 断了的后果 |
|---|---|---|
| 基原 | 哪一物种、哪个变种（拉丁名到种以下） | 同名异物，成分谱完全不同 |
| 产地 | 产区与小环境（海拔、坡向、土壤） | 同种不同地，次生代谢产物差异 |
| 来源方式 | 野生采集 / 栽培（含轮作、间作） | 野生资源被采空，或栽培农残超标 |
| 采收期 | 物候期与年限（如「霜降后采挖」） | 指标成分含量成倍差异 |
| 初加工 | 清洗、切制、干燥方式与温度 | 霉变、有效成分降解 |

两张表外还有两条底线，直接来自条文：

- **污染来源在源头就已埋下**：条文明确「Chemical and microbiological contaminants can result from the use of human excreta, animal manures and sewage as fertilizers.」（外源·WHO guidelines for assessing quality of herbal medicines 第2条）——用粪肥、污水灌溉就是污染源，不是加工环节的错。
- **重金属来自生长吸收**：「herbs may absorb heavy metals during growth」（外源·WHO guidelines for assessing quality of herbal medicines 第5条）
- **没有源头措施就没有稳定供应**（第3条已引）与「GACP 只是第一步」（第2条）共同说明：GACP 的产出不是「合格证书」，而是**可复现的批次一致性**。——所以重金属限度不能只靠成品挑拣解决。

**产地为什么会变**（教材必须交代，否则「产地固定」就成了不可执行的断言）：三类触发——① 资源枯竭，野生资源被采到无法商业化采集；② 产区城镇化或转种更高收益作物；③ 野生变家种、家种换产区。三类都会让同一品种的物质基础发生漂移，因此产地变更不是采购决定，而是**需要桥接研究的技术事件**（第 8 章把这一条接进变更管理）。

**采收期怎么判定到可执行**：不能只写「适时采收」，要给三个可测锚点——物候期（开花前/果熟后）、生长年限（如 3 年生 vs 5 年生）、以及指标成分含量随月份的实测曲线。传统经验（「霜降后采挖」）与实测曲线一致时互相印证；不一致时以实测为准并记录分歧，这是本项目要求教材写清的处置顺序。

**可持续供应为什么算质量条款**：条文用「steady, affordable and sustainable supply ... of good quality」四件事并列。同一种药材若因过度采集导致产区转移、基原被迫替换（常见于野生变家种），质量一致性的前提就消失了。教材里把「资源」放在质量章而不是环保章，理由在此。

## N.3 这个翻译丢掉了什么

- **不给农艺参数**：施肥量、灌溉方式、遮阴比例、病虫害防治的具体药种与次数，GACP 只给原则，不给数值。
- **不给产区名录**：哪些县是道地产区，属地方标准与商品学内容，条文不列。
- **不给农残/重金属限度值**：限度在药典与食品标准里（第 5 章讲其检验逻辑），GACP 只说「需要措施」。
- **不给「道地药材」的定义**：这是中医药学概念，WHO 文件不使用该词。教材若把「道地」当作条文要求来写，就是张冠李戴。
- **不给采集许可与配额制度**：野生物种的保护性采集涉及国内野生动植物保护法规，不在 WHO 文件范围。

## N.4 与相邻学科的接口

| 相邻学科 | 接口 |
|---|---|
| 中药鉴定学 | 基原鉴定是 GACP 的第一道门；性状与显微鉴别在此衔接 |
| 中药资源学 | 产区、蕴藏量、野生变家种，是「可持续供应」的技术支撑 |
| 中药化学 / 分析 | 采收期与初加工对成分谱的影响，用指纹图谱验证 |
| 药事管理 | 药品追溯制度要求来源可追，与产地记录对接 |

## N.5 争议与本项目立场

**争议一：「道地药材」要不要写进教材？** 要写，但必须标清它是**传统品质概念**，不是 GACP 条文。本项目的做法是：讲产地差异时给出「可观测的替代指标」（成分谱、浸出物、传统性状），而不是让「道地」成为不可检验的断言。

**争议二：野生与栽培谁更好？** 条文不判优劣，只要求「来源方式明确 + 质量稳定」。实务中野生常被认为成分谱更「全」，但供应不稳定、基原混杂风险高；栽培可控但可能因选育导致成分偏移。教材应写「两种来源各自的失效模式」，不写「哪种更好」。

**争议三：源头控制能否代替成品检验？** 不能。条文说 GACP 是「第一步」，反过来成立：**成品检验也不能代替源头控制**——成品抽样对微生物分布不均、重金属局部富集这类问题检出能力有限。两者是串联关系，任一环缺位都会把风险推到下一环。

> **免责**：本章所列条文与判据不构成诊断或治疗建议；具体药材的基原、产地与限度须以现行药典与标准为准。

## 小结

1. 药材质量「种（采）出来」的多，生产只能保持，不能创造。
2. GACP 是质量保证的第一步（条文明写 only the first step），不是质控本身。
3. 五个要素（基原、产地、来源方式、采收期、初加工）各自对应可观测后果。
4. 污染与重金属在生长阶段就已进入，成品挑拣解决不了。
5. 可持续供应是质量稳定性的前提，属质量条款而非环保口号。

## 思考题

1. 为什么「检验合格」不能推出「两批药材一样」？请用本章五要素中的两个举例说明。
2. 条文把「资源的可持续利用」写进质量保证的同一句里，逻辑是什么？
3. 若某企业把 GACP 当作「供应商审核清单」使用，会漏掉哪一类风险？

## 延伸阅读

- `standards/zhongyao-xinyao/外源条文.json`（W06–W08；Q02、Q05）
- 第 5 章《污染物与残留：限度、来源与检验》——本章埋下的污染源在此展开
- `standards/zhongyao-xinyao/sources/`（WHO GACP 2003 原件与 sha256）
