import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import PainelCRM from './pages/PainelCRM';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/painel" element={<PainelCRM />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;