import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, Mail, MessageCircle, FileText, Users, Plus, Save, Trash2, X, Edit2, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { MessageTemplate, AudienceSegment } from '@/types/contact';
import { SelectRecipientsDialog } from '@/components/dialogs/SelectRecipientsDialog';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

const emailSenders = [
  { id: '1', name: 'CRM Team', address: 'crm@company.com' },
  { id: '2', name: 'Sales Team', address: 'sales@company.com' },
  { id: '3', name: 'Events Team', address: 'events@company.com' },
];

const whatsappSenders = [
  { id: '1', name: 'Main WhatsApp', address: '+1 555 123 4567' },
  { id: '2', name: 'Secondary WhatsApp', address: '+1 555 987 6543' },
];

const aiCampaignSuggestions = [
  'Send a campaign to sales leads in Bangalore about the Q2 kickoff',
  'Reach out to marketing contacts in Mumbai with an invitation to a webinar',
  'Message high-engagement technology employees about an upcoming event',
];

export default function Communications() {
  const { toast } = useToast();
  const location = useLocation();
  const [eventOutreach, setEventOutreach] = useState<null | {
    eventId: number;
    eventAction: 'invite' | 'cancel';
    eventName: string;
    contactIds: string[];
    prompt?: string;
  }>(null);
  const [mainTab, setMainTab] = useState<'send' | 'templates'>('send');
  const [messageType, setMessageType] = useState<'email' | 'whatsapp'>('email');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [showCreateTemplateDialog, setShowCreateTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', content: '' });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedSender, setSelectedSender] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiPreviewLoading, setAiPreviewLoading] = useState(false);
  const [showRecipientsDialog, setShowRecipientsDialog] = useState(false);
  const [recentCampaigns, setRecentCampaigns] = useState<Array<{ id: number; name: string; type: 'email' | 'whatsapp'; sent: number; opened: number; clicked: number; date: string }>>([]);
  const [segments, setSegments] = useState<Array<{ id: string; name: string; memberIds: string[]; memberCount: number }>>([]);
  const [contacts, setContacts] = useState<Array<{ id: string; firstName: string; lastName: string; email?: string; phone?: string; whatsapp?: string }>>([]);

  useEffect(() => {
    const state = location.state as any;
    if (!state) {
      setEventOutreach(null);
      return;
    }

    // Event outreach mode (invite/cancel): recipients are already known.
    if (state.mode === 'event_outreach') {
      setEventOutreach({
        eventId: Number(state.eventId),
        eventAction: state.eventAction === 'cancel' ? 'cancel' : 'invite',
        eventName: String(state.eventName ?? 'Event'),
        contactIds: (state.contactIds ?? []).map((x: any) => String(x)),
        prompt: state.prompt ? String(state.prompt) : undefined,
      });
      if (state.messageType) setMessageType(state.messageType);
      setSelectedSegments([]);
      setSelectedIndividuals((state.contactIds ?? []).map((x: any) => String(x)));
      setAiPrompt(state.prompt ? String(state.prompt) : '');
      setMainTab('send');
      setShowRecipientsDialog(false);
      return;
    }

    // Legacy prefill mode: a single recipient value.
    const { recipient, type } = state as { recipient?: string; type?: 'email' | 'whatsapp' };
    if (type) setMessageType(type);
    if (recipient) {
      const found = contacts.find((c) => c.email === recipient || c.phone === recipient || c.whatsapp === recipient);
      if (found) setSelectedIndividuals([found.id]);
    }
  }, [location.state, contacts]);

  const currentTemplates = templates;
  const currentSenders = messageType === 'email' ? emailSenders : whatsappSenders;

  const totalRecipients = useMemo(() => {
    const segmentCount = selectedSegments.reduce((sum, id) => sum + (segments.find((s) => s.id === id)?.memberCount || 0), 0);
    return segmentCount + new Set(selectedIndividuals).size;
  }, [selectedSegments, selectedIndividuals, segments]);

  const selectedSegmentNames = useMemo(() => selectedSegments.map((id) => segments.find((s) => s.id === id)?.name || '').filter(Boolean), [selectedSegments, segments]);
  const selectedIndividualNames = useMemo(() => selectedIndividuals.map((id) => { const c = contacts.find((a) => a.id === id); return c ? `${c.firstName} ${c.lastName}` : ''; }).filter(Boolean), [selectedIndividuals, contacts]);

  const handleUseTemplate = (template: MessageTemplate) => { setSelectedTemplate(template.id); setMessage(template.content); if (template.subject) setSubject(template.subject); setMainTab('send'); toast({ title: 'Template Applied' }); };
  const resolveContactIds = async (segmentIds: string[], individualIds: string[]) => {
    const out = new Set<number>(individualIds.map((id) => Number(id)).filter((n) => Number.isFinite(n)));
    for (const segId of segmentIds) {
      try {
        const seg = await apiGet<any>(`/segments/${segId}`);
        const segContacts = (seg?.contacts || []).map((c: any) => Number(c.contact_id)).filter((n: number) => Number.isFinite(n));
        segContacts.forEach((n: number) => out.add(n));
      } catch {
        // ignore
      }
    }
    return Array.from(out);
  };

  const extractKeywordFromPrompt = (prompt: string) => {
    const cleaned = prompt.trim().replace(/^["']|["']$/g, '').toLowerCase();
    let tail = '';
    if (cleaned.includes(' in ')) tail = cleaned.split(' in ').slice(-1)[0] || '';
    else if (cleaned.includes(' for ')) tail = cleaned.split(' for ').slice(-1)[0] || '';
    else tail = cleaned;

    const tokens = (tail.match(/[a-z0-9]+/gi) || []).slice(0, 3).map((t) => t.toLowerCase());
    return tokens.join(' ');
  };

  const prefillCampaignDraftFromPrompt = (prompt: string) => {
    const keyword = extractKeywordFromPrompt(prompt);
    const title = keyword
      ? keyword
          .split(' ')
          .filter(Boolean)
          .map((w) => w[0]?.toUpperCase() + w.slice(1))
          .join(' ')
      : 'Update';

    const subjectDraft = messageType === 'email' ? `${title} update` : `${title} update`;
    const messageDraft =
      `Hi {{name}},\n\n` +
      `We wanted to share a quick update related to ${keyword || title}.\n\n` +
      `If you have any questions, reply to this message.\n\n` +
      `Thanks,`;

    return { subjectDraft, messageDraft };
  };

  const prefillEventOutreachDraftFromPrompt = (
    prompt: string,
    action: 'invite' | 'cancel',
    eventName: string,
  ) => {
    const keyword = extractKeywordFromPrompt(prompt);
    const focus = keyword || eventName || 'this event';

    if (messageType === 'email') {
      const subjectDraft =
        action === 'cancel' ? `Update: ${eventName} cancelled` : `You're invited: ${eventName}`;

      const messageDraft =
        `Hi {{name}},\n\n` +
        (action === 'cancel'
          ? `We’re reaching out to let you know that ${eventName} has been cancelled.\n\nWe apologize for any inconvenience.\n\n`
          : `You’re invited to ${eventName}.\n\n`) +
        `What to expect: ${focus}.\n\n` +
        `If you have any questions, reply to this email.\n\n` +
        `Thanks,`;

      return { subjectDraft, messageDraft };
    }

    // WhatsApp / SMS style copy
    const messageDraft =
      action === 'cancel'
        ? `Hi {{name}}, quick update: ${eventName} is cancelled. Sorry for the inconvenience.\n\nMore details: ${focus}`
        : `Hi {{name}}, you're invited to ${eventName}!\n\nMore details: ${focus}`;

    return { subjectDraft: '', messageDraft };
  };

  const extractEventNameFromPrompt = (prompt: string) => {
    const p = prompt || '';
    const quoted = p.match(/event\s+["']([^"']+)["']/i)?.[1];
    if (quoted) return quoted;
    const unquoted = p.match(/event\s+([^.,;\n]+)/i)?.[1];
    if (unquoted) return unquoted.trim();
    return '';
  };

  const extractEventActionFromPrompt = (prompt: string) => {
    const p = (prompt || '').toLowerCase();
    if (p.includes('cancel')) return 'cancel';
    if (p.includes('invite')) return 'invite';
    return undefined;
  };

  const callComposeEndpoint = async (args: {
    prompt: string;
    channel: 'email' | 'whatsapp';
    eventName?: string;
    eventAction?: 'invite' | 'cancel';
    segmentNames?: string[];
  }) => {
    const res = await apiPost<any>('/campaigns/compose', {
      prompt: args.prompt,
      channel: args.channel,
      event_name: args.eventName || null,
      event_action: args.eventAction || null,
      segment_names: args.segmentNames || [],
    });

    if (!res?.valid) {
      throw new Error(res?.error ?? 'AI compose failed');
    }
    return res;
  };

  const handleGenerateContentOnly = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt) {
      toast({ title: 'Validation Error', description: 'Please enter a description', variant: 'destructive' });
      return;
    }

    const segmentNames = selectedSegments
      .map((id) => segments.find((s) => s.id === id)?.name)
      .filter(Boolean) as string[];
    const eventName = extractEventNameFromPrompt(prompt);
    const eventAction = extractEventActionFromPrompt(prompt);

    try {
      const res = await callComposeEndpoint({
        prompt,
        channel: messageType,
        eventName: eventName || undefined,
        eventAction: eventAction as any,
        segmentNames,
      });

      setSubject(messageType === 'email' ? res.subject || '' : '');
      setMessage(res.content || '');
      toast({ title: 'Content generated' });
    } catch (e: any) {
      toast({ title: 'AI generation failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    }
  };

  const handleGenerateEventContent = async () => {
    if (!eventOutreach) return;
    const prompt = (eventOutreach.prompt ?? aiPrompt).trim();
    if (!prompt) {
      toast({ title: 'Validation Error', description: 'Please enter a description', variant: 'destructive' });
      return;
    }

    try {
      const res = await callComposeEndpoint({
        prompt,
        channel: messageType,
        eventName: eventOutreach.eventName,
        eventAction: eventOutreach.eventAction,
      });

      setSubject(messageType === 'email' ? res.subject || '' : '');
      setMessage(res.content || '');
      toast({ title: 'Event message content generated' });
    } catch (e: any) {
      toast({ title: 'AI generation failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    }
  };

  // When we arrive from an event (invite/cancel), prefill subject/body so the user can edit right away.
  useEffect(() => {
    if (!eventOutreach) return;
    const prompt = (eventOutreach.prompt ?? aiPrompt).trim();
    if (!prompt) return;
    if (subject || message) return; // don’t overwrite user edits

    (async () => {
      try {
        const res = await callComposeEndpoint({
          prompt,
          channel: messageType,
          eventName: eventOutreach.eventName,
          eventAction: eventOutreach.eventAction,
        });
        setSubject(messageType === 'email' ? res.subject || '' : '');
        setMessage(res.content || '');
      } catch (e: any) {
        toast({ title: 'AI generation failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
      }
    })();
  }, [eventOutreach, aiPrompt, messageType]); // messageType affects copy for email vs WhatsApp

  const handleCampaignAiPreview = async (promptOverride?: string) => {
    const prompt = (promptOverride ?? aiPrompt).trim();
    if (!prompt) {
      toast({ title: 'Validation Error', description: 'Please enter an AI prompt', variant: 'destructive' });
      return;
    }

    setAiPreviewLoading(true);
    try {
      const res = await apiPost<any>('/campaigns/preview', { prompt });
      if (!res?.valid) {
        toast({ title: 'AI Preview failed', description: res?.error ?? 'Unknown error', variant: 'destructive' });
        return;
      }

      const contacts = res?.contacts ?? [];
      const ids = contacts.map((c: any) => String(c.contact_id)).filter((id: string) => id);
      const segIds = (res?.segment_ids ?? []).map((x: any) => String(x)).filter((id: string) => id);

      setSelectedSegments(segIds);
      setSelectedIndividuals(ids);
      setMainTab('send');
      setShowRecipientsDialog(true);

      // Generate AI content related to the prompt (event + segment context).
      const segmentNames = (res?.segment_names ?? []).filter((x: any) => Boolean(x)) as string[];
      const eventName = (res?.event_names?.[0] ? String(res.event_names[0]) : '') || extractEventNameFromPrompt(prompt);
      const eventAction = extractEventActionFromPrompt(prompt);
      const resCompose = await callComposeEndpoint({
        prompt,
        channel: messageType,
        eventName: eventName || undefined,
        eventAction: eventAction as any,
        segmentNames,
      });

      setSubject(messageType === 'email' ? resCompose.subject || '' : '');
      setMessage(resCompose.content || '');

      toast({
        title: 'Campaign preview ready',
        description: `${segIds.length} segments + ${ids.length} individuals preselected. Review and edit the message.`,
      });
    } catch (e: any) {
      toast({ title: 'Failed to preview campaign', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setAiPreviewLoading(false);
    }
  };

  const handleSendNow = async () => {
    if (!message) { toast({ title: 'Error', description: 'Please write a message', variant: 'destructive' }); return; }
    if (selectedSegments.length === 0 && selectedIndividuals.length === 0) { toast({ title: 'Error', description: 'Please select recipients', variant: 'destructive' }); return; }
    if (!selectedSender) { toast({ title: 'Error', description: 'Please select a sender', variant: 'destructive' }); return; }

    try {
      const sender = currentSenders.find((s) => s.id === selectedSender);
      const contact_ids = await resolveContactIds(selectedSegments, selectedIndividuals);
      const sent_at = new Date().toISOString();
      await apiPost('/campaigns', {
        name: eventOutreach
          ? `${eventOutreach.eventName} - ${eventOutreach.eventAction}`
          : subject || 'Direct Message',
        description: null,
        contact_ids,
        channel: messageType,
        subject: messageType === 'email' ? subject : null,
        content: message,
        sender_label: sender?.name || null,
        sender_address: sender?.address || null,
        sent_at,
        status: 'completed',
        sent_count: contact_ids.length,
        open_count: 0,
        click_count: 0,
      });

      // If we were launched from an event, mark RSVP/status so "cancel" can target only previously invited people.
      if (eventOutreach) {
        if (eventOutreach.eventAction === 'invite') {
          const channel = messageType;
          for (const cid of contact_ids) {
            await apiPatch(`/events/${eventOutreach.eventId}/invite-sent`, {
              contact_id: cid,
              channel,
              sent: true,
            });
          }
        } else {
          await apiPatch(`/events/${eventOutreach.eventId}`, { status: 'cancelled' });
        }
      }

      toast({ title: 'Campaign tracked', description: `Saved campaign for ${contact_ids.length} recipients (no sending configured).` });
      setMessage('');
      setSubject('');
      setSelectedSegments([]);
      setSelectedIndividuals([]);
      setSelectedTemplate('');
      setEventOutreach(null);
      await fetchCampaigns();
    } catch (e: any) {
      toast({ title: 'Failed to save campaign', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    }
  };

  const handleSaveTemplate = () => {
    if (!templateForm.name || !templateForm.content) { toast({ title: 'Error', description: 'Please provide name and content', variant: 'destructive' }); return; }
    const payload = {
      type: messageType,
      name: templateForm.name,
      subject: messageType === 'email' ? (templateForm.subject || null) : null,
      content: templateForm.content,
    };
    const op = editingTemplate
      ? apiPatch(`/templates/${editingTemplate.id}`, payload)
      : apiPost('/templates', payload);
    op
      .then(() => {
        setShowCreateTemplateDialog(false);
        setEditingTemplate(null);
        setTemplateForm({ name: '', subject: '', content: '' });
        toast({ title: 'Success' });
        return fetchTemplates(messageType);
      })
      .catch((e: any) => toast({ title: 'Failed to save template', description: e?.message ?? 'Unknown error', variant: 'destructive' }));
  };

  const handleEditTemplate = (template: MessageTemplate) => { setEditingTemplate(template); setTemplateForm({ name: template.name, subject: template.subject || '', content: template.content }); setShowCreateTemplateDialog(true); };
  const handleDeleteTemplate = (id: string) => {
    apiDelete(`/templates/${id}`)
      .then(() => {
        toast({ title: 'Deleted' });
        return fetchTemplates(messageType);
      })
      .catch((e: any) => toast({ title: 'Failed to delete template', description: e?.message ?? 'Unknown error', variant: 'destructive' }));
  };
  const handleRecipientsConfirm = (segments: string[], individuals: string[]) => { setSelectedSegments(segments); setSelectedIndividuals(individuals); };
  const removeSegment = (id: string) => setSelectedSegments((prev) => prev.filter((i) => i !== id));
  const removeIndividual = (id: string) => setSelectedIndividuals((prev) => prev.filter((i) => i !== id));

  const fetchTemplates = async (type: 'email' | 'whatsapp') => {
    setTemplatesLoading(true);
    try {
      const rows = await apiGet<any[]>(`/templates?type=${type}`);
      const mapped: MessageTemplate[] = (rows || []).map((t: any) => ({
        id: String(t.template_id),
        name: t.name,
        type: t.type,
        subject: t.subject || undefined,
        content: t.content,
        createdAt: t.created_at || new Date().toISOString(),
        createdBy: String(t.created_by || ''),
        updatedAt: t.updated_at || t.created_at || new Date().toISOString(),
      }));
      setTemplates(mapped);
    } catch {
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const rows = await apiGet<any[]>('/campaigns');
      const mapped = (rows || []).map((c: any) => ({
        id: Number(c.campaign_id),
        name: c.name,
        type: (c.channel || 'email') as 'email' | 'whatsapp',
        sent: Number(c.sent_count || c.contact_count || 0),
        opened: Number(c.open_count || 0),
        clicked: Number(c.click_count || 0),
        date: (c.sent_at ? new Date(c.sent_at).toISOString().slice(0, 10) : (c.created_at ? new Date(c.created_at).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10))),
      }));
      setRecentCampaigns(mapped);
    } catch {
      setRecentCampaigns([]);
    }
  };

  const fetchSegmentsAndContacts = async () => {
    try {
      const segRows = await apiGet<any[]>('/segments');

      // Load enough contacts so AI preview matches are likely visible in the UI.
      const allContacts: any[] = [];
      let offset = 0;
      const limit = 500;
      const maxFetch = 5000;
      let total = Infinity;
      while (offset < total && offset < maxFetch) {
        const page = await apiGet<any>(`/contacts?limit=${limit}&offset=${offset}`);
        const pageContacts = page?.contacts ?? [];
        allContacts.push(...pageContacts);
        total = typeof page?.total === 'number' ? page.total : offset + pageContacts.length;
        if (!pageContacts.length) break;
        offset += limit;
      }
      const segs = (segRows || []).map((s: any) => ({
        id: String(s.segment_id),
        name: s.name,
        memberCount: Number(s.contact_count || 0),
        memberIds: [],
      }));
      setSegments(segs);
      const cs = (allContacts || []).map((c: any) => ({
        id: String(c.contact_id),
        firstName: c.first_name,
        lastName: c.last_name,
        email: c.email || undefined,
        phone: c.phone || undefined,
        whatsapp: c.whatsapp || undefined,
      }));
      setContacts(cs);
    } catch {
      setSegments([]);
      setContacts([]);
    }
  };

  useEffect(() => {
    fetchSegmentsAndContacts();
    fetchCampaigns();
    fetchTemplates(messageType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchTemplates(messageType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messageType]);

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Wand2 className="h-4 w-4 text-primary" />
          {eventOutreach ? 'Event message content' : 'AI-first campaigns'}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-start">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {eventOutreach
                  ? eventOutreach.eventAction === 'cancel'
                    ? 'What should we send to say it’s cancelled?'
                    : 'What should the invite message say?'
                  : 'What campaign should AI prefill?'}
              </h1>
              <p className="mt-2 text-muted-foreground">
                {eventOutreach
                  ? 'Recipients are preselected. Describe the message you want, and generate subject/body.'
                  : 'Describe who to message (and what for). We’ll preselect recipients and draft the subject/message so you can edit.'}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={
                  eventOutreach
                    ? `e.g., friendly cancellation note for ${eventOutreach.eventName}`
                    : 'e.g., email sales leads in Bangalore about the Q2 kickoff'
                }
                className="h-12 flex-1"
              />

              {eventOutreach ? (
                <Button className="h-12 gap-2" onClick={handleGenerateEventContent} disabled={!aiPrompt.trim()}>
                  <Sparkles className="h-4 w-4" />
                  Generate {messageType === 'email' ? 'Email' : 'WhatsApp'} content
                </Button>
              ) : (
                <>
                  <Button
                    className="h-12 gap-2"
                    onClick={() => handleCampaignAiPreview()}
                    disabled={aiPreviewLoading || !aiPrompt.trim()}
                  >
                    <Sparkles className="h-4 w-4" />
                    {aiPreviewLoading ? 'Generating…' : 'Create with AI'}
                  </Button>
                  <Button variant="outline" className="h-12" onClick={handleGenerateContentOnly} disabled={aiPreviewLoading || !aiPrompt.trim()}>
                    Generate {messageType === 'email' ? 'Email' : 'WhatsApp'} content
                  </Button>
                </>
              )}
            </div>
          </div>

          {eventOutreach ? (
            <div className="rounded-2xl border bg-muted/40 p-4">
              <p className="text-sm font-medium">Recipients preselected</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {eventOutreach.contactIds.length} people for this {eventOutreach.eventAction} flow.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border bg-muted/40 p-4">
              <p className="text-sm font-medium">Suggested prompts</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {aiCampaignSuggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className="h-auto whitespace-normal text-left"
                    onClick={() => {
                      setAiPrompt(suggestion);
                      handleCampaignAiPreview(suggestion);
                    }}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
      <Tabs
        value={messageType}
        onValueChange={(v) => {
          const next = v as 'email' | 'whatsapp';
          setMessageType(next);
          if (eventOutreach) {
            // Event mode: content is channel-specific, so reset so user can regenerate for the new tab.
            setSubject('');
            setMessage('');
          }
        }}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="email" className="gap-2"><Mail className="h-4 w-4" />Email</TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2"><MessageCircle className="h-4 w-4" />WhatsApp</TabsTrigger>
        </TabsList>
      </Tabs>

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'send' | 'templates')}>
        <TabsList><TabsTrigger value="send"><Send className="h-4 w-4 mr-2" />Send Message</TabsTrigger><TabsTrigger value="templates"><FileText className="h-4 w-4 mr-2" />Templates ({currentTemplates.length})</TabsTrigger></TabsList>

        <TabsContent value="send" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader><CardTitle className="text-lg">Compose {messageType === 'email' ? 'Email' : 'WhatsApp Message'}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label className="text-sm font-medium mb-2 block">Send From *</Label><Select value={selectedSender} onValueChange={setSelectedSender}><SelectTrigger><SelectValue placeholder={`Select ${messageType === 'email' ? 'email' : 'phone'}`} /></SelectTrigger><SelectContent>{currentSenders.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.address})</SelectItem>)}</SelectContent></Select></div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">
                        Recipients *{totalRecipients > 0 && <Badge variant="secondary" className="ml-2">{totalRecipients}</Badge>}
                      </Label>
                      {!eventOutreach && (
                        <Button variant="outline" size="sm" onClick={() => setShowRecipientsDialog(true)}>
                          <Users className="h-4 w-4 mr-2" />Select Recipients
                        </Button>
                      )}
                    </div>
                    {(selectedSegments.length > 0 || selectedIndividuals.length > 0) ? (
                      <div className="border rounded-lg p-3 space-y-2">
                        {selectedSegmentNames.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Segments</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedSegments.map((id) => {
                                const seg = segments.find((s) => s.id === id);
                                return seg ? (
                                  <Badge key={id} variant="default" className="gap-1">
                                    {seg.name} ({seg.memberCount})
                                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeSegment(id)} />
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                        {selectedIndividualNames.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Individuals</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedIndividuals.slice(0, 5).map((id) => {
                                const c = contacts.find((a) => a.id === id);
                                return c ? (
                                  <Badge key={id} variant="secondary" className="gap-1">
                                    {c.firstName} {c.lastName}
                                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeIndividual(id)} />
                                  </Badge>
                                ) : null;
                              })}
                              {selectedIndividuals.length > 5 && (
                                <Badge variant="outline">+{selectedIndividuals.length - 5} more</Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : <div className="border rounded-lg p-4 text-center text-muted-foreground"><Users className="h-6 w-6 mx-auto mb-2 opacity-50" /><p className="text-sm">No recipients selected</p></div>}
                  </div>
                  <div><Label className="text-sm font-medium mb-2 block">Use Template (optional)</Label><Select value={selectedTemplate} onValueChange={(v) => { const t = currentTemplates.find((t) => t.id === v); if (t) handleUseTemplate(t); }}><SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger><SelectContent>{currentTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
                  {messageType === 'email' && <div><Label className="text-sm font-medium mb-2 block">Subject *</Label><Input placeholder="Enter email subject..." value={subject} onChange={(e) => setSubject(e.target.value)} /></div>}
                  <div><Label className="text-sm font-medium mb-2 block">Message *</Label><Textarea placeholder="Write your message..." className="min-h-[200px]" value={message} onChange={(e) => setMessage(e.target.value)} /><p className="text-xs text-muted-foreground mt-2">Use {'{{name}}'}, {'{{email}}'}, {'{{event_name}}'} for personalization</p></div>
                  <div className="flex items-center justify-end gap-2 pt-4 border-t"><Button onClick={handleSendNow} disabled={totalRecipients === 0}><Send className="h-4 w-4 mr-2" />Send to {totalRecipients} Recipients</Button></div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card><CardHeader><CardTitle className="text-lg">Recent Campaigns</CardTitle></CardHeader><CardContent className="space-y-4">{recentCampaigns.map((c) => (<div key={c.id} className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"><div className="flex items-start justify-between"><div className="flex items-center gap-2">{c.type === 'email' ? <Mail className="h-4 w-4 text-primary" /> : <MessageCircle className="h-4 w-4 text-success" />}<span className="font-medium text-sm">{c.name}</span></div></div><div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground"><span>{c.sent} sent</span><span>{c.sent > 0 ? Math.round((c.opened / c.sent) * 100) : 0}% opened</span></div></div>))}</CardContent></Card>
              <Card><CardHeader><CardTitle className="text-lg">Quick Stats</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Emails This Month</span><span className="font-semibold">450</span></div><div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Avg Open Rate</span><span className="font-semibold text-success">78%</span></div><div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">WhatsApp Messages</span><span className="font-semibold">295</span></div><div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Response Rate</span><span className="font-semibold">62%</span></div></CardContent></Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader><div className="flex items-center justify-between"><div><CardTitle className="text-lg">{messageType === 'email' ? 'Email' : 'WhatsApp'} Templates</CardTitle><CardDescription>Create and manage reusable message templates</CardDescription></div><Button onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', subject: '', content: '' }); setShowCreateTemplateDialog(true); }}><Plus className="h-4 w-4 mr-2" />Create Template</Button></div></CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="py-10 text-center text-muted-foreground">Loading templates…</div>
              ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{currentTemplates.map((template) => (
              <div key={template.id} className="p-4 rounded-lg border hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3"><div className="flex items-center gap-2">{template.type === 'email' ? <Mail className="h-4 w-4 text-primary" /> : <MessageCircle className="h-4 w-4 text-success" />}<span className="font-medium">{template.name}</span></div><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditTemplate(template)}><Edit2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTemplate(template.id)}><Trash2 className="h-4 w-4" /></Button></div></div>
                {template.subject && <p className="text-sm font-medium mb-1 truncate">Subject: {template.subject}</p>}<p className="text-sm text-muted-foreground line-clamp-3">{template.content}</p>
                <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => handleUseTemplate(template)}>Use Template</Button>
              </div>
            ))}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateTemplateDialog} onOpenChange={setShowCreateTemplateDialog}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{editingTemplate ? 'Edit' : 'Create'} {messageType === 'email' ? 'Email' : 'WhatsApp'} Template</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2"><Label>Template Name *</Label><Input value={templateForm.name} onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g., Event Invitation" /></div>
            {messageType === 'email' && <div className="space-y-2"><Label>Subject</Label><Input value={templateForm.subject} onChange={(e) => setTemplateForm((prev) => ({ ...prev, subject: e.target.value }))} /></div>}
            <div className="space-y-2"><Label>Content *</Label><Textarea value={templateForm.content} onChange={(e) => setTemplateForm((prev) => ({ ...prev, content: e.target.value }))} rows={6} /></div>
            <div className="flex justify-end gap-3 pt-4 border-t"><Button variant="outline" onClick={() => setShowCreateTemplateDialog(false)}>Cancel</Button><Button onClick={handleSaveTemplate}><Save className="h-4 w-4 mr-2" />{editingTemplate ? 'Update' : 'Save'}</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <SelectRecipientsDialog
        open={showRecipientsDialog}
        onOpenChange={setShowRecipientsDialog}
        selectedSegments={selectedSegments}
        selectedIndividuals={selectedIndividuals}
        onConfirm={handleRecipientsConfirm}
        audienceSegments={segments.map((s) => ({
          id: s.id,
          name: s.name,
          description: '',
          filters: {},
          memberIds: s.memberIds,
          memberCount: s.memberCount,
          createdAt: '',
          createdBy: '',
          updatedAt: '',
        }))}
        contacts={contacts}
        messageType={messageType}
      />
    </div>
  );
}
