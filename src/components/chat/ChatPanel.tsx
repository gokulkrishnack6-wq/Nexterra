import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Phone, 
  MessageSquare, 
  ShieldCheck, 
  RefreshCw, 
  AlertCircle, 
  Lock, 
  CheckCheck,
  User,
  Settings
} from 'lucide-react';
import { Conversation, ChatMessage, ParticipantContact, WasteListing, ExchangeRequest } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ProfileSettingsModal } from '../profile/ProfileSettingsModal';

interface ChatPanelProps {
  conversationId: string;
  onClose: () => void;
  isOpen: boolean;
}

export function isValidPhoneNumber(rawNumber?: string | null): boolean {
  if (!rawNumber) return false;
  const digits = rawNumber.replace(/[^\d]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function formatWhatsAppUrl(rawNumber: string, listingTitle?: string): string | null {
  if (!isValidPhoneNumber(rawNumber)) return null;
  let cleaned = rawNumber.replace(/[^\d]/g, '');
  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }
  const text = listingTitle
    ? `Hello! Reaching out via GreenLoop regarding our waste exchange for "${listingTitle}".`
    : `Hello! Reaching out via GreenLoop regarding our waste exchange.`;
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`;
}

export function formatPhoneUrl(rawNumber: string): string | null {
  if (!isValidPhoneNumber(rawNumber)) return null;
  const sanitized = rawNumber.trim().replace(/[^\d+]/g, '');
  return `tel:${sanitized}`;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ conversationId, onClose, isOpen }) => {
  const { currentUser } = useAuth();
  const { 
    conversations, 
    fetchMessages, 
    sendMessage, 
    retryMessage, 
    getParticipantContact, 
    listings,
    exchangeRequests 
  } = useData();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [contactInfo, setContactInfo] = useState<ParticipantContact | null>(null);
  const [loadingContact, setLoadingContact] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  // Find active conversation object
  const activeConversation: Conversation | undefined = conversations.find((c) => c.id === conversationId);

  // Derive other participant ID
  const isRequester = currentUser?.id === activeConversation?.requester_id;
  const otherParticipantId = activeConversation 
    ? (isRequester ? activeConversation.provider_id : activeConversation.requester_id)
    : '';

  // Associated listing and exchange request
  const associatedListing: WasteListing | undefined = 
    activeConversation?.listing || listings.find((l) => l.id === activeConversation?.listing_id);

  const associatedExchange: ExchangeRequest | undefined = 
    activeConversation?.exchange_request || exchangeRequests.find((r) => r.id === activeConversation?.exchange_request_id);

  const isReadOnly = 
    activeConversation?.status === 'read_only' || 
    (associatedExchange && ['rejected', 'cancelled', 'completed'].includes(associatedExchange.status));

  // Determine other participant profile info
  const otherParticipant = isRequester ? activeConversation?.provider : activeConversation?.requester;
  const otherName = otherParticipant?.full_name || (isRequester ? 'Waste Generator' : 'Waste Requester');

  // Track scroll position to prevent disrupting user when reading history
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;
  };

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesEndRef.current && isNearBottomRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  // Lock body scroll and handle Escape key while ChatPanel is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Load initial messages
  useEffect(() => {
    if (!conversationId || !isOpen) return;

    let isMounted = true;
    setLoadingMessages(true);

    fetchMessages(conversationId)
      .then((msgs) => {
        if (isMounted) {
          setMessages(msgs);
          setLoadingMessages(false);
          setTimeout(() => scrollToBottom('auto'), 50);
        }
      })
      .catch((err) => {
        console.error('Failed to load chat messages:', err);
        if (isMounted) setLoadingMessages(false);
      });

    return () => {
      isMounted = false;
    };
  }, [conversationId, isOpen, fetchMessages]);

  // Load participant contact information with consent check
  useEffect(() => {
    if (!conversationId || !otherParticipantId || !isOpen) return;

    let isMounted = true;
    setLoadingContact(true);

    getParticipantContact(conversationId, otherParticipantId)
      .then((info) => {
        if (isMounted) {
          setContactInfo(info);
          setLoadingContact(false);
        }
      })
      .catch((err) => {
        console.warn('Could not load participant contact info:', err);
        if (isMounted) setLoadingContact(false);
      });

    return () => {
      isMounted = false;
    };
  }, [conversationId, otherParticipantId, isOpen, getParticipantContact]);

  // Handle message sending
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending || isReadOnly || !conversationId) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const sentMsg = await sendMessage(conversationId, textToSend);
      setMessages((prev) => {
        // Replace or append
        const exists = prev.some((m) => m.id === sentMsg.id);
        if (exists) return prev;
        return [...prev, sentMsg];
      });
      isNearBottomRef.current = true;
      setTimeout(() => scrollToBottom('smooth'), 50);
    } catch (err: any) {
      console.error('Message submission failed:', err);
      // Local optimistic fallback with failed state
      const failedMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        sender_id: currentUser?.id || '',
        message_text: textToSend,
        message_type: 'text',
        created_at: new Date().toISOString(),
        status: 'failed',
      };
      setMessages((prev) => [...prev, failedMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRetry = async (tempId: string) => {
    const target = messages.find((m) => m.id === tempId);
    if (!target) return;

    try {
      await retryMessage(conversationId, tempId);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'sent' } : m))
      );
    } catch (err) {
      console.error('Retry failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fadeIn">
        <div className="w-full max-w-lg h-[100dvh] max-h-[100dvh] bg-surface-container-lowest shadow-2xl flex flex-col border-l border-outline-variant animate-slideLeft overscroll-contain">
          
          {/* Header */}
          <div className="p-4 border-b border-outline-variant/60 bg-surface-container-low flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {otherParticipant?.avatar_url ? (
                    <img
                      src={otherParticipant.avatar_url}
                      alt={otherName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/20"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-sm">
                      {otherName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-surface" />
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-heading font-bold text-title-md text-on-surface leading-tight">
                      {otherName}
                    </h2>
                    <Badge variant={isRequester ? 'neutral' : 'brand'}>
                      {isRequester ? 'Waste Provider' : 'Requester'}
                    </Badge>
                  </div>
                  <p className="font-body-sm text-[11px] text-on-surface-variant">
                    Private Exchange Coordination
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  title="My Contact & Sharing Settings"
                  className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Waste Listing Context Pill */}
            {associatedListing && (
              <div className="p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/60 flex items-center justify-between gap-2 text-xs">
                <div className="truncate flex-1">
                  <span className="font-semibold text-on-surface block truncate">
                    {associatedListing.title}
                  </span>
                  <span className="text-on-surface-variant text-[11px]">
                    Qty: {associatedExchange?.requested_quantity || associatedListing.quantity} {associatedListing.unit}
                  </span>
                </div>
                {associatedExchange?.status && (
                  <Badge
                    variant={
                      associatedExchange.status === 'accepted'
                        ? 'active'
                        : associatedExchange.status === 'completed'
                        ? 'success'
                        : associatedExchange.status === 'rejected'
                        ? 'error'
                        : 'pending'
                    }
                  >
                    {associatedExchange.status.toUpperCase()}
                  </Badge>
                )}
              </div>
            )}

            {/* Optional Contact Actions (WhatsApp & Phone) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-outline-variant/40">
              <div className="flex items-center gap-2">
                {/* WhatsApp button */}
                {contactInfo?.whatsapp && contactInfo.has_whatsapp_consent && formatWhatsAppUrl(contactInfo.whatsapp, associatedListing?.title) ? (
                  <a
                    href={formatWhatsAppUrl(contactInfo.whatsapp, associatedListing?.title)!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-label-sm text-xs font-semibold shadow-xs transition-colors"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp
                  </a>
                ) : null}

                {/* Direct Phone Call button */}
                {contactInfo?.phone && contactInfo.has_phone_consent && formatPhoneUrl(contactInfo.phone) ? (
                  <a
                    href={formatPhoneUrl(contactInfo.phone)!}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-highest hover:bg-surface-container text-primary font-label-sm text-xs font-semibold border border-outline-variant transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call
                  </a>
                ) : null}

                {/* When contact details are not shared */}
                {(!contactInfo?.phone || !contactInfo.has_phone_consent) &&
                 (!contactInfo?.whatsapp || !contactInfo.has_whatsapp_consent) && !loadingContact && (
                  <div className="flex items-center gap-1.5 text-[11px] text-outline font-label-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    <span>Contact details not shared • Chat active</span>
                  </div>
                )}
              </div>

              <span className="text-[10px] text-outline">
                {isReadOnly ? 'Preserved History' : 'Live Connected'}
              </span>
            </div>
          </div>

          {/* Read-Only Status Banner */}
          {isReadOnly && (
            <div className="p-3 bg-surface-container-high border-b border-outline-variant/60 flex items-center gap-2 text-xs text-on-surface-variant font-medium">
              <Lock className="w-4 h-4 text-outline shrink-0" />
              <span>
                This material exchange is {associatedExchange?.status || 'concluded'}. Conversation history is preserved for circular auditing.
              </span>
            </div>
          )}

          {/* Messages Thread */}
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-container-lowest/50"
          >
            {loadingMessages ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-outline">
                <RefreshCw className="w-5 h-5 animate-spin text-primary" />
                <span className="text-xs">Loading conversation history...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center text-outline p-6">
                <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="font-heading font-semibold text-sm text-on-surface">
                  No messages yet
                </h3>
                <p className="text-xs max-w-xs text-on-surface-variant">
                  Say hello to {otherName} and coordinate convenient collection details, vehicle access, or timing.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === currentUser?.id;
                const formattedTime = new Date(msg.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-body-sm shadow-xs ${
                        isMine
                          ? 'bg-primary text-on-primary rounded-br-xs'
                          : 'bg-surface-container-high text-on-surface rounded-bl-xs border border-outline-variant/30'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {msg.message_text}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 px-1">
                      <span className="text-[10px] text-outline font-mono">
                        {formattedTime}
                      </span>
                      {isMine && (
                        msg.status === 'failed' ? (
                          <button
                            onClick={() => handleRetry(msg.id)}
                            className="inline-flex items-center gap-1 text-[10px] text-error hover:underline"
                          >
                            <AlertCircle className="w-3 h-3" /> Retry
                          </button>
                        ) : msg.status === 'sending' ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-outline" />
                        ) : (
                          <CheckCheck className="w-3 h-3 text-primary/70" />
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input Footer */}
          {!isReadOnly ? (
            <form onSubmit={handleSend} className="p-3 border-t border-outline-variant/60 bg-surface-container-low flex items-end gap-2">
              <div className="flex-1 relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value.slice(0, 4000))}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${otherName}... (Enter to send)`}
                  rows={2}
                  disabled={isSending}
                  className="w-full resize-none p-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl text-body-sm text-on-surface focus:outline-none focus:border-primary text-sm leading-normal"
                />
                <span className="absolute bottom-2 right-2 text-[10px] text-outline font-mono pointer-events-none">
                  {inputText.length}/4000
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!inputText.trim() || isSending}
                className="h-10 px-4 rounded-xl flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </Button>
            </form>
          ) : (
            <div className="p-3 border-t border-outline-variant/60 bg-surface-container-low text-center text-xs text-outline font-label-sm">
              Archived conversation — Messaging closed
            </div>
          )}
        </div>
      </div>

      {/* Profile Settings Modal */}
      <ProfileSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};
