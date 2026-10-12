/**
 * [tcmP] site/sphere.js —— 三维极坐标语义球面（纯 SVG 投影 + 拖拽，无依赖）
 *
 * 规范：standards/semtensor/规范-三维极坐标语义张量-v1.0.md §7 §8 §9
 * 计算核心：site/semtensor.js（本文件只做投影与绘制，不自己算颜色）
 *
 * 三个设计选择，都是被约束逼出来的：
 *
 * 1. **SVG 而非 WebGL/Three.js**。规范原文的呈现层用 3 个 WebGL canvas。
 *    本仓库的硬约束是零第三方依赖，而 WebGL 手写需要着色器与矩阵库；
 *    更关键的是 SVG 能直接用原生 DOM 事件做悬停与文字标注，
 *    而规范要求「悬停语义点弹出 θ/φ/r/三分量/HEX」—— 在 WebGL 里做这件事
 *    要自己写拾取（picking），在 SVG 里只是一个 mouseenter。
 *    代价：点数不宜上万；本图是几十个语义单元，远未到瓶颈。
 *
 * 2. **画布内不出现汉字**（§8）。这不是洁癖：汉字会引入字体依赖与排版差异，
 *    而球面图是要被机器核对的（§12）。所有汉字母语下沉到图注与读数面板 ——
 *    它们都在 SVG 之外，可编辑、可实例化。本文件内任何写进 SVG 的字符串
 *    都必须过 assertLatin()，测试会逐条检查 text 节点。
 *
 * 3. **正交投影而非透视**。规范给的是固定视角（θ_视=20°, φ_视=−60°）下的
 *    三轴正交坐标图，正交投影下 X/Y/Z 的三轴夹角才稳定，透视会让近端轴变长、
 *    远端轴变短，读者就没法用「夹角」判断轴向了。
 */

