import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

/**
 * Whether this device can listen at all, and whether it is allowed to.
 *
 * Two separate questions, and both can be no for reasons the user can't fix:
 * Firefox and Brave ship no Web Speech API, and an Android phone whose speech
 * service is disabled has no recognizer to call. `supported` gates the mic
 * button entirely — where it is false the app is exactly what it was before
 * voice existed, with no button that fails when pressed.
 *
 * On web the permission methods are stubs that warn and answer "granted"; the
 * browser does its own microphone prompt when recognition starts, and a
 * refusal arrives as a `not-allowed` error event. So we never call them there.
 */
export type VoiceAvailability = {
  /** The platform can recognize speech at all. */
  supported: boolean;
  /** Microphone permission is already granted. */
  granted: boolean;
  /** True when the OS will still show a prompt; false once it has been refused for good. */
  canAskAgain: boolean;
  /** Asks for the microphone, once, behind a rationale the caller has already shown. */
  request: () => Promise<boolean>;
};

const HANDLED_BY_BROWSER = Platform.OS === 'web';

function detectSupport(): boolean {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    // A recognizer that throws on inspection is a recognizer we can't use.
    return false;
  }
}

export function useVoiceAvailability(): VoiceAvailability {
  const [supported] = useState(detectSupport);
  const [granted, setGranted] = useState(HANDLED_BY_BROWSER);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!supported || HANDLED_BY_BROWSER) return;
    ExpoSpeechRecognitionModule.getMicrophonePermissionsAsync()
      .then((result) => {
        if (!mounted.current) return;
        setGranted(result.granted);
        setCanAskAgain(result.canAskAgain);
      })
      .catch(() => {
        if (mounted.current) setGranted(false);
      });
  }, [supported]);

  const request = useCallback(async () => {
    if (!supported) return false;
    // The browser prompts for us; asking here only logs a warning and lies "granted".
    if (HANDLED_BY_BROWSER) return true;
    try {
      const result = await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
      if (mounted.current) {
        setGranted(result.granted);
        setCanAskAgain(result.canAskAgain);
      }
      return result.granted;
    } catch {
      if (mounted.current) setGranted(false);
      return false;
    }
  }, [supported]);

  return { supported, granted, canAskAgain, request };
}
