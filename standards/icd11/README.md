# ICD-11 客户端（规格组件 ⑦「双通道」）

> 客户端：`scripts/icd11_client.js` · 测试：`tests/test_icd11_client.js`
> 本地库：`data/icd11/`（**不入版本库** —— 快照 19.5 MB 且版权属 WHO，按 sha256 可重现）

## 规格原文写的是什么

`standards/knowledge-tree/sources/中医知识树.xlsx` 的 `embedding-code` 工作表第 14–15 行：

```
# scripts/icd11_client.py
ICD_API_HEADERS = {"Accept": "application/json", "Accept-Language": "zh", "API-Version": "v2"}
# 通道1：内网 API 192.168.0.111:8080（中文搜索 → Foundation ID）
# 通道2：本地 data/icd11_mms.db（31,838 实体；Foundation ID → MMS 标准编码）
def code_by_id(foundation_id):
    return conn.execute("SELECT id, code, title FROM entities WHERE id=?",
                        (str(foundation_id),)).fetchone()
```

规格写的「通道1」是源平台的内网部署，本机不可达。**WHO 的公开等价物**是 `https://id.who.int/`
—— 同一套语义（中文检索 → Foundation ID → MMS 编码），只是需要注册应用拿凭据。

## 通道1 · WHO 官方 API

| 项 | 值 | 出处 |
|---|---|---|
| 基址 | `https://id.who.int/` | WHO ICD-API 文档 v2 |
| 必带请求头 | `API-Version: v2` | 同上（v2 要求所有调用都带） |
| 认证 | OAuth2 `client_credentials` | 同上 |
| Token 端点 | `https://icdaccessmanagement.who.int/connect/token` | 同上 |
| scope | `icdapi_access` | 同上 |
| 端点形态 | **URI 即端点**（`http://id.who.int/icd/entity/257068234` 改成 https 直接请求） | 同上 |

**实测（无凭据）**：`id.who.int` 各端点一律 `HTTP 401`；token 端点无 body 时 `HTTP 400`。
即：**凭据是硬门槛，没有就取不到任何数据。**

凭据只从环境变量读，**只报键名有无，绝不打印值**：

```bash
export ICD11_CLIENT_ID='...'       # https://icd.who.int/icdapi → 「View API access key」
export ICD11_CLIENT_SECRET='...'
npm run icd11 -- --who-check       # 探测：取 token → 试取 MMS/CA00 的中文标题
```

## 通道2 · 本地库（已构建）

