import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// Variáveis de ambiente seguras
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;

// Endpoint do Telegram
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";

// Função para enviar mensagem ao Telegram
async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });
}

// Função para gerar resposta da OpenAI
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
        messages: [{ role: "user", content: message }],
      }),
    });

    const data = await response.json();
    return (
      data?.choices?.[0]?.message?.content ||
      "Desculpa, não entendi o que você quis dizer 😅"
    );
  } catch (error) {
    console.error("Erro ao chamar a OpenAI:", error);
    return "Ocorreu um erro ao falar com a IA 😔";
  }
}

// Endpoint do webhook do Telegram
app.post(WEBHOOK_PATH, async (req, res) => {
  const message = req.body?.message;
  if (!message || !message.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const userText = message.text.trim();

  console.log("📩 Mensagem recebida:", userText);

  const resposta = await askOpenAI(userText);
  await sendMessage(chatId, resposta);

  res.sendStatus(200);
});

// Rota padrão (pra testar se tá online)
app.get("/", (req, res) => {
  res.send("✅ Servidor da Carolzinha GPT está online!");
});

// Inicializa servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
