'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWeight } from '@/hooks/useWeight';
import { today } from '@/types';
import { parseDecimal } from '@/lib/utils';

interface WeightInputProps {
  onSuccess?: () => void;
}

export function WeightInput({ onSuccess }: WeightInputProps) {
  const { addOrUpdateWeight, getWeightForDate, getLatestWeight } = useWeight();
  const [weight, setWeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingWeight, setExistingWeight] = useState<number | null>(null);

  // Check if there's already a weight entry for today
  useEffect(() => {
    const checkExisting = async () => {
      const todayEntry = await getWeightForDate(today());
      if (todayEntry) {
        setExistingWeight(todayEntry.weightKg);
        setWeight(todayEntry.weightKg.toString());
      } else {
        // Pre-fill with latest weight as a convenience
        const latest = await getLatestWeight();
        if (latest) {
          setWeight(latest.weightKg.toString());
        }
      }
    };
    checkExisting();
  }, [getWeightForDate, getLatestWeight]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const weightKg = parseDecimal(weight);
    if (isNaN(weightKg) || weightKg <= 0 || weightKg > 500) {
      toast.error('Please enter a valid weight');
      return;
    }

    setLoading(true);

    try {
      await addOrUpdateWeight(weightKg, today());
      toast.success(existingWeight ? 'Weight updated!' : 'Weight logged!');
      onSuccess?.();
    } catch (error) {
      console.error('Failed to log weight:', error);
      toast.error('Failed to log weight');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {existingWeight && (
        <p className="text-sm text-muted-foreground">
          You already logged {existingWeight} kg today. Submitting will update it.
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="weight">Weight (kg)</Label>
        <Input
          id="weight"
          type="text"
          inputMode="decimal"
          placeholder="e.g., 75.5"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          required
          autoFocus
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving...' : existingWeight ? 'Update Weight' : 'Log Weight'}
      </Button>
    </form>
  );
}
