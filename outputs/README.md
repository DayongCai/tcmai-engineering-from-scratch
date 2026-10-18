# 产出物索引

> 本章节由 `scripts/build_outputs_index.js` **生成**，请勿手改；重跑脚本同步。

> **38** 件产出物 · 覆盖 **19** 个章节 · prompt 19 · skill 19

## 这是什么

每章的 `outputs/` 交出两件**可复用**的东西（契约见 [CONTRIBUTING.md](../CONTRIBUTING.md)）：

| 产物 | 是什么 | 拿来做什么 |
| --- | --- | --- |
| `prompt-<base>.md` | 提示词 | 让大模型按本章的判断格式输出 |
| `skill-<base>.md` | 技能（带 frontmatter） | 把本章的流程固化成可复用操作 |

这两件是「工程化」与「讲课」的分界 —— 代码能跑只证明写对了，**能交出去复用**才算工程化。

浏览页：[index.html](index.html)（自包含，可离线打开）· 机器可读：[index.json](index.json)

## 按院系浏览

| 院系 | 学科 | 章节 | 产出物 |
| --- | --- | --- | :-: |
| ☯️ 中医系 | 中医基础理论 | 3 | 6 |
| ☯️ 中医系 | 中医诊断学 | 1 | 2 |
| ☯️ 中医系 | 内经选读 | 6 | 12 |
| ☯️ 中医系 | 伤寒论 | 2 | 4 |
| 🌾 中药系 | 中药学 | 1 | 2 |
| 🪡 针灸系 | 腧穴学 | 1 | 2 |
| 🦴 骨伤系 | 中医正骨学 | 1 | 2 |
| 🩺 护理系 | 中医护理技术 | 1 | 2 |
| 📊 管理系 | 医学统计学 | 1 | 2 |
| 🤖 智能系 | 中医智能辨证系统 | 1 | 2 |
| 👁️ 五官口腔系 | 中医眼科学 | 1 | 2 |

## ☯️ 中医系

### 中医基础理论

> Core · 第 1 学期 · 已产出 3 章

#### 第 1 章 · 阴阳学说 → 二分类：从零实现逻辑回归

`01-zhongyi-jichu-lilun/chapters/01-yin-yang-er-fenlei/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | Prompt · 阴阳倾向结构化归因 | — | 1234 | [`prompt-yin-yang-er-fenlei.md`](../departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/01-yin-yang-er-fenlei/outputs/prompt-yin-yang-er-fenlei.md) |
| skill | 阴阳倾向结构化判别 | 把四诊体征结构化为阴阳倾向判断（含置信度与拒答条件），并逐项给出可核查理由。 | 1322 | [`skill-yin-yang-er-fenlei.md`](../departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/01-yin-yang-er-fenlei/outputs/skill-yin-yang-er-fenlei.md) |

#### 第 2 章 · 五行学说 → 多分类：从零实现 Softmax（并检验生克约束是否真的有用）

`01-zhongyi-jichu-lilun/chapters/02-wu-xing-duo-fenlei/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | Prompt · 加约束前的基线测量 | — | 1300 | [`prompt-wu-xing-duo-fenlei.md`](../departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/02-wu-xing-duo-fenlei/outputs/prompt-wu-xing-duo-fenlei.md) |
| skill | 五行归类的可归因流程 | 五行归类必须给出所依据的配属维度，并显式标注生克关系一致性；资料不足时标记不确定。 | 1612 | [`skill-wu-xing-duo-fenlei.md`](../departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/02-wu-xing-duo-fenlei/outputs/skill-wu-xing-duo-fenlei.md) |

#### 第 3 章 · 藏象学说 → 知识图谱：脏腑关系的图表示

`01-zhongyi-jichu-lilun/chapters/03-zang-xiang-tupu/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | Prompt · 藏象关系链整理（带方向校验） | — | 1943 | [`prompt-zang-xiang-tupu.md`](../departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/03-zang-xiang-tupu/outputs/prompt-zang-xiang-tupu.md) |
| skill | 藏象关系链抽取与校验 | 把症状串成藏象关系链，每一步标注关系类型与方向，跨五行时显式标出相生相克。 | 1670 | [`skill-zang-xiang-tupu.md`](../departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/03-zang-xiang-tupu/outputs/skill-zang-xiang-tupu.md) |

### 中医诊断学

> Core · 第 3 学期 · 已产出 1 章

#### 第 8 章 · 脏腑辨证 → 规则表与权重：把「肝气郁结」写成可复核的打分

`05-zhongyi-zhen-duan-xue/chapters/08-zangfu-bianzheng/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | 脏腑辨证规则表生成器 | — | 651 | [`prompt-zangfu-bianzheng.md`](../departments/01-zhongyi/05-zhongyi-zhen-duan-xue/chapters/08-zangfu-bianzheng/outputs/prompt-zangfu-bianzheng.md) |
| skill | zangfu-bianzheng | 把四诊记录整理成脏腑证候的证据表（主症/次症/舌脉）并报出证据缺口，不给结论 | 621 | [`skill-zangfu-bianzheng.md`](../departments/01-zhongyi/05-zhongyi-zhen-duan-xue/chapters/08-zangfu-bianzheng/outputs/skill-zangfu-bianzheng.md) |

