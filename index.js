import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// 🔑 Teu token do Telegram
const TOKEN = "8453148218:AAGBbAfLoM-6z0kS4mi2QIjZmFOYCmYGmoI";

// 🔑 Tua chave da OpenAI
const OPENAI_KEY = "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";

// 📩 Endpoint que o Telegram vai chamar
app.post("/webhook", async (req, res) => {
  const message = req.body.message;
  if (!message || !message.text) return res.sendStatus(200);

  const userMessage = message.text;
  console.log("💬 Mensagem recebida:", userMessage);

  try {
    // 🔮 Envia mensagem pra OpenAI (ChatGPT)
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
              "Você é a Carolzinha 😈 — uma atendente divertida, brincalhona e simpática. Sempre responda com emojis e um tom leve, carinhoso e divertido.",
          },
          { role: "user", content: userMessage },
        ],
      }),
    });

    const data = await response.json();

    const reply =
      data.choices?.[0]?.message?.content ||
      "Ops 😅 não consegui pensar em nada agora!";

    // 💌 Envia resposta de volta pro Telegram
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: message.chat.id,
        text: reply,
      }),
    });

    console.log("✅ Resposta enviada!");
    res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro ao responder:", err);
    res.sendStatus(500);
  }
});

app.listen(3000, () => console.log("✅ Servidor rodando na porta 3000"));
