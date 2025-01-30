const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const pdfUtil = require("pdf-to-text");
const openaiClient = require("./openaiClient");

const pdf_path = "./article.pdf";

const app = express();

let corsOptions = {
  origin: ["http://127.0.0.1:5173"],
  allowedHeaders: "Content-Type,Authorization",
};
app.use(cors(corsOptions));

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

async function pdfToHtml(response) {
  await pdfUtil.pdfToText(pdf_path, async function (err, data) {
    if (err) throw err;

    return openaiClient.beta.chat.completions
      .parse({
        messages: [
          {
            role: "user",
            content: `Write the following text for a website article: ${data} in the format strictly nothing else: 
            <h1>*Insert title*</h1>
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
      });
  });
}

app.post("/api/nba-article", async (request, response) => {
  const { articleLink } = request.body;
  await articleToPdf(articleLink);
  await pdfToHtml(response);
});

module.exports = app;
