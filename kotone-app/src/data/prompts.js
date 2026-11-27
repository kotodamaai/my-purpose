import { SOUND_MATERIAL, DAKUON_MAP, GLIDE_MAP, HANDAKUON } from "./L1_dictionary.js";
import { SOUND_SHADOW } from "./soundShadow.js";
import { NUMEROLOGY_L3 } from "./numerology.js";
import { normalizeKana } from "../utils/kotodamaEngine.js";

export const PROXY_URL = "https://kotone-proxy.daiya-asset-management.workers.dev";

// ver3.5（MY PURPOSE Ⅱ）：誕生日＝使命の候補、名前＝道具。二つをつなぐのは最後の「問い」で本人に委ねる。
//   設計：claude/KOTONE_ver3_5_案_使命の候補構成.md

// 全セクション共通の禁止
export const CONFIDENTIAL_RULE = `【絶対禁止】
× 音名（ひらがな一文字の呼称）× 数字解説 × 構造用語（外向・内向・収束・拡散・起点・切断・保持・接続・二面性等）
× システム説明（言霊・音霊・数秘術・五行・L1・L2等）
× 「あなたは〜な人です」と人柄を断定する言い方
× 未来の予言・運勢の良し悪し
× 書き出しに「お名前から」「お誕生日から」「お名前とお誕生日から」を使う`;

// 場面を書くセクションだけにかける（ver3.5 で共通ルールから分けた。使命の一文の言い切りとぶつかっていたため）
export const HYPOTHESIS_RULE = `【必須】「〜傾向があります」「〜かもしれません」の仮説提示型 / 「たとえば〜」を含む具体的な場面`;

// 性別の扱い（ver2.2）：核と才能は性別で変えない。性別は言葉づかいにだけ使う
export const GENDER_RULE = `【性別の扱い】
・性別は、呼びかけや言葉づかいが不自然にならないためだけに使う。性格・才能・場面の読みには使わない
・入力データの特徴は渡された順番のまま扱う（何を主役にするかは入力データの指示に従う）。性別を理由に、前に出す特徴を入れ替えたり弱めたりしない
・場面や小物を、性別からの決まりきった連想で選ばない（家事・装い・恋愛・「母親役」「兄貴分」など）
・入れ替えテスト：書いた場面が、性別を入れ替えても不自然にならないかを確かめ、不自然なら場面を替える`;

// 名の頭の音（核）を決め打ちで取り出す（AIに主役を選ばせない）
//   base: 清音に寄せた音／voiced: 濁音だった／semi: 半濁音だった
export function getCoreSound(firstName) {
  const n = normalizeKana(firstName || "");
  for (const ch of n) {
    if (GLIDE_MAP && GLIDE_MAP[ch]) continue;
    const base = DAKUON_MAP[ch] || ch;
    if (SOUND_MATERIAL[base]) {
      const semi = HANDAKUON.has(ch);
      return { base, voiced: !semi && base !== ch, semi };
    }
  }
  return null;
}
export function getCoreFromName(firstName) {
  const c = getCoreSound(firstName);
  return c ? SOUND_MATERIAL[c.base] : null;
}

const genderLabel = (gender) => (gender === "male" ? "男性" : gender === "female" ? "女性" : "その他");
const attrBlock = (gender) => `◆ 属性
性別: ${genderLabel(gender)}（言葉づかいのためだけに使う）`;

