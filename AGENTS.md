# yassh.github.io

## 言語

**JavaScript のみ**。TypeScript は使わない。

## 外部ライブラリ

`package.json` の `dependencies` は使わない方針。外部ライブラリは `import` で CDN URL を直接指定する:

```js
import { marked } from "https://esm.sh/marked@18.0.2"
import * as THREE from "https://esm.sh/three@0.150.1"
```

- バージョンは URL にピン留めする
- ページごとに別バージョンを使ってよい（URL が違えば別モジュール扱い）
