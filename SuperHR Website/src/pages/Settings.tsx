import { useState } from 'react';
import { Save, Mail, Shield, Users, Plus, Trash2, X, GripVertical, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { SenderConfig, CustomField, defaultCustomFields } from '@/types/contact';

export default function Settings() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const [senders, setSenders] = useState<SenderConfig[]>([
    { id: '1', type: 'email', name: 'CRM Team', address: 'crm@company.com', isDefault: true },
    { id: '2', type: 'email', name: 'Sales Team', address: 'sales@company.com', isDefault: false },
    { id: '3', type: 'whatsapp', name: 'Main WhatsApp', address: '+1 555 123 4567', isDefault: true },
  ]);

  const [allowedEmails, setAllowedEmails] = useState<string[]>(['arun.k@company.com', 'meera.n@company.com', 'admin@company.com']);
  const [newSender, setNewSender] = useState({ name: '', address: '', type: 'email' as 'email' | 'whatsapp' });
  const [newEmail, setNewEmail] = useState('');

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>(defaultCustomFields);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [fieldForm, setFieldForm] = useState({ name: '', key: '', type: 'text' as CustomField['type'], required: false, section: 'Custom', options: '', placeholder: '', description: '' });

  const handleSave = () => toast({ title: 'Settings Saved', description: 'Your preferences have been updated' });

  const handleAddSender = () => {
    if (!newSender.name || !newSender.address) { toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' }); return; }
    setSenders((prev) => [...prev, { id: crypto.randomUUID(), ...newSender, isDefault: prev.filter((s) => s.type === newSender.type).length === 0 }]);
    setNewSender({ name: '', address: '', type: 'email' }); toast({ title: 'Sender added' });
  };
  const handleRemoveSender = (id: string) => { setSenders((prev) => prev.filter((s) => s.id !== id)); };
  const handleSetDefaultSender = (id: string, type: 'email' | 'whatsapp') => { setSenders((prev) => prev.map((s) => ({ ...s, isDefault: s.type === type ? s.id === id : s.isDefault }))); };

  const handleAddAllowedEmail = () => {
    if (!newEmail || !newEmail.includes('@')) { toast({ title: 'Error', description: 'Please enter a valid email', variant: 'destructive' }); return; }
    if (allowedEmails.includes(newEmail)) { toast({ title: 'Error', description: 'Email already in list', variant: 'destructive' }); return; }
    setAllowedEmails((prev) => [...prev, newEmail]); setNewEmail(''); toast({ title: 'Email added' });
  };
  const handleRemoveAllowedEmail = (email: string) => setAllowedEmails((prev) => prev.filter((e) => e !== email));

  // Custom field handlers
  const resetFieldForm = () => { setFieldForm({ name: '', key: '', type: 'text', required: false, section: 'Custom', options: '', placeholder: '', description: '' }); setEditingField(null); };

  const handleSaveField = () => {
    if (!fieldForm.name) { toast({ title: 'Error', description: 'Field name is required', variant: 'destructive' }); return; }
    const key = fieldForm.key || fieldForm.name.toLowerCase().replace(/\s+/g, '_');
    if (editingField) {
      setCustomFields((prev) => prev.map((f) => f.id === editingField.id ? { ...f, name: fieldForm.name, key, type: fieldForm.type, required: fieldForm.required, section: fieldForm.section, options: fieldForm.type === 'select' || fieldForm.type === 'multiselect' ? fieldForm.options.split(',').map((o) => o.trim()).filter(Boolean) : undefined, placeholder: fieldForm.placeholder || undefined, description: fieldForm.description || undefined } : f));
      toast({ title: 'Field updated' });
    } else {
      const newField: CustomField = { id: crypto.randomUUID(), name: fieldForm.name, key, type: fieldForm.type, required: fieldForm.required, section: fieldForm.section, order: customFields.length + 1, options: fieldForm.type === 'select' || fieldForm.type === 'multiselect' ? fieldForm.options.split(',').map((o) => o.trim()).filter(Boolean) : undefined, placeholder: fieldForm.placeholder || undefined, description: fieldForm.description || undefined };
      setCustomFields((prev) => [...prev, newField]);
      toast({ title: 'Field added' });
    }
    setShowFieldDialog(false); resetFieldForm();
  };

  const handleEditField = (field: CustomField) => {
    setEditingField(field);
    setFieldForm({ name: field.name, key: field.key, type: field.type, required: field.required, section: field.section, options: field.options?.join(', ') || '', placeholder: field.placeholder || '', description: field.description || '' });
    setShowFieldDialog(true);
  };

  const handleDeleteField = (id: string) => { setCustomFields((prev) => prev.filter((f) => f.id !== id)); toast({ title: 'Field removed' }); };

  const emailSenders = senders.filter((s) => s.type === 'email');
  const whatsappSenders = senders.filter((s) => s.type === 'whatsapp');
  const sections = [...new Set(customFields.map((f) => f.section))];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Settings</h1><p className="text-muted-foreground">Manage your account and application preferences</p></div><Button onClick={handleSave}><Save className="h-4 w-4 mr-2" />Save Changes</Button></div>

      <Tabs defaultValue="fields" className="space-y-6">
        <TabsList>
          <TabsTrigger value="fields" className="gap-2"><GripVertical className="h-4 w-4" /><span className="hidden sm:inline">Custom Fields</span></TabsTrigger>
          {isAdmin && <TabsTrigger value="email" className="gap-2"><Mail className="h-4 w-4" /><span className="hidden sm:inline">Email & WhatsApp</span></TabsTrigger>}
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /><span className="hidden sm:inline">Security</span></TabsTrigger>
          {isAdmin && <TabsTrigger value="access" className="gap-2"><Users className="h-4 w-4" /><span className="hidden sm:inline">Access Control</span></TabsTrigger>}
        </TabsList>

        <TabsContent value="fields">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>Contact Fields Configuration</CardTitle><CardDescription>Customize which fields appear on contact records. Add, edit, or remove fields to match your use case.</CardDescription></div>
                <Button onClick={() => { resetFieldForm(); setShowFieldDialog(true); }}><Plus className="h-4 w-4 mr-2" />Add Field</Button>
              </div>
            </CardHeader>
            <CardContent>
              {sections.map((section) => (
                <div key={section} className="mb-6">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">{section}</h3>
                  <div className="space-y-2">
                    {customFields.filter((f) => f.section === section).map((field) => (
                      <div key={field.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2"><p className="font-medium text-sm">{field.name}</p>{field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}</div>
                            <p className="text-xs text-muted-foreground">Key: {field.key} • Type: {field.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs capitalize">{field.type}</Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditField(field)}><Edit2 className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteField(field.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="email">
            <div className="space-y-6">
              <Card><CardHeader><CardTitle>Email Senders</CardTitle><CardDescription>Configure email addresses for communications</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {emailSenders.map((sender) => (
                    <div key={sender.id} className="flex items-center justify-between p-3 rounded-lg border"><div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><div><p className="font-medium">{sender.name}</p><p className="text-sm text-muted-foreground">{sender.address}</p></div></div><div className="flex items-center gap-2">{sender.isDefault ? <Badge>Default</Badge> : <Button variant="outline" size="sm" onClick={() => handleSetDefaultSender(sender.id, 'email')}>Set Default</Button>}<Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveSender(sender.id)}><Trash2 className="h-4 w-4" /></Button></div></div>
                  ))}
                  <div className="flex gap-2 pt-4 border-t"><Input placeholder="Sender Name" value={newSender.type === 'email' ? newSender.name : ''} onChange={(e) => setNewSender({ ...newSender, name: e.target.value, type: 'email' })} className="flex-1" /><Input placeholder="Email Address" type="email" value={newSender.type === 'email' ? newSender.address : ''} onChange={(e) => setNewSender({ ...newSender, address: e.target.value, type: 'email' })} className="flex-1" /><Button onClick={() => { setNewSender({ ...newSender, type: 'email' }); handleAddSender(); }}><Plus className="h-4 w-4 mr-2" />Add</Button></div>
                </CardContent>
              </Card>
              <Card><CardHeader><CardTitle>WhatsApp Numbers</CardTitle><CardDescription>Configure WhatsApp numbers for messaging</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {whatsappSenders.map((sender) => (
                    <div key={sender.id} className="flex items-center justify-between p-3 rounded-lg border"><div className="flex items-center gap-3"><div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center"><span className="text-success text-sm">WA</span></div><div><p className="font-medium">{sender.name}</p><p className="text-sm text-muted-foreground">{sender.address}</p></div></div><div className="flex items-center gap-2">{sender.isDefault ? <Badge>Default</Badge> : <Button variant="outline" size="sm" onClick={() => handleSetDefaultSender(sender.id, 'whatsapp')}>Set Default</Button>}<Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveSender(sender.id)}><Trash2 className="h-4 w-4" /></Button></div></div>
                  ))}
                  <div className="flex gap-2 pt-4 border-t"><Input placeholder="Display Name" value={newSender.type === 'whatsapp' ? newSender.name : ''} onChange={(e) => setNewSender({ ...newSender, name: e.target.value, type: 'whatsapp' })} className="flex-1" /><Input placeholder="Phone Number" value={newSender.type === 'whatsapp' ? newSender.address : ''} onChange={(e) => setNewSender({ ...newSender, address: e.target.value, type: 'whatsapp' })} className="flex-1" /><Button onClick={() => { setNewSender({ ...newSender, type: 'whatsapp' }); handleAddSender(); }}><Plus className="h-4 w-4 mr-2" />Add</Button></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        <TabsContent value="security">
          <Card><CardHeader><CardTitle>Security Settings</CardTitle><CardDescription>Manage your account security</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2"><Label>Current User</Label><div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"><div><p className="font-medium">{user?.name || 'User'}</p><p className="text-sm text-muted-foreground">{user?.email}</p></div><Badge className="ml-auto capitalize">{user?.role}</Badge></div></div>
              <div className="space-y-2"><Label>Change Password</Label><div className="space-y-3"><Input type="password" placeholder="Current password" /><Input type="password" placeholder="New password" /><Input type="password" placeholder="Confirm new password" /><Button variant="outline">Update Password</Button></div></div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="access">
            <Card><CardHeader><CardTitle>Access Control</CardTitle><CardDescription>Manage which email addresses can sign in</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {allowedEmails.map((email) => (
                  <div key={email} className="flex items-center justify-between p-3 rounded-lg border"><div className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" /><span>{email}</span></div><Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveAllowedEmail(email)}><X className="h-4 w-4" /></Button></div>
                ))}
                <div className="flex gap-2 pt-4 border-t"><Input placeholder="Email address" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="flex-1" /><Button onClick={handleAddAllowedEmail}><Plus className="h-4 w-4 mr-2" />Add Email</Button></div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add/Edit Field Dialog */}
      <Dialog open={showFieldDialog} onOpenChange={(open) => { if (!open) resetFieldForm(); setShowFieldDialog(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingField ? 'Edit' : 'Add'} Custom Field</DialogTitle><DialogDescription>Configure a field for your contact records</DialogDescription></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2"><Label>Field Name *</Label><Input value={fieldForm.name} onChange={(e) => setFieldForm((prev) => ({ ...prev, name: e.target.value, key: prev.key || e.target.value.toLowerCase().replace(/\s+/g, '_') }))} placeholder="e.g., Lead Score" /></div>
            <div className="space-y-2"><Label>Field Key</Label><Input value={fieldForm.key} onChange={(e) => setFieldForm((prev) => ({ ...prev, key: e.target.value }))} placeholder="e.g., lead_score" /><p className="text-xs text-muted-foreground">Unique identifier for this field</p></div>
            <div className="space-y-2"><Label>Field Type</Label><Select value={fieldForm.type} onValueChange={(v) => setFieldForm((prev) => ({ ...prev, type: v as CustomField['type'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">Text</SelectItem><SelectItem value="number">Number</SelectItem><SelectItem value="date">Date</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="phone">Phone</SelectItem><SelectItem value="url">URL</SelectItem><SelectItem value="textarea">Text Area</SelectItem><SelectItem value="boolean">Yes/No Toggle</SelectItem><SelectItem value="select">Dropdown (Single)</SelectItem><SelectItem value="multiselect">Dropdown (Multi)</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Section</Label><Input value={fieldForm.section} onChange={(e) => setFieldForm((prev) => ({ ...prev, section: e.target.value }))} placeholder="e.g., Custom, Sales, Marketing" /></div>
            {(fieldForm.type === 'select' || fieldForm.type === 'multiselect') && (
              <div className="space-y-2"><Label>Options (comma separated)</Label><Input value={fieldForm.options} onChange={(e) => setFieldForm((prev) => ({ ...prev, options: e.target.value }))} placeholder="Option 1, Option 2, Option 3" /></div>
            )}
            <div className="space-y-2"><Label>Placeholder</Label><Input value={fieldForm.placeholder} onChange={(e) => setFieldForm((prev) => ({ ...prev, placeholder: e.target.value }))} placeholder="Placeholder text..." /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={fieldForm.description} onChange={(e) => setFieldForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Help text for this field..." /></div>
            <div className="flex items-center justify-between"><div><Label>Required Field</Label><p className="text-sm text-muted-foreground">Make this field mandatory</p></div><Switch checked={fieldForm.required} onCheckedChange={(v) => setFieldForm((prev) => ({ ...prev, required: v }))} /></div>
            <div className="flex justify-end gap-3 pt-4 border-t"><Button variant="outline" onClick={() => { resetFieldForm(); setShowFieldDialog(false); }}>Cancel</Button><Button onClick={handleSaveField}>{editingField ? 'Update' : 'Add'} Field</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
