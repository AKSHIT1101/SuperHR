import { Lock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { getSystemOutbound } from '@/lib/systemOutbound';

interface LockedOutboundSenderFieldProps {
  channel: 'email' | 'whatsapp';
}

export function LockedOutboundSenderField({ channel }: LockedOutboundSenderFieldProps) {
  const o = getSystemOutbound(channel);
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm font-medium mb-2">
        <span>Send From</span>
        <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="sr-only">Locked to Super HR</span>
      </Label>
      <div
        className="flex items-center gap-3 rounded-md border border-dashed bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground"
        title="Sender is managed by Super HR and cannot be changed."
      >
        <Lock className="h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{o.label}</p>
          <p className="truncate text-xs">{o.address}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        All {channel === 'email' ? 'email' : 'WhatsApp'} is sent through Super HR&apos;s verified{' '}
        {channel === 'email' ? 'address' : 'number'}.
      </p>
    </div>
  );
}
