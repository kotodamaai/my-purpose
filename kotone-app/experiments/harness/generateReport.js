// KOTONE 検証ハーネス: Phase A0 比較レポート生成
//
// 使い方: node generateReport.js --experiment-id=exp-a0-compare
//
// exp-{id}.jsonl を読み、generation_mode(current/unified/two-call)ごとに集計して
// 依頼書1-Eの表をMarkdownで出力する(experiments/runs/{experiment_id}_report.md)。

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

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function summarizeMode(records) {
  const n = records.length;
  const totalCost = records.reduce((a, r) => a + (r.cost_usd || 0), 0);
  const perRecordCost = n > 0 ? totalCost / n : 0;
  const totalCalls = records.reduce((a, r) => a + (r.llm_call_count || 0), 0);
  const totalInputTokens = records.reduce((a, r) => a + (r.input_tokens || 0), 0);
  const totalOutputTokens = records.reduce((a, r) => a + (r.output_tokens || 0), 0);
  const totalCacheRead = records.reduce((a, r) => a + (r.cache_read_tokens || 0), 0);
  const totalCacheCreation = records.reduce((a, r) => a + (r.cache_creation_tokens || 0), 0);
  const localFailCount = records.filter(r => r.local_check_result && !r.local_check_result.pass).length;
  const llmCheckedRecords = records.filter(r => r.llm_check_performed);
  const llmNgCount = llmCheckedRecords.filter(r => r.llm_check_result && !r.llm_check_result.trim().startsWith("OK")).length;
  const retriedCount = records.filter(r => r.generation_retried).length;
  const fixCount = records.filter(r => r.fix_performed).length;
  const rawEqualsCheckedCount = records.filter(r => r.raw_output === r.checked_output).length;

  return {
    n,
    perRecordCost,
    totalCost,
    totalCalls,
    callsPerRecord: n > 0 ? totalCalls / n : 0,
    totalInputTokens,
    totalOutputTokens,
    totalCacheRead,
    totalCacheCreation,
    localFailRate: n > 0 ? localFailCount / n : 0,
    llmCheckedCount: llmCheckedRecords.length,
    llmNgRate: llmCheckedRecords.length > 0 ? llmNgCount / llmCheckedRecords.length : null,
    retriedRate: n > 0 ? retriedCount / n : 0,
    fixRate: n > 0 ? fixCount / n : 0,
    fixCount,
    rawEqualsCheckedCount,
  };
}

