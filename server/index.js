import express from 'express';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../dist')));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET || 'chave_super_secreta_padrao';

// Middleware de Autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
};

// --- Rota de Teste (Ping) ---
// app.get('/', (req, res) => {
//   res.send('IDVZap Backend Running');
// });

// --- Autenticação ---

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, name: user.name, email: user.email });
    } else {
      res.status(401).json({ error: 'Credenciais inválidas' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Cadastro de usuário (Para admin inicial)
app.post('/api/register', async (req, res) => {
  const { name, email, password, zapsign_token, advbox_token, idvzap_token, idvzap_api_url, idvzap_api_id, uazapi_token } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, zapsign_token, advbox_token, idvzap_token, idvzap_api_url, idvzap_api_id, uazapi_token) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, name, email',
      [name, email, hashedPassword, zapsign_token, advbox_token, idvzap_token, idvzap_api_url, idvzap_api_id, uazapi_token]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Obter dados do usuário logado (incluindo tokens mascarados se quiser, ou apenas info básica)
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [req.user.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- Integração ZapSign ---
const ZAPSIGN_BASE = "https://api.zapsign.com.br";

app.post('/api/zapsign', authenticateToken, async (req, res) => {
  try {
    const userRes = await pool.query('SELECT zapsign_token FROM users WHERE id = $1', [req.user.id]);
    const apiToken = userRes.rows[0]?.zapsign_token;

    if (!apiToken) {
      return res.status(400).json({ error: "Token ZapSign não configurado para este usuário" });
    }

    const { action, ...params } = req.body;
    console.log("[ZapSign] action:", action, "| params keys:", Object.keys(params));

    if (action === "list") {
      const page = params.page || 1;
      const response = await axios.get(`${ZAPSIGN_BASE}/api/v1/docs/?api_token=${apiToken}&page=${page}`);
      return res.json(response.data);
    }

    if (action === "detail") {
      const response = await axios.get(`${ZAPSIGN_BASE}/api/v1/docs/${params.token}/?api_token=${apiToken}`);
      return res.json(response.data);
    }

    if (action === "create") {
      const body = {
        name: params.name,
        signers: params.signers || [],
        ...(params.base64_pdf ? { base64_pdf: params.base64_pdf } : {}),
        ...(params.url_pdf ? { url_pdf: params.url_pdf } : {}),
        lang: params.lang || "pt-br",
        disable_signer_emails: params.disable_signer_emails ?? false,
        send_automatic_email: params.send_automatic_email ?? true,
        send_automatic_whatsapp: params.send_automatic_whatsapp ?? false,
      };
      const response = await axios.post(`${ZAPSIGN_BASE}/api/v1/docs/?api_token=${apiToken}`, body);
      return res.json(response.data);
    }

    if (action === "list_templates") {
      const page = params.page || 1;
      const response = await axios.get(`${ZAPSIGN_BASE}/api/v1/templates/?page=${page}`, {
        headers: { Authorization: `Bearer ${apiToken}` }
      });
      return res.json(response.data);
    }

    if (action === "get_template") {
      const response = await axios.get(`${ZAPSIGN_BASE}/api/v1/templates/${params.token}/`, {
        headers: { Authorization: `Bearer ${apiToken}` }
      });
      return res.json(response.data);
    }

    if (action === "create_from_template") {
      const body = {
        template_id: params.template_id,
        signer_name: params.signer_name,
        signers: params.signers || [],
        ...(params.data ? { data: params.data } : {}),
        ...(params.send_automatic_email !== undefined ? { send_automatic_email: params.send_automatic_email } : {}),
        ...(params.send_automatic_whatsapp !== undefined ? { send_automatic_whatsapp: params.send_automatic_whatsapp } : {}),
      };
      console.log("[ZapSign] create_from_template body:", JSON.stringify(body));
      const response = await axios.post(`${ZAPSIGN_BASE}/api/v1/docs/?api_token=${apiToken}`, body, {
        headers: { Authorization: `Bearer ${apiToken}` }
      });
      return res.json(response.data);
    }

    res.status(400).json({ error: "Ação desconhecida para ZapSign" });

  } catch (err) {
    console.error("Erro ZapSign:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});


// --- Integração Advbox ---
const ADVBOX_BASE = "https://app.advbox.com.br/api/v1";

app.post('/api/advbox', authenticateToken, async (req, res) => {
  try {
    const userRes = await pool.query('SELECT advbox_token FROM users WHERE id = $1', [req.user.id]);
    const apiToken = userRes.rows[0]?.advbox_token;

    if (!apiToken) {
      return res.status(400).json({ error: "Token Advbox não configurado para este usuário" });
    }

    const authHeaders = {
      "Authorization": `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };

    const { action, ...params } = req.body;

    if (action === "settings") {
      const response = await axios.get(`${ADVBOX_BASE}/settings`, { headers: authHeaders });
      return res.json(response.data);
    }

    if (action === "list") {
      const query = new URLSearchParams();
      if (params.date_start) query.set("date_start", params.date_start);
      if (params.date_end) query.set("date_end", params.date_end);
      if (params.user_id) query.set("user_id", params.user_id);
      if (params.lawsuit_id) query.set("lawsuit_id", params.lawsuit_id);
      if (params.limit) query.set("limit", String(params.limit));
      if (params.offset) query.set("offset", String(params.offset));

      const response = await axios.get(`${ADVBOX_BASE}/posts?${query.toString()}`, { headers: authHeaders });
      return res.json(response.status === 204 ? { data: [] } : response.data);
    }

    if (action === "create") {
      const body = {
        from: params.from,
        guests: params.guests,
        tasks_id: params.tasks_id,
        lawsuits_id: params.lawsuits_id,
        start_date: params.start_date,
        ...(params.start_time && { start_time: params.start_time }),
        ...(params.end_date && { end_date: params.end_date }),
        ...(params.end_time && { end_time: params.end_time }),
        ...(params.date_deadline && { date_deadline: params.date_deadline }),
        ...(params.local && { local: params.local }),
        ...(params.comments && { comments: params.comments }),
        ...(params.urgent !== undefined && { urgent: params.urgent }),
        ...(params.important !== undefined && { important: params.important }),
        ...(params.display_schedule !== undefined && { display_schedule: params.display_schedule }),
      };
      const response = await axios.post(`${ADVBOX_BASE}/posts`, body, { headers: authHeaders });
      return res.json(response.data);
    }

    if (action === "last_movements") {
      const query = new URLSearchParams();
      if (params.lawsuit_id) query.set("lawsuit_id", String(params.lawsuit_id));
      if (params.process_number) query.set("process_number", params.process_number);
      // ... outros params omitidos por brevidade, mas seguem o mesmo padrão
      const response = await axios.get(`${ADVBOX_BASE}/last_movements?${query.toString()}`, { headers: authHeaders });
      return res.json(response.data);
    }

    if (action === "movements") {
      if (!params.lawsuit_id) return res.status(400).json({ error: "lawsuit_id required" });
      const response = await axios.get(`${ADVBOX_BASE}/movements/${params.lawsuit_id}`, { headers: authHeaders });
      return res.json(response.data);
    }

    if (action === "publications") {
      if (!params.lawsuit_id) return res.status(400).json({ error: "lawsuit_id required" });
      const response = await axios.get(`${ADVBOX_BASE}/publications/${params.lawsuit_id}`, { headers: authHeaders });
      return res.json(response.data);
    }

    if (action === "customers") {
      const query = new URLSearchParams();
      if (params.name) query.set("name", params.name);
      if (params.limit) query.set("limit", String(params.limit));
      // ... outros params
      const response = await axios.get(`${ADVBOX_BASE}/customers?${query.toString()}`, { headers: authHeaders });
      return res.json(response.data);
    }

    if (action === "create_customer") {
      const body = {
        users_id: params.users_id,
        customers_origins_id: params.customers_origins_id,
        name: params.name,
        ...(params.email && { email: params.email }),
        ...(params.identification && { identification: params.identification }),
        ...(params.phone && { phone: params.phone }),
        ...(params.cellphone && { cellphone: params.cellphone }),
        ...(params.birthdate && { birthdate: params.birthdate }),
        ...(params.occupation && { occupation: params.occupation }),
        ...(params.postalcode && { postalcode: params.postalcode }),
        ...(params.city && { city: params.city }),
        ...(params.state && { state: params.state }),
        ...(params.notes && { notes: params.notes }),
      };
      const response = await axios.post(`${ADVBOX_BASE}/customers`, body, { headers: authHeaders });
      return res.json(response.data);
    }

    res.status(400).json({ error: "Ação desconhecida para Advbox" });

  } catch (err) {
    console.error("Erro Advbox:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});


// --- Integração IDVZap ---

app.post('/api/idvzap', authenticateToken, async (req, res) => {
  try {
    const userRes = await pool.query('SELECT idvzap_token, idvzap_api_url, idvzap_api_id FROM users WHERE id = $1', [req.user.id]);
    const { idvzap_token: apiToken, idvzap_api_url: userApiUrl, idvzap_api_id: userApiId } = userRes.rows[0] || {};

    if (!apiToken) {
      return res.status(400).json({ error: "Token IDVZap não configurado para este usuário" });
    }

    const authHeaders = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${apiToken}`,
    };

    const { action, ...params } = req.body;

    if (!userApiUrl || !userApiId) {
      return res.status(400).json({ error: "Integração IDVZap não configurada (URL ou ID ausente)." });
    }

    const baseUrl = `${userApiUrl}/v2/api/external/${userApiId}`;

    if (action === "listContacts") {
      const query = new URLSearchParams();
      if (params.pageNumber) query.set("pageNumber", String(params.pageNumber));
      if (params.searchParam) query.set("searchParam", params.searchParam);
      const response = await axios.get(`${baseUrl}/listContacts?${query.toString()}`, { headers: authHeaders });
      return res.json(response.data);
    }

    if (action === "getContactExtraInfo") {
      const response = await axios.get(`${baseUrl}/getContactExtraInfo?contactId=${params.contactId}`, { headers: authHeaders });
      return res.json(response.data);
    }

    if (action === "listTickets") {
      const query = new URLSearchParams();
      if (params.pageNumber) query.set("pageNumber", String(params.pageNumber));
      if (params.status) query.set("status", params.status);
      const response = await axios.get(`${baseUrl}/listTickets?${query.toString()}`, { headers: authHeaders });
      return res.json(response.data);
    }

    if (action === "listMessages") {
      const query = new URLSearchParams();
      query.set("ticketId", String(params.ticketId));
      if (params.pageNumber) query.set("pageNumber", String(params.pageNumber));
      const response = await axios.get(`${baseUrl}/listMessages?${query.toString()}`, { headers: authHeaders });
      return res.json(response.data);
    }

    if (action === "listNotes") {
      const response = await axios.get(`${baseUrl}/listNotes?ticketId=${params.ticketId}`, { headers: authHeaders });
      return res.json(response.data);
    }

    if (action === "searchContacts") {
      const response = await axios.post(`${baseUrl}/contacts/search`, params, { headers: authHeaders });
      return res.json(response.data);
    }

    res.status(400).json({ error: "Ação desconhecida para IDVZap" });

  } catch (err) {
    console.error("Erro IDVZap:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

// --- Integração UaZAPI ---
const UAZAPI_BASE = 'https://idvzap.uazapi.com';

app.post('/api/uazapi', authenticateToken, async (req, res) => {
  try {
    const userRes = await pool.query('SELECT uazapi_token FROM users WHERE id = $1', [req.user.id]);
    const apiToken = userRes.rows[0]?.uazapi_token;

    if (!apiToken) {
      return res.status(400).json({ error: 'Token UaZAPI não configurado para este usuário' });
    }

    const { action, ...params } = req.body;

    if (action === 'instanceStatus') {
      const response = await axios.get(`${UAZAPI_BASE}/instance/status`, {
        headers: {
          Accept: 'application/json',
          token: apiToken,
        },
      });
      return res.json(response.data);
    }

    if (action === 'connectInstance') {
      const response = await axios.post(`${UAZAPI_BASE}/instance/connect`, { phone: params.phone }, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          token: apiToken,
        },
      });
      return res.json(response.data);
    }

    if (action === 'findMessages') {
      const payload = {
        chatid: params.chatid,
        limit: params.limit ?? 20,
        offset: params.offset ?? 0,
        ...(params.id && { id: params.id }),
        ...(params.track_source && { track_source: params.track_source }),
        ...(params.track_id && { track_id: params.track_id }),
      };
      const response = await axios.post(`${UAZAPI_BASE}/message/find`, payload, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          token: apiToken,
        },
      });
      return res.json(response.data);
    }

    res.status(400).json({ error: 'Ação desconhecida para UaZAPI' });

  } catch (err) {
    console.error('Erro UaZAPI:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: err.response?.data || err.message });
  }
});

// Fallback para SPA - qualquer rota não encontrada acima será redirecionada para o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
