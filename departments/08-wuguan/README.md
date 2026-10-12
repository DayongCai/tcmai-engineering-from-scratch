# 👁️ 五官口腔系

> **Otorhinolaryngology & Stomatology** · 眼、耳鼻喉、口腔三科的经典辨证与现代诊疗技术

| 指标 | 数值 |
|------|------|
| 学科数 | 15 |
| 总学时 | 918 |
| 章节目标 | 132 |
| 已建章节 | 0 |
| 涉及学期 | 第4, 第5, 第6, 第7, 第8 |

## 学科清单

| # | 学科 | 英文名 | 类型 | 学期 | 学时 | 章节 | 中医 → AI 桥梁 | 进度 |
|---|------|--------|------|------|------|------|--------------|------|
| 01 | [耳鼻喉解剖生理学](01-erbihou-jiepou-shengli/) | ENT Anatomy & Physiology | Core | 4 | 54 | 0/8 | 腔道结构→三维建模 / 生理信号→声学分析 | ⬚ |
| 02 | [口腔解剖生理学](02-kouqiang-jiepou-shengli/) | Oral Anatomy & Physiology | Core | 4 | 54 | 0/8 | 牙列形态→几何建模 / 咬合→力学仿真 | ⬚ |
| 03 | [中医面部望诊学](03-zhongyi-mianbu-wangzhen/) | TCM Facial Inspection | Build | 5 | 54 | 0/8 | 面色分区→图像配准 / 面色分类→色彩直方图 | ⬚ |
| 04 | [眼科光学与验光](04-yanke-guangxue-yanguang/) | Ophthalmic Optics & Refraction | Build | 5 | 54 | 0/8 | 屈光计算→光学公式 / 验光数据→球柱换算 | ⬚ |
| 05 | [中医五官科经典选读](05-zhongyi-wuguan-jingdian/) | Selected ENT/Stomato Classics | Reference | 5 | 36 | 0/6 | 原文检索→向量库 / 方证归纳→规则抽取 | ⬚ |
| 06 | [中医眼科学](06-zhongyi-yanke-xue/) | TCM Ophthalmology | Clinic | 6 | 72 | 0/10 | 五轮八廓→分层模型 / 眼底图像→病灶检测 | ⬚ |
| 07 | [中医耳鼻喉科学](07-zhongyi-erbihou-xue/) | TCM Otorhinolaryngology | Clinic | 6 | 72 | 0/10 | 耳鼻喉辨证→多标签分类 / 嗓音数据→声学特征 | ⬚ |
| 08 | [中医口腔科学](08-zhongyi-kouqiang-kexue/) | TCM Stomatology | Clinic | 6 | 72 | 0/10 | 口腔辨证→黏膜图像分类 / 治疗计划→决策支持 | ⬚ |
| 09 | [口腔内科学](09-kouqiang-neike-xue/) | Oral Medicine | Clinic | 6 | 72 | 0/10 | 龋病分级→有序分类 / X 线影像→语义分割 | ⬚ |
| 10 | [眼科影像与检查技术](10-yanke-yingxiang-jiancha/) | Ophthalmic Imaging & Examination | Build | 6 | 54 | 0/8 | OCT/眼底→CNN / 视野检查→缺损图谱分析 | ⬚ |
| 11 | [口腔颌面外科学](11-kouqiang-hemian-waike/) | Oral & Maxillofacial Surgery | Clinic | 7 | 72 | 0/10 | 颌面重建→三维规划 / 手术导航→配准算法 | ⬚ |
| 12 | [口腔修复学](12-kouqiang-xiufu-xue/) | Prosthodontics | Clinic | 7 | 72 | 0/10 | 义齿设计→参数化 CAD / 咬合重建→力学优化 | ⬚ |
| 13 | [口腔正畸学](13-kouqiang-zhengji-xue/) | Orthodontics | Clinic | 7 | 72 | 0/10 | 头影测量→关键点检测 / 拔牙决策→分类模型 | ⬚ |
| 14 | [中医嗓音医学](14-zhongyi-sangyin-yixue/) | TCM Voice Medicine | Build | 7 | 54 | 0/8 | 嗓音信号→谱图分类 / 发声训练→生物反馈 | ⬚ |
| 15 | [中医美容与皮肤治疗学](15-zhongyi-meirong-pifu/) | TCM Cosmetology & Dermatology | Build | 8 | 54 | 0/8 | 皮肤图像→病变分割 / 面部年轻化→图像评价 | ⬚ |

## 类型分布

| 类型 | 数量 | 交付侧重 |
|------|------|---------|
| Core | 2 | 理论与方法主干，[textbooks] 教材优先 |
| Build | 5 | 从零构建，[tcmP] 视频 + 可运行代码优先 |
| Reference | 1 | 术语与脉络，[textbooks] 工具书优先 |
| Clinic | 7 | 临床能力，[tcmP] 案例视频 + [textbooks] 案例集优先 |

## 学科创建

```bash
node scripts/scaffold_subject.js --all
node scripts/scaffold_chapter.js 08-wuguan/<subject-slug> 01-<chapter-slug> "章节标题"
```

← [返回八院系总览](../README.md)
