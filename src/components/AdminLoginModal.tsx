import React, { useState } from 'react';
import { Loader, ShieldAlert, X, Mail, Key } from 'lucide-react';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from '../services/firebase';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnableDemoAdmin: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onEnableDemoAdmin,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatusMsg('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Vui lòng nhập địa chỉ Email hợp lệ.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (!auth) {
      setError('Chưa kết nối được dịch vụ xác thực Firebase.');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, cleanEmail, password);
        setStatusMsg('Đăng ký tài khoản Quản trị thành công!');
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Xác thực không thành công.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoAdmin = () => {
    setError('');
    onEnableDemoAdmin();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-login-title"
      className="fixed inset-0 bg-slate-900/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-messageIn"
    >
      <div className="tactile-surface rounded-3xl w-full max-w-md p-6 sm:p-7 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng cửa sổ đăng nhập"
          className="absolute top-4 right-4 tactile-button-secondary p-2 rounded-xl cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full tactile-logo-badge overflow-hidden bg-red-900">
            <img
              src="./logoHAD.png"
              alt="Logo Phường Hội An Đông"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <h2
          id="admin-login-title"
          className="text-xl font-bold text-center text-slate-900 mb-1"
        >
          {isRegistering ? 'Đăng Ký Quản Trị Viên' : 'Đăng Nhập Quản Trị Viên'}
        </h2>
        <p className="text-xs text-slate-500 text-center mb-5">
          Quản lý cơ sở dữ liệu tri thức bầu cử Phường Hội An Đông
        </p>

        <form onSubmit={handleAuth} className="space-y-3.5">
          <div>
            <label
              htmlFor="admin-email-input"
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              Email Quản trị
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="admin-email-input"
                type="email"
                className="w-full pl-10 pr-3 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-red-600 shadow-inner"
                placeholder="admin@hoiandong.gov.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-password-input"
              className="block text-xs font-bold text-slate-700 mb-1.5"
            >
              Mật khẩu
            </label>
            <div className="relative">
              <Key
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                id="admin-password-input"
                type="password"
                className="w-full pl-10 pr-3 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-red-600 shadow-inner"
                placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="text-red-700 bg-red-50 border border-red-200 rounded-xl p-2.5 text-xs font-semibold text-center">
              {error}
            </p>
          )}
          {statusMsg && (
            <p className="text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-xs font-semibold text-center">
              {statusMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full tactile-button-primary py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            {isLoading && <Loader size={18} className="animate-spin" />}
            <span>
              {isRegistering ? 'Đăng Ký Tài Khoản' : 'Đăng Nhập Firebase'}
            </span>
          </button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="text-xs text-slate-400 font-semibold">
            Hoặc trải nghiệm nhanh
          </span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        <button
          type="button"
          onClick={handleDemoAdmin}
          className="w-full tactile-button-gold py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
        >
          <ShieldAlert size={15} />
          <span>Kích hoạt Chế độ Admin (Trải nghiệm nhanh)</span>
        </button>

        <div className="mt-4 flex flex-col items-center">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            className="text-red-700 hover:underline text-xs font-bold cursor-pointer"
          >
            {isRegistering
              ? 'Đã có tài khoản? Quay lại Đăng nhập'
              : 'Chưa có tài khoản Firebase? Đăng ký mới'}
          </button>
        </div>
      </div>
    </div>
  );
};
