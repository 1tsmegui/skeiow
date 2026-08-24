import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import Home from './pages/Home';
import Login from './pages/Login';
import PainelCRM from './pages/PainelCRM';
import './App.css';

// Só deixa passar pra dentro se tiver login válido no Supabase Auth
// E com um registro correspondente na tabela usuarios (senão manda pro /login).
function RotaProtegida({ children }) {
  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    let cancelado = false;

    async function carregarUsuario() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (!cancelado) {
          setUsuario(null);
          setCarregando(false);
        }
        return;
      }

      const { data: perfilUsuario } = await supabase
        .from('usuarios')
        .select('id, nome, perfil')
        .eq('auth_id', session.user.id)
        .single();

      if (!cancelado) {
        setUsuario(perfilUsuario ?? null);
        setCarregando(false);
      }
    }

    carregarUsuario();

    // Se a sessão mudar (login/logout em outra aba, expirar etc), recarrega.
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      carregarUsuario();
    });

    return () => {
      cancelado = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Carregando...
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return children(usuario);
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/painel"
          element={
            <RotaProtegida>{(usuario) => <PainelCRM usuario={usuario} />}</RotaProtegida>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
