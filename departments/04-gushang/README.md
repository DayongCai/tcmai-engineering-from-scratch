# 🦴 骨伤系

> **Orthopedics & Traumatology** · 正骨理筋—骨病退变—运动损伤与康复工程

| 指标 | 数值 |
|------|------|
| 学科数 | 17（必修 17） |
| 总学时 | 1152 |
| 章节目标 | 150 |
| 已建章节 | 150 |
| 涉及学期 | 第4, 第5, 第6, 第7, 第8, 第9, 第10 |

## 学科清单

| # | 学科 | 英文名 | 类型 | 学期 | 学时 | 章节 | 中医 → AI 桥梁 | 进度 |
|---|------|--------|------|------|------|------|--------------|------|
| 01 | [中医运动学](01-zhongyi-yundong-xue/) | TCM Kinesiology | Core | 4 | 54 | 8/8 | 导引术式→动作序列 / 运动学参数→运动捕捉 | ✅ |
| 02 | [骨伤解剖学](02-yao-shang-jiepou/) | Musculoskeletal Anatomy | Core | 4 | 72 | 10/10 | 断层解剖→三维重建 / 定位→坐标系变换 | ✅ |
| 03 | [中医骨伤科学基础](03-gushang-kexue-jichu/) | Foundations of TCM Orthopedics | Core | 5 | 72 | 10/10 | 筋骨辨证→分层规则 / 损伤分类→多标签分类 | ✅ |
| 04 | [创伤急救学](04-chuangshang-jijiu-xue/) | Trauma & Emergency Care | Clinic | 5 | 54 | 8/8 | 创伤评分→风险分层 / 急救流程→决策树 | ✅ |
| 05 | [运动医学与损伤防护](05-yundong-yixue/) | Sports Medicine & Injury Prevention | Build | 5 | 54 | 8/8 | 损伤预测→幸存分析 / 负荷管理→时序模型 | ✅ |
| 06 | [中医正骨学](06-zhongyi-zhenggu-xue/) | TCM Bone-setting | Clinic | 6 | 90 | 12/12 | 复位手法→力学仿真 / 骨折分型→图像分类 | ✅ |
| 07 | [中医筋伤学](07-zhongyi-jinshang-xue/) | TCM Soft-tissue Injury | Clinic | 6 | 72 | 10/10 | 筋伤分期→阶段模型 / 触诊→压力传感阵列 | ✅ |
| 08 | [骨伤科手法治疗学](08-gushang-shoufa-zhiliao/) | Orthopedic Manual Therapy | Build | 6 | 72 | 10/10 | 手法力学→力反馈控制 / 疗效→纵向数据分析 | ✅ |
| 09 | [骨科影像诊断学](09-guke-yingxiang-zhenduan/) | Orthopedic Imaging | Build | 6 | 72 | 10/10 | X线/CT/MRI→CNN 分割 / 病灶检测→目标检测 | ✅ |
| 10 | [脊柱病学](10-jizhu-bing-xue/) | Spinal Disorders | Clinic | 7 | 72 | 10/10 | 脊柱曲度→几何测量 / 退变分级→有序回归 | ✅ |
| 11 | [关节病学](11-guanjie-bing-xue/) | Joint Disorders | Clinic | 7 | 72 | 10/10 | 关节间隙→自动测量 / 炎症活动度→影像组学 | ✅ |
| 12 | [骨质疏松与退行性疾病](12-guzhishusong-tuibian/) | Osteoporosis & Degenerative Disease | Build | 7 | 54 | 8/8 | 骨密度→回归预测 / 骨折风险→FRAX 类模型 | ✅ |
| 13 | [中医整脊学](13-zhongyi-zhengji-xue/) | TCM Spinal Adjustment | Clinic | 7 | 54 | 8/8 | 脊柱序列→姿态估计 / 调整方案→规划算法 | ✅ |
| 14 | [康复工程与支具学](14-kangfu-gongcheng-zhiju/) | Rehab Engineering & Orthotics | Build | 8 | 54 | 8/8 | 支具设计→参数化建模 / 3D 打印→增材制造流程 | ✅ |
| 15 | [骨伤康复评定](15-gushang-kangfu-pingding/) | Orthopedic Rehab Assessment | Build | 8 | 54 | 8/8 | 评定量表→信效度分析 / 康复进度→增长曲线模型 | ✅ |
| 16 | [骨伤临床轮转](16-gushang-linchuang-lunzhuan/) | Orthopedics & Traumatology Rotation | Clinic | 9 | 108 | 6/6 | 复位方案→参数化步骤 / 影像→测量指标 / 随访→功能评分 | ✅ |
| 17 | [骨伤毕业设计与知识移交](17-gushang-biye-sheji/) | Orthopedics Capstone & Handover | Build | 10 | 72 | 6/6 | 复位方案→可量化命题 / 影像与力学→数据 / 结论→可复现流程 | ✅ |

## 类型分布

| 类型 | 数量 | 交付侧重 |
|------|------|---------|
| Core | 3 | 理论与方法主干，[textbooks] 教材优先 |
| Clinic | 7 | 临床能力，[tcmP] 案例视频 + [textbooks] 案例集优先 |
| Build | 7 | 从零构建，[tcmP] 视频 + 可运行代码优先 |

## 学科创建

```bash
node scripts/scaffold_subject.js --all
node scripts/scaffold_chapter.js 04-gushang/<subject-slug> 01-<chapter-slug> "章节标题"
```

← [返回九院系总览](../README.md)
