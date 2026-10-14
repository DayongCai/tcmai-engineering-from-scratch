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

## 还没做到的

- **中文标题**：规格的通道1 是「中文搜索 → Foundation ID」。本地库是**英文** MMS；
  中文要凭据走 WHO API 的 `Accept-Language: zh`（或源平台的 zh 版本）。**目前没有凭据，所以中文通道未验证过。**
- **Foundation → MMS 的映射**：规格的 `code_by_id` 语义是「Foundation ID → MMS 标准编码」。
  我的库里 `id` 已是 MMS 侧 id，**没有真正的 Foundation→MMS 跨组件映射**（那需要 Foundation 数据）。
- **全文检索**：本地库只按标题子串匹配（`--search`）。规格的 FTS5/BM25 在
  `scripts/build_embeddings.js` 里实现，两者尚未接起来。
- **不报 trustworthiness / continuity**：那两项衡量降维保真度，而本仓库不做
  t-SNE/UMAP/SVD，没有低维坐标可比。函数在 `lib_metrics.js` 里实现并单测，
  硬填一个假坐标只会得出无意义的数。
- **上游的 7 个模型只做了 1 个**（TF-IDF）。BERT/BioBERT/GatorTron 等要 Python + 大模型权重，
  与本仓库"纯 Node 零依赖"冲突。论文自己的结论是 TF-IDF 在层级保持上弱于 PubMedBERT ——
  所以这里复现的是**下限那一支**。
