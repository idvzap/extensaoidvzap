import { FileSignature, Users, ListTodo, MessageSquare, Zap, Settings, Scale, LogOut, PanelRightClose, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";

type Tab = "contracts" | "clients" | "tasks" | "movements" | "summary" | "uazapi";

interface SideNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const navItems = [
  { id: "contracts", icon: FileSignature, label: "Contratos" },
  { id: "clients", icon: Users, label: "Clientes" },
  { id: "tasks", icon: ListTodo, label: "Tarefas" },
  { id: "movements", icon: Scale, label: "Andamentos" },
  { id: "summary", icon: MessageSquare, label: "Resumo" },
  { id: "uazapi", icon: Smartphone, label: "UaZAPI" },
];

const SideNav = ({ activeTab, onTabChange }: SideNavProps) => {
  const { logout } = useAuth();

  const handleMinimize = () => {
    if (window.close) {
      window.close();
    }
  };

  return (
    <div className="w-16 bg-sidebar flex flex-col items-center py-4 border-r border-border shrink-0 h-full">
      <div className="mb-6 flex flex-col items-center gap-4">
        <button
          onClick={handleMinimize}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Minimizar (Fechar Painel)"
        >
          <PanelRightClose className="w-5 h-5" />
        </button>
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary">
          <Zap className="w-5 h-5 text-primary-foreground" />
        </div>
      </div>

      <nav className="flex flex-col gap-2 flex-1 w-full items-center">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id as Tab)}
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 group relative",
              activeTab === item.id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
            title={item.label}
          >
            <item.icon className="w-5 h-5" />
            <span className="absolute left-14 bg-card text-card-foreground text-xs px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap border border-border z-50 transition-opacity shadow-sm">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2 w-full items-center">
        <button
          className="w-10 h-10 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Configurações"
        >
          <Settings className="w-5 h-5" />
        </button>
        <button
          onClick={logout}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Sair"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default SideNav;
export type { Tab };
