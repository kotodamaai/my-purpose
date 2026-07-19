// 言霊L1辞書 v1.2
export const KOTODAMA_L1 = {
  "あ": { direction: "外向", motion: ["起点", "拡散"], modifier: [] },
  "い": { direction: "内向", motion: ["収束"], modifier: [] },
  "う": { direction: "内向", motion: ["保持"], modifier: ["蓄積"] },
  "え": { direction: "双方向", motion: ["接続"], modifier: ["媒介"] },
  "お": { direction: "中立", motion: ["収束", "保持"], modifier: [] },
  "か": { direction: "外向", motion: ["起点", "切断"], modifier: [] },
  "き": { direction: "外向", motion: ["切断", "収束"], modifier: [] },
  "く": { direction: "内向", motion: ["切断", "保持"], modifier: ["蓄積"] },
  "け": { direction: "双方向", motion: ["切断", "接続"], modifier: ["媒介"] },
  "こ": { direction: "中立", motion: ["切断", "収束", "保持"], modifier: [] },
  "さ": { direction: "外向", motion: ["接続", "起点"], modifier: ["反復"] },
  "し": { direction: "内向", motion: ["接続", "収束"], modifier: ["反復"] },
  "す": { direction: "内向", motion: ["接続", "保持"], modifier: ["反復", "蓄積"] },
  "せ": { direction: "双方向", motion: ["接続"], modifier: ["反復", "媒介"] },
  "そ": { direction: "中立", motion: ["接続", "収束", "保持"], modifier: ["反復"] },
  "た": { direction: "外向", motion: ["起点", "切断", "保持"], modifier: [] },
  "ち": { direction: "外向", motion: ["切断", "収束", "保持"], modifier: [] },
  "つ": { direction: "内向", motion: ["切断", "保持"], modifier: ["蓄積"] },
  "て": { direction: "双方向", motion: ["切断", "接続", "保持"], modifier: ["媒介"] },
  "と": { direction: "中立", motion: ["切断", "収束", "保持"], modifier: [] },
  "な": { direction: "外向", motion: ["接続", "起点"], modifier: ["持続"] },
  "に": { direction: "内向", motion: ["接続", "収束"], modifier: ["持続"] },
  "ぬ": { direction: "内向", motion: ["接続", "保持"], modifier: ["持続", "蓄積"] },
  "ね": { direction: "双方向", motion: ["接続"], modifier: ["持続", "媒介"] },
  "の": { direction: "中立", motion: ["接続", "収束", "保持"], modifier: ["持続"] },
  "は": { direction: "外向", motion: ["拡散", "起点"], modifier: [] },
  "ひ": { direction: "外向", motion: ["拡散", "収束"], modifier: [] },
  "ふ": { direction: "内向", motion: ["拡散", "保持"], modifier: ["蓄積"] },
  "へ": { direction: "双方向", motion: ["拡散", "接続"], modifier: ["媒介"] },
  "ほ": { direction: "中立", motion: ["拡散", "収束", "保持"], modifier: [] },
  "ま": { direction: "外向", motion: ["保持", "起点"], modifier: [] },
  "み": { direction: "外向", motion: ["保持", "収束"], modifier: [] },
  "む": { direction: "内向", motion: ["保持"], modifier: ["蓄積"] },
  "め": { direction: "双方向", motion: ["保持", "接続"], modifier: ["媒介"] },
  "も": { direction: "中立", motion: ["保持", "収束"], modifier: [] },
  "や": { direction: "外向", motion: ["接続", "起点"], modifier: [] },
  "ゆ": { direction: "内向", motion: ["接続", "保持"], modifier: ["蓄積"] },
  "よ": { direction: "中立", motion: ["接続", "収束", "保持"], modifier: [] },
  "ら": { direction: "外向", motion: ["拡散", "起点"], modifier: ["反復"] },
  "り": { direction: "外向", motion: ["拡散", "収束"], modifier: ["反復"] },
  "る": { direction: "内向", motion: ["拡散", "保持"], modifier: ["反復", "蓄積"] },
  "れ": { direction: "双方向", motion: ["拡散", "接続"], modifier: ["反復", "媒介"] },
  "ろ": { direction: "中立", motion: ["拡散", "収束", "保持"], modifier: ["反復"] },
  "わ": { direction: "外向", motion: ["接続", "起点"], modifier: ["媒介"] },
  "を": { direction: "中立", motion: [], modifier: [] },
  "ん": { direction: "内向シフト", motion: [], modifier: [] },
};

// 濁音→清音マップ
export const DAKUON_MAP = {
  "が":"か","ぎ":"き","ぐ":"く","げ":"け","ご":"こ",
  "ざ":"さ","じ":"し","ず":"す","ぜ":"せ","ぞ":"そ",
  "だ":"た","ぢ":"ち","づ":"つ","で":"て","ど":"と",
  "ば":"は","び":"ひ","ぶ":"ふ","べ":"へ","ぼ":"ほ",
  "ぱ":"は","ぴ":"ひ","ぷ":"ふ","ぺ":"へ","ぽ":"ほ",
};

