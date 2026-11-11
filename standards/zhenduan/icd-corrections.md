# 中医诊断学 · ICD-11 病码更正建议

> 生成 2026-10-28 · 依据 `standards/zhenduan/icd-align.json`（`9f1dafaa83d0`）· 镜像 `definitions-en.json` 2394 条

## 一、要改多少格

| 动作 | 条数 | 什么意思 |
|---|--:|---|
| 保留 | 1 | 码没问题，一个字不改 |
| 留码加注 | 5 | 码能对上，但实体是症状/体征或更宽的一类，要加一句口径注 |
| **待定码** | 5 | 码指向别的病；镜像里没有对应条目，**不能凭猜给码**，先标「待核」 |
| **换码** | 1 | 镜像里确有对得上的实体，直接换 |
| **删码回查** | 2 | 该码在镜像无条目，属无效码或误抄 |

**必须动的一共 8 格**（换码 1 + 待定码 5 + 删码回查 2），占 14 格的 57.1%。

## 二、逐格建议（可直接对着改）

| # | 平台码 | 病名 | 原码 | 镜像题名 | 判定 | 动作 | 建议码 | 依据 |
|--:|---|---|---|---|---|---|---|---|
| 1 | CA00 | 感冒 | CA00 | Acute nasopharyngitis | ok | **保留** | — | Acute nasopharyngitis = 急性鼻咽炎；感冒的现代对应即普通感冒，可接受 |
| 2 | MD12 | 咳嗽 | MD12 | Cough | narrow | **留码加注** | — | Cough 是症状（咳嗽），教材「咳嗽」为病名；症状当病名用，需注明口径 |
| 3 | CA23 | 哮病 | CA23 | Asthma | narrow | **留码加注** | — | Asthma 覆盖面含喘；教材「哮病」与「喘证」分列，Asthma 对应的是哮 |
| 4 | MD11 | 喘证 | MD11 | Abnormalities of breathing | conflict | **待定码** | — | Abnormalities of breathing 是「呼吸异常」大类，不是「喘证」；喘证应落在具体呼吸困难的类目 |
| 5 | MC81 | 心悸 | MC81 | Abnormalities of heart beat | narrow | **留码加注** | — | Abnormalities of heart beat 是体征类（心律异常），心悸是症状；层级不同 |
| 6 | BA40 | 胸痹 | BA40 | （无条目） | missing | **删码回查** | — | 码在 definitions-en.json 无条目（胸痹在 TM1 里的码不是 BA40，需回 WHO 表核对） |
| 7 | MB51 | 眩晕 | MB51 | Diplegia of upper extremities | conflict | **换码** | `MB48` Dizziness or giddiness | Diplegia of upper extremities = 双上肢瘫，与「眩晕」无关；镜象里 Dizziness or giddiness = MB48，才是对得上的码 |
| 8 | MD90 | 胃脘痛 | MD90 | Nausea or vomiting | conflict | **待定码** | — | Nausea or vomiting = 恶心呕吐，与「胃脘痛」不是同一实体 |
| 9 | ME08 | 呕吐 | ME08 | Flatulence or related conditions | conflict | **待定码** | — | Flatulence = 腹胀气，与「呕吐」不同 |
| 10 | ME05 | 泄泻 | ME05 | Change in bowel habit | narrow | **留码加注** | — | Change in bowel habit = 排便习惯改变，与「泄泻」相关但不等于腹泻 |
| 11 | ME06 | 便秘 | ME06 | （无条目） | missing | **删码回查** | — | 码在 definitions-en.json 无条目 |
| 12 | MG27 | 水肿 | MG27 | Haemorrhage, not elsewhere classified | conflict | **待定码** | — | Haemorrhage, not elsewhere classified = 出血，与「水肿」无关 |
| 13 | GC00 | 淋证 | GC00 | Cystitis | narrow | **留码加注** | — | Cystitis = 膀胱炎；「淋证」范围更大（含石淋、膏淋等），只覆盖湿热淋一类 |
| 14 | ME83 | 腰痛 | ME83 | Rheumatism, unspecified | conflict | **待定码** | — | Rheumatism, unspecified = 风湿病，与「腰痛」不是同一实体（腰痛应落 low back pain） |

