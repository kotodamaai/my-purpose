# KOTONE 現状同期資料（チャット側との認識合わせ用）

Claude Code 側で現物コードを検証した結果。チャット側（ルミナ・レイ）の認識を
最新の本番コードに合わせるための資料。

対象コミット：`c29c189`（main の最新）

---

## 1. 結論：齟齬があります

`KOTONE_intersection統一化_実装指示書.md` が前提としている
「個人内intersection（言霊L2×数秘L2）が本番で稼働している」という認識は、
**現物と一致しません。**

| 指示書の前提 | 現物 |
|---|---|
| 個人内intersectionが稼働中 | **本番に存在しない**（0件） |
| `relation` に `"包含"` / `"動的×静的"` を格納している | 本番に `relation` は存在しない |
| `auxiliary: { kotodama_only, numerology_only }` がある | 本番に存在しない |
| 「既存のL3生成ロジック・プロンプト側への影響をゼロに」 | テンプレートL3は**本番で使っていない**（AI生成に置換済み） |

`kotone-app/src/` 全体を grep した結果：

```
intersection / relation / complex_type / auxiliary / conflict / 包含 / 動的
→ 0 件
```

---

## 2. 齟齬の正体：認識が「旧プロトタイプ」を指しています

指示書が描写している構造は、リポジトリ直下の
`kotone_simulator_v*.html`（旧HTMLプロトタイプ）の `buildIntersection()` と
**完全に一致します**。つまり、本番ではなくプロトタイプを見て書かれています。

### さらに重要：プロトタイプでも intersection は死んだコードです

`buildIntersection` / `renderIntersection` は **v0_7 以降どこからも呼ばれていません**。
定義だけが残った残骸です。実際に動いているのは `adjustWithNumerology` です。

```
v0_4_1 〜 v0_6   intersection方式（言霊L2 × 数秘L2 を交差判定）… 実際に稼働
       ↓ 設計転換（数秘は「交差する相手」ではなく「条件層」へ）
v0_7 〜 v1_1     adjust方式が稼働。intersection は呼ばれない残骸に
       ↓ React移植時に残骸は持ち込まず
kotone-app       adjust方式のみ。intersection のコードは一行も存在しない
```

**つまり intersection は「これから統一する現役ロジック」ではなく、
2世代前に設計判断で捨てられた方式です。**

### 認識のズレが起きた理由（推測）

同じ時期にチャット側から届いた 2 つの資料で、精度が食い違っています。

| 資料 | 本番の記述 | 推測される情報源 |
|---|---|---|
| `kotone_fix_direction_v1` の README | **正確**。「旧シミュレータは本番と別ファイルで、本番からは呼ばれていない」と明記。未使用フィールドをgrepで確認済みとも記載 | 実ソースを持っていた |
| `intersection統一化_実装指示書` | 不正確。intersectionを現役として記述 | 設計文書＋過去セッションの記憶 |

指示書自身も末尾で `以前の記録によれば` `過去のセッションで言及されている` `未確認` と
断っており、**記憶ベースで書かれたことを自己申告しています**。その注意書きは正しく、
現物確認の指示も適切でした。

---

## 3. 本番（kotone-app）の実態

### ファイル構成と責務

```
kotone-app/src/
├── data/
│   ├── L1_dictionary.js   KOTODAMA_L1(46音) / DAKUON_MAP /
│   │                      SURNAME_INTERFACE(5軸・v0.2で15音追加、要検証) / SOUND_MATERIAL
│   ├── numerology.js      NUMEROLOGY_L1(metaのみ) / NUMEROLOGY_ADJUST / NUMEROLOGY_L3(★未使用)
│   ├── prompts.js         PROXY_URL / CONFIDENTIAL_RULE / buildPromptInput / buildSectionPrompts
│   ├── version.js         ★新規。辞書・エンジン・プロンプトのバージョン刻印
│   └── selfReport.js      ★新規。自己申告スケール7項目
├── utils/
│   ├── kotodamaEngine.js  decomposeSounds / getKotodamaL1 / buildL2WithTags /
│   │                      getSurnameInterface / adjustWithNumerology /
│   │                      computeNameSurnameInteraction / transformWithSurname /
│   │                      DOMINANCE_MARGIN_THRESHOLD
│   ├── numerologyEngine.js computeDay / computeMonth / computeFullSum /
│   │                      getNumerologyL1 / getNumerologyAdjustment
│   └── aiGenerator.js     callProxy / generateAllSections（Haiku→Sonnetフォールバック＋selfCheck）
└── components/            TopScreen / InputForm / ResultScreen
```

`App.jsx` は `top` → `input` → `result` の3画面のみ。**相性診断の画面もコードも存在しません。**

### 処理フロー（本番で実際に動いている経路）

```
名 → getKotodamaL1 → buildL2WithTags ─┐
                                      ├→ adjustWithNumerology → transformWithSurname
生年月日 → getNumerologyL1 → getNumerologyAdjustment ─┘          ↑
                                                          姓 → getSurnameInterface
                                                                    ↓
                                    buildPromptInput → buildSectionPrompts
                                                                    ↓
                                    generateAllSections（6セクションをAI生成）
```

**数秘は「言霊と交差する対等な相手」ではなく、
言霊のmotion順序・強度・持続・タイミングを補正する条件層**として実装されています。

### `adjustedState` の実際の形（実行結果・「みき」1971-11-05）

相性診断がAdjust後の内部状態を使う方針なら、これがそのまま入力になります。

