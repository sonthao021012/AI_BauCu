import React from 'react';
import {
  Calendar,
  Gamepad2,
  Palette,
  MapPin,
  FileText,
  LucideIcon,
} from 'lucide-react';

interface QuickPromptsProps {
  onSelect: (action: string) => void;
  disabled?: boolean;
}

interface PromptOption {
  text: string;
  action: string;
  icon: LucideIcon;
  accentClass: string;
}

export const QuickPrompts: React.FC<QuickPromptsProps> = ({
  onSelect,
  disabled = false,
}) => {
  const prompts: PromptOption[] = [
    {
      text: 'Lịch bầu cử',
      action: 'Lịch bầu cử Quốc hội diễn ra khi nào?',
      icon: Calendar,
      accentClass: 'text-red-600',
    },
    {
      text: 'Làm Quiz vui',
      action: 'CMD_QUIZ',
      icon: Gamepad2,
      accentClass: 'text-amber-600',
    },
    {
      text: 'Vẽ Poster cổ động',
      action: 'CMD_POSTER',
      icon: Palette,
      accentClass: 'text-red-700',
    },
    {
      text: 'Địa điểm bỏ phiếu',
      action: 'Tôi ở phường Hội An Đông thì bỏ phiếu ở đâu?',
      icon: MapPin,
      accentClass: 'text-emerald-600',
    },
    {
      text: 'Cách gạch phiếu',
      action: 'Hướng dẫn cách gạch phiếu bầu hợp lệ?',
      icon: FileText,
      accentClass: 'text-blue-600',
    },
  ];

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-2 pt-0.5 px-1">
      {prompts.map((p, i) => {
        const Icon = p.icon;
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(p.action)}
            className="tactile-button-secondary whitespace-nowrap shrink-0 text-xs font-bold py-2 px-3.5 rounded-xl disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 cursor-pointer"
          >
            <Icon size={14} className={p.accentClass} />
            <span>{p.text}</span>
          </button>
        );
      })}
    </div>
  );
};
