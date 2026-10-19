import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit,
  Save,
  RotateCcw,
  BrainCircuit,
  Loader,
  CheckCircle,
  FileUp,
} from 'lucide-react';
import {
  KnowledgeItem,
  validateKnowledgeItem,
} from '../utils/electionLogic';
import { analyzeInputData } from '../services/geminiClient';

interface DataManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  knowledgeBase: KnowledgeItem[];
  onAddItem: (topic: string, content: string, source?: string) => Promise<void>;
  onUpdateItem: (id: string, topic: string, content: string) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onResetDefaults: () => Promise<void>;
}

export const DataManagerModal: React.FC<DataManagerModalProps> = ({
  isOpen,
  onClose,
  knowledgeBase,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onResetDefaults,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'ai-extract'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newContent, setNewContent] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTopic, setEditTopic] = useState('');
  const [editContent, setEditContent] = useState('');

  const [rawText, setRawText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedItems, setExtractedItems] = useState<
    Array<{ topic: string; content: string }>
  >([]);

  if (!isOpen) return null;

  const filteredItems = knowledgeBase.filter(
    (item) =>
      item.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const validation = validateKnowledgeItem({
      topic: newTopic,
      content: newContent,
    });
    if (!validation.valid) {
      setFormError(validation.error || 'Dữ liệu không hợp lệ.');
      return;
    }

    await onAddItem(newTopic.trim(), newContent.trim(), 'Quản trị viên');
    setNewTopic('');
    setNewContent('');
    setFormSuccess('Đã thêm mục kiến thức mới thành công!');
    setTimeout(() => setFormSuccess(''), 3000);
  };

  const startEditing = (item: KnowledgeItem) => {
    setEditingId(item.id);
    setEditTopic(item.topic);
    setEditContent(item.content);
  };

  const handleSaveEdit = async (id: string) => {
    const validation = validateKnowledgeItem({
      topic: editTopic,
      content: editContent,
    });
    if (!validation.valid) {
      setFormError(validation.error || 'Dữ liệu cập nhật không hợp lệ.');
      return;
    }
    await onUpdateItem(id, editTopic.trim(), editContent.trim());
    setEditingId(null);
  };

  const handleAnalyzeText = async () => {
    if (!rawText.trim()) {
      setFormError('Vui lòng dán văn bản quy định bầu cử cần phân tích.');
      return;
    }
    setFormError('');
    setIsAnalyzing(true);
    try {
      const items = await analyzeInputData(rawText, 'text');
      setExtractedItems(items);
    } catch (e: unknown) {
      setFormError(
        e instanceof Error ? e.message : 'Lỗi phân tích văn bản bằng AI.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError('');
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const resultStr = reader.result as string;
        const base64Data = resultStr.split(',')[1] || '';
        try {
          const items = await analyzeInputData(
            { mimeType: file.type || 'application/pdf', data: base64Data },
            'file'
          );
          setExtractedItems(items);
        } catch (err: unknown) {
          setFormError(
            err instanceof Error ? err.message : 'Không thể đọc tệp tin.'
          );
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsAnalyzing(false);
      setFormError('Lỗi tải tệp tin.');
    }
  };

  const handleImportAllExtracted = async () => {
    for (const item of extractedItems) {
      if (item.topic && item.content) {
        await onAddItem(item.topic, item.content, 'AI Trích xuất');
      }
    }
    setExtractedItems([]);
    setRawText('');
    setActiveTab('list');
    setFormSuccess('Đã nhập toàn bộ dữ liệu trích xuất vào CSDL!');
    setTimeout(() => setFormSuccess(''), 3000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-manager-title"
      className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-xs animate-messageIn"
    >
      <div className="tactile-surface rounded-3xl w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden">
        {/* Modal Header with HAD Logo */}
        <div className="p-4 sm:px-6 tactile-hero-crimson text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img
              src="./logoHAD.png"
              alt="Logo Hội An Đông"
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-full object-cover border-2 border-amber-300 shadow-md"
            />
            <div>
              <h2 id="data-manager-title" className="text-lg font-bold">
                Quản Trị Cơ Sở Dữ Liệu Bầu Cử ({knowledgeBase.length} mục)
              </h2>
              <p className="text-xs text-amber-200 font-medium">
                Đồng bộ trực tiếp với Trợ lý AI Phường Hội An Đông
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng quản lý dữ liệu"
            className="tactile-button-secondary p-2 rounded-xl cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Segmented Navigation Bar */}
        <div className="bg-slate-100 px-4 sm:px-6 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 text-xs font-bold rounded-xl cursor-pointer whitespace-nowrap ${
                activeTab === 'list'
                  ? 'tactile-button-primary'
                  : 'tactile-button-secondary'
              }`}
            >
              Danh sách & Thêm thủ công
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai-extract')}
              className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'ai-extract'
                  ? 'tactile-button-gold'
                  : 'tactile-button-secondary'
              }`}
            >
              <BrainCircuit size={14} /> AI Bóc tách Văn bản / PDF
            </button>
          </div>

          <button
            type="button"
            onClick={onResetDefaults}
            className="tactile-button-secondary px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            title="Khôi phục dữ liệu mẫu ban đầu"
          >
            <RotateCcw size={13} /> Khôi phục dữ liệu chuẩn
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/70">
          <div className="tactile-card p-3.5 rounded-2xl text-xs text-slate-700">
            <strong>Mẹo Admin Agent:</strong> Ngoài bảng quản trị này, bạn có thể
            thêm, sửa hoặc xóa dữ liệu trực tiếp bằng cách gõ lệnh vào khung chat
            chính (ví dụ: <em>&ldquo;Thêm nội dung: Giờ bỏ phiếu - Từ 7h đến 19h&rdquo;</em>).
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-1.5">
              <CheckCircle size={15} /> {formSuccess}
            </div>
          )}

          {activeTab === 'list' ? (
            <>
              {/* Add New Knowledge Form */}
              <form
                onSubmit={handleAddSubmit}
                className="tactile-card p-4 rounded-2xl space-y-3"
              >
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus size={15} className="text-red-600" /> Thêm mục kiến thức
                  mới
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label htmlFor="kb-topic-input" className="sr-only">
                      Chủ đề / Câu hỏi
                    </label>
                    <input
                      id="kb-topic-input"
                      type="text"
                      placeholder="Chủ đề (VD: Giờ bỏ phiếu)"
                      value={newTopic}
                      onChange={(e) => setNewTopic(e.target.value)}
                      className="w-full p-2.5 bg-white border-2 border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div className="sm:col-span-2 flex gap-2">
                    <label htmlFor="kb-content-input" className="sr-only">
                      Nội dung quy định chi tiết
                    </label>
                    <input
                      id="kb-content-input"
                      type="text"
                      placeholder="Nội dung chi tiết hướng dẫn cử tri..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      className="flex-1 p-2.5 bg-white border-2 border-slate-200 rounded-xl text-xs focus:outline-none focus:border-red-500"
                    />
                    <button
                      type="submit"
                      className="tactile-button-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer whitespace-nowrap"
                    >
                      <Plus size={15} /> Lưu mục mới
                    </button>
                  </div>
                </div>
              </form>

              {/* Search Filter */}
              <div>
                <input
                  type="text"
                  placeholder="Tìm kiếm nhanh chủ đề hoặc nội dung..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Tìm kiếm trong cơ sở dữ liệu"
                  className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-red-500 shadow-inner"
                />
              </div>

              {/* Knowledge Base List */}
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="tactile-card p-4 rounded-2xl"
                  >
                    {editingId === item.id ? (
                      <div className="space-y-2.5">
                        <input
                          type="text"
                          value={editTopic}
                          onChange={(e) => setEditTopic(e.target.value)}
                          aria-label="Chỉnh sửa tiêu đề"
                          className="w-full p-2.5 border-2 border-slate-300 rounded-xl text-xs font-bold"
                        />
                        <textarea
                          rows={2}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          aria-label="Chỉnh sửa nội dung"
                          className="w-full p-2.5 border-2 border-slate-300 rounded-xl text-xs"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="tactile-button-secondary px-3 py-1.5 text-xs rounded-xl font-bold cursor-pointer"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id)}
                            className="tactile-button-primary px-3.5 py-1.5 text-xs rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Save size={13} /> Lưu thay đổi
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-bold text-sm text-slate-900">
                              {item.topic}
                            </span>
                            {item.source && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-medium text-slate-500">
                                  {item.source}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {item.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditing(item)}
                            aria-label={`Sửa mục ${item.topic}`}
                            className="tactile-button-secondary p-2 rounded-xl cursor-pointer"
                            title="Chỉnh sửa"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item.id)}
                            aria-label={`Xóa mục ${item.topic}`}
                            className="tactile-button-secondary p-2 rounded-xl text-red-600 cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="tactile-card rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BrainCircuit size={18} className="text-red-600" />
                  Trích xuất tự động Cẩm nang Bầu cử bằng Gemini AI
                </h3>
                <p className="text-xs text-slate-600">
                  Dán đoạn văn bản luật, thông báo của UBND phường hoặc tải lên
                  tệp PDF/văn bản để AI tự động tách thành các cặp Chủ đề & Nội
                  dung.
                </p>

                <textarea
                  rows={5}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Dán nội dung thông báo hoặc văn bản hướng dẫn bầu cử vào đây..."
                  className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl text-xs focus:outline-none focus:border-red-500 shadow-inner"
                />

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleAnalyzeText}
                    disabled={isAnalyzing}
                    className="tactile-button-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    {isAnalyzing ? (
                      <Loader size={15} className="animate-spin" />
                    ) : (
                      <BrainCircuit size={15} />
                    )}
                    <span>Phân tích văn bản</span>
                  </button>

                  <label className="tactile-button-secondary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                    <FileUp size={15} className="text-red-600" />
                    <span>Tải tệp PDF / TXT</span>
                    <input
                      type="file"
                      accept=".pdf,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {extractedItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800">
                      Kết quả trích xuất ({extractedItems.length} mục):
                    </h4>
                    <button
                      type="button"
                      onClick={handleImportAllExtracted}
                      className="tactile-button-gold px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save size={14} /> Lưu tất cả vào CSDL
                    </button>
                  </div>
                  {extractedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="tactile-card p-3.5 rounded-2xl space-y-1"
                    >
                      <p className="font-bold text-xs text-slate-900">
                        {item.topic}
                      </p>
                      <p className="text-xs text-slate-600">{item.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
