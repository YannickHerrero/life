'use client';

import { useState } from 'react';
import { PersonStanding, Dumbbell, Bike } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSport } from '@/hooks/useSport';
import { SportType, TrainingType, today } from '@/types';

interface SportInputProps {
  onSuccess?: () => void;
}

const sportTypes = [
  { type: SportType.RUNNING, label: 'Running', icon: PersonStanding },
  { type: SportType.STREET_WORKOUT, label: 'Street Workout', icon: Dumbbell },
  { type: SportType.BIKE, label: 'Bike', icon: Bike },
];

const trainingTypes = [
  { type: TrainingType.BASE, label: 'Base' },
  { type: TrainingType.INTERVALS, label: 'Intervals' },
  { type: TrainingType.LONG_RUN, label: 'Long Run' },
];

export function SportInput({ onSuccess }: SportInputProps) {
  const { addActivity } = useSport();
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [selectedType, setSelectedType] = useState<SportType | null>(null);
  const [durationMinutes, setDurationMinutes] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [trainingType, setTrainingType] = useState<TrainingType | ''>('');
  const [loading, setLoading] = useState(false);

  const handleTypeSelect = (type: SportType) => {
    setSelectedType(type);
    setStep('details');

    // Set defaults
    if (type === SportType.BIKE) {
      setDurationMinutes('40');
      setDistanceKm('12');
    } else {
      setDurationMinutes('');
      setDistanceKm('');
    }
    setTrainingType('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedType) return;

    const duration = parseInt(durationMinutes, 10);
    if (isNaN(duration) || duration <= 0) {
      toast.error('Please enter a valid duration');
      return;
    }

    // Validate distance for running and bike
    let distance: number | null = null;
    if (selectedType === SportType.RUNNING || selectedType === SportType.BIKE) {
      distance = parseFloat(distanceKm);
      if (isNaN(distance) || distance <= 0) {
        toast.error('Please enter a valid distance');
        return;
      }
    }

    // Validate training type for running
    if (selectedType === SportType.RUNNING && !trainingType) {
      toast.error('Please select a training type');
      return;
    }

    setLoading(true);

    try {
      await addActivity({
        sportType: selectedType,
        durationMinutes: duration,
        distanceKm: distance,
        trainingType: selectedType === SportType.RUNNING ? (trainingType as TrainingType) : null,
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

  // Step 1: Sport Type Selection
  if (step === 'type') {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Select sport type:</p>
        <div className="grid grid-cols-1 gap-3">
          {sportTypes.map(({ type, label, icon: Icon }) => (
            <Button
              key={type}
              variant="outline"
              className="h-20 flex items-center justify-start gap-4 px-6"
              onClick={() => handleTypeSelect(type)}
            >
              <Icon className="h-6 w-6" />
              <span className="text-base">{label}</span>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  const selectedConfig = sportTypes.find((t) => t.type === selectedType);

  // Step 2: Details Form
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>&larr;</span>
        <span>{selectedConfig?.label}</span>
      </button>

      {/* Duration */}
      <div className="space-y-2">
        <Label htmlFor="duration">Duration (minutes)</Label>
        <Input
          id="duration"
          type="number"
          inputMode="numeric"
          placeholder="e.g., 45"
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          min={1}
          required
          autoFocus
        />
      </div>

      {/* Distance (for running and bike) */}
      {(selectedType === SportType.RUNNING || selectedType === SportType.BIKE) && (
        <div className="space-y-2">
          <Label htmlFor="distance">Distance (km)</Label>
          <Input
            id="distance"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="e.g., 5.5"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
            min={0.1}
            required
          />
        </div>
      )}

      {/* Training type (for running only) */}
      {selectedType === SportType.RUNNING && (
        <div className="space-y-2">
          <Label htmlFor="trainingType">Training Type</Label>
          <Select
            value={trainingType}
            onValueChange={(value) => setTrainingType(value as TrainingType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {trainingTypes.map(({ type, label }) => (
                <SelectItem key={type} value={type}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving...' : 'Log Activity'}
      </Button>
    </form>
  );
}
