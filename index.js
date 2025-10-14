// index.js - Carolzinha (fluxo WiinPay / conteúdo VIP)
import express from "express";
import fetch from "node-fetch";
import fs from "fs/promises";
import path from "path";

const app = express();
app.use(express.json());

// CONFIG (via env on Render)
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const WIINPAY_API_KEY = process.env.WIINPAY_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "elias123";
const BASE_URL = process.env.BASE_URL || "https://carolzinha-gpt.onrender.com";

if (!TELEGRAM_TOKEN) console.warn("⚠️ TELEGRAM_TOKEN não definido");
if (!WIINPAY_API_KEY) console.warn("⚠️ WIINPAY_API_KEY não definido");

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";
const WIINPAY_ENDPOINT = "https://api.wiinpay.com.br/payment/create"; // endpoint usado antes

// conteúdo/planos (você pediu 2 planos)
const CONTENT_LINK = "https://t.me/+HbdMl3ep3FtmODlh";
const PLANS = {
  VIP14: {
    code: "VIP14",
    label: "Pack Quente - R$14,99",
    price: 14.99,
    desc: "Fotos exclusivas + 5 stories sensuais (preview)",
  },
  VIP29: {
    code: "VIP29",
    label: "Full VIP - R$29,99",
    price: 29.99,
    desc: "Vídeo privado + conteúdo sem censura e chat VIP por 24h",
  },
};

// storage de tentativas / estado
const attempts = new Map(); // chatId -> { choiceAttempts: number }
const CONV_FILE = path.resolve("./conversations.json");

// helper: log + save conversas
async function appendConversation(chatId, role, text) {
  try {
    const entry = {
      ts: new Date().toISOString(),
      chatId,
      role,
      text,
    };
    let arr = [];
    try {
      const raw = await fs.readFile(CONV_FILE, "utf8");
      arr = JSON.parse(raw || "[]");
    } catch (e) {
      // não existe: cria
      arr = [];
    }
    arr.push(entry);
    await fs.writeFile(CONV_FILE, JSON.stringify(arr, null, 2), "utf8");
  } catch (err) {
    console.error("❌ Erro salvando conversa:", err);
  }
}

