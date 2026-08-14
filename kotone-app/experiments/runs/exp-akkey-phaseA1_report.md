# Phase A1 実行レポート: exp-akkey-phaseA1

生成日時: 2026-08-14T17:15:40.730Z

総レコード数: 44 / エラー件数: 0

## arm別サマリー

| arm | 実費(合計) | 1レコード実費 | 呼び出し回数/レコード | ローカル検証失敗率 | LLM判定NG率 | 修正生成発生率 |
|---|---|---|---|---|---|---|
| A1_K_only | $0.22744 | $0.02068 | 2.73 | 27.3% | 72.7%(11/11) | 72.7%(8/11) |
| A2_K_plus_LegacyN | $0.23107 | $0.02101 | 2.73 | 18.2% | 72.7%(11/11) | 72.7%(8/11) |
| A3_K_plus_NeutralN | $0.22587 | $0.02053 | 2.73 | 27.3% | 72.7%(11/11) | 72.7%(8/11) |
| A4_K_plus_ShuffledN | $0.20446 | $0.01859 | 2.64 | 9.1% | 63.6%(11/11) | 63.6%(7/11) |

## シチュエーション別サマリー

| シナリオ | 実費(合計) | 1レコード実費 | ローカル検証失敗率 | LLM判定NG率 | 修正生成発生率 |
|---|---|---|---|---|---|
| normal_policy | $0.06726 | $0.01682 | 25.0% | 50.0%(4/4) | 50.0%(2/4) |
| problem_occurred | $0.08481 | $0.02120 | 50.0% | 75.0%(4/4) | 75.0%(3/4) |
| delegating | $0.06254 | $0.01563 | 0.0% | 50.0%(4/4) | 50.0%(2/4) |
| third_party_conflict | $0.09917 | $0.02479 | 25.0% | 100.0%(4/4) | 100.0%(4/4) |
| first_meeting_small_group | $0.06264 | $0.01566 | 25.0% | 50.0%(4/4) | 50.0%(2/4) |
| first_meeting_large_group | $0.06348 | $0.01587 | 25.0% | 50.0%(4/4) | 50.0%(2/4) |
| person_liked | $0.08924 | $0.02231 | 25.0% | 75.0%(4/4) | 75.0%(3/4) |
| person_disliked | $0.08496 | $0.02124 | 0.0% | 75.0%(4/4) | 75.0%(3/4) |
| desire_unmet | $0.08405 | $0.02101 | 0.0% | 75.0%(4/4) | 75.0%(3/4) |
| no_progress | $0.08416 | $0.02104 | 25.0% | 75.0%(4/4) | 75.0%(3/4) |
| deadline_vs_review | $0.10652 | $0.02663 | 25.0% | 100.0%(4/4) | 100.0%(4/4) |

## クリーンなレコード(ローカル検証・LLM判定の両方をパス)

12 / 44 件

| case_id | scenario_id | model_arm |
|---|---|---|
| case_akkey | normal_policy | A2_K_plus_LegacyN |
| case_akkey | problem_occurred | A4_K_plus_ShuffledN |
| case_akkey | delegating | A2_K_plus_LegacyN |
| case_akkey | delegating | A3_K_plus_NeutralN |
| case_akkey | first_meeting_small_group | A1_K_only |
| case_akkey | first_meeting_small_group | A3_K_plus_NeutralN |
| case_akkey | first_meeting_large_group | A1_K_only |
| case_akkey | first_meeting_large_group | A4_K_plus_ShuffledN |
| case_akkey | person_liked | A4_K_plus_ShuffledN |
| case_akkey | person_disliked | A1_K_only |
| case_akkey | desire_unmet | A3_K_plus_NeutralN |
| case_akkey | no_progress | A2_K_plus_LegacyN |

## A1〜A4間のraw_output差分(シチュエーション別)

テキストとしての一致度のみを機械的に分類(完全一致/部分一致/大幅に異なる)。意味的評価は含まない。

| シナリオ | A1 vs A2(K-only vs Legacy-N) | A2 vs A3(Legacy-N vs Neutral-N) | A2 vs A4(Legacy-N vs Shuffled-N) |
|---|---|---|---|
| normal_policy | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) |
| problem_occurred | 大幅に異なる(全セクション不一致) | 大幅に異なる(セクション1/6のみ同一) | 大幅に異なる(全セクション不一致) |
| delegating | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) |
| third_party_conflict | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) | 大幅に異なる(セクション1/6のみ同一) |
| first_meeting_small_group | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) |
| first_meeting_large_group | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) |
| person_liked | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) |
| person_disliked | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) |
| desire_unmet | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) |
| no_progress | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) |
| deadline_vs_review | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) | 大幅に異なる(全セクション不一致) |

## prompt_hashの違い(A1〜A4間、N欄の反映確認)

同一シナリオ内でA1〜A4のprompt_hashが4つとも異なっていれば、N入力の有無・値の違いが
プロンプトレベルで正しく反映されていることになる(値の中身は見ず、ハッシュの一致/不一致のみ確認)。

| シナリオ | 4arm間で全て異なるか | 詳細 |
|---|---|---|
| normal_policy | OK(4種とも異なる) | a1f2047c / 8ccea6df / de74a5ce / 2e9b1311 |
| problem_occurred | OK(4種とも異なる) | dcb057f1 / dddafe5f / e9bd95cd / 928b4b54 |
| delegating | OK(4種とも異なる) | b02477ec / 7b046333 / 3eb4477e / b5fc7d2b |
| third_party_conflict | OK(4種とも異なる) | 11a7a664 / 50851e75 / 6edf90f5 / 4bbdf861 |
| first_meeting_small_group | OK(4種とも異なる) | 81fd9cfc / a80529e6 / d54a8ef7 / f8163832 |
| first_meeting_large_group | OK(4種とも異なる) | 347cfc46 / 413b7474 / 56a9cc13 / 7323119a |
| person_liked | OK(4種とも異なる) | 4638082f / 7345071e / 4937dd3e / 1c69f28e |
| person_disliked | OK(4種とも異なる) | 8dffce6d / afb31e6e / 54961f0e / 91c42e01 |
| desire_unmet | OK(4種とも異なる) | d22ea3bd / 59bc8e9b / 14ae7652 / 16ef21a7 |
| no_progress | OK(4種とも異なる) | 972a024a / 2fb9a0da / f28a2d85 / 704445fe |
| deadline_vs_review | OK(4種とも異なる) | 491a6bff / 76a584b8 / 1bf6527b / 64ec49cd |

全11シナリオでprompt_hashの重複なし。
