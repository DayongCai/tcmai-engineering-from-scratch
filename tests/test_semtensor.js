#!/usr/bin/env node
/**
 * tests/test_semtensor.js — 三维极坐标语义张量 · 硬证据测试
 *
 * 直接实现规范 §12「校验规范（无目视条件下的硬证据）」的每一条。
 * 这一节之所以存在，是因为这台机器上没人能靠眼睛判断球面画得对不对 ——
 * 颜色是否忠实于坐标、球是否闭合、镜像是否真的不变色，只能靠数值断言。
 *
 * 与渲染测试的分工：
 *   本文件断言**几何与颜色**；画布内不得出现汉字、点云是否真的画出像素，
 *   属于渲染层，放在 test_sphere_render.js。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const S = require('../site/semtensor');
const SPEC = S.SPEC;

const near = (a, b, eps) => Math.abs(a - b) <= eps;
const vecNear = (a, b, eps) => a.every((v, i) => Math.abs(v - b[i]) <= eps);

// ── §12.1 端色数值断言：ramp(−1)/ramp(0)/ramp(+1) 与轴端色表逐通道相等 ──

test('§12.1 三个轴的 I/O/T 端色与常量表逐通道相等（3 轴 × 3 端）', () => {
  const problems = [];
  for (const axis of ['X', 'Y', 'Z']) {
    for (const [end, key] of [['i', -1], ['o', 0], ['t', 1]]) {
      const got = S.ramp(key, axis);
      const want = S.rgb01FromHex(SPEC.axes[axis][end].hex);
      if (!vecNear(got, want, 1e-12)) {
        problems.push(`${axis} ${end}: ramp(${key}) = ${got} ≠ ${want}`);
      }
    }
  }
  assert.deepStrictEqual(problems, [], problems.join('\n'));
});

test('§12.1 端色基准波长与能量与常量表一致（红/橙/黄/绿/青/蓝/紫）', () => {
  const bands = SPEC.visibleSpectrum.bands.filter((b) => b.nm && b.name !== '白光');
  assert.strictEqual(bands.length, 7, `可见光端色应为 7 段，实得 ${bands.length}`);
  assert.deepStrictEqual(bands.map((b) => b.nm), [685, 605, 578, 533, 493, 458, 415]);
  assert.deepStrictEqual(bands.map((b) => b.ev), [1.81, 2.05, 2.15, 2.33, 2.52, 2.65, 2.99]);
  // 波长序段跨度为 50nm：相邻端色基准差应在 45–115nm 区间（含橙→红 80 与黄→绿 45）
  for (let i = 1; i < bands.length; i += 1) {
    const d = Math.abs(bands[i - 1].nm - bands[i].nm);
    assert.ok(d >= 21 && d <= 115, `${bands[i - 1].name}→${bands[i].name} 间隔 ${d}nm 超出预期`);
  }
});

test('§12.1 轴端色映射关系：X 橙/绿/紫 · Y 蓝/绿/红 · Z 黄/绿/青', () => {
  const expect = {
    X: ['#FF8C00', '#00B050', '#8A2BE2'],
    Y: ['#1F61D9', '#00B050', '#DB1C1C'],
    Z: ['#F2C200', '#00B050', '#00C7C7'],
  };
  for (const [axis, ends] of Object.entries(expect)) {
    assert.deepStrictEqual(
      ['i', 'o', 't'].map((e) => SPEC.axes[axis][e].hex),
      ends,
      `${axis} 轴端色不符`
    );
  }
});

// ── §12.2 矢量版形状 ─────────────────────────────────────────────────

test('§12.2 ramp([−1,0,1], axis) 形状为 (3,3)', () => {
  for (const axis of ['X', 'Y', 'Z']) {
    const m = S.rampMany([-1, 0, 1], axis);
    assert.strictEqual(m.length, 3, `${axis}: 行数应为 3`);
    for (const row of m) assert.strictEqual(row.length, 3, `${axis}: 通道数应为 3`);
  }
});

test('§12.2 数组版与标量版逐点一致（批次计算不得改变结果）', () => {
  const ts = [-1, -0.62, -0.13, 0, 0.37, 0.88, 1];
  for (const axis of ['X', 'Y', 'Z']) {
    const batch = S.rampMany(ts, axis);
    ts.forEach((t, i) => {
      assert.ok(vecNear(batch[i], S.ramp(t, axis), 0), `${axis} t=${t} 批次与标量不一致`);
    });
  }
});

test('§12.2 ramp 在 t=0 处对所有轴都返回基准绿', () => {
  for (const axis of ['X', 'Y', 'Z']) {
    assert.ok(vecNear(S.ramp(0, axis), S.rgb01FromHex(SPEC.origin.hex), 1e-12), `${axis} 中点不是基准绿`);
  }
});

// ── §12.3 O 点回基准绿 ───────────────────────────────────────────────

test('§12.3 comp((0,0,0)) == C_O == #00B050（绿，不是灰）', () => {
  const got = S.comp(0, 0, 0);
  assert.ok(vecNear(got, [0.0, 0.69, 0.314], 1e-3), `实得 ${got}`);
  assert.strictEqual(S.compHex(0, 0, 0), '#00B050');
  assert.deepStrictEqual(got, SPEC.origin.rgb01, '与常量表 origin.rgb01 不符');
  // 「任意轴都回到基准绿」的含义是：三点全部归零时，无论从哪根轴看都是同一个 O 点。
  // 不能拿 sphToCart(1,0,0) 来断言 —— 那是 X 轴正端（阳），本来就是橙色。
  for (const axis of ['X', 'Y', 'Z']) {
    assert.ok(vecNear(S.ramp(0, axis), SPEC.origin.rgb01, 1e-12), `${axis} 轴上 O 点不是基准绿`);
  }
});

test('§12.3 只要有一轴偏离，颜色就离开基准绿（绿⇒三轴皆零）', () => {
  const o = SPEC.origin.rgb01;
  for (const v of [[0.25, 0, 0], [0, -0.25, 0], [0, 0, 0.25]]) {
    assert.ok(S.colorDiff(S.comp(...v), o) > 0.02, `comp${v} 仍与基准绿相同`);
  }
});

test('§12.3 弱偏离近基准绿：三轴都很小时颜色仍接近绿', () => {
  const c = S.comp(0.02, -0.03, 0.01);
  const o = S.rgb01FromHex(SPEC.origin.hex);
  assert.ok(S.colorDiff(c, o) < 0.05, `弱偏离色差过大: ${S.colorDiff(c, o)}`);
});

test('§12.3 三轴同强时趋向三端色的加权混合，且与单轴纯色不同', () => {
  const mixed = S.comp(1, 1, 1);
  const pureX = S.comp(1, 0, 0);
  assert.ok(S.colorDiff(mixed, pureX) > 0.1, '三轴同强竟与单轴同色');
  // 等权混合 = 三端色的算术平均
  const want = [0, 1, 2].map(
    (k) => (S.rgb01FromHex(SPEC.axes.X.t.hex)[k] + S.rgb01FromHex(SPEC.axes.Y.t.hex)[k] + S.rgb01FromHex(SPEC.axes.Z.t.hex)[k]) / 3
  );
  assert.ok(vecNear(mixed, want, 1e-12), `等权混合 ${mixed} ≠ 三端色均值 ${want}`);
});

test('§12.3 合成色对轴符号敏感：v 与 −v 必须异色（否则读不出方向）', () => {
  for (const v of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0.6, -0.3, 0.2]]) {
    const neg = v.map((x) => -x);
    assert.ok(S.colorDiff(S.comp(...v), S.comp(...neg)) > 0.05, `${v} 与其反向同色`);
  }
});

test('§12.3 comp 输出恒在 0–1 通道域内（含超界输入）', () => {
  const probes = [[0, 0, 0], [3, -3, 3], [0.5, 0, 0], [-1, 1, -1], [1e3, 0, 0]];
  for (const v of probes) {
    const c = S.comp(...v);
    for (const ch of c) assert.ok(ch >= 0 && ch <= 1, `comp${v} 通道越界: ${ch}`);
  }
});

// ── §12.4 球面往返 ───────────────────────────────────────────────────

test('§12.4 基准点：θ=+90° → (0,0,1) ；θ=0,φ=0 → (1,0,0)', () => {
  assert.ok(vecNear(S.sphToCart(1, 90, 0), [0, 0, 1], 1e-12), '天顶不是 (0,0,1)');
  assert.ok(vecNear(S.sphToCart(1, -90, 0), [0, 0, -1], 1e-12), '天底不是 (0,0,−1)');
  assert.ok(vecNear(S.sphToCart(1, 0, 0), [1, 0, 0], 1e-12), 'θ=0,φ=0 不是 (1,0,0)');
  assert.ok(vecNear(S.sphToCart(1, 0, 90), [0, 1, 0], 1e-12), 'θ=0,φ=90 不是 (0,1,0)');
});

test('§12.4 任意 (θ,φ) 球→笛→球 往返误差 < 1e-12', () => {
  let worst = 0;
  let worstAt = null;
  for (let i = 0; i < 2000; i += 1) {
    const theta = -90 + (i % 181) * 1;              // 均匀覆盖 −90…+90
    const phi = ((i * 37) % 360) * 1;               // 覆盖 0…359
    const r = 0.05 + ((i * 13) % 96) / 100;         // 覆盖 0.05…1.00
    const v = S.sphToCart(r, theta, phi);
    const back = S.cartToSph(v);
    worst = Math.max(worst, Math.abs(back.r - r), Math.abs(back.theta - theta));
    const dPhi = Math.min(Math.abs(back.phi - phi), 360 - Math.abs(back.phi - phi));
    worst = Math.max(worst, dPhi);
    if (worst > 1e-12 && !worstAt) worstAt = { theta, phi, r, back };
  }
  assert.ok(worst < 1e-12, `最大往返误差 ${worst}（>=1e-12）；首例 ${JSON.stringify(worstAt)}`);
});

test('§12.4 旧稿极角口径换算：θ_仰角 = 90° − θ_极角', () => {
  assert.strictEqual(S.legacyPolarToElevation(90), 0, '旧稿赤道 θ=90° 应换算为仰角 0');
  assert.strictEqual(S.legacyPolarToElevation(0), 90, '旧稿北极 θ=0° 应换算为仰角 +90');
  assert.strictEqual(S.legacyPolarToElevation(180), -90, '旧稿南极 θ=180° 应换算为仰角 −90');
});

test('§12.4 φ 输出归一至 [0,360)', () => {
  for (const phi of [-10, -180, -350, 0, 180, 359.9]) {
    const { phi: out } = S.cartToSph(S.sphToCart(1, 12, phi));
    assert.ok(out >= 0 && out < 360, `φ=${phi} 归一后为 ${out}`);
    const d = Math.min(Math.abs(out - phi), 360 - Math.abs(out - phi));
    assert.ok(d < 1e-9, `φ=${phi} 归一后偏差 ${d}`);
  }
});

// ── §12.5 镜像不变色 ─────────────────────────────────────────────────

test('§12.5 400 个随机点：几何随球镜像、取色坐标反镜像 ⇒ 母/子/父 三球同色', () => {
  const spheres = SPEC.mirror.spheres.map((s) => s.name);
  assert.deepStrictEqual(spheres, ['母', '子', '父']);
  let checked = 0;
  const problems = [];

  // 确定性伪随机（不用 Math.random：测试必须可复现）
  let seed = 20261012;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let i = 0; i < 400; i += 1) {
    const theta = -90 + rnd() * 180;
    const phi = rnd() * 360;
    const u = S.sphToCart(1, theta, phi);
    const colors = spheres.map((name) => S.sphereColor(u, name));
    for (const c of colors.slice(1)) {
      if (!vecNear(c, colors[0], 1e-12)) {
        problems.push(`点 ${i} θ=${theta.toFixed(2)} φ=${phi.toFixed(2)}: ${colors}`);
        break;
      }
    }
    checked += 1;
  }
  assert.strictEqual(checked, 400);
  assert.deepStrictEqual(problems.slice(0, 5), [], problems.slice(0, 5).join('\n'));
});

test('§12.5 几何位置确实被镜像（否则「不变色」是同义反复）', () => {
  const u = S.sphToCart(1, 30, 0);              // (cos30, 0, sin30)
  const mother = S.mirrorPoint(u, '母');
  const son = S.mirrorPoint(u, '子');
  assert.ok(!vecNear(mother, son, 1e-12), '母球与子球几何位置相同，镜像未生效');
  assert.ok(vecNear(mother, [-u[0], -u[1], u[2]], 1e-12), '母球镜像符号应为 (−1,−1,+1)');
  assert.ok(vecNear(son, u, 1e-12), '子球镜像符号应为 (+1,+1,+1)');
});

test('§12.5 取色坐标的反镜像补偿确实等于原点（而非被短路成恒等）', () => {
  const probes = [[0.3, -0.5, 0.8], [-1, 0, 0], [0, 1, 0]];
  for (const u of probes) {
    for (const name of ['母', '子', '父']) {
      assert.ok(vecNear(S.colorCoord(u, name), u, 1e-12), `${name} 取色坐标未回到原点`);
    }
  }
});

test('§12.5 子球与父球几何与着色一致，差异只在语义点云归属', () => {
  const u = S.sphToCart(1, -20, 123);
  assert.ok(vecNear(S.mirrorPoint(u, '子'), S.mirrorPoint(u, '父'), 1e-12), '子父几何不同');
  assert.ok(vecNear(S.sphereColor(u, '子'), S.sphereColor(u, '父'), 1e-12), '子父着色不同');
});

// ── §12.6 闭合球 DDG ─────────────────────────────────────────────────

test('§12.6 DDG 顶点/面/边与 Euler 数：V=3152, F=6300, E=9450, V−E+F=2', () => {
  const g = S.sphereGrid(45, 70);
  const t = S.topology(g);
  assert.strictEqual(t.V, 3152, `顶点数 ${t.V}`);
  assert.strictEqual(t.F, 6300, `面数 ${t.F}`);
  assert.strictEqual(t.E, 9450, `边数 ${t.E}`);
  assert.strictEqual(t.euler, 2, `Euler 数 ${t.euler}`);
  assert.strictEqual(g.vertices.length, 45 * 70 + 2);
  assert.ok(vecNear(g.vertices[0], [0, 0, 1], 1e-12), '首顶点应为北极');
  assert.ok(vecNear(g.vertices[g.vertices.length - 1], [0, 0, -1], 1e-12), '末顶点应为南极');
});

test('§12.6 每个顶点与每条边都被面片用到（无孤立顶点 / 无悬挂边）', () => {
  const g = S.sphereGrid(45, 70);
  const used = new Set();
  const edgeCount = new Map();
  for (const f of g.faces) {
    for (let k = 0; k < 3; k += 1) {
      used.add(f[k]);
      const a = f[k];
      const b = f[(k + 1) % 3];
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
    }
  }
  assert.strictEqual(used.size, g.vertices.length, `有 ${g.vertices.length - used.size} 个孤立顶点`);
  // 闭合三角形流形上每条边恰属两个面
  const bad = [...edgeCount.entries()].filter(([, n]) => n !== 2);
  assert.deepStrictEqual(bad.slice(0, 5), [], `有 ${bad.length} 条边不属于两个面（非流形）`);
});

test('§12.6 所有三角面朝外（法向与质心同向）', () => {
  const g = S.sphereGrid(45, 70);
  let inward = 0;
  for (const f of g.faces) {
    const n = S.faceNormal(g, f);
    const c = [0, 1, 2].map((k) => (g.vertices[f[0]][k] + g.vertices[f[1]][k] + g.vertices[f[2]][k]) / 3);
    if (S.vec.dot(n, c) <= 0) inward += 1;
  }
  assert.strictEqual(inward, 0, `${inward} 个面朝内（绕向错）`);
});

test('§12.6 Gauss–Bonnet：Σ角度亏损 = 4π = 12.56637061436（1e-9 内）', () => {
  const g = S.sphereGrid(45, 70);
  const sum = S.angleDeficitSum(g);
  assert.ok(
    near(sum, 4 * Math.PI, 1e-9),
    `Σ角度亏损 = ${sum}，与 4π=${4 * Math.PI} 差 ${Math.abs(sum - 4 * Math.PI)}`
  );
});

test('§12.6 ΣK·A = Σ角度亏损，且曲率密度 K ≈ 1', () => {
  const g = S.sphereGrid(45, 70);
  const k = S.curvatureDensity(g);
  assert.ok(near(k.totalDeficit, 4 * Math.PI, 1e-9), `ΣK·A = ${k.totalDeficit}`);
  assert.ok(Math.abs(k.mean - 1) < 0.02, `均值 K = ${k.mean} 偏离 1 过多`);
  assert.ok(Math.abs(k.weighted - 1) < 0.02, `面元加权 K = ${k.weighted} 偏离 1 过多`);
  // 非流形/绕向错/缺极点都会立刻把 K 打成负数或 NaN —— 这条是最灵敏的信号
  assert.ok(k.min > 0, `存在负曲率密度（min=${k.min}），网格自交或绕向不一致`);
  assert.ok(Number.isFinite(k.mean), 'K 为 NaN/Inf，说明面积累加失效');
});

test('§12.6 内接多面体面积必须小于球面积 4π（大于即说明面片重叠）', () => {
  const g = S.sphereGrid(45, 70);
  const k = S.curvatureDensity(g);
  assert.ok(
    k.totalArea < 4 * Math.PI,
    `Σ面积 ${k.totalArea} ≥ 4π=${4 * Math.PI}：顶点在球面上的内接多面体不可能超过球面积，` +
      '出现这种情况说明有三角面横跨球体互相覆盖（典型原因：极点接错了纬向环）'
  );
  assert.ok(k.totalArea > 0.99 * 4 * Math.PI, `Σ面积 ${k.totalArea} 离 4π 过远，网格过粗`);
});

test('§12.6 对径顶点距为 2（球面任意两点的最大距离）', () => {
  const g = S.sphereGrid(45, 70);
  let max = 0;
  for (let i = 1; i < g.vertices.length; i += 1) {
    const d = S.vec.norm(S.vec.sub(g.vertices[i], g.vertices[i % 2 === 0 ? 0 : 1]));
    if (d > max) max = d;
  }
  assert.ok(near(max, 2, 2e-2), `最大顶点间距 ${max}，期望 ≈2`);
});

// ── §12.8 值域 ───────────────────────────────────────────────────────

test('§12.8 编码结果落在 θ∈[−90,90]、φ∈[0,360)、r∈(0,1]', () => {
  const cases = [
    { yinyang: '阳证', hanre: '热证', biaoli: '里证', xushi: '实证', jing: 1, qi: 2, shen: 9, evidence: 'A', mainSymptoms: 5, minorSymptoms: 5, bridgeText: 'x'.repeat(200) },
    { yinyang: '阴证', hanre: '寒证', biaoli: '表证', xushi: '虚证', jing: 9, qi: 1, shen: 0, evidence: 'C', mainSymptoms: 0, minorSymptoms: 0, bridgeText: '' },
    {},
    { yinyang: '未列项', hanre: '', biaoli: '半表半里', xushi: null },
  ];
  for (const c of cases) {
    const e = S.encodeDSU(c);
    assert.ok(e.theta >= -90 && e.theta <= 90, `θ 越界: ${e.theta}`);
    assert.ok(e.phi >= 0 && e.phi < 360, `φ 越界: ${e.phi}`);
    assert.ok(e.r > 0 && e.r <= 1, `r 越界: ${e.r}`);
    assert.ok(Math.abs(S.vec.norm(e.u) - 1) < 1e-12, `单位向量模非 1: ${S.vec.norm(e.u)}`);
    assert.deepStrictEqual(e.hex, S.compHex(e.x, e.y, e.z), 'hex 与 rgb 不一致');
  }
});

test('§12.8 退化情形（三轴全零）被显式标记，而不是悄悄落在某个方位上', () => {
  const e = S.encodeDSU({});
  assert.strictEqual(e.x, 0);
  assert.strictEqual(e.y, 0);
  assert.strictEqual(e.z, 0);
  assert.strictEqual(e.degenerate, true, '全零方向未被打上 degenerate 标记');
  assert.deepStrictEqual(e.u, [1, 0, 0], '退化时方向应为基准方位');
  assert.strictEqual(e.hex, '#00B050', '退化点颜色应为基准绿');
  assert.ok(Math.abs(S.vec.norm(e.u) - 1) < 1e-12);
  // 有任一分量时不得标记为退化
  assert.strictEqual(S.encodeDSU({ yinyang: '阳证' }).degenerate, false);
  assert.strictEqual(S.encodeDSU({ jing: 1 }).degenerate, false);
});

test('§12.8 尺度伸缩 r′ = clip(r×gain, 0.05, 1.00)，方向与颜色不变', () => {
  const e = S.encodeDSU({ yinyang: '阳证', hanre: '热证', jing: 1, qi: 1, shen: 2, evidence: 'A', mainSymptoms: 4, bridgeText: 'x'.repeat(100) });
  for (const gain of [0.001, 0.5, 1, 3, 100]) {
    const r2 = S.scaleTensor(e.r, gain);
    assert.ok(r2 >= 0.05 && r2 <= 1, `gain=${gain} 后 r=${r2} 越界`);
  }
  // 方向与颜色不随尺度变化
  const a = S.aggregate([{ theta: e.theta, phi: e.phi, r: e.r }], [1]);
  const b = S.aggregate([{ theta: e.theta, phi: e.phi, r: S.scaleTensor(e.r, 0.3) }], [1]);
  assert.ok(near(a.theta, b.theta, 1e-12) && near(a.phi, b.phi, 1e-12), '尺度伸缩改变了方向');
  assert.ok(vecNear(a.rgb, b.rgb, 1e-12), '尺度伸缩改变了颜色');
});

// ── §5 确定性编码 ────────────────────────────────────────────────────

test('§5 八纲取值表：阳/阴 ±1、热/寒 ±1、表 −1/半表半里 0/里 +1、实/虚 ±1、未列项 0', () => {
  assert.strictEqual(S.bagangValue('yinyang', '阳证'), 1);
  assert.strictEqual(S.bagangValue('yinyang', '阴证'), -1);
  assert.strictEqual(S.bagangValue('hanre', '热证'), 1);
  assert.strictEqual(S.bagangValue('hanre', '寒证'), -1);
  assert.strictEqual(S.bagangValue('biaoli', '表证'), -1);
  assert.strictEqual(S.bagangValue('biaoli', '半表半里'), 0);
  assert.strictEqual(S.bagangValue('biaoli', '里证'), 1);
  assert.strictEqual(S.bagangValue('xushi', '实证'), 1);
  assert.strictEqual(S.bagangValue('xushi', '虚证'), -1);
  assert.strictEqual(S.bagangValue('xushi', '未列项'), 0);
  assert.strictEqual(S.bagangValue('yinyang', undefined), 0);
});

test('§5 编码公式可手算复核：x=0.60·阴阳+0.40·寒热 ； y=0.70·表里+0.30·虚实', () => {
  const e = S.encodeDSU({ yinyang: '阳证', hanre: '寒证', biaoli: '里证', xushi: '虚证' });
  assert.ok(near(e.x, 0.6 * 1 + 0.4 * -1, 1e-12), `x=${e.x}，手算 0.2`);
  assert.ok(near(e.y, 0.7 * 1 + 0.3 * -1, 1e-12), `y=${e.y}，手算 0.4`);
  assert.strictEqual(e.z, 0, '无精气神分时 z 应为 0');
});

test('§5 z = (神分 − 精分)/(精分+气分+神分+1)', () => {
  const e = S.encodeDSU({ jing: 2, qi: 3, shen: 5 });
  assert.ok(near(e.z, (5 - 2) / (2 + 3 + 5 + 1), 1e-12), `z=${e.z}`);
  // 精多则 z<0（偏形质），神多则 z>0（偏神志）
  assert.ok(S.encodeDSU({ jing: 9, qi: 0, shen: 1 }).z < 0, '精多时 z 应为负');
  assert.ok(S.encodeDSU({ jing: 0, qi: 1, shen: 9 }).z > 0, '神多时 z 应为正');
});

test('§5 证据等级 A=1.00 / B=0.75 / C=0.50 / 其它 0.40，且 r 被 clip 到 [0.20,1.00]', () => {
  assert.deepStrictEqual(S.EVIDENCE_GRADE, { A: 1.0, B: 0.75, C: 0.5 });
  const r = (ev, main, minor, bridge) =>
    S.encodeDSU({ evidence: ev, mainSymptoms: main, minorSymptoms: minor, bridgeText: 'x'.repeat(bridge) }).r;
  assert.ok(near(r('A', 5, 5, 200), 1.0, 1e-12), '满证据应取到 r=1');
  assert.ok(near(r('未列', 0, 0, 0), 0.2, 1e-12), '全空应被 clip 到下限 0.20');
  assert.ok(r('C', 3, 2, 50) > r('未列', 3, 2, 50), '证据等级更高的 r 应更大');
  // 症状密度 = min(1,(主+次)/10)
  assert.ok(near(r('C', 20, 20, 0), 0.35 * 0.5 + 0.35 * 1, 1e-12), '症状密度未饱和在 1');
});

test('§5 同一输入必得同一输出（确定性是零文本依赖通道的前提）', () => {
  const f = { yinyang: '阳证', hanre: '热证', biaoli: '表证', xushi: '虚证', jing: 1, qi: 2, shen: 4, evidence: 'B', mainSymptoms: 3, minorSymptoms: 2, bridgeText: '往来寒热，胸胁苦满' };
  const a = S.encodeDSU(f);
  const b = S.encodeDSU(f);
  assert.deepStrictEqual({ ...a }, { ...b });
  assert.deepStrictEqual(a.hex, b.hex);
});

// ── §10 张量相似 ─────────────────────────────────────────────────────

test('§10 cosΔ 与三维欧氏内积一致（仰角口径自洽）', () => {
  for (const [t1, p1, t2, p2] of [[0, 0, 0, 90], [30, 45, -20, 200], [90, 0, 90, 180], [12, 300, -77, 12]]) {
    const u = S.sphToCart(1, t1, p1);
    const v = S.sphToCart(1, t2, p2);
    assert.ok(
      near(S.cosDelta({ theta: t1, phi: p1 }, { theta: t2, phi: p2 }), S.vec.dot(u, v), 1e-12),
      `(${t1},${p1}) vs (${t2},${p2}) 的 cosΔ 与内积不符`
    );
  }
});

test('§10 同点 S_T = 1，对径点 S_T 取到方向项下限', () => {
  const a = { theta: 20, phi: 40, r: 0.7 };
  const same = S.tensorSimilarity(a, a);
  assert.ok(near(same.cosDelta, 1, 1e-12));
  assert.ok(same.S_T > 0.99, `同点 S_T=${same.S_T} 应接近 1`);

  const anti = { theta: -20, phi: 220, r: 0.7 };
  const d = S.tensorSimilarity(a, anti);
  assert.ok(near(d.cosDelta, -1, 1e-9), `对径 cosΔ=${d.cosDelta} 应为 −1`);
  assert.ok(near(d.S_T, 0.15 * 1 + 0.2 * (1 - d.colorDiff), 1e-9), '方向项应归零');
});

test('§10 S_T 权重和恒为 1（0.65+0.15+0.20）', () => {
  const a = { theta: 10, phi: 10, r: 1 };
  const b = { theta: -40, phi: 200, r: 0.2 };
  const r = S.tensorSimilarity(a, b);
  assert.ok(near(r.S_T, 0.65 * ((r.cosDelta + 1) / 2) + 0.15 * r.scaleSim + 0.2 * (1 - r.colorDiff), 1e-12));
  assert.ok(r.S_T >= 0 && r.S_T <= 1, `S_T=${r.S_T} 越界`);
});

test('§10 尺度相似 = min/max，且与颜色、方向无关', () => {
  assert.ok(near(S.scaleSim({ r: 0.5 }, { r: 1.0 }), 0.5, 1e-12));
  assert.ok(near(S.scaleSim({ r: 0.2 }, { r: 0.2 }), 1, 1e-12));
});

test('§10 域聚合：方向取加权平均后归一，r 取加权平均，颜色由聚合方向重新合成', () => {
  const items = [
    { theta: 0, phi: 0, r: 1.0 },
    { theta: 0, phi: 90, r: 0.2 },
  ];
  const agg = S.aggregate(items);
  // 等权平均方向 = (1,1,0)/√2 ⇒ θ=0, φ=45
  assert.ok(near(agg.theta, 0, 1e-12), `θ=${agg.theta}`);
  assert.ok(near(agg.phi, 45, 1e-12), `φ=${agg.phi}`);
  assert.ok(near(agg.r, 0.6, 1e-12), `r=${agg.r}`);
  assert.ok(Math.abs(S.vec.norm(agg.u) - 1) < 1e-12, '聚合方向未归一');
  // 颜色由聚合方向（单位球面）重算，不含尺度 —— 与 §10「尺度伸缩不改色」一致
  assert.ok(vecNear(agg.rgb, S.iotColor(agg.u), 1e-12), '颜色未由聚合方向重算');
  assert.ok(
    vecNear(agg.rgb, S.comp(...S.sphToCart(1, agg.theta, agg.phi)), 1e-12),
    '颜色与「单位方向合成色」不符'
  );
  assert.strictEqual(agg.degenerate, false);

  // 加权：全权重在一侧 ⇒ 落在该侧
  const sided = S.aggregate(items, [1, 0]);
  assert.ok(near(sided.phi, 0, 1e-9), `加权后应落在 φ=0，实得 ${sided.phi}`);
});

// ── §9 图注（INI 三段制）─────────────────────────────────────────────

test('§9 图注解析：三段制 [球] / [参数] / [图注正文]，数值自动转型、# 行忽略', () => {
  const text = [
    '# 注释行应被忽略',
    '[球]',
    'no = 1',
    'name = 母',
    'sex = 女',
    'sign = -1,-1,1',
    'mirror_point_cloud = true',
    '',
    '[参数]',
    'rings = 45',
    'seg = 70',
    'azimuth_step_deg = 30',
    'view_elev_deg = 20',
    'view_azim_deg = -60',
    'cloud_alpha_rim = 0.95',
    '',
    '[图注正文]',
    '这是可以自由编辑的说明文字。',
    '第二行。',
  ].join('\n');
  const a = S.parseAnnotation(text);
  assert.strictEqual(a.sphere.no, 1, '数值未转型');
  assert.strictEqual(a.sphere.name, '母');
  assert.strictEqual(a.sphere.sex, '女');
  assert.strictEqual(a.sphere.sign, '-1,-1,1');
  assert.strictEqual(a.sphere.mirror_point_cloud, 'true');
  assert.strictEqual(a.params.rings, 45);
  assert.strictEqual(a.params.seg, 70);
  assert.strictEqual(a.params.azimuth_step_deg, 30);
  assert.strictEqual(a.params.view_azim_deg, -60);
  assert.strictEqual(a.params.cloud_alpha_rim, 0.95);
  assert.ok(a.body.includes('这是可以自由编辑的说明文字。'), '正文未取出');
  assert.ok(!a.body.includes('注释行'), '# 行混进了正文');
});

test('§9 改图注参数即改图：rings/seg/azimuth_step/视角透明度都能被参数驱动', () => {
  const a = S.parseAnnotation('[参数]\nrings = 24\nseg = 36\nazimuth_step_deg = 45\ncloud_alpha_rim = 0.9\ncloud_alpha_face = 0.1\n');
  const g = S.sphereGrid(a.params.rings, a.params.seg);
  const t = S.topology(g);
  assert.strictEqual(t.V, 24 * 36 + 2, 'rings/seg 未驱动网格分辨率');
  assert.strictEqual(t.euler, 2, '改分辨率后球不再闭合');
  assert.strictEqual(360 / a.params.azimuth_step_deg, 8, 'azimuth_step_deg 未驱动刻度数');
  assert.ok(a.params.cloud_alpha_rim > a.params.cloud_alpha_face, '轮廓应比正面更不透明');
});

// ── 默认视角与呈现规范的常量完整性 ───────────────────────────────────

test('呈现规范常量齐备：默认视角、点径、透明度、轴管半径、箭头半顶角', () => {
  const r = SPEC.renderSpec;
  assert.deepStrictEqual(r.defaultView, { elevDeg: 20, azimDeg: -60 });
  assert.strictEqual(r.cloud.pointSizePx, 9);
  assert.strictEqual(r.cloud.depthShade, false);
  assert.strictEqual(r.depth.alphaRim, 0.95);
  assert.strictEqual(r.depth.alphaFace, 0.3);
  assert.strictEqual(r.axesRender.pipeRadius, 0.0085);
  assert.strictEqual(r.axesRender.arrowHeadHalfAngleDeg, 13);
  assert.deepStrictEqual(r.axesRender.points, ['I', 'O', 'T']);
  assert.strictEqual(r.azimuth.stepDeg, 30);
});

test('画布规范：常量文件明确「画布内不出现汉字」', () => {
  assert.ok(/不出现汉字/.test(SPEC.renderSpec.canvasRule), '画布规范丢失');
});
