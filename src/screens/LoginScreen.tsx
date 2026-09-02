import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Building2, Lock, Mail, User, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [tenantCode, setTenantCode] = useState('AAKASH-DIGITAL');
  const [email, setEmail] = useState('admin@aakashdigital.com');
  const [password, setPassword] = useState('Aakash@123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const tenantRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    tenantRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password, tenantCode);
    if (error) setError(error);
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<HTMLInputElement>) => {
    if (e.key === 'Enter' && nextRef) {
      e.preventDefault();
      nextRef.current?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0078d4] via-[#005a9e] to-[#004578] p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-lg shadow-lg mb-3">
            <Building2 className="w-9 h-9 text-[#0078d4]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Sahayak ERP</h1>
          <p className="text-sm text-blue-100 mt-1">Nepal-focused Multi-Branch ERP</p>
        </div>

        <div className="bg-white shadow-2xl">
          <div className="bg-[#0078d4] px-5 py-3">
            <h2 className="text-white text-sm font-semibold">Sign In</h2>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="bc-label block mb-1">Tenant ID</label>
              <div className="relative">
                <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={tenantRef}
                  type="text"
                  value={tenantCode}
                  onChange={(e) => setTenantCode(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, emailRef)}
                  className="bc-input pl-8"
                  placeholder="e.g. AAKASH-DIGITAL"
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className="bc-label block mb-1">User Email</label>
              <div className="relative">
                <Mail className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, passwordRef)}
                  className="bc-input pl-8"
                  placeholder="user@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="bc-label block mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={passwordRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e)}
                  className="bc-input pl-8"
                  placeholder="Enter password"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bc-btn-primary w-full disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="text-center pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Demo credentials are pre-filled. Click Sign In to continue.
              </p>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-blue-100 mt-4">
          Sahayak ERP — Nepal Business Management System
        </p>
      </div>
    </div>
  );
}
