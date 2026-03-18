import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, Mail, MessageCircle, FileText, Users, Plus, Save, Trash2, X, Edit2 } from 'lucide-react';
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
import { mockContacts } from '@/data/mockData';
import { SelectRecipientsDialog } from '@/components/dialogs/SelectRecipientsDialog';

const initialEmailTemplates: MessageTemplate[] = [
  { id: '1', name: 'Event Invitation', type: 'email', subject: 'You are invited to {{event_name}}', content: 'Dear {{name}},\n\nWe are excited to invite you to {{event_name}}.\n\nBest regards,\nCRM Team', createdAt: '2024-01-15', createdBy: 'admin', updatedAt: '2024-01-15' },
  { id: '2', name: 'Follow-up Thank You', type: 'email', subject: 'Thank you for attending {{event_name}}', content: 'Dear {{name}},\n\nThank you for attending.\n\nBest regards,\nCRM Team', createdAt: '2024-01-08', createdBy: 'admin', updatedAt: '2024-01-08' },
  { id: '3', name: 'Newsletter', type: 'email', subject: 'Monthly Newsletter - {{month}}', content: 'Dear {{name}},\n\nHere are the latest updates...\n\nBest regards,\nCRM Team', createdAt: '2024-01-05', createdBy: 'admin', updatedAt: '2024-01-05' },
];

const initialWhatsAppTemplates: MessageTemplate[] = [
  { id: '4', name: 'Event Reminder', type: 'whatsapp', content: 'Hi {{name}}! 👋\n\nReminder about: {{event_name}}\n\nSee you there!', createdAt: '2024-01-10', createdBy: 'admin', updatedAt: '2024-01-10' },
  { id: '5', name: 'Quick Update', type: 'whatsapp', content: 'Hi {{name}}! 👋\n\nWe have an exciting update...', createdAt: '2024-01-08', createdBy: 'admin', updatedAt: '2024-01-08' },
];

const audienceSegments: AudienceSegment[] = [
  { id: '1', name: 'Bangalore Contacts', description: '', filters: {}, memberIds: ['1', '5'], memberCount: 2, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '2', name: 'Tech Department', description: '', filters: {}, memberIds: ['1'], memberCount: 1, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '3', name: 'High Engagement', description: '', filters: {}, memberIds: ['1', '4'], memberCount: 2, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '4', name: 'Available Consultants', description: '', filters: {}, memberIds: ['1', '2', '4', '5'], memberCount: 4, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '5', name: 'Mumbai Contacts', description: '', filters: {}, memberIds: ['2', '3'], memberCount: 2, createdAt: '', createdBy: '', updatedAt: '' },
];

const emailSenders = [
  { id: '1', name: 'CRM Team', address: 'crm@company.com' },
  { id: '2', name: 'Sales Team', address: 'sales@company.com' },
  { id: '3', name: 'Events Team', address: 'events@company.com' },
];

const whatsappSenders = [
  { id: '1', name: 'Main WhatsApp', address: '+1 555 123 4567' },
  { id: '2', name: 'Secondary WhatsApp', address: '+1 555 987 6543' },
];

