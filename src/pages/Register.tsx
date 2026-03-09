import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const Register = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    zapsign_token: "",
    advbox_token: "",
    idvzap_token: "",
    idvzap_api_url: "",
    idvzap_api_id: "",
    uazapi_token: "",
  });
  const [fullIdvZapUrl, setFullIdvZapUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.id === "fullIdvZapUrl") {
      const url = e.target.value;
      setFullIdvZapUrl(url);
      
      // Extrai a URL base única (ex: https://gsapi.idvzap.com.br) e o ID
      const match = url.match(/^(https?:\/\/[^/]+)\/v2\/api\/external\/([a-f0-9-]+)/);
      if (match) {
        setFormData(prev => ({
          ...prev,
          idvzap_api_url: match[1], // Salva a URL base específica do cliente
          idvzap_api_id: match[2]
        }));
      } else if (url === "") {
        setFormData(prev => ({
          ...prev,
          idvzap_api_url: "",
          idvzap_api_id: ""
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("https://extensao-extensao.wblpnk.easypanel.host/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Falha no cadastro");
      }

      toast({
        title: "Cadastro realizado com sucesso!",
        description: "Agora você pode fazer login.",
      });
      navigate("/login");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro no Cadastro",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Criar Conta</CardTitle>
          <CardDescription className="text-center">Preencha seus dados e tokens de integração</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={formData.password} onChange={handleChange} required />
            </div>
            
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-2">Integrações (Opcional)</h3>
              <div className="space-y-2">
                <Label htmlFor="zapsign_token">Token ZapSign</Label>
                <Input id="zapsign_token" value={formData.zapsign_token} onChange={handleChange} placeholder="Token da API ZapSign" />
              </div>
              <div className="space-y-2 mt-2">
                <Label htmlFor="advbox_token">Token Advbox</Label>
                <Input id="advbox_token" value={formData.advbox_token} onChange={handleChange} placeholder="Token da API Advbox" />
              </div>
              <div className="space-y-2 mt-2">
                <Label htmlFor="idvzap_token">Token IDVZap</Label>
                <Input id="idvzap_token" value={formData.idvzap_token} onChange={handleChange} placeholder="Token de Acesso (apenas o código)" />
              </div>
              <div className="space-y-2 mt-2">
                <Label htmlFor="uazapi_token">Token UaZAPI</Label>
                <Input id="uazapi_token" value={formData.uazapi_token} onChange={handleChange} placeholder="Token da API UaZAPI" />
              </div>
              <div className="space-y-2 mt-2">
                <Label htmlFor="fullIdvZapUrl">Link de Integração IDVZap</Label>
                <Input 
                  id="fullIdvZapUrl" 
                  value={fullIdvZapUrl} 
                  onChange={handleChange} 
                  placeholder="Cole o link completo (ex: https://gsapi.idvzap.com.br/...)" 
                />
                <p className="text-xs text-muted-foreground">O sistema identificará automaticamente o servidor e o ID do cliente.</p>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cadastrar
            </Button>
            <div className="text-center text-sm">
              Já tem uma conta? <Link to="/login" className="text-blue-600 hover:underline">Faça login</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;