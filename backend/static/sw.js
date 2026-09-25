const C='guliston-v3';
self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||e.request.url.includes('/admin/')||e.request.url.includes('/courier/')||e.request.url.includes('/telegram/'))return;
  if(e.request.mode==='navigate'||e.request.headers.get('accept')?.includes('text/html')){
    e.respondWith(fetch(e.request).then(r=>{if(r&&r.ok){const c=r.clone();caches.open(C).then(cache=>cache.put(e.request,c));}return r;}).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(caches.open(C).then(c=>c.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res.ok&&new URL(e.request.url).pathname.startsWith('/m/'))c.put(e.request,res.clone());return res;}))));
});