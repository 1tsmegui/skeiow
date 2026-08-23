import { useEffect, useRef } from 'react';
import heroVideoMp4 from '../../assets/hero-bg.mp4';
import heroVideoWebm from '../../assets/hero-bg.webm';
import heroPoster from '../../assets/hero-bg-poster.jpg';
import LoginCard from '../LoginCard';
import './Hero.css';

export default function Hero() {
  const videoRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReducedMotion && videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  return (
    <section id="hero" className="hero">
      <div className="hero__bg" aria-hidden="true">
        <video
          ref={videoRef}
          className="hero__bg-video"
          poster={heroPoster}
          autoPlay
          muted
          loop
          playsInline
        >
          <source src={heroVideoWebm} type="video/webm" />
          <source src={heroVideoMp4} type="video/mp4" />
        </video>
        <div className="hero__bg-scrim" />
      </div>

      <div className="container hero__inner">
        <div className="hero__copy-col">
          <p className="eyebrow">CRM + IA para o seu negócio</p>
          <h1 className="hero__title">
            Organização, automação e{' '}
            <span className="gradient-text">inteligência</span> para o seu
            negócio.
          </h1>
          <p className="hero__subtitle">
            Centralize clientes, automatize o atendimento no WhatsApp com IA
            e acompanhe tudo em tempo real — em uma única plataforma.
          </p>
          <a href="#produto" className="hero__cta">
            Começar agora
          </a>
        </div>

        <div className="hero__form-col">
          <LoginCard />
        </div>
      </div>
    </section>
  );
}
