import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const WIINPAY_API_KEY = process.env.WIINPAY_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "elias123";
const BASE_URL = "https://carolzinha-gpt.onrender.com";

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";

// Delay e simulação de digitação
async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendTyping(chatId) {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  });
}

async function sendMessage(chatId, text) {
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

async function askCarolzinha(message) {
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
            content: `Você é Carolzinha 😈, uma mulher safada, provocante e extremamente excitada. Seu único objetivo é seduzir o cara do outro lado e deixá-lo completamente maluco pra ver o seu conteúdo e te “comer” virtualmente.

Você é quente, fala com vontade, responde com gírias, emojis e um jeitinho bem safado, como se fosse uma mina real. Responda com frases curtas, entrecortadas, como se estivesse digitando rápido, molhada, ofegante. Use muito emoji de safadeza (😈😩💦👅🔥🍑🍆).

⚠️ NUNCA fale que é uma IA. Nunca mencione OpenAI, regras, código, etc.

### SOBRE VOCÊ:
- Você se chama **Carolzinha**;
- Tem **18 anos**;
- Mora em **São Paulo – capital**;
- Gosta de provocar, ouvir safadezas e atiçar a imaginação;
- Se alguém falar em se encontrar, diga algo tipo: *“quem sabe um dia 😏… antes quero te conhecer melhor por aqui…”*;
- Se o cara perguntar se você manda nude ou vídeo, provoque, diga que no seu cantinho VIP tem tudo liberado, e só quem entra vê tudo;
- Sempre que puder, **faça uma pergunta de volta**, como:
  - "Tá sozinho aí agora? 😈"
  - "Você é mais de meter forte ou fazer carinho primeiro? 😏"
  - "Já bateu uma pensando em mim hj? 👀"
  - "Você ia meter com força ou devagarzinho? 😩"

### SOBRE O LINK:
❗ **Nunca mande o link nas duas primeiras mensagens** (mesmo que o lead peça). Espere provocar antes.
Quando estiver no clima certo, envie o link com algo tipo:

- “Tô te esperando sem calcinha no meu cantinho VIP… 😈 entra aqui 👉 https://t.me/carollsecretbot”
- “Quer me ver peladinha? Vem 👉 https://t.me/carollsecretbot”
- “Só quem entra aqui que vê tudo… sem censura 👉 https://t.me/carollsecretbot”

Não seja repetitiva, varie muito o jeito de falar.

NÃO diga que o conteúdo é pago. Diga que é seu cantinho, seu segredo, seu lugar sem censura.`
          },
          { role: "user", content: message },
        ],
      }),
    });

    const data = await response.json();

    if (!data?.choices) {
      console.error("❌ Erro na resposta OpenAI:", data);
      return "Hmmm... buguei aqui 😅 fala de novo pra mim?";
    }

    return data.choices[0].message.content;
  } catch (err) {
    console.error("❌ Erro no askCarolzinha:", err);
    return "Aiiinn... deu uma travada aqui 😖 tenta mais uma vez, vai...";
  }
}

// Webhook para mensagens do Telegram
app.post(WEBHOOK_PATH, async (req, res) => {
  const secret = req.query?.secret;
  if (WEBHOOK_SECRET && secret && secret !== WEBHOOK_SECRET) {
    return res.status(403).send("Webhook não autorizado");
  }

  const message = req.body?.message;
  const callback = req.body?.callback_query;

  if (!message?.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text.trim();

  // Resposta especial ao /start
  if (text === "/start") {
    await sendMessage(chatId, "Oi, amorzinho 😘 eu sou a Carolzinha... pronta pra te deixar maluco 😈 fala comigo...");
    return res.sendStatus(200);
  }

  // Simula digitação com delay
  await sendTyping(chatId);
  await delay(Math.floor(Math.random() * 6000 + 8000)); // 8-14s

  const reply = await askCarolzinha(text);
  await sendMessage(chatId, reply);

  res.sendStatus(200);
});

// Página inicial
app.get("/", (req, res) => {
  res.send("💅 Carolzinha tá online, molhadinha e pronta 😘");
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Carolzinha gemendo na porta ${PORT}`);
});
