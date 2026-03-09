import { useState } from "react";
import { Plus, Search, Send, RefreshCw, ExternalLink, Loader2, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listDocuments, createDocument, type ZapSignDocument, type ZapSignSigner } from "@/lib/zapsign";
import { toast } from "sonner";
import TemplateContractForm from "@/components/TemplateContractForm";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-warning/15 text-warning" },
  signed: { label: "Assinado", className: "bg-success/15 text-success" },
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  canceled: { label: "Cancelado", className: "bg-destructive/15 text-destructive" },
  expired: { label: "Expirado", className: "bg-destructive/15 text-destructive" },
  refusal: { label: "Recusado", className: "bg-destructive/15 text-destructive" },
};

const getStatus = (status: string) =>
  statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };

const ContractsPanel = () => {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    url_pdf: "",
    signer_name: "",
    signer_email: "",
    signer_phone: "",
  });
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["zapsign-docs"],
    queryFn: () => listDocuments(1),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const signers: ZapSignSigner[] = [
        {
          name: formData.signer_name,
          ...(formData.signer_email ? { email: formData.signer_email } : {}),
          ...(formData.signer_phone ? { phone_country: "55", phone_number: formData.signer_phone } : {}),
        },
      ];
      return createDocument({
        name: formData.name,
        signers,
        url_pdf: formData.url_pdf || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Contrato criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["zapsign-docs"] });
      setShowForm(false);
      setFormData({ name: "", url_pdf: "", signer_name: "", signer_email: "", signer_phone: "" });
    },
    onError: (err: Error) => {
      toast.error("Erro ao criar contrato: " + err.message);
    },
  });

  const docs = data?.results || [];
  const filtered = docs.filter((d: ZapSignDocument) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  if (showTemplates) {
    return <TemplateContractForm onClose={() => setShowTemplates(false)} />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display font-semibold">Contratos</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">ZapSign</span>
            <button onClick={() => refetch()} className="text-muted-foreground hover:text-foreground">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contrato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-secondary border-border"
            />
          </div>
          <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => setShowTemplates(true)}>
            <FileText className="w-4 h-4" />
            Modelos
          </Button>
          <Button size="sm" className="h-9 gap-1.5" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? "Fechar" : "Novo"}
          </Button>
        </div>
      </div>

      {/* Form para novo contrato */}
      {showForm && (
        <div className="p-3 border-b border-border space-y-2">
          <Input
            placeholder="Nome do contrato *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="h-8 text-sm bg-secondary border-border"
          />
          <Input
            placeholder="URL do PDF (opcional)"
            value={formData.url_pdf}
            onChange={(e) => setFormData({ ...formData, url_pdf: e.target.value })}
            className="h-8 text-sm bg-secondary border-border"
          />
          <div className="pt-1">
            <p className="text-[11px] text-muted-foreground mb-1.5">Signatário</p>
            <Input
              placeholder="Nome do signatário *"
              value={formData.signer_name}
              onChange={(e) => setFormData({ ...formData, signer_name: e.target.value })}
              className="h-8 text-sm bg-secondary border-border mb-1.5"
            />
            <div className="flex gap-1.5">
              <Input
                placeholder="Email"
                value={formData.signer_email}
                onChange={(e) => setFormData({ ...formData, signer_email: e.target.value })}
                className="h-8 text-sm bg-secondary border-border"
              />
              <Input
                placeholder="Telefone"
                value={formData.signer_phone}
                onChange={(e) => setFormData({ ...formData, signer_phone: e.target.value })}
                className="h-8 text-sm bg-secondary border-border"
              />
            </div>
          </div>
          <Button
            size="sm"
            className="w-full gap-1.5 mt-1"
            onClick={() => createMutation.mutate()}
            disabled={!formData.name || !formData.signer_name || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Criar contrato
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="text-center py-6 px-3">
            <p className="text-sm text-destructive mb-2">Erro ao carregar contratos</p>
            <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Nenhum contrato encontrado</p>
          </div>
        )}

        {filtered.map((doc: ZapSignDocument) => {
          const status = getStatus(doc.status);
          const signerUrl = doc.signers?.[0]?.sign_url;
          return (
            <div
              key={doc.token}
              className="w-full text-left p-3 rounded-lg hover:bg-secondary/80 transition-colors group mb-1"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${status.className}`}>
                      {status.label}
                    </span>
                    {doc.created_at && (
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>
                {signerUrl && (
                  <a
                    href={signerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-accent transition-colors mt-0.5"
                    title="Abrir link de assinatura"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {data && (
        <div className="px-3 py-2 border-t border-border">
          <p className="text-[11px] text-muted-foreground text-center">
            {data.count} contrato(s) no total
          </p>
        </div>
      )}
    </div>
  );
};

export default ContractsPanel;
