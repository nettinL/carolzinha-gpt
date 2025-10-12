// index.js
import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const OPENAI_KEY = process.env.OPENAI_KEY;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const historicoMensagens = {}; // Armazena historico por usuário

async function enviarMensagem(chatId, texto) {
  await delay(8000 + Math.random() * 6000); // Delay entre 8 a 14s
  await fetch(`${TELEGRAM_API}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action: 'typing' })
  });

  await delay(2000 + Math.random() * 3000); // Delay digitando

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: texto })
  });
}

async function gerarRespostaSexy(historico) {
  const mensagens = historico.map(m => {
    return `${m.from === 'user' ? 'Usuário' : 'Carol'}: ${m.text}`;
  }).join('\n');

  const prompt = `Você é a Carol, uma mulher de 18 anos de São Paulo, sensual e envolvente, que conversa como uma pessoa real com um toque provocante. Evite repetir perguntas. Use linguagem natural e varie os emojis. Seja progressiva na conversa.

Histórico:
${mensagens}
Carol:`;

  const resposta = await fetch('https://api.openai.com/v1/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({
      model: 'text-davinci-003',
      prompt,
      max_tokens: 100,
      temperature: 0.85
    })
  });

  const data = await resposta.json();
  return data.choices?.[0]?.text?.trim();
}

app.post('/webhook', async (req, res) => {
  const msg = req.body?.message;
  if (!msg || !msg.text || msg.from?.is_bot) return res.sendStatus(200);

  const chatId = msg.chat.id;
  const userMsg = msg.text.trim();

  if (!historicoMensagens[chatId]) historicoMensagens[chatId] = [];

  historicoMensagens[chatId].push({ from: 'user', text: userMsg });
  if (historicoMensagens[chatId].length > 10) {
    historicoMensagens[chatId].shift(); // Mantém último 10
  }

  try {
    const resposta = await gerarRespostaSexy(historicoMensagens[chatId]);

    if (resposta) {
      historicoMensagens[chatId].push({ from: 'bot', text: resposta });
      if (historicoMensagens[chatId].length > 10) {
        historicoMensagens[chatId].shift();
      }
      await enviarMensagem(chatId, resposta);
    }
  } catch (err) {
    console.error('Erro ao responder:', err);
  }

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot rodando na porta ${PORT}`));
