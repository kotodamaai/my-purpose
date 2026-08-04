// 検証ログ用バージョン刻印
// 辞書・エンジン・プロンプトを変更したら、対応する値を必ず更新すること。
// これが無いと「変更で精度が上がったか」を後から判定できない。
export const VERSIONS = {
  // 辞書系（src/data/）
  kotodamaL1: "1.2",        // L1_dictionary.js: KOTODAMA_L1
  surnameInterface: "0.2",  // L1_dictionary.js: SURNAME_INTERFACE（15音追加・要検証）
  numerologyL1: "1.1",      // numerology.js: NUMEROLOGY_L1（direction/motion/modifier削除済み）
  numerologyAdjust: "0.1",  // numerology.js: NUMEROLOGY_ADJUST

  // エンジン系（src/utils/）
  engine: "direction_dist_v1", // kotodamaEngine.js: 方向を分布で保持する版（発見C対応）

  // プロンプト系（src/data/prompts.js）
  prompt: "2026-08-05",     // 書き出し自由化・セクション分離・キャッチ注入

  // 検証ログのスキーマ自体のバージョン
  logSchema: "2",
};
