import express from "express";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const WIINPAY_API_KEY = process.env.WIINPAY_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "elias123";
const BASE_URL = process.env.BASE_URL;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";
const HISTORICO_PATH = "./conversas.json";

// leitura inicial
let historico = {};
if (fs.existsSync(HISTORICO_PATH)) {
  try {
    historico = JSON.parse(fs.readFileSync(HISTORICO_PATH, "utf8"));
  } catch (err) {
    console.error("Erro ao ler historico JSON inicial:", err);
    historico = {};
  }
}

function salvarConversa(chatId, pergunta, resposta) {
  historico[chatId] = historico[chatId] || [];
  historico[chatId].push({ pergunta, resposta, hora: new Date().toISOString() });
  try {
    fs.writeFileSync(HISTORICO_PATH, JSON.stringify(historico, null, 2));
  } catch (err) {
    console.error("Erro ao salvar historico:", err);
  }
}

function contarPedidos(chatId) {
  const arr = historico[chatId] || [];
  const chaves = ["conteúdo", "nude", "ver", "video", "foto", "manda", "link", "pelada"];
  return arr.filter(item => {
    return chaves.some(k => item.pergunta.toLowerCase().includes(k));
  }).length;
}

async function sendMessage(chatId, text) {
  console.log(`[Telegram -> ${chatId}]`, text);
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  } catch (err) {
    console.error("Erro sendMessage:", err);
  }
}

async function sendTyping(chatId) {
  try {
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    });
  } catch (err) {
    console.error("Erro sendTyping:", err);
  }
}

async function askCarolzinha(chatId, userMsg) {
  const tentativas = contarPedidos(chatId);
  console.log(`[AI] ${chatId} pedacos de conteudo pedidos: ${tentativas}`);

  if (tentativas >= 2) {
    const linkMsg = `Tô te esperando sem calcinha no meu cantinho VIP... 😈 entra aqui 👉 https://t.me/carollsecretbot`;
    console.log(`[AI] Enviando link direto para ${chatId}`);
    return linkMsg;
  }

  const prompt = `
Você é Carolzinha 😈... [texto completo original aqui, sem cortes]

Usuário: ${userMsg}
  `;

  console.log(`[AI] Enviando prompt para OpenAI | ${chatId}:`, prompt);

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: userMsg },
        ],
        temperature: 0.85,
      }),
    });

    const data = await resp.json();
    console.log(`[AI] resposta OpenAI | ${chatId}:`, data);

    if (!data?.choices?.[0]?.message?.content) {
      console.warn(`[AI] sem conteúdo pro ${chatId}`, data);
      return "Hmmm... não entendi direito, fala de novo 😏";
    }

    return data.choices[0].message.content.trim();
  } catch (err) {
    console.error("Erro OpenAI:", err);
    return "Aiiinn... deu uma travada aqui 😖 tenta de novo...";
  }
}

// Webhook Telegram
app.post(WEBHOOK_PATH, async (req, res) => {
  console.log("Recebido update:", JSON.stringify(req.body));
  const message = req.body?.message;
  if (!message?.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text.trim();

  salvarConversa(chatId, text, null);

  await sendTyping(chatId);
  // delay 8 a 14s
  const ms = 8000 + Math.floor(Math.random() * 6000);
  await new Promise(r => setTimeout(r, ms));

  const reply = await askCarolzinha(chatId, text);
  salvarConversa(chatId, text, reply);

  await sendMessage(chatId, reply);

  res.sendStatus(200);
});

// Webhook WiinPay
app.post("/webhook-wiinpay", async (req, res) => {
  console.log("WiinPay callback:", JSON.stringify(req.body));
  const body = req.body;
  const meta = body?.metadata || {};
  if (meta.secret !== WEBHOOK_SECRET) {
    console.warn("WiinPay secret inválido:", meta.secret);
    return res.status(401).send("Acesso negado");
  }

  const status = body.status;
  if (["pago", "aprovado"].includes(String(status).toLowerCase())) {
    const chatId = meta.chat_id;
    await sendMessage(chatId, `💖 Pix confirmado! Acesse aqui: 🔗 t.me/grupo_vip_das_safadas`);
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Carolzinha está online 😘");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
