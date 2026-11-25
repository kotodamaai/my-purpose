import { NUMEROLOGY_L1, NUMEROLOGY_ADJUST } from '../data/numerology.js';

export function computeDay(day) {
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

export function computeMonth(month) {
  if (month === 11) return { value: "11", isMaster: true };
  if (month < 10) return { value: String(month), isMaster: false };
  const sum = Math.floor(month / 10) + (month % 10);
  return { value: String(sum), isMaster: false, amplified: month === 10 || month === 20 };
}

export function computeFullSum(year, month, day) {
  const digits = String(year) + String(month) + String(day);
  let sum = 0;
  for (const ch of digits) sum += parseInt(ch);
  const trace = [sum];
  while (sum >= 10 && sum !== 11 && sum !== 22 && sum !== 33) {
    let next = 0;
    for (const ch of String(sum)) next += parseInt(ch);
    sum = next;
    trace.push(sum);
  }
  return { final: String(sum), trace };
}

// 一桁になるまで各桁を足す。マスターナンバー（11・22・33）はそこで止める
export function reduceNumber(n, masters = [11, 22, 33]) {
  let v = n;
  while (v >= 10 && !masters.includes(v)) {
    v = String(v).split("").reduce((a, c) => a + parseInt(c), 0);
  }
  return v;
}

// 誕生日の数（日）：才能。1〜9、または 11・22
export function computeBirthdayNumber(day) {
  return String(reduceNumber(day, [11, 22]));
}

// 誕生日の役割（v2.0）
//   使命数（年＋月＋日）＝使命（主役）
//   誕生日の数（日）＝才能（補助）
//   月の数（月）＝育ちの土壌（補助。数秘術では人生前半約30年の Formative Cycle）
// 名前とは混ぜずに切り分ける。重みは主役 1、補助は完全5度の逆数 2/3（名の位置の重みと同じ比率）
export const BIRTHDAY_ROLE_WEIGHT = { mission: 1, talent: 2 / 3, soil: 2 / 3 };

export function getNumerologyL1(year, month, day) {
  const dayResult = computeDay(day);
  const monthResult = computeMonth(month);
  const fullSum = computeFullSum(year, month, day);

  const roles = {
    mission: { num: fullSum.final, weight: BIRTHDAY_ROLE_WEIGHT.mission },
    talent:  { num: computeBirthdayNumber(day), weight: BIRTHDAY_ROLE_WEIGHT.talent },
    soil:    { num: monthResult.value, weight: BIRTHDAY_ROLE_WEIGHT.soil },
  };

  // 条件層に効かせる数：役割ごとの重みを足し合わせる（同じ数が重なれば強く効く）
  const appearances = {};
  for (const r of Object.values(roles)) {
    appearances[r.num] = (appearances[r.num] || 0) + r.weight;
  }
  const numbers = {};
  for (const num of Object.keys(appearances)) {
    const def = NUMEROLOGY_L1[num];
    if (!def) continue;
    numbers[num] = { ...def, weight: appearances[num] };
  }
  return { day: dayResult, month: monthResult, fullSum, roles, appearances, numbers };
}

// 誕生日（数秘）と名前の重なり判定
//   二重に刻まれた：使命数の動きが、名の動きの先頭と同じ
//   一部重なる  ：使命数・誕生日の数・月の数のどれかの動きが、名の動きに含まれる
//   二つの顔   ：どれも重ならない（名前と誕生日が別の面を持つ＝二面性）
// 名の動きは数秘で並べ替える前のもの（fn_L2.process）を使う
// ver2.4：本番では使わない（judgeNameBirthdayGogyo に置き換え）。数→動きの対応表が自作で根が浅いため。比較用に残す
export function judgeNameBirthdayOverlap(n_L1, fn_L2) {
  if (!n_L1 || !n_L1.roles) return null;
  const nameProcess = (fn_L2 && fn_L2.process) || [];
  const motionOf = (num) => (NUMEROLOGY_ADJUST[num] && NUMEROLOGY_ADJUST[num].priority) || null;
  const missionMotion = motionOf(n_L1.roles.mission.num);
  const talentMotion = motionOf(n_L1.roles.talent.num);
  const soilMotion = motionOf(n_L1.roles.soil.num);

  const matched = [];
  if (missionMotion && nameProcess.includes(missionMotion)) matched.push({ role: "mission", motion: missionMotion });
  if (talentMotion && nameProcess.includes(talentMotion)) matched.push({ role: "talent", motion: talentMotion });
  if (soilMotion && nameProcess.includes(soilMotion)) matched.push({ role: "soil", motion: soilMotion });

  let type = "二つの顔";
  if (missionMotion && nameProcess[0] === missionMotion) type = "二重に刻まれた";
  else if (matched.length > 0) type = "一部重なる";

  return { type, missionMotion, talentMotion, soilMotion, nameProcess, matched };
}

export function getNumerologyAdjustment(n_L1) {
  if (!n_L1 || !n_L1.numbers) return null;
  const adj = { weight: 0, priority: [], persistence: 0, timing: [] };
  // 動きの優先順は「重みの大きい数から」（使命数が先）。同じ重みなら 才能 → 育ちの土壌 の順
  // （オブジェクトの数字キーは昇順に並ぶため、そのまま回すと数の小さい順になってしまう）
  const roleRank = {};
  if (n_L1.roles) {
    ["mission", "talent", "soil"].forEach((r, i) => {
      const k = n_L1.roles[r] && n_L1.roles[r].num;
      if (k != null && roleRank[k] == null) roleRank[k] = i;
    });
  }
  const ordered = Object.entries(n_L1.numbers).sort((a, b) =>
    ((b[1].weight || 0) - (a[1].weight || 0)) || ((roleRank[a[0]] ?? 9) - (roleRank[b[0]] ?? 9)));
  for (const [num, def] of ordered) {
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
