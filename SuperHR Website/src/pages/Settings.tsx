import { useState } from 'react';
import { Save, Mail, Shield, Users, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { SenderConfig } from '@/types/alumni';

export default function Settings() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();

  const [senders, setSenders] = useState<SenderConfig[]>([
    { id: '1', type: 'email', name: 'Alumni Relations', address: 'alumni@university.edu', isDefault: true },
    { id: '2', type: 'email', name: 'HR Team', address: 'hr@university.edu', isDefault: false },
    { id: '3', type: 'whatsapp', name: 'Main WhatsApp', address: '+91 98765 43210', isDefault: true },
  ]);

  const [allowedEmails, setAllowedEmails] = useState<string[]>([
    'arun.k@university.edu',
    'meera.n@university.edu',
    'admin@university.edu',
  ]);

  const [newSender, setNewSender] = useState({ name: '', address: '', type: 'email' as 'email' | 'whatsapp' });
  const [newEmail, setNewEmail] = useState('');

  const handleSave = () => {
    toast({ title: 'Settings Saved', description: 'Your preferences have been updated' });
  };

  const handleAddSender = () => {
    if (!newSender.name || !newSender.address) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    const sender: SenderConfig = {
      id: crypto.randomUUID(),
      ...newSender,
      isDefault: senders.filter((s) => s.type === newSender.type).length === 0,
    };
    setSenders((prev) => [...prev, sender]);
    setNewSender({ name: '', address: '', type: 'email' });
    toast({ title: 'Success', description: 'Sender added successfully' });
  };

  const handleRemoveSender = (id: string) => {
    setSenders((prev) => prev.filter((s) => s.id !== id));
    toast({ title: 'Success', description: 'Sender removed' });
  };

  const handleSetDefaultSender = (id: string, type: 'email' | 'whatsapp') => {
    setSenders((prev) =>
      prev.map((s) => ({
        ...s,
        isDefault: s.type === type ? s.id === id : s.isDefault,
      }))
    );
  };

  const handleAddAllowedEmail = () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast({ title: 'Error', description: 'Please enter a valid email', variant: 'destructive' });
      return;
    }
    if (allowedEmails.includes(newEmail)) {
      toast({ title: 'Error', description: 'Email already in list', variant: 'destructive' });
      return;
    }
    setAllowedEmails((prev) => [...prev, newEmail]);
    setNewEmail('');
    toast({ title: 'Success', description: 'Email added to allowed list' });
  };

  const handleRemoveAllowedEmail = (email: string) => {
    setAllowedEmails((prev) => prev.filter((e) => e !== email));
    toast({ title: 'Success', description: 'Email removed from allowed list' });
  };

  const emailSenders = senders.filter((s) => s.type === 'email');
  const whatsappSenders = senders.filter((s) => s.type === 'whatsapp');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and application preferences
          </p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue={isAdmin ? 'email' : 'security'} className="space-y-6">
        <TabsList>
          {isAdmin && (
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email & WhatsApp</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="access" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Access Control</span>
            </TabsTrigger>
          )}
        </TabsList>

        {isAdmin && (
          <TabsContent value="email">
            <div className="space-y-6">
              {/* Email Senders */}
              <Card>
                <CardHeader>
                  <CardTitle>Email Senders</CardTitle>
                  <CardDescription>
                    Configure email addresses that can be used to send communications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {emailSenders.map((sender) => (
                    <div key={sender.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{sender.name}</p>
                          <p className="text-sm text-muted-foreground">{sender.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {sender.isDefault ? (
                          <Badge>Default</Badge>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handleSetDefaultSender(sender.id, 'email')}>
                            Set Default
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveSender(sender.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-4 border-t">
                    <Input
                      placeholder="Sender Name"
                      value={newSender.type === 'email' ? newSender.name : ''}
                      onChange={(e) => setNewSender({ ...newSender, name: e.target.value, type: 'email' })}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Email Address"
                      type="email"
                      value={newSender.type === 'email' ? newSender.address : ''}
                      onChange={(e) => setNewSender({ ...newSender, address: e.target.value, type: 'email' })}
                      className="flex-1"
                    />
                    <Button onClick={() => { setNewSender({ ...newSender, type: 'email' }); handleAddSender(); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* WhatsApp Numbers */}
              <Card>
                <CardHeader>
                  <CardTitle>WhatsApp Numbers</CardTitle>
                  <CardDescription>
                    Configure WhatsApp numbers for sending messages
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {whatsappSenders.map((sender) => (
                    <div key={sender.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                          <span className="text-success text-sm">WA</span>
                        </div>
                        <div>
                          <p className="font-medium">{sender.name}</p>
                          <p className="text-sm text-muted-foreground">{sender.address}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {sender.isDefault ? (
                          <Badge>Default</Badge>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handleSetDefaultSender(sender.id, 'whatsapp')}>
                            Set Default
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveSender(sender.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-4 border-t">
                    <Input
                      placeholder="Display Name"
                      value={newSender.type === 'whatsapp' ? newSender.name : ''}
                      onChange={(e) => setNewSender({ ...newSender, name: e.target.value, type: 'whatsapp' })}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Phone Number"
                      value={newSender.type === 'whatsapp' ? newSender.address : ''}
                      onChange={(e) => setNewSender({ ...newSender, address: e.target.value, type: 'whatsapp' })}
                      className="flex-1"
                    />
                    <Button onClick={() => { setNewSender({ ...newSender, type: 'whatsapp' }); handleAddSender(); }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your account security
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Current User</Label>
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <div>
                    <p className="font-medium">{user?.name || 'User'}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                  <Badge className="ml-auto capitalize">{user?.role}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Change Password</Label>
                <div className="space-y-3">
                  <Input type="password" placeholder="Current password" />
                  <Input type="password" placeholder="New password" />
                  <Input type="password" placeholder="Confirm new password" />
                  <Button variant="outline">Update Password</Button>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-4">Connected Accounts</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        </svg>
                      </div>
                      <span>Google</span>
                    </div>
                    <Button variant="outline" size="sm">Connect</Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                          <path fill="#f25022" d="M1 1h10v10H1z" />
                          <path fill="#00a4ef" d="M1 13h10v10H1z" />
                          <path fill="#7fba00" d="M13 1h10v10H13z" />
                          <path fill="#ffb900" d="M13 13h10v10H13z" />
                        </svg>
                      </div>
                      <span>Microsoft</span>
                    </div>
                    <Button variant="outline" size="sm">Connect</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="access">
            <Card>
              <CardHeader>
                <CardTitle>Access Control</CardTitle>
                <CardDescription>
                  Manage which email addresses are allowed to sign in to this portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {allowedEmails.map((email) => (
                    <div key={email} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{email}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleRemoveAllowedEmail(email)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Input
                    placeholder="Email address"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleAddAllowedEmail}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Email
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
