# ICD-11 第 26 章 · 术语命名规则与官方中文名

本目录收「**官方怎么说**」而不是「我们怎么想」：

| 文件 | 是什么 | 进不进版本库 |
|---|---|---|
| `README.md` | 官方命名规则的原文摘录 + 本仓库据此落成的规则 | 进 |
| `../zh-names.json` | 第 26 章 **1,120 条**实体的 WHO 官方中文名（TM1 472 条全译） | 进（可复现，源 sha256 在 `meta`） |
| `axes.json` | **四轴词表**（105 项轴词 + 轴序 + 7 条中文构件）+ 组合器产物 | 进（全部可复算） |

服务对象是 `scripts/icd11_terms.js`（术语嵌入层）与 `scripts/build_embeddings.js`（⑦ 通道）。

---

## 一、为什么需要这份材料

仓库的 ICD-11 快照（`data/icd11/entities.ndjson`，release **2025-01 mms**）里，第 26 章是这样的：

```
code        SF62
title       Dual deficiency of heart qi and blood pattern (TM1)
indexTerms  Dual deficiency of heart qi and blood pattern (TM1)   ← 索引词就是题名自身，没有同义词
hasDefinition  false                                              ← 没有定义
```

实测：第三方快照第 26 章 **346 条 TM1 + 530 条 TM2**，`hasDefinition` 全为 `false`；
而 WHO 官方发布文件里是 **472 条 TM1 + 648 条 TM2**（见 §六：多出的 244 条已补进术语层）。也就是说，
中文侧在术语层里是**空白**的，而「一个证候该叫什么名字」这件事，ICD-11 并没有写进数据文件，
而是写在**指导材料**里 —— 名字本身则在 **WHO 官方中译本**里。两样都不是猜得出来的。

---

## 二、官方原文（逐字摘录）

来源：*International Classification of Diseases, Eleventh Revision (ICD-11) — Reference Guide*,
World Health Organization, 2022（CC BY-ND 3.0 IGO）。
`https://icdcdn.who.int/icd11referenceguide/en/refguide.pdf`
sha256 `55808d0d1d9358c1bdade96a29541c610624d8d6ebcb76081d87ec882cde48b1`（7,563,502 字节，473 页）
页码为 PDF 页（括号内为印刷 folio 页）。

### 1. 与西医章节并列编码（§1.5，PDF p.44）

> It is recommended that coding of cases with ICD-11's chapter on Traditional Medicine
> disorders and patterns (TM1) be used in conjunction with the Western Medicine concepts of
> ICD Chapters 1-25.

### 2. 编码方案：西医诊断 + TM1 证候并列（§2.23.24，PDF p.284）

> Be as specific and explicit as possible, using codes to represent aetiology, pathology and
> manifestations of TM condition.
>
> The following generic coding scheme and alternative coding options can be used:
> 1. Read the patient summary and medical record.
> 2. Select WM diagnosis/diagnoses, TM1 disorder(s) (TM1), and/or pattern(s) (TM1) to be coded.

原文给的例子（同页表格）：

| Options | Examples | ICD-11 Coding |
|---|---|---|
| b. WM diagnosis with TM1 pattern | Asthma / **Turbid phlegm accumulation in the lung pattern (TM1)** | CA23.32 / **SF86** |
| c. WM diagnosis with TM1 disorder | Asthma / **Wheezing disorder (TM1)** | CA23.32 / **SF81** |

> Codes from the Traditional Medicine chapter can be used across settings … but **must not be
> used for reporting cause of death**.

### 3. 用 disorder / pattern，不用 disease / syndrome（§3.2.26 · Terminology，PDF p.330）

> The Supplementary Chapter Traditional Medicine Conditions, Module 1, uses the terms
> **disorder** and **pattern** to describe concepts. This is different from the concept
> descriptions in the Western Medicine chapters which refer to diseases (clinical pictures) and
> syndromes (clinical presentations). The TM1 chapter is divided into separate sections for
> disorder and pattern to emphasise the independence of these concepts.

### 4. 两个定义（§3.2.26 · Definitions，PDF p.330）

> A **disorder** in traditional medicine (disorder (TM1)) refers to a set of dysfunctions in any
> body system which is judged from associated signs, symptoms or findings. … A disorder (TM1) is
> a clinical picture that is **relatively stable** and reflects the local pathology …
>
> A **pattern** in traditional medicine (pattern (TM1)) refers to the manifestation of the
> patient's health condition **at a given moment in time** … A pattern (TM1) is a clinical
> picture that is **relatively temporary**, reflects on the systemic response of the patient …

原文 Table 1 给的区分维度：`Constant/Temporary` · `Constant Pathology/Temporary Response` ·
`Specific/Non-specific` · `Linear/Multifactorial`。

