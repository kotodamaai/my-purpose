import { useEffect, useState } from 'react';
import { generateAllSections } from '../utils/aiGenerator';

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
  const { firstName, lastName, year, month, day, birthdayEstimated, fn_L1, ln_interface, n_L1, adjustedState } = data;

  const [sections, setSections] = useState(() =>
    SECTION_TITLES.map(() => ({ status: 'pending', text: null, model: null, checkOk: null, error: null }))
  );
  const [comment, setComment] = useState('');
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
      birthdayEstimated: !!birthdayEstimated,
      structure: { fn_L1, ln_interface, n_L1, adjustedState },
      output: sections.reduce((acc, s, i) => {
        acc[SECTION_TITLES[i]] = s.text || '';
        return acc;
      }, {}),
      comment,
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
        <div className="verify-panel" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px dashed #ddd' }}>
          <label className="verify-label" style={{ display: 'block', fontSize: 12, color: '#888', marginBottom: 6 }}>
            検証コメント(任意・当たった/外れた点など)
          </label>
          <textarea
            className="verify-comment"
            rows={3}
            value={comment}
            onChange={e => setComment(e.target.value)}
            style={{ width: '100%', padding: 8, fontFamily: 'inherit', fontSize: 13, border: '1px solid #ddd', boxSizing: 'border-box' }}
          />
          <button className="verify-btn" onClick={handleSaveVerification} style={{ marginTop: 8 }}>
            検証用
          </button>
          {saved && <span className="verify-saved-note" style={{ marginLeft: 8, fontSize: 12, color: '#4a7a4a' }}>記録しました</span>}
        </div>
      )}

      <button className="restart-btn" onClick={onRestart}>
        もう一度診断する
      </button>
    </div>
  );
}
