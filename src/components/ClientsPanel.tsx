import { useState } from "react";
import { Search, Plus, Phone, Mail, ChevronRight, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCustomers, createCustomer, getSettings } from "@/lib/advbox";
import { useToast } from "@/hooks/use-toast";

function maskCpfCnpj(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function maskPostalCode(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

const EMPTY_FORM = {
  users_id: "",
  customers_origins_id: "",
  name: "",
  email: "",
  identification: "",
  phone: "",
  cellphone: "",
  birthdate: "",
  occupation: "",
  postalcode: "",
  city: "",
  state: "",
  notes: "",
};

const ClientsPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data, isLoading } = useQuery({
    queryKey: ["advbox-customers", debouncedSearch],
    queryFn: () => listCustomers(debouncedSearch ? { name: debouncedSearch, limit: 50 } : { limit: 50 }),
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["advbox-settings"],
    queryFn: getSettings,
    enabled: dialogOpen,
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      toast({ title: "Contato criado com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ["advbox-customers"] });
      setDialogOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao criar contato", description: err.message, variant: "destructive" });
    },
  });

  const clients = data?.data ?? [];

  const handleSearch = (value: string) => {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    setDebounceTimer(setTimeout(() => setDebouncedSearch(value), 400));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.users_id || !form.customers_origins_id || !form.name.trim()) return;
    mutation.mutate({
      users_id: Number(form.users_id),
      customers_origins_id: Number(form.customers_origins_id),
      name: form.name,
      ...(form.email && { email: form.email }),
      ...(form.identification && { identification: form.identification }),
      ...(form.phone && { phone: form.phone }),
      ...(form.cellphone && { cellphone: form.cellphone }),
      ...(form.birthdate && { birthdate: form.birthdate }),
      ...(form.occupation && { occupation: form.occupation }),
      ...(form.postalcode && { postalcode: form.postalcode }),
      ...(form.city && { city: form.city }),
      ...(form.state && { state: form.state }),
      ...(form.notes && { notes: form.notes }),
    });
  };

  const field = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display font-semibold">Clientes</h2>
          <span className="text-xs text-muted-foreground">
            {data?.totalCount ?? "—"} cadastrados
          </span>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-secondary border-border"
            />
          </div>
          <Button
            size="sm"
            className="h-9 px-3 shrink-0"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : clients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nenhum cliente encontrado</p>
        ) : (
          clients.map((client) => (
            <button
              key={client.id}
              className="w-full text-left p-3 rounded-lg hover:bg-secondary/80 transition-colors group mb-1"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{client.name}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {(client.cellphone || client.phone) && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {client.cellphone || client.phone}
                      </span>
                    )}
                    {client.email && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {client.email}
                      </span>
                    )}
                  </div>
                  {client.identification && (
                    <span className="text-[10px] text-accent mt-1 inline-block">
                      CPF/CNPJ: {client.identification}
                    </span>
                  )}
                  {client.lawsuits && client.lawsuits.length > 0 && (
                    <span className="text-[10px] text-muted-foreground ml-2">
                      {client.lawsuits.length} processo(s)
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
              </div>
            </button>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Contato</DialogTitle>
          </DialogHeader>
          {settingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label>Responsável *</Label>
                <Select value={form.users_id} onValueChange={(v) => field("users_id", v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecionar usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {(settings?.users ?? []).map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Origem *</Label>
                <Select value={form.customers_origins_id} onValueChange={(v) => field("customers_origins_id", v)}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecionar origem" />
                  </SelectTrigger>
                  <SelectContent>
                    {(settings?.origins ?? []).map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>{o.origin}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => field("name", e.target.value)}
                  placeholder="Nome completo"
                  className="h-9 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Celular</Label>
                  <Input
                    value={form.cellphone}
                    onChange={(e) => field("cellphone", maskPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => field("phone", maskPhone(e.target.value))}
                    placeholder="(11) 3333-4444"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => field("email", e.target.value)}
                  placeholder="email@exemplo.com"
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>CPF / CNPJ</Label>
                  <Input
                    value={form.identification}
                    onChange={(e) => field("identification", maskCpfCnpj(e.target.value))}
                    placeholder="000.000.000-00"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Nascimento</Label>
                  <Input
                    type="date"
                    value={form.birthdate}
                    onChange={(e) => field("birthdate", e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Profissão</Label>
                <Input
                  value={form.occupation}
                  onChange={(e) => field("occupation", e.target.value)}
                  placeholder="Ex: Advogado"
                  className="h-9 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1">
                  <Label>CEP</Label>
                  <Input
                    value={form.postalcode}
                    onChange={(e) => field("postalcode", maskPostalCode(e.target.value))}
                    placeholder="00000-000"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label>UF</Label>
                  <Input
                    value={form.state}
                    onChange={(e) => field("state", e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="SP"
                    className="h-9 text-sm"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input
                  value={form.city}
                  onChange={(e) => field("city", e.target.value)}
                  placeholder="São Paulo"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label>Observações</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => field("notes", e.target.value)}
                  placeholder="Informações adicionais..."
                  className="text-sm resize-none"
                  rows={2}
                />
              </div>

              <DialogFooter className="pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setDialogOpen(false); setForm(EMPTY_FORM); }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={mutation.isPending || !form.users_id || !form.customers_origins_id || !form.name.trim()}
                >
                  {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar contato"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsPanel;
