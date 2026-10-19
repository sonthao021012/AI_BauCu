import React, { useState } from 'react';
import { Trophy, Info, CheckCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import { QuizQuestion } from '../utils/electionLogic';

interface InteractiveQuizProps {
  quizData?: QuizQuestion | null;
  onRequestNextQuiz?: () => void;
}

export const InteractiveQuiz: React.FC<InteractiveQuizProps> = ({
  quizData,
  onRequestNextQuiz,
}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  if (!quizData) {
    return (
      <div className="p-3 text-red-700 bg-red-50 rounded-xl border border-red-200 text-xs font-medium">
        Không thể tạo câu hỏi lúc này. Vui lòng thử lại.
      </div>
    );
  }

  const handleSelect = (idx: number) => {
    if (isAnswered) return;
    setSelected(idx);
    setIsAnswered(true);
  };

  const isCorrect = selected === quizData.correctIndex;

  return (
    <div className="tactile-card rounded-2xl p-4 sm:p-5 mt-2 max-w-lg w-full">
      <div className="flex items-center justify-between text-slate-900 font-bold mb-3 border-b border-slate-200/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center shadow-2xs">
            <Trophy size={15} className="text-amber-700" />
          </div>
          <span className="text-sm font-bold text-slate-900">
            Trắc nghiệm Kiến thức Bầu cử
          </span>
        </div>
        {isAnswered && (
          <span
            className={`text-xs font-bold flex items-center gap-1 ${
              isCorrect ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {isCorrect ? (
              <>
                <CheckCircle size={14} /> Chính xác
              </>
            ) : (
              <>
                <AlertTriangle size={14} /> Chưa đúng
              </>
            )}
          </span>
        )}
      </div>

      <p className="font-bold text-slate-900 text-sm mb-4 leading-relaxed">
        {quizData.question}
      </p>

      <div className="space-y-2.5">
        {quizData.options.map((opt, idx) => {
          let btnClass =
            'w-full text-left p-3 rounded-xl text-sm transition-all flex items-start gap-2.5 ';
          if (!isAnswered) {
            btnClass +=
              'tactile-button-secondary text-slate-800 font-medium cursor-pointer';
          } else {
            if (idx === quizData.correctIndex) {
              btnClass +=
                'bg-emerald-50 border-2 border-emerald-500 text-emerald-950 font-bold shadow-[0_3px_0_0_#10b981]';
            } else if (idx === selected) {
              btnClass +=
                'bg-rose-50 border-2 border-rose-400 text-rose-900 font-medium opacity-90';
            } else {
              btnClass +=
                'bg-slate-50 border border-slate-200 text-slate-400 opacity-60';
            }
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={isAnswered}
              onClick={() => handleSelect(idx)}
              className={btnClass}
            >
              <span className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center shrink-0">
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="leading-snug pt-0.5">{opt}</span>
            </button>
          );
        })}
      </div>

      {isAnswered && (
        <div className="mt-4 space-y-3 animate-fadeIn">
          <div className="p-3.5 bg-amber-50/90 text-slate-800 text-xs rounded-xl border border-amber-300/80 leading-relaxed">
            <span className="font-bold flex items-center gap-1.5 mb-1 text-amber-900">
              <Info size={14} className="text-amber-700" /> Giải thích quy định:
            </span>
            {quizData.explanation}
          </div>
          {onRequestNextQuiz && (
            <button
              type="button"
              onClick={onRequestNextQuiz}
              className="w-full py-2.5 px-4 tactile-button-primary font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw size={14} /> Câu hỏi tiếp theo
            </button>
          )}
        </div>
      )}
    </div>
  );
};
