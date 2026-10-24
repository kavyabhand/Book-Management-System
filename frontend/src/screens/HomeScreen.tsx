import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  createBook,
  deleteBook,
  fetchBookPage,
  updateBook,
} from "../api/books";
import BookRow from "../components/BookRow";
import TopBar, { type LibraryTab } from "../components/TopBar";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { getRole } from "../storage/session";
import { colors, fieldReset, sans, serif } from "../theme";
import { shelves, type Book, type Shelf, type SortKey } from "../types/book";

type Props = {
  onLogout: () => void;
  onOpenBook: (id: string) => void;
  onTab: (tab: LibraryTab) => void;
};

const sorts: { id: SortKey; label: string }[] = [
  { id: "newest", label: "newest" },
  { id: "title", label: "title" },
  { id: "author", label: "author" },
];

export default function HomeScreen({ onLogout, onOpenBook, onTab }: Props) {
  const canEdit = getRole() === "admin";
  const listRef = useRef<FlatList<Book>>(null);

  const [books, setBooks] = useState<Book[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);
  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [sort, setSort] = useState<SortKey>("newest");

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [genre, setGenre] = useState<Shelf>("fiction");
  const [year, setYear] = useState("");
  const [copies, setCopies] = useState("1");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deskOpen, setDeskOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const requestId = useRef(0);

  const fail = useCallback(
    (err: unknown, fallback: string) => {
      if (err instanceof Error && err.message === "session expired") {
        onLogout();
        return;
      }
      setError(err instanceof Error ? err.message : fallback);
    },
    [onLogout]
  );

  const loadFirstPage = useCallback(async (query: string) => {
    const id = ++requestId.current;
    setError(null);
    const page = await fetchBookPage({ q: query, limit: 8, genre: shelf, sort });
    if (id !== requestId.current) {
      return;
    }
    setBooks(page.items);
    setNextCursor(page.next_cursor);
  }, [shelf, sort]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadFirstPage(debouncedSearch)
      .catch((err) => {
        if (active) {
          fail(err, "could not load books");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [debouncedSearch, fail, loadFirstPage]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadFirstPage(debouncedSearch);
    } catch (err) {
      fail(err, "refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  async function onLoadMore() {
    if (!nextCursor || loadingMore || loading) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await fetchBookPage({
        q: debouncedSearch,
        cursor: nextCursor,
        limit: 8,
        genre: shelf,
        sort,
      });
      setBooks((prev) => [...prev, ...page.items]);
      setNextCursor(page.next_cursor);
    } catch (err) {
      fail(err, "could not load more");
    } finally {
      setLoadingMore(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setDeskOpen(false);
    setTitle("");
    setAuthor("");
    setIsbn("");
    setGenre("fiction");
    setYear("");
    setCopies("1");
    setDescription("");
  }

  function startEdit(book: Book) {
    setPendingDeleteId(null);
    setDeskOpen(true);
    setEditingId(book.id);
    setTitle(book.title);
    setAuthor(book.author);
    setIsbn(book.isbn ?? "");
    setGenre((shelves as readonly string[]).includes(book.genre) ? (book.genre as Shelf) : "fiction");
    setYear(book.year ? String(book.year) : "");
    setCopies(String(book.copies || 1));
    setDescription(book.description ?? "");
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  async function handleSave() {
    const trimmedTitle = title.trim();
    const trimmedAuthor = author.trim();
    const copyCount = Number(copies);
    const yearNumber = year.trim() ? Number(year) : null;
    if (!trimmedTitle || !trimmedAuthor) {
      setError("title and author are required");
      return;
    }
    if (!Number.isInteger(copyCount) || copyCount < 1) {
      setError("copies has to be at least 1");
      return;
    }
    if (yearNumber !== null && (!Number.isInteger(yearNumber) || yearNumber < 1000)) {
      setError("year looks wrong");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: trimmedTitle,
        author: trimmedAuthor,
        isbn: isbn.trim() || null,
        genre,
        description: description.trim() || null,
        year: yearNumber,
        copies: copyCount,
      };
      if (editingId) {
        await updateBook(editingId, payload);
      } else {
        await createBook(payload);
      }
      resetForm();
      await loadFirstPage(debouncedSearch);
    } catch (err) {
      fail(err, editingId ? "update failed" : "create failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(book: Book) {
    setError(null);
    setPendingDeleteId(null);
    try {
      await deleteBook(book.id);
      if (editingId === book.id) {
        resetForm();
      }
      await loadFirstPage(debouncedSearch);
    } catch (err) {
      fail(err, "delete failed");
    }
  }

  const searching = search.trim() !== debouncedSearch.trim();
  const countLabel = `showing ${books.length}`;
  const canSave = title.trim().length > 0 && author.trim().length > 0 && !saving;

  const listHeader = (
    <View style={styles.listHeader}>
      {canEdit && deskOpen ? (
        <View style={styles.desk}>
          <Text style={styles.deskKicker}>librarian desk</Text>
          <Text style={styles.deskTitle}>
            {editingId ? "edit this title" : "add a title"}
          </Text>
          <Text style={styles.label}>title</Text>
          <TextInput
            style={styles.input}
            placeholder="name of the book"
            placeholderTextColor={colors.muted}
            value={title}
            onChangeText={setTitle}
          />
          <Text style={styles.label}>author</Text>
          <TextInput
            style={styles.input}
            placeholder="who wrote it"
            placeholderTextColor={colors.muted}
            value={author}
            onChangeText={setAuthor}
          />
          <Text style={styles.label}>isbn</Text>
          <TextInput
            style={styles.input}
            placeholder="optional"
            placeholderTextColor={colors.muted}
            value={isbn}
            onChangeText={setIsbn}
            autoCapitalize="none"
          />
          <Text style={styles.label}>shelf</Text>
          <View style={styles.chipRow}>
            {shelves.map((item) => (
              <Pressable
                key={item}
                style={[styles.chip, genre === item && styles.chipOn]}
                onPress={() => setGenre(item)}
              >
                <Text style={[styles.chipText, genre === item && styles.chipTextOn]}>{item}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>year</Text>
          <TextInput
            style={styles.input}
            placeholder="optional"
            placeholderTextColor={colors.muted}
            value={year}
            onChangeText={setYear}
            keyboardType="number-pad"
          />
          <Text style={styles.label}>copies</Text>
          <TextInput
            style={styles.input}
            placeholder="1"
            placeholderTextColor={colors.muted}
            value={copies}
            onChangeText={setCopies}
            keyboardType="number-pad"
          />
          <Text style={styles.label}>note</Text>
          <TextInput
            style={[styles.input, styles.noteInput]}
            placeholder="a line about the book"
            placeholderTextColor={colors.muted}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <View style={styles.formActions}>
            <Pressable style={styles.ghost} onPress={resetForm}>
              <Text style={styles.ghostText}>cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.save, !canSave && styles.saveOff]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <Text style={[styles.saveText, !canSave && styles.saveTextOff]}>
                {saving ? "saving…" : editingId ? "save changes" : "add to catalog"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : !canEdit ? (
        <View style={styles.readerNote}>
          <Text style={styles.readerTitle}>browsing as a reader</Text>
          <Text style={styles.readerBody}>
            you can search, borrow, and save. adding titles stays with the librarian.
          </Text>
        </View>
      ) : null}

      {canEdit && !deskOpen ? (
        <Pressable style={styles.addLink} onPress={() => setDeskOpen(true)}>
          <Text style={styles.addLinkText}>add a title</Text>
        </Pressable>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shelves}
      >
        <Pressable
          style={[styles.chip, shelf === null && styles.chipOn]}
          onPress={() => setShelf(null)}
        >
          <Text style={[styles.chipText, shelf === null && styles.chipTextOn]}>all</Text>
        </Pressable>
        {shelves.map((item) => (
          <Pressable
            key={item}
            style={[styles.chip, shelf === item && styles.chipOn]}
            onPress={() => setShelf(item)}
          >
            <Text style={[styles.chipText, shelf === item && styles.chipTextOn]}>{item}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.sortRow}>
        {sorts.map((item) => (
          <Pressable key={item.id} onPress={() => setSort(item.id)} hitSlop={6}>
            <Text style={[styles.sortText, sort === item.id && styles.sortOn]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.section}>
          {debouncedSearch.trim() ? "matches" : "catalog"}
        </Text>
        {!loading ? <Text style={styles.sectionCount}>{countLabel}</Text> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );

  return (
    <View style={styles.page}>
      <TopBar tab="catalog" onTab={onTab} onLogout={onLogout} />
      <View style={styles.column}>
        <View style={styles.header}>
          <View style={[styles.search, searchFocused && styles.searchFocused]}>
            <TextInput
              style={styles.searchInput}
              placeholder="search title or author"
              placeholderTextColor={colors.muted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              selectionColor={colors.forest}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            {search ? (
              <Pressable onPress={() => setSearch("")} hitSlop={8}>
                <Text style={styles.clear}>clear</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.searching}>{searching ? "searching…" : " "}</Text>
        </View>

        {loading && books.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.forest} />
            <Text style={styles.loadingText}>opening the catalog…</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={books}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={listHeader}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.forest}
              />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>nothing on this shelf</Text>
                <Text style={styles.emptyBody}>
                  {debouncedSearch.trim()
                    ? "try a shorter piece of the title or the author’s name."
                    : "the catalog is empty."}
                </Text>
              </View>
            }
            ListFooterComponent={
              <View style={styles.footer}>
                {loadingMore ? <ActivityIndicator color={colors.forest} /> : null}
                {nextCursor && !loadingMore ? (
                  <Pressable style={styles.more} onPress={onLoadMore}>
                    <Text style={styles.moreText}>show more</Text>
                  </Pressable>
                ) : null}
                {!nextCursor && books.length > 0 ? (
                  <Text style={styles.end}>end of the catalog</Text>
                ) : null}
              </View>
            }
            renderItem={({ item }) => (
              <BookRow
                book={item}
                canEdit={canEdit}
                confirming={pendingDeleteId === item.id}
                onOpen={(book) => onOpenBook(book.id)}
                onEdit={startEdit}
                onAskDelete={(book) => setPendingDeleteId(book.id)}
                onConfirmDelete={handleDelete}
                onCancelDelete={() => setPendingDeleteId(null)}
              />
            )}
          />
        )}
      </View>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
  },
  column: {
    flex: 1,
    width: "100%",
    maxWidth: 760,
    backgroundColor: colors.paper,
  },
  header: {
    paddingBottom: 8,
  },
  search: {
    marginTop: 18,
    marginHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  searchFocused: {
    borderColor: colors.forest,
  },
  searchInput: {
    ...sans,
    ...fieldReset,
    flex: 1,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 12,
  },
  clear: {
    ...sans,
    color: colors.forestMid,
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 8,
  },
  searching: {
    ...sans,
    marginTop: 6,
    marginLeft: 26,
    fontSize: 12,
    color: colors.muted,
  },
  shelves: {
    gap: 8,
    paddingBottom: 8,
  },
  sortRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 12,
  },
  sortText: {
    ...sans,
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  sortOn: {
    color: colors.ink,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipOn: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  chipText: {
    ...sans,
    fontSize: 13,
    color: colors.muted,
    fontWeight: "600",
  },
  chipTextOn: {
    color: colors.cream,
  },
  noteInput: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  listContent: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  listHeader: {
    paddingTop: 18,
  },
  desk: {
    backgroundColor: colors.paper,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    marginBottom: 22,
  },
  deskKicker: {
    ...sans,
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  deskTitle: {
    ...serif,
    fontSize: 26,
    lineHeight: 30,
    color: colors.ink,
    marginTop: 4,
    marginBottom: 14,
  },
  label: {
    ...sans,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 6,
  },
  input: {
    ...sans,
    ...fieldReset,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#FBF9F4",
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.ink,
    marginBottom: 12,
  },
  formActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  ghost: {
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostText: {
    ...sans,
    color: colors.muted,
    fontWeight: "600",
  },
  save: {
    flex: 1,
    backgroundColor: colors.forest,
    borderRadius: 0,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  saveOff: {
    backgroundColor: "#DDD6CA",
  },
  saveText: {
    ...sans,
    color: colors.cream,
    fontWeight: "600",
    fontSize: 15,
  },
  saveTextOff: {
    color: colors.muted,
  },
  addLink: {
    backgroundColor: colors.forest,
    borderRadius: 0,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  addLinkText: {
    ...sans,
    color: colors.cream,
    fontSize: 15,
    fontWeight: "600",
  },
  readerNote: {
    backgroundColor: colors.sage,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 22,
  },
  readerTitle: {
    ...serif,
    fontSize: 18,
    color: colors.forest,
  },
  readerBody: {
    ...sans,
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: colors.forestMid,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  section: {
    ...serif,
    fontSize: 22,
    color: colors.ink,
  },
  sectionCount: {
    ...sans,
    color: colors.muted,
    fontSize: 13,
  },
  error: {
    ...sans,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: 0,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 14,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    ...sans,
    marginTop: 12,
    color: colors.muted,
  },
  empty: {
    paddingVertical: 36,
  },
  emptyTitle: {
    ...serif,
    fontSize: 22,
    color: colors.ink,
  },
  emptyBody: {
    ...sans,
    marginTop: 6,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  more: {
    borderWidth: 1,
    borderColor: colors.forest,
    borderRadius: 0,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  moreText: {
    ...sans,
    color: colors.forest,
    fontWeight: "600",
    fontSize: 14,
  },
  end: {
    ...sans,
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 0.4,
  },
});
