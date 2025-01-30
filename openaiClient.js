const { OpenAI } = require("openai");

const ENV = process.env.NODE_ENV || "development";

require("dotenv").config({
  path: `${__dirname}/.env.${ENV}`,
});

const token = process.env.OPENAI_API_TOKEN;
const endpoint = "https://models.inference.ai.azure.com";

const openaiClient = new OpenAI({ baseURL: endpoint, apiKey: token });

module.exports = openaiClient;
