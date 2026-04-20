---
name: start
description: yassh.github.io リポジトリで、ブラウザ完結の新しい小物ツールを作り始めるときに使う。`/start` と打たれたとき、または「○○を作りたい」「○○作って」のように新しいものを作り始めたい意図が示されたときに使用する。作業ブランチ作成と `src/{YYYYMM}-{slug}/` のスキャフォールド、`src/index.html` への一覧追加までを行う。
---

yassh.github.io リポジトリに、ブラウザで完結する新しい小物ツールの雛形を作るスキル。

## 前提

- 対象リポジトリ: `yassh.github.io`（静的サイト、Parcel ビルド）
- 新規ページは `src/{YYYYMM}-{slug}/` 配下に `index.html` / `index.css` / `index.ts` の3点セットで置く
- 既存一覧 `src/index.html` の `<ul>` にリンクを追加する
- サーバー不要・ブラウザ完結が前提

## 手順

### 1. JSTの年月を取得（必須）

毎回 Bashで確認する。訓練データの日付や `currentDate` コンテキストは**使わない**:

```sh
TZ=Asia/Tokyo date +%Y%m
```

この結果を `YYYYMM` として以降で使う。

### 2. 作りたいものを把握し、スラッグとタイトルを提案

ユーザーの説明から次を提案し、ユーザーに承認／修正してもらう:

- **スラッグ**: 英小文字 + ハイフン区切り（例: `color-picker`, `mossy-lobster`）
- **タイトル**: `<title>` および一覧リンクの表示テキストに使う名称
  - 既存ページは日本語・英語が混在している（`平成27年分以降の所得税の計算機`, `Markdown to HTML`, `URL-safe string compression` 等）ので、ユーザーの説明の言語に寄せる

提案形式の例:

> スラッグ: `color-picker`
> タイトル: `Color Picker`
> ディレクトリ: `src/{YYYYMM}-color-picker/`
> ブランチ: `feature/{YYYYMM}-color-picker`
> これで進めていい？

### 3. 作業ブランチの作成

作業ツリーと現在ブランチを確認する:

```sh
git status --short
git branch --show-current
```

クリーンでない、または `main` 以外なら、ユーザーに確認してから進める。OK なら:

```sh
git switch main
git pull --ff-only
git switch -c feature/{YYYYMM}-{slug}
```

### 4. ディレクトリと初期ファイルを作成

`src/{YYYYMM}-{slug}/` を作り、以下3ファイルを置く。

**`index.html`** (テンプレートは `src/202209-lz-string/index.html` 準拠):

```html
<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <link rel="stylesheet" href="./index.css" />
  </head>
  <body>
    <script type="module" src="./index.ts"></script>
  </body>
</html>
```

**`index.css`**: 空ファイル
**`index.ts`**: 空ファイル

### 5. `src/index.html` の一覧に追加

`</ul>` の直前に、末尾追加で:

```html
<li><a href="./{YYYYMM}-{slug}/">{title}</a></li>
```

タイトルが長くて1行に収まらない場合は、既存の以下のような書式に合わせて改行整形してもよい:

```html
<li>
  <a href="./{YYYYMM}-{slug}/"
    >{title}</a
  >
</li>
```

追加後、Prettier に適合していることを確認する:

```sh
npm run lint:html
```

### 6. 完了報告

ユーザーに以下を簡潔に報告する:

- 切ったブランチ名
- 作成したディレクトリ
- 新規／変更ファイル一覧
- 次のステップ（実装に取り掛かる or `npm run dev` で確認 など）

**コミットはしない**。コミットしたいときは `/commit-staged-changes` を使ってもらう。
