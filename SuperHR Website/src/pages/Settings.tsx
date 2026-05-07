import { useState } from 'react';
import { Save, Mail, Shield, Users, Plus, Trash2, X, GripVertical, Edit2, Lock } from 'lucide-react';
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
import { CustomField, defaultCustomFields } from '@/types/contact';
import { EMAIL_OUTBOUND, WHATSAPP_OUTBOUND } from '@/lib/systemOutbound';
import { apiPost } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { toast } = useToast();
  const { user, isAdmin, refreshFromToken, logout } = useAuth();
  const navigate = useNavigate();

  const [allowedEmails, setAllowedEmails] = useState<string[]>(['arun.k@company.com', 'meera.n@company.com', 'admin@company.com']);
  const [newEmail, setNewEmail] = useState('');

  // Custom fields state
  const [customFields, setCustomFields] = useState<CustomField[]>(defaultCustomFields);
  const [showFieldDialog, setShowFieldDialog] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [fieldForm, setFieldForm] = useState({ name: '', key: '', type: 'text' as CustomField['type'], required: false, section: 'Custom', options: '', placeholder: '', description: '' });

  const handleSave = () => toast({ title: 'Settings Saved', description: 'Your preferences have been updated' });

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

  const sections = [...new Set(customFields.map((f) => f.section))];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Settings</h1><p className="text-muted-foreground">Manage your account and application preferences</p></div><Button onClick={handleSave}><Save className="h-4 w-4 mr-2" />Save Changes</Button></div>

      <Tabs defaultValue="security" className="space-y-6">
        <TabsList>
          {/* <TabsTrigger value="fields" className="gap-2"><GripVertical className="h-4 w-4" /><span className="hidden sm:inline">Custom Fields</span></TabsTrigger>
          {isAdmin && <TabsTrigger value="email" className="gap-2"><Mail className="h-4 w-4" /><span className="hidden sm:inline">Email & WhatsApp</span></TabsTrigger>} */}
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" /><span className="hidden sm:inline">Security</span></TabsTrigger>
          {/* {isAdmin && <TabsTrigger value="access" className="gap-2"><Users className="h-4 w-4" /><span className="hidden sm:inline">Access Control</span></TabsTrigger>} */}
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
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>Outbound email</span>
                    <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </CardTitle>
                  <CardDescription>
                    All outbound email is sent from Super HR&apos;s verified address. Custom sender aliases are disabled for now.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/40 px-3 py-3">
                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{EMAIL_OUTBOUND.label}</p>
                      <p className="text-sm text-muted-foreground truncate">{EMAIL_OUTBOUND.address}</p>
                    </div>
                    <Badge variant="secondary">Managed</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span>WhatsApp messaging</span>
                    <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
                  </CardTitle>
                  <CardDescription>
                    WhatsApp messages are sent through Super HR&apos;s registered Business number only.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/40 px-3 py-3">
                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/10">
                      <span className="text-sm font-medium text-success">WA</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{WHATSAPP_OUTBOUND.label}</p>
                      <p className="text-sm text-muted-foreground truncate">{WHATSAPP_OUTBOUND.address}</p>
                    </div>
                    <Badge variant="secondary">Managed</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        <TabsContent value="security">
          <Card><CardHeader><CardTitle>Security Settings</CardTitle><CardDescription>Manage your account security</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2"><Label>Current User</Label><div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"><div><p className="font-medium">{user?.name || 'User'}</p><p className="text-sm text-muted-foreground">{user?.email}</p></div><Badge className="ml-auto capitalize">{user?.role}</Badge></div></div>
              <div className="space-y-2">
                <Label>Organization</Label>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">
                    Leave your current organization. If you are a non-admin, a new personal organization will be created for you.
                    If you are the admin, leaving will delete the entire organization and all its data.
                  </p>
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        const ok = window.confirm(
                          isAdmin
                            ? 'You are the admin. Leaving will DELETE the entire organization and all its data. Continue?'
                            : 'Leave your organization and create a new personal organization?'
                        );
                        if (!ok) return;
                        try {
                          const resp: any = await apiPost('/auth/leave-org', {});
                          if (resp?.access_token) {
                            localStorage.setItem('crm_token', resp.access_token);
                            await refreshFromToken(resp.access_token);
                            navigate('/schema-setup', { replace: true });
                            toast({ title: 'Left organization' });
                          } else {
                            // Admin deletion path returns only a message, so log out.
                            logout();
                            navigate('/auth', { replace: true });
                            toast({ title: 'Organization deleted' });
                          }
                        } catch (e: any) {
                          toast({ title: 'Failed to leave organization', description: e?.message ?? 'Unknown error', variant: 'destructive' });
                        }
                      }}
                    >
                      Leave organization
                    </Button>
                  </div>
                </div>
              </div>
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
