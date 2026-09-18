import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorCode,
} from 'expo-speech-recognition';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { useVoiceAvailability } from '@/hooks/use-voice-availability';
import { getRecognitionLanguage } from '@/lib/voice/language';

/** A session that never ends is a microphone left on. Nothing listens longer than this. */
const MAX_SESSION_MS = 15_000;

/** The recognizer reports −2…10 and calls anything at or below 0 inaudible. */
const AUDIBLE_CEILING = 10;

/**
 * Android 13 (API 33) is where `SpeechRecognizer` gained continuous mode. We
 * want it not for continuous dictation but for its side effect: it switches
 * the intent's audio source away from the default microphone, which is what
 * silences the OS's hardcoded start/stop beep. Single-shot behaviour is
 * preserved by aborting as soon as a final result lands.
 */
const CONTINUOUS = Platform.OS === 'android' && Number(Platform.Version) >= 33;

const NOT_HEARD = 'Didn’t catch that. Try again.';

export type VoiceStatus = 'idle' | 'starting' | 'listening' | 'unavailable' | 'denied';

export type VoiceSession = {
  status: VoiceStatus;
  /** Interim while listening, final once the session ends. */
  transcript: string;
  /** 0–1, normalized from the recognizer's own scale. Stays 0 on web, which reports no levels. */
  level: number;
  /** Copy a person can act on — never a raw error code. */
  error: string | null;
  /** True until the microphone has been granted, so the caller can explain itself first. */
  needsRationale: boolean;
  start: (options?: { contextualStrings?: string[] }) => Promise<void>;
  /** Finish and keep what was heard. */
  stop: () => void;
  /** Abandon the session and discard it. */
  cancel: () => void;
  /** Drop a stale message — the caller got on with typing instead. */
  clearError: () => void;
};

function errorMessage(code: ExpoSpeechRecognitionErrorCode): string {
  switch (code) {
    case 'not-allowed':
      return 'Goodlist needs microphone access to hear a task. You can turn it on in your device settings.';
    case 'network':
      return 'Speech needs a connection right now — type it instead, or try again once you’re back online.';
    case 'no-speech':
    case 'speech-timeout':
      return NOT_HEARD;
    case 'service-not-allowed':
    case 'language-not-supported':
      return 'Speech input isn’t available on this device.';
    case 'busy':
      return 'Still finishing the last one — give it a moment.';
    case 'audio-capture':
      return 'The microphone isn’t available right now.';
    case 'interrupted':
      return 'Something interrupted the microphone. Try again.';
    default:
      return 'Couldn’t hear that. Try again.';
  }
}

/**
 * Owns one speech session: permission, start, live transcript, stop, and every
 * way it can go wrong. `onFinal` is called exactly once per session, with the
 * final transcript — interim results never reach it, so nothing is ever
 * committed from a half-heard sentence.
 */
export function useVoiceInput(onFinal: (transcript: string) => void): VoiceSession {
  const { supported, granted, canAskAgain, request } = useVoiceAvailability();
  const [status, setStatus] = useState<VoiceStatus>(supported ? 'idle' : 'unavailable');
  const [transcript, setTranscript] = useState('');
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Held in a ref, and refreshed in an effect rather than during render, so a
  // result arriving mid-session always calls the newest handler without the
  // caller having to memoize it.
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  // Whether a session is live, so stop/cancel/cleanup can't call into a
  // recognizer that isn't running.
  const runningRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const finish = useCallback(() => {
    clearTimer();
    if (!runningRef.current) return;
    runningRef.current = false;
    ExpoSpeechRecognitionModule.abort();
  }, [clearTimer]);

  useSpeechRecognitionEvent('start', () => {
    setStatus('listening');
  });

  useSpeechRecognitionEvent('result', (event) => {
    const heard = event.results[0]?.transcript ?? '';
    setTranscript(heard);
    if (!event.isFinal) return;
    // Continuous mode keeps the microphone open past the final result, so end
    // it here rather than leaving it listening to the room.
    finish();
    if (heard.trim()) onFinalRef.current(heard.trim());
  });

  useSpeechRecognitionEvent('nomatch', () => {
    setError(NOT_HEARD);
  });

  useSpeechRecognitionEvent('error', (event) => {
    // `aborted` is how our own finish() and cancel() end a session — the user
    // sees a result or an empty field, not an error.
    if (event.error === 'aborted') return;
    setError(errorMessage(event.error));
    if (event.error === 'not-allowed') setStatus('denied');
  });

  useSpeechRecognitionEvent('end', () => {
    runningRef.current = false;
    clearTimer();
    setLevel(0);
    setStatus((current) => (current === 'denied' || current === 'unavailable' ? current : 'idle'));
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    setLevel(Math.max(0, Math.min(1, event.value / AUDIBLE_CEILING)));
  });

  const clearError = useCallback(() => setError(null), []);

  const cancel = useCallback(() => {
    clearTimer();
    setTranscript('');
    if (!runningRef.current) return;
    runningRef.current = false;
    ExpoSpeechRecognitionModule.abort();
  }, [clearTimer]);

  const stop = useCallback(() => {
    clearTimer();
    if (!runningRef.current) return;
    // Not abort(): stop() asks the recognizer for a final result first.
    ExpoSpeechRecognitionModule.stop();
  }, [clearTimer]);

  const start = useCallback(
    async (options?: { contextualStrings?: string[] }) => {
      if (!supported) {
        setStatus('unavailable');
        return;
      }
      if (runningRef.current) return;

      if (!granted) {
        const allowed = await request();
        if (!allowed) {
          setStatus('denied');
          setError(
            canAskAgain
              ? 'Goodlist needs microphone access to hear a task.'
              : 'Microphone access is off for Goodlist. You can turn it on in your device settings.',
          );
          return;
        }
      }

      setError(null);
      setTranscript('');
      setLevel(0);
      setStatus('starting');

      try {
        runningRef.current = true;
        ExpoSpeechRecognitionModule.start({
          lang: getRecognitionLanguage(),
          interimResults: true,
          maxAlternatives: 1,
          continuous: CONTINUOUS,
          contextualStrings: options?.contextualStrings,
          volumeChangeEventOptions: { enabled: true, intervalMillis: 200 },
        });
        timeoutRef.current = setTimeout(() => {
          // Long enough for a sentence, short enough that a forgotten session
          // can't hold the microphone open.
          if (runningRef.current) ExpoSpeechRecognitionModule.stop();
        }, MAX_SESSION_MS);
      } catch {
        runningRef.current = false;
        setStatus('idle');
        setError('Couldn’t start listening. Try again.');
      }
    },
    [canAskAgain, granted, request, supported],
  );

  // A session must not outlive the screen, or survive the app going away.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active' && runningRef.current) cancel();
    });
    return () => {
      subscription.remove();
      if (runningRef.current) {
        runningRef.current = false;
        ExpoSpeechRecognitionModule.abort();
      }
      clearTimer();
    };
  }, [cancel, clearTimer]);

  return {
    status,
    transcript,
    level,
    error,
    needsRationale: supported && !granted,
    start,
    stop,
    cancel,
    clearError,
  };
}
