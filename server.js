// .envからAPIキーを読み込む（スクリプトと同じフォルダの.envを明示的に指定）
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import http from 'http';
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env'), override: true });
const client = new Anthropic();
const PORT = 3000;

// ユーザーの設定をもとにシステムプロンプトを動的に生成する
function プロンプトを生成する(調理器具, 除外調理法, 食の好み) {
  // 調理器具が未選択の場合はコンロをデフォルトにする
  const 器具リスト = 調理器具 && 調理器具.length > 0
    ? 調理器具.join('、')
    : 'コンロ';

  // 除外調理法がある場合のみ制約を追加する
  const 除外ルール = 除外調理法 && 除外調理法.length > 0
    ? `- 以下の調理法は使わないこと：${除外調理法.join('、')}`
    : '';

  // 自由記述がある場合のみセクションを追加する
  const 好みセクション = 食の好み && 食の好み.trim()
    ? `\n【ユーザーの食の好みや制約】\n- ${食の好み.trim()}`
    : '';

  return `
あなたは作り置き料理の献立を提案するアシスタントです。
ユーザーが持っている食材をもとに、作り置きおかずを3〜5品提案してください。

【食材の使い方】
- 入力された食材を必ずメインに使うこと。入力にない食材をメイン食材として勝手に追加しないこと
- 魚（鮭・鯖・鱈・鰤・鯵・鰯など）は食材として入力された場合のみ使う。入力にない場合は魚を追加しない
- 塩・こしょう・オリーブオイル・醤油・みりんなどの調味料・油脂は入力になくても使ってよい

【調理環境の制約】
- 使える加熱機器：${器具リスト}
${除外ルール}

【食事方針の制約】
- 作り置きとして冷蔵で3〜5日もつ料理にする
- 加工品は避け、自然素材の調味料を優先する
${好みセクション}

【出力形式】
必ず以下のJSON形式だけを返してください。前後に説明文や挨拶は一切付けないこと。

{
  "dishes": [
    {
      "name": "料理名",
      "cooking_method": "使う加熱機器（${器具リスト}から選ぶ）",
      "ingredients": ["使う食材1", "使う食材2"],
      "steps": ["手順1", "手順2", "手順3"],
      "storage_days": 保存できる日数（数字）
    }
  ]
}
`.trim();
}

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
        const { ingredients, cookingEquipment, excludedMethods, dietaryNotes } = JSON.parse(body);
        // ユーザーの設定をもとにプロンプトを動的に生成する
        const システムプロンプト = プロンプトを生成する(cookingEquipment, excludedMethods, dietaryNotes);
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
