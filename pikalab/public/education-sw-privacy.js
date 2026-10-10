'use strict';

// 教育PWAが更新された後、旧HTMLや旧共通ローダーからの追跡通信もネットワークへ出さない。
// 旧ワーカーのまま最初に起動する画面には遡及できない。更新後の再起動を別途検証する。
(() => {
  // Workboxのclaim処理が終わるまでactivateを完了させず、旧コントローラーとの切替競合を減らす。
  self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
  const blockedHost = /(?:^|\.)(?:google(?:tagmanager|-analytics|syndication|adservices|tagservices)|doubleclick|clarity|hotjar|segment|amplitude|plausible|umami)\.(?:com|net|ms|io|is)$|^connect\.facebook\.net$/i;
  const blockedPath = /\/(?:analytics\.js|g\/collect)(?:$|\/)/i;
  self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    let pathname = url.pathname;
    try { pathname = decodeURIComponent(pathname); } catch { /* 不正なURLでも既知ドメインは遮断する */ }
    if (!blockedHost.test(url.hostname) && !blockedPath.test(pathname)) return;
    // Workboxなど後続リスナーによるキャッシュ応答・送信も止める。
    event.stopImmediatePropagation();
    event.respondWith(Promise.resolve(new Response('', {
      status: 200,
      headers: { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' },
    })));
  });
})();
