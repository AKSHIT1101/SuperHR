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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { MessageTemplate, AudienceSegment } from '@/types/alumni';
import { mockAlumni } from '@/data/mockData';
import { SelectRecipientsDialog } from '@/components/dialogs/SelectRecipientsDialog';

// Separate templates by type
const initialEmailTemplates: MessageTemplate[] = [
  {
    id: '1',
    name: 'Event Invitation',
    type: 'email',
    subject: 'You are invited to {{event_name}}',
    content: 'Dear {{name}},\n\nWe are excited to invite you to {{event_name}} on {{event_date}}.\n\nLocation: {{event_location}}\n\nWe hope to see you there!\n\nBest regards,\nAlumni Relations Team',
    createdAt: '2024-01-15',
    createdBy: 'admin',
    updatedAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Follow-up Thank You',
    type: 'email',
    subject: 'Thank you for attending {{event_name}}',
    content: 'Dear {{name}},\n\nThank you for attending {{event_name}}. We hope you found it valuable.\n\nPlease share your feedback: {{feedback_link}}\n\nBest regards,\nAlumni Relations Team',
    createdAt: '2024-01-08',
    createdBy: 'admin',
    updatedAt: '2024-01-08',
  },
  {
    id: '3',
    name: 'Newsletter',
    type: 'email',
    subject: 'Monthly Alumni Newsletter - {{month}}',
    content: 'Dear {{name}},\n\nHere are the latest updates from our alumni community...\n\nBest regards,\nAlumni Relations Team',
    createdAt: '2024-01-05',
    createdBy: 'admin',
    updatedAt: '2024-01-05',
  },
];

const initialWhatsAppTemplates: MessageTemplate[] = [
  {
    id: '4',
    name: 'Event Reminder',
    type: 'whatsapp',
    content: 'Hi {{name}}! 👋\n\nJust a reminder about our upcoming event: {{event_name}}\n\n📅 Date: {{event_date}}\n📍 Location: {{event_location}}\n\nSee you there!',
    createdAt: '2024-01-10',
    createdBy: 'admin',
    updatedAt: '2024-01-10',
  },
  {
    id: '5',
    name: 'Quick Update',
    type: 'whatsapp',
    content: 'Hi {{name}}! 👋\n\nWe have an exciting update to share with you...',
    createdAt: '2024-01-08',
    createdBy: 'admin',
    updatedAt: '2024-01-08',
  },
];

const audienceSegments: AudienceSegment[] = [
  { id: '1', name: 'Bangalore Alumni', description: '', filters: {}, memberIds: ['1', '5'], memberCount: 2, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '2', name: 'Computer Science Professors', description: '', filters: {}, memberIds: ['1'], memberCount: 1, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '3', name: 'High Engagement Alumni', description: '', filters: {}, memberIds: ['1', '4'], memberCount: 2, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '4', name: 'Available Mentors', description: '', filters: {}, memberIds: ['1', '2', '4', '5'], memberCount: 4, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '5', name: 'Mumbai Alumni', description: '', filters: {}, memberIds: ['2', '3'], memberCount: 2, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '6', name: 'Recent Exits', description: '', filters: {}, memberIds: ['3', '4', '5'], memberCount: 3, createdAt: '', createdBy: '', updatedAt: '' },
];

const emailSenders = [
  { id: '1', name: 'Alumni Relations', address: 'alumni@university.edu' },
  { id: '2', name: 'HR Team', address: 'hr@university.edu' },
  { id: '3', name: 'Events Team', address: 'events@university.edu' },
];

const whatsappSenders = [
  { id: '1', name: 'Main WhatsApp', address: '+91 98765 43210' },
  { id: '2', name: 'Secondary WhatsApp', address: '+91 87654 32109' },
];

