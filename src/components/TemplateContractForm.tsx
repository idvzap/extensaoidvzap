import { useState, useCallback } from "react";
import { ArrowLeft, Send, Loader2, FileText, ChevronRight, Search, UserPlus, X, Building2, MessageCircle, StickyNote, Clock, Check, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listTemplates,
  getTemplate,
  createFromTemplate,
  type ZapSignTemplate,
  type ZapSignTemplateInput,
  type ZapSignSigner,
} from "@/lib/zapsign";
import { listContacts, getContactExtraInfo, listTickets, listNotes, extractNoteData, type IdvZapContact, type IdvZapTicket } from "@/lib/idvzap";
import { listCustomers, type AdvboxCustomer } from "@/lib/advbox";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

type Step = "select" | "fill";
type DataSource = "idvzap" | "advbox" | null;

/** Map variable names to IDVZap contact fields + extracted note data */
function autoFillFromIdvZap(
  inputs: ZapSignTemplateInput[],
  contact: IdvZapContact,
  extraInfo: { name: string; value: string }[],
  noteData: Record<string, string> = {}
): Record<string, string> {
  const vars: Record<string, string> = {};
  const extraMap = new Map(extraInfo.map((e) => [e.name.toLowerCase().trim(), e.value]));

  // Build a lowercase map of note extracted data for flexible matching
  const noteMap = new Map(
    Object.entries(noteData).map(([k, v]) => [k.toLowerCase().replace(/[_\s]/g, "").trim(), v])
  );

  for (const input of inputs) {
    const key = input.variable;
    const label = (input.label || key).toLowerCase().replace(/[{}]/g, "").trim();
    const labelNorm = label.replace(/[_\s]/g, "");

    if (label.includes("nome") || label.includes("name") || label.includes("fullname")) {
      vars[key] = noteData.nome || contact.name || contact.pushname || "";
    } else if (label === "cpf") {
      vars[key] = noteData.cpf || contact.cpf || extraMap.get("cpf") || "";
    } else if (label.includes("email")) {
      vars[key] = noteData.email || contact.email || "";
    } else if (label.includes("telefone") || label.includes("phone") || label.includes("celular")) {
      vars[key] = noteData.celular || noteData.telefone || contact.number || "";
    } else if (label.includes("cidade") || label.includes("city")) {
      vars[key] = noteData.cidade || "";
    } else if (label.includes("estado") && !label.includes("civil")) {
      vars[key] = noteData.estado || noteData.uf || "";
    } else if (label.includes("estado civil") || label.includes("estadocivil")) {
      vars[key] = noteData.estado_civil || noteData.estadocivil || "";
    } else if (label.includes("endereco") || label.includes("endereço") || label.includes("rua") || label.includes("street")) {
      vars[key] = noteData.endereco || "";
    } else if (label.includes("bairro") || label.includes("region")) {
      vars[key] = noteData.bairro || "";
    } else if (label.includes("cep") || label.includes("postalcode")) {
      vars[key] = noteData.cep || "";
    } else if (label.includes("profiss") || label.includes("occupation")) {
      vars[key] = noteData.profissao || "";
    } else if (label.includes("nascimento") || label.includes("birthdate")) {
      vars[key] = noteData.nascimento || "";
    } else if (label.includes("naturalidade")) {
      vars[key] = noteData.naturalidade || "";
    } else if (label.includes("rg") || label.includes("documento")) {
      vars[key] = noteData.rg || "";
    } else if (label.includes("sexo") || label.includes("genero") || label.includes("gênero")) {
      vars[key] = noteData.sexo || "";
    } else if (label.includes("nacionalidade")) {
      vars[key] = noteData.nacionalidade || "";
    } else if (label.includes("mae") || label.includes("mãe")) {
      vars[key] = noteData.mae || "";
    } else if (label.includes("pai")) {
      vars[key] = noteData.pai || "";
    } else {
      // Try matching by normalized label in note data, then extra info
      vars[key] = noteMap.get(labelNorm) || extraMap.get(label) || extraMap.get(input.variable.replace(/\{\{|\}\}/g, "").trim().toLowerCase()) || "";
    }
  }
  return vars;
}

