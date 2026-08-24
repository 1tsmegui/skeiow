import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Eye, EyeOff, Phone, UserCircle2, Sun, Moon, LogOut, X, Send, Hand } from 'lucide-react';

// URL do webhook de envio do seu n8n (ver .env). Ex:
// VITE_N8N_ENVIAR_MENSAGEM_URL=https://seu-n8n.com/webhook/enviar-mensagem
const N8N_ENVIAR_MENSAGEM_URL = import.meta.env.VITE_N8N_ENVIAR_MENSAGEM_URL;

// status_id -> chave visual. 1/2/3 confirmados no seu classificador.
// 4 (roxo) é uma suposição — ajuste aqui se o número real for outro.
const STATUS_POR_ID = { 1: 'branco', 2: 'vermelho', 3: 'verde', 4: 'roxo' };

const STATUS_CONFIG = {
  branco: { titulo: 'Branco', descricao: 'Aguardando validação', corDot: 'bg-white border-2 border-slate-400' },
  vermelho: { titulo: 'Vermelho', descricao: 'Intervenção humana', corDot: 'bg-red-500' },
  verde: { titulo: 'Verde', descricao: 'Validados e sorteados para vendedores', corDot: 'bg-emerald-500' },
  roxo: { titulo: 'Roxo', descricao: 'Clientes que viraram contrato', corDot: 'bg-violet-500' },
};

function useTema(escuro) {
  return escuro
    ? {
        pagina: '#0a0a14',
        card: 'bg-white/[0.02] border-white/10',
        cardItem: 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]',
        headerBorda: 'border-white/10',
        textoPrimario: 'text-slate-100',
        textoSecundario: 'text-slate-400',
        textoTerciario: 'text-slate-500',
        badge: 'bg-white/10 text-slate-300',
        botao: 'border-white/10 text-slate-300 hover:bg-white/5',
        bolhaCliente: 'bg-white/[0.06] text-slate-100',
      }
    : {
        pagina: '#f8fafc',
        card: 'bg-white border-slate-200',
        cardItem: 'bg-white border-slate-200 hover:border-slate-300',
        headerBorda: 'border-slate-200',
        textoPrimario: 'text-slate-800',
        textoSecundario: 'text-slate-500',
        textoTerciario: 'text-slate-400',
        badge: 'bg-slate-100 text-slate-600',
        botao: 'border-slate-300 text-slate-600 hover:bg-slate-50',
        bolhaCliente: 'bg-slate-100 text-slate-800',
      };
}

function formatarTelefone(telefone) {
  const d = String(telefone ?? '').replace(/\D/g, '');
  if (d.length !== 11) return telefone;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function CartaoLead({ lead, tema, onAbrir, onPegar, pegando }) {
  const statusKey = STATUS_POR_ID[lead.status_id];
  const cfg = statusKey ? STATUS_CONFIG[statusKey] : null;
  return (
    <div className={`w-full rounded-lg border p-3 transition-colors ${tema.cardItem}`}>
      <button type="button" onClick={() => onAbrir(lead)} className="w-full text-left">
        <div className="flex items-center gap-2">
          {cfg && <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cfg.corDot}`} />}
          <p className={`truncate text-sm font-medium ${tema.textoPrimario}`}>{lead.nome || 'Sem nome'}</p>
        </div>
        <div className={`mt-1.5 flex items-center gap-1.5 text-xs ${tema.textoSecundario}`}>
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

      {onPegar && (
        <button
          type="button"
          onClick={() => onPegar(lead)}
          disabled={pegando}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}
        >
          <Hand size={12} />
          {pegando ? 'Pegando...' : 'Pegar Cliente'}
        </button>
      )}
    </div>
  );
}

function BlocoStatus({ titulo, leads, tema, onAbrirLead, onPegarLead, pegandoId, children, headerExtra }) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col rounded-xl border ${tema.card}`}>
      <div className={`flex items-center justify-between gap-2 border-b px-3 py-2.5 ${tema.headerBorda}`}>
        <div className="flex min-w-0 items-center gap-2">
          <h2 className={`truncate text-sm font-semibold ${tema.textoPrimario}`}>{titulo}</h2>
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs font-medium ${tema.badge}`}>
            {leads.length}
          </span>
        </div>
        {headerExtra}
      </div>
      {children}
      <div className="flex flex-col gap-2 overflow-y-auto p-3" style={{ maxHeight: '560px' }}>
        {leads.length === 0 ? (
          <p className={`py-6 text-center text-xs ${tema.textoTerciario}`}>Nenhum lead nesse status.</p>
        ) : (
          leads.map((lead) => (
            <CartaoLead
              key={lead.id}
              lead={lead}
              tema={tema}
              onAbrir={onAbrirLead}
              onPegar={onPegarLead}
              pegando={pegandoId === lead.id}
            />
          ))
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
                      style={doCliente ? {} : { background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}
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
            style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}
            aria-label="Enviar"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
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

  const tituloPainel = souVendedor ? `Painel de ${usuario?.nome ?? 'vendedor'}` : 'Painel do supervisor';
  const descricaoPainel = souVendedor ? 'Seus clientes em tempo real' : 'Todos os leads em tempo real';
  const inicial = (usuario?.nome ?? 'S').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen transition-colors" style={{ background: tema.pagina }}>
      <div className={`flex items-center justify-between border-b px-5 py-4 ${tema.headerBorda}`}>
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}
          >
            {inicial}
          </div>
          <div>
            <p className={`text-sm font-semibold ${tema.textoPrimario}`}>{tituloPainel}</p>
            <p className={`text-xs ${tema.textoSecundario}`}>{descricaoPainel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEscuro((v) => !v)}
            aria-label={escuro ? 'Ativar tema claro' : 'Ativar tema escuro'}
            className={`flex h-8 w-8 items-center justify-center rounded-md border ${tema.botao}`}
          >
            {escuro ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            type="button"
            onClick={handleSair}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium ${tema.botao}`}
          >
            <LogOut size={12} />
            Sair
          </button>
        </div>
      </div>

      {erroCarregamento && (
        <div className="mx-4 mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
          {erroCarregamento}
        </div>
      )}

      <div className="overflow-x-auto p-4">
        {carregando ? (
          <p className={`text-sm ${tema.textoSecundario}`}>Carregando clientes...</p>
        ) : (
          <div className="flex min-w-[1100px] gap-4">
            {!souVendedor && (
              <BlocoStatus
                titulo="Todos os Contatos"
                leads={leadsVisiveis}
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
              />
            )}

            <BlocoStatus titulo="Branco" leads={porStatus('branco')} tema={tema} onAbrirLead={setLeadAberto} />
            <BlocoStatus titulo="Vermelho" leads={porStatus('vermelho')} tema={tema} onAbrirLead={setLeadAberto} />
            <BlocoStatus titulo="Verde" leads={porStatus('verde')} tema={tema} onAbrirLead={setLeadAberto} />
            <BlocoStatus titulo="Roxo" leads={porStatus('roxo')} tema={tema} onAbrirLead={setLeadAberto} />
          </div>
        )}
      </div>

      {leadAberto && (
        <Conversa lead={leadAberto} tema={tema} usuario={usuario} onFechar={() => setLeadAberto(null)} />
      )}
    </div>
  );
}
