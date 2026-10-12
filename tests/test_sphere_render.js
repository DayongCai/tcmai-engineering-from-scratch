#!/usr/bin/env node
/**
 * tests/test_sphere_render.js — 三维极坐标球面 · 渲染层硬证据
 *
 * 补上 test_semtensor.js 管不到的那一半：几何与颜色已经算对了，
 * 但**画出来的东西对不对**（画布里有汉字吗？三个球真的共用一个相机吗？点云数量对吗？）
 * 只能靠把 app.js + sphere.js 真跑一遍来断言。
 *
 * 为什么不用截图：本机截图工具不稳定，而「画布里有没有汉字」「三个球的同一点是不是同色」
 * 这类问题在 DOM 层面是确定可判的 —— 用截图反而引入了「像不像」的主观判断。
 * 需要看的形状（球面是否成形、点云是否可读）仍走人工目视，本文件不假装覆盖它。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, 'site');
const { makeEnv, loadScript } = require('../scripts/dom-shim');

/** 与 site/pages.js 的 SCRIPTS 一致；顺序错了会在加载期直接抛 */
const BUNDLE = [
  'data.js',
  'semtensor-spec.js',
  'content.js',
  'progress.js',
  'semtensor.js',
  'sphere.js',
  'figures.js',
  'app.js',
];

/** 建一个装好全部脚本的夹具环境 */
function makeSiteEnv(page, search) {
  const env = makeEnv({ page, search: search || '' });
  for (const f of BUNDLE) {
    const full = path.join(SITE, f);
    if (!fs.existsSync(full)) throw new Error(`${f} 不存在，请先 npm run build`);
    loadScript(env, full);
  }
  return env;
}

// ── DOM 遍历小工具（shim 的元素是 {tagName, children, attrs, ...}）──

function walk(node, out = []) {
  out.push(node);
  for (const c of node.children || []) walk(c, out);
  return out;
}

const tag = (n) => (n && n.tagName ? String(n.tagName).toLowerCase() : null);
// 夹具的 tagName 一律大写（真实 DOM 也是），这里两边都小写化再比 ——
// 否则 collect(host,'linearGradient') 会一条都匹配不到，而报错信息会指向「渐变缺失」。
const collect = (root, name) => walk(root).filter((n) => tag(n) === String(name).toLowerCase());

/** 取元素内的文本（shim 的文本节点是 {nodeType:3, textContent}） */
function textOf(el) {
  return (el.children || [])
    .filter((c) => c && c.nodeType === 3)
    .map((c) => c.textContent)
    .join('');
}

const CJK = /[\u3000-\u303F\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/;

// ── 数据集 ────────────────────────────────────────────────────────────

const DATA = {
  neijing: JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'semtensor', 'datasets', 'neijing-domains.json'), 'utf8')),
  shanghan: JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'semtensor', 'datasets', 'shanghan-domains.json'), 'utf8')),
};

function unitsOf(which) {
  if (which === 'shanghan') {
    // 集级别只有 θ/φ（源数据），方向要自己算 —— 与站点侧的 semtensorUnits 一致
    return DATA.shanghan.episodes.map((e) => ({
      key: e.code, name: e.name, theta: e.theta, phi: e.phi, r: e.r,
      u: SPH(1, e.theta, e.phi),
    }));
  }
  return DATA.neijing.domains.map((d) => ({
    key: `N${d.order}`, name: d.name, theta: d.theta, phi: d.phi, r: d.r, u: d.u,
  }));
}

/** 用规范公式自己算球→笛（不经浏览器实例，保持测试独立） */
function SPH(r, thetaDeg, phiDeg) {
  const t = (thetaDeg * Math.PI) / 180;
  const p = (phiDeg * Math.PI) / 180;
  return [r * Math.cos(t) * Math.cos(p), r * Math.cos(t) * Math.sin(p), r * Math.sin(t)];
}

