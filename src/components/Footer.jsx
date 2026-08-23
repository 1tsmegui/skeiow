import { ShieldIcon, LogoMark } from './icons';
import './Footer.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer__inner">
        <a href="#hero" className="footer__brand">
          <LogoMark size={22} />
          <span>Skeiow.com</span>
        </a>
        <div className="footer__rights">
          <ShieldIcon />
          <span>© {year} Skeiow. Todos os direitos reservados.</span>
        </div>

        <span className="footer__credit">
          Contornos do mapa:{' '}
          <a href="https://github.com/VictorCazanave/svg-maps" target="_blank" rel="noreferrer">
            svg-maps
          </a>{' '}
          (CC BY 4.0)
        </span>
      </div>
    </footer>
  );
}
