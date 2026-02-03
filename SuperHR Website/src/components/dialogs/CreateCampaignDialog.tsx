import { useState } from 'react';
import { Sparkles, Mail, MessageCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (campaign: any) => void;
}

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

  const handleAIQuery = () => {
    if (formData.aiQuery) {
      // Simulate AI finding contacts
      setAiContacts(Math.floor(Math.random() * 100) + 20);
      toast({
        title: 'Contacts Found',
        description: `AI found ${aiContacts || 45} matching contacts for your query`,
      });
    }
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.message) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in campaign name and message',
        variant: 'destructive',
      });
      return;
    }

    const campaign = {
      id: crypto.randomUUID(),
      name: formData.name,
      type: messageType,
      audience: formData.audience || 'Custom Selection',
      subject: formData.subject,
      message: formData.message,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    onSave?.(campaign);
    toast({ title: 'Success', description: 'Campaign created successfully' });
    onOpenChange(false);

    // Reset form
    setFormData({
      name: '',
      audience: '',
      subject: '',
      message: '',
      aiQuery: '',
    });
    setAiContacts(null);
  };

  const handleSendNow = () => {
    handleSubmit();
    toast({
      title: 'Campaign Sent',
      description: 'Your campaign is being processed and will be sent shortly',
    });
  };

  const quickQueries = [
    'Bangalore alumni available for mentoring',
    '2020 batch graduates with high engagement',
    'Professors who left in the past 2 years',
    'Alumni who haven\'t been contacted in 6 months',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
          <DialogDescription>
            Compose and send messages to alumni via email or WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Campaign Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateForm('name', e.target.value)}
              placeholder="e.g., January Newsletter, Event Invitation"
            />
          </div>

          {/* AI Query Section */}
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/10 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">AI Campaign Assistant</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={formData.aiQuery}
                onChange={(e) => updateForm('aiQuery', e.target.value)}
                placeholder='Describe who you want to reach, e.g., "Alumni from CS department in Mumbai"'
                className="flex-1 bg-background"
              />
              <Button onClick={handleAIQuery} size="sm">
                <Sparkles className="h-4 w-4 mr-2" />
                Find
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {quickQueries.map((query) => (
                <Badge
                  key={query}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted text-xs"
                  onClick={() => {
                    updateForm('aiQuery', query);
                    setAiContacts(Math.floor(Math.random() * 80) + 20);
                  }}
                >
                  {query}
                </Badge>
              ))}
            </div>
            {aiContacts && (
              <div className="flex items-center gap-2 text-sm text-success">
                <Users className="h-4 w-4" />
                Found {aiContacts} matching contacts
              </div>
            )}
          </div>

          {/* Audience Selection */}
          <div className="space-y-2">
            <Label>Or Select Audience Segment</Label>
            <Select value={formData.audience} onValueChange={(v) => updateForm('audience', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select audience segment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alumni (1,247)</SelectItem>
                <SelectItem value="active">Active Alumni (892)</SelectItem>
                <SelectItem value="professors">Professors (245)</SelectItem>
                <SelectItem value="tas">Teaching Assistants (412)</SelectItem>
                <SelectItem value="bangalore">Bangalore Based (128)</SelectItem>
                <SelectItem value="mentors">Available Mentors (67)</SelectItem>
                <SelectItem value="high-engagement">High Engagement (234)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Message Type Tabs */}
          <Tabs value={messageType} onValueChange={(v) => setMessageType(v as 'email' | 'whatsapp')}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => updateForm('subject', e.target.value)}
                  placeholder="Enter email subject..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Email Content *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => updateForm('message', e.target.value)}
                  placeholder="Write your email content here... You can use {{firstName}}, {{lastName}} for personalization."
                  rows={8}
                />
              </div>
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="message">WhatsApp Message *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => updateForm('message', e.target.value)}
                  placeholder="Write your WhatsApp message here... Keep it concise. You can use {{firstName}} for personalization."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  WhatsApp messages should be under 1000 characters for best delivery rates.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              AI Rewrite
            </Button>
            <Button variant="outline" size="sm">
              Use Template
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSubmit}>
            Save Draft
          </Button>
          <Button onClick={handleSendNow}>Send Now</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
