/* ==========================================================================
   テーマ曲
   - site-config.js の themeSong から、入口の「テーマ曲」ブロックを描く。
   - はじめはサムネイル画像だけを額縁に飾り、押したときに初めてYouTubeを読み込む
     （来ただけの人の情報をYouTubeに送らない／ページを重くしない）。
   - 埋め込みはプライバシー強化モード（youtube-nocookie.com）。
   - ブラウザは音の自動再生を止めるので、「押したら再生」が前提。
   ========================================================================== */
(() => {
  'use strict';
  const song = (window.HALLOWEEN_CONFIG || {}).themeSong || {};
  // YouTubeの動画IDは英数字・-・_ の11文字。それ以外は使わない
  const id = /^[\w-]{11}$/.test(String(song.youtubeId || '')) ? song.youtubeId : '';

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function play(frame) {
    const iframe = el('iframe', 'song-iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
    iframe.title = `テーマ曲「${song.title || ''}」（YouTube）`;
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.replaceWith(iframe);
    iframe.focus();
  }

  function render() {
    const section = document.getElementById('song');
    const stage = document.getElementById('songStage');
    if (!section || !stage) return;
    if (!id) { section.hidden = true; return; }
    section.hidden = false;
    const intro = document.getElementById('songIntro');
    if (intro) intro.textContent = song.note || '';

    const fig = el('figure', 'song-exhibit');
    const screen = el('div', 'song-screen');
    const frame = el('button', 'song-frame');
    frame.type = 'button';
    frame.setAttribute('aria-label', `テーマ曲「${song.title || ''}」を再生する（YouTubeを読み込みます）`);
    const thumb = el('img', 'song-thumb');
    thumb.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    thumb.alt = ''; thumb.loading = 'lazy'; thumb.decoding = 'async';
    // サムネイルが読めなくても、再生ボタンだけは出しておく
    thumb.addEventListener('error', () => thumb.remove(), { once: true });
    const btn = el('span', 'song-play'); btn.setAttribute('aria-hidden', 'true');
    frame.append(thumb, btn, el('span', 'song-hint', '▶ 押すと再生'));
    frame.addEventListener('click', () => play(frame), { once: true });
    screen.append(frame);

    const cap = el('figcaption', 'song-cap');
    cap.append(el('span', 'song-title', song.title || ''));
    if (song.by) cap.append(el('span', 'song-by', song.by));
    const link = el('a', 'song-link', 'YouTubeで見る');
    link.href = `https://www.youtube.com/watch?v=${id}`; link.target = '_blank'; link.rel = 'noopener';
    cap.append(link);
    fig.append(screen, cap);
    stage.replaceChildren(fig);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render, { once: true });
  else render();
})();
