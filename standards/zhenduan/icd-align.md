# 中医诊断学 BZU 病码 × ICD-11 术语层对账

> 生成：2026-10-28 · 输入：bzu.json `d345e598d0e7` / definitions-en 2394 条 / zh-names 1120 条

## 一、结论数字

| 项 | 值 |
|---|--:|
| 带 ICD-11 码的病行 | 14 |
| ok（题名对得上） | 1 |
| narrow（范围不等） | 5 |
| **conflict（指向不同实体）** | **6** |
| **missing（库中无此条目）** | **2** |
| **错配率 = (conflict+missing)/总数** | **57.1%** |
| 在 definitions-en 有定义 | 12 |
| 在 zh-names（TM1/TM2）有中文名 | 0 |

## 二、逐条判定

| 平台码 | 病名 | ICD 码 | 题名 | 章 | 判定 | 依据 | 建议码 |
|---|---|---|---|--:|---|---|---|
| CA00 | 感冒 | CA00 | Acute nasopharyngitis | 12 | ok | Acute nasopharyngitis = 急性鼻咽炎；感冒的现代对应即普通感冒，可接受 | — |
| MD12 | 咳嗽 | MD12 | Cough | 21 | narrow | Cough 是症状（咳嗽），教材「咳嗽」为病名；症状当病名用，需注明口径 | — |
| CA23 | 哮病 | CA23 | Asthma | 12 | narrow | Asthma 覆盖面含喘；教材「哮病」与「喘证」分列，Asthma 对应的是哮 | — |
| MD11 | 喘证 | MD11 | Abnormalities of breathing | 21 | conflict | Abnormalities of breathing 是「呼吸异常」大类，不是「喘证」；喘证应落在具体呼吸困难的类目 | — |
| MC81 | 心悸 | MC81 | Abnormalities of heart beat | 21 | narrow | Abnormalities of heart beat 是体征类（心律异常），心悸是症状；层级不同 | — |
| BA40 | 胸痹 | BA40 | （无条目） | — | missing | 码在 definitions-en.json 无条目（胸痹在 TM1 里的码不是 BA40，需回 WHO 表核对） | — |
| MB51 | 眩晕 | MB51 | Diplegia of upper extremities | 21 | conflict | Diplegia of upper extremities = 双上肢瘫，与「眩晕」无关；镜象里 Dizziness or giddiness = MB48，才是对得上的码 | MB48 |
| MD90 | 胃脘痛 | MD90 | Nausea or vomiting | 21 | conflict | Nausea or vomiting = 恶心呕吐，与「胃脘痛」不是同一实体 | — |
| ME08 | 呕吐 | ME08 | Flatulence or related conditions | 21 | conflict | Flatulence = 腹胀气，与「呕吐」不同 | — |
| ME05 | 泄泻 | ME05 | Change in bowel habit | 21 | narrow | Change in bowel habit = 排便习惯改变，与「泄泻」相关但不等于腹泻 | — |
| ME06 | 便秘 | ME06 | （无条目） | — | missing | 码在 definitions-en.json 无条目 | — |
| MG27 | 水肿 | MG27 | Haemorrhage, not elsewhere classified | 21 | conflict | Haemorrhage, not elsewhere classified = 出血，与「水肿」无关 | — |
| GC00 | 淋证 | GC00 | Cystitis | 16 | narrow | Cystitis = 膀胱炎；「淋证」范围更大（含石淋、膏淋等），只覆盖湿热淋一类 | — |
| ME83 | 腰痛 | ME83 | Rheumatism, unspecified | 21 | conflict | Rheumatism, unspecified = 风湿病，与「腰痛」不是同一实体（腰痛应落 low back pain） | — |

## 三、口径与边界

- 这是「码↔题名」层面对账，不是「临床等价」判断：ok 只表示名字对得上，不表示教材的病与 ICD-11 的实体是同一诊断标准
- zh-names.json 只有 TM1/TM2 两模块（472 + 648），西医章的码（CA/MD/MB/ME/MC/MG/GC）本来就不在其中，所以 inTmZhNames=0 不代表码错
- 判定表由本仓库逐条人判，judgements 可复核；不得据此改教材或 bzu 码值
- definitions-en.json 只有 2,394 条（非 MMS 全量），所以只能证明「给出的码指向别的东西」，不能对每条都给正确码；suggested 只在镜象里确有对应条目时才写

## 四、章分布

| ICD-11 章 | 条数 |
|---|--:|
| 12 | 2 |
| 16 | 1 |
| 21 | 9 |
| MISSING | 2 |
