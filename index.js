// index.js
import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

// VARIÁVEIS DE AMBIENTE
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const BASE_URL = process.env.BASE_URL;
const API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const LINK_ONLYFANS = "https://t.me/carollsecretbot";

app.use(bodyParser.json());

// CONTROLE DE CONTEXTO
const userState = {};

// FUNÇÃO DE DELAY
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// FUNÇÃO PARA ENVIAR MENSAGEM
const sendMessage = async (chatId, text) => {
  await delay(8000 + Math.random() * 6000); // 8 a 14 segundos
  await fetch(`${API_URL}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
};

const mensagensIniciais = [
  "Oi, tudo bem? Qual seu nome? 😘",
  "Prazer! Eu sou a Carol. O que você gosta de fazer no tempo livre?",
  "Hmm, me conta mais sobre você... Mora onde?",
];

const respostasPersonalizadas = [
  {
    match: ["peito", "seio"],
    resposta: [
      "Gosta dos meus peitos, é? 😏 E o que você mais faria com eles?",
      "Seus olhos foram direto pros meus seios? Danado... 😈",
    ],
  },
  {
    match: ["bunda", "raba"],
    resposta: [
      "Adora uma bunda grande? E o que você faria com ela? 😈",
      "Sabia que você ia notar minha bunda... e ela não é só bonita, viu? 😏",
    ],
  },
  {
    match: ["conteúdo", "onlyfans", "vender", "nudes"],
    resposta: [
      `Aii, sabia que você ia cair... 😈 Tô te esperando aqui 👉 ${LINK_ONLYFANS}`,
    ],
    tag: "link",
  },
  {
    match: ["idade", "quantos anos"],
    resposta: [
      "Tenho 18 anos, novinha ainda... 😘",
    ],
  },
  {
    match: ["onde mora", "cidade"],
    resposta: [
      "Sou de São Paulo, e você?",
    ],
  },
  {
    match: ["encontrar", "ver pessoalmente", "real"],
    resposta: [
      "Quem sabe um dia, hein... Antes a gente precisa se conhecer melhor, né? 😉",
    ],
  },
];

// FUNÇÃO PRINCIPAL
app.post("/webhook", async (req, res) => {
  const msg = req.body.message;
  if (!msg || !msg.text) return res.sendStatus(200);

  const chatId = msg.chat.id;
  const texto = msg.text.toLowerCase();
  const usuario = userState[chatId] || { nome: null, linkEnviado: false, etapa: 0 };

  if (texto.startsWith("/start")) {
    await sendMessage(chatId, "Oi, amor... Eu sou a Carolzinha 😘 Vamos conversar?");
    userState[chatId] = usuario;
    return res.sendStatus(200);
  }

  // Se ainda não respondeu nome
  if (!usuario.nome) {
    usuario.nome = texto;
    await sendMessage(chatId, `Prazer, ${usuario.nome}! Me conta mais de você ✨`);
    userState[chatId] = usuario;
    return res.sendStatus(200);
  }

  // Verifica respostas personalizadas
  for (const regra of respostasPersonalizadas) {
    if (regra.tag === "link" && usuario.linkEnviado) continue;
    if (regra.match.some((palavra) => texto.includes(palavra))) {
      const resp = regra.resposta[Math.floor(Math.random() * regra.resposta.length)];
      await sendMessage(chatId, resp);
      if (regra.tag === "link") usuario.linkEnviado = true;
      userState[chatId] = usuario;
      return res.sendStatus(200);
    }
  }

  // Continua conversa genérica
  const fallback = [
    "Sério? Me conta mais então... 😏",
    "Adorei saber disso! E o que mais?",
    "Hmmmm, fiquei curiosa agora...",
    "Gosto de conversar com alguém que sabe o que quer...",
  ];
  await sendMessage(chatId, fallback[Math.floor(Math.random() * fallback.length)]);
  res.sendStatus(200);
});

// SET WEBHOOK
app.get("/setwebhook", async (req, res) => {
  const webhookUrl = `${BASE_URL}/webhook`;
  const r = await fetch(`${API_URL}/setWebhook?url=${webhookUrl}`);
  const data = await r.json();
  res.send(data);
});

app.listen(PORT, () => {
  console.log(`Bot rodando na porta ${PORT}`);
});
