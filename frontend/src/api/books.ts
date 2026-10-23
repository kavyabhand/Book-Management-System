import { clearSession } from "../storage/session";
import type { Book, BookPage } from "../types/book";
import { apiFetch } from "./client";

async function readBody<T>(res: Response, fallback: string): Promise<T> {
  if (res.status === 401) {
    clearSession();
    throw new Error("session expired");
  }
  if (!res.ok) {
    let detail = fallback;
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") {
        detail = data.detail;
      }
    } catch {
      detail = fallback;
    }
    throw new Error(detail);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

export async function fetchBookPage(params: {
  limit?: number;
  cursor?: string | null;
  q?: string;
}): Promise<BookPage> {
  const search = new URLSearchParams();
  search.set("limit", String(params.limit ?? 10));
  if (params.cursor) {
    search.set("cursor", params.cursor);
  }
  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }

  const res = await apiFetch(`/books?${search.toString()}`);
  return readBody<BookPage>(res, "failed to load books");
}

export async function createBook(payload: {
  title: string;
  author: string;
  isbn?: string | null;
}): Promise<Book> {
  const res = await apiFetch("/books", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return readBody<Book>(res, "failed to add book");
}

export async function updateBook(
  id: string,
  payload: { title: string; author: string; isbn?: string | null }
): Promise<Book> {
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
