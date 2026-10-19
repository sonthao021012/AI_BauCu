/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Database,
  Lock,
  LogOut,
  MessageSquare,
  BookOpen,
  ShieldAlert,
  Gamepad2,
  Palette,
  Search,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import {
  KnowledgeItem,
  OFFICIAL_BOOK_DATA,
} from './utils/electionLogic';
import {
  auth,
  db,
  APP_ID,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  FirebaseUser,
  loadLocalKnowledgeBase,
  saveLocalKnowledgeBase,
} from './services/firebase';
import {
  generateGeminiResponse,
  processAdminChatCommand,
  generateQuizData,
  generatePosterImage,
} from './services/geminiClient';
import { ChatMessage, ChatMessageData } from './components/ChatMessage';
import { QuickPrompts } from './components/QuickPrompts';
import { AdminLoginModal } from './components/AdminLoginModal';
import { DataManagerModal } from './components/DataManagerModal';
import { KnowledgeDrawer } from './components/KnowledgeDrawer';

const TypingIndicator: React.FC = () => (
  <div className="flex justify-start mb-6 animate-fadeIn">
    <div className="flex gap-3.5 items-center">
      <div className="w-11 h-11 rounded-full bg-red-900 tactile-logo-badge flex items-center justify-center overflow-hidden">
        <img
          src="./logoHAD.png"
          alt="Đang trả lời"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover animate-pulse"
        />
      </div>
      <div className="tactile-bubble-bot px-5 py-4 rounded-2xl rounded-tl-xs flex items-center gap-2 h-12">
        <div
          className="w-2.5 h-2.5 bg-red-600 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <div
          className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <div
          className="w-2.5 h-2.5 bg-red-600 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  </div>
);