### 内经选读

> Core · 第 3 学期 · 已产出 6 章

#### 第 1 章 · 《黄帝内经》成书与文本结构：162 篇不是一个整体

`06-neijing-xuandu/chapters/01-suwen-chengshu/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | 内经引文定位助手 | — | 562 | [`prompt-suwen-chengshu.md`](../departments/01-zhongyi/06-neijing-xuandu/chapters/01-suwen-chengshu/outputs/prompt-suwen-chengshu.md) |
| skill | suwen-chengshu | 把「内经云」补到篇级并判明原文/注释，给出该篇实测体量与字词差异 | 550 | [`skill-suwen-chengshu.md`](../departments/01-zhongyi/06-neijing-xuandu/chapters/01-suwen-chengshu/outputs/skill-suwen-chengshu.md) |

#### 第 2 章 · 《素问·阴阳应象大论》：把「阴阳」拆成四组可操作的维度

`06-neijing-xuandu/chapters/02-yinyang-yingxiang/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | 经文四轴标注器 | — | 718 | [`prompt-yinyang-yingxiang.md`](../departments/01-zhongyi/06-neijing-xuandu/chapters/02-yinyang-yingxiang/outputs/prompt-yinyang-yingxiang.md) |
| skill | yinyang-yingxiang | 按《素问·阴阳应象大论》四轴标注四诊记录：给偏侧、依据与追问，不输出证型 | 532 | [`skill-yinyang-yingxiang.md`](../departments/01-zhongyi/06-neijing-xuandu/chapters/02-yinyang-yingxiang/outputs/skill-yinyang-yingxiang.md) |

#### 第 3 章 · 藏象与五脏的系统观：五个「本」里藏着四种不规则

`06-neijing-xuandu/chapters/03-zangxiang-xitong/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | 藏象五元组抽取助手 | — | 637 | [`prompt-zangxiang-xitong.md`](../departments/01-zhongyi/06-neijing-xuandu/chapters/03-zangxiang-xitong/outputs/prompt-zangxiang-xitong.md) |
| skill | zangxiang-xitong | 抽藏象五元组（本/华/充/阴阳位/通于），剥离校勘夹注并标注不规则句式 | 514 | [`skill-zangxiang-xitong.md`](../departments/01-zhongyi/06-neijing-xuandu/chapters/03-zangxiang-xitong/outputs/skill-zangxiang-xitong.md) |

#### 第 5 章 · 病机十九条：十九句话里，五脏只占五条

`06-neijing-xuandu/chapters/05-bingji-shijiu/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | 病机十九条反查器 | — | 596 | [`prompt-bingji-shijiu.md`](../departments/01-zhongyi/06-neijing-xuandu/chapters/05-bingji-shijiu/outputs/prompt-bingji-shijiu.md) |
| skill | bingji-shijiu | 按病机十九条反查症状：列出全部命中条文与各自的不排除项，并指出十九条之外缺什么 | 498 | [`skill-bingji-shijiu.md`](../departments/01-zhongyi/06-neijing-xuandu/chapters/05-bingji-shijiu/outputs/skill-bingji-shijiu.md) |

#### 第 6 章 · 《脉要精微论》：先把诊断条件管住，再谈脉象

