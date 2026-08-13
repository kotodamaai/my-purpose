// KOTONE 検証ハーネス: two-call方式(意味構造→表現生成の2段階)のプロンプトテンプレート
//
// 依頼書1-D参照。unified方式と同じ理由で、これは本番文言の複製ではなく新規の実験的処方。
// 1回目の呼び出しで中間表現(意味構造のJSON)を取得し、2回目の呼び出しでそれを元に
// 最終的な診断文(6セクション)を生成する。
//
// キャッシュ対応(依頼書1-C): 動的な部分(inputData、1回目の結果である構造JSON)を
// 末尾にまとめ、それより前(STATIC_PREFIX)を丸ごとcache_control対象にできる構成にしてある。

import { CONFIDENTIAL_RULE } from './promptTemplates.js';
import { UNIFIED_KEY_TO_TITLE } from './promptTemplatesUnified.js';

export const TWO_CALL_PROMPT_VERSION = "harness-two-call-v0.1";
export const TWO_CALL_STRUCTURE_MAX_TOKENS = 500;
export const TWO_CALL_GENERATION_MAX_TOKENS = 2000;

export const TWO_CALL_KEY_TO_TITLE = UNIFIED_KEY_TO_TITLE;

// --- 1回目呼び出し(意味構造抽出) ---

export const TWO_CALL_STRUCTURE_STATIC_PREFIX = `あなたはKOTONEという自己理解診断アプリの分析担当です。
入力データを読み、この人物についての「意味構造」を抽出してください。
まだ最終的な診断文は書かず、後工程の執筆者が使う中間表現だけを出力します。

【出力形式(厳守)】
前置き・説明・コードフェンスは付けず、次のキーだけを持つJSONオブジェクト1つだけを出力してください。
{
  "hypothesis": "この人らしさを1つだけ挙げるなら何か(短文)",
  "source_axes": ["K-given", "N-role"],
  "supporting_elements": ["根拠になる入力データ上の要素を2〜4個、短い日本語で"],
  "conditions": ["どのシチュエーション/条件でこの傾向が強く出るか、短い日本語で1〜3個"],
  "confidence": "high|medium|low"
}
※ source_axesは実際に使った軸だけを入れる(N入力が無い場合は"N-role"を含めない)。

`;

export function buildStructureDynamicSuffix(inputData) {
  return `【入力データ】
${inputData}`;
}

export function buildStructurePrompt(inputData) {
  return TWO_CALL_STRUCTURE_STATIC_PREFIX + buildStructureDynamicSuffix(inputData);
}

// --- 2回目呼び出し(最終文章生成) ---

export const TWO_CALL_GENERATION_STATIC_PREFIX = `あなたはKOTONEという自己理解診断アプリの診断文ライターです。
「意味構造」と「入力データ」をもとに、6つのセクションをまとめて1回で出力してください。
意味構造は分析担当が既に抽出したものなので、そこから外れた新しい解釈を作らないこと。

${CONFIDENTIAL_RULE}

【出力する6セクション】
① catch: キャッチコピー。25〜35文字程度、「〜人」で終える。意味構造のhypothesisを反映すること。
② phenomena: 現象サマリー。①日常によく起きる場面を1文→②「たとえば、〜」の具体シーン(2〜3文・セリフ「」付き1つ)→③本人の内心1文。
③ name_insight: お名前から見えること。「名(エンジン)」情報のみ。お誕生日・数秘への言及は厳禁。①動き方の特徴1文→②状況→行動→結果(2〜3文)→③現れやすい形1文。
④ birthday_insight: お誕生日から見えること。「数秘(エネルギー条件)」情報のみ。①エネルギー特性1文(数字禁止)→②「お名前から来る動き方に、〜という条件が加わることで」(2文)→③補足1文。
⑤ light_shadow: 光と影。「■ 強みが活きる時」→「■ その力が強く出すぎると——」→セリフ「」付き→「結果として、〜可能性があります」。
⑥ closing: 締め。①本質の言い換え(catchと整合)→②「まず〜を試してみてください」→③「それがあなたの〜かもしれません」。称賛禁止。

【出力形式(厳守)】
前置き・説明・コードフェンスは付けず、次のキーだけを持つJSONオブジェクト1つだけを出力してください。
{"catch":"...","phenomena":"...","name_insight":"...","birthday_insight":"...","light_shadow":"...","closing":"..."}

`;

export function buildGenerationDynamicSuffix(inputData, structureJson) {
  return `【意味構造】
${JSON.stringify(structureJson)}

【入力データ】
${inputData}`;
}

export function buildGenerationPrompt(inputData, structureJson) {
  return TWO_CALL_GENERATION_STATIC_PREFIX + buildGenerationDynamicSuffix(inputData, structureJson);
}
