import { useEffect, useMemo, useState } from 'react';
import type { DragEvent as ReactDragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

const IGNORE_VALUE = '__ignore__';

type FieldOption = { field_name: string; display_name: string };

export function ImportContactsDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number | null;
  fileName?: string;
  columns: string[];
  sampleRows: Array<Record<string, unknown>>;
  suggestedMapping: Record<string, string | null> | null;
  fieldOptions: FieldOption[];
  unmappedColumns?: string[];
  warnings?: string[];
  confidence?: Record<string, number>;
  onApprove: (approvedMapping: Record<string, string | null>) => Promise<void>;
}) {
  const {
    open,
    onOpenChange,
    jobId,
    fileName,
    columns,
    sampleRows,
    suggestedMapping,
    fieldOptions,
    onApprove,
    warnings,
    confidence,
  } = props;

  const { toast } = useToast();
  const [approving, setApproving] = useState(false);
  const [mapping, setMapping] = useState<Record<string, string | null>>({});
  const [searchFields, setSearchFields] = useState('');

  const normalizedSuggested = useMemo(() => suggestedMapping ?? {}, [suggestedMapping]);

  useEffect(() => {
    if (!open) return;
    const next: Record<string, string | null> = {};
    columns.forEach((col) => {
      const v = normalizedSuggested[col];
      next[col] = v === undefined ? null : (v as string | null);
    });
    setMapping(next);
    setApproving(false);
    setSearchFields('');
  }, [open, columns, normalizedSuggested]);

  const filteredFields = useMemo(() => {
    const q = searchFields.trim().toLowerCase();
    if (!q) return fieldOptions;
    return fieldOptions.filter((f) => (f.display_name + ' ' + f.field_name).toLowerCase().includes(q));
  }, [fieldOptions, searchFields]);

  const onDropToField = (e: ReactDragEvent, targetField: string | null) => {
    e.preventDefault();
    const fileCol = e.dataTransfer.getData('text/plain');
    if (!fileCol) return;
    setMapping((prev) => ({ ...prev, [fileCol]: targetField }));
  };

  const handleApprove = async () => {
    if (!jobId) return;
    setApproving(true);
    try {
      await onApprove(mapping);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Import failed', description: message, variant: 'destructive' });
    } finally {
      setApproving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[1600px] h-[92vh] p-0">
        <div className="dialog-shell">
          <DialogHeader className="p-6 pb-4 shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle>Import contacts</DialogTitle>
                <DialogDescription>
                  Drag file columns onto CRM fields, or use the dropdowns to edit the mapping.
                  {fileName ? <span className="ml-2 font-medium">{fileName}</span> : null}
                </DialogDescription>
              </div>
              <Badge variant="secondary">{columns.length} columns</Badge>
            </div>
            {warnings && warnings.length > 0 && (
              <div className="mt-3 space-y-1">
                {warnings.map((w, i) => (
                  <p key={i} className="text-sm text-destructive">
                    {w}
                  </p>
                ))}
              </div>
            )}
          </DialogHeader>

          <div className="dialog-body-scroll grid min-h-0 grid-cols-1 lg:grid-cols-[420px_minmax(0,1fr)]">
            <div className="flex min-h-0 flex-col border-b bg-muted/20 p-4 lg:border-b-0 lg:border-r">
              <div className="flex min-h-0 flex-1 flex-col space-y-3">
                <div className="space-y-2">
                  <Label>Field search</Label>
                  <Input
                    value={searchFields}
                    onChange={(e) => setSearchFields(e.target.value)}
                    placeholder="Type to filter CRM fields…"
                  />
                </div>

                <ScrollArea className="min-h-0 flex-1">
                  <div className="space-y-3 pr-2 pb-2">
                    <div className="space-y-2">
                      <Label>CRM fields (drag drop targets)</Label>
                      <div className="flex flex-wrap gap-2">
                        <div
                          className="rounded-full border bg-card px-3 py-1 text-xs cursor-pointer select-none"
                          draggable={false}
                          onDragOver={(ev) => ev.preventDefault()}
                          onDrop={(ev) => onDropToField(ev, null)}
                          title="Drop to ignore this file column"
                        >
                          Ignore
                        </div>
                        {filteredFields.map((f) => (
                          <div
                            key={f.field_name}
                            className="rounded-full border bg-card px-3 py-1 text-xs cursor-pointer select-none"
                            onDragOver={(ev) => ev.preventDefault()}
                            onDrop={(ev) => onDropToField(ev, f.field_name)}
                            title={`Drop to map to ${f.display_name}`}
                          >
                            {f.display_name}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Quick mapping</Label>
                      <div className="space-y-3">
                        {columns.map((col) => {
                          const mapped = mapping[col];
                          const conf = confidence?.[col];
                          return (
                            <div key={col} className="rounded-xl border bg-card p-3">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div
                                  className="text-sm font-medium truncate cursor-grab"
                                  draggable
                                  onDragStart={(ev) => {
                                    ev.dataTransfer.setData('text/plain', col);
                                    ev.dataTransfer.effectAllowed = 'move';
                                  }}
                                  title="Drag onto a CRM field"
                                >
                                  {col}
                                </div>
                                {typeof conf === 'number' ? (
                                  <Badge variant="outline">{Math.round(conf * 100)}%</Badge>
                                ) : null}
                              </div>

                              <Select
                                value={mapped ? mapped : IGNORE_VALUE}
                                onValueChange={(v) => setMapping((prev) => ({ ...prev, [col]: v === IGNORE_VALUE ? null : v }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Choose a field" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={IGNORE_VALUE}>Ignore</SelectItem>
                                  {fieldOptions.map((f) => (
                                    <SelectItem key={f.field_name} value={f.field_name}>
                                      {f.display_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="flex min-h-0 flex-col p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold">Sample preview</h3>
                  <p className="text-sm text-muted-foreground">How your file columns look (first rows).</p>
                </div>
                <Badge variant="outline">{sampleRows.length} sample rows</Badge>
              </div>
              <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-lg border bg-card overflow-hidden">
                <ScrollArea className="min-h-0 flex-1">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((c) => (
                          <TableHead key={c} className="max-w-[160px]">
                            {c}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sampleRows.map((r, idx) => (
                        <TableRow key={idx}>
                          {columns.map((c) => (
                            <TableCell key={c} className="max-w-[160px] truncate">
                              {String(r[c] ?? '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          </div>

          <div className="dialog-footer-bar flex justify-end gap-3 border-t p-6 shrink-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={approving}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={approving || !jobId}>
              {approving ? 'Importing…' : 'Import contacts'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

