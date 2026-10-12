/**
 * site/semtensor.js — 三维极坐标语义张量（可计算核心）
 *
 * 规范：standards/semtensor/规范-三维极坐标语义张量-v1.0.md
 * 常量：standards/semtensor/axis-colors.json（**唯一来源**，此处不复制任何色值）
 *
 * 为什么把颜色做成「坐标的函数」而不是装饰：
 *   色—义一一对应之后，图上同一片色区就是同一类语义。颜色变成可断言的对象，
 *   整套规范就能在无目视条件下被测试（见 §12 验收清单 → tests/test_semtensor.js）。
 *
 * 同构于浏览器与 Node：Node 里 require 规范常量，浏览器里读 site 构建期注入的
 * window.TCMAI_SEMTENSOR_SPEC。两份来源都指向同一个 JSON 文件。
 */

'use strict';

/* eslint-disable no-var */
(function (root) {
  /**
   * 解析规范常量。
   *
   * 优先级：**运行时注入优先，再退回 require** —— 不能反过来靠 `typeof module` 判断环境：
   * `loadScript` 用 `new Function` 求值，而 `new Function` 的函数体只能看到全局作用域，
   * 「能不能看见 module」在不同调用方式下（node file.js / node -e / 浏览器）并不一致。
   * 用 typeof 做特性探测、并把 require 放在后面兜底，三种环境才都稳。
   */
  function resolveSpec() {
    const rt = typeof window !== 'undefined'
      ? window
      : (typeof globalThis !== 'undefined' ? globalThis : null);
    if (rt && rt.TCMAI_SEMTENSOR_SPEC) return rt.TCMAI_SEMTENSOR_SPEC;
    if (typeof require === 'function' && typeof module === 'object' && module && module.exports) {
      return require('../standards/semtensor/axis-colors.json');
    }
    throw new Error(
      'semtensor: 缺少坐标与颜色常量 —— 浏览器里必须先加载 site/semtensor-spec.js，Node 里用 require'
    );
  }

  const SPEC = resolveSpec();
  const IS_NODE = typeof module === 'object' && !!module && !!module.exports;

  const AXIS_KEYS = ['X', 'Y', 'Z'];

  // ── 基础数值工具 ──────────────────────────────────────────────────────

  const clip = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const deg2rad = (d) => (d * Math.PI) / 180;
  const rad2deg = (r) => (r * 180) / Math.PI;

  function rgb01FromHex(hex) {
    const h = String(hex).replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16) / 255,
      parseInt(h.slice(2, 4), 16) / 255,
      parseInt(h.slice(4, 6), 16) / 255,
    ];
  }

  function hexFromRgb01(rgb) {
    const c = (v) => Math.round(clip(v, 0, 1) * 255).toString(16).padStart(2, '0').toUpperCase();
    return `#${c(rgb[0])}${c(rgb[1])}${c(rgb[2])}`;
  }

  /** O 原点基准色 —— 从常量读，不硬编码 */
  const COLOR_O = rgb01FromHex(SPEC.origin.hex);

  /** 轴端色：axis ∈ {X,Y,Z}，end ∈ {i,o,t} */
  function endColor(axis, end) {
    const a = SPEC.axes[axis];
    if (!a) throw new Error(`semtensor: 未知轴 ${axis}`);
    return rgb01FromHex(a[end].hex);
  }

  // ── 球 ↔ 笛卡尔（v1.0 仰角口径）───────────────────────────────────────

  /** 球 → 笛：X = r·cosθ·cosφ ; Y = r·cosθ·sinφ ; Z = r·sinθ */
  function sphToCart(r, thetaDeg, phiDeg) {
    const t = deg2rad(thetaDeg);
    const p = deg2rad(phiDeg);
    return [r * Math.cos(t) * Math.cos(p), r * Math.cos(t) * Math.sin(p), r * Math.sin(t)];
  }

  /** 笛 → 球：r = |v| ; θ = asin(Z/r) ; φ = atan2(Y, X)（φ 归一至 [0,360)） */
  function cartToSph(v) {
    const [x, y, z] = v;
    const r = Math.sqrt(x * x + y * y + z * z);
    if (r === 0) return { r: 0, theta: 0, phi: 0, u: [0, 0, 0] };
    const theta = rad2deg(Math.asin(clip(z / r, -1, 1)));
    let phi = rad2deg(Math.atan2(y, x));
    if (phi < 0) phi += 360;
    return { r, theta, phi, u: [x / r, y / r, z / r] };
  }

  /** 旧稿极角口径 → v1.0 仰角口径（θ_仰角 = 90° − θ_极角） */
  const legacyPolarToElevation = (polarDeg) => 90 - polarDeg;

  // ── 颜色公理 ──────────────────────────────────────────────────────────

  /** 单轴渐变：在 [−1, 0, +1] 三色间逐通道线性插值 */
  function ramp(t, axis) {
    const x = clip(t, -1, 1);
    const cI = endColor(axis, 'i');
    const cO = endColor(axis, 'o');
    const cT = endColor(axis, 't');
    const lo = x < 0 ? cI : cO;
    const hi = x < 0 ? cO : cT;
    const f = x < 0 ? x + 1 : x;
    return [0, 1, 2].map((k) => lo[k] + (hi[k] - lo[k]) * f);
  }

  /** 数组版：ramp([−1,0,1], axis) → 形状 (3,3) */
  function rampMany(ts, axis) {
    return ts.map((t) => ramp(t, axis));
  }

  /**
   * 合成色：w_i = clip(|v_i|,0,1) ; k = max(w_i) ;
   *         C = (1−k)·绿 + k·(Σ w_i·c_i / Σ w_i)
   * c_i 取该轴在 sign(v_i) 一侧的端色。三者全零时 k=0 ⇒ 回到基准绿。
   */
  function comp(x, y, z) {
    const v = [x, y, z];
    const w = v.map((t) => clip(Math.abs(t), 0, 1));
    const k = Math.max(w[0], w[1], w[2]);
    if (k === 0) return COLOR_O.slice();

    const sum = w[0] + w[1] + w[2];
    const mix = [0, 0, 0];
    for (let i = 0; i < 3; i += 1) {
      if (w[i] === 0) continue;
      const c = endColor(AXIS_KEYS[i], v[i] > 0 ? 't' : 'i');
      mix[0] += w[i] * c[0];
      mix[1] += w[i] * c[1];
      mix[2] += w[i] * c[2];
    }
    for (let i = 0; i < 3; i += 1) mix[i] /= sum;

    return [0, 1, 2].map((i) => (1 - k) * COLOR_O[i] + k * mix[i]);
  }

  const compHex = (x, y, z) => hexFromRgb01(comp(x, y, z));

  const colorDiff = (c1, c2) =>
    Math.sqrt((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2 + (c1[2] - c2[2]) ** 2) / Math.sqrt(3);

  // ── 母子父镜像 ────────────────────────────────────────────────────────

  function sphereSign(name) {
    const s = SPEC.mirror.spheres.find((x) => x.name === name);
    if (!s) throw new Error(`semtensor: 未知球 ${name}`);
    return s.sign;
  }

  const applySign = (v, sign) => [v[0] * sign[0], v[1] * sign[1], v[2] * sign[2]];

  /** 几何位置 = M(sex) · n̂ */
  const mirrorPoint = (v, sphereName) => applySign(v, sphereSign(sphereName));

  /**
   * 取色坐标 = M(sex) · (M(sex) · n̂) —— 反镜像补偿。
   * 数学上等于 n̂，但这里**按规范写成两次镜像的复合**而不是直接返回 n̂：
   * 直接返回会让「镜像不变色」这条性质变成同义反复，测试也就失去了意义。
   */
  function colorCoord(v, sphereName) {
    const sign = sphereSign(sphereName);
    return applySign(applySign(v, sign), sign);
  }

  /** 某球上一点的实际显示色（几何位置镜像，取色坐标反镜像） */
  function sphereColor(v, sphereName) {
    const c = colorCoord(v, sphereName);
    return comp(c[0], c[1], c[2]);
  }

  // ── 语义张量计算 ──────────────────────────────────────────────────────

  /** 方向相似：cosΔ = sinθ₁sinθ₂ + cosθ₁cosθ₂cos(φ₁−φ₂) */
  function cosDelta(a, b) {
    const t1 = deg2rad(a.theta);
    const t2 = deg2rad(b.theta);
    return (
      Math.sin(t1) * Math.sin(t2) +
      Math.cos(t1) * Math.cos(t2) * Math.cos(deg2rad(a.phi - b.phi))
    );
  }

  const scaleSim = (a, b) => Math.min(a.r, b.r) / Math.max(a.r, b.r);

  /** S_T = 0.65·(cosΔ+1)/2 + 0.15·尺度相似 + 0.20·(1−色差) */
  function tensorSimilarity(a, b, ca, cb) {
    const cd = cosDelta(a, b);
    const sc = scaleSim(a, b);
    // 默认色同样只取方向（单位球面），与 §10「尺度伸缩不改色」一致
    const col = colorDiff(
      ca || iotColor(sphToCart(1, a.theta, a.phi)),
      cb || iotColor(sphToCart(1, b.theta, b.phi))
    );
    return {
      cosDelta: cd,
      scaleSim: sc,
      colorDiff: col,
      S_T: 0.65 * ((cd + 1) / 2) + 0.15 * sc + 0.2 * (1 - col),
    };
  }

  /** 尺度伸缩：r' = clip(r × gain, 0.05, 1.00)；方向与颜色不变 */
  function scaleTensor(r, gain) {
    return clip(r * gain, 0.05, 1.0);
  }

  /**
   * 点色 —— 一律由**单位方向**合成，不含尺度。
   *
   * 为什么不能把 r 乘进去：规范 §10 明写「尺度伸缩 r′ = clip(r×gain)（方向与颜色不变）」。
   * 若颜色取自 r·n̂，缩放 r 就会改色，那条不变式立刻不成立。
   * 规范 §5 的 `C = comp(x,y,z)` 与 §10 并不冲突 —— 那里的 (x,y,z) 是八纲编码分量，
   * 与 §5 自己的 r（证据等级/症状密度/桥接完备度）是两套独立输入：
   * (x,y,z) 定方向与颜色，r 只定尺度。
   */
  const iotColor = (u) => comp(u[0], u[1], u[2]);

  /** 域聚合：方向取加权平均后归一；r 取加权平均；颜色由聚合方向重新合成 */
  function aggregate(items, weights) {
    const ws = weights || items.map(() => 1);
    const total = ws.reduce((a, b) => a + b, 0);
    const acc = [0, 0, 0];
    let rSum = 0;
    items.forEach((it, i) => {
      const v = sphToCart(1, it.theta, it.phi);
      acc[0] += v[0] * ws[i];
      acc[1] += v[1] * ws[i];
      acc[2] += v[2] * ws[i];
      rSum += it.r * ws[i];
    });
    const norm = Math.sqrt(acc[0] ** 2 + acc[1] ** 2 + acc[2] ** 2);
    const u = norm === 0 ? [0, 0, 1] : [acc[0] / norm, acc[1] / norm, acc[2] / norm];
    const sph = cartToSph(u);
    const r = rSum / total;
    const theta = norm === 0 ? 0 : sph.theta;
    const phi = norm === 0 ? 0 : sph.phi;
    return {
      theta,
      phi,
      r,
      u,
      degenerate: norm === 0,
      rgb: iotColor(u),
    };
  }

  // ── DDG 闭合单位球 ────────────────────────────────────────────────────

  /**
   * 离散微分几何（DDG）闭合单位球。
   * 顶点：北极点 + rings 个纬向环（每环 seg 点）+ 南极点 ⇒ 2 + rings·seg
   * 面：  两极各 seg 个三角扇 + (rings−1)·seg·2 个条带三角 ⇒ 与规范数字一致
   * 必须补极点顶点与三角扇，否则曲率全废（缺极点时两极是空洞，角度亏损和不再是 4π）。
   */
  function sphereGrid(rings, seg) {
    const R = rings || SPEC.renderSpec.grid.rings;
    const S = seg || SPEC.renderSpec.grid.seg;
    const vertices = [[0, 0, 1]];
    for (let i = 0; i < R; i += 1) {
      // ring 0 必须靠近**北**极：极点是 (0,0,1)，扇面接的是 ring 0。
      // 若 θ 从 −90 起算，ring 0 会落在南极附近却被接去北极点 ——
      // 那些三角面会横跨整个球并互相覆盖，Σ面积反而大于 4π，
      // 而这一切不会抛任何异常（只有 Gauss–Bonnet 断言能发现）。
      const theta = 90 - ((i + 0.5) * 180) / R;
      for (let j = 0; j < S; j += 1) {
        const phi = (j * 360) / S;
        vertices.push(sphToCart(1, theta, phi));
      }
    }
    const south = vertices.length;
    vertices.push([0, 0, -1]);

    const idx = (i, j) => 1 + i * S + ((j + S) % S);
    const faces = [];
    for (let j = 0; j < S; j += 1) faces.push([0, idx(0, j), idx(0, j + 1)]);
    for (let i = 0; i < R - 1; i += 1) {
      for (let j = 0; j < S; j += 1) {
        faces.push([idx(i, j), idx(i + 1, j), idx(i + 1, j + 1)]);
        faces.push([idx(i, j), idx(i + 1, j + 1), idx(i, j + 1)]);
      }
    }
    for (let j = 0; j < S; j += 1) faces.push([south, idx(R - 1, j + 1), idx(R - 1, j)]);

    return { rings: R, seg: S, vertices, faces, southIndex: south };
  }

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => Math.sqrt(dot(a, a));
  const unit = (a) => {
    const n = norm(a);
    return n === 0 ? [0, 0, 0] : [a[0] / n, a[1] / n, a[2] / n];
  };

  /** 拓扑计数：V / E / F 与 Euler 数（闭合球应为 2） */
  function topology(grid) {
    const V = grid.vertices.length;
    const F = grid.faces.length;
    const edges = new Set();
    for (const f of grid.faces) {
      for (let k = 0; k < 3; k += 1) {
        const a = f[k];
        const b = f[(k + 1) % 3];
        edges.add(a < b ? `${a}-${b}` : `${b}-${a}`);
      }
    }
    const E = edges.size;
    return { V, E, F, euler: V - E + F };
  }

  /** 三角面单位法向 */
  function faceNormal(grid, f) {
    const [a, b, c] = f.map((i) => grid.vertices[i]);
    return unit(cross(sub(b, a), sub(c, a)));
  }

  /** 顶点一角：两边夹角 */
  function angleAt(p, q, r) {
    const u = unit(sub(q, p));
    const v = unit(sub(r, p));
    return Math.acos(clip(dot(u, v), -1, 1));
  }

  /**
   * Σ 角度亏损 —— 离散 Gauss–Bonnet。
   * 顶点角度亏损 = 2π − Σ 相邻三角面在该顶点的内角；闭合球上总和恒为 4π（与半径无关）。
   * 这条断言能一次性抓出「缺极点 / 面的绕向错 / 索引错」三类网格 bug —— 它们都不会报错。
   */
  function angleDeficitSum(grid) {
    const deficit = new Float64Array(grid.vertices.length).fill(2 * Math.PI);
    for (const f of grid.faces) {
      for (let k = 0; k < 3; k += 1) {
        const at = f[k];
        const p = grid.vertices[at];
        const q = grid.vertices[f[(k + 1) % 3]];
        const r = grid.vertices[f[(k + 2) % 3]];
        deficit[at] -= angleAt(p, q, r);
      }
    }
    let s = 0;
    for (let i = 0; i < deficit.length; i += 1) s += deficit[i];
    return s;
  }

  /** 逐点曲率密度 K = 角度亏损 / 对偶胞面积（球面网格上 ≈ 1） */
  function curvatureDensity(grid) {
    // 注意：这里必须用**下标**累加面积，不能解构出顶点坐标当索引用。
    // 拿字符串当 TypedArray 的下标是静默无效的（不报错、不写入），
    // 于是所有面积都是 0，均值变成 NaN —— 一个不会抛异常的错。
    const area = new Float64Array(grid.vertices.length);
    for (const f of grid.faces) {
      const tri =
        0.5 *
        norm(
          cross(
            sub(grid.vertices[f[1]], grid.vertices[f[0]]),
            sub(grid.vertices[f[2]], grid.vertices[f[0]])
          )
        );
      area[f[0]] += tri / 3;
      area[f[1]] += tri / 3;
      area[f[2]] += tri / 3;
    }
    const deficit = new Float64Array(grid.vertices.length).fill(2 * Math.PI);
    for (const f of grid.faces) {
      for (let k = 0; k < 3; k += 1) {
        const at = f[k];
        deficit[at] -= angleAt(grid.vertices[at], grid.vertices[f[(k + 1) % 3]], grid.vertices[f[(k + 2) % 3]]);
      }
    }
    let sum = 0;
    let n = 0;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < deficit.length; i += 1) {
      if (area[i] <= 0) continue;
      const k = deficit[i] / area[i];
      sum += k;
      n += 1;
      if (k < min) min = k;
      if (k > max) max = k;
    }
    const totalDeficit = deficit.reduce((x, y) => x + y, 0);
    const totalArea = area.reduce((x, y) => x + y, 0);
    return {
      mean: sum / n,
      min,
      max,
      totalDeficit,
      totalArea,
      // 面元加权均值 + 总亏损/总面积 —— 与 Gauss–Bonnet 直接对应，两个都该 ≈1
      weighted: totalDeficit / totalArea,
      vertices: n,
    };
  }

  // ── 确定性编码 ────────────────────────────────────────────────────────

  const EVIDENCE_GRADE = { A: 1.0, B: 0.75, C: 0.5 };
  const BAGANG = {
    yinyang: { 阳证: 1, 阴证: -1 },
    hanre: { 热证: 1, 寒证: -1 },
    biaoli: { 表证: -1, 半表半里: 0, 里证: 1 },
    xushi: { 实证: 1, 虚证: -1 },
  };
  const grade = (v) => (v in EVIDENCE_GRADE ? EVIDENCE_GRADE[v] : 0.4);

  /** 取八纲字段值；未列项 0 */
  function bagangValue(group, value) {
    const table = BAGANG[group];
    if (!table) throw new Error(`semtensor: 未知八纲分组 ${group}`);
    return value in table ? table[value] : 0;
  }

  /**
   * DSU 确定性编码（规范 §5）。
   * 同一份输入必然得到同一组数字 —— 这是「零文本依赖」通道的前提。
   *
   * fields: { yinyang, hanre, biaoli, xushi, jing, qi, shen, evidence, mainSymptoms, minorSymptoms, bridgeText }
   */
  function encodeDSU(fields) {
    const f = fields || {};
    const x = 0.6 * bagangValue('yinyang', f.yinyang) + 0.4 * bagangValue('hanre', f.hanre);
    const y = 0.7 * bagangValue('biaoli', f.biaoli) + 0.3 * bagangValue('xushi', f.xushi);

    const jing = Number(f.jing) || 0;
    const qi = Number(f.qi) || 0;
    const shen = Number(f.shen) || 0;
    const z = (shen - jing) / (jing + qi + shen + 1);

    const evidence = f.evidence in EVIDENCE_GRADE ? EVIDENCE_GRADE[f.evidence] : 0.4;
    const symptomDensity = Math.min(1, ((Number(f.mainSymptoms) || 0) + (Number(f.minorSymptoms) || 0)) / 10);
    const bridge = Math.min(1, String(f.bridgeText || '').length / 200);
    const r = clip(0.35 * evidence + 0.35 * symptomDensity + 0.3 * bridge, 0.2, 1.0);

    const sph = cartToSph([x, y, z]);
    // 退化情形：八纲与精气神全空 ⇒ (x,y,z) = (0,0,0)，unit() 未定义。
    // 规范没写这一条，必须显式裁定（见 standards 的「待裁定项」）：
    // 方向取基准方位（赤道 θ=0、φ=0），同时打上 degenerate 标记，
    // 让渲染层可以用「空心点」把它与真实落在该方位的单元区分开 ——
    // 否则「三纲未列」的单元会被误读成一个具体方向上的语义。
    const degenerate = x === 0 && y === 0 && z === 0;
    const rgb = comp(x, y, z);
    return {
      x, y, z, r,
      theta: degenerate ? 0 : sph.theta,
      phi: degenerate ? 0 : sph.phi,
      u: degenerate ? [1, 0, 0] : sph.u,
      degenerate,
      rgb,
      hex: hexFromRgb01(rgb),
      // 中间量一并返回：排错时要能看见是哪一项把结果推偏的
      parts: { evidence, symptomDensity, bridge },
    };
  }

  // ── 图注（INI 风格三段制）─────────────────────────────────────────────

  /**
   * 解析图注文本：三段 [球] / [参数] / [图注正文]。
   * 图注是**可实例化的参数载体**，不是说明文字 —— 改文本即改图。
   */
  function parseAnnotation(text) {
    const out = { sphere: {}, params: {}, body: '' };
    let section = null;
    const body = [];
    for (const raw of String(text).replace(/\r\n/g, '\n').split('\n')) {
      const line = raw.trim();
      if (!line) { if (section === 'body') body.push(''); continue; }
      if (line.startsWith('#')) continue;
      const head = line.match(/^\[(.+)\]$/);
      if (head) {
        const name = head[1];
        section = name === '球' ? 'sphere' : name === '参数' ? 'params' : 'body';
        continue;
      }
      if (section === 'sphere' || section === 'params') {
        const m = line.match(/^([A-Za-z_][\w]*)\s*=\s*(.*)$/);
        if (m) {
          const v = m[2].trim();
          const num = Number(v);
          out[section][m[1]] = v !== '' && Number.isFinite(num) ? num : v;
        }
        continue;
      }
      body.push(raw);
    }
    out.body = body.join('\n').trim();
    return out;
  }

  // ── 导出 ──────────────────────────────────────────────────────────────

  const api = {
    SPEC,
    COLOR_O,
    AXIS_KEYS,
    clip,
    deg2rad,
    rad2deg,
    rgb01FromHex,
    hexFromRgb01,
    endColor,
    sphToCart,
    cartToSph,
    legacyPolarToElevation,
    ramp,
    rampMany,
    comp,
    compHex,
    iotColor,
    colorDiff,
    sphereSign,
    mirrorPoint,
    colorCoord,
    sphereColor,
    cosDelta,
    scaleSim,
    tensorSimilarity,
    scaleTensor,
    aggregate,
    sphereGrid,
    topology,
    faceNormal,
    angleDeficitSum,
    curvatureDensity,
    bagangValue,
    EVIDENCE_GRADE,
    BAGANG,
    encodeDSU,
    parseAnnotation,
    // 向量小工具：可视化层要用来做法向、投影与深度排序
    vec: { sub, cross, dot, norm, unit },
  };

  // 三条出口，缺一不可：
  //   window     —— 浏览器与测试夹具（loadScript 把 window 作为参数传入）
  //   globalThis —— 纯 Node 脚本
  //   module.exports —— 被 require 的计算核心场景（build 脚本、测试）
  if (typeof window !== 'undefined') window.TCMSemTensor = api;
  else if (typeof globalThis !== 'undefined') globalThis.TCMSemTensor = api;
  if (IS_NODE) module.exports = api;
})();