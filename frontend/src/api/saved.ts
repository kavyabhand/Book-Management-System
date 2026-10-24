import type { Book } from "../types/book";
import { apiFetch, readBody } from "./client";

export async function fetchSaved(): Promise<Book[]> {
  const res = await apiFetch("/saved");
  return readBody<Book[]>(res, "could not load your list");
}

export async function saveBook(bookId: string): Promise<Book> {
  const res = await apiFetch(`/saved/${bookId}`, { method: "POST" });
  return readBody<Book>(res, "could not save");
}

export async function unsaveBook(bookId: string): Promise<void> {
  const res = await apiFetch(`/saved/${bookId}`, { method: "DELETE" });
  await readBody<void>(res, "could not remove");
}
