import { useState } from 'react';
import { Sparkles, Mail, MessageCircle, Users, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (campaign: any) => void;
}

const quickQueries = [
  'Create a WhatsApp campaign for high-intent Mumbai leads not contacted in 14 days',
  'Draft a post-event thank you email for attendees from the AI webinar',
  'Reach active customers with low recent engagement and offer a quick call',
];

export function CreateCampaignDialog({ open, onOpenChange, onSave }: CreateCampaignDialogProps) {
  const { toast } = useToast();
  const [messageType, setMessageType] = useState<'email' | 'whatsapp'>('email');
  const [formData, setFormData] = useState({
    name: '',
    audience: '',
    subject: '',
    message: '',
    aiQuery: '',
  });
  const [aiContacts, setAiContacts] = useState<number | null>(null);

  const updateForm = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAIQuery = (query = formData.aiQuery) => {
    if (!query.trim()) {
      toast({ title: 'Add an instruction', description: 'Describe the audience and message you want AI to create.', variant: 'destructive' });
      return;
    }

    const lowerQuery = query.toLowerCase();
    const generatedCount = lowerQuery.includes('mumbai') ? 28 : lowerQuery.includes('attendees') ? 46 : lowerQuery.includes('customers') ? 64 : 35;
    setAiContacts(generatedCount);
    setMessageType(lowerQuery.includes('whatsapp') ? 'whatsapp' : 'email');
    setFormData((prev) => ({
      ...prev,
      aiQuery: query,
      name: query.length > 52 ? `${query.slice(0, 52)}…` : query,
      audience: lowerQuery.includes('attendees') ? 'event-attendees' : lowerQuery.includes('leads') ? 'high-intent-leads' : 'active-customers',
      subject: lowerQuery.includes('thank you') ? 'Thank you for attending {{event_name}}' : 'AI-generated campaign draft',
      message: lowerQuery.includes('whatsapp')
        ? 'Hi {{firstName}}, AI prepared this WhatsApp draft for your selected audience.'
        : 'Hi {{firstName}},\n\nAI prepared this campaign draft based on your prompt.\n\nBest,\nTeam',
    }));
    toast({ title: 'AI campaign draft ready', description: `Prepared campaign content for ${generatedCount} matching contacts.` });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.message) {
      toast({ title: 'Validation Error', description: 'Please fill in campaign name and message', variant: 'destructive' });
      return;
    }

    const campaign = {
      id: crypto.randomUUID(),
      name: formData.name,
      type: messageType,
      audience: formData.audience || 'AI Selection',
      subject: formData.subject,
      message: formData.message,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    onSave?.(campaign);
    toast({ title: 'Success', description: 'Campaign created successfully' });
    onOpenChange(false);
    setFormData({ name: '', audience: '', subject: '', message: '', aiQuery: '' });
    setAiContacts(null);
  };

  const handleSendNow = () => {
    handleSubmit();
    toast({ title: 'Campaign Sent', description: 'Your AI campaign is being processed.' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[1400px] h-[92vh] p-0">
        <div className="dialog-shell">
          <DialogHeader className="dialog-header-tight">
            <DialogTitle>Create Campaign</DialogTitle>
            <DialogDescription>AI-only first: describe the campaign, then review the generated draft.</DialogDescription>
          </DialogHeader>

          <div className="dialog-body-scroll grid min-h-0 lg:grid-cols-[1fr_0.95fr]">
            <div className="border-b p-6 lg:border-b-0 lg:border-r">
              <div className="space-y-5">
                <div className="rounded-3xl border bg-muted/40 p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground"><Wand2 className="h-4 w-4 text-primary" /> AI campaign command</div>
                  <h3 className="text-2xl font-semibold">Describe who to reach and what to send.</h3>
                  <p className="mt-2 text-sm text-muted-foreground">This should be the biggest call to action: AI decides audience and drafts the message first.</p>
                  <div className="mt-4 flex flex-col gap-3">
                    <Input value={formData.aiQuery} onChange={(e) => updateForm('aiQuery', e.target.value)} placeholder='e.g., Create a WhatsApp campaign for high-engagement leads in Mumbai' className="h-12" />
                    <Button className="h-12 gap-2" onClick={() => handleAIQuery()}><Sparkles className="h-4 w-4" />Generate campaign with AI</Button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {quickQueries.map((query) => (
                      <Button key={query} variant="outline" size="sm" className="h-auto whitespace-normal text-left" onClick={() => handleAIQuery(query)}>{query}</Button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border bg-card p-4">
                  <div className="flex items-center justify-between"><p className="text-sm font-medium">AI audience match</p>{aiContacts !== null && <Badge variant="secondary">{aiContacts} contacts</Badge>}</div>
                  <p className="mt-2 text-sm text-muted-foreground">{aiContacts !== null ? 'AI has selected the audience and prepared the first draft.' : 'Run an AI prompt to generate a campaign audience.'}</p>
                </div>
              </div>
            </div>

            <ScrollArea className="h-full">
              <div className="space-y-4 p-6">
                <div className="space-y-2"><Label htmlFor="name">Campaign Name *</Label><Input id="name" value={formData.name} onChange={(e) => updateForm('name', e.target.value)} placeholder="e.g., January Newsletter, Event Invitation" /></div>
                <div className="space-y-2"><Label>AI-selected audience</Label><Select value={formData.audience} onValueChange={(v) => updateForm('audience', v)}><SelectTrigger><SelectValue placeholder="Select generated audience" /></SelectTrigger><SelectContent><SelectItem value="active-customers">Active Customers</SelectItem><SelectItem value="high-intent-leads">High-intent Leads</SelectItem><SelectItem value="event-attendees">Event Attendees</SelectItem><SelectItem value="no-show-followup">No-show Follow-up</SelectItem></SelectContent></Select></div>
                <Tabs value={messageType} onValueChange={(v) => setMessageType(v as 'email' | 'whatsapp')}>
                  <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="email" className="gap-2"><Mail className="h-4 w-4" />Email</TabsTrigger><TabsTrigger value="whatsapp" className="gap-2"><MessageCircle className="h-4 w-4" />WhatsApp</TabsTrigger></TabsList>
                  <TabsContent value="email" className="mt-4 space-y-4"><div className="space-y-2"><Label htmlFor="subject">Subject Line</Label><Input id="subject" value={formData.subject} onChange={(e) => updateForm('subject', e.target.value)} placeholder="Enter email subject..." /></div><div className="space-y-2"><Label htmlFor="message">Email Content *</Label><Textarea id="message" value={formData.message} onChange={(e) => updateForm('message', e.target.value)} placeholder="Write your email content here... You can use {{firstName}}, {{lastName}} for personalization." rows={10} /></div></TabsContent>
                  <TabsContent value="whatsapp" className="mt-4 space-y-4"><div className="space-y-2"><Label htmlFor="message-whatsapp">WhatsApp Message *</Label><Textarea id="message-whatsapp" value={formData.message} onChange={(e) => updateForm('message', e.target.value)} placeholder="Write your WhatsApp message here... You can use {{firstName}} for personalization." rows={8} /><p className="text-xs text-muted-foreground">Use variables like {'{{firstName}}'}, {'{{event_name}}'}, and {'{{company}}'}.</p></div></TabsContent>
                </Tabs>
                <div className="rounded-2xl border bg-muted/30 p-4"><p className="text-sm font-medium">Personalization variables</p><p className="mt-2 text-sm text-muted-foreground">Supported variables: {'{{firstName}}'}, {'{{lastName}}'}, {'{{email}}'}, {'{{event_name}}'}, {'{{company}}'}.</p></div>
                <div className="flex gap-2"><Button variant="outline" size="sm"><Sparkles className="mr-2 h-4 w-4" />AI Rewrite</Button><Button variant="outline" size="sm"><Users className="mr-2 h-4 w-4" />Preview Recipients</Button></div>
              </div>
            </ScrollArea>
          </div>

          <div className="dialog-footer-bar flex justify-end gap-3"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="outline" onClick={handleSubmit}>Save Draft</Button><Button onClick={handleSendNow}>Send Now</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