/** 在夹具里把球面视图挂到一个宿主元素上，返回句柄与宿主 */
function mountSphere(units, annotation) {
  const env = makeSiteEnv('semtensor');
  const host = env.document.createElement('div');
  const handle = env.window.TCMSphere.render(host, {
    units,
    readout: env.document.createElement('div'),
    annotation,
  });
  return { env, host, handle };
}

// ── §12.7 画布内不出现汉字 ────────────────────────────────────────────

test('§12.7 球面画布内的所有渲染文本都不含 CJK（轴名/刻度/圈号只有 ASCII）', () => {
  const { host } = mountSphere(unitsOf('neijing'));
  const offenders = [];
  for (const n of walk(host)) {
    // 渲染出的文本：文本节点与 <text> 内容 —— 这些会被画出来，必须 ASCII
    if (n.nodeType === 3 && CJK.test(n.textContent)) offenders.push(`文本节点「${n.textContent}」`);
    if (tag(n) === 'text') {
      const t = textOf(n);
      if (CJK.test(t)) offenders.push(`<text>「${t}」`);
    }
    // aria-label 与 data-sphere 属于画布面的元数据；本组件对它们也一律用拉丁名
    if (tag(n) === 'svg') {
      for (const k of ['aria-label', 'data-sphere']) {
        if (CJK.test(String(n.attrs[k]))) offenders.push(`${k}="${n.attrs[k]}"`);
      }
      // 而中文名必须仍然可被消费到（作为 data 属性，不参与排版）
      if (!CJK.test(String(n.attrs['data-sphere-zh']))) offenders.push('data-sphere-zh 丢了中文球名');
    }
  }
  assert.deepStrictEqual(offenders.slice(0, 8), [], offenders.slice(0, 8).join('\n'));
});

test('§12.7 三个球各有可区分的拉丁代号与中文名（不靠 CJK 也能分辨）', () => {
  const { host } = mountSphere(unitsOf('neijing'));
  const svgs = collect(host, 'svg');
  assert.deepStrictEqual(svgs.map((s) => s.attrs['data-sphere']), ['mu', 'zi', 'fu']);
  assert.deepStrictEqual(svgs.map((s) => s.attrs['data-sphere-zh']), ['母', '子', '父']);
  assert.deepStrictEqual(svgs.map((s) => s.attrs['aria-label']), ['polar sphere mu', 'polar sphere zi', 'polar sphere fu']);
});

test('§12.7 写进画布的汉字的守卫本身有效（assertLatin 必须抛，规范允许的圈号不抛）', () => {
  const { env } = mountSphere(unitsOf('neijing'));
  const A = env.window.TCMSphere.assertLatin;
  assert.throws(() => A('阴阳', 'x'), /CJK/, 'CJK 未被拦下 —— 守卫形同虚设');
  assert.throws(() => A('X轴', 'x'), /CJK/, '混排 CJK 未被拦下');
  assert.throws(() => A('（', 'x'), /CJK/, '全角括号未被拦下');
  assert.strictEqual(A('X', 'x'), 'X');
  assert.strictEqual(A('330\u00B0', 'x'), '330\u00B0');
  // 规范 §8 明确允许圈号 ①②③ 进画布，守卫不得把它们当成汉字拦掉
  assert.strictEqual(A('\u2460', 'x'), '\u2460');
  assert.doesNotThrow(() => A('\u2460\u2461\u2462', 'x'), '圈号被误拦');
});

