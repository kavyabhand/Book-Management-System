export type Loan = {
  id: string;
  book_id: string;
  title: string;
  author: string;
  username: string | null;
  borrowed_at: string;
  due_at: string;
  late: boolean;
};
