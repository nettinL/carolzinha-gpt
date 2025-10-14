// index.js
import express from "express";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const WIINPAY_API_KEY = process.env.WIINPAY_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const BASE_URL = process.env.BASE_URL || "https://carolzinha-gpt.onrender.com";

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";

const CONTEUDO_LINK = "https://t.me/+HbdMl3ep3FtmODlh";

const planos = {
  BASIC: {
    label: "Pacote Básico - R$14,99",
    valor: 14.99,
    descricao: "🔞 Fotos íntimas exclusivas + 1 vídeo proibido 😈"
  },
  PREMIUM: {
    label: "Pacote Premium - R$29,99",
    valor: 29.99,
    descricao: "👅 Pack completo com vídeos explícitos, áudios gemendo e nudes em posições proibidas 💦"
  }
};

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function salvarConversa(chatId, userMsg, botMsg) {
  const logPath = `logs/${chatId}.json`;
  const data = { timestamp: new Date().toISOString(), userMsg, botMsg };
  let historico = [];
  if (fs.existsSync(logPath)) {
    historico = JSON.parse(fs.readFileSync(logPath));
  }
  historico.push(data);
  fs.writeFileSync(logPath, JSON.stringify(historico, null, 2));
}

async function sendMessage(chatId, text) {
  await delay(Math.floor(Math.random() * 6000 + 8000)); // Delay entre 8s e 14s
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown"
    })
  });
}

async function gerarResposta(chatId, userMsg, tentativa = 1) {
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
Você é Carolzinha 😈, uma mulher provocante e safada que vende conteúdo adulto de verdade. Seu objetivo é deixar o cara maluco de tesão, respondendo como se fosse uma mulher de 18 anos, de São Paulo, muito fogosa e que ama conversar sacanagem. Use gírias, emojis safados às vezes, responda com naturalidade e curiosidade.

⚠️ Nunca diga que é IA. Nunca mencione código, programação ou OpenAI.

Se perguntarem:
- Onde mora? → "Sou de SP, capital... e você, gostoso?"
- Idade? → "18 aninhos... bem novinha né?"
- Vai se encontrar? → "Quem sabe um dia... antes quero te conhecer melhor por aqui 😏"

Se o usuário perguntar sobre conteúdo, nudes, vídeos etc, ofereça:
1. O pacote básico de R$14,99 com fotos e um vídeo íntimo.
2. O pacote premium de R$29,99 com vídeos explícitos, áudios e nudes completos.

Depois da segunda tentativa de provocação ou quando o clima estiver quente, mande direto o botão pra ele escolher o plano e gere o Pix automaticamente.

Nunca diga que é pago. Fale como se fosse "meu cantinho privado".

Responda curto, realista, e sempre que possível, devolva com uma pergunta tipo:
- "Você gosta de bunda grande?"
- "Tá sozinho agora?"
- "Gosta mais por cima ou por trás?"
          `
        },
        { role: "user", content: userMsg }
      ]
    })
  });

  const data = await response.json();
  const botMsg =
    data?.choices?.[0]?.message?.content ||
    (tentativa < 2
      ? await gerarResposta(chatId, userMsg, tentativa + 1)
      : "Hmmm... fiquei sem palavras agora, amorzinho 😏");

  salvarConversa(chatId, userMsg, botMsg);
  return botMsg;
}

app.post(WEBHOOK_PATH, async (req, res) => {
  const msg = req.body?.message;
  const cb = req.body?.callback_query;

  if (cb) {
    const chatId = cb.from.id;
    const plano = cb.data;
    const selected = planos[plano];
    if (!selected) return res.sendStatus(200);

    const wiinRes = await fetch("https://api.wiinpay.com.br/payment/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: WIINPAY_API_KEY,
        value: selected.valor,
        name: `cliente_${chatId}`,
        email: `cliente_${chatId}@carol.com`,
        description: selected.label,
        webhook_url: `${BASE_URL}/webhook-wiinpay`,
        metadata: {
          chat_id: String(chatId),
          plan: plano,
          secret: WEBHOOK_SECRET,
        },
      }),
    });

    const wiinData = await wiinRes.json();
    if (wiinData?.qr_code) {
      await sendMessage(
        chatId,
        `Pix gerado com sucesso para o plano *${selected.label}*:

Copia e cola esse código:
\`\`\`
${wiinData.qr_code}
\`\`\`

Assim que cair, te libero tudinho aqui mesmo 😈`
      );
    } else {
      await sendMessage(chatId, "Buguei tentando gerar o Pix... tenta de novo, lindão 😔");
    }
    return res.sendStatus(200);
  }

  if (msg?.text === "/comprar") {
    const chatId = msg.chat.id;
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "Escolhe teu pacotinho de prazer 💦",
        reply_markup: {
          inline_keyboard: [
            [{ text: planos.BASIC.label, callback_data: "BASIC" }],
            [{ text: planos.PREMIUM.label, callback_data: "PREMIUM" }],
          ],
        },
      }),
    });
    return res.sendStatus(200);
  }

  if (msg?.text) {
    const chatId = msg.chat.id;
    const userMsg = msg.text.trim();
    const resposta = await gerarResposta(chatId, userMsg);
    await sendMessage(chatId, resposta);
  }

  res.sendStatus(200);
});

app.post("/webhook-wiinpay", async (req, res) => {
  const body = req.body;
  const metadata = body?.metadata || {};

  if (metadata.secret !== WEBHOOK_SECRET)
    return res.status(401).send("Acesso negado");

  if (["pago", "aprovado"].includes(body.status)) {
    const chatId = metadata.chat_id;
    await sendMessage(
      chatId,
      `Aiinn amor... o Pix caiu 😍 Aqui tá o link do meu conteúdo:
${CONTEUDO_LINK}`
    );
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("🔥 Carolzinha tá on, molhadinha e te esperando...");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor subindo na porta ${PORT}`);
});