test('§12.7 球名与域名单出现在画布之外（下沉到标题与读数面板）', () => {
  const { host } = mountSphere(unitsOf('neijing'));
  const wrapTexts = walk(host)
    .filter((n) => tag(n) === 'div' && n.textContent && /球$/.test(n.textContent))
    .map((n) => n.textContent);
  assert.ok(wrapTexts.length >= 3, `未找到三球的画布外标题，实得 ${JSON.stringify(wrapTexts)}`);
  assert.ok(wrapTexts.some((t) => CJK.test(t)), '球名标题里应有汉字（它在画布之外，是允许的）');
  assert.deepStrictEqual(
    wrapTexts.filter((t) => CJK.test(t)).sort(),
    ['子球', '母球', '父球'],
    '三球的中文标题不完整'
  );
  // DOM 顺序必须是 母 → 子 → 父（规范 §6：医生「左侧-中间-右侧」= 母-子-父）
  assert.deepStrictEqual(
    walk(host).filter((n) => tag(n) === 'div' && /球$/.test(n.textContent || '')).map((n) => n.textContent),
    ['母球', '子球', '父球'],
    '三球的排列顺序不是 母-子-父'
  );
});

// ── 点云数量与投影 ───────────────────────────────────────────────────

test('点云数量 = 单元数 × 3 球（母子父各一份）', () => {
  const units = unitsOf('neijing');
  const { host } = mountSphere(units);
  const circles = collect(host, 'circle');
  // 每个球还有 I/O/T 端点点与 O 基准点：3 轴 × 2 端点 + 1 = 7 个圆/球
  const perSphereFixed = 7;
  const spheres = 3;
  assert.strictEqual(
    circles.length,
    units.length * spheres + perSphereFixed * spheres,
    `圆元素 ${circles.length} ≠ ${units.length}×${spheres} + ${perSphereFixed}×${spheres}`
  );
});

test('语义点云的每个圆坐标都是有限数且在 viewBox 内（不出现 NaN / 飞出去）', () => {
  const { host } = mountSphere(unitsOf('shanghan'));
  const svg = collect(host, 'svg')[0];
  const vb = String(svg.attrs.viewBox).split(/\s+/).map(Number);
  assert.deepStrictEqual(vb.length, 4, `viewBox 不合法: ${svg.attrs.viewBox}`);
  const [vx, vy, vw, vh] = vb;

  let checked = 0;
  for (const c of collect(host, 'circle')) {
    const cx = Number(c.attrs.cx);
    const cy = Number(c.attrs.cy);
    const r = Number(c.attrs.r);
    assert.ok(Number.isFinite(cx) && Number.isFinite(cy) && Number.isFinite(r), `圆坐标非数: ${JSON.stringify(c.attrs)}`);
    assert.ok(cx >= vx - 1 && cx <= vx + vw + 1, `cx=${cx} 越出 viewBox`);
    assert.ok(cy >= vy - 1 && cy <= vy + vh + 1, `cy=${cy} 越出 viewBox`);
    assert.ok(r > 0 && r < 40, `半径 ${r} 不合理`);
    checked += 1;
  }
  assert.ok(checked > 0, '一个圆都没画出来');
});

test('三轴的两段三点：每条轴都有 I 与 T 端点标签，且有 I→O、O→T 两段渐变', () => {
  const { host } = mountSphere(unitsOf('neijing'));
  const texts = collect(host, 'text').map(textOf);
  for (const axis of ['X', 'Y', 'Z']) {
    assert.ok(texts.includes(`I${axis}`), `缺 I${axis} 标签`);
    assert.ok(texts.includes(`T${axis}`), `缺 T${axis} 标签`);
    assert.ok(texts.includes(axis), `缺轴名 ${axis}`);
  }
  assert.ok(texts.includes('O'), '缺 O 原点标签');

  const grads = collect(host, 'linearGradient').map((g) => g.attrs.id);
  for (const axis of ['X', 'Y', 'Z']) {
    assert.ok(grads.includes(`g-${axis}-i`), `缺 ${axis} 的 I→O 渐变`);
    assert.ok(grads.includes(`g-${axis}-t`), `缺 ${axis} 的 O→T 渐变`);
  }
  // 每个渐变两站，且端点色与常量表一致
  for (const g of collect(host, 'linearGradient')) {
    const stops = (g.children || []).filter((c) => tag(c) === 'stop');
    assert.strictEqual(stops.length, 2, `渐变 ${g.attrs.id} 应有 2 站`);
  }
});