// 誕生日の3つの役割を、数字を出さずに文章で渡す（数字解説は禁止のため）
//   使命＝使命文（「〜こと」）／才能＝力名＋行動傾向（何ができるか）／育ちの土壌＝土壌文（第1周期・人生の前半の空気）
const L3 = (num) => NUMEROLOGY_L3[num] || null;
export function buildBirthdayBlock(n_L1) {
  if (!n_L1 || !n_L1.roles) return "◆ 誕生日\n（生年月日なし）";
  const m = L3(n_L1.roles.mission.num), ta = L3(n_L1.roles.talent.num), so = L3(n_L1.roles.soil.num);
  return `◆ 誕生日
使命（主役。生まれ持った使命の候補）: ${m && m.使命文 ? m.使命文 : "不明"}
才能（補助。生まれた日から。何ができるか）: ${ta ? `${ta.力名}。${ta.行動傾向}` : "不明"}
育ちの土壌（補助。生まれた月から。人生の前半の空気）: ${so && so.土壌文 ? so.土壌文 : "不明"}`;
}
// 使命のサイン用：使命と、使命の数の光と影・行動傾向だけ（才能・土壌は渡さない。「生まれ持った使命」との繰り返しを避ける）
export function buildMissionSignBlock(n_L1) {
  if (!n_L1 || !n_L1.roles) return "◆ 使命\n（生年月日なし）";
  const m = L3(n_L1.roles.mission.num);
  if (!m) return "◆ 使命\n不明";
  return `◆ 使命
使命（生まれ持った使命の候補）: ${m.使命文}
使命が生きているときの動き: ${m.行動傾向}
使命の光と影: ${m.光と影}`;
}

// 名前の材料（核・名・姓・名×姓）
export function buildNameBlock(firstName, adjustedState, ln_interface) {
  let directionStr = "不明";
  if (adjustedState) {
    const derived = adjustedState.derived;
    directionStr = derived && derived.complex_flag && derived.complex_pair
      ? `${derived.complex_pair[0]}と${derived.complex_pair[1]}が拮抗(僅差)`
      : adjustedState.direction;
  }
  const interStr = adjustedState && adjustedState.interaction ? adjustedState.interaction.map(o => `${o.type}: ${o.note}`).join("\n") : "（姓未入力）";
  const L = ln_interface ? ln_interface.labels : null;
  return `◆ この人の核（最優先。主役の特徴はこれに固定する）
${getCoreFromName(firstName) || "（取得できず）"}

◆ 名(エンジン)
動きの方向: ${directionStr}
プロセス: ${adjustedState ? adjustedState.process.join(" → ") : "不明"}
修飾: ${adjustedState && adjustedState.modifier && adjustedState.modifier.length ? adjustedState.modifier.join(", ") : "なし"}

◆ 姓(インターフェース)
openness: ${L ? L.openness : "不明"} / visibility: ${L ? L.visibility : "不明"} / scale: ${L ? L.scale : "不明"} / stability: ${L ? L.stability : "不明"} / constraint: ${L ? L.constraint : "不明"}

◆ 名×姓 interaction
${interStr}`;
}

// 道具のサイン用：核の音の影の辞書（シャドー v3.1 の【活きるとき】【歪むとき】）
export function buildToolShadowBlock(firstName, adjustedState) {
  const c = getCoreSound(firstName);
  const sh = c ? SOUND_SHADOW[c.base] : null;
  const note = c && c.voiced ? "\n（響きに重みがあるので、活きるときも歪むときも強めに出やすい）"
    : c && c.semi ? "\n（響きに弾みがあるので、軽やかに跳ねるように出やすい）" : "";
  const shadow = sh ? `活きる場面の型: ${sh.活きる場面}
活きているときの周りの見え方: ${sh.活きる見え方}
本人の感覚: ${sh.本人感覚}
歪むときの行動: ${sh.歪む行動}
周りの声の型: ${sh.型セリフ}
気づきにくい仕組み: ${sh.気づかぬ構造}${sh.二面性との揺れ ? `\n揺れ（主軸のあとに一言だけ添えてよい）: ${sh.二面性との揺れ}` : ""}${note}` : "（取得できず）";
  return `◆ この人の核（道具。主役はこれに固定する）
${getCoreFromName(firstName) || "（取得できず）"}

◆ 道具の活きるとき・歪むとき
${shadow}

◆ 名(エンジン)
動きの方向: ${adjustedState ? adjustedState.direction : "不明"}
プロセス: ${adjustedState ? adjustedState.process.join(" → ") : "不明"}`;
}