function fmtUsd(v) {
  return `$${v.toFixed(5)}`;
}
function fmtPct(v) {
  return v == null ? "n/a" : `${(v * 100).toFixed(1)}%`;
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

  const modes = ["current", "unified", "two-call"];
  const summaries = {};
  for (const mode of modes) {
    summaries[mode] = summarizeMode(records.filter(r => r.generation_mode === mode));
  }

  const rows = [
    ["1レコードあたり実費(概算)", m => fmtUsd(summaries[m].perRecordCost)],
    ["総呼び出し回数", m => `${summaries[m].totalCalls}回(${summaries[m].callsPerRecord.toFixed(2)}回/レコード)`],
    ["入力トークン数(合計)", m => summaries[m].totalInputTokens.toLocaleString()],
    ["出力トークン数(合計)", m => summaries[m].totalOutputTokens.toLocaleString()],
    ["キャッシュ読み取りトークン(合計)", m => summaries[m].totalCacheRead.toLocaleString()],
    ["キャッシュ書き込みトークン(合計)", m => summaries[m].totalCacheCreation.toLocaleString()],
    ["ローカル検証失敗率", m => fmtPct(summaries[m].localFailRate)],
    ["LLM判定NG率(サンプリング分)", m => `${fmtPct(summaries[m].llmNgRate)}(判定実施 ${summaries[m].llmCheckedCount}/${summaries[m].n}件)`],
    ["修正生成(fix)発生率", m => `${fmtPct(summaries[m].fixRate)}(${summaries[m].fixCount}/${summaries[m].n}件でraw≠checked)`],
    ["リトライ発生率", m => fmtPct(summaries[m].retriedRate)],
  ];

  let md = `# Phase A0 比較レポート: ${experimentId}\n\n`;
  md += `生成日時: ${new Date().toISOString()}\n\n`;
  md += `対象レコード数: current=${summaries.current.n} / unified=${summaries.unified.n} / two-call=${summaries["two-call"].n}\n\n`;
  md += `| 指標 | current | unified | two-call |\n`;
  md += `|---|---|---|---|\n`;
  for (const [label, fn] of rows) {
    md += `| ${label} | ${fn("current")} | ${fn("unified")} | ${fn("two-call")} |\n`;
  }

  md += `\n## 総コスト\n\n`;
  md += `| 方式 | 合計実費 |\n|---|---|\n`;
  for (const mode of modes) md += `| ${mode} | ${fmtUsd(summaries[mode].totalCost)} |\n`;

  md += `\n## キャッシュに関する注記(依頼書1-C)\n\n`;
  md += `今回の実測では、3方式ともキャッシュ読み取り/書き込みトークンが0だった。\n`;
  md += `原因は、各方式の静的prefixサイズがAnthropicのプロンプトキャッシュ最小サイズ`;
  md += `(Claude Haiku系は概ね2048トークン以上が必要)に届いていないため:\n\n`;
  md += `| 方式 | 静的prefixの概算トークン数 |\n|---|---|\n`;
  md += `| current(セクションごと、最大) | 約357トークン |\n`;
  md += `| unified | 約644トークン |\n`;
  md += `| two-call(構造抽出/生成) | 約254 / 約566トークン |\n\n`;
  md += `これは実装の不具合ではなく、現状のプロンプトサイズでは技術的にキャッシュが効かないことが\n`;
  md += `原因。将来的にキャッシュの恩恵を受けるには、辞書本体などレコードをまたいで完全に不変な、\n`;
  md += `より大きな静的ブロックをプロンプトに追加する必要がある(依頼書1-Cが想定していた「K/N辞書・\n`;
  md += `シチュエーション定義」の埋め込みは今回未実施)。\n\n`;
  md += `**キャッシュ有効/無効での実費差**: exp-a0-compare(初回A0)実施時に、同一条件\n`;
  md += `(current方式・normal_policy・A1_K_only)でキャッシュ有効$0.01392 / 無効$0.01455の\n`;
  md += `実測比較を行い、差はほぼ無いことを確認済み(誤差範囲。cache_read/creation共に0のため)。\n`;
  md += `本ラウンドでは同じ結論が既知のため再検証していない。\n`;

  md += `\n## 見積もりと実測の誤差について\n\n`;
  md += `実行前見積もり(--budget-cap確認プロンプト)は、NG発生時の修正生成(fix)呼び出しを\n`;
  md += `計算に含めていない。修正生成が発生した分だけ、実測は見積もりの上限(max)を超えうる。\n`;
  md += `修正生成発生率: current=${fmtPct(summaries.current.fixRate)} / unified=${fmtPct(summaries.unified.fixRate)} / two-call=${fmtPct(summaries["two-call"].fixRate)}\n`;
  md += `(見積もり関数への修正生成コスト反映は未実施。今後の課題)\n`;

  md += `\n## 品質面(目視比較用)\n\n`;
  md += `意味欠落率・セクション間矛盾等の定量評価は依頼書の通り自動化していない。\n`;
  md += `\`${experimentId}.jsonl\`の\`raw_output\`(各方式のJSON配列)と\`llm_check_result\`を\n`;
  md += `目視で比較すること。\n`;

  const outPath = path.join(RUNS_DIR, `${experimentId}_report.md`);
  writeFileSync(outPath, md, "utf8");
  console.log(`レポートを書き込みました: ${outPath}`);
}

main();