规格的 **31,838 实体是 ICD-11 Foundation 组件**（WHO-FIC 全域、含 ICF/ICHI、无编码、多父）。
那份数据不在本机可及范围内。**实际取到并可复现的是 MMS 线性化快照 13,960 行**
（WHO `2025-01` 版，经上游 [vectorization-ICD11](https://github.com/marcolomele/vectorization-ICD11)
数据集转出）。

> **13,960 ≠ 31,838。这是缩水，不是同一份库，不宣称等价。**

| 项 | 值 |
|---|---|
| 来源 | `https://raw.githubusercontent.com/marcolomele/vectorization-ICD11/main/Data/2-processing/icd11-25_data_clean.csv` |
| sha256 | `c4ffa495ad21b832b80b567da35b664aad42729177fb9518b01a91accdebbdf8`（19,461,645 字节） |
| 版本 | ICD-11 MMS `2025-01` |
| 实体 | 13,960（category 13,036 · block 788 · chapter 26 · window 110） |
| 存储 | NDJSON + 内存索引（**非 SQLite**：坚持零第三方依赖，且本机无 sqlite 可执行文件）。**查询语义**与规格一致，**存储格式**不同 |
| 版权 | ICD-11 内容版权归 WHO；上游仓库 GPL-3.0。因此快照**不入版本库**，按 sha256 可重现 |

**相对规格多出来的东西：父链还原章节。** MMS 单父，从任一实体沿 `parent` 上溯即可到
`class_kind=chapter`，于是「某个编码属于哪一章节」是**算出来的**，不是按编码前缀猜的：

```
BA00 · Essential hypertension
  category · BA00 · Essential hypertension
    block · Hypertensive diseases
      chapter · 11 · Diseases of the circulatory system
```

## 已跑通的校验：本仓库的 `icd11_map` 编码

```bash
npm run icd11 -- --validate
```

来源是知识树 xlsx「图谱接口」表（唯一事实来源，不手抄），**7/7 全部解析成功**：

| 编码 | 官方标题（快照） | 章节 |
|---|---|---|
| CA00 | Acute nasopharyngitis | 12 · Diseases of the respiratory system |
| 1E32 | Influenza, virus not identified | 01 · Certain infectious or parasitic diseases |
| DA60 | Gastric ulcer | 13 · Diseases of the digestive system |
| DD91.0 | Irritable bowel syndrome | 13 · Diseases of the digestive system |
| 1E51.0 | Chronic hepatitis B | 01 · Certain infectious or parasitic diseases |
| BA00 | Essential hypertension | 11 · Diseases of the circulatory system |
| 5A11 | Type 2 diabetes mellitus | 05 · Endocrine, nutritional or metabolic diseases |
| **MC81** | Abnormalities of heart beat | — （规格 `/semantic-search` 实测输出里的编码，独立验过） |

**结论：本仓库 `icd11_map` 里的编码是合法的 ICD-11 MMS 编码，且现在能算出章节。**
（此前它们只是字符串，从没被任何东西验过。）

## 用法

```bash
npm run icd11:ensure            # 取快照（校验 sha256）+ 建本地库
npm run icd11 -- --validate     # 校验本仓库 icd11_map 的编码
npm run icd11 -- --code BA00    # 按编码查（含父链）
npm run icd11 -- --id 1937339080  # 按 Foundation ID 查（规格签名 code_by_id）
npm run icd11 -- --search "heart beat"
npm run icd11 -- --who-check    # 探测 WHO 凭据
```

## 数据集身份：与上游论文是同一份

上游仓库 `marcolomele/vectorization-ICD11` 的论文描述数据集为 "13,960 ICD-11 entities…
7,066 entries having empty descriptions, 14% completeness"。

本库实测（`data/icd11/source.csv`，19,461,645 字节，sha256 `c4ffa495…`）：

| 列 | 非空 | 平均长度 |
|---|---|---|
| `definition` | **6,894 / 13,960 (49.4%)** | 311 字符 |
| `full_text` | 13,960 (100%) | 407 字符 |
| `index_terms` | 10,855 (77.8%) | 240 字符 |

**`definition` 为空 7,066 条 = 论文的 7,066** —— 逐条吻合，故确认同一份数据集。
（此前只记了「13,960 vs 规格 31,838 的缩水」，那是**另一个对照**：31,838 是 Foundation 组件。）

> 建库一度把这几个描述列丢了（注释写着"带 definition"、代码没带）。已修：保留**原文**，
> 不摘要不改写 —— 摘要过就不是同一份语料了。上游缺列时跳过并显式说明。

## 嵌入评测（复现论文的指标口径）

```bash
npm run icd11:metrics            # 默认分层抽样 1200
node scripts/icd11_embeddings.js --sample 600
```

产物：`embedding-metrics.json` + `embedding-metrics.md`。

同一份数据、按 **ICD-11 章节**聚类、TF-IDF **3,000 特征**（论文配置），**只改输入文本**：

| 指标 | 仅标题 | 标题 + full_text |
|---|---|---|
| 轮廓系数 | 0.0225 | 0.0391 |
| CH 指数 | 3.0539 | 4.2408 |
| DB 指数（越小越好） | 3.3109 | **3.8715（变差）** |
| 簇分离比 | 1.0516 | 1.0755 |
| **层级一致性 1-符号** | 32.79% | **42.37%** |
| └ 相对随机基线 | 8.81× | 11.38× |

**"描述才是关键"在本机可复现**（六项里五项变好）。但**绝对水平不可与论文比**：
距离用余弦而非欧氏、不做 SVD 降维、抽样而非全量、只做 TF-IDF 一支
（论文 PubMedBERT 1-符号 92.33%）。可比的是**方向与幅度**，以及相对随机基线的倍数。

## 本机标准源镜像

WHO 的公开发布文件（全表中/英、打印版、统计列表、映射表、变更包、指南）已镜像到本机
**`D:\ICD11-source`**（18 个文件 / 34.6 MB，带 sha256 清单），构建时**优先取镜像、离线可跑**。
定义/索引词/父链只在 `id.who.int`（需凭据），镜像里没有 —— 缺口逐条写清。

```bash
npm run icd11:mirror           # 建/更新镜像（免凭据）
npm run icd11:mirror:verify    # 重算 sha256 与清单比对
```

细则：[`MIRROR.md`](MIRROR.md)。

## 释义（定义段）：名字级 → 释义级

WHO 的 API 注册是人工的（表单 + 邮箱 → client id/secret），**没有免凭据通道**；
但**释义本身在打印版 PDF 里**，公开可下。已从镜像里的 `print-ICD-11-MMS-en.zip`（2,563 页）
抽出 **2,394 条**定义段 → `definitions-en.json`；与第三方快照的 6,501 条合并后，
术语层有 **6,653 个实体**带释义正文。

检索侧加了**分腿约束**：`evidenceMin: 'definition'` 只回有释义的条目；每条命中带
`evidence: 'definition' | 'name'`。**第 26 章（证候）在 WHO 源头没有释义**，
所以证候永远是名字级，约束会把它们全挡掉 —— 那是事实，不是 bug。

细则：[`DEFINITIONS.md`](DEFINITIONS.md)。

```bash
npm run icd11:definitions         # 从打印版 PDF 重抽（约 20 s）
npm run icd11:definitions:check   # 自检：条数 / 第 26 章为 0 / 1A00 锚点
```

## 术语嵌入层：从「能查编码」到「能用术语找编码」

> `scripts/icd11_terms.js` · 产物在 `data/icd11/term-index/`（随 `data/icd11/` 不入版本库）
> 测试：`tests/test_icd11_terms.js` · 上游规格：Cremaschi et al. (2025) *Decoding the mind*，
> ESWA 279:127191，§3.1–§4.1

上面那些用法都是**按编码/标题精确查**。到这一步「口苦咽干 → 哪个 ICD-11 编码」在本仓库是做不到的 ——
`icd11_embeddings.js` 只出评测指标，不建可查的库。术语嵌入层补的就是这个。

**两类可嵌入单元**（论文 §4.1「一条疾病 = 向量库里的一条 chunk」）：

| 单元 | 条数 | 文本 |
|---|---|---|
| `entity` | **13,306** | `Disorder Name / (官方中文名) / Disorder Code / Disorder symptoms / Chapter / Inclusions / Index terms` |
| `term` | **61,846** | `Term: {索引词或中文名} → Maps to disorder: {标题} ({编码})` |

`term` 单元是「**术语嵌入性编程**」的落点：10,855 个实体的索引词去重成 61,130 条独立向量，
再加 **472 条 WHO 官方中文名单元**（第 26 章 TM1 **全量**，含 173 条 **pattern 证候**），
**命中术语就带着编码回来**，不必先命中整段定义。

检索 = 向量（TF-IDF·余弦）∪ FTS5 词袋 ∪ **同名通道**，RRF k=60，默认 top-4（论文经验值）。
词表 20,000（按文档频次截断）· nnz 1,202,315 · CSR 9.5 MB · 建库约 28 s。

> **第 26 章不是一个体系**。472 条带 `(TM1)`（中医/日韩：脏腑、六经、卫气营血），
> 648 条带 `(TM2)`（Module II：阿育吠陀的 *Vata predominant*、悉达的 *Varmam and Marmam*）。
> 快照只收了其中 876 条，剩下的 244 条（含 126 条带中文名的 TM1）由 WHO 发布文件补齐，
> 标 `synthetic:true` —— 见 `tm1/README.md` §六。
> 单元带 `module` 字段，`runSearch({modules:['TM1']})` 只拦 TM2、**不拦第 1–25 章**
> —— 参考指南 §2.23.24 要的就是「WM 诊断 + TM1 证候」并列编码。依据见
> [`standards/icd11/tm1/README.md`](tm1/README.md)（官方命名的四轴原文 + 中文名表）。

```bash
npm run icd11:terms                              # 建库（全量）
npm run icd11:terms:stats                        # 只读现状
node scripts/icd11_terms.js --query "insomnia" --k 4
node scripts/icd11_terms.js --query "胁痛" --module TM1   # 同名通道：官方中文名直落自身
```

**中文走「语义张量等价映射」，不是硬查英文索引。**
源快照是英文，中文在术语层上的字面命中率是 **0** —— 这条不美化。中文面由
`scripts/lib_equivalence.js` 接上：**等价 = 同一个张量点**（`standards/semtensor/equivalence/`），
把中文形式换成同一个点上的英文成员 / 组合探针 / 词表直译，再去打英文索引：

| 查询 | 探针（级别） | top-1 |
|---|---|---|
| 痰热壅肺证 | `phlegm + heat + lung + pattern/syndrome`（D 组合） | SF89 Phlegm heat obstructing the lung pattern (TM1) |
| 阴虚肺燥证 | `yin deficiency + lung + dryness + …`（D 组合） | SF81 Lung yin deficiency pattern (TM1) |
| 失眠 | `inability to sleep`（E 词表，WHO 2.3.53） | MG41 Sleep disturbance, not elsewhere classified |
| 胁痛 | **（不需要探针）官方中文名** | SA00 Hypochondrium pain disorder (TM1) |

中文有**两条腿**，各管一段，不许混着说：

1. **字面通道 · 官方中文名**：第 26 章 472 个 TM1 实体（含全部 173 条 pattern 证候）有 WHO 官方中文名
   （`standards/icd11/zh-names.json`，WHO Simple Tabulation 2025-01 中译本原件），
   查询逐字相同就走**同名通道**排第一。回查 **472/472（100%）**。
2. **等价通道**：其余中文（证候名、症状词）经等价类换成英文探针，再打英文索引。

中文直查（`npm run icd11:terms:eval`，104 证候，排除 TM2）：**top-1 落到 TM1 103 · top-4 含 TM1 104 · 无命中 0**。
复合证名的英文探针由**四轴组合器**生成（`build_tm1_axes.js`：切词 → 逐片归轴 → 按官方轴序重排 → 查同构先例），
不再按出现顺序硬拼 —— 依据是 Reference Guide §3.2.26 的命名句，见 [`tm1/README.md`](tm1/README.md) §五。
「含 TM2 时同样 88」—— 分账是**防错**（不把阿育吠陀的近邻当中医证候），不是提分。

词表是 `standards/semtensor/descriptions/who-istt-terms.json`（WHO ISTT 2007 全量 3,148 条，
代码+英文+繁简中文+书页，**入库**；PDF 属 WHO 版权不入库，按 sha256 可重现）：

```bash
python scripts/who_istt_terms.py --check        # 体检：锚点 + 26 条已核 who-tcm 对读
node scripts/lib_zh_en.js --coverage            # 104 证候的切词覆盖率
```

**口径差（明写）**：论文用 LangChain + ChromaDB + 稠密 embedding，本层是 TF-IDF 稀疏 + 余弦，
语义泛化弱于稠密向量；论文的 "diagnostical requirements" 取自 ICD-11-CDDR（本仓库无此书），
本层改用 Chapter + Inclusions 两个真实字段，**不拿别的文字冒充 CDDR 正文**；论文数据是第 6 章
719 条，本快照是全 26 章 13,960 条，**不宣称复现论文的 76.1%**。

## 还没做到的

- **中文标题**：规格的通道1 是「中文搜索 → Foundation ID」。本地库是**英文** MMS；
  中文要凭据走 WHO API 的 `Accept-Language: zh`（或源平台的 zh 版本）。**目前没有凭据，所以 WHO 中文通道未验证过。**
  现状分两半，别混着说：
  · 第 26 章 **TM1 侧 472 条全部有 WHO 官方中文名**（`zh-names.json`，含 SF/SG/SH 173 条 pattern 证候），
    逐字查询回自身 472/472；
  · **TM2（Module II）在 WHO 中译本里整章无中文名** —— 源头缺，648 条，只能标注不能编；
  · 其余中文经**语义张量等价映射**（`standards/semtensor/equivalence/`）换成英文再检索，
    104 个证候里 93 个能译（89.4%），中文直查 top-1 落到 TM1 的 103/104 —— 都是**术语级**的桥，
    不是 ICD-11 中文条目本身。
- **Foundation → MMS 的映射**：规格的 `code_by_id` 语义是「Foundation ID → MMS 标准编码」。
  我的库里 `id` 已是 MMS 侧 id，**没有真正的 Foundation→MMS 跨组件映射**（那需要 Foundation 数据）。
- **全文检索**：已由术语嵌入层的 FTS5（`docs_terms` 词袋 + `docs_substr` trigram 子串）接上；
  `icd11_client.js --search` 仍是标题子串，两条路并存、未合并 —— 合并前需要先定「谁是谁的索引」。
- **不报 trustworthiness / continuity**：那两项衡量降维保真度，而本仓库不做
  t-SNE/UMAP/SVD，没有低维坐标可比。函数在 `lib_metrics.js` 里实现并单测，
  硬填一个假坐标只会得出无意义的数。
- **上游的 7 个模型只做了 1 个**（TF-IDF）。BERT/BioBERT/GatorTron 等要 Python + 大模型权重，
  与本仓库"纯 Node 零依赖"冲突。论文自己的结论是 TF-IDF 在层级保持上弱于 PubMedBERT ——
  所以这里复现的是**下限那一支**。
