/* HOGR CO. service worker: shows phone notifications and keeps the app-icon badge up to date. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "HOGR CO.", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "HOGR CO.";
  const tasks = [
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/pwa-icon/192",
      badge: "/pwa-icon/badge",
      tag: data.tag || undefined,
      renotify: !!data.tag,
      data: { url: data.url || "/admin" },
      dir: "auto",
    }),
  ];
  // Number on the app icon (installed app on iPhone, Windows, Mac; Android shows a dot automatically)
  if (typeof data.badge === "number" && "setAppBadge" in self.navigator) {
    tasks.push(data.badge > 0 ? self.navigator.setAppBadge(data.badge) : self.navigator.clearAppBadge());
  }
  event.waitUntil(Promise.all(tasks).catch(() => {}));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/admin", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin && "focus" in w) {
          w.navigate(url);
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
