import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const WIINPAY_API_KEY = process.env.CHAVE_API_WIINPAY || process.env.WIINPAY_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "segredo123";
const BASE_URL = process.env.BASE_URL || "https://teubot.onrender.com";

console.log("🔧 Configs iniciais:", {
  TELEGRAM_TOKEN_exists: !!TELEGRAM_TOKEN,
  OPENAI_KEY_exists: !!OPENAI_KEY,
  WIINPAY_API_KEY,
  WEBHOOK_SECRET,
  BASE_URL,
});

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";

async function sendMessage(chatId, text) {
  try {
    const resp = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
    });
    console.log("✅ sendMessage resposta:", await resp.json());
  } catch (err) {
    console.error("❌ erro sendMessage:", err);
  }
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
            content: `
Você é a Carolzinha 😈, uma AI provocante que vende conteúdo adulto. Sempre leve o cara ao /comprar. Textos curtos. Use emojis.
`
          },
          { role: "user", content: message },
        ],
      }),
    });
    const data = await response.json();
    console.log("📡 askCarolzinha resposta:", data);
    return data?.choices?.[0]?.message?.content || "…";
  } catch (err) {
    console.error("❌ erro askCarolzinha:", err);
    return "Tive um bug aqui 😓";
  }
}

app.post(WEBHOOK_PATH, async (req, res) => {
  console.log("📬 Webhook recebido:", JSON.stringify(req.body));

  try {
    const message = req.body?.message;
    const callback = req.body?.callback_query;

    if (callback) {
      console.log("🎯 Callback detectado:", callback);
      const chatId = callback.from.id;
      const plano = callback.data;

      const planos = {
        VIP7: { label: "VIP 7 DIAS", valor: 12.9 },
        MENSAL: { label: "MENSAL + BÔNUS", valor: 19.9 },
        VIP3: { label: "VIP 3 MESES", valor: 24.9 },
        VITAL: { label: "VITAL + CHAT COMIGO", valor: 30.9 },
      };

      const selected = planos[plano];
      if (!selected) {
        console.log("⚠ plano inválido:", plano);
        return res.sendStatus(200);
      }

      console.log("💳 Tentando criar cobrança:", selected);

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
            chat_id: String(chatId),
            plan: plano,
            secret: WEBHOOK_SECRET,
          },
        }),
      });

      let wiinData;
      try {
        wiinData = await wiinRes.json();
      } catch (e) {
        console.error("❌ erro ao parsear WiinPay JSON:", e);
      }
      console.log("📦 Resposta WiinPay:", wiinData);

      if (wiinData?.pix?.copiaecola) {
        await sendMessage(chatId, `🐝 Pix gerado pra *${selected.label}*: \`\`\`${wiinData.pix.copiaecola}\`\`\``);
      } else {
        await sendMessage(chatId, "Eita... não rolou gerar Pix 😓");
      }

      return res.sendStatus(200);
    }

    if (message?.text === "/comprar") {
      const chatId = message.chat.id;
      console.log("📌 /comprar pedido de:", chatId);
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "🔥 Escolhe teu plano VIP, gostoso:",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔞 VIP 7 DIAS", callback_data: "VIP7" }],
              [{ text: "🔞 MENSAL + BÔNUS", callback_data: "MENSAL" }],
              [{ text: "🔞 VIP 3 MESES", callback_data: "VIP3" }],
              [{ text: "💬 VITAL + CHAT", callback_data: "VITAL" }],
            ],
          },
        }),
      });
      return res.sendStatus(200);
    }

    // mensagens genéricas
    const chatId = message?.chat?.id;
    const text = message?.text?.trim();
    if (!chatId || !text) {
      return res.sendStatus(200);
    }

    const reply = await askCarolzinha(text);
    await sendMessage(chatId, reply);
    return res.sendStatus(200);
  } catch (err) {
    console.error("❌ Erro genérico no webhook:", err);
    // mesmo assim retorna 200 pra Telegram
    return res.sendStatus(200);
  }
});

app.post("/webhook-wiinpay", async (req, res) => {
  console.log("🔌 Webhook WiinPay recebido:", JSON.stringify(req.body));
  const body = req.body;
  const metadata = body?.metadata || {};

  if (metadata.secret !== WEBHOOK_SECRET) {
    console.log("🚫 Secret inválido no webhook-wiinpay");
    return res.status(401).send("Acesso negado");
  }

  if (["pago", "aprovado"].includes(body.status)) {
    const chatId = metadata.chat_id;
    await sendMessage(chatId, `💖 Pix confirmado! Aqui está o conteúdo: t.me/grupo_vip_das_safadas`);
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("💅 Carolzinha pronta 😘");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Rodando na porta ${PORT}`);
});
