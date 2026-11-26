/* 미니 게임 오락실 서비스워커: 한 번 열어 본 게임은 오프라인에서도 열린다 */
const VERSION='arcade-v4';
const PRECACHE=["./", "index.html", "manifest.webmanifest", "common/arcade.js", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-180.png", "icons/favicon-32.png", "ace-strike/", "air-hockey/", "block-hunter/", "block-stack/", "brick-pop/", "castle-guard/", "egg-catch/", "egg-drive/", "egg-swap/", "fox-run/", "fruit-merge/", "mini-racer/", "moon-survivor/", "omok/", "gugudan-balloon/", "tick-clock/", "coin-shop/", "coin-shop/style.css", "coin-shop/game.js", "coin-shop/data.json"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>Promise.all(PRECACHE.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  const cdn=/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)$/.test(url.hostname);
  if(url.origin!==location.origin&&!cdn)return;
  e.respondWith(caches.open(VERSION).then(async c=>{
    const hit=await c.match(req,{ignoreSearch:url.origin===location.origin});
    const net=fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r}).catch(()=>hit);
    // 같은 출처: 캐시를 먼저 보여 주고 뒤에서 갱신 / 글꼴·라이브러리: 캐시 우선
    return hit||net;
  }));
});
