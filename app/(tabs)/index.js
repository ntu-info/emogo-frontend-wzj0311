import { View, Text, Button, StyleSheet } from "react-native";
import { Link } from "expo-router";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      {/* Simple title for the tab */}
      <Text style={styles.title}>Home tab</Text>

      {/* Link component performs client side navigation to another route */}
      <Link href="/details" style={styles.link}>
        Go to details screen (Stack)
      </Link>

      {/* Link to another tab by using its path */}
      <Link href="/(tabs)/settings" style={styles.link}>
        Go to Settings tab
      </Link>

      {/* Button can also navigate by using Link as child */}
      <Link href="/details" asChild>
        <Button title="Open details as stack screen" />
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  title: {
    fontSize: 24,
    marginBottom: 24,
  },
  link: {
    fontSize: 16,
    marginBottom: 12,
    textDecorationLine: "underline",
  },
});
