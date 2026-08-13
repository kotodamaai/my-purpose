// KOTONE 検証ハーネス: 実行エントリポイント
//
// 使い方:
//   node runner.js --experiment-id=exp-001 --arms=A1_K_only,A2_K_plus_LegacyN \
//     [--scenarios=normal_policy,problem_occurred] [--cases=case_001] \
//     [--shuffle-pool=case_002,case_003] [--model=haiku|sonnet] \
//     [--generation-mode=current|unified|two-call] [--budget-cap=10] \
//     [--selfcheck-sample-rate=1.0] [--no-cache] [--yes] [--dry-run]
//
// --scenarios 未指定時は normal_policy と problem_occurred の2種のみ(設計書§8.2 Stage0向け)。
// --cases 未指定時は case_001 のみ。--model 未指定時は haiku固定。
//
// --cases は「レコードを生成する対象」専用。--shuffle-pool は「A4(Shuffled-N)の
// 借用元候補」専用で、--casesとは完全に別の集合として扱う。--shuffle-pool省略時は、
// 従来通り--cases自身(自分以外)を借用プールとして使う(後方互換)。
//
// --dry-run を付けると、実際のLLM呼び出しを一切行わず、生成される予定の
// レコード件数と(case, scenario, arm)の全組み合わせだけを表示して終了する。
//
// --generation-mode (依頼書1-C):
//   current  : 6セクション個別生成(ベースライン。本番buildSectionPromptsの文言を維持)
//   unified  : 6セクションを1回のLLM呼び出しでJSON一括取得
//   two-call : 意味構造抽出(1回)→最終文章生成(1回)の2段階
//
// --budget-cap=<USD> (依頼書1-B): 累積コスト概算がこの値に達したら、現在処理中の
//   レコードの完了を待ってから停止する。停止時は runs/{experiment_id}.partial.jsonl に
//   それまでの結果を残す(未指定時はこの仕組み自体が働かず、常に完了ファイル名で書く)。
//
// --selfcheck-sample-rate=<0.0-1.0> (依頼書1-A): LLM判定を実行する確率。デフォルト1.0
//   (全件)。ローカル検証で失敗したレコードは、このレートに関わらず必ずLLM判定にも回す。
//
// --yes を付けると、実行前のコスト見積もり確認プロンプトをスキップする
//   (非対話環境から呼ぶ場合は必須。stdinがTTYでない場合、--yes無しではエラー終了する)。
//
// --no-cache を付けると、依頼書1-Cのプロンプトキャッシュ(cache_control)を無効化し、
//   全文字列を単一content blockとして送る(キャッシュ有無での実費比較に使う)。
//   未指定時はデフォルトで有効。
//
// 実データケース(氏名・生年月日等の個人情報)は cases/ 直下ではなく cases/private/ に置く。
// private/ は.gitignoreで常に除外されるため、`--cases=private/case_akkey` のように
// サブディレクトリを含めて指定する(拡張子.jsonは付けない)。
//
// 本番コード(src/data/prompts.js, src/utils/aiGenerator.js等)は一切importしない。
// PROXY_URLとモデルID文字列は本番と同じ値を定数として複製している(単なる接続先定数)。
//
// K/N物理分離: k_input/n_input/interaction_input/context_inputは、current/unified/
// two-callのどの方式でも、プロンプト文字列に結合される直前(buildInputDataString呼び出し)
// までは別オブジェクトのまま保持される。unified/two-callで1本のプロンプトにまとめる際も、
// 「4つの入力オブジェクトを最後にまとめて文字列化する」という構造自体は崩していない。

