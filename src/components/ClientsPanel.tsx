import { useState } from "react";
import { Search, Plus, Phone, Mail, ChevronRight, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { listCustomers, type AdvboxCustomer } from "@/lib/advbox";

const ClientsPanel = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["advbox-customers", debouncedSearch],
    queryFn: () => listCustomers(debouncedSearch ? { name: debouncedSearch, limit: 50 } : { limit: 50 }),
  });

  const clients = data?.data ?? [];

  const handleSearch = (value: string) => {
    setSearch(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    setDebounceTimer(setTimeout(() => setDebouncedSearch(value), 400));
  };

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
    </div>
  );
};

export default ClientsPanel;
