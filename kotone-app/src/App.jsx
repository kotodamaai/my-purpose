import { useState, useEffect } from 'react';
import './App.css';
import TopScreen from './components/TopScreen';
import InputForm from './components/InputForm';
import ResultScreen from './components/ResultScreen';

export default function App() {
  const [screen, setScreen] = useState('top'); // 'top' | 'input' | 'result'
  const [diagnosisData, setDiagnosisData] = useState(null);
  const [lastInput, setLastInput] = useState(null); // 戻ったときに入力を復元する

  // ブラウザの「戻る」「進む」で画面を行き来できるようにする
  useEffect(() => {
    window.history.replaceState({ screen: 'top' }, '');
    function onPop(e) {
      const s = (e.state && e.state.screen) || 'top';
      setScreen(s);
      window.scrollTo(0, 0);
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function go(next) {
    window.history.pushState({ screen: next }, '');
    setScreen(next);
    window.scrollTo(0, 0);
  }

  function handleStart() {
    go('input');
  }

  function handleSubmit(data) {
    setDiagnosisData(data);
    setLastInput(data);
    go('result');
  }

  function handleRestart() {
    setDiagnosisData(null);
    go('top');
  }

  // 結果データが無いのに結果画面に来た（「進む」等）場合は入力画面を出す
  const shown = screen === 'result' && !diagnosisData ? 'input' : screen;

  return (
    <>
      {shown === 'top' && <TopScreen onStart={handleStart} />}
      {shown === 'input' && <InputForm initial={lastInput} onSubmit={handleSubmit} onBack={() => go('top')} />}
      {shown === 'result' && <ResultScreen key={JSON.stringify(diagnosisData)} data={diagnosisData} onRestart={handleRestart} />}
    </>
  );
}
