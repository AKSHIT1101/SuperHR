import { useEffect, useState } from 'react';
import { Plus, Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Contact } from '@/types/contact';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

export default function ContactsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ field_name: string; op: string; value: string }[]>([]);
  const [availableFields, setAvailableFields] = useState<{ field_name: string; display_name: string; core?: boolean }[]>([]);
  const [searchText, setSearchText] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('crm_token');
        const res = await fetch(`${API_BASE_URL}/contacts`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) {
          throw new Error('Failed to load contacts');
        }
        const data = await res.json();
        const mapped: Contact[] = (data.contacts || []).map((c: any) => ({
          id: String(c.contact_id),
          name: `${c.first_name} ${c.last_name}`,
          email: c.email,
          role: 'user',
          permissions: ['read'],
          lastActive: c.created_at || new Date().toISOString(),
        }));
        setContacts(mapped);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load contacts');
      } finally {
        setLoading(false);
      }
    };

    const fetchFilters = async () => {
      try {
        const token = localStorage.getItem('crm_token');
        const res = await fetch(`${API_BASE_URL}/contacts/filters`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        const core = (data.core_fields || []).map((f: any) => ({
          field_name: f.field_name,
          display_name: f.display_name,
          core: true,
        }));
        const custom = (data.custom_fields || []).map((f: any) => ({
          field_name: f.field_name,
          display_name: f.display_name,
          core: false,
        }));
        setAvailableFields([...core, ...custom]);
      } catch {
        // ignore
      }
    };

    fetchContacts();
    fetchFilters();
  }, []);

  const applyFilters = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('crm_token');
      const payloadFilters = [...filters];
      if (searchText.trim()) {
        payloadFilters.push({
          field_name: 'email',
          op: 'contains',
          value: searchText.trim(),
        });
      }
      const res = await fetch(`${API_BASE_URL}/contacts/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payloadFilters),
      });
      if (!res.ok) {
        throw new Error('Failed to search contacts');
      }
      const data = await res.json();
      const mapped: Contact[] = (data.contacts || []).map((c: any) => ({
        id: String(c.contact_id),
        name: `${c.first_name} ${c.last_name}`,
        email: c.email,
        role: 'user',
        permissions: ['read'],
        lastActive: c.created_at || new Date().toISOString(),
      }));
      setContacts(mapped);
    } catch (e: any) {
      setError(e.message ?? 'Failed to search contacts');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = async () => {
    setFilters([]);
    setSearchText('');
    // Reload base list
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_BASE_URL}/contacts`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      const mapped: Contact[] = (data.contacts || []).map((c: any) => ({
        id: String(c.contact_id),
        name: `${c.first_name} ${c.last_name}`,
        email: c.email,
        role: 'user',
        permissions: ['read'],
        lastActive: c.created_at || new Date().toISOString(),
      }));
      setContacts(mapped);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">
            Manage and connect with {contacts.length} contacts
            {user ? ` in ${user.name}'s organisation` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Upload className="h-4 w-4 mr-2" />Import</Button>
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Add Contact
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 items-start">
        <Input
          placeholder="Search by email..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="md:max-w-xs"
        />
        <div className="flex-1 space-y-2">
          {filters.map((f, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <select
                className="border rounded px-2 py-1 text-sm"
                value={f.field_name}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilters((prev) => prev.map((pf, i) => (i === idx ? { ...pf, field_name: v } : pf)));
                }}
              >
                <option value="">Field</option>
                {availableFields.map((af) => (
                  <option key={af.field_name} value={af.field_name}>
                    {af.display_name}
                  </option>
                ))}
              </select>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={f.op}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilters((prev) => prev.map((pf, i) => (i === idx ? { ...pf, op: v } : pf)));
                }}
              >
                <option value="eq">Equals</option>
                <option value="contains">Contains</option>
              </select>
              <Input
                placeholder="Value"
                value={f.value}
                onChange={(e) => {
                  const v = e.target.value;
                  setFilters((prev) => prev.map((pf, i) => (i === idx ? { ...pf, value: v } : pf)));
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFilters((prev) => prev.filter((_, i) => i !== idx))}
              >
                ×
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters((prev) => [...prev, { field_name: '', op: 'eq', value: '' }])}
          >
            + Add filter
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Clear
          </Button>
          <Button size="sm" onClick={applyFilters}>
            Apply
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {error && !loading && (
        <p className="text-sm text-destructive">Error: {error}</p>
      )}

      {!loading && contacts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="font-semibold">No contacts found</h3>
          <p className="text-muted-foreground mt-1">Start by importing or creating contacts.</p>
        </div>
      )}

      {!loading && contacts.length > 0 && (
        <div className="border rounded-lg divide-y">
          <div className="grid grid-cols-4 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground">
            <span>Name</span>
            <span>Email</span>
            <span>Created at</span>
            <span>Actions</span>
          </div>
          {contacts.map((c) => (
            <div key={c.id} className="grid grid-cols-4 gap-2 px-4 py-2 text-sm items-center">
              <span className="truncate">{c.name}</span>
              <span className="truncate">{c.email}</span>
              <span className="truncate">
                {c.lastActive ? new Date(c.lastActive).toLocaleDateString() : '-'}
              </span>
              <div className="flex gap-2 justify-end">
                <Button size="xs" variant="outline" disabled>
                  View
                </Button>
                <Button size="xs" variant="ghost" className="text-destructive" disabled>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            <div className="flex gap-2">
              <Input
                placeholder="First name"
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
              />
              <Input
                placeholder="Last name"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
              />
            </div>
            <Input
              placeholder="Email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <Input
              placeholder="Phone"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />

            {/* Custom fields from schema */}
            {availableFields.filter((f) => !f.core).length > 0 && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground">Custom fields</p>
                {availableFields
                  .filter((f) => !f.core)
                  .map((field) => (
                    <div key={field.field_name}>
                      <label className="block text-xs text-muted-foreground mb-1">
                        {field.display_name}
                      </label>
                      <Input
                        placeholder={field.display_name}
                        onChange={(e) => {
                          const v = e.target.value;
                          // Store custom field values in a temporary map on window to keep state simple here
                          (window as any).__newContactCustom =
                            (window as any).__newContactCustom || {};
                          (window as any).__newContactCustom[field.field_name] = v;
                        }}
                      />
                    </div>
                  ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                try {
                  const token = localStorage.getItem('crm_token');
                  const res = await fetch(`${API_BASE_URL}/contacts`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                    body: JSON.stringify({
                      first_name: newFirstName,
                      last_name: newLastName,
                      email: newEmail || null,
                      phone: newPhone || null,
                      attributes: (window as any).__newContactCustom || {},
                    }),
                  });
                  if (!res.ok) {
                    throw new Error('Failed to create contact');
                  }
                  setNewFirstName('');
                  setNewLastName('');
                  setNewEmail('');
                  setNewPhone('');
                  setAddOpen(false);
                  toast({ title: 'Contact created' });
                  // Refresh list
                  resetFilters();
                } catch (e: any) {
                  toast({ title: 'Error', description: e.message ?? 'Failed to create contact', variant: 'destructive' });
                }
              }}
              disabled={!newFirstName.trim() || !newLastName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
