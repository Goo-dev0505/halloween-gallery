window.HALLOWEEN_CONFIG = {
  siteName: 'ハロウィンアート2026',
  // 見出しの行分け（任意）。指定がなければ siteName を1行で表示
  siteTitleLines: ['ハロウィンアート', '2026'],
  shortDescription: '作品を入口に、人へ会いにいく展示会。',
  phase: 'preview',
  demoMode: false,
  // 告知記事の「10/20〜31 展示」に合わせる。時刻は記事に記載がないため 0:00〜23:59 と仮置き
  eventStartAt: '2026-10-20T00:00:00+09:00',
  eventEndAt: '2026-10-31T23:59:00+09:00',
  organizerName: 'KITAcore',
  organizerProfileUrl: 'https://note.com/ktcrs1107',
  // 主催者の note アイコンを案内キャラとして使う
  organizerCharacterUrl: 'https://assets.st-note.com/production/uploads/images/229742136/75a87979bd25ec75d7a88eaf5feef751.png',
  // 告知記事（2026-09-29）本文からの抜粋。空行＝段落、改行＝行の区切り（文の切れ目で改行して読みやすくする）
  organizerStatement: `ハロウィンに関わる作品を持ち寄って、みんなで見せ合う。
そんな、ゆるいオンライン展示会をやります。

作品そのものは、みんなのnote記事。
展示サイトは、そこへ案内する入口や。

作品を見る。気になったら、その人のnoteへ飛ぶ。
プロフィールを見る。別の記事も読む。
できれば、ちょっと感想を残す。

作品を入口に、人へ会いにいく展示会。
今回やりたいのは、これや。

この企画は、上手い作品を選ぶための企画やない。
「誰が一番すごいか」を決める場所やなくて、
それぞれが作ったものを持ってきて、
「こんなん作ったで」って並べる場所。`,
  // 運営チーム：「この企画について」のメンバーカード、入口のクレジット行、フッターに表示
  // role は '主催' / '運営'。icon は任意（空なら 🎃）。HTTPS の画像URLか、assets/icons/ に置いた画像
  team: [
    { role: '主催', name: 'KITAcore', url: 'https://note.com/ktcrs1107', icon: 'https://assets.st-note.com/production/uploads/images/229742136/75a87979bd25ec75d7a88eaf5feef751.png' },
    { role: '運営', name: 'HONO', url: 'https://note.com/hospital_ph_hono', icon: 'assets/icons/hono-halloween.webp' },
    { role: '運営', name: '考える赤柴', url: 'https://note.com/eager_thyme9842', icon: 'assets/icons/akashiba-halloween.webp' },
    { role: '運営', name: 'はしゃも', url: 'https://note.com/hasyamo', icon: 'assets/icons/hasyamo-halloween.webp' }
  ],
  // 協賛：「この企画について」の協賛カード、入口のクレジット行、フッターに表示
  sponsors: [
    { role: '協賛', name: 'ChatGPTCreativeClub（CCC）', title: 'ChatGPTCreativeClub【共同マガジン】', url: 'https://note.com/nenkoro2/m/m38c6d06537bf', image: 'https://assets.st-note.com/production/uploads/images/271978075/293f6ccb3762be3fc835c5333ee9446b.png?width=432&dpr=2' }
  ],
  announcementUrl: 'https://note.com/ktcrs1107/n/n397fe2a90d5c',
  launchArticleUrl: 'https://note.com/ktcrs1107/n/n01b002ed9e6e',
  // 正式参加の受付期間（入口の「受付中」バッジはこの間だけ出る）
  entryPeriod: { start: '2026-10-01T00:00:00+09:00', end: '2026-10-06T23:59:00+09:00' },
  // 共通ハッシュタグ
  hashtag: '#ハロウィンアート2026',
  // 「参加します！」とコメントする3記事。url が空の間は「リンク準備中」と表示する
  entryArticles: [
    { name: 'KITAcore', url: 'https://note.com/ktcrs1107/n/n01b002ed9e6e' },
    { name: 'HONO', url: '' },
    { name: '考える赤柴', url: '' }
  ],
  magazineUrl: '',
  posterToolUrl: 'https://self-intro-sheet-builder-202609.pages.dev/',
  // 参加ページの「ツール」に並べる無料ツール。image は任意（HTTPS か assets/ の画像。なければ icon の絵文字）
  tools: [
    { icon: '🎃', name: 'ハロウィン仮装ポスターを作るツール', en: 'SELF-INTRO SHEET BUILDER', url: 'https://self-intro-sheet-builder-202609.pages.dev/',
      text: 'noteのURLを入れて仮装を選ぶと、あなたのnoteを紹介するハロウィン仮装ポスターの画像生成プロンプトができます。' },
    { icon: '🍄', name: 'キノコになりたいビルダー', en: 'KINOKO SPECIMEN BUILDER', url: 'https://kinoko-specimen-builder.pages.dev/', image: 'https://kinoko-specimen-builder.pages.dev/og-image.png',
      text: 'noteプロフィールとキャラ画像から、その人だけの人格キノコを描く画像生成プロンプトを組み立てます。キノコのままハロウィンしてもええ。' }
  ]
};