// セクションごとの入力（ver3.5：全部入りの入力は使わない。五行の重なり・エネルギー条件は渡さない）
//   引数の n_adj・overlap は互換のために受け取るだけで使わない
// eslint-disable-next-line no-unused-vars
export function buildSectionInputs(firstName, lastName, gender, adjustedState, ln_interface, n_adj, n_L1, overlap) {
  const attr = attrBlock(gender);
  return {
    attr,
    mission: `${attr}\n\n${buildBirthdayBlock(n_L1)}`,
    missionSigns: `${attr}\n\n${buildMissionSignBlock(n_L1)}`,
    tool: `${attr}\n\n${buildNameBlock(firstName, adjustedState, ln_interface)}`,
    toolSigns: `${attr}\n\n${buildToolShadowBlock(firstName, adjustedState)}`,
  };
}

const RULES = (withHypothesis) => `${CONFIDENTIAL_RULE}${withHypothesis ? `\n${HYPOTHESIS_RULE}` : ""}\n${GENDER_RULE}`;

// 表示の順番：0 キャッチ／1 生まれ持った使命／2 使命のサイン／3 道具／4 道具のサイン／5 問い
export const SECTION_TITLES = [
  "あなたはこんな人",
  "生まれ持った使命",
  "使命に近づくとき・遠ざかるとき",
  "お名前が持つ道具",
  "道具がよく働くとき・使いすぎたとき",
  "あなたへの問い",
];

