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
import { EnvironmentalIssueType } from '../../types';
import { ENVIRONMENTAL_ISSUE_CATEGORIES, getIssueTypeLabel } from '../../lib/reportCategories';

export const ReportIssuePage: React.FC = () => {
  const navigate = useNavigate();
  const { submitReport } = useData();
  const { currentUser } = useAuth();
  const { district: geoDistrict, locality: geoLocality, coords, detectLocation, loading: geoLoading } = useGeolocation();

  const keralaDistricts = Object.keys(KERALA_DISTRICT_COORDS);

  const [issueType, setIssueType] = useState<EnvironmentalIssueType>('overflowing_bin');
  const [otherDescription, setOtherDescription] = useState('');
  const [otherDescriptionError, setOtherDescriptionError] = useState('');
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

    // Required description when Other is selected
    if (issueType === 'other' && !otherDescription.trim()) {
      setOtherDescriptionError('Please describe the environmental issue.');
      alert('Please describe the environmental issue you want to report.');
      return;
    }

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
        other_description: issueType === 'other' ? otherDescription.trim() : undefined,
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-5 text-left">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5C6E66] hover:text-[#103D2A] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <Link to="/reports">
          <Button variant="secondary" size="sm">
            View All Reports Tracker
          </Button>
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="font-serif font-normal text-2xl sm:text-3xl text-[#103D2A] tracking-tight">
          Report an Issue
        </h1>
        <p className="font-sans text-xs sm:text-sm text-[#5C6E66]">
          Report overflowing bins, illegal dumping, or burning to alert the local community.
        </p>
      </div>

      {createdTicket ? (
        <div className="p-6 text-center space-y-4 max-w-lg mx-auto bg-white border border-[#E8E4DA] rounded-lg shadow-subtle">
          <div className="w-12 h-12 rounded-full bg-[#E8EFE9] text-[#103D2A] border border-[#C8D6C9] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-emerald-700" />
          </div>
          <div className="space-y-2">
            <span className="text-xs text-[#5C6E66] uppercase tracking-wider block font-medium">
              Incident Report Recorded
            </span>
            <h2 className="font-mono font-bold text-2xl text-[#103D2A]">
              #{createdTicket}
            </h2>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E8EFE9] text-[#103D2A] text-xs font-medium border border-[#C8D6C9]">
              {getIssueTypeLabel(issueType)}
            </div>
            {issueType === 'other' && otherDescription && (
              <div className="text-xs text-[#1C2826] bg-[#FAF8F2] border border-[#E8E4DA] p-2.5 rounded-md text-left max-w-sm mx-auto">
                <span className="font-medium text-[#785418] block text-[11px] uppercase tracking-wider">
                  Reported Issue Description:
                </span>
                <p className="mt-0.5 text-xs text-[#1C2826]">
                  {otherDescription}
                </p>
              </div>
            )}
            <p className="text-xs text-[#5C6E66] pt-1 leading-relaxed">
              Your environmental alert has been added to the GreenLoop tracking registry. You can monitor verification status on the public civic watch feed.
            </p>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 w-full">
            <Button
              variant="primary"
              size="md"
              fullWidth
              className="sm:w-auto"
              onClick={() => navigate('/reports')}
            >
              Track Ticket #{createdTicket}
            </Button>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              className="sm:w-auto"
              onClick={() => {
                setCreatedTicket(null);
                setTitle('');
                setDescription('');
                setOtherDescription('');
                setOtherDescriptionError('');
                setPhotoPreview(null);
                setPhotoUrl('');
              }}
            >
              Submit Another Report
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-5 sm:p-6 space-y-5 bg-white border border-[#E8E4DA] rounded-lg shadow-subtle">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Issue Category Radio Tiles */}
            <div>
              <label className="block text-xs text-[#1C2826] mb-1.5 font-medium">
                Type of Environmental Issue *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {ENVIRONMENTAL_ISSUE_CATEGORIES.map((item) => (
                  <label
                    key={item.id}
                    onClick={() => {
                      setIssueType(item.id);
                      if (item.id !== 'other') {
                        setOtherDescriptionError('');
                      }
                    }}
                    className={`p-3 rounded-md border cursor-pointer transition-colors flex items-start gap-2.5 ${
                      item.id === 'other' ? 'sm:col-span-2' : ''
                    } ${
                      issueType === item.id
                        ? 'bg-[#E8EFE9] border-[#103D2A] text-[#103D2A] shadow-xs'
                        : 'bg-white border-[#E8E4DA] hover:bg-[#F8F6EF]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="issueType"
                      checked={issueType === item.id}
                      onChange={() => {
                        setIssueType(item.id);
                        if (item.id !== 'other') {
                          setOtherDescriptionError('');
                        }
                      }}
                      className="mt-0.5 accent-[#103D2A]"
                    />
                    <div className="flex-1">
                      <span className="font-sans font-medium text-xs block text-[#1C2826]">{item.title}</span>
                      <span className="text-[11px] text-[#5C6E66] block mt-0.5">{item.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional required field when "Other Environmental Issue" is selected */}
            {issueType === 'other' && (
              <div className="p-3.5 bg-[#FAF8F2] border border-[#DFC9A5] rounded-md space-y-2 transition-all">
                <Input
                  label="Describe the environmental issue *"
                  placeholder="Briefly explain the issue you want to report..."
                  value={otherDescription}
                  onChange={(e) => {
                    setOtherDescription(e.target.value);
                    if (e.target.value.trim()) {
                      setOtherDescriptionError('');
                    }
                  }}
                  error={otherDescriptionError}
                  required={issueType === 'other'}
                />
                <p className="text-[11px] text-[#5C6E66]">
                  Please specify the environmental hazard, dumping, or pollution observed so our community and sanitation teams can take appropriate action.
                </p>
              </div>
            )}

            {/* Title & Landmark */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
            <div className="pt-2 border-t border-[#E8E4DA] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-sans font-medium text-xs text-[#1C2826] block">
                  Location Details
                </span>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={geoLoading}
                  className="text-xs text-[#103D2A] inline-flex items-center gap-1 hover:underline font-medium"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{geoLoading ? 'Detecting...' : 'Use Current GPS'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#1C2826] mb-1">
                    District *
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-white text-[#1C2826] text-xs rounded-md border border-[#DCD6CB] focus:border-[#103D2A] focus:ring-1 focus:ring-[#103D2A]/20 py-2 px-2.5 transition-all"
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
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#1C2826]">
                Photo Evidence (Camera or File)
              </label>

              {photoPreview ? (
                <div className="relative inline-block border border-[#E8E4DA] rounded-md overflow-hidden shadow-subtle">
                  <img
                    src={photoPreview}
                    alt="Report evidence preview"
                    className="w-44 h-32 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoPreview(null);
                      setPhotoUrl('');
                    }}
                    className="absolute top-2 right-2 p-1 rounded-md bg-white/90 text-[#1C2826] hover:text-red-600 transition-colors shadow-subtle"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-5 border border-dashed border-[#DCD6CB] rounded-md cursor-pointer hover:bg-[#F8F6EF] transition-colors max-w-sm">
                  <Camera className="w-5 h-5 text-[#103D2A] mb-1.5" />
                  <span className="text-xs font-medium text-[#103D2A]">Take Photo or Choose File</span>
                  <span className="text-[11px] text-[#5C6E66] mt-0.5">Mobile camera or desktop upload</span>
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

            <div className="pt-3 border-t border-[#E8E4DA] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 w-full">
              <Button
                type="button"
                variant="outline"
                size="md"
                fullWidth
                className="sm:w-auto"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                className="sm:w-auto"
                loading={submitting}
                icon={<Send className="w-3.5 h-3.5" />}
              >
                {submitting ? 'Submitting Report...' : 'Submit Environmental Report'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
