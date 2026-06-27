import { PROXY_URL, buildPromptInput, buildSectionPrompts } from '../data/prompts.js';

export async function callProxy(prompt, model, maxTokens = 550) {
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
  const { firstName, lastName, gender, bloodType, adjustedState, output, ln_interface, n_adj } = params;

  const stateWithInteraction = adjustedState
    ? { ...adjustedState, interaction: output ? output.interaction : null }
    : null;

  const inputData = buildPromptInput(firstName, lastName, gender, bloodType, stateWithInteraction, ln_interface, n_adj);
  const sections = buildSectionPrompts(inputData);

  const haiku = "claude-haiku-4-5-20251001";
  const sonnet = "claude-sonnet-4-5";

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    if (onSectionStart) onSectionStart(i, sec.title, "generating");

    try {
      let text = await callProxy(sec.prompt, haiku, 550);
      let usedModel = "Haiku";

      if (shouldUseSonnet(i, text)) {
        if (onSectionStart) onSectionStart(i, sec.title, "retry-sonnet");
        text = await callProxy(sec.prompt, sonnet, 550);
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

      if (onSectionComplete) onSectionComplete(i, sec.title, text, usedModel, checkOk);
    } catch (e) {
      if (onSectionComplete) onSectionComplete(i, sec.title, null, null, false, String(e.message || e));
    }
  }
}
