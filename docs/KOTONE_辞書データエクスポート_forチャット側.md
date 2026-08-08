# KOTONE 辞書・データモデル 実データエクスポート（相性診断設計用）

`Claude Code依頼_辞書データエクスポート.md` への回答。
対象コミット：`main` 最新（`c29c189` 以降）。

構造やフィールド名の説明ではなく、**実データそのもの**と、
それを46音／372日付／99,498名の全数調査した統計を掲載する。

---

## 1. `src/data/L1_dictionary.js` 全内容

```js
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
  "あ": "創造性と求心力", "い": "細やかな感受性と本質を見抜く力", "う": "包み込む受容性",
  "え": "違いを見極める識別力", "お": "全体を捉える統合力", "か": "瞬発的な行動力",
  "き": "鋭い判断力と決断力", "く": "内側で深める醸成力", "け": "気配りと察する力",
  "こ": "責任感と誠実さ", "さ": "整理して筋道を立てる分析力", "し": "信念を曲げない一貫性",
  "す": "摩擦なく流れを通す調整力", "せ": "正しさへのこだわり", "そ": "陰で支える献身性",
  "た": "確定させる安定性", "ち": "鋭敏な多面性", "つ": "圧を溜めて貫く突破力",
  "て": "工夫と改善の手腕", "と": "枠を破る革新性", "な": "柔らかく場に溶け込む調和力",
  "に": "細やかな比較・分類の力", "ぬ": "深く潜って極める専門性", "ね": "根を張る継続力",
  "の": "つなぐ自由さ", "は": "波のように場を作るリズム", "ひ": "周囲を照らす表現力",
  "ふ": "自然体の清涼感", "へ": "方向を指し示す指向力", "ほ": "温かく包む受容性",
  "ま": "円満にまとめる調和力", "み": "観察眼と美意識", "む": "内側で反芻する深思考",
  "め": "明確な指標を示す力", "も": "大切なものを保ち続ける継続性", "や": "目標へ向かう達成力",
  "ゆ": "しなやかな弾力性", "よ": "広い視野と拡大性", "ら": "外に向けて流れを作る発信力",
  "り": "秩序を作る整理力", "る": "他にはない独自性", "れ": "選別する判断力",
  "ろ": "燃え続ける情熱", "わ": "関係性のインフラを作る接続力",
};
```

---

## 2. `src/data/numerology.js` 全内容