/** Map variable names to ADVBOX customer fields */
function autoFillFromAdvbox(
  inputs: ZapSignTemplateInput[],
  customer: AdvboxCustomer
): Record<string, string> {
  const vars: Record<string, string> = {};
  const fieldMap: Record<string, string> = {
    nome: customer.name || "",
    name: customer.name || "",
    fullname: customer.name || "",
    cpf: customer.identification || "",
    "cpf/cnpj": customer.identification || "",
    identification: customer.identification || "",
    rg: customer.document || "",
    documento: customer.document || "",
    email: customer.email || "",
    "e-mail": customer.email || "",
    telefone: customer.cellphone || customer.phone || "",
    celular: customer.cellphone || "",
    phone: customer.cellphone || customer.phone || "",
    "endereço completo": customer.street || "",
    endereco: customer.street || "",
    "endereço": customer.street || "",
    rua: customer.street || "",
    street: customer.street || "",
    cep: customer.postalcode || "",
    postalcode: customer.postalcode || "",
    bairro: customer.region || "",
    região: customer.region || "",
    region: customer.region || "",
    cidade: customer.city || "",
    city: customer.city || "",
    estado: customer.state || "",
    state: customer.state || "",
    uf: customer.state || "",
    país: customer.country || "",
    country: customer.country || "",
    profissão: customer.occupation || "",
    profissao: customer.occupation || "",
    "profissaocliente": customer.occupation || "",
    occupation: customer.occupation || "",
    naturalidade: customer.city ? `${customer.city}/${customer.state || ""}`.replace(/\/$/, "") : "",
    nascimento: customer.birthdate || "",
    "data nascimento": customer.birthdate || "",
    "data completa": new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
    "estado civil": customer.civil_status || "",
    sexo: customer.gender || "",
  };

  for (const input of inputs) {
    const key = input.variable;
    const label = (input.label || key).toLowerCase().replace(/[{}]/g, "").trim();
    vars[key] = fieldMap[label] || "";
  }
  return vars;
}

