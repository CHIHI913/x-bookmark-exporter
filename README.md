# X Bookmark Exporter

X（旧Twitter）のブックマークをCSV・Markdown形式でエクスポートするChrome拡張機能。

## 機能

- ブックマークページ閲覧時に自動でデータを取得
- 取得範囲指定（全件 / 件数 / 期間）
- CSVエクスポート（ファイルダウンロード）
- Markdownエクスポート（クリップボードコピー）
- 800件制限なし（X API不使用）

## インストール

```bash
git clone https://github.com/CHIHI913/x-bookmark-exporter.git
cd x-bookmark-exporter
npm install
npm run build
```

1. Chrome で `chrome://extensions` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `dist` フォルダを選択

## 使い方

1. X（https://x.com）にログイン
2. ブックマークページ（https://x.com/i/bookmarks）を開く
3. ページをスクロールしてブックマークを読み込む（自動で取得される）
4. 拡張機能アイコンをクリック
5. 取得範囲を選択してエクスポート
   - **CSV**: ファイルとしてダウンロード
   - **Markdown**: クリップボードにコピー

## 取得データ

| 項目 | 説明 |
|------|------|
| id | ポストID |
| text | ポスト本文 |
| createdAt | 投稿日時 |
| username | ユーザー名（@なし） |
| displayName | 表示名 |
| url | ポストURL |
| quotedUrl | 引用元URL |
| metrics | いいね数、リポスト数、リプライ数、ブックマーク数、閲覧数 |
| media | 画像・動画URL |

## 技術スタック

- TypeScript
- Preact
- Vite + CRXJS
- Chrome Extension Manifest V3

## 仕組み

```
┌─────────────────────────────────────────────────────────┐
│  x.com/i/bookmarks                                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │  MAIN World (injected/main.js)                    │  │
│  │  - fetch/XHR フック                               │  │
│  │  - GraphQL API レスポンス傍受                     │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │ window.postMessage                │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Content Script                                   │  │
│  │  - メッセージ中継                                 │  │
│  └──────────────────┬────────────────────────────────┘  │
│                     │ chrome.runtime.sendMessage        │
│  ┌──────────────────▼────────────────────────────────┐  │
│  │  Service Worker                                   │  │
│  │  - インメモリストア（重複排除）                   │  │
│  │  - エクスポート処理                               │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## ライセンス

MIT
