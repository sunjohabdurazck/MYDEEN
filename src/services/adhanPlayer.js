// src/services/adhanPlayer.js
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADHAN_FILES = {
  default: require('../../assets/adhan.mp3'),
  mecca: require('../../assets/adhan_mecca.mp3'),
  medina: require('../../assets/adhan_medina.mp3'),
  egypt: require('../../assets/adhan_egypt.mp3'),
};

export class AdhanPlayer {
  static currentSound = null;
  static isPlaying = false;

  static async play(muezzin = 'default', volume = 1.0) {
    await this.stop();
    
    const sound = new Audio.Sound();
    try {
      await sound.loadAsync(ADHAN_FILES[muezzin] || ADHAN_FILES.default);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      await sound.setVolumeAsync(volume);
      await sound.playAsync();
      
      this.currentSound = sound;
      this.isPlaying = true;
      
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) {
          this.isPlaying = false;
          this.currentSound = null;
        }
      });
      
      return true;
    } catch (error) {
      console.error('Failed to play adhan:', error);
      return false;
    }
  }

  static async stop() {
    if (this.currentSound) {
      await this.currentSound.stopAsync();
      await this.currentSound.unloadAsync();
      this.currentSound = null;
      this.isPlaying = false;
    }
  }

  static async setVolume(volume) {
    if (this.currentSound) {
      await this.currentSound.setVolumeAsync(volume);
    }
  }
}