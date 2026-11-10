import React, { useState, useEffect } from 'react';
import { Phone, MessageSquare, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateProfile } = useAuth();

  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(currentUser?.whatsapp_number || '');
  const [sharePhone, setSharePhone] = useState(currentUser?.share_phone_with_exchange ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (currentUser) {
      setPhone(currentUser.phone || '');
      setWhatsappNumber(currentUser.whatsapp_number || currentUser.phone || '');
      setSharePhone(currentUser.share_phone_with_exchange ?? false);
      setStatusMsg(null);
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);

    // Format validation if WhatsApp number is provided
    if (whatsappNumber.trim()) {
      const cleanDigits = whatsappNumber.replace(/\D/g, '');
      if (cleanDigits.length < 10 || cleanDigits.length > 15) {
        setStatusMsg({ type: 'error', text: 'Please enter a valid mobile number with 10 to 15 digits.' });
        setIsSaving(false);
        return;
      }
    }

    try {
      const res = await updateProfile({
        phone: phone.trim() ? phone.trim() : undefined,
        whatsapp_number: whatsappNumber.trim() ? whatsappNumber.trim() : undefined,
        share_phone_with_exchange: sharePhone,
        share_whatsapp_with_exchange: true,
      });

      if (res.success) {
        setStatusMsg({ type: 'success', text: 'Privacy & contact preferences saved.' });
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setStatusMsg({ type: 'error', text: res.error || 'Failed to update preferences.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error saving settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Contact & Privacy Settings"
      subtitle="Control how you communicate with verified exchange partners"
      icon={<ShieldCheck className="w-5 h-5 text-[#103D2A]" />}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="profile-settings-form"
            variant="primary"
            size="sm"
            disabled={isSaving}
            className="rounded-xl shadow-sm"
          >
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      }
    >
      <form id="profile-settings-form" onSubmit={handleSave} className="space-y-4 text-left">
        {statusMsg && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-[#E8EEDC] text-[#103D2A] border border-[#C5D6B8]'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
          >
            {statusMsg.type === 'success' && <Check className="w-4 h-4 shrink-0 text-emerald-600" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Phone Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#18251F]">
            Phone Number
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#68736B]" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E9E2D5] rounded-xl text-sm text-[#18251F] focus:outline-none focus:border-[#103D2A] focus:ring-2 focus:ring-[#103D2A]/20 font-mono shadow-2xs"
            />
          </div>
          <p className="text-[11px] text-[#68736B]">
            Used for handover coordination calls when enabled below.
          </p>
        </div>

        {/* WhatsApp Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#18251F]">
            WhatsApp Number
          </label>
          <div className="relative">
            <MessageSquare className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#68736B]" />
            <input
              type="tel"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#E9E2D5] rounded-xl text-sm text-[#18251F] focus:outline-none focus:border-[#103D2A] focus:ring-2 focus:ring-[#103D2A]/20 font-mono shadow-2xs"
            />
          </div>
          <p className="text-[11px] text-[#68736B]">
            Leave blank to use your standard phone number for WhatsApp.
          </p>
        </div>

        {/* Phone Call Options */}
        <div className="p-4 rounded-xl bg-[#FAF8F2] border border-[#E9E2D5] space-y-2">
          <h3 className="font-sans font-bold text-xs uppercase tracking-wider text-[#18251F]">
            Phone Call Coordination
          </h3>

          <label className="flex items-start gap-3 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={sharePhone}
              onChange={(e) => setSharePhone(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-[#103D2A] focus:ring-[#103D2A] border-[#E9E2D5]"
            />
            <div className="text-xs">
              <span className="font-semibold text-[#18251F] block">
                Allow confirmed exchange partners to call directly
              </span>
              <span className="text-[#68736B] block mt-0.5">
                Displays a direct "Call" button for voice coordination during material handover.
              </span>
            </div>
          </label>
        </div>

        {/* Strict Privacy Guarantee Box */}
        <div className="p-3.5 rounded-xl bg-[#E8EEDC]/60 border border-[#C5D6B8] text-xs text-[#103D2A] flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-700 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Zero Public Exposure Guarantee:</strong> Your phone and WhatsApp numbers are never displayed on public listings, search results, or profile pages. When an exchange is accepted, your saved WhatsApp number is shared securely with your confirmed exchange partner to coordinate collection.
          </p>
        </div>
      </form>
    </Modal>
  );
};
