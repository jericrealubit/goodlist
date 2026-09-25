package com.goodlist.app.alarms

import android.app.NotificationManager
import android.content.Context
import androidx.core.app.NotificationManagerCompat
import expo.modules.notifications.notifications.model.Notification
import expo.modules.notifications.notifications.model.NotificationBehaviorRecord
import expo.modules.notifications.service.NotificationsService
import expo.modules.notifications.service.delegates.ExpoPresentationDelegate
import expo.modules.notifications.service.interfaces.PresentationDelegate
import java.text.SimpleDateFormat
import java.util.Locale

/**
 * Stands in for expo-notifications' own receiver (declared at priority -1 so an
 * app can do exactly this) to change one thing: how alarm notifications land
 * in the tray. Copied into the native project by
 * `plugins/with-single-alarm-notification.js`.
 */
class AlarmNotificationsService : NotificationsService() {
  override fun getPresentationDelegate(context: Context): PresentationDelegate =
    SingleAlarmPresentationDelegate(context)
}

/**
 * One tray entry per alarm. An unanswered alarm keeps ringing as a run of
 * one-shot follow-ups, each with its own identifier, and Android tags every
 * notification with its identifier — so without this each ring stacked a new
 * sticky entry under the last. Presenting a ring now first clears the
 * earlier rings of the same alarm, leaving only the newest.
 */
class SingleAlarmPresentationDelegate(context: Context) : ExpoPresentationDelegate(context) {
  override fun presentNotification(notification: Notification, behavior: NotificationBehaviorRecord?) {
    val key = alarmKeyOf(notification)
    if (key != null) {
      val identifier = notification.notificationRequest.identifier
      val tray = context.getSystemService(NotificationManager::class.java)
      tray.activeNotifications.forEach { presented ->
        val earlier = getNotification(presented) ?: return@forEach
        if (earlier.notificationRequest.identifier != identifier && alarmKeyOf(earlier) == key) {
          NotificationManagerCompat.from(context).cancel(presented.tag, presented.id)
        }
      }
    }
    super.presentNotification(notification, behavior)
  }

  /** Mirrors `alarmKeyOf` in src/lib/alarms/alarm-notifications.ts. */
  private fun alarmKeyOf(notification: Notification): String? {
    val data = notification.notificationRequest.content.body ?: return null
    data.optString("alarmKey").takeIf { it.isNotEmpty() }?.let { return it }
    val medicationId = data.optString("medicationId").takeIf { it.isNotEmpty() } ?: return null
    val time = data.optString("time").takeIf { it.isNotEmpty() } ?: return null
    val day = data.optString("day").takeIf { it.isNotEmpty() }
      ?: SimpleDateFormat("yyyy-MM-dd", Locale.US).format(notification.originDate)
    return "dose:$medicationId@${day}T$time"
  }
}
