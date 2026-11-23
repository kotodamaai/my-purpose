// 検証ログ用バージョン刻印
// 辞書・エンジン・プロンプトを変更したら、対応する値を必ず更新すること。
// これが無いと「変更で精度が上がったか」を後から判定できない。
export const VERSIONS = {
  // アプリ全体の版（画面のバッジに表示）
  app: "1.0",               // 1.0: 正本 v3.0 の新しい音の意味（SOUND_MATERIAL 2.0）で公開

  // 辞書系（src/data/）
  kotodamaL1: "1.4",        // L1_dictionary.js: KOTODAMA_L1（1.4: 濁音の増幅4/3・名の位置の重み2/3ずつ・プロセス上位3つ。1.3: 特殊音の上乗せmodifier）
  surnameInterface: "0.4",  // SURNAME_INTERFACE（0.4: 位置の重み2/3ずつ＋重み付き平均＋目盛り再校正。0.3: 濁音・半濁音の上乗せ）
  soundMaterial: "2.0",     // L1_dictionary.js: SOUND_MATERIAL（2.0: 正本 v3.0 に合わせて17音を変更（初代の連想・行の役割から作った言葉を外し、水蓮流・他文献・音象徴で照合）。1.1: 「あ」創造性と求心力→創造性と開拓力。外向・起点の向きと音象徴「開く・大きい」に合わせた）
  numerologyL1: "1.1",      // numerology.js: NUMEROLOGY_L1（direction/motion/modifier削除済み）
  numerologyAdjust: "0.1",  // numerology.js: NUMEROLOGY_ADJUST

  // エンジン系（src/utils/）
  engine: "name_position_v1", // kotodamaEngine.js: 濁音の増幅(完全4度)＋名の位置の重み(完全5度)＋プロセス上位3つ（L1 v1.4）。前版 special_sounds_v1

  // プロンプト系（src/data/prompts.js）
  prompt: "2026-11-22",     // 核（名の頭の音）を決め打ちで注入・現象サマリーを好ましい場面に・キャッチの揺らぎ0.1。前版 2026-08-05

  // 表示（画面デザイン）
  ui: "1.0",                // 1.0: バッジの表記を Ⅰ → ver1.0。I-2: ブラウザの戻る対応・入力の復元・①②③の除去。I-1: 表記をβ→Ⅰに。beta-2: 地の藤色を少し濃く・文字サイズ+2px。beta-1: 配色「藤と墨」、Ⅰ表記

  // 検証ログのスキーマ自体のバージョン
  logSchema: "2",
};
