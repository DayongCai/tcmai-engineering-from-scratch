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
    "html": "<h1 id=\"第-1-章-阴阳学说-二分类-从零实现逻辑回归\">第 1 章 · 阴阳学说 → 二分类：从零实现逻辑回归</h1>\n<blockquote><p><strong>MOTTO:</strong> 「阴阳者，天地之道也，万物之纲纪，变化之父母，生杀之本始，神明之府也。」——《素问·阴阳应象大论》</p>\n<p><strong>PROBLEM:</strong> 你能背出「阳虚则寒、阴虚则热」，但让你把一位病人的四诊信息落到「偏阴还是偏阳」这一个判断上，你只会说「感觉像」。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(“跟诊时说不出辨证依据，老师追问一句就卡住”) + 知识积累(阴阳学说 × 逻辑回归 = 一个能说出理由、能报出置信度的二分类判断)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>中医基础理论</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>01 / 10</td></tr><tr><td>所属阶段</td><td>🌱 生·启蒙</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"课程结构\">课程结构</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">MOTTO  →  PROBLEM  →  CONCEPT  →  BUILD IT  →  USE IT  →  SHIP IT\n一句话      痛点      原理+图解    从零实现     框架调用    产出工具</code></pre></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>用不超过 30 行代码，把「阴阳」判别写成一次二分类，并逐项解释权重含义</li><li>说清 sigmoid 的输出为什么是「概率」而不是「标签」，以及这个区别在临床上意味着什么</li><li>指出把阴阳等同于二进制 0/1 会丢掉哪些语义（这是本课的<strong>排除项</strong>，必须能自己讲出来）</li><li>用交叉熵损失手写一次梯度下降，并解释学习率过大时会发生什么</li><li>给定一个新病例的体征，算出它的阳证概率并给出可复核的理由</li></ul>\n<div class=\"figure-host\" data-figure=\"yin-yang-sigmoid\"></div>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"中医-阴阳\">中医：阴阳</h3>\n<p>阴阳是对相互对立又相互依存的两类属性的抽象概括。《素问·阴阳应象大论》把它抬到「万物之纲纪」的位置。关键在于它是<strong>关系性</strong>的，不是分类标签：没有孤立的「阴」，只有相对某参照的「偏阴」。</p>\n<p>临床落地时，八纲里的阴阳是<strong>总纲</strong>——表里、寒热、虚实六纲都可以归到阴阳下。所以本章不是要判「属于哪种证」，而是判「这一组体征整体上偏向哪一侧，偏多少」。</p>\n<h3 id=\"ai-工程-逻辑回归\">AI / 工程：逻辑回归</h3>\n<p>给定特征向量 <span class=\"math\"><b>x</b></span>，先做一次线性打分：</p>\n<span class=\"math-block\">z = <b>w</b>ᵀ<b>x</b> + b</span>\n<p>再用 sigmoid 把实数压到 <span class=\"math\">(0,1)</span>：</p>\n<span class=\"math-block\">p = σ(z) = <span class=\"frac\"><span class=\"frac-num\">1</span><span class=\"frac-den\">1+e<sup>-z</sup></span></span></span>\n<p>以交叉熵为损失 <span class=\"math\">L = -[y<span class=\"math-op\">log</span> p + (1-y)<span class=\"math-op\">log</span>(1-p)]</span> 时，梯度有一个非常干净的形式：</p>\n<span class=\"math-block\"><span class=\"frac\"><span class=\"frac-num\">∂ L</span><span class=\"frac-den\">∂ <b>w</b></span></span> = (p - y) <b>x</b></span>\n<p>这意味着每个权重的更新方向，就是「预测偏差 × 该特征取值」。<strong>权重会自己长成对特征重要性的解释</strong> —— 这正是阴阳判别需要的「说得清理由」。</p>\n<h3 id=\"对应关系\">对应关系</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>中医概念</th><th>AI / 工程概念</th><th>桥梁（为什么可以这样翻译）</th></tr></thead><tbody><tr><td>阴阳</td><td>二分类的两个类别</td><td>对立两端的划分，与二分类的标签空间一一对应 [<strong>B 级</strong>]</td></tr><tr><td>偏阴偏阳的<strong>程度</strong></td><td>sigmoid 输出的连续概率</td><td>虚证不是「非阴即阳」，而是偏向程度不同；连续输出保留了强度 [<strong>B 级</strong>]</td></tr><tr><td>阴阳互根互用</td><td>两类的概率之和为 1</td><td>这一条是<strong>约束</strong>，恰好对应 <span class=\"math\">p + (1-p) = 1</span> [<strong>A 级</strong>]</td></tr><tr><td>阴阳转化</td><td>状态转移 / 阈值翻转</td><td>「重阴必阳」是<strong>动态过程</strong>；本章的单次分类模型<strong>拿不到</strong>这一层，需在后续章节用状态机补</td></tr><tr><td>阴阳 = 二进制 0/1</td><td>——</td><td>❌ <strong>D 级误用</strong>。二进制位互斥且可交换，阴阳互根、可转化、带强度。用位运算处理阴阳会丢掉全部动态语义</td></tr></tbody></table></div>\n<pre class=\"mermaid\">graph LR\n  A[&quot;八纲体征&lt;br/&gt;畏寒 / 口渴 / 脉率&quot;] --&gt; B[&quot;特征向量 x&quot;]\n  B --&gt; C[&quot;线性打分 z = wᵀx + b&quot;]\n  C --&gt; D[&quot;sigmoid → P(阳证)&quot;]\n  D --&gt; E[&quot;阈值判定 + 置信度&quot;]\n  E -.-&gt;|回指校验| F[&quot;能否用中医语言复述权重含义？&quot;]\n  F -.-&gt;|不能| G[&quot;说明特征设计有问题，回到 A&quot;]</pre>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<p>只用 Node.js 标准库。三件事必须自己写：sigmoid、交叉熵、梯度下降。</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">javascript</div><pre><code class=\"lang-javascript\">// 1. sigmoid —— 注意数值稳定写法：z 很负时 e^{-z} 会溢出\nfunction sigmoid(z) {\n  if (z &gt;= 0) { const e = Math.exp(-z); return 1 / (1 + e); }\n  const e = Math.exp(z); return e / (1 + e);\n}\n\n// 2. 交叉熵 + 梯度（一次算完）\nfunction lossAndGrad(w, b, X, y) {\n  let loss = 0;\n  const gw = [0, 0, 0];\n  let gb = 0;\n  for (let i = 0; i &lt; X.length; i += 1) {\n    const z = dot(w, X[i]) + b;\n    const p = sigmoid(z);\n    const eps = 1e-9;\n    loss += -(y[i] * Math.log(p + eps) + (1 - y[i]) * Math.log(1 - p + eps));\n    const d = p - y[i];              // ← 梯度就是 (预测 − 真实)\n    for (let j = 0; j &lt; w.length; j += 1) gw[j] += d * X[i][j];\n    gb += d;\n  }\n  return { loss: loss / X.length, gw: gw.map((g) =&gt; g / X.length), gb: gb / X.length };\n}\n\n// 3. 梯度下降\nfor (let step = 0; step &lt; 4000; step += 1) {\n  const { gw, gb } = lossAndGrad(w, b, X, y);\n  for (let j = 0; j &lt; w.length; j += 1) w[j] -= lr * gw[j];\n  b -= lr * gb;\n}</code></pre></div>\n<p>跑起来：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js</code></pre></div>\n<h2 id=\"use-it-框架调用\">USE IT：框架调用</h2>\n<p>框架做的事和上面完全一样，只是把「手写三次循环」封成了 <code>fit</code>。本课用同一个梯度公式做一次 10 批的<strong>小批量</strong>训练，验证手写版本与批量版本的解在同一量级。</p>\n<p>关键对照：如果两种实现给出的权重<strong>符号相反</strong>，那一定是特征标准化或学习率出了问题，不是「模型玄学」。</p>\n<h2 id=\"ship-it-产出物\">SHIP IT：产出物</h2>\n<ul><li><a href=\"../outputs/prompt-yin-yang-er-fenlei.html\">📋 Prompt 模板</a> —— 让大模型按「体征 → 阴阳倾向 + 理由」的格式输出，并要求它标注不确定项</li><li><a href=\"../outputs/skill-yin-yang-er-fenlei.html\">🛠️ Skill 文件</a> —— 把本课的判别流程固化成一个可复用的操作技能</li></ul>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\n# Expected:\n# ═══ 阴阳 → 二分类：从零实现 (中医基础理论 第1章) ═══\n# 样本: 8 例八纲典型证候 | 特征: 畏寒 / 口渴 / 脉数\n# 训练 4000 步后:\n#   w = [ -7.60,   5.19,   5.85]\n#   b = -2.10\n#   损失轨迹 (每500步): 0.693 → 0.013 → 0.006 → 0.004 → 0.003 → 0.003 → 0.002 → 0.002\n#   训练集准确率: 8/8 = 100%\n# 解读:\n#   畏寒项 w=-7.60 → 该项越强越偏阴\n#   口渴项 w=5.19 → 该项越强越偏阳\n#   脉数项 w=5.85 → 该项越强越偏阳\n# 对照: 小批量(seed=20261012, batch=4, 2000步)\n#   w = [ -6.76,   4.62,   5.19]\n#   符号与全批量一致: 是 ✅（解法稳定）\n# 边界声明: 本例为教学样例，非临床数据集；输出不构成诊疗建议。\n# 退出码 0</code></pre></div>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node --test code/\n# Expected: 6 项测试全部通过</code></pre></div>\n<blockquote><p><strong>权重绝对值不要当作重要度。</strong> 本例数据是<strong>线性可分</strong>的，交叉熵没有有限的最优解，权重会一直往大处走 —— 所以 <code>-7.60</code> 并不比 <code>-3.00</code> 更&quot;重要&quot;，它只是训练得更久。\n真正稳定的是<strong>符号</strong>：畏寒项为负、口渴与脉数项为正。符号翻转就是实现有 bug。\n想拿到有界的权重，需要加 L2 正则或提前停止 —— 这是第 4 章的题目。</p></blockquote>\n<h3 id=\"本节翻译的代价与边界\">本节翻译的代价与边界</h3>\n<p>必须显式写清，否则这门课就是只报喜不报忧：</p>\n<p><strong>丢掉了什么</strong></p>\n<div class=\"table-wrap\"><table><thead><tr><th>丢失项</th><th>为什么是结构性的</th></tr></thead><tbody><tr><td><strong>关系性</strong></td><td>阴阳只在相对某个参照时才成立（没有孤立的「阴」）；而 sigmoid 输出的是一个<strong>绝对</strong>概率 —— 参照点被固定进特征，换一组参照就得重训</td></tr><tr><td><strong>消长是过程</strong></td><td>阴阳消长讲的是量变积累到「重阴必阳」的质变；二分类只给一条阈值线，把过程压成了一个点</td></tr><tr><td><strong>时间维度</strong></td><td>「阴阳转化」是动态的，单次分类是静态快照 —— 同一个病人在不同时刻可能被判成不同类，而模型无法表达「正在转」</td></tr><tr><td><strong>互根</strong></td><td>阴中有阳、阳中有阴；二分类的两个类是<strong>互斥</strong>的，表达不了相互包含</td></tr></tbody></table></div>\n<p><strong>这四条不是实现没写好，是表示方式本身带不动的。</strong></p>\n<p><strong>不适用范围</strong></p>\n<ul><li>不用来判断「阴阳消长的<strong>趋势</strong>」—— 那需要时序模型，不是单次分类。</li><li>不用于复合证候：「寒热错杂」「上热下寒」这类并存的证，强行二分只会得到一半正确的答案，</li></ul>\n<p>  而一次「一半正确」的临床判断比明确说「不知道」更危险。</p>\n<ul><li>不用于替代四诊合参：本模型只接收结构化体征，缺一项（如舌脉）输出就会整体偏移。</li></ul>\n<blockquote><p><strong>边界声明</strong>：本章示例数据为教学样例，<strong>非临床数据集</strong>；本章给出的任何模型输出均不构成诊疗建议，也不能替代执业医师的判断。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<p>见 <a href=\"../exercises.html\">exercises.md</a>。</p>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<ol><li>如果把「畏寒」换成「手足温度」这种连续量，特征标准化会不会改变权重的可解释性？</li><li>这个模型在什么情况下必须拒答？（提示：想想模态缺失与阈值落在 0.5 附近的病例）</li><li>阴阳转化（「重阴必阳」）需要模型具备什么结构，是单次分类能给的吗？</li></ol>",
    "markdown": "# 第 1 章 · 阴阳学说 → 二分类：从零实现逻辑回归\n\n> **MOTTO:** 「阴阳者，天地之道也，万物之纲纪，变化之父母，生杀之本始，神明之府也。」——《素问·阴阳应象大论》\n>\n> **PROBLEM:** 你能背出「阳虚则寒、阴虚则热」，但让你把一位病人的四诊信息落到「偏阴还是偏阳」这一个判断上，你只会说「感觉像」。\n>\n> **双根因定位:** 环境逼迫(“跟诊时说不出辨证依据，老师追问一句就卡住”) + 知识积累(阴阳学说 × 逻辑回归 = 一个能说出理由、能报出置信度的二分类判断)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 中医基础理论 |\n| 院系 | 中医系 |\n| 章序号 | 01 / 10 |\n| 所属阶段 | 🌱 生·启蒙 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 3 小时 |\n\n## 课程结构\n\n```text\nMOTTO  →  PROBLEM  →  CONCEPT  →  BUILD IT  →  USE IT  →  SHIP IT\n一句话      痛点      原理+图解    从零实现     框架调用    产出工具\n```\n\n## 学习目标\n\n- 用不超过 30 行代码，把「阴阳」判别写成一次二分类，并逐项解释权重含义\n- 说清 sigmoid 的输出为什么是「概率」而不是「标签」，以及这个区别在临床上意味着什么\n- 指出把阴阳等同于二进制 0/1 会丢掉哪些语义（这是本课的**排除项**，必须能自己讲出来）\n- 用交叉熵损失手写一次梯度下降，并解释学习率过大时会发生什么\n- 给定一个新病例的体征，算出它的阳证概率并给出可复核的理由\n\n<div data-figure=\"yin-yang-sigmoid\"></div>\n\n## 核心概念\n\n### 中医：阴阳\n\n阴阳是对相互对立又相互依存的两类属性的抽象概括。《素问·阴阳应象大论》把它抬到「万物之纲纪」的位置。关键在于它是**关系性**的，不是分类标签：没有孤立的「阴」，只有相对某参照的「偏阴」。\n\n临床落地时，八纲里的阴阳是**总纲**——表里、寒热、虚实六纲都可以归到阴阳下。所以本章不是要判「属于哪种证」，而是判「这一组体征整体上偏向哪一侧，偏多少」。\n\n### AI / 工程：逻辑回归\n\n给定特征向量 $\\mathbf{x}$，先做一次线性打分：\n\n$$z = \\mathbf{w}^\\top\\mathbf{x} + b$$\n\n再用 sigmoid 把实数压到 $(0,1)$：\n\n$$p = \\sigma(z) = \\frac{1}{1+e^{-z}}$$\n\n以交叉熵为损失 $L = -[y\\log p + (1-y)\\log(1-p)]$ 时，梯度有一个非常干净的形式：\n\n$$\\frac{\\partial L}{\\partial \\mathbf{w}} = (p - y)\\,\\mathbf{x}$$\n\n这意味着每个权重的更新方向，就是「预测偏差 × 该特征取值」。**权重会自己长成对特征重要性的解释** —— 这正是阴阳判别需要的「说得清理由」。\n\n### 对应关系\n\n| 中医概念 | AI / 工程概念 | 桥梁（为什么可以这样翻译） |\n|---------|--------------|--------------------------|\n| 阴阳 | 二分类的两个类别 | 对立两端的划分，与二分类的标签空间一一对应 [**B 级**] |\n| 偏阴偏阳的**程度** | sigmoid 输出的连续概率 | 虚证不是「非阴即阳」，而是偏向程度不同；连续输出保留了强度 [**B 级**] |\n| 阴阳互根互用 | 两类的概率之和为 1 | 这一条是**约束**，恰好对应 $p + (1-p) = 1$ [**A 级**] |\n| 阴阳转化 | 状态转移 / 阈值翻转 | 「重阴必阳」是**动态过程**；本章的单次分类模型**拿不到**这一层，需在后续章节用状态机补 |\n| 阴阳 = 二进制 0/1 | —— | ❌ **D 级误用**。二进制位互斥且可交换，阴阳互根、可转化、带强度。用位运算处理阴阳会丢掉全部动态语义 |\n\n```mermaid\ngraph LR\n  A[\"八纲体征<br/>畏寒 / 口渴 / 脉率\"] --> B[\"特征向量 x\"]\n  B --> C[\"线性打分 z = wᵀx + b\"]\n  C --> D[\"sigmoid → P(阳证)\"]\n  D --> E[\"阈值判定 + 置信度\"]\n  E -.->|回指校验| F[\"能否用中医语言复述权重含义？\"]\n  F -.->|不能| G[\"说明特征设计有问题，回到 A\"]\n```\n\n## BUILD IT：从零实现\n\n只用 Node.js 标准库。三件事必须自己写：sigmoid、交叉熵、梯度下降。\n\n```javascript\n// 1. sigmoid —— 注意数值稳定写法：z 很负时 e^{-z} 会溢出\nfunction sigmoid(z) {\n  if (z >= 0) { const e = Math.exp(-z); return 1 / (1 + e); }\n  const e = Math.exp(z); return e / (1 + e);\n}\n\n// 2. 交叉熵 + 梯度（一次算完）\nfunction lossAndGrad(w, b, X, y) {\n  let loss = 0;\n  const gw = [0, 0, 0];\n  let gb = 0;\n  for (let i = 0; i < X.length; i += 1) {\n    const z = dot(w, X[i]) + b;\n    const p = sigmoid(z);\n    const eps = 1e-9;\n    loss += -(y[i] * Math.log(p + eps) + (1 - y[i]) * Math.log(1 - p + eps));\n    const d = p - y[i];              // ← 梯度就是 (预测 − 真实)\n    for (let j = 0; j < w.length; j += 1) gw[j] += d * X[i][j];\n    gb += d;\n  }\n  return { loss: loss / X.length, gw: gw.map((g) => g / X.length), gb: gb / X.length };\n}\n\n// 3. 梯度下降\nfor (let step = 0; step < 4000; step += 1) {\n  const { gw, gb } = lossAndGrad(w, b, X, y);\n  for (let j = 0; j < w.length; j += 1) w[j] -= lr * gw[j];\n  b -= lr * gb;\n}\n```\n\n跑起来：\n\n```bash\nnode code/main.js\n```\n\n## USE IT：框架调用\n\n框架做的事和上面完全一样，只是把「手写三次循环」封成了 `fit`。本课用同一个梯度公式做一次 10 批的**小批量**训练，验证手写版本与批量版本的解在同一量级。\n\n关键对照：如果两种实现给出的权重**符号相反**，那一定是特征标准化或学习率出了问题，不是「模型玄学」。\n\n## SHIP IT：产出物\n\n- [📋 Prompt 模板](../outputs/prompt-yin-yang-er-fenlei.md) —— 让大模型按「体征 → 阴阳倾向 + 理由」的格式输出，并要求它标注不确定项\n- [🛠️ Skill 文件](../outputs/skill-yin-yang-er-fenlei.md) —— 把本课的判别流程固化成一个可复用的操作技能\n\n## 验证\n\n```bash\nnode code/main.js\n# Expected:\n# ═══ 阴阳 → 二分类：从零实现 (中医基础理论 第1章) ═══\n# 样本: 8 例八纲典型证候 | 特征: 畏寒 / 口渴 / 脉数\n# 训练 4000 步后:\n#   w = [ -7.60,   5.19,   5.85]\n#   b = -2.10\n#   损失轨迹 (每500步): 0.693 → 0.013 → 0.006 → 0.004 → 0.003 → 0.003 → 0.002 → 0.002\n#   训练集准确率: 8/8 = 100%\n# 解读:\n#   畏寒项 w=-7.60 → 该项越强越偏阴\n#   口渴项 w=5.19 → 该项越强越偏阳\n#   脉数项 w=5.85 → 该项越强越偏阳\n# 对照: 小批量(seed=20261012, batch=4, 2000步)\n#   w = [ -6.76,   4.62,   5.19]\n#   符号与全批量一致: 是 ✅（解法稳定）\n# 边界声明: 本例为教学样例，非临床数据集；输出不构成诊疗建议。\n# 退出码 0\n```\n\n```bash\nnode --test code/\n# Expected: 6 项测试全部通过\n```\n\n> **权重绝对值不要当作重要度。** 本例数据是**线性可分**的，交叉熵没有有限的最优解，权重会一直往大处走 —— 所以 `-7.60` 并不比 `-3.00` 更\"重要\"，它只是训练得更久。\n> 真正稳定的是**符号**：畏寒项为负、口渴与脉数项为正。符号翻转就是实现有 bug。\n> 想拿到有界的权重，需要加 L2 正则或提前停止 —— 这是第 4 章的题目。\n\n### 本节翻译的代价与边界\n\n必须显式写清，否则这门课就是只报喜不报忧：\n\n**丢掉了什么**\n\n| 丢失项 | 为什么是结构性的 |\n|--------|----------------|\n| **关系性** | 阴阳只在相对某个参照时才成立（没有孤立的「阴」）；而 sigmoid 输出的是一个**绝对**概率 —— 参照点被固定进特征，换一组参照就得重训 |\n| **消长是过程** | 阴阳消长讲的是量变积累到「重阴必阳」的质变；二分类只给一条阈值线，把过程压成了一个点 |\n| **时间维度** | 「阴阳转化」是动态的，单次分类是静态快照 —— 同一个病人在不同时刻可能被判成不同类，而模型无法表达「正在转」 |\n| **互根** | 阴中有阳、阳中有阴；二分类的两个类是**互斥**的，表达不了相互包含 |\n\n**这四条不是实现没写好，是表示方式本身带不动的。**\n\n**不适用范围**\n\n- 不用来判断「阴阳消长的**趋势**」—— 那需要时序模型，不是单次分类。\n- 不用于复合证候：「寒热错杂」「上热下寒」这类并存的证，强行二分只会得到一半正确的答案，\n  而一次「一半正确」的临床判断比明确说「不知道」更危险。\n- 不用于替代四诊合参：本模型只接收结构化体征，缺一项（如舌脉）输出就会整体偏移。\n\n> **边界声明**：本章示例数据为教学样例，**非临床数据集**；本章给出的任何模型输出均不构成诊疗建议，也不能替代执业医师的判断。\n\n## 练习\n\n见 [exercises.md](../exercises.md)。\n\n## 进阶思考\n\n1. 如果把「畏寒」换成「手足温度」这种连续量，特征标准化会不会改变权重的可解释性？\n2. 这个模型在什么情况下必须拒答？（提示：想想模态缺失与阈值落在 0.5 附近的病例）\n3. 阴阳转化（「重阴必阳」）需要模型具备什么结构，是单次分类能给的吗？\n",
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
        "kind": "prompt",
        "file": "departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/01-yin-yang-er-fenlei/outputs/prompt-yin-yang-er-fenlei.md",
        "title": "Prompt · 阴阳倾向结构化归因",
        "description": null,
        "chars": 1234,
        "body": "# Prompt · 阴阳倾向结构化归因\n\n> 学科: 中医基础理论 · 章节: 01-yin-yang-er-fenlei\n\n## 用途\n\n把一段非结构化的四诊记录，转成带**可核查理由**与**置信边界**的阴阳倾向判断。\n用于教学复盘与病历整理，不用于临床决策。\n\n## 系统提示\n\n```text\n你是一名中医基础理论教学的助教。你的任务不是诊断，而是把一段四诊描述\n结构化，并按「阴阳」这一总纲给出倾向判断 + 逐项理由 + 不确定性说明。\n\n规则：\n1. 只使用输入里出现的信息。抽不到的体征一律标为「缺失」，禁止补全、禁止推断。\n2. 不要输出任何证型名称、方剂、剂量或治则。这不是你的职责范围。\n3. 输出必须包含每项体征对判断的贡献方向（偏阴 / 偏阳），且每项都要能指回输入原文。\n4. 若缺失体征 ≥ 2 项，或倾向不明显，必须输出「无法判断」，并列出还需要问什么。\n5. 引用经典时写出书名与篇名，例如《素问·阴阳应象大论》。不确定出处就不要引用。\n6. 结尾必须原样输出这句声明：\n   本输出为结构化辅助，不构成临床诊疗建议。\n\n输出 JSON：\n{\n  \"extracted\": { \"畏寒\": 0.0|\"缺失\", \"口渴\": 0.0|\"缺失\", \"脉数\": 0.0|\"缺失\" },\n  \"evidence\":  [{ \"feature\": \"…\", \"value\": 0.0, \"direction\": \"偏阴|偏阳\", \"quote\": \"原文片段\" }],\n  \"verdict\":   \"偏阴|偏阳|无法判断\",\n  \"missing\":   [\"…\"],\n  \"confidence_note\": \"…\",\n  \"disclaimer\": \"本输出为结构化辅助，不构成临床诊疗建议。\"\n}\n```\n\n## 输入 / 输出契约\n\n| 输入 | 类型 | 必填 | 说明 |\n|------|------|------|------|\n| `记录` | string | 是 | 医师的原始四诊描述，可以是口语化的 |\n| `关注象限` | string | 否 | 只关心某几项体征时填，例如「只看畏寒与口渴」 |\n\n| 输出字段 | 类型 | 说明 |\n|---------|------|------|\n| `extracted` | object | 抽取值或 `\"缺失\"` |\n| `evidence` | array | 每项含 `quote`，必须能在原文中逐字找到 |\n| `verdict` | enum | 三值，不允许其他取值 |\n| `missing` | array | 判定为「无法判断」时必须非空 |\n| `disclaimer` | string | 固定文案 |\n\n## 反例（模型最容易犯的错）\n\n| 错误输出 | 为什么错 |\n|---------|---------|\n| 「患者属阳虚证，宜温补」 | 越界：给了证型与治则 |\n| 「畏寒明显，故口渴应为无」 | 补全：把缺失项推断了 |\n| 「脉象未提及，默认为平脉」 | 静默填值：把缺失当正常，这是最危险的一种 |\n| 「《黄帝内经》云……」 | 出处含糊：必须写到篇名 |\n\n## 校验\n\n- [ ] `evidence` 里每个 `quote` 都能在输入原文中逐字匹配\n- [ ] 缺两项时输出必为「无法判断」\n- [ ] 输出中不含方剂、剂量、治则\n- [ ] `disclaimer` 逐字存在\n"
      },
      {
        "name": "skill-yin-yang-er-fenlei.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/01-yin-yang-er-fenlei/outputs/skill-yin-yang-er-fenlei.md",
        "title": "阴阳倾向结构化判别",
        "description": "把四诊体征结构化为阴阳倾向判断（含置信度与拒答条件），并逐项给出可核查理由。",
        "chars": 1322,
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
    "html": "<h1 id=\"第-2-章-五行学说-多分类-从零实现-softmax-并检验生克约束是否真的有用\">第 2 章 · 五行学说 → 多分类：从零实现 Softmax（并检验生克约束是否真的有用）</h1>\n<blockquote><p><strong>MOTTO:</strong> 「五行：一曰水，二曰火，三曰木，四曰金，五曰土。」——《尚书·洪范》</p>\n<p><strong>PROBLEM:</strong> 你知道五行是五类，于是写了个五分类器；但相生相克去哪了？你可能已经听过「纯 softmax 会丢掉关系」这句断言 —— 本章要做的第一件事，是<strong>去测它到底对不对</strong>。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(“答辩时被问『你的五行分类器和普通五分类器有什么区别』，答不上来”) + 知识积累(五行生克 × softmax 与关系正则 = 能自己设计并检验约束的建模能力)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>中医基础理论</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>02 / 10</td></tr><tr><td>所属阶段</td><td>🌱 生·启蒙</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>4 小时</td></tr></tbody></table></div>\n<h2 id=\"课程结构\">课程结构</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">MOTTO  →  PROBLEM  →  CONCEPT  →  BUILD IT  →  USE IT  →  SHIP IT\n一句话      痛点      原理+图解    从零实现     框架调用    产出工具</code></pre></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>从零实现 softmax（含减 max 的数值稳定写法），并解释不减 max 会在什么量级上溢出</li><li>把「相生 / 相克」写成一对<strong>余弦约束</strong>加进损失函数，手推其梯度</li><li>用 λ 扫描<strong>测量</strong>一个约束的实际效果，而不是相信断言</li><li>说清本章实验里「纯 softmax 已经满足生克一致性」的原因，并指出这暴露了表示层的什么问题</li><li>判断什么情况下应该加约束、什么情况下加约束只是自伤</li></ul>\n<div class=\"figure-host\" data-figure=\"wuxing-cycle\"></div>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"中医-五行与生克\">中医：五行与生克</h3>\n<p>《尚书·洪范》给出五行的名目与次序；《素问·五运行大论》等篇给出相生相克的关系：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">相生：木 → 火 → 土 → 金 → 水 → 木   （外圈，顺时针）\n相克：木克土 · 土克水 · 水克火 · 火克金 · 金克木  （五角星）</code></pre></div>\n<p>关键在于<strong>关系是学说的主体</strong>。如果把五行当成 5 个互不相干的类，那这门学说就退化成了\n一份五格清单 —— 它最有信息量的部分（哪两类互相促进、哪两类互相制约）全丢了。</p>\n<h3 id=\"ai-工程-softmax-与关系正则\">AI / 工程：Softmax 与关系正则</h3>\n<p>多分类用 softmax 把打分转为概率：</p>\n<span class=\"math-block\">p<sub>k</sub> = <span class=\"frac\"><span class=\"frac-num\">e<sup>z<sub>k</sub></sup></span><span class=\"frac-den\">∑<sub>j=1</sub><sup>K</sup> e<sup>z<sub>j</sub></sup></span></span>,    z<sub>k</sub> = <b>w</b><sub>k</sub>ᵀ <b>x</b> + b<sub>k</sub></span>\n<p>数值稳定写法必须先减去最大值：</p>\n<span class=\"math-block\">p<sub>k</sub> = <span class=\"frac\"><span class=\"frac-num\">e<sup>z<sub>k</sub> - <span class=\"math-op\">max</span><sub>j</sub> z<sub>j</sub></sup></span><span class=\"frac-den\">∑<sub>j</sub> e<sup>z<sub>j</sub> - <span class=\"math-op\">max</span><sub>j</sub> z<sub>j</sub></sup></span></span></span>\n<p>把关系写成约束，最直接的一种是<strong>约束类权重向量之间的夹角</strong>：</p>\n<span class=\"math-block\"><span class=\"math-cal\">L</span> = -<span class=\"frac\"><span class=\"frac-num\">1</span><span class=\"frac-den\">N</span></span>∑<sub>i</sub> <span class=\"math-op\">log</span> p<sub>y<sub>i</sub></sub><sub class=\"math-note\"><span class=\"math-text\">交叉熵</span></sub> + λ∑<sub>(i,j)∈<span class=\"math-text\">生</span></sub> <span class=\"math-op\">max</span>(0,  m<sub>s</sub> - <span class=\"math-op\">cos</span>(<b>w</b><sub>i</sub>,<b>w</b><sub>j</sub>)) + ∑<sub>(i,j)∈<span class=\"math-text\">克</span></sub> <span class=\"math-op\">max</span>(0,  <span class=\"math-op\">cos</span>(<b>w</b><sub>i</sub>,<b>w</b><sub>j</sub>) - m<sub>k</sub>)</span>\n<ul><li>相生对：把两个方向<strong>拉近</strong>（余弦不小于 <span class=\"math\">m<sub>s</sub></span>）</li><li>相克对：把两个方向<strong>推远</strong>（余弦不大于 <span class=\"math\">m<sub>k</sub></span>）</li><li><span class=\"math\">λ</span> 是这两者与分类准确率之间的交换率 —— 它不是免费的</li></ul>\n<h3 id=\"对应关系\">对应关系</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>中医概念</th><th>AI / 工程概念</th><th>桥梁（为什么可以这样翻译）</th><th>级别</th></tr></thead><tbody><tr><td>五行</td><td>5 类多分类</td><td>类别数为 5，与五行名目一一对应</td><td><strong>B</strong></td></tr><tr><td>相生</td><td>类权重向量之间的<strong>正</strong>余弦约束</td><td>相生意味着两类在语义上互相促进 → 方向相近</td><td><strong>B</strong></td></tr><tr><td>相克</td><td>类权重向量之间的<strong>负</strong>余弦约束</td><td>相克意味着互相制约 → 方向相斥</td><td><strong>B</strong></td></tr><tr><td>五行配属表</td><td>属性矩阵（色/味/志/方位）</td><td>通行配属表给出的正是这四组对应</td><td><strong>A</strong></td></tr><tr><td>「五位一体的整体观」</td><td>结构约束先验</td><td>五行不是 5 个独立标签，而是一个带边的系统</td><td><strong>B</strong></td></tr><tr><td>五行 = 五行分类器</td><td>——</td><td>⚠️ <strong>C 级类比</strong>。只对了类别数，丢掉了全部关系。本章就是来测这个代价的</td><td><strong>C</strong></td></tr></tbody></table></div>\n<pre class=\"mermaid\">graph LR\n  A[&quot;五行配属表&lt;br/&gt;色 / 味 / 志 / 方位&quot;] --&gt; B[&quot;属性矩阵 X (20×4)&quot;]\n  B --&gt; C[&quot;softmax 五分类&quot;]\n  C --&gt; D[&quot;测准确率&quot;]\n  E[&quot;生克关系&lt;br/&gt;5 条相生 + 5 条相克&quot;] --&gt; F[&quot;余弦约束&quot;]\n  F --&gt; G[&quot;λ 扫描&quot;]\n  D --&gt; H[&quot;结论：约束值不值&quot;]\n  G --&gt; H\n  H -.-&gt;|回指校验| I[&quot;这个约束在模型里真的有中医含义吗？&quot;]</pre>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<p>两件事：softmax（带数值稳定），以及把生克写成可求导的 hinge 约束。</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">javascript</div><pre><code class=\"lang-javascript\">function softmax(z) {\n  const m = Math.max(...z);\n  const e = z.map((v) =&gt; Math.exp(v - m));   // ← 减 max：正确性要求，不是优化\n  const s = e.reduce((a, b) =&gt; a + b, 0);\n  return e.map((v) =&gt; v / s);\n}\n\n// 相生: hinge(mSheng − cos)  相克: hinge(cos − mKe)\nconst c = cosine(W[i], W[j]);\nconst violation = wantAbove ? mSheng - c : c - mKe;\nif (violation &lt;= 0) return;                 // 满足约束就不产生梯度\n// d(cos)/d(W[i]) = W[j]/(|W[i]||W[j]|) − cos·W[i]/|W[i]|²</code></pre></div>\n<p>跑起来：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js</code></pre></div>\n<h2 id=\"实测结果-断言被推翻了\">实测结果：断言被推翻了</h2>\n<p>这是本章最重要的部分。运行后的真实输出：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">特征共线检查: 四列次序完全一致 = 是 ⚠（结构上共线，见下文）\n\n【A】纯 softmax（λ=0）\n  训练准确率: 100.0%\n  相生对平均余弦: 0.014 | 相克对平均余弦: -0.493 | 差 0.507\n  关系一致性: 满足 ✅\n\n【B】生克正则的 λ 扫描\n  λ      准确率   相生均值   相克均值   差值\n  0      100.0%   0.014      -0.493     0.507\n  0.2    100.0%   0.448      -0.052     0.499\n  0.5    95.0%    0.498      -0.009     0.507\n  1      95.0%    0.529      0.056      0.474\n  2      85.0%    0.513      0.079      0.434\n  5      60.0%    0.477      0.057      0.420</code></pre></div>\n<p><strong>结论一：「纯 softmax 一定丢掉关系」在本数据上是错的。</strong>\nλ=0 时相生对的平均余弦（0.014）已经高于相克对（−0.493），差 0.507 &gt; 0 —— 关系一致性已经满足。</p>\n<p><strong>为什么？</strong> 因为通行的五行配属表里，色、味、志、方位四个维度的次序<strong>完全一致</strong>：</p>\n<div class=\"table-wrap\"><table><thead><tr><th></th><th>木</th><th>火</th><th>土</th><th>金</th><th>水</th></tr></thead><tbody><tr><td>色</td><td>青</td><td>赤</td><td>黄</td><td>白</td><td>黑</td></tr><tr><td>味</td><td>酸</td><td>苦</td><td>甘</td><td>辛</td><td>咸</td></tr><tr><td>志</td><td>怒</td><td>喜</td><td>思</td><td>悲</td><td>恐</td></tr><tr><td>方位</td><td>东</td><td>南</td><td>中</td><td>西</td><td>北</td></tr><tr><td><strong>序号</strong></td><td>0</td><td>1</td><td>2</td><td>3</td><td>4</td></tr></tbody></table></div>\n<p>四列序号完全相同 ⇒ 特征矩阵<strong>共线</strong>。共线意味着最优解天然把五个类沿一个方向按次序排开；\n而&quot;沿一条轴排序&quot;这件事，恰好自动让相邻类（相生）方向接近、隔一类（相克）方向相反。\n<strong>约束被数据的结构免费满足了。</strong></p>\n<p><strong>结论二：约束不是免费的。</strong>\n加正则后关系差并没有变大（λ=0.5 时反而与 λ=0 同为 0.507），而准确率从 100% 一路掉到 λ=5 时的 60%。\n在本数据上，这个约束<strong>只带来代价，不带来收益</strong>。</p>\n<p><strong>结论三（本章真正要教的）：先测量，再断言。</strong>\n「加约束一定更好」和「纯 softmax 一定丢掉关系」是同一种毛病的两种说法 —— 都是没跑就下结论。\n本章的产出不是&quot;我给五行加了约束&quot;，而是&quot;我测出在这个表示下约束是冗余的，因为配属表共线&quot;。</p>\n<p><strong>那什么时候约束才有用？</strong> 当特征表示<strong>不共线</strong>时 —— 例如用可学习的药性嵌入代替序数编码，\n让每个类的方向独立确定，这时关系约束才会真正改变解。那是「中药药性·嵌入」章的题目。</p>\n<h3 id=\"本节翻译的代价与边界\">本节翻译的代价与边界</h3>\n<p>必须显式写清，否则这门课就是只报喜不报忧：</p>\n<p><strong>丢掉了什么</strong></p>\n<div class=\"table-wrap\"><table><thead><tr><th>丢失项</th><th>为什么是结构性的</th></tr></thead><tbody><tr><td>分类标签是<strong>无序</strong>的</td><td>softmax 中五类地位完全平等；而五行的「相生有向、相克隔一」是有向约束，只能在损失函数里外加</td></tr><tr><td>「五位一体」的<strong>整体性</strong></td><td>五个输出头是并列关系，没有一个&quot;整体层&quot;来承载&quot;生克制化作为整体才成立&quot;这层含义</td></tr><tr><td>「太过」与「不及」</td><td>五行各有太过不及（如木旺、木虚），序数编码无法表达同一行的双向偏离</td></tr></tbody></table></div>\n<p><strong>不适用范围</strong></p>\n<ul><li>本数据是<strong>构造的教学样例</strong>，非临床数据集；输出的准确率、余弦值<strong>不具备临床效力</strong>。</li><li>本节的 λ 扫描结论<strong>只在共线表示下成立</strong>。换成独立特征或嵌入表示后，必须重跑扫描。</li><li>不构成任何诊疗建议。教学样例数据不能用于病人。</li></ul>\n<p><strong>一处必须排除的误用（C 级）</strong></p>\n<blockquote><p>「五行分类器 = 五行学说」—— 只对了类别数（5），丢掉了关系层。\n本节的实验恰好证明：在共线表示下关系&quot;免费&quot;且约束无用；这说明<strong>是表示而不是分类器在承载五行语义</strong>。\n把它当成&quot;五行已经被 AI 学会了&quot;是 C 级类比，不得进入任何临床输出路径。</p></blockquote>\n<h2 id=\"use-it-框架调用\">USE IT：框架调用</h2>\n<p>任何成熟框架里，加这项约束都只是 <code>loss = ce + lambda * reg</code> 一行。真正的工作量在于：</p>\n<ol><li>设计可微的约束形式（hinge？KL？距离？）</li><li>扫描 λ，画出「准确率 vs 关系差」的权衡曲线</li><li>判断这条曲线是否值得走 —— 本课的例子告诉你，不总是值得</li></ol>\n<h2 id=\"ship-it-产出物\">SHIP IT：产出物</h2>\n<ul><li><a href=\"../outputs/prompt-wu-xing-duo-fenlei.html\">📋 Prompt 模板</a> —— 让大模型在给出五行归类时，<strong>必须同时给出所依据的配属维度</strong>，并显式标注关系一致性</li><li><a href=\"../outputs/skill-wu-xing-duo-fenlei.html\">🛠️ Skill 文件</a> —— 把「加约束前先测基线」固化成一个可复用的实验流程</li></ul>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\n# Expected: 见上方「实测结果」代码块，退出码 0</code></pre></div>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node --test code/main.test.js\n# Expected: 全部通过</code></pre></div>\n<blockquote><p><strong>边界声明</strong>：本章示例数据为教学样例，<strong>非临床数据集</strong>；本章给出的任何模型输出均不构成诊疗建议，也不能替代执业医师的判断。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<p>见 <a href=\"../exercises.html\">exercises.md</a>。</p>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<ol><li>如果打乱某一列（例如把「味」的次序随机重排），共线性被破坏，λ 扫描的曲线会变成什么样？先预测再跑。</li><li>用 one-hot 编码替代序数编码后，λ=0 的关系差会变成多少？为什么？</li><li>「五位一体」这种整体观，除了余弦约束，还能用哪些可微形式表达？各自的代价是什么？</li></ol>",
    "markdown": "# 第 2 章 · 五行学说 → 多分类：从零实现 Softmax（并检验生克约束是否真的有用）\n\n> **MOTTO:** 「五行：一曰水，二曰火，三曰木，四曰金，五曰土。」——《尚书·洪范》\n>\n> **PROBLEM:** 你知道五行是五类，于是写了个五分类器；但相生相克去哪了？你可能已经听过「纯 softmax 会丢掉关系」这句断言 —— 本章要做的第一件事，是**去测它到底对不对**。\n>\n> **双根因定位:** 环境逼迫(“答辩时被问『你的五行分类器和普通五分类器有什么区别』，答不上来”) + 知识积累(五行生克 × softmax 与关系正则 = 能自己设计并检验约束的建模能力)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 中医基础理论 |\n| 院系 | 中医系 |\n| 章序号 | 02 / 10 |\n| 所属阶段 | 🌱 生·启蒙 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 4 小时 |\n\n## 课程结构\n\n```text\nMOTTO  →  PROBLEM  →  CONCEPT  →  BUILD IT  →  USE IT  →  SHIP IT\n一句话      痛点      原理+图解    从零实现     框架调用    产出工具\n```\n\n## 学习目标\n\n- 从零实现 softmax（含减 max 的数值稳定写法），并解释不减 max 会在什么量级上溢出\n- 把「相生 / 相克」写成一对**余弦约束**加进损失函数，手推其梯度\n- 用 λ 扫描**测量**一个约束的实际效果，而不是相信断言\n- 说清本章实验里「纯 softmax 已经满足生克一致性」的原因，并指出这暴露了表示层的什么问题\n- 判断什么情况下应该加约束、什么情况下加约束只是自伤\n\n<div data-figure=\"wuxing-cycle\"></div>\n\n## 核心概念\n\n### 中医：五行与生克\n\n《尚书·洪范》给出五行的名目与次序；《素问·五运行大论》等篇给出相生相克的关系：\n\n```text\n相生：木 → 火 → 土 → 金 → 水 → 木   （外圈，顺时针）\n相克：木克土 · 土克水 · 水克火 · 火克金 · 金克木  （五角星）\n```\n\n关键在于**关系是学说的主体**。如果把五行当成 5 个互不相干的类，那这门学说就退化成了\n一份五格清单 —— 它最有信息量的部分（哪两类互相促进、哪两类互相制约）全丢了。\n\n### AI / 工程：Softmax 与关系正则\n\n多分类用 softmax 把打分转为概率：\n\n$$p_k = \\frac{e^{z_k}}{\\sum_{j=1}^{K} e^{z_j}}, \\qquad z_k = \\mathbf{w}_k^\\top \\mathbf{x} + b_k$$\n\n数值稳定写法必须先减去最大值：\n\n$$p_k = \\frac{e^{z_k - \\max_j z_j}}{\\sum_j e^{z_j - \\max_j z_j}}$$\n\n把关系写成约束，最直接的一种是**约束类权重向量之间的夹角**：\n\n$$\\mathcal{L} = \\underbrace{-\\frac{1}{N}\\sum_i \\log p_{y_i}}_{\\text{交叉熵}} + \\lambda\\Big[\\sum_{(i,j)\\in\\text{生}} \\max(0,\\, m_s - \\cos(\\mathbf{w}_i,\\mathbf{w}_j)) + \\sum_{(i,j)\\in\\text{克}} \\max(0,\\, \\cos(\\mathbf{w}_i,\\mathbf{w}_j) - m_k)\\Big]$$\n\n- 相生对：把两个方向**拉近**（余弦不小于 $m_s$）\n- 相克对：把两个方向**推远**（余弦不大于 $m_k$）\n- $\\lambda$ 是这两者与分类准确率之间的交换率 —— 它不是免费的\n\n### 对应关系\n\n| 中医概念 | AI / 工程概念 | 桥梁（为什么可以这样翻译） | 级别 |\n|---------|--------------|--------------------------|------|\n| 五行 | 5 类多分类 | 类别数为 5，与五行名目一一对应 | **B** |\n| 相生 | 类权重向量之间的**正**余弦约束 | 相生意味着两类在语义上互相促进 → 方向相近 | **B** |\n| 相克 | 类权重向量之间的**负**余弦约束 | 相克意味着互相制约 → 方向相斥 | **B** |\n| 五行配属表 | 属性矩阵（色/味/志/方位） | 通行配属表给出的正是这四组对应 | **A** |\n| 「五位一体的整体观」 | 结构约束先验 | 五行不是 5 个独立标签，而是一个带边的系统 | **B** |\n| 五行 = 五行分类器 | —— | ⚠️ **C 级类比**。只对了类别数，丢掉了全部关系。本章就是来测这个代价的 | **C** |\n\n```mermaid\ngraph LR\n  A[\"五行配属表<br/>色 / 味 / 志 / 方位\"] --> B[\"属性矩阵 X (20×4)\"]\n  B --> C[\"softmax 五分类\"]\n  C --> D[\"测准确率\"]\n  E[\"生克关系<br/>5 条相生 + 5 条相克\"] --> F[\"余弦约束\"]\n  F --> G[\"λ 扫描\"]\n  D --> H[\"结论：约束值不值\"]\n  G --> H\n  H -.->|回指校验| I[\"这个约束在模型里真的有中医含义吗？\"]\n```\n\n## BUILD IT：从零实现\n\n两件事：softmax（带数值稳定），以及把生克写成可求导的 hinge 约束。\n\n```javascript\nfunction softmax(z) {\n  const m = Math.max(...z);\n  const e = z.map((v) => Math.exp(v - m));   // ← 减 max：正确性要求，不是优化\n  const s = e.reduce((a, b) => a + b, 0);\n  return e.map((v) => v / s);\n}\n\n// 相生: hinge(mSheng − cos)  相克: hinge(cos − mKe)\nconst c = cosine(W[i], W[j]);\nconst violation = wantAbove ? mSheng - c : c - mKe;\nif (violation <= 0) return;                 // 满足约束就不产生梯度\n// d(cos)/d(W[i]) = W[j]/(|W[i]||W[j]|) − cos·W[i]/|W[i]|²\n```\n\n跑起来：\n\n```bash\nnode code/main.js\n```\n\n## 实测结果：断言被推翻了\n\n这是本章最重要的部分。运行后的真实输出：\n\n```text\n特征共线检查: 四列次序完全一致 = 是 ⚠（结构上共线，见下文）\n\n【A】纯 softmax（λ=0）\n  训练准确率: 100.0%\n  相生对平均余弦: 0.014 | 相克对平均余弦: -0.493 | 差 0.507\n  关系一致性: 满足 ✅\n\n【B】生克正则的 λ 扫描\n  λ      准确率   相生均值   相克均值   差值\n  0      100.0%   0.014      -0.493     0.507\n  0.2    100.0%   0.448      -0.052     0.499\n  0.5    95.0%    0.498      -0.009     0.507\n  1      95.0%    0.529      0.056      0.474\n  2      85.0%    0.513      0.079      0.434\n  5      60.0%    0.477      0.057      0.420\n```\n\n**结论一：「纯 softmax 一定丢掉关系」在本数据上是错的。**\nλ=0 时相生对的平均余弦（0.014）已经高于相克对（−0.493），差 0.507 > 0 —— 关系一致性已经满足。\n\n**为什么？** 因为通行的五行配属表里，色、味、志、方位四个维度的次序**完全一致**：\n\n| | 木 | 火 | 土 | 金 | 水 |\n|---|---|---|---|---|---|\n| 色 | 青 | 赤 | 黄 | 白 | 黑 |\n| 味 | 酸 | 苦 | 甘 | 辛 | 咸 |\n| 志 | 怒 | 喜 | 思 | 悲 | 恐 |\n| 方位 | 东 | 南 | 中 | 西 | 北 |\n| **序号** | 0 | 1 | 2 | 3 | 4 |\n\n四列序号完全相同 ⇒ 特征矩阵**共线**。共线意味着最优解天然把五个类沿一个方向按次序排开；\n而\"沿一条轴排序\"这件事，恰好自动让相邻类（相生）方向接近、隔一类（相克）方向相反。\n**约束被数据的结构免费满足了。**\n\n**结论二：约束不是免费的。**\n加正则后关系差并没有变大（λ=0.5 时反而与 λ=0 同为 0.507），而准确率从 100% 一路掉到 λ=5 时的 60%。\n在本数据上，这个约束**只带来代价，不带来收益**。\n\n**结论三（本章真正要教的）：先测量，再断言。**\n「加约束一定更好」和「纯 softmax 一定丢掉关系」是同一种毛病的两种说法 —— 都是没跑就下结论。\n本章的产出不是\"我给五行加了约束\"，而是\"我测出在这个表示下约束是冗余的，因为配属表共线\"。\n\n**那什么时候约束才有用？** 当特征表示**不共线**时 —— 例如用可学习的药性嵌入代替序数编码，\n让每个类的方向独立确定，这时关系约束才会真正改变解。那是「中药药性·嵌入」章的题目。\n\n### 本节翻译的代价与边界\n\n必须显式写清，否则这门课就是只报喜不报忧：\n\n**丢掉了什么**\n\n| 丢失项 | 为什么是结构性的 |\n|--------|----------------|\n| 分类标签是**无序**的 | softmax 中五类地位完全平等；而五行的「相生有向、相克隔一」是有向约束，只能在损失函数里外加 |\n| 「五位一体」的**整体性** | 五个输出头是并列关系，没有一个\"整体层\"来承载\"生克制化作为整体才成立\"这层含义 |\n| 「太过」与「不及」 | 五行各有太过不及（如木旺、木虚），序数编码无法表达同一行的双向偏离 |\n\n**不适用范围**\n\n- 本数据是**构造的教学样例**，非临床数据集；输出的准确率、余弦值**不具备临床效力**。\n- 本节的 λ 扫描结论**只在共线表示下成立**。换成独立特征或嵌入表示后，必须重跑扫描。\n- 不构成任何诊疗建议。教学样例数据不能用于病人。\n\n**一处必须排除的误用（C 级）**\n\n> 「五行分类器 = 五行学说」—— 只对了类别数（5），丢掉了关系层。\n> 本节的实验恰好证明：在共线表示下关系\"免费\"且约束无用；这说明**是表示而不是分类器在承载五行语义**。\n> 把它当成\"五行已经被 AI 学会了\"是 C 级类比，不得进入任何临床输出路径。\n\n## USE IT：框架调用\n\n任何成熟框架里，加这项约束都只是 `loss = ce + lambda * reg` 一行。真正的工作量在于：\n\n1. 设计可微的约束形式（hinge？KL？距离？）\n2. 扫描 λ，画出「准确率 vs 关系差」的权衡曲线\n3. 判断这条曲线是否值得走 —— 本课的例子告诉你，不总是值得\n\n## SHIP IT：产出物\n\n- [📋 Prompt 模板](../outputs/prompt-wu-xing-duo-fenlei.md) —— 让大模型在给出五行归类时，**必须同时给出所依据的配属维度**，并显式标注关系一致性\n- [🛠️ Skill 文件](../outputs/skill-wu-xing-duo-fenlei.md) —— 把「加约束前先测基线」固化成一个可复用的实验流程\n\n## 验证\n\n```bash\nnode code/main.js\n# Expected: 见上方「实测结果」代码块，退出码 0\n```\n\n```bash\nnode --test code/main.test.js\n# Expected: 全部通过\n```\n\n> **边界声明**：本章示例数据为教学样例，**非临床数据集**；本章给出的任何模型输出均不构成诊疗建议，也不能替代执业医师的判断。\n\n## 练习\n\n见 [exercises.md](../exercises.md)。\n\n## 进阶思考\n\n1. 如果打乱某一列（例如把「味」的次序随机重排），共线性被破坏，λ 扫描的曲线会变成什么样？先预测再跑。\n2. 用 one-hot 编码替代序数编码后，λ=0 的关系差会变成多少？为什么？\n3. 「五位一体」这种整体观，除了余弦约束，还能用哪些可微形式表达？各自的代价是什么？\n",
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
        "kind": "prompt",
        "file": "departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/02-wu-xing-duo-fenlei/outputs/prompt-wu-xing-duo-fenlei.md",
        "title": "Prompt · 加约束前的基线测量",
        "description": null,
        "chars": 1300,
        "body": "# Prompt · 加约束前的基线测量\n\n> 学科: 中医基础理论 · 章节: 02-wu-xing-duo-fenlei\n\n## 用途\n\n这个 Prompt 要解决的不是「五行怎么分类」，而是**建模时最常见的自伤**：\n还没测基线就先加约束，然后把约束带来的代价误认为收益。\n\n它让大模型在设计一项约束前，先强制产出一份基线测量计划。\n\n## 系统提示\n\n```text\n你是一名建模方法学顾问。当有人提出「给模型加上某个领域约束」时，\n你的任务不是帮他实现，而是先逼他回答四个问题。\n\n必须按顺序回答，任何一项答不出来就说「信息不足」，不许猜测：\n\n1. 基线是什么？\n   不加这项约束时，该约束想强加的性质是否已经被满足？\n   要给出可测量的指标（不是\"效果好坏\"，而是具体数值与口径）。\n\n2. 代价在哪？\n   这项约束会与主损失竞争。给出一个交换率实验设计（例如参数扫描），\n   说明你会用哪个指标衡量代价。\n\n3. 机制是什么？\n   如果基线已经满足该性质，为什么？给出结构性原因（特征共线 / 数据泄漏 /\n   标签编码本身蕴含 / 评测口径选错）。答不出机制，就不许声称\"约束有效\"。\n\n4. 什么条件下结论失效？\n   明确写出这个实验的适用边界。\n\n输出格式：\n{\n  \"claim\": \"待检验的断言（原文引用）\",\n  \"baseline_metric\": { \"name\": \"…\", \"definition\": \"…\", \"expected_value\": \"…\" },\n  \"sweep_design\": { \"parameter\": \"…\", \"range\": [..], \"cost_metric\": \"…\" },\n  \"mechanism\": \"…\",\n  \"validity_boundary\": \"…\",\n  \"verdict\": \"先测基线 | 直接加约束（需给出理由）\"\n}\n\n禁止输出：「效果显著」「大幅提升」「一般来说会更好」。\n每个量化陈述后必须跟具体数字或明确写出\"待测\"。\n```\n\n## 输入 / 输出契约\n\n| 输入 | 类型 | 说明 |\n|------|------|------|\n| `断言` | string | 待检验的断言，例如「加生克约束能提升五行分类质量」 |\n| `现有实现` | string | 可选，当前模型/数据的描述 |\n| `可用指标` | string[] | 可选，你能测的指标 |\n\n| 输出 | 说明 |\n|------|------|\n| `baseline_metric` | 必须先测的那个指标，含口径 |\n| `sweep_design` | 参数扫描设计 |\n| `mechanism` | 机制解释（答不出须写「待查」） |\n| `validity_boundary` | 适用边界 |\n| `verdict` | 二选一 |\n\n## 为什么这个 Prompt 有价值\n\n本课的真实经历：原本预期「纯 softmax 会丢掉五行关系」，实际测出关系差 0.507 已经为正，\n根因是配属表四列共线。**如果先写实现再补基线，这个发现永远不会发生** —— 你会看到加了约束\n之后「关系差也不错」，就以为约束起了作用。\n\n## 校验\n\n- [ ] `baseline_metric.definition` 必须含具体口径与计算方式\n- [ ] `mechanism` 若为「待查」，`verdict` 不得为「直接加约束」\n- [ ] 全文不含「显著」「大幅」等无数字形容词\n- [ ] `validity_boundary` 非空\n"
      },
      {
        "name": "skill-wu-xing-duo-fenlei.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/02-wu-xing-duo-fenlei/outputs/skill-wu-xing-duo-fenlei.md",
        "title": "五行归类的可归因流程",
        "description": "五行归类必须给出所依据的配属维度，并显式标注生克关系一致性；资料不足时标记不确定。",
        "chars": 1612,
        "body": "---\nname: wu-xing-duo-fenlei\ndescription: 五行归类必须给出所依据的配属维度，并显式标注生克关系一致性；资料不足时标记不确定。\nversion: 1.0.0\nsubject: 01-zhongyi-jichu-lilun\nchapter: 02-wu-xing-duo-fenlei\ntags: [五行, 生克, 多分类, 关系约束]\n---\n\n# 五行归类的可归因流程\n\n## 何时使用\n\n当你需要把一个症状、一味药、一个方位或一个季节归入五行之一，并且\n**必须说清是「依据哪个配属维度」归的**时。\n\n不适用：需要给出证型诊断、处方或治则；需要判断生克传变的具体临床走向（那需要完整四诊与病程）。\n\n## 输入契约\n\n| 字段 | 类型 | 必填 | 说明 |\n|------|------|------|------|\n| `对象` | string | 是 | 待归类的对象（症状 / 药物 / 方位 / 季节 / 情志） |\n| `依据维度` | string[] | 否 | 只允许从 `色/味/志/方位/季/脏/腑/官窍/形体` 中选 |\n| `原文` | string | 否 | 原始描述，用于抽取 |\n\n## 步骤\n\n1. **取维度**：确认待归类的对象在哪些维度上有配属依据。**没有任何通行配属依据的对象直接拒答**，不要硬归。\n2. **逐维度归类**：对每个可用维度，写出该维度下的五行为何。引用配属表时要写到具体来源（如《素问·阴阳应象大论》五行配属段）。\n3. **一致性检查**：若不同维度给出**不同的五行**（例：某表现按「色」归木、按「味」归金），必须显式冲突，不得挑一个顺眼的上报。\n4. **关系标注**：给出该五行与其余四行的生克关系。\n   - 相生：木→火→土→金→水→木（外圈）\n   - 相克：木克土、土克水、水克火、火克金、金克木（隔一）\n5. **输出置信度**：可用维度 ≥ 2 且全部一致 → `high`；可用维度 = 1 → `medium`；维度冲突 → `conflict`（不是 low）。\n\n## 输出契约\n\n```json\n{\n  \"object\": \"…\",\n  \"verdict\": \"木 | 火 | 土 | 金 | 水 | 无法归类\",\n  \"by_dimension\": [{ \"dimension\": \"色\", \"element\": \"木\", \"source\": \"《素问·…》\" }],\n  \"consistency\": \"high | medium | conflict\",\n  \"conflicts\": [],\n  \"relations\": { \"sheng_to\": \"火\", \"sheng_from\": \"水\", \"ke_to\": \"土\", \"ke_from\": \"金\" },\n  \"disclaimer\": \"本输出为结构化归类辅助，不构成临床诊疗建议。\"\n}\n```\n\n## 硬约束\n\n- 输出**必须**包含 `by_dimension`，每项都要有 `source`。无来源的归类一律无效。\n- 维度冲突时 `consistency` 必须是 `conflict`，且 `conflicts` 非空。**不得为了让结果\"好看\"而挑选单一维度。**\n- 生克关系**必须**完整给出四条边（生我 / 我生 / 克我 / 我克），缺一条即为无效输出。\n- 不允许输出证型、方剂、剂量、治则。\n- 结尾必须带 `disclaimer`。\n\n## 已知陷阱\n\n| 陷阱 | 表现 | 修正 |\n|------|------|------|\n| 维度混用 | 用「味」的依据得出「木」，再拿「方位西」当理由 | 每个结论必须标注它是哪个维度得出的 |\n| 关系漏边 | 只给「相生」不提「相克」 | 四条边齐全是硬约束 |\n| 无依据归类 | 说「某症状属土」但说不出配属来源 | 直接判 `无法归类` |\n| 把归类当诊断 | 「属木，故肝郁气滞」 | 越界。归类是结构性工作，不是辨证 |\n\n## 验证清单\n\n- [ ] `by_dimension` 每项都有可核查的 `source`\n- [ ] 维度冲突时 `consistency = \"conflict\"` 且 `conflicts` 非空\n- [ ] `relations` 四条边齐全\n- [ ] 无配属依据的对象输出 `无法归类`\n- [ ] 任何输出路径都带 `disclaimer`\n"
      }
    ],
    "video": "platform/courses/01-zhongyi/01-zhongyi-jichu-lilun/02-wu-xing-duo-fenlei/video/lesson.mp4",
    "videoPoster": "platform/courses/01-zhongyi/01-zhongyi-jichu-lilun/02-wu-xing-duo-fenlei/frames/001.png"
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
    "html": "<h1 id=\"第-3-章-藏象学说-知识图谱-脏腑关系的图表示\">第 3 章 · 藏象学说 → 知识图谱：脏腑关系的图表示</h1>\n<blockquote><p><strong>MOTTO:</strong> 「藏象何如？」——《素问·六节藏象论》</p>\n<p><strong>PROBLEM:</strong> 你能背出「肝开窍于目、在志为怒、在体为筋」，但这些知识是散的。当病人说「我最近特别容易发怒，还老是流泪」，你没法系统地回答「这几点在藏象体系里怎么串起来」。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(“写病历只会罗列症状，串不成一个整体判断”) + 知识积累(藏象配属 × 图结构 = 能把「象」变成可遍历、可校验的关系网络)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>中医基础理论</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>03 / 10</td></tr><tr><td>所属阶段</td><td>🌱 生·启蒙</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>4 小时</td></tr></tbody></table></div>\n<h2 id=\"课程结构\">课程结构</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">MOTTO  →  PROBLEM  →  CONCEPT  →  BUILD IT  →  USE IT  →  SHIP IT\n一句话      痛点      原理+图解    从零实现     框架调用    产出工具</code></pre></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>说清「藏」与「象」的区别，以及为什么「象」本质上是关系而不是属性</li><li>先定义本体（实体类型 + 关系类型），再灌数据；说清反过来做会付出什么代价</li><li>从零实现邻接表、k 跳邻域、最短路径，并处理<strong>边方向</strong></li><li>写出三项本体完整性校验，并把「哪些关系还没建」变成可枚举清单</li><li>解释为什么藏象与五行必须放在同一张图里 —— 拆成两张表会丢掉哪条路径</li></ul>\n<div class=\"figure-host\" data-figure=\"zangxiang-graph\"></div>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"中医-藏与象\">中医：藏与象</h3>\n<p>《素问·五藏别论》：「所谓五藏者，藏精气而不泻也。」——「藏」指藏于内的脏腑功能。\n「象」指这些功能表现于外的征象。</p>\n<p>关键在于<strong>藏象的核心是「联系」，不是「属性清单」</strong>：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">肝：合胆 · 开窍于目 · 在志为怒 · 在体为筋 · 其华在爪 · 在液为泪 · 属木</code></pre></div>\n<p>每一条都是<strong>一条边</strong>，不是一个字段。肝之所以是「肝」，一半由它连着什么决定。\n用表格存这些关系，你只能逐行查；用图存，你可以问「从『目』走两步能到哪」。</p>\n<h3 id=\"ai-工程-知识图谱\">AI / 工程：知识图谱</h3>\n<p>知识图谱的最小单元是三元组 <code>(头实体, 关系, 尾实体)</code>。落到实现上就是<strong>邻接表</strong>：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">javascript</div><pre><code class=\"lang-javascript\">g.out.get('肝')  // → [{ type:'开窍于', to:'目' }, { type:'在志为', to:'怒' }, ...]\ng.in.get('目')   // → [{ type:'开窍于', from:'肝' }]</code></pre></div>\n<p>图上的三件事必须自己写一遍：</p>\n<div class=\"table-wrap\"><table><thead><tr><th>操作</th><th>用途</th><th>复杂度</th></tr></thead><tbody><tr><td>k 跳邻域</td><td>「这个症状还能牵出什么」</td><td>O(V+E)</td></tr><tr><td>最短路径</td><td>「这两者怎么关联上的」</td><td>O(V+E)</td></tr><tr><td>本体校验</td><td>「哪些关系还没建」</td><td>O(V+E)</td></tr></tbody></table></div>\n<p><strong>方向性是要处理的真实问题。</strong> 相克边只建「克」的方向（金克木）。当你反向查询\n金与木的关系时，渲染时必须标注「逆向遍历」，否则会把「金克木」讲成「木克金」——\n中医的方向讲反了，不是排版问题，是学术错误。</p>\n<h3 id=\"对应关系\">对应关系</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>中医概念</th><th>AI / 工程概念</th><th>桥梁（为什么可以这样翻译）</th><th>级别</th></tr></thead><tbody><tr><td>藏象配属（开窍于/在志为/在体为）</td><td>三元组 / 有向边</td><td>每条配属天然是一个 <code>(脏, 关系, 象)</code> 三元组</td><td><strong>A</strong></td></tr><tr><td>相表里</td><td><strong>对称</strong>关系</td><td>脏与腑互为表里，两侧都要有边；只写一侧会让「从腑查脏」静默失败</td><td><strong>A</strong></td></tr><tr><td>五行生克</td><td>五行节点之间的有向边</td><td>相生/相克是五行节点上的边，而不是脏的属性</td><td><strong>A</strong></td></tr><tr><td>藏象 + 五行同图</td><td>本体整合</td><td>不整合就查不出「肝 → 悲」这条路；见下文实测</td><td><strong>B</strong></td></tr><tr><td>「象」</td><td>节点出边的集合</td><td>「象」就是「这个脏连出去的所有边」</td><td><strong>B</strong></td></tr><tr><td>藏象 = 器官图谱</td><td>——</td><td>❌ <strong>D 级误用</strong>。藏象之「肝」是功能系统，与解剖肝脏非一对一，直接映射会造成系统性错误</td><td><strong>D</strong></td></tr></tbody></table></div>\n<pre class=\"mermaid\">graph LR\n  A[&quot;藏象配属表&quot;] --&gt; B[&quot;本体定义&lt;br/&gt;实体类型 + 关系类型&quot;]\n  B --&gt; C[&quot;邻接表建图&quot;]\n  C --&gt; D[&quot;k 跳邻域&quot;]\n  C --&gt; E[&quot;最短路径&quot;]\n  C --&gt; F[&quot;本体完整性校验&quot;]\n  F --&gt; G[&quot;未建关系清单&quot;]\n  G -.-&gt;|回指校验| H[&quot;清单里的每条关系，中医上真的存在吗？&quot;]</pre>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<p>先定本体，再灌数据：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">javascript</div><pre><code class=\"lang-javascript\">const NODE_TYPES = ['脏', '腑', '官窍', '情志', '形体', '华', '液', '五行'];\nconst EDGE_TYPES = ['相表里', '开窍于', '在志为', '在体为', '其华在', '化为', '属五行', '相生', '相克'];</code></pre></div>\n<p>相表里是对称关系，两侧都要建边：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">javascript</div><pre><code class=\"lang-javascript\">addEdge(g, z.name, '相表里', z.fu);\naddEdge(g, z.fu,   '相表里', z.name);   // ← 少这一行，从腑查脏会静默失败</code></pre></div>\n<p>最短路径要携带<strong>真实边方向</strong>：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">javascript</div><pre><code class=\"lang-javascript\">// 沿出边走：真实方向 n → e.to\n{ next: e.to,   src: n,      dst: e.to, forward: true  }\n// 沿入边走（逆向）：真实方向 e.from → n\n{ next: e.from, src: e.from, dst: n,    forward: false }</code></pre></div>\n<p>跑起来：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js</code></pre></div>\n<h2 id=\"实测结果\">实测结果</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">节点 40 个 | 边 50 条\n实体类型: 脏 / 腑 / 官窍 / 情志 / 形体 / 华 / 液 / 五行\n关系类型: 相表里 / 开窍于 / 在志为 / 在体为 / 其华在 / 化为 / 属五行 / 相生 / 相克\n\n【一】五藏的配属（one-hop 出边）\n  肝(木) 合胆 · 开窍于目 · 在志为怒 · 在体为筋 · 其华在爪\n  心(火) 合小肠 · 开窍于舌 · 在志为喜 · 在体为脉 · 其华在面\n  脾(土) 合胃 · 开窍于口 · 在志为思 · 在体为肉 · 其华在唇\n  肺(金) 合大肠 · 开窍于鼻 · 在志为悲 · 在体为皮毛 · 其华在毛\n  肾(水) 合膀胱 · 开窍于耳 · 在志为恐 · 在体为骨 · 其华在发\n\n【二】k 跳邻域：从「目」出发\n  1 跳 (1 个节点):\n    距离 1: 肝\n  2 跳 (7 个节点):\n    距离 1: 肝\n    距离 2: 胆 怒 筋 爪 泪 木\n\n【三】最短路径查询（←type- 表示该边是逆向遍历，真实方向相反）\n  目 → 泪 (2 跳, 含 1 条逆向): 目 ←开窍于- 肝 -化为→ 泪\n  肝 → 悲 (4 跳, 含 2 条逆向): 肝 -属五行→ 木 ←相克- 金 ←属五行- 肺 -在志为→ 悲\n  耳 → 小肠 (5 跳, 含 2 条逆向): 耳 ←开窍于- 肾 -属五行→ 水 -相克→ 火 ←属五行- 心 -相表里→ 小肠\n  怒 → 骨 (5 跳, 含 3 条逆向): 怒 ←在志为- 肝 -属五行→ 木 ←相生- 水 ←属五行- 肾 -在体为→ 骨\n\n【四】本体完整性校验\n  六类配属齐备: 通过 ✅\n  相表里对称: 通过 ✅\n  五行分配唯一且覆盖: 通过 ✅</code></pre></div>\n<h3 id=\"三个被实测暴露出来的问题\">三个被实测暴露出来的问题</h3>\n<p><strong>问题一：相表里只写了一侧。</strong>\n第一版只建了 <code>脏 → 腑</code>，校验器立刻报出 5 项错误：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">胆 未回连 肝（相表里必须对称）\n小肠 未回连 心（相表里必须对称）\n...</code></pre></div>\n<p>这不是实现 bug，是<strong>本体设计 bug</strong> —— 在关系定义阶段就没说清「相表里是对称的」。\n校验器的价值就在这里：它把本体设计的疏漏变成可枚举的清单。</p>\n<p><strong>问题二：五行没进图，<code>肝 → 悲</code> 查不通。</strong>\n第一版只把五行当成脏的一个属性字段（<code>wuxing: '木'</code>），没有把五行建成节点。结果\n<code>肝 → 悲</code> 报「不可达」。补上五行节点与相生/相克边之后，路径通了：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">肝 → 悲 (4 跳): 肝 -属五行→ 木 ←相克- 金 ←属五行- 肺 -在志为→ 悲</code></pre></div>\n<p><strong>这就是「藏象与五行必须放在同一张图里」的具体含义。</strong> 拆成两张表，这条路就不存在了。\n顺带说明：这条路靠的是<strong>金克木</strong>，遍历时是逆向走的，所以标记为 <code>←相克-</code>。</p>\n<p><strong>问题三：边方向会被渲染反。</strong>\n第一版的输出是「木 → 金（相克）」，把「金克木」讲成了「木克金」。原因是路径渲染没有\n区分真实方向与遍历方向。修正后输出 <code>木 ←相克- 金</code>。\n中医里方向讲反不是排版问题 —— 相生方向反了，整个传变推演就错了。</p>\n<h3 id=\"观察-藏象配属的图直径很小\">观察：藏象配属的图直径很小</h3>\n<p>从「目」出发，2 跳就能覆盖 7 个节点（肝、胆、怒、筋、爪、泪、木）。这不是偶然 ——\n藏象体系是一个<strong>高度联通的小世界</strong>。「怒」到「骨」只要 5 跳。这解释了为什么中医的\n整体观不是修辞：在这张图上，任意两个节点之间确实只需要很少几步。</p>\n<p>（注意：这是<strong>拓扑距离</strong>，不是因果距离。图上 5 跳不代表临床上「发怒会导致骨病」——\n把拓扑距离误读为因果距离，是知识图谱最常见的滥用。）</p>\n<h3 id=\"本节翻译的代价与边界\">本节翻译的代价与边界</h3>\n<p><strong>丢掉了什么</strong></p>\n<div class=\"table-wrap\"><table><thead><tr><th>丢失项</th><th>为什么是结构性的</th></tr></thead><tbody><tr><td>关系的<strong>强度</strong></td><td>图上只有「有边 / 无边」两种状态。而藏象配属的实际关联程度差异很大（「开窍于目」与「其华在爪」显然不同），图模型默认它们等权</td></tr><tr><td>关系的<strong>条件性</strong></td><td>「肝开窍于目」在正常生理下成立；病理状态下可能出现「肝火上炎见目赤」这类方向性更强的表现。基础图不区分生理与病理边</td></tr><tr><td><strong>时间</strong></td><td>藏象是一个功能系统，功能是有时序的（如「女子以肝为先天」随生命周期变化）。静态图没有时间轴</td></tr><tr><td>「藏」与「象」的<strong>层次</strong></td><td>本图把所有节点平铺。而「藏」是内藏的脏腑功能，「象」是外显的征象，两者在证据强度上并不对等 —— 图模型没有表达这一层</td></tr></tbody></table></div>\n<p><strong>不适用范围</strong></p>\n<ul><li>本图是<strong>教学图谱</strong>，只覆盖五藏的基础配属关系，不是完整的藏象本体。</li><li>图上的路径是<strong>拓扑关联</strong>，<strong>不构成因果结论</strong>，也<strong>不构成任何诊疗建议</strong>。</li><li>本课未收录六腑自身的功能关系（如「传化物」次序），因此涉及六腑的路径查询结果不完整。</li></ul>\n<p><strong>一处必须排除的误用（D 级）</strong></p>\n<blockquote><p>「藏象 = 器官知识图谱」—— 藏象之「肝」是功能系统，与解剖肝脏<strong>不是一对一</strong>关系。\n直接按解剖器官建模会造成系统性错误：例如把「肝郁」理解为肝脏的病理改变。\n这是本项目在 <a href=\"../../../../../../glossary/bridge-map.html\">bridge-map.md</a> 中列为 D 级的典型误用。</p></blockquote>\n<h2 id=\"use-it-框架调用\">USE IT：框架调用</h2>\n<p>用成熟图库（NetworkX / Neo4j / RDF 三元组库）做同样的事，接口不同但三件事不变：\n邻域、路径、校验。真正的差别在<strong>规模</strong>：本课 40 节点 50 条边，手写足够；\n真实的医案知识图谱是十万节点量级，那时才需要图数据库。</p>\n<p><strong>不要在 40 个节点上引入 Neo4j。</strong> 这是本章最实用的工程建议。</p>\n<h2 id=\"ship-it-产出物\">SHIP IT：产出物</h2>\n<ul><li><a href=\"../outputs/prompt-zang-xiang-tupu.html\">📋 Prompt 模板</a> —— 让大模型把症状串成藏象关系链，<strong>每一步都必须标出关系类型</strong>，并在跨五行时显式标注方向</li><li><a href=\"../outputs/skill-zang-xiang-tupu.html\">🛠️ Skill 文件</a> —— 藏象关系抽取与本体校验的固定流程</li></ul>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\n# Expected: 见上方「实测结果」代码块，退出码 0</code></pre></div>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node --test code/main.test.js\n# Expected: 全部通过</code></pre></div>\n<blockquote><p><strong>边界声明</strong>：本章示例数据为教学样例，<strong>非临床数据集</strong>；本章给出的任何模型输出均不构成诊疗建议，也不能替代执业医师的判断。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<p>见 <a href=\"../exercises.html\">exercises.md</a>。</p>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<ol><li>六腑除了相表里，还有「传化物」的次序（胃→小肠→大肠→膀胱）。加进图后，从「胃」到「膀胱」的路径会变短多少？</li><li>如果要表达「肝气犯脾」（木克土），需要在图上加什么类型的边？它与已有的 <code>相克</code> 边是什么关系？</li><li>藏象图的拓扑直径很小。这对「症状 → 证候」的自动推理是好事还是坏事？为什么？</li></ol>",
    "markdown": "# 第 3 章 · 藏象学说 → 知识图谱：脏腑关系的图表示\n\n> **MOTTO:** 「藏象何如？」——《素问·六节藏象论》\n>\n> **PROBLEM:** 你能背出「肝开窍于目、在志为怒、在体为筋」，但这些知识是散的。当病人说「我最近特别容易发怒，还老是流泪」，你没法系统地回答「这几点在藏象体系里怎么串起来」。\n>\n> **双根因定位:** 环境逼迫(“写病历只会罗列症状，串不成一个整体判断”) + 知识积累(藏象配属 × 图结构 = 能把「象」变成可遍历、可校验的关系网络)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 中医基础理论 |\n| 院系 | 中医系 |\n| 章序号 | 03 / 10 |\n| 所属阶段 | 🌱 生·启蒙 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 4 小时 |\n\n## 课程结构\n\n```text\nMOTTO  →  PROBLEM  →  CONCEPT  →  BUILD IT  →  USE IT  →  SHIP IT\n一句话      痛点      原理+图解    从零实现     框架调用    产出工具\n```\n\n## 学习目标\n\n- 说清「藏」与「象」的区别，以及为什么「象」本质上是关系而不是属性\n- 先定义本体（实体类型 + 关系类型），再灌数据；说清反过来做会付出什么代价\n- 从零实现邻接表、k 跳邻域、最短路径，并处理**边方向**\n- 写出三项本体完整性校验，并把「哪些关系还没建」变成可枚举清单\n- 解释为什么藏象与五行必须放在同一张图里 —— 拆成两张表会丢掉哪条路径\n\n<div data-figure=\"zangxiang-graph\"></div>\n\n## 核心概念\n\n### 中医：藏与象\n\n《素问·五藏别论》：「所谓五藏者，藏精气而不泻也。」——「藏」指藏于内的脏腑功能。\n「象」指这些功能表现于外的征象。\n\n关键在于**藏象的核心是「联系」，不是「属性清单」**：\n\n```text\n肝：合胆 · 开窍于目 · 在志为怒 · 在体为筋 · 其华在爪 · 在液为泪 · 属木\n```\n\n每一条都是**一条边**，不是一个字段。肝之所以是「肝」，一半由它连着什么决定。\n用表格存这些关系，你只能逐行查；用图存，你可以问「从『目』走两步能到哪」。\n\n### AI / 工程：知识图谱\n\n知识图谱的最小单元是三元组 `(头实体, 关系, 尾实体)`。落到实现上就是**邻接表**：\n\n```javascript\ng.out.get('肝')  // → [{ type:'开窍于', to:'目' }, { type:'在志为', to:'怒' }, ...]\ng.in.get('目')   // → [{ type:'开窍于', from:'肝' }]\n```\n\n图上的三件事必须自己写一遍：\n\n| 操作 | 用途 | 复杂度 |\n|------|------|-------|\n| k 跳邻域 | 「这个症状还能牵出什么」 | O(V+E) |\n| 最短路径 | 「这两者怎么关联上的」 | O(V+E) |\n| 本体校验 | 「哪些关系还没建」 | O(V+E) |\n\n**方向性是要处理的真实问题。** 相克边只建「克」的方向（金克木）。当你反向查询\n金与木的关系时，渲染时必须标注「逆向遍历」，否则会把「金克木」讲成「木克金」——\n中医的方向讲反了，不是排版问题，是学术错误。\n\n### 对应关系\n\n| 中医概念 | AI / 工程概念 | 桥梁（为什么可以这样翻译） | 级别 |\n|---------|--------------|--------------------------|------|\n| 藏象配属（开窍于/在志为/在体为） | 三元组 / 有向边 | 每条配属天然是一个 `(脏, 关系, 象)` 三元组 | **A** |\n| 相表里 | **对称**关系 | 脏与腑互为表里，两侧都要有边；只写一侧会让「从腑查脏」静默失败 | **A** |\n| 五行生克 | 五行节点之间的有向边 | 相生/相克是五行节点上的边，而不是脏的属性 | **A** |\n| 藏象 + 五行同图 | 本体整合 | 不整合就查不出「肝 → 悲」这条路；见下文实测 | **B** |\n| 「象」 | 节点出边的集合 | 「象」就是「这个脏连出去的所有边」 | **B** |\n| 藏象 = 器官图谱 | —— | ❌ **D 级误用**。藏象之「肝」是功能系统，与解剖肝脏非一对一，直接映射会造成系统性错误 | **D** |\n\n```mermaid\ngraph LR\n  A[\"藏象配属表\"] --> B[\"本体定义<br/>实体类型 + 关系类型\"]\n  B --> C[\"邻接表建图\"]\n  C --> D[\"k 跳邻域\"]\n  C --> E[\"最短路径\"]\n  C --> F[\"本体完整性校验\"]\n  F --> G[\"未建关系清单\"]\n  G -.->|回指校验| H[\"清单里的每条关系，中医上真的存在吗？\"]\n```\n\n## BUILD IT：从零实现\n\n先定本体，再灌数据：\n\n```javascript\nconst NODE_TYPES = ['脏', '腑', '官窍', '情志', '形体', '华', '液', '五行'];\nconst EDGE_TYPES = ['相表里', '开窍于', '在志为', '在体为', '其华在', '化为', '属五行', '相生', '相克'];\n```\n\n相表里是对称关系，两侧都要建边：\n\n```javascript\naddEdge(g, z.name, '相表里', z.fu);\naddEdge(g, z.fu,   '相表里', z.name);   // ← 少这一行，从腑查脏会静默失败\n```\n\n最短路径要携带**真实边方向**：\n\n```javascript\n// 沿出边走：真实方向 n → e.to\n{ next: e.to,   src: n,      dst: e.to, forward: true  }\n// 沿入边走（逆向）：真实方向 e.from → n\n{ next: e.from, src: e.from, dst: n,    forward: false }\n```\n\n跑起来：\n\n```bash\nnode code/main.js\n```\n\n## 实测结果\n\n```text\n节点 40 个 | 边 50 条\n实体类型: 脏 / 腑 / 官窍 / 情志 / 形体 / 华 / 液 / 五行\n关系类型: 相表里 / 开窍于 / 在志为 / 在体为 / 其华在 / 化为 / 属五行 / 相生 / 相克\n\n【一】五藏的配属（one-hop 出边）\n  肝(木) 合胆 · 开窍于目 · 在志为怒 · 在体为筋 · 其华在爪\n  心(火) 合小肠 · 开窍于舌 · 在志为喜 · 在体为脉 · 其华在面\n  脾(土) 合胃 · 开窍于口 · 在志为思 · 在体为肉 · 其华在唇\n  肺(金) 合大肠 · 开窍于鼻 · 在志为悲 · 在体为皮毛 · 其华在毛\n  肾(水) 合膀胱 · 开窍于耳 · 在志为恐 · 在体为骨 · 其华在发\n\n【二】k 跳邻域：从「目」出发\n  1 跳 (1 个节点):\n    距离 1: 肝\n  2 跳 (7 个节点):\n    距离 1: 肝\n    距离 2: 胆 怒 筋 爪 泪 木\n\n【三】最短路径查询（←type- 表示该边是逆向遍历，真实方向相反）\n  目 → 泪 (2 跳, 含 1 条逆向): 目 ←开窍于- 肝 -化为→ 泪\n  肝 → 悲 (4 跳, 含 2 条逆向): 肝 -属五行→ 木 ←相克- 金 ←属五行- 肺 -在志为→ 悲\n  耳 → 小肠 (5 跳, 含 2 条逆向): 耳 ←开窍于- 肾 -属五行→ 水 -相克→ 火 ←属五行- 心 -相表里→ 小肠\n  怒 → 骨 (5 跳, 含 3 条逆向): 怒 ←在志为- 肝 -属五行→ 木 ←相生- 水 ←属五行- 肾 -在体为→ 骨\n\n【四】本体完整性校验\n  六类配属齐备: 通过 ✅\n  相表里对称: 通过 ✅\n  五行分配唯一且覆盖: 通过 ✅\n```\n\n### 三个被实测暴露出来的问题\n\n**问题一：相表里只写了一侧。**\n第一版只建了 `脏 → 腑`，校验器立刻报出 5 项错误：\n\n```text\n胆 未回连 肝（相表里必须对称）\n小肠 未回连 心（相表里必须对称）\n...\n```\n\n这不是实现 bug，是**本体设计 bug** —— 在关系定义阶段就没说清「相表里是对称的」。\n校验器的价值就在这里：它把本体设计的疏漏变成可枚举的清单。\n\n**问题二：五行没进图，`肝 → 悲` 查不通。**\n第一版只把五行当成脏的一个属性字段（`wuxing: '木'`），没有把五行建成节点。结果\n`肝 → 悲` 报「不可达」。补上五行节点与相生/相克边之后，路径通了：\n\n```text\n肝 → 悲 (4 跳): 肝 -属五行→ 木 ←相克- 金 ←属五行- 肺 -在志为→ 悲\n```\n\n**这就是「藏象与五行必须放在同一张图里」的具体含义。** 拆成两张表，这条路就不存在了。\n顺带说明：这条路靠的是**金克木**，遍历时是逆向走的，所以标记为 `←相克-`。\n\n**问题三：边方向会被渲染反。**\n第一版的输出是「木 → 金（相克）」，把「金克木」讲成了「木克金」。原因是路径渲染没有\n区分真实方向与遍历方向。修正后输出 `木 ←相克- 金`。\n中医里方向讲反不是排版问题 —— 相生方向反了，整个传变推演就错了。\n\n### 观察：藏象配属的图直径很小\n\n从「目」出发，2 跳就能覆盖 7 个节点（肝、胆、怒、筋、爪、泪、木）。这不是偶然 ——\n藏象体系是一个**高度联通的小世界**。「怒」到「骨」只要 5 跳。这解释了为什么中医的\n整体观不是修辞：在这张图上，任意两个节点之间确实只需要很少几步。\n\n（注意：这是**拓扑距离**，不是因果距离。图上 5 跳不代表临床上「发怒会导致骨病」——\n把拓扑距离误读为因果距离，是知识图谱最常见的滥用。）\n\n### 本节翻译的代价与边界\n\n**丢掉了什么**\n\n| 丢失项 | 为什么是结构性的 |\n|--------|----------------|\n| 关系的**强度** | 图上只有「有边 / 无边」两种状态。而藏象配属的实际关联程度差异很大（「开窍于目」与「其华在爪」显然不同），图模型默认它们等权 |\n| 关系的**条件性** | 「肝开窍于目」在正常生理下成立；病理状态下可能出现「肝火上炎见目赤」这类方向性更强的表现。基础图不区分生理与病理边 |\n| **时间** | 藏象是一个功能系统，功能是有时序的（如「女子以肝为先天」随生命周期变化）。静态图没有时间轴 |\n| 「藏」与「象」的**层次** | 本图把所有节点平铺。而「藏」是内藏的脏腑功能，「象」是外显的征象，两者在证据强度上并不对等 —— 图模型没有表达这一层 |\n\n**不适用范围**\n\n- 本图是**教学图谱**，只覆盖五藏的基础配属关系，不是完整的藏象本体。\n- 图上的路径是**拓扑关联**，**不构成因果结论**，也**不构成任何诊疗建议**。\n- 本课未收录六腑自身的功能关系（如「传化物」次序），因此涉及六腑的路径查询结果不完整。\n\n**一处必须排除的误用（D 级）**\n\n> 「藏象 = 器官知识图谱」—— 藏象之「肝」是功能系统，与解剖肝脏**不是一对一**关系。\n> 直接按解剖器官建模会造成系统性错误：例如把「肝郁」理解为肝脏的病理改变。\n> 这是本项目在 [bridge-map.md](../../../../../../glossary/bridge-map.md) 中列为 D 级的典型误用。\n\n## USE IT：框架调用\n\n用成熟图库（NetworkX / Neo4j / RDF 三元组库）做同样的事，接口不同但三件事不变：\n邻域、路径、校验。真正的差别在**规模**：本课 40 节点 50 条边，手写足够；\n真实的医案知识图谱是十万节点量级，那时才需要图数据库。\n\n**不要在 40 个节点上引入 Neo4j。** 这是本章最实用的工程建议。\n\n## SHIP IT：产出物\n\n- [📋 Prompt 模板](../outputs/prompt-zang-xiang-tupu.md) —— 让大模型把症状串成藏象关系链，**每一步都必须标出关系类型**，并在跨五行时显式标注方向\n- [🛠️ Skill 文件](../outputs/skill-zang-xiang-tupu.md) —— 藏象关系抽取与本体校验的固定流程\n\n## 验证\n\n```bash\nnode code/main.js\n# Expected: 见上方「实测结果」代码块，退出码 0\n```\n\n```bash\nnode --test code/main.test.js\n# Expected: 全部通过\n```\n\n> **边界声明**：本章示例数据为教学样例，**非临床数据集**；本章给出的任何模型输出均不构成诊疗建议，也不能替代执业医师的判断。\n\n## 练习\n\n见 [exercises.md](../exercises.md)。\n\n## 进阶思考\n\n1. 六腑除了相表里，还有「传化物」的次序（胃→小肠→大肠→膀胱）。加进图后，从「胃」到「膀胱」的路径会变短多少？\n2. 如果要表达「肝气犯脾」（木克土），需要在图上加什么类型的边？它与已有的 `相克` 边是什么关系？\n3. 藏象图的拓扑直径很小。这对「症状 → 证候」的自动推理是好事还是坏事？为什么？\n",
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
        "kind": "prompt",
        "file": "departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/03-zang-xiang-tupu/outputs/prompt-zang-xiang-tupu.md",
        "title": "Prompt · 藏象关系链整理（带方向校验）",
        "description": null,
        "chars": 1943,
        "body": "# Prompt · 藏象关系链整理（带方向校验）\n\n> 学科: 中医基础理论 · 章节: 03-zang-xiang-tupu\n\n## 用途\n\n把一组散在症状整理成藏象关系链，供教学讲解与病历机理部分使用。\n核心要求不是「串起来」，而是**串得可核查**：每步有依据、跨五行有方向。\n\n## 系统提示\n\n```text\n你是中医基础理论的助教，任务是把一组症状整理成藏象关系链。\n\n铁律：\n1. 每一步必须是三元组 (头, 关系, 尾)，关系类型只能取：\n   相表里 / 开窍于 / 在志为 / 在体为 / 其华在 / 化为 / 属五行 / 相生 / 相克\n2. 每一步都要给 source，写到「书名·篇名」级别。给不出就放进 unsupported，不要编。\n3. 跨五行的边必须标明方向：\n   相生只有 木→火→土→金→水→木\n   相克只有 木克土、土克水、水克火、火克金、金克木\n   如果查询方向与真实边方向相反，direction 写 \"reverse\"，并附说明。\n4. 图上连通不等于因果。禁止使用「导致」「引起」「因此会」「说明……必然」等措辞。\n5. 不许新建本体外节点。映射不上就标 unknown。\n6. 不输出证型、方剂、剂量、治则。\n7. 结尾原样输出：本输出为关系链整理，不构成临床诊疗建议。\n\n先给 chain，再给 wuxing_hops，最后给 unsupported。\n```\n\n## 输入 / 输出契约\n\n| 输入 | 类型 | 说明 |\n|------|------|------|\n| `症状列表` | string[] | 例如 `[\"易怒\",\"流泪\"]` |\n| `允许关系类型` | string[] | 可选，默认取上表九种 |\n\n```json\n{\n  \"chain\": [{ \"from\": \"…\", \"type\": \"…\", \"to\": \"…\", \"direction\": \"forward|reverse\", \"source\": \"…\" }],\n  \"wuxing_hops\": [{ \"from\": \"…\", \"type\": \"相生|相克\", \"to\": \"…\", \"direction\": \"…\", \"note\": \"…\" }],\n  \"unsupported\": [{ \"step\": \"…\", \"reason\": \"无合适关系类型 / 无依据来源\" }],\n  \"disclaimer\": \"本输出为关系链整理，不构成临床诊疗建议。\"\n}\n```\n\n## 标准示例：易怒 + 流泪\n\n```json\n{\n  \"chain\": [\n    { \"from\": \"怒\", \"type\": \"在志为\", \"to\": \"肝\", \"direction\": \"reverse\",\n      \"source\": \"《素问·阴阳应象大论》五行配属段\" },\n    { \"from\": \"肝\", \"type\": \"化为\", \"to\": \"泪\", \"direction\": \"forward\",\n      \"source\": \"《素问·宣明五气》五液配属\" }\n  ],\n  \"wuxing_hops\": [],\n  \"unsupported\": [],\n  \"disclaimer\": \"本输出为关系链整理，不构成临床诊疗建议。\"\n}\n```\n\n## 标准示例：肝与悲（必须绕道五行的典型例子）\n\n```json\n{\n  \"chain\": [\n    { \"from\": \"肝\", \"type\": \"属五行\", \"to\": \"木\", \"direction\": \"forward\", \"source\": \"藏象配属表\" },\n    { \"from\": \"木\", \"type\": \"相克\", \"to\": \"金\", \"direction\": \"reverse\",\n      \"note\": \"真实边是 金克木；此处逆向遍历，方向必须标 reverse\", \"source\": \"《素问·五运行大论》\" },\n    { \"from\": \"金\", \"type\": \"属五行\", \"to\": \"肺\", \"direction\": \"reverse\", \"source\": \"藏象配属表\" },\n    { \"from\": \"肺\", \"type\": \"在志为\", \"to\": \"悲\", \"direction\": \"forward\",\n      \"source\": \"《素问·阴阳应象大论》\" }\n  ],\n  \"disclaimer\": \"本输出为关系链整理，不构成临床诊疗建议。\"\n}\n```\n\n> 注意第三条：`金 -属五行→ 肺` 是正向边，但路径是从肺走到金，所以 direction 是 `reverse`。\n> 这条链上出现**两条**逆向边。如果你写出来的方向标记少于两条，说明方向模型建错了。\n\n## 反例\n\n| 错误输出 | 为什么错 |\n|---------|---------|\n| 「木克金」 | 相克里没有这一条。只有金克木 |\n| 「易怒导致流泪」 | 因果措辞；只有关系链，没有因果结论 |\n| 「流泪 → 肝血虚」 | 跳步，且越界给出证型 |\n| 「因为中医理论如此」 | 无 `source` 的无效步骤 |\n| 「目干」当作独立节点 | 自造本体外节点 |\n\n## 校验\n\n- [ ] 每步都有 `type` 与 `source`\n- [ ] 跨五行必有 `direction`\n- [ ] 输出不含因果措辞\n- [ ] `unsupported` 被显式列出\n- [ ] 无本体外节点\n- [ ] `disclaimer` 逐字存在\n"
      },
      {
        "name": "skill-zang-xiang-tupu.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/03-zang-xiang-tupu/outputs/skill-zang-xiang-tupu.md",
        "title": "藏象关系链抽取与校验",
        "description": "把症状串成藏象关系链，每一步标注关系类型与方向，跨五行时显式标出相生相克。",
        "chars": 1670,
        "body": "---\nname: zang-xiang-tupu\ndescription: 把症状串成藏象关系链，每一步标注关系类型与方向，跨五行时显式标出相生相克。\nversion: 1.0.0\nsubject: 01-zhongyi-jichu-lilun\nchapter: 03-zang-xiang-tupu\ntags: [藏象, 知识图谱, 关系抽取, 方向性]\n---\n\n# 藏象关系链抽取与校验\n\n## 何时使用\n\n当你需要把一组散在的症状，串成一条**可核查的藏象关系链**（而不是给一个证型名称）时。\n典型场景：整理医案、写病历的机理部分、检查一份辨证依据里有没有跳步。\n\n不适用：给出证型诊断、处方、治则；判定预后。\n\n## 输入契约\n\n| 字段 | 类型 | 必填 | 说明 |\n|------|------|------|------|\n| `症状列表` | string[] | 是 | 例如 `[\"易怒\", \"流泪\", \"目干\"]` |\n| `已知体征` | object | 否 | 望闻问切的其他结果 |\n| `允许的关系类型` | string[] | 否 | 默认：`相表里/开窍于/在志为/在体为/其华在/化为/属五行/相生/相克` |\n\n## 步骤\n\n1. **实体识别**：把每个症状映射到本体中的节点。映射不上就标 `unknown`，**不要新建节点**（新节点必须先进本体）。\n2. **连边**：对每一对可连的节点，给出一条边，并标注：\n   - `type`：关系类型，必须来自允许列表\n   - `direction`：`forward` 或 `reverse`（真实边方向）\n   - `source`：依据出处\n3. **跨五行检查**：如果链路上经过五行节点，**必须**显式写出用的是相生还是相克，并给出正确方向。\n   - 例：肝→悲 走的是**金克木**，遍历方向是逆向，必须标 `reverse`。\n4. **跳步检查**：每一步都必须有依据。任何一步\"因为中医认为……\"而说不出关系类型的，标为 `unsupported`。\n5. **输出关系链**，并单独列出 `unsupported` 的步骤。\n\n## 输出契约\n\n```json\n{\n  \"chain\": [\n    {\n      \"from\": \"怒\",\n      \"type\": \"在志为\",\n      \"to\": \"肝\",\n      \"direction\": \"reverse\",\n      \"source\": \"《素问·阴阳应象大论》五行配属段\"\n    }\n  ],\n  \"wuxing_hops\": [\n    { \"from\": \"木\", \"type\": \"相克\", \"to\": \"金\", \"direction\": \"reverse\", \"note\": \"金克木，逆向遍历\" }\n  ],\n  \"unsupported\": [],\n  \"disclaimer\": \"本输出为关系链整理，不构成临床诊疗建议。\"\n}\n```\n\n## 硬约束\n\n- **每一步都必须有 `type` 与 `source`。** 无类型的一步视为无效输出。\n- 跨五行的边**必须**标 `direction`。把「金克木」写成「木克金」是学术错误，不是排版问题。\n- **不得新建本体外节点**。要加节点，先在章节的本体定义里加。\n- 关系链是**拓扑关联**，不等于因果。输出里**不得**出现「导致」「引起」「因此会」这类因果措辞。\n- 不允许输出证型、方剂、剂量、治则。\n- 结尾必须带 `disclaimer`。\n\n## 已知陷阱\n\n| 陷阱 | 表现 | 修正 |\n|------|------|------|\n| 方向讲反 | 「木克金」 | 相克只有五个方向：木克土、土克水、水克火、火克金、金克木 |\n| 拓扑当因果 | 「怒 5 跳连到 骨，故易怒伤骨」 | 图上连通 ≠ 因果机制 |\n| 跳步 | 直接从「流泪」跳到「肝血虚」 | 中间每一步都要有边 |\n| 自造节点 | 把「目干」当成一个新实体 | 先映射到本体节点（目 / 液），映射不上就标 unknown |\n| 只写相生 | 一条链上只提相生不提相克 | 跨五行的每一跳都要标明是生还是克 |\n\n## 验证清单\n\n- [ ] `chain` 每一项都有 `type` 与 `source`\n- [ ] 每个 `wuxing_hops` 项都有 `direction`\n- [ ] 输出中不含因果措辞（导致/引起/因此会）\n- [ ] `unsupported` 里的步骤被显式列出，而不是被静默省略\n- [ ] 没有新建本体外节点\n- [ ] 任何输出路径都带 `disclaimer`\n"
      }
    ],
    "video": "platform/courses/01-zhongyi/01-zhongyi-jichu-lilun/03-zang-xiang-tupu/video/lesson.mp4",
    "videoPoster": "platform/courses/01-zhongyi/01-zhongyi-jichu-lilun/03-zang-xiang-tupu/frames/001.png"
  },
  "01-zhongyi/05-zhongyi-zhen-duan-xue/08-zangfu-bianzheng": {
    "key": "01-zhongyi/05-zhongyi-zhen-duan-xue/08-zangfu-bianzheng",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "05-zhongyi-zhen-duan-xue",
    "subjectTitle": "中医诊断学",
    "chapterSlug": "08-zangfu-bianzheng",
    "n": 8,
    "title": "第 8 章 · 脏腑辨证 → 规则表与权重：把「肝气郁结」写成可复核的打分",
    "motto": "「见肝之病，则知肝当传之于脾，故先实其脾气。」——《难经·七十七难》",
    "problem": "病人说「胸闷、叹气、胁胀、心情不好」，你能脱口而出「肝气郁结」，但让你说清「凭哪几条、每条占多少、还差哪条才能定」——你答不上来。",
    "roots": "环境逼迫(门诊三分钟一个病人，说不清依据就只能依赖老师的结论) + 知识积累(脏腑辨证 × 加权规则表 = 一份能逐条核对、能报出证据缺口的判断)",
    "html": "<h1 id=\"第-8-章-脏腑辨证-规则表与权重-把-肝气郁结-写成可复核的打分\">第 8 章 · 脏腑辨证 → 规则表与权重：把「肝气郁结」写成可复核的打分</h1>\n<blockquote><p><strong>MOTTO:</strong> 「见肝之病，则知肝当传之于脾，故先实其脾气。」——《难经·七十七难》</p>\n<p><strong>PROBLEM:</strong> 病人说「胸闷、叹气、胁胀、心情不好」，你能脱口而出「肝气郁结」，但让你说清「凭哪几条、每条占多少、还差哪条才能定」——你答不上来。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(门诊三分钟一个病人，说不清依据就只能依赖老师的结论) + 知识积累(脏腑辨证 × 加权规则表 = 一份能逐条核对、能报出证据缺口的判断)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>中医诊断学</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>08 / 12</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>4 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>把脏腑辨证写成一张「症状 → 证候」的规则表，主症/次症的权重可解释</li><li>用不足 60 行标准库代码实现打分、排序、阈值判定与<strong>证据缺口</strong>输出</li><li>说清为什么「分数最高的证候」不等于「应该下的诊断」——剩下那部分是医生的责任</li><li>用两个只差一两条症状的病例，验证规则表能把它们分开</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"中医-脏腑辨证的位置\">中医：脏腑辨证的位置</h3>\n<p>脏腑辨证不是另起一套体系，它是八纲在<strong>病位</strong>维度上的展开。《素问·五脏生成篇》讲「五脏之气，故色见青如草兹者死」，把面色、症状与脏气联系起来；后世《景岳全书·传忠录》把辨证拆成「表里寒热虚实」，病位仍要落到脏腑。所以一张合格的脏腑辨证规则表至少要回答两件事：<strong>哪一脏</strong>、<strong>什么性质</strong>（寒热虚实）。</p>\n<p>教材把每一脏的证候写成「主症 + 次症 + 舌脉 + 兼症」的固定结构。这个结构本身就是一张可执行的打分表：主症是必要条件，次症是加权证据，舌脉往往是<strong>区分寒热</strong>的关键。</p>\n<h3 id=\"ai-工程-加权规则表与证据缺口\">AI/工程：加权规则表与证据缺口</h3>\n<p>设证候 <span class=\"math\">S</span> 的症状-权重对集合为 <span class=\"math\">E<sub>S</sub></span>（每条形如「症状 <span class=\"math\">f<sub>i</sub></span> + 权重 <span class=\"math\">w<sub>i</sub></span>」），病人出现的症状集合为 <span class=\"math\">P</span>，则</p>\n<span class=\"math-block\"><span class=\"math-text\">score</span>(S)=<span class=\"frac\"><span class=\"frac-num\">∑<sub>f<sub>i</sub>∈ P∩ E<sub>S</sub></sub> w<sub>i</sub></span><span class=\"frac-den\">∑<sub>f<sub>i</sub>∈ E<sub>S</sub></sub> w<sub>i</sub></span></span></span>\n<p>三个必须同时输出的量：</p>\n<ol><li><strong>score</strong>：覆盖度，不是概率，不要给它加 softmax 的外衣；</li><li><strong>missing</strong>：未命中的<strong>主症</strong>——这是「还差什么」，比分数本身更有临床价值；</li><li><strong>rivals</strong>：分数相差小于 0.15 的竞争证候，必须一并列出，因为临床上真正难的是鉴别。</li></ol>\n<p>把这三样一起输出，规则表才不会沦为「一个看起来很像 AI 的东西」。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">// code/main.js 核心（完整文件见仓库）\nfunction score(rule, symptoms) {\n  const hit = rule.evidence.filter((e) =&gt; symptoms.includes(e.f));\n  const w = rule.evidence.reduce((a, e) =&gt; a + e.w, 0);\n  const s = hit.reduce((a, e) =&gt; a + e.w, 0);\n  return {\n    id: rule.id,\n    score: +(s / w).toFixed(3),\n    missing: rule.evidence.filter((e) =&gt; e.required &amp;&amp; !symptoms.includes(e.f)).map((e) =&gt; e.f),\n  };\n}</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：<code>node code/main.js</code> 打印两个病例的排序结果与证据缺口；测试断言「肝气郁结」在病例 A 排第一、在病例 B 掉到第二且缺口为「目赤」。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>权重是人的判断，不是数据学出来的</strong>。表里的 3/2/1 来自教材对主症次症的划分，换一本教材就会变。要它稳定，必须固定版本并记录出处，否则同一病人换一家医院得出两种结论。</li><li><strong>覆盖度会被「症状说得越多」的病人抬高</strong>。问诊越细，score 越高，与病情轻重无关。所以分数只能在同一份问诊表内比较，跨病人比较没有意义。</li><li><strong>规则表不能表达「按之痛减」这类需要触诊的动态信息</strong>，也不能表达病程与传变——那需要状态机，不是打分。</li><li><strong>它不处理合病并病</strong>。多证并存时应当输出多个证候并列，而不是取 top-1。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 本章的规则表与代码是教学与工程演练材料，不构成诊疗建议，不能替代执业医师的四诊合参与鉴别诊断。任何真实病例的辨证结论由医师负责。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>给「肝火上炎」补一条能把它与「肝阳上亢」分开的症状，并说明为什么这条必须是主症。</li><li>把阈值从 0.6 改到 0.5，观察漏诊与误诊如何互换，写出你的取舍理由。</li><li>若病人同时满足两个证候且都过阈值，你的输出应该长什么样？</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>规则表是最容易做、也最容易被误当成「智能辨证」的一层。真正的分界不在算法复杂度，而在<strong>是否诚实地报告证据缺口</strong>——一个只会报 top-1 的系统，医生无法判断该不该信它。</p>",
    "markdown": "# 第 8 章 · 脏腑辨证 → 规则表与权重：把「肝气郁结」写成可复核的打分\n\n> **MOTTO:** 「见肝之病，则知肝当传之于脾，故先实其脾气。」——《难经·七十七难》\n>\n> **PROBLEM:** 病人说「胸闷、叹气、胁胀、心情不好」，你能脱口而出「肝气郁结」，但让你说清「凭哪几条、每条占多少、还差哪条才能定」——你答不上来。\n>\n> **双根因定位:** 环境逼迫(门诊三分钟一个病人，说不清依据就只能依赖老师的结论) + 知识积累(脏腑辨证 × 加权规则表 = 一份能逐条核对、能报出证据缺口的判断)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 中医诊断学 |\n| 院系 | 中医系 |\n| 章序号 | 08 / 12 |\n| 所属阶段 | 🌿 长·积累 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 4 小时 |\n\n## 学习目标\n\n- 把脏腑辨证写成一张「症状 → 证候」的规则表，主症/次症的权重可解释\n- 用不足 60 行标准库代码实现打分、排序、阈值判定与**证据缺口**输出\n- 说清为什么「分数最高的证候」不等于「应该下的诊断」——剩下那部分是医生的责任\n- 用两个只差一两条症状的病例，验证规则表能把它们分开\n\n## 核心概念\n\n### 中医：脏腑辨证的位置\n\n脏腑辨证不是另起一套体系，它是八纲在**病位**维度上的展开。《素问·五脏生成篇》讲「五脏之气，故色见青如草兹者死」，把面色、症状与脏气联系起来；后世《景岳全书·传忠录》把辨证拆成「表里寒热虚实」，病位仍要落到脏腑。所以一张合格的脏腑辨证规则表至少要回答两件事：**哪一脏**、**什么性质**（寒热虚实）。\n\n教材把每一脏的证候写成「主症 + 次症 + 舌脉 + 兼症」的固定结构。这个结构本身就是一张可执行的打分表：主症是必要条件，次症是加权证据，舌脉往往是**区分寒热**的关键。\n\n### AI/工程：加权规则表与证据缺口\n\n设证候 $S$ 的症状-权重对集合为 $E_S$（每条形如「症状 $f_i$ + 权重 $w_i$」），病人出现的症状集合为 $P$，则\n\n$$\\text{score}(S)=\\frac{\\sum_{f_i\\in P\\cap E_S} w_i}{\\sum_{f_i\\in E_S} w_i}$$\n\n三个必须同时输出的量：\n\n1. **score**：覆盖度，不是概率，不要给它加 softmax 的外衣；\n2. **missing**：未命中的**主症**——这是「还差什么」，比分数本身更有临床价值；\n3. **rivals**：分数相差小于 0.15 的竞争证候，必须一并列出，因为临床上真正难的是鉴别。\n\n把这三样一起输出，规则表才不会沦为「一个看起来很像 AI 的东西」。\n\n## BUILD IT：从零实现\n\n```js\n// code/main.js 核心（完整文件见仓库）\nfunction score(rule, symptoms) {\n  const hit = rule.evidence.filter((e) => symptoms.includes(e.f));\n  const w = rule.evidence.reduce((a, e) => a + e.w, 0);\n  const s = hit.reduce((a, e) => a + e.w, 0);\n  return {\n    id: rule.id,\n    score: +(s / w).toFixed(3),\n    missing: rule.evidence.filter((e) => e.required && !symptoms.includes(e.f)).map((e) => e.f),\n  };\n}\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：`node code/main.js` 打印两个病例的排序结果与证据缺口；测试断言「肝气郁结」在病例 A 排第一、在病例 B 掉到第二且缺口为「目赤」。\n\n## 代价与边界\n\n- **权重是人的判断，不是数据学出来的**。表里的 3/2/1 来自教材对主症次症的划分，换一本教材就会变。要它稳定，必须固定版本并记录出处，否则同一病人换一家医院得出两种结论。\n- **覆盖度会被「症状说得越多」的病人抬高**。问诊越细，score 越高，与病情轻重无关。所以分数只能在同一份问诊表内比较，跨病人比较没有意义。\n- **规则表不能表达「按之痛减」这类需要触诊的动态信息**，也不能表达病程与传变——那需要状态机，不是打分。\n- **它不处理合病并病**。多证并存时应当输出多个证候并列，而不是取 top-1。\n\n> **免责声明：** 本章的规则表与代码是教学与工程演练材料，不构成诊疗建议，不能替代执业医师的四诊合参与鉴别诊断。任何真实病例的辨证结论由医师负责。\n\n## 练习\n\n1. 给「肝火上炎」补一条能把它与「肝阳上亢」分开的症状，并说明为什么这条必须是主症。\n2. 把阈值从 0.6 改到 0.5，观察漏诊与误诊如何互换，写出你的取舍理由。\n3. 若病人同时满足两个证候且都过阈值，你的输出应该长什么样？\n\n## 进阶思考\n\n规则表是最容易做、也最容易被误当成「智能辨证」的一层。真正的分界不在算法复杂度，而在**是否诚实地报告证据缺口**——一个只会报 top-1 的系统，医生无法判断该不该信它。\n",
    "code": {
      "main.js": "'use strict';\n/**\n * 脏腑辨证：加权规则表打分 + 证据缺口\n *\n *   node code/main.js\n *\n * 口径（与 docs/zh.md 一致）：\n *   score = Σ(命中证据权重) / Σ(全部证据权重)   —— 覆盖度，不是概率\n *   missing = 未命中的**主症**（required），这是\"还差什么\"\n *   rivals = 与最高分相差 < 0.15 的证候，必须一并列出\n *\n * 为什么权重写死在表里而不是学出来：教材对主症/次症的划分是这一课的**事实源**，\n * 改成拟合出来的系数，病例一变就再也对不上教材，学生无法复核。\n */\n\nconst RULES = [\n  {\n    id: '肝气郁结',\n    evidence: [\n      { f: '胸胁胀满', w: 3, required: true },\n      { f: '善太息', w: 2, required: true },\n      { f: '情志抑郁', w: 2, required: false },\n      { f: '脉弦', w: 1, required: false },\n    ],\n  },\n  {\n    id: '肝火上炎',\n    evidence: [\n      { f: '目赤', w: 3, required: true },\n      { f: '口苦', w: 2, required: true },\n      { f: '急躁易怒', w: 2, required: false },\n      { f: '脉弦数', w: 1, required: false },\n    ],\n  },\n];\n\nconst RIVAL_GAP = 0.15;\n\nfunction scoreOf(rule, symptoms) {\n  const total = rule.evidence.reduce((a, e) => a + e.w, 0);\n  const hit = rule.evidence.filter((e) => symptoms.includes(e.f));\n  return {\n    id: rule.id,\n    score: +(hit.reduce((a, e) => a + e.w, 0) / total).toFixed(3),\n    missing: rule.evidence.filter((e) => e.required && !symptoms.includes(e.f)).map((e) => e.f),\n  };\n}\n\nfunction rank(symptoms, threshold = 0.6) {\n  const all = RULES.map((r) => scoreOf(r, symptoms)).sort((a, b) => b.score - a.score);\n  const top = all[0];\n  return {\n    // 过阈值才叫\"可考虑的证候\"；没过阈值的仍列出来，但标成 under-threshold\n    candidates: all.map((c) => ({ ...c, passed: c.score >= threshold })),\n    rivals: all.filter((c, i) => i > 0 && top.score - c.score < RIVAL_GAP).map((c) => c.id),\n  };\n}\n\nconst CASES = [\n  { name: 'A：典型肝气郁结', symptoms: ['胸胁胀满', '善太息', '情志抑郁', '脉弦'] },\n  { name: 'B：肝气郁结 + 目赤', symptoms: ['胸胁胀满', '善太息', '目赤', '口苦', '脉弦'] },\n];\n\nfunction main() {\n  for (const c of CASES) {\n    const r = rank(c.symptoms);\n    console.log(`\\n${c.name}`);\n    for (const x of r.candidates) {\n      console.log(`  ${x.id}  score=${x.score}  ${x.passed ? '✓过阈值' : '（未过阈值）'}`);\n      if (x.missing.length) console.log(`    缺主症：${x.missing.join('、')}`);\n    }\n    if (r.rivals.length) console.log(`  ⚠ 竞争证候（分差 < ${RIVAL_GAP}）：${r.rivals.join('、')}`);\n  }\n  console.log('\\n提醒：score 是覆盖度，不是概率；结论由医师负责。');\n  console.log('本输出为教学样例，不构成诊疗建议。');\n}\n\nif (require.main === module) main();\nmodule.exports = { RULES, scoreOf, rank, RIVAL_GAP };\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { scoreOf, rank, RULES } = require('./main.js');\n\nconst liverQi = RULES.find((r) => r.id === '肝气郁结');\nconst liverFire = RULES.find((r) => r.id === '肝火上炎');\n\ntest('肝气郁结：典型四症全覆盖 = 1.0，无缺口', () => {\n  const r = scoreOf(liverQi, ['胸胁胀满', '善太息', '情志抑郁', '脉弦']);\n  assert.strictEqual(r.score, 1);\n  assert.deepStrictEqual(r.missing, []);\n});\n\ntest('只有主症时：缺口为空但分数不等于 1（次症是加权项）', () => {\n  const r = scoreOf(liverQi, ['胸胁胀满', '善太息']);\n  assert.strictEqual(r.missing.length, 0);\n  assert.ok(r.score > 0.6 && r.score < 1);\n});\n\ntest('缺主症时：missing 必须报出缺的那一条', () => {\n  const r = scoreOf(liverFire, ['口苦', '急躁易怒']);\n  assert.deepStrictEqual(r.missing, ['目赤']);\n});\n\ntest('两证并存时：排序与竞争证候都要给出', () => {\n  const r = rank(['胸胁胀满', '善太息', '目赤', '口苦', '脉弦']);\n  assert.strictEqual(r.candidates[0].id, '肝气郁结');\n  assert.ok(r.rivals.includes('肝火上炎'));\n});\n\ntest('未过阈值：passed=false，但仍出现在候选里（不许静默丢弃）', () => {\n  const r = rank(['脉弦']);\n  assert.ok(r.candidates.every((c) => c.passed === false));\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "脏腑辨证与八纲辨证的关系，最准确的描述是？",
          "options": [
            "两套互相独立的辨证体系，结论经常冲突",
            "脏腑辨证是八纲在病位维度上的展开，性质仍用寒热虚实表述",
            "八纲只用于外感，脏腑辨证只用于内伤",
            "脏腑辨证比八纲更精确，可以完全取代八纲"
          ],
          "correct": 1,
          "explanation": "八纲定性质（表里寒热虚实阴阳），脏腑辨证把「里」进一步落到具体脏腑，两者是层次关系。"
        },
        {
          "stage": "check",
          "question": "本课的 score 在数学上是下面哪一个？",
          "options": [
            "证候成立的先验概率",
            "命中证据权重占该证候全部证据权重的比例（覆盖度）",
            "症状总数与证候数的比值",
            "经过 softmax 归一化后的置信度"
          ],
          "correct": 1,
          "explanation": "score 是覆盖度，不做 softmax —— 把覆盖度包装成概率是最常见的过度声明。"
        },
        {
          "stage": "check",
          "question": "为什么代码要单独输出 missing（未命中的主症）？",
          "options": [
            "为了让输出看起来更长",
            "因为分数高不代表证据齐，缺口才是医生继续追问的方向",
            "因为 missing 参与 score 的计算",
            "因为教材要求每个证候必须有三条主症"
          ],
          "correct": 1,
          "explanation": "缺主症意味着「还差什么才能定」，这比 top-1 的分值更有临床价值。"
        },
        {
          "stage": "check",
          "question": "病人症状越多，score 越高，这说明？",
          "options": [
            "病情越重",
            "问诊越细覆盖度越高，因此分数只能在同一份问诊表内比较",
            "规则表的权重需要重新学习",
            "应该把阈值随症状数量调整"
          ],
          "correct": 1,
          "explanation": "覆盖度对问诊粒度敏感，跨病人直接比较分数是误用。"
        },
        {
          "stage": "post",
          "question": "两证分数相差 0.12，都过阈值时，正确的输出是？",
          "options": [
            "只报最高分那个，避免干扰医生",
            "报最高分，并把竞争证候一并列出供鉴别",
            "取平均分作为最终结论",
            "随机选一个，因为差别不显著"
          ],
          "correct": 1,
          "explanation": "临床上真正难的是鉴别，分差小于阈值时隐藏对手等于制造盲区。"
        },
        {
          "stage": "post",
          "question": "本课规则表最不适合处理下面哪种情况？",
          "options": [
            "只有主症、次症不全的门诊病人",
            "两个证候同时成立的合病并病",
            "症状描述里带舌脉的病例",
            "需要分寒热的病例"
          ],
          "correct": 1,
          "explanation": "打分只能排序，合病并存需要多标签输出与传变模型；本课只演示前者。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-zangfu-bianzheng.md",
        "kind": "prompt",
        "file": "departments/01-zhongyi/05-zhongyi-zhen-duan-xue/chapters/08-zangfu-bianzheng/outputs/prompt-zangfu-bianzheng.md",
        "title": "脏腑辨证规则表生成器",
        "description": null,
        "chars": 651,
        "body": "# 脏腑辨证规则表生成器\n\n## 用途\n\n把一段门诊四诊记录，整理成「症状清单 → 脏腑证候排序 + 证据缺口 + 竞争证候」的可复核输出。\n用于**跟诊记录整理、病例讨论准备、教学演示**，不用于替代医师判断。\n\n## 提示词\n\n```text\n你是中医诊断学的助教。下面是一段门诊四诊记录。请只做一件事：\n把它整理成可用于脏腑辨证的结构化证据表。\n\n规则：\n1. 症状必须逐字取自原文，不得改写、不得推断（原文只写「胸闷」，就不要写成「胸胁胀满」）。\n2. 按「主症（决定证候成立）/ 次症（加权）/ 舌脉（多用于定寒热）」分三栏。\n3. 每条症状后面用括号注明它在原文中的位置（第几句），便于回查。\n4. 不要给证候结论；如果你认为证据已足够，只允许写「候选证候：X、Y」，并列出各自的证据缺口。\n5. 缺什么就写缺什么。原文没有舌脉，就写「舌脉未记录」，不要补。\n\n输出格式：\n【症状清单】主症：… / 次症：… / 舌脉：…\n【候选证候与缺口】…\n【必须追问的问题】…\n```\n\n## 使用示例\n\n输入：「患者，女，34 岁。胸闷，善太息，心情不好时加重，纳可，二便调。」\n\n输出要点：主症为「胸闷（第1句）、善太息（第1句）」；次症「情志抑郁（心情不好时加重，第1句）」；\n舌脉未记录；候选证候「肝气郁结」缺舌脉；必须追问：胁肋是否胀痛、脉象如何、月经是否前错。\n\n## 为什么这样限制\n\n- 逐字引用：防止把「胸闷」升格成「胸胁胀满」，那是**替病人加症状**，也是规则表输出失真的第一大来源。\n- 要求标注位置：让第二个人能回原文核对，证据才成立。\n- 禁止给结论：模型的结论没有责任主体；给缺口才是有用的东西。\n"
      },
      {
        "name": "skill-zangfu-bianzheng.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/05-zhongyi-zhen-duan-xue/chapters/08-zangfu-bianzheng/outputs/skill-zangfu-bianzheng.md",
        "title": "zangfu-bianzheng",
        "description": "把四诊记录整理成脏腑证候的证据表（主症/次症/舌脉）并报出证据缺口，不给结论",
        "chars": 621,
        "body": "---\nname: zangfu-bianzheng\ndescription: 把四诊记录整理成脏腑证候的证据表（主症/次症/舌脉）并报出证据缺口，不给结论\nversion: 0.1.0\n---\n\n# zangfu-bianzheng\n\n## 何时使用\n\n- 跟诊后整理病例，需要一份「依据在哪」的记录\n- 病例讨论前，要把四诊信息对齐到脏腑证候的证据结构\n- 教学演示：让学生看清同一个病人为什么会被辨成两个不同证候\n\n## 不适用\n\n- 需要下诊断结论时（本技能只出证据表与缺口）\n- 需要处理合病并病、传变时（那需要状态模型，不是证据表）\n- 原文症状靠含糊转述、无法逐字引用时\n\n## 步骤\n\n1. **锁原文**：把四诊记录按句子编号，后续所有症状都必须能指回句号。\n2. **分三栏**：主症（缺则不成立）/ 次症（加权）/ 舌脉（多定寒热）。\n3. **逐条引用**：不改写、不合并、不推断。原文没写的，写「未记录」。\n4. **列候选**：只写证据已触达的证候，每个都附缺口。\n5. **写追问清单**：把缺口翻译成下一次问诊要问的具体问题。\n\n## 输出模板\n\n```text\n【症状清单】\n主症：<症状>（第N句）…\n次症：<症状>（第N句）…\n舌脉：<…> / 未记录\n\n【候选证候与缺口】\n- <证候>：已覆盖 …；缺 …\n- <证候>：…\n\n【必须追问】\n1. …\n```\n\n## 质量判据\n\n- 每条症状都能在第 N 句找到原话（否则是编的）\n- 缺口为空时，必须说明舌脉与次症是否齐全\n- 至少给出一个竞争证候，除非证据独一地指向某一个\n\n> 本技能输出为教学材料，不构成诊疗建议。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "01-zhongyi/06-neijing-xuandu/01-suwen-chengshu": {
    "key": "01-zhongyi/06-neijing-xuandu/01-suwen-chengshu",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "06-neijing-xuandu",
    "subjectTitle": "内经选读",
    "chapterSlug": "01-suwen-chengshu",
    "n": 1,
    "title": "第 1 章 · 《黄帝内经》成书与文本结构：162 篇不是一个整体",
    "motto": "「余子万民，养百姓而收其租税……令可传于后世，必明为之法。」——《灵枢·九针十二原》",
    "problem": "你说「《内经》讲阴阳五行」，但被问「素问和灵枢各多少篇、每篇多长、篇名是不是作者自标的」时答不上来；于是任何一句「内经云」你都无法判断它出自哪一部分、可信到什么程度。",
    "roots": "环境逼迫(引用经典时说不出篇名与位置，等于没有依据) + 知识积累(文本结构实测 × 三级对象 = 一个能定位、能统计、能说明边界的引文系统)",
    "html": "<h1 id=\"第-1-章-黄帝内经-成书与文本结构-162-篇不是一个整体\">第 1 章 · 《黄帝内经》成书与文本结构：162 篇不是一个整体</h1>\n<blockquote><p><strong>MOTTO:</strong> 「余子万民，养百姓而收其租税……令可传于后世，必明为之法。」——《灵枢·九针十二原》</p>\n<p><strong>PROBLEM:</strong> 你说「《内经》讲阴阳五行」，但被问「素问和灵枢各多少篇、每篇多长、篇名是不是作者自标的」时答不上来；于是任何一句「内经云」你都无法判断它出自哪一部分、可信到什么程度。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(引用经典时说不出篇名与位置，等于没有依据) + 知识积累(文本结构实测 × 三级对象 = 一个能定位、能统计、能说明边界的引文系统)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>内经选读</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>01 / 10</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>说出《内经》的构成：素问 81 篇 + 灵枢 81 篇 = 162 篇，以及两书各自的体量差异</li><li>用实测数字说明「素问篇均比灵枢长」，并解释这个差异对选读意味着什么</li><li>理解「篇—章—节」三级对象与「篇名锚定」原则，说清为什么篇名可以当主题标签</li><li>用代码算出任意一篇的字数、条数与其在全书中的占比</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"实测-两书不是同一副骨架\">实测：两书不是同一副骨架</h3>\n<p>据仓库内原件（<code>standards/materials/neijing-quanwen/</code>，源 <code>黄帝内经全文.xls</code>）逐表统计：</p>\n<div class=\"table-wrap\"><table><thead><tr><th></th><th>篇数</th><th>正文字数</th><th>篇均字数</th><th>篇均条文数</th></tr></thead><tbody><tr><td>素问</td><td>81</td><td>318,616</td><td><strong>3,934</strong></td><td>47.6</td></tr><tr><td>灵枢</td><td>81</td><td>242,495</td><td><strong>2,994</strong></td><td>32.1</td></tr><tr><td>合计</td><td>162</td><td>561,111</td><td>3,464</td><td>39.9</td></tr></tbody></table></div>\n<p>素问篇均比灵枢长约 31%。这不是排版差异，而是体裁差异：素问多论（阴阳、藏象、运气），灵枢多术（九针、经脉、骨度）。<strong>选读时把它们当同一体裁处理，就会用读论文的方法读操作手册。</strong></p>\n<h3 id=\"三级对象与篇名锚定\">三级对象与篇名锚定</h3>\n<p>《内经语义域》把语言表达对象分成三级：<strong>篇 obj → 章 obj → 节 obj</strong>。三级不是阅读习惯，而是可抽取的规则：篇名由作者自标，所以篇名可以作为语义域的权威归类依据；章与节则靠文意切分，必须靠夹注清洗（如「（别本作睹）」「（《太素》为…）」）先剥掉校勘内容，否则切出来的「章」会带着别人的批注。</p>\n<p>这条规则的实际后果：<strong>「内经云」这三个字不合格</strong>。合格的引用必须到篇，且注明是原文还是后人注释 —— 本仓库的材料把「原文」与「注释」分成两类块，正是为了这件事。</p>\n<h3 id=\"篇名不是章节号\">篇名不是章节号</h3>\n<p>素问的篇名（上古天真论、阴阳应象大论、至真要大论）是主题标签，不是编号；灵枢同理（九针十二原、本输、小针解）。所以「第 5 篇」这种说法必须绑定具体版本 —— 不同版本编次不同。这一点在下一章（文本结构）与伤寒的条号问题上是同一个坑。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">// code/main.js：读本仓库的内经全本，算每篇字数/条数/占比，并按篇名检索\nconst { readWorkbook } = require('../../../scripts/lib_xls');\nconst wb = readWorkbook('standards/materials/neijing-quanwen/sources/黄帝内经全文.xls');\nfunction stats() { /* 逐表统计 SW/LS 前缀，返回 {book, pian, chars, blocks} */ }\nfunction find(name) { /* 按篇名片段检索，返回篇名 + 字数 + 条数 */ }</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：<code>stats()</code> 输出素问 81 篇 318,616 字、灵枢 81 篇 242,495 字，合计 561,111 字；<code>find('至真要大论')</code> 返回该篇的篇名与字数，且拒绝返回空结果（找不到就说找不到）。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>字数统计口径依赖清洗规则</strong>。本仓库按「去掉空白后的汉字数」计，含标点、不含篇名与校勘夹注；换成别的口径数字会变，所以每个数字都标注了来源文件与口径。</li><li><strong>162 篇不等于 162 个作者</strong>。《内经》非一人一时之作，篇间体例不一；本章只做结构与量的描述，不做作者判定。</li><li><strong>本仓库用的是电子整理本，不是校勘底本</strong>。异体字、通假字、错简都可能与刻本不同；一切引文以所用底本为准，本章不承担校勘职能。</li><li><strong>篇均数字不能用来判优劣</strong>。灵枢篇短是因为体裁（操作条目），不是内容少；拿篇均字数当「重要性」是典型的指标误用。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 本章字数与条数由 <code>scripts/lib_xls.js</code> 从仓库内 <code>黄帝内经全文.xls</code> 实测得出，可直接复核；文本校勘与版本判断不属本章范围，临床引用请以权威校勘本为准。本章不构成诊疗建议。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>用 <code>find()</code> 比较《素问·至真要大论》与《灵枢·九针十二原》的字数差，说明这个差与体裁的关系。</li><li>把统计口径改成「含标点」重跑，观察数字变化幅度，说明为什么口径必须写在结论旁边。</li><li>若某篇在材料里只有「注释」没有「原文」，你的统计该怎么处理？给出规则并改代码。</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>读经典的第一道门槛不是义理，是<strong>定位</strong>：这句话在哪一篇、是原文还是注、这一篇有多长、属于论还是术。越过这道门槛之后，「内经云」才有分量。</p>",
    "markdown": "# 第 1 章 · 《黄帝内经》成书与文本结构：162 篇不是一个整体\n\n> **MOTTO:** 「余子万民，养百姓而收其租税……令可传于后世，必明为之法。」——《灵枢·九针十二原》\n>\n> **PROBLEM:** 你说「《内经》讲阴阳五行」，但被问「素问和灵枢各多少篇、每篇多长、篇名是不是作者自标的」时答不上来；于是任何一句「内经云」你都无法判断它出自哪一部分、可信到什么程度。\n>\n> **双根因定位:** 环境逼迫(引用经典时说不出篇名与位置，等于没有依据) + 知识积累(文本结构实测 × 三级对象 = 一个能定位、能统计、能说明边界的引文系统)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 内经选读 |\n| 院系 | 中医系 |\n| 章序号 | 01 / 10 |\n| 所属阶段 | 🌿 长·积累 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 3 小时 |\n\n## 学习目标\n\n- 说出《内经》的构成：素问 81 篇 + 灵枢 81 篇 = 162 篇，以及两书各自的体量差异\n- 用实测数字说明「素问篇均比灵枢长」，并解释这个差异对选读意味着什么\n- 理解「篇—章—节」三级对象与「篇名锚定」原则，说清为什么篇名可以当主题标签\n- 用代码算出任意一篇的字数、条数与其在全书中的占比\n\n## 核心概念\n\n### 实测：两书不是同一副骨架\n\n据仓库内原件（`standards/materials/neijing-quanwen/`，源 `黄帝内经全文.xls`）逐表统计：\n\n| | 篇数 | 正文字数 | 篇均字数 | 篇均条文数 |\n|---|--:|--:|--:|--:|\n| 素问 | 81 | 318,616 | **3,934** | 47.6 |\n| 灵枢 | 81 | 242,495 | **2,994** | 32.1 |\n| 合计 | 162 | 561,111 | 3,464 | 39.9 |\n\n素问篇均比灵枢长约 31%。这不是排版差异，而是体裁差异：素问多论（阴阳、藏象、运气），灵枢多术（九针、经脉、骨度）。**选读时把它们当同一体裁处理，就会用读论文的方法读操作手册。**\n\n### 三级对象与篇名锚定\n\n《内经语义域》把语言表达对象分成三级：**篇 obj → 章 obj → 节 obj**。三级不是阅读习惯，而是可抽取的规则：篇名由作者自标，所以篇名可以作为语义域的权威归类依据；章与节则靠文意切分，必须靠夹注清洗（如「（别本作睹）」「（《太素》为…）」）先剥掉校勘内容，否则切出来的「章」会带着别人的批注。\n\n这条规则的实际后果：**「内经云」这三个字不合格**。合格的引用必须到篇，且注明是原文还是后人注释 —— 本仓库的材料把「原文」与「注释」分成两类块，正是为了这件事。\n\n### 篇名不是章节号\n\n素问的篇名（上古天真论、阴阳应象大论、至真要大论）是主题标签，不是编号；灵枢同理（九针十二原、本输、小针解）。所以「第 5 篇」这种说法必须绑定具体版本 —— 不同版本编次不同。这一点在下一章（文本结构）与伤寒的条号问题上是同一个坑。\n\n## BUILD IT：从零实现\n\n```js\n// code/main.js：读本仓库的内经全本，算每篇字数/条数/占比，并按篇名检索\nconst { readWorkbook } = require('../../../scripts/lib_xls');\nconst wb = readWorkbook('standards/materials/neijing-quanwen/sources/黄帝内经全文.xls');\nfunction stats() { /* 逐表统计 SW/LS 前缀，返回 {book, pian, chars, blocks} */ }\nfunction find(name) { /* 按篇名片段检索，返回篇名 + 字数 + 条数 */ }\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：`stats()` 输出素问 81 篇 318,616 字、灵枢 81 篇 242,495 字，合计 561,111 字；`find('至真要大论')` 返回该篇的篇名与字数，且拒绝返回空结果（找不到就说找不到）。\n\n## 代价与边界\n\n- **字数统计口径依赖清洗规则**。本仓库按「去掉空白后的汉字数」计，含标点、不含篇名与校勘夹注；换成别的口径数字会变，所以每个数字都标注了来源文件与口径。\n- **162 篇不等于 162 个作者**。《内经》非一人一时之作，篇间体例不一；本章只做结构与量的描述，不做作者判定。\n- **本仓库用的是电子整理本，不是校勘底本**。异体字、通假字、错简都可能与刻本不同；一切引文以所用底本为准，本章不承担校勘职能。\n- **篇均数字不能用来判优劣**。灵枢篇短是因为体裁（操作条目），不是内容少；拿篇均字数当「重要性」是典型的指标误用。\n\n> **免责声明：** 本章字数与条数由 `scripts/lib_xls.js` 从仓库内 `黄帝内经全文.xls` 实测得出，可直接复核；文本校勘与版本判断不属本章范围，临床引用请以权威校勘本为准。本章不构成诊疗建议。\n\n## 练习\n\n1. 用 `find()` 比较《素问·至真要大论》与《灵枢·九针十二原》的字数差，说明这个差与体裁的关系。\n2. 把统计口径改成「含标点」重跑，观察数字变化幅度，说明为什么口径必须写在结论旁边。\n3. 若某篇在材料里只有「注释」没有「原文」，你的统计该怎么处理？给出规则并改代码。\n\n## 进阶思考\n\n读经典的第一道门槛不是义理，是**定位**：这句话在哪一篇、是原文还是注、这一篇有多长、属于论还是术。越过这道门槛之后，「内经云」才有分量。\n",
    "code": {
      "main.js": "'use strict';\n/**\n * 《黄帝内经》文本结构统计：162 篇的字数与条数\n *\n *   node code/main.js\n *\n * 口径（写在结论旁边，换口径数字就变）：\n *   · 字数 = 去掉空白后的字符数，含标点，不含篇名与校勘夹注\n *   · 条数 = 材料里「原文/注释」块的数量（不是通行本的「条」编号）\n *   · 只统计仓库内已入库的原件，不联网\n */\n\nconst path = require('node:path');\nconst fs = require('node:fs');\n\nconst ROOT = path.resolve(__dirname, '../../../../../..');\nconst SRC = path.join(ROOT, 'standards/materials/neijing-quanwen/sources/黄帝内经全文.xls');\n\nfunction loadWorkbook() {\n  const { readWorkbook } = require(path.join(ROOT, 'scripts/lib_xls.js'));\n  return readWorkbook(SRC);\n}\n\n/** 逐表统计：SW* 为素问，LS* 为灵枢 */\nfunction stats(wb = loadWorkbook()) {\n  const acc = {\n    素问: { pian: 0, chars: 0, blocks: 0 },\n    灵枢: { pian: 0, chars: 0, blocks: 0 },\n  };\n  for (const s of wb.sheets) {\n    const book = s.name.startsWith('SW') ? '素问' : s.name.startsWith('LS') ? '灵枢' : null;\n    if (!book) continue;\n    const blocks = s.rows.slice(2).filter((r) => String(r[2] || '').trim());\n    const chars = blocks.reduce((a, r) => a + String(r[2]).replace(/\\s/g, '').length, 0);\n    acc[book].pian += 1;\n    acc[book].chars += chars;\n    acc[book].blocks += blocks.length;\n  }\n  const total = {\n    pian: acc.素问.pian + acc.灵枢.pian,\n    chars: acc.素问.chars + acc.灵枢.chars,\n    blocks: acc.素问.blocks + acc.灵枢.blocks,\n  };\n  for (const k of ['素问', '灵枢']) {\n    acc[k].avgChars = Math.round(acc[k].chars / acc[k].pian);\n    acc[k].avgBlocks = +(acc[k].blocks / acc[k].pian).toFixed(1);\n  }\n  return { books: acc, total };\n}\n\n/** 按篇名片段检索：返回 {name, book, chars, blocks} 或 null（找不到就说找不到） */\nfunction find(name, wb = loadWorkbook()) {\n  const hit = wb.sheets.find((s) => String((s.rows[0] || [])[0] || '').includes(name));\n  if (!hit) return null;\n  const blocks = hit.rows.slice(2).filter((r) => String(r[2] || '').trim());\n  return {\n    name: String(hit.rows[0][0]),\n    book: hit.name.startsWith('SW') ? '素问' : '灵枢',\n    chars: blocks.reduce((a, r) => a + String(r[2]).replace(/\\s/g, '').length, 0),\n    blocks: blocks.length,\n  };\n}\n\nfunction main() {\n  if (!fs.existsSync(SRC)) {\n    console.log('源文件未入库，无法统计（先跑 node scripts/import_materials.js）');\n    return;\n  }\n  const s = stats();\n  for (const k of ['素问', '灵枢']) {\n    const b = s.books[k];\n    console.log(`${k}：${b.pian} 篇 · ${b.chars} 字 · 篇均 ${b.avgChars} 字 / ${b.avgBlocks} 条`);\n  }\n  console.log(`合计：${s.total.pian} 篇 · ${s.total.chars} 字 · ${s.total.blocks} 条`);\n  console.log(`素问篇均比灵枢长 ${((s.books.素问.avgChars / s.books.灵枢.avgChars - 1) * 100).toFixed(0)}% —— 体裁差异，不是重要性差异`);\n\n  for (const q of ['至真要大论', '九针十二原', '不存在篇']) {\n    const r = find(q);\n    console.log(r ? `  检索「${q}」→ ${r.name}（${r.book}，${r.chars} 字 / ${r.blocks} 条）` : `  检索「${q}」→ 未找到（不猜、不返回最相近的）`);\n  }\n  console.log('\\n本输出为教学样例，统计口径见文件头；不构成诊疗建议。');\n}\n\nif (require.main === module) main();\nmodule.exports = { stats, find, loadWorkbook, SRC };\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { stats, find } = require('./main.js');\n\ntest('两书各 81 篇，合计 162 篇', () => {\n  const s = stats();\n  assert.strictEqual(s.books.素问.pian, 81);\n  assert.strictEqual(s.books.灵枢.pian, 81);\n  assert.strictEqual(s.total.pian, 162);\n});\n\ntest('字数与原件一致（口径：去空白、含标点）', () => {\n  const s = stats();\n  assert.strictEqual(s.books.素问.chars, 318616);\n  assert.strictEqual(s.books.灵枢.chars, 242495);\n  assert.strictEqual(s.total.chars, 561111);\n});\n\ntest('素问篇均长于灵枢（体裁差异，被写成断言）', () => {\n  const s = stats();\n  assert.ok(s.books.素问.avgChars > s.books.灵枢.avgChars);\n});\n\ntest('按篇名检索：命中返回书名与字数', () => {\n  const r = find('至真要大论');\n  assert.ok(r);\n  assert.strictEqual(r.book, '素问');\n  assert.ok(r.chars > 20000);\n});\n\ntest('检索不到时返回 null，不返回最相近的篇', () => {\n  assert.strictEqual(find('不存在的篇名'), null);\n});\n\ntest('条数与字数各自独立统计，不许用条数估字数', () => {\n  const s = stats();\n  assert.ok(s.total.blocks > 0);\n  assert.notStrictEqual(s.total.chars, s.total.blocks);\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "《黄帝内经》由哪两部分组成，各多少篇？",
          "options": [
            "素问 81 篇 + 灵枢 81 篇",
            "素问 79 篇 + 灵枢 81 篇",
            "素问 81 篇 + 难经 81 篇",
            "素问 60 篇 + 灵枢 90 篇"
          ],
          "correct": 0,
          "explanation": "两书各 81 篇，合计 162 篇；本仓库原件逐表可核。"
        },
        {
          "stage": "check",
          "question": "据本仓库实测，素问篇均字数约为？",
          "options": [
            "1,340 字",
            "2,994 字",
            "3,934 字",
            "5,600 字"
          ],
          "correct": 2,
          "explanation": "素问 318,616 字 / 81 篇 ≈ 3,934 字；灵枢约 2,994 字。"
        },
        {
          "stage": "check",
          "question": "「篇名锚定」原则的意思是？",
          "options": [
            "篇名由编者后加，不能作为依据",
            "篇名是作者自标的主题，可作为语义域的权威归类依据",
            "每篇必须按顺序编号才能引用",
            "篇名可以随意改写以便检索"
          ],
          "correct": 1,
          "explanation": "篇名自标 → 可作为主题标签；章与节靠文意切分，需要夹注清洗。"
        },
        {
          "stage": "check",
          "question": "素问篇均比灵枢长约三成，最合理的解释是？",
          "options": [
            "素问更重要",
            "体裁差异：素问多论，灵枢多术（操作条目更短）",
            "灵枢是残本",
            "字数统计出错了"
          ],
          "correct": 1,
          "explanation": "拿篇均字数当重要性是指标误用，本章明确禁止。"
        },
        {
          "stage": "post",
          "question": "引用「内经云」时，最低合格标准是？",
          "options": [
            "说出书名即可",
            "到篇名，并注明是原文还是后人注释",
            "说出卷数",
            "说出字数"
          ],
          "correct": 1,
          "explanation": "不到篇的引文无法核对；原文与注释混淆会改变结论。"
        },
        {
          "stage": "post",
          "question": "为什么「第 5 篇」这种说法必须绑定版本？",
          "options": [
            "因为篇名会变",
            "因为不同版本的编次不同，序号不是稳定标识",
            "因为第 5 篇已佚",
            "因为页码会变"
          ],
          "correct": 1,
          "explanation": "篇名稳定、序号不稳定；伤寒的条号问题同理。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-suwen-chengshu.md",
        "kind": "prompt",
        "file": "departments/01-zhongyi/06-neijing-xuandu/chapters/01-suwen-chengshu/outputs/prompt-suwen-chengshu.md",
        "title": "内经引文定位助手",
        "description": null,
        "chars": 562,
        "body": "# 内经引文定位助手\n\n## 用途\n\n把一句「内经云」补成可核对的引用：定位到篇、判明原文还是注释、给出该篇体量，\n用于**文稿引用核对、读书笔记规范化、教学备课**。不做义理解释。\n\n## 提示词\n\n```text\n你是内经文献的引文核对助手。下面是一段文稿里的经典引用。\n\n规则：\n1. 每条引用必须补到「《素问·篇名》」或「《灵枢·篇名》」级；补不出来就写「无法定位」，不要猜。\n2. 说明该条是**原文**还是**后人注释**（材料里两者分开存，别混）。\n3. 给出该篇实测体量（字数 / 条文数），来源写「仓库内 neijing-quanwen 原件」。\n4. 若引文与原文有字词差异（异体字、通假、脱文），逐处标出差异位置，不擅自「修正」。\n5. 禁止补写原文里没有的句子；缺什么写缺什么。\n\n输出格式：\n【引用】原句…\n【定位】《素问·X》｜类型：原文/注释\n【体量】该篇 … 字 / … 条\n【字词差异】…\n【无法定位项】…\n```\n\n## 使用示例\n\n输入：「内经云：阴阳者，天地之道也。」\n\n输出：【定位】《素问·阴阳应象大论》｜原文\n【体量】该篇 7,314 字 / 55 条（仓库内原件实测）\n【字词差异】无\n【无法定位项】无\n\n## 为什么这样限制\n\n- 必须到篇：不到篇的引用无法被第二个人核对。\n- 区分原文/注释：注释混进原文，是内经引用最常见的失真。\n- 标注字词差异而不「修正」：整理本与刻本不同，擅自统一会掩盖版本问题。\n"
      },
      {
        "name": "skill-suwen-chengshu.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/06-neijing-xuandu/chapters/01-suwen-chengshu/outputs/skill-suwen-chengshu.md",
        "title": "suwen-chengshu",
        "description": "把「内经云」补到篇级并判明原文/注释，给出该篇实测体量与字词差异",
        "chars": 550,
        "body": "---\nname: suwen-chengshu\ndescription: 把「内经云」补到篇级并判明原文/注释，给出该篇实测体量与字词差异\nversion: 0.1.0\n---\n\n# suwen-chengshu\n\n## 何时使用\n\n- 文稿或讲稿里引用了「内经」，需要补到可核对的粒度\n- 备课：先确认这句话在哪一篇、多长、属论还是术\n- 校对：同一句在不同整理本里字词不同，需要标出而不改写\n\n## 不适用\n\n- 需要义理阐释或临床解读（本技能只做定位与核对）\n- 需要版本校勘（本仓库不是校勘底本）\n- 引文只有白话转述、没有原文词句时（此时应写「无法定位」）\n\n## 步骤\n\n1. **取特征词**：从引文里挑 2–4 个稳定词（避开虚词与校勘夹注）。\n2. **定位**：在 162 篇里检索，命中到唯一篇即定；命中多篇则全部列出。\n3. **判类型**：原文 / 注释（材料里分开存）。\n4. **报体量**：该篇字数与条文数。\n5. **标差异**：逐处列出异体/通假/脱文，不修正。\n\n## 输出模板\n\n```text\n【引用】…\n【定位】《素问·X》｜原文 / 注释\n【体量】… 字 / … 条\n【字词差异】…（无则写「无」）\n【无法定位项】…（无则写「无」）\n```\n\n## 质量判据\n\n- 每条都到篇级，没有「内经某篇」这种含糊写法\n- 原文与注释标注清楚\n- 差异逐处列出、未擅自统一\n\n> 本技能输出为文献核对辅助，不构成诊疗建议。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "01-zhongyi/06-neijing-xuandu/02-yinyang-yingxiang": {
    "key": "01-zhongyi/06-neijing-xuandu/02-yinyang-yingxiang",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "06-neijing-xuandu",
    "subjectTitle": "内经选读",
    "chapterSlug": "02-yinyang-yingxiang",
    "n": 2,
    "title": "第 2 章 · 《素问·阴阳应象大论》：把「阴阳」拆成四组可操作的维度",
    "motto": "「阴阳者，天地之道也，万物之纲纪，变化之父母，生杀之本始，神明之府也。治病必求于本。」——《素问·阴阳应象大论》",
    "problem": "你能背出这一句，但被问「这一篇到底把阴阳拆成了哪几组可以落到病人身上的对立」，你只会说「就是阴阳嘛」。",
    "roots": "环境逼迫(跟诊时老师说「这是阳证」，你接不出下一句依据) + 知识积累(原文精读 × 属性配对表 = 一组能指到具体症状、能回指条文的判别维度)",
    "html": "<h1 id=\"第-2-章-素问-阴阳应象大论-把-阴阳-拆成四组可操作的维度\">第 2 章 · 《素问·阴阳应象大论》：把「阴阳」拆成四组可操作的维度</h1>\n<blockquote><p><strong>MOTTO:</strong> 「阴阳者，天地之道也，万物之纲纪，变化之父母，生杀之本始，神明之府也。治病必求于本。」——《素问·阴阳应象大论》</p>\n<p><strong>PROBLEM:</strong> 你能背出这一句，但被问「这一篇到底把阴阳拆成了哪几组可以落到病人身上的对立」，你只会说「就是阴阳嘛」。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(跟诊时老师说「这是阳证」，你接不出下一句依据) + 知识积累(原文精读 × 属性配对表 = 一组能指到具体症状、能回指条文的判别维度)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>内经选读</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>02 / 10</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>指出本篇把阴阳落成的四组维度：<strong>升降出入</strong>、<strong>寒热</strong>、<strong>气味形气</strong>、<strong>清浊</strong></li><li>用原文说明「阳化气，阴成形」为什么是<strong>过程</strong>而不是<strong>标签</strong></li><li>把四组维度写成一张配对表，并说明每一组在四诊里对应什么信息</li><li>说清「阴阳可编码」与「阴阳可计算」之间的那道坎</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"原文-三句话定下这一篇的骨架\">原文：三句话定下这一篇的骨架</h3>\n<blockquote><p>黄帝曰：阴阳者，天地之道也，万物之纲纪，变化之父母，生杀之本始，神明之府也。治病必求于本。故积阳为天，积阴为地。阴静阳躁；阳生阴长；阳杀阴藏；阳化气，阴成形。寒极生热，热极生寒。——《素问·阴阳应象大论》</p></blockquote>\n<blockquote><p>故清阳为天，浊阴为地。地气上为云，天气下为雨；雨出地气，云出天气。故清阳出上窍，浊阴出下窍；清阳发腠理，浊阴走五脏；清阳实四肢，浊阴归六腑。——同上</p></blockquote>\n<blockquote><p>水为阴，火为阳，阳为气，阴为味。味归形，形归气，气归精，精归化。——同上</p></blockquote>\n<p>三句话各管一件事：第一句给<strong>总纲与转化规则</strong>（寒极生热、热极生寒），第二句给<strong>升降出入的通道</strong>（上窍／下窍／腠理／五脏／四肢／六腑），第三句给<strong>气味形气的代谢链</strong>。它们不是同义反复，而是三套可以分别落到问诊、望诊与用药上的坐标。</p>\n<h3 id=\"四组维度-从原文抽出来的判别面\">四组维度：从原文抽出来的判别面</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>维度</th><th>原文依据</th><th>临床落点</th></tr></thead><tbody><tr><td>升降出入</td><td>清阳出上窍，浊阴出下窍</td><td>头面诸窍 vs 二阴；呕、眩、泻、闭</td></tr><tr><td>寒热</td><td>寒极生热，热极生寒</td><td>畏寒/恶热、肢冷/烦热、舌淡/舌红</td></tr><tr><td>气味形气</td><td>阳为气，阴为味；味归形，形归气</td><td>药性配伍：气厚走表、味厚入里</td></tr><tr><td>清浊</td><td>清阳发腠理，浊阴走五脏</td><td>水液代谢：汗、尿、痰、饮</td></tr></tbody></table></div>\n<p>四组维度合起来才叫「阴阳」。只剩寒热一组，就会把「阳虚水泛」误判成单纯寒证——这是本章最想防的简化。</p>\n<h3 id=\"ai-工程-为什么它不是-0-1-标签\">AI/工程：为什么它不是 0/1 标签</h3>\n<p>把阴阳写成 <code>{yin: 0, yang: 1}</code> 会立刻丢掉三样东西：<strong>互根</strong>（无阴则阳无以化）、<strong>消长</strong>（比例随时相变）、<strong>转化</strong>（寒极生热是同一过程的两端）。可行的编码是<strong>带参照的相对偏侧</strong>：给四组维度各一个 −1..+1 的偏侧值，参照点写进记录（与谁比、何时比）。这也解释了为什么下面代码里没有 <code>isYang</code> 这样的布尔量。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">// code/main.js：四组维度的偏侧打分 + 条文归属检索\nconst AXES = [\n  { id: '升降出入', pairs: [['上窍', '下窍'], ['腠理', '五脏'], ['四肢', '六腑']] },\n  { id: '寒热', pairs: [['恶热', '畏寒'], ['舌红', '舌淡']] },\n  { id: '气味形气', pairs: [['气厚', '味厚'], ['走表', '入里']] },\n  { id: '清浊', pairs: [['汗出', '尿少'], ['痰黄', '痰清']] },\n];\nfunction scoreAxes(signs) { /* 每轴 hit/miss 计分，输出偏侧与依据，不输出&quot;阳证&quot;结论 */ }</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：给定「上窍不利、畏寒、痰清、尿少」四症，四轴分别给出偏阴/偏阳的<strong>依据行</strong>；四轴里有一轴证据不足时，代码必须输出「该轴无证据」，而不是补一个 0。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>四组维度不是原文的四条并列条款</strong>，是本章为可操作化做的归纳。原文的相关表述分散在升降、气味、清浊多处，归并本身是一次解释，必须标注。</li><li><strong>偏侧值没有单位</strong>。−1..+1 只是相对位置，不能跨病人比较，也不能求平均；把它当成&quot;阴阳量化&quot;是过度声明。</li><li><strong>参照点缺失时计算无意义</strong>。与昨日比、与常人比、与对侧比，结论会不同，所以 <code>scoreAxes</code> 强制要求 <code>ref</code> 参数。</li><li><strong>本篇不含治法</strong>。阴阳应象大论讲的是象与应，治法要看《至真要大论》的「寒者热之、热者寒之」。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 本章原文与注释引自仓库内 <code>standards/materials/neijing-quanwen/</code>（源文件 <code>黄帝内经全文.xls</code>，sha256 见 source-map）。本章的四轴编码是教学用形式化，不构成诊疗依据；任何辨证结论须由执业医师作出。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>给「升降出入」轴补一组四诊证据（如「头重」与「足冷」），说明它为什么属于升/降而非寒热。</li><li>若病人四轴给出的偏侧互相矛盾（如寒热偏阳、清浊偏阴），正确的输出是什么？改代码验证。</li><li>找出原文里「寒极生热，热极生寒」与四轴的关系：它是哪一轴的例外，还是轴与轴之间的转换规则？</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>《阴阳应象大论》被反复引用，多数引用停在第一句。真正能教人的是第二、三句：它们把「阴阳」落到了通道与代谢上。读经典最省力的读法是背名句，最费力的读法是找它把名句拆成了什么。</p>",
    "markdown": "# 第 2 章 · 《素问·阴阳应象大论》：把「阴阳」拆成四组可操作的维度\n\n> **MOTTO:** 「阴阳者，天地之道也，万物之纲纪，变化之父母，生杀之本始，神明之府也。治病必求于本。」——《素问·阴阳应象大论》\n>\n> **PROBLEM:** 你能背出这一句，但被问「这一篇到底把阴阳拆成了哪几组可以落到病人身上的对立」，你只会说「就是阴阳嘛」。\n>\n> **双根因定位:** 环境逼迫(跟诊时老师说「这是阳证」，你接不出下一句依据) + 知识积累(原文精读 × 属性配对表 = 一组能指到具体症状、能回指条文的判别维度)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 内经选读 |\n| 院系 | 中医系 |\n| 章序号 | 02 / 10 |\n| 所属阶段 | 🌿 长·积累 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 3 小时 |\n\n## 学习目标\n\n- 指出本篇把阴阳落成的四组维度：**升降出入**、**寒热**、**气味形气**、**清浊**\n- 用原文说明「阳化气，阴成形」为什么是**过程**而不是**标签**\n- 把四组维度写成一张配对表，并说明每一组在四诊里对应什么信息\n- 说清「阴阳可编码」与「阴阳可计算」之间的那道坎\n\n## 核心概念\n\n### 原文：三句话定下这一篇的骨架\n\n> 黄帝曰：阴阳者，天地之道也，万物之纲纪，变化之父母，生杀之本始，神明之府也。治病必求于本。故积阳为天，积阴为地。阴静阳躁；阳生阴长；阳杀阴藏；阳化气，阴成形。寒极生热，热极生寒。——《素问·阴阳应象大论》\n\n> 故清阳为天，浊阴为地。地气上为云，天气下为雨；雨出地气，云出天气。故清阳出上窍，浊阴出下窍；清阳发腠理，浊阴走五脏；清阳实四肢，浊阴归六腑。——同上\n\n> 水为阴，火为阳，阳为气，阴为味。味归形，形归气，气归精，精归化。——同上\n\n三句话各管一件事：第一句给**总纲与转化规则**（寒极生热、热极生寒），第二句给**升降出入的通道**（上窍／下窍／腠理／五脏／四肢／六腑），第三句给**气味形气的代谢链**。它们不是同义反复，而是三套可以分别落到问诊、望诊与用药上的坐标。\n\n### 四组维度：从原文抽出来的判别面\n\n| 维度 | 原文依据 | 临床落点 |\n|---|---|---|\n| 升降出入 | 清阳出上窍，浊阴出下窍 | 头面诸窍 vs 二阴；呕、眩、泻、闭 |\n| 寒热 | 寒极生热，热极生寒 | 畏寒/恶热、肢冷/烦热、舌淡/舌红 |\n| 气味形气 | 阳为气，阴为味；味归形，形归气 | 药性配伍：气厚走表、味厚入里 |\n| 清浊 | 清阳发腠理，浊阴走五脏 | 水液代谢：汗、尿、痰、饮 |\n\n四组维度合起来才叫「阴阳」。只剩寒热一组，就会把「阳虚水泛」误判成单纯寒证——这是本章最想防的简化。\n\n### AI/工程：为什么它不是 0/1 标签\n\n把阴阳写成 `{yin: 0, yang: 1}` 会立刻丢掉三样东西：**互根**（无阴则阳无以化）、**消长**（比例随时相变）、**转化**（寒极生热是同一过程的两端）。可行的编码是**带参照的相对偏侧**：给四组维度各一个 −1..+1 的偏侧值，参照点写进记录（与谁比、何时比）。这也解释了为什么下面代码里没有 `isYang` 这样的布尔量。\n\n## BUILD IT：从零实现\n\n```js\n// code/main.js：四组维度的偏侧打分 + 条文归属检索\nconst AXES = [\n  { id: '升降出入', pairs: [['上窍', '下窍'], ['腠理', '五脏'], ['四肢', '六腑']] },\n  { id: '寒热', pairs: [['恶热', '畏寒'], ['舌红', '舌淡']] },\n  { id: '气味形气', pairs: [['气厚', '味厚'], ['走表', '入里']] },\n  { id: '清浊', pairs: [['汗出', '尿少'], ['痰黄', '痰清']] },\n];\nfunction scoreAxes(signs) { /* 每轴 hit/miss 计分，输出偏侧与依据，不输出\"阳证\"结论 */ }\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：给定「上窍不利、畏寒、痰清、尿少」四症，四轴分别给出偏阴/偏阳的**依据行**；四轴里有一轴证据不足时，代码必须输出「该轴无证据」，而不是补一个 0。\n\n## 代价与边界\n\n- **四组维度不是原文的四条并列条款**，是本章为可操作化做的归纳。原文的相关表述分散在升降、气味、清浊多处，归并本身是一次解释，必须标注。\n- **偏侧值没有单位**。−1..+1 只是相对位置，不能跨病人比较，也不能求平均；把它当成\"阴阳量化\"是过度声明。\n- **参照点缺失时计算无意义**。与昨日比、与常人比、与对侧比，结论会不同，所以 `scoreAxes` 强制要求 `ref` 参数。\n- **本篇不含治法**。阴阳应象大论讲的是象与应，治法要看《至真要大论》的「寒者热之、热者寒之」。\n\n> **免责声明：** 本章原文与注释引自仓库内 `standards/materials/neijing-quanwen/`（源文件 `黄帝内经全文.xls`，sha256 见 source-map）。本章的四轴编码是教学用形式化，不构成诊疗依据；任何辨证结论须由执业医师作出。\n\n## 练习\n\n1. 给「升降出入」轴补一组四诊证据（如「头重」与「足冷」），说明它为什么属于升/降而非寒热。\n2. 若病人四轴给出的偏侧互相矛盾（如寒热偏阳、清浊偏阴），正确的输出是什么？改代码验证。\n3. 找出原文里「寒极生热，热极生寒」与四轴的关系：它是哪一轴的例外，还是轴与轴之间的转换规则？\n\n## 进阶思考\n\n《阴阳应象大论》被反复引用，多数引用停在第一句。真正能教人的是第二、三句：它们把「阴阳」落到了通道与代谢上。读经典最省力的读法是背名句，最费力的读法是找它把名句拆成了什么。\n",
    "code": {
      "main.js": "'use strict';\n/**\n * 《素问·阴阳应象大论》四轴偏侧打分\n *\n *   node code/main.js\n *\n * 为什么不是 isYang 布尔量：阴阳有互根、消长、转化三层关系，压成 0/1 会把\n * 「寒极生热」这种**同一过程的两端**判成互相矛盾。所以这里输出的是\n * 每轴一个 −1..+1 的偏侧值 + 命中的证据行 + 参照点，而不是证型。\n */\n\nconst A_UP = '升'; // 便于阅读：轴内正方向\n\nconst AXES = [\n  {\n    id: '升降出入',\n    pairs: [['上窍', '下窍'], ['腠理', '五脏'], ['四肢', '六腑']],\n  },\n  {\n    id: '寒热',\n    pairs: [['恶热', '畏寒'], ['舌红', '舌淡']],\n  },\n  {\n    id: '气味形气',\n    pairs: [['气厚', '味厚'], ['走表', '入里']],\n  },\n  {\n    id: '清浊',\n    pairs: [['汗出', '尿少'], ['痰黄', '痰清']],\n  },\n];\n\n/**\n * @param {string[]} signs 病人出现的症状（必须逐字取自四诊记录）\n * @param {string} ref    参照点（如「与平素比」「与对侧比」）；缺失即拒绝计算\n */\nfunction scoreAxes(signs, ref) {\n  if (!ref || !String(ref).trim()) {\n    throw new Error('缺参照点 ref：阴阳偏侧是相对量，没有参照就没有意义');\n  }\n  return AXES.map((axis) => {\n    let plus = 0;\n    let minus = 0;\n    const hit = [];\n    for (const [p, m] of axis.pairs) {\n      if (signs.includes(p)) { plus += 1; hit.push(`+${p}`); }\n      if (signs.includes(m)) { minus += 1; hit.push(`-${m}`); }\n    }\n    const total = plus + minus;\n    return {\n      id: axis.id,\n      // 无证据时给 null，而不是 0 —— 0 会被读成「正好平衡」\n      side: total === 0 ? null : +((plus - minus) / total).toFixed(2),\n      evidence: hit,\n      ref,\n    };\n  });\n}\n\nconst CASES = [\n  { name: 'A：上窍不利 + 畏寒 + 痰清 + 尿少', signs: ['上窍', '畏寒', '痰清', '尿少'], ref: '与平素比' },\n  { name: 'B：只有一条证据（应出现无证据轴）', signs: ['舌红'], ref: '与平素比' },\n];\n\nfunction main() {\n  for (const c of CASES) {\n    console.log(`\\n${c.name}（参照：${c.ref}）`);\n    for (const r of scoreAxes(c.signs, c.ref)) {\n      console.log(\n        `  ${r.id.padEnd(5, '　')} ${r.side === null ? '无证据' : (r.side > 0 ? '偏阳/升 ' : r.side < 0 ? '偏阴/降 ' : '平衡 ') + r.side}`\n        + (r.evidence.length ? `（${r.evidence.join(' ')}）` : ''),\n      );\n    }\n  }\n  console.log('\\n提醒：偏侧值是相对量，不跨病人比较；本输出不构成证型结论。');\n  console.log('本输出为教学样例，不构成诊疗建议。');\n}\n\nif (require.main === module) main();\nmodule.exports = { AXES, scoreAxes };\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { AXES, scoreAxes } = require('./main.js');\n\ntest('四轴齐备，且每轴至少两组配对（少一轴就等于换了一套阴阳）', () => {\n  assert.strictEqual(AXES.length, 4);\n  for (const a of AXES) assert.ok(a.pairs.length >= 2, `${a.id} 配对不足`);\n});\n\ntest('无参照点必须抛错，不许默认「与常人比」', () => {\n  assert.throws(() => scoreAxes(['舌红'], ''), /缺参照点/);\n});\n\ntest('单一证据时，其余轴为 null 而不是 0', () => {\n  const r = scoreAxes(['舌红'], '与平素比');\n  const cold = r.find((x) => x.id === '寒热');\n  assert.ok(cold.side > 0); // 舌红 = 阳侧\n  assert.strictEqual(r.find((x) => x.id === '升降出入').side, null);\n});\n\ntest('同一轴内正负证据相抵 = 平衡，而不是无证据', () => {\n  const r = scoreAxes(['恶热', '畏寒'], '与平素比');\n  const cold = r.find((x) => x.id === '寒热');\n  assert.strictEqual(cold.side, 0);\n  assert.deepStrictEqual(cold.evidence, ['+恶热', '-畏寒']);\n});\n\ntest('偏侧值落在 −1..1，且等于（正−负）/总数', () => {\n  const r = scoreAxes(['上窍', '腠理', '四肢'], '与对侧比');\n  const up = r.find((x) => x.id === '升降出入');\n  assert.strictEqual(up.side, 1);\n  for (const x of r) if (x.side !== null) assert.ok(x.side >= -1 && x.side <= 1);\n});\n\ntest('证据行保留符号，便于回指原文正负方向', () => {\n  const r = scoreAxes(['痰黄'], '与昨日比');\n  assert.deepStrictEqual(r.find((x) => x.id === '清浊').evidence, ['+痰黄']);\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "《素问·阴阳应象大论》开篇把阴阳称作「万物之纲纪」，紧接着的一句是？",
          "options": [
            "「阴阳者，数之可十，推之可百」",
            "「变化之父母，生杀之本始，神明之府也」",
            "「阴平阳秘，精神乃治」",
            "「阳生阴长，阳杀阴藏」"
          ],
          "correct": 1,
          "explanation": "原文为「阴阳者，天地之道也，万物之纲纪，变化之父母，生杀之本始，神明之府也」。"
        },
        {
          "stage": "check",
          "question": "本篇中「清阳出上窍，浊阴出下窍」主要落在哪一组维度上？",
          "options": [
            "寒热",
            "升降出入",
            "气味形气",
            "清浊"
          ],
          "correct": 1,
          "explanation": "这句讲的是清浊之气的走向（上窍／下窍／腠理／五脏／四肢／六腑），是升降出入的通道。"
        },
        {
          "stage": "check",
          "question": "「阳化气，阴成形」最准确的读法是？",
          "options": [
            "阳是气态物质，阴是固态物质",
            "描述同一过程的两种趋向：化气与成形，不是两种物体的标签",
            "阳证病人会变成气体",
            "阴证一定形成肿块"
          ],
          "correct": 1,
          "explanation": "这句讲过程而非实体；把它读成物质分类，就会把阴阳当成静态标签。"
        },
        {
          "stage": "check",
          "question": "为什么代码里没有 isYang 这样的布尔量？",
          "options": [
            "因为布尔量运算太慢",
            "因为阴阳有互根、消长、转化三层关系，压成 0/1 会丢掉相对性",
            "因为 JavaScript 没有布尔类型",
            "因为原文没有提到阴阳"
          ],
          "correct": 1,
          "explanation": "偏侧值是相对量：与谁比、何时比都要记下来，否则「阴阳」变成了标签。"
        },
        {
          "stage": "post",
          "question": "四轴里某一轴没有证据时，正确输出是？",
          "options": [
            "补 0，表示平衡",
            "输出「无证据」，并把该轴的追问项列出来",
            "用其他轴的结论推断这一轴",
            "删掉这一轴"
          ],
          "correct": 1,
          "explanation": "0 会被读成「正好平衡」，那是对缺失数据的伪造。"
        },
        {
          "stage": "post",
          "question": "本章的四轴划分，与原文的关系是？",
          "options": [
            "原文明确列出的四条条款",
            "本章为可操作化做的归纳，必须标注为解释而非原文",
            "后人杜撰，与原文无关",
            "与原文完全等价，可直接引用为原文"
          ],
          "correct": 1,
          "explanation": "原文相关表述分散在升降、气味、清浊多处，归并本身是一次解释。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-yinyang-yingxiang.md",
        "kind": "prompt",
        "file": "departments/01-zhongyi/06-neijing-xuandu/chapters/02-yinyang-yingxiang/outputs/prompt-yinyang-yingxiang.md",
        "title": "经文四轴标注器",
        "description": null,
        "chars": 718,
        "body": "# 经文四轴标注器\n\n## 用途\n\n把一段门诊四诊记录，按《素问·阴阳应象大论》的四组维度（升降出入 / 寒热 / 气味形气 / 清浊）标注成\n「每轴的偏侧 + 命中证据 + 参照点」，用于**跟诊记录结构化、病例讨论、经典与临床对读**。\n不输出证型，不下诊断。\n\n## 提示词\n\n```text\n你是内经课的助教。下面是一段四诊记录。请只做一件事：按四组维度标注，不做辨证。\n\n四组维度（来自《素问·阴阳应象大论》，归并方式须在输出里注明）：\n1. 升降出入：清阳出上窍／浊阴出下窍；清阳发腠理／浊阴走五脏；清阳实四肢／浊阴归六腑\n2. 寒热：寒极生热，热极生寒\n3. 气味形气：阳为气，阴为味；味归形，形归气\n4. 清浊：清阳／浊阴在水液代谢上的表现\n\n规则：\n1. 症状必须逐字取自原文，并在括号里标出是第几句。\n2. 每轴输出：偏侧（偏阳/偏阴/平衡/无证据）+ 证据行 + 该轴的追问项。\n3. 没有证据的轴写「无证据」，禁止补 0 或用别的轴推断。\n4. 必须写明参照点（与平素比／与对侧比／与昨日比）。\n5. 禁止输出证型、治法、方药。\n\n输出格式：\n【参照点】…\n【四轴】1) 升降出入：… 依据：… 追问：…  2) …\n【不可判定的】…\n```\n\n## 使用示例\n\n输入：「近三日上窍不利，畏寒，痰清稀，尿少。平素不畏寒。」\n\n输出：【参照点】与平素比\n【四轴】1) 升降出入：偏降（上窍不利，第1句）追问：有无下窍症状；2) 寒热：偏阴（畏寒，与平素对比）追问：舌象；\n3) 气味形气：无证据 追问：饮食偏好、有无口淡；4) 清浊：偏阴（痰清、尿少）追问：汗出与饮水。\n\n## 为什么这样限制\n\n- 禁用布尔：阴阳是相对量，缺参照的「阳证」没有信息量。\n- 无证据不许补 0：缺失与平衡在临床上完全不同。\n- 禁止输出证型：四轴只给方位，证型还要合病位与病性，越过这一步就是替医生下结论。\n"
      },
      {
        "name": "skill-yinyang-yingxiang.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/06-neijing-xuandu/chapters/02-yinyang-yingxiang/outputs/skill-yinyang-yingxiang.md",
        "title": "yinyang-yingxiang",
        "description": "按《素问·阴阳应象大论》四轴标注四诊记录：给偏侧、依据与追问，不输出证型",
        "chars": 532,
        "body": "---\nname: yinyang-yingxiang\ndescription: 按《素问·阴阳应象大论》四轴标注四诊记录：给偏侧、依据与追问，不输出证型\nversion: 0.1.0\n---\n\n# yinyang-yingxiang\n\n## 何时使用\n\n- 跟诊记录需要把「阴阳」落到具体症状与条文上\n- 经典与临床对读：讨论某句原文在病人身上落在哪一轴\n- 教学：演示「阴阳不是标签」这件事\n\n## 不适用\n\n- 需要下证型结论（四轴只给方位）\n- 四诊信息不全、且无法标注参照点时（先补问诊）\n- 急危重症判断（走临床路径）\n\n## 步骤\n\n1. **定参照点**：与平素比／与对侧比／与昨日比，写进记录。\n2. **逐句摘症**：症状原文照录，标句号。\n3. **four 轴标注**：升降出入 / 寒热 / 气味形气 / 清浊，每轴给偏侧 + 依据。\n4. **留白**：无证据的轴写「无证据」并给追问项。\n5. **交人判断**：注明四轴归并是本章的解释，不是原文条款。\n\n## 输出模板\n\n```text\n【参照点】…\n【轴 1 升降出入】偏…；依据：…；追问：…\n【轴 2 寒热】…\n【轴 3 气味形气】…\n【轴 4 清浊】…\n【不可判定】…\n```\n\n## 质量判据\n\n- 每条依据能指回原文句号\n- 无证据轴没有被补 0 或用别的轴推断\n- 输出里没有证型、治法、方药\n\n> 本技能输出为教学与记录辅助，不构成诊疗建议。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "01-zhongyi/06-neijing-xuandu/03-zangxiang-xitong": {
    "key": "01-zhongyi/06-neijing-xuandu/03-zangxiang-xitong",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "06-neijing-xuandu",
    "subjectTitle": "内经选读",
    "chapterSlug": "03-zangxiang-xitong",
    "n": 3,
    "title": "第 3 章 · 藏象与五脏的系统观：五个「本」里藏着四种不规则",
    "motto": "「心者，生之本，神之变也，其华在面，其充在血脉，为阳中之太阳，通于夏气。」——《素问·六节藏象论》",
    "problem": "你会背「心其华在面、其充在血脉」，但让你把五脏的这套说法排成一张统一的表，你会发现脾那一句根本套不进同样的格式——而教材把它们并列着写。",
    "roots": "环境逼迫(写病机分析时把「其华在面」当公式套到每个脏) + 知识积累(原文逐句解析 × 不规则项标注 = 一张诚实到能看出例外的五脏结构表)",
    "html": "<h1 id=\"第-3-章-藏象与五脏的系统观-五个-本-里藏着四种不规则\">第 3 章 · 藏象与五脏的系统观：五个「本」里藏着四种不规则</h1>\n<blockquote><p><strong>MOTTO:</strong> 「心者，生之本，神之变也，其华在面，其充在血脉，为阳中之太阳，通于夏气。」——《素问·六节藏象论》</p>\n<p><strong>PROBLEM:</strong> 你会背「心其华在面、其充在血脉」，但让你把五脏的这套说法排成一张统一的表，你会发现脾那一句根本套不进同样的格式——而教材把它们并列着写。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(写病机分析时把「其华在面」当公式套到每个脏) + 知识积累(原文逐句解析 × 不规则项标注 = 一张诚实到能看出例外的五脏结构表)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>内经选读</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>03 / 10</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>从《素问·六节藏象论》原文抽出五脏的「本 / 华 / 充 / 阴阳位 / 通于何气」五元组</li><li>指出脾那一句的结构例外（六者合称、无「阳中之」、以「至阴之类」代之）</li><li>说清校勘夹注（如「阳中之太（《太素》作少）阴」）为什么会污染解析，以及先剥后用的规则</li><li>写一个解析器：五句原文 → 结构表 + 不规则项清单</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"原文五句-据仓库内-neijing-quanwen-原件\">原文五句（据仓库内 <code>neijing-quanwen</code> 原件）</h3>\n<blockquote><p>心者，生之本，神之变也，其华在面，其充在血脉，为阳中之太阳，通于夏气。</p>\n<p>肺者，气之本，魄之处也，其华在毛，其充在皮，为阳中之太（《太素》作少）阴，通于秋气。</p>\n<p>肾者，主蛰，封藏之本，精之处也，其华在发，其充在骨，为阴中之少（《太素》作太）阴，通于冬气。</p>\n<p>肝者，罢极之本，魂之居也，其华在爪，其充在筋，以生血气，其味酸，其色苍，此为阳中之少阳，通于春气。</p>\n<p>脾胃大肠小肠三焦膀胱者，仓廪之本，营之居也，名曰器……其华在唇四白，其充在肌，其味甘，其色黄，此至阴之类，通于土气。</p></blockquote>\n<h3 id=\"四条规则与一处例外\">四条规则与一处例外</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>脏</th><th>本</th><th>华</th><th>充</th><th>阴阳位</th><th>通于</th></tr></thead><tbody><tr><td>心</td><td>生之本</td><td>面</td><td>血脉</td><td>阳中之太阳</td><td>夏气</td></tr><tr><td>肺</td><td>气之本</td><td>毛</td><td>皮</td><td>阳中之太（少）阴</td><td>秋气</td></tr><tr><td>肾</td><td>封藏之本</td><td>发</td><td>骨</td><td>阴中之少（太）阴</td><td>冬气</td></tr><tr><td>肝</td><td>罢极之本</td><td>爪</td><td>筋</td><td>阳中之少阳</td><td>春气</td></tr><tr><td>脾（六者合称）</td><td>仓廪之本</td><td>唇四白</td><td>肌</td><td><strong>至阴之类</strong></td><td>土气</td></tr></tbody></table></div>\n<p>三条不规则值得单独说：<strong>其一</strong>，脾不是「脾者」而是「脾胃大肠小肠三焦膀胱者」——一句管六个器官；<strong>其二</strong>，脾没有「阳中之 X」，用的是「至阴之类」；<strong>其三</strong>，肝句多了「其味酸，其色苍」，心肾肺都没有。教材把它们排成整齐的五行表，原文并不整齐。</p>\n<h3 id=\"夹注污染-解析前必须剥\">夹注污染：解析前必须剥</h3>\n<p>肺句原文是「为阳中之太（《太素》作少）阴」，肾句是「为阴中之少（《太素》作太）阴」。这两处方括号里的校勘夹注是<strong>别人写的</strong>，不是经文。若不先剥掉：</p>\n<ul><li>你会把「太阴」与「少阴」两个版本混成一个字段；</li><li>「阳中之太阴」这个组合在《太素》里根本不存在（那边是「少阴」）。</li></ul>\n<p>《内经语义域》把「校勘夹注先行清洗」列为抽取三原则之一，原因就在这里：<strong>夹注不是正文，混进去就是替作者改字。</strong></p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">// code/main.js：从材料 md 里解析五脏五元组，剥夹注并记录被剥内容\nfunction stripGloss(text) { /* 去掉「（《太素》作…）」「（别本作…）」等夹注，返回 {clean, glosses} */ }\nfunction parseFive() { /* 正则抽 心/肺/肾/肝/脾 五句 → {zang, ben, hua, chong, position, qi, irregular} */ }</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：<code>parseFive()</code> 返回 5 条记录；肺脏的 <code>glosses</code> 含「《太素》作少」，<code>position</code> 为清洗后的「阳中之太阴」；脾记录被标 <code>irregular: true</code> 且 <code>zang</code> 为「脾胃大肠小肠三焦膀胱」。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>五元组是后人归纳的格式</strong>。原文只对四脏用同一句式；把它套到脾上是本章做的事，必须标注为整理而非原文。</li><li><strong>「其华」「其充」是关联陈述，不是因果</strong>。面华不等于心病必见面色变化，反向推断尤其危险。</li><li><strong>本章只取一篇</strong>。《六节藏象论》《五脏生成》《玉机真脏论》各有侧重，单篇不能代表藏象学说全貌。</li><li><strong>夹注剥离有风险</strong>。括号里的内容有时是异文、有时是注家的解释，一律剥掉会丢失版本信息；本章把它们另存 <code>glosses</code>，不丢。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 原文与夹注引自仓库内 <code>standards/materials/neijing-quanwen/</code>（源 <code>黄帝内经全文.xls</code>，可复核）；本章的结构表是教学整理，不构成诊断依据。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>补上「其味」「其色」两列，观察哪几脏缺这两个字段，讨论「缺」是原文如此还是整理遗漏。</li><li>若允许把「脾胃大肠小肠三焦膀胱」拆成六条记录，五元组表会变成什么样？这样做丢了什么？</li><li>找出另外两处带夹注的藏象条文，说明剥离前后语义差异。</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>藏象学说最容易被教成一张整齐的表，而原文的整齐度只有四分之三。看见那四分之一的不整齐，才算读到了原文，而不是读到了教材。</p>",
    "markdown": "# 第 3 章 · 藏象与五脏的系统观：五个「本」里藏着四种不规则\n\n> **MOTTO:** 「心者，生之本，神之变也，其华在面，其充在血脉，为阳中之太阳，通于夏气。」——《素问·六节藏象论》\n>\n> **PROBLEM:** 你会背「心其华在面、其充在血脉」，但让你把五脏的这套说法排成一张统一的表，你会发现脾那一句根本套不进同样的格式——而教材把它们并列着写。\n>\n> **双根因定位:** 环境逼迫(写病机分析时把「其华在面」当公式套到每个脏) + 知识积累(原文逐句解析 × 不规则项标注 = 一张诚实到能看出例外的五脏结构表)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 内经选读 |\n| 院系 | 中医系 |\n| 章序号 | 03 / 10 |\n| 所属阶段 | 🌿 长·积累 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 3 小时 |\n\n## 学习目标\n\n- 从《素问·六节藏象论》原文抽出五脏的「本 / 华 / 充 / 阴阳位 / 通于何气」五元组\n- 指出脾那一句的结构例外（六者合称、无「阳中之」、以「至阴之类」代之）\n- 说清校勘夹注（如「阳中之太（《太素》作少）阴」）为什么会污染解析，以及先剥后用的规则\n- 写一个解析器：五句原文 → 结构表 + 不规则项清单\n\n## 核心概念\n\n### 原文五句（据仓库内 `neijing-quanwen` 原件）\n\n> 心者，生之本，神之变也，其华在面，其充在血脉，为阳中之太阳，通于夏气。\n>\n> 肺者，气之本，魄之处也，其华在毛，其充在皮，为阳中之太（《太素》作少）阴，通于秋气。\n>\n> 肾者，主蛰，封藏之本，精之处也，其华在发，其充在骨，为阴中之少（《太素》作太）阴，通于冬气。\n>\n> 肝者，罢极之本，魂之居也，其华在爪，其充在筋，以生血气，其味酸，其色苍，此为阳中之少阳，通于春气。\n>\n> 脾胃大肠小肠三焦膀胱者，仓廪之本，营之居也，名曰器……其华在唇四白，其充在肌，其味甘，其色黄，此至阴之类，通于土气。\n\n### 四条规则与一处例外\n\n| 脏 | 本 | 华 | 充 | 阴阳位 | 通于 |\n|---|---|---|---|---|---|\n| 心 | 生之本 | 面 | 血脉 | 阳中之太阳 | 夏气 |\n| 肺 | 气之本 | 毛 | 皮 | 阳中之太（少）阴 | 秋气 |\n| 肾 | 封藏之本 | 发 | 骨 | 阴中之少（太）阴 | 冬气 |\n| 肝 | 罢极之本 | 爪 | 筋 | 阳中之少阳 | 春气 |\n| 脾（六者合称） | 仓廪之本 | 唇四白 | 肌 | **至阴之类** | 土气 |\n\n三条不规则值得单独说：**其一**，脾不是「脾者」而是「脾胃大肠小肠三焦膀胱者」——一句管六个器官；**其二**，脾没有「阳中之 X」，用的是「至阴之类」；**其三**，肝句多了「其味酸，其色苍」，心肾肺都没有。教材把它们排成整齐的五行表，原文并不整齐。\n\n### 夹注污染：解析前必须剥\n\n肺句原文是「为阳中之太（《太素》作少）阴」，肾句是「为阴中之少（《太素》作太）阴」。这两处方括号里的校勘夹注是**别人写的**，不是经文。若不先剥掉：\n\n- 你会把「太阴」与「少阴」两个版本混成一个字段；\n- 「阳中之太阴」这个组合在《太素》里根本不存在（那边是「少阴」）。\n\n《内经语义域》把「校勘夹注先行清洗」列为抽取三原则之一，原因就在这里：**夹注不是正文，混进去就是替作者改字。**\n\n## BUILD IT：从零实现\n\n```js\n// code/main.js：从材料 md 里解析五脏五元组，剥夹注并记录被剥内容\nfunction stripGloss(text) { /* 去掉「（《太素》作…）」「（别本作…）」等夹注，返回 {clean, glosses} */ }\nfunction parseFive() { /* 正则抽 心/肺/肾/肝/脾 五句 → {zang, ben, hua, chong, position, qi, irregular} */ }\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：`parseFive()` 返回 5 条记录；肺脏的 `glosses` 含「《太素》作少」，`position` 为清洗后的「阳中之太阴」；脾记录被标 `irregular: true` 且 `zang` 为「脾胃大肠小肠三焦膀胱」。\n\n## 代价与边界\n\n- **五元组是后人归纳的格式**。原文只对四脏用同一句式；把它套到脾上是本章做的事，必须标注为整理而非原文。\n- **「其华」「其充」是关联陈述，不是因果**。面华不等于心病必见面色变化，反向推断尤其危险。\n- **本章只取一篇**。《六节藏象论》《五脏生成》《玉机真脏论》各有侧重，单篇不能代表藏象学说全貌。\n- **夹注剥离有风险**。括号里的内容有时是异文、有时是注家的解释，一律剥掉会丢失版本信息；本章把它们另存 `glosses`，不丢。\n\n> **免责声明：** 原文与夹注引自仓库内 `standards/materials/neijing-quanwen/`（源 `黄帝内经全文.xls`，可复核）；本章的结构表是教学整理，不构成诊断依据。\n\n## 练习\n\n1. 补上「其味」「其色」两列，观察哪几脏缺这两个字段，讨论「缺」是原文如此还是整理遗漏。\n2. 若允许把「脾胃大肠小肠三焦膀胱」拆成六条记录，五元组表会变成什么样？这样做丢了什么？\n3. 找出另外两处带夹注的藏象条文，说明剥离前后语义差异。\n\n## 进阶思考\n\n藏象学说最容易被教成一张整齐的表，而原文的整齐度只有四分之三。看见那四分之一的不整齐，才算读到了原文，而不是读到了教材。\n",
    "code": {
      "main.js": "'use strict';\r\n/**\r\n * 藏象五元组解析：《素问·六节藏象论》五脏句 → {本,华,充,阴阳位,通于} + 不规则项\r\n *\r\n *   node code/main.js\r\n *\r\n * 两条规则（本章的教学点）：\r\n *   1. 校勘夹注先行清洗：「为阳中之太（《太素》作少）阴」里的括号是别人写的，\r\n *      不剥就会把「太阴」「少阴」两个版本混成一个字段。剥下来的内容存 glosses，不丢。\r\n *   2. 不规则要标注，不要硬套：脾句是「脾胃大肠小肠三焦膀胱者…」六者合称，\r\n *      且用「至阴之类」而非「阳中之X」——套进五元组的整齐表格等于替原文改字。\r\n */\r\n\r\nconst path = require('node:path');\r\nconst fs = require('node:fs');\r\n\r\nconst ROOT = path.resolve(__dirname, '../../../../../..');\r\nconst MD = path.join(ROOT, 'standards/materials/neijing-quanwen/黄帝内经全文（素问81篇 · 灵枢81篇）.md');\r\n\r\n/** 剥夹注：全角括号内含「《…》作」「别本作」「一作」等校勘语 */\r\nfunction stripGloss(text) {\r\n  const glosses = [];\r\n  const clean = String(text).replace(/（([^）]*)）/g, (m, inner) => {\r\n    if (/《[^》]+》|别本|一作|或作|当作/.test(inner)) {\r\n      glosses.push(inner.trim());\r\n      return '';\r\n    }\r\n    return m;\r\n  });\r\n  return { clean, glosses };\r\n}\r\n\r\nfunction loadText() {\r\n  return fs.readFileSync(MD, 'utf8').replace(/\\s+/g, '');\r\n}\r\n\r\nconst SPEC = [\r\n  { zang: '心', re: /心者，生之本[^。]*。/ },\r\n  { zang: '肺', re: /肺者，气之本[^。]*。/ },\r\n  { zang: '肾', re: /肾者，主蛰[^。]*。/ },\r\n  { zang: '肝', re: /肝者，罢极之本[^。]*。/ },\r\n  { zang: '脾胃大肠小肠三焦膀胱', re: /仓廪之本[^。]*通于土气。/ },\r\n];\r\n\r\nfunction field(clean, re) {\r\n  const m = clean.match(re);\r\n  return m ? m[1] : null;\r\n}\r\n\r\n/** 解析五脏：返回记录数组（含 irregular 与 glosses） */\r\nfunction parseFive(text = loadText()) {\r\n  const out = [];\r\n  for (const s of SPEC) {\r\n    const m = text.match(s.re);\r\n    if (!m) { out.push({ zang: s.zang, error: '原文未匹配' }); continue; }\r\n    const { clean, glosses } = stripGloss(m[0]);\r\n    const position = field(clean, /((?:阳中之|阴中之|至阴)[^，。]*)/);\r\n    out.push({\r\n      zang: s.zang,\r\n      ben: field(clean, /([^，。]*之本)/),\r\n      hua: field(clean, /其华在([^，。]*)/),\r\n      chong: field(clean, /其充在([^，。]*)/),\r\n      position: position || null,\r\n      qi: field(clean, /通于([^，。]*气)/),\r\n      glosses,\r\n      irregular: s.zang.length > 1 || !/(阳中之|阴中之)/.test(position || ''),\r\n    });\r\n  }\r\n  return out;\r\n}\r\n\r\nfunction main() {\r\n  const rows = parseFive();\r\n  console.log('脏｜本｜华｜充｜阴阳位｜通于｜不规则');\r\n  for (const r of rows) {\r\n    if (r.error) { console.log(`  ${r.zang}｜${r.error}`); continue; }\r\n    console.log(`  ${r.zang}｜${r.ben}｜${r.hua}｜${r.chong}｜${r.position}｜${r.qi}｜${r.irregular ? '是' : '否'}`);\r\n    if (r.glosses.length) console.log(`     └ 剥出的夹注：${r.glosses.join(' / ')}`);\r\n  }\r\n  console.log(`\\n不规则项 ${rows.filter((r) => r.irregular).length} 条 —— 原文不是一张整齐的表。`);\r\n  console.log('本输出为教学样例，不构成诊断依据。');\r\n}\r\n\r\nif (require.main === module) main();\r\nmodule.exports = { stripGloss, parseFive, loadText, MD };\r\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { stripGloss, parseFive } = require('./main.js');\n\ntest('剥夹注：校勘语进 glosses，正文不被改名', () => {\n  const r = stripGloss('为阳中之太（《太素》作少）阴');\n  assert.strictEqual(r.clean, '为阳中之太阴');\n  assert.deepStrictEqual(r.glosses, ['《太素》作少']);\n});\n\ntest('普通括号（非校勘）保留原文，不当夹注剥', () => {\n  const r = stripGloss('其华在面（即额部）');\n  assert.strictEqual(r.clean, '其华在面（即额部）');\n  assert.deepStrictEqual(r.glosses, []);\n});\n\ntest('五条记录齐全，字段名固定', () => {\n  const rows = parseFive();\n  assert.strictEqual(rows.length, 5);\n  for (const r of rows) {\n    assert.ok('zang' in r && 'ben' in r && 'hua' in r && 'chong' in r && 'position' in r && 'qi' in r);\n  }\n});\n\ntest('肺句清洗后为「阳中之太阴」，并保留被剥的夹注', () => {\n  const lung = parseFive().find((r) => r.zang === '肺');\n  assert.strictEqual(lung.position, '阳中之太阴');\n  assert.ok(lung.glosses.some((g) => g.includes('《太素》作少')));\n});\n\ntest('脾是唯一不规则项：六者合称 + 至阴之类', () => {\n  const rows = parseFive();\n  const irr = rows.filter((r) => r.irregular);\n  assert.strictEqual(irr.length, 1);\n  assert.strictEqual(irr[0].zang, '脾胃大肠小肠三焦膀胱');\n  assert.match(irr[0].position, /至阴/);\n});\n\ntest('四脏的「通于」都落到四季之气', () => {\n  const rows = parseFive().filter((r) => !r.irregular);\n  assert.deepStrictEqual(rows.map((r) => r.qi), ['夏气', '秋气', '冬气', '春气']);\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "《素问·六节藏象论》里「心者，生之本」的下一句是？",
          "options": [
            "其华在面，其充在血脉",
            "神之变也，其华在面，其充在血脉",
            "通于夏气",
            "君主之官也"
          ],
          "correct": 1,
          "explanation": "原文为「心者，生之本，神之变也，其华在面，其充在血脉，为阳中之太阳，通于夏气」。"
        },
        {
          "stage": "check",
          "question": "五脏句中，结构最不规则的是哪一脏？",
          "options": [
            "心",
            "肺",
            "肝",
            "脾（六者合称那句）"
          ],
          "correct": 3,
          "explanation": "脾句是「脾胃大肠小肠三焦膀胱者」，六者合称，且用「至阴之类」而非「阳中之X」。"
        },
        {
          "stage": "check",
          "question": "「为阳中之太（《太素》作少）阴」中的括号内容是什么？",
          "options": [
            "经文原文的一部分",
            "校勘夹注（异文），不是经文",
            "后人的临床按语",
            "标点符号"
          ],
          "correct": 1,
          "explanation": "夹注是别人写的异文记录；不剥会把两个版本混成一个字段。"
        },
        {
          "stage": "check",
          "question": "为什么解析前要先剥夹注？",
          "options": [
            "为了让文本更短",
            "否则「阳中之太阴」与《太素》的「阳中之少阴」会被混成一个字段",
            "因为夹注都是错的",
            "因为正则不支持括号"
          ],
          "correct": 1,
          "explanation": "剥离不是丢弃：本章把剥下来的内容另存 glosses。"
        },
        {
          "stage": "post",
          "question": "把五脏排成整齐的五元组表，最需要标注的是？",
          "options": [
            "表格的字体",
            "这是后人归纳的格式，原文只有四脏用同一句式",
            "数据来源不可靠",
            "五脏没有五行对应"
          ],
          "correct": 1,
          "explanation": "套格式是整理行为；不标注就等于替原文改字。"
        },
        {
          "stage": "post",
          "question": "「其华在面」的正确用法是？",
          "options": [
            "心病必然面色改变",
            "关联陈述：脏与体表有对应，但不是单向因果，尤其不能反推",
            "面色变化一定是心病",
            "只是修辞"
          ],
          "correct": 1,
          "explanation": "藏象是关联系统，反推最危险。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-zangxiang-xitong.md",
        "kind": "prompt",
        "file": "departments/01-zhongyi/06-neijing-xuandu/chapters/03-zangxiang-xitong/outputs/prompt-zangxiang-xitong.md",
        "title": "藏象五元组抽取助手",
        "description": null,
        "chars": 637,
        "body": "# 藏象五元组抽取助手\n\n## 用途\n\n把一段藏象原文（如《素问·六节藏象论》五脏句）抽成「本 / 华 / 充 / 阴阳位 / 通于何气」五元组，\n并把**不规则项**与**校勘夹注**单独标出。用于**条文结构化、教材对照、知识库建表**。\n\n## 提示词\n\n```text\n你是内经文献的结构化助手。下面是一段藏象原文。请只做抽取，不做解释。\n\n规则：\n1. 先剥校勘夹注：凡「（《某书》作…）」「（别本作…）」「（一作…）」都是夹注，剥出后单独列出，不许丢。\n2. 逐脏抽五元组：本 / 华 / 充 / 阴阳位 / 通于何气。原文没有的字段写 null，不许补。\n3. 句式不规则的必须标注 irregular 并说明原因（例如「六者合称」「用『至阴之类』而非『阳中之X』」）。\n4. 抽不出唯一对应时，列全部候选并注明「需人工判定」。\n5. 禁止把「其华在面」写成因果（如「心病则面赤」）。\n\n输出格式：\n【抽取】脏｜本｜华｜充｜阴阳位｜通于｜不规则\n【夹注】…\n【无法判定】…\n【边界】五元组是后人归纳的格式，原文句式并不统一。\n```\n\n## 使用示例\n\n输入：「肺者，气之本，魄之处也，其华在毛，其充在皮，为阳中之太（《太素》作少）阴，通于秋气。」\n\n输出：【抽取】肺｜气之本｜毛｜皮｜阳中之太阴｜秋气｜否\n【夹注】《太素》作少（影响「太阴/少阴」判定，须保留）\n【边界】若按《太素》，阴阳位应作「阳中之少阴」。\n\n## 为什么这样限制\n\n- 夹注单列：它是版本证据，丢掉就再也找不回来。\n- 不规则必须标：整齐的表会把「六者合称」抹成一个「脾」。\n- 禁写因果：藏象讲关联，反推是最常见的过度解释。\n"
      },
      {
        "name": "skill-zangxiang-xitong.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/06-neijing-xuandu/chapters/03-zangxiang-xitong/outputs/skill-zangxiang-xitong.md",
        "title": "zangxiang-xitong",
        "description": "抽藏象五元组（本/华/充/阴阳位/通于），剥离校勘夹注并标注不规则句式",
        "chars": 514,
        "body": "---\nname: zangxiang-xitong\ndescription: 抽藏象五元组（本/华/充/阴阳位/通于），剥离校勘夹注并标注不规则句式\nversion: 0.1.0\n---\n\n# zangxiang-xitong\n\n## 何时使用\n\n- 把藏象条文建成结构化表（教材对照、知识库）\n- 校核某脏的「其华」「其充」是否为原文所有\n- 发现两个版本（如《太素》）用字不同，需要保留证据\n\n## 不适用\n\n- 临床辨证（藏象讲关联，不构成诊断）\n- 需要跨篇整合的藏象学说综述（本章只取一篇）\n- 原文句式残缺、无法判定字段时（应标「无法判定」）\n\n## 步骤\n\n1. **剥夹注**：识别「《…》作…」「别本作」「一作」，剥离并存档。\n2. **抽五元组**：本 / 华 / 充 / 阴阳位 / 通于；缺则 null。\n3. **标不规则**：合称句、替代表述（至阴之类）逐一注明。\n4. **留候选**：一句含两脏或跨句时，列候选不合并。\n5. **写边界**：说明五元组是整理格式。\n\n## 输出模板\n\n```text\n【抽取】脏｜本｜华｜充｜阴阳位｜通于｜不规则\n【夹注】…\n【无法判定】…\n【边界】…\n```\n\n## 质量判据\n\n- 夹注一条不丢\n- 不规则项被标出，而不是被表格抹平\n- 没有把关联写成因果\n\n> 本技能输出为文献结构化辅助，不构成诊断依据。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "01-zhongyi/06-neijing-xuandu/05-bingji-shijiu": {
    "key": "01-zhongyi/06-neijing-xuandu/05-bingji-shijiu",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "06-neijing-xuandu",
    "subjectTitle": "内经选读",
    "chapterSlug": "05-bingji-shijiu",
    "n": 5,
    "title": "第 5 章 · 病机十九条：十九句话里，五脏只占五条",
    "motto": "「谨守病机，各司其属，有者求之，无者求之，盛者责之，虚者责之。」——《素问·至真要大论》",
    "problem": "你听人引用「诸风掉眩，皆属于肝」，就以为十九条讲的是五脏辨证；真去数一遍，会发现十九条里只有五条归脏腑，其余十四条讲的是六气与上下——比例完全不是你以为的那样。",
    "roots": "环境逼迫(写病机分析时只会套「肝风内动」这一条) + 知识积累(原文精读 × 结构化计数 = 一份能按症状反查、能报出分布的病机表)",
    "html": "<h1 id=\"第-5-章-病机十九条-十九句话里-五脏只占五条\">第 5 章 · 病机十九条：十九句话里，五脏只占五条</h1>\n<blockquote><p><strong>MOTTO:</strong> 「谨守病机，各司其属，有者求之，无者求之，盛者责之，虚者责之。」——《素问·至真要大论》</p>\n<p><strong>PROBLEM:</strong> 你听人引用「诸风掉眩，皆属于肝」，就以为十九条讲的是五脏辨证；真去数一遍，会发现十九条里只有五条归脏腑，其余十四条讲的是六气与上下——比例完全不是你以为的那样。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(写病机分析时只会套「肝风内动」这一条) + 知识积累(原文精读 × 结构化计数 = 一份能按症状反查、能报出分布的病机表)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>内经选读</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>05 / 10</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>4 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>背出十九条并按「所属」分类：脏腑 5 · 火 5 · 热 4 · 湿 1 · 风 1 · 寒 1 · 上 1 · 下 1</li><li>说清「皆属于」是<strong>归纳式的提示</strong>，不是排他性的诊断法则</li><li>把十九条做成一张可按症状反查的表，并输出每条的证据边界</li><li>指出十九条缺什么（例如没有「燥」、没有「痰」）</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"原文-素问-至真要大论-据仓库内-neijing-quanwen-原件\">原文（《素问·至真要大论》，据仓库内 <code>neijing-quanwen</code> 原件）</h3>\n<blockquote><p>诸风掉眩，皆属于肝。诸寒收引，皆属于肾。诸气膹郁，皆属于肺。诸湿肿满，皆属于脾。诸热瞀瘈，皆属于火。诸痛痒疮，皆属于心。诸厥固泄，皆属于下。诸痿喘呕，皆属于上。诸禁鼓慄，如丧神守，皆属于火。诸痉项强，皆属于湿。诸逆冲上，皆属于火。诸胀腹大，皆属于热。诸躁狂越，皆属于火。诸暴强直，皆属于风。诸病有声，鼓之如鼓，皆属于热。诸病胕肿，疼酸惊骇，皆属于火。诸转反戾，水液浑浊，皆属于热。诸病水液，澄澈清冷，皆属于寒。诸呕吐酸，暴注下迫，皆属于热。</p></blockquote>\n<p>紧接其后的是读法：「谨守病机，各司其属，<strong>有者求之，无者求之</strong>，盛者责之，虚者责之」。这十六个字比十九条本身更重要：它要求对「有」与「无」都做核对，即条文提示的方向要验证，没提示的方向也要查。</p>\n<h3 id=\"结构-五脏占-5-19-六气占-12-19\">结构：五脏占 5/19，六气占 12/19</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>所属</th><th>条数</th><th>条文起句</th></tr></thead><tbody><tr><td>肝 / 肾 / 肺 / 脾 / 心</td><td>各 1，共 5</td><td>诸风掉眩 · 诸寒收引 · 诸气膹郁 · 诸湿肿满 · 诸痛痒疮</td></tr><tr><td>火</td><td>5</td><td>瞀瘈 · 禁鼓慄 · 逆冲上 · 躁狂越 · 胕肿疼酸惊骇</td></tr><tr><td>热</td><td>4</td><td>胀腹大 · 有声鼓之如鼓 · 转反戾水液浑浊 · 呕吐酸暴注下迫</td></tr><tr><td>湿 / 风 / 寒</td><td>各 1，共 3</td><td>痉项强 · 暴强直 · 水液澄澈清冷</td></tr><tr><td>上 / 下（部位）</td><td>各 1，共 2</td><td>痿喘呕 · 厥固泄</td></tr></tbody></table></div>\n<p>这张表能立刻纠正两个常见误读：<strong>其一</strong>，十九条不是脏腑辨证纲领（脏腑只占 5 条）；<strong>其二</strong>，「属于火」有 5 条，是十九条里最大的单一类别——刘完素后来专论火热，源头在这里。</p>\n<h3 id=\"ai-工程-把-皆属于-写成带边界的索引\">AI/工程：把「皆属于」写成带边界的索引</h3>\n<p>编码难点不在存表，而在<strong>不许把提示写成判据</strong>。所以每条记录必须带三个字段：<code>症状线索</code>（原文起句）、<code>所属</code>、<code>边界</code>（本条不能排除什么）。检索时只返回到条文，不返回证型；命中多条时全部列出——十九条里「热」有四条，一个症状同时命中两条是常态，取第一条就是制造偏见。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">// code/main.js：十九条结构化 + 按症状线索反查 + 分布统计\nconst NINETEEN = [\n  { n: 1, text: '诸风掉眩', belong: '肝', kind: '脏', boundary: '掉眩亦可属痰、属虚，本条不排除' },\n  // …共 19 条\n];\nfunction search(sign) { /* 返回命中条目数组，不排序、不择优 */ }\nfunction distribution() { /* 按 kind 统计，输出表 */ }</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：<code>distribution()</code> 输出 脏 5 · 火 5 · 热 4 · 湿 1 · 风 1 · 寒 1 · 部位 2，合计 19（上、下同属「部位」，两者不分开计）；检索「水液」同时命中第 17、18 两条（浑浊属热、澄澈清冷属寒），代码不许只给一条。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>十九条不是完备清单</strong>。没有「燥」、没有「痰」、没有「瘀」，也没有情志所伤的分类；拿它当病机全表，会漏掉大半。</li><li><strong>「皆属于」是归纳不是排他</strong>。原文自己的「有者求之，无者求之」就在提醒：条文给方向，验证在人。</li><li><strong>本章的「症状线索」是机械抽取的起句</strong>，与临床表述不完全对应；按关键词检索必然有假阴（如「眩晕」不含「掉眩」二字）。</li><li><strong>分类边界有争议</strong>。「诸痛痒疮，皆属于心」归属心还是归属火，历代注家不一致；本章按原文「属于心」记录，并把分歧写进 <code>boundary</code>。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 本章原文引自仓库内 <code>standards/materials/neijing-quanwen/</code>（源 <code>黄帝内经全文.xls</code>，sha256 见 source-map），注释与分类为教学归纳，不构成诊疗依据。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>给十九条补上「燥」的位置：如果让你加第二十条，你会写「诸□，皆属于□」？依据是什么？</li><li>检索「呕」会命中几条？逐条说明它们冲突时临床该怎么处理。</li><li>把 <code>boundary</code> 字段改成必填的结构（不能排除的病机列表），重跑测试，观察哪些条目写不出来。</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>十九条被引用得最多的是第一条，被读得最少的往往是紧随其后的「有者求之，无者求之」。一门学问的深度，常常藏在它自己给的免责里。</p>",
    "markdown": "# 第 5 章 · 病机十九条：十九句话里，五脏只占五条\n\n> **MOTTO:** 「谨守病机，各司其属，有者求之，无者求之，盛者责之，虚者责之。」——《素问·至真要大论》\n>\n> **PROBLEM:** 你听人引用「诸风掉眩，皆属于肝」，就以为十九条讲的是五脏辨证；真去数一遍，会发现十九条里只有五条归脏腑，其余十四条讲的是六气与上下——比例完全不是你以为的那样。\n>\n> **双根因定位:** 环境逼迫(写病机分析时只会套「肝风内动」这一条) + 知识积累(原文精读 × 结构化计数 = 一份能按症状反查、能报出分布的病机表)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 内经选读 |\n| 院系 | 中医系 |\n| 章序号 | 05 / 10 |\n| 所属阶段 | 🌿 长·积累 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 4 小时 |\n\n## 学习目标\n\n- 背出十九条并按「所属」分类：脏腑 5 · 火 5 · 热 4 · 湿 1 · 风 1 · 寒 1 · 上 1 · 下 1\n- 说清「皆属于」是**归纳式的提示**，不是排他性的诊断法则\n- 把十九条做成一张可按症状反查的表，并输出每条的证据边界\n- 指出十九条缺什么（例如没有「燥」、没有「痰」）\n\n## 核心概念\n\n### 原文（《素问·至真要大论》，据仓库内 `neijing-quanwen` 原件）\n\n> 诸风掉眩，皆属于肝。诸寒收引，皆属于肾。诸气膹郁，皆属于肺。诸湿肿满，皆属于脾。诸热瞀瘈，皆属于火。诸痛痒疮，皆属于心。诸厥固泄，皆属于下。诸痿喘呕，皆属于上。诸禁鼓慄，如丧神守，皆属于火。诸痉项强，皆属于湿。诸逆冲上，皆属于火。诸胀腹大，皆属于热。诸躁狂越，皆属于火。诸暴强直，皆属于风。诸病有声，鼓之如鼓，皆属于热。诸病胕肿，疼酸惊骇，皆属于火。诸转反戾，水液浑浊，皆属于热。诸病水液，澄澈清冷，皆属于寒。诸呕吐酸，暴注下迫，皆属于热。\n\n紧接其后的是读法：「谨守病机，各司其属，**有者求之，无者求之**，盛者责之，虚者责之」。这十六个字比十九条本身更重要：它要求对「有」与「无」都做核对，即条文提示的方向要验证，没提示的方向也要查。\n\n### 结构：五脏占 5/19，六气占 12/19\n\n| 所属 | 条数 | 条文起句 |\n|---|---|---|\n| 肝 / 肾 / 肺 / 脾 / 心 | 各 1，共 5 | 诸风掉眩 · 诸寒收引 · 诸气膹郁 · 诸湿肿满 · 诸痛痒疮 |\n| 火 | 5 | 瞀瘈 · 禁鼓慄 · 逆冲上 · 躁狂越 · 胕肿疼酸惊骇 |\n| 热 | 4 | 胀腹大 · 有声鼓之如鼓 · 转反戾水液浑浊 · 呕吐酸暴注下迫 |\n| 湿 / 风 / 寒 | 各 1，共 3 | 痉项强 · 暴强直 · 水液澄澈清冷 |\n| 上 / 下（部位） | 各 1，共 2 | 痿喘呕 · 厥固泄 |\n\n这张表能立刻纠正两个常见误读：**其一**，十九条不是脏腑辨证纲领（脏腑只占 5 条）；**其二**，「属于火」有 5 条，是十九条里最大的单一类别——刘完素后来专论火热，源头在这里。\n\n### AI/工程：把「皆属于」写成带边界的索引\n\n编码难点不在存表，而在**不许把提示写成判据**。所以每条记录必须带三个字段：`症状线索`（原文起句）、`所属`、`边界`（本条不能排除什么）。检索时只返回到条文，不返回证型；命中多条时全部列出——十九条里「热」有四条，一个症状同时命中两条是常态，取第一条就是制造偏见。\n\n## BUILD IT：从零实现\n\n```js\n// code/main.js：十九条结构化 + 按症状线索反查 + 分布统计\nconst NINETEEN = [\n  { n: 1, text: '诸风掉眩', belong: '肝', kind: '脏', boundary: '掉眩亦可属痰、属虚，本条不排除' },\n  // …共 19 条\n];\nfunction search(sign) { /* 返回命中条目数组，不排序、不择优 */ }\nfunction distribution() { /* 按 kind 统计，输出表 */ }\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：`distribution()` 输出 脏 5 · 火 5 · 热 4 · 湿 1 · 风 1 · 寒 1 · 部位 2，合计 19（上、下同属「部位」，两者不分开计）；检索「水液」同时命中第 17、18 两条（浑浊属热、澄澈清冷属寒），代码不许只给一条。\n\n## 代价与边界\n\n- **十九条不是完备清单**。没有「燥」、没有「痰」、没有「瘀」，也没有情志所伤的分类；拿它当病机全表，会漏掉大半。\n- **「皆属于」是归纳不是排他**。原文自己的「有者求之，无者求之」就在提醒：条文给方向，验证在人。\n- **本章的「症状线索」是机械抽取的起句**，与临床表述不完全对应；按关键词检索必然有假阴（如「眩晕」不含「掉眩」二字）。\n- **分类边界有争议**。「诸痛痒疮，皆属于心」归属心还是归属火，历代注家不一致；本章按原文「属于心」记录，并把分歧写进 `boundary`。\n\n> **免责声明：** 本章原文引自仓库内 `standards/materials/neijing-quanwen/`（源 `黄帝内经全文.xls`，sha256 见 source-map），注释与分类为教学归纳，不构成诊疗依据。\n\n## 练习\n\n1. 给十九条补上「燥」的位置：如果让你加第二十条，你会写「诸□，皆属于□」？依据是什么？\n2. 检索「呕」会命中几条？逐条说明它们冲突时临床该怎么处理。\n3. 把 `boundary` 字段改成必填的结构（不能排除的病机列表），重跑测试，观察哪些条目写不出来。\n\n## 进阶思考\n\n十九条被引用得最多的是第一条，被读得最少的往往是紧随其后的「有者求之，无者求之」。一门学问的深度，常常藏在它自己给的免责里。\n",
    "code": {
      "main.js": "'use strict';\n/**\n * 病机十九条：结构化 + 按症状线索反查 + 分布统计\n *\n *   node code/main.js\n *\n * 设计要点（也是本章的教学点）：\n *   1. `belong` 与 `kind` 分开存 —— 「肝」是脏腑，「火」是六气，「上/下」是部位，\n *      三者不是同一层概念，混在一列里统计出来的分布是假的。\n *   2. 每条必须带 `boundary` —— 原文说「皆属于」是归纳，不是排他；\n *      不带边界的条文一旦进系统，就会被读成判据。\n *   3. search() 返回**全部**命中，不排序、不择优 —— 「热」有四条，取第一条就是偏见。\n */\n\nconst NINETEEN = [\n  { n: 1, text: '诸风掉眩', belong: '肝', kind: '脏', boundary: '掉眩亦可属痰、属虚、属气血亏，本条不排除' },\n  { n: 2, text: '诸寒收引', belong: '肾', kind: '脏', boundary: '收引亦可见于寒湿在经络，非独肾阳虚' },\n  { n: 3, text: '诸气膹郁', belong: '肺', kind: '脏', boundary: '气郁亦属肝，本条只提示肺主气' },\n  { n: 4, text: '诸湿肿满', belong: '脾', kind: '脏', boundary: '水肿亦责肾、责肺，本条不排除' },\n  { n: 5, text: '诸热瞀瘈', belong: '火', kind: '火', boundary: '瞀瘈可见于痰、风、虚，本条不排除' },\n  { n: 6, text: '诸痛痒疮', belong: '心', kind: '脏', boundary: '疮疡亦属湿热、属火；归属心或火历代有分歧' },\n  { n: 7, text: '诸厥固泄', belong: '下', kind: '部位', boundary: '「下」指下焦；固泄亦可由中焦气机致' },\n  { n: 8, text: '诸痿喘呕', belong: '上', kind: '部位', boundary: '「上」指上焦；痿证本源在脾胃，本条只言病位' },\n  { n: 9, text: '诸禁鼓慄，如丧神守', belong: '火', kind: '火', boundary: '战栗亦有寒证、阳虚，本条不排除' },\n  { n: 10, text: '诸痉项强', belong: '湿', kind: '湿', boundary: '痉亦属风、属热、属阴虚，本条不排除' },\n  { n: 11, text: '诸逆冲上', belong: '火', kind: '火', boundary: '冲上亦可见于虚阳上浮、痰气上逆' },\n  { n: 12, text: '诸胀腹大', belong: '热', kind: '热', boundary: '胀满亦属寒、属虚、属气滞水停' },\n  { n: 13, text: '诸躁狂越', belong: '火', kind: '火', boundary: '狂越亦有痰迷、瘀血、阳明腑实' },\n  { n: 14, text: '诸暴强直', belong: '风', kind: '风', boundary: '强直亦有热极生风、破伤风（外风）之别' },\n  { n: 15, text: '诸病有声，鼓之如鼓', belong: '热', kind: '热', boundary: '腹胀叩之如鼓亦可见于气滞、水停' },\n  { n: 16, text: '诸病胕肿，疼酸惊骇', belong: '火', kind: '火', boundary: '胕肿亦可属湿、属虚；惊骇亦可属胆虚' },\n  { n: 17, text: '诸转反戾，水液浑浊', belong: '热', kind: '热', boundary: '水液浑浊亦可因湿热下注、清浊不分' },\n  { n: 18, text: '诸病水液，澄澈清冷', belong: '寒', kind: '寒', boundary: '清冷亦可见于阳虚不化，寒与虚常并存' },\n  { n: 19, text: '诸呕吐酸，暴注下迫', belong: '热', kind: '热', boundary: '吐酸亦可属寒（肝寒犯胃），本条不排除' },\n];\n\n/** 按症状线索反查：返回全部命中，不排序、不择优 */\nfunction search(sign) {\n  if (!sign || !String(sign).trim()) throw new Error('检索词不能为空');\n  return NINETEEN.filter((x) => x.text.includes(sign));\n}\n\n/** 分布：按 kind 统计（脏 / 火 / 热 / 湿 / 风 / 寒 / 部位） */\nfunction distribution() {\n  const out = {};\n  for (const x of NINETEEN) out[x.kind] = (out[x.kind] || 0) + 1;\n  return out;\n}\n\n/** 「热」与「火」在十九条里是两类，不许合并 —— 合并后「火 5 + 热 4」会变成一个模糊的 9 */\nfunction byBelong() {\n  const out = {};\n  for (const x of NINETEEN) out[x.belong] = (out[x.belong] || 0) + 1;\n  return out;\n}\n\nfunction main() {\n  console.log(`条文 ${NINETEEN.length} 条`);\n  console.log('按类（kind）：', JSON.stringify(distribution()));\n  console.log('按所属（belong）：', JSON.stringify(byBelong()));\n\n  for (const sign of ['水液', '呕', '眩']) {\n    const hits = search(sign);\n    console.log(`\\n检索「${sign}」→ ${hits.length} 条`);\n    for (const h of hits) console.log(`  ${h.n}. ${h.text} → 属于${h.belong}（${h.kind}）｜边界：${h.boundary}`);\n    if (!hits.length) console.log('  未命中：十九条不含该线索，不要硬套');\n  }\n  console.log('\\n提醒：「皆属于」是归纳提示，原文要求“有者求之，无者求之”。');\n  console.log('本输出为教学样例，不构成诊疗建议。');\n}\n\nif (require.main === module) main();\nmodule.exports = { NINETEEN, search, distribution, byBelong };\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { NINETEEN, search, distribution, byBelong } = require('./main.js');\n\ntest('共 19 条，编号 1..19 连续', () => {\n  assert.strictEqual(NINETEEN.length, 19);\n  NINETEEN.forEach((x, i) => assert.strictEqual(x.n, i + 1));\n});\n\ntest('分类分布：脏5 火5 热4 湿1 风1 寒1 部位2', () => {\n  assert.deepStrictEqual(distribution(), { 脏: 5, 火: 5, 热: 4, 湿: 1, 风: 1, 寒: 1, 部位: 2 });\n});\n\ntest('五脏各一条：肝 肾 肺 脾 心', () => {\n  const d = byBelong();\n  for (const k of ['肝', '肾', '肺', '脾', '心']) assert.strictEqual(d[k], 1);\n});\n\ntest('「水液」命中两条（浑浊属热 / 澄澈清冷属寒），不许只给一条', () => {\n  const r = search('水液');\n  assert.strictEqual(r.length, 2);\n  assert.deepStrictEqual(r.map((x) => x.belong).sort(), ['寒', '热']);\n});\n\ntest('每条都带边界：缺边界等于把归纳读成判据', () => {\n  for (const x of NINETEEN) assert.ok(x.boundary && x.boundary.length > 8, `${x.n} 缺边界`);\n});\n\ntest('未命中的线索返回空数组，不硬套', () => {\n  assert.deepStrictEqual(search('燥'), []);\n});\n\ntest('空检索词抛错', () => {\n  assert.throws(() => search('  '), /不能为空/);\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "病机十九条里，归脏腑的条文共有几条？",
          "options": [
            "19 条",
            "5 条",
            "12 条",
            "9 条"
          ],
          "correct": 1,
          "explanation": "只有肝、肾、肺、脾、心各一条，共 5 条；其余 14 条讲六气与上下。"
        },
        {
          "stage": "check",
          "question": "十九条中占比最大的单一类别是？",
          "options": [
            "热（4 条）",
            "火（5 条）",
            "风（1 条）",
            "部位（2 条）"
          ],
          "correct": 1,
          "explanation": "「皆属于火」有 5 条，是最大类别；这也是刘完素专论火热的文本源头。"
        },
        {
          "stage": "check",
          "question": "「诸病水液，澄澈清冷，皆属于寒」与「诸转反戾，水液浑浊，皆属于热」的正确处理是？",
          "options": [
            "按顺序取第一条",
            "两条都返回，交给人判断（同一线索两极并存是十九条的常态）",
            "取字数多的那条",
            "都丢掉，因为冲突"
          ],
          "correct": 1,
          "explanation": "检索只返回到条文，排序或择优等于制造偏见。"
        },
        {
          "stage": "check",
          "question": "原文紧随十九条的「有者求之，无者求之」是什么意思？",
          "options": [
            "有条文就照着治，没有就不治",
            "对条文提示的方向要核实，没提示的方向也要查——提示不是判据",
            "有症状就记录，没有就不用记录",
            "有脉象才算，无脉象不算"
          ],
          "correct": 1,
          "explanation": "这十六个字是十九条自带的使用说明，比条文本身更少被引用。"
        },
        {
          "stage": "post",
          "question": "把「火」与「热」合并成 9 条统计，问题在哪？",
          "options": [
            "没有问题，本来就同义",
            "十九条把它们分列两类，合并会抹掉原文的分类意图与后续治法差异",
            "会导致总数变成 20",
            "合并后无法检索"
          ],
          "correct": 1,
          "explanation": "火与热在病机层次上不同（火多言亢盛之势，热多言温度之性），原文分列有其用意。"
        },
        {
          "stage": "post",
          "question": "用十九条做「症状→病机」系统，最需要补的是什么？",
          "options": [
            "更多同义词",
            "它缺失的类别（燥、痰、瘀、情志）与每条的不排除项",
            "更快的检索算法",
            "更长的条文列表"
          ],
          "correct": 1,
          "explanation": "十九条不完备，且「皆属于」不排他；补齐缺失类别与边界，比优化检索重要得多。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-bingji-shijiu.md",
        "kind": "prompt",
        "file": "departments/01-zhongyi/06-neijing-xuandu/chapters/05-bingji-shijiu/outputs/prompt-bingji-shijiu.md",
        "title": "病机十九条反查器",
        "description": null,
        "chars": 596,
        "body": "# 病机十九条反查器\n\n## 用途\n\n把一段症状描述，反查到《素问·至真要大论》病机十九条的对应条文，并同时给出该条的**不排除项**。\n用于**病机分析书写前的核对、教学演练、条文与病例对读**。不给证型、不给治法。\n\n## 提示词\n\n```text\n你是内经课的助教。下面是病人的症状描述。请做两件事：反查十九条、标出不排除项。\n\n规则：\n1. 只使用原文十九条，逐条引用起句（如「诸风掉眩」），不改写、不引申。\n2. 一条症状可能命中多条，全部列出，按原文序号排列，不许「取最相关的一条」。\n3. 每条后面必须写「本条不排除：…」，来源是原文的「有者求之，无者求之」。\n4. 十九条没有覆盖的方向（燥、痰、瘀、情志、外伤）单列一段「十九条之外」，写清缺什么。\n5. 禁止输出证型、治法、方剂。\n\n输出格式：\n【命中】\n  1. 诸风掉眩 → 属于肝｜不排除：…\n  2. …\n【十九条之外】…\n【需要补充的四诊】…\n```\n\n## 使用示例\n\n输入：「头晕目眩，手指蠕动，舌红少苔。」\n\n输出：【命中】1. 诸风掉眩 → 属于肝｜不排除：肝血虚、阴虚风动、痰浊上蒙。\n【十九条之外】十九条以「风」统掉眩，未单列「阴虚风动」；需结合舌脉。\n【需要补充的四诊】脉象、有无耳鸣、既往血压。\n\n## 为什么这样限制\n\n- 全部列出：十九条里「热」占四条，择优会把鉴别诊断直接删掉。\n- 强制写不排除项：不带边界的条文进病历，下一步就会被当成判据。\n- 单列「十九条之外」：让它缺什么这件事可见，而不是靠使用者自己想起来。\n"
      },
      {
        "name": "skill-bingji-shijiu.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/06-neijing-xuandu/chapters/05-bingji-shijiu/outputs/skill-bingji-shijiu.md",
        "title": "bingji-shijiu",
        "description": "按病机十九条反查症状：列出全部命中条文与各自的不排除项，并指出十九条之外缺什么",
        "chars": 498,
        "body": "---\nname: bingji-shijiu\ndescription: 按病机十九条反查症状：列出全部命中条文与各自的不排除项，并指出十九条之外缺什么\nversion: 0.1.0\n---\n\n# bingji-shijiu\n\n## 何时使用\n\n- 写病机分析前，核对「这条判断有没有条文依据」\n- 教学：让学生看清十九条里脏腑只占 5 条\n- 病例讨论：把同一症状命中的多条条文摆在一起鉴别\n\n## 不适用\n\n- 需要下证型或治法（十九条只给病机方向）\n- 症状落在十九条未覆盖的类别（燥、痰、瘀、情志、外伤）——此时应显式说明「无对应条文」，不硬套\n- 急症判断\n\n## 步骤\n\n1. **摘症状**：原文照录，不改写。\n2. **反查**：用起句关键词匹配，返回全部命中（按序号）。\n3. **带边界**：每条写「本条不排除：…」。\n4. **列缺口**：写清十九条之外的方向。\n5. **补四诊**：指出还缺哪些信息才能分辨。\n\n## 输出模板\n\n```text\n【命中】n. <起句> → 属于<所属>｜不排除：…\n【十九条之外】…\n【需要补充的四诊】…\n```\n\n## 质量判据\n\n- 命中条目不排序、不择优\n- 每条都有不排除项\n- 缺口段非空（十九条不可能覆盖全部病机）\n\n> 本技能输出为教学与核对辅助，不构成诊疗建议。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "01-zhongyi/06-neijing-xuandu/06-zhenfa-maiyao": {
    "key": "01-zhongyi/06-neijing-xuandu/06-zhenfa-maiyao",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "06-neijing-xuandu",
    "subjectTitle": "内经选读",
    "chapterSlug": "06-zhenfa-maiyao",
    "n": 6,
    "title": "第 6 章 · 《脉要精微论》：先把诊断条件管住，再谈脉象",
    "motto": "「诊法常以平旦，阴气未动，阳气未散，饮食未进，经脉未盛，络脉调匀，气血未乱，故乃可诊有过之脉。」——《素问·脉要精微论》",
    "problem": "你在门诊随手搭脉，出诊记录写「脉弦」，但没人知道病人刚爬了三层楼、刚喝完咖啡、刚吵完架——同一个「弦」，可能来自病，也可能来自你没管住的条件。",
    "roots": "环境逼迫(门诊条件无法像经典要求那样理想) + 知识积累(原文条件清单 × 偏差记录 = 一份能说明「这次测量在什么条件下成立」的记录)",
    "html": "<h1 id=\"第-6-章-脉要精微论-先把诊断条件管住-再谈脉象\">第 6 章 · 《脉要精微论》：先把诊断条件管住，再谈脉象</h1>\n<blockquote><p><strong>MOTTO:</strong> 「诊法常以平旦，阴气未动，阳气未散，饮食未进，经脉未盛，络脉调匀，气血未乱，故乃可诊有过之脉。」——《素问·脉要精微论》</p>\n<p><strong>PROBLEM:</strong> 你在门诊随手搭脉，出诊记录写「脉弦」，但没人知道病人刚爬了三层楼、刚喝完咖啡、刚吵完架——同一个「弦」，可能来自病，也可能来自你没管住的条件。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(门诊条件无法像经典要求那样理想) + 知识积累(原文条件清单 × 偏差记录 = 一份能说明「这次测量在什么条件下成立」的记录)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>内经选读</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>06 / 10</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>背出原文给的四个条件（阴气未动、阳气未散、饮食未进、气血未乱）并说明各自影响什么</li><li>说出「平旦诊法」的实质：<strong>控制变量</strong>，不是规定时间</li><li>用原文的脉象四条（长、短、数、大）说明「同一属性两个方向」的判读结构</li><li>写一个采集条件检查器：不满足时输出偏差项，而不是拒绝测量</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"原文-先条件-后脉\">原文：先条件，后脉</h3>\n<blockquote><p>诊法常以平旦，阴气未动，阳气未散，饮食未进，经脉未盛，络脉调匀，气血未乱，故乃可诊有过之脉。——《素问·脉要精微论》</p></blockquote>\n<blockquote><p>夫脉者，血之府也。长则气治，短则气病，数则烦心，大则病进。——同上</p></blockquote>\n<p>第一句常被读成「要早上看病」，其实它列的是<strong>四个变量</strong>：阳气（活动）、饮食、经脉盛衰、气血乱否。平旦只是这四项同时归零的那个时点。换句话说，原文讲的是<strong>对照条件</strong>，不是时辰崇拜。</p>\n<p>第二句给了四个脉象与四条判读：长/短是一对（气之治与病），数/大是另一对（烦心与病进）。注意它没有给「正常脉」，只给方向——这与后世二十八脉的体系不同，读的时候不能互套。</p>\n<h3 id=\"为什么条件会改写结论\">为什么条件会改写结论</h3>\n<p>同一病人，刚运动后脉多数、餐后脉多滑、情绪激动后脉多弦。若不记录条件，这些都由「病」来背。原文的四个条件恰好对应四类干扰：<strong>活动（阳气）</strong>、<strong>进食（饮食）</strong>、<strong>时相（经脉盛衰）</strong>、<strong>情绪（气血乱）</strong>。</p>\n<p>工程上的推论很直接：脉象记录不是单个值，而是「值 + 条件 + 偏差项」。缺条件，值就不可比。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">// code/main.js：采集条件检查 + 脉象四条的判读表\nfunction checkCondition({ rested, fasted, calm, hour }) {\n  // 逐项判断是否满足「平旦四条件」，返回 {ok, deviations[], advice}\n  // 不满足时不拒绝测量，而是把偏差写进记录 —— 门诊不可能等到平旦\n}\nconst PULSES = [ /* 长/短/数/大：原文判读 + 边界（不与其他脉象互套） */ ];</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：<code>checkCondition({rested:false, fasted:true, calm:true, hour:15})</code> 返回 <code>ok:false</code>，偏差项含「未静息」「非平旦（15 时）」，并给出「记录偏差后仍可测量」的建议；<code>PULSES</code> 四条各带原文与边界。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>门诊做不到平旦</strong>。原文的理想条件在现实中几乎不可得，本章的处理是<strong>记录偏差</strong>，而不是假装满足。</li><li><strong>四项条件是原文所列，不是穷举</strong>。药物（咖啡因、降压药）、环境温度、体位同样影响脉象，本章把它们列为「未列入原文但必须记录」的补充项。</li><li><strong>四条脉象不能覆盖临床</strong>。长短数大只是举例，且与后世二十八脉命名不完全对应；拿本章的表去套二十八脉会错位。</li><li><strong>判读方向不等于诊断</strong>。「数则烦心」是提示，不是「脉数即心烦」的等价命题。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 原文引自仓库内 <code>standards/materials/neijing-quanwen/</code>（源 <code>黄帝内经全文.xls</code>，可复核）；本章的条件检查器是记录工具，不构成诊断依据，脉象判读须由执业医师完成。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>给 <code>checkCondition</code> 增加「服药」与「体位」两项，说明为什么它们不该混进原文的四条件里。</li><li>若病人必须在不满足条件时测量，记录里最少要写哪几项，第二个人才能判断这次脉象可用性？</li><li>对比《脉要精微论》的「长短短数大」与后世二十八脉，列出至少三处命名不对应。</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>经典里最容易被跳过的，往往是条件句。「诊法常以平旦」被引用了一千年，多数引用只留下「早上」两个字，丢掉的正是那四个变量——而变量才是这句话的方法论。</p>",
    "markdown": "# 第 6 章 · 《脉要精微论》：先把诊断条件管住，再谈脉象\n\n> **MOTTO:** 「诊法常以平旦，阴气未动，阳气未散，饮食未进，经脉未盛，络脉调匀，气血未乱，故乃可诊有过之脉。」——《素问·脉要精微论》\n>\n> **PROBLEM:** 你在门诊随手搭脉，出诊记录写「脉弦」，但没人知道病人刚爬了三层楼、刚喝完咖啡、刚吵完架——同一个「弦」，可能来自病，也可能来自你没管住的条件。\n>\n> **双根因定位:** 环境逼迫(门诊条件无法像经典要求那样理想) + 知识积累(原文条件清单 × 偏差记录 = 一份能说明「这次测量在什么条件下成立」的记录)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 内经选读 |\n| 院系 | 中医系 |\n| 章序号 | 06 / 10 |\n| 所属阶段 | 🌿 长·积累 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 3 小时 |\n\n## 学习目标\n\n- 背出原文给的四个条件（阴气未动、阳气未散、饮食未进、气血未乱）并说明各自影响什么\n- 说出「平旦诊法」的实质：**控制变量**，不是规定时间\n- 用原文的脉象四条（长、短、数、大）说明「同一属性两个方向」的判读结构\n- 写一个采集条件检查器：不满足时输出偏差项，而不是拒绝测量\n\n## 核心概念\n\n### 原文：先条件，后脉\n\n> 诊法常以平旦，阴气未动，阳气未散，饮食未进，经脉未盛，络脉调匀，气血未乱，故乃可诊有过之脉。——《素问·脉要精微论》\n\n> 夫脉者，血之府也。长则气治，短则气病，数则烦心，大则病进。——同上\n\n第一句常被读成「要早上看病」，其实它列的是**四个变量**：阳气（活动）、饮食、经脉盛衰、气血乱否。平旦只是这四项同时归零的那个时点。换句话说，原文讲的是**对照条件**，不是时辰崇拜。\n\n第二句给了四个脉象与四条判读：长/短是一对（气之治与病），数/大是另一对（烦心与病进）。注意它没有给「正常脉」，只给方向——这与后世二十八脉的体系不同，读的时候不能互套。\n\n### 为什么条件会改写结论\n\n同一病人，刚运动后脉多数、餐后脉多滑、情绪激动后脉多弦。若不记录条件，这些都由「病」来背。原文的四个条件恰好对应四类干扰：**活动（阳气）**、**进食（饮食）**、**时相（经脉盛衰）**、**情绪（气血乱）**。\n\n工程上的推论很直接：脉象记录不是单个值，而是「值 + 条件 + 偏差项」。缺条件，值就不可比。\n\n## BUILD IT：从零实现\n\n```js\n// code/main.js：采集条件检查 + 脉象四条的判读表\nfunction checkCondition({ rested, fasted, calm, hour }) {\n  // 逐项判断是否满足「平旦四条件」，返回 {ok, deviations[], advice}\n  // 不满足时不拒绝测量，而是把偏差写进记录 —— 门诊不可能等到平旦\n}\nconst PULSES = [ /* 长/短/数/大：原文判读 + 边界（不与其他脉象互套） */ ];\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：`checkCondition({rested:false, fasted:true, calm:true, hour:15})` 返回 `ok:false`，偏差项含「未静息」「非平旦（15 时）」，并给出「记录偏差后仍可测量」的建议；`PULSES` 四条各带原文与边界。\n\n## 代价与边界\n\n- **门诊做不到平旦**。原文的理想条件在现实中几乎不可得，本章的处理是**记录偏差**，而不是假装满足。\n- **四项条件是原文所列，不是穷举**。药物（咖啡因、降压药）、环境温度、体位同样影响脉象，本章把它们列为「未列入原文但必须记录」的补充项。\n- **四条脉象不能覆盖临床**。长短数大只是举例，且与后世二十八脉命名不完全对应；拿本章的表去套二十八脉会错位。\n- **判读方向不等于诊断**。「数则烦心」是提示，不是「脉数即心烦」的等价命题。\n\n> **免责声明：** 原文引自仓库内 `standards/materials/neijing-quanwen/`（源 `黄帝内经全文.xls`，可复核）；本章的条件检查器是记录工具，不构成诊断依据，脉象判读须由执业医师完成。\n\n## 练习\n\n1. 给 `checkCondition` 增加「服药」与「体位」两项，说明为什么它们不该混进原文的四条件里。\n2. 若病人必须在不满足条件时测量，记录里最少要写哪几项，第二个人才能判断这次脉象可用性？\n3. 对比《脉要精微论》的「长短短数大」与后世二十八脉，列出至少三处命名不对应。\n\n## 进阶思考\n\n经典里最容易被跳过的，往往是条件句。「诊法常以平旦」被引用了一千年，多数引用只留下「早上」两个字，丢掉的正是那四个变量——而变量才是这句话的方法论。\n",
    "code": {
      "main.js": "'use strict';\n/**\n * 诊法条件检查 + 脉象四条判读（《素问·脉要精微论》）\n *\n *   node code/main.js\n *\n * 设计要点：\n *   1. 不满足条件时不拒绝测量 —— 门诊等不到平旦。做法是把偏差写进记录，\n *      让「这个脉象在什么条件下取得」成为记录的一部分。\n *   2. 原文四项条件（阴气未动/阳气未散/饮食未进/气血未乱）只覆盖活动、进食、时相、情绪；\n *      药物、体位、温度等「未列入原文但影响脉象」的项单列为 supplements，不混进去。\n *   3. 脉象判读只给原文方向，不给诊断结论。\n */\n\n/** 原文四项条件（据《素问·脉要精微论》「诊法常以平旦…」） */\nfunction checkCondition(env = {}) {\n  const { rested = false, fasted = false, calm = false, hour = 12 } = env;\n  const deviations = [];\n  if (!rested) deviations.push('未静息（阳气未散这一条不成立）');\n  if (!fasted) deviations.push('已进食（饮食未进这一条不成立）');\n  if (!calm) deviations.push('情绪未平（气血未乱这一条不成立）');\n  const dawn = hour >= 4 && hour <= 7;\n  if (!dawn) deviations.push(`非平旦（${hour} 时；经脉盛衰这一条按原文不成立）`);\n\n  return {\n    ok: deviations.length === 0,\n    deviations,\n    // 门诊现实：偏差项必须记录，而不是把测量作废\n    advice: deviations.length\n      ? '记录上述偏差后再采集；同一次随访尽量保持相同条件，才可纵向比较'\n      : '条件满足原文要求，可直接采集',\n  };\n}\n\n/** 原文四条：长/短/数/大 —— 只给方向与边界，不给诊断 */\nconst PULSES = [\n  { name: '长', text: '长则气治', read: '气机和调', boundary: '长而太过（如长而硬）不属此条' },\n  { name: '短', text: '短则气病', read: '气机不利', boundary: '短亦可因痰食壅滞，本条不排除' },\n  { name: '数', text: '数则烦心', read: '热扰心神之提示', boundary: '数亦见于虚、见于药（咖啡因等）' },\n  { name: '大', text: '大则病进', read: '病势进展之提示', boundary: '大而无力属虚，不与「病进」等同' },\n];\n\n/** 未列入原文、但影响脉象的补充项（必须记录，不混入四条件） */\nconst SUPPLEMENTS = ['服药（尤其降压、咖啡因）', '体位（卧/坐/立）', '环境温度', '是否刚吸烟'];\n\nfunction main() {\n  const cases = [\n    { name: 'A：理想平旦', env: { rested: true, fasted: true, calm: true, hour: 6 } },\n    { name: 'B：门诊下午', env: { rested: false, fasted: true, calm: true, hour: 15 } },\n  ];\n  for (const c of cases) {\n    const r = checkCondition(c.env);\n    console.log(`\\n${c.name} → ${r.ok ? '条件成立' : '条件不成立'}`);\n    for (const d of r.deviations) console.log(`  · ${d}`);\n    console.log(`  建议：${r.advice}`);\n  }\n  console.log('\\n脉象四条（原文方向，非诊断）：');\n  for (const p of PULSES) console.log(`  ${p.name}：${p.text} → ${p.read}｜边界：${p.boundary}`);\n  console.log(`\\n原文未列、但必须记录的项：${SUPPLEMENTS.join('、')}`);\n  console.log('\\n本输出为教学样例，不构成诊断依据。');\n}\n\nif (require.main === module) main();\nmodule.exports = { checkCondition, PULSES, SUPPLEMENTS };\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { checkCondition, PULSES, SUPPLEMENTS } = require('./main.js');\n\ntest('四条件全满足 + 平旦 → ok', () => {\n  const r = checkCondition({ rested: true, fasted: true, calm: true, hour: 6 });\n  assert.strictEqual(r.ok, true);\n  assert.deepStrictEqual(r.deviations, []);\n});\n\ntest('门诊下午：偏差项逐条列出，且不作废测量', () => {\n  const r = checkCondition({ rested: false, fasted: true, calm: true, hour: 15 });\n  assert.strictEqual(r.ok, false);\n  assert.ok(r.deviations.length >= 2);\n  assert.match(r.advice, /记录/);\n});\n\ntest('平旦边界：4–7 时算平旦，8 时不算', () => {\n  assert.strictEqual(checkCondition({ rested: true, fasted: true, calm: true, hour: 4 }).ok, true);\n  assert.strictEqual(checkCondition({ rested: true, fasted: true, calm: true, hour: 7 }).ok, true);\n  assert.strictEqual(checkCondition({ rested: true, fasted: true, calm: true, hour: 8 }).ok, false);\n});\n\ntest('脉象四条齐备，每条都有原文与边界', () => {\n  assert.deepStrictEqual(PULSES.map((p) => p.name), ['长', '短', '数', '大']);\n  for (const p of PULSES) {\n    assert.match(p.text, /则/);\n    assert.ok(p.boundary.length > 5, `${p.name} 缺边界`);\n  }\n});\n\ntest('补充项与原文四条件分开：药物/体位/温度不得混入 deviations 文案', () => {\n  assert.ok(SUPPLEMENTS.some((s) => s.includes('服药')));\n  const r = checkCondition({ rested: true, fasted: true, calm: true, hour: 6 });\n  assert.ok(!r.deviations.join('').includes('体位'));\n});\n\ntest('全默认值（什么都不传）必须判定不成立，不许默认满足', () => {\n  const r = checkCondition();\n  assert.strictEqual(r.ok, false);\n  assert.ok(r.deviations.length === 4);\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "「诊法常以平旦」这句话的实质是？",
          "options": [
            "规定必须早上看病",
            "举出四个需要控制的变量（阳气/饮食/经脉盛衰/气血），平旦是它们同时归零的时点",
            "说明脉诊只在清晨有效",
            "要求病人空腹当天不活动"
          ],
          "correct": 1,
          "explanation": "原文列的是条件，不是时辰；平旦只是四项同时成立的那个时点。"
        },
        {
          "stage": "check",
          "question": "「夫脉者，血之府也」之后给出的四条判读是？",
          "options": [
            "浮沉迟数",
            "长则气治，短则气病，数则烦心，大则病进",
            "滑涩虚实",
            "弦紧濡弱"
          ],
          "correct": 1,
          "explanation": "原文只给长短数大四条方向，不与后世二十八脉互套。"
        },
        {
          "stage": "check",
          "question": "门诊无法满足平旦条件时，本章的处理是？",
          "options": [
            "拒绝采集",
            "记录偏差项后仍采集，并在记录中保留条件",
            "把下午的脉象换算成平旦脉象",
            "只记录脉象不记录条件"
          ],
          "correct": 1,
          "explanation": "作废测量在门诊不可行；把条件写进记录，值才可比。"
        },
        {
          "stage": "check",
          "question": "下列哪一项属于「原文未列但必须记录」的补充项？",
          "options": [
            "饮食",
            "情绪",
            "服药（如咖啡因、降压药）",
            "时相"
          ],
          "correct": 2,
          "explanation": "原文四项涵盖活动、进食、时相、情绪；药物等属补充项，应单列。"
        },
        {
          "stage": "post",
          "question": "「数则烦心」的正确读法是？",
          "options": [
            "脉数就一定是心烦",
            "热扰心神的方向性提示，数亦可见于虚或药物影响",
            "心烦必然脉数",
            "数脉等于发热"
          ],
          "correct": 1,
          "explanation": "原文给方向，不给等价命题；边界必须随条文一起记。"
        },
        {
          "stage": "post",
          "question": "要让两次随访的脉象可比，最关键的是？",
          "options": [
            "同一名医生",
            "两次采集的条件尽量一致，且偏差项都被记录",
            "同一台设备",
            "同一时间段内完成"
          ],
          "correct": 1,
          "explanation": "条件一致 + 偏差留痕，才谈得上纵向比较。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-zhenfa-maiyao.md",
        "kind": "prompt",
        "file": "departments/01-zhongyi/06-neijing-xuandu/chapters/06-zhenfa-maiyao/outputs/prompt-zhenfa-maiyao.md",
        "title": "诊法条件记录助手",
        "description": null,
        "chars": 657,
        "body": "# 诊法条件记录助手\n\n## 用途\n\n采集脉象前把**条件**记录下来：哪些原文条件成立、哪些不成立、有哪些原文未列但影响判读的补充项。\n用于**脉象记录规范化、随访可比性、教学演示**。不用于脉象判读结论。\n\n## 提示词\n\n```text\n你是内经课的助教。下面是本次脉诊的采集情境。请只做条件核对，不做脉象判读。\n\n原文条件（《素问·脉要精微论》）：\n1. 阴气未动 —— 未活动、静息足够\n2. 阳气未散 —— 未劳作出汗\n3. 饮食未进 —— 空腹\n4. 气血未乱 —— 情绪平稳\n（原文以「平旦」为四项同时成立的时点）\n\n规则：\n1. 逐条判定成立/不成立，不成立要写出依据。\n2. 不满足时不作废测量：输出「记录偏差后采集」的建议。\n3. 药物、体位、环境温度、吸烟等单列「补充项」，不要混进原文四条件。\n4. 禁止把条件偏差换算成「校正后的脉象」。\n5. 禁止给脉象结论或证型。\n\n输出格式：\n【原文四条件】1) … 成立/不成立（依据）…\n【补充项】…\n【建议】…\n【不可比提示】与上次采集的条件差异：…\n```\n\n## 使用示例\n\n输入：下午 3 点，病人刚爬楼，未进食，情绪平稳，服降压药。\n\n输出：【四条件】1) 阴气未动：不成立（刚活动）2) 阳气未散：不成立（爬楼）3) 饮食未进：成立\n4) 气血未乱：成立\n【补充项】服降压药；体位未记录\n【建议】记录偏差后采集；下次尽量同一时段、同样活动状态\n【不可比提示】与平旦采集的历史值不可直接比较。\n\n## 为什么这样限制\n\n- 不作废测量：门诊现实如此，作废等于没有数据。\n- 不换算：任何「校正」都是编造，条件只能记录不能消除。\n- 补充项单列：把它塞进原文四条件，会让「原文条件」这个基准失真。\n"
      },
      {
        "name": "skill-zhenfa-maiyao.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/06-neijing-xuandu/chapters/06-zhenfa-maiyao/outputs/skill-zhenfa-maiyao.md",
        "title": "zhenfa-maiyao",
        "description": "脉诊采集条件核对：逐条判原文四条件、单列补充项、不作废也不换算",
        "chars": 500,
        "body": "---\nname: zhenfa-maiyao\ndescription: 脉诊采集条件核对：逐条判原文四条件、单列补充项、不作废也不换算\nversion: 0.1.0\n---\n\n# zhenfa-maiyao\n\n## 何时使用\n\n- 脉象记录需要说明「在什么条件下取得」\n- 随访比较前，检查两次采集条件是否可比\n- 教学：演示「平旦诊法」其实是一组控制变量\n\n## 不适用\n\n- 脉象判读与辨证（本技能只做条件）\n- 需要把条件差异「校正」掉（本章明确禁止换算）\n- 特殊人群（孕妇、危重）的采集判断（须医师决定）\n\n## 步骤\n\n1. **核四条件**：静息、未劳作、空腹、情绪平稳；平旦作为四项同时成立的时点参考。\n2. **写依据**：每条成立/不成立都要有可核的事实。\n3. **列补充项**：药物、体位、温度、吸烟等单列。\n4. **给建议**：偏差存在时，建议「记录后采集」，不作废。\n5. **标不可比**：与历史值比较时，列条件差异。\n\n## 输出模板\n\n```text\n【四条件】1) … 成立/不成立（依据）…\n【补充项】…\n【建议】…\n【不可比提示】…\n```\n\n## 质量判据\n\n- 每条判定都有依据\n- 没有「校正后的脉象」这种表述\n- 补充项没有被塞进原文四条件\n\n> 本技能输出为记录辅助，不构成诊断依据。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "01-zhongyi/06-neijing-xuandu/09-lingshu-jiuzhen": {
    "key": "01-zhongyi/06-neijing-xuandu/09-lingshu-jiuzhen",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "06-neijing-xuandu",
    "subjectTitle": "内经选读",
    "chapterSlug": "09-lingshu-jiuzhen",
    "n": 9,
    "title": "第 9 章 · 《灵枢·九针十二原》：九种针不是九种型号",
    "motto": "「九针之名，各不同形者，针穷其所当补泻也。」——《灵枢·九针十二原》",
    "problem": "你能背出「镵针、员针、鍉针、锋针、铍针、员利针、毫针、长针、大针」，但说不清哪一种该用在什么部位、为什么长度差到四倍，也说不清「一寸六分」在今天是多少毫米。",
    "roots": "环境逼迫(临证选针凭习惯，出了问题说不清为什么选它) + 知识积累(原文规格表 × 折算与用途 = 一份能查、能算出尺寸、能说明不确定性的选针依据)",
    "html": "<h1 id=\"第-9-章-灵枢-九针十二原-九种针不是九种型号\">第 9 章 · 《灵枢·九针十二原》：九种针不是九种型号</h1>\n<blockquote><p><strong>MOTTO:</strong> 「九针之名，各不同形者，针穷其所当补泻也。」——《灵枢·九针十二原》</p>\n<p><strong>PROBLEM:</strong> 你能背出「镵针、员针、鍉针、锋针、铍针、员利针、毫针、长针、大针」，但说不清哪一种该用在什么部位、为什么长度差到四倍，也说不清「一寸六分」在今天是多少毫米。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(临证选针凭习惯，出了问题说不清为什么选它) + 知识积累(原文规格表 × 折算与用途 = 一份能查、能算出尺寸、能说明不确定性的选针依据)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>内经选读</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>09 / 10</td></tr><tr><td>所属阶段</td><td>🌳 壮·鼎盛</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>列出九针的名称、长度与主治（据《灵枢·九针十二原》与《灵枢·官针》两篇原文）</li><li>说清「九针」是按<strong>用途与形制</strong>分的，不是同一支针的九个粗细规格</li><li>用汉制折算给出九针的厘米区间，并说明这个折算为什么只能是区间</li><li>写一个选针器：给定部位与目的，返回候选针具 + 原文依据 + 不确定项</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"原文-两篇各说一半\">原文：两篇各说一半</h3>\n<p>《灵枢·九针十二原》给形制与用途：</p>\n<blockquote><p>镵针者，头大末锐，去泻阳气。员针者，针如卵形，揩摩分间，不得伤肌肉者，以泻分气。鍉针者，锋如黍粟之锐，主按脉，勿陷以致其气。</p></blockquote>\n<p>《灵枢·官针》给取法与本治：</p>\n<blockquote><p>镵针者，取法于巾针，去末寸半，卒锐之，长一寸六分，主热在头身也。二曰员针，取法于絮针，筩其身而卵其锋，长一寸六分，主治分间气。三曰鍉针，取法于黍粟之锐，长三寸半，主按脉取气，令邪出。</p></blockquote>\n<p>两篇合起来才是完整的规格表。只读一篇，你会知道「镵针泻阳气」却不知道它多长；只读另一篇，你知道长度却不知道为什么要那个形。</p>\n<h3 id=\"规格表-据上述两篇-长度单位为-寸\">规格表（据上述两篇，长度单位为「寸」）</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>序</th><th>针</th><th>长度</th><th>形制要点</th><th>主治</th></tr></thead><tbody><tr><td>1</td><td>镵针</td><td>1.6</td><td>头大末锐</td><td>泻阳气、热在头身</td></tr><tr><td>2</td><td>员针</td><td>1.6</td><td>筩身卵锋</td><td>揩摩分间、泻分气</td></tr><tr><td>3</td><td>鍉针</td><td>3.5</td><td>锋如黍粟</td><td>按脉取气、令邪出</td></tr><tr><td>4</td><td>锋针</td><td>1.6</td><td>三隅（三棱）</td><td>泻热出血、痈脓</td></tr><tr><td>5</td><td>铍针</td><td>4.0（广 2.5 分）</td><td>剑形，末如剑锋</td><td>排脓、切痈</td></tr><tr><td>6</td><td>员利针</td><td>1.6</td><td>大如氂，且员且锐</td><td>暴痹、取深邪</td></tr><tr><td>7</td><td>毫针</td><td>3.6</td><td>尖如蚊虻喙</td><td>静以徐往，养神定气</td></tr><tr><td>8</td><td>长针</td><td>7.0</td><td>长其身，锋其末</td><td>深痹、远痹</td></tr><tr><td>9</td><td>大针</td><td>4.0</td><td>尖如梃，其锋微员</td><td>泻水、通关节</td></tr></tbody></table></div>\n<p>一眼可看出它不是「型号序列」：最短的三支（1.6 寸）用途完全不同（泻阳、摩分间、放血），最长的一支（7 寸）专为深部痹阻；<strong>形制决定用途，长度只是形制的一部分</strong>。</p>\n<h3 id=\"折算-一寸是多少\">折算：一寸是多少</h3>\n<p>汉制一寸常按 2.3 cm 左右估算，于是九针落在约 <strong>3.7–16.1 cm</strong>。但这是区间而不是定值：汉代尺度的考古实测本身有分布，且「寸」在不同时期不同。所以任何「某针 = 某毫米」的说法都必须带换算依据，否则是把不确定性藏起来。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">// code/main.js：九针规格表 + 按部位/目的选针 + 汉制折算（给区间，不给点值）\nconst NEEDLES = [ /* 9 条：name, cun, shape, use, source */ ];\nfunction toCm(cun) { /* 用 [2.31, 2.35] 区间返回 {min, max} */ }\nfunction pick(use) { /* 关键词检索用途，返回候选 + 原文依据；无命中返回 [] */ }</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：<code>toCm(1.6)</code> 返回约 3.70–3.76 cm；<code>pick('脓')</code> 命中铍针与锋针两条，并给出各自原文依据；<code>pick('深痹')</code> 命中长针。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>原文的「主某病」是归纳，不是适应证清单</strong>。九针的用途在《官针》《刺节真邪》等篇还有展开，本章只取两篇。</li><li><strong>折算的不确定性不可消除</strong>。给出区间是诚实的上限；临床用针以现代针具规格（直径 × 长度 mm）为准，本章的寸制换算只用于读原文。</li><li><strong>形制描述是文本，不是实测</strong>。「筩其身而卵其锋」这类描述无法直接还原为几何参数，本章不做图像复原。</li><li><strong>本章不含刺法操作与禁忌</strong>。进针深度、角度、危险部位另章（腧穴学·危险穴位）。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 本章规格与引文引自 <code>standards/materials/neijing-quanwen/</code>（源 <code>黄帝内经全文.xls</code>，可复核），折算为读原文用的近似，不构成针具选择或操作建议；实际针刺须由执业医师按现行规范执行。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>用 <code>pick()</code> 分别检索「出血」「水」「痹」，观察哪些针重复出现，说明「一针多能」在原文里如何表述。</li><li>若把折算改成单一系数（如 2.32），<code>toCm</code> 的输出会变成什么？这为什么是退步？</li><li>找出《灵枢·官针》里另外几种刺法（如「五刺」「九刺」），说明它们与九针是什么关系。</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>「九针」最容易被读成一张工具清单，其实它是一套<strong>形制—用途</strong>的对应：先想清楚要做什么，再决定用哪种形。工具清单记名字，对应关系才教人。</p>",
    "markdown": "# 第 9 章 · 《灵枢·九针十二原》：九种针不是九种型号\n\n> **MOTTO:** 「九针之名，各不同形者，针穷其所当补泻也。」——《灵枢·九针十二原》\n>\n> **PROBLEM:** 你能背出「镵针、员针、鍉针、锋针、铍针、员利针、毫针、长针、大针」，但说不清哪一种该用在什么部位、为什么长度差到四倍，也说不清「一寸六分」在今天是多少毫米。\n>\n> **双根因定位:** 环境逼迫(临证选针凭习惯，出了问题说不清为什么选它) + 知识积累(原文规格表 × 折算与用途 = 一份能查、能算出尺寸、能说明不确定性的选针依据)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 内经选读 |\n| 院系 | 中医系 |\n| 章序号 | 09 / 10 |\n| 所属阶段 | 🌳 壮·鼎盛 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 3 小时 |\n\n## 学习目标\n\n- 列出九针的名称、长度与主治（据《灵枢·九针十二原》与《灵枢·官针》两篇原文）\n- 说清「九针」是按**用途与形制**分的，不是同一支针的九个粗细规格\n- 用汉制折算给出九针的厘米区间，并说明这个折算为什么只能是区间\n- 写一个选针器：给定部位与目的，返回候选针具 + 原文依据 + 不确定项\n\n## 核心概念\n\n### 原文：两篇各说一半\n\n《灵枢·九针十二原》给形制与用途：\n\n> 镵针者，头大末锐，去泻阳气。员针者，针如卵形，揩摩分间，不得伤肌肉者，以泻分气。鍉针者，锋如黍粟之锐，主按脉，勿陷以致其气。\n\n《灵枢·官针》给取法与本治：\n\n> 镵针者，取法于巾针，去末寸半，卒锐之，长一寸六分，主热在头身也。二曰员针，取法于絮针，筩其身而卵其锋，长一寸六分，主治分间气。三曰鍉针，取法于黍粟之锐，长三寸半，主按脉取气，令邪出。\n\n两篇合起来才是完整的规格表。只读一篇，你会知道「镵针泻阳气」却不知道它多长；只读另一篇，你知道长度却不知道为什么要那个形。\n\n### 规格表（据上述两篇，长度单位为「寸」）\n\n| 序 | 针 | 长度 | 形制要点 | 主治 |\n|--:|---|--:|---|---|\n| 1 | 镵针 | 1.6 | 头大末锐 | 泻阳气、热在头身 |\n| 2 | 员针 | 1.6 | 筩身卵锋 | 揩摩分间、泻分气 |\n| 3 | 鍉针 | 3.5 | 锋如黍粟 | 按脉取气、令邪出 |\n| 4 | 锋针 | 1.6 | 三隅（三棱） | 泻热出血、痈脓 |\n| 5 | 铍针 | 4.0（广 2.5 分） | 剑形，末如剑锋 | 排脓、切痈 |\n| 6 | 员利针 | 1.6 | 大如氂，且员且锐 | 暴痹、取深邪 |\n| 7 | 毫针 | 3.6 | 尖如蚊虻喙 | 静以徐往，养神定气 |\n| 8 | 长针 | 7.0 | 长其身，锋其末 | 深痹、远痹 |\n| 9 | 大针 | 4.0 | 尖如梃，其锋微员 | 泻水、通关节 |\n\n一眼可看出它不是「型号序列」：最短的三支（1.6 寸）用途完全不同（泻阳、摩分间、放血），最长的一支（7 寸）专为深部痹阻；**形制决定用途，长度只是形制的一部分**。\n\n### 折算：一寸是多少\n\n汉制一寸常按 2.3 cm 左右估算，于是九针落在约 **3.7–16.1 cm**。但这是区间而不是定值：汉代尺度的考古实测本身有分布，且「寸」在不同时期不同。所以任何「某针 = 某毫米」的说法都必须带换算依据，否则是把不确定性藏起来。\n\n## BUILD IT：从零实现\n\n```js\n// code/main.js：九针规格表 + 按部位/目的选针 + 汉制折算（给区间，不给点值）\nconst NEEDLES = [ /* 9 条：name, cun, shape, use, source */ ];\nfunction toCm(cun) { /* 用 [2.31, 2.35] 区间返回 {min, max} */ }\nfunction pick(use) { /* 关键词检索用途，返回候选 + 原文依据；无命中返回 [] */ }\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：`toCm(1.6)` 返回约 3.70–3.76 cm；`pick('脓')` 命中铍针与锋针两条，并给出各自原文依据；`pick('深痹')` 命中长针。\n\n## 代价与边界\n\n- **原文的「主某病」是归纳，不是适应证清单**。九针的用途在《官针》《刺节真邪》等篇还有展开，本章只取两篇。\n- **折算的不确定性不可消除**。给出区间是诚实的上限；临床用针以现代针具规格（直径 × 长度 mm）为准，本章的寸制换算只用于读原文。\n- **形制描述是文本，不是实测**。「筩其身而卵其锋」这类描述无法直接还原为几何参数，本章不做图像复原。\n- **本章不含刺法操作与禁忌**。进针深度、角度、危险部位另章（腧穴学·危险穴位）。\n\n> **免责声明：** 本章规格与引文引自 `standards/materials/neijing-quanwen/`（源 `黄帝内经全文.xls`，可复核），折算为读原文用的近似，不构成针具选择或操作建议；实际针刺须由执业医师按现行规范执行。\n\n## 练习\n\n1. 用 `pick()` 分别检索「出血」「水」「痹」，观察哪些针重复出现，说明「一针多能」在原文里如何表述。\n2. 若把折算改成单一系数（如 2.32），`toCm` 的输出会变成什么？这为什么是退步？\n3. 找出《灵枢·官针》里另外几种刺法（如「五刺」「九刺」），说明它们与九针是什么关系。\n\n## 进阶思考\n\n「九针」最容易被读成一张工具清单，其实它是一套**形制—用途**的对应：先想清楚要做什么，再决定用哪种形。工具清单记名字，对应关系才教人。\n",
    "code": {
      "main.js": "'use strict';\n/**\n * 九针规格与选针：《灵枢·九针十二原》形制用途 + 《灵枢·官针》取法主治\n *\n *   node code/main.js\n *\n * 口径：\n *   · 长度单位「寸」按汉制折算为区间 [2.31, 2.35] cm —— 给区间不给点值，\n *     因为汉尺实测本身有分布，任何「某针 = 某毫米」都在藏不确定性\n *   · 用途只取两篇原文的措辞，不扩充适应证\n */\n\nconst CM_MIN = 2.31;\nconst CM_MAX = 2.35;\n\nconst SRC_A = '《灵枢·九针十二原》';\nconst SRC_B = '《灵枢·官针》';\n\nconst NEEDLES = [\n  { n: 1, name: '镵针', cun: 1.6, shape: '头大末锐', use: ['泻阳气', '热在头身'], source: `${SRC_A}·${SRC_B}` },\n  { n: 2, name: '员针', cun: 1.6, shape: '筩其身而卵其锋', use: ['揩摩分间', '泻分气'], source: `${SRC_A}·${SRC_B}` },\n  { n: 3, name: '鍉针', cun: 3.5, shape: '锋如黍粟之锐', use: ['按脉取气', '令邪出'], source: `${SRC_A}·${SRC_B}` },\n  { n: 4, name: '锋针', cun: 1.6, shape: '刃三隅', use: ['泻热出血', '痈脓'], source: `${SRC_A}·${SRC_B}` },\n  { n: 5, name: '铍针', cun: 4.0, shape: '末如剑锋，广二分半', use: ['取大脓', '排脓'], source: `${SRC_A}·${SRC_B}` },\n  { n: 6, name: '员利针', cun: 1.6, shape: '大如氂，且员且锐', use: ['取暴痹', '取深邪'], source: `${SRC_A}·${SRC_B}` },\n  { n: 7, name: '毫针', cun: 3.6, shape: '尖如蚊虻喙', use: ['静以徐往', '养神定气'], source: `${SRC_A}·${SRC_B}` },\n  { n: 8, name: '长针', cun: 7.0, shape: '长其身，锋其末', use: ['取深痹', '远痹'], source: `${SRC_A}·${SRC_B}` },\n  { n: 9, name: '大针', cun: 4.0, shape: '尖如梃，其锋微员', use: ['泻水', '通关节'], source: `${SRC_A}·${SRC_B}` },\n];\n\n/** 寸 → 厘米区间（不给点值） */\nfunction toCm(cun) {\n  if (!(cun > 0)) throw new Error('长度必须为正数（寸）');\n  return { min: +(cun * CM_MIN).toFixed(2), max: +(cun * CM_MAX).toFixed(2) };\n}\n\n/** 按用途关键词选针：返回全部命中，并标明依据；无命中返回空数组 */\nfunction pick(keyword) {\n  if (!keyword || !String(keyword).trim()) throw new Error('检索词不能为空');\n  return NEEDLES.filter((x) => x.use.some((u) => u.includes(keyword)) || x.shape.includes(keyword))\n    .map((x) => ({ name: x.name, cun: x.cun, use: x.use, source: x.source }));\n}\n\nfunction main() {\n  console.log('九针（长度单位：寸 → 汉制折算法厘米区间）');\n  for (const x of NEEDLES) {\n    const c = toCm(x.cun);\n    console.log(`  ${x.n}. ${x.name.padEnd(3, '　')} ${x.cun} 寸（${c.min}–${c.max} cm）｜${x.shape}｜${x.use.join('、')}`);\n  }\n  for (const k of ['脓', '深痹', '出血']) {\n    const r = pick(k);\n    console.log(`\\n检索「${k}」→ ${r.length} 支：${r.map((x) => `${x.name}(${x.cun}寸)`).join('、') || '无命中'}`);\n  }\n  console.log('\\n提醒：折算为区间，读原文用；临床针具按现行 mm 规格执行。');\n  console.log('本输出为教学样例，不构成针具选择或操作建议。');\n}\n\nif (require.main === module) main();\nmodule.exports = { NEEDLES, toCm, pick, CM_MIN, CM_MAX };\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { NEEDLES, toCm, pick } = require('./main.js');\n\ntest('九针齐备，序号 1..9，每支都有出处', () => {\n  assert.strictEqual(NEEDLES.length, 9);\n  NEEDLES.forEach((x, i) => {\n    assert.strictEqual(x.n, i + 1);\n    assert.match(x.source, /灵枢/);\n  });\n});\n\ntest('长度跨度：最短 1.6 寸、最长 7 寸（长针）', () => {\n  const cuns = NEEDLES.map((x) => x.cun);\n  assert.strictEqual(Math.min(...cuns), 1.6);\n  assert.strictEqual(Math.max(...cuns), 7);\n});\n\ntest('折算给区间不给点值：1.6 寸 ≈ 3.70–3.76 cm', () => {\n  const c = toCm(1.6);\n  assert.deepStrictEqual(c, { min: 3.7, max: 3.76 });\n  assert.notStrictEqual(c.min, c.max, '点值等于把不确定性藏起来');\n});\n\ntest('非正长度抛错', () => {\n  assert.throws(() => toCm(0), /正数/);\n});\n\ntest('按用途选针：「脓」同时命中锋针与铍针，不许只给一支', () => {\n  const r = pick('脓').map((x) => x.name);\n  assert.deepStrictEqual(r.sort(), ['铍针', '锋针'].sort());\n});\n\ntest('无命中返回空数组，不返回最相近的一支', () => {\n  assert.deepStrictEqual(pick('不存在的用途'), []);\n  assert.throws(() => pick('  '), /不能为空/);\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "「九针」是按什么分的？",
          "options": [
            "同一支针的九种粗细",
            "按形制与用途分的九种针具",
            "按进针深度分的九档",
            "按病人体质分的九类"
          ],
          "correct": 1,
          "explanation": "形制决定用途，长度只是形制的一部分；最短的三支用途完全不同。"
        },
        {
          "stage": "check",
          "question": "九针中长度最长的是哪一支？",
          "options": [
            "铍针（4 寸）",
            "大针（4 寸）",
            "长针（7 寸）",
            "鍉针（3.5 寸）"
          ],
          "correct": 2,
          "explanation": "长针七寸，专为深痹、远痹。"
        },
        {
          "stage": "check",
          "question": "《灵枢·九针十二原》与《灵枢·官针》各给了九针的什么？",
          "options": [
            "两篇内容重复",
            "前者给形制与用途，后者给取法与本治（主治）",
            "前者给主治，后者给禁忌",
            "前者给图，后者给剂量"
          ],
          "correct": 1,
          "explanation": "两篇各说一半，合起来才是完整规格表。"
        },
        {
          "stage": "check",
          "question": "「一寸六分」折算成厘米，为什么只能是区间？",
          "options": [
            "因为计算器精度不够",
            "汉尺实测本身有分布，寸在不同时期不等值",
            "因为原文抄错了",
            "因为寸是重量单位"
          ],
          "correct": 1,
          "explanation": "给点值等于把不确定性藏起来；区间才是诚实表达。"
        },
        {
          "stage": "post",
          "question": "按本课的实现，检索「脓」应返回？",
          "options": [
            "只返回铍针",
            "铍针与锋针（各自带原文依据）",
            "返回空",
            "返回大针"
          ],
          "correct": 1,
          "explanation": "锋针「泻热出血、痈脓」，铍针「取大脓」；多候选才可鉴别。"
        },
        {
          "stage": "post",
          "question": "本章的用途表最需要提醒的边界是？",
          "options": [
            "九针已经失传",
            "原文的「主某病」是归纳，不是适应证清单，且不含刺法禁忌",
            "长度单位不统一，无参考价值",
            "九针只用于外科"
          ],
          "correct": 1,
          "explanation": "用途在《官针》《刺节真邪》等篇还有展开；本章只取两篇。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-lingshu-jiuzhen.md",
        "kind": "prompt",
        "file": "departments/01-zhongyi/06-neijing-xuandu/chapters/09-lingshu-jiuzhen/outputs/prompt-lingshu-jiuzhen.md",
        "title": "九针选针助手",
        "description": null,
        "chars": 642,
        "body": "# 九针选针助手\n\n## 用途\n\n读《灵枢》时把「九针」当成**形制—用途**的对应表来用：给定部位与目的，返回候选针具、原文依据与不确定项。\n用于**备课、条文对读、工具史梳理**。不用于实际选针操作。\n\n## 提示词\n\n```text\n你是内经课的助教。下面是操作需求（部位 + 目的）。请只做两件事：给候选针、给原文依据。\n\n规则：\n1. 候选针只能来自《灵枢·九针十二原》《灵枢·官针》两篇的措辞，不扩充适应证。\n2. 每支针必须同时给出：形态描述（原文）、长度（寸）、折算区间（cm，给区间不给点值）、出处到篇名。\n3. 命中多支时全部列出，并说明差异（形制差异 > 长度差异）。\n4. 折算必须附一句「汉制寸有分布，区间用于读原文；临床按现行 mm 规格」。\n5. 不写进针深度、角度、禁忌（另章）。\n\n输出格式：\n【候选】1) <针名>：<形制>；<长度> 寸（≈<min>–<max> cm）；依据《…》｜适合：…\n【差异】…\n【不确定项】…\n```\n\n## 使用示例\n\n输入：化脓性痈肿，需排脓。\n\n输出：【候选】1) 铍针：末如剑锋、广二分半；4 寸（≈9.24–9.40 cm）；依据《灵枢·官针》｜适合：取大脓\n2) 锋针：刃三隅；1.6 寸（≈3.70–3.76 cm）；依据《灵枢·九针十二原》｜适合：泻热出血、痈脓\n【差异】铍针为切开排脓，锋针为放血泻热，长度差三倍源于用途不同。\n\n## 为什么这样限制\n\n- 只认两篇：九针用途散见多篇，混引会把不同时代的用法叠成一个「标准」。\n- 给区间：汉尺折算的分布是真实存在的，写点值是伪精确。\n- 列差异：九针的价值在形制对应，不在名字。\n"
      },
      {
        "name": "skill-lingshu-jiuzhen.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/06-neijing-xuandu/chapters/09-lingshu-jiuzhen/outputs/skill-lingshu-jiuzhen.md",
        "title": "lingshu-jiuzhen",
        "description": "按形制—用途查九针：给候选、原文依据与折算区间，不外推适应证",
        "chars": 546,
        "body": "---\nname: lingshu-jiuzhen\ndescription: 按形制—用途查九针：给候选、原文依据与折算区间，不外推适应证\nversion: 0.1.0\n---\n\n# lingshu-jiuzhen\n\n## 何时使用\n\n- 读到「九针」时要把名字落回形制与用途\n- 备课：对比某两支针（如锋针 vs 铍针）的差异\n- 工具史梳理：某一类操作（放血、排脓、深刺）对应哪支针\n\n## 不适用\n\n- 实际选针与操作（临床按现行 mm 规格与规范）\n- 需要刺法禁忌、进针深度（另章：腧穴学·危险穴位）\n- 九针之外的刺法（五刺、九刺、十二节刺）\n\n## 步骤\n\n1. **定目的**：泻热出血 / 排脓 / 摩分间 / 深刺 / 泻水。\n2. **查表**：九针各条形制 + 长度 + 用途（来源《九针十二原》《官针》）。\n3. **给区间**：寸 × [2.31, 2.35] cm。\n4. **列差异**：多候选时先讲形制差异，再讲长度。\n5. **标不确定**：折算区间、原文归纳性、适应证未展开。\n\n## 输出模板\n\n```text\n【候选】1) <针>：<形制>；<寸>（≈<min>–<max> cm）；《…》｜…\n【差异】…\n【不确定项】…\n【提醒】区间用于读原文；临床按现行规格。\n```\n\n## 质量判据\n\n- 每支针都有形制描述与出处\n- 折算写成区间\n- 没有把「主某病」写成适应证\n\n> 本技能输出为教学辅助，不构成针具选择或操作建议。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "01-zhongyi/07-shanghanlun/01-chengshu-banben": {
    "key": "01-zhongyi/07-shanghanlun/01-chengshu-banben",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "07-shanghanlun",
    "subjectTitle": "伤寒论",
    "chapterSlug": "01-chengshu-banben",
    "n": 1,
    "title": "第 1 章 · 《伤寒论》的成书、版本与条文结构：1760 条不是 398 条",
    "motto": "「撰用《素问》《九卷》《八十一难》《阴阳大论》……为《伤寒杂病论》合十六卷。」——《伤寒论·自序》",
    "problem": "你听说《伤寒论》有 398 条，随口引用「第 35 条麻黄汤」，却不知道这个条号来自宋本编次；换一个底本，同一条可能编在第 72 条，你的引用立刻失效。",
    "roots": "环境逼迫(临床带教与论文都要报条号，报错等于没依据) + 知识积累(版本与编次实测 × 声明数与实测数分离 = 一套换底本也不会错位的引用方式)",
    "html": "<h1 id=\"第-1-章-伤寒论-的成书-版本与条文结构-1760-条不是-398-条\">第 1 章 · 《伤寒论》的成书、版本与条文结构：1760 条不是 398 条</h1>\n<blockquote><p><strong>MOTTO:</strong> 「撰用《素问》《九卷》《八十一难》《阴阳大论》……为《伤寒杂病论》合十六卷。」——《伤寒论·自序》</p>\n<p><strong>PROBLEM:</strong> 你听说《伤寒论》有 398 条，随口引用「第 35 条麻黄汤」，却不知道这个条号来自宋本编次；换一个底本，同一条可能编在第 72 条，你的引用立刻失效。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(临床带教与论文都要报条号，报错等于没依据) + 知识积累(版本与编次实测 × 声明数与实测数分离 = 一套换底本也不会错位的引用方式)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>伤寒论</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>01 / 12</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>说清「宋本 398 条」与「本仓库底本 1760 条」为什么不同：前者是宋人校定编次，后者是刻本<strong>篇内连续编次</strong></li><li>用实测数字描述底本的骨架：27 篇 · 9 域 · 1760 条 · 71,496 字</li><li>解释「声明条数」与「实测条数」为什么要分两列存，并举出本底本里不一致的篇</li><li>写一个引用器：给定底本、篇名与篇内条号，返回条文原文；不给条号就拒绝</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"底本的骨架-本仓库实测\">底本的骨架（本仓库实测）</h3>\n<p><code>standards/shanghan/底本.json</code>（源：识典古籍刻本 version 6，三级对象：篇 obj 27 · 章 obj · 条 obj）：</p>\n<div class=\"table-wrap\"><table><thead><tr><th>语义域</th><th>篇数</th><th>条数</th><th>字数</th></tr></thead><tbody><tr><td>汗吐下诸可不可</td><td>9</td><td>587</td><td>22,186</td></tr><tr><td>太阳病</td><td>4</td><td>566</td><td>22,297</td></tr><tr><td>太阴病</td><td>3</td><td>194</td><td>6,591</td></tr><tr><td>阳明病</td><td>2</td><td>134</td><td>5,356</td></tr><tr><td>少阳病</td><td>3</td><td>64</td><td>2,253</td></tr><tr><td>脉法·伤寒例</td><td>1</td><td>61</td><td>3,991</td></tr><tr><td>序跋·目录</td><td>1</td><td>90</td><td>6,077</td></tr><tr><td>霍乱·差后劳复</td><td>3</td><td>34</td><td>901</td></tr><tr><td>厥阴病</td><td>1</td><td>30</td><td>1,418</td></tr><tr><td><strong>合计</strong></td><td><strong>27</strong></td><td><strong>1,760</strong></td><td><strong>71,496</strong></td></tr></tbody></table></div>\n<p>两个反直觉之处：<strong>其一</strong>，最大的域不是太阳病而是「汗吐下诸可不可」（587 条，9 篇）——那是按治法编的专题汇编，不是按病编；<strong>其二</strong>，厥阴病只有 30 条、1 篇，是全书最小的域，却被后世当作辨证的最后一环。</p>\n<h3 id=\"398-与-1760-条号是版本属性\">398 与 1760：条号是版本属性</h3>\n<p>宋本 398 条是<strong>宋人校定后的通行编号</strong>，跨篇连续；本底本是刻本，条号在<strong>篇内连续</strong>。同一个条文的「第 N 条」在两个体系里必然不同。</p>\n<p>所以合格的引用不是「第 35 条」，而是<strong>《伤寒论·辨太阳病脉证并治中》篇内第 72 条</strong>（本底本）——篇名稳定，条号随底本走。这与内经「篇名锚定、序号不稳」是同一条原则。</p>\n<h3 id=\"声明数与实测数必须分开存\">声明数与实测数必须分开存</h3>\n<p>底本文件里每篇同时记 <code>declared</code>（源表声称的条数与字数）与 <code>actual</code>（逐条解析后的实测值）。实测结果：<strong>27 篇里有 18 篇两者不一致</strong>，其中 3 篇条数差 1（如某篇声明 79 条、实测 78 条），其余是字数差几十字（标点与夹注口径）。</p>\n<p>这不是数据脏，而是<strong>必须留下的证据</strong>：如果只存一个数，你永远不知道当年是谁算错的。分两列存，差异就变成了可核对的对象。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">// code/main.js：底本结构校验 + 域统计 + 篇内条号引用\nconst 底本 = require('../../../../standards/shanghan/底本.json');\nfunction domains() { /* 按域汇总篇/条/字 */ }\nfunction drift() { /* declared ≠ actual 的篇清单（含差值） */ }\nfunction tiao(pianName, n) { /* 篇内第 n 条原文；缺参数即报错，不猜 */ }</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：<code>domains()</code> 输出 9 域 27 篇 1760 条 71,496 字；<code>drift()</code> 列出 18 篇并给出差值；<code>tiao('辨太阳病脉证并治中', 72)</code> 返回「太阳与阳明合病者，必自下利，葛根汤主之」。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>本仓库底本不是校勘本</strong>。它是电子整理本（简体照录，繁体原字另存备份），异体字与错简未校；临床与论文引用仍须回到权威校勘本。</li><li><strong>1760 条 ≠ 1760 个独立方证</strong>。刻本把方后注、煎服法也计入条数，所以条数偏大；拿条数当「方证数量」是误读。</li><li><strong>域划分是本仓库的整理口径</strong>，不是仲景原文的分类；原文没有「语义域」这一层。</li><li><strong>条号只在声明了底本的前提下有效</strong>。任何引用都必须带底本标识，否则无法复核。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 本章条数与字数由 <code>standards/shanghan/底本.json</code> 逐条实测，可复算；版本判断与校勘不属本章范围，方药使用须由执业医师依据权威版本与临床实际决定。本章不构成诊疗建议。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>找出条数差 1 的那几篇，逐篇说明差在哪一条（提示：看 <code>items</code> 的最后几条）。</li><li>若要把宋本 398 条与底本 1760 条做映射，你需要哪些信息？缺什么就无法映射？</li><li>把 <code>tiao()</code> 改成「不传条号则返回该篇全部条文」，说明这会带来什么风险。</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>「398 条」这个数字被引用了几百年，却几乎没人同时说出它属于哪个版本。版本意识不是文献学的洁癖，它决定你引的这句话明天还能不能被找到。</p>",
    "markdown": "# 第 1 章 · 《伤寒论》的成书、版本与条文结构：1760 条不是 398 条\n\n> **MOTTO:** 「撰用《素问》《九卷》《八十一难》《阴阳大论》……为《伤寒杂病论》合十六卷。」——《伤寒论·自序》\n>\n> **PROBLEM:** 你听说《伤寒论》有 398 条，随口引用「第 35 条麻黄汤」，却不知道这个条号来自宋本编次；换一个底本，同一条可能编在第 72 条，你的引用立刻失效。\n>\n> **双根因定位:** 环境逼迫(临床带教与论文都要报条号，报错等于没依据) + 知识积累(版本与编次实测 × 声明数与实测数分离 = 一套换底本也不会错位的引用方式)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 伤寒论 |\n| 院系 | 中医系 |\n| 章序号 | 01 / 12 |\n| 所属阶段 | 🌿 长·积累 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 3 小时 |\n\n## 学习目标\n\n- 说清「宋本 398 条」与「本仓库底本 1760 条」为什么不同：前者是宋人校定编次，后者是刻本**篇内连续编次**\n- 用实测数字描述底本的骨架：27 篇 · 9 域 · 1760 条 · 71,496 字\n- 解释「声明条数」与「实测条数」为什么要分两列存，并举出本底本里不一致的篇\n- 写一个引用器：给定底本、篇名与篇内条号，返回条文原文；不给条号就拒绝\n\n## 核心概念\n\n### 底本的骨架（本仓库实测）\n\n`standards/shanghan/底本.json`（源：识典古籍刻本 version 6，三级对象：篇 obj 27 · 章 obj · 条 obj）：\n\n| 语义域 | 篇数 | 条数 | 字数 |\n|---|--:|--:|--:|\n| 汗吐下诸可不可 | 9 | 587 | 22,186 |\n| 太阳病 | 4 | 566 | 22,297 |\n| 太阴病 | 3 | 194 | 6,591 |\n| 阳明病 | 2 | 134 | 5,356 |\n| 少阳病 | 3 | 64 | 2,253 |\n| 脉法·伤寒例 | 1 | 61 | 3,991 |\n| 序跋·目录 | 1 | 90 | 6,077 |\n| 霍乱·差后劳复 | 3 | 34 | 901 |\n| 厥阴病 | 1 | 30 | 1,418 |\n| **合计** | **27** | **1,760** | **71,496** |\n\n两个反直觉之处：**其一**，最大的域不是太阳病而是「汗吐下诸可不可」（587 条，9 篇）——那是按治法编的专题汇编，不是按病编；**其二**，厥阴病只有 30 条、1 篇，是全书最小的域，却被后世当作辨证的最后一环。\n\n### 398 与 1760：条号是版本属性\n\n宋本 398 条是**宋人校定后的通行编号**，跨篇连续；本底本是刻本，条号在**篇内连续**。同一个条文的「第 N 条」在两个体系里必然不同。\n\n所以合格的引用不是「第 35 条」，而是**《伤寒论·辨太阳病脉证并治中》篇内第 72 条**（本底本）——篇名稳定，条号随底本走。这与内经「篇名锚定、序号不稳」是同一条原则。\n\n### 声明数与实测数必须分开存\n\n底本文件里每篇同时记 `declared`（源表声称的条数与字数）与 `actual`（逐条解析后的实测值）。实测结果：**27 篇里有 18 篇两者不一致**，其中 3 篇条数差 1（如某篇声明 79 条、实测 78 条），其余是字数差几十字（标点与夹注口径）。\n\n这不是数据脏，而是**必须留下的证据**：如果只存一个数，你永远不知道当年是谁算错的。分两列存，差异就变成了可核对的对象。\n\n## BUILD IT：从零实现\n\n```js\n// code/main.js：底本结构校验 + 域统计 + 篇内条号引用\nconst 底本 = require('../../../../standards/shanghan/底本.json');\nfunction domains() { /* 按域汇总篇/条/字 */ }\nfunction drift() { /* declared ≠ actual 的篇清单（含差值） */ }\nfunction tiao(pianName, n) { /* 篇内第 n 条原文；缺参数即报错，不猜 */ }\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：`domains()` 输出 9 域 27 篇 1760 条 71,496 字；`drift()` 列出 18 篇并给出差值；`tiao('辨太阳病脉证并治中', 72)` 返回「太阳与阳明合病者，必自下利，葛根汤主之」。\n\n## 代价与边界\n\n- **本仓库底本不是校勘本**。它是电子整理本（简体照录，繁体原字另存备份），异体字与错简未校；临床与论文引用仍须回到权威校勘本。\n- **1760 条 ≠ 1760 个独立方证**。刻本把方后注、煎服法也计入条数，所以条数偏大；拿条数当「方证数量」是误读。\n- **域划分是本仓库的整理口径**，不是仲景原文的分类；原文没有「语义域」这一层。\n- **条号只在声明了底本的前提下有效**。任何引用都必须带底本标识，否则无法复核。\n\n> **免责声明：** 本章条数与字数由 `standards/shanghan/底本.json` 逐条实测，可复算；版本判断与校勘不属本章范围，方药使用须由执业医师依据权威版本与临床实际决定。本章不构成诊疗建议。\n\n## 练习\n\n1. 找出条数差 1 的那几篇，逐篇说明差在哪一条（提示：看 `items` 的最后几条）。\n2. 若要把宋本 398 条与底本 1760 条做映射，你需要哪些信息？缺什么就无法映射？\n3. 把 `tiao()` 改成「不传条号则返回该篇全部条文」，说明这会带来什么风险。\n\n## 进阶思考\n\n「398 条」这个数字被引用了几百年，却几乎没人同时说出它属于哪个版本。版本意识不是文献学的洁癖，它决定你引的这句话明天还能不能被找到。\n",
    "code": {
      "main.js": "'use strict';\n/**\n * 《伤寒论》底本结构校验：域统计 · 声明/实测差异 · 篇内条号引用\n *\n *   node code/main.js\n *\n * 口径：\n *   · 条 = 底本 items 的编号单位（刻本把方后注、煎服法也计在内，故 1760 条 > 宋本 398 条）\n *   · declared = 源表声称值；actual = 逐条解析后的实测值。两者分开存，差异本身是证据。\n *   · 条号只在**声明底本**的前提下有效（本底本篇章内连续编号）\n */\n\nconst path = require('node:path');\n\nconst ROOT = path.resolve(__dirname, '../../../../../..');\nconst SRC = path.join(ROOT, 'standards/shanghan/底本.json');\n\nfunction load() {\n  return JSON.parse(require('node:fs').readFileSync(SRC, 'utf8'));\n}\n\n/** 按语义域汇总 */\nfunction domains(j = load()) {\n  return j.domains.map((d) => ({\n    name: d.name, pian: d.pianist, tiao: d.actualTiao, chars: d.chars,\n  }));\n}\n\n/** declared ≠ actual 的篇（含差值），这是「源表数字与实测不一致」的可核对证据 */\nfunction drift(j = load()) {\n  return j.pian\n    .filter((p) => p.declared.tiao !== p.actual.tiao || p.declared.chars !== p.actual.chars)\n    .map((p) => ({\n      no: p.no,\n      pian: p.pian,\n      tiaoDelta: p.actual.tiao - p.declared.tiao,\n      charsDelta: p.actual.chars - p.declared.chars,\n    }));\n}\n\n/**\n * 篇内条号引用。\n * @param {string} pianName 篇名（允许片段，但必须唯一命中）\n * @param {number} n 篇内条号（1 起）\n */\nfunction tiao(pianName, n, j = load()) {\n  if (!pianName || !Number.isInteger(n) || n < 1) {\n    throw new Error('必须同时给出篇名与篇内条号（不给条号就是猜，猜出来的引用无法复核）');\n  }\n  const hits = j.pian.filter((p) => p.pian.includes(pianName));\n  if (hits.length === 0) throw new Error(`没有这一篇: ${pianName}`);\n  if (hits.length > 1) {\n    throw new Error(`篇名不唯一（命中 ${hits.length} 篇）：${hits.map((p) => p.pian).join(' / ')}`);\n  }\n  const it = hits[0].items.find((x) => x.no === n);\n  if (!it) throw new Error(`${hits[0].pian} 只有 ${hits[0].items.length} 条，没有第 ${n} 条`);\n  return { pian: hits[0].pian, no: it.no, text: it.text };\n}\n\nfunction main() {\n  const j = load();\n  console.log(`底本：${j.counts.pian} 篇 · ${j.counts.tiao} 条 · ${j.counts.chars} 字 · ${j.counts.domains} 域`);\n  console.log('\\n语义域（按条数降序）：');\n  for (const d of domains(j).sort((a, b) => b.tiao - a.tiao)) {\n    console.log(`  ${d.name.padEnd(9, '　')} 篇 ${String(d.pian).padStart(2)} · 条 ${String(d.tiao).padStart(4)} · ${d.chars} 字`);\n  }\n  const d = drift(j);\n  console.log(`\\n声明数与实测数不一致的篇：${d.length}/${j.counts.pian}`);\n  for (const x of d.slice(0, 5)) {\n    console.log(`  第${x.no}篇 ${x.pian}｜条差 ${x.tiaoDelta >= 0 ? '+' : ''}${x.tiaoDelta}｜字差 ${x.charsDelta >= 0 ? '+' : ''}${x.charsDelta}`);\n  }\n  const t = tiao('辨太阳病脉证并治中', 72);\n  console.log(`\\n引用：${t.pian} 篇内第 ${t.no} 条 → ${t.text.slice(0, 40)}…`);\n  console.log('\\n提醒：条号是版本属性，引用必须带底本标识。本输出为教学样例。');\n}\n\nif (require.main === module) main();\nmodule.exports = { domains, drift, tiao, load, SRC };\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { domains, drift, tiao, load } = require('./main.js');\n\ntest('底本规模：27 篇 · 1760 条 · 71496 字 · 9 域', () => {\n  const j = load();\n  assert.strictEqual(j.counts.pian, 27);\n  assert.strictEqual(j.counts.tiao, 1760);\n  assert.strictEqual(j.counts.chars, 71496);\n  assert.strictEqual(j.counts.domains, 9);\n});\n\ntest('域汇总条数之和 = 全书条数（域划分必须闭合）', () => {\n  const sum = domains().reduce((a, d) => a + d.tiao, 0);\n  assert.strictEqual(sum, 1760);\n});\n\ntest('最大域是「汗吐下诸可不可」，不是太阳病', () => {\n  const top = domains().sort((a, b) => b.tiao - a.tiao)[0];\n  assert.strictEqual(top.name, '汗吐下诸可不可');\n});\n\ntest('declared ≠ actual 的篇有 18 篇，差异可逐篇列出', () => {\n  const d = drift();\n  assert.strictEqual(d.length, 18);\n  assert.ok(d.every((x) => Number.isInteger(x.tiaoDelta) && Number.isInteger(x.charsDelta)));\n});\n\ntest('篇内条号引用：第 72 条是葛根汤条', () => {\n  const t = tiao('辨太阳病脉证并治中', 72);\n  assert.match(t.text, /太阳与阳明合病/);\n  assert.match(t.text, /葛根汤主之/);\n});\n\ntest('不给条号 / 条号越界 / 篇名不唯一，都必须抛错（引用不许猜）', () => {\n  assert.throws(() => tiao('辨太阳病脉证并治中'), /篇名与篇内条号/);\n  assert.throws(() => tiao('辨太阳病脉证并治中', 99999), /没有第/);\n  assert.throws(() => tiao('辨太阳病脉证并治', 1), /篇名不唯一/);\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "通行的「《伤寒论》398 条」是哪种编次？",
          "options": [
            "仲景原书编次",
            "宋人校定后的通行编号（跨篇连续）",
            "本仓库底本的篇内编号",
            "日本康平本的编号"
          ],
          "correct": 1,
          "explanation": "398 条属宋本体系；本仓库底本是刻本，篇内连续编号，合计 1760 条。"
        },
        {
          "stage": "check",
          "question": "本仓库底本的规模是？",
          "options": [
            "27 篇 398 条",
            "27 篇 1760 条",
            "22 篇 1122 条",
            "10 卷 512 条"
          ],
          "correct": 1,
          "explanation": "27 篇 · 1760 条 · 71,496 字 · 9 域，可逐条复算。"
        },
        {
          "stage": "check",
          "question": "按本仓库的域划分，条数最多的域是？",
          "options": [
            "太阳病",
            "厥阴病",
            "汗吐下诸可不可",
            "阳明病"
          ],
          "correct": 2,
          "explanation": "汗吐下诸可不可 9 篇 587 条；它是按治法编的专题汇编，不是按病编。"
        },
        {
          "stage": "check",
          "question": "为什么 declared（声明条数）与 actual（实测条数）要分两列存？",
          "options": [
            "为了兼容旧版文件",
            "差异本身是证据：只存一个数就永远不知道当年是谁算错的",
            "因为 JSON 不支持单列",
            "为了让文件更大"
          ],
          "correct": 1,
          "explanation": "本底本 27 篇里有 18 篇两者不一致，分列后差异成为可核对对象。"
        },
        {
          "stage": "post",
          "question": "合格的条号引用应该写成？",
          "options": [
            "第 35 条",
            "《伤寒论·辨太阳病脉证并治中》篇内第 72 条（附底本标识）",
            "卷三第 72 条",
            "葛根汤那条"
          ],
          "correct": 1,
          "explanation": "篇名稳定、条号随底本；不写底本的条号明天可能指向另一条。"
        },
        {
          "stage": "post",
          "question": "1760 条为什么不能当作「1760 个方证」？",
          "options": [
            "因为条文有重复",
            "因为刻本把方后注、煎服法也计入条数",
            "因为有些条是后人加的",
            "因为条数统计错了"
          ],
          "correct": 1,
          "explanation": "条数是编排单位，不是方证数量；混用会把体量误读成内容量。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-chengshu-banben.md",
        "kind": "prompt",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/01-chengshu-banben/outputs/prompt-chengshu-banben.md",
        "title": "伤寒条号引用器",
        "description": null,
        "chars": 593,
        "body": "# 伤寒条号引用器\n\n## 用途\n\n把一句「伤寒第 N 条」补成可核对的引用：定位到**篇 + 篇内条号 + 底本标识**，并给出原文。\n用于**论文与讲稿引文核对、备课、条文检索**。不做方证推演。\n\n## 提示词\n\n```text\n你是伤寒论文献的引文核对助手。下面是文稿里的条文引用。\n\n规则：\n1. 每条引用必须写成「《伤寒论·篇名》篇内第 N 条 + 底本标识」；缺底本标识就标「不可复核」。\n2. 未经确认属于宋本 398 条编号的，不许写「第 N 条」这个裸编号。\n3. 引文必须逐字返回检索到的原文，不改写、不节略而不标注；节略处以「……」标示。\n4. 一条引用同时命中多篇（如「辨太阳病脉证并治」可指上/中/下/提纲起）时，全部列出，让人选定。\n5. 禁止补写条文里没有的症状或方名。\n\n输出格式：\n【原引】…\n【定位】《伤寒论·X》篇内第 N 条｜底本：…\n【原文】…\n【歧义】…（无则写「无」）\n【不可复核项】…\n```\n\n## 使用示例\n\n输入：「伤寒第 72 条：太阳与阳明合病，葛根汤主之。」\n\n输出：【定位】《伤寒论·辨太阳病脉证并治中》篇内第 72 条（本仓库底本）\n【原文】太阳与阳明合病者，必自下利，葛根汤主之。（后接方后注）\n【歧义】若按宋本 398 条体系，同一条文的编号不同，须先确认底本。\n\n## 为什么这样限制\n\n- 要求底本标识：条号是版本属性，不标底本就无法复核。\n- 歧义全列：太阳病有 4 篇，篇名片段相同，单选等于替人做决定。\n- 原文逐字：改写的「条文」既不能核对，也不能当证据。\n"
      },
      {
        "name": "skill-chengshu-banben.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/01-chengshu-banben/outputs/skill-chengshu-banben.md",
        "title": "chengshu-banben",
        "description": "伤寒条文引用核对：补到篇+篇内条号+底本标识，原文逐字返回，歧义全列",
        "chars": 556,
        "body": "---\nname: chengshu-banben\ndescription: 伤寒条文引用核对：补到篇+篇内条号+底本标识，原文逐字返回，歧义全列\nversion: 0.1.0\n---\n\n# chengshu-banben\n\n## 何时使用\n\n- 文稿里出现「伤寒第 N 条」，需要确认底本与篇次\n- 备课检索条文原文（含方后注）\n- 发现同一句在两本书里编号不同，需要留下版本说明\n\n## 不适用\n\n- 需要方证推演或剂量折算（另章）\n- 只记得条文大意、没有任何原文词句时（此时应写「不可复核」）\n- 需要宋本 398 条与底本的逐条映射（本仓库未建该映射表）\n\n## 步骤\n\n1. **取原文特征词**（如「太阳与阳明合病」），不要用编号当唯一线索。\n2. **检索篇**：命中多篇则全列（太阳病有上/中/下/提纲起四篇）。\n3. **定条号**：篇内连续编号；同时记 declared 与 actual 条数是否一致。\n4. **标底本**：写明识别古籍刻本 version 与三级对象编号。\n5. **逐字返原文**，节略处标「……」；方后注单列。\n\n## 输出模板\n\n```text\n【定位】《伤寒论·X》篇内第 N 条｜底本：…\n【原文】…\n【方后注】…（无则写「无」）\n【歧义】…\n```\n\n## 质量判据\n\n- 每条引用都带底本标识\n- 没有裸编号（「第 35 条」这种）\n- 原文与方后注分开，节略有标记\n\n> 本技能输出为文献核对辅助，不构成诊疗建议。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "01-zhongyi/07-shanghanlun/02-liujing-kuangjia": {
    "key": "01-zhongyi/07-shanghanlun/02-liujing-kuangjia",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "07-shanghanlun",
    "subjectTitle": "伤寒论",
    "chapterSlug": "02-liujing-kuangjia",
    "n": 2,
    "title": "第 2 章 · 六经辨证的框架：五条提纲，一条失踪",
    "motto": "「太阳之为病，脉浮，头项强痛而恶寒。」——《伤寒论·辨太阳病脉证并治》",
    "problem": "教材讲六经，一张表六行排得整整齐齐。你打开底本逐篇找提纲条，找到五条，第六行（少阴）怎么找都没有——于是你把「少阴之为病，脉微细，但欲寐也」按记忆写了进去。",
    "roots": "环境逼迫(讲义要一张六经表) + 知识积累(逐条核录 × 缺项标注 = 一张能说明「哪一行没证据」的表)",
    "html": "<h1 id=\"第-2-章-六经辨证的框架-五条提纲-一条失踪\">第 2 章 · 六经辨证的框架：五条提纲，一条失踪</h1>\n<blockquote><p><strong>MOTTO:</strong> 「太阳之为病，脉浮，头项强痛而恶寒。」——《伤寒论·辨太阳病脉证并治》</p>\n<p><strong>PROBLEM:</strong> 教材讲六经，一张表六行排得整整齐齐。你打开底本逐篇找提纲条，找到五条，第六行（少阴）怎么找都没有——于是你把「少阴之为病，脉微细，但欲寐也」按记忆写了进去。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(讲义要一张六经表) + 知识积累(逐条核录 × 缺项标注 = 一张能说明「哪一行没证据」的表)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>伤寒论</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>02 / 12</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>逐字引对五条提纲（太阳、阳明、少阳、太阴、厥阴），并说出各自的<strong>判据落点</strong></li><li>说清「提纲条」在文本里的角色：它是一经的<strong>入口条件</strong>，不是该经的全部</li><li>用实测数据说明底本缺哪一经的正文，以及缺的证据长什么样</li><li>写一个可核性检查器：对每一经输出「提纲条有无 / 篇数 / 条数 / 方名命中」</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"五条提纲-逐字如下\">五条提纲，逐字如下</h3>\n<blockquote><p>太阳之为病，脉浮，头项强痛而恶寒。——《伤寒论·辨太阳病脉证并治》（篇 4 第 1 条）</p>\n<p>阳明之为病，胃家实，一作寒是也。——《伤寒论·辨阳明病脉证并治》（篇 9 第 2 条）</p>\n<p>少阳之为病，口苦咽干，目眩也。——《伤寒论·辨少阳病脉证并治》（篇 11 第 1 条）</p>\n<p>太阴之为病，腹满而吐，食不下，自利益甚，时腹自痛，下之必胸下结硬。——《伤寒论·辨太阴病脉证并治》（篇 23 第 1 条）</p>\n<p>厥阴之为病，消渴，气上撞心，心中疼热，饥而不欲食，食则吐蛔，下之利不止。——《伤寒论·辨厥阴病脉证并治》（篇 24 第 1 条）</p></blockquote>\n<p>注意两处文本细节，都不是笔误：阳明条的「一作寒是也」是<strong>夹注</strong>（异文），太阴条在篇 27 写作「若下之，必胸下结硬」——同一句两个版本，说明底本是拼合本。</p>\n<h3 id=\"少阴-目录里有-正文没有\">少阴：目录里有，正文没有</h3>\n<p>底本第 12 篇（标注为太阴病）的七条内容，全是卷首与目录：</p>\n<blockquote><p>辨太阴病脉证并治第十 辨少阴病脉证并治第十一 辨厥阴病脉证并治第十二……伤寒论卷第七……宋林亿校正，明赵开美校刻，沉琳仝校。</p></blockquote>\n<p>也就是说，<strong>「辨少阴病脉证并治第十一」这个篇名在底本里只以目录行的形式出现</strong>，正文未收。实测佐证（全库检索）：</p>\n<div class=\"table-wrap\"><table><thead><tr><th>检索对象</th><th>命中</th></tr></thead><tbody><tr><td>「少阴之为病」</td><td><strong>0</strong></td></tr><tr><td>「但欲寐」</td><td><strong>0</strong></td></tr><tr><td>「麻黄附子细辛汤」</td><td><strong>0</strong></td></tr><tr><td>「黄连阿胶汤」</td><td><strong>0</strong></td></tr></tbody></table></div>\n<p>四类少阴标志物全为 0，不是「少」而是「无」。所以本章的六经表只能有五行可核，第六行必须标缺——这一格不是待办，是<strong>证据缺口</strong>。</p>\n<h3 id=\"提纲条不是全部\">提纲条不是全部</h3>\n<p>太阳病 566 条（4 篇）、阳明 134 条（2 篇）、少阳 64 条（3 篇）、厥阴 30 条（1 篇）；而太阴真正可用的只有 1 条提纲 + 篇 27 混编里的少量条文。条数差异本身就是信息：太阳篇占全书条文的三分之一，厥阴篇只有 30 条——<strong>详略不均，是整理本的痕迹，不是病证本身的权重</strong>。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">// code/main.js：逐经输出 {提纲条, 篇数, 条数, 关键方命中, 状态}\nconst OUTLINE = { 太阳: '太阳之为病', 阳明: '阳明之为病', 少阳: '少阳之为病', 太阴: '太阴之为病', 厥阴: '厥阴之为病' };\n// 1) 按域汇总篇数与条数\n// 2) 逐经检索提纲条与标志方，返回 ok / missing\n// 3) 少阴单独列为 MIA，并核对四个标志物是否真为 0</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：五行 <code>status: 'ok'</code>；<code>少阴</code> 输出 <code>MIA</code> 且 <code>probes</code> 四项全 0；<code>太阴</code> 篇数 3 但 <code>usableTiao</code> 显著小于 <code>tiao</code>（因为篇 12 是目录残片）。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>框架不等于辨证</strong>。六经表回答「这一经的入口条件是什么」，不回答「这个病人属哪经」。</li><li><strong>缺口不能靠记忆补</strong>。少阴条文本章一律不引，任何需要少阴原文的推理都标「待补源」。</li><li><strong>篇域标签不可全信</strong>。底本的 <code>domain</code> 字段有错配（篇 27 标太阴、实为混编；篇 24 标厥阴、第 2 条起出现「少阴病」），本章只用标签做分组，不做结论。</li><li><strong>提纲条的版本差异</strong>（阳明夹注、太阴「若/必」）保留原样，不取「更好的那个」。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 全部条文引自仓库内 <code>standards/shanghan/底本.json</code>（源为桌面整理本，可复核）；本章只做文本结构与可核性核对，不构成辨证论治指导。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>篇 27 有 186 条，但太阴候选只有 3 条。请列出你把某条判为「非太阴」的依据。</li><li>「胃家实，一作寒是也」里的夹注如果被删除，阳明提纲的判据会变吗？</li><li>少阴四类标志物全为 0，能否推出「底本不含少阴病内容」？还有哪些可能？</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>一张表最怕的不是缺一行，而是缺了还画满。六经框架在教材里之所以整齐，是因为整理者把不同来源拼在一起时补了缺——本章把补的那一笔擦掉，让你看见接口在哪。</p>",
    "markdown": "# 第 2 章 · 六经辨证的框架：五条提纲，一条失踪\n\n> **MOTTO:** 「太阳之为病，脉浮，头项强痛而恶寒。」——《伤寒论·辨太阳病脉证并治》\n>\n> **PROBLEM:** 教材讲六经，一张表六行排得整整齐齐。你打开底本逐篇找提纲条，找到五条，第六行（少阴）怎么找都没有——于是你把「少阴之为病，脉微细，但欲寐也」按记忆写了进去。\n>\n> **双根因定位:** 环境逼迫(讲义要一张六经表) + 知识积累(逐条核录 × 缺项标注 = 一张能说明「哪一行没证据」的表)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 伤寒论 |\n| 院系 | 中医系 |\n| 章序号 | 02 / 12 |\n| 所属阶段 | 🌿 长·积累 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 3 小时 |\n\n## 学习目标\n\n- 逐字引对五条提纲（太阳、阳明、少阳、太阴、厥阴），并说出各自的**判据落点**\n- 说清「提纲条」在文本里的角色：它是一经的**入口条件**，不是该经的全部\n- 用实测数据说明底本缺哪一经的正文，以及缺的证据长什么样\n- 写一个可核性检查器：对每一经输出「提纲条有无 / 篇数 / 条数 / 方名命中」\n\n## 核心概念\n\n### 五条提纲，逐字如下\n\n> 太阳之为病，脉浮，头项强痛而恶寒。——《伤寒论·辨太阳病脉证并治》（篇 4 第 1 条）\n>\n> 阳明之为病，胃家实，一作寒是也。——《伤寒论·辨阳明病脉证并治》（篇 9 第 2 条）\n>\n> 少阳之为病，口苦咽干，目眩也。——《伤寒论·辨少阳病脉证并治》（篇 11 第 1 条）\n>\n> 太阴之为病，腹满而吐，食不下，自利益甚，时腹自痛，下之必胸下结硬。——《伤寒论·辨太阴病脉证并治》（篇 23 第 1 条）\n>\n> 厥阴之为病，消渴，气上撞心，心中疼热，饥而不欲食，食则吐蛔，下之利不止。——《伤寒论·辨厥阴病脉证并治》（篇 24 第 1 条）\n\n注意两处文本细节，都不是笔误：阳明条的「一作寒是也」是**夹注**（异文），太阴条在篇 27 写作「若下之，必胸下结硬」——同一句两个版本，说明底本是拼合本。\n\n### 少阴：目录里有，正文没有\n\n底本第 12 篇（标注为太阴病）的七条内容，全是卷首与目录：\n\n> 辨太阴病脉证并治第十 辨少阴病脉证并治第十一 辨厥阴病脉证并治第十二……伤寒论卷第七……宋林亿校正，明赵开美校刻，沉琳仝校。\n\n也就是说，**「辨少阴病脉证并治第十一」这个篇名在底本里只以目录行的形式出现**，正文未收。实测佐证（全库检索）：\n\n| 检索对象 | 命中 |\n|---|--:|\n| 「少阴之为病」 | **0** |\n| 「但欲寐」 | **0** |\n| 「麻黄附子细辛汤」 | **0** |\n| 「黄连阿胶汤」 | **0** |\n\n四类少阴标志物全为 0，不是「少」而是「无」。所以本章的六经表只能有五行可核，第六行必须标缺——这一格不是待办，是**证据缺口**。\n\n### 提纲条不是全部\n\n太阳病 566 条（4 篇）、阳明 134 条（2 篇）、少阳 64 条（3 篇）、厥阴 30 条（1 篇）；而太阴真正可用的只有 1 条提纲 + 篇 27 混编里的少量条文。条数差异本身就是信息：太阳篇占全书条文的三分之一，厥阴篇只有 30 条——**详略不均，是整理本的痕迹，不是病证本身的权重**。\n\n## BUILD IT：从零实现\n\n```js\n// code/main.js：逐经输出 {提纲条, 篇数, 条数, 关键方命中, 状态}\nconst OUTLINE = { 太阳: '太阳之为病', 阳明: '阳明之为病', 少阳: '少阳之为病', 太阴: '太阴之为病', 厥阴: '厥阴之为病' };\n// 1) 按域汇总篇数与条数\n// 2) 逐经检索提纲条与标志方，返回 ok / missing\n// 3) 少阴单独列为 MIA，并核对四个标志物是否真为 0\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：五行 `status: 'ok'`；`少阴` 输出 `MIA` 且 `probes` 四项全 0；`太阴` 篇数 3 但 `usableTiao` 显著小于 `tiao`（因为篇 12 是目录残片）。\n\n## 代价与边界\n\n- **框架不等于辨证**。六经表回答「这一经的入口条件是什么」，不回答「这个病人属哪经」。\n- **缺口不能靠记忆补**。少阴条文本章一律不引，任何需要少阴原文的推理都标「待补源」。\n- **篇域标签不可全信**。底本的 `domain` 字段有错配（篇 27 标太阴、实为混编；篇 24 标厥阴、第 2 条起出现「少阴病」），本章只用标签做分组，不做结论。\n- **提纲条的版本差异**（阳明夹注、太阴「若/必」）保留原样，不取「更好的那个」。\n\n> **免责声明：** 全部条文引自仓库内 `standards/shanghan/底本.json`（源为桌面整理本，可复核）；本章只做文本结构与可核性核对，不构成辨证论治指导。\n\n## 练习\n\n1. 篇 27 有 186 条，但太阴候选只有 3 条。请列出你把某条判为「非太阴」的依据。\n2. 「胃家实，一作寒是也」里的夹注如果被删除，阳明提纲的判据会变吗？\n3. 少阴四类标志物全为 0，能否推出「底本不含少阴病内容」？还有哪些可能？\n\n## 进阶思考\n\n一张表最怕的不是缺一行，而是缺了还画满。六经框架在教材里之所以整齐，是因为整理者把不同来源拼在一起时补了缺——本章把补的那一笔擦掉，让你看见接口在哪。\n",
    "code": {
      "main.js": "'use strict';\r\n/**\r\n * 六经可核性检查：《伤寒论》底本逐经给出 {提纲条, 篇数, 条数, 方命中, 状态}\r\n *\r\n *   node code/main.js\r\n *\r\n * 设计：\r\n *   1. 只按 domain 字段分组统计规模，不对「属哪经」下判断 —— 底本的域标签有错配。\r\n *   2. 提纲条用逐字检索，不做同义扩展；找不到就是 MIA，不许用记忆补。\r\n *   3. MIA 的经必须同时报「标志物全 0」的探针结果，让缺口可复核而不只是「没找到」。\r\n */\r\n\r\nconst path = require('node:path');\r\nconst fs = require('node:fs');\r\n\r\nconst ROOT = path.resolve(__dirname, '../../../../../..');\r\nconst BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));\r\n\r\n/** 六经：提纲条首句 + 用来验证「这一经真的在库里」的标志方 */\r\nconst JING = [\r\n  { name: '太阳', outline: '太阳之为病', probes: ['桂枝汤', '麻黄汤'] },\r\n  { name: '阳明', outline: '阳明之为病', probes: ['大承气汤', '调胃承气汤'] },\r\n  { name: '少阳', outline: '少阳之为病', probes: ['小柴胡汤'] },\r\n  { name: '太阴', outline: '太阴之为病', probes: ['理中丸'] },\r\n  { name: '少阴', outline: '少阴之为病', probes: ['麻黄附子细辛汤', '黄连阿胶汤', '但欲寐'] },\r\n  { name: '厥阴', outline: '厥阴之为病', probes: ['乌梅丸', '当归四逆汤'] },\r\n];\r\n\r\nconst ITEMS = [];\r\nfor (const p of BOOK.pian) {\r\n  for (const it of p.items) ITEMS.push({ pian: p.no, pianName: p.pian, domain: p.domain, text: it.text });\r\n}\r\n\r\nconst count = (needle) => ITEMS.filter((i) => i.text.includes(needle)).length;\r\n\r\n/** 逐经检查。status: ok（提纲+至少一个标志物）/ weak（有提纲，标志物缺）/ MIA（提纲缺） */\r\nfunction audit() {\r\n  return JING.map((j) => {\r\n    const outlineHits = ITEMS.filter((i) => i.text.includes(j.outline));\r\n    const pianSet = new Set();\r\n    for (const h of outlineHits) pianSet.add(h.pian);\r\n    const tiao = ITEMS.filter((i) => i.domain === `${j.name}病`).length;\r\n    const pian = new Set(ITEMS.filter((i) => i.domain === `${j.name}病`).map((i) => i.pian)).size;\r\n    const probes = j.probes.map((p) => ({ probe: p, hits: count(p) }));\r\n    const anyProbe = probes.some((p) => p.hits > 0);\r\n    const status = outlineHits.length === 0 ? 'MIA' : anyProbe ? 'ok' : 'weak';\r\n    return {\r\n      name: j.name,\r\n      status,\r\n      tiao,\r\n      pian,\r\n      outline: outlineHits.length ? outlineHits[0].text : null,\r\n      outlineAt: outlineHits.length ? `篇${outlineHits[0].pian}` : null,\r\n      probes,\r\n    };\r\n  });\r\n}\r\n\r\nfunction main() {\r\n  const rows = audit();\r\n  console.log('六经可核性（底本 27 篇 / 逐字检索，不用记忆补缺）\\n');\r\n  console.log('经    状态  条数  篇数  提纲条位置  提纲首句');\r\n  for (const r of rows) {\r\n    const head = r.outline ? r.outline.slice(0, 18) + '…' : '——（检索不到）';\r\n    console.log(`${r.name}  ${r.status.padEnd(5)} ${String(r.tiao).padStart(4)}  ${String(r.pian).padStart(3)}   ${String(r.outlineAt || '-').padEnd(8)} ${head}`);\r\n  }\r\n  const mia = rows.filter((r) => r.status !== 'ok');\r\n  console.log('\\n不可用/偏弱的经：');\r\n  for (const r of mia) {\r\n    const zero = r.probes.filter((p) => p.hits === 0).map((p) => p.probe);\r\n    console.log(`  · ${r.name}（${r.status}）标志物零命中：${zero.join('、') || '无'}`);\r\n  }\r\n  console.log('\\n口径：条数按 domain 字段分组，底本域标签存在错配，故条数只表规模、不表归属。');\r\n  console.log('本输出为文本结构核对，不构成辨证指导。');\r\n}\r\n\r\nif (require.main === module) main();\r\nmodule.exports = { JING, ITEMS, count, audit, BOOK };\r\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { audit, count, ITEMS } = require('./main.js');\n\nconst rows = audit();\nconst by = (n) => rows.find((r) => r.name === n);\n\ntest('五经有提纲条，少阴 MIA', () => {\n  assert.deepStrictEqual(rows.map((r) => r.status), ['ok', 'ok', 'ok', 'ok', 'MIA', 'ok']);\n  assert.strictEqual(by('少阴').outline, null);\n});\n\ntest('少阴三标志物全 0 命中（缺口可复核）', () => {\n  const p = by('少阴').probes;\n  assert.deepStrictEqual(p.map((x) => x.hits), [0, 0, 0]);\n  assert.strictEqual(count('少阴之为病'), 0);\n});\n\ntest('规模：太阳 566/4 篇、阳明 134/2、少阳 64/3、太阴 194/3、厥阴 30/1', () => {\n  assert.deepStrictEqual([by('太阳').tiao, by('太阳').pian], [566, 4]);\n  assert.deepStrictEqual([by('阳明').tiao, by('阳明').pian], [134, 2]);\n  assert.deepStrictEqual([by('少阳').tiao, by('少阳').pian], [64, 3]);\n  assert.deepStrictEqual([by('太阴').tiao, by('太阴').pian], [194, 3]);\n  assert.deepStrictEqual([by('厥阴').tiao, by('厥阴').pian], [30, 1]);\n});\n\ntest('提纲条逐字可取，含异文夹注与两版「若/必」', () => {\n  assert.match(by('阳明').outline, /胃家实，一作寒是也/);\n  assert.match(by('太阴').outline, /下之必胸下结硬/);\n  assert.match(by('厥阴').outline, /食则吐蛔/);\n});\n\ntest('提纲条不与域标签混淆：篇 24 记为厥阴纲，但其中含「少阴病」条文', () => {\n  const p24 = ITEMS.filter((i) => i.pian === 24);\n  assert.ok(p24.some((i) => i.text.includes('少阴病')), '篇24 应混入少阴条');\n  assert.ok(p24.length >= 30);\n});\n\ntest('少阴在库里连「篇名」都只以目录行出现（篇 12）', () => {\n  const p12 = ITEMS.filter((i) => i.pian === 12).map((i) => i.text).join('');\n  assert.ok(p12.includes('辨少阴病脉证并治'), '目录行应含少阴篇名');\n  assert.strictEqual(ITEMS.filter((i) => i.pian === 12 && i.text.includes('少阴之为病')).length, 0);\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "「太阳之为病」的提纲条原文是？",
          "options": [
            "脉浮，头项强痛而恶寒",
            "脉浮紧，发热无汗",
            "脉浮缓，汗出恶风",
            "脉浮，身重，汗出恶风"
          ],
          "correct": 0,
          "explanation": "提纲条给的是入口条件，不是麻黄汤/桂枝汤的方证。"
        },
        {
          "stage": "check",
          "question": "底本里「少阴之为病」「但欲寐」「麻黄附子细辛汤」「黄连阿胶汤」的检索结果是？",
          "options": [
            "各有 1–2 条",
            "全部 0 命中",
            "只有提纲条命中",
            "只有方名命中"
          ],
          "correct": 1,
          "explanation": "四类标志物全 0，说明少阴篇正文缺失，只有目录行留名。"
        },
        {
          "stage": "check",
          "question": "阳明提纲「胃家实，一作寒是也」中的「一作寒是也」是？",
          "options": [
            "另一条提纲",
            "校勘异文夹注",
            "错简",
            "注家评论"
          ],
          "correct": 1,
          "explanation": "夹注记录异文，不是原文主张；引用时应保留并标注。"
        },
        {
          "stage": "check",
          "question": "底本各经条数分布是？",
          "options": [
            "六经基本均衡",
            "太阳 566 · 阳明 134 · 少阳 64 · 太阴 194 · 厥阴 30 · 少阴 0",
            "厥阴最多",
            "太阴最少"
          ],
          "correct": 1,
          "explanation": "详略极不均，是整理本痕迹；太阴 194 条中含混编篇，实际可用远少于此。"
        },
        {
          "stage": "post",
          "question": "面对少阴缺篇，本章的正确做法是？",
          "options": [
            "按记忆补上「脉微细，但欲寐」",
            "标为证据缺口，需要时写「待补源」",
            "用厥阴篇条文代替",
            "从其他书抄一段"
          ],
          "correct": 1,
          "explanation": "缺口要留痕；补记忆等于制造不可复核的引文。"
        },
        {
          "stage": "post",
          "question": "为何本章的条数统计「只表规模、不表归属」？",
          "options": [
            "因为条数太多",
            "因为底本 domain 标签存在错配（篇 27 标太阴实为混编、篇 24 标厥阴却含少阴条）",
            "因为条号不连续",
            "因为版本不同"
          ],
          "correct": 1,
          "explanation": "标签不可全信，统计只能当规模看。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-liujing-kuangjia.md",
        "kind": "prompt",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/02-liujing-kuangjia/outputs/prompt-liujing-kuangjia.md",
        "title": "六经可核性核对",
        "description": null,
        "chars": 685,
        "body": "# 六经可核性核对\n\n## 用途\n\n在引六经之前先问一句：**这一经在底本里有正文吗？** 输出每经的提纲条、条数、篇数、标志方命中，\n把「缺」标成缺口而不是空白。用于**讲义编写、教材校核、引文前置检查**。\n\n## 提示词\n\n```text\n你是伤寒论文献的核对助手。下面是一个底本（JSON：27 篇，每篇含 items[].text）。\n\n任务：对太阳/阳明/少阳/太阴/少阴/厥阴 逐经输出——\n\n【经名】状态：ok / weak / MIA\n  提纲条：逐字原文 + 所在篇号；找不到写「检索不到」\n  规模：条数（按 domain 分组）/ 篇数\n  标志方：<方名>×命中数\n  线索：若 MIA，列出已检索的标志物（如「少阴之为病」「但欲寐」），并给出命中数\n\n规则：\n1. 提纲条必须逐字取自底本，禁止凭记忆补写；找不到就是 MIA。\n2. 状态判定：提纲条存在且有任一标志方命中 = ok；有提纲但标志方全 0 = weak；无提纲 = MIA。\n3. 条数只表规模，不对「属哪经」下判断（底本 domain 标签有错配）。\n4. 禁止把 MIA 的经用其他篇条文「补全」，也不许跨书引用。\n5. 异文夹注（如「一作寒是也」）与版本差异（「若下之」/「下之必」）原样保留。\n\n输出末尾写一行口径：本核对只做文本结构，不构成辨证指导。\n```\n\n## 使用示例\n\n输入：底本 27 篇。\n\n输出（节选）：\n\n```text\n【少阴】状态：MIA\n  提纲条：检索不到\n  规模：0 条 / 0 篇\n  标志方：麻黄附子细辛汤×0、黄连阿胶汤×0、「但欲寐」×0\n  线索：篇 12 目录行含「辨少阴病脉证并治第十一」，正文未收 → 待补源\n```\n\n## 为什么这样限制\n\n- 缺项若不留痕，下一次引用就会把记忆当原文。\n- 条数与归属分开，是为了不在错配标签上叠加结论。\n"
      },
      {
        "name": "skill-liujing-kuangjia.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/02-liujing-kuangjia/outputs/skill-liujing-kuangjia.md",
        "title": "liujing-kuangjia",
        "description": "六经可核性核对：逐经给提纲条+规模+标志方，缺篇标 MIA 不补记忆",
        "chars": 512,
        "body": "---\nname: liujing-kuangjia\ndescription: 六经可核性核对：逐经给提纲条+规模+标志方，缺篇标 MIA 不补记忆\nversion: 0.1.0\n---\n\n# liujing-kuangjia\n\n## 何时使用\n\n- 写讲义/教材前，确认六经各自在底本里有没有正文\n- 有人引用「某经提纲」时，核对是否为原文\n- 教材与底本对不上，需要把差异定位到「缺篇 / 错配 / 异文」\n\n## 不适用\n\n- 辨证分型（本技能只做文本核对）\n- 跨书汇总（底本之外一律不引）\n- 方证推演\n\n## 步骤\n\n1. **定底本**：确认 JSON/文本来源与篇数，记录底本标识。\n2. **逐经检索提纲条**：逐字，不做同义扩展。\n3. **跑标志方**：每经 1–3 个代表方/关键句，命中数为 0 即证据。\n4. **判状态**：ok / weak / MIA。\n5. **留痕**：MIA 必须写出「已检索什么、命中多少」，供下一手复核。\n\n## 输出模板\n\n```text\n【经名】状态：ok | weak | MIA\n  提纲条：<原文>（篇 N）/ 检索不到\n  规模：N 条 / M 篇\n  标志方：A×n、B×m\n  线索：…\n```\n\n## 质量判据\n\n- 六行都有状态，没有空白格\n- MIA 的经没有任何替代引文\n- 异文与版本差异保留\n\n> 本技能只做文本结构核对，不构成辨证论治指导。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "01-zhongyi/07-shanghanlun/03-taiyang-biao": {
    "key": "01-zhongyi/07-shanghanlun/03-taiyang-biao",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "07-shanghanlun",
    "subjectTitle": "伤寒论",
    "chapterSlug": "03-taiyang-biao",
    "n": 3,
    "title": "第 3 章 · 太阳病表证：有汗与无汗之外，还有 129 条「发热」被写成了异体字",
    "motto": "「太阳病，头痛发热，身疼恶风，无汗而喘者，麻黄汤主之。」——《伤寒论·辨太阳病脉证并治中》",
    "problem": "你想统计「发热」在全书出现多少次，用检索工具一查——39 条。可正文里明明到处都是发热。你漏掉的那 124 条，写的是「发𤍠」：𤍠 是一个不在 GB2312 里的异体字。",
    "roots": "环境逼迫(要按症状检索条文) + 知识积累(归一化表 × 判定规则 = 可复核的检索层)",
    "html": "<h1 id=\"第-3-章-太阳病表证-有汗与无汗之外-还有-129-条-发热-被写成了异体字\">第 3 章 · 太阳病表证：有汗与无汗之外，还有 129 条「发热」被写成了异体字</h1>\n<blockquote><p><strong>MOTTO:</strong> 「太阳病，头痛发热，身疼恶风，无汗而喘者，麻黄汤主之。」——《伤寒论·辨太阳病脉证并治中》</p>\n<p><strong>PROBLEM:</strong> 你想统计「发热」在全书出现多少次，用检索工具一查——39 条。可正文里明明到处都是发热。你漏掉的那 124 条，写的是「发𤍠」：𤍠 是一个不在 GB2312 里的异体字。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(要按症状检索条文) + 知识积累(归一化表 × 判定规则 = 可复核的检索层)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>伤寒论</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>03 / 12</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>4 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>用原文说清太阳表证的两条分支：中风（汗出、脉缓）与伤寒（无汗、脉浮紧、喘）各自的条件</li><li>说出为什么「脉缓」不等于慢，「脉紧」不等于快——它们描述的是紧张度</li><li>建一张异体字归一化表，让「发热」的检索不漏条</li><li>写一个表证判定器：输入症状集，输出分支、代表方与依据条号，并报「不排除项」</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"两条分支的原文条件\">两条分支的原文条件</h3>\n<blockquote><p>太阳病，发热汗出恶风，脉缓者，名为中风。——《伤寒论·辨太阳病脉证并治》（篇 4）</p>\n<p>太阳中风，阳浮而阴弱。阳浮者，热自发，阴弱者汗自出，啬啬恶寒，淅淅恶风，翕翕发热，鼻鸣干呕者，桂枝汤主之。——《伤寒论·辨太阳病脉证并治》（篇 4，方一）</p>\n<p>太阳病，头痛发热，身疼恶风，无汗而喘者，麻黄汤主之。——《伤寒论·辨太阳病脉证并治中》（篇 5）</p></blockquote>\n<p>三条放在一起，「有汗 / 无汗」是分水岭，「脉缓 / 脉浮紧」是佐证，「喘 / 干呕」是旁证。注意桂枝汤条的自我解释：<strong>阳浮者热自发，阴弱者汗自出</strong>——原文自己在给机制，这是《伤寒论》里少见的「条文带注释」写法。</p>\n<h3 id=\"实测规模-本章全部数字可复算\">实测规模（本章全部数字可复算）</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>指标</th><th>实测</th></tr></thead><tbody><tr><td>太阳病域条文</td><td><strong>566 条 / 4 篇</strong></td></tr><tr><td>「桂枝汤」出现</td><td><strong>134 条</strong></td></tr><tr><td>「麻黄汤」出现</td><td><strong>44 条</strong></td></tr><tr><td>「汗出」</td><td><strong>224 条</strong></td></tr><tr><td>「无汗」</td><td><strong>38 条</strong></td></tr><tr><td>「恶寒」</td><td><strong>107 条</strong></td></tr><tr><td>「发热」（正体）</td><td><strong>39 条</strong></td></tr><tr><td>「发𤍠」（异体）</td><td><strong>129 条</strong></td></tr><tr><td>归一后「发热」</td><td><strong>163 条</strong>（129 + 39 − 5 条两形并存）</td></tr></tbody></table></div>\n<p>最后两行的意义：<strong>不归一化，检索「发热」会漏 124 条（43%）</strong>。这不是排版问题，是检索层的正确性问题——你的症状索引会静默丢掉三分之二的证据。</p>\n<h3 id=\"桂枝汤-134-条说明了什么\">桂枝汤 134 条说明了什么</h3>\n<p>桂枝汤出现 134 次，麻黄汤 44 次，比例约 3:1。但这不是「桂枝汤更重要」的证明——桂枝汤大量出现在<strong>禁忌、误治、变证</strong>的条文里（「桂枝汤不中与之」「先与桂枝汤」之类），出现频次高恰恰因为它是基准方，被反复当作对照。用频次当权重，会把「被反复否定」读成「最常用」。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">// code/main.js\nnormalize(text)      // 𤍠→热 等异体归一，返回 {text, replaced}\nsearch(needle)       // 双向检索：raw 命中 vs normalized 命中，报漏检\nclassify({sweat, pulse, dyspnea, vomiting})  // 中风/伤寒/不确定 + 依据</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：<code>search('发热')</code> 返回 raw 39 / normalized 163，漏检 124（129 条含异体，其中 5 条同时含正体）；<code>classify({sweat: true, pulse: '缓'})</code> → 中风/桂枝汤；<code>classify({sweat: false, pulse: '浮紧', dyspnea: true})</code> → 伤寒/麻黄汤；<code>classify({})</code> → 不确定，且不猜。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>归一化表是手工的，不完整</strong>。本章只收 𤍠→热 一组并附实测影响；其他异体（如「蚘/蛔」「欬/咳」）未纳入，检索结果仍可能漏。</li><li><strong>「脉缓」不是心率慢</strong>。原文语境指脉势缓纵，本章代码只做字符串匹配，<strong>不解析脉象含义</strong>。</li><li><strong>表证判定器只覆盖两条经典分支</strong>。太阳病 566 条里大量是变证、坏病、结胸、痞证，本章不处理；把它当「太阳病分类器」会错。</li><li><strong>频次不是权重</strong>（见上）。</li><li>判定器输出「不排除项」而非单一结论，因为原文本身允许合病（见第 9 章）。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 条文引自仓库内 <code>standards/shanghan/底本.json</code>；该底本使用异体字，本章归一化表仅为检索用途，不改原文。本章不构成处方建议。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>为什么「汗出」224 条远多于「无汗」38 条？给出三种可能解释，并说明如何用条文检验。</li><li>若要给「桂枝汤」的 134 条分类（正方 / 禁忌 / 误治后救逆），你的标注规则怎么写？</li><li>归一把「发𤍠」并到「发热」之后，会不会影响「热」与「𤍠」作为异文的文献学价值？两者如何并存？</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>中医文本的检索难点不在分词，而在<strong>字形</strong>。一个异体字能让 129 条证据消失，而这 129 条恰恰是「发热」最密集的部分——数据工程里最贵的错误，通常不是算法错，是字符没对齐。</p>",
    "markdown": "# 第 3 章 · 太阳病表证：有汗与无汗之外，还有 129 条「发热」被写成了异体字\r\n\r\n> **MOTTO:** 「太阳病，头痛发热，身疼恶风，无汗而喘者，麻黄汤主之。」——《伤寒论·辨太阳病脉证并治中》\r\n>\r\n> **PROBLEM:** 你想统计「发热」在全书出现多少次，用检索工具一查——39 条。可正文里明明到处都是发热。你漏掉的那 124 条，写的是「发𤍠」：𤍠 是一个不在 GB2312 里的异体字。\r\n>\r\n> **双根因定位:** 环境逼迫(要按症状检索条文) + 知识积累(归一化表 × 判定规则 = 可复核的检索层)\r\n\r\n## 课程信息\r\n\r\n| 项目 | 内容 |\r\n|------|------|\r\n| 学科 | 伤寒论 |\r\n| 院系 | 中医系 |\r\n| 章序号 | 03 / 12 |\r\n| 所属阶段 | 🌿 长·积累 |\r\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\r\n| 预估时长 | 4 小时 |\r\n\r\n## 学习目标\r\n\r\n- 用原文说清太阳表证的两条分支：中风（汗出、脉缓）与伤寒（无汗、脉浮紧、喘）各自的条件\r\n- 说出为什么「脉缓」不等于慢，「脉紧」不等于快——它们描述的是紧张度\r\n- 建一张异体字归一化表，让「发热」的检索不漏条\r\n- 写一个表证判定器：输入症状集，输出分支、代表方与依据条号，并报「不排除项」\r\n\r\n## 核心概念\r\n\r\n### 两条分支的原文条件\r\n\r\n> 太阳病，发热汗出恶风，脉缓者，名为中风。——《伤寒论·辨太阳病脉证并治》（篇 4）\r\n>\r\n> 太阳中风，阳浮而阴弱。阳浮者，热自发，阴弱者汗自出，啬啬恶寒，淅淅恶风，翕翕发热，鼻鸣干呕者，桂枝汤主之。——《伤寒论·辨太阳病脉证并治》（篇 4，方一）\r\n>\r\n> 太阳病，头痛发热，身疼恶风，无汗而喘者，麻黄汤主之。——《伤寒论·辨太阳病脉证并治中》（篇 5）\r\n\r\n三条放在一起，「有汗 / 无汗」是分水岭，「脉缓 / 脉浮紧」是佐证，「喘 / 干呕」是旁证。注意桂枝汤条的自我解释：**阳浮者热自发，阴弱者汗自出**——原文自己在给机制，这是《伤寒论》里少见的「条文带注释」写法。\r\n\r\n### 实测规模（本章全部数字可复算）\r\n\r\n| 指标 | 实测 |\r\n|---|--:|\r\n| 太阳病域条文 | **566 条 / 4 篇** |\r\n| 「桂枝汤」出现 | **134 条** |\r\n| 「麻黄汤」出现 | **44 条** |\r\n| 「汗出」 | **224 条** |\r\n| 「无汗」 | **38 条** |\r\n| 「恶寒」 | **107 条** |\r\n| 「发热」（正体） | **39 条** |\r\n| 「发𤍠」（异体） | **129 条** |\r\n| 归一后「发热」 | **163 条**（129 + 39 − 5 条两形并存） |\r\n\r\n最后两行的意义：**不归一化，检索「发热」会漏 124 条（43%）**。这不是排版问题，是检索层的正确性问题——你的症状索引会静默丢掉三分之二的证据。\r\n\r\n### 桂枝汤 134 条说明了什么\r\n\r\n桂枝汤出现 134 次，麻黄汤 44 次，比例约 3:1。但这不是「桂枝汤更重要」的证明——桂枝汤大量出现在**禁忌、误治、变证**的条文里（「桂枝汤不中与之」「先与桂枝汤」之类），出现频次高恰恰因为它是基准方，被反复当作对照。用频次当权重，会把「被反复否定」读成「最常用」。\r\n\r\n## BUILD IT：从零实现\r\n\r\n```js\r\n// code/main.js\r\nnormalize(text)      // 𤍠→热 等异体归一，返回 {text, replaced}\r\nsearch(needle)       // 双向检索：raw 命中 vs normalized 命中，报漏检\r\nclassify({sweat, pulse, dyspnea, vomiting})  // 中风/伤寒/不确定 + 依据\r\n```\r\n\r\n## 验证\r\n\r\n```bash\r\nnode code/main.js\r\nnode --test code/main.test.js\r\n```\r\n\r\n预期：`search('发热')` 返回 raw 39 / normalized 163，漏检 124（129 条含异体，其中 5 条同时含正体）；`classify({sweat: true, pulse: '缓'})` → 中风/桂枝汤；`classify({sweat: false, pulse: '浮紧', dyspnea: true})` → 伤寒/麻黄汤；`classify({})` → 不确定，且不猜。\r\n\r\n## 代价与边界\r\n\r\n- **归一化表是手工的，不完整**。本章只收 𤍠→热 一组并附实测影响；其他异体（如「蚘/蛔」「欬/咳」）未纳入，检索结果仍可能漏。\r\n- **「脉缓」不是心率慢**。原文语境指脉势缓纵，本章代码只做字符串匹配，**不解析脉象含义**。\r\n- **表证判定器只覆盖两条经典分支**。太阳病 566 条里大量是变证、坏病、结胸、痞证，本章不处理；把它当「太阳病分类器」会错。\r\n- **频次不是权重**（见上）。\r\n- 判定器输出「不排除项」而非单一结论，因为原文本身允许合病（见第 9 章）。\r\n\r\n> **免责声明：** 条文引自仓库内 `standards/shanghan/底本.json`；该底本使用异体字，本章归一化表仅为检索用途，不改原文。本章不构成处方建议。\r\n\r\n## 练习\r\n\r\n1. 为什么「汗出」224 条远多于「无汗」38 条？给出三种可能解释，并说明如何用条文检验。\r\n2. 若要给「桂枝汤」的 134 条分类（正方 / 禁忌 / 误治后救逆），你的标注规则怎么写？\r\n3. 归一把「发𤍠」并到「发热」之后，会不会影响「热」与「𤍠」作为异文的文献学价值？两者如何并存？\r\n\r\n## 进阶思考\r\n\r\n中医文本的检索难点不在分词，而在**字形**。一个异体字能让 129 条证据消失，而这 129 条恰恰是「发热」最密集的部分——数据工程里最贵的错误，通常不是算法错，是字符没对齐。\r\n",
    "code": {
      "main.js": "'use strict';\r\n/**\r\n * 太阳病表证：异体字归一化检索 + 中风/伤寒分支判定\r\n *\r\n *   node code/main.js\r\n *\r\n * 口径：\r\n *   · 归一化只用于**检索**，不回写原文；替换次数单独报，便于核对。\r\n *   · 判定只覆盖原文给出的两条经典分支（汗出脉缓 / 无汗脉浮紧），\r\n *     其余情况一律「不确定」，不硬分。\r\n *   · 频次≠权重：桂枝汤 134 条里含大量禁忌与误治条，代码只报数不排序。\r\n */\r\n\r\nconst path = require('node:path');\r\nconst fs = require('node:fs');\r\n\r\nconst ROOT = path.resolve(__dirname, '../../../../../..');\r\nconst BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));\r\nconst TEXTS = [];\r\nfor (const p of BOOK.pian) for (const it of p.items) TEXTS.push({ pian: p.no, text: it.text });\r\n\r\n/** 异体字 → 正体（本章只收实测影响最大的一组，其余标注未纳入） */\r\nconst VARIANTS = { '𤍠': '热', '蚘': '蛔', '欬': '咳' };\r\n\r\nfunction normalize(text) {\r\n  let out = text;\r\n  const replaced = {};\r\n  for (const [from, to] of Object.entries(VARIANTS)) {\r\n    const n = out.split(from).length - 1;\r\n    if (n) { replaced[from] = n; out = out.split(from).join(to); }\r\n  }\r\n  return { text: out, replaced };\r\n}\r\n\r\n/** 检索：raw（原样）与 normalized（归一后）两种命中数，差即漏检 */\r\nfunction search(needle) {\r\n  const raw = TEXTS.filter((t) => t.text.includes(needle)).length;\r\n  const norm = TEXTS.filter((t) => normalize(t.text).text.includes(needle)).length;\r\n  return { needle, raw, normalized: norm, missed: norm - raw };\r\n}\r\n\r\n/** 表证分支判定：只认原文条件 */\r\nfunction classify(signs = {}) {\r\n  const { sweat, pulse, dyspnea, vomiting } = signs;\r\n  const base = { sweat: !!sweat, pulse: pulse || null, dyspnea: !!dyspnea, vomiting: !!vomiting };\r\n  const unclear = (why) => ({ branch: '不确定', formula: null, why, ...base, notExcluded: ['合病（见第 9 章）', '变证/坏病'] });\r\n\r\n  if (sweat === undefined || pulse === undefined) return unclear('缺关键条件：汗出与否、脉象');\r\n  if (sweat === true && pulse === '缓') {\r\n    return { branch: '太阳中风', formula: '桂枝汤', why: '发热汗出恶风，脉缓（篇 4）', ...base, notExcluded: ['若兼喘满，须排除合病'] };\r\n  }\r\n  if (sweat === false && pulse === '浮紧' && dyspnea) {\r\n    return { branch: '太阳伤寒', formula: '麻黄汤', why: '无汗而喘，脉浮紧（篇 5）', ...base, notExcluded: ['若烦躁，原文另有分支（大青龙汤条）'] };\r\n  }\r\n  return unclear('条件不落在两条经典分支内');\r\n}\r\n\r\nfunction main() {\r\n  console.log('检索：raw 命中 vs 归一化命中（差 = 因异体字漏掉的条数）\\n');\r\n  for (const n of ['发热', '汗出', '无汗', '恶寒']) {\r\n    const r = search(n);\r\n    console.log(`  ${n}：raw ${r.raw} → 归一后 ${r.normalized}（漏检 ${r.missed}）`);\r\n  }\r\n  const domainTiao = BOOK.pian.filter((x) => x.domain === '太阳病').reduce((a, x) => a + x.actual.tiao, 0);\r\n  const mention = TEXTS.filter((t) => t.text.includes('太阳')).length;\r\n  console.log(`\\n规模：太阳病域 ${domainTiao} 条（4 篇）· 正文提及「太阳」${mention} 条；` +\r\n    `桂枝汤 ${search('桂枝汤').raw} 条 · 麻黄汤 ${search('麻黄汤').raw} 条（频次≠权重）`);\r\n\r\n  console.log('\\n判定样例：');\r\n  for (const s of [{ sweat: true, pulse: '缓' }, { sweat: false, pulse: '浮紧', dyspnea: true }, {}]) {\r\n    const r = classify(s);\r\n    console.log(`  ${JSON.stringify(s)} → ${r.branch}${r.formula ? '/' + r.formula : ''}`);\r\n  }\r\n  console.log('\\n本输出为文本检索与规则演示，不构成辨证处方建议。');\r\n}\r\n\r\nif (require.main === module) main();\r\nmodule.exports = { normalize, search, classify, VARIANTS, TEXTS, BOOK };\r\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { normalize, search, classify } = require('./main.js');\n\ntest('归一化：异体 𤍠 → 热，并报替换次数', () => {\n  const r = normalize('发𤍠恶寒，发𤍠而喘');\n  assert.strictEqual(r.text, '发热恶寒，发热而喘');\n  assert.deepStrictEqual(r.replaced, { '𤍠': 2 });\n});\n\ntest('检索「发热」：raw 39 → 归一 163，漏检 124', () => {\n  const r = search('发热');\n  assert.strictEqual(r.raw, 39);\n  assert.strictEqual(r.normalized, 163);\n  assert.strictEqual(r.missed, 124);\n});\n\ntest('不受异体字影响的关键词漏检为 0', () => {\n  for (const k of ['汗出', '无汗', '恶寒']) assert.strictEqual(search(k).missed, 0, k);\n});\n\ntest('表证分支：汗出脉缓 → 中风/桂枝汤；无汗脉浮紧而喘 → 伤寒/麻黄汤', () => {\n  const a = classify({ sweat: true, pulse: '缓' });\n  assert.strictEqual(a.branch, '太阳中风');\n  assert.strictEqual(a.formula, '桂枝汤');\n  const b = classify({ sweat: false, pulse: '浮紧', dyspnea: true });\n  assert.strictEqual(b.branch, '太阳伤寒');\n  assert.strictEqual(b.formula, '麻黄汤');\n});\n\ntest('条件不足或不合分支时不硬分，且给出不排除项', () => {\n  const r = classify({});\n  assert.strictEqual(r.branch, '不确定');\n  assert.strictEqual(r.formula, null);\n  assert.ok(r.notExcluded.length >= 2);\n  assert.strictEqual(classify({ sweat: true, pulse: '浮紧' }).branch, '不确定');\n});\n\ntest('频次只报数：桂枝汤 134 条、麻黄汤 44 条（不可当权重）', () => {\n  assert.strictEqual(search('桂枝汤').raw, 134);\n  assert.strictEqual(search('麻黄汤').raw, 44);\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "太阳表证中「中风」与「伤寒」的分水岭是？",
          "options": [
            "有无发热",
            "汗出与无汗（配合脉缓 / 脉浮紧）",
            "病程长短",
            "体质强弱"
          ],
          "correct": 1,
          "explanation": "原文：发热汗出恶风，脉缓者，名为中风；无汗而喘，脉浮紧者属伤寒分支。"
        },
        {
          "stage": "check",
          "question": "底本里检索「发热」只命中 39 条，原因是？",
          "options": [
            "条文确实只有 39 条讲发热",
            "129 条写作异体「发𤍠」，未归一化故漏检 124 条",
            "检索工具坏了",
            "其余条在别篇"
          ],
          "correct": 1,
          "explanation": "39 正体 + 129 异体，5 条两形并存，归一后 163 条。"
        },
        {
          "stage": "check",
          "question": "「脉缓」的原意最接近？",
          "options": [
            "心率慢",
            "脉势缓纵、紧张度低（与脉紧相对）",
            "脉搏微弱",
            "节律不齐"
          ],
          "correct": 1,
          "explanation": "缓/紧描述紧张度，不是频率；代码只做字符串匹配，不解析脉象。"
        },
        {
          "stage": "check",
          "question": "桂枝汤 134 条 vs 麻黄汤 44 条，正确解读是？",
          "options": [
            "桂枝汤更重要",
            "频次含大量禁忌与误治对照条，不能当权重",
            "麻黄汤已淘汰",
            "两方等价"
          ],
          "correct": 1,
          "explanation": "出现多常因被反复引用作对照，频次≠临床权重。"
        },
        {
          "stage": "post",
          "question": "判定器遇到「汗出 + 脉浮紧」时应该？",
          "options": [
            "归为中风",
            "归为伤寒",
            "输出不确定并给不排除项",
            "任选一个"
          ],
          "correct": 2,
          "explanation": "不落在两条经典分支内，不许硬分。"
        },
        {
          "stage": "post",
          "question": "归一化表建好之后，原文要不要一起改成正体？",
          "options": [
            "要，统一字形便于检索",
            "不要，原文保留异体，归一化只作用于检索层",
            "只改标题",
            "看情况"
          ],
          "correct": 1,
          "explanation": "异体本身是文献信息；改写原文会毁掉可复核性。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-taiyang-biao.md",
        "kind": "prompt",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/03-taiyang-biao/outputs/prompt-taiyang-biao.md",
        "title": "经文症状检索（含异体字归一）",
        "description": null,
        "chars": 633,
        "body": "# 经文症状检索（含异体字归一）\n\n## 用途\n\n在《伤寒论》底本上按症状检索条文，并**显式报出因异体字漏掉的条数**。\n用于**引文核对、方证条文收集、教材与底本比对**。不做辨证结论。\n\n## 提示词\n\n```text\n你是伤寒论文本的检索助手。底本为 JSON（27 篇，每篇 items[].text），\n该底本混用异体字（如「𤍠」用于「热」）。\n\n任务：按给定关键词检索，输出——\n【关键词】raw 命中 N 条 / 归一化命中 M 条 / 漏检 M−N\n【归一键】本次使用了哪些字形映射，各替换多少次\n【条文】最多 5 条，格式：篇 N：「原文逐字」；不足 5 条如实说\n【口径说明】检索只做字形对齐，不改原文\n\n规则：\n1. 必须先报 raw 与归一化两个数，差值不得省略。\n2. 条文逐字照抄，不改写、不补字；方后注用「（方后注）」标明。\n3. 不得据检索结果下辨证结论或推荐处方。\n4. 若某关键词 raw=0 而归一化>0，需单独提示「该词在底本中只以异体字出现」。\n5. 映射表之外的字形不得臆造；遇到疑似异体，列出来但标「未归一」。\n```\n\n## 使用示例\n\n输入：关键词「发热」。\n\n输出（节选）：\n\n```text\n【发热】raw 39 / 归一化 163 / 漏检 124\n【归一键】𤍠→热 ×129（5 条两形并存）\n【条文】篇 5：「太阳病，头痛发热，身疼恶风，无汗而喘者，麻黄汤主之。」\n【口径说明】检索层归一，原文保留异体\n```\n\n## 为什么这样限制\n\n- 只报一个数，读者无从知道漏了多少；两个数并置，缺口自己说话。\n- 逐字照抄是引文纪律；方后注混杂在条文里，不标出来就会把注文当原文。\n"
      },
      {
        "name": "skill-taiyang-biao.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/03-taiyang-biao/outputs/skill-taiyang-biao.md",
        "title": "taiyang-biao",
        "description": "太阳表证检索与判定：异体字归一报漏检、中风/伤寒分支给依据、不硬分",
        "chars": 536,
        "body": "---\nname: taiyang-biao\ndescription: 太阳表证检索与判定：异体字归一报漏检、中风/伤寒分支给依据、不硬分\nversion: 0.1.0\n---\n\n# taiyang-biao\n\n## 何时使用\n\n- 按症状在底本里找条文（发热、汗出、无汗、恶寒）\n- 判断一条病案落在太阳中风还是太阳伤寒分支\n- 教材与底本不一致，定位是字形问题还是条文问题\n\n## 不适用\n\n- 太阳病变证、坏病、结胸、痞证（本技能只覆盖两条经典分支）\n- 处方剂量与加减（见第 12 章）\n- 需要合病判断时（见第 9 章）\n\n## 步骤\n\n1. **归一化检索**：先用异体映射跑一遍，报 raw / normalized / 漏检。\n2. **取条文**：逐字，标篇号，方后注单独标。\n3. **判分支**：汗出+脉缓 → 中风/桂枝汤；无汗+脉浮紧+喘 → 伤寒/麻黄汤。\n4. **不硬分**：条件不落入两支，输出「不确定」+ 不排除项。\n5. **留口径**：频次不等于权重；原文异体不改写。\n\n## 输出模板\n\n```text\n【检索】关键词 raw N / 归一 M / 漏检 M−N\n【条文】篇 N：「原文」\n【分支】太阳中风 | 太阳伤寒 | 不确定（原因）\n【依据】…\n【不排除】…\n```\n\n## 质量判据\n\n- 两个命中数都在\n- 引文可逐字比对\n- 不确定的没有被硬塞进某一支\n\n> 本技能只做检索与规则判定，不构成辨证处方建议。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "01-zhongyi/07-shanghanlun/04-yangming-li": {
    "key": "01-zhongyi/07-shanghanlun/04-yangming-li",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "07-shanghanlun",
    "subjectTitle": "伤寒论",
    "chapterSlug": "04-yangming-li",
    "n": 4,
    "title": "第 4 章 · 阳明病里实证：三承气不是三档火力，是三道门槛",
    "motto": "「阳明病，脉迟，汗出不恶寒，身重短气，腹满潮热，大便硬，大承气汤主之。若腹大满不通者，与小承气汤。」——《伤寒论·辨阳明病脉证并治》（篇 8）",
    "problem": "你把三承气当成「轻—中—重」三档，病人腹满潮热就往上加码。但原文这两句是**同一基础证的两个分支**：都是腹满潮热，一个大便硬用大承气，一个腹大满不通改用小承气——加码方向在这里是反的。",
    "roots": "环境逼迫(临床要选方) + 知识积累(逐条条件表 × 异文标注 = 能说明「凭什么这一档」)",
    "html": "<h1 id=\"第-4-章-阳明病里实证-三承气不是三档火力-是三道门槛\">第 4 章 · 阳明病里实证：三承气不是三档火力，是三道门槛</h1>\n<blockquote><p><strong>MOTTO:</strong> 「阳明病，脉迟，汗出不恶寒，身重短气，腹满潮热，大便硬，大承气汤主之。若腹大满不通者，与小承气汤。」——《伤寒论·辨阳明病脉证并治》（篇 8）</p>\n<p><strong>PROBLEM:</strong> 你把三承气当成「轻—中—重」三档，病人腹满潮热就往上加码。但原文这两句是<strong>同一基础证的两个分支</strong>：都是腹满潮热，一个大便硬用大承气，一个腹大满不通改用小承气——加码方向在这里是反的。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(临床要选方) + 知识积累(逐条条件表 × 异文标注 = 能说明「凭什么这一档」)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>伤寒论</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>04 / 12</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>4 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>逐字引出阳明提纲与三承气的分层条件，说明「痞满燥实」各自对应哪些原文词</li><li>解释为什么「腹大满不通」反而用小承气（气机壅塞 vs 燥屎内结的区别）</li><li>认出底本里的异文标注（「玉函云：与小承气汤」）并说明它如何改变选方</li><li>写一个分层判定器：输出档位、命中条件、缺失条件与不排除项</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"阳明提纲与它的夹注\">阳明提纲与它的夹注</h3>\n<blockquote><p>阳明之为病，胃家实，一作寒是也。——《伤寒论·辨阳明病脉证并治》（篇 9）</p></blockquote>\n<p>「胃家实」三字是全篇入口。夹注「一作寒是也」提示另有版本作「胃家寒」——这直接把提纲的判据反转。本章按主流读法取「胃家实」，但<strong>保留夹注</strong>，因为删掉它会假装版本一致。</p>\n<h3 id=\"一条原文-两个分支\">一条原文，两个分支</h3>\n<blockquote><p>阳明病，脉迟，汗出不恶寒，身重短气，腹满潮热，大便硬，大承气汤主之。若腹大满不通者，与小承气汤。——（篇 8）</p></blockquote>\n<p>拆开看条件：</p>\n<div class=\"table-wrap\"><table><thead><tr><th>条件（原文词）</th><th>大承气支</th><th>小承气支</th></tr></thead><tbody><tr><td>脉迟、汗出不恶寒</td><td>✓</td><td>✓</td></tr><tr><td>身重短气、腹满潮热</td><td>✓</td><td>✓</td></tr><tr><td>大便硬</td><td>✓</td><td>—（腹大满不通）</td></tr><tr><td>腹大满不通</td><td>—</td><td>✓</td></tr></tbody></table></div>\n<p><strong>大便硬</strong>是燥屎成形的标志，故用大承气直下；<strong>腹大满不通</strong>是气机壅塞为主，燥屎未必坚，故小承气轻下。所以「更重的症状用更轻的方」并不矛盾——两个分支的目标不同：一个攻燥屎，一个通壅气。</p>\n<h3 id=\"异文会改方\">异文会改方</h3>\n<blockquote><p>发汗后，恶寒者，虚故也。不恶寒但热者，实也，当和胃气，与调胃承气汤。方三十三玉函云：与小承气汤。——（篇 5）</p></blockquote>\n<p>同一处，《玉函》给的是小承气。底本把两个说法并列保留了。这件事对工程的启示很直接：<strong>方名不是铁值，是带版本的值</strong>。任何「条文→方」的映射表都必须留一个 <code>variant</code> 字段，否则你在做的是一个静默二选一。</p>\n<h3 id=\"实测规模\">实测规模</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>指标</th><th>实测</th></tr></thead><tbody><tr><td>阳明病域条文</td><td><strong>134 条 / 2 篇</strong></td></tr><tr><td>「大承气汤」</td><td><strong>79 条</strong></td></tr><tr><td>「调胃承气汤」</td><td><strong>33 条</strong></td></tr><tr><td>「小承气汤」</td><td><strong>31 条</strong></td></tr><tr><td>「谵语」</td><td><strong>61 条</strong></td></tr><tr><td>「腹满」</td><td><strong>62 条</strong></td></tr><tr><td>「不大便」</td><td><strong>40 条</strong></td></tr><tr><td>「燥屎」</td><td><strong>25 条</strong></td></tr><tr><td>「潮热」（正体）</td><td><strong>16 条</strong></td></tr><tr><td>「手足濈然汗出」</td><td><strong>3 条</strong></td></tr></tbody></table></div>\n<p>注意「大承气汤」79 条远超另两方之和——与第 3 章同理，大量出现是在<strong>禁忌与误治</strong>条里（「不可与大承气汤」之类），频次不代表首选率。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">// code/main.js\ngrade(signs)   // 输入 {潮热,谵语,手足濈然汗出,腹满,不大便,大便硬,燥屎,腹大满不通}\n               // 输出 {tier: 大承气|小承气|调胃承气|不足以定档, hit[], missing[], notExcluded[]}</code></pre></div>\n<p>判定规则（全部来自原文词）：</p>\n<ol><li>大便硬 + 潮热 + 腹满 → <code>大承气汤</code></li><li>腹大满不通 + 潮热（无大便硬）→ <code>小承气汤</code></li><li>但热不恶寒、无腹满硬满 → <code>调胃承气汤</code>（和胃气）</li><li>其余 → <code>不足以定档</code>，并列出还缺哪些条件</li></ol>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：<code>grade({大便硬:true, 潮热:true, 腹满:true})</code> → <code>大承气汤</code>；<code>grade({腹大满不通:true, 潮热:true})</code> → <code>小承气汤</code>；<code>grade({})</code> → 不足以定档且 <code>missing</code> 非空。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>只覆盖三承气的原文条件</strong>，阳明病另有白虎汤、茵陈蒿汤、栀子豉汤等大量分支，本章不涉及。</li><li><strong>「痞满燥实」是后世归纳</strong>，原文用词是腹满、大便硬、潮热、谵语；本章的映射标明了对应词，未把归纳当原文。</li><li><strong>判定器不处理虚实夹杂</strong>（如「脉迟」在此为邪结而非虚寒），也不判断患者能否承受攻下。</li><li><strong>异文保留不取舍</strong>：<code>variant</code> 字段只记录，不自动选择；选哪一版是文献学判断，不由代码代劳。</li><li>攻下类方剂有明确禁忌与风险，本章代码仅作文本规则演示。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 条文引自 <code>standards/shanghan/底本.json</code>（可复核，含异体字与异文标注）；本章为条文结构与规则演示，不构成处方或攻下指征判断，临床须由执业医师决定。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>「脉迟」在阳明腑实证里为何不是寒？用原文其他条（如「脉迟…可攻」）佐证。</li><li>若一条病案同时有「大便硬」与「腹大满不通」，按原文该走哪支？给出你的理由与风险。</li><li>设计 <code>variant</code> 字段的结构，使「玉函云：与小承气汤」在输出里既可见又不覆盖主文。</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>三承气的教学图常画成一条上升的箭头，而原文给的是一棵分叉树。把树压成箭头，学生就会记住「越重越猛」这个错的方向——这正是「读原文」与「读归纳」的差别。</p>",
    "markdown": "# 第 4 章 · 阳明病里实证：三承气不是三档火力，是三道门槛\n\n> **MOTTO:** 「阳明病，脉迟，汗出不恶寒，身重短气，腹满潮热，大便硬，大承气汤主之。若腹大满不通者，与小承气汤。」——《伤寒论·辨阳明病脉证并治》（篇 8）\n>\n> **PROBLEM:** 你把三承气当成「轻—中—重」三档，病人腹满潮热就往上加码。但原文这两句是**同一基础证的两个分支**：都是腹满潮热，一个大便硬用大承气，一个腹大满不通改用小承气——加码方向在这里是反的。\n>\n> **双根因定位:** 环境逼迫(临床要选方) + 知识积累(逐条条件表 × 异文标注 = 能说明「凭什么这一档」)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 伤寒论 |\n| 院系 | 中医系 |\n| 章序号 | 04 / 12 |\n| 所属阶段 | 🌿 长·积累 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 4 小时 |\n\n## 学习目标\n\n- 逐字引出阳明提纲与三承气的分层条件，说明「痞满燥实」各自对应哪些原文词\n- 解释为什么「腹大满不通」反而用小承气（气机壅塞 vs 燥屎内结的区别）\n- 认出底本里的异文标注（「玉函云：与小承气汤」）并说明它如何改变选方\n- 写一个分层判定器：输出档位、命中条件、缺失条件与不排除项\n\n## 核心概念\n\n### 阳明提纲与它的夹注\n\n> 阳明之为病，胃家实，一作寒是也。——《伤寒论·辨阳明病脉证并治》（篇 9）\n\n「胃家实」三字是全篇入口。夹注「一作寒是也」提示另有版本作「胃家寒」——这直接把提纲的判据反转。本章按主流读法取「胃家实」，但**保留夹注**，因为删掉它会假装版本一致。\n\n### 一条原文，两个分支\n\n> 阳明病，脉迟，汗出不恶寒，身重短气，腹满潮热，大便硬，大承气汤主之。若腹大满不通者，与小承气汤。——（篇 8）\n\n拆开看条件：\n\n| 条件（原文词） | 大承气支 | 小承气支 |\n|---|:--:|:--:|\n| 脉迟、汗出不恶寒 | ✓ | ✓ |\n| 身重短气、腹满潮热 | ✓ | ✓ |\n| 大便硬 | ✓ | —（腹大满不通） |\n| 腹大满不通 | — | ✓ |\n\n**大便硬**是燥屎成形的标志，故用大承气直下；**腹大满不通**是气机壅塞为主，燥屎未必坚，故小承气轻下。所以「更重的症状用更轻的方」并不矛盾——两个分支的目标不同：一个攻燥屎，一个通壅气。\n\n### 异文会改方\n\n> 发汗后，恶寒者，虚故也。不恶寒但热者，实也，当和胃气，与调胃承气汤。方三十三玉函云：与小承气汤。——（篇 5）\n\n同一处，《玉函》给的是小承气。底本把两个说法并列保留了。这件事对工程的启示很直接：**方名不是铁值，是带版本的值**。任何「条文→方」的映射表都必须留一个 `variant` 字段，否则你在做的是一个静默二选一。\n\n### 实测规模\n\n| 指标 | 实测 |\n|---|--:|\n| 阳明病域条文 | **134 条 / 2 篇** |\n| 「大承气汤」 | **79 条** |\n| 「调胃承气汤」 | **33 条** |\n| 「小承气汤」 | **31 条** |\n| 「谵语」 | **61 条** |\n| 「腹满」 | **62 条** |\n| 「不大便」 | **40 条** |\n| 「燥屎」 | **25 条** |\n| 「潮热」（正体） | **16 条** |\n| 「手足濈然汗出」 | **3 条** |\n\n注意「大承气汤」79 条远超另两方之和——与第 3 章同理，大量出现是在**禁忌与误治**条里（「不可与大承气汤」之类），频次不代表首选率。\n\n## BUILD IT：从零实现\n\n```js\n// code/main.js\ngrade(signs)   // 输入 {潮热,谵语,手足濈然汗出,腹满,不大便,大便硬,燥屎,腹大满不通}\n               // 输出 {tier: 大承气|小承气|调胃承气|不足以定档, hit[], missing[], notExcluded[]}\n```\n\n判定规则（全部来自原文词）：\n\n1. 大便硬 + 潮热 + 腹满 → `大承气汤`\n2. 腹大满不通 + 潮热（无大便硬）→ `小承气汤`\n3. 但热不恶寒、无腹满硬满 → `调胃承气汤`（和胃气）\n4. 其余 → `不足以定档`，并列出还缺哪些条件\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：`grade({大便硬:true, 潮热:true, 腹满:true})` → `大承气汤`；`grade({腹大满不通:true, 潮热:true})` → `小承气汤`；`grade({})` → 不足以定档且 `missing` 非空。\n\n## 代价与边界\n\n- **只覆盖三承气的原文条件**，阳明病另有白虎汤、茵陈蒿汤、栀子豉汤等大量分支，本章不涉及。\n- **「痞满燥实」是后世归纳**，原文用词是腹满、大便硬、潮热、谵语；本章的映射标明了对应词，未把归纳当原文。\n- **判定器不处理虚实夹杂**（如「脉迟」在此为邪结而非虚寒），也不判断患者能否承受攻下。\n- **异文保留不取舍**：`variant` 字段只记录，不自动选择；选哪一版是文献学判断，不由代码代劳。\n- 攻下类方剂有明确禁忌与风险，本章代码仅作文本规则演示。\n\n> **免责声明：** 条文引自 `standards/shanghan/底本.json`（可复核，含异体字与异文标注）；本章为条文结构与规则演示，不构成处方或攻下指征判断，临床须由执业医师决定。\n\n## 练习\n\n1. 「脉迟」在阳明腑实证里为何不是寒？用原文其他条（如「脉迟…可攻」）佐证。\n2. 若一条病案同时有「大便硬」与「腹大满不通」，按原文该走哪支？给出你的理由与风险。\n3. 设计 `variant` 字段的结构，使「玉函云：与小承气汤」在输出里既可见又不覆盖主文。\n\n## 进阶思考\n\n三承气的教学图常画成一条上升的箭头，而原文给的是一棵分叉树。把树压成箭头，学生就会记住「越重越猛」这个错的方向——这正是「读原文」与「读归纳」的差别。\n",
    "code": {
      "main.js": "'use strict';\n/**\n * 阳明腑实三承气分层判定（条件全部取自原文词）\n *\n *   node code/main.js\n *\n * 口径：\n *   · 判定只覆盖三承气；阳明病其他分支（白虎、茵陈蒿、栀子豉）不在此列。\n *   · 「痞满燥实」是后世归纳，代码用的是原文词：腹满 / 大便硬 / 潮热 / 谵语 / 燥屎。\n *   · 异文（如「玉函云：与小承气汤」）单独以 variants 报，不覆盖主文，也不自动择一。\n *   · 不判虚实夹杂、不判可攻与否 —— 那是临床判断，不是文本规则。\n */\n\nconst path = require('node:path');\nconst fs = require('node:fs');\n\nconst ROOT = path.resolve(__dirname, '../../../../../..');\nconst BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));\nconst TEXTS = [];\nfor (const p of BOOK.pian) for (const it of p.items) TEXTS.push({ pian: p.no, text: it.text });\n\nconst K = {\n  big: ['大便硬', '潮热', '腹满'],\n  small: ['腹大满不通', '潮热'],\n  mild: ['不恶寒但热'],\n};\n\nfunction grade(signs = {}) {\n  const has = (k) => signs[k] === true;\n  const hitOf = (keys) => keys.filter(has);\n  const missingOf = (keys) => keys.filter((k) => !has(k));\n\n  if (has('大便硬') && has('潮热') && has('腹满')) {\n    return { tier: '大承气汤', hit: hitOf(K.big), missing: missingOf(K.big), notExcluded: ['若腹大满不通为主，原文另有小承气分支'] };\n  }\n  if (has('腹大满不通') && has('潮热') && !has('大便硬')) {\n    return { tier: '小承气汤', hit: hitOf(K.small), missing: missingOf(K.small), notExcluded: ['若燥屎已成，需考虑大承气（原文另条）'] };\n  }\n  if (has('不恶寒但热') && !has('腹满') && !has('大便硬')) {\n    return { tier: '调胃承气汤', hit: hitOf(K.mild), missing: missingOf(K.mild), notExcluded: ['异文《玉函》此处作小承气汤'] };\n  }\n  const missing = ['潮热', '腹满', '大便硬', '腹大满不通'].filter((k) => !has(k));\n  return { tier: '不足以定档', hit: hitOf([...K.big, ...K.small, ...K.mild]), missing, notExcluded: ['可能属阳明其他分支（白虎/茵陈蒿/栀子豉）'] };\n}\n\n/** 频次与异文（只报数、只记录） */\nfunction stats() {\n  const c = (k) => TEXTS.filter((t) => t.text.includes(k)).length;\n  return {\n    条: BOOK.pian.filter((p) => p.domain === '阳明病').reduce((a, p) => a + p.actual.tiao, 0),\n    篇: BOOK.pian.filter((p) => p.domain === '阳明病').length,\n    大承气汤: c('大承气汤'), 小承气汤: c('小承气汤'), 调胃承气汤: c('调胃承气汤'),\n    谵语: c('谵语'), 腹满: c('腹满'), 不大便: c('不大便'), 燥屎: c('燥屎'), 潮热: c('潮热'),\n  };\n}\n\n/** 底本自带的「某书云」异文标注 */\nfunction variants() {\n  return TEXTS.filter((t) => /玉函云|一作/.test(t.text)).map((t) => ({\n    pian: t.pian,\n    text: t.text.slice(0, 80),\n    note: (t.text.match(/玉函云[^。]*|一作[^。]*/) || [''])[0],\n  }));\n}\n\nfunction main() {\n  const s = stats();\n  console.log(`阳明病域 ${s.条} 条 / ${s.篇} 篇`);\n  console.log(`方名频次：大承气 ${s.大承气汤} · 小承气 ${s.小承气汤} · 调胃 ${s.调胃承气汤}（频次含禁忌条，不等于首选率）`);\n  console.log(`症状词：谵语 ${s.谵语} · 腹满 ${s.腹满} · 不大便 ${s.不大便} · 燥屎 ${s.燥屎} · 潮热 ${s.潮热}\\n`);\n  const cases = [\n    { 大便硬: true, 潮热: true, 腹满: true },\n    { 腹大满不通: true, 潮热: true },\n    { 不恶寒但热: true },\n    {},\n  ];\n  for (const cs of cases) {\n    const r = grade(cs);\n    console.log(`${JSON.stringify(cs)}\\n  → ${r.tier}｜命中 ${r.hit.join('/') || '无'}｜缺 ${r.missing.join('/') || '无'}`);\n  }\n  const v = variants();\n  console.log(`\\n底本异文标注 ${v.length} 处（例）：`);\n  for (const x of v.slice(0, 3)) console.log(`  篇${x.pian} ${x.note} ← ${x.text}…`);\n  console.log('\\n本输出为条文规则演示，不构成攻下指征或处方建议。');\n}\n\nif (require.main === module) main();\nmodule.exports = { grade, stats, variants, TEXTS };\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { grade, stats, variants } = require('./main.js');\n\ntest('大便硬 + 潮热 + 腹满 → 大承气汤', () => {\n  const r = grade({ 大便硬: true, 潮热: true, 腹满: true });\n  assert.strictEqual(r.tier, '大承气汤');\n  assert.deepStrictEqual(r.hit.sort(), ['大便硬', '潮热', '腹满'].sort());\n  assert.deepStrictEqual(r.missing, []);\n});\n\ntest('腹大满不通 + 潮热（无大便硬）→ 小承气汤：症状更「满」而方更轻', () => {\n  const r = grade({ 腹大满不通: true, 潮热: true });\n  assert.strictEqual(r.tier, '小承气汤');\n  assert.ok(r.notExcluded.some((x) => x.includes('大承气')));\n});\n\ntest('但热不恶寒、无腹满硬满 → 调胃承气汤，并提示玉函异文', () => {\n  const r = grade({ 不恶寒但热: true });\n  assert.strictEqual(r.tier, '调胃承气汤');\n  assert.ok(r.notExcluded.join('').includes('玉函'));\n});\n\ntest('信息不足时不硬定档，且列出缺项', () => {\n  const r = grade({});\n  assert.strictEqual(r.tier, '不足以定档');\n  assert.ok(r.missing.length >= 3);\n});\n\ntest('同时有腹大满不通与大便硬时走大承气，但必须提示分叉', () => {\n  const r = grade({ 腹大满不通: true, 大便硬: true, 潮热: true, 腹满: true });\n  assert.strictEqual(r.tier, '大承气汤');\n  assert.ok(r.notExcluded.length >= 1);\n});\n\ntest('规模与频次：134 条 / 2 篇；大承气 79 · 调胃 33 · 小承气 31', () => {\n  const s = stats();\n  assert.deepStrictEqual([s.条, s.篇], [134, 2]);\n  assert.deepStrictEqual([s.大承气汤, s.调胃承气汤, s.小承气汤], [79, 33, 31]);\n  assert.deepStrictEqual([s.潮热, s.燥屎], [16, 25]);\n});\n\ntest('异文标注可取出，且不覆盖主文（只记录）', () => {\n  const v = variants();\n  assert.ok(v.length >= 20, `异文标注应不少，实得 ${v.length}`);\n  assert.ok(v.some((x) => x.note.includes('玉函')));\n  assert.ok(v.every((x) => typeof x.text === 'string' && x.note.length >= 2));\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "阳明病的提纲条是？",
          "options": [
            "胃家实（一作寒是也）",
            "口苦咽干目眩",
            "腹满而吐，食不下",
            "脉浮头项强痛而恶寒"
          ],
          "correct": 0,
          "explanation": "「一作寒是也」是夹注异文，须一并保留。"
        },
        {
          "stage": "check",
          "question": "「腹大满不通」为何改用小承气而不是大承气？",
          "options": [
            "病情更轻",
            "以气机壅塞为主、燥屎未必坚，目标是通壅气而非攻燥屎",
            "小承气更安全所以随便用",
            "原文写错了"
          ],
          "correct": 1,
          "explanation": "两分支目标不同：大承气攻燥屎，小承气通壅气。"
        },
        {
          "stage": "check",
          "question": "底本「与调胃承气汤。方三十三玉函云：与小承气汤」说明什么？",
          "options": [
            "底本抄错",
            "同一处存在版本异文，方名是带版本的值",
            "调胃与小承气等价",
            "玉函不可信"
          ],
          "correct": 1,
          "explanation": "异文必须记录，不能静默二选一。"
        },
        {
          "stage": "check",
          "question": "阳明病域条数与「大承气汤」出现条数分别是？",
          "options": [
            "134 条 / 79 条",
            "566 条 / 79 条",
            "134 条 / 134 条",
            "64 条 / 33 条"
          ],
          "correct": 0,
          "explanation": "134 条 2 篇；大承气 79、调胃 33、小承气 31。"
        },
        {
          "stage": "post",
          "question": "「大承气汤」出现 79 条，能否说明它最常用？",
          "options": [
            "能",
            "不能，频次含大量禁忌与误治对照条",
            "能，因为方名出现即应用",
            "无法判断"
          ],
          "correct": 1,
          "explanation": "与第 3 章同理：频次≠权重。"
        },
        {
          "stage": "post",
          "question": "判定器在条件不足时应该输出什么？",
          "options": [
            "默认大承气",
            "默认调胃承气",
            "不足以定档 + 缺项清单 + 不排除项",
            "随机选一方"
          ],
          "correct": 2,
          "explanation": "不硬分是纪律；缺项清单让人知道下一步该问什么。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-yangming-li.md",
        "kind": "prompt",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/04-yangming-li/outputs/prompt-yangming-li.md",
        "title": "三承气分层判定",
        "description": null,
        "chars": 635,
        "body": "# 三承气分层判定\n\n## 用途\n\n把一条阳明腑实的病案，按**原文条件**落到三承气中的一档；条件不够就报缺项，不硬定。\n用于**病案讨论、条文对照、教材校核**。不做攻下决策。\n\n## 提示词\n\n```text\n你是伤寒论助教。下面是病案摘要。请只做分层，不做处方决策。\n\n原文条件（底本）：\n· 腹满、潮热、大便硬 → 大承气汤（篇 8：「…腹满潮热，大便硬，大承气汤主之」）\n· 腹大满不通、潮热（无大便硬）→ 小承气汤（同条：「若腹大满不通者，与小承气汤」）\n· 不恶寒但热（无腹满硬满）→ 调胃承气汤（篇 5：「当和胃气，与调胃承气汤」）\n\n规则：\n1. 只允许用上述原文条件判定；不得引入「痞满燥实」作为判据（那是归纳，不是原文）。\n2. 条件不足 → 输出「不足以定档」并列出缺项，禁止默认取最重档。\n3. 每条结论必须附原文出处（篇号 + 原句片段）。\n4. 遇到版本异文（如「玉函云：与小承气汤」）必须并列报出，不得择一。\n5. 不给剂量、不给煎服法、不判患者能否承受攻下。\n\n输出格式：\n【档位】大承气 | 小承气 | 调胃承气 | 不足以定档\n【命中条件】…\n【缺失条件】…\n【异文】…\n【不排除】…\n```\n\n## 使用示例\n\n输入：腹满、潮热、大便硬三日未行、谵语。\n\n输出：【档位】大承气汤（篇 8「腹满潮热，大便硬」）\n【命中条件】大便硬 / 潮热 / 腹满\n【缺失条件】无\n【异文】无\n【不排除】若以腹大满不通为主，原文另有小承气分支。\n\n## 为什么这样限制\n\n- 「痞满燥实」好用但会盖住原文的用词差异，分层要能回到原句。\n- 默认取最重档是最危险的失效方式：判定器越\"果断\"，临床越容易越界。\n"
      },
      {
        "name": "skill-yangming-li.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/04-yangming-li/outputs/skill-yangming-li.md",
        "title": "yangming-li",
        "description": "阳明腑实三承气分层：只用原文词判档、缺项报缺、异文并列不择一",
        "chars": 509,
        "body": "---\nname: yangming-li\ndescription: 阳明腑实三承气分层：只用原文词判档、缺项报缺、异文并列不择一\nversion: 0.1.0\n---\n\n# yangming-li\n\n## 何时使用\n\n- 病案讨论中要判断该走大承气、小承气还是调胃承气\n- 教材写「痞满燥实」而你想回到原文用词核对\n- 发现同一条文两个版本给出不同方，需要并列记录\n\n## 不适用\n\n- 阳明其他分支（白虎汤、茵陈蒿汤、栀子豉汤）\n- 攻下禁忌与患者耐受判断（临床决定）\n- 剂量与煎服法（见第 12 章）\n\n## 步骤\n\n1. **取条件**：腹满、潮热、大便硬、腹大满不通、不恶寒但热、谵语、燥屎——是否出现。\n2. **判档**：大便硬+潮热+腹满 → 大承气；腹大满不通+潮热（无大便硬）→ 小承气；但热不恶寒无硬满 → 调胃。\n3. **报缺项**：不足则「不足以定档」，列出还缺什么。\n4. **记异文**：遇到「玉函云」「一作」并列报出。\n5. **留边界**：不给剂量、不判可攻。\n\n## 输出模板\n\n```text\n【档位】…\n【命中条件】…\n【缺失条件】…\n【异文】…\n【不排除】…\n```\n\n## 质量判据\n\n- 判据能追到原句\n- 没有默认最重档\n- 异文与原主文并存\n- 没有剂量与指征结论\n\n> 本技能只做文本分层，不构成攻下指征或处方建议。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "01-zhongyi/07-shanghanlun/05-shaoyang-banbiao": {
    "key": "01-zhongyi/07-shanghanlun/05-shaoyang-banbiao",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "07-shanghanlun",
    "subjectTitle": "伤寒论",
    "chapterSlug": "05-shaoyang-banbiao",
    "n": 5,
    "title": "第 5 章 · 少阳病半表半里：一条把「与」改成「或」的规则",
    "motto": "「伤寒中风，有柴胡证，但见一证便是，不必悉具。」——《伤寒论·辨太阳病脉证并治中》（篇 5）",
    "problem": "你按教材四证（往来寒热、胸胁苦满、默默不欲饮食、心烦喜呕）做「全部满足」的判定，结果十个病人九个判不出来。原文说的恰恰相反：**一证即可**。",
    "roots": "环境逼迫(门诊信息不全，四证难齐) + 知识积累(逻辑结构 × 检索陷阱 = 一条能落地的判定规则)",
    "html": "<h1 id=\"第-5-章-少阳病半表半里-一条把-与-改成-或-的规则\">第 5 章 · 少阳病半表半里：一条把「与」改成「或」的规则</h1>\n<blockquote><p><strong>MOTTO:</strong> 「伤寒中风，有柴胡证，但见一证便是，不必悉具。」——《伤寒论·辨太阳病脉证并治中》（篇 5）</p>\n<p><strong>PROBLEM:</strong> 你按教材四证（往来寒热、胸胁苦满、默默不欲饮食、心烦喜呕）做「全部满足」的判定，结果十个病人九个判不出来。原文说的恰恰相反：<strong>一证即可</strong>。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(门诊信息不全，四证难齐) + 知识积累(逻辑结构 × 检索陷阱 = 一条能落地的判定规则)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>伤寒论</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>05 / 12</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>逐字引出少阳提纲与柴胡四证，指出「但见一证便是」的判定含义：逻辑是 <strong>OR</strong>，不是 AND</li><li>说出少阳三禁（汗、吐、下）在原文里的落点，并说明为什么会误治</li><li>认出第二个检索陷阱：「默默不欲饮食」在底本写作「嘿嘿不欲饮食」，按教材词检索命中 0</li><li>写一个柴胡证判定器：OR 逻辑 + 命中项 + 不排除项</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"提纲-三症-不是四证\">提纲：三症，不是四证</h3>\n<blockquote><p>少阳之为病，口苦咽干，目眩也。——《伤寒论·辨少阳病脉证并治》（篇 11）</p></blockquote>\n<p>提纲只给三症，且都是<strong>上窍与感觉</strong>层面的（口、咽、目）。这是少阳篇最容易被跳过的一句——教材把它写成小标题，学生只记柴胡四证。</p>\n<h3 id=\"柴胡证的四证与-不必悉具\">柴胡证的四证与「不必悉具」</h3>\n<blockquote><p>伤寒五六日，中风，往来寒热，胸胁苦满，嘿嘿不欲饮食，心烦喜呕，或胸中烦而不呕，或渴，或腹中痛，或胁下痞硬，或心下悸，小便不利，或不渴，身有微热，或咳者，小柴胡汤主之。——（篇 5）</p>\n<p>伤寒中风，有柴胡证，但见一证便是，不必悉具。凡柴胡汤病证而下之，若柴胡证不罢者，复与柴胡汤，必蒸蒸而振，却复发热，汗出而解。——（篇 5）</p></blockquote>\n<p>第一句给了四证 + 七个「或」；第二句直接给判定规则：<strong>一证便是</strong>。所以小柴胡汤证的逻辑结构是：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">少阳 = 口苦 OR 咽干 OR 目眩          （提纲三症）\n柴胡证 = 往来寒热 OR 胸胁苦满 OR 嘿嘿不欲饮食 OR 心烦喜呕   （四证取一）</code></pre></div>\n<p>注意「或胸中烦而不呕…或咳者」那七个「或」是<strong>兼症</strong>，属于同一方证内部的加减范围，不是判定必要条件。把它当必要条件，就会得出「必须咳才能用」的荒谬结论。</p>\n<h3 id=\"第二个检索陷阱-嘿嘿-默默\">第二个检索陷阱：嘿嘿 / 默默</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>检索词</th><th>raw 命中</th><th>归一后</th></tr></thead><tbody><tr><td>「默默不欲饮食」（教材写法）</td><td><strong>0</strong></td><td><strong>3</strong></td></tr><tr><td>「嘿嘿不欲饮食」（底本写法）</td><td>3</td><td>—（归一把它并到「默默」）</td></tr><tr><td>「往来寒热」</td><td><strong>5</strong></td><td><strong>16</strong></td></tr><tr><td>「胸胁苦满」</td><td>3</td><td>3</td></tr><tr><td>「心烦喜呕」</td><td>3</td><td>3</td></tr><tr><td>「但见一证」</td><td>1</td><td>1</td></tr></tbody></table></div>\n<p>「往来寒热」一行还藏着第二层：11 条写作「往来寒𤍠」，与第 3 章同一个 𤍠。<strong>两个陷阱叠在同一个词上</strong>——先按古写改词形，再按异体字归一，才拿得到 16 条。</p>\n<p>与第 3 章的「𤍠/热」是同一类问题：<strong>检索词来自教材，底本用的是古写</strong>。这次不是异体字，是通假——「嘿」通「默」。所以归一化表要能同时处理异体与通假，否则第 3 章修好的漏检在这里又出现一次。</p>\n<h3 id=\"三禁-少阳为什么不能汗吐下\">三禁：少阳为什么不能汗吐下</h3>\n<p>底本里「不可发汗」38 条、「不可下」37 条、「不可吐」5 条（多数集中在汗吐下诸可不可篇）。少阳位于半表半里，汗则伤津、下则引邪入里、吐则伤胃气，故原文反复告诫。工程上的启示：<strong>判定规则要带「禁止集」</strong>，而不是只输出「该用什么」。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">// code/main.js\nshaoYang(signs)   // OR 逻辑判柴胡证：任一四证 → 立证；提纲三症单列\ncontra(signs)     // 三禁检查：汗/吐/下已施 + 柴胡证罢不罢\nsearch(needle)    // 带通假/异体归一，报 raw 与归一命中</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：<code>shaoYang({往来寒热: true})</code> → 立柴胡证（一证即可）；<code>shaoYang({})</code> → 不立证并列出四证；<code>search('默默不欲饮食')</code> raw 0 / 归一 3；<code>search('往来寒热')</code> raw 5 / 归一 16。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>「但见一证」不等于「凡有一证皆可投小柴胡」</strong>。原文同时要求「有柴胡证」，四证只是柴胡证的组成；本章代码只做字面 OR，不判是否属柴胡证范畴。</li><li><strong>七「或」不加权</strong>。原文未给权重，代码也不臆造。</li><li><strong>三禁是文本告诫，不是绝对禁忌表</strong>。临床有合病、兼证时须重新判断（见第 9 章）。</li><li><strong>归一化表仍不完整</strong>：通假（嘿/默）与异体（𤍠/热）混在同一张表里，扩展时须标明类型，否则日后无法区分「写错」与「古写」。</li><li>判定器输出不构成处方建议。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 条文引自 <code>standards/shanghan/底本.json</code>（含古写与异文，可复核）；本章为条文逻辑与检索演示，不构成辨证处方建议。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>把四证的 OR 改成加权评分，会不会更准？用原文「但见一证便是」反驳或支持。</li><li>七「或」如果被误当必要条件，会漏掉多少条文？用检索估算。</li><li>「嘿」通「默」与「𤍠」代「热」，在数据里应归为同一类还是两类？给出你的分类理由。</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>一句话就能改掉一个系统的逻辑结构：「不必悉具」把 AND 变 OR。多数中医 AI 的证候模型默认 AND，因为打分表好写——而原文在这里明确禁止 AND。</p>",
    "markdown": "# 第 5 章 · 少阳病半表半里：一条把「与」改成「或」的规则\r\n\r\n> **MOTTO:** 「伤寒中风，有柴胡证，但见一证便是，不必悉具。」——《伤寒论·辨太阳病脉证并治中》（篇 5）\r\n>\r\n> **PROBLEM:** 你按教材四证（往来寒热、胸胁苦满、默默不欲饮食、心烦喜呕）做「全部满足」的判定，结果十个病人九个判不出来。原文说的恰恰相反：**一证即可**。\r\n>\r\n> **双根因定位:** 环境逼迫(门诊信息不全，四证难齐) + 知识积累(逻辑结构 × 检索陷阱 = 一条能落地的判定规则)\r\n\r\n## 课程信息\r\n\r\n| 项目 | 内容 |\r\n|------|------|\r\n| 学科 | 伤寒论 |\r\n| 院系 | 中医系 |\r\n| 章序号 | 05 / 12 |\r\n| 所属阶段 | 🌿 长·积累 |\r\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\r\n| 预估时长 | 3 小时 |\r\n\r\n## 学习目标\r\n\r\n- 逐字引出少阳提纲与柴胡四证，指出「但见一证便是」的判定含义：逻辑是 **OR**，不是 AND\r\n- 说出少阳三禁（汗、吐、下）在原文里的落点，并说明为什么会误治\r\n- 认出第二个检索陷阱：「默默不欲饮食」在底本写作「嘿嘿不欲饮食」，按教材词检索命中 0\r\n- 写一个柴胡证判定器：OR 逻辑 + 命中项 + 不排除项\r\n\r\n## 核心概念\r\n\r\n### 提纲：三症，不是四证\r\n\r\n> 少阳之为病，口苦咽干，目眩也。——《伤寒论·辨少阳病脉证并治》（篇 11）\r\n\r\n提纲只给三症，且都是**上窍与感觉**层面的（口、咽、目）。这是少阳篇最容易被跳过的一句——教材把它写成小标题，学生只记柴胡四证。\r\n\r\n### 柴胡证的四证与「不必悉具」\r\n\r\n> 伤寒五六日，中风，往来寒热，胸胁苦满，嘿嘿不欲饮食，心烦喜呕，或胸中烦而不呕，或渴，或腹中痛，或胁下痞硬，或心下悸，小便不利，或不渴，身有微热，或咳者，小柴胡汤主之。——（篇 5）\r\n>\r\n> 伤寒中风，有柴胡证，但见一证便是，不必悉具。凡柴胡汤病证而下之，若柴胡证不罢者，复与柴胡汤，必蒸蒸而振，却复发热，汗出而解。——（篇 5）\r\n\r\n第一句给了四证 + 七个「或」；第二句直接给判定规则：**一证便是**。所以小柴胡汤证的逻辑结构是：\r\n\r\n```\r\n少阳 = 口苦 OR 咽干 OR 目眩          （提纲三症）\r\n柴胡证 = 往来寒热 OR 胸胁苦满 OR 嘿嘿不欲饮食 OR 心烦喜呕   （四证取一）\r\n```\r\n\r\n注意「或胸中烦而不呕…或咳者」那七个「或」是**兼症**，属于同一方证内部的加减范围，不是判定必要条件。把它当必要条件，就会得出「必须咳才能用」的荒谬结论。\r\n\r\n### 第二个检索陷阱：嘿嘿 / 默默\r\n\r\n| 检索词 | raw 命中 | 归一后 |\r\n|---|--:|--:|\r\n| 「默默不欲饮食」（教材写法） | **0** | **3** |\r\n| 「嘿嘿不欲饮食」（底本写法） | 3 | —（归一把它并到「默默」） |\r\n| 「往来寒热」 | **5** | **16** |\r\n| 「胸胁苦满」 | 3 | 3 |\r\n| 「心烦喜呕」 | 3 | 3 |\r\n| 「但见一证」 | 1 | 1 |\r\n\r\n「往来寒热」一行还藏着第二层：11 条写作「往来寒𤍠」，与第 3 章同一个 𤍠。**两个陷阱叠在同一个词上**——先按古写改词形，再按异体字归一，才拿得到 16 条。\r\n\r\n与第 3 章的「𤍠/热」是同一类问题：**检索词来自教材，底本用的是古写**。这次不是异体字，是通假——「嘿」通「默」。所以归一化表要能同时处理异体与通假，否则第 3 章修好的漏检在这里又出现一次。\r\n\r\n### 三禁：少阳为什么不能汗吐下\r\n\r\n底本里「不可发汗」38 条、「不可下」37 条、「不可吐」5 条（多数集中在汗吐下诸可不可篇）。少阳位于半表半里，汗则伤津、下则引邪入里、吐则伤胃气，故原文反复告诫。工程上的启示：**判定规则要带「禁止集」**，而不是只输出「该用什么」。\r\n\r\n## BUILD IT：从零实现\r\n\r\n```js\r\n// code/main.js\r\nshaoYang(signs)   // OR 逻辑判柴胡证：任一四证 → 立证；提纲三症单列\r\ncontra(signs)     // 三禁检查：汗/吐/下已施 + 柴胡证罢不罢\r\nsearch(needle)    // 带通假/异体归一，报 raw 与归一命中\r\n```\r\n\r\n## 验证\r\n\r\n```bash\r\nnode code/main.js\r\nnode --test code/main.test.js\r\n```\r\n\r\n预期：`shaoYang({往来寒热: true})` → 立柴胡证（一证即可）；`shaoYang({})` → 不立证并列出四证；`search('默默不欲饮食')` raw 0 / 归一 3；`search('往来寒热')` raw 5 / 归一 16。\r\n\r\n## 代价与边界\r\n\r\n- **「但见一证」不等于「凡有一证皆可投小柴胡」**。原文同时要求「有柴胡证」，四证只是柴胡证的组成；本章代码只做字面 OR，不判是否属柴胡证范畴。\r\n- **七「或」不加权**。原文未给权重，代码也不臆造。\r\n- **三禁是文本告诫，不是绝对禁忌表**。临床有合病、兼证时须重新判断（见第 9 章）。\r\n- **归一化表仍不完整**：通假（嘿/默）与异体（𤍠/热）混在同一张表里，扩展时须标明类型，否则日后无法区分「写错」与「古写」。\r\n- 判定器输出不构成处方建议。\r\n\r\n> **免责声明：** 条文引自 `standards/shanghan/底本.json`（含古写与异文，可复核）；本章为条文逻辑与检索演示，不构成辨证处方建议。\r\n\r\n## 练习\r\n\r\n1. 把四证的 OR 改成加权评分，会不会更准？用原文「但见一证便是」反驳或支持。\r\n2. 七「或」如果被误当必要条件，会漏掉多少条文？用检索估算。\r\n3. 「嘿」通「默」与「𤍠」代「热」，在数据里应归为同一类还是两类？给出你的分类理由。\r\n\r\n## 进阶思考\r\n\r\n一句话就能改掉一个系统的逻辑结构：「不必悉具」把 AND 变 OR。多数中医 AI 的证候模型默认 AND，因为打分表好写——而原文在这里明确禁止 AND。\r\n",
    "code": {
      "main.js": "'use strict';\n/**\n * 少阳病：柴胡证 OR 判定 + 三禁检查 + 通假/异体归一检索\n *\n *   node code/main.js\n *\n * 口径：\n *   · 原文「但见一证便是，不必悉具」→ 四证取一即可立证，逻辑是 OR 不是 AND。\n *   · 提纲三症（口苦/咽干/目眩）单列，不与四证合并计分。\n *   · 七个「或」是兼症，不当必要条件，代码不参与判定。\n *   · 三禁（汗/吐/下）只做文本提示，不作绝对禁忌。\n */\n\nconst path = require('node:path');\nconst fs = require('node:fs');\n\nconst ROOT = path.resolve(__dirname, '../../../../../..');\nconst BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));\nconst TEXTS = [];\nfor (const p of BOOK.pian) for (const it of p.items) TEXTS.push({ pian: p.no, text: it.text });\n\n/** 归一：type 区分「异体字」与「通假」，日后扩展可分辨 */\nconst VARIANTS = [\n  { from: '𤍠', to: '热', type: '异体' },\n  { from: '嘿嘿', to: '默默', type: '通假' },\n];\n\nfunction normalize(text) {\n  let out = text;\n  const replaced = [];\n  for (const v of VARIANTS) {\n    const n = out.split(v.from).length - 1;\n    if (n) { replaced.push({ ...v, n }); out = out.split(v.from).join(v.to); }\n  }\n  return { text: out, replaced };\n}\n\nfunction search(needle) {\n  const raw = TEXTS.filter((t) => t.text.includes(needle)).length;\n  const norm = TEXTS.filter((t) => normalize(t.text).text.includes(needle)).length;\n  return { needle, raw, normalized: norm, missed: norm - raw };\n}\n\nconst MAIN = ['往来寒热', '胸胁苦满', '默默不欲饮食', '心烦喜呕'];\nconst OUTLINE = ['口苦', '咽干', '目眩'];\n\n/** 柴胡证判定：OR 逻辑 */\nfunction shaoYang(signs = {}) {\n  const hit = MAIN.filter((k) => signs[k] === true);\n  const outline = OUTLINE.filter((k) => signs[k] === true);\n  if (hit.length === 0) {\n    return {\n      established: false,\n      hit,\n      outline,\n      missing: MAIN.filter((k) => !hit.includes(k)),\n      why: '四证皆无（原文：但见一证便是，故无证不立）',\n      notExcluded: ['提纲三症可单独提示少阳倾向，但不等于柴胡证'],\n    };\n  }\n  return {\n    established: true,\n    hit,\n    outline,\n    missing: [],\n    why: `一证即可立（原文「不必悉具」）：${hit[0]}`,\n    notExcluded: ['若已汗/吐/下，须看柴胡证罢不罢', '合病（见第 9 章）'],\n  };\n}\n\n/** 三禁：报了做过什么，就给对应告诫；未做则不提 */\nfunction contra(signs = {}) {\n  const out = [];\n  if (signs.已汗) out.push('已发汗：津伤则邪易入里，原文反复言不可发汗');\n  if (signs.已吐) out.push('已吐：胃气受损，柴胡证欲解而中气先虚');\n  if (signs.已下) out.push('已下：若柴胡证不罢者，原文仍许复与柴胡汤，但须防引邪入里');\n  return out;\n}\n\nfunction main() {\n  console.log('检索（raw vs 归一化）：');\n  for (const k of ['默默不欲饮食', '嘿嘿不欲饮食', '往来寒热', '胸胁苦满', '心烦喜呕', '但见一证']) {\n    const r = search(k);\n    console.log(`  ${k}：raw ${r.raw} → 归一 ${r.normalized}（漏检 ${r.missed}）`);\n  }\n  const tiao = BOOK.pian.filter((p) => p.domain === '少阳病').reduce((a, p) => a + p.actual.tiao, 0);\n  console.log(`\\n规模：少阳病域 ${tiao} 条 · 小柴胡汤 ${search('小柴胡汤').raw} 条 · 柴胡证 ${search('柴胡证').raw} 条`);\n\n  console.log('\\n判定：');\n  for (const s of [{ 往来寒热: true }, { 心烦喜呕: true, 已下: true }, {}]) {\n    const r = shaoYang(s);\n    const c = contra(s);\n    console.log(`  ${JSON.stringify(s)} → ${r.established ? '立柴胡证' : '不立证'}｜命中 ${r.hit.join('/') || '无'}`);\n    if (c.length) console.log(`     三禁提示：${c.join('；')}`);\n  }\n  console.log('\\n本输出为条文逻辑演示，不构成辨证处方建议。');\n}\n\nif (require.main === module) main();\nmodule.exports = { normalize, search, shaoYang, contra, VARIANTS, TEXTS };\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { normalize, search, shaoYang, contra, VARIANTS } = require('./main.js');\n\ntest('归一区分异体与通假：𤍠→热（异体）、嘿嘿→默默（通假）', () => {\n  const r = normalize('往来寒𤍠，嘿嘿不欲饮食');\n  assert.strictEqual(r.text, '往来寒热，默默不欲饮食');\n  assert.deepStrictEqual(r.replaced.map((x) => x.type).sort(), ['异体', '通假']);\n  assert.ok(VARIANTS.every((v) => ['异体', '通假'].includes(v.type)));\n});\n\ntest('检索陷阱：「默默」raw 0 → 归一 3', () => {\n  const r = search('默默不欲饮食');\n  assert.deepStrictEqual([r.raw, r.normalized], [0, 3]);\n});\n\ntest('两层陷阱叠加：「往来寒热」raw 5 → 归一 16', () => {\n  const r = search('往来寒热');\n  assert.deepStrictEqual([r.raw, r.normalized, r.missed], [5, 16, 11]);\n});\n\ntest('OR 判定：任一证即立柴胡证（不必悉具）', () => {\n  for (const k of ['往来寒热', '胸胁苦满', '默默不欲饮食', '心烦喜呕']) {\n    const r = shaoYang({ [k]: true });\n    assert.strictEqual(r.established, true, k);\n    assert.match(r.why, /不必悉具/);\n  }\n});\n\ntest('四证皆无则不立证，并列出缺项；提纲三症不替代柴胡证', () => {\n  const r = shaoYang({ 口苦: true, 咽干: true });\n  assert.strictEqual(r.established, false);\n  assert.deepStrictEqual(r.outline, ['口苦', '咽干']);\n  assert.strictEqual(r.missing.length, 4);\n});\n\ntest('三禁提示只在已施时出现，且「已下」保留原文许复与之说', () => {\n  assert.deepStrictEqual(contra({}), []);\n  const c = contra({ 已下: true });\n  assert.strictEqual(c.length, 1);\n  assert.match(c[0], /复与柴胡汤/);\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "「但见一证便是，不必悉具」的判定含义是？",
          "options": [
            "四证须全备",
            "四证任一即可立柴胡证（OR 逻辑）",
            "只需提纲三症",
            "须七「或」中至少三症"
          ],
          "correct": 1,
          "explanation": "原文明确否定「悉具」，即 AND 逻辑不成立。"
        },
        {
          "stage": "check",
          "question": "少阳提纲三症是？",
          "options": [
            "往来寒热、胸胁苦满、心烦喜呕",
            "口苦、咽干、目眩",
            "腹满、吐、自利",
            "消渴、气上撞心、心中疼热"
          ],
          "correct": 1,
          "explanation": "提纲三症均在上窍与感觉层面，不等于柴胡四证。"
        },
        {
          "stage": "check",
          "question": "按教材词检索「默默不欲饮食」命中 0，原因是？",
          "options": [
            "底本没有此证",
            "底本写作「嘿嘿不欲饮食」（嘿通默）3 条",
            "检索工具故障",
            "该条在亡佚篇"
          ],
          "correct": 1,
          "explanation": "通假字导致词形不匹配，归一并到「默默」后有 3 条。"
        },
        {
          "stage": "check",
          "question": "「往来寒热」raw 5 → 归一 16，多出的 11 条来自？",
          "options": [
            "另 11 条同义表述",
            "11 条写作「往来寒𤍠」，异体字 𤍠",
            "重复条文",
            "注文被计入"
          ],
          "correct": 1,
          "explanation": "与第 3 章同一个异体字，两个陷阱叠在同一词上。"
        },
        {
          "stage": "post",
          "question": "七「或」（或渴、或咳…）在判定中的角色是？",
          "options": [
            "必要条件",
            "兼症加减范围，不参与判定",
            "否定条件",
            "权重加分项"
          ],
          "correct": 1,
          "explanation": "把兼症当必要条件会得出「必须咳才能用」的荒谬结论。"
        },
        {
          "stage": "post",
          "question": "三禁（汗、吐、下）在代码里的正确处理是？",
          "options": [
            "作为绝对禁忌直接拒绝",
            "作为文本提示输出，并保留原文「柴胡证不罢者复与柴胡汤」",
            "完全忽略",
            "换算成剂量调整"
          ],
          "correct": 1,
          "explanation": "原文留了复与的余地，代码不能把告诫当绝对禁令。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-shaoyang-banbiao.md",
        "kind": "prompt",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/05-shaoyang-banbiao/outputs/prompt-shaoyang-banbiao.md",
        "title": "柴胡证 OR 判定助手",
        "description": null,
        "chars": 639,
        "body": "# 柴胡证 OR 判定助手\n\n## 用途\n\n判定一份病历是否立柴胡证：**四证取一即可**，并报三禁与不排除项。\n用于**带教提问、病案讨论、教材逻辑校核**。不做处方决策。\n\n## 提示词\n\n```text\n你是伤寒论助教。下面是病案摘要。请判定柴胡证，按 OR 逻辑，不做处方。\n\n原文依据（底本）：\n1. 提纲：少阳之为病，口苦咽干，目眩也。（篇 11）\n2. 四证：往来寒热、胸胁苦满、嘿嘿（通默）不欲饮食、心烦喜呕（篇 5 小柴胡汤条）\n3. 规则：有柴胡证，但见一证便是，不必悉具。（篇 5）\n4. 七「或」（或渴、或咳…）为兼症，不参与判定。\n\n规则：\n1. 四证任一成立 → 立柴胡证；四证皆无 → 不立，并列出四证。\n2. 提纲三症单列，可提示少阳倾向，但不得单独用来立柴胡证。\n3. 三禁（已汗/已吐/已下）作为提示输出；「已下而柴胡证不罢」须保留原文「复与柴胡汤」的余地。\n4. 检索词若为教材写法（默默），须同时报底本写法（嘿嘿）与命中差异。\n5. 不给方、不给剂量、不判合病从属。\n\n输出格式：\n【判定】立柴胡证 | 不立\n【命中】…（四证）\n【提纲】…（单列）\n【三禁提示】…\n【不排除】…\n【检索口径】raw / 归一化 命中数\n```\n\n## 使用示例\n\n输入：往来寒热两天，口苦，未吐下。\n\n输出：【判定】立柴胡证（一证即可）\n【命中】往来寒热\n【提纲】口苦\n【三禁提示】无\n【不排除】合病；若兼腹满便秘须另判阳明\n【检索口径】往来寒热 raw 5 / 归一 16\n\n## 为什么这样限制\n\n- AND 逻辑会让九成病人判不出来，而原文明确禁止 AND。\n- 提纲三症与柴胡四证混算，会把少阳倾向当柴胡证，扩大适用范围。\n"
      },
      {
        "name": "skill-shaoyang-banbiao.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/05-shaoyang-banbiao/outputs/skill-shaoyang-banbiao.md",
        "title": "shaoyang-banbiao",
        "description": "柴胡证 OR 判定：一证即立、提纲单列、三禁只提示、检索报两层漏检",
        "chars": 506,
        "body": "---\nname: shaoyang-banbiao\ndescription: 柴胡证 OR 判定：一证即立、提纲单列、三禁只提示、检索报两层漏检\nversion: 0.1.0\n---\n\n# shaoyang-banbiao\n\n## 何时使用\n\n- 病历信息不全，四证只有一两项，要判断能否立柴胡证\n- 教材写法与底本用字不一致，需要量化漏检\n- 已误汗/误下，要判断还能不能复与柴胡汤\n\n## 不适用\n\n- 合病与并病的从属判断（见第 9 章）\n- 大柴胡汤、柴胡桂枝汤等变方的选择\n- 剂量与煎服法\n\n## 步骤\n\n1. **归一检索**：教材词 → 底本词（默默/嘿嘿），再叠异体（𤍠/热），两层都报。\n2. **判四证**：OR，一证即立；四证皆无则不立并列缺。\n3. **单列提纲**：口苦/咽干/目眩只作倾向提示。\n4. **三禁提示**：已汗/已吐/已下各给一句，附原文「复与柴胡汤」余地。\n5. **留不排除**：合病、兼阳明、兼太阴。\n\n## 输出模板\n\n```text\n【判定】立柴胡证 | 不立\n【命中】…【提纲】…【三禁提示】…【不排除】…\n【检索口径】raw N / 归一 M\n```\n\n## 质量判据\n\n- 没有用 AND 判定\n- 提纲三症未被用来立证\n- 两层检索数字都在\n- 三禁留了余地\n\n> 本技能只做条文逻辑判定，不构成辨证处方建议。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "01-zhongyi/07-shanghanlun/06-taiyin-xuhan": {
    "key": "01-zhongyi/07-shanghanlun/06-taiyin-xuhan",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "07-shanghanlun",
    "subjectTitle": "伤寒论",
    "chapterSlug": "06-taiyin-xuhan",
    "n": 6,
    "title": "第 6 章 · 太阴病：一条提纲撑起的一章，理中丸不在这一篇",
    "motto": "「太阴之为病，腹满而吐，食不下，自利益甚，时腹自痛，下之必胸下结硬。」——《伤寒论·辨太阴病脉证并治》（篇 23）",
    "problem": "教材说「太阴病，理中汤主之」「自利不渴者，属太阴，宜服四逆辈」。你打开底本一查：理中丸 5 处，全在霍乱篇；「自利不渴」0 处；「四逆辈」0 处。太阴这一经，底本只给你一条提纲。",
    "roots": "环境逼迫(要讲太阴病却无篇可依) + 知识积累(逐篇拆解 × 证据链核对 = 知道哪句能引、哪句是拼合)",
    "html": "<h1 id=\"第-6-章-太阴病-一条提纲撑起的一章-理中丸不在这一篇\">第 6 章 · 太阴病：一条提纲撑起的一章，理中丸不在这一篇</h1>\n<blockquote><p><strong>MOTTO:</strong> 「太阴之为病，腹满而吐，食不下，自利益甚，时腹自痛，下之必胸下结硬。」——《伤寒论·辨太阴病脉证并治》（篇 23）</p>\n<p><strong>PROBLEM:</strong> 教材说「太阴病，理中汤主之」「自利不渴者，属太阴，宜服四逆辈」。你打开底本一查：理中丸 5 处，全在霍乱篇；「自利不渴」0 处；「四逆辈」0 处。太阴这一经，底本只给你一条提纲。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(要讲太阴病却无篇可依) + 知识积累(逐篇拆解 × 证据链核对 = 知道哪句能引、哪句是拼合)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>伤寒论</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>06 / 12</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>逐字引出太阴提纲，并对比篇 27 的异文（「若下之」/「下之必」）</li><li>用实测说明太阴篇在底本里的真实状态：1 条提纲 + 186 条混编 + 7 条目录残片</li><li>说清「理中丸 → 太阴病」这条教材链条在底本里断在哪一环</li><li>写一个证据链核对器：给定「结论←条文」的映射，逐环报「命中/缺失/跨篇」</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"底本里的太阴-被切成三块\">底本里的太阴，被切成三块</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>篇</th><th>标注</th><th>条数</th><th>实际内容</th></tr></thead><tbody><tr><td>12</td><td>辨太阴病脉证并治</td><td>7</td><td><strong>全是卷首与目录行</strong>（「辨太阴病脉证并治第十 辨少阴病脉证并治第十一……宋林亿校正……」），无一条条文</td></tr><tr><td>23</td><td>辨太阴病脉证并治（提纲起）</td><td>1</td><td><strong>唯一一条真条文</strong>：太阴提纲</td></tr><tr><td>27</td><td>辨太阴病脉证并治（提纲起）</td><td>186</td><td>提纲条重复一次，其余混入太阳（14 处）、阳明（3 处）语境；「腹满」5 条、「自利」1 条</td></tr></tbody></table></div>\n<p>所以「太阴病域 194 条」这个数字是真的，但<strong>可用的太阴条文只有 1 条提纲</strong>，其余是混编与目录。</p>\n<h3 id=\"提纲的两个版本\">提纲的两个版本</h3>\n<blockquote><p>太阴之为病，腹满而吐，食不下，自利益甚，时腹自痛，下之必胸下结硬。——（篇 23）</p>\n<p>太阴之为病，腹满而吐，食不下，自利益甚，时腹自痛，若下之，必胸下结硬。——（篇 27 第 1 条）</p></blockquote>\n<p>差别在「下之必」与「若下之，必」：前者是断言，后者是条件。这一字之差会改变条文性质——是「误下必然结硬」还是「若误下则会结硬」。本章两版并列，不择一。</p>\n<h3 id=\"教材链条断在哪一环\">教材链条断在哪一环</h3>\n<p>教材常见的推理链是：</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">腹满而吐、自利 → 脾虚寒 → 温中 → 理中丸/四逆辈</code></pre></div>\n<p>逐环核对底本：</p>\n<div class=\"table-wrap\"><table><thead><tr><th>环节</th><th>底本证据</th><th>状态</th></tr></thead><tbody><tr><td>提纲（腹满而吐、食不下、自利益甚、时腹自痛）</td><td>篇 23 一条</td><td>✅ 命中</td></tr><tr><td>「自利不渴者，属太阴」</td><td><strong>0 处</strong></td><td>❌ 缺失</td></tr><tr><td>「宜服四逆辈」</td><td><strong>0 处</strong></td><td>❌ 缺失</td></tr><tr><td>理中丸</td><td><strong>5 处，全在霍乱篇</strong>（篇 15/16：「霍乱头痛发热，身疼痛，热多欲饮水者，五苓散主之；寒多不用水者，理中丸主之」）</td><td>⚠️ 跨篇</td></tr></tbody></table></div>\n<p>结论不是「教材错」，而是：<strong>「太阴—理中丸」这条链，是靠跨篇拼合与后世补充成立的，不是太阴篇内部的原文</strong>。讲这一章时，引提纲可以引原句；引「理中丸主之」必须标「霍乱篇」，不能标「太阴篇」。</p>\n<h3 id=\"与阳明腹满的鉴别\">与阳明腹满的鉴别</h3>\n<p>两经都有腹满，原文给的分辨点不在「满」，而在<strong>吐利与寒热</strong>：</p>\n<ul><li>太阴：腹满<strong>而吐</strong>，<strong>自利益甚</strong>，时腹自痛（虚寒，喜温按）</li><li>阳明：腹满<strong>潮热</strong>，大便硬，谵语（实热，拒按）</li></ul>\n<p>这个对照可以只用词频与共现算出，不需要背——这也正是代码要做的事。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">// code/main.js\nsplitPian()      // 拆 12/23/27 三篇：条文数、是否目录残片、提纲条\nchainCheck(list)// 逐环核对「结论←条文」映射，报 hit / missing / crossPian\ndifferentiate()  // 太阴 vs 阳明：腹满 ×（吐利 / 潮热大便硬）共现</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：<code>splitPian()</code> 报 12 篇 <code>isToc: true</code>；<code>chainCheck</code> 对「自利不渴」「四逆辈」返回 <code>missing</code>，对「理中丸」返回 <code>crossPian: true</code>；<code>differentiate()</code> 给出太阴/阳明各自的词共现条数。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>本章不重建太阴篇</strong>。缺口如实留在表里，不用其他篇条文填补。</li><li><strong>跨篇引用不是错</strong>，但必须标篇名。把霍乱篇的方写成太阴篇的方，是可复核性的流失。</li><li><strong>1 条提纲不足以支持辨证</strong>。任何「太阴虚寒证」的完整证候描述都超出本章证据。</li><li><strong>目录残片也可能是证据</strong>：它证明了「少阴篇、厥阴篇」确实曾被编在此处（见第 2 章），不该当噪声删掉。</li><li>四逆汤全库 31 条，多分布在太阳、少阴语境与汗吐下篇，本章不据频次推归属。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 条文引自 <code>standards/shanghan/底本.json</code>；该底本太阴篇残缺，本章的缺口标注即为结论的一部分。本章不构成辨证处方建议。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>篇 27 的 186 条里，你用什么规则判定某条「不是太阴」？规则能不能写成代码？</li><li>「下之必」与「若下之，必」在临床推理上有何差别？举一个会被这差别改变判断的场景。</li><li>如果要求「太阴章必须配一个方」，你会选理中丸并标跨篇，还是留空？说明取舍。</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>一门课最难讲的部分，往往是「原文不够」的那一章。承认只有一条提纲，比用三页讲义把它补满更接近事实——而补满的人，通常不会告诉你他补了。</p>",
    "markdown": "# 第 6 章 · 太阴病：一条提纲撑起的一章，理中丸不在这一篇\n\n> **MOTTO:** 「太阴之为病，腹满而吐，食不下，自利益甚，时腹自痛，下之必胸下结硬。」——《伤寒论·辨太阴病脉证并治》（篇 23）\n>\n> **PROBLEM:** 教材说「太阴病，理中汤主之」「自利不渴者，属太阴，宜服四逆辈」。你打开底本一查：理中丸 5 处，全在霍乱篇；「自利不渴」0 处；「四逆辈」0 处。太阴这一经，底本只给你一条提纲。\n>\n> **双根因定位:** 环境逼迫(要讲太阴病却无篇可依) + 知识积累(逐篇拆解 × 证据链核对 = 知道哪句能引、哪句是拼合)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 伤寒论 |\n| 院系 | 中医系 |\n| 章序号 | 06 / 12 |\n| 所属阶段 | 🌿 长·积累 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 3 小时 |\n\n## 学习目标\n\n- 逐字引出太阴提纲，并对比篇 27 的异文（「若下之」/「下之必」）\n- 用实测说明太阴篇在底本里的真实状态：1 条提纲 + 186 条混编 + 7 条目录残片\n- 说清「理中丸 → 太阴病」这条教材链条在底本里断在哪一环\n- 写一个证据链核对器：给定「结论←条文」的映射，逐环报「命中/缺失/跨篇」\n\n## 核心概念\n\n### 底本里的太阴，被切成三块\n\n| 篇 | 标注 | 条数 | 实际内容 |\n|--:|---|--:|---|\n| 12 | 辨太阴病脉证并治 | 7 | **全是卷首与目录行**（「辨太阴病脉证并治第十 辨少阴病脉证并治第十一……宋林亿校正……」），无一条条文 |\n| 23 | 辨太阴病脉证并治（提纲起） | 1 | **唯一一条真条文**：太阴提纲 |\n| 27 | 辨太阴病脉证并治（提纲起） | 186 | 提纲条重复一次，其余混入太阳（14 处）、阳明（3 处）语境；「腹满」5 条、「自利」1 条 |\n\n所以「太阴病域 194 条」这个数字是真的，但**可用的太阴条文只有 1 条提纲**，其余是混编与目录。\n\n### 提纲的两个版本\n\n> 太阴之为病，腹满而吐，食不下，自利益甚，时腹自痛，下之必胸下结硬。——（篇 23）\n>\n> 太阴之为病，腹满而吐，食不下，自利益甚，时腹自痛，若下之，必胸下结硬。——（篇 27 第 1 条）\n\n差别在「下之必」与「若下之，必」：前者是断言，后者是条件。这一字之差会改变条文性质——是「误下必然结硬」还是「若误下则会结硬」。本章两版并列，不择一。\n\n### 教材链条断在哪一环\n\n教材常见的推理链是：\n\n```\n腹满而吐、自利 → 脾虚寒 → 温中 → 理中丸/四逆辈\n```\n\n逐环核对底本：\n\n| 环节 | 底本证据 | 状态 |\n|---|---|:--|\n| 提纲（腹满而吐、食不下、自利益甚、时腹自痛） | 篇 23 一条 | ✅ 命中 |\n| 「自利不渴者，属太阴」 | **0 处** | ❌ 缺失 |\n| 「宜服四逆辈」 | **0 处** | ❌ 缺失 |\n| 理中丸 | **5 处，全在霍乱篇**（篇 15/16：「霍乱头痛发热，身疼痛，热多欲饮水者，五苓散主之；寒多不用水者，理中丸主之」） | ⚠️ 跨篇 |\n\n结论不是「教材错」，而是：**「太阴—理中丸」这条链，是靠跨篇拼合与后世补充成立的，不是太阴篇内部的原文**。讲这一章时，引提纲可以引原句；引「理中丸主之」必须标「霍乱篇」，不能标「太阴篇」。\n\n### 与阳明腹满的鉴别\n\n两经都有腹满，原文给的分辨点不在「满」，而在**吐利与寒热**：\n\n- 太阴：腹满**而吐**，**自利益甚**，时腹自痛（虚寒，喜温按）\n- 阳明：腹满**潮热**，大便硬，谵语（实热，拒按）\n\n这个对照可以只用词频与共现算出，不需要背——这也正是代码要做的事。\n\n## BUILD IT：从零实现\n\n```js\n// code/main.js\nsplitPian()      // 拆 12/23/27 三篇：条文数、是否目录残片、提纲条\nchainCheck(list)// 逐环核对「结论←条文」映射，报 hit / missing / crossPian\ndifferentiate()  // 太阴 vs 阳明：腹满 ×（吐利 / 潮热大便硬）共现\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：`splitPian()` 报 12 篇 `isToc: true`；`chainCheck` 对「自利不渴」「四逆辈」返回 `missing`，对「理中丸」返回 `crossPian: true`；`differentiate()` 给出太阴/阳明各自的词共现条数。\n\n## 代价与边界\n\n- **本章不重建太阴篇**。缺口如实留在表里，不用其他篇条文填补。\n- **跨篇引用不是错**，但必须标篇名。把霍乱篇的方写成太阴篇的方，是可复核性的流失。\n- **1 条提纲不足以支持辨证**。任何「太阴虚寒证」的完整证候描述都超出本章证据。\n- **目录残片也可能是证据**：它证明了「少阴篇、厥阴篇」确实曾被编在此处（见第 2 章），不该当噪声删掉。\n- 四逆汤全库 31 条，多分布在太阳、少阴语境与汗吐下篇，本章不据频次推归属。\n\n> **免责声明：** 条文引自 `standards/shanghan/底本.json`；该底本太阴篇残缺，本章的缺口标注即为结论的一部分。本章不构成辨证处方建议。\n\n## 练习\n\n1. 篇 27 的 186 条里，你用什么规则判定某条「不是太阴」？规则能不能写成代码？\n2. 「下之必」与「若下之，必」在临床推理上有何差别？举一个会被这差别改变判断的场景。\n3. 如果要求「太阴章必须配一个方」，你会选理中丸并标跨篇，还是留空？说明取舍。\n\n## 进阶思考\n\n一门课最难讲的部分，往往是「原文不够」的那一章。承认只有一条提纲，比用三页讲义把它补满更接近事实——而补满的人，通常不会告诉你他补了。\n",
    "code": {
      "main.js": "'use strict';\r\n/**\r\n * 太阴篇证据链核对：拆篇 / 逐环核对 / 太阴阳明腹满鉴别\r\n *\r\n *   node code/main.js\r\n *\r\n * 口径：\r\n *   · 篇 12 是卷首与目录（isToc=true），不计入可用条文。\r\n *   · 提纲条两版并列（篇 23「下之必」/ 篇 27「若下之，必」），不择一。\r\n *   · 「跨篇」不算错，但必须在结论里标出篇名；代码用 crossPian 表达这件事。\r\n *   · 不据频次推归属，不重建缺失条文。\r\n */\r\n\r\nconst path = require('node:path');\r\nconst fs = require('node:fs');\r\n\r\nconst ROOT = path.resolve(__dirname, '../../../../../..');\r\nconst BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));\r\nconst TEXTS = [];\r\nfor (const p of BOOK.pian) for (const it of p.items) TEXTS.push({ pian: p.no, text: it.text });\r\n\r\nconst TOC_MARKS = ['辨太阴病脉证并治第十', '伤寒论卷', '校正', '校刻', '校。'];\r\n\r\nfunction isToc(pian) {\r\n  const items = BOOK.pian.find((p) => p.no === pian).items;\r\n  const hits = items.filter((i) => TOC_MARKS.some((m) => i.text.includes(m))).length;\r\n  return hits / items.length >= 0.6;\r\n}\r\n\r\n/** 拆太阴三篇 */\r\nfunction splitPian() {\r\n  return [12, 23, 27].map((n) => {\r\n    const p = BOOK.pian.find((x) => x.no === n);\r\n    return {\r\n      pian: n,\r\n      tiao: p.actual.tiao,\r\n      chars: p.actual.chars,\r\n      isToc: isToc(n),\r\n      hasOutline: p.items.some((i) => i.text.includes('太阴之为病')),\r\n      outline: (p.items.find((i) => i.text.includes('太阴之为病')) || {}).text || null,\r\n    };\r\n  });\r\n}\r\n\r\n/** 逐环核对：每条「结论←条文」映射的落点 */\r\nfunction chainCheck(list) {\r\n  return list.map(({ claim, needles, expectPian }) => {\r\n    const hits = [];\r\n    for (const n of needles) {\r\n      for (const t of TEXTS) if (t.text.includes(n)) hits.push({ needle: n, pian: t.pian });\r\n    }\r\n    if (hits.length === 0) return { claim, status: 'missing', hits: [] };\r\n    const pians = [...new Set(hits.map((h) => h.pian))];\r\n    // 只以首个检索词（主判据）的落点判跨篇，避免旁证词把结论拉成 crossPian\r\n    const primaryPians = [...new Set(hits.filter((h) => h.needle === needles[0]).map((h) => h.pian))];\r\n    const base = primaryPians.length ? primaryPians : pians;\r\n    const outside = expectPian ? base.filter((x) => !expectPian.includes(x)) : [];\r\n    return {\r\n      claim,\r\n      status: outside.length ? 'crossPian' : 'hit',\r\n      hits: hits.slice(0, 6),\r\n      pians,\r\n      crossPian: outside.length > 0,\r\n    };\r\n  });\r\n}\r\n\r\n/** 太阴 vs 阳明：腹满 ×（吐利 / 潮热大便硬）共现 */\r\nfunction differentiate() {\r\n  const tai = TEXTS.filter((t) => t.text.includes('腹满') && (t.text.includes('吐') || t.text.includes('自利')));\r\n  const yang = TEXTS.filter((t) => t.text.includes('腹满') && (t.text.includes('潮热') || t.text.includes('大便硬')));\r\n  return { taiyin: tai.length, yangming: yang.length };\r\n}\r\n\r\nfunction main() {\r\n  console.log('太阴三篇拆解：');\r\n  for (const r of splitPian()) {\r\n    console.log(`  篇${r.pian}：${r.tiao} 条 / ${r.chars} 字｜目录残片 ${r.isToc ? '是' : '否'}｜提纲条 ${r.hasOutline ? '有' : '无'}`);\r\n    if (r.outline) console.log(`       ${r.outline.slice(0, 46)}…`);\r\n  }\r\n  console.log('\\n教材链条逐环核对：');\r\n  const rows = chainCheck([\r\n    { claim: '提纲：腹满而吐、食不下、自利益甚、时腹自痛', needles: ['腹满而吐', '食不下', '自利益甚', '时腹自痛'], expectPian: [23, 27] },\r\n    { claim: '自利不渴者，属太阴', needles: ['自利不渴'], expectPian: [23, 27] },\r\n    { claim: '宜服四逆辈', needles: ['四逆辈'], expectPian: [23, 27] },\r\n    { claim: '理中丸主之', needles: ['理中丸'], expectPian: [23, 27] },\r\n  ]);\r\n  for (const r of rows) {\r\n    const where = r.hits.length ? `命中篇 ${[...new Set(r.hits.map((h) => h.pian))].join('/')}` : '—';\r\n    console.log(`  ${r.status.padEnd(9)} ${r.claim}（${where}）`);\r\n  }\r\n  const d = differentiate();\r\n  console.log(`\\n腹满鉴别：腹满+吐/自利 ${d.taiyin} 条；腹满+潮热/大便硬 ${d.yangming} 条`);\r\n  console.log('\\n口径：跨篇命中不是错误，但结论必须标篇名；本章不重建缺失条文。');\r\n  console.log('本输出为文本核对，不构成辨证处方建议。');\r\n}\r\n\r\nif (require.main === module) main();\r\nmodule.exports = { splitPian, chainCheck, differentiate, isToc, TEXTS };\r\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { splitPian, chainCheck, differentiate, isToc } = require('./main.js');\n\ntest('篇 12 是目录残片（7 条全为卷首/目录），概不当作可用条文', () => {\n  assert.strictEqual(isToc(12), true);\n  assert.strictEqual(isToc(23), false);\n  const r = splitPian().find((x) => x.pian === 12);\n  assert.strictEqual(r.tiao, 7);\n  assert.strictEqual(r.hasOutline, false);\n});\n\ntest('太阴只有 1 条真提纲（篇 23）+ 篇 27 重复一版，两版字面不同', () => {\n  const rows = splitPian();\n  const p23 = rows.find((x) => x.pian === 23);\n  const p27 = rows.find((x) => x.pian === 27);\n  assert.strictEqual(p23.tiao, 1);\n  assert.match(p23.outline, /下之必胸下结硬/);\n  assert.match(p27.outline, /若下之，必胸下结硬/);\n  assert.notStrictEqual(p23.outline, p27.outline);\n});\n\ntest('教材链条：「自利不渴」「四逆辈」在底本里缺失', () => {\n  const rows = chainCheck([\n    { claim: '自利不渴者，属太阴', needles: ['自利不渴'], expectPian: [23, 27] },\n    { claim: '宜服四逆辈', needles: ['四逆辈'], expectPian: [23, 27] },\n  ]);\n  assert.deepStrictEqual(rows.map((r) => r.status), ['missing', 'missing']);\n});\n\ntest('理中丸 5 处全在霍乱篇（15/16）→ crossPian，不许标成太阴篇', () => {\n  const [r] = chainCheck([{ claim: '理中丸主之', needles: ['理中丸'], expectPian: [23, 27] }]);\n  assert.strictEqual(r.status, 'crossPian');\n  assert.deepStrictEqual(r.pians.sort(), [15, 16]);\n});\n\ntest('提纲主判据命中，跨篇旁证不改变结论', () => {\n  const [r] = chainCheck([{ claim: '提纲', needles: ['腹满而吐'], expectPian: [23, 27] }]);\n  assert.strictEqual(r.status, 'hit');\n});\n\ntest('腹满鉴别：太阴（吐/自利）与阳明（潮热/大便硬）都有可计数条文', () => {\n  const d = differentiate();\n  assert.ok(d.taiyin >= 3, `太阴侧 ${d.taiyin}`);\n  assert.ok(d.yangming >= 3, `阳明侧 ${d.yangming}`);\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "底本「太阴病域」共 194 条，其中真正可用的太阴条文是？",
          "options": [
            "194 条",
            "1 条提纲（篇 23）+ 篇 27 混编里的少量",
            "8 条",
            "0 条"
          ],
          "correct": 1,
          "explanation": "篇 12 是目录残片、篇 23 仅提纲、篇 27 为 186 条混编。"
        },
        {
          "stage": "check",
          "question": "「理中丸」在底本里出现在哪一篇？",
          "options": [
            "太阴篇",
            "霍乱篇（15/16）",
            "阳明篇",
            "厥阴篇"
          ],
          "correct": 1,
          "explanation": "「寒多不用水者，理中丸主之」出自霍乱篇，属跨篇引用。"
        },
        {
          "stage": "check",
          "question": "「自利不渴者，属太阴」与「宜服四逆辈」在底本中的检索结果是？",
          "options": [
            "各 1 条",
            "均 0 条（缺失）",
            "仅「四逆辈」缺失",
            "仅「自利不渴」缺失"
          ],
          "correct": 1,
          "explanation": "两条经典表述都不在底本，教材链条此处断裂。"
        },
        {
          "stage": "check",
          "question": "太阴提纲在篇 23 与篇 27 的差别是？",
          "options": [
            "症状不同",
            "「下之必」与「若下之，必」——断言 vs 条件",
            "篇 27 缺末句",
            "完全相同"
          ],
          "correct": 1,
          "explanation": "一字之差改变条文性质，须两版并列。"
        },
        {
          "stage": "post",
          "question": "把霍乱篇的理中丸写成「太阴篇的方」属于？",
          "options": [
            "正常简化",
            "跨篇引用未标篇名，损害可复核性",
            "学术创新",
            "版本差异"
          ],
          "correct": 1,
          "explanation": "跨篇不是错，不标篇名才是错。"
        },
        {
          "stage": "post",
          "question": "面对只有 1 条提纲的太阴篇，正确做法是？",
          "options": [
            "用后世资料补满讲义",
            "缺口如实标注，结论只到证据能支持的地方",
            "跳过这一章",
            "从少阴篇借条文"
          ],
          "correct": 1,
          "explanation": "缺口标注本身就是结论的一部分。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-taiyin-xuhan.md",
        "kind": "prompt",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/06-taiyin-xuhan/outputs/prompt-taiyin-xuhan.md",
        "title": "证据链核对（结论 ← 条文）",
        "description": null,
        "chars": 684,
        "body": "# 证据链核对（结论 ← 条文）\n\n## 用途\n\n把一条讲义结论拆成「条文支撑环节」，逐环核对底本：命中 / 缺失 / 跨篇。\n用于**教材校核、讲义编写、引文前检查**。不补缺、不推算。\n\n## 提示词\n\n```text\n你是文献核对助手。给定底本（JSON：篇→items[].text）与一组「结论←条文」映射，\n逐环输出状态。\n\n规则：\n1. 每环给三个状态：hit（命中且在本篇）/ crossPian（命中但在别篇）/ missing（检索不到）。\n2. crossPian 必须写出实际篇号；结论里引用时必须标该篇名，禁止改标目标篇。\n3. missing 不许用同义改写去「凑命中」，也不许换成别的书。\n4. 若某篇被判为「目录残片」（卷首、校刻、目录行占比高），单独标注，不计入可用条文。\n5. 同一句有版本差异（如「下之必」/「若下之，必」）时两版并列，不择一。\n6. 输出末尾写口径：缺口标注即结论的一部分。\n\n输出格式：\n【篇况】篇 N：X 条，目录残片 是/否，提纲条 有/无\n【环节】claim → hit | crossPian（篇 …）| missing\n【缺口】…\n【口径】…\n```\n\n## 使用示例\n\n输入：结论「太阴病，理中丸主之」。\n\n输出：\n\n```text\n【篇况】篇 12：7 条，目录残片 是；篇 23：1 条；篇 27：186 条（混编）\n【环节】理中丸主之 → crossPian（篇 15/16 霍乱篇）\n【缺口】「自利不渴者，属太阴」、「宜服四逆辈」→ missing\n【口径】跨篇引用须标篇名；缺口不补\n```\n\n## 为什么这样限制\n\n- 一句话的结论常常由三四条不同来源拼成，不逐环核对就发现不了哪一环是借来的。\n- 允许「跨篇」但强制标篇名，是为了让下一手能复核，而不是禁止使用。\n"
      },
      {
        "name": "skill-taiyin-xuhan.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/06-taiyin-xuhan/outputs/skill-taiyin-xuhan.md",
        "title": "taiyin-xuhan",
        "description": "太阴篇证据链核对：拆篇识目录残片、逐环报 hit/crossPian/missing、缺不补",
        "chars": 519,
        "body": "---\nname: taiyin-xuhan\ndescription: 太阴篇证据链核对：拆篇识目录残片、逐环报 hit/crossPian/missing、缺不补\nversion: 0.1.0\n---\n\n# taiyin-xuhan\n\n## 何时使用\n\n- 讲义写「太阴病，理中汤主之」前，核对这句出自哪一篇\n- 某一经条文明显偏少，怀疑篇目残缺\n- 需要区分「原文没有」与「我没检索到」\n\n## 不适用\n\n- 重建缺失篇（本技能只标缺口）\n- 太阴虚寒证的完整辨证（证据不足）\n- 剂量与煎服法\n\n## 步骤\n\n1. **拆篇**：把该经各篇列条数，判「目录残片」（卷首/校刻/目录行占比 ≥60%）。\n2. **取提纲**：逐字，多版本并列。\n3. **逐环核对**：每条结论映射到检索词，报 hit / crossPian（篇号）/ missing。\n4. **标缺口**：missing 不补、不换书、不同义凑。\n5. **写口径**：缺口标注即结论的一部分。\n\n## 输出模板\n\n```text\n【篇况】篇 N：X 条，目录残片 是/否\n【环节】claim → hit | crossPian（篇 …）| missing\n【缺口】…\n【口径】…\n```\n\n## 质量判据\n\n- 跨篇的都标了篇号\n- 没有用别的书补缺\n- 目录残片没被算成条文\n\n> 本技能只做证据链核对，不构成辨证处方建议。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "01-zhongyi/07-shanghanlun/08-jueyin-hanre": {
    "key": "01-zhongyi/07-shanghanlun/08-jueyin-hanre",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "07-shanghanlun",
    "subjectTitle": "伤寒论",
    "chapterSlug": "08-jueyin-hanre",
    "n": 8,
    "title": "第 8 章 · 厥阴病：30 条，乌梅丸一次也没出现",
    "motto": "「厥阴之为病，消渴，气上撞心，心中疼热，饥而不欲食，食则吐蛔，下之利不止。」——《伤寒论·辨厥阴病脉证并治》（篇 24）",
    "problem": "教材把乌梅丸当厥阴病的主方讲一整节。你在底本里检索「乌梅丸」——0 条。厥阴篇 30 条里没有它，全书也没有它。",
    "roots": "环境逼迫(要讲厥阴主方) + 知识积累(篇内/篇外分开统计 = 知道哪些话能说「厥阴篇说」)",
    "html": "<h1 id=\"第-8-章-厥阴病-30-条-乌梅丸一次也没出现\">第 8 章 · 厥阴病：30 条，乌梅丸一次也没出现</h1>\n<blockquote><p><strong>MOTTO:</strong> 「厥阴之为病，消渴，气上撞心，心中疼热，饥而不欲食，食则吐蛔，下之利不止。」——《伤寒论·辨厥阴病脉证并治》（篇 24）</p>\n<p><strong>PROBLEM:</strong> 教材把乌梅丸当厥阴病的主方讲一整节。你在底本里检索「乌梅丸」——0 条。厥阴篇 30 条里没有它，全书也没有它。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(要讲厥阴主方) + 知识积累(篇内/篇外分开统计 = 知道哪些话能说「厥阴篇说」)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>伤寒论</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>08 / 12</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>逐字引出厥阴提纲，把六个症拆开，指出「下之利不止」是<strong>禁忌后果</strong>而非症状</li><li>用「篇内 / 篇外」两列统计区分：什么证据在厥阴篇里，什么只存在于全书别处</li><li>说清乌梅丸在底本中的状态（0 命中），以及这对讲义意味着什么</li><li>写一个分布探针：对每个关键词同时给「篇内条数」与「全库条数」</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"提纲六症-其中一句是禁令\">提纲六症，其中一句是禁令</h3>\n<blockquote><p>厥阴之为病，消渴，气上撞心，心中疼热，饥而不欲食，食则吐蛔，下之利不止。——（篇 24 第 1 条）</p></blockquote>\n<p>拆开看：</p>\n<div class=\"table-wrap\"><table><thead><tr><th>原文</th><th>性质</th></tr></thead><tbody><tr><td>消渴</td><td>症状</td></tr><tr><td>气上撞心</td><td>症状（病人自述的气逆感）</td></tr><tr><td>心中疼热</td><td>症状</td></tr><tr><td>饥而不欲食</td><td>症状（矛盾性食欲）</td></tr><tr><td>食则吐蛔</td><td>症状（进食触发）</td></tr><tr><td><strong>下之利不止</strong></td><td><strong>误治后果 / 禁令</strong></td></tr></tbody></table></div>\n<p>前五条是症，最后一条是「若下之则利不止」的告诫。顺带一个自己踩到的坑：底本把「心中疼热」写作「心中疼𤍠」，本章的解析器第一版没归一，只数出 4 症——<strong>同一个异体字在第 3、5、8 章各绊了一次</strong>。把它当成第六个症状，就会出现「厥阴病见下利不止」的错误读法——原文说的是<strong>下法造成</strong>的利不止。</p>\n<h3 id=\"篇内-30-条的构成\">篇内 30 条的构成</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>内容</th><th>条数</th></tr></thead><tbody><tr><td>提纲条</td><td>1</td></tr><tr><td>涉「厥」的条文</td><td>4（含提纲）</td></tr><tr><td>含「少阴病」的条文（混入）</td><td>1（第 2 条起）</td></tr><tr><td>含「阳明病」的条文（混入）</td><td>4</td></tr><tr><td>其余</td><td>二十余条属太阳/阳明语境</td></tr></tbody></table></div>\n<p>篇 24 从第 2 条起就出现「少阴病，饮食入口则吐……」，与第 6 章太阴篇的问题同源：<strong>底本的篇界在少阴/厥阴之间是错位的</strong>。</p>\n<h3 id=\"篇内-vs-篇外-一张必须分两列的表\">篇内 vs 篇外：一张必须分两列的表</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>关键词</th><th>厥阴篇（篇 24）内</th><th>全库</th></tr></thead><tbody><tr><td>「厥」</td><td>4</td><td><strong>45</strong></td></tr><tr><td>「乌梅丸」</td><td><strong>0</strong></td><td><strong>0</strong></td></tr><tr><td>「四逆散」</td><td>0</td><td><strong>0</strong></td></tr><tr><td>「当归四逆汤」</td><td><strong>1</strong></td><td><strong>2</strong></td></tr><tr><td>「厥深」/「热亦深」</td><td>0</td><td><strong>1</strong></td></tr><tr><td>「气上撞心」</td><td>1</td><td>1</td></tr><tr><td>「消渴」</td><td>1</td><td><strong>5</strong></td></tr><tr><td>「吐蛔」</td><td>1</td><td><strong>4</strong></td></tr></tbody></table></div>\n<p>读法：厥阴篇里能引的只有提纲与 3 条零散涉厥条文；「厥深者热亦深」这句名言在底本里只出现 1 次，且<strong>不在厥阴篇</strong>；乌梅丸、四逆散全库 0 命中。</p>\n<p>这意味着讲义必须写成：「厥阴病的提纲是……；至于乌梅丸，底本未收此条，常见于后世刊本与其他版本，需另行补源。」——一句话就把「引文」和「转述」分开了。</p>\n<h3 id=\"为什么这章仍然值得写\">为什么这章仍然值得写</h3>\n<p>厥阴是六经里条文最少、最破碎的一篇（30 条，占全书 1.7%）。它的教学价值不在「背乌梅丸」，而在<strong>学会承认证据边界</strong>：同一句话，写成「厥阴篇云」与写成「后世云」，可复核性完全不同。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">// code/main.js\nparseOutline()   // 提纲逐症拆分，标出「症」与「误治后果」\nprobe(key)       // 篇内条数 vs 全库条数\nmixCheck()       // 篇 24 内混入的其他经病名统计（少阴/太阳/阳明）</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：<code>probe('乌梅丸')</code> → <code>{inPian: 0, all: 0}</code>；<code>probe('厥')</code> → <code>{inPian: 4, all: 45}</code>；<code>parseOutline()</code> 的 <code>contra</code> 字段包含「下之利不止」而非并入 <code>symptoms</code>。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>本章不补乌梅丸条</strong>。任何厥阴主方的讲解都标注「底本无此条」。</li><li><strong>篇界错位是底本缺陷</strong>，不是厥阴病本身的问题；本章只做标注，不做校勘。</li><li><strong>30 条不足以描述厥阴病全貌</strong>。凡本章未引的厥阴论述，一律不写。</li><li><strong>「厥」字在全书 45 条中大量属太阳、阳明语境</strong>（如「手足厥冷」作为症状出现在别经），不能按字面归入厥阴。</li><li>寒热错杂的治法涉及附子、干姜等峻药，本章不涉剂量与用法。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 条文引自 <code>standards/shanghan/底本.json</code>（厥阴篇残缺，缺口已标注）；本章为文本结构核对，不构成辨证处方建议。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>提纲里「下之利不止」若被读成症状，会导致什么错误结论？举一个具体例子。</li><li>「厥深者热亦深」不在厥阴篇，引用时该怎么写才不失真？</li><li>若要求你为厥阴病补一章，你会先补哪一类证据（版本、注家、还是别本条文）？为什么？</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>一门学问的成熟度，常常体现在它怎么处理「没有」：是把没有的补上，还是把没有的说清楚。厥阴篇 30 条是一个测试——你能不能在只有提纲的地方，讲出一节不掺水的课。</p>",
    "markdown": "# 第 8 章 · 厥阴病：30 条，乌梅丸一次也没出现\r\n\r\n> **MOTTO:** 「厥阴之为病，消渴，气上撞心，心中疼热，饥而不欲食，食则吐蛔，下之利不止。」——《伤寒论·辨厥阴病脉证并治》（篇 24）\r\n>\r\n> **PROBLEM:** 教材把乌梅丸当厥阴病的主方讲一整节。你在底本里检索「乌梅丸」——0 条。厥阴篇 30 条里没有它，全书也没有它。\r\n>\r\n> **双根因定位:** 环境逼迫(要讲厥阴主方) + 知识积累(篇内/篇外分开统计 = 知道哪些话能说「厥阴篇说」)\r\n\r\n## 课程信息\r\n\r\n| 项目 | 内容 |\r\n|------|------|\r\n| 学科 | 伤寒论 |\r\n| 院系 | 中医系 |\r\n| 章序号 | 08 / 12 |\r\n| 所属阶段 | 🌿 长·积累 |\r\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\r\n| 预估时长 | 3 小时 |\r\n\r\n## 学习目标\r\n\r\n- 逐字引出厥阴提纲，把六个症拆开，指出「下之利不止」是**禁忌后果**而非症状\r\n- 用「篇内 / 篇外」两列统计区分：什么证据在厥阴篇里，什么只存在于全书别处\r\n- 说清乌梅丸在底本中的状态（0 命中），以及这对讲义意味着什么\r\n- 写一个分布探针：对每个关键词同时给「篇内条数」与「全库条数」\r\n\r\n## 核心概念\r\n\r\n### 提纲六症，其中一句是禁令\r\n\r\n> 厥阴之为病，消渴，气上撞心，心中疼热，饥而不欲食，食则吐蛔，下之利不止。——（篇 24 第 1 条）\r\n\r\n拆开看：\r\n\r\n| 原文 | 性质 |\r\n|---|---|\r\n| 消渴 | 症状 |\r\n| 气上撞心 | 症状（病人自述的气逆感） |\r\n| 心中疼热 | 症状 |\r\n| 饥而不欲食 | 症状（矛盾性食欲） |\r\n| 食则吐蛔 | 症状（进食触发） |\r\n| **下之利不止** | **误治后果 / 禁令** |\r\n\r\n前五条是症，最后一条是「若下之则利不止」的告诫。顺带一个自己踩到的坑：底本把「心中疼热」写作「心中疼𤍠」，本章的解析器第一版没归一，只数出 4 症——**同一个异体字在第 3、5、8 章各绊了一次**。把它当成第六个症状，就会出现「厥阴病见下利不止」的错误读法——原文说的是**下法造成**的利不止。\r\n\r\n### 篇内 30 条的构成\r\n\r\n| 内容 | 条数 |\r\n|---|--:|\r\n| 提纲条 | 1 |\r\n| 涉「厥」的条文 | 4（含提纲） |\r\n| 含「少阴病」的条文（混入） | 1（第 2 条起） |\r\n| 含「阳明病」的条文（混入） | 4 |\r\n| 其余 | 二十余条属太阳/阳明语境 |\r\n\r\n篇 24 从第 2 条起就出现「少阴病，饮食入口则吐……」，与第 6 章太阴篇的问题同源：**底本的篇界在少阴/厥阴之间是错位的**。\r\n\r\n### 篇内 vs 篇外：一张必须分两列的表\r\n\r\n| 关键词 | 厥阴篇（篇 24）内 | 全库 |\r\n|---|--:|--:|\r\n| 「厥」 | 4 | **45** |\r\n| 「乌梅丸」 | **0** | **0** |\r\n| 「四逆散」 | 0 | **0** |\r\n| 「当归四逆汤」 | **1** | **2** |\r\n| 「厥深」/「热亦深」 | 0 | **1** |\r\n| 「气上撞心」 | 1 | 1 |\r\n| 「消渴」 | 1 | **5** |\r\n| 「吐蛔」 | 1 | **4** |\r\n\r\n读法：厥阴篇里能引的只有提纲与 3 条零散涉厥条文；「厥深者热亦深」这句名言在底本里只出现 1 次，且**不在厥阴篇**；乌梅丸、四逆散全库 0 命中。\r\n\r\n这意味着讲义必须写成：「厥阴病的提纲是……；至于乌梅丸，底本未收此条，常见于后世刊本与其他版本，需另行补源。」——一句话就把「引文」和「转述」分开了。\r\n\r\n### 为什么这章仍然值得写\r\n\r\n厥阴是六经里条文最少、最破碎的一篇（30 条，占全书 1.7%）。它的教学价值不在「背乌梅丸」，而在**学会承认证据边界**：同一句话，写成「厥阴篇云」与写成「后世云」，可复核性完全不同。\r\n\r\n## BUILD IT：从零实现\r\n\r\n```js\r\n// code/main.js\r\nparseOutline()   // 提纲逐症拆分，标出「症」与「误治后果」\r\nprobe(key)       // 篇内条数 vs 全库条数\r\nmixCheck()       // 篇 24 内混入的其他经病名统计（少阴/太阳/阳明）\r\n```\r\n\r\n## 验证\r\n\r\n```bash\r\nnode code/main.js\r\nnode --test code/main.test.js\r\n```\r\n\r\n预期：`probe('乌梅丸')` → `{inPian: 0, all: 0}`；`probe('厥')` → `{inPian: 4, all: 45}`；`parseOutline()` 的 `contra` 字段包含「下之利不止」而非并入 `symptoms`。\r\n\r\n## 代价与边界\r\n\r\n- **本章不补乌梅丸条**。任何厥阴主方的讲解都标注「底本无此条」。\r\n- **篇界错位是底本缺陷**，不是厥阴病本身的问题；本章只做标注，不做校勘。\r\n- **30 条不足以描述厥阴病全貌**。凡本章未引的厥阴论述，一律不写。\r\n- **「厥」字在全书 45 条中大量属太阳、阳明语境**（如「手足厥冷」作为症状出现在别经），不能按字面归入厥阴。\r\n- 寒热错杂的治法涉及附子、干姜等峻药，本章不涉剂量与用法。\r\n\r\n> **免责声明：** 条文引自 `standards/shanghan/底本.json`（厥阴篇残缺，缺口已标注）；本章为文本结构核对，不构成辨证处方建议。\r\n\r\n## 练习\r\n\r\n1. 提纲里「下之利不止」若被读成症状，会导致什么错误结论？举一个具体例子。\r\n2. 「厥深者热亦深」不在厥阴篇，引用时该怎么写才不失真？\r\n3. 若要求你为厥阴病补一章，你会先补哪一类证据（版本、注家、还是别本条文）？为什么？\r\n\r\n## 进阶思考\r\n\r\n一门学问的成熟度，常常体现在它怎么处理「没有」：是把没有的补上，还是把没有的说清楚。厥阴篇 30 条是一个测试——你能不能在只有提纲的地方，讲出一节不掺水的课。\r\n",
    "code": {
      "main.js": "'use strict';\r\n/**\r\n * 厥阴篇：提纲逐症解析 + 篇内/篇外分布探针 + 混入检查\r\n *\r\n *   node code/main.js\r\n *\r\n * 口径：\r\n *   · 提纲里「下之利不止」是误治后果，不是症状；代码把它放进 contra，不并入 symptoms。\r\n *   · 每类证据都报两列：篇 24 内条数 / 全库条数 —— 只报一列会看不出证据边界。\r\n *   · 乌梅丸、四逆散在底本全库 0 命中；本章只标缺口，不补条文。\r\n */\r\n\r\nconst path = require('node:path');\r\nconst fs = require('node:fs');\r\n\r\nconst ROOT = path.resolve(__dirname, '../../../../../..');\r\nconst BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));\r\n\r\nconst JUEYIN = 24;\r\nconst PIAN = BOOK.pian.find((p) => p.no === JUEYIN);\r\nconst ALL = [];\r\nfor (const p of BOOK.pian) for (const it of p.items) ALL.push({ pian: p.no, text: it.text });\r\n\r\n/** 异体归一：底本「心中疼𤍠」用 𤍠，不归一就数不出这一症（本章自身踩到的坑） */\r\nconst norm = (x) => x.split('𤍠').join('热');\r\n\r\n/** 提纲逐症拆分：「下之利不止」归 contra */\r\nfunction parseOutline() {\r\n  const t = norm(PIAN.items[0].text);\r\n  const symptoms = ['消渴', '气上撞心', '心中疼热', '饥而不欲食', '食则吐蛔'].filter((k) => t.includes(k));\r\n  const contra = ['下之利不止', '若下之', '下之'].find((k) => t.includes(k)) || null;\r\n  return { raw: t, symptoms, contra, symptomCount: symptoms.length };\r\n}\r\n\r\n/** 篇内 vs 全库 */\r\nfunction probe(key) {\r\n  return {\r\n    key,\r\n    inPian: PIAN.items.filter((i) => i.text.includes(key)).length,\r\n    all: ALL.filter((i) => i.text.includes(key)).length,\r\n  };\r\n}\r\n\r\n/** 篇内混入的其他经病名 */\r\nfunction mixCheck() {\r\n  const out = {};\r\n  for (const k of ['太阳病', '阳明病', '少阳病', '太阴病', '少阴病', '霍乱']) {\r\n    const n = PIAN.items.filter((i) => i.text.includes(k)).length;\r\n    if (n) out[k] = n;\r\n  }\r\n  return out;\r\n}\r\n\r\nfunction main() {\r\n  const o = parseOutline();\r\n  console.log(`厥阴提纲（篇 ${JUEYIN} 第 1 条）：\\n  ${o.raw}\\n`);\r\n  console.log(`  症状 ${o.symptomCount} 项：${o.symptoms.join('、')}`);\r\n  console.log(`  误治后果：${o.contra}（不是症状）\\n`);\r\n\r\n  console.log(`篇 ${JUEYIN} 共 ${PIAN.actual.tiao} 条 / ${PIAN.actual.chars} 字\\n`);\r\n  console.log('篇内 vs 全库：');\r\n  for (const k of ['厥', '乌梅丸', '四逆散', '当归四逆汤', '厥深', '热亦深', '气上撞心', '消渴', '吐蛔']) {\r\n    const r = probe(k);\r\n    const flag = r.inPian === 0 && r.all === 0 ? '  ← 底本无此条' : r.inPian === 0 ? '  ← 仅篇外' : '';\r\n    console.log(`  ${k.padEnd(6, '　')} 篇内 ${String(r.inPian).padStart(2)} ｜ 全库 ${String(r.all).padStart(3)}${flag}`);\r\n  }\r\n  console.log(`\\n混入检查：${JSON.stringify(mixCheck())}`);\r\n  console.log('口径：厥阴篇残缺，「厥」字在别经语境亦大量出现，不可按字面归经。');\r\n  console.log('本输出为文本核对，不构成辨证处方建议。');\r\n}\r\n\r\nif (require.main === module) main();\r\nmodule.exports = { parseOutline, probe, mixCheck, PIAN, ALL };\r\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { parseOutline, probe, mixCheck, PIAN } = require('./main.js');\n\ntest('提纲拆出 5 症 + 1 条禁令：「下之利不止」不算症状', () => {\n  const o = parseOutline();\n  assert.strictEqual(o.symptomCount, 5);\n  assert.deepStrictEqual(o.symptoms, ['消渴', '气上撞心', '心中疼热', '饥而不欲食', '食则吐蛔']);\n  assert.strictEqual(o.contra, '下之利不止');\n  assert.ok(!o.symptoms.includes('下之利不止'));\n});\n\ntest('异体字已归一：提纲里的「心中疼𤍠」应计为一个症状而非丢失', () => {\n  assert.ok(parseOutline().raw.includes('心中疼热'));\n});\n\ntest('乌梅丸与四逆散在底本全库为 0（缺口可复核）', () => {\n  for (const k of ['乌梅丸', '四逆散']) {\n    const r = probe(k);\n    assert.deepStrictEqual([r.inPian, r.all], [0, 0], k);\n  }\n});\n\ntest('篇内 vs 全库：「厥」篇内 4 / 全库 45；「厥深」「热亦深」仅篇外', () => {\n  assert.deepStrictEqual([probe('厥').inPian, probe('厥').all], [4, 45]);\n  assert.deepStrictEqual([probe('厥深').inPian, probe('厥深').all], [0, 1]);\n  assert.deepStrictEqual([probe('热亦深').inPian, probe('热亦深').all], [0, 1]);\n});\n\ntest('当归四逆汤：篇内有 1 条，但全库仅 2 条', () => {\n  assert.deepStrictEqual([probe('当归四逆汤').inPian, probe('当归四逆汤').all], [1, 2]);\n});\n\ntest('篇 24 共 30 条，且混入少阴病 1 条、阳明病 4 条（篇界错位）', () => {\n  assert.strictEqual(PIAN.actual.tiao, 30);\n  const m = mixCheck();\n  assert.strictEqual(m['少阴病'], 1);\n  assert.strictEqual(m['阳明病'], 4);\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "厥阴提纲共有几「症」？",
          "options": [
            "6 症",
            "5 症（末句「下之利不止」是误治后果）",
            "4 症",
            "3 症"
          ],
          "correct": 1,
          "explanation": "「下之利不止」是下法造成的后果，不是症状。"
        },
        {
          "stage": "check",
          "question": "「乌梅丸」在底本中的检索结果是？",
          "options": [
            "厥阴篇内 1 条",
            "全库 0 条",
            "阳明篇有 1 条",
            "共 3 条"
          ],
          "correct": 1,
          "explanation": "底本未收乌梅丸条，厥阴主方无法从底本取证。"
        },
        {
          "stage": "check",
          "question": "「厥」字在厥阴篇与全库的条数分别是？",
          "options": [
            "4 / 45",
            "30 / 30",
            "0 / 45",
            "4 / 4"
          ],
          "correct": 0,
          "explanation": "篇内 4 条，全库 45 条——多数在别经语境，不能按字面归经。"
        },
        {
          "stage": "check",
          "question": "「厥深者热亦深」在底本里的分布是？",
          "options": [
            "厥阴篇内",
            "仅篇外（全库 1 条）",
            "不存在",
            "多处重复"
          ],
          "correct": 1,
          "explanation": "名言虽在底本，但不在厥阴篇，引用须标实际篇名。"
        },
        {
          "stage": "post",
          "question": "写讲义时引用乌梅丸的正确做法是？",
          "options": [
            "写「厥阴篇云：乌梅丸主之」",
            "注明底本未收此条，属后世刊本/他本内容，需另标来源",
            "直接删掉不提",
            "用四逆散代替"
          ],
          "correct": 1,
          "explanation": "引文与转述必须分开标注。"
        },
        {
          "stage": "post",
          "question": "厥阴篇只有 30 条（全书 1.7%），这说明？",
          "options": [
            "厥阴病罕见",
            "底本该篇残缺、篇界错位，不能用条数推病证权重",
            "厥阴不重要",
            "其他篇抄多了"
          ],
          "correct": 1,
          "explanation": "条数反映底本状态，不反映临床权重。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-jueyin-hanre.md",
        "kind": "prompt",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/08-jueyin-hanre/outputs/prompt-jueyin-hanre.md",
        "title": "篇内 / 篇外证据探针",
        "description": null,
        "chars": 670,
        "body": "# 篇内 / 篇外证据探针\n\n## 用途\n\n引用某经的条文前，先分清「在这篇里」与「只在全书里」：每个关键词给两列计数。\n用于**讲义编写、引文核对、残缺篇识别**。不补缺、不推归属。\n\n## 提示词\n\n```text\n你是伤寒论文献核对助手。给定底本（JSON：篇→items[].text）与目标篇号。\n\n任务：对一组关键词输出——\n【关键词】篇内 N ｜ 全库 M  ［标记：底本无此条 / 仅篇外 / 篇内可用］\n\n规则：\n1. 必须同时给两列；只给一列视为无效输出。\n2. 「底本无此条」（M=0）时，讲义只能写「底本未收」，不得写成「本篇云」。\n3. 「仅篇外」（篇内 0、全库 >0）时必须写出实际篇号，引用时标该篇。\n4. 提纲类药物/方名逐字检索，不做同义扩展；异体字（如 𤍠）先归一再计数，并说明归一。\n5. 若本篇混入其他经病名（太阳病/阳明病/少阴病…），单列「混入检查」。\n6. 输出末尾写口径：条数反映底本状态，不反映病证权重。\n\n输出格式：\n【提纲】原文 + 症状 n 项 + 误治后果\n【分布】关键词｜篇内｜全库｜标记\n【混入】…\n【口径】…\n```\n\n## 使用示例\n\n输入：篇 24（厥阴）。\n\n输出（节选）：\n\n```text\n【提纲】厥阴之为病，消渴，气上撞心，心中疼热，饥而不欲食，食则吐蛔，下之利不止。\n        症状 5 项；误治后果：下之利不止\n【分布】乌梅丸｜0｜0｜底本无此条\n        厥深｜0｜1｜仅篇外\n        厥｜4｜45｜篇内可用（但别经亦多用）\n【混入】少阴病 1、阳明病 4\n【口径】条数反映底本状态\n```\n\n## 为什么这样限制\n\n- 一列数字最容易被误读成「本篇有」；两列并置，缺口自己显形。\n- 「仅篇外」若不标篇号，读者会把别篇条文当本篇原文，这是最常见的引文失真。\n"
      },
      {
        "name": "skill-jueyin-hanre.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/08-jueyin-hanre/outputs/skill-jueyin-hanre.md",
        "title": "jueyin-hanre",
        "description": "篇内/篇外证据探针：两列计数、缺条标底本未收、仅篇外标篇号",
        "chars": 453,
        "body": "---\nname: jueyin-hanre\ndescription: 篇内/篇外证据探针：两列计数、缺条标底本未收、仅篇外标篇号\nversion: 0.1.0\n---\n\n# jueyin-hanre\n\n## 何时使用\n\n- 引用某经条文，需要确认它是否真在该篇\n- 某篇条文数异常少，怀疑残缺或混编\n- 教材主方在底本里查不到，需要给出可复核的说法\n\n## 不适用\n\n- 补佚（本技能只标缺口）\n- 厥阴病的完整辨证（底本证据不足）\n- 方剂剂量与加减\n\n## 步骤\n\n1. **取提纲**：逐字，先归类「症状 / 误治后果」。\n2. **归一**：异体字（𤍠 等）先归一再计数，并写明。\n3. **两列计数**：篇内 / 全库，逐词标注「底本无此条 / 仅篇外 / 篇内可用」。\n4. **混入检查**：本篇内出现的其他经病名计数。\n5. **写口径**：条数反映底本状态，不反映病证权重。\n\n## 输出模板\n\n```text\n【提纲】…\n【分布】词｜篇内｜全库｜标记\n【混入】…\n【口径】…\n```\n\n## 质量判据\n\n- 两列都在\n- 「仅篇外」都带篇号\n- 没有把缺口写成「本篇云」\n- 异体归一有说明\n\n> 本技能只做文本核对，不构成辨证处方建议。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "01-zhongyi/07-shanghanlun/09-hebing-bingbing": {
    "key": "01-zhongyi/07-shanghanlun/09-hebing-bingbing",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "07-shanghanlun",
    "subjectTitle": "伤寒论",
    "chapterSlug": "09-hebing-bingbing",
    "n": 9,
    "title": "第 9 章 · 合病与并病：两经同时病，还是一个没走一个又来",
    "motto": "「太阳与阳明合病者，必自下利，葛根汤主之。」——《伤寒论·辨太阳病脉证并治中》",
    "problem": "你在病历上写「太阳阳明合病」，但被问「合病和并病差在哪、这条为什么用葛根汤而不是麻黄汤」时，只能说「都是两经病」。",
    "roots": "环境逼迫(带教提问要一句话说清区别) + 知识积累(原文计数 × 经名配对 = 一份能按「哪两经」检索、能报出条文的传变分类)",
    "html": "<h1 id=\"第-9-章-合病与并病-两经同时病-还是一个没走一个又来\">第 9 章 · 合病与并病：两经同时病，还是一个没走一个又来</h1>\n<blockquote><p><strong>MOTTO:</strong> 「太阳与阳明合病者，必自下利，葛根汤主之。」——《伤寒论·辨太阳病脉证并治中》</p>\n<p><strong>PROBLEM:</strong> 你在病历上写「太阳阳明合病」，但被问「合病和并病差在哪、这条为什么用葛根汤而不是麻黄汤」时，只能说「都是两经病」。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(带教提问要一句话说清区别) + 知识积累(原文计数 × 经名配对 = 一份能按「哪两经」检索、能报出条文的传变分类)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>伤寒论</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>09 / 12</td></tr><tr><td>所属阶段</td><td>🌳 壮·鼎盛</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>用一句话区分合病（两经或三经<strong>同时</strong>发病）与并病（一经<strong>未罢</strong>又见他经）</li><li>按本仓库底本实测：合病 29 处、并病 16 处，并说出最集中的经名配对</li><li>说清「太阳阳明合病用葛根汤」的道理：病位在表里之间、以下利为主症，故不用麻黄汤峻汗</li><li>写出一个解析器：从条文里认出「哪两经 + 合病/并病 + 主方」，并保留出处</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"定义-同时-vs-先后\">定义：同时 vs 先后</h3>\n<ul><li><strong>合病</strong>：两经或三经的病证<strong>同时出现</strong>，如「太阳阳明合病」（表证与里证同见）。</li><li><strong>并病</strong>：一经病证<strong>未罢</strong>，另一经证候<strong>又起</strong>，如太阳未解而阳明已见，常以双解为法。</li></ul>\n<p>差别不在「几经」，而在<strong>时间结构</strong>：合病是并列，并病是叠加。这个差别决定了治法能不能「先解其一」——并病可以分先后，合病必须同时兼顾。</p>\n<h3 id=\"实测-合病集中在太阳-阳明\">实测：合病集中在太阳+阳明</h3>\n<p>按 <code>standards/shanghan/底本.json</code> 逐条扫描（1760 条）：</p>\n<div class=\"table-wrap\"><table><thead><tr><th>类型</th><th>经名配对</th><th>条数</th></tr></thead><tbody><tr><td>合病</td><td>太阳 + 阳明</td><td>14</td></tr><tr><td>合病</td><td>阳明 + 少阳</td><td>5</td></tr><tr><td>合病</td><td>太阳 + 少阳</td><td>3</td></tr><tr><td>合病</td><td>未标经名</td><td>5</td></tr><tr><td>合病</td><td>仅标一经</td><td>2</td></tr><tr><td>并病</td><td>太阳 + 少阳</td><td>7</td></tr><tr><td>并病</td><td>仅标太阳</td><td>5</td></tr><tr><td>并病</td><td>太阳 + 阳明</td><td>4</td></tr></tbody></table></div>\n<p>合病 29 处、并病 16 处，合计 45 处。两个可直接观察到的偏斜：<strong>合病最常出现在太阳+阳明</strong>（14/29），<strong>并病最常出现在太阳+少阳</strong>（7/16）。这不是理论推演，是底本里条文自己说的话。</p>\n<h3 id=\"为什么是葛根汤\">为什么是葛根汤</h3>\n<p>「太阳与阳明合病者，必自下利，葛根汤主之。」（篇内第 72 条）——表未解而里已受，主症是下利。葛根汤由桂枝汤加麻黄、葛根而成：解表而不峻汗，升津而止利。若见「喘而胸满」而<strong>无下利</strong>，同篇第 8 条则说「不可下，宜麻黄汤」——同一合病，主症不同，方就不同。这正是「合病必须同时兼顾」的具体样子。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">// code/main.js：扫描底本，抽「合病/并病 + 经名配对 + 方名」，按配对计数\nconst JING = ['太阳', '阳明', '少阳', '太阴', '少阴', '厥阴'];\nfunction scan() { /* 返回 [{kind, pair, pian, no, text}] */ }\nfunction tally() { /* 按 pair 计数，不合并「未标经」 */ }\nfunction find(pair) { /* 按配对检索，返回全部命中条文 */ }</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：<code>tally()</code> 输出合病 29 / 并病 16，其中「合病:太阳+阳明」14 条；<code>find('太阳+阳明')</code> 返回篇内第 4、5、8、72、73 条等，并带出葛根汤与葛根加半夏汤。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>按经名关键词统计有假阳/假阴</strong>。底本 5 处合病条文没写具体经名（内文以「二阳」「三阳」指代），本统计把它们单列，不并入任何配对。</li><li><strong>「合病/并病」不等于「多证并存」</strong>。前者是六经层面的术语，后者是现代病历里的泛称；混用会让术语失去分辨力。</li><li><strong>条文重复</strong>。刻本篇内编号重复出现同类条文（如第 4 与第 72 条内容近同），统计会重复计数；本章报的是<strong>条文处数</strong>，不是「病案数」。</li><li><strong>本章不判定患者属于哪种传变</strong>。传变判断需要病程、先后与转归，只能由医师依据四诊作出。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 本章条文与计数引自 <code>standards/shanghan/底本.json</code>（识典古籍刻本，可复核）；传变判断与用力须由执业医师依据权威校勘本与临床实际决定，本章不构成诊疗建议。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>找出那 5 处「未标经名」的合病条文，说明底本用什么词指代两经，并讨论能否安全补全。</li><li>用 <code>find('太阳+少阳')</code> 对比合病与并病两类命中，指出它们在主症与方药上的差异。</li><li>若要求「并病」必须出现先后次序词（如「未罢」「复」「转属」），你的正则该怎么改？会漏掉什么？</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>合病与并病的区分，本质是<strong>给病程建模</strong>：并列 vs 叠加。把它写成代码的第一课不是正则，而是承认一件事——条文里大量信息（主症、先后、转归）藏在上下文里，关键词只能捞起表层。</p>",
    "markdown": "# 第 9 章 · 合病与并病：两经同时病，还是一个没走一个又来\n\n> **MOTTO:** 「太阳与阳明合病者，必自下利，葛根汤主之。」——《伤寒论·辨太阳病脉证并治中》\n>\n> **PROBLEM:** 你在病历上写「太阳阳明合病」，但被问「合病和并病差在哪、这条为什么用葛根汤而不是麻黄汤」时，只能说「都是两经病」。\n>\n> **双根因定位:** 环境逼迫(带教提问要一句话说清区别) + 知识积累(原文计数 × 经名配对 = 一份能按「哪两经」检索、能报出条文的传变分类)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 伤寒论 |\n| 院系 | 中医系 |\n| 章序号 | 09 / 12 |\n| 所属阶段 | 🌳 壮·鼎盛 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 3 小时 |\n\n## 学习目标\n\n- 用一句话区分合病（两经或三经**同时**发病）与并病（一经**未罢**又见他经）\n- 按本仓库底本实测：合病 29 处、并病 16 处，并说出最集中的经名配对\n- 说清「太阳阳明合病用葛根汤」的道理：病位在表里之间、以下利为主症，故不用麻黄汤峻汗\n- 写出一个解析器：从条文里认出「哪两经 + 合病/并病 + 主方」，并保留出处\n\n## 核心概念\n\n### 定义：同时 vs 先后\n\n- **合病**：两经或三经的病证**同时出现**，如「太阳阳明合病」（表证与里证同见）。\n- **并病**：一经病证**未罢**，另一经证候**又起**，如太阳未解而阳明已见，常以双解为法。\n\n差别不在「几经」，而在**时间结构**：合病是并列，并病是叠加。这个差别决定了治法能不能「先解其一」——并病可以分先后，合病必须同时兼顾。\n\n### 实测：合病集中在太阳+阳明\n\n按 `standards/shanghan/底本.json` 逐条扫描（1760 条）：\n\n| 类型 | 经名配对 | 条数 |\n|---|---|--:|\n| 合病 | 太阳 + 阳明 | 14 |\n| 合病 | 阳明 + 少阳 | 5 |\n| 合病 | 太阳 + 少阳 | 3 |\n| 合病 | 未标经名 | 5 |\n| 合病 | 仅标一经 | 2 |\n| 并病 | 太阳 + 少阳 | 7 |\n| 并病 | 仅标太阳 | 5 |\n| 并病 | 太阳 + 阳明 | 4 |\n\n合病 29 处、并病 16 处，合计 45 处。两个可直接观察到的偏斜：**合病最常出现在太阳+阳明**（14/29），**并病最常出现在太阳+少阳**（7/16）。这不是理论推演，是底本里条文自己说的话。\n\n### 为什么是葛根汤\n\n「太阳与阳明合病者，必自下利，葛根汤主之。」（篇内第 72 条）——表未解而里已受，主症是下利。葛根汤由桂枝汤加麻黄、葛根而成：解表而不峻汗，升津而止利。若见「喘而胸满」而**无下利**，同篇第 8 条则说「不可下，宜麻黄汤」——同一合病，主症不同，方就不同。这正是「合病必须同时兼顾」的具体样子。\n\n## BUILD IT：从零实现\n\n```js\n// code/main.js：扫描底本，抽「合病/并病 + 经名配对 + 方名」，按配对计数\nconst JING = ['太阳', '阳明', '少阳', '太阴', '少阴', '厥阴'];\nfunction scan() { /* 返回 [{kind, pair, pian, no, text}] */ }\nfunction tally() { /* 按 pair 计数，不合并「未标经」 */ }\nfunction find(pair) { /* 按配对检索，返回全部命中条文 */ }\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：`tally()` 输出合病 29 / 并病 16，其中「合病:太阳+阳明」14 条；`find('太阳+阳明')` 返回篇内第 4、5、8、72、73 条等，并带出葛根汤与葛根加半夏汤。\n\n## 代价与边界\n\n- **按经名关键词统计有假阳/假阴**。底本 5 处合病条文没写具体经名（内文以「二阳」「三阳」指代），本统计把它们单列，不并入任何配对。\n- **「合病/并病」不等于「多证并存」**。前者是六经层面的术语，后者是现代病历里的泛称；混用会让术语失去分辨力。\n- **条文重复**。刻本篇内编号重复出现同类条文（如第 4 与第 72 条内容近同），统计会重复计数；本章报的是**条文处数**，不是「病案数」。\n- **本章不判定患者属于哪种传变**。传变判断需要病程、先后与转归，只能由医师依据四诊作出。\n\n> **免责声明：** 本章条文与计数引自 `standards/shanghan/底本.json`（识典古籍刻本，可复核）；传变判断与用力须由执业医师依据权威校勘本与临床实际决定，本章不构成诊疗建议。\n\n## 练习\n\n1. 找出那 5 处「未标经名」的合病条文，说明底本用什么词指代两经，并讨论能否安全补全。\n2. 用 `find('太阳+少阳')` 对比合病与并病两类命中，指出它们在主症与方药上的差异。\n3. 若要求「并病」必须出现先后次序词（如「未罢」「复」「转属」），你的正则该怎么改？会漏掉什么？\n\n## 进阶思考\n\n合病与并病的区分，本质是**给病程建模**：并列 vs 叠加。把它写成代码的第一课不是正则，而是承认一件事——条文里大量信息（主症、先后、转归）藏在上下文里，关键词只能捞起表层。\n",
    "code": {
      "main.js": "'use strict';\n/**\n * 合病 / 并病扫描：从底本条文里抽「类型 + 经名配对 + 出处」\n *\n *   node code/main.js\n *\n * 口径（写在结论旁边）：\n *   · 计数单位是**条文处数**，不是病案数；刻本里同类条文重复出现会重复计数\n *   · 条文没写具体经名的（以「二阳」「三阳」指代）单列「未标经」，不并入任何配对\n *   · 只认六经名，不推断「太阳病」是否含阳明\n */\n\nconst path = require('node:path');\nconst fs = require('node:fs');\n\nconst ROOT = path.resolve(__dirname, '../../../../../..');\nconst SRC = path.join(ROOT, 'standards/shanghan/底本.json');\nconst JING = ['太阳', '阳明', '少阳', '太阴', '少阴', '厥阴'];\n\nfunction load() {\n  return JSON.parse(fs.readFileSync(SRC, 'utf8'));\n}\n\n/** 扫描全部条文，返回 [{kind, pair, pian, no, text}] */\nfunction scan(j = load()) {\n  const out = [];\n  for (const p of j.pian) {\n    for (const it of p.items) {\n      for (const kind of ['合病', '并病']) {\n        if (!it.text.includes(kind)) continue;\n        const found = JING.filter((x) => it.text.includes(x));\n        out.push({\n          kind,\n          pair: `${kind}:${found.join('+') || '未标经'}`,\n          named: found,\n          pian: p.pian,\n          no: it.no,\n          text: it.text,\n        });\n      }\n    }\n  }\n  return out;\n}\n\n/** 按配对计数（未标经单列，不合并进任何配对） */\nfunction tally(j = load()) {\n  const rows = scan(j);\n  const by = {};\n  for (const r of rows) by[r.pair] = (by[r.pair] || 0) + 1;\n  const total = { 合病: 0, 并病: 0 };\n  for (const r of rows) total[r.kind] += 1;\n  return { by, total };\n}\n\n/** 按配对检索：'太阳+阳明' 或 '并病:太阳+少阳' */\nfunction find(pair, j = load()) {\n  return scan(j).filter((r) => r.pair.includes(pair));\n}\n\nfunction main() {\n  const t = tally();\n  console.log(`合病 ${t.total.合病} 处 · 并病 ${t.total.并病} 处`);\n  const rows = Object.entries(t.by).sort((a, b) => b[1] - a[1]);\n  for (const [k, v] of rows) console.log(`  ${k.padEnd(14, '　')} ${v}`);\n\n  for (const q of ['太阳+阳明', '太阳+少阳']) {\n    const hits = find(q);\n    console.log(`\\n检索「${q}」→ ${hits.length} 处`);\n    for (const h of hits.slice(0, 4)) {\n      console.log(`  ${h.kind}｜${h.pian} 篇内第 ${h.no} 条｜${h.text.slice(0, 42)}…`);\n    }\n  }\n  console.log('\\n提醒：计数单位是条文处数，不是病案数；5 处未标经名的条文单列，未并入任何配对。');\n  console.log('本输出为教学样例，不构成诊疗建议。');\n}\n\nif (require.main === module) main();\nmodule.exports = { scan, tally, find, JING, load };\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { scan, tally, find, JING } = require('./main.js');\n\ntest('合病 29 处 · 并病 16 处，合计 45 处', () => {\n  const t = tally();\n  assert.strictEqual(t.total.合病, 29);\n  assert.strictEqual(t.total.并病, 16);\n  assert.strictEqual(scan().length, 45);\n});\n\ntest('合病最集中的配对是太阳+阳明（14 处）', () => {\n  assert.strictEqual(tally().by['合病:太阳+阳明'], 14);\n});\n\ntest('并病最集中的配对是太阳+少阳（7 处）', () => {\n  assert.strictEqual(tally().by['并病:太阳+少阳'], 7);\n});\n\ntest('未标经名的 5 处单列，不并入任何经名配对', () => {\n  const t = tally();\n  assert.strictEqual(t.by['合病:未标经'], 5);\n  const merged = Object.entries(t.by)\n    .filter(([k]) => k !== '合病:未标经')\n    .reduce((a, [, v]) => a + v, 0);\n  assert.strictEqual(merged + 5, 45);\n});\n\ntest('检索太阳+阳明同时命中合病与并病（不许只给合病）', () => {\n  const r = find('太阳+阳明');\n  assert.strictEqual(r.length, 18);\n  assert.ok(r.some((x) => x.kind === '合病'));\n  assert.ok(r.some((x) => x.kind === '并病'));\n});\n\ntest('每条命中都带得出处（篇名 + 篇内条号）', () => {\n  for (const r of scan()) {\n    assert.ok(r.pian && Number.isInteger(r.no) && r.no > 0);\n  }\n});\n\ntest('经名只认六经，不把「二阳」猜成太阳+阳明', () => {\n  assert.deepStrictEqual(JING, ['太阳', '阳明', '少阳', '太阴', '少阴', '厥阴']);\n  const wu = scan().filter((r) => r.pair === '合病:未标经');\n  assert.ok(wu.every((r) => r.named.length === 0));\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "合病与并病最关键的区别是？",
          "options": [
            "涉及的经数不同",
            "时间结构：合病是两经同时病，并病是一经未罢他经又起",
            "合病属阳证，并病属阴证",
            "合病必用一方，并病必用两方"
          ],
          "correct": 1,
          "explanation": "差别不在几经，而在并列还是叠加；这决定治法能不能分先后。"
        },
        {
          "stage": "check",
          "question": "按本仓库底本实测，合病最多出现在哪一对经？",
          "options": [
            "太阳+少阳",
            "太阳+阳明",
            "阳明+少阳",
            "太阴+少阴"
          ],
          "correct": 1,
          "explanation": "合病 29 处中太阳+阳明占 14 处。"
        },
        {
          "stage": "check",
          "question": "并病最集中的配对是？",
          "options": [
            "太阳+阳明",
            "太阳+少阳",
            "少阳+阳明",
            "少阴+厥阴"
          ],
          "correct": 1,
          "explanation": "并病 16 处中太阳+少阳 7 处。"
        },
        {
          "stage": "check",
          "question": "「太阳与阳明合病者，必自下利」用葛根汤，而「喘而胸满」则宜麻黄汤，说明？",
          "options": [
            "两条条文互相矛盾",
            "同一合病，主症不同则方不同：合病要同时兼顾表里，不能峻汗",
            "葛根汤就是麻黄汤加葛根",
            "下利是麻黄的禁忌"
          ],
          "correct": 1,
          "explanation": "见下利用葛根汤（解表升津止利），无下利而喘满可用麻黄汤；主症决定选方。"
        },
        {
          "stage": "post",
          "question": "扫描出的 45 处，正确的计数单位是？",
          "options": [
            "45 个病案",
            "45 个方证",
            "45 处条文（同类条文重复出现会重复计数）",
            "45 位患者"
          ],
          "correct": 2,
          "explanation": "条文处数 ≠ 病案数；刻本里同类条文重复出现是常态。"
        },
        {
          "stage": "post",
          "question": "底本里 5 处合病条文没写具体经名（用「二阳」指代），正确处理是？",
          "options": [
            "按上下文补成太阳+阳明",
            "单列「未标经」，不并入任何配对",
            "直接丢弃",
            "计入太阳+阳明"
          ],
          "correct": 1,
          "explanation": "补全会制造伪精确；未标经必须可见，否则统计被悄悄改写。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-hebing-bingbing.md",
        "kind": "prompt",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/09-hebing-bingbing/outputs/prompt-hebing-bingbing.md",
        "title": "合病并病辨读助手",
        "description": null,
        "chars": 609,
        "body": "# 合病并病辨读助手\n\n## 用途\n\n把病历或条文里的「合病」「并病」说清楚：**哪两经、同时还是先后、主症是什么、方为什么是那个方**。\n用于**病案讨论、条文对照、带教提问**。不做传变预测。\n\n## 提示词\n\n```text\n你是伤寒论的助教。下面是病历摘要或条文。请只做三件事：定性、定经、定主症。\n\n规则：\n1. 先说时间结构：两经同时 = 合病；一经未罢他经又起 = 并病。必须给出判断依据（哪个词）。\n2. 经名只写病历或条文里出现过的六经名（太阳/阳明/少阳/太阴/少阴/厥阴）。没写就写「未标经」，不许补。\n3. 主症逐字引用原文；没有写到的症状写「未描述」，不推断。\n4. 方药只引条文原方；条文无方则写「原文无方」。\n5. 不给预后判断，不说「必然传变」。\n\n输出格式：\n【定性】合病 / 并病｜依据词：…\n【定经】… + …\n【主症】…\n【方】…（原文无方则写「原文无方」）\n【未标注】…\n```\n\n## 使用示例\n\n输入：「发热恶寒，无汗，头痛，又见下利，脉浮。」\n\n输出：【定性】合病（表证与里证同时出现）｜依据：症状并列、无先后词\n【定经】太阳 + 阳明（据条文「太阳与阳明合病者，必自下利」）\n【主症】发热恶寒、无汗、头痛、下利｜未描述：脉象细节、呕否\n【方】葛根汤（原文），若无下利而喘满，原文另主麻黄汤\n\n## 为什么这样限制\n\n- 先定时间结构：合病/并病的治法次序不同，概念一错全错。\n- 经名不许补：底本里有 5 处只写「二阳」，补全就是伪精确。\n- 不给预后：传变需要病程与转归，不是靠条文关键词能推的。\n"
      },
      {
        "name": "skill-hebing-bingbing.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/09-hebing-bingbing/outputs/skill-hebing-bingbing.md",
        "title": "hebing-bingbing",
        "description": "判合病与并病：定时间结构、定六经、引主症与原文方，经名不外推",
        "chars": 533,
        "body": "---\nname: hebing-bingbing\ndescription: 判合病与并病：定时间结构、定六经、引主症与原文方，经名不外推\nversion: 0.1.0\n---\n\n# hebing-bingbing\n\n## 何时使用\n\n- 病历或带教讨论里出现「合病」「并病」，需要把依据讲清楚\n- 条文对照：同一合病不同主症为何用不同方\n- 教学：演示「并列 vs 叠加」的时间结构差异\n\n## 不适用\n\n- 预测传变方向与转归（需要病程数据，条文关键词不够）\n- 条文只以「二阳」「三阳」指代、且无其它线索时（应保留「未标经」）\n- 方药剂量与加减（另章）\n\n## 步骤\n\n1. **找依据词**：有无「未罢」「复」「转属」等先后词 → 并病；纯并列 → 合病。\n2. **列经名**：只列出现过的六经名；不足写「未标经」。\n3. **摘主症**：逐字引用，未描述项单列。\n4. **引原方**：条文有方照录；无方写「原文无方」。\n5. **标出处**：篇名 + 篇内条号 + 底本标识。\n\n## 输出模板\n\n```text\n【定性】…｜依据词：…\n【定经】… + …\n【主症】…｜未描述：…\n【方】…\n【出处】《伤寒论·X》篇内第 N 条（底本：…）\n```\n\n## 质量判据\n\n- 定性有依据词，不是凭感觉\n- 没有补写条文里没有的经名或症状\n- 出处到篇、到条、带底本\n\n> 本技能输出为教学与讨论辅助，不构成诊疗建议。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "01-zhongyi/07-shanghanlun/10-fangzheng-duiying": {
    "key": "01-zhongyi/07-shanghanlun/10-fangzheng-duiying",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "07-shanghanlun",
    "subjectTitle": "伤寒论",
    "chapterSlug": "10-fangzheng-duiying",
    "n": 10,
    "title": "第 10 章 · 方证对应：症状群 → 方剂，为什么前三版排序都是错的",
    "motto": "「太阳病，头痛发热，身疼恶风，无汗而喘者，麻黄汤主之。」——《伤寒论·辨太阳病脉证并治中》",
    "problem": "你做了个「输入症状、输出方剂」的小工具：算症状重合度、排序、取第一。第一版给「下利+厥+恶寒」排出的第一位是**调胃承气汤**——一个泻下方。症状全对上了，方向完全反了。",
    "roots": "环境逼迫(要做方证检索) + 知识积累(三种打分 × 失败案例 = 知道什么时候不能信排序)",
    "html": "<h1 id=\"第-10-章-方证对应-症状群-方剂-为什么前三版排序都是错的\">第 10 章 · 方证对应：症状群 → 方剂，为什么前三版排序都是错的</h1>\n<blockquote><p><strong>MOTTO:</strong> 「太阳病，头痛发热，身疼恶风，无汗而喘者，麻黄汤主之。」——《伤寒论·辨太阳病脉证并治中》</p>\n<p><strong>PROBLEM:</strong> 你做了个「输入症状、输出方剂」的小工具：算症状重合度、排序、取第一。第一版给「下利+厥+恶寒」排出的第一位是<strong>调胃承气汤</strong>——一个泻下方。症状全对上了，方向完全反了。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(要做方证检索) + 知识积累(三种打分 × 失败案例 = 知道什么时候不能信排序)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>伤寒论</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>10 / 12</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>4 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>从底本建出「方—症」共现矩阵，并说出支持度为什么必须与分数一起报</li><li>复现两种朴素打分的失败案例，解释各自偏袒了什么</li><li>用「覆盖率门槛 × 提升度」得到可用排序，并说明它仍然不是辨证</li><li>判断一个方证检索结果什么情况下必须弃用</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"方-症矩阵-实测\">方-症矩阵（实测）</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>方</th><th>支持条数</th><th>覆盖篇</th><th>高频伴症</th></tr></thead><tbody><tr><td>桂枝汤</td><td><strong>134</strong></td><td>12 篇</td><td>汗出×44 发热×27 脉浮×24 恶寒×20 喘×13</td></tr><tr><td>大承气汤</td><td><strong>79</strong></td><td>8 篇</td><td>潮热×20 腹满×19 发热×17 下利×16 谵语×14</td></tr><tr><td>麻黄汤</td><td><strong>44</strong></td><td>7 篇</td><td>脉浮×29 无汗×14 发热×12 喘×12 身疼×10</td></tr><tr><td>小柴胡汤</td><td><strong>34</strong></td><td>10 篇</td><td>往来寒热×7 潮热×7 脉浮×6 喜呕×4 汗出×4</td></tr><tr><td>调胃承气汤</td><td><strong>33</strong></td><td>9 篇</td><td>恶寒×8 汗出×8 心烦×8 厥×6 谵语×6</td></tr><tr><td>小承气汤</td><td><strong>31</strong></td><td>9 篇</td><td>潮热×12 谵语×10 发热×9</td></tr><tr><td>四逆汤</td><td><strong>31</strong></td><td>13 篇</td><td>下利×13 汗出×10 厥×10 脉浮×9</td></tr><tr><td>五苓散</td><td><strong>27</strong></td><td>9 篇</td><td>汗出×10 小便不利×9 脉浮×9</td></tr></tbody></table></div>\n<p>第一行就埋着陷阱：桂枝汤横跨 12 篇、134 条，它的「症状画像」宽到几乎覆盖任何组合。<strong>支持度越高，画像越糊</strong>——这是方证检索最大的偏倚来源。</p>\n<h3 id=\"第一版-jaccard-症状重合-并集\">第一版：Jaccard（症状重合 / 并集）</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>查询</th><th>第一名</th><th>判断</th></tr></thead><tbody><tr><td>无汗+脉浮+头痛+喘</td><td>麻黄汤 0.444</td><td>✅</td></tr><tr><td>往来寒热+胸胁苦满+口苦+心烦</td><td>小柴胡汤 0.214</td><td>✅</td></tr><tr><td>腹满+潮热+谵语</td><td>小承气汤 0.333</td><td>✅（大承气未进前三）</td></tr><tr><td><strong>下利+厥+恶寒</strong></td><td><strong>调胃承气汤 0.273</strong></td><td>❌ 泻下方排第一</td></tr></tbody></table></div>\n<p>Jaccard 只看重合比例，不看这个症状在全库有多常见。「厥」45 条、「恶寒」107 条，谁都有；于是支持度大、什么都沾的方占便宜。<strong>第四例是整个方法的照妖镜。</strong></p>\n<h3 id=\"第二版-纯提升度-lift-方内占比-全库占比\">第二版：纯提升度（lift = 方内占比 / 全库占比）</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>查询</th><th>第一名</th><th>判断</th></tr></thead><tbody><tr><td>无汗+脉浮+头痛+喘</td><td><strong>理中丸 20.11（支持 5 条）</strong></td><td>❌ 小样本偶然</td></tr><tr><td>往来寒热+胸胁苦满+口苦+心烦</td><td><strong>栀子豉汤 55.87</strong></td><td>❌ 只因「口苦」罕见</td></tr><tr><td>腹满+潮热+谵语</td><td><strong>白虎汤 11.14</strong></td><td>⚠️ 可辩</td></tr><tr><td>下利+厥+恶寒</td><td>四逆汤 8.77</td><td>✅</td></tr></tbody></table></div>\n<p>lift 修好了第四例，却把前三例搞坏：一个只用 1 个罕见症状命中的小方，平均提升度可以高到离谱。<strong>平均掩盖了覆盖。</strong></p>\n<h3 id=\"第三版-覆盖率门槛-平均提升度\">第三版：覆盖率门槛 × 平均提升度</h3>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">候选资格：support ≥ 10 且 coverage ≥ 0.5（查询症状至少覆盖一半）\n排序：score = meanLift × coverage</code></pre></div>\n<div class=\"table-wrap\"><table><thead><tr><th>查询</th><th>第一名</th><th>分数（覆盖 × 提升）</th></tr></thead><tbody><tr><td>无汗+脉浮+头痛+喘</td><td><strong>麻黄汤</strong></td><td>8.39（1.00 × 8.39）</td></tr><tr><td>往来寒热+胸胁苦满+口苦+心烦</td><td><strong>小柴胡汤</strong></td><td>20.10（0.75 × 26.79）</td></tr><tr><td>腹满+潮热+谵语</td><td><strong>小承气汤</strong></td><td>10.00（1.00 × 10.00）</td></tr><tr><td>下利+厥+恶寒</td><td><strong>四逆汤</strong></td><td>8.77（1.00 × 8.77）</td></tr></tbody></table></div>\n<p>四例全对。但注意「腑实」一例：大承气汤排第二（7.69），原因是查询里没有「大便硬」——第 4 章讲过，那正是大承气的入口条件。<strong>排序对不对，取决于你输入了什么，而不是模型多聪明。</strong></p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">buildMatrix()   // 方 → {support, symptoms, pians}\nmatch(signs)    // 第一版 Jaccard\nmatchLift(signs)// 第二版 平均提升度\nmatchHybrid(signs) // 第三版 覆盖率门槛 × 提升度\nevidence(formula, hits) // 回原文找 2 条出处</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：<code>matchHybrid(['下利','厥','恶寒'])[0].formula === '四逆汤'</code>；<code>match(['下利','厥','恶寒'])[0].formula === '调胃承气汤'</code>（<strong>故意保留失败案例</strong>）；<code>matchHybrid(['无汗','脉浮','头痛','喘'])[0].formula === '麻黄汤'</code>。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>症状词表只有 24 个，手工的</strong>。未收录症状不参与打分，等于被静默忽略——这是本章最大的局限。</li><li><strong>共现不等于因果</strong>。同一方出现在同条，不代表该症状是方的指征（可能是否定句：「不恶寒」）。</li><li><strong>否定句未处理</strong>。「无汗」与「不汗出」被当作同一词，「不恶寒」会被算成「恶寒」。这一条足以让排序整体偏移，必须在使用前声明。</li><li><strong>不是辨证</strong>。方证对应的临床含义包含体质、病程、禁忌，本章只做词面统计。</li><li>支持度门槛（10）与覆盖率门槛（0.5）是经验值，换语料需重标定。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 方名与症状统计来自 <code>standards/shanghan/底本.json</code>（可复算）；本章为检索算法演示，不构成诊断或处方建议。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>给「不恶寒」「无汗」这类否定形式加处理，说明它会怎样改变「寒利」一例的排序。</li><li>若把支持度门槛从 10 降到 3，第三版哪些查询会退化？用代码验证。</li><li>设计一个能表达「大便硬 → 大承气」的机制，使「腑实」查询把大承气排到第一，同时不破坏其他三例。</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>三版排序的差别不在算法精妙，而在<strong>你愿意在哪一步承认自己错了</strong>。第一版把泻下方排给寒利时，最省事的做法是「加个规则把它过滤掉」——然后你就永远不知道偏倚从哪来。</p>",
    "markdown": "# 第 10 章 · 方证对应：症状群 → 方剂，为什么前三版排序都是错的\n\n> **MOTTO:** 「太阳病，头痛发热，身疼恶风，无汗而喘者，麻黄汤主之。」——《伤寒论·辨太阳病脉证并治中》\n>\n> **PROBLEM:** 你做了个「输入症状、输出方剂」的小工具：算症状重合度、排序、取第一。第一版给「下利+厥+恶寒」排出的第一位是**调胃承气汤**——一个泻下方。症状全对上了，方向完全反了。\n>\n> **双根因定位:** 环境逼迫(要做方证检索) + 知识积累(三种打分 × 失败案例 = 知道什么时候不能信排序)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 伤寒论 |\n| 院系 | 中医系 |\n| 章序号 | 10 / 12 |\n| 所属阶段 | 🌿 长·积累 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 4 小时 |\n\n## 学习目标\n\n- 从底本建出「方—症」共现矩阵，并说出支持度为什么必须与分数一起报\n- 复现两种朴素打分的失败案例，解释各自偏袒了什么\n- 用「覆盖率门槛 × 提升度」得到可用排序，并说明它仍然不是辨证\n- 判断一个方证检索结果什么情况下必须弃用\n\n## 核心概念\n\n### 方-症矩阵（实测）\n\n| 方 | 支持条数 | 覆盖篇 | 高频伴症 |\n|---|--:|---|---|\n| 桂枝汤 | **134** | 12 篇 | 汗出×44 发热×27 脉浮×24 恶寒×20 喘×13 |\n| 大承气汤 | **79** | 8 篇 | 潮热×20 腹满×19 发热×17 下利×16 谵语×14 |\n| 麻黄汤 | **44** | 7 篇 | 脉浮×29 无汗×14 发热×12 喘×12 身疼×10 |\n| 小柴胡汤 | **34** | 10 篇 | 往来寒热×7 潮热×7 脉浮×6 喜呕×4 汗出×4 |\n| 调胃承气汤 | **33** | 9 篇 | 恶寒×8 汗出×8 心烦×8 厥×6 谵语×6 |\n| 小承气汤 | **31** | 9 篇 | 潮热×12 谵语×10 发热×9 |\n| 四逆汤 | **31** | 13 篇 | 下利×13 汗出×10 厥×10 脉浮×9 |\n| 五苓散 | **27** | 9 篇 | 汗出×10 小便不利×9 脉浮×9 |\n\n第一行就埋着陷阱：桂枝汤横跨 12 篇、134 条，它的「症状画像」宽到几乎覆盖任何组合。**支持度越高，画像越糊**——这是方证检索最大的偏倚来源。\n\n### 第一版：Jaccard（症状重合 / 并集）\n\n| 查询 | 第一名 | 判断 |\n|---|---|---|\n| 无汗+脉浮+头痛+喘 | 麻黄汤 0.444 | ✅ |\n| 往来寒热+胸胁苦满+口苦+心烦 | 小柴胡汤 0.214 | ✅ |\n| 腹满+潮热+谵语 | 小承气汤 0.333 | ✅（大承气未进前三） |\n| **下利+厥+恶寒** | **调胃承气汤 0.273** | ❌ 泻下方排第一 |\n\nJaccard 只看重合比例，不看这个症状在全库有多常见。「厥」45 条、「恶寒」107 条，谁都有；于是支持度大、什么都沾的方占便宜。**第四例是整个方法的照妖镜。**\n\n### 第二版：纯提升度（lift = 方内占比 / 全库占比）\n\n| 查询 | 第一名 | 判断 |\n|---|---|---|\n| 无汗+脉浮+头痛+喘 | **理中丸 20.11（支持 5 条）** | ❌ 小样本偶然 |\n| 往来寒热+胸胁苦满+口苦+心烦 | **栀子豉汤 55.87** | ❌ 只因「口苦」罕见 |\n| 腹满+潮热+谵语 | **白虎汤 11.14** | ⚠️ 可辩 |\n| 下利+厥+恶寒 | 四逆汤 8.77 | ✅ |\n\nlift 修好了第四例，却把前三例搞坏：一个只用 1 个罕见症状命中的小方，平均提升度可以高到离谱。**平均掩盖了覆盖。**\n\n### 第三版：覆盖率门槛 × 平均提升度\n\n```\n候选资格：support ≥ 10 且 coverage ≥ 0.5（查询症状至少覆盖一半）\n排序：score = meanLift × coverage\n```\n\n| 查询 | 第一名 | 分数（覆盖 × 提升） |\n|---|---|---|\n| 无汗+脉浮+头痛+喘 | **麻黄汤** | 8.39（1.00 × 8.39） |\n| 往来寒热+胸胁苦满+口苦+心烦 | **小柴胡汤** | 20.10（0.75 × 26.79） |\n| 腹满+潮热+谵语 | **小承气汤** | 10.00（1.00 × 10.00） |\n| 下利+厥+恶寒 | **四逆汤** | 8.77（1.00 × 8.77） |\n\n四例全对。但注意「腑实」一例：大承气汤排第二（7.69），原因是查询里没有「大便硬」——第 4 章讲过，那正是大承气的入口条件。**排序对不对，取决于你输入了什么，而不是模型多聪明。**\n\n## BUILD IT：从零实现\n\n```js\nbuildMatrix()   // 方 → {support, symptoms, pians}\nmatch(signs)    // 第一版 Jaccard\nmatchLift(signs)// 第二版 平均提升度\nmatchHybrid(signs) // 第三版 覆盖率门槛 × 提升度\nevidence(formula, hits) // 回原文找 2 条出处\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：`matchHybrid(['下利','厥','恶寒'])[0].formula === '四逆汤'`；`match(['下利','厥','恶寒'])[0].formula === '调胃承气汤'`（**故意保留失败案例**）；`matchHybrid(['无汗','脉浮','头痛','喘'])[0].formula === '麻黄汤'`。\n\n## 代价与边界\n\n- **症状词表只有 24 个，手工的**。未收录症状不参与打分，等于被静默忽略——这是本章最大的局限。\n- **共现不等于因果**。同一方出现在同条，不代表该症状是方的指征（可能是否定句：「不恶寒」）。\n- **否定句未处理**。「无汗」与「不汗出」被当作同一词，「不恶寒」会被算成「恶寒」。这一条足以让排序整体偏移，必须在使用前声明。\n- **不是辨证**。方证对应的临床含义包含体质、病程、禁忌，本章只做词面统计。\n- 支持度门槛（10）与覆盖率门槛（0.5）是经验值，换语料需重标定。\n\n> **免责声明：** 方名与症状统计来自 `standards/shanghan/底本.json`（可复算）；本章为检索算法演示，不构成诊断或处方建议。\n\n## 练习\n\n1. 给「不恶寒」「无汗」这类否定形式加处理，说明它会怎样改变「寒利」一例的排序。\n2. 若把支持度门槛从 10 降到 3，第三版哪些查询会退化？用代码验证。\n3. 设计一个能表达「大便硬 → 大承气」的机制，使「腑实」查询把大承气排到第一，同时不破坏其他三例。\n\n## 进阶思考\n\n三版排序的差别不在算法精妙，而在**你愿意在哪一步承认自己错了**。第一版把泻下方排给寒利时，最省事的做法是「加个规则把它过滤掉」——然后你就永远不知道偏倚从哪来。\n",
    "code": {
      "main.js": "'use strict';\r\n/**\r\n * 方证对应：症状群 → 方剂候选（带支持条数与出处）\r\n *\r\n *   node code/main.js\r\n *\r\n * 口径：\r\n *   · 「方证」= 该方在同条出现的症状词集合；支持度 support = 含该方的条文数。\r\n *   · 打分用 Jaccard（命中症状 / 并集），并强制 support ≥ 3，否则不给候选 —— \r\n *     支持度太低的方，命中的一两个词只是巧合。\r\n *   · 只报候选与出处，不给剂量、不判主次、不替代辨证。\r\n *   · 症状词表是手工的（26 词），覆盖不全；未收录的症状不会参与打分。\r\n */\r\n\r\nconst path = require('node:path');\r\nconst fs = require('node:fs');\r\n\r\nconst ROOT = path.resolve(__dirname, '../../../../../..');\r\nconst BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));\r\n\r\nconst ITEMS = [];\r\nfor (const p of BOOK.pian) for (const it of p.items) {\r\n  ITEMS.push({ pian: p.no, no: it.no, text: it.text, norm: it.text.split('𤍠').join('热') });\r\n}\r\n\r\n/** 手工症状词表（归一后形式） */\r\nconst SYMPTOMS = ['发热', '恶寒', '汗出', '无汗', '头痛', '身疼', '脉浮', '脉沉', '口苦', '咽干', '目眩',\r\n  '往来寒热', '胸胁苦满', '心烦', '喜呕', '腹满', '潮热', '谵语', '下利', '厥', '小便不利', '烦躁', '咳', '喘'];\r\n\r\n/** 方名：先剥「宜/属/与/服/本云/作」等前缀，避免把「宜大承气汤」算成另一个方 */\r\nconst FORMULAS = ['桂枝汤', '麻黄汤', '小柴胡汤', '大承气汤', '小承气汤', '调胃承气汤', '四逆汤', '五苓散', '理中丸', '白虎汤', '栀子豉汤', '葛根汤'];\r\nconst PREFIX = /^(宜|属|与|服|本云|作|用|进|更|复与)+/;\r\n\r\nfunction formulasIn(text) {\r\n  const out = new Set();\r\n  for (const f of FORMULAS) if (text.includes(f)) out.add(f);\r\n  return out;\r\n}\r\n\r\n/** 建方-症矩阵 */\r\nfunction buildMatrix() {\r\n  const m = new Map();\r\n  for (const f of FORMULAS) m.set(f, { support: 0, symptoms: new Map(), pians: new Set() });\r\n  for (const it of ITEMS) {\r\n    const fs_ = formulasIn(it.norm);\r\n    for (const f of fs_) {\r\n      const rec = m.get(f);\r\n      rec.support += 1;\r\n      rec.pians.add(it.pian);\r\n      for (const s of SYMPTOMS) if (it.norm.includes(s)) rec.symptoms.set(s, (rec.symptoms.get(s) || 0) + 1);\r\n    }\r\n  }\r\n  return m;\r\n}\r\n\r\n/** 症状群 → 候选方（Jaccard + 支持度门槛） */\r\nfunction match(signs, { minSupport = 3, top = 3 } = {}) {\r\n  const q = [...new Set(signs)].filter((s) => SYMPTOMS.includes(s));\r\n  const matrix = buildMatrix();\r\n  const rows = [];\r\n  for (const [f, rec] of matrix) {\r\n    if (rec.support < minSupport) continue;\r\n    const fsyms = [...rec.symptoms.keys()];\r\n    const hit = q.filter((s) => fsyms.includes(s));\r\n    if (hit.length === 0) continue;\r\n    const union = new Set([...q, ...fsyms]).size;\r\n    rows.push({\r\n      formula: f,\r\n      score: Number((hit.length / union).toFixed(3)),\r\n      hit,\r\n      support: rec.support,\r\n      pians: [...rec.pians].sort((a, b) => a - b),\r\n    });\r\n  }\r\n  return rows.sort((a, b) => b.score - a.score || b.support - a.support).slice(0, top);\r\n}\r\n\r\n/**\r\n * lift 版匹配：score = 平均提升度\r\n *   lift(s, f) = (s 在方 f 条文里的占比) / (s 在全库的占比)\r\n * 目的：纠正 Jaccard 对「大支持度方」的偏袒 —— 桂枝汤 134 条几乎覆盖任何症状组合，\r\n * 不加权就会把泻下类方排到「寒利」第一位（见 code/main.js 的输出对比）。\r\n */\r\nfunction matchLift(signs, { minSupport = 3, top = 3 } = {}) {\r\n  const q = [...new Set(signs)].filter((s) => SYMPTOMS.includes(s));\r\n  const N = ITEMS.length;\r\n  const df = new Map();\r\n  for (const s of SYMPTOMS) df.set(s, ITEMS.filter((it) => it.norm.includes(s)).length || 1);\r\n  const matrix = buildMatrix();\r\n  const rows = [];\r\n  for (const [f, rec] of matrix) {\r\n    if (rec.support < minSupport) continue;\r\n    const hits = q.filter((s) => rec.symptoms.has(s));\r\n    if (!hits.length) continue;\r\n    const lifts = hits.map((s) => (rec.symptoms.get(s) / rec.support) / (df.get(s) / N));\r\n    const score = lifts.reduce((a, b) => a + b, 0) / lifts.length;\r\n    rows.push({\r\n      formula: f,\r\n      score: Number(score.toFixed(2)),\r\n      hit: hits,\r\n      support: rec.support,\r\n      pians: [...rec.pians].sort((a, b) => a - b),\r\n    });\r\n  }\r\n  return rows.sort((a, b) => b.score - a.score).slice(0, top);\r\n}\r\n\r\n/**\r\n * 混合版：覆盖率门槛 × 平均提升度\r\n *   coverage = 查询症状中被该方覆盖的比例（≥ 0.5 才有资格）\r\n *   support ≥ 10（少于此的方，症状共现属偶然）\r\n *   score = meanLift × coverage\r\n * 前两版各自失败（见 main.js 输出）：Jaccard 偏袒大支持度方，纯 lift 偏袒小样本方。\r\n */\r\nfunction matchHybrid(signs, { minSupport = 10, minCoverage = 0.5, top = 3 } = {}) {\r\n  const q = [...new Set(signs)].filter((s) => SYMPTOMS.includes(s));\r\n  const N = ITEMS.length;\r\n  const df = new Map();\r\n  for (const s of SYMPTOMS) df.set(s, ITEMS.filter((it) => it.norm.includes(s)).length || 1);\r\n  const matrix = buildMatrix();\r\n  const rows = [];\r\n  for (const [f, rec] of matrix) {\r\n    if (rec.support < minSupport) continue;\r\n    const hits = q.filter((s) => rec.symptoms.has(s));\r\n    const coverage = hits.length / q.length;\r\n    if (coverage < minCoverage) continue;\r\n    const lifts = hits.map((s) => (rec.symptoms.get(s) / rec.support) / (df.get(s) / N));\r\n    const meanLift = lifts.reduce((a, b) => a + b, 0) / lifts.length;\r\n    rows.push({\r\n      formula: f,\r\n      score: Number((meanLift * coverage).toFixed(2)),\r\n      coverage: Number(coverage.toFixed(2)),\r\n      meanLift: Number(meanLift.toFixed(2)),\r\n      hit: hits,\r\n      support: rec.support,\r\n      pians: [...rec.pians].sort((a, b) => a - b),\r\n    });\r\n  }\r\n  return rows.sort((a, b) => b.score - a.score).slice(0, top);\r\n}\r\n\r\n/** 给一条候选方找原文出处（最多 2 条） */\r\nfunction evidence(formula, syms) {\r\n  return ITEMS.filter((it) => it.text.includes(formula) && syms.some((s) => it.norm.includes(s)))\r\n    .slice(0, 2)\r\n    .map((it) => ({ pian: it.pian, no: it.no, text: it.text.slice(0, 60) }));\r\n}\r\n\r\nfunction main() {\r\n  const matrix = buildMatrix();\r\n  console.log('方-症矩阵（支持数 = 含该方的条文数）\\n');\r\n  const top = [...matrix].sort((a, b) => b[1].support - a[1].support).slice(0, 8);\r\n  for (const [f, rec] of top) {\r\n    const s = [...rec.symptoms].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}×${v}`).join(' ');\r\n    console.log(`  ${f.padEnd(6, '　')} 支持 ${String(rec.support).padStart(3)} 条｜篇 ${[...rec.pians].join('/')}｜高频症 ${s}`);\r\n  }\r\n\r\n  const cases = [\r\n    { name: '表实无汗', signs: ['无汗', '脉浮', '头痛', '喘'] },\r\n    { name: '半表半里', signs: ['往来寒热', '胸胁苦满', '口苦', '心烦'] },\r\n    { name: '腑实', signs: ['腹满', '潮热', '谵语'] },\r\n    { name: '寒利', signs: ['下利', '厥', '恶寒'] },\r\n  ];\r\n  for (const c of cases) {\r\n    const r = match(c.signs);\r\n    const rl = matchLift(c.signs);\r\n    const rh = matchHybrid(c.signs);\r\n    console.log(`\\n【${c.name}】${c.signs.join('+')}`);\r\n    if (!r.length) { console.log('  无候选（支持度门槛 3 未达成或症状未命中）'); continue; }\r\n    for (const x of r) {\r\n      console.log(`  [Jaccard] ${x.formula}｜${x.score}｜命中 ${x.hit.join('/')}｜支持 ${x.support} 条`);\r\n    }\r\n    console.log('  ── lift 加权后 ──');\r\n    for (const x of rl) {\r\n      console.log(`  [lift] ${x.formula}｜提升 ${x.score}｜命中 ${x.hit.join('/')}｜支持 ${x.support} 条`);\r\n    }\r\n    console.log('  ── 混合（覆盖率门槛 × 平均提升）──');\r\n    for (const x of rh) {\r\n      console.log(`  [混合] ${x.formula}｜${x.score}（覆盖 ${x.coverage} × 提升 ${x.meanLift}）｜支持 ${x.support} 条`);\r\n      for (const e of evidence(x.formula, x.hit)) console.log(`      篇${e.pian}：${e.text}…`);\r\n    }\r\n  }\r\n  console.log('\\n口径：候选≠处方；Jaccard 只衡量词面重合，不含辨证逻辑；症状表 24 词，覆盖不全。');\r\n  console.log('本输出为文本统计演示，不构成诊疗建议。');\r\n}\r\n\r\nif (require.main === module) main();\r\nmodule.exports = { buildMatrix, match, matchLift, matchHybrid, evidence, SYMPTOMS, FORMULAS, ITEMS, PREFIX };\r\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { buildMatrix, match, matchLift, matchHybrid, evidence, FORMULAS } = require('./main.js');\n\ntest('方-症矩阵：支持数与篇数可复现', () => {\n  const m = buildMatrix();\n  assert.strictEqual(m.get('桂枝汤').support, 134);\n  assert.strictEqual(m.get('大承气汤').support, 79);\n  assert.strictEqual(m.get('麻黄汤').support, 44);\n  assert.strictEqual(m.get('小柴胡汤').support, 34);\n  assert.strictEqual(m.get('四逆汤').support, 31);\n  assert.ok(m.get('桂枝汤').pians.size >= 10, '桂枝汤应跨 10 篇以上');\n});\n\ntest('第一版 Jaccard 的失败被保留：寒利查询排出泻下方', () => {\n  const r = match(['下利', '厥', '恶寒']);\n  assert.strictEqual(r[0].formula, '调胃承气汤');\n});\n\ntest('第二版纯 lift 的失败被保留：表实查询排出小样本方', () => {\n  const r = matchLift(['无汗', '脉浮', '头痛', '喘']);\n  assert.strictEqual(r[0].formula, '理中丸');\n  assert.ok(r[0].support < 10);\n});\n\ntest('第三版混合：四个查询全部落到对应方', () => {\n  assert.strictEqual(matchHybrid(['无汗', '脉浮', '头痛', '喘'])[0].formula, '麻黄汤');\n  assert.strictEqual(matchHybrid(['往来寒热', '胸胁苦满', '口苦', '心烦'])[0].formula, '小柴胡汤');\n  assert.strictEqual(matchHybrid(['腹满', '潮热', '谵语'])[0].formula, '小承气汤');\n  assert.strictEqual(matchHybrid(['下利', '厥', '恶寒'])[0].formula, '四逆汤');\n});\n\ntest('混合版给出覆盖率与提升度分量，供人复核', () => {\n  const [top] = matchHybrid(['下利', '厥', '恶寒']);\n  assert.strictEqual(top.coverage, 1);\n  assert.ok(top.meanLift > 1);\n  assert.strictEqual(top.score, Number((top.meanLift * top.coverage).toFixed(2)));\n});\n\ntest('支持度门槛生效：小于 10 条的方不进混合版候选', () => {\n  for (const x of matchHybrid(['发热', '恶寒'])) assert.ok(x.support >= 10, x.formula);\n});\n\ntest('出处可回原文：麻黄汤 + 无汗 命中篇 5', () => {\n  const ev = evidence('麻黄汤', ['无汗']);\n  assert.ok(ev.length >= 1);\n  assert.ok(ev.some((e) => e.pian === 5 && e.text.includes('麻黄汤')));\n});\n\ntest('方名表覆盖本章用到的 12 方，且不含前缀污染词', () => {\n  assert.strictEqual(FORMULAS.length, 12);\n  assert.ok(FORMULAS.every((f) => !/^(宜|属|与|服)/.test(f)));\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "方证对应里「支持度」指的是？",
          "options": [
            "该方治好多少人",
            "含该方的条文数",
            "该方的药味数",
            "该方的剂量"
          ],
          "correct": 1,
          "explanation": "支持度是文本频次，不是疗效数据。"
        },
        {
          "stage": "check",
          "question": "为什么纯 Jaccard 会给「下利+厥+恶寒」排出调胃承气汤？",
          "options": [
            "条文写错了",
            "它只看重合比例，不看症状在全库的常见度，支持度大的方沾得上一切",
            "调胃承气汤确实主治寒利",
            "样本太少"
          ],
          "correct": 1,
          "explanation": "「厥」45 条、「恶寒」107 条，谁都有；支持度 134 的方组合覆盖面最广。"
        },
        {
          "stage": "check",
          "question": "纯 lift 版本为什么把「表实无汗」排成理中丸第一？",
          "options": [
            "理中丸支持度高",
            "小样本方靠单个罕见症状「头痛」取得极高平均提升，平均掩盖了覆盖不足",
            "理中丸确实治表实",
            "症状表缺失"
          ],
          "correct": 1,
          "explanation": "支持 5 条的方，命中 1 个罕见词就能刷高平均 lift。"
        },
        {
          "stage": "check",
          "question": "混合版的两个门槛是？",
          "options": [
            "支持 ≥ 10 且覆盖率 ≥ 0.5",
            "支持 ≥ 50 且 lift ≥ 10",
            "覆盖率 = 1 且支持 ≥ 100",
            "无门槛"
          ],
          "correct": 0,
          "explanation": "门槛是经验值，换语料需重标定。"
        },
        {
          "stage": "post",
          "question": "「腑实」查询里大承气只排第二，原因是？",
          "options": [
            "大承气支持度低",
            "查询缺少「大便硬」——正是大承气的入口条件",
            "大承气不在方名表",
            "算法随机"
          ],
          "correct": 1,
          "explanation": "排序取决于输入什么，而不是模型多聪明。"
        },
        {
          "stage": "post",
          "question": "本章处理否定句（「不恶寒」）的方式是？",
          "options": [
            "已正确识别",
            "未处理，作为已知缺陷声明出来",
            "删除相关条文",
            "加负号"
          ],
          "correct": 1,
          "explanation": "未处理的缺陷必须声明，否则排序整体偏移而无人知晓。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-fangzheng-duiying.md",
        "kind": "prompt",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/10-fangzheng-duiying/outputs/prompt-fangzheng-duiying.md",
        "title": "方证检索结果解读",
        "description": null,
        "chars": 741,
        "body": "# 方证检索结果解读\n\n## 用途\n\n拿到一个「症状 → 方剂」的排序后，判断它**能不能用**：看支持度、看覆盖、看否定句、看是否有荒谬项。\n用于**检索结果复核、教学演示、算法评估**。不做辨证结论。\n\n## 提示词\n\n```text\n你是伤寒论文本检索的复核助手。下面是某个方证检索系统给出的候选列表与查询症状。\n\n任务：逐条复核，输出「可用 / 慎用 / 弃用」及理由。\n\n规则：\n1. 先看支持度：含该方的条文数 < 10 的候选，标「小样本，偶然共现」，不进结论。\n2. 再看覆盖：查询症状中被该方覆盖的比例 < 0.5 的，标「覆盖不足」。\n3. 检查荒谬项：若候选方的治法方向与查询的寒热虚实相反（如寒利查出泻下方），\n   整份列表标「弃用」，并指出是哪种偏倚（大支持度 / 小样本 / 否定句）。\n4. 检查否定句：查询或条文中出现「不恶寒」「无汗」时，必须确认系统是否把否定当肯定；\n   未处理的，标「否定句风险」，结论降级。\n5. 每条候选必须附原文出处（篇号 + 原句片段）；给不出出处的候选一律剔除。\n6. 不得据排序结果下诊断或推荐处方；只评价检索质量。\n\n输出格式：\n【查询】…\n【候选复核】方名｜支持 n｜覆盖 x｜判定（可用/慎用/弃用）｜理由\n【整份判定】可用 / 慎用 / 弃用（偏倚类型）\n【缺口】未处理的语言现象…\n```\n\n## 使用示例\n\n输入：查询「下利+厥+恶寒」，系统给出「调胃承气汤 0.273 / 四逆汤 0.25」。\n\n输出：【候选复核】调胃承气汤｜支持 33｜覆盖 1.0｜弃用｜寒利查得泻下方，方向相反\n四逆汤｜支持 31｜覆盖 1.0｜可用｜有「下利」「厥」共现的原文支撑\n【整份判定】弃用（大支持度偏倚：Jaccard 未按症状常见度加权）\n【缺口】否定句未处理\n\n## 为什么这样限制\n\n- 排序看起来越\"顺\"，越没人复核；把复核清单前置，才挡得住荒谬结论。\n- 剔除无出处候选，是最便宜的一道防线。\n"
      },
      {
        "name": "skill-fangzheng-duiying.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/10-fangzheng-duiying/outputs/skill-fangzheng-duiying.md",
        "title": "fangzheng-duiying",
        "description": "方证检索复核：看支持度/覆盖率/否定句，遇方向相反整份弃用",
        "chars": 467,
        "body": "---\nname: fangzheng-duiying\ndescription: 方证检索复核：看支持度/覆盖率/否定句，遇方向相反整份弃用\nversion: 0.1.0\n---\n\n# fangzheng-duiying\n\n## 何时使用\n\n- 拿到症状→方剂排序，要判断能否采信\n- 教学演示「朴素重合度」为何不可靠\n- 评估一个方证检索系统（含 LLM 生成）的排序质量\n\n## 不适用\n\n- 辨证分型与治则\n- 剂量与煎服法（见第 12 章）\n- 条文原文检索排名（见第 11 章）\n\n## 步骤\n\n1. **看支持度**：< 10 条的候选标小样本，不进结论。\n2. **看覆盖**：< 50% 的标覆盖不足。\n3. **查方向**：候选方治法与查询寒热虚实相反 → 整份弃用。\n4. **查否定句**：不恶寒/无汗是否被当肯定；未处理 → 降级。\n5. **要出处**：无篇号与原句的候选剔除。\n\n## 输出模板\n\n```text\n【查询】…\n【候选复核】方｜支持｜覆盖｜可用/慎用/弃用｜理由\n【整份判定】…（偏倚类型）\n【缺口】…\n```\n\n## 质量判据\n\n- 每条候选带支持度与出处\n- 荒谬项被明确点名\n- 否定句风险有交代\n\n> 本技能只评价检索质量，不构成诊断或处方建议。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "01-zhongyi/07-shanghanlun/11-tiaowen-jiansuo": {
    "key": "01-zhongyi/07-shanghanlun/11-tiaowen-jiansuo",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "07-shanghanlun",
    "subjectTitle": "伤寒论",
    "chapterSlug": "11-tiaowen-jiansuo",
    "n": 11,
    "title": "第 11 章 · 条文检索：MRR 满分，但「库里没有」它不会说",
    "motto": "「有柴胡证，但见一证便是，不必悉具。」——《伤寒论·辨太阳病脉证并治中》（篇 5 第 222 条）",
    "problem": "你给 1760 条经文建了 BM25 索引，四个查询全部命中第一位，MRR = 1.000。你准备上线，却没测「查不到」的情况——问它「乌梅丸」，它返回一条「病人有寒，复发汗，胃中冷，必吐蛔」：原句是真的，答的不是你问的。",
    "roots": "环境逼迫(要检索 1760 条) + 知识积累(排序指标 × 弃答阈值 = 知道什么时候该说没有)",
    "html": "<h1 id=\"第-11-章-条文检索-mrr-满分-但-库里没有-它不会说\">第 11 章 · 条文检索：MRR 满分，但「库里没有」它不会说</h1>\n<blockquote><p><strong>MOTTO:</strong> 「有柴胡证，但见一证便是，不必悉具。」——《伤寒论·辨太阳病脉证并治中》（篇 5 第 222 条）</p>\n<p><strong>PROBLEM:</strong> 你给 1760 条经文建了 BM25 索引，四个查询全部命中第一位，MRR = 1.000。你准备上线，却没测「查不到」的情况——问它「乌梅丸」，它返回一条「病人有寒，复发汗，胃中冷，必吐蛔」：原句是真的，答的不是你问的。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(要检索 1760 条) + 知识积累(排序指标 × 弃答阈值 = 知道什么时候该说没有)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>伤寒论</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>11 / 12</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>4 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>在 1760 条经文上实现 BM25（单字 + 双字分词），并说清 k1、b 各自管什么</li><li>用「有答案 / 无答案」两类查询分别评测：排名用 MRR，拒答用阈值</li><li>说明为什么子串 AND 在古写面前会全灭（嘿/默）</li><li>判断「阈值可分」与「阈值可靠」的区别——余量 0.58 意味着什么</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"语料与分词\">语料与分词</h3>\n<p>底本 27 篇 1760 条，平均每条 <strong>79.8 token</strong>（单字 + 相邻双字，词表 13,687）。中文没有空格，双字是必须的：只切单字，「脉浮」与「浮脉」会被当成同一堆字；切双字才能区分搭配。</p>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">tokenize(&quot;太阳病，脉浮&quot;) → 太 太阳 阳 阳病 病 脉 脉浮 浮</code></pre></div>\n<h3 id=\"bm25-三件事\">BM25 三件事</h3>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">text</div><pre><code class=\"lang-text\">score(D,Q) = Σ idf(t) · [ f(t,D)·(k1+1) ] / [ f(t,D) + k1·(1 − b + b·|D|/avgdl) ]\nidf(t) = ln(1 + (N − df + 0.5)/(df + 0.5))</code></pre></div>\n<ul><li><code>k1 = 1.5</code>：词频饱和，出现 10 次的词不比 3 次的重要 3 倍</li><li><code>b = 0.75</code>：长度归一，长条文（如篇 5 的 283 条）不因字多占便宜</li><li><code>idf</code>：全库常见词（阴阳、伤寒）权重低，罕见词（乌梅、蛔）权重高</li></ul>\n<h3 id=\"评测-四个有答案-两个该弃答\">评测：四个有答案 + 两个该弃答</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>查询</th><th>BM25 首位</th><th>金标</th><th>排名</th><th>子串 AND</th></tr></thead><tbody><tr><td>太阳 脉浮 头项强痛 恶寒</td><td>4:1</td><td>4:1</td><td>1</td><td>命中 1 条，第 1 位</td></tr><tr><td>胃家实</td><td>9:2</td><td>9:2</td><td>1</td><td>命中 2 条，第 2 位</td></tr><tr><td>但见一证 不必悉具</td><td>5:222</td><td>5:222</td><td>1</td><td>1 条，第 1</td></tr><tr><td>心中疼热 气上撞心 消渴</td><td>24:1</td><td>24:1</td><td>1</td><td>1 条，第 1</td></tr><tr><td><strong>乌梅丸 吐蛔</strong></td><td>19:36（19.67）</td><td>无</td><td>—</td><td><strong>0 条</strong></td></tr><tr><td><strong>少阴之为病 但欲寐</strong></td><td>24:1（27.05）</td><td>无</td><td>—</td><td><strong>0 条</strong></td></tr></tbody></table></div>\n<ul><li><strong>MRR = 1.000</strong>（有金标的 4 条全部第 1 位）</li><li>子串 AND 在这 4 条上也全对，但它对两个「无答案」查询返回 <strong>0 条</strong>——不是它聪明，是它只会精确匹配</li><li>BM25 则<strong>永远返回结果</strong>：「乌梅丸」给了 19:36「必吐蛔」，一条看着对、实际没有乌梅丸的条文</li></ul>\n<h3 id=\"阈值-只有靠-真负样本-才标得出来-而这东西很稀缺\">阈值：只有靠「真负样本」才标得出来，而这东西很稀缺</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>分组</th><th>分数</th></tr></thead><tbody><tr><td>无答案查询的最高分</td><td><strong>27.051</strong>（「少阴之为病 但欲寐」→ 返回厥阴提纲 24:1）</td></tr><tr><td>有答案查询的最低分</td><td><strong>30.852</strong>（「下利 厥 恶寒 四逆汤」→ 返回 19:121）</td></tr></tbody></table></div>\n<p>取中点 <strong>28.95</strong> 作弃答阈值，本轮 6 个查询全部分类正确，余量 <strong>3.80</strong>（约 12%）。</p>\n<p>真正的问题不是余量大小，是<strong>这类负样本几乎拿不到</strong>：本章能用「乌梅丸」「少阴之为病」当负样本，是因为底本恰好缺了这两块（见第 2、8 章）。换成一般语料，你无法知道哪些词「库里没有」，也就没有分母——阈值只能凭猜。所以工程上的正解不是调阈值，而是<strong>先查语料白名单</strong>：词不在表里，直接回「底本未收」，不进排序。</p>\n<h3 id=\"分数不是答案可信度\">分数不是答案可信度</h3>\n<p>再看一眼那条被误答的查询：「乌梅丸 吐蛔」首位是 19:36「病人有寒，复发汗，胃中冷，必吐蛔」。它命中的是「吐蛔」——<strong>一个真词</strong>，所以分数不低（19.67）。BM25 不知道「乌梅丸」不在库里，只知道自己见过「吐蛔」。这类错误的可怕之处在于：它返回的原句是真的，只是答的不是你问的。</p>\n<h3 id=\"古写-不归一-检索必然空手\">古写：不归一，检索必然空手</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>查询</th><th>原文未归一</th><th>嘿→默归一后</th></tr></thead><tbody><tr><td>「默默不欲饮食」</td><td><strong>0 条</strong></td><td><strong>3 条</strong>（5:209 / 5:214 / 18:126）</td></tr></tbody></table></div>\n<p>底本「默默」0 条、「嘿嘿」3 条。同一个字在第 3 章（𤍠）、第 5 章（嘿）、第 8 章（𤍠）各绊过一次——检索层不建归一表，就是在赌底本的字形。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">tokenize(text)        // 单字 + 双字\nbuildIndex()          // df / tf / avgdl\nbm25(query, {k1,b})   // 排序\nsubstringAnd(query)   // 基线：所有词同条出现\n// QUERIES 里两条 gold:null 的查询专门用来测弃答</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：<code>bm25('但见一证 不必悉具')[0].id === '5:222'</code>；<code>bm25('乌梅丸 吐蛔')[0].score &amp;lt; 31.14</code> 且首位不是含「乌梅丸」的条（底本没有）；<code>substringAnd('乌梅丸 吐蛔').length === 0</code>。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>查询集只有 6 条</strong>，由作者自拟，不是基准集。MRR 1.0 只说明「这 6 条能查到」，不说明系统好用。</li><li><strong>金标由人工指定</strong>，存在选条偏差（如「胃家实」同时命中 9:1 与 9:2）。</li><li><strong>阈值 31.14 不可外推</strong>：换语料、换 k1/b、换查询长度都会移动。</li><li><strong>未处理否定与近义</strong>：「不恶寒」仍计入「恶寒」；「手足温」与「手足热」不作等价。</li><li><strong>BM25 不理解文义</strong>：它不知道「乌梅丸」不在库里，只知道自己见过的字。想让它说「没有」，必须外挂语料白名单或人工复核。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 语料为 <code>standards/shanghan/底本.json</code>（1760 条，可复算）；本章为检索算法演示，检索结果不构成文献结论或诊疗依据。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>把 <code>b</code> 从 0.75 调到 0（关闭长度归一），观察篇 5 的长条文是否霸榜，并解释原因。</li><li>构造一条查询，使无答案侧的最高分超过 31.43——证明阈值不可靠。</li><li>设计一个「先查语料白名单、再排序」的两段式方案，说明它如何挡住「乌梅丸」这类幻觉。</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>MRR 1.0 是最容易骗人的指标：它只统计「找到了排第几」，完全不惩罚「不该答的答了」。一个只会说「有」的系统，MRR 可以满分，临床可用性为零。</p>",
    "markdown": "# 第 11 章 · 条文检索：MRR 满分，但「库里没有」它不会说\r\n\r\n> **MOTTO:** 「有柴胡证，但见一证便是，不必悉具。」——《伤寒论·辨太阳病脉证并治中》（篇 5 第 222 条）\r\n>\r\n> **PROBLEM:** 你给 1760 条经文建了 BM25 索引，四个查询全部命中第一位，MRR = 1.000。你准备上线，却没测「查不到」的情况——问它「乌梅丸」，它返回一条「病人有寒，复发汗，胃中冷，必吐蛔」：原句是真的，答的不是你问的。\r\n>\r\n> **双根因定位:** 环境逼迫(要检索 1760 条) + 知识积累(排序指标 × 弃答阈值 = 知道什么时候该说没有)\r\n\r\n## 课程信息\r\n\r\n| 项目 | 内容 |\r\n|------|------|\r\n| 学科 | 伤寒论 |\r\n| 院系 | 中医系 |\r\n| 章序号 | 11 / 12 |\r\n| 所属阶段 | 🌿 长·积累 |\r\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\r\n| 预估时长 | 4 小时 |\r\n\r\n## 学习目标\r\n\r\n- 在 1760 条经文上实现 BM25（单字 + 双字分词），并说清 k1、b 各自管什么\r\n- 用「有答案 / 无答案」两类查询分别评测：排名用 MRR，拒答用阈值\r\n- 说明为什么子串 AND 在古写面前会全灭（嘿/默）\r\n- 判断「阈值可分」与「阈值可靠」的区别——余量 0.58 意味着什么\r\n\r\n## 核心概念\r\n\r\n### 语料与分词\r\n\r\n底本 27 篇 1760 条，平均每条 **79.8 token**（单字 + 相邻双字，词表 13,687）。中文没有空格，双字是必须的：只切单字，「脉浮」与「浮脉」会被当成同一堆字；切双字才能区分搭配。\r\n\r\n```\r\ntokenize(\"太阳病，脉浮\") → 太 太阳 阳 阳病 病 脉 脉浮 浮\r\n```\r\n\r\n### BM25 三件事\r\n\r\n```\r\nscore(D,Q) = Σ idf(t) · [ f(t,D)·(k1+1) ] / [ f(t,D) + k1·(1 − b + b·|D|/avgdl) ]\r\nidf(t) = ln(1 + (N − df + 0.5)/(df + 0.5))\r\n```\r\n\r\n- `k1 = 1.5`：词频饱和，出现 10 次的词不比 3 次的重要 3 倍\r\n- `b = 0.75`：长度归一，长条文（如篇 5 的 283 条）不因字多占便宜\r\n- `idf`：全库常见词（阴阳、伤寒）权重低，罕见词（乌梅、蛔）权重高\r\n\r\n### 评测：四个有答案 + 两个该弃答\r\n\r\n| 查询 | BM25 首位 | 金标 | 排名 | 子串 AND |\r\n|---|---|---|--:|---|\r\n| 太阳 脉浮 头项强痛 恶寒 | 4:1 | 4:1 | 1 | 命中 1 条，第 1 位 |\r\n| 胃家实 | 9:2 | 9:2 | 1 | 命中 2 条，第 2 位 |\r\n| 但见一证 不必悉具 | 5:222 | 5:222 | 1 | 1 条，第 1 |\r\n| 心中疼热 气上撞心 消渴 | 24:1 | 24:1 | 1 | 1 条，第 1 |\r\n| **乌梅丸 吐蛔** | 19:36（19.67） | 无 | — | **0 条** |\r\n| **少阴之为病 但欲寐** | 24:1（27.05） | 无 | — | **0 条** |\r\n\r\n- **MRR = 1.000**（有金标的 4 条全部第 1 位）\r\n- 子串 AND 在这 4 条上也全对，但它对两个「无答案」查询返回 **0 条**——不是它聪明，是它只会精确匹配\r\n- BM25 则**永远返回结果**：「乌梅丸」给了 19:36「必吐蛔」，一条看着对、实际没有乌梅丸的条文\r\n\r\n### 阈值：只有靠「真负样本」才标得出来，而这东西很稀缺\r\n\r\n| 分组 | 分数 |\r\n|---|---|\r\n| 无答案查询的最高分 | **27.051**（「少阴之为病 但欲寐」→ 返回厥阴提纲 24:1） |\r\n| 有答案查询的最低分 | **30.852**（「下利 厥 恶寒 四逆汤」→ 返回 19:121） |\r\n\r\n取中点 **28.95** 作弃答阈值，本轮 6 个查询全部分类正确，余量 **3.80**（约 12%）。\r\n\r\n真正的问题不是余量大小，是**这类负样本几乎拿不到**：本章能用「乌梅丸」「少阴之为病」当负样本，是因为底本恰好缺了这两块（见第 2、8 章）。换成一般语料，你无法知道哪些词「库里没有」，也就没有分母——阈值只能凭猜。所以工程上的正解不是调阈值，而是**先查语料白名单**：词不在表里，直接回「底本未收」，不进排序。\r\n\r\n### 分数不是答案可信度\r\n\r\n再看一眼那条被误答的查询：「乌梅丸 吐蛔」首位是 19:36「病人有寒，复发汗，胃中冷，必吐蛔」。它命中的是「吐蛔」——**一个真词**，所以分数不低（19.67）。BM25 不知道「乌梅丸」不在库里，只知道自己见过「吐蛔」。这类错误的可怕之处在于：它返回的原句是真的，只是答的不是你问的。\r\n\r\n### 古写：不归一，检索必然空手\r\n\r\n| 查询 | 原文未归一 | 嘿→默归一后 |\r\n|---|--:|--:|\r\n| 「默默不欲饮食」 | **0 条** | **3 条**（5:209 / 5:214 / 18:126） |\r\n\r\n底本「默默」0 条、「嘿嘿」3 条。同一个字在第 3 章（𤍠）、第 5 章（嘿）、第 8 章（𤍠）各绊过一次——检索层不建归一表，就是在赌底本的字形。\r\n\r\n## BUILD IT：从零实现\r\n\r\n```js\r\ntokenize(text)        // 单字 + 双字\r\nbuildIndex()          // df / tf / avgdl\r\nbm25(query, {k1,b})   // 排序\r\nsubstringAnd(query)   // 基线：所有词同条出现\r\n// QUERIES 里两条 gold:null 的查询专门用来测弃答\r\n```\r\n\r\n## 验证\r\n\r\n```bash\r\nnode code/main.js\r\nnode --test code/main.test.js\r\n```\r\n\r\n预期：`bm25('但见一证 不必悉具')[0].id === '5:222'`；`bm25('乌梅丸 吐蛔')[0].score < 31.14` 且首位不是含「乌梅丸」的条（底本没有）；`substringAnd('乌梅丸 吐蛔').length === 0`。\r\n\r\n## 代价与边界\r\n\r\n- **查询集只有 6 条**，由作者自拟，不是基准集。MRR 1.0 只说明「这 6 条能查到」，不说明系统好用。\r\n- **金标由人工指定**，存在选条偏差（如「胃家实」同时命中 9:1 与 9:2）。\r\n- **阈值 31.14 不可外推**：换语料、换 k1/b、换查询长度都会移动。\r\n- **未处理否定与近义**：「不恶寒」仍计入「恶寒」；「手足温」与「手足热」不作等价。\r\n- **BM25 不理解文义**：它不知道「乌梅丸」不在库里，只知道自己见过的字。想让它说「没有」，必须外挂语料白名单或人工复核。\r\n\r\n> **免责声明：** 语料为 `standards/shanghan/底本.json`（1760 条，可复算）；本章为检索算法演示，检索结果不构成文献结论或诊疗依据。\r\n\r\n## 练习\r\n\r\n1. 把 `b` 从 0.75 调到 0（关闭长度归一），观察篇 5 的长条文是否霸榜，并解释原因。\r\n2. 构造一条查询，使无答案侧的最高分超过 31.43——证明阈值不可靠。\r\n3. 设计一个「先查语料白名单、再排序」的两段式方案，说明它如何挡住「乌梅丸」这类幻觉。\r\n\r\n## 进阶思考\r\n\r\nMRR 1.0 是最容易骗人的指标：它只统计「找到了排第几」，完全不惩罚「不该答的答了」。一个只会说「有」的系统，MRR 可以满分，临床可用性为零。\r\n",
    "code": {
      "main.js": "'use strict';\r\n/**\r\n * 伤寒条文 BM25 检索 + 弃答阈值标定\r\n *\r\n *   node code/main.js\r\n *\r\n * 口径：\r\n *   · 分词 = 单字 + 相邻双字（中文无空格；双字能抓住「脉浮」「恶寒」这类固定搭配）\r\n *   · 归一：𤍠→热（底本异体），只作用于索引与查询，不回写原文\r\n *   · 基线 = 子串 AND（所有查询词都出现在同条）；它精确但只能处理「词原样出现」\r\n *   · 评测：5 条有答案 + 2 条无答案（乌梅丸、少阴提纲在底本里不存在）\r\n *     → 有答案看命中排名（MRR），无答案看是否弃答（弃答率）\r\n */\r\n\r\nconst path = require('node:path');\r\nconst fs = require('node:fs');\r\n\r\nconst ROOT = path.resolve(__dirname, '../../../../../..');\r\nconst BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));\r\n\r\nconst norm = (s) => s.split('𤍠').join('热');\r\nconst DOCS = [];\r\nfor (const p of BOOK.pian) for (const it of p.items) {\r\n  DOCS.push({ id: `${p.no}:${it.no}`, pian: p.no, no: it.no, text: it.text, norm: norm(it.text) });\r\n}\r\n\r\n/** 单字 + 双字 */\r\nfunction tokenize(text) {\r\n  const t = norm(text).replace(/\\s+/g, '');\r\n  const out = [];\r\n  for (let i = 0; i < t.length; i += 1) {\r\n    out.push(t[i]);\r\n    if (i + 1 < t.length) out.push(t.slice(i, i + 2));\r\n  }\r\n  return out;\r\n}\r\n\r\nfunction buildIndex() {\r\n  const df = new Map();\r\n  const tf = [];\r\n  let total = 0;\r\n  for (const d of DOCS) {\r\n    const toks = tokenize(d.norm);\r\n    const m = new Map();\r\n    for (const tk of toks) m.set(tk, (m.get(tk) || 0) + 1);\r\n    tf.push(m);\r\n    total += toks.length;\r\n    for (const k of m.keys()) df.set(k, (df.get(k) || 0) + 1);\r\n  }\r\n  return { df, tf, avgdl: total / DOCS.length, N: DOCS.length };\r\n}\r\n\r\nconst IDX = buildIndex();\r\n\r\nfunction bm25(query, { k1 = 1.5, b = 0.75 } = {}) {\r\n  const q = [...new Set(tokenize(query))];\r\n  const scores = DOCS.map((d, i) => {\r\n    const m = IDX.tf[i];\r\n    const dl = [...m.values()].reduce((a, x) => a + x, 0);\r\n    let s = 0;\r\n    for (const tk of q) {\r\n      const f = m.get(tk) || 0;\r\n      if (!f) continue;\r\n      const df = IDX.df.get(tk) || 0;\r\n      const idf = Math.log(1 + (IDX.N - df + 0.5) / (df + 0.5));\r\n      s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (dl / IDX.avgdl))));\r\n    }\r\n    return { id: d.id, pian: d.pian, no: d.no, score: Number(s.toFixed(3)), text: d.text };\r\n  });\r\n  return scores.sort((a, b2) => b2.score - a.score);\r\n}\r\n\r\n/** 基线：子串 AND（所有查询词都在同条） */\r\nfunction substringAnd(query) {\r\n  const terms = query.split(/\\s+/).filter(Boolean).map(norm);\r\n  const hits = DOCS.filter((d) => terms.every((t) => d.norm.includes(t)));\r\n  return hits.map((d) => ({ id: d.id, pian: d.pian, no: d.no, score: hits.length, text: d.text }));\r\n}\r\n\r\nconst QUERIES = [\r\n  { q: '太阳 脉浮 头项强痛 恶寒', gold: '4:1', note: '太阳提纲' },\r\n  { q: '胃家实', gold: '9:2', note: '阳明提纲' },\r\n  { q: '但见一证 不必悉具', gold: '5:222', note: '柴胡证一证即可' },\r\n  { q: '心中疼热 气上撞心 消渴', gold: '24:1', note: '厥阴提纲' },\r\n  { q: '下利 厥 恶寒 四逆汤', gold: null, note: '（无单一金标，用于观察排名）' },\r\n  { q: '乌梅丸 吐蛔', gold: null, note: '底本无乌梅丸 → 应弃答' },\r\n  { q: '少阴之为病 但欲寐', gold: null, note: '底本缺少阴篇 → 应弃答' },\r\n];\r\n\r\nfunction rankOf(list, gold) {\r\n  const i = list.findIndex((x) => x.id === gold);\r\n  return i < 0 ? null : i + 1;\r\n}\r\n\r\nfunction main() {\r\n  console.log(`索引：${IDX.N} 条 · 平均长度 ${IDX.avgdl.toFixed(1)} token · 词表 ${IDX.df.size}\\n`);\r\n  let mrr = 0, n = 0;\r\n  const rows = [];\r\n  for (const item of QUERIES) {\r\n    const b = bm25(item.q);\r\n    const s = substringAnd(item.q);\r\n    const rb = item.gold ? rankOf(b, item.gold) : null;\r\n    const rs = item.gold ? rankOf(s, item.gold) : null;\r\n    if (item.gold) { n += 1; if (rb) mrr += 1 / rb; }\r\n    rows.push({ ...item, top: b[0], topScore: b[0].score, subCount: s.length, rb, rs });\r\n    console.log(`Q：${item.q}`);\r\n    console.log(`  BM25 第一：${b[0].id}（${b[0].score}）${item.gold ? (rb ? `｜金标第 ${rb} 位` : '｜金标未进前 100') : ''}`);\r\n    console.log(`  子串AND：命中 ${s.length} 条${item.gold && rs ? `｜金标第 ${rs} 位` : ''}`);\r\n    console.log(`  ${b[0].text.slice(0, 50)}…\\n`);\r\n  }\r\n  console.log(`MRR@全序（有金标 ${n} 条）：${(mrr / n).toFixed(3)}`);\r\n\r\n  // 弃答阈值：无答案两问的最高分 vs 有答案最低分\r\n  const noAns = rows.filter((r) => !r.gold).map((r) => r.topScore);\r\n  const hasAns = rows.filter((r) => r.gold && r.rb).map((r) => r.topScore);\r\n  console.log(`\\n阈值标定：无答案最高分 ${Math.max(...noAns)}；有答案最低分 ${Math.min(...hasAns)}`);\r\n  const sep = Math.min(...hasAns) > Math.max(...noAns);\r\n  console.log(sep\r\n    ? `可分：阈值取 ${((Math.min(...hasAns) + Math.max(...noAns)) / 2).toFixed(2)} → 有答案全答、无答案全弃`\r\n    : '不可分：两个分布重叠 —— BM25 单靠绝对分无法保证「查不到就说查不到」');\r\n  // 通假演示：教材「默默不欲饮食」在底本写作「嘿嘿」\r\n  const rawHit = DOCS.filter((d) => d.text.includes('默默不欲饮食')).length;\r\n  const normHit = DOCS.filter((d) => d.text.split('嘿嘿').join('默默').includes('默默不欲饮食')).length;\r\n  console.log(`\\n通假演示：查询「默默不欲饮食」→ 原文未归一命中 ${rawHit} 条；嘿→默归一后 ${normHit} 条`);\r\n  console.log('  底本「默默」0 条、「嘿嘿」3 条（5:209 / 5:214 / 18:126）：不归一，检索必然空手。');\r\n\r\n  console.log('\\n口径：本输出为检索评测，不构成文献结论。');\r\n}\r\n\r\nif (require.main === module) main();\r\nmodule.exports = { tokenize, bm25, substringAnd, QUERIES, DOCS, IDX };\r\n",
      "main.test.js": "'use strict';\r\nconst assert = require('node:assert');\r\nconst test = require('node:test');\r\nconst { tokenize, bm25, substringAnd, DOCS, IDX } = require('./main.js');\r\n\r\ntest('分词：单字 + 双字，异体 𤍠 归一', () => {\r\n  const t = tokenize('发𤍠恶寒');\r\n  assert.ok(t.includes('发热'), '应切成「发热」双字');\r\n  assert.ok(!t.includes('发𤍠'), '异体不应保留');\r\n  assert.ok(t.includes('热'));\r\n});\r\n\r\ntest('索引：1760 条，词表规模可复现', () => {\r\n  assert.strictEqual(DOCS.length, 1760);\r\n  assert.strictEqual(IDX.N, 1760);\r\n  assert.strictEqual(IDX.df.size, 13687);\r\n  assert.ok(IDX.avgdl > 70 && IDX.avgdl < 90, `avgdl=${IDX.avgdl}`);\r\n});\r\n\r\ntest('四个有答案查询全部命中第一位（MRR=1）', () => {\r\n  const cases = [\r\n    ['太阳 脉浮 头项强痛 恶寒', '4:1'],\r\n    ['胃家实', '9:2'],\r\n    ['但见一证 不必悉具', '5:222'],\r\n    ['心中疼热 气上撞心 消渴', '24:1'],\r\n  ];\r\n  for (const [q, gold] of cases) assert.strictEqual(bm25(q)[0].id, gold, q);\r\n});\r\n\r\ntest('BM25 对「不存在的词」仍会给结果：乌梅丸首位不含乌梅丸', () => {\r\n  const top = bm25('乌梅丸 吐蛔')[0];\r\n  assert.ok(!top.text.includes('乌梅丸'), '底本无乌梅丸，首位不应含该词');\r\n  assert.ok(top.score < 31.14, `分数 ${top.score} 应低于弃答阈值`);\r\n});\r\n\r\ntest('子串 AND 对无答案查询返回 0 条（精确但不会模糊）', () => {\r\n  assert.strictEqual(substringAnd('乌梅丸 吐蛔').length, 0);\r\n  assert.strictEqual(substringAnd('少阴之为病 但欲寐').length, 0);\r\n});\r\n\r\ntest('阈值两侧：无答案最高 27.05 < 有答案最低 30.85（余量 3.80）', () => {\r\n  const noAns = Math.max(bm25('乌梅丸 吐蛔')[0].score, bm25('少阴之为病 但欲寐')[0].score);\r\n  const hasAns = Math.min(bm25('下利 厥 恶寒 四逆汤')[0].score, bm25('胃家实')[0].score);\r\n  assert.ok(noAns < hasAns, `${noAns} < ${hasAns}`);\r\n  assert.ok(Math.abs(noAns - 27.051) < 0.01, `noAns=${noAns}`);\r\n  assert.ok(Math.abs(hasAns - 30.852) < 0.01, `hasAns=${hasAns}`);\r\n});\r\n\r\ntest('通假：底本 0 条「默默」、3 条「嘿嘿」', () => {\r\n  assert.strictEqual(DOCS.filter((d) => d.text.includes('默默')).length, 0);\r\n  assert.strictEqual(DOCS.filter((d) => d.text.includes('嘿嘿')).length, 3);\r\n});\r\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "BM25 里的 b 参数管什么？",
          "options": [
            "词频饱和",
            "长度归一（长条文不因字多占便宜）",
            "倒排索引深度",
            "同义词扩展"
          ],
          "correct": 1,
          "explanation": "k1 管词频饱和，b 管长度归一（本章 b=0.75）。"
        },
        {
          "stage": "check",
          "question": "本章 MRR 评测的分母是？",
          "options": [
            "全部 7 个查询",
            "4 个有金标的查询",
            "1760 条经文",
            "6 个查询"
          ],
          "correct": 1,
          "explanation": "MRR 只统计有金标的查询；无答案查询另用弃答指标。"
        },
        {
          "stage": "check",
          "question": "查询「乌梅丸 吐蛔」时 BM25 首位的分数不为 0，原因是？",
          "options": [
            "底本有乌梅丸",
            "它命中了「吐蛔」这个真词——BM25 不知道自己没见过「乌梅丸」",
            "索引损坏",
            "分词错误"
          ],
          "correct": 1,
          "explanation": "只认识见过的字，是检索模型的根本局限。"
        },
        {
          "stage": "check",
          "question": "子串 AND 基线在「乌梅丸 吐蛔」上的表现是？",
          "options": [
            "返回 1 条",
            "返回 0 条（精确匹配的必然结果，不是它更聪明）",
            "返回全部 1760 条",
            "报错"
          ],
          "correct": 1,
          "explanation": "它只会精确匹配，模糊与近义一概不会。"
        },
        {
          "stage": "post",
          "question": "查询「默默不欲饮食」在底本上的命中情况是？",
          "options": [
            "3 条",
            "0 条；归一「嘿→默」后 3 条",
            "1 条",
            "1760 条"
          ],
          "correct": 1,
          "explanation": "底本「默默」0 条、「嘿嘿」3 条（5:209 / 5:214 / 18:126）。"
        },
        {
          "stage": "post",
          "question": "要让检索系统在「库里没有」时正确弃答，工程上的正解是？",
          "options": [
            "调高 BM25 阈值到 50",
            "先查语料白名单，词不在表里直接回「底本未收」，不进排序",
            "只返回前 1 条",
            "关闭分词"
          ],
          "correct": 1,
          "explanation": "阈值依赖稀缺的负样本，白名单是唯一稳定的弃答机制。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-tiaowen-jiansuo.md",
        "kind": "prompt",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/11-tiaowen-jiansuo/outputs/prompt-tiaowen-jiansuo.md",
        "title": "经文检索与弃答",
        "description": null,
        "chars": 632,
        "body": "# 经文检索与弃答\n\n## 用途\n\n在 1760 条经文上做关键词检索，并且**在语料里确实没有时要敢说没有**。\n用于**备课查条、引文定位、检索系统评估**。不做文义解释。\n\n## 提示词\n\n```text\n你是伤寒论文本检索助手。语料为 JSON（27 篇 · 1760 条 · 每篇 items[].text）。\n底本特征：使用异体字「𤍠」（=热）与通假「嘿嘿」（=默默）。\n\n任务：对查询返回候选条，并在无法回答时明确弃答。\n\n规则：\n1. 先查语料白名单：查询中的实体（方名、证名、篇名）若不在语料中出现过，\n   直接回「底本未收：<实体>」，不进入排序，不给相似条充数。\n2. 归一后再检索：𤍠→热、嘿→默；只改检索层，不改原文引用。\n3. 返回最多 3 条，每条必须给「篇 N 第 M 条」与原文片段（照抄）。\n4. 若最高分与次高分接近（<10%），标注「排序不稳」，并列报出。\n5. 不得据检索结果下辨证结论。\n6. 若用户问的是「有没有某条」，而语料里只有近似表述，必须写「无完全相同条文，最接近为…」。\n\n输出格式：\n【查询】…\n【归一】本次使用了哪些映射\n【结果】篇 N 第 M 条：「原文」｜分数…\n【弃答】是/否（原因）\n```\n\n## 使用示例\n\n输入：查「乌梅丸」。\n\n输出：【查询】乌梅丸\n【归一】无\n【结果】—\n【弃答】是——底本全库 0 条含「乌梅丸」；最接近的「必吐蛔」条（19:36）不是乌梅丸证，不作替代。\n\n## 为什么这样限制\n\n- 检索最危险的失败不是「查不到」，是「返回原句真实但答非所问」。\n- 白名单 + 弃答的组合，比调阈值可靠得多：阈值依赖你根本拿不到的负样本。\n"
      },
      {
        "name": "skill-tiaowen-jiansuo.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/11-tiaowen-jiansuo/outputs/skill-tiaowen-jiansuo.md",
        "title": "tiaowen-jiansuo",
        "description": "经文检索与弃答：白名单先行、归一后检索、近似条不得充数",
        "chars": 481,
        "body": "---\nname: tiaowen-jiansuo\ndescription: 经文检索与弃答：白名单先行、归一后检索、近似条不得充数\nversion: 0.1.0\n---\n\n# tiaowen-jiansuo\n\n## 何时使用\n\n- 备课/写作要定位某句在底本哪一条\n- 判断某方、某证在底本里到底有没有\n- 评估一个条文检索系统（含 LLM 检索）的可靠度\n\n## 不适用\n\n- 文义解释与辨证（本技能只定位文本）\n- 跨版本校勘\n- 剂量折算（见第 12 章）\n\n## 步骤\n\n1. **白名单**：实体（方/证/篇）是否在语料出现过；没有 → 直接弃答。\n2. **归一**：𤍠→热、嘿→默；只作用于检索。\n3. **检索**：单字 + 双字，BM25（k1=1.5, b=0.75）。\n4. **报稳不稳**：最高与次高差 <10% 时标「排序不稳」。\n5. **照抄原文**：给「篇 N 第 M 条」，不改字。\n\n## 输出模板\n\n```text\n【查询】…【归一】…\n【结果】篇 N 第 M 条：「原文」\n【弃答】是/否（原因）\n```\n\n## 质量判据\n\n- 语料没有的，明确说没有\n- 近似条被标为「最接近」，不被当作答案\n- 原文逐字、条号可核\n- 没有辨证结论\n\n> 本技能只做文本定位，不构成文献结论或诊疗依据。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "01-zhongyi/07-shanghanlun/12-jiliang-zhesuan": {
    "key": "01-zhongyi/07-shanghanlun/12-jiliang-zhesuan",
    "deptSlug": "01-zhongyi",
    "deptTitle": "中医系",
    "subjectSlug": "07-shanghanlun",
    "subjectTitle": "伤寒论",
    "chapterSlug": "12-jiliang-zhesuan",
    "n": 12,
    "title": "第 12 章 · 经方剂量：桂枝三两是 41 克、47 克，还是 9 克",
    "motto": "「桂枝三两，去皮。」——《伤寒论·辨太阳病脉证并治》（桂枝汤方）",
    "problem": "你要讲「桂枝三两是多少克」。三位老师给你三个答案：41.25 g、46.88 g、9 g。差 5.21 倍——而且三个人都引了原文，都没有错。",
    "roots": "环境逼迫(要给出可执行剂量) + 知识积累(三档前提 × 底本自带折算层 = 知道数字背后挂的是哪把尺)",
    "html": "<h1 id=\"第-12-章-经方剂量-桂枝三两是-41-克-47-克-还是-9-克\">第 12 章 · 经方剂量：桂枝三两是 41 克、47 克，还是 9 克</h1>\n<blockquote><p><strong>MOTTO:</strong> 「桂枝三两，去皮。」——《伤寒论·辨太阳病脉证并治》（桂枝汤方）</p>\n<p><strong>PROBLEM:</strong> 你要讲「桂枝三两是多少克」。三位老师给你三个答案：41.25 g、46.88 g、9 g。差 5.21 倍——而且三个人都引了原文，都没有错。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(要给出可执行剂量) + 知识积累(三档前提 × 底本自带折算层 = 知道数字背后挂的是哪把尺)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>伤寒论</td></tr><tr><td>院系</td><td>中医系</td></tr><tr><td>章序号</td><td>12 / 12</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>说出三档折算各自的<strong>前提</strong>，并解释为什么「哪个对」是个错问题</li><li>用底本内的宋人校语证明：折算不是现代人的发明，宋人已在书里算过</li><li>认出底本内部的不一致（同一方甘草三两 / 二两），并说明它如何影响剂量</li><li>判断哪些单位<strong>不能</strong>换算为克，以及为什么</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"底本里的单位谱系-实测条数\">底本里的单位谱系（实测条数）</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>单位</th><th>条数</th><th>类型</th></tr></thead><tbody><tr><td>两</td><td><strong>338</strong></td><td>重量</td></tr><tr><td>升</td><td><strong>259</strong></td><td>容量</td></tr><tr><td>枚</td><td><strong>147</strong></td><td>计数</td></tr><tr><td>合</td><td><strong>128</strong></td><td>容量</td></tr><tr><td>分</td><td><strong>81</strong></td><td>重量（方内分割）</td></tr><tr><td>斤</td><td><strong>40</strong></td><td>重量</td></tr><tr><td>个</td><td><strong>35</strong></td><td>计数</td></tr><tr><td>铢</td><td><strong>32</strong></td><td>重量</td></tr><tr><td>尺</td><td>27</td><td>长度（如「水一尺」少见，多为「一尺」布帛类）</td></tr><tr><td>片</td><td>21</td><td>计数</td></tr><tr><td>钱匕 / 方寸匕</td><td>3</td><td>取量器</td></tr></tbody></table></div>\n<p>关系：<strong>1 斤 = 16 两，1 两 = 24 铢，1 升 = 10 合</strong>。这三条是硬约束，代码里做了自检。</p>\n<h3 id=\"三档并列-桂枝汤-底本-4-41-载方\">三档并列（桂枝汤，底本 4:41 载方）</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>档</th><th>前提</th><th>桂枝三两</th><th>四味合计</th></tr></thead><tbody><tr><td>A</td><td>汉制 1 斤 = 220 g</td><td><strong>41.25 g</strong></td><td>151.25 g</td></tr><tr><td>B</td><td>汉制 1 斤 = 250 g</td><td><strong>46.88 g</strong></td><td>171.89 g</td></tr><tr><td>C</td><td>明清折量 1 两 ≈ 3 g</td><td><strong>9 g</strong></td><td>33 g</td></tr></tbody></table></div>\n<p>最高/最低 = <strong>5.21 倍</strong>。三档都不是玄学：A、B 的差别来自汉权衡器实测的分布两端；C 来自「古之一两，今用一钱可也」一系的折量传统——它的目的不是复原汉制，而是给后世一个安全可用的换算。</p>\n<p><strong>所以「桂枝三两等于多少克」正确的回答是</strong>：41.25 g（若按 1 斤 220 g）、46.88 g（若按 250 g）、9 g（若按明清折量）——<strong>前提必须一起给出</strong>。单独一个数字，无论多精确，都不可引用。</p>\n<h3 id=\"底本自带折算层-宋人已经算过\">底本自带折算层：宋人已经算过</h3>\n<p>底本 4:41 条里，紧接方后注有一段校语：</p>\n<blockquote><p>臣亿等谨按桂枝汤方：桂枝、芍药、生姜各三两，甘草二两，大枣十二枚。麻黄汤方：麻黄三两，桂枝二两，甘草一两，杏仁七十个。今以算法，二汤各取曰分之一，即得桂枝一两。十六约之……</p></blockquote>\n<p>（「曰分之一」是底本 OCR 讹字，通行本作「十分之一」；此处照抄并标注，不代改。）</p>\n<p>这段话的信息量很大：</p>\n<ol><li><strong>宋人（林亿等校正医书局）在校书时就做了折算</strong>，还写进了正文；</li><li>折算的动机是<strong>合方配比</strong>（桂枝麻黄各半汤），不是复古剂量；</li><li>「十六约之」用的是 1 斤 = 16 两的进位，与我们上面的硬约束一致。</li></ol>\n<p>换句话说：<strong>经方剂量的争议，从宋代就是文本内部的一部分</strong>。你读到的不是「原文 + 现代解释」，而是「原文 + 历代折算层」。</p>\n<h3 id=\"底本内部的不一致\">底本内部的不一致</h3>\n<div class=\"table-wrap\"><table><thead><tr><th>出处</th><th>甘草</th></tr></thead><tbody><tr><td>4:28（方文残片）</td><td>「桂枝三两去皮 芍药三两 <strong>甘草三两</strong>炙」</td></tr><tr><td>4:41（林亿校语引桂枝汤方）</td><td>「桂枝、芍药、生姜各三两，<strong>甘草二两</strong>，大枣十二枚」</td></tr></tbody></table></div>\n<p>同一底本，两处甘草差一两。按 A 档算，差 <strong>13.75 g</strong>。这不是小数——它足以让「甘草」在一张方里从佐使变成接近君臣的量。</p>\n<p>处理原则：<strong>两个数字都留着，各自标出处</strong>；不取「看起来更常见的那个」。原文没给你的，别替它决定。</p>\n<h3 id=\"不能换算的单位\">不能换算的单位</h3>\n<p><code>枚 / 个 / 把 / 片 / 茎</code> 是计数单位。本章代码对它们<strong>返回 <code>grams: null</code></strong>，理由写在返回值里：原文没给单枚重量，任何克数都是推测。市面上「大枣一枚 ≈ 3 g」这类数字流行，但它们来自现代实测样本，不是原文——可以用，但必须标「现代估测」，不能标「经方原量」。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">SCHOOLS            // 三档折算前提（label + 每两克数 + basis）\ntoGrams(n, unit, school)  // 斤/两/铢/分 → 克，带前提\ntoMl(n, unit)             // 升/合 → 毫升\ncountUnit(n, unit)        // 计数单位：grams 恒为 null + 理由\ncheckRelations()          // 1斤=16两、1两=24铢、1升=10合 自检\nguizhiTang()              // 桂枝汤三档并列 + 合计 + 倍数</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：<code>toGrams(3,'两','han220').grams === 41.25</code>；<code>toGrams(3,'两','ming').grams === 9</code>；<code>countUnit(12,'枚').grams === null</code>；<code>guizhiTang()</code> 三档合计 151.25 / 171.89 / 33，倍数 5.21。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>本章不裁哪一种折算正确</strong>。三档并列是结论，不是回避。</li><li><strong>汉制 1 斤 220–250 g 是学界通行区间，本章未复核原器</strong>。要裁决必须回到权衡器实测数据与断代，那超出本章范围。</li><li><strong>容量按 1 升 = 200 ml 折算</strong>，同样有争议（另有 198 ml、210 ml 等），本章只取通行值并标注。</li><li><strong>折算只解决「量」，不解决「效」</strong>。同一克数在不同煎法、服法（顿服 / 日三服 / 分温再服）下，进入体内的量完全不同——本章不涉及煎服法折算。</li><li><strong>不构成用量建议</strong>。任何临床应用须由执业医师依据药典与患者情况决定。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 方文与单位统计来自 <code>standards/shanghan/底本.json</code>（可复算，含 OCR 讹字与宋人校语）；本章为度量衡换算演示，不构成用药建议。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>用 A 档把「麻黄三两、桂枝二两、甘草一两、杏仁七十个」换算，并说明哪一味无法换算。</li><li>「水七升，煮取三升，温服一升」——按 200 ml/升，一剂分几次服？若按明清折量，这个次数会变吗？</li><li>4:28 与 4:41 的甘草差一两，你会怎么在讲义里写？给出两个方案并说明取舍。</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>剂量争议的本质是<strong>测量基准的丢失</strong>：汉尺、汉权、汉升都不是今天的器物，复原只能靠考古样本的分布。承认区间，比给一个精确到小数点的数字更专业——因为后者假装基准还在。</p>",
    "markdown": "# 第 12 章 · 经方剂量：桂枝三两是 41 克、47 克，还是 9 克\n\n> **MOTTO:** 「桂枝三两，去皮。」——《伤寒论·辨太阳病脉证并治》（桂枝汤方）\n>\n> **PROBLEM:** 你要讲「桂枝三两是多少克」。三位老师给你三个答案：41.25 g、46.88 g、9 g。差 5.21 倍——而且三个人都引了原文，都没有错。\n>\n> **双根因定位:** 环境逼迫(要给出可执行剂量) + 知识积累(三档前提 × 底本自带折算层 = 知道数字背后挂的是哪把尺)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 伤寒论 |\n| 院系 | 中医系 |\n| 章序号 | 12 / 12 |\n| 所属阶段 | 🌿 长·积累 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 3 小时 |\n\n## 学习目标\n\n- 说出三档折算各自的**前提**，并解释为什么「哪个对」是个错问题\n- 用底本内的宋人校语证明：折算不是现代人的发明，宋人已在书里算过\n- 认出底本内部的不一致（同一方甘草三两 / 二两），并说明它如何影响剂量\n- 判断哪些单位**不能**换算为克，以及为什么\n\n## 核心概念\n\n### 底本里的单位谱系（实测条数）\n\n| 单位 | 条数 | 类型 |\n|---|--:|---|\n| 两 | **338** | 重量 |\n| 升 | **259** | 容量 |\n| 枚 | **147** | 计数 |\n| 合 | **128** | 容量 |\n| 分 | **81** | 重量（方内分割） |\n| 斤 | **40** | 重量 |\n| 个 | **35** | 计数 |\n| 铢 | **32** | 重量 |\n| 尺 | 27 | 长度（如「水一尺」少见，多为「一尺」布帛类） |\n| 片 | 21 | 计数 |\n| 钱匕 / 方寸匕 | 3 | 取量器 |\n\n关系：**1 斤 = 16 两，1 两 = 24 铢，1 升 = 10 合**。这三条是硬约束，代码里做了自检。\n\n### 三档并列（桂枝汤，底本 4:41 载方）\n\n| 档 | 前提 | 桂枝三两 | 四味合计 |\n|---|---|--:|--:|\n| A | 汉制 1 斤 = 220 g | **41.25 g** | 151.25 g |\n| B | 汉制 1 斤 = 250 g | **46.88 g** | 171.89 g |\n| C | 明清折量 1 两 ≈ 3 g | **9 g** | 33 g |\n\n最高/最低 = **5.21 倍**。三档都不是玄学：A、B 的差别来自汉权衡器实测的分布两端；C 来自「古之一两，今用一钱可也」一系的折量传统——它的目的不是复原汉制，而是给后世一个安全可用的换算。\n\n**所以「桂枝三两等于多少克」正确的回答是**：41.25 g（若按 1 斤 220 g）、46.88 g（若按 250 g）、9 g（若按明清折量）——**前提必须一起给出**。单独一个数字，无论多精确，都不可引用。\n\n### 底本自带折算层：宋人已经算过\n\n底本 4:41 条里，紧接方后注有一段校语：\n\n> 臣亿等谨按桂枝汤方：桂枝、芍药、生姜各三两，甘草二两，大枣十二枚。麻黄汤方：麻黄三两，桂枝二两，甘草一两，杏仁七十个。今以算法，二汤各取曰分之一，即得桂枝一两。十六约之……\n\n（「曰分之一」是底本 OCR 讹字，通行本作「十分之一」；此处照抄并标注，不代改。）\n\n这段话的信息量很大：\n\n1. **宋人（林亿等校正医书局）在校书时就做了折算**，还写进了正文；\n2. 折算的动机是**合方配比**（桂枝麻黄各半汤），不是复古剂量；\n3. 「十六约之」用的是 1 斤 = 16 两的进位，与我们上面的硬约束一致。\n\n换句话说：**经方剂量的争议，从宋代就是文本内部的一部分**。你读到的不是「原文 + 现代解释」，而是「原文 + 历代折算层」。\n\n### 底本内部的不一致\n\n| 出处 | 甘草 |\n|---|---|\n| 4:28（方文残片） | 「桂枝三两去皮 芍药三两 **甘草三两**炙」 |\n| 4:41（林亿校语引桂枝汤方） | 「桂枝、芍药、生姜各三两，**甘草二两**，大枣十二枚」 |\n\n同一底本，两处甘草差一两。按 A 档算，差 **13.75 g**。这不是小数——它足以让「甘草」在一张方里从佐使变成接近君臣的量。\n\n处理原则：**两个数字都留着，各自标出处**；不取「看起来更常见的那个」。原文没给你的，别替它决定。\n\n### 不能换算的单位\n\n`枚 / 个 / 把 / 片 / 茎` 是计数单位。本章代码对它们**返回 `grams: null`**，理由写在返回值里：原文没给单枚重量，任何克数都是推测。市面上「大枣一枚 ≈ 3 g」这类数字流行，但它们来自现代实测样本，不是原文——可以用，但必须标「现代估测」，不能标「经方原量」。\n\n## BUILD IT：从零实现\n\n```js\nSCHOOLS            // 三档折算前提（label + 每两克数 + basis）\ntoGrams(n, unit, school)  // 斤/两/铢/分 → 克，带前提\ntoMl(n, unit)             // 升/合 → 毫升\ncountUnit(n, unit)        // 计数单位：grams 恒为 null + 理由\ncheckRelations()          // 1斤=16两、1两=24铢、1升=10合 自检\nguizhiTang()              // 桂枝汤三档并列 + 合计 + 倍数\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：`toGrams(3,'两','han220').grams === 41.25`；`toGrams(3,'两','ming').grams === 9`；`countUnit(12,'枚').grams === null`；`guizhiTang()` 三档合计 151.25 / 171.89 / 33，倍数 5.21。\n\n## 代价与边界\n\n- **本章不裁哪一种折算正确**。三档并列是结论，不是回避。\n- **汉制 1 斤 220–250 g 是学界通行区间，本章未复核原器**。要裁决必须回到权衡器实测数据与断代，那超出本章范围。\n- **容量按 1 升 = 200 ml 折算**，同样有争议（另有 198 ml、210 ml 等），本章只取通行值并标注。\n- **折算只解决「量」，不解决「效」**。同一克数在不同煎法、服法（顿服 / 日三服 / 分温再服）下，进入体内的量完全不同——本章不涉及煎服法折算。\n- **不构成用量建议**。任何临床应用须由执业医师依据药典与患者情况决定。\n\n> **免责声明：** 方文与单位统计来自 `standards/shanghan/底本.json`（可复算，含 OCR 讹字与宋人校语）；本章为度量衡换算演示，不构成用药建议。\n\n## 练习\n\n1. 用 A 档把「麻黄三两、桂枝二两、甘草一两、杏仁七十个」换算，并说明哪一味无法换算。\n2. 「水七升，煮取三升，温服一升」——按 200 ml/升，一剂分几次服？若按明清折量，这个次数会变吗？\n3. 4:28 与 4:41 的甘草差一两，你会怎么在讲义里写？给出两个方案并说明取舍。\n\n## 进阶思考\n\n剂量争议的本质是**测量基准的丢失**：汉尺、汉权、汉升都不是今天的器物，复原只能靠考古样本的分布。承认区间，比给一个精确到小数点的数字更专业——因为后者假装基准还在。\n",
    "code": {
      "main.js": "'use strict';\n/**\n * 经方剂量的度量衡折算：三档并列，不裁一种\n *\n *   node code/main.js\n *\n * 口径：\n *   · 底本原方用汉制（两/斤/铢/升/合/枚/个），本章只做「同一数字在不同折算前提下」的并列换算。\n *   · 三档的前提必须写在结果里：没有前提的克数不能引用。\n *   · 枚/个/把/片 等计数单位**不折算为质量** —— 大枣一枚几克没有原文依据，任何数字都是猜。\n *   · 容量按汉制 1 升 = 200 ml 折算（学界通行值），仍给区间标注。\n *   · 底本内嵌宋人（林亿等）校语，本身就带「今以算法约之」的折算痕迹 —— 折算不是现代发明。\n */\n\nconst path = require('node:path');\nconst fs = require('node:fs');\n\nconst ROOT = path.resolve(__dirname, '../../../../../..');\nconst BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));\nconst ITEMS = [];\nfor (const p of BOOK.pian) for (const it of p.items) ITEMS.push({ id: `${p.no}:${it.no}`, text: it.text });\n\n/** 三档折算前提（每档都带出处与区间，不给点值） */\nconst SCHOOLS = {\n  han220: { label: '汉制·1 斤=220 g（东汉偏低值）', liang: [13.75, 13.75], basis: '东汉权衡实测偏低一端' },\n  han250: { label: '汉制·1 斤=250 g（偏高一端）', liang: [15.625, 15.625], basis: '汉制权衡实测偏高一端' },\n  ming: { label: '明清折量·1 两≈3 g', liang: [3, 3], basis: '「古之一两，今用一钱可也」一系折量法' },\n};\n\nconst RATIO = { jin: 16, liang: 24 };       // 1 斤 = 16 两；1 两 = 24 铢\nconst VOLUME = { sheng: 200, ge: 20 };       // ml，汉制 1 升 = 10 合\n\n/** 重量换算：斤/两/铢/分（分 = 1/4 两，仅部分方使用；这里按两制分注） */\nfunction toGrams(amount, unit, school) {\n  const s = SCHOOLS[school];\n  if (!s) throw new Error(`未知折算档：${school}`);\n  const perLiang = s.liang[0];\n  let liang;\n  if (unit === '斤') liang = amount * RATIO.jin;\n  else if (unit === '两') liang = amount;\n  else if (unit === '铢') liang = amount / RATIO.liang;\n  else if (unit === '分') liang = amount / 4;\n  else throw new Error(`不支持的重量单位：${unit}`);\n  return { grams: Number((liang * perLiang).toFixed(2)), label: s.label, basis: s.basis, perLiang };\n}\n\n/** 容量换算 */\nfunction toMl(amount, unit) {\n  if (unit === '升') return { ml: amount * VOLUME.sheng, basis: '汉制 1 升 = 200 ml（通行值）' };\n  if (unit === '合') return { ml: amount * VOLUME.ge, basis: '汉制 1 合 = 20 ml' };\n  throw new Error(`不支持的容量单位：${unit}`);\n}\n\n/** 计数单位：拒绝换算 */\nfunction countUnit(amount, unit) {\n  if (!['枚', '个', '把', '片', '茎', '尺'].includes(unit)) throw new Error(`不是计数单位：${unit}`);\n  return { count: amount, unit, grams: null, note: '计数单位不折算为质量：原文未给单枚重量，任何克数都是推测' };\n}\n\n/** 单位关系自检 */\nfunction checkRelations() {\n  return [\n    { rel: '1 斤 = 16 两', ok: RATIO.jin === 16 },\n    { rel: '1 两 = 24 铢', ok: RATIO.liang === 24 },\n    { rel: '1 升 = 10 合', ok: VOLUME.sheng / VOLUME.ge === 10 },\n  ];\n}\n\n/** 底本里出现过的单位频次 */\nfunction unitCensus() {\n  const units = ['两', '升', '枚', '合', '分', '斤', '个', '铢', '尺', '片', '钱匕', '方寸匕', '把', '茎'];\n  return units.map((u) => ({ unit: u, tiao: ITEMS.filter((i) => i.text.includes(u)).length }));\n}\n\n/** 桂枝汤（底本 4:41 林亿校语所载方）三档并列 */\nfunction guizhiTang() {\n  const recipe = [['桂枝', 3, '两'], ['芍药', 3, '两'], ['生姜', 3, '两'], ['甘草', 2, '两']];\n  return Object.keys(SCHOOLS).map((k) => {\n    const rows = recipe.map(([name, n, u]) => ({ name, n, u, ...toGrams(n, u, k) }));\n    const sum = rows.reduce((a, r) => a + r.grams, 0);\n    return { school: SCHOOLS[k].label, rows, sum: Number(sum.toFixed(2)) };\n  });\n}\n\nfunction main() {\n  console.log('单位关系自检：');\n  for (const r of checkRelations()) console.log(`  ${r.ok ? '✓' : '✗'} ${r.rel}`);\n\n  console.log('\\n底本单位频次（条数）：');\n  console.log('  ' + unitCensus().map((x) => `${x.unit} ${x.tiao}`).join(' · '));\n\n  console.log('\\n桂枝汤（底本 4:41 载：桂枝/芍药/生姜各三两，甘草二两）三档并列：');\n  for (const s of guizhiTang()) {\n    console.log(`  ${s.school}`);\n    console.log('    ' + s.rows.map((r) => `${r.name} ${r.n}${r.u}=${r.grams}g`).join('  ') + ` ｜四味合计 ${s.sum} g`);\n  }\n  const sums = guizhiTang().map((s) => s.sum);\n  console.log(`  最高/最低 = ${(Math.max(...sums) / Math.min(...sums)).toFixed(2)} 倍`);\n\n  console.log('\\n容量：水七升 / 煮取三升 / 服一升');\n  for (const [n, u] of [[7, '升'], [3, '升'], [1, '升']]) {\n    const r = toMl(n, u);\n    console.log(`  ${n}${u} = ${r.ml} ml（${r.basis}）`);\n  }\n\n  console.log('\\n计数单位（拒绝折算）：');\n  const c = countUnit(12, '枚');\n  console.log(`  大枣 ${c.count}${c.unit} → ${c.grams === null ? 'null' : c.grams}g｜${c.note}`);\n\n  console.log('\\n口径：三档前提必须随数字一起给出；本章不裁哪一种正确。');\n  console.log('本输出为度量衡换算演示，不构成用量建议。');\n}\n\nif (require.main === module) main();\nmodule.exports = { SCHOOLS, RATIO, VOLUME, toGrams, toMl, countUnit, checkRelations, unitCensus, guizhiTang, ITEMS };\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { toGrams, toMl, countUnit, checkRelations, guizhiTang, unitCensus, ITEMS, SCHOOLS } = require('./main.js');\n\ntest('单位关系自检三条全过：1斤=16两、1两=24铢、1升=10合', () => {\n  const r = checkRelations();\n  assert.strictEqual(r.length, 3);\n  assert.ok(r.every((x) => x.ok), JSON.stringify(r));\n});\n\ntest('桂枝三两：三档 41.25 / 46.88 / 9 克，倍数 5.21', () => {\n  assert.strictEqual(toGrams(3, '两', 'han220').grams, 41.25);\n  assert.strictEqual(toGrams(3, '两', 'han250').grams, 46.88);\n  assert.strictEqual(toGrams(3, '两', 'ming').grams, 9);\n  const sums = guizhiTang().map((s) => s.sum);\n  assert.deepStrictEqual(sums, [151.25, 171.89, 33]);\n  assert.strictEqual(Number((Math.max(...sums) / Math.min(...sums)).toFixed(2)), 5.21);\n});\n\ntest('每个克数都带前提，不返回裸数字', () => {\n  const r = toGrams(1, '两', 'han220');\n  assert.ok(r.label && r.basis && r.perLiang);\n  assert.strictEqual(r.perLiang, 13.75);\n  assert.deepStrictEqual(Object.keys(SCHOOLS).sort(), ['han220', 'han250', 'ming']);\n});\n\ntest('铢与分的进位：24 铢 = 1 两；4 分 = 1 两', () => {\n  assert.strictEqual(toGrams(24, '铢', 'han220').grams, toGrams(1, '两', 'han220').grams);\n  assert.strictEqual(toGrams(4, '分', 'han220').grams, toGrams(1, '两', 'han220').grams);\n});\n\ntest('斤：1 斤 = 16 两', () => {\n  assert.strictEqual(toGrams(1, '斤', 'han220').grams, 220);\n  assert.strictEqual(toGrams(1, '斤', 'han250').grams, 250);\n});\n\ntest('容量：水七升 = 1400 ml，服一升 = 200 ml', () => {\n  assert.strictEqual(toMl(7, '升').ml, 1400);\n  assert.strictEqual(toMl(1, '升').ml, 200);\n  assert.strictEqual(toMl(1, '合').ml, 20);\n});\n\ntest('计数单位拒绝折算：大枣十二枚 grams 为 null 且有理由', () => {\n  const c = countUnit(12, '枚');\n  assert.strictEqual(c.grams, null);\n  assert.strictEqual(c.count, 12);\n  assert.match(c.note, /不折算/);\n});\n\ntest('未知档 / 不支持的单位必须抛错，不许静默返回', () => {\n  assert.throws(() => toGrams(1, '两', 'qing'), /未知折算档/);\n  assert.throws(() => toGrams(1, '枚', 'han220'), /不支持的重量单位/);\n  assert.throws(() => toMl(1, '两'), /不支持的容量单位/);\n});\n\ntest('底本单位频次可复现：两 338 · 升 259 · 枚 147 · 斤 40 · 铢 32', () => {\n  const c = Object.fromEntries(unitCensus().map((x) => [x.unit, x.tiao]));\n  assert.strictEqual(c['两'], 338);\n  assert.strictEqual(c['升'], 259);\n  assert.strictEqual(c['枚'], 147);\n  assert.strictEqual(c['斤'], 40);\n  assert.strictEqual(c['铢'], 32);\n});\n\ntest('底本内宋人校语存在（林亿等按桂枝汤方），且甘草两处说法不同', () => {\n  const jiaoyu = ITEMS.filter((i) => i.text.includes('臣亿等谨按') && i.text.includes('桂枝汤方'));\n  assert.ok(jiaoyu.length >= 1, '应有林亿校语');\n  const frag = ITEMS.find((i) => i.id === '4:28');\n  assert.ok(frag.text.includes('甘草三两'), '4:28 作甘草三两');\n  assert.ok(jiaoyu.some((x) => x.text.includes('甘草二两')), '校语作甘草二两');\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "「桂枝三两」换算成克，正确的回答是？",
          "options": [
            "41.25 g",
            "46.88 g",
            "9 g",
            "三档并列，必须连前提一起给出"
          ],
          "correct": 3,
          "explanation": "5.21 倍差异来自折算前提；单独一个数字不可引用。"
        },
        {
          "stage": "check",
          "question": "汉制的进位关系是？",
          "options": [
            "1 斤 = 10 两，1 两 = 10 铢",
            "1 斤 = 16 两，1 两 = 24 铢",
            "1 斤 = 16 两，1 两 = 16 铢",
            "1 斤 = 12 两"
          ],
          "correct": 1,
          "explanation": "代码对这三条做了自检（含 1 升 = 10 合）。"
        },
        {
          "stage": "check",
          "question": "底本 4:41 里的「臣亿等谨按…今以算法」说明什么？",
          "options": [
            "底本抄错",
            "宋人校书时已做过折算，折算层是文本的一部分",
            "宋代已有公制",
            "这是后人加的批注可删"
          ],
          "correct": 1,
          "explanation": "折算不是现代人的发明，宋代校书已算过并写入正文。"
        },
        {
          "stage": "check",
          "question": "底本内桂枝汤的甘草有两处说法：4:28 作三两、4:41 校语作二两。正确处理是？",
          "options": [
            "取常见的二两",
            "取三两",
            "两处都留、各标出处，不替原文决定",
            "删掉其中一处"
          ],
          "correct": 2,
          "explanation": "按 A 档这两说差 13.75 g，足以改变方内配比。"
        },
        {
          "stage": "post",
          "question": "为什么「大枣十二枚」不换算成克？",
          "options": [
            "原文没给单枚重量，任何克数都是推测",
            "大枣不重要",
            "枚不是单位",
            "可以换算，只是没人算"
          ],
          "correct": 0,
          "explanation": "现代实测样本可作参考，但必须标「现代估测」而非「经方原量」。"
        },
        {
          "stage": "post",
          "question": "剂量折算能解决下列哪一项？",
          "options": [
            "药效差异",
            "煎法对溶出的影响",
            "把原文数字放到明确的度量基准下比较",
            "患者个体差异"
          ],
          "correct": 2,
          "explanation": "折算只解决「量」的基准，不解决「效」。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-jiliang-zhesuan.md",
        "kind": "prompt",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/12-jiliang-zhesuan/outputs/prompt-jiliang-zhesuan.md",
        "title": "经方剂量三档换算",
        "description": null,
        "chars": 746,
        "body": "# 经方剂量三档换算\n\n## 用途\n\n把底本的「两 / 斤 / 铢 / 分 / 升 / 合」换成可比较的数，并**强制带前提**。\n用于**讲义注释、剂量对比、文献复算**。不给用量建议。\n\n## 提示词\n\n```text\n你是经方度量衡助手。任务：把给定方量与单位换算，三档并列，每档带前提。\n\n三档前提（必须随结果一起输出）：\nA 汉制 1 斤 = 220 g → 1 两 = 13.75 g\nB 汉制 1 斤 = 250 g → 1 两 = 15.625 g\nC 明清折量 1 两 ≈ 3 g\n\n硬约束：1 斤 = 16 两；1 两 = 24 铢；1 升 = 10 合；1 升 = 200 ml。\n计数单位（枚/个/把/片/茎）：不折算为质量，输出「原文未给单枚重量」。\n\n规则：\n1. 每个克数后必须括号注明档位与前提；裸数字视为错误输出。\n2. 若原文两处说法不同（如甘草三两 / 二两），两说并列并各标条号，不择一。\n3. 容量按 200 ml/升折算并标注「通行值，有争议」。\n4. 不把「现代实测」的枚重冒充「经方原量」，如需给出要标「现代估测」。\n5. 不给煎服法建议、不给临床用量、不判断安全性。\n\n输出格式：\n【原方】逐味：药名 数量+单位（条号）\n【三档】A：… / B：… / C：…（每味 + 合计）\n【倍数】最高/最低\n【不可换算】…\n【异文】…\n```\n\n## 使用示例\n\n输入：桂枝汤（底本 4:41 载）。\n\n输出：【原方】桂枝三两、芍药三两、生姜三两、甘草二两（4:41 校语）\n【三档】A：41.25/41.25/41.25/27.5，合计 151.25 g；B：46.88…合计 171.89 g；C：9/9/9/6，合计 33 g\n【倍数】5.21\n【不可换算】大枣十二枚（计数单位）\n【异文】4:28 作「甘草三两」，与校语差一两（A 档 13.75 g）\n\n## 为什么这样限制\n\n- 不给前提的克数，读者无法判断它是复原汉制还是明清折量，等于制造误解。\n- 枚重是最容易被\"补\"的数字，一旦补上就再也分不清原文与现代估测。\n"
      },
      {
        "name": "skill-jiliang-zhesuan.md",
        "kind": "skill",
        "file": "departments/01-zhongyi/07-shanghanlun/chapters/12-jiliang-zhesuan/outputs/skill-jiliang-zhesuan.md",
        "title": "jiliang-zhesuan",
        "description": "经方剂量三档换算：每数带前提、异文并列、计数单位不折克",
        "chars": 507,
        "body": "---\nname: jiliang-zhesuan\ndescription: 经方剂量三档换算：每数带前提、异文并列、计数单位不折克\nversion: 0.1.0\n---\n\n# jiliang-zhesuan\n\n## 何时使用\n\n- 讲义要标注「三两等于多少克」\n- 比较两方剂量（如桂枝汤 vs 麻黄汤）\n- 发现原文两处剂量不同，需要并列而不择一\n\n## 不适用\n\n- 临床用量与安全性判断\n- 煎服法折算（顿服/日三服的影响）\n- 药效与药理\n\n## 步骤\n\n1. **取原方**：逐味抄数量与单位，标条号。\n2. **查硬约束**：1 斤 16 两、1 两 24 铢、1 升 10 合、1 升 200 ml。\n3. **三档并列**：A 13.75 g/两、B 15.625 g/两、C 3 g/两；每档给合计与倍数。\n4. **标不可换算**：枚/个/把/片/茎 → grams = null + 理由。\n5. **列异文**：同方不同条数字不一致时并列。\n6. **声明边界**：不构成用量建议。\n\n## 输出模板\n\n```text\n【原方】…（条号）\n【三档】A/B/C 逐味 + 合计\n【倍数】…\n【不可换算】…\n【异文】…\n```\n\n## 质量判据\n\n- 没有裸克数\n- 计数单位未被折成克\n- 异文两说都在\n- 有争议的通行值（1 升 200 ml）被标注\n\n> 本技能只做度量衡换算，不构成用药建议。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "02-zhongyao/01-zhongyaoxue/12-xingneng-bianma": {
    "key": "02-zhongyao/01-zhongyaoxue/12-xingneng-bianma",
    "deptSlug": "02-zhongyao",
    "deptTitle": "中药系",
    "subjectSlug": "01-zhongyaoxue",
    "subjectTitle": "中药学",
    "chapterSlug": "12-xingneng-bianma",
    "n": 12,
    "title": "第 12 章 · 中药性能的编码化：性味归经 → 向量",
    "motto": "「药有酸咸甘苦辛五味，又有寒热温凉四气。」——《神农本草经·序录》",
    "problem": "你能背「麻黄辛、微苦，温，归肺、膀胱经」，但当有人问「哪几味药和麻黄性能最接近」，你只能凭印象点几味，说不出「接近」是按什么算的。",
    "roots": "环境逼迫(方剂替换、药源短缺时要现场找替代药) + 知识积累(四气五味归经 × 向量空间 = 一个能排序、能解释维度的相似度)",
    "html": "<h1 id=\"第-12-章-中药性能的编码化-性味归经-向量\">第 12 章 · 中药性能的编码化：性味归经 → 向量</h1>\n<blockquote><p><strong>MOTTO:</strong> 「药有酸咸甘苦辛五味，又有寒热温凉四气。」——《神农本草经·序录》</p>\n<p><strong>PROBLEM:</strong> 你能背「麻黄辛、微苦，温，归肺、膀胱经」，但当有人问「哪几味药和麻黄性能最接近」，你只能凭印象点几味，说不出「接近」是按什么算的。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(方剂替换、药源短缺时要现场找替代药) + 知识积累(四气五味归经 × 向量空间 = 一个能排序、能解释维度的相似度)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>中药学</td></tr><tr><td>院系</td><td>中药系</td></tr><tr><td>章序号</td><td>12 / 12</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>把「性味归经」这种表格文字，变成一个定长向量，并说明每个维度代表什么</li><li>用余弦相似度排序近似药材，并指出相似度<strong>不能</strong>代表什么</li><li>说清「四气」的有序性（寒→凉→平→温→热）为什么不能用 one-hot 编码</li><li>在同一份数据上，比较欧氏距离与余弦相似度给出的排序差异</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"中医-性能是一个多维描述\">中医：性能是一个多维描述</h3>\n<p>四气描述<strong>作用趋向</strong>（寒凉清热、温热散寒），五味描述<strong>功能类别</strong>（辛散、甘补、酸收、苦泄、咸软），归经描述<strong>作用部位</strong>。《神农本草经·序录》把性味并举，后世才把归经补进体系。三者不是并列的标签，而是三个不同性质的轴：气是<strong>有序轴</strong>，味与归经是<strong>类别轴</strong>。</p>\n<p>这一点决定了编码方式：气可以用一个整数（寒=-2 … 热=+2），味与归经必须用 0/1 的多位向量。</p>\n<h3 id=\"ai-工程-混合编码与余弦相似度\">AI/工程：混合编码与余弦相似度</h3>\n<span class=\"math-block\"><b>v</b>(h)=[q, t<sub>1</sub>..t<sub>5</sub>, m<sub>1</sub>..m<sub>12</sub>]</span>\n<p>其中 <span class=\"math\">q</span> 是气（一维整数），<span class=\"math\">t<sub>1</sub>..t<sub>5</sub></span> 是辛甘酸苦咸五位，<span class=\"math\">m<sub>1</sub>..m<sub>12</sub></span> 是十二归经位。</p>\n<p>相似度用余弦：<span class=\"math\"><span class=\"math-op\">cos</span>(<b>v</b><sub>a</sub>,<b>v</b><sub>b</sub>)=<span class=\"frac\"><span class=\"frac-num\"><b>v</b><sub>a</sub>·<b>v</b><sub>b</sub></span><span class=\"frac-den\">‖<b>v</b><sub>a</sub>‖‖<b>v</b><sub>b</sub>‖</span></span></span>。</p>\n<p>必须记住的局限：余弦把 12 个归经维度<strong>等权</strong>处理，而临床上「同归肺经」与「同归膀胱经」的临床意义并不相同；它也不含剂量、炮制、配伍信息。所以它回答的是「性能描述接近」，不是「可以互换」。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">const HERBS = [\n  { name: '麻黄', qi: 2, wei: ['辛', '微苦'], jing: ['肺', '膀胱'] },\n  { name: '桂枝', qi: 2, wei: ['辛', '甘'], jing: ['心', '肺', '膀胱'] },\n  { name: '紫苏叶', qi: 1, wei: ['辛'], jing: ['肺', '脾'] },\n  { name: '薄荷', qi: -1, wei: ['辛'], jing: ['肺', '肝'] },\n  { name: '石膏', qi: -2, wei: ['辛', '甘'], jing: ['肺', '胃'] },\n];\nfunction vec(h) { /* 气 → 1 维；五味 → 5 维；归经 → 12 维 */ }\nfunction cos(a, b) { /* 点积 / 模长积，零向量返回 0 */ }</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：以麻黄为查询，桂枝排第一；石膏因归经重叠少、气相反，排在末位。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>等权是最大的失真源</strong>。12 个归经维度等权，等于宣称「归肺」与「归膀胱」一样重要。真实临床要按病位加权，而权重从哪来，本课没有答案。</li><li><strong>微苦/苦、微温/温这类程度词被压平了</strong>。压平之后，麻黄与桂枝的差异只剩归经，而实际差异在「发汗力强弱」。</li><li><strong>不含炮制与配伍</strong>。蜜炙麻黄与生麻黄在性能向量里完全相同，这在教学上是可接受的简化，在临床上不是。</li><li><strong>相似 ≠ 可替换</strong>。性能相近的药材可能毒性、剂量、禁忌差异极大。本课的排序只能作为「查证线索」，不能作为换药依据。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 本章药材数据为教学示例，性味归经取自通行教材的简化表述，不构成用药建议；实际处方须由执业中医师依据药典与患者情况决定。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>把「微苦」改成独立的类别维度而不是并入「苦」，排序会怎么变？这说明了什么？</li><li>给归经维度加上病位权重（如肺 1.5、膀胱 0.8），重跑麻黄查询，记录前三名的变化。</li><li>为什么不应该用欧氏距离？构造一个例子说明它在什么情况下会给出反直觉的排序。</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>编码化的第一步总是「把说明拆成维度」，第二步是「承认哪些信息在拆的过程中丢了」。第二步没人愿意写，因为它让系统看起来不如宣传的那么强——但不写，使用者就会以为它比实际更强。</p>",
    "markdown": "# 第 12 章 · 中药性能的编码化：性味归经 → 向量\n\n> **MOTTO:** 「药有酸咸甘苦辛五味，又有寒热温凉四气。」——《神农本草经·序录》\n>\n> **PROBLEM:** 你能背「麻黄辛、微苦，温，归肺、膀胱经」，但当有人问「哪几味药和麻黄性能最接近」，你只能凭印象点几味，说不出「接近」是按什么算的。\n>\n> **双根因定位:** 环境逼迫(方剂替换、药源短缺时要现场找替代药) + 知识积累(四气五味归经 × 向量空间 = 一个能排序、能解释维度的相似度)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 中药学 |\n| 院系 | 中药系 |\n| 章序号 | 12 / 12 |\n| 所属阶段 | 🌿 长·积累 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 3 小时 |\n\n## 学习目标\n\n- 把「性味归经」这种表格文字，变成一个定长向量，并说明每个维度代表什么\n- 用余弦相似度排序近似药材，并指出相似度**不能**代表什么\n- 说清「四气」的有序性（寒→凉→平→温→热）为什么不能用 one-hot 编码\n- 在同一份数据上，比较欧氏距离与余弦相似度给出的排序差异\n\n## 核心概念\n\n### 中医：性能是一个多维描述\n\n四气描述**作用趋向**（寒凉清热、温热散寒），五味描述**功能类别**（辛散、甘补、酸收、苦泄、咸软），归经描述**作用部位**。《神农本草经·序录》把性味并举，后世才把归经补进体系。三者不是并列的标签，而是三个不同性质的轴：气是**有序轴**，味与归经是**类别轴**。\n\n这一点决定了编码方式：气可以用一个整数（寒=-2 … 热=+2），味与归经必须用 0/1 的多位向量。\n\n### AI/工程：混合编码与余弦相似度\n\n$$\\mathbf{v}(h)=[q,\\;t_1..t_5,\\;m_1..m_{12}]$$\n\n其中 $q$ 是气（一维整数），$t_1..t_5$ 是辛甘酸苦咸五位，$m_1..m_{12}$ 是十二归经位。\n\n相似度用余弦：$\\cos(\\mathbf{v}_a,\\mathbf{v}_b)=\\dfrac{\\mathbf{v}_a\\cdot\\mathbf{v}_b}{\\|\\mathbf{v}_a\\|\\|\\mathbf{v}_b\\|}$。\n\n必须记住的局限：余弦把 12 个归经维度**等权**处理，而临床上「同归肺经」与「同归膀胱经」的临床意义并不相同；它也不含剂量、炮制、配伍信息。所以它回答的是「性能描述接近」，不是「可以互换」。\n\n## BUILD IT：从零实现\n\n```js\nconst HERBS = [\n  { name: '麻黄', qi: 2, wei: ['辛', '微苦'], jing: ['肺', '膀胱'] },\n  { name: '桂枝', qi: 2, wei: ['辛', '甘'], jing: ['心', '肺', '膀胱'] },\n  { name: '紫苏叶', qi: 1, wei: ['辛'], jing: ['肺', '脾'] },\n  { name: '薄荷', qi: -1, wei: ['辛'], jing: ['肺', '肝'] },\n  { name: '石膏', qi: -2, wei: ['辛', '甘'], jing: ['肺', '胃'] },\n];\nfunction vec(h) { /* 气 → 1 维；五味 → 5 维；归经 → 12 维 */ }\nfunction cos(a, b) { /* 点积 / 模长积，零向量返回 0 */ }\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：以麻黄为查询，桂枝排第一；石膏因归经重叠少、气相反，排在末位。\n\n## 代价与边界\n\n- **等权是最大的失真源**。12 个归经维度等权，等于宣称「归肺」与「归膀胱」一样重要。真实临床要按病位加权，而权重从哪来，本课没有答案。\n- **微苦/苦、微温/温这类程度词被压平了**。压平之后，麻黄与桂枝的差异只剩归经，而实际差异在「发汗力强弱」。\n- **不含炮制与配伍**。蜜炙麻黄与生麻黄在性能向量里完全相同，这在教学上是可接受的简化，在临床上不是。\n- **相似 ≠ 可替换**。性能相近的药材可能毒性、剂量、禁忌差异极大。本课的排序只能作为「查证线索」，不能作为换药依据。\n\n> **免责声明：** 本章药材数据为教学示例，性味归经取自通行教材的简化表述，不构成用药建议；实际处方须由执业中医师依据药典与患者情况决定。\n\n## 练习\n\n1. 把「微苦」改成独立的类别维度而不是并入「苦」，排序会怎么变？这说明了什么？\n2. 给归经维度加上病位权重（如肺 1.5、膀胱 0.8），重跑麻黄查询，记录前三名的变化。\n3. 为什么不应该用欧氏距离？构造一个例子说明它在什么情况下会给出反直觉的排序。\n\n## 进阶思考\n\n编码化的第一步总是「把说明拆成维度」，第二步是「承认哪些信息在拆的过程中丢了」。第二步没人愿意写，因为它让系统看起来不如宣传的那么强——但不写，使用者就会以为它比实际更强。\n",
    "code": {
      "main.js": "'use strict';\n/**\n * 中药性能向量化：四气（有序）+ 五味（多位）+ 归经（多位） → 余弦相似度\n *\n *   node code/main.js\n *\n * 口径：\n *   气 → 一维整数（寒 -2 / 凉 -1 / 平 0 / 温 +1 / 热 +2）\n *   味 → 5 位 0/1（辛 甘 酸 苦 咸）\n *   经 → 12 位 0/1（肺 心 肝 脾 肾 胃 胆 膀胱 大肠 小肠 三焦 心包）\n *\n * 为什么气不能 one-hot：寒→凉→平→温→热 是有序的，one-hot 会把「温」与「热」的距离\n * 算得和「温」与「寒」一样远，这与临床直觉相反。\n * 为什么味/经用多位：一味药可以既辛又甘（桂枝），一条经络表也不能互斥。\n */\n\nconst WEI = ['辛', '甘', '酸', '苦', '咸'];\nconst JING = ['肺', '心', '肝', '脾', '肾', '胃', '胆', '膀胱', '大肠', '小肠', '三焦', '心包'];\nconst QI = { 寒: -2, 凉: -1, 平: 0, 温: 1, 热: 2 };\n\n// 微苦、微温这类程度词在这里被压平 —— 这是本课的已知失真，写在 docs 的「代价与边界」里。\nconst norm = (s) => s.replace(/^微/, '');\n\nfunction vec(herb) {\n  const v = [QI[herb.qi] ?? 0];\n  for (const w of WEI) v.push(herb.wei.map(norm).includes(w) ? 1 : 0);\n  for (const j of JING) v.push(herb.jing.includes(j) ? 1 : 0);\n  return v;\n}\n\nfunction cos(a, b) {\n  const dot = a.reduce((s, x, i) => s + x * b[i], 0);\n  const na = Math.sqrt(a.reduce((s, x) => s + x * x, 0));\n  const nb = Math.sqrt(b.reduce((s, x) => s + x * x, 0));\n  if (!na || !nb) return 0;\n  return +(dot / (na * nb)).toFixed(3);\n}\n\nconst HERBS = [\n  { name: '麻黄', qi: '温', wei: ['辛', '微苦'], jing: ['肺', '膀胱'] },\n  { name: '桂枝', qi: '温', wei: ['辛', '甘'], jing: ['心', '肺', '膀胱'] },\n  { name: '紫苏叶', qi: '温', wei: ['辛'], jing: ['肺', '脾'] },\n  { name: '薄荷', qi: '凉', wei: ['辛'], jing: ['肺', '肝'] },\n  { name: '石膏', qi: '寒', wei: ['辛', '甘'], jing: ['肺', '胃'] },\n];\n\n/** 以某味药为查询，按性能相似度排序（不回自己） */\nfunction neighbors(name, herbs = HERBS) {\n  const q = herbs.find((h) => h.name === name);\n  if (!q) throw new Error(`没有这味药: ${name}`);\n  const qv = vec(q);\n  return herbs\n    .filter((h) => h.name !== name)\n    .map((h) => ({ name: h.name, cos: cos(qv, vec(h)) }))\n    .sort((a, b) => b.cos - a.cos);\n}\n\nfunction main() {\n  for (const name of ['麻黄', '石膏']) {\n    console.log(`\\n查询：${name}（${HERBS.find((h) => h.name === name).qi}）`);\n    for (const n of neighbors(name)) console.log(`  ${n.name.padEnd(4, '　')} cos=${n.cos}`);\n  }\n  console.log('\\n提醒：相似 ≠ 可替换。性能向量不含剂量、炮制、毒性与配伍。');\n  console.log('本输出为教学样例，不构成用药建议。');\n}\n\nif (require.main === module) main();\nmodule.exports = { HERBS, WEI, JING, QI, vec, cos, neighbors };\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { vec, cos, neighbors, WEI, JING } = require('./main.js');\n\ntest('向量长度 = 1（气）+ 5（味）+ 12（经）', () => {\n  assert.strictEqual(vec({ qi: '温', wei: ['辛'], jing: ['肺'] }).length, 1 + WEI.length + JING.length);\n});\n\ntest('「微苦」归一到「苦」，但不会同时点亮别的味位', () => {\n  const v = vec({ qi: '温', wei: ['辛', '微苦'], jing: ['肺'] });\n  const weiPart = v.slice(1, 1 + WEI.length);\n  assert.deepStrictEqual(weiPart, [1, 0, 0, 1, 0]); // 辛=1 苦=1\n});\n\ntest('气是有序轴：温与热的距离小于温与寒', () => {\n  const a = vec({ qi: '温', wei: [], jing: [] });\n  const b = vec({ qi: '热', wei: [], jing: [] });\n  const c = vec({ qi: '寒', wei: [], jing: [] });\n  assert.ok(Math.abs(a[0] - b[0]) < Math.abs(a[0] - c[0]));\n});\n\ntest('麻黄查询：桂枝第一，石膏末位；不回自己', () => {\n  const r = neighbors('麻黄');\n  assert.strictEqual(r[0].name, '桂枝');\n  assert.strictEqual(r[r.length - 1].name, '石膏');\n  assert.ok(!r.some((x) => x.name === '麻黄'));\n});\n\ntest('零向量不产生 NaN', () => {\n  assert.strictEqual(cos([0, 0], [1, 0]), 0);\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "四气为什么适合编成一个有序整数，而五味不适合？",
          "options": [
            "因为四气只有四个值，五味有五个",
            "因为寒凉平温热存在程度顺序，五味之间是类别关系",
            "因为五味在古代文献里没有记载",
            "因为归经必须用 one-hot，五味跟着一起用"
          ],
          "correct": 1,
          "explanation": "气是有序轴（可比较远近），味是类别轴（只可比相同/不同）。"
        },
        {
          "stage": "check",
          "question": "「微苦」在本课的实现里被如何处理？",
          "options": [
            "丢弃，因为程度词不重要",
            "归一到「苦」，并记入 docs 的已知失真",
            "单独增加一个「微」维度",
            "转成浮点权重 0.5"
          ],
          "correct": 1,
          "explanation": "压平是可接受的简化，但必须写明，否则读者会以为系统保留了程度信息。"
        },
        {
          "stage": "check",
          "question": "余弦相似度高，最准确的解释是？",
          "options": [
            "两味药可以互相替代",
            "两味药的性味归经描述方向接近",
            "两味药的临床疗效相同",
            "两味药的毒性相近"
          ],
          "correct": 1,
          "explanation": "它只描述性能向量方向一致，与疗效、剂量、毒性无关。"
        },
        {
          "stage": "check",
          "question": "把 12 个归经维度等权处理，会带来什么后果？",
          "options": [
            "计算变慢",
            "等于宣称各经同等重要，与实际临床权重不符",
            "归经会互相抵消",
            "无法使用余弦相似度"
          ],
          "correct": 1,
          "explanation": "等权是一个隐含假设，必须显式说明，否则失真被藏在代码里。"
        },
        {
          "stage": "post",
          "question": "以麻黄为查询，石膏相似度为 0，主要原因是？",
          "options": [
            "石膏没有归经数据",
            "气相反（温 vs 寒）且归经重叠少，方向近乎正交",
            "石膏不是中药",
            "余弦算法在负值上失效"
          ],
          "correct": 1,
          "explanation": "气维度符号相反拉低点积，归经只重合「肺」一条。"
        },
        {
          "stage": "post",
          "question": "要让这套编码支持「找替代药」，最必要补的信息是？",
          "options": [
            "增加更多药材",
            "炮制、剂量、毒性与禁忌",
            "换用欧氏距离",
            "把归经改成 one-hot"
          ],
          "correct": 1,
          "explanation": "替代决策依赖的正是性能向量里没有的那些信息。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-xingneng-bianma.md",
        "kind": "prompt",
        "file": "departments/02-zhongyao/01-zhongyaoxue/chapters/12-xingneng-bianma/outputs/prompt-xingneng-bianma.md",
        "title": "中药性能编码器",
        "description": null,
        "chars": 722,
        "body": "# 中药性能编码器\n\n## 用途\n\n把中药材的「性味归经」文本整理成结构化记录（气/味/经三栏），用于**建库、教学演示、相似药查询的输入准备**。\n不用于开方、不用于替代药决策。\n\n## 提示词\n\n```text\n你是中药学数据整理助手。请把下面的药材条目，逐条转成结构化记录。\n\n规则：\n1. 只抽原文写到的信息。原文没有的字段写 null，不要用「一般认为」补齐。\n2. 四气只能取：寒 / 凉 / 平 / 温 / 热。带「微」字的，保留原文并另存 raw 字段（如 {\"qi\":\"温\",\"qiRaw\":\"微温\"}）。\n3. 五味只能取：辛 / 甘 / 酸 / 苦 / 咸。带「涩」「淡」的，保留在 raw 里，不并入五味。\n4. 归经按脏腑与六腑分别列出，十二经名称照抄，不合并（「肺、大肠」是两条）。\n5. 输出 JSON 数组，字段：name, qi, wei[], jing[], raw{}, source（原文所在书名与篇名）。\n\n最后单独输出一段「无法结构化」的清单：哪些条目因为表述模糊而留空，为什么。\n```\n\n## 使用示例\n\n输入：「麻黄：辛、微苦，温。归肺、膀胱经。」\n\n输出：\n\n```json\n[{\"name\":\"麻黄\",\"qi\":\"温\",\"wei\":[\"辛\",\"苦\"],\"jing\":[\"肺\",\"膀胱\"],\n  \"raw\":{\"wei\":\"辛、微苦\"},\"source\":\"《中药学》教材·解表药\"}]\n```\n\n「无法结构化」清单：本条无。若原文只写「性温，味辛」，则 jing 为 null，并列出「归经缺失」。\n\n## 为什么这样限制\n\n- 保留 raw：程度词被压平后仍可回溯，否则数据一旦入库，原始表述就再也找不回来。\n- 拒绝用常识补齐：补出来的字段无法溯源，是后续所有统计偏差的起点。\n- 单列「无法结构化」：让缺失可见。缺失被藏进 null 而不被统计，是最常见的自欺。\n"
      },
      {
        "name": "skill-xingneng-bianma.md",
        "kind": "skill",
        "file": "departments/02-zhongyao/01-zhongyaoxue/chapters/12-xingneng-bianma/outputs/skill-xingneng-bianma.md",
        "title": "xingneng-bianma",
        "description": "把中药材的性味归经整理成可计算向量，并按性能相似度给出近似药候选（只作查证线索）",
        "chars": 663,
        "body": "---\nname: xingneng-bianma\ndescription: 把中药材的性味归经整理成可计算向量，并按性能相似度给出近似药候选（只作查证线索）\nversion: 0.1.0\n---\n\n# xingneng-bianma\n\n## 何时使用\n\n- 建药材性能库，需要统一的结构化字段\n- 教学：演示「性能接近」到底是按什么算的\n- 药源短缺时，需要一份候选清单去**人工核对**，而不是直接替换\n\n## 不适用\n\n- 直接决定替代药（本技能不含剂量、炮制、毒性、禁忌、配伍）\n- 孕妇、儿童、肝肾功能不全等人群的特殊用药判断\n- 只有功效描述、没有性味归经记载的条目\n\n## 步骤\n\n1. **抽字段**：name / qi / wei / jing / raw / source，逐字取自原文。\n2. **归一**：气 → 整数（寒 -2 … 热 +2），味与经 → 0/1 多位向量；程度词存 raw。\n3. **查询**：给定一味药，算与其余药材的余弦相似度，降序输出。\n4. **加护栏**：每条结果后面附「本向量未含：剂量、炮制、毒性、配伍、禁忌」。\n5. **人工复核**：把候选清单交给药师/医师，由人决定是否可用。\n\n## 输出模板\n\n```text\n查询：<药名>（气：<…>；味：<…>；经：<…>）\n近邻：\n  1. <药名>  cos=<0.xx>  差异：气 <同/异>；味差 <…>；经差 <…>\n  2. …\n护栏：相似 ≠ 可替换；未含剂量/炮制/毒性/配伍/禁忌。\n```\n\n## 质量判据\n\n- 每条记录的 source 能指到具体书名与篇名\n- 程度词（微温、微苦）在 raw 里可查\n- 近邻列表里必须写出「差异在哪」，只给分数不算完成\n\n> 本技能输出为教学与检索辅助，不构成用药建议。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "03-zhenjiu/02-shuxue-xue/11-weixian-shendu": {
    "key": "03-zhenjiu/02-shuxue-xue/11-weixian-shendu",
    "deptSlug": "03-zhenjiu",
    "deptTitle": "针灸系",
    "subjectSlug": "02-shuxue-xue",
    "subjectTitle": "腧穴学",
    "chapterSlug": "11-weixian-shendu",
    "n": 11,
    "title": "第 11 章 · 危险穴位与针刺安全深度：把「不可深刺」变成一道可算的闸门",
    "motto": "「刺缺盆中内陷，气泄，令人喘咳逆。」——《素问·刺禁论》",
    "problem": "教材上写着「风池向鼻尖方向刺 0.8–1.2 寸，不可向内上方深刺」，你记住了这句话，却说不清「多深算深」、也说不清同一个穴位在胖人和瘦人身上为什么不是同一个数。",
    "roots": "环境逼迫(进针时没人替你算深度，手感也不可靠) + 知识积累(解剖 × 分段线性模型 = 一个按体型给上限、越界就报错的校验器)",
    "html": "<h1 id=\"第-11-章-危险穴位与针刺安全深度-把-不可深刺-变成一道可算的闸门\">第 11 章 · 危险穴位与针刺安全深度：把「不可深刺」变成一道可算的闸门</h1>\n<blockquote><p><strong>MOTTO:</strong> 「刺缺盆中内陷，气泄，令人喘咳逆。」——《素问·刺禁论》</p>\n<p><strong>PROBLEM:</strong> 教材上写着「风池向鼻尖方向刺 0.8–1.2 寸，不可向内上方深刺」，你记住了这句话，却说不清「多深算深」、也说不清同一个穴位在胖人和瘦人身上为什么不是同一个数。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(进针时没人替你算深度，手感也不可靠) + 知识积累(解剖 × 分段线性模型 = 一个按体型给上限、越界就报错的校验器)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>腧穴学</td></tr><tr><td>院系</td><td>针灸系</td></tr><tr><td>章序号</td><td>11 / 12</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>说清「安全深度」不是一个固定数字，而是由<strong>穴位局部解剖 + 体型</strong>共同决定的区间上界</li><li>用分段线性函数把 BMI 映射成软组织厚度系数，并解释为什么不用线性外推</li><li>实现一个进针前校验器：给定穴位、体型、进针方向与计划深度，返回「允许 / 警告 / 禁止」</li><li>指出这个模型在哪些情况下<strong>必须由人来否决</strong></li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"中医-刺禁的位置与方向\">中医：刺禁的位置与方向</h3>\n<p>《素问·刺禁论》把危险穴位写成后果，而不是写成数字：「刺缺盆中内陷，气泄，令人喘咳逆」「刺脊间中髓，为伛」。后世《针灸甲乙经》把这些部位逐一落到具体穴名。教材于是给出「深度 + 方向 + 禁忌」三件套，但深度给的是<strong>成人中等体型</strong>的参考值。</p>\n<p>临床上真正决定风险的是三件事：针尖到重要结构（肺、血管、脊髓、神经干）的距离、进针方向、以及病人当时的体位与呼吸时相。三件事里没有一件是「寸」能单独表达的。</p>\n<h3 id=\"ai-工程-分段线性-方向向量\">AI/工程：分段线性 + 方向向量</h3>\n<p>把安全深度写成</p>\n<span class=\"math-block\">d<sub><span class=\"math-op\">max</span></sub>(h, <span class=\"math-text\">BMI</span>) = d<sub>0</sub> · k(<span class=\"math-text\">BMI</span>)</span>\n<p><span class=\"math\">k</span> 按体型分四档：BMI &lt; 18.5 取 0.8；18.5 ≤ BMI &lt; 24 取 1.0；24 ≤ BMI &lt; 28 取 1.25；BMI ≥ 28 取 1.4。</p>\n<p>再乘方向惩罚：向内上方进针（朝颅腔/胸腔）时 <span class=\"math\">d<sub><span class=\"math-op\">max</span></sub></span> 直接置零——这不是「更深」，而是<strong>方向本身禁止</strong>。这一步是本课的重点：把「方向」从注释里提出来，变成可执行的分支。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">const POINTS = {\n  '风池': { d0: 1.0, zone: '颅颈交界', forbid: ['内上方'], vital: '椎动脉/延髓' },\n  '肺俞': { d0: 0.8, zone: '胸壁', forbid: ['向内斜刺'], vital: '胸膜/肺' },\n  '人迎': { d0: 0.3, zone: '颈动脉三角', forbid: ['直刺深刺'], vital: '颈动脉/迷走' },\n};\nfunction check(point, bmi, direction, planned) { /* 返回 {verdict, limit, reason} */ }</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：风池在 BMI 22、方向「向鼻尖」、计划 1.0 寸时返回 <code>allow</code>；同样深度改成「内上方」时返回 <code>forbid</code>，理由指向椎动脉。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>系数不是测量出来的</strong>。0.8/1.0/1.25/1.4 是按经验给的分段值，没有影像学标定。换成真实数据，这些数会变，而变的方向未知。</li><li><strong>BMI 只是体型的粗代理</strong>。同样 BMI 的两个人，颈部皮下脂肪可以差一倍；超声测软组织厚度才是正解，本课没有这个条件。</li><li><strong>不建模呼吸时相与体位</strong>。肺俞在深吸气时肺膨胀，风险高于呼气末——模型对此一无所知。</li><li><strong>它只能拦「明显越界」，拦不住「合规但出事」</strong>。允许不等于安全，这个差别必须在界面上写明，否则校验器会制造虚假的安心感。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 本章的深度系数为教学示例，不是临床操作参数，不构成针刺操作依据。任何针刺操作须由具备资质的执业医师依据解剖、影像与现场判断执行；出现气胸、血肿等并发症须立即按急症处理。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>把 BMI 分段改成连续函数（如 logistic），观察在 24 与 28 附近的行为差异，说明分段的好处。</li><li>为「肩井」补一条禁忌：为什么孕妇禁针，这个理由能否写进同一个数据结构？</li><li>如果让模型输出「建议深度区间」而不是单一上限，界面应该怎么提示，才不会被当成许可？</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>安全校验器的价值不在它拦住了多少次，而在它是否让人<strong>在进针前多看一眼方向</strong>。一个只在深度上报警、却对方向沉默的系统，会把最危险的错误留在外面。</p>",
    "markdown": "# 第 11 章 · 危险穴位与针刺安全深度：把「不可深刺」变成一道可算的闸门\n\n> **MOTTO:** 「刺缺盆中内陷，气泄，令人喘咳逆。」——《素问·刺禁论》\n>\n> **PROBLEM:** 教材上写着「风池向鼻尖方向刺 0.8–1.2 寸，不可向内上方深刺」，你记住了这句话，却说不清「多深算深」、也说不清同一个穴位在胖人和瘦人身上为什么不是同一个数。\n>\n> **双根因定位:** 环境逼迫(进针时没人替你算深度，手感也不可靠) + 知识积累(解剖 × 分段线性模型 = 一个按体型给上限、越界就报错的校验器)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 腧穴学 |\n| 院系 | 针灸系 |\n| 章序号 | 11 / 12 |\n| 所属阶段 | 🌿 长·积累 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 3 小时 |\n\n## 学习目标\n\n- 说清「安全深度」不是一个固定数字，而是由**穴位局部解剖 + 体型**共同决定的区间上界\n- 用分段线性函数把 BMI 映射成软组织厚度系数，并解释为什么不用线性外推\n- 实现一个进针前校验器：给定穴位、体型、进针方向与计划深度，返回「允许 / 警告 / 禁止」\n- 指出这个模型在哪些情况下**必须由人来否决**\n\n## 核心概念\n\n### 中医：刺禁的位置与方向\n\n《素问·刺禁论》把危险穴位写成后果，而不是写成数字：「刺缺盆中内陷，气泄，令人喘咳逆」「刺脊间中髓，为伛」。后世《针灸甲乙经》把这些部位逐一落到具体穴名。教材于是给出「深度 + 方向 + 禁忌」三件套，但深度给的是**成人中等体型**的参考值。\n\n临床上真正决定风险的是三件事：针尖到重要结构（肺、血管、脊髓、神经干）的距离、进针方向、以及病人当时的体位与呼吸时相。三件事里没有一件是「寸」能单独表达的。\n\n### AI/工程：分段线性 + 方向向量\n\n把安全深度写成\n\n$$d_{\\max}(h, \\text{BMI}) = d_0 \\cdot k(\\text{BMI})$$\n\n$k$ 按体型分四档：BMI < 18.5 取 0.8；18.5 ≤ BMI < 24 取 1.0；24 ≤ BMI < 28 取 1.25；BMI ≥ 28 取 1.4。\n\n再乘方向惩罚：向内上方进针（朝颅腔/胸腔）时 $d_{\\max}$ 直接置零——这不是「更深」，而是**方向本身禁止**。这一步是本课的重点：把「方向」从注释里提出来，变成可执行的分支。\n\n## BUILD IT：从零实现\n\n```js\nconst POINTS = {\n  '风池': { d0: 1.0, zone: '颅颈交界', forbid: ['内上方'], vital: '椎动脉/延髓' },\n  '肺俞': { d0: 0.8, zone: '胸壁', forbid: ['向内斜刺'], vital: '胸膜/肺' },\n  '人迎': { d0: 0.3, zone: '颈动脉三角', forbid: ['直刺深刺'], vital: '颈动脉/迷走' },\n};\nfunction check(point, bmi, direction, planned) { /* 返回 {verdict, limit, reason} */ }\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：风池在 BMI 22、方向「向鼻尖」、计划 1.0 寸时返回 `allow`；同样深度改成「内上方」时返回 `forbid`，理由指向椎动脉。\n\n## 代价与边界\n\n- **系数不是测量出来的**。0.8/1.0/1.25/1.4 是按经验给的分段值，没有影像学标定。换成真实数据，这些数会变，而变的方向未知。\n- **BMI 只是体型的粗代理**。同样 BMI 的两个人，颈部皮下脂肪可以差一倍；超声测软组织厚度才是正解，本课没有这个条件。\n- **不建模呼吸时相与体位**。肺俞在深吸气时肺膨胀，风险高于呼气末——模型对此一无所知。\n- **它只能拦「明显越界」，拦不住「合规但出事」**。允许不等于安全，这个差别必须在界面上写明，否则校验器会制造虚假的安心感。\n\n> **免责声明：** 本章的深度系数为教学示例，不是临床操作参数，不构成针刺操作依据。任何针刺操作须由具备资质的执业医师依据解剖、影像与现场判断执行；出现气胸、血肿等并发症须立即按急症处理。\n\n## 练习\n\n1. 把 BMI 分段改成连续函数（如 logistic），观察在 24 与 28 附近的行为差异，说明分段的好处。\n2. 为「肩井」补一条禁忌：为什么孕妇禁针，这个理由能否写进同一个数据结构？\n3. 如果让模型输出「建议深度区间」而不是单一上限，界面应该怎么提示，才不会被当成许可？\n\n## 进阶思考\n\n安全校验器的价值不在它拦住了多少次，而在它是否让人**在进针前多看一眼方向**。一个只在深度上报警、却对方向沉默的系统，会把最危险的错误留在外面。\n",
    "code": {
      "main.js": "'use strict';\n/**\n * 危险穴位进针校验：安全深度上限 + 方向禁令\n *\n *   node code/main.js\n *\n * 口径：\n *   limit = d0 × k(BMI)       —— d0 是教材给中等体型的参考深度（寸）\n *   方向命中 forbid 列表      —— 直接 forbid，不参与深度比较（方向不是\"更深\"）\n *   判定：allow / warn(>80% limit) / forbid(超过 limit)\n *\n * 这是教学模型：系数按经验分段，未做影像学标定。\n */\n\nconst POINTS = {\n  风池: { d0: 1.0, zone: '颅颈交界', forbid: ['内上方', '直刺深刺'], vital: '椎动脉 / 延髓' },\n  肺俞: { d0: 0.8, zone: '胸壁', forbid: ['向内斜刺'], vital: '胸膜 / 肺' },\n  人迎: { d0: 0.3, zone: '颈动脉三角', forbid: ['直刺深刺'], vital: '颈动脉 / 迷走神经' },\n  肩井: { d0: 0.5, zone: '肩胛上', forbid: ['直刺深刺'], vital: '肺尖' },\n};\n\nfunction kOf(bmi) {\n  if (bmi < 18.5) return 0.8;\n  if (bmi < 24) return 1.0;\n  if (bmi < 28) return 1.25;\n  return 1.4;\n}\n\nfunction limitOf(point, bmi) {\n  const p = POINTS[point];\n  if (!p) throw new Error(`未收录穴位: ${point}`);\n  return +(p.d0 * kOf(bmi)).toFixed(2);\n}\n\nfunction check(point, bmi, direction, planned) {\n  const p = POINTS[point];\n  if (!p) throw new Error(`未收录穴位: ${point}`);\n  const limit = limitOf(point, bmi);\n\n  if (p.forbid.some((f) => direction.includes(f))) {\n    return {\n      verdict: 'forbid',\n      limit,\n      reason: `方向「${direction}」属禁用方向，可能伤及${p.vital}；深度再浅也不能抵消方向风险`,\n    };\n  }\n  if (planned > limit) {\n    return { verdict: 'forbid', limit, reason: `计划 ${planned} 寸超过上限 ${limit} 寸（${p.zone}）` };\n  }\n  if (planned > limit * 0.8) {\n    return { verdict: 'warn', limit, reason: `已用 ${(planned / limit * 100).toFixed(0)}% 上限，留出余量` };\n  }\n  return { verdict: 'allow', limit, reason: `在 ${limit} 寸上限内` };\n}\n\nfunction main() {\n  const cases = [\n    ['风池', 22, '向鼻尖', 1.0],\n    ['风池', 22, '向内上方', 1.0],\n    ['风池', 30, '向鼻尖', 1.3],\n    ['肺俞', 22, '向内斜刺', 0.6],\n    ['人迎', 25, '直刺', 0.2],\n  ];\n  for (const [pt, bmi, dir, d] of cases) {\n    const r = check(pt, bmi, dir, d);\n    console.log(`${pt} BMI=${bmi} 方向=${dir} 计划=${d}寸 → ${r.verdict.toUpperCase()}（上限 ${r.limit}）`);\n    console.log(`   ${r.reason}`);\n  }\n  console.log('\\n本输出为教学样例，不构成操作参数；实际进针须由执业医师判断。');\n}\n\nif (require.main === module) main();\nmodule.exports = { POINTS, kOf, limitOf, check };\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { kOf, limitOf, check } = require('./main.js');\n\ntest('BMI 分段：四档系数单调不减', () => {\n  const ks = [18, 22, 26, 32].map(kOf);\n  assert.deepStrictEqual(ks, [0.8, 1.0, 1.25, 1.4]);\n  for (let i = 1; i < ks.length; i += 1) assert.ok(ks[i] >= ks[i - 1]);\n});\n\ntest('安全深度上限随 BMI 增大', () => {\n  assert.ok(limitOf('风池', 30) > limitOf('风池', 20));\n  assert.strictEqual(limitOf('人迎', 22), 0.3);\n});\n\ntest('禁用方向：无论多浅都 forbid，且理由指向重要结构', () => {\n  const r = check('风池', 22, '向内上方', 0.3);\n  assert.strictEqual(r.verdict, 'forbid');\n  assert.match(r.reason, /椎动脉|延髓/);\n});\n\ntest('超过上限：forbid 并报出上限', () => {\n  const r = check('风池', 22, '向鼻尖', 1.5);\n  assert.strictEqual(r.verdict, 'forbid');\n  assert.match(r.reason, /1(\\.00)? 寸/);\n});\n\ntest('接近上限（>80%）：warn 而不是 allow', () => {\n  assert.strictEqual(check('风池', 22, '向鼻尖', 0.9).verdict, 'warn');\n  assert.strictEqual(check('风池', 22, '向鼻尖', 0.5).verdict, 'allow');\n});\n\ntest('未收录穴位必须抛错，不许静默放过', () => {\n  assert.throws(() => check('不存在的穴', 22, '直刺', 0.5), /未收录穴位/);\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "教材给出的针刺深度（如「0.8–1.2 寸」）默认对应的人群是？",
          "options": [
            "所有成人",
            "成人中等体型",
            "儿童",
            "按体重逐人换算后的个体值"
          ],
          "correct": 1,
          "explanation": "教材深度是中等体型的参考值，个体差异没有被写进那个数字里。"
        },
        {
          "stage": "check",
          "question": "为什么「方向禁令」要单独判，而不并进深度上限？",
          "options": [
            "因为方向无法计算",
            "因为朝危险方向的浅刺同样有风险，方向不是「更深」的问题",
            "因为方向只影响进针疼痛",
            "因为教材没有规定方向"
          ],
          "correct": 1,
          "explanation": "向内上方刺风池，0.5 寸也可能伤及椎动脉；把方向折算成深度会漏掉这类风险。"
        },
        {
          "stage": "check",
          "question": "本课用分段常数 k(BMI) 而不是连续函数，主要理由是？",
          "options": [
            "分段常数更精确",
            "现有证据只支持「大概几档」，连续函数会伪造精度",
            "连续函数算不出来",
            "分段常数更快"
          ],
          "correct": 1,
          "explanation": "没有标定数据时，声称连续关系等于编造细节。"
        },
        {
          "stage": "check",
          "question": "计划深度达到上限的 85% 时，输出应是？",
          "options": [
            "allow，因为没超",
            "warn，提示余量不足",
            "forbid，直接拒绝",
            "不输出，交给操作者判断"
          ],
          "correct": 1,
          "explanation": "留余量是针刺安全的基本习惯；warn 让操作者重新确认而不是默认通过。"
        },
        {
          "stage": "post",
          "question": "校验器返回 allow，意味着？",
          "options": [
            "操作一定安全",
            "在模型已知的维度内没有越界，未知维度（呼吸时相、体位、个体解剖）仍需人判断",
            "可以加大深度",
            "可以省略消毒"
          ],
          "correct": 1,
          "explanation": "allow 只覆盖模型建过的维度，不能读成安全承诺。"
        },
        {
          "stage": "post",
          "question": "要真正提高这套模型的可信度，最该补的是？",
          "options": [
            "更多穴位",
            "影像学测得的软组织厚度与并发症登记数据",
            "更漂亮的界面",
            "更多的分段档位"
          ],
          "correct": 1,
          "explanation": "系数目前是经验值；没有实测与并发症数据，任何细分都只是换一种猜法。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-weixian-shendu.md",
        "kind": "prompt",
        "file": "departments/03-zhenjiu/02-shuxue-xue/chapters/11-weixian-shendu/outputs/prompt-weixian-shendu.md",
        "title": "进针前安全复核单",
        "description": null,
        "chars": 705,
        "body": "# 进针前安全复核单\n\n## 用途\n\n进针前 30 秒的复核：把「穴位 + 体型 + 方向 + 计划深度」四项写下来，得到一条明确的允许/警告/禁止结论，\n用于**带教复核、病例讨论、操作记录归档**，不用于替代现场判断。\n\n## 提示词\n\n```text\n你是针灸科的带教助手。下面是一次进针前的记录。请只做复核，不要给治疗建议。\n\n输入字段：穴位、身高体重（或 BMI）、进针方向（解剖方位，如「向鼻尖」「向内上方」）、计划深度（寸）、体位、患者特殊情况（孕、抗凝、气胸史等）。\n\n规则：\n1. 先判方向：若方向指向颅腔、胸腔、大血管或神经干走行区，直接判「禁止」，并写明可能伤及的结构。深度不再作为理由。\n2. 再判深度：给出该体型下的上限，并说明这个上限是教材参考值还是个体测量值。若为参考值，必须注明。\n3. 特殊情况一票否决：抗凝、肺大疱、妊娠、既往气胸等，即使方向深度都合规，也判「需上级医师决定」。\n4. 输出必须包含一句「允许不等于安全」的提示，说明模型不知道哪些信息。\n\n输出格式：\n【结论】允许 / 警告 / 禁止 / 需上级决定\n【依据】方向：… ；深度：… 寸（上限 … 寸，来源：…）\n【未知项】…\n```\n\n## 使用示例\n\n输入：风池，BMI 22，向鼻尖，1.0 寸，坐位，无特殊情况。\n\n输出：【结论】允许【依据】方向安全；上限 1.0 寸（教材参考值 × 中等体型系数 1.0），计划 1.0 寸已达上限 —— 应改判**警告**，\n因为「等于上限」没有余量。【未知项】椎动脉走行变异、呼吸时相。\n\n## 为什么这样限制\n\n- 方向优先：把最危险的错误放在第一道闸门，避免被「深度合规」掩盖。\n- 区分参考值与实测值：不区分，使用者会把教材数字当成个体参数。\n- 特殊情况一票否决：模型没有能力处理这些例外，交给人是最诚实的处理。\n"
      },
      {
        "name": "skill-weixian-shendu.md",
        "kind": "skill",
        "file": "departments/03-zhenjiu/02-shuxue-xue/chapters/11-weixian-shendu/outputs/skill-weixian-shendu.md",
        "title": "weixian-shendu",
        "description": "进针前的安全深度与方向复核：给出允许/警告/禁止/需上级决定，并列出模型未知项",
        "chars": 683,
        "body": "---\nname: weixian-shendu\ndescription: 进针前的安全深度与方向复核：给出允许/警告/禁止/需上级决定，并列出模型未知项\nversion: 0.1.0\n---\n\n# weixian-shendu\n\n## 何时使用\n\n- 带教时，学生第一次独立处理风池、肺俞、人迎、肩井等危险穴位\n- 病例讨论需要把「为什么这个深度不能刺」写成可复述的依据\n- 操作记录里需要留一条安全复核痕迹\n\n## 不适用\n\n- 决定治疗方案（本技能不做治疗建议）\n- 婴幼儿、极度消瘦或肥胖者的个体化深度（需要影像测量）\n- 抗凝、肺大疱、妊娠等特殊人群的最终决定（必须上级医师）\n\n## 步骤\n\n1. **填四要素**：穴位、体型（BMI 或身高体重）、方向、计划深度。\n2. **方向闸门**：方向指向颅腔/胸腔/大血管/神经干 → 直接「禁止」，不受深度影响。\n3. **深度闸门**：上限 = 教材参考深度 × 体型系数；达到 80% 报「警告」，超过报「禁止」。\n4. **特殊人群**：命中任一特殊情况 → 「需上级决定」（一票否决）。\n5. **写未知项**：列出模型不知道的东西（解剖变异、呼吸时相、体位、既往并发症）。\n\n## 输出模板\n\n```text\n【结论】允许 / 警告 / 禁止 / 需上级决定\n【依据】\n  方向：<安全 / 命中禁令：…>\n  深度：计划 <..> 寸，上限 <..> 寸（来源：教材参考 × 体型系数 <..>）\n  特殊：<无 / …>\n【未知项】…\n【提示】允许不等于安全。\n```\n\n## 质量判据\n\n- 「禁止」的理由必须写出可能伤及的结构\n- 「允许」必须同时出现「允许不等于安全」的提示\n- 上限来源必须标注「教材参考值」或「实测值」，不得含糊\n\n> 本技能输出为教学与复核辅助，不构成操作参数或诊疗建议。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "04-gushang/06-zhongyi-zhenggu-xue/12-shoufa-jianmo": {
    "key": "04-gushang/06-zhongyi-zhenggu-xue/12-shoufa-jianmo",
    "deptSlug": "04-gushang",
    "deptTitle": "骨伤系",
    "subjectSlug": "06-zhongyi-zhenggu-xue",
    "subjectTitle": "中医正骨学",
    "chapterSlug": "12-shoufa-jianmo",
    "n": 12,
    "title": "第 12 章 · 正骨手法的力学建模：把「巧劲」拆成力、力臂与阈值",
    "motto": "「手法者，诚正骨之首务哉。」——《医宗金鉴·正骨心法要旨》",
    "problem": "老师傅说「用力要巧，不要用蛮力」，你点头，但轮到你上手，要么拔不开，要么一下用力过猛病人喊疼——你并不知道「巧」在数值上对应什么。",
    "roots": "环境逼迫(复位窗口只有几分钟，反复试错会加重软组织损伤) + 知识积累(骨伤手法 × 力矩模型 = 一组能预先算出、事后复核的力学参数)",
    "html": "<h1 id=\"第-12-章-正骨手法的力学建模-把-巧劲-拆成力-力臂与阈值\">第 12 章 · 正骨手法的力学建模：把「巧劲」拆成力、力臂与阈值</h1>\n<blockquote><p><strong>MOTTO:</strong> 「手法者，诚正骨之首务哉。」——《医宗金鉴·正骨心法要旨》</p>\n<p><strong>PROBLEM:</strong> 老师傅说「用力要巧，不要用蛮力」，你点头，但轮到你上手，要么拔不开，要么一下用力过猛病人喊疼——你并不知道「巧」在数值上对应什么。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(复位窗口只有几分钟，反复试错会加重软组织损伤) + 知识积累(骨伤手法 × 力矩模型 = 一组能预先算出、事后复核的力学参数)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>中医正骨学</td></tr><tr><td>院系</td><td>骨伤系</td></tr><tr><td>章序号</td><td>12 / 12</td></tr><tr><td>所属阶段</td><td>🌳 壮·鼎盛</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>4 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>把「拔伸牵引」写成力与力臂的乘积关系，并说清每个量的物理单位</li><li>用体重估算所需牵引力，并给出一个<strong>保守上限</strong>，超过就报警</li><li>区分「力足够」与「力安全」：为什么这两件事在正骨里经常冲突</li><li>用模型解释：为什么同样的骨折，瘦人需要的力更小、但安全余量也更小</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"中医-正骨手法的四要素\">中医：正骨手法的四要素</h3>\n<p>《医宗金鉴·正骨心法要旨》把手法分为摸、接、端、提、推、拿、按、摩，并强调「法之所施，使患者不知其苦」。这句话在力学上是有含义的：<strong>在病人感到剧痛之前完成复位</strong>，靠的是力作用在正确的支点与方向上，而不是更大的力。</p>\n<p>教材讲「拔伸牵引、端提挤按、旋转屈伸」，每一条都隐含一个力臂：手放在哪里，决定了同样的力产生多大的力矩。手位错一寸，力矩就差一截——这是「巧劲」的物理内容。</p>\n<h3 id=\"ai-工程-力矩与安全阈值\">AI/工程：力矩与安全阈值</h3>\n<span class=\"math-block\">M = F · d,   F<sub><span class=\"math-text\">need</span></sub> ≈ α · W</span>\n<p>其中 <span class=\"math\">W</span> 为体重，<span class=\"math\">α</span> 为肌张力系数（上肢 0.06–0.10、下肢 0.12–0.18，随肌肉发达程度与是否麻醉变化）。安全判据不是 <span class=\"math\">F<sub><span class=\"math-text\">need</span></sub></span> 本身，而是</p>\n<span class=\"math-block\"><span class=\"frac\"><span class=\"frac-num\">F<sub><span class=\"math-text\">applied</span></sub></span><span class=\"frac-den\">F<sub><span class=\"math-text\">need</span></sub></span></span> ∈ [1.0, 1.3]</span>\n<p>超过 1.3 视为「力过量」：骨折端可能被过度牵开，软组织与血管神经承受额外剪切。这个区间是本课最需要被质疑的地方——它不是测量结果，而是教学用的保守带。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">const ALPHA = { 上肢: [0.06, 0.10], 下肢: [0.12, 0.18] };\nfunction needForce(weightKg, part, muscular = false) { /* 取区间上沿 × 1.15（肌肉发达） */ }\nfunction assess(applied, weightKg, part, leverCm) {\n  // 返回 {need, ratio, moment, verdict}\n}</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：60 kg 成人前臂骨折按上肢系数算得需 6.0 kgf；施加 7 kgf 时 ratio≈1.17 判 <code>ok</code>，施加 8 kgf 时 ratio≈1.33 判 <code>over</code>；肌肉发达者需求自动上浮到 6.9 kgf。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>α 是区间估计，不是个体测量</strong>。肌肉发达、痉挛、麻醉状态都会让它偏移，模型只按「是否肌肉发达」给了一个 1.15 的修正，粗得可笑——但它比「凭手感」可复核。</li><li><strong>力臂取值依赖手位，而手位在体表</strong>。同样放在前臂中段，胖人与瘦人的实际骨性力臂差 2–3 cm，模型无法知道。</li><li><strong>模型不含骨折类型</strong>。横断、斜形、螺旋、粉碎所需牵引力差异很大，本课统一用一个系数，这是明显的过度简化。</li><li><strong>它不能判断复位是否成功</strong>。力学合规 ≠ 对位良好，后者只能靠影像。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 本章的系数与阈值均为教学示例，不构成临床操作参数。正骨复位须由具备资质的医师在影像评估与充分镇痛下实施；血管神经损伤、开放性骨折、病理性骨折须按急症处理。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>把 α 改成按体重分档（如 &lt;50 kg、50–75 kg、&gt;75 kg），观察 60 kg 边界附近的跳变，说明分段的风险。</li><li>若病人处于麻醉状态，α 应上调还是下调？给出理由并改代码。</li><li>为「力臂」增加一个由 BMI 推算的修正项，评估它是否让模型更可信，还是只是更复杂。</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>手法的「巧」常被描述成不可言传的东西。一旦拆成力、力臂与阈值，会发现它大部分是可教的——剩下那一小部分（时机、病人反应、手感反馈）才是真正需要师徒相授的。承认这个比例，比笼统说「只能意会」更有用。</p>",
    "markdown": "# 第 12 章 · 正骨手法的力学建模：把「巧劲」拆成力、力臂与阈值\n\n> **MOTTO:** 「手法者，诚正骨之首务哉。」——《医宗金鉴·正骨心法要旨》\n>\n> **PROBLEM:** 老师傅说「用力要巧，不要用蛮力」，你点头，但轮到你上手，要么拔不开，要么一下用力过猛病人喊疼——你并不知道「巧」在数值上对应什么。\n>\n> **双根因定位:** 环境逼迫(复位窗口只有几分钟，反复试错会加重软组织损伤) + 知识积累(骨伤手法 × 力矩模型 = 一组能预先算出、事后复核的力学参数)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 中医正骨学 |\n| 院系 | 骨伤系 |\n| 章序号 | 12 / 12 |\n| 所属阶段 | 🌳 壮·鼎盛 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 4 小时 |\n\n## 学习目标\n\n- 把「拔伸牵引」写成力与力臂的乘积关系，并说清每个量的物理单位\n- 用体重估算所需牵引力，并给出一个**保守上限**，超过就报警\n- 区分「力足够」与「力安全」：为什么这两件事在正骨里经常冲突\n- 用模型解释：为什么同样的骨折，瘦人需要的力更小、但安全余量也更小\n\n## 核心概念\n\n### 中医：正骨手法的四要素\n\n《医宗金鉴·正骨心法要旨》把手法分为摸、接、端、提、推、拿、按、摩，并强调「法之所施，使患者不知其苦」。这句话在力学上是有含义的：**在病人感到剧痛之前完成复位**，靠的是力作用在正确的支点与方向上，而不是更大的力。\n\n教材讲「拔伸牵引、端提挤按、旋转屈伸」，每一条都隐含一个力臂：手放在哪里，决定了同样的力产生多大的力矩。手位错一寸，力矩就差一截——这是「巧劲」的物理内容。\n\n### AI/工程：力矩与安全阈值\n\n$$M = F \\cdot d,\\qquad F_{\\text{need}} \\approx \\alpha \\cdot W$$\n\n其中 $W$ 为体重，$\\alpha$ 为肌张力系数（上肢 0.06–0.10、下肢 0.12–0.18，随肌肉发达程度与是否麻醉变化）。安全判据不是 $F_{\\text{need}}$ 本身，而是\n\n$$\\frac{F_{\\text{applied}}}{F_{\\text{need}}} \\in [1.0,\\ 1.3]$$\n\n超过 1.3 视为「力过量」：骨折端可能被过度牵开，软组织与血管神经承受额外剪切。这个区间是本课最需要被质疑的地方——它不是测量结果，而是教学用的保守带。\n\n## BUILD IT：从零实现\n\n```js\nconst ALPHA = { 上肢: [0.06, 0.10], 下肢: [0.12, 0.18] };\nfunction needForce(weightKg, part, muscular = false) { /* 取区间上沿 × 1.15（肌肉发达） */ }\nfunction assess(applied, weightKg, part, leverCm) {\n  // 返回 {need, ratio, moment, verdict}\n}\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：60 kg 成人前臂骨折按上肢系数算得需 6.0 kgf；施加 7 kgf 时 ratio≈1.17 判 `ok`，施加 8 kgf 时 ratio≈1.33 判 `over`；肌肉发达者需求自动上浮到 6.9 kgf。\n\n## 代价与边界\n\n- **α 是区间估计，不是个体测量**。肌肉发达、痉挛、麻醉状态都会让它偏移，模型只按「是否肌肉发达」给了一个 1.15 的修正，粗得可笑——但它比「凭手感」可复核。\n- **力臂取值依赖手位，而手位在体表**。同样放在前臂中段，胖人与瘦人的实际骨性力臂差 2–3 cm，模型无法知道。\n- **模型不含骨折类型**。横断、斜形、螺旋、粉碎所需牵引力差异很大，本课统一用一个系数，这是明显的过度简化。\n- **它不能判断复位是否成功**。力学合规 ≠ 对位良好，后者只能靠影像。\n\n> **免责声明：** 本章的系数与阈值均为教学示例，不构成临床操作参数。正骨复位须由具备资质的医师在影像评估与充分镇痛下实施；血管神经损伤、开放性骨折、病理性骨折须按急症处理。\n\n## 练习\n\n1. 把 α 改成按体重分档（如 <50 kg、50–75 kg、>75 kg），观察 60 kg 边界附近的跳变，说明分段的风险。\n2. 若病人处于麻醉状态，α 应上调还是下调？给出理由并改代码。\n3. 为「力臂」增加一个由 BMI 推算的修正项，评估它是否让模型更可信，还是只是更复杂。\n\n## 进阶思考\n\n手法的「巧」常被描述成不可言传的东西。一旦拆成力、力臂与阈值，会发现它大部分是可教的——剩下那一小部分（时机、病人反应、手感反馈）才是真正需要师徒相授的。承认这个比例，比笼统说「只能意会」更有用。\n",
    "code": {
      "main.js": "'use strict';\n/**\n * 正骨手法的力学估算：所需牵引力、安全的力区间、以及力矩\n *\n *   node code/main.js\n *\n * 口径：\n *   need  = α(部位)·W·1.15（肌肉发达时）   —— kgf\n *   ratio = applied / need                  —— 合规区间 [1.0, 1.3]\n *   M     = applied · lever(m)              —— kgf·m，用于比较手位差异\n *\n * α 是区间估计，不是个体测量；阈值是教学保守带，不是临床标准。\n */\n\nconst ALPHA = {\n  上肢: [0.06, 0.1],\n  下肢: [0.12, 0.18],\n};\n\nconst RATIO_MIN = 1.0;\nconst RATIO_MAX = 1.3;\nconst MUSCULAR_GAIN = 1.15;\n\nfunction needForce(weightKg, part, muscular = false) {\n  const a = ALPHA[part];\n  if (!a) throw new Error(`未知部位: ${part}（只支持上肢/下肢）`);\n  // 取区间上沿：宁可高估需求量，让\"施加不足\"暴露出来，而不是掩盖\n  const base = a[1] * weightKg;\n  return +(base * (muscular ? MUSCULAR_GAIN : 1)).toFixed(2);\n}\n\nfunction assess(applied, weightKg, part, leverCm, muscular = false) {\n  const need = needForce(weightKg, part, muscular);\n  const ratio = +(applied / need).toFixed(2);\n  const moment = +((applied * leverCm) / 100).toFixed(2);\n  let verdict;\n  if (ratio < RATIO_MIN) verdict = 'under';\n  else if (ratio > RATIO_MAX) verdict = 'over';\n  else verdict = 'ok';\n  return { need, ratio, moment, verdict };\n}\n\nconst VERDICT_ZH = { under: '牵引不足', ok: '区间内', over: '力过量' };\n\nfunction main() {\n  const cases = [\n    [6.9, 60, '上肢', 12],\n    [8, 60, '上肢', 12],\n    [12, 60, '上肢', 12],\n    [14, 70, '下肢', 20, true],\n  ];\n  for (const [applied, w, part, lever, mus] of cases) {\n    const r = assess(applied, w, part, lever, !!mus);\n    console.log(\n      `${w}kg ${part}${mus ? '（肌肉发达）' : ''}：需 ${r.need} kgf，施加 ${applied} kgf`,\n    );\n    console.log(`  ratio=${r.ratio} → ${VERDICT_ZH[r.verdict]}；力矩 ${r.moment} kgf·m（力臂 ${lever} cm）`);\n  }\n  console.log('\\n本输出为教学样例，不构成临床操作参数。');\n}\n\nif (require.main === module) main();\nmodule.exports = { ALPHA, needForce, assess, RATIO_MIN, RATIO_MAX };\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { needForce, assess, RATIO_MAX } = require('./main.js');\n\ntest('所需牵引力随体重线性增长', () => {\n  assert.ok(needForce(70, '上肢') > needForce(60, '上肢'));\n  assert.strictEqual(needForce(60, '上肢'), 6); // 0.10 × 60\n});\n\ntest('下肢系数大于上肢：同体重下需要更大的力', () => {\n  assert.ok(needForce(60, '下肢') > needForce(60, '上肢'));\n});\n\ntest('肌肉发达者需求上调 15%', () => {\n  assert.strictEqual(needForce(60, '上肢', true), 6.9);\n});\n\ntest('ratio 落在 [1.0, 1.3] 判 ok，超出判 over', () => {\n  assert.strictEqual(assess(6, 60, '上肢', 12).verdict, 'ok');\n  assert.strictEqual(assess(7.8, 60, '上肢', 12).verdict, 'ok');\n  assert.strictEqual(assess(12, 60, '上肢', 12).verdict, 'over');\n  assert.strictEqual(assess(4, 60, '上肢', 12).verdict, 'under');\n});\n\ntest('力矩随手位（力臂）线性变化，力不变时手位越远力矩越大', () => {\n  const near = assess(8, 60, '上肢', 8);\n  const far = assess(8, 60, '上肢', 16);\n  assert.strictEqual(near.ratio, far.ratio); // 力没变\n  assert.ok(far.moment > near.moment);\n});\n\ntest('未知部位抛错，不许默认成上肢', () => {\n  assert.throws(() => needForce(60, '躯干'), /未知部位/);\n});\n\ntest('边界：恰好在 1.3 倍时仍判 ok（闭区间）', () => {\n  const need = needForce(60, '上肢');\n  const r = assess(need * RATIO_MAX, 60, '上肢', 10);\n  assert.strictEqual(r.verdict, 'ok');\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "《医宗金鉴》说手法要「使患者不知其苦」，这句话在力学上对应的是？",
          "options": [
            "用足够大的力快速完成",
            "在正确的支点与方向上用力，避免以力代巧",
            "先麻醉再复位",
            "手法越快越好"
          ],
          "correct": 1,
          "explanation": "手位决定力臂，方向决定剪切；「不知其苦」靠的是力学正确而非力大。"
        },
        {
          "stage": "check",
          "question": "本课中 ratio = applied / need 的合规区间是？",
          "options": [
            "0 — 1.0",
            "1.0 — 1.3（闭区间）",
            "1.3 — 2.0",
            "越大越好"
          ],
          "correct": 1,
          "explanation": "低于 1.0 牵引不足，高于 1.3 视为力过量（可能过度牵开）。"
        },
        {
          "stage": "check",
          "question": "为什么 need 取 α 区间的上沿？",
          "options": [
            "为了保守，宁可高估需求让「施加不足」暴露出来",
            "因为下沿没有意义",
            "因为上沿更容易计算",
            "因为教材只给了上沿"
          ],
          "correct": 0,
          "explanation": "高估需求会让不足的力被判为 under，避免虚假的「够了」。"
        },
        {
          "stage": "check",
          "question": "同样施加 8 kgf，把力臂从 8 cm 移到 16 cm，会发生什么？",
          "options": [
            "ratio 翻倍",
            "ratio 不变，力矩翻倍",
            "都翻倍",
            "都不变"
          ],
          "correct": 1,
          "explanation": "力没变，比值不变；力矩 M=F·d 与力臂成正比 —— 这正是手位的意义。"
        },
        {
          "stage": "post",
          "question": "模型判 ok，能否说明复位会成功？",
          "options": [
            "能，力学合规即成功",
            "不能，对位情况只能靠影像判断",
            "能，只要比例在区间内",
            "取决于体重"
          ],
          "correct": 1,
          "explanation": "力学合规与解剖对位是两件事，模型只管前者。"
        },
        {
          "stage": "post",
          "question": "本课最大的过度简化是？",
          "options": [
            "使用了公斤力单位",
            "不含骨折类型（横断/斜形/粉碎）对所需牵引力的差异",
            "没有给出力矩方向",
            "只做了上肢与下肢两类"
          ],
          "correct": 1,
          "explanation": "骨折类型对牵引需求影响很大，统一系数是本课明确标注的简化。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-shoufa-jianmo.md",
        "kind": "prompt",
        "file": "departments/04-gushang/06-zhongyi-zhenggu-xue/chapters/12-shoufa-jianmo/outputs/prompt-shoufa-jianmo.md",
        "title": "正骨手法力学预演",
        "description": null,
        "chars": 764,
        "body": "# 正骨手法力学预演\n\n## 用途\n\n复位前把「体重、部位、手位、计划用力」写下来，算出所需牵引力、力区间与力矩，\n用于**带教预演、病例复盘、手法教学对比**，不用于替代术中的手感判断。\n\n## 提示词\n\n```text\n你是骨伤科的力学助教。给定一次正骨复位的计划，请做力学预演，不要给治疗建议。\n\n输入：体重(kg)、部位（上肢/下肢）、是否肌肉发达、麻醉状态、手位（距骨折端 cm）、计划施加力(kgf)、骨折类型。\n\n规则：\n1. 先算所需力：α(部位) 区间上沿 × 体重，肌肉发达者 ×1.15，麻醉状态另注明「需求下降，需下调」。\n2. 再算比值：applied / need，落在 [1.0, 1.3] 才叫「区间内」；<1.0 叫牵引不足，>1.3 叫力过量。\n3. 力矩 = applied × 手位(m)。手位变化时，必须重新报力矩，不能只报力。\n4. 骨折类型（横断/斜形/螺旋/粉碎）只作提示：模型不区分它们，必须由人判断这条简化是否可接受。\n5. 输出必须有一句「力学合规不等于对位良好，对位须由影像确认」。\n\n输出格式：\n【数值】need=… kgf；applied=… kgf；ratio=…；M=… kgf·m\n【判定】不足 / 区间内 / 过量\n【简化风险】…\n```\n\n## 使用示例\n\n输入：60 kg，上肢，无肌肉发达，无麻醉，手位 12 cm，计划 8 kgf，横断骨折。\n\n输出：【数值】need=6.0；applied=8.0；ratio=1.33；M=0.96 kgf·m【判定】过量（略超 1.3）\n【简化风险】横断骨折通常需要的牵引力小于斜形，本例按统一系数算可能高估了需求；先降到 7 kgf 再评估。\n\n## 为什么这样限制\n\n- 强制报力矩：只报力会掩盖手位错误，而手位是「巧劲」的主要来源。\n- 骨折类型单列为风险：模型不建模，就必须显式承认，否则使用者以为它考虑了。\n- 加入「影像确认」一句：力学预演最容易被误读成「复位成功」。\n"
      },
      {
        "name": "skill-shoufa-jianmo.md",
        "kind": "skill",
        "file": "departments/04-gushang/06-zhongyi-zhenggu-xue/chapters/12-shoufa-jianmo/outputs/skill-shoufa-jianmo.md",
        "title": "shoufa-jianmo",
        "description": "正骨复位前的力学预演：算所需牵引力、力区间与力矩，并列出模型未建模的因素",
        "chars": 644,
        "body": "---\nname: shoufa-jianmo\ndescription: 正骨复位前的力学预演：算所需牵引力、力区间与力矩，并列出模型未建模的因素\nversion: 0.1.0\n---\n\n# shoufa-jianmo\n\n## 何时使用\n\n- 带教：学生上手前先算一遍，知道「该用多大力」\n- 病例复盘：手法失败后，回看是力不足、力过量还是手位错\n- 手法教学：比较不同手位带来的力矩差异\n\n## 不适用\n\n- 术中实时指导（本技能不做实时反馈）\n- 需要按骨折类型细分力的复杂病例（模型不区分类型）\n- 血管神经损伤、开放性骨折、病理性骨折（按急症处理，不做手法预演）\n\n## 步骤\n\n1. **取数**：体重、部位、肌肉发达与否、麻醉状态、手位、计划力、骨折类型。\n2. **算需求**：α 区间上沿 × 体重 × 肌肉修正。\n3. **算比值与力矩**：ratio ∈ [1.0, 1.3] 为区间内；力矩必须与力一起报。\n4. **标简化**：把模型不建模的因素（骨折类型、软组织嵌顿、个体解剖）逐条写出。\n5. **交人判断**：结论写「预演值」，并注明对位须影像确认。\n\n## 输出模板\n\n```text\n【数值】need=<..> kgf；applied=<..> kgf；ratio=<..>；M=<..> kgf·m\n【判定】不足 / 区间内 / 过量\n【简化风险】1) … 2) …\n【提醒】力学合规不等于对位良好，对位须由影像确认。\n```\n\n## 质量判据\n\n- 力与力矩成对出现，缺一不可\n- 判定必须给出区间依据，而不是「感觉差不多」\n- 简化风险至少两条，且必须是模型真实缺失的项\n\n> 本技能输出为教学预演，不构成临床操作参数。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "05-huli/04-zhongyi-huli-jishu/08-liaoxiao-pingjia": {
    "key": "05-huli/04-zhongyi-huli-jishu/08-liaoxiao-pingjia",
    "deptSlug": "05-huli",
    "deptTitle": "护理系",
    "subjectSlug": "04-zhongyi-huli-jishu",
    "subjectTitle": "中医护理技术",
    "chapterSlug": "08-liaoxiao-pingjia",
    "n": 8,
    "title": "第 8 章 · 中医护理技术的疗效评价：把「病人说舒服多了」变成可复核的数",
    "motto": "「药之不及，针之不到，必须灸之。」——《医学入门·灸法》",
    "problem": "你给病人做了三次艾灸，病人说「好多了」，护士长问「好多少」，你答不上来；下次换个病人，你也不知道该不该继续做。",
    "roots": "环境逼迫(护理记录必须写得清，且医保与质控要看依据) + 知识积累(护理技术 × 效应量与最小临床差异 = 一份能被别人复算的疗效记录)",
    "html": "<h1 id=\"第-8-章-中医护理技术的疗效评价-把-病人说舒服多了-变成可复核的数\">第 8 章 · 中医护理技术的疗效评价：把「病人说舒服多了」变成可复核的数</h1>\n<blockquote><p><strong>MOTTO:</strong> 「药之不及，针之不到，必须灸之。」——《医学入门·灸法》</p>\n<p><strong>PROBLEM:</strong> 你给病人做了三次艾灸，病人说「好多了」，护士长问「好多少」，你答不上来；下次换个病人，你也不知道该不该继续做。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(护理记录必须写得清，且医保与质控要看依据) + 知识积累(护理技术 × 效应量与最小临床差异 = 一份能被别人复算的疗效记录)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>中医护理技术</td></tr><tr><td>院系</td><td>护理系</td></tr><tr><td>章序号</td><td>08 / 08</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>用同一份量表在干预前后各测一次，算出<strong>组内效应量</strong>并解释它的大小含义</li><li>区分「统计学有差异」与「病人感觉得到差别」——后者由最小临床重要差异（MCID）决定</li><li>写出一份能被他人在同一病人身上重算的护理疗效记录</li><li>指出单组前后对比在因果推断上的致命缺陷</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"中医-护理技术的疗效怎么算\">中医：护理技术的疗效怎么算</h3>\n<p>艾灸、拔罐、穴位贴敷这类技术，教材给的疗效描述多是「症状改善」「有效率高」。《医学入门》讲「药之不及，针之不到，必须灸之」，讲的是适应证选择，不是疗效大小。护理要回答的是<strong>这个病人这次改善了多少</strong>，所以必须落到同一量表的两次测量上。</p>\n<p>护理常用量表：疼痛 NRS（0–10）、睡眠 PSQI、焦虑 SAS、中医症状积分。选择原则是一致的：<strong>同一病人、同一量表、同一时间窗、同一个评估者</strong>（或至少记录评估者）。</p>\n<h3 id=\"ai-工程-效应量与-mcid\">AI/工程：效应量与 MCID</h3>\n<p>配对差值的效应量用 Cohen's <span class=\"math\">d<sub>z</sub></span>：</p>\n<span class=\"math-block\">d<sub>z</sub>=<span class=\"frac\"><span class=\"frac-num\"><span class=\"math-line\">x</span><sub><span class=\"math-text\">后</span></sub>-<span class=\"math-line\">x</span><sub><span class=\"math-text\">前</span></sub></span><span class=\"frac-den\">s<sub><span class=\"math-text\">差</span></sub></span></span></span>\n<p>经验读数：0.2 小、0.5 中、0.8 大。但<strong>效应量大不等于病人受益</strong>：NRS 从 6 分降到 5 分，<span class=\"math\">d<sub>z</sub></span> 可能很可观，而 MCID 通常要求至少降 2 分。所以报告必须并排给三个数：均值差、<span class=\"math\">d<sub>z</sub></span>、是否达到 MCID。</p>\n<p>还有一个容易被忽略的环节是<strong>基线</strong>。同一位病人，入院时 NRS 8 分与出院前 3 分，若把「干预前」定在入院那天，测到的其实是住院期间全部处理（包括药物与休息）的合力。护理记录要能说清「这一次技术」的作用，就必须把测量点贴近操作：操作前 30 分钟、操作后固定时点，而不是笼统写「治疗前 / 治疗后」。基线定在哪里，等于决定了这份数据回答的是哪个问题。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">function effect(pre, post, mcid) {\n  const diff = post.map((v, i) =&gt; v - pre[i]);\n  const mean = avg(diff);\n  const sd = stdev(diff);\n  return { mean: +mean.toFixed(2), dz: +(mean / sd).toFixed(2), reached: mean &lt;= -mcid };\n}</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：一组 NRS 从 6/7/5/6/7 降到 4/3/2/4/3，均值差 −3.4、<span class=\"math\">d<sub>z</sub></span> 约 −1.9，达到 MCID=2 的判定；另一组只降 0.8 分，即使 <span class=\"math\">d<sub>z</sub></span> 不小也判「未达 MCID」。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>单组前后对比不能证明是艾灸起效</strong>。病程自然波动、安慰效应、同期用药改变都在里面；没有对照，只能叫「变化」，不能叫「疗效」。</li><li><strong>评估者不盲</strong>。护士知道谁做了艾灸，量表打分容易偏高，这是护理研究里最常见的偏倚。</li><li><strong>MCID 本身是人群平均值</strong>。同一个 2 分，对慢性痛病人可能无感，对术后病人可能很重要。</li><li><strong>样本极小</strong>时 <span class=\"math\">d<sub>z</sub></span> 极不稳定，五个人的效应量不足以支撑任何结论。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 本章的量表与阈值用于教学与护理记录规范演练，不构成诊疗建议；实际护理方案须由责任护士与医师依据病情确定，症状恶化须立即报告。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>把 MCID 从 2 改到 1，观察「达标率」如何变化，说明为什么阈值必须先声明再分析。</li><li>设计一个同期对照（同病区、同类病人、不做艾灸），说明它能排除什么、不能排除什么。</li><li>若两次测量由不同护士完成，记录里应补哪些字段？</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>护理疗效评价最容易被简化成「有效率 90%」这种数字。问一句「90% 是怎么算的」，往往就露出破绽：没有量表、没有阈值、没有基线。把这三样补齐，比多发一篇总结更有价值。</p>",
    "markdown": "# 第 8 章 · 中医护理技术的疗效评价：把「病人说舒服多了」变成可复核的数\n\n> **MOTTO:** 「药之不及，针之不到，必须灸之。」——《医学入门·灸法》\n>\n> **PROBLEM:** 你给病人做了三次艾灸，病人说「好多了」，护士长问「好多少」，你答不上来；下次换个病人，你也不知道该不该继续做。\n>\n> **双根因定位:** 环境逼迫(护理记录必须写得清，且医保与质控要看依据) + 知识积累(护理技术 × 效应量与最小临床差异 = 一份能被别人复算的疗效记录)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 中医护理技术 |\n| 院系 | 护理系 |\n| 章序号 | 08 / 08 |\n| 所属阶段 | 🌿 长·积累 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 3 小时 |\n\n## 学习目标\n\n- 用同一份量表在干预前后各测一次，算出**组内效应量**并解释它的大小含义\n- 区分「统计学有差异」与「病人感觉得到差别」——后者由最小临床重要差异（MCID）决定\n- 写出一份能被他人在同一病人身上重算的护理疗效记录\n- 指出单组前后对比在因果推断上的致命缺陷\n\n## 核心概念\n\n### 中医：护理技术的疗效怎么算\n\n艾灸、拔罐、穴位贴敷这类技术，教材给的疗效描述多是「症状改善」「有效率高」。《医学入门》讲「药之不及，针之不到，必须灸之」，讲的是适应证选择，不是疗效大小。护理要回答的是**这个病人这次改善了多少**，所以必须落到同一量表的两次测量上。\n\n护理常用量表：疼痛 NRS（0–10）、睡眠 PSQI、焦虑 SAS、中医症状积分。选择原则是一致的：**同一病人、同一量表、同一时间窗、同一个评估者**（或至少记录评估者）。\n\n### AI/工程：效应量与 MCID\n\n配对差值的效应量用 Cohen's $d_z$：\n\n$$d_z=\\frac{\\bar{x}_{\\text{后}}-\\bar{x}_{\\text{前}}}{s_{\\text{差}}}$$\n\n经验读数：0.2 小、0.5 中、0.8 大。但**效应量大不等于病人受益**：NRS 从 6 分降到 5 分，$d_z$ 可能很可观，而 MCID 通常要求至少降 2 分。所以报告必须并排给三个数：均值差、$d_z$、是否达到 MCID。\n\n还有一个容易被忽略的环节是**基线**。同一位病人，入院时 NRS 8 分与出院前 3 分，若把「干预前」定在入院那天，测到的其实是住院期间全部处理（包括药物与休息）的合力。护理记录要能说清「这一次技术」的作用，就必须把测量点贴近操作：操作前 30 分钟、操作后固定时点，而不是笼统写「治疗前 / 治疗后」。基线定在哪里，等于决定了这份数据回答的是哪个问题。\n\n## BUILD IT：从零实现\n\n```js\nfunction effect(pre, post, mcid) {\n  const diff = post.map((v, i) => v - pre[i]);\n  const mean = avg(diff);\n  const sd = stdev(diff);\n  return { mean: +mean.toFixed(2), dz: +(mean / sd).toFixed(2), reached: mean <= -mcid };\n}\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：一组 NRS 从 6/7/5/6/7 降到 4/3/2/4/3，均值差 −3.4、$d_z$ 约 −1.9，达到 MCID=2 的判定；另一组只降 0.8 分，即使 $d_z$ 不小也判「未达 MCID」。\n\n## 代价与边界\n\n- **单组前后对比不能证明是艾灸起效**。病程自然波动、安慰效应、同期用药改变都在里面；没有对照，只能叫「变化」，不能叫「疗效」。\n- **评估者不盲**。护士知道谁做了艾灸，量表打分容易偏高，这是护理研究里最常见的偏倚。\n- **MCID 本身是人群平均值**。同一个 2 分，对慢性痛病人可能无感，对术后病人可能很重要。\n- **样本极小**时 $d_z$ 极不稳定，五个人的效应量不足以支撑任何结论。\n\n> **免责声明：** 本章的量表与阈值用于教学与护理记录规范演练，不构成诊疗建议；实际护理方案须由责任护士与医师依据病情确定，症状恶化须立即报告。\n\n## 练习\n\n1. 把 MCID 从 2 改到 1，观察「达标率」如何变化，说明为什么阈值必须先声明再分析。\n2. 设计一个同期对照（同病区、同类病人、不做艾灸），说明它能排除什么、不能排除什么。\n3. 若两次测量由不同护士完成，记录里应补哪些字段？\n\n## 进阶思考\n\n护理疗效评价最容易被简化成「有效率 90%」这种数字。问一句「90% 是怎么算的」，往往就露出破绽：没有量表、没有阈值、没有基线。把这三样补齐，比多发一篇总结更有价值。\n",
    "code": {
      "main.js": "'use strict';\n/**\n * 护理技术疗效：配对差值的效应量与 MCID 判定\n *\n *   node code/main.js\n *\n * 口径：\n *   diff  = post - pre（量表分值越低越好时，负值表示改善）\n *   dz    = mean(diff) / sd(diff)    —— Cohen's d_z（配对）\n *   reached = mean(diff) <= -MCID    —— 病人可感知的改善，不是统计显著\n *\n * 三个数必须并排报：均值差、dz、是否达 MCID。只报 dz 是本章要防的错误。\n */\n\nconst avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;\nconst stdev = (a) => {\n  if (a.length < 2) return NaN;\n  const m = avg(a);\n  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));\n};\n\nfunction effect(pre, post, mcid) {\n  if (!Array.isArray(pre) || !Array.isArray(post) || pre.length !== post.length || !pre.length) {\n    throw new Error('pre/post 必须是等长非空数组');\n  }\n  const diff = post.map((v, i) => v - pre[i]);\n  const mean = avg(diff);\n  const sd = stdev(diff);\n  return {\n    n: pre.length,\n    mean: +mean.toFixed(2),\n    dz: Number.isFinite(sd) && sd > 0 ? +(mean / sd).toFixed(2) : null,\n    reached: mean <= -mcid,\n    mcid,\n  };\n}\n\nconst GROUPS = [\n  { name: 'A：艾灸三次（NRS）', pre: [6, 7, 5, 6, 7], post: [4, 3, 2, 4, 3], mcid: 2 },\n  { name: 'B：穴位贴敷两次（NRS）', pre: [5, 6, 5, 6, 5], post: [5, 5, 4, 5, 5], mcid: 2 },\n];\n\nfunction main() {\n  for (const g of GROUPS) {\n    const r = effect(g.pre, g.post, g.mcid);\n    console.log(`\\n${g.name}（n=${r.n}）`);\n    console.log(`  均值差 ${r.mean} · dz ${r.dz ?? '—'} · ${r.reached ? '达到' : '未达'} MCID(${r.mcid})`);\n    if (!r.reached) console.log('  提示：统计上可能有变化，但病人未必感觉得到，报告里不能写成「有效」。');\n  }\n  console.log('\\n提醒：单组前后对比只能说明「变化」，不能证明是干预起效。');\n  console.log('本输出为教学样例，不构成诊疗建议。');\n}\n\nif (require.main === module) main();\nmodule.exports = { effect, avg, stdev };\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { effect, stdev } = require('./main.js');\n\ntest('均值差方向：量表越低越好时，改善为负', () => {\n  const r = effect([6, 7, 5], [4, 3, 2], 2);\n  assert.strictEqual(r.mean, -3);\n});\n\ntest('未达 MCID 时 reached=false，即使均值差为负', () => {\n  const r = effect([5, 6, 5], [5, 5, 4], 2);\n  assert.strictEqual(r.reached, false);\n});\n\ntest('恰好达到 MCID（闭区间）判 reached=true', () => {\n  const r = effect([6, 6, 6], [4, 4, 4], 2);\n  assert.strictEqual(r.mean, -2);\n  assert.strictEqual(r.reached, true);\n});\n\ntest('无变异（sd=0）时 dz 为 null，而不是 Infinity', () => {\n  const r = effect([5, 5], [4, 4], 1);\n  assert.strictEqual(r.dz, null);\n});\n\ntest('长度不等或空数组必须抛错，不许静默截断', () => {\n  assert.throws(() => effect([1, 2], [1], 1), /等长非空/);\n  assert.throws(() => effect([], [], 1), /等长非空/);\n});\n\ntest('stdev 用样本标准差（n-1）', () => {\n  assert.strictEqual(+stdev([2, 4, 4, 4, 5, 5, 7, 9]).toFixed(2), 2.14);\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "护理记录里写「艾灸后病人诉舒适」，最大的问题是？",
          "options": [
            "字太少",
            "没有量表、没有基线、没有时间窗，无法被他人复算",
            "没有写艾灸的穴位",
            "没有医师签名"
          ],
          "correct": 1,
          "explanation": "可复核的记录需要同一量表、同一时间窗、可追溯的评估者。"
        },
        {
          "stage": "check",
          "question": "配对效应量 dz 的分子是？",
          "options": [
            "后测均值",
            "配对差值的均值",
            "前后均值之和",
            "标准差"
          ],
          "correct": 1,
          "explanation": "dz = mean(diff)/sd(diff)，用的是差值而非原始分值。"
        },
        {
          "stage": "check",
          "question": "NRS 从 6 分降到 5 分，dz 不小但判「未达 MCID」，说明？",
          "options": [
            "计算错了",
            "统计上的变化与病人可感知的改善是两件事",
            "MCID 应随 dz 调整",
            "样本太小"
          ],
          "correct": 1,
          "explanation": "MCID 是病人能感知的最小变化，与效应量大小的含义不同。"
        },
        {
          "stage": "check",
          "question": "单组前后对比的致命缺陷是？",
          "options": [
            "样本量小",
            "无法排除自然波动、安慰效应与同期治疗改变，因此不能归因于干预",
            "量表不统一",
            "没有统计学检验"
          ],
          "correct": 1,
          "explanation": "没有对照就没有因果归因，只能报告「变化」。"
        },
        {
          "stage": "post",
          "question": "五个病人的数据算出 dz=−1.9，最稳妥的表述是？",
          "options": [
            "艾灸疗效显著",
            "本组 5 例前后差值均值 −3.4，达到 MCID；例数少、无对照，不能据此推断疗效",
            "艾灸对疼痛有效",
            "可以推广到所有病人"
          ],
          "correct": 1,
          "explanation": "报告事实并标注局限，是本课要求的最低标准。"
        },
        {
          "stage": "post",
          "question": "若两次测量由不同护士完成，记录里最该补的是？",
          "options": [
            "两位护士的职称",
            "评估者身份与是否知晓干预（盲法状态）",
            "测量时的室温",
            "病人是否家属陪同"
          ],
          "correct": 1,
          "explanation": "评估者不盲是护理研究最常见的偏倚来源，必须留痕。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-liaoxiao-pingjia.md",
        "kind": "prompt",
        "file": "departments/05-huli/04-zhongyi-huli-jishu/chapters/08-liaoxiao-pingjia/outputs/prompt-liaoxiao-pingjia.md",
        "title": "护理技术疗效记录单",
        "description": null,
        "chars": 680,
        "body": "# 护理技术疗效记录单\n\n## 用途\n\n把一次中医护理技术（艾灸/拔罐/贴敷/耳穴）的疗效写成可复核记录：\n量表、两次测量、均值差、配对效应量、是否达 MCID、以及**不能下什么结论**。\n\n## 提示词\n\n```text\n你是护理教研组的记录助手。下面是一次中医护理技术的前后测量数据。\n请只做记录与计算，不要下\"有效/无效\"的结论。\n\n规则：\n1. 必须写明：量表名称与分值范围、测量时间点（干预前 / 干预后多久）、评估者（是否知晓干预）。\n2. 计算：配对差值均值、配对效应量 dz（样本标准差 n−1）、是否达到声明的 MCID。\n3. 三个数必须并排出现；缺任一项就写「缺」，不要用文字替代数字。\n4. 结论只能写「本组 N 例前后变化为 …」，禁止写「疗效显著」「有效率高」。\n5. 单独一段写「不能推断什么」：无对照、评估者不盲、样本量、同期用药变化。\n\n输出格式：\n【记录】量表 … ；时间点 … ；评估者 …\n【数值】均值差 … ；dz … ；MCID … → 达到 / 未达\n【表述建议】…\n【不能推断】…\n```\n\n## 使用示例\n\n输入：NRS，艾灸前 6/7/5/6/7，三次后 4/3/2/4/3，MCID=2，评估者为责任护士（知晓干预）。\n\n输出：【数值】均值差 −3.4；dz ≈ −1.9；MCID 2 → 达到\n【表述建议】本组 5 例 NRS 由均值 6.2 降至 3.2，差值均值 −3.4，达到 MCID。\n【不能推断】无同期对照；评估者知晓干预；例数 5；未记录同期镇痛药调整。\n\n## 为什么这样限制\n\n- 禁写「有效」：单组前后对比没有因果资格，写了就是过度声明。\n- 强制三数并排：只报 dz 会让人误以为「统计显著 = 病人受益」。\n- 单列「不能推断」：把局限写在记录里，交接班与质控才看得见。\n"
      },
      {
        "name": "skill-liaoxiao-pingjia.md",
        "kind": "skill",
        "file": "departments/05-huli/04-zhongyi-huli-jishu/chapters/08-liaoxiao-pingjia/outputs/skill-liaoxiao-pingjia.md",
        "title": "liaoxiao-pingjia",
        "description": "中医护理技术的前后测量记录：算配对效应量与 MCID，并明确写出不能推断的结论",
        "chars": 610,
        "body": "---\nname: liaoxiao-pingjia\ndescription: 中医护理技术的前后测量记录：算配对效应量与 MCID，并明确写出不能推断的结论\nversion: 0.1.0\n---\n\n# liaoxiao-pingjia\n\n## 何时使用\n\n- 交班记录里要写清「这次艾灸改善了没有、改善多少」\n- 护理查房需要一份能被护士长复算的疗效数据\n- 科室做小样本护理观察，需要先统一记录口径\n\n## 不适用\n\n- 需要证明因果效应的研究（必须有对照与盲法，本技能不做研究设计）\n- 无法使用量表、只能凭感受描述的情形（此时应记录「未测量」而不是编一个数）\n- 危急重症的病情判断（走临床路径，不用疗效记录单）\n\n## 步骤\n\n1. **固定量表**：NRS / PSQI / SAS / 中医症状积分，选一个并在整组内不变。\n2. **固定时间窗**：干预前、干预后多久（如三次后 24 h），写进记录。\n3. **标明评估者**：谁测的、是否知晓干预。\n4. **算三个数**：均值差、配对 dz（n−1）、是否达 MCID。\n5. **写「不能推断」**：无对照、不盲、样本量、同期用药。\n\n## 输出模板\n\n```text\n【记录】量表 … ；时间点 … ；评估者 …\n【数值】均值差 … ；dz … ；MCID … → 达到 / 未达\n【表述】本组 N 例由 … 降至 …\n【不能推断】1) … 2) …\n```\n\n## 质量判据\n\n- 三个数齐全且同量纲\n- 没有出现「有效率」「显著有效」这类未经设计的结论\n- 「不能推断」至少两条，且都不是套话\n\n> 本技能输出为护理记录辅助，不构成诊疗建议。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "06-guanli/01-yixue-tongjixue/09-duochong-jiaoyan": {
    "key": "06-guanli/01-yixue-tongjixue/09-duochong-jiaoyan",
    "deptSlug": "06-guanli",
    "deptTitle": "管理系",
    "subjectSlug": "01-yixue-tongjixue",
    "subjectTitle": "医学统计学",
    "chapterSlug": "09-duochong-jiaoyan",
    "n": 9,
    "title": "第 9 章 · 多重比较与假阳性控制：为什么「做了 20 个指标，总有 1 个显著」",
    "motto": "「谨守病机，各司其属。」——《素问·至真要大论》",
    "problem": "一份中医证候研究里测了 20 个指标，其中 1 个 p=0.03，你把它写成「具有统计学意义」，审稿人一句「你校正了吗」就把结论推翻了。",
    "roots": "环境逼迫(毕业与晋升都要「阳性结果」，指标越加越多) + 知识积累(多重比较 × 错误发现率 = 一套能在分析前就定好、事后不被质疑的判定规则)",
    "html": "<h1 id=\"第-9-章-多重比较与假阳性控制-为什么-做了-20-个指标-总有-1-个显著\">第 9 章 · 多重比较与假阳性控制：为什么「做了 20 个指标，总有 1 个显著」</h1>\n<blockquote><p><strong>MOTTO:</strong> 「谨守病机，各司其属。」——《素问·至真要大论》</p>\n<p><strong>PROBLEM:</strong> 一份中医证候研究里测了 20 个指标，其中 1 个 p=0.03，你把它写成「具有统计学意义」，审稿人一句「你校正了吗」就把结论推翻了。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(毕业与晋升都要「阳性结果」，指标越加越多) + 知识积累(多重比较 × 错误发现率 = 一套能在分析前就定好、事后不被质疑的判定规则)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>医学统计学</td></tr><tr><td>院系</td><td>管理系</td></tr><tr><td>章序号</td><td>09 / 10</td></tr><tr><td>所属阶段</td><td>🌿 长·积累</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>说清「做 20 次独立检验、α=0.05，至少一次假阳性的概率约 64%」是怎么算出来的</li><li>实现 Bonferroni 与 Benjamini–Hochberg（BH）两种校正，并说明各自控制的是什么</li><li>判断一份结果表该用哪一种校正，并写出理由</li><li>指出校正<strong>不能</strong>挽救什么（比如事先没定主结局、事后挑指标）</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"为什么要校正\">为什么要校正</h3>\n<p>《医学统计学·方差分析》一章在讲完两两比较后专门提醒：多组间反复比较会放大第一类错误。原因很简单：</p>\n<span class=\"math-block\">P(<span class=\"math-text\">至少一次假阳性</span>)=1-(1-α)<sup>m</sup></span>\n<p><span class=\"math\">m=20</span>、<span class=\"math\">α=0.05</span> 时约 0.64。也就是说，<strong>什么都不做的研究，二十个指标里几乎必然有一个「显著」</strong>。</p>\n<h3 id=\"两种校正-控制的是不同的东西\">两种校正，控制的是不同的东西</h3>\n<ul><li><strong>Bonferroni</strong>：<span class=\"math\">α'=α/m</span>，控制<strong>族错误率（FWER）</strong>——任意一次假阳性的概率。保守，指标多时几乎全灭。</li><li><strong>BH（Benjamini–Hochberg）</strong>：把 p 值升序排列，找到最大的 <span class=\"math\">k</span> 使 <span class=\"math\">p<sub>(k)</sub>≤ <span class=\"frac\"><span class=\"frac-num\">k</span><span class=\"frac-den\">m</span></span>α</span>，则前 <span class=\"math\">k</span> 个拒绝。控制<strong>错误发现率（FDR）</strong>——被宣称的发现里假阳性的<strong>比例</strong>。探索性研究通常更合适。</li></ul>\n<p>关键区别：FWER 问「我有没有说错一次」，FDR 问「我说对的那批里错了多少比例」。前者适合确证性研究，后者适合筛选。</p>\n<p>FWER 一侧还有一个比 Bonferroni 更聪明的做法：<strong>Holm 逐步法</strong>。把 p 值升序排列后，第一个与 <span class=\"math\">α/m</span> 比较，第二个与 <span class=\"math\">α/(m-1)</span> 比较，一旦某一步不显著就停止，之后的一律不拒绝。它同样控制 FWER，但在真有多个效应时比 Bonferroni 更容易留住结果。本课先实现 Bonferroni 与 BH 两条，是因为它们分别代表「最保守」与「按比例控制」两个极端，把这两个搞懂，中间的变体都是同一思路的调整。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">function bh(pvalues, alpha = 0.05) {\n  const idx = pvalues.map((p, i) =&gt; ({ p, i })).sort((a, b) =&gt; a.p - b.p);\n  let k = 0;\n  idx.forEach((x, rank) =&gt; { if (x.p &lt;= ((rank + 1) / idx.length) * alpha) k = rank + 1; });\n  return { k, rejected: idx.slice(0, k).map((x) =&gt; x.i) };  // 注意：拒绝的是&quot;前 k 个&quot;\n}</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：给出的 10 个 p 值中，Bonferroni 只留下 1 个（p=0.001），BH 留下 2 个（0.001、0.008）——差异恰好说明两种口径的取舍。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>校正救不了事后挑指标</strong>。如果主结局是分析完才选的，任何校正都是装饰；预注册才是解药。</li><li><strong>BH 假设检验之间独立或正相关</strong>。指标高度相关时（同一证候的量表与症状积分），FDR 控制会偏松。</li><li><strong>校正后不显著 ≠ 没有效应</strong>。样本量不足时，真效应也会被校正掉，这叫「校正的代价」，必须写进局限性。</li><li><strong>它不解决多重性之外的偏倚</strong>：选择性报告、结局替换、分组不随机，校正一个都管不了。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 本章的代码与阈值用于教学与统计分析演练，不构成研究结论或临床建议；真实研究须按预注册方案与期刊统计要求执行。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>把 α 从 0.05 改到 0.01，观察 BH 的拒绝集合如何变化，说明为什么 α 必须在分析前定。</li><li>构造一组高度相关的 p 值（如 0.01、0.011、0.012…），观察 BH 的表现在哪里失效。</li><li>若研究只有一个主结局与五个次要结局，你会怎么分配 α？写出方案与理由。</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>「做了很多比较」本身不是错，<strong>不承认做了很多比较</strong>才是错。校正方法的真正价值不是让结果变好看，而是逼研究者在动手之前就想清楚：我到底要回答几个问题。</p>",
    "markdown": "# 第 9 章 · 多重比较与假阳性控制：为什么「做了 20 个指标，总有 1 个显著」\n\n> **MOTTO:** 「谨守病机，各司其属。」——《素问·至真要大论》\n>\n> **PROBLEM:** 一份中医证候研究里测了 20 个指标，其中 1 个 p=0.03，你把它写成「具有统计学意义」，审稿人一句「你校正了吗」就把结论推翻了。\n>\n> **双根因定位:** 环境逼迫(毕业与晋升都要「阳性结果」，指标越加越多) + 知识积累(多重比较 × 错误发现率 = 一套能在分析前就定好、事后不被质疑的判定规则)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 医学统计学 |\n| 院系 | 管理系 |\n| 章序号 | 09 / 10 |\n| 所属阶段 | 🌿 长·积累 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 3 小时 |\n\n## 学习目标\n\n- 说清「做 20 次独立检验、α=0.05，至少一次假阳性的概率约 64%」是怎么算出来的\n- 实现 Bonferroni 与 Benjamini–Hochberg（BH）两种校正，并说明各自控制的是什么\n- 判断一份结果表该用哪一种校正，并写出理由\n- 指出校正**不能**挽救什么（比如事先没定主结局、事后挑指标）\n\n## 核心概念\n\n### 为什么要校正\n\n《医学统计学·方差分析》一章在讲完两两比较后专门提醒：多组间反复比较会放大第一类错误。原因很简单：\n\n$$P(\\text{至少一次假阳性})=1-(1-\\alpha)^m$$\n\n$m=20$、$\\alpha=0.05$ 时约 0.64。也就是说，**什么都不做的研究，二十个指标里几乎必然有一个「显著」**。\n\n### 两种校正，控制的是不同的东西\n\n- **Bonferroni**：$\\alpha'=\\alpha/m$，控制**族错误率（FWER）**——任意一次假阳性的概率。保守，指标多时几乎全灭。\n- **BH（Benjamini–Hochberg）**：把 p 值升序排列，找到最大的 $k$ 使 $p_{(k)}\\le \\frac{k}{m}\\alpha$，则前 $k$ 个拒绝。控制**错误发现率（FDR）**——被宣称的发现里假阳性的**比例**。探索性研究通常更合适。\n\n关键区别：FWER 问「我有没有说错一次」，FDR 问「我说对的那批里错了多少比例」。前者适合确证性研究，后者适合筛选。\n\nFWER 一侧还有一个比 Bonferroni 更聪明的做法：**Holm 逐步法**。把 p 值升序排列后，第一个与 $\\alpha/m$ 比较，第二个与 $\\alpha/(m-1)$ 比较，一旦某一步不显著就停止，之后的一律不拒绝。它同样控制 FWER，但在真有多个效应时比 Bonferroni 更容易留住结果。本课先实现 Bonferroni 与 BH 两条，是因为它们分别代表「最保守」与「按比例控制」两个极端，把这两个搞懂，中间的变体都是同一思路的调整。\n\n## BUILD IT：从零实现\n\n```js\nfunction bh(pvalues, alpha = 0.05) {\n  const idx = pvalues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);\n  let k = 0;\n  idx.forEach((x, rank) => { if (x.p <= ((rank + 1) / idx.length) * alpha) k = rank + 1; });\n  return { k, rejected: idx.slice(0, k).map((x) => x.i) };  // 注意：拒绝的是\"前 k 个\"\n}\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：给出的 10 个 p 值中，Bonferroni 只留下 1 个（p=0.001），BH 留下 2 个（0.001、0.008）——差异恰好说明两种口径的取舍。\n\n## 代价与边界\n\n- **校正救不了事后挑指标**。如果主结局是分析完才选的，任何校正都是装饰；预注册才是解药。\n- **BH 假设检验之间独立或正相关**。指标高度相关时（同一证候的量表与症状积分），FDR 控制会偏松。\n- **校正后不显著 ≠ 没有效应**。样本量不足时，真效应也会被校正掉，这叫「校正的代价」，必须写进局限性。\n- **它不解决多重性之外的偏倚**：选择性报告、结局替换、分组不随机，校正一个都管不了。\n\n> **免责声明：** 本章的代码与阈值用于教学与统计分析演练，不构成研究结论或临床建议；真实研究须按预注册方案与期刊统计要求执行。\n\n## 练习\n\n1. 把 α 从 0.05 改到 0.01，观察 BH 的拒绝集合如何变化，说明为什么 α 必须在分析前定。\n2. 构造一组高度相关的 p 值（如 0.01、0.011、0.012…），观察 BH 的表现在哪里失效。\n3. 若研究只有一个主结局与五个次要结局，你会怎么分配 α？写出方案与理由。\n\n## 进阶思考\n\n「做了很多比较」本身不是错，**不承认做了很多比较**才是错。校正方法的真正价值不是让结果变好看，而是逼研究者在动手之前就想清楚：我到底要回答几个问题。\n",
    "code": {
      "main.js": "'use strict';\n/**\n * 多重比较校正：Bonferroni（控 FWER）与 Benjamini–Hochberg（控 FDR）\n *\n *   node code/main.js\n *\n * 口径：\n *   Bonferroni: 阈值 α/m，控制「至少一次假阳性」的概率\n *   BH        : 升序后找最大 k 使 p(k) ≤ (k/m)·α，前 k 个拒绝，控制假阳性占比\n *\n * 两者不可互换：确证性研究用 FWER，探索性筛选用 FDR。\n */\n\nfunction bonferroni(pvalues, alpha = 0.05) {\n  const thr = alpha / pvalues.length;\n  const rejected = [];\n  pvalues.forEach((p, i) => { if (p <= thr) rejected.push(i); });\n  return { method: 'bonferroni', threshold: thr, rejected };\n}\n\nfunction bh(pvalues, alpha = 0.05) {\n  const m = pvalues.length;\n  const idx = pvalues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);\n  let k = 0;\n  idx.forEach((x, rank) => {\n    if (x.p <= ((rank + 1) / m) * alpha) k = rank + 1;\n  });\n  // 拒绝的是排序后的前 k 个，不是\"所有 p ≤ k/m·α 的\"——后者是常见实现错误\n  return { method: 'bh', threshold: k ? (k / m) * alpha : 0, rejected: idx.slice(0, k).map((x) => x.i).sort((a, b) => a - b) };\n}\n\n/** 至少一次假阳性的概率：1-(1-α)^m */\nfunction familyError(alpha, m) {\n  return +(1 - (1 - alpha) ** m).toFixed(3);\n}\n\nconst PVALUES = [0.001, 0.008, 0.021, 0.03, 0.041, 0.12, 0.25, 0.4, 0.62, 0.9];\n\nfunction main() {\n  console.log(`p 值（${PVALUES.length} 个）：${PVALUES.join(', ')}`);\n  console.log(`\\n若不做校正（α=0.05），至少一次假阳性的概率 = ${familyError(0.05, PVALUES.length)}`);\n\n  for (const r of [bonferroni(PVALUES), bh(PVALUES)]) {\n    console.log(`\\n${r.method.toUpperCase()}：阈值 ${r.threshold.toFixed(4)}`);\n    console.log(`  拒绝（显著）的下标：${r.rejected.join(', ') || '无'}`);\n    console.log(`  对应 p 值：${r.rejected.map((i) => PVALUES[i]).join(', ') || '无'}`);\n  }\n  console.log('\\n本输出为教学样例，不构成研究结论；真实研究须按预注册方案执行。');\n}\n\nif (require.main === module) main();\nmodule.exports = { bonferroni, bh, familyError, PVALUES };\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { bonferroni, bh, familyError } = require('./main.js');\n\ntest('familyError：m 越大，至少一次假阳性的概率越高', () => {\n  assert.ok(familyError(0.05, 20) > familyError(0.05, 10));\n  assert.strictEqual(familyError(0.05, 1), 0.05);\n});\n\ntest('Bonferroni 阈值 = α/m', () => {\n  assert.strictEqual(+bonferroni([0.01, 0.02, 0.9, 0.5]).threshold.toFixed(5), 0.0125);\n});\n\ntest('Bonferroni 比 BH 保守（拒绝集不会更大）', () => {\n  const p = [0.001, 0.008, 0.021, 0.03, 0.041, 0.12];\n  assert.ok(bonferroni(p).rejected.length <= bh(p).rejected.length);\n});\n\ntest('BH 拒绝的是排序后的前 k 个，而不是所有过阈值的', () => {\n  // 0.05 单独看显著，但排在最后一名，不应被拒绝\n  const r = bh([0.04, 0.045, 0.05, 0.2, 0.9]);\n  assert.deepStrictEqual(r.rejected, []);\n});\n\ntest('BH 在明显分离的数据上拒绝前两个', () => {\n  const r = bh([0.001, 0.008, 0.021, 0.03, 0.041, 0.12, 0.25, 0.4, 0.62, 0.9]);\n  assert.deepStrictEqual(r.rejected, [0, 1]);\n});\n\ntest('单个 p 值：BH 与 Bonferroni 判定一致', () => {\n  assert.deepStrictEqual(bh([0.01]).rejected, [0]);\n  assert.deepStrictEqual(bonferroni([0.01]).rejected, [0]);\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "做 20 个独立检验、α=0.05，什么都不做也至少出现一次「显著」的概率约为？",
          "options": [
            "5%",
            "20%",
            "64%",
            "95%"
          ],
          "correct": 2,
          "explanation": "1-(1-0.05)^20 ≈ 0.64。"
        },
        {
          "stage": "check",
          "question": "Bonferroni 控制的是？",
          "options": [
            "错误发现率（FDR）",
            "族错误率（FWER）：任意一次假阳性的概率",
            "统计功效",
            "样本量"
          ],
          "correct": 1,
          "explanation": "Bonferroni 用 α/m，是最保守的 FWER 控制。"
        },
        {
          "stage": "check",
          "question": "BH 的正确实现是？",
          "options": [
            "拒绝所有 p ≤ α/m 的检验",
            "把 p 升序排列，找最大 k 使 p(k) ≤ (k/m)·α，拒绝前 k 个",
            "随机挑一半检验做校正",
            "把所有 p 值乘以 m"
          ],
          "correct": 1,
          "explanation": "常见错误是只挑「过阈值」的那些，而不是取前 k 个。"
        },
        {
          "stage": "check",
          "question": "探索性筛选题，一般更合适的是？",
          "options": [
            "Bonferroni",
            "BH（控 FDR）",
            "不校正",
            "把 α 调到 0.2"
          ],
          "correct": 1,
          "explanation": "筛选阶段在意「这批发现里错多少比例」，FDR 更贴合，也保留功效。"
        },
        {
          "stage": "post",
          "question": "校正后不显著，最准确的解读是？",
          "options": [
            "证明没有效应",
            "在校正口径与现有样本量下不足以宣称；真效应可能被校正掉",
            "数据造错了",
            "应该改用未校正的结果"
          ],
          "correct": 1,
          "explanation": "不显著 ≠ 无效；这是校正的代价，要写进局限性。"
        },
        {
          "stage": "post",
          "question": "下面哪种行为是校正无法弥补的？",
          "options": [
            "指标多达 20 个",
            "主结局在分析完成后才确定",
            "使用 BH 而非 Bonferroni",
            "α 设在 0.05"
          ],
          "correct": 1,
          "explanation": "事后挑结局属于设计层面的偏倚，任何校正都只是装饰；解药是预注册。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-duochong-jiaoyan.md",
        "kind": "prompt",
        "file": "departments/06-guanli/01-yixue-tongjixue/chapters/09-duochong-jiaoyan/outputs/prompt-duochong-jiaoyan.md",
        "title": "多重比较校正选择器",
        "description": null,
        "chars": 679,
        "body": "# 多重比较校正选择器\n\n## 用途\n\n给定一份研究的比较次数与目的（确证 / 探索），选出校正方法、算出门槛，并把「不能宣称什么」写清楚。\n用于**统计分析前的方案讨论、稿件自查、审稿意见应答**。\n\n## 提示词\n\n```text\n你是医学统计学的审稿助手。下面是一份研究的比较清单与目的说明。\n\n规则：\n1. 先问目的：确证性（要下结论）用 FWER（Bonferroni 或 Holm）；探索性（要筛候选）用 FDR（BH）。不要两者混用。\n2. 算门槛：Bonferroni = α/m；BH 需列出升序 p 值与 k 值，并写出最终拒绝集。\n3. 明确报告：m 是多少（主结局 + 次要结局 + 亚组 + 时间点，全部计入），α 是否事先设定。\n4. 若主结局是分析后才确定的，直接指出「校正无法弥补，需预注册或标注为探索性」。\n5. 输出必须包含「校正的代价」一段：真实的效应也可能被校正掉。\n\n输出格式：\n【方法】…（理由：目的 = …）\n【m 与 α】… ；门槛 …\n【结果表述】…\n【局限】1) … 2) …\n```\n\n## 使用示例\n\n输入：20 个指标，均为次要结局，目的是筛候选；α=0.05；p 值最小 0.001、次小 0.008。\n\n输出：【方法】BH（探索性）【m 与 α】m=20，α=0.05，门槛按 BH 逐位算（k=1: 0.0025，k=2: 0.005…）\n【结果表述】BH 下 p=0.001 与 0.008 均被拒绝，可写「两个候选指标值得进一步验证」，不可写「疗效显著」。\n\n## 为什么这样限制\n\n- 强制先问目的：方法选错往往不是算错，而是目的没说清。\n- 要求列出 m 的构成：很多人只数主指标，把亚组和时间点漏掉，门槛因此虚高。\n- 强制写「代价」：只讲校正的好处，会让读者以为校正没有成本。\n"
      },
      {
        "name": "skill-duochong-jiaoyan.md",
        "kind": "skill",
        "file": "departments/06-guanli/01-yixue-tongjixue/chapters/09-duochong-jiaoyan/outputs/skill-duochong-jiaoyan.md",
        "title": "duochong-jiaoyan",
        "description": "按研究目的选择 FWER 或 FDR 校正，算出门槛并写明校正的代价与不可弥补的偏倚",
        "chars": 565,
        "body": "---\nname: duochong-jiaoyan\ndescription: 按研究目的选择 FWER 或 FDR 校正，算出门槛并写明校正的代价与不可弥补的偏倚\nversion: 0.1.0\n---\n\n# duochong-jiaoyan\n\n## 何时使用\n\n- 研究方案讨论阶段，需要确定「比较几次、怎么校正」\n- 稿件自查：m 是否漏算、α 是否事后调整\n- 应答审稿人「你校正了吗」这类意见\n\n## 不适用\n\n- 单一比较且无亚组、无多时间点的研究（无需校正）\n- 主结局未预注册、需要事后补校正的情形（校正无效，只能标注探索性）\n- 贝叶斯/机器学习建模中的多重性问题（那是另一套框架）\n\n## 步骤\n\n1. **定目的**：确证 → FWER；探索 → FDR。\n2. **数 m**：主结局 + 次要结局 + 亚组 + 时间点，逐项相加并列出。\n3. **算门槛**：Bonferroni α/m；BH 逐位算 k/m·α 并给拒绝集。\n4. **写表述**：确证写「显著」，探索写「值得进一步验证」。\n5. **写局限**：校正可能抹掉真实效应；事后挑结局校正无效。\n\n## 输出模板\n\n```text\n【方法】…\n【m 与 α】m=…（构成：…）；α=…\n【门槛与拒绝集】…\n【表述】…\n【局限】1) … 2) …\n```\n\n## 质量判据\n\n- m 的构成逐项列出，可被读者复核\n- 方法选择与「目的」一致\n- 局限性包含「校正的代价」而非只有套话\n\n> 本技能输出为统计方案辅助，不构成研究结论。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "07-zhineng/06-zhongyi-zhineng-bianzheng/07-yizhixing-pinggu": {
    "key": "07-zhineng/06-zhongyi-zhineng-bianzheng/07-yizhixing-pinggu",
    "deptSlug": "07-zhineng",
    "deptTitle": "智能系",
    "subjectSlug": "06-zhongyi-zhineng-bianzheng",
    "subjectTitle": "中医智能辨证系统",
    "chapterSlug": "07-yizhixing-pinggu",
    "n": 7,
    "title": "第 7 章 · 与医生诊断的一致性评估：kappa 高就说明系统靠谱吗",
    "motto": "「诊法常以平旦，阴气未动，阳气未散。」——《素问·脉要精微论》",
    "problem": "你的辨证系统与三位医生的一致率是 82%，你在答辩上说「达到临床可用水平」，评委问「kappa 多少、医生的诊断彼此一致吗」，你答不上来。",
    "roots": "环境逼迫(要拿一致性数字去论证系统可用) + 知识积累(混淆矩阵 × kappa = 一个能区分「真的对上」与「碰巧对上」的评估)",
    "html": "<h1 id=\"第-7-章-与医生诊断的一致性评估-kappa-高就说明系统靠谱吗\">第 7 章 · 与医生诊断的一致性评估：kappa 高就说明系统靠谱吗</h1>\n<blockquote><p><strong>MOTTO:</strong> 「诊法常以平旦，阴气未动，阳气未散。」——《素问·脉要精微论》</p>\n<p><strong>PROBLEM:</strong> 你的辨证系统与三位医生的一致率是 82%，你在答辩上说「达到临床可用水平」，评委问「kappa 多少、医生的诊断彼此一致吗」，你答不上来。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(要拿一致性数字去论证系统可用) + 知识积累(混淆矩阵 × kappa = 一个能区分「真的对上」与「碰巧对上」的评估)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>中医智能辨证系统</td></tr><tr><td>院系</td><td>智能系</td></tr><tr><td>章序号</td><td>07 / 10</td></tr><tr><td>所属阶段</td><td>🌳 壮·鼎盛</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>4 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>从混淆矩阵算出原始一致率与 Cohen's kappa，并解释两者差在哪</li><li>说清「患病率极高或极低时 kappa 会失真」这一悖论，并给出替代指标</li><li>用医生之间的 kappa 作为<strong>上界参照</strong>：系统的一致性不可能长期高于人类彼此的一致性</li><li>指出「一致 ≠ 正确」：医生之间一致地错，系统跟着错也会得高分</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"中医-一致性评估的前提是先固定诊法条件\">中医：一致性评估的前提是先固定诊法条件</h3>\n<p>《素问·脉要精微论》强调「诊法常以平旦」，说的是诊断要在条件受控时进行。这句话在今天的含义是：<strong>如果两位医生看同一个病人的时间、体位、问诊深度都不同，他们的不一致里混着测量误差，不能全算作判断差异</strong>。评估系统与医生的一致性之前，先要评估医生彼此的一致性——后者是这套评估的噪声底。</p>\n<h3 id=\"ai-工程-kappa-与它的陷阱\">AI/工程：kappa 与它的陷阱</h3>\n<span class=\"math-block\">κ=<span class=\"frac\"><span class=\"frac-num\">p<sub>o</sub>-p<sub>e</sub></span><span class=\"frac-den\">1-p<sub>e</sub></span></span></span>\n<p><span class=\"math\">p<sub>o</sub></span> 是观察一致率，<span class=\"math\">p<sub>e</sub></span> 是「按各自边际分布随机猜」的期望一致率。kappa 的含义是「扣掉碰巧对上之后的一致程度」。</p>\n<p>三个必须同时报告：<span class=\"math\">p<sub>o</sub></span>、<span class=\"math\">κ</span>、以及<strong>边际分布</strong>（各类占比）。因为当某一类占 90% 时，系统全判这一类就能拿到 0.9 的 <span class=\"math\">p<sub>o</sub></span>，而 <span class=\"math\">κ</span> 可能接近 0——反过来，当两类各占 50% 且几乎全对时，<span class=\"math\">κ</span> 也会被压得比直觉低。这就是著名的 kappa 悖论，替代方案是 PABAK 或 Gwet 的 AC1。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">function kappa(matrix) {\n  // matrix[i][j]：系统判 i、医生判 j 的例数\n  const n = matrix.flat().reduce((a, b) =&gt; a + b, 0);\n  const po = matrix.reduce((s, row, i) =&gt; s + row[i], 0) / n;\n  const rowSum = matrix.map((r) =&gt; r.reduce((a, b) =&gt; a + b, 0) / n);\n  const colSum = matrix[0].map((_, j) =&gt; matrix.reduce((s, r) =&gt; s + r[j], 0) / n);\n  const pe = rowSum.reduce((s, r, i) =&gt; s + r * colSum[i], 0);\n  return { po, pe, kappa: (po - pe) / (1 - pe) };\n}</code></pre></div>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：一个「全判同一类」的退化矩阵 <span class=\"math\">p<sub>o</sub>=0.857</span> 但 <span class=\"math\">κ=0</span>，与一个均衡且几乎全对的矩阵（<span class=\"math\">κ≈0.94</span>）形成对照——这正是答辩时最容易被问到的那一处。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>一致不等于正确</strong>。两位医生都判错时，系统跟着错会得高分；没有金标准，一致性只是「像人」，不是「对」。</li><li><strong>kappa 对患病率敏感</strong>。类别极不平衡时它会低得离谱，不能直接拿来与文献里的 0.8 比较。</li><li><strong>样本量与类别数会改变可比性</strong>。5 类 200 例与 2 类 2000 例的 kappa 不可直接对照。</li><li><strong>它不告诉你错在哪</strong>。必须同时给出混淆矩阵，否则无法看出系统是否把「肝阳上亢」全判成「肝火上炎」。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 本章的评估方法用于系统研发与教学；任何辨证系统的临床使用须经伦理审查、前瞻验证与监管审批，本章数据不构成疗效或安全性证据。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>给混淆矩阵加一列「医生之间不一致」的样本，观察 kappa 如何变化。</li><li>用同一份矩阵算 PABAK，比较它与 kappa 的差异，说明各自适合的报告场景。</li><li>若三类样本占比为 90%/5%/5%，系统全判第一类，<span class=\"math\">p<sub>o</sub></span> 与 <span class=\"math\">κ</span> 各是多少？</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>一致性评估最容易被当成「验收指标」：数字够了就上线。但一个只跟人类保持一致的模型，天花板就是人类的一致性水平——而人类彼此的一致性本身可能只有 0.6。先把噪声底测出来，再谈系统好不好。</p>",
    "markdown": "# 第 7 章 · 与医生诊断的一致性评估：kappa 高就说明系统靠谱吗\n\n> **MOTTO:** 「诊法常以平旦，阴气未动，阳气未散。」——《素问·脉要精微论》\n>\n> **PROBLEM:** 你的辨证系统与三位医生的一致率是 82%，你在答辩上说「达到临床可用水平」，评委问「kappa 多少、医生的诊断彼此一致吗」，你答不上来。\n>\n> **双根因定位:** 环境逼迫(要拿一致性数字去论证系统可用) + 知识积累(混淆矩阵 × kappa = 一个能区分「真的对上」与「碰巧对上」的评估)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 中医智能辨证系统 |\n| 院系 | 智能系 |\n| 章序号 | 07 / 10 |\n| 所属阶段 | 🌳 壮·鼎盛 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 4 小时 |\n\n## 学习目标\n\n- 从混淆矩阵算出原始一致率与 Cohen's kappa，并解释两者差在哪\n- 说清「患病率极高或极低时 kappa 会失真」这一悖论，并给出替代指标\n- 用医生之间的 kappa 作为**上界参照**：系统的一致性不可能长期高于人类彼此的一致性\n- 指出「一致 ≠ 正确」：医生之间一致地错，系统跟着错也会得高分\n\n## 核心概念\n\n### 中医：一致性评估的前提是先固定诊法条件\n\n《素问·脉要精微论》强调「诊法常以平旦」，说的是诊断要在条件受控时进行。这句话在今天的含义是：**如果两位医生看同一个病人的时间、体位、问诊深度都不同，他们的不一致里混着测量误差，不能全算作判断差异**。评估系统与医生的一致性之前，先要评估医生彼此的一致性——后者是这套评估的噪声底。\n\n### AI/工程：kappa 与它的陷阱\n\n$$\\kappa=\\frac{p_o-p_e}{1-p_e}$$\n\n$p_o$ 是观察一致率，$p_e$ 是「按各自边际分布随机猜」的期望一致率。kappa 的含义是「扣掉碰巧对上之后的一致程度」。\n\n三个必须同时报告：$p_o$、$\\kappa$、以及**边际分布**（各类占比）。因为当某一类占 90% 时，系统全判这一类就能拿到 0.9 的 $p_o$，而 $\\kappa$ 可能接近 0——反过来，当两类各占 50% 且几乎全对时，$\\kappa$ 也会被压得比直觉低。这就是著名的 kappa 悖论，替代方案是 PABAK 或 Gwet 的 AC1。\n\n## BUILD IT：从零实现\n\n```js\nfunction kappa(matrix) {\n  // matrix[i][j]：系统判 i、医生判 j 的例数\n  const n = matrix.flat().reduce((a, b) => a + b, 0);\n  const po = matrix.reduce((s, row, i) => s + row[i], 0) / n;\n  const rowSum = matrix.map((r) => r.reduce((a, b) => a + b, 0) / n);\n  const colSum = matrix[0].map((_, j) => matrix.reduce((s, r) => s + r[j], 0) / n);\n  const pe = rowSum.reduce((s, r, i) => s + r * colSum[i], 0);\n  return { po, pe, kappa: (po - pe) / (1 - pe) };\n}\n```\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：一个「全判同一类」的退化矩阵 $p_o=0.857$ 但 $\\kappa=0$，与一个均衡且几乎全对的矩阵（$\\kappa\\approx0.94$）形成对照——这正是答辩时最容易被问到的那一处。\n\n## 代价与边界\n\n- **一致不等于正确**。两位医生都判错时，系统跟着错会得高分；没有金标准，一致性只是「像人」，不是「对」。\n- **kappa 对患病率敏感**。类别极不平衡时它会低得离谱，不能直接拿来与文献里的 0.8 比较。\n- **样本量与类别数会改变可比性**。5 类 200 例与 2 类 2000 例的 kappa 不可直接对照。\n- **它不告诉你错在哪**。必须同时给出混淆矩阵，否则无法看出系统是否把「肝阳上亢」全判成「肝火上炎」。\n\n> **免责声明：** 本章的评估方法用于系统研发与教学；任何辨证系统的临床使用须经伦理审查、前瞻验证与监管审批，本章数据不构成疗效或安全性证据。\n\n## 练习\n\n1. 给混淆矩阵加一列「医生之间不一致」的样本，观察 kappa 如何变化。\n2. 用同一份矩阵算 PABAK，比较它与 kappa 的差异，说明各自适合的报告场景。\n3. 若三类样本占比为 90%/5%/5%，系统全判第一类，$p_o$ 与 $\\kappa$ 各是多少？\n\n## 进阶思考\n\n一致性评估最容易被当成「验收指标」：数字够了就上线。但一个只跟人类保持一致的模型，天花板就是人类的一致性水平——而人类彼此的一致性本身可能只有 0.6。先把噪声底测出来，再谈系统好不好。\n",
    "code": {
      "main.js": "'use strict';\n/**\n * 与医生诊断的一致性：混淆矩阵 → 原始一致率 / kappa / PABAK\n *\n *   node code/main.js\n *\n * 口径：\n *   po   = 对角线之和 / 总数\n *   pe   = Σ(行占比 × 列占比)        —— 随机猜的期望一致率\n *   kappa= (po - pe) / (1 - pe)\n *   PABAK= 2·po - 1                  —— 对患病率不敏感的替代指标\n *\n * 三者必须一起报：只看 kappa 会在类别极不平衡时得出反直觉结论。\n */\n\nconst CATS = ['肝气郁结', '肝火上炎', '肝胆湿热'];\n\nfunction stats(matrix) {\n  const n = matrix.flat().reduce((a, b) => a + b, 0);\n  if (!n) throw new Error('混淆矩阵为空');\n  const k = matrix.length;\n  for (const row of matrix) {\n    if (row.length !== k) throw new Error('混淆矩阵必须是方阵');\n  }\n\n  const diag = matrix.reduce((s, row, i) => s + row[i], 0);\n  const po = diag / n;\n\n  const rowSum = matrix.map((r) => r.reduce((a, b) => a + b, 0) / n);\n  const colSum = matrix[0].map((_, j) => matrix.reduce((s, r) => s + r[j], 0) / n);\n  const pe = rowSum.reduce((s, r, i) => s + r * colSum[i], 0);\n\n  return {\n    n,\n    po: +po.toFixed(3),\n    pe: +pe.toFixed(3),\n    kappa: pe === 1 ? null : +((po - pe) / (1 - pe)).toFixed(3),\n    pabak: +(2 * po - 1).toFixed(3),\n  };\n}\n\nconst CASES = [\n  {\n    name: 'A：类别极不平衡，系统全判第一类',\n    m: [\n      [90, 0, 0],\n      [10, 0, 0],\n      [5, 0, 0],\n    ],\n  },\n  {\n    name: 'B：均衡且几乎全对',\n    m: [\n      [30, 1, 0],\n      [1, 29, 1],\n      [0, 1, 30],\n    ],\n  },\n];\n\nfunction main() {\n  for (const c of CASES) {\n    const s = stats(c.m);\n    console.log(`\\n${c.name}（n=${s.n}）`);\n    console.log(`  po=${s.po}  pe=${s.pe}  kappa=${s.kappa ?? '—'}  PABAK=${s.pabak}`);\n    console.log(\n      s.kappa !== null && s.kappa < 0.2\n        ? '  注意：一致率高但 kappa 低 —— 这是\"碰巧对上\"，不是\"学会了\"。'\n        : '  注意：仍需结合混淆矩阵看错在哪一类。',\n    );\n  }\n  console.log(`\\n分类：${CATS.join(' / ')}`);\n  console.log('本输出为教学样例，不构成系统有效性证据。');\n}\n\nif (require.main === module) main();\nmodule.exports = { stats, CATS };\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { stats } = require('./main.js');\n\ntest('全对的矩阵：po=1，kappa=1', () => {\n  const r = stats([[5, 0], [0, 5]]);\n  assert.strictEqual(r.po, 1);\n  assert.strictEqual(r.kappa, 1);\n});\n\ntest('类别极不平衡且全判一类：一致率高但 kappa=0', () => {\n  const r = stats([[90, 0, 0], [10, 0, 0], [5, 0, 0]]);\n  assert.ok(r.po > 0.8);\n  assert.strictEqual(r.kappa, 0);\n});\n\ntest('PABAK 对不平衡不敏感，与 kappa 形成对照', () => {\n  const r = stats([[90, 0, 0], [10, 0, 0], [5, 0, 0]]);\n  assert.ok(r.pabak > 0.5); // 2×0.857−1\n  assert.notStrictEqual(r.pabak, r.kappa);\n});\n\ntest('均衡且几乎全对：kappa 明显高于 0.8', () => {\n  const r = stats([[30, 1, 0], [1, 29, 1], [0, 1, 30]]);\n  assert.ok(r.kappa > 0.85);\n});\n\ntest('非方阵与空矩阵必须抛错', () => {\n  assert.throws(() => stats([[1, 2], [3, 4], [5, 6]]), /方阵/);\n  assert.throws(() => stats([[0, 0], [0, 0]]), /为空/);\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "评估「系统与医生一致」之前，先要测什么？",
          "options": [
            "系统的推理速度",
            "医生彼此之间的一致性（它是这套评估的噪声底）",
            "系统的代码行数",
            "病人的满意度"
          ],
          "correct": 1,
          "explanation": "医生之间都不一致时，系统与单个医生的一致率没有解释力。"
        },
        {
          "stage": "check",
          "question": "kappa 的分母 1−pe 表示？",
          "options": [
            "总样本量",
            "扣掉「随机猜也能对上」之后剩余的可一致空间",
            "类别数",
            "错误率"
          ],
          "correct": 1,
          "explanation": "kappa 衡量的是超出随机水平的那部分一致。"
        },
        {
          "stage": "check",
          "question": "类别占比 90/5/5、系统全判第一类时，最可能的结果是？",
          "options": [
            "po 高、kappa 接近 0",
            "po 低、kappa 高",
            "po 与 kappa 都高",
            "po 与 kappa 都为 0"
          ],
          "correct": 0,
          "explanation": "这是 kappa 悖论的典型形态：一致率被多数类「撑」起来。"
        },
        {
          "stage": "check",
          "question": "PABAK 的作用是？",
          "options": [
            "替代样本量计算",
            "提供对类别不平衡不敏感的一致率指标",
            "检验正态性",
            "校正多重比较"
          ],
          "correct": 1,
          "explanation": "PABAK = 2·po−1，去掉了边际分布的依赖。"
        },
        {
          "stage": "post",
          "question": "系统与医生一致率 82%，能否直接写「达到临床可用水平」？",
          "options": [
            "能，82% 已经很高",
            "不能：需同时报 kappa、边际分布、医生间一致性，并说明一致不等于正确",
            "能，只要样本足够大",
            "不能，因为没有做 t 检验"
          ],
          "correct": 1,
          "explanation": "四个要件缺一不可；一致只是「像人」，不是「对」。"
        },
        {
          "stage": "post",
          "question": "若两位医生一致地判错，系统跟着错，会怎样？",
          "options": [
            "kappa 下降",
            "一致性评分提高，但系统实际上错了 —— 说明必须有金标准",
            "系统会被自动淘汰",
            "无法计算 kappa"
          ],
          "correct": 1,
          "explanation": "一致性评估无法替代金标准验证，这是本课最重要的边界。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-yizhixing-pinggu.md",
        "kind": "prompt",
        "file": "departments/07-zhineng/06-zhongyi-zhineng-bianzheng/chapters/07-yizhixing-pinggu/outputs/prompt-yizhixing-pinggu.md",
        "title": "一致性评估报告单",
        "description": null,
        "chars": 770,
        "body": "# 一致性评估报告单\n\n## 用途\n\n给一份「系统 vs 医生」的辨证对照结果写评估报告：混淆矩阵、原始一致率、kappa、PABAK、医生间一致性、\n以及「这份数字不能证明什么」。用于**论文与答辩材料、内部评审、系统上线前自查**。\n\n## 提示词\n\n```text\n你是医学 AI 评估的统计助手。下面是一份系统与医生的辨证对照表（行=系统判定，列=医生判定）。\n\n规则：\n1. 先给混淆矩阵，不要只给一个百分比。矩阵的类别顺序必须写出来。\n2. 计算并同时报告：po（原始一致率）、kappa、PABAK；若任一类占比 >70%，必须提示 kappa 可能失真。\n3. 报告医生之间的一致性（如两名医生交叉判定同一批病例的 kappa）。若没有这项，明确写「未测量，一致性结论不完整」。\n4. 禁止写「达到临床可用水平」「准确率 82% 因此可用」。只允许写「与医生判定的原始一致率为 …，kappa …」。\n5. 单列一段「不能证明什么」：一致不等于正确；无金标准；样本构成；医生判定的可靠性。\n\n输出格式：\n【混淆矩阵】类别顺序 …；行列 …\n【指标】po=… ；kappa=… ；PABAK=… ；医生间 kappa=…\n【表述建议】…\n【不能证明】1) … 2) …\n```\n\n## 使用示例\n\n输入：三类（肝气郁结/肝火上炎/肝胆湿热），系统全判第一类，医生判定分布 90/10/5。\n\n输出：【指标】po=0.857；kappa=0.000；PABAK=0.714；医生间 kappa=未测量\n【表述建议】原始一致率 0.857，但 kappa 为 0 —— 系统并未区分三类，一致来自多数类。\n【不能证明】系统具备辨证能力；未测医生间一致性；未设金标准。\n\n## 为什么这样限制\n\n- 强制给矩阵：只给百分比时，读者无法判断「一致」来自能力还是来自分布。\n- 强制查医生间一致性：缺了它，一致率没有参照系。\n- 禁写「可用」：一致性研究的结论边界就在这里，越过一步就是过度声明。\n"
      },
      {
        "name": "skill-yizhixing-pinggu.md",
        "kind": "skill",
        "file": "departments/07-zhineng/06-zhongyi-zhineng-bianzheng/chapters/07-yizhixing-pinggu/outputs/skill-yizhixing-pinggu.md",
        "title": "yizhixing-pinggu",
        "description": "系统与医生辨证一致性评估：混淆矩阵、kappa、PABAK，并写明不能据此声称临床可用",
        "chars": 622,
        "body": "---\nname: yizhixing-pinggu\ndescription: 系统与医生辨证一致性评估：混淆矩阵、kappa、PABAK，并写明不能据此声称临床可用\nversion: 0.1.0\n---\n\n# yizhixing-pinggu\n\n## 何时使用\n\n- 辨证系统研发中，需要一份可复核的一致性报告\n- 答辩/投稿前自查：一致率是否被过度解读\n- 内部评审：判断「一致」是能力还是分布造成的\n\n## 不适用\n\n- 需要证明系统正确性的场景（必须有金标准与前瞻验证）\n- 只有一致率、没有逐例对照表的结果（无法计算 kappa）\n- 多中心、多医生、跨设备的一致性研究设计（需要专门的 ICC/kappa 方案）\n\n## 步骤\n\n1. **列矩阵**：行=系统，列=医生，类别顺序写死。\n2. **算三指标**：po、kappa、PABAK；同时报边际分布。\n3. **查医生间一致性**：没有就写「未测量」。\n4. **写局限**：一致≠正确、无金标准、样本构成、医生判定可靠性。\n5. **给表述**：只描述数字，不写「可用」。\n\n## 输出模板\n\n```text\n【混淆矩阵】类别顺序：…；参与例数：…\n【指标】po=… ；kappa=… ；PABAK=… ；医生间 kappa=…\n【表述】与医生判定的原始一致率 …，kappa …（解释：…）\n【不能证明】1) … 2) …\n```\n\n## 质量判据\n\n- 类别顺序与矩阵同时出现\n- 类别极不平衡时必有 kappa 失真提示\n- 结论段没有「准确率/可用/达标」这类词\n\n> 本技能输出为评估辅助，不构成系统有效性或临床可用性证据。\n"
      }
    ],
    "video": null,
    "videoPoster": null
  },
  "08-wuguan/06-zhongyi-yanke-xue/01-wulun-bakuo": {
    "key": "08-wuguan/06-zhongyi-yanke-xue/01-wulun-bakuo",
    "deptSlug": "08-wuguan",
    "deptTitle": "五官口腔系",
    "subjectSlug": "06-zhongyi-yanke-xue",
    "subjectTitle": "中医眼科学",
    "chapterSlug": "01-wulun-bakuo",
    "n": 1,
    "title": "第 1 章 · 五轮八廓学说与眼的脏腑配属：一张能查、也能被质疑的映射表",
    "motto": "「五轮者，五脏之精华所发也。」——《银海精微·五轮八廓总论》",
    "problem": "病人白睛红、黑睛有翳、瞳神不清，你知道该「从肺、从肝、从肾」想，但说不清这三个判断的依据是同一套映射，也说不出这套映射在古代就有分歧。",
    "roots": "环境逼迫(眼科门诊要在几分钟内把局部体征落到脏腑) + 知识积累(五轮学说 × 可查的映射表 = 一套既能用、又能标出争议的编码)",
    "html": "<h1 id=\"第-1-章-五轮八廓学说与眼的脏腑配属-一张能查-也能被质疑的映射表\">第 1 章 · 五轮八廓学说与眼的脏腑配属：一张能查、也能被质疑的映射表</h1>\n<blockquote><p><strong>MOTTO:</strong> 「五轮者，五脏之精华所发也。」——《银海精微·五轮八廓总论》</p>\n<p><strong>PROBLEM:</strong> 病人白睛红、黑睛有翳、瞳神不清，你知道该「从肺、从肝、从肾」想，但说不清这三个判断的依据是同一套映射，也说不出这套映射在古代就有分歧。</p>\n<p><strong>双根因定位:</strong> 环境逼迫(眼科门诊要在几分钟内把局部体征落到脏腑) + 知识积累(五轮学说 × 可查的映射表 = 一套既能用、又能标出争议的编码)</p></blockquote>\n<h2 id=\"课程信息\">课程信息</h2>\n<div class=\"table-wrap\"><table><thead><tr><th>项目</th><th>内容</th></tr></thead><tbody><tr><td>学科</td><td>中医眼科学</td></tr><tr><td>院系</td><td>五官口腔系</td></tr><tr><td>章序号</td><td>01 / 10</td></tr><tr><td>所属阶段</td><td>🌳 壮·鼎盛</td></tr><tr><td>产出类型</td><td>📋 Prompt 模板 / 🛠️ Skill 文件</td></tr><tr><td>预估时长</td><td>3 小时</td></tr></tbody></table></div>\n<h2 id=\"学习目标\">学习目标</h2>\n<ul><li>背下并写清五轮与五脏的对应（肉轮—脾、血轮—心、气轮—肺、风轮—肝、水轮—肾）及各轮解剖范围</li><li>把「局部体征 → 轮位 → 脏腑」做成三级查表，并在表里标注<strong>版本与争议</strong></li><li>说清八廓与五轮的关系，以及为什么八廓的配属在历代文献里并不统一</li><li>指出「配属」与「辨证」不是一回事：映射给出思考方向，不给诊断结论</li></ul>\n<h2 id=\"核心概念\">核心概念</h2>\n<h3 id=\"中医-五轮是分区-八廓是另一套分区\">中医：五轮是分区，八廓是另一套分区</h3>\n<p>《银海精微》把眼由外向内分为肉轮（胞睑）、血轮（两眦）、气轮（白睛）、风轮（黑睛）、水轮（瞳神），分别配属脾、心、肺、肝、肾。这是一套<strong>空间分区 + 脏腑归约</strong>的模型：看到哪一区的病变，就先想到它对应的脏。</p>\n<p>八廓是另一套分区，历代配属不同（有以八卦方位配、有以脏腑配、有以部位配），《审视瑶函》与《银海精微》的写法就不完全一致。这一点必须讲清：<strong>五轮相对稳定，八廓相对不稳定</strong>。教材把八廓放在次要位置，是有理由的。</p>\n<h3 id=\"ai-工程-把映射做成带版本的表\">AI/工程：把映射做成带版本的表</h3>\n<p>一张可用的映射表至少要有三列：<strong>体征定位</strong>（哪一区的什么表现）、<strong>轮位</strong>、<strong>脏腑</strong>；再加两列元数据：<strong>出处</strong>、<strong>争议标记</strong>。</p>\n<p>工程上这意味着：不要把「白睛红 → 肺热」写成一条规则常量，而要写成一条带 <code>source</code> 与 <code>disputed</code> 字段的记录。否则三年后没人说得清这条规则从哪来，也没法在有新版本时只替换有争议的部分。</p>\n<h2 id=\"build-it-从零实现\">BUILD IT：从零实现</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">js</div><pre><code class=\"lang-js\">const WULUN = [\n  { lun: '肉轮', area: '胞睑', zang: '脾', source: '《银海精微·五轮八廓总论》', disputed: false },\n  { lun: '血轮', area: '两眦', zang: '心', source: '同上', disputed: false },\n  { lun: '气轮', area: '白睛', zang: '肺', source: '同上', disputed: false },\n  { lun: '风轮', area: '黑睛', zang: '肝', source: '同上', disputed: false },\n  { lun: '水轮', area: '瞳神', zang: '肾', source: '同上', disputed: false },\n];\nfunction locate(sign) { /* 体征 → {轮, 脏, 出处} 或 null */ }</code></pre></div>\n<p>八廓单列为 <code>BAKUO</code>，并带 <code>disputed: true</code> —— 不是「不能用」，而是「用的时候必须说明版本」。</p>\n<h2 id=\"验证\">验证</h2>\n<div class=\"codeblock\"><div class=\"codeblock-lang\">bash</div><pre><code class=\"lang-bash\">node code/main.js\nnode --test code/main.test.js</code></pre></div>\n<p>预期：输入「白睛红赤」返回气轮/肺；输入「胞睑红肿」返回肉轮/脾；输入四不像的描述返回 <code>null</code> 并提示「无法定位，不得强行归轮」。</p>\n<h2 id=\"代价与边界\">代价与边界</h2>\n<ul><li><strong>映射是分区启发，不是病理机制</strong>。白睛属肺不等于白睛病变都由肺引起；把配属当成因果，是这套学说最常被误用的地方。</li><li><strong>八廓的版本分歧无法在本表内消解</strong>。标 <code>disputed</code> 只是承认分歧，不是解决分歧；涉及八廓时必须以具体文献版本为准。</li><li><strong>一处体征可能落在两区交界</strong>（如眦部与白睛交界），本表的单值返回会掩盖这种模糊，实际应返回多候选。</li><li><strong>它不包含全身辨证</strong>。五轮只管「眼局部落到哪一脏」，寒热虚实仍需四诊合参。</li></ul>\n<blockquote><p><strong>免责声明：</strong> 本章的映射表用于教学与知识编码演练，不构成诊断依据；眼部急性视力下降、剧痛、外伤须立即转急诊眼科处理。</p></blockquote>\n<h2 id=\"练习\">练习</h2>\n<ol><li>把 <code>locate</code> 改成返回候选数组（支持跨区体征），说明这对下游规则有什么影响。</li><li>查两个不同版本的八廓配属，列出至少两处差异，并设计表结构容纳它们。</li><li>若病人白睛红 + 瞳神不清同时出现，按本表应该输出什么？为什么不能简单取「更严重」的那个？</li></ol>\n<h2 id=\"进阶思考\">进阶思考</h2>\n<p>中医眼科的分区模型之所以能传下来，不是因为它精确，而是因为它<strong>可教、可记、可指向</strong>。把它编码成表时，最该保留的恰恰是「哪里有争议」——抹掉争议的表看起来更干净，却把最重要的学术信息删掉了。</p>",
    "markdown": "# 第 1 章 · 五轮八廓学说与眼的脏腑配属：一张能查、也能被质疑的映射表\n\n> **MOTTO:** 「五轮者，五脏之精华所发也。」——《银海精微·五轮八廓总论》\n>\n> **PROBLEM:** 病人白睛红、黑睛有翳、瞳神不清，你知道该「从肺、从肝、从肾」想，但说不清这三个判断的依据是同一套映射，也说不出这套映射在古代就有分歧。\n>\n> **双根因定位:** 环境逼迫(眼科门诊要在几分钟内把局部体征落到脏腑) + 知识积累(五轮学说 × 可查的映射表 = 一套既能用、又能标出争议的编码)\n\n## 课程信息\n\n| 项目 | 内容 |\n|------|------|\n| 学科 | 中医眼科学 |\n| 院系 | 五官口腔系 |\n| 章序号 | 01 / 10 |\n| 所属阶段 | 🌳 壮·鼎盛 |\n| 产出类型 | 📋 Prompt 模板 / 🛠️ Skill 文件 |\n| 预估时长 | 3 小时 |\n\n## 学习目标\n\n- 背下并写清五轮与五脏的对应（肉轮—脾、血轮—心、气轮—肺、风轮—肝、水轮—肾）及各轮解剖范围\n- 把「局部体征 → 轮位 → 脏腑」做成三级查表，并在表里标注**版本与争议**\n- 说清八廓与五轮的关系，以及为什么八廓的配属在历代文献里并不统一\n- 指出「配属」与「辨证」不是一回事：映射给出思考方向，不给诊断结论\n\n## 核心概念\n\n### 中医：五轮是分区，八廓是另一套分区\n\n《银海精微》把眼由外向内分为肉轮（胞睑）、血轮（两眦）、气轮（白睛）、风轮（黑睛）、水轮（瞳神），分别配属脾、心、肺、肝、肾。这是一套**空间分区 + 脏腑归约**的模型：看到哪一区的病变，就先想到它对应的脏。\n\n八廓是另一套分区，历代配属不同（有以八卦方位配、有以脏腑配、有以部位配），《审视瑶函》与《银海精微》的写法就不完全一致。这一点必须讲清：**五轮相对稳定，八廓相对不稳定**。教材把八廓放在次要位置，是有理由的。\n\n### AI/工程：把映射做成带版本的表\n\n一张可用的映射表至少要有三列：**体征定位**（哪一区的什么表现）、**轮位**、**脏腑**；再加两列元数据：**出处**、**争议标记**。\n\n工程上这意味着：不要把「白睛红 → 肺热」写成一条规则常量，而要写成一条带 `source` 与 `disputed` 字段的记录。否则三年后没人说得清这条规则从哪来，也没法在有新版本时只替换有争议的部分。\n\n## BUILD IT：从零实现\n\n```js\nconst WULUN = [\n  { lun: '肉轮', area: '胞睑', zang: '脾', source: '《银海精微·五轮八廓总论》', disputed: false },\n  { lun: '血轮', area: '两眦', zang: '心', source: '同上', disputed: false },\n  { lun: '气轮', area: '白睛', zang: '肺', source: '同上', disputed: false },\n  { lun: '风轮', area: '黑睛', zang: '肝', source: '同上', disputed: false },\n  { lun: '水轮', area: '瞳神', zang: '肾', source: '同上', disputed: false },\n];\nfunction locate(sign) { /* 体征 → {轮, 脏, 出处} 或 null */ }\n```\n\n八廓单列为 `BAKUO`，并带 `disputed: true` —— 不是「不能用」，而是「用的时候必须说明版本」。\n\n## 验证\n\n```bash\nnode code/main.js\nnode --test code/main.test.js\n```\n\n预期：输入「白睛红赤」返回气轮/肺；输入「胞睑红肿」返回肉轮/脾；输入四不像的描述返回 `null` 并提示「无法定位，不得强行归轮」。\n\n## 代价与边界\n\n- **映射是分区启发，不是病理机制**。白睛属肺不等于白睛病变都由肺引起；把配属当成因果，是这套学说最常被误用的地方。\n- **八廓的版本分歧无法在本表内消解**。标 `disputed` 只是承认分歧，不是解决分歧；涉及八廓时必须以具体文献版本为准。\n- **一处体征可能落在两区交界**（如眦部与白睛交界），本表的单值返回会掩盖这种模糊，实际应返回多候选。\n- **它不包含全身辨证**。五轮只管「眼局部落到哪一脏」，寒热虚实仍需四诊合参。\n\n> **免责声明：** 本章的映射表用于教学与知识编码演练，不构成诊断依据；眼部急性视力下降、剧痛、外伤须立即转急诊眼科处理。\n\n## 练习\n\n1. 把 `locate` 改成返回候选数组（支持跨区体征），说明这对下游规则有什么影响。\n2. 查两个不同版本的八廓配属，列出至少两处差异，并设计表结构容纳它们。\n3. 若病人白睛红 + 瞳神不清同时出现，按本表应该输出什么？为什么不能简单取「更严重」的那个？\n\n## 进阶思考\n\n中医眼科的分区模型之所以能传下来，不是因为它精确，而是因为它**可教、可记、可指向**。把它编码成表时，最该保留的恰恰是「哪里有争议」——抹掉争议的表看起来更干净，却把最重要的学术信息删掉了。\n",
    "code": {
      "main.js": "'use strict';\n/**\n * 五轮八廓：眼局部体征 → 轮位 → 脏腑 的查表\n *\n *   node code/main.js\n *\n * 口径：\n *   五轮（《银海精微·五轮八廓总论》）：胞睑=肉轮=脾 / 两眦=血轮=心 / 白睛=气轮=肺\n *                                    黑睛=风轮=肝 / 瞳神=水轮=肾\n *   八廓：历代配属不一致 —— 一律标 disputed，使用时须指明版本\n *\n * 为什么带上 source 与 disputed：映射表一旦进代码就会变成\"事实\"，\n * 而八廓的版本分歧是真实的学术信息，不能在编码时被抹平。\n */\n\nconst WULUN = [\n  { lun: '肉轮', area: '胞睑', zang: '脾', source: '《银海精微·五轮八廓总论》', disputed: false },\n  { lun: '血轮', area: '两眦', zang: '心', source: '《银海精微·五轮八廓总论》', disputed: false },\n  { lun: '气轮', area: '白睛', zang: '肺', source: '《银海精微·五轮八廓总论》', disputed: false },\n  { lun: '风轮', area: '黑睛', zang: '肝', source: '《银海精微·五轮八廓总论》', disputed: false },\n  { lun: '水轮', area: '瞳神', zang: '肾', source: '《银海精微·五轮八廓总论》', disputed: false },\n];\n\n// 八廓只做「承认存在」的登记，不给单值配属\nconst BAKUO = {\n  names: ['天廓', '地廓', '火廓', '水廓', '风廓', '雷廓', '泽廓', '山廓'],\n  disputed: true,\n  note: '历代配属不一（《银海精微》与《审视瑶函》不同），编码时不取单值',\n};\n\n/** 体征关键词 → 部位（用于查表；关键词必须来自原文，不做同义扩展） */\nconst SIGN_HINTS = [\n  { area: '胞睑', keys: ['胞睑', '眼睑', '上睑', '下睑'] },\n  { area: '两眦', keys: ['眦', '目内眦', '目外眦'] },\n  { area: '白睛', keys: ['白睛', '球结膜'] },\n  { area: '黑睛', keys: ['黑睛', '角膜'] },\n  { area: '瞳神', keys: ['瞳神', '瞳孔'] },\n];\n\nfunction locate(sign) {\n  const hits = SIGN_HINTS.filter((h) => h.keys.some((k) => sign.includes(k)));\n  // 一处体征命中两个部位（如「眦部白睛」）→ 返回多个候选，不替使用者做取舍\n  const rows = hits.map((h) => WULUN.find((w) => w.area === h.area)).filter(Boolean);\n  if (!rows.length) return null;\n  return rows;\n}\n\nfunction main() {\n  for (const sign of ['白睛红赤', '胞睑红肿', '眦部白睛充血', '视物模糊']) {\n    const r = locate(sign);\n    if (!r) {\n      console.log(`${sign} → 无法定位到五轮；不得强行归轮，需结合专科检查`);\n      continue;\n    }\n    for (const x of r) {\n      console.log(`${sign} → ${x.lun}（${x.area}）→ ${x.zang}脏（出处：${x.source}${x.disputed ? '；有争议' : ''}）`);\n    }\n    if (r.length > 1) console.log(`  注意：命中 ${r.length} 个轮位，属跨区体征，下游应保留多候选`);\n  }\n  console.log('\\n本输出为教学样例，不构成诊断依据；急性视力下降/剧痛/外伤须急诊处理。');\n}\n\nif (require.main === module) main();\nmodule.exports = { WULUN, BAKUO, SIGN_HINTS, locate };\n",
      "main.test.js": "'use strict';\nconst assert = require('node:assert');\nconst test = require('node:test');\nconst { WULUN, BAKUO, locate } = require('./main.js');\n\ntest('五轮与五脏一一对应，且没有重复轮位', () => {\n  const pairs = WULUN.map((w) => `${w.lun}:${w.zang}`);\n  assert.deepStrictEqual(pairs, ['肉轮:脾', '血轮:心', '气轮:肺', '风轮:肝', '水轮:肾']);\n});\n\ntest('白睛 → 气轮 → 肺', () => {\n  const r = locate('白睛红赤');\n  assert.strictEqual(r.length, 1);\n  assert.strictEqual(r[0].zang, '肺');\n});\n\ntest('瞳神 → 水轮 → 肾', () => {\n  const r = locate('瞳神不清');\n  assert.strictEqual(r[0].zang, '肾');\n});\n\ntest('跨区体征返回多候选，不擅自取一个', () => {\n  const r = locate('眦部白睛充血');\n  assert.strictEqual(r.length, 2);\n  assert.deepStrictEqual(r.map((x) => x.lun).sort(), ['气轮', '血轮']);\n});\n\ntest('无法定位时返回 null，禁止默认归轮', () => {\n  assert.strictEqual(locate('视物模糊'), null);\n});\n\ntest('八廓被标记为有争议，且不提供单值配属', () => {\n  assert.strictEqual(BAKUO.disputed, true);\n  assert.strictEqual(BAKUO.names.length, 8);\n  assert.ok(!('map' in BAKUO) || !BAKUO.map);\n});\n"
    },
    "quiz": {
      "questions": [
        {
          "stage": "pre",
          "question": "五轮中「气轮」对应哪一部位与脏腑？",
          "options": [
            "胞睑 / 脾",
            "白睛 / 肺",
            "黑睛 / 肝",
            "瞳神 / 肾"
          ],
          "correct": 1,
          "explanation": "白睛属气轮，配肺。"
        },
        {
          "stage": "check",
          "question": "五轮与八廓的稳定性差别在于？",
          "options": [
            "两者完全一致",
            "五轮配属相对稳定，八廓历代配属不一",
            "八廓比五轮更稳定",
            "五轮只用于内科"
          ],
          "correct": 1,
          "explanation": "八廓的版本分歧是真实的学术信息，编码时不能抹平。"
        },
        {
          "stage": "check",
          "question": "本课的表为什么带 source 与 disputed 字段？",
          "options": [
            "为了让 JSON 更长",
            "为了让映射可溯源、可替换，并把争议保留下来",
            "为了通过编译",
            "为了兼容旧系统"
          ],
          "correct": 1,
          "explanation": "没有出处与争议标记，规则会变成无法追责的「事实」。"
        },
        {
          "stage": "check",
          "question": "体征同时落在两眦与白睛交界，正确输出是？",
          "options": [
            "只返回血轮",
            "只返回气轮",
            "返回两个候选，交下游保留多解",
            "报错退出"
          ],
          "correct": 2,
          "explanation": "跨区体征强行单值化会丢失信息。"
        },
        {
          "stage": "post",
          "question": "「白睛属肺」最准确的理解是？",
          "options": [
            "白睛病变都由肺引起",
            "提供思考方向的分区启发，不等于病理机制",
            "肺病必然出现白睛红",
            "白睛只能从肺论治"
          ],
          "correct": 1,
          "explanation": "配属是提示，不是因果；把它当机制是这套学说最常被误用的地方。"
        },
        {
          "stage": "post",
          "question": "病人突发视力下降伴剧痛，本表应如何参与处理？",
          "options": [
            "先按五轮归脏再决定",
            "立即转急诊眼科，映射表不参与急症判断",
            "查八廓定位",
            "按气轮肺热处理"
          ],
          "correct": 1,
          "explanation": "急症优先，任何理论映射都不能延误处理。"
        }
      ]
    },
    "exercises": null,
    "outputs": [
      {
        "name": "prompt-wulun-bakuo.md",
        "kind": "prompt",
        "file": "departments/08-wuguan/06-zhongyi-yanke-xue/chapters/01-wulun-bakuo/outputs/prompt-wulun-bakuo.md",
        "title": "眼科体征归轮助手",
        "description": null,
        "chars": 587,
        "body": "# 眼科体征归轮助手\n\n## 用途\n\n把一段眼科门诊记录里的局部体征，归到五轮与脏腑，输出**带出处与争议标记**的映射结果，\n用于**教学、病历结构化、知识库校对**。不用于下诊断。\n\n## 提示词\n\n```text\n你是中医眼科学的助教。下面是一段眼科门诊记录的局部体征描述。\n\n规则：\n1. 只按五轮归位：胞睑=肉轮=脾 / 两眦=血轮=心 / 白睛=气轮=肺 / 黑睛=风轮=肝 / 瞳神=水轮=肾。\n2. 体征必须逐字取自原文；原文没提到的部位，不要推断。\n3. 一处体征跨两个部位时，输出两个候选，并注明「跨区，需结合专科检查」，不得自行取一。\n4. 涉及八廓时，一律注明「历代配属不一，须指明版本」，不得给单值结论。\n5. 不写证型、不写治法、不写方药。只输出归轮结果与缺口。\n\n输出格式：\n【体征 → 轮位 → 脏腑】（逐条，含出处）\n【跨区提示】…\n【缺口】原文未描述的部位：…\n```\n\n## 使用示例\n\n输入：「左眼白睛红赤，胞睑轻度红肿，无明显视力下降。」\n\n输出：【体征 → 轮位】白睛红赤 → 气轮 → 肺（《银海精微·五轮八廓总论》）；胞睑红肿 → 肉轮 → 脾（同）\n【跨区提示】无【缺口】两眦、黑睛、瞳神未描述。\n\n## 为什么这样限制\n\n- 逐字取自原文：防止把「眼红」升格成「白睛红赤」，那是替病人加体征。\n- 跨区保留多候选：单值化会丢掉交界处的鉴别信息。\n- 八廓必须带版本：不给版本就等于把分歧藏起来。\n- 不写证型治法：归轮是分区，辨证是另一层，混在一起就变成「看图开方」。\n"
      },
      {
        "name": "skill-wulun-bakuo.md",
        "kind": "skill",
        "file": "departments/08-wuguan/06-zhongyi-yanke-xue/chapters/01-wulun-bakuo/outputs/skill-wulun-bakuo.md",
        "title": "wulun-bakuo",
        "description": "眼科局部体征归到五轮与脏腑，输出带出处与争议标记的映射，并保留跨区多候选",
        "chars": 530,
        "body": "---\nname: wulun-bakuo\ndescription: 眼科局部体征归到五轮与脏腑，输出带出处与争议标记的映射，并保留跨区多候选\nversion: 0.1.0\n---\n\n# wulun-bakuo\n\n## 何时使用\n\n- 眼科门诊记录需要把体征结构化到五轮\n- 教学：演示「白睛属肺」这类配属的边界\n- 知识库校对：检查已有规则的出处与争议标记是否齐全\n\n## 不适用\n\n- 下证型结论或开方（本技能只做归轮）\n- 八廓的单值判定（历代配属不一，不给单值）\n- 急症：视力骤降、剧痛、外伤、化学伤（立即转急诊）\n\n## 步骤\n\n1. **摘体征**：逐字取自原文，标明部位。\n2. **查五轮**：胞睑肉轮脾 / 两眦血轮心 / 白睛气轮肺 / 黑睛风轮肝 / 瞳神水轮肾。\n3. **处理跨区**：命中两个部位 → 输出两候选 + 提示。\n4. **标出处**：每条给《书名·篇名》；涉及八廓写「须指明版本」。\n5. **列缺口**：原文未描述的部位，逐一列出。\n\n## 输出模板\n\n```text\n【体征 → 轮位 → 脏腑】<体征> → <轮> → <脏>（出处：…）\n【跨区提示】…\n【缺口】未描述：…\n【边界】仅归轮，不含证型/治法；急症转诊优先。\n```\n\n## 质量判据\n\n- 每条映射都有出处\n- 跨区体征不止一个候选\n- 输出里没有证型、治法、方药\n\n> 本技能输出为教学与结构化辅助，不构成诊断依据。\n"
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
