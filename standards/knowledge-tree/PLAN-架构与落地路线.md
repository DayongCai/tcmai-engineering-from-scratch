# 中医药领域知识树 · 项目架构与落地路线（v1）

> 目标：让**智能体**能在这棵树上**按院系、按朝代、按学派**取到不重复的知识点，并且每次改动都有门禁兜住。
> 本文只定架构与路线；机器可读产物在 `skeleton/`、`tree-schema.json`、`source-map.json`。

## 0. 起点：库里已经有什么（先盘，再设计）

| 资产 | 位置 | 实测 |
|---|---|---|
| 五级骨架源（须—根—干—枝—叶） | `sources/中医知识树.xlsx` | 18 表 · 4 篇 10 章 49 节 · 296 单元；**源构建 3063 节点 / 3370 边 / 2489 叶 + 103 病证** |
| 骨架规范 | `规范-中医知识树五级骨架.md` + `tree-schema.json` | L0 须 6 · L1 根 4 · L2 干 8 · L3 枝 120 · L4 叶 2592 · 概念丛 333 |
| 单元层（叶的原料） | `standards/<subject>/units.json` | **180 个学科 / 18,065 单元 / 33,820,147 汉字**；另有 89 学科尚无单元层 |
| 学派库 | `standards/gejia/学派库.json` | 8 个学派（朝代／主张／术语／方证族／三类语料命中：伤寒 1760 · 金匮 402 · 温病 630） |
| 骨架落盘（本次新增） | `skeleton/L0-need.json … L3-branch.json` + `mapping.json` | **L0 6 · L1 4 · L2 9 · L3 188**，`--check` 通过 |

**一处必须点明的口径差**：源骨架是 **8 域 120 枝**，本库是 **9 院系 188 枝**。
差额 68 来自三处：本库新增护理（27）、基础（17）两域，以及推拿在源里独立成院、本库并入针灸系；
另有些学科源骨架未设枝。差异已写进 `skeleton/mapping.json`，**不做静默对齐**。

## 1. 四条线索 → 四条硬机制（不是口号，是约束）

| 线索 | 结构机制 | 门禁判据 |
|---|---|---|
| ① 知识点不重复 | **叶的身份由概念定、不由位置定**：叶 ID = `K-<概念哈希>`，同一概念在多门课出现只记 `occurs[]`（学科/章/单元），**不复制叶**；跨枝只允许 `ref` 边 | 同 ID 唯一；同义标题归并；正文 simhash ≥ 0.92 判重；每叶 owner 唯一 |
| ② 院系专业功能靠近分布 | L2 干 = 院系，L3 枝 = 学科，L4 叶 = 章内知识点；**目录镜像这三级**。跨院系公用概念（如辨证论治、四诊）升到 L1 根或概念丛，不挂任何一院 | 每个叶的 owner 必须是某一枝；跨院系引用必须走 `ref` 且登记理由（沿用 `standards/__crossrefs.json` 口径） |
| ③ 尽可能类似历史演进 | 与层级正交的**时序轴**：`dynasty`（先秦→汉→晋唐→宋金元→明清→近现代→当代）+ `firstAttested` + `derives_from` 边；历史视图是**投影**，不复制节点 | 每个有出处的叶必须有 `firstAttested`（典籍＋篇名）或显式 `unknown`；`derives_from` 不得成环 |
| ④ 学派聚集知识树枝叶 | **学派 = 簇文件**（`clusters/school/<key>.json`）记录它占据的叶集合；叶上留 `schools[]` 反查；簇不新建节点，只聚合 | 每簇 ≥3 叶；每叶学府归属 ≤2（超了说明概念太泛，应升 L1）；簇内叶必须属于同一时代窗 |

## 2. 七层架构

```
L0 源层      sources/*.xlsx|pdf        只读、带指纹（不改原文）
L1 单元层    standards/<sub>/units.json 事实源：章节→单元→正文（已 180 学科）
L2 骨架层    knowledge-tree/           须/根/干/枝（本次已落盘 L0–L3）
L3 叶层      leaves/<stem>/<branch>.json  知识点（概念身份 + occurs + 出处 + 朝代）
L4 关系层    edges/*.json              nourish / spine / leaf / ref / derives_from / dsu
L5 簇层      clusters/school/*.json    学派簇（8 → 目标 20+）
L6 视图层    views/{history,school,dept,path}/*.json  投影（可删可重建）
L7 交付层    site/ · catalog · 智能体工具（query_tree / find_dup / path_between）
```

