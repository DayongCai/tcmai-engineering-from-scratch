#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""重写 departments/09-jichu/12-yaoli-xue/chapters.json：49 章 + 篇归属 + 英文 slug。

原来的 slug 是 01-ch01 … 49-ch49 这种占位式，读起来没法判断是哪一章；
门与 audit 又要求「去章号前缀的 slug」与章内 skill name 一致，
所以这里按章名给一套英文 slug，章序与底本一一对应（底本 9 篇 49 章）。
"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'departments', '09-jichu', '12-yaoli-xue', 'chapters.json')

# (章号, slug, 章名, 篇)
ROWS = [
    (1, 'introduction', '绪论', '第一篇 总论'),
    (2, 'pharmacodynamics', '药物效应动力学——药效学', '第一篇 总论'),
    (3, 'pharmacokinetics', '药物代谢动力学——药动学', '第一篇 总论'),
    (4, 'factors-affecting-drug-response', '影响药物效应的因素', '第一篇 总论'),
    (5, 'autonomic-nervous-system-overview', '传出神经系统药理概论', '第二篇 作用于传出神经系统的药物'),
    (6, 'cholinergic-agonists', '拟胆碱药', '第二篇 作用于传出神经系统的药物'),
    (7, 'organophosphates-and-cholinesterase-reactivating-agents', '有机磷酸酯类及胆碱酯酶复活药', '第二篇 作用于传出神经系统的药物'),
    (8, 'cholinergic-antagonists', '抗胆碱药', '第二篇 作用于传出神经系统的药物'),
    (9, 'adrenergic-agonists', '拟肾上腺素药', '第二篇 作用于传出神经系统的药物'),
    (10, 'adrenergic-antagonists', '抗肾上腺素药', '第二篇 作用于传出神经系统的药物'),
    (11, 'local-anesthetics', '局部麻醉药', '第二篇 作用于传出神经系统的药物'),
    (12, 'general-anesthetics', '全身麻醉药', '第三篇 作用于中枢神经系统的药物'),
    (13, 'sedative-hypnotics', '镇静催眠药', '第三篇 作用于中枢神经系统的药物'),
    (14, 'antiepileptic-and-anticonvulsant-drugs', '抗癫痫药与抗惊厥药', '第三篇 作用于中枢神经系统的药物'),
    (15, 'antipsychotic-drugs', '抗精神失常药', '第三篇 作用于中枢神经系统的药物'),
    (16, 'drugs-for-neurodegenerative-diseases', '治疗中枢神经系统退行性疾病药', '第三篇 作用于中枢神经系统的药物'),
    (17, 'antipyretic-analgesic-and-anti-inflammatory-drugs', '解热镇痛抗炎药与抗痛风药', '第三篇 作用于中枢神经系统的药物'),
    (18, 'opioid-analgesics', '镇痛药', '第三篇 作用于中枢神经系统的药物'),
    (19, 'central-nervous-system-stimulants', '中枢兴奋药', '第三篇 作用于中枢神经系统的药物'),
    (20, 'histamine-and-antihistamines', '组胺及抗组胺药', '第四篇 影响自体活性物质的药物'),
    (21, 'other-autacoid-drugs', '其他影响自体活性物质的药物', '第四篇 影响自体活性物质的药物'),
    (22, 'drugs-acting-on-cardiovascular-ion-channels', '作用于心血管系统离子通道的药物', '第五篇 作用于心血管系统的药物'),
    (23, 'drugs-for-chronic-heart-failure', '治疗慢性心功能不全的药物', '第五篇 作用于心血管系统的药物'),
    (24, 'antihypertensive-drugs', '抗高血压药', '第五篇 作用于心血管系统的药物'),
    (25, 'antianginal-drugs', '抗心绞痛药', '第五篇 作用于心血管系统的药物'),
    (26, 'antiarrhythmic-drugs', '抗心律失常药', '第五篇 作用于心血管系统的药物'),
    (27, 'antiatherosclerotic-drugs', '抗动脉粥样硬化药', '第五篇 作用于心血管系统的药物'),
    (28, 'diuretics-and-dehydrating-agents', '利尿药与脱水药', '第六篇 作用于内脏系统和血液系统的药物'),
    (29, 'gastrointestinal-drugs', '消化系统药', '第六篇 作用于内脏系统和血液系统的药物'),
    (30, 'respiratory-system-drugs', '呼吸系统药', '第六篇 作用于内脏系统和血液系统的药物'),
    (31, 'uterine-stimulants', '子宫兴奋药', '第六篇 作用于内脏系统和血液系统的药物'),
    (32, 'antianemic-drugs', '抗贫血药', '第六篇 作用于内脏系统和血液系统的药物'),
    (33, 'drugs-affecting-coagulation', '作用于凝血系统药物', '第六篇 作用于内脏系统和血液系统的药物'),
    (34, 'adrenocortical-hormones', '肾上腺皮质激素类药', '第七篇 作用于内分泌系统药物'),
    (35, 'thyroid-hormones-and-antithyroid-drugs', '甲状腺激素与抗甲状腺药', '第七篇 作用于内分泌系统药物'),
    (36, 'antihyperglycemic-drugs', '降血糖药', '第七篇 作用于内分泌系统药物'),
    (37, 'sex-hormones-and-contraceptives', '性激素类药及避孕药', '第七篇 作用于内分泌系统药物'),
    (38, 'antimicrobial-drugs-overview', '抗病原微生物药物概论', '第八篇 化学治疗药物'),
    (39, 'synthetic-antibacterial-drugs', '人工合成抗菌药', '第八篇 化学治疗药物'),
    (40, 'beta-lactam-antibiotics', 'β-内酰胺类抗生素', '第八篇 化学治疗药物'),
    (41, 'macrolides-lincosamides-and-polypeptide-antibiotics', '大环内酯类、林可霉素类及多肽类抗生素', '第八篇 化学治疗药物'),
    (42, 'aminoglycoside-antibiotics', '氨基糖苷类抗生素', '第八篇 化学治疗药物'),
    (43, 'tetracyclines-and-chloramphenicol', '四环素类与氯霉素类', '第八篇 化学治疗药物'),
    (44, 'antifungal-and-antiviral-drugs', '抗真菌药与抗病毒药', '第八篇 化学治疗药物'),
    (45, 'antituberculosis-and-antileprosy-drugs', '抗结核病药及抗麻风病药', '第八篇 化学治疗药物'),
    (46, 'antiparasitic-drugs', '抗寄生虫药', '第八篇 化学治疗药物'),
    (47, 'anticancer-drugs', '抗恶性肿瘤药', '第八篇 化学治疗药物'),
    (48, 'immunosuppressants', '免疫抑制药', '第九篇 影响免疫功能的药物'),
    (49, 'immunostimulants', '免疫增强药', '第九篇 影响免疫功能的药物'),
]


def main():
    assert len(ROWS) == 49, len(ROWS)
    nos = [r[0] for r in ROWS]
    assert nos == list(range(1, 50)), '章号必须连续 1..49'
    slugs = [r[1] for r in ROWS]
    assert len(set(slugs)) == 49, 'slug 重复'
    out = {
        'slug': '12-yaoli-xue',
        'title': '药理学',
        'chapters': [
            {'n': n, 'slug': '%02d-%s' % (n, s), 'title': '第%d章 %s' % (n, t), 'unit': u, 'status': '⏳'}
            for n, s, t, u in ROWS
        ],
    }
    io.open(OUT, 'w', encoding='utf-8', newline='\n').write(
        json.dumps(out, ensure_ascii=False, indent=1) + '\n')
    units = sorted({r[3] for r in ROWS})
    print('写入 %s：49 章 · %d 篇' % (os.path.relpath(OUT, ROOT), len(units)))
    for u in units:
        print('  %-28s %d 章' % (u, sum(1 for r in ROWS if r[3] == u)))


if __name__ == '__main__':
    main()
