export default function TopScreen({ onStart }) {
  return (
    <div className="top-screen">
      <div className="top-logo">KOTONE PLATFORM</div>
      <h1 className="top-title">MY PURPOSE Ⅱ<span className="beta-badge">ver3.5</span></h1>
      <svg className="top-wave" viewBox="0 0 160 24" aria-hidden="true">
        <path d="M0 12 C 10 2, 20 2, 30 12 S 50 22, 60 12 S 80 2, 90 12 S 110 22, 120 12 S 140 2, 150 12 L 160 12" />
      </svg>
      <p className="top-catch">
        言葉にならない本質を言語化する。<br />
        生まれ持った使命を、<br />
        お名前とお誕生日から紐解きます。
      </p>
      <button className="top-btn" onClick={onStart}>
        診断を始める
      </button>
      <p className="top-note">
        ※ 本診断は仮説を提示するツールです。<br />
        ご自身の体感と照らし合わせながらお読みください。
      </p>
    </div>
  );
}
