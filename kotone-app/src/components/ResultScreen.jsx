import { useEffect, useState } from 'react';
import { generateAllSections } from '../utils/aiGenerator';

const SECTION_TITLES = [
  'キャッチコピー',
  '現象サマリー',
  'お名前から見えること',
  'お誕生日から見えること',
  '光と影',
  '締め',
];

const STATUS_LABELS = {
  pending: '待機中...',
  generating: '生成中...',
  'retry-sonnet': 'Sonnetで再生成中...',
  checking: '言葉をチェック中...',
  fixing: '修正中...',
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
  const { firstName, lastName, year, month, day } = data;

  const [sections, setSections] = useState(() =>
    SECTION_TITLES.map(() => ({ status: 'pending', text: null, model: null, checkOk: null, error: null }))
  );

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
            {sec.model && <span className="model-tag">{sec.model}</span>}
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

      <button className="restart-btn" onClick={onRestart}>
        もう一度診断する
      </button>
    </div>
  );
}
