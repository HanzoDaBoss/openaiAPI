const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const pdfUtil = require("pdf-to-text");
const openaiClient = require("./openaiClient");

const pdf_path = "./article.pdf";

const app = express();

let corsOptions = {
  origin: "http://127.0.0.1:5173",
};
app.use(cors(corsOptions));

app.options("/api/nba-article", (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5173");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  response.sendStatus(204); // No content response for preflight
});

app.use(express.json());

async function articleToPdf(articleLink) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(0);
  await page.goto(articleLink, {
    waitUntil: "networkidle2",
  });
  // Saves the PDF to hn.pdf.
  await page.pdf({
    path: "article.pdf",
  });
  await browser.close();
}

async function pdfToHtml(response, next) {
  await pdfUtil.pdfToText(pdf_path, async function (err, data) {
    if (err) throw err;

    return openaiClient.beta.chat.completions
      .parse({
        messages: [
          {
            role: "user",
            content: `Write the following text for a website article: ${data} in the format strictly nothing else: 
            <h1 className="text-3xl font-bold italic mb-10 text-center">*Insert title*</h1>
            <p>*Insert article content*</h1>
            `,
          },
        ],
        temperature: 1.0,
        top_p: 1.0,
        max_tokens: 1000,
        model: "gpt-4o",
        store: true,
      })
      .then((aiResponse) => {
        let parsedHtml = aiResponse.choices[0].message.content.replace(
          /```html\n|```/g,
          ""
        );
        response.setHeader("Content-Type", "text/html");
        response.status(200).send(parsedHtml);
      })
      .catch(next);
  });
}

app.post("/api/nba-article", async (request, response, next) => {
  const { articleLink } = request.body;
  await articleToPdf(articleLink);
  await pdfToHtml(response, next);
});

app.use((error, request, response, next) => {
  console.error(error.stack);
  response.status(500).send({ error: "Something went wrong" });
});

module.exports = app;
