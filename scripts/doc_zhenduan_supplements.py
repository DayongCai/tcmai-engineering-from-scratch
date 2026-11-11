#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""给 04/05/06/12 四章的 docs 与章内测试补上「教材缺口与补录」一节（可重跑）。"""

import io
import os

BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    'departments', '01-zhongyi', '05-zhongyi-zhen-duan-xue', 'chapters')

DOC = {
    '04-wenzhen-shengyin': """
## 七、教材缺口与补录：气味没有分级

教材 3.2「嗅气味」只有 **2 小节 / 3 个段标题**，覆盖 **6 个气源**（口气、汗气、痰涕、二便、经带、病室），
但**没有任何分级**——不辨气味类别，也不说气味归于何脏。这一层缺口，教材自己补不上。

外源补录（`standards/zhenduan/supplements/`，底本不动）：

| 气味（五臭） | 所归之脏 | 出处 |
|---|---|---|
| 臊 | 肝 | 外源·笈成·黃帝內經素問 金匱真言論篇第四「其臭臊」 |
| 焦 | 心 | 同上「其臭焦」 |
| 香 | 脾 | 同上「其臭香」 |
| 腥 | 肺 | 同上「其臭腥」 |
| 腐 | 腎 | 同上「其臭腐」 |

《素問》把五臭按五行分归五脏，这是「气味可分级」的经典依据；教材的六源清单与之并不冲突，
前者是**来源分类**、后者是**性质分类**，两套口径要分开说，不能互相替代。
""",
    '05-wenzhen-wenjuan': """
## 七、教材缺口与补录：十问只到八节

教材 4.2 标题写「问现在症（十问歌）」，正文 **8 个小节**。外源《景岳全書》十問篇（同一条源头）给出的十问歌是：

> 一問寒熱二問汗，三問頭身四問便，五問飲食六問胸，七聾八渴俱當辨，九因脈色察陰陽，十從氣味章神見。
> ——《景岳全書·卷之一·傳忠錄·十問篇（九）》（外源·笈成·景岳全書 卷之一·傳忠錄·十問篇（九））

**关键结论要改一个直觉**：景岳原书十問篇的正文也只写到「八問渴」，第九（脉色察阴阳）、第十（气味章神）
只有歌诀一句、没有单独问答段。所以教材 8 节与景岳 8 个问答段**一一对应**，
教材不是「漏抄两节」，而是两书都只在歌诀里点名了最后两问。

| 十问 | 教材有无专节 | 景岳有无专段 |
|---|---|---|
| 一 寒热 · 二 汗 · 三 头身 · 四 便 · 五 饮食 · 六 胸 · 七 聋 · 八 渴 | 有（4.2.1–4.2.8） | 有 |
| 九 脉色察阴阳 · 十 气味章神 | 无 | 无（仅歌诀） |
""",
    '06-qiezhen-maixiang': """
## 七、教材缺口与补录：标题漏了「缓」

教材 5.1.2 两个段标题拼出 **27 个脉名**，正文实际出现 **28 个**——只出现在正文、没进标题的正是 **「缓」**。

外源补录：《脈經》卷一「脈形狀指下秘決第一（**二十四種**）」逐名有定形描述，其中

> 緩脈，去來亦遲，小快於遲。（一曰浮大而軟，陰浮與陽同等）
> ——《脈經·卷一·脈形狀指下秘決第一（二十四種）》第20条（外源·笈成·脈經 卷一·脈形狀指下秘決第一（二十四種）第20条）

《脈經》二十四種与教材 28 名的对照：**23 名同名**（其中「軟」即教材的「濡」），
教材多出 **长、短、疾、牢** 四名，故 24 + 4 = 28。

| 项 | 数 |
|---|--:|
| 教材标题拼出 | 27 |
| 教材正文出现 | 28 |
| 《脈經》二十四種 | 24 |
| 两者同名 | 23（软≡濡） |
| 教材独有 | 长、短、疾、牢 |

**不许做的事**：不得拿《脈經》二十四種去替换教材的 28 脉体系——两者是不同的分类传统，
本层只补「缓脉有经典定形描述」这一条，不改脉名总数。
""",
    '12-zhenduan-wucha': """
## 六、教材缺口：误差率——本仓库拒补

教材第 14 章写了敏感度、特异度、正确率、准确率**四个名称**，但**一个数值都没有**：
全书正文里百分号出现 **0 次**（实测）。也就是说，教材只给了「该看哪些指标」，没给「这些指标是多少」。

外源能补吗？**不能，本仓库明确拒补。**

- 误差率、一致性（kappa）这类数字属于**现代临床研究方法学**，古籍里不存在；
- 拿《素問》《脈經》去「补」误差率，是伪造证据；
- 若要用，只能另立「现代研究数据」层——须有可核验的论文出处、样本量、判读标准与金标准，不属于本仓库的外源层。

所以本章只列**误差来源结构**（四诊不全、假象、脉症从舍、AI 误判），不给任何概率。
这条边界写在 `standards/zhenduan/supplements/补源.json` 的 `z4-wucha-lu`（`refused: true`）。
""",
}

