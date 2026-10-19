import {
  KnowledgeItem,
  QuizQuestion,
  AdminCommandResult,
  answerFromKnowledgeBaseFallback,
  parseAdminCommandFallback,
  simplifyTextFallback,
  buildDeterministicQuiz,
  createElectionPosterSvgDataUrl,
} from '../utils/electionLogic';

// Automatically detect if running on GitHub Pages or static hosting without backend
let isStaticHost =
  typeof window !== 'undefined' &&
  (window.location.hostname.endsWith('github.io') ||
    window.location.protocol === 'file:');

export async function generateGeminiResponse(
  userQuery: string,
  currentKnowledge: KnowledgeItem[]
): Promise<string> {
  if (isStaticHost) {
    return answerFromKnowledgeBaseFallback(userQuery, currentKnowledge);
  }
  try {
    const response = await fetch('./api/gemini/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userQuery, currentKnowledge }),
    });
    if (response.status === 404 || response.status === 405) {
      isStaticHost = true;
      return answerFromKnowledgeBaseFallback(userQuery, currentKnowledge);
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return (
      data.text || answerFromKnowledgeBaseFallback(userQuery, currentKnowledge)
    );
  } catch {
    return answerFromKnowledgeBaseFallback(userQuery, currentKnowledge);
  }
}

export async function processAdminChatCommand(
  userQuery: string,
  currentKnowledge: KnowledgeItem[]
): Promise<AdminCommandResult> {
  if (isStaticHost) {
    return parseAdminCommandFallback(userQuery, currentKnowledge);
  }
  try {
    const response = await fetch('./api/gemini/admin-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userQuery, currentKnowledge }),
    });
    if (response.status === 404 || response.status === 405) {
      isStaticHost = true;
      return parseAdminCommandFallback(userQuery, currentKnowledge);
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data as AdminCommandResult;
  } catch {
    return parseAdminCommandFallback(userQuery, currentKnowledge);
  }
}

export async function generateSimpleExplanation(
  complexText: string
): Promise<string> {
  if (isStaticHost) {
    return simplifyTextFallback(complexText);
  }
  try {
    const response = await fetch('./api/gemini/simplify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ complexText }),
    });
    if (response.status === 404 || response.status === 405) {
      isStaticHost = true;
      return simplifyTextFallback(complexText);
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.text || simplifyTextFallback(complexText);
  } catch {
    return simplifyTextFallback(complexText);
  }
}

export async function generateQuizData(
  currentKnowledge: KnowledgeItem[]
): Promise<QuizQuestion> {
  if (isStaticHost) {
    return buildDeterministicQuiz(currentKnowledge);
  }
  try {
    const response = await fetch('./api/gemini/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentKnowledge }),
    });
    if (response.status === 404 || response.status === 405) {
      isStaticHost = true;
      return buildDeterministicQuiz(currentKnowledge);
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data && data.question && Array.isArray(data.options)) {
      return data as QuizQuestion;
    }
    return buildDeterministicQuiz(currentKnowledge);
  } catch {
    return buildDeterministicQuiz(currentKnowledge);
  }
}

export async function generatePosterImage(): Promise<string> {
  if (isStaticHost) {
    return createElectionPosterSvgDataUrl();
  }
  try {
    const response = await fetch('./api/gemini/poster', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.status === 404 || response.status === 405) {
      isStaticHost = true;
      return createElectionPosterSvgDataUrl();
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return data.imageUrl || createElectionPosterSvgDataUrl();
  } catch {
    return createElectionPosterSvgDataUrl();
  }
}

function extractItemsLocally(
  inputData: string | { mimeType: string; data: string }
): Array<{ topic: string; content: string }> {
  if (typeof inputData === 'string' && inputData.trim()) {
    const blocks = inputData
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean);
    return blocks.map((block, idx) => {
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
  }
  return [];
}

export async function analyzeInputData(
  inputData: string | { mimeType: string; data: string },
  type: 'text' | 'file' = 'text'
): Promise<Array<{ topic: string; content: string }>> {
  if (isStaticHost) {
    return extractItemsLocally(inputData);
  }
  try {
    const response = await fetch('./api/gemini/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputData, type }),
    });
    if (response.status === 404 || response.status === 405) {
      isStaticHost = true;
      return extractItemsLocally(inputData);
    }
    if (!response.ok) {
      return extractItemsLocally(inputData);
    }
    const data = await response.json();
    return Array.isArray(data.items) ? data.items : extractItemsLocally(inputData);
  } catch {
    return extractItemsLocally(inputData);
  }
}

export async function generateGeminiAudio(text: string): Promise<boolean> {
  if (!isStaticHost) {
    try {
      const response = await fetch('./api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (response.status === 404 || response.status === 405) {
        isStaticHost = true;
      } else if (response.ok) {
        const data = await response.json();
        if (data.audioBase64) {
          const audioBytes = Uint8Array.from(atob(data.audioBase64), (c) =>
            c.charCodeAt(0)
          );
          const audio = new Audio(
            URL.createObjectURL(new Blob([audioBytes], { type: 'audio/wav' }))
          );
          await audio.play();
          return true;
        }
      }
    } catch {
      // Fallback to browser SpeechSynthesis below
    }
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        text.replace(/[🇻🇳🗳️✨📌🎨📝✅🗑️*]/g, '')
      );
      utterance.lang = 'vi-VN';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
    }
  }
  return false;
}
