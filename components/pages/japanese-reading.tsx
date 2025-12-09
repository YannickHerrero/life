'use client';

import { useState } from 'react';
import { useBooks } from '@/hooks/useBooks';
import { useNavigation } from '@/lib/navigation-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Check, MoreVertical, Trash2, RotateCcw, ChevronLeft } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import type { Book } from '@/types';

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function JapaneseReading() {
  const { inProgressBooks, completedBooks, markComplete, markIncomplete, deleteBook } = useBooks();
  const { goBack } = useNavigation();
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);

  const handleMarkComplete = async (bookId: string) => {
    await markComplete(bookId);
  };

  const handleMarkIncomplete = async (bookId: string) => {
    await markIncomplete(bookId);
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteBook(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const BookCard = ({ book, showCompleteAction }: { book: Book; showCompleteAction: boolean }) => (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <BookOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate">{book.title}</p>
          <p className="text-sm text-muted-foreground">
            {formatMinutes(book.totalReadingTimeMinutes)} read
            {book.startedAt && ` · Started ${new Date(book.startedAt).toLocaleDateString()}`}
            {book.completedAt && ` · Completed ${new Date(book.completedAt).toLocaleDateString()}`}
          </p>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {showCompleteAction ? (
            <DropdownMenuItem onClick={() => handleMarkComplete(book.id)}>
              <Check className="h-4 w-4 mr-2" />
              Mark Complete
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => handleMarkIncomplete(book.id)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reopen
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setDeleteTarget(book)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Reading</h1>
      </div>

      {/* In Progress Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">In Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {inProgressBooks && inProgressBooks.length > 0 ? (
            inProgressBooks.map((book) => (
              <BookCard key={book.id} book={book} showCompleteAction={true} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No books in progress
            </p>
          )}
        </CardContent>
      </Card>

      {/* Completed Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Completed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {completedBooks && completedBooks.length > 0 ? (
            completedBooks.map((book) => (
              <BookCard key={book.id} book={book} showCompleteAction={false} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No completed books yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Book</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
