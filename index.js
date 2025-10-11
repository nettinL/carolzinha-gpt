import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const WIINPAY_API_KEY = process.env.WIINPAY_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "elias123"; // Corrigido aqui
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
    }),
  });
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
          content: `
Você é a Carolzinha 😈, uma AI provocante que vende conteúdo adulto. Sua missão é excitar, provocar e induzir o lead a digitar /comprar. 
Seja curta, direta, cheia de tesão e use emojis safados.

Exemplos:
- "Quer me ver sem nada, gostoso? Digita /comprar 😘🔥"
- "Cai dentro, vai resistir ao proibido? 😈 /comprar"
- "Já tô molhadinha só de imaginar você olhando 😳... digita /comprar"
          `,
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
  const text = message?.text?.trim().toLowerCase();
  if (!chatId || !text) return res.sendStatus(200);

  // Exibe planos
  if (text === "/comprar") {
    await sendMessage(
      chatId,
      "🔥 Escolhe teu plano VIP, amorzinho:\n\n🔞 VIP 7 DIAS - R$12.90\n👉 Digita: *vip 7*\n\n🔞 MENSAL + BÔNUS - R$19.90\n👉 Digita: *mensal*\n\n🔞 VIP 3 MESES - R$24.90\n👉 Digita: *3 meses*\n\n🔞 VITAL + CHAT COMIGO - R$30.90\n👉 Digita: *vital*"
    );
    return res.sendStatus(200);
  }

  // Planos disponíveis
  const planos = {
    "vip 7": { label: "VIP 7 DIAS", valor: 12.9 },
    mensal: { label: "MENSAL + BÔNUS", valor: 19.9 },
    "3 meses": { label: "VIP 3 MESES", valor: 24.9 },
    vital: { label: "VITAL + CHAT COMIGO", valor: 30.9 },
  };

  const selected = planos[text];
  if (selected) {
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
        metadata: {
          id_do_chat: String(chatId),
          plano: text,
          segredo: WEBHOOK_SECRET,
        },
      }),
    });

    const wiinData = await wiinRes.json();
    console.log("📦 Dados recebidos do WiinPay:", wiinData);

    const qrCode = wiinData?.dados?.qr_code;
    if (qrCode) {
      const mensagem = `🐝 Pix pro plano *${selected.label}* gerado!\n\nCopia e cola aí, amor:\n\n\
\
\`\`\`
${qrCode}
\`\`\`
\nAssim que cair, te mando tudinho 😈`;
      await sendMessage(chatId, mensagem);
    } else {
      await sendMessage(
        chatId,
        "Eita... bugou a cobrança 😓 tenta de novo mais tarde."
      );
    }
    return res.sendStatus(200);
  }

  // Resposta padrão da Carolzinha
  const reply = await askCarolzinha(text);
  await sendMessage(chatId, reply);
  res.sendStatus(200);
});

app.post("/webhook-wiinpay", async (req, res) => {
  const body = req.body;
  const metadata = body?.metadata || {};

  if (metadata.segredo !== WEBHOOK_SECRET)
    return res.status(401).send("Acesso negado");

  if (["pago", "aprovado"].includes(body.status)) {
    const chatId = metadata.id_do_chat;
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