TEST = {
    '04-wenzhen-shengyin': """
test('补录：气味缺分级，外源五臭可查', () => {
  const g = supplements('z3-qiwei-wu-chou');
  assert.strictEqual(g.textbookSeen.count, 6, '教材气味六源');
  assert.strictEqual(g.textbookSeen.hasGrading, false, '教材没有分级');
  assert.deepStrictEqual(g.entries.map((e) => e.chou).sort(), ['臊', '焦', '香', '腥', '腐'].sort());
  assert.ok(g.citeAs.includes('外源·笈成·'), '引用格式');
});
""",
    '05-wenzhen-wenjuan': """
test('补录：十问歌十项、八问有正文', () => {
  const g = supplements('z2-shiwen-ba-jie');
  assert.ok(g.entries[0].text.includes('十從氣味章神見'), '歌诀应到第十问');
  assert.strictEqual(g.heads.length, 8, '景岳正文只到八问');
  assert.strictEqual(g.textbookSeen.count, 8, '教材也是 8 节');
});
""",
    '06-qiezhen-maixiang': """
test('补录：标题 27 / 正文 28 / 漏「缓」，《脈經》二十四種在册', () => {
  const g = supplements('z1-mai-ming-que-huan');
  assert.deepStrictEqual(g.textbookSeen.onlyInBody, ['缓']);
  assert.strictEqual(g.comparison.maijingCount, 24);
  assert.deepStrictEqual(g.comparison.onlyTextbook.sort(), ['长', '牢', '疾', '短'].sort());
  assert.ok(g.entries.find((e) => e.name === '緩脈').text.includes('去來亦遲'));
});
""",
    '12-zhenduan-wucha': """
test('补录：误差率拒补，理由与替代口径齐', () => {
  const g = supplements('z4-wucha-lu');
  assert.strictEqual(g.refused, true, '必须标为拒补');
  assert.ok(g.reason.includes('伪造'), '理由要写明为什么不许用古籍凑');
  assert.ok(g.alternative.includes('现代研究'), '要给替代口径');
  assert.strictEqual(g.entries, undefined, '拒补项不得列条目');
});
""",
}


def patch(name):
    doc = os.path.join(BASE, name, 'docs', 'zh.md')
    s = io.open(doc, encoding='utf-8').read()
    if '## 七、教材缺口与补录' in s or '## 六、教材缺口：误差率' in s:
        print('  %-22s docs 已补过' % name)
    else:
        # 插在免责之前
        i = s.find('## 免责')
        if i < 0:
            i = s.find('## 五、') if '## 五、' in s else len(s)
        s = s[:i] + DOC[name].lstrip('\n') + '\n' + s[i:]
        io.open(doc, 'w', encoding='utf-8').write(s)
        print('  %-22s docs +1 节' % name)

    t = os.path.join(BASE, name, 'code', 'main.test.js')
    ts = io.open(t, encoding='utf-8').read()
    if "supplements(" in ts:
        print('  %-22s test 已补过' % name)
        return
    ts = ts.rstrip('\n') + '\n' + TEST[name]
    io.open(t, 'w', encoding='utf-8').write(ts)
    print('  %-22s test +1 项' % name)


for n in DOC:
    patch(n)