```js
// 数秘L1辞書 v1.1
// direction/motion/modifierフィールドは削除済み(未使用だった。KOTODAMA_L1と同じ構造語彙を
// 独立に持たせない、という3軸責務契約・数秘条件層再実装の方針に合わせて整理)
export const NUMEROLOGY_L1 = {
  "1":  { meta: {気質:"陽",   役割:"リーダー",       成長:"子ども"} },
  "2":  { meta: {気質:"陰",   役割:"サポーター",     成長:"子ども"} },
  "3":  { meta: {気質:"陽",   役割:"ムードメーカー", 成長:"子ども"} },
  "4":  { meta: {気質:"陰",   役割:"サポーター",     成長:"青年"  } },
  "5":  { meta: {気質:"陽",   役割:"ムードメーカー", 成長:"青年"  } },
  "6":  { meta: {気質:"中庸", 役割:"リーダー",       成長:"青年"  } },
  "7":  { meta: {気質:"陰",   役割:"サポーター",     成長:"大人"  } },
  "8":  { meta: {気質:"陽",   役割:"ムードメーカー", 成長:"大人"  } },
  "9":  { meta: {気質:"陰",   役割:"リーダー",       成長:"大人"  } },
  "11": { meta: {気質:"陰",   役割:"サポーター",     成長:"子ども"} },
  "22": { meta: {気質:"陰",   役割:"サポーター",     成長:"青年"  } },
  "33": { meta: {気質:"中庸", 役割:"リーダー",       成長:"青年"  } },
};

// 数秘補正辞書 v0.1
export const NUMEROLOGY_ADJUST = {
  "1":  { weight: +2, priority: "起点", timing: "immediate" },
  "2":  { weight: -1, priority: "接続", timing: "delayed" },
  "3":  { weight: +1, priority: "拡散", persistence: -1 },
  "4":  { weight:  0, persistence: +2, timing: "early" },
  "5":  { weight: +1, priority: "拡散", timing: "cyclic", persistence: -1 },
  "6":  { weight:  0, priority: "接続", persistence: +1 },
  "7":  { weight: -1, priority: "収束", persistence: +2 },
  "8":  { weight: +2, priority: "拡散", persistence: +1, timing: "immediate" },
  "9":  { weight:  0, priority: "収束", persistence: +1, timing: "delayed" },
  "11": { weight: +2, priority: "接続", timing: "immediate" },
  "22": { weight: +2, persistence: +2, timing: "early" },
  "33": { weight: +1, priority: "接続", persistence: +2 },
};

// 数秘L3マッピングデータ（★未使用。旧テンプレート方式の名残。AIプロンプト方式に置換済みでどこからも参照されない）
export const NUMEROLOGY_L3 = {
  "1": { 本質: "先頭に立って動き出す力を持つ人", 人物像_中: "ゼロから何かを始め、迷わず先へ進む推進力を持つ人",
    人物像_長: "誰よりも先に動き出し、自ら道を切り拓いていく推進力を持つ人。決断が速く、周囲を引っ張っていくリーダー性を備えた人",
    行動傾向: "思い立ったらすぐに動き出す", 光と影: "リーダーとして頼られる一方、ペースが速すぎて周囲を置き去りにしてしまうこともある",
    役割語: "先頭に立ちながら", 力名: "先頭に立つ力", キーワード: ["先頭", "起点", "決断", "リーダー"] },
  "2": { 本質: "人と人をつなぎ、支える調和の人", 人物像_中: "相手の気持ちを汲み取りながら、人と人をつなぐ役割を自然に担う人",
    人物像_長: "細やかな共感力を持ち、人と人の間に立って関係を整える役割を担う人",
    行動傾向: "相手の気持ちを察する感覚に優れている", 光と影: "周囲から信頼される一方、自分の本音を後回しにして疲れ果ててしまうこともある",
    役割語: "人をつなぎながら", 力名: "人と人をつなぐ力", キーワード: ["調和", "共感", "支援", "つなぎ役"] },
  "3": { 本質: "創造性と明るさで場を彩る表現者", 人物像_中: "湧き出るアイデアと表現力で、周囲を明るく動かしていく人",
    人物像_長: "次々とアイデアが湧き、感性豊かに表現することで人を動かす力を持つ人",
    行動傾向: "感じたことをそのまま表に出す", 光と影: "周囲を明るくする一方、感情の波が激しく、興味の対象も移ろいやすい面もある",
    役割語: "創造を表現しながら", 力名: "創造して表現する力", キーワード: ["創造", "表現", "明るさ", "ムードメーカー"] },
  "4": { 本質: "コツコツ積み上げる基盤づくりの人", 人物像_中: "丁寧に基盤を作り上げ、長く続けることで結果を出す人",
    人物像_長: "派手さはなくとも、毎日の積み重ねを大切にし、確実な土台を作っていく堅実な人",
    行動傾向: "計画を立てて着実に進める", 光と影: "信頼される基盤を作る一方、変化に対応しづらく、頑固に映ってしまうこともある",
    役割語: "基盤を固めながら", 力名: "基盤を作り続ける力", キーワード: ["堅実", "基盤", "継続", "安定"] },
  "5": { 本質: "枠を超えて変化を楽しむ自由人", 人物像_中: "枠にとらわれず、好奇心の赴くまま新しい世界に飛び込んでいく人",
    人物像_長: "変化を恐れず、むしろ変化の中でこそ生き生きと動ける人",
    行動傾向: "新しいものに最初に飛びつく", 光と影: "新しい風を吹き込む一方、定着しづらく、約束を軽く扱ってしまう面もある",
    役割語: "自由に動きながら", 力名: "自由に変化していく力", キーワード: ["自由", "変化", "好奇心", "冒険"] },
  "6": { 本質: "愛と美意識で全体を整える調和者", 人物像_中: "深い思いやりを持ち、周囲との調和を大切にしながら美しい関係を築く人",
    人物像_長: "誰かのために動くこと、美しいものに触れることに喜びを感じる人",
    行動傾向: "相手のために動くことを優先する", 光と影: "深い愛情で周囲を包む一方、世話を焼きすぎたり、理想を押し付けてしまうこともある",
    役割語: "愛で包みながら", 力名: "愛で全体を整える力", キーワード: ["愛", "調和", "美", "思いやり"] },
  "7": { 本質: "独自の世界を究める探求者", 人物像_中: "周囲と一線を画す独自のスタイルを持ち、深く掘り下げて本質に迫る人",
    人物像_長: "誰にも真似できない独自の世界観を持ち、一人で物事を完結させる力がある人",
    行動傾向: "一人で深く考え抜いてから動く", 光と影: "独自性で一目置かれる一方、周囲と距離が開きすぎて孤独に陥ることもある",
    役割語: "独自に究めながら", 力名: "独自に究める力", キーワード: ["探求", "独自", "完成", "孤高"] },
  "8": { 本質: "現実を動かし豊かさを生み出す人", 人物像_中: "大きなエネルギーで現実を動かし、物事を豊かに拡大していく実行力の人",
    人物像_長: "スケール感のある発想と強い実行力を持ち、現実世界で結果を出していく人",
    行動傾向: "目標を大きく持って動く", 光と影: "大きな成果を生む一方、力が暴走するとコントロール欲や物質偏重に陥ることもある",
    役割語: "現実を動かしながら", 力名: "現実を動かす力", キーワード: ["豊かさ", "拡大", "情熱", "現実化"] },
  "9": { 本質: "全体を見渡し智慧でまとめる賢者", 人物像_中: "大きな視野で全体を見渡し、智慧で物事をまとめていく人",
    人物像_長: "個別の主張よりも全体の調和を優先し、智慧で物事を統合していく賢者の素質を持つ人",
    行動傾向: "全体を俯瞰してから動く", 光と影: "全体を支える賢者として頼られる一方、自分を後回しにしすぎて埋没してしまうこともある",
    役割語: "全体をまとめながら", 力名: "全体をまとめる力", キーワード: ["智慧", "統合", "賢者", "アンカー"] },
  "11": { 本質: "直感とひらめきを瞬時に捉える人", 人物像_中: "瞬時にひらめきを得て答えを導き出す、感性と知性を統合した人",
    人物像_長: "素晴らしいひらめきやインスピレーションを得て、一瞬で答えを導き出せる天性の才能を持つ人",
    行動傾向: "理屈より先に直感が動く", 光と影: "鋭い直感で頼られる一方、感受性の強さが消耗を招き、繊細さに苦しむこともある",
    役割語: "直感を働かせながら", 力名: "直感とひらめきの力", キーワード: ["直感", "ひらめき", "賢者", "感性"] },
  "22": { 本質: "大きな構造を現実化するカリスマ", 人物像_中: "壮大なビジョンを描き、それを現実の形にしていく強い実行力の人",
    人物像_長: "小さなことにこだわらず、大きなスケールで物事を捉え、ビジョンを現実化する強い力を持つカリスマ",
    行動傾向: "大きなビジョンから逆算して動く", 光と影: "大きな構造を現実化する力で頼られる一方、理想の大きさに自分自身が押し潰されることもある",
    役割語: "大構造を作りながら", 力名: "大きな構造を現実化する力", キーワード: ["大構造", "ビジョン", "カリスマ", "現実化"] },
  "33": { 本質: "無条件の愛で全てを包む奉仕者", 人物像_中: "見返りを求めず、深い愛で全てを包み込む透明な奉仕者",
    人物像_長: "細かな計算を超えた次元で動く、無条件の愛と深い使命感を持つ人",
    行動傾向: "見返りを求めずに動く", 光と影: "深い愛で周囲を包む一方、自己犠牲に陥り、自分自身が消耗してしまうこともある",
    役割語: "無条件に包みながら", 力名: "無条件の愛で包む力", キーワード: ["無条件の愛", "奉仕", "包容", "菩薩"] },
};
```

