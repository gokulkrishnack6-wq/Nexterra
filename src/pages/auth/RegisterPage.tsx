import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
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
        <div className="w-9 h-9 rounded-md bg-forest text-white flex items-center justify-center mx-auto">
          <Leaf className="w-5 h-5" />
        </div>
        <h1 className="font-heading font-bold text-xl text-forest">
          Join the GreenLoop Ecosystem
        </h1>
        <p className="text-xs text-charcoal-muted">
          Connect with households, businesses, farmers, and recycling networks across Kerala.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-[#E2E2D8] p-6 sm:p-8 space-y-5 text-xs">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium text-charcoal mb-1">
              Select Your Role in the Circular Chain *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label
                className={`p-2.5 rounded-md border cursor-pointer transition-colors ${
                  role === 'individual'
                    ? 'bg-cream border-forest text-charcoal font-medium'
                    : 'bg-white border-[#E2E2D8] text-charcoal-muted'
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
                <span className="font-semibold text-charcoal block">Household</span>
                <span className="text-[11px] text-charcoal-muted block">List household recyclables</span>
              </label>

              <label
                className={`p-2.5 rounded-md border cursor-pointer transition-colors ${
                  role === 'business'
                    ? 'bg-cream border-forest text-charcoal font-medium'
                    : 'bg-white border-[#E2E2D8] text-charcoal-muted'
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
                <span className="font-semibold text-charcoal block">Business / Kitchen</span>
                <span className="text-[11px] text-charcoal-muted block">Divert kitchen scraps & boxes</span>
              </label>

              <label
                className={`p-2.5 rounded-md border cursor-pointer transition-colors ${
                  role === 'farmer'
                    ? 'bg-cream border-forest text-charcoal font-medium'
                    : 'bg-white border-[#E2E2D8] text-charcoal-muted'
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
                <span className="font-semibold text-charcoal block">Farmer / Grower</span>
                <span className="text-[11px] text-charcoal-muted block">Request organic waste & coir</span>
              </label>

              <label
                className={`p-2.5 rounded-md border cursor-pointer transition-colors ${
                  role === 'recycler'
                    ? 'bg-cream border-forest text-charcoal font-medium'
                    : 'bg-white border-[#E2E2D8] text-charcoal-muted'
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
                <span className="font-semibold text-charcoal block">Recycling Centre</span>
                <span className="text-[11px] text-charcoal-muted block">Intake sorted plastics & metals</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-charcoal mb-1">
                Full Name / Organization *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Anjali Nair"
                className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
              />
            </div>

            <div>
              <label className="block font-medium text-charcoal mb-1">
                District in Kerala *
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
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
            <label className="block font-medium text-charcoal mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@kerala.eco"
              className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
            />
          </div>

          <div>
            <label className="block font-medium text-charcoal mb-1">
              Password *
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
            disabled={loading}
            className="w-full py-2.5 bg-forest hover:bg-forest-dark text-white font-semibold text-xs rounded-md transition-colors"
          >
            {loading ? 'Creating Account...' : 'Create GreenLoop Account'}
          </button>
        </form>

        <div className="text-center text-[11px] text-charcoal-muted">
          Already registered?{' '}
          <Link to="/login" className="text-forest font-semibold hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};
