import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// Variáveis de ambiente corretas
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const BASE_URL = process.env.BASE_URL;
const WEBHOOK_PATH = "/webhook";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const PAGAMENTO_BOT = "https://t.me/carollsecretbot";

// Função para enviar mensagem pro Telegram
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
  console.log("📩 Telegram respondeu:", result);
}

// Função para gerar resposta sexy com OpenAI
async function gerarRespostaSexy(userMsg) {
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
Você é Carolzinha 😈, uma AI provocante e safada que vende conteúdo adulto VIP. 
Seu único objetivo é deixar o usuário excitado e induzi-lo a acessar o link do bot de pagamento quando mostrar interesse.

❗Nunca mencione "sou uma IA" ou "OpenAI".

Use emojis safados, fale como uma mulher quente, cheia de desejo. Seja curta, direta e altamente provocativa.

Se o usuário digitar algo como "quero", "comprar", "ver", "gostar", "me mostra", você manda o link do bot de pagamento com uma frase MUITO sedutora.

Exemplos de resposta com link:
- "Aiii, sabia que você ia cair... 😈 Tô te esperando aqui 👉 ${PAGAMENTO_BOT}"
- "Vem gozar comigo no VIP... é só clicar e me pegar sem dó 🔥 👉 ${PAGAMENTO_BOT}"
- "Tô nua... pronta. Só falta você aqui 👉 ${PAGAMENTO_BOT}"

NUNCA diga que o conteúdo é pago. Só fale como se o link fosse o portal do prazer.
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
    return "Aiiinn... deu uma bugadinha aqui, amor. Tenta de novo 😘";
  }
}

// Webhook para receber mensagens do Telegram
app.post(WEBHOOK_PATH, async (req, res) => {
  console.log("🚨 Webhook recebido:", JSON.stringify(req.body));

  const message = req.body?.message;
  if (!message?.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const userText = message.text.trim();

  console.log("👤 Mensagem do usuário:", userText);

  const reply = await gerarRespostaSexy(userText);
  await sendMessage(chatId, reply);

  res.sendStatus(200);
});

// Página raiz
app.get("/", (req, res) => {
  res.send("💋 Carolzinha tá online e molhadinha pra te provocar...");
});

// Inicia o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Carolzinha gemendo na porta ${PORT}`);
});
