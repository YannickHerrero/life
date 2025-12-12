'use client';

import { useState, useMemo } from 'react';
import { format, parse } from 'date-fns';
import { CalendarIcon, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAppStore } from '@/lib/store';
import { useJapanese } from '@/hooks/useJapanese';
import type { JapaneseActivity } from '@/types';

const activityTypeLabels: Record<string, string> = {
  flashcards: 'Flashcards',
  reading: 'Reading',
  watching: 'Watching',
  listening: 'Listening',
};

export function JapaneseHistory() {
  const japaneseActivities = useAppStore((s) => s.japaneseActivities);
  const { updateActivity, deleteActivity } = useJapanese();
  const [editingEntry, setEditingEntry] = useState<JapaneseActivity | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editDuration, setEditDuration] = useState('');
  const [editNewCards, setEditNewCards] = useState('');
  const [editDate, setEditDate] = useState<Date>(new Date());

  // Sort activities by date descending
  const sortedActivities = useMemo(
    () => [...japaneseActivities].sort((a, b) => b.date.localeCompare(a.date)),
    [japaneseActivities]
  );

  const handleEdit = (entry: JapaneseActivity) => {
    setEditingEntry(entry);
    setEditDuration(entry.durationMinutes.toString());
    setEditNewCards(entry.newCards?.toString() ?? '');
    setEditDate(parse(entry.date, 'yyyy-MM-dd', new Date()));
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    const duration = parseInt(editDuration, 10);
    if (isNaN(duration) || duration <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }

    await updateActivity(editingEntry.id, {
      durationMinutes: duration,
      newCards: editingEntry.type === 'flashcards' ? parseInt(editNewCards, 10) || null : null,
      date: format(editDate, 'yyyy-MM-dd'),
    });

    toast.success('Entry updated');
    setEditingEntry(null);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    await deleteActivity(deletingId);
    toast.success('Entry deleted');
    setDeletingId(null);
  };

  if (sortedActivities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No Japanese activities logged yet
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {sortedActivities.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card"
          >
            <div className="flex-1">
              <p className="font-medium">{activityTypeLabels[entry.type]}</p>
              <p className="text-sm text-muted-foreground">
                {entry.date} · {entry.durationMinutes}m
                {entry.type === 'flashcards' && entry.newCards && ` · ${entry.newCards} cards`}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(entry)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeletingId(entry.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Sheet */}
      <Sheet open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <SheetContent side="bottom" className="h-auto rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Edit Entry</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(editDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editDate}
                    onSelect={(date) => date && setEditDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
              />
            </div>
            {editingEntry?.type === 'flashcards' && (
              <div className="space-y-2">
                <Label>New Cards</Label>
                <Input
                  type="number"
                  value={editNewCards}
                  onChange={(e) => setEditNewCards(e.target.value)}
                />
              </div>
            )}
            <Button className="w-full" onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
