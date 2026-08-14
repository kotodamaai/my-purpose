// KOTONE 検証ハーネス: Phase A1 専用レポート生成
//
// 依頼書 Claude_Code依頼_PhaseA1本実行_2026-08-14.md §3・§4 に対応。
// generateReport.js(方式間比較用)とは別に、Phase A1(単一方式・11シチュエーション×4arm)
// 特有の集計(arm別/シチュエーション別内訳、クリーンレコード一覧、A1〜A4間のraw_output差分、
// prompt_hashの違い)を出力する。
//
// 使い方: node generatePhaseA1Report.js --experiment-id=exp-akkey-phaseA1

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNS_DIR = path.join(__dirname, '..', 'runs');

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    const m = /^--([^=]+)=(.*)$/.exec(raw);
    if (m) args[m[1]] = m[2];
  }
  return args;
}

function fmtUsd(v) { return `$${v.toFixed(5)}`; }
function fmtPct(v) { return v == null ? "n/a" : `${(v * 100).toFixed(1)}%`; }

function summarize(records) {
  const n = records.length;
  const totalCost = records.reduce((a, r) => a + (r.cost_usd || 0), 0);
  const totalCalls = records.reduce((a, r) => a + (r.llm_call_count || 0), 0);
  const localFail = records.filter(r => r.local_check_result && !r.local_check_result.pass).length;
  const checked = records.filter(r => r.llm_check_performed);
  const ngCount = checked.filter(r => r.llm_check_result && !r.llm_check_result.trim().startsWith("OK")).length;
  const fixCount = records.filter(r => r.fix_performed).length;
  return {
    n,
    totalCost,
    perRecordCost: n > 0 ? totalCost / n : 0,
    totalCalls,
    callsPerRecord: n > 0 ? totalCalls / n : 0,
    localFailRate: n > 0 ? localFail / n : 0,
    llmNgRate: checked.length > 0 ? ngCount / checked.length : null,
    checkedCount: checked.length,
    fixRate: n > 0 ? fixCount / n : 0,
    fixCount,
  };
}