export function buildSectionPrompts(inputs) {
  return [
    { title: SECTION_TITLES[0], prompt:`あなたはKOTONEという自己理解診断アプリの、一流のコピーライターです。
診断を受けた人が「これ、わたしのことだ」と感じ、心が動く一行を書いてください。

【ゴール】読んだ人の感情を動かす：
ワクワク（可能性に気づく高揚）/ 温かさ（肯定されるじんわりした安心）
安らぎ（ありのままでいい落ち着き）/ 興奮（自分の中の力に火がつく感覚）

【材料（先に書かれた診断文。キャッチはここからだけ作る）】
＜お名前が持つ道具＞
__TOOL__
＜生まれ持った使命＞
__MISSION__

【必ず以下の順序で思考してから書くこと】
STEP 1 主役は【材料】の「お名前が持つ道具」（この人の核の動き）に固定する。複数の特徴を並べない
STEP 2 前半は道具の自然な行動、後半は「生まれ持った使命」の向かう先にする
STEP 3 能力・性格・抽象概念を書かない。【材料】に書かれている行動から、実際に目撃できる行動を選ぶ。【材料】にない物・色・場面を新しく足さない
NG：本質を見抜く / 可能性を統合する / 優しい
OK：誰よりも早く動き出す / 納得するまで考え続ける / 最後までやり抜く
STEP 4 前半と後半は「〜ながら、」「〜て、」でつなぐ。「だから」「〜ために」「〜することで〜を果たす」のような因果のつなぎは使わない（道具と使命のつなぎ方は、本人に委ねるため）
STEP 5 キャッチコピー化する
・25〜35文字程度
・「〜人」で終える
・「のに」禁止 / 動詞の単独使用禁止

【入力データ】
${inputs.attr}
${RULES(false)}
STEP 1〜4の思考は出力しない。最も心が動く一行を1つだけ出力してください。前置き・説明不要。` },

    { title: SECTION_TITLES[1], prompt:`あなたはKOTONEという自己理解診断アプリの診断文ライターです。
【タスク】入力データの「◆ 誕生日」だけをもとに、この人が生まれ持った使命の候補を一つ示してください。
主役は「使命」。「才能」と「育ちの土壌」は、使命を支える補助として扱う。
【重要】お名前・名前の音への言及は厳禁。使命の意味を足したり、別の使命に言い換えたりしない。
【出力構造（厳守）】
① 「あなたが生まれ持った使命の一つは、〜ことです。」（使命の意味を保ち、言い回しは自然に整えてよい。この一文だけは言い切ってよい）
② その使命を、才能がどう支えているか（1〜2文。「たとえば〜」で目撃できる行動を1つ含める）
③ 育ちの土壌：人生の前半、どんな空気の中で何を身につけてきたか（1文。「〜してきたのではないでしょうか」のように、本人が思い当たるかを確かめられる書き方にする）
【入力データ】
${inputs.mission}
${RULES(false)}
構造①〜③のみ出力。前置き不要。` },

    { title: SECTION_TITLES[2], prompt:`あなたはKOTONEという自己理解診断アプリの診断文ライターです。
【タスク】この人の使命が日常で生きているときと、使命から遠ざかっているときの合図を書いてください。
影は欠点として裁かず、「今、使命から少し離れている」と気づくための合図として書く。
【重要】お名前・名前の音への言及は厳禁。
【出力構造（厳守）】
■ 使命に近づいているとき
「たとえば、〜」で始まる具体的な場面（2文）。周りの人の好意的なセリフを「」付きで1つ含める。
■ 使命から遠ざかっているとき
内側で起きていること（1文）と、周りからの見え方（1文）。最後は「〜は、使命から少し離れている合図かもしれません。」で終える。
【禁止】直し方の命令（「〜しなさい」「〜すべき」）／欠点としての指摘／入力にない物・色・場面を足す
【入力データ】
${inputs.missionSigns}
${RULES(true)}
出力構造のみ。前置き不要。` },

    { title: SECTION_TITLES[3], prompt:`あなたはKOTONEという自己理解診断アプリの診断文ライターです。
【タスク】入力データの「名(エンジン)」と「姓」の情報だけをもとに、この人が持って生まれた道具＝自然な動き方を書いてください。
【重要】お誕生日・使命への言及は厳禁。「何ができるか（能力）」ではなく「どう動くか」を書く。
【出力構造（厳守）】
① この人の動き方の特徴を1文で（書き出し自由・構造用語禁止・定型句禁止）
② 具体的な状況→行動→結果の流れ（2〜3文）
③ 「この動き方が、あなたが持って生まれた道具なのかもしれません。」の形で、道具を一言にまとめる（1文）
【入力データ】
${inputs.tool}
${RULES(true)}
構造①〜③のみ出力。前置き不要。` },

    { title: SECTION_TITLES[4], prompt:`あなたはKOTONEという自己理解診断アプリの診断文ライターです。
【タスク】この人の道具（核の動き）が、よく働いているときと、使いすぎたときを書いてください。
二つが同じ動きから生まれることが伝わるようにする。
【重要】お誕生日・使命への言及は厳禁。入力の「道具の活きるとき・歪むとき」の範囲から出ない。
【出力構造（厳守）】
■ 道具がよく働くとき
「たとえば、〜」で始まる具体的な場面（2文）。周りの人の好意的なセリフを「」付きで1つ。本人の感覚を1文。
■ 使いすぎたとき
同じ動きが強く出すぎた場面（1〜2文）。周りの声を「」付きで1つ（入力の「周りの声の型」を場面に合わせて言い換える）。
最後に、気づきにくい仕組みを1文（「〜と感じられることがあります」のように柔らかく）。
【ルール】性質のラベルを直接出さない／周りの声は各見出しで1つずつ／本人の感覚と周りの見え方を両方示す
【入力データ】
${inputs.toolSigns}
${RULES(true)}
出力構造のみ。前置き不要。` },

    { title: SECTION_TITLES[5], prompt:`あなたはKOTONEという自己理解診断アプリの診断文ライターです。
【タスク】この診断を読んだ人が、自分の経験と照らし合わせるための問いを書いてください。
使命と道具をどうつなぐかは、本人に委ねる。答えを先に書かない。

【材料（先に書かれた診断文。ここからだけ作る）】
＜生まれ持った使命＞
__MISSION__
＜お名前が持つ道具＞
__TOOL__

【出力構造（厳守）】
① 使命の候補と道具を、それぞれ短く並べ直す（1文。二つをつなぐ解釈を足さない）
② 問いを1つ：「あなたの〜（道具）が、〜（使命）の方向で働いた場面は、これまでにありましたか。」の形を基本に、自然に言い換える
③ 一言で手渡す（1文）：思い当たる場面があれば、それが使命を確かめるいちばんの手がかりになる、という趣旨
【禁止】称賛／命令（「〜してください」）／予言／「かもしれません」の多用
【入力データ】
${inputs.attr}
${RULES(false)}
構造①〜③のみ出力。前置き不要。` },
  ];
}