export default function Communications() {
  const { toast } = useToast();
  const location = useLocation();
  const [mainTab, setMainTab] = useState<'send' | 'templates'>('send');
  const [messageType, setMessageType] = useState<'email' | 'whatsapp'>('email');
  const [emailTemplates, setEmailTemplates] = useState<MessageTemplate[]>(initialEmailTemplates);
  const [whatsappTemplates, setWhatsappTemplates] = useState<MessageTemplate[]>(initialWhatsAppTemplates);
  const [showCreateTemplateDialog, setShowCreateTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', content: '' });
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedSender, setSelectedSender] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);
  const [showRecipientsDialog, setShowRecipientsDialog] = useState(false);
  const [recentCampaigns, setRecentCampaigns] = useState([
    { id: 1, name: 'Conference Invitation', type: 'email' as const, sent: 250, opened: 195, clicked: 120, date: '2024-01-15' },
    { id: 2, name: 'Webinar Reminder', type: 'whatsapp' as const, sent: 150, opened: 145, clicked: 95, date: '2024-01-18' },
    { id: 3, name: 'Meetup RSVP', type: 'email' as const, sent: 45, opened: 40, clicked: 32, date: '2024-01-20' },
  ]);

  useEffect(() => {
    if (location.state) {
      const { recipient, type } = location.state as { recipient?: string; type?: 'email' | 'whatsapp' };
      if (type) setMessageType(type);
      if (recipient) {
        const contact = mockContacts.find((c) => c.email === recipient || c.phone === recipient || c.whatsapp === recipient);
        if (contact) setSelectedIndividuals([contact.id]);
      }
    }
  }, [location.state]);

  const currentTemplates = messageType === 'email' ? emailTemplates : whatsappTemplates;
  const currentSenders = messageType === 'email' ? emailSenders : whatsappSenders;

  const totalRecipients = useMemo(() => {
    const segmentMemberIds = selectedSegments.flatMap((segId) => audienceSegments.find((s) => s.id === segId)?.memberIds || []);
    return [...new Set([...segmentMemberIds, ...selectedIndividuals])].length;
  }, [selectedSegments, selectedIndividuals]);

  const selectedSegmentNames = useMemo(() => selectedSegments.map((id) => audienceSegments.find((s) => s.id === id)?.name || '').filter(Boolean), [selectedSegments]);
  const selectedIndividualNames = useMemo(() => selectedIndividuals.map((id) => { const c = mockContacts.find((a) => a.id === id); return c ? `${c.firstName} ${c.lastName}` : ''; }).filter(Boolean), [selectedIndividuals]);

  const handleUseTemplate = (template: MessageTemplate) => { setSelectedTemplate(template.id); setMessage(template.content); if (template.subject) setSubject(template.subject); setMainTab('send'); toast({ title: 'Template Applied' }); };
  const handleSendNow = () => {
    if (!message) { toast({ title: 'Error', description: 'Please write a message', variant: 'destructive' }); return; }
    if (selectedSegments.length === 0 && selectedIndividuals.length === 0) { toast({ title: 'Error', description: 'Please select recipients', variant: 'destructive' }); return; }
    if (!selectedSender) { toast({ title: 'Error', description: 'Please select a sender', variant: 'destructive' }); return; }
    setRecentCampaigns((prev) => [{ id: prev.length + 1, name: subject || 'Direct Message', type: messageType, sent: totalRecipients, opened: 0, clicked: 0, date: new Date().toISOString().split('T')[0] }, ...prev]);
    toast({ title: 'Message Sent', description: `Delivering to ${totalRecipients} recipients` });
    setMessage(''); setSubject(''); setSelectedSegments([]); setSelectedIndividuals([]); setSelectedTemplate('');
  };

  const handleSaveTemplate = () => {
    if (!templateForm.name || !templateForm.content) { toast({ title: 'Error', description: 'Please provide name and content', variant: 'destructive' }); return; }
    const newTemplate: MessageTemplate = { id: crypto.randomUUID(), name: templateForm.name, type: messageType, subject: messageType === 'email' ? templateForm.subject : undefined, content: templateForm.content, createdAt: new Date().toISOString(), createdBy: 'current_user', updatedAt: new Date().toISOString() };
    if (messageType === 'email') { if (editingTemplate) setEmailTemplates((prev) => prev.map((t) => t.id === editingTemplate.id ? { ...newTemplate, id: editingTemplate.id } : t)); else setEmailTemplates((prev) => [newTemplate, ...prev]); }
    else { if (editingTemplate) setWhatsappTemplates((prev) => prev.map((t) => t.id === editingTemplate.id ? { ...newTemplate, id: editingTemplate.id } : t)); else setWhatsappTemplates((prev) => [newTemplate, ...prev]); }
    setShowCreateTemplateDialog(false); setEditingTemplate(null); setTemplateForm({ name: '', subject: '', content: '' }); toast({ title: 'Success' });
  };

  const handleEditTemplate = (template: MessageTemplate) => { setEditingTemplate(template); setTemplateForm({ name: template.name, subject: template.subject || '', content: template.content }); setShowCreateTemplateDialog(true); };
  const handleDeleteTemplate = (id: string) => { if (messageType === 'email') setEmailTemplates((prev) => prev.filter((t) => t.id !== id)); else setWhatsappTemplates((prev) => prev.filter((t) => t.id !== id)); toast({ title: 'Deleted' }); };
  const handleRecipientsConfirm = (segments: string[], individuals: string[]) => { setSelectedSegments(segments); setSelectedIndividuals(individuals); };
  const removeSegment = (id: string) => setSelectedSegments((prev) => prev.filter((i) => i !== id));
  const removeIndividual = (id: string) => setSelectedIndividuals((prev) => prev.filter((i) => i !== id));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Communications</h1><p className="text-muted-foreground">Send emails and WhatsApp messages to contacts</p></div></div>
      <Tabs value={messageType} onValueChange={(v) => setMessageType(v as 'email' | 'whatsapp')} className="w-full"><TabsList className="grid w-full max-w-md grid-cols-2"><TabsTrigger value="email" className="gap-2"><Mail className="h-4 w-4" />Email</TabsTrigger><TabsTrigger value="whatsapp" className="gap-2"><MessageCircle className="h-4 w-4" />WhatsApp</TabsTrigger></TabsList></Tabs>

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
                    <div className="flex items-center justify-between mb-2"><Label className="text-sm font-medium">Recipients *{totalRecipients > 0 && <Badge variant="secondary" className="ml-2">{totalRecipients}</Badge>}</Label><Button variant="outline" size="sm" onClick={() => setShowRecipientsDialog(true)}><Users className="h-4 w-4 mr-2" />Select Recipients</Button></div>
                    {(selectedSegments.length > 0 || selectedIndividuals.length > 0) ? (
                      <div className="border rounded-lg p-3 space-y-2">
                        {selectedSegmentNames.length > 0 && <div><p className="text-xs text-muted-foreground mb-1">Segments</p><div className="flex flex-wrap gap-1">{selectedSegments.map((id) => { const seg = audienceSegments.find((s) => s.id === id); return seg ? <Badge key={id} variant="default" className="gap-1">{seg.name} ({seg.memberCount})<X className="h-3 w-3 cursor-pointer" onClick={() => removeSegment(id)} /></Badge> : null; })}</div></div>}
                        {selectedIndividualNames.length > 0 && <div><p className="text-xs text-muted-foreground mb-1">Individuals</p><div className="flex flex-wrap gap-1">{selectedIndividuals.slice(0, 5).map((id) => { const c = mockContacts.find((a) => a.id === id); return c ? <Badge key={id} variant="secondary" className="gap-1">{c.firstName} {c.lastName}<X className="h-3 w-3 cursor-pointer" onClick={() => removeIndividual(id)} /></Badge> : null; })}{selectedIndividuals.length > 5 && <Badge variant="outline">+{selectedIndividuals.length - 5} more</Badge>}</div></div>}
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
            <CardContent><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{currentTemplates.map((template) => (
              <div key={template.id} className="p-4 rounded-lg border hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3"><div className="flex items-center gap-2">{template.type === 'email' ? <Mail className="h-4 w-4 text-primary" /> : <MessageCircle className="h-4 w-4 text-success" />}<span className="font-medium">{template.name}</span></div><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditTemplate(template)}><Edit2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTemplate(template.id)}><Trash2 className="h-4 w-4" /></Button></div></div>
                {template.subject && <p className="text-sm font-medium mb-1 truncate">Subject: {template.subject}</p>}<p className="text-sm text-muted-foreground line-clamp-3">{template.content}</p>
                <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => handleUseTemplate(template)}>Use Template</Button>
              </div>
            ))}</div></CardContent>
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

      <SelectRecipientsDialog open={showRecipientsDialog} onOpenChange={setShowRecipientsDialog} selectedSegments={selectedSegments} selectedIndividuals={selectedIndividuals} onConfirm={handleRecipientsConfirm} audienceSegments={audienceSegments} messageType={messageType} />
    </div>
  );
}
