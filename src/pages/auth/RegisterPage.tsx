import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Leaf, UserPlus, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { KERALA_DISTRICTS } from '../../lib/mockData';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('individual');
  const [district, setDistrict] = useState('Malappuram');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await registerUser(name, email, role, district);
      navigate('/marketplace');
    } catch (err: any) {
      alert(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-forest text-lime flex items-center justify-center mx-auto shadow-md">
          <Leaf className="w-7 h-7" />
        </div>
        <h1 className="font-heading font-extrabold text-2xl text-forest-dark">
          Join the GreenLoop Ecosystem
        </h1>
        <p className="text-xs text-slate-500">
          Earn +100 Welcome EcoPoints and divert materials from Kerala's landfills.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-sage/40 shadow-soft p-6 sm:p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-forest-dark mb-1">
              Select Your Role in the Circular Chain *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  role === 'individual'
                    ? 'bg-sage-light/60 border-forest text-forest-dark font-bold'
                    : 'bg-offwhite border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="individual"
                  checked={role === 'individual'}
                  onChange={() => setRole('individual')}
                  className="hidden"
                />
                <span className="block font-bold">Individual / Household</span>
                <span className="text-[10px] text-slate-500 block">List household recyclables & earn points</span>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  role === 'business'
                    ? 'bg-sage-light/60 border-forest text-forest-dark font-bold'
                    : 'bg-offwhite border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="business"
                  checked={role === 'business'}
                  onChange={() => setRole('business')}
                  className="hidden"
                />
                <span className="block font-bold">Business / Restaurant</span>
                <span className="text-[10px] text-slate-500 block">Divert kitchen scraps & packaging</span>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  role === 'farmer'
                    ? 'bg-sage-light/60 border-forest text-forest-dark font-bold'
                    : 'bg-offwhite border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="farmer"
                  checked={role === 'farmer'}
                  onChange={() => setRole('farmer')}
                  className="hidden"
                />
                <span className="block font-bold">Farmer / Agro Grower</span>
                <span className="text-[10px] text-slate-500 block">Request organic waste & coir mulch</span>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  role === 'recycler'
                    ? 'bg-sage-light/60 border-forest text-forest-dark font-bold'
                    : 'bg-offwhite border-slate-200 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value="recycler"
                  checked={role === 'recycler'}
                  onChange={() => setRole('recycler')}
                  className="hidden"
                />
                <span className="block font-bold">Recycling Facility / MCF</span>
                <span className="text-[10px] text-slate-500 block">Intake plastics, e-waste, metals</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-forest-dark mb-1">
                Full Name / Organization *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anjali Nair"
                className="w-full px-3.5 py-2.5 bg-offwhite border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-forest text-slate-800 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-forest-dark mb-1">
                District in Kerala *
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-offwhite border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-forest text-slate-800 font-medium"
              >
                {KERALA_DISTRICTS.filter((d) => d !== 'All Kerala').map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-forest-dark mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="anjali@kerala.eco"
              className="w-full px-3.5 py-2.5 bg-offwhite border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-forest text-slate-800 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-forest-dark mb-1">
              Password *
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-offwhite border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-forest text-slate-800 font-medium"
            />
          </div>

          <div className="p-3 bg-lime/20 border border-lime/40 rounded-xl flex items-center justify-between text-xs">
            <span className="text-forest-dark font-medium flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-forest" />
              <span>Sign-up bonus: <strong>+100 EcoPoints</strong></span>
            </span>
            <span className="font-bold text-forest bg-white px-2 py-0.5 rounded shadow-sm">
              Instant Credit
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-forest hover:bg-forest-dark text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4 text-lime" />
            <span>{loading ? 'Creating Account...' : 'Create GreenLoop Account'}</span>
          </button>
        </form>

        <div className="text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-forest font-bold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