`06-neijing-xuandu/chapters/06-zhenfa-maiyao/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | 诊法条件记录助手 | — | 657 | [`prompt-zhenfa-maiyao.md`](../departments/01-zhongyi/06-neijing-xuandu/chapters/06-zhenfa-maiyao/outputs/prompt-zhenfa-maiyao.md) |
| skill | zhenfa-maiyao | 脉诊采集条件核对：逐条判原文四条件、单列补充项、不作废也不换算 | 500 | [`skill-zhenfa-maiyao.md`](../departments/01-zhongyi/06-neijing-xuandu/chapters/06-zhenfa-maiyao/outputs/skill-zhenfa-maiyao.md) |

#### 第 9 章 · 《灵枢·九针十二原》：九种针不是九种型号

`06-neijing-xuandu/chapters/09-lingshu-jiuzhen/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | 九针选针助手 | — | 642 | [`prompt-lingshu-jiuzhen.md`](../departments/01-zhongyi/06-neijing-xuandu/chapters/09-lingshu-jiuzhen/outputs/prompt-lingshu-jiuzhen.md) |
| skill | lingshu-jiuzhen | 按形制—用途查九针：给候选、原文依据与折算区间，不外推适应证 | 546 | [`skill-lingshu-jiuzhen.md`](../departments/01-zhongyi/06-neijing-xuandu/chapters/09-lingshu-jiuzhen/outputs/skill-lingshu-jiuzhen.md) |

### 伤寒论

> Core · 第 4 学期 · 已产出 2 章

#### 第 1 章 · 《伤寒论》的成书、版本与条文结构：1760 条不是 398 条

`07-shanghanlun/chapters/01-chengshu-banben/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | 伤寒条号引用器 | — | 593 | [`prompt-chengshu-banben.md`](../departments/01-zhongyi/07-shanghanlun/chapters/01-chengshu-banben/outputs/prompt-chengshu-banben.md) |
| skill | chengshu-banben | 伤寒条文引用核对：补到篇+篇内条号+底本标识，原文逐字返回，歧义全列 | 556 | [`skill-chengshu-banben.md`](../departments/01-zhongyi/07-shanghanlun/chapters/01-chengshu-banben/outputs/skill-chengshu-banben.md) |

#### 第 9 章 · 合病与并病：两经同时病，还是一个没走一个又来

`07-shanghanlun/chapters/09-hebing-bingbing/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | 合病并病辨读助手 | — | 609 | [`prompt-hebing-bingbing.md`](../departments/01-zhongyi/07-shanghanlun/chapters/09-hebing-bingbing/outputs/prompt-hebing-bingbing.md) |
| skill | hebing-bingbing | 判合病与并病：定时间结构、定六经、引主症与原文方，经名不外推 | 533 | [`skill-hebing-bingbing.md`](../departments/01-zhongyi/07-shanghanlun/chapters/09-hebing-bingbing/outputs/skill-hebing-bingbing.md) |

## 🌾 中药系

### 中药学

> Core · 第 2 学期 · 已产出 1 章

#### 第 12 章 · 中药性能的编码化：性味归经 → 向量

`01-zhongyaoxue/chapters/12-xingneng-bianma/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | 中药性能编码器 | — | 722 | [`prompt-xingneng-bianma.md`](../departments/02-zhongyao/01-zhongyaoxue/chapters/12-xingneng-bianma/outputs/prompt-xingneng-bianma.md) |
| skill | xingneng-bianma | 把中药材的性味归经整理成可计算向量，并按性能相似度给出近似药候选（只作查证线索） | 663 | [`skill-xingneng-bianma.md`](../departments/02-zhongyao/01-zhongyaoxue/chapters/12-xingneng-bianma/outputs/skill-xingneng-bianma.md) |

## 🪡 针灸系

### 腧穴学

> Core · 第 3 学期 · 已产出 1 章

#### 第 11 章 · 危险穴位与针刺安全深度：把「不可深刺」变成一道可算的闸门

`02-shuxue-xue/chapters/11-weixian-shendu/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | 进针前安全复核单 | — | 705 | [`prompt-weixian-shendu.md`](../departments/03-zhenjiu/02-shuxue-xue/chapters/11-weixian-shendu/outputs/prompt-weixian-shendu.md) |
| skill | weixian-shendu | 进针前的安全深度与方向复核：给出允许/警告/禁止/需上级决定，并列出模型未知项 | 683 | [`skill-weixian-shendu.md`](../departments/03-zhenjiu/02-shuxue-xue/chapters/11-weixian-shendu/outputs/skill-weixian-shendu.md) |

## 🦴 骨伤系

### 中医正骨学

> Clinic · 第 6 学期 · 已产出 1 章

#### 第 12 章 · 正骨手法的力学建模：把「巧劲」拆成力、力臂与阈值

