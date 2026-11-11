# ICD-11 本机标准源镜像（`D:\ICD11-source`）

> 建/更新：`npm run icd11:mirror` · 校验：`npm run icd11:mirror:verify` · 现状：`npm run icd11:mirror:status`
> 脚本：`scripts/icd11_mirror.py` · 清单：`D:\ICD11-source\MANIFEST.json`

## 为什么要有它

ICD-11 的内容分两处：

| 位置 | 是否要凭据 | 有什么 |
|---|---|---|
| `icdcdn.who.int/static/releasefiles/…` | **不要** | 全表（中/英）、打印版、统计列表、ICD-10→11 映射、每版变更包 |
| `id.who.int/icd/…` | **要**（实测 401） | 定义、索引词、父链 |

本仓库 ICD-11 侧的一切派生数据（中文名表、四轴词表、等价类）都从**第一处**算出来。
把它落到本机，构建就不再依赖网络 —— 这才是「常备资源」，而不是每次跑脚本去 CDN 撞运气。

## 目录

```
D:\ICD11-source\
  MANIFEST.json                 每个文件的 url / 字节数 / sha256 / 取回日期 / 说明
  README.md                     自动生成的清单说明（含缺口）
  release\2026-01\zh\           SimpleTabulation-ICD-11-MMS-zh.zip（+ 解压后的 .txt / .xlsx）
  release\2026-01\en\           英文全表、打印版、死因/疾病统计列表、vaccinable 清单、mapping.zip
  changes\                      changes_MMS_*.zip（2018-06 → 2026-01，每版八包）
  guides\                       refguide-en.pdf（473 页）· factsheet-zh.pdf · implementation-guide-zh.pdf
  derived\                      本仓库从上述原件派生的小表（**不是 WHO 原件**）
```

规模：**18 个文件 / 34.6 MB**（解开后的 .txt/.xlsx 另占约 33 MB）。

## 仓库怎么用镜像（mirror-first）

`scripts/build_icd11_zh_names.py` 的取源顺序：

```
① D:\ICD11-source\release\<release>\zh\SimpleTabulation-ICD-11-MMS-zh.txt   ← 有就用，离线可跑
② data/icd11/sources/SimpleTabulation-ICD-11-MMS-zh.txt                     ← 仓库内缓存
③ 报错，并给两条补法（建镜像 / 从 CDN 下）
```

换目录：设环境变量 `ICD11_MIRROR=E:\ICD11`（脚本与测试都读它）。换发布版：`ICD11_RELEASE=2025-01`
（注意 `zh-names.json` 会跟着变，重跑 `npm run icd11:zh-names`）。

## 校验

```bash
npm run icd11:mirror:verify      # 重算 18 个文件的 sha256，与 MANIFEST 比对（不联网）
```

`tests/test_icd11_terms.js` 的 F 节会在镜像存在时自动核对：

- 清单 ≥15 个文件、含中文全表与变更包、**缺口写明 ≥3 条**；
- 每个文件大小与 sha256 跟清单一致（文件被改过/下载不完整都会红）；
- 中文表行数 > 36,000，第 26 章 category 行 ≥1,100。

没挂 D 盘时 F 节**跳过**，不算失败 —— 换机器克隆仓库不该因为这个红。

## 缺口（镜像里没有，且都有实测原因）

| 缺什么 | 为什么 |
|---|---|
| 定义 / 索引词 / 父链 | 只在 `id.who.int`，要 OAuth 凭据（实测 401）。注册 ICD-API 可补 |
| ↳ 其中**定义**已绕过 | 打印版 PDF 里有定义段，免凭据抽出 2,394 条 → [`DEFINITIONS.md`](DEFINITIONS.md) |
| 第 26 章 TM2 的中文题名 | WHO 中译本整章未译（648 条 `Title` 为空）—— 源头缺 |
| 中文打印版 `print-ICD-11-MMS-zh.zip` | 实测 404，WHO 未发布 |
| 中文 Reference Guide | `icd11referenceguide/zh/refguide.pdf` 实测 404，只有英文 |

## 2025-01 与 2026-01 的关系（记一笔，免得以后重查）

逐码比对过：整表新增 354 个码、消失 29 个，但**第 26 章 1,120 条逐码一致**（472 条带中文）。
所以升版是「跟最新」，不是「补第 26 章的缺口」；真正的缺口在第三方快照（876/1,120），
已由 `zh-names.json` 补齐 —— 见 [`tm1/README.md`](tm1/README.md) §六。
