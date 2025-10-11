import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const WIINPAY_API_KEY = process.env.WIINPAY_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "segredo123";
const BASE_URL = process.env.BASE_URL || "https://carolzinha-gpt.onrender.com";

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";

async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    }),
  });
}

async function gerarPagamento(chatId, plano) {
  const planos = {
    VIP7: { label: "VIP 7 DIAS", valor: 12.9 },
    MENSAL: { label: "MENSAL + BÔNUS", valor: 19.9 },
    VIP3: { label: "VIP 3 MESES", valor: 24.9 },
    VITAL: { label: "VITAL + CHAT COMIGO", valor: 30.9 },
  };

  const selected = planos[plano];
  if (!selected) return null;

  const wiinRes = await fetch("https://api.wiinpay.com.br/payment/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: WIINPAY_API_KEY,
      value: selected.valor,
      name: `cliente_${chatId}`,
      email: `carolzinha_${chatId}@botgostoso.com`,
      description: selected.label,
      webhook_url: `${BASE_URL}/webhook-wiinpay`,
      metadata: { chat_id: String(chatId), plan: plano, secret: WEBHOOK_SECRET },
    }),
  });

  const data = await wiinRes.json();
  return data?.pix?.link || data?.pix?.copiaecola || null;
}

async function askCarolzinha(message) {
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
          content: `Você é a Carolzinha 😈, uma AI provocante que vende conteúdo adulto. Sua missão é excitar, provocar e induzir o lead a digitar /comprar. Seja curta, direta, cheia de tesão e use emojis safados.`,
        },
        { role: "user", content: message },
      ],
    }),
  });

  const data = await response.json();
  return (
    data?.choices?.[0]?.message?.content ||
    "Buguei aqui, amorzinho 😅 repete pra mim..."
  );
}

app.post(WEBHOOK_PATH, async (req, res) => {
  const message = req.body?.message;
  const chatId = message?.chat?.id;
  const text = message?.text?.trim();
  if (!chatId || !text) return res.sendStatus(200);

  if (text === "/comprar") {
    const planos = ["VIP7", "MENSAL", "VIP3", "VITAL"];
    const links = await Promise.all(
      planos.map((plano) => gerarPagamento(chatId, plano))
    );

    const resposta = `🔥 Escolhe teu plano VIP, amorzinho:

🔞 *VIP 7 DIAS* - R$12,90  
👉 [Pagar agora](${links[0]})

🔞 *MENSAL + BÔNUS* - R$19,90  
👉 [Pagar agora](${links[1]})

🔞 *VIP 3 MESES* - R$24,90  
👉 [Pagar agora](${links[2]})

💬 *VITAL + CHAT COMIGO* - R$30,90  
👉 [Pagar agora](${links[3]})

Tô molhadinha só de ver você aqui 😈`;

    await sendMessage(chatId, resposta);
    return res.sendStatus(200);
  }

  if (message.from?.is_bot) return res.sendStatus(200);

  const comandos = ["/start", "/comprar"];
  if (comandos.includes(text)) return res.sendStatus(200);

  const reply = await askCarolzinha(text);
  await sendMessage(chatId, reply);
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
      `💖 Aiiiinnn amorrr... o Pix caiu aqui 😍 Toma aqui o conteúdo proibido:\n\n🔗 t.me/grupo_vip_das_safadas`
    );
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("💅 Carolzinha tá online, molhadinha e pronta 😘");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
