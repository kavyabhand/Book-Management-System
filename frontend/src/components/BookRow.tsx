import { Pressable, StyleSheet, Text, View } from "react-native";

import { cardShadow, colors, sans, serif } from "../theme";
import type { Book } from "../types/book";
import BookCover from "./BookCover";

type Props = {
  book: Book;
  canEdit: boolean;
  confirming: boolean;
  onEdit: (book: Book) => void;
  onAskDelete: (book: Book) => void;
  onConfirmDelete: (book: Book) => void;
  onCancelDelete: () => void;
};

function addedOn(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date
    .toLocaleDateString(undefined, { day: "numeric", month: "short" })
    .toLowerCase();
}

export default function BookRow({
  book,
  canEdit,
  confirming,
  onEdit,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: Props) {
  const when = addedOn(book.created_at);
  const meta = [book.isbn, when].filter(Boolean).join("   ·   ");

  return (
    <View style={styles.card}>
      <BookCover title={book.title} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {book.author}
        </Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
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
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    ...cardShadow,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...serif,
    fontSize: 18,
    lineHeight: 22,
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