const TemplateContractForm = ({ onClose }: { onClose: () => void }) => {
  const [step, setStep] = useState<Step>("select");
  const [selectedTemplate, setSelectedTemplate] = useState<ZapSignTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signerPhone, setSignerPhone] = useState("");
  const [dataSource, setDataSource] = useState<DataSource>(null);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContactLabel, setSelectedContactLabel] = useState("");
  const [pendingContact, setPendingContact] = useState<{ contact: IdvZapContact; extraInfo: { name: string; value: string }[] } | null>(null);
  const [contactTickets, setContactTickets] = useState<IdvZapTicket[]>([]);
  const [showTicketPicker, setShowTicketPicker] = useState(false);
  const [extractingNotes, setExtractingNotes] = useState(false);
  const [previewData, setPreviewData] = useState<{ vars: Record<string, string>; contact: IdvZapContact; noteData: Record<string, string> } | null>(null);
  const [editingPreview, setEditingPreview] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ["zapsign-templates"],
    queryFn: () => listTemplates(1),
  });

  const { data: templateDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["zapsign-template", selectedTemplate?.token],
    queryFn: () => getTemplate(selectedTemplate!.token),
    enabled: !!selectedTemplate?.token && step === "fill",
  });

  // Sync template detail and initialize variables
  if (templateDetail && templateDetail.token === selectedTemplate?.token && templateDetail.inputs && Object.keys(variables).length === 0 && !selectedContactLabel) {
    const vars: Record<string, string> = {};
    templateDetail.inputs.forEach((input: ZapSignTemplateInput) => {
      vars[input.variable] = "";
    });
    setVariables(vars);
    setSelectedTemplate(templateDetail);
  }

  // IDVZap contacts search
  const { data: idvzapData, isLoading: loadingIdvzap } = useQuery({
    queryKey: ["idvzap-contacts", contactSearch],
    queryFn: () => listContacts({ searchParam: contactSearch || undefined, pageNumber: 1 }),
    enabled: dataSource === "idvzap",
  });

  // ADVBOX customers search
  const { data: advboxData, isLoading: loadingAdvbox } = useQuery({
    queryKey: ["advbox-customers", contactSearch],
    queryFn: () => listCustomers({ name: contactSearch || undefined, limit: 20, offset: 0 }),
    enabled: dataSource === "advbox",
  });

  const handleSelectIdvZapContact = useCallback(async (contact: IdvZapContact) => {
    setSignerName(contact.name || contact.pushname || "");
    setSignerEmail(contact.email || "");
    setSignerPhone(contact.number || "");
    setDataSource(null);

    let extraInfo: { name: string; value: string }[] = [];
    try {
      const extra = await getContactExtraInfo(contact.id);
      extraInfo = extra.extraInfo || [];
    } catch { /* optional */ }

    // Find tickets for this contact
    try {
      setSelectedContactLabel(`${contact.name || contact.pushname || "Contato"} (buscando tickets...)`);
      const [openRes, closedRes, pendingRes] = await Promise.all([
        listTickets({ searchParam: contact.name || contact.pushname || contact.number, pageNumber: 1, status: "open" }).catch(() => ({ tickets: [] })),
        listTickets({ searchParam: contact.name || contact.pushname || contact.number, pageNumber: 1, status: "closed" }).catch(() => ({ tickets: [] })),
        listTickets({ searchParam: contact.name || contact.pushname || contact.number, pageNumber: 1, status: "pending" }).catch(() => ({ tickets: [] })),
      ]);
      const ticketsRes = { tickets: [...(openRes.tickets || []), ...(closedRes.tickets || []), ...(pendingRes.tickets || [])] };
      const tickets = ticketsRes.tickets?.filter((t) => t.contactId === contact.id) || [];

      if (tickets.length > 1) {
        // Multiple tickets — let user choose
        setPendingContact({ contact, extraInfo });
        setContactTickets(tickets);
        setShowTicketPicker(true);
        setSelectedContactLabel(contact.name || contact.pushname || "Contato");
        return;
      }

      if (tickets.length === 1) {
        // Single ticket — extract automatically
        await extractFromTicket(tickets[0].id, contact, extraInfo);
        return;
      }
    } catch (err) {
      console.warn("Não foi possível buscar tickets:", err);
    }

    // No tickets found — fill with basic contact + extraInfo only
    const tpl = templateDetail || selectedTemplate;
    if (tpl?.inputs) {
      setVariables(autoFillFromIdvZap(tpl.inputs, contact, extraInfo));
    }
    setSelectedContactLabel(contact.name || contact.pushname || "Contato");
    toast.success(`Dados de "${contact.name || contact.pushname}" carregados (sem notas encontradas)`);
  }, [templateDetail, selectedTemplate]);

  const extractFromTicket = useCallback(async (
    ticketId: number,
    contact: IdvZapContact,
    extraInfo: { name: string; value: string }[]
  ) => {
    setExtractingNotes(true);
    setSelectedContactLabel(`${contact.name || contact.pushname || "Contato"} (extraindo notas...)`);

    let noteData: Record<string, string> = {};
    try {
      const notesRes = await listNotes(ticketId);
      if (notesRes.notes?.length > 0) {
        const allNotes = notesRes.notes.map((n) => n.notes).join("\n\n");
        const tpl = templateDetail || selectedTemplate;
        const variableLabels = tpl?.inputs?.map((i) => (i.label || i.variable).replace(/\{\{|\}\}/g, "").trim()) || [];
        noteData = await extractNoteData(allNotes, variableLabels);
        toast.info("Dados extraídos das notas do atendimento");
      }
    } catch (err) {
      console.warn("Não foi possível extrair dados das notas:", err);
    }

    const tpl = templateDetail || selectedTemplate;
    let vars: Record<string, string> = {};
    if (tpl?.inputs) {
      vars = autoFillFromIdvZap(tpl.inputs, contact, extraInfo, noteData);
    }

    // Show preview instead of directly filling
    setPreviewData({ vars, contact, noteData });
    setEditingPreview({ ...vars });
    setSelectedContactLabel(contact.name || contact.pushname || "Contato");
    setShowTicketPicker(false);
    setPendingContact(null);
    setContactTickets([]);
    setExtractingNotes(false);
  }, [templateDetail, selectedTemplate]);

  const handleConfirmPreview = useCallback(() => {
    if (!previewData) return;
    setVariables(editingPreview);
    if (editingPreview[Object.keys(editingPreview).find(k => {
      const tpl = templateDetail || selectedTemplate;
      const input = tpl?.inputs?.find(i => i.variable === k);
      const label = (input?.label || k).toLowerCase();
      return label.includes("nome") || label.includes("name");
    }) || ""] || previewData.noteData.nome) {
      const nameKey = Object.keys(editingPreview).find(k => {
        const tpl = templateDetail || selectedTemplate;
        const input = tpl?.inputs?.find(i => i.variable === k);
        const label = (input?.label || k).toLowerCase();
        return label.includes("nome") || label.includes("name");
      });
      if (nameKey && editingPreview[nameKey]) setSignerName(editingPreview[nameKey]);
    }
    setPreviewData(null);
    setEditingPreview({});
    toast.success("Dados confirmados e preenchidos!");
  }, [previewData, editingPreview, templateDetail, selectedTemplate]);

  const handleCancelPreview = useCallback(() => {
    setPreviewData(null);
    setEditingPreview({});
    setSelectedContactLabel("");
  }, []);

  const handleSelectTicket = useCallback(async (ticket: IdvZapTicket) => {
    if (!pendingContact) return;
    await extractFromTicket(ticket.id, pendingContact.contact, pendingContact.extraInfo);
  }, [pendingContact, extractFromTicket]);

  const handleSelectAdvboxCustomer = useCallback((customer: AdvboxCustomer) => {
    setSelectedContactLabel(customer.name);
    setSignerName(customer.name || "");
    setSignerEmail(customer.email || "");
    setSignerPhone(customer.cellphone || customer.phone || "");
    setDataSource(null);

    const tpl = templateDetail || selectedTemplate;
    if (tpl?.inputs) {
      setVariables(autoFillFromAdvbox(tpl.inputs, customer));
    }
    toast.success(`Dados de "${customer.name}" carregados da ADVBOX`);
  }, [templateDetail, selectedTemplate]);

  const createMutation = useMutation({
    mutationFn: () => {
      const signers: ZapSignSigner[] = [
        {
          name: signerName,
          ...(signerEmail ? { email: signerEmail } : {}),
          ...(signerPhone ? { phone_country: "55", phone_number: signerPhone } : {}),
        },
      ];
      return createFromTemplate({
        template_id: selectedTemplate!.token,
        signer_name: signerName,
        signers,
        data: variables,
      });
    },
    onSuccess: () => {
      toast.success("Contrato criado a partir do modelo!");
      queryClient.invalidateQueries({ queryKey: ["zapsign-docs"] });
      onClose();
    },
    onError: (err: Error) => {
      toast.error("Erro ao criar contrato: " + err.message);
    },
  });

  const handleSelectTemplate = (tpl: ZapSignTemplate) => {
    setSelectedTemplate(tpl);
    setVariables({});
    setSelectedContactLabel("");
    setStep("fill");
  };

  const hasInputs = selectedTemplate?.inputs && selectedTemplate.inputs.length > 0;
  const idvzapContacts = idvzapData?.contacts?.filter((c) => !c.isGroup && (c.name || c.pushname)) || [];
  const advboxCustomers = advboxData?.data || [];
  const isLoadingSource = dataSource === "idvzap" ? loadingIdvzap : dataSource === "advbox" ? loadingAdvbox : false;
  const sourceResults = dataSource === "idvzap" ? idvzapContacts : dataSource === "advbox" ? advboxCustomers : [];

  if (step === "select") {
    return (
      <div className="flex flex-col h-full">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="text-sm font-semibold">Selecionar Modelo</h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {loadingTemplates && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {templates?.results?.filter((t) => t.active).map((tpl) => (
              <button
                key={tpl.token}
                onClick={() => handleSelectTemplate(tpl)}
                className="w-full text-left p-3 rounded-lg hover:bg-secondary/80 transition-colors flex items-center gap-3 mb-1"
              >
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tpl.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {tpl.template_type?.toUpperCase()} • {tpl.created_at ? new Date(tpl.created_at).toLocaleDateString("pt-BR") : ""}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
            {!loadingTemplates && (!templates?.results || templates.results.filter((t) => t.active).length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum modelo encontrado na ZapSign
              </p>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border flex items-center gap-2">
        <button onClick={() => { setStep("select"); setSelectedContactLabel(""); setVariables({}); }} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold truncate">{selectedTemplate?.name}</h3>
          <p className="text-[10px] text-muted-foreground">Preencha os dados do contrato</p>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Source picker */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Importar dados
              </p>
              {selectedContactLabel && (
                <button onClick={() => setSelectedContactLabel("")} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {showTicketPicker ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/10 border border-accent/20">
                  <StickyNote className="w-4 h-4 text-accent shrink-0" />
                  <p className="text-xs font-medium flex-1">Selecione o atendimento para importar os dados</p>
                  <button onClick={() => { setShowTicketPicker(false); setPendingContact(null); setContactTickets([]); setSelectedContactLabel(""); }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border bg-secondary/50">
                  {extractingNotes && (
                    <div className="flex items-center justify-center gap-2 py-4">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground">Extraindo dados das notas...</span>
                    </div>
                  )}
                  {!extractingNotes && contactTickets.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTicket(t)}
                      className="w-full text-left px-2.5 py-2 hover:bg-secondary transition-colors flex items-center gap-2 border-b border-border/50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{t.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {t.lastMessageAt ? new Date(Number(t.lastMessageAt)).toLocaleDateString("pt-BR") : "—"}
                          </span>
                          <span className={`text-[10px] px-1 py-0.5 rounded ${t.status === "open" ? "bg-green-500/10 text-green-600" : t.status === "closed" ? "bg-muted text-muted-foreground" : "bg-yellow-500/10 text-yellow-600"}`}>
                            {t.status === "open" ? "Aberto" : t.status === "closed" ? "Fechado" : t.status}
                          </span>
                          {t.tags?.map((tag) => (
                            <span key={tag.id} className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary truncate max-w-[80px]">
                              {tag.tag}
                            </span>
                          ))}
                        </div>
                        {t.lastMessage && (
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{t.lastMessage}</p>
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : previewData ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/10 border border-accent/20">
                  <Edit3 className="w-4 h-4 text-accent shrink-0" />
                  <p className="text-xs font-medium flex-1">Revise os dados extraídos</p>
                  <button onClick={handleCancelPreview} className="text-muted-foreground hover:text-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-border bg-secondary/50 p-2 space-y-1.5">
                  {selectedTemplate?.inputs?.map((input) => {
                    const val = editingPreview[input.variable] || "";
                    const label = (input.label || input.variable).replace(/\{\{|\}\}/g, "").trim();
                    return (
                      <div key={input.variable}>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">{label}</label>
                        <Input
                          value={val}
                          onChange={(e) => setEditingPreview(prev => ({ ...prev, [input.variable]: e.target.value }))}
                          className="h-7 text-xs bg-background border-border"
                          placeholder="(vazio)"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" variant="outline" className="flex-1 h-8 text-[11px]" onClick={handleCancelPreview}>
                    Cancelar
                  </Button>
                  <Button size="sm" className="flex-1 h-8 text-[11px] gap-1" onClick={handleConfirmPreview}>
                    <Check className="w-3 h-3" />
                    Confirmar dados
                  </Button>
                </div>
              </div>
            ) : selectedContactLabel ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                <UserPlus className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs font-medium truncate flex-1">{selectedContactLabel}</p>
                <span className="text-[10px] text-primary font-medium">Preenchido</span>
              </div>
            ) : (
              <>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant={dataSource === "idvzap" ? "default" : "outline"}
                    className="flex-1 gap-1.5 h-8 text-[11px]"
                    onClick={() => { setDataSource(dataSource === "idvzap" ? null : "idvzap"); setContactSearch(""); }}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    IDVZap
                  </Button>
                  <Button
                    size="sm"
                    variant={dataSource === "advbox" ? "default" : "outline"}
                    className="flex-1 gap-1.5 h-8 text-[11px]"
                    onClick={() => { setDataSource(dataSource === "advbox" ? null : "advbox"); setContactSearch(""); }}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    ADVBOX
                  </Button>
                </div>

                {dataSource && (
                  <div className="space-y-1.5">
                    <Input
                      placeholder={dataSource === "idvzap" ? "Buscar por nome ou telefone..." : "Buscar por nome..."}
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                      className="h-7 text-xs bg-secondary border-border"
                      autoFocus
                    />
                    <div className="max-h-36 overflow-y-auto rounded-lg border border-border bg-secondary/50">
                      {isLoadingSource && (
                        <div className="flex items-center justify-center py-3">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {!isLoadingSource && sourceResults.length === 0 && (
                        <p className="text-[11px] text-muted-foreground text-center py-3">Nenhum contato encontrado</p>
                      )}

                      {dataSource === "idvzap" && idvzapContacts.slice(0, 20).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectIdvZapContact(c)}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-secondary transition-colors flex items-center gap-2 border-b border-border/50 last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{c.name || c.pushname}</p>
                            <p className="text-[10px] text-muted-foreground">{c.number}</p>
                          </div>
                        </button>
                      ))}

                      {dataSource === "advbox" && advboxCustomers.slice(0, 20).map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleSelectAdvboxCustomer(c)}
                          className="w-full text-left px-2.5 py-1.5 hover:bg-secondary transition-colors flex items-center gap-2 border-b border-border/50 last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {c.identification || c.cellphone || c.email || ""}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Signatário */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Signatário</p>
            <Input
              placeholder="Nome do signatário *"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              className="h-8 text-sm bg-secondary border-border"
            />
            <div className="flex gap-1.5">
              <Input
                placeholder="Email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                className="h-8 text-sm bg-secondary border-border"
              />
              <Input
                placeholder="Telefone"
                value={signerPhone}
                onChange={(e) => setSignerPhone(e.target.value)}
                className="h-8 text-sm bg-secondary border-border"
              />
            </div>
          </div>

          {/* Variáveis do template */}
          {loadingDetail && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {hasInputs && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Variáveis do modelo
              </p>
              {selectedTemplate!.inputs!.map((input) => (
                <div key={input.variable}>
                  <label className="text-[11px] text-muted-foreground mb-0.5 block">
                    {input.label || input.variable.replace(/\{\{|\}\}/g, "")}
                  </label>
                  <Input
                    placeholder={input.variable}
                    value={variables[input.variable] || ""}
                    onChange={(e) =>
                      setVariables((prev) => ({ ...prev, [input.variable]: e.target.value }))
                    }
                    className="h-8 text-sm bg-secondary border-border"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border">
        <Button
          size="sm"
          className="w-full gap-1.5"
          onClick={() => createMutation.mutate()}
          disabled={!signerName || createMutation.isPending}
        >
          {createMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Gerar contrato
        </Button>
      </div>
    </div>
  );
};

export default TemplateContractForm;
