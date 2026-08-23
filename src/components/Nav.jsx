import { useEffect, useRef } from 'react';
import { LogoMark } from './icons';
import './Nav.css';

const LINKS = [
  { href: '#missao', label: 'Missão' },
  { href: '#produto', label: 'Produto' },
  { href: '#faq', label: 'FAQ' },
];

export default function Nav() {
  const navRef = useRef(null);

  // Toggle an elevation class on scroll via direct DOM mutation (not React
  // state) so this never triggers a re-render — just a class flip.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        nav.classList.toggle('nav--scrolled', window.scrollY > 12);
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header ref={navRef} className="nav">
      <div className="container nav__inner">
        <a href="#hero" className="nav__brand">
          <LogoMark size={26} />
          <span>
            Skeiow<span className="gradient-text">.com</span>
          </span>
        </a>

        <nav className="nav__links" aria-label="Navegação principal">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <a href="#hero" className="nav__cta">
          Entrar
        </a>
      </div>
    </header>
  );
}
