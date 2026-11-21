// 検証ログ用バージョン刻印
// 辞書・エンジン・プロンプトを変更したら、対応する値を必ず更新すること。
// これが無いと「変更で精度が上がったか」を後から判定できない。
export const VERSIONS = {
  // 辞書系（src/data/）
  kotodamaL1: "1.4",        // L1_dictionary.js: KOTODAMA_L1（1.4: 濁音の増幅4/3・名の位置の重み2/3ずつ・プロセス上位3つ。1.3: 特殊音の上乗せmodifier）
  surnameInterface: "0.4",  // SURNAME_INTERFACE（0.4: 位置の重み2/3ずつ＋重み付き平均＋目盛り再校正。0.3: 濁音・半濁音の上乗せ）
  numerologyL1: "1.1",      // numerology.js: NUMEROLOGY_L1（direction/motion/modifier削除済み）
  numerologyAdjust: "0.1",  // numerology.js: NUMEROLOGY_ADJUST

  // エンジン系（src/utils/）
  engine: "name_position_v1", // kotodamaEngine.js: 濁音の増幅(完全4度)＋名の位置の重み(完全5度)＋プロセス上位3つ（L1 v1.4）。前版 special_sounds_v1

  // プロンプト系（src/data/prompts.js）
  prompt: "2026-08-05",     // 書き出し自由化・セクション分離・キャッチ注入

  // 検証ログのスキーマ自体のバージョン
  logSchema: "2",
};
