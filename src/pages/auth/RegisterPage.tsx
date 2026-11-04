import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { KERALA_DISTRICTS } from '../../lib/mockData';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Home, Building2, Sprout, Recycle, Users, ArrowRight, ShieldCheck } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('individual');
  const [district, setDistrict] = useState('Ernakulam');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await registerUser(name, email, role, district);
      navigate('/dashboard');
    } catch (err: any) {
      alert(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions: { role: UserRole; title: string; desc: string; icon: any }[] = [
    { role: 'individual', title: 'Individual / Household', desc: 'Exchange domestic recyclables & husks', icon: Home },
    { role: 'business', title: 'Business / Restaurant', desc: 'Divert commercial food scrap & cartons', icon: Building2 },
    { role: 'farmer', title: 'Farmer / Gardener', desc: 'Source bio-waste & organic substrate', icon: Sprout },
    { role: 'recycler', title: 'Recycler / MCF', desc: 'Aggregate sorted plastics, glass, metals', icon: Recycle },
    { role: 'ngo', title: 'NGO / Community Group', desc: 'Organize ward drives & challenges', icon: Users },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary flex items-center justify-center mx-auto shadow-sm">
          <span className="material-symbols-outlined text-[22px]">cyclone</span>
        </div>
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
          Join the GreenLoop Ecosystem
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mx-auto">
          Connect with households, businesses, farmers, and recycling networks across Kerala.
        </p>
      </div>

      <Card variant="elevated" className="space-y-6 p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role Selection Grid */}
          <div>
            <label className="block font-label-md text-label-md text-on-surface mb-2">
              Select Your Role in the Circular Chain *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {roleOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = role === opt.role;
                return (
                  <div
                    key={opt.role}
                    onClick={() => setRole(opt.role)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-secondary-container/50 border-primary text-primary ring-1 ring-primary'
                        : 'bg-surface-container-low border-outline-variant hover:bg-surface-container'
                    }`}
                  >
                    <div className={`p-2 rounded-lg mt-0.5 ${isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container text-outline'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-heading font-semibold text-xs block text-on-surface">
                        {opt.title}
                      </span>
                      <span className="text-[11px] text-on-surface-variant block mt-0.5">
                        {opt.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name / Organization *"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ananya Nair / Green Bakes"
            />

            <Input
              label="Email Address *"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Password *"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
            />

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">
                Kerala District *
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg border border-outline-variant hover:border-outline focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 py-2.5 px-3 transition-all"
              >
                {KERALA_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            size="lg"
            disabled={loading}
            icon={<ArrowRight className="w-4 h-4" />}
            iconPosition="right"
          >
            {loading ? 'Registering Account...' : 'Create GreenLoop Account'}
          </Button>
        </form>

        <div className="pt-2 text-center border-t border-outline-variant/60">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};
