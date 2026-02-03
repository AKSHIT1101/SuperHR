import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { AlumniType, AlumniStatus } from '@/types/alumni';

interface AddAlumniDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (alumni: any) => void;
}

export function AddAlumniDialog({ open, onOpenChange, onSave }: AddAlumniDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    // Personal
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    whatsapp: '',
    linkedIn: '',
    // Professional
    type: 'professor' as AlumniType,
    department: '',
    designation: '',
    specialization: '',
    // Employment
    joinDate: '',
    exitDate: '',
    exitReason: '',
    // Current Status
    status: 'active' as AlumniStatus,
    currentOrganization: '',
    currentDesignation: '',
    currentCity: '',
    currentCountry: '',
    // Preferences
    preferredContactMethod: 'email' as 'email' | 'whatsapp' | 'phone',
    availableForMentoring: false,
    availableForHiring: false,
    availableForEvents: true,
    // Notes
    tags: '',
    notes: '',
  });

  const updateForm = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.firstName || !formData.lastName || !formData.email) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in required fields (First Name, Last Name, Email)',
        variant: 'destructive',
      });
      return;
    }

    const alumni = {
      id: crypto.randomUUID(),
      ...formData,
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      yearsOfService: formData.joinDate && formData.exitDate
        ? Math.floor((new Date(formData.exitDate).getTime() - new Date(formData.joinDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
        : 0,
      engagementLevel: 'none' as const,
      totalEventsAttended: 0,
      totalEmailsOpened: 0,
      responseRate: 0,
      interests: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'current_user',
    };

    onSave?.(alumni);
    toast({ title: 'Success', description: 'Alumni record created successfully' });
    onOpenChange(false);
    
    // Reset form
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      whatsapp: '',
      linkedIn: '',
      type: 'professor',
      department: '',
      designation: '',
      specialization: '',
      joinDate: '',
      exitDate: '',
      exitReason: '',
      status: 'active',
      currentOrganization: '',
      currentDesignation: '',
      currentCity: '',
      currentCountry: '',
      preferredContactMethod: 'email',
      availableForMentoring: false,
      availableForHiring: false,
      availableForEvents: true,
      tags: '',
      notes: '',
    });
    setActiveTab('personal');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Alumni</DialogTitle>
          <DialogDescription>
            Enter the details of the ex-employee to add them to the directory.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="professional">Professional</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="current">Current</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => updateForm('firstName', e.target.value)}
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => updateForm('lastName', e.target.value)}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateForm('email', e.target.value)}
                placeholder="alumni@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateForm('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => updateForm('whatsapp', e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedIn">LinkedIn Profile</Label>
              <Input
                id="linkedIn"
                value={formData.linkedIn}
                onChange={(e) => updateForm('linkedIn', e.target.value)}
                placeholder="linkedin.com/in/username"
              />
            </div>
          </TabsContent>

          <TabsContent value="professional" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(v) => updateForm('type', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professor">Professor</SelectItem>
                    <SelectItem value="ta">Teaching Assistant</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="researcher">Researcher</SelectItem>
                    <SelectItem value="administrator">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => updateForm('department', e.target.value)}
                  placeholder="e.g., Computer Science"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) => updateForm('designation', e.target.value)}
                placeholder="e.g., Associate Professor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization</Label>
              <Input
                id="specialization"
                value={formData.specialization}
                onChange={(e) => updateForm('specialization', e.target.value)}
                placeholder="e.g., Machine Learning, AI"
              />
            </div>
          </TabsContent>

          <TabsContent value="employment" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="joinDate">Join Date</Label>
                <Input
                  id="joinDate"
                  type="date"
                  value={formData.joinDate}
                  onChange={(e) => updateForm('joinDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exitDate">Exit Date</Label>
                <Input
                  id="exitDate"
                  type="date"
                  value={formData.exitDate}
                  onChange={(e) => updateForm('exitDate', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="exitReason">Exit Reason</Label>
              <Select value={formData.exitReason} onValueChange={(v) => updateForm('exitReason', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="industry">Industry Opportunity</SelectItem>
                  <SelectItem value="higher-education">Higher Education</SelectItem>
                  <SelectItem value="relocation">Relocation</SelectItem>
                  <SelectItem value="retirement">Retirement</SelectItem>
                  <SelectItem value="personal">Personal Reasons</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Alumni Status</Label>
              <Select value={formData.status} onValueChange={(v) => updateForm('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="rejoined">Rejoined</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="current" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="currentOrganization">Current Organization</Label>
              <Input
                id="currentOrganization"
                value={formData.currentOrganization}
                onChange={(e) => updateForm('currentOrganization', e.target.value)}
                placeholder="e.g., Google Research"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentDesignation">Current Designation</Label>
              <Input
                id="currentDesignation"
                value={formData.currentDesignation}
                onChange={(e) => updateForm('currentDesignation', e.target.value)}
                placeholder="e.g., Senior Research Scientist"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentCity">City</Label>
                <Input
                  id="currentCity"
                  value={formData.currentCity}
                  onChange={(e) => updateForm('currentCity', e.target.value)}
                  placeholder="e.g., Bangalore"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentCountry">Country</Label>
                <Input
                  id="currentCountry"
                  value={formData.currentCountry}
                  onChange={(e) => updateForm('currentCountry', e.target.value)}
                  placeholder="e.g., India"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
              <Select
                value={formData.preferredContactMethod}
                onValueChange={(v) => updateForm('preferredContactMethod', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="phone">Phone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Available for Mentoring</Label>
                  <p className="text-sm text-muted-foreground">Can mentor current students</p>
                </div>
                <Switch
                  checked={formData.availableForMentoring}
                  onCheckedChange={(v) => updateForm('availableForMentoring', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Available for Hiring</Label>
                  <p className="text-sm text-muted-foreground">Open to hiring opportunities</p>
                </div>
                <Switch
                  checked={formData.availableForHiring}
                  onCheckedChange={(v) => updateForm('availableForHiring', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Available for Events</Label>
                  <p className="text-sm text-muted-foreground">Can attend university events</p>
                </div>
                <Switch
                  checked={formData.availableForEvents}
                  onCheckedChange={(v) => updateForm('availableForEvents', v)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => updateForm('tags', e.target.value)}
                placeholder="Comma separated tags (e.g., Mentor, Speaker)"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateForm('notes', e.target.value)}
                placeholder="Any additional notes about this alumni..."
                rows={3}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Alumni</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