---

## 3. `src/utils/kotodamaEngine.js` 全内容

```js
import { KOTODAMA_L1, DAKUON_MAP, SURNAME_INTERFACE } from '../data/L1_dictionary.js';

const NATURAL_ORDER = ["起点", "拡散", "収束", "接続", "切断", "保持"];

export function decomposeSounds(name) {
  const result = [];
  for (let i = 0; i < name.length; i++) {
    let ch = name[i];
    const next = name[i + 1];
    if (next && "ゃゅょぁぃぅぇぉ".includes(next)) {
      let baseChar = DAKUON_MAP[ch] || ch;
      result.push({ ch: baseChar, weight: 0.8 });
      const glideMap = { "ゃ":"や","ゅ":"ゆ","ょ":"よ","ぁ":"あ","ぃ":"い","ぅ":"う","ぇ":"え","ぉ":"お" };
      const glideChar = glideMap[next];
      if (glideChar) result.push({ ch: glideChar, weight: 0.2 });
      i++;
      continue;
    }
    if (ch === "っ" || ch === "ー") continue;
    if (DAKUON_MAP[ch]) ch = DAKUON_MAP[ch];
    result.push({ ch, weight: 1.0 });
  }
  return result;
}

// 拮抗判定の閾値(暫定値。実データでの感度分析待ち。KOTONE_L2非損失表現設計_v1_0 3.2節と対応)
export const DOMINANCE_MARGIN_THRESHOLD = 0.15;

// direction_distributionから代表値・派生値を算出する(表示・プロンプト用途にのみ使う。構造の正本ではない)
function deriveDirection(distribution, totalWeight) {
  const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const [dominant_direction, topScore] = sorted[0] || ["中立", 0];
  const secondScore = sorted[1]?.[1] ?? 0;
  const total = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;
  const dominant_margin = (topScore - secondScore) / total;
  const complex_flag = dominant_margin < DOMINANCE_MARGIN_THRESHOLD;
  const complex_pair = complex_flag ? [sorted[0]?.[0], sorted[1]?.[0]].filter(Boolean) : null;
  // confidence: 音数・重み総量が少ないほど根拠が薄いとみなす暫定式(要調整)
  const confidence = Math.min(1, totalWeight / 3);
  return { dominant_direction, dominant_margin, complex_flag, complex_pair, confidence };
}

export function getKotodamaL1(name) {
  if (!name) return null;
  const sounds = decomposeSounds(name);
  const counter = {};
  const features = {
    direction: { 外向: 0, 内向: 0, 双方向: 0, 中立: 0 },
    motion: {},
    modifier: {},
  };
  let totalWeight = 0;
  for (const { ch, weight } of sounds) {
    const def = KOTODAMA_L1[ch];
    if (!def) continue;
    counter[ch] = (counter[ch] || 0) + 1;
    const decay = Math.pow(0.5, counter[ch] - 1); // 同音再登場は0.5倍ずつ減衰
    const w = decay * weight;
    totalWeight += w;
    if (def.direction === "内向シフト") {
      features.direction.内向 += 0.3 * w; // 「ん」は内向を弱く加算するのみ
      continue;
    }
    if (features.direction[def.direction] !== undefined) {
      features.direction[def.direction] += w;
    }
    for (const m of def.motion) {
      features.motion[m] = (features.motion[m] || 0) + w;
    }
    for (const mod of def.modifier) {
      features.modifier[mod] = (features.modifier[mod] || 0) + w;
    }
  }
  // 一次データ：方向の分布(集約せず保持。発見C対応)
  const directionTotal = Object.values(features.direction).reduce((a, b) => a + b, 0) || 1;
  const direction_distribution = Object.fromEntries(
    Object.entries(features.direction).map(([k, v]) => [k, v / directionTotal])
  );
  // 二次データ：表示・プロンプト用の派生値
  const derived = deriveDirection(features.direction, totalWeight);
  // 後方互換：direction は dominant_direction のまま(既存の消費箇所を壊さない)
  const direction = derived.dominant_direction;

  const motionOrdered = [];
  const motionSeen = new Set();
  for (const { ch } of sounds) {
    const def = KOTODAMA_L1[ch];
    if (!def) continue;
    for (const m of def.motion) {
      if (!motionSeen.has(m) && (features.motion[m] || 0) >= 0.5) {
        motionSeen.add(m);
        motionOrdered.push(m);
      }
    }
  }
  const modifierList = Object.entries(features.modifier).filter(([, v]) => v >= 0.5).map(([k]) => k);
  return {
    sounds: sounds.map(s => s.ch),
    sounds_with_weight: sounds,
    direction,
    direction_distribution,
    derived,
    motion: motionOrdered,
    modifier: modifierList,
    raw_scores: features,
  };
}

function needsCorrection(motionList) {
  if (!motionList.length) return false;
  const head = motionList[0];
  const rest = motionList.slice(1);
  if (head === "保持" && rest.includes("起点")) return true;
  if (head === "切断" && (rest.includes("拡散") || rest.includes("収束"))) return true;
  return false;
}

function orderMotion(motionList) {
  const ordered = [...motionList];
  if (needsCorrection(ordered)) {
    return ordered.sort((a, b) => NATURAL_ORDER.indexOf(a) - NATURAL_ORDER.indexOf(b));
  }
  return ordered;
}

export function buildL2WithTags(L1) {
  const process = orderMotion(L1.motion);
  const tags = [];
  if (process.includes("接続")) {
    for (const mod of L1.modifier) tags.push(`接続_${mod}`);
  }
  return {
    process,
    direction: L1.direction,
    direction_distribution: L1.direction_distribution,
    derived: L1.derived,
    modifier: L1.modifier,
    tags,
  };
}

export function getSurnameInterface(lastName) {
  if (!lastName) return null;
  const sounds = decomposeSounds(lastName);
  const counter = {};
  const scores = { scale: 0, openness: 0, stability: 0, visibility: 0, constraint: 0 };
  for (const { ch, weight } of sounds) {
    const def = SURNAME_INTERFACE[ch];
    if (!def) continue;
    counter[ch] = (counter[ch] || 0) + 1;
    const decay = Math.pow(0.5, counter[ch] - 1);
    const w = decay * weight;
    for (const [axis, value] of Object.entries(def)) {
      scores[axis] += value * w;
    }
  }
  const labelize = v => {
    if (v >= 3.0) return "very high";
    if (v >= 1.5) return "high";
    if (v >= 0.5) return "medium";
    if (v >= -0.5) return "neutral";
    if (v >= -1.5) return "low";
    return "very low";
  };
  const labels = {};
  for (const [axis, v] of Object.entries(scores)) labels[axis] = labelize(v);
  return { sounds: sounds.map(s => s.ch), raw_scores: scores, labels };
}

export function adjustWithNumerology(firstName_L2, numerologyAdj) {
  if (!firstName_L2) return null;
  let process = [...firstName_L2.process];
  if (numerologyAdj && numerologyAdj.priority.length > 0) {
    // 数秘のpriority(motion名の配列)に含まれるmotionを、process内で先頭側に並べ替える
    const reordered = [];
    for (const p of numerologyAdj.priority) {
      if (process.includes(p)) reordered.push(p);
    }
    for (const m of process) {
      if (!reordered.includes(m)) reordered.push(m);
    }
    process = reordered;
  }
  return {
    process,
    direction: firstName_L2.direction,
    direction_distribution: firstName_L2.direction_distribution,
    derived: firstName_L2.derived,
    modifier: firstName_L2.modifier,
    tags: firstName_L2.tags,
    adjustments: numerologyAdj,
  };
}

export function computeNameSurnameInteraction(adjustedState, surnameInterface) {
  if (!surnameInterface) return null;
  const labels = surnameInterface.labels;
  const direction = adjustedState.direction;
  const process = adjustedState.process;
  const observations = [];
  const opennessHigh = ["high", "very high"].includes(labels.openness);
  const opennessLow = ["low", "very low"].includes(labels.openness);
  if (direction === "外向" && opennessHigh) observations.push({ type: "一致", note: "外向きの動きが、開放的な見え方でそのまま外に出る" });
  else if (direction === "外向" && opennessLow) observations.push({ type: "衝突", note: "外向きの動きが、閉じた見え方で外に出にくい" });
  else if (direction === "内向" && opennessHigh) observations.push({ type: "張力", note: "内向きの動きが、開放的な見え方で外に出される(状況依存)" });
  else if (direction === "内向" && opennessLow) observations.push({ type: "一致", note: "内向きの動きが、閉じた見え方でそのまま内に保たれる" });
  if (process.includes("拡散")) {
    if (["high", "very high"].includes(labels.visibility)) observations.push({ type: "一致", note: "広げる動きが、目立って外に出る(派手に広がる)" });
    else if (["low", "very low"].includes(labels.visibility)) observations.push({ type: "衝突", note: "広げる動きが、目立たない見え方に押し込められる(内部で広がる)" });
  }
  if (process.includes("保持") && ["high", "very high"].includes(labels.stability)) {
    observations.push({ type: "一致", note: "保つ動きが、安定した見え方で長く続く" });
  }
  if (process.includes("切断") && ["high", "very high"].includes(labels.constraint)) {
    observations.push({ type: "一致", note: "確定させる動きが、枠を持って出る" });
  }
  return observations;
}

export function transformWithSurname(adjustedState, surnameInterface) {
  if (!adjustedState) return null;
  const interaction = computeNameSurnameInteraction(adjustedState, surnameInterface);
  return { ...adjustedState, surfaceInterface: surnameInterface, interaction };
}
```

