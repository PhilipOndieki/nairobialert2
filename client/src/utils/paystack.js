// File: src/utils/paystack.js
// Purpose: Paystack payment utilities for NairobiAlert donation flow.
//
// Setup:
//   1. Add VITE_PAYSTACK_PUBLIC_KEY to your .env
//   2. The verify endpoint needs a backend — see comment in verifyPayment()

/**
 * Supported currencies for Kenyan-first context.
 * Paystack supports KES natively via M-Pesa and card.
 */
export const SUPPORTED_CURRENCIES = [
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'USD', symbol: '$',   name: 'US Dollar' },
  { code: 'GBP', symbol: '£',   name: 'British Pound' },
  { code: 'EUR', symbol: '€',   name: 'Euro' },
];

/**
 * Generate a unique payment reference.
 * Format: NAL-{timestamp}-{random4}
 */
export function generateReference() {
  const ts     = Date.now().toString(36).toUpperCase();
  const rand   = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `NAL-${ts}-${rand}`;
}

/**
 * Load Paystack inline script dynamically.
 * Avoids adding a <script> tag to index.html permanently.
 */
function loadPaystackScript() {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) { resolve(); return; }
    const script    = document.createElement('script');
    script.src      = 'https://js.paystack.co/v2/inline.js';
    script.onload   = resolve;
    script.onerror  = () => reject(new Error('Failed to load Paystack script'));
    document.head.appendChild(script);
  });
}

/**
 * Open the Paystack payment popup.
 *
 * @param {object} options
 * @param {string}   options.email       - Payer email (required by Paystack)
 * @param {number}   options.amount      - Amount in major units (e.g. 500 KES)
 * @param {string}   options.currency    - ISO currency code (default: KES)
 * @param {string}   options.reference   - Unique payment reference
 * @param {object}   options.metadata    - Extra data stored on Paystack dashboard
 * @param {function} options.onSuccess   - Called with response on successful payment
 * @param {function} options.onClose     - Called when user closes the popup
 */
export async function openPaystackPopup({
  email,
  amount,
  currency = 'KES',
  reference,
  metadata = {},
  onSuccess,
  onClose,
}) {
  await loadPaystackScript();

  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  if (!publicKey) throw new Error('VITE_PAYSTACK_PUBLIC_KEY not set in .env');

  // Paystack expects amount in kobo/cents (smallest unit)
  // KES uses kobo equivalent — multiply by 100
  const amountInMinorUnits = Math.round(amount * 100);

  const handler = window.PaystackPop.setup({
    key:       publicKey,
    email,
    amount:    amountInMinorUnits,
    currency,
    ref:       reference,
    metadata: {
      custom_fields: Object.entries(metadata).map(([key, value]) => ({
        display_name:  key,
        variable_name: key,
        value:         String(value),
      })),
    },
    callback: (response) => {
      onSuccess?.(response);
    },
    onClose: () => {
      onClose?.();
    },
  });

  handler.openIframe();
}

/**
 * Verify payment on your backend before writing to Firestore.
 *
 * IMPORTANT: Never call the Paystack verify endpoint from the client —
 * it exposes your secret key. This should be a Firebase Cloud Function
 * or a lightweight Node/Express endpoint.
 *
 * Firebase Cloud Function example (functions/index.js):
 *
 *   exports.verifyPaystackPayment = onRequest(async (req, res) => {
 *     const { reference } = req.query;
 *     const response = await fetch(
 *       `https://api.paystack.co/transaction/verify/${reference}`,
 *       { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
 *     );
 *     const data = await response.json();
 *     res.json(data);
 *   });
 *
 * Then set VITE_PAYSTACK_VERIFY_URL to your function URL.
 */
export async function verifyPayment(reference) {
  const verifyUrl = import.meta.env.VITE_PAYSTACK_VERIFY_URL;

  if (!verifyUrl) {
    // Dev fallback — skip verification in development
    console.warn('[NairobiAlert] VITE_PAYSTACK_VERIFY_URL not set. Skipping verification.');
    return { data: { status: 'success', amount: 0, channel: 'unknown' } };
  }

  const res = await fetch(`${verifyUrl}?reference=${reference}`);
  if (!res.ok) throw new Error(`Verification request failed: ${res.status}`);
  return res.json();
}