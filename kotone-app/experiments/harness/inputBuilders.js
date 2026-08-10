// KOTONE 検証ハーネス: 入力ビルダー
//
// 本番 src/data/L1_dictionary.js / src/data/numerology.js / src/utils/kotodamaEngine.js /
// src/utils/numerologyEngine.js のロジックとデータを、検証時点(2026-08-09)の内容のまま
// 複製したもの。本番側は一切変更・参照しない(依頼書§1「本番コードは変更しない」に対応)。
// 本番側が将来変更されても、このファイルは追随させない — 検証対象(K/Nの定義そのもの)が
// 実行中にブレることを防ぐため。ロジックを更新する場合は k_version / n_version を必ず上げる。
//
// K由来とN由来の値は、この時点でも既に別々の関数・別々の戻り値オブジェクトとして
// 分離されている。buildKInput は N のフィールド(weight/priority/persistence/timing)を
// 一切含まない。

// ---------------------------------------------------------------------------
// 言霊L1辞書 v1.2 (本番 L1_dictionary.js より複製)
// ---------------------------------------------------------------------------
const KOTODAMA_L1 = {
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

const DAKUON_MAP = {
  "が":"か","ぎ":"き","ぐ":"く","げ":"け","ご":"こ",
  "ざ":"さ","じ":"し","ず":"す","ぜ":"せ","ぞ":"そ",
  "だ":"た","ぢ":"ち","づ":"つ","で":"て","ど":"と",
  "ば":"は","び":"ひ","ぶ":"ふ","べ":"へ","ぼ":"ほ",
  "ぱ":"は","ぴ":"ひ","ぷ":"ふ","ぺ":"へ","ぽ":"ほ",
};

// 姓インターフェース辞書 v0.2 (本番 L1_dictionary.js より複製)
const SURNAME_INTERFACE = {
  "あ": { openness: +2, scale: +1 },
  "い": { visibility: -1, constraint: +1 },
  "う": { openness: -2, scale: -1 },
  "え": { openness: +1, visibility: +1 },
  "お": { openness: +2, visibility: +1 },
  "か": { scale: +1, visibility: +1 },
  "き": { visibility: -1, constraint: +2 },
  "く": { openness: -1, stability: +1 },
  "け": { openness: +1, constraint: +1 },
  "こ": { stability: +2, constraint: +1 },
  "さ": { openness: +1, visibility: +1 },
  "し": { constraint: +1, stability: +1 },
  "た": { scale: +1, constraint: +1 },
  "て": { constraint: +1, visibility: +1 },
  "と": { scale: +1, openness: +1 },
  "つ": { scale: +1, constraint: +1 },
  "な": { stability: +2, openness: +1 },
  "に": { stability: +1, constraint: +1 },
  "ぬ": { openness: -1, stability: +1 },
  "ね": { stability: +1, openness: +1 },
  "の": { openness: +1, stability: +1 },
  "は": { openness: +2, visibility: +1 },
  "ひ": { visibility: +1, openness: +1 },
  "ふ": { openness: -1, stability: +1 },
  "へ": { openness: +1, visibility: +1 },
  "ま": { stability: +2, openness: +1 },
  "み": { visibility: +1, stability: +1 },
  "む": { openness: -2, visibility: -1 },
  "や": { openness: +1, visibility: -1 },
  "ゆ": { openness: -1, stability: +1 },
  "よ": { openness: +1, scale: +1 },
  "ら": { openness: +1, visibility: +1 },
  "り": { visibility: +1, constraint: +1 },
  "る": { openness: -1, stability: +1 },
  "れ": { openness: +1, visibility: +1 },
  "わ": { openness: +1, stability: +1 },
  "ん": { openness: -1, visibility: -1 },
  "ゃ": { openness: +1 },
  "ゅ": { openness: -1 },
  "ょ": { visibility: -1 },
};

// ---------------------------------------------------------------------------
// 数秘辞書 v1.1 / v0.1 (本番 numerology.js より複製。NUMEROLOGY_L3は監査対象外のため複製しない)
// ---------------------------------------------------------------------------
const NUMEROLOGY_L1 = {
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

const NUMEROLOGY_ADJUST = {
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

// ---------------------------------------------------------------------------
// 言霊エンジン(本番 kotodamaEngine.js より複製)
// ---------------------------------------------------------------------------
const NATURAL_ORDER = ["起点", "拡散", "収束", "接続", "切断", "保持"];
const DOMINANCE_MARGIN_THRESHOLD = 0.15;

function decomposeSounds(name) {
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

function deriveDirection(distribution, totalWeight) {
  const sorted = Object.entries(distribution).sort((a, b) => b[1] - a[1]);
  const [dominant_direction, topScore] = sorted[0] || ["中立", 0];
  const secondScore = sorted[1]?.[1] ?? 0;
  const total = Object.values(distribution).reduce((a, b) => a + b, 0) || 1;
  const dominant_margin = (topScore - secondScore) / total;
  const complex_flag = dominant_margin < DOMINANCE_MARGIN_THRESHOLD;
  const complex_pair = complex_flag ? [sorted[0]?.[0], sorted[1]?.[0]].filter(Boolean) : null;
  const confidence = Math.min(1, totalWeight / 3);
  return { dominant_direction, dominant_margin, complex_flag, complex_pair, confidence };
}

function getKotodamaL1(name) {
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
    const decay = Math.pow(0.5, counter[ch] - 1);
    const w = decay * weight;
    totalWeight += w;
    if (def.direction === "内向シフト") {
      features.direction.内向 += 0.3 * w;
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
  const directionTotal = Object.values(features.direction).reduce((a, b) => a + b, 0) || 1;
  const direction_distribution = Object.fromEntries(
    Object.entries(features.direction).map(([k, v]) => [k, v / directionTotal])
  );
  const derived = deriveDirection(features.direction, totalWeight);
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
    direction,
    direction_distribution,
    derived,
    motion: motionOrdered,
    modifier: modifierList,
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

function buildL2WithTags(L1) {
  const process = orderMotion(L1.motion);
  return {
    process,
    direction: L1.direction,
    direction_distribution: L1.direction_distribution,
    derived: L1.derived,
    modifier: L1.modifier,
  };
}

function getSurnameInterface(lastName) {
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

// K×姓のみのinteraction判定(Nは一切関与しない。本番 computeNameSurnameInteraction を複製)
function computeNameSurnameInteraction(state, surnameInterface) {
  if (!surnameInterface) return null;
  const labels = surnameInterface.labels;
  const direction = state.direction;
  const process = state.process;
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

// ---------------------------------------------------------------------------
// 数秘エンジン(本番 numerologyEngine.js より複製)
// ---------------------------------------------------------------------------
function computeDay(day) {
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

function computeMonth(month) {
  if (month === 11) return { value: "11", isMaster: true };
  if (month < 10) return { value: String(month), isMaster: false };
  const sum = Math.floor(month / 10) + (month % 10);
  return { value: String(sum), isMaster: false, amplified: month === 10 || month === 20 };
}

function getNumerologyL1(year, month, day) {
  const dayResult = computeDay(day);
  const monthResult = computeMonth(month);
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
  return { day: dayResult, month: monthResult, appearances, numbers };
}

function getNumerologyAdjustment(n_L1) {
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

// ---------------------------------------------------------------------------
// 4つのinput builder(依頼書§3.1)
// ---------------------------------------------------------------------------

/**
 * @param {string} firstName
 * @param {string} lastName  空文字列/未指定なら surnameInterface は null になる
 *   (本番 getSurnameInterface も同じ挙動: `if (!lastName) return null`。
 *   依頼書§4の「姓なし入力を本番エンジンが許容するか」への回答: 許容する。
 *   暫定の姓を補う必要はなく、そのままnullとして扱えばよい)
 * @returns {import('./types.js').KInput|null}
 */
export function buildKInput(firstName, lastName) {
  const L1 = getKotodamaL1(firstName);
  if (!L1) return null;
  const L2 = buildL2WithTags(L1);
  const surnameInterface = getSurnameInterface(lastName);
  return {
    direction: L2.direction,
    process: L2.process,
    modifier: L2.modifier,
    derived: L2.derived,
    direction_distribution: L2.direction_distribution,
    surnameInterface,
  };
}

/**
 * @param {string} birthDate  "YYYY-MM-DD"形式
 * @returns {import('./types.js').NInput|null}
 */
export function buildLegacyNInput(birthDate) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate || "");
  if (!m) return null;
  const [, y, mo, d] = m;
  const n_L1 = getNumerologyL1(Number(y), Number(mo), Number(d));
  const adj = getNumerologyAdjustment(n_L1);
  if (!adj) return null;
  return {
    source: "legacy",
    weight: adj.weight,
    priority: adj.priority,
    persistence: adj.persistence,
    timing: adj.timing,
  };
}

/**
 * K×姓のみのinteraction。Nは一切関与しない。
 * @param {import('./types.js').KInput|null} kInput
 * @param {Object|null} surnameInterface  kInput.surnameInterface をそのまま渡す
 * @returns {import('./types.js').InteractionInput}
 */
export function buildInteractionInput(kInput, surnameInterface) {
  if (!kInput || !surnameInterface) return { interaction: [] };
  const interaction = computeNameSurnameInteraction(
    { direction: kInput.direction, process: kInput.process },
    surnameInterface
  );
  return { interaction: interaction || [] };
}

/**
 * @returns {import('./types.js').ContextInput}
 */
export function buildContextInput(gender, bloodType, scenarioId) {
  return {
    gender: gender || "unknown",
    bloodType: bloodType || "unknown",
    scenarioId,
  };
}
