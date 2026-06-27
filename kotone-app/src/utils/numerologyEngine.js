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

export function getNumerologyL1(year, month, day) {
  const dayResult = computeDay(day);
  const monthResult = computeMonth(month);
  const fullSum = computeFullSum(year, month, day);
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
  return { day: dayResult, month: monthResult, fullSum, appearances, numbers };
}

export function getNumerologyAdjustment(n_L1) {
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
