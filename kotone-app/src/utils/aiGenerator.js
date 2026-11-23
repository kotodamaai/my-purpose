import { PROXY_URL, buildPromptInput, buildSectionPrompts } from '../data/prompts.js';

export async function callProxy(prompt, model, maxTokens = 550, temperature = 0.5) {
  const resp = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
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

function shouldUseSonnet(idx, text) {
  if (idx === 0) return false;
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

  const inputData = buildPromptInput(firstName, lastName, gender, stateWithInteraction, ln_interface, n_adj, n_L1, overlap);
  const sections = buildSectionPrompts(inputData);

  const haiku = "claude-haiku-4-5-20251001";
  const sonnet = "claude-sonnet-4-5";

  // 作る順番（表示の順番とは別）。表示は キャッチ → 説明 の順のまま
  //   お名前から見えること → お誕生日から見えること → 現象サマリー（両方を踏まえる）
  //   → キャッチ（お名前・現象サマリーから作る）→ 光と影 → 締め（キャッチを受ける）
  // 数字は表示の位置（0:キャッチ 1:現象サマリー 2:お名前 3:お誕生日 4:光と影 5:締め）
  const GENERATION_ORDER = [2, 3, 1, 0, 4, 5];
  // 先に書いた文章を、後のプロンプトへ差し込む
  const FILL = { 2: "__NAME__", 3: "__BIRTH__", 1: "__SUMMARY__", 0: "__CATCH__" };
  const fill = (token, value) => {
    for (const s2 of sections) s2.prompt = s2.prompt.split(token).join(value);
  };

  for (const i of GENERATION_ORDER) {
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
      const checkOk = checkResult.trim() === "OK";

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
  }
}
