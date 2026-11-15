#!/usr/bin/env node
/**
 * scripts/build_zhenghou_site.js —— 生成 site/zhenghou.html（疾病证候单元 · 百姓入口页）
 *
 *   node scripts/build_zhenghou_site.js            # 写文件
 *   node scripts/build_zhenghou_site.js --check     # 只比对，不写（幂等门）
 *
 * 这一页是「平台配套」：辞典与接口在仓库里，百姓却打不开。页面把三件事放到一个
 * 单文件里，离线可用、不依赖任何 CDN：
 *   ① 查：按证名/候名/门/类/词项搜（1866 候全部可搜）；
 *   ② 说：输入一句主诉 → 门/证/档位，与 scripts/zhenghou_encode.js 同规则（对齐测试见
 *      tests/test_zhenghou_site.js）；
 *   ③ 读：每一门的「危候长在哪一格」与三条读法，配 12 门×6 族计数。
 *
 * 为什么单独一页、不塞进 app.js：站点是浅色教程风，这一页是给百姓用的工具页，
 * 沿用「暖色深底 + 宋体」的阅读语言（与读书会交流页同一套），并且必须能单文件离线打开。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const STD = path.join(ROOT, 'standards', 'zhenghou-cidian');
const OUT = path.join(ROOT, 'site', 'zhenghou.html');

const read = (f) => JSON.parse(fs.readFileSync(path.join(STD, f), 'utf8'));

/** 组装页面要用的数据（也给测试复用，保证与页面同源） */
function buildData() {
  const struct = read('结构.json');
  const wei = read('语素-位.json');
  const xing = read('语素-性.json');
  const tai = read('语素-态.json');
  const alias = read('口语别名.json');
  const qa = read('问答样例.json');
  // 附录一「75 证象」索引：页面用它与接口同口径做名形校验（合法格 / 空格 / 不判）
  let xiang = null;
  try { xiang = read('证象-合法组合.json'); } catch (e) { xiang = null; }

  const famOf = Object.fromEntries((tai.态 || []).map((t) => [t.zh, t.族 || '其他']));

  const xiangData = xiang;

  const men = struct.men.map((m) => ({
    code: m.code, zh: m.zh, n: m.n,
    hou: m.lei.reduce((s, l) => s + l.zhengList.reduce((t, z) => t + z.houList.length, 0), 0),
    lei: m.lei.map((l) => ({
      code: l.code, zh: l.zh,
      zheng: l.zhengList.map((z) => z.full + '|' + z.zh + '|' + (z.wei || '')),
    })),
  }));

  // 门 × 六族计数（图 10 的数字，页面上直接用）
  const FAMS = ['失守', '郁', '虚', '火', '陷逆', '脱绝'];
  const famGrid = struct.men.map((m) => {
    const row = {};
    for (const f of FAMS) row[f] = 0;
    for (const l of m.lei) for (const z of l.zhengList) for (const h of z.houList) {
      const f = famOf[h.tai] || '其他';
      if (f in row) row[f] += 1;
    }
    return { code: m.code, zh: m.zh, row };
  });

  // 候级索引：全码 → 候名/证/门（供搜索，不含正文，控制体积）
  const hou = [];
  for (const m of struct.men) for (const l of m.lei) for (const z of l.zhengList) {
    for (const h of z.houList) hou.push(h.full + '|' + h.zh + '|' + m.code + '|' + z.zh);
  }

  return {
    title: '疾病证候单元 · 中医证候辞典',
    counts: {
      men: struct.counts.men, lei: struct.counts.lei, zheng: struct.counts.zhengInstances,
      hou: struct.counts.houInstances, cells: struct.counts.tensorCells,
    },
    men,
    wei: wei.证位.map((w) => ({ zh: w.zh, 见症: w.见症 })),
    xing: xing.类.map((y) => ({ zh: y.zh, 见症: y.见症 })),
    zheng: struct.men.flatMap((m) => m.lei.flatMap((l) => l.zhengList.map((z) => ({
      full: z.full, zh: z.zh, men: m.code + ' ' + m.zh, wei: z.wei || '',
      leiZh: l.zh, hou: z.houList.length,
    })))),
    hou,
    famGrid, fams: FAMS,
    alias: alias.别名 || {}, danger: alias.危象 || {},
    xiang: xiangData,
    qa: (qa.用例 || []).map((c) => ({ id: c.id, text: c.text, 期望门: c.期望门, 危: c.期望危候 })),
  };
}

