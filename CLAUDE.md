# GRAND HEIST — 開発メモ（Claude向け）

怪盗団テーマの協力ボードゲーム（ドラスレ系ルール）。1枚のHTMLで動くブラウザゲーム。2〜5人、オンライン（P2P）／1台プレイ／CPU。UIとコメントは日本語。

## ファイル構成（編集は src/ だけ。index.html と dist/ は生成物）
- `build.py` … `src/` を連結して `dist/heist.html`（Claudeのページ用）と `index.html`（GitHub Pages用）を作る。**連結順は `src/order.txt`**。全部が1つの `<script>` スコープ（"use strict"）で動くので、ファイル分割は見た目だけ。
- `src/head.html` / `body.html`（HUD・オーバーレイのDOM） / `tail.html`
- `src/css/` … 番号順に読み込み、後ろほど優先。スマホ用の上書きは `05-mobile` `07-mobile-dice` `08-mobile-menu` に集約（`@media (max-width:860px)`）
- `src/js/`
  - `00-core` … 乱数 `rng()/setSeed`、データ（`MAP` `JOBS` `QUESTS` `REWARDS` `VAULTS` `TRUMP` `COMBOS` `CONTRACTS` `ESC_CP`）、`newState()`、六角座標
  - `01-audio` 効果音 `SFX` とBGM / `02-fx` 2Dの演出
  - `03-world` … three.js の盤面、コマ、標的カード、カメラ（`focusOn` `camPan` `setCamFree`）、**軽量化（`mergeStatic`、画質 `QL`/`applyQuality`、`loop`）**
  - `04-dice` … 3Dダイス、`peakRoll`（判定）、`plainRoll`（移動）、`readyThrow`（タップで振る）、`holdResult`
  - `05-ui` … 描画まわり（`renderPanel`＝下の操作欄、`sheetHTML`、`renderCrew`、`modal`、`dealCard`、`banner`）、**本番の適性 `vApt`・錠前の性格 `LTRAIT`・`vOptions`**
  - `06-flow` … 手番の流れ（`beginTurn` `doRoll` `doAction` `challenge`）、本番（`enterFinal` `finalAttack` `unlock` `cpuFinal`）、`ceremony`
  - `07-extras` … 段取り、切り札、連携技、お宝、逃走（`escapePhase`）、警備隊ETA
  - `08-net` … オンライン、抽選演出（`vaultDraw` `contractDraw` `orderDraw`）、CPU AI（`cpuTurn` `smartAction`）
  - `09-title-boot` … 編成画面、ロビーUI、ルール本文（`rulesHTML`、`showRef`）、`startGame`、起動処理、日本語改行 `JB`、テスト用 `window.__K`

## 守るべき仕組み（壊すと同期ズレ）
- **ゲーム進行の乱数は必ず `rng()` / `d6()` / `shuffle` / `rpick`**。`Math.random` と `pick` は演出専用。
- オンラインは「全員が同じ種から同じゲームを再現する」方式。入力は `sendIn({k:...})` → ホストが番号を振って配信 → `execCmd`。新しい操作を足すときは `cmdOK`（検証）と `execCmd` の両方に追加する。
- 人の選択や「次へ」待ちは、必ず `askRaw(誰が決めるか, ui, 待ち表示)` / `askModal` を通す。`decides()`：手番の人、CPUや共通の画面はホスト。`askRaw` は呼ばれる順番（`S.aq`）で同期するので、**クライアントごとに呼んだり呼ばなかったりしてはいけない**（`__FAST` の早期returnでも呼ぶ）。
- 「自分の団員か」は `mine(ch)`（`!ch.cpu` ではない）。
- 本番の途中で手番をまたぐ待ちには `S.lockIn` を立てる（`pump` が入力を止める）。

## テスト（tools/、Playwright＋swiftshader。three.js は tools/vendor から配信）
- 先に `python3 build.py`。各スクリプトは `dist/heist.html` を読む（環境変数 `SRC` で差し替え可）。作業ディレクトリはスクラッチを使う（スクショが出る）。
- `tools/sim.py cpu4|h1|h4 NPT NR tag seed` → `sc_*.jsonl`、`tools/sim_report.py *.jsonl` で勝率を集計。1ゲーム約12秒（並列は2〜4本まで）。
  - バランスの目安（h1＝人1+CPU3相当）：全体勝率 約55%、下準備を終えた場合 約93%、強行突入 約34%
- `PJ=1 tools/net_test.py 人数 fast|slow 秒 [rc]` … 偽の接続サーバーと PeerJS モックでオンライン対戦。`final hashes` が全員一致・`desync 0` ならOK。`rc` で途中の再読み込みからの復帰も試す。
- `tools/mobile_audit.py 幅 高さ 名前` … スマホ幅で各画面のはみ出し検出とスクショ。
- `tools/perf.py` … 描画1回の時間と描画命令数（画質モード別）。
- `tools/bot.js` は自分の番を自動で進めるボット。`window.__DBG()` で状態を確認できる。

## 公開
- GitHub Pages: `python3 build.py` → `index.html` と `src/` を commit・push（このリポジトリの main）。URL: https://aklunite.github.io/grand-heist/
- Claudeのページ（アーティファクト）: `dist/heist.html` を同じ URL のアーティファクトに publish。
- Claudeのページ上では外部通信が遮断されるのでオンラインは使えない。オンラインは GitHub Pages 版で遊ぶ。
