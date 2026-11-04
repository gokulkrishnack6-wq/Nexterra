import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
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
      setError('Account with this email not found. You can choose any demo account below.');
    }
  };

  const handleQuickLogin = (userId: string) => {
    switchUser(userId);
    navigate('/marketplace');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-9 h-9 rounded-md bg-forest text-white flex items-center justify-center mx-auto">
          <Leaf className="w-5 h-5" />
        </div>
        <h1 className="font-heading font-bold text-xl text-forest">
          Sign in to GreenLoop
        </h1>
        <p className="text-xs text-charcoal-muted">
          Kerala's circular resource exchange network.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-[#E2E2D8] p-6 space-y-5 text-xs">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block font-medium text-charcoal mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
            />
          </div>

          <div>
            <label className="block font-medium text-charcoal mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-forest hover:bg-forest-dark text-white font-semibold text-xs rounded-md transition-colors"
          >
            Sign In
          </button>
        </form>

        {/* Demo Fast Login */}
        <div className="pt-4 border-t border-[#F0F0E6] space-y-2">
          <p className="text-[11px] font-medium text-charcoal-muted">
            Instant Demo Logins:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {allDemoUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => handleQuickLogin(u.id)}
                className="p-2 bg-cream hover:bg-[#EBEBE0] text-left rounded border border-[#E2E2D8] transition-colors"
              >
                <p className="font-semibold text-charcoal truncate">{u.full_name.split(' ')[0]}</p>
                <p className="text-[10px] text-charcoal-muted capitalize">{u.role}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-[11px] text-charcoal-muted pt-1">
          New to GreenLoop?{' '}
          <Link to="/register" className="text-forest font-semibold hover:underline">
            Register Account
          </Link>
        </div>
      </div>
    </div>
  );
};
