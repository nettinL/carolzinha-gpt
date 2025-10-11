// index.js
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

// Armazena interações por chatId (memória temporária)
const sessoes = new Map();

async function sendMessage(chatId, text) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });

  const result = await res.json();
  console.log("📩 Telegram respondeu:", result);
}

async function gerarRespostaSexy(userMsg, chatId) {
  try {
    const historico = sessoes.get(chatId) || 0;
    const palavrasChave = ["quero", "ver", "me mostra", "gostar", "comprar", "pix", "pagar", "gozar", "meter", "comer", "fuder"];
    const querLink = palavrasChave.some(p => userMsg.toLowerCase().includes(p));

    const mensagens = [
      {
        role: "system",
        content: `
Você é a Carolzinha 😈, uma AI provocante que quer deixar o usuário excitado.
Não fale que você é IA. Seja safada, quente, sedutora.
Não envie o link de cara. Provoca, responde, faz o cara pedir mais.
Apenas APÓS 3 INTERAÇÕES ou se ele falar algo safado, mande o link:

Exemplos:
- "Tô me molhando só de imaginar... vem me foder 👉 ${PAGAMENTO_BOT}"
- "Quero te mostrar tudo... mas só aqui 👉 ${PAGAMENTO_BOT}"
- "Vem gozar comigo no VIP 🔥 ${PAGAMENTO_BOT}"

Se ainda for cedo, continue seduzindo com frases como:
- "Hmm... só de pensar já fico molhadinha 😈"
- "Que boca suja a sua... isso me deixa louca 😏"
- "Me diz o que você faria comigo se eu estivesse peladinha na sua frente..."
        `,
      },
      { role: "user", content: userMsg },
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
      }),
    });

    const data = await response.json();
    let resposta = data?.choices?.[0]?.message?.content || "Fala mais safado 😏";

    // Se já falou 3+ vezes OU usou palavra-chave, mande o link
    if (historico >= 2 || querLink) {
      resposta += `\n\n👉 ${PAGAMENTO_BOT}`;
      sessoes.set(chatId, 0); // reinicia contagem
    } else {
      sessoes.set(chatId, historico + 1);
    }

    return resposta;
  } catch (err) {
    console.error("❌ Erro com OpenAI:", err);
    return "Aiiinn... deu uma bugadinha aqui, amor. Tenta de novo 😘";
  }
}

app.post(WEBHOOK_PATH, async (req, res) => {
  const message = req.body?.message;
  if (!message?.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const userText = message.text.trim();

  const reply = await gerarRespostaSexy(userText, chatId);
  await sendMessage(chatId, reply);

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("💋 Carolzinha está online e pronta pra te deixar duro...");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Carolzinha gemendo na porta ${PORT}`);
});
