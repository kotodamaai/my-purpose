// KOTONE 検証ハーネス: model_arm ごとの入力構成解決
// 設計書§2.2の表をそのままコードに落としたもの。ここに意味論的な判断
// (「N-HYPOTHESIS-A」等)を混入させない — 単に「どの入力をどう組み合わせて
// promptAssemblerへ渡すか」を決めるだけの薄い関数にする。

export const ARMS = {
  A1_K_only:                { useN: false,      useInteraction: true },
  A2_K_plus_LegacyN:        { useN: "legacy",   useInteraction: true },
  A3_K_plus_NeutralN:       { useN: "neutral",  useInteraction: true },
  A4_K_plus_ShuffledN:      { useN: "shuffled", useInteraction: true },
  A5_K_without_interaction: { useN: "legacy",   useInteraction: false },
  A6_K_with_interaction:    { useN: "legacy",   useInteraction: true },
};

// --- 決定的PRNG(Math.random()を直接呼ばない。外部依存を増やさないための自前実装) ---
function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStringToSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

let _rng = null;

/**
 * shuffled arm(A4)を使う前に、runner.js から experiment_id を渡して1回だけ呼ぶ。
 * 同じ experiment_id なら常に同じ乱数列になる(再現性の要件)。
 */
export function initSeed(experimentId) {
  _rng = mulberry32(hashStringToSeed(String(experimentId)));
}

/**
 * @param {string} armName ARMSのキー
 * @param {{
 *   kInput: import('./types.js').KInput,
 *   legacyNInput: import('./types.js').NInput|null,
 *   neutralNInput: import('./types.js').NInput,
 *   shuffledNInputPool: Array<{case_id: string, n_input: import('./types.js').NInput|null}>,
 *   interactionInput: import('./types.js').InteractionInput,
 *   contextInput: import('./types.js').ContextInput,
 * }} inputs
 */
export function resolveInputsForArm(armName, inputs) {
  const def = ARMS[armName];
  if (!def) throw new Error(`Unknown arm: ${armName}`);
  const { kInput, legacyNInput, neutralNInput, shuffledNInputPool, interactionInput, contextInput } = inputs;

  let n_input = null;
  if (def.useN === "legacy") {
    n_input = legacyNInput;
  } else if (def.useN === "neutral") {
    n_input = neutralNInput;
  } else if (def.useN === "shuffled") {
    if (!_rng) {
      throw new Error("armResolver.initSeed(experimentId) を先に呼び出してください(shuffled arm使用前に必須)");
    }
    const pool = (shuffledNInputPool || []).filter(p => p && p.n_input);
    if (pool.length === 0) {
      n_input = null; // 借用できる他ケースが無い(単一ケース実行時など)
    } else {
      const idx = Math.floor(_rng() * pool.length);
      const picked = pool[idx];
      n_input = { ...picked.n_input, source: "shuffled", borrowed_from_case_id: picked.case_id };
    }
  }
  // def.useN === false のときは n_input は null のまま(「存在しない」ではなく明示的にnull)

  const interaction_input = def.useInteraction
    ? interactionInput
    : { interaction: [], omitted: true };

  return {
    k_input: kInput,
    n_input,
    interaction_input,
    context_input: contextInput,
  };
}