### 5. **命名规则本体**（§3.2.26，PDF p.331）

> **Traditional Medicine disorder and pattern are named after the body structures, causal
> explanations, properties and severity** which present for clinical investigation and diagnosis.
>
> TM1 pattern may denote an individually different pattern (TM1) of systemic responses to the WM
> disease or TM1 disorder.

同页另一段（解释了 TM1 后缀为什么必须留着）：

> The English terms do not necessarily represent the most common translation of the TM terms in
> Chinese, Korean or Japanese. Where the best fit English TM translation resulted in the same
> term as used in Western Medicine, it was necessary to indicate a difference between the Western
> Medicine (WM) concept and TM concept where the same term had different definitions in TM and WM.
> This difference in definition is indicated by the use of **(TM1)** for disorders and patterns
> throughout the TM chapter.

---

## 三、落成代码的四条规则

| 规则 | 原文依据 | 落地位置 | 怎么守 |
|---|---|---|---|
| **R1 模块分账**：第 26 章不是一章，是两个体系 | WHO 表里 472 条 `(TM1)` + 648 条 `(TM2)`（快照只收 876）；TM2 的块标题是 *Vata predominant*、*Varmam and Marmam*（阿育吠陀/悉达） | `icd11_terms.js` `moduleOf()`；`runSearch({modules})` | 测试：TM2 查询在 `modules:['TM1']` 下一条不漏出；西医章节不许被连带拦掉 |
| **R2 disorder ≠ pattern**：同名不等于同概念 | §3.2.26 Terminology + Table 1 | `runSearch()` 同名通道只做大小写/空白归一，**不去「证」后缀、不做形近** | 测试：「胁痛证」不得命中「胁痛」（SA00）的同名通道 |
| **R3 命名四轴**：body structures / causal explanations / properties / severity | §3.2.26 命名句 | `build_tm1_axes.js`：词表 + 轴序 + 组合器（见 §五） | 测试：词项必须真出现过 / 轴序必须统计得来 / 官方没的词要标出 |
| **R4 并列编码**：TM1 与第 1–25 章并列，不能互斥 | §1.5 + §2.23.24 的 b/c 两行例子 | `runSearch({modules:['TM1']})` 的语义是**只拦 TM2**，西医单元没有 module 一律放行 | 测试：「失眠」在排除 TM2 后仍要能回到西医的 MG41 |

---

## 四、官方中文名：`../zh-names.json`

### 来源与性质

| 项 | 值 |
|---|---|
| 文件 | `SimpleTabulation-ICD-11-MMS-zh.zip` → 内 `SimpleTabulation-ICD-11-MMS-zh.txt`（11.4 MB，36,782 行） |
| URL | `https://icdcdn.who.int/static/releasefiles/2026-01/SimpleTabulation-ICD-11-MMS-zh.zip` |
| 发布者 | **World Health Organization** · ICD-11 MMS **2026-01**（CC BY-ND 3.0 IGO）；`ICD11_RELEASE` 可切版本 |
| sha256 | 见 `meta.source.sha256`（对解压后的 .txt 计算） |
| 凭据 | **不需要**。WHO 每个发布版都在公开 CDN 上放这个文件，解压即用 |

这是 WHO 的**原件**，不是转写。上一版用的是 NRICM TWCM IG 的第三方转写（只有 disorder，216 条），
两者在 **216 个共有码**上按简体归一后 **171 条逐字相同、45 条不同**，差异是实质性的：

| 码 | 第三方转写 | WHO 官方 |
|---|---|---|
| SA50 | 噎嗝 | **噎膈** |
| SA60 | 普通感冒 | **感冒** |
| SA84 | 肺热 | **肺热病** |
| SB2Y | 其他特指的脏腑系统病类 | **其他特指的脏腑系统疾病** |

### 口径

- 取 `ClassKind = category` 且 `ChapterNo = 26` 的行：**1,120 条**（TM1 **472** · TM2 **648**）。
- `zh` 去掉层级短横与 `（TM1）/（TM2）` 标记（标记是概念标签，不是名字的一部分），`zhRaw` 保留原文。
- **模块从英文题名取**：TM2 在中译本里没有中文题名，若从中文取模块会把整章 650 条判成「无模块」。
- 与快照逐条对账：快照第 26 章 **876 个码全部命中，英文题名不一致 0 条**；WHO 表另有 **244 个码**
  快照没有 —— 这 244 个**不再只是登记**：术语层用它们补齐了索引（见 §六）。
- **发布版之间第 26 章没变**：2025-01 与 2026-01 的中文表在这一章都是 1,120 条 / 472 条带中文，
  逐码一致（整表新增 354 个码都属于别的章）。所以换到 2026-01 是为了「跟最新」，不是为了补第 26 章。