`06-zhongyi-zhenggu-xue/chapters/12-shoufa-jianmo/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | 正骨手法力学预演 | — | 764 | [`prompt-shoufa-jianmo.md`](../departments/04-gushang/06-zhongyi-zhenggu-xue/chapters/12-shoufa-jianmo/outputs/prompt-shoufa-jianmo.md) |
| skill | shoufa-jianmo | 正骨复位前的力学预演：算所需牵引力、力区间与力矩，并列出模型未建模的因素 | 644 | [`skill-shoufa-jianmo.md`](../departments/04-gushang/06-zhongyi-zhenggu-xue/chapters/12-shoufa-jianmo/outputs/skill-shoufa-jianmo.md) |

## 🩺 护理系

### 中医护理技术

> Build · 第 3 学期 · 已产出 1 章

#### 第 8 章 · 中医护理技术的疗效评价：把「病人说舒服多了」变成可复核的数

`04-zhongyi-huli-jishu/chapters/08-liaoxiao-pingjia/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | 护理技术疗效记录单 | — | 680 | [`prompt-liaoxiao-pingjia.md`](../departments/05-huli/04-zhongyi-huli-jishu/chapters/08-liaoxiao-pingjia/outputs/prompt-liaoxiao-pingjia.md) |
| skill | liaoxiao-pingjia | 中医护理技术的前后测量记录：算配对效应量与 MCID，并明确写出不能推断的结论 | 610 | [`skill-liaoxiao-pingjia.md`](../departments/05-huli/04-zhongyi-huli-jishu/chapters/08-liaoxiao-pingjia/outputs/skill-liaoxiao-pingjia.md) |

## 📊 管理系

### 医学统计学

> Core · 第 4 学期 · 已产出 1 章

#### 第 9 章 · 多重比较与假阳性控制：为什么「做了 20 个指标，总有 1 个显著」

`01-yixue-tongjixue/chapters/09-duochong-jiaoyan/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | 多重比较校正选择器 | — | 679 | [`prompt-duochong-jiaoyan.md`](../departments/06-guanli/01-yixue-tongjixue/chapters/09-duochong-jiaoyan/outputs/prompt-duochong-jiaoyan.md) |
| skill | duochong-jiaoyan | 按研究目的选择 FWER 或 FDR 校正，算出门槛并写明校正的代价与不可弥补的偏倚 | 565 | [`skill-duochong-jiaoyan.md`](../departments/06-guanli/01-yixue-tongjixue/chapters/09-duochong-jiaoyan/outputs/skill-duochong-jiaoyan.md) |

## 🤖 智能系

### 中医智能辨证系统

> Build · 第 6 学期 · 已产出 1 章

#### 第 7 章 · 与医生诊断的一致性评估：kappa 高就说明系统靠谱吗

`06-zhongyi-zhineng-bianzheng/chapters/07-yizhixing-pinggu/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | 一致性评估报告单 | — | 770 | [`prompt-yizhixing-pinggu.md`](../departments/07-zhineng/06-zhongyi-zhineng-bianzheng/chapters/07-yizhixing-pinggu/outputs/prompt-yizhixing-pinggu.md) |
| skill | yizhixing-pinggu | 系统与医生辨证一致性评估：混淆矩阵、kappa、PABAK，并写明不能据此声称临床可用 | 622 | [`skill-yizhixing-pinggu.md`](../departments/07-zhineng/06-zhongyi-zhineng-bianzheng/chapters/07-yizhixing-pinggu/outputs/skill-yizhixing-pinggu.md) |

## 👁️ 五官口腔系

### 中医眼科学

> Clinic · 第 6 学期 · 已产出 1 章

#### 第 1 章 · 五轮八廓学说与眼的脏腑配属：一张能查、也能被质疑的映射表

`06-zhongyi-yanke-xue/chapters/01-wulun-bakuo/`

| 类型 | 标题 | 说明 | 字数 | 文件 |
| --- | --- | --- | :-: | --- |
| prompt | 眼科体征归轮助手 | — | 587 | [`prompt-wulun-bakuo.md`](../departments/08-wuguan/06-zhongyi-yanke-xue/chapters/01-wulun-bakuo/outputs/prompt-wulun-bakuo.md) |
| skill | wulun-bakuo | 眼科局部体征归到五轮与脏腑，输出带出处与争议标记的映射，并保留跨区多候选 | 530 | [`skill-wulun-bakuo.md`](../departments/08-wuguan/06-zhongyi-yanke-xue/chapters/01-wulun-bakuo/outputs/skill-wulun-bakuo.md) |

## 缺口

无：所有已建章节都交齐了 prompt 与 skill。
