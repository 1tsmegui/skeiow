import { useEffect, useRef } from 'react';
import finalCtaVideoMp4 from '../../assets/final-cta-bg.mp4';
import finalCtaVideoWebm from '../../assets/final-cta-bg.webm';
import finalCtaPoster from '../../assets/final-cta-bg-poster.jpg';
import Reveal from '../Reveal';
import Particles from '../Particles';
import useScrollPhase from '../../hooks/useScrollPhase';
import './FinalCta.css';

export default function FinalCta() {
  const videoRef = useRef(null);
  const [sectionRef, { isActive }] = useScrollPhase({ threshold: 0.22 });

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReducedMotion && videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  return (
    <section
      className={`final-cta${isActive ? ' final-cta--active' : ''}`}
      ref={sectionRef}
    >
      <div className="final-cta__bg" aria-hidden="true">
        <video
          ref={videoRef}
          className="final-cta__bg-video"
          poster={finalCtaPoster}
          autoPlay
          muted
          loop
          playsInline
        >
          <source src={finalCtaVideoWebm} type="video/webm" />
          <source src={finalCtaVideoMp4} type="video/mp4" />
        </video>
        <div className="final-cta__bg-scrim" />
        <Particles variant="intense" seed={4} />
      </div>
      <div className="final-cta__glow" aria-hidden="true" />

      <div className="container final-cta__inner">
        <Reveal>
          <h2 className="final-cta__title final-cta__title--float">
            Pronto para
            <br />
            <span className="final-cta__title-gradient">transformar seu</span>
            <br />
            atendimento?
          </h2>
          <p className="final-cta__text">
            Experimente o Skeiow em tempo real no WhatsApp
            <br />
            e veja como automatizar suas vendas com menos esforço.
          </p>
          <a href="#hero" className="final-cta__button final-cta__button--glow">
            Testar no WhatsApp <span aria-hidden="true">→</span>
          </a>
          <p className="final-cta__caption">
            Atendimento instantâneo e sem cadastros demorados.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