### 关键事实：中译本只译了 Module I

| | 条目 | 有中文名 |
|---|---|---|
| TM1（中医/日韩） | 472 | **472（100%）** |
| TM2（阿育吠陀/悉达） | 648 | **0** |

TM2 整章在 WHO 中译本里题名为空 —— 这是**源头缺**，不是解析漏。它同时也解释了为什么
「补 pattern 中文名」这件事对中医侧是完整的：**SF/SG/SH 共 173 条证候名全在 TM1 里，全部有官方中文**。

---

## 五、四轴词表与探针组合器（R3 的落地）

> `scripts/build_tm1_axes.js` → `axes.json` · 测试 `tests/test_tm1_axes.js`（11 项）

官方那句话（§3.2.26）说证候名按**身体结构 / 病因解释 / 属性 / 严重程度**命名。
本轮把它做成可执行的两样东西：

| 产物 | 内容 | 怎么保证不是编的 |
|---|---|---|
| `lexicon` | **105 项轴词**（locus 38 · cause 12 · property 50 · severity 5），每项带 `n`（在 472 条官方题名里出现几次）与示例编码 | 种子人工列，**只保留出现 ≥1 次的**；零次的 40 个进 `audit.droppedSeeds`（如 `heart system`、`six bowels`、`alcohol`、`mild`） |
| `grammar.order` | **locus → severity → cause → property** | 只用「出现了 ≥2 个不同轴」的官方题名两两计先后（`locus>property=77`、`cause>property=30`），单轴题名不参与 |
| `zhExtensions` | **7 条中文构件**：壅→obstructing、痹→impediment、瘀→stasis、阻→obstruction、亏→depletion、淫→factor、犯→invading | 每条都有**官方 zh/en 对**作出处（`SF89 痰热壅肺证 = Phlegm heat **obstructing** the lung pattern`），`--check` 逐条核对 |
| `probeForZh()` | 中文证名 → 切词 → 逐片段归轴 → 按官方轴序重排 → 拼探针 + 查**同构先例** | 归不了轴的词**逐个列出**（`uncovered`），不假装它也是四轴词 |

替换掉的是什么：旧 D 级探针「查 WHO 词表 → 最长匹配切词 → 英文词按出现顺序拼」，
只保证「每个字都在表里」。现在多两道关：**每段必须落在某条轴上**，**组合在官方题名里要有先例**。

**发布门（本轮新增）**：这两关的结果直接决定下游能不能用。`lib_equivalence.probes()` 默认
`gate:'axes'` —— 只放行 `axisClean` 的 **42** 条探针；其余 **24** 条进 `referenceOnly`
（带 `reason`，指出哪个词不在官方词汇里），**不参与排序但照样返回**。
实测门开/门关对 104 个证候的 top-1 **零差异**：挡掉的正好是不起作用的那些。

```
痰热壅肺证   → lung phlegm heat obstructing pattern    [axisClean] 先例 SF89
风寒束表证   → cold exterior pattern                    [axisClean] 先例 SF87
肝肾亏虚证   → liver kidney deficiency depletion pattern [axisClean]
热毒犯肺、痰瘀阻络证 → lung heat phlegm stasis obstruction invading toxin pattern
                                                     ↑ toxin 不在 472 条题名里 → axisClean=false，如实标出
```

**为什么只有 7 个中文构件、不更多**：官方 472 条中文名里**没有**「内停」「失养」「浸淫」「互结」
「晶珠混浊」。没有出处就不补 —— 硬造一个英文词，只会把「查不到」变成「查错了」。
所以 `水湿内停证` 的探针是 `water dampness pattern`，`内停` 留在 `unmatchedZh` 里。

## 六、快照缺口补齐（244 个码 → 术语层）

第三方快照（`marcolomele/vectorization-ICD11`，2025-01）第 26 章只有 **876** 个码，WHO 官方表有 **1,120**。
差的 244 个里，**126 个是 TM1、且都带官方中文名**（其余 118 个是无中文的 TM2）。

不补的后果不是「少几个码」—— 是这 126 个 TM1 证候在术语层里**根本不存在**：查不到、排不上、也不会出现在任何 top-k 里。

补的办法（`icd11_terms.js` 的 `readEntities()`）：

```
data/icd11/entities.ndjson（快照，13,960 条，含 898 条无编码的块/分组）
  + standards/icd11/zh-names.json 里「WHO 有、快照无」的 244 条（标 synthetic:true + source）
  = 13,306 条有码实体
```

- **不混称**：`synthetic` 实体只有 code / 标题 / 章节，**没有定义、没有父链**；快照来的实体不带该标记。
- **不猜**：标题与中文名都来自 WHO 发布文件，不做任何补写。
- **可核对**：`meta.docs.supplementEntities = 244`，测试断言 `entitiesRead = 快照行数 + 244`。

