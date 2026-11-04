// Preview builds use their own cache namespace and only ever delete their own old caches,
// so they cannot wipe the live game's offline cache on a shared origin.
const PREFIX='egowheel-preview-';
const CACHE=PREFIX+'v26.4-full-roster';
const V='?v=265';
const ASSETS=['./','./index.html','./styles.css'+V,'./manifest.webmanifest','./icons/icon.svg',
 './src/channel.js'+V,'./src/build-info.js'+V,'./src/engine/rng.js'+V,'./src/engine/injuries.js'+V,'./src/engine/save.js'+V,'./src/data/characters.js'+V,'./src/engine/world.js'+V,'./src/engine/market.js'+V,'./src/engine/weapons.js'+V,'./src/engine/relationships.js'+V,'./src/engine/decisions.js'+V,'./src/engine/director.js'+V,'./src/engine/flow.js'+V,'./src/engine/pressure.js'+V,'./src/engine/arcs.js'+V,'./src/data/arc-templates.js'+V,'./src/engine/agency.js'+V,'./src/engine/partnerships.js'+V,'./src/engine/finances.js'+V,'./src/data/lifestyle-items.js'+V,'./src/engine/pro-career.js'+V,'./src/data/pro-events.js'+V,'./src/art/sprite-renderer.js'+V,'./src/art/character-appearances.js'+V,'./src/ui/avatar-editor.js'+V,'./app.js'+V,'./assets/portraits/egowheel-v26-pilot.webp','./assets/portraits/egowheel-v26-expansion.webp','./assets/portraits/egowheel-v26-named-complete.webp','./assets/portraits/egowheel-v26-random-a.webp','./assets/portraits/egowheel-v26-random-b.webp','./assets/portraits/egowheel-v26-random-c.webp'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})()));
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