## 三、按动作分的改法

### 3.1 换码（1 格，可直接改）

- **眩晕**：`MB51` Diplegia of upper extremities → `MB48` Dizziness or giddiness
  - 为什么：Diplegia of upper extremities = 双上肢瘫，与「眩晕」无关；镜象里 Dizziness or giddiness = MB48，才是对得上的码

### 3.2 待定码（先标「待核」，不要猜）

这几条镜像里没有题名对得上的实体，只有「这个码指向别的东西」这一条确证。教材可先把码删掉或标「待核」，等拿到 MMS 全量表再定。

| 病名 | 原码 | 该码实际是什么 | 该码在 ICD-11 哪一章 |
|---|---|---|---|
| 喘证 | `MD11` | Abnormalities of breathing | 第 21 章 |
| 胃脘痛 | `MD90` | Nausea or vomiting | 第 21 章 |
| 呕吐 | `ME08` | Flatulence or related conditions | 第 21 章 |
| 水肿 | `MG27` | Haemorrhage, not elsewhere classified | 第 21 章 |
| 腰痛 | `ME83` | Rheumatism, unspecified | 第 21 章 |

### 3.3 删码回查

| 病名 | 原码 | 处理 |
|---|---|---|
| 胸痹 | `BA40` | 删码；回 WHO ICD-11 MMS 原表按病名重查（本仓库镜像无此条目） |
| 便秘 | `ME06` | 删码；回 WHO ICD-11 MMS 原表按病名重查（本仓库镜像无此条目） |

### 3.4 留码加注

码本身没错，错在「当成同名病用」。建议在该格后加注，注明层级：

| 病名 | 码 | 题名 | 该注什么 |
|---|---|---|---|
| 咳嗽 | `MD12` | Cough | Cough 是症状（咳嗽），教材「咳嗽」为病名；症状当病名用，需注明口径 |
| 哮病 | `CA23` | Asthma | Asthma 覆盖面含喘；教材「哮病」与「喘证」分列，Asthma 对应的是哮 |
| 心悸 | `MC81` | Abnormalities of heart beat | Abnormalities of heart beat 是体征类（心律异常），心悸是症状；层级不同 |
| 泄泻 | `ME05` | Change in bowel habit | Change in bowel habit = 排便习惯改变，与「泄泻」相关但不等于腹泻 |
| 淋证 | `GC00` | Cystitis | Cystitis = 膀胱炎；「淋证」范围更大（含石淋、膏淋等），只覆盖湿热淋一类 |

### 3.5 保留

- 感冒 → `CA00` Acute nasopharyngitis（不改）

## 四、复核方法（拿到这份建议的人自己验一遍）

```bash
# 1) 看某码在镜像里到底是什么
node -e "const E=require('./standards/icd11/definitions-en.json').entries;console.log(E['MB51'])"
# 2) 重跑对账，确认判定未过期
npm run zhenduan:icd
# 3) 重跑本交付件，确认建议未过期
node scripts/build_zhenduan_icd_corrections.js
# 4) 门：数字自洽 + 每条都有动作与依据
node tests/test_zhenduan_icd_corrections.js
```

## 五、这份建议的边界（三条，缺一条就会误用）

1. **镜像不全**：`definitions-en.json` 只有 2,394 条（ICD-11 MMS 全量约 17,000），所以「待定码」只表示本镜像内查不到对应实体，**不等于 ICD-11 里没有**。
2. **只到题名层**：判定依据是英文题名，不是定义正文与索引词；`ok` 只表示名字对得上，不表示教材的病与 ICD-11 实体是同一诊断标准。
3. **不改教材**：本仓库只出建议，不动 `E:\textbooks\qhzy-中医诊断学.xlsx`；改与不改、怎么改由教材维护者决定。

## 六、回填用 CSV

`standards/zhenduan/icd-corrections.csv`（UTF-8 带 BOM，Excel 直开不乱码），列为：
平台码 / 病名 / 原码 / 原码题名 / 判定 / 动作 / 建议码 / 建议题名 / 依据。可直接粘回工作簿的「icd」列旁边做对照。
