import { supabase } from "@/integrations/supabase/client";

export interface ZapSignSigner {
  name: string;
  email?: string;
  phone_country?: string;
  phone_number?: string;
  auth_mode?: string;
  lock_email?: boolean;
  lock_phone?: boolean;
}

export interface ZapSignDocument {
  open_id: number;
  token: string;
  name: string;
  status: string;
  created_at?: string;
  signers?: {
    token: string;
    name: string;
    email: string;
    sign_url: string;
    status: string;
  }[];
}

export interface ZapSignListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ZapSignDocument[];
}

export interface ZapSignTemplateInput {
  variable: string;
  input_type: string;
  label: string;
  help_text: string;
  options: string;
}

export interface ZapSignTemplate {
  token: string;
  template_type: string;
  name: string;
  active: boolean;
  template_file?: string;
  created_at?: string;
  last_update_at?: string;
  lang?: string;
  signers?: {
    name: string;
    auth_mode: string;
    email: string;
    phone_country: string;
    phone_number: string;
    lock_name: boolean;
  }[];
  inputs?: ZapSignTemplateInput[];
}

export interface ZapSignTemplateListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ZapSignTemplate[];
}

async function callZapSign(body: Record<string, unknown>) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error("Usuário não autenticado");

  const response = await fetch("http://127.0.0.1:3000/api/zapsign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erro na requisição ZapSign");
  return data;
}

export async function listDocuments(page = 1): Promise<ZapSignListResponse> {
  return callZapSign({ action: "list", page });
}

export async function getDocument(token: string): Promise<ZapSignDocument> {
  return callZapSign({ action: "detail", token });
}

export async function createDocument(params: {
  name: string;
  signers: ZapSignSigner[];
  url_pdf?: string;
  base64_pdf?: string;
  send_automatic_email?: boolean;
  send_automatic_whatsapp?: boolean;
}) {
  return callZapSign({ action: "create", ...params });
}

export async function listTemplates(page = 1): Promise<ZapSignTemplateListResponse> {
  return callZapSign({ action: "list_templates", page });
}

export async function getTemplate(token: string): Promise<ZapSignTemplate> {
  return callZapSign({ action: "get_template", token });
}

export async function createFromTemplate(params: {
  template_id: string;
  signer_name: string;
  signers: ZapSignSigner[];
  data?: Record<string, string>;
  send_automatic_email?: boolean;
  send_automatic_whatsapp?: boolean;
}) {
  return callZapSign({ action: "create_from_template", ...params });
}
