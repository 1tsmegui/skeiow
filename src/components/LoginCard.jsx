import { useState } from 'react';
import { UserIcon, LockIcon, EyeIcon, LogoMark } from './icons';
import './LoginCard.css';

export default function LoginCard() {
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: plug into your auth call (e.g. POST /auth/login)
  };

  return (
    <div className="login-card">
      <div className="login-card__brand">
        <LogoMark />
        <span className="login-card__brand-name">
          Skeiow<span className="login-card__brand-dot">.com</span>
        </span>
      </div>

      <hr className="login-card__divider" />

      <h2 className="login-card__title">Skeiow</h2>
      <div className="underline-accent" />

      <p className="login-card__tagline">
        A organização é a chave para o sucesso; um negócio bem organizado
        está no caminho certo para o crescimento e a eficiência.
      </p>

      <form className="login-form" onSubmit={handleSubmit}>
        <label className="login-field">
          <UserIcon />
          <input
            type="text"
            name="identifier"
            placeholder="Usuário, e-mail ou telefone"
            autoComplete="username"
            required
          />
        </label>

        <label className="login-field">
          <LockIcon />
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Senha"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="login-field__toggle"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <EyeIcon open={showPassword} />
          </button>
        </label>

        <div className="login-form__row">
          <label className="login-form__checkbox">
            <input type="checkbox" name="remember" />
            Lembrar de mim
          </label>
          <a href="#recuperar-senha" className="login-form__forgot">
            Esqueceu a senha?
          </a>
        </div>

        <button type="submit" className="login-submit">
          Entrar
        </button>
      </form>
    </div>
  );
}
