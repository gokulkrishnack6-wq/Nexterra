import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Leaf, LogIn, ArrowRight, Sparkles, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginUser, allDemoUsers, switchUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const ok = await loginUser(email);
    if (ok) {
      navigate('/marketplace');
    } else {
      setError('Account with this email not found. You can click any demo persona below to login instantly.');
    }
  };

  const handleQuickLogin = (userId: string) => {
    switchUser(userId);
    navigate('/marketplace');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-forest text-lime flex items-center justify-center mx-auto shadow-md">
          <Leaf className="w-7 h-7" />
        </div>
        <h1 className="font-heading font-extrabold text-2xl text-forest-dark">
          Sign In to GreenLoop
        </h1>
        <p className="text-xs text-slate-500">
          Kerala's circular economy and sustainable waste exchange network.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-sage/40 shadow-soft p-6 sm:p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-forest-dark mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 bg-offwhite border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-forest text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-forest-dark mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-offwhite border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-forest text-slate-800"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-forest hover:bg-forest-dark text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4 text-lime" />
            <span>Sign In</span>
          </button>
        </form>

        {/* Demo Fast Login for judges */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <p className="text-[11px] font-bold text-forest uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Instant Demo Role Access (TERRACODE 2026):
          </p>
          <div className="grid grid-cols-2 gap-2">
            {allDemoUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => handleQuickLogin(u.id)}
                className="p-2 bg-offwhite hover:bg-sage-light text-left rounded-xl border border-slate-200 transition-colors"
              >
                <p className="text-xs font-bold text-forest-dark truncate">{u.full_name.split(' ')[0]}</p>
                <p className="text-[10px] text-slate-400 capitalize">{u.role}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-slate-500">
          New to GreenLoop?{' '}
          <Link to="/register" className="text-forest font-bold hover:underline">
            Register Account
          </Link>
        </div>
      </div>
    </div>
  );
};

