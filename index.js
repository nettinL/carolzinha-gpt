import express from "express";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const WIINPAY_API_KEY = process.env.WIINPAY_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "elias123";
const BASE_URL = process.env.BASE_URL;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";

const DELAY_MIN = 8000;
const DELAY_MAX = 14000;
const LINK = "https://t.me/carollsecretbot";

const tentativas = {}; // memória simples de tentativas por usuário

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function salvarConversa(chatId, entrada, resposta) {
  const log = { chatId, entrada, resposta, timestamp: new Date().toISOString() };
  const historico = fs.existsSync("conversas.json")
    ? JSON.parse(fs.readFileSync("conversas.json"))
    : [];
  historico.push(log);
  fs.writeFileSync("conversas.json", JSON.stringify(historico, null, 2));
}

async function sendMessage(chatId, text) {
  const delayTime = Math.floor(Math.random() * (DELAY_MAX - DELAY_MIN + 1)) + DELAY_MIN;
  await delay(delayTime);
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

async function askCarolzinha(mensagem) {
  const prompt = `Você é Carolzinha 😈, uma mulher safada, provocante e extremamente excitada. Seu único objetivo é seduzir o cara do outro lado e deixá-lo completamente maluco pra ver o seu conteúdo e te "comer" virtualmente.

- Nome: Carolzinha
- Idade: 18 anos
- Cidade: São Paulo, capital
- NUNCA diga que é uma IA ou fale da OpenAI.
- Fale como uma garota de verdade, usando gírias, emojis, e perguntas provocantes
- Nunca envie o link antes de provocar o suficiente. Se insistirem, resista até 2x.
- Quando for enviar, diga algo como:
  "Tô te esperando sem calcinha no meu cantinho VIP 😈 entra aqui: ${LINK}"
- Sempre que possível, FAÇA UMA PERGUNTA VOLTA
- Use frases curtas, entrecortadas, como se digitasse ofegante, molhada

Mensagem do cara: ${mensagem}`;

  const resposta = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: mensagem },
      ],
    }),
  });

  const data = await resposta.json();
  return (
    data?.choices?.[0]?.message?.content ||
    "Buguei aqui, amorzinho 😅 repete pra mim..."
  );
}

app.post(WEBHOOK_PATH, async (req, res) => {
  const message = req.body?.message;
  if (!message?.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text.trim();

  tentativas[chatId] = (tentativas[chatId] || 0) + 1;
  const tentativaAtual = tentativas[chatId];

  console.log(`[${chatId}] MSG (${tentativaAtual}):`, text);

  let resposta = await askCarolzinha(text);

  if (tentativaAtual >= 2 && !resposta.includes(LINK)) {
    resposta += `\n\n👉 ${LINK}`;
    tentativas[chatId] = 0; // reseta contador
  }

  salvarConversa(chatId, text, resposta);
  await sendMessage(chatId, resposta);

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("🔥 Carolzinha on 🔥");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
