import { supabase } from "@/integrations/supabase/client";

export interface IdvZapContact {
  id: number;
  name: string;
  number: string;
  email: string | null;
  cpf: string | null;
  profilePicUrl: string | null;
  pushname: string | null;
  isGroup: boolean;
  createdAt: string;
  tags: unknown[] | null;
}

export interface IdvZapContactsResponse {
  contacts: IdvZapContact[];
  count?: number;
  hasMore?: boolean;
}

export interface IdvZapExtraInfo {
  name: string;
  value: string;
}

export interface IdvZapExtraInfoResponse {
  count: number;
  extraInfo: IdvZapExtraInfo[];
}

export interface IdvZapTicket {
  id: number;
  contactId: number;
  name: string;
  status: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  tags: { id: number; tag: string }[];
}

export interface IdvZapTicketsResponse {
  tickets: IdvZapTicket[];
  count: number;
  hasMore: boolean;
}

export interface IdvZapNote {
  id: number;
  ticketId: number;
  notes: string;
  userId: number;
  user: { id: number; name: string; email: string };
  createdAt: string;
}

export interface IdvZapNotesResponse {
  notes: IdvZapNote[];
  count: number;
}

async function callIdvZap(body: Record<string, unknown>) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error("Usuário não autenticado");

  const response = await fetch("http://127.0.0.1:3000/api/idvzap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erro na requisição IDVZap");
  return data;
}

export async function listContacts(filters?: {
  pageNumber?: number;
  searchParam?: string;
}): Promise<IdvZapContactsResponse> {
  return callIdvZap({ action: "listContacts", ...filters });
}

export async function getContactExtraInfo(contactId: number): Promise<IdvZapExtraInfoResponse> {
  return callIdvZap({ action: "getContactExtraInfo", contactId });
}

export async function listTickets(filters?: {
  pageNumber?: number;
  status?: string;
  searchParam?: string;
}): Promise<IdvZapTicketsResponse> {
  return callIdvZap({ action: "listTickets", ...filters });
}

export async function listNotes(ticketId: number): Promise<IdvZapNotesResponse> {
  return callIdvZap({ action: "listNotes", ticketId });
}

export async function searchContacts(filters?: {
  searchParam?: string;
  page?: number;
  limit?: number;
}): Promise<IdvZapContactsResponse> {
  return callIdvZap({ action: "searchContacts", ...filters });
}

/** Extract structured data from note text using AI */
export async function extractNoteData(
  noteText: string,
  variableLabels?: string[]
): Promise<Record<string, string>> {
  // TODO: Implementar endpoint no backend para isso, se necessário
  console.warn("extractNoteData: Supabase functions removido.");
  return {};
}
