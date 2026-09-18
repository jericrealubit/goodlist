// @ts-check
const { withAndroidManifest } = require('expo/config-plugins');

const FEATURE = 'android.hardware.microphone';

/**
 * Declares the microphone optional hardware.
 *
 * Android derives an implicit `<uses-feature android:required="true" />` from
 * RECORD_AUDIO, which tells Play the app only runs on devices that have a
 * microphone. On the first release to carry the permission that filtered 16
 * devices (6 phones, 10 tablets) out of the listing — and, worse than blocking
 * new installs, it stops people who already have Goodlist on those devices from
 * receiving any further updates.
 *
 * This is an honest declaration rather than a way to silence the warning:
 * Goodlist really does work without a microphone. `isRecognitionAvailable()`
 * gates the microphone button, and where speech is unavailable the app is
 * exactly what it was before voice existed — no button that fails when pressed.
 * The manifest simply had no way to say so.
 *
 * It has to live here because `expo-speech-recognition`'s own config plugin
 * adds the permission and the package-visibility `<queries>` block but no
 * feature declaration, and exposes no option for one.
 */
module.exports = function withOptionalMicrophone(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest['uses-feature'] = manifest['uses-feature'] || [];

    const existing = manifest['uses-feature'].find(
      (feature) => feature.$?.['android:name'] === FEATURE,
    );

    // If something upstream ever starts declaring it, correct it rather than
    // adding a second entry — a duplicate with required="true" would win.
    if (existing) {
      existing.$['android:required'] = 'false';
      return config;
    }

    manifest['uses-feature'].push({
      $: { 'android:name': FEATURE, 'android:required': 'false' },
    });
    return config;
  });
};
