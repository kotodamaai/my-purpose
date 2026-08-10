// KOTONE 検証ハーネス: プロンプト組み立て
//
// k_input / n_input / interaction_input / context_input の4オブジェクトを、
// ここで初めて1本の文字列(inputData)に結合する。設計原則(§2.1)通り、
// この関数が呼ばれる直前まで4つは別々のオブジェクトとして存在している。
//
// ここで組み立てる inputData のラベル体系(強度/持続性/タイミング等の表現)は、
// 本番 src/data/prompts.js の buildPromptInput と同じ閾値・同じ日本語表現を採用する
// (K/N寄与の測定対象が本番と乖離しないようにするため)。ただし本番と違い、
// n_inputがnull(A1: K-only)/interactionが意図的に不使用(A5)というケースが
// 実在するため、その旨を明示する分岐を追加している。これは「プロンプト文言
// (STEP構成・出力構造・ルール文)」の変更ではなく、4arm分の入力バリエーションを
// 表現するために必要な、データ整形部分の拡張。
//
// scenario情報(シチュエーション)は本番のbuildPromptInputには存在しない、
// このハーネス固有の追加ブロック。既存の◆ブロック構成に倣い、末尾に追加する。

import { buildSectionPrompts, HARNESS_PROMPT_VERSION } from './promptTemplates.js';

const TIMING_MAP = {
  immediate: "すぐに動き始める",
  delayed: "じっくり時間をかけて動く",
  cyclic: "繰り返しながら動く",
  early: "早めに動き始める",
};

function labelWeight(w) {
  if (w >= 2) return "強い";
  if (w <= -1) return "弱め";
  return "標準";
}

function labelPersistence(p) {
  if (p >= 2) return "長続き";
  if (p <= -1) return "波あり";
  return "標準";
}

function buildInputDataString({ k_input, n_input, interaction_input, context_input }, scenario) {
  const genderStr = context_input.gender === "male" ? "男性" : context_input.gender === "female" ? "女性" : "その他/不明";
  const bloodStr = context_input.bloodType && context_input.bloodType !== "unknown" ? `${context_input.bloodType}型` : "不明";

  let directionStr = "不明";
  if (k_input) {
    const derived = k_input.derived;
    if (derived && derived.complex_flag && derived.complex_pair) {
      directionStr = `${derived.complex_pair[0]}と${derived.complex_pair[1]}が拮抗(僅差)`;
    } else {
      directionStr = k_input.direction;
    }
  }

  const nameBlock = `◆ 名(エンジン)
動きの方向: ${directionStr}
プロセス: ${k_input ? k_input.process.join(" → ") : "不明"}
修飾: ${k_input && k_input.modifier && k_input.modifier.length ? k_input.modifier.join(", ") : "なし"}`;

  let numerologyBlock;
  if (!n_input) {
    numerologyBlock = `◆ 数秘(エネルギー条件)
(この検証条件ではN入力を使用しない)`;
  } else {
    const weightLabel = labelWeight(n_input.weight ?? 0);
    const persistLabel = labelPersistence(n_input.persistence ?? 0);
    const timingStr = n_input.timing && n_input.timing.length
      ? n_input.timing.map(t => TIMING_MAP[t] || t).join(" + ")
      : "標準";
    numerologyBlock = `◆ 数秘(エネルギー条件)
強度: ${weightLabel} / 持続性: ${persistLabel} / タイミング: ${timingStr}`;
  }

  const surnameLabels = k_input && k_input.surnameInterface ? k_input.surnameInterface.labels : null;
  const surnameBlock = surnameLabels
    ? `◆ 姓(インターフェース)
openness: ${surnameLabels.openness} / visibility: ${surnameLabels.visibility} / scale: ${surnameLabels.scale} / stability: ${surnameLabels.stability} / constraint: ${surnameLabels.constraint}`
    : `◆ 姓(インターフェース)
不明(姓未入力)`;

  let interactionBlock;
  if (interaction_input && interaction_input.omitted) {
    interactionBlock = `◆ 名×姓 interaction
(この検証条件ではinteractionを使用しない)`;
  } else if (interaction_input && interaction_input.interaction && interaction_input.interaction.length) {
    interactionBlock = `◆ 名×姓 interaction
${interaction_input.interaction.map(o => `${o.type}: ${o.note}`).join("\n")}`;
  } else {
    interactionBlock = `◆ 名×姓 interaction
(該当なし)`;
  }

  const scenarioBlock = `◆ シチュエーション
${scenario.label}(${scenario.purpose})`;

  return `◆ 属性
性別: ${genderStr} / 血液型: ${bloodStr}

${nameBlock}

${numerologyBlock}

${surnameBlock}

${interactionBlock}

${scenarioBlock}`;
}

/**
 * 6セクション分のプロンプトを組み立てる。
 * 締め(index 5)の "__CATCH__" 置換は行わない(呼び出し側=runner.jsが
 * セクション0の生成結果を受け取った後に置換する。本番aiGenerator.jsと同じ順序)。
 *
 * @param {{k_input, n_input, interaction_input, context_input}} inputs
 * @param {{label: string, purpose: string}} scenario
 * @returns {Array<{title: string, prompt: string}>}
 */
export function assembleAllSectionPrompts(inputs, scenario) {
  const inputData = buildInputDataString(inputs, scenario);
  return buildSectionPrompts(inputData);
}

export { HARNESS_PROMPT_VERSION };
