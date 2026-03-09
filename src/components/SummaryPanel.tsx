import { useState } from "react";
import { Sparkles, Copy, Check, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

const mockMessages = [
  { role: "client", text: "Boa tarde, doutor. Preciso saber como está o andamento do meu processo." },
  { role: "lawyer", text: "Boa tarde, João! Seu processo está na fase de instrução. A audiência está marcada para dia 15/03." },
  { role: "client", text: "Preciso levar algum documento?" },
  { role: "lawyer", text: "Sim, leve RG, CPF e comprovante de residência atualizado." },
  { role: "client", text: "E quanto aos honorários, já venceu a parcela?" },
  { role: "lawyer", text: "A próxima parcela vence dia 10/03. Vou te enviar o boleto." },
];

const SummaryPanel = () => {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateSummary = () => {
    setLoading(true);
    setTimeout(() => {
      setSummary(
        "📋 **Resumo da conversa:**\n\n• Cliente João consultou andamento processual\n• Processo em fase de instrução — audiência em 15/03\n• Documentos necessários: RG, CPF, comprovante de residência\n• Parcela de honorários vence em 10/03 — enviar boleto\n\n**Ações pendentes:** Enviar boleto ao cliente"
      );
      setLoading(false);
    }, 1500);
  };

  const copyToClipboard = () => {
    if (summary) {
      navigator.clipboard.writeText(summary.replace(/\*\*/g, "").replace(/📋 /g, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display font-semibold">Resumo</h2>
          <span className="text-xs text-muted-foreground">IA</span>
        </div>
        <Button
          size="sm"
          className="w-full gap-2"
          onClick={generateSummary}
          disabled={loading}
        >
          <Sparkles className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Gerando resumo..." : "Gerar resumo da conversa"}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* Preview da conversa */}
        <div className="mb-4">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1 mb-2">
            Conversa atual
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {mockMessages.map((msg, i) => (
              <div
                key={i}
                className={`text-xs p-2 rounded-lg ${
                  msg.role === "client"
                    ? "bg-secondary ml-0 mr-8"
                    : "bg-accent/10 ml-8 mr-0"
                }`}
              >
                <span className="text-[10px] text-muted-foreground block mb-0.5">
                  {msg.role === "client" ? "Cliente" : "Advogado"}
                </span>
                {msg.text}
              </div>
            ))}
          </div>
        </div>

        {/* Resumo gerado */}
        {summary && (
          <div className="border border-primary/20 rounded-lg p-3 bg-primary/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-primary uppercase tracking-wider">
                Resumo gerado
              </span>
              <button
                onClick={copyToClipboard}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-line">
              {summary.replace(/\*\*/g, "")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryPanel;
