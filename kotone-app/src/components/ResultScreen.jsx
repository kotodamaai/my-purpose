import { useEffect, useState } from 'react';
import { generateAllSections } from '../utils/aiGenerator';
import { VERSIONS } from '../data/version';
import { SELF_REPORT_ITEMS, SELF_REPORT_SCALE } from '../data/selfReport';

const SECTION_TITLES = [
  'あなたはこんな人',
  '現象サマリー',
  'お名前から見えること',
  'お誕生日から見えること',
  '光と影',
  '締め',
];

const STATUS_LABELS = {
  pending: '待機中...',
  generating: '生成中...',
  'retry-sonnet': '生成中...',
  checking: '確認中...',
  fixing: '調整中...',
  done: null,
  error: null,
};

function LoadingDots({ label }) {
  return (
    <div className="loading-indicator">
      <span className="loading-dots">
        <span /><span /><span />
      </span>
      {label}
    </div>
  );
}

export default function ResultScreen({ data, onRestart }) {
  const {
    firstName, lastName, year, month, day, birthdayEstimated,
    gender, bloodType, fn_L1, ln_interface, n_L1, n_adj, adjustedState,
  } = data;

  const [sections, setSections] = useState(() =>
    SECTION_TITLES.map(() => ({ status: 'pending', text: null, model: null, checkOk: null, error: null }))
  );
  const [comment, setComment] = useState('');
  const [score, setScore] = useState(50);
  const [scoreTouched, setScoreTouched] = useState(false);
  const [selfReport, setSelfReport] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    generateAllSections(
      data,
      // onSectionComplete
      (idx, title, text, model, checkOk, err) => {
        setSections(prev => {
          const next = [...prev];
          next[idx] = {
            status: err ? 'error' : 'done',
            text,
            model,
            checkOk,
            error: err || null,
          };
          return next;
        });
      },
      // onSectionStart
      (idx, title, status) => {
        setSections(prev => {
          const next = [...prev];
          next[idx] = { ...next[idx], status };
          return next;
        });
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName = [lastName, firstName].filter(Boolean).join(' ');
  const displayDate = `${year}年${month}月${day}日`;
  const allDone = sections.every(s => s.status === 'done' || s.status === 'error');

  function downloadJSON(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function handleSaveVerification() {
    const caseId = 'case_' + Date.now();

    downloadJSON(`${caseId}_id.json`, {
      caseId,
      savedAt: new Date().toISOString(),
      lastName,
      firstName,
      birthday: { year, month, day, isEstimated: !!birthdayEstimated },
    });

    downloadJSON(`${caseId}_analysis.json`, {
      caseId,
      savedAt: new Date().toISOString(),

      // どのバージョンの辞書・エンジン・プロンプトで生成されたか（改善の測定に必須）
      meta: { ...VERSIONS },

      // 個人特定に至らない入力条件
      input: {
        hasSurname: !!lastName,
        gender: gender || null,
        bloodType: bloodType || null,
        birthdayEstimated: !!birthdayEstimated,
      },

      // エンジン出力（構造の正本）
      structure: { fn_L1, ln_interface, n_L1, n_adj, adjustedState },

      // 分析で頻繁に使う値を上位に再掲（拮抗・確信度の検証用）
      derived: (fn_L1 && fn_L1.derived) || null,
      direction_distribution: (fn_L1 && fn_L1.direction_distribution) || null,

      // 生成過程（どのモデルに落ちたか・自己チェックを通ったか）
      generation: sections.map((s, i) => ({
        section: SECTION_TITLES[i],
        model: s.model,
        checkOk: s.checkOk,
        error: s.error,
      })),

      output: sections.reduce((acc, s, i) => {
        acc[SECTION_TITLES[i]] = s.text || '';
        return acc;
      }, {}),

      feedback: {
        // 未操作なら null（初期値50を「50点と回答した」と誤読しないため）
        score: scoreTouched ? score : null,
        selfReport,
        selfReportComplete: SELF_REPORT_ITEMS.every(it => selfReport[it.id] != null),
        comment,
      },
    });

    setSaved(true);
  }

  return (
    <div className="result-screen">
      <div className="result-header">
        <div className="logo-small">KOTONE · MY PURPOSE</div>
        <div className="result-name">{displayName || firstName}</div>
        <div className="result-date">{displayDate}生まれ</div>
      </div>

      {sections.map((sec, i) => (
        <div
          key={i}
          className={`result-section${i === 0 ? ' catch-section' : ''}`}
        >
          <div className="section-label">
            {SECTION_TITLES[i]}
          </div>

          {sec.status === 'done' && sec.text ? (
            <div className="section-body">
              {i === 0 ? (
                <div className="catch-text">{sec.text}</div>
              ) : (
                <div className="section-text">{sec.text}</div>
              )}
            </div>
          ) : sec.status === 'error' ? (
            <div className="error-section">
              生成中にエラーが発生しました: {sec.error}
            </div>
          ) : (
            <LoadingDots label={STATUS_LABELS[sec.status] || '処理中...'} />
          )}
        </div>
      ))}

      <p className="result-footer-note">
        ※ KOTONEは仮説を提示するツールです。<br />
        当てはまるかどうかは、ご自身の体感と照らし合わせてください。
      </p>

      {allDone && (
        <div className="verify-panel">
          <div className="verify-head">
            <div className="verify-title">診断の精度向上にご協力ください</div>
            <p className="verify-lead">
              いただいた回答は、診断ロジックの改善のためだけに使用します。
            </p>
          </div>

          {/* ① 的中度スコア */}
          <div className="verify-block">
            <div className="verify-label">この診断は、どのくらい当たっていましたか？</div>
            <div className="score-row">
              <input
                type="range"
                className="score-slider"
                min="0"
                max="100"
                step="1"
                value={score}
                onChange={e => { setScore(Number(e.target.value)); setScoreTouched(true); }}
              />
              <div className="score-value">
                {scoreTouched ? score : '—'}<span className="score-unit">点</span>
              </div>
            </div>
            <div className="scale-ends">
              <span>0 まったく違う</span>
              <span>100 その通り</span>
            </div>
          </div>

          {/* ② 自己申告スケール */}
          <div className="verify-block">
            <div className="verify-label">あなた自身について教えてください</div>
            <p className="verify-sub">
              診断の内容とは切り離して、ふだんのご自身に近い数字をお選びください。
            </p>
            <div className="scale-ends sr-legend">
              <span>1 ちがう</span>
              <span>5 その通り</span>
            </div>
            {SELF_REPORT_ITEMS.map(item => (
              <div className="sr-item" key={item.id}>
                <div className="sr-text">{item.text}</div>
                <div className="sr-scale">
                  {SELF_REPORT_SCALE.map(v => (
                    <button
                      type="button"
                      key={v}
                      className={`sr-dot${selfReport[item.id] === v ? ' selected' : ''}`}
                      onClick={() => setSelfReport(prev => ({ ...prev, [item.id]: v }))}
                      aria-label={`${item.text}：${v}`}
                      aria-pressed={selfReport[item.id] === v}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ③ 自由記述 */}
          <div className="verify-block">
            <div className="verify-label">気になった点があれば（任意）</div>
            <p className="verify-sub">
              「ここは違う」と感じた箇所があれば、どのセクションのどの部分かを書いていただけると助かります。
            </p>
            <textarea
              className="verify-comment"
              rows={4}
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>

          <button className="verify-btn" onClick={handleSaveVerification}>
            回答を記録する
          </button>
          {saved && <span className="verify-saved-note">ご協力ありがとうございました</span>}
        </div>
      )}

      <button className="restart-btn" onClick={onRestart}>
        もう一度診断する
      </button>
    </div>
  );
}
