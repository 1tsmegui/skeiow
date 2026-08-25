import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  Eye,
  EyeOff,
  Phone,
  UserCircle2,
  Sun,
  Moon,
  LogOut,
  X,
  Send,
  Hand,
  Home,
  CheckSquare,
  Settings,
  Bell,
  Plus,
  ChevronDown,
  FileCheck2,
  Briefcase,
  Search,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Hash,
  Router,
  MessageCircle,
  Info,
} from 'lucide-react';

// URL do webhook de envio do seu n8n (ver .env). Ex:
// VITE_N8N_ENVIAR_MENSAGEM_URL=https://seu-n8n.com/webhook/enviar-mensagem
const N8N_ENVIAR_MENSAGEM_URL = import.meta.env.VITE_N8N_ENVIAR_MENSAGEM_URL;

// URL do webhook do n8n que consulta a planilha e devolve NOME/ESTADO/CIDADE/CEP/END
// pelo telefone do cliente. Ex:
// VITE_N8N_CONSULTAR_CLIENTE_URL=https://seu-n8n.com/webhook/consultar-cliente
const N8N_CONSULTAR_CLIENTE_URL = import.meta.env.VITE_N8N_CONSULTAR_CLIENTE_URL;

const GRADIENTE_MARCA = 'linear-gradient(135deg, #ec4899, #a855f7)';

// status_id -> chave visual. 1/2/3 confirmados no seu classificador.
// 4 (roxo) = "clientes que viraram contrato", confirmado na tabela status.
const STATUS_POR_ID = { 1: 'branco', 2: 'vermelho', 3: 'verde', 4: 'roxo' };

const STATUS_CONFIG = {
  branco: {
    titulo: 'Branco',
    descricao: 'Aguardando validação',
    corDot: 'bg-white border-2 border-slate-400',
    accent: '#94a3b8',
  },
  vermelho: {
    titulo: 'Vermelho',
    descricao: 'Intervenção humana',
    corDot: 'bg-red-500',
    accent: '#ef4444',
  },
  verde: {
    titulo: 'Verde',
    descricao: 'Validados e sorteados para vendedores',
    corDot: 'bg-emerald-500',
    accent: '#10b981',
  },
  roxo: {
    titulo: 'Roxo',
    descricao: 'Clientes que viraram contrato',
    corDot: 'bg-violet-500',
    accent: '#8b5cf6',
  },
};

function useTema(escuro) {
  return escuro
    ? {
        escuro: true,
        pagina: '#07060f',
        sidebar: 'bg-[#0d0c1c] border-white/10',
        card: 'bg-white/[0.03] border-white/10',
        cardItem: 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]',
        headerBorda: 'border-white/10',
        textoPrimario: 'text-slate-100',
        textoSecundario: 'text-slate-400',
        textoTerciario: 'text-slate-500',
        badge: 'bg-white/10 text-slate-300',
        botao: 'border-white/10 text-slate-300 hover:bg-white/5',
        bolhaCliente: 'bg-white/[0.06] text-slate-100',
        navIconAtivo: 'bg-white/10 text-white',
        navIconInativo: 'text-slate-500 hover:bg-white/5 hover:text-slate-200',
        dropdown: 'bg-[#12111f] border-white/10',
        input: 'bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500',
      }
    : {
        escuro: false,
        pagina: '#f7f7fb',
        sidebar: 'bg-white border-slate-200',
        card: 'bg-white border-slate-200',
        cardItem: 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm',
        headerBorda: 'border-slate-200',
        textoPrimario: 'text-slate-800',
        textoSecundario: 'text-slate-500',
        textoTerciario: 'text-slate-400',
        badge: 'bg-slate-100 text-slate-600',
        botao: 'border-slate-200 text-slate-600 hover:bg-slate-50',
        bolhaCliente: 'bg-slate-100 text-slate-800',
        navIconAtivo: 'bg-pink-50 text-pink-600',
        navIconInativo: 'text-slate-400 hover:bg-slate-50 hover:text-slate-600',
        dropdown: 'bg-white border-slate-200',
        input: 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400',
      };
}

