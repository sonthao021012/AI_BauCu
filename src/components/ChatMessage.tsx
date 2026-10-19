import React, { useState } from 'react';
import {
  User,
  Bot,
  Volume2,
  Sparkles,
  Loader,
  Copy,
  CheckCircle,
  Palette,
  Download,
  Wand2,
} from 'lucide-react';
import { QuizQuestion } from '../utils/electionLogic';
import {
  generateSimpleExplanation,
  generateGeminiAudio,
} from '../services/geminiClient';
import { InteractiveQuiz } from './InteractiveQuiz';

export interface ChatMessageData {
  id: number | string;
  sender: 'bot' | 'user';
  text: string;
  type: 'text' | 'image' | 'quiz';
  data?: string | QuizQuestion | null;
  isAdminCmd?: boolean;
}

interface ChatMessageProps {
  message: ChatMessageData;
  onRequestNextQuiz?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onRequestNextQuiz,
}) => {
  const isBot = message.sender === 'bot';
  const isAdminCmd = message.isAdminCmd;
  const [simplifiedText, setSimplifiedText] = useState('');
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSpeak = async () => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    await generateGeminiAudio(message.text);
    setTimeout(() => setIsSpeaking(false), 1200);
  };

  const handleSimplifyClick = async () => {
    if (simplifiedText) {
      setSimplifiedText('');
      return;
    }
    setIsSimplifying(true);
    const result = await generateSimpleExplanation(message.text);
    setSimplifiedText(result);
    setIsSimplifying(false);
  };

  const renderFormattedText = (rawText: string) => {
    const parts = rawText.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold text-slate-950">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  return (
    <div
      className={`flex ${
        isBot ? 'justify-start' : 'justify-end'
      } mb-6 animate-messageIn group`}
    >
      <div
        className={`flex max-w-[92%] sm:max-w-[84%] gap-3.5 ${
          isBot ? 'flex-row' : 'flex-row-reverse'
        }`}
      >
        {/* 3D Tactile Avatar with HAD Logo */}
        <div
          className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${
            isBot
              ? 'bg-red-900 tactile-logo-badge'
              : 'tactile-button-primary text-white'
          }`}
        >
          {isBot ? (
            !avatarError ? (
              <img
                src="./logoHAD.png"
                alt="Logo Hội An Đông AI"
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <Bot size={22} className="text-amber-300" />
            )
          ) : (
            <User size={20} />
          )}
        </div>

        <div
          className={`flex flex-col ${
            isBot ? 'items-start' : 'items-end'
          } gap-2 w-full`}
        >
          {/* 3D Tactile Message Bubble */}
          <div
            className={`p-4 sm:p-5 rounded-2xl text-[15px] leading-relaxed relative w-full ${
              isBot
                ? isAdminCmd
                  ? 'tactile-card bg-emerald-50/90 border-emerald-300 text-emerald-950 rounded-tl-xs'
                  : 'tactile-bubble-bot text-slate-800 rounded-tl-xs'
                : 'tactile-bubble-user rounded-tr-xs font-medium'
            }`}
          >
            {message.type === 'text' && (
              <div className="whitespace-pre-line">
                {isBot ? renderFormattedText(message.text) : message.text}
              </div>
            )}

            {message.type === 'image' && (
              <div className="flex flex-col items-start">
                <div className="mb-3 font-bold text-red-800 flex items-center gap-2">
                  <Palette size={17} className="text-red-600" /> {message.text}
                </div>
                {typeof message.data === 'string' && message.data ? (
                  <div className="relative group/img overflow-hidden rounded-2xl border-2 border-amber-300 shadow-lg bg-red-950/5">
                    <img
                      src={message.data}
                      referrerPolicy="no-referrer"
                      className="max-w-xs sm:max-w-sm w-full rounded-xl object-cover"
                      alt="Poster Bầu Cử AI"
                    />
                    <a
                      href={message.data}
                      download="poster-bau-cu-hoi-an-dong.svg"
                      aria-label="Tải xuống Poster Bầu cử"
                      className="mt-2 sm:mt-0 sm:absolute sm:bottom-3.5 sm:right-3.5 tactile-button-gold text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Download size={14} /> Tải Poster
                    </a>
                  </div>
                ) : (
                  <div className="text-red-700 text-xs bg-red-50 p-3 rounded-xl border border-red-200">
                    Rất tiếc, không thể tạo ảnh lúc này.
                  </div>
                )}
              </div>
            )}

            {message.type === 'quiz' && (
              <div>
                <div className="mb-2 font-semibold text-slate-800">
                  {message.text}
                </div>
                <InteractiveQuiz
                  quizData={message.data as QuizQuestion}
                  onRequestNextQuiz={onRequestNextQuiz}
                />
              </div>
            )}
          </div>

          {/* Simplified Explanation Box ("Bản dịch Bình dân") */}
          {simplifiedText && (
            <div className="tactile-card p-4 bg-amber-50/95 border-amber-300 rounded-2xl mt-1 animate-fadeIn relative w-full max-w-xl">
              <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold mb-1.5">
                <Wand2 size={14} className="text-amber-700" />
                <span>Giải thích bình dân dễ hiểu</span>
              </div>
              <p className="text-sm text-slate-800 font-medium leading-relaxed">
                &ldquo;{simplifiedText}&rdquo;
              </p>
            </div>
          )}

          {/* 3D Tactile Bot Action Bar */}
          {isBot && message.type === 'text' && !isAdminCmd && (
            <div className="flex items-center gap-2 px-1 pt-0.5 flex-wrap">
              <button
                type="button"
                onClick={handleSpeak}
                aria-label="Đọc to nội dung tin nhắn"
                className="tactile-button-secondary text-xs font-bold px-3 py-1.5 rounded-xl flex gap-1.5 items-center cursor-pointer whitespace-nowrap shrink-0"
                title="Đọc tin nhắn"
              >
                <Volume2
                  size={13}
                  className={
                    isSpeaking ? 'text-red-600 animate-pulse' : 'text-slate-600'
                  }
                />
                <span>{isSpeaking ? 'Đang đọc...' : 'Nghe đọc'}</span>
              </button>

              <button
                type="button"
                onClick={handleSimplifyClick}
                disabled={isSimplifying}
                aria-label="Giải thích đơn giản"
                className={`text-xs font-bold px-3 py-1.5 rounded-xl flex gap-1.5 items-center cursor-pointer whitespace-nowrap shrink-0 ${
                  simplifiedText
                    ? 'tactile-button-gold'
                    : 'tactile-button-secondary'
                }`}
                title="Dịch ngôn ngữ luật sang bình dân dễ hiểu"
              >
                {isSimplifying ? (
                  <Loader size={13} className="animate-spin text-amber-700" />
                ) : (
                  <Sparkles size={13} className="text-amber-600" />
                )}
                <span>Giải thích đơn giản</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                aria-label="Sao chép nội dung tin nhắn"
                className="tactile-button-secondary text-xs font-bold px-3 py-1.5 rounded-xl flex gap-1.5 items-center cursor-pointer whitespace-nowrap shrink-0"
                title="Sao chép"
              >
                {copied ? (
                  <>
                    <CheckCircle size={13} className="text-emerald-600" />
                    <span className="text-emerald-700">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} className="text-slate-600" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
