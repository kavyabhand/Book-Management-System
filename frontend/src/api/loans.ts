import type { Loan } from "../types/loan";
import { apiFetch, readBody } from "./client";

export async function fetchMyLoans(): Promise<Loan[]> {
  const res = await apiFetch("/loans/mine");
  return readBody<Loan[]>(res, "could not load your loans");
}

export async function fetchAllLoans(): Promise<Loan[]> {
  const res = await apiFetch("/loans");
  return readBody<Loan[]>(res, "could not load loans");
}

export async function borrowBook(bookId: string): Promise<Loan> {
  const res = await apiFetch("/loans", {
    method: "POST",
    body: JSON.stringify({ book_id: bookId }),
  });
  return readBody<Loan>(res, "could not borrow");
}

export async function returnLoan(loanId: string): Promise<Loan> {
  const res = await apiFetch(`/loans/${loanId}/return`, { method: "POST" });
  return readBody<Loan>(res, "could not return");
}
