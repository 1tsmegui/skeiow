import { useEffect, useRef } from 'react';
import missionVideoMp4 from '../../assets/mission-bg.mp4';
import missionVideoWebm from '../../assets/mission-bg.webm';
import missionPoster from '../../assets/mission-bg-poster.jpg';
import Reveal from '../Reveal';
import Particles from '../Particles';
import useScrollPhase from '../../hooks/useScrollPhase';
import './Mission.css';

export default function Mission() {
  const videoRef = useRef(null);
  const [sectionRef, { isExiting }] = useScrollPhase({ threshold: 0.55 });

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
      id="missao"
      className={`mission${isExiting ? ' mission--exiting' : ''}`}
      ref={sectionRef}
    >
      <div className="mission__bg" aria-hidden="true">
        <video
          ref={videoRef}
          className="mission__bg-video"
          poster={missionPoster}
          autoPlay
          muted
          loop
          playsInline
        >
          <source src={missionVideoWebm} type="video/webm" />
          <source src={missionVideoMp4} type="video/mp4" />
        </video>
        <div className="mission__bg-scrim" />
        <Particles variant="subtle" seed={1} />
      </div>

      <div className="container mission__inner">
        <Reveal>
          <p className="eyebrow">Nossa missão</p>
          <h2 className="mission__title">
            Transformar o setor empresarial com uma plataforma inteligente
            que utiliza IA para atendimento automático, centralização de
            dados, otimização de operações e capacitação de equipes.
          </h2>
          <div className="underline-accent underline-accent--center" />
        </Reveal>
        <Reveal delay={120}>
          <p className="mission__text">
            Com o Skeiow, oferecemos soluções completas para empresas que
            buscam eficiência, organização e crescimento, integrando
            tecnologia avançada com processos práticos para maximizar
            resultados e reduzir esforços operacionais.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
