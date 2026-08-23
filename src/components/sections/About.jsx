import {
  CrmIcon,
  AiSparkIcon,
  WhatsappIcon,
  DatabaseIcon,
  DashboardIcon,
  TeamIcon,
} from '../icons';
import aboutBg from '../../assets/about-bg.jpg';
import SectionHeading from '../SectionHeading';
import Reveal from '../Reveal';
import Particles from '../Particles';
import FeatureCard from './FeatureCard';
import useScrollPhase from '../../hooks/useScrollPhase';
import './About.css';

const FEATURES = [
  {
    icon: CrmIcon,
    title: 'CRM',
    text: 'Organize clientes, leads e negociações em um painel único, sem planilhas soltas.',
  },
  {
    icon: AiSparkIcon,
    title: 'Inteligência Artificial',
    text: 'A IA entende a intenção do cliente, responde e qualifica leads automaticamente.',
  },
  {
    icon: WhatsappIcon,
    title: 'WhatsApp automático',
    text: 'Atendimento em tempo real direto no WhatsApp, com coleta de dados e agendamento.',
  },
  {
    icon: DatabaseIcon,
    title: 'Centralização de dados',
    text: 'Todo o histórico de conversas, contatos e negociações reunido em um só lugar.',
  },
  {
    icon: DashboardIcon,
    title: 'Dashboard',
    text: 'Acompanhe métricas de leads, conversão e performance da equipe em tempo real.',
  },
  {
    icon: TeamIcon,
    title: 'Equipes',
    text: 'Distribua atendimentos, defina fluxos e capacite seu time com processos claros.',
  },
];

export default function About() {
  const [sectionRef, { isActive }] = useScrollPhase({ threshold: 0.18 });

  return (
    <section id="produto" className="about" ref={sectionRef}>
      <div className={`about__bg${isActive ? ' about__bg--active' : ''}`} aria-hidden="true">
        <img src={aboutBg} alt="" className="about__bg-img" />
        <div className="about__bg-scrim" />
        <Particles variant="subtle" seed={2} />
      </div>
      <div className="container">
        <Reveal>
          <SectionHeading eyebrow="Sobre o produto" title="Tudo o que o Skeiow faz por você" />
        </Reveal>

        <div className="about__grid">
          {FEATURES.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 70} className="about__grid-item">
              <FeatureCard {...feature} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