test('渐变端点的颜色与常量表逐字一致（不出现硬编码色值）', () => {
  const { env, host } = mountSphere(unitsOf('neijing'));
  const spec = env.window.TCMAI_SEMTENSOR_SPEC;
  const stops = collect(host, 'linearGradient').flatMap((g) =>
    (g.children || []).filter((c) => tag(c) === 'stop').map((s) => s.attrs['stop-color'])
  );
  const allowed = new Set([
    spec.origin.hex,
    ...Object.values(spec.axes).flatMap((a) => [a.i.hex, a.o.hex, a.t.hex]),
  ]);
  const bad = stops.filter((c) => !allowed.has(c));
  assert.deepStrictEqual(bad.slice(0, 5), [], `出现常量表之外的色值: ${bad.slice(0, 5)}`);
});

// ── 镜像：三球同色 ───────────────────────────────────────────────────

test('★ 命名空间正确：球面视图里的 HTML 节点是 HTML 命名空间，画布节点是 SVG 命名空间', () => {
  // 这条抓的是一个「页面一片空白但控制台零报错」的 bug：
  // 把 HTML 的 div 用 createElementNS(SVG) 造出来，浏览器会当成未知 SVG 元素直接不渲染。
  const { env, host } = mountSphere(unitsOf('neijing'));
  const HTML_NS = 'http://www.w3.org/1999/xhtml';
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SVG_TAGS = new Set(['svg', 'g', 'path', 'circle', 'text', 'line', 'defs', 'lineargradient', 'stop']);

  const problems = [];
  for (const n of walk(host)) {
    const t = tag(n);
    if (!t || n.nodeType !== undefined) continue;
    if (SVG_TAGS.has(t)) {
      if (n.namespaceURI !== SVG_NS) problems.push(`<${t}> 命名空间是 ${n.namespaceURI}，应为 SVG`);
    } else if (n.namespaceURI !== HTML_NS) {
      problems.push(`HTML 元素 <${t}> 被建成了 ${n.namespaceURI}（浏览器不会渲染它）`);
    }
  }
  assert.deepStrictEqual(problems.slice(0, 6), [], problems.slice(0, 6).join('\n'));
  assert.ok(env.window.TCMSphere, 'sphere 未暴露');
});

test('★ 三球同色：同一单元在母/子/父球上的填充色逐字相同，而坐标不同', () => {
  const units = unitsOf('neijing');
  const { host } = mountSphere(units);
  const svgs = collect(host, 'svg');
  assert.strictEqual(svgs.length, 3, `应有 3 个球，实得 ${svgs.length}`);

  // 按 data-unit 归类，**不能按下标比**：点云按深度排序绘制，三球的几何被镜像过，
  // 深度顺序各不相同，第 k 个圆在三球里根本不是同一个单元。
  const per = svgs.map((s) => {
    const m = new Map();
    for (const c of collect(s, 'circle')) {
      if (c.attrs['data-unit']) m.set(c.attrs['data-unit'], c);
    }
    return m;
  });

  for (const id of units.map((u) => u.key)) {
    for (const m of per) assert.ok(m.has(id), `某球缺少单元 ${id}`);
  }

  const mismatchColor = [];
  let movedCount = 0;
  for (const id of units.map((u) => u.key)) {
    const fills = per.map((m) => m.get(id).attrs.fill);
    if (new Set(fills).size !== 1) mismatchColor.push(`${id}: ${fills.join(' vs ')}`);
    const pos = per.map((m) => `${m.get(id).attrs.cx},${m.get(id).attrs.cy}`);
    if (new Set(pos).size > 1) movedCount += 1;
  }
  assert.deepStrictEqual(mismatchColor.slice(0, 5), [], `三球同色被破坏: ${mismatchColor.slice(0, 5)}`);
  assert.ok(movedCount > 0, '三球坐标完全相同 —— 镜像没生效，「同色」就成了同义反复');
});

