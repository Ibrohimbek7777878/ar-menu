// ARMENU — universal frontend logger — har qanday xatoni tutadi, backendga yuboradi
(function(w){
  'use strict';
  var endpoint = '/v1/log/frontend/';
  var queue = [];
  var sending = false;

  function rid(){ try{ return document.querySelector('meta[name=request-id]')?.content || w.ARMENU?.requestId || localStorage.getItem('armenu_device') || '-'; }catch(e){ return '-'; } }

  function send(entry){
    queue.push(entry);
    if(sending) return;
    sending=true;
    var payload = queue.splice(0, queue.length);
    // Har bir entry alohida yuboriladi, lekin bitta so'rovda batch
    var body = JSON.stringify(payload.length===1 ? payload[0] : {batch: payload});
    // Avval sendBeacon (sahifa yopilganda ham yetadi), bo'lmasa fetch
    try{
      if(navigator.sendBeacon){
        var blob = new Blob([body], {type:'application/json'});
        if(navigator.sendBeacon(endpoint, blob)){ sending=false; if(queue.length) send({level:'info',message:'flush'}); return; }
      }
    }catch(e){}
    fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','X-Request-ID': rid()},body: body,keepalive:true}).catch(function(){}).finally(function(){sending=false; if(queue.length) send(queue.shift());});
  }

  function log(level, msg, extra){
    var entry = {level:level,message:String(msg||'').slice(0,2000),url: location.href,ua: navigator.userAgent,rid: rid(),restaurant_id: w.ARMENU?.restaurantId || w.ARMENU?.slug || '',session: w.ARMENU?.sessionId || localStorage.getItem('gs')||'',ts: new Date().toISOString()};
    if(extra) for(var k in extra) entry[k]=extra[k];
    try{ entry.component = (new Error().stack||'').split('\n')[3]||''; }catch(e){}
    send(entry);
    // Konsolda ham ko'rsin
    var fn = level==='error' ? 'error' : level==='warn' ? 'warn' : 'log';
    try{ console[fn]('[ARMENU:'+level+']',msg,extra||''); }catch(e){}
  }

  // Global xatolarni tutish
  w.addEventListener('error', function(e){
    log('error', e.message||'JS error', {stack: (e.error&&e.error.stack)||'', url: e.filename||location.href, lineno:e.lineno, colno:e.colno});
  });
  w.addEventListener('unhandledrejection', function(e){
    var reason = e.reason; var msg = reason && reason.message ? reason.message : String(reason);
    var stack = reason && reason.stack ? reason.stack : '';
    log('error', 'UnhandledPromise: '+msg, {stack: stack});
  });

  // Console error ni ham tutish (monkey patch)
  (function(){
    var origError = console.error;
    console.error = function(){
      try{ var msg=[].slice.call(arguments).join(' '); if(msg.indexOf('[ARMENU:')!==0) log('error', msg, {component:'console.error'}); }catch(e){}
      return origError.apply(console, arguments);
    };
  })();

  // Fetch/XHR xatolanni tutish (4xx/5xx)
  (function(){
    var origFetch = w.fetch;
    if(origFetch){
      w.fetch = function(input, init){
        return origFetch.apply(this, arguments).then(function(resp){
          if(!resp.ok && resp.status>=400){
            var u = typeof input==='string'? input : input.url||'';
            // Faqat API xatolari, analytics emas
            if(u.indexOf('/v1/')!==-1) log('warn', 'Fetch '+resp.status+' '+u, {status: resp.status, url: u});
          }
          return resp;
        }).catch(function(err){
          var u = typeof input==='string'? input : (input&&input.url)||'';
          log('error','Fetch failed '+u+': '+(err.message||err),{stack: err.stack||''});
          throw err;
        });
      };
    }
  })();

  // WS xatolari
  w.addEventListener('ws:error', function(e){ log('error','WS error '+ (e.detail||''),{component:'ws'}); });

  // Payment / AR alohida helperlar
  w.ARMENU_LOG = {
    error: function(msg, extra){ log('error',msg,extra); },
    warn: function(msg, extra){ log('warn',msg,extra); },
    info: function(msg, extra){ log('info',msg,extra); },
    paymentError: function(msg, extra){ log('payment_error',msg,extra); },
    arError: function(msg, extra){ log('ar_error',msg,extra); },
    apiError: function(msg, extra){ log('api_error',msg,extra); }
  };
  // Test uchun: window.ARMENU_LOG.error('test')
})(window);
