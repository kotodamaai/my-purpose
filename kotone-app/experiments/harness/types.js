// KOTONE 検証ハーネス 入力オブジェクトの型定義(JSDoc typedefのみ・実行コードなし)
// 設計書 KOTONE_検証ハーネス設計_Step2-1_2026-08-09.md §2.1 に対応。
//
// 重要な設計原則: KInput には NInput 由来のフィールド(weight/priority/persistence/timing)を
// 一切含めない。逆も同様。promptAssembler が呼ばれる直前まで、この4オブジェクトは
// メモリ上でも別々の変数として存在する。

/**
 * @typedef {Object} KInput
 * @property {string} direction               名エンジンの動きの方向(dominant_direction。拮抗時の扱いはpromptAssembler側で判定)
 * @property {string[]} process                プロセス配列(N補正なし。K単体の並び)
 * @property {string[]} modifier               修飾
 * @property {Object} derived                  complex_flag / complex_pair / dominant_margin / confidence(拮抗情報)
 * @property {Object|null} direction_distribution  4方向の構成比(参考情報)
 * @property {Object|null} surnameInterface    姓インターフェース { sounds, raw_scores, labels } または姓未入力ならnull
 */

/**
 * @typedef {Object} NInput
 * @property {"legacy"|"neutral"|"shuffled"} source
 * @property {number|null} weight
 * @property {string[]|null} priority
 * @property {number|null} persistence
 * @property {string[]|null} timing
 * @property {string} [borrowed_from_case_id]  source==="shuffled"のとき、借用元のcase_id
 */

/**
 * @typedef {Object} InteractionInput
 * @property {Array<{type: string, note: string}>} interaction  名×姓 interaction(K×姓のみ。Nは関与しない)
 * @property {boolean} [omitted]  このarmで意図的にinteractionを渡していない場合true(A5用)
 */

/**
 * @typedef {Object} ContextInput
 * @property {string} gender
 * @property {string} bloodType
 * @property {string} scenarioId
 */

export {};
