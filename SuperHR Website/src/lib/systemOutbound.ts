/**
 * Outbound messaging uses Super HR–managed identities only (UI is locked).
 * Update addresses here when production sending is wired.
 */
export type SystemOutbound = { senderId: string; label: string; address: string };

export const EMAIL_OUTBOUND: SystemOutbound = {
  senderId: 'superhr-system',
  label: 'Super HR',
  address: 'akshitvbansal2006@gmail.com',
};

export const WHATSAPP_OUTBOUND: SystemOutbound = {
  senderId: 'superhr-system',
  label: 'Super HR',
  address: 'Super HR WhatsApp Business number',
};

export function getSystemOutbound(channel: 'email' | 'whatsapp'): SystemOutbound {
  return channel === 'email' ? EMAIL_OUTBOUND : WHATSAPP_OUTBOUND;
}