function formatarTelefone(telefone) {
  const d = String(telefone ?? '').replace(/\D/g, '');
  if (d.length !== 11) return telefone;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function filtrarPorBusca(lista, busca) {
  const termo = busca.trim().toLowerCase();
  if (!termo) return lista;
  const termoDigitos = termo.replace(/\D/g, '');
  return lista.filter((l) => {
    const nomeBate = (l.nome || '').toLowerCase().includes(termo);
    const telefoneBate = termoDigitos && String(l.telefone ?? '').replace(/\D/g, '').includes(termoDigitos);
    return nomeBate || telefoneBate;
  });
}

function formatarMoeda(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  if (Number.isNaN(n)) return null;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function PopoverInformacoes({ lead, tema, onFecharContrato }) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  async function handleAbrir() {
    const vaiAbrir = !aberto;
    setAberto(vaiAbrir);
    if (!vaiAbrir || dados || carregando) return;

    if (!N8N_CONSULTAR_CLIENTE_URL) {
      setErro('VITE_N8N_CONSULTAR_CLIENTE_URL não configurada no .env');
      return;
    }

    setCarregando(true);
    setErro('');
    try {
      const resp = await fetch(
        `${N8N_CONSULTAR_CLIENTE_URL}?telefone=${encodeURIComponent(lead.telefone ?? '')}`
      );
      const resultado = await resp.json();
      setDados({
        nome: resultado.nome || lead.nome || '',
        estado: resultado.estado || '',
        cidade: resultado.cidade || '',
        cep: resultado.cep || '',
        end: resultado.end || resultado.endereco || '',
      });
    } catch (err) {
      console.error('Erro ao consultar cliente na planilha:', err);
      setErro('Não consegui consultar a planilha.');
    } finally {
      setCarregando(false);
    }
  }

  function handleCopiar() {
    if (!dados) return;
    const texto = [
      `NOME: ${dados.nome}`,
      `ESTADO: ${dados.estado}`,
      `CIDADE: ${dados.cidade}`,
      `CEP: ${dados.cep}`,
      `END: ${dados.end}`,
    ].join('\n');
    navigator.clipboard?.writeText(texto);
  }

  return (
    <div className="relative flex-1">
      <button
        type="button"
        onClick={handleAbrir}
        className={`flex w-full items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${tema.botao}`}
      >
        <Info size={12} />
        Informações
      </button>

      {aberto && (
        <div
          className={`absolute left-0 top-full z-30 mt-1.5 w-64 rounded-xl border p-3 text-xs shadow-lg ${tema.dropdown}`}
        >
          {carregando && <p className={tema.textoSecundario}>Consultando planilha...</p>}
          {!carregando && erro && <p className="text-red-500">{erro}</p>}
          {!carregando && !erro && dados && (
            <>
              <div className="flex flex-col gap-1">
                <p className={tema.textoPrimario}>
                  <span className="font-semibold">NOME:</span> {dados.nome || '—'}
                </p>
                <p className={tema.textoPrimario}>
                  <span className="font-semibold">ESTADO:</span> {dados.estado || '—'}
                </p>
                <p className={tema.textoPrimario}>
                  <span className="font-semibold">CIDADE:</span> {dados.cidade || '—'}
                </p>
                <p className={tema.textoPrimario}>
                  <span className="font-semibold">CEP:</span> {dados.cep || '—'}
                </p>
                <p className={tema.textoPrimario}>
                  <span className="font-semibold">END:</span> {dados.end || '—'}
                </p>
              </div>
              <div className="mt-2.5 flex gap-1.5">
                <button
                  type="button"
                  onClick={handleCopiar}
                  className={`flex-1 rounded-md border py-1 text-xs font-medium ${tema.botao}`}
                >
                  Copiar
                </button>
                {onFecharContrato && (
                  <button
                    type="button"
                    onClick={() => onFecharContrato(lead)}
                    className="flex-1 rounded-md py-1 text-xs font-medium text-white"
                    style={{ background: GRADIENTE_MARCA }}
                  >
                    Fechar contrato
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CartaoLead({ lead, tema, onAbrir, onPegar, pegando, onFecharContrato }) {
  const statusKey = STATUS_POR_ID[lead.status_id];
  const cfg = statusKey ? STATUS_CONFIG[statusKey] : null;
  const podeFecharContrato = statusKey === 'verde' && onFecharContrato;

  return (
    <div
      className={`w-full rounded-xl border p-3.5 shadow-sm transition-all ${tema.cardItem}`}
    >
      {podeFecharContrato ? (
        // Verde: o card em si não abre nada. Só os botões WhatsApp / Informações abaixo.
        <div className="w-full text-left">
          <div className="flex items-center gap-2">
            {cfg && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cfg.corDot}`} />}
            <p className={`truncate text-sm font-semibold ${tema.textoPrimario}`}>{lead.nome || 'Sem nome'}</p>
          </div>
          <div className={`mt-2 flex items-center gap-1.5 text-xs ${tema.textoSecundario}`}>
            <Phone size={12} />
            <span className="font-mono tabular-nums">{formatarTelefone(lead.telefone)}</span>
          </div>
          {lead.vendedor_id && (
            <div className={`mt-1.5 flex items-center gap-1.5 text-xs ${tema.textoSecundario}`}>
              <UserCircle2 size={12} />
              <span>Vendedor #{lead.vendedor_id}</span>
            </div>
          )}
        </div>
      ) : (
        <button type="button" onClick={() => onAbrir(lead)} className="w-full text-left">
          <div className="flex items-center gap-2">
            {cfg && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cfg.corDot}`} />}
            <p className={`truncate text-sm font-semibold ${tema.textoPrimario}`}>{lead.nome || 'Sem nome'}</p>
          </div>
          <div className={`mt-2 flex items-center gap-1.5 text-xs ${tema.textoSecundario}`}>
            <Phone size={12} />
            <span className="font-mono tabular-nums">{formatarTelefone(lead.telefone)}</span>
          </div>
          {lead.vendedor_id && (
            <div className={`mt-1.5 flex items-center gap-1.5 text-xs ${tema.textoSecundario}`}>
              <UserCircle2 size={12} />
              <span>Vendedor #{lead.vendedor_id}</span>
            </div>
          )}
        </button>
      )}

      {onPegar && (
        <button
          type="button"
          onClick={() => onPegar(lead)}
          disabled={pegando}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: GRADIENTE_MARCA }}
        >
          <Hand size={12} />
          {pegando ? 'Pegando...' : 'Pegar Cliente'}
        </button>
      )}

      {podeFecharContrato && (
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAbrir(lead)}
            title="Abrir WhatsApp"
            aria-label="Abrir WhatsApp"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm transition-opacity hover:opacity-90"
          >
            <MessageCircle size={14} />
          </button>
          <PopoverInformacoes lead={lead} tema={tema} onFecharContrato={onFecharContrato} />
        </div>
      )}
    </div>
  );
}

function formatarData(data) {
  if (!data) return null;
  const [ano, mes, dia] = String(data).split('-');
  if (!ano || !mes || !dia) return data;
  return `${dia}/${mes}/${ano}`;
}

function LinhaInfo({ icone: Icone, tema, label, valor }) {
  if (!valor) return null;
  return (
    <div className={`flex items-center gap-1.5 text-xs ${tema.textoSecundario}`}>
      <Icone size={12} className="shrink-0" />
      <span className="truncate">
        <span className="font-medium">{label}:</span> {valor}
      </span>
    </div>
  );
}

// Card do bloco Roxo: mostra os dados do contrato direto, sem precisar abrir a conversa.
function CartaoContratoRoxo({ lead, contrato, tema }) {
  const c = contrato || {};

  return (
    <div className={`w-full rounded-xl border p-3.5 shadow-sm ${tema.cardItem}`}>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500" />
        <p
          className="truncate text-sm font-semibold"
          style={{ color: tema.escuro ? '#f1f5f9' : '#0f172a' }}
        >
          {c.nome || lead.nome || 'Sem nome'}
        </p>
      </div>

      <div className="mt-2 flex flex-col gap-1">
        <LinhaInfo icone={Hash} tema={tema} label="Contrato" valor={c.contrato} />
        <LinhaInfo icone={MapPin} tema={tema} label="Cidade" valor={c.cidade} />
        <LinhaInfo icone={Phone} tema={tema} label="Telefone" valor={formatarTelefone(c.telefone_1 || lead.telefone)} />
        <LinhaInfo icone={Phone} tema={tema} label="Telefone 2" valor={c.telefone_2 ? formatarTelefone(c.telefone_2) : null} />
        <LinhaInfo icone={Router} tema={tema} label="HP" valor={c.hp} />
        <LinhaInfo icone={Calendar} tema={tema} label="Instalação" valor={formatarData(c.data_instalacao)} />

        {contrato && (
          <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold">
            {c.auditado ? (
              <CheckCircle2 size={12} className="text-emerald-500" />
            ) : (
              <XCircle size={12} className="text-red-500" />
            )}
            <span className={c.auditado ? 'text-emerald-500' : 'text-red-500'}>
              Auditado: {c.auditado ? 'Sim' : 'Não'}
            </span>
          </div>
        )}

        {!contrato && (
          <p className={`mt-0.5 text-xs italic ${tema.textoTerciario}`}>Sem dados de contrato cadastrados.</p>
        )}
      </div>
    </div>
  );
}

function BlocoStatus({
  titulo,
  leads,
  tema,
  onAbrirLead,
  onPegarLead,
  pegandoId,
  onFecharContrato,
  children,
  headerExtra,
  accent,
  renderCard,
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col rounded-2xl border ${tema.card}`}
      style={{ boxShadow: tema.escuro ? '0 20px 45px -30px rgba(0,0,0,0.6)' : '0 12px 30px -20px rgba(15,23,42,0.15)' }}
    >
      <div className={`flex items-center justify-between gap-2 border-b px-4 py-3.5 ${tema.headerBorda}`}>
        <div className="flex min-w-0 items-center gap-2">
          {accent && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent }} />}
          <h2
            className="truncate text-sm font-semibold"
            style={{ color: tema.escuro ? '#f1f5f9' : '#0f172a' }}
          >
            {titulo}
          </h2>
          <span
            className="shrink-0 rounded-full px-1.5 py-0.5 text-xs font-semibold"
            style={
              accent
                ? { background: `${accent}1a`, color: accent }
                : undefined
            }
          >
            {!accent && <span className={`rounded-full px-1.5 py-0.5 ${tema.badge}`}>{leads.length}</span>}
            {accent && leads.length}
          </span>
        </div>
        {headerExtra}
      </div>
      {children}
      <div className="flex flex-col gap-2.5 overflow-y-auto p-3.5" style={{ maxHeight: '560px' }}>
        {leads.length === 0 ? (
          <p className={`py-8 text-center text-xs ${tema.textoTerciario}`}>Nenhum lead nesse status.</p>
        ) : (
          leads.map((lead) =>
            renderCard ? (
              renderCard(lead)
            ) : (
              <CartaoLead
                key={lead.id}
                lead={lead}
                tema={tema}
                onAbrir={onAbrirLead}
                onPegar={onPegarLead}
                pegando={pegandoId === lead.id}
                onFecharContrato={onFecharContrato}
              />
            )
          )
        )}
      </div>
    </div>
  );
}

function Conversa({ lead, tema, usuario, onFechar }) {
  const [mensagens, setMensagens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const fimDaLista = useRef(null);

  useEffect(() => {
    let cancelado = false;

    async function carregarMensagens() {
      setCarregando(true);
      const { data, error } = await supabase
        .from('mensagens')
        .select('id, texto, origem, data')
        .eq('cliente_id', lead.id)
        .order('data', { ascending: true });

      if (!cancelado) {
        if (error) {
          console.error('Erro ao buscar mensagens:', error);
          setErro('Não consegui carregar as mensagens.');
        } else {
          setMensagens(data ?? []);
        }
        setCarregando(false);
      }
    }

    carregarMensagens();

    // Escuta mensagens novas desse cliente em tempo real.
    const canal = supabase
      .channel(`mensagens-cliente-${lead.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `cliente_id=eq.${lead.id}` },
        (payload) => {
          setMensagens((atual) => [...atual, payload.new]);
        }
      )
      .subscribe();

    return () => {
      cancelado = true;
      supabase.removeChannel(canal);
    };
  }, [lead.id]);

  useEffect(() => {
    fimDaLista.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  async function handleEnviar(e) {
    e.preventDefault();
    const textoLimpo = texto.trim();
    if (!textoLimpo || enviando) return;

    if (!N8N_ENVIAR_MENSAGEM_URL) {
      setErro('VITE_N8N_ENVIAR_MENSAGEM_URL não configurada no .env');
      return;
    }

    setEnviando(true);
    setErro('');
    try {
      const resp = await fetch(N8N_ENVIAR_MENSAGEM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: lead.id,
          texto: textoLimpo,
          vendedor: usuario?.nome || 'Supervisor',
        }),
      });
      const resultado = await resp.json();
      if (!resultado.sucesso) {
        setErro(resultado.mensagem || 'Falha ao enviar a mensagem.');
      } else {
        setTexto('');
        // A mensagem enviada chega pela assinatura de tempo real (o n8n quem grava),
        // não precisamos inserir ela aqui manualmente.
      }
    } catch (err) {
      console.error(err);
      setErro('Não consegui falar com o servidor de envio.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/40">
      <div className={`flex w-full max-w-md flex-col border-l ${tema.headerBorda}`} style={{ background: tema.pagina }}>
        <div className={`flex items-center justify-between border-b px-4 py-3 ${tema.headerBorda}`}>
          <div>
            <p className={`text-sm font-semibold ${tema.textoPrimario}`}>{lead.nome || 'Sem nome'}</p>
            <p className={`text-xs ${tema.textoSecundario}`}>{formatarTelefone(lead.telefone)}</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className={`flex h-8 w-8 items-center justify-center rounded-md border ${tema.botao}`}
            aria-label="Fechar conversa"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {carregando ? (
            <p className={`text-center text-xs ${tema.textoTerciario}`}>Carregando conversa...</p>
          ) : mensagens.length === 0 ? (
            <p className={`text-center text-xs ${tema.textoTerciario}`}>Nenhuma mensagem ainda.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {mensagens.map((m) => {
                const doCliente = m.origem === 'cliente';
                return (
                  <div key={m.id} className={`flex ${doCliente ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        doCliente ? tema.bolhaCliente : 'text-white'
                      }`}
                      style={doCliente ? {} : { background: GRADIENTE_MARCA }}
                    >
                      {m.texto}
                    </div>
                  </div>
                );
              })}
              <div ref={fimDaLista} />
            </div>
          )}
        </div>

        {erro && <p className="px-4 pb-1 text-xs text-red-500">{erro}</p>}

        <form onSubmit={handleEnviar} className={`flex items-center gap-2 border-t p-3 ${tema.headerBorda}`}>
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva uma mensagem..."
            disabled={enviando}
            className={`flex-1 rounded-md border bg-transparent px-3 py-2 text-sm outline-none ${tema.headerBorda} ${tema.textoPrimario}`}
          />
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white disabled:opacity-50"
            style={{ background: GRADIENTE_MARCA }}
            aria-label="Enviar"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}

function ItemSidebar({ icone: Icone, ativo, tema, label }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
        ativo ? tema.navIconAtivo : tema.navIconInativo
      }`}
    >
      <Icone size={18} />
    </button>
  );
}

function Sidebar({ tema, inicial }) {
  return (
    <aside
      className={`hidden w-16 shrink-0 flex-col items-center gap-6 border-r py-5 sm:flex ${tema.sidebar}`}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
        style={{ background: GRADIENTE_MARCA }}
      >
        {inicial}
      </div>
      <nav className="flex flex-col items-center gap-2">
        <ItemSidebar icone={Home} ativo tema={tema} label="Painel" />
        <ItemSidebar icone={CheckSquare} tema={tema} label="Tarefas (em breve)" />
        <ItemSidebar icone={Settings} tema={tema} label="Configurações (em breve)" />
      </nav>
    </aside>
  );
}

function ModalNovoLead({ tema, onFechar, onCriado }) {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSalvar(e) {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (!nomeLimpo || !telefoneLimpo) {
      setErro('Preenche nome e telefone.');
      return;
    }

    setSalvando(true);
    setErro('');
    const { error } = await supabase
      .from('clientes')
      .insert({ nome: nomeLimpo, telefone: telefoneLimpo, status_id: 1 });

    if (error) {
      console.error('Erro ao criar lead:', error);
      setErro('Não consegui salvar o lead. Confere a policy de INSERT na tabela clientes.');
      setSalvando(false);
      return;
    }

    setSalvando(false);
    onCriado?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={handleSalvar}
        className={`w-full max-w-sm rounded-2xl border p-5 ${tema.card}`}
        style={{ background: tema.escuro ? '#12111f' : '#fff' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className={`text-sm font-semibold ${tema.textoPrimario}`}>Novo lead</h3>
          <button
            type="button"
            onClick={onFechar}
            className={`flex h-7 w-7 items-center justify-center rounded-md border ${tema.botao}`}
            aria-label="Fechar"
          >
            <X size={13} />
          </button>
        </div>

        <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>Nome</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do cliente"
          className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
        />

        <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>Telefone</label>
        <input
          type="text"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(11) 99999-9999"
          className={`mb-1 w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
        />

        {erro && <p className="mt-2 text-xs text-red-500">{erro}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          style={{ background: GRADIENTE_MARCA }}
        >
          {salvando ? 'Salvando...' : 'Adicionar lead'}
        </button>
      </form>
    </div>
  );
}

// Campo reutilizado nos dois modais de contrato: Sim / Não pro "auditado".
function CampoAuditado({ tema, valor, onChange }) {
  return (
    <div className="mb-3">
      <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>Auditado?</label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
            valor === true
              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
              : tema.botao
          }`}
        >
          Sim
        </button>
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
            valor === false
              ? 'border-red-500 bg-red-500/10 text-red-500'
              : tema.botao
          }`}
        >
          Não
        </button>
      </div>
    </div>
  );
}

// Campo reutilizado nos dois modais de contrato: seletor de vendedor.
function CampoVendedor({ tema, vendedorId, setVendedorId }) {
  const [vendedores, setVendedores] = useState([]);

  useEffect(() => {
    async function carregarVendedores() {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('perfil', 'vendedor')
        .order('nome', { ascending: true });
      if (!error) setVendedores(data ?? []);
    }
    carregarVendedores();
  }, []);

  return (
    <div className="mb-3">
      <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>Vendedor</label>
      <select
        value={vendedorId}
        onChange={(e) => setVendedorId(e.target.value)}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
      >
        <option value="">Selecione...</option>
        {vendedores.map((v) => (
          <option key={v.id} value={v.id}>
            {v.nome}
          </option>
        ))}
      </select>
    </div>
  );
}

// Fluxo A: fecha contrato de um lead que já está Verde -> vira Roxo (status_id 4).
// Os dados do contrato em si vão pra tabela "contrato" (não pra "clientes").
function ModalFecharContrato({ lead, tema, usuario, onFechar, onFechado }) {
  const [vendedorId, setVendedorId] = useState(lead.vendedor_id ? String(lead.vendedor_id) : '');
  const [cidade, setCidade] = useState('');
  const [nome, setNome] = useState(lead.nome || '');
  const [telefone1, setTelefone1] = useState(lead.telefone || '');
  const [telefone2, setTelefone2] = useState('');
  const [contrato, setContrato] = useState('');
  const [hp, setHp] = useState('');
  const [dataInstalacao, setDataInstalacao] = useState('');
  const [auditado, setAuditado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSalvar(e) {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    const telefone1Limpo = telefone1.replace(/\D/g, '');
    if (!nomeLimpo || !telefone1Limpo) {
      setErro('Preenche pelo menos nome e telefone.');
      return;
    }

    setSalvando(true);
    setErro('');

    // 1) Move o cliente pra Roxo.
    const { error: erroCliente } = await supabase
      .from('clientes')
      .update({ status_id: 4 })
      .eq('id', lead.id);

    if (erroCliente) {
      console.error('Erro ao mover cliente para roxo:', erroCliente);
      setErro('Não consegui atualizar o status do cliente. Confere a policy de UPDATE na tabela clientes.');
      setSalvando(false);
      return;
    }

    // 2) Grava os dados do contrato na tabela "contrato".
    const { error: erroContrato } = await supabase.from('contrato').insert({
      cliente_id: lead.id,
      vendedor_id: vendedorId || null,
      cidade: cidade.trim() || null,
      nome: nomeLimpo,
      telefone_1: telefone1Limpo,
      telefone_2: telefone2.replace(/\D/g, '') || null,
      contrato: contrato.trim() || null,
      hp: hp.trim() || null,
      data_instalacao: dataInstalacao || null,
      auditado,
    });

    if (erroContrato) {
      console.error('Erro ao gravar contrato:', erroContrato);
      setErro('Cliente virou Roxo, mas não consegui salvar os dados do contrato. Confere a tabela "contrato".');
      setSalvando(false);
      return;
    }

    setSalvando(false);
    onFechado?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={handleSalvar}
        className={`max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border p-5 ${tema.card}`}
        style={{ background: tema.escuro ? '#12111f' : '#fff' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className={`text-sm font-semibold ${tema.textoPrimario}`}>Fechar contrato</h3>
            <p className={`text-xs ${tema.textoSecundario}`}>{lead.nome || 'Sem nome'}</p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className={`flex h-7 w-7 items-center justify-center rounded-md border ${tema.botao}`}
            aria-label="Fechar"
          >
            <X size={13} />
          </button>
        </div>

        <CampoVendedor tema={tema} vendedorId={vendedorId} setVendedorId={setVendedorId} />

        <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>Cidade</label>
        <input
          type="text"
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          placeholder="Cidade"
          className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
        />

        <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>Nome</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do cliente"
          className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
        />

        <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>Telefone</label>
        <input
          type="text"
          value={telefone1}
          onChange={(e) => setTelefone1(e.target.value)}
          placeholder="(11) 99999-9999"
          className={`mb-2 w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
        />
        <input
          type="text"
          value={telefone2}
          onChange={(e) => setTelefone2(e.target.value)}
          placeholder="Segundo telefone (opcional)"
          className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
        />

        <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>Contrato</label>
        <input
          type="text"
          value={contrato}
          onChange={(e) => setContrato(e.target.value)}
          placeholder="Número/identificação do contrato"
          className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
        />

        <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>HP</label>
        <input
          type="text"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          placeholder="HP"
          className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
        />

        <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>Data de instalação</label>
        <input
          type="date"
          value={dataInstalacao}
          onChange={(e) => setDataInstalacao(e.target.value)}
          style={{ colorScheme: tema.escuro ? 'dark' : 'light' }}
          className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
        />

        <CampoAuditado tema={tema} valor={auditado} onChange={setAuditado} />

        {erro && <p className="mt-2 text-xs text-red-500">{erro}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          style={{ background: GRADIENTE_MARCA }}
        >
          <FileCheck2 size={14} />
          {salvando ? 'Fechando...' : 'Confirmar fechamento'}
        </button>
      </form>
    </div>
  );
}

// Fluxo B: cadastro direto de um contrato (a empresa já fechou fora do funil),
// cria o cliente direto como Roxo e já grava os dados na tabela "contrato".
function ModalNovoContrato({ tema, onFechar, onCriado }) {
  const [vendedorId, setVendedorId] = useState('');
  const [cidade, setCidade] = useState('');
  const [nome, setNome] = useState('');
  const [telefone1, setTelefone1] = useState('');
  const [telefone2, setTelefone2] = useState('');
  const [contrato, setContrato] = useState('');
  const [hp, setHp] = useState('');
  const [dataInstalacao, setDataInstalacao] = useState('');
  const [auditado, setAuditado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSalvar(e) {
    e.preventDefault();
    const nomeLimpo = nome.trim();
    const telefone1Limpo = telefone1.replace(/\D/g, '');
    if (!nomeLimpo || !telefone1Limpo) {
      setErro('Preenche pelo menos nome e telefone.');
      return;
    }

    setSalvando(true);
    setErro('');

    // 1) Cria o cliente já como Roxo.
    const { data: clienteCriado, error: erroCliente } = await supabase
      .from('clientes')
      .insert({
        nome: nomeLimpo,
        telefone: telefone1Limpo,
        status_id: 4, // roxo direto
        vendedor_id: vendedorId || null,
      })
      .select('id')
      .single();

    if (erroCliente) {
      console.error('Erro ao cadastrar contrato direto:', erroCliente);
      setErro('Não consegui salvar o cliente. Confere a policy de INSERT na tabela clientes.');
      setSalvando(false);
      return;
    }

    // 2) Grava os dados do contrato na tabela "contrato".
    const { error: erroContrato } = await supabase.from('contrato').insert({
      cliente_id: clienteCriado.id,
      vendedor_id: vendedorId || null,
      cidade: cidade.trim() || null,
      nome: nomeLimpo,
      telefone_1: telefone1Limpo,
      telefone_2: telefone2.replace(/\D/g, '') || null,
      contrato: contrato.trim() || null,
      hp: hp.trim() || null,
      data_instalacao: dataInstalacao || null,
      auditado,
    });

    if (erroContrato) {
      console.error('Erro ao gravar contrato:', erroContrato);
      setErro('Cliente foi criado, mas não consegui salvar os dados do contrato. Confere a tabela "contrato".');
      setSalvando(false);
      return;
    }

    setSalvando(false);
    onCriado?.();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        onSubmit={handleSalvar}
        className={`max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl border p-5 ${tema.card}`}
        style={{ background: tema.escuro ? '#12111f' : '#fff' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className={`text-sm font-semibold ${tema.textoPrimario}`}>Novo contrato direto</h3>
          <button
            type="button"
            onClick={onFechar}
            className={`flex h-7 w-7 items-center justify-center rounded-md border ${tema.botao}`}
            aria-label="Fechar"
          >
            <X size={13} />
          </button>
        </div>

        <CampoVendedor tema={tema} vendedorId={vendedorId} setVendedorId={setVendedorId} />

        <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>Cidade</label>
        <input
          type="text"
          value={cidade}
          onChange={(e) => setCidade(e.target.value)}
          placeholder="Cidade"
          className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
        />

        <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>Nome</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do cliente"
          className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
        />

        <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>Telefone</label>
        <input
          type="text"
          value={telefone1}
          onChange={(e) => setTelefone1(e.target.value)}
          placeholder="(11) 99999-9999"
          className={`mb-2 w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
        />
        <input
          type="text"
          value={telefone2}
          onChange={(e) => setTelefone2(e.target.value)}
          placeholder="Segundo telefone (opcional)"
          className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
        />

        <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>Contrato</label>
        <input
          type="text"
          value={contrato}
          onChange={(e) => setContrato(e.target.value)}
          placeholder="Número/identificação do contrato"
          className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
        />

        <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>HP</label>
        <input
          type="text"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          placeholder="HP"
          className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
        />

        <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>Data de instalação</label>
        <input
          type="date"
          value={dataInstalacao}
          onChange={(e) => setDataInstalacao(e.target.value)}
          style={{ colorScheme: tema.escuro ? 'dark' : 'light' }}
          className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
        />

        <CampoAuditado tema={tema} valor={auditado} onChange={setAuditado} />

        {erro && <p className="mt-2 text-xs text-red-500">{erro}</p>}

        <button
          type="submit"
          disabled={salvando}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          style={{ background: GRADIENTE_MARCA }}
        >
          <Briefcase size={14} />
          {salvando ? 'Salvando...' : 'Registrar contrato'}
        </button>
      </form>
    </div>
  );
}

export default function PainelCRM({ usuario }) {
  const [escuro, setEscuro] = useState(false);
  const [mostrarLegenda, setMostrarLegenda] = useState(false);
  const [leads, setLeads] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState('');
  const [leadAberto, setLeadAberto] = useState(null);
  const [pegandoId, setPegandoId] = useState(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [notifAberta, setNotifAberta] = useState(false);
  const [modalNovoLead, setModalNovoLead] = useState(false);
  const [leadFechandoContrato, setLeadFechandoContrato] = useState(null);
  const [modalNovoContrato, setModalNovoContrato] = useState(false);
  const [buscaClientes, setBuscaClientes] = useState('');
  const [filtroRoxo, setFiltroRoxo] = useState('meus'); // 'meus' | 'todos' — só usado por vendedor
  const [contratosPorCliente, setContratosPorCliente] = useState({});
  const tema = useTema(escuro);
  const navigate = useNavigate();

  const souVendedor = usuario?.perfil === 'vendedor';

  useEffect(() => {
    async function carregarClientes() {
      setCarregando(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, telefone, status_id, vendedor_id')
        .order('id', { ascending: false });

      if (error) {
        console.error('Erro ao buscar clientes:', error);
        setErroCarregamento(
          'Não consegui carregar os clientes. Confere se a policy de leitura (RLS) está criada na tabela clientes.'
        );
      } else {
        setLeads(data ?? []);
      }
      setCarregando(false);
    }

    carregarClientes();

    // Mantém a lista viva: qualquer INSERT/UPDATE/DELETE em clientes atualiza a tela sozinho.
    const canal = supabase
      .channel('clientes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, (payload) => {
        setLeads((atual) => {
          if (payload.eventType === 'INSERT') {
            return [payload.new, ...atual];
          }
          if (payload.eventType === 'UPDATE') {
            return atual.map((l) => (l.id === payload.new.id ? payload.new : l));
          }
          if (payload.eventType === 'DELETE') {
            return atual.filter((l) => l.id !== payload.old.id);
          }
          return atual;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  useEffect(() => {
    async function carregarContratos() {
      const { data, error } = await supabase
        .from('contrato')
        .select('cliente_id, nome, contrato, cidade, telefone_1, telefone_2, hp, data_instalacao, auditado');

      if (error) {
        console.error('Erro ao buscar contratos:', error);
        return;
      }

      const mapa = {};
      (data ?? []).forEach((c) => {
        mapa[c.cliente_id] = c;
      });
      setContratosPorCliente(mapa);
    }

    carregarContratos();

    // Mantém os dados do contrato vivos em tempo real também.
    const canal = supabase
      .channel('contrato-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contrato' }, (payload) => {
        setContratosPorCliente((atual) => {
          const novo = { ...atual };
          if (payload.eventType === 'DELETE') {
            delete novo[payload.old.cliente_id];
          } else {
            novo[payload.new.cliente_id] = payload.new;
          }
          return novo;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  async function handleSair() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  async function handlePegarCliente(lead) {
    if (pegandoId) return;
    setPegandoId(lead.id);

    const { error } = await supabase.from('clientes').update({ vendedor_id: usuario.id }).eq('id', lead.id);

    if (error) {
      console.error('Erro ao pegar cliente:', error);
      // Se der erro (ex: outro vendedor pegou primeiro), a lista em tempo real
      // já vai refletir o estado real assim que o UPDATE de outra pessoa chegar.
    }

    setPegandoId(null);
  }

  // Vendedor só vê os próprios clientes; supervisor/agente veem todos, como sempre.
  const leadsVisiveis = souVendedor ? leads.filter((l) => l.vendedor_id === usuario.id) : leads;

  // Vermelhos ainda sem vendedor — só faz sentido pra quem pode pegar.
  const vermelhosDisponiveis = souVendedor
    ? leads.filter((l) => STATUS_POR_ID[l.status_id] === 'vermelho' && !l.vendedor_id)
    : [];

  const porStatus = (chave) => leadsVisiveis.filter((l) => STATUS_POR_ID[l.status_id] === chave);

  // Bloco "Todos os clientes" (supervisor) com busca por nome ou telefone.
  const todosClientesFiltrados = filtrarPorBusca(leadsVisiveis, buscaClientes);

  // Bloco Roxo do vendedor: alterna entre só os seus contratos ou todos.
  const roxosVisiveis = souVendedor
    ? filtroRoxo === 'todos'
      ? leads.filter((l) => STATUS_POR_ID[l.status_id] === 'roxo')
      : leads.filter((l) => STATUS_POR_ID[l.status_id] === 'roxo' && l.vendedor_id === usuario.id)
    : porStatus('roxo');

  const tituloPainel = souVendedor ? `Painel de ${usuario?.nome ?? 'vendedor'}` : 'Painel do supervisor';
  const descricaoPainel = souVendedor ? 'Seus clientes em tempo real' : 'Todos os leads em tempo real';
  const inicial = (usuario?.nome ?? 'S').charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen transition-colors" style={{ background: tema.pagina }}>
      <Sidebar tema={tema} inicial={inicial} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className={`flex items-center justify-between border-b px-5 py-4 ${tema.headerBorda}`}>
          <div>
            <p className={`text-base font-bold ${tema.textoPrimario}`} style={{ fontFamily: 'Sora, sans-serif' }}>
              {tituloPainel}
            </p>
            <p className={`text-xs ${tema.textoSecundario}`}>{descricaoPainel}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setModalNovoContrato(true)}
              className={`hidden items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold sm:flex ${tema.botao}`}
            >
              <Briefcase size={13} />
              Contrato
            </button>

            <button
              type="button"
              onClick={() => setModalNovoLead(true)}
              className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 sm:flex"
              style={{ background: GRADIENTE_MARCA }}
            >
              <Plus size={13} />
              Lead
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotifAberta((v) => !v);
                  setMenuAberto(false);
                }}
                aria-label="Notificações"
                className={`relative flex h-9 w-9 items-center justify-center rounded-lg border ${tema.botao}`}
              >
                <Bell size={15} />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-pink-500" />
              </button>
              {notifAberta && (
                <div
                  className={`absolute right-0 z-40 mt-2 w-56 rounded-xl border p-3 text-xs shadow-lg ${tema.dropdown} ${tema.textoSecundario}`}
                >
                  Nenhuma notificação nova por enquanto.
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setMenuAberto((v) => !v);
                  setNotifAberta(false);
                }}
                className={`flex items-center gap-1.5 rounded-lg border py-1.5 pl-1.5 pr-2 ${tema.botao}`}
              >
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-white"
                  style={{ background: GRADIENTE_MARCA }}
                >
                  {inicial}
                </div>
                <ChevronDown size={12} />
              </button>
              {menuAberto && (
                <div className={`absolute right-0 z-40 mt-2 w-44 rounded-xl border p-1.5 shadow-lg ${tema.dropdown}`}>
                  <button
                    type="button"
                    onClick={() => setEscuro((v) => !v)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium ${tema.navIconInativo}`}
                  >
                    {escuro ? <Sun size={13} /> : <Moon size={13} />}
                    {escuro ? 'Tema claro' : 'Tema escuro'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSair}
                    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-red-500 hover:bg-red-500/10`}
                  >
                    <LogOut size={13} />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {erroCarregamento && (
          <div className="mx-5 mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
            {erroCarregamento}
          </div>
        )}

        <div className="overflow-x-auto p-5">
          {carregando ? (
            <p className={`text-sm ${tema.textoSecundario}`}>Carregando clientes...</p>
          ) : (
            <div className="flex min-w-[1150px] gap-4">
              {!souVendedor && (
                <BlocoStatus
                  titulo="Todos os clientes"
                  leads={todosClientesFiltrados}
                  tema={tema}
                  onAbrirLead={setLeadAberto}
                  headerExtra={
                    <button
                      type="button"
                      onClick={() => setMostrarLegenda((v) => !v)}
                      className={`flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${tema.botao}`}
                    >
                      {mostrarLegenda ? <EyeOff size={12} /> : <Eye size={12} />}
                      {mostrarLegenda ? 'Ocultar' : 'Legenda'}
                    </button>
                  }
                >
                  <div className={`border-b px-3 py-2.5 ${tema.headerBorda}`}>
                    <div className="relative">
                      <Search
                        size={13}
                        className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 ${tema.textoTerciario}`}
                      />
                      <input
                        type="text"
                        value={buscaClientes}
                        onChange={(e) => setBuscaClientes(e.target.value)}
                        placeholder="Buscar por nome ou telefone..."
                        className={`w-full rounded-lg border py-1.5 pl-8 pr-2.5 text-xs outline-none ${tema.input}`}
                      />
                    </div>
                  </div>
                  {mostrarLegenda && (
                    <div className={`flex flex-col gap-1.5 border-b px-3 py-2.5 ${tema.headerBorda}`}>
                      {Object.values(STATUS_CONFIG).map((cfg) => (
                        <div key={cfg.titulo} className="flex items-center gap-2 text-xs">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${cfg.corDot}`} />
                          <span className={`font-medium ${tema.textoPrimario}`}>{cfg.titulo}:</span>
                          <span className={tema.textoSecundario}>{cfg.descricao}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </BlocoStatus>
              )}

              {souVendedor && (
                <BlocoStatus
                  titulo="Vermelhos Disponíveis"
                  leads={vermelhosDisponiveis}
                  tema={tema}
                  onAbrirLead={setLeadAberto}
                  onPegarLead={handlePegarCliente}
                  pegandoId={pegandoId}
                  accent={STATUS_CONFIG.vermelho.accent}
                />
              )}

              <BlocoStatus
                titulo="Branco"
                leads={porStatus('branco')}
                tema={tema}
                onAbrirLead={setLeadAberto}
                accent={STATUS_CONFIG.branco.accent}
              />
              <BlocoStatus
                titulo="Vermelho"
                leads={porStatus('vermelho')}
                tema={tema}
                onAbrirLead={setLeadAberto}
                accent={STATUS_CONFIG.vermelho.accent}
              />
              <BlocoStatus
                titulo="Verde"
                leads={porStatus('verde')}
                tema={tema}
                onAbrirLead={setLeadAberto}
                onFecharContrato={setLeadFechandoContrato}
                accent={STATUS_CONFIG.verde.accent}
              />
              <BlocoStatus
                titulo="Roxo"
                leads={roxosVisiveis}
                tema={tema}
                onAbrirLead={setLeadAberto}
                accent={STATUS_CONFIG.roxo.accent}
                renderCard={(lead) => (
                  <CartaoContratoRoxo
                    key={lead.id}
                    lead={lead}
                    contrato={contratosPorCliente[lead.id]}
                    tema={tema}
                  />
                )}
                headerExtra={
                  <div className="flex shrink-0 items-center gap-1.5">
                    {souVendedor && (
                      <div className={`flex items-center gap-0.5 rounded-md border p-0.5 ${tema.botao}`}>
                        <button
                          type="button"
                          onClick={() => setFiltroRoxo('meus')}
                          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                            filtroRoxo === 'meus'
                              ? 'text-white'
                              : tema.textoSecundario
                          }`}
                          style={filtroRoxo === 'meus' ? { background: GRADIENTE_MARCA } : undefined}
                        >
                          Meus
                        </button>
                        <button
                          type="button"
                          onClick={() => setFiltroRoxo('todos')}
                          className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                            filtroRoxo === 'todos'
                              ? 'text-white'
                              : tema.textoSecundario
                          }`}
                          style={filtroRoxo === 'todos' ? { background: GRADIENTE_MARCA } : undefined}
                        >
                          Todos
                        </button>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setModalNovoContrato(true)}
                      title="Novo contrato direto"
                      aria-label="Novo contrato direto"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white shadow-sm transition-opacity hover:opacity-90"
                      style={{ background: GRADIENTE_MARCA }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                }
              />
            </div>
          )}
        </div>
      </div>

      {leadAberto && (
        <Conversa lead={leadAberto} tema={tema} usuario={usuario} onFechar={() => setLeadAberto(null)} />
      )}

      {modalNovoLead && (
        <ModalNovoLead
          tema={tema}
          onFechar={() => setModalNovoLead(false)}
          onCriado={() => setModalNovoLead(false)}
        />
      )}

      {leadFechandoContrato && (
        <ModalFecharContrato
          lead={leadFechandoContrato}
          tema={tema}
          usuario={usuario}
          onFechar={() => setLeadFechandoContrato(null)}
          onFechado={() => setLeadFechandoContrato(null)}
        />
      )}

      {modalNovoContrato && (
        <ModalNovoContrato
          tema={tema}
          onFechar={() => setModalNovoContrato(false)}
          onCriado={() => setModalNovoContrato(false)}
        />
      )}
    </div>
  );
}
