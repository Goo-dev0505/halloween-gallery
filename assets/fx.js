/* ==========================================================================
   ハロウィンの仕掛け（fx.js）
   app.js の表示には手を入れず、飾りと遊びだけを足す。
   参加者データは app.js が出す 'halloween:data' イベントで受け取る。

   1. 扉の入場演出 ……… 初回だけ。押すかキーで飛ばせる
   2. 満ちていく月 ……… 開幕（eventStartAt）までの残り日数で月が満ちる
   3. コウモリの群れ …… ページを開いたとき1回だけ、月から飛び立つ
   4. おばけの配達便 …… 参加者のアイコンを運ぶ。押すとその人のカードへ
   5. ランタン飾り ……… ふれると灯る。全部灯すと Trick or Create が出る
   6. Trick or Create …… ランダムに1作品へワープ
   7. 懐中電灯モード …… 美術館を消灯し、隠れおばけを探す
   8. 霧と墓地の奥行き … フッターの上。スクロールでゆっくりずれる
   9. 参加ページの演出 … 「参加する」を開くたびに6種類から1つ（暗転→中身が順に現れる）

   「動きを減らす」設定の人には、1・3・4・9 を出さず、霧と月は止めて表示する。
   ランタン・Trick or Create・懐中電灯は操作で動くので、そのまま使える。
   ========================================================================== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const config = window.HALLOWEEN_CONFIG || {};
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DAY = 86400000;
  const MOON_DAYS = 21;          // 開幕の何日前から月が満ち始めるか（告知 9/29 → 開幕 10/20）
  const GHOST_INTERVAL = 7000;   // おばけが出てくる間隔（ミリ秒）
  const GHOST_MAX = 2;           // 同時に飛ぶおばけの数
  const DOOR_KEY = 'ha2026-door-seen';
  const data = { rows: [], ready: false };

  /* ---------- 共通 ---------- */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function svg(markup) { const wrap = document.createElement('span'); wrap.innerHTML = markup; return wrap.firstElementChild; } // 固定の図形だけに使う（外部データは入れない）
  function currentView() { return document.body.dataset.view || 'top'; }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function shuffle(list) { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  // HTTPS の外部画像か、このサイトの assets/ 以下の画像だけを使う（app.js の imageUrl と同じ決まり）
  function safeImage(url) {
    const v = String(url || '').trim();
    if (/^assets\/[A-Za-z0-9_\-/.]+\.(?:png|jpe?g|webp|gif|svg)$/i.test(v) && !v.includes('..')) return v;
    try { const u = new URL(v); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; }
  }
  function storageGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function storageSet(key, value) { try { localStorage.setItem(key, value); } catch { /* 保存できなくても演出は動く */ } }
  // しかけ探し（secrets.js）に「見つけた」を知らせる
  function secret(id) { document.dispatchEvent(new CustomEvent('halloween:secret', { detail: { id } })); }
  function go(hash) { if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = hash; }

  const PUMPKIN = '<svg viewBox="0 0 64 60" aria-hidden="true" focusable="false"><path class="pk-stem" d="M31 12c0-6 3-9 8-10" fill="none" stroke-width="4" stroke-linecap="round"/><ellipse class="pk-body" cx="20" cy="36" rx="17" ry="21"/><ellipse class="pk-body" cx="44" cy="36" rx="17" ry="21"/><ellipse class="pk-mid" cx="32" cy="36" rx="15" ry="23"/><path class="pk-face" d="M18 30l6-8 6 8zM34 30l6-8 6 8zM16 40q16 14 32 0l-5 2-3 5-4-4-4 4-4-4-4 4-3-5z"/></svg>';
  const GHOST = '<svg viewBox="0 0 60 70" aria-hidden="true" focusable="false"><path class="gh-body" d="M30 3C15 3 6 15 6 30v34l8-6 8 6 8-6 8 6 8-6 8 6V30C54 15 45 3 30 3z"/><ellipse class="gh-eye" cx="22" cy="28" rx="3.5" ry="5"/><ellipse class="gh-eye" cx="38" cy="28" rx="3.5" ry="5"/><ellipse class="gh-mouth" cx="30" cy="40" rx="4" ry="3"/></svg>';
  const BAT = '<svg viewBox="0 0 48 22" aria-hidden="true" focusable="false"><path d="M24 7c1.4 0 2.4 1 3 2.4 3-4.6 9-7.4 21-6.4-5 2-7 5-7.4 9-3-2.2-6.6-1.8-8.2 1.4-1.6-1.8-3.6-2.2-5.4-.8L24 18l-3-5.4c-1.8-1.4-3.8-1-5.4.8C14 10.2 10.4 9.8 7.4 12 7 8 5 5 0 3c12-1 18 1.8 21 6.4.6-1.4 1.6-2.4 3-2.4z"/></svg>';

  /* ---------- 2. 満ちていく月 ---------- */
  // 三日月のくり抜き位置（--moon-cut）をずらして満たす。68%＝いまの三日月、170%＝満月
  function initMoon() {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const start = Date.parse(config.eventStartAt || '');
    const left = Number.isFinite(start) ? (start - Date.now()) / DAY : MOON_DAYS;
    const phase = Math.min(1, Math.max(0.12, 1 - left / MOON_DAYS)); // 0.12＝細い三日月から始める
    hero.style.setProperty('--moon-cut', `${Math.round(68 + phase * 102)}%`);
    hero.style.setProperty('--moon-glow', `${Math.round(14 + phase * 26)}%`);
    if (phase >= 1) hero.classList.add('is-full-moon');
    // 月を押すと、満月（開幕）までの日数をしゃべる。しかけ探しの「満ちていく月」
    // 月は .hero::before の飾りで押せないので、同じ位置に透明なボタン（.moon-hit）を重ねる
    if (!hero.querySelector('.moon-hit')) {
      const moon = el('button', 'moon-hit'); moon.type = 'button'; moon.setAttribute('aria-label', '月に話しかける');
      moon.addEventListener('click', () => {
        const days = Number.isFinite(start) ? Math.ceil((start - Date.now()) / DAY) : NaN;
        const text = !Number.isFinite(days) ? 'まだ満ちる日が決まってへんねん。' : days > 0 ? `満月まで、あと${days}日やで。` : '今夜は満月や。展示、はじまってるで。';
        hero.querySelector('.moon-talk')?.remove();
        const bubble = el('span', 'moon-talk', text); bubble.setAttribute('role', 'status');
        hero.append(bubble);
        setTimeout(() => bubble.remove(), 3200);
        secret('moon');
      });
      hero.append(moon);
    }
    const nights = Math.max(0, Math.ceil(left));
    const label = el('span', 'sr-only', nights > 0 ? `開幕の満月まで、あと${nights}夜。` : '今夜は満月。展示が開いています。');
    hero.querySelector('.hero-copy')?.append(label);
  }

  /* ---------- 1. 扉の入場演出（初回だけ） ---------- */
  function initDoor() {
    return new Promise(resolve => {
      if (reduced || storageGet(DOOR_KEY) || currentView() !== 'top') { resolve(); return; }
      storageSet(DOOR_KEY, '1');
      const overlay = el('div', 'door-intro');
      overlay.setAttribute('role', 'presentation');
      const frame = el('div', 'door-intro-frame');
      frame.append(el('div', 'door-leaf left'), el('div', 'door-leaf right'));
      const text = el('p', 'door-intro-text');
      text.append(el('span', 'door-intro-small', '夜の美術館へ、ようこそ'), el('span', 'door-intro-title', config.siteName || 'ハロウィンアート2026'));
      overlay.append(frame, text, el('p', 'door-intro-skip', 'タップでスキップ'));
      document.body.append(overlay);
      let done = false;
      const finish = () => {
        if (done) return; done = true;
        secret('door');
        overlay.classList.add('is-leaving');
        setTimeout(() => { overlay.remove(); resolve(); }, 500);
        removeEventListener('keydown', finish);
      };
      requestAnimationFrame(() => overlay.classList.add('is-open'));
      overlay.addEventListener('click', finish);
      addEventListener('keydown', finish);
      setTimeout(finish, 2200);
    });
  }

  /* ---------- 3. コウモリの群れ（1回だけ） ---------- */
  function releaseBats() {
    if (reduced || currentView() !== 'top') return;
    const layer = el('div', 'bat-flock'); layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 6; i++) {
      const bat = el('span', 'bat');
      bat.append(svg(BAT));
      bat.style.setProperty('--dx', `${-40 - Math.random() * 45}vw`);
      bat.style.setProperty('--dy', `${-10 - Math.random() * 18}vh`);
      bat.style.setProperty('--size', `${22 + Math.random() * 18}px`);
      bat.style.animationDelay = `${i * 0.12 + Math.random() * 0.2}s`;
      layer.append(bat);
    }
    document.querySelector('.hero')?.append(layer);
    setTimeout(() => layer.remove(), 4200);
  }

  /* ---------- 4. おばけの配達便 ---------- */
  const post = { timer: 0, queue: [], lane: null };
  function nextCourier() {
    if (!post.lane || document.hidden || currentView() !== 'top') return;
    if (post.lane.childElementCount >= GHOST_MAX) return;
    if (!post.queue.length) post.queue = shuffle(data.rows);
    const r = post.queue.shift(); if (!r) return;
    const ghost = el('button', 'courier');
    ghost.type = 'button';
    ghost.tabIndex = -1;                      // 動く的なので、キーボードではメリーゴーランドから辿ってもらう
    ghost.setAttribute('aria-hidden', 'true');
    ghost.style.setProperty('--y', `${8 + Math.random() * 42}%`);
    ghost.style.setProperty('--dur', `${15 + Math.random() * 6}s`);
    const body = el('span', 'courier-body');
    body.append(svg(GHOST));
    const parcel = el('span', 'courier-parcel');
    const icon = safeImage(r.icon_url);
    if (icon) { const img = el('img'); img.src = icon; img.alt = ''; img.loading = 'lazy'; img.addEventListener('error', () => img.replaceWith(el('span', '', '🎃')), { once: true }); parcel.append(img); }
    else parcel.append(el('span', '', '🎃'));
    body.append(parcel);
    ghost.append(body, el('span', 'courier-name', `${r.name} を届けにきたよ`));
    ghost.addEventListener('click', () => { secret('courier'); go(`#creators?id=${encodeURIComponent(r.id)}`); });
    ghost.addEventListener('animationend', e => { if (e.target === ghost) ghost.remove(); });
    post.lane.append(ghost);
  }
  function initCouriers() {
    if (reduced || !data.rows.length) return;
    const hero = document.querySelector('.hero'); if (!hero) return;
    post.lane = el('div', 'courier-lane');
    hero.append(post.lane);
    setTimeout(nextCourier, 1200);
    post.timer = setInterval(nextCourier, GHOST_INTERVAL);
  }

  /* ---------- 6. Trick or Create ---------- */
  function trick(button) {
    const works = data.rows.filter(r => r.entry_type === 'work');
    const pool = works.length ? works : data.rows;
    if (!pool.length) return;
    const r = pick(pool);
    const target = works.length ? `#gallery?id=${encodeURIComponent(r.id)}` : `#creators?id=${encodeURIComponent(r.id)}`;
    if (reduced || !button) { go(target); return; }
    button.classList.add('is-spinning');
    setTimeout(() => { button.classList.remove('is-spinning'); go(target); }, 650);
  }
  function initTrick() {
    document.addEventListener('click', e => {
      const button = e.target.closest('[data-trick]');
      if (button) trick(button);
    });
  }

  /* ---------- 5. ランタン飾り ---------- */
  function initLanterns() {
    const garland = $('lanternGarland'); if (!garland) return;
    const buttons = [...garland.querySelectorAll('.lantern')];
    const count = $('lanternCount'), reward = $('lanternReward');
    buttons.forEach((button, i) => {
      button.append(svg(PUMPKIN));
      button.style.setProperty('--i', i);
      const light = () => {
        if (button.getAttribute('aria-pressed') === 'true') return;
        button.setAttribute('aria-pressed', 'true');
        const lit = buttons.filter(b => b.getAttribute('aria-pressed') === 'true').length;
        if (count) count.textContent = String(lit);
        if (lit === buttons.length) celebrate();
      };
      button.addEventListener('click', light);
      button.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') light(); });
    });
    function celebrate() {
      secret('lanterns');
      garland.classList.add('is-complete');
      if (reward) reward.hidden = false;
      if (reduced) return;
      const burst = el('div', 'candy-burst'); burst.setAttribute('aria-hidden', 'true');
      ['🍬', '🍭', '🍫', '🦇', '✨', '🍬', '🍭', '✨'].forEach((c, i) => {
        const s = el('span', '', c);
        s.style.setProperty('--a', `${i * 45 + Math.random() * 20}deg`);
        s.style.setProperty('--r', `${70 + Math.random() * 60}px`);
        burst.append(s);
      });
      garland.append(burst);
      setTimeout(() => burst.remove(), 1400);
    }
  }

  /* ---------- 7. 懐中電灯モード（美術館） ---------- */
  const torch = { on: false, found: 0, ghosts: [], dark: null, pill: null, x: innerWidth / 2, y: innerHeight / 2 };
  function placeHiddenGhosts() {
    const hall = document.querySelector('.hall'); if (!hall) return;
    torch.ghosts.forEach(g => g.remove());
    torch.ghosts = [0, 1, 2].map(i => {
      const g = el('span', 'hidden-ghost'); g.append(svg(GHOST)); g.setAttribute('aria-hidden', 'true');
      g.style.left = `${8 + i * 30 + Math.random() * 18}%`;  // 横に3つばらけさせる
      g.style.top = `${18 + Math.random() * 64}%`;
      hall.append(g);
      return g;
    });
    torch.found = 0;
  }
  function moveTorch(x, y) {
    torch.x = x; torch.y = y;
    if (!torch.dark) return;
    torch.dark.style.setProperty('--x', `${x}px`); torch.dark.style.setProperty('--y', `${y}px`);
    torch.ghosts.forEach(g => {
      if (g.classList.contains('is-found')) return;
      const r = g.getBoundingClientRect();
      if (Math.hypot(r.left + r.width / 2 - x, r.top + r.height / 2 - y) < 80) {
        g.classList.add('is-found'); torch.found++; updatePill();
      }
    });
  }
  function updatePill() {
    const n = torch.pill?.querySelector('[data-found]');
    if (!n) return;
    n.textContent = torch.found >= torch.ghosts.length ? '全員みつけた！👻' : `隠れおばけ ${torch.found}/${torch.ghosts.length}`;
    if (torch.ghosts.length && torch.found >= torch.ghosts.length) secret('torch');
  }
  function setTorch(on) {
    torch.on = on;
    const toggle = $('flashlightToggle');
    toggle?.setAttribute('aria-pressed', String(on));
    if (toggle) toggle.textContent = on ? '💡 明かりをつける' : '🔦 消灯して探検';
    document.body.classList.toggle('is-torch', on);
    if (on) {
      placeHiddenGhosts();
      torch.dark = el('div', 'torch-dark'); torch.dark.setAttribute('aria-hidden', 'true');
      torch.pill = el('div', 'torch-pill');
      torch.pill.append(el('span', '', '🔦 懐中電灯モード'), el('span', 'torch-found', ''), el('button', 'btn secondary', '明かりをつける'));
      torch.pill.children[1].dataset.found = '';
      torch.pill.querySelector('button').type = 'button';
      torch.pill.querySelector('button').addEventListener('click', () => setTorch(false));
      document.body.append(torch.dark, torch.pill);
      updatePill();
      moveTorch(innerWidth / 2, innerHeight / 2);
    } else {
      torch.dark?.remove(); torch.pill?.remove(); torch.dark = torch.pill = null;
      torch.ghosts.forEach(g => g.remove()); torch.ghosts = [];
    }
  }
  function initTorch() {
    $('flashlightToggle')?.addEventListener('click', () => setTorch(!torch.on));
    addEventListener('pointermove', e => { if (torch.on) moveTorch(e.clientX, e.clientY); }, { passive: true });
    addEventListener('pointerdown', e => { if (torch.on) moveTorch(e.clientX, e.clientY); }, { passive: true });
    addEventListener('scroll', () => { if (torch.on) moveTorch(torch.x, torch.y); }, { passive: true });
    addEventListener('keydown', e => { if (e.key === 'Escape' && torch.on) setTorch(false); });
    addEventListener('hashchange', () => { if (torch.on && !location.hash.startsWith('#gallery')) setTorch(false); });
  }

  /* ---------- 9. 「参加する」を開くたびに違う演出 ----------
     開いて JOIN_FX_AFTER ミリ秒たつと、6種類のうち1つが始まる。6種類を一巡するまで同じものは出ない。
     どの演出も「画面が隠れる → 裏で中身を隠す → 明かりが戻る → 中身が上から順にふわっと出る」の流れ。
     押すかキーを押すとすぐ明かりが戻る。 */
  const JOIN_FX_AFTER = 6000;
  const JOIN_FX_BAG = 'ha2026-join-fx-bag', JOIN_FX_LAST = 'ha2026-join-fx-last';
  const joinFx = { timer: 0, running: null };
  function joinParts() {
    const view = document.querySelector('[data-view="join"]');
    return view ? [...view.querySelectorAll('h2, .section-intro, .tool-panel, .tool-card, .steps > li, .join-rules, .exhibit, .links > *')] : [];
  }
  function sessionGet(key) { try { return sessionStorage.getItem(key); } catch { return null; } }
  function sessionSet(key, value) { try { sessionStorage.setItem(key, value); } catch { /* 保存できなくても動く */ } }
  // 次の演出を選ぶ：袋（まだ出ていない演出）から1つ取り出す。空なら詰め直す（直前と同じものは先頭にしない）
  function nextJoinFx() {
    const names = Object.keys(JOIN_FX);
    let bag = []; try { bag = JSON.parse(sessionGet(JOIN_FX_BAG) || '[]').filter(n => names.includes(n)); } catch { bag = []; }
    if (!bag.length) {
      bag = shuffle(names);
      const last = sessionGet(JOIN_FX_LAST);
      if (bag.length > 1 && bag[0] === last) bag.push(bag.shift());
    }
    const name = bag.shift();
    sessionSet(JOIN_FX_BAG, JSON.stringify(bag)); sessionSet(JOIN_FX_LAST, name);
    return name;
  }
  function startJoinFx() {
    if (joinFx.running || currentView() !== 'join' || document.hidden || torch.on) return;
    const name = nextJoinFx();
    const parts = joinParts();
    const overlay = el('div', `jfx jfx-${name}`); overlay.setAttribute('aria-hidden', 'true');
    document.body.append(overlay);
    secret('joinfx');
    const ctx = {
      overlay, timers: [], frames: [], done: false,
      at(ms, fn) { this.timers.push(setTimeout(fn, ms)); },
      raf(fn) { const id = requestAnimationFrame(fn); this.frames.push(id); return id; },
      cover() { parts.forEach(n => n.classList.add('fx-hidden')); },          // 画面が隠れた瞬間に中身を隠す
      exit: null,                                                            // 演出ごとの「明かりの戻し方」（戻り値＝かかるミリ秒）
      reveal() {
        if (ctx.done) return; ctx.done = true;
        ctx.timers.forEach(clearTimeout); ctx.frames.forEach(cancelAnimationFrame);
        ctx.cover();
        const ms = ctx.exit ? ctx.exit() : (overlay.classList.add('is-fading'), 1100);
        parts.forEach((node, i) => setTimeout(() => node.classList.add('fx-shown'), 250 + i * 130));
        // 注釈を「もう一回開くと…」に差し替える
        const hint = $('joinHintText'), icon = document.querySelector('.join-hint-icon');
        if (hint) hint.textContent = 'ほかのページに行って戻ってくると、また別の何かが……？';
        if (icon) icon.textContent = '👀';
        setTimeout(() => { overlay.remove(); parts.forEach(n => n.classList.remove('fx-hidden', 'fx-shown')); joinFx.running = null; },
          Math.max(ms, 250 + parts.length * 130) + 1000);
        removeEventListener('keydown', ctx.reveal);
      }
    };
    ctx.reveal = ctx.reveal.bind(ctx);
    joinFx.running = ctx;
    overlay.addEventListener('click', ctx.reveal);
    addEventListener('keydown', ctx.reveal);
    JOIN_FX[name](ctx);
  }
  function line(text, extra = '') { return el('p', `jfx-line ${extra}`.trim(), text); }
  const JOIN_FX = {
    // 1. 目が光る：チカチカ→真っ暗→目とセリフ
    eyes(c) {
      const eyes = el('div', 'jfx-eyepair'); eyes.append(el('span'), el('span'));
      const l1 = line('……見てたやろ？'), l2 = line('ほな、いっしょに遊ぼか。', 'is-accent');
      c.overlay.append(eyes, l1, l2);
      c.raf(() => c.overlay.classList.add('is-flicker'));
      c.at(1100, () => c.cover());
      c.at(1400, () => eyes.classList.add('is-on'));
      c.at(1900, () => l1.classList.add('is-on'));
      c.at(2900, () => l2.classList.add('is-on'));
      c.at(4300, c.reveal);
    },
    // 2. 停電とろうそく：暗くなってろうそくが灯り、光の輪が広がって明るくなる
    candle(c) {
      const candle = el('div', 'jfx-candlestick'); candle.append(el('span', 'flame'), el('span', 'wax'));
      const l1 = line('……停電や。'), l2 = line('ろうそく、つけるで。', 'is-accent');
      c.overlay.append(candle, l1, l2);
      c.raf(() => c.overlay.classList.add('is-on'));
      c.at(700, () => c.cover());
      c.at(900, () => l1.classList.add('is-on'));
      c.at(1700, () => { candle.classList.add('is-lit'); l2.classList.add('is-on'); });
      c.at(3400, c.reveal);
      c.exit = () => {
        c.overlay.classList.add('is-spreading');
        const max = Math.hypot(innerWidth, innerHeight), start = performance.now();
        const grow = now => {
          const t = Math.min(1, (now - start) / 1400);
          c.overlay.style.setProperty('--r', `${Math.round(max * t * t)}px`);
          if (t < 1) requestAnimationFrame(grow);
        };
        requestAnimationFrame(grow);
        return 1400;
      };
    },
    // 3. おばけの幕：巨大おばけが黒い幕を引いて通り、「ばあ！」、幕を右へ持ち去る
    ghost(c) {
      const sheet = el('div', 'jfx-sheet');
      const ghost = el('span', 'jfx-bigghost'); ghost.append(svg(GHOST));
      sheet.append(ghost);
      const boo = line('ばあ！', 'is-big');
      c.overlay.append(sheet, boo);
      c.raf(() => c.raf(() => sheet.classList.add('is-in')));
      c.at(1000, () => c.cover());
      c.at(1150, () => boo.classList.add('is-on'));
      c.at(2700, c.reveal);
      c.exit = () => { boo.classList.remove('is-on'); sheet.classList.add('is-out'); return 1100; };
    },
    // 4. コウモリの大群：画面いっぱいにコウモリが横切って暗くなる
    bats(c) {
      const swarm = el('div', 'jfx-swarm');
      for (let i = 0; i < 46; i++) {
        const bat = el('span', 'jfx-bat'); bat.append(svg(BAT));
        bat.style.top = `${Math.random() * 96}%`;
        bat.style.setProperty('--size', `${26 + Math.random() * 46}px`);
        bat.style.animationDelay = `${Math.random() * 1.4}s`;
        bat.style.animationDuration = `${1.3 + Math.random() * 1.1}s`;
        swarm.append(bat);
      }
      const l1 = line('コウモリの大群や！！', 'is-accent');
      c.overlay.append(swarm, l1);
      c.raf(() => c.overlay.classList.add('is-on'));
      c.at(800, () => { c.cover(); l1.classList.add('is-on'); });
      c.at(3300, c.reveal);
    },
    // 5. かぼちゃ大王：巨大ジャック・オ・ランタンが灯り、弾けて消える
    pumpkin(c) {
      const king = el('span', 'jfx-king'); king.append(svg(PUMPKIN));
      const l1 = line('トリック・オア・クリエイト！', 'is-accent');
      c.overlay.append(king, l1);
      c.raf(() => c.overlay.classList.add('is-on'));
      c.at(600, () => c.cover());
      c.at(700, () => king.classList.add('is-lit'));
      c.at(1500, () => l1.classList.add('is-on'));
      c.at(3300, c.reveal);
      c.exit = () => { king.classList.add('is-burst'); l1.classList.remove('is-on'); c.overlay.classList.add('is-fading'); return 1100; };
    },
    // 6. ハロウィン放送局：砂嵐→受信→ブラウン管が消えるように閉じる
    tv(c) {
      const canvas = el('canvas', 'jfx-noise'); canvas.width = 160; canvas.height = 90;
      const g = canvas.getContext('2d'), img = g.createImageData(160, 90);
      const noise = () => {                                  // 砂嵐：低解像度のランダムな灰色を毎フレーム描く
        for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255 | 0; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
        g.putImageData(img, 0, 0); c.raf(noise);
      };
      const l1 = line('📺 ハロウィン放送局、受信中……'), l2 = line('……受信完了。はじまるで。', 'is-accent');
      c.overlay.append(canvas, el('div', 'jfx-scan'), l1, l2);
      noise();
      c.raf(() => c.overlay.classList.add('is-on'));
      c.at(250, () => c.cover());
      c.at(500, () => l1.classList.add('is-on'));
      c.at(2000, () => { l1.classList.remove('is-on'); l2.classList.add('is-on'); c.overlay.classList.add('is-tuned'); });
      c.at(3300, c.reveal);
      c.exit = () => { c.overlay.classList.add('is-off'); return 700; };
    }
  };
  function watchJoinFx() {
    if (reduced) return;
    const hint = $('joinHint');
    if (hint) hint.style.setProperty('--fuse', `${JOIN_FX_AFTER}ms`);
    const arm = () => {
      clearTimeout(joinFx.timer);
      // 注釈の導火線：開くたびに最初から燃やし直す（燃え切る＝演出が始まる）
      hint?.classList.remove('is-burning'); void hint?.offsetWidth;
      if (currentView() === 'join') { hint?.classList.add('is-burning'); joinFx.timer = setTimeout(startJoinFx, JOIN_FX_AFTER); }
      else if (joinFx.running) joinFx.running.reveal();   // 演出中に別の画面へ移ったら、すぐ明かりを戻す
    };
    // app.js が body[data-view] を切り替えるたびに張り直す＝「開くたび」に1回
    new MutationObserver(arm).observe(document.body, { attributes: true, attributeFilter: ['data-view'] });
    arm();
  }

  /* ---------- 8. 霧と墓地の奥行き ---------- */
  function initFog() {
    const scene = document.querySelector('.fog-scene'); if (!scene || reduced) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const r = scene.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const t = (innerHeight - r.top) / (innerHeight + r.height); // 0（画面下に入る）→1（上に抜ける）
      scene.style.setProperty('--fog-t', t.toFixed(3));
    };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener('hashchange', () => requestAnimationFrame(update));
    update();
  }

  /* ---------- 起動 ---------- */
  function onData(rows) {
    if (data.ready) return;
    data.ready = true;
    data.rows = (rows || []).filter(r => r && r.id && !r.demo);
    // 作品がまだない間は、Trick or Create の行き先が「だれか1人のカード」になるので文言も合わせる
    if (!data.rows.some(r => r.entry_type === 'work')) {
      document.querySelectorAll('[data-trick] small').forEach(n => { n.textContent = 'だれか1人に会いにいく'; });
      const p = $('lanternReward')?.querySelector('p'); if (p) p.textContent = 'ぜんぶ灯った！ 今夜のだれか1人へご案内します。';
    }
    doorDone.then(initCouriers);
  }
  document.addEventListener('halloween:data', e => onData(e.detail?.rows));
  let doorDone = Promise.resolve();
  function init() {
    initMoon(); initLanterns(); initTrick(); initTorch(); initFog(); watchJoinFx();
    doorDone = initDoor().then(releaseBats);
    if (window.__halloweenRows) onData(window.__halloweenRows); // app.js が先に読み終えていた場合
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
