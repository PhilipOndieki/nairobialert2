// File: src/components/DonationModal.jsx
// Purpose: Donation modal for NairobiAlert — Paystack-powered, KES-first,
//          matches teal/mono design system exactly.
//
// Usage:
//   import DonationModal from './DonationModal';
//   <DonationModal isOpen={showDonation} onClose={() => setShowDonation(false)} />

import { useState, useEffect, useCallback } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  openPaystackPopup,
  generateReference,
  verifyPayment,
  SUPPORTED_CURRENCIES,
} from '../utils/paystack';

/* ── Icons ───────────────────────────────────────────────────────────────── */
function IconHeart({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function IconX({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconShield({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconCheck({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ── Toast (lightweight — no dep) ───────────────────────────────────────── */
function useToast() {
  const [toast, setToast] = useState(null);
  const show = useCallback((msg, type = 'success') => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 4000);
  }, []);
  return { toast, show };
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-radius shadow-lg font-body text-sm font-medium transition-all ${
        toast.type === 'error' ? 'bg-red text-white' : 'bg-teal text-white'
      }`}
    >
      {toast.msg}
    </div>
  );
}

/* ── Impact items ────────────────────────────────────────────────────────── */
const IMPACT_ITEMS = [
  'Keep real-time alerts running 24/7 during flood season',
  'Fund SMS and USSD access for residents without smartphones',
  'Maintain shelter coordination infrastructure',
  'Expand zone coverage to more Nairobi settlements',
];

/* ── Preset amounts (KES) ────────────────────────────────────────────────── */
const PRESET_AMOUNTS = [200, 500, 1000, 2500, 5000, 10000];

/* ── Main component ──────────────────────────────────────────────────────── */
export default function DonationModal({ isOpen, onClose }) {
  const [amount,       setAmount]       = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [currency,     setCurrency]     = useState('KES');
  const [frequency,    setFrequency]    = useState('once');
  const [isAnonymous,  setIsAnonymous]  = useState(false);
  const [donorName,    setDonorName]    = useState('');
  const [message,      setMessage]      = useState('');
  const [email,        setEmail]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const { toast, show: showToast }      = useToast();

  // Lock body scroll when modal open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const currencyMeta = SUPPORTED_CURRENCIES.find((c) => c.code === currency) ?? SUPPORTED_CURRENCIES[0];
  const resolvedAmount = amount === 'custom' ? parseFloat(customAmount) : parseFloat(amount);
  const canSubmit = !loading && resolvedAmount > 0 && email.includes('@');

  async function handleDonate() {
    if (!canSubmit) {
      if (!email.includes('@')) { showToast('Please enter a valid email address.', 'error'); return; }
      if (!(resolvedAmount > 0))  { showToast('Please select or enter a donation amount.', 'error'); return; }
      return;
    }

    setLoading(true);
    const reference   = generateReference();
    const displayName = isAnonymous ? 'Anonymous' : (donorName.trim() || 'Supporter');

    try {
      await openPaystackPopup({
        email,
        amount:    resolvedAmount,
        currency,
        reference,
        metadata: {
          donorName:    displayName,
          message,
          frequency,
          isAnonymous:  String(isAnonymous),
          platform:     'NairobiAlert',
        },
        onSuccess: async (response) => {
          try {
            const verification = await verifyPayment(response.reference);

            if (verification.data.status === 'success') {
              await addDoc(collection(db, 'donations'), {
                donorEmail:   email,
                donorName:    displayName,
                isAnonymous,
                amount:       resolvedAmount,
                currency,
                frequency,
                message,
                reference:    response.reference,
                status:       'completed',
                paystackData: {
                  reference: response.reference,
                  status:    verification.data.status,
                  amount:    verification.data.amount,
                  channel:   verification.data.channel,
                },
                createdAt: serverTimestamp(),
              });

              showToast(`Thank you! Your ${frequency === 'monthly' ? 'monthly ' : ''}donation of ${currencyMeta.symbol}${resolvedAmount.toLocaleString()} was received.`);
              onClose();
              resetForm();
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (err) {
            console.error('[NairobiAlert] Donation verification error:', err);
            showToast('Payment received but verification failed. Please contact support.', 'error');
          } finally {
            setLoading(false);
          }
        },
        onClose: () => {
          showToast('Payment cancelled.', 'error');
          setLoading(false);
        },
      });
    } catch (err) {
      console.error('[NairobiAlert] Donation error:', err);
      showToast('Payment failed. Please try again.', 'error');
      setLoading(false);
    }
  }

  function resetForm() {
    setAmount('');
    setCustomAmount('');
    setDonorName('');
    setMessage('');
    setEmail('');
    setIsAnonymous(false);
    setFrequency('once');
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-text/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Donate to NairobiAlert"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="relative bg-white border border-border rounded-radius-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto pointer-events-auto scrollbar-thin"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-light flex items-center justify-center">
                <IconHeart size={18} className="text-red" />
              </div>
              <div>
                <h2 className="font-display text-lg text-text leading-none">Support NairobiAlert</h2>
                <p className="font-mono text-xs text-text-dim mt-0.5">Keep flood alerts running</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-radius text-text-mid hover:text-text hover:bg-bg transition-colors duration-150"
              aria-label="Close donation modal"
            >
              <IconX size={18} />
            </button>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* ── Currency ──────────────────────────────────────────────── */}
            <div>
              <p className="font-body font-medium text-xs text-text-mid uppercase tracking-widest mb-2">Currency</p>
              <div className="flex gap-2 flex-wrap">
                {SUPPORTED_CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => { setCurrency(c.code); setAmount(''); setCustomAmount(''); }}
                    className={`font-mono text-xs px-3 py-1.5 rounded-full border transition-colors duration-150 ${
                      currency === c.code
                        ? 'bg-teal text-white border-teal'
                        : 'bg-white text-text-mid border-border hover:border-teal hover:text-teal'
                    }`}
                  >
                    {c.symbol} {c.code}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Frequency ─────────────────────────────────────────────── */}
            <div className="flex gap-2">
              {['once', 'monthly'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className={`flex-1 font-body font-semibold text-sm py-2.5 rounded-radius border transition-colors duration-150 capitalize ${
                    frequency === f
                      ? 'bg-teal text-white border-teal'
                      : 'bg-white text-text-mid border-border hover:border-teal hover:text-teal'
                  }`}
                >
                  {f === 'once' ? 'One-time' : 'Monthly'}
                </button>
              ))}
            </div>

            {/* ── Amount grid ───────────────────────────────────────────── */}
            <div>
              <p className="font-body font-medium text-xs text-text-mid uppercase tracking-widest mb-2">
                Amount ({currencyMeta.symbol})
              </p>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {PRESET_AMOUNTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p.toString())}
                    className={`font-mono text-sm py-2.5 rounded-radius border transition-colors duration-150 ${
                      amount === p.toString()
                        ? 'bg-teal text-white border-teal'
                        : 'bg-white text-text border-border hover:border-teal hover:text-teal'
                    }`}
                  >
                    {currencyMeta.symbol}{p.toLocaleString()}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setAmount('custom')}
                className={`w-full font-body font-medium text-sm py-2.5 rounded-radius border transition-colors duration-150 ${
                  amount === 'custom'
                    ? 'bg-teal text-white border-teal'
                    : 'bg-white text-text-mid border-border hover:border-teal hover:text-teal'
                }`}
              >
                Custom amount
              </button>

              {amount === 'custom' && (
                <div className="mt-2 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-text-dim">
                    {currencyMeta.symbol}
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="w-full pl-10 pr-3 py-2.5 font-mono text-sm bg-bg border border-border rounded-radius focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* ── Donor info ────────────────────────────────────────────── */}
            <div className="space-y-3">
              {/* Email — always required (Paystack needs it) */}
              <div>
                <label className="block font-body font-medium text-sm text-text mb-1.5">
                  Email <span className="text-red" aria-hidden="true">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full font-body text-sm bg-bg border border-border rounded-radius px-3 py-2.5 text-text placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150"
                />
              </div>

              {/* Anonymous toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-teal focus:ring-teal"
                />
                <span className="font-body text-sm text-text">Donate anonymously</span>
              </label>

              {/* Name */}
              {!isAnonymous && (
                <div>
                  <label className="block font-body font-medium text-sm text-text mb-1.5">
                    Name <span className="font-normal text-text-dim">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    className="w-full font-body text-sm bg-bg border border-border rounded-radius px-3 py-2.5 text-text placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150"
                  />
                </div>
              )}

              {/* Message */}
              <div>
                <label className="block font-body font-medium text-sm text-text mb-1.5">
                  Message <span className="font-normal text-text-dim">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Leave a message of support…"
                  className="w-full font-body text-sm bg-bg border border-border rounded-radius px-3 py-2.5 text-text placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150 resize-none"
                />
              </div>
            </div>

            {/* ── Impact box ────────────────────────────────────────────── */}
            <div className="bg-teal-light border border-teal/20 rounded-radius p-4">
              <p className="font-body font-semibold text-sm text-teal mb-2.5">Your donation helps us</p>
              <ul className="space-y-1.5">
                {IMPACT_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded-full bg-teal/20 flex items-center justify-center">
                      <IconCheck size={10} />
                    </span>
                    <span className="font-body text-xs text-text-mid leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ── Payment method note ───────────────────────────────────── */}
            <div className="flex items-center gap-2.5 bg-bg border border-border rounded-radius px-3 py-2.5">
              <IconShield size={16} className="text-teal flex-shrink-0" />
              <div>
                <p className="font-body font-semibold text-xs text-text">Secure payment via Paystack</p>
                <p className="font-mono text-xs text-text-dim">Card, M-Pesa, bank transfer accepted</p>
              </div>
            </div>

            {/* ── Submit ────────────────────────────────────────────────── */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDonate}
                disabled={!canSubmit}
                className="flex-1 flex items-center justify-center gap-2 font-body font-semibold text-sm bg-teal text-white py-3 rounded-radius hover:bg-teal-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing…
                  </>
                ) : (
                  <>
                    <IconHeart size={16} />
                    {frequency === 'monthly' ? 'Donate Monthly' : 'Donate Now'}
                    {resolvedAmount > 0 && (
                      <span className="font-mono text-xs opacity-80">
                        {currencyMeta.symbol}{resolvedAmount.toLocaleString()}
                      </span>
                    )}
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="font-body font-medium text-sm px-4 py-3 border border-border rounded-radius text-text-mid hover:bg-bg hover:text-text transition-colors duration-150"
              >
                Cancel
              </button>
            </div>

            <p className="font-mono text-xs text-text-dim text-center pb-1">
              All donations go directly to platform operations. NairobiAlert is a public good.
            </p>
          </div>
        </div>
      </div>

      <Toast toast={toast} />
    </>
  );
}