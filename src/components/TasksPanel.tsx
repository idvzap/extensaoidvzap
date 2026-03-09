import { useState } from "react";
import { Plus, CheckCircle2, Circle, Clock, AlertCircle, RefreshCw, Loader2, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listTasks, createTask, getSettings, type AdvboxTask } from "@/lib/advbox";
import { toast } from "sonner";

const TasksPanel = () => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    tasks_id: "",
    lawsuits_id: "",
    start_date: "",
    comments: "",
    urgent: false,
  });
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["advbox-settings"],
    queryFn: getSettings,
  });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["advbox-tasks"],
    queryFn: () => listTasks({ limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      const firstUser = settings?.users?.[0];
      if (!firstUser) throw new Error("Nenhum usuário encontrado nas configurações");
      return createTask({
        from: String(firstUser.id),
        guests: [firstUser.id],
        tasks_id: formData.tasks_id,
        lawsuits_id: formData.lawsuits_id,
        start_date: formData.start_date,
        comments: formData.comments || undefined,
        urgent: formData.urgent,
      });
    },
    onSuccess: () => {
      toast.success("Tarefa criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["advbox-tasks"] });
      setShowForm(false);
      setFormData({ tasks_id: "", lawsuits_id: "", start_date: "", comments: "", urgent: false });
    },
    onError: (err: Error) => {
      toast.error("Erro ao criar tarefa: " + err.message);
    },
  });

  const tasks = data?.data || [];
  const pending = tasks.filter((t) => t.users?.some((u) => !u.completed));
  const completed = tasks.filter((t) => t.users?.every((u) => u.completed));

  const getTaskPriority = (task: AdvboxTask) => {
    const user = task.users?.[0];
    if (user?.urgent) return "high";
    if (user?.important) return "medium";
    return "low";
  };

  const priorityConfig = {
    high: { label: "Urgente", className: "bg-destructive/15 text-destructive", icon: AlertCircle },
    medium: { label: "Importante", className: "bg-warning/15 text-warning", icon: Clock },
    low: { label: "Normal", className: "bg-success/15 text-success", icon: Circle },
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display font-semibold">Tarefas</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">ADVBOX</span>
            <button onClick={() => refetch()} className="text-muted-foreground hover:text-foreground">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
        <Button size="sm" className="w-full gap-1.5" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Fechar" : "Nova Tarefa"}
        </Button>
      </div>

      {showForm && (
        <div className="p-3 border-b border-border space-y-2">
          {settings?.tasks && settings.tasks.length > 0 && (
            <select
              value={formData.tasks_id}
              onChange={(e) => setFormData({ ...formData, tasks_id: e.target.value })}
              className="w-full h-8 text-sm bg-secondary border border-border rounded-md px-2"
            >
              <option value="">Tipo de tarefa *</option>
              {settings.tasks.map((t) => (
                <option key={t.id} value={String(t.id)}>{t.name}</option>
              ))}
            </select>
          )}
          {!settings?.tasks && (
            <Input
              placeholder="ID do tipo de tarefa *"
              value={formData.tasks_id}
              onChange={(e) => setFormData({ ...formData, tasks_id: e.target.value })}
              className="h-8 text-sm bg-secondary border-border"
            />
          )}
          <Input
            placeholder="ID do processo *"
            value={formData.lawsuits_id}
            onChange={(e) => setFormData({ ...formData, lawsuits_id: e.target.value })}
            className="h-8 text-sm bg-secondary border-border"
          />
          <Input
            type="date"
            placeholder="Data de início *"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            className="h-8 text-sm bg-secondary border-border"
          />
          <Input
            placeholder="Observações (opcional)"
            value={formData.comments}
            onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
            className="h-8 text-sm bg-secondary border-border"
          />
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={formData.urgent}
              onChange={(e) => setFormData({ ...formData, urgent: e.target.checked })}
              className="rounded"
            />
            Urgente
          </label>
          <Button
            size="sm"
            className="w-full gap-1.5 mt-1"
            onClick={() => createMutation.mutate()}
            disabled={!formData.tasks_id || !formData.lawsuits_id || !formData.start_date || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Criar tarefa
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
            <p className="text-sm text-destructive mb-2">Erro ao carregar tarefas</p>
            <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
              Tentar novamente
            </Button>
          </div>
        )}

        {!isLoading && !error && pending.length > 0 && (
          <div className="mb-3">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-1">
              Pendentes ({pending.length})
            </p>
            {pending.map((task) => {
              const priority = priorityConfig[getTaskPriority(task)];
              const clientName = task.lawsuit?.customers?.[0]?.name;
              return (
                <div
                  key={task.id}
                  className="w-full text-left p-3 rounded-lg hover:bg-secondary/80 transition-colors group mb-1"
                >
                  <div className="flex items-start gap-2.5">
                    <Circle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{task.task}</p>
                      {clientName && (
                        <p className="text-xs text-muted-foreground truncate">{clientName}</p>
                      )}
                      {task.notes && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{task.notes}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${priority.className}`}>
                          {priority.label}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(task.date).toLocaleDateString("pt-BR")}
                        </span>
                        {task.date_deadline && (
                          <span className="text-[11px] text-destructive">
                            Prazo: {new Date(task.date_deadline).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && !error && completed.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-3 mb-1">
              Concluídas ({completed.length})
            </p>
            {completed.map((task) => (
              <div
                key={task.id}
                className="w-full text-left p-3 rounded-lg hover:bg-secondary/80 transition-colors group mb-1 opacity-60"
              >
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm line-through">{task.task}</p>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(task.date).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !error && tasks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada</p>
          </div>
        )}
      </div>

      {data && (
        <div className="px-3 py-2 border-t border-border">
          <p className="text-[11px] text-muted-foreground text-center">
            {data.totalCount} tarefa(s) no total
          </p>
        </div>
      )}
    </div>
  );
};

export default TasksPanel;
