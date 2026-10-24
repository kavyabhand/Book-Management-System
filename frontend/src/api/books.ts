import type { Book, BookInput, BookPage, SortKey } from "../types/book";
import { apiFetch, readBody } from "./client";

export async function fetchBookPage(params: {
  limit?: number;
  cursor?: string | null;
  q?: string;
  genre?: string | null;
  sort?: SortKey;
}): Promise<BookPage> {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 10));
  search.set("sort", params.sort ?? "newest");
  if (params.cursor) {
    search.set("cursor", params.cursor);
  }
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }
  if (params.genre) {
    search.set("genre", params.genre);
  }

  const res = await apiFetch(`/books?${search.toString()}`);
  return readBody<BookPage>(res, "failed to load books");
}

export async function fetchBook(id: string): Promise<Book> {
  const res = await apiFetch(`/books/${id}`);
  return readBody<Book>(res, "book not found");
}

export async function createBook(payload: BookInput): Promise<Book> {
  const res = await apiFetch("/books", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return readBody<Book>(res, "failed to add book");
}

export async function updateBook(id: string, payload: BookInput): Promise<Book> {
  const res = await apiFetch(`/books/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return readBody<Book>(res, "failed to update book");
}

export async function deleteBook(id: string): Promise<void> {
  const res = await apiFetch(`/books/${id}`, { method: "DELETE" });
  await readBody<void>(res, "failed to delete book");
}
