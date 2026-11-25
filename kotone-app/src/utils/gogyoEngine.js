// 五行エンジン（ver2.4・試行）
// 名前の音と誕生日を、同じ「五音（宮・商・角・徴・羽）＝五行」の物差しで突き合わせる
// 根拠：claude/誕生日×音_五行納音_調査メモ_v0_1.md
//
//   名前：音韻学の五音（発音の場所）→ 五行。日本の姓名判断の「音の五行」と同じ系統
//   誕生日：生まれた日の干支（日柱）の納音 → 五行。納音は五声と十二律（隔八相生）で作られた分類
//
// 決めたこと（v0.1。あっきーの確認待ち）
//   ・五音の割り当ては発音どおり（A7「発音を正とする」）：は・ひ・へ・ほ＝喉、ふ＝唇、ば・ぱ行＝唇、ち・つ＝歯
//   ・五音→五行は楽音の対応（宮＝唇＝土、羽＝喉＝水。『訓民正音解例』と同じ）。日本の通例（唇＝水、喉＝土）とは逆
//   ・名前の重みは名の位置の重み（2/3 ずつ減衰）をそのまま使う
//   ・五行の性格語（火＝情熱 など）は使わない。関係（比和・相生・相剋）だけを使う
import { decomposeSounds, NAME_POSITION_RATIO } from './kotodamaEngine.js';

const GOON = {};
for (const c of "かきくけこ") GOON[c] = "牙";
for (const c of "たてとなにぬねのらりるれろ") GOON[c] = "舌";
for (const c of "さしすせそちつ") GOON[c] = "歯";
for (const c of "ふまみむめも") GOON[c] = "唇";
for (const c of "あいうえおやゆよわをはひへほ") GOON[c] = "喉";

export const GOON_TO_GOGYO = { 牙: "木", 舌: "火", 歯: "金", 唇: "土", 喉: "水" };
const GENERATES = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" }; // 相生：左が右を生む

// 1音の五音。は行に濁点・半濁点が付いていれば（ば・ぱ行）唇
function goonOf(s) {
  if ("はひへほ".includes(s.ch) && s.overlay && (s.overlay.includes("重量") || s.overlay.includes("弾み"))) return "唇";
  return GOON[s.ch] || null;
}

// 名前の五行の分布（位置の重みつき）と、頭の音（核）の五行
export function getNameGogyo(name) {
  if (!name) return null;
  const sounds = decomposeSounds(name);
  const dist = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  let head = null;
  let lastPos = -1;
  for (const s of sounds) {
    if (s.markOnly || s.pos === undefined) continue;
    if (s.pos === lastPos) continue; // 拗音の小書き文字は前の音に含める（頭子音で五音が決まるため）
    lastPos = s.pos;
    const g = goonOf(s);
    if (!g) continue; // ん など
    const gy = GOON_TO_GOGYO[g];
    dist[gy] += Math.pow(NAME_POSITION_RATIO, s.pos);
    if (head === null) head = gy;
  }
  return { head, dist };
}

// 日干支（0＝甲子 … 59＝癸亥）。2000-01-01（ユリウス通日 2451545）＝戊午（54）で検算済み
export function julianDayNumber(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
export function dayGanzhiIndex(y, m, d) {
  return ((julianDayNumber(y, m, d) + 49) % 60 + 60) % 60;
}

// 納音（六十干支を二つずつ組にした30種）
const NAYIN = [
  ["海中金", "金"], ["炉中火", "火"], ["大林木", "木"], ["路旁土", "土"], ["剣鋒金", "金"],
  ["山頭火", "火"], ["澗下水", "水"], ["城頭土", "土"], ["白蝋金", "金"], ["楊柳木", "木"],
  ["泉中水", "水"], ["屋上土", "土"], ["霹靂火", "火"], ["松柏木", "木"], ["長流水", "水"],
  ["沙中金", "金"], ["山下火", "火"], ["平地木", "木"], ["壁上土", "土"], ["金箔金", "金"],
  ["覆灯火", "火"], ["天河水", "水"], ["大駅土", "土"], ["釵釧金", "金"], ["桑柘木", "木"],
  ["大渓水", "水"], ["沙中土", "土"], ["天上火", "火"], ["石榴木", "木"], ["大海水", "水"],
];
const STEMS = "甲乙丙丁戊己庚辛壬癸";
const BRANCHES = "子丑寅卯辰巳午未申酉戌亥";

export function getDayNayin(y, m, d) {
  const idx = dayGanzhiIndex(y, m, d);
  const [name, gogyo] = NAYIN[Math.floor(idx / 2)];
  return { ganzhi: STEMS[idx % 10] + BRANCHES[idx % 12], name, gogyo };
}

// 二つの五行の関係
export function gogyoRelation(a, b) {
  if (!a || !b) return null;
  if (a === b) return "比和";
  if (GENERATES[a] === b || GENERATES[b] === a) return "相生";
  return "相剋";
}

// 名前と誕生日の重なり（ver2.4）
//   二重に刻まれた：名の頭の音（核）の五行が、生まれた日の納音の五行と同じ（比和）
//   響き合う    ：核の五行と納音の五行が、生み・生まれる関係（相生）
//   一部重なる  ：核とは抑え合う関係（相剋）だが、名前の他の音に納音と同じ五行がある
//   二つの顔    ：それ以外（名前と生まれた日が別の面を持つ＝二面性）
export function judgeNameBirthdayGogyo(firstName, y, m, d) {
  const ng = getNameGogyo(firstName);
  if (!ng || !ng.head || !y || !m || !d) return null;
  const day = getDayNayin(y, m, d);
  const relation = gogyoRelation(ng.head, day.gogyo);
  let type;
  if (relation === "比和") type = "二重に刻まれた";
  else if (relation === "相生") type = "響き合う";
  else if (ng.dist[day.gogyo] > 0) type = "一部重なる";
  else type = "二つの顔";
  return { type, relation, nameHead: ng.head, nameDist: ng.dist, day };
}
