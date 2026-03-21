import { useEffect, useMemo, useState } from 'react';
import { Plus, UserCog, Shield, Mail, Calendar, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { User } from '@/types/contact';
import { cn } from '@/lib/utils';
import { apiGet, apiPatch, apiPost } from '@/lib/api';

export default function UsersRoles() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'user' as 'manager' | 'user', department: '' });

  const roleStyles = { admin: 'bg-destructive/10 text-destructive border-destructive/20', manager: 'bg-primary/10 text-primary border-primary/20', user: 'bg-muted text-muted-foreground' };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const rows = await apiGet<any[]>('/users');
      const mapped: User[] = (rows || []).map((u: any) => ({
        id: String(u.user_id),
        name:
          (u.first_name || u.last_name)
            ? `${u.first_name || ''} ${u.last_name || ''}`.trim()
            : u.email,
        email: u.email,
        role: (u.role || 'user') as User['role'],
        department: u.department || '',
        avatar: undefined,
        permissions:
          u.role === 'admin'
            ? ['read', 'write', 'send-communications']
            : u.role === 'manager'
            ? ['read', 'write']
            : ['read'],
        lastActive: u.updated_at || u.created_at || new Date().toISOString(),
      }));
      setUsers(mapped);
    } catch (e: any) {
      toast({ title: 'Failed to load users', description: e?.message ?? 'Unknown error', variant: 'destructive' });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddUser = () => {
    if (!newUser.email) {
      toast({ title: 'Error', description: 'Please fill in email', variant: 'destructive' });
      return;
    }

    // Backend invite flow: admin invites email + role; user joins by signing in with Google.
    apiPost('/auth/invite', { email: newUser.email, role: newUser.role })
      .then((resp: any) => {
        const inviteToken = resp?.invite_token;
        toast({
          title: 'Invite created',
          description: inviteToken ? `Invite token: ${inviteToken}` : 'Invite created successfully.',
        });
        setShowAddDialog(false);
        setNewUser({ name: '', email: '', role: 'user', department: '' });
      })
      .catch((e: any) => toast({ title: 'Failed to invite user', description: e?.message ?? 'Unknown error', variant: 'destructive' }));
  };

  const handleDeleteUser = (id: string) => {
    apiPatch(`/users/${id}/deactivate`, {})
      .then(() => {
        toast({ title: 'User deactivated' });
        return fetchUsers();
      })
      .catch((e: any) => toast({ title: 'Failed to deactivate user', description: e?.message ?? 'Unknown error', variant: 'destructive' }));
  };

  const handleChangeRole = (id: string, newRole: 'manager' | 'user') => {
    apiPatch(`/users/${id}/role`, { role: newRole })
      .then(() => {
        toast({ title: 'Role Updated' });
        return fetchUsers();
      })
      .catch((e: any) => toast({ title: 'Failed to update role', description: e?.message ?? 'Unknown error', variant: 'destructive' }));
  };

  const counts = useMemo(() => ({
    admins: users.filter((u) => u.role === 'admin').length,
    managers: users.filter((u) => u.role === 'manager').length,
    regular: users.filter((u) => u.role === 'user').length,
  }), [users]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Users & Roles</h1><p className="text-muted-foreground">Manage team members and permissions</p></div><Button onClick={() => setShowAddDialog(true)}><Plus className="h-4 w-4 mr-2" />Add User</Button></div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">Administrators</CardTitle><Shield className="h-4 w-4 text-destructive" /></div></CardHeader><CardContent><div className="text-2xl font-bold">{counts.admins}</div><p className="text-xs text-muted-foreground">Full system access</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">Managers</CardTitle><UserCog className="h-4 w-4 text-primary" /></div></CardHeader><CardContent><div className="text-2xl font-bold">{counts.managers}</div><p className="text-xs text-muted-foreground">Can send communications</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-sm font-medium">Users</CardTitle><Mail className="h-4 w-4 text-muted-foreground" /></div></CardHeader><CardContent><div className="text-2xl font-bold">{counts.regular}</div><p className="text-xs text-muted-foreground">Read-only access</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Team Members</CardTitle><CardDescription>All users with access to the CRM platform</CardDescription></CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">Loading users…</div>
          ) : (
          <Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Department</TableHead><TableHead>Last Active</TableHead><TableHead>Permissions</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
            <TableBody>{users.map((user) => (
              <TableRow key={user.id}>
                <TableCell><div className="flex items-center gap-3"><Avatar className="h-8 w-8"><AvatarImage src={user.avatar} /><AvatarFallback>{user.name.split(' ').map((n) => n[0]).join('')}</AvatarFallback></Avatar><div><p className="font-medium">{user.name}</p><p className="text-sm text-muted-foreground">{user.email}</p></div></div></TableCell>
                <TableCell>
                  <Select
                    value={user.role}
                    onValueChange={(v) => handleChangeRole(user.id, v as any)}
                    disabled={user.role === 'admin'}
                  >
                    <SelectTrigger className="w-[120px]">
                      <Badge variant="outline" className={cn('capitalize', roleStyles[user.role])}>{user.role}</Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{user.department || '-'}</TableCell>
                <TableCell><div className="flex items-center gap-1 text-sm text-muted-foreground"><Calendar className="h-3 w-3" />{new Date(user.lastActive).toLocaleDateString()}</div></TableCell>
                <TableCell><div className="flex flex-wrap gap-1">{user.permissions.slice(0, 2).map((p) => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}{user.permissions.length > 2 && <Badge variant="secondary" className="text-xs">+{user.permissions.length - 2}</Badge>}</div></TableCell>
                <TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Edit2 className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(user.id)}><Trash2 className="h-4 w-4 mr-2" />Remove</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell>
              </TableRow>
            ))}</TableBody></Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent><DialogHeader><DialogTitle>Add New User</DialogTitle><DialogDescription>Invite a new team member to the CRM platform.</DialogDescription></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2"><Label>Full Name *</Label><Input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Enter full name" /></div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="user@company.com" /></div>
            <div className="space-y-2"><Label>Role</Label><Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v as any })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manager">Manager</SelectItem><SelectItem value="user">User</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Department</Label><Input value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} placeholder="e.g., Sales, Marketing" /></div>
          </div>
          <div className="flex justify-end gap-3 mt-6"><Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button><Button onClick={handleAddUser}>Add User</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
