# 中药商品学

> 商品规格→分级模型 / 流通数据→供应链图

| 项目 | 内容 |
|------|------|
| 院系 | 🌾 中药系 `02-zhongyao` |
| 类型 | Reference |
| 学期 | 第 8 学期（🌳 壮·鼎盛 / 大四） |
| 学时 | 36 |
| 章节目标 | 18 |
| 学科编号 | 037 / 169 |
| 英文名 | Chinese Materia Medica Commerce |

## 一、学科定位

中药商品学（Chinese Materia Medica Commerce）是中药系的核心学科，聚焦「本草、方剂与中药全产业链：资源—鉴定—化学—药理—制剂」中的一个完整知识域。

## 二、中医 → AI 桥梁

```text
商品规格→分级模型 / 流通数据→供应链图
```

中药商品学 里的每一个传统概念，都被翻译成一个可计算、可验证的工程对象：
中医概念给出**语义与约束**，AI/工程方法给出**表示与算法**。两者必须能互相回指，
否则这个章节就还没有写完。

## 三、章节地图（目标 18 章）

章节尚未编写。运行脚手架开章：

```bash
node scripts/scaffold_chapter.js 02-zhongyao/17-zhongyao-shangpin-xue 01-<chapter-slug>
```

编写完成后，把章节索引写进 `chapters.json`，本表的「状态」列由
`scripts/build_catalog.js` 自动填充。

## 四、章节契约（每章必须满足）

```text
chapters/NN-<slug>/
├── docs/zh.md      # MOTTO / PROBLEM / 环境逼迫 / 知识积累 / CONCEPT / BUILD IT / USE IT / SHIP IT
├── code/           # 可运行、自终止、退出码 0（Node.js 或 Python，见 CONTRIBUTING.md 依赖白名单）
├── quiz.json       # 恰好 6 题 = 1 pre + 3 check + 2 post
└── outputs/        # 可复用产出物（prompt / skill / agent / mcp / 临床工具）
```

## 五、教材交付 [textbooks]

```text
输出: textbooks/02-zhongyao/17-zhongyao-shangpin-xue/
├── 00-前言.md
├── 01-第1章-<标题>.md   ...
└── figures/                # Mermaid / SVG，禁止 ASCII 框图
```

## 六、平台交付 [tcmP]

```text
输出: platform/courses/02-zhongyao/17-zhongyao-shangpin-xue/
├── course.yaml             # 课程元数据 + 章节 → 视频映射
├── slides/                 # 讲稿 HTML（由 docs/zh.md 派生）
├── narration/              # TTS 旁白文本 + 音频
└── video/                  # 成片 MP4（H.264 / 720p 以上）
```

## 七、进度

| 指标 | 当前 | 目标 |
|------|------|------|
| 章节 | 0 | 18 |
| 视频 | 0 | 18 |
| 教材字数 | 0 | ≈ 108000 |

> 状态字形：🌱 未开始 ⬚ · 🚧 进行中 · ✅ 完成

## 七、底本与章节（2026-11 建成）

**教材**：`F:/textbooks/qhzy-中药商品学.xlsx`（18 内容章 / 18 单元 / **191,933 汉字**）。

| 文件 | 内容 |
|---|---|
| `底本.json` | 章 → 节 → 小节 → 段 ＋ counts ＋ sha256 |
| `units.json` | 18 单元，带三辨（商品属性/标准与检验/流通与价格）、四位面（商品形态）词频与数值计数 |
| `chapter-map.json` | 课程 18 章 ↔ 教材 18 章 **1:1 恒等映射** |
| `axis-probe.json` | 四位面三候选：**商品形态 3.5×（取）**；商品环节 6.6×、属性四分 3.6× 留痕 |
| **`跨课对账.json`** | 三课共用 287 味名单：本课点到 84、闭环 46（0.548） |

**章 ↔ 教材**（每章 1 单元，教材本就是一章一节一组）

