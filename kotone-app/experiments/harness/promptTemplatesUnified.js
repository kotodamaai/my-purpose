// KOTONE 検証ハーネス: unified方式(1レコード1呼び出し)のプロンプトテンプレート
//
// 重要: これは本番プロンプトの複製ではなく、依頼書1-Dで比較対象として新規に作る
// 「実験的な処方」。current方式(promptTemplates.js)は本番文言を一字一句維持する
// ベースラインとして変更しないが、unified/two-callはそもそも「6セクション分の
// 指示を1回の呼び出しにまとめても品質が保てるか」を検証する対象そのものなので、
// 文言を独自に構成してよい。
//
// K/N入力オブジェクトの物理分離は維持する。buildInputDataString の呼び出し
// (=k_input/n_input/interaction_input/context_inputの結合)はプロンプト文字列を
// 組み立てる最後の瞬間にのみ行う。
//
// キャッシュ対応(依頼書1-C): 動的な入力データ(inputData)を末尾に配置し、
// それより前(STATIC_PREFIX)を丸ごとcache_controlの対象にできる構成にしてある。

import { CONFIDENTIAL_RULE } from './promptTemplates.js';

export const UNIFIED_PROMPT_VERSION = "harness-unified-v0.1";
export const UNIFIED_MAX_TOKENS = 2000;

// JSONキー ⇔ 本番と同じセクションタイトルの対応(current方式と結果を横並び比較するため)
export const UNIFIED_KEY_TO_TITLE = {
  catch: "あなたはこんな人",
  phenomena: "現象サマリー",
  name_insight: "お名前から見えること",
  birthday_insight: "お誕生日から見えること",
  light_shadow: "光と影",
  closing: "締め",
};

// レコードをまたいで完全に不変な部分(キャッシュ対象)
export const UNIFIED_STATIC_PREFIX = `あなたはKOTONEという自己理解診断アプリの診断文ライターです。
入力データをもとに、6つのセクションをまとめて1回で出力してください。

${CONFIDENTIAL_RULE}

【出力する6セクション】
① catch: キャッチコピー。25〜35文字程度、「〜人」で終える。前半は自然な行動、後半は意外な深さや魅力。書き出し自由。
② phenomena: 現象サマリー。①この人の日常によく起きる場面を1文→②「たとえば、〜」で始まる具体シーン(2〜3文・セリフを「」付きで1つ含める)→③「でも本人は、〜と感じていることがあるかもしれません」(1文)。
③ name_insight: お名前から見えること。入力データの「名(エンジン)」情報のみを扱う。お誕生日・数秘・エネルギー条件・タイミングへの言及は厳禁。①動き方の特徴を1文→②具体的な状況→行動→結果の流れ(2〜3文)→③「この動き方は、〜という形で現れやすいかもしれません」。
④ birthday_insight: お誕生日から見えること。「数秘(エネルギー条件)」情報のみを扱う。①エネルギー特性を1文(数字禁止)→②「お名前から来る動き方に、〜という条件が加わることで」(2文)→③「その分、〜という面もあるかもしれません」。
⑤ light_shadow: 光と影。「■ 強みが活きる時」で強みの源泉を1文→「■ その力が強く出すぎると——」でメカニズムを1〜2文→周囲のセリフを「」付きで1つ→「結果として、〜可能性があります」で締める。
⑥ closing: 締め。①この人の本質を1文で言い換える(catchと整合すること)→②「まず〜を試してみてください」(やりきる/完走する等の完遂表現)→③「それがあなたの〜かもしれません」。称賛禁止、「届ける」等の意味ズレ禁止。

【出力形式(厳守)】
前置き・説明・コードフェンス(\`\`\`)は一切付けず、次のキーだけを持つJSONオブジェクト1つだけを出力してください。
{"catch":"...","phenomena":"...","name_insight":"...","birthday_insight":"...","light_shadow":"...","closing":"..."}

`;

// レコードごとに変わる部分(非キャッシュ)
export function buildUnifiedDynamicSuffix(inputData) {
  return `【入力データ】
${inputData}`;
}

// キャッシュを使わない呼び出し用に、結合済みの1本の文字列も提供する(hash計算等に使う)
export function buildUnifiedPrompt(inputData) {
  return UNIFIED_STATIC_PREFIX + buildUnifiedDynamicSuffix(inputData);
}
