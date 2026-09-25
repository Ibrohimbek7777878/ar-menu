var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
import_dotenv.default.config();
var aiClient = null;
function getAi() {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new import_genai.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "ARMENU", version: "1.0" });
  });
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { message, lang = "uz", dishesContext = [] } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      const ai = getAi();
      if (!ai) {
        let fallback = "Assalomu alaykum! ARMENU virtual ofitsiantingizman. Toshkent to'y oshi, nozik tandir somsa yoki yangi achchiq-chuchuk salatimizni tavsiya qilaman!";
        if (lang === "ru") {
          fallback = "\u0417\u0434\u0440\u0430\u0432\u0441\u0442\u0432\u0443\u0439\u0442\u0435! \u042F \u0432\u0430\u0448 \u0432\u0438\u0440\u0442\u0443\u0430\u043B\u044C\u043D\u044B\u0439 \u043E\u0444\u0438\u0446\u0438\u0430\u043D\u0442 ARMENU. \u0420\u0435\u043A\u043E\u043C\u0435\u043D\u0434\u0443\u044E \u043F\u043E\u043F\u0440\u043E\u0431\u043E\u0432\u0430\u0442\u044C \u043D\u0430\u0448 \u043F\u0440\u0430\u0437\u0434\u043D\u0438\u0447\u043D\u044B\u0439 \u0442\u0430\u0448\u043A\u0435\u043D\u0442\u0441\u043A\u0438\u0439 \u043F\u043B\u043E\u0432, \u0441\u043E\u0447\u043D\u0443\u044E \u0441\u0430\u043C\u0441\u0443 \u0438\u0437 \u0442\u0430\u043D\u0434\u044B\u0440\u0430 \u0438 \u0441\u0432\u0435\u0436\u0438\u0439 \u0441\u0430\u043B\u0430\u0442 \u0430\u0447\u0438\u043A-\u0447\u0443\u0447\u0443\u043A!";
        } else if (lang === "en") {
          fallback = "Hello! I am your ARMENU virtual waiter. I highly recommend our festive Tashkent wedding plov, crispy tandoor somsa, and refreshing achchik-chuchuk salad!";
        }
        return res.json({ reply: fallback });
      }
      const dishSummary = Array.isArray(dishesContext) ? dishesContext.map((d) => `${d.name} (${d.category}, ${d.price} so'm) - ${d.description || ""}`).join("\n") : "";
      const systemPrompt = `You are ARMENU's expert Uzbek restaurant sommelier and friendly AI waiter at "Registon" restaurant in Tashkent.
You help customers understand traditional Uzbek dishes (Osh, Manti, Somsa, Lag'mon, Shashlik, Norin, Sho'rva, Choy, etc.), answer dietary questions (Halal, Vegan, Non-spicy, Gluten-free, Kids-friendly), and politely suggest appetizing pairings.
Keep your answers warm, concise (2-4 sentences max), polite, and tailored to the requested language (${lang}: 'uz', 'ru', or 'en').
Menu dishes available:
${dishSummary}
`;
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: message,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7
        }
      });
      const replyText = response.text || "";
      res.json({ reply: replyText });
    } catch (err) {
      console.error("AI chat error:", err?.message || err);
      res.status(500).json({
        error: "AI assistant temporarily unavailable",
        fallback: "Kechirasiz, tizimda kichik uzilish bo'ldi. Menyumizdagi Toshkent oshi yoki tandir somsani tavsiya qilamiz!"
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ARMENU server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
