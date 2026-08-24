import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro('E-mail ou senha inválidos.');
      setCarregando(false);
      return;
    }

    // Confere se esse login tem um registro correspondente na tabela usuarios.
    // (auth_id precisa existir na tabela usuarios, apontando pro id do Supabase Auth)
    const { data: usuario, error: erroUsuario } = await supabase
      .from('usuarios')
      .select('id, nome, perfil')
      .eq('auth_id', data.user.id)
      .single();

    if (erroUsuario || !usuario) {
      setErro('Login feito, mas seu usuário não está cadastrado no sistema. Fale com o supervisor.');
      await supabase.auth.signOut();
      setCarregando(false);
      return;
    }

    // Reload completo (em vez de navigate) evita uma corrida entre o login
    // e a checagem de sessão no /painel, que fazia pedir login 2x.
    window.location.assign('/painel');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}
          >
            S
          </div>
          <h1 className="text-lg font-semibold text-slate-800">Entrar no painel</h1>
          <p className="text-xs text-slate-500">Acesso restrito à equipe</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Senha</label>
            <div className="relative">
              <input
                type={mostrarSenha ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 pr-9 text-sm outline-none focus:border-slate-400"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setMostrarSenha((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {mostrarSenha ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {erro && <p className="text-xs text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="mt-2 rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}
          >
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
