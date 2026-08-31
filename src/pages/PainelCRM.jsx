import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Wifi,
  Trash2,
  Trophy,
  Handshake,
  Zap,
  TrendingUp,
  Medal,
} from 'lucide-react';

// URL do webhook de envio do seu n8n (ver .env). Ex:
// VITE_N8N_ENVIAR_MENSAGEM_URL=https://seu-n8n.com/webhook/enviar-mensagem
const N8N_ENVIAR_MENSAGEM_URL = import.meta.env.VITE_N8N_ENVIAR_MENSAGEM_URL;

// URL do webhook do n8n que consulta a planilha e devolve NOME/ESTADO/CIDADE/CEP/END
// pelo telefone do cliente. Ex:
// VITE_N8N_CONSULTAR_CLIENTE_URL=https://seu-n8n.com/webhook/consultar-cliente
const N8N_CONSULTAR_CLIENTE_URL = import.meta.env.VITE_N8N_CONSULTAR_CLIENTE_URL;

// URL do webhook do bot de Viabilidade (Playwright), exposta via ngrok.
// Ex: VITE_VIABILIDADE_URL=https://seu-ngrok.ngrok-free.dev/consultar-viabilidade
const VIABILIDADE_URL = import.meta.env.VITE_VIABILIDADE_URL;

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

