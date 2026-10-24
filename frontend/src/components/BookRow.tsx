import { Pressable, StyleSheet, Text, View } from "react-native";

import { shortDate } from "../format";
import { colors, sans } from "../theme";
import type { Book } from "../types/book";
import BookCover from "./BookCover";

type Props = {
  book: Book;
  canEdit: boolean;
  confirming: boolean;
  onOpen: (book: Book) => void;
  onEdit: (book: Book) => void;
  onAskDelete: (book: Book) => void;
  onConfirmDelete: (book: Book) => void;
  onCancelDelete: () => void;
};

function stockLabel(book: Book) {
  if (book.available <= 0) {
    return "out";
  }
  if (book.copies > 1) {
    return `${book.available} of ${book.copies} in`;
  }
  return "in";
}

export default function BookRow({
  book,
  canEdit,
  confirming,
  onOpen,
  onEdit,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: Props) {
  const when = shortDate(book.created_at);
  const due = book.my_loan ? shortDate(book.my_loan.due_at) : "";
  const stock = stockLabel(book);

  return (
    <View style={styles.card}>
      <BookCover title={book.title} />
      <View style={styles.body}>
        <Pressable onPress={() => onOpen(book)}>
          <Text style={styles.title} numberOfLines={2}>
            {book.title}
          </Text>
          <Text style={styles.author} numberOfLines={1}>
            {book.author}
          </Text>
          <Text style={styles.meta}>
            {book.genre}
            {when ? `   ·   ${when}` : ""}
          </Text>
          <Text style={[styles.stock, book.available <= 0 && styles.stockOut]}>
            {stock}
            {due ? `   ·   due ${due}` : ""}
            {book.my_loan?.late ? "   ·   late" : ""}
          </Text>
        </Pressable>
        {canEdit ? (
          confirming ? (
            <View style={styles.actions}>
              <Text style={styles.ask}>remove this title?</Text>
              <Pressable onPress={() => onConfirmDelete(book)} hitSlop={8}>
                <Text style={styles.remove}>yes</Text>
              </Pressable>
              <Pressable onPress={onCancelDelete} hitSlop={8}>
                <Text style={styles.edit}>keep</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.actions}>
              <Pressable onPress={() => onEdit(book)} hitSlop={8}>
                <Text style={styles.edit}>edit</Text>
              </Pressable>
              <Pressable onPress={() => onAskDelete(book)} hitSlop={8}>
                <Text style={styles.remove}>remove</Text>
              </Pressable>
            </View>
          )
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...sans,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "700",
    color: colors.ink,
  },
  author: {
    ...sans,
    marginTop: 4,
    fontSize: 14,
    color: colors.muted,
  },
  meta: {
    ...sans,
    marginTop: 8,
    fontSize: 12,
    letterSpacing: 0.3,
    color: colors.gold,
  },
  stock: {
    ...sans,
    marginTop: 4,
    fontSize: 12,
    color: colors.forestMid,
  },
  stockOut: {
    color: colors.danger,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 10,
  },
  edit: {
    ...sans,
    fontSize: 13,
    fontWeight: "600",
    color: colors.forestMid,
  },
  remove: {
    ...sans,
    fontSize: 13,
    fontWeight: "600",
    color: colors.danger,
  },
  ask: {
    ...sans,
    fontSize: 13,
    color: colors.muted,
  },
});
