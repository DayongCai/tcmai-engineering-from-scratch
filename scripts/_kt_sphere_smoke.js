// 离线冒烟测试：用 jsdom + 假 canvas 跑一遍页面脚本，确认六个阶段都能渲染且面板有真实数字。
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const FILE = path.join(process.env.USERPROFILE, 'Desktop', '中医药领域知识树-语义张量球面.html');
const html = fs.readFileSync(FILE, 'utf8');

const calls = { arc: 0, fill: 0, stroke: 0 };
function fakeCtx() {
  const grad = { addColorStop() {} };
  return {
    setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, closePath() {},
    arc() { calls.arc++; }, fill() { calls.fill++; }, stroke() { calls.stroke++; },
    moveTo() {}, lineTo() {}, save() {}, restore() {}, translate() {}, rotate() {},
    fillText() { calls.text = (calls.text||0)+1; }, strokeText() { calls.text = (calls.text||0)+1; }, measureText() { return { width: 24 }; },
    createRadialGradient() { return grad; }, createLinearGradient() { return grad; },
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, globalCompositeOperation: 'source-over',
  };
}

const errors = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: false,
  beforeParse(window) {
    window.HTMLCanvasElement.prototype.getContext = () => fakeCtx();
    window.requestAnimationFrame = (cb) => { window.__raf = cb; return 0; };  // 手动推进帧
    window.addEventListener('error', (e) => errors.push(e.message));
  },
});

const w = dom.window;
const d = w.document;

const t = (name, ok, extra = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${extra ? ' — ' + extra : ''}`);
  if (!ok) process.exitCode = 1;
};

t('脚本无运行时错误', errors.length === 0, errors.join(' | '));
const btns = d.querySelectorAll('#slist .sbtn');
t('六个阶段按钮', btns.length === 6, `实得 ${btns.length}`);

const stats = d.getElementById('stats').textContent.replace(/\s+/g, ' ');
t('面板有真实规模数字', /2,?025/.test(stats) || /2025/.test(stats), stats.slice(0, 90));
t('画点已执行', calls.arc > 100 && calls.fill > 100, `arc ${calls.arc} / fill ${calls.fill}`);

// 逐阶段切换：改内部 stage 变量不可达，改为点击按钮后看按钮态与图例
let okAll = true;
const perStage = [];
for (const b of btns) {
  const before = calls.arc;
  try {
    b.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    const on = d.querySelectorAll('#slist .sbtn.on');
    if (on.length !== 1) throw new Error('选中态异常');
    if (w.__raf) w.__raf();                       // 触发一次真实 draw
    perStage.push(calls.arc - before);
  } catch (e) { okAll = false; console.log('  ', e.message); }
}
t('每阶段都真的画了', perStage.every((n) => n >= 180), `各阶段 arc 增量 ${perStage.join(' / ')}`);
t('六阶段可点击切换', okAll);
const legend = d.getElementById('lbody').textContent.trim();
t('图例随阶段更新', legend.length > 0, legend.slice(0, 60));

const tipHtml = w.eval('typeof D === "object" ? JSON.stringify(D.totals) : "missing"');
t('数据已注入页面', tipHtml.includes('subjects'), tipHtml.slice(0, 120));
