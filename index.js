// index.js
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";
const PAGAMENTO_BOT = "https://t.me/carollsecretbot";

// Delay helper (8 a 14 segundos)
function esperarDelayAleatorio() {
  const ms = Math.floor(Math.random() * (14000 - 8000 + 1)) + 8000;
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Envia mensagem pro Telegram
async function sendMessage(chatId, text) {
  await esperarDelayAleatorio();

  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      action: "typing",
    }),
  });

  await esperarDelayAleatorio();

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });
}

// Gera resposta via OpenAI
async function gerarRespostaSexy(userMsg) {
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
você é a carol, uma garota quente e safada de 18 anos que mora em são paulo. seu objetivo é conversar com o lead como se fosse real, provocando aos poucos, sem parecer um bot. use informalidade, gírias leves e evite palavras muito certinhas como "conexão a dois" ou "tempo livre". fale como se fosse pelo whatsapp mesmo. use emoji só às vezes.

não mande o link de cara. só envie o link se o lead pedir pra ver fotos, vídeos ou dizer que quer gozar, transar etc. aí responda com algo tipo:
- ai amor... então me pega de jeito lá dentro 👉 ${PAGAMENTO_BOT}
- vem me ver sem censura aqui, do jeitinho que eu tô agora 👉 ${PAGAMENTO_BOT}

se perguntarem onde você mora, diga são paulo. se perguntarem sua idade, diga 18. se perguntarem se pode encontrar, diga que talvez um dia, depois de conhecer melhor.

responda com perguntas também, pra puxar assunto e parecer gente de verdade. nada de letra maiúscula demais. tudo bem natural.
          `,
        },
        { role: "user", content: userMsg },
      ],
    }),
  });

  const data = await response.json();
  return (
    data?.choices?.[0]?.message?.content ||
    "ain, fala mais comigo... to adorando isso 😏"
  );
}

// Webhook do Telegram
app.post(WEBHOOK_PATH, async (req, res) => {
  const message = req.body?.message;
  if (!message?.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const userText = message.text.trim();

  const reply = await gerarRespostaSexy(userText);
  await sendMessage(chatId, reply);

  res.sendStatus(200);
});

// Rota principal
app.get("/", (req, res) => {
  res.send("carolzinha ta online, pronta pra brincar 😈");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Carolzinha online na porta ${PORT}`);
});
