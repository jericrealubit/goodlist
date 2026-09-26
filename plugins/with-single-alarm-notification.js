// @ts-check
const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const SOURCE = path.join(__dirname, 'android', 'AlarmNotificationsService.kt');
const PACKAGE_DIR = ['com', 'goodlist', 'app', 'alarms'];
const RECEIVER = 'com.goodlist.app.alarms.AlarmNotificationsService';
const ACTION = 'expo.modules.notifications.NOTIFICATION_EVENT';

/**
 * Keeps an alarm to one notification in the Android tray, however many times
 * it rings.
 *
 * An unanswered alarm rings again every 25 seconds or so while the app is
 * closed, and each ring is its own scheduled notification. expo-notifications
 * tags every notification in the tray with its identifier, so the rings piled
 * up as separate sticky entries — a dozen "Due now." for one task. JavaScript
 * can't step in, because the app isn't running when they fire.
 *
 * expo-notifications declares its receiver at priority -1 so an app can
 * register a subclass that wins. This adds one (`AlarmNotificationsService`)
 * whose only change is that presenting a ring first clears the earlier rings
 * of the same alarm. Expo's own receiver stays for boot and app-update
 * rescheduling, which it points at this one.
 */
module.exports = function withSingleAlarmNotification(config) {
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const dir = path.join(config.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java', ...PACKAGE_DIR);
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.copyFile(SOURCE, path.join(dir, path.basename(SOURCE)));
      return config;
    },
  ]);

  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    application.receiver = (application.receiver || []).filter((r) => r.$['android:name'] !== RECEIVER);
    application.receiver.push({
      $: { 'android:name': RECEIVER, 'android:enabled': 'true', 'android:exported': 'false' },
      'intent-filter': [{ $: { 'android:priority': '0' }, action: [{ $: { 'android:name': ACTION } }] }],
    });
    return config;
  });
};
