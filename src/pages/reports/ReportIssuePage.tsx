import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  MapPin, 
  Camera, 
  Upload, 
  ArrowLeft, 
  CheckCircle2, 
  Send,
  Navigation,
  X
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useGeolocation, KERALA_DISTRICT_COORDS } from '../../hooks/useGeolocation';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input, Textarea } from '../../components/ui/Input';

export const ReportIssuePage: React.FC = () => {
  const navigate = useNavigate();
  const { submitReport } = useData();
  const { currentUser } = useAuth();
  const { district: geoDistrict, locality: geoLocality, coords, detectLocation, loading: geoLoading } = useGeolocation();

  const keralaDistricts = Object.keys(KERALA_DISTRICT_COORDS);

  const [issueType, setIssueType] = useState<'overflowing_bin' | 'illegal_dumping' | 'plastic_burning' | 'water_pollution'>('overflowing_bin');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [district, setDistrict] = useState(currentUser?.district || geoDistrict || '');
  const [ward, setWard] = useState('Ward 12');
  const [locality, setLocality] = useState(geoLocality || '');
  const [landmark, setLandmark] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<string | null>(null);

  // Sync with detected district and locality if not manually set
  useEffect(() => {
    if (geoDistrict && !district) {
      setDistrict(geoDistrict);
    }
    if (geoLocality && !locality) {
      setLocality(geoLocality);
    }
  }, [geoDistrict, geoLocality]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setPhotoPreview(base64);
        setPhotoUrl(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      alert('Please fill out all required fields.');
      return;
    }
    if (!district) {
      alert('Please select a Kerala district where the incident occurred.');
      return;
    }

    setSubmitting(true);
    try {
      const fallbackCoords = KERALA_DISTRICT_COORDS[district] || KERALA_DISTRICT_COORDS['Ernakulam'];
      const lat = coords ? coords.latitude : fallbackCoords.latitude;
      const lon = coords ? coords.longitude : fallbackCoords.longitude;

      const ticket = submitReport({
        reporter_id: currentUser ? currentUser.id : 'guest-reporter',
        reporter_name: currentUser ? currentUser.full_name : 'Community Citizen',
        issue_type: issueType,
        title,
        description,
        district,
        ward: ward || 'Ward 01',
        locality: locality || district,
        landmark: landmark || 'Nearest public road',
        latitude: lat,
        longitude: lon,
        photo_url: photoUrl || undefined,
        assigned_team: 'Community Waste Monitoring Network',
        resolution_notes: 'Report recorded in GreenLoop registry for community action.',
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gl-charcoal-muted hover:text-gl-forest transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <Link to="/reports">
          <Button variant="secondary" size="sm" className="rounded-xl">
            View All Reports Tracker
          </Button>
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl lg:text-[34px] text-[#18251F] tracking-tight">
          Report an Issue
        </h1>
        <p className="font-sans text-sm text-[#6F776F]">
          Report overflowing bins, illegal dumping, or burning to alert the local community.
        </p>
      </div>

      {createdTicket ? (
        <Card variant="elevated" className="p-8 text-center space-y-4 max-w-lg mx-auto bg-white border border-gl-border rounded-2xl shadow-card">
          <div className="w-14 h-14 rounded-full bg-gl-sage-light text-gl-forest border border-gl-sage flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-gl-fresh" />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gl-charcoal-muted uppercase tracking-wider block font-bold">
              Incident Report Recorded
            </span>
            <h2 className="font-heading font-extrabold text-3xl text-gl-forest font-mono">
              #{createdTicket}
            </h2>
            <p className="text-sm text-gl-charcoal-muted pt-2">
              Your environmental alert has been added to the GreenLoop tracking registry. You can monitor verification status on the public civic watch feed.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 w-full">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="sm:w-auto rounded-xl shadow-sm"
              onClick={() => navigate('/reports')}
            >
              Track Ticket #{createdTicket}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              className="sm:w-auto rounded-xl"
              onClick={() => {
                setCreatedTicket(null);
                setTitle('');
                setDescription('');
                setPhotoPreview(null);
                setPhotoUrl('');
              }}
            >
              Submit Another Report
            </Button>
          </div>
        </Card>
      ) : (
        <Card variant="elevated" className="p-6 sm:p-8 space-y-6 bg-white border border-gl-border rounded-2xl shadow-card">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Issue Category Radio Tiles */}
            <div>
              <label className="block text-sm text-gl-charcoal mb-2 font-bold font-heading">
                Type of Environmental Issue *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {[
                  { id: 'overflowing_bin', title: 'Overflowing Public Bin', desc: 'Waste spilling onto walkway or street' },
                  { id: 'illegal_dumping', title: 'Roadside / Vacant Plot Dump', desc: 'Commercial or residential unauthorized dumping' },
                  { id: 'plastic_burning', title: 'Open Waste / Plastic Burning', desc: 'Smoke and air pollution hazards' },
                  { id: 'water_pollution', title: 'Drain / Canal Contamination', desc: 'Solid waste accumulating in water bodies' },
                ].map((item) => (
                  <label
                    key={item.id}
                    onClick={() => setIssueType(item.id as any)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      issueType === item.id
                        ? 'bg-gl-sage-light/60 border-gl-forest ring-1 ring-gl-forest text-gl-forest'
                        : 'bg-gl-cream/40 border-gl-border hover:bg-gl-cream'
                    }`}
                  >
                    <input
                      type="radio"
                      name="issueType"
                      checked={issueType === item.id}
                      onChange={() => setIssueType(item.id as any)}
                      className="mt-1 accent-[#123D29]"
                    />
                    <div>
                      <span className="font-heading font-bold text-xs block text-gl-charcoal">{item.title}</span>
                      <span className="text-[11px] text-gl-charcoal-muted block mt-0.5">{item.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Title & Landmark */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Summary / Title *"
                placeholder="e.g. Overflowing Bin near Market Road"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <Input
                label="Exact Landmark / Nearest Point *"
                placeholder="e.g. Near Bus Stop / Post Office"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                required
              />
            </div>

            {/* Location with GPS */}
            <div className="pt-2 border-t border-gl-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-sm text-gl-charcoal block">
                  Location Details
                </span>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={geoLoading}
                  className="text-xs text-gl-forest inline-flex items-center gap-1 hover:underline font-semibold"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{geoLoading ? 'Detecting...' : 'Use My GPS Location'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gl-charcoal mb-1">
                    District *
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-white text-gl-charcoal text-sm rounded-xl border border-gl-border hover:border-gl-forest/50 focus:outline-none focus:border-gl-forest focus:ring-2 focus:ring-gl-forest/20 py-2.5 px-3 transition-all"
                    required
                  >
                    <option value="">Select Kerala District</option>
                    {keralaDistricts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Ward Name / Number *"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  placeholder="e.g. Ward 12"
                  required
                />

                <Input
                  label="Locality / Neighborhood *"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="e.g. Kadavanthra"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <Textarea
              label="Detailed Observations & Severity *"
              rows={3}
              placeholder="Describe accumulation volume, odors, duration observed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />

            {/* Real Photo Upload / Camera */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gl-charcoal">
                Photo Evidence (Camera or File)
              </label>

              {photoPreview ? (
                <div className="relative inline-block border border-gl-border rounded-xl overflow-hidden shadow-2xs">
                  <img
                    src={photoPreview}
                    alt="Report evidence preview"
                    className="w-48 h-36 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      setPhotoUrl('');
                    }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-white/80 text-gl-charcoal hover:text-error transition-colors shadow-2xs"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gl-border rounded-xl cursor-pointer hover:bg-gl-cream/60 transition-colors max-w-sm">
                  <Camera className="w-6 h-6 text-gl-forest mb-2" />
                  <span className="text-xs font-semibold text-gl-forest">Snap Photo or Choose File</span>
                  <span className="text-[10px] text-gl-charcoal-muted mt-0.5">Supports mobile camera & desktop upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="pt-4 border-t border-gl-border flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 w-full">
              <Button
                type="button"
                variant="outline"
                fullWidth
                className="sm:w-auto rounded-xl"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                className="sm:w-auto rounded-xl shadow-sm"
                loading={submitting}
                icon={<Send className="w-4 h-4" />}
              >
                {submitting ? 'Submitting Report...' : 'Submit Environmental Report'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
