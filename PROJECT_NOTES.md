# プロジェクトノート — 電工見積もりくん

最終更新: 2026-07-19

## プロジェクト概要

電気工事士のための、見積書・施工図・材料拾いをAIで一括作成する業務支援アプリ（旧名称: 見積もり作るくん）。Web版（Vite + React + TypeScript）とデスクトップ版（Electron / macOS）の両対応。図面（画像・PDF）にシンボルや配線をプロットし、数量を自動集計して見積書（PDF / Excel）を出力できる。

- **解決したい課題**: 見積作成の時間、数量拾いの手間、図面作成の手間、金額のバラつき、材料の拾い忘れ
- **想定ユーザー**: 一人親方、小規模電気工事店、リフォーム会社、設備会社、電気工事見習い
- **コンセプト**: 「電気工事士が現場に集中できるよう、事務作業をAIが代わりに行う。」
- 将来的にAI社員や他アプリとの連携を前提とした拡張しやすい設計を志向。構想機能と実装状況は [ROADMAP.md](./ROADMAP.md) を参照

---

## 技術スタック

| 領域 | 技術 |
|---|---|
| UI | React 19 + TypeScript 5.9 |
| ビルド | Vite 7（`tsc -b && vite build`） |
| デスクトップ | Electron 42 + electron-builder（dmg / zip、arm64） |
| PDF出力 | jsPDF + html2canvas |
| Excel出力 | ExcelJS + file-saver |
| PDF読込（図面） | pdfjs-dist |
| アイコン | lucide-react |
| 永続化 | localStorage（見積データ）+ IndexedDB（図面案件） |

## フォルダ構成

```
src/
  App.tsx                     ルート。画面遷移・状態管理・localStorage 永続化（508行）
  types.ts                    全型定義 + defaultItems（初期マスタ約80品目）
  main.tsx / index.css / App.css
  desktop.d.ts                window.mitsumoriDesktop の型宣言
  components/
    TopScreen.tsx             トップ画面
    InputScreen.tsx           見積項目入力（人工自動計算・顧客サジェスト含む）
    EstimateScreen.tsx        見積書/請求書プレビュー・PDF/Excel/材料表PDF出力
    DrawingPlotScreen.tsx     図面プロット・施工図作成（2785行、最大のコンポーネント）
    SavedEstimatesScreen.tsx  保存済み見積一覧
    ReferencePriceScreen.tsx  参考単価の編集
    CostPanel.tsx             原価管理パネル（材料原価・人件費・利益率のリアルタイム表示）
    CustomerScreen.tsx        顧客管理（登録・編集・削除・見積履歴・見積作成開始）
  utils/
    db.ts                     IndexedDB ラッパー（constructionDB）
    appRefresh.ts             デスクトップ版のアプリ更新処理
    laborCalc.ts              人工自動計算（品名・カテゴリ別の簡易歩掛テーブル）
electron/
  main.js                     メインプロセス。ウィンドウ生成・日本語メニュー・IPC
  preload.cjs                 contextBridge で reloadApp / updateApp を公開
```

## 画面遷移

`App.tsx` の `ScreenType` で管理する単純なステートマシン（ルーターなし）。

```
top ─┬─ input ─┬─ estimate（見積書/請求書/材料表 出力）
     │         ├─ ref_edit（参考単価編集）
     │         └─ plot
     ├─ plot（図面プロット）─→ input（数量反映）
     ├─ saved（保存済み一覧）─→ input（読込）
     └─ customers（顧客管理）─→ input（顧客情報を引き継いで見積作成）
```

### 2026-07-19 追加機能の要点

- **原価管理**: `CostPanel.tsx`。売価×原価率で材料原価・人件費を概算し粗利・利益率を表示。経費は実費扱い。原価率はlocalStorageに永続化
- **人工自動計算**: `utils/laborCalc.ts` の歩掛テーブル（品名キーワード→カテゴリ別デフォルトの順で判定）。合計は0.5人工単位で切り上げ、確認ダイアログで内訳を提示してから「人工費」項目へ反映
- **請求書出力**: `EstimateScreen` の `docType` 切替。タイトル・金額ラベル・備考・PDFファイル名が連動
- **材料表PDF**: 画面外にレンダリングした専用レイアウトを html2canvas でPDF化。電線・配管・配線器具・機器を品名+単位で集計
- **顧客管理**: `CustomerScreen.tsx` + `mitsumori-kun-customers`。見積保存時に `upsertCustomerFromInfo` で顧客名から自動登録し `info.customerId` で紐付け。履歴はcustomerId一致または顧客名一致で表示

