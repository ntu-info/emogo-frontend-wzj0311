import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Video, ResizeMode } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import { insertRecord } from '../utils/database';

const SENTIMENT_LABELS = {
  1: "Very Bad",
  2: "Bad",
  3: "Neutral",
  4: "Good",
  5: "Very Good"
};

export default function HomeScreen() {
  const [facing, setFacing] = useState('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [sentiment, setSentiment] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUri, setRecordedVideoUri] = useState(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      await requestPermission();
      await requestMicPermission();
      await requestMediaPermission();
      await Location.requestForegroundPermissionsAsync();
    })();
  }, []);

  if (!permission || !micPermission || !mediaPermission) {
    return <View style={styles.container}><ActivityIndicator /></View>;
  }

  if (!permission.granted || !micPermission.granted || !mediaPermission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera and access media library</Text>
        <TouchableOpacity onPress={() => {
          requestPermission();
          requestMediaPermission();
        }} style={styles.button}>
          <Text style={styles.text}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const recordVideo = async () => {
    if (cameraRef.current && !isRecording) {
      setIsRecording(true);
      try {
        const video = await cameraRef.current.recordAsync({ maxDuration: 1 });
        setRecordedVideoUri(video.uri);
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Failed to record vlog.");
      } finally {
        setIsRecording(false);
      }
    }
  };

  const retakeVideo = () => {
    setRecordedVideoUri(null);
    setSentiment(null);
  };

  const saveRecord = async () => {
    if (!recordedVideoUri || !sentiment) return;

    try {
      // Get Location (Optional)
      let latitude = null;
      let longitude = null;
      try {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        latitude = location.coords.latitude;
        longitude = location.coords.longitude;
      } catch (locError) {
        console.log("Location retrieval failed, saving without location:", locError);
      }
      
      // Save to MediaLibrary
      const asset = await MediaLibrary.createAssetAsync(recordedVideoUri);
      
      // Save to DB
      await insertRecord(
        asset.uri,
        asset.id,
        sentiment,
        latitude,
        longitude
      );

      Alert.alert("Success", "Record saved!");
      setRecordedVideoUri(null);
      setSentiment(null);
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", `Failed to save record: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        {recordedVideoUri ? (
          <Video
            style={styles.camera}
            source={{ uri: recordedVideoUri }}
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay
          />
        ) : (
          <CameraView 
            style={styles.camera} 
            facing={facing} 
            mode="video"
            ref={cameraRef}
          >
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
                <Text style={styles.text}>Flip</Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        )}
        
        {/* Record/Retake Button Overlay */}
        <View style={styles.overlayContainer}>
          {recordedVideoUri ? (
            <TouchableOpacity style={styles.retakeButton} onPress={retakeVideo}>
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.recordButtonOverlay, isRecording && styles.recordButtonDisabled]}
              onPress={recordVideo}
              disabled={isRecording}
            >
              <View style={styles.recordButtonInner} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.controlsContainer}>
        <Text style={styles.label}>
          {sentiment ? `Feeling: ${SENTIMENT_LABELS[sentiment]}` : "How are you feeling?"}
        </Text>
        <View style={styles.sentimentContainer}>
          {[1, 2, 3, 4, 5].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.sentimentButton,
                sentiment === level && styles.sentimentButtonSelected
              ]}
              onPress={() => setSentiment(level)}
            >
              <Text style={[
                styles.sentimentText,
                sentiment === level && styles.sentimentTextSelected
              ]}>{level}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.labelsContainer}>
          <Text style={styles.labelText}>Bad</Text>
          <Text style={styles.labelText}>Good</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton, 
            (!recordedVideoUri || !sentiment) && styles.saveButtonDisabled
          ]}
          onPress={saveRecord}
          disabled={!recordedVideoUri || !sentiment}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
  },
  cameraContainer: {
    flex: 1,
    margin: 10,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'transparent',
    margin: 20,
  },
  flipButton: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  overlayContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonOverlay: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  recordButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FF3B30',
  },
  retakeButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retakeText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  controlsContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
  },
  label: {
    fontSize: 18,
    marginBottom: 15,
    fontWeight: '600',
    color: '#333',
  },
  sentimentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 5,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  labelText: {
    fontSize: 12,
    color: '#888',
  },
  sentimentButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sentimentButtonSelected: {
    backgroundColor: '#007AFF',
  },
  sentimentText: {
    fontSize: 20,
    color: '#333',
  },
  sentimentTextSelected: {
    color: 'white',
  },
  saveButton: {
    backgroundColor: '#34C759',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  recordButtonDisabled: {
    opacity: 0.5,
  },
});