import { readFileSync, renameSync, existsSync, appendFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

import { buildKInput, buildLegacyNInput, buildInteractionInput, buildContextInput } from './inputBuilders.js';
import { ARMS, initSeed, resolveInputsForArm } from './armResolver.js';
import { assembleAllSectionPrompts, buildInputDataString, HARNESS_PROMPT_VERSION } from './promptAssembler.js';
import { getSectionCacheSplits } from './promptTemplates.js';
import {
  buildUnifiedPrompt, UNIFIED_STATIC_PREFIX, buildUnifiedDynamicSuffix,
  UNIFIED_MAX_TOKENS, UNIFIED_KEY_TO_TITLE, UNIFIED_PROMPT_VERSION,
} from './promptTemplatesUnified.js';
import {
  buildStructurePrompt, buildGenerationPrompt,
  TWO_CALL_STRUCTURE_STATIC_PREFIX, buildStructureDynamicSuffix,
  TWO_CALL_GENERATION_STATIC_PREFIX, buildGenerationDynamicSuffix,
  TWO_CALL_STRUCTURE_MAX_TOKENS, TWO_CALL_GENERATION_MAX_TOKENS, TWO_CALL_KEY_TO_TITLE, TWO_CALL_PROMPT_VERSION,
} from './promptTemplatesTwoCall.js';
import { runLocalCheck, SECTION_TITLES } from './localCheck.js';
import { hashPrompt } from './hash.js';
import { computeBlindLabel, appendRecord } from './recorder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HARNESS_DIR = __dirname;
const CASES_DIR = path.join(HARNESS_DIR, '..', 'cases');
const RUNS_DIR = path.join(HARNESS_DIR, '..', 'runs');

const PROXY_URL = "https://kotone-proxy.daiya-asset-management.workers.dev";
const MODEL_HAIKU = "claude-haiku-4-5-20251001";
const MODEL_SONNET = "claude-sonnet-4-5";
const K_VERSION = "k-harness-v0.1";
const GENERATION_MODES = ["current", "unified", "two-call"];

const PRICING_FILE = JSON.parse(readFileSync(path.join(HARNESS_DIR, "pricing.json"), "utf8"));
const PRICING = PRICING_FILE.models;
const CACHE_WRITE_MULTIPLIER = PRICING_FILE.cache_write_multiplier ?? 1.25;
const CACHE_READ_MULTIPLIER = PRICING_FILE.cache_read_multiplier ?? 0.1;

function nVersionFor(nInput) {
  if (!nInput) return "n/a";
  if (nInput.source === "legacy") return "legacy-v1.1";
  if (nInput.source === "shuffled") return "legacy-v1.1(shuffled)";
  if (nInput.source === "neutral") return "neutral-v0.1";
  return "unknown";
}

function costFor(model, inputTokens, outputTokens) {
  const p = PRICING[model];
  if (!p) return 0;
  return (inputTokens / 1_000_000) * p.input_per_mtok + (outputTokens / 1_000_000) * p.output_per_mtok;
}

// キャッシュ書き込み/読み取りトークンを含めた実費計算(依頼書1-C)。
// Anthropicのusageは input_tokens(非キャッシュ分) / cache_creation_input_tokens(今回書き込んだ分) /
// cache_read_input_tokens(キャッシュから読んだ分) / output_tokens が互いに排他的な内訳になっている。
function costForWithCache(model, { inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheCreationTokens = 0 }) {
  const p = PRICING[model];
  if (!p) return 0;
  const cacheWriteRate = p.input_per_mtok * CACHE_WRITE_MULTIPLIER;
  const cacheReadRate = p.input_per_mtok * CACHE_READ_MULTIPLIER;
  return (inputTokens / 1_000_000) * p.input_per_mtok
    + (cacheCreationTokens / 1_000_000) * cacheWriteRate
    + (cacheReadTokens / 1_000_000) * cacheReadRate
    + (outputTokens / 1_000_000) * p.output_per_mtok;
}

// 日本語主体のプロンプトを想定したおおまかな目安(1トークン≒1.8文字)。
// 実測との誤差はrunner実行後にログへ記録する(依頼書§3の完了条件)。
function estimateTokensFromChars(charLen) {
  return Math.ceil(charLen / 1.8);
}

async function callProxyRaw(body) {
  const resp = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const e = await resp.json().catch(() => ({}));
    throw new Error(e.error?.message || `HTTP ${resp.status}`);
  }
  return resp.json();
}

function usageFromData(data, promptCharLenForFallback, textForFallback) {
  const inputTokens = data.usage?.input_tokens ?? estimateTokensFromChars(promptCharLenForFallback);
  const outputTokens = data.usage?.output_tokens ?? estimateTokensFromChars((textForFallback || "").length);
  const cacheReadTokens = data.usage?.cache_read_input_tokens ?? 0;
  const cacheCreationTokens = data.usage?.cache_creation_input_tokens ?? 0;
  const usageIsActual = !!data.usage;
  return { inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens, usageIsActual };
}

async function callProxyWithUsage(prompt, model, maxTokens = 550) {
  const data = await callProxyRaw({
    model, max_tokens: maxTokens, temperature: 0.5,
    messages: [{ role: "user", content: prompt }],
  });
  const text = data.content?.map(c => c.text || "").join("") || "";
  const usage = usageFromData(data, prompt.length, text);
  return { text, ...usage, costUsd: costForWithCache(model, usage) };
}

// 静的な部分(prefix)をcache_control付きのcontent block、動的な部分(suffix)を通常の
// content blockとして送る。プロキシがAnthropic Messages APIへそのままpassthroughする
// ことを前提にしている(2026-08-13にテスト済み。プロキシ経由でcontent blocks形式が
// 問題なく受理され、usageにcache_creation_input_tokens/cache_read_input_tokensが
// 含まれることを確認済み)。
async function callProxyWithUsageCached(prefixText, suffixText, model, maxTokens = 550, useCache = true) {
  const content = useCache && prefixText
    ? [
        { type: "text", text: prefixText, cache_control: { type: "ephemeral" } },
        { type: "text", text: suffixText },
      ]
    : [{ type: "text", text: (prefixText || "") + suffixText }];

  const data = await callProxyRaw({
    model, max_tokens: maxTokens, temperature: 0.5,
    messages: [{ role: "user", content }],
  });
  const text = data.content?.map(c => c.text || "").join("") || "";
  const fullCharLen = (prefixText || "").length + suffixText.length;
  const usage = usageFromData(data, fullCharLen, text);
  return { text, ...usage, costUsd: costForWithCache(model, usage) };
}

function parseModelJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    // コードフェンスや前置きが混入した場合の救済(1回だけ試す)
  }
  const m = /\{[\s\S]*\}/.exec(text || "");
  if (m) {
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
  return null;
}

