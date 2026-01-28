# X Bookmark Exporter

X（旧Twitter）のブックマークをCSV・Markdown形式でエクスポートするChrome拡張機能。

## 機能

- ブックマークの自動取得（自動スクロール）
- 取得範囲指定（全件 / 件数 / 期間）
- CSV形式でエクスポート
- Markdown形式でエクスポート
- 800件制限なし（X API不使用）

## インストール

### 開発版

```bash
# リポジトリをクローン
git clone https://github.com/CHIHI913/x-bookmark-exporter.git
cd x-bookmark-exporter

# 依存関係をインストール
npm install

# ビルド
npm run build
```

1. Chrome で `chrome://extensions` を開く
2. 「デベロッパーモード」を有効化
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `dist` フォルダを選択

## 使い方

1. X（https://x.com）にログイン
2. 拡張機能アイコンをクリック
3. 取得範囲を選択（全件 / 件数 / 期間）
4. 「ブックマークを取得」をクリック
5. 取得完了後、CSV または Markdown でエクスポート

## 技術スタック

- TypeScript
- Preact
- Vite + CRXJS
- Dexie (IndexedDB)
- Chrome Extension Manifest V3

## 仕組み

XのGraphQL API（`/graphql/.../Bookmarks`）のレスポンスをMAIN worldでfetchフックして傍受。
Content Scriptを経由してService Workerに転送し、IndexedDBに保存。

## ライセンス

MIT
