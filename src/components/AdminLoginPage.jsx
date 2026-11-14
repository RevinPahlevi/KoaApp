import { useState } from 'react';
import { ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import { saveAdminToken } from '../utils/storage';

export default function AdminLoginPage({ onSuccess, onBack }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.adminLogin({ username: username.trim(), password });
      saveAdminToken(res.token);
      onSuccess(res);
    } catch (err) {
      setError(err.message || 'Login gagal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-6 sm:py-10 space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-bold text-[#5D4037] hover:text-[#3E2723]"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Beranda
      </button>

      <div className="relative overflow-hidden rounded-3xl bg-[#FFFDF8] border border-[#DDD2BC] p-6 sm:p-8 shadow-md">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#B83A2D] via-[#E0A928] to-[#3E2723]" />

        <div className="flex flex-col items-center text-center space-y-2 mb-6 pt-1">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3E2723] text-[#E0A928] shadow-xs">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-extrabold text-[#3E2723]">Login Admin KoaPlay</h1>
          <p className="text-xs text-[#7A5C52]">
            Masuk untuk mengelola, mengedit, dan menghapus seluruh jadwal meja.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-[#FAE6E3] border border-[#B83A2D]/35 px-3.5 py-2.5 text-xs font-bold text-[#B83A2D]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#7A5C52] mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username admin"
              autoComplete="username"
              className="w-full rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3.5 py-2.5 text-base sm:text-sm font-semibold text-[#3E2723] focus:border-[#B83A2D] focus:bg-[#FFFDF8] focus:outline-none focus:ring-2 focus:ring-[#B83A2D]/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-[#7A5C52] mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password admin"
              autoComplete="current-password"
              className="w-full rounded-xl border border-[#DDD2BC] bg-[#FAF6EE] px-3.5 py-2.5 text-base sm:text-sm font-semibold text-[#3E2723] focus:border-[#B83A2D] focus:bg-[#FFFDF8] focus:outline-none focus:ring-2 focus:ring-[#B83A2D]/20"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#3E2723] py-3 px-4 text-sm font-extrabold text-[#E0A928] shadow-sm hover:bg-[#5D4037] disabled:opacity-50 transition"
          >
            <Lock className="h-4 w-4" />
            {loading ? 'Memeriksa...' : 'Masuk sebagai Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}