function sectionsFromKeyed(parsed, keyToTitle, fallbackText) {
  return SECTION_TITLES.map(title => {
    const key = Object.keys(keyToTitle).find(k => keyToTitle[k] === title);
    if (parsed && parsed[key] != null) return { title, text: String(parsed[key]) };
    return { title, text: parsed ? "(欠損: JSONにキーが無い)" : fallbackText };
  });
}

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    const m = /^--([^=]+)=(.*)$/.exec(raw);
    if (m) { args[m[1]] = m[2]; continue; }
    const m2 = /^--([^=]+)$/.exec(raw);
    if (m2) args[m2[1]] = "true"; // 値なしフラグ(例: --dry-run, --yes)
  }
  return args;
}

function splitCsv(s) {
  return (s || "").split(",").map(x => x.trim()).filter(Boolean);
}

// case_id(サブディレクトリ含む)からファイルを解決して読み込む。
// cases/の外を参照できないようガードする(実データを扱うため)。
function loadCaseRaw(id) {
  const resolved = path.resolve(CASES_DIR, `${id}.json`);
  if (!resolved.startsWith(CASES_DIR + path.sep)) {
    throw new Error(`不正なcase指定です(cases/の外を参照しています): ${id}`);
  }
  return JSON.parse(readFileSync(resolved, "utf8"));
}

// ---------------------------------------------------------------------------
// 生成方式ごとの実装(依頼書1-C)
// ---------------------------------------------------------------------------

async function generateCurrentMode({ inputs, scenario, model, useCache }) {
  const inputData = buildInputDataString(inputs, scenario);
  // current方式の文言は本番と一字一句同じ(promptTemplates.js)まま、キャッシュ分割だけ
  // 機械的に行う。__CATCH__置換は「セクション5(締め)のsuffix」に対して行う(prefixは
  // 完全に静的なので触らない)。
  const splits = getSectionCacheSplits(inputData);

  const sectionResults = [];
  let callCount = 0, costUsd = 0, inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheCreationTokens = 0, usageIsActual = true;

  for (let i = 0; i < splits.length; i++) {
    const sp = splits[i];
    let text = "";
    try {
      const r = await callProxyWithUsageCached(sp.prefix, sp.suffix, model, 550, useCache);
      text = r.text;
      callCount++; costUsd += r.costUsd; inputTokens += r.inputTokens; outputTokens += r.outputTokens;
      cacheReadTokens += r.cacheReadTokens; cacheCreationTokens += r.cacheCreationTokens;
      usageIsActual = usageIsActual && r.usageIsActual;
    } catch (e) {
      text = `(ERROR: ${e.message || e})`;
    }

    // キャッチコピー(index 0)完了後、締め(index 5)の __CATCH__ を置換(本番aiGenerator.jsと同じ順序)
    if (i === 0 && text && !text.startsWith("(ERROR:")) {
      splits[5].suffix = splits[5].suffix.replace("__CATCH__", text.trim());
    } else if (i === 0) {
      splits[5].suffix = splits[5].suffix.replace("__CATCH__", "（キャッチコピー未取得）");
    }

    sectionResults.push({ title: sp.title, text });
  }

  return {
    sectionResults, callCount, costUsd, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens, usageIsActual, retried: false,
    promptTextForHash: splits.map(sp => (sp.prefix || "") + sp.suffix).join("\n\n===SECTION===\n\n"),
  };
}

async function generateUnifiedMode({ inputs, scenario, model, useCache }) {
  const inputData = buildInputDataString(inputs, scenario);
  const suffix = buildUnifiedDynamicSuffix(inputData);

  let callCount = 0, costUsd = 0, inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheCreationTokens = 0, usageIsActual = true;
  let parsed = null, lastRaw = "", retried = false;

  for (let attempt = 0; attempt < 2 && !parsed; attempt++) {
    if (attempt === 1) retried = true;
    try {
      const r = await callProxyWithUsageCached(UNIFIED_STATIC_PREFIX, suffix, model, UNIFIED_MAX_TOKENS, useCache);
      callCount++; costUsd += r.costUsd; inputTokens += r.inputTokens; outputTokens += r.outputTokens;
      cacheReadTokens += r.cacheReadTokens; cacheCreationTokens += r.cacheCreationTokens;
      usageIsActual = usageIsActual && r.usageIsActual;
      lastRaw = r.text;
      parsed = parseModelJson(r.text);
    } catch (e) {
      lastRaw = `(ERROR: ${e.message || e})`;
    }
  }

  const sectionResults = sectionsFromKeyed(parsed, UNIFIED_KEY_TO_TITLE, lastRaw);

  return {
    sectionResults, callCount, costUsd, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens, usageIsActual, retried,
    promptTextForHash: UNIFIED_STATIC_PREFIX + suffix,
  };
}

