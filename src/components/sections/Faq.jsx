import { useCallback, useState } from 'react';
import faqBg from '../../assets/faq-bg.jpg';
import SectionHeading from '../SectionHeading';
import Reveal from '../Reveal';
import Particles from '../Particles';
import FaqItem from './FaqItem';
import useScrollPhase from '../../hooks/useScrollPhase';
import './Faq.css';

const FAQ_ITEMS = [
  {
    q: 'O que é o Skeiow CRM?',
    a: 'O Skeiow CRM é uma plataforma inteligente que organiza clientes, leads, conversas e processos em um único lugar, integrando IA para automatizar atendimentos e tarefas repetitivas.',
  },
  {
    q: 'Como funciona o atendimento automático no WhatsApp?',
    a: 'A IA responde clientes, identifica intenção, coleta dados, agenda horários e encaminha informações para o time comercial — tudo em tempo real.',
  },
  {
    q: 'O CRM substitui o atendimento humano?',
    a: 'Não. Ele potencializa o atendimento humano, filtrando leads, organizando informações e deixando o time focado apenas no que importa: fechar vendas.',
  },
  {
    q: 'Posso personalizar as mensagens automáticas?',
    a: 'Sim. Você pode definir regras, fluxos, respostas, horários e até diferentes estilos de comunicação para cada tipo de cliente.',
  },
  {
    q: 'O sistema registra todas as conversas?',
    a: 'Sim. Cada interação é salva automaticamente no CRM, permitindo histórico completo, relatórios e acompanhamento de performance.',
  },
  {
    q: 'O Skeiow funciona para qualquer tipo de empresa?',
    a: 'Sim. Ele foi criado para atender desde pequenos negócios até grandes operações que precisam de organização, automação e velocidade.',
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState(0);
  const [sectionRef, { isExiting }] = useScrollPhase({ threshold: 0.5 });

  const handleToggle = useCallback((i) => {
    setOpenIndex((current) => (current === i ? -1 : i));
  }, []);

  return (
    <section
      id="faq"
      className={`faq${isExiting ? ' faq--exiting' : ''}`}
      ref={sectionRef}
    >
      <div className="faq__bg" aria-hidden="true">
        <img src={faqBg} alt="" className="faq__bg-img" />
        <div className="faq__bg-scrim" />
        <Particles variant="subtle" seed={3} />
      </div>
      <div className="container">
        <Reveal>
          <SectionHeading
            eyebrow="Perguntas frequentes"
            title="Tudo sobre o CRM e o atendimento automático"
          />
        </Reveal>

        <div className="faq__list">
          {FAQ_ITEMS.map((item, i) => (
            <Reveal key={item.q} delay={i * 50}>
              <FaqItem
                question={item.q}
                answer={item.a}
                isOpen={openIndex === i}
                onToggle={() => handleToggle(i)}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