// raw_outputの2レコードを粗く分類する: identical / partial / major
// (意味的評価はしない。テキストとしての一致度だけを機械的に見る)
function classifyDiff(recA, recB) {
  if (!recA || !recB) return "n/a(片方欠損)";
  if (recA.raw_output === recB.raw_output) return "完全一致";
  const a = JSON.parse(recA.raw_output);
  const b = JSON.parse(recB.raw_output);
  let sameCount = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] && b[i] && a[i].text === b[i].text) sameCount++;
  }
  const ratio = a.length > 0 ? sameCount / a.length : 0;
  if (ratio >= 0.8) return `部分一致(セクション${sameCount}/${a.length}が同一)`;
  if (ratio > 0) return `大幅に異なる(セクション${sameCount}/${a.length}のみ同一)`;
  return "大幅に異なる(全セクション不一致)";
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const experimentId = args["experiment-id"];
  if (!experimentId) {
    console.error("必須: --experiment-id=<id>");
    process.exit(1);
  }

  const jsonlPath = path.join(RUNS_DIR, `${experimentId}.jsonl`);
  const lines = readFileSync(jsonlPath, "utf8").trim().split("\n").filter(Boolean);
  const records = lines.map(l => JSON.parse(l));

  const arms = ["A1_K_only", "A2_K_plus_LegacyN", "A3_K_plus_NeutralN", "A4_K_plus_ShuffledN"];
  const scenarioIds = [...new Set(records.map(r => r.scenario_id))];

  let md = `# Phase A1 実行レポート: ${experimentId}\n\n`;
  md += `生成日時: ${new Date().toISOString()}\n\n`;
  md += `総レコード数: ${records.length} / エラー件数: ${records.filter(r => r.raw_output.includes("(ERROR:")).length}\n\n`;

  // --- arm別サマリー ---
  md += `## arm別サマリー\n\n`;
  md += `| arm | 実費(合計) | 1レコード実費 | 呼び出し回数/レコード | ローカル検証失敗率 | LLM判定NG率 | 修正生成発生率 |\n`;
  md += `|---|---|---|---|---|---|---|\n`;
  for (const arm of arms) {
    const s = summarize(records.filter(r => r.model_arm === arm));
    md += `| ${arm} | ${fmtUsd(s.totalCost)} | ${fmtUsd(s.perRecordCost)} | ${s.callsPerRecord.toFixed(2)} | ${fmtPct(s.localFailRate)} | ${fmtPct(s.llmNgRate)}(${s.checkedCount}/${s.n}) | ${fmtPct(s.fixRate)}(${s.fixCount}/${s.n}) |\n`;
  }

  // --- シチュエーション別サマリー ---
  md += `\n## シチュエーション別サマリー\n\n`;
  md += `| シナリオ | 実費(合計) | 1レコード実費 | ローカル検証失敗率 | LLM判定NG率 | 修正生成発生率 |\n`;
  md += `|---|---|---|---|---|---|\n`;
  for (const sid of scenarioIds) {
    const s = summarize(records.filter(r => r.scenario_id === sid));
    md += `| ${sid} | ${fmtUsd(s.totalCost)} | ${fmtUsd(s.perRecordCost)} | ${fmtPct(s.localFailRate)} | ${fmtPct(s.llmNgRate)}(${s.checkedCount}/${s.n}) | ${fmtPct(s.fixRate)}(${s.fixCount}/${s.n}) |\n`;
  }

  // --- クリーンレコード一覧 ---
  const clean = records.filter(r =>
    r.local_check_result && r.local_check_result.pass &&
    (!r.llm_check_performed || (r.llm_check_result && r.llm_check_result.trim().startsWith("OK")))
  );
  md += `\n## クリーンなレコード(ローカル検証・LLM判定の両方をパス)\n\n`;
  md += `${clean.length} / ${records.length} 件\n\n`;
  if (clean.length > 0) {
    md += `| case_id | scenario_id | model_arm |\n|---|---|---|\n`;
    for (const r of clean) md += `| ${r.case_id} | ${r.scenario_id} | ${r.model_arm} |\n`;
  }

  // --- A1〜A4間のraw_output差分(依頼書4章) ---
  md += `\n## A1〜A4間のraw_output差分(シチュエーション別)\n\n`;
  md += `テキストとしての一致度のみを機械的に分類(完全一致/部分一致/大幅に異なる)。意味的評価は含まない。\n\n`;
  md += `| シナリオ | A1 vs A2(K-only vs Legacy-N) | A2 vs A3(Legacy-N vs Neutral-N) | A2 vs A4(Legacy-N vs Shuffled-N) |\n`;
  md += `|---|---|---|---|\n`;
  for (const sid of scenarioIds) {
    const byArm = {};
    for (const arm of arms) {
      byArm[arm] = records.find(r => r.scenario_id === sid && r.model_arm === arm);
    }
    const d12 = classifyDiff(byArm.A1_K_only, byArm.A2_K_plus_LegacyN);
    const d23 = classifyDiff(byArm.A2_K_plus_LegacyN, byArm.A3_K_plus_NeutralN);
    const d24 = classifyDiff(byArm.A2_K_plus_LegacyN, byArm.A4_K_plus_ShuffledN);
    md += `| ${sid} | ${d12} | ${d23} | ${d24} |\n`;
  }

  // --- prompt_hashの違い ---
  md += `\n## prompt_hashの違い(A1〜A4間、N欄の反映確認)\n\n`;
  md += `同一シナリオ内でA1〜A4のprompt_hashが4つとも異なっていれば、N入力の有無・値の違いが\n`;
  md += `プロンプトレベルで正しく反映されていることになる(値の中身は見ず、ハッシュの一致/不一致のみ確認)。\n\n`;
  md += `| シナリオ | 4arm間で全て異なるか | 詳細 |\n|---|---|---|\n`;
  let hashViolations = 0;
  for (const sid of scenarioIds) {
    const hashes = arms.map(arm => {
      const r = records.find(x => x.scenario_id === sid && x.model_arm === arm);
      return r ? r.prompt_hash : null;
    });
    const uniqueCount = new Set(hashes).size;
    const allDifferent = uniqueCount === arms.length;
    if (!allDifferent) hashViolations++;
    md += `| ${sid} | ${allDifferent ? "OK(4種とも異なる)" : `要確認(ユニーク数${uniqueCount}/4)`} | ${hashes.map(h => h ? h.slice(7, 15) : "n/a").join(" / ")} |\n`;
  }
  md += `\n${hashViolations === 0 ? "全11シナリオでprompt_hashの重複なし。" : `${hashViolations}件のシナリオでhashの重複あり(要確認)。`}\n`;

  const outPath = path.join(RUNS_DIR, `${experimentId}_report.md`);
  writeFileSync(outPath, md, "utf8");
  console.log(`レポートを書き込みました: ${outPath}`);
}

main();