async function generateTwoCallMode({ inputs, scenario, model, useCache }) {
  const inputData = buildInputDataString(inputs, scenario);
  const structSuffix = buildStructureDynamicSuffix(inputData);

  let callCount = 0, costUsd = 0, inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheCreationTokens = 0, usageIsActual = true, retried = false;
  let structParsed = null, structRaw = "";

  for (let attempt = 0; attempt < 2 && !structParsed; attempt++) {
    if (attempt === 1) retried = true;
    try {
      const r = await callProxyWithUsageCached(TWO_CALL_STRUCTURE_STATIC_PREFIX, structSuffix, model, TWO_CALL_STRUCTURE_MAX_TOKENS, useCache);
      callCount++; costUsd += r.costUsd; inputTokens += r.inputTokens; outputTokens += r.outputTokens;
      cacheReadTokens += r.cacheReadTokens; cacheCreationTokens += r.cacheCreationTokens;
      usageIsActual = usageIsActual && r.usageIsActual;
      structRaw = r.text;
      structParsed = parseModelJson(r.text);
    } catch (e) {
      structRaw = `(ERROR: ${e.message || e})`;
    }
  }

  const structureForGen = structParsed || {
    hypothesis: "(構造抽出失敗のためフォールバック)",
    source_axes: [], supporting_elements: [], conditions: [], confidence: "low",
  };
  const genSuffix = buildGenerationDynamicSuffix(inputData, structureForGen);

  let genParsed = null, genRaw = "";
  for (let attempt = 0; attempt < 2 && !genParsed; attempt++) {
    if (attempt === 1) retried = true;
    try {
      const r = await callProxyWithUsageCached(TWO_CALL_GENERATION_STATIC_PREFIX, genSuffix, model, TWO_CALL_GENERATION_MAX_TOKENS, useCache);
      callCount++; costUsd += r.costUsd; inputTokens += r.inputTokens; outputTokens += r.outputTokens;
      cacheReadTokens += r.cacheReadTokens; cacheCreationTokens += r.cacheCreationTokens;
      usageIsActual = usageIsActual && r.usageIsActual;
      genRaw = r.text;
      genParsed = parseModelJson(r.text);
    } catch (e) {
      genRaw = `(ERROR: ${e.message || e})`;
    }
  }

  const sectionResults = sectionsFromKeyed(genParsed, TWO_CALL_KEY_TO_TITLE, genRaw);

  return {
    sectionResults, callCount, costUsd, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens, usageIsActual, retried,
    structureJson: structParsed, structureRaw: structParsed ? null : structRaw,
    promptTextForHash: TWO_CALL_STRUCTURE_STATIC_PREFIX + structSuffix + "\n\n===GEN===\n\n" + TWO_CALL_GENERATION_STATIC_PREFIX + genSuffix,
  };
}

const GENERATORS = {
  current: generateCurrentMode,
  unified: generateUnifiedMode,
  "two-call": generateTwoCallMode,
};

const PROMPT_VERSION_BY_MODE = {
  current: HARNESS_PROMPT_VERSION,
  unified: UNIFIED_PROMPT_VERSION,
  "two-call": TWO_CALL_PROMPT_VERSION,
};

// ---------------------------------------------------------------------------
// LLM判定(依頼書1-A: 矛盾・文脈依存の断定・ニュアンス評価・意味保持のみ。サンプリング実行)
// ---------------------------------------------------------------------------

async function runLlmCheck(sectionResults) {
  const joined = sectionResults.map(s => `【${s.title}】\n${s.text}`).join("\n\n");
  const prompt = `以下は自己理解診断アプリの診断文(6セクション)です。全体を読み、次の観点で問題があれば「NG: 箇所 → 具体的な問題点」の形で最大3行まで返してください。問題が無ければ「OK」とだけ返してください。
【チェック観点】
・セクション間で言っていることが矛盾していないか
・文脈上、人を一方的に決めつける断定になっていないか(禁止語リストでは拾えないもの)
・善悪や優劣で評価するようなニュアンスになっていないか
・入力データの意味が出力で失われたり歪んだりしていないか

---
${joined}`;
  const r = await callProxyWithUsage(prompt, MODEL_HAIKU, 300);
  return { result: r.text.trim(), costUsd: r.costUsd, inputTokens: r.inputTokens, outputTokens: r.outputTokens, usageIsActual: r.usageIsActual };
}

// --- 決定的PRNG(サンプリング判定用。armResolver/recorderと同じ自前実装) ---
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
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// 1レコード分の実行
// ---------------------------------------------------------------------------

