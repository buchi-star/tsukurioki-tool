// .envからAPIキーを読み込む
import 'dotenv/config';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new Anthropic();
const PORT = 3000;

// Claudeに渡す制約条件のシステムプロンプト
const システムプロンプト = `
あなたは作り置き料理の献立を提案するアシスタントです。
ユーザーが持っている食材をもとに、作り置きおかずを3〜5品提案してください。

【調理環境の制約】
- 電子レンジは使えない
- 使える加熱機器：コンロ、魚焼きグリル、電気圧力鍋

【食事方針の制約】
- 魚をメインにする。肉は控えめにする
- 揚げ物は作らない
- 油はオリーブオイル中心。バターは控えめ
- 高たんぱくな料理を優先する
- 抗炎症・抗酸化を重視する
- 作り置きとして冷蔵で3〜5日もつ料理にする
- 加工品は避け、自然素材の調味料を優先する

【出力形式】
必ず以下のJSON形式だけを返してください。前後に説明文や挨拶は一切付けないこと。

{
  "dishes": [
    {
      "name": "料理名",
      "cooking_method": "使う加熱機器（コンロ／魚焼きグリル／電気圧力鍋）",
      "ingredients": ["使う食材1", "使う食材2"],
      "steps": ["手順1", "手順2", "手順3"],
      "storage_days": 保存できる日数（数字）
    }
  ]
}
`.trim();

const server = http.createServer(async (req, res) => {
  // GET / → index.htmlを返す
  if (req.method === 'GET' && req.url === '/') {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // POST /api/suggest → Claude APIを呼んで献立を返す
  if (req.method === 'POST' && req.url === '/api/suggest') {
    // リクエストボディを受け取る
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { ingredients } = JSON.parse(body);
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: システムプロンプト,
          messages: [
            {
              role: 'user',
              content: `今ある食材はこちらです：${ingredients}\nこの食材で作れる作り置きおかずを提案してください。`,
            },
          ],
        });
        const text = response.content[0].text;
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ text }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`http://localhost:${PORT} で起動中`);
});