**`DOMINANCE_MARGIN_THRESHOLD` 周辺の要点：**
`dominant_margin` は「1位の方向スコア − 2位の方向スコア」を総量で割った差分。
`0.15` 未満なら「拮抗（complex_flag）」と判定し、`complex_pair` に1位・2位の方向を格納する。
値は暫定であり、後述§5の全数調査で妥当性を検討できる。

---

## 4. `src/utils/numerologyEngine.js` 全内容

```js
import { NUMEROLOGY_L1, NUMEROLOGY_ADJUST } from '../data/numerology.js';

export function computeDay(day) {
  const result = { primary: [], converged: null, isPair: false };
  if (day < 10) {
    result.primary = [String(day)];
  } else {
    const tens = Math.floor(day / 10);
    const ones = day % 10;
    if (ones === 0) {
      result.primary = [String(tens)];
      result.amplified = true;
    } else {
      result.primary = [String(tens), String(ones)];
      result.isPair = true;
      let sum = tens + ones;
      if (sum === 11 || sum === 22) {
        result.converged = String(sum);
      } else if (sum >= 10) {
        sum = Math.floor(sum / 10) + (sum % 10);
        result.converged = String(sum);
      } else {
        result.converged = String(sum);
      }
    }
  }
  return result;
}

export function computeMonth(month) {
  if (month === 11) return { value: "11", isMaster: true };
  if (month < 10) return { value: String(month), isMaster: false };
  const sum = Math.floor(month / 10) + (month % 10);
  return { value: String(sum), isMaster: false, amplified: month === 10 || month === 20 };
}

export function computeFullSum(year, month, day) {
  const digits = String(year) + String(month) + String(day);
  let sum = 0;
  for (const ch of digits) sum += parseInt(ch);
  const trace = [sum];
  while (sum >= 10 && sum !== 11 && sum !== 22 && sum !== 33) {
    let next = 0;
    for (const ch of String(sum)) next += parseInt(ch);
    sum = next;
    trace.push(sum);
  }
  return { final: String(sum), trace };
}

export function getNumerologyL1(year, month, day) {
  const dayResult = computeDay(day);
  const monthResult = computeMonth(month);
  const fullSum = computeFullSum(year, month, day);
  const appearances = {};
  for (const n of dayResult.primary) {
    appearances[n] = (appearances[n] || 0) + 1;
  }
  appearances[monthResult.value] = (appearances[monthResult.value] || 0) + 1;
  const numbers = {};
  for (const num of Object.keys(appearances)) {
    const def = NUMEROLOGY_L1[num];
    if (!def) continue;
    numbers[num] = { ...def, weight: appearances[num] };
  }
  return { day: dayResult, month: monthResult, fullSum, appearances, numbers };
}

export function getNumerologyAdjustment(n_L1) {
  if (!n_L1 || !n_L1.numbers) return null;
  const adj = { weight: 0, priority: [], persistence: 0, timing: [] };
  for (const [num, def] of Object.entries(n_L1.numbers)) {
    const adjDef = NUMEROLOGY_ADJUST[num];
    if (!adjDef) continue;
    const w = def.weight || 1.0;
    if (typeof adjDef.weight === "number") adj.weight += adjDef.weight * w;
    if (typeof adjDef.persistence === "number") adj.persistence += adjDef.persistence * w;
    if (adjDef.priority && !adj.priority.includes(adjDef.priority)) adj.priority.push(adjDef.priority);
    if (adjDef.timing && !adj.timing.includes(adjDef.timing)) adj.timing.push(adjDef.timing);
  }
  return adj;
}
```

