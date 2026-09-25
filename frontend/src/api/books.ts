import { API_URL } from "../config";
import type { Book } from "../types/book";

export async function fetchBooks(): Promise<Book[]> {
  const res = await fetch(`${API_URL}/books`);
  if (!res.ok) {
    throw new Error("failed to load books");
  }
  return res.json();
}

export async function createBook(payload: {
  title: string;
  author: string;
  isbn?: string | null;
}): Promise<Book> {
  const res = await fetch(`${API_URL}/books`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("failed to add book");
  }
  return res.json();
}
