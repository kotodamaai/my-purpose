import { SOUND_MATERIAL, DAKUON_MAP, GLIDE_MAP } from "./L1_dictionary.js";
import { NUMEROLOGY_L3 } from "./numerology.js";
import { normalizeKana } from "../utils/kotodamaEngine.js";

export const PROXY_URL = "https://kotone-proxy.daiya-asset-management.workers.dev";

export const CONFIDENTIAL_RULE = `【絶対禁止】
× 音名（ひらがな一文字の呼称）× 数字解説 × 構造用語（外向・内向・収束・拡散・起点・切断・保持・接続等）
× システム説明（言霊・音霊・数秘術・L1・L2等） × 断定表現（「あなたは〜です」）
× 書き出しに「お名前から」「お誕生日から」「お名前とお誕生日から」を使う
【必須】「〜傾向があります」「〜可能性があります」「〜かもしれません」の仮説提示型 / 「たとえば〜」を含む具体的行動シーン`;

// 性別の扱い（ver2.2）：核と才能は性別で変えない。性別は言葉づかいにだけ使う
export const GENDER_RULE = `【性別の扱い】
・性別は、呼びかけや言葉づかいが不自然にならないためだけに使う。性格・才能・場面の読みには使わない
・入力データの特徴は渡された順番のまま扱う（何を主役にするかは入力データの指示に従う）。性別を理由に、前に出す特徴を入れ替えたり弱めたりしない
・場面や小物を、性別からの決まりきった連想で選ばない（家事・装い・恋愛・「母親役」「兄貴分」など）
・入れ替えテスト：書いた場面が、性別を入れ替えても不自然にならないかを確かめ、不自然なら場面を替える`;

// 名の頭の音から「この人の核」を決め打ちで取り出す（AIに主役を選ばせない）
export function getCoreFromName(firstName) {
  const n = normalizeKana(firstName || "");
  for (const ch of n) {
    if (GLIDE_MAP && GLIDE_MAP[ch]) continue;
    const base = DAKUON_MAP[ch] || ch;
    if (SOUND_MATERIAL[base]) return SOUND_MATERIAL[base];
  }
  return null;
}

// 誕生日の3つの役割を、数字を出さずに文章で渡す（数字解説は禁止のため）
const OVERLAP_NOTE = {
  // ver2.4：名前の音と、生まれた日の響き（納音）を同じ五行で比べた結果。使命（使命数）とは別の物差しなので、「使命と重なる」とは書かせない
  "二重に刻まれた": "お名前の核の響きと、生まれた日の響きが同じ。名前と生まれた日の両方に刻まれているので、その人らしさがより強く表れやすい",
  "響き合う": "お名前の核の響きと、生まれた日の響きが、互いを生み育てる関係にある。名前の力と生まれ持った力が支え合って表れやすい",
  "一部重なる": "お名前の核とは別の響きだが、お名前の中に生まれた日と同じ響きも含まれている。重なる部分は強まり、それ以外は別の面として表れる",
  "二つの顔": "お名前の響きと、生まれた日の響きが重ならない。名前の顔と生まれた日の顔、二つの面（二面性）を持ち、それが奥行きになる",
};
export function buildBirthdayBlock(n_L1, overlap, { withOverlap = true } = {}) {
  if (!n_L1 || !n_L1.roles) return "（生年月日なし）";
  const t = (num) => NUMEROLOGY_L3[num] || null;
  const m = t(n_L1.roles.mission.num), ta = t(n_L1.roles.talent.num), so = t(n_L1.roles.soil.num);
  const lines = [];
  lines.push(`使命（主役。この人が生まれ持った使命）: ${m ? `${m.本質}。${m.人物像_中}` : "不明"}`);
  lines.push(`才能（補助。誕生日の日から）: ${ta ? `${ta.力名}。${ta.行動傾向}` : "不明"}`);
  lines.push(`育ちの土壌（補助。誕生月から。人生の前半を形づくる地盤）: ${so ? `${so.本質}` : "不明"}`);
  if (m) lines.push(`使命の光と影: ${m.光と影}`);
  if (overlap && withOverlap) {
    lines.push(`名前と生まれた日の重なり: ${overlap.type}（${OVERLAP_NOTE[overlap.type] || ""}）`);
  }
  return lines.join("\n");
}

