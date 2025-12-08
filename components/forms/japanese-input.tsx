'use client';

import { useState, useMemo } from 'react';
import { BookOpen, Headphones, Monitor, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useJapanese } from '@/hooks/useJapanese';
import { JapaneseActivityType, today } from '@/types';
import { cn } from '@/lib/utils';

interface JapaneseInputProps {
  onSuccess?: () => void;
}

const activityTypes = [
  {
    type: JapaneseActivityType.FLASHCARDS,
    label: 'Flashcards',
    icon: GraduationCap,
  },
  {
    type: JapaneseActivityType.READING,
    label: 'Reading',
    icon: BookOpen,
  },
  {
    type: JapaneseActivityType.WATCHING,
    label: 'Watching',
    icon: Monitor,
  },
  {
    type: JapaneseActivityType.LISTENING,
    label: 'Listening',
    icon: Headphones,
  },
];

export function JapaneseInput({ onSuccess }: JapaneseInputProps) {
  const { addActivity, activities } = useJapanese();
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [selectedType, setSelectedType] = useState<JapaneseActivityType | null>(null);
  const [durationMinutes, setDurationMinutes] = useState('');
  const [newCards, setNewCards] = useState('20');
  const [loading, setLoading] = useState(false);

  // Check if there's already a flashcard activity today
  const hasFlashcardToday = useMemo(() => {
    const todayDate = today();
    return activities?.some(
      (a) => a.type === JapaneseActivityType.FLASHCARDS && a.date === todayDate
    ) ?? false;
  }, [activities]);

  const handleTypeSelect = (type: JapaneseActivityType) => {
    setSelectedType(type);
    setStep('details');
    // Reset duration but keep default for flashcards
    setDurationMinutes('');
    if (type === JapaneseActivityType.FLASHCARDS) {
      // First flashcard of the day defaults to 20, subsequent ones to 0
      setNewCards(hasFlashcardToday ? '0' : '20');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedType) return;

    const duration = parseInt(durationMinutes, 10);
    if (isNaN(duration) || duration <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }

    setLoading(true);

    try {
      await addActivity({
        type: selectedType,
        durationMinutes: duration,
        newCards:
          selectedType === JapaneseActivityType.FLASHCARDS
            ? parseInt(newCards, 10) || (hasFlashcardToday ? 0 : 20)
            : null,
        date: today(),
      });

      toast.success('Activity logged!');
      onSuccess?.();
    } catch (error) {
      console.error('Failed to log activity:', error);
      toast.error('Failed to log activity');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('type');
    setSelectedType(null);
  };

  if (step === 'type') {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Select activity type:</p>
        <div className="grid grid-cols-2 gap-3">
          {activityTypes.map(({ type, label, icon: Icon }) => (
            <Button
              key={type}
              variant="outline"
              className="h-24 flex flex-col gap-2"
              onClick={() => handleTypeSelect(type)}
            >
              <Icon className="h-6 w-6" />
              <span>{label}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  const selectedConfig = activityTypes.find((t) => t.type === selectedType);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selected type indicator */}
      <button
        type="button"
        onClick={handleBack}
        className={cn(
          'flex items-center gap-2 text-sm text-muted-foreground',
          'hover:text-foreground transition-colors'
        )}
      >
        <span>&larr;</span>
        <span>
          {selectedConfig?.label}
        </span>
      </button>

      {/* Duration input */}
      <div className="space-y-2">
        <Label htmlFor="duration">Time spent (minutes)</Label>
        <Input
          id="duration"
          type="number"
          inputMode="numeric"
          placeholder="e.g., 30"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          min={1}
          required
          autoFocus
        />
      </div>

      {/* New cards input (only for flashcards) */}
      {selectedType === JapaneseActivityType.FLASHCARDS && (
        <div className="space-y-2">
          <Label htmlFor="newCards">New cards learned</Label>
          <Input
            id="newCards"
            type="number"
            inputMode="numeric"
            placeholder="20"
            value={newCards}
            onChange={(e) => setNewCards(e.target.value)}
            min={0}
          />
        </div>
      )}

      {/* Submit button */}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving...' : 'Log Activity'}
      </Button>
    </form>
  );
}
