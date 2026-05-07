import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, Phone, MapPin, Briefcase, Calendar, Edit2, MessageCircle, 
  Linkedin, Clock, TrendingUp, X, Save, User, Trash2, AlertTriangle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Contact } from '@/types/contact';
import { cn } from '@/lib/utils';

interface AlumniDetailDialogProps {
  alumni: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (contact: Contact) => void;
  onRemove?: (contactId: string) => void;
}

export function AlumniDetailDialog({ alumni, open, onOpenChange, onSave, onRemove }: AlumniDetailDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContact, setEditedContact] = useState<Contact | null>(alumni);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (alumni) setEditedContact(alumni);
  }, [alumni]);

  if (!alumni) return null;

  const statusStyles = {
    active: 'status-active',
    inactive: 'status-inactive',
    lead: 'bg-info/10 text-info border-info/20',
    pending: 'status-pending',
  };

  const engagementStyles = {
    high: 'bg-success text-success-foreground',
    medium: 'bg-warning text-warning-foreground',
    low: 'bg-muted text-muted-foreground',
    none: 'bg-destructive/20 text-destructive',
  };

  const handleSave = () => {
    if (editedContact) {
      onSave?.(editedContact);
      setIsEditing(false);
      toast({ title: 'Success', description: 'Contact updated successfully' });
    }
  };

  const updateField = (field: keyof Contact, value: any) => {
    if (editedContact) setEditedContact({ ...editedContact, [field]: value });
  };

  const handleSendEmail = () => {
    onOpenChange(false);
    navigate('/communications', { state: { recipient: alumni.email, type: 'email' } });
  };

  const handleSendWhatsApp = () => {
    onOpenChange(false);
    navigate('/communications', { state: { recipient: alumni.whatsapp || alumni.phone, type: 'whatsapp' } });
  };

  const handleRemove = () => {
    if (alumni) { onRemove?.(alumni.id); setShowDeleteConfirm(false); }
  };

  const displayContact = isEditing ? editedContact! : alumni;
  const initials = `${displayContact.firstName[0]}${displayContact.lastName[0]}`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="flex flex-row items-start justify-between p-6 pb-4 shrink-0">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={displayContact.photo} alt={`${displayContact.firstName} ${displayContact.lastName}`} />
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl">{displayContact.firstName} {displayContact.lastName}</DialogTitle>
                <p className="text-muted-foreground">{displayContact.designation} • {displayContact.department}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={statusStyles[displayContact.status]}>{displayContact.status}</Badge>
                  <Badge className={cn('capitalize', engagementStyles[displayContact.engagementLevel])}>{displayContact.engagementLevel} engagement</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-destructive" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4 mr-2" />Remove
              </Button>
              <Button variant={isEditing ? 'default' : 'outline'} size="sm" onClick={() => {
                if (isEditing) { handleSave(); } else { setEditedContact(alumni); setIsEditing(true); }
              }}>
                {isEditing ? <><Save className="h-4 w-4 mr-2" /> Save</> : <><Edit2 className="h-4 w-4 mr-2" /> Edit</>}
              </Button>
            </div>
          </DialogHeader>

          <div className="flex gap-2 px-6 py-4 border-b shrink-0">
            <Button size="sm" variant="outline" onClick={handleSendEmail}><Mail className="h-4 w-4 mr-2" />Send Email</Button>
            <Button size="sm" variant="outline" onClick={handleSendWhatsApp}><MessageCircle className="h-4 w-4 mr-2" />WhatsApp</Button>
            <Button size="sm" variant="outline"><Phone className="h-4 w-4 mr-2" />Call</Button>
            {displayContact.linkedIn && (
              <Button size="sm" variant="outline" asChild>
                <a href={`https://${displayContact.linkedIn}`} target="_blank" rel="noopener noreferrer"><Linkedin className="h-4 w-4 mr-2" />LinkedIn</a>
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1">
            <Tabs defaultValue="personal" className="p-6">
              <TabsList className="mb-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="professional">Professional</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="engagement">Engagement</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    {isEditing ? <Input value={editedContact?.firstName} onChange={(e) => updateField('firstName', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.firstName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    {isEditing ? <Input value={editedContact?.lastName} onChange={(e) => updateField('lastName', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.lastName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    {isEditing ? (
                      <Select value={editedContact?.gender || ''} onValueChange={(v) => updateField('gender', v)}>
                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : <p className="text-sm p-2 bg-muted/50 rounded capitalize">{displayContact.gender || '-'}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    {isEditing ? <Input type="date" value={editedContact?.dateOfBirth || ''} onChange={(e) => updateField('dateOfBirth', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.dateOfBirth || '-'}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Code</Label>
                    {isEditing ? <Input value={editedContact?.contactCode || ''} onChange={(e) => updateField('contactCode', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.contactCode || '-'}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Rating</Label>
                    {isEditing ? <Input value={editedContact?.rating || ''} onChange={(e) => updateField('rating', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.rating || '-'}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  {isEditing ? <Textarea value={editedContact?.correspondenceAddress || ''} onChange={(e) => updateField('correspondenceAddress', e.target.value)} rows={2} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.correspondenceAddress || '-'}</p>}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    {isEditing ? <Input value={editedContact?.city || ''} onChange={(e) => updateField('city', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.city || '-'}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    {isEditing ? <Input value={editedContact?.state || ''} onChange={(e) => updateField('state', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.state || '-'}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    {isEditing ? <Input value={editedContact?.country || ''} onChange={(e) => updateField('country', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.country || displayContact.currentCountry || '-'}</p>}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="professional" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Designation</Label>
                    {isEditing ? <Input value={editedContact?.designation || ''} onChange={(e) => updateField('designation', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.designation}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    {isEditing ? <Input value={editedContact?.department || ''} onChange={(e) => updateField('department', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.department}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Sub Department</Label>
                    {isEditing ? <Input value={editedContact?.subDepartment || ''} onChange={(e) => updateField('subDepartment', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.subDepartment || '-'}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Type</Label>
                    {isEditing ? (
                      <Select value={editedContact?.type || ''} onValueChange={(v) => updateField('type', v)}>
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
                    ) : <p className="text-sm p-2 bg-muted/50 rounded capitalize">{displayContact.type}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Manager</Label>
                    {isEditing ? <Input value={editedContact?.manager || ''} onChange={(e) => updateField('manager', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.manager || '-'}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>SPOC</Label>
                    {isEditing ? <Input value={editedContact?.spoc || ''} onChange={(e) => updateField('spoc', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.spoc || '-'}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>SPOC User ID</Label>
                    {isEditing ? <Input value={editedContact?.spocUserId || ''} onChange={(e) => updateField('spocUserId', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.spocUserId || '-'}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Entity</Label>
                    {isEditing ? <Input value={editedContact?.entity || ''} onChange={(e) => updateField('entity', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.entity || '-'}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    {isEditing ? (
                      <Select value={editedContact?.status || ''} onValueChange={(v) => updateField('status', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : <p className="text-sm p-2 bg-muted/50 rounded capitalize">{displayContact.status}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    {isEditing ? <Input value={editedContact?.location || ''} onChange={(e) => updateField('location', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.location || '-'}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    {isEditing ? <Input type="date" value={editedContact?.startDate || editedContact?.joinDate || ''} onChange={(e) => updateField('startDate', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.startDate || displayContact.joinDate || '-'}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    {isEditing ? <Input type="date" value={editedContact?.endDate || editedContact?.exitDate || ''} onChange={(e) => updateField('endDate', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.endDate || displayContact.exitDate || '-'}</p>}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    {isEditing ? <Input type="email" value={editedContact?.personalEmailId || editedContact?.email || ''} onChange={(e) => updateField('personalEmailId', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.personalEmailId || displayContact.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile</Label>
                    {isEditing ? <Input value={editedContact?.personalMobileNo || editedContact?.phone || ''} onChange={(e) => updateField('personalMobileNo', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.personalMobileNo || displayContact.phone}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    {isEditing ? <Input value={editedContact?.whatsapp || ''} onChange={(e) => updateField('whatsapp', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.whatsapp || '-'}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn</Label>
                    {isEditing ? <Input value={editedContact?.linkedIn || ''} onChange={(e) => updateField('linkedIn', e.target.value)} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.linkedIn || '-'}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Preferred Contact Method</Label>
                  {isEditing ? (
                    <Select value={editedContact?.preferredContactMethod} onValueChange={(v) => updateField('preferredContactMethod', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : <Badge variant="outline" className="capitalize">{displayContact.preferredContactMethod}</Badge>}
                </div>
              </TabsContent>

              <TabsContent value="engagement" className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold">{displayContact.totalEventsAttended}</p>
                    <p className="text-xs text-muted-foreground">Events Attended</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold">{displayContact.totalEmailsOpened}</p>
                    <p className="text-xs text-muted-foreground">Emails Opened</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold">{displayContact.responseRate}%</p>
                    <p className="text-xs text-muted-foreground">Response Rate</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold">{displayContact.tenure}</p>
                    <p className="text-xs text-muted-foreground">Tenure (years)</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label>Response Rate</Label>
                      <span className="text-sm font-medium">{displayContact.responseRate}%</span>
                    </div>
                    <Progress value={displayContact.responseRate} />
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-3">Availability</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      {isEditing ? <Switch checked={editedContact?.availableForConsulting} onCheckedChange={(v) => updateField('availableForConsulting', v)} /> : <div className={cn('h-2 w-2 rounded-full', displayContact.availableForConsulting ? 'bg-success' : 'bg-muted')} />}
                      <span className="text-sm">Consulting</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? <Switch checked={editedContact?.availableForReferrals} onCheckedChange={(v) => updateField('availableForReferrals', v)} /> : <div className={cn('h-2 w-2 rounded-full', displayContact.availableForReferrals ? 'bg-success' : 'bg-muted')} />}
                      <span className="text-sm">Referrals</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? <Switch checked={editedContact?.availableForEvents} onCheckedChange={(v) => updateField('availableForEvents', v)} /> : <div className={cn('h-2 w-2 rounded-full', displayContact.availableForEvents ? 'bg-success' : 'bg-muted')} />}
                      <span className="text-sm">Events</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  {isEditing ? <Textarea value={editedContact?.notes || ''} onChange={(e) => updateField('notes', e.target.value)} rows={3} /> : <p className="text-sm p-2 bg-muted/50 rounded">{displayContact.notes || 'No notes'}</p>}
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />Remove Contact
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {alumni.firstName} {alumni.lastName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
