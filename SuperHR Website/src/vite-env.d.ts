/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Set to `'true'` when Brevo is configured on the backend (BREVO_API_KEY, BREVO_SENDER_EMAIL). */
  readonly VITE_BREVO_SEND?: string;
}