**依赖方向单向**：源层 → 单元层 → 叶层 → 关系/簇 → 视图 → 交付。视图回写上游一律视为 bug（沿用 `ARCHITECTURE.md` L1）。

## 3. 目录结构（`☑` 已有 · `＋` 新建）

```
standards/knowledge-tree/
☑ sources/中医知识树.xlsx
☑ 规范-中医知识树五级骨架.md
☑ tree-schema.json
☑ source-map.json
☑ skeleton/
    ☑ L0-need.json           6 须
    ☑ L1-root.json           4 根
    ☑ L2-domain.json         9 干（院系）
    ☑ L3-branch.json       188 枝（学科，含 units/hanzi 密度）
    ☑ mapping.json           源 8 域 ↔ 本库 9 院系 + 差额 68
＋ leaves/
    ＋ D01/…D09/<branch>.json   一学科一文件（约 188 个），叶定义见 §4
＋ edges/
    ＋ nourish.json  spine.json  ref.json  derives_from.json  dsu.json
＋ clusters/
    ＋ school/liu-wansu.json …  学派簇（先接 `standards/gejia/学派库.json` 的 8 个）
＋ views/
    ＋ history/<dynasty>.json  朝代视图（投影）
    ＋ school/<key>.json       学派视图
    ＋ dept/<Dxx>.json         院系视图（给智能体按系取枝）
    ＋ path/<program>.json     学习路径（先修链，复用 `data/prereq-roots.json`）
＋ 门禁：scripts/build_kt_skeleton.js（已） · scripts/build_kt_leaves.js（＋） · scripts/check_knowledge_tree.js（＋）
```

## 4. 叶与边的规范

**叶（L4）字段**

```json
{
  "id": "K-8f3a91c2",
  "name": "肝主疏泄",
  "aliases": ["疏泄失职", "肝失疏泄"],
  "owner": "01-zhongyi/01-zhongyi-jichu-lilun",
  "occurs": [
    {"branch": "01-zhongyi/01-zhongyi-jichu-lilun", "chapter": 2, "unit": "2.3"},
    {"branch": "01-zhongyi/14-zhongyi-zhenghou-xue", "chapter": 5, "unit": "5.1"}
  ],
  "firstAttested": {"book": "素问", "chapter": "五常政大论", "year": -100, "disp": "战国至汉"},
  "dynasty": "先秦—汉",
  "schools": ["liu-wansu"],
  "evidence": {"units": 3, "hanzi": 1840, "refs": 2},
  "src": ["standards/zhongyi-jichu-lilun/units.json#2.3"]
}
```

- **`id` 由概念定**：`K-` + 规范化名（去「的/之」、全半角统一、繁转简）的 8 位哈希 → 同一概念天然同 ID。
- **`occurs` 只增不改**：新学科出现同一概念时往数组里加一条，**不建新叶**。
- **`owner` 唯一**：谁先系统讲授归谁；其余走 `ref`。

**边（L4 关系层）六类**：`nourish`（须→根）、`spine`（根→干，4×9=36 条）、`leaf`（枝→叶）、`ref`（跨枝引用，带理由）、`derives_from`（历史源流，带年代）、`dsu`（叶↔病证单元，接 `standards/zhenghou/证候库.json`）。

## 5. 落地路线（M0–M5，每阶段有判据）

