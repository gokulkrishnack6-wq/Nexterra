import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  MapPin, 
  Camera, 
  Upload, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldAlert,
  Send
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { KERALA_DISTRICTS } from '../../lib/mockData';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input, Textarea } from '../../components/ui/Input';

export const ReportIssuePage: React.FC = () => {
  const navigate = useNavigate();
  const { submitReport } = useData();
  const { currentUser } = useAuth();

  const [issueType, setIssueType] = useState<'overflowing_bin' | 'illegal_dumping' | 'plastic_burning' | 'water_pollution'>('overflowing_bin');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [district, setDistrict] = useState(currentUser.district || 'Ernakulam');
  const [ward, setWard] = useState('Ward 24');
  const [locality, setLocality] = useState('Marine Drive Walkway');
  const [landmark, setLandmark] = useState('Near Rainbow Bridge');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<string | null>(null);

  const samplePhotos = [
    { label: 'Overflowing Bin', url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80' },
    { label: 'Coir Dump', url: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=600&q=80' },
    { label: 'Plastic Scrap', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      alert('Please fill out all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const ticket = submitReport({
        reporter_id: currentUser.id,
        reporter_name: currentUser.full_name,
        issue_type: issueType,
        title,
        description,
        district,
        ward,
        locality,
        landmark,
        latitude: currentUser.latitude || 9.9816,
        longitude: currentUser.longitude || 76.2750,
        photo_url: photoUrl || samplePhotos[0].url,
        assigned_team: 'KMC Rapid Response Sanitation Squad',
        assigned_vehicle: 'Route vehicle #KL-07-CS-4190',
        resolution_notes: 'Ticket logged with Kochi Municipal Corporation sanitation dispatch.'
      });

      setCreatedTicket(ticket);
    } catch (err: any) {
      alert(err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 font-label-md text-xs text-on-surface-variant hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <Link to="/reports">
          <Button variant="secondary" size="sm">
            View Civic Watch Tickets
          </Button>
        </Link>
      </div>

      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 mb-1">
          <Badge variant="error">Civic Incident Dispatch</Badge>
          <span className="text-outline text-xs">•</span>
          <span className="font-label-sm text-label-sm text-secondary">
            Kochi Municipal Corporation & Haritha Karma Sena Linked
          </span>
        </div>
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
          Report Environmental Issue / Waste Dump
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Submit geo-tagged alerts for overflowing municipal bins, unauthorized roadside dumps, or illegal plastic burning for rapid crew dispatch.
        </p>
      </div>

      {createdTicket ? (
        <Card variant="elevated" className="p-8 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-full bg-tertiary-fixed text-primary flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <span className="font-label-sm text-xs text-outline uppercase tracking-wider block font-semibold">
              Municipal Ticket Registered
            </span>
            <h2 className="font-heading font-bold text-3xl text-primary font-mono">
              #{createdTicket}
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant pt-2">
              Your report has been dispatched to the Ward 24 Haritha Karma Sena squad. You can monitor crew dispatch and photographic resolution on the live civic watch tracker.
            </p>
          </div>

          <div className="pt-4 flex items-center justify-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/reports')}
            >
              Track Ticket #{createdTicket}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => {
                setCreatedTicket(null);
                setTitle('');
                setDescription('');
              }}
            >
              Submit Another Report
            </Button>
          </div>
        </Card>
      ) : (
        <Card variant="elevated" className="p-6 sm:p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Issue Category Radio Tiles */}
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-2">
                Type of Environmental Infraction *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  { id: 'overflowing_bin', title: 'Overflowing Public Bin', desc: 'Waste spilling onto walkway or street' },
                  { id: 'illegal_dumping', title: 'Roadside / Vacant Plot Dump', desc: 'Commercial or residential unauthorized dumping' },
                  { id: 'plastic_burning', title: 'Open Plastic / Waste Burning', desc: 'Toxic smoke hazards in residential zone' },
                  { id: 'water_pollution', title: 'Canal / Water Body Contamination', desc: 'Waste channeled into drains or backwaters' },
                ].map((item) => (
                  <label
                    key={item.id}
                    onClick={() => setIssueType(item.id as any)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      issueType === item.id
                        ? 'bg-secondary-container/40 border-primary ring-1 ring-primary text-primary'
                        : 'bg-surface-container-low border-outline-variant hover:bg-surface-container'
                    }`}
                  >
                    <input
                      type="radio"
                      name="issueType"
                      checked={issueType === item.id}
                      onChange={() => setIssueType(item.id as any)}
                      className="mt-1 accent-primary"
                    />
                    <div>
                      <span className="font-heading font-semibold text-xs block text-on-surface">{item.title}</span>
                      <span className="text-[11px] text-on-surface-variant block mt-0.5">{item.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Title & Landmark */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Summary / Title *"
                placeholder="e.g. Overflowing Bin near Marine Drive Walkway"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <Input
                label="Exact Landmark / Nearest Pole *"
                placeholder="e.g. Opposite Post Office, Rainbow Bridge promenade"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                required
              />
            </div>

            {/* District & Ward */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1">
                  District *
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

              <Input
                label="Ward Number / Name *"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                required
              />

              <Input
                label="Locality / Neighborhood *"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <Textarea
              label="Detailed Observations & Severity *"
              rows={3}
              placeholder="Describe accumulation volume, odors, blockage of traffic or gutters, approximate duration observed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />

            {/* Photo Selection */}
            <div className="space-y-2">
              <span className="font-label-md text-label-md text-on-surface block">
                Evidence Photo (Optional or pick sample):
              </span>
              <div className="flex flex-wrap items-center gap-3">
                {samplePhotos.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setPhotoUrl(p.url)}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs transition-all ${
                      photoUrl === p.url ? 'border-primary ring-2 ring-primary/20 bg-surface-container' : 'border-outline-variant'
                    }`}
                  >
                    <img src={p.url} alt={p.label} className="w-10 h-10 rounded object-cover" />
                    <span className="text-on-surface font-medium pr-1">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-outline-variant/40 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={submitting}
                icon={<Send className="w-4 h-4" />}
              >
                {submitting ? 'Dispatching Ticket...' : 'Dispatch Civic Incident'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};

