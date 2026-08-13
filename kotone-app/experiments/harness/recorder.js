// KOTONE 検証ハーネス: JSONLへのレコード追記 + blind_label採番
import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

// --- 決定的PRNG(armResolver.jsと同じ自前実装。目的が違うため独立させている) ---
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

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * experiment_id + case_id + scenario_id ごとに、armをシャッフルしたラベルを決定的に採番する。
 * 同じ組み合わせ内でarm名が推測できないようにする(依頼書§3.6)。
 * シードは (experiment_id, case_id, scenario_id) から一意に決まるため、同じ組み合わせを
 * 何度呼んでも同じ結果になる(armResolverのshuffled-N用シードとは独立)。
 *
 * @param {string} experimentId
 * @param {string} caseId
 * @param {string} scenarioId
 * @param {string[]} armsInGroup  このexperiment_idで実行される全arm名(順不同でよい)
 * @param {string} armName  ラベルを求めたいarm名
 */
export function computeBlindLabel(experimentId, caseId, scenarioId, armsInGroup, armName) {
  const seed = hashStringToSeed(`${experimentId}|${caseId}|${scenarioId}`);
  const rng = mulberry32(seed);
  const shuffled = [...armsInGroup];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const idx = shuffled.indexOf(armName);
  if (idx === -1) throw new Error(`armName "${armName}" が armsInGroup に含まれていません`);
  return LETTERS[idx] || `#${idx}`;
}

/**
 * @param {string} runsDir  experiments/runs のパス
 * @param {string|null} experimentId  fileName未指定時は `${experimentId}.jsonl` に書く。
 *   fileName指定時はexperimentIdは無視してよい(null許容)
 * @param {object} record
 * @param {{fileName?: string}} [opts]  budget-cap使用時など、`.partial.jsonl` に
 *   書き分けたい場合にファイル名を明示するためのオプション
 * @returns {string} 書き込んだファイルの絶対パス
 */
export function appendRecord(runsDir, experimentId, record, opts = {}) {
  if (!existsSync(runsDir)) mkdirSync(runsDir, { recursive: true });
  const fileName = opts.fileName || `${experimentId}.jsonl`;
  const filePath = path.join(runsDir, fileName);
  appendFileSync(filePath, JSON.stringify(record) + "\n", 'utf8');
  return filePath;
}