// ver3.1：セクションごとに渡す入力を分ける
//   お名前から見えること → 名前の情報だけ／お誕生日から見えること → 誕生日の情報だけ（名前との重なりも渡さない）
//   それ以外（キャッチ・現象サマリー・光と影・締め）→ 全部
export function buildSectionInputs(firstName, lastName, gender, adjustedState, ln_interface, n_adj, n_L1, overlap) {
  const full = buildPromptInput(firstName, lastName, gender, adjustedState, ln_interface, n_adj, n_L1, overlap);
  const blocks = full.split(/\n(?=◆ )/);
  const pick = (...heads) => blocks.filter(b => heads.some(h => b.startsWith(h))).join("\n");
  const name = pick("◆ この人の核", "◆ 属性", "◆ 名(エンジン)", "◆ 姓(インターフェース)", "◆ 名×姓");
  const genderStr = gender === "male" ? "男性" : gender === "female" ? "女性" : "その他";
  const birthday = `◆ 属性
性別: ${genderStr}（言葉づかいのためだけに使う）

◆ 誕生日
${buildBirthdayBlock(n_L1, overlap, { withOverlap: false })}`;
  return { full, name, birthday };
}

export function buildPromptInput(firstName, lastName, gender, adjustedState, ln_interface, n_adj, n_L1, overlap) {
  const weightLabel = n_adj && n_adj.weight >= 2 ? "強い" : n_adj && n_adj.weight <= -1 ? "弱め" : "標準";
  const persistLabel = n_adj && n_adj.persistence >= 2 ? "長続き" : n_adj && n_adj.persistence <= -1 ? "波あり" : "標準";
  const timingMap = { immediate:"すぐに動き始める", delayed:"じっくり時間をかけて動く", cyclic:"繰り返しながら動く", early:"早めに動き始める" };
  const timingStr = n_adj && n_adj.timing ? n_adj.timing.map(t => timingMap[t]||t).join(" + ") : "標準";
  const interStr = adjustedState && adjustedState.interaction ? adjustedState.interaction.map(o=>`${o.type}: ${o.note}`).join("\n") : "（姓未入力）";
  const genderStr = gender === "male" ? "男性" : gender === "female" ? "女性" : "その他";

  // 方向の記述：拮抗している場合は単一断定を避け、混在として伝える(発見C対応)
  let directionStr = "不明";
  if (adjustedState) {
    const derived = adjustedState.derived;
    if (derived && derived.complex_flag && derived.complex_pair) {
      directionStr = `${derived.complex_pair[0]}と${derived.complex_pair[1]}が拮抗(僅差)`;
    } else {
      directionStr = adjustedState.direction;
    }
  }

  const core = getCoreFromName(firstName);
  return `◆ この人の核（最優先。主役の特徴はこれに固定する）
${core || "（取得できず）"}

◆ 属性
性別: ${genderStr}（言葉づかいのためだけに使う）

◆ 名(エンジン)
動きの方向: ${directionStr}
プロセス: ${adjustedState ? adjustedState.process.join(" → ") : "不明"}
修飾: ${adjustedState && adjustedState.modifier && adjustedState.modifier.length ? adjustedState.modifier.join(", ") : "なし"}

◆ 誕生日（名前とは切り分けて読む。重なれば強く、相反すれば二面性）
${buildBirthdayBlock(n_L1, overlap)}

◆ 数秘(エネルギー条件)
強度: ${weightLabel} / 持続性: ${persistLabel} / タイミング: ${timingStr}

◆ 姓(インターフェース)
openness: ${ln_interface ? ln_interface.labels.openness : "不明"} / visibility: ${ln_interface ? ln_interface.labels.visibility : "不明"} / scale: ${ln_interface ? ln_interface.labels.scale : "不明"} / stability: ${ln_interface ? ln_interface.labels.stability : "不明"} / constraint: ${ln_interface ? ln_interface.labels.constraint : "不明"}

◆ 名×姓 interaction
${interStr}`;
}

