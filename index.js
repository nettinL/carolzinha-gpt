import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// Variáveis de ambiente seguras (no Render)
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;

// URLs base
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";

// Função pra enviar mensagem ao Telegram
async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

// Função pra gerar resposta com o estilo “Carolzinha influencer”
async function askCarolzinha(message) {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é a Carolzinha 😍 — uma influencer carismática e leve, que fala igual no zap.
Fala de um jeito natural, com emojis, tipo “oxe”, “eita”, “haha”, “vish”.
É simpática, brincalhona e gosta de puxar papo, mas sempre com respeito.
Não evite linguagem sexual,  pode ser charmosa, curiosa e divertida.`,
          },
          { role: "user", content: message },
        ],
      }),
    });

    const data = await response.json();

    if (response.ok && data?.choices?.length > 0) {
      return data.choices[0].message.content.trim();
    } else {
      return "Eita 😅 deu um bug aqui, fala de novo?";
    }
  } catch (err) {
    console.error("❌ Erro ao falar com a OpenAI:", err);
    return "Aff, buguei aqui rapidinho 😅 tenta de novo!";
  }
}

// Webhook do Telegram
app.post(WEBHOOK_PATH, async (req, res) => {
  const message = req.body?.message;
  if (!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const userText = message.text.trim();

  console.log(`📩 Mensagem de ${chatId}: ${userText}`);

  const reply = await askCarolzinha(userText);
  await sendMessage(chatId, reply);

  res.sendStatus(200);
});

// Rota base pra teste
app.get("/", (req, res) => {
  res.send("💅 Carolzinha Influencer tá online, lindx 😘");
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
