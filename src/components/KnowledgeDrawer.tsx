import React, { useState } from 'react';
import { X, ChevronRight, Sparkles } from 'lucide-react';
import { KnowledgeItem } from '../utils/electionLogic';

interface KnowledgeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  knowledgeBase: KnowledgeItem[];
  onAskTopic: (topicPrompt: string) => void;
}

export const KnowledgeDrawer: React.FC<KnowledgeDrawerProps> = ({
  isOpen,
  onClose,
  knowledgeBase,
  onAskTopic,
}) => {
  const [filter, setFilter] = useState('');

  if (!isOpen) return null;

  const filtered = knowledgeBase.filter(
    (k) =>
      k.topic.toLowerCase().includes(filter.toLowerCase()) ||
      k.content.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="knowledge-drawer-title"
      className="fixed inset-0 bg-slate-900/65 z-50 flex justify-end backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-slate-50 w-full max-w-md h-full shadow-2xl flex flex-col border-l border-slate-300">
        <div className="p-4 tactile-hero-crimson text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="./logoHAD.png"
              alt="Logo Hội An Đông"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover border-2 border-amber-300"
            />
            <div>
              <h2 id="knowledge-drawer-title" className="font-bold text-base">
                Cẩm Nang Bầu Cử Hội An Đông
              </h2>
              <p className="text-xs text-amber-200 font-medium">
                Tra cứu nhanh {knowledgeBase.length} quy định chính thức
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cẩm nang bầu cử"
            className="tactile-button-secondary p-2 rounded-xl cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-3.5 border-b border-slate-200 bg-white">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Tìm nhanh quy định (VD: tuổi bầu cử, gạch phiếu...)"
            aria-label="Tìm kiếm trong cẩm nang bầu cử"
            className="w-full p-2.5 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-red-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="tactile-card tactile-card-interactive p-4 rounded-2xl space-y-2"
            >
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <h3 className="font-bold text-sm text-slate-900">
                  {item.topic}
                </h3>
                {item.source && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{item.source}</span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {item.content}
              </p>
              <button
                type="button"
                onClick={() => {
                  onAskTopic(`Hãy giải thích chi tiết về: ${item.topic}`);
                  onClose();
                }}
                className="tactile-button-secondary w-full py-2 px-3 rounded-xl text-xs font-bold text-red-700 flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-600" /> Hỏi AI về
                  nội dung này
                </span>
                <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