function html(data) {
  const core = fs.readFileSync(path.join(ROOT, 'site', 'zhenghou-core.js'), 'utf8');
  const payload = JSON.stringify(data);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>疾病证候单元 · 中医证候辞典</title>
<meta name="description" content="12 门 / 45 类 / 291 证 / 1866 候的疾病证候单元辞典，附百姓口语查询与追问。"/>
<style>
  :root{
    --bg:#0d0a07; --panel:#1a1610; --line:#2a2218; --ink:#e8e0d2; --muted:#9a8f7c;
    --accent:#c8843c; --danger:#c2452f;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);
    font-family:"Noto Serif SC","Source Han Serif CN","Songti SC",SimSun,serif;line-height:1.75}
  header{padding:40px 28px 16px;border-bottom:1px solid var(--line)}
  h1{margin:0 0 6px;font-size:26px;letter-spacing:.04em}
  .sub{color:var(--muted);font-size:14px}
  .wrap{max-width:1120px;margin:0 auto;padding:24px 20px 64px}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:18px 0 26px}
  .card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:14px 16px}
  .card b{display:block;font-size:24px;color:var(--accent)}
  .card span{font-size:13px;color:var(--muted)}
  section{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin:0 0 18px}
  h2{margin:0 0 10px;font-size:17px;color:var(--accent)}
  input,button{font-family:inherit;font-size:15px}
  input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--line);
    background:#0b0906;color:var(--ink);outline:none}
  input:focus{border-color:var(--accent)}
  button{margin-top:10px;padding:9px 16px;border-radius:8px;border:1px solid var(--accent);
    background:transparent;color:var(--accent);cursor:pointer}
  button:hover{background:rgba(200,132,60,.12)}
  .hint{color:var(--muted);font-size:13px;margin:8px 0 0}
  .row{border-top:1px dashed var(--line);padding:9px 0;font-size:14px}
  .row:first-of-type{border-top:0}
  .tag{display:inline-block;padding:1px 7px;border-radius:6px;font-size:12px;margin-left:6px;
    border:1px solid var(--line);color:var(--muted)}
  .tag.strong{color:#7fbf7f;border-color:#3d5a3d}
  .tag.normal{color:var(--accent);border-color:#5a3d1f}
  .tag.weak{color:#c9a227;border-color:#5a4d1f}
  .danger{color:var(--danger);font-weight:700}
  table{border-collapse:collapse;width:100%;font-size:13px}
  th,td{border-bottom:1px solid var(--line);padding:5px 6px;text-align:right}
  th:first-child,td:first-child{text-align:left}
  .ask{color:#c9a227;font-size:13px;margin:6px 0 0}
  code{background:#0b0906;padding:1px 5px;border-radius:4px;font-size:12px}
  footer{color:var(--muted);font-size:12px;padding:20px 24px;border-top:1px solid var(--line)}
  a{color:var(--accent)}
</style>
</head>
<body>
<header>
  <div class="sub" style="margin-bottom:10px"><a href="index.html">← 返回平台首页</a></div>
  <h1>疾病证候单元 · 中医证候辞典</h1>
  <div class="sub">底本《中医证候学》三册（扫描件 2,408 页）· 四级编码与 ICD-11 同构 ·
    本页离线可用，与 <code>POST /encode</code> 同一套判定规则</div>
</header>
<div class="wrap">
  <div class="cards" id="counts"></div>

  <section>
    <h2>一、说一句人话，看它落到哪一门</h2>
    <input id="q" placeholder="例：怕冷 没汗 头身疼 ／ 干咳 嗓子干 皮肤干 ／ 突然昏倒 冷汗"/>
    <button id="go">查一查</button>
    <div id="out"></div>
    <p class="hint">候选不是诊断。危象词（昏倒、厥脱、冷汗淋漓…）命中时会直接标红，提示立即就医。</p>
  </section>

  <section>
    <h2>二、查证 / 查候 / 查词</h2>
    <input id="s" placeholder="例：风寒 ／ 肺卫 ／ M06 ／ 清气失宁候 ／ 苔腻"/>
    <div id="hits"></div>
    <p class="hint">可搜：门码（M01…M12）、类名（风寒证类）、证名、候名、全码（M06-L18-Z12-H042）。</p>
  </section>

  <section>
    <h2>三、十二门 × 六族：危候长在哪一格</h2>
    <div id="grid"></div>
    <p class="hint">列序＝恶化方向（失守→郁→虚→火→陷逆→脱绝）。任何一门「脱绝」列不为 0，
      这个门的算法就必须带「立即就医」分支。</p>
  </section>

  <section>
    <h2>四、验收问句（页面内核必须与接口同结论）</h2>
    <div id="qa"></div>
    <p class="hint">这 12 条由 <code>tests/test_zhenghou_site.js</code> 逐条比对，门错了页面就不许发布。</p>
  </section>
</div>
<footer>
  数据：<code>standards/zhenghou-cidian/</code>（结构 · 语素 · 张量 · 正文 M01–M12）·
  生成器：<code>scripts/build_zhenghou_site.js</code>（幂等，<code>--check</code> 可验）·
  本页不构成医疗建议，临床须由执业中医师四诊合参。
</footer>
<script>window.ZH_DATA=${payload};</script>
<script>${core}</script>
<script>
(function () {
  var D = window.ZH_DATA, C = window.ZhenghouCore;
  var $ = function (id) { return document.getElementById(id); };

  // ── 计数卡 ──────────────────────────────────────────────
  var cards = [['12', '门'], [String(D.counts.lei), '类'], [String(D.counts.zheng), '证'],
    [String(D.counts.hou), '候条目'], [String(D.counts.cells), '张量非零格']];
  $('counts').innerHTML = cards.map(function (c) {
    return '<div class="card"><b>' + c[0] + '</b><span>' + c[1] + '</span></div>';
  }).join('');

  // ── 主诉 → 候选 ─────────────────────────────────────────
  function render(out) {
    // 名形校验（附录一）：合法格标绿、原表空格标灰红、拆不开不显示 —— 只解释，不改结论
    function nameLines(list) {
      if (!list || !list.length) return '';
      return '<p class="hint">名形校验（附录一 · 部位×病机）：' + list.map(function (n) {
        var mark = n.ok === true ? '合法' : (n.ok === false ? '原表无此格' : '不判');
        return '<code>' + n.名 + '</code> ' + mark + ' — ' + n.说明;
      }).join('；') + '</p>';
    }

    if (out.danger) {
      $('out').innerHTML = '<p class="danger">⚠ 检测到危象词：' + out.dangerTerms.join('、')
        + '。请立即就医或拨打急救电话，不要在家观察。</p>';
      return;
    }
    if (!out.candidates.length) {
      $('out').innerHTML = '<p class="hint">没有落到任何证。'
        + (out.unmatched.length ? '未收录：' + out.unmatched.join('、') : '') + '</p>'
        + (out.ask.length ? '<p class="ask">可以再补一句：' + out.ask.map(function (a) { return a.问; }).join(' ') + '</p>' : '')
        + nameLines(out.nameChecks);
      return;
    }
    var rows = out.candidates.map(function (c) {
      return '<div class="row"><b>' + c.证 + '</b><span class="tag ' + c.tier + '">' + c.tier + '</span>'
        + '<span class="tag">' + c.门 + '</span>'
        + '<div class="hint">位 <code>' + (c.位 || '—') + '</code> × 类 <code>' + c.类 + '</code>'
        + ' · 位命中 ' + c.位命中 + ' · 性命中 ' + c.性命中 + ' · ' + c.full + '</div></div>';
    }).join('');
    var ask = out.ask.length ? '<p class="ask">证据还不够，可以再补一句：' + out.ask.map(function (a) { return a.问; }).join(' ') + '</p>' : '';
    $('out').innerHTML = rows + ask + nameLines(out.nameChecks);
  }
  $('go').addEventListener('click', function () { render(C.encode(D, $('q').value)); });
  $('q').addEventListener('keydown', function (e) { if (e.key === 'Enter') render(C.encode(D, $('q').value)); });

  // ── 搜索：门码 / 门名 / 类名 / 证名 / 候名 / 全码 ─────────
  function search(q) {
    q = (q || '').trim().toUpperCase();
    if (!q) return { zheng: [], hou: [] };
    var zs = D.zheng.filter(function (z) {
      return z.full.toUpperCase().indexOf(q) >= 0 || z.zh.indexOf(q) >= 0
        || z.leiZh.indexOf(q) >= 0 || z.men.toUpperCase().indexOf(q) >= 0 || z.wei.indexOf(q) >= 0;
    }).slice(0, 12);
    var hs = D.hou.filter(function (line) {
      var p = line.split('|');
      return p[0].toUpperCase().indexOf(q) >= 0 || p[1].indexOf(q) >= 0;
    }).slice(0, 24);
    return { zheng: zs, hou: hs };
  }
  function renderHits() {
    var r = search($('s').value);
    var out = '';
    if (r.zheng.length) {
      out += '<div class="hint">证（' + r.zheng.length + '）</div>' + r.zheng.map(function (z) {
        return '<div class="row"><b>' + z.zh + '</b><span class="tag">' + z.full + '</span>'
          + '<span class="tag">' + z.men + '</span><div class="hint">位 <code>' + (z.wei || '—')
          + '</code> · 类 <code>' + z.leiZh + '</code> · ' + z.hou + ' 候</div></div>';
      }).join('');
    }
    if (r.hou.length) {
      out += '<div class="hint" style="margin-top:10px">候（' + r.hou.length + '，共 ' + D.counts.hou + ' 条可搜）</div>'
        + r.hou.map(function (line) {
          var p = line.split('|');
          return '<div class="row">' + p[1] + '<span class="tag">' + p[0] + '</span>'
            + '<span class="tag">' + p[3] + '</span></div>';
        }).join('');
    }
    $('hits').innerHTML = out || '<p class="hint">没有命中。试试门码 M06、类名「风寒」、候名「清气失宁候」。</p>';
  }
  $('s').addEventListener('input', renderHits);

  // ── 门 × 六族表 ─────────────────────────────────────────
  var head = '<tr><th>门</th>' + D.fams.map(function (f) { return '<th>' + f + '</th>'; }).join('') + '</tr>';
  var body = D.famGrid.map(function (g) {
    return '<tr><td>' + g.code + ' ' + g.zh + '</td>'
      + D.fams.map(function (f) {
        var v = g.row[f];
        return '<td' + (f === '脱绝' && v > 0 ? ' class="danger"' : '') + '>' + (v || '') + '</td>';
      }).join('') + '</tr>';
  }).join('');
  $('grid').innerHTML = '<table>' + head + body + '</table>';

  // ── 验收问句：页面上直接把结论跑出来 ────────────────────
  $('qa').innerHTML = D.qa.map(function (c) {
    var r = C.encode(D, c.text);
    var got = r.danger ? '危候' : (r.candidates[0] ? r.candidates[0].门.slice(0, 3) : '零候选');
    var want = c.危 ? '危候' : (c.期望门 || '—');
    var ok = got === want;
    return '<div class="row">' + c.id + ' ' + c.text
      + '<span class="tag">期望 ' + want + '</span>'
      + '<span class="tag ' + (ok ? 'strong' : 'weak') + '">实测 ' + got + '</span></div>';
  }).join('');
}());
</script>
</body>
</html>
`;
}

function main() {
  const data = buildData();
  const out = html(data);
  const check = process.argv.includes('--check');
  if (check) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (cur !== out) {
      console.error('✗ site/zhenghou.html 与数据源不一致 —— 跑 node scripts/build_zhenghou_site.js');
      process.exitCode = 1;
      return;
    }
    console.log('✅ site/zhenghou.html 与 standards/zhenghou-cidian 一致');
    return;
  }
  fs.writeFileSync(OUT, out, 'utf8');
  console.log('✓ site/zhenghou.html（' + Math.round(out.length / 1024) + ' KB，'
    + data.counts.hou + ' 条候可搜）');
}

if (require.main === module) main();
module.exports = { buildData, html };
