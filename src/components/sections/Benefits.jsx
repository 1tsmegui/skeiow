import { DashboardIcon, WhatsappIcon, BoltIcon, ScaleIcon, ReportIcon } from '../icons';
import SectionHeading from '../SectionHeading';
import Reveal from '../Reveal';
import BenefitItem from './BenefitItem';
import './Benefits.css';

const BENEFITS = [
  {
    icon: DashboardIcon,
    title: 'Organização total',
    text: 'Centralize clientes, conversas e dados em um único painel.',
  },
  {
    icon: WhatsappIcon,
    title: 'Atendimento automático',
    text: 'IA responde, filtra e encaminha leads sem esforço humano.',
  },
  {
    icon: BoltIcon,
    title: 'Velocidade operacional',
    text: 'Automatize tarefas repetitivas e reduza tempo perdido.',
  },
  {
    icon: ScaleIcon,
    title: 'Escalabilidade',
    text: 'Ideal para empresas que querem crescer sem aumentar custos.',
  },
  {
    icon: ReportIcon,
    title: 'Relatórios inteligentes',
    text: 'Acompanhe métricas, desempenho e oportunidades em tempo real.',
  },
];

export default function Benefits() {
  return (
    <section id="beneficios" className="benefits">
      <div className="section-glow benefits__glow" aria-hidden="true" />
      <div className="container">
        <Reveal>
          <SectionHeading eyebrow="Benefícios da plataforma" title="Por que empresas escolhem o Skeiow" />
        </Reveal>

        <div className="benefits__list">
          {BENEFITS.map((benefit, i) => (
            <Reveal key={benefit.title} delay={i * 70}>
              <BenefitItem {...benefit} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
