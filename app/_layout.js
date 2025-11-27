import { Stack } from "expo-router";
import { useEffect } from "react";
import * as Notifications from 'expo-notifications';
import { initDatabase } from "./utils/database";
import { registerForPushNotificationsAsync, scheduleDailyNotifications } from "./utils/notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  useEffect(() => {
    const setup = async () => {
      await initDatabase();
      await registerForPushNotificationsAsync();
      await scheduleDailyNotifications();
    };
    setup();
  }, []);

  return (
    <>
      {/* Root stack controls screen transitions for the whole app */}
      <Stack>
        {/* The (tabs) group is one Stack screen with its own tab navigator */}
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        {/* This screen is pushed on top of tabs when you navigate to /details */}
        <Stack.Screen
          name="details"
          options={{ title: "Details" }}
        />
      </Stack>
    </>
  );
}
