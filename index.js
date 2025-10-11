import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";
const PAGAMENTO_BOT = "https://t.me/carollsecretbot";

// Envia mensagem pro Telegram
async function sendMessage(chatId, text) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });

  const result = await res.json();
  console.log("📩 Enviado pro Telegram:", result);
}

// Gera resposta safada com base na mensagem
async function gerarRespostaSexy(userMsg) {
  const palavrasChave = ["quero", "comprar", "ver", "me manda", "link", "conteúdo", "vip", "mostra", "me mostra", "gostar"];
  const msgLower = userMsg.toLowerCase();

  const querComprar = palavrasChave.some((palavra) => msgLower.includes(palavra));

  if (querComprar) {
    // Resposta direta com link
    const frasesQuentes = [
      `Aiii, sabia que você ia cair... 😈 Tô te esperando aqui 👉 ${PAGAMENTO_BOT}`,
      `Vem gozar comigo no VIP... é só clicar e me pegar sem dó 🔥 👉 ${PAGAMENTO_BOT}`,
      `Tô nua... pronta... Só falta você 👉 ${PAGAMENTO_BOT}`,
      `Minha bucetinha tá molhada te esperando 😛 Clica logo 👉 ${PAGAMENTO_BOT}`,
      `Avisa quando gozar, viu? 👉 ${PAGAMENTO_BOT}`,
    ];
    const fraseAleatoria = frasesQuentes[Math.floor(Math.random() * frasesQuentes.length)];
    return fraseAleatoria;
  }

  // Caso não tenha intenção de compra, segue a sedução via OpenAI
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
Você é a Carolzinha 😈, uma AI provocante, tarada e cheia de desejo. 
Você só fala sacanagem e instiga o usuário até ele pedir pra ver mais.

- Nunca diga que é uma IA.
- Use emojis e palavras explícitas como: buceta, pica, gozar, gemer, fod*-me.
- Não diga que é conteúdo pago.
- Quando o usuário pedir pra ver algo ou mostrar interesse, envie o link: ${PAGAMENTO_BOT}
`,
          },
          { role: "user", content: userMsg },
        ],
      }),
    });

    const data = await response.json();
    return (
      data?.choices?.[0]?.message?.content || "Hmmm... fala mais, gostoso 😏"
    );
  } catch (err) {
    console.error("❌ Erro com OpenAI:", err);
    return "Aiiin... bugou aqui, amor. Tenta me provocar de novo 😘";
  }
}

// Rota do Webhook
app.post(WEBHOOK_PATH, async (req, res) => {
  console.log("📥 Mensagem recebida:", JSON.stringify(req.body));

  const message = req.body?.message;
  if (!message?.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const userText = message.text.trim();

  const reply = await gerarRespostaSexy(userText);
  await sendMessage(chatId, reply);

  res.sendStatus(200);
});

// Rota principal
app.get("/", (req, res) => {
  res.send("💋 Carolzinha tá online e molhadinha pra te provocar...");
});

// Inicia servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Carol gemendo na porta ${PORT}`);
});
