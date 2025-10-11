import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const WIINPAY_API_KEY = process.env.WIINPAY_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "elias123";
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
Você é a Carolzinha 😈, uma AI provocante que vende conteúdo adulto. Sua missão é excitar, provocar e induzir o lead a digitar /comprar ou dizer o nome do plano. 
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

const planos = {
  VIP7: { label: "VIP 7 DIAS", valor: 12.9, keywords: ["vip 7", "7 dias"] },
  MENSAL: { label: "MENSAL + BÔNUS", valor: 19.9, keywords: ["mensal", "30 dias"] },
  VIP3: { label: "VIP 3 MESES", valor: 24.9, keywords: ["3 meses", "trimestre"] },
  VITAL: { label: "VITAL + CHAT COMIGO", valor: 30.9, keywords: ["vital", "chat comigo"] },
};

function detectarPlano(texto) {
  const normalized = texto.toLowerCase();
  for (const [chave, plano] of Object.entries(planos)) {
    if (plano.keywords.some(k => normalized.includes(k))) {
      return chave;
    }
  }
  return null;
}

async function gerarCobranca(chatId, planoKey) {
  const selected = planos[planoKey];
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
        plan: planoKey,
        secret: WEBHOOK_SECRET,
      },
    }),
  });

  const wiinData = await wiinRes.json();

  if (wiinData?.qr_code) {
    const mensagem = `🐝 Pix pro plano *${selected.label}* gerado!\n\nCopia e cola aí, amor:\n\n\`\`\`\n${wiinData.qr_code}\n\`\`\`\n\nAssim que cair, te mando tudinho 😈`;
    await sendMessage(chatId, mensagem);
  } else {
    await sendMessage(chatId, "Eita... bugou a cobrança 😓 tenta de novo mais tarde.");
  }
}

app.post(WEBHOOK_PATH, async (req, res) => {
  const message = req.body?.message;
  const callback = req.body?.callback_query;

  // Botão clicado (opcional)
  if (callback) {
    const chatId = callback.from.id;
    const plano = callback.data;
    if (planos[plano]) {
      await gerarCobranca(chatId, plano);
    }
    return res.sendStatus(200);
  }

  if (!message?.text || !message.chat?.id) return res.sendStatus(200);

  const chatId = message.chat.id;
  const texto = message.text.toLowerCase().trim();

  // Se for /comprar
  if (texto === "/comprar") {
    const opcoes = Object.entries(planos)
      .map(([_, p]) => `🔞 *${p.label}* - R$${p.valor.toFixed(2)}\n👉 Digita: *${p.keywords[0]}*`)
      .join("\n\n");
    await sendMessage(chatId, `🔥 Escolhe teu plano VIP, amorzinho:\n\n${opcoes}`);
    return res.sendStatus(200);
  }

  // Detectar plano digitado diretamente
  const planoDetectado = detectarPlano(texto);
  if (planoDetectado) {
    await gerarCobranca(chatId, planoDetectado);
    return res.sendStatus(200);
  }

  // Caso contrário, responde como Carolzinha
  const resposta = await askCarolzinha(texto);
  await sendMessage(chatId, resposta);

  res.sendStatus(200);
});

// Webhook de confirmação de pagamento
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

// Página raiz
app.get("/", (req, res) => {
  res.send("💅 Carolzinha tá online, molhadinha e pronta 😘");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
