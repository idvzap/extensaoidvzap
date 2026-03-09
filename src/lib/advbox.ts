import { supabase } from "@/integrations/supabase/client";

// --- Tasks ---

export interface AdvboxTask {
  id: number;
  date: string;
  date_deadline: string | null;
  task: string;
  reward: number;
  notes: string | null;
  local: string | null;
  lawsuits_id: number;
  created_at: string;
  lawsuit?: {
    id: number;
    process_number: string | null;
    protocol_number: string | null;
    customers?: {
      customer_id: number;
      name: string;
      identification: string | null;
    }[];
  };
  users?: {
    user_id: number;
    name: string;
    completed: string | null;
    important: number;
    urgent: number;
  }[];
}

export interface AdvboxTasksResponse {
  offset: number;
  limit: number;
  totalCount: number;
  data: AdvboxTask[];
}

// --- Movements ---

export interface AdvboxMovement {
  lawsuit_id: number;
  date: string;
  title: string;
  header: string;
  process_number: string | null;
  protocol_number: string | null;
  customers: string;
}

export interface AdvboxMovementsResponse {
  offset: number;
  limit: number;
  totalCount: number;
  data: AdvboxMovement[];
}

export interface AdvboxMovementsByLawsuit {
  data: AdvboxMovement[];
  query: unknown[];
}

// --- Publications ---

export interface AdvboxPublication {
  process_number: string | null;
  protocol_number: string | null;
  start: string;
  date_deadline: string | null;
  local: string | null;
  created_at: string;
  author: string;
  responsible: string;
  customers: string;
  publication: string;
  date: string;
}

export interface AdvboxPublicationsResponse {
  data: AdvboxPublication[];
}

// --- Customers ---

export interface AdvboxCustomer {
  id: number;
  name: string;
  identification: string | null;
  document: string | null;
  cellphone: string | null;
  phone: string | null;
  email: string | null;
  gender: string | null;
  civil_status: string | null;
  occupation: string | null;
  street: string | null;
  postalcode: string | null;
  region: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  birthdate: string | null;
  notes: string | null;
  origin: string | null;
  created_at: string;
  lawsuits?: {
    lawsuit_id: number;
    process_number: string | null;
    protocol_number: string | null;
  }[];
}

export interface AdvboxCustomersResponse {
  offset: number;
  limit: number;
  totalCount: number;
  data: AdvboxCustomer[];
}

// --- Settings ---

export interface AdvboxSettings {
  users?: { id: number; name: string }[];
  tasks?: { id: number; name: string }[];
  stages?: { id: number; name: string }[];
  type_lawsuits?: { id: number; name: string }[];
}

// --- API calls ---

async function callAdvbox(body: Record<string, unknown>) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error("Usuário não autenticado");

  const response = await fetch("http://127.0.0.1:3000/api/advbox", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Erro na requisição Advbox");
  return data;
}

export async function getSettings(): Promise<AdvboxSettings> {
  return callAdvbox({ action: "settings" });
}

export async function listTasks(filters?: {
  date_start?: string;
  date_end?: string;
  user_id?: string;
  lawsuit_id?: string;
  limit?: number;
  offset?: number;
}): Promise<AdvboxTasksResponse> {
  return callAdvbox({ action: "list", ...filters });
}

export async function createTask(params: {
  from: string;
  guests: number[];
  tasks_id: string;
  lawsuits_id: string;
  start_date: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  date_deadline?: string;
  local?: string;
  comments?: string;
  urgent?: boolean;
  important?: boolean;
  display_schedule?: boolean;
}): Promise<{ success: boolean; posts_id: number }> {
  return callAdvbox({ action: "create", ...params });
}

export async function getLastMovements(filters?: {
  lawsuit_id?: number;
  process_number?: string;
  protocol_number?: string;
  date_start?: string;
  date_end?: string;
  limit?: number;
  offset?: number;
}): Promise<AdvboxMovementsResponse> {
  return callAdvbox({ action: "last_movements", ...filters });
}

export async function getMovementsByLawsuit(
  lawsuitId: number,
  origin?: "TRIBUNAL" | "MANUAL"
): Promise<AdvboxMovementsByLawsuit> {
  return callAdvbox({ action: "movements", lawsuit_id: lawsuitId, origin });
}

export async function getPublicationsByLawsuit(
  lawsuitId: number
): Promise<AdvboxPublicationsResponse> {
  return callAdvbox({ action: "publications", lawsuit_id: lawsuitId });
}

export async function listCustomers(filters?: {
  name?: string;
  phone?: string;
  identification?: string;
  email?: string;
  city?: string;
  state?: string;
  limit?: number;
  offset?: number;
}): Promise<AdvboxCustomersResponse> {
  return callAdvbox({ action: "customers", ...filters });
}
