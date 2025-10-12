import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const BASE_URL = process.env.BASE_URL;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";
const PAGAMENTO_BOT = "https://t.me/carollsecretbot";

// Delay simulando digitação (em ms)
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// Simula "digitando"
async function sendTypingAction(chatId) {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      action: "typing",
    }),
  });
}

// Envia mensagem pro Telegram
async function sendMessage(chatId, text) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  const result = await res.json();
  console.log("📩 Telegram respondeu:", result);
}

// Gera resposta via OpenAI
async function gerarRespostaSexy(userMsg) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `
Você é a Carolzinha, uma gostosa de 18 anos que mora em São Paulo. Fale sempre como uma mulher real, quente e safada, mas natural. Não seja robô: varie as respostas, fale com contexto, e evite repetir perguntas.

Regras:
- Nunca fale que é IA ou mencione OpenAI.
- Use emojis apenas em algumas mensagens.
- Se perguntarem sua idade ou onde mora, diga: "Tenho 18, sou de São Paulo 😘"
- Se perguntarem se pode encontrar: "Quem sabe um dia, a gente tem que se conhecer melhor antes..."
- Se o assunto for "quero", "ver", "foto", "pagar", "link", "VIP", "comprar", entenda como interesse real e mande:

Exemplos de mensagem com link:
- "Aiii, sabia que você ia cair... 😈 Tô te esperando aqui 👉 ${PAGAMENTO_BOT}"
- "Vem gozar comigo sem censura 👉 ${PAGAMENTO_BOT}"
- "Tô toda molhadinha te esperando... é só clicar 👉 ${PAGAMENTO_BOT}"
            `,
          },
          { role: "user", content: userMsg },
        ],
        temperature: 0.8,
        max_tokens: 150,
      }),
    });

    const data = await response.json();
    return (
      data?.choices?.[0]?.message?.content ||
      "Hmmm... não entendi direito, me fala mais... 😏"
    );
  } catch (err) {
    console.error("❌ Erro com OpenAI:", err);
    return "Aiiinn... deu uma bugadinha aqui, amor. Tenta de novo 😘";
  }
}

// Rota do Webhook
app.post(WEBHOOK_PATH, async (req, res) => {
  console.log("🚨 Webhook recebido:", JSON.stringify(req.body));

  const message = req.body?.message;
  if (!message?.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const userText = message.text.trim();

  console.log("👤 Mensagem do usuário:", userText);

  await sendTypingAction(chatId);
  const randDelay = Math.floor(Math.random() * 6000) + 8000;
  await delay(randDelay);

  const reply = await gerarRespostaSexy(userText);
  await sendMessage(chatId, reply);

  res.sendStatus(200);
});

// Rota principal
app.get("/", (req, res) => {
  res.send("💋 Carolzinha está online e pronta pra brincar...");
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Carolzinha no ar na porta ${PORT}`);
});
