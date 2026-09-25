import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'ARMENU', version: '1.0' });
  });

  // AI Sommelier / Gastronomic Waiter Chatbot
  app.post('/api/ai-chat', async (req, res) => {
    try {
      const { message, lang = 'uz', dishesContext = [] } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const ai = getAi();
      if (!ai) {
        // Fallback intelligent responses if API key is not yet configured in Secrets
        let fallback = "Assalomu alaykum! ARMENU virtual ofitsiantingizman. Toshkent to'y oshi, nozik tandir somsa yoki yangi achchiq-chuchuk salatimizni tavsiya qilaman!";
        if (lang === 'ru') {
          fallback = "Здравствуйте! Я ваш виртуальный официант ARMENU. Рекомендую попробовать наш праздничный ташкентский плов, сочную самсу из тандыра и свежий салат ачик-чучук!";
        } else if (lang === 'en') {
          fallback = "Hello! I am your ARMENU virtual waiter. I highly recommend our festive Tashkent wedding plov, crispy tandoor somsa, and refreshing achchik-chuchuk salad!";
        }
        return res.json({ reply: fallback });
      }

      const dishSummary = Array.isArray(dishesContext)
        ? dishesContext.map((d: any) => `${d.name} (${d.category}, ${d.price} so'm) - ${d.description || ''}`).join('\n')
        : '';

      const systemPrompt = `You are ARMENU's expert Uzbek restaurant sommelier and friendly AI waiter at "Registon" restaurant in Tashkent.
You help customers understand traditional Uzbek dishes (Osh, Manti, Somsa, Lag'mon, Shashlik, Norin, Sho'rva, Choy, etc.), answer dietary questions (Halal, Vegan, Non-spicy, Gluten-free, Kids-friendly), and politely suggest appetizing pairings.
Keep your answers warm, concise (2-4 sentences max), polite, and tailored to the requested language (${lang}: 'uz', 'ru', or 'en').
Menu dishes available:
${dishSummary}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: message,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
        },
      });

      const replyText = response.text || '';
      res.json({ reply: replyText });
    } catch (err: any) {
      console.error('AI chat error:', err?.message || err);
      res.status(500).json({
        error: 'AI assistant temporarily unavailable',
        fallback: "Kechirasiz, tizimda kichik uzilish bo'ldi. Menyumizdagi Toshkent oshi yoki tandir somsani tavsiya qilamiz!"
      });
    }
  });

  // Vite middleware in dev or static dist in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ARMENU server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
