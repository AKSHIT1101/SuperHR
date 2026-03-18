import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ContactType, ContactStatus } from '@/types/contact';

interface AddAlumniDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (contact: any) => void;
}

export function AddAlumniDialog({ open, onOpenChange, onSave }: AddAlumniDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '', whatsapp: '', linkedIn: '',
    type: 'customer' as ContactType,
    department: '', designation: '', specialization: '',
    joinDate: '', exitDate: '', exitReason: '',
    status: 'active' as ContactStatus,
    currentOrganization: '', currentDesignation: '', currentCity: '', currentCountry: '',
    preferredContactMethod: 'email' as 'email' | 'whatsapp' | 'phone',
    availableForConsulting: false, availableForReferrals: false, availableForEvents: true,
    tags: '', notes: '',
  });

  const updateForm = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({ title: 'Validation Error', description: 'Please fill in required fields (First Name, Last Name, Email)', variant: 'destructive' });
      return;
    }

    const contact = {
      id: crypto.randomUUID(),
      ...formData,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      tenure: formData.joinDate && formData.exitDate
        ? Math.floor((new Date(formData.exitDate).getTime() - new Date(formData.joinDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
        : 0,
      engagementLevel: 'none' as const,
      totalEventsAttended: 0, totalEmailsOpened: 0, responseRate: 0,
      interests: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), createdBy: 'current_user',
    };

    onSave?.(contact);
    toast({ title: 'Success', description: 'Contact created successfully' });
    onOpenChange(false);
    
    setFormData({
      firstName: '', lastName: '', email: '', phone: '', whatsapp: '', linkedIn: '',
      type: 'customer', department: '', designation: '', specialization: '',
      joinDate: '', exitDate: '', exitReason: '',
      status: 'active', currentOrganization: '', currentDesignation: '', currentCity: '', currentCountry: '',
      preferredContactMethod: 'email',
      availableForConsulting: false, availableForReferrals: false, availableForEvents: true,
      tags: '', notes: '',
    });
    setActiveTab('personal');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[88vh] p-0 dialog-shell">
        <DialogHeader className="dialog-header-tight">
          <DialogTitle>Add New Contact</DialogTitle>
          <DialogDescription>Enter the details of the contact to add them to the directory.</DialogDescription>
        </DialogHeader>

        <div className="dialog-body-scroll grid grid-cols-12">
          <div className="dialog-side-panel col-span-3 p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="h-full">
              <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0">
                <TabsTrigger value="personal" className="justify-start">Personal</TabsTrigger>
                <TabsTrigger value="professional" className="justify-start">Professional</TabsTrigger>
                <TabsTrigger value="history" className="justify-start">History</TabsTrigger>
                <TabsTrigger value="current" className="justify-start">Current</TabsTrigger>
                <TabsTrigger value="preferences" className="justify-start">Preferences</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="col-span-9 min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <ScrollArea className="h-full px-6 py-4">
                <TabsContent value="personal" className="mt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input id="firstName" value={formData.firstName} onChange={(e) => updateForm('firstName', e.target.value)} placeholder="Enter first name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input id="lastName" value={formData.lastName} onChange={(e) => updateForm('lastName', e.target.value)} placeholder="Enter last name" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => updateForm('email', e.target.value)} placeholder="contact@example.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" value={formData.phone} onChange={(e) => updateForm('phone', e.target.value)} placeholder="+1 555 123 4567" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <Input id="whatsapp" value={formData.whatsapp} onChange={(e) => updateForm('whatsapp', e.target.value)} placeholder="+1 555 123 4567" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkedIn">LinkedIn Profile</Label>
                    <Input id="linkedIn" value={formData.linkedIn} onChange={(e) => updateForm('linkedIn', e.target.value)} placeholder="linkedin.com/in/username" />
                  </div>
                </TabsContent>

                <TabsContent value="professional" className="mt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Type</Label>
                      <Select value={formData.type} onValueChange={(v) => updateForm('type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="partner">Partner</SelectItem>
                          <SelectItem value="vendor">Vendor</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input id="department" value={formData.department} onChange={(e) => updateForm('department', e.target.value)} placeholder="e.g., Sales, Engineering" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input id="designation" value={formData.designation} onChange={(e) => updateForm('designation', e.target.value)} placeholder="e.g., Senior Manager" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialization">Specialization</Label>
                    <Input id="specialization" value={formData.specialization} onChange={(e) => updateForm('specialization', e.target.value)} placeholder="e.g., Machine Learning, Sales" />
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="joinDate">Start Date</Label>
                      <Input id="joinDate" type="date" value={formData.joinDate} onChange={(e) => updateForm('joinDate', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="exitDate">End Date</Label>
                      <Input id="exitDate" type="date" value={formData.exitDate} onChange={(e) => updateForm('exitDate', e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exitReason">Reason for Leaving</Label>
                    <Select value={formData.exitReason} onValueChange={(v) => updateForm('exitReason', v)}>
                      <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opportunity">New Opportunity</SelectItem>
                        <SelectItem value="relocation">Relocation</SelectItem>
                        <SelectItem value="retirement">Retirement</SelectItem>
                        <SelectItem value="personal">Personal Reasons</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Contact Status</Label>
                    <Select value={formData.status} onValueChange={(v) => updateForm('status', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="current" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label>Current Organization</Label>
                    <Input value={formData.currentOrganization} onChange={(e) => updateForm('currentOrganization', e.target.value)} placeholder="e.g., Acme Corp" />
                  </div>
                  <div className="space-y-2">
                    <Label>Current Designation</Label>
                    <Input value={formData.currentDesignation} onChange={(e) => updateForm('currentDesignation', e.target.value)} placeholder="e.g., VP of Sales" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input value={formData.currentCity} onChange={(e) => updateForm('currentCity', e.target.value)} placeholder="e.g., New York" />
                    </div>
                    <div className="space-y-2">
                      <Label>Country</Label>
                      <Input value={formData.currentCountry} onChange={(e) => updateForm('currentCountry', e.target.value)} placeholder="e.g., USA" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="preferences" className="mt-0 space-y-4 pb-4">
                  <div className="space-y-2">
                    <Label>Preferred Contact Method</Label>
                    <Select value={formData.preferredContactMethod} onValueChange={(v) => updateForm('preferredContactMethod', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div><Label>Available for Consulting</Label><p className="text-sm text-muted-foreground">Open to consulting opportunities</p></div>
                      <Switch checked={formData.availableForConsulting} onCheckedChange={(v) => updateForm('availableForConsulting', v)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div><Label>Available for Referrals</Label><p className="text-sm text-muted-foreground">Open to referral opportunities</p></div>
                      <Switch checked={formData.availableForReferrals} onCheckedChange={(v) => updateForm('availableForReferrals', v)} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div><Label>Available for Events</Label><p className="text-sm text-muted-foreground">Can attend events</p></div>
                      <Switch checked={formData.availableForEvents} onCheckedChange={(v) => updateForm('availableForEvents', v)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input id="tags" value={formData.tags} onChange={(e) => updateForm('tags', e.target.value)} placeholder="Comma separated tags (e.g., VIP, Speaker)" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" value={formData.notes} onChange={(e) => updateForm('notes', e.target.value)} placeholder="Any additional notes..." rows={3} />
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>

        <div className="dialog-footer-bar flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Save Contact</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
