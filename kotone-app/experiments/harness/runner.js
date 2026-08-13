// KOTONE 検証ハーネス: 実行エントリポイント
//
// 使い方:
//   node runner.js --experiment-id=exp-001 --arms=A1_K_only,A2_K_plus_LegacyN \
//     [--scenarios=normal_policy,problem_occurred] [--cases=case_001] \
//     [--shuffle-pool=case_002,case_003] [--model=haiku|sonnet] [--dry-run]
//
// --scenarios 未指定時は normal_policy と problem_occurred の2種のみ(設計書§8.2 Stage0向け)。
// --cases 未指定時は case_001 のみ。--model 未指定時は haiku固定。
//
// --cases は「レコードを生成する対象」専用。--shuffle-pool は「A4(Shuffled-N)の
// 借用元候補」専用で、--casesとは完全に別の集合として扱う(--cases側のケースを
// 借用元プールに混ぜない)。--shuffle-pool省略時は、従来通り--cases自身(自分以外)を
// 借用プールとして使う(後方互換)。
//
// --dry-run を付けると、実際のLLM呼び出しを一切行わず、生成される予定の
// レコード件数と(case, scenario, arm)の全組み合わせだけを表示して終了する。
// 本番実行前の件数確認に使う。
//
// 実データケース(氏名・生年月日等の個人情報)は cases/ 直下ではなく cases/private/ に置く。
// private/ は.gitignoreで常に除外されるため、`--cases=private/case_akkey` のように
// サブディレクトリを含めて指定する(拡張子.jsonは付けない。他のcase指定と同じ書式)。
//
// 本番コード(src/data/prompts.js, src/utils/aiGenerator.js等)は一切importしない。
// PROXY_URLとモデルID文字列は本番と同じ値を定数として複製している(ロジックのコピーではなく
// 単なる接続先定数)。

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildKInput, buildLegacyNInput, buildInteractionInput, buildContextInput } from './inputBuilders.js';
import { ARMS, initSeed, resolveInputsForArm } from './armResolver.js';
import { assembleAllSectionPrompts, HARNESS_PROMPT_VERSION } from './promptAssembler.js';
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

function nVersionFor(nInput) {
  if (!nInput) return "n/a";
  if (nInput.source === "legacy") return "legacy-v1.1";
  if (nInput.source === "shuffled") return "legacy-v1.1(shuffled)";
  if (nInput.source === "neutral") return "neutral-v0.1";
  return "unknown";
}

async function callProxy(prompt, model, maxTokens = 550) {
  const resp = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.5,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!resp.ok) {
    const e = await resp.json().catch(() => ({}));
    throw new Error(e.error?.message || `HTTP ${resp.status}`);
  }
  const data = await resp.json();
  return data.content?.map(c => c.text || "").join("") || "";
}

async function selfCheck(text) {
  const p = `以下の文章を読み、不自然な表現・意味ズレしている動詞や比喩があれば「NG: 箇所 → 修正案」の形で1行だけ返してください。なければ「OK」とだけ返してください。\n\n---\n${text}`;
  return (await callProxy(p, MODEL_HAIKU, 60)).trim();
}

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    const m = /^--([^=]+)=(.*)$/.exec(raw);
    if (m) { args[m[1]] = m[2]; continue; }
    const m2 = /^--([^=]+)$/.exec(raw);
    if (m2) args[m2[1]] = "true"; // 値なしフラグ(例: --dry-run)
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

