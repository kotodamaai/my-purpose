export default function TopScreen({ onStart }) {
  return (
    <div className="top-screen">
      <div className="top-logo">KOTONE PLATFORM</div>
      <h1 className="top-title">MY PURPOSE</h1>
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
