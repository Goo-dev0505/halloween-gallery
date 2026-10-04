const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { httpsUrl, validDate, validateRows, carouselSlotCount, eventPresentation, demoRows, spinMessage, totalMessage } = require('../assets/app.js');

const now = Date.parse('2026-09-26T12:00:00+09:00');
const creator = {
  id: 'c001', name: 'テスト参加者', note_id: 'test-user', icon_url: '', catch: '<img src=x onerror=alert(1)>',
  entry_type: 'work', work_type: 'illust', article_url: 'https://note.com/test-user/n/test',
  article_title: 'テスト作品', thumb_url: 'https://example.org/thumb.png', intro_url: '', tags: '秋;夜', added_at: '2026-09-25'
};
const logger = { warnings: [], warn(message) { this.warnings.push(message); } };

test('公開CSVは所定のヘッダーを持つ', () => {
  const csv = fs.readFileSync(path.join(__dirname, '../creators.csv'), 'utf8');
  assert.equal(csv.split(/\r?\n/, 1)[0], 'id,name,note_id,icon_url,catch,entry_type,work_type,article_url,article_title,thumb_url,intro_url,tags,added_at');
});

test('有効な作品参加者と自己紹介参加者を受け入れる', () => {
  const intro = { ...creator, id:'c002', entry_type:'intro', work_type:'', article_url:'', article_title:'', thumb_url:'' };
  const rows = validateRows([creator, intro], now, logger);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].profile, 'https://note.com/test-user');
  assert.deepEqual(rows[0].tagList, ['秋', '夜']);
  assert.equal(rows[0].isNew, true);
});

test('重複ID・非HTTPS・未来日・不正列挙値を行単位で除外する', () => {
  logger.warnings = [];
  const rows = validateRows([
    creator,
    { ...creator, name: '重複' },
    { ...creator, id:'c003', thumb_url:'http://example.org/thumb.png' },
    { ...creator, id:'c004', added_at:'2026-09-27' },
    { ...creator, id:'c005', work_type:'unknown' }
  ], now, logger);
  assert.equal(rows.length, 1);
  assert.equal(logger.warnings.length, 4);
  assert.match(logger.warnings[0], /3行目.*重複/);
});

test('HTTPS URL の偽装と不正日付を拒否する', () => {
  assert.equal(httpsUrl('https://note.com.evil.example/n/a', 'note.com'), '');
  assert.equal(httpsUrl('javascript:alert(1)'), '');
  assert.equal(httpsUrl('https://user:pass@note.com/n/a', 'note.com'), '');
  assert.equal(validDate('2026-02-30', now), false);
  assert.equal(validDate('2026-09-27', now), false);
  assert.doesNotThrow(() => validDate('9999-99-99', now));
  assert.equal(validDate('9999-99-99', now), false);
  assert.equal(validateRows([{ ...creator, id:'c009', added_at:'9999-99-99' }], now, logger).length, 0);
});

test('開催状態に合わせ時計と案内文を切り替える', () => {
  const start = now + 1000;
  assert.deepEqual(eventPresentation('preview', start, now), { status:'開催前', clock:true, fallback:false, left:1000 });
  assert.equal(eventPresentation('preview', start, start).status, 'まもなく開幕');
  assert.equal(eventPresentation('preview', start, start).fallback, true);
  assert.equal(eventPresentation('preview', NaN, now).fallbackText, '開催日時を準備中です。');
  for (const phase of ['open', 'ended']) {
    assert.equal(eventPresentation(phase, start, now).clock, false);
    assert.equal(eventPresentation(phase, start, now).fallback, false);
  }
});

test('実参加者1〜5人は12枠、6人以上は実人数分を使う', () => {
  assert.equal(carouselSlotCount(0), 0);
  for (let count = 1; count <= 5; count++) assert.equal(carouselSlotCount(count), 12);
  assert.equal(carouselSlotCount(6), 6);
  assert.equal(carouselSlotCount(12), 12);
});

test('仮展示の作品画像はローカルにあり、架空の外部リンクを作らない', () => {
  const rows = demoRows();
  assert.equal(rows.length, 6);
  assert.equal(rows.filter(row => row.entry_type === 'work').length, 4);
  for (const row of rows) {
    assert.equal(row.demo, true);
    assert.equal(row.profile, '');
    assert.equal(row.article_url, '');
    if (row.thumb_url) assert.equal(fs.existsSync(path.join(__dirname, '..', row.thumb_url)), true);
  }
});

test('NEW は登録日と翌日の2日間だけ付く', () => {
  const at = iso => Date.parse(iso);
  const row = { ...creator, added_at: '2026-10-03' };
  assert.equal(validateRows([row], at('2026-10-03T08:00:00+09:00'), logger)[0].isNew, true);  // 登録日
  assert.equal(validateRows([row], at('2026-10-04T23:59:00+09:00'), logger)[0].isNew, true);  // 翌日の終わりまで
  assert.equal(validateRows([row], at('2026-10-05T00:00:00+09:00'), logger)[0].isNew, false); // 3日目には消える
});

test('メリーゴーランドのセリフは連続・回数の優先順で決まる', () => {
  assert.equal(spinMessage('A', 1, 1).level, 'first');
  assert.equal(spinMessage('A', 3, 3).level, 'streak');      // 3連続は回数より優先
  assert.equal(spinMessage('A', 5, 5).level, 'miracle');     // 5連続〜はありえんボケ
  assert.match(spinMessage('A', 10, 10).text, /宝くじ/);     // 10連続
  assert.match(spinMessage('A', 20, 1).text, /親戚/);        // 20回〜
  assert.equal(spinMessage('A', 12, 1).level, 'king');       // 10回〜は殿堂入り
});

test('通算ブレーキの節目だけツッコミが出る', () => {
  assert.equal(totalMessage(49), '');
  assert.match(totalMessage(50), /あほやろ/);
  assert.match(totalMessage(100), /住んでる/);
  assert.equal(totalMessage(150), '');
  assert.match(totalMessage(300), /運営より/);
});
