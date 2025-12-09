'use client';

import { useState, useMemo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
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
import { useAppStore } from '@/lib/store';
import { useSport } from '@/hooks/useSport';
import type { SportActivity } from '@/types';

const sportTypeLabels: Record<string, string> = {
  running: 'Running',
  street_workout: 'Street Workout',
  bike: 'Bike',
};

const trainingTypeLabels: Record<string, string> = {
  base: 'Base',
  intervals: 'Intervals',
  long_run: 'Long Run',
};

export function SportHistory() {
  const sportActivities = useAppStore((s) => s.sportActivities);
  const { updateActivity, deleteActivity } = useSport();
  const [editingEntry, setEditingEntry] = useState<SportActivity | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editDuration, setEditDuration] = useState('');
  const [editDistance, setEditDistance] = useState('');

  // Sort activities by date descending
  const sortedActivities = useMemo(
    () => [...sportActivities].sort((a, b) => b.date.localeCompare(a.date)),
    [sportActivities]
  );

  const handleEdit = (entry: SportActivity) => {
    setEditingEntry(entry);
    setEditDuration(entry.durationMinutes.toString());
    setEditDistance(entry.distanceKm?.toString() ?? '');
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    const duration = parseInt(editDuration, 10);
    if (isNaN(duration) || duration <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }

    const distance = editDistance ? parseFloat(editDistance) : null;

    await updateActivity(editingEntry.id, {
      durationMinutes: duration,
      distanceKm: distance,
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
        No sport activities logged yet
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
              <p className="font-medium">{sportTypeLabels[entry.sportType]}</p>
              <p className="text-sm text-muted-foreground">
                {entry.date} · {entry.durationMinutes}m
                {entry.distanceKm && ` · ${entry.distanceKm}km`}
                {entry.trainingType && ` · ${trainingTypeLabels[entry.trainingType]}`}
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
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
              />
            </div>
            {(editingEntry?.sportType === 'running' || editingEntry?.sportType === 'bike') && (
              <div className="space-y-2">
                <Label>Distance (km)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={editDistance}
                  onChange={(e) => setEditDistance(e.target.value)}
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
