# Campaign Video Optimizer Pro - セットアップガイド

## 動作環境

### 必須要件

| 項目     | 要件                                            |
| -------- | ----------------------------------------------- |
| Node.js  | v18.0.0 以上                                    |
| npm      | v8.0.0 以上（Node.js に付属）                   |
| ブラウザ | Chrome 89+, Firefox 89+, Safari 15.2+, Edge 89+ |

### ブラウザ要件（詳細）

このツールは以下のWeb APIを使用します：

- **SharedArrayBuffer** - FFmpegマルチスレッド処理に必要
- **Web Workers** - バックグラウンド処理
- **Canvas API** - 黒コマ検知のフレーム解析
- **WebAssembly** - FFmpeg.wasm実行

> 全てモダンブラウザで標準サポートされています。Internet Explorerは非対応です。

---

## クイックスタート

### 1. リポジトリをクローン（または展開）

```bash
cd /path/to/campaign-video-optimizer-pro
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. 開発サーバーを起動

```bash
npm run dev
```

### 4. ブラウザでアクセス

```
http://localhost:3000
```

---

## 使い方

### 基本的な流れ

```
1. 動画をアップロード
     ↓
2. 設定を調整（任意）
     ↓
3. 「実圧縮プロセスを開始」をクリック
     ↓
4. プレビューで確認（任意）
     ↓
5. ZIPでダウンロード
```

### Step 1: 動画をアップロード

- ドラッグ＆ドロップ、またはクリックしてファイル選択
- 対応フォーマット: **MP4, MOV, AVI, M4V**
- 複数ファイルの一括アップロード可能

### Step 2: 最適化設定（任意）

| 設定項目       | デフォルト | 説明                           |
| -------------- | ---------- | ------------------------------ |
| 目標サイズ     | 1.5 MB     | 圧縮後の目標ファイルサイズ     |
| 絶対上限       | 2.0 MB     | これを超えると自動再圧縮       |
| 横幅基準       | 720 px     | 動画の横幅（アスペクト比維持） |
| 音声           | 128 kbps   | 音声ビットレート               |
| サムネイル横幅 | 1000 px    | 抽出画像の横幅                 |

### Step 3: 圧縮を実行

「実圧縮プロセスを開始」ボタンをクリック

- 処理中はプログレスバーで進捗表示
- 処理中はタブを閉じないでください

### Step 4: プレビュー確認（任意）

- 各動画の「プレビュー」ボタンで圧縮後の動画を確認
- Space キーで再生/停止
- Esc キーで閉じる

### Step 5: ダウンロード

- **個別**: 各動画の「動画を保存」ボタン
- **一括**: 「全ファイルをZIPで保存」ボタン

ZIPの構造:

```
campaign_assets_TIMESTAMP.zip
├── video1/
│   ├── video1_opt.mp4
│   └── thumbnails/
│       ├── video1_thumb_01.jpg
│       ├── video1_thumb_02.jpg
│       └── video1_thumb_03.jpg
├── video2/
│   └── ...
```

---

## 本番ビルド

### ビルドコマンド

```bash
npm run build
```

`dist/` フォルダに静的ファイルが生成されます。

### ビルド後のプレビュー

```bash
npm run preview
```

### 本番デプロイ時の注意

**COOP/COEPヘッダーの設定が必須です。**

ホスティングサービスで以下のHTTPレスポンスヘッダーを設定してください：

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

#### 各サービスでの設定例

**Vercel** (`vercel.json`):

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

**Netlify** (`_headers`):

```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

**Cloudflare Pages** (Functions または \_headers):

```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

---

## トラブルシューティング

### エンジンの読み込みに失敗する

**原因**: ネットワーク制限、またはCOOP/COEPヘッダー未設定

**解決策**:

1. ネットワーク接続を確認
2. ブラウザのコンソールでエラーを確認
3. 本番環境の場合はCOOP/COEPヘッダーを設定

### 処理が非常に遅い

**原因**: 長尺動画、高解像度動画、または端末スペック

**解決策**:

1. 短い動画で試す
2. 他のタブを閉じてブラウザのリソースを確保
3. ブラウザを再起動

### サムネイルが黒い

**原因**: 黒コマ回避機能が動作しなかった可能性

**解決策**:

1. 「開始オフセット」の値を調整（例: 2.0秒）
2. 元動画の冒頭に長い黒フレームがある場合は手動調整が必要

### ZIPダウンロードができない

**原因**: ブラウザのポップアップブロッカー

**解決策**:

1. ポップアップを許可
2. 個別ダウンロードを使用

---

## 技術仕様

### 使用技術

| 技術                | 用途                           |
| ------------------- | ------------------------------ |
| FFmpeg.wasm 0.12.10 | 動画エンコード・サムネイル抽出 |
| React 19            | UI                             |
| Vite 6              | ビルドツール                   |
| Tailwind CSS        | スタイリング                   |
| JSZip               | ZIP生成                        |
| Canvas API          | フレーム解析（黒コマ検知）     |

### 外部通信

- **unpkg.com**: FFmpeg.wasmコアファイルのロード
- **fonts.googleapis.com**: Webフォント
- **cdn.tailwindcss.com**: Tailwind CSS

**外部APIは一切使用しません。全ての動画処理はブラウザ内で完結します。**

---

## ライセンス

MIT License
