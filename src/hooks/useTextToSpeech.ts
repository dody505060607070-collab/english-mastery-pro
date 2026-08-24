import { useCallback } from 'react';
import { playText, primeAudio, stopAudio, useAudioState } from '@/lib/audio';

/**
 * Thin wrapper over the shared cross-device audio engine.
 * Real MP3 audio is generated server-side; the browser speech engine is only
 * used as a fallback, because it is unreliable on iOS Safari / Android.
 */
export const useTextToSpeech = () => {
  const audio = useAudioState();

  const speak = useCallback((text: string) => {
    // Must run inside the user gesture for mobile browsers.
    primeAudio();
    void playText(text, 'hook-tts');
  }, []);

  const stop = useCallback(() => stopAudio(), []);

  return {
    speak,
    stop,
    isSpeaking: audio.owner === 'hook-tts' && audio.status === 'playing',
    isLoading: audio.owner === 'hook-tts' && audio.status === 'loading',
  };
};
