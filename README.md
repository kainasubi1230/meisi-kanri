# 名刺電子化アプリ

名刺画像をアップロードし、Gemini で情報抽出して `Vercel Postgres + Prisma` に保存・検索する MVP です。

## 技術スタック

- Next.js (App Router)
- Prisma
- Vercel Postgres
- Gemini API

## セットアップ

1. 依存関係をインストール

```bash
npm install
```

2. 環境変数を作成

`.env.example` を `.env` にコピーして設定:

```bash
POSTGRES_PRISMA_URL="prisma://..."
POSTGRES_URL_NON_POOLING="postgres://..."
GEMINI_API_KEY="..."
GEMINI_MODEL="gemini-2.5-flash"
```

3. Prisma Client 生成 + マイグレーション

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

4. 開発サーバー起動

```bash
npm run dev
```

## 主要ルート

- `/` 名刺アップロード + AI抽出 + 保存
- `/cards` 保存済み名刺の一覧・検索
- `POST /api/extract-business-card` 名刺画像からAI抽出
- `GET /api/cards` 名刺一覧取得 (`q` で検索)
- `POST /api/cards` 名刺保存

## 認証について

現状は `demo-user` 固定で保存しています。Auth.js を導入したら `userId` をログインユーザーIDへ差し替えてください。
