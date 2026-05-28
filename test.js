// .envファイルからAPIキーを読み込む
import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

// Claudeクライアントを初期化
const client = new Anthropic();

// 今回テストに使う固定の食材リスト
const 食材リスト = '鮭、ブロッコリー、玉ねぎ、にんにく、レモン、卵、ほうれん草';

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

// Claude APIを呼び出して献立を取得する関数
async function 献立を提案する() {
  console.log('Claude APIに問い合わせ中...\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: システムプロンプト,
    messages: [
      {
        role: 'user',
        content: `今ある食材はこちらです：${食材リスト}\nこの食材で作れる作り置きおかずを提案してください。`,
      },
    ],
  });

  // レスポンスからテキストを取り出す
  const テキスト = response.content[0].text;

  // JSONとして解析を試みる
  try {
    const json = JSON.parse(テキスト);
    console.log('=== 提案された献立（JSON）===\n');
    console.log(JSON.stringify(json, null, 2));
  } catch {
    // JSONが壊れていた場合はテキストをそのまま表示する
    console.log('=== 提案された献立（テキスト）===\n');
    console.log(テキスト);
  }
}

// 実行
献立を提案する();