async function runOneCombo({ experimentId, model, generationMode, selfcheckSampleRate, useCache, c, shufflePool, scenario, armName, armNames }) {
  const pool = shufflePool.filter(p => p.case_id !== c.raw.case_id);
  const contextInput = buildContextInput(c.raw.gender, c.raw.bloodType, scenario.scenario_id);

  const resolved = resolveInputsForArm(armName, {
    kInput: c.kInput,
    legacyNInput: c.legacyNInput,
    neutralNInput: c.neutralNInput,
    shuffledNInputPool: pool,
    interactionInput: c.interactionInput,
    contextInput,
  });

  const gen = await GENERATORS[generationMode]({ inputs: resolved, scenario, model, useCache });

  const localCheckResult = runLocalCheck(gen.sectionResults);

  const sampleSeed = hashStringToSeed(`${experimentId}|${c.raw.case_id}|${scenario.scenario_id}|${armName}|selfcheck`);
  const sampleRng = mulberry32(sampleSeed);
  const sampled = sampleRng() < selfcheckSampleRate;
  const shouldRunLlmCheck = !localCheckResult.pass || sampled;

  let llmCheckResult = null;
  let llmCheckCostUsd = 0, llmCheckInputTokens = 0, llmCheckOutputTokens = 0;
  let llmUsageIsActual = gen.usageIsActual;

  if (shouldRunLlmCheck) {
    try {
      const r = await runLlmCheck(gen.sectionResults);
      llmCheckResult = r.result;
      llmCheckCostUsd = r.costUsd;
      llmCheckInputTokens = r.inputTokens;
      llmCheckOutputTokens = r.outputTokens;
      llmUsageIsActual = llmUsageIsActual && r.usageIsActual;
    } catch (e) {
      llmCheckResult = `(ERROR: ${e.message || e})`;
    }
  }

  // A0では自動修正(Sonnet再生成)は行わない。LLM判定はNG検出のみを記録し、
  // 修正ループの効果測定はPhase A本実行以降の課題とする(依頼書1-Aの重複呼び出し
  // 削減方針に合わせ、checked_outputは常にraw_outputと同一とする)。
  const rawOutputArr = gen.sectionResults.map(s => ({ title: s.title, text: s.text }));

  const totalCallCount = gen.callCount + (shouldRunLlmCheck ? 1 : 0);
  const totalCostUsd = gen.costUsd + llmCheckCostUsd;
  const totalInputTokens = gen.inputTokens + llmCheckInputTokens;
  const totalOutputTokens = gen.outputTokens + llmCheckOutputTokens;
  const totalCacheReadTokens = gen.cacheReadTokens || 0;
  const totalCacheCreationTokens = gen.cacheCreationTokens || 0;

  const promptHash = hashPrompt(gen.promptTextForHash);

  let reviewerNotes = "";
  if (resolved.n_input && resolved.n_input.source === "shuffled") {
    reviewerNotes = `shuffled-N: case_id=${resolved.n_input.borrowed_from_case_id} から借用`;
  } else if (ARMS[armName].useN === "shuffled" && !resolved.n_input) {
    reviewerNotes = "shuffled-N: 候補となる他ケースが無いためn_input=null(単一ケース実行時など)";
  }
  if (gen.retried) {
    reviewerNotes = (reviewerNotes ? reviewerNotes + " / " : "") + "generation: JSONパース失敗によりリトライ発生";
  }

  const record = {
    experiment_id: experimentId,
    case_id: c.raw.case_id,
    subject_id: c.raw.subject_id,
    scenario_id: scenario.scenario_id,
    created_at: new Date().toISOString(),
    model_arm: armName,
    generation_mode: generationMode,
    k_version: K_VERSION,
    n_version: nVersionFor(resolved.n_input),
    integration_version: "n/a",
    prompt_version: PROMPT_VERSION_BY_MODE[generationMode],
    prompt_hash: promptHash,
    input_facts: {
      firstName: c.raw.firstName,
      lastName: c.raw.lastName,
      birthDate: c.raw.birthDate,
      gender: c.raw.gender,
      bloodType: c.raw.bloodType,
    },
    k_input: resolved.k_input,
    n_input: resolved.n_input,
    interaction_input: resolved.interaction_input,
    context_input: resolved.context_input,
    selfcheck_enabled: true,
    local_check_result: localCheckResult,
    llm_check_performed: shouldRunLlmCheck,
    llm_check_result: llmCheckResult,
    llm_call_count: totalCallCount,
    generation_call_count: gen.callCount,
    generation_retried: gen.retried,
    cost_usd: Number(totalCostUsd.toFixed(6)),
    cost_usage_is_actual: llmUsageIsActual,
    input_tokens: totalInputTokens,
    output_tokens: totalOutputTokens,
    cache_read_tokens: totalCacheReadTokens,
    cache_creation_tokens: totalCacheCreationTokens,
    raw_output: JSON.stringify(rawOutputArr),
    checked_output: JSON.stringify(rawOutputArr),
    blind_label: computeBlindLabel(experimentId, c.raw.case_id, scenario.scenario_id, armNames, armName),
    rating: null,
    free_answer: null,
    actual_observed_behavior: null,
    observer_prediction: null,
    match: null,
    mismatch: null,
    unpredicted: null,
    reviewer_notes: reviewerNotes,
    design_implication: "",
  };

  return record;
}

// ---------------------------------------------------------------------------
// 実行前コスト見積もり(依頼書1-B)
// ---------------------------------------------------------------------------

// 代表1件(先頭のcase×scenario×arm)から実プロンプトを組み立てて概算する。
// プロンプト長は入力データの違いによる変動が小さいため、代表1件×件数で近似する。
function estimatePerRecordCost({ generationMode, model, inputs, scenario }) {
  const outputFractions = { min: 0.3, mid: 0.6, max: 1.0 };
  const bounds = { min: 0, mid: 0, max: 0 };
  let callCount = 0;

  function addCall(promptText, maxTokens, callModel) {
    callCount++;
    const inTok = estimateTokensFromChars(promptText.length);
    for (const key of Object.keys(bounds)) {
      const outTok = Math.ceil(maxTokens * outputFractions[key]);
      bounds[key] += costFor(callModel, inTok, outTok);
    }
  }

  if (generationMode === "current") {
    const sections = assembleAllSectionPrompts(inputs, scenario);
    for (const sec of sections) addCall(sec.prompt, 550, model);
  } else if (generationMode === "unified") {
    const inputData = buildInputDataString(inputs, scenario);
    addCall(buildUnifiedPrompt(inputData), UNIFIED_MAX_TOKENS, model);
  } else {
    const inputData = buildInputDataString(inputs, scenario);
    addCall(buildStructurePrompt(inputData), TWO_CALL_STRUCTURE_MAX_TOKENS, model);
    const placeholderStructure = { hypothesis: "x".repeat(20), source_axes: ["K-given", "N-role"], supporting_elements: ["x", "x", "x"], conditions: ["x", "x"], confidence: "medium" };
    addCall(buildGenerationPrompt(inputData, placeholderStructure), TWO_CALL_GENERATION_MAX_TOKENS, model);
  }

  // LLM判定(サンプリング対象。見積もりでは「全件に発生しうる」前提で1回分を加算し、
  // 後でサンプリング率を掛ける)
  const combinedOutputEstimate = 1200; // 6セクション分の出力文字数の目安
  const checkPromptCharLen = combinedOutputEstimate + 400; // チェック用の指示文込み
  for (const key of Object.keys(bounds)) {
    const inTok = estimateTokensFromChars(checkPromptCharLen);
    const outTok = Math.ceil(300 * outputFractions[key]);
    bounds[key] += costFor(MODEL_HAIKU, inTok, outTok);
  }

  return { perRecordCost: bounds, callCountWithoutCheck: callCount };
}

