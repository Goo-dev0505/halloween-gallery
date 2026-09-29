/* Halloween Gallery: all CSV values enter the DOM as text or vetted URLs. */
(function () {
  'use strict';
  const COLUMNS = ['id','name','note_id','icon_url','catch','entry_type','work_type','article_url','article_title','thumb_url','intro_url','tags','added_at'];
  const TYPES = new Set(['illust','video','poster']);
  const DAY = 86400000;
  const $ = id => document.getElementById(id);
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const config = typeof window !== 'undefined' ? (window.HALLOWEEN_CONFIG || {}) : {};
  const demoMode = config.demoMode === true;
  const state = { rows: [], order: [], filter: 'all', query: '', room: 'all', failed: false };
  const SPIN_SECONDS = 24; // メリーゴーランドが1周する秒数
  // playing：自動回転のオン／オフ。「動きを減らす」設定の人は止めた状態から始め、ボタンで回せる
  const carousel = { items: [], angle: 0, step: 0, radius: 0, frame: 0, last: 0, pauseUntil: 0, hovering: false, focused: false, playing: !reduced, dragging: false, startX: 0, startAngle: 0, moved: false, turbo: 0, brake: null };
  /* 高速回転ルーレット：速さボタン（ふつう／速い／めっちゃ速い／爆速）で選び、
     「ブレーキ」でだれか1人の前に止まる。TURBO[n] = 通常速度の何倍か */
  const TURBO = [1, 6, 18, 60];
  const BRAKE_MS = 2800; // ブレーキをかけてから止まるまで

  function httpsUrl(value, host) {
    try {
      const url = new URL(String(value || '').trim());
      if (url.protocol !== 'https:' || url.username || url.password) return '';
      if (host && url.hostname !== host) return '';
      return url.href;
    } catch { return ''; }
  }
  // 画像URL：HTTPS の外部画像か、このサイトに置いた画像（assets/ 以下、.. を含まない）だけを通す
  function imageUrl(value) {
    const v = String(value || '').trim();
    if (/^assets\/[A-Za-z0-9_\-/.]+\.(?:png|jpe?g|webp|gif|svg)$/i.test(v) && !v.includes('..')) return v;
    return httpsUrl(v);
  }
  function validDate(value, now = Date.now()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00+09:00');
    if (!Number.isFinite(date.getTime())) return false;
    const localDay = new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return localDay === value && date.getTime() <= now;
  }
  function carouselSlotCount(realCount) { return realCount > 0 && realCount < 6 ? 12 : realCount; }
  function eventPresentation(phase, start, now) {
    if (phase === 'open') return { status: '開催中', clock: false, fallback: false, left: 0 };
    if (phase === 'ended') return { status: '展示終了', clock: false, fallback: false, left: 0 };
    if (!Number.isFinite(start)) return { status: '開催前', clock: false, fallback: true, fallbackText: '開催日時を準備中です。', left: 0 };
    const left = Math.max(0, start - now);
    return left === 0
      ? { status: 'まもなく開幕', clock: false, fallback: true, fallbackText: 'まもなく開幕。公開の案内をお待ちください。', left: 0 }
      : { status: '開催前', clock: true, fallback: false, left };
  }
  function demoRows() {
    return [
      { id:'c901', name:'仮の作家・クロネコ', note_id:'', icon_url:'assets/demo/cat-gallery.jpg', catch:'夜の美術館を案内する黒猫を描きました。', entry_type:'work', work_type:'illust', article_url:'', article_title:'魔女帽子の黒猫と夜の美術館', thumb_url:'assets/demo/cat-gallery.jpg', intro_url:'', tags:'猫;イラスト;夜の美術館', tagList:['猫','イラスト','夜の美術館'], added_at:'', profile:'', isNew:false, demo:true },
      { id:'c902', name:'仮の作家・月灯', note_id:'', icon_url:'assets/demo/pumpkin-lantern.jpg', catch:'やさしい光のハロウィンを作ります。', entry_type:'work', work_type:'poster', article_url:'', article_title:'月夜に浮かぶかぼちゃ灯籠', thumb_url:'assets/demo/pumpkin-lantern.jpg', intro_url:'', tags:'灯り;ポスター;秋', tagList:['灯り','ポスター','秋'], added_at:'', profile:'', isNew:false, demo:true },
      { id:'c903', name:'仮の作家・星の便り', note_id:'', icon_url:'', catch:'展示会を楽しみにしている自己紹介枠の見本です。', entry_type:'intro', work_type:'', article_url:'', article_title:'', thumb_url:'', intro_url:'', tags:'自己紹介;ことば', tagList:['自己紹介','ことば'], added_at:'', profile:'', isNew:false, demo:true },
      { id:'c904', name:'仮の作家・おばけ郵便', note_id:'', icon_url:'assets/demo/ghost-mail.jpg', catch:'夜に届く小さな手紙を描いています。', entry_type:'work', work_type:'illust', article_url:'', article_title:'おばけの郵便屋さん', thumb_url:'assets/demo/ghost-mail.jpg', intro_url:'', tags:'おばけ;手紙;イラスト', tagList:['おばけ','手紙','イラスト'], added_at:'', profile:'', isNew:false, demo:true },
      { id:'c905', name:'仮の作家・コウモリ行進曲', note_id:'', icon_url:'assets/demo/bat-parade.jpg', catch:'街じゅうを巡る仮装パレードの映像見本。', entry_type:'work', work_type:'video', article_url:'', article_title:'星とコウモリの夜の行進', thumb_url:'assets/demo/bat-parade.jpg', intro_url:'', tags:'動画;パレード;星', tagList:['動画','パレード','星'], added_at:'', profile:'', isNew:false, demo:true },
      { id:'c906', name:'仮の作家・魔法の栞', note_id:'', icon_url:'', catch:'ことばでハロウィンに参加する自己紹介枠です。', entry_type:'intro', work_type:'', article_url:'', article_title:'', thumb_url:'', intro_url:'', tags:'自己紹介;物語', tagList:['自己紹介','物語'], added_at:'', profile:'', isNew:false, demo:true }
    ];
  }
  function validateRows(rows, now = Date.now(), logger = console) {
    const out = [], seen = new Set();
    rows.forEach((source, index) => {
      const r = Object.fromEntries(COLUMNS.map(key => [key, String(source?.[key] ?? '').trim()]));
      const line = Number(source?.__line) || index + 2;
      let error = '';
      if (!/^c\d{3,}$/.test(r.id)) error = 'id は c001 形式で必須';
      else if (seen.has(r.id)) error = 'id が重複';
      else if (!r.name) error = 'name が空';
      else if (!/^[A-Za-z0-9_-]+$/.test(r.note_id)) error = 'note_id が不正';
      else if (!['work','intro'].includes(r.entry_type)) error = 'entry_type が不正';
      else if (!validDate(r.added_at, now)) error = 'added_at が不正または未来日';
      else if (r.icon_url && !imageUrl(r.icon_url)) error = 'icon_url は HTTPS URL か assets/ の画像が必要';
      else if (r.intro_url && !httpsUrl(r.intro_url, 'note.com')) error = 'intro_url は HTTPS の note URL が必要';
      else if (r.entry_type === 'work') {
        if (!TYPES.has(r.work_type)) error = 'work_type が不正';
        else if (!httpsUrl(r.article_url, 'note.com')) error = 'article_url は HTTPS の note URL が必要';
        else if (!r.article_title) error = 'article_title が空';
        else if (!imageUrl(r.thumb_url)) error = 'thumb_url は HTTPS URL か assets/ の画像が必要';
      }
      if (error) { logger.warn(`creators.csv ${line}行目: ${error}`); return; }
      seen.add(r.id);
      r.profile = `https://note.com/${encodeURIComponent(r.note_id)}`;
      r.tagList = r.tags.split(';').map(tag => tag.trim()).filter(Boolean);
      r.isNew = now - new Date(r.added_at + 'T00:00:00+09:00').getTime() < 7 * DAY;
      out.push(r);
    });
    return out;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { httpsUrl, imageUrl, validDate, validateRows, carouselSlotCount, eventPresentation, demoRows };
  if (typeof document === 'undefined') return;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function append(parent, ...children) { children.forEach(child => parent.append(child)); return parent; }
  function link(label, url, className = 'act') {
    const a = el('a', className, label);
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    return a;
  }
  function setExternal(id, url, text, unavailable = '近日公開') {
    const node = $(id);
    if (!node) return;
    const safe = httpsUrl(url);
    node.textContent = safe ? text : unavailable;
    if (safe) { node.href = safe; node.target = '_blank'; node.rel = 'noopener noreferrer'; node.removeAttribute('aria-disabled'); node.classList.remove('disabled', 'link-placeholder'); }
    else { node.removeAttribute('href'); node.removeAttribute('target'); node.setAttribute('aria-disabled', 'true'); }
  }
  function replaceText(id, value) { if ($(id)) $(id).textContent = value; }
  function dateLabel(value) {
    if (!value || Number.isNaN(Date.parse(value))) return '';
    return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year:'numeric', month:'long', day:'numeric', hour:'numeric', minute:'2-digit' }).format(new Date(value));
  }
  function eventTime(value) {
    if (typeof value !== 'string' || !/T\d{2}:\d{2}.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return NaN;
    return Date.parse(value);
  }
  // 見出し：siteTitleLines があれば1行ずつ span で出す（最終行は年号として色を変える）
  function renderTitle() {
    const h1 = $('siteTitle'); if (!h1) return;
    const lines = (Array.isArray(config.siteTitleLines) ? config.siteTitleLines : []).map(String).filter(Boolean);
    if (!lines.length) { h1.textContent = config.siteName || 'ハロウィン・ノート展（仮）'; return; }
    h1.replaceChildren(...lines.map((line, i) => el('span', 'title-line' + (i === lines.length - 1 && lines.length > 1 ? ' title-year' : ''), line)));
    h1.setAttribute('aria-label', config.siteName || lines.join(''));
  }
  function setCountdownVisibility(visible) { if ($('countdown')) $('countdown').hidden = !visible; }
  function initEvent() {
    renderTitle();
    replaceText('siteLead', config.shortDescription || '作品から、まだ知らないクリエイターへ。');
    const configuredStart = eventTime(config.eventStartAt);
    const demoCountdown = demoMode && !Number.isFinite(configuredStart);
    const start = demoCountdown ? Date.now() + 7 * DAY : configuredStart;
    const end = eventTime(config.eventEndAt);
    const phase = ['preview','open','ended'].includes(config.phase) ? config.phase : 'preview';
    const dates = [dateLabel(config.eventStartAt), dateLabel(config.eventEndAt)].filter(Boolean);
    replaceText('eventDates', demoCountdown ? '正式な開催日時は準備中です。' : dates.length ? dates.join(' ～ ') + '（日本時間）' : '開催日時は準備中です');
    if (demoCountdown) {
      const label = $('countdown')?.querySelector('span');
      if (label) label.textContent = 'デモのカウントダウン';
    }
    replaceText('footerEventDates', dates.length ? '開催期間：' + dates.join(' ～ ') + '（日本時間）' : '開催期間：準備中');
    const primary = $('heroPrimary'), secondary = $('heroSecondary');
    if (primary) { primary.href = phase === 'open' ? '#gallery' : phase === 'ended' ? '#gallery' : '#about'; primary.textContent = phase === 'open' ? '作品を見る' : phase === 'ended' ? '展示を見る' : '企画の趣旨を読む'; }
    if (secondary) { secondary.href = phase === 'ended' ? '#about' : '#join'; secondary.textContent = phase === 'ended' ? '企画の趣旨を読む' : '参加方法を見る'; }
    function update() {
      const display = eventPresentation(phase, start, Date.now());
      replaceText('eventStatus', demoCountdown ? `${display.status}（デモ表示）` : display.status);
      setCountdownVisibility(display.clock);
      if ($('countdownFallback')) $('countdownFallback').hidden = !display.fallback;
      if (display.fallback) replaceText('countdownFallback', display.fallbackText);
      if (!display.clock) return;
      const seconds = Math.floor(display.left / 1000);
      replaceText('countDays', Math.floor(seconds / 86400));
      replaceText('countHours', String(Math.floor(seconds / 3600) % 24).padStart(2, '0'));
      replaceText('countMinutes', String(Math.floor(seconds / 60) % 60).padStart(2, '0'));
      replaceText('countSeconds', String(seconds % 60).padStart(2, '0'));
    }
    update();
    if (phase === 'preview' && Number.isFinite(start)) setInterval(update, 1000);
    if (phase === 'open' && Number.isFinite(end) && Date.now() >= end) replaceText('eventStatus', '開催期間を確認中');
  }
  function initOrganizer() {
    const name = config.organizerName?.trim() || '主催者名 準備中';
    replaceText('organizerName', name);
    replaceText('footerOrganizerName', name);
    const profile = $('organizerProfile');
    if (profile) {
      const safe = httpsUrl(config.organizerProfileUrl, 'note.com');
      profile.textContent = safe ? `${name}のnoteプロフィール` : 'プロフィール準備中';
      if (safe) { profile.href = safe; profile.target = '_blank'; profile.rel = 'noopener noreferrer'; profile.removeAttribute('aria-disabled'); }
      else { profile.removeAttribute('href'); profile.setAttribute('aria-disabled', 'true'); }
    }
    const characterUrl = httpsUrl(config.organizerCharacterUrl);
    ['organizerCharacter', 'organizerCharacterAbout'].forEach(id => {
      const character = $(id);
      if (!character || !characterUrl) return;
      const image = el('img'); image.src = characterUrl; image.alt = `${name}の案内キャラクター`; image.loading = 'lazy';
      image.addEventListener('error', () => {
        character.replaceChildren(el('span', 'image-placeholder', '案内キャラクター準備中'));
        character.setAttribute('role', 'img'); character.setAttribute('aria-label', '主催者キャラクター画像は準備中です');
      }, { once:true });
      character.replaceChildren(image);
      character.removeAttribute('role'); character.removeAttribute('aria-label');
    });
    const statement = $('organizerStatement');
    if (statement) {
      statement.replaceChildren();
      const paragraphs = String(config.organizerStatement || '').trim().split(/\n\s*\n/).filter(Boolean);
      if (!paragraphs.length) paragraphs.push('企画趣旨は主催者からの原文を準備中です。');
      // 段落内の改行は <br> にする（文の切れ目で改行して読みやすくする）
      paragraphs.forEach(part => {
        const p = el('p');
        part.split('\n').map(line => line.trim()).filter(Boolean).forEach((line, i) => { if (i) p.append(el('br')); p.append(line); });
        append(statement, p);
      });
    }
    setExternal('announcementLink', config.announcementUrl, '告知記事を読む');
    setExternal('launchArticleLink', config.launchArticleUrl, '参加方法記事を読む', '参加方法記事：10月1日公開予定');
    setExternal('magazineLink', config.magazineUrl, '展示マガジンを見る', '展示マガジン：準備中');
    const tool = httpsUrl(config.posterToolUrl);
    replaceText('posterToolStatus', tool ? '公開中' : '近日公開');
    setExternal('posterToolLink', tool, 'ポスターツールを開く', 'ツール：10月1日公開予定');
  }
  /* 運営チーム・協賛：site-config.js の team / sponsors から描く。note 以外のプロフィールURLは出さない */
  function teamMembers() { return (Array.isArray(config.team) ? config.team : []).filter(m => m && m.name && httpsUrl(m.url, 'note.com')); }
  function sponsorItems() { return (Array.isArray(config.sponsors) ? config.sponsors : []).filter(s => s && s.name && httpsUrl(s.url)); }
  // 「ラベル：A・B」形式のクレジット行。名前はそれぞれ note へのリンク
  function creditLine(node, label, items) {
    if (!node || !items.length) return false;
    node.replaceChildren(el('span', 'credit-label', label + '：'));
    items.forEach((item, i) => { if (i) append(node, '・'); append(node, link(item.name, httpsUrl(item.url), 'credit-link')); });
    node.hidden = false;
    return true;
  }
  function initTeam() {
    const team = teamMembers(), sponsors = sponsorItems();
    const operators = team.filter(m => m.role !== '主催');
    const block = $('teamBlock');
    if (block && (team.length || sponsors.length)) {
      $('teamList')?.replaceChildren(...team.map(m => {
        const card = link('', httpsUrl(m.url, 'note.com'), 'member');
        card.setAttribute('aria-label', `${m.role || '運営'}・${m.name}のnoteプロフィール`);
        const icon = imageUrl(m.icon);
        append(card,
          icon ? imageOrPlaceholder(icon, '', 'avatar', 64, 64) : el('span', 'avatar image-placeholder', '🎃'),
          el('span', 'member-role' + (m.role === '主催' ? ' is-host' : ''), m.role || '運営'),
          el('span', 'member-name', m.name));
        return append(el('li'), card);
      }));
      $('sponsorList')?.replaceChildren(...sponsors.map(sp => {
        const card = link('', httpsUrl(sp.url), 'sponsor-card');
        const media = el('span', 'sponsor-media'), image = imageUrl(sp.image);
        append(media, image ? imageOrPlaceholder(image, '', 'work-image', 216, 113) : el('span', 'sponsor-mark', '✦'));
        const body = append(el('span', 'sponsor-body'), el('span', 'sponsor-role', sp.role || '協賛'), el('span', 'sponsor-name', sp.name));
        if (sp.title) append(body, el('span', 'sponsor-title', sp.title));
        append(body, el('span', 'sponsor-cta', 'マガジンを見る'));
        return append(card, media, body);
      }));
      block.hidden = false;
    }
    // 入口のクレジット行：運営と協賛があれば差し替える（なければ元の制作クレジットのまま）
    const hero = $('heroCredits');
    if (hero && (operators.length || sponsors.length)) {
      const opsLine = el('span', 'credit-group'), spLine = el('span', 'credit-group');
      const parts = [creditLine(opsLine, '運営', operators) && opsLine, creditLine(spLine, '協賛', sponsors) && spLine].filter(Boolean);
      hero.replaceChildren(...parts);
    }
    creditLine($('footerTeam'), '運営', operators);
    creditLine($('footerSponsors'), '協賛', sponsors);
  }
  function badge() { return el('span', 'badge-new', 'NEW'); }
  function imageOrPlaceholder(url, alt, kind, width, height) {
    const box = el('span', kind);
    if (kind === 'work-image') { box.style.display = 'block'; box.style.width = '100%'; box.style.height = '100%'; }
    const img = el('img');
    img.src = url; img.alt = alt; img.loading = 'lazy'; img.width = width; img.height = height;
    const fallback = () => {
      if (kind === 'avatar') box.replaceChildren(el('span', 'image-placeholder', '🎃'));
      else { img.src = 'assets/placeholder.png'; img.alt = alt; }
    };
    img.addEventListener('error', fallback, { once: true });
    append(box, img);
    return box;
  }
  function avatar(r) {
    return r.icon_url ? imageOrPlaceholder(r.icon_url, '', 'avatar', 64, 64) : el('span', 'avatar image-placeholder', '🎃');
  }
  function creatorCard(r) {
    const card = el('article', 'card'); card.id = `creator-${r.id}`; card.tabIndex = -1;
    if (r.isNew) append(card, badge());
    const top = el('div', 'top'), heading = el('div');
    append(heading, el('h3', '', r.name), el('p', 'catch', r.catch));
    append(top, avatar(r), heading); append(card, top);
    if (r.tagList.length) {
      const tags = el('div', 'tags');
      r.tagList.slice(0,3).forEach(tag => { const button = el('button', 'tag', '#' + tag); button.type = 'button'; button.dataset.tag = tag; append(tags, button); });
      if (r.tagList.length > 3) append(tags, el('span', 'tag more', '+' + (r.tagList.length - 3)));
      append(card, tags);
    }
    const actions = el('div', 'actions');
    if (r.demo) append(actions, el('span', 'act demo-pill', '架空の展示例'));
    else append(actions, link('note プロフィール', r.profile));
    if (!r.demo && r.intro_url) append(actions, link('自己紹介を読む', r.intro_url));
    if (r.entry_type === 'work') { const button = el('button', 'act hot', '作品を見る'); button.type = 'button'; button.dataset.workId = r.id; append(actions, button); }
    append(card, actions); return card;
  }
  function emptyCreator() { return append(el('div', 'card dummy'), el('span', '', '🕯️'), el('p', '', 'あなたの自己紹介がここに')); }
  function workCard(r) {
    const card = el('article', 'frame'); card.id = `work-${r.id}`; card.tabIndex = -1;
    const inner = el('div', 'inner'), thumb = r.demo ? el('div', 'thumb') : link('', r.article_url, 'thumb');
    if (!r.demo) thumb.setAttribute('aria-label', `${r.article_title}をnoteで読む`);
    append(thumb, imageOrPlaceholder(r.thumb_url, `${r.name}『${r.article_title}』`, 'work-image', 382, 200));
    if (r.work_type === 'video' && !r.demo) append(thumb, el('span', 'play', '▶'));
    const title = el('h3', '', r.article_title); title.title = r.article_title; // 長いタイトルは3行で切るので、全文をツールチップで出す
    const cap = el('div', 'cap'); append(cap, title);
    const author = el('button', 'by', r.name); author.type = 'button'; author.dataset.creatorId = r.id; append(cap, author);
    if (r.isNew) append(cap, badge());
    append(cap, append(el('div', 'actions'), r.demo ? el('span', 'act demo-pill', '架空の作品例') : link('記事を読む', r.article_url)));
    append(inner, thumb, cap); append(card, inner); return card;
  }
  function emptyWork() { return append(el('div', 'frame dummy'), append(el('div', 'inner'), append(el('div', 'thumb'), el('span', '', '🖼️ あなたの作品がここに')))); }
  function setMessage(node, text) { if (node) node.replaceChildren(el('p', 'empty-note', text)); }
  function renderCreators() {
    const grid = $('creatorGrid'); if (!grid) return;
    if (state.failed) { setMessage(grid, '展示を準備中です。しばらくしてからもう一度ご覧ください。'); return; }
    const q = state.query.toLocaleLowerCase('ja');
    const list = state.order.filter(r => (state.filter === 'all' || r.entry_type === state.filter) && (!q || [r.name,r.catch,r.tags,r.article_title].join(' ').toLocaleLowerCase('ja').includes(q)));
    grid.replaceChildren(...list.map(creatorCard));
    if (!list.length && (q || state.filter !== 'all')) setMessage(grid, '該当するクリエイターはいません。検索語や絞り込みを変えてください。');
    else if (state.filter === 'all' && !q) for (let i = list.length; i < 6; i++) append(grid, emptyCreator());
    const counts = { all: state.rows.length, work: state.rows.filter(r => r.entry_type === 'work').length };
    counts.intro = counts.all - counts.work;
    $('creatorFilter')?.querySelectorAll('[data-filter]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter));
      const count = button.querySelector('[data-count]') || button.querySelector('span');
      if (count) count.textContent = String(counts[button.dataset.filter] ?? 0);
    });
  }
  function renderWorks() {
    const grid = $('workGrid'); if (!grid) return;
    grid.classList.add('works');
    if (state.failed) { setMessage(grid, '展示を準備中です。しばらくしてからもう一度ご覧ください。'); return; }
    const works = state.rows.filter(r => r.entry_type === 'work');
    $('galleryRooms')?.querySelectorAll('[data-room]').forEach(button => {
      const count = button.dataset.room === 'all' ? works.length : works.filter(r => r.work_type === button.dataset.room).length;
      const marker = button.querySelector('[data-count]') || button.querySelector('span');
      if (marker) marker.textContent = String(count);
      button.disabled = button.dataset.room !== 'all' && !works.some(r => r.work_type === button.dataset.room);
      if (button.disabled && state.room === button.dataset.room) state.room = 'all';
      button.setAttribute('aria-pressed', String(button.dataset.room === state.room));
    });
    const list = works.filter(r => state.room === 'all' || r.work_type === state.room);
    grid.replaceChildren(...list.map(workCard));
    if (state.room === 'all') for (let i = list.length; i < 6; i++) append(grid, emptyWork());
    else if (!list.length) setMessage(grid, 'この展示室にはまだ作品がありません。');
  }
  function shuffle(items) {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    return copy;
  }
  function renderCarousel() {
    const ring = $('carouselRing'), outer = $('carousel');
    if (!ring || !outer) return;
    ring.classList.add('ring');
    if (carousel.frame) cancelAnimationFrame(carousel.frame);
    carousel.frame = 0; carousel.last = 0; carousel.angle = 0;
    resetTurbo();
    if (viewOf(ring)?.hidden) return; // 非表示ビュー内では描画しない（表示時に showView が再呼び出しする）
    if (state.failed || !state.rows.length) {
      ring.replaceChildren(el('p', 'empty-note', state.failed ? '展示を準備中です。' : '最初の参加クリエイターをお待ちしています。'));
      outer.classList.add('is-empty');
      if ($('carouselPrev')) $('carouselPrev').disabled = true;
      if ($('carouselNext')) $('carouselNext').disabled = true;
      if ($('carouselToggle')) $('carouselToggle').disabled = true;
      if ($('carouselBrake')) $('carouselBrake').disabled = true;
      $('carouselSpeeds')?.querySelectorAll('button').forEach(b => { b.disabled = true; });
      return;
    }
    outer.classList.remove('is-empty');
    if ($('carouselPrev')) $('carouselPrev').disabled = false;
    if ($('carouselNext')) $('carouselNext').disabled = false;
    if ($('carouselToggle')) $('carouselToggle').disabled = false;
    $('carouselSpeeds')?.querySelectorAll('button').forEach(b => { b.disabled = false; });
    syncCarouselToggle();
    const real = shuffle(state.rows).slice(0,12);
    const slots = carouselSlotCount(real.length);
    carousel.step = 360 / slots;
    carousel.radius = Math.round((innerWidth >= 768 ? 182 : 150) / (2 * Math.tan(Math.PI / slots)));
    const items = real.concat(Array(slots - real.length).fill(null));
    ring.replaceChildren(...items.map((r, i) => {
      const item = el('div', 'cc' + (r ? '' : ' dummy'));
      item.style.transform = `rotateY(${i * carousel.step}deg) translateZ(${carousel.radius}px)`;
      if (r) {
        const button = el('button', 'face front', ''); button.type = 'button'; button.dataset.creatorId = r.id; button.setAttribute('aria-label', `${r.name}のカードへ移動`);
        append(button, avatar(r), el('span', 'name', r.name), el('span', 'catch', r.catch));
        append(item, button, el('div', 'face back', '🎃'));
      } else append(item, append(el('div', 'face front'), el('span', 'catch', 'あなたの席が空いています')), el('div', 'face back', '🎃'));
      return item;
    }));
    carousel.items = [...ring.children];
    carousel.items.forEach(paintSpinBadge); // これまでに止まった回数のバッジ
    ring.style.setProperty('--cw', innerWidth >= 768 ? '160px' : '128px');
    const stage = ring.closest('.stage'); if (stage) stage.style.height = `${270 + Math.min(80, carousel.radius / 8)}px`;
    paintCarousel();
    carousel.frame = requestAnimationFrame(tick); // 回すかどうかは tick 側で判断する
  }
  function paintCarousel() {
    const ring = $('carouselRing'); if (!ring || !carousel.items.length) return;
    ring.style.transform = `translateZ(${-carousel.radius}px) rotateY(${-carousel.angle}deg)`;
    carousel.items.forEach((item,i) => {
      const angle = ((i * carousel.step - carousel.angle) % 360 + 540) % 360 - 180;
      const front = (Math.cos(angle * Math.PI / 180) + 1) / 2;
      item.style.zIndex = String(Math.round(front * 100));
      item.style.opacity = String(0.45 + 0.55 * front);
    });
  }
  function tick(now) {
    const elapsed = carousel.last ? Math.min(64, now - carousel.last) : 16;
    carousel.last = now;
    const base = 360 / (SPIN_SECONDS * 1000); // 通常時の1ミリ秒あたりの角度
    if (carousel.brake) {
      // ブレーキ中：狙った人の角度へ、だんだん遅くなりながら止める（easeOutCubic）
      const b = carousel.brake, t = Math.min(1, (now - b.start) / BRAKE_MS);
      carousel.angle = b.from + (b.to - b.from) * (1 - Math.pow(1 - t, 3));
      if (t >= 1) landTurbo();
    } else if (carousel.turbo > 0) {
      if (!carousel.dragging) carousel.angle += elapsed * base * TURBO[carousel.turbo]; // 高速中はマウスが乗っていても止めない
    } else if (carousel.playing && !carousel.dragging && !carousel.hovering && !carousel.focused && now > carousel.pauseUntil) {
      // カードにマウスが乗っている・キーボードで選んでいる・ドラッグ中・操作直後は回さない
      carousel.angle += elapsed * base;
    }
    paintCarousel(); carousel.frame = requestAnimationFrame(tick);
  }
  function pauseCarousel() { carousel.pauseUntil = performance.now() + 3000; }
  function syncCarouselToggle() {
    const button = $('carouselToggle'); if (!button) return;
    button.textContent = carousel.playing ? '⏸ 止める' : '▶ 回す';
    button.setAttribute('aria-label', carousel.playing ? 'メリーゴーランドの回転を止める' : 'メリーゴーランドを回す');
    button.setAttribute('aria-pressed', String(!carousel.playing));
  }
  function setTurboClass() {
    const stage = $('carouselRing')?.closest('.stage');
    stage?.classList.remove('turbo-1', 'turbo-2', 'turbo-3', 'is-braking');
    if (carousel.turbo > 0) stage?.classList.add(`turbo-${carousel.turbo}`);
    if (carousel.brake) stage?.classList.add('is-braking');
    $('carouselSpeeds')?.querySelectorAll('[data-speed]').forEach(b => b.setAttribute('aria-pressed', String(!carousel.brake && Number(b.dataset.speed) === carousel.turbo)));
    const brake = $('carouselBrake');
    if (brake) {
      brake.textContent = carousel.brake ? '…止まるまで待ってな' : '🛑 ブレーキ';
      brake.disabled = Boolean(carousel.brake) || !state.rows.length;
      brake.classList.toggle('is-hot', carousel.turbo >= 2);
    }
  }
  function resetTurbo() { carousel.turbo = 0; carousel.brake = null; setTurboClass(); }
  // 表側（正面）にいる実在の人カードの中から、止まる相手を選ぶ
  function brakeTurbo() {
    const choices = carousel.items.map((item, i) => ({ i, id: item.querySelector('[data-creator-id]')?.dataset.creatorId })).filter(c => c.id);
    if (!choices.length) { resetTurbo(); return; }
    const pickOne = choices[Math.floor(Math.random() * choices.length)];
    const from = carousel.angle;
    let to = pickOne.i * carousel.step;
    while (to < from + 720) to += 360; // 最低2周はしてから止まる
    carousel.brake = { from, to, start: performance.now(), id: pickOne.id, index: pickOne.i };
    setTurboClass();
  }
  function landTurbo() {
    const b = carousel.brake; carousel.brake = null; carousel.turbo = 0;
    carousel.angle = b.to % 360;
    carousel.pauseUntil = performance.now() + 5000; // 止まった人をしばらく見せる
    setTurboClass(); showSpinResult(b.id, b.index);
  }
  /* ---------- ルーレットの記録：だれに何回止まったか（閲覧者のブラウザに保存） ---------- */
  const SPIN_KEY = 'ha2026-spin-log';
  const spinLog = (() => {
    try { const v = JSON.parse(localStorage.getItem(SPIN_KEY) || '{}'); return { counts: v.counts || {}, total: v.total || 0, last: v.last || '', streak: v.streak || 0 }; }
    catch { return { counts: {}, total: 0, last: '', streak: 0 }; }
  })();
  function saveSpinLog() { try { localStorage.setItem(SPIN_KEY, JSON.stringify(spinLog)); } catch { /* 保存できなくても遊べる */ } }
  function recordSpin(id) {
    spinLog.total += 1;
    spinLog.counts[id] = (spinLog.counts[id] || 0) + 1;
    spinLog.streak = spinLog.last === id ? spinLog.streak + 1 : 1;
    spinLog.last = id;
    saveSpinLog();
    return { count: spinLog.counts[id], streak: spinLog.streak, total: spinLog.total };
  }
  // 回数と連続回数からセリフと演出の種類を決める（上ほど優先）
  function spinMessage(name, count, streak) {
    if (streak >= 3) return { level: 'streak', text: `🌀 ${name}さん、${streak}連続！！ 仕込んでへんで……？` };
    if (count >= 10) return { level: 'king', text: `👑 ${count}回目の${name}さん。殿堂入りや。` };
    if (count >= 7) return { level: 'follow', text: `🫣 ${count}回目。もう${name}さんのnote、見に行ってきたら？` };
    if (count >= 5) return { level: 'love', text: `💘 ${count}回目の${name}さん。……好きすぎやろ。` };
    if (streak === 2) return { level: 'streak', text: `‼ ${name}さん、2回連続！？` };
    if (count >= 3) return { level: 'fate', text: `👀 ${name}さん、${count}回目……運命かもしれん。` };
    if (count === 2) return { level: 'again', text: `🎃 また${name}さん！ 2回目や。` };
    return { level: 'first', text: `🎃 ${name}さんに止まった！` };
  }
  // カード右上の回数バッジ（2回以上）と、10回以上の王冠
  function paintSpinBadge(item) {
    const id = item.querySelector('[data-creator-id]')?.dataset.creatorId; if (!id) return;
    const n = spinLog.counts[id] || 0;
    item.querySelector('.spin-badge')?.remove();
    item.classList.toggle('is-king', n >= 10);
    if (n >= 2) item.querySelector('.face.front')?.append(el('span', 'spin-badge', n >= 10 ? `👑×${n}` : `×${n}`));
  }
  function burst(item, chars) {
    if (reduced || !item) return;
    const box = el('span', 'spin-burst'); box.setAttribute('aria-hidden', 'true');
    chars.forEach((c, i) => {
      const s = el('span', '', c);
      s.style.setProperty('--a', `${i * (360 / chars.length) + Math.random() * 20}deg`);
      s.style.setProperty('--r', `${70 + Math.random() * 50}px`);
      box.append(s);
    });
    item.append(box);
    setTimeout(() => box.remove(), 1500);
  }
  function showSpinResult(id, index) {
    const r = state.rows.find(row => row.id === id), box = $('spinResult');
    carousel.items.forEach((item, i) => item.classList.toggle('is-winner', i === index));
    if (!r || !box) return;
    const { count, streak, total } = recordSpin(id);
    const msg = spinMessage(r.name, count, streak);
    const item = carousel.items[index];
    paintSpinBadge(item);
    // 演出：好きすぎ＝ハート、殿堂入り＝王冠＋紙吹雪、連続＝舞台が揺れる
    if (msg.level === 'love' || msg.level === 'follow') burst(item, ['💘', '💕', '💗', '💘', '💞', '💕']);
    if (msg.level === 'king') burst(item, ['👑', '✨', '🎉', '✨', '👑', '🎉']);
    if (msg.level === 'streak' && !reduced) {
      const stage = $('carouselRing')?.closest('.stage');
      stage?.classList.remove('is-jolt'); void stage?.offsetWidth; stage?.classList.add('is-jolt');
    }
    const go = el('button', 'act hot', 'カードを見る'); go.type = 'button'; go.dataset.creatorId = r.id;
    const actions = append(el('span', 'spin-result-actions'), go);
    if (msg.level === 'follow' || msg.level === 'king') append(actions, link('noteを見る', r.profile));
    const meta = el('span', 'spin-result-meta', `通算${total}回目のブレーキ`);
    const reset = el('button', 'spin-reset', '記録を消す'); reset.type = 'button';
    reset.addEventListener('click', () => {
      spinLog.counts = {}; spinLog.total = 0; spinLog.last = ''; spinLog.streak = 0; saveSpinLog();
      carousel.items.forEach(paintSpinBadge); clearSpinResult();
    });
    box.className = `spin-result is-${msg.level}`;
    box.replaceChildren(el('span', 'spin-result-text', msg.text), actions, append(el('span', 'spin-result-foot'), meta, reset));
    box.hidden = false;
  }
  function clearSpinResult() {
    $('spinResult')?.setAttribute('hidden', '');
    carousel.items.forEach(item => item.classList.remove('is-winner'));
  }
  // 速さボタン：押した速さでそのまま回る（ふつう＝通常の自動回転に戻す）
  function setSpeed(level) {
    if (carousel.brake || !carousel.items.length) return;
    clearSpinResult();
    carousel.turbo = Math.max(0, Math.min(TURBO.length - 1, level));
    carousel.pauseUntil = 0;
    setTurboClass();
  }
  // ブレーキ：どの速さからでも押せる。動きを減らす設定の人は回さずにその場で1人を選ぶ
  function pressBrake() {
    if (carousel.brake || !carousel.items.length) return;
    clearSpinResult();
    brakeTurbo();
    if (reduced && carousel.brake) landTurbo();
    paintCarousel();
  }
  function turnCarousel(direction) { if (!carousel.step) return; carousel.angle = Math.round(carousel.angle / carousel.step + direction) * carousel.step; paintCarousel(); pauseCarousel(); }
  function focusCard(node) {
    if (!node) return;
    node.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
    node.focus({ preventScroll: true }); node.classList.add('flash');
    setTimeout(() => node.classList.remove('flash'), 1800);
  }
  function gotoCreator(id) {
    state.filter = 'all'; state.query = '';
    if ($('creatorSearch')) $('creatorSearch').value = '';
    renderCreators();
    if (viewOf($('creatorGrid'))?.hidden) { navigate(`#creators?id=${encodeURIComponent(id)}`); return; } // 画面をまたぐ：先にビュー切替
    focusCard($(`creator-${id}`));
  }
  function gotoWork(id) {
    state.room = 'all'; renderWorks();
    if (viewOf($('workGrid'))?.hidden) { navigate(`#gallery?id=${encodeURIComponent(id)}`); return; }
    focusCard($(`work-${id}`));
  }
  /* ---------- ルーティング（入口はスクロール／展示室は画面切り替え） ---------- */
  const VIEWS = ['top', 'creators', 'gallery', 'join'];
  const VIEW_ALIAS = { about: 'top', tool: 'join' }; // 旧アンカーの後方互換：ビューに切り替えた上で該当セクションへスクロール
  const SWITCH_MS = 400;                              // body.is-switching を付ける時間（CSS の暗転アニメと合わせる）
  const router = { view: '', timer: 0 };
  function viewOf(node) { return node?.closest?.('.view') || null; }
  function parseHash(hash) {
    const raw = String(hash || '').replace(/^#/, '');
    const qIndex = raw.indexOf('?');
    const name = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
    const params = new URLSearchParams(qIndex >= 0 ? raw.slice(qIndex + 1) : '');
    const anchor = VIEW_ALIAS[name] ? name : '';
    const view = VIEWS.includes(name) ? name : (VIEW_ALIAS[name] || 'top');
    return { view, anchor, params };
  }
  function isRoutableHash(hash) { const name = String(hash || '').replace(/^#/, '').split('?')[0]; return VIEWS.includes(name) || Boolean(VIEW_ALIAS[name]); }
  function showView(name) {
    if (!VIEWS.includes(name)) name = 'top';
    const changed = router.view !== name;
    document.querySelectorAll('.view').forEach(node => { node.hidden = node.dataset.view !== name; });
    document.body.dataset.view = name;
    document.querySelectorAll('.nav-list a[href^="#"]').forEach(a => {
      if (parseHash(a.getAttribute('href')).view === name && !a.getAttribute('href').includes('?')) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    router.view = name;
    // メリーゴーランドは表示中のビューでだけ回す（hidden 中は innerWidth 依存の計算がずれる）
    if (name === 'creators') renderCarousel();
    else if (carousel.frame) { cancelAnimationFrame(carousel.frame); carousel.frame = 0; carousel.last = 0; }
    return changed;
  }
  function applyRoute() {
    const { view, anchor, params } = parseHash(location.hash);
    const changed = view !== router.view;
    const run = () => {
      showView(view);
      let target = null;
      if (view === 'gallery' && params.has('room')) {
        const button = $('galleryRooms')?.querySelector(`[data-room="${CSS.escape(params.get('room'))}"]`);
        if (button && !button.disabled) { state.room = button.dataset.room; renderWorks(); }
      }
      if (view === 'creators' && params.has('id')) {
        state.filter = 'all'; state.query = ''; if ($('creatorSearch')) $('creatorSearch').value = '';
        renderCreators(); target = $(`creator-${params.get('id')}`);
      } else if (view === 'gallery' && params.has('id')) {
        state.room = 'all'; renderWorks(); target = $(`work-${params.get('id')}`);
      }
      if (target) { requestAnimationFrame(() => focusCard(target)); return; }
      if (anchor && $(anchor)) { requestAnimationFrame(() => $(anchor).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })); return; }
      if (changed) window.scrollTo(0, 0);
    };
    if (!changed || reduced) { run(); return; }
    clearTimeout(router.timer);
    document.body.classList.remove('is-switching');
    void document.body.offsetWidth; // アニメを再始動させる
    document.body.classList.add('is-switching');
    setTimeout(run, SWITCH_MS * 0.4);  // 暗転が最も濃いタイミングで中身を差し替える
    router.timer = setTimeout(() => document.body.classList.remove('is-switching'), SWITCH_MS);
  }
  function navigate(hash) {
    if (location.hash !== hash) history.pushState(null, '', hash);
    applyRoute();
  }
  function bindRouter() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const href = a.getAttribute('href');
      if (!isRoutableHash(href)) return; // #main（スキップリンク）などは既定のジャンプに任せる
      e.preventDefault();
      navigate(href);
    });
    addEventListener('hashchange', applyRoute);
  }
  function mirrorCount() {
    const count = $('participantCount')?.textContent ?? '0', label = $('participantCountLabel')?.textContent ?? '';
    document.querySelectorAll('[data-count-mirror]').forEach(node => { node.textContent = count; });
    document.querySelectorAll('[data-count-label-mirror]').forEach(node => { node.textContent = label; });
  }

  function bindUi() {
    $('creatorFilter')?.addEventListener('click', e => { const b = e.target.closest('[data-filter]'); if (!b) return; state.filter = b.dataset.filter; renderCreators(); });
    $('creatorSearch')?.addEventListener('input', e => { state.query = e.target.value.trim(); renderCreators(); });
    $('creatorShuffle')?.addEventListener('click', () => { state.order = shuffle(state.order); renderCreators(); renderCarousel(); });
    $('galleryRooms')?.addEventListener('click', e => { const b = e.target.closest('[data-room]'); if (!b || b.disabled) return; state.room = b.dataset.room; renderWorks(); });
    document.addEventListener('click', e => {
      const tag = e.target.closest('[data-tag]');
      if (tag) { state.query = tag.dataset.tag; if ($('creatorSearch')) $('creatorSearch').value = state.query; renderCreators(); return; }
      const work = e.target.closest('[data-work-id]'); if (work) { gotoWork(work.dataset.workId); return; }
      const creator = e.target.closest('[data-creator-id]'); if (creator) gotoCreator(creator.dataset.creatorId);
    });
    $('carouselPrev')?.addEventListener('click', () => turnCarousel(-1));
    $('carouselNext')?.addEventListener('click', () => turnCarousel(1));
    $('carouselToggle')?.addEventListener('click', () => { carousel.playing = !carousel.playing; carousel.pauseUntil = 0; syncCarouselToggle(); });
    $('carouselSpeeds')?.addEventListener('click', e => { const b = e.target.closest('[data-speed]'); if (b && !b.disabled) setSpeed(Number(b.dataset.speed)); });
    $('carouselBrake')?.addEventListener('click', pressBrake);
    const stage = $('carouselRing')?.closest('.stage') || $('carousel');
    if (stage) {
      // 止めるのはカードの上にマウスがあるときだけ（床や余白の上では回り続ける）
      stage.addEventListener('pointerover', e => { carousel.hovering = e.pointerType === 'mouse' && Boolean(e.target.closest('.cc .face.front:not(:empty)')) && !e.target.closest('.cc.dummy'); });
      stage.addEventListener('mouseleave', () => { carousel.hovering = false; });
      stage.addEventListener('focusin', e => { carousel.focused = Boolean(e.target.closest('.cc')); });
      stage.addEventListener('focusout', () => { carousel.focused = false; });
      stage.addEventListener('pointerdown', e => { if (e.target.closest('button') && e.pointerType === 'mouse') return; carousel.dragging = true; carousel.moved = false; carousel.startX = e.clientX; carousel.startAngle = carousel.angle; stage.setPointerCapture?.(e.pointerId); });
      stage.addEventListener('pointermove', e => { if (!carousel.dragging) return; const delta = e.clientX - carousel.startX; if (Math.abs(delta) > 6) carousel.moved = true; carousel.angle = carousel.startAngle - delta * 0.35; paintCarousel(); });
      stage.addEventListener('pointerup', () => { carousel.dragging = false; pauseCarousel(); });
      stage.addEventListener('pointercancel', () => { carousel.dragging = false; pauseCarousel(); });
      stage.addEventListener('click', e => { if (carousel.moved) { e.stopPropagation(); carousel.moved = false; } }, true);
    }
    let resizeTimer;
    addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(renderCarousel, 200); });
  }
  async function loadCsv() {
    if (!window.Papa?.parse) throw new Error('Papa Parse を読み込めませんでした');
    const response = await fetch(`creators.csv?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`CSV HTTP ${response.status}`);
    const csv = await response.text();
    const parsed = window.Papa.parse(csv.replace(/^\uFEFF/, ''), { header: true, skipEmptyLines: 'greedy' });
    if (parsed.errors.length) throw new Error(`CSV構文エラー: ${parsed.errors[0].message}`);
    const fields = parsed.meta.fields || [];
    if (COLUMNS.some(column => !fields.includes(column))) throw new Error('CSVの必須ヘッダーがありません');
    return validateRows(parsed.data);
  }
  async function init() {
    showView(parseHash(location.hash).view); // 最初のフレームから正しいビューを出す（データ読込前）
    initEvent(); initOrganizer(); initTeam(); bindUi(); bindRouter();
    if (demoMode && $('demoNotice')) $('demoNotice').hidden = false;
    try { state.rows = demoMode ? demoRows() : await loadCsv(); state.order = shuffle(state.rows); }
    catch (error) { state.failed = true; console.error('creators.csv の取得・解析に失敗しました:', error); }
    replaceText('participantCount', String(state.rows.length));
    if (demoMode) replaceText('participantCountLabel', '人の仮クリエイターを表示中');
    mirrorCount();
    renderCreators(); renderWorks(); renderCarousel();
    // fx.js（おばけ配達便・Trick or Create）へ参加者データを渡す
    window.__halloweenRows = state.rows.slice();
    document.dispatchEvent(new CustomEvent('halloween:data', { detail: { rows: window.__halloweenRows } }));
    applyRoute(); // 初回ロード：?id= / ?room= / #about などを描画後に反映
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
