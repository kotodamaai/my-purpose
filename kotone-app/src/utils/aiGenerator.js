import { PROXY_URL, buildSectionInputs, buildSectionPrompts } from '../data/prompts.js';

// ver3.1：スマホで「Load failed」（通信が途中で切れる）が出るため、
//   ・1回の通信に時間制限（60秒）を設ける
//   ・通信エラー・タイムアウト・429/5xx は、少し待って最大2回やり直す
//   ・画面が裏に回っている間は、表に戻るまで待ってからやり直す
const REQUEST_TIMEOUT_MS = 60000;
const RETRY_WAITS_MS = [1500, 4000];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function waitUntilVisible() {
  if (typeof document === "undefined" || !document.hidden) return Promise.resolve();
  return new Promise(resolve => {
    const onVis = () => { if (!document.hidden) { document.removeEventListener("visibilitychange", onVis); resolve(); } };
    document.addEventListener("visibilitychange", onVis);
  });
}

async function callProxyOnce(prompt, model, maxTokens, temperature) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const resp = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: ctrl.signal,
    });
    if (!resp.ok) {
      const e = await resp.json().catch(() => ({}));
      const err = new Error(e.error?.message || `HTTP ${resp.status}`);
      err.retryable = resp.status === 429 || resp.status >= 500;
      throw err;
    }
    const data = await resp.json();
    return data.content?.map(c => c.text || "").join("") || "";
  } catch (e) {
    // fetch 自体の失敗（Safari の「Load failed」、Chrome の「Failed to fetch」）と時間切れはやり直し対象
    if (e.name === "AbortError") { const t = new Error("時間切れ"); t.retryable = true; throw t; }
    if (e instanceof TypeError) e.retryable = true;
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function callProxy(prompt, model, maxTokens = 550, temperature = 0.5) {
  for (let attempt = 0; ; attempt++) {
    try {
      await waitUntilVisible();
      return await callProxyOnce(prompt, model, maxTokens, temperature);
    } catch (e) {
      if (!e.retryable || attempt >= RETRY_WAITS_MS.length) throw e;
      await sleep(RETRY_WAITS_MS[attempt]);
    }
  }
}

// 生成のあいだ画面が消えないようにする（対応ブラウザのみ。iOS Safari 16.4 以降など）
async function requestWakeLock() {
  try {
    if (typeof navigator !== "undefined" && navigator.wakeLock) return await navigator.wakeLock.request("screen");
  } catch { /* 対応していない・許可されない場合は何もしない */ }
  return null;
}

// ver3.2：場面を書くことになっているセクション（1:現象サマリー 2:お名前 3:お誕生日）だけを判定する。
//   光と影・締めはもともと「たとえば」を使わない構成なので、ここで毎回 Sonnet の作り直しが起きていた
const SCENE_SECTIONS = new Set([1, 2, 3]);
function shouldUseSonnet(idx, text) {
  if (!SCENE_SECTIONS.has(idx)) return false;
  if (!text) return false;
  if (!/たとえば|会議|誰か|場面|場合/.test(text)) return true;
  return false;
}

async function selfCheck(text) {
  const p = `以下の文章を読み、不自然な表現・意味ズレしている動詞や比喩があれば「NG: 箇所 → 修正案」の形で1行だけ返してください。なければ「OK」とだけ返してください。\n\n---\n${text}`;
  return (await callProxy(p, "claude-haiku-4-5-20251001", 60)).trim();
}

/**
 * 全セクションをAI生成する
 * @param {object} params - 診断パラメータ
 * @param {function} onSectionComplete - コールバック(idx, title, text, model)
 * @param {function} onSectionStart - コールバック(idx, title, status)
 */
export async function generateAllSections(params, onSectionComplete, onSectionStart) {
  const { firstName, lastName, gender, adjustedState, output, ln_interface, n_adj, n_L1, overlap } = params;

  const stateWithInteraction = adjustedState
    ? { ...adjustedState, interaction: output ? output.interaction : null }
    : null;

  const inputs = buildSectionInputs(firstName, lastName, gender, stateWithInteraction, ln_interface, n_adj, n_L1, overlap);
  const sections = buildSectionPrompts(inputs.full, inputs);

  const haiku = "claude-haiku-4-5-20251001";
  const sonnet = "claude-sonnet-4-5";

  // 作る順番（表示の順番とは別）。表示は キャッチ → 説明 の順のまま
  //   ① お名前から見えること・お誕生日から見えること・光と影（互いに独立なので同時に作る。ver3.1）
  //   ② 現象サマリー（お名前・お誕生日を踏まえる）→ ③ キャッチ（お名前・現象サマリーから）→ ④ 締め（キャッチを受ける）
  // 数字は表示の位置（0:キャッチ 1:現象サマリー 2:お名前 3:お誕生日 4:光と影 5:締め）
  const GENERATION_STEPS = [[2, 3, 4], [1], [0], [5]];
  // 先に書いた文章を、後のプロンプトへ差し込む
  const FILL = { 2: "__NAME__", 3: "__BIRTH__", 1: "__SUMMARY__", 0: "__CATCH__" };
  const fill = (token, value) => {
    for (const s2 of sections) s2.prompt = s2.prompt.split(token).join(value);
  };

  const runSection = async (i) => {
    const sec = sections[i];
    if (onSectionStart) onSectionStart(i, sec.title, "generating");

    try {
      // キャッチ(idx=0)は毎回ぶれないよう揺らぎを抑える
      const temp = i === 0 ? 0.1 : 0.5;
      let text = await callProxy(sec.prompt, haiku, 550, temp);
      let usedModel = "Haiku";

      if (shouldUseSonnet(i, text)) {
        if (onSectionStart) onSectionStart(i, sec.title, "retry-sonnet");
        text = await callProxy(sec.prompt, sonnet, 550, temp);
        usedModel = "Sonnet↑";
      }

      if (onSectionStart) onSectionStart(i, sec.title, "checking");
      const checkResult = await selfCheck(text);
      // ver3.2：答えに「NG」が入っているときだけ不合格にする（「OK。」「OKです」などを不合格にしない）
      const checkOk = !/NG/i.test(checkResult);

      if (!checkOk) {
        if (onSectionStart) onSectionStart(i, sec.title, "fixing");
        text = await callProxy(
          sec.prompt + `\n\n【前回の問題点】\n${checkResult}\n上記を修正して再生成してください。`,
          sonnet,
          550,
        );
        usedModel = "Sonnet修";
      }

      // 構造指示の番号（①②③）が本文に漏れたら取り除く
      if (text) text = text.replace(/^[ \t\u3000]*[①②③④⑤][ \t\u3000]*/gm, '');

      if (FILL[i]) fill(FILL[i], (text || "（未取得）").trim());

      if (onSectionComplete) onSectionComplete(i, sec.title, text, usedModel, checkOk);
    } catch (e) {
      // 失敗時も差し込み先を埋めてから継続
      if (FILL[i]) fill(FILL[i], "（未取得）");
      if (onSectionComplete) onSectionComplete(i, sec.title, null, null, false, String(e.message || e));
    }
  };

  const wakeLock = await requestWakeLock();
  try {
    for (const step of GENERATION_STEPS) {
      await Promise.all(step.map(runSection));
    }
  } finally {
    try { if (wakeLock) await wakeLock.release(); } catch { /* 何もしない */ }
  }
}