// キャッシュヒット時の想定コスト削減率(依頼書1-C)。
// 各方式の「静的prefixが全体プロンプトに占める割合」から、キャッシュ有効時に
// prefix部分の入力コストが読み取り単価(input×0.1)まで下がると仮定して概算する。
function estimateCacheSavings({ generationMode, inputs, scenario }) {
  const inputData = buildInputDataString(inputs, scenario);
  let prefixLen = 0, totalLen = 0;

  if (generationMode === "current") {
    const splits = getSectionCacheSplits(inputData);
    for (const sp of splits) {
      prefixLen += (sp.prefix || "").length;
      totalLen += (sp.prefix || "").length + sp.suffix.length;
    }
  } else if (generationMode === "unified") {
    prefixLen = UNIFIED_STATIC_PREFIX.length;
    totalLen = prefixLen + buildUnifiedDynamicSuffix(inputData).length;
  } else {
    const placeholderStructure = { hypothesis: "x".repeat(20), source_axes: ["K-given", "N-role"], supporting_elements: ["x", "x", "x"], conditions: ["x", "x"], confidence: "medium" };
    const p1 = TWO_CALL_STRUCTURE_STATIC_PREFIX.length;
    const t1 = p1 + buildStructureDynamicSuffix(inputData).length;
    const p2 = TWO_CALL_GENERATION_STATIC_PREFIX.length;
    const t2 = p2 + buildGenerationDynamicSuffix(inputData, placeholderStructure).length;
    prefixLen = p1 + p2;
    totalLen = t1 + t2;
  }

  const prefixShare = totalLen > 0 ? prefixLen / totalLen : 0;
  const overallInputReductionEstimate = prefixShare * (1 - CACHE_READ_MULTIPLIER);
  return { prefixShare, overallInputReductionEstimate };
}

async function confirmOrExit({ totalRecords, generationMode, perRecordCost, selfcheckSampleRate, budgetCap, useCache, cacheSavings, args }) {
  const min = perRecordCost.min * totalRecords;
  const mid = perRecordCost.mid * totalRecords;
  const max = perRecordCost.max * totalRecords;

  console.log(`\n実験ID: ${args["experiment-id"]}`);
  console.log(`対象レコード数: ${totalRecords}件`);
  console.log(`生成方式: ${generationMode}`);
  console.log(`LLM判定サンプリング率: ${selfcheckSampleRate}`);
  console.log(`プロンプトキャッシュ: ${useCache ? "有効" : "無効(--no-cache指定)"}`);
  if (useCache) {
    console.log(`  静的prefixの占有率: ${(cacheSavings.prefixShare * 100).toFixed(1)}% / キャッシュヒット時の入力コスト削減見込み: 約${(cacheSavings.overallInputReductionEstimate * 100).toFixed(1)}%(初回書き込み分・出力分は対象外)`);
  }
  console.log(`想定コスト: $${min.toFixed(3)} 〜 $${max.toFixed(3)} (目安 $${mid.toFixed(3)}、上記見積もりはキャッシュ未考慮の素の単価。キャッシュはヒットが重なるほど実費がこれより下がる)`);
  if (budgetCap != null) {
    console.log(`--budget-cap で指定された上限: $${budgetCap}`);
  } else {
    console.log(`--budget-cap: 未指定(実験単位の歯止めなし。月間利用上限のみが効く)`);
  }
  console.log(`※ この見積もりは代表1件のプロンプト長からの概算(1トークン≒1.8文字換算)。実測との誤差は実行後にログへ記録される。`);

  if (args.yes === "true") {
    console.log(`--yes が指定されているため、確認をスキップして実行します。\n`);
    return;
  }

  if (!process.stdin.isTTY) {
    console.error(`\n非対話環境(TTYなし)で --yes が指定されていません。ハングを避けるため終了します。--yes を付けて再実行してください。`);
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`この内容で実行してよいですか？ (y/N): `);
  rl.close();
  if (answer.trim().toLowerCase() !== "y") {
    console.log("中止しました。");
    process.exit(0);
  }
}

// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const experimentId = args["experiment-id"];
  if (!experimentId) {
    console.error("必須: --experiment-id=<id>");
    process.exit(1);
  }

  const armNames = splitCsv(args.arms);
  if (armNames.length === 0) {
    console.error("必須: --arms=A1_K_only,A2_K_plus_LegacyN,... (利用可能: " + Object.keys(ARMS).join(", ") + ")");
    process.exit(1);
  }
  for (const a of armNames) {
    if (!ARMS[a]) {
      console.error(`不明なarm: ${a} (利用可能: ${Object.keys(ARMS).join(", ")})`);
      process.exit(1);
    }
  }

  const generationMode = args["generation-mode"] || "current";
  if (!GENERATION_MODES.includes(generationMode)) {
    console.error(`不明な--generation-mode: ${generationMode} (利用可能: ${GENERATION_MODES.join(", ")})`);
    process.exit(1);
  }

  const selfcheckSampleRate = args["selfcheck-sample-rate"] != null ? Number(args["selfcheck-sample-rate"]) : 1.0;
  if (Number.isNaN(selfcheckSampleRate) || selfcheckSampleRate < 0 || selfcheckSampleRate > 1) {
    console.error(`--selfcheck-sample-rateは0.0〜1.0で指定してください: ${args["selfcheck-sample-rate"]}`);
    process.exit(1);
  }

  const budgetCap = args["budget-cap"] != null ? Number(args["budget-cap"]) : null;
  if (budgetCap != null && (Number.isNaN(budgetCap) || budgetCap <= 0)) {
    console.error(`--budget-capは正の数値で指定してください: ${args["budget-cap"]}`);
    process.exit(1);
  }

  const useCache = args["no-cache"] !== "true";

  // --scenarios未指定時はStage0デフォルト(設計書§8.2): 11種フルはまだ回さない
  const scenarioIds = args.scenarios
    ? splitCsv(args.scenarios)
    : ["normal_policy", "problem_occurred"];

  const caseIds = args.cases ? splitCsv(args.cases) : ["case_001"];
  const model = args.model === "sonnet" ? MODEL_SONNET : MODEL_HAIKU;

  const scenariosFile = JSON.parse(readFileSync(path.join(CASES_DIR, "scenarios_v0.1.json"), "utf8"));
  const scenarioMap = new Map(scenariosFile.scenarios.map(s => [s.scenario_id, s]));
  for (const id of scenarioIds) {
    if (!scenarioMap.has(id)) {
      console.error(`不明なscenario_id: ${id}`);
      process.exit(1);
    }
  }

  const neutralNFile = JSON.parse(readFileSync(path.join(HARNESS_DIR, "neutralN.json"), "utf8"));
  const neutralNInput = neutralNFile.value;

  const cases = caseIds.map(id => {
    const raw = loadCaseRaw(id);
    const kInput = buildKInput(raw.firstName, raw.lastName);
    if (!kInput) throw new Error(`case ${id}: firstName が不正で k_input を構築できません`);
    const legacyNInput = buildLegacyNInput(raw.birthDate);
    const interactionInput = buildInteractionInput(kInput, kInput.surnameInterface);
    return { raw, kInput, legacyNInput, interactionInput, neutralNInput };
  });

  const shufflePoolIds = args["shuffle-pool"] ? splitCsv(args["shuffle-pool"]) : null;
  const shufflePool = shufflePoolIds
    ? shufflePoolIds.map(id => {
        const raw = loadCaseRaw(id);
        const legacyNInput = buildLegacyNInput(raw.birthDate);
        return { case_id: raw.case_id, n_input: legacyNInput };
      })
    : cases.map(c => ({ case_id: c.raw.case_id, n_input: c.legacyNInput }));

  const isDryRun = args["dry-run"] === "true";
  const totalRecords = cases.length * scenarioIds.length * armNames.length;

  // 重複実行の検知(依頼者指摘対応)。同一experiment_idの完了ファイルが既に存在する場合、
  // これから生成しようとしている(case_id, scenario_id, model_arm, generation_mode)の
  // 組み合わせが既存レコードと衝突していないか確認する。衝突があれば、意図しない
  // 二重計上(重複レコード)を防ぐため既定でエラー終了する。意図的な再実行の場合は
  // --allow-duplicatesを付ける。
  if (!isDryRun) {
    const finalPath = path.join(RUNS_DIR, `${experimentId}.jsonl`);
    if (existsSync(finalPath)) {
      const existingLines = readFileSync(finalPath, "utf8").trim().split("\n").filter(Boolean);
      const existingKeys = new Set(existingLines.map(l => {
        const r = JSON.parse(l);
        return `${r.case_id}|${r.scenario_id}|${r.model_arm}|${r.generation_mode}`;
      }));
      const plannedKeys = [];
      for (const c of cases) {
        for (const scenarioId of scenarioIds) {
          for (const armName of armNames) {
            plannedKeys.push(`${c.raw.case_id}|${scenarioId}|${armName}|${generationMode}`);
          }
        }
      }
      const collisions = plannedKeys.filter(k => existingKeys.has(k));
      if (collisions.length > 0 && args["allow-duplicates"] !== "true") {
        console.error(`\n${finalPath} に、これから生成しようとする組み合わせと同一のレコードが既に${collisions.length}件存在します:`);
        for (const k of collisions.slice(0, 10)) console.error(`  ${k}`);
        if (collisions.length > 10) console.error(`  ...ほか${collisions.length - 10}件`);
        console.error(`\n意図した再実行であれば --allow-duplicates を付けて再実行してください(重複レコードとして追記されます)。`);
        console.error(`別条件で回すつもりだった場合は --experiment-id を変えてください。`);
        process.exit(1);
      }
    }
  }

  console.log(`experiment_id=${experimentId} model=${model} generation-mode=${generationMode}`);
  console.log(`arms=${armNames.join(",")}`);
  console.log(`scenarios=${scenarioIds.join(",")}`);
  console.log(`cases=${caseIds.join(",")} (${cases.length}件 = レコード生成対象)`);
  console.log(`shuffle-pool=${shufflePoolIds ? shufflePoolIds.join(",") : "(未指定。casesを流用)"} (${shufflePool.length}件)`);

  if (isDryRun) {
    console.log(`\n[dry-run] 実際のLLM呼び出しは行いません。`);
    console.log(`[dry-run] 生成予定レコード数: ${cases.length}ケース × ${scenarioIds.length}シナリオ × ${armNames.length}arm = ${totalRecords}件`);
    console.log(`[dry-run] 組み合わせ一覧:`);
    let i = 0;
    for (const c of cases) {
      for (const scenarioId of scenarioIds) {
        for (const armName of armNames) {
          i++;
          console.log(`  [${i}] ${c.raw.case_id} / ${scenarioId} / ${armName}`);
        }
      }
    }
    return;
  }

  // 見積もり: 先頭のcase×scenario×armを代表として使う
  initSeed(experimentId);
  const repCase = cases[0];
  const repScenario = scenarioMap.get(scenarioIds[0]);
  const repPool = shufflePool.filter(p => p.case_id !== repCase.raw.case_id);
  const repResolved = resolveInputsForArm(armNames[0], {
    kInput: repCase.kInput,
    legacyNInput: repCase.legacyNInput,
    neutralNInput: repCase.neutralNInput,
    shuffledNInputPool: repPool,
    interactionInput: repCase.interactionInput,
    contextInput: buildContextInput(repCase.raw.gender, repCase.raw.bloodType, repScenario.scenario_id),
  });
  const { perRecordCost } = estimatePerRecordCost({ generationMode, model, inputs: repResolved, scenario: repScenario });
  const cacheSavings = estimateCacheSavings({ generationMode, inputs: repResolved, scenario: repScenario });

  await confirmOrExit({ totalRecords, generationMode, perRecordCost, selfcheckSampleRate, budgetCap, useCache, cacheSavings, args });

  const usePartialName = budgetCap != null;
  const finalFileName = `${experimentId}.jsonl`;
  const partialFileName = `${experimentId}.partial.jsonl`;
  const writeFileName = usePartialName ? partialFileName : finalFileName;

  let count = 0;
  let cumulativeCostUsd = 0;
  let stoppedByBudget = false;

  outer:
  for (const c of cases) {
    for (const scenarioId of scenarioIds) {
      const scenario = scenarioMap.get(scenarioId);
      for (const armName of armNames) {
        const record = await runOneCombo({
          experimentId, model, generationMode, selfcheckSampleRate, useCache,
          c, shufflePool, scenario, armName, armNames,
        });

        appendRecord(RUNS_DIR, null, record, { fileName: writeFileName });
        count++;
        cumulativeCostUsd += record.cost_usd;

        console.log(`[${count}/${totalRecords}] ${c.raw.case_id} / ${scenarioId} / ${armName} -> 記録完了 (累積概算 $${cumulativeCostUsd.toFixed(4)})`);

        if (budgetCap != null && cumulativeCostUsd >= budgetCap) {
          stoppedByBudget = true;
          break outer;
        }
      }
    }
  }

  const writtenPath = path.join(RUNS_DIR, writeFileName);

  if (stoppedByBudget) {
    console.log(`\nbudget-capに到達したため停止しました。ここまでのコスト概算: $${cumulativeCostUsd.toFixed(4)}`);
    console.log(`${count}/${totalRecords}件を ${writtenPath} に書き込みました(ファイル名は.partial.jsonlのまま残します)。`);
  } else {
    if (usePartialName && existsSync(writtenPath)) {
      const finalPath = path.join(RUNS_DIR, finalFileName);
      if (existsSync(finalPath)) {
        // 既存の完了ファイルがある場合は「上書き」ではなく「追記」する。
        // 同じexperiment_idを複数回(例: generation-modeを変えて)実行して結果を
        // 積み上げていく運用を想定しているため、renameSyncによる上書きは事故のもとになる
        // (実際に発生した不具合: current→unified→two-callの順で同じexperiment_idを
        // 実行した際、2回目・3回目のrenameが1回目・2回目の結果ファイルを丸ごと消してしまった)。
        const partialContent = readFileSync(writtenPath, "utf8");
        appendFileSync(finalPath, partialContent, "utf8");
        unlinkSync(writtenPath);
        console.log(`\n完了。${count}件のレコードを既存の ${finalPath} に追記しました(budget-cap未到達のため.partialを解除)。`);
      } else {
        renameSync(writtenPath, finalPath);
        console.log(`\n完了。${count}件のレコードを ${finalPath} に書き込みました(budget-cap未到達のため.partialを解除)。`);
      }
    } else {
      console.log(`\n完了。${count}件のレコードを ${writtenPath} に書き込みました。`);
    }
    console.log(`累積コスト概算(実測usage優先、無い場合は文字数からの概算): $${cumulativeCostUsd.toFixed(4)}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
