import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// 🔐 Variáveis de ambiente (configure no Render)
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const WIINPAY_API_KEY = process.env.WIINPAY_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "elias123";
const BASE_URL = process.env.BASE_URL || "https://carolzinha-gpt.onrender.com";

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";

// 🔔 Envia mensagem no Telegram
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

// 🤖 Gera resposta da Carolzinha com OpenAI
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

// 📩 Recebe mensagens do Telegram
app.post(WEBHOOK_PATH, async (req, res) => {
  const message = req.body?.message;
  const text = message?.text?.toLowerCase();
  const chatId = message?.chat?.id;

  if (!chatId || !text) return res.sendStatus(200);

  // Comando de compra
  if (text === "/comprar") {
    await sendMessage(chatId, `🔥 Escolhe teu plano VIP, amorzinho:

🔞 *VIP 7 DIAS - R$12.90*
👉 Digita: *vip 7*

🔞 *MENSAL + BÔNUS - R$19.90*
👉 Digita: *mensal*

🔞 *VIP 3 MESES - R$24.90*
👉 Digita: *3 meses*

🔞 *VITAL + CHAT COMIGO - R$30.90*
👉 Digita: *vital*

Tô molhadinha só de ver você aqui 😈`);

    return res.sendStatus(200);
  }

  // Tratamento de compra via texto
  const planos = {
    "vip 7": { label: "VIP 7 DIAS", valor: 12.9 },
    "mensal": { label: "MENSAL + BÔNUS", valor: 19.9 },
    "3 meses": { label: "VIP 3 MESES", valor: 24.9 },
    "vital": { label: "VITAL + CHAT COMIGO", valor: 30.9 },
  };

  if (planos[text]) {
    const plano = planos[text];

    try {
      const wiinRes = await fetch("https://api.wiinpay.com.br/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: WIINPAY_API_KEY,
          value: plano.valor,
          name: `cliente_${chatId}`,
          email: `carolzinha_${chatId}@botgostoso.com`,
          description: plano.label,
          webhook_url: `${BASE_URL}/webhook-wiinpay`,
          metadata: {
            chat_id: String(chatId),
            plan: text,
            secret: WEBHOOK_SECRET,
          },
        }),
      });

      const wiinData = await wiinRes.json();

      if (wiinData?.qr_code) {
        await sendMessage(
          chatId,
          `🐝 Pix pro plano *${plano.label}* gerado!\n\nCopia e cola aí, amor:\n\n\`\`\`\n${wiinData.qr_code}\n\`\`\`\n\nAssim que cair, te mando tudinho 😈`
        );
      } else {
        await sendMessage(chatId, "Eita... bugou a cobrança 😓 tenta de novo mais tarde.");
      }
    } catch (err) {
      console.error("Erro ao gerar cobrança:", err);
      await sendMessage(chatId, "Deu ruim na hora de cobrar 😢 tenta mais tarde.");
    }

    return res.sendStatus(200);
  }

  // Mensagem comum → resposta da Carolzinha
  const resposta = await askCarolzinha(text);
  await sendMessage(chatId, resposta);

  res.sendStatus(200);
});

// ✅ Webhook da WiinPay (retorno do pagamento)
app.post("/webhook-wiinpay", async (req, res) => {
  const body = req.body;
  const metadata = body?.metadata || {};

  console.log("📩 Webhook recebido:", JSON.stringify(body, null, 2));

  if (metadata.secret !== WEBHOOK_SECRET) {
    console.log("❌ Segredo incorreto:", metadata.secret);
    return res.status(401).send("Acesso negado");
  }

  if (["pago", "aprovado"].includes(body.status)) {
    const chatId = metadata.chat_id;
    await sendMessage(
      chatId,
      `💖 Aiiiinnn amorrr... o Pix caiu aqui 😍 Toma aqui o conteúdo proibido:\n\n🔗 t.me/grupo_vip_das_safadas`
    );
  }

  res.sendStatus(200);
});

// 🌐 Página inicial
app.get("/", (req, res) => {
  res.send("💅 Carolzinha tá online, molhadinha e pronta 😘");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