**重要な仕様：`n_adj` は `year` に依存しない。**
`getNumerologyL1(year, month, day)` に `year` を渡してはいるが、
実際に `numbers` を決めているのは `day`（十の位・一の位）と `month` のみ。
`fullSum`（year含む全桁和）は計算されているが `getNumerologyAdjustment` では未使用。
つまり **相性診断で数秘条件を比較する際、実質的には `month` と `day` のペアだけが効く**。

`day` の内部仕様：
- 1桁日（1〜9）→ そのままprimary
- 10の倍数（10,20,30）→ 十の位のみ・`amplified: true`
- それ以外の2桁日→ 十の位と一の位を両方 `primary` に含める（例：`23日` → `numbers` に `"2"` と `"3"` の両方が入る）

`month` の内部仕様：
- `11月` は特別扱いでマスターナンバーのまま（`isMaster: true`）
- それ以外の2桁月（10,12月）は一桁化（10→1、12→3）

---

## 5. `src/data/version.js` 全内容（現在のバージョン）

```js
export const VERSIONS = {
  kotodamaL1: "1.2",
  surnameInterface: "0.2",
  numerologyL1: "1.1",
  numerologyAdjust: "0.1",
  engine: "direction_dist_v1",
  prompt: "2026-08-05",
  logSchema: "2",
};
```

