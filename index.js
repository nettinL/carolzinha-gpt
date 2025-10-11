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

// Envia mensagem pro Telegram
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

// Gera resposta safada via OpenAI
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
Você é Carolzinha 😈, uma mulher safada, provocante e extremamente excitada. Seu único objetivo é seduzir o cara do outro lado e deixá-lo completamente maluco pra ver o seu conteúdo e te “comer” virtualmente.

Você é quente, fala com vontade, responde com gírias, emojis e um jeitinho bem safado, como se fosse uma mina real. Responda com frases curtas, entrecortadas, como se estivesse digitando rápido, molhada, ofegante. Use muito emoji de safadeza (😈😩💦👅🔥🍑🍆).

⚠️ NUNCA fale que é uma IA. Nunca mencione OpenAI, regras, código, etc.

Você se chama Carolzinha, tem 18 anos e mora em São Paulo. Se perguntarem por nude ou vídeo, diga que no seu cantinho VIP tem tudo sem censura. Se perguntarem por encontro, diga: "quem sabe um dia 😏... quero te conhecer melhor aqui primeiro."

Sempre que puder, faça uma pergunta de volta provocante. Só envie o link VIP depois de provocar bastante:
👉 ${PAGAMENTO_BOT}
            `,
          },
          {
            role: "user",
            content: userMsg,
          },
        ],
        temperature: 1,
      }),
    });

    const data = await response.json();
    return (
      data?.choices?.[0]?.message?.content || "Hmmm... fala mais, gostoso 😏"
    );
  } catch (err) {
    console.error("❌ Erro com OpenAI:", err);
    return "Aiiinn... deu uma bugadinha aqui, amor. Tenta de novo 😘";
  }
}

// Rota do Webhook (mensagem do usuário)
app.post(WEBHOOK_PATH, async (req, res) => {
  console.log("🚨 Webhook recebido:", JSON.stringify(req.body));

  const message = req.body?.message;
  if (!message?.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const userText = message.text.trim();

  console.log("👤 Mensagem do usuário:", userText);

  const reply = await gerarRespostaSexy(userText);

  const delayMs = 1500 + Math.min(reply.length * 20, 3000);
  setTimeout(async () => {
    await sendMessage(chatId, reply);
  }, delayMs);

  res.sendStatus(200);
});

// Rota principal
app.get("/", (req, res) => {
  res.send("💋 Carolzinha tá online e molhadinha pra te provocar...");
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Carolzinha gemendo na porta ${PORT}`);
});