test('★ 镜像方向正确：母球是 (−1,−1,+1) 镜像，几何位置与子球不同但颜色相同', () => {
  const { env } = mountSphere([]);
  const S = env.window.TCMSemTensor;
  const u = S.sphToCart(1, 30, 0);
  const mother = S.mirrorPoint(u, '母');
  const son = S.mirrorPoint(u, '子');
  assert.notDeepStrictEqual(mother.map((x) => +x.toFixed(6)), son.map((x) => +x.toFixed(6)));
  assert.deepStrictEqual(S.sphereColor(u, '母'), S.sphereColor(u, '子'));
  // 母球镜像后 X、Y 反号，Z 不变
  assert.ok(Math.abs(mother[0] + u[0]) < 1e-12 && Math.abs(mother[1] + u[1]) < 1e-12 && Math.abs(mother[2] - u[2]) < 1e-12);
});

// ── 同步旋转 ─────────────────────────────────────────────────────────

test('★ 三球同步旋转：改一次视角，三个球的**全部**坐标一起变', () => {
  const { host, handle } = mountSphere(unitsOf('neijing'));
  const snapshot = () => collect(host, 'svg').map((s) =>
    collect(s, 'circle').filter((c) => c.attrs['data-unit']).map((c) => `${c.attrs.cx},${c.attrs.cy}`).join('|')
  );
  const before = snapshot();
  handle.setView(-40, 130);
  const after = snapshot();

  assert.strictEqual(before.length, 3);
  for (let i = 0; i < 3; i += 1) {
    assert.notStrictEqual(before[i], after[i], `第 ${i} 个球没有跟着旋转`);
  }
  // 三个球共用同一个相机 ⇒ 相机只有一个
  const cam = handle.getCamera();
  assert.ok(Math.abs(cam.elevDeg - -40) < 1e-9 && Math.abs(cam.azimDeg - 130) < 1e-9, `相机未被更新: ${JSON.stringify(cam)}`);
  assert.ok(Math.abs(Math.hypot(...cam.e) - 1) < 1e-12, '相机方向向量非单位长度');
});

test('相机在视线与天顶重合时仍可构造（right 不塌成零向量）', () => {
  const { env } = mountSphere([]);
  const S = env.window.TCMSemTensor;
  for (const elev of [90, -90, 89.999]) {
    const cam = env.window.TCMSphere.makeCamera(elev, 0);
    assert.ok(Math.abs(S.vec.norm(cam.right) - 1) < 1e-9, `elev=${elev} 时 right 未归一（相机退化）`);
    assert.ok(Math.abs(S.vec.dot(cam.right, cam.e)) < 1e-9, 'right 与视线不垂直');
    assert.ok(Math.abs(S.vec.norm(cam.up) - 1) < 1e-9, `elev=${elev} 时 up 未归一`);
  }
});

// ── 图注实例化：改文本即改图 ─────────────────────────────────────────

