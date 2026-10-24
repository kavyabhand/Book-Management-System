import { StyleSheet, Text, View } from "react-native";

import { colors, sans } from "../theme";

type Props = {
  title: string;
};

export default function BookCover({ title }: Props) {
  const letter = (title.trim()[0] || "b").toUpperCase();

  return (
    <View style={styles.cover}>
      <View style={styles.mark} />
      <Text style={styles.letter}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    width: 44,
    height: 58,
    borderWidth: 1,
    borderColor: colors.ink,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  mark: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.gold,
  },
  letter: {
    ...sans,
    color: colors.ink,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 22,
  },
});
