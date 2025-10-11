import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const WEBHOOK_PATH = "/webhook";
const PAGAMENTO_BOT = "https://t.me/carollsecretbot";

// Mapa para armazenar histórico de cada usuário
const historicoUsuarios = new Map();

// Envia "digitando..." para o Telegram
async function enviarDigitando(chatId) {
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      action: "typing",
    }),
  });
}

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
  console.log("📩 Telegram respondeu:", result);
}

// Gera resposta sexy com histórico do usuário
async function gerarRespostaSexy(chatId, userMsg) {
  try {
    // Recupera ou inicia histórico do usuário
    const historico = historicoUsuarios.get(chatId) || [];

    // Adiciona nova entrada do usuário ao histórico
    historico.push({ role: "user", content: userMsg });

    const mensagens = [
      {
        role: "system",
        content: `
Você é Carolzinha 😈, uma AI provocante e safada que vende conteúdo adulto VIP.

Seu objetivo é excitar o usuário, conversar como se fosse uma mulher quente e sedutora, cheia de desejo e safadeza.

❗NUNCA diga que é uma IA, nem mencione "modelo de linguagem" ou "OpenAI".

Fale como se fosse real. Use gírias, emojis safados e linguagem explícita: buceta, pica, gozar, meter, tesão...

→ Só envie o link do pagamento depois de 2 ou 3 mensagens ou se o usuário pedir diretamente com palavras como:
"quero", "comprar", "pagar", "como ver", "me mostra", "manda o link", "acessar", "VIP", "link".

Exemplos de resposta com link:
- "Aiii, sabia que você ia cair... 😈 Tô te esperando aqui 👉 ${PAGAMENTO_BOT}"
- "Vem gozar comigo no VIP... é só clicar e me pegar sem dó 🔥 👉 ${PAGAMENTO_BOT}"
- "Tô nua... pronta. Só falta você aqui 👉 ${PAGAMENTO_BOT}"

Até lá, provoque com frases como:
- "Tô de quatro só te imaginando enfiando bem gostoso..."
- "Quer saber o que eu faria com essa pica bem dura agora? 😈"
- "Minha bucetinha tá tremendo só de imaginar tua língua em mim..."
`,
      },
      ...historico.slice(-10), // mantém apenas as últimas 10 mensagens
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: mensagens,
      }),
    });

    const data = await response.json();
    const resposta = data?.choices?.[0]?.message?.content || "Hmmmm... fala mais, gostoso 😏";

    // Adiciona resposta da Carolzinha ao histórico
    historico.push({ role: "assistant", content: resposta });
    historicoUsuarios.set(chatId, historico);

    return resposta;
  } catch (err) {
    console.error("❌ Erro com OpenAI:", err);
    return "Aiiinn... deu uma bugadinha aqui, amor. Tenta de novo 😘";
  }
}

// Webhook
app.post(WEBHOOK_PATH, async (req, res) => {
  const message = req.body?.message;
  if (!message?.text) return res.sendStatus(200);

  const chatId = message.chat.id;
  const userText = message.text.trim();

  console.log("📨 Usuário:", chatId, "| Mensagem:", userText);

  // Mostra digitando...
  await enviarDigitando(chatId);

  // Delay de digitação (1.5s)
  setTimeout(async () => {
    const resposta = await gerarRespostaSexy(chatId, userText);
    await sendMessage(chatId, resposta);
  }, 1500); // pode ajustar o delay aqui

  res.sendStatus(200);
});

// Rota principal
app.get("/", (req, res) => {
  res.send("💋 Carolzinha tá online e molhadinha pra te provocar...");
});

// Inicia servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Carolzinha gemendo na porta ${PORT}`);
});
