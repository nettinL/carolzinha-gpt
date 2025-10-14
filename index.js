import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

// Cria o diretório 'logs' se não existir
const logsDir = path.resolve("logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const WIINPAY_API_KEY = process.env.WIINPAY_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "elias123";
const BASE_URL = process.env.BASE_URL || "https://carolzinha-gpt.onrender.com";

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";
const CONTENT_LINK = "https://t.me/+HbdMl3ep3FtmODlh";

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

function salvarConversa(chatId, userMsg, botMsg) {
  const logPath = path.join("logs", `${chatId}.json`);
  let historico = [];
  if (fs.existsSync(logPath)) {
    historico = JSON.parse(fs.readFileSync(logPath));
  }
  historico.push({ usuario: userMsg, bot: botMsg });
  fs.writeFileSync(logPath, JSON.stringify(historico, null, 2));
}

async function askCarolzinha(message) {
  const prompt = [
    {
      role: "system",
      content: `Você é a Carolzinha, uma mulher provocante, safada e cheia de segundas intenções. Sua missão é conversar de forma sensual com o usuário até deixá-lo interessado em ver seus conteúdos exclusivos. NÃO envie links diretamente.

- Se o cara perguntar sobre conteúdo, diga que você tem dois planos:
  1. *Plano Tesão* - R$14,99: fotos + áudios gemendo + textos proibidos
  2. *Plano Delírio* - R$29,99: inclui tudo + vídeos + chamadas gravadas + bastidores

- Diga que se ele quiser algum plano, é só dizer qual quer.
- Quando ele escolher, gere o pagamento via WiinPay.
- NUNCA fale que é uma IA, OpenAI, etc.
- Fale sempre de forma quente, com emojis, sem exagerar nas maiúsculas.
- Não envie o link do conteúdo antecipadamente.`,
    },
    { role: "user", content: message },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({ model: "gpt-4o", messages: prompt }),
  });

  const data = await res.json();
  return (
    data?.choices?.[0]?.message?.content ||
    "Buguei aqui, amorzinho 😅 repete pra mim..."
  );
}

app.post(WEBHOOK_PATH, async (req, res) => {
  const msg = req.body?.message;
  const chatId = msg?.chat?.id;
  const text = msg?.text?.trim();
  if (!chatId || !text) return res.sendStatus(200);

  // Se escolher plano
  const planos = {
    "14,99": { valor: 14.99, nome: "Plano Tesão" },
    "29,99": { valor: 29.99, nome: "Plano Delírio" },
  };
  const escolhido = Object.keys(planos).find((p) => text.includes(p));
  if (escolhido) {
    const plano = planos[escolhido];
    const wiin = await fetch("https://api.wiinpay.com.br/payment/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: WIINPAY_API_KEY,
        value: plano.valor,
        name: `cliente_${chatId}`,
        email: `carolzinha_${chatId}@botgostoso.com`,
        description: plano.nome,
        webhook_url: `${BASE_URL}/webhook-wiinpay`,
        metadata: {
          chat_id: String(chatId),
          plano: plano.nome,
          secret: WEBHOOK_SECRET,
        },
      }),
    });

    const pagamento = await wiin.json();
    if (pagamento?.qr_code) {
      await sendMessage(
        chatId,
        `🔥 Pix gerado pro *${plano.nome}*!

Copia e cola:

${pagamento.qr_code}

Assim que cair, te mando tudinho 😈`
      );
    } else {
      await sendMessage(chatId, "Erro ao gerar pagamento 😢 tenta mais tarde.");
    }
    return res.sendStatus(200);
  }

  const reply = await askCarolzinha(text);
  salvarConversa(chatId, text, reply);
  await sendMessage(chatId, reply);
  res.sendStatus(200);
});

app.post("/webhook-wiinpay", async (req, res) => {
  const data = req.body;
  const meta = data?.metadata || {};

  if (meta.secret !== WEBHOOK_SECRET) return res.sendStatus(401);
  if (["pago", "aprovado"].includes(data.status)) {
    await sendMessage(
      meta.chat_id,
      `💖 Aiii amorrr... o pix caiu aqui 😍 Toma tudinho:

🔗 ${CONTENT_LINK}`
    );
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("💅 Carolzinha online e molhadinha, amor...");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🔥 Servidor rodando na porta " + PORT));
