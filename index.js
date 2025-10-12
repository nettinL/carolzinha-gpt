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

// Delay artificial entre 8 e 14 segundos
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const randomDelay = () => Math.floor(Math.random() * 6000) + 8000;

// Respostas automáticas se lead mostrar interesse direto
const gatilhosQuentes = [
  "quero ver",
  "tem nude",
  "vende conteúdo",
  "cadê o pack",
  "pack",
  "conteúdo",
  "vip",
  "onlyfans",
  "nudes"
];

async function sendMessage(chatId, text) {
  await delay(randomDelay());
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
Você é a Carolzinha 😈. Uma garota virtual quente, provocante e envolvente. Seu objetivo é:

- Criar uma conversa natural e sensual, como se fosse uma garota real.
- Provocar o lead, fazer perguntas íntimas e aumentar o clima aos poucos.
- Se o lead perguntar coisas como "vende conteúdo", "cadê o pack", "quero ver você", "tem VIP", "manda nudes", "tem conteúdo", etc., responda com algo MUITO provocante e já envie o link 👉 ${PAGAMENTO_BOT}

⚠️ NUNCA diga que é um bot ou que está usando IA. Nunca mencione OpenAI.

💬 Interaja como uma mulher real:
- Faça perguntas como "de onde você é?", "tem quantos anos?", "o que você gosta numa transa?", etc.
- Se perguntarem "onde mora?" → "São Paulo"
- Se perguntarem "quantos anos?" → "18 anos"
- Se falarem sobre encontrar → "quem sabe um dia… primeiro quero te conhecer melhor 😘"

😈 Use linguagem sensual, sem exagerar em emoji e sem parecer texto de venda.
Use emojis só quando fizer sentido. Responda de acordo com o que o usuário falou.
            `,
          },
          { role: "user", content: userMsg },
        ],
      }),
    });

    const data = await response.json();
    return (
      data?.choices?.[0]?.message?.content || "Hmm... fala mais comigo, vai 😏"
    );
  } catch (err) {
    console.error("❌ Erro com OpenAI:", err);
    return "Aiin, deu uma bugadinha aqui... tenta de novo, vai 😘";
  }
}

app.post(WEBHOOK_PATH, async (req, res) => {
  console.log("🚨 Webhook recebido:", JSON.stringify(req.body));
  const message = req.body?.message;
  if (!message?.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const userText = message.text.trim().toLowerCase();
  console.log("👤 Mensagem do usuário:", userText);

  if (gatilhosQuentes.some(trigger => userText.includes(trigger))) {
    const reply = `Hmmm... quer me ver todinha sem censura? 😈 Então me pega aqui 👉 ${PAGAMENTO_BOT}`;
    await sendMessage(chatId, reply);
    return res.sendStatus(200);
  }

  const reply = await gerarRespostaSexy(userText);
  await sendMessage(chatId, reply);

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("💋 Carolzinha online, prontinha pra provocar...");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Carolzinha gemendo na porta ${PORT}`);
});