// envia ação "typing" pro Telegram e aguarda delay (8-14s)
async function typingDelay(chatId, min = 8000, max = 14000) {
  try {
    await fetch(`${TELEGRAM_API}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    });
  } catch (e) {
    console.warn("⚠️ Erro sendChatAction:", e.message || e);
  }
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((r) => setTimeout(r, ms));
}

// envia mensagem e registra log
async function sendMessage(chatId, text, parse_mode = "Markdown") {
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode }),
    });
    const data = await res.json();
    console.log("📩 sendMessage resposta:", data?.ok ? "ok" : "erro", {
      chatId,
      text: text.length > 120 ? text.slice(0, 120) + "..." : text,
      result: data?.result?.message_id,
    });
    await appendConversation(chatId, "bot", text);
    return data;
  } catch (err) {
    console.error("❌ Erro sendMessage:", err);
  }
}

// Cria pagamento na WiinPay
async function createWiinPayment(chatId, plan) {
  try {
    const body = {
      api_key: WIINPAY_API_KEY,
      value: plan.price,
      name: `cliente_${chatId}`,
      email: `carolzinha_${chatId}@botvip.com`,
      description: plan.label,
      webhook_url: `${BASE_URL}/webhook-wiinpay`,
      metadata: {
        chat_id: String(chatId),
        plan: plan.code,
        secret: WEBHOOK_SECRET,
      },
    };
    console.log("➡️ Criando pagamento WiinPay:", { chatId, plan: plan.code });
    const res = await fetch(WIINPAY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    console.log("⬅️ WiinPay resposta:", data);
    return data;
  } catch (err) {
    console.error("❌ Erro createWiinPayment:", err);
    return null;
  }
}

// Rota do webhook do Telegram
app.post(WEBHOOK_PATH, async (req, res) => {
  console.log("🛰️ Webhook Telegram recebido:", JSON.stringify(req.body?.message?.text || req.body, null, 0));
  const message = req.body?.message;
  if (!message) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = (message.text || "").trim();

  // salvar a mensagem do usuário
  await appendConversation(chatId, "user", text);

  // ignore bots
  if (message.from?.is_bot) return res.sendStatus(200);

  // comandos básicos
  if (text === "/start") {
    await typingDelay(chatId, 1000, 2000); // resposta rápida
    const welcome = `Oi, delícia 😏\nEu sou a *Carolzinha* — quer esquentar agora? Pergunta o que quer ver ou digita *conteúdos* pra eu te mostrar os packs.`;
    await sendMessage(chatId, welcome);
    return res.sendStatus(200);
  }

  // usuário pede 'conteúdos' ou algo similar
  const lower = text.toLowerCase();
  if (["conteudos", "conteúdo", "conteúdos", "quero ver", "o que você tem", "me manda seus conteudos", "vender"].some(k => lower.includes(k))) {
    // responde com lista de planos e descrição
    await typingDelay(chatId);
    const lines = [
      "🔥 Tenho packs quentes pra você, amorzinho. Escolhe o que quer:",
      ``,
      `1) *${PLANS.VIP14.label}* — ${PLANS.VIP14.desc} — digita: \`vip14\``,
      `2) *${PLANS.VIP29.label}* — ${PLANS.VIP29.desc} — digita: \`vip29\``,
      ``,
      `Me fala qual pack você quer (digita o código: vip14 ou vip29) 💋`,
    ];
    await sendMessage(chatId, lines.join("\n"));
    return res.sendStatus(200);
  }

  // se usuário digitou o código do plano
  if (["vip14", "vip29"].includes(lower)) {
    const plan = lower === "vip14" ? PLANS.VIP14 : PLANS.VIP29;
    // tentativa de provocação antes de cobrar: conta tentativas
    const s = attempts.get(chatId) || { choiceAttempts: 0 };
    s.choiceAttempts = (s.choiceAttempts || 0) + 1;
    attempts.set(chatId, s);

    // primeiro e segundo toque: provoca mais antes de criar cobrança
    if (s.choiceAttempts < 2) {
      await typingDelay(chatId);
      const tease = [
        `Hmmmm, sabia que você ia querer *${plan.label.split("-")[0].trim()}*... 😈`,
        `Só confirma pra mim: tá sozinho aí agora? Quer que eu libere já ou prefere um gostinho primeiro?`,
      ].join("\n");
      await sendMessage(chatId, tease);
      return res.sendStatus(200);
    }

    // a partir da 2ª tentativa, cria cobrança
    await typingDelay(chatId);
    const creatingMsg = `Certo, amor. Vou gerar o Pix de R$${plan.price.toFixed(2)} pra liberar o *${plan.label.split("-")[0].trim()}*... espera só um pouquinho 🌶️`;
    await sendMessage(chatId, creatingMsg);

    const wiinData = await createWiinPayment(chatId, plan);
    // checa campos que WiinPay retorna (várias versões: pix.copiaecola ou qr_code)
    const copia = wiinData?.pix?.copiaecola || wiinData?.qr_code || wiinData?.pix?.qr_code || wiinData?.pix?.code;

    if (copia) {
      const mensagem = [
        `🐝 Pix pronto pra *${plan.label.split("-")[0].trim()}*!`,
        ``,
        `Copia e cola aqui pra pagar rapidinho, amor:`,
        "```",
        `${copia}`,
        "```",
        ``,
        `Assim que o Pix cair eu libero o conteúdo no meu cantinho 😉`,
      ].join("\n");
      await sendMessage(chatId, mensagem);
    } else {
      console.warn("⚠️ não achei copiaecola/qr na resposta da WiinPay:", wiinData);
      await sendMessage(chatId, `Eita... não rolou gerar o Pix agora 😓 tenta dnv mais tarde, amor.`);
    }
    return res.sendStatus(200);
  }

  // perguntas pessoais (ex.: onde mora, idade, encontro)
  if (/(onde mora|mora onde|de onde|cidade|onde vc mora)/i.test(lower)) {
    await typingDelay(chatId);
    await sendMessage(chatId, "Moro em São Paulo, capital 😉");
    return res.sendStatus(200);
  }
  if (/(quantos anos|idade|tem quantos)/i.test(lower)) {
    await typingDelay(chatId);
    await sendMessage(chatId, "Tenho 18 anos 💋");
    return res.sendStatus(200);
  }
  if (/(encontrar|ver pessoalmente|se encontrar|tá afim de se encontrar)/i.test(lower)) {
    await typingDelay(chatId);
    await sendMessage(chatId, "Quem sabe um dia... primeiro a gente se conhece melhor por aqui, né? 😘");
    return res.sendStatus(200);
  }

  // default: resposta provocante curta; não manda link direto
  await typingDelay(chatId);
  const genericReplies = [
    "Ai, gostoso... conta mais o que você quer fazer comigo agora 😈",
    "Hmmm, já me deixou molhadinha só de imaginar... fala mais 😳",
    "Curte ver eu sem roupa ou prefere vídeo quente? Me diz que eu provo mais 😉",
  ];
  // escolhe uma aleatória
  const reply = genericReplies[Math.floor(Math.random() * genericReplies.length)];
  await sendMessage(chatId, reply);
  return res.sendStatus(200);
});

// webhook WiinPay - confirmação de pagamento
app.post("/webhook-wiinpay", async (req, res) => {
  console.log("📥 Webhook recebido do WiinPay:", JSON.stringify(req.body, null, 2));
  const body = req.body || {};
  // metadata pode vir como metadata ou metadados dependendo da versão
  const metadata = body.metadata || body.metadados || (body.dados && body.dados.metadata) || {};

  // valida segredo
  if (!metadata || metadata.secret !== WEBHOOK_SECRET) {
    console.warn("⚠️ Webhook WiinPay com segredo inválido:", metadata?.secret);
    return res.status(401).send("Acesso negado");
  }

  const status = (body.status || body.dados?.status || "").toLowerCase();
  console.log("🔔 WiinPay status:", status, "metadata:", metadata);

  // alguns payloads tem dados em body.dados ou body
  const chatId = metadata.chat_id || metadata.id_do_chat || metadata.id_chat;
  const planCode = metadata.plan || metadata.plano;

  if (!chatId) {
    console.warn("⚠️ Webhook WiinPay sem chatId em metadata:", metadata);
    return res.sendStatus(200);
  }

  // se pago, libera link
  if (["pago", "aprovado", "paid", "approved"].includes(status)) {
    // envia mensagem com link do conteúdo
    const text = `💖 O Pix caiu, gostoso! Tô liberando seu conteúdo agora... entra aqui 👉 ${CONTENT_LINK}\n\nVai lá que eu te espero no meu cantinho 🔥`;
    await sendMessage(chatId, text);
    console.log(`✅ Conteúdo liberado para chat ${chatId} plano ${planCode}`);
  } else {
    console.log("ℹ️ Pago não confirmado / status:", status);
  }

  // salvar log do webhook
  await appendConversation(chatId, "system", `wiinpay_webhook: status=${status} plan=${planCode}`);

  return res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("💅 Carolzinha online — use o bot no Telegram.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Carolzinha rodando na porta ${PORT}`);
});
