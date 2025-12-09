'use client';

import { useState, useMemo, useEffect } from 'react';
import { BookOpen, Headphones, Monitor, GraduationCap, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useJapanese } from '@/hooks/useJapanese';
import { useBooks } from '@/hooks/useBooks';
import { JapaneseActivityType, today } from '@/types';
import type { Book } from '@/types';
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

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

type Step = 'type' | 'book-select' | 'new-book' | 'details';

export function JapaneseInput({ onSuccess }: JapaneseInputProps) {
  const { addActivity, activities } = useJapanese();
  const { searchBooks, getLastReadBook, addBook, markComplete } = useBooks();

  const [step, setStep] = useState<Step>('type');
  const [selectedType, setSelectedType] = useState<JapaneseActivityType | null>(null);
  const [durationMinutes, setDurationMinutes] = useState('');
  const [newCards, setNewCards] = useState('20');
  const [loading, setLoading] = useState(false);

  // Book-related state
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [markBookComplete, setMarkBookComplete] = useState(false);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [bookSearchResults, setBookSearchResults] = useState<Book[]>([]);
  const [lastReadBook, setLastReadBook] = useState<Book | null>(null);
  const [newBookTitle, setNewBookTitle] = useState('');

  // Check if there's already a flashcard activity today
  const hasFlashcardToday = useMemo(() => {
    const todayDate = today();
    return activities?.some(
      (a) => a.type === JapaneseActivityType.FLASHCARDS && a.date === todayDate
    ) ?? false;
  }, [activities]);

  // Load book search results when in book-select step
  useEffect(() => {
    if (step === 'book-select') {
      searchBooks(bookSearchQuery).then(setBookSearchResults);
    }
  }, [bookSearchQuery, step, searchBooks]);

  // Load last read book when entering book-select step
  useEffect(() => {
    if (step === 'book-select') {
      getLastReadBook().then((book) => {
        setLastReadBook(book);
        if (book && !selectedBook) {
          setSelectedBook(book);
        }
      });
    }
  }, [step, getLastReadBook, selectedBook]);

  const handleTypeSelect = async (type: JapaneseActivityType) => {
    setSelectedType(type);
    // Reset duration but keep default for flashcards
    setDurationMinutes('');
    if (type === JapaneseActivityType.FLASHCARDS) {
      // First flashcard of the day defaults to 20, subsequent ones to 0
      setNewCards(hasFlashcardToday ? '0' : '20');
    }

    if (type === JapaneseActivityType.READING) {
      // Fetch last book and go directly to details
      const lastBook = await getLastReadBook();
      setLastReadBook(lastBook);
      setSelectedBook(lastBook); // Can be null
    }

    setStep('details');
  };

  const handleBookSelect = (book: Book | null) => {
    setSelectedBook(book);
    setMarkBookComplete(false);
    setStep('details');
  };

  const handleSkipBook = () => {
    setSelectedBook(null);
    setMarkBookComplete(false);
    setStep('details');
  };

  const handleNewBook = () => {
    setNewBookTitle('');
    setStep('new-book');
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookTitle.trim()) {
      toast.error('Please enter a book title');
      return;
    }

    setLoading(true);
    try {
      const book = await addBook(newBookTitle.trim());
      setSelectedBook(book);
      setMarkBookComplete(false);
      setStep('details');
      toast.success('Book added!');
    } catch (error) {
      console.error('Failed to create book:', error);
      toast.error('Failed to create book');
    } finally {
      setLoading(false);
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
        bookId: selectedBook?.id ?? null,
        date: today(),
      });

      // If marking book complete
      if (markBookComplete && selectedBook) {
        await markComplete(selectedBook.id);
      }

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
    if (step === 'book-select') {
      // From book selection, go back to details
      setStep('details');
    } else if (step === 'new-book') {
      setStep('book-select');
    } else {
      // From details, go back to type selection
      setStep('type');
      setSelectedType(null);
      setSelectedBook(null);
      setMarkBookComplete(false);
    }
  };

  // Type selection step
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

  // Book selection step
  if (step === 'book-select') {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleBack}
          className={cn(
            'flex items-center gap-2 text-sm text-muted-foreground',
            'hover:text-foreground transition-colors'
          )}
        >
          <span>&larr;</span>
          <span>Reading</span>
        </button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search books..."
            value={bookSearchQuery}
            onChange={(e) => setBookSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <ScrollArea className="h-[35vh]">
          {/* Last read book (if exists and not searching) */}
          {lastReadBook && !bookSearchQuery && (
            <div className="mb-4">
              <p className="text-sm font-medium text-muted-foreground mb-2">Continue Reading</p>
              <button
                type="button"
                onClick={() => handleBookSelect(lastReadBook)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-md transition-colors',
                  selectedBook?.id === lastReadBook.id
                    ? 'bg-primary/10 border border-primary'
                    : 'hover:bg-muted'
                )}
              >
                <p className="font-medium">{lastReadBook.title}</p>
                <p className="text-sm text-muted-foreground">
                  {formatMinutes(lastReadBook.totalReadingTimeMinutes)} read
                </p>
              </button>
              <Separator className="my-4" />
            </div>
          )}

          {/* All in-progress books */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {bookSearchQuery ? 'Results' : 'In Progress'}
            </p>
            {bookSearchResults.length > 0 ? (
              <div className="space-y-1">
                {bookSearchResults
                  .filter((book) => book.id !== lastReadBook?.id || bookSearchQuery)
                  .map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => handleBookSelect(book)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <p className="font-medium">{book.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatMinutes(book.totalReadingTimeMinutes)} read
                      </p>
                    </button>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                {bookSearchQuery ? 'No books found' : 'No books yet'}
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Action buttons */}
        <div className="space-y-2">
          <Button variant="outline" className="w-full" onClick={handleNewBook}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Book
          </Button>
          <Button variant="ghost" className="w-full" onClick={handleSkipBook}>
            Skip - Log without book
          </Button>
        </div>
      </div>
    );
  }

  // New book step
  if (step === 'new-book') {
    return (
      <form onSubmit={handleCreateBook} className="space-y-6">
        <button
          type="button"
          onClick={handleBack}
          className={cn(
            'flex items-center gap-2 text-sm text-muted-foreground',
            'hover:text-foreground transition-colors'
          )}
        >
          <span>&larr;</span>
          <span>Back</span>
        </button>

        <div className="space-y-2">
          <Label htmlFor="bookTitle">Book Title</Label>
          <Input
            id="bookTitle"
            type="text"
            placeholder="Enter book title"
            value={newBookTitle}
            onChange={(e) => setNewBookTitle(e.target.value)}
            autoFocus
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating...' : 'Add Book'}
        </Button>
      </form>
    );
  }

  // Details step
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

      {/* Book selector (clickable to change) */}
      {selectedType === JapaneseActivityType.READING && (
        <button
          type="button"
          onClick={() => setStep('book-select')}
          className="w-full p-3 rounded-lg bg-muted/50 text-left hover:bg-muted transition-colors"
        >
          <p className="text-sm text-muted-foreground">Book</p>
          <p className="font-medium">
            {selectedBook ? selectedBook.title : 'No book selected'}
          </p>
        </button>
      )}

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

      {/* Mark complete checkbox (only for reading with book selected) */}
      {selectedType === JapaneseActivityType.READING && selectedBook && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="markComplete"
            checked={markBookComplete}
            onCheckedChange={(checked) => setMarkBookComplete(checked as boolean)}
          />
          <Label htmlFor="markComplete" className="text-sm cursor-pointer">
            Mark book as complete
          </Label>
        </div>
      )}

      {/* Submit button */}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Saving...' : 'Log Activity'}
      </Button>
    </form>
  );
}
