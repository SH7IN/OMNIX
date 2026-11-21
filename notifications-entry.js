import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

window.NexoraNotifications = {
  isNative() {
    return Capacitor.isNativePlatform();
  },

  async requestPermission() {
    let permission = await LocalNotifications.checkPermissions();

    if (permission.display !== 'granted') {
      permission = await LocalNotifications.requestPermissions();
    }

    return permission.display;
  },

  async sync(events, english) {
    if (!Capacitor.isNativePlatform()) {
      throw new Error('Native Android notifications are unavailable');
    }

    const pending = await LocalNotifications.getPending();
    const owned = pending.notifications
      .filter(n => n.id >= 1000000000 && n.id < 2000000000)
      .map(n => ({ id: n.id }));

    if (owned.length) {
      await LocalNotifications.cancel({ notifications: owned });
    }

    const now = new Date();
    const notifications = [];

    for (const event of events) {
      if (!event.name || !event.date) continue;

      const parts = event.date.split('-').map(Number);
      if (parts.length !== 3 || parts.some(Number.isNaN)) continue;

      const reminder = new Date(
        parts[0], parts[1] - 1, parts[2] - 1, 9, 0, 0, 0
      );

      if (reminder <= now) continue;

      const key = `${event.date}|${event.name}`;
      let hash = 2166136261;

      for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }

      const id = 1000000000 + ((hash >>> 0) % 1000000000);

      notifications.push({
        id,
        title: `NEXORA · ${event.name}`,
        body: english
          ? 'Your occasion is tomorrow'
          : 'غدًا موعد مناسبتك',
        schedule: { at: reminder },
        isExactNotification: false
      });
    }

    if (notifications.length) {
      await LocalNotifications.schedule({ notifications });
    }

    return notifications.length;
  }
};
