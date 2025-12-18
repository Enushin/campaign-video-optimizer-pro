# Campaign Video Optimizer Pro

スマートフォン広告キャンペーン入稿用に特化した、ブラウザ完結型の動画一括最適化ツールです。

## Quick Start

### 動作環境

| 項目     | 要件                                            |
| -------- | ----------------------------------------------- |
| Node.js  | v18.0.0 以上                                    |
| npm      | v8.0.0 以上（Node.js に付属）                   |
| ブラウザ | Chrome 89+, Firefox 89+, Safari 15.2+, Edge 89+ |

### インストール & 起動

```bash
# リポジトリをクローン
git clone https://github.com/Enushin/campaign-video-optimizer-pro.git
cd campaign-video-optimizer-pro

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000/ を開けば使用開始できます。

### 本番ビルド

```bash
# ビルド
npm run build

# ビルド後のプレビュー
npm run preview
```

`dist/` フォルダに静的ファイルが生成されます。

---

## 使い方

### 基本フロー

```
1. 動画をアップロード
     ↓
2. 設定を調整（任意）
     ↓
3. 「圧縮を開始」をクリック
     ↓
4. プレビューで確認（任意）
     ↓
5. ZIPでダウンロード
```

### 対応フォーマット

MP4, MOV, AVI, M4V（複数ファイル一括アップロード可）

### 最適化設定

| 設定項目       | デフォルト | 説明                           |
| -------------- | ---------- | ------------------------------ |
| 目標サイズ     | 1.5 MB     | 圧縮後の目標ファイルサイズ     |
| 絶対上限       | 2.0 MB     | これを超えると自動再圧縮       |
| 横幅基準       | 720 px     | 動画の横幅（アスペクト比維持） |
| 音声           | 128 kbps   | 音声ビットレート               |
| サムネイル横幅 | 1000 px    | 抽出画像の横幅                 |

### 出力構造

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

## 機能一覧

- **FFmpeg.wasm 統合** - 外部サーバーを介さず、ブラウザ内で動画の再エンコードと画像抽出を実行
- **1MB(1.5MB可変)厳守ロジック** - 動画の長さから目標ビットレートを動的に計算し、容量制限内に収める
- **サイズ超過時の自動再試行** - エンコード後のファイルサイズが上限を超えた場合、ビットレートを自動で30%下げて再エンコード
- **3点サムネイル抽出** - 動画の開始(10%)、中間(50%)、終盤(85%)から自動で画像を切り出し
- **スマート黒コマ回避** - Canvas APIによるピクセル解析で「黒くないフレーム」を自動検知してサムネイルを抽出
- **スマホ最適化** - 横幅720px固定（アスペクト比維持）のリサイズ機能を搭載
- **ZIP一括書き出し** - 最適化された動画とサムネイル画像をフォルダ構造を維持したままパッケージング
- **詳細プレビュー** - 圧縮後の動画をダウンロード前にブラウザ上で確認できるビデオプレイヤー機能

---

## 本番デプロイ

### 必須: COOP/COEP ヘッダー設定

ホスティングサービスで以下のHTTPレスポンスヘッダーを設定してください：

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### 設定例

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

**Cloudflare Pages** (`_headers`):

```
/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
```

---

## トラブルシューティング

| 問題                         | 原因                                            | 解決策                                           |
| ---------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| エンジンの読み込みに失敗する | ネットワーク制限、またはCOOP/COEPヘッダー未設定 | ネットワーク接続を確認、本番環境はヘッダーを設定 |
| 処理が非常に遅い             | 長尺動画、高解像度動画、または端末スペック      | 短い動画で試す、他のタブを閉じる                 |
| サムネイルが黒い             | 黒コマ回避機能が動作しなかった可能性            | 「開始オフセット」の値を調整                     |
| ZIPダウンロードができない    | ブラウザのポップアップブロッカー                | ポップアップを許可、または個別ダウンロードを使用 |

---

## 技術仕様

### 使用技術

| 技術                | 用途                           |
| ------------------- | ------------------------------ |
| FFmpeg.wasm 0.12.10 | 動画エンコード・サムネイル抽出 |
| React 19            | UI                             |
| Vite 6              | ビルドツール                   |
| Tailwind CSS 4      | スタイリング                   |
| JSZip               | ZIP生成                        |
| Canvas API          | フレーム解析（黒コマ検知）     |

### 外部通信

- **unpkg.com** - FFmpeg.wasmコアファイルのロード
- **fonts.googleapis.com** - Webフォント
- **cdn.tailwindcss.com** - Tailwind CSS

**外部APIは一切使用しません。全ての動画処理はブラウザ内で完結します。**

### 技術的制限事項

1. **Cross-Origin Isolation (COOP/COEP)** - 本番環境デプロイ時は、ホスティング先でヘッダー設定が必要
2. **エンコード負荷** - 長尺の動画や高解像度の動画は、ブラウザのCPUリソースを非常に多く消費
3. **Worker Origin 制約** - ESM形式のWorkerロードがオリジン制約によりブロックされるため、UMD形式の読み込み + 全コアファイルのBlob URL化で回避

---

## 今後の改善予定

- [ ] **GPU加速** - WebGPU等を利用した高速なデコード・エンコードの検討
- [ ] **サーバーサイドフォールバック** - ユーザー端末のスペックが低い場合に、クラウド側で処理を代行するハイブリッド構成

---

## ライセンス

MIT License