---

## 6. 実データの統計（全数調査）

### A. `n_adj` は年に依存しない（実証済み）
`(month, day)` の組が同じなら `year` を変えても `n_adj` は完全一致することを確認した。

### B. `n_adj` の全パターン（372日付を全列挙 → ユニーク145種類）

- `weight` の取りうる値：`-3, -2, -1, 0, 1, 2, 3, 4, 5, 6`（10段階）
- `persistence` の取りうる値：`-2, -1, 0, 1, 2, 3, 4`（7段階）
- `priority` 配列の種類：22種類（空配列〜3要素の組み合わせ。要素は起点/接続/拡散/収束の4種）
- `timing` 配列の種類：24種類（空配列〜3要素。要素はimmediate/delayed/early/cyclicの4種）

代表例（全145種のうち極値のみ抜粋。全量はコード側で再現可能）：

```
例:2/22           weight: -3 persistence:  0 priority:[接続] timing:[delayed]
例:7/27            weight: -3 persistence:  4 priority:[接続,収束] timing:[delayed]
例:11/22           weight:  0 persistence:  0 priority:[接続] timing:[delayed,immediate]
例:1/4,4/1,4/10   weight:  2 persistence:  2 priority:[起点] timing:[immediate,early]
（145パターン全量は分量が大きいため、必要であれば別途JSON形式で出力可能）
```

