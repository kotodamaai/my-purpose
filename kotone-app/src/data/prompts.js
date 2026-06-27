export const PROXY_URL = "https://kotone-proxy.daiya-asset-management.workers.dev";

export const CONFIDENTIAL_RULE = `【絶対禁止】
× 音名（ひらがな一文字の呼称）× 数字解説 × 構造用語（外向・内向・収束・拡散・起点・切断・保持・接続等）
× システム説明（言霊・音霊・数秘術・L1・L2等） × 断定表現（「あなたは〜です」）
【必須】「〜傾向があります」「〜可能性があります」「〜かもしれません」の仮説提示型
「たとえば〜」を含む具体的行動シーン / 「お名前から」「お誕生日から」の枕詞`;

export function buildPromptInput(firstName, lastName, gender, bloodType, adjustedState, ln_interface, n_adj) {
  const weightLabel = n_adj && n_adj.weight >= 2 ? "強い" : n_adj && n_adj.weight <= -1 ? "弱め" : "標準";
  const persistLabel = n_adj && n_adj.persistence >= 2 ? "長続き" : n_adj && n_adj.persistence <= -1 ? "波あり" : "標準";
  const timingMap = { immediate:"すぐに動き始める", delayed:"じっくり時間をかけて動く", cyclic:"繰り返しながら動く", early:"早めに動き始める" };
  const timingStr = n_adj && n_adj.timing ? n_adj.timing.map(t => timingMap[t]||t).join(" + ") : "標準";
  const interStr = adjustedState && adjustedState.interaction ? adjustedState.interaction.map(o=>`${o.type}: ${o.note}`).join("\n") : "（姓未入力）";
  const genderStr = gender === "male" ? "男性" : gender === "female" ? "女性" : "その他";
  const bloodStr = bloodType || "不明";

  return `◆ 属性
性別: ${genderStr} / 血液型: ${bloodStr}型

◆ 名(エンジン)
動きの方向: ${adjustedState ? adjustedState.direction : "不明"}
プロセス: ${adjustedState ? adjustedState.process.join(" → ") : "不明"}
修飾: ${adjustedState && adjustedState.modifier && adjustedState.modifier.length ? adjustedState.modifier.join(", ") : "なし"}
数秘補正後の優先motion: ${n_adj && n_adj.priority && n_adj.priority.length ? n_adj.priority.join(", ") : "なし"}

◆ 数秘(エネルギー条件)
強度: ${weightLabel} / 持続性: ${persistLabel} / タイミング: ${timingStr}

◆ 姓(インターフェース)
openness: ${ln_interface ? ln_interface.labels.openness : "不明"} / visibility: ${ln_interface ? ln_interface.labels.visibility : "不明"} / scale: ${ln_interface ? ln_interface.labels.scale : "不明"} / stability: ${ln_interface ? ln_interface.labels.stability : "不明"} / constraint: ${ln_interface ? ln_interface.labels.constraint : "不明"}

◆ 名×姓 interaction
${interStr}`;
}

export function buildSectionPrompts(inputData) {
  return [
    { title:"キャッチコピー", prompt:`あなたはKOTONEという自己理解診断アプリの、一流のコピーライターです。
診断を受けた人が「これ、わたしのことだ」と感じ、心が動く一行を書いてください。

【ゴール】読んだ人の感情を動かす：
ワクワク（可能性に気づく高揚）/ 温かさ（肯定されるじんわりした安心）
安らぎ（ありのままでいい落ち着き）/ 興奮（自分の中の力に火がつく感覚）

【必ず以下の順序で思考してから書くこと】

STEP 1 主役を決める
複数の特徴を並べない。入力データの中で「この人らしさを1つだけ挙げるなら」を決める。

STEP 2 ギャップを探す
主役の特徴から連想される一般的なイメージを考える。
次に、入力データの中でその人が持つ「意外な一面」を探す。
人は長所そのものより、意外な組み合わせに魅力を感じる。

STEP 3 行動で表現する
能力・性格・抽象概念を書かない。実際に目撃できる行動に変換する。
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
STEP 1〜4の思考は出力しない。最も心が動く一行を1つだけ出力してください。前置き・説明不要。` },
    { title:"現象サマリー", prompt:`あなたはKOTONEという自己理解診断アプリの診断文ライターです。
【タスク】入力データを読み、この人の「日常でよく起きる現象」を書いてください。
【出力構造（厳守）】
① 「〜な場面が多い人かもしれません」（1文）
② 「たとえば、〜」で始まる具体シーン（2〜3文）・周囲のセリフを「」付きで1つ含める
③ 「でも本人は、〜と感じていることがあるかもしれません」（1文）
【入力データ】
${inputData}
${CONFIDENTIAL_RULE}
構造①〜③のみ出力。前置き不要。` },
    { title:"お名前から見えること", prompt:`あなたはKOTONEという自己理解診断アプリの診断文ライターです。
【タスク】お名前から導かれる「この人の自然な動き方」を書いてください。
【出力構造（厳守）】
① 「お名前から見えてくるのは、〜という動き方です」（1文・構造用語禁止）
② 具体的な状況→行動→結果の流れ（2〜3文）
③ 「この動き方は、〜という形で現れやすいかもしれません」（1文）
【入力データ】
${inputData}
${CONFIDENTIAL_RULE}
構造①〜③のみ出力。前置き不要。` },
    { title:"お誕生日から見えること", prompt:`あなたはKOTONEという自己理解診断アプリの診断文ライターです。
【タスク】お誕生日から導かれる「この人のエネルギーの特性」を書いてください。
【出力構造（厳守）】
① 「お誕生日から見えてくるのは、〜というエネルギーの出方です」（1文・数字禁止）
② 「お名前から来る動き方に、〜という条件が加わることで」（2文）
③ 「その分、〜という面もあるかもしれません」（1文）
【入力データ】
${inputData}
${CONFIDENTIAL_RULE}
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
出力構造のみ。前置き不要。` },
    { title:"締め", prompt:`あなたはKOTONEという自己理解診断アプリの診断文ライターです。
【タスク】この診断を読んだ人への「小さな次の一手」を書いてください。
【出力構造（厳守）】
① 「お名前とお誕生日が示しているのは、〜ということかもしれません」
② 「まず〜を試してみてください」（「やりきる」「完走する」等の完遂表現を使う）
③ 「それがあなたの〜かもしれません」（温かく背中を押す）
【ルール】称賛禁止 / 「届ける」等の意味ズレ禁止
【入力データ】
${inputData}
${CONFIDENTIAL_RULE}
構造①〜③のみ出力。前置き不要。` },
  ];
}
