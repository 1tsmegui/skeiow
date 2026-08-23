import { useState } from 'react';
import brazilMap from '../assets/brazil-map.webp';
import { UserIcon, LockIcon, EyeIcon, ShieldIcon, LogoMark } from '../components/icons';
import './Login.css';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: plug into your auth call (e.g. POST /auth/login)
  };

  return (
    <div className="login-page">
      <div className="login-page__glow-backdrop" aria-hidden="true" />

      <section className="login-page__map-panel">
        <div className="map-panel__frame">
          <img
            src={brazilMap}
            alt="Mapa do Brasil com leads por região"
            className="map-panel__image"
          />
          <div className="map-panel__scanline" aria-hidden="true" />
        </div>
        <div className="map-panel__ripple" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      <section className="login-page__form-panel">
        <div className="login-card">
          <div className="login-card__brand">
            <LogoMark />
            <span className="login-card__brand-name">
              Skeiow<span className="login-card__brand-dot">.com</span>
            </span>
          </div>

          <hr className="login-card__divider" />

          <h1 className="login-card__title">Skeiow</h1>
          <div className="login-card__title-underline" />

          <p className="login-card__tagline">
            A organização é a chave para o sucesso; um negócio bem
            organizado está no caminho certo para o crescimento e a
            eficiência.
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
      </section>

      <footer className="login-page__footer">
        <ShieldIcon />
        <span>Todos os direitos reservados</span>
      </footer>
    </div>
  );
}
