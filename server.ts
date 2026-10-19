import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  KnowledgeItem,
  OFFICIAL_BOOK_DATA,
  answerFromKnowledgeBaseFallback,
  parseAdminCommandFallback,
  simplifyTextFallback,
  buildDeterministicQuiz,
  createElectionPosterSvgDataUrl,
} from './src/utils/electionLogic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function withTimeout<T>(promise: Promise<T>, ms = 2000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout')), ms)
    ),
  ]);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  app.get('/logoHAD.png', (_req, res) => {
    res.sendFile(path.join(__dirname, 'logoHAD.png'));
  });

  // 1. Chat endpoint for voters
  app.post('/api/gemini/chat', async (req, res) => {
    const { userQuery, currentKnowledge } = req.body as {
      userQuery: string;
      currentKnowledge?: KnowledgeItem[];
    };
    const knowledge =
      Array.isArray(currentKnowledge) && currentKnowledge.length > 0
        ? currentKnowledge
        : OFFICIAL_BOOK_DATA;

    const ai = getAiClient();
    if (!ai) {
      return res.json({
        text: answerFromKnowledgeBaseFallback(userQuery || '', knowledge),
      });
    }

    const context = JSON.stringify(
      knowledge.slice(0, 30).map((k) => ({ topic: k.topic, content: k.content }))
    );
    const systemInstruction = `
Bạn là Trợ lý ảo thân thiện, vui vẻ hỗ trợ bầu cử cho phường Hội An Đông (Đà Nẵng).
HỆ THỐNG KIẾN THỨC ĐƯỢC CẬP NHẬT TỪ ADMIN: ${context}
NGUYÊN TẮC:
1. Trả lời dựa trên "Hệ thống kiến thức".
2. Nếu không có thông tin, hãy nói khéo léo và hướng dẫn liên hệ UBND phường Hội An Đông.
3. Giọng điệu: Vui vẻ, nhiệt tình, sử dụng emoji phù hợp (🇻🇳, 🗳️, ✨).
4. Luôn ngắn gọn, đi thẳng vào vấn đề.
    `.trim();

    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: userQuery || 'Xin chào',
          config: {
            systemInstruction,
          },
        }),
        2000
      );
      const text =
        response.text ||
        answerFromKnowledgeBaseFallback(userQuery || '', knowledge);
      return res.json({ text });
    } catch (error) {
      console.error('Gemini Chat Error:', error);
      return res.json({
        text: answerFromKnowledgeBaseFallback(userQuery || '', knowledge),
      });
    }
  });

  // 2. Admin Chat Command Agent (CRUD via Chat)
  app.post('/api/gemini/admin-command', async (req, res) => {
    const { userQuery, currentKnowledge } = req.body as {
      userQuery: string;
      currentKnowledge?: KnowledgeItem[];
    };
    const knowledge =
      Array.isArray(currentKnowledge) && currentKnowledge.length > 0
        ? currentKnowledge
        : OFFICIAL_BOOK_DATA;

    // Try deterministic parser first for explicit "Thêm/Sửa/Xóa" commands or fallback if AI is unavailable
    const ai = getAiClient();
    if (!ai) {
      return res.json(parseAdminCommandFallback(userQuery || '', knowledge));
    }

    const context = JSON.stringify(
      knowledge
        .slice(0, 100)
        .map((k) => ({ id: k.id, topic: k.topic, content: k.content }))
    );

    const prompt = `
Bạn là Siêu Trợ Lý Quản Trị (Admin Agent) của hệ thống CSDL Bầu cử Phường Hội An Đông.
Dữ liệu CSDL hiện tại (gồm id, topic, content): ${context}

Nhiệm vụ:
1. Đọc yêu cầu của Admin: "${userQuery}"
2. Phân tích ý định: Admin muốn THÊM (add), SỬA (update), XÓA (delete) dữ liệu hay chỉ HỎI (none) thông thường.
3. Nếu là Sửa/Xóa, bạn PHẢI tìm đúng "id" của dữ liệu trong Dữ liệu CSDL hiện tại.
    `.trim();

    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                action: {
                  type: Type.STRING,
                  description: 'none, add, update, or delete',
                },
                targetId: {
                  type: Type.STRING,
                  description:
                    'ID của record nếu action là update hoặc delete. Chuỗi rỗng nếu action là add hoặc none.',
                },
                topic: {
                  type: Type.STRING,
                  description: 'Tiêu đề dữ liệu mới hoặc cập nhật.',
                },
                content: {
                  type: Type.STRING,
                  description: 'Nội dung chi tiết mới hoặc cập nhật.',
                },
                reply: {
                  type: Type.STRING,
                  description: 'Câu trả lời thân thiện báo cáo kết quả cho Admin.',
                },
              },
              required: ['action', 'reply'],
            },
          },
        }),
        2000
      );

      const jsonText = response.text?.trim();
      if (jsonText) {
        const parsed = JSON.parse(jsonText);
        return res.json(parsed);
      }
      return res.json(parseAdminCommandFallback(userQuery || '', knowledge));
    } catch (error) {
      console.error('Admin Command Error:', error);
      return res.json(parseAdminCommandFallback(userQuery || '', knowledge));
    }
  });

  // 3. Simplify legal text ("Bản dịch Bình dân ✨")
  app.post('/api/gemini/simplify', async (req, res) => {
    const { complexText } = req.body as { complexText: string };
    const ai = getAiClient();
    if (!ai) {
      return res.json({ text: simplifyTextFallback(complexText || '') });
    }

    const prompt = `Hãy viết lại đoạn văn bản luật sau theo ngôn ngữ ĐỜI THƯỜNG, CỰC KỲ ĐƠN GIẢN, dễ hiểu cho một người bà 80 tuổi. Dùng ví dụ vui vẻ nếu cần.\n\nĐOẠN VĂN GỐC:\n"${complexText}"`;

    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        }),
        2000
      );
      return res.json({
        text: response.text || simplifyTextFallback(complexText || ''),
      });
    } catch (error) {
      console.error('Simplify Error:', error);
      return res.json({ text: simplifyTextFallback(complexText || '') });
    }
  });

  // 4. Generate Interactive Quiz
  app.post('/api/gemini/quiz', async (req, res) => {
    const { currentKnowledge } = req.body as {
      currentKnowledge?: KnowledgeItem[];
    };
    const knowledge =
      Array.isArray(currentKnowledge) && currentKnowledge.length > 0
        ? currentKnowledge
        : OFFICIAL_BOOK_DATA;

    const ai = getAiClient();
    if (!ai) {
      return res.json(buildDeterministicQuiz(knowledge));
    }

    const context = JSON.stringify(
      knowledge.slice(0, 20).map((k) => ({ topic: k.topic, content: k.content }))
    );
    const prompt = `Dựa trên dữ liệu bầu cử sau: ${context}. Tạo 1 câu hỏi trắc nghiệm vui vẻ, bổ ích bằng tiếng Việt gồm 4 đáp án lựa chọn.`;

    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
              },
              required: ['question', 'options', 'correctIndex', 'explanation'],
            },
          },
        }),
        2000
      );

      const jsonText = response.text?.trim();
      if (jsonText) {
        const parsed = JSON.parse(jsonText);
        if (
          parsed.question &&
          Array.isArray(parsed.options) &&
          parsed.options.length >= 2
        ) {
          return res.json(parsed);
        }
      }
      return res.json(buildDeterministicQuiz(knowledge));
    } catch (error) {
      console.error('Quiz Error:', error);
      return res.json(buildDeterministicQuiz(knowledge));
    }
  });

  // 5. Generate Election Poster Image
  app.post('/api/gemini/poster', async (_req, res) => {
    const ai = getAiClient();
    if (!ai) {
      return res.json({ imageUrl: createElectionPosterSvgDataUrl() });
    }

    const prompt =
      'A beautiful, modern flat vector illustration poster for Vietnamese Election day. Colors: dominant bright red and yellow star. Showing happy diverse Vietnamese citizens casting votes in a ballot box. Sunny day, vibrant, patriotic, highly detailed, no text, propaganda poster style.';

    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ text: prompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: '3:4',
            },
          },
        }),
        2000
      );

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          return res.json({
            imageUrl: `data:${mime};base64,${part.inlineData.data}`,
          });
        }
      }
      return res.json({ imageUrl: createElectionPosterSvgDataUrl() });
    } catch (error) {
      console.error('Poster Generation Fallback to Vector SVG:', error);
      return res.json({ imageUrl: createElectionPosterSvgDataUrl() });
    }
  });

  // 6. Analyze Text / Document for Batch Knowledge Base Extraction
  app.post('/api/gemini/analyze', async (req, res) => {
    const { inputData, type } = req.body as {
      inputData: string | { mimeType: string; data: string };
      type?: 'text' | 'file';
    };

    const ai = getAiClient();
    const batchPrompt =
      'NHIỆM VỤ: Trích xuất danh sách các mục kiến thức / câu hỏi và trả lời về bầu cử từ tài liệu sau. ĐẦU RA: JSON Array [{"topic": "...", "content": "..."}]';

    if (!ai) {
      // Deterministic fallback extraction from text lines/paragraphs
      if (typeof inputData === 'string' && inputData.trim()) {
        const blocks = inputData
          .split(/\n{2,}/)
          .map((b) => b.trim())
          .filter(Boolean);
        const items = blocks.map((block, idx) => {
          const lines = block.split('\n');
          if (lines.length > 1) {
            return {
              topic: lines[0].replace(/^[\d.\-*#]+\s*/, '').trim(),
              content: lines.slice(1).join(' ').trim(),
            };
          }
          const parts = block.split(/[:\-]/);
          if (parts.length > 1) {
            return {
              topic: parts[0].trim(),
              content: parts.slice(1).join(':').trim(),
            };
          }
          return {
            topic: `Mục tài liệu bầu cử #${idx + 1}`,
            content: block,
          };
        });
        return res.json({ items });
      }
      return res.json({ items: [] });
    }

    try {
      const parts =
        type === 'file' && typeof inputData === 'object'
          ? [
              { text: batchPrompt },
              {
                inlineData: {
                  mimeType: inputData.mimeType,
                  data: inputData.data,
                },
              },
            ]
          : [{ text: `Phân tích văn bản:\n"${inputData}"\n${batchPrompt}` }];

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                topic: { type: Type.STRING },
                content: { type: Type.STRING },
              },
              required: ['topic', 'content'],
            },
          },
        },
      });

      const jsonText = response.text?.trim();
      const items = jsonText ? JSON.parse(jsonText) : [];
      return res.json({ items });
    } catch (error) {
      console.error('Analyze Document Error:', error);
      return res
        .status(500)
        .json({ error: 'Không thể phân tích tài liệu lúc này.' });
    }
  });

  // 7. Text-to-Speech (TTS)
  app.post('/api/gemini/tts', async (req, res) => {
    const { text } = req.body as { text: string };
    const ai = getAiClient();
    if (!ai || !text) {
      return res.json({ audioBase64: null });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });

      const audioBase64 =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
      return res.json({ audioBase64 });
    } catch (error) {
      console.error('TTS Error:', error);
      return res.json({ audioBase64: null });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