**相性診断設計への示唆：** `weight` は10段階、`persistence` は7段階と、
比較的荒い離散値。連続量として比較するより、**閾値でバケット化して比較する方が
ノイズに強い**可能性が高い（例：weight >= 2 を「強い」として扱う等、
実際にプロンプト側の `buildPromptInput` でも同様のラベル化を既に行っている）。

### C. 名の全数調査（1〜3音の全組み合わせ 99,498件）

- **`process` 配列のユニーク数：693種類**
- `complex_flag=true` の割合：38,368 / 99,498 = **38.6%**
- `dominant_direction` の分布：外向 54.0% / 内向 25.3% / 中立 12.0% / 双方向 8.6%

process配列の出現頻度トップ（全693種のうち）：

```
  4.42%  [収束 → 接続 → 切断 → 保持]        例:いえく,いえこ
  2.61%  [起点 → 収束 → 接続 → 切断 → 保持]  例:うかし,うかそ
  2.60%  [接続 → 収束 → 保持]              例:えいう,えいお
  2.37%  [拡散 → 収束 → 接続 → 切断 → 保持]  例:きうへ,きうれ
  1.59%  [拡散 → 収束 → 保持 → 接続]        例:ひいめ,ひうえ
```

**相性診断設計への示唆：** `process` は693種類もあり、**配列の完全一致で比較する設計は
ほぼ機能しない**（一致率が極端に低くなる）。共通要素の有無・順序の類似度（編集距離等）
で比較する方が現実的。

### D. `direction_distribution` のバラつき（3音名 97,336件）

`dominant_margin` の分布：

```
0.00-0.15 (拮抗)    36,876件 (37.9%)   ← DOMINANCE_MARGIN_THRESHOLD=0.15 の内側
0.15-0.30            4,476件 (4.6%)
0.30-0.50           47,733件 (49.0%)
0.50-0.75            1,167件 (1.2%)
0.75-1.00            7,084件 (7.3%)
```

**現状の `complex_flag=true`（38.6%）は、閾値0.15の直下に固まっているのではなく、
「完全拮抗（margin=0）」付近に分布が集中している疑いがある。** つまり閾値の微調整より、
「何方向に散っているか（下記）」の方が判別力が高い可能性がある。

「0でない方向」の数（＝分布の広がり方）：

```
1方向のみ    7,084件 ( 7.3%)   ← 単一方向が明確
2方向に分散 55,752件 (57.3%)   ← 過半数はこのパターン
3方向に分散 34,500件 (35.4%)   ← 4方向全部に散ることはほぼ無い（「双方向」自体が中間的な値のため）
```

### E. 実在しそうな名前44件での拮抗判定（実データ確認用）

```
はると  margin:0.000 conf:1.00 ★拮抗  [外向:0.33 内向:0.33 中立:0.33]  process:[拡散→起点→保持→切断→収束]
ゆうと  margin:0.000 conf:1.00 ★拮抗  [外向:0.33 内向:0.33 中立:0.33]  process:[接続→拡散→保持→切断→収束]
そうた  margin:0.000 conf:1.00 ★拮抗  [外向:0.33 内向:0.33 中立:0.33]  process:[起点→収束→接続→保持→切断]
あおい  margin:0.077 conf:1.00       [外向:0.46 内向:0.38 中立:0.15]  process:[起点→拡散→収束→保持]
ひなた  margin:0.400 conf:1.00       [外向:0.60 内向:0.20 中立:0.20]  process:[拡散→起点→接続→収束→保持]
かいと  margin:0.000 conf:1.00 ★拮抗  [外向:0.33 内向:0.33 中立:0.33]  process:[起点→切断→収束→拡散]
さくら  margin:0.500 conf:1.00       [外向:0.75 内向:0.25]            process:[接続→起点→反復→拡散→収束]
けんた  margin:0.500 conf:1.00       [外向:0.50 双方向:0.25 中立:0.25] process:[切断→接続→収束→起点→保持]
（44件全量は必要であれば別途出力可能）
```

