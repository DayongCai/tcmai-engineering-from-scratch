/**
 * [tcmP] 本地进度追踪 —— 无账号、无网络、数据不出本机。
 *
 * 存储键: tcmai:progress:v1
 *   {
 *     chapters: {
 *       "<dept>/<subject>/<chapter>": {
 *         answers: { "<stage>-q<i>": { picked: number, correct: boolean, t: number } },
 *         visitedAt: number,
 *         completedAt: number | null
 *       }
 *     },
 *     updatedAt: number
 *   }
 *
 * 与 ai-engineering-from-scratch 的 site/progress.js 同构（API 与 schema 均可迁移），
 * 差异：章节键用 departmets 路径而非 phases 路径；新增 quizScore() 供站点统计。
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'tcmai:progress:v1';
  var listeners = [];

  function emptyState() {
    return { chapters: {}, updatedAt: 0 };
  }

  function read() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyState();
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.chapters) return emptyState();
      return parsed;
    } catch (e) {
      return emptyState();
    }
  }

  function write(state) {
    state.updatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* 配额满或隐私模式：静默降级为不保存 */
    }
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](state); } catch (_) { /* 监听器异常不影响主流程 */ }
    }
  }

  function ensure(state, key) {
    if (!state.chapters[key]) {
      state.chapters[key] = { answers: {}, visitedAt: 0, completedAt: null };
    }
    return state.chapters[key];
  }

  function recordVisit(key) {
    if (!key) return;
    var s = read();
    ensure(s, key).visitedAt = Date.now();
    write(s);
  }

  function recordAnswer(key, qid, picked, correct) {
    if (!key || !qid) return;
    var s = read();
    ensure(s, key).answers[qid] = { picked: picked, correct: !!correct, t: Date.now() };
    write(s);
  }

  function markComplete(key) {
    if (!key) return;
    var s = read();
    var c = ensure(s, key);
    if (!c.completedAt) {
      c.completedAt = Date.now();
      write(s);
    }
  }

  function unmarkComplete(key) {
    var s = read();
    if (s.chapters[key] && s.chapters[key].completedAt) {
      s.chapters[key].completedAt = null;
      write(s);
    }
  }

  function get(key) {
    var s = read();
    return s.chapters[key] || { answers: {}, visitedAt: 0, completedAt: null };
  }

  function isComplete(key) {
    return !!get(key).completedAt;
  }

  function quizScore(key) {
    var c = get(key);
    var keys = Object.keys(c.answers);
    var correct = 0;
    for (var i = 0; i < keys.length; i++) if (c.answers[keys[i]].correct) correct += 1;
    return { answered: keys.length, correct: correct };
  }

  function countCompleted(keys) {
    var s = read();
    var n = 0;
    for (var i = 0; i < keys.length; i++) {
      var c = s.chapters[keys[i]];
      if (c && c.completedAt) n += 1;
    }
    return n;
  }

  function totalCompleted() {
    var s = read();
    var n = 0;
    for (var k in s.chapters) if (s.chapters[k].completedAt) n += 1;
    return n;
  }

  function totalVisited() {
    return Object.keys(read().chapters).length;
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* 忽略 */ }
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](emptyState()); } catch (_) { /* 忽略 */ }
    }
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  // 跨标签页同步
  window.addEventListener('storage', function (e) {
    if (e.key !== STORAGE_KEY) return;
    var s = read();
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](s); } catch (_) { /* 忽略 */ }
    }
  });

  window.TCMProgress = {
    recordVisit: recordVisit,
    recordAnswer: recordAnswer,
    markComplete: markComplete,
    unmarkComplete: unmarkComplete,
    get: get,
    isComplete: isComplete,
    quizScore: quizScore,
    countCompleted: countCompleted,
    totalCompleted: totalCompleted,
    totalVisited: totalVisited,
    reset: reset,
    onChange: onChange,
  };
})();
