const CACHE='egowheel-v21';
const ASSETS=['./','./index.html','./styles.css?v=21','./app.js?v=21','./manifest.webmanifest','./icons/icon.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  const codeAsset=u.pathname.endsWith('/app.js')||u.pathname.endsWith('/styles.css')||u.pathname.endsWith('/index.html');
  if(e.request.mode==='navigate'||codeAsset){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp;})));
});