// Remove acentos/espaços/pontuação e deixa minúsculo, pra comparar nomes de
// coluna da planilha sem depender de como o usuário escreveu o cabeçalho
// (Nome, NOME, nome completo, Nome Completo...).
function normalizarChave(chave) {
  return String(chave)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

// Procura, num objeto vindo da planilha, o valor de um campo tentando várias
// variações de nome de coluna (ex: buscarValor(planilha, 'nome da mae', 'mae')
// bate em "Nome da Mãe", "NOME_DA_MAE", "mãe", etc). Devolve '' se não achar.
function buscarValor(objeto, ...possiveisChaves) {
  if (!objeto) return '';
  const alvos = possiveisChaves.map(normalizarChave);
  for (const chave of Object.keys(objeto)) {
    if (alvos.includes(normalizarChave(chave))) {
      const valor = objeto[chave];
      if (valor !== undefined && valor !== null && String(valor).trim() !== '') {
        return String(valor).trim();
      }
    }
  }
  return '';
}

// Monta o bloco de texto no mesmo formato usado pra colar no cadastro da
// Claro. Campos sem valor ficam em branco (só o rótulo), igual ao modelo.
// Separado em duas partes porque DATA DE INSTALAÇÃO não vem da planilha —
// é digitada manualmente pelo vendedor no popover (o bot ainda não grava
// a data combinada em nenhuma tabela).
function montarLinhasCadastro(dados) {
  const cidadeEstado = [dados.cidade, dados.estado].filter(Boolean).join('/');
  return [
    '🔴 DADOS PARA CADASTRO CLARO - cancelados sem agenda',
    `📌VENDEDOR: ${dados.vendedor}`,
    `📌NOME COMPLETO: ${dados.nomeCompleto}`,
    `📌CPF/CNPJ: ${dados.cpfCnpj}`,
    `📌DATA DE NASCIMENTO: ${dados.dataNascimento}`,
    `📌NOME DA MÃE: ${dados.nomeMae}`,
    `📌CIDADE/ESTADO: ${cidadeEstado}`,
    `📌ENDEREÇO: ${dados.endereco}`,
    `📌CEP: ${dados.cep}`,
    `📌BAIRRO: ${dados.bairro}`,
    `📌HP: ${dados.hp}`,
    `📌E-MAIL: ${dados.email}`,
    `📌TELEFONE: ${dados.telefone}`,
  ];
}

function montarTextoCadastro(dados) {
  return [...montarLinhasCadastro(dados), `📌DATA DE INSTALAÇÃO: ${dados.dataInstalacao || ''}`].join('\n');
}

function PopoverInformacoes({ lead, tema, onFecharContrato }) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [dados, setDados] = useState(null);
  const [dataInstalacao, setDataInstalacao] = useState('');
  const [erro, setErro] = useState('');
  const [posicao, setPosicao] = useState(null);
  const botaoRef = useRef(null);

  function calcularPosicao() {
    const rect = botaoRef.current?.getBoundingClientRect();
    if (!rect) return;
    const larguraPopover = 384; // w-96
    // Mantém o popover dentro da tela horizontalmente (não deixa cortar na direita).
    const left = Math.min(rect.left, window.innerWidth - larguraPopover - 12);
    setPosicao({ top: rect.bottom + 6, left: Math.max(12, left) });
  }

  async function handleAbrir() {
    const vaiAbrir = !aberto;
    if (vaiAbrir) calcularPosicao();
    setAberto(vaiAbrir);
    if (!vaiAbrir || dados || carregando) return;

    if (!N8N_CONSULTAR_CLIENTE_URL) {
      setErro('VITE_N8N_CONSULTAR_CLIENTE_URL não configurada no .env');
      return;
    }

    setCarregando(true);
    setErro('');
    try {
      const [respPlanilha, respVendedor] = await Promise.all([
        fetch(`${N8N_CONSULTAR_CLIENTE_URL}?telefone=${encodeURIComponent(lead.telefone ?? '')}`, {
          headers: {
            // Evita a página de aviso do ngrok (free tier) quando acessado pelo navegador,
            // que devolve HTML em vez do JSON esperado.
            'ngrok-skip-browser-warning': 'true',
          },
        }),
        lead.vendedor_id
          ? supabase.from('usuarios').select('nome').eq('id', lead.vendedor_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const contentType = respPlanilha.headers.get('content-type') || '';
      if (!respPlanilha.ok || !contentType.includes('application/json')) {
        console.error('Resposta inesperada da consulta de cliente:', respPlanilha.status, contentType);
        setErro('O webhook não respondeu com dados válidos. Confere se a URL do n8n está no ar.');
        setCarregando(false);
        return;
      }

      const planilha = await respPlanilha.json();
      const nomeVendedor = respVendedor?.data?.nome || '';

      setDados({
        vendedor: nomeVendedor,
        nomeCompleto: buscarValor(planilha, 'nome completo', 'nome') || lead.nome || '',
        cpfCnpj: buscarValor(planilha, 'cpf/cnpj', 'cpf cnpj', 'cpf', 'cnpj'),
        dataNascimento: buscarValor(planilha, 'data de nascimento', 'data nascimento', 'nascimento'),
        nomeMae: buscarValor(planilha, 'nome da mae', 'mae'),
        cidade: buscarValor(planilha, 'cidade'),
        estado: buscarValor(planilha, 'estado'),
        endereco: buscarValor(planilha, 'endereco', 'end', 'logradouro'),
        cep: buscarValor(planilha, 'cep'),
        bairro: buscarValor(planilha, 'bairro'),
        hp: buscarValor(planilha, 'hp'),
        email: buscarValor(planilha, 'e-mail', 'email'),
        telefone: formatarTelefone(lead.telefone) || buscarValor(planilha, 'telefone'),
      });
    } catch (err) {
      console.error('Erro ao consultar cliente na planilha:', err);
      setErro('Não consegui consultar a planilha. Confere se o n8n/ngrok estão ativos.');
    } finally {
      setCarregando(false);
    }
  }

  function handleCopiar() {
    if (!dados) return;
    navigator.clipboard?.writeText(montarTextoCadastro({ ...dados, dataInstalacao }));
  }

  return (
    <div className="flex-1">
      <button
        ref={botaoRef}
        type="button"
        onClick={handleAbrir}
        className={`flex w-full items-center justify-center gap-1.5 rounded-lg border py-1.5 text-xs font-semibold transition-colors ${tema.botao}`}
      >
        <Info size={12} />
        Informações
      </button>

      {aberto && posicao && createPortal(
        <>
          {/* Camada invisível que fecha o popover ao clicar fora dele. */}
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div
            className={`fixed z-50 w-96 max-h-[80vh] overflow-y-auto rounded-xl border p-3 text-xs shadow-lg ${tema.dropdown}`}
            style={{ top: posicao.top, left: posicao.left }}
          >
            {carregando && <p className={tema.textoSecundario}>Consultando planilha...</p>}
            {!carregando && erro && <p className="text-red-500">{erro}</p>}
            {!carregando && !erro && dados && (
              <>
                <pre
                  className={`whitespace-pre-wrap break-words font-sans leading-relaxed ${tema.textoPrimario}`}
                >
                  {montarLinhasCadastro(dados).join('\n')}
                </pre>
                <div className="mt-1 flex items-center gap-1">
                  <span className={`shrink-0 ${tema.textoPrimario}`}>📌DATA DE INSTALAÇÃO:</span>
                  <input
                    type="text"
                    value={dataInstalacao}
                    onChange={(e) => setDataInstalacao(e.target.value)}
                    placeholder="digite olhando a conversa"
                    className={`min-w-0 flex-1 rounded-md border px-1.5 py-0.5 text-xs outline-none ${tema.input}`}
                  />
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
        </>,
        document.body
      )}
    </div>
  );
}

function CartaoLead({ lead, tema, onAbrir, onPegar, pegando, onFecharContrato, onExcluir }) {
  const statusKey = STATUS_POR_ID[lead.status_id];
  const cfg = statusKey ? STATUS_CONFIG[statusKey] : null;
  const podeFecharContrato = statusKey === 'verde' && onFecharContrato;

  return (
    <div
      className={`relative w-full rounded-xl border p-3.5 shadow-sm transition-all ${tema.cardItem}`}
    >
      {onExcluir && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExcluir(lead);
          }}
          title="Excluir cliente"
          aria-label="Excluir cliente"
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-red-500 opacity-70 transition-opacity hover:bg-red-500/10 hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      )}
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
// Classificador simples por palavra-chave — não é IA, é regra fixa.
// Propositalmente conservador: só marca "sim" ou "nao" quando a frase é
// bem direta. Qualquer coisa fora desse padrão vira "indefinido", pra
// nunca arriscar confundir uma recusa com confirmação.
function classificarRespostaAuditoria(texto) {
  const limpo = String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const PADROES_NAO = [
    // Palavras soltas
    /\bnao\b/, /\bnaum\b/, /\bnop\b/, /\bnegativo\b/, /\bimpossivel\b/,
    // Frases diretas de recusa
    /nao (posso|consigo|da|vou|tenho|vai dar|sei)/,
    /nao vou (poder|conseguir)/,
    /nao (tenho como|vai ser possivel|tenho condi[cç]oes|tenho disponibilidade)/,
    /sem condi[cç]oes/,
    /infelizmente/,
    /nao vai dar certo/,
  ];
  const PADROES_SIM = [
    // Palavras soltas
    /\bsim\b/, /\bpode\b/, /\bok\b/, /\bokay\b/, /\bbeleza\b/,
    /\bcerto\b/, /\bpositivo\b/, /\bclaro\b/, /\bconsigo\b/, /\bperfeito\b/,
    /\btranquilo\b/, /\bautorizad[oa]\b/, /\bconfirmo\b/,
    // Expressões de concordância
    /ta bom/, /esta bom/, /de boa/, /sem problemas?/,
    /com certeza/, /pode(m)? ligar/, /entrar em contato/,
    /esta autorizado/, /pode entrar em contato/,
  ];

  // "Não" tem prioridade: uma frase como "não, não posso" não pode cair em "sim"
  // só porque em algum lugar tem uma palavra parecida.
  if (PADROES_NAO.some((re) => re.test(limpo))) return 'nao';
  if (PADROES_SIM.some((re) => re.test(limpo))) return 'sim';
  return 'indefinido';
}

const MENSAGEM_PERGUNTA_AUDITORIA =
  'Oi! Passando pra avisar que a equipe técnica vai entrar em contato com você pra confirmar as informações e seguir com a instalação, tá bom? Fica de olho no telefone 🙂';

function CartaoContratoRoxo({ lead, contrato, tema, onExcluir }) {
  const c = contrato || {};
  const [enviandoAuditoria, setEnviandoAuditoria] = useState(false);
  const [erroAuditoria, setErroAuditoria] = useState(false);

  const perguntada = Boolean(c.auditoria_perguntada_em);
  const resposta = c.auditoria_resposta || null; // 'sim' | 'nao' | 'indefinido' | null

  async function handlePerguntarAuditoria() {
    if (enviandoAuditoria) return;

    if (!N8N_ENVIAR_MENSAGEM_URL) {
      setErroAuditoria(true);
      return;
    }

    setEnviandoAuditoria(true);
    setErroAuditoria(false);
    try {
      const resp = await fetch(N8N_ENVIAR_MENSAGEM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: lead.id,
          texto: MENSAGEM_PERGUNTA_AUDITORIA,
          vendedor: 'Auditoria',
        }),
      });
      const resultado = await resp.json();
      if (!resultado.sucesso) {
        setErroAuditoria(true);
      } else {
        // Marca quando a pergunta foi mandada e limpa qualquer resposta antiga
        // (caso esteja perguntando de novo). O botão reflete isso via realtime.
        await supabase
          .from('contrato')
          .update({ auditoria_perguntada_em: new Date().toISOString(), auditoria_resposta: null })
          .eq('cliente_id', lead.id);
      }
    } catch (err) {
      console.error('Erro ao perguntar sobre auditoria:', err);
      setErroAuditoria(true);
    } finally {
      setEnviandoAuditoria(false);
    }
  }

  // Enquanto a pergunta já foi mandada mas ainda sem resposta classificada,
  // escuta em tempo real a mensagem nova do cliente, classifica com regra
  // simples de palavra-chave (sim/não/indefinido) e grava o resultado.
  //
  // IMPORTANTE: a subscription de tempo real só existe enquanto ESTE card
  // está montado na tela de alguém. Se o cliente respondeu num momento em
  // que ninguém tinha o painel aberto nesse card específico, o evento passa
  // batido pra sempre — o realtime não entrega eventos passados. Por isso,
  // ao montar, primeiro fazemos uma busca única por mensagens do cliente
  // que já chegaram depois da pergunta ("recuperar o atraso") e só depois
  // passamos a escutar as futuras.
  useEffect(() => {
    if (!perguntada || resposta) return;
    let cancelado = false;

    async function classificarEGravar(texto) {
      if (cancelado) return;
      const classificacao = classificarRespostaAuditoria(texto);
      await supabase.from('contrato').update({ auditoria_resposta: classificacao }).eq('cliente_id', lead.id);
    }

    async function recuperarAtraso() {
      const { data, error } = await supabase
        .from('mensagens')
        .select('texto, origem, data')
        .eq('cliente_id', lead.id)
        .eq('origem', 'cliente')
        .gt('data', c.auditoria_perguntada_em)
        .order('data', { ascending: true })
        .limit(1);

      if (error) {
        console.error('Erro ao recuperar resposta de auditoria perdida:', error);
        return;
      }
      if (data && data.length > 0) {
        await classificarEGravar(data[0].texto);
      }
    }

    recuperarAtraso();

    const canal = supabase
      .channel(`auditoria-cliente-${lead.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `cliente_id=eq.${lead.id}` },
        async (payload) => {
          if (payload.new?.origem !== 'cliente') return;
          await classificarEGravar(payload.new?.texto);
        }
      )
      .subscribe();

    return () => {
      cancelado = true;
      supabase.removeChannel(canal);
    };
  }, [lead.id, perguntada, resposta, c.auditoria_perguntada_em]);

  return (
    <div className={`relative w-full rounded-xl border p-3.5 shadow-sm ${tema.cardItem}`}>
      {onExcluir && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExcluir(lead);
          }}
          title="Excluir cliente"
          aria-label="Excluir cliente"
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-red-500 opacity-70 transition-opacity hover:bg-red-500/10 hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      )}
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
        <LinhaInfo icone={MapPin} tema={tema} label="Estado" valor={c.estado} />
        <LinhaInfo icone={Phone} tema={tema} label="Telefone" valor={formatarTelefone(c.telefone_1 || lead.telefone)} />
        <LinhaInfo icone={Phone} tema={tema} label="Telefone 2" valor={c.telefone_2 ? formatarTelefone(c.telefone_2) : null} />
        <LinhaInfo icone={Router} tema={tema} label="HP" valor={c.hp} />
        <LinhaInfo icone={Calendar} tema={tema} label="Instalação" valor={formatarData(c.data_instalacao)} />
        <LinhaInfo icone={Calendar} tema={tema} label="Horário" valor={c.horario_instalacao} />

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

        {/* Só oferece o botão pros que ainda não foram auditados. */}
        {contrato && !c.auditado && (
          <button
            type="button"
            onClick={handlePerguntarAuditoria}
            disabled={enviandoAuditoria || resposta === 'sim'}
            className="mt-2 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-100"
            style={{
              background:
                resposta === 'sim'
                  ? '#8b5cf6' // roxo (mesma cor do pontinho de status Roxo), pra diferenciar de "aguardando"
                  : resposta === 'nao'
                  ? '#ef4444'
                  : resposta === 'indefinido'
                  ? '#d97706'
                  : '#10b981',
            }}
          >
            {resposta === 'sim' && <CheckCircle2 size={12} />}
            {resposta === 'nao' && <XCircle size={12} />}
            {resposta === 'indefinido' && <MessageCircle size={12} />}
            {!resposta && <MessageCircle size={12} />}
            {enviandoAuditoria
              ? 'Enviando...'
              : resposta === 'sim'
              ? 'Cliente confirmado'
              : resposta === 'nao'
              ? 'Cliente não pode'
              : resposta === 'indefinido'
              ? 'Resposta recebida — confere'
              : perguntada
              ? 'Pergunta enviada ✓'
              : 'Perguntar sobre auditoria'}
          </button>
        )}
        {erroAuditoria && (
          <p className="mt-1 text-xs text-red-500">Não consegui enviar. Confere o webhook de mensagem.</p>
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
  onExcluir,
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
                onExcluir={onExcluir}
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

function ItemSidebar({ icone: Icone, ativo, tema, label, onClick }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
        ativo ? tema.navIconAtivo : tema.navIconInativo
      }`}
    >
      <Icone size={18} />
    </button>
  );
}

function Sidebar({ tema, inicial, telaAtual, onMudarTela }) {
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
        <ItemSidebar
          icone={Home}
          ativo={telaAtual === 'painel'}
          tema={tema}
          label="Painel"
          onClick={() => onMudarTela('painel')}
        />
        <ItemSidebar
          icone={Wifi}
          ativo={telaAtual === 'viabilidade'}
          tema={tema}
          label="Viabilidade"
          onClick={() => onMudarTela('viabilidade')}
        />
        <ItemSidebar
          icone={Trophy}
          ativo={telaAtual === 'ranking'}
          tema={tema}
          label="Ranking de Vendedores"
          onClick={() => onMudarTela('ranking')}
        />
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
          <h3
            className="text-sm font-semibold"
            style={{ color: tema.escuro ? '#f1f5f9' : '#0f172a' }}
          >
            Novo lead
          </h3>
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
const OPCOES_HORARIO_INSTALACAO = ['08h às 12h', '12h às 15h', '15h às 18h', '12h às 18h'];

function CampoHorarioInstalacao({ tema, valor, onChange }) {
  return (
    <div className="mb-3">
      <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>
        Horário de instalação
      </label>
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
      >
        <option value="">Selecione...</option>
        {OPCOES_HORARIO_INSTALACAO.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>
    </div>
  );
}

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
  const [estado, setEstado] = useState('');
  const [nome, setNome] = useState(lead.nome || '');
  const [telefone1, setTelefone1] = useState(lead.telefone || '');
  const [telefone2, setTelefone2] = useState('');
  const [contrato, setContrato] = useState('');
  const [hp, setHp] = useState('');
  const [dataInstalacao, setDataInstalacao] = useState('');
  const [horarioInstalacao, setHorarioInstalacao] = useState('');
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

    // Guarda o status atual do cliente pra poder desfazer o passo 1 caso o
    // passo 2 falhe — sem isso, um erro no insert do contrato deixava o
    // cliente preso em Roxo sem nenhum dado (foi o que aconteceu com o
    // Guilherme: o F5 não apagou nada, só revelou que o contrato nunca
    // tinha sido gravado).
    const statusAnterior = lead.status_id;

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
      estado: estado.trim() || null,
      nome: nomeLimpo,
      telefone_1: telefone1Limpo,
      telefone_2: telefone2.replace(/\D/g, '') || null,
      contrato: contrato.trim() || null,
      hp: hp.trim() || null,
      data_instalacao: dataInstalacao || null,
      horario_instalacao: horarioInstalacao || null,
      auditado,
    });

    if (erroContrato) {
      console.error('Erro ao gravar contrato:', erroContrato);
      // Desfaz o passo 1: volta o cliente pro status de antes, em vez de
      // deixar ele preso em Roxo sem contrato nenhum.
      const { error: erroRollback } = await supabase
        .from('clientes')
        .update({ status_id: statusAnterior })
        .eq('id', lead.id);
      if (erroRollback) {
        console.error('Erro ao desfazer o status roxo após falha no contrato:', erroRollback);
        setErro(
          'Não consegui salvar os dados do contrato E também não consegui desfazer o status Roxo. ' +
          'Corrige manualmente: o cliente ficou Roxo sem contrato.'
        );
      } else {
        setErro('Não consegui salvar os dados do contrato. O cliente voltou pro status anterior — nada foi perdido.');
      }
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
            <h3
              className="text-sm font-semibold"
              style={{ color: tema.escuro ? '#f1f5f9' : '#0f172a' }}
            >
              Fechar contrato
            </h3>
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

        <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>Estado</label>
        <input
          type="text"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          placeholder="Ex: DF, GO, SP..."
          maxLength={2}
          className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm uppercase outline-none ${tema.input}`}
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

        <CampoHorarioInstalacao tema={tema} valor={horarioInstalacao} onChange={setHorarioInstalacao} />

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
  const [estado, setEstado] = useState('');
  const [nome, setNome] = useState('');
  const [telefone1, setTelefone1] = useState('');
  const [telefone2, setTelefone2] = useState('');
  const [contrato, setContrato] = useState('');
  const [hp, setHp] = useState('');
  const [dataInstalacao, setDataInstalacao] = useState('');
  const [horarioInstalacao, setHorarioInstalacao] = useState('');
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
      estado: estado.trim() || null,
      nome: nomeLimpo,
      telefone_1: telefone1Limpo,
      telefone_2: telefone2.replace(/\D/g, '') || null,
      contrato: contrato.trim() || null,
      hp: hp.trim() || null,
      data_instalacao: dataInstalacao || null,
      horario_instalacao: horarioInstalacao || null,
      auditado,
    });

    if (erroContrato) {
      console.error('Erro ao gravar contrato:', erroContrato);
      // Como o cliente acabou de ser criado nesta mesma ação, é seguro
      // apagar ele de volta em vez de deixar um cliente Roxo órfão sem
      // nenhum dado de contrato.
      const { error: erroRollback } = await supabase.from('clientes').delete().eq('id', clienteCriado.id);
      if (erroRollback) {
        console.error('Erro ao desfazer criação do cliente após falha no contrato:', erroRollback);
        setErro(
          'Não consegui salvar os dados do contrato E também não consegui desfazer a criação do cliente. ' +
          'Corrige manualmente: o cliente ficou Roxo sem contrato.'
        );
      } else {
        setErro('Não consegui salvar os dados do contrato. Nada foi criado — pode tentar de novo.');
      }
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
          <h3
            className="text-sm font-semibold"
            style={{ color: tema.escuro ? '#f1f5f9' : '#0f172a' }}
          >
            Novo contrato direto
          </h3>
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

        <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>Estado</label>
        <input
          type="text"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          placeholder="Ex: DF, GO, SP..."
          maxLength={2}
          className={`mb-3 w-full rounded-lg border px-3 py-2 text-sm uppercase outline-none ${tema.input}`}
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

        <CampoHorarioInstalacao tema={tema} valor={horarioInstalacao} onChange={setHorarioInstalacao} />

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

// Badge SIM/NÃO usado na tabela de Serviços disponíveis.
function BadgeSimNao({ valor }) {
  return valor ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-500">
      <CheckCircle2 size={12} />
      SIM
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-500">
      <XCircle size={12} />
      NÃO
    </span>
  );
}

// Incrementa o último número de uma string de endereço (ex: "BL 02 APT 204" ->
// "BL 02 APT 205"), mantendo o resto do texto igual. Usado só pra montar o
// endereço vizinho no bloco "Conectado mais próximo" da simulação.
function incrementarNumeroFinal(texto) {
  const match = texto.match(/(\d+)(\D*)$/);
  if (!match) return texto;
  const numeroIncrementado = String(Number(match[1]) + 1).padStart(match[1].length, '0');
  return texto.slice(0, match.index) + numeroIncrementado + match[2];
}

function TelaViabilidade({ tema }) {
  const [tipoServico, setTipoServico] = useState('COM CABO');
  const [estado, setEstado] = useState('DISTRITO FEDERAL');
  const [cidade, setCidade] = useState('BRASILIA');
  const [cep, setCep] = useState('');
  const [enderecoAlvo, setEnderecoAlvo] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState(null);

  async function handleConsultar(e) {
    e.preventDefault();
    if (!cep.trim() || !enderecoAlvo.trim()) {
      setErro('Preenche pelo menos o CEP e o endereço (ex: "BL 02 APT 204").');
      return;
    }

    setConsultando(true);
    setErro('');
    setResultado(null);

    // SIMULAÇÃO (temporária): enquanto o bot de Playwright não pode ser
    // testado contra o site da Claro, essa tela devolve um resultado
    // fixo no mesmo formato que o bot real retornaria — pra validar o
    // fluxo/layout sem depender de VIABILIDADE_URL. Pra voltar ao modo
    // real, é só trocar este bloco de volta pelo fetch(VIABILIDADE_URL).
    setTimeout(() => {
      const enderecoVizinho = incrementarNumeroFinal(enderecoAlvo.trim());
      setResultado({
        sucesso: true,
        enderecoSelecionado: `${cidade} / ${estado} — CEP ${cep.trim()} — ${enderecoAlvo.trim()}`,
        servicos: {
          PTVDIGITAL: { tecnico: true, comercial: true },
          VIRTUA: { tecnico: true, comercial: true },
          VOIP: { tecnico: true, comercial: false },
          GPON: { tecnico: true, comercial: true },
        },
        historicoContratos: {
          contagemPorSituacao: { CANCELADO: 3 },
          possuiConectado: false,
          possuiPendenteInstalacao: false,
        },
        conectadoProximo: {
          enderecoSelecionado: `${cidade} / ${estado} — CEP ${cep.trim()} — ${enderecoVizinho}`,
        },
      });
      setConsultando(false);
    }, 1200);
  }

  const situacoes = resultado?.historicoContratos?.contagemPorSituacao ?? {};
  const temSituacoes = Object.keys(situacoes).length > 0;

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="mx-auto flex max-w-3xl flex-col gap-5">
        <div>
          <h1
            className="text-lg font-bold"
            style={{ color: tema.escuro ? '#f1f5f9' : '#0f172a' }}
          >
            Viabilidade
          </h1>
          <p className={`text-xs ${tema.textoSecundario}`}>
            Consulta a disponibilidade de sinal e o histórico de contratos de um endereço.
          </p>
        </div>

        {/* Formulário de busca */}
        <form
          onSubmit={handleConsultar}
          className={`rounded-2xl border p-4 ${tema.card}`}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>
                Tipo de Serviço
              </label>
              <input
                type="text"
                value={tipoServico}
                onChange={(e) => setTipoServico(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
              />
            </div>
            <div>
              <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>Estado</label>
              <input
                type="text"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
              />
            </div>
            <div>
              <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>Cidade</label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
              />
            </div>
            <div>
              <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>CEP</label>
              <input
                type="text"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                placeholder="71881-807"
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
              />
            </div>
          </div>

          <div className="mt-3">
            <label className={`mb-1 block text-xs font-medium ${tema.textoSecundario}`}>
              Endereço do cliente (bloco/apê, o que identificar a linha certa)
            </label>
            <input
              type="text"
              value={enderecoAlvo}
              onChange={(e) => setEnderecoAlvo(e.target.value)}
              placeholder='Ex: "BL 02 APT 204"'
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${tema.input}`}
            />
          </div>

          {erro && <p className="mt-3 text-xs text-red-500">{erro}</p>}

          <button
            type="submit"
            disabled={consultando}
            className="mt-4 flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
            style={{ background: GRADIENTE_MARCA }}
          >
            <Wifi size={14} />
            {consultando ? 'Consultando... (pode levar até 1 min)' : 'Consultar Viabilidade'}
          </button>
        </form>

        {/* Resultado */}
        {resultado && (
          <>
            <div className={`rounded-2xl border p-4 ${tema.card}`}>
              <p className={`text-xs ${tema.textoSecundario}`}>Endereço selecionado</p>
              <p className={`text-sm font-medium ${tema.textoPrimario}`}>{resultado.enderecoSelecionado}</p>
            </div>

            <div className={`overflow-hidden rounded-2xl border ${tema.card}`}>
              <div className={`border-b px-4 py-3 ${tema.headerBorda}`}>
                <h2
                  className="text-sm font-semibold"
                  style={{ color: tema.escuro ? '#f1f5f9' : '#0f172a' }}
                >
                  Serviços disponíveis
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className={`text-left text-xs ${tema.textoSecundario}`}>
                    <th className="px-4 py-2 font-medium">Produto</th>
                    <th className="px-4 py-2 font-medium">Técnica</th>
                    <th className="px-4 py-2 font-medium">Comercial</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(resultado.servicos ?? {}).map(([produto, info]) => (
                    <tr key={produto} className={`border-t ${tema.headerBorda}`}>
                      <td className={`px-4 py-2.5 font-medium ${tema.textoPrimario}`}>{produto}</td>
                      <td className="px-4 py-2.5">
                        <BadgeSimNao valor={info.tecnico} />
                      </td>
                      <td className="px-4 py-2.5">
                        <BadgeSimNao valor={info.comercial} />
                      </td>
                    </tr>
                  ))}
                  {Object.keys(resultado.servicos ?? {}).length === 0 && (
                    <tr>
                      <td colSpan={3} className={`px-4 py-4 text-center text-xs ${tema.textoTerciario}`}>
                        Nenhum serviço encontrado nessa consulta.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={`overflow-hidden rounded-2xl border ${tema.card}`}>
              <div className={`border-b px-4 py-3 ${tema.headerBorda}`}>
                <h2
                  className="text-sm font-semibold"
                  style={{ color: tema.escuro ? '#f1f5f9' : '#0f172a' }}
                >
                  Histórico de contratos
                </h2>
              </div>
              <div className="flex flex-col gap-2 p-4">
                {resultado.historicoContratos?.possuiConectado && (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-500">
                    <CheckCircle2 size={13} />
                    Já existe contrato CONECTADO nesse endereço
                  </span>
                )}
                {resultado.historicoContratos?.possuiPendenteInstalacao && (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-500">
                    <Calendar size={13} />
                    Existe contrato PENDENTE DE INSTALAÇÃO
                  </span>
                )}
                {!temSituacoes && (
                  <p className={`text-xs ${tema.textoTerciario}`}>
                    Nenhum contrato encontrado no histórico desse endereço.
                  </p>
                )}
                {temSituacoes && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {Object.entries(situacoes).map(([situacao, qtd]) => (
                      <span
                        key={situacao}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${tema.badge}`}
                      >
                        {situacao} · {qtd}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {resultado.conectadoProximo && (
              <div className={`overflow-hidden rounded-2xl border ${tema.card}`}>
                <div className={`border-b px-4 py-3 ${tema.headerBorda}`}>
                  <h2
                    className="text-sm font-semibold"
                    style={{ color: tema.escuro ? '#f1f5f9' : '#0f172a' }}
                  >
                    Conectado mais próximo
                  </h2>
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <p className={`text-sm font-medium ${tema.textoPrimario}`}>
                    {resultado.conectadoProximo.enderecoSelecionado}
                  </p>
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-500">
                    <CheckCircle2 size={13} />
                    CONECTADO
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Card de KPI colorido do topo da tela de Ranking (Contratos Fechados /
// Conectados / Taxa de Conversão). Cor fixa (não muda com tema claro/escuro),
// igual ao mockup de referência.
function CardResumoRanking({ icone: Icone, valor, label, corDe, corPara }) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-white shadow-sm"
      style={{ background: `linear-gradient(135deg, ${corDe}, ${corPara})` }}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
        <Icone size={20} />
      </div>
      <div>
        <p className="text-xl font-bold leading-tight">{valor}</p>
        <p className="text-xs text-white/90">{label}</p>
      </div>
    </div>
  );
}

// Badge de posição no ranking: ouro/prata/bronze pros 3 primeiros, neutro
// pros demais — mesmo padrão visual do mockup de referência.
function BadgePosicao({ posicao }) {
  const estilos = {
    1: 'bg-amber-400 text-amber-950',
    2: 'bg-slate-300 text-slate-800',
    3: 'bg-orange-700 text-orange-50',
  };
  return (
    <span
      className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold ${
        estilos[posicao] ?? 'bg-slate-500/15 text-slate-500'
      }`}
    >
      {posicao}
    </span>
  );
}

function TelaRanking({ tema }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [ranking, setRanking] = useState([]);

  useEffect(() => {
    async function carregarRanking() {
      setCarregando(true);
      setErro('');

      // Todo contrato fechado (tabela "contrato") já tem o vendedor gravado
      // (vendedor_id + vendedor). Enquanto não existe status de
      // conectado/cancelado dentro de "contrato", cada linha aqui é 1
      // "contrato pendente" (definição combinada: todo contrato do vendedor).
      const { data: contratos, error: erroContratos } = await supabase
        .from('contrato')
        .select('vendedor_id, vendedor');

      if (erroContratos) {
        console.error('Erro ao buscar contratos para o ranking:', erroContratos);
        setErro('Não consegui carregar os contratos. Confere a policy de leitura (RLS) na tabela contrato.');
        setCarregando(false);
        return;
      }

      // Traz também os vendedores sem nenhum contrato ainda, pra aparecerem
      // zerados no ranking em vez de sumirem da lista.
      const { data: vendedores, error: erroVendedores } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('perfil', 'vendedor');

      if (erroVendedores) {
        console.error('Erro ao buscar vendedores para o ranking:', erroVendedores);
      }

      const porVendedor = {};

      (vendedores ?? []).forEach((v) => {
        porVendedor[v.id] = { vendedorId: v.id, nome: v.nome, contratosPendentes: 0 };
      });

      (contratos ?? []).forEach((c) => {
        const chave = c.vendedor_id ?? `nome:${c.vendedor ?? 'Sem vendedor'}`;
        if (!porVendedor[chave]) {
          porVendedor[chave] = {
            vendedorId: c.vendedor_id,
            nome: c.vendedor || 'Sem vendedor',
            contratosPendentes: 0,
          };
        }
        porVendedor[chave].contratosPendentes += 1;
      });

      const lista = Object.values(porVendedor).sort(
        (a, b) => b.contratosPendentes - a.contratosPendentes
      );

      setRanking(lista);
      setCarregando(false);
    }

    carregarRanking();

    // Tempo real: qualquer contrato novo/alterado/apagado recalcula o
    // ranking sozinho, sem precisar dar F5.
    const canal = supabase
      .channel('ranking-contrato-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contrato' }, () => {
        carregarRanking();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  const totalContratosFechados = ranking.reduce((soma, v) => soma + v.contratosPendentes, 0);

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <div>
          <h1
            className="text-lg font-bold"
            style={{ color: tema.escuro ? '#f1f5f9' : '#0f172a' }}
          >
            Ranking de Vendedores
          </h1>
          <p className={`text-xs ${tema.textoSecundario}`}>
            Desempenho geral e por vendedor, atualizado em tempo real.
          </p>
        </div>

        {/* Cards de resumo geral */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CardResumoRanking
            icone={Handshake}
            valor={totalContratosFechados}
            label="Contratos Fechados"
            corDe="#2563eb"
            corPara="#1d4ed8"
          />
          <CardResumoRanking
            icone={Zap}
            valor="— (em breve)"
            label="Conectados"
            corDe="#059669"
            corPara="#047857"
          />
          <CardResumoRanking
            icone={TrendingUp}
            valor="— (em breve)"
            label="Taxa de Conversão"
            corDe="#7c3aed"
            corPara="#6d28d9"
          />
        </div>

        {erro && <p className="text-xs text-red-500">{erro}</p>}

        {/* Pódio (top 3) */}
        {!carregando && ranking.length > 0 && (
          <div className={`rounded-2xl border p-5 ${tema.card}`}>
            <div className="flex items-end justify-center gap-4">
              {[1, 0, 2].map((indice) => {
                const v = ranking[indice];
                if (!v) return null;
                const posicao = indice + 1;
                const alturas = { 1: 'h-16', 0: 'h-24', 2: 'h-12' };
                return (
                  <div key={v.vendedorId ?? v.nome} className="flex flex-col items-center gap-1.5">
                    <Medal
                      size={18}
                      className={
                        posicao === 1
                          ? 'text-amber-400'
                          : posicao === 2
                          ? 'text-slate-300'
                          : 'text-orange-700'
                      }
                    />
                    <p className={`text-xs font-semibold ${tema.textoPrimario}`}>{v.nome}</p>
                    <p className={`text-[11px] ${tema.textoSecundario}`}>
                      {v.contratosPendentes} contrato{v.contratosPendentes === 1 ? '' : 's'}
                    </p>
                    <div
                      className={`flex w-20 items-center justify-center rounded-t-lg text-lg font-bold text-white ${alturas[indice]}`}
                      style={{
                        background:
                          posicao === 1
                            ? 'linear-gradient(135deg, #fbbf24, #d97706)'
                            : posicao === 2
                            ? 'linear-gradient(135deg, #cbd5e1, #94a3b8)'
                            : 'linear-gradient(135deg, #c2703d, #9a5227)',
                      }}
                    >
                      {posicao}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabela detalhada por vendedor */}
        <div className={`overflow-hidden rounded-2xl border ${tema.card}`}>
          <div className={`border-b px-4 py-3 ${tema.headerBorda}`}>
            <h2
              className="text-sm font-semibold"
              style={{ color: tema.escuro ? '#f1f5f9' : '#0f172a' }}
            >
              Detalhamento por vendedor
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className={`text-left text-xs ${tema.textoSecundario}`}>
                <th className="px-4 py-2 font-medium">Posição</th>
                <th className="px-4 py-2 font-medium">Vendedor</th>
                <th className="px-4 py-2 font-medium">Contratos Pendentes</th>
                <th className="px-4 py-2 font-medium">Cancelados</th>
                <th className="px-4 py-2 font-medium">Conectados</th>
                <th className="px-4 py-2 font-medium">Taxa Conversão</th>
              </tr>
            </thead>
            <tbody>
              {carregando && (
                <tr>
                  <td colSpan={6} className={`px-4 py-4 text-center text-xs ${tema.textoTerciario}`}>
                    Carregando ranking...
                  </td>
                </tr>
              )}
              {!carregando && ranking.length === 0 && (
                <tr>
                  <td colSpan={6} className={`px-4 py-4 text-center text-xs ${tema.textoTerciario}`}>
                    Nenhum contrato fechado ainda.
                  </td>
                </tr>
              )}
              {!carregando &&
                ranking.map((v, indice) => (
                  <tr key={v.vendedorId ?? v.nome} className={`border-t ${tema.headerBorda}`}>
                    <td className="px-4 py-2.5">
                      <BadgePosicao posicao={indice + 1} />
                    </td>
                    <td className={`px-4 py-2.5 font-medium ${tema.textoPrimario}`}>{v.nome}</td>
                    <td className={`px-4 py-2.5 ${tema.textoPrimario}`}>{v.contratosPendentes}</td>
                    <td className={`px-4 py-2.5 ${tema.textoTerciario}`}>—</td>
                    <td className={`px-4 py-2.5 ${tema.textoTerciario}`}>—</td>
                    <td className={`px-4 py-2.5 ${tema.textoTerciario}`}>—</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className={`text-[11px] ${tema.textoTerciario}`}>
          Cancelados, Conectados e Taxa de Conversão ainda não são rastreados — assim que o status
          "Conectado" for aplicado na tabela <code>contrato</code>, esses números passam a ser
          calculados automaticamente.
        </p>
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
  const [menuAberto, setMenuAberto] = useState(false);
  const [notifAberta, setNotifAberta] = useState(false);
  const [modalNovoLead, setModalNovoLead] = useState(false);
  const [leadFechandoContrato, setLeadFechandoContrato] = useState(null);
  const [modalNovoContrato, setModalNovoContrato] = useState(false);
  const [buscaClientes, setBuscaClientes] = useState('');
  const [filtroRoxo, setFiltroRoxo] = useState('meus'); // 'meus' | 'todos' — só usado por vendedor
  const [contratosPorCliente, setContratosPorCliente] = useState({});
  const [telaAtual, setTelaAtual] = useState('painel'); // 'painel' | 'viabilidade' | 'ranking'
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
        .select('cliente_id, nome, contrato, cidade, estado, telefone_1, telefone_2, hp, data_instalacao, horario_instalacao, auditado, auditoria_perguntada_em, auditoria_confirmada, auditoria_resposta');

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

  // Exclui um cliente e tudo que depende dele. A ORDEM importa: se apagar
  // "clientes" primeiro, as tabelas que têm cliente_id como chave estrangeira
  // (contrato, mensagens) travam o DELETE com erro de foreign key — foi
  // exatamente isso que bloqueou os comandos SQL rodados manualmente.
  // A lista atualiza sozinha por causa do realtime (não precisa dar F5).
  async function handleExcluirCliente(lead) {
    const nomeExibido = lead.nome || 'este cliente';
    const confirmou = window.confirm(
      `Excluir "${nomeExibido}" (${formatarTelefone(lead.telefone)})? Isso apaga o cliente, o contrato e as mensagens dele. Não dá pra desfazer.`
    );
    if (!confirmou) return;

    const { error: erroContrato } = await supabase.from('contrato').delete().eq('cliente_id', lead.id);
    if (erroContrato) {
      console.error('Erro ao excluir contrato:', erroContrato);
      alert('Não consegui apagar o contrato desse cliente. Confere a policy de DELETE na tabela "contrato".');
      return;
    }

    const { error: erroMensagens } = await supabase.from('mensagens').delete().eq('cliente_id', lead.id);
    if (erroMensagens) {
      console.error('Erro ao excluir mensagens:', erroMensagens);
      alert('Não consegui apagar as mensagens desse cliente. Confere a policy de DELETE na tabela "mensagens".');
      return;
    }

    const { error: erroCliente } = await supabase.from('clientes').delete().eq('id', lead.id);
    if (erroCliente) {
      console.error('Erro ao excluir cliente:', erroCliente);
      alert('Não consegui apagar o cliente. Confere a policy de DELETE na tabela "clientes" (e se sobrou algo referenciando o id dele).');
    }
    // Histórico de conversa do bot (n8n_chat_histories) fica de fora de propósito:
    // é tabela interna do n8n, o painel não deveria depender de mexer nela.
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
      <Sidebar tema={tema} inicial={inicial} telaAtual={telaAtual} onMudarTela={setTelaAtual} />

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

        {telaAtual === 'painel' && erroCarregamento && (
          <div className="mx-5 mt-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
            {erroCarregamento}
          </div>
        )}

        {telaAtual === 'viabilidade' && <TelaViabilidade tema={tema} />}

        {telaAtual === 'ranking' && <TelaRanking tema={tema} />}

        {telaAtual === 'painel' && (
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
                  onExcluir={handleExcluirCliente}
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
                  onExcluir={handleExcluirCliente}
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
                  onExcluir={handleExcluirCliente}
                accent={STATUS_CONFIG.branco.accent}
              />
              <BlocoStatus
                titulo="Vermelho"
                leads={porStatus('vermelho')}
                tema={tema}
                onAbrirLead={setLeadAberto}
                  onExcluir={handleExcluirCliente}
                accent={STATUS_CONFIG.vermelho.accent}
              />
              <BlocoStatus
                titulo="Verde"
                leads={porStatus('verde')}
                tema={tema}
                onAbrirLead={setLeadAberto}
                  onExcluir={handleExcluirCliente}
                onFecharContrato={setLeadFechandoContrato}
                accent={STATUS_CONFIG.verde.accent}
              />
              <BlocoStatus
                titulo="Roxo"
                leads={roxosVisiveis}
                tema={tema}
                onAbrirLead={setLeadAberto}
                  onExcluir={handleExcluirCliente}
                accent={STATUS_CONFIG.roxo.accent}
                renderCard={(lead) => (
                  <CartaoContratoRoxo
                    key={lead.id}
                    lead={lead}
                    contrato={contratosPorCliente[lead.id]}
                    tema={tema}
                    onExcluir={handleExcluirCliente}
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
        )}
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