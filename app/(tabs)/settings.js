import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Platform, TouchableOpacity, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getNotificationSettings, saveNotificationSettings, DEFAULT_NOTIFICATIONS } from '../utils/notifications';

export default function SettingsScreen() {
  const [settings, setSettings] = useState(DEFAULT_NOTIFICATIONS);
  const [showPicker, setShowPicker] = useState(null); // 'morning', 'afternoon', 'evening' or null

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const loadedSettings = await getNotificationSettings();
    setSettings(loadedSettings);
  };

  const updateTime = (key, event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowPicker(null);
    }
    
    if (selectedDate) {
      const newSettings = {
        ...settings,
        [key]: {
          ...settings[key],
          hour: selectedDate.getHours(),
          minute: selectedDate.getMinutes(),
        },
      };
      setSettings(newSettings);
      saveNotificationSettings(newSettings);
    }
  };

  const toggleSwitch = (key) => {
    const newSettings = {
      ...settings,
      [key]: {
        ...settings[key],
        enabled: !settings[key].enabled,
      },
    };
    setSettings(newSettings);
    saveNotificationSettings(newSettings);
  };

  const formatTime = (hour, minute) => {
    const date = new Date();
    date.setHours(hour);
    date.setMinutes(minute);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderSettingItem = (key, label) => {
    const setting = settings[key];
    const date = new Date();
    date.setHours(setting.hour);
    date.setMinutes(setting.minute);

    return (
      <View style={styles.settingItem}>
        <View style={styles.settingHeader}>
          <Text style={styles.settingLabel}>{label}</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={setting.enabled ? "#007AFF" : "#f4f3f4"}
            onValueChange={() => toggleSwitch(key)}
            value={setting.enabled}
          />
        </View>
        
        {setting.enabled && (
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>Notification Time:</Text>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={date}
                mode="time"
                display="compact"
                onChange={(e, d) => updateTime(key, e, d)}
                style={{ width: 100 }}
              />
            ) : (
              <TouchableOpacity 
                onPress={() => setShowPicker(key)}
                style={styles.timeButton}
              >
                <Text style={styles.timeButtonText}>{formatTime(setting.hour, setting.minute)}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {Platform.OS === 'android' && showPicker === key && (
          <DateTimePicker
            value={date}
            mode="time"
            display="default"
            onChange={(e, d) => updateTime(key, e, d)}
          />
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Notification Settings</Text>
      
      {renderSettingItem('morning', 'Morning Reminder')}
      {renderSettingItem('afternoon', 'Afternoon Reminder')}
      {renderSettingItem('evening', 'Evening Reminder')}
      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#333',
  },
  settingItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  settingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  timeText: {
    fontSize: 16,
    color: '#666',
  },
  timeButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  timeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});
