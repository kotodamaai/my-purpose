import { useState } from 'react';
import {
  getKotodamaL1,
  buildL2WithTags,
  getSurnameInterface,
  adjustWithNumerology,
  transformWithSurname,
} from '../utils/kotodamaEngine';
import { getNumerologyL1, getNumerologyAdjustment } from '../utils/numerologyEngine';
import { judgeNameBirthdayGogyo } from '../utils/gogyoEngine';

export default function InputForm({ initial, onSubmit, onBack }) {
  const [form, setForm] = useState(() => ({
    lastName: initial?.lastName ?? '',
    firstName: initial?.firstName ?? '',
    year: initial?.year != null ? String(initial.year) : '',
    month: initial?.month != null ? String(initial.month) : '',
    day: initial?.day != null ? String(initial.day) : '',
    gender: initial?.gender ?? '',
    birthdayEstimated: initial?.birthdayEstimated ?? false,
  }));
  const [error, setError] = useState('');

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const { lastName, firstName, year, month, day, gender, birthdayEstimated } = form;

    if (!firstName.trim()) {
      setError('名（ひらがな）を入力してください。');
      return;
    }
    if (!year || !month || !day) {
      setError('生年月日を入力してください。');
      return;
    }
    if (!gender) {
      setError('性別を選択してください。');
      return;
    }

    const y = parseInt(year);
    const m = parseInt(month);
    const d = parseInt(day);

    if (m < 1 || m > 12 || d < 1 || d > 31) {
      setError('正しい生年月日を入力してください。');
      return;
    }

    // エンジン処理
    const fn_L1 = firstName ? getKotodamaL1(firstName.trim()) : null;
    const fn_L2 = fn_L1 ? buildL2WithTags(fn_L1) : null;
    const ln_interface = lastName ? getSurnameInterface(lastName.trim()) : null;
    const n_L1 = getNumerologyL1(y, m, d);
    const n_adj = getNumerologyAdjustment(n_L1);
    // ver2.4：名前と誕生日の重なりは、名前の音の五行と、生まれた日の納音の五行で判定する
    const overlap = firstName ? judgeNameBirthdayGogyo(firstName.trim(), y, m, d) : null;
    const adjustedState = fn_L2 ? adjustWithNumerology(fn_L2, n_adj) : null;
    const output = adjustedState ? transformWithSurname(adjustedState, ln_interface) : null;

    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      year: y, month: m, day: d,
      gender,
      birthdayEstimated,
      fn_L1, fn_L2, ln_interface,
      n_L1, n_adj, overlap,
      adjustedState, output,
    });
  }

  // 年の選択肢
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  return (
    <div className="input-screen">
      <div className="input-header">
        <div className="logo-small">KOTONE · MY PURPOSE<span className="beta-badge">ver2.4</span></div>
        <h2>診断情報の入力</h2>
      </div>

      <form className="input-form" onSubmit={handleSubmit}>
        {error && <div className="error-msg">{error}</div>}

        {/* 姓・名 */}
        <div className="field-group">
          <div className="field">
            <label>姓（ひらがな・カタカナ）</label>
            <input
              type="text"
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              placeholder="例：やまだ"
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label>名（ひらがな・カタカナ）<span className="required">*</span></label>
            <input
              type="text"
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              placeholder="例：はなこ"
              autoComplete="off"
              required
            />
          </div>
        </div>

        {/* 生年月日 */}
        <div className="field-single">
          <div className="field">
            <label>生年月日<span className="required">*</span></label>
            <div className="date-row">
              <div className="select-wrapper">
                <select name="year" value={form.year} onChange={handleChange} required>
                  <option value="">西暦</option>
                  {years.map(y => (
                    <option key={y} value={y}>{y}年</option>
                  ))}
                </select>
              </div>
              <div className="select-wrapper">
                <select name="month" value={form.month} onChange={handleChange} required>
                  <option value="">月</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>{m}月</option>
                  ))}
                </select>
              </div>
              <div className="select-wrapper">
                <select name="day" value={form.day} onChange={handleChange} required>
                  <option value="">日</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d}>{d}日</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <label className="estimated-check" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', marginTop: 8 }}>
            <input
              type="checkbox"
              name="birthdayEstimated"
              checked={form.birthdayEstimated}
              onChange={handleChange}
              style={{ width: 'auto' }}
            />
            誕生日は仮
          </label>
        </div>

        <hr className="field-divider" />

        {/* 性別 */}
        <div className="field-group">
          <div className="field">
            <label>性別<span className="required">*</span></label>
            <div className="select-wrapper">
              <select name="gender" value={form.gender} onChange={handleChange} required>
                <option value="">選択</option>
                <option value="female">女性</option>
                <option value="male">男性</option>
                <option value="other">その他</option>
              </select>
            </div>
          </div>
        </div>

        <button type="submit" className="submit-btn">
          診断する
        </button>
      </form>

      <span className="back-link" onClick={onBack}>← トップに戻る</span>
    </div>
  );
}
