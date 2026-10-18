# 🪡 针灸系

> **Acupuncture & Moxibustion** · 经络腧穴—刺法灸法—针灸治疗 与推拿康复的完整链条

| 指标 | 数值 |
|------|------|
| 学科数 | 15 |
| 总学时 | 954 |
| 章节目标 | 136 |
| 已建章节 | 1 |
| 涉及学期 | 第2, 第3, 第4, 第5, 第6, 第7 |

## 学科清单

| # | 学科 | 英文名 | 类型 | 学期 | 学时 | 章节 | 中医 → AI 桥梁 | 进度 |
|---|------|--------|------|------|------|------|--------------|------|
| 01 | [经络学](01-jingluo-xue/) | Meridian Theory | Core | 2 | 72 | 0/10 | 经络循行→图结构 / 路径查询→图遍历 | ⬚ |
| 02 | [腧穴学](02-shuxue-xue/) | Acupoint Theory | Core | 3 | 90 | 1/12 | 腧穴定位→三维坐标 / 取穴→KD-Tree 最近邻 | 🚧 |
| 03 | [针灸医籍选](03-zhenjiu-yiji-xuan/) | Selected Acupuncture Classics | Reference | 3 | 54 | 0/8 | 古籍条文→语料检索 / 治法归纳→规则抽取 | ⬚ |
| 04 | [中医气功学](04-qigong-xue/) | TCM Qigong | Reference | 3 | 36 | 0/6 | 呼吸节律→时序信号 / 功法教学→动作识别 | ⬚ |
| 05 | [推拿学](05-tuina-xue/) | Tui Na (Chinese Massage) | Clinic | 4 | 72 | 0/10 | 手法参数→力-时曲线 / 疗效评价→量表分析 | ⬚ |
| 06 | [推拿手法学](06-tuina-shoufa-xue/) | Tui Na Manipulation Techniques | Build | 4 | 54 | 0/8 | 手法轨迹→姿态估计 / 力度反馈→可穿戴传感 | ⬚ |
| 07 | [刺法灸法学](07-cifa-jiufa-xue/) | Acupuncture & Moxibustion Techniques | Core | 4 | 72 | 0/10 | 进针角度→几何参数 / 得气→肌电特征 | ⬚ |
| 08 | [针灸治疗学](08-zhenjiu-zhiliao-xue/) | Acupuncture Therapeutics | Clinic | 5 | 90 | 0/12 | 处方配穴→组合优化 / 疗效预测→分类模型 | ⬚ |
| 09 | [康复医学基础](09-kangfu-yixue-jichu/) | Foundations of Rehabilitation | Core | 5 | 54 | 0/8 | 功能评定→量表计分 / 康复计划→路径搜索 | ⬚ |
| 10 | [实验针灸学](10-shiyan-zhenjiu-xue/) | Experimental Acupuncture | Build | 6 | 72 | 0/10 | 动物实验→统计设计 / 电针参数→响应曲面 | ⬚ |
| 11 | [物理治疗与运动康复](11-wuli-zhiliao/) | Physiotherapy & Sports Rehab | Build | 6 | 54 | 0/8 | 运动处方→个性化推荐 / 步态数据→时序分类 | ⬚ |
| 12 | [耳穴诊治学](12-erxue-zhenduan-xue/) | Auricular Diagnosis & Therapy | Build | 6 | 54 | 0/8 | 耳穴分区→图像配准 / 阳性反应点→目标检测 | ⬚ |
| 13 | [针刀医学](13-zhendao-yixue/) | Acupotomy Medicine | Clinic | 7 | 54 | 0/8 | 松解层次→解剖分层模型 / 操作规划→路径规划 | ⬚ |
| 14 | [针灸镇痛与麻醉](14-zhenjiu-zhentong-mazui/) | Acupuncture Analgesia & Anesthesia | Build | 7 | 54 | 0/8 | 镇痛机制→神经环路建模 / 疼痛评分→回归 | ⬚ |
| 15 | [中医康复学](15-zhongyi-kangfu-xue/) | TCM Rehabilitation | Clinic | 7 | 72 | 0/10 | 辨证施康→规则+ML 混合 / 随访数据→生存分析 | ⬚ |

## 类型分布

| 类型 | 数量 | 交付侧重 |
|------|------|---------|
| Core | 4 | 理论与方法主干，[textbooks] 教材优先 |
| Reference | 2 | 术语与脉络，[textbooks] 工具书优先 |
| Clinic | 4 | 临床能力，[tcmP] 案例视频 + [textbooks] 案例集优先 |
| Build | 5 | 从零构建，[tcmP] 视频 + 可运行代码优先 |

## 学科创建

```bash
node scripts/scaffold_subject.js --all
node scripts/scaffold_chapter.js 03-zhenjiu/<subject-slug> 01-<chapter-slug> "章节标题"
```

← [返回八院系总览](../README.md)
