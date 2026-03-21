import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Download, Upload, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Contact } from '@/types/contact';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ImportContactsDialog } from '@/components/dialogs/ImportContactsDialog';

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

  type ContactDetails = {
    contact_id?: number;
    first_name?: string;
    last_name?: string;
    email?: string | null;
    phone?: string | null;
    created_at?: string;
    updated_at?: string;
    attributes?: Record<string, unknown>;
  };

  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewContactId, setViewContactId] = useState<string | null>(null);
  const [viewContact, setViewContact] = useState<ContactDetails | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importJobId, setImportJobId] = useState<number | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importColumns, setImportColumns] = useState<string[]>([]);
  const [importSampleRows, setImportSampleRows] = useState<Array<Record<string, unknown>>>([]);
  const [importSuggestedMapping, setImportSuggestedMapping] = useState<Record<string, string | null>>({});
  const [importUnmappedColumns, setImportUnmappedColumns] = useState<string[]>([]);
  const [importConfidence, setImportConfidence] = useState<Record<string, number>>({});
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importUploading, setImportUploading] = useState(false);

  const crmFieldOptions = useMemo(() => {
    // The backend import pipeline also supports mapping to `full_name`
    const base: Array<{ field_name: string; display_name: string }> = [
      { field_name: 'full_name', display_name: 'Full name' },
      ...availableFields.map((f) => ({ field_name: f.field_name, display_name: f.display_name })),
    ];
    const byName = new Map<string, { field_name: string; display_name: string }>();
    base.forEach((f) => byName.set(f.field_name, f));
    return Array.from(byName.values());
  }, [availableFields]);

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

  const fetchContactDetails = async (contactId: string) => {
    const token = localStorage.getItem('crm_token');
    const res = await fetch(`${API_BASE_URL}/contacts/${contactId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) {
      throw new Error('Failed to load contact details');
    }
    return (await res.json()) as ContactDetails;
  };

  const handleViewContact = async (contactId: string) => {
    setViewOpen(true);
    setViewLoading(true);
    setViewContactId(contactId);
    setViewContact(null);
    try {
      const details = await fetchContactDetails(contactId);
      setViewContact(details);
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed to load contact', variant: 'destructive' });
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    const ok = window.confirm('Remove this contact? This cannot be undone.');
    if (!ok) return;
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`${API_BASE_URL}/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        throw new Error('Failed to remove contact');
      }
      toast({ title: 'Contact removed' });
      await resetFilters();
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Failed to remove contact', variant: 'destructive' });
    }
  };

  const openImportPicker = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportUploading(true);
    try {
      const token = localStorage.getItem('crm_token');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE_URL}/imports/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        const detail = err?.detail ?? err ?? 'Failed to upload';
        throw new Error(typeof detail === 'string' ? detail : 'Failed to upload import file');
      }

      const data = await res.json();
      setImportJobId(data.job_id ?? null);
      setImportFileName(data.file_name ?? file.name);
      setImportColumns(data.columns ?? []);
      setImportSampleRows(data.sample_rows ?? []);
      setImportSuggestedMapping(data.suggested_mapping ?? {});
      setImportUnmappedColumns(data.unmapped_columns ?? []);
      setImportConfidence(data.confidence ?? {});
      setImportWarnings(data.warnings ?? []);
      setImportOpen(true);
    } catch (err: any) {
      toast({
        title: 'Import upload failed',
        description: err?.message ?? 'Please try again with a CSV or Excel file.',
        variant: 'destructive',
      });
    } finally {
      setImportUploading(false);
      // Allow uploading the same file twice in a row
      if (e.target) e.target.value = '';
    }
  };

  const approveImport = async (approvedMapping: Record<string, string | null>) => {
    if (!importJobId) return;
    const token = localStorage.getItem('crm_token');
    const res = await fetch(`${API_BASE_URL}/imports/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        job_id: importJobId,
        approved_mapping: approvedMapping,
        reject: false,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      const detail = err?.detail ?? err ?? 'Failed to import contacts';
      throw new Error(typeof detail === 'string' ? detail : 'Failed to import contacts');
    }

    const data = await res.json().catch(() => null);
    toast({
      title: 'Contacts imported',
      description: data?.message ?? `Imported successfully.`,
    });
    setImportOpen(false);
    setImportJobId(null);
    setImportColumns([]);
    setImportSampleRows([]);
    setImportSuggestedMapping({});
    setImportUnmappedColumns([]);
    setImportConfidence({});
    setImportWarnings([]);
    await resetFilters();
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
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleImportFileChange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={openImportPicker}
            disabled={importUploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {importUploading ? 'Importing…' : 'Import'}
          </Button>
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
                <Button size="sm" variant="outline" onClick={() => handleViewContact(c.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleRemoveContact(c.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
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

      <Dialog
        open={viewOpen}
        onOpenChange={(v) => {
          setViewOpen(v);
          if (!v) {
            setViewContactId(null);
            setViewContact(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Contact details</DialogTitle>
          </DialogHeader>

          {viewLoading ? (
            <div className="py-10 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : viewContact ? (
            <div className="space-y-5">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-lg truncate">
                      {[viewContact.first_name, viewContact.last_name].filter(Boolean).join(' ') || '—'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{viewContact.email || '—'}</p>
                    <p className="text-sm text-muted-foreground truncate">{viewContact.phone || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Custom attributes</p>
                {viewContact.attributes && Object.keys(viewContact.attributes).length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(viewContact.attributes).map(([k, v]) => (
                      <div key={k} className="rounded-md border bg-muted/30 p-3">
                        <p className="text-xs text-muted-foreground">{k}</p>
                        <p className="text-sm break-words">{String(v ?? '')}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No custom attributes</p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Created: {viewContact.created_at ? new Date(viewContact.created_at).toLocaleString() : '—'}</span>
                <span>Updated: {viewContact.updated_at ? new Date(viewContact.updated_at).toLocaleString() : '—'}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No contact loaded.</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportContactsDialog
        open={importOpen}
        onOpenChange={(v) => {
          setImportOpen(v);
          if (!v) setImportJobId(null);
        }}
        jobId={importJobId}
        fileName={importFileName}
        columns={importColumns}
        sampleRows={importSampleRows}
        suggestedMapping={importSuggestedMapping}
        unmappedColumns={importUnmappedColumns}
        confidence={importConfidence}
        warnings={importWarnings}
        fieldOptions={crmFieldOptions}
        onApprove={approveImport}
      />
    </div>
  );
}
