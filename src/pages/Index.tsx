import { useState } from "react";
import SideNav, { type Tab } from "@/components/SideNav";
import ContractsPanel from "@/components/ContractsPanel";
import ClientsPanel from "@/components/ClientsPanel";
import TasksPanel from "@/components/TasksPanel";
import MovementsPanel from "@/components/MovementsPanel";
import SummaryPanel from "@/components/SummaryPanel";
import UazapiPanel from "@/components/UazapiPanel";

const panels: Record<Tab, React.ComponentType> = {
  contracts: ContractsPanel,
  clients: ClientsPanel,
  tasks: TasksPanel,
  movements: MovementsPanel,
  summary: SummaryPanel,
  uazapi: UazapiPanel,
};

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("contracts");
  const ActivePanel = panels[activeTab];

  const isExtension = !!(window as any).chrome?.runtime?.id;

  return (
    <div className={isExtension ? "h-screen" : "flex items-center justify-center min-h-screen p-4"}>
      <div className={`${isExtension ? "w-full h-full" : "w-[420px] h-[580px] rounded-2xl border border-border shadow-2xl shadow-black/40"} overflow-hidden bg-card flex`}>
        <SideNav activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ActivePanel />
        </div>
      </div>
    </div>
  );
};

export default Index;
