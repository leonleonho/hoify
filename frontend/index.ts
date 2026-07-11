import TrackPlayer from '@rntp/player';
import { handleBackgroundEvent } from './src/features/player/services/PlaybackService';

TrackPlayer.registerBackgroundEventHandler(() => handleBackgroundEvent);
import 'expo-router/entry';
