// index.js COMPLETO — Carolzinha GPT + Integração com WiinPay (CRASE FECHADA ✅)

import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const WIINPAY_API_KEY = process.env.WIINPAY_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "segredo123";
const BASE_URL = process.env.BASE_URL || "https://teubot.onrender.com";

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";

async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
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
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Você é a Carolzinha 😈 — modelo adulta que provoca, vende packs e faz o cliente abrir o pix sem vergonha.`
          },
          { role: "user", content: message },
        ],
      }),
    });

    const data = await response.json();
    return data?.choices?.[0]?.message?.content?.trim() || "Buguei toda 😅 repete aí, vai!";
  } catch (err) {
    console.error("❌ Erro com OpenAI:", err);
    return "Tive um bugzinho aqui 😓 tenta dnv!";
  }
}

app.post(WEBHOOK_PATH, async (req, res) => {
  const message = req.body?.message;
  const callback = req.body?.callback_query;

  if (callback) {
    const chatId = callback.from.id;
    const plano = callback.data;

    const planos = {
      VIP7: { label: "VIP 7 DIAS", valor: 12.90 },
      MENSAL: { label: "MENSAL + BÔNUS", valor: 19.90 },
      VIP3: { label: "VIP 3 MESES", valor: 24.90 },
      VITAL: { label: "VITAL + CHAT COMIGO", valor: 30.90 }
    };

    const selected = planos[plano];
    if (!selected) return res.sendStatus(200);

    const wiinRes = await fetch("https://api.wiinpay.com.br/payment/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: WIINPAY_API_KEY,
        value: selected.valor,
        name: `cliente_${chatId}`,
        email: `carolzinha_${chatId}@botdotesao.com`,
        description: selected.label,
        webhook_url: `${BASE_URL}/webhook-wiinpay`,
        metadata: {
          chat_id: String(chatId),
          plan: plano,
          secret: WEBHOOK_SECRET
        }
      })
    });

    const wiinData = await wiinRes.json();

    if (wiinData?.pix?.copiaecola) {
      await sendMessage(chatId, `🐝 Pix pro plano *${selected.label}* gerado!\n\nCopia e cola aí, amor:\n\n\\`\\`\\`\n${wiinData.pix.copiaecola}\n\\`\\`\\`\n\nAssim que cair, te mando tudinho 😈`);
    } else {
      await sendMessage(chatId, "Eita... bugou a cobrança 😓 tenta de novo mais tarde.");
    }

    return res.sendStatus(200);
  }

  if (message?.text === "/comprar") {
    const chatId = message.chat.id;

    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "🔥 Escolhe teu plano VIP, amorzinho:",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔞 VIP 7 DIAS - R$12,90", callback_data: "VIP7" }],
            [{ text: "🔞 MENSAL + BÔNUS - R$19,90", callback_data: "MENSAL" }],
            [{ text: "🔞 VIP 3 MESES - R$24,90", callback_data: "VIP3" }],
            [{ text: "💬 VITAL + CHAT COMIGO - R$30,90", callback_data: "VITAL" }]
          ]
        }
      })
    });

    return res.sendStatus(200);
  }

  const chatId = message?.chat?.id;
  const text = message?.text?.trim();
  if (!chatId || !text) return res.sendStatus(200);

  const reply = await askCarolzinha(text);
  await sendMessage(chatId, reply);
  res.sendStatus(200);
});

app.post("/webhook-wiinpay", async (req, res) => {
  const body = req.body;
  const metadata = body?.metadata || {};

  if (metadata.secret !== WEBHOOK_SECRET) return res.status(401).send("acesso negado");

  if (body.status === "pago" || body.status === "aprovado") {
    const chatId = metadata.chat_id;
    console.log(`✅ Pix confirmado do chat ${chatId}`);

    await sendMessage(chatId, `💖 Aiiiinnn amorrr... o Pix caiu aqui 😍 Toma aqui o conteúdo proibido:

🔗 t.me/grupo_vip_das_safadas`);
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("💅 Carolzinha está online e molhadinha 😘");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
