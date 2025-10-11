import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// 🔐 Variáveis seguras do Render
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;

// 🔗 Endpoints
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";

// 📨 Envia mensagem de volta pro Telegram
async function sendMessage(chatId, text) {
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    });
  } catch (err) {
    console.error("❌ Erro ao enviar mensagem pro Telegram:", err);
  }
}

// 🤖 Consulta a OpenAI
async function askOpenAI(message) {
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
            content:
              "Você é a Carolzinha GPT — divertida, simpática e responde de forma natural, sempre em português.",
          },
          { role: "user", content: message },
        ],
      }),
    });

    const data = await response.json();

    // 💬 Log pra depuração (mostra a resposta real da OpenAI)
    console.log("🔍 Resposta da OpenAI:", JSON.stringify(data, null, 2));

    if (response.ok && data?.choices?.length > 0) {
      return data.choices[0].message.content.trim();
    } else {
      return `Ops 😅 erro na IA: ${data?.error?.message || "sem resposta"}`;
    }
  } catch (error) {
    console.error("❌ Erro geral ao chamar a OpenAI:", error);
    return "Tive um probleminha pra pensar agora 😔";
  }
}

// 💌 Recebe mensagens do Telegram
app.post(WEBHOOK_PATH, async (req, res) => {
  const message = req.body?.message;
  if (!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const userText = message.text.trim();

  console.log(`📩 Nova mensagem de ${chatId}: ${userText}`);

  const resposta = await askOpenAI(userText);
  await sendMessage(chatId, resposta);

  res.sendStatus(200);
});

// 🌐 Página inicial pra testar
app.get("/", (req, res) => {
  res.send("✅ Carolzinha GPT está online e charmosa!");
});

// 🚀 Inicializa o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
