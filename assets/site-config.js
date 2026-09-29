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
  // role は '主催' / '運営'。icon は任意（空なら 🎃）
  team: [
    { role: '主催', name: 'KITAcore', url: 'https://note.com/ktcrs1107', icon: 'https://assets.st-note.com/production/uploads/images/229742136/75a87979bd25ec75d7a88eaf5feef751.png' },
    { role: '運営', name: 'HONO', url: 'https://note.com/hospital_ph_hono', icon: 'https://assets.st-note.com/production/uploads/images/272512361/f7a70e3dee212ae80053ec5c58781d53.png' },
    { role: '運営', name: '考える赤柴', url: 'https://note.com/eager_thyme9842', icon: 'https://assets.st-note.com/production/uploads/images/287811001/profile_61bd215e791f673065ace52a3d904ebb.png?fit=bounds&format=jpeg&quality=85&width=330' },
    { role: '運営', name: 'はしゃも', url: 'https://note.com/hasyamo', icon: 'https://assets.st-note.com/production/uploads/images/293589917/6c9d4c9e754e63c7ce41a77331ff15a2.png' }
  ],
  // 協賛：「この企画について」の協賛カード、入口のクレジット行、フッターに表示
  sponsors: [
    { role: '協賛', name: 'ChatGPTCreativeClub（CCC）', title: 'ChatGPTCreativeClub【共同マガジン】', url: 'https://note.com/nenkoro2/m/m38c6d06537bf', image: 'https://assets.st-note.com/production/uploads/images/271978075/293f6ccb3762be3fc835c5333ee9446b.png?width=432&dpr=2' }
  ],
  announcementUrl: 'https://note.com/ktcrs1107/n/n397fe2a90d5c',
  launchArticleUrl: '',
  magazineUrl: '',
  posterToolUrl: ''
};
