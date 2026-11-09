import React, { useState, useEffect, useRef } from 'react';
import { X, Phone, MessageSquare, ShieldCheck, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { useOutsideClick } from '../../hooks/useOutsideClick';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateProfile } = useAuth();

  const modalRef = useOutsideClick<HTMLDivElement>(
    () => {
      if (isOpen) onClose();
    },
    { enabled: isOpen }
  );

  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [whatsappNumber, setWhatsappNumber] = useState(currentUser?.whatsapp_number || '');
  const [sharePhone, setSharePhone] = useState(currentUser?.share_phone_with_exchange ?? false);
  const [shareWhatsapp, setShareWhatsapp] = useState(currentUser?.share_whatsapp_with_exchange ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (currentUser) {
      setPhone(currentUser.phone || '');
      setWhatsappNumber(currentUser.whatsapp_number || currentUser.phone || '');
      setSharePhone(currentUser.share_phone_with_exchange ?? false);
      setShareWhatsapp(currentUser.share_whatsapp_with_exchange ?? false);
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
        share_whatsapp_with_exchange: shareWhatsapp,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/60 bg-surface-container-low">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-container text-on-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-title-md text-on-surface">
                Contact & Privacy Settings
              </h2>
              <p className="font-body-sm text-xs text-on-surface-variant">
                Control how you communicate with verified exchange partners
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-5 overflow-y-auto">
          {statusMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-secondary-container text-primary border border-primary/20'
                  : 'bg-error-container text-on-error-container border border-error/20'
              }`}
            >
              {statusMsg.type === 'success' && <Check className="w-4 h-4 shrink-0" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Phone Field */}
          <div className="space-y-1.5">
            <label className="block font-label-md text-label-md text-on-surface font-semibold">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-10 pr-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-body-md text-on-surface focus:outline-none focus:border-primary font-mono text-sm"
              />
            </div>
            <p className="text-[11px] text-outline">
              Used for handover coordination calls when enabled below.
            </p>
          </div>

          {/* WhatsApp Field */}
          <div className="space-y-1.5">
            <label className="block font-label-md text-label-md text-on-surface font-semibold">
              WhatsApp Number
            </label>
            <div className="relative">
              <MessageSquare className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-10 pr-3.5 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-body-md text-on-surface focus:outline-none focus:border-primary font-mono text-sm"
              />
            </div>
            <p className="text-[11px] text-outline">
              Leave blank to use your standard phone number for WhatsApp.
            </p>
          </div>

          {/* Privacy Toggles */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/60 space-y-3.5">
            <h3 className="font-heading font-semibold text-xs uppercase tracking-wider text-outline">
              Exchange Partner Consent
            </h3>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sharePhone}
                onChange={(e) => setSharePhone(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant"
              />
              <div className="text-xs">
                <span className="font-semibold text-on-surface block">
                  Share phone number with exchange participants
                </span>
                <span className="text-on-surface-variant block mt-0.5">
                  Allows confirmed exchange partners to tap a direct "Call" button during collection.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shareWhatsapp}
                onChange={(e) => setShareWhatsapp(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant"
              />
              <div className="text-xs">
                <span className="font-semibold text-on-surface block">
                  Allow my WhatsApp number to be shared with accepted exchange partners.
                </span>
                <span className="text-on-surface-variant block mt-0.5">
                  Enables a 1-click WhatsApp messaging button for collection coordination after request acceptance. Revoking this immediately prevents future contact retrieval.
                </span>
              </div>
            </label>
          </div>

          {/* Strict Privacy Guarantee Box */}
          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-primary/20 text-xs text-primary/90 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 shrink-0 text-primary mt-0.5" />
            <p className="leading-relaxed">
              <strong>Zero Public PII Guarantee:</strong> Your contact details are never listed publicly in marketplace cards, search results, or public profiles. They are accessible solely to authenticated participants of an exchange request you participate in, and only if you enable sharing.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-outline-variant/60">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
