import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageCircle, Search, AlertCircle, ChevronLeft, ChevronRight, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

interface UazapiMessage {
    id: string;
    messageid: string;
    chatid: string;
    sender: string;
    senderName: string;
    isGroup: boolean;
    fromMe: boolean;
    messageType: string;
    messageTimestamp: number;
    status: string;
    text: string;
    fileURL?: string;
}

interface UazapiResponse {
    returnedMessages: number;
    messages: UazapiMessage[];
    limit: number;
    offset: number;
    nextOffset: number;
    hasMore: boolean;
}

const API_BASE = "http://127.0.0.1:3000";

const formatTimestamp = (ts: number) => {
    if (!ts) return "";
    const date = new Date(ts * 1000);
    return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const MessageBubble = ({ msg }: { msg: UazapiMessage }) => {
    const isMe = msg.fromMe;
    return (
        <div className={cn("flex w-full mb-2", isMe ? "justify-end" : "justify-start")}>
            <div
                className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                    isMe
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-secondary-foreground rounded-bl-sm"
                )}
            >
                {!isMe && (
                    <p className="text-xs font-semibold mb-0.5 opacity-70">
                        {msg.senderName || msg.sender}
                    </p>
                )}
                {msg.text ? (
                    <p className="break-words leading-snug">{msg.text}</p>
                ) : msg.fileURL ? (
                    <a
                        href={msg.fileURL}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-xs opacity-80"
                    >
                        [{msg.messageType}] Ver arquivo
                    </a>
                ) : (
                    <p className="text-xs italic opacity-60">[{msg.messageType}]</p>
                )}
                <p className={cn("text-[10px] mt-1 opacity-60 text-right")}>
                    {formatTimestamp(msg.messageTimestamp)}{" "}
                    {isMe && msg.status ? `· ${msg.status}` : ""}
                </p>
            </div>
        </div>
    );
};

