import { useState } from 'react';
import './App.css';
import TopScreen from './components/TopScreen';
import InputForm from './components/InputForm';
import ResultScreen from './components/ResultScreen';

export default function App() {
  const [screen, setScreen] = useState('top'); // 'top' | 'input' | 'result'
  const [diagnosisData, setDiagnosisData] = useState(null);

  function handleStart() {
    setScreen('input');
  }

  function handleSubmit(data) {
    setDiagnosisData(data);
    setScreen('result');
  }

  function handleRestart() {
    setScreen('top');
    setDiagnosisData(null);
  }

  return (
    <>
      {screen === 'top' && <TopScreen onStart={handleStart} />}
      {screen === 'input' && <InputForm onSubmit={handleSubmit} onBack={() => setScreen('top')} />}
      {screen === 'result' && <ResultScreen data={diagnosisData} onRestart={handleRestart} />}
    </>
  );
}
