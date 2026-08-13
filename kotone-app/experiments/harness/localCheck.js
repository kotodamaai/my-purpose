// KOTONE 検証ハーネス: ローカル検証(LLM不使用)
//
// 依頼書1-Aに対応。LLM判定に丸投げしていたチェックのうち、決定論的に(JSの文字列処理だけで)
// 判定できるものをここに切り出す。LLM判定は「意味の矛盾」「文脈依存の断定」「ニュアンス評価」
// 「原文の意味保持」など、機械的ルールでは拾えないものだけに絞り込むための土台。

export const SECTION_TITLES = [
  "あなたはこんな人",
  "現象サマリー",
  "お名前から見えること",
  "お誕生日から見えること",
  "光と影",
  "締め",
];

// CONFIDENTIAL_RULEの禁止語(構造用語・システム説明・断定表現)をローカルで機械的に検出する
const BANNED_TERMS = [
  "外向", "内向", "収束", "拡散", "起点", "切断", "保持", "接続",
  "言霊", "音霊", "数秘術", "L1", "L2",
];

// 断定表現の簡易パターン(「あなたは〜です」型。厳密な文脈判定はLLM判定側に残す)
const ASSERTION_PATTERN = /あなたは[^。\n]{0,20}です[。\n]/;

// お名前セクションにNの語彙(タイミング表現)が漏れていないかのチェック用
const N_TIMING_PHRASES = [
  "すぐに動き始める",
  "じっくり時間をかけて動く",
  "繰り返しながら動く",
  "早めに動き始める",
];

const SECTION_LENGTH_RANGE = { min: 20, max: 900 };

function checkSectionPresence(sectionResults) {
  const gotTitles = sectionResults.map(s => s.title);
  const missing = SECTION_TITLES.filter(t => !gotTitles.includes(t));
  const dupCounts = {};
  for (const t of gotTitles) dupCounts[t] = (dupCounts[t] || 0) + 1;
  const duplicated = Object.entries(dupCounts).filter(([, c]) => c > 1).map(([t]) => t);
  const pass = missing.length === 0 && duplicated.length === 0 && gotTitles.length === SECTION_TITLES.length;
  return { name: "section_presence", pass, detail: { missing, duplicated, count: gotTitles.length } };
}

function checkLengths(sectionResults) {
  const violations = [];
  for (const s of sectionResults) {
    const len = (s.text || "").length;
    if (len < SECTION_LENGTH_RANGE.min || len > SECTION_LENGTH_RANGE.max) {
      violations.push({ title: s.title, length: len });
    }
  }
  return { name: "length_range", pass: violations.length === 0, detail: { violations, range: SECTION_LENGTH_RANGE } };
}

function checkBannedTerms(sectionResults) {
  const hits = [];
  for (const s of sectionResults) {
    const text = s.text || "";
    for (const term of BANNED_TERMS) {
      if (text.includes(term)) hits.push({ title: s.title, term });
    }
    if (ASSERTION_PATTERN.test(text)) hits.push({ title: s.title, term: "断定表現(あなたは〜です)" });
  }
  return { name: "banned_terms", pass: hits.length === 0, detail: { hits } };
}

// お名前セクションにNのタイミング語彙が漏れていないか(K/N混入チェック)
function checkKNLeak(sectionResults) {
  const nameSection = sectionResults.find(s => s.title === "お名前から見えること");
  const hits = [];
  if (nameSection) {
    for (const phrase of N_TIMING_PHRASES) {
      if ((nameSection.text || "").includes(phrase)) hits.push(phrase);
    }
  }
  return { name: "kn_leak", pass: hits.length === 0, detail: { hits } };
}

/**
 * @param {Array<{title: string, text: string}>} sectionResults
 * @returns {{pass: boolean, checks: Array<{name: string, pass: boolean, detail: object}>}}
 */
export function runLocalCheck(sectionResults) {
  const checks = [
    checkSectionPresence(sectionResults),
    checkLengths(sectionResults),
    checkBannedTerms(sectionResults),
    checkKNLeak(sectionResults),
  ];
  const pass = checks.every(c => c.pass);
  return { pass, checks };
}