```json
{
  "process": ["保持", "収束", "切断"],
  "direction": "外向",
  "direction_distribution": { "外向": 1, "内向": 0, "双方向": 0, "中立": 0 },
  "derived": {
    "dominant_direction": "外向",
    "dominant_margin": 1,
    "complex_flag": false,
    "complex_pair": null,
    "confidence": 0.667
  },
  "modifier": [],
  "tags": [],
  "adjustments": {
    "weight": 3,
    "priority": ["拡散", "接続"],
    "persistence": -1,
    "timing": ["cyclic", "immediate"]
  }
}
```

`transformWithSurname` を通すと、これに `surfaceInterface`（姓の5軸ラベル）と
`interaction`（名×姓の観察配列）が加わります。

**注意：`interaction`（名×姓）と `intersection`（言霊×数秘）は別概念です。**
本番に存在するのは `interaction` のみで、`{ type: "一致"|"衝突"|"張力", note: string }` の配列です。

---

## 4. チャット側がまだ把握していない直近の変更

### `ee4762e`（fix_direction 適用済み・チャット側は把握しているはず）
方向の分布化（`direction_distribution` / `derived`）と、`NUMEROLOGY_L1` からの
`direction` / `motion` / `modifier` 削除。

### `c29c189`（★指示書より後に実装。チャット側は未把握）
検証ログ基盤を追加：

- **`src/data/version.js`** — 辞書・エンジン・プロンプトのバージョン刻印。
  **今後、辞書やプロンプトを変更したら必ずこの値を更新する運用になりました。**
  相性診断を追加する際も、対応するバージョンキーの追加が必要です。
- **`src/data/selfReport.js`** — エンジンの各軸を平易語に置き換えた7項目・5段階の自己申告スケール。
  診断文への感想ではなく本人の位置を独立に測り、エンジン出力との相関で
  L1辞書・SURNAME_INTERFACE を較正するための基礎データ。
- 検証JSONに `meta` / `input` / `derived` / `direction_distribution` /
  `generation`（セクション別の使用モデル・selfCheck結果）/ `feedback`（0-100の的中度スコア含む）を追加。
  スキーマ版数は `logSchema: "2"`。

---

## 5. `NUMEROLOGY_L1` の構造語彙は削除済みです（重要）

`buildIntersection(k_L2, n_L2)` は `n_L2.direction` / `n_L2.process` / `n_L2.modifier` を要求します。
しかしその供給源だった `NUMEROLOGY_L1` の `direction` / `motion` / `modifier` は、
`ee4762e` で削除されました。削除理由は当時のコメントに以下と記載されています。

> KOTODAMA_L1と同じ構造語彙を独立に持たせない、という3軸責務契約・数秘条件層再実装の方針に合わせて整理

**つまり「数秘に方向・動きを持たせない」が直近の合意事項**であり、
intersection方式（数秘に方向・動きを持たせて言霊と交差させる）とは
設計思想が正面から衝突します。個人内intersectionを復活させるなら、
この削除判断を覆すかどうかの再合意が必要です。

---

## 6. 指示書の各項目の再解釈

| 指示書 | 現物に照らした扱い |
|---|---|
| 1. `relation` → `complex_type` | 本番に対象なし。**相性診断の新規実装で最初からこの名前を使う** |
| 2. `auxiliary` のキー正規化 | 同上 |
| 3. 個人診断の最終出力は不変 | **自動的に達成**（触る箇所が存在しない） |
| 4. `viewer` / `counterpart` | 新規実装なのでそのまま採用可 |
| 5. Adjust後の内部状態を使う | **現状と整合**。上記 `adjustedState` をそのまま渡せる |
| adapterA（個人診断用） | **現時点では不要**。対応する消費者が存在しない |

「統一化」ではなく「相性診断の新規実装」として読み替えるのが妥当です。
core + adapterB（相性診断用）だけを作り、adapterA は作らない構成になります。

---

## 7. 設計判断として確認したいこと

### Q1. 個人診断に intersection を復活させる予定はありますか？

- **無い**（adjust方式で確定）
  → core は「2つの `adjustedState` を比較する」ことに特化して設計できます。
     `slot_a` / `slot_b` という中立名も不要になるかもしれません（比較対象が常に人物になるため）。
- **ある**（将来 言霊×数秘 の交差も見せたい）
  → 数秘L2の復活が必要。§5 の削除判断との整合を取る必要があります。
     この場合は指示書通り `slot_a` / `slot_b` の中立設計が効いてきます。

### Q2. Q1が「ある」の場合、§5 の「数秘に構造語彙を持たせない」方針とどう整合させますか？

### Q3. `complex_flag` は個人内で既に稼働しています

指示書は `complex_flag`（個人内・方向の拮抗）と `complex_type`（intersection の分類）の
混同に注意せよと書いており、これは適切です。補足すると `complex_flag` は
**既に本番で稼働中**で、真の場合はAIプロンプトに「◯◯と◯◯が拮抗(僅差)」と渡されます。
閾値は `DOMINANCE_MARGIN_THRESHOLD = 0.15`（暫定値、感度分析待ち）。

相性診断で「拮抗している人同士」を扱う際は、この既存フラグを入力として使えます。

---

## 8. 補足：旧プロトタイプの扱い

`kotone_simulator_v*.html` 7ファイルがリポジトリ直下にgit管理下で残っています。
本番からは一切参照されていませんが、**チャット側がこれを本番と誤認する事故が
実際に起きた**ため、扱いを決めた方が安全です（`archive/` へ移動する、
先頭に「本番ではない」旨のコメントを入れる、など）。判断待ちのため未実施です。