export function buildSectionPrompts(inputData, parts = {}) {
  const nameInput = parts.name || inputData;
  const birthdayInput = parts.birthday || inputData;
  return [
    { title:"あなたはこんな人", prompt:`あなたはKOTONEという自己理解診断アプリの、一流のコピーライターです。
診断を受けた人が「これ、わたしのことだ」と感じ、心が動く一行を書いてください。

【ゴール】読んだ人の感情を動かす：
ワクワク（可能性に気づく高揚）/ 温かさ（肯定されるじんわりした安心）
安らぎ（ありのままでいい落ち着き）/ 興奮（自分の中の力に火がつく感覚）

【必ず以下の順序で思考してから書くこと】

【材料（先に書かれた診断文。キャッチはここから作る）】
＜お名前から見えること＞
__NAME__
＜現象サマリー＞
__SUMMARY__

STEP 1 【主役は入力データの「この人の核」に固定。別の特徴を主役にしない】
主役を決める
複数の特徴を並べない。入力データの中で「この人らしさを1つだけ挙げるなら」を決める。

STEP 2 ギャップを探す
主役の特徴から連想される一般的なイメージを考える。
次に、【材料】と入力データの「◆ 誕生日」（使命・名前との重なり）から、その人が持つ「意外な一面」を探す。
人は長所そのものより、意外な組み合わせに魅力を感じる。

STEP 3 行動で表現する
能力・性格・抽象概念を書かない。【材料】に書かれている行動・動き方から、実際に目撃できる行動を選ぶ。
【材料】と入力データにない物・色・場面を新しく足さない。
NG：本質を見抜く / 可能性を統合する / 優しい
OK：誰よりも早く動き出す / 納得するまで考え続ける / 最後までやり抜く

STEP 4 再解釈を探す
本人が短所だと思っている可能性のある特徴を、価値として捉え直せないか考える。

STEP 5 キャッチコピー化する
・25〜35文字程度
・「〜人」で終える
・前半は自然な行動、後半は意外な深さや魅力
・前半と後半は自然につながる（「〜て、」「〜ながら、」でつなぐ）
・「のに」禁止 / 動詞の単独使用禁止

【入力データ】
${inputData}
${CONFIDENTIAL_RULE}
${GENDER_RULE}
STEP 1〜4の思考は出力しない。最も心が動く一行を1つだけ出力してください。前置き・説明不要。` },
    { title:"現象サマリー", prompt:`あなたはKOTONEという自己理解診断アプリの診断文ライターです。
【タスク】入力データの「この人の核」が、日常で好ましい形で発揮されている場面を書いてください。
周りの人がうれしい・楽しい・助かったと感じている瞬間を切り取ります。
場面は、先に書かれた【お名前から見えること】の動き方と、【お誕生日から見えること】の使命の両方が表れるものにする。
【お名前から見えること】
__NAME__
【お誕生日から見えること】
__BIRTH__
【出力構造（厳守）】
① この人の力が自然に活きている日常の場面を1文で（書き出し自由・定型句禁止）
② 「たとえば、〜」で始まる具体シーン（2〜3文）。周囲の人の好意的なセリフを「」付きで1つ含める（感謝・驚き・楽しさ・「あなたがいると〜」など）
③ その場面の根っこにある力を、温かく1文で言い添える（「でも」で始めない）。入力データの「名前と生まれた日の重なり」に合わせる：二重に刻まれた→名前と生まれた日の両方に刻まれた力として／響き合う→名前の力と生まれ持った力が支え合う形として／一部重なる→重なる部分がとくに強く表れる形として／二つの顔→二つの面が奥行きになる形として
【禁止】周囲の困惑・苦情・ツッコミ・誤解（「また変わったの？」「そろそろ結論を」等）/ 短所や影の示唆（影は別セクションで扱う）/ 「かもしれません」の連続（使うのは1回まで）
【入力データ】
${inputData}
${CONFIDENTIAL_RULE}
${GENDER_RULE}
構造①〜③のみ出力。前置き不要。` },
    { title:"お名前から見えること", prompt:`あなたはKOTONEという自己理解診断アプリの診断文ライターです。
【タスク】入力データの「名(エンジン)」の情報だけをもとに、この人の自然な動き方を書いてください。
【重要】このセクションはお名前だけを扱います。お誕生日・数秘・エネルギー条件・タイミングへの言及は厳禁。
【出力構造（厳守）】
① この人の動き方の特徴を1文で（書き出し自由・構造用語禁止・定型句禁止）
② 具体的な状況→行動→結果の流れ（2〜3文）
③ 「この動き方は、〜という形で現れやすいかもしれません」（1文）
【入力データ】
${nameInput}
${CONFIDENTIAL_RULE}
${GENDER_RULE}
構造①〜③のみ出力。前置き不要。` },
    { title:"お誕生日から見えること", prompt:`あなたはKOTONEという自己理解診断アプリの診断文ライターです。
【タスク】入力データの「◆ 誕生日」だけをもとに、この人が生まれ持った使命と、それを支える才能・育ちの土壌を書いてください。
【重要】このセクションはお誕生日だけを扱います。お名前・名前の音・名前との重なりへの言及は厳禁。
主役は「使命」。「才能」と「育ちの土壌」は使命を支える補助として扱う。
【出力構造（厳守）】
① この人が生まれ持った使命を1文で（書き出し自由・数字禁止・定型句禁止）
② その使命を、才能と育ちの土壌がどう支えているか（2文。「たとえば〜」で具体的な場面を1つ含める）
③ この人が生まれ持った使命を、言い切りで1文にまとめ直す（「あなたが生まれ持った使命は、〜ことです」の形。①と同じ言い回しを繰り返さない）
【入力データ】
${birthdayInput}
${CONFIDENTIAL_RULE}
${GENDER_RULE}
構造①〜③のみ出力。前置き不要。` },
    { title:"光と影", prompt:`あなたはKOTONEという自己理解診断アプリの診断文ライターです。
【タスク】この人の「強みが強く出すぎる時に何が起きるか」を書いてください。
【出力構造（厳守）】
■ 強みが活きる時
あなたの「〜する力」は、〜（強みの源泉：なぜその力が生まれるかを1文）
■ その力が強く出すぎると——
〜（メカニズム：なぜそうなるかの因果を1〜2文）
周りからは「〜」（具体的なセリフ形式）と見えています。
結果として、〜可能性があります。
【ルール】光と影はセット / 周囲のセリフは「」付き / 最後は「可能性があります」
【入力データ】
${inputData}
${CONFIDENTIAL_RULE}
${GENDER_RULE}
出力構造のみ。前置き不要。` },
    { title:"締め", prompt:`あなたはKOTONEという自己理解診断アプリの診断文ライターです。
【タスク】この診断を読んだ人への「小さな次の一手」を書いてください。

【重要】この診断のキャッチコピーは「__CATCH__」です。
締めの内容はこのキャッチコピーと整合し、その人物像を引き受けた上で背中を押す言葉にしてください。

【出力構造（厳守）】
① この人の本質を1文で言い換える（書き出し自由・定型句禁止・キャッチコピーと整合すること）
② 「まず〜を試してみてください」（「やりきる」「完走する」等の完遂表現を使う）
③ 「それがあなたの〜かもしれません」（温かく背中を押す）
【ルール】称賛禁止 / 「届ける」等の意味ズレ禁止 / 「お名前とお誕生日から」で始めない
【入力データ】
${inputData}
${CONFIDENTIAL_RULE}
${GENDER_RULE}
構造①〜③のみ出力。前置き不要。` },
  ];
}
