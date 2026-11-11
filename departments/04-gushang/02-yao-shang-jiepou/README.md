# 骨伤解剖学

**02-yao-shang-jiepou** · 骨伤学院 · 10 章 · 49 单元 · 124,237 汉字

> 解剖学的判据是「摸得到、指得出、看得懂」：体表能定位，影像能对上。

**课程类型：派生课（无独立教材、无图版）**。单元正文逐字取自父课，`locator` 一律 `派生·第N章·m.k`。

## 一、父课

- `gushang-jichu`
- `gushang-jizhu-bing`
- `gushang-yingxiang`
- `shoufa`
- `zhenggu`

## 二、章表

| # | 章 | 父课来源 | 单元 | 汉字 |
|--:|---|---|--:|--:|
| 1 | 骨的形态与构造 | gushang-jichu、zhenggu | 5 | 11,860 |
| 2 | 骨的发生、生长与骨化 | gushang-jichu、zhenggu | 6 | 11,986 |
| 3 | 关节结构与运动学 | zhenggu、kangfu-huli | 4 | 11,661 |
| 4 | 肌、肌腱与筋膜 | shoufa、tuina | 3 | 17,659 |
| 5 | 神经与血管走行 | zhenggu、gushang-yingxiang | 5 | 11,751 |
| 6 | 脊柱解剖 | gushang-jichu、gushang-jizhu-bing | 6 | 11,756 |
| 7 | 上肢解剖 | zhenggu、gushang-jichu | 4 | 11,909 |
| 8 | 下肢解剖 | zhenggu、gushang-jichu | 5 | 11,759 |
| 9 | 体表标志与定位 | zhenggu、gushang-jichu | 6 | 11,951 |
| 10 | 影像解剖对照 | gushang-yingxiang、gushang-jichu | 5 | 11,945 |

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
| **骨与关节结构** | **762** |
| **肌与神经血管** | **839** |
| **体表与影像** | **709** |

三辨极差 **1.2×**——三条解剖视角在父课里几乎等重，这是本库最平的一套三辨之一。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
| 骨与关节结构 | 35,507 |
| 肌与软组织 | 17,659 |
| 神经血管与脊柱 | 23,507 |
| 部位与影像 | 47,564 |

四位面极差 **2.7×**。

## 四、图版：本轮一张也没拿到（如实记）

按你的指示先探测公有领域图源，实测 9 个源、**0 张取得**：

| 源 | 状态 |
|---|---|
| Wikimedia / archive.org / Wikisource / OpenLibrary | **不可达（000）** |
| Bartleby（Gray's 在线版） | 403 反爬 |
| Gutenberg | 可达，但**没有** Gray's Anatomy 1918 |
| jsDelivr（GitHub 镜像） | 可达有图，但**无授权声明、无版本出处** |

所以本课**只有文字，没有图**。两份文件把这件事写清：
- `standards/gushang-jiepou/补源登记.json`——9 次探测的 URL、状态、结论；
- `图版清单.md`——10 条图版需求、状态、候选来源，以及三条可选路径。

**没有拿 AI 生成解剖图，也没有把镜像图说成公有领域**——前者错一处即误导，后者是无授权主张。

## 五、章内可执行验证

```bash
node scripts/audit_curriculum.js | grep -A2 "02-yao-shang-jiepou"
node tests/test_chapter_code.js | grep -c "02-yao-shang-jiepou"
python scripts/_derive_jiepou.py
```

**免责声明：** 本课为教学材料，无图版；解剖定位与影像判读以正规解剖学图谱与影像资料为准，
本课不构成诊疗依据。
