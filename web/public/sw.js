// WeatherGeoBridge Service Worker(WeatherGeoBridge_DESIGN.md Phase2)。
self.addEventListener("push", (event) => {
  const data = event.data
    ? event.data.json()
    : { title: "WeatherGeoBridge", body: "" };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/rain.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
