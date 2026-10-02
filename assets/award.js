/* ==========================================================================
   特別賞（協賛者が選ぶ賞）
   - site-config.js の awards から、入口の「特別賞」ブロックと参加ページの帯を描く。
   - 企画趣旨（順位を決める場所やない）に合わせて、1位・2位ではなく
     「選ぶ人が、おもしろい・刺さったと思った作品」として見せる。
   - 選ぶ人（selectors）は複数人に対応。creatorId を書けば、名前・アイコン・note は
     creators.csv から引く（運営と参加者を兼ねる人のアイコン差し替えを1か所で済ませるため）。
   - 表示は3段階で自動で切り替わる：
       upcoming  … phase が preview のあいだ。告知画像（なければ「？」）と、参加の後押し
       judging   … phase が open/ended で、まだ受賞者が決まっていないとき
       announced … winners の id が参加者データ（creators.csv）にあるとき
   - 受賞者のクリエイターカードと美術館の額縁には、あとからリボンを付ける。
   ========================================================================== */
(() => {
  'use strict';
  const config = window.HALLOWEEN_CONFIG || {};
  const $ = id => document.getElementById(id);
  const awards = (Array.isArray(config.awards) ? config.awards : []).filter(a => a && a.name);
  let rows = [];

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }
  function append(parent, ...kids) { kids.filter(Boolean).forEach(k => parent.appendChild(k)); return parent; }
  // app.js と同じ基準：HTTPS の URL か、サイト内の assets/ 以下だけを画像として使う
  function safeImage(url) {
    const v = String(url || '').trim();
    if (/^assets\/[\w./-]+$/.test(v) && !v.includes('..')) return v;
    try { const u = new URL(v); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; }
  }
  function safeLink(url) { try { const u = new URL(String(url || '')); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } }
  function img(src, cls, alt) {
    const i = el('img', cls); i.src = src; i.alt = alt || ''; i.loading = 'lazy'; i.decoding = 'async';
    // 画像が読めないとき（note の画像URLが変わった等）は枠だけ残して代替表示にする
    i.addEventListener('error', () => { i.replaceWith(el('span', 'award-face-fallback', '🎃')); }, { once: true });
    return i;
  }
  function outLink(text, url, cls) {
    const a = el('a', cls, text); a.href = url; a.target = '_blank'; a.rel = 'noopener'; return a;
  }

  /* 選ぶ人：creatorId があれば CSV の行を優先し、config に書いた値で上書きできる */
  function selectorsOf(award) {
    const list = Array.isArray(award.selectors) ? award.selectors
      : award.sponsor ? [{ name: award.sponsor, url: award.sponsorUrl, icon: award.sponsorIcon }] : [];
    return list.map(s => {
      const r = s.creatorId ? rows.find(x => x.id === s.creatorId) : null;
      return {
        name: s.name || (r && r.name) || '',
        url: safeLink(s.url) || (r && r.profile) || (r && r.note_id ? `https://note.com/${r.note_id}` : ''),
        icon: safeImage(s.icon) || safeImage(r && r.icon_url)
      };
    }).filter(s => s.name);
  }
  function selectorNames(award) { return selectorsOf(award).map(s => s.name).join('さん・'); }

  /* 受賞者：winners の id が CSV にある人だけを数える（未来の発表を先に書いても漏れない） */
  function winnersOf(award) {
    const list = Array.isArray(award.winners) ? award.winners : award.winnerId ? [{ id: award.winnerId, comment: award.comment }] : [];
    return list.map(w => ({ ...w, row: rows.find(r => r.id === w.id) })).filter(w => w.row);
  }
  function stateOf(award) {
    if (winnersOf(award).length) return 'announced';
    return config.phase === 'preview' || !config.phase ? 'upcoming' : 'judging';
  }

  function selectorBlock(award) {
    const sel = selectorsOf(award);
    const box = el('div', 'award-selectors');
    append(box, el('span', 'award-selectors-label', sel.length > 1 ? '選ぶ人たち' : '選ぶ人'));
    const list = el('ul', 'award-selector-list'); list.setAttribute('role', 'list');
    sel.forEach(s => {
      const li = el('li', 'award-selector');
      const face = el('span', 'award-sponsor-face');
      append(face, s.icon ? img(s.icon, '', '') : el('span', 'award-face-fallback', '🎩'));
      append(li, face, s.url ? outLink(s.name, s.url, 'award-sponsor-name') : el('span', 'award-sponsor-name', s.name));
      append(list, li);
    });
    return append(box, list);
  }

  /* 右側の額縁：状態によって中身が変わる */
  function frameBlock(award, st) {
    const wrap = el('div', 'award-frames');
    if (st === 'announced') {
      // 受賞者の数だけ額縁を並べる（2人が別々に選んだら2枚）
      const ws = winnersOf(award), multi = ws.length > 1;
      ws.forEach(w => {
        const r = w.row, fig = el('figure', 'award-frame is-announced');
        // 2枚並ぶと額縁が細くなるので、リボンは「◯◯選」と短くする
        const ribbonText = multi && w.by ? `${w.by}選` : (w.title || award.name);
        const pic = safeImage(r.entry_type === 'work' ? r.thumb_url : r.icon_url);
        const inner = append(el('div', 'award-frame-inner'),
          pic ? img(pic, 'award-winner-img', r.entry_type === 'work' ? `${r.name}『${r.article_title}』` : r.name) : el('span', 'award-frame-mark', '🎃'));
        const cap = append(el('figcaption', 'award-frame-cap'),
          el('span', 'award-winner-title', r.entry_type === 'work' ? r.article_title : '自己紹介'), el('span', 'award-winner-name', r.name));
        append(wrap, append(fig, el('span', 'award-ribbon', ribbonText), inner, cap));
      });
      if (wrap.children.length > 1) wrap.classList.add('is-multi');
      return wrap;
    }
    const fig = el('figure', `award-frame is-${st}`), inner = el('div', 'award-frame-inner');
    const visual = safeImage(award.image);
    if (st === 'judging') {
      // 懐中電灯の光が額縁の中をゆっくり動く（動きを減らす設定では止まる）
      append(inner, el('span', 'award-beam'), el('span', 'award-frame-mark', '🔦'));
      return append(wrap, append(fig, el('span', 'award-ribbon', award.name), inner,
        el('figcaption', 'award-frame-cap', `${selectorNames(award)}さんが展示を見て回っています`)));
    }
    // 募集中：告知画像があれば額縁に飾る。なければ「？」
    if (visual) {
      fig.classList.add('has-visual');
      const a = el('a', 'award-frame-link'); a.href = visual; a.target = '_blank'; a.rel = 'noopener';
      append(inner, append(a, img(visual, 'award-winner-img', award.imageAlt || '')));
    } else append(inner, el('span', 'award-frame-mark award-q', '？'));
    return append(wrap, append(fig, el('span', 'award-ribbon', award.name), inner,
      el('figcaption', 'award-frame-cap', award.imageCaption || 'この額縁に入るのは、あなたの作品かも')));
  }

  function factRow(label, value) { return append(el('div'), el('dt', '', label), el('dd', '', value)); }

  function awardCard(award) {
    const st = stateOf(award);
    const card = el('article', `award-card is-${st}`);
    const body = el('div', 'award-body');
    const status = { upcoming: '参加者募集中', judging: '選考中', announced: '発表しました' }[st];
    append(body, el('span', `award-status is-${st}`, status), el('h3', 'award-name', award.name), selectorBlock(award));

    if (st === 'announced') {
      winnersOf(award).forEach(w => {
        if (!w.comment) return;
        append(body, append(el('blockquote', 'award-comment'), el('p', '', w.comment), el('cite', '', `— ${w.by || selectorNames(award)}`)));
      });
    } else if (award.message) append(body, el('p', 'award-message', award.message));

    const facts = el('dl', 'award-facts');
    if (award.rule) append(facts, factRow('✊ ルール', award.rule));
    append(facts, factRow('🎁 賞品', award.prize || '後日発表'));
    if (st !== 'announced') append(facts, factRow('📅 発表', award.announceLabel || '後日発表'));
    append(body, facts);

    const actions = el('div', 'actions');
    if (st === 'announced') {
      winnersOf(award).forEach(w => {
        const url = safeLink(w.row.entry_type === 'work' ? w.row.article_url : w.row.intro_url);
        if (url) append(actions, outLink(`${w.row.name}さんの作品を読む`, url, 'act hot'));
      });
    } else if (st === 'upcoming') {
      const a = el('a', 'act hot', '参加方法を見る'); a.href = '#join'; append(actions, a);
    } else {
      const a = el('a', 'act', '美術館をめぐる'); a.href = '#gallery'; append(actions, a);
    }
    const src = safeLink(award.sourceUrl);
    if (src) append(actions, outLink('協賛のおしらせを読む', src, 'act'));
    append(body, actions);
    return append(card, body, frameBlock(award, st));
  }

  function renderBlock() {
    const section = $('award'), list = $('awardList');
    if (!section || !list) return;
    if (!awards.length) { section.hidden = true; return; }
    section.hidden = false;
    list.replaceChildren(...awards.map(awardCard));
  }

  /* 参加ページの帯：募集中だけ出す（「賞あり」を参加の動機にする） */
  function renderBanner() {
    const banner = $('awardBanner');
    if (!banner) return;
    const open = awards.filter(a => stateOf(a) === 'upcoming');
    banner.hidden = !open.length;
    if (!open.length) return;
    const text = open.length === 1
      ? `${selectorNames(open[0])}さんが選ぶ「${open[0].name}」があります`
      : `協賛者が選ぶ特別賞が${open.length}つあります`;
    $('awardBannerText').textContent = text;
  }

  /* 受賞者のカード・額縁にリボンを付ける。一覧は検索や並び替えで描き直されるので、見張って付け直す */
  function decorateWinners() {
    awards.forEach(a => {
      winnersOf(a).forEach(w => {
        [`creator-${w.id}`, `work-${w.id}`].forEach(id => {
          const node = $(id);
          if (!node || node.querySelector('.award-rosette')) return;
          node.classList.add('is-award');
          node.appendChild(el('span', 'award-rosette', `🏅 ${w.title || a.name}`));
        });
      });
    });
  }
  function watchGrids() {
    const obs = new MutationObserver(decorateWinners);
    ['creatorGrid', 'workGrid'].forEach(id => { const g = $(id); if (g) obs.observe(g, { childList: true }); });
  }

  function render() { renderBlock(); renderBanner(); decorateWinners(); }

  // 参加者データは app.js から届く。届く前でも「募集中／選考中」は描ける（届いたらアイコン等を描き直す）
  document.addEventListener('halloween:data', e => { rows = (e.detail && e.detail.rows) || []; render(); });
  document.addEventListener('DOMContentLoaded', () => {
    if (Array.isArray(window.__halloweenRows)) rows = window.__halloweenRows;
    render(); watchGrids();
  });
})();
