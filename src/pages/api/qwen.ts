import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.QWEN_API_KEY;
  const apiUrl = process.env.QWEN_API_URL || "https://dashscope.aliyuncs.com/api/v1/qwen";
  if (!apiKey) {
    return res.status(400).json({ error: "Qwen API key missing" });
  }

  const { messages } = req.body;
  try {
    const qwenRes = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "qwen-3.5-plus",
        messages,
      }),
    });
    const data = await qwenRes.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Qwen API request failed", details: error });
  }
}