补完后的效果：官方中文名回查 **346 → 472**（TM1 全量），104 证候 top-1 仍是 **103**（那 244 条补的是
「本来查不到的角落」，不是主赛道）。这也说明主赛道早就跑满了，剩下的是覆盖率。

## 七、效果（可复算）

```
npm run icd11:zh-names && npm run icd11:terms && npm run icd11:terms:eval
```

| 指标 | 只有第三方 disorder 表 | **WHO 官方表（含 pattern）** |
|---|---|---|
| 有中文名的实体 | 150 | **472**（TM1 全量） |
| 官方中文名回查 top-1 回到自身 | 150/150 | **472/472（100%）** |
| 104 证候 top-1 落到 TM1 | 88 | **103**（四轴探针之后再 +4） |
| 104 证候 top-4 含 TM1 | 97 | **104** |
| 无命中 | 5 | **0** |
| 证候有英文探针 | 60 | **66**（其中 axes 42 · glossary 24） |
| 未解析（无英文等价） | 15 | **9**（5 个证候 + 4 个维度 生理/心理/社会/生态） |

**+11 个 top-1 是从哪来的**（逐条归因，`data/icd11/term-index/eval.json` 可复核）：

| 通道 | 条数 | 说明 |
|---|---|---|
| 同名通道（查询串 = 官方名） | **14** | 例：`痰热壅肺证 → SF89`、`肝胆湿热证 → SF5A`、`肝阳上亢证 → SF52`、`心肾不交证 → SF6L` |
| 向量 / FTS 中文 bigram | 89 | 没有全等，靠「阴虚」「血瘀」「脾虚」这类字面重叠排上来 |
| top-1 仍是西医章节 | 4 | `寒哮证→MD11.C`、`痰湿壅肺证→LA75.1` 等，属并列编码可接受，但不理想 |

只有 14 条是「名字一样所以对上了」，剩下 89 条是**中文语料终于存在**之后向量才好起来的 ——
这两件事必须分开说，否则会把「名字撞上」说成「语义懂了」。

「失眠」现在的并列编码：`SF6J Heart and spleen systems deficiency pattern (TM1)`（证候腿）+
`MG41 Sleep disturbance, NEC`（主诉腿），正是 §2.23.24 的 b/c 两行所要求的形式。

---

## 八、未落地（写在这里，免得下次又当成已完成）

- **四轴词表的深度**：105 项轴词覆盖了 363/472 条官方题名（77%），未解析的 109 条多是
  disorder 名（palpitation / deafness / strangury 这类临床图像），它们本来就不是四轴组合出来的。
  少数字（如 `toxin`、`failure to constrain`、`non interaction`）在 WHO 的 TM1 英文里**根本不用** ——
  这类探针会被标 `axisClean=false`，这是设计意图，不是缺陷。
- **四轴只用于检索**：探针不是翻译、不是等价，`translate()` 不返回它；`members` 里也没有它。
- **TM2 无中文名**（648 条）：源头没译，无法补 —— 只能说清，不能编。
- **中文定义/症状**：第 26 章在快照里 `hasDefinition` 全 false，中文定义更不存在。
  所以「术语嵌入」在这里嵌的是**名字**，不是释义；「症状 → 证候」的中文语义匹配仍缺权威依据。
- **快照缺 244 个码 → 已补**（见 §六）：术语层现在索引 WHO 的全量 1,120 条。
  但补进来的 244 条**只有 code/标题/章节**，没有定义、没有父链、没有索引词 ——
  它们的 `entity` 单元比快照来的那 876 条要薄，这是已知差别，不掩饰。
- **WHO API 仍然要凭据**：`id.who.int` 401。`icd.who.int/zh` 上能公开取的是**发布文件**
  （Simple Tabulation，含中文题名）与指南 PDF；**定义/索引词/父链只走 API**，
  所以「一个证候的官方释义」这一步仍然缺。要补只有注册 ICD-API（免费）拿 client id/secret。

## 九、复核

```bash
python scripts/build_icd11_zh_names.py --fetch   # 下载 WHO 官方中译本（缓存在 data/icd11/sources/）
python scripts/build_icd11_zh_names.py           # 生成 standards/icd11/zh-names.json
python scripts/build_icd11_zh_names.py --check    # 结构/覆盖/对账自检（已挂 npm run check）
python scripts/build_icd11_zh_names.py --sample 心气血两虚证 肺阴虚证 胁痛
node tests/test_icd11_terms.js                   # D 节：分账 + 中文名 + 同名通道
node scripts/build_tm1_axes.js --probe 痰热壅肺证  # 四轴组合器：看轴分解与同构先例
node tests/test_tm1_axes.js                      # 四轴词表 11 项
```
