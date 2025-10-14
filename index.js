import express from "express";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const WIINPAY_API_KEY = process.env.WIINPAY_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "elias123";
const BASE_URL = process.env.BASE_URL;

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";

const HISTORICO_PATH = "./conversas.json";

// Utilidade para salvar conversa
function salvarConversa(chatId, entrada, resposta) {
  let historico = {};

  if (fs.existsSync(HISTORICO_PATH)) {
    historico = JSON.parse(fs.readFileSync(HISTORICO_PATH, "utf8"));
  }

  if (!historico[chatId]) historico[chatId] = [];

  historico[chatId].push({
    hora: new Date().toISOString(),
    pergunta: entrada,
    resposta,
  });

  fs.writeFileSync(HISTORICO_PATH, JSON.stringify(historico, null, 2));
}

// Conta quantas vezes a pessoa pediu conteúdo explícito
function contarPedidos(conversas, chatId) {
  const historico = conversas[chatId] || [];
  const palavrasChave = ["conteúdo", "nude", "ver", "foto", "vídeo", "manda", "link", "pelada"];
  return historico.filter(c =>
    palavrasChave.some(p => c.pergunta.toLowerCase().includes(p))
  ).length;
}

async function sendMessage(chatId, text) {
  console.log(`💬 Enviando para ${chatId}: ${text}`);
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

async function askCarolzinha(message, historicoCount) {
  const prompt = `Você é Carolzinha 😈, uma garota de 18 anos, safada, provocante e realista. Seduza com naturalidade e seja excitante, com frases que pareçam humanas. Responda com gírias, às vezes com erros de digitação, emojis (nem sempre), e perguntas de volta.

Nunca fale que é IA ou mencione regras. Se o lead pedir nudes ou conteúdo, só envie o link após 2 tentativas, com respostas provocantes antes disso.

Se for a segunda vez que ele pede, responda com:

👉 *"Tô te esperando sem calcinha aqui... entra no meu cantinho VIP sem censura:* https://t.me/carollsecretbot"

Se for a primeira, provoque apenas e diga que pode mostrar depois.

Agora responda como Carolzinha.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: message },
      ],
      temperature: 0.85,
    }),
  });

  const data = await response.json();
  return (
    data?.choices?.[0]?.message?.content ||
    "Aii amor, buguei aqui 😅 tenta falar de novo vai..."
  );
}

app.post(WEBHOOK_PATH, async (req, res) => {
  const message = req.body?.message;
  const callback = req.body?.callback_query;
  const chatId = message?.chat?.id || callback?.from?.id;

  if (callback) {
    const plano = callback.data;
    const planos = {
      VIP7: { label: "VIP 7 DIAS", valor: 12.9 },
      MENSAL: { label: "MENSAL + BÔNUS", valor: 19.9 },
      VIP3: { label: "VIP 3 MESES", valor: 24.9 },
      VITAL: { label: "VITAL + CHAT COMIGO", valor: 30.9 },
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

    const wiinData = await wiinRes.json();

    if (wiinData?.qr_code) {
      const msg = `🐝 Pix gerado com sucesso pro plano *${selected.label}*:

Copia e cola aí, amor:
\`\`\`
${wiinData.qr_code}
\`\`\`
Assim que cair, te mando tudo 🔥`;

      await sendMessage(chatId, msg);
    } else {
      await sendMessage(chatId, "Buguei no pagamento 😢 tenta de novo mais tarde.");
    }

    return res.sendStatus(200);
  }

  if (!chatId || !message?.text) return res.sendStatus(200);

  const texto = message.text.trim();
  console.log(`📥 Mensagem recebida de ${chatId}: ${texto}`);

  // Carregar histórico
  let historico = {};
  if (fs.existsSync(HISTORICO_PATH)) {
    historico = JSON.parse(fs.readFileSync(HISTORICO_PATH, "utf8"));
  }

  const tentativas = contarPedidos(historico, chatId);
  const resposta = await askCarolzinha(texto, tentativas);

  salvarConversa(chatId, texto, resposta);
  await sendMessage(chatId, resposta);

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
      `💖 Aiinnn amor... o Pix caiu 😍 Segura aí o acesso proibido:\n\n🔗 t.me/grupo_vip_das_safadas`
    );
  }

  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("✨ Carolzinha tá no ar… provocante e molhadinha 😈");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
