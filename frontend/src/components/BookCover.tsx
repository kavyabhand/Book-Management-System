import { StyleSheet, Text, View } from "react-native";

import { serif } from "../theme";

const COVERS = [
  "#234038",
  "#3E4C6A",
  "#6E4636",
  "#7A6232",
  "#4A3D55",
  "#2E5348",
  "#5C3A3A",
  "#3D5360",
];

function coverColor(title: string) {
  let hash = 0;
  for (const char of title) {
    hash = (hash * 33 + char.charCodeAt(0)) % 997;
  }
  return COVERS[hash % COVERS.length];
}

type Props = {
  title: string;
};

export default function BookCover({ title }: Props) {
  const letter = (title.trim()[0] || "b").toUpperCase();

  return (
    <View style={[styles.cover, { backgroundColor: coverColor(title) }]}>
      <Text style={styles.letter}>{letter}</Text>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    width: 62,
    height: 88,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  letter: {
    ...serif,
    color: "#F7F4EE",
    fontSize: 28,
    lineHeight: 32,
  },
  rule: {
    position: "absolute",
    bottom: 10,
    width: 22,
    height: 2,
    borderRadius: 1,
    backgroundColor: "rgba(247, 244, 238, 0.45)",
  },
});
