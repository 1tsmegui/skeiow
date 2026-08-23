import { useState } from "react";
import { Users, Eye, EyeOff, Phone, UserCircle2, Sun, Moon, LogOut } from "lucide-react";

// Dados de exemplo — troque pela consulta real ao Supabase (tabela "clientes").
const LEADS_INICIAIS = [
  { id: 1, nome: "Ana Beatriz Souza", telefone: "61991234567", status: "branco", vendedor: null },
  { id: 2, nome: "Carlos Eduardo Lima", telefone: "61992345678", status: "branco", vendedor: null },
  { id: 3, nome: "Fernanda Ribeiro", telefone: "61993456789", status: "vermelho", vendedor: null },
  { id: 4, nome: "Rafael Nogueira", telefone: "61994567890", status: "vermelho", vendedor: null },
  { id: 5, nome: "Juliana Martins", telefone: "61995678901", status: "verde", vendedor: "Bruno Vendedor" },
  { id: 6, nome: "Thiago Almeida", telefone: "61996789012", status: "verde", vendedor: "Camila Vendedora" },
  { id: 7, nome: "Patrícia Gomes", telefone: "61997890123", status: "roxo", vendedor: "Bruno Vendedor" },
];

const STATUS_CONFIG = {
  branco: { titulo: "Branco", descricao: "Aguardando validação", corDot: "bg-white border-2 border-slate-400" },
  vermelho: { titulo: "Vermelho", descricao: "Intervenção humana", corDot: "bg-red-500" },
  verde: { titulo: "Verde", descricao: "Validados e sorteados para vendedores", corDot: "bg-emerald-500" },
  roxo: { titulo: "Roxo", descricao: "Clientes que viraram contrato", corDot: "bg-violet-500" },
};

// Tokens de cor pros dois temas. Nada de Tailwind dark: aqui — é tudo controlado
// pelo estado "escuro", então funciona independente de como o tailwind.config está.
function useTema(escuro) {
  return escuro
    ? {
        pagina: "#0a0a14",
        card: "bg-white/[0.02] border-white/10",
        cardItem: "bg-white/[0.03] border-white/10",
        headerBorda: "border-white/10",
        textoPrimario: "text-slate-100",
        textoSecundario: "text-slate-400",
        textoTerciario: "text-slate-500",
        badge: "bg-white/10 text-slate-300",
        botao: "border-white/10 text-slate-300 hover:bg-white/5",
      }
    : {
        pagina: "#f8fafc",
        card: "bg-white border-slate-200",
        cardItem: "bg-white border-slate-200",
        headerBorda: "border-slate-200",
        textoPrimario: "text-slate-800",
        textoSecundario: "text-slate-500",
        textoTerciario: "text-slate-400",
        badge: "bg-slate-100 text-slate-600",
        botao: "border-slate-300 text-slate-600 hover:bg-slate-50",
      };
}

function formatarTelefone(telefone) {
  const d = telefone.replace(/\D/g, "");
  if (d.length !== 11) return telefone;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function CartaoLead({ lead, tema }) {
  const cfg = STATUS_CONFIG[lead.status];
  return (
    <div className={`rounded-lg border p-3 ${tema.cardItem}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cfg.corDot}`} />
        <p className={`truncate text-sm font-medium ${tema.textoPrimario}`}>{lead.nome}</p>
      </div>
      <div className={`mt-1.5 flex items-center gap-1.5 text-xs ${tema.textoSecundario}`}>
        <Phone size={12} />
        <span className="font-mono tabular-nums">{formatarTelefone(lead.telefone)}</span>
      </div>
      {lead.vendedor && (
        <div className={`mt-1.5 flex items-center gap-1.5 text-xs ${tema.textoSecundario}`}>
          <UserCircle2 size={12} />
          <span>{lead.vendedor}</span>
        </div>
      )}
    </div>
  );
}

function BlocoStatus({ titulo, leads, tema, children, headerExtra }) {
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
      <div className="flex flex-col gap-2 overflow-y-auto p-3" style={{ maxHeight: "560px" }}>
        {leads.length === 0 ? (
          <p className={`py-6 text-center text-xs ${tema.textoTerciario}`}>Nenhum lead nesse status.</p>
        ) : (
          leads.map((lead) => <CartaoLead key={lead.id} lead={lead} tema={tema} />)
        )}
      </div>
    </div>
  );
}

// papel: reservado pra quando entrarmos com a visão do vendedor. Por ora só "supervisor" é usado.
export default function PainelCRM({ onSair }) {
  const [escuro, setEscuro] = useState(false);
  const [mostrarLegenda, setMostrarLegenda] = useState(false);
  const [leads] = useState(LEADS_INICIAIS);
  const tema = useTema(escuro);

  const porStatus = (status) => leads.filter((l) => l.status === status);

  return (
    <div className="min-h-screen transition-colors" style={{ background: tema.pagina }}>
      <div className={`flex items-center justify-between border-b px-5 py-4 ${tema.headerBorda}`}>
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #ec4899, #a855f7)" }}
          >
            S
          </div>
          <div>
            <p className={`text-sm font-semibold ${tema.textoPrimario}`}>Painel do supervisor</p>
            <p className={`text-xs ${tema.textoSecundario}`}>Todos os leads em tempo real</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEscuro((v) => !v)}
            aria-label={escuro ? "Ativar tema claro" : "Ativar tema escuro"}
            className={`flex h-8 w-8 items-center justify-center rounded-md border ${tema.botao}`}
          >
            {escuro ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          {onSair && (
            <button
              type="button"
              onClick={onSair}
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium ${tema.botao}`}
            >
              <LogOut size={12} />
              Sair
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto p-4">
        <div className="flex min-w-[1100px] gap-4">
          <BlocoStatus
            titulo="Todos os Contatos"
            leads={leads}
            tema={tema}
            headerExtra={
              <button
                type="button"
                onClick={() => setMostrarLegenda((v) => !v)}
                className={`flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${tema.botao}`}
              >
                {mostrarLegenda ? <EyeOff size={12} /> : <Eye size={12} />}
                {mostrarLegenda ? "Ocultar" : "Legenda"}
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

          <BlocoStatus titulo="Branco" leads={porStatus("branco")} tema={tema} />
          <BlocoStatus titulo="Vermelho" leads={porStatus("vermelho")} tema={tema} />
          <BlocoStatus titulo="Verde" leads={porStatus("verde")} tema={tema} />
          <BlocoStatus titulo="Roxo" leads={porStatus("roxo")} tema={tema} />
        </div>
      </div>
    </div>
  );
}
