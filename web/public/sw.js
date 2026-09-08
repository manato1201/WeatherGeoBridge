// WeatherGeoBridge Service Worker(WeatherGeoBridge_DESIGN.md Phase2/Phase7)。
self.addEventListener("push", (event) => {
  const data = event.data
    ? event.data.json()
    : { title: "WeatherGeoBridge", body: "" };
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icons/rain.png",
      }),
      // フォアグラウンドで開いているタブにも同じ内容を伝える。Phase7の
      // スタックトースト/スプリットフラップは、ここでの新規判定ではなく
      // このPushイベント(=Worker側の既存の差分検知トリガー)にそのまま
      // ぶら下げているだけで、新しい監視処理は増やしていない。
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clients) => {
          for (const client of clients) client.postMessage(data);
        }),
    ]),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
