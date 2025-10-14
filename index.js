import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const WIINPAY_API_KEY = process.env.WIINPAY_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "elias123";
const BASE_URL = process.env.BASE_URL || "https://carolzinha-gpt.onrender.com";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";

// Caminho do arquivo local de armazenamento
const CONVERSAS_PATH = path.resolve("conversas.json");

// Cria ou lê arquivo de conversas
function salvarConversa(chatId, role, text) {
  let dados = {};
  try {
    if (fs.existsSync(CONVERSAS_PATH)) {
      dados = JSON.parse(fs.readFileSync(CONVERSAS_PATH));
    }
  } catch (err) {
    console.error("Erro ao ler conversas:", err);
  }

  if (!dados[chatId]) dados[chatId] = [];

  dados[chatId].push({
    from: role,
    text,
    timestamp: new Date().toISOString(),
  });

  fs.writeFileSync(CONVERSAS_PATH, JSON.stringify(dados, null, 2));
}

// Delay aleatório entre 8 a 14 segundos
function delayAleatorio() {
  const segundos = Math.floor(Math.random() * 7) + 8;
  return new Promise((res) => setTimeout(res, segundos * 1000));
}

// Envia "digitando..."
async function sendTyping(chatId) {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  });
}

// Envia mensagem
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

// Prompt completo sem resumo
async function gerarRespostaSexy(userMsg) {
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

NÃO diga que o conteúdo é pago. Diga que é seu cantinho, seu segredo, seu lugar sem censura.
          `,
        },
        { role: "user", content: userMsg },
      ],
    }),
  });

  const data = await response.json();
  return (
    data?.choices?.[0]?.message?.content || "Hmm... repete isso, gostoso 😏"
  );
}

// Recebe mensagens do Telegram
app.post(WEBHOOK_PATH, async (req, res) => {
  const message = req.body?.message;
  if (!message?.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const userText = message.text.trim();
  const nome = message.from?.first_name || "Amor";

  console.log(`👤 ${nome} (${chatId}): ${userText}`);
  salvarConversa(chatId, "user", userText);

  // Ignorar comandos
  if (userText === "/start") return res.sendStatus(200);

  try {
    await sendTyping(chatId);
    await delayAleatorio();

    const reply = await gerarRespostaSexy(userText);
    salvarConversa(chatId, "bot", reply);

    await sendMessage(chatId, reply);
  } catch (err) {
    console.error("❌ Erro ao responder:", err);
    await sendMessage(chatId, "Aiin... buguei aqui 😔 tenta de novo...");
  }

  res.sendStatus(200);
});

// Webhook da Wiinpay
app.post("/webhook-wiinpay", async (req, res) => {
  const body = req.body;
  const metadata = body?.metadata || {};

  if (metadata.secret !== WEBHOOK_SECRET)
    return res.status(401).send("Acesso negado");

  if (["pago", "aprovado"].includes(body.status)) {
    const chatId = metadata.chat_id;
    await sendMessage(
      chatId,
      `💖 Aiiiinnn amorrr... o Pix caiu aqui 😍 Toma aqui o conteúdo proibido:\n\n🔗 t.me/grupo_vip_das_safadas`
    );
  }

  res.sendStatus(200);
});

// Rota raiz
app.get("/", (req, res) => {
  res.send("💋 Carolzinha tá online e molhadinha pra te provocar...");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Carolzinha gemendo na porta ${PORT}`);
});
