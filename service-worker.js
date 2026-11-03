const CACHE='egowheel-v25';
const V='?v=25';
const ASSETS=['./','./index.html','./styles.css'+V,'./app.js'+V,'./manifest.webmanifest','./icons/icon.svg',
 './src/engine/rng.js'+V,'./src/engine/injuries.js'+V,'./src/engine/save.js'+V,
 './src/data/characters.js'+V,'./src/engine/world.js'+V,'./src/engine/market.js'+V,'./src/engine/weapons.js'+V,'./src/engine/relationships.js'+V,'./src/engine/director.js'+V];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  const codeAsset=/\.(js|css|html)$/.test(u.pathname)&&!u.pathname.endsWith('service-worker.js');
  if(e.request.mode==='navigate'||codeAsset){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp;})));
});
