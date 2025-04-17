// routes/aichatRoutes.js
const { Configuration, OpenAIApi } = require("openai");
const authMiddleware = require("../middleware/auth");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

// Export middleware-wrapped handler directly
module.exports = [
  authMiddleware,
  async (req, res) => {
    const { message } = req.body;

    if (!message || message.trim() === "" || message.length > 1000) {
      return res.status(400).json({ error: "Valid message is required" });
    }

    try {
      const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful AI assistant inside an IT ticketing system called Ticxnova...",
          },
          {
            role: "user",
            content: message.trim(),
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const reply = completion.data.choices[0].message.content.trim();
      res.json({ reply });
    } catch (err) {
      console.error("❌ OpenAI error:", err.response?.data || err.message);
      res.status(500).json({ error: "AI response failed" });
    }
  },
];
