export type Book = {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  created_at: string;
};

export type BookPage = {
  items: Book[];
  next_cursor: string | null;
};
