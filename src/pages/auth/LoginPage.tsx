import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ArrowRight, CheckCircle2, ShieldCheck, Mail, Lock } from 'lucide-react';

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
      navigate('/dashboard');
    } else {
      setError('Account with this email not found. You can select any verified demo persona below.');
    }
  };

  const handleQuickLogin = (userId: string) => {
    switchUser(userId);
    navigate('/dashboard');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center mx-auto shadow-sm">
          <span className="material-symbols-outlined text-[22px]">cyclone</span>
        </div>
        <h1 className="font-heading font-bold text-2xl text-primary tracking-tight">
          Sign in to GreenLoop
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Access Kerala's verified circular resource exchange network.
        </p>
      </div>

      <Card variant="elevated" className="space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-error-container text-on-error-container rounded-lg text-body-sm font-medium border border-error/20">
              {error}
            </div>
          )}

          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            icon={<ArrowRight className="w-4 h-4" />}
            iconPosition="right"
          >
            Sign In to Dashboard
          </Button>
        </form>

        {/* Demo Fast Personas */}
        <div className="pt-4 border-t border-outline-variant/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
              Instant Demo Personas
            </span>
            <Badge variant="success">One-Click Switch</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {allDemoUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => handleQuickLogin(u.id)}
                className="p-2.5 bg-surface-container hover:bg-surface-container-high text-left rounded-lg border border-outline-variant/60 transition-all text-xs"
              >
                <div className="font-heading font-semibold text-primary truncate">
                  {u.full_name}
                </div>
                <div className="text-[11px] text-on-surface-variant capitalize">
                  {u.role} • {u.district}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="pt-2 text-center">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};