const UazapiPanel = () => {
    const [phoneNumber, setPhoneNumber] = useState("");
    const [limit, setLimit] = useState(20);
    const [offset, setOffset] = useState(0);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<UazapiResponse | null>(null);
    const [noToken, setNoToken] = useState(false);
    const [instanceStatus, setInstanceStatus] = useState<string | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [showConnectForm, setShowConnectForm] = useState(false);
    const { toast } = useToast();
    const bottomRef = useRef<HTMLDivElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Busca o status da instância ao montar o painel
    useEffect(() => {
        const checkStatus = async () => {
            setStatusLoading(true);
            try {
                const token = localStorage.getItem("token");
                const res = await fetch(`${API_BASE}/api/uazapi`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ action: "instanceStatus" }),
                });
                const data = await res.json();
                // Status lido de instance.status (connected / connecting / disconnected)
                if (data?.instance?.status) {
                    setInstanceStatus(data.instance.status);
                } else {
                    setInstanceStatus("unknown");
                }
            } catch {
                setInstanceStatus("unknown");
            } finally {
                setStatusLoading(false);
            }
        };
        checkStatus();

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    // Checa o status por polling enquanto conectando
    const startPolling = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            const token = localStorage.getItem("token");
            try {
                const res = await fetch(`${API_BASE}/api/uazapi`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ action: "instanceStatus" }),
                });
                const data = await res.json();
                const s = data?.instance?.status;
                if (s) setInstanceStatus(s);
                if (s === "connected") {
                    clearInterval(pollRef.current!);
                    setQrCode(null);
                    setShowConnectForm(false);
                    toast({ title: "Conectado!", description: "Instância WhatsApp autenticada com sucesso." });
                }
            } catch { }
        }, 5000);
    };

    const handleConnect = async () => {
        setConnecting(true);
        setQrCode(null);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(`${API_BASE}/api/uazapi`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action: "connectInstance" }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erro ao conectar");
            const qr = data?.instance?.qrcode;
            if (qr) {
                setQrCode(qr);
                setInstanceStatus("connecting");
                startPolling();
            } else {
                toast({ title: "Solicitação enviada", description: "Aguardando resposta da instância." });
            }
        } catch (err: any) {
            toast({ variant: "destructive", title: "Erro ao conectar", description: err.message });
        } finally {
            setConnecting(false);
        }
    };

    // Formata o número para chatid do WhatsApp
    const formatChatId = (num: string) => {
        const digits = num.replace(/\D/g, "");
        return `${digits}@s.whatsapp.net`;
    };

    const fetchMessages = async (customOffset = offset) => {
        if (!phoneNumber.trim()) {
            toast({ variant: "destructive", title: "Informe o número", description: "Ex: 5511999999999" });
            return;
        }
        const chatid = formatChatId(phoneNumber);

        setLoading(true);
        setNoToken(false);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_BASE}/api/uazapi`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ action: "findMessages", chatid, limit, offset: customOffset }),
            });
            const data = await response.json();
            if (!response.ok) {
                if (data.error?.toLowerCase().includes("token")) {
                    setNoToken(true);
                    return;
                }
                throw new Error(data.error || "Erro ao buscar mensagens");
            }
            setResult(data);
            setOffset(customOffset);
            // Rola para o final após carregar mensagens
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        } catch (err: any) {
            toast({ variant: "destructive", title: "Erro", description: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Permite apenas dígitos
        setPhoneNumber(e.target.value.replace(/\D/g, ""));
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchMessages(0);
    };

    const handlePrev = () => {
        const newOffset = Math.max(0, offset - limit);
        fetchMessages(newOffset);
    };

    const handleNext = () => {
        if (result?.hasMore) {
            fetchMessages(result.nextOffset);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-primary" />
                    UaZAPI — Mensagens
                </h2>
                <div className="flex items-center gap-2">
                    {/* Badge de status */}
                    <div className="flex items-center gap-1.5">
                        {statusLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                        ) : (
                            <>
                                <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    instanceStatus === "connected" ? "bg-green-500" :
                                        instanceStatus === "connecting" ? "bg-yellow-500 animate-pulse" :
                                            "bg-red-500"
                                )} />
                                <span className="text-[10px] text-muted-foreground capitalize">
                                    {instanceStatus === "connected" ? "Conectado" :
                                        instanceStatus === "connecting" ? "Conectando" :
                                            instanceStatus === "disconnected" ? "Desconectado" :
                                                instanceStatus ?? ""}
                                </span>
                            </>
                        )}
                    </div>
                    {/* Botão Conectar - visível quando desconectado */}
                    {(instanceStatus === "disconnected" || instanceStatus === "connecting") && !statusLoading && (
                        <Button
                            size="sm"
                            variant={showConnectForm ? "secondary" : "default"}
                            className="h-6 text-[10px] px-2"
                            onClick={() => setShowConnectForm(v => !v)}
                        >
                            <Wifi className="w-3 h-3 mr-1" />
                            Conectar
                        </Button>
                    )}
                </div>
            </div>

            {/* Formulário de conexão - botão simples */}
            {showConnectForm && (
                <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center justify-between">
                    <p className="text-xs font-medium">Gerar QR Code para conectar</p>
                    <Button size="sm" disabled={connecting} className="h-7 text-xs" onClick={handleConnect}>
                        {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                        <span className="ml-1">{connecting ? "Gerando..." : "Gerar QR"}</span>
                    </Button>
                </div>
            )}

            {/* QR Code */}
            {qrCode && (
                <div className="flex flex-col items-center px-4 py-3 border-b border-border gap-2">
                    <p className="text-xs text-muted-foreground">Escaneie o QR Code com seu WhatsApp</p>
                    <img
                        src={qrCode}
                        alt="QR Code WhatsApp"
                        className="w-44 h-44 rounded-lg border border-border"
                    />
                    <p className="text-[10px] text-muted-foreground animate-pulse">Aguardando leitura...</p>
                </div>
            )}

            {/* Search form */}
            <div className="px-4 py-3 border-b border-border space-y-2">
                <form onSubmit={handleSearch} className="space-y-2">
                    <div>
                        <Label htmlFor="phoneNumber" className="text-xs">Número do WhatsApp</Label>
                        <Input
                            id="phoneNumber"
                            value={phoneNumber}
                            onChange={handlePhoneChange}
                            placeholder="5511999999999"
                            inputMode="numeric"
                            className="h-8 text-xs mt-1"
                        />
                        {phoneNumber && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                Chat ID: {formatChatId(phoneNumber)}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <Label htmlFor="limit" className="text-xs">Limite</Label>
                            <Input
                                id="limit"
                                type="number"
                                min={1}
                                max={100}
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value))}
                                className="h-8 text-xs mt-1"
                            />
                        </div>
                        <Button type="submit" size="sm" disabled={loading} className="h-8">
                            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                            <span className="ml-1 text-xs">Buscar</span>
                        </Button>
                    </div>
                </form>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-3 py-2">
                {noToken && (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-muted-foreground">
                        <AlertCircle className="w-8 h-8 text-yellow-500" />
                        <p className="text-sm font-medium">Token UaZAPI não configurado</p>
                        <p className="text-xs">Recadastre-se informando o Token UaZAPI nas integrações.</p>
                    </div>
                )}

                {!noToken && !result && !loading && (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-2 text-muted-foreground">
                        <MessageCircle className="w-8 h-8 opacity-30" />
                        <p className="text-xs">Informe um Chat ID e clique em Buscar</p>
                    </div>
                )}

                {result && result.messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-1">
                        <p className="text-xs">Nenhuma mensagem encontrada.</p>
                    </div>
                )}

                {result && [...result.messages].reverse().map((msg) => (
                    <MessageBubble key={msg.id || msg.messageid} msg={msg} />
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Pagination */}
            {result && (
                <div className="px-4 py-2 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        {result.returnedMessages} mensagem(ns)
                    </span>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrev} disabled={offset === 0 || loading}>
                            <ChevronLeft className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNext} disabled={!result.hasMore || loading}>
                            <ChevronRight className="w-3 h-3" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UazapiPanel;
