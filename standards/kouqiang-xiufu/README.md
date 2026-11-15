# standards/kouqiang-xiufu —— 《口腔修复学》外源层（无教材底本）

## 1. 这是什么

本库**没有**《口腔修复学》教材，`补源约定.md` 也不收教科书（D 级：版本与页码不稳定，无法长期逐字核对）。
本目录是该课的**外源层**：中华口腔医学会团体标准的原件留档 + 逐字条文 + 逐字校勘结论。

- 课程：`departments/08-wuguan/12-kouqiang-xiufu-xue`（10 章 / 43,635 汉字）
- 条文：90 条，**逐字可查 90/90**
- 口径：`底本统计只算底本`——本课无底本，故此目录只记外源条文，**不并入任何底本汉字数**（约定第七节）

## 2. 来源与指纹

| 来源 | 标准号 | 条数 | 页 | 文本层字符 | sha256 |
|---|---|--:|--:|--:|---|
| T/CHSA 001—2021 老年患者口腔修复指南 | T/CHSA 001—2021 | 27 | 11 | 8,674 | `a96bd24d56c7c93d…` |
| T/CHSA 001—2019 瓷贴面粘接技术操作规范 | T/CHSA 001—2019 | 18 | 11 | 13,068 | `ceab4abdf4a3218f…` |
| T/CHSA 002—2021 牙齿漂白治疗技术操作指南 | T/CHSA 002—2021 | 18 | 13 | 12,959 | `a98c6366374ded14…` |
| T/CHSA 006—2022 全口义齿修复的印模与模型制作规范 | T/CHSA 006—2022 | 7 | 11 | 10,971 | `7a4a717acd09c1dc…` |
| T/CHSA 003—2022 牙科水门汀材料调和操作规范 | T/CHSA 003—2022 | 5 | 10 | 5,114 | `b0815afb74b60e97…` |
| T/CHSA 014-2022 椅旁全瓷修复技术指南 | T/CHSA 014-2022 | 8 | 11 | 9,991 | `2f84336662f68bf1…` |
| T/CHSA 013—2022 树脂陶瓷复合材料椅旁CAD/CAM修复技术指南 | T/CHSA 013—2022 | 4 | 9 | 8,921 | `fe782798b9ac0b94…` |
| T/CHSA 012—2022 选择性激光熔化金属修复技术的临床应用专家共识 | T/CHSA 012—2022 | 3 | 11 | 10,970 | `78eebf2934b8f40e…` |

五项指纹（sha256 / bytes / pages / textChars / textLayer）由 `scripts/build_kouqiang_sources.py` 现算，
写进 `补源登记.json`；该文件是**产物**，不许手改，改了就重跑。

## 3. 文件

| 文件 | 内容 |
|---|---|
| `sources/*.pdf` | 团体标准原件（文件名带标准号与标题） |
| `外源条文.json` | 九字段条文：id / source / clause / 原文（逐字）/ zh（本库转述） |
| `补源登记.json` | 产物：来源五项指纹 + 每条 `verified` / `missing` / `locator` |
| `units.json` | 单元层：一章一单元，正文＝本库撰写 + 条文原文与转述 |
| `chapter-map.json` | 课程章 → 条文 id + 为什么这样并章 |
| `axes.json` | 三辨（缺损与评估／修复形式／材料与工艺）与四位面（牙体缺损／牙列缺损／牙列缺失／维护与并发症）词表 |
| `doc-config.json` | 章材料生成器的口径（标题、链条、每章问题、引文兜底） |

## 4. 复算

```bash
python scripts/build_kouqiang_sources.py kouqiang-xiufu           # 重算指纹与逐字校勘
python scripts/build_kouqiang_sources.py kouqiang-xiufu --check   # 幂等校验（已并入 npm run check）
python scripts/build_kouqiang_xiufu_course.py   # 单元层与章映射
python scripts/scaffold_huli_chapter.py kouqiang-xiufu departments/08-wuguan/12-kouqiang-xiufu-xue --all   # 章代码
python scripts/build_huli_docs.py kouqiang-xiufu departments/08-wuguan/12-kouqiang-xiufu-xue              # 章材料（docs/quiz/outputs）
```

## 5. 引用格式

正文引外源一律写「外源·<标准标题> 第N条」，同页给出中文转述与原文所在 PDF；
例句：`外源·T/CHSA 001—2021 老年患者口腔修复指南 第4.5条`（原文见 `sources/T-CHSA-001-2021-老年患者口腔修复指南.pdf`）。
**不许**写成「教材·第N章」——本课没有教材。

## 6. 缺什么

教材式的内容（设计原理、𬌗架与咬合重建、种植外科；错𬌗分类、头影测量、固定矫治器力学等）
在现有 12 份团标中**没有对应条文**，故未写。缺口逐条登记在课程目录的 `缺口登记.md`。
