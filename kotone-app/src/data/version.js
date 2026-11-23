// 検証ログ用バージョン刻印
// 辞書・エンジン・プロンプトを変更したら、対応する値を必ず更新すること。
// これが無いと「変更で精度が上がったか」を後から判定できない。
export const VERSIONS = {
  // 辞書系（src/data/）
  kotodamaL1: "1.4",        // L1_dictionary.js: KOTODAMA_L1（1.4: 濁音の増幅4/3・名の位置の重み2/3ずつ・プロセス上位3つ。1.3: 特殊音の上乗せmodifier）
  surnameInterface: "0.4",  // SURNAME_INTERFACE（0.4: 位置の重み2/3ずつ＋重み付き平均＋目盛り再校正。0.3: 濁音・半濁音の上乗せ）
  soundMaterial: "1.1",     // L1_dictionary.js: SOUND_MATERIAL（1.1: 「あ」創造性と求心力→創造性と開拓力。外向・起点の向きと音象徴「開く・大きい」に合わせた）
  numerologyL1: "1.1",      // numerology.js: NUMEROLOGY_L1（direction/motion/modifier削除済み）
  numerologyAdjust: "0.1",  // numerology.js: NUMEROLOGY_ADJUST

  // エンジン系（src/utils/）
  engine: "name_position_v1", // kotodamaEngine.js: 濁音の増幅(完全4度)＋名の位置の重み(完全5度)＋プロセス上位3つ（L1 v1.4）。前版 special_sounds_v1

  // プロンプト系（src/data/prompts.js）
  prompt: "2026-11-22",     // 核（名の頭の音）を決め打ちで注入・現象サマリーを好ましい場面に・キャッチの揺らぎ0.1。前版 2026-08-05

  // 表示（画面デザイン）
  ui: "I-1",                // I-1: 表記をβ→Ⅰに。beta-2: 地の藤色を少し濃く・文字サイズ+2px。beta-1: 配色「藤と墨」、Ⅰ表記

  // 検証ログのスキーマ自体のバージョン
  logSchema: "2",
};
