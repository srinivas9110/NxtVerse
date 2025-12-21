const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ No API Key found in .env file!");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        console.log("🔍 Scanning for available AI models...");
        // This is a special Google command to verify what you can use
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.error) {
            console.error("❌ API Error:", data.error.message);
            return;
        }

        console.log("\n✅ AVAILABLE MODELS:");
        const models = data.models || [];

        // Filter for models that can "generateContent" (Chat models)
        const chatModels = models.filter(m => m.supportedGenerationMethods.includes("generateContent"));

        chatModels.forEach(m => {
            console.log(`- ${m.name.replace('models/', '')}`);
        });

        console.log("\n👉 Please use one of the names above in your ai.js file.");

    } catch (error) {
        console.error("Connection Error:", error);
    }
}

listModels();