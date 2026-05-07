import { useEffect, useMemo, useState } from 'react';
import { Mail, MessageCircle, Send, Eye, MousePointerClick, Calendar, User, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiGet } from '@/lib/api';

type BackendCampaign = {
  campaign_id: number;
  name: string;
  description?: string | null;
  channel?: 'email' | 'whatsapp' | string | null;
  subject?: string | null;
  content?: string | null;
  status?: 'draft' | 'active' | 'completed' | 'cancelled' | string | null;
  sender_label?: string | null;
  sender_address?: string | null;
  scheduled_at?: string | null;
  sent_at?: string | null;
  created_at?: string | null;
  sent_count?: number | null;
  open_count?: number | null;
  click_count?: number | null;
  prompt?: string | null;
};

type BackendCampaignContact = {
  contact_id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
};

type Props = {
  campaignId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const statusBadgeClass: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-info/10 text-info',
  completed: 'bg-secondary text-secondary-foreground',
  cancelled: 'bg-destructive/10 text-destructive',
};

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString();
}

function pct(part: number, whole: number): string {
  if (!whole) return '0%';
  return `${Math.round((part / whole) * 100)}%`;
}

export function CampaignDetailDialog({ campaignId, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<BackendCampaign | null>(null);
  const [recipients, setRecipients] = useState<BackendCampaignContact[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open || !campaignId) {
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiGet<{ campaign: BackendCampaign; contacts: BackendCampaignContact[] }>(
          `/campaigns/${campaignId}`,
        );
        if (cancelled) return;
        setCampaign(data.campaign);
        setRecipients(data.contacts || []);
        setSearch('');
      } catch (e: any) {
        if (cancelled) return;
        toast({
          title: 'Failed to load campaign',
          description: e?.message ?? 'Unknown error',
          variant: 'destructive',
        });
        setCampaign(null);
        setRecipients([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, campaignId, toast]);

  const channel = (campaign?.channel || 'email').toLowerCase();
  const isEmail = channel === 'email';

  const sent = Number(campaign?.sent_count || 0);
  const opened = Number(campaign?.open_count || 0);
  const clicked = Number(campaign?.click_count || 0);

  const filteredRecipients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter((c) => {
      const name = `${c.first_name} ${c.last_name}`.toLowerCase();
      const email = (c.email || '').toLowerCase();
      const phone = (c.phone || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [recipients, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] w-[96vw] max-w-[1200px] flex-col gap-0 overflow-hidden p-0">
        <div className="dialog-shell">
          <DialogHeader className="dialog-header-tight">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2 truncate">
                  {isEmail ? (
                    <Mail className="h-5 w-5 text-primary" />
                  ) : (
                    <MessageCircle className="h-5 w-5 text-success" />
                  )}
                  <span className="truncate">{campaign?.name || 'Campaign'}</span>
                </DialogTitle>
                <DialogDescription>
                  {isEmail ? 'Email campaign' : 'WhatsApp campaign'} details and recipients.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {campaign?.status && (
                  <Badge
                    variant="outline"
                    className={statusBadgeClass[String(campaign.status)] || statusBadgeClass.draft}
                  >
                    {campaign.status}
                  </Badge>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="dialog-body-scroll grid min-h-0 h-full gap-0 grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)]">
            <aside className="flex min-h-0 max-h-[min(420px,42svh)] flex-col overflow-hidden border-b bg-muted/20 lg:max-h-none lg:h-full lg:border-b-0 lg:border-r">
              {loading ? (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="text-sm text-muted-foreground">Loading…</div>
                </div>
              ) : !campaign ? (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="text-sm text-muted-foreground">Campaign not found.</div>
                </div>
              ) : (
                <ScrollArea className="min-h-0 flex-1 basis-0">
                  <div className="space-y-5 p-6">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl border bg-card p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Send className="h-3.5 w-3.5" />
                          Sent
                        </div>
                        <div className="mt-1 text-xl font-semibold">{sent}</div>
                      </div>
                      <div className="rounded-xl border bg-card p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Eye className="h-3.5 w-3.5" />
                          Opened
                        </div>
                        <div className="mt-1 text-xl font-semibold">{opened}</div>
                        <div className="text-xs text-muted-foreground">{pct(opened, sent)}</div>
                      </div>
                      <div className="rounded-xl border bg-card p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MousePointerClick className="h-3.5 w-3.5" />
                          Clicked
                        </div>
                        <div className="mt-1 text-xl font-semibold">{clicked}</div>
                        <div className="text-xs text-muted-foreground">{pct(clicked, sent)}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Channel</Label>
                      <div className="flex items-center gap-2 text-sm">
                        {isEmail ? (
                          <Mail className="h-4 w-4 text-primary" />
                        ) : (
                          <MessageCircle className="h-4 w-4 text-success" />
                        )}
                        <span className="capitalize">{channel}</span>
                      </div>
                    </div>

                    {(campaign.sender_label || campaign.sender_address) && (
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Sender</Label>
                        <div className="flex items-start gap-2 text-sm">
                          <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                          <div className="min-w-0">
                            {campaign.sender_label && (
                              <div className="truncate font-medium">{campaign.sender_label}</div>
                            )}
                            {campaign.sender_address && (
                              <div className="truncate text-muted-foreground">{campaign.sender_address}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Sent at</Label>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDateTime(campaign.sent_at || campaign.created_at)}</span>
                      </div>
                    </div>

                    {campaign.scheduled_at && (
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Scheduled for</Label>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDateTime(campaign.scheduled_at)}</span>
                        </div>
                      </div>
                    )}

                    {campaign.description && (
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Description</Label>
                        <p className="text-sm text-muted-foreground">{campaign.description}</p>
                      </div>
                    )}

                    {campaign.prompt && (
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wide text-muted-foreground">AI prompt</Label>
                        <p className="text-sm italic text-muted-foreground">"{campaign.prompt}"</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </aside>

            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-5 p-6">
                  {isEmail && (
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input value={campaign?.subject || ''} readOnly />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      value={campaign?.content || ''}
                      readOnly
                      className="min-h-[220px] font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="m-0">
                        Recipients
                        <Badge variant="secondary" className="ml-2">
                          {recipients.length}
                        </Badge>
                      </Label>
                      <div className="relative w-64 max-w-full">
                        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search recipients…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div className="rounded-xl border bg-card">
                      {recipients.length === 0 ? (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                          No recipients on this campaign.
                        </div>
                      ) : filteredRecipients.length === 0 ? (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                          No recipients match your search.
                        </div>
                      ) : (
                        <div className="divide-y">
                          {filteredRecipients.map((c) => (
                            <div
                              key={c.contact_id}
                              className="flex items-center justify-between gap-3 p-3"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {c.first_name} {c.last_name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {(isEmail ? c.email : c.phone) || c.email || c.phone || '—'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <div className="dialog-footer-bar flex items-center justify-end">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