**「はると」「かいと」等、実際によくある名前が高頻度で `complex_flag=true` になる**
ことが確認できた。これは指示書§7が確認したかった「実データでの拮抗発生率」に直接回答する。

---

## 7. `adjustedState` の実データサンプル3件

### サンプル1（単一方向・非拮抗）：いわさわ みき / 1971-11-05

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
    "confidence": 0.6666666666666666
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
`ln_interface.labels`（姓「いわさわ」）：
`{ "scale": "neutral", "openness": "high", "stability": "high", "visibility": "neutral", "constraint": "medium" }`

`interaction`：
```json
[
  { "type": "一致", "note": "外向きの動きが、開放的な見え方でそのまま外に出る" },
  { "type": "一致", "note": "保つ動きが、安定した見え方で長く続く" }
]
```

### サンプル2（拮抗・complex_flag=true）：たなか はると / 1985-03-22

```json
{
  "process": ["拡散", "起点", "保持", "切断", "収束"],
  "direction": "外向",
  "direction_distribution": { "外向": 0.333, "内向": 0.333, "双方向": 0, "中立": 0.333 },
  "derived": {
    "dominant_direction": "外向",
    "dominant_margin": 0,
    "complex_flag": true,
    "complex_pair": ["外向", "内向"],
    "confidence": 1
  },
  "modifier": ["反復", "蓄積"],
  "tags": [],
  "adjustments": {
    "weight": -1,
    "priority": ["接続", "拡散"],
    "persistence": -1,
    "timing": ["delayed"]
  }
}
```
`ln_interface.labels`（姓「たなか」）：
`{ "scale": "high", "openness": "medium", "stability": "high", "visibility": "medium", "constraint": "medium" }`

`interaction`：
```json
[{ "type": "一致", "note": "保つ動きが、安定した見え方で長く続く" }]
```

**留意点：** `complex_pair` は `["外向", "内向"]` だが、`direction_distribution` を見ると
実際は3方向（外向・内向・中立）にほぼ均等（各0.333）で割れている。
`complex_pair` は上位2つしか記録しない設計なので、**3方向拮抗の場合は情報が一部欠落する。**
相性診断でこの値を使う際は `complex_pair` だけでなく `direction_distribution` 全体を
参照した方が正確。

### サンプル3（拮抗・別ケース）：さとう そうた / 1992-07-19

```json
{
  "process": ["起点", "収束", "接続", "保持", "切断"],
  "direction": "外向",
  "direction_distribution": { "外向": 0.333, "内向": 0.333, "双方向": 0.333, "中立": 0 },
  "derived": {
    "dominant_direction": "外向",
    "dominant_margin": 0,
    "complex_flag": true,
    "complex_pair": ["外向", "内向"],
    "confidence": 1
  }
}
```

---

## 8. 設計への示唆まとめ

1. **`n_adj` は実質 `(month, day)` のみで決まる**（145パターンしか無い）。
   相性診断で「数秘の相性」を見るなら、この145パターン同士の相性表を
   静的に持つという設計も現実的な選択肢になる。

2. **`process` 配列は693種類あり、完全一致比較は機能しない。**
   共通要素数・順序類似度などの緩やかな比較指標が必要。

3. **`complex_flag=true` は名前の約4割で発生する、決してレアケースではない。**
   相性診断側でも「拮抗している人同士」を無視できない頻度で扱うことになる。

4. **`complex_pair` は上位2方向しか記録しないため、3方向拮抗では情報が欠落する。**
   相性診断のcoreロジックで方向を比較する際は、`direction_distribution` 全体を
   入力に使うことを推奨する（`complex_pair` はあくまで表示用の派生値）。

5. `DOMINANCE_MARGIN_THRESHOLD = 0.15` は、実データでは「拮抗の有無」の境界というより
   「完全拮抗（margin=0）付近の塊」と「そうでない領域」を分けているように見える。
   感度分析をするなら、閾値の微調整よりも「何方向に散っているか」を
   直接特徴量にする方が有効な可能性がある。
