# 骨伤临床轮转

**16-gushang-linchuang-lunzhuan** · 骨伤学院 · 6 章 · 31 单元 · 79,358 汉字

> 轮转学的不是「看会了」，而是能不能独立完成一次接诊并讲清依据

**课程类型：派生课（无教材，sem910 模板课）**。
章名与顺序来自 `data/new-subjects-chapters.json`，由 `scripts/scaffold_sem910.js` 生成，**不得手改**；
`locator` 一律 `派生·第N章·m.k`，单元正文逐字取自父课。

六站：正骨 / 筋伤 / 脊柱 / 关节 / 急诊创伤 / 出科考核。每站都按「进科三问 → 执行 → 复盘」组织。

## 一、父课

- `gushang-bing`
- `gushang-chuangshang-jijiu`
- `gushang-jichu`
- `gushang-jinshang`
- `gushang-jizhu-bing`
- `gushang-yingxiang`
- `zhenggu`

## 二、章表

| # | slug | 章 | 单元 | 汉字 |
|--:|---|---|--:|--:|
| 1 | zhenggu-lunzhuan | 正骨科轮转：骨折复位与固定 | 5 | 11,538 |
| 2 | jinshang-lunzhuan | 筋伤科轮转：软组织损伤 | 6 | 11,710 |
| 3 | jizhu-lunzhuan | 脊柱科轮转 | 6 | 11,354 |
| 4 | guanjie-lunzhuan | 关节科轮转 | 5 | 11,865 |
| 5 | jizhen-chuangshang | 急诊创伤与院前处置 | 3 | 22,486 |
| 6 | chuke-kaohe | 出科考核与病例复盘 | 6 | 10,405 |

## 三、三辨与四位面（实测）

| 三辨 | 词频 |
|---|--:|
| **临床执行** | **903** |
| **考核复盘** | **71** |
| **轮转准备** | **116** |

三辨极差 **12.7×**。偏斜原因见下方说明。

| 四位面（章群结构分区） | 汉字 |
|---|---:|
| 正骨与筋伤 | 23,248 |
| 脊柱与关节 | 23,219 |
| 急诊创伤 | 22,486 |
| 考核复盘 | 10,405 |

四位面极差 **2.2×**。

## 四、判据

轮转学的不是「看会了」，而是能不能独立完成一次接诊并讲清依据。六站：正骨 / 筋伤 / 脊柱 / 关节 / 急诊创伤 / 出科考核。每站都按「进科三问 → 执行 → 复盘」组织。

## 五、章内可执行验证

```bash
node scripts/scaffold_sem910.js --check
node scripts/audit_curriculum.js | grep -A2 "16-gushang-linchuang-lunzhuan"
node tests/test_chapter_code.js | grep -c "16-gushang-linchuang-lunzhuan"
python scripts/_derive_sem910_gushang.py
```

**免责声明：** 本课为教学材料；无独立教材，内容为本库已建课程的二次编排。
轮转中的临床决策与毕设中的数据结论，须由执业医师与导师复核，不构成诊疗或研究结论。