| 阶段 | 产物 | 判据（可量化） | 依赖 |
|---|---|---|---|
| **M0 对齐**（本轮已做） | `skeleton/L0–L3` + `mapping.json` | `build_kt_skeleton.js --check` 通过：L0 6 / L1 4 / L2 9 / L3 188；差 68 已记录 | 无 |
| **M1 叶候选抽取** | `leaves/**` 草稿（从 units 的标题层抽） | 180 学科全覆盖；每叶至少 1 个 `occurs`；候选量落在 2,000–3,000（源骨架 2592） | M0 |
| **M2 去重与归并** | 归并表 + 重复对清单 | 同义归并率 ≥30%（18,065 单元 → ≈2.5k 叶）；`check_knowledge_tree --dup` 报 0 组未决 | M1 |
| **M3 关系与朝代** | `edges/*` + 每叶 `firstAttested` | `spine` 36 条齐全；`derives_from` 无环；有出处叶 ≥60% | M2 |
| **M4 学派簇** | `clusters/school/*` 8→20 | 每簇 ≥3 叶；簇内叶同朝代窗；学派库 8 个全部建簇 | M3 |
| **M5 视图与工具** | `views/**` + `scripts/query_tree.js` | 四种取法各 5 条样例可用：按院系/朝代/学派/查重；接入 `npm run check` | M4 |

**先做 M1–M2 的理由**：叶层是「不重复」的唯一战场；关系与学派都建在叶之上，叶错了后面全错。

### 5.1 首批学派簇（现有 8 个，直接可接）

| 学派 | 朝代 | 主张 | 语料命中 | 证 / 病 |
|---|---|---|---|---|
| 刘完素（河间） | 金 | 六气皆从火化，主寒凉 | 637 | 37 / 61 |
| 张从正（攻邪） | 金 | 病由邪生，汗吐下三法 | 1,476 | 39 / 70 |
| 李杲（补土） | 金元 | 内伤脾胃，百病由生 | 68 | 23 / 31 |
| 朱震亨（滋阴） | 元 | 阳常有余，阴常不足 | 50 | 35 / 62 |
| 张景岳（温补） | 明 | 阳非有余，真阴不足 | 7 | 34 / 45 |
| 叶天士（温病） | 清 | 卫气营血辨证 | 824 | 37 / 50 |
| 王清任（活血） | 清 | 气虚血瘀，补气活血 | 803 | 23 / 50 |
| 张锡纯（汇通） | 清末民国 | 衷中参西 | 49 | 43 / 73 |

命中数按术语统计（「火」→ 河间），直接挂叶会把凡提「火」的叶都吸进河间簇；
**M4 判据必须换成「主张句 + 方证族」**，词频只作召回、不作归属。

## 6. 智能体的四种取法（工具形态）

| 工具 | 输入 | 输出 | 用在哪 |
|---|---|---|---|
| `query_tree --dept 03-zhenjiu` | 院系 | 该系全部枝 + 各枝叶数/字数 | 排课、按系出题 |
| `query_tree --dynasty 宋金元` | 朝代 | 该时段首次出现的叶 + 源流边 | 医学史课、专题串讲 |
| `query_tree --school liu-wansu` | 学派 | 簇内叶 + 核心术语 + 语料命中 | 各家学说、学派对比 |
| `check_knowledge_tree --dup` | 无 | 重复/近重叶清单（simhash） | 建课前查重、防止两门课写同一知识点 |

## 7. 风险与未决（照实列）

1. **源 120 枝 ≠ 本库 188 枝**：多出的 68 枝（护理 27、基础 17，及源未设枝的学科）需要补写 L3 语义（源骨架只给了学科编号）。
2. **89 学科没有 units.json**：枝在、叶空。M1 只能对 180 学科抽叶，剩 89 要等单元层补齐（或标 `leafStatus: "pending-source"`）。
3. **叶粒度是最大不确定性**：18,065 单元按「一单元一叶」会得到 1.8 万叶，远超源骨架 2,592；必须走归并（同义／上下位）。M2 的人工抽检口径：随机 200 叶，判准率 ≥90% 才进 M3。
4. **学派簇的判据要防「术语绑学派」**：现有学派库靠术语命中（如「火」→ 河间），会把凡提「火」的叶都吸进河间簇；M4 需加「主张句」判据，而不是只靠词频。
5. **历史轴不与层级混写**：朝代只做属性与视图，不新增树层；否则「同一条文出现在两个朝代」会逼出重复节点。

## 8. 一句话总结

**树管从属（须→根→干→枝→叶），图管关系（六类边），朝代与学派是两张正交的视图**；
叶的身份由概念定、出现位置只作属性——这是「不重复」唯一站得住的做法，也是智能体能安全取用的前提。
