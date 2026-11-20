import {
  KOTODAMA_L1, DAKUON_MAP, SURNAME_INTERFACE,
  HANDAKUON, GLIDE_MAP, SPECIAL_SOUND_OVERLAY, SURNAME_OVERLAY,
} from '../data/L1_dictionary.js';

const NATURAL_ORDER = ["起点", "拡散", "収束", "接続", "切断", "保持"];

// 1文字を「清音の基底音」と「上乗せmodifier」に分ける
function splitBase(ch) {
  const base = DAKUON_MAP[ch] || ch;
  const overlay = [];
  if (HANDAKUON.has(ch)) overlay.push(SPECIAL_SOUND_OVERLAY.handakuon);
  else if (DAKUON_MAP[ch]) overlay.push(SPECIAL_SOUND_OVERLAY.dakuon);
  return { base, overlay };
}

// 名前を音に分解する（v1.3: 特殊音の整理）
//  濁音・半濁音: 清音の意味を使い、overlayに「重量」「弾み」を付ける
//  拗音:         基底音0.5＋小書き文字の音0.5、基底音に「軽快」
//  促音(っ):     markOnly要素として「瞬発」だけを足す
//  長音(ー):     直前の音の重みを+0.5し、markOnly要素として「伸長」を足す
// 各要素: { ch, weight, overlay: string[], markOnly?: true }
export function decomposeSounds(name) {
  const result = [];
  for (let i = 0; i < name.length; i++) {
    const ch = name[i];
    const next = name[i + 1];
    if (next && GLIDE_MAP[next]) {
      const { base, overlay } = splitBase(ch);
      overlay.push(SPECIAL_SOUND_OVERLAY.youon);
      result.push({ ch: base, weight: 0.5, overlay });
      result.push({ ch: GLIDE_MAP[next], weight: 0.5, overlay: [] });
      i++;
      continue;
    }
    if (ch === "っ") {
      result.push({ ch, weight: 1.0, overlay: [SPECIAL_SOUND_OVERLAY.sokuon], markOnly: true });
      continue;
    }
    if (ch === "ー") {
      const prev = [...result].reverse().find(s => !s.markOnly);
      if (prev) prev.weight += 0.5;
      result.push({ ch, weight: 1.0, overlay: [SPECIAL_SOUND_OVERLAY.chouon], markOnly: true });
      continue;
    }
    const { base, overlay } = splitBase(ch);
    result.push({ ch: base, weight: 1.0, overlay });
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
  for (const { ch, weight, overlay = [], markOnly } of sounds) {
    if (markOnly) {
      // 促音・長音: 方向・motionは持たず、modifierだけを足す（confidenceの計算にも含めない）
      for (const mod of overlay) {
        features.modifier[mod] = (features.modifier[mod] || 0) + weight;
      }
      continue;
    }
    const def = KOTODAMA_L1[ch];
    if (!def) continue;
    counter[ch] = (counter[ch] || 0) + 1;
    const decay = Math.pow(0.5, counter[ch] - 1);
    const w = decay * weight;
    totalWeight += w;
    for (const mod of overlay) {
      features.modifier[mod] = (features.modifier[mod] || 0) + w;
    }
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
  // 一次データ：方向の分布(集約せず保持。発見Cの対応)
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
  for (const { ch, weight, overlay = [], markOnly } of sounds) {
    if (markOnly) continue;
    counter[ch] = (counter[ch] || 0) + 1;
    const decay = Math.pow(0.5, counter[ch] - 1);
    const w = decay * weight;
    const def = SURNAME_INTERFACE[ch];
    if (def) {
      for (const [axis, value] of Object.entries(def)) {
        scores[axis] += value * w;
      }
    }
    // 濁音・半濁音の上乗せ（基底音が姓辞書に無い場合も適用する）
    for (const mod of overlay) {
      const add = SURNAME_OVERLAY[mod];
      if (!add) continue;
      for (const [axis, value] of Object.entries(add)) {
        scores[axis] += value * w;
      }
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
