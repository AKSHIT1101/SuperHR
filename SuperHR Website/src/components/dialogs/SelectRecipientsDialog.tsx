import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { AudienceSegment } from '@/types/alumni';
import { PersonSelector } from './PersonSelector';

interface SelectRecipientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSegments: string[];
  selectedIndividuals: string[];
  onConfirm: (segments: string[], individuals: string[]) => void;
  audienceSegments: AudienceSegment[];
  messageType: 'email' | 'whatsapp';
}

export function SelectRecipientsDialog({
  open,
  onOpenChange,
  selectedSegments: initialSegments,
  selectedIndividuals: initialIndividuals,
  onConfirm,
  audienceSegments,
  messageType,
}: SelectRecipientsDialogProps) {
  const [selectedSegments, setSelectedSegments] = useState<string[]>(initialSegments);
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>(initialIndividuals);

  // Reset selections when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedSegments(initialSegments);
      setSelectedIndividuals(initialIndividuals);
    }
  }, [open, initialSegments, initialIndividuals]);

  const handleConfirm = () => {
    onConfirm(selectedSegments, selectedIndividuals);
    onOpenChange(false);
  };

  // Calculate total recipients
  const totalRecipients = useMemo(() => {
    const segmentMemberIds = selectedSegments.flatMap((segId) => {
      const seg = audienceSegments.find((s) => s.id === segId);
      return seg?.memberIds || [];
    });
    return [...new Set([...segmentMemberIds, ...selectedIndividuals])].length;
  }, [selectedSegments, selectedIndividuals, audienceSegments]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-0 shrink-0">
          <DialogTitle>Select Recipients</DialogTitle>
          <DialogDescription>
            Choose audience segments or individual {messageType === 'email' ? 'email addresses' : 'phone numbers'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden px-6 pt-0 flex flex-col">
          <PersonSelector
            selectedSegments={selectedSegments}
            selectedIndividuals={selectedIndividuals}
            onSegmentsChange={setSelectedSegments}
            onIndividualsChange={setSelectedIndividuals}
            audienceSegments={audienceSegments}
            filterByPhone={messageType === 'whatsapp'}
            className="flex-1 min-h-0"
          />

          {/* Summary */}
          <div className="bg-muted border rounded-md px-3 p-1 mt-3 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Total Recipients: {totalRecipients}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedSegments.length} segments + {selectedIndividuals.length} individuals
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-3 pt-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm Selection ({totalRecipients})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