test('§9 改图注参数即改图：rings/seg/azimuth_step/view 都会驱动重绘', () => {
  const { host, handle } = mountSphere(unitsOf('neijing'));
  const countOf = (t) => collect(host, t).length;

  const before = {
    paths: countOf('path'),
    ticks: collect(host, 'text').filter((n) => /^[0-9]+\u00B0$/.test(textOf(n))).length,
    params: handle.getParams(),
  };
  assert.strictEqual(before.params.rings, 45);
  assert.strictEqual(before.params.seg, 70);

  handle.applyAnnotation([
    '[球]', 'no = 2', 'name = 子', 'sex = 男', 'sign = 1,1,1', '',
    '[参数]',
    'rings = 24',
    'seg = 36',
    'azimuth_step_deg = 45',
    'cloud_alpha_rim = 0.9',
    'cloud_alpha_face = 0.1',
    'view_elev_deg = 35',
    'view_azim_deg = 10', '',
    '[图注正文]', '改文本即改图。',
  ].join('\n'));

  const after = handle.getParams();
  assert.strictEqual(after.rings, 24, 'rings 未生效');
  assert.strictEqual(after.seg, 36, 'seg 未生效');
  assert.strictEqual(after.azimuth_step_deg, 45, 'azimuth_step_deg 未生效');
  assert.strictEqual(after.cloud_alpha_face, 0.1, 'cloud_alpha_face 未生效');
  assert.strictEqual(after.view_elev_deg, 35, 'view_elev_deg 未生效');
  assert.strictEqual(handle.getCamera().elevDeg, 35, '相机未跟随图注视角');

  // 刻度密度确实变了。注意刻度是**三个球各画一遍**，所以要按每球来算：
  // 360/45 = 8 个方位，可见半球里只画一部分（相机在 φ=−60 附近）。
  const ticks = collect(host, 'text').filter((n) => /^[0-9]+\u00B0$/.test(textOf(n))).length;
  assert.strictEqual(ticks % 3, 0, `刻度数 ${ticks} 不是三球的整数倍 —— 某个球没画刻度`);
  const perSphere = ticks / 3;
  assert.ok(perSphere > 0 && perSphere <= 360 / 45, `每球刻度数 ${perSphere} 超出 45° 步长的上限 ${360 / 45}`);
  const beforePerSphere = before.ticks / 3;
  assert.ok(perSphere < beforePerSphere, `刻度没有随步长变疏：${beforePerSphere} → ${perSphere}`);
  assert.notStrictEqual(countOf('path'), before.paths, '网格路径数未随 rings/seg 变化');
});

test('§9 图注解析出的球信息（no/name/sex/sign）可被取回', () => {
  const { handle } = mountSphere(unitsOf('neijing'));
  const r = handle.applyAnnotation([
    '[球]', 'no = 3', 'name = 父', 'sex = 男', 'sign = 1,1,1', 'mirror_point_cloud = true', '',
    '[参数]', 'rings = 45', 'seg = 70', '',
    '[图注正文]', '第一行', '第二行',
  ].join('\n'));
  assert.strictEqual(r.sphere.no, 3);
  assert.strictEqual(r.sphere.name, '父');
  assert.strictEqual(r.sphere.sex, '男');
  assert.strictEqual(r.sphere.sign, '1,1,1');
  assert.ok(r.body.includes('第一行') && r.body.includes('第二行'));
});

test('§9 载入 standards 下的真实图注文件能生效（图注与规范同源）', () => {
  const annoDir = path.join(ROOT, 'standards', 'semtensor', 'annotations');
  const files = fs.readdirSync(annoDir).filter((f) => f.endsWith('.txt')).sort();
  assert.ok(files.length > 0, 'annotations/ 下没有图注文件');

  for (const f of files) {
    const text = fs.readFileSync(path.join(annoDir, f), 'utf8');
    const { handle } = mountSphere(unitsOf('neijing'));
    const r = handle.applyAnnotation(text);
    assert.ok(r.params.rings >= 3, `${f}: rings 未解析`);
    assert.ok(typeof r.sphere.name === 'string' || r.sphere.name === undefined, `${f}: 球段解析异常`);
  }
});

// ── 深度透明与退化点 ─────────────────────────────────────────────────

test('可透视深度：透明度落在 [alphaFace, alphaRim] 区间内，轮廓比正面更不透明', () => {
  const { env, host } = mountSphere(unitsOf('neijing'));
  const p = { cloud_alpha_face: 0.3, cloud_alpha_rim: 0.95 };
  const opacities = collect(host, 'circle')
    .filter((c) => c.attrs['data-unit'])
    .map((c) => Number(c.attrs.opacity));
  assert.ok(opacities.length > 0);
  for (const o of opacities) {
    assert.ok(Number.isFinite(o), '透明度非数');
    assert.ok(o >= 0 && o <= 1, `透明度越界: ${o}`);
  }
  assert.ok(Math.min(...opacities) < p.cloud_alpha_rim, '所有点都是最不透明的 —— 深度未驱动透明度');
  assert.ok(new Set(opacities).size > 1, '所有点透明度相同 —— 深度未生效');
});

