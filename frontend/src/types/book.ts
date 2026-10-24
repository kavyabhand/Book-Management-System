export const shelves = ["fiction", "fantasy", "history", "memoir", "science"] as const;

export type Shelf = (typeof shelves)[number];

export type SortKey = "newest" | "title" | "author";

export type MyLoan = {
  id: string;
  due_at: string;
  late: boolean;
};

export type Book = {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  genre: string;
  description: string | null;
  year: number | null;
  copies: number;
  available: number;
  saved: boolean;
  my_loan: MyLoan | null;
  created_at: string;
};

export type BookPage = {
  items: Book[];
  next_cursor: string | null;
};

export type BookInput = {
  title: string;
  author: string;
  isbn?: string | null;
  genre: string;
  description?: string | null;
  year?: number | null;
  copies: number;
};