(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  // 与 semtensor.js 同理：优先取运行时注入的实例，再退回 require。
  // 靠 `typeof module` 判断环境是脆的（new Function 的作用域里看不见什么，随调用方式变）。
  const S = (function () {
    const rt = typeof window !== 'undefined'
      ? window
      : (typeof globalThis !== 'undefined' ? globalThis : null);
    if (rt && rt.TCMSemTensor) return rt.TCMSemTensor;
    if (typeof require === 'function' && typeof module === 'object' && module && module.exports) {
      return require('./semtensor');
    }
    return null;
  })();

  if (!S) throw new Error('sphere.js: 需要先加载 semtensor.js（并提供 window.TCMSemTensor）');

  const DEG = Math.PI / 180;

  // ── SVG 小工具（与 site/figures.js 同形）────────────────────────────

  /**
   * SVG 元素工厂。**只用于 SVG 标签**。
   *
   * 踩过的坑：把它复用到 HTML 标签上（如 el('div')）会创建出命名空间为 SVG 的 div，
   * 浏览器对「未知 SVG 元素」直接不渲染 —— 页面一片空白、控制台零报错，
   * 而 shim 里两边都返回同一个对象，测试也发现不了。HTML 节点一律用 helm()。
   */
  function el(name, attrs, kids) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs || {}) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    (Array.isArray(kids) ? kids : kids ? [kids] : []).filter(Boolean).forEach((c) => e.appendChild(c));
    return e;
  }

  /** HTML 元素工厂（div/span/button…）—— 命名空间必须是 HTML，否则不会被渲染 */
  function helm(name, attrs, kids) {
    const e = document.createElement(name);
    for (const k in attrs || {}) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    (Array.isArray(kids) ? kids : kids ? [kids] : []).filter(Boolean).forEach((c) => e.appendChild(c));
    return e;
  }
  const txt = (s) => document.createTextNode(String(s));

  /**
   * 只允许 ASCII 进**渲染出的文本**（规范 §8）。
   *
   * 边界要说清，否则这条规则会被过度执行或执行不到：
   *   - `<text>` 的内容、`<title>`/`<desc>` —— 会被画出来 / 会进读屏的可见描述 ⇒ 必须 ASCII；
   *   - `data-*` 与 aria-label —— 纯元数据，不参与排版 ⇒ 允许汉字，
   *     但为了让规则无歧义，本组件对二者也一律用拉丁名，中文名另放 data-sphere-zh。
   */
  function assertLatin(s, where) {
    if (/[\u3000-\u303F\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF]/.test(String(s))) {
      throw new Error(`sphere.js: ${where} 试图把 CJK 写进画布：「${s}」（规范 §8 禁止）`);
    }
    return String(s);
  }

  /** 母/子/父 → 拉丁代号（画布内一律用它） */
  const LATIN_NAME = { 母: 'mu', 子: 'zi', 父: 'fu' };
  const latinOf = (name) => LATIN_NAME[name] || String(name).replace(/[^A-Za-z0-9]/g, '') || 's';

  // ── 相机与投影 ────────────────────────────────────────────────────────

  /**
   * 正交相机。e = 由原点指向观察者的单位向量。
   * 视线与参考轴重合时 right 会退化为零向量，必须换参考轴 ——
   * 否则投影矩阵整列变成 0，所有点挤成一条线，而程序不会报错。
   */
  function makeCamera(elevDeg, azimDeg) {
    const e = S.sphToCart(1, elevDeg, azimDeg);
    let upHint = [0, 0, 1];
    if (Math.abs(S.vec.dot(e, upHint)) > 0.999) upHint = [0, 1, 0];
    const right = S.vec.unit(S.vec.cross(upHint, e));
    const up = S.vec.cross(e, right);
    return { e, right, up, elevDeg, azimDeg };
  }

  /** 正交投影：屏幕 x 向右、y 向下（SVG 坐标）；depth > 0 表示朝向观察者 */
  function project(p, cam, R, cx, cy) {
    const sx = S.vec.dot(p, cam.right);
    const sy = S.vec.dot(p, cam.up);
    return { x: cx + sx * R, y: cy - sy * R, depth: S.vec.dot(p, cam.e) };
  }

  const projVec = (u, cam, R, cx, cy) => project(u, cam, R, cx, cy);

  // ── 可见 / 背面切分 ──────────────────────────────────────────────────

  /**
   * 把一条折线按 depth 正负切成「可见段 / 背面段」。
   * 不做这一步就只能整条线一种样式，球面会读成一张平面网。
   */
  function splitByVisibility(pts) {
    const runs = [];
    let cur = null;
    for (let i = 0; i < pts.length; i += 1) {
      const p = pts[i];
      const vis = p.depth >= 0;
      if (!cur || cur.vis !== vis) {
        // 新段要把上一段的末点接进来：否则折线会在 depth 符号翻转处断开，
        // 球面轮廓上会看到一道道缝。
        cur = { vis, pts: cur && i > 0 ? [pts[i - 1], p] : [p] };
        runs.push(cur);
      } else {
        cur.pts.push(p);
      }
    }
    return runs;
  }

  function pathD(pts) {
    return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  }

  // ── 网格：经线 / 纬线 / 赤道 / 阴阳界 ───────────────────────────────

  function drawGrid(svg, cam, R, cx, cy, params, style) {
    const rings = params.rings;
    const seg = params.seg;
    const ringStride = Math.max(1, Math.round(rings / 12));   // 12 条纬线
    const segStride = Math.max(1, Math.round(seg / 24));      // 24 条经线
    const g = el('g', { class: 'sphere-grid' });

    // 纬线（平行圈）
    for (let i = 0; i < rings; i += ringStride) {
      const theta = 90 - ((i + 0.5) * 180) / rings;
      const pts = [];
      for (let j = 0; j <= seg; j += 1) {
        pts.push(project(S.sphToCart(1, theta, (j * 360) / seg), cam, R, cx, cy));
      }
      for (const run of splitByVisibility(pts)) {
        g.appendChild(el('path', {
          d: pathD(run.pts), fill: 'none',
          stroke: style.grid, 'stroke-width': run.vis ? 0.7 : 0.5,
          'stroke-dasharray': run.vis ? null : '2 3', opacity: run.vis ? 0.55 : 0.22,
        }));
      }
    }

    // 经线
    for (let j = 0; j < seg; j += segStride) {
      const phi = (j * 360) / seg;
      const pts = [];
      for (let i = 0; i < rings; i += 1) {
        const theta = 90 - ((i + 0.5) * 180) / rings;
        pts.push(project(S.sphToCart(1, theta, phi), cam, R, cx, cy));
      }
      for (const run of splitByVisibility(pts)) {
        g.appendChild(el('path', {
          d: pathD(run.pts), fill: 'none',
          stroke: style.grid, 'stroke-width': run.vis ? 0.7 : 0.5,
          'stroke-dasharray': run.vis ? null : '2 3', opacity: run.vis ? 0.55 : 0.22,
        }));
      }
    }

    // 赤道 θ = 0（细虚线）
    const eq = [];
    for (let j = 0; j <= seg; j += 1) eq.push(project(S.sphToCart(1, 0, (j * 360) / seg), cam, R, cx, cy));
    for (const run of splitByVisibility(eq)) {
      g.appendChild(el('path', {
        d: pathD(run.pts), fill: 'none', stroke: style.equator,
        'stroke-width': 0.9, 'stroke-dasharray': '3 4', opacity: run.vis ? 0.75 : 0.25,
      }));
    }

    // 方位基准经线 φ = 0° / 180°
    for (const phi of [0, 180]) {
      const pts = [];
      for (let i = 0; i < rings; i += 1) {
        const theta = 90 - ((i + 0.5) * 180) / rings;
        pts.push(project(S.sphToCart(1, theta, phi), cam, R, cx, cy));
      }
      for (const run of splitByVisibility(pts)) {
        g.appendChild(el('path', {
          d: pathD(run.pts), fill: 'none', stroke: style.meridian,
          'stroke-width': run.vis ? 1 : 0.6, opacity: run.vis ? 0.6 : 0.2,
        }));
      }
    }

    // 阴阳界大圆 φ = 90° / 270°（平面 X = 0）
    {
      const pts = [];
      for (let k = 0; k <= 120; k += 1) {
        const a = (k / 120) * Math.PI * 2;
        pts.push(project([0, Math.cos(a), Math.sin(a)], cam, R, cx, cy));
      }
      for (const run of splitByVisibility(pts)) {
        g.appendChild(el('path', {
          d: pathD(run.pts), fill: 'none', stroke: style.boundary,
          'stroke-width': 1.4, opacity: run.vis ? 0.85 : 0.28,
          'stroke-dasharray': null,
        }));
      }
    }

    svg.appendChild(g);
    return g;
  }

  // ── 方位角标尺（赤道环每 30° 一刻度，仅可见半球）──────────────────

  function drawAzimuthScale(svg, cam, R, cx, cy, params, style) {
    const g = el('g', { class: 'sphere-azimuth' });
    const step = params.azimuth_step_deg;
    for (let a = 0; a < 360; a += step) {
      const u = S.sphToCart(1, 0, a);
      const p = project(u, cam, R, cx, cy);
      if (p.depth <= 0.02) continue;                       // 仅可见半球
      const outer = project(S.sphToCart(1.06, 0, a), cam, R, cx, cy);
      const inner = project(S.sphToCart(0.94, 0, a), cam, R, cx, cy);
      g.appendChild(el('line', {
        x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y,
        stroke: style.tick, 'stroke-width': 1,
      }));
      const lab = project(S.sphToCart(1.16, 0, a), cam, R, cx, cy);
      g.appendChild(el('text', {
        x: lab.x, y: lab.y + 3, 'text-anchor': 'middle',
        'font-family': 'var(--mono)', 'font-size': 9, fill: style.tick,
      }, [txt(assertLatin(`${a}\u00B0`, '方位刻度'))]));
    }
    svg.appendChild(g);
    return g;
  }

  // ── 三轴：两段三点 I / O / T ─────────────────────────────────────────

  function drawAxes(svg, cam, R, cx, cy, params, style) {
    const g = el('g', { class: 'sphere-axes' });
    const defs = el('defs');
    const pipeW = Math.max(2.4, params.pipeRadius * R * 3);
    const headLen = Math.max(10, pipeW * 3.4);
    const halfW = headLen * Math.tan(params.arrow_head_deg * DEG);
    const O = project([0, 0, 0], cam, R, cx, cy);

    for (const axis of ['X', 'Y', 'Z']) {
      const dir = { X: [1, 0, 0], Y: [0, 1, 0], Z: [0, 0, 1] }[axis];
      const cI = S.rgb01FromHex(S.SPEC.axes[axis].i.hex);
      const cO = S.rgb01FromHex(S.SPEC.axes[axis].o.hex);
      const cT = S.rgb01FromHex(S.SPEC.axes[axis].t.hex);

      const pI = project(dir.map((d) => -d), cam, R, cx, cy);
      const pT = project(dir, cam, R, cx, cy);

      // 两段的渐变：I→O 由端色渐到基准绿，O→T 由基准绿渐到端色
      for (const [id, from, to, a, b] of [
        [`g-${axis}-i`, cI, cO, pI, O],
        [`g-${axis}-t`, cO, cT, O, pT],
      ]) {
        const grad = el('linearGradient', {
          id, gradientUnits: 'userSpaceOnUse',
          x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        }, [
          el('stop', { offset: '0%', 'stop-color': S.hexFromRgb01(from) }),
          el('stop', { offset: '100%', 'stop-color': S.hexFromRgb01(to) }),
        ]);
        defs.appendChild(grad);
      }

      g.appendChild(el('line', {
        x1: pI.x, y1: pI.y, x2: O.x, y2: O.y,
        stroke: `url(#g-${axis}-i)`, 'stroke-width': pipeW, 'stroke-linecap': 'butt',
      }));
      g.appendChild(el('line', {
        x1: O.x, y1: O.y, x2: pT.x, y2: pT.y,
        stroke: `url(#g-${axis}-t)`, 'stroke-width': pipeW, 'stroke-linecap': 'butt',
      }));

      // T 端实体箭头（锥半顶角 arrow_head_deg）
      const ux = pT.x - O.x;
      const uy = pT.y - O.y;
      const len = Math.hypot(ux, uy) || 1;
      const nx = -uy / len;
      const ny = ux / len;
      const bx = pT.x - (ux / len) * headLen;
      const by = pT.y - (uy / len) * headLen;
      g.appendChild(el('path', {
        d: `M${pT.x.toFixed(2)} ${pT.y.toFixed(2)} L${(bx + nx * halfW).toFixed(2)} ${(by + ny * halfW).toFixed(2)} L${(bx - nx * halfW).toFixed(2)} ${(by - ny * halfW).toFixed(2)} Z`,
        fill: S.hexFromRgb01(cT), stroke: 'none',
      }));

      // I / O / T 三点与轴名（全部 ASCII，规范 §8）
      const ends = [
        [pI, S.SPEC.axes[axis].i.hex, 'I'],
        [pT, S.SPEC.axes[axis].t.hex, 'T'],
      ];
      for (const [p, hex, name] of ends) {
        g.appendChild(el('circle', { cx: p.x, cy: p.y, r: pipeW * 0.95, fill: hex, stroke: style.paper, 'stroke-width': 1 }));
        const lab = project(dir.map((d) => (name === 'I' ? -d : d) * 1.13), cam, R, cx, cy);
        g.appendChild(el('text', {
          x: lab.x, y: lab.y + 4, 'text-anchor': 'middle',
          'font-family': 'var(--mono)', 'font-size': 12, 'font-weight': 600, fill: hex,
        }, [txt(assertLatin(`${name}${axis}`, '轴端标签'))]));
      }
      // 轴名放在 T 端外侧。必须比 T 端标签更远，否则两者会挤在一起 ——
      // 「TX」与「X」贴在一起时读者会误读成轴名的一部分。
      const axisLab = project(dir.map((d) => d * 1.52), cam, R, cx, cy);
      g.appendChild(el('text', {
        x: axisLab.x, y: axisLab.y + 4, 'text-anchor': 'middle',
        'font-family': 'var(--mono)', 'font-size': 11, fill: style.muted,
      }, [txt(assertLatin(axis, '轴名'))]));
    }

    // O 点三轴共有，基准绿
    g.appendChild(el('circle', {
      cx: O.x, cy: O.y, r: pipeW * 0.8, fill: S.SPEC.origin.hex, stroke: style.paper, 'stroke-width': 1,
    }));
    g.appendChild(el('text', {
      x: O.x + pipeW * 1.6, y: O.y + pipeW * 3.4,
      'font-family': 'var(--mono)', 'font-size': 10, fill: style.muted,
    }, [txt(assertLatin('O', '原点标签'))]));

    svg.appendChild(defs);
    svg.appendChild(g);
    return g;
  }

  // ── 语义点云 ──────────────────────────────────────────────────────────

  /**
   * 点云。颜色一律取「方向」（单位球面），不含尺度 —— 见规范 §4.1。
   * 透明度由离散法向 |n·v| 驱动：轮廓最不透明，正对观察者处最透明（§7）。
   * depthshade = false：颜色即数据，不被深度调淡（只调透明度，不改颜色）。
   */
  function drawUnits(svg, cam, R, cx, cy, units, sphereName, params, style, onPick) {
    const g = el('g', { class: 'sphere-units' });
    const alphaFace = params.cloud_alpha_face;
    const alphaRim = params.cloud_alpha_rim;
    const baseSize = params.cloud_point_size;

    const drawn = units.map((u) => {
      const unit = u.u || S.sphToCart(1, u.theta, u.phi);
      const geom = S.mirrorPoint(unit, sphereName);           // 几何随球镜像
      const rgb = S.sphereColor(unit, sphereName);            // 取色坐标反镜像 ⇒ 三球同色
      const p = project(geom.map((d) => d * u.r), cam, R, cx, cy);
      const facing = Math.abs(S.vec.dot(unit, cam.e));
      const alpha = alphaFace + (alphaRim - alphaFace) * (1 - facing);
      // 近大远小：深度映射到 0.72…1.08 倍
      const nearFar = 0.72 + 0.36 * ((p.depth + 1) / 2);
      const size = baseSize * (0.55 + 0.45 * u.r) * nearFar * 0.5;
      return { u, p, rgb, alpha: S.clip(alpha, 0, 1), size, hex: S.hexFromRgb01(rgb), degenerate: !!u.degenerate };
    }).sort((a, b) => a.p.depth - b.p.depth);                 // 按深度排序绘制

    for (const d of drawn) {
      const attrs = {
        cx: d.p.x.toFixed(2), cy: d.p.y.toFixed(2), r: d.size.toFixed(2),
        fill: d.degenerate ? 'none' : d.hex,
        stroke: d.degenerate ? d.hex : style.paper,
        'stroke-width': d.degenerate ? 1.6 : 0.9,
        opacity: (d.p.depth < 0 ? d.alpha * 0.45 : d.alpha).toFixed(3),
        'data-unit': d.u.key || d.u.name || '',
        style: 'cursor:pointer',
      };
      const c = el('circle', attrs);
      if (onPick) {
        const enter = () => onPick(d, true);
        const leave = () => onPick(d, false);
        c.addEventListener('mouseenter', enter);
        c.addEventListener('mouseleave', leave);
        c.addEventListener('focus', enter);
        c.addEventListener('blur', leave);
      }
      g.appendChild(c);
    }

    svg.appendChild(g);
    return g;
  }

  // ── 单球渲染 ──────────────────────────────────────────────────────────

  const DEFAULT_PARAMS = {
    rings: 45,
    seg: 70,
    azimuth_step_deg: 30,
    arrow_head_deg: 13,
    pipeRadius: 0.0085,
    cloud_point_size: 9,
    cloud_alpha_rim: 0.95,
    cloud_alpha_face: 0.3,
    view_elev_deg: 20,
    view_azim_deg: -60,
  };

  const THEME = {
    grid: '#c9c3b6',
    equator: '#8c8579',
    meridian: '#a8a196',
    boundary: '#c0392b',
    tick: '#8c8579',
    muted: '#6b6459',
    paper: '#fffdf8',
  };

  function renderOne(host, opts) {
    const { cam, units, sphereName, params, title, onPick } = opts;
    const W = 460;
    const H = 420;
    const R = 138;
    const cx = W / 2;
    const cy = H / 2 + 8;
    const svg = el('svg', {
      viewBox: `0 0 ${W} ${H}`, width: '100%', role: 'img',
      'aria-label': assertLatin(`polar sphere ${latinOf(sphereName)}`, 'aria'),
      'data-sphere-zh': sphereName,
      style: 'display:block;max-width:100%;height:auto;touch-action:none;cursor:grab',
    });
    svg.setAttribute('data-sphere', latinOf(sphereName));

    drawGrid(svg, cam, R, cx, cy, params, THEME);
    drawAzimuthScale(svg, cam, R, cx, cy, params, THEME);
    drawAxes(svg, cam, R, cx, cy, params, THEME);
    drawUnits(svg, cam, R, cx, cy, units, sphereName, params, THEME, onPick);

    // 圈号 ①②③ 与球名（球名是汉字 ⇒ 放到 SVG 之外；画布内只画圈号）
    const badge = { 母: '\u2460', 子: '\u2461', 父: '\u2462' }[sphereName] || '?';
    svg.appendChild(el('text', {
      x: 12, y: 20, 'font-family': 'var(--mono)', 'font-size': 15, fill: THEME.muted,
    }, [txt(assertLatin(badge, '圈号'))]));
    assertLatin(latinOf(sphereName), '球标题');
    host.appendChild(svg);
    return svg;
  }

  // ── 交互视图（三球同步旋转 + 图注面板 + 读数）────────────────────────

  const DEFAULT_ANNOTATION = [
    '# 图注：三段制 [球] / [参数] / [图注正文]   —— 改文本即改图',
    '',
    '[球]',
    'no = 1',
    'name = 母',
    'sex = 女',
    'sign = -1,-1,1',
    '',
    '[参数]',
    'rings = 45',
    'seg = 70',
    'azimuth_step_deg = 30',
    'arrow_head = 13',
    'cloud_point_size = 9',
    'cloud_alpha_rim = 0.95',
    'cloud_alpha_face = 0.30',
    'view_elev_deg = 20',
    'view_azim_deg = -60',
    '',
    '[图注正文]',
    '球面内不出现汉字：只用 X/Y/Z、I/O/T、θ/φ 数字与圈号 ①②③。',
    '汉字母语全部下沉到本图注与右侧读数面板。',
    '数字 ↔ 域名映射见本文件下方的数据集表。',
  ].join('\n');

  /**
   * 渲染交互视图。
   * opts: { units, spheres, annotation, host, readout }
   * 返回 handle: { setView, applyAnnotation, getParams, getCamera, svgs, redraw }
   */
  function render(host, opts) {
    const o = opts || {};
    const units = o.units || [];
    const spheres = o.spheres || ['母', '子', '父'];
    const readout = o.readout || null;

    let params = Object.assign({}, DEFAULT_PARAMS);
    let annotation = o.annotation || DEFAULT_ANNOTATION;
    let cam = makeCamera(params.view_elev_deg, params.view_azim_deg);
    const svgs = [];

    host.setAttribute('data-role', 'semtensor-view');
    host.innerHTML = '';

    const grid = helm('div', { class: 'sphere-grid-3', style: 'display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start' });
    const panels = spheres.map((name) => {
      const wrap = helm('div');
      wrap.setAttribute('data-sphere-wrap', name);
      wrap.setAttribute('style', 'flex:1 1 300px;min-width:260px');
      const cap = helm('div');
      cap.setAttribute('class', 'small muted');
      cap.setAttribute('style', 'text-align:center;margin-bottom:2px');
      cap.textContent = `${name}球`;                 // 汉字在画布之外
      wrap.appendChild(cap);
      grid.appendChild(wrap);
      return { name, wrap };
    });
    host.appendChild(grid);

    const onPick = (d, on) => {
      if (!readout) return;
      if (!on) { readout.innerHTML = readout.getAttribute('data-idle') || ''; return; }
      const u = d.u;
      const comp = S.sphToCart(1, u.theta, u.phi);
      readout.innerHTML =
        `<div class="mono small"><b>${u.name || u.key || ''}</b></div>` +
        `<div class="mono small">θ = ${u.theta.toFixed(2)}°　（仰角 elevation）</div>` +
        `<div class="mono small">φ = ${u.phi.toFixed(2)}°　（方位角 azimuth）</div>` +
        `<div class="mono small">r = ${u.r.toFixed(3)}　（语义张量尺度）</div>` +
        `<div class="mono small">三分量 X = ${comp[0].toFixed(3)}　Y = ${comp[1].toFixed(3)}　Z = ${comp[2].toFixed(3)}</div>` +
        `<div class="mono small">HEX = ${d.hex}${u.degenerate ? '　⚠ 方向未定义（三轴全零）' : ''}</div>` +
        (u.detail ? `<div class="small muted" style="margin-top:6px">${u.detail}</div>` : '');
    };

    function redraw() {
      while (svgs.length) svgs.pop();
      panels.forEach((p) => { p.wrap.innerHTML = ''; const c = helm('div'); c.setAttribute('class', 'small muted'); c.setAttribute('style', 'text-align:center;margin-bottom:2px'); c.textContent = `${p.name}球`; p.wrap.appendChild(c); });
      panels.forEach((p) => {
        svgs.push(renderOne(p.wrap, { cam, units, sphereName: p.name, params, title: p.name, onPick }));
      });
    }

    // ── 拖拽旋转：三球共用一个相机 ⇒ 天然同步 ──
    let dragging = null;
    const onDown = (ev) => {
      dragging = { x: ev.clientX, y: ev.clientY, elev: cam.elevDeg, azim: cam.azimDeg };
      if (ev.target && ev.target.setAttribute) ev.target.setAttribute('style', 'cursor:grabbing');
      if (ev.preventDefault) ev.preventDefault();
    };
    const onMove = (ev) => {
      if (!dragging) return;
      const dElev = (ev.clientY - dragging.y) * 0.4;
      const dAzim = (ev.clientX - dragging.x) * 0.4;
      setView(S.clip(dragging.elev + dElev, -89, 89), (dragging.azim + dAzim) % 360);
    };
    const onUp = () => { dragging = null; };

    function setView(elev, azim) {
      params.view_elev_deg = elev;
      params.view_azim_deg = azim;
      cam = makeCamera(elev, azim);
      redraw();
      if (o.onView) o.onView(elev, azim);
    }

    /** 应用图注文本：改文本即改图（规范 §9） */
    function applyAnnotation(text) {
      annotation = text;
      const a = S.parseAnnotation(text);
      const next = Object.assign({}, params);
      const map = {
        rings: 'rings', seg: 'seg', azimuth_step_deg: 'azimuth_step_deg',
        arrow_head: 'arrow_head_deg', cloud_point_size: 'cloud_point_size',
        cloud_alpha_rim: 'cloud_alpha_rim', cloud_alpha_face: 'cloud_alpha_face',
        view_elev_deg: 'view_elev_deg', view_azim_deg: 'view_azim_deg',
      };
      for (const [k, target] of Object.entries(map)) {
        if (Number.isFinite(a.params[k])) next[target] = a.params[k];
      }
      if (Number.isFinite(a.params.arrow_head) && !Number.isFinite(a.params.arrow_head_deg)) {
        next.arrow_head_deg = a.params.arrow_head;
      }
      const viewChanged = next.view_elev_deg !== params.view_elev_deg || next.view_azim_deg !== params.view_azim_deg;
      params = next;
      if (viewChanged) cam = makeCamera(params.view_elev_deg, params.view_azim_deg);
      redraw();
      return { params: Object.assign({}, params), sphere: a.sphere, body: a.body };
    }

    host.addEventListener('mousedown', onDown);
    host.addEventListener('mousemove', onMove);
    host.addEventListener('mouseup', onUp);
    host.addEventListener('mouseleave', onUp);

    if (readout) readout.setAttribute('data-idle', readout.innerHTML || '');
    redraw();

    return {
      setView,
      applyAnnotation,
      getParams: () => Object.assign({}, params),
      getCamera: () => ({ elevDeg: cam.elevDeg, azimDeg: cam.azimDeg, e: cam.e, right: cam.right, up: cam.up }),
      getAnnotation: () => annotation,
      svgs,
      redraw,
      /** 供测试：宿主里 SVG 命名空间的元素才算画布内容 */
      isSvgNamespace: (n) => n && n.namespaceURI === NS,
    };
  }

  const api = {
    render,
    renderOne,
    makeCamera,
    project,
    projVec,
    splitByVisibility,
    DEFAULT_PARAMS,
    DEFAULT_ANNOTATION,
    THEME,
    assertLatin,
  };

  if (typeof window !== 'undefined') window.TCMSphere = api;
  else if (typeof globalThis !== 'undefined') globalThis.TCMSphere = api;
  if (typeof module === 'object' && module && module.exports) module.exports = api;
})();
