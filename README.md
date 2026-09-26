# ハロウィン展示企画 特設サイト

note クリエイター参加型のハロウィン展示サイト。作品の本文・動画は note に置き、このサイトはクリエイターと作品への案内所として機能します。

**状態:** ローカル制作版。企画名、主催者素材、開催日時、記事・マガジン・ツール URL は未確定です。公開前に [SPEC.md](./SPEC.md) の未決事項を確認してください。

現在は `assets/site-config.js` の `demoMode: true` で、架空のクリエイター6人と作品4点を表示します。ブラウザで `index.html` を直接開いてもデモ表示できます。デモのカウントダウンはページを開いた時点から7日で、実際の開催日ではありません。公開前に `demoMode: false` にし、承認済みの実参加者を `creators.csv` に入れてください。

## 構成

```text
index.html                 1ページの画面
assets/style.css           見た目・演出
assets/site-config.js      企画の固定情報と公開状態
assets/app.js              CSV読込・描画・操作
assets/placeholder.png     画像欠損時の代替
assets/ogp.png             仮のSNS共有画像
creators.csv               公開用の参加者情報
_headers                   Cloudflare Pages のキャッシュ設定
SPEC.md                    要求仕様の草案
```

ビルド工程はありません。仮展示は `file://` で直接開けます。`demoMode: false` にして実データの CSV を確認する際は、`fetch` が動く静的サーバーでリポジトリのルートを配信してください。

## 最初に設定するもの

`assets/site-config.js` の `window.HALLOWEEN_CONFIG` を編集します。

- `siteName`、`shortDescription`: 正式な企画名と短い紹介。
- `phase`: `preview`（予告版）、`open`（開催版）、`ended`（終了後）。公開切替は手動です。
- `demoMode`: デザイン確認中は `true`。実データ確認と公開前には `false`。仮展示では note への架空リンクを作りません。
- `eventStartAt`、`eventEndAt`: 日時をタイムゾーン付き ISO 8601 形式で記入します。例の形式は `2026-10-10T10:00:00+09:00`。**例の日時をそのまま使わないでください。**
- `organizerName`、`organizerProfileUrl`、`organizerCharacterUrl`、`organizerStatement`: 主催者が確認した正式な名前・プロフィール・キャラ画像・企画趣旨の原文。
- `announcementUrl`、`launchArticleUrl`、`magazineUrl`、`posterToolUrl`: 公開済みの正式 URL。未公開なら空のままにし、画面上は準備中表示にします。

HTML の `<title>`、OGP/Twitter メタ情報、`assets/ogp.png` も正式内容へ差し替えます。OGP の画像 URL は本番ドメインが決まってから絶対 URL を設定してください。仮画像には「正式素材へ差し替え予定」と書かれているため、本番公開前に必ず確認します。

## 参加者を追加する

`creators.csv` は UTF-8・BOMなし・ヘッダーありです。**1行に1人、代表作品は1点**です。公開用 CSV は現在ヘッダーのみで、試作の架空参加者は入れていません。

列の順番と意味は [SPEC.md の第5章](./SPEC.md) を参照してください。作品ありなら `entry_type=work` とし、`work_type`（`illust` / `video` / `poster`）、`article_url`、`article_title`、`thumb_url` を記入します。自己紹介のみなら `entry_type=intro` とし、作品列を空にします。`intro_url` はどちらの形態でも任意です。タグは `;` 区切りです。

1. 主催者が参加申請と note 記事 URL を確認します。
2. 参加者の掲載了承を確認し、`creators.csv` に1行追加します。ID は既存と重複しない `c001` 形式、日付は `YYYY-MM-DD` です。
3. カンマや改行を含む文字は CSV の規則に従ってダブルクォートで囲みます。コピーした URL は HTTPS で始まることを確認します。
4. ローカル・プレビューでカード、作品、リンク、画像を確認してから公開します。

### よくある問題

| 状態 | 確認すること |
| --- | --- |
| 追加した人が表示されない | ID重複、必須列、`entry_type`、`work_type`、日付、URLを確認する。ブラウザの開発者コンソールに行番号付きの警告が出る |
| 「展示を準備中」と出る | `creators.csv` をサーバーから取得できるか、Papa Parse が読み込めるか確認する |
| 画像が代替画像になる | note の画像 URL が有効か確認する。note 側の画像 URL は変わる場合がある |
| 美術館に作品がない | `entry_type=work` の有効行があるか、部屋タブの選択を確認する |
| 更新が反映されない | デプロイ状態、CSV の応答、ブラウザ再読み込みを確認する |

掲載取り下げ依頼があれば該当行を削除し、公開後に非表示を確認します。削除する前に運用担当と記録方法を決めてください。月1回を目安に記事・アイコン・サムネのリンクを確認します。

## 公開前の確認

- 主催者の正式名・キャラ画像の掲載範囲・企画趣旨の原文を確認。
- 予告版を先行公開するか、開始記事と同時公開するか決定。カウントダウンを一般閲覧者に見せるには先行公開が必要。
- 開始・終了日時、終了後の閲覧方針、CSV 更新担当を決定。
- 仮の企画名・仮OGP・準備中文・未確定リンク・デモ機能・架空参加者が本番にないことを確認。
- スマホ幅、キーボード、動きを減らす設定、実記事へのリンクを確認。

Cloudflare Pages は GitHub 連携・Framework preset `None`・ビルドコマンド空欄・リポジトリルート配信を想定しています。`main` への push は自動公開につながるため、プレビューと公開内容の確認後に行います。
