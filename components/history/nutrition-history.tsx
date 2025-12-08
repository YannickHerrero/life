'use client';

import { useState, useEffect } from 'react';
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
import { useNutrition } from '@/hooks/useNutrition';
import { parseDecimal } from '@/lib/utils';
import type { MealEntry, Food } from '@/types';

const mealTypeLabels: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export function NutritionHistory() {
  const { mealEntries, updateMealEntry, deleteMealEntry, getFoodById } = useNutrition();
  const [entriesWithFood, setEntriesWithFood] = useState<{ entry: MealEntry; food: Food | undefined }[]>([]);
  const [editingEntry, setEditingEntry] = useState<MealEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState('');

  // Load food details for entries
  useEffect(() => {
    if (!mealEntries) return;

    const loadFoods = async () => {
      const withFood = await Promise.all(
        mealEntries.map(async (entry) => ({
          entry,
          food: await getFoodById(entry.foodId),
        }))
      );
      setEntriesWithFood(withFood);
    };

    loadFoods();
  }, [mealEntries, getFoodById]);

  const handleEdit = (entry: MealEntry) => {
    setEditingEntry(entry);
    setEditQuantity(entry.quantityGrams.toString());
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    const quantity = parseDecimal(editQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Please enter a valid quantity');
      return;
    }

    await updateMealEntry(editingEntry.id, {
      quantityGrams: quantity,
    });

    toast.success('Entry updated');
    setEditingEntry(null);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    await deleteMealEntry(deletingId);
    toast.success('Entry deleted');
    setDeletingId(null);
  };

  if (entriesWithFood.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No meals logged yet
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {entriesWithFood.map(({ entry, food }) => (
          <div
            key={entry.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card"
          >
            <div className="flex-1">
              <p className="font-medium">{food?.name ?? 'Unknown food'}</p>
              <p className="text-sm text-muted-foreground">
                {entry.date} · {mealTypeLabels[entry.mealType]} · {entry.quantityGrams}g
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
              <Label>Quantity (grams)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
              />
            </div>
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
              Are you sure you want to delete this meal entry? This action cannot be undone.
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
