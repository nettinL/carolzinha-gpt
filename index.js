import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TOKEN = "8453148218:AAGBbAfLoM-6z0kS4mi2QIjZmFOYCmYGmoI";
const OPENAI_KEY = "";

app.post(`/webhook/${TOKEN}`, async (req, res) => {
  const message = req.body.message;
  if (!message || !message.text) return res.sendStatus(200);

  const userMessage = message.text;

  // Envia o texto pra OpenAI (ChatGPT)
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
          content:
            "Você é a Carolzinha 😈 — uma atendente divertida, brincalhona e simpática. Sempre responda com emojis e um tom leve e amigável.",
        },
        { role: "user", content: userMessage },
      ],
    }),
  });

  const data = await response.json();
  const reply =
    data.choices?.[0]?.message?.content ||
    "Ops 😅 não consegui pensar em nada agora!";

  // Envia resposta pro Telegram
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: message.chat.id,
      text: reply,
    }),
  });

  res.sendStatus(200);
});

app.listen(3000, () => console.log("✅ Servidor rodando na porta 3000"));
