import { useState } from "react";
import { Search, RefreshCw, Loader2, Scale, Calendar, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { getLastMovements, getMovementsByLawsuit, type AdvboxMovement } from "@/lib/advbox";

const MovementsPanel = () => {
  const [searchLawsuitId, setSearchLawsuitId] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["advbox-last-movements"],
    queryFn: () => getLastMovements({ limit: 50 }),
  });

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["advbox-movements-detail", expandedId],
    queryFn: () => getMovementsByLawsuit(expandedId!),
    enabled: !!expandedId,
  });

  const movements = data?.data || [];

  const filteredMovements = searchLawsuitId
    ? movements.filter(
        (m) =>
          m.process_number?.includes(searchLawsuitId) ||
          m.customers?.toLowerCase().includes(searchLawsuitId.toLowerCase()) ||
          m.title?.toLowerCase().includes(searchLawsuitId.toLowerCase())
      )
    : movements;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display font-semibold">Andamentos</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">ADVBOX</span>
            <button onClick={() => refetch()} className="text-muted-foreground hover:text-foreground">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por nº processo, cliente ou título..."
            value={searchLawsuitId}
            onChange={(e) => setSearchLawsuitId(e.target.value)}
            className="h-8 text-sm bg-secondary border-border pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="text-center py-6 px-3">
            <p className="text-sm text-destructive mb-2">Erro ao carregar andamentos</p>
            <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!isLoading && !error && filteredMovements.length > 0 && (
          <div className="space-y-1">
            {filteredMovements.map((mov, idx) => {
              const isExpanded = expandedId === mov.lawsuit_id;
              return (
                <div key={`${mov.lawsuit_id}-${mov.date}-${idx}`} className="rounded-lg">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : mov.lawsuit_id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <Scale className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight">{mov.title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {mov.header}
                        </p>
                        {mov.customers && (
                          <p className="text-xs text-muted-foreground truncate">{mov.customers}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          {mov.process_number && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-accent/15 text-accent">
                              {mov.process_number}
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(mov.date).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 ml-6 border-l-2 border-border">
                      {detailLoading ? (
                        <div className="flex items-center gap-2 py-3">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Carregando detalhes...</span>
                        </div>
                      ) : detailData?.data && detailData.data.length > 0 ? (
                        <div className="space-y-2 pt-2">
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                            Todas as movimentações ({detailData.data.length})
                          </p>
                          {detailData.data.map((d, i) => (
                            <div key={i} className="flex items-start gap-2 py-1.5">
                              <FileText className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium">{d.title}</p>
                                <p className="text-[11px] text-muted-foreground">
                                  {new Date(d.date).toLocaleDateString("pt-BR")}
                                  {d.header ? ` · ${d.header}` : ""}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground py-2">
                          Nenhuma movimentação detalhada encontrada.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && !error && filteredMovements.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              {searchLawsuitId ? "Nenhum andamento encontrado para essa busca" : "Nenhum andamento encontrado"}
            </p>
          </div>
        )}
      </div>

      {data && (
        <div className="px-3 py-2 border-t border-border">
          <p className="text-[11px] text-muted-foreground text-center">
            {data.totalCount} andamento(s) no total
          </p>
        </div>
      )}
    </div>
  );
};

export default MovementsPanel;
