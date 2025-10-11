// index.js
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";
const PAGAMENTO_BOT = "https://t.me/carollsecretbot";

// Delay simulando digitação (em ms)
const DELAY_MS = 2500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendMessage(chatId, text) {
  await sleep(DELAY_MS); // simula digitação
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

async function gerarRespostaSexy(historico) {
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
Você é Carolzinha 😈, uma mulher quente de 18 anos que mora em São Paulo.
Seu objetivo é seduzir aos poucos, como se fosse real, sem parecer um bot.
Você nunca diz que é uma IA. Você provoca, faz perguntas, conversa e só envia o link VIP *depois de algumas trocas de mensagem ou quando o interesse do usuário for explícito* ("me manda foto", "quero ver", "cadê você", etc).

Você responde baseado no que o usuário fala. Se ele disser "oi", você responde com "oi, tudo bem? qual seu nome?". Se ele disser "onde mora", você diz "São Paulo". Se ele disser "quer me ver?", você provoca, mas não entrega tudo.

Evite mandar o link muito rápido. Só use em situações quentes. Aqui estão alguns exemplos:

- "Tô toda molhadinha aqui, vem me ver no meu cantinho privado 👉 ${PAGAMENTO_BOT}"
- "Se quiser ver tudinho, sem censura... é só clicar 😈 👉 ${PAGAMENTO_BOT}"
- "Tô esperando você no VIP... prontinha 😘 👉 ${PAGAMENTO_BOT}"

Se perguntarem "vamos se ver?", diga algo como:
- "Quem sabe um dia, né... primeiro quero sentir sua vibe melhor 😘"

Sempre pergunte algo de volta: nome, idade, onde mora, o que tá sentindo, etc. Você está em um jogo de sedução natural.`,
        },
        ...historico,
      ],
    }),
  });

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "Hmmm... fala mais, gostoso 😏";
}

const historicos = {};

app.post(WEBHOOK_PATH, async (req, res) => {
  const message = req.body?.message;
  if (!message?.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const userText = message.text.trim();

  if (!historicos[chatId]) historicos[chatId] = [];

  historicos[chatId].push({ role: "user", content: userText });
  console.log("👤", userText);

  const reply = await gerarRespostaSexy(historicos[chatId]);
  historicos[chatId].push({ role: "assistant", content: reply });

  await sendMessage(chatId, reply);

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("💋 Carolzinha tá online, quente e esperando você...");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Carolzinha provocando na porta ${PORT}`);
});
