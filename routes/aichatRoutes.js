const express = require("express");
const { Configuration, OpenAIApi } = require("openai");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// ✅ Load your OpenAI key from environment variables
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

// ✅ POST route to send a message to OpenAI and get a reply
router.post("/ask", authMiddleware, async (req, res) => {
  const { message } = req.body;

  if (!message || message.trim() === "" || message.length > 1000) {
    return res.status(400).json({ error: "Valid message (max 1000 characters) is required" });
  }

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant inside an IT ticketing system called Ticxnova. You help users with common IT issues, ticket creation guidance, and answer their queries based on system features.",
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
    console.error("❌ OpenAI error:", err.response?.data || err.message || err);
    res.status(500).json({ error: "AI response failed" });
  }
});

module.exports = router;