| 章 | slug | 标题 | 单元 | 汉字 |
|---:|---|---|---:|---:|
| 1 | `01-daolun` | 中药商品学导论 | 1 | 9,636 |
| 2 | `02-lishi-liutong` | 中药商品的历史与流通演变 | 1 | 12,260 |
| 3 | `03-fenlei-mingming` | 中药商品的分类与命名 | 1 | 10,921 |
| 4 | `04-daodi-chanqu` | 道地药材与产区 | 1 | 9,078 |
| 5 | `05-zhiliang-biaozhun` | 中药商品的质量标准体系 | 1 | 8,545 |
| 6 | `06-jianding-fangfa` | 中药商品的鉴定方法 | 1 | 10,044 |
| 7 | `07-guige-dengji` | 中药材商品的规格等级 | 1 | 9,804 |
| 8 | `08-yinpian` | 中药饮片商品 | 1 | 9,750 |
| 9 | `09-zhongchengyao` | 中成药商品 | 1 | 10,371 |
| 10 | `10-baozhuang-chucang` | 中药商品的包装与贮藏养护 | 1 | 9,291 |
| 11 | `11-jingying-zhiliang` | 中药商品的经营与质量管理 | 1 | 13,041 |
| 12 | `12-jiage-shichang` | 中药商品的价格与市场 | 1 | 11,227 |
| 13 | `13-pinpai-zhishi` | 中药商品的品牌与知识产权 | 1 | 10,906 |
| 14 | `14-teshu-guanli` | 特殊管理的中药商品 | 1 | 11,658 |
| 15 | `15-guomao-maoyi` | 中药商品的国际贸易 | 1 | 11,832 |
| 16 | `16-jianguan-hegui` | 中药商品的监管与合规 | 1 | 9,648 |
| 17 | `17-fengxian-zhuisu` | 中药商品的质量风险与追溯 | 1 | 12,664 |
| 18 | `18-jiaoxue-pingtai` | 中药商品学与 tcmP 智能教学平台 | 1 | 11,257 |

**口径**

1. **三辨＝商品属性／标准与检验／流通与价格**，实测 **2890 / 2067 / 1761**，比值 **1.6×**——三者几乎同重，这是商品学与药材学的分界：药材学问「是不是药」，商品学问「值多少、合不合规」；
2. **四位面取商品形态 3.5×**（中药材 921 / 饮片 458 / 中成药 565 / 特殊管理 266）；
3. **商品环节 6.6× 未取**：它的最大值「监管与追溯」3322 是**制度篇幅**的反映（教材 11/14/16/17 四章都在讲监管），不是商品本体结构；**属性四分 3.6× 未取**：层次混装（本体/环节/经济/历史）不同层。

**跨课对账（三课闭环）**

- 三课共用 287 味药名名单，本课点到 **84 味（29%）**——**品类层不是品种层**，这不是遗漏；
- 三课闭环 **46 味（0.548）**；「仅分析提到」为 **0**，说明分析课讲通则与限度、几乎不点品种；
- 两课都未接 **13 味**（佛手、北沙参、夏枯草、大枣、木瓜、淫羊藿、熟地黄、紫苏叶、紫草、续断、茵陈、远志、龙眼肉）——**真缺口在另两课的覆盖，不在本课**。

**复算**

```bash
python scripts/build_zhongyao_shangpin_text.py          # 工作簿 → 底本 + 单元层
python scripts/scaffold_zhongyao_shangpin_chapter.py 05-zhiliang-biaozhun
python scripts/_zhongyao_shangpin_docs_out.py           # 18 章 docs/quiz/outputs
python scripts/crosscheck_shangpin.py                   # 商品 × 鉴定 × 分析 三课对账
```

**边界**：商品学给的是「规格—等级—价格」的判断框架与制度依据，不含实时行情与具体报价。
内容为教学整理，不构成交易建议；实际购销与合规判断须以现行药典、法规与市场监管要求为准。
