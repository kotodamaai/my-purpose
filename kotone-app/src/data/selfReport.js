// 自己申告スケール v1.0
//
// 目的：診断文への感想ではなく、「診断とは独立した本人の位置」を測る。
// これがあると、エンジン出力（direction_distribution / motion スコア）と
// 自己申告の相関を計算でき、L1辞書やSURNAME_INTERFACEの値を
// 印象論ではなくデータで較正できる。
//
// 設問は構造用語（外向・収束・起点等）を含まない平易語で書くこと。
// 被験者に内部構造を推測させると回答が汚染される。
//
// compare: 分析時にこの項目と突き合わせるエンジン側の値
export const SELF_REPORT_ITEMS = [
  {
    id: "kiten",
    text: "思いついたことは、まず動いてみる方だ",
    compare: "motion.起点 / numerology.timing(immediate)",
  },
  {
    id: "naiko",
    text: "考えや気持ちは、自分の中で温めてから出す方だ",
    compare: "direction_distribution.内向",
  },
  {
    id: "kakusan",
    text: "興味や話は、次々に広がっていく方だ",
    compare: "motion.拡散",
  },
  {
    id: "shusoku",
    text: "ひとつのことを掘り下げて、絞り込んでいく方だ",
    compare: "motion.収束",
  },
  {
    id: "setsuzoku",
    text: "人や物事をつなぐ役回りになりやすい",
    compare: "motion.接続",
  },
  {
    id: "setsudan",
    text: "「ここまで」と線を引いて決めるのは得意な方だ",
    compare: "motion.切断",
  },
  {
    id: "hoji",
    text: "一度始めたことは、長く続く方だ",
    compare: "motion.保持 / numerology.persistence",
  },
];

// 5段階（1=あてはまらない 〜 5=とてもあてはまる）
export const SELF_REPORT_SCALE = [1, 2, 3, 4, 5];

export const SELF_REPORT_SCALE_LABELS = {
  1: "ちがう",
  5: "その通り",
};