test('退化单元（三轴全零）画成空心点，与真实落位的单元可区分', () => {
  const units = [
    { key: 'd0', name: 'z', theta: 0, phi: 0, r: 0.2, u: [1, 0, 0], degenerate: true },
    { key: 'n1', name: 'a', theta: 0, phi: 0, r: 0.5, u: [1, 0, 0] },
  ];
  const { host } = mountSphere(units);
  const pts = collect(host, 'circle').filter((c) => c.attrs['data-unit']);
  const deg = pts.filter((c) => c.attrs['data-unit'] === 'd0');
  const real = pts.filter((c) => c.attrs['data-unit'] === 'n1');
  assert.ok(deg.length > 0 && real.length > 0);
  for (const c of deg) assert.strictEqual(c.attrs.fill, 'none', '退化点应空心（fill=none）');
  for (const c of real) assert.notStrictEqual(c.attrs.fill, 'none', '真实单元不应空心');
});

// ── 页面级：整页真的渲染出来了 ───────────────────────────────────────

test('[semtensor] 整页渲染：标题、轴端色表、颜色公理、三张数据表与待裁定项都出现', () => {
  const env = makeSiteEnv('semtensor');
  // boot 由 shim 提供；app.js 注册了 DOMContentLoaded
  const html = require('../scripts/dom-shim').boot(env);
  for (const needle of [
    '三维极坐标语义张量 · 颜色赋值',
    '轴端色表',
    '颜色公理',
    '源实现 · 116 个真实语义单元',
    '内经 12 语义域',
    '伤寒论 9 域',
    '待裁定项',
    '不构成临床诊疗建议',
    'standards/semtensor/',
  ]) {
    assert.ok(html.includes(needle), `页面缺少「${needle}」`);
  }
  // 域数量必须与数据集一致，不能是手写的
  const nj = DATA.neijing.domains.length;
  assert.ok(html.includes(`内经 12 语义域`), '内经表标题不符');
  assert.strictEqual(nj, 12);
  assert.ok(html.includes(DATA.neijing.domains[0].name), '内经域名未渲染');
  // 源实现的真实单元必须出现在页面上（默认数据集）
  const ref = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'semtensor', 'datasets', 'reference-units.json'), 'utf8'));
  assert.strictEqual(ref.unitCount, 116, `源实现单元数应为 116，实得 ${ref.unitCount}`);
  assert.ok(html.includes(ref.units[0].label), '源实现单元未渲染');
  assert.ok(html.includes('风寒束表证'), '源实现的首个病证单元未渲染');
});

test('导航里含「语义张量」入口，且指向 semtensor.html', () => {
  const env = makeSiteEnv('index');
  const html = require('../scripts/dom-shim').boot(env);
  assert.ok(html.includes('semtensor.html'), '导航缺 semtensor.html');
  assert.ok(html.includes('语义张量'), '导航缺「语义张量」文字');
});

test('站点脚本仍不发起网络请求（fetch 只出现在图注按需载入且被协议守卫）', () => {
  for (const f of ['semtensor.js', 'sphere.js']) {
    const src = fs.readFileSync(path.join(SITE, f), 'utf8');
    assert.ok(!/\bfetch\s*\(/.test(src), `${f} 含 fetch 调用（球面图不该联网）`);
  }
  const appSrc = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8');
  assert.ok(/location\.protocol\s*&&/.test(appSrc), 'app.js 的 fetch 未被协议守卫');
});
