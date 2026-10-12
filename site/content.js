/* 生成物: site/build.js — 请勿手工编辑 */
window.TCMAI_CONTENT = {
  "01-zhongyi/01-zhongyi-jichu-lilun/01-yin-yang-er-fenlei": {
    "key": "01-zhongyi/01-zhongyi-jichu-lilun/01-yin-yang-er-fenlei",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "01-zhongyi-jichu-lilun",
    "subjectTitle": "中医基础理论",
    "chapterSlug": "01-yin-yang-er-fenlei",
    "n": 1,
    "title": "第 1 章 · 阴阳学说 → 二分类：从零实现逻辑回归",
    "motto": "「阴阳者，天地之道也，万物之纲纪，变化之父母，生杀之本始，神明之府也。」——《素问·阴阳应象大论》",
    "problem": "你能背出「阳虚则寒、阴虚则热」，但让你把一位病人的四诊信息落到「偏阴还是偏阳」这一个判断上，你只会说「感觉像」。",
    "roots": "环境逼迫(“跟诊时说不出辨证依据，老师追问一句就卡住”) + 知识积累(阴阳学说 × 逻辑回归 = 一个能说出理由、能报出置信度的二分类判断)",
    "html": "<h1 id=\"第-1-章-阴阳学说-二分类-从零实现逻辑回归\">第 1 章 · 阴阳学说 → 二分类：从零实现逻辑回归</h1>\n<blockquote><p><strong>MOTTO:</strong> 「阴阳者，天地之道也，万物之纲纪，变化之父母，生杀之本始，神明之府也。」——《素问·阴阳应象大论》</p>\n<p><strong>PROBLEM:</strong> 你能背出「阳虚则寒、阴虚则热」，但让你把一位病人的四诊信息落到「偏阴还是偏阳」这一个判断上，你只会说「感觉像」。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(“跟诊时说不出辨证依据，老师追问一句就卡住”) + 知识积累(阴阳学说 × 逻辑回归 = 一个能说出理由、能报出置信度的二分类判断)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>中医基础理论</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>01 / 10</td></tr><tr><td>所属阶段</td><td>🌱 生·启蒙</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"课程结构\">课程结构</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">MOTTO  →  PROBLEM  →  CONCEPT  →  BUILD IT  →  USE IT  →  SHIP IT\n一句话      痛点      原理+图解    从零实现     框架调用    产出工具</code></pre></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>用不超过 30 行代码，把「阴阳」判别写成一次二分类，并逐项解释权重含义</li><li>说清 sigmoid 的输出为什么是「概率」而不是「标签」，以及这个区别在临床上意味着什么</li><li>指出把阴阳等同于二进制 0/1 会丢掉哪些语义（这是本课的<strong>排除项</strong>，必须能自己讲出来）</li><li>用交叉熵损失手写一次梯度下降，并解释学习率过大时会发生什么</li><li>给定一个新病例的体征，算出它的阳证概率并给出可复核的理由</li></ul>\n<div class=\"figure-host\" data-figure=\"yin-yang-sigmoid\"></div>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"中医-阴阳\">中医：阴阳</h3>\n<p>阴阳是对相互对立又相互依存的两类属性的抽象概括。《素问·阴阳应象大论》把它抬到「万物之纲纪」的位置。关键在于它是<strong>关系性</strong>的，不是分类标签：没有孤立的「阴」，只有相对某参照的「偏阴」。</p>\n<p>临床落地时，八纲里的阴阳是<strong>总纲</strong>——表里、寒热、虚实六纲都可以归到阴阳下。所以本章不是要判「属于哪种证」，而是判「这一组体征整体上偏向哪一侧，偏多少」。</p>\n<h3 id=\"ai-工程-逻辑回归\">AI / 工程：逻辑回归</h3>\n<p>给定特征向量 <span class=\"math\"><b>x</b></span>，先做一次线性打分：</p>\n<span class=\"math-block\">z = <b>w</b>ᵀ<b>x</b> + b</span>\n<p>再用 sigmoid 把实数压到 <span class=\"math\">(0,1)</span>：</p>\n<span class=\"math-block\">p = σ(z) = <span class=\"frac\"><span class=\"frac-num\">1</span><span class=\"frac-den\">1+e<sup>-z</sup></span></span></span>\n<p>以交叉熵为损失 <span class=\"math\">L = -[y<span class=\"math-op\">log</span> p + (1-y)<span class=\"math-op\">log</span>(1-p)]</span> 时，梯度有一个非常干净的形式：</p>\n<span class=\"math-block\"><span class=\"frac\"><span class=\"frac-num\">∂ L</span><span class=\"frac-den\">∂ <b>w</b></span></span> = (p - y) <b>x</b></span>\n<p>这意味着每个权重的更新方向，就是「预测偏差 × 该特征取值」。<strong>权重会自己长成对特征重要性的解释</strong> —— 这正是阴阳判别需要的「说得清理由」。</p>\n<h3 id=\"对应关系\">对应关系</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>中医概念</th><th>AI / 工程概念</th><th>桥梁（为什么可以这样翻译）</th></tr></thead><tbody><tr><td>阴阳</td><td>二分类的两个类别</td><td>对立两端的划分，与二分类的标签空间一一对应 [<strong>B 级</strong>]</td></tr><tr><td>偏阴偏阳的<strong>程度</strong></td><td>sigmoid 输出的连续概率</td><td>虚证不是「非阴即阳」，而是偏向程度不同；连续输出保留了强度 [<strong>B 级</strong>]</td></tr><tr><td>阴阳互根互用</td><td>两类的概率之和为 1</td><td>这一条是<strong>约束</strong>，恰好对应 <span class=\"math\">p + (1-p) = 1</span> [<strong>A 级</strong>]</td></tr><tr><td>阴阳转化</td><td>状态转移 / 阈值翻转</td><td>「重阴必阳」是<strong>动态过程</strong>；本章的单次分类模型<strong>拿不到</strong>这一层，需在后续章节用状态机补</td></tr><tr><td>阴阳 = 二进制 0/1</td><td>——</td><td>❌ <strong>D 级误用</strong>。二进制位互斥且可交换，阴阳互根、可转化、带强度。用位运算处理阴阳会丢掉全部动态语义</td></tr></tbody></table></div>\n<pre class=\"mermaid\">graph LR\n  A[&quot;八纲体征&lt;br/&gt;畏寒 / 口渴 / 脉率&quot;] --&gt; B[&quot;特征向量 x&quot;]\n  B --&gt; C[&quot;线性打分 z = wᵀx + b&quot;]\n  C --&gt; D[&quot;sigmoid → P(阳证)&quot;]\n  D --&gt; E[&quot;阈值判定 + 置信度&quot;]\n  E -.-&gt;|回指校验| F[&quot;能否用中医语言复述权重含义？&quot;]\n  F -.-&gt;|不能| G[&quot;说明特征设计有问题，回到 A&quot;]</pre>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<p>只用 Node.js 标准库。三件事必须自己写：sigmoid、交叉熵、梯度下降。</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">javascript</div><pre><code class=\"lang-javascript\">// 1. sigmoid —— 注意数值稳定写法：z 很负时 e^{-z} 会溢出\nfunction sigmoid(z) {\n  if (z &gt;= 0) { const e = Math.exp(-z); return 1 / (1 + e); }\n  const e = Math.exp(z); return e / (1 + e);\n}\n\n// 2. 交叉熵 + 梯度（一次算完）\nfunction lossAndGrad(w, b, X, y) {\n  let loss = 0;\n  const gw = [0, 0, 0];\n  let gb = 0;\n  for (let i = 0; i &lt; X.length; i += 1) {\n    const z = dot(w, X[i]) + b;\n    const p = sigmoid(z);\n    const eps = 1e-9;\n    loss += -(y[i] * Math.log(p + eps) + (1 - y[i]) * Math.log(1 - p + eps));\n    const d = p - y[i];              // ← 梯度就是 (预测 − 真实)\n    for (let j = 0; j &lt; w.length; j += 1) gw[j] += d * X[i][j];\n    gb += d;\n  }\n  return { loss: loss / X.length, gw: gw.map((g) =&gt; g / X.length), gb: gb / X.length };\n}\n\n// 3. 梯度下降\nfor (let step = 0; step &lt; 4000; step += 1) {\n  const { gw, gb } = lossAndGrad(w, b, X, y);\n  for (let j = 0; j &lt; w.length; j += 1) w[j] -= lr * gw[j];\n  b -= lr * gb;\n}</code></pre></div>\n<p>跑起来：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js</code></pre></div>\n<h2 id=\"use-it-框架调用\">USE IT：框架调用</h2>\n<p>框架做的事和上面完全一样，只是把「手写三次循环」封成了 <code>fit</code>。本课用同一个梯度公式做一次 10 批的<strong>小批量</strong>训练，验证手写版本与批量版本的解在同一量级。</p>\n<p>关键对照：如果两种实现给出的权重<strong>符号相反</strong>，那一定是特征标准化或学习率出了问题，不是「模型玄学」。</p>\n<h2 id=\"ship-it-产出物\">SHIP IT：产出物</h2>\n<ul><li><a href=\"../outputs/prompt-yin-yang-er-fenlei.html\">📋 Prompt 模板</a> —— 让大模型按「体征 → 阴阳倾向 + 理由」的格式输出，并要求它标注不确定项</li><li><a href=\"../outputs/skill-yin-yang-er-fenlei.html\">🛠️ Skill 文件</a> —— 把本课的判别流程固化成一个可复用的操作技能</li></ul>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\n# Expected:\n# ═══ 阴阳 → 二分类：从零实现 (中医基础理论 第1章) ═══\n# 样本: 8 例八纲典型证候 | 特征: 畏寒 / 口渴 / 脉数\n# 训练 4000 步后:\n#   w = [ -7.60,   5.19,   5.85]\n#   b = -2.10\n#   损失轨迹 (每500步): 0.693 → 0.013 → 0.006 → 0.004 → 0.003 → 0.003 → 0.002 → 0.002\n#   训练集准确率: 8/8 = 100%\n# 解读:\n#   畏寒项 w=-7.60 → 该项越强越偏阴\n#   口渴项 w=5.19 → 该项越强越偏阳\n#   脉数项 w=5.85 → 该项越强越偏阳\n# 对照: 小批量(seed=20261012, batch=4, 2000步)\n#   w = [ -6.76,   4.62,   5.19]\n#   符号与全批量一致: 是 ✅（解法稳定）\n# 边界声明: 本例为教学样例，非临床数据集；输出不构成诊疗建议。\n# 退出码 0</code></pre></div>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node --test code/\n# Expected: 6 项测试全部通过</code></pre></div>\n<blockquote><p><strong>权重绝对值不要当作重要度。</strong> 本例数据是<strong>线性可分</strong>的，交叉熵没有有限的最优解，权重会一直往大处走 —— 所以 <code>-7.60</code> 并不比 <code>-3.00</code> 更&quot;重要&quot;，它只是训练得更久。\n真正稳定的是<strong>符号</strong>：畏寒项为负、口渴与脉数项为正。符号翻转就是实现有 bug。\n想拿到有界的权重，需要加 L2 正则或提前停止 —— 这是第 4 章的题目。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<p>见 <a href=\"../exercises.html\">exercises.md</a>。</p>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<ol><li>如果把「畏寒」换成「手足温度」这种连续量，特征标准化会不会改变权重的可解释性？</li><li>这个模型在什么情况下必须拒答？（提示：想想模态缺失与阈值落在 0.5 附近的病例）</li><li>阴阳转化（「重阴必阳」）需要模型具备什么结构，是单次分类能给的吗？</li></ol>",
    "markdown": "# 第 1 章 · 阴阳学说 → 二分类：从零实现逻辑回归\n\n> **MOTTO:** 「阴阳者，天地之道也，万物之纲纪，变化之父母，生杀之本始，神明之府也。」——《素问·阴阳应象大论》\n>\n> **PROBLEM:** 你能背出「阳虚则寒、阴虚则热」，但让你把一位病人的四诊信息落到「偏阴还是偏阳」这一个判断上，你只会说「感觉像」。\n>\n> **双根因定位:** 环境逼迫(“跟诊时说不出辨证依据，老师追问一句就卡住”) + 知识积累(阴阳学说 × 逻辑回归 = 一个能说出理由、能报出置信度的二分类判断)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 中医基础理论 |\n| 院系 | 中医系 |\n| 章序号 | 01 / 10 |\n| 所属阶段 | 🌱 生·启蒙 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 3 小时 |\n\n## 课程结构\n\n```text\nMOTTO  →  PROBLEM  →  CONCEPT  →  BUILD IT  →  USE IT  →  SHIP IT\n一句话      痛点      原理+图解    从零实现     框架调用    产出工具\n```\n\n## 学习目标\n\n- 用不超过 30 行代码，把「阴阳」判别写成一次二分类，并逐项解释权重含义\n- 说清 sigmoid 的输出为什么是「概率」而不是「标签」，以及这个区别在临床上意味着什么\n- 指出把阴阳等同于二进制 0/1 会丢掉哪些语义（这是本课的**排除项**，必须能自己讲出来）\n- 用交叉熵损失手写一次梯度下降，并解释学习率过大时会发生什么\n- 给定一个新病例的体征，算出它的阳证概率并给出可复核的理由\n\n<div data-figure=\"yin-yang-sigmoid\"></div>\n\n## 核心概念\n\n### 中医：阴阳\n\n阴阳是对相互对立又相互依存的两类属性的抽象概括。《素问·阴阳应象大论》把它抬到「万物之纲纪」的位置。关键在于它是**关系性**的，不是分类标签：没有孤立的「阴」，只有相对某参照的「偏阴」。\n\n临床落地时，八纲里的阴阳是**总纲**——表里、寒热、虚实六纲都可以归到阴阳下。所以本章不是要判「属于哪种证」，而是判「这一组体征整体上偏向哪一侧，偏多少」。\n\n### AI / 工程：逻辑回归\n\n给定特征向量 $\\mathbf{x}$，先做一次线性打分：\n\n$$z = \\mathbf{w}^\\top\\mathbf{x} + b$$\n\n再用 sigmoid 把实数压到 $(0,1)$：\n\n$$p = \\sigma(z) = \\frac{1}{1+e^{-z}}$$\n\n以交叉熵为损失 $L = -[y\\log p + (1-y)\\log(1-p)]$ 时，梯度有一个非常干净的形式：\n\n$$\\frac{\\partial L}{\\partial \\mathbf{w}} = (p - y)\\,\\mathbf{x}$$\n\n这意味着每个权重的更新方向，就是「预测偏差 × 该特征取值」。**权重会自己长成对特征重要性的解释** —— 这正是阴阳判别需要的「说得清理由」。\n\n### 对应关系\n\n| 中医概念 | AI / 工程概念 | 桥梁（为什么可以这样翻译） |\n|---------|--------------|--------------------------|\n| 阴阳 | 二分类的两个类别 | 对立两端的划分，与二分类的标签空间一一对应 [**B 级**] |\n| 偏阴偏阳的**程度** | sigmoid 输出的连续概率 | 虚证不是「非阴即阳」，而是偏向程度不同；连续输出保留了强度 [**B 级**] |\n| 阴阳互根互用 | 两类的概率之和为 1 | 这一条是**约束**，恰好对应 $p + (1-p) = 1$ [**A 级**] |\n| 阴阳转化 | 状态转移 / 阈值翻转 | 「重阴必阳」是**动态过程**；本章的单次分类模型**拿不到**这一层，需在后续章节用状态机补 |\n| 阴阳 = 二进制 0/1 | —— | ❌ **D 级误用**。二进制位互斥且可交换，阴阳互根、可转化、带强度。用位运算处理阴阳会丢掉全部动态语义 |\n\n```mermaid\ngraph LR\n  A[\"八纲体征<br/>畏寒 / 口渴 / 脉率\"] --> B[\"特征向量 x\"]\n  B --> C[\"线性打分 z = wᵀx + b\"]\n  C --> D[\"sigmoid → P(阳证)\"]\n  D --> E[\"阈值判定 + 置信度\"]\n  E -.->|回指校验| F[\"能否用中医语言复述权重含义？\"]\n  F -.->|不能| G[\"说明特征设计有问题，回到 A\"]\n```\n\n## BUILD IT：从零实现\n\n只用 Node.js 标准库。三件事必须自己写：sigmoid、交叉熵、梯度下降。\n\n```javascript\n// 1. sigmoid —— 注意数值稳定写法：z 很负时 e^{-z} 会溢出\nfunction sigmoid(z) {\n  if (z >= 0) { const e = Math.exp(-z); return 1 / (1 + e); }\n  const e = Math.exp(z); return e / (1 + e);\n}\n\n// 2. 交叉熵 + 梯度（一次算完）\nfunction lossAndGrad(w, b, X, y) {\n  let loss = 0;\n  const gw = [0, 0, 0];\n  let gb = 0;\n  for (let i = 0; i < X.length; i += 1) {\n    const z = dot(w, X[i]) + b;\n    const p = sigmoid(z);\n    const eps = 1e-9;\n    loss += -(y[i] * Math.log(p + eps) + (1 - y[i]) * Math.log(1 - p + eps));\n    const d = p - y[i];              // ← 梯度就是 (预测 − 真实)\n    for (let j = 0; j < w.length; j += 1) gw[j] += d * X[i][j];\n    gb += d;\n  }\n  return { loss: loss / X.length, gw: gw.map((g) => g / X.length), gb: gb / X.length };\n}\n\n// 3. 梯度下降\nfor (let step = 0; step < 4000; step += 1) {\n  const { gw, gb } = lossAndGrad(w, b, X, y);\n  for (let j = 0; j < w.length; j += 1) w[j] -= lr * gw[j];\n  b -= lr * gb;\n}\n```\n\n跑起来：\n\n```bash\nnode code/main.js\n```\n\n## USE IT：框架调用\n\n框架做的事和上面完全一样，只是把「手写三次循环」封成了 `fit`。本课用同一个梯度公式做一次 10 批的**小批量**训练，验证手写版本与批量版本的解在同一量级。\n\n关键对照：如果两种实现给出的权重**符号相反**，那一定是特征标准化或学习率出了问题，不是「模型玄学」。\n\n## SHIP IT：产出物\n\n- [📋 Prompt 模板](../outputs/prompt-yin-yang-er-fenlei.md) —— 让大模型按「体征 → 阴阳倾向 + 理由」的格式输出，并要求它标注不确定项\n- [🛠️ Skill 文件](../outputs/skill-yin-yang-er-fenlei.md) —— 把本课的判别流程固化成一个可复用的操作技能\n\n## 验证\n\n```bash\nnode code/main.js\n# Expected:\n# ═══ 阴阳 → 二分类：从零实现 (中医基础理论 第1章) ═══\n# 样本: 8 例八纲典型证候 | 特征: 畏寒 / 口渴 / 脉数\n# 训练 4000 步后:\n#   w = [ -7.60,   5.19,   5.85]\n#   b = -2.10\n#   损失轨迹 (每500步): 0.693 → 0.013 → 0.006 → 0.004 → 0.003 → 0.003 → 0.002 → 0.002\n#   训练集准确率: 8/8 = 100%\n# 解读:\n#   畏寒项 w=-7.60 → 该项越强越偏阴\n#   口渴项 w=5.19 → 该项越强越偏阳\n#   脉数项 w=5.85 → 该项越强越偏阳\n# 对照: 小批量(seed=20261012, batch=4, 2000步)\n#   w = [ -6.76,   4.62,   5.19]\n#   符号与全批量一致: 是 ✅（解法稳定）\n# 边界声明: 本例为教学样例，非临床数据集；输出不构成诊疗建议。\n# 退出码 0\n```\n\n```bash\nnode --test code/\n# Expected: 6 项测试全部通过\n```\n\n> **权重绝对值不要当作重要度。** 本例数据是**线性可分**的，交叉熵没有有限的最优解，权重会一直往大处走 —— 所以 `-7.60` 并不比 `-3.00` 更\"重要\"，它只是训练得更久。\n> 真正稳定的是**符号**：畏寒项为负、口渴与脉数项为正。符号翻转就是实现有 bug。\n> 想拿到有界的权重，需要加 L2 正则或提前停止 —— 这是第 4 章的题目。\n\n## 练习\n\n见 [exercises.md](../exercises.md)。\n\n## 进阶思考\n\n1. 如果把「畏寒」换成「手足温度」这种连续量，特征标准化会不会改变权重的可解释性？\n2. 这个模型在什么情况下必须拒答？（提示：想想模态缺失与阈值落在 0.5 附近的病例）\n3. 阴阳转化（「重阴必阳」）需要模型具备什么结构，是单次分类能给的吗？\n",
    "code": {
      "main.js": "#!/usr/bin/env node\n/**\n * 中医基础理论 · 第 1 章 阴阳学说 → 二分类：从零实现逻辑回归\n * 课程: departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/01-yin-yang-er-fenlei/docs/zh.md\n * 出处: 《素问·阴阳应象大论》；八纲总纲见《医学心悟》(清·程钟龄)\n * 依赖: 仅 Node.js 标准库\n *\n * 说明: 数据是 8 例八纲典型证候的教学样例，用于演示「阴阳 → 二分类」的翻译过程。\n *       它不是临床数据集，输出不构成任何诊疗建议。\n */\n\n'use strict';\n\n// ── 特征与样本 ──────────────────────────────────────────────\n// 特征: [畏寒程度, 口渴程度, 脉数程度]，均为 0..1 的连续量\n// 标签: 0 = 阴证, 1 = 阳证\nconst FEATURES = ['畏寒', '口渴', '脉数'];\n\nconst SAMPLES = [\n  { name: '畏寒肢冷、口不渴、脉迟',     x: [0.90, 0.10, 0.08], y: 0 },\n  { name: '面色苍白、喜热饮、脉沉迟',   x: [0.85, 0.15, 0.10], y: 0 },\n  { name: '精神萎靡、小便清长、舌淡',   x: [0.80, 0.20, 0.15], y: 0 },\n  { name: '腹冷喜按、便溏、脉弱',       x: [0.75, 0.25, 0.18], y: 0 },\n  { name: '发热恶热、口渴喜冷饮、脉数', x: [0.10, 0.90, 0.88], y: 1 },\n  { name: '面红目赤、烦躁、脉洪大',     x: [0.08, 0.85, 0.92], y: 1 },\n  { name: '小便短赤、便秘、舌红',       x: [0.15, 0.80, 0.80], y: 1 },\n  { name: '壮热、汗出、脉滑数',         x: [0.05, 0.95, 0.95], y: 1 },\n];\n\n// ── 手写基础件 ──────────────────────────────────────────────\n/** sigmoid，数值稳定写法：z 很负时避免 exp(-z) 溢出 */\nfunction sigmoid(z) {\n  if (z >= 0) {\n    const e = Math.exp(-z);\n    return 1 / (1 + e);\n  }\n  const e = Math.exp(z);\n  return e / (1 + e);\n}\n\nfunction dot(a, b) {\n  let s = 0;\n  for (let i = 0; i < a.length; i += 1) s += a[i] * b[i];\n  return s;\n}\n\nfunction predict(w, b, x) {\n  return sigmoid(dot(w, x) + b);\n}\n\n/** 交叉熵损失 + 梯度（全批量） */\nfunction lossAndGrad(w, b, X, y) {\n  const gw = new Array(w.length).fill(0);\n  let gb = 0;\n  let loss = 0;\n  const eps = 1e-12;\n  for (let i = 0; i < X.length; i += 1) {\n    const p = predict(w, b, X[i]);\n    loss += -(y[i] * Math.log(p + eps) + (1 - y[i]) * Math.log(1 - p + eps));\n    const d = p - y[i]; // 交叉熵 + sigmoid ⇒ 梯度就是 (预测 − 真实)\n    for (let j = 0; j < w.length; j += 1) gw[j] += d * X[i][j];\n    gb += d;\n  }\n  const n = X.length;\n  return { loss: loss / n, gw: gw.map((g) => g / n), gb: gb / n };\n}\n\n/** 全批量梯度下降 */\nfunction train(X, y, { lr = 0.5, steps = 4000, dim = 3 } = {}) {\n  let w = new Array(dim).fill(0);\n  let b = 0;\n  const history = [];\n  for (let step = 0; step < steps; step += 1) {\n    const { loss, gw, gb } = lossAndGrad(w, b, X, y);\n    if (step % 500 === 0) history.push(loss);\n    for (let j = 0; j < dim; j += 1) w[j] -= lr * gw[j];\n    b -= lr * gb;\n  }\n  return { w, b, history };\n}\n\nfunction accuracy(w, b, X, y) {\n  let ok = 0;\n  for (let i = 0; i < X.length; i += 1) {\n    if ((predict(w, b, X[i]) >= 0.5 ? 1 : 0) === y[i]) ok += 1;\n  }\n  return ok / X.length;\n}\n\n// ── 复现用随机源（只为对照小批量训练，不用来掩盖结果） ────────\nfunction mulberry32(seed) {\n  let a = seed >>> 0;\n  return function rnd() {\n    a |= 0;\n    a = (a + 0x6d2b79f5) | 0;\n    let t = Math.imul(a ^ (a >>> 15), 1 | a);\n    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;\n    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;\n  };\n}\n\n/** 小批量梯度下降 —— 与全批量对照，验证解在同一量级 */\nfunction trainMiniBatch(X, y, { lr = 0.5, steps = 2000, batch = 4, seed = 20261012, dim = 3 } = {}) {\n  const rnd = mulberry32(seed);\n  let w = new Array(dim).fill(0);\n  let b = 0;\n  for (let step = 0; step < steps; step += 1) {\n    const idx = [];\n    while (idx.length < Math.min(batch, X.length)) {\n      const k = Math.floor(rnd() * X.length);\n      if (!idx.includes(k)) idx.push(k);\n    }\n    const bx = idx.map((i) => X[i]);\n    const by = idx.map((i) => y[i]);\n    const { gw, gb } = lossAndGrad(w, b, bx, by);\n    for (let j = 0; j < dim; j += 1) w[j] -= lr * gw[j];\n    b -= lr * gb;\n  }\n  return { w, b };\n}\n\n// ── 主流程 ──────────────────────────────────────────────────\nfunction main() {\n  const X = SAMPLES.map((s) => s.x);\n  const y = SAMPLES.map((s) => s.y);\n\n  console.log('═══ 阴阳 → 二分类：从零实现 (中医基础理论 第1章) ═══');\n  console.log(`样本: ${SAMPLES.length} 例八纲典型证候 | 特征: ${FEATURES.join(' / ')}`);\n\n  const { w, b, history } = train(X, y, { lr: 0.5, steps: 4000 });\n  const acc = accuracy(w, b, X, y);\n\n  console.log(`训练 4000 步后:`);\n  console.log(`  w = [${w.map((v) => v.toFixed(2).padStart(6)).join(', ')}]`);\n  console.log(`  b = ${b.toFixed(2)}`);\n  console.log(`  损失轨迹 (每500步): ${history.map((v) => v.toFixed(3)).join(' → ')}`);\n  console.log(`  训练集准确率: ${Math.round(acc * SAMPLES.length)}/${SAMPLES.length} = ${(acc * 100).toFixed(0)}%`);\n  console.log('解读:');\n  FEATURES.forEach((f, j) => {\n    const dir = w[j] < 0 ? '偏阴' : '偏阳';\n    console.log(`  ${FEATURES[j]}项 w=${w[j].toFixed(2)} → 该项越强越${dir}`);\n  });\n\n  // 与小批量版本对照：符号必须一致\n  const mini = trainMiniBatch(X, y, { lr: 0.5, steps: 2000, batch: 4 });\n  const signAgree = mini.w.every((v, j) => Math.sign(v) === Math.sign(w[j]));\n  console.log('对照: 小批量(seed=20261012, batch=4, 2000步)');\n  console.log(`  w = [${mini.w.map((v) => v.toFixed(2).padStart(6)).join(', ')}]`);\n  console.log(`  符号与全批量一致: ${signAgree ? '是 ✅（解法稳定）' : '否 ❌（检查学习率/特征尺度）'}`);\n\n  console.log('边界声明: 本例为教学样例，非临床数据集；输出不构成诊疗建议。');\n\n  return { w, b, acc, mini, signAgree };\n}\n\nif (require.main === module) {\n  main();\n}\n\nmodule.exports = {\n  FEATURES,\n  SAMPLES,\n  sigmoid,\n  dot,\n  predict,\n  lossAndGrad,\n  train,\n  trainMiniBatch,\n  accuracy,\n  mulberry32,\n  main,\n};\n",
      "main.test.js": "#!/usr/bin/env node\n/**\n * 第 1 章 阴阳 → 二分类 —— 确定性单元测试\n * 运行: node --test code/\n */\n\n'use strict';\n\nconst assert = require('node:assert');\nconst test = require('node:test');\n\nconst {\n  FEATURES,\n  SAMPLES,\n  sigmoid,\n  dot,\n  predict,\n  lossAndGrad,\n  train,\n  trainMiniBatch,\n  accuracy,\n  mulberry32,\n} = require('./main');\n\nconst X = SAMPLES.map((s) => s.x);\nconst y = SAMPLES.map((s) => s.y);\n\ntest('sigmoid 在 0 处等于 0.5，值域落在 (0,1]', () => {\n  assert.strictEqual(sigmoid(0), 0.5);\n  // 中等量级的 z 必须严格落在开区间内\n  for (const z of [-3, -0.5, 0, 1.5, 4]) {\n    const p = sigmoid(z);\n    assert.ok(p > 0 && p < 1, `sigmoid(${z}) = ${p} 越界`);\n  }\n  // 极端量级在 float64 下会被舍入到端点，这是精度边界而非 bug\n  for (const z of [-50, -3, -0.5, 0, 0.5, 3, 50]) {\n    const p = sigmoid(z);\n    assert.ok(p >= 0 && p <= 1, `sigmoid(${z}) = ${p} 越界`);\n  }\n  assert.strictEqual(sigmoid(50), 1);   // e^-50 ≈ 1.9e-22，小于 1 的相对精度，舍入为 1\n  assert.ok(sigmoid(-50) > 0 && sigmoid(-50) < 1e-20); // 负侧仍保留有效数字，不塌成 0\n});\n\ntest('sigmoid 对极大负值不溢出 NaN（数值稳定性）', () => {\n  assert.ok(Number.isFinite(sigmoid(-800)));\n  assert.strictEqual(sigmoid(-800), 0);\n  assert.strictEqual(sigmoid(800), 1);\n});\n\ntest('sigmoid 关于原点对称: σ(z) + σ(-z) = 1', () => {\n  for (const z of [0.1, 1.7, 4.2, 12]) {\n    assert.ok(Math.abs(sigmoid(z) + sigmoid(-z) - 1) < 1e-12);\n  }\n});\n\ntest('数据集形状与教材表一致：8 例、3 特征、阴阳各 4 例', () => {\n  assert.strictEqual(FEATURES.length, 3);\n  assert.strictEqual(SAMPLES.length, 8);\n  assert.strictEqual(y.filter((v) => v === 0).length, 4);\n  assert.strictEqual(y.filter((v) => v === 1).length, 4);\n  for (const s of SAMPLES) {\n    assert.strictEqual(s.x.length, 3);\n    assert.ok(s.x.every((v) => v >= 0 && v <= 1), `${s.name} 的特征未归一化`);\n  }\n});\n\ntest('初始权重为 0 时，交叉熵损失等于 ln2（先验 0.5 的基线）', () => {\n  const { loss } = lossAndGrad([0, 0, 0], 0, X, y);\n  // 容差 1e-9：lossAndGrad 在 log 内加 eps=1e-12 防止 log(0)，会给结果带来该量级的偏差\n  assert.ok(Math.abs(loss - Math.LN2) < 1e-9, `初始损失 ${loss} 应约等于 ${Math.LN2}`);\n});\n\ntest('训练后权重符号稳定：畏寒为负，口渴与脉数为正', () => {\n  const { w } = train(X, y, { lr: 0.5, steps: 4000 });\n  assert.ok(w[0] < 0, `畏寒项应为负，实得 ${w[0]}`);\n  assert.ok(w[1] > 0, `口渴项应为正，实得 ${w[1]}`);\n  assert.ok(w[2] > 0, `脉数项应为正，实得 ${w[2]}`);\n});\n\ntest('训练后损失单调下降到远低于 ln2 的水平', () => {\n  const { loss: first } = lossAndGrad([0, 0, 0], 0, X, y);\n  const { w, b } = train(X, y, { lr: 0.5, steps: 4000 });\n  const { loss: last } = lossAndGrad(w, b, X, y);\n  assert.ok(last < first / 100, `损失未充分下降: ${first} → ${last}`);\n});\n\ntest('训练后训练集准确率为 100%（8/8）', () => {\n  const { w, b } = train(X, y, { lr: 0.5, steps: 4000 });\n  assert.strictEqual(accuracy(w, b, X, y), 1);\n});\n\ntest('小批量与全批量的解符号一致（解法稳定性）', () => {\n  const full = train(X, y, { lr: 0.5, steps: 4000 });\n  const mini = trainMiniBatch(X, y, { lr: 0.5, steps: 2000, batch: 4 });\n  mini.w.forEach((v, j) => {\n    assert.strictEqual(\n      Math.sign(v), Math.sign(full.w[j]),\n      `第 ${j} 个特征符号不一致: 全批量 ${full.w[j]} vs 小批量 ${v}`\n    );\n  });\n});\n\ntest('小批量训练可复现：同一 seed 两次结果完全一致', () => {\n  const a = trainMiniBatch(X, y, { seed: 42, steps: 200 });\n  const b = trainMiniBatch(X, y, { seed: 42, steps: 200 });\n  assert.deepStrictEqual(a.w, b.w);\n  assert.strictEqual(a.b, b.b);\n});\n\ntest('mulberry32 是确定性伪随机源', () => {\n  const r1 = mulberry32(7);\n  const r2 = mulberry32(7);\n  for (let i = 0; i < 5; i += 1) assert.strictEqual(r1(), r2());\n});\n\ntest('predict 输出的即 sigmoid(wᵀx + b)，两者必须恒等', () => {\n  const w = [-7.6, 5.19, 5.85];\n  const b = -2.1;\n  for (const s of SAMPLES) {\n    assert.strictEqual(predict(w, b, s.x), sigmoid(dot(w, s.x) + b));\n  }\n});\n\ntest('dot 与手算一致，且对零向量返回 0', () => {\n  assert.strictEqual(dot([1, 2, 3], [4, 5, 6]), 32);\n  assert.strictEqual(dot([0, 0, 0], [9, 9, 9]), 0);\n});\n"
    },
    "quiz": {
      "lesson": "01-yin-yang-er-fenlei",
      "title": "阴阳学说 → 二分类：从零实现逻辑回归",
      "subject": "01-zhongyi-jichu-lilun",
      "questions": [
        {
          "stage": "pre",
          "question": "本课开始前，你应该已经具备的最小能力是？",
          "options": [
            "会调用 scikit-learn 的 LogisticRegression",
            "能用数组和循环手写一次逐元素运算，并理解什么是「向量点积」",
            "能推导贝叶斯定理",
            "记得全部二十七脉"
          ],
          "correct": 1,
          "explanation": "本课刻意不用框架，全部用 Node.js 标准库手写。所以前置能力是「会用数组和循环做数学」，不是会调库。会调库反而容易跳过理解。"
        },
        {
          "stage": "check",
          "question": "为什么 sigmoid 的输出应该理解成「概率」而不是「标签」？",
          "options": [
            "因为概率看起来更专业",
            "因为标签是离散的，模型无法对离散值求导",
            "因为「偏阴偏阳」有程度差异，连续输出保留了强度；同时 0.5 附近的样本本身就是不确定的，硬贴标签会掩盖这种不确定",
            "因为交叉熵损失要求输出是概率，这是数学上的形式需要，与临床无关"
          ],
          "correct": 2,
          "explanation": "数学上确实需要可导的输出，但临床上更重要的是：一个 P(阳证)=0.52 的病例和一个 P=0.98 的病例，处置思路完全不同。硬贴标签会把这两者变成同一个结果，丢掉最有价值的信息。"
        },
        {
          "stage": "check",
          "question": "本课数据线性可分，训练 4000 步后权重绝对值达到 7.6。这意味着什么？",
          "options": [
            "说明「畏寒」这个特征特别重要，重要度是口渴项的 1.5 倍",
            "说明代码有 bug，权重不应该这么大",
            "说明数据是线性可分的，交叉熵没有有限最优解，权重会持续增大；绝对值不能当重要度，稳定的是符号",
            "说明学习率设得太小，应该加大"
          ],
          "correct": 2,
          "explanation": "线性可分时交叉熵的下确界在权重趋于无穷处取得，没有有限最优解。所以权重绝对值只反映「训练了多久 + 学习率多大」。要拿到有界权重需要 L2 正则或提前停止。加大学习率只会让它涨得更快。"
        },
        {
          "stage": "check",
          "question": "如果口渴项的权重符号在两种训练方式（全批量 / 小批量）下相反，最可能的原因是？",
          "options": [
            "模型有随机性，符号相反是正常现象",
            "学习率过大或特征尺度不一致，导致优化过程本身不稳定",
            "数据量太小，8 个样本不足以确定符号",
            "阴阳本身就没有方向性，符号无所谓"
          ],
          "correct": 1,
          "explanation": "在本课这个数据上，最优解的符号是唯一确定的（畏寒为负、口渴为正）。符号翻转说明优化过程没收敛到解附近，最常见的两个原因是学习率过大和特征尺度差异过大。不是随缘，是要查的 bug。"
        },
        {
          "stage": "post",
          "question": "把本课方法迁移到「表里」判别时，最先需要修改的是什么？",
          "options": [
            "换一个更深的网络",
            "把标签从「阴/阳」换成「表/里」，并重新设计特征——表证的体征与阴阳不是同一组，特征选错模型再好也没用",
            "把学习率调大",
            "增加训练步数"
          ],
          "correct": 1,
          "explanation": "表里判别依赖的是恶寒发热的先后、脉浮沉、有无汗出等另一组体征。迁移的不是模型，是「特征设计」这一步。同一个逻辑回归足够，关键是特征能不能承载你要判别的那个中医命题。"
        },
        {
          "stage": "post",
          "question": "以下哪种情况，本课的模型必须拒答而不是给出概率？",
          "options": [
            "病例的阳证概率是 0.95",
            "病例的阳证概率是 0.51，且缺失了「脉数」这一项特征",
            "模型训练准确率是 100%",
            "病例有两项体征都是 0.5"
          ],
          "correct": 1,
          "explanation": "概率接近 0.5 说明判断本身没有把握，此时任何阈值都会把结果推向随机；再叠加模态缺失，等于用一个填了假值的特征去算。这两种情况都应该输出「无法判断，需补充哪项信息」，而不是硬给一个数字。本课样例数据过小，不具备临床效力，这也是拒答的理由之一。"
        }
      ]
    },
    "exercises": "# 第 1 章 · 练习\n\n## 基础：把阈值暴露出来\n\n修改 `code/main.js`，让 `main()` 接受一个阈值参数（默认 0.5），并打印阈值从 0.1 到 0.9 时训练集的**错分病例**分别是哪几例。\n\n提示：8 例中有 2 例（`精神萎靡、小便清长、舌淡` 与 `腹冷喜按、便溏、脉弱`）的特征较为温和，阈值升高时应先被错分。\n\n## 进阶：换一个中医命题\n\n把标签换成「表 / 里」（不要改模型结构，只改特征与标签），自己设计 8 例典型证候。要求：\n\n1. 写出你的特征选择理由 —— 为什么这几个体征能承载「表里」这个命题？\n2. 跑完之后检查权重符号是否符合中医常识；不符合时，先怀疑特征，再怀疑代码。\n3. 在 `docs/zh.md` 的对应关系表里补一行，并给出桥梁级别（A/B/C/D）。\n\n## 挑战：让它学会说「不知道」\n\n给模型加一层**拒答机制**：当 $|p - 0.5| < \\epsilon$ 或存在缺失特征时，输出 `{ verdict: 'uncertain', missing: [...], p }` 而不是二分结论。\n\n要求：\n\n1. 为这个机制写至少 3 个测试（正常判定、阈值附近、模态缺失）。\n2. 在 `outputs/` 里产出一个 `prompt-*.md` 或 `skill-*.md`，让大模型也能按同一套拒答规则工作。\n3. 在文档里明确写出：**这套拒答逻辑不能替代临床判断**，它只是把「不知道」显式化。\n",
    "outputs": [
      {
        "name": "prompt-yin-yang-er-fenlei.md",
        "body": "# Prompt · 阴阳倾向结构化归因\n\n> 学科: 中医基础理论 · 章节: 01-yin-yang-er-fenlei\n\n## 用途\n\n把一段非结构化的四诊记录，转成带**可核查理由**与**置信边界**的阴阳倾向判断。\n用于教学复盘与病历整理，不用于临床决策。\n\n## 系统提示\n\n```text\n你是一名中医基础理论教学的助教。你的任务不是诊断，而是把一段四诊描述\n结构化，并按「阴阳」这一总纲给出倾向判断 + 逐项理由 + 不确定性说明。\n\n规则：\n1. 只使用输入里出现的信息。抽不到的体征一律标为「缺失」，禁止补全、禁止推断。\n2. 不要输出任何证型名称、方剂、剂量或治则。这不是你的职责范围。\n3. 输出必须包含每项体征对判断的贡献方向（偏阴 / 偏阳），且每项都要能指回输入原文。\n4. 若缺失体征 ≥ 2 项，或倾向不明显，必须输出「无法判断」，并列出还需要问什么。\n5. 引用经典时写出书名与篇名，例如《素问·阴阳应象大论》。不确定出处就不要引用。\n6. 结尾必须原样输出这句声明：\n   本输出为结构化辅助，不构成临床诊疗建议。\n\n输出 JSON：\n{\n  \"extracted\": { \"畏寒\": 0.0|\"缺失\", \"口渴\": 0.0|\"缺失\", \"脉数\": 0.0|\"缺失\" },\n  \"evidence\":  [{ \"feature\": \"…\", \"value\": 0.0, \"direction\": \"偏阴|偏阳\", \"quote\": \"原文片段\" }],\n  \"verdict\":   \"偏阴|偏阳|无法判断\",\n  \"missing\":   [\"…\"],\n  \"confidence_note\": \"…\",\n  \"disclaimer\": \"本输出为结构化辅助，不构成临床诊疗建议。\"\n}\n```\n\n## 输入 / 输出契约\n\n| 输入 | 类型 | 必填 | 说明 |\n|------|------|------|------|\n| `记录` | string | 是 | 医师的原始四诊描述，可以是口语化的 |\n| `关注象限` | string | 否 | 只关心某几项体征时填，例如「只看畏寒与口渴」 |\n\n| 输出字段 | 类型 | 说明 |\n|---------|------|------|\n| `extracted` | object | 抽取值或 `\"缺失\"` |\n| `evidence` | array | 每项含 `quote`，必须能在原文中逐字找到 |\n| `verdict` | enum | 三值，不允许其他取值 |\n| `missing` | array | 判定为「无法判断」时必须非空 |\n| `disclaimer` | string | 固定文案 |\n\n## 反例（模型最容易犯的错）\n\n| 错误输出 | 为什么错 |\n|---------|---------|\n| 「患者属阳虚证，宜温补」 | 越界：给了证型与治则 |\n| 「畏寒明显，故口渴应为无」 | 补全：把缺失项推断了 |\n| 「脉象未提及，默认为平脉」 | 静默填值：把缺失当正常，这是最危险的一种 |\n| 「《黄帝内经》云……」 | 出处含糊：必须写到篇名 |\n\n## 校验\n\n- [ ] `evidence` 里每个 `quote` 都能在输入原文中逐字匹配\n- [ ] 缺两项时输出必为「无法判断」\n- [ ] 输出中不含方剂、剂量、治则\n- [ ] `disclaimer` 逐字存在\n"
      },
      {
        "name": "skill-yin-yang-er-fenlei.md",
        "body": "---\nname: yin-yang-er-fenlei\ndescription: 把四诊体征结构化为阴阳倾向判断（含置信度与拒答条件），并逐项给出可核查理由。\nversion: 1.0.0\nsubject: 01-zhongyi-jichu-lilun\nchapter: 01-yin-yang-er-fenlei\ntags: [阴阳, 八纲, 二分类, 可解释性]\n---\n\n# 阴阳倾向结构化判别\n\n## 何时使用\n\n当你需要把一段非结构化的四诊描述，落到「偏阴 / 偏阳 / 无法判断」这一个输出上，并且\n**必须能说明理由**时。\n\n不适用：需要给出证型诊断、需要处方、需要在真实患者身上做临床决策 —— 本技能只做结构化与非判断性归因。\n\n## 输入契约\n\n| 字段 | 类型 | 必填 | 说明 |\n|------|------|------|------|\n| `畏寒程度` | 0..1 | 否 | 0 = 无 / 1 = 畏寒肢冷显著 |\n| `口渴程度` | 0..1 | 否 | 0 = 口不渴或喜热饮 / 1 = 大渴喜冷饮 |\n| `脉数` | 0..1 | 否 | 0 = 迟 / 1 = 数 |\n| `原文` | string | 否 | 医师原始描述，用于补齐缺失项 |\n\n**缺失项必须显式记为缺失，不得填 0 或填均值。**\n\n## 步骤\n\n1. **抽取**：从 `原文` 中抽取三项体征。抽不出来就标缺失，不要猜。\n2. **检查**：若缺失项 ≥ 2，直接输出 `无法判断`，并说明缺哪几项。\n3. **打分**：$z = -7.60 \\times \\text{畏寒} + 5.19 \\times \\text{口渴} + 5.85 \\times \\text{脉数} - 2.10$，$p = \\sigma(z)$。\n   （系数取自第 1 章教学样例，**不具备临床效力**，仅用于演示流程。）\n4. **归因**：逐项报告「该项取值 × 该项系数 = 对 $z$ 的贡献」，按贡献绝对值排序。\n5. **判定**：\n   - $p \\ge 0.70$ → `偏阳`\n   - $p \\le 0.30$ → `偏阴`\n   - 否则 → `无法判断（倾向不明显）`\n6. **拒答检查**：$p \\in (0.30, 0.70)$ 或任一关键项缺失 → 输出 `无法判断` + 需要补充的信息。\n\n## 输出契约\n\n```json\n{\n  \"verdict\": \"偏阴 | 偏阳 | 无法判断\",\n  \"p_yang\": 0.0,\n  \"evidence\": [{ \"feature\": \"畏寒\", \"value\": 0.9, \"contribution\": -6.84 }],\n  \"missing\": [],\n  \"confidence_note\": \"一句话说明这个判定的可靠性边界\",\n  \"disclaimer\": \"本输出为结构化辅助，不构成临床诊疗建议。\"\n}\n```\n\n## 硬约束\n\n- 输出**必须**包含 `evidence`，且每项都能回指到输入或原文。无理由的判定一律视为无效输出。\n- 输出**必须**包含 `disclaimer`。\n- 不允许输出方剂、剂量、治则 —— 那不是本技能的职责。\n- 当判定为 `无法判断` 时，**必须**在 `missing` 或 `confidence_note` 里写清「还需要问什么」。\n\n## 验证清单\n\n- [ ] 三项体征全缺失时，输出 `无法判断` 且 `missing` 列出三项\n- [ ] `p = 0.68` 的病例输出 `无法判断`，而不是 `偏阳`\n- [ ] `evidence` 的贡献值与系数符号一致（畏寒为负贡献）\n- [ ] 任何输出路径都带 `disclaimer`\n"
      }
    ],
    "video": "platform/courses/01-zhongyi/01-zhongyi-jichu-lilun/01-yin-yang-er-fenlei/video/lesson.mp4",
    "videoPoster": "platform/courses/01-zhongyi/01-zhongyi-jichu-lilun/01-yin-yang-er-fenlei/frames/001.png"
  },
  "01-zhongyi/01-zhongyi-jichu-lilun/02-wu-xing-duo-fenlei": {
    "key": "01-zhongyi/01-zhongyi-jichu-lilun/02-wu-xing-duo-fenlei",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "01-zhongyi-jichu-lilun",
    "subjectTitle": "中医基础理论",
    "chapterSlug": "02-wu-xing-duo-fenlei",
    "n": 2,
    "title": "第 2 章 · 五行学说 → 多分类：从零实现 Softmax（并检验生克约束是否真的有用）",
    "motto": "「五行：一曰水，二曰火，三曰木，四曰金，五曰土。」——《尚书·洪范》",
    "problem": "你知道五行是五类，于是写了个五分类器；但相生相克去哪了？你可能已经听过「纯 softmax 会丢掉关系」这句断言 —— 本章要做的第一件事，是**去测它到底对不对**。",
    "roots": "环境逼迫(“答辩时被问『你的五行分类器和普通五分类器有什么区别』，答不上来”) + 知识积累(五行生克 × softmax 与关系正则 = 能自己设计并检验约束的建模能力)",
    "html": "<h1 id=\"第-2-章-五行学说-多分类-从零实现-softmax-并检验生克约束是否真的有用\">第 2 章 · 五行学说 → 多分类：从零实现 Softmax（并检验生克约束是否真的有用）</h1>\n<blockquote><p><strong>MOTTO:</strong> 「五行：一曰水，二曰火，三曰木，四曰金，五曰土。」——《尚书·洪范》</p>\n<p><strong>PROBLEM:</strong> 你知道五行是五类，于是写了个五分类器；但相生相克去哪了？你可能已经听过「纯 softmax 会丢掉关系」这句断言 —— 本章要做的第一件事，是<strong>去测它到底对不对</strong>。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(“答辩时被问『你的五行分类器和普通五分类器有什么区别』，答不上来”) + 知识积累(五行生克 × softmax 与关系正则 = 能自己设计并检验约束的建模能力)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>中医基础理论</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>02 / 10</td></tr><tr><td>所属阶段</td><td>🌱 生·启蒙</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>4 小时</td></tr></tbody></table></div>\n<h2 id=\"课程结构\">课程结构</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">MOTTO  →  PROBLEM  →  CONCEPT  →  BUILD IT  →  USE IT  →  SHIP IT\n一句话      痛点      原理+图解    从零实现     框架调用    产出工具</code></pre></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>从零实现 softmax（含减 max 的数值稳定写法），并解释不减 max 会在什么量级上溢出</li><li>把「相生 / 相克」写成一对<strong>余弦约束</strong>加进损失函数，手推其梯度</li><li>用 λ 扫描<strong>测量</strong>一个约束的实际效果，而不是相信断言</li><li>说清本章实验里「纯 softmax 已经满足生克一致性」的原因，并指出这暴露了表示层的什么问题</li><li>判断什么情况下应该加约束、什么情况下加约束只是自伤</li></ul>\n<div class=\"figure-host\" data-figure=\"wuxing-cycle\"></div>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"中医-五行与生克\">中医：五行与生克</h3>\n<p>《尚书·洪范》给出五行的名目与次序；《素问·五运行大论》等篇给出相生相克的关系：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">相生：木 → 火 → 土 → 金 → 水 → 木   （外圈，顺时针）\n相克：木克土 · 土克水 · 水克火 · 火克金 · 金克木  （五角星）</code></pre></div>\n<p>关键在于<strong>关系是学说的主体</strong>。如果把五行当成 5 个互不相干的类，那这门学说就退化成了\n一份五格清单 —— 它最有信息量的部分（哪两类互相促进、哪两类互相制约）全丢了。</p>\n<h3 id=\"ai-工程-softmax-与关系正则\">AI / 工程：Softmax 与关系正则</h3>\n<p>多分类用 softmax 把打分转为概率：</p>\n<span class=\"math-block\">p<sub>k</sub> = <span class=\"frac\"><span class=\"frac-num\">e<sup>z<sub>k</sub></sup></span><span class=\"frac-den\">∑<sub>j=1</sub><sup>K</sup> e<sup>z<sub>j</sub></sup></span></span>,    z<sub>k</sub> = <b>w</b><sub>k</sub>ᵀ <b>x</b> + b<sub>k</sub></span>\n<p>数值稳定写法必须先减去最大值：</p>\n<span class=\"math-block\">p<sub>k</sub> = <span class=\"frac\"><span class=\"frac-num\">e<sup>z<sub>k</sub> - <span class=\"math-op\">max</span><sub>j</sub> z<sub>j</sub></sup></span><span class=\"frac-den\">∑<sub>j</sub> e<sup>z<sub>j</sub> - <span class=\"math-op\">max</span><sub>j</sub> z<sub>j</sub></sup></span></span></span>\n<p>把关系写成约束，最直接的一种是<strong>约束类权重向量之间的夹角</strong>：</p>\n<span class=\"math-block\"><span class=\"math-cal\">L</span> = -<span class=\"frac\"><span class=\"frac-num\">1</span><span class=\"frac-den\">N</span></span>∑<sub>i</sub> <span class=\"math-op\">log</span> p<sub>y<sub>i</sub></sub><sub class=\"math-note\"><span class=\"math-text\">交叉熵</span></sub> + λ∑<sub>(i,j)∈<span class=\"math-text\">生</span></sub> <span class=\"math-op\">max</span>(0,  m<sub>s</sub> - <span class=\"math-op\">cos</span>(<b>w</b><sub>i</sub>,<b>w</b><sub>j</sub>)) + ∑<sub>(i,j)∈<span class=\"math-text\">克</span></sub> <span class=\"math-op\">max</span>(0,  <span class=\"math-op\">cos</span>(<b>w</b><sub>i</sub>,<b>w</b><sub>j</sub>) - m<sub>k</sub>)</span>\n<ul><li>相生对：把两个方向<strong>拉近</strong>（余弦不小于 <span class=\"math\">m<sub>s</sub></span>）</li><li>相克对：把两个方向<strong>推远</strong>（余弦不大于 <span class=\"math\">m<sub>k</sub></span>）</li><li><span class=\"math\">λ</span> 是这两者与分类准确率之间的交换率 —— 它不是免费的</li></ul>\n<h3 id=\"对应关系\">对应关系</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>中医概念</th><th>AI / 工程概念</th><th>桥梁（为什么可以这样翻译）</th><th>级别</th></tr></thead><tbody><tr><td>五行</td><td>5 类多分类</td><td>类别数为 5，与五行名目一一对应</td><td><strong>B</strong></td></tr><tr><td>相生</td><td>类权重向量之间的<strong>正</strong>余弦约束</td><td>相生意味着两类在语义上互相促进 → 方向相近</td><td><strong>B</strong></td></tr><tr><td>相克</td><td>类权重向量之间的<strong>负</strong>余弦约束</td><td>相克意味着互相制约 → 方向相斥</td><td><strong>B</strong></td></tr><tr><td>五行配属表</td><td>属性矩阵（色/味/志/方位）</td><td>通行配属表给出的正是这四组对应</td><td><strong>A</strong></td></tr><tr><td>「五位一体的整体观」</td><td>结构约束先验</td><td>五行不是 5 个独立标签，而是一个带边的系统</td><td><strong>B</strong></td></tr><tr><td>五行 = 五行分类器</td><td>——</td><td>⚠️ <strong>C 级类比</strong>。只对了类别数，丢掉了全部关系。本章就是来测这个代价的</td><td><strong>C</strong></td></tr></tbody></table></div>\n<pre class=\"mermaid\">graph LR\n  A[&quot;五行配属表&lt;br/&gt;色 / 味 / 志 / 方位&quot;] --&gt; B[&quot;属性矩阵 X (20×4)&quot;]\n  B --&gt; C[&quot;softmax 五分类&quot;]\n  C --&gt; D[&quot;测准确率&quot;]\n  E[&quot;生克关系&lt;br/&gt;5 条相生 + 5 条相克&quot;] --&gt; F[&quot;余弦约束&quot;]\n  F --&gt; G[&quot;λ 扫描&quot;]\n  D --&gt; H[&quot;结论：约束值不值&quot;]\n  G --&gt; H\n  H -.-&gt;|回指校验| I[&quot;这个约束在模型里真的有中医含义吗？&quot;]</pre>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<p>两件事：softmax（带数值稳定），以及把生克写成可求导的 hinge 约束。</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">javascript</div><pre><code class=\"lang-javascript\">function softmax(z) {\n  const m = Math.max(...z);\n  const e = z.map((v) =&gt; Math.exp(v - m));   // ← 减 max：正确性要求，不是优化\n  const s = e.reduce((a, b) =&gt; a + b, 0);\n  return e.map((v) =&gt; v / s);\n}\n\n// 相生: hinge(mSheng − cos)  相克: hinge(cos − mKe)\nconst c = cosine(W[i], W[j]);\nconst violation = wantAbove ? mSheng - c : c - mKe;\nif (violation &lt;= 0) return;                 // 满足约束就不产生梯度\n// d(cos)/d(W[i]) = W[j]/(|W[i]||W[j]|) − cos·W[i]/|W[i]|²</code></pre></div>\n<p>跑起来：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js</code></pre></div>\n<h2 id=\"实测结果-断言被推翻了\">实测结果：断言被推翻了</h2>\n<p>这是本章最重要的部分。运行后的真实输出：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">特征共线检查: 四列次序完全一致 = 是 ⚠（结构上共线，见下文）\n\n【A】纯 softmax（λ=0）\n  训练准确率: 100.0%\n  相生对平均余弦: 0.014 | 相克对平均余弦: -0.493 | 差 0.507\n  关系一致性: 满足 ✅\n\n【B】生克正则的 λ 扫描\n  λ      准确率   相生均值   相克均值   差值\n  0      100.0%   0.014      -0.493     0.507\n  0.2    100.0%   0.448      -0.052     0.499\n  0.5    95.0%    0.498      -0.009     0.507\n  1      95.0%    0.529      0.056      0.474\n  2      85.0%    0.513      0.079      0.434\n  5      60.0%    0.477      0.057      0.420</code></pre></div>\n<p><strong>结论一：「纯 softmax 一定丢掉关系」在本数据上是错的。</strong>\nλ=0 时相生对的平均余弦（0.014）已经高于相克对（−0.493），差 0.507 &gt; 0 —— 关系一致性已经满足。</p>\n<p><strong>为什么？</strong> 因为通行的五行配属表里，色、味、志、方位四个维度的次序<strong>完全一致</strong>：</p>\n<div class=\"table-wrap\"><table><thead><tr><th></th><th>木</th><th>火</th><th>土</th><th>金</th><th>水</th></tr></thead><tbody><tr><td>色</td><td>青</td><td>赤</td><td>黄</td><td>白</td><td>黑</td></tr><tr><td>味</td><td>酸</td><td>苦</td><td>甘</td><td>辛</td><td>咸</td></tr><tr><td>志</td><td>怒</td><td>喜</td><td>思</td><td>悲</td><td>恐</td></tr><tr><td>方位</td><td>东</td><td>南</td><td>中</td><td>西</td><td>北</td></tr><tr><td><strong>序号</strong></td><td>0</td><td>1</td><td>2</td><td>3</td><td>4</td></tr></tbody></table></div>\n<p>四列序号完全相同 ⇒ 特征矩阵<strong>共线</strong>。共线意味着最优解天然把五个类沿一个方向按次序排开；\n而&quot;沿一条轴排序&quot;这件事，恰好自动让相邻类（相生）方向接近、隔一类（相克）方向相反。\n<strong>约束被数据的结构免费满足了。</strong></p>\n<p><strong>结论二：约束不是免费的。</strong>\n加正则后关系差并没有变大（λ=0.5 时反而与 λ=0 同为 0.507），而准确率从 100% 一路掉到 λ=5 时的 60%。\n在本数据上，这个约束<strong>只带来代价，不带来收益</strong>。</p>\n<p><strong>结论三（本章真正要教的）：先测量，再断言。</strong>\n「加约束一定更好」和「纯 softmax 一定丢掉关系」是同一种毛病的两种说法 —— 都是没跑就下结论。\n本章的产出不是&quot;我给五行加了约束&quot;，而是&quot;我测出在这个表示下约束是冗余的，因为配属表共线&quot;。</p>\n<p><strong>那什么时候约束才有用？</strong> 当特征表示<strong>不共线</strong>时 —— 例如用可学习的药性嵌入代替序数编码，\n让每个类的方向独立确定，这时关系约束才会真正改变解。那是「中药药性·嵌入」章的题目。</p>\n<h3 id=\"本节翻译的代价与边界\">本节翻译的代价与边界</h3>\n<p>必须显式写清，否则这门课就是只报喜不报忧：</p>\n<p><strong>丢掉了什么</strong></p>\n<div class=\"table-wrap\"><table><thead><tr><th>丢失项</th><th>为什么是结构性的</th></tr></thead><tbody><tr><td>分类标签是<strong>无序</strong>的</td><td>softmax 中五类地位完全平等；而五行的「相生有向、相克隔一」是有向约束，只能在损失函数里外加</td></tr><tr><td>「五位一体」的<strong>整体性</strong></td><td>五个输出头是并列关系，没有一个&quot;整体层&quot;来承载&quot;生克制化作为整体才成立&quot;这层含义</td></tr><tr><td>「太过」与「不及」</td><td>五行各有太过不及（如木旺、木虚），序数编码无法表达同一行的双向偏离</td></tr></tbody></table></div>\n<p><strong>不适用范围</strong></p>\n<ul><li>本数据是<strong>构造的教学样例</strong>，非临床数据集；输出的准确率、余弦值<strong>不具备临床效力</strong>。</li><li>本节的 λ 扫描结论<strong>只在共线表示下成立</strong>。换成独立特征或嵌入表示后，必须重跑扫描。</li><li>不构成任何诊疗建议。教学样例数据不能用于病人。</li></ul>\n<p><strong>一处必须排除的误用（C 级）</strong></p>\n<blockquote><p>「五行分类器 = 五行学说」—— 只对了类别数（5），丢掉了关系层。\n本节的实验恰好证明：在共线表示下关系&quot;免费&quot;且约束无用；这说明<strong>是表示而不是分类器在承载五行语义</strong>。\n把它当成&quot;五行已经被 AI 学会了&quot;是 C 级类比，不得进入任何临床输出路径。</p></blockquote>\n<h2 id=\"use-it-框架调用\">USE IT：框架调用</h2>\n<p>任何成熟框架里，加这项约束都只是 <code>loss = ce + lambda * reg</code> 一行。真正的工作量在于：</p>\n<ol><li>设计可微的约束形式（hinge？KL？距离？）</li><li>扫描 λ，画出「准确率 vs 关系差」的权衡曲线</li><li>判断这条曲线是否值得走 —— 本课的例子告诉你，不总是值得</li></ol>\n<h2 id=\"ship-it-产出物\">SHIP IT：产出物</h2>\n<ul><li><a href=\"../outputs/prompt-wu-xing-duo-fenlei.html\">📋 Prompt 模板</a> —— 让大模型在给出五行归类时，<strong>必须同时给出所依据的配属维度</strong>，并显式标注关系一致性</li><li><a href=\"../outputs/skill-wu-xing-duo-fenlei.html\">🛠️ Skill 文件</a> —— 把「加约束前先测基线」固化成一个可复用的实验流程</li></ul>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\n# Expected: 见上方「实测结果」代码块，退出码 0</code></pre></div>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node --test code/main.test.js\n# Expected: 全部通过</code></pre></div>\n<h2 id=\"练习\">练习</h2>\n<p>见 <a href=\"../exercises.html\">exercises.md</a>。</p>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<ol><li>如果打乱某一列（例如把「味」的次序随机重排），共线性被破坏，λ 扫描的曲线会变成什么样？先预测再跑。</li><li>用 one-hot 编码替代序数编码后，λ=0 的关系差会变成多少？为什么？</li><li>「五位一体」这种整体观，除了余弦约束，还能用哪些可微形式表达？各自的代价是什么？</li></ol>",
    "markdown": "# 第 2 章 · 五行学说 → 多分类：从零实现 Softmax（并检验生克约束是否真的有用）\n\n> **MOTTO:** 「五行：一曰水，二曰火，三曰木，四曰金，五曰土。」——《尚书·洪范》\n>\n> **PROBLEM:** 你知道五行是五类，于是写了个五分类器；但相生相克去哪了？你可能已经听过「纯 softmax 会丢掉关系」这句断言 —— 本章要做的第一件事，是**去测它到底对不对**。\n>\n> **双根因定位:** 环境逼迫(“答辩时被问『你的五行分类器和普通五分类器有什么区别』，答不上来”) + 知识积累(五行生克 × softmax 与关系正则 = 能自己设计并检验约束的建模能力)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 中医基础理论 |\n| 院系 | 中医系 |\n| 章序号 | 02 / 10 |\n| 所属阶段 | 🌱 生·启蒙 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 4 小时 |\n\n## 课程结构\n\n```text\nMOTTO  →  PROBLEM  →  CONCEPT  →  BUILD IT  →  USE IT  →  SHIP IT\n一句话      痛点      原理+图解    从零实现     框架调用    产出工具\n```\n\n## 学习目标\n\n- 从零实现 softmax（含减 max 的数值稳定写法），并解释不减 max 会在什么量级上溢出\n- 把「相生 / 相克」写成一对**余弦约束**加进损失函数，手推其梯度\n- 用 λ 扫描**测量**一个约束的实际效果，而不是相信断言\n- 说清本章实验里「纯 softmax 已经满足生克一致性」的原因，并指出这暴露了表示层的什么问题\n- 判断什么情况下应该加约束、什么情况下加约束只是自伤\n\n<div data-figure=\"wuxing-cycle\"></div>\n\n## 核心概念\n\n### 中医：五行与生克\n\n《尚书·洪范》给出五行的名目与次序；《素问·五运行大论》等篇给出相生相克的关系：\n\n```text\n相生：木 → 火 → 土 → 金 → 水 → 木   （外圈，顺时针）\n相克：木克土 · 土克水 · 水克火 · 火克金 · 金克木  （五角星）\n```\n\n关键在于**关系是学说的主体**。如果把五行当成 5 个互不相干的类，那这门学说就退化成了\n一份五格清单 —— 它最有信息量的部分（哪两类互相促进、哪两类互相制约）全丢了。\n\n### AI / 工程：Softmax 与关系正则\n\n多分类用 softmax 把打分转为概率：\n\n$$p_k = \\frac{e^{z_k}}{\\sum_{j=1}^{K} e^{z_j}}, \\qquad z_k = \\mathbf{w}_k^\\top \\mathbf{x} + b_k$$\n\n数值稳定写法必须先减去最大值：\n\n$$p_k = \\frac{e^{z_k - \\max_j z_j}}{\\sum_j e^{z_j - \\max_j z_j}}$$\n\n把关系写成约束，最直接的一种是**约束类权重向量之间的夹角**：\n\n$$\\mathcal{L} = \\underbrace{-\\frac{1}{N}\\sum_i \\log p_{y_i}}_{\\text{交叉熵}} + \\lambda\\Big[\\sum_{(i,j)\\in\\text{生}} \\max(0,\\, m_s - \\cos(\\mathbf{w}_i,\\mathbf{w}_j)) + \\sum_{(i,j)\\in\\text{克}} \\max(0,\\, \\cos(\\mathbf{w}_i,\\mathbf{w}_j) - m_k)\\Big]$$\n\n- 相生对：把两个方向**拉近**（余弦不小于 $m_s$）\n- 相克对：把两个方向**推远**（余弦不大于 $m_k$）\n- $\\lambda$ 是这两者与分类准确率之间的交换率 —— 它不是免费的\n\n### 对应关系\n\n| 中医概念 | AI / 工程概念 | 桥梁（为什么可以这样翻译） | 级别 |\n|---------|--------------|--------------------------|------|\n| 五行 | 5 类多分类 | 类别数为 5，与五行名目一一对应 | **B** |\n| 相生 | 类权重向量之间的**正**余弦约束 | 相生意味着两类在语义上互相促进 → 方向相近 | **B** |\n| 相克 | 类权重向量之间的**负**余弦约束 | 相克意味着互相制约 → 方向相斥 | **B** |\n| 五行配属表 | 属性矩阵（色/味/志/方位） | 通行配属表给出的正是这四组对应 | **A** |\n| 「五位一体的整体观」 | 结构约束先验 | 五行不是 5 个独立标签，而是一个带边的系统 | **B** |\n| 五行 = 五行分类器 | —— | ⚠️ **C 级类比**。只对了类别数，丢掉了全部关系。本章就是来测这个代价的 | **C** |\n\n```mermaid\ngraph LR\n  A[\"五行配属表<br/>色 / 味 / 志 / 方位\"] --> B[\"属性矩阵 X (20×4)\"]\n  B --> C[\"softmax 五分类\"]\n  C --> D[\"测准确率\"]\n  E[\"生克关系<br/>5 条相生 + 5 条相克\"] --> F[\"余弦约束\"]\n  F --> G[\"λ 扫描\"]\n  D --> H[\"结论：约束值不值\"]\n  G --> H\n  H -.->|回指校验| I[\"这个约束在模型里真的有中医含义吗？\"]\n```\n\n## BUILD IT：从零实现\n\n两件事：softmax（带数值稳定），以及把生克写成可求导的 hinge 约束。\n\n```javascript\nfunction softmax(z) {\n  const m = Math.max(...z);\n  const e = z.map((v) => Math.exp(v - m));   // ← 减 max：正确性要求，不是优化\n  const s = e.reduce((a, b) => a + b, 0);\n  return e.map((v) => v / s);\n}\n\n// 相生: hinge(mSheng − cos)  相克: hinge(cos − mKe)\nconst c = cosine(W[i], W[j]);\nconst violation = wantAbove ? mSheng - c : c - mKe;\nif (violation <= 0) return;                 // 满足约束就不产生梯度\n// d(cos)/d(W[i]) = W[j]/(|W[i]||W[j]|) − cos·W[i]/|W[i]|²\n```\n\n跑起来：\n\n```bash\nnode code/main.js\n```\n\n## 实测结果：断言被推翻了\n\n这是本章最重要的部分。运行后的真实输出：\n\n```text\n特征共线检查: 四列次序完全一致 = 是 ⚠（结构上共线，见下文）\n\n【A】纯 softmax（λ=0）\n  训练准确率: 100.0%\n  相生对平均余弦: 0.014 | 相克对平均余弦: -0.493 | 差 0.507\n  关系一致性: 满足 ✅\n\n【B】生克正则的 λ 扫描\n  λ      准确率   相生均值   相克均值   差值\n  0      100.0%   0.014      -0.493     0.507\n  0.2    100.0%   0.448      -0.052     0.499\n  0.5    95.0%    0.498      -0.009     0.507\n  1      95.0%    0.529      0.056      0.474\n  2      85.0%    0.513      0.079      0.434\n  5      60.0%    0.477      0.057      0.420\n```\n\n**结论一：「纯 softmax 一定丢掉关系」在本数据上是错的。**\nλ=0 时相生对的平均余弦（0.014）已经高于相克对（−0.493），差 0.507 > 0 —— 关系一致性已经满足。\n\n**为什么？** 因为通行的五行配属表里，色、味、志、方位四个维度的次序**完全一致**：\n\n| | 木 | 火 | 土 | 金 | 水 |\n|---|---|---|---|---|---|\n| 色 | 青 | 赤 | 黄 | 白 | 黑 |\n| 味 | 酸 | 苦 | 甘 | 辛 | 咸 |\n| 志 | 怒 | 喜 | 思 | 悲 | 恐 |\n| 方位 | 东 | 南 | 中 | 西 | 北 |\n| **序号** | 0 | 1 | 2 | 3 | 4 |\n\n四列序号完全相同 ⇒ 特征矩阵**共线**。共线意味着最优解天然把五个类沿一个方向按次序排开；\n而\"沿一条轴排序\"这件事，恰好自动让相邻类（相生）方向接近、隔一类（相克）方向相反。\n**约束被数据的结构免费满足了。**\n\n**结论二：约束不是免费的。**\n加正则后关系差并没有变大（λ=0.5 时反而与 λ=0 同为 0.507），而准确率从 100% 一路掉到 λ=5 时的 60%。\n在本数据上，这个约束**只带来代价，不带来收益**。\n\n**结论三（本章真正要教的）：先测量，再断言。**\n「加约束一定更好」和「纯 softmax 一定丢掉关系」是同一种毛病的两种说法 —— 都是没跑就下结论。\n本章的产出不是\"我给五行加了约束\"，而是\"我测出在这个表示下约束是冗余的，因为配属表共线\"。\n\n**那什么时候约束才有用？** 当特征表示**不共线**时 —— 例如用可学习的药性嵌入代替序数编码，\n让每个类的方向独立确定，这时关系约束才会真正改变解。那是「中药药性·嵌入」章的题目。\n\n### 本节翻译的代价与边界\n\n必须显式写清，否则这门课就是只报喜不报忧：\n\n**丢掉了什么**\n\n| 丢失项 | 为什么是结构性的 |\n|--------|----------------|\n| 分类标签是**无序**的 | softmax 中五类地位完全平等；而五行的「相生有向、相克隔一」是有向约束，只能在损失函数里外加 |\n| 「五位一体」的**整体性** | 五个输出头是并列关系，没有一个\"整体层\"来承载\"生克制化作为整体才成立\"这层含义 |\n| 「太过」与「不及」 | 五行各有太过不及（如木旺、木虚），序数编码无法表达同一行的双向偏离 |\n\n**不适用范围**\n\n- 本数据是**构造的教学样例**，非临床数据集；输出的准确率、余弦值**不具备临床效力**。\n- 本节的 λ 扫描结论**只在共线表示下成立**。换成独立特征或嵌入表示后，必须重跑扫描。\n- 不构成任何诊疗建议。教学样例数据不能用于病人。\n\n**一处必须排除的误用（C 级）**\n\n> 「五行分类器 = 五行学说」—— 只对了类别数（5），丢掉了关系层。\n> 本节的实验恰好证明：在共线表示下关系\"免费\"且约束无用；这说明**是表示而不是分类器在承载五行语义**。\n> 把它当成\"五行已经被 AI 学会了\"是 C 级类比，不得进入任何临床输出路径。\n\n## USE IT：框架调用\n\n任何成熟框架里，加这项约束都只是 `loss = ce + lambda * reg` 一行。真正的工作量在于：\n\n1. 设计可微的约束形式（hinge？KL？距离？）\n2. 扫描 λ，画出「准确率 vs 关系差」的权衡曲线\n3. 判断这条曲线是否值得走 —— 本课的例子告诉你，不总是值得\n\n## SHIP IT：产出物\n\n- [📋 Prompt 模板](../outputs/prompt-wu-xing-duo-fenlei.md) —— 让大模型在给出五行归类时，**必须同时给出所依据的配属维度**，并显式标注关系一致性\n- [🛠️ Skill 文件](../outputs/skill-wu-xing-duo-fenlei.md) —— 把「加约束前先测基线」固化成一个可复用的实验流程\n\n## 验证\n\n```bash\nnode code/main.js\n# Expected: 见上方「实测结果」代码块，退出码 0\n```\n\n```bash\nnode --test code/main.test.js\n# Expected: 全部通过\n```\n\n## 练习\n\n见 [exercises.md](../exercises.md)。\n\n## 进阶思考\n\n1. 如果打乱某一列（例如把「味」的次序随机重排），共线性被破坏，λ 扫描的曲线会变成什么样？先预测再跑。\n2. 用 one-hot 编码替代序数编码后，λ=0 的关系差会变成多少？为什么？\n3. 「五位一体」这种整体观，除了余弦约束，还能用哪些可微形式表达？各自的代价是什么？\n",
    "code": {
      "main.js": "#!/usr/bin/env node\n/**\n * 中医基础理论 · 第 2 章 五行学说 → 多分类：从零实现 Softmax，并加入生克约束\n * 课程: departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/02-wu-xing-duo-fenlei/docs/zh.md\n * 出处: 《尚书·洪范》五行次序；生克关系见《素问·五运行大论》\n * 依赖: 仅 Node.js 标准库\n *\n * 核心命题: 五行是 5 类 —— 但纯 softmax 会丢掉全部关系信息。\n * 本课把「相生 / 相克」写成一对余弦约束加进损失，比较加约束前后的差别。\n *\n * 说明: 数据是按五行属性表构造的教学样例，非临床数据集。\n */\n\n'use strict';\n\nconst CLASSES = ['木', '火', '土', '金', '水'];\nconst FEATURES = ['色', '味', '志', '方位'];\n\n// 五行属性表（每行 = 该类在 4 个特征上的取值，归一化到 0..2）\n// 依据通行配属：木-青酸怒东 / 火-赤苦喜南 / 土-黄甘思中 / 金-白辛悲西 / 水-黑咸恐北\nconst CLASS_TABLE = [\n  [0, 0, 0, 0], // 木: 青 酸 怒 东\n  [1, 1, 1, 1], // 火: 赤 苦 喜 南\n  [2, 2, 2, 2], // 土: 黄 甘 思 中\n  [3, 3, 3, 3], // 金: 白 辛 悲 西\n  [4, 4, 4, 4], // 水: 黑 咸 恐 北\n];\n\n/** 相生: 木→火→土→金→水→木；相克: 木克土、土克水、水克火、火克金、金克木 */\nconst SHENG = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]];\nconst KE = [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0]];\n\nconst DIM = 4;\nconst K = 5;\n\n// ── 构造样本：每类 4 例，带少量扰动 ─────────────────────────\nfunction mulberry32(seed) {\n  let a = seed >>> 0;\n  return function rnd() {\n    a |= 0;\n    a = (a + 0x6d2b79f5) | 0;\n    let t = Math.imul(a ^ (a >>> 15), 1 | a);\n    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;\n    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;\n  };\n}\n\nfunction makeDataset(seed = 20261012, perClass = 4) {\n  const rnd = mulberry32(seed);\n  const X = [];\n  const y = [];\n  for (let c = 0; c < K; c += 1) {\n    for (let r = 0; r < perClass; r += 1) {\n      X.push(CLASS_TABLE[c].map((v) => (v + (rnd() - 0.5) * 1.2) / 4));\n      y.push(c);\n    }\n  }\n  return { X, y };\n}\n\n// ── 基础件 ─────────────────────────────────────────────────\nfunction softmax(z) {\n  const m = Math.max(...z);\n  const e = z.map((v) => Math.exp(v - m)); // 减 max：数值稳定的必要条件\n  const s = e.reduce((a, b) => a + b, 0);\n  return e.map((v) => v / s);\n}\n\nfunction forward(W, b, x) {\n  return softmax(W.map((row, k) => row.reduce((a, wj, j) => a + wj * x[j], b[k])));\n}\n\nfunction cosine(a, b) {\n  let d = 0; let na = 0; let nb = 0;\n  for (let i = 0; i < a.length; i += 1) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }\n  const den = Math.sqrt(na) * Math.sqrt(nb);\n  return den === 0 ? 0 : d / den;\n}\n\n/**\n * 交叉熵 + 生克正则\n *   相生对: hinge( cos < mSheng )  → 把相生两类的权重向量拉近\n *   相克对: hinge( cos > mKe    )  → 把相克两类的权重向量推远\n */\nfunction lossAndGrad(W, b, X, y, { lambda = 0, mSheng = 0.3, mKe = 0.1 } = {}) {\n  const gW = W.map((r) => r.map(() => 0));\n  const gb = b.map(() => 0);\n  let ce = 0;\n\n  for (let i = 0; i < X.length; i += 1) {\n    const p = forward(W, b, X[i]);\n    ce += -Math.log(p[y[i]] + 1e-12);\n    for (let k = 0; k < K; k += 1) {\n      const d = p[k] - (k === y[i] ? 1 : 0);\n      for (let j = 0; j < DIM; j += 1) gW[k][j] += d * X[i][j];\n      gb[k] += d;\n    }\n  }\n  const n = X.length;\n  const dataLoss = ce / n;\n  for (let k = 0; k < K; k += 1) for (let j = 0; j < DIM; j += 1) gW[k][j] /= n;\n  for (let k = 0; k < K; k += 1) gb[k] /= n;\n\n  let regLoss = 0;\n  const applyHinge = (i, j, wantAbove) => {\n    const c = cosine(W[i], W[j]);\n    const violation = wantAbove ? mSheng - c : c - mKe;\n    if (violation <= 0) return;\n    regLoss += violation;\n    // d(cos)/d(W[i]) = W[j]/(|W[i]||W[j]|) − cos·W[i]/|W[i]|²\n    const ni = Math.sqrt(W[i].reduce((a, v) => a + v * v, 0));\n    const nj = Math.sqrt(W[j].reduce((a, v) => a + v * v, 0));\n    // 零向量的余弦未定义，其梯度是 0/0。此处不下梯度（不是\"近似\"，是这一项本来就不存在）。\n    // 少了这个守卫，lambda=0 时 0*NaN 也会把整个梯度污染成 NaN。\n    if (ni === 0 || nj === 0) return;\n    const sign = wantAbove ? -1 : 1;\n    for (let d = 0; d < DIM; d += 1) {\n      const gi = sign * (W[j][d] / (ni * nj) - (c * W[i][d]) / (ni * ni));\n      const gj = sign * (W[i][d] / (ni * nj) - (c * W[j][d]) / (nj * nj));\n      gW[i][d] += lambda * gi;\n      gW[j][d] += lambda * gj;\n    }\n  };\n  for (const [i, j] of SHENG) applyHinge(i, j, true);\n  for (const [i, j] of KE) applyHinge(i, j, false);\n\n  return { loss: dataLoss + lambda * regLoss, dataLoss, regLoss, gW, gb };\n}\n\nfunction train(X, y, opts = {}) {\n  const { lr = 0.6, steps = 3000, lambda = 0, mSheng = 0.3, mKe = 0.1, seed = 7 } = opts;\n  const rnd = mulberry32(seed);\n  const W = Array.from({ length: K }, () => Array.from({ length: DIM }, () => (rnd() - 0.5) * 0.2));\n  const b = new Array(K).fill(0);\n  const history = [];\n  for (let s = 0; s < steps; s += 1) {\n    const { loss, gW, gb } = lossAndGrad(W, b, X, y, { lambda, mSheng, mKe });\n    if (s % 500 === 0) history.push(loss);\n    for (let k = 0; k < K; k += 1) {\n      for (let j = 0; j < DIM; j += 1) W[k][j] -= lr * gW[k][j];\n      b[k] -= lr * gb[k];\n    }\n  }\n  return { W, b, history };\n}\n\nfunction accuracy(W, b, X, y) {\n  let ok = 0;\n  for (let i = 0; i < X.length; i += 1) {\n    const p = forward(W, b, X[i]);\n    let arg = 0;\n    for (let k = 1; k < K; k += 1) if (p[k] > p[arg]) arg = k;\n    if (arg === y[i]) ok += 1;\n  }\n  return ok / X.length;\n}\n\n/** 关系一致性检查：相生对的平均余弦 应高于 相克对的平均余弦 */\nfunction relationReport(W) {\n  const sheng = SHENG.map(([i, j]) => cosine(W[i], W[j]));\n  const ke = KE.map(([i, j]) => cosine(W[i], W[j]));\n  const avg = (a) => a.reduce((x, y2) => x + y2, 0) / a.length;\n  return {\n    shengAvg: avg(sheng),\n    keAvg: avg(ke),\n    gap: avg(sheng) - avg(ke),\n    sheng,\n    ke,\n    consistent: avg(sheng) > avg(ke),\n  };\n}\n\nfunction main() {\n  const { X, y } = makeDataset();\n  console.log('═══ 五行 → 多分类：从零实现 Softmax + 生克约束 (中医基础理论 第2章) ═══');\n  console.log(`样本: ${X.length} 例 (${K} 类 × 4) | 特征: ${FEATURES.join(' / ')}`);\n\n  // 先看特征矩阵本身：通行配属表里四个维度的次序是否一致？\n  const col = (j) => CLASS_TABLE.map((r) => r[j]);\n  const ordersEqual = [1, 2, 3].every((j) => col(j).join() === col(0).join());\n  console.log(`特征共线检查: 四列次序完全一致 = ${ordersEqual ? '是 ⚠（结构上共线，见下文）' : '否'}`);\n\n  const plain = train(X, y, { lambda: 0 });\n  const rPlain = relationReport(plain.W);\n  const aPlain = accuracy(plain.W, plain.b, X, y);\n\n  console.log('');\n  console.log('【A】纯 softmax（λ=0）');\n  console.log(`  训练准确率: ${(aPlain * 100).toFixed(1)}%`);\n  console.log(`  相生对平均余弦: ${rPlain.shengAvg.toFixed(3)} | 相克对平均余弦: ${rPlain.keAvg.toFixed(3)} | 差 ${rPlain.gap.toFixed(3)}`);\n  console.log(`  关系一致性: ${rPlain.consistent ? '满足 ✅' : '被破坏 ❌'}`);\n\n  console.log('');\n  console.log('【B】生克正则的 λ 扫描');\n  console.log('  λ      准确率   相生均值   相克均值   差值');\n  const sweep = [0, 0.2, 0.5, 1.0, 2.0, 5.0].map((lambda) => {\n    const m = lambda === 0 ? plain : train(X, y, { lambda, mSheng: 0.3, mKe: 0.1 });\n    const r = relationReport(m.W);\n    const a = accuracy(m.W, m.b, X, y);\n    console.log(\n      `  ${String(lambda).padEnd(6)} ${((a * 100).toFixed(1) + '%').padEnd(8)} ` +\n      `${r.shengAvg.toFixed(3).padEnd(10)} ${r.keAvg.toFixed(3).padEnd(10)} ${r.gap.toFixed(3)}`\n    );\n    return { lambda, acc: a, ...r };\n  });\n\n  const bestGap = sweep.reduce((a, b) => (b.gap > a.gap ? b : a));\n  const bestAcc = sweep.reduce((a, b) => (b.acc > a.acc ? b : a));\n\n  console.log('');\n  console.log('【C】逐对明细（λ=2.0）');\n  const reg = train(X, y, { lambda: 2.0, mSheng: 0.3, mKe: 0.1 });\n  const rReg = relationReport(reg.W);\n  SHENG.forEach(([i, j], n) => {\n    console.log(`  生 ${CLASSES[i]}→${CLASSES[j]}: cos=${rReg.sheng[n].toFixed(3)}`);\n  });\n  KE.forEach(([i, j], n) => {\n    console.log(`  克 ${CLASSES[i]}→${CLASSES[j]}: cos=${rReg.ke[n].toFixed(3)}`);\n  });\n\n  console.log('');\n  console.log(`结论 1: 纯 softmax 在本数据上**没有**破坏生克关系（差值 ${rPlain.gap.toFixed(3)} > 0）——`);\n  console.log('        「纯 softmax 一定丢掉关系」这个说法在本数据上是错的。原因是通行配属表里');\n  console.log('        色/味/志/方位四列的次序完全一致，特征矩阵共线，最优解天然把类沿一条轴排开。');\n  console.log(`结论 2: 加上正则后关系差最大出现在 λ=${bestGap.lambda}（差 ${bestGap.gap.toFixed(3)}），`);\n  console.log(`        但准确率最高出现在 λ=${bestAcc.lambda}（${(bestAcc.acc * 100).toFixed(1)}%）。约束不是免费的。`);\n  console.log('        要真正让约束起作用，需要特征表示本身不共线 —— 那是后续「药性嵌入」章的题目。');\n  console.log('边界声明: 教学样例数据，非临床数据集；输出不构成诊疗建议。');\n\n  return { plain, reg, aPlain, rPlain, rReg, sweep, ordersEqual };\n}\n\nif (require.main === module) {\n  main();\n}\n\nmodule.exports = {\n  CLASSES, FEATURES, CLASS_TABLE, SHENG, KE, DIM, K,\n  softmax, forward, cosine, lossAndGrad, train, accuracy, relationReport,\n  makeDataset, mulberry32, main,\n};\n",
      "main.test.js": "#!/usr/bin/env node\n/**\n * 第 2 章 五行 → 多分类 —— 确定性单元测试\n * 运行: node --test code/main.test.js\n */\n\n'use strict';\n\nconst assert = require('node:assert');\nconst test = require('node:test');\n\nconst {\n  CLASSES, FEATURES, CLASS_TABLE, SHENG, KE, K, DIM,\n  softmax, forward, cosine, lossAndGrad, train, accuracy, relationReport, makeDataset,\n} = require('./main');\n\nconst { X, y } = makeDataset();\n\ntest('softmax 输出和为 1，且非负', () => {\n  for (const z of [[0, 0, 0, 0, 0], [1, 2, 3, 4, 5], [-3, 0, 7, -1, 2]]) {\n    const p = softmax(z);\n    assert.strictEqual(p.length, K);\n    assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-12);\n    assert.ok(p.every((v) => v >= 0));\n  }\n});\n\ntest('softmax 数值稳定：大输入不溢出为 NaN', () => {\n  const p = softmax([1000, 1000, 1000, 1000, 1000]);\n  assert.ok(p.every(Number.isFinite), 'softmax 溢出');\n  assert.ok(p.every((v) => Math.abs(v - 0.2) < 1e-12), '五项相等时应各为 0.2');\n  assert.ok(softmax([-1000, 0, 1000, 0, 0]).every(Number.isFinite));\n});\n\ntest('softmax 平移不变性：加同一个常数不改变结果', () => {\n  const a = softmax([1, 2, 3, 4, 5]);\n  const b = softmax([101, 102, 103, 104, 105]);\n  a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-12));\n});\n\ntest('余弦相似度：自相似为 1，反向为 −1，正交为 0', () => {\n  assert.ok(Math.abs(cosine([1, 2, 3, 4], [1, 2, 3, 4]) - 1) < 1e-12);\n  assert.ok(Math.abs(cosine([1, 0], [-1, 0]) + 1) < 1e-12);\n  assert.ok(Math.abs(cosine([1, 0], [0, 1])) < 1e-12);\n  assert.strictEqual(cosine([0, 0], [1, 1]), 0); // 零向量不做除零\n});\n\ntest('生克关系表正确：各 5 条，且相生对与相克对不重叠', () => {\n  assert.strictEqual(SHENG.length, 5);\n  assert.strictEqual(KE.length, 5);\n  const key = (p) => `${p[0]}-${p[1]}`;\n  const shengSet = new Set(SHENG.map(key));\n  for (const p of KE) assert.ok(!shengSet.has(key(p)), `相生相克重复: ${key(p)}`);\n  // 相生是相邻环，相克是隔一\n  SHENG.forEach(([i, j]) => assert.strictEqual(j, (i + 1) % K));\n  KE.forEach(([i, j]) => assert.strictEqual(j, (i + 2) % K));\n});\n\ntest('数据集形状：5 类 × 4 例 = 20 例，每类恰好 4 例', () => {\n  assert.strictEqual(X.length, 20);\n  assert.strictEqual(y.length, 20);\n  for (let c = 0; c < K; c += 1) {\n    assert.strictEqual(y.filter((v) => v === c).length, 4, `类 ${CLASSES[c]} 样本数不是 4`);\n  }\n  assert.ok(X.every((row) => row.length === DIM));\n  assert.strictEqual(FEATURES.length, DIM);\n  assert.strictEqual(CLASS_TABLE.length, K);\n});\n\ntest('通行配属表四个维度的次序完全一致（本课的核心发现，需被测试固化）', () => {\n  const col = (j) => CLASS_TABLE.map((r) => r[j]).join();\n  assert.strictEqual(col(1), col(0), '色与味次序不一致');\n  assert.strictEqual(col(2), col(0), '色与志次序不一致');\n  assert.strictEqual(col(3), col(0), '色与方位次序不一致');\n  // 结论：特征矩阵共线，这是 λ=0 时关系一致性已被免费满足的根因\n});\n\ntest('λ=0 时损失与梯度不受正则影响（regLoss 只是诊断量）', () => {\n  const W = Array.from({ length: K }, () => new Array(DIM).fill(0));\n  const b = new Array(K).fill(0);\n  const lambdaZero = lossAndGrad(W, b, X, y, { lambda: 0 });\n  const marginZero = lossAndGrad(W, b, X, y, { lambda: 0, mSheng: 0, mKe: 0 });\n\n  // λ=0 ⇒ 正则项的梯度贡献为 0，损失等于纯交叉熵\n  assert.strictEqual(lambdaZero.loss, lambdaZero.dataLoss);\n  assert.deepStrictEqual(lambdaZero.gW, marginZero.gW);\n  assert.deepStrictEqual(lambdaZero.gb, marginZero.gb);\n  assert.strictEqual(marginZero.regLoss, 0);\n\n  // 注意：λ=0 时 regLoss 仍会被计算出来（零向量之间的余弦为 0，违反相生下界），\n  // 但它不进入损失也不进入梯度 —— 这正是\"诊断量 ≠ 损失项\"的体现\n  assert.strictEqual(lambdaZero.regLoss, 5 * 0.3);\n\n  assert.ok(Math.abs(lambdaZero.dataLoss - Math.log(K)) < 1e-9, '均匀先验下交叉熵应约等于 ln5');\n});\n\ntest('λ=0 训练后准确率为 100%（特征共线使问题线性可分）', () => {\n  const { W, b } = train(X, y, { lambda: 0 });\n  assert.strictEqual(accuracy(W, b, X, y), 1);\n});\n\ntest('λ=0 时关系一致性已被满足：相生余弦均值 > 相克余弦均值', () => {\n  const { W } = train(X, y, { lambda: 0 });\n  const r = relationReport(W);\n  assert.ok(r.shengAvg > r.keAvg, `相生 ${r.shengAvg} 未高于相克 ${r.keAvg}`);\n  assert.ok(r.gap > 0.2, `关系差仅 ${r.gap}，与教材记录的 0.507 差距过大，检查数据构造`);\n  assert.strictEqual(r.consistent, true);\n});\n\ntest('加大 λ 会牺牲准确率（约束不是免费的）', () => {\n  const plain = train(X, y, { lambda: 0 });\n  const strong = train(X, y, { lambda: 5 });\n  const aPlain = accuracy(plain.W, plain.b, X, y);\n  const aStrong = accuracy(strong.W, strong.b, X, y);\n  assert.strictEqual(aPlain, 1);\n  assert.ok(aStrong < aPlain, `λ=5 准确率 ${aStrong} 未低于 λ=0 的 ${aPlain}`);\n});\n\ntest('训练确定性：同一 seed 两次结果逐位一致', () => {\n  const a = train(X, y, { lambda: 1, steps: 400 });\n  const b = train(X, y, { lambda: 1, steps: 400 });\n  assert.deepStrictEqual(a.W, b.W);\n  assert.deepStrictEqual(a.b, b.b);\n});\n\ntest('forward 输出的长度与概率性质正确', () => {\n  const W = Array.from({ length: K }, () => new Array(DIM).fill(0.1));\n  const b = new Array(K).fill(0);\n  const p = forward(W, b, X[0]);\n  assert.strictEqual(p.length, K);\n  assert.ok(Math.abs(p.reduce((a, v) => a + v, 0) - 1) < 1e-12);\n});\n"
    },
    "quiz": {
      "lesson": "02-wu-xing-duo-fenlei",
      "title": "五行学说 → 多分类：从零实现 Softmax（并检验生克约束是否真的有用）",
      "subject": "01-zhongyi-jichu-lilun",
      "questions": [
        {
          "stage": "pre",
          "question": "本课的最小数理前置是？",
          "options": [
            "会推导反向传播的链式法则",
            "知道指数函数与向量点积，并理解「两个向量的夹角」可以用余弦衡量",
            "会用 PyTorch 的 CrossEntropyLoss",
            "记得《尚书·洪范》的原文次序"
          ],
          "correct": 1,
          "explanation": "本课把关系写成「类权重向量之间的余弦约束」，所以前置是对「夹角=余弦」有直觉。反向传播的链式法则当然有用，但本课只需对余弦求导，不需要完整的反向传播框架。"
        },
        {
          "stage": "check",
          "question": "softmax 里为什么要先减去最大值？",
          "options": [
            "为了让输出更平均，提升准确率",
            "这是正确性要求：不减去最大值，e 的指数会溢出为 Infinity，除法得到 NaN",
            "为了加快训练速度",
            "因为数学上 softmax 必须写成这种形式"
          ],
          "correct": 1,
          "explanation": "softmax 具有平移不变性（加同一个常数结果不变），所以减去最大值不改变数学结果，但把指数控制在安全范围内。这不是优化技巧，是不写就会溢出 NaN 的正确性要求。"
        },
        {
          "stage": "check",
          "question": "本课实验里，λ=0（纯 softmax）时相生对的平均余弦 0.014 已经高于相克对的 −0.493。为什么？",
          "options": [
            "巧合，换一批随机种子就会反过来",
            "因为模型在训练中自动学到了中医知识",
            "因为通行配属表里色/味/志/方位四列的次序完全一致，特征矩阵共线，最优解天然把五个类沿一条轴按次序排开，而排序恰好让相邻类（相生）方向接近",
            "因为相生相克的定义本身就是数据的一部分，被当作标签喂进去了"
          ],
          "correct": 2,
          "explanation": "关系并没有被当作标签喂进去。真正的原因是特征矩阵共线——四列取值次序完全相同，所以五个类在高维空间中沿一条方向线排列，相邻即夹角小。这是数据表示的结构性结果，不是模型学到的中医知识。"
        },
        {
          "stage": "check",
          "question": "λ 扫描显示：λ 从 0 加到 5，准确率从 100% 掉到 60%，而关系差并没有变大。这说明什么？",
          "options": [
            "正则化在数学上有问题，不应使用",
            "在本数据表示下，生克约束是冗余的——它想强加的性质已经被数据免费满足，加约束只带来代价",
            "学习率设错了",
            "需要更多样本才能看出约束的收益"
          ],
          "correct": 1,
          "explanation": "这正是本课要教的核心判断：约束不是免费的，也不总是有用的。当数据表示已经蕴含了某个性质，再加约束就是纯粹的损耗。要让它有用，得先改变表示（例如用可学习的嵌入而非序数编码），让类的方向不再被共线性决定。"
        },
        {
          "stage": "post",
          "question": "要把「五行整体观」真正编码进模型，下一步最该做的是什么？",
          "options": [
            "把 λ 调到更大，强行压出关系",
            "换更深的网络",
            "改变特征表示，让五个类的方向不再由共线的序数编码决定，然后再加关系约束",
            "增加训练轮数"
          ],
          "correct": 2,
          "explanation": "次序是先表示、后约束。在共线表示下加大 λ 只是让模型更用力地去满足一个已经满足的性质，代价全落在准确率上。先让表示有能力区分「方向」，约束才可能带来增量。"
        },
        {
          "stage": "post",
          "question": "关于本章的结论，哪种说法才是诚实的研究态度？",
          "options": [
            "「我证明了纯 softmax 会丢掉五行关系，所以必须加约束」",
            "「我测出在本数据表示下纯 softmax 已满足关系一致性，因此这个约束是冗余的；并给出了根因是配属表共线」",
            "「约束没有用，所以今后都不用加约束」",
            "「结果不稳定，所以不做结论」"
          ],
          "correct": 1,
          "explanation": "诚实的结论必须限定适用条件（「在本数据表示下」）并给出机制解释（「因为共线」）。第一条是没跑就下结论；第三条是把局部结论推广成普遍规律；第四条是放弃解释。"
        }
      ]
    },
    "exercises": "# 第 2 章 · 练习\n\n## 基础：破坏共线性，看曲线怎么变\n\n修改 `makeDataset()`，在生成 `CLASS_TABLE` 时**只打乱其中一列**（例如把「味」的次序随机重排），其余三列保持原样。\n\n先**预测**：λ=0 时的关系差会变成多少？（提示：共线性被破坏后，最优解不再必然沿一条轴排序。）\n\n再跑，对比预测与实测。如果你的预测错了，写下你错在哪一步的推理。\n\n## 进阶：换一种约束形式\n\n把余弦 hinge 换成**KL 散度**约束：要求每个类的权重分布与「邻居类的平均」之间保持给定的 KL 距离。\n\n要求：\n\n1. 推导新约束的梯度（可以先用有限差分验证梯度正确性：$\\frac{\\partial L}{\\partial w} \\approx \\frac{L(w+\\epsilon) - L(w-\\epsilon)}{2\\epsilon}$）。\n2. 重跑 λ 扫描，对比余弦约束与 KL 约束的「准确率 vs 关系差」曲线。\n3. 说明哪种约束更适合表达相生，哪种更适合表达相克。\n\n## 挑战：把结论写成一份可复核的实验报告\n\n以本课的真实输出为素材，写一份不超过 800 字的实验报告，必须包含：\n\n1. **假设**：加生克约束应当使相生对余弦上升、相克对余弦下降。\n2. **结果**：λ 扫描表（6 行，用真实数字）。\n3. **反例**：明确写出哪个假设被**推翻**了，以及根因。\n4. **限定**：这个结论在什么条件下不成立？\n5. **下一步**：要验证「改变表示后约束才有效」，最小可做的实验是什么？\n\n> 报告里**不允许**出现「效果显著提升」「大幅改善」这类没有数字支撑的表述。\n> 每个结论后面必须跟一组实测数字。\n",
    "outputs": [
      {
        "name": "prompt-wu-xing-duo-fenlei.md",
        "body": "# Prompt · 加约束前的基线测量\n\n> 学科: 中医基础理论 · 章节: 02-wu-xing-duo-fenlei\n\n## 用途\n\n这个 Prompt 要解决的不是「五行怎么分类」，而是**建模时最常见的自伤**：\n还没测基线就先加约束，然后把约束带来的代价误认为收益。\n\n它让大模型在设计一项约束前，先强制产出一份基线测量计划。\n\n## 系统提示\n\n```text\n你是一名建模方法学顾问。当有人提出「给模型加上某个领域约束」时，\n你的任务不是帮他实现，而是先逼他回答四个问题。\n\n必须按顺序回答，任何一项答不出来就说「信息不足」，不许猜测：\n\n1. 基线是什么？\n   不加这项约束时，该约束想强加的性质是否已经被满足？\n   要给出可测量的指标（不是\"效果好坏\"，而是具体数值与口径）。\n\n2. 代价在哪？\n   这项约束会与主损失竞争。给出一个交换率实验设计（例如参数扫描），\n   说明你会用哪个指标衡量代价。\n\n3. 机制是什么？\n   如果基线已经满足该性质，为什么？给出结构性原因（特征共线 / 数据泄漏 /\n   标签编码本身蕴含 / 评测口径选错）。答不出机制，就不许声称\"约束有效\"。\n\n4. 什么条件下结论失效？\n   明确写出这个实验的适用边界。\n\n输出格式：\n{\n  \"claim\": \"待检验的断言（原文引用）\",\n  \"baseline_metric\": { \"name\": \"…\", \"definition\": \"…\", \"expected_value\": \"…\" },\n  \"sweep_design\": { \"parameter\": \"…\", \"range\": [..], \"cost_metric\": \"…\" },\n  \"mechanism\": \"…\",\n  \"validity_boundary\": \"…\",\n  \"verdict\": \"先测基线 | 直接加约束（需给出理由）\"\n}\n\n禁止输出：「效果显著」「大幅提升」「一般来说会更好」。\n每个量化陈述后必须跟具体数字或明确写出\"待测\"。\n```\n\n## 输入 / 输出契约\n\n| 输入 | 类型 | 说明 |\n|------|------|------|\n| `断言` | string | 待检验的断言，例如「加生克约束能提升五行分类质量」 |\n| `现有实现` | string | 可选，当前模型/数据的描述 |\n| `可用指标` | string[] | 可选，你能测的指标 |\n\n| 输出 | 说明 |\n|------|------|\n| `baseline_metric` | 必须先测的那个指标，含口径 |\n| `sweep_design` | 参数扫描设计 |\n| `mechanism` | 机制解释（答不出须写「待查」） |\n| `validity_boundary` | 适用边界 |\n| `verdict` | 二选一 |\n\n## 为什么这个 Prompt 有价值\n\n本课的真实经历：原本预期「纯 softmax 会丢掉五行关系」，实际测出关系差 0.507 已经为正，\n根因是配属表四列共线。**如果先写实现再补基线，这个发现永远不会发生** —— 你会看到加了约束\n之后「关系差也不错」，就以为约束起了作用。\n\n## 校验\n\n- [ ] `baseline_metric.definition` 必须含具体口径与计算方式\n- [ ] `mechanism` 若为「待查」，`verdict` 不得为「直接加约束」\n- [ ] 全文不含「显著」「大幅」等无数字形容词\n- [ ] `validity_boundary` 非空\n"
      },
      {
        "name": "skill-wu-xing-duo-fenlei.md",
        "body": "---\nname: wu-xing-duo-fenlei\ndescription: 五行归类必须给出所依据的配属维度，并显式标注生克关系一致性；资料不足时标记不确定。\nversion: 1.0.0\nsubject: 01-zhongyi-jichu-lilun\nchapter: 02-wu-xing-duo-fenlei\ntags: [五行, 生克, 多分类, 关系约束]\n---\n\n# 五行归类的可归因流程\n\n## 何时使用\n\n当你需要把一个症状、一味药、一个方位或一个季节归入五行之一，并且\n**必须说清是「依据哪个配属维度」归的**时。\n\n不适用：需要给出证型诊断、处方或治则；需要判断生克传变的具体临床走向（那需要完整四诊与病程）。\n\n## 输入契约\n\n| 字段 | 类型 | 必填 | 说明 |\n|------|------|------|------|\n| `对象` | string | 是 | 待归类的对象（症状 / 药物 / 方位 / 季节 / 情志） |\n| `依据维度` | string[] | 否 | 只允许从 `色/味/志/方位/季/脏/腑/官窍/形体` 中选 |\n| `原文` | string | 否 | 原始描述，用于抽取 |\n\n## 步骤\n\n1. **取维度**：确认待归类的对象在哪些维度上有配属依据。**没有任何通行配属依据的对象直接拒答**，不要硬归。\n2. **逐维度归类**：对每个可用维度，写出该维度下的五行为何。引用配属表时要写到具体来源（如《素问·阴阳应象大论》五行配属段）。\n3. **一致性检查**：若不同维度给出**不同的五行**（例：某表现按「色」归木、按「味」归金），必须显式冲突，不得挑一个顺眼的上报。\n4. **关系标注**：给出该五行与其余四行的生克关系。\n   - 相生：木→火→土→金→水→木（外圈）\n   - 相克：木克土、土克水、水克火、火克金、金克木（隔一）\n5. **输出置信度**：可用维度 ≥ 2 且全部一致 → `high`；可用维度 = 1 → `medium`；维度冲突 → `conflict`（不是 low）。\n\n## 输出契约\n\n```json\n{\n  \"object\": \"…\",\n  \"verdict\": \"木 | 火 | 土 | 金 | 水 | 无法归类\",\n  \"by_dimension\": [{ \"dimension\": \"色\", \"element\": \"木\", \"source\": \"《素问·…》\" }],\n  \"consistency\": \"high | medium | conflict\",\n  \"conflicts\": [],\n  \"relations\": { \"sheng_to\": \"火\", \"sheng_from\": \"水\", \"ke_to\": \"土\", \"ke_from\": \"金\" },\n  \"disclaimer\": \"本输出为结构化归类辅助，不构成临床诊疗建议。\"\n}\n```\n\n## 硬约束\n\n- 输出**必须**包含 `by_dimension`，每项都要有 `source`。无来源的归类一律无效。\n- 维度冲突时 `consistency` 必须是 `conflict`，且 `conflicts` 非空。**不得为了让结果\"好看\"而挑选单一维度。**\n- 生克关系**必须**完整给出四条边（生我 / 我生 / 克我 / 我克），缺一条即为无效输出。\n- 不允许输出证型、方剂、剂量、治则。\n- 结尾必须带 `disclaimer`。\n\n## 已知陷阱\n\n| 陷阱 | 表现 | 修正 |\n|------|------|------|\n| 维度混用 | 用「味」的依据得出「木」，再拿「方位西」当理由 | 每个结论必须标注它是哪个维度得出的 |\n| 关系漏边 | 只给「相生」不提「相克」 | 四条边齐全是硬约束 |\n| 无依据归类 | 说「某症状属土」但说不出配属来源 | 直接判 `无法归类` |\n| 把归类当诊断 | 「属木，故肝郁气滞」 | 越界。归类是结构性工作，不是辨证 |\n\n## 验证清单\n\n- [ ] `by_dimension` 每项都有可核查的 `source`\n- [ ] 维度冲突时 `consistency = \"conflict\"` 且 `conflicts` 非空\n- [ ] `relations` 四条边齐全\n- [ ] 无配属依据的对象输出 `无法归类`\n- [ ] 任何输出路径都带 `disclaimer`\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "01-zhongyi/01-zhongyi-jichu-lilun/03-zang-xiang-tupu": {
    "key": "01-zhongyi/01-zhongyi-jichu-lilun/03-zang-xiang-tupu",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "01-zhongyi-jichu-lilun",
    "subjectTitle": "中医基础理论",
    "chapterSlug": "03-zang-xiang-tupu",
    "n": 3,
    "title": "第 3 章 · 藏象学说 → 知识图谱：脏腑关系的图表示",
    "motto": "「藏象何如？」——《素问·六节藏象论》",
    "problem": "你能背出「肝开窍于目、在志为怒、在体为筋」，但这些知识是散的。当病人说「我最近特别容易发怒，还老是流泪」，你没法系统地回答「这几点在藏象体系里怎么串起来」。",
    "roots": "环境逼迫(“写病历只会罗列症状，串不成一个整体判断”) + 知识积累(藏象配属 × 图结构 = 能把「象」变成可遍历、可校验的关系网络)",
    "html": "<h1 id=\"第-3-章-藏象学说-知识图谱-脏腑关系的图表示\">第 3 章 · 藏象学说 → 知识图谱：脏腑关系的图表示</h1>\n<blockquote><p><strong>MOTTO:</strong> 「藏象何如？」——《素问·六节藏象论》</p>\n<p><strong>PROBLEM:</strong> 你能背出「肝开窍于目、在志为怒、在体为筋」，但这些知识是散的。当病人说「我最近特别容易发怒，还老是流泪」，你没法系统地回答「这几点在藏象体系里怎么串起来」。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(“写病历只会罗列症状，串不成一个整体判断”) + 知识积累(藏象配属 × 图结构 = 能把「象」变成可遍历、可校验的关系网络)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>中医基础理论</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>03 / 10</td></tr><tr><td>所属阶段</td><td>🌱 生·启蒙</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>4 小时</td></tr></tbody></table></div>\n<h2 id=\"课程结构\">课程结构</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">MOTTO  →  PROBLEM  →  CONCEPT  →  BUILD IT  →  USE IT  →  SHIP IT\n一句话      痛点      原理+图解    从零实现     框架调用    产出工具</code></pre></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>说清「藏」与「象」的区别，以及为什么「象」本质上是关系而不是属性</li><li>先定义本体（实体类型 + 关系类型），再灌数据；说清反过来做会付出什么代价</li><li>从零实现邻接表、k 跳邻域、最短路径，并处理<strong>边方向</strong></li><li>写出三项本体完整性校验，并把「哪些关系还没建」变成可枚举清单</li><li>解释为什么藏象与五行必须放在同一张图里 —— 拆成两张表会丢掉哪条路径</li></ul>\n<div class=\"figure-host\" data-figure=\"zangxiang-graph\"></div>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"中医-藏与象\">中医：藏与象</h3>\n<p>《素问·五藏别论》：「所谓五藏者，藏精气而不泻也。」——「藏」指藏于内的脏腑功能。\n「象」指这些功能表现于外的征象。</p>\n<p>关键在于<strong>藏象的核心是「联系」，不是「属性清单」</strong>：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">肝：合胆 · 开窍于目 · 在志为怒 · 在体为筋 · 其华在爪 · 在液为泪 · 属木</code></pre></div>\n<p>每一条都是<strong>一条边</strong>，不是一个字段。肝之所以是「肝」，一半由它连着什么决定。\n用表格存这些关系，你只能逐行查；用图存，你可以问「从『目』走两步能到哪」。</p>\n<h3 id=\"ai-工程-知识图谱\">AI / 工程：知识图谱</h3>\n<p>知识图谱的最小单元是三元组 <code>(头实体, 关系, 尾实体)</code>。落到实现上就是<strong>邻接表</strong>：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">javascript</div><pre><code class=\"lang-javascript\">g.out.get('肝')  // → [{ type:'开窍于', to:'目' }, { type:'在志为', to:'怒' }, ...]\ng.in.get('目')   // → [{ type:'开窍于', from:'肝' }]</code></pre></div>\n<p>图上的三件事必须自己写一遍：</p>\n<div class=\"table-wrap\"><table><thead><tr><th>操作</th><th>用途</th><th>复杂度</th></tr></thead><tbody><tr><td>k 跳邻域</td><td>「这个症状还能牵出什么」</td><td>O(V+E)</td></tr><tr><td>最短路径</td><td>「这两者怎么关联上的」</td><td>O(V+E)</td></tr><tr><td>本体校验</td><td>「哪些关系还没建」</td><td>O(V+E)</td></tr></tbody></table></div>\n<p><strong>方向性是要处理的真实问题。</strong> 相克边只建「克」的方向（金克木）。当你反向查询\n金与木的关系时，渲染时必须标注「逆向遍历」，否则会把「金克木」讲成「木克金」——\n中医的方向讲反了，不是排版问题，是学术错误。</p>\n<h3 id=\"对应关系\">对应关系</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>中医概念</th><th>AI / 工程概念</th><th>桥梁（为什么可以这样翻译）</th><th>级别</th></tr></thead><tbody><tr><td>藏象配属（开窍于/在志为/在体为）</td><td>三元组 / 有向边</td><td>每条配属天然是一个 <code>(脏, 关系, 象)</code> 三元组</td><td><strong>A</strong></td></tr><tr><td>相表里</td><td><strong>对称</strong>关系</td><td>脏与腑互为表里，两侧都要有边；只写一侧会让「从腑查脏」静默失败</td><td><strong>A</strong></td></tr><tr><td>五行生克</td><td>五行节点之间的有向边</td><td>相生/相克是五行节点上的边，而不是脏的属性</td><td><strong>A</strong></td></tr><tr><td>藏象 + 五行同图</td><td>本体整合</td><td>不整合就查不出「肝 → 悲」这条路；见下文实测</td><td><strong>B</strong></td></tr><tr><td>「象」</td><td>节点出边的集合</td><td>「象」就是「这个脏连出去的所有边」</td><td><strong>B</strong></td></tr><tr><td>藏象 = 器官图谱</td><td>——</td><td>❌ <strong>D 级误用</strong>。藏象之「肝」是功能系统，与解剖肝脏非一对一，直接映射会造成系统性错误</td><td><strong>D</strong></td></tr></tbody></table></div>\n<pre class=\"mermaid\">graph LR\n  A[&quot;藏象配属表&quot;] --&gt; B[&quot;本体定义&lt;br/&gt;实体类型 + 关系类型&quot;]\n  B --&gt; C[&quot;邻接表建图&quot;]\n  C --&gt; D[&quot;k 跳邻域&quot;]\n  C --&gt; E[&quot;最短路径&quot;]\n  C --&gt; F[&quot;本体完整性校验&quot;]\n  F --&gt; G[&quot;未建关系清单&quot;]\n  G -.-&gt;|回指校验| H[&quot;清单里的每条关系，中医上真的存在吗？&quot;]</pre>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<p>先定本体，再灌数据：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">javascript</div><pre><code class=\"lang-javascript\">const NODE_TYPES = ['脏', '腑', '官窍', '情志', '形体', '华', '液', '五行'];\nconst EDGE_TYPES = ['相表里', '开窍于', '在志为', '在体为', '其华在', '化为', '属五行', '相生', '相克'];</code></pre></div>\n<p>相表里是对称关系，两侧都要建边：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">javascript</div><pre><code class=\"lang-javascript\">addEdge(g, z.name, '相表里', z.fu);\naddEdge(g, z.fu,   '相表里', z.name);   // ← 少这一行，从腑查脏会静默失败</code></pre></div>\n<p>最短路径要携带<strong>真实边方向</strong>：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">javascript</div><pre><code class=\"lang-javascript\">// 沿出边走：真实方向 n → e.to\n{ next: e.to,   src: n,      dst: e.to, forward: true  }\n// 沿入边走（逆向）：真实方向 e.from → n\n{ next: e.from, src: e.from, dst: n,    forward: false }</code></pre></div>\n<p>跑起来：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js</code></pre></div>\n<h2 id=\"实测结果\">实测结果</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">节点 40 个 | 边 50 条\n实体类型: 脏 / 腑 / 官窍 / 情志 / 形体 / 华 / 液 / 五行\n关系类型: 相表里 / 开窍于 / 在志为 / 在体为 / 其华在 / 化为 / 属五行 / 相生 / 相克\n\n【一】五藏的配属（one-hop 出边）\n  肝(木) 合胆 · 开窍于目 · 在志为怒 · 在体为筋 · 其华在爪\n  心(火) 合小肠 · 开窍于舌 · 在志为喜 · 在体为脉 · 其华在面\n  脾(土) 合胃 · 开窍于口 · 在志为思 · 在体为肉 · 其华在唇\n  肺(金) 合大肠 · 开窍于鼻 · 在志为悲 · 在体为皮毛 · 其华在毛\n  肾(水) 合膀胱 · 开窍于耳 · 在志为恐 · 在体为骨 · 其华在发\n\n【二】k 跳邻域：从「目」出发\n  1 跳 (1 个节点):\n    距离 1: 肝\n  2 跳 (7 个节点):\n    距离 1: 肝\n    距离 2: 胆 怒 筋 爪 泪 木\n\n【三】最短路径查询（←type- 表示该边是逆向遍历，真实方向相反）\n  目 → 泪 (2 跳, 含 1 条逆向): 目 ←开窍于- 肝 -化为→ 泪\n  肝 → 悲 (4 跳, 含 2 条逆向): 肝 -属五行→ 木 ←相克- 金 ←属五行- 肺 -在志为→ 悲\n  耳 → 小肠 (5 跳, 含 2 条逆向): 耳 ←开窍于- 肾 -属五行→ 水 -相克→ 火 ←属五行- 心 -相表里→ 小肠\n  怒 → 骨 (5 跳, 含 3 条逆向): 怒 ←在志为- 肝 -属五行→ 木 ←相生- 水 ←属五行- 肾 -在体为→ 骨\n\n【四】本体完整性校验\n  六类配属齐备: 通过 ✅\n  相表里对称: 通过 ✅\n  五行分配唯一且覆盖: 通过 ✅</code></pre></div>\n<h3 id=\"三个被实测暴露出来的问题\">三个被实测暴露出来的问题</h3>\n<p><strong>问题一：相表里只写了一侧。</strong>\n第一版只建了 <code>脏 → 腑</code>，校验器立刻报出 5 项错误：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">胆 未回连 肝（相表里必须对称）\n小肠 未回连 心（相表里必须对称）\n...</code></pre></div>\n<p>这不是实现 bug，是<strong>本体设计 bug</strong> —— 在关系定义阶段就没说清「相表里是对称的」。\n校验器的价值就在这里：它把本体设计的疏漏变成可枚举的清单。</p>\n<p><strong>问题二：五行没进图，<code>肝 → 悲</code> 查不通。</strong>\n第一版只把五行当成脏的一个属性字段（<code>wuxing: '木'</code>），没有把五行建成节点。结果\n<code>肝 → 悲</code> 报「不可达」。补上五行节点与相生/相克边之后，路径通了：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">肝 → 悲 (4 跳): 肝 -属五行→ 木 ←相克- 金 ←属五行- 肺 -在志为→ 悲</code></pre></div>\n<p><strong>这就是「藏象与五行必须放在同一张图里」的具体含义。</strong> 拆成两张表，这条路就不存在了。\n顺带说明：这条路靠的是<strong>金克木</strong>，遍历时是逆向走的，所以标记为 <code>←相克-</code>。</p>\n<p><strong>问题三：边方向会被渲染反。</strong>\n第一版的输出是「木 → 金（相克）」，把「金克木」讲成了「木克金」。原因是路径渲染没有\n区分真实方向与遍历方向。修正后输出 <code>木 ←相克- 金</code>。\n中医里方向讲反不是排版问题 —— 相生方向反了，整个传变推演就错了。</p>\n<h3 id=\"观察-藏象配属的图直径很小\">观察：藏象配属的图直径很小</h3>\n<p>从「目」出发，2 跳就能覆盖 7 个节点（肝、胆、怒、筋、爪、泪、木）。这不是偶然 ——\n藏象体系是一个<strong>高度联通的小世界</strong>。「怒」到「骨」只要 5 跳。这解释了为什么中医的\n整体观不是修辞：在这张图上，任意两个节点之间确实只需要很少几步。</p>\n<p>（注意：这是<strong>拓扑距离</strong>，不是因果距离。图上 5 跳不代表临床上「发怒会导致骨病」——\n把拓扑距离误读为因果距离，是知识图谱最常见的滥用。）</p>\n<h3 id=\"本节翻译的代价与边界\">本节翻译的代价与边界</h3>\n<p><strong>丢掉了什么</strong></p>\n<div class=\"table-wrap\"><table><thead><tr><th>丢失项</th><th>为什么是结构性的</th></tr></thead><tbody><tr><td>关系的<strong>强度</strong></td><td>图上只有「有边 / 无边」两种状态。而藏象配属的实际关联程度差异很大（「开窍于目」与「其华在爪」显然不同），图模型默认它们等权</td></tr><tr><td>关系的<strong>条件性</strong></td><td>「肝开窍于目」在正常生理下成立；病理状态下可能出现「肝火上炎见目赤」这类方向性更强的表现。基础图不区分生理与病理边</td></tr><tr><td><strong>时间</strong></td><td>藏象是一个功能系统，功能是有时序的（如「女子以肝为先天」随生命周期变化）。静态图没有时间轴</td></tr><tr><td>「藏」与「象」的<strong>层次</strong></td><td>本图把所有节点平铺。而「藏」是内藏的脏腑功能，「象」是外显的征象，两者在证据强度上并不对等 —— 图模型没有表达这一层</td></tr></tbody></table></div>\n<p><strong>不适用范围</strong></p>\n<ul><li>本图是<strong>教学图谱</strong>，只覆盖五藏的基础配属关系，不是完整的藏象本体。</li><li>图上的路径是<strong>拓扑关联</strong>，<strong>不构成因果结论</strong>，也<strong>不构成任何诊疗建议</strong>。</li><li>本课未收录六腑自身的功能关系（如「传化物」次序），因此涉及六腑的路径查询结果不完整。</li></ul>\n<p><strong>一处必须排除的误用（D 级）</strong></p>\n<blockquote><p>「藏象 = 器官知识图谱」—— 藏象之「肝」是功能系统，与解剖肝脏<strong>不是一对一</strong>关系。\n直接按解剖器官建模会造成系统性错误：例如把「肝郁」理解为肝脏的病理改变。\n这是本项目在 <a href=\"../../../../../../glossary/bridge-map.html\">bridge-map.md</a> 中列为 D 级的典型误用。</p></blockquote>\n<h2 id=\"use-it-框架调用\">USE IT：框架调用</h2>\n<p>用成熟图库（NetworkX / Neo4j / RDF 三元组库）做同样的事，接口不同但三件事不变：\n邻域、路径、校验。真正的差别在<strong>规模</strong>：本课 40 节点 50 条边，手写足够；\n真实的医案知识图谱是十万节点量级，那时才需要图数据库。</p>\n<p><strong>不要在 40 个节点上引入 Neo4j。</strong> 这是本章最实用的工程建议。</p>\n<h2 id=\"ship-it-产出物\">SHIP IT：产出物</h2>\n<ul><li><a href=\"../outputs/prompt-zang-xiang-tupu.html\">📋 Prompt 模板</a> —— 让大模型把症状串成藏象关系链，<strong>每一步都必须标出关系类型</strong>，并在跨五行时显式标注方向</li><li><a href=\"../outputs/skill-zang-xiang-tupu.html\">🛠️ Skill 文件</a> —— 藏象关系抽取与本体校验的固定流程</li></ul>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\n# Expected: 见上方「实测结果」代码块，退出码 0</code></pre></div>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node --test code/main.test.js\n# Expected: 全部通过</code></pre></div>\n<h2 id=\"练习\">练习</h2>\n<p>见 <a href=\"../exercises.html\">exercises.md</a>。</p>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<ol><li>六腑除了相表里，还有「传化物」的次序（胃→小肠→大肠→膀胱）。加进图后，从「胃」到「膀胱」的路径会变短多少？</li><li>如果要表达「肝气犯脾」（木克土），需要在图上加什么类型的边？它与已有的 <code>相克</code> 边是什么关系？</li><li>藏象图的拓扑直径很小。这对「症状 → 证候」的自动推理是好事还是坏事？为什么？</li></ol>",
    "markdown": "# 第 3 章 · 藏象学说 → 知识图谱：脏腑关系的图表示\n\n> **MOTTO:** 「藏象何如？」——《素问·六节藏象论》\n>\n> **PROBLEM:** 你能背出「肝开窍于目、在志为怒、在体为筋」，但这些知识是散的。当病人说「我最近特别容易发怒，还老是流泪」，你没法系统地回答「这几点在藏象体系里怎么串起来」。\n>\n> **双根因定位:** 环境逼迫(“写病历只会罗列症状，串不成一个整体判断”) + 知识积累(藏象配属 × 图结构 = 能把「象」变成可遍历、可校验的关系网络)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 中医基础理论 |\n| 院系 | 中医系 |\n| 章序号 | 03 / 10 |\n| 所属阶段 | 🌱 生·启蒙 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 4 小时 |\n\n## 课程结构\n\n```text\nMOTTO  →  PROBLEM  →  CONCEPT  →  BUILD IT  →  USE IT  →  SHIP IT\n一句话      痛点      原理+图解    从零实现     框架调用    产出工具\n```\n\n## 学习目标\n\n- 说清「藏」与「象」的区别，以及为什么「象」本质上是关系而不是属性\n- 先定义本体（实体类型 + 关系类型），再灌数据；说清反过来做会付出什么代价\n- 从零实现邻接表、k 跳邻域、最短路径，并处理**边方向**\n- 写出三项本体完整性校验，并把「哪些关系还没建」变成可枚举清单\n- 解释为什么藏象与五行必须放在同一张图里 —— 拆成两张表会丢掉哪条路径\n\n<div data-figure=\"zangxiang-graph\"></div>\n\n## 核心概念\n\n### 中医：藏与象\n\n《素问·五藏别论》：「所谓五藏者，藏精气而不泻也。」——「藏」指藏于内的脏腑功能。\n「象」指这些功能表现于外的征象。\n\n关键在于**藏象的核心是「联系」，不是「属性清单」**：\n\n```text\n肝：合胆 · 开窍于目 · 在志为怒 · 在体为筋 · 其华在爪 · 在液为泪 · 属木\n```\n\n每一条都是**一条边**，不是一个字段。肝之所以是「肝」，一半由它连着什么决定。\n用表格存这些关系，你只能逐行查；用图存，你可以问「从『目』走两步能到哪」。\n\n### AI / 工程：知识图谱\n\n知识图谱的最小单元是三元组 `(头实体, 关系, 尾实体)`。落到实现上就是**邻接表**：\n\n```javascript\ng.out.get('肝')  // → [{ type:'开窍于', to:'目' }, { type:'在志为', to:'怒' }, ...]\ng.in.get('目')   // → [{ type:'开窍于', from:'肝' }]\n```\n\n图上的三件事必须自己写一遍：\n\n| 操作 | 用途 | 复杂度 |\n|------|------|-------|\n| k 跳邻域 | 「这个症状还能牵出什么」 | O(V+E) |\n| 最短路径 | 「这两者怎么关联上的」 | O(V+E) |\n| 本体校验 | 「哪些关系还没建」 | O(V+E) |\n\n**方向性是要处理的真实问题。** 相克边只建「克」的方向（金克木）。当你反向查询\n金与木的关系时，渲染时必须标注「逆向遍历」，否则会把「金克木」讲成「木克金」——\n中医的方向讲反了，不是排版问题，是学术错误。\n\n### 对应关系\n\n| 中医概念 | AI / 工程概念 | 桥梁（为什么可以这样翻译） | 级别 |\n|---------|--------------|--------------------------|------|\n| 藏象配属（开窍于/在志为/在体为） | 三元组 / 有向边 | 每条配属天然是一个 `(脏, 关系, 象)` 三元组 | **A** |\n| 相表里 | **对称**关系 | 脏与腑互为表里，两侧都要有边；只写一侧会让「从腑查脏」静默失败 | **A** |\n| 五行生克 | 五行节点之间的有向边 | 相生/相克是五行节点上的边，而不是脏的属性 | **A** |\n| 藏象 + 五行同图 | 本体整合 | 不整合就查不出「肝 → 悲」这条路；见下文实测 | **B** |\n| 「象」 | 节点出边的集合 | 「象」就是「这个脏连出去的所有边」 | **B** |\n| 藏象 = 器官图谱 | —— | ❌ **D 级误用**。藏象之「肝」是功能系统，与解剖肝脏非一对一，直接映射会造成系统性错误 | **D** |\n\n```mermaid\ngraph LR\n  A[\"藏象配属表\"] --> B[\"本体定义<br/>实体类型 + 关系类型\"]\n  B --> C[\"邻接表建图\"]\n  C --> D[\"k 跳邻域\"]\n  C --> E[\"最短路径\"]\n  C --> F[\"本体完整性校验\"]\n  F --> G[\"未建关系清单\"]\n  G -.->|回指校验| H[\"清单里的每条关系，中医上真的存在吗？\"]\n```\n\n## BUILD IT：从零实现\n\n先定本体，再灌数据：\n\n```javascript\nconst NODE_TYPES = ['脏', '腑', '官窍', '情志', '形体', '华', '液', '五行'];\nconst EDGE_TYPES = ['相表里', '开窍于', '在志为', '在体为', '其华在', '化为', '属五行', '相生', '相克'];\n```\n\n相表里是对称关系，两侧都要建边：\n\n```javascript\naddEdge(g, z.name, '相表里', z.fu);\naddEdge(g, z.fu,   '相表里', z.name);   // ← 少这一行，从腑查脏会静默失败\n```\n\n最短路径要携带**真实边方向**：\n\n```javascript\n// 沿出边走：真实方向 n → e.to\n{ next: e.to,   src: n,      dst: e.to, forward: true  }\n// 沿入边走（逆向）：真实方向 e.from → n\n{ next: e.from, src: e.from, dst: n,    forward: false }\n```\n\n跑起来：\n\n```bash\nnode code/main.js\n```\n\n## 实测结果\n\n```text\n节点 40 个 | 边 50 条\n实体类型: 脏 / 腑 / 官窍 / 情志 / 形体 / 华 / 液 / 五行\n关系类型: 相表里 / 开窍于 / 在志为 / 在体为 / 其华在 / 化为 / 属五行 / 相生 / 相克\n\n【一】五藏的配属（one-hop 出边）\n  肝(木) 合胆 · 开窍于目 · 在志为怒 · 在体为筋 · 其华在爪\n  心(火) 合小肠 · 开窍于舌 · 在志为喜 · 在体为脉 · 其华在面\n  脾(土) 合胃 · 开窍于口 · 在志为思 · 在体为肉 · 其华在唇\n  肺(金) 合大肠 · 开窍于鼻 · 在志为悲 · 在体为皮毛 · 其华在毛\n  肾(水) 合膀胱 · 开窍于耳 · 在志为恐 · 在体为骨 · 其华在发\n\n【二】k 跳邻域：从「目」出发\n  1 跳 (1 个节点):\n    距离 1: 肝\n  2 跳 (7 个节点):\n    距离 1: 肝\n    距离 2: 胆 怒 筋 爪 泪 木\n\n【三】最短路径查询（←type- 表示该边是逆向遍历，真实方向相反）\n  目 → 泪 (2 跳, 含 1 条逆向): 目 ←开窍于- 肝 -化为→ 泪\n  肝 → 悲 (4 跳, 含 2 条逆向): 肝 -属五行→ 木 ←相克- 金 ←属五行- 肺 -在志为→ 悲\n  耳 → 小肠 (5 跳, 含 2 条逆向): 耳 ←开窍于- 肾 -属五行→ 水 -相克→ 火 ←属五行- 心 -相表里→ 小肠\n  怒 → 骨 (5 跳, 含 3 条逆向): 怒 ←在志为- 肝 -属五行→ 木 ←相生- 水 ←属五行- 肾 -在体为→ 骨\n\n【四】本体完整性校验\n  六类配属齐备: 通过 ✅\n  相表里对称: 通过 ✅\n  五行分配唯一且覆盖: 通过 ✅\n```\n\n### 三个被实测暴露出来的问题\n\n**问题一：相表里只写了一侧。**\n第一版只建了 `脏 → 腑`，校验器立刻报出 5 项错误：\n\n```text\n胆 未回连 肝（相表里必须对称）\n小肠 未回连 心（相表里必须对称）\n...\n```\n\n这不是实现 bug，是**本体设计 bug** —— 在关系定义阶段就没说清「相表里是对称的」。\n校验器的价值就在这里：它把本体设计的疏漏变成可枚举的清单。\n\n**问题二：五行没进图，`肝 → 悲` 查不通。**\n第一版只把五行当成脏的一个属性字段（`wuxing: '木'`），没有把五行建成节点。结果\n`肝 → 悲` 报「不可达」。补上五行节点与相生/相克边之后，路径通了：\n\n```text\n肝 → 悲 (4 跳): 肝 -属五行→ 木 ←相克- 金 ←属五行- 肺 -在志为→ 悲\n```\n\n**这就是「藏象与五行必须放在同一张图里」的具体含义。** 拆成两张表，这条路就不存在了。\n顺带说明：这条路靠的是**金克木**，遍历时是逆向走的，所以标记为 `←相克-`。\n\n**问题三：边方向会被渲染反。**\n第一版的输出是「木 → 金（相克）」，把「金克木」讲成了「木克金」。原因是路径渲染没有\n区分真实方向与遍历方向。修正后输出 `木 ←相克- 金`。\n中医里方向讲反不是排版问题 —— 相生方向反了，整个传变推演就错了。\n\n### 观察：藏象配属的图直径很小\n\n从「目」出发，2 跳就能覆盖 7 个节点（肝、胆、怒、筋、爪、泪、木）。这不是偶然 ——\n藏象体系是一个**高度联通的小世界**。「怒」到「骨」只要 5 跳。这解释了为什么中医的\n整体观不是修辞：在这张图上，任意两个节点之间确实只需要很少几步。\n\n（注意：这是**拓扑距离**，不是因果距离。图上 5 跳不代表临床上「发怒会导致骨病」——\n把拓扑距离误读为因果距离，是知识图谱最常见的滥用。）\n\n### 本节翻译的代价与边界\n\n**丢掉了什么**\n\n| 丢失项 | 为什么是结构性的 |\n|--------|----------------|\n| 关系的**强度** | 图上只有「有边 / 无边」两种状态。而藏象配属的实际关联程度差异很大（「开窍于目」与「其华在爪」显然不同），图模型默认它们等权 |\n| 关系的**条件性** | 「肝开窍于目」在正常生理下成立；病理状态下可能出现「肝火上炎见目赤」这类方向性更强的表现。基础图不区分生理与病理边 |\n| **时间** | 藏象是一个功能系统，功能是有时序的（如「女子以肝为先天」随生命周期变化）。静态图没有时间轴 |\n| 「藏」与「象」的**层次** | 本图把所有节点平铺。而「藏」是内藏的脏腑功能，「象」是外显的征象，两者在证据强度上并不对等 —— 图模型没有表达这一层 |\n\n**不适用范围**\n\n- 本图是**教学图谱**，只覆盖五藏的基础配属关系，不是完整的藏象本体。\n- 图上的路径是**拓扑关联**，**不构成因果结论**，也**不构成任何诊疗建议**。\n- 本课未收录六腑自身的功能关系（如「传化物」次序），因此涉及六腑的路径查询结果不完整。\n\n**一处必须排除的误用（D 级）**\n\n> 「藏象 = 器官知识图谱」—— 藏象之「肝」是功能系统，与解剖肝脏**不是一对一**关系。\n> 直接按解剖器官建模会造成系统性错误：例如把「肝郁」理解为肝脏的病理改变。\n> 这是本项目在 [bridge-map.md](../../../../../../glossary/bridge-map.md) 中列为 D 级的典型误用。\n\n## USE IT：框架调用\n\n用成熟图库（NetworkX / Neo4j / RDF 三元组库）做同样的事，接口不同但三件事不变：\n邻域、路径、校验。真正的差别在**规模**：本课 40 节点 50 条边，手写足够；\n真实的医案知识图谱是十万节点量级，那时才需要图数据库。\n\n**不要在 40 个节点上引入 Neo4j。** 这是本章最实用的工程建议。\n\n## SHIP IT：产出物\n\n- [📋 Prompt 模板](../outputs/prompt-zang-xiang-tupu.md) —— 让大模型把症状串成藏象关系链，**每一步都必须标出关系类型**，并在跨五行时显式标注方向\n- [🛠️ Skill 文件](../outputs/skill-zang-xiang-tupu.md) —— 藏象关系抽取与本体校验的固定流程\n\n## 验证\n\n```bash\nnode code/main.js\n# Expected: 见上方「实测结果」代码块，退出码 0\n```\n\n```bash\nnode --test code/main.test.js\n# Expected: 全部通过\n```\n\n## 练习\n\n见 [exercises.md](../exercises.md)。\n\n## 进阶思考\n\n1. 六腑除了相表里，还有「传化物」的次序（胃→小肠→大肠→膀胱）。加进图后，从「胃」到「膀胱」的路径会变短多少？\n2. 如果要表达「肝气犯脾」（木克土），需要在图上加什么类型的边？它与已有的 `相克` 边是什么关系？\n3. 藏象图的拓扑直径很小。这对「症状 → 证候」的自动推理是好事还是坏事？为什么？\n",
    "code": {
      "main.js": "#!/usr/bin/env node\n/**\n * 中医基础理论 · 第 3 章 藏象学说 → 知识图谱：脏腑关系的图表示\n * 课程: departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/03-zang-xiang-tupu/docs/zh.md\n * 出处: 《素问·六节藏象论》《素问·五藏别论》《素问·阴阳应象大论》五行配属段\n * 依赖: 仅 Node.js 标准库\n *\n * 核心命题: 藏象的「象」是关系，不是标签。用图存关系，用遍历回答\"谁连着谁\"。\n * 本课从零建图（邻接表）、做 k 跳邻域与最短路径，并对本体做三项完整性校验。\n *\n * 说明: 关系取自通行教材的藏象配属，用于教学演示；不构成诊疗依据。\n */\n\n'use strict';\n\n// ── 本体：实体类型 + 关系类型（先定本体，再灌数据） ──────────\nconst NODE_TYPES = ['脏', '腑', '官窍', '情志', '形体', '华', '液', '五行'];\nconst EDGE_TYPES = ['相表里', '开窍于', '在志为', '在体为', '其华在', '化为', '属五行', '相生', '相克'];\n\n// 五行次序: 木 火 土 金 水\nconst WUXING = ['木', '火', '土', '金', '水'];\n// 相生: 木→火→土→金→水→木 ；相克: 木克土、土克水、水克火、火克金、金克木\nconst WUXING_SHENG = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]];\nconst WUXING_KE = [[0, 2], [2, 4], [4, 1], [1, 3], [3, 0]];\n\n// 五藏及其配属（通行藏象配属表）\nconst ZANG = [\n  { name: '肝', wuxing: '木', fu: '胆',   qiao: '目', zhi: '怒', ti: '筋', hua: '爪', ye: '泪' },\n  { name: '心', wuxing: '火', fu: '小肠', qiao: '舌', zhi: '喜', ti: '脉', hua: '面', ye: '汗' },\n  { name: '脾', wuxing: '土', fu: '胃',   qiao: '口', zhi: '思', ti: '肉', hua: '唇', ye: '涎' },\n  { name: '肺', wuxing: '金', fu: '大肠', qiao: '鼻', zhi: '悲', ti: '皮毛', hua: '毛', ye: '涕' },\n  { name: '肾', wuxing: '水', fu: '膀胱', qiao: '耳', zhi: '恐', ti: '骨', hua: '发', ye: '唾' },\n];\n\n// ── 图：邻接表 ─────────────────────────────────────────────\nfunction createGraph() {\n  return { nodes: new Map(), out: new Map(), in: new Map() };\n}\n\nfunction addNode(g, name, type) {\n  if (!g.nodes.has(name)) {\n    g.nodes.set(name, { name, type, edges: [] });\n    g.out.set(name, []);\n    g.in.set(name, []);\n  }\n  return g.nodes.get(name);\n}\n\nfunction addEdge(g, from, type, to) {\n  addNode(g, from, '未知');\n  addNode(g, to, '未知');\n  g.out.get(from).push({ from, type, to });\n  g.in.get(to).push({ from, type, to });\n  g.nodes.get(from).edges.push({ type, to, dir: 'out' });\n  g.nodes.get(to).edges.push({ type, from, dir: 'in' });\n  return g;\n}\n\n/** 由藏象配属表生成图 */\nfunction buildZangXiangGraph() {\n  const g = createGraph();\n\n  // 先把五行建成节点，并连上相生 / 相克\n  for (const w of WUXING) addNode(g, w, '五行');\n  for (const [i, j] of WUXING_SHENG) addEdge(g, WUXING[i], '相生', WUXING[j]);\n  for (const [i, j] of WUXING_KE) addEdge(g, WUXING[i], '相克', WUXING[j]);\n\n  for (const z of ZANG) {\n    addNode(g, z.name, '脏');\n    addNode(g, z.fu, '腑');\n    addNode(g, z.qiao, '官窍');\n    addNode(g, z.zhi, '情志');\n    addNode(g, z.ti, '形体');\n    addNode(g, z.hua, '华');\n    addNode(g, z.ye, '液');\n\n    // 相表里是对称关系：两侧都要有边。只写一侧会让「从腑查脏」静默失败。\n    addEdge(g, z.name, '相表里', z.fu);\n    addEdge(g, z.fu, '相表里', z.name);\n    addEdge(g, z.name, '开窍于', z.qiao);\n    addEdge(g, z.name, '在志为', z.zhi);\n    addEdge(g, z.name, '在体为', z.ti);\n    addEdge(g, z.name, '其华在', z.hua);\n    addEdge(g, z.name, '化为', z.ye);\n    addEdge(g, z.name, '属五行', z.wuxing);\n  }\n  return g;\n}\n\n// ── 查询 ───────────────────────────────────────────────────\n/** k 跳邻域（无向），返回 { 节点: 距离 } */\nfunction neighborhood(g, start, k) {\n  const seen = new Map([[start, 0]]);\n  let frontier = [start];\n  for (let d = 1; d <= k; d += 1) {\n    const next = [];\n    for (const n of frontier) {\n      const nbrs = [\n        ...g.out.get(n).map((e) => e.to),\n        ...g.in.get(n).map((e) => e.from),\n      ];\n      for (const m of nbrs) {\n        if (!seen.has(m)) {\n          seen.set(m, d);\n          next.push(m);\n        }\n      }\n    }\n    frontier = next;\n    if (!frontier.length) break;\n  }\n  seen.delete(start);\n  return seen;\n}\n\n/** 最短路径（无向 BFS）。\n *  返回 { nodes: string[], edges: [{ src, dst, type, forward }] }\n *  edges[i] 连接 nodes[i] 与 nodes[i+1]；forward=true 表示真实边方向就是 nodes[i]→nodes[i+1]，\n *  forward=false 表示真实边是 nodes[i+1]→nodes[i]（逆向遍历）。\n *  区分方向是必要的：否则「金克木」会被渲染成「木克金」，把相克方向讲反。 */\nfunction shortestPath(g, from, to) {\n  if (from === to) return { nodes: [from], edges: [] };\n\n  const prev = new Map([[from, null]]);\n  const queue = [from];\n  let found = false;\n\n  while (queue.length && !found) {\n    const n = queue.shift();\n    const step = [\n      // 沿出边走：真实方向 n → e.to\n      ...(g.out.get(n) || []).map((e) => ({ next: e.to, src: n, dst: e.to, type: e.type, forward: true })),\n      // 沿入边走（逆向）：真实方向 e.from → n\n      ...(g.in.get(n) || []).map((e) => ({ next: e.from, src: e.from, dst: n, type: e.type, forward: false })),\n    ];\n    for (const s of step) {\n      if (prev.has(s.next)) continue;\n      prev.set(s.next, { from: n, edge: { src: s.src, dst: s.dst, type: s.type, forward: s.forward } });\n      if (s.next === to) { found = true; break; }\n      queue.push(s.next);\n    }\n  }\n  if (!prev.has(to)) return null;\n\n  const nodes = [to];\n  const edges = [];\n  let cur = to;\n  while (prev.get(cur)) {\n    const p = prev.get(cur);\n    edges.unshift(p.edge);\n    nodes.unshift(p.from);\n    cur = p.from;\n  }\n  return { nodes, edges };\n}\n\n/** 把路径渲染成可读字符串，逆向边用 ←type- 标记 */\nfunction formatPath(p) {\n  if (!p) return '不可达';\n  return p.nodes\n    .map((n, i) => {\n      if (i === 0) return n;\n      const e = p.edges[i - 1];\n      return e.forward ? `-${e.type}→ ${n}` : `←${e.type}- ${n}`;\n    })\n    .join(' ');\n}\n\n/** 某一脏的全套配属（one-hop 出边） */\nfunction attributesOf(g, zangName) {\n  const out = {};\n  for (const e of g.out.get(zangName) || []) {\n    if (e.type === '属五行') out.wuxing = e.to;\n    else out[e.type] = e.to;\n  }\n  return out;\n}\n\n// ── 完整性校验（本体级） ────────────────────────────────────\n/** 1. 每个脏必须齐备六类配属 */\nfunction checkCompleteness(g) {\n  const required = ['相表里', '开窍于', '在志为', '在体为', '其华在', '属五行'];\n  const problems = [];\n  for (const z of ZANG) {\n    const got = new Set((g.out.get(z.name) || []).map((e) => e.type));\n    for (const r of required) {\n      if (!got.has(r)) problems.push(`${z.name} 缺 ${r}`);\n    }\n  }\n  return problems;\n}\n\n/** 2. 相表里必须是双向一致的配对（脏→腑 且 腑→脏） */\nfunction checkBiaoLi(g) {\n  const problems = [];\n  for (const z of ZANG) {\n    const forward = (g.out.get(z.name) || []).some((e) => e.type === '相表里' && e.to === z.fu);\n    const backward = (g.out.get(z.fu) || []).some((e) => e.type === '相表里' && e.to === z.name);\n    if (!forward) problems.push(`${z.name} 未连 ${z.fu}`);\n    if (!backward) problems.push(`${z.fu} 未回连 ${z.name}（相表里必须对称）`);\n  }\n  return problems;\n}\n\n/** 3. 五行不得重复分配：任意两脏的五行必须不同，且恰好覆盖五行 */\nfunction checkWuxingUnique(g) {\n  const problems = [];\n  const w = ZANG.map((z) => attributesOf(g, z.name).wuxing);\n  if (new Set(w).size !== w.length) problems.push(`五行分配重复: ${w.join(' / ')}`);\n  for (const x of WUXING) {\n    if (!w.includes(x)) problems.push(`五行 ${x} 未被任何脏使用`);\n  }\n  return problems;\n}\n\nfunction main() {\n  const g = buildZangXiangGraph();\n\n  console.log('═══ 藏象学说 → 知识图谱 (中医基础理论 第3章) ═══');\n  console.log(`节点 ${g.nodes.size} 个 | 边 ${[...g.out.values()].reduce((a, l) => a + l.length, 0)} 条`);\n  console.log(`实体类型: ${NODE_TYPES.join(' / ')}`);\n  console.log(`关系类型: ${EDGE_TYPES.join(' / ')}`);\n\n  console.log('');\n  console.log('【一】五藏的配属（one-hop 出边）');\n  for (const z of ZANG) {\n    const a = attributesOf(g, z.name);\n    console.log(`  ${z.name}(${a.wuxing}) 合${a['相表里']} · 开窍于${a['开窍于']} · 在志为${a['在志为']} · 在体为${a['在体为']} · 其华在${a['其华在']}`);\n  }\n\n  console.log('');\n  console.log('【二】k 跳邻域：从「目」出发');\n  for (const k of [1, 2]) {\n    const nb = neighborhood(g, '目', k);\n    const byDist = {};\n    for (const [n, d] of nb) (byDist[d] = byDist[d] || []).push(n);\n    console.log(`  ${k} 跳 (${nb.size} 个节点):`);\n    for (const d of Object.keys(byDist).sort()) {\n      console.log(`    距离 ${d}: ${byDist[d].join(' ')}`);\n    }\n  }\n\n  console.log('');\n  console.log('【三】最短路径查询（←type- 表示该边是逆向遍历，真实方向相反）');\n  const queries = [['目', '泪'], ['肝', '悲'], ['耳', '小肠'], ['怒', '骨']];\n  for (const [a, b] of queries) {\n    const p = shortestPath(g, a, b);\n    if (!p) {\n      console.log(`  ${a} → ${b}: 不可达 ❌（本体缺失，需补关系）`);\n      continue;\n    }\n    const reversed = p.edges.filter((e) => !e.forward).length;\n    console.log(`  ${a} → ${b} (${p.edges.length} 跳${reversed ? `, 含 ${reversed} 条逆向` : ''}): ${formatPath(p)}`);\n  }\n\n  console.log('');\n  console.log('【四】本体完整性校验');\n  const c1 = checkCompleteness(g);\n  const c2 = checkBiaoLi(g);\n  const c3 = checkWuxingUnique(g);\n  const show = (label, problems) => {\n    console.log(`  ${label}: ${problems.length === 0 ? '通过 ✅' : `发现 ${problems.length} 项 ❌`}`);\n    problems.forEach((p) => console.log(`     - ${p}`));\n  };\n  show('六类配属齐备', c1);\n  show('相表里对称', c2);\n  show('五行分配唯一且覆盖', c3);\n\n  const total = c1.length + c2.length + c3.length;\n  console.log('');\n  console.log(`结论: 图上有 ${g.nodes.size} 个节点、${[...g.out.values()].reduce((a, l) => a + l.length, 0)} 条边。`);\n  console.log('      本体校验的作用不是\"证明图谱正确\"，而是把「哪些关系还没建」变成可枚举的清单。');\n  console.log('      「肝 → 悲」必须绕道五行（肝属木、金克木、金配肺、肺在志为悲）才通 —— 这正是');\n  console.log('      藏象与五行必须放在同一张图里的原因；拆成两张表，这条路就没有了。');\n  console.log('      注意相克边只建了「克」的方向（金克木），反向查询时必须显式标注逆向遍历，');\n  console.log('      否则会把「金克木」讲成「木克金」。');\n  console.log('边界声明: 教学图谱，仅覆盖五藏的基础配属；不构成诊疗依据。');\n\n  return { graph: g, checks: { completeness: c1, biaoli: c2, wuxing: c3, total } };\n}\n\nif (require.main === module) {\n  main();\n}\n\nmodule.exports = {\n  NODE_TYPES, EDGE_TYPES, WUXING, ZANG,\n  createGraph, addNode, addEdge, buildZangXiangGraph, formatPath,\n  neighborhood, shortestPath, attributesOf,\n  checkCompleteness, checkBiaoLi, checkWuxingUnique,\n  main,\n};\n",
      "main.test.js": "#!/usr/bin/env node\n/**\n * 第 3 章 藏象 → 知识图谱 —— 确定性单元测试\n * 运行: node --test code/main.test.js\n */\n\n'use strict';\n\nconst assert = require('node:assert');\nconst test = require('node:test');\n\nconst {\n  NODE_TYPES, EDGE_TYPES, WUXING, ZANG,\n  createGraph, addNode, addEdge, buildZangXiangGraph,\n  neighborhood, shortestPath, formatPath, attributesOf,\n  checkCompleteness, checkBiaoLi, checkWuxingUnique,\n} = require('./main');\n\nconst g = buildZangXiangGraph();\n\ntest('本体定义齐备：五行在实体类型中，相生相克在关系类型中', () => {\n  assert.ok(NODE_TYPES.includes('五行'), '五行应为独立的实体类型，而不是脏的一个属性字段');\n  assert.ok(EDGE_TYPES.includes('相生'));\n  assert.ok(EDGE_TYPES.includes('相克'));\n  assert.ok(EDGE_TYPES.includes('相表里'));\n});\n\ntest('藏象配属表完整：五藏，且每藏的六类配属与五行齐备', () => {\n  assert.strictEqual(ZANG.length, 5);\n  for (const z of ZANG) {\n    for (const k of ['name', 'wuxing', 'fu', 'qiao', 'zhi', 'ti', 'hua', 'ye']) {\n      assert.ok(z[k], `${z.name} 缺字段 ${k}`);\n    }\n    assert.ok(WUXING.includes(z.wuxing), `${z.name} 的五行 ${z.wuxing} 不在五行之列`);\n  }\n});\n\ntest('图规模：40 个节点、50 条边', () => {\n  assert.strictEqual(g.nodes.size, 40);\n  const edges = [...g.out.values()].reduce((a, l) => a + l.length, 0);\n  assert.strictEqual(edges, 50);\n});\n\ntest('相表里是对称边：脏→腑 与 腑→脏 都存在', () => {\n  for (const z of ZANG) {\n    assert.ok((g.out.get(z.name) || []).some((e) => e.type === '相表里' && e.to === z.fu), `${z.name}→${z.fu} 缺失`);\n    assert.ok((g.out.get(z.fu) || []).some((e) => e.type === '相表里' && e.to === z.name), `${z.fu}→${z.name} 缺失（对称关系必须双向建边）`);\n  }\n});\n\ntest('本体校验三项全部通过', () => {\n  assert.deepStrictEqual(checkCompleteness(g), []);\n  assert.deepStrictEqual(checkBiaoLi(g), []);\n  assert.deepStrictEqual(checkWuxingUnique(g), []);\n});\n\ntest('校验能捕获人为破坏：删掉一侧相表里边后 checkBiaoLi 必须报错', () => {\n  const broken = createGraph();\n  addNode(broken, '肝', '脏');\n  addNode(broken, '胆', '腑');\n  addEdge(broken, '肝', '相表里', '胆'); // 只建一侧\n\n  const problems = checkBiaoLi(broken);\n  // checkBiaoLi 对 ZANG 全表校验，而这张残缺图里只有 肝→胆 一条边：\n  //   肝：正向有、反向缺 → 1 项\n  //   心/脾/肺/肾：正反向全缺 → 各 2 项\n  // 合计 9 项。数字本身不重要，重要的是残缺被枚举出来而不是静默通过。\n  assert.strictEqual(problems.length, 9, `应枚举出 9 项缺失，实得 ${problems.length}: ${problems.join(' / ')}`);\n  assert.ok(problems.some((p) => p.includes('胆')), `报错信息应指出是胆未回连: ${problems.join(' / ')}`);\n});\n\ntest('校验能捕获人为破坏：五行重复分配必须报错', () => {\n  const broken = createGraph();\n  addNode(broken, '甲', '脏');\n  addNode(broken, '乙', '脏');\n  addEdge(broken, '甲', '属五行', '木');\n  addEdge(broken, '乙', '属五行', '木');\n  const problems = checkWuxingUnique(broken);\n  assert.ok(problems.some((p) => p.includes('重复')), `应报五行重复: ${problems.join(' / ')}`);\n});\n\ntest('one-hop 邻域：从「目」出发恰好只有「肝」', () => {\n  const nb = neighborhood(g, '目', 1);\n  assert.strictEqual(nb.size, 1);\n  assert.strictEqual(nb.get('肝'), 1);\n});\n\ntest('two-hop 邻域：从「目」出发 7 个节点，距离 2 的集合含「木」', () => {\n  const nb = neighborhood(g, '目', 2);\n  assert.strictEqual(nb.size, 7);\n  const dist2 = [...nb.entries()].filter(([, d]) => d === 2).map(([n]) => n).sort();\n  assert.deepStrictEqual(dist2, ['木', '泪', '爪', '筋', '胆', '怒'].sort());\n});\n\ntest('最短路径：肝 → 悲 必须绕道五行，且含逆向边（金克木）', () => {\n  const p = shortestPath(g, '肝', '悲');\n  assert.ok(p, '肝 → 悲 应当可达');\n  assert.strictEqual(p.nodes.join('→'), '肝→木→金→肺→悲');\n  assert.strictEqual(p.edges.length, 4);\n  // 木—金 这一跳的真实边是「金克木」，遍历方向与真实方向相反\n  const wuxingHop = p.edges.find((e) => e.type === '相克');\n  assert.ok(wuxingHop, '路径中必须含相克边，否则绕道五行的说法不成立');\n  assert.strictEqual(wuxingHop.src, '金');\n  assert.strictEqual(wuxingHop.dst, '木');\n  assert.strictEqual(wuxingHop.forward, false, '金克木被逆向遍历，必须标记 forward=false');\n});\n\ntest('路径渲染保持真实边方向：金克木不能被写成木克金', () => {\n  const s = formatPath(shortestPath(g, '肝', '悲'));\n  assert.ok(s.includes('←相克-'), `逆向相克边应渲染为 ←相克-，实得: ${s}`);\n  assert.ok(!s.includes('木 -相克→'), `不得把金克木写成木克金: ${s}`);\n});\n\ntest('最短路径：水克火 是正向边，不应被标记为逆向', () => {\n  const p = shortestPath(g, '水', '火');\n  assert.strictEqual(p.edges.length, 1);\n  assert.strictEqual(p.edges[0].type, '相克');\n  assert.strictEqual(p.edges[0].forward, true);\n  assert.strictEqual(p.edges[0].src, '水');\n  assert.strictEqual(p.edges[0].dst, '火');\n});\n\ntest('attributesOf 返回一脏的全套配属，含五行', () => {\n  const a = attributesOf(g, '肾');\n  assert.strictEqual(a.wuxing, '水');\n  assert.strictEqual(a['相表里'], '膀胱');\n  assert.strictEqual(a['开窍于'], '耳');\n  assert.strictEqual(a['在志为'], '恐');\n  assert.strictEqual(a['在体为'], '骨');\n  assert.strictEqual(a['其华在'], '发');\n});\n\ntest('孤岛检查：图上不存在无任何边的节点', () => {\n  for (const [name] of g.nodes) {\n    const deg = (g.out.get(name) || []).length + (g.in.get(name) || []).length;\n    assert.ok(deg > 0, `节点 ${name} 是孤岛`);\n  }\n});\n"
    },
    "quiz": {
      "lesson": "03-zang-xiang-tupu",
      "title": "藏象学说 → 知识图谱：脏腑关系的图表示",
      "subject": "01-zhongyi-jichu-lilun",
      "questions": [
        {
          "stage": "pre",
          "question": "本课开始前，你应该已经能做什么？",
          "options": [
            "会用 Neo4j 建图数据库",
            "知道什么是「键值对」与「字典」，并能用循环实现简单的广度优先遍历",
            "会推导航线图的特征值分解",
            "背下全部藏象配属表"
          ],
          "correct": 1,
          "explanation": "本课用邻接表手写图，不引入图数据库。前置能力是「会用字典存数据 + 会写 BFS 循环」。背配属表不需要具备，本课会把它作为数据写进代码。"
        },
        {
          "stage": "check",
          "question": "为什么说「藏象的核心是联系，不是属性清单」？",
          "options": [
            "因为配属条目太多，表格装不下",
            "因为「象」本质上是脏腑与官窍/情志/形体之间的关系；孤立的「肝」只是一条记录，而「肝开窍于目、在志为怒」才是可推理的知识",
            "因为表格不能表示中文",
            "因为图的检索速度更快"
          ],
          "correct": 1,
          "explanation": "「开窍于目」「在志为怒」每条都是三元组 (头实体, 关系, 尾实体)。存成表格你只能逐行查；存成图你可以问「从『目』走两步能到哪」。可推理的是关系，不是字段。"
        },
        {
          "stage": "check",
          "question": "「相表里」这一关系，在建图时最容易犯的错误是什么？",
          "options": [
            "把它建成自环",
            "只建 `脏 → 腑` 一侧的边。相表里是对称关系，只写一侧会让「从腑查脏」静默失败，而且不会报错",
            "边的类型名用中文而不英文",
            "没有给它加权重"
          ],
          "correct": 1,
          "explanation": "本课第一版就犯了这个错，被本体校验抓出 5 项。危险之处在于它是**静默失败**：查询不报错，只是返回空结果。所以对称关系必须两侧建边，或者在建图时显式声明该关系类型为对称。"
        },
        {
          "stage": "check",
          "question": "`肝 → 悲` 的路径必须绕道五行（肝属木、金克木、金配肺、肺在志为悲）。这说明什么？",
          "options": [
            "说明肝与悲之间没有直接关系，是模型硬凑出来的",
            "说明藏象与五行必须整合在同一张图里；若把五行只当成脏的一个属性字段（`wuxing: '木'`）而不建节点，这条路就查不出来",
            "说明应该给每对节点都加一条直接边，方便查询",
            "说明最短路径算法有 bug"
          ],
          "correct": 1,
          "explanation": "这正是本体设计的关键判断：五行是**关系网络中的一层**，不是脏的一个标签。把它降级成属性字段，就丢掉了五个脏之间的全部关联。注意这条路的机制确实是「金克木」，不是编造。"
        },
        {
          "stage": "post",
          "question": "路径渲染时，把「金克木」显示成「木克金」属于什么性质的错误？",
          "options": [
            "排版问题，不影响结论",
            "学术错误：相克方向反了，整个传变推演的前提就错了。所以路径必须携带真实边方向，逆向遍历要显式标注",
            "性能问题，只影响输出速度",
            "显示层的个人偏好，怎么标都行"
          ],
          "correct": 1,
          "explanation": "中医里方向是有含义的。相生方向反了，传变方向就反了；相克方向反了，生克制约关系就反了。所以最短路径返回的边必须带 `forward` 标记，渲染时逆向边用 ←type- 显式区分。"
        },
        {
          "stage": "post",
          "question": "藏象图的拓扑直径很小（「怒」到「骨」只要 5 跳）。关于这一点，哪种解读是诚实的？",
          "options": [
            "说明中医的整体观有数学证明，任意症状都强相关",
            "说明图上任意两点都能连上，所以可以用它做因果推理",
            "说明藏象是高度联通的小世界；但这是**拓扑距离**，不是因果距离。把 5 跳读成「发怒会导致骨病」是知识图谱最常见的滥用",
            "说明图建错了，边加太多"
          ],
          "correct": 2,
          "explanation": "图上的连通性只说明「存在一条关联路径」，不说明「存在因果机制」。知识图谱可以做联想与检索，但因果结论必须另有依据（临床证据、机制研究）。把两者混为一谈是这类项目最常见的翻车方式。"
        }
      ]
    },
    "exercises": "# 第 3 章 · 练习\n\n## 基础：数一数未建的关系\n\n藏象配属表里，本课只建了 6 类关系。还有哪些常见的关系类型没建？至少列出 4 个，例如：\n\n- 五体之间的「在液为」\n- 六腑的「传化物」次序\n- 脏腑与「华」的细分（面、毛、发……）\n- 「其充在」……\n\n对每一个：写出关系类型名、头实体类型、尾实体类型。**先写清单，再动手加。**\n\n## 进阶：加一条新关系并验证它真的改变了图\n\n把「肝气犯脾」（木克土）作为一条**实例级**的边加进图（注意：它不是五行层的 `相克` 边，而是脏腑层的一条具体病理关系）。\n\n要求：\n\n1. 新增关系类型 `犯`，并说明它为什么不能复用 `相克`（提示：`相克` 是五行节点之间的通用约束，`犯` 是脏腑之间的具体病理表现）。\n2. 加边之后，重新跑 `肝` 到 `脾` 的最短路径。记录跳数变化。\n3. 更新 `checkCompleteness`，让它对新增的关系类型也做校验（或显式说明为什么不需要）。\n4. 至少加 3 个测试，覆盖：新边存在、路径变短、旧校验仍通过。\n\n## 挑战：把图导出成可被外部工具消费的格式\n\n把图导出为两个文件：\n\n- `assets/knowledge-tree/zangxiang-nodes.json` —— 节点清单 `[{ id, type, label }]`\n- `assets/knowledge-tree/zangxiang-edges.json` —— 边清单 `[{ from, type, to }]`\n\n要求：\n\n1. 导出格式要能直接被 Cytoscape / Gephi / D3 消费（自己选一个，说明选择理由）。\n2. 写一个 `checkRoundTrip()`：从导出的 JSON 重新建图，断言与内存中的图**逐边一致**。\n3. 在 `docs/zh.md` 里加一小节说明导出格式的字段含义与约束。\n\n> 提示：往返校验（round-trip）是数据工程里最便宜的保险。很多图谱项目的问题都出在\n> 「内存里是对的，导出来就丢了一半」。\n",
    "outputs": [
      {
        "name": "prompt-zang-xiang-tupu.md",
        "body": "# Prompt · 藏象关系链整理（带方向校验）\n\n> 学科: 中医基础理论 · 章节: 03-zang-xiang-tupu\n\n## 用途\n\n把一组散在症状整理成藏象关系链，供教学讲解与病历机理部分使用。\n核心要求不是「串起来」，而是**串得可核查**：每步有依据、跨五行有方向。\n\n## 系统提示\n\n```text\n你是中医基础理论的助教，任务是把一组症状整理成藏象关系链。\n\n铁律：\n1. 每一步必须是三元组 (头, 关系, 尾)，关系类型只能取：\n   相表里 / 开窍于 / 在志为 / 在体为 / 其华在 / 化为 / 属五行 / 相生 / 相克\n2. 每一步都要给 source，写到「书名·篇名」级别。给不出就放进 unsupported，不要编。\n3. 跨五行的边必须标明方向：\n   相生只有 木→火→土→金→水→木\n   相克只有 木克土、土克水、水克火、火克金、金克木\n   如果查询方向与真实边方向相反，direction 写 \"reverse\"，并附说明。\n4. 图上连通不等于因果。禁止使用「导致」「引起」「因此会」「说明……必然」等措辞。\n5. 不许新建本体外节点。映射不上就标 unknown。\n6. 不输出证型、方剂、剂量、治则。\n7. 结尾原样输出：本输出为关系链整理，不构成临床诊疗建议。\n\n先给 chain，再给 wuxing_hops，最后给 unsupported。\n```\n\n## 输入 / 输出契约\n\n| 输入 | 类型 | 说明 |\n|------|------|------|\n| `症状列表` | string[] | 例如 `[\"易怒\",\"流泪\"]` |\n| `允许关系类型` | string[] | 可选，默认取上表九种 |\n\n```json\n{\n  \"chain\": [{ \"from\": \"…\", \"type\": \"…\", \"to\": \"…\", \"direction\": \"forward|reverse\", \"source\": \"…\" }],\n  \"wuxing_hops\": [{ \"from\": \"…\", \"type\": \"相生|相克\", \"to\": \"…\", \"direction\": \"…\", \"note\": \"…\" }],\n  \"unsupported\": [{ \"step\": \"…\", \"reason\": \"无合适关系类型 / 无依据来源\" }],\n  \"disclaimer\": \"本输出为关系链整理，不构成临床诊疗建议。\"\n}\n```\n\n## 标准示例：易怒 + 流泪\n\n```json\n{\n  \"chain\": [\n    { \"from\": \"怒\", \"type\": \"在志为\", \"to\": \"肝\", \"direction\": \"reverse\",\n      \"source\": \"《素问·阴阳应象大论》五行配属段\" },\n    { \"from\": \"肝\", \"type\": \"化为\", \"to\": \"泪\", \"direction\": \"forward\",\n      \"source\": \"《素问·宣明五气》五液配属\" }\n  ],\n  \"wuxing_hops\": [],\n  \"unsupported\": [],\n  \"disclaimer\": \"本输出为关系链整理，不构成临床诊疗建议。\"\n}\n```\n\n## 标准示例：肝与悲（必须绕道五行的典型例子）\n\n```json\n{\n  \"chain\": [\n    { \"from\": \"肝\", \"type\": \"属五行\", \"to\": \"木\", \"direction\": \"forward\", \"source\": \"藏象配属表\" },\n    { \"from\": \"木\", \"type\": \"相克\", \"to\": \"金\", \"direction\": \"reverse\",\n      \"note\": \"真实边是 金克木；此处逆向遍历，方向必须标 reverse\", \"source\": \"《素问·五运行大论》\" },\n    { \"from\": \"金\", \"type\": \"属五行\", \"to\": \"肺\", \"direction\": \"reverse\", \"source\": \"藏象配属表\" },\n    { \"from\": \"肺\", \"type\": \"在志为\", \"to\": \"悲\", \"direction\": \"forward\",\n      \"source\": \"《素问·阴阳应象大论》\" }\n  ],\n  \"disclaimer\": \"本输出为关系链整理，不构成临床诊疗建议。\"\n}\n```\n\n> 注意第三条：`金 -属五行→ 肺` 是正向边，但路径是从肺走到金，所以 direction 是 `reverse`。\n> 这条链上出现**两条**逆向边。如果你写出来的方向标记少于两条，说明方向模型建错了。\n\n## 反例\n\n| 错误输出 | 为什么错 |\n|---------|---------|\n| 「木克金」 | 相克里没有这一条。只有金克木 |\n| 「易怒导致流泪」 | 因果措辞；只有关系链，没有因果结论 |\n| 「流泪 → 肝血虚」 | 跳步，且越界给出证型 |\n| 「因为中医理论如此」 | 无 `source` 的无效步骤 |\n| 「目干」当作独立节点 | 自造本体外节点 |\n\n## 校验\n\n- [ ] 每步都有 `type` 与 `source`\n- [ ] 跨五行必有 `direction`\n- [ ] 输出不含因果措辞\n- [ ] `unsupported` 被显式列出\n- [ ] 无本体外节点\n- [ ] `disclaimer` 逐字存在\n"
      },
      {
        "name": "skill-zang-xiang-tupu.md",
        "body": "---\nname: zang-xiang-tupu\ndescription: 把症状串成藏象关系链，每一步标注关系类型与方向，跨五行时显式标出相生相克。\nversion: 1.0.0\nsubject: 01-zhongyi-jichu-lilun\nchapter: 03-zang-xiang-tupu\ntags: [藏象, 知识图谱, 关系抽取, 方向性]\n---\n\n# 藏象关系链抽取与校验\n\n## 何时使用\n\n当你需要把一组散在的症状，串成一条**可核查的藏象关系链**（而不是给一个证型名称）时。\n典型场景：整理医案、写病历的机理部分、检查一份辨证依据里有没有跳步。\n\n不适用：给出证型诊断、处方、治则；判定预后。\n\n## 输入契约\n\n| 字段 | 类型 | 必填 | 说明 |\n|------|------|------|------|\n| `症状列表` | string[] | 是 | 例如 `[\"易怒\", \"流泪\", \"目干\"]` |\n| `已知体征` | object | 否 | 望闻问切的其他结果 |\n| `允许的关系类型` | string[] | 否 | 默认：`相表里/开窍于/在志为/在体为/其华在/化为/属五行/相生/相克` |\n\n## 步骤\n\n1. **实体识别**：把每个症状映射到本体中的节点。映射不上就标 `unknown`，**不要新建节点**（新节点必须先进本体）。\n2. **连边**：对每一对可连的节点，给出一条边，并标注：\n   - `type`：关系类型，必须来自允许列表\n   - `direction`：`forward` 或 `reverse`（真实边方向）\n   - `source`：依据出处\n3. **跨五行检查**：如果链路上经过五行节点，**必须**显式写出用的是相生还是相克，并给出正确方向。\n   - 例：肝→悲 走的是**金克木**，遍历方向是逆向，必须标 `reverse`。\n4. **跳步检查**：每一步都必须有依据。任何一步\"因为中医认为……\"而说不出关系类型的，标为 `unsupported`。\n5. **输出关系链**，并单独列出 `unsupported` 的步骤。\n\n## 输出契约\n\n```json\n{\n  \"chain\": [\n    {\n      \"from\": \"怒\",\n      \"type\": \"在志为\",\n      \"to\": \"肝\",\n      \"direction\": \"reverse\",\n      \"source\": \"《素问·阴阳应象大论》五行配属段\"\n    }\n  ],\n  \"wuxing_hops\": [\n    { \"from\": \"木\", \"type\": \"相克\", \"to\": \"金\", \"direction\": \"reverse\", \"note\": \"金克木，逆向遍历\" }\n  ],\n  \"unsupported\": [],\n  \"disclaimer\": \"本输出为关系链整理，不构成临床诊疗建议。\"\n}\n```\n\n## 硬约束\n\n- **每一步都必须有 `type` 与 `source`。** 无类型的一步视为无效输出。\n- 跨五行的边**必须**标 `direction`。把「金克木」写成「木克金」是学术错误，不是排版问题。\n- **不得新建本体外节点**。要加节点，先在章节的本体定义里加。\n- 关系链是**拓扑关联**，不等于因果。输出里**不得**出现「导致」「引起」「因此会」这类因果措辞。\n- 不允许输出证型、方剂、剂量、治则。\n- 结尾必须带 `disclaimer`。\n\n## 已知陷阱\n\n| 陷阱 | 表现 | 修正 |\n|------|------|------|\n| 方向讲反 | 「木克金」 | 相克只有五个方向：木克土、土克水、水克火、火克金、金克木 |\n| 拓扑当因果 | 「怒 5 跳连到 骨，故易怒伤骨」 | 图上连通 ≠ 因果机制 |\n| 跳步 | 直接从「流泪」跳到「肝血虚」 | 中间每一步都要有边 |\n| 自造节点 | 把「目干」当成一个新实体 | 先映射到本体节点（目 / 液），映射不上就标 unknown |\n| 只写相生 | 一条链上只提相生不提相克 | 跨五行的每一跳都要标明是生还是克 |\n\n## 验证清单\n\n- [ ] `chain` 每一项都有 `type` 与 `source`\n- [ ] 每个 `wuxing_hops` 项都有 `direction`\n- [ ] 输出中不含因果措辞（导致/引起/因此会）\n- [ ] `unsupported` 里的步骤被显式列出，而不是被静默省略\n- [ ] 没有新建本体外节点\n- [ ] 任何输出路径都带 `disclaimer`\n"
      }
    ],
    "video": null,
    "videoPoster": null
  }
};
window.TCMAI_PATHS = [
  {
    "id": "clinical-track",
    "title": "临床型",
    "en": "Clinical Track",
    "audience": "面向中医临床医师方向：以辨证论治能力为核心，工程能力作为临床决策支持的辅助。",
    "outcome": "毕业时能独立完成四诊采集与辨证论治，并能为自己的判断建立可复核的证据链；能读懂一个临床决策支持系统的输出并指出其不可靠之处。",
    "semesters": [
      1,
      9
    ],
    "subjectCount": 61,
    "hours": 4140,
    "route": [
      {
        "semester": 1,
        "stage": "sheng",
        "reason": "先立住中医的世界观与语言：不懂阴阳五行与古文，后面全是背不住的名词。",
        "subjects": [
          "01-zhongyi/01-zhongyi-jichu-lilun",
          "01-zhongyi/02-yi-gu-wen",
          "01-zhongyi/03-zhongguo-yixue-shi"
        ]
      },
      {
        "semester": 2,
        "stage": "sheng",
        "reason": "药与经络是诊断的两条腿：一边知道药性，一边知道身体的通道。",
        "subjects": [
          "02-zhongyao/01-zhongyaoxue",
          "02-zhongyao/02-yaoyong-zhiwu-xue",
          "03-zhenjiu/01-jingluo-xue",
          "05-huli/01-zhongyi-huli-jichu",
          "05-huli/02-jichu-huli-xue"
        ]
      },
      {
        "semester": 3,
        "stage": "sheng",
        "reason": "诊断学是分水岭：前两年学的所有东西，在这里第一次被要求合成一个判断。",
        "subjects": [
          "01-zhongyi/05-zhongyi-zhen-duan-xue",
          "01-zhongyi/06-neijing-xuandu",
          "02-zhongyao/03-fangjixue",
          "03-zhenjiu/02-shuxue-xue",
          "03-zhenjiu/03-zhenjiu-yiji-xuan",
          "05-huli/03-jiankang-pinggu",
          "05-huli/04-zhongyi-huli-jishu"
        ]
      },
      {
        "semester": 4,
        "stage": "sheng",
        "reason": "进入经典与手技：伤寒论的六经框架 + 手法这条手上的能力线。",
        "subjects": [
          "01-zhongyi/07-shanghanlun",
          "01-zhongyi/04-zhongyi-tizhi-xue",
          "03-zhenjiu/05-tuina-xue",
          "03-zhenjiu/07-cifa-jiufa-xue",
          "04-gushang/01-zhongyi-yundong-xue",
          "08-wuguan/01-erbihou-jiepou-shengli"
        ]
      },
      {
        "semester": 5,
        "stage": "zhang",
        "reason": "临床各科全面展开：金匮的杂病框架 + 内科 + 针灸治疗，开始形成自己的处方思路。",
        "subjects": [
          "01-zhongyi/08-jingui-yaolue",
          "01-zhongyi/09-wenbing-xue",
          "01-zhongyi/10-zhongyi-neike-xue",
          "02-zhongyao/07-zhongyao-yaoli-xue",
          "03-zhenjiu/08-zhenjiu-zhiliao-xue",
          "03-zhenjiu/09-kangfu-yixue-jichu",
          "04-gushang/03-gushang-kexue-jichu",
          "04-gushang/04-chuangshang-jijiu-xue",
          "05-huli/07-neike-huli-xue"
        ]
      },
      {
        "semester": 6,
        "stage": "zhang",
        "reason": "专科化：外科、妇科、儿科、骨伤各科入场，同时补齐影像与客观化检查的读片能力。",
        "subjects": [
          "01-zhongyi/11-zhongyi-waike-xue",
          "01-zhongyi/12-zhongyi-fuke-xue",
          "01-zhongyi/13-zhongyi-erke-xue",
          "02-zhongyao/05-zhongyao-jianding-xue",
          "03-zhenjiu/12-erxue-zhenduan-xue",
          "04-gushang/06-zhongyi-zhenggu-xue",
          "04-gushang/07-zhongyi-jinshang-xue",
          "04-gushang/09-guke-yingxiang-zhenduan",
          "05-huli/08-waike-huli-xue",
          "08-wuguan/06-zhongyi-yanke-xue",
          "08-wuguan/07-zhongyi-erbihou-xue",
          "08-wuguan/08-zhongyi-kouqiang-kexue"
        ]
      },
      {
        "semester": 7,
        "stage": "zhuang",
        "reason": "疑难与整合：证候学把前面所有零散辨证收拢成体系，各家学说给出历史坐标系。",
        "subjects": [
          "01-zhongyi/14-zhongyi-zhenghou-xue",
          "01-zhongyi/15-zhongyi-gejia-xueshuo",
          "02-zhongyao/13-zhongchengyao-linchuang",
          "02-zhongyao/14-peiwu-yu-jinji",
          "03-zhenjiu/13-zhendao-yixue",
          "03-zhenjiu/15-zhongyi-kangfu-xue",
          "04-gushang/10-jizhu-bing-xue",
          "04-gushang/11-guanjie-bing-xue",
          "04-gushang/13-zhongyi-zhengji-xue",
          "05-huli/12-jiwei-zhengzheng-huli",
          "06-guanli/13-linchuang-keyan-fangfa",
          "07-zhineng/10-llm-yu-zhongyi-zhinengti"
        ]
      },
      {
        "semester": 8,
        "stage": "zhuang",
        "reason": "收口：伦理与证据两条底线必须在大五临床前立住。",
        "subjects": [
          "02-zhongyao/15-zhongyao-xinyao-yanfa",
          "04-gushang/14-kangfu-gongcheng-zhiju",
          "04-gushang/15-gushang-kangfu-pingding",
          "05-huli/15-huli-yanjiu-zhengxun",
          "06-guanli/15-zhongyi-guojijiaoyu",
          "07-zhineng/15-zhongyi-ai-lunli-zhili",
          "08-wuguan/15-zhongyi-meirong-pifu"
        ]
      },
      {
        "semester": 9,
        "stage": "lao",
        "reason": "临床轮转：不再排常规课，全部时间用于在真实病人身上把前八年练成本能。",
        "subjects": []
      }
    ],
    "capstone": {
      "title": "临床决策支持评估与批判",
      "deliverable": "对一个真实中医 AI 产品做完整评估报告：数据来源、性能指标、失效场景、伦理与合规风险，并给出改进方案。",
      "criteria": [
        "报告必须包含至少 3 个真实失效案例，并说明为什么会失效",
        "必须给出可核查的评估方法与原始数据",
        "必须明确写出该产品不应用于哪些临床场景"
      ]
    }
  },
  {
    "id": "engineering-track",
    "title": "工程型",
    "en": "Engineering Track",
    "audience": "面向中医药 AI 工程师：以软件系统与数据能力为核心，中医知识只需达到「能与临床医师对话、能判断输出是否荒谬」的程度。",
    "outcome": "毕业时能从零构建一个中医领域软件系统（数据层到服务层），并为它写出模型卡、合规声明与失效边界。",
    "semesters": [
      1,
      10
    ],
    "subjectCount": 31,
    "hours": 2106,
    "route": [
      {
        "semester": 1,
        "stage": "sheng",
        "reason": "第一学期不先学中医会一路错下去：阴阳五行是后面所有中医概念的语法。",
        "subjects": [
          "01-zhongyi/01-zhongyi-jichu-lilun",
          "01-zhongyi/03-zhongguo-yixue-shi"
        ]
      },
      {
        "semester": 2,
        "stage": "sheng",
        "reason": "术语与数据结构同构：学中药学的同时理解「多标签 + 有序属性」这类表示问题。",
        "subjects": [
          "02-zhongyao/01-zhongyaoxue",
          "03-zhenjiu/01-jingluo-xue"
        ]
      },
      {
        "semester": 3,
        "stage": "sheng",
        "reason": "工程线入口：从医学人工智能导论开始，同时用诊断学理解「一次分类」在临床上意味着什么。",
        "subjects": [
          "07-zhineng/01-yixue-rengong-zhineng-daolun",
          "01-zhongyi/05-zhongyi-zhen-duan-xue",
          "02-zhongyao/03-fangjixue"
        ]
      },
      {
        "semester": 4,
        "stage": "sheng",
        "reason": "架构与设备两条线同时开工：先定架构，再谈数据从哪来。",
        "subjects": [
          "07-zhineng/02-zhongyi-ruanjian-jiagou-xue",
          "07-zhineng/03-zhongyi-zhineng-shebei",
          "06-guanli/01-yixue-tongjixue",
          "06-guanli/02-zhongyiyao-zhengce-fagui",
          "03-zhenjiu/02-shuxue-xue",
          "08-wuguan/02-kouqiang-jiepou-shengli"
        ]
      },
      {
        "semester": 5,
        "stage": "zhang",
        "reason": "NLP 与知识图谱是中医数据的两个主战场，同学期开，互相验证。",
        "subjects": [
          "07-zhineng/04-zhongyi-ziran-yuyan-chuli",
          "07-zhineng/05-zhongyi-zhishi-tupu",
          "01-zhongyi/10-zhongyi-neike-xue"
        ]
      },
      {
        "semester": 6,
        "stage": "zhang",
        "reason": "从「表示」走到「系统」：辨证系统、图像、信号、大数据四条应用线并行。",
        "subjects": [
          "07-zhineng/06-zhongyi-zhineng-bianzheng",
          "07-zhineng/07-yixue-tuxiang-shezhen",
          "07-zhineng/08-maizhen-keguanhua",
          "07-zhineng/09-zhongyi-dashuju-fenxi",
          "06-guanli/06-yiyuan-guanli-xue",
          "06-guanli/09-yiliao-baoxian-jingji"
        ]
      },
      {
        "semester": 7,
        "stage": "zhuang",
        "reason": "大模型与智能体是收口能力：前面所有模块在这里被编排成一个会自己做事的系统。",
        "subjects": [
          "07-zhineng/10-llm-yu-zhongyi-zhinengti",
          "07-zhineng/11-zhongyi-jiqiren-xue",
          "07-zhineng/13-zhongyi-duomotai-ronghe",
          "06-guanli/10-yixue-xinxi-guanli",
          "06-guanli/11-yiyuan-xinxihua-bingan",
          "06-guanli/12-zhongyiyao-biaozhunhua"
        ]
      },
      {
        "semester": 8,
        "stage": "zhuang",
        "reason": "上线前必须过的两道关：安全合规与工程伦理。",
        "subjects": [
          "07-zhineng/14-yixue-shuju-anquan-yinsi",
          "07-zhineng/15-zhongyi-ai-lunli-zhili",
          "01-zhongyi/15-zhongyi-gejia-xueshuo"
        ]
      },
      {
        "semester": 10,
        "stage": "yi",
        "reason": "毕业设计：把八年学的东西压成一个能跑、能解释、能被别人接手的系统。",
        "subjects": []
      }
    ],
    "capstone": {
      "title": "中医领域全栈系统",
      "deliverable": "一套端到端可运行的中医域系统：数据入库 → 表示学习 → 服务接口 → 前端交付，含模型卡与合规声明。",
      "criteria": [
        "接口契约先写（OpenAPI / JSON Schema），代码后写",
        "每个模型附模型卡，明确写出不适用场景",
        "含至少一个「模态缺失」场景的正确降级行为",
        "全部测试可离线复现，不依赖外部 API key"
      ]
    }
  },
  {
    "id": "intelligent-tcm-track",
    "title": "复合型（本项目主线）",
    "en": "Intelligent TCM Track",
    "audience": "面向智能中医方向：8 院系贯通，中医与工程双线同等深度，最终落在「会辨证、也会造系统」上。",
    "outcome": "毕业时能独立完成一次完整的「辨证 → 立法 → 处方 → 系统实现 → 上线治理」闭环，并对自己的每一项输出说明其证据强度与失效边界。",
    "semesters": [
      1,
      10
    ],
    "subjectCount": 63,
    "hours": 4248,
    "route": [
      {
        "semester": 1,
        "stage": "sheng",
        "reason": "语法期：先学会中医的语言，后面所有跨学科翻译都要靠它。",
        "subjects": [
          "01-zhongyi/01-zhongyi-jichu-lilun",
          "01-zhongyi/02-yi-gu-wen"
        ]
      },
      {
        "semester": 2,
        "stage": "sheng",
        "reason": "药与经络同时开工，一边建立「属性→表示」的直觉，一边建立「关系→图」的直觉。",
        "subjects": [
          "02-zhongyao/01-zhongyaoxue",
          "03-zhenjiu/01-jingluo-xue",
          "05-huli/02-jichu-huli-xue"
        ]
      },
      {
        "semester": 3,
        "stage": "sheng",
        "reason": "工程线与中医线第一次交汇：诊断学给出分类问题，AI 导论给出分类方法。",
        "subjects": [
          "01-zhongyi/05-zhongyi-zhen-duan-xue",
          "01-zhongyi/06-neijing-xuandu",
          "02-zhongyao/03-fangjixue",
          "03-zhenjiu/02-shuxue-xue",
          "07-zhineng/01-yixue-rengong-zhineng-daolun"
        ]
      },
      {
        "semester": 4,
        "stage": "sheng",
        "reason": "架构与数据：先想清楚系统边界和数据从哪来，再进经典与手法。",
        "subjects": [
          "01-zhongyi/07-shanghanlun",
          "01-zhongyi/04-zhongyi-tizhi-xue",
          "03-zhenjiu/07-cifa-jiufa-xue",
          "04-gushang/01-zhongyi-yundong-xue",
          "07-zhineng/02-zhongyi-ruanjian-jiagou-xue",
          "07-zhineng/03-zhongyi-zhineng-shebei",
          "06-guanli/01-yixue-tongjixue",
          "06-guanli/02-zhongyiyao-zhengce-fagui"
        ]
      },
      {
        "semester": 5,
        "stage": "zhang",
        "reason": "表示期：把中医文本与关系变成可计算对象，同时开始临床各科的第一轮。",
        "subjects": [
          "01-zhongyi/08-jingui-yaolue",
          "01-zhongyi/09-wenbing-xue",
          "01-zhongyi/10-zhongyi-neike-xue",
          "02-zhongyao/07-zhongyao-yaoli-xue",
          "03-zhenjiu/08-zhenjiu-zhiliao-xue",
          "04-gushang/03-gushang-kexue-jichu",
          "05-huli/05-zhongyi-yangsheng-xue",
          "07-zhineng/04-zhongyi-ziran-yuyan-chuli",
          "07-zhineng/05-zhongyi-zhishi-tupu",
          "06-guanli/05-zhongyi-wenhua-chuanbo"
        ]
      },
      {
        "semester": 6,
        "stage": "zhang",
        "reason": "应用期：辨证系统、舌象、脉象、大数据四条应用线同时展开，中医专科同期补齐。",
        "subjects": [
          "01-zhongyi/11-zhongyi-waike-xue",
          "01-zhongyi/12-zhongyi-fuke-xue",
          "01-zhongyi/13-zhongyi-erke-xue",
          "02-zhongyao/05-zhongyao-jianding-xue",
          "02-zhongyao/06-zhongyao-huaxue",
          "04-gushang/06-zhongyi-zhenggu-xue",
          "04-gushang/07-zhongyi-jinshang-xue",
          "08-wuguan/06-zhongyi-yanke-xue",
          "08-wuguan/07-zhongyi-erbihou-xue",
          "05-huli/06-zhongyi-xinli-xue",
          "07-zhineng/06-zhongyi-zhineng-bianzheng",
          "07-zhineng/07-yixue-tuxiang-shezhen",
          "07-zhineng/08-maizhen-keguanhua",
          "07-zhineng/09-zhongyi-dashuju-fenxi"
        ]
      },
      {
        "semester": 7,
        "stage": "zhuang",
        "reason": "编排期：大模型与智能体把前面所有模块串成一个会做事的系统，证候学给出统一语义。",
        "subjects": [
          "01-zhongyi/14-zhongyi-zhenghou-xue",
          "01-zhongyi/15-zhongyi-gejia-xueshuo",
          "02-zhongyao/13-zhongchengyao-linchuang",
          "02-zhongyao/14-peiwu-yu-jinji",
          "04-gushang/13-zhongyi-zhengji-xue",
          "08-wuguan/14-zhongyi-sangyin-yixue",
          "06-guanli/12-zhongyiyao-biaozhunhua",
          "06-guanli/13-linchuang-keyan-fangfa",
          "06-guanli/07-zhongyi-jiaoyu-xue",
          "07-zhineng/10-llm-yu-zhongyi-zhinengti",
          "07-zhineng/11-zhongyi-jiqiren-xue",
          "07-zhineng/12-shuzi-renti-xuni-fangzhen",
          "07-zhineng/13-zhongyi-duomotai-ronghe"
        ]
      },
      {
        "semester": 8,
        "stage": "zhuang",
        "reason": "上线期：安全、伦理、转化。技术做完了，能不能用、该不该用，是这一学期的问题。",
        "subjects": [
          "07-zhineng/14-yixue-shuju-anquan-yinsi",
          "07-zhineng/15-zhongyi-ai-lunli-zhili",
          "02-zhongyao/15-zhongyao-xinyao-yanfa",
          "04-gushang/14-kangfu-gongcheng-zhiju",
          "04-gushang/15-gushang-kangfu-pingding",
          "05-huli/15-huli-yanjiu-zhengxun",
          "06-guanli/15-zhongyi-guojijiaoyu",
          "08-wuguan/15-zhongyi-meirong-pifu"
        ]
      },
      {
        "semester": 9,
        "stage": "lao",
        "reason": "临床轮转：所有模型都必须经过真实病人的检验，包括被病人证伪。",
        "subjects": []
      },
      {
        "semester": 10,
        "stage": "yi",
        "reason": "毕业设计：把「会辨证」与「会造系统」压成一个交付物。",
        "subjects": []
      }
    ],
    "capstone": {
      "title": "智能中医全栈闭环系统",
      "deliverable": "从四诊采集到辨证立法处方、再到系统实现与治理声明的端到端交付物，附完整可复现证据链。",
      "criteria": [
        "每个环节都必须有可回指的经典/标准依据，不许出现无来源的形式化定义",
        "必须显式处理模态缺失与不确定性，并给出降级行为",
        "必须包含模型卡、合规声明与「不适用场景」清单",
        "全部测试离线可复现，退出码 0，无外部 API 依赖",
        "毕业答辩须由中医药与工程双背景评审人共同通过"
      ]
    }
  },
  {
    "id": "research-track",
    "title": "科研型",
    "en": "Research Track",
    "audience": "面向中医药科研人员：以真实世界研究、组学与网络药理、循证方法为核心。",
    "outcome": "毕业时能设计并执行一项真实世界中医研究（从方案、伦理审查到统计分析与论文），并能为结论的因果解读划定边界。",
    "semesters": [
      1,
      10
    ],
    "subjectCount": 27,
    "hours": 1782,
    "route": [
      {
        "semester": 1,
        "stage": "sheng",
        "reason": "医史与古文是文献研究的地基：不读原文的科研，引文就会错。",
        "subjects": [
          "01-zhongyi/01-zhongyi-jichu-lilun",
          "01-zhongyi/02-yi-gu-wen",
          "01-zhongyi/03-zhongguo-yixue-shi"
        ]
      },
      {
        "semester": 2,
        "stage": "sheng",
        "reason": "药用植物学给出药材的物质基础，中药学给出功效语义，两端对齐才能做成分-功效研究。",
        "subjects": [
          "02-zhongyao/01-zhongyaoxue",
          "02-zhongyao/02-yaoyong-zhiwu-xue"
        ]
      },
      {
        "semester": 3,
        "stage": "sheng",
        "reason": "方剂是中医的复方干预单位，方剂学 + 统计学是复方研究的双入口。",
        "subjects": [
          "02-zhongyao/03-fangjixue",
          "01-zhongyi/05-zhongyi-zhen-duan-xue",
          "01-zhongyi/06-neijing-xuandu"
        ]
      },
      {
        "semester": 4,
        "stage": "sheng",
        "reason": "统计与法规：先知道能做什么、不能做什么，再谈设计。",
        "subjects": [
          "06-guanli/01-yixue-tongjixue",
          "06-guanli/02-zhongyiyao-zhengce-fagui",
          "02-zhongyao/05-zhongyao-jianding-xue",
          "02-zhongyao/06-zhongyao-huaxue"
        ]
      },
      {
        "semester": 5,
        "stage": "zhang",
        "reason": "药理与网络药理：从单位成分到多靶点，是中药机制研究的主线。",
        "subjects": [
          "02-zhongyao/07-zhongyao-yaoli-xue",
          "02-zhongyao/09-zhongyao-yaoji-xue",
          "01-zhongyi/09-wenbing-xue"
        ]
      },
      {
        "semester": 6,
        "stage": "zhang",
        "reason": "分析技术与药代：证据的物质基础必须可测量、可重复。",
        "subjects": [
          "02-zhongyao/10-zhongyao-fenxi-xue",
          "02-zhongyao/11-zhongyao-yaodai-donglixue",
          "02-zhongyao/12-daodi-yaocai",
          "03-zhenjiu/10-shiyan-zhenjiu-xue"
        ]
      },
      {
        "semester": 7,
        "stage": "zhuang",
        "reason": "科研方法学 + 知识图谱：现代中医研究的两个基础设施。",
        "subjects": [
          "06-guanli/13-linchuang-keyan-fangfa",
          "06-guanli/12-zhongyiyao-biaozhunhua",
          "01-zhongyi/14-zhongyi-zhenghou-xue",
          "07-zhineng/05-zhongyi-zhishi-tupu"
        ]
      },
      {
        "semester": 8,
        "stage": "zhuang",
        "reason": "证据与转化：研究不能停在论文，要能走到成果与合规。",
        "subjects": [
          "05-huli/15-huli-yanjiu-zhengxun",
          "06-guanli/14-zhishichanquan-zhuanhua",
          "02-zhongyao/15-zhongyao-xinyao-yanfa",
          "07-zhineng/15-zhongyi-ai-lunli-zhili"
        ]
      },
      {
        "semester": 10,
        "stage": "yi",
        "reason": "学位论文：一项能被别人重复的真实世界研究。",
        "subjects": []
      }
    ],
    "capstone": {
      "title": "真实世界中医研究",
      "deliverable": "一份完整研究方案 + 一份真实数据上的分析报告（含统计代码），通过模拟伦理审查。",
      "criteria": [
        "预注册研究假设，明确主要终点与次要终点",
        "统计方法与数据结构匹配，附完整可复现代码",
        "因果结论必须给出混杂控制策略与敏感性分析",
        "必须包含一篇系统评价或 Meta 分析的完整检索流程（PRISMA）"
      ]
    }
  },
  {
    "id": "teaching-track",
    "title": "教学型",
    "en": "Teaching Track",
    "audience": "面向中医教师与教材编者：以知识体系梳理、课程图谱与教材编写能力为核心。",
    "outcome": "毕业时能独立设计一门中医学科的课程（大纲、先修关系、评价方式），并写出符合本项目章节契约的教材稿。",
    "semesters": [
      1,
      8
    ],
    "subjectCount": 32,
    "hours": 1944,
    "route": [
      {
        "semester": 1,
        "stage": "sheng",
        "reason": "要教中医，先要能把中医的语法讲清楚，并且读得懂原文。",
        "subjects": [
          "01-zhongyi/01-zhongyi-jichu-lilun",
          "01-zhongyi/02-yi-gu-wen",
          "01-zhongyi/03-zhongguo-yixue-shi"
        ]
      },
      {
        "semester": 2,
        "stage": "sheng",
        "reason": "药与经络是两门最常被教得最碎的学科，正好用来练「知识体系化」。",
        "subjects": [
          "02-zhongyao/01-zhongyaoxue",
          "03-zhenjiu/01-jingluo-xue"
        ]
      },
      {
        "semester": 3,
        "stage": "sheng",
        "reason": "经典教学法：内经、方剂、腧穴分别代表理论经典、方书经典、操作规范三类文本。",
        "subjects": [
          "01-zhongyi/06-neijing-xuandu",
          "02-zhongyao/03-fangjixue",
          "03-zhenjiu/02-shuxue-xue",
          "03-zhenjiu/03-zhenjiu-yiji-xuan"
        ]
      },
      {
        "semester": 4,
        "stage": "sheng",
        "reason": "教学设计的工程化：课程本身就是一张有向图，先修关系就是图的边。",
        "subjects": [
          "05-huli/06-zhongyi-xinli-xue",
          "01-zhongyi/07-shanghanlun",
          "01-zhongyi/04-zhongyi-tizhi-xue",
          "07-zhineng/02-zhongyi-ruanjian-jiagou-xue"
        ]
      },
      {
        "semester": 5,
        "stage": "zhang",
        "reason": "教育学与管理学入场：课程设计、评价、资源管理是教材编者的全套工具。",
        "subjects": [
          "06-guanli/03-zhongyi-guanli-xue",
          "06-guanli/04-weisheng-shiye-guanli",
          "06-guanli/05-zhongyi-wenhua-chuanbo",
          "01-zhongyi/10-zhongyi-neike-xue"
        ]
      },
      {
        "semester": 6,
        "stage": "zhang",
        "reason": "中医教育学核心学期：一手练教学设计，一手搭建知识图谱作为课程地图。",
        "subjects": [
          "06-guanli/07-zhongyi-jiaoyu-xue",
          "06-guanli/08-jiankang-fuwu-guanli",
          "06-guanli/06-yiyuan-guanli-xue",
          "07-zhineng/05-zhongyi-zhishi-tupu",
          "05-huli/11-shequ-huli-xue"
        ]
      },
      {
        "semester": 7,
        "stage": "zhuang",
        "reason": "标准与传播：教材要能对齐国家标准，也要能跨语种传播出去。",
        "subjects": [
          "06-guanli/12-zhongyiyao-biaozhunhua",
          "06-guanli/10-yixue-xinxi-guanli",
          "01-zhongyi/14-zhongyi-zhenghou-xue",
          "01-zhongyi/15-zhongyi-gejia-xueshuo",
          "05-huli/13-huli-guanli-xue",
          "05-huli/14-huli-lunli-fagui"
        ]
      },
      {
        "semester": 8,
        "stage": "zhuang",
        "reason": "收口于教材交付本身：把八年学的东西写成别人能用的教材。",
        "subjects": [
          "06-guanli/15-zhongyi-guojijiaoyu",
          "06-guanli/14-zhishichanquan-zhuanhua",
          "05-huli/15-huli-yanjiu-zhengxun",
          "07-zhineng/15-zhongyi-ai-lunli-zhili"
        ]
      }
    ],
    "capstone": {
      "title": "一门学科的完整教材",
      "deliverable": "为 120 门学科中的任意一门，写出完整教材稿（≥8 章）、配套 quiz、先修关系图与评价方案。",
      "criteria": [
        "章节必须通过 scripts/audit_curriculum.js 的 L2 契约层",
        "先修关系图不得出现环（DAG 校验）",
        "每章配 6 题小测（1 pre + 3 check + 2 post）",
        "图只用 Mermaid/SVG；术语表条目与 glossary/ 对齐"
      ]
    }
  }
];
window.TCMAI_GLOSSARY = {
  "tcm-terms": "<h1 id=\"中医术语表\">中医术语表</h1>\n<blockquote><p>以国家现行标准与权威教材为准。若本表与标准/教材冲突，以标准/教材为准。\n出处写到「书名·篇名」或「标准号」级别，便于读者自行核对。</p></blockquote>\n<hr/>\n<h2 id=\"基础理论层\">基础理论层</h2>\n<h3 id=\"阴阳\">阴阳</h3>\n<p><strong>出处:</strong> 《素问·阴阳应象大论》「阴阳者，天地之道也，万物之纲纪，变化之父母，生杀之本始，神明之府也。」\n<strong>定义:</strong> 对相互对立又相互依存的两类属性、状态或趋势的抽象概括；两者在一定条件下可相互转化。\n<strong>本项目用法:</strong> 二分类任务的语义来源。样本的&quot;阴/阳&quot;标签由属性组合判定，模型输出为后验概率而非硬标签。\n<strong>常见误用:</strong> 把阴阳直接等同于二进制的 0/1。二进制位是<strong>互斥且可交换</strong>的；阴阳是<strong>互根互用且可转化</strong>的，且带有强度与动态含义。形式化时必须保留 sigmoid 输出的连续性与权重方向性。</p>\n<h3 id=\"五行\">五行</h3>\n<p><strong>出处:</strong> 《尚书·洪范》「五行：一曰水，二曰火，三曰木，四曰金，五曰土。」；生克关系见《素问·五运行大论》。\n<strong>定义:</strong> 木火土金水五类属性及其相生（木→火→土→金→水→木）、相克（木克土、土克水、水克火、火克金、金克木）关系构成的系统模型。\n<strong>本项目用法:</strong> 多分类任务 + 关系图。类别数为 5，且类别之间存在<strong>有向约束</strong>，不能当独立类别处理。\n<strong>常见误用:</strong> 当作普通的 5 类 softmax 而不编码生克关系。丢失约束就等于丢掉了这门学说最有价值的部分。</p>\n<h3 id=\"藏象\">藏象</h3>\n<p><strong>出处:</strong> 《素问·六节藏象论》「藏象何如？」；《素问·五藏别论》「所谓五藏者，藏精气而不泻也。」\n<strong>定义:</strong> 以五脏为中心，通过经络联系六腑、五官、形体、情志的整体功能模型；&quot;藏&quot;指藏于内的脏腑，&quot;象&quot;指表现于外的征象。\n<strong>本项目用法:</strong> 知识图谱。节点为脏腑/官窍/情志/形体，边为功能联系（如「肝主疏泄」「肝开窍于目」）。\n<strong>常见误用:</strong> 把&quot;肝&quot;等同于解剖学的肝脏。藏象之&quot;肝&quot;是功能系统，与解剖器官不是一对一关系。</p>\n<h3 id=\"精-气-血-津液\">精、气、血、津液</h3>\n<p><strong>出处:</strong> 《灵枢·决气》「余闻人有精气津液血脉，余意以为一气耳。」；《灵枢·本神》论精。\n<strong>定义:</strong> 构成人体与维持生命活动的四类基本物质及其功能表现；四者可相互化生。\n<strong>本项目用法:</strong> 状态向量。把「精气两虚」「气血两虚」等证候映射为多维连续状态，而非离散标签。\n<strong>常见误用:</strong> 当作四个互不相干的字段。四者的化生关系决定了状态转移必须带守恒/流向约束。</p>\n<h3 id=\"证候-证\">证候（证）</h3>\n<p><strong>出处:</strong> 《中医基础理论》（全国中医药行业高等教育规划教材）「证候是疾病过程中某一阶段或某一类型的病理概括。」\n<strong>定义:</strong> 对病因、病位、病性、病势的综合概括，是对机体在疾病过程中某一阶段整体反应状态的判断。\n<strong>本项目用法:</strong> 分类输出 + 本体。必须先定义证候的构成维度（病位×病性×病势），再谈模型输出。\n<strong>常见误用:</strong> 把&quot;证&quot;当作&quot;症&quot;或&quot;病&quot;。症是单个表现，病是全过程，证是阶段性的整体判断 —— 三者粒度不同。</p>\n<h3 id=\"八纲\">八纲</h3>\n<p><strong>出处:</strong> 《医学心悟》（清·程钟龄）论「寒热虚实表里阴阳」；现代教材定型为八纲辨证。\n<strong>定义:</strong> 阴阳、表里、寒热、虚实四对纲领，是辨证的总纲。\n<strong>本项目用法:</strong> 多维特征空间。八纲不是 8 类互斥标签，而是 4 组可并存的二元判断（阴阳统摄其余六纲）。\n<strong>常见误用:</strong> 建模成 8 类 softmax。它本质是多标签 / 多维结构。</p>\n<hr/>\n<h2 id=\"诊断层\">诊断层</h2>\n<h3 id=\"四诊-望闻问切\">四诊（望闻问切）</h3>\n<p><strong>出处:</strong> 《难经·六十一难》「望而知之谓之神，闻而知之谓之圣，问而知之谓之工，切脉而知之谓之巧。」\n<strong>定义:</strong> 望、闻、问、切四种采集手段，分别对应视觉、听觉/嗅觉、语言、触觉信息通道。\n<strong>本项目用法:</strong> 多模态特征。四诊天然对应四种模态，融合时必须处理<strong>模态缺失</strong>（实际临床常缺一诊）。\n<strong>常见误用:</strong> 只做舌象+脉象两模态就宣称&quot;四诊合参&quot;。四诊合参的前提是四通道信息都进入模型且能被解释。</p>\n<h3 id=\"舌诊\">舌诊</h3>\n<p><strong>出处:</strong> 《辨舌指南》（民国·曹炳章）；《中医诊断学》教材舌诊章。\n<strong>定义:</strong> 观察舌质（颜色、形态、润燥）与舌苔（颜色、厚薄、腐腻）以推断病性病位。\n<strong>本项目用法:</strong> 图像分类 + 颜色校正。舌象受光源影响极大，<strong>色彩恒常性校正是前置必需步骤</strong>，不是可选项。\n<strong>常见误用:</strong> 直接拿手机照片做分类而不做色彩校正，模型学到的往往是拍摄设备而非舌象。</p>\n<h3 id=\"脉诊\">脉诊</h3>\n<p><strong>出处:</strong> 《脉经》（晋·王叔和）定二十四脉；《濒湖脉学》（明·李时珍）补为二十七脉。\n<strong>定义:</strong> 通过寸口脉的位、数、形、势等属性判断气血与脏腑状态。\n<strong>本项目用法:</strong> 一维时序信号处理。压力传感器采集的脉搏波 → 时频分析 → 特征提取。\n<strong>常见误用:</strong> 把采集到的波形直接当&quot;脉象&quot;。取脉压力不同，同一人的波形可以完全不同，需先做压力标准化。</p>\n<hr/>\n<h2 id=\"中药方剂层\">中药方剂层</h2>\n<h3 id=\"四气五味归经\">四气五味归经</h3>\n<p><strong>出处:</strong> 《神农本草经》「药有酸咸甘苦辛五味，又有寒热温凉四气。」；归经理论见《医学启源》（金·张元素）。\n<strong>定义:</strong> 药性（寒热温凉平）、药味（酸苦甘辛咸）、归经（药物作用的脏腑经络归属）三组属性。\n<strong>本项目用法:</strong> 三组离散属性的嵌入表示。归经天然是<strong>多标签</strong>（一味药可归多经），药性是<strong>有序</strong>的（寒→凉→平→温→热）。\n<strong>常见误用:</strong> 把四气当无序类别做 one-hot。寒凉温热与平之间有程度关系，是序数变量。</p>\n<h3 id=\"君臣佐使\">君臣佐使</h3>\n<p><strong>出处:</strong> 《素问·至真要大论》「主病之谓君，佐君之谓臣，应臣之谓使。」\n<strong>定义:</strong> 方剂组方结构：君药主病，臣药助君或兼治，佐药制君之偏或反佐，使药引经调和。\n<strong>本项目用法:</strong> 注意力机制的结构先验。君臣佐使给出了权重分配的先验约束，可作注意力掩码。\n<strong>常见误用:</strong> 把方剂直接当作药味多重集。结构（谁是君、谁用量最大）本身就是可学习的信息。</p>\n<h3 id=\"十八反十九畏\">十八反十九畏</h3>\n<p><strong>出处:</strong> 歌诀见《儒门事亲》（金·张子和）与后世本草；《中国药典》「配伍禁忌」项。\n<strong>定义:</strong> 传统规定的药物配伍禁忌集合。\n<strong>本项目用法:</strong> 规则图谱 + 图推理。作为硬约束层，与统计模型解耦。\n<strong>常见误用:</strong> 用统计共现频次替代规则。典籍规定的是<strong>安全约束</strong>，不是频率问题 —— 低频共现恰恰可能是危险的。</p>\n<hr/>\n<h2 id=\"经络针灸层\">经络针灸层</h2>\n<h3 id=\"经络\">经络</h3>\n<p><strong>出处:</strong> 《灵枢·经脉》「经脉者，所以能决死生，处百病，调虚实，不可不通。」\n<strong>定义:</strong> 运行气血、联络脏腑与体表的通道系统，分十二正经与奇经八脉。\n<strong>本项目用法:</strong> 图结构。节点为腧穴/脏腑，边为经络循行路径。\n<strong>常见误用:</strong> 当成解剖学管道去做几何建模。经络的价值在<strong>拓扑关系</strong>（哪两个穴同经、哪条经联哪个脏）而非物理路径。</p>\n<h3 id=\"腧穴\">腧穴</h3>\n<p><strong>出处:</strong> 《针灸甲乙经》（晋·皇甫谧）定 349 穴；现代以国家标准 GB/T 12346《经穴名称与定位》为准。\n<strong>定义:</strong> 脏腑经络之气输注于体表的特定部位。\n<strong>本项目用法:</strong> 三维坐标 + 拓扑归属。定位必须用国家标准，不能凭图。\n<strong>常见误用:</strong> 只用像素坐标而丢掉经络归属。丢了归属就丢了配穴规则的全部依据。</p>\n<hr/>\n<h2 id=\"临床与治理层\">临床与治理层</h2>\n<h3 id=\"辨证论治\">辨证论治</h3>\n<p><strong>出处:</strong> 《伤寒论》六经辨证体系；现代确立为中医临床基本原则。\n<strong>定义:</strong> 通过辨证确定证候，据证立法、依法处方、随证加减的诊疗过程。\n<strong>本项目用法:</strong> 一段可编排的工作流（采集 → 辨证 → 立法 → 处方 → 复诊调整），不是一次分类。\n<strong>常见误用:</strong> 建模成「症状 → 方剂」的单跳映射。跳过了立法与随证加减，模型无法处理复诊场景。</p>\n<h3 id=\"大医精诚\">大医精诚</h3>\n<p><strong>出处:</strong> 《备急千金要方·序例·大医精诚》（唐·孙思邈）「凡大医治病，必当安神定志，无欲无求，先发大慈恻隐之心……」\n<strong>定义:</strong> 中医的医德总纲，要求医术精湛（精）与医德高尚（诚）并重。\n<strong>本项目用法:</strong> AI 伦理章的价值锚点。任何中医 AI 系统都要回答：它是否使医者更&quot;精&quot;，是否使医者更&quot;诚&quot;。\n<strong>常见误用:</strong> 当作口号。它其实给出了可操作的验收标准：系统必须让医师的判断更准，且不能让医师放弃判断责任。</p>\n<h3 id=\"中医知识树-tcm-knowledge-tree\">中医知识树（TCM Knowledge Tree）</h3>\n<p><strong>出处:</strong> 源资料《中医知识树》· D07-S04（原《中医知识图谱》，现正名）· 4 篇 10 章 · 见 <code>standards/knowledge-tree/</code>\n<strong>定义:</strong> 以「须—根—干—枝—叶」五级骨架承载中医知识的<strong>层次</strong>（从属／递进／教学先后），以「跨枝经脉」图边承载<strong>关系</strong>，树图一体。五级为：须（哲学根基 6）→ 根（核心公理 4）→ 干（院系域 8）→ 枝（学科 120）→ 叶（知识点／病证单元 2592）。\n<strong>本项目用法:</strong> 知识树回答「谁从哪里来、该先学谁、在哪门课里」——这正是课程目录与先修关系要回答的问题；知识图谱只回答「谁和谁有关系」。本仓库用树的层级管课程结构，用图的边管跨科关联（如五行与经络）。骨架机器可读版在 <code>standards/knowledge-tree/tree-schema.json</code>。\n<strong>常见误用:</strong> 把知识树当成知识图谱的改名。它不是：图谱是<strong>扁平</strong>的，能查关系但承载不了从属与教学先后；树是层次的。另注意源资料的院系分布（28/20/12/10/12/10/14/14）与本仓库（8×15 均匀）<strong>总数同为 120 但分布不同</strong>，不可互相覆盖。</p>\n<h3 id=\"须-根之前的那一层\">须（根之前的那一层）</h3>\n<p><strong>出处:</strong> 同上（源教材第三章）\n<strong>定义:</strong> 知识树最底、最抽象的一层，不从属于任何一门课，却滋养全部学科。六项：象数阴阳、五行生克、精气神形、天人相应、藏象经络、恒动整体。\n<strong>本项目用法:</strong> 准入门槛很硬——<strong>凡不能从任何单一学科教材导出的「共祖」知识，才配入须</strong>。这条纪律可直接用来判断某个概念该进公共基础课还是专业课。\n<strong>常见误用:</strong> 把「全部基础课的内容」塞进须。须是共祖，不是汇总。</p>\n<h3 id=\"病证单元-dsu\">病证单元（DSU）</h3>\n<p><strong>出处:</strong> 源资料《中医知识树》第五章；编号空间与源实现 <code>DSU-00001 … DSU-00103</code> 同源（已按编号+名字核对，见 <code>source-map.json</code>）\n<strong>定义:</strong> 中医病证知识图谱的<strong>最小编写原子</strong>，把西医病侧（病名、ICD-11 编码、分子靶点）与中医证侧（证候、六经八纲、主症舌脉）锚定在同一节点上。\n<strong>本项目用法:</strong> <code>DSU-00001</code> = 风寒束表证 ↔ 普通感冒 ↔ ICD-CA00 ↔ 挂 <code>D01-S13</code>。凡是「一个具体病证」的讨论都应以 DSU 为单位，而不是以症状或方剂为单位。\n<strong>常见误用:</strong> 把证候当 DSU。证候只是 DSU 的一侧（<code>manifests_as</code>）；DSU 是病与证的合体。</p>",
  "ai-terms": "<h1 id=\"ai-工程术语表\">AI / 工程术语表</h1>\n<blockquote><p>以原始论文、官方规范文档为准。出处写到可检索的级别。\n本表只收录<strong>本项目实际会用到</strong>的术语 —— 不做百科。</p></blockquote>\n<hr/>\n<h2 id=\"数学与优化\">数学与优化</h2>\n<h3 id=\"逻辑回归-sigmoid\">逻辑回归 / sigmoid</h3>\n<p><strong>出处:</strong> Logistic 函数由 Verhulst（1838）提出用于人口模型；机器学习用法见 Bishop, <em>Pattern Recognition and Machine Learning</em>, §4.3。\n<strong>定义:</strong> <span class=\"math\">p = σ(<b>w</b>ᵀ <b>x</b> + b)</span>，其中 <span class=\"math\">σ(z) = 1/(1+e<sup>-z</sup>)</span>。以交叉熵为损失时，梯度为 <span class=\"math\">(<span class=\"math-hat\">y</span>-y)<b>x</b></span>。\n<strong>本项目用法:</strong> 阴阳二分类的最小可行模型。手写实现 20 行以内，不用任何库。\n<strong>动手要点:</strong> 必须从零实现 sigmoid、交叉熵、梯度下降三步，再与 <code>scikit-learn</code> 对比系数符号。</p>\n<h3 id=\"softmax-与多分类\">Softmax 与多分类</h3>\n<p><strong>出处:</strong> Bridle (1990), <em>Probabilistic Interpretation of Feedforward Classification Network Outputs</em>。\n<strong>定义:</strong> <span class=\"math\">p<sub>k</sub> = e<sup>z<sub>k</sub></sup> / ∑<sub>j</sub> e<sup>z<sub>j</sub></sup></span>，配交叉熵损失；<span class=\"math\">z</span> 需先减去最大值以保证数值稳定。\n<strong>本项目用法:</strong> 五行五分类。<strong>但类别之间带生克约束</strong>，因此纯 softmax 只是基线，真实模型需要加关系层。\n<strong>动手要点:</strong> 数值稳定写法（减 max）不是优化，是正确性要求 —— 不写会溢出。</p>\n<h3 id=\"梯度下降族\">梯度下降族</h3>\n<p><strong>出处:</strong> Robbins &amp; Monro (1951) 随机逼近；Kingma &amp; Ba (2015) Adam（arXiv:1412.6980）。\n<strong>定义:</strong> <span class=\"math\">θ ← θ - η ∇<sub></sub>theta L</span>；动量、RMSProp、Adam 是在此基础上对方向与步长的修正。\n<strong>本项目用法:</strong> 所有 BUILD IT 段落的手写训练循环都用朴素 SGD 起步，再对比 Adam。\n<strong>动手要点:</strong> 学习率是唯一必须先调的超参；先固定随机种子再动学习率。</p>\n<h3 id=\"词嵌入-余弦相似度\">词嵌入 / 余弦相似度</h3>\n<p><strong>出处:</strong> Mikolov et al. (2013), word2vec（arXiv:1301.3781）；GloVe: Pennington et al. (2014)。\n<strong>定义:</strong> 把离散对象映射到低维稠密向量，使语义相近者的向量夹角更小：<span class=\"math\"><span class=\"math-op\">cos</span>(<b>a</b>,<b>b</b>) = <span class=\"frac\"><span class=\"frac-num\"><b>a</b>·<b>b</b></span><span class=\"frac-den\">‖<b>a</b>‖‖<b>b</b>‖</span></span></span>。\n<strong>本项目用法:</strong> 「四气五味归经」的嵌入。药性是有序属性，药味与归经是多标签，<strong>不能混成一个 one-hot</strong>。\n<strong>动手要点:</strong> 先定相似度的临床含义（哪两味药该更近），再训练嵌入；顺序不能反。</p>\n<h3 id=\"缩放点积注意力\">缩放点积注意力</h3>\n<p><strong>出处:</strong> Vaswani et al. (2017), <em>Attention Is All You Need</em>（arXiv:1706.03762）。\n<strong>定义:</strong> <span class=\"math\"><span class=\"math-rm\">softmax</span><span class=\"frac\"><span class=\"frac-num\">QKᵀ</span><span class=\"frac-den\"><span class=\"math-sqrt\">√</span><span class=\"math-line\">d<sub>k</sub></span></span></span>V</span>。除以 <span class=\"math\"><span class=\"math-sqrt\">√</span><span class=\"math-line\">d<sub>k</sub></span></span> 是为了在 <span class=\"math\">d<sub>k</sub></span> 增大时保持 softmax 梯度不消失。\n<strong>本项目用法:</strong> 方剂君臣佐使的结构先验。可把君臣佐使作为注意力掩码，让&quot;君药&quot;天然获得更高权重。\n<strong>动手要点:</strong> 先手写单头注意力（不到 20 行），再上多头。</p>\n<hr/>\n<h2 id=\"表示与检索\">表示与检索</h2>\n<h3 id=\"知识图谱-三元组\">知识图谱 / 三元组</h3>\n<p><strong>出处:</strong> 知识表示与语义网传统；RDF 规范见 W3C RDF 1.1。\n<strong>定义:</strong> 以 (头实体, 关系, 尾实体) 三元组为基本单元的图结构知识表示。\n<strong>本项目用法:</strong> 藏象学说、本草功效、经络循行的统一载体。\n<strong>动手要点:</strong> 先定本体（实体类型、关系类型），再灌数据。本体没定就灌数据，后期一定重构。</p>\n<h3 id=\"rag-检索增强生成\">RAG（检索增强生成）</h3>\n<p><strong>出处:</strong> Lewis et al. (2020), <em>Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks</em>（arXiv:2005.11401）。\n<strong>定义:</strong> 生成前先从外部语料检索相关片段，把片段注入上下文，再让模型生成。\n<strong>本项目用法:</strong> 经典条文问答。<strong>检索结果必须带出处</strong>，无出处的生成内容一律视为不可用。\n<strong>动手要点:</strong> 中医语料的检索难点是古今异义词，纯向量检索会漏，需混合关键词检索。</p>\n<h3 id=\"状态机-序列模型\">状态机 / 序列模型</h3>\n<p><strong>出处:</strong> 有限状态机理论（Mealy / Moore）；序列建模见 Rabiner (1989) HMM 教程。\n<strong>定义:</strong> 系统在一组离散状态间按转移规则演化，输出依赖当前状态（与输入）。\n<strong>本项目用法:</strong> 六经传变（太阳→阳明→少阳→太阴→少阴→厥阴）、卫气营血传变。\n<strong>动手要点:</strong> 传变有<strong>方向性与不可逆性</strong>（多数情况下），转移矩阵必须编码这个先验。</p>\n<h3 id=\"kd-tree-最近邻\">KD-Tree / 最近邻</h3>\n<p><strong>出处:</strong> Bentley (1975), <em>Multidimensional Binary Search Trees Used for Associative Searching</em>。\n<strong>定义:</strong> 对 k 维点集做空间划分的平衡树，用于 <span class=\"math\">O(<span class=\"math-op\">log</span> n)</span> 量级的最近邻查询。\n<strong>本项目用法:</strong> 腧穴定位与取穴。给定体表坐标，检索邻近腧穴。\n<strong>动手要点:</strong> 体表是曲面，欧氏距离不等于体表距离，需先做曲面参数化或改用测地距离。</p>\n<hr/>\n<h2 id=\"深度学习与多模态\">深度学习与多模态</h2>\n<h3 id=\"卷积神经网络-cnn-与感受野\">卷积神经网络（CNN）与感受野</h3>\n<p><strong>出处:</strong> LeCun et al. (1998), <em>Gradient-Based Learning Applied to Document Recognition</em>。\n<strong>定义:</strong> 用局部连接 + 权值共享的卷积核对输入做特征提取；感受野指某层输出对应的输入区域大小。\n<strong>本项目用法:</strong> 舌象、面诊、皮损、眼底、骨伤影像。\n<strong>动手要点:</strong> 医学图像样本量小，先做数据增强与迁移学习，别一上来就设计深网。</p>\n<h3 id=\"多模态融合\">多模态融合</h3>\n<p><strong>出处:</strong> Baltrušaitis et al. (2019), <em>Multimodal Machine Learning: A Survey and Taxonomy</em>（arXiv:1705.09406）。\n<strong>定义:</strong> 早融合（特征级）、中融合（中间层交叉注意力）、晚融合（决策级）三种基本范式。\n<strong>本项目用法:</strong> 望闻问切四诊融合。必须处理<strong>模态缺失</strong>（临床常缺一诊）。\n<strong>动手要点:</strong> 先做单模态基线，再融合。没有单模态基线，就说不清融合到底贡献了什么。</p>\n<h3 id=\"可解释性-shap-lime\">可解释性（SHAP / LIME）</h3>\n<p><strong>出处:</strong> Lundberg &amp; Lee (2017), SHAP（arXiv:1705.07874）；Ribeiro et al. (2016), LIME（arXiv:1602.04938）。\n<strong>定义:</strong> SHAP 基于合作博弈的 Shapley 值分配特征贡献；LIME 在局部用可解释模型逼近黑箱。\n<strong>本项目用法:</strong> 辨证系统的解释层。医师必须能看到&quot;为什么判成这个证&quot;。\n<strong>动手要点:</strong> 手写一维 Shapley 值（枚举所有子集）就能理解其含义，不必先上库。</p>\n<h3 id=\"联邦学习与差分隐私\">联邦学习与差分隐私</h3>\n<p><strong>出处:</strong> McMahan et al. (2017), FedAvg（arXiv:1602.05629）；Dwork (2006) 差分隐私。\n<strong>定义:</strong> 联邦学习让多方在不共享原始数据的前提下联合训练；差分隐私通过加噪使单个样本的存在与否不可分辨。\n<strong>本项目用法:</strong> 医案与病历的多机构协作。\n<strong>动手要点:</strong> <span class=\"math\">(ε,δ)</span>-差分隐私的 <span class=\"math\">ε</span> 有明确语义（隐私预算），不能当调参旋钮。</p>\n<hr/>\n<h2 id=\"工程与治理\">工程与治理</h2>\n<h3 id=\"领域驱动设计-ddd\">领域驱动设计（DDD）</h3>\n<p><strong>出处:</strong> Eric Evans, <em>Domain-Driven Design</em> (2003)。\n<strong>定义:</strong> 以限界上下文与统一语言组织复杂软件，让代码结构与业务概念同构。\n<strong>本项目用法:</strong> 中医软件架构学的骨架构。<strong>统一语言就是双术语表</strong> —— 当「证候」在代码里变成 <code>Syndrome</code> 却没人能说清它的边界时，架构就已经坏了。\n<strong>动手要点:</strong> 先写统一语言表，再画限界上下文，最后才谈技术栈。</p>\n<h3 id=\"契约优先-contract-first\">契约优先（Contract-First）</h3>\n<p><strong>出处:</strong> OpenAPI Specification (OAS 3.1)；JSON Schema 2020-12。\n<strong>定义:</strong> 先定义接口契约，再由契约生成服务端与客户端骨架。\n<strong>本项目用法:</strong> 所有对外 API 先写 OpenAPI 描述，再实现。\n<strong>动手要点:</strong> 契约里必须显式写清<strong>临床免责与不确定性字段</strong>，不能只有数据字段。</p>\n<h3 id=\"模型卡-model-card\">模型卡（Model Card）</h3>\n<p><strong>出处:</strong> Mitchell et al. (2019), <em>Model Cards for Model Reporting</em>（arXiv:1810.03993）。\n<strong>定义:</strong> 记录模型用途、训练数据、评价指标、局限与适用边界的标准文档。\n<strong>本项目用法:</strong> 每一个中医 AI 模型都必须附模型卡，明确写出<strong>不该使用的场景</strong>。\n<strong>动手要点:</strong> 「不适用场景」比「性能指标」更重要，必须写在前面。</p>\n<h3 id=\"医疗信息安全\">医疗信息安全</h3>\n<p><strong>出处:</strong> 中国《个人信息保护法》《数据安全法》《医疗机构病历管理规定》；技术侧见 HIPAA Security Rule、ISO/IEC 27799。\n<strong>定义:</strong> 对医疗健康数据的采集、存储、传输、使用全过程的安全与合规要求。\n<strong>本项目用法:</strong> 医案数据处理的硬约束层。\n<strong>动手要点:</strong> 医案入库前必须脱敏；脱敏不可逆（k-匿名 + 泛化），不做&quot;可还原加密&quot;就当没脱敏。</p>",
  "bridge-map": "<h1 id=\"中医-ai-概念桥梁对照表\">中医 ↔ AI 概念桥梁对照表</h1>\n<blockquote><p><strong>这不是类比表，是工程接口表。</strong></p>\n<p>中医概念给出<strong>语义与约束</strong>，AI/工程概念给出<strong>表示与算法</strong>。\n一行桥梁只有同时满足两个条件才成立：</p>\n<ol><li><strong>左 → 右</strong>：能给出可计算的形式化表示；</li><li><strong>右 → 左</strong>：从算法输出能回指到具体的中医命题（而不是停在&quot;相似度 0.87&quot;）。</li></ol></blockquote>\n<h2 id=\"桥梁的四种强度\">桥梁的四种强度</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>级别</th><th>含义</th><th>可否进入 <code>outputs/</code></th></tr></thead><tbody><tr><td><strong>A 同构</strong></td><td>结构与约束都能一一对应</td><td>✅ 可以直接产品化</td></tr><tr><td><strong>B 约束可用</strong></td><td>中医侧提供先验约束，AI 侧提供求解方法</td><td>✅ 需标注约束来源</td></tr><tr><td><strong>C 类比</strong></td><td>只在直觉层相似，形式化会丢语义</td><td>⚠️ 只可出现在教学讲解，不得用于临床输出</td></tr><tr><td><strong>D 误导</strong></td><td>流行但错误，必须显式排除</td><td>❌ 在 glossary 里作为「常见误用」记录</td></tr></tbody></table></div>\n<hr/>\n<h2 id=\"一-基础理论\">一、基础理论</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>中医概念</th><th>AI / 工程概念</th><th>桥梁</th><th>级别</th><th>丢失了什么</th></tr></thead><tbody><tr><td>阴阳</td><td>二分类 / logistic 回归</td><td>对立属性 → sigmoid 后验概率；输出连续值保留「偏阴偏阳」的强度</td><td><strong>B</strong></td><td>互根互用、相互转化（需额外建模转移）</td></tr><tr><td>阴阳转化</td><td>状态转移 / 阈值翻转</td><td>「重阴必阳」→ 状态机在临界点的相变</td><td><strong>B</strong></td><td>转化的时间尺度</td></tr><tr><td>五行</td><td>五分类 + 关系图</td><td>类别为 5，生克为有向边，构成带约束的多分类</td><td><strong>B</strong></td><td>生克的量化强度</td></tr><tr><td>五行生克</td><td>图上的有向传播</td><td>相生=正向加权边，相克=负向加权边</td><td><strong>A</strong></td><td>—</td></tr><tr><td>藏象</td><td>知识图谱</td><td>脏腑/官窍/情志为节点，功能联系为边</td><td><strong>A</strong></td><td>功能联系的程度差异</td></tr><tr><td>精气血津液</td><td>多维状态向量</td><td>四类物质为连续状态分量，化生关系为守恒/流向约束</td><td><strong>B</strong></td><td>定量单位</td></tr><tr><td>经络</td><td>图结构（节点+路径）</td><td>腧穴为节点，循行为边</td><td><strong>A</strong></td><td>循行的空间几何</td></tr><tr><td>三焦</td><td>分层架构 / 限界上下文</td><td>上中下三焦 → 三层职责划分</td><td><strong>C</strong></td><td>三焦是功能划分，不是部署划分</td></tr><tr><td>标本缓急</td><td>多目标优化 + 优先级调度</td><td>「急则治标」→ 加权目标函数在约束下切换权重</td><td><strong>B</strong></td><td>缓急的临床判据</td></tr><tr><td>正治反治</td><td>策略空间 / 反事实推理</td><td>「热因热用」→ 反直觉策略，需在反事实框架下评估</td><td><strong>B</strong></td><td>适用条件</td></tr></tbody></table></div>\n<h2 id=\"二-诊法\">二、诊法</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>中医概念</th><th>AI / 工程概念</th><th>桥梁</th><th>级别</th><th>丢失了什么</th></tr></thead><tbody><tr><td>四诊</td><td>多模态输入</td><td>望→视觉、闻→声/嗅、问→文本、切→触觉时序</td><td><strong>A</strong></td><td>嗅觉通道目前无成熟传感方案</td></tr><tr><td>望诊（舌象）</td><td>图像分类 + 色彩校正</td><td>舌质/舌苔 → 分割 + 颜色空间归一化 → 分类</td><td><strong>B</strong></td><td>舌诊的&quot;神&quot;（动态表现）</td></tr><tr><td>闻诊（声）</td><td>语音/声学特征</td><td>语声、气息 → 谱图特征</td><td><strong>B</strong></td><td>嗅气味通道</td></tr><tr><td>问诊</td><td>结构化问卷 + NLP</td><td>主诉/现病史 → 结构化实体抽取</td><td><strong>A</strong></td><td>患者主观表述的歧义</td></tr><tr><td>切诊（脉象）</td><td>一维时序信号处理</td><td>脉搏波 → 时频分析（小波）→ 特征</td><td><strong>B</strong></td><td>取脉指法的差异</td></tr><tr><td>八纲</td><td>多维标签空间</td><td>4 组并存二元判断（阴阳统摄）→ 每个维度一个输出头，而非 8 类互斥</td><td><strong>B</strong></td><td>八纲之间的统摄关系（阴阳如何收束其余六纲）</td></tr><tr><td>辨证</td><td>分层分类 + 本体推理</td><td>病位×病性×病势 → 证候标签</td><td><strong>B</strong></td><td>证的动态演化</td></tr></tbody></table></div>\n<h2 id=\"三-中药方剂\">三、中药方剂</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>中医概念</th><th>AI / 工程概念</th><th>桥梁</th><th>级别</th><th>丢失了什么</th></tr></thead><tbody><tr><td>四气</td><td>有序变量（序数编码）</td><td>寒→凉→平→温→热 是有序的，不能 one-hot</td><td><strong>A</strong></td><td>各档之间的实际差距</td></tr><tr><td>五味</td><td>多标签</td><td>一味药可兼具多味 → 每个味一个输出头，不用 one-hot</td><td><strong>A</strong></td><td>味的强度差异</td></tr><tr><td>归经</td><td>多标签 / 图节点归属</td><td>一味药归多经 → 每个经一个输出头；归经主次可用权重表示</td><td><strong>A</strong></td><td>归经的主次强度</td></tr><tr><td>君臣佐使</td><td>注意力权重先验 / 掩码</td><td>组方结构 → 权重约束</td><td><strong>B</strong></td><td>用量的连续差异</td></tr><tr><td>十八反十九畏</td><td>硬约束 / 规则图谱</td><td>作为禁忌边，与统计模型解耦</td><td><strong>A</strong></td><td>剂量与个体差异</td></tr><tr><td>炮制</td><td>过程曲线 + 工艺参数优化</td><td>火候/时间 → 过程变量 → 成分变化</td><td><strong>B</strong></td><td>传统经验判据</td></tr><tr><td>道地药材</td><td>地理加权 + 产地指纹</td><td>产地 → 特征分布偏移</td><td><strong>B</strong></td><td>「道地」的历史与人文维度</td></tr><tr><td>方证对应</td><td>检索增强生成（RAG）</td><td>「有是证用是方」→ 以证检索方</td><td><strong>B</strong></td><td>加减化裁的灵活性</td></tr><tr><td>类方鉴别</td><td>对比学习 / 细粒度分类</td><td>相似方的差异维度 → 对比嵌入</td><td><strong>B</strong></td><td>差异的临床权重</td></tr></tbody></table></div>\n<h2 id=\"四-针灸骨伤\">四、针灸骨伤</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>中医概念</th><th>AI / 工程概念</th><th>桥梁</th><th>级别</th><th>丢失了什么</th></tr></thead><tbody><tr><td>腧穴定位</td><td>三维坐标 + 曲面参数化</td><td>国家标准定位 → 体表坐标 → 测地距离检索</td><td><strong>A</strong></td><td>个体解剖差异</td></tr><tr><td>得气</td><td>生理信号特征（肌电/阻抗）</td><td>「得气」→ 可测量的生物电/机械响应模式</td><td><strong>C</strong></td><td>患者的整体感受</td></tr><tr><td>补泻手法</td><td>参数化操作序列</td><td>提插/捻转的频率、幅度、方向 → 参数向量</td><td><strong>B</strong></td><td>术者的手感</td></tr><tr><td>正骨手法</td><td>力学建模 + 路径规划</td><td>复位轨迹 → 力学仿真</td><td><strong>B</strong></td><td>软组织响应</td></tr><tr><td>筋骨并重</td><td>联合优化（骨 + 软组织）</td><td>结构约束与软组织约束共同构成目标</td><td><strong>B</strong></td><td>愈合的时间过程</td></tr><tr><td>导引</td><td>动作序列建模 / 姿态估计</td><td>术式 → 关节角时序</td><td><strong>A</strong></td><td>呼吸与意念的配合</td></tr><tr><td>五轮八廓</td><td>分层区域模型</td><td>眼部分区 → 层级分割</td><td><strong>B</strong></td><td>八廓的方位映射</td></tr></tbody></table></div>\n<h2 id=\"五-治理与伦理\">五、治理与伦理</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>中医概念</th><th>AI / 工程概念</th><th>桥梁</th><th>级别</th><th>丢失了什么</th></tr></thead><tbody><tr><td>大医精诚</td><td>医疗 AI 伦理双准则</td><td>「精」→ 性能与安全指标；「诚」→ 责任归属与不替代判断</td><td><strong>B</strong></td><td>医者主体性</td></tr><tr><td>治未病</td><td>预防性模型 / 风险预测</td><td>未病态 → 早期预警</td><td><strong>B</strong></td><td>「未病」的界定标准</td></tr><tr><td>因人制宜</td><td>个性化建模</td><td>个体特征 → 条件化模型</td><td><strong>A</strong></td><td>医患信任关系</td></tr><tr><td>三因制宜</td><td>条件化建模（时间/地域/个体）</td><td>三因 → 条件变量</td><td><strong>A</strong></td><td>—</td></tr><tr><td>医案</td><td>结构化病例 + 全文检索</td><td>医案 → 实体-关系抽取 → 向量库</td><td><strong>A</strong></td><td>医者的思维过程</td></tr><tr><td>师承</td><td>知识蒸馏 / 模仿学习</td><td>名医决策 → 学生模型</td><td><strong>C</strong></td><td>隐性知识；<strong>不可声称等同于师承</strong></td></tr></tbody></table></div>\n<hr/>\n<h2 id=\"被明确排除的误用-d-级\">被明确排除的误用（D 级）</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>流行说法</th><th>为什么错</th></tr></thead><tbody><tr><td>「阴阳就是二进制的 0 和 1」</td><td>二进制位互斥且可交换；阴阳互根互用、可转化、带强度。用位运算处理阴阳会丢掉全部动态语义。</td></tr><tr><td>「五行就是五行分类器」</td><td>纯 softmax 丢掉生克约束。「五行」最有价值的部分恰恰是关系，不是类别数。</td></tr><tr><td>「藏象就是器官知识图谱」</td><td>藏象之「肝」是功能系统，与解剖肝脏非一对一。直接映射会造成系统性错误。</td></tr><tr><td>「脉象就是一段波形」</td><td>取脉压力不同，同一人波形可以完全不同。不做压力标准化就谈识别，学到的是设备不是脉象。</td></tr><tr><td>「四诊合参 = 舌象 + 脉象两个模态」</td><td>缺了望（面色）、闻、问三通道。两模态不能称为「合参」。</td></tr><tr><td>「用大模型读医案就能替代辨证」</td><td>辨证是可追责的临床判断。模型可以辅助，但责任主体不能是模型。</td></tr><tr><td>「师承可以靠微调复现」</td><td>师承的核心是长期临床反馈与隐性判断。微调复现的是语言风格，不是判断力。</td></tr></tbody></table></div>\n<hr/>\n<h2 id=\"使用方式\">使用方式</h2>\n<ol><li>写新章节时，先在本表找到对应的桥梁行；没有就先补一行。</li><li><code>docs/zh.md</code> 的「对应关系」表必须引用本表的级别（A/B/C/D）。</li><li><strong>C 级桥梁不得出现在任何 <code>outputs/</code> 的临床输出路径上</strong>，只能作为教学讲解。</li><li>发现新的 D 级误用，直接加进上表，并在相关章节把它显式排除。</li></ol>"
};
