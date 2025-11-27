import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

export const DEFAULT_NOTIFICATIONS = {
  morning: { hour: 10, minute: 0, enabled: true },
  afternoon: { hour: 15, minute: 0, enabled: true },
  evening: { hour: 20, minute: 0, enabled: true },
};

export async function registerForPushNotificationsAsync() {
  let token;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    // alert('Failed to get push token for push notification!');
    console.log('Failed to get push token for push notification!');
    return;
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
}

export async function getNotificationSettings() {
  try {
    const jsonValue = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : DEFAULT_NOTIFICATIONS;
  } catch (e) {
    console.error("Error reading notification settings", e);
    return DEFAULT_NOTIFICATIONS;
  }
}

export async function saveNotificationSettings(settings) {
  try {
    await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
    await scheduleDailyNotifications(); // Reschedule immediately
  } catch (e) {
    console.error("Error saving notification settings", e);
  }
}

export async function scheduleDailyNotifications() {
  // Cancel all existing notifications to avoid duplicates
  await Notifications.cancelAllScheduledNotificationsAsync();

  const settings = await getNotificationSettings();

  const schedules = [
    { ...settings.morning, title: "早安！", body: "記得記錄一下現在的心情喔！" },
    { ...settings.afternoon, title: "午安！", body: "下午茶時間，來拍個一秒影片吧！" },
    { ...settings.evening, title: "晚安！", body: "今天過得如何？記錄下來吧！" },
  ];

  for (const schedule of schedules) {
    if (schedule.enabled) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: schedule.title,
          body: schedule.body,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: schedule.hour,
          minute: schedule.minute,
        },
      });
    }
  }
}
