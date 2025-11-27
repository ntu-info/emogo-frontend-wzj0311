import { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Video, ResizeMode } from 'expo-av';
import { writeAsStringAsync, readAsStringAsync, deleteAsync, cacheDirectory, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import JSZip from 'jszip';
import { fetchRecords } from '../utils/database';

export default function HistoryScreen() {
  const [records, setRecords] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [])
  );

  const loadRecords = async () => {
    const data = await fetchRecords();
    setRecords(data);
  };

  const exportData = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const timestamp = new Date().getTime();
      const zipFile = cacheDirectory + `emogo_export_${timestamp}.zip`;
      const zip = new JSZip();

      const exportRecords = [];

      for (const record of records) {
        let videoFileName = `video_${record.id}.mp4`;
        let videoAdded = false;

        try {
          let sourceUri = null;
          if (record.assetId) {
            const assetInfo = await MediaLibrary.getAssetInfoAsync(record.assetId);
            if (assetInfo) {
              if (assetInfo.localUri) {
                sourceUri = assetInfo.localUri;
              } else if (assetInfo.uri && !assetInfo.uri.startsWith('ph://')) {
                sourceUri = assetInfo.uri;
              }
            }
          } else if (record.videoUri && (record.videoUri.startsWith('file://') || record.videoUri.startsWith('content://'))) {
             sourceUri = record.videoUri;
          }

          if (sourceUri) {
            // Read video as base64
            const videoContent = await readAsStringAsync(sourceUri, { encoding: 'base64' });
            zip.file(videoFileName, videoContent, { base64: true });
            videoAdded = true;
          } else {
            console.log(`No source URI found for record ${record.id}`);
          }
        } catch (e) {
          console.log(`Failed to add video for record ${record.id}:`, e);
        }

        exportRecords.push({
          ...record,
          videoUri: videoAdded ? videoFileName : null, // Relative path in zip
          originalVideoUri: record.videoUri
        });
      }

      // Add JSON
      zip.file('records.json', JSON.stringify(exportRecords, null, 2));

      // Generate zip
      const zipContent = await zip.generateAsync({ type: 'base64' });
      await writeAsStringAsync(zipFile, zipContent, { encoding: 'base64' });

      // Share
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Error", "Sharing is not available on this device");
        return;
      }
      
      await Sharing.shareAsync(zipFile);

      // Cleanup
      try {
        await deleteAsync(zipFile, { idempotent: true });
      } catch (e) {
        console.log("Cleanup error", e);
      }

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to export data: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.date}>{new Date(item.timestamp).toLocaleString()}</Text>
        <View style={styles.sentimentBadge}>
          <Text style={styles.sentimentText}>Mood: {item.sentiment}</Text>
        </View>
      </View>
      
      <Text style={styles.location}>
        Loc: {item.latitude?.toFixed(4)}, {item.longitude?.toFixed(4)}
      </Text>

      <Video
        style={styles.video}
        source={{ uri: item.videoUri }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        isLooping
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>History</Text>
        <TouchableOpacity 
          style={[styles.exportButton, isExporting && styles.exportButtonDisabled]} 
          onPress={exportData}
          disabled={isExporting}
        >
          <Text style={styles.exportButtonText}>{isExporting ? 'Exporting...' : 'Export'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={records}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No records yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  exportButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  exportButtonDisabled: {
    backgroundColor: '#ccc',
  },
  exportButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  date: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  sentimentBadge: {
    backgroundColor: '#E1F5FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sentimentText: {
    color: '#0288D1',
    fontWeight: 'bold',
  },
  location: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  video: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
    borderRadius: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#999',
    fontSize: 16,
  },
});
