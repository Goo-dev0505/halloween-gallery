/* ==========================================================================
   しかけ探し（12個＋幻の2個）
   - 各演出（fx.js / app.js / award.js）が 'halloween:secret' イベントで「見つけた」を知らせる。
   - 見つけたら画面下に「しかけ発見！」を出し、閲覧者のブラウザ（localStorage）に記録する。
   - 入口とフッターの「しかけ探し」から、謎かけの一覧（ダイアログ）を開ける。答えは見つけるまで伏せる。
   - 「動きを減らす」設定の人には出ない演出（扉・おばけ便・参加ページの演出）は、最初から見つけた扱いにする。
   ========================================================================== */
(() => {
  'use strict';
  const KEY = 'ha2026-secrets';
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 並び順＝一覧の順。bonus は「幻」：12個の数には入れない
  const SECRETS = [
    { id: 'door', room: '入口', name: '扉の入場演出', riddle: 'はじめて来た人だけが、見られるものがある。', hint: '2回目からは、もう開かへんらしい。', motion: true },
    { id: 'moon', room: '入口', name: '満ちていく月', riddle: '空にいる、あの人に話しかけてみて。', hint: '毎日ちょっとずつ太っていく。押してみたら教えてくれるかも。' },
    { id: 'courier', room: '入口', name: 'おばけの配達便', riddle: 'ふわふわ飛んでくる配達屋さん。だれかを運んでる。', hint: 'つかまえて（押して）みたら……？', motion: true },
    { id: 'lanterns', room: '入口', name: 'ランタン飾り', riddle: '5つの灯り。ぜんぶ灯したら、なにかが起きる。', hint: 'ふれるだけでええ。' },
    { id: 'award', room: '入口', name: '特別賞の額縁', riddle: '金の額縁に、なにかが飾ってある。', hint: '入口の「特別賞」。額縁を押して、近くで見てみて。' },
    { id: 'turbo', room: 'クリエイター', name: '爆速メリーゴーランド', riddle: 'いちばん速いボタンを押すと、舞台のほうが耐えられない。', hint: 'メリーゴーランドの下に、速さのボタンがある。' },
    { id: 'brake', room: 'クリエイター', name: '運命のブレーキ', riddle: 'ブレーキを踏むと、だれかの前で止まる。', hint: 'だれに止まるかは運次第。' },
    { id: 'again', room: 'クリエイター', name: '再会のセリフ', riddle: '同じ人にもう一度止まると、メリーゴーランドの態度が変わる。', hint: '何回も踏んでたら、いつか当たる。' },
    { id: 'tsukkomi', room: 'クリエイター', name: '運営のツッコミ', riddle: '何回もブレーキを踏む人には、運営からひと言ある。', hint: 'キリのいい回数で。最初は10回目。' },
    { id: 'catch', room: 'クリエイター', name: '紹介文の続き', riddle: '自己紹介の「…」の続き、気にならへん？', hint: 'カードの紹介文を押してみて。' },
    { id: 'torch', room: '美術館', name: '隠れおばけ探し', riddle: '電気を消して探検。暗闇のどこかに、だれかが隠れてる。', hint: '懐中電灯の光を近づけて。全員見つけたら発見。' },
    { id: 'joinfx', room: '参加する', name: '参加ページの演出', riddle: '「参加する」のページ、しばらくじっと眺めてると……。', hint: '何もさわらずに、待ってみて。', motion: true },
    { id: 'streak', room: '幻', name: '幻の連続', riddle: '同じ人に、2回続けて止まったら……。', hint: '81人おるから、だいたい81回に1回。', bonus: true },
    // 超速で回しっぱなしにするとメリーゴーランドが壊れる（app.js の crashCarousel）。動きを減らす設定では起きないので見つけた扱い
    { id: 'crash', room: '幻', name: '超速の故障', riddle: '速さには、上には上がある。止めへんかったら……どうなる？', hint: 'いちばん上の速さで、ブレーキを踏まずにじっと待つ。', bonus: true, motion: true }
  ];
  const MAIN = SECRETS.filter(s => !s.bonus);
  const byId = Object.fromEntries(SECRETS.map(s => [s.id, s]));
  const $ = id => document.getElementById(id);

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(found)); } catch { /* 保存できなくても遊べる */ } }
  function readJson(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } }
  let found = load();
  const mainCount = () => MAIN.filter(s => found[s.id]).length;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  /* ---------- 発見の通知（画面下のトースト） ---------- */
  let toastTimer = 0;
  function toast(s) {
    const box = $('secretToast'); if (!box) return;
    const c = mainCount();
    box.className = `secret-toast${s.bonus ? ' is-bonus' : ''}${c === MAIN.length && !s.bonus ? ' is-complete' : ''}`;
    const head = s.bonus ? '✨ 幻のしかけ発見！' : (c === MAIN.length ? '🎉 ぜんぶ発見！ ハロウィン探検家や！' : '🎃 しかけ発見！');
    box.replaceChildren(el('span', 'secret-toast-head', head), el('span', 'secret-toast-name', `「${s.name}」`), el('span', 'secret-toast-count', `${c}/${MAIN.length}`));
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { box.hidden = true; }, 3600);
  }

  /* ---------- 記録 ---------- */
  function mark(id, { silent = false } = {}) {
    const s = byId[id];
    if (!s || found[id]) return;
    found[id] = new Date().toISOString();
    save();
    paintCounts();
    if (dialogOpen()) renderList();
    if (!silent) toast(s);
  }
  document.addEventListener('halloween:secret', e => mark(e.detail && e.detail.id));

  // この機能ができる前に体験していた分を、静かにさかのぼって記録する
  function backfill() {
    // 扉は「開き始め」に記録が付くので、いま扉が開いている最中（はじめての人）はさかのぼらない。
    // その人には、扉が開き終わったときに通知つきで印がつく
    try { if (localStorage.getItem('ha2026-door-seen') && !document.querySelector('.door-intro')) mark('door', { silent: true }); } catch { /* 読めなくてもよい */ }
    const log = readJson('ha2026-spin-log');
    if (log) {
      if (log.total >= 1) mark('brake', { silent: true });
      if (log.total >= 10) mark('tsukkomi', { silent: true });
      if (Object.values(log.counts || {}).some(n => n >= 2)) mark('again', { silent: true });
      if (log.streak >= 2) mark('streak', { silent: true });
    }
    try { if (Number(localStorage.getItem('ha2026-crash-count')) >= 1) mark('crash', { silent: true }); } catch { /* 読めなくてもよい */ }
    // 動きを減らす設定では出ない演出は、見つけた扱いにする（損をしないように）
    if (reduced) SECRETS.filter(s => s.motion).forEach(s => mark(s.id, { silent: true }));
  }

  /* ---------- 件数の表示（入口・フッター） ---------- */
  function paintCounts() {
    const text = `${mainCount()}/${MAIN.length}`;
    document.querySelectorAll('[data-secrets-count]').forEach(n => { n.textContent = text; });
  }

  /* ---------- 謎かけの一覧（ダイアログ） ---------- */
  const dialogOpen = () => Boolean($('secretsDialog')?.open);
  function renderList() {
    const list = $('secretsList'); if (!list) return;
    const rooms = [...new Set(SECRETS.map(s => s.room))];
    list.replaceChildren(...rooms.map(room => {
      const items = SECRETS.filter(s => s.room === room);
      const sec = el('section', `secrets-room${room === '幻' ? ' is-bonus' : ''}`);
      const h = el('h3', '', room === '幻' ? '幻のしかけ（数には入らへん）' : room);
      h.append(el('small', '', `${items.filter(s => found[s.id]).length}/${items.length}`));
      sec.append(h);
      items.forEach(s => {
        const on = Boolean(found[s.id]);
        const card = el('div', `secret-card${on ? ' is-found' : ''}`);
        card.append(el('span', 'secret-stamp', on ? '済' : '？'));
        const body = el('div', 'secret-body');
        if (on) {
          body.append(el('p', 'secret-name', s.name), el('p', 'secret-riddle is-dim', s.riddle));
          if (reduced && s.motion) body.append(el('p', 'secret-note', '動きを減らす設定のため、見つけた扱いにしています'));
        } else {
          body.append(el('p', 'secret-riddle', s.riddle));
          const btn = el('button', 'secret-hint-btn', 'ヒント'); btn.type = 'button';
          const hint = el('p', 'secret-hint', s.hint); hint.hidden = true;
          btn.setAttribute('aria-expanded', 'false');
          btn.addEventListener('click', () => { hint.hidden = !hint.hidden; btn.setAttribute('aria-expanded', String(!hint.hidden)); });
          body.append(btn, hint);
        }
        card.append(body);
        sec.append(card);
      });
      return sec;
    }));
    const c = mainCount();
    $('secretsProgress').textContent = `${c} / ${MAIN.length}`;
    $('secretsFill').style.width = `${(c / MAIN.length) * 100}%`;
    $('secretsDone').hidden = c < MAIN.length;
  }
  function openDialog() {
    const d = $('secretsDialog'); if (!d) return;
    renderList();
    if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
  }
  function closeDialog() {
    const d = $('secretsDialog'); if (!d) return;
    if (typeof d.close === 'function') d.close(); else d.removeAttribute('open');
  }

  function init() {
    backfill();
    paintCounts();
    document.addEventListener('click', e => {
      if (e.target.closest('[data-secrets-open]')) { e.preventDefault(); openDialog(); }
      if (e.target.closest('[data-secrets-close]')) closeDialog();
    });
    // ダイアログの外側（背景）を押したら閉じる
    $('secretsDialog')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeDialog(); });
    $('secretsReset')?.addEventListener('click', () => {
      found = {}; save();
      backfill(); // 動きを減らす設定の分などは付け直す
      paintCounts(); renderList();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