// 姓インターフェース辞書 v0.2
// ※「き」「く」「け」「に」「ぬ」「ね」「ひ」「ふ」「へ」「ゆ」「よ」「り」「る」「れ」「ん」を追加（要検証）
// 「き」：「い」系の内向収束音・切断も持つ → visibility低め・constraint強め（ささき等の姓で外向き抑制に働く）
export const SURNAME_INTERFACE = {
  // 母音
  "あ": { openness: +2, scale: +1 },
  "い": { visibility: -1, constraint: +1 },
  "う": { openness: -2, scale: -1 },
  "え": { openness: +1, visibility: +1 },
  "お": { openness: +2, visibility: +1 },
  // か行
  "か": { scale: +1, visibility: +1 },
  "き": { visibility: -1, constraint: +2 },   // 要検証: い系+切断 → 内に絞る・抑制
  "く": { openness: -1, stability: +1 },       // 要検証: 内向・保持 → 閉じて安定
  "け": { openness: +1, constraint: +1 },      // 要検証: 双方向・切断+接続
  "こ": { stability: +2, constraint: +1 },
  // さ行
  "さ": { openness: +1, visibility: +1 },
  "し": { constraint: +1, stability: +1 },
  // た行
  "た": { scale: +1, constraint: +1 },
  "て": { constraint: +1, visibility: +1 },
  "と": { scale: +1, openness: +1 },
  "つ": { scale: +1, constraint: +1 },
  // な行
  "な": { stability: +2, openness: +1 },
  "に": { stability: +1, constraint: +1 },     // 要検証: 内向収束・持続
  "ぬ": { openness: -1, stability: +1 },       // 要検証: 内向・持続・蓄積
  "ね": { stability: +1, openness: +1 },       // 要検証: 双方向・持続・媒介
  "の": { openness: +1, stability: +1 },
  // は行
  "は": { openness: +2, visibility: +1 },
  "ひ": { visibility: +1, openness: +1 },      // 要検証: 外向・拡散収束
  "ふ": { openness: -1, stability: +1 },       // 要検証: 内向・拡散保持・蓄積
  "へ": { openness: +1, visibility: +1 },      // 要検証: 双方向・拡散接続・媒介
  // ま行
  "ま": { stability: +2, openness: +1 },
  "み": { visibility: +1, stability: +1 },
  "む": { openness: -2, visibility: -1 },
  // や行
  "や": { openness: +1, visibility: -1 },
  "ゆ": { openness: -1, stability: +1 },       // 要検証: 内向・接続保持・蓄積
  "よ": { openness: +1, scale: +1 },           // 要検証: 中立・接続収束保持・持続
  // ら行
  "ら": { openness: +1, visibility: +1 },
  "り": { visibility: +1, constraint: +1 },    // 要検証: 外向・拡散収束・反復
  "る": { openness: -1, stability: +1 },       // 要検証: 内向・拡散保持・反復蓄積
  "れ": { openness: +1, visibility: +1 },      // 要検証: 双方向・拡散接続・反復媒介
  // わ行
  "わ": { openness: +1, stability: +1 },
  // ん（内向シフト音 → 姓全体を内向きに引き寄せる）
  "ん": { openness: -1, visibility: -1 },      // 要検証
  // グライド音（拗音用）
  "ゃ": { openness: +1 },
  "ゅ": { openness: -1 },
  "ょ": { visibility: -1 },
};

// 50音マスター素材
export const SOUND_MATERIAL = {
  "あ": "創造性と求心力",
  "い": "細やかな感受性と本質を見抜く力",
  "う": "包み込む受容性",
  "え": "違いを見極める識別力",
  "お": "全体を捉える統合力",
  "か": "瞬発的な行動力",
  "き": "鋭い判断力と決断力",
  "く": "内側で深める醸成力",
  "け": "気配りと察する力",
  "こ": "責任感と誠実さ",
  "さ": "整理して筋道を立てる分析力",
  "し": "信念を曲げない一貫性",
  "す": "摩擦なく流れを通す調整力",
  "せ": "正しさへのこだわり",
  "そ": "陰で支える献身性",
  "た": "確定させる安定性",
  "ち": "鋭敏な多面性",
  "つ": "圧を溜めて貫く突破力",
  "て": "工夫と改善の手腕",
  "と": "枠を破る革新性",
  "な": "柔らかく場に溶け込む調和力",
  "に": "細やかな比較・分類の力",
  "ぬ": "深く潜って極める専門性",
  "ね": "根を張る継続力",
  "の": "つなぐ自由さ",
  "は": "波のように場を作るリズム",
  "ひ": "周囲を照らす表現力",
  "ふ": "自然体の清涼感",
  "へ": "方向を指し示す指向力",
  "ほ": "温かく包む受容性",
  "ま": "円満にまとめる調和力",
  "み": "観察眼と美意識",
  "む": "内側で反芻する深思考",
  "め": "明確な指標を示す力",
  "も": "大切なものを保ち続ける継続性",
  "や": "目標へ向かう達成力",
  "ゆ": "しなやかな弾力性",
  "よ": "広い視野と拡大性",
  "ら": "外に向けて流れを作る発信力",
  "り": "秩序を作る整理力",
  "る": "他にはない独自性",
  "れ": "選別する判断力",
  "ろ": "燃え続ける情熱",
  "わ": "関係性のインフラを作る接続力",
};
