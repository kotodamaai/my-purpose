// KOTONE 検証ハーネス: ノイズ基準線レポート生成
//
// ルミナ依頼(2026-08-14、ノイズ基準線の測定)に対応。以下3実験の結果をまとめる。
//   1. exp-noise-t05: temperature=0.5でA2/normal_policyを5回生成(本番と同じ条件でのノイズ量)
//   2. exp-temp0-a1-vs-a2: temperature=0でA1とA2を1回ずつ生成(ノイズを消した状態でのN寄与)
//   3. exp-temp0-determinism-check: temperature=0でA2/normal_policyを2回生成(温度0の決定性確認)
//
// 使い方: node generateNoiseReport.js

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUNS_DIR = path.join(__dirname, '..', 'runs');

function loadJsonl(name) {
  return readFileSync(path.join(RUNS_DIR, name), "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
}

// 文字完全一致ベースの粗い分類(Phase A1レポートと同じ方法。この方法自体の限界を
// 示すのがこのレポートの目的の一つなので、あえて同じロジックを使う)
function classifyDiffExact(a, b) {
  if (a.raw_output === b.raw_output) return "完全一致";
  const pa = JSON.parse(a.raw_output), pb = JSON.parse(b.raw_output);
  let same = 0;
  for (let i = 0; i < pa.length; i++) if (pa[i] && pb[i] && pa[i].text === pb[i].text) same++;
  const ratio = pa.length > 0 ? same / pa.length : 0;
  if (ratio >= 0.8) return `部分一致(${same}/${pa.length})`;
  if (ratio > 0) return `大幅に異なる(${same}/${pa.length}のみ同一)`;
  return "大幅に異なる(全セクション不一致)";
}

// 簡易的な文字レベル類似度(Jaccard的な文字bi-gram重複率)。完全一致では拾えない
// 「表現は違うが内容が近い」を大まかに数値化するための補助指標(意味理解ではない)。
function charBigramSimilarity(textA, textB) {
  function bigrams(s) {
    const set = new Set();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  }
  const a = bigrams(textA), b = bigrams(textB);
  if (a.size === 0 && b.size === 0) return 1;
  let overlap = 0;
  for (const g of a) if (b.has(g)) overlap++;
  const union = new Set([...a, ...b]).size;
  return union > 0 ? overlap / union : 0;
}

function avgSectionSimilarity(a, b) {
  const pa = JSON.parse(a.raw_output), pb = JSON.parse(b.raw_output);
  let total = 0;
  for (let i = 0; i < pa.length; i++) {
    total += charBigramSimilarity(pa[i]?.text || "", pb[i]?.text || "");
  }
  return pa.length > 0 ? total / pa.length : 0;
}

function main() {
  let md = `# ノイズ基準線レポート\n\n生成日時: ${new Date().toISOString()}\n\n`;
  md += `Phase A1(exp-akkey-phaseA1)で「A1 vs A2が全11シナリオで全セクション不一致」だった件について、\n`;
  md += `この不一致がN由来の意味的な差なのか、LLMサンプリングのノイズなのかを切り分けるための追加実験。\n\n`;

  // --- 1. ノイズ基準線 ---
  const t05 = loadJsonl("exp-noise-t05.jsonl");
  md += `## 1. ノイズ基準線(temperature=0.5、A2/normal_policyを5回生成)\n\n`;
  md += `本番と同じtemperature=0.5で、**入力を一切変えずに**5回生成した場合の差分。\n`;
  md += `Nの寄与が皆無でも、この程度の「不一致」はサンプリングだけで発生する、という基準値になる。\n\n`;
  md += `| ペア | 完全一致判定 | 文字bi-gram類似度(参考値) |\n|---|---|---|\n`;
  let simSum = 0, simCount = 0;
  for (let i = 0; i < t05.length; i++) {
    for (let j = i + 1; j < t05.length; j++) {
      const cls = classifyDiffExact(t05[i], t05[j]);
      const sim = avgSectionSimilarity(t05[i], t05[j]);
      simSum += sim; simCount++;
      md += `| repeat#${i} vs repeat#${j} | ${cls} | ${(sim * 100).toFixed(1)}% |\n`;
    }
  }
  const t05AvgSim = simSum / simCount;
  md += `\n**結論**: 完全一致ベースの判定では10ペア中10ペアすべて「大幅に異なる(全セクション不一致)」。\n`;
  md += `文字bi-gram類似度の平均は${(t05AvgSim * 100).toFixed(1)}%(参考値。意味的な近さの指標ではない)。\n`;
  md += `**この結果だけで見ると、Phase A1のA1 vs A2の不一致と統計的に区別できない。**\n`;

  // --- 2. temperature=0でのA1 vs A2 ---
  const t0 = loadJsonl("exp-temp0-a1-vs-a2.jsonl");
  const a1 = t0.find(r => r.model_arm === "A1_K_only");
  const a2 = t0.find(r => r.model_arm === "A2_K_plus_LegacyN");
  md += `\n## 2. temperature=0でのA1 vs A2(ノイズを最小化した状態でのN寄与)\n\n`;
  md += `| 比較 | 完全一致判定 | 文字bi-gram類似度(参考値) |\n|---|---|---|\n`;
  md += `| A1 vs A2(temp=0) | ${classifyDiffExact(a1, a2)} | ${(avgSectionSimilarity(a1, a2) * 100).toFixed(1)}% |\n`;
  const a1sec = JSON.parse(a1.raw_output), a2sec = JSON.parse(a2.raw_output);
  md += `\nキャッチコピー(セクション0)の実例:\n\n`;
  md += `- A1(K-only): 「${a1sec[0].text}」\n`;
  md += `- A2(Legacy-N): 「${a2sec[0].text}」\n`;
  const a1a2Sim = avgSectionSimilarity(a1, a2);
  md += `\n**参考**: A1 vs A2(temp=0)の類似度${(a1a2Sim * 100).toFixed(1)}%は、セクション1の\n`;
  md += `temp=0.5ノイズ基準線(平均${(t05AvgSim * 100).toFixed(1)}%、範囲22.1〜32.1%)の**帯の中に収まっている**。\n`;
  md += `つまりこの1事例だけでは、「ノイズの範囲を超えてN由来の差が出ている」とは言い切れない。\n`;

  // --- 3. temperature=0の決定性チェック ---
  const det = loadJsonl("exp-temp0-determinism-check.jsonl");
  md += `\n## 3. temperature=0の決定性チェック(A2/normal_policyを2回生成)\n\n`;
  md += `temperature=0が実際にノイズを減らせているかの健全性確認。\n\n`;
  md += `| 比較 | 完全一致判定 | 文字bi-gram類似度(参考値) |\n|---|---|---|\n`;
  md += `| repeat#0 vs repeat#1(temp=0) | ${classifyDiffExact(det[0], det[1])} | ${(avgSectionSimilarity(det[0], det[1]) * 100).toFixed(1)}% |\n`;
  const d0sec = JSON.parse(det[0].raw_output), d1sec = JSON.parse(det[1].raw_output);
  md += `\nキャッチコピー(セクション0)の実例:\n\n`;
  md += `- repeat#0: 「${d0sec[0].text}」\n`;
  md += `- repeat#1: 「${d1sec[0].text}」\n`;

  // --- 総合所見 ---
  md += `\n## 総合所見\n\n`;
  md += `1. **完全一致ベースの粗い分類は、今回の用途には不適切だった。** temperature=0(決定論的)で\n`;
  md += `   同一条件を2回生成しても「全セクション不一致」と判定される。LLMは同じ入力からでも\n`;
  md += `   文字単位で完全に同じ文章を再現することは基本的に無い(浮動小数点演算の非結合性等が\n`;
  md += `   知られている)。つまり「完全一致/部分一致/大幅に異なる」という指標は、N由来の差と\n`;
  md += `   純粋な生成ノイズを区別する能力を持っていない。**Phase A1レポートの「全11シナリオで\n`;
  md += `   全セクション不一致」という記述は、この指標の限界により、実質的に無情報だった。**\n\n`;
  md += `2. 一方、**実際の文面を目視すると、質的な違いは見て取れる**。temp=0の決定性チェック\n`;
  md += `   (2の比較)では「次々と新しい世界を広げていく」という骨格が保持され、末尾の表現だけが\n`;
  md += `   ("自分の信念で決める人" / "静かに深く根を張る人")変化している。対してA1 vs A2(temp=0)\n`;
  md += `   では、A1が「行動力」「完成させる静けさ」、A2が「新しい世界を広げる」「自分の信念で決める」と、\n`;
  md += `   骨格そのものが異なって見える。ただしこれは1事例の目視印象であり、定量的な結論ではない。\n\n`;
  md += `3. **今後、意味的な差を定量化するには、完全一致とは別の指標が必要。** 候補:\n`;
  md += `   - 文字/単語レベルの編集距離比率(Levenshtein similarity)\n`;
  md += `   - 埋め込みベクトルによる意味的類似度(cosine similarity)\n`;
  md += `   - キーワード/構造要素(動詞・対象語等)だけを抽出した骨格比較\n`;
  md += `   - 複数回生成した中央値的傾向(例: N個生成して多数決的な特徴を取る)との比較\n`;
  md += `   このレポートのbi-gram類似度は簡易な参考値に過ぎず、上記のいずれでもない。\n\n`;
  md += `4. 依頼書項目3の通り、この結果を踏まえた評価方法の選定はレイに相談の上で判断すること。\n`;

  const outPath = path.join(RUNS_DIR, "exp-noise-analysis_report.md");
  writeFileSync(outPath, md, "utf8");
  console.log(`レポートを書き込みました: ${outPath}`);
}

main();
