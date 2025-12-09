'use client';

import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, createSyncableEntity, markForSync } from '@/lib/db';
import { useSync } from './useSync';
import type { Book } from '@/types';

export function useBooks() {
  const { triggerSync } = useSync();

  // Get all books (non-deleted)
  const books = useLiveQuery(
    () => db.books.filter((b) => !b.deletedAt).sortBy('title'),
    []
  );

  // Get books split by completion status
  const inProgressBooks = useLiveQuery(
    () =>
      db.books
        .filter((b) => !b.deletedAt && !b.completed)
        .sortBy('title'),
    []
  );

  const completedBooks = useLiveQuery(
    () =>
      db.books
        .filter((b) => !b.deletedAt && b.completed)
        .toArray()
        .then((books) =>
          books.sort((a, b) => {
            if (!a.completedAt || !b.completedAt) return 0;
            return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
          })
        ),
    []
  );

  // Add a new book
  const addBook = async (title: string): Promise<Book> => {
    const book: Book = {
      ...createSyncableEntity(),
      title,
      completed: false,
      completedAt: null,
      totalReadingTimeMinutes: 0,
    };

    await db.books.add(book);
    triggerSync();
    return book;
  };

  // Update book's total reading time
  const addReadingTime = async (bookId: string, minutes: number): Promise<void> => {
    const existing = await db.books.get(bookId);
    if (!existing) return;

    const updated = markForSync({
      ...existing,
      totalReadingTimeMinutes: existing.totalReadingTimeMinutes + minutes,
    });
    await db.books.put(updated);
    triggerSync();
  };

  // Mark book as complete
  const markComplete = async (bookId: string): Promise<void> => {
    const existing = await db.books.get(bookId);
    if (!existing) return;

    const updated = markForSync({
      ...existing,
      completed: true,
      completedAt: new Date(),
    });
    await db.books.put(updated);
    triggerSync();
  };

  // Mark book as incomplete (reopen)
  const markIncomplete = async (bookId: string): Promise<void> => {
    const existing = await db.books.get(bookId);
    if (!existing) return;

    const updated = markForSync({
      ...existing,
      completed: false,
      completedAt: null,
    });
    await db.books.put(updated);
    triggerSync();
  };

  // Soft delete a book
  const deleteBook = async (id: string): Promise<void> => {
    const existing = await db.books.get(id);
    if (!existing) return;

    const deleted = markForSync({ ...existing, deletedAt: new Date() });
    await db.books.put(deleted);
    triggerSync();
  };

  // Search books by title (only in-progress books)
  const searchBooks = useCallback(async (query: string): Promise<Book[]> => {
    if (!query.trim()) {
      return db.books.filter((b) => !b.deletedAt && !b.completed).toArray();
    }

    const lowerQuery = query.toLowerCase();
    return db.books
      .filter((b) => !b.deletedAt && !b.completed && b.title.toLowerCase().includes(lowerQuery))
      .toArray();
  }, []);

  // Get the last book that was read (most recent reading activity with a book)
  const getLastReadBook = useCallback(async (): Promise<Book | null> => {
    const recentActivities = await db.japaneseActivities
      .filter((a) => !a.deletedAt && a.type === 'reading' && a.bookId !== null)
      .toArray();

    if (recentActivities.length === 0) return null;

    // Sort by date descending to get most recent
    recentActivities.sort((a, b) => b.date.localeCompare(a.date));

    const lastBookId = recentActivities[0].bookId;
    if (!lastBookId) return null;

    const book = await db.books.get(lastBookId);
    return book && !book.deletedAt && !book.completed ? book : null;
  }, []);

  // Get book by ID
  const getBookById = async (id: string): Promise<Book | undefined> => {
    return db.books.get(id);
  };

  return {
    books,
    inProgressBooks,
    completedBooks,
    addBook,
    addReadingTime,
    markComplete,
    markIncomplete,
    deleteBook,
    searchBooks,
    getLastReadBook,
    getBookById,
  };
}