export default function Communications() {
  const { toast } = useToast();
  const location = useLocation();
  
  // Main tabs
  const [mainTab, setMainTab] = useState<'send' | 'templates'>('send');
  const [messageType, setMessageType] = useState<'email' | 'whatsapp'>('email');
  
  // Templates state
  const [emailTemplates, setEmailTemplates] = useState<MessageTemplate[]>(initialEmailTemplates);
  const [whatsappTemplates, setWhatsappTemplates] = useState<MessageTemplate[]>(initialWhatsAppTemplates);
  const [showCreateTemplateDialog, setShowCreateTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', subject: '', content: '' });
  
  // Send message state
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedSender, setSelectedSender] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);
  
  // Recipient selection dialog
  const [showRecipientsDialog, setShowRecipientsDialog] = useState(false);

  const [recentCampaigns, setRecentCampaigns] = useState([
    { id: 1, name: 'Reunion 2024 Invitation', type: 'email' as const, sent: 250, opened: 195, clicked: 120, date: '2024-01-15' },
    { id: 2, name: 'Webinar Reminder', type: 'whatsapp' as const, sent: 150, opened: 145, clicked: 95, date: '2024-01-18' },
    { id: 3, name: 'Bangalore Meetup RSVP', type: 'email' as const, sent: 45, opened: 40, clicked: 32, date: '2024-01-20' },
  ]);

  // Handle navigation with recipient data
  useEffect(() => {
    if (location.state) {
      const { recipient, type } = location.state as { recipient?: string; type?: 'email' | 'whatsapp' };
      if (type) setMessageType(type);
      if (recipient) {
        const alumni = mockAlumni.find((a) => a.email === recipient || a.phone === recipient || a.whatsapp === recipient);
        if (alumni) {
          setSelectedIndividuals([alumni.id]);
        }
      }
    }
  }, [location.state]);

  const currentTemplates = messageType === 'email' ? emailTemplates : whatsappTemplates;
  const currentSenders = messageType === 'email' ? emailSenders : whatsappSenders;

  // Calculate total recipients
  const totalRecipients = useMemo(() => {
    const segmentMemberIds = selectedSegments.flatMap((segId) => {
      const seg = audienceSegments.find((s) => s.id === segId);
      return seg?.memberIds || [];
    });
    return [...new Set([...segmentMemberIds, ...selectedIndividuals])].length;
  }, [selectedSegments, selectedIndividuals]);

  // Get selected segment names
  const selectedSegmentNames = useMemo(() => {
    return selectedSegments.map((id) => {
      const seg = audienceSegments.find((s) => s.id === id);
      return seg?.name || '';
    }).filter(Boolean);
  }, [selectedSegments]);

  // Get selected individual names
  const selectedIndividualNames = useMemo(() => {
    return selectedIndividuals.map((id) => {
      const alumni = mockAlumni.find((a) => a.id === id);
      return alumni ? `${alumni.firstName} ${alumni.lastName}` : '';
    }).filter(Boolean);
  }, [selectedIndividuals]);

  const handleUseTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template.id);
    setMessage(template.content);
    if (template.subject) setSubject(template.subject);
    setMainTab('send');
    toast({ title: 'Template Applied', description: `"${template.name}" template loaded` });
  };

  const handleSendNow = () => {
    if (!message) {
      toast({ title: 'Error', description: 'Please write a message before sending', variant: 'destructive' });
      return;
    }
    if (selectedSegments.length === 0 && selectedIndividuals.length === 0) {
      toast({ title: 'Error', description: 'Please select recipients', variant: 'destructive' });
      return;
    }
    if (!selectedSender) {
      toast({ title: 'Error', description: 'Please select a sender', variant: 'destructive' });
      return;
    }

    // Add to recent campaigns
    setRecentCampaigns((prev) => [
      { id: prev.length + 1, name: subject || 'Direct Message', type: messageType, sent: totalRecipients, opened: 0, clicked: 0, date: new Date().toISOString().split('T')[0] },
      ...prev,
    ]);

    toast({ title: 'Message Sent', description: `Your ${messageType} is being delivered to ${totalRecipients} recipients` });
    setMessage('');
    setSubject('');
    setSelectedSegments([]);
    setSelectedIndividuals([]);
    setSelectedTemplate('');
  };

  const handleSaveTemplate = () => {
    if (!templateForm.name || !templateForm.content) {
      toast({ title: 'Error', description: 'Please provide template name and content', variant: 'destructive' });
      return;
    }

    const newTemplate: MessageTemplate = {
      id: crypto.randomUUID(),
      name: templateForm.name,
      type: messageType,
      subject: messageType === 'email' ? templateForm.subject : undefined,
      content: templateForm.content,
      createdAt: new Date().toISOString(),
      createdBy: 'current_user',
      updatedAt: new Date().toISOString(),
    };

    if (messageType === 'email') {
      if (editingTemplate) {
        setEmailTemplates((prev) => prev.map((t) => t.id === editingTemplate.id ? { ...newTemplate, id: editingTemplate.id } : t));
      } else {
        setEmailTemplates((prev) => [newTemplate, ...prev]);
      }
    } else {
      if (editingTemplate) {
        setWhatsappTemplates((prev) => prev.map((t) => t.id === editingTemplate.id ? { ...newTemplate, id: editingTemplate.id } : t));
      } else {
        setWhatsappTemplates((prev) => [newTemplate, ...prev]);
      }
    }

    setShowCreateTemplateDialog(false);
    setEditingTemplate(null);
    setTemplateForm({ name: '', subject: '', content: '' });
    toast({ title: 'Success', description: editingTemplate ? 'Template updated' : 'Template created' });
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({ name: template.name, subject: template.subject || '', content: template.content });
    setShowCreateTemplateDialog(true);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (messageType === 'email') {
      setEmailTemplates((prev) => prev.filter((t) => t.id !== templateId));
    } else {
      setWhatsappTemplates((prev) => prev.filter((t) => t.id !== templateId));
    }
    toast({ title: 'Success', description: 'Template deleted' });
  };

  const handleRecipientsConfirm = (segments: string[], individuals: string[]) => {
    setSelectedSegments(segments);
    setSelectedIndividuals(individuals);
  };

  const removeSegment = (segmentId: string) => {
    setSelectedSegments((prev) => prev.filter((id) => id !== segmentId));
  };

  const removeIndividual = (alumniId: string) => {
    setSelectedIndividuals((prev) => prev.filter((id) => id !== alumniId));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Communications</h1>
          <p className="text-muted-foreground">Send emails and WhatsApp messages to alumni</p>
        </div>
      </div>

      {/* Message Type Toggle */}
      <Tabs value={messageType} onValueChange={(v) => setMessageType(v as 'email' | 'whatsapp')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'send' | 'templates')}>
        <TabsList>
          <TabsTrigger value="send">
            <Send className="h-4 w-4 mr-2" />
            Send Message
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Templates ({currentTemplates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Compose Section */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Compose {messageType === 'email' ? 'Email' : 'WhatsApp Message'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Sender Selection */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Send From *</Label>
                    <Select value={selectedSender} onValueChange={setSelectedSender}>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${messageType === 'email' ? 'email' : 'phone number'}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {currentSenders.map((sender) => (
                          <SelectItem key={sender.id} value={sender.id}>
                            {sender.name} ({sender.address})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Recipients */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">
                        Recipients *
                        {totalRecipients > 0 && <Badge variant="secondary" className="ml-2">{totalRecipients}</Badge>}
                      </Label>
                      <Button variant="outline" size="sm" onClick={() => setShowRecipientsDialog(true)}>
                        <Users className="h-4 w-4 mr-2" />
                        Select Recipients
                      </Button>
                    </div>
                    
                    {/* Selected Recipients Display */}
                    {(selectedSegments.length > 0 || selectedIndividuals.length > 0) ? (
                      <div className="border rounded-lg p-3 space-y-2">
                        {selectedSegmentNames.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Segments</p>
                            <div className="flex flex-wrap gap-1">
                              {selectedSegments.map((id) => {
                                const seg = audienceSegments.find((s) => s.id === id);
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
                                const alumni = mockAlumni.find((a) => a.id === id);
                                return alumni ? (
                                  <Badge key={id} variant="secondary" className="gap-1">
                                    {alumni.firstName} {alumni.lastName}
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
                    ) : (
                      <div className="border rounded-lg p-4 text-center text-muted-foreground">
                        <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No recipients selected</p>
                        <p className="text-xs">Click "Select Recipients" to add segments or individuals</p>
                      </div>
                    )}
                  </div>

                  {/* Template Selection */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Use Template (optional)</Label>
                    <Select value={selectedTemplate} onValueChange={(v) => {
                      const template = currentTemplates.find((t) => t.id === v);
                      if (template) {
                        handleUseTemplate(template);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {messageType === 'email' && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Subject *</Label>
                      <Input placeholder="Enter email subject..." value={subject} onChange={(e) => setSubject(e.target.value)} />
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Message *</Label>
                    <Textarea
                      placeholder={messageType === 'email' ? 'Write your email content here...' : 'Write your WhatsApp message here...'}
                      className="min-h-[200px]"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Use {'{{name}}'}, {'{{email}}'}, {'{{event_name}}'} for personalization
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t">
                    <Button onClick={handleSendNow} disabled={totalRecipients === 0}>
                      <Send className="h-4 w-4 mr-2" />
                      Send to {totalRecipients} Recipients
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Campaigns</CardTitle>
                  <CardDescription>Your latest outreach activities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentCampaigns.map((campaign) => (
                    <div key={campaign.id} className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {campaign.type === 'email' ? <Mail className="h-4 w-4 text-primary" /> : <MessageCircle className="h-4 w-4 text-success" />}
                          <span className="font-medium text-sm">{campaign.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{campaign.sent} sent</span>
                        <span>{campaign.sent > 0 ? Math.round((campaign.opened / campaign.sent) * 100) : 0}% opened</span>
                      </div>
                      <span className="text-xs text-muted-foreground mt-1 block">{new Date(campaign.date).toLocaleDateString()}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Emails This Month</span>
                    <span className="font-semibold">450</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Avg Open Rate</span>
                    <span className="font-semibold text-success">78%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">WhatsApp Messages</span>
                    <span className="font-semibold">295</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Response Rate</span>
                    <span className="font-semibold">62%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {messageType === 'email' ? 'Email' : 'WhatsApp'} Templates
                  </CardTitle>
                  <CardDescription>Create and manage reusable message templates</CardDescription>
                </div>
                <Button onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', subject: '', content: '' }); setShowCreateTemplateDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {currentTemplates.map((template) => (
                  <div key={template.id} className="p-4 rounded-lg border hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {template.type === 'email' ? <Mail className="h-4 w-4 text-primary" /> : <MessageCircle className="h-4 w-4 text-success" />}
                        <span className="font-medium">{template.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditTemplate(template)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTemplate(template.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {template.subject && <p className="text-sm font-medium mb-1 truncate">Subject: {template.subject}</p>}
                    <p className="text-sm text-muted-foreground line-clamp-3">{template.content}</p>
                    <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => handleUseTemplate(template)}>
                      Use Template
                    </Button>
                  </div>
                ))}
              </div>

              {currentTemplates.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No {messageType} templates yet</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowCreateTemplateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Template
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Template Dialog */}
      <Dialog open={showCreateTemplateDialog} onOpenChange={setShowCreateTemplateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit' : 'Create'} {messageType === 'email' ? 'Email' : 'WhatsApp'} Template</DialogTitle>
            <DialogDescription>Create a reusable message template</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Event Invitation"
              />
            </div>

            {messageType === 'email' && (
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm((prev) => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g., You are invited to {{event_name}}"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Content *</Label>
              <Textarea
                value={templateForm.content}
                onChange={(e) => setTemplateForm((prev) => ({ ...prev, content: e.target.value }))}
                placeholder="Write your template content..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                Use {'{{name}}'}, {'{{email}}'}, {'{{event_name}}'}, {'{{event_date}}'} for personalization
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCreateTemplateDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveTemplate}>
                <Save className="h-4 w-4 mr-2" />
                {editingTemplate ? 'Update' : 'Save'} Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recipients Selection Dialog */}
      <SelectRecipientsDialog
        open={showRecipientsDialog}
        onOpenChange={setShowRecipientsDialog}
        selectedSegments={selectedSegments}
        selectedIndividuals={selectedIndividuals}
        onConfirm={handleRecipientsConfirm}
        audienceSegments={audienceSegments}
        messageType={messageType}
      />
    </div>
  );
}