## 主要な仕組み

### 認証
`.env` の `VITE_APP_PASSWORD` が設定されている場合のみパスワード画面を表示。認証状態は `sessionStorage`（キー `mitsumori-auth`）。未設定ならパススルー。

### データ永続化
localStorage キー一覧（プレフィックス `mitsumori-kun-`）:

| キー | 内容 |
|---|---|
| `items` | 見積項目（作業中） |
| `info` | 顧客情報 |
| `saved-list` | 保存済み見積の配列 |
| `ref-prices` | 編集した参考単価 |
| `custom-refs` | 自由入力項目の参考単価 |
| `copper-rate` / `copper-date` | 銅建値と更新日 |
| `sequence` | 見積番号の連番（`{year, count}`、`YYYY-NNN`形式で採番） |
| `last-project-id` | 図面案件の自動復元用ID |
| `customers` | 顧客マスタの配列（`Customer[]`） |
| `material-cost-rate` / `labor-cost-rate` | 原価管理パネルの材料原価率・人工原価率（%） |

図面案件（`ConstructionProject`）は容量が大きいため IndexedDB（DB名 `mitsumori_kun_db`、ストア `construction_projects`）に保存。起動時に `last-project-id` から自動復元する。

### 見積項目マスタ
`types.ts` の `defaultItems` に初期マスタを定義。カテゴリは6種: 電線・配管・配線器具・機器・人工・経費。`itemType` で動的項目を区別（`cv` / `cvt` / `slat` = サイズ・芯数から品名自動生成、`free` = 自由入力）。localStorage 復元時に新しいデフォルト項目を自動マージするため、マスタ追加はアップデートとして既存ユーザーにも反映される。

### 図面プロット（DrawingPlotScreen）
- 画像 / PDF（pdfjs-dist でページごとにレンダリング、複数ページ対応）を下絵として読み込み
- 数量モード: シンボル配置 → `applyPlotPlacements` で品目・数量を見積へ集計反映
- 施工図モード: 配線（VVF / CV 等の線種）、ボックス、消しゴム描画。縮尺（m/px）から配線長を計算し `applyConstructionWires` で見積へ反映
- ページごとの描画状態は `ConstructionPageState` で保持

### 見積書出力（EstimateScreen）
- PDF: html2canvas でプレビューDOMを画像化 → jsPDF に貼付
- Excel: ExcelJS で生成。出力先セルは冒頭の `EXCEL_CONFIG` で一括変更可能（ヘッダー B2〜B5、明細は10行目から A〜E列）

### デスクトップ版（Electron）
- `contextIsolation: true` / `nodeIntegration: false`。preload 経由で `window.mitsumoriDesktop`（`reloadApp` / `updateApp`）のみ公開
- `updateApp` は開発フォルダで `npm run build` を実行し最新版を再読込する仕組み（更新元パスは `electron/main.js` の `workspaceDir`、環境変数 `MITSUMORI_WORKSPACE_DIR` で上書き可）
- 開発時は `http://localhost:5173` をロード、本番はビルド済み `dist/index.html`

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | Web版開発サーバー（http://localhost:5173） |
| `npm run dev:desktop` | Vite + Electron を同時起動（ホットリロード） |
| `npm run build` | Web用ビルド → `dist/` |
| `npm run build:desktop` | Mac アプリビルド → `dist-desktop/`（dmg / zip / .app） |
| `npm run lint` | ESLint |

## 注意点・既知の前提

- `electron/main.js` の `workspaceDir` に開発マシン固有の絶対パスがハードコードされている（環境変数で上書き可能だが、他環境では要注意）
- データはすべてブラウザ（localStorage / IndexedDB）に保存されるため、キャッシュクリアで消える。バックアップ機構はない
- `package.json` の `version` は `0.0.0` のまま（ビルド成果物のファイル名に反映される）
- 銅建値（`copper-rate`）は手動更新。CV / CVT 系単価の参考情報として表示
- DrawingPlotScreen.tsx が2785行と肥大化しており、機能追加時は分割を検討したい
