import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { clearSession, getRole, getUsername } from "../storage/session";
import { colors, sans } from "../theme";

export type LibraryTab = "catalog" | "loans" | "saved";

type Props = {
  tab: LibraryTab;
  onTab: (tab: LibraryTab) => void;
  onLogout: () => void;
};

const READER_TABS: { id: LibraryTab; label: string }[] = [
  { id: "catalog", label: "catalog" },
  { id: "loans", label: "loans" },
  { id: "saved", label: "saved" },
];

const LIBRARIAN_TABS: { id: LibraryTab; label: string }[] = [
  { id: "catalog", label: "catalog" },
  { id: "loans", label: "out" },
];

export default function TopBar({ tab, onTab, onLogout }: Props) {
  const canEdit = getRole() === "admin";
  const username = getUsername();
  const tabs = canEdit ? LIBRARIAN_TABS : READER_TABS;

  function signOut() {
    clearSession();
    onLogout();
  }

  return (
    <View style={styles.band}>
      <View style={styles.wrap}>
      <View style={styles.top}>
        <View>
          <Text style={styles.wordmark}>bookstack</Text>
          <Text style={styles.hello}>{username || "signed in"}</Text>
        </View>
        <View style={styles.actions}>
          <View style={[styles.pill, canEdit ? styles.pillAdmin : styles.pillReader]}>
            <Text style={[styles.pillText, canEdit && styles.pillTextAdmin]}>
              {canEdit ? "librarian" : "reader"}
            </Text>
          </View>
          <Pressable onPress={signOut} hitSlop={8}>
            <Text style={styles.signOut}>sign out</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.tabs}>
        {tabs.map((item) => {
          const on = item.id === tab;
          return (
            <Pressable key={item.id} onPress={() => onTab(item.id)} hitSlop={6}>
              <Text style={[styles.tab, on && styles.tabOn]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    width: "100%",
    backgroundColor: colors.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
  },
  wrap: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    paddingTop: Platform.OS === "web" ? 22 : 52,
    paddingHorizontal: 22,
    paddingBottom: 0,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  wordmark: {
    ...sans,
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: colors.ink,
  },
  hello: {
    ...sans,
    marginTop: 2,
    fontSize: 13,
    color: colors.muted,
  },
  actions: {
    alignItems: "flex-end",
    gap: 8,
    paddingTop: 2,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  pillAdmin: {
    backgroundColor: colors.ink,
  },
  pillReader: {
    backgroundColor: colors.paper,
  },
  pillText: {
    ...sans,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.ink,
  },
  pillTextAdmin: {
    color: colors.paper,
  },
  signOut: {
    ...sans,
    fontSize: 13,
    color: colors.ink,
    fontWeight: "600",
  },
  tabs: {
    flexDirection: "row",
    gap: 22,
    marginTop: 18,
  },
  tab: {
    ...sans,
    fontSize: 13,
    color: colors.muted,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    paddingBottom: 10,
  },
  tabOn: {
    color: colors.ink,
    borderBottomWidth: 2,
    borderBottomColor: colors.gold,
  },
});