export default function App() {
  const [messages, setMessages] = useState<ChatMessageData[]>([
    {
      id: 1,
      sender: 'bot',
      text: 'Xin chào cử tri! 🇻🇳\nTôi là **Trợ lý AI Phường Hội An Đông**.\n\nHôm nay bạn muốn tra cứu luật bầu cử, thử sức với **Bài trắc nghiệm ✨** hay nhờ AI vẽ một bức **Poster cổ động ✨**?',
      type: 'text',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDemoAdmin, setIsDemoAdmin] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isDataManagerOpen, setIsDataManagerOpen] = useState(false);
  const [isKnowledgeDrawerOpen, setIsKnowledgeDrawerOpen] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>(() =>
    loadLocalKnowledgeBase()
  );
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (!currentUser.isAnonymous) {
          setIsAdmin(true);
        }
      } else {
        signInAnonymously(auth).catch((e) =>
          console.warn('Anonymous auth fallback:', e)
        );
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db) return;
    try {
      const colRef = collection(
        db,
        'artifacts',
        APP_ID,
        'public',
        'data',
        'knowledge_base'
      );
      const q = query(colRef, orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const docs: KnowledgeItem[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              topic: String(data.topic || ''),
              content: String(data.content || ''),
              source: data.source ? String(data.source) : undefined,
              createdAt: data.createdAt,
            };
          });
          if (docs.length > 0) {
            setKnowledgeBase(docs);
            saveLocalKnowledgeBase(docs);
          }
        },
        (err) => {
          console.warn('Firestore snapshot fallback to local data:', err);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore query setup skipped:', e);
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const effectiveAdmin = isAdmin || isDemoAdmin;

  const handleLogout = async () => {
    setIsDemoAdmin(false);
    setIsAdmin(false);
    setIsDataManagerOpen(false);
    if (auth && user && !user.isAnonymous) {
      try {
        await signOut(auth);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const addKnowledgeItem = async (
    topic: string,
    content: string,
    source = 'Admin'
  ) => {
    const newItem: KnowledgeItem = {
      id: `kb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      topic,
      content,
      source,
      createdAt: Date.now(),
    };
    setKnowledgeBase((prev) => {
      const next = [newItem, ...prev];
      saveLocalKnowledgeBase(next);
      return next;
    });

    if (db) {
      try {
        const colRef = collection(
          db,
          'artifacts',
          APP_ID,
          'public',
          'data',
          'knowledge_base'
        );
        await addDoc(colRef, {
          topic,
          content,
          source,
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Saved locally (Firestore write skipped):', e);
      }
    }
  };

  const updateKnowledgeItem = async (
    id: string,
    topic: string,
    content: string
  ) => {
    setKnowledgeBase((prev) => {
      const next = prev.map((item) =>
        item.id === id ? { ...item, topic, content, updatedAt: Date.now() } : item
      );
      saveLocalKnowledgeBase(next);
      return next;
    });

    if (db && !id.startsWith('official-') && !id.startsWith('kb-')) {
      try {
        const colRef = collection(
          db,
          'artifacts',
          APP_ID,
          'public',
          'data',
          'knowledge_base'
        );
        await updateDoc(doc(colRef, id), {
          topic,
          content,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('Updated locally (Firestore update skipped):', e);
      }
    }
  };

  const deleteKnowledgeItem = async (id: string) => {
    setKnowledgeBase((prev) => {
      const next = prev.filter((item) => item.id !== id);
      saveLocalKnowledgeBase(next);
      return next;
    });

    if (db && !id.startsWith('official-') && !id.startsWith('kb-')) {
      try {
        const colRef = collection(
          db,
          'artifacts',
          APP_ID,
          'public',
          'data',
          'knowledge_base'
        );
        await deleteDoc(doc(colRef, id));
      } catch (e) {
        console.warn('Deleted locally (Firestore delete skipped):', e);
      }
    }
  };

  const resetDefaultKnowledge = async () => {
    setKnowledgeBase(OFFICIAL_BOOK_DATA);
    saveLocalKnowledgeBase(OFFICIAL_BOOK_DATA);
  };

  const handleSendMessage = async (textOrCmd: string) => {
    if (!textOrCmd.trim()) return;

    let displayUserText = textOrCmd;
    if (textOrCmd === 'CMD_POSTER') {
      displayUserText = '🎨 Hãy vẽ cho tôi một poster cổ động bầu cử!';
    }
    if (textOrCmd === 'CMD_QUIZ') {
      displayUserText =
        '📝 Hãy tạo một câu hỏi trắc nghiệm kiểm tra kiến thức của tôi.';
    }

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        sender: 'user',
        text: displayUserText,
        type: 'text',
      },
    ]);
    setInputValue('');
    setIsTyping(true);

    try {
      if (textOrCmd === 'CMD_POSTER') {
        const imageUrl = await generatePosterImage();
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            type: 'image',
            text: '✨ Tada! AI vừa sáng tác bức tranh cổ động bầu cử dành tặng bạn:',
            data: imageUrl,
          },
        ]);
      } else if (textOrCmd === 'CMD_QUIZ') {
        const quizData = await generateQuizData(knowledgeBase);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            type: 'quiz',
            text: '✨ Thử tài kiến thức bầu cử Phường Hội An Đông của bạn nhé:',
            data: quizData,
          },
        ]);
      } else if (effectiveAdmin) {
        const result = await processAdminChatCommand(
          displayUserText,
          knowledgeBase
        );
        let finalReply = result.reply;
        let success = false;

        if (result.action === 'add' && result.topic) {
          await addKnowledgeItem(
            result.topic,
            result.content || '',
            'Admin Agent'
          );
          finalReply = `✅ Đã lưu vào CSDL thành công.\n\n**Tiêu đề:** ${result.topic}\n**Nội dung:** ${result.content}`;
          success = true;
        } else if (result.action === 'update' && result.targetId) {
          await updateKnowledgeItem(
            result.targetId,
            result.topic || 'Cập nhật',
            result.content || ''
          );
          finalReply = `✅ Đã cập nhật CSDL thành công.\n\n**Tiêu đề:** ${result.topic}\n**Nội dung mới:** ${result.content}`;
          success = true;
        } else if (result.action === 'delete' && result.targetId) {
          await deleteKnowledgeItem(result.targetId);
          finalReply = `🗑️ Đã xóa bản ghi "${result.topic || result.targetId}" khỏi CSDL.`;
          success = true;
        }

        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            text: finalReply,
            type: 'text',
            isAdminCmd: success,
          },
        ]);
      } else {
        const response = await generateGeminiResponse(
          displayUserText,
          knowledgeBase
        );
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            sender: 'bot',
            text: response,
            type: 'text',
          },
        ]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const filteredSidebarKB = knowledgeBase.filter(
    (k) =>
      k.topic.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      k.content.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-slate-100 text-slate-900 overflow-hidden">
      {/* Modals & Drawers */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onEnableDemoAdmin={() => setIsDemoAdmin(true)}
      />

      <DataManagerModal
        isOpen={isDataManagerOpen}
        onClose={() => setIsDataManagerOpen(false)}
        knowledgeBase={knowledgeBase}
        onAddItem={addKnowledgeItem}
        onUpdateItem={updateKnowledgeItem}
        onDeleteItem={deleteKnowledgeItem}
        onResetDefaults={resetDefaultKnowledge}
      />

      <KnowledgeDrawer
        isOpen={isKnowledgeDrawerOpen}
        onClose={() => setIsKnowledgeDrawerOpen(false)}
        knowledgeBase={knowledgeBase}
        onAskTopic={(prompt) => handleSendMessage(prompt)}
      />

      {/* 3-Zone Top Bar Contract */}
      <header className="bg-white border-b border-slate-300 shadow-[0_3px_0_0_#e2e8f0] px-3 sm:px-6 py-2.5 z-20 shrink-0">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-2 sm:gap-8">
          {/* Zone 1: Brand Lockup with HAD Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <img
              src="./logoHAD.png"
              alt="Logo Phường Hội An Đông"
              referrerPolicy="no-referrer"
              className="w-9 h-9 sm:w-11 sm:h-11 rounded-full object-cover tactile-logo-badge shrink-0"
            />
            <span className="font-display font-bold text-sm sm:text-lg text-slate-900 tracking-tight truncate">
              Trợ Lý Bầu Cử Hội An Đông
            </span>
          </div>

          {/* Zone 2: Clean Single-Line Navigation Links */}
          <nav
            aria-label="Điều hướng chính"
            className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600"
          >
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              className="hover:text-red-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Hỏi đáp AI
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('CMD_QUIZ')}
              className="hover:text-red-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Trắc nghiệm
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage('CMD_POSTER')}
              className="hover:text-red-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Poster cổ động
            </button>
            <button
              type="button"
              onClick={() => setIsKnowledgeDrawerOpen(true)}
              className="hover:text-red-700 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Cẩm nang ({knowledgeBase.length})
            </button>
          </nav>

          {/* Zone 3: Primary Action */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsKnowledgeDrawerOpen(true)}
              aria-label="Mở Cẩm nang Bầu cử"
              className="lg:hidden tactile-button-secondary px-2.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              title="Cẩm nang Bầu cử"
            >
              <BookOpen size={15} className="text-red-600" />
              <span className="hidden sm:inline">Cẩm nang</span>
            </button>

            {effectiveAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsDataManagerOpen(true)}
                  aria-label="Quản lý Cơ sở dữ liệu"
                  className="tactile-button-gold px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Database size={15} />
                  <span>Quản lý CSDL</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  aria-label="Thoát chế độ Quản trị"
                  className="tactile-button-secondary p-2 rounded-xl text-slate-600 hover:text-red-600 cursor-pointer shrink-0"
                  title="Đăng xuất Quản trị"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsAdminLoginOpen(true)}
                aria-label="Đăng nhập Quản trị"
                className="tactile-button-primary px-3 sm:px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Lock size={14} />
                <span>Quản trị</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main 2-Column Tactile Workspace */}
      <div className="flex-1 max-w-[1400px] w-full mx-auto p-3 sm:p-5 flex gap-5 overflow-hidden">
        {/* Left Tactile Column: Embossed HAD Identity Card + Direct Knowledge Base */}
        <aside
          aria-label="Thông tin bầu cử và Cẩm nang nhanh"
          className="hidden lg:flex lg:w-[370px] shrink-0 flex-col gap-4 h-full overflow-hidden"
        >
          {/* 3D Embossed Crimson & Gold Identity Card */}
          <div className="tactile-hero-crimson rounded-3xl p-5 text-white shrink-0">
            <div className="flex items-center gap-4 mb-4">
              <img
                src="./logoHAD.png"
                alt="Biểu trưng Phường Hội An Đông"
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover tactile-logo-badge shrink-0 bg-red-900"
              />
              <div>
                <p className="text-xs font-semibold text-amber-200">
                  Cổng thông tin Cử tri
                </p>
                <h2 className="text-xl font-bold tracking-tight text-white leading-snug">
                  Phường Hội An Đông
                </h2>
                <p className="text-xs text-red-100 mt-0.5 tabular-nums">
                  Nhiệm kỳ 2026 – 2031
                </p>
              </div>
            </div>

            <div className="bg-black/25 border border-white/15 rounded-2xl p-3 mb-4 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-amber-200 font-semibold">
                <Calendar size={14} /> Ngày bầu cử:
              </span>
              <span className="font-bold text-white tabular-nums">
                Chủ nhật · 10/03/2026
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isTyping}
                onClick={() => handleSendMessage('CMD_QUIZ')}
                className="tactile-button-gold py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <Gamepad2 size={15} />
                <span>Làm Quiz vui</span>
              </button>
              <button
                type="button"
                disabled={isTyping}
                onClick={() => handleSendMessage('CMD_POSTER')}
                className="tactile-button-secondary py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <Palette size={15} className="text-red-700" />
                <span>Vẽ Poster AI</span>
              </button>
            </div>
          </div>

          {/* Direct Tactile Cẩm Nang Bầu Cử List */}
          <div className="tactile-surface rounded-3xl p-4 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <BookOpen size={16} className="text-red-600" />
                <span>Cẩm Nang Quy Định</span>
              </h3>
              <span className="text-xs font-semibold text-slate-500 tabular-nums">
                {knowledgeBase.length} mục
              </span>
            </div>

            <div className="relative mb-3">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                placeholder="Tra cứu nhanh quy định..."
                aria-label="Tra cứu nhanh quy định bầu cử"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:border-red-500 focus:bg-white shadow-inner"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {filteredSidebarKB.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={isTyping}
                  onClick={() =>
                    handleSendMessage(`Hãy giải thích chi tiết về: ${item.topic}`)
                  }
                  className="w-full text-left tactile-card tactile-card-interactive p-3.5 rounded-2xl block cursor-pointer disabled:opacity-60"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-xs text-slate-900">
                      {item.topic}
                    </span>
                    <ChevronRight size={14} className="text-red-600 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {item.content}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Main Chat Canvas */}
        <section
          aria-label="Khung trò chuyện với Trợ lý Bầu cử AI"
          className="flex-1 tactile-surface rounded-3xl flex flex-col h-full overflow-hidden"
        >
          {/* Context Banner inside Chat Workspace */}
          <div className="px-4 sm:px-6 py-3 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
              <span className="font-bold text-slate-900">
                Trợ lý AI Phường Hội An Đông
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                Đã nạp {knowledgeBase.length} văn bản hướng dẫn
              </span>
              {effectiveAdmin && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <ShieldAlert size={13} /> Chế độ Quản trị viên (Admin Agent)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Chat Message Stream */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth bg-slate-50/40">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onRequestNextQuiz={() => handleSendMessage('CMD_QUIZ')}
              />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </main>

          {/* Sculpted 3D Input Dock */}
          <footer className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
            <div className="max-w-4xl mx-auto space-y-2.5">
              {effectiveAdmin && (
                <div className="tactile-card bg-emerald-50/90 border-emerald-300 text-emerald-950 text-xs py-2 px-3.5 rounded-xl flex items-center justify-between gap-2 animate-fadeIn">
                  <span className="flex items-center gap-2">
                    <ShieldAlert size={15} className="text-emerald-700 shrink-0" />
                    <span>
                      <strong>Lệnh Admin qua Chat:</strong> Gõ{' '}
                      <em>&ldquo;Thêm nội dung: Tiêu đề - Nội dung&rdquo;</em>,{' '}
                      <em>&ldquo;Sửa ngày bầu cử thành...&rdquo;</em> hoặc{' '}
                      <em>&ldquo;Xóa mục...&rdquo;</em>
                    </span>
                  </span>
                </div>
              )}

              <QuickPrompts onSelect={handleSendMessage} disabled={isTyping} />

              <div className="tactile-input-dock flex gap-2 sm:gap-3 items-center p-1.5 sm:p-2 rounded-2xl">
                <div className="pl-2.5 sm:pl-3 text-red-600">
                  <MessageSquare size={20} />
                </div>
                <label htmlFor="chat-query-input" className="sr-only">
                  Nhập câu hỏi hoặc lệnh quản trị
                </label>
                <input
                  ref={inputRef}
                  id="chat-query-input"
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && handleSendMessage(inputValue)
                  }
                  disabled={isTyping}
                  placeholder={
                    effectiveAdmin
                      ? 'Nhập lệnh quản lý dữ liệu (VD: Thêm nội dung: Giờ bầu cử - Từ 7h đến 19h)...'
                      : 'Nhập câu hỏi về bầu cử Phường Hội An Đông...'
                  }
                  className="flex-1 py-2.5 outline-none bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim() || isTyping}
                  aria-label="Gửi tin nhắn"
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                    inputValue.trim()
                      ? 'tactile-button-primary'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  <Send size={16} />
                  <span className="hidden sm:inline">Gửi</span>
                </button>
              </div>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