async function runOneCombo({ experimentId, model, c, shufflePool, scenario, armName, armNames }) {
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

  const sections = assembleAllSectionPrompts(resolved, scenario);
  const sectionResults = [];

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    let rawText = "";
    let checkedText = "";

    try {
      rawText = await callProxy(sec.prompt, model, 550);
    } catch (e) {
      rawText = `(ERROR: ${e.message || e})`;
    }

    // キャッチコピー(index 0)完了後、締め(index 5)の __CATCH__ を置換(本番aiGenerator.jsと同じ順序)
    if (i === 0 && rawText && !rawText.startsWith("(ERROR:")) {
      sections[5].prompt = sections[5].prompt.replace("__CATCH__", rawText.trim());
    } else if (i === 0) {
      sections[5].prompt = sections[5].prompt.replace("__CATCH__", "（キャッチコピー未取得）");
    }

    try {
      const checkResult = await selfCheck(rawText);
      if (checkResult.trim() === "OK") {
        checkedText = rawText;
      } else {
        checkedText = await callProxy(
          sec.prompt + `\n\n【前回の問題点】\n${checkResult}\n上記を修正して再生成してください。`,
          MODEL_SONNET,
          550
        );
      }
    } catch (e) {
      checkedText = `(ERROR: ${e.message || e})`;
    }

    sectionResults.push({ title: sec.title, prompt: sec.prompt, rawText, checkedText });
  }

  const combinedPromptText = sectionResults.map(s => s.prompt).join("\n\n===SECTION===\n\n");
  const promptHash = hashPrompt(combinedPromptText);

  let reviewerNotes = "";
  if (resolved.n_input && resolved.n_input.source === "shuffled") {
    reviewerNotes = `shuffled-N: case_id=${resolved.n_input.borrowed_from_case_id} から借用`;
  } else if (ARMS[armName].useN === "shuffled" && !resolved.n_input) {
    reviewerNotes = "shuffled-N: 候補となる他ケースが無いためn_input=null(単一ケース実行時など)";
  }

  const record = {
    experiment_id: experimentId,
    case_id: c.raw.case_id,
    subject_id: c.raw.subject_id,
    scenario_id: scenario.scenario_id,
    created_at: new Date().toISOString(),
    model_arm: armName,
    k_version: K_VERSION,
    n_version: nVersionFor(resolved.n_input),
    integration_version: "n/a",
    prompt_version: HARNESS_PROMPT_VERSION,
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
    raw_output: JSON.stringify(sectionResults.map(s => ({ title: s.title, text: s.rawText }))),
    checked_output: JSON.stringify(sectionResults.map(s => ({ title: s.title, text: s.checkedText }))),
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

  return appendRecord(RUNS_DIR, experimentId, record);
}

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

  // --shuffle-pool未指定時は、従来通り--cases自身(自分以外)を借用プールとする(後方互換)
  const shufflePoolIds = args["shuffle-pool"] ? splitCsv(args["shuffle-pool"]) : null;
  const shufflePool = shufflePoolIds
    ? shufflePoolIds.map(id => {
        const raw = loadCaseRaw(id);
        const legacyNInput = buildLegacyNInput(raw.birthDate);
        return { case_id: raw.case_id, n_input: legacyNInput };
      })
    : cases.map(c => ({ case_id: c.raw.case_id, n_input: c.legacyNInput }));

  const isDryRun = args["dry-run"] === "true";

  console.log(`experiment_id=${experimentId} model=${model}`);
  console.log(`arms=${armNames.join(",")}`);
  console.log(`scenarios=${scenarioIds.join(",")}`);
  console.log(`cases=${caseIds.join(",")} (${cases.length}件 = レコード生成対象)`);
  console.log(`shuffle-pool=${shufflePoolIds ? shufflePoolIds.join(",") : "(未指定。casesを流用)"} (${shufflePool.length}件)`);

  const totalRecords = cases.length * scenarioIds.length * armNames.length;

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

  initSeed(experimentId);

  let count = 0;
  let lastFilePath = null;

  for (const c of cases) {
    for (const scenarioId of scenarioIds) {
      const scenario = scenarioMap.get(scenarioId);
      for (const armName of armNames) {
        lastFilePath = await runOneCombo({ experimentId, model, c, shufflePool, scenario, armName, armNames });
        count++;
        console.log(`[${count}/${totalRecords}] ${c.raw.case_id} / ${scenarioId} / ${armName} -> 記録完了`);
      }
    }
  }

  console.log(`完了。${count}件のレコードを ${lastFilePath} に書き込みました。`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
