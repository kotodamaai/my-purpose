// 検証ログ用バージョン刻印
// 辞書・エンジン・プロンプトを変更したら、対応する値を必ず更新すること。
// これが無いと「変更で精度が上がったか」を後から判定できない。
export const VERSIONS = {
  // 辞書系（src/data/）
  kotodamaL1: "1.3",        // L1_dictionary.js: KOTODAMA_L1（1.3: 特殊音の上乗せmodifierを追加）
  surnameInterface: "0.3",  // L1_dictionary.js: SURNAME_INTERFACE（0.3: 濁音・半濁音の上乗せ）
  numerologyL1: "1.1",      // numerology.js: NUMEROLOGY_L1（direction/motion/modifier削除済み）
  numerologyAdjust: "0.1",  // numerology.js: NUMEROLOGY_ADJUST

  // エンジン系（src/utils/）
  engine: "special_sounds_v1", // kotodamaEngine.js: 特殊音（濁音・半濁音・拗音・促音・長音）整理版。前版 direction_dist_v1

  // プロンプト系（src/data/prompts.js）
  prompt: "2026-08-05",     // 書き出し自由化・セクション分離・キャッチ注入

  // 表示（画面デザイン）
  ui: "beta-1",             // KOTONE · MY PURPOSE β（配色「藤と墨」、β表記）

  // 検証ログのスキーマ自体のバージョン
  logSchema: "2",
};
