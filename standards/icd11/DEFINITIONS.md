# 释义（定义段）：免凭据拿到什么、拿不到什么

> 产物 `standards/icd11/definitions-en.json`（2,394 条）· 脚本 `scripts/build_icd11_definitions.py`
> 术语层字段 `hasDefinition` / 检索约束 `evidenceMin`

## 先说清楚「注册 ICD-API 免凭据」这件事

**没有这条路。** 实测结论：

| 入口 | 结果 |
|---|---|
| `https://id.who.int/icd/release/11/2026-01/mms/1A00?language=en` | **401** |
| `https://icdaccessmanagement.who.int/connect/token`（不传 client_id/secret） | 400 `invalid_client` |
| `icd.who.int/browse/<release>/mms/zh` | 200，但是 SPA 空壳；数据仍走 `id.who.int` |
| `icd.who.int/icdapi` 的注册入口 | 表单 + 邮箱确认 → **人工**，产出 client id / secret |

也就是：WHO 的 API 是「注册（人）→ 拿凭据（机器）」，**没有匿名通道**，也没有可以脚本化绕过的口子。
我不会伪造 client id/secret，也不会把某个第三方 demo 密钥塞进仓库。

**但「释义级」并不依赖那个 API** —— 释义本来就写在 WHO 的**打印版 PDF** 里（公开、免凭据），
而第三方快照当年抓 API 时也带下了 6,501 条。本轮把两条源合并，这就是免凭据的释义路径。

## 拿到了什么

| 源 | 条数 | 说明 |
|---|---|---|
| `data/icd11/entities.ndjson`（第三方快照） | 6,501 条有正文 | 当年从 API 抓的，字段 `definition` |
| 打印版 PDF（`print-ICD-11-MMS-en.zip`，2,563 页） | **2,394 条**抽出 | 与快照重合 **1,645**；**152 条是快照有码但没正文**；另有 **597 个码**快照根本没有（1,645+152+597=2,394） |
| 合并后术语层可用 | **6,653 个实体** | 快照 6,501 + 打印版新补 152 |

抽样比对打印版与快照的释义文本：**460 条里 442 条开头一致（96%）** —— 同源（都来自 WHO），
差异多来自换行与截断。所以打印版不是「另一个说法」，而是**同一份内容的免凭据副本**，
它的价值在两处：① 快照漏掉的码；② 可离线复核（PDF + sha256 就在镜像里）。

## 抽法（不做「智能补全」）

```
代码行（行首 2–6 空格 + 码）→ 下一行标题必须与**同一发布版全表**逐字相同
  → 到下一个代码行之前：定义段 / Inclusions: / Exclusions:
```
三条硬规则把排版噪声挡掉（每一条都是实测踩出来的）：

1. 含码段区间 `(SA20‑SA2Z)` → 是块标题，不是释义；
2. 整段与某条题名完全相同 → 是子条目清单；
3. **题名文字占比 ≥ 50%** → 是「子码题名连排」（例：`SB06 Edema disorders` 的正文其实是
   SB06.0/.1/.Y/.Z 四条题名拼起来）。用占比而不是「出现 ≥2 条题名」——散文里正常会提到病名。

## 第 26 章为什么是 0 条

打印版、英文全表、`id.who.int` 三处一致：**TM1/TM2 只有题名与 Inclusions/Exclusions，没有定义段。**
这不是解析漏，而是 WHO 没写。所以：

- 证候的命中永远是 `evidence: 'name'`；
- `evidenceMin: 'definition'` 会把证候全部挡掉 —— **这是事实，不是 bug**；
- 中医术语的「释义」在 WHO ISTT 里（`standards/semtensor/descriptions/who-istt-terms.json`），
  那是术语表，不是证候定义。

## 约束怎么用（分腿，不搞全局开关）

```js
T.runSearch('cholera', { k: 3 })                       // → 1A00 (definition) + 两条无释义
T.runSearch('cholera', { k: 3, evidenceMin: 'definition' })  // → 只留 1A00
```

`build_embeddings` 的 ⑦ 通道里，这个约束**只作用于「主诉那条腿」**：

```js
icd11Channel(q, { requireDefinition: true })
// 证候腿（TM1）不加约束 —— 加了就一条不剩；主诉腿只回有释义的西医药名
```

产物里每条命中带 `evidence: 'definition' | 'name'`，通道汇总另记
`evidence: { definition: n, name: n }`，下游要「必须能拿释义当依据」时按这个字段筛。

## 复核

```bash
npm run icd11:definitions        # 从镜像里的打印版 PDF 重抽（约 20 s）
npm run icd11:definitions:check  # 自检：条数、第 26 章 0 条、1A00 锚点、无码段区间
node tests/test_icd11_terms.js   # G 节：释义产物 / 回填 / 约束 / 证候名字级
python scripts/build_icd11_definitions.py --sample 1A00 5A11 6A70
```
