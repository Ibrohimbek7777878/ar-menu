import{d as e}from"./index-Bz-eTwek.js";var t=(e,t)=>t.kind===`method`&&t.descriptor&&!(`value`in t.descriptor)?{...t,finisher(n){n.createProperty(t.key,e)}}:{kind:`field`,key:Symbol(),placement:`own`,descriptor:{},originalKey:t.key,initializer(){typeof t.initializer==`function`&&(this[t.key]=t.initializer.call(this))},finisher(n){n.createProperty(t.key,e)}},n=(e,t,n)=>{t.constructor.createProperty(n,e)};function r(e){return(r,i)=>i===void 0?t(e,r):n(e,r,i)}window.HTMLSlotElement?.prototype.assignedElements;var i=`attached`,a=1e3,o=1001,s=1002,c=1003,l=1004,u=1005,d=1006,f=1007,p=1008,m=1008,h=1009,g=1010,_=1011,v=1013,y=1014,b=1015,x=1016,S=1020,C=1023,w=1026,T=1027,E=1028,D=1030,O=33776,k=33779,A=35840,j=35842,ee=36196,M=37492,N=37496,P=37808,te=37812,ne=36492,re=2200,ie=2201,ae=2202,F=2300,I=2301,oe=2302,se=2400,ce=2401,le=2402,ue=2500,de=2501,L=3200,fe=3201,pe=`srgb`,me=`srgb-linear`,he=`display-p3`,ge=`display-p3-linear`,R=`linear`,_e=`srgb`,z=`rec709`,B=7680,ve=35044,ye=2e3,be=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;let n=this._listeners;return n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;let n=this._listeners[e];if(n!==void 0){let e=n.indexOf(t);e!==-1&&n.splice(e,1)}}dispatchEvent(e){if(this._listeners===void 0)return;let t=this._listeners[e.type];if(t!==void 0){e.target=this;let n=t.slice(0);for(let t=0,r=n.length;t<r;t++)n[t].call(this,e);e.target=null}}},xe=`00.01.02.03.04.05.06.07.08.09.0a.0b.0c.0d.0e.0f.10.11.12.13.14.15.16.17.18.19.1a.1b.1c.1d.1e.1f.20.21.22.23.24.25.26.27.28.29.2a.2b.2c.2d.2e.2f.30.31.32.33.34.35.36.37.38.39.3a.3b.3c.3d.3e.3f.40.41.42.43.44.45.46.47.48.49.4a.4b.4c.4d.4e.4f.50.51.52.53.54.55.56.57.58.59.5a.5b.5c.5d.5e.5f.60.61.62.63.64.65.66.67.68.69.6a.6b.6c.6d.6e.6f.70.71.72.73.74.75.76.77.78.79.7a.7b.7c.7d.7e.7f.80.81.82.83.84.85.86.87.88.89.8a.8b.8c.8d.8e.8f.90.91.92.93.94.95.96.97.98.99.9a.9b.9c.9d.9e.9f.a0.a1.a2.a3.a4.a5.a6.a7.a8.a9.aa.ab.ac.ad.ae.af.b0.b1.b2.b3.b4.b5.b6.b7.b8.b9.ba.bb.bc.bd.be.bf.c0.c1.c2.c3.c4.c5.c6.c7.c8.c9.ca.cb.cc.cd.ce.cf.d0.d1.d2.d3.d4.d5.d6.d7.d8.d9.da.db.dc.dd.de.df.e0.e1.e2.e3.e4.e5.e6.e7.e8.e9.ea.eb.ec.ed.ee.ef.f0.f1.f2.f3.f4.f5.f6.f7.f8.f9.fa.fb.fc.fd.fe.ff`.split(`.`),Se=1234567,Ce=Math.PI/180,we=180/Math.PI;function Te(){let e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0,r=Math.random()*4294967295|0;return(xe[e&255]+xe[e>>8&255]+xe[e>>16&255]+xe[e>>24&255]+`-`+xe[t&255]+xe[t>>8&255]+`-`+xe[t>>16&15|64]+xe[t>>24&255]+`-`+xe[n&63|128]+xe[n>>8&255]+`-`+xe[n>>16&255]+xe[n>>24&255]+xe[r&255]+xe[r>>8&255]+xe[r>>16&255]+xe[r>>24&255]).toLowerCase()}function Ee(e,t,n){return Math.max(t,Math.min(n,e))}function De(e,t){return(e%t+t)%t}function Oe(e,t,n,r,i){return r+(e-t)*(i-r)/(n-t)}function ke(e,t,n){return e===t?0:(n-e)/(t-e)}function Ae(e,t,n){return(1-n)*e+n*t}function je(e,t,n,r){return Ae(e,t,1-Math.exp(-n*r))}function Me(e,t=1){return t-Math.abs(De(e,t*2)-t)}function Ne(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*(3-2*e))}function Pe(e,t,n){return e<=t?0:e>=n?1:(e=(e-t)/(n-t),e*e*e*(e*(e*6-15)+10))}function Fe(e,t){return e+Math.floor(Math.random()*(t-e+1))}function Ie(e,t){return e+Math.random()*(t-e)}function Le(e){return e*(.5-Math.random())}function Re(e){e!==void 0&&(Se=e);let t=Se+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function ze(e){return e*Ce}function Be(e){return e*we}function Ve(e){return!(e&e-1)&&e!==0}function He(e){return 2**Math.ceil(Math.log(e)/Math.LN2)}function Ue(e){return 2**Math.floor(Math.log(e)/Math.LN2)}function We(e,t,n,r,i){let a=Math.cos,o=Math.sin,s=a(n/2),c=o(n/2),l=a((t+r)/2),u=o((t+r)/2),d=a((t-r)/2),f=o((t-r)/2),p=a((r-t)/2),m=o((r-t)/2);switch(i){case`XYX`:e.set(s*u,c*d,c*f,s*l);break;case`YZY`:e.set(c*f,s*u,c*d,s*l);break;case`ZXZ`:e.set(c*d,c*f,s*u,s*l);break;case`XZX`:e.set(s*u,c*m,c*p,s*l);break;case`YXY`:e.set(c*p,s*u,c*m,s*l);break;case`ZYZ`:e.set(c*m,c*p,s*u,s*l);break;default:console.warn(`THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: `+i)}}function Ge(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return e/4294967295;case Uint16Array:return e/65535;case Uint8Array:return e/255;case Int32Array:return Math.max(e/2147483647,-1);case Int16Array:return Math.max(e/32767,-1);case Int8Array:return Math.max(e/127,-1);default:throw Error(`Invalid component type.`)}}function Ke(e,t){switch(t.constructor){case Float32Array:return e;case Uint32Array:return Math.round(e*4294967295);case Uint16Array:return Math.round(e*65535);case Uint8Array:return Math.round(e*255);case Int32Array:return Math.round(e*2147483647);case Int16Array:return Math.round(e*32767);case Int8Array:return Math.round(e*127);default:throw Error(`Invalid component type.`)}}var qe={DEG2RAD:Ce,RAD2DEG:we,generateUUID:Te,clamp:Ee,euclideanModulo:De,mapLinear:Oe,inverseLerp:ke,lerp:Ae,damp:je,pingpong:Me,smoothstep:Ne,smootherstep:Pe,randInt:Fe,randFloat:Ie,randFloatSpread:Le,seededRandom:Re,degToRad:ze,radToDeg:Be,isPowerOfTwo:Ve,ceilPowerOfTwo:He,floorPowerOfTwo:Ue,setQuaternionFromProperEuler:We,normalize:Ke,denormalize:Ge},V=class e{constructor(t=0,n=0){e.prototype.isVector2=!0,this.x=t,this.y=n}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw Error(`index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw Error(`index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6],this.y=r[1]*t+r[4]*n+r[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Ee(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),r=Math.sin(t),i=this.x-e.x,a=this.y-e.y;return this.x=i*n-a*r+e.x,this.y=i*r+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},H=class e{constructor(t,n,r,i,a,o,s,c,l){e.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,n,r,i,a,o,s,c,l)}set(e,t,n,r,i,a,o,s,c){let l=this.elements;return l[0]=e,l[1]=r,l[2]=o,l[3]=t,l[4]=i,l[5]=s,l[6]=n,l[7]=a,l[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[3],s=n[6],c=n[1],l=n[4],u=n[7],d=n[2],f=n[5],p=n[8],m=r[0],h=r[3],g=r[6],_=r[1],v=r[4],y=r[7],b=r[2],x=r[5],S=r[8];return i[0]=a*m+o*_+s*b,i[3]=a*h+o*v+s*x,i[6]=a*g+o*y+s*S,i[1]=c*m+l*_+u*b,i[4]=c*h+l*v+u*x,i[7]=c*g+l*y+u*S,i[2]=d*m+f*_+p*b,i[5]=d*h+f*v+p*x,i[8]=d*g+f*y+p*S,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8];return t*a*l-t*o*c-n*i*l+n*o*s+r*i*c-r*a*s}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=l*a-o*c,d=o*s-l*i,f=c*i-a*s,p=t*u+n*d+r*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let m=1/p;return e[0]=u*m,e[1]=(r*c-l*n)*m,e[2]=(o*n-r*a)*m,e[3]=d*m,e[4]=(l*t-r*s)*m,e[5]=(r*i-o*t)*m,e[6]=f*m,e[7]=(n*s-c*t)*m,e[8]=(a*t-n*i)*m,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,r,i,a,o){let s=Math.cos(i),c=Math.sin(i);return this.set(n*s,n*c,-n*(s*a+c*o)+a+e,-r*c,r*s,-r*(-c*a+s*o)+o+t,0,0,1),this}scale(e,t){return this.premultiply(Je.makeScale(e,t)),this}rotate(e){return this.premultiply(Je.makeRotation(-e)),this}translate(e,t){return this.premultiply(Je.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<9;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}},Je=new H;function Ye(e){for(let t=e.length-1;t>=0;--t)if(e[t]>=65535)return!0;return!1}function Xe(e){return document.createElementNS(`http://www.w3.org/1999/xhtml`,e)}function Ze(){let e=Xe(`canvas`);return e.style.display=`block`,e}var Qe={};function $e(e){e in Qe||(Qe[e]=!0,console.warn(e))}var et=new H().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),tt=new H().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),nt={[me]:{transfer:R,primaries:z,toReference:e=>e,fromReference:e=>e},[pe]:{transfer:_e,primaries:z,toReference:e=>e.convertSRGBToLinear(),fromReference:e=>e.convertLinearToSRGB()},[ge]:{transfer:R,primaries:`p3`,toReference:e=>e.applyMatrix3(tt),fromReference:e=>e.applyMatrix3(et)},[he]:{transfer:_e,primaries:`p3`,toReference:e=>e.convertSRGBToLinear().applyMatrix3(tt),fromReference:e=>e.applyMatrix3(et).convertLinearToSRGB()}},rt=new Set([me,ge]),it={enabled:!0,_workingColorSpace:me,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(e){if(!rt.has(e))throw Error(`Unsupported working color space, "${e}".`);this._workingColorSpace=e},convert:function(e,t,n){if(this.enabled===!1||t===n||!t||!n)return e;let r=nt[t].toReference,i=nt[n].fromReference;return i(r(e))},fromWorkingColorSpace:function(e,t){return this.convert(e,this._workingColorSpace,t)},toWorkingColorSpace:function(e,t){return this.convert(e,t,this._workingColorSpace)},getPrimaries:function(e){return nt[e].primaries},getTransfer:function(e){return e===``?R:nt[e].transfer}};function at(e){return e<.04045?e*.0773993808:(e*.9478672986+.0521327014)**2.4}function ot(e){return e<.0031308?e*12.92:1.055*e**.41666-.055}var st,ct=class{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>`u`)return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{st===void 0&&(st=Xe(`canvas`)),st.width=e.width,st.height=e.height;let n=st.getContext(`2d`);e instanceof ImageData?n.putImageData(e,0,0):n.drawImage(e,0,0,e.width,e.height),t=st}return t.width>2048||t.height>2048?(console.warn(`THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons`,e),t.toDataURL(`image/jpeg`,.6)):t.toDataURL(`image/png`)}static sRGBToLinear(e){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap){let t=Xe(`canvas`);t.width=e.width,t.height=e.height;let n=t.getContext(`2d`);n.drawImage(e,0,0,e.width,e.height);let r=n.getImageData(0,0,e.width,e.height),i=r.data;for(let e=0;e<i.length;e++)i[e]=at(i[e]/255)*255;return n.putImageData(r,0,0),t}if(e.data){let t=e.data.slice(0);for(let e=0;e<t.length;e++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[e]=Math.floor(at(t[e]/255)*255):t[e]=at(t[e]);return{data:t,width:e.width,height:e.height}}return console.warn(`THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied.`),e}},lt=0,ut=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:lt++}),this.uuid=Te(),this.data=e,this.dataReady=!0,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:``},r=this.data;if(r!==null){let e;if(Array.isArray(r)){e=[];for(let t=0,n=r.length;t<n;t++)r[t].isDataTexture?e.push(dt(r[t].image)):e.push(dt(r[t]))}else e=dt(r);n.url=e}return t||(e.images[this.uuid]=n),n}};function dt(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap?ct.getDataURL(e):e.data?{data:Array.from(e.data),width:e.width,height:e.height,type:e.data.constructor.name}:(console.warn(`THREE.Texture: Unable to serialize Texture.`),{})}var ft=0,pt=class e extends be{constructor(t=e.DEFAULT_IMAGE,n=e.DEFAULT_MAPPING,r=o,i=o,a=d,s=p,c=C,l=h,u=e.DEFAULT_ANISOTROPY,f=``){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:ft++}),this.uuid=Te(),this.name=``,this.source=new ut(t),this.mipmaps=[],this.mapping=n,this.channel=0,this.wrapS=r,this.wrapT=i,this.magFilter=a,this.minFilter=s,this.anisotropy=u,this.format=c,this.internalFormat=null,this.type=l,this.offset=new V(0,0),this.repeat=new V(1,1),this.center=new V(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new H,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=f,this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.pmremVersion=0}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){let t=e===void 0||typeof e==`string`;if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.6,type:`Texture`,generator:`Texture.toJSON`},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:`dispose`})}transformUv(e){if(this.mapping!==300)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case a:e.x-=Math.floor(e.x);break;case o:e.x=e.x<0?0:1;break;case s:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x-=Math.floor(e.x)}if(e.y<0||e.y>1)switch(this.wrapT){case a:e.y-=Math.floor(e.y);break;case o:e.y=e.y<0?0:1;break;case s:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y-=Math.floor(e.y)}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};pt.DEFAULT_IMAGE=null,pt.DEFAULT_MAPPING=300,pt.DEFAULT_ANISOTROPY=1;var mt=class e{constructor(t=0,n=0,r=0,i=1){e.prototype.isVector4=!0,this.x=t,this.y=n,this.z=r,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,r){return this.x=e,this.y=t,this.z=n,this.w=r,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw Error(`index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw Error(`index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w===void 0?1:e.w,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*r+a[12]*i,this.y=a[1]*t+a[5]*n+a[9]*r+a[13]*i,this.z=a[2]*t+a[6]*n+a[10]*r+a[14]*i,this.w=a[3]*t+a[7]*n+a[11]*r+a[15]*i,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,r,i,a=.01,o=.1,s=e.elements,c=s[0],l=s[4],u=s[8],d=s[1],f=s[5],p=s[9],m=s[2],h=s[6],g=s[10];if(Math.abs(l-d)<a&&Math.abs(u-m)<a&&Math.abs(p-h)<a){if(Math.abs(l+d)<o&&Math.abs(u+m)<o&&Math.abs(p+h)<o&&Math.abs(c+f+g-3)<o)return this.set(1,0,0,0),this;t=Math.PI;let e=(c+1)/2,s=(f+1)/2,_=(g+1)/2,v=(l+d)/4,y=(u+m)/4,b=(p+h)/4;return e>s&&e>_?e<a?(n=0,r=.707106781,i=.707106781):(n=Math.sqrt(e),r=v/n,i=y/n):s>_?s<a?(n=.707106781,r=0,i=.707106781):(r=Math.sqrt(s),n=v/r,i=b/r):_<a?(n=.707106781,r=.707106781,i=0):(i=Math.sqrt(_),n=y/i,r=b/i),this.set(n,r,i,t),this}let _=Math.sqrt((h-p)*(h-p)+(u-m)*(u-m)+(d-l)*(d-l));return Math.abs(_)<.001&&(_=1),this.x=(h-p)/_,this.y=(u-m)/_,this.z=(d-l)/_,this.w=Math.acos((c+f+g-1)/2),this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},ht=class extends be{constructor(e=1,t=1,n={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new mt(0,0,e,t),this.scissorTest=!1,this.viewport=new mt(0,0,e,t);let r={width:e,height:t,depth:1};n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:d,depthBuffer:!0,stencilBuffer:!1,depthTexture:null,samples:0,count:1},n);let i=new pt(r,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.colorSpace);i.flipY=!1,i.generateMipmaps=n.generateMipmaps,i.internalFormat=n.internalFormat,this.textures=[];let a=n.count;for(let e=0;e<a;e++)this.textures[e]=i.clone(),this.textures[e].isRenderTargetTexture=!0;this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.depthTexture=n.depthTexture,this.samples=n.samples}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let r=0,i=this.textures.length;r<i;r++)this.textures[r].image.width=e,this.textures[r].image.height=t,this.textures[r].image.depth=n;this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++)this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0;let t=Object.assign({},e.texture.image);return this.texture.source=new ut(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:`dispose`})}},gt=class extends ht{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},_t=class extends pt{constructor(e=null,t=1,n=1,r=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=c,this.minFilter=c,this.wrapR=o,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},vt=class extends pt{constructor(e=null,t=1,n=1,r=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:r},this.magFilter=c,this.minFilter=c,this.wrapR=o,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},yt=class{constructor(e=0,t=0,n=0,r=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=r}static slerpFlat(e,t,n,r,i,a,o){let s=n[r+0],c=n[r+1],l=n[r+2],u=n[r+3],d=i[a+0],f=i[a+1],p=i[a+2],m=i[a+3];if(o===0){e[t+0]=s,e[t+1]=c,e[t+2]=l,e[t+3]=u;return}if(o===1){e[t+0]=d,e[t+1]=f,e[t+2]=p,e[t+3]=m;return}if(u!==m||s!==d||c!==f||l!==p){let e=1-o,t=s*d+c*f+l*p+u*m,n=t>=0?1:-1,r=1-t*t;if(r>2**-52){let i=Math.sqrt(r),a=Math.atan2(i,t*n);e=Math.sin(e*a)/i,o=Math.sin(o*a)/i}let i=o*n;if(s=s*e+d*i,c=c*e+f*i,l=l*e+p*i,u=u*e+m*i,e===1-o){let e=1/Math.sqrt(s*s+c*c+l*l+u*u);s*=e,c*=e,l*=e,u*=e}}e[t]=s,e[t+1]=c,e[t+2]=l,e[t+3]=u}static multiplyQuaternionsFlat(e,t,n,r,i,a){let o=n[r],s=n[r+1],c=n[r+2],l=n[r+3],u=i[a],d=i[a+1],f=i[a+2],p=i[a+3];return e[t]=o*p+l*u+s*f-c*d,e[t+1]=s*p+l*d+c*u-o*f,e[t+2]=c*p+l*f+o*d-s*u,e[t+3]=l*p-o*u-s*d-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,r){return this._x=e,this._y=t,this._z=n,this._w=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,r=e._y,i=e._z,a=e._order,o=Math.cos,s=Math.sin,c=o(n/2),l=o(r/2),u=o(i/2),d=s(n/2),f=s(r/2),p=s(i/2);switch(a){case`XYZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`YXZ`:this._x=d*l*u+c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`ZXY`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u-d*f*p;break;case`ZYX`:this._x=d*l*u-c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u+d*f*p;break;case`YZX`:this._x=d*l*u+c*f*p,this._y=c*f*u+d*l*p,this._z=c*l*p-d*f*u,this._w=c*l*u-d*f*p;break;case`XZY`:this._x=d*l*u-c*f*p,this._y=c*f*u-d*l*p,this._z=c*l*p+d*f*u,this._w=c*l*u+d*f*p;break;default:console.warn(`THREE.Quaternion: .setFromEuler() encountered an unknown order: `+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,r=Math.sin(n);return this._x=e.x*r,this._y=e.y*r,this._z=e.z*r,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],r=t[4],i=t[8],a=t[1],o=t[5],s=t[9],c=t[2],l=t[6],u=t[10],d=n+o+u;if(d>0){let e=.5/Math.sqrt(d+1);this._w=.25/e,this._x=(l-s)*e,this._y=(i-c)*e,this._z=(a-r)*e}else if(n>o&&n>u){let e=2*Math.sqrt(1+n-o-u);this._w=(l-s)/e,this._x=.25*e,this._y=(r+a)/e,this._z=(i+c)/e}else if(o>u){let e=2*Math.sqrt(1+o-n-u);this._w=(i-c)/e,this._x=(r+a)/e,this._y=.25*e,this._z=(s+l)/e}else{let e=2*Math.sqrt(1+u-n-o);this._w=(a-r)/e,this._x=(i+c)/e,this._y=(s+l)/e,this._z=.25*e}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<2**-52?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ee(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let r=Math.min(1,t/n);return this.slerp(e,r),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x*=e,this._y*=e,this._z*=e,this._w*=e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,r=e._y,i=e._z,a=e._w,o=t._x,s=t._y,c=t._z,l=t._w;return this._x=n*l+a*o+r*c-i*s,this._y=r*l+a*s+i*o-n*c,this._z=i*l+a*c+n*s-r*o,this._w=a*l-n*o-r*s-i*c,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);let n=this._x,r=this._y,i=this._z,a=this._w,o=a*e._w+n*e._x+r*e._y+i*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=n,this._y=r,this._z=i,this;let s=1-o*o;if(s<=2**-52){let e=1-t;return this._w=e*a+t*this._w,this._x=e*n+t*this._x,this._y=e*r+t*this._y,this._z=e*i+t*this._z,this.normalize(),this}let c=Math.sqrt(s),l=Math.atan2(c,o),u=Math.sin((1-t)*l)/c,d=Math.sin(t*l)/c;return this._w=a*u+this._w*d,this._x=n*u+this._x*d,this._y=r*u+this._y*d,this._z=i*u+this._z*d,this._onChangeCallback(),this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),r=Math.sqrt(1-n),i=Math.sqrt(n);return this.set(r*Math.sin(e),r*Math.cos(e),i*Math.sin(t),i*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},U=class e{constructor(t=0,n=0,r=0){e.prototype.isVector3=!0,this.x=t,this.y=n,this.z=r}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw Error(`index is out of range: `+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw Error(`index is out of range: `+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(xt.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(xt.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6]*r,this.y=i[1]*t+i[4]*n+i[7]*r,this.z=i[2]*t+i[5]*n+i[8]*r,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,r=this.z,i=e.elements,a=1/(i[3]*t+i[7]*n+i[11]*r+i[15]);return this.x=(i[0]*t+i[4]*n+i[8]*r+i[12])*a,this.y=(i[1]*t+i[5]*n+i[9]*r+i[13])*a,this.z=(i[2]*t+i[6]*n+i[10]*r+i[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,r=this.z,i=e.x,a=e.y,o=e.z,s=e.w,c=2*(a*r-o*n),l=2*(o*t-i*r),u=2*(i*n-a*t);return this.x=t+s*c+a*u-o*l,this.y=n+s*l+o*c-i*u,this.z=r+s*u+i*l-a*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,r=this.z,i=e.elements;return this.x=i[0]*t+i[4]*n+i[8]*r,this.y=i[1]*t+i[5]*n+i[9]*r,this.z=i[2]*t+i[6]*n+i[10]*r,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,r=e.y,i=e.z,a=t.x,o=t.y,s=t.z;return this.x=r*s-i*o,this.y=i*a-n*s,this.z=n*o-r*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return bt.copy(this).projectOnVector(e),this.sub(bt)}reflect(e){return this.sub(bt.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Ee(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,r=this.z-e.z;return t*t+n*n+r*r}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let r=Math.sin(t)*e;return this.x=r*Math.sin(n),this.y=Math.cos(t)*e,this.z=r*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),r=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=r,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},bt=new U,xt=new yt,St=class{constructor(e=new U(1/0,1/0,1/0),t=new U(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(wt.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(wt.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=wt.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute(`position`);if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let t=0,n=r.count;t<n;t++)e.isMesh===!0?e.getVertexPosition(t,wt):wt.fromBufferAttribute(r,t),wt.applyMatrix4(e.matrixWorld),this.expandByPoint(wt);else e.boundingBox===void 0?(n.boundingBox===null&&n.computeBoundingBox(),Tt.copy(n.boundingBox)):(e.boundingBox===null&&e.computeBoundingBox(),Tt.copy(e.boundingBox)),Tt.applyMatrix4(e.matrixWorld),this.union(Tt)}let r=e.children;for(let e=0,n=r.length;e<n;e++)this.expandByObject(r[e],t);return this}containsPoint(e){return!(e.x<this.min.x||e.x>this.max.x||e.y<this.min.y||e.y>this.max.y||e.z<this.min.z||e.z>this.max.z)}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return!(e.max.x<this.min.x||e.min.x>this.max.x||e.max.y<this.min.y||e.min.y>this.max.y||e.max.z<this.min.z||e.min.z>this.max.z)}intersectsSphere(e){return this.clampPoint(e.center,wt),wt.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Mt),Nt.subVectors(this.max,Mt),Et.subVectors(e.a,Mt),Dt.subVectors(e.b,Mt),Ot.subVectors(e.c,Mt),kt.subVectors(Dt,Et),At.subVectors(Ot,Dt),jt.subVectors(Et,Ot);let t=[0,-kt.z,kt.y,0,-At.z,At.y,0,-jt.z,jt.y,kt.z,0,-kt.x,At.z,0,-At.x,jt.z,0,-jt.x,-kt.y,kt.x,0,-At.y,At.x,0,-jt.y,jt.x,0];return!It(t,Et,Dt,Ot,Nt)||(t=[1,0,0,0,1,0,0,0,1],!It(t,Et,Dt,Ot,Nt))?!1:(Pt.crossVectors(kt,At),t=[Pt.x,Pt.y,Pt.z],It(t,Et,Dt,Ot,Nt))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,wt).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(wt).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Ct[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Ct[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Ct[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Ct[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Ct[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Ct[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Ct[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Ct[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Ct),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}},Ct=[new U,new U,new U,new U,new U,new U,new U,new U],wt=new U,Tt=new St,Et=new U,Dt=new U,Ot=new U,kt=new U,At=new U,jt=new U,Mt=new U,Nt=new U,Pt=new U,Ft=new U;function It(e,t,n,r,i){for(let a=0,o=e.length-3;a<=o;a+=3){Ft.fromArray(e,a);let o=i.x*Math.abs(Ft.x)+i.y*Math.abs(Ft.y)+i.z*Math.abs(Ft.z),s=t.dot(Ft),c=n.dot(Ft),l=r.dot(Ft);if(Math.max(-Math.max(s,c,l),Math.min(s,c,l))>o)return!1}return!0}var Lt=new St,Rt=new U,zt=new U,Bt=class{constructor(e=new U,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t===void 0?Lt.setFromPoints(e).getCenter(n):n.copy(t);let r=0;for(let t=0,i=e.length;t<i;t++)r=Math.max(r,n.distanceToSquared(e[t]));return this.radius=Math.sqrt(r),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius*=e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Rt.subVectors(e,this.center);let t=Rt.lengthSq();if(t>this.radius*this.radius){let e=Math.sqrt(t),n=(e-this.radius)*.5;this.center.addScaledVector(Rt,n/e),this.radius+=n}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(zt.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Rt.copy(e.center).add(zt)),this.expandByPoint(Rt.copy(e.center).sub(zt))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}},Vt=new U,Ht=new U,Ut=new U,Wt=new U,Gt=new U,Kt=new U,qt=new U,Jt=class{constructor(e=new U,t=new U(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Vt)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Vt.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Vt.copy(this.origin).addScaledVector(this.direction,t),Vt.distanceToSquared(e))}distanceSqToSegment(e,t,n,r){Ht.copy(e).add(t).multiplyScalar(.5),Ut.copy(t).sub(e).normalize(),Wt.copy(this.origin).sub(Ht);let i=e.distanceTo(t)*.5,a=-this.direction.dot(Ut),o=Wt.dot(this.direction),s=-Wt.dot(Ut),c=Wt.lengthSq(),l=Math.abs(1-a*a),u,d,f,p;if(l>0){if(u=a*s-o,d=a*o-s,p=i*l,u>=0){if(d>=-p){if(d<=p){let e=1/l;u*=e,d*=e,f=u*(u+a*d+2*o)+d*(a*u+d+2*s)+c}else d=i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d=-i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c}else d<=-p?(u=Math.max(0,-(-a*i+o)),d=u>0?-i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c):d<=p?(u=0,d=Math.min(Math.max(-i,-s),i),f=d*(d+2*s)+c):(u=Math.max(0,-(a*i+o)),d=u>0?i:Math.min(Math.max(-i,-s),i),f=-u*u+d*(d+2*s)+c)}else d=a>0?-i:i,u=Math.max(0,-(a*d+o)),f=-u*u+d*(d+2*s)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,u),r&&r.copy(Ht).addScaledVector(Ut,d),f}intersectSphere(e,t){Vt.subVectors(e.center,this.origin);let n=Vt.dot(this.direction),r=Vt.dot(Vt)-n*n,i=e.radius*e.radius;if(r>i)return null;let a=Math.sqrt(i-r),o=n-a,s=n+a;return s<0?null:o<0?this.at(s,t):this.at(o,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,r,i,a,o,s,c=1/this.direction.x,l=1/this.direction.y,u=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,r=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,r=(e.min.x-d.x)*c),l>=0?(i=(e.min.y-d.y)*l,a=(e.max.y-d.y)*l):(i=(e.max.y-d.y)*l,a=(e.min.y-d.y)*l),n>a||i>r||((i>n||isNaN(n))&&(n=i),(a<r||isNaN(r))&&(r=a),u>=0?(o=(e.min.z-d.z)*u,s=(e.max.z-d.z)*u):(o=(e.max.z-d.z)*u,s=(e.min.z-d.z)*u),n>s||o>r)||((o>n||n!==n)&&(n=o),(s<r||r!==r)&&(r=s),r<0)?null:this.at(n>=0?n:r,t)}intersectsBox(e){return this.intersectBox(e,Vt)!==null}intersectTriangle(e,t,n,r,i){Gt.subVectors(t,e),Kt.subVectors(n,e),qt.crossVectors(Gt,Kt);let a=this.direction.dot(qt),o;if(a>0){if(r)return null;o=1}else if(a<0)o=-1,a=-a;else return null;Wt.subVectors(this.origin,e);let s=o*this.direction.dot(Kt.crossVectors(Wt,Kt));if(s<0)return null;let c=o*this.direction.dot(Gt.cross(Wt));if(c<0||s+c>a)return null;let l=-o*Wt.dot(qt);return l<0?null:this.at(l/a,i)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},W=class e{constructor(t,n,r,i,a,o,s,c,l,u,d,f,p,m,h,g){e.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,n,r,i,a,o,s,c,l,u,d,f,p,m,h,g)}set(e,t,n,r,i,a,o,s,c,l,u,d,f,p,m,h){let g=this.elements;return g[0]=e,g[4]=t,g[8]=n,g[12]=r,g[1]=i,g[5]=a,g[9]=o,g[13]=s,g[2]=c,g[6]=l,g[10]=u,g[14]=d,g[3]=f,g[7]=p,g[11]=m,g[15]=h,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new e().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){let t=this.elements,n=e.elements,r=1/Yt.setFromMatrixColumn(e,0).length(),i=1/Yt.setFromMatrixColumn(e,1).length(),a=1/Yt.setFromMatrixColumn(e,2).length();return t[0]=n[0]*r,t[1]=n[1]*r,t[2]=n[2]*r,t[3]=0,t[4]=n[4]*i,t[5]=n[5]*i,t[6]=n[6]*i,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,r=e.y,i=e.z,a=Math.cos(n),o=Math.sin(n),s=Math.cos(r),c=Math.sin(r),l=Math.cos(i),u=Math.sin(i);if(e.order===`XYZ`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=-s*u,t[8]=c,t[1]=n+r*c,t[5]=e-i*c,t[9]=-o*s,t[2]=i-e*c,t[6]=r+n*c,t[10]=a*s}else if(e.order===`YXZ`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e+i*o,t[4]=r*o-n,t[8]=a*c,t[1]=a*u,t[5]=a*l,t[9]=-o,t[2]=n*o-r,t[6]=i+e*o,t[10]=a*s}else if(e.order===`ZXY`){let e=s*l,n=s*u,r=c*l,i=c*u;t[0]=e-i*o,t[4]=-a*u,t[8]=r+n*o,t[1]=n+r*o,t[5]=a*l,t[9]=i-e*o,t[2]=-a*c,t[6]=o,t[10]=a*s}else if(e.order===`ZYX`){let e=a*l,n=a*u,r=o*l,i=o*u;t[0]=s*l,t[4]=r*c-n,t[8]=e*c+i,t[1]=s*u,t[5]=i*c+e,t[9]=n*c-r,t[2]=-c,t[6]=o*s,t[10]=a*s}else if(e.order===`YZX`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=i-e*u,t[8]=r*u+n,t[1]=u,t[5]=a*l,t[9]=-o*l,t[2]=-c*l,t[6]=n*u+r,t[10]=e-i*u}else if(e.order===`XZY`){let e=a*s,n=a*c,r=o*s,i=o*c;t[0]=s*l,t[4]=-u,t[8]=c*l,t[1]=e*u+i,t[5]=a*l,t[9]=n*u-r,t[2]=r*u-n,t[6]=o*l,t[10]=i*u+e}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Zt,e,Qt)}lookAt(e,t,n){let r=this.elements;return tn.subVectors(e,t),tn.lengthSq()===0&&(tn.z=1),tn.normalize(),$t.crossVectors(n,tn),$t.lengthSq()===0&&(Math.abs(n.z)===1?tn.x+=1e-4:tn.z+=1e-4,tn.normalize(),$t.crossVectors(n,tn)),$t.normalize(),en.crossVectors(tn,$t),r[0]=$t.x,r[4]=en.x,r[8]=tn.x,r[1]=$t.y,r[5]=en.y,r[9]=tn.y,r[2]=$t.z,r[6]=en.z,r[10]=tn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,r=t.elements,i=this.elements,a=n[0],o=n[4],s=n[8],c=n[12],l=n[1],u=n[5],d=n[9],f=n[13],p=n[2],m=n[6],h=n[10],g=n[14],_=n[3],v=n[7],y=n[11],b=n[15],x=r[0],S=r[4],C=r[8],w=r[12],T=r[1],E=r[5],D=r[9],O=r[13],k=r[2],A=r[6],j=r[10],ee=r[14],M=r[3],N=r[7],P=r[11],te=r[15];return i[0]=a*x+o*T+s*k+c*M,i[4]=a*S+o*E+s*A+c*N,i[8]=a*C+o*D+s*j+c*P,i[12]=a*w+o*O+s*ee+c*te,i[1]=l*x+u*T+d*k+f*M,i[5]=l*S+u*E+d*A+f*N,i[9]=l*C+u*D+d*j+f*P,i[13]=l*w+u*O+d*ee+f*te,i[2]=p*x+m*T+h*k+g*M,i[6]=p*S+m*E+h*A+g*N,i[10]=p*C+m*D+h*j+g*P,i[14]=p*w+m*O+h*ee+g*te,i[3]=_*x+v*T+y*k+b*M,i[7]=_*S+v*E+y*A+b*N,i[11]=_*C+v*D+y*j+b*P,i[15]=_*w+v*O+y*ee+b*te,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],r=e[8],i=e[12],a=e[1],o=e[5],s=e[9],c=e[13],l=e[2],u=e[6],d=e[10],f=e[14],p=e[3],m=e[7],h=e[11],g=e[15];return p*(+i*s*u-r*c*u-i*o*d+n*c*d+r*o*f-n*s*f)+m*(+t*s*f-t*c*d+i*a*d-r*a*f+r*c*l-i*s*l)+h*(+t*c*u-t*o*f-i*a*u+n*a*f+i*o*l-n*c*l)+g*(-r*o*l-t*s*u+t*o*d+r*a*u-n*a*d+n*s*l)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let r=this.elements;return e.isVector3?(r[12]=e.x,r[13]=e.y,r[14]=e.z):(r[12]=e,r[13]=t,r[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],r=e[2],i=e[3],a=e[4],o=e[5],s=e[6],c=e[7],l=e[8],u=e[9],d=e[10],f=e[11],p=e[12],m=e[13],h=e[14],g=e[15],_=u*h*c-m*d*c+m*s*f-o*h*f-u*s*g+o*d*g,v=p*d*c-l*h*c-p*s*f+a*h*f+l*s*g-a*d*g,y=l*m*c-p*u*c+p*o*f-a*m*f-l*o*g+a*u*g,b=p*u*s-l*m*s-p*o*d+a*m*d+l*o*h-a*u*h,x=t*_+n*v+r*y+i*b;if(x===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let S=1/x;return e[0]=_*S,e[1]=(m*d*i-u*h*i-m*r*f+n*h*f+u*r*g-n*d*g)*S,e[2]=(o*h*i-m*s*i+m*r*c-n*h*c-o*r*g+n*s*g)*S,e[3]=(u*s*i-o*d*i-u*r*c+n*d*c+o*r*f-n*s*f)*S,e[4]=v*S,e[5]=(l*h*i-p*d*i+p*r*f-t*h*f-l*r*g+t*d*g)*S,e[6]=(p*s*i-a*h*i-p*r*c+t*h*c+a*r*g-t*s*g)*S,e[7]=(a*d*i-l*s*i+l*r*c-t*d*c-a*r*f+t*s*f)*S,e[8]=y*S,e[9]=(p*u*i-l*m*i-p*n*f+t*m*f+l*n*g-t*u*g)*S,e[10]=(a*m*i-p*o*i+p*n*c-t*m*c-a*n*g+t*o*g)*S,e[11]=(l*o*i-a*u*i-l*n*c+t*u*c+a*n*f-t*o*f)*S,e[12]=b*S,e[13]=(l*m*r-p*u*r+p*n*d-t*m*d-l*n*h+t*u*h)*S,e[14]=(p*o*r-a*m*r-p*n*s+t*m*s+a*n*h-t*o*h)*S,e[15]=(a*u*r-l*o*r+l*n*s-t*u*s-a*n*d+t*o*d)*S,this}scale(e){let t=this.elements,n=e.x,r=e.y,i=e.z;return t[0]*=n,t[4]*=r,t[8]*=i,t[1]*=n,t[5]*=r,t[9]*=i,t[2]*=n,t[6]*=r,t[10]*=i,t[3]*=n,t[7]*=r,t[11]*=i,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],r=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,r))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),r=Math.sin(t),i=1-n,a=e.x,o=e.y,s=e.z,c=i*a,l=i*o;return this.set(c*a+n,c*o-r*s,c*s+r*o,0,c*o+r*s,l*o+n,l*s-r*a,0,c*s-r*o,l*s+r*a,i*s*s+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,r,i,a){return this.set(1,n,i,0,e,1,a,0,t,r,1,0,0,0,0,1),this}compose(e,t,n){let r=this.elements,i=t._x,a=t._y,o=t._z,s=t._w,c=i+i,l=a+a,u=o+o,d=i*c,f=i*l,p=i*u,m=a*l,h=a*u,g=o*u,_=s*c,v=s*l,y=s*u,b=n.x,x=n.y,S=n.z;return r[0]=(1-(m+g))*b,r[1]=(f+y)*b,r[2]=(p-v)*b,r[3]=0,r[4]=(f-y)*x,r[5]=(1-(d+g))*x,r[6]=(h+_)*x,r[7]=0,r[8]=(p+v)*S,r[9]=(h-_)*S,r[10]=(1-(d+m))*S,r[11]=0,r[12]=e.x,r[13]=e.y,r[14]=e.z,r[15]=1,this}decompose(e,t,n){let r=this.elements,i=Yt.set(r[0],r[1],r[2]).length(),a=Yt.set(r[4],r[5],r[6]).length(),o=Yt.set(r[8],r[9],r[10]).length();this.determinant()<0&&(i=-i),e.x=r[12],e.y=r[13],e.z=r[14],Xt.copy(this);let s=1/i,c=1/a,l=1/o;return Xt.elements[0]*=s,Xt.elements[1]*=s,Xt.elements[2]*=s,Xt.elements[4]*=c,Xt.elements[5]*=c,Xt.elements[6]*=c,Xt.elements[8]*=l,Xt.elements[9]*=l,Xt.elements[10]*=l,t.setFromRotationMatrix(Xt),n.x=i,n.y=a,n.z=o,this}makePerspective(e,t,n,r,i,a,o=ye){let s=this.elements,c=2*i/(t-e),l=2*i/(n-r),u=(t+e)/(t-e),d=(n+r)/(n-r),f,p;if(o===2e3)f=-(a+i)/(a-i),p=-2*a*i/(a-i);else if(o===2001)f=-a/(a-i),p=-a*i/(a-i);else throw Error(`THREE.Matrix4.makePerspective(): Invalid coordinate system: `+o);return s[0]=c,s[4]=0,s[8]=u,s[12]=0,s[1]=0,s[5]=l,s[9]=d,s[13]=0,s[2]=0,s[6]=0,s[10]=f,s[14]=p,s[3]=0,s[7]=0,s[11]=-1,s[15]=0,this}makeOrthographic(e,t,n,r,i,a,o=ye){let s=this.elements,c=1/(t-e),l=1/(n-r),u=1/(a-i),d=(t+e)*c,f=(n+r)*l,p,m;if(o===2e3)p=(a+i)*u,m=-2*u;else if(o===2001)p=i*u,m=-1*u;else throw Error(`THREE.Matrix4.makeOrthographic(): Invalid coordinate system: `+o);return s[0]=2*c,s[4]=0,s[8]=0,s[12]=-d,s[1]=0,s[5]=2*l,s[9]=0,s[13]=-f,s[2]=0,s[6]=0,s[10]=m,s[14]=-p,s[3]=0,s[7]=0,s[11]=0,s[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let e=0;e<16;e++)if(t[e]!==n[e])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}},Yt=new U,Xt=new W,Zt=new U(0,0,0),Qt=new U(1,1,1),$t=new U,en=new U,tn=new U,nn=new W,rn=new yt,an=class e{constructor(t=0,n=0,r=0,i=e.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=n,this._z=r,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,r=this._order){return this._x=e,this._y=t,this._z=n,this._order=r,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let r=e.elements,i=r[0],a=r[4],o=r[8],s=r[1],c=r[5],l=r[9],u=r[2],d=r[6],f=r[10];switch(t){case`XYZ`:this._y=Math.asin(Ee(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-l,f),this._z=Math.atan2(-a,i)):(this._x=Math.atan2(d,c),this._z=0);break;case`YXZ`:this._x=Math.asin(-Ee(l,-1,1)),Math.abs(l)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(s,c)):(this._y=Math.atan2(-u,i),this._z=0);break;case`ZXY`:this._x=Math.asin(Ee(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-a,c)):(this._y=0,this._z=Math.atan2(s,i));break;case`ZYX`:this._y=Math.asin(-Ee(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(s,i)):(this._x=0,this._z=Math.atan2(-a,c));break;case`YZX`:this._z=Math.asin(Ee(s,-1,1)),Math.abs(s)<.9999999?(this._x=Math.atan2(-l,c),this._y=Math.atan2(-u,i)):(this._x=0,this._y=Math.atan2(o,f));break;case`XZY`:this._z=Math.asin(-Ee(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(o,i)):(this._x=Math.atan2(-l,f),this._y=0);break;default:console.warn(`THREE.Euler: .setFromRotationMatrix() encountered an unknown order: `+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return nn.makeRotationFromQuaternion(e),this.setFromRotationMatrix(nn,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return rn.setFromEuler(this),this.setFromQuaternion(rn,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};an.DEFAULT_ORDER=`XYZ`;var on=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return!!(this.mask&(1<<e|0))}},sn=0,cn=new U,ln=new yt,un=new W,dn=new U,fn=new U,pn=new U,mn=new yt,hn=new U(1,0,0),gn=new U(0,1,0),_n=new U(0,0,1),vn={type:`added`},yn={type:`removed`},bn={type:`childadded`,child:null},xn={type:`childremoved`,child:null},Sn=class e extends be{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:sn++}),this.uuid=Te(),this.name=``,this.type=`Object3D`,this.parent=null,this.children=[],this.up=e.DEFAULT_UP.clone();let t=new U,n=new an,r=new yt,i=new U(1,1,1);function a(){r.setFromEuler(n,!1)}function o(){n.setFromQuaternion(r,void 0,!1)}n._onChange(a),r._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:n},quaternion:{configurable:!0,enumerable:!0,value:r},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new W},normalMatrix:{value:new H}}),this.matrix=new W,this.matrixWorld=new W,this.matrixAutoUpdate=e.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=e.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new on,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return ln.setFromAxisAngle(e,t),this.quaternion.multiply(ln),this}rotateOnWorldAxis(e,t){return ln.setFromAxisAngle(e,t),this.quaternion.premultiply(ln),this}rotateX(e){return this.rotateOnAxis(hn,e)}rotateY(e){return this.rotateOnAxis(gn,e)}rotateZ(e){return this.rotateOnAxis(_n,e)}translateOnAxis(e,t){return cn.copy(e).applyQuaternion(this.quaternion),this.position.add(cn.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(hn,e)}translateY(e){return this.translateOnAxis(gn,e)}translateZ(e){return this.translateOnAxis(_n,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(un.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?dn.copy(e):dn.set(e,t,n);let r=this.parent;this.updateWorldMatrix(!0,!1),fn.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?un.lookAt(fn,dn,this.up):un.lookAt(dn,fn,this.up),this.quaternion.setFromRotationMatrix(un),r&&(un.extractRotation(r.matrixWorld),ln.setFromRotationMatrix(un),this.quaternion.premultiply(ln.invert()))}add(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return e===this?(console.error(`THREE.Object3D.add: object can't be added as a child of itself.`,e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(vn),bn.child=e,this.dispatchEvent(bn),bn.child=null):console.error(`THREE.Object3D.add: object not an instance of THREE.Object3D.`,e),this)}remove(e){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.remove(arguments[e]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(yn),xn.child=e,this.dispatchEvent(xn),xn.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),un.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),un.multiply(e.parent.matrixWorld)),e.applyMatrix4(un),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(vn),bn.child=e,this.dispatchEvent(bn),bn.child=null,this}getObjectById(e){return this.getObjectByProperty(`id`,e)}getObjectByName(e){return this.getObjectByProperty(`name`,e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,r=this.children.length;n<r;n++){let r=this.children[n].getObjectByProperty(e,t);if(r!==void 0)return r}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let r=this.children;for(let i=0,a=r.length;i<a;i++)r[i].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(fn,e,pn),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(fn,mn,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,r=t.length;n<r;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,r=t.length;n<r;n++){let r=t[n];(r.matrixWorldAutoUpdate===!0||e===!0)&&r.updateMatrixWorld(e)}}updateWorldMatrix(e,t){let n=this.parent;if(e===!0&&n!==null&&n.matrixWorldAutoUpdate===!0&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),t===!0){let e=this.children;for(let t=0,n=e.length;t<n;t++){let n=e[t];n.matrixWorldAutoUpdate===!0&&n.updateWorldMatrix(!1,!0)}}}toJSON(e){let t=e===void 0||typeof e==`string`,n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.6,type:`Object`,generator:`Object3D.toJSON`});let r={};r.uuid=this.uuid,r.type=this.type,this.name!==``&&(r.name=this.name),this.castShadow===!0&&(r.castShadow=!0),this.receiveShadow===!0&&(r.receiveShadow=!0),this.visible===!1&&(r.visible=!1),this.frustumCulled===!1&&(r.frustumCulled=!1),this.renderOrder!==0&&(r.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(r.userData=this.userData),r.layers=this.layers.mask,r.matrix=this.matrix.toArray(),r.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(r.matrixAutoUpdate=!1),this.isInstancedMesh&&(r.type=`InstancedMesh`,r.count=this.count,r.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(r.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(r.type=`BatchedMesh`,r.perObjectFrustumCulled=this.perObjectFrustumCulled,r.sortObjects=this.sortObjects,r.drawRanges=this._drawRanges,r.reservedRanges=this._reservedRanges,r.visibility=this._visibility,r.active=this._active,r.bounds=this._bounds.map(e=>({boxInitialized:e.boxInitialized,boxMin:e.box.min.toArray(),boxMax:e.box.max.toArray(),sphereInitialized:e.sphereInitialized,sphereRadius:e.sphere.radius,sphereCenter:e.sphere.center.toArray()})),r.maxGeometryCount=this._maxGeometryCount,r.maxVertexCount=this._maxVertexCount,r.maxIndexCount=this._maxIndexCount,r.geometryInitialized=this._geometryInitialized,r.geometryCount=this._geometryCount,r.matricesTexture=this._matricesTexture.toJSON(e),this.boundingSphere!==null&&(r.boundingSphere={center:r.boundingSphere.center.toArray(),radius:r.boundingSphere.radius}),this.boundingBox!==null&&(r.boundingBox={min:r.boundingBox.min.toArray(),max:r.boundingBox.max.toArray()}));function i(t,n){return t[n.uuid]===void 0&&(t[n.uuid]=n.toJSON(e)),n.uuid}if(this.isScene)this.background&&(this.background.isColor?r.background=this.background.toJSON():this.background.isTexture&&(r.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(r.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){r.geometry=i(e.geometries,this.geometry);let t=this.geometry.parameters;if(t!==void 0&&t.shapes!==void 0){let n=t.shapes;if(Array.isArray(n))for(let t=0,r=n.length;t<r;t++){let r=n[t];i(e.shapes,r)}else i(e.shapes,n)}}if(this.isSkinnedMesh&&(r.bindMode=this.bindMode,r.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(i(e.skeletons,this.skeleton),r.skeleton=this.skeleton.uuid)),this.material!==void 0){if(Array.isArray(this.material)){let t=[];for(let n=0,r=this.material.length;n<r;n++)t.push(i(e.materials,this.material[n]));r.material=t}else r.material=i(e.materials,this.material)}if(this.children.length>0){r.children=[];for(let t=0;t<this.children.length;t++)r.children.push(this.children[t].toJSON(e).object)}if(this.animations.length>0){r.animations=[];for(let t=0;t<this.animations.length;t++){let n=this.animations[t];r.animations.push(i(e.animations,n))}}if(t){let t=a(e.geometries),r=a(e.materials),i=a(e.textures),o=a(e.images),s=a(e.shapes),c=a(e.skeletons),l=a(e.animations),u=a(e.nodes);t.length>0&&(n.geometries=t),r.length>0&&(n.materials=r),i.length>0&&(n.textures=i),o.length>0&&(n.images=o),s.length>0&&(n.shapes=s),c.length>0&&(n.skeletons=c),l.length>0&&(n.animations=l),u.length>0&&(n.nodes=u)}return n.object=r,n;function a(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let t=0;t<e.children.length;t++){let n=e.children[t];this.add(n.clone())}return this}};Sn.DEFAULT_UP=new U(0,1,0),Sn.DEFAULT_MATRIX_AUTO_UPDATE=!0,Sn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Cn=new U,wn=new U,Tn=new U,En=new U,Dn=new U,On=new U,kn=new U,An=new U,jn=new U,Mn=new U,Nn=class e{constructor(e=new U,t=new U,n=new U){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,r){r.subVectors(n,t),Cn.subVectors(e,t),r.cross(Cn);let i=r.lengthSq();return i>0?r.multiplyScalar(1/Math.sqrt(i)):r.set(0,0,0)}static getBarycoord(e,t,n,r,i){Cn.subVectors(r,t),wn.subVectors(n,t),Tn.subVectors(e,t);let a=Cn.dot(Cn),o=Cn.dot(wn),s=Cn.dot(Tn),c=wn.dot(wn),l=wn.dot(Tn),u=a*c-o*o;if(u===0)return i.set(0,0,0),null;let d=1/u,f=(c*s-o*l)*d,p=(a*l-o*s)*d;return i.set(1-f-p,p,f)}static containsPoint(e,t,n,r){return this.getBarycoord(e,t,n,r,En)!==null&&En.x>=0&&En.y>=0&&En.x+En.y<=1}static getInterpolation(e,t,n,r,i,a,o,s){return this.getBarycoord(e,t,n,r,En)===null?(s.x=0,s.y=0,`z`in s&&(s.z=0),`w`in s&&(s.w=0),null):(s.setScalar(0),s.addScaledVector(i,En.x),s.addScaledVector(a,En.y),s.addScaledVector(o,En.z),s)}static isFrontFacing(e,t,n,r){return Cn.subVectors(n,t),wn.subVectors(e,t),Cn.cross(wn).dot(r)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,r){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[r]),this}setFromAttributeAndIndices(e,t,n,r){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,r),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Cn.subVectors(this.c,this.b),wn.subVectors(this.a,this.b),Cn.cross(wn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return e.getNormal(this.a,this.b,this.c,t)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,n){return e.getBarycoord(t,this.a,this.b,this.c,n)}getInterpolation(t,n,r,i,a){return e.getInterpolation(t,this.a,this.b,this.c,n,r,i,a)}containsPoint(t){return e.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return e.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,r=this.b,i=this.c,a,o;Dn.subVectors(r,n),On.subVectors(i,n),An.subVectors(e,n);let s=Dn.dot(An),c=On.dot(An);if(s<=0&&c<=0)return t.copy(n);jn.subVectors(e,r);let l=Dn.dot(jn),u=On.dot(jn);if(l>=0&&u<=l)return t.copy(r);let d=s*u-l*c;if(d<=0&&s>=0&&l<=0)return a=s/(s-l),t.copy(n).addScaledVector(Dn,a);Mn.subVectors(e,i);let f=Dn.dot(Mn),p=On.dot(Mn);if(p>=0&&f<=p)return t.copy(i);let m=f*c-s*p;if(m<=0&&c>=0&&p<=0)return o=c/(c-p),t.copy(n).addScaledVector(On,o);let h=l*p-f*u;if(h<=0&&u-l>=0&&f-p>=0)return kn.subVectors(i,r),o=(u-l)/(u-l+(f-p)),t.copy(r).addScaledVector(kn,o);let g=1/(h+m+d);return a=m*g,o=d*g,t.copy(n).addScaledVector(Dn,a).addScaledVector(On,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},Pn={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Fn={h:0,s:0,l:0},In={h:0,s:0,l:0};function Ln(e,t,n){return n<0&&(n+=1),n>1&&--n,n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*6*(2/3-n):e}var G=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let t=e;t&&t.isColor?this.copy(t):typeof t==`number`?this.setHex(t):typeof t==`string`&&this.setStyle(t)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=pe){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,it.toWorkingColorSpace(this,t),this}setRGB(e,t,n,r=it.workingColorSpace){return this.r=e,this.g=t,this.b=n,it.toWorkingColorSpace(this,r),this}setHSL(e,t,n,r=it.workingColorSpace){if(e=De(e,1),t=Ee(t,0,1),n=Ee(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,i=2*n-r;this.r=Ln(i,r,e+1/3),this.g=Ln(i,r,e),this.b=Ln(i,r,e-1/3)}return it.toWorkingColorSpace(this,r),this}setStyle(e,t=pe){function n(t){t!==void 0&&parseFloat(t)<1&&console.warn(`THREE.Color: Alpha component of `+e+` will be ignored.`)}let r;if(r=/^(\w+)\(([^\)]*)\)/.exec(e)){let i,a=r[1],o=r[2];switch(a){case`rgb`:case`rgba`:if(i=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(255,parseInt(i[1],10))/255,Math.min(255,parseInt(i[2],10))/255,Math.min(255,parseInt(i[3],10))/255,t);if(i=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setRGB(Math.min(100,parseInt(i[1],10))/100,Math.min(100,parseInt(i[2],10))/100,Math.min(100,parseInt(i[3],10))/100,t);break;case`hsl`:case`hsla`:if(i=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(i[4]),this.setHSL(parseFloat(i[1])/360,parseFloat(i[2])/100,parseFloat(i[3])/100,t);break;default:console.warn(`THREE.Color: Unknown color model `+e)}}else if(r=/^\#([A-Fa-f\d]+)$/.exec(e)){let n=r[1],i=n.length;if(i===3)return this.setRGB(parseInt(n.charAt(0),16)/15,parseInt(n.charAt(1),16)/15,parseInt(n.charAt(2),16)/15,t);if(i===6)return this.setHex(parseInt(n,16),t);console.warn(`THREE.Color: Invalid hex color `+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=pe){let n=Pn[e.toLowerCase()];return n===void 0?console.warn(`THREE.Color: Unknown color `+e):this.setHex(n,t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=at(e.r),this.g=at(e.g),this.b=at(e.b),this}copyLinearToSRGB(e){return this.r=ot(e.r),this.g=ot(e.g),this.b=ot(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=pe){return it.fromWorkingColorSpace(Rn.copy(this),e),Math.round(Ee(Rn.r*255,0,255))*65536+Math.round(Ee(Rn.g*255,0,255))*256+Math.round(Ee(Rn.b*255,0,255))}getHexString(e=pe){return(`000000`+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=it.workingColorSpace){it.fromWorkingColorSpace(Rn.copy(this),t);let n=Rn.r,r=Rn.g,i=Rn.b,a=Math.max(n,r,i),o=Math.min(n,r,i),s,c,l=(o+a)/2;if(o===a)s=0,c=0;else{let e=a-o;switch(c=l<=.5?e/(a+o):e/(2-a-o),a){case n:s=(r-i)/e+(r<i?6:0);break;case r:s=(i-n)/e+2;break;case i:s=(n-r)/e+4}s/=6}return e.h=s,e.s=c,e.l=l,e}getRGB(e,t=it.workingColorSpace){return it.fromWorkingColorSpace(Rn.copy(this),t),e.r=Rn.r,e.g=Rn.g,e.b=Rn.b,e}getStyle(e=pe){it.fromWorkingColorSpace(Rn.copy(this),e);let t=Rn.r,n=Rn.g,r=Rn.b;return e===`srgb`?`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(r*255)})`:`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${r.toFixed(3)})`}offsetHSL(e,t,n){return this.getHSL(Fn),this.setHSL(Fn.h+e,Fn.s+t,Fn.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Fn),e.getHSL(In);let n=Ae(Fn.h,In.h,t),r=Ae(Fn.s,In.s,t),i=Ae(Fn.l,In.l,t);return this.setHSL(n,r,i),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,r=this.b,i=e.elements;return this.r=i[0]*t+i[3]*n+i[6]*r,this.g=i[1]*t+i[4]*n+i[7]*r,this.b=i[2]*t+i[5]*n+i[8]*r,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Rn=new G;G.NAMES=Pn;var zn=0,Bn=class extends be{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:zn++}),this.uuid=Te(),this.name=``,this.type=`Material`,this.blending=1,this.side=0,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=204,this.blendDst=205,this.blendEquation=100,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new G(0,0,0),this.blendAlpha=0,this.depthFunc=3,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=519,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=B,this.stencilZFail=B,this.stencilZPass=B,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBuild(){}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}let r=this[t];if(r===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}r&&r.isColor?r.set(n):r&&r.isVector3&&n&&n.isVector3?r.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e==`string`;t&&(e={textures:{},images:{}});let n={metadata:{version:4.6,type:`Material`,generator:`Material.toJSON`}};n.uuid=this.uuid,n.type=this.type,this.name!==``&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==1&&(n.blending=this.blending),this.side!==0&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==204&&(n.blendSrc=this.blendSrc),this.blendDst!==205&&(n.blendDst=this.blendDst),this.blendEquation!==100&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==3&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==519&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==7680&&(n.stencilFail=this.stencilFail),this.stencilZFail!==7680&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==7680&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!==`round`&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!==`round`&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function r(e){let t=[];for(let n in e){let r=e[n];delete r.metadata,t.push(r)}return t}if(t){let t=r(e.textures),i=r(e.images);t.length>0&&(n.textures=t),i.length>0&&(n.images=i)}return n}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let e=t.length;n=Array(e);for(let r=0;r!==e;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:`dispose`})}set needsUpdate(e){e===!0&&this.version++}},Vn=class extends Bn{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type=`MeshBasicMaterial`,this.color=new G(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new an,this.combine=0,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},Hn=Un();function Un(){let e=new ArrayBuffer(4),t=new Float32Array(e),n=new Uint32Array(e),r=new Uint32Array(512),i=new Uint32Array(512);for(let e=0;e<256;++e){let t=e-127;t<-27?(r[e]=0,r[e|256]=32768,i[e]=24,i[e|256]=24):t<-14?(r[e]=1024>>-t-14,r[e|256]=1024>>-t-14|32768,i[e]=-t-1,i[e|256]=-t-1):t<=15?(r[e]=t+15<<10,r[e|256]=t+15<<10|32768,i[e]=13,i[e|256]=13):t<128?(r[e]=31744,r[e|256]=64512,i[e]=24,i[e|256]=24):(r[e]=31744,r[e|256]=64512,i[e]=13,i[e|256]=13)}let a=new Uint32Array(2048),o=new Uint32Array(64),s=new Uint32Array(64);for(let e=1;e<1024;++e){let t=e<<13,n=0;for(;!(t&8388608);)t<<=1,n-=8388608;t&=-8388609,n+=947912704,a[e]=t|n}for(let e=1024;e<2048;++e)a[e]=939524096+(e-1024<<13);for(let e=1;e<31;++e)o[e]=e<<23;o[31]=1199570944,o[32]=2147483648;for(let e=33;e<63;++e)o[e]=2147483648+(e-32<<23);o[63]=3347054592;for(let e=1;e<64;++e)e!==32&&(s[e]=1024);return{floatView:t,uint32View:n,baseTable:r,shiftTable:i,mantissaTable:a,exponentTable:o,offsetTable:s}}function Wn(e){Math.abs(e)>65504&&console.warn(`THREE.DataUtils.toHalfFloat(): Value out of range.`),e=Ee(e,-65504,65504),Hn.floatView[0]=e;let t=Hn.uint32View[0],n=t>>23&511;return Hn.baseTable[n]+((t&8388607)>>Hn.shiftTable[n])}function Gn(e){let t=e>>10;return Hn.uint32View[0]=Hn.mantissaTable[Hn.offsetTable[t]+(e&1023)]+Hn.exponentTable[t],Hn.floatView[0]}var Kn={toHalfFloat:Wn,fromHalfFloat:Gn},qn=new U,Jn=new V,Yn=class{constructor(e,t,n=!1){if(Array.isArray(e))throw TypeError(`THREE.BufferAttribute: array should be a Typed Array.`);this.isBufferAttribute=!0,this.name=``,this.array=e,this.itemSize=t,this.count=e===void 0?0:e.length/t,this.normalized=n,this.usage=ve,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.gpuType=b,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}get updateRange(){return $e(`THREE.BufferAttribute: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead.`),this._updateRange}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let r=0,i=this.itemSize;r<i;r++)this.array[e+r]=t.array[n+r];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Jn.fromBufferAttribute(this,t),Jn.applyMatrix3(e),this.setXY(t,Jn.x,Jn.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)qn.fromBufferAttribute(this,t),qn.applyMatrix3(e),this.setXYZ(t,qn.x,qn.y,qn.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)qn.fromBufferAttribute(this,t),qn.applyMatrix4(e),this.setXYZ(t,qn.x,qn.y,qn.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)qn.fromBufferAttribute(this,t),qn.applyNormalMatrix(e),this.setXYZ(t,qn.x,qn.y,qn.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)qn.fromBufferAttribute(this,t),qn.transformDirection(e),this.setXYZ(t,qn.x,qn.y,qn.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Ge(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Ke(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Ge(t,this.array)),t}setX(e,t){return this.normalized&&(t=Ke(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Ge(t,this.array)),t}setY(e,t){return this.normalized&&(t=Ke(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Ge(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Ke(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Ge(t,this.array)),t}setW(e,t){return this.normalized&&(t=Ke(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=Ke(t,this.array),n=Ke(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,r){return e*=this.itemSize,this.normalized&&(t=Ke(t,this.array),n=Ke(n,this.array),r=Ke(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e*=this.itemSize,this.normalized&&(t=Ke(t,this.array),n=Ke(n,this.array),r=Ke(r,this.array),i=Ke(i,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=r,this.array[e+3]=i,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==``&&(e.name=this.name),this.usage!==35044&&(e.usage=this.usage),e}},Xn=class extends Yn{constructor(e,t,n){super(new Uint16Array(e),t,n)}},Zn=class extends Yn{constructor(e,t,n){super(new Uint32Array(e),t,n)}},Qn=class extends Yn{constructor(e,t,n){super(new Float32Array(e),t,n)}},$n=0,er=new W,tr=new Sn,nr=new U,rr=new St,ir=new St,ar=new U,or=class e extends be{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:$n++}),this.uuid=Te(),this.name=``,this.type=`BufferGeometry`,this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return this.index=Array.isArray(e)?new(Ye(e)?Zn:Xn)(e,1):e,this}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let t=new H().getNormalMatrix(e);n.applyNormalMatrix(t),n.needsUpdate=!0}let r=this.attributes.tangent;return r!==void 0&&(r.transformDirection(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return er.makeRotationFromQuaternion(e),this.applyMatrix4(er),this}rotateX(e){return er.makeRotationX(e),this.applyMatrix4(er),this}rotateY(e){return er.makeRotationY(e),this.applyMatrix4(er),this}rotateZ(e){return er.makeRotationZ(e),this.applyMatrix4(er),this}translate(e,t,n){return er.makeTranslation(e,t,n),this.applyMatrix4(er),this}scale(e,t,n){return er.makeScale(e,t,n),this.applyMatrix4(er),this}lookAt(e){return tr.lookAt(e),tr.updateMatrix(),this.applyMatrix4(tr.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(nr).negate(),this.translate(nr.x,nr.y,nr.z),this}setFromPoints(e){let t=[];for(let n=0,r=e.length;n<r;n++){let r=e[n];t.push(r.x,r.y,r.z||0)}return this.setAttribute(`position`,new Qn(t,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new St);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error(`THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.`,this),this.boundingBox.set(new U(-1/0,-1/0,-1/0),new U(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];rr.setFromBufferAttribute(n),this.morphTargetsRelative?(ar.addVectors(this.boundingBox.min,rr.min),this.boundingBox.expandByPoint(ar),ar.addVectors(this.boundingBox.max,rr.max),this.boundingBox.expandByPoint(ar)):(this.boundingBox.expandByPoint(rr.min),this.boundingBox.expandByPoint(rr.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error(`THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.`,this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Bt);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error(`THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.`,this),this.boundingSphere.set(new U,1/0);return}if(e){let n=this.boundingSphere.center;if(rr.setFromBufferAttribute(e),t)for(let e=0,n=t.length;e<n;e++){let n=t[e];ir.setFromBufferAttribute(n),this.morphTargetsRelative?(ar.addVectors(rr.min,ir.min),rr.expandByPoint(ar),ar.addVectors(rr.max,ir.max),rr.expandByPoint(ar)):(rr.expandByPoint(ir.min),rr.expandByPoint(ir.max))}rr.getCenter(n);let r=0;for(let t=0,i=e.count;t<i;t++)ar.fromBufferAttribute(e,t),r=Math.max(r,n.distanceToSquared(ar));if(t)for(let i=0,a=t.length;i<a;i++){let a=t[i],o=this.morphTargetsRelative;for(let t=0,i=a.count;t<i;t++)ar.fromBufferAttribute(a,t),o&&(nr.fromBufferAttribute(e,t),ar.add(nr)),r=Math.max(r,n.distanceToSquared(ar))}this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error(`THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.`,this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error(`THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)`);return}let n=t.position,r=t.normal,i=t.uv;this.hasAttribute(`tangent`)===!1&&this.setAttribute(`tangent`,new Yn(new Float32Array(4*n.count),4));let a=this.getAttribute(`tangent`),o=[],s=[];for(let e=0;e<n.count;e++)o[e]=new U,s[e]=new U;let c=new U,l=new U,u=new U,d=new V,f=new V,p=new V,m=new U,h=new U;function g(e,t,r){c.fromBufferAttribute(n,e),l.fromBufferAttribute(n,t),u.fromBufferAttribute(n,r),d.fromBufferAttribute(i,e),f.fromBufferAttribute(i,t),p.fromBufferAttribute(i,r),l.sub(c),u.sub(c),f.sub(d),p.sub(d);let a=1/(f.x*p.y-p.x*f.y);isFinite(a)&&(m.copy(l).multiplyScalar(p.y).addScaledVector(u,-f.y).multiplyScalar(a),h.copy(u).multiplyScalar(f.x).addScaledVector(l,-p.x).multiplyScalar(a),o[e].add(m),o[t].add(m),o[r].add(m),s[e].add(h),s[t].add(h),s[r].add(h))}let _=this.groups;_.length===0&&(_=[{start:0,count:e.count}]);for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)g(e.getX(t+0),e.getX(t+1),e.getX(t+2))}let v=new U,y=new U,b=new U,x=new U;function S(e){b.fromBufferAttribute(r,e),x.copy(b);let t=o[e];v.copy(t),v.sub(b.multiplyScalar(b.dot(t))).normalize(),y.crossVectors(x,t);let n=y.dot(s[e])<0?-1:1;a.setXYZW(e,v.x,v.y,v.z,n)}for(let t=0,n=_.length;t<n;++t){let n=_[t],r=n.start,i=n.count;for(let t=r,n=r+i;t<n;t+=3)S(e.getX(t+0)),S(e.getX(t+1)),S(e.getX(t+2))}}computeVertexNormals(){let e=this.index,t=this.getAttribute(`position`);if(t!==void 0){let n=this.getAttribute(`normal`);if(n===void 0)n=new Yn(new Float32Array(t.count*3),3),this.setAttribute(`normal`,n);else for(let e=0,t=n.count;e<t;e++)n.setXYZ(e,0,0,0);let r=new U,i=new U,a=new U,o=new U,s=new U,c=new U,l=new U,u=new U;if(e)for(let d=0,f=e.count;d<f;d+=3){let f=e.getX(d+0),p=e.getX(d+1),m=e.getX(d+2);r.fromBufferAttribute(t,f),i.fromBufferAttribute(t,p),a.fromBufferAttribute(t,m),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),o.fromBufferAttribute(n,f),s.fromBufferAttribute(n,p),c.fromBufferAttribute(n,m),o.add(l),s.add(l),c.add(l),n.setXYZ(f,o.x,o.y,o.z),n.setXYZ(p,s.x,s.y,s.z),n.setXYZ(m,c.x,c.y,c.z)}else for(let e=0,o=t.count;e<o;e+=3)r.fromBufferAttribute(t,e+0),i.fromBufferAttribute(t,e+1),a.fromBufferAttribute(t,e+2),l.subVectors(a,i),u.subVectors(r,i),l.cross(u),n.setXYZ(e+0,l.x,l.y,l.z),n.setXYZ(e+1,l.x,l.y,l.z),n.setXYZ(e+2,l.x,l.y,l.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)ar.fromBufferAttribute(e,t),ar.normalize(),e.setXYZ(t,ar.x,ar.y,ar.z)}toNonIndexed(){function t(e,t){let n=e.array,r=e.itemSize,i=e.normalized,a=new n.constructor(t.length*r),o=0,s=0;for(let i=0,c=t.length;i<c;i++){o=e.isInterleavedBufferAttribute?t[i]*e.data.stride+e.offset:t[i]*r;for(let e=0;e<r;e++)a[s++]=n[o++]}return new Yn(a,r,i)}if(this.index===null)return console.warn(`THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed.`),this;let n=new e,r=this.index.array,i=this.attributes;for(let e in i){let a=i[e],o=t(a,r);n.setAttribute(e,o)}let a=this.morphAttributes;for(let e in a){let i=[],o=a[e];for(let e=0,n=o.length;e<n;e++){let n=o[e],a=t(n,r);i.push(a)}n.morphAttributes[e]=i}n.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let e=0,t=o.length;e<t;e++){let t=o[e];n.addGroup(t.start,t.count,t.materialIndex)}return n}toJSON(){let e={metadata:{version:4.6,type:`BufferGeometry`,generator:`BufferGeometry.toJSON`}};if(e.uuid=this.uuid,e.type=this.type,this.name!==``&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){let t=this.parameters;for(let n in t)t[n]!==void 0&&(e[n]=t[n]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let t in n){let r=n[t];e.data.attributes[t]=r.toJSON(e.data)}let r={},i=!1;for(let t in this.morphAttributes){let n=this.morphAttributes[t],a=[];for(let t=0,r=n.length;t<r;t++){let r=n[t];a.push(r.toJSON(e.data))}a.length>0&&(r[t]=a,i=!0)}i&&(e.data.morphAttributes=r,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone(t));let r=e.attributes;for(let e in r){let n=r[e];this.setAttribute(e,n.clone(t))}let i=e.morphAttributes;for(let e in i){let n=[],r=i[e];for(let e=0,i=r.length;e<i;e++)n.push(r[e].clone(t));this.morphAttributes[e]=n}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let e=0,t=a.length;e<t;e++){let t=a[e];this.addGroup(t.start,t.count,t.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let s=e.boundingSphere;return s!==null&&(this.boundingSphere=s.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:`dispose`})}},sr=new W,cr=new Jt,lr=new Bt,ur=new U,dr=new U,fr=new U,pr=new U,mr=new U,hr=new U,gr=new V,_r=new V,vr=new V,yr=new U,br=new U,xr=new U,Sr=new U,Cr=new U,wr=class extends Sn{constructor(e=new or,t=new Vn){super(),this.isMesh=!0,this.type=`Mesh`,this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}getVertexPosition(e,t){let n=this.geometry,r=n.attributes.position,i=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(r,e);let o=this.morphTargetInfluences;if(i&&o){hr.set(0,0,0);for(let n=0,r=i.length;n<r;n++){let r=o[n],s=i[n];r!==0&&(mr.fromBufferAttribute(s,e),a?hr.addScaledVector(mr,r):hr.addScaledVector(mr.sub(t),r))}t.add(hr)}return t}raycast(e,t){let n=this.geometry,r=this.material,i=this.matrixWorld;r!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),lr.copy(n.boundingSphere),lr.applyMatrix4(i),cr.copy(e.ray).recast(e.near),!(lr.containsPoint(cr.origin)===!1&&(cr.intersectSphere(lr,ur)===null||cr.origin.distanceToSquared(ur)>(e.far-e.near)**2))&&(sr.copy(i).invert(),cr.copy(e.ray).applyMatrix4(sr),(n.boundingBox===null||cr.intersectsBox(n.boundingBox)!==!1)&&this._computeIntersections(e,t,cr)))}_computeIntersections(e,t,n){let r,i=this.geometry,a=this.material,o=i.index,s=i.attributes.position,c=i.attributes.uv,l=i.attributes.uv1,u=i.attributes.normal,d=i.groups,f=i.drawRange;if(o!==null){if(Array.isArray(a))for(let i=0,s=d.length;i<s;i++){let s=d[i],p=a[s.materialIndex],m=Math.max(s.start,f.start),h=Math.min(o.count,Math.min(s.start+s.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=o.getX(i),d=o.getX(i+1),f=o.getX(i+2);r=Er(this,p,e,n,c,l,u,a,d,f),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=s.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),s=Math.min(o.count,f.start+f.count);for(let d=i,f=s;d<f;d+=3){let i=o.getX(d),s=o.getX(d+1),f=o.getX(d+2);r=Er(this,a,e,n,c,l,u,i,s,f),r&&(r.faceIndex=Math.floor(d/3),t.push(r))}}}else if(s!==void 0){if(Array.isArray(a))for(let i=0,o=d.length;i<o;i++){let o=d[i],p=a[o.materialIndex],m=Math.max(o.start,f.start),h=Math.min(s.count,Math.min(o.start+o.count,f.start+f.count));for(let i=m,a=h;i<a;i+=3){let a=i,s=i+1,d=i+2;r=Er(this,p,e,n,c,l,u,a,s,d),r&&(r.faceIndex=Math.floor(i/3),r.face.materialIndex=o.materialIndex,t.push(r))}}else{let i=Math.max(0,f.start),o=Math.min(s.count,f.start+f.count);for(let s=i,d=o;s<d;s+=3){let i=s,o=s+1,d=s+2;r=Er(this,a,e,n,c,l,u,i,o,d),r&&(r.faceIndex=Math.floor(s/3),t.push(r))}}}}};function Tr(e,t,n,r,i,a,o,s){let c;if(c=t.side===1?r.intersectTriangle(o,a,i,!0,s):r.intersectTriangle(i,a,o,t.side===0,s),c===null)return null;Cr.copy(s),Cr.applyMatrix4(e.matrixWorld);let l=n.ray.origin.distanceTo(Cr);return l<n.near||l>n.far?null:{distance:l,point:Cr.clone(),object:e}}function Er(e,t,n,r,i,a,o,s,c,l){e.getVertexPosition(s,dr),e.getVertexPosition(c,fr),e.getVertexPosition(l,pr);let u=Tr(e,t,n,r,dr,fr,pr,Sr);if(u){i&&(gr.fromBufferAttribute(i,s),_r.fromBufferAttribute(i,c),vr.fromBufferAttribute(i,l),u.uv=Nn.getInterpolation(Sr,dr,fr,pr,gr,_r,vr,new V)),a&&(gr.fromBufferAttribute(a,s),_r.fromBufferAttribute(a,c),vr.fromBufferAttribute(a,l),u.uv1=Nn.getInterpolation(Sr,dr,fr,pr,gr,_r,vr,new V)),o&&(yr.fromBufferAttribute(o,s),br.fromBufferAttribute(o,c),xr.fromBufferAttribute(o,l),u.normal=Nn.getInterpolation(Sr,dr,fr,pr,yr,br,xr,new U),u.normal.dot(r.direction)>0&&u.normal.multiplyScalar(-1));let e={a:s,b:c,c:l,normal:new U,materialIndex:0};Nn.getNormal(dr,fr,pr,e.normal),u.face=e}return u}var Dr=class e extends or{constructor(e=1,t=1,n=1,r=1,i=1,a=1){super(),this.type=`BoxGeometry`,this.parameters={width:e,height:t,depth:n,widthSegments:r,heightSegments:i,depthSegments:a};let o=this;r=Math.floor(r),i=Math.floor(i),a=Math.floor(a);let s=[],c=[],l=[],u=[],d=0,f=0;p(`z`,`y`,`x`,-1,-1,n,t,e,a,i,0),p(`z`,`y`,`x`,1,-1,n,t,-e,a,i,1),p(`x`,`z`,`y`,1,1,e,n,t,r,a,2),p(`x`,`z`,`y`,1,-1,e,n,-t,r,a,3),p(`x`,`y`,`z`,1,-1,e,t,n,r,i,4),p(`x`,`y`,`z`,-1,-1,e,t,-n,r,i,5),this.setIndex(s),this.setAttribute(`position`,new Qn(c,3)),this.setAttribute(`normal`,new Qn(l,3)),this.setAttribute(`uv`,new Qn(u,2));function p(e,t,n,r,i,a,p,m,h,g,_){let v=a/h,y=p/g,b=a/2,x=p/2,S=m/2,C=h+1,w=g+1,T=0,E=0,D=new U;for(let a=0;a<w;a++){let o=a*y-x;for(let s=0;s<C;s++)D[e]=(s*v-b)*r,D[t]=o*i,D[n]=S,c.push(D.x,D.y,D.z),D[e]=0,D[t]=0,D[n]=m>0?1:-1,l.push(D.x,D.y,D.z),u.push(s/h),u.push(1-a/g),T+=1}for(let e=0;e<g;e++)for(let t=0;t<h;t++){let n=d+t+C*e,r=d+t+C*(e+1),i=d+(t+1)+C*(e+1),a=d+(t+1)+C*e;s.push(n,r,a),s.push(r,i,a),E+=6}o.addGroup(f,E,_),f+=E,d+=T}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}};function Or(e){let t={};for(let n in e){t[n]={};for(let r in e[n]){let i=e[n][r];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?i.isRenderTargetTexture?(console.warn(`UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms().`),t[n][r]=null):t[n][r]=i.clone():Array.isArray(i)?t[n][r]=i.slice():t[n][r]=i}}return t}function kr(e){let t={};for(let n=0;n<e.length;n++){let r=Or(e[n]);for(let e in r)t[e]=r[e]}return t}function Ar(e){let t=[];for(let n=0;n<e.length;n++)t.push(e[n].clone());return t}function jr(e){let t=e.getRenderTarget();return t===null?e.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:it.workingColorSpace}var Mr={clone:Or,merge:kr},Nr=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Pr=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Fr=class extends Bn{constructor(e){super(),this.isShaderMaterial=!0,this.type=`ShaderMaterial`,this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Nr,this.fragmentShader=Pr,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Or(e.uniforms),this.uniformsGroups=Ar(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let n in this.uniforms){let r=this.uniforms[n].value;r&&r.isTexture?t.uniforms[n]={type:`t`,value:r.toJSON(e).uuid}:r&&r.isColor?t.uniforms[n]={type:`c`,value:r.getHex()}:r&&r.isVector2?t.uniforms[n]={type:`v2`,value:r.toArray()}:r&&r.isVector3?t.uniforms[n]={type:`v3`,value:r.toArray()}:r&&r.isVector4?t.uniforms[n]={type:`v4`,value:r.toArray()}:r&&r.isMatrix3?t.uniforms[n]={type:`m3`,value:r.toArray()}:r&&r.isMatrix4?t.uniforms[n]={type:`m4`,value:r.toArray()}:t.uniforms[n]={value:r}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let e in this.extensions)this.extensions[e]===!0&&(n[e]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}},Ir=class extends Sn{constructor(){super(),this.isCamera=!0,this.type=`Camera`,this.matrixWorldInverse=new W,this.projectionMatrix=new W,this.projectionMatrixInverse=new W,this.coordinateSystem=ye}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},Lr=new U,Rr=new V,zr=new V,Br=class extends Ir{constructor(e=50,t=1,n=.1,r=2e3){super(),this.isPerspectiveCamera=!0,this.type=`PerspectiveCamera`,this.fov=e,this.zoom=1,this.near=n,this.far=r,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=we*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(Ce*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return we*2*Math.atan(Math.tan(Ce*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Lr.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Lr.x,Lr.y).multiplyScalar(-e/Lr.z),Lr.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Lr.x,Lr.y).multiplyScalar(-e/Lr.z)}getViewSize(e,t){return this.getViewBounds(e,Rr,zr),t.subVectors(zr,Rr)}setViewOffset(e,t,n,r,i,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(Ce*.5*this.fov)/this.zoom,n=2*t,r=this.aspect*n,i=-.5*r,a=this.view;if(this.view!==null&&this.view.enabled){let e=a.fullWidth,o=a.fullHeight;i+=a.offsetX*r/e,t-=a.offsetY*n/o,r*=a.width/e,n*=a.height/o}let o=this.filmOffset;o!==0&&(i+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(i,i+r,t,t-n,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},Vr=-90,Hr=1,Ur=class extends Sn{constructor(e,t,n){super(),this.type=`CubeCamera`,this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let r=new Br(Vr,Hr,e,t);r.layers=this.layers,this.add(r);let i=new Br(Vr,Hr,e,t);i.layers=this.layers,this.add(i);let a=new Br(Vr,Hr,e,t);a.layers=this.layers,this.add(a);let o=new Br(Vr,Hr,e,t);o.layers=this.layers,this.add(o);let s=new Br(Vr,Hr,e,t);s.layers=this.layers,this.add(s);let c=new Br(Vr,Hr,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,r,i,a,o,s]=t;for(let e of t)this.remove(e);if(e===2e3)n.up.set(0,1,0),n.lookAt(1,0,0),r.up.set(0,1,0),r.lookAt(-1,0,0),i.up.set(0,0,-1),i.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),s.up.set(0,1,0),s.lookAt(0,0,-1);else if(e===2001)n.up.set(0,-1,0),n.lookAt(-1,0,0),r.up.set(0,-1,0),r.lookAt(1,0,0),i.up.set(0,0,1),i.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),s.up.set(0,-1,0),s.lookAt(0,0,-1);else throw Error(`THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: `+e);for(let e of t)this.add(e),e.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:r}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[i,a,o,s,c,l]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;let m=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0,r),e.render(t,i),e.setRenderTarget(n,1,r),e.render(t,a),e.setRenderTarget(n,2,r),e.render(t,o),e.setRenderTarget(n,3,r),e.render(t,s),e.setRenderTarget(n,4,r),e.render(t,c),n.texture.generateMipmaps=m,e.setRenderTarget(n,5,r),e.render(t,l),e.setRenderTarget(u,d,f),e.xr.enabled=p,n.texture.needsPMREMUpdate=!0}},Wr=class extends pt{constructor(e,t,n,r,i,a,o,s,c,l){e=e===void 0?[]:e,t=t===void 0?301:t,super(e,t,n,r,i,a,o,s,c,l),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Gr=class extends gt{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},r=[n,n,n,n,n,n];this.texture=new Wr(r,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0&&t.generateMipmaps,this.texture.minFilter=t.minFilter===void 0?d:t.minFilter}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},r=new Dr(5,5,5),i=new Fr({name:`CubemapFromEquirect`,uniforms:Or(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:1,blending:0});i.uniforms.tEquirect.value=t;let a=new wr(r,i),o=t.minFilter;return t.minFilter===1008&&(t.minFilter=d),new Ur(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t,n,r){let i=e.getRenderTarget();for(let i=0;i<6;i++)e.setRenderTarget(this,i),e.clear(t,n,r);e.setRenderTarget(i)}},Kr=new U,qr=new U,Jr=new H,Yr=class{constructor(e=new U(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,r){return this.normal.set(e,t,n),this.constant=r,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let r=Kr.subVectors(n,t).cross(qr.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(r,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){let n=e.delta(Kr),r=this.normal.dot(n);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let i=-(e.start.dot(this.normal)+this.constant)/r;return i<0||i>1?null:t.copy(e.start).addScaledVector(n,i)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||Jr.getNormalMatrix(e),r=this.coplanarPoint(Kr).applyMatrix4(e),i=this.normal.applyMatrix3(n).normalize();return this.constant=-r.dot(i),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},Xr=new Bt,Zr=new U,Qr=class{constructor(e=new Yr,t=new Yr,n=new Yr,r=new Yr,i=new Yr,a=new Yr){this.planes=[e,t,n,r,i,a]}set(e,t,n,r,i,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(r),o[4].copy(i),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=ye){let n=this.planes,r=e.elements,i=r[0],a=r[1],o=r[2],s=r[3],c=r[4],l=r[5],u=r[6],d=r[7],f=r[8],p=r[9],m=r[10],h=r[11],g=r[12],_=r[13],v=r[14],y=r[15];if(n[0].setComponents(s-i,d-c,h-f,y-g).normalize(),n[1].setComponents(s+i,d+c,h+f,y+g).normalize(),n[2].setComponents(s+a,d+l,h+p,y+_).normalize(),n[3].setComponents(s-a,d-l,h-p,y-_).normalize(),n[4].setComponents(s-o,d-u,h-m,y-v).normalize(),t===2e3)n[5].setComponents(s+o,d+u,h+m,y+v).normalize();else if(t===2001)n[5].setComponents(o,u,m,v).normalize();else throw Error(`THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: `+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Xr.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Xr.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Xr)}intersectsSprite(e){return Xr.center.set(0,0,0),Xr.radius=.7071067811865476,Xr.applyMatrix4(e.matrixWorld),this.intersectsSphere(Xr)}intersectsSphere(e){let t=this.planes,n=e.center,r=-e.radius;for(let e=0;e<6;e++)if(t[e].distanceToPoint(n)<r)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let r=t[n];if(Zr.x=r.normal.x>0?e.max.x:e.min.x,Zr.y=r.normal.y>0?e.max.y:e.min.y,Zr.z=r.normal.z>0?e.max.z:e.min.z,r.distanceToPoint(Zr)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};function $r(){let e=null,t=!1,n=null,r=null;function i(t,a){n(t,a),r=e.requestAnimationFrame(i)}return{start:function(){t!==!0&&n!==null&&(r=e.requestAnimationFrame(i),t=!0)},stop:function(){e.cancelAnimationFrame(r),t=!1},setAnimationLoop:function(e){n=e},setContext:function(t){e=t}}}function ei(e){let t=new WeakMap;function n(t,n){let r=t.array,i=t.usage,a=r.byteLength,o=e.createBuffer();e.bindBuffer(n,o),e.bufferData(n,r,i),t.onUploadCallback();let s;if(r instanceof Float32Array)s=e.FLOAT;else if(r instanceof Uint16Array)s=t.isFloat16BufferAttribute?e.HALF_FLOAT:e.UNSIGNED_SHORT;else if(r instanceof Int16Array)s=e.SHORT;else if(r instanceof Uint32Array)s=e.UNSIGNED_INT;else if(r instanceof Int32Array)s=e.INT;else if(r instanceof Int8Array)s=e.BYTE;else if(r instanceof Uint8Array)s=e.UNSIGNED_BYTE;else if(r instanceof Uint8ClampedArray)s=e.UNSIGNED_BYTE;else throw Error(`THREE.WebGLAttributes: Unsupported buffer data format: `+r);return{buffer:o,type:s,bytesPerElement:r.BYTES_PER_ELEMENT,version:t.version,size:a}}function r(t,n,r){let i=n.array,a=n._updateRange,o=n.updateRanges;if(e.bindBuffer(r,t),a.count===-1&&o.length===0&&e.bufferSubData(r,0,i),o.length!==0){for(let t=0,n=o.length;t<n;t++){let n=o[t];e.bufferSubData(r,n.start*i.BYTES_PER_ELEMENT,i,n.start,n.count)}n.clearUpdateRanges()}a.count!==-1&&(e.bufferSubData(r,a.offset*i.BYTES_PER_ELEMENT,i,a.offset,a.count),a.count=-1),n.onUploadCallback()}function i(e){return e.isInterleavedBufferAttribute&&(e=e.data),t.get(e)}function a(n){n.isInterleavedBufferAttribute&&(n=n.data);let r=t.get(n);r&&(e.deleteBuffer(r.buffer),t.delete(n))}function o(e,i){if(e.isGLBufferAttribute){let n=t.get(e);(!n||n.version<e.version)&&t.set(e,{buffer:e.buffer,type:e.type,bytesPerElement:e.elementSize,version:e.version});return}e.isInterleavedBufferAttribute&&(e=e.data);let a=t.get(e);if(a===void 0)t.set(e,n(e,i));else if(a.version<e.version){if(a.size!==e.array.byteLength)throw Error(`THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.`);r(a.buffer,e,i),a.version=e.version}}return{get:i,remove:a,update:o}}var ti=class e extends or{constructor(e=1,t=1,n=1,r=1){super(),this.type=`PlaneGeometry`,this.parameters={width:e,height:t,widthSegments:n,heightSegments:r};let i=e/2,a=t/2,o=Math.floor(n),s=Math.floor(r),c=o+1,l=s+1,u=e/o,d=t/s,f=[],p=[],m=[],h=[];for(let e=0;e<l;e++){let t=e*d-a;for(let n=0;n<c;n++){let r=n*u-i;p.push(r,-t,0),m.push(0,0,1),h.push(n/o),h.push(1-e/s)}}for(let e=0;e<s;e++)for(let t=0;t<o;t++){let n=t+c*e,r=t+c*(e+1),i=t+1+c*(e+1),a=t+1+c*e;f.push(n,r,a),f.push(r,i,a)}this.setIndex(f),this.setAttribute(`position`,new Qn(p,3)),this.setAttribute(`normal`,new Qn(m,3)),this.setAttribute(`uv`,new Qn(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.width,t.height,t.widthSegments,t.heightSegments)}},K={alphahash_fragment:`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,alphahash_pars_fragment:`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,alphamap_fragment:`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,alphamap_pars_fragment:`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,alphatest_fragment:`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,alphatest_pars_fragment:`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,aomap_fragment:`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,aomap_pars_fragment:`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,batching_pars_vertex:`#ifdef USE_BATCHING
	attribute float batchId;
	uniform highp sampler2D batchingTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,batching_vertex:`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( batchId );
#endif`,begin_vertex:`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,beginnormal_vertex:`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,bsdfs:`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,iridescence_fragment:`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,bumpmap_pars_fragment:`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,clipping_planes_fragment:`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,clipping_planes_pars_fragment:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,clipping_planes_pars_vertex:`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,clipping_planes_vertex:`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,color_fragment:`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,color_pars_fragment:`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,color_pars_vertex:`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	varying vec3 vColor;
#endif`,color_vertex:`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif`,common:`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
float luminance( const in vec3 rgb ) {
	const vec3 weights = vec3( 0.2126729, 0.7151522, 0.0721750 );
	return dot( weights, rgb );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,cube_uv_reflection_fragment:`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,defaultnormal_vertex:`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,displacementmap_pars_vertex:`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,displacementmap_vertex:`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,emissivemap_fragment:`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,emissivemap_pars_fragment:`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,colorspace_fragment:`gl_FragColor = linearToOutputTexel( gl_FragColor );`,colorspace_pars_fragment:`
const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 LinearToLinear( in vec4 value ) {
	return value;
}
vec4 LinearTosRGB( in vec4 value ) {
	return sRGBTransferOETF( value );
}`,envmap_fragment:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,envmap_common_pars_fragment:`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,envmap_pars_fragment:`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,envmap_pars_vertex:`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,envmap_physical_pars_fragment:`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,envmap_vertex:`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,fog_vertex:`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,fog_pars_vertex:`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,fog_fragment:`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,fog_pars_fragment:`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,gradientmap_pars_fragment:`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,lightmap_fragment:`#ifdef USE_LIGHTMAP
	vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
	vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
	reflectedLight.indirectDiffuse += lightMapIrradiance;
#endif`,lightmap_pars_fragment:`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lights_lambert_fragment:`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,lights_lambert_pars_fragment:`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,lights_pars_begin:`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	#if defined ( LEGACY_LIGHTS )
		if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
			return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );
		}
		return 1.0;
	#else
		float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
		if ( cutoffDistance > 0.0 ) {
			distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
		}
		return distanceFalloff;
	#endif
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,lights_toon_fragment:`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,lights_toon_pars_fragment:`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,lights_phong_fragment:`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,lights_phong_pars_fragment:`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,lights_physical_fragment:`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,lights_physical_pars_fragment:`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,lights_fragment_begin:`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lights_fragment_maps:`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,lights_fragment_end:`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,logdepthbuf_fragment:`#if defined( USE_LOGDEPTHBUF )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,logdepthbuf_pars_fragment:`#if defined( USE_LOGDEPTHBUF )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_pars_vertex:`#ifdef USE_LOGDEPTHBUF
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,logdepthbuf_vertex:`#ifdef USE_LOGDEPTHBUF
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,map_fragment:`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,map_pars_fragment:`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,map_particle_fragment:`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,map_particle_pars_fragment:`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,metalnessmap_fragment:`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,metalnessmap_pars_fragment:`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,morphinstance_vertex:`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[MORPHTARGETS_COUNT];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,morphcolor_vertex:`#if defined( USE_MORPHCOLORS ) && defined( MORPHTARGETS_TEXTURE )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,morphnormal_vertex:`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		objectNormal += morphNormal0 * morphTargetInfluences[ 0 ];
		objectNormal += morphNormal1 * morphTargetInfluences[ 1 ];
		objectNormal += morphNormal2 * morphTargetInfluences[ 2 ];
		objectNormal += morphNormal3 * morphTargetInfluences[ 3 ];
	#endif
#endif`,morphtarget_pars_vertex:`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
	#endif
	#ifdef MORPHTARGETS_TEXTURE
		#ifndef USE_INSTANCING_MORPH
			uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
		#endif
		uniform sampler2DArray morphTargetsTexture;
		uniform ivec2 morphTargetsTextureSize;
		vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
			int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
			int y = texelIndex / morphTargetsTextureSize.x;
			int x = texelIndex - y * morphTargetsTextureSize.x;
			ivec3 morphUV = ivec3( x, y, morphTargetIndex );
			return texelFetch( morphTargetsTexture, morphUV, 0 );
		}
	#else
		#ifndef USE_MORPHNORMALS
			uniform float morphTargetInfluences[ 8 ];
		#else
			uniform float morphTargetInfluences[ 4 ];
		#endif
	#endif
#endif`,morphtarget_vertex:`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		transformed += morphTarget0 * morphTargetInfluences[ 0 ];
		transformed += morphTarget1 * morphTargetInfluences[ 1 ];
		transformed += morphTarget2 * morphTargetInfluences[ 2 ];
		transformed += morphTarget3 * morphTargetInfluences[ 3 ];
		#ifndef USE_MORPHNORMALS
			transformed += morphTarget4 * morphTargetInfluences[ 4 ];
			transformed += morphTarget5 * morphTargetInfluences[ 5 ];
			transformed += morphTarget6 * morphTargetInfluences[ 6 ];
			transformed += morphTarget7 * morphTargetInfluences[ 7 ];
		#endif
	#endif
#endif`,normal_fragment_begin:`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,normal_fragment_maps:`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,normal_pars_fragment:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_pars_vertex:`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,normal_vertex:`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,normalmap_pars_fragment:`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,clearcoat_normal_fragment_begin:`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,clearcoat_normal_fragment_maps:`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,clearcoat_pars_fragment:`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iridescence_pars_fragment:`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,opaque_fragment:`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,packing:`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256., 256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );
const float ShiftRight8 = 1. / 256.;
vec4 packDepthToRGBA( const in float v ) {
	vec4 r = vec4( fract( v * PackFactors ), v );
	r.yzw -= r.xyz * ShiftRight8;	return r * PackUpscale;
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors );
}
vec2 packDepthToRG( in highp float v ) {
	return packDepthToRGBA( v ).yx;
}
float unpackRGToDepth( const in highp vec2 v ) {
	return unpackRGBAToDepth( vec4( v.xy, 0.0, 0.0 ) );
}
vec4 pack2HalfToRGBA( vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,premultiplied_alpha_fragment:`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,project_vertex:`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,dithering_fragment:`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,dithering_pars_fragment:`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,roughnessmap_fragment:`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,roughnessmap_pars_fragment:`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,shadowmap_pars_fragment:`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return shadow;
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return shadow;
	}
#endif`,shadowmap_pars_vertex:`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,shadowmap_vertex:`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,shadowmask_pars_fragment:`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,skinbase_vertex:`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,skinning_pars_vertex:`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,skinning_vertex:`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,skinnormal_vertex:`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,specularmap_fragment:`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,specularmap_pars_fragment:`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,tonemapping_fragment:`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,tonemapping_pars_fragment:`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 OptimizedCineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	float startCompression = 0.8 - 0.04;
	float desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min(color.r, min(color.g, color.b));
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max(color.r, max(color.g, color.b));
	if (peak < startCompression) return color;
	float d = 1. - startCompression;
	float newPeak = 1. - d * d / (peak + d - startCompression);
	color *= newPeak / peak;
	float g = 1. - 1. / (desaturation * (peak - newPeak) + 1.);
	return mix(color, newPeak * vec3(1, 1, 1), g);
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,transmission_fragment:`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,transmission_pars_fragment:`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
		vec3 refractedRayExit = position + transmissionRay;
		vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
		vec2 refractionCoords = ndcPos.xy / ndcPos.w;
		refractionCoords += 1.0;
		refractionCoords /= 2.0;
		vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
		vec3 transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,uv_pars_fragment:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_pars_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,uv_vertex:`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,worldpos_vertex:`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,background_vert:`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,background_frag:`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,backgroundCube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,backgroundCube_frag:`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,cube_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,cube_frag:`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,depth_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,depth_frag:`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#endif
}`,distanceRGBA_vert:`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,distanceRGBA_frag:`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,equirect_vert:`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,equirect_frag:`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,linedashed_vert:`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,linedashed_frag:`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,meshbasic_vert:`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,meshbasic_frag:`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshlambert_vert:`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshlambert_frag:`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshmatcap_vert:`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,meshmatcap_frag:`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshnormal_vert:`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,meshnormal_frag:`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,meshphong_vert:`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshphong_frag:`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshphysical_vert:`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,meshphysical_frag:`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,meshtoon_vert:`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,meshtoon_frag:`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,points_vert:`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,points_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,shadow_vert:`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,shadow_frag:`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,sprite_vert:`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,sprite_frag:`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`},q={common:{diffuse:{value:new G(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new H},alphaMap:{value:null},alphaMapTransform:{value:new H},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new H}},envmap:{envMap:{value:null},envMapRotation:{value:new H},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new H}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new H}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new H},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new H},normalScale:{value:new V(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new H},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new H}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new H}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new H}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new G(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new G(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new H},alphaTest:{value:0},uvTransform:{value:new H}},sprite:{diffuse:{value:new G(16777215)},opacity:{value:1},center:{value:new V(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new H},alphaMap:{value:null},alphaMapTransform:{value:new H},alphaTest:{value:0}}},ni={basic:{uniforms:kr([q.common,q.specularmap,q.envmap,q.aomap,q.lightmap,q.fog]),vertexShader:K.meshbasic_vert,fragmentShader:K.meshbasic_frag},lambert:{uniforms:kr([q.common,q.specularmap,q.envmap,q.aomap,q.lightmap,q.emissivemap,q.bumpmap,q.normalmap,q.displacementmap,q.fog,q.lights,{emissive:{value:new G(0)}}]),vertexShader:K.meshlambert_vert,fragmentShader:K.meshlambert_frag},phong:{uniforms:kr([q.common,q.specularmap,q.envmap,q.aomap,q.lightmap,q.emissivemap,q.bumpmap,q.normalmap,q.displacementmap,q.fog,q.lights,{emissive:{value:new G(0)},specular:{value:new G(1118481)},shininess:{value:30}}]),vertexShader:K.meshphong_vert,fragmentShader:K.meshphong_frag},standard:{uniforms:kr([q.common,q.envmap,q.aomap,q.lightmap,q.emissivemap,q.bumpmap,q.normalmap,q.displacementmap,q.roughnessmap,q.metalnessmap,q.fog,q.lights,{emissive:{value:new G(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:K.meshphysical_vert,fragmentShader:K.meshphysical_frag},toon:{uniforms:kr([q.common,q.aomap,q.lightmap,q.emissivemap,q.bumpmap,q.normalmap,q.displacementmap,q.gradientmap,q.fog,q.lights,{emissive:{value:new G(0)}}]),vertexShader:K.meshtoon_vert,fragmentShader:K.meshtoon_frag},matcap:{uniforms:kr([q.common,q.bumpmap,q.normalmap,q.displacementmap,q.fog,{matcap:{value:null}}]),vertexShader:K.meshmatcap_vert,fragmentShader:K.meshmatcap_frag},points:{uniforms:kr([q.points,q.fog]),vertexShader:K.points_vert,fragmentShader:K.points_frag},dashed:{uniforms:kr([q.common,q.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:K.linedashed_vert,fragmentShader:K.linedashed_frag},depth:{uniforms:kr([q.common,q.displacementmap]),vertexShader:K.depth_vert,fragmentShader:K.depth_frag},normal:{uniforms:kr([q.common,q.bumpmap,q.normalmap,q.displacementmap,{opacity:{value:1}}]),vertexShader:K.meshnormal_vert,fragmentShader:K.meshnormal_frag},sprite:{uniforms:kr([q.sprite,q.fog]),vertexShader:K.sprite_vert,fragmentShader:K.sprite_frag},background:{uniforms:{uvTransform:{value:new H},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:K.background_vert,fragmentShader:K.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new H}},vertexShader:K.backgroundCube_vert,fragmentShader:K.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:K.cube_vert,fragmentShader:K.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:K.equirect_vert,fragmentShader:K.equirect_frag},distanceRGBA:{uniforms:kr([q.common,q.displacementmap,{referencePosition:{value:new U},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:K.distanceRGBA_vert,fragmentShader:K.distanceRGBA_frag},shadow:{uniforms:kr([q.lights,q.fog,{color:{value:new G(0)},opacity:{value:1}}]),vertexShader:K.shadow_vert,fragmentShader:K.shadow_frag}};ni.physical={uniforms:kr([ni.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new H},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new H},clearcoatNormalScale:{value:new V(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new H},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new H},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new H},sheen:{value:0},sheenColor:{value:new G(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new H},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new H},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new H},transmissionSamplerSize:{value:new V},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new H},attenuationDistance:{value:0},attenuationColor:{value:new G(0)},specularColor:{value:new G(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new H},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new H},anisotropyVector:{value:new V},anisotropyMap:{value:null},anisotropyMapTransform:{value:new H}}]),vertexShader:K.meshphysical_vert,fragmentShader:K.meshphysical_frag};var ri={r:0,b:0,g:0},ii=new an,ai=new W;function oi(e,t,n,r,i,a,o){let s=new G(0),c=a===!0?0:1,l,u,d=null,f=0,p=null;function m(a,m){let g=!1,_=m.isScene===!0?m.background:null;_&&_.isTexture&&(_=(m.backgroundBlurriness>0?n:t).get(_)),_===null?h(s,c):_&&_.isColor&&(h(_,1),g=!0);let v=e.xr.getEnvironmentBlendMode();v===`additive`?r.buffers.color.setClear(0,0,0,1,o):v===`alpha-blend`&&r.buffers.color.setClear(0,0,0,0,o),(e.autoClear||g)&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),_&&(_.isCubeTexture||_.mapping===306)?(u===void 0&&(u=new wr(new Dr(1,1,1),new Fr({name:`BackgroundCubeMaterial`,uniforms:Or(ni.backgroundCube.uniforms),vertexShader:ni.backgroundCube.vertexShader,fragmentShader:ni.backgroundCube.fragmentShader,side:1,depthTest:!1,depthWrite:!1,fog:!1})),u.geometry.deleteAttribute(`normal`),u.geometry.deleteAttribute(`uv`),u.onBeforeRender=function(e,t,n){this.matrixWorld.copyPosition(n.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(u)),ii.copy(m.backgroundRotation),ii.x*=-1,ii.y*=-1,ii.z*=-1,_.isCubeTexture&&_.isRenderTargetTexture===!1&&(ii.y*=-1,ii.z*=-1),u.material.uniforms.envMap.value=_,u.material.uniforms.flipEnvMap.value=_.isCubeTexture&&_.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=m.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=m.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(ai.makeRotationFromEuler(ii)),u.material.toneMapped=it.getTransfer(_.colorSpace)!==_e,(d!==_||f!==_.version||p!==e.toneMapping)&&(u.material.needsUpdate=!0,d=_,f=_.version,p=e.toneMapping),u.layers.enableAll(),a.unshift(u,u.geometry,u.material,0,0,null)):_&&_.isTexture&&(l===void 0&&(l=new wr(new ti(2,2),new Fr({name:`BackgroundMaterial`,uniforms:Or(ni.background.uniforms),vertexShader:ni.background.vertexShader,fragmentShader:ni.background.fragmentShader,side:0,depthTest:!1,depthWrite:!1,fog:!1})),l.geometry.deleteAttribute(`normal`),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(l)),l.material.uniforms.t2D.value=_,l.material.uniforms.backgroundIntensity.value=m.backgroundIntensity,l.material.toneMapped=it.getTransfer(_.colorSpace)!==_e,_.matrixAutoUpdate===!0&&_.updateMatrix(),l.material.uniforms.uvTransform.value.copy(_.matrix),(d!==_||f!==_.version||p!==e.toneMapping)&&(l.material.needsUpdate=!0,d=_,f=_.version,p=e.toneMapping),l.layers.enableAll(),a.unshift(l,l.geometry,l.material,0,0,null))}function h(t,n){t.getRGB(ri,jr(e)),r.buffers.color.setClear(ri.r,ri.g,ri.b,n,o)}return{getClearColor:function(){return s},setClearColor:function(e,t=1){s.set(e),c=t,h(s,c)},getClearAlpha:function(){return c},setClearAlpha:function(e){c=e,h(s,c)},render:m}}function si(e,t){let n=e.getParameter(e.MAX_VERTEX_ATTRIBS),r={},i=f(null),a=i,o=!1;function s(n,r,i,s,c){let u=!1,f=d(s,i,r);a!==f&&(a=f,l(a.object)),u=p(n,s,i,c),u&&m(n,s,i,c),c!==null&&t.update(c,e.ELEMENT_ARRAY_BUFFER),(u||o)&&(o=!1,b(n,r,i,s),c!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,t.get(c).buffer))}function c(){return e.createVertexArray()}function l(t){return e.bindVertexArray(t)}function u(t){return e.deleteVertexArray(t)}function d(e,t,n){let i=n.wireframe===!0,a=r[e.id];a===void 0&&(a={},r[e.id]=a);let o=a[t.id];o===void 0&&(o={},a[t.id]=o);let s=o[i];return s===void 0&&(s=f(c()),o[i]=s),s}function f(e){let t=[],r=[],i=[];for(let e=0;e<n;e++)t[e]=0,r[e]=0,i[e]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:t,enabledAttributes:r,attributeDivisors:i,object:e,attributes:{},index:null}}function p(e,t,n,r){let i=a.attributes,o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=i[t],r=o[t];if(r===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(r=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(r=e.instanceColor)),n===void 0||n.attribute!==r||r&&n.data!==r.data)return!0;s++}return a.attributesNum!==s||a.index!==r}function m(e,t,n,r){let i={},o=t.attributes,s=0,c=n.getAttributes();for(let t in c)if(c[t].location>=0){let n=o[t];n===void 0&&(t===`instanceMatrix`&&e.instanceMatrix&&(n=e.instanceMatrix),t===`instanceColor`&&e.instanceColor&&(n=e.instanceColor));let r={};r.attribute=n,n&&n.data&&(r.data=n.data),i[t]=r,s++}a.attributes=i,a.attributesNum=s,a.index=r}function h(){let e=a.newAttributes;for(let t=0,n=e.length;t<n;t++)e[t]=0}function g(e){_(e,0)}function _(t,n){let r=a.newAttributes,i=a.enabledAttributes,o=a.attributeDivisors;r[t]=1,i[t]===0&&(e.enableVertexAttribArray(t),i[t]=1),o[t]!==n&&(e.vertexAttribDivisor(t,n),o[t]=n)}function v(){let t=a.newAttributes,n=a.enabledAttributes;for(let r=0,i=n.length;r<i;r++)n[r]!==t[r]&&(e.disableVertexAttribArray(r),n[r]=0)}function y(t,n,r,i,a,o,s){s===!0?e.vertexAttribIPointer(t,n,r,a,o):e.vertexAttribPointer(t,n,r,i,a,o)}function b(n,r,i,a){h();let o=a.attributes,s=i.getAttributes(),c=r.defaultAttributeValues;for(let r in s){let i=s[r];if(i.location>=0){let s=o[r];if(s===void 0&&(r===`instanceMatrix`&&n.instanceMatrix&&(s=n.instanceMatrix),r===`instanceColor`&&n.instanceColor&&(s=n.instanceColor)),s!==void 0){let r=s.normalized,o=s.itemSize,c=t.get(s);if(c===void 0)continue;let l=c.buffer,u=c.type,d=c.bytesPerElement,f=u===e.INT||u===e.UNSIGNED_INT||s.gpuType===1013;if(s.isInterleavedBufferAttribute){let t=s.data,c=t.stride,p=s.offset;if(t.isInstancedInterleavedBuffer){for(let e=0;e<i.locationSize;e++)_(i.location+e,t.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=t.meshPerAttribute*t.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,c*d,(p+o/i.locationSize*e)*d,f)}else{if(s.isInstancedBufferAttribute){for(let e=0;e<i.locationSize;e++)_(i.location+e,s.meshPerAttribute);n.isInstancedMesh!==!0&&a._maxInstanceCount===void 0&&(a._maxInstanceCount=s.meshPerAttribute*s.count)}else for(let e=0;e<i.locationSize;e++)g(i.location+e);e.bindBuffer(e.ARRAY_BUFFER,l);for(let e=0;e<i.locationSize;e++)y(i.location+e,o/i.locationSize,u,r,o*d,o/i.locationSize*e*d,f)}}else if(c!==void 0){let t=c[r];if(t!==void 0)switch(t.length){case 2:e.vertexAttrib2fv(i.location,t);break;case 3:e.vertexAttrib3fv(i.location,t);break;case 4:e.vertexAttrib4fv(i.location,t);break;default:e.vertexAttrib1fv(i.location,t)}}}}v()}function x(){w();for(let e in r){let t=r[e];for(let e in t){let n=t[e];for(let e in n)u(n[e].object),delete n[e];delete t[e]}delete r[e]}}function S(e){if(r[e.id]===void 0)return;let t=r[e.id];for(let e in t){let n=t[e];for(let e in n)u(n[e].object),delete n[e];delete t[e]}delete r[e.id]}function C(e){for(let t in r){let n=r[t];if(n[e.id]===void 0)continue;let i=n[e.id];for(let e in i)u(i[e].object),delete i[e];delete n[e.id]}}function w(){T(),o=!0,a!==i&&(a=i,l(a.object))}function T(){i.geometry=null,i.program=null,i.wireframe=!1}return{setup:s,reset:w,resetDefaultState:T,dispose:x,releaseStatesOfGeometry:S,releaseStatesOfProgram:C,initAttributes:h,enableAttribute:g,disableUnusedAttributes:v}}function ci(e,t,n){let r;function i(e){r=e}function a(t,i){e.drawArrays(r,t,i),n.update(i,r,1)}function o(t,i,a){a!==0&&(e.drawArraysInstanced(r,t,i,a),n.update(i,r,a))}function s(e,i,a){if(a===0)return;let o=t.get(`WEBGL_multi_draw`);if(o===null)for(let t=0;t<a;t++)this.render(e[t],i[t]);else{o.multiDrawArraysWEBGL(r,e,0,i,0,a);let t=0;for(let e=0;e<a;e++)t+=i[e];n.update(t,r,1)}}this.setMode=i,this.render=a,this.renderInstances=o,this.renderMultiDraw=s}function li(e,t,n){let r;function i(){if(r!==void 0)return r;if(t.has(`EXT_texture_filter_anisotropic`)===!0){let n=t.get(`EXT_texture_filter_anisotropic`);r=e.getParameter(n.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else r=0;return r}function a(t){if(t===`highp`){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return`highp`;t=`mediump`}return t===`mediump`&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?`mediump`:`lowp`}let o=n.precision===void 0?`highp`:n.precision,s=a(o);s!==o&&(console.warn(`THREE.WebGLRenderer:`,o,`not supported, using`,s,`instead.`),o=s);let c=n.logarithmicDepthBuffer===!0,l=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),u=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),d=e.getParameter(e.MAX_TEXTURE_SIZE),f=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),p=e.getParameter(e.MAX_VERTEX_ATTRIBS),m=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),h=e.getParameter(e.MAX_VARYING_VECTORS),g=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),_=u>0,v=e.getParameter(e.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:i,getMaxPrecision:a,precision:o,logarithmicDepthBuffer:c,maxTextures:l,maxVertexTextures:u,maxTextureSize:d,maxCubemapSize:f,maxAttributes:p,maxVertexUniforms:m,maxVaryings:h,maxFragmentUniforms:g,vertexTextures:_,maxSamples:v}}function ui(e){let t=this,n=null,r=0,i=!1,a=!1,o=new Yr,s=new H,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(e,t){let n=e.length!==0||t||r!==0||i;return i=t,r=e.length,n},this.beginShadows=function(){a=!0,u(null)},this.endShadows=function(){a=!1},this.setGlobalState=function(e,t){n=u(e,t,0)},this.setState=function(t,o,s){let d=t.clippingPlanes,f=t.clipIntersection,p=t.clipShadows,m=e.get(t);if(!i||d===null||d.length===0||a&&!p)a?u(null):l();else{let e=a?0:r,t=e*4,i=m.clippingState||null;c.value=i,i=u(d,o,t,s);for(let e=0;e!==t;++e)i[e]=n[e];m.clippingState=i,this.numIntersection=f?this.numPlanes:0,this.numPlanes+=e}};function l(){c.value!==n&&(c.value=n,c.needsUpdate=r>0),t.numPlanes=r,t.numIntersection=0}function u(e,n,r,i){let a=e===null?0:e.length,l=null;if(a!==0){if(l=c.value,i!==!0||l===null){let t=r+a*4,i=n.matrixWorldInverse;s.getNormalMatrix(i),(l===null||l.length<t)&&(l=new Float32Array(t));for(let t=0,n=r;t!==a;++t,n+=4)o.copy(e[t]).applyMatrix4(i,s),o.normal.toArray(l,n),l[n+3]=o.constant}c.value=l,c.needsUpdate=!0}return t.numPlanes=a,t.numIntersection=0,l}}function di(e){let t=new WeakMap;function n(e,t){return t===303?e.mapping=301:t===304&&(e.mapping=302),e}function r(r){if(r&&r.isTexture){let a=r.mapping;if(a===303||a===304){if(t.has(r)){let e=t.get(r).texture;return n(e,r.mapping)}{let a=r.image;if(a&&a.height>0){let o=new Gr(a.height);return o.fromEquirectangularTexture(e,r),t.set(r,o),r.addEventListener(`dispose`,i),n(o.texture,r.mapping)}return null}}}return r}function i(e){let n=e.target;n.removeEventListener(`dispose`,i);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function a(){t=new WeakMap}return{get:r,dispose:a}}var fi=class extends Ir{constructor(e=-1,t=1,n=1,r=-1,i=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type=`OrthographicCamera`,this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=r,this.near=i,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,r,i,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=r,this.view.width=i,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,r=(this.top+this.bottom)/2,i=n-e,a=n+e,o=r+t,s=r-t;if(this.view!==null&&this.view.enabled){let e=(this.right-this.left)/this.view.fullWidth/this.zoom,t=(this.top-this.bottom)/this.view.fullHeight/this.zoom;i+=e*this.view.offsetX,a=i+e*this.view.width,o-=t*this.view.offsetY,s=o-t*this.view.height}this.projectionMatrix.makeOrthographic(i,a,o,s,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},pi=4,mi=[.125,.215,.35,.446,.526,.582],hi=20,gi=new fi,_i=new G,vi=null,yi=0,bi=0,xi=!1,Si=(1+Math.sqrt(5))/2,Ci=1/Si,wi=[new U(1,1,1),new U(-1,1,1),new U(1,1,-1),new U(-1,1,-1),new U(0,Si,Ci),new U(0,Si,-Ci),new U(Ci,0,Si),new U(-Ci,0,Si),new U(Si,Ci,0),new U(-Si,Ci,0)],Ti=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,n=.1,r=100){vi=this._renderer.getRenderTarget(),yi=this._renderer.getActiveCubeFace(),bi=this._renderer.getActiveMipmapLevel(),xi=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(256);let i=this._allocateTargets();return i.depthBuffer=!0,this._sceneToCubeUV(e,n,r,i),t>0&&this._blur(i,0,0,t),this._applyPMREM(i),this._cleanup(i),i}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=ji(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Ai(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=2**this._lodMax}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(vi,yi,bi),this._renderer.xr.enabled=xi,e.scissorTest=!1,Oi(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===301||e.mapping===302?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),vi=this._renderer.getRenderTarget(),yi=this._renderer.getActiveCubeFace(),bi=this._renderer.getActiveMipmapLevel(),xi=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:d,minFilter:d,generateMipmaps:!1,type:x,format:C,colorSpace:me,depthBuffer:!1},r=Di(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Di(e,t,n);let{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Ei(r)),this._blurMaterial=ki(r,e,t)}return r}_compileMaterial(e){let t=new wr(this._lodPlanes[0],e);this._renderer.compile(t,gi)}_sceneToCubeUV(e,t,n,r){let i=new Br(90,1,t,n),a=[1,-1,1,1,1,1],o=[1,1,1,-1,-1,-1],s=this._renderer,c=s.autoClear,l=s.toneMapping;s.getClearColor(_i),s.toneMapping=0,s.autoClear=!1;let u=new Vn({name:`PMREM.Background`,side:1,depthWrite:!1,depthTest:!1}),d=new wr(new Dr,u),f=!1,p=e.background;p?p.isColor&&(u.color.copy(p),e.background=null,f=!0):(u.color.copy(_i),f=!0);for(let t=0;t<6;t++){let n=t%3;n===0?(i.up.set(0,a[t],0),i.lookAt(o[t],0,0)):n===1?(i.up.set(0,0,a[t]),i.lookAt(0,o[t],0)):(i.up.set(0,a[t],0),i.lookAt(0,0,o[t]));let c=this._cubeSize;Oi(r,n*c,t>2?c:0,c,c),s.setRenderTarget(r),f&&s.render(d,i),s.render(e,i)}d.geometry.dispose(),d.material.dispose(),s.toneMapping=l,s.autoClear=c,e.background=p}_textureToCubeUV(e,t){let n=this._renderer,r=e.mapping===301||e.mapping===302;r?(this._cubemapMaterial===null&&(this._cubemapMaterial=ji()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Ai());let i=r?this._cubemapMaterial:this._equirectMaterial,a=new wr(this._lodPlanes[0],i),o=i.uniforms;o.envMap.value=e;let s=this._cubeSize;Oi(t,0,0,3*s,2*s),n.setRenderTarget(t),n.render(a,gi)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;for(let t=1;t<this._lodPlanes.length;t++){let n=Math.sqrt(this._sigmas[t]*this._sigmas[t]-this._sigmas[t-1]*this._sigmas[t-1]),r=wi[(t-1)%wi.length];this._blur(e,t-1,t,n,r)}t.autoClear=n}_blur(e,t,n,r,i){let a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,r,`latitudinal`,i),this._halfBlur(a,e,n,n,r,`longitudinal`,i)}_halfBlur(e,t,n,r,i,a,o){let s=this._renderer,c=this._blurMaterial;a!==`latitudinal`&&a!==`longitudinal`&&console.error(`blur direction must be either latitudinal or longitudinal!`);let l=new wr(this._lodPlanes[r],c),u=c.uniforms,d=this._sizeLods[n]-1,f=isFinite(i)?Math.PI/(2*d):2*Math.PI/39,p=i/f,m=isFinite(i)?1+Math.floor(3*p):hi;m>hi&&console.warn(`sigmaRadians, ${i}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${hi}`);let h=[],g=0;for(let e=0;e<hi;++e){let t=e/p,n=Math.exp(-t*t/2);h.push(n),e===0?g+=n:e<m&&(g+=2*n)}for(let e=0;e<h.length;e++)h[e]=h[e]/g;u.envMap.value=e.texture,u.samples.value=m,u.weights.value=h,u.latitudinal.value=a===`latitudinal`,o&&(u.poleAxis.value=o);let{_lodMax:_}=this;u.dTheta.value=f,u.mipInt.value=_-n;let v=this._sizeLods[r];Oi(t,3*v*(r>_-pi?r-_+pi:0),4*(this._cubeSize-v),3*v,2*v),s.setRenderTarget(t),s.render(l,gi)}};function Ei(e){let t=[],n=[],r=[],i=e,a=e-pi+1+mi.length;for(let o=0;o<a;o++){let a=2**i;n.push(a);let s=1/a;o>e-pi?s=mi[o-e+pi-1]:o===0&&(s=0),r.push(s);let c=1/(a-2),l=-c,u=1+c,d=[l,l,u,l,u,u,l,l,u,u,l,u],f=new Float32Array(108),p=new Float32Array(72),m=new Float32Array(36);for(let e=0;e<6;e++){let t=e%3*2/3-1,n=e>2?0:-1,r=[t,n,0,t+2/3,n,0,t+2/3,n+1,0,t,n,0,t+2/3,n+1,0,t,n+1,0];f.set(r,18*e),p.set(d,12*e);let i=[e,e,e,e,e,e];m.set(i,6*e)}let h=new or;h.setAttribute(`position`,new Yn(f,3)),h.setAttribute(`uv`,new Yn(p,2)),h.setAttribute(`faceIndex`,new Yn(m,1)),t.push(h),i>pi&&i--}return{lodPlanes:t,sizeLods:n,sigmas:r}}function Di(e,t,n){let r=new gt(e,t,n);return r.texture.mapping=306,r.texture.name=`PMREM.cubeUv`,r.scissorTest=!0,r}function Oi(e,t,n,r,i){e.viewport.set(t,n,r,i),e.scissor.set(t,n,r,i)}function ki(e,t,n){let r=new Float32Array(hi),i=new U(0,1,0);return new Fr({name:`SphericalGaussianBlur`,defines:{n:hi,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/n,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:r},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:i}},vertexShader:Mi(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Ai(){return new Fr({name:`EquirectangularToCubeUV`,uniforms:{envMap:{value:null}},vertexShader:Mi(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function ji(){return new Fr({name:`CubemapToCubeUV`,uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Mi(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:0,depthTest:!1,depthWrite:!1})}function Mi(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function Ni(e){let t=new WeakMap,n=null;function r(r){if(r&&r.isTexture){let o=r.mapping,s=o===303||o===304,c=o===301||o===302;if(s||c){let o=t.get(r),l=o===void 0?0:o.texture.pmremVersion;if(r.isRenderTargetTexture&&r.pmremVersion!==l)return n===null&&(n=new Ti(e)),o=s?n.fromEquirectangular(r,o):n.fromCubemap(r,o),o.texture.pmremVersion=r.pmremVersion,t.set(r,o),o.texture;if(o!==void 0)return o.texture;{let l=r.image;return s&&l&&l.height>0||c&&l&&i(l)?(n===null&&(n=new Ti(e)),o=s?n.fromEquirectangular(r):n.fromCubemap(r),o.texture.pmremVersion=r.pmremVersion,t.set(r,o),r.addEventListener(`dispose`,a),o.texture):null}}}return r}function i(e){let t=0;for(let n=0;n<6;n++)e[n]!==void 0&&t++;return t===6}function a(e){let n=e.target;n.removeEventListener(`dispose`,a);let r=t.get(n);r!==void 0&&(t.delete(n),r.dispose())}function o(){t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:r,dispose:o}}function Pi(e){let t={};function n(n){if(t[n]!==void 0)return t[n];let r;switch(n){case`WEBGL_depth_texture`:r=e.getExtension(`WEBGL_depth_texture`)||e.getExtension(`MOZ_WEBGL_depth_texture`)||e.getExtension(`WEBKIT_WEBGL_depth_texture`);break;case`EXT_texture_filter_anisotropic`:r=e.getExtension(`EXT_texture_filter_anisotropic`)||e.getExtension(`MOZ_EXT_texture_filter_anisotropic`)||e.getExtension(`WEBKIT_EXT_texture_filter_anisotropic`);break;case`WEBGL_compressed_texture_s3tc`:r=e.getExtension(`WEBGL_compressed_texture_s3tc`)||e.getExtension(`MOZ_WEBGL_compressed_texture_s3tc`)||e.getExtension(`WEBKIT_WEBGL_compressed_texture_s3tc`);break;case`WEBGL_compressed_texture_pvrtc`:r=e.getExtension(`WEBGL_compressed_texture_pvrtc`)||e.getExtension(`WEBKIT_WEBGL_compressed_texture_pvrtc`);break;default:r=e.getExtension(n)}return t[n]=r,r}return{has:function(e){return n(e)!==null},init:function(){n(`EXT_color_buffer_float`),n(`WEBGL_clip_cull_distance`),n(`OES_texture_float_linear`),n(`EXT_color_buffer_half_float`),n(`WEBGL_multisampled_render_to_texture`),n(`WEBGL_render_shared_exponent`)},get:function(e){let t=n(e);return t===null&&console.warn(`THREE.WebGLRenderer: `+e+` extension not supported.`),t}}}function Fi(e,t,n,r){let i={},a=new WeakMap;function o(e){let s=e.target;s.index!==null&&t.remove(s.index);for(let e in s.attributes)t.remove(s.attributes[e]);for(let e in s.morphAttributes){let n=s.morphAttributes[e];for(let e=0,r=n.length;e<r;e++)t.remove(n[e])}s.removeEventListener(`dispose`,o),delete i[s.id];let c=a.get(s);c&&(t.remove(c),a.delete(s)),r.releaseStatesOfGeometry(s),s.isInstancedBufferGeometry===!0&&delete s._maxInstanceCount,n.memory.geometries--}function s(e,t){return i[t.id]===!0?t:(t.addEventListener(`dispose`,o),i[t.id]=!0,n.memory.geometries++,t)}function c(n){let r=n.attributes;for(let n in r)t.update(r[n],e.ARRAY_BUFFER);let i=n.morphAttributes;for(let n in i){let r=i[n];for(let n=0,i=r.length;n<i;n++)t.update(r[n],e.ARRAY_BUFFER)}}function l(e){let n=[],r=e.index,i=e.attributes.position,o=0;if(r!==null){let e=r.array;o=r.version;for(let t=0,r=e.length;t<r;t+=3){let r=e[t+0],i=e[t+1],a=e[t+2];n.push(r,i,i,a,a,r)}}else if(i!==void 0){let e=i.array;o=i.version;for(let t=0,r=e.length/3-1;t<r;t+=3){let e=t+0,r=t+1,i=t+2;n.push(e,r,r,i,i,e)}}else return;let s=new(Ye(n)?Zn:Xn)(n,1);s.version=o;let c=a.get(e);c&&t.remove(c),a.set(e,s)}function u(e){let t=a.get(e);if(t){let n=e.index;n!==null&&t.version<n.version&&l(e)}else l(e);return a.get(e)}return{get:s,update:c,getWireframeAttribute:u}}function Ii(e,t,n){let r;function i(e){r=e}let a,o;function s(e){a=e.type,o=e.bytesPerElement}function c(t,i){e.drawElements(r,i,a,t*o),n.update(i,r,1)}function l(t,i,s){s!==0&&(e.drawElementsInstanced(r,i,a,t*o,s),n.update(i,r,s))}function u(e,i,s){if(s===0)return;let c=t.get(`WEBGL_multi_draw`);if(c===null)for(let t=0;t<s;t++)this.render(e[t]/o,i[t]);else{c.multiDrawElementsWEBGL(r,i,0,a,e,0,s);let t=0;for(let e=0;e<s;e++)t+=i[e];n.update(t,r,1)}}this.setMode=i,this.setIndex=s,this.render=c,this.renderInstances=l,this.renderMultiDraw=u}function Li(e){let t={geometries:0,textures:0},n={frame:0,calls:0,triangles:0,points:0,lines:0};function r(t,r,i){switch(n.calls++,r){case e.TRIANGLES:n.triangles+=t/3*i;break;case e.LINES:n.lines+=t/2*i;break;case e.LINE_STRIP:n.lines+=i*(t-1);break;case e.LINE_LOOP:n.lines+=i*t;break;case e.POINTS:n.points+=i*t;break;default:console.error(`THREE.WebGLInfo: Unknown draw mode:`,r)}}function i(){n.calls=0,n.triangles=0,n.points=0,n.lines=0}return{memory:t,render:n,programs:null,autoReset:!0,reset:i,update:r}}function Ri(e,t,n){let r=new WeakMap,i=new mt;function a(a,o,s){let c=a.morphTargetInfluences,l=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,u=l===void 0?0:l.length,d=r.get(o);if(d===void 0||d.count!==u){d!==void 0&&d.texture.dispose();let e=o.morphAttributes.position!==void 0,n=o.morphAttributes.normal!==void 0,a=o.morphAttributes.color!==void 0,s=o.morphAttributes.position||[],c=o.morphAttributes.normal||[],l=o.morphAttributes.color||[],f=0;e===!0&&(f=1),n===!0&&(f=2),a===!0&&(f=3);let p=o.attributes.position.count*f,m=1;p>t.maxTextureSize&&(m=Math.ceil(p/t.maxTextureSize),p=t.maxTextureSize);let h=new Float32Array(p*m*4*u),g=new _t(h,p,m,u);g.type=b,g.needsUpdate=!0;let _=f*4;for(let t=0;t<u;t++){let r=s[t],o=c[t],u=l[t],d=p*m*4*t;for(let t=0;t<r.count;t++){let s=t*_;e===!0&&(i.fromBufferAttribute(r,t),h[d+s+0]=i.x,h[d+s+1]=i.y,h[d+s+2]=i.z,h[d+s+3]=0),n===!0&&(i.fromBufferAttribute(o,t),h[d+s+4]=i.x,h[d+s+5]=i.y,h[d+s+6]=i.z,h[d+s+7]=0),a===!0&&(i.fromBufferAttribute(u,t),h[d+s+8]=i.x,h[d+s+9]=i.y,h[d+s+10]=i.z,h[d+s+11]=u.itemSize===4?i.w:1)}}d={count:u,texture:g,size:new V(p,m)},r.set(o,d);function v(){g.dispose(),r.delete(o),o.removeEventListener(`dispose`,v)}o.addEventListener(`dispose`,v)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)s.getUniforms().setValue(e,`morphTexture`,a.morphTexture,n);else{let t=0;for(let e=0;e<c.length;e++)t+=c[e];let n=o.morphTargetsRelative?1:1-t;s.getUniforms().setValue(e,`morphTargetBaseInfluence`,n),s.getUniforms().setValue(e,`morphTargetInfluences`,c)}s.getUniforms().setValue(e,`morphTargetsTexture`,d.texture,n),s.getUniforms().setValue(e,`morphTargetsTextureSize`,d.size)}return{update:a}}function zi(e,t,n,r){let i=new WeakMap;function a(a){let o=r.render.frame,c=a.geometry,l=t.get(a,c);if(i.get(l)!==o&&(t.update(l),i.set(l,o)),a.isInstancedMesh&&(a.hasEventListener(`dispose`,s)===!1&&a.addEventListener(`dispose`,s),i.get(a)!==o&&(n.update(a.instanceMatrix,e.ARRAY_BUFFER),a.instanceColor!==null&&n.update(a.instanceColor,e.ARRAY_BUFFER),i.set(a,o))),a.isSkinnedMesh){let e=a.skeleton;i.get(e)!==o&&(e.update(),i.set(e,o))}return l}function o(){i=new WeakMap}function s(e){let t=e.target;t.removeEventListener(`dispose`,s),n.remove(t.instanceMatrix),t.instanceColor!==null&&n.remove(t.instanceColor)}return{update:a,dispose:o}}var Bi=class extends pt{constructor(e,t,n,r,i,a,o,s,l,u){if(u=u===void 0?w:u,u!==1026&&u!==1027)throw Error(`DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat`);n===void 0&&u===1026&&(n=y),n===void 0&&u===1027&&(n=S),super(null,r,i,a,o,s,u,n,l),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=o===void 0?c:o,this.minFilter=s===void 0?c:s,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},Vi=new pt,Hi=new Bi(1,1);Hi.compareFunction=515;var Ui=new _t,Wi=new vt,Gi=new Wr,Ki=[],qi=[],Ji=new Float32Array(16),Yi=new Float32Array(9),Xi=new Float32Array(4);function Zi(e,t,n){let r=e[0];if(r<=0||r>0)return e;let i=t*n,a=Ki[i];if(a===void 0&&(a=new Float32Array(i),Ki[i]=a),t!==0){r.toArray(a,0);for(let r=1,i=0;r!==t;++r)i+=n,e[r].toArray(a,i)}return a}function Qi(e,t){if(e.length!==t.length)return!1;for(let n=0,r=e.length;n<r;n++)if(e[n]!==t[n])return!1;return!0}function $i(e,t){for(let n=0,r=t.length;n<r;n++)e[n]=t[n]}function ea(e,t){let n=qi[t];n===void 0&&(n=new Int32Array(t),qi[t]=n);for(let r=0;r!==t;++r)n[r]=e.allocateTextureUnit();return n}function ta(e,t){let n=this.cache;n[0]!==t&&(e.uniform1f(this.addr,t),n[0]=t)}function na(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2f(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Qi(n,t))return;e.uniform2fv(this.addr,t),$i(n,t)}}function ra(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3f(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else if(t.r!==void 0)(n[0]!==t.r||n[1]!==t.g||n[2]!==t.b)&&(e.uniform3f(this.addr,t.r,t.g,t.b),n[0]=t.r,n[1]=t.g,n[2]=t.b);else{if(Qi(n,t))return;e.uniform3fv(this.addr,t),$i(n,t)}}function ia(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4f(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Qi(n,t))return;e.uniform4fv(this.addr,t),$i(n,t)}}function aa(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Qi(n,t))return;e.uniformMatrix2fv(this.addr,!1,t),$i(n,t)}else{if(Qi(n,r))return;Xi.set(r),e.uniformMatrix2fv(this.addr,!1,Xi),$i(n,r)}}function oa(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Qi(n,t))return;e.uniformMatrix3fv(this.addr,!1,t),$i(n,t)}else{if(Qi(n,r))return;Yi.set(r),e.uniformMatrix3fv(this.addr,!1,Yi),$i(n,r)}}function sa(e,t){let n=this.cache,r=t.elements;if(r===void 0){if(Qi(n,t))return;e.uniformMatrix4fv(this.addr,!1,t),$i(n,t)}else{if(Qi(n,r))return;Ji.set(r),e.uniformMatrix4fv(this.addr,!1,Ji),$i(n,r)}}function ca(e,t){let n=this.cache;n[0]!==t&&(e.uniform1i(this.addr,t),n[0]=t)}function la(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2i(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Qi(n,t))return;e.uniform2iv(this.addr,t),$i(n,t)}}function ua(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3i(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Qi(n,t))return;e.uniform3iv(this.addr,t),$i(n,t)}}function da(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4i(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Qi(n,t))return;e.uniform4iv(this.addr,t),$i(n,t)}}function fa(e,t){let n=this.cache;n[0]!==t&&(e.uniform1ui(this.addr,t),n[0]=t)}function pa(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y)&&(e.uniform2ui(this.addr,t.x,t.y),n[0]=t.x,n[1]=t.y);else{if(Qi(n,t))return;e.uniform2uiv(this.addr,t),$i(n,t)}}function ma(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z)&&(e.uniform3ui(this.addr,t.x,t.y,t.z),n[0]=t.x,n[1]=t.y,n[2]=t.z);else{if(Qi(n,t))return;e.uniform3uiv(this.addr,t),$i(n,t)}}function ha(e,t){let n=this.cache;if(t.x!==void 0)(n[0]!==t.x||n[1]!==t.y||n[2]!==t.z||n[3]!==t.w)&&(e.uniform4ui(this.addr,t.x,t.y,t.z,t.w),n[0]=t.x,n[1]=t.y,n[2]=t.z,n[3]=t.w);else{if(Qi(n,t))return;e.uniform4uiv(this.addr,t),$i(n,t)}}function ga(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i);let a=this.type===e.SAMPLER_2D_SHADOW?Hi:Vi;n.setTexture2D(t||a,i)}function _a(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture3D(t||Wi,i)}function va(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTextureCube(t||Gi,i)}function ya(e,t,n){let r=this.cache,i=n.allocateTextureUnit();r[0]!==i&&(e.uniform1i(this.addr,i),r[0]=i),n.setTexture2DArray(t||Ui,i)}function ba(e){switch(e){case 5126:return ta;case 35664:return na;case 35665:return ra;case 35666:return ia;case 35674:return aa;case 35675:return oa;case 35676:return sa;case 5124:case 35670:return ca;case 35667:case 35671:return la;case 35668:case 35672:return ua;case 35669:case 35673:return da;case 5125:return fa;case 36294:return pa;case 36295:return ma;case 36296:return ha;case 35678:case 36198:case 36298:case 36306:case 35682:return ga;case 35679:case 36299:case 36307:return _a;case 35680:case 36300:case 36308:case 36293:return va;case 36289:case 36303:case 36311:case 36292:return ya}}function xa(e,t){e.uniform1fv(this.addr,t)}function Sa(e,t){let n=Zi(t,this.size,2);e.uniform2fv(this.addr,n)}function Ca(e,t){let n=Zi(t,this.size,3);e.uniform3fv(this.addr,n)}function wa(e,t){let n=Zi(t,this.size,4);e.uniform4fv(this.addr,n)}function Ta(e,t){let n=Zi(t,this.size,4);e.uniformMatrix2fv(this.addr,!1,n)}function Ea(e,t){let n=Zi(t,this.size,9);e.uniformMatrix3fv(this.addr,!1,n)}function Da(e,t){let n=Zi(t,this.size,16);e.uniformMatrix4fv(this.addr,!1,n)}function Oa(e,t){e.uniform1iv(this.addr,t)}function ka(e,t){e.uniform2iv(this.addr,t)}function Aa(e,t){e.uniform3iv(this.addr,t)}function ja(e,t){e.uniform4iv(this.addr,t)}function Ma(e,t){e.uniform1uiv(this.addr,t)}function Na(e,t){e.uniform2uiv(this.addr,t)}function Pa(e,t){e.uniform3uiv(this.addr,t)}function Fa(e,t){e.uniform4uiv(this.addr,t)}function Ia(e,t,n){let r=this.cache,i=t.length,a=ea(n,i);Qi(r,a)||(e.uniform1iv(this.addr,a),$i(r,a));for(let e=0;e!==i;++e)n.setTexture2D(t[e]||Vi,a[e])}function La(e,t,n){let r=this.cache,i=t.length,a=ea(n,i);Qi(r,a)||(e.uniform1iv(this.addr,a),$i(r,a));for(let e=0;e!==i;++e)n.setTexture3D(t[e]||Wi,a[e])}function Ra(e,t,n){let r=this.cache,i=t.length,a=ea(n,i);Qi(r,a)||(e.uniform1iv(this.addr,a),$i(r,a));for(let e=0;e!==i;++e)n.setTextureCube(t[e]||Gi,a[e])}function za(e,t,n){let r=this.cache,i=t.length,a=ea(n,i);Qi(r,a)||(e.uniform1iv(this.addr,a),$i(r,a));for(let e=0;e!==i;++e)n.setTexture2DArray(t[e]||Ui,a[e])}function Ba(e){switch(e){case 5126:return xa;case 35664:return Sa;case 35665:return Ca;case 35666:return wa;case 35674:return Ta;case 35675:return Ea;case 35676:return Da;case 5124:case 35670:return Oa;case 35667:case 35671:return ka;case 35668:case 35672:return Aa;case 35669:case 35673:return ja;case 5125:return Ma;case 36294:return Na;case 36295:return Pa;case 36296:return Fa;case 35678:case 36198:case 36298:case 36306:case 35682:return Ia;case 35679:case 36299:case 36307:return La;case 35680:case 36300:case 36308:case 36293:return Ra;case 36289:case 36303:case 36311:case 36292:return za}}var Va=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=ba(t.type)}},Ha=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Ba(t.type)}},Ua=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let r=this.seq;for(let i=0,a=r.length;i!==a;++i){let a=r[i];a.setValue(e,t[a.id],n)}}},Wa=/(\w+)(\])?(\[|\.)?/g;function Ga(e,t){e.seq.push(t),e.map[t.id]=t}function Ka(e,t,n){let r=e.name,i=r.length;for(Wa.lastIndex=0;;){let a=Wa.exec(r),o=Wa.lastIndex,s=a[1],c=a[2]===`]`,l=a[3];if(c&&(s|=0),l===void 0||l===`[`&&o+2===i){Ga(n,l===void 0?new Va(s,e,t):new Ha(s,e,t));break}{let e=n.map[s];e===void 0&&(e=new Ua(s),Ga(n,e)),n=e}}}var qa=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let r=0;r<n;++r){let n=e.getActiveUniform(t,r);Ka(n,e.getUniformLocation(t,n.name),this)}}setValue(e,t,n,r){let i=this.map[t];i!==void 0&&i.setValue(e,n,r)}setOptional(e,t,n){let r=t[n];r!==void 0&&this.setValue(e,n,r)}static upload(e,t,n,r){for(let i=0,a=t.length;i!==a;++i){let a=t[i],o=n[a.id];o.needsUpdate!==!1&&a.setValue(e,o.value,r)}}static seqWithValue(e,t){let n=[];for(let r=0,i=e.length;r!==i;++r){let i=e[r];i.id in t&&n.push(i)}return n}};function Ja(e,t,n){let r=e.createShader(t);return e.shaderSource(r,n),e.compileShader(r),r}var Ya=37297,Xa=0;function Za(e,t){let n=e.split(`
`),r=[],i=Math.max(t-6,0),a=Math.min(t+6,n.length);for(let e=i;e<a;e++){let i=e+1;r.push(`${i===t?`>`:` `} ${i}: ${n[e]}`)}return r.join(`
`)}function Qa(e){let t=it.getPrimaries(it.workingColorSpace),n=it.getPrimaries(e),r;switch(t===n?r=``:t===`p3`&&n===`rec709`?r=`LinearDisplayP3ToLinearSRGB`:t===`rec709`&&n===`p3`&&(r=`LinearSRGBToLinearDisplayP3`),e){case me:case ge:return[r,`LinearTransferOETF`];case pe:case he:return[r,`sRGBTransferOETF`];default:return console.warn(`THREE.WebGLProgram: Unsupported color space:`,e),[r,`LinearTransferOETF`]}}function $a(e,t,n){let r=e.getShaderParameter(t,e.COMPILE_STATUS),i=e.getShaderInfoLog(t).trim();if(r&&i===``)return``;let a=/ERROR: 0:(\d+)/.exec(i);if(a){let r=parseInt(a[1]);return n.toUpperCase()+`

`+i+`

`+Za(e.getShaderSource(t),r)}return i}function eo(e,t){let n=Qa(t);return`vec4 ${e}( vec4 value ) { return ${n[0]}( ${n[1]}( value ) ); }`}function to(e,t){let n;switch(t){case 1:n=`Linear`;break;case 2:n=`Reinhard`;break;case 3:n=`OptimizedCineon`;break;case 4:n=`ACESFilmic`;break;case 6:n=`AgX`;break;case 7:n=`Neutral`;break;case 5:n=`Custom`;break;default:console.warn(`THREE.WebGLProgram: Unsupported toneMapping:`,t),n=`Linear`}return`vec3 `+e+`( vec3 color ) { return `+n+`ToneMapping( color ); }`}function no(e){return[e.extensionClipCullDistance?`#extension GL_ANGLE_clip_cull_distance : require`:``,e.extensionMultiDraw?`#extension GL_ANGLE_multi_draw : require`:``].filter(ao).join(`
`)}function ro(e){let t=[];for(let n in e){let r=e[n];r!==!1&&t.push(`#define `+n+` `+r)}return t.join(`
`)}function io(e,t){let n={},r=e.getProgramParameter(t,e.ACTIVE_ATTRIBUTES);for(let i=0;i<r;i++){let r=e.getActiveAttrib(t,i),a=r.name,o=1;r.type===e.FLOAT_MAT2&&(o=2),r.type===e.FLOAT_MAT3&&(o=3),r.type===e.FLOAT_MAT4&&(o=4),n[a]={type:r.type,location:e.getAttribLocation(t,a),locationSize:o}}return n}function ao(e){return e!==``}function oo(e,t){let n=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,n).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function so(e,t){return e.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}var co=/^[ \t]*#include +<([\w\d./]+)>/gm;function lo(e){return e.replace(co,fo)}var uo=new Map([[`encodings_fragment`,`colorspace_fragment`],[`encodings_pars_fragment`,`colorspace_pars_fragment`],[`output_fragment`,`opaque_fragment`]]);function fo(e,t){let n=K[t];if(n===void 0){let e=uo.get(t);if(e!==void 0)n=K[e],console.warn(`THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.`,t,e);else throw Error(`Can not resolve #include <`+t+`>`)}return lo(n)}var po=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function mo(e){return e.replace(po,ho)}function ho(e,t,n,r){let i=``;for(let e=parseInt(t);e<parseInt(n);e++)i+=r.replace(/\[\s*i\s*\]/g,`[ `+e+` ]`).replace(/UNROLLED_LOOP_INDEX/g,e);return i}function go(e){let t=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision===`highp`?t+=`
#define HIGH_PRECISION`:e.precision===`mediump`?t+=`
#define MEDIUM_PRECISION`:e.precision===`lowp`&&(t+=`
#define LOW_PRECISION`),t}function _o(e){let t=`SHADOWMAP_TYPE_BASIC`;return e.shadowMapType===1?t=`SHADOWMAP_TYPE_PCF`:e.shadowMapType===2?t=`SHADOWMAP_TYPE_PCF_SOFT`:e.shadowMapType===3&&(t=`SHADOWMAP_TYPE_VSM`),t}function vo(e){let t=`ENVMAP_TYPE_CUBE`;if(e.envMap)switch(e.envMapMode){case 301:case 302:t=`ENVMAP_TYPE_CUBE`;break;case 306:t=`ENVMAP_TYPE_CUBE_UV`}return t}function yo(e){let t=`ENVMAP_MODE_REFLECTION`;if(e.envMap)switch(e.envMapMode){case 302:t=`ENVMAP_MODE_REFRACTION`}return t}function bo(e){let t=`ENVMAP_BLENDING_NONE`;if(e.envMap)switch(e.combine){case 0:t=`ENVMAP_BLENDING_MULTIPLY`;break;case 1:t=`ENVMAP_BLENDING_MIX`;break;case 2:t=`ENVMAP_BLENDING_ADD`}return t}function xo(e){let t=e.envMapCubeUVHeight;if(t===null)return null;let n=Math.log2(t)-2,r=1/t;return{texelWidth:1/(3*Math.max(2**n,112)),texelHeight:r,maxMip:n}}function So(e,t,n,r){let i=e.getContext(),a=n.defines,o=n.vertexShader,s=n.fragmentShader,c=_o(n),l=vo(n),u=yo(n),d=bo(n),f=xo(n),p=no(n),m=ro(a),h=i.createProgram(),g,_,v=n.glslVersion?`#version `+n.glslVersion+`
`:``;n.isRawShaderMaterial?(g=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(ao).join(`
`),g.length>0&&(g+=`
`),_=[`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m].filter(ao).join(`
`),_.length>0&&(_+=`
`)):(g=[go(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.extensionClipCullDistance?`#define USE_CLIP_DISTANCE`:``,n.batching?`#define USE_BATCHING`:``,n.instancing?`#define USE_INSTANCING`:``,n.instancingColor?`#define USE_INSTANCING_COLOR`:``,n.instancingMorph?`#define USE_INSTANCING_MORPH`:``,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.map?`#define USE_MAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+u:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.displacementMap?`#define USE_DISPLACEMENTMAP`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.mapUv?`#define MAP_UV `+n.mapUv:``,n.alphaMapUv?`#define ALPHAMAP_UV `+n.alphaMapUv:``,n.lightMapUv?`#define LIGHTMAP_UV `+n.lightMapUv:``,n.aoMapUv?`#define AOMAP_UV `+n.aoMapUv:``,n.emissiveMapUv?`#define EMISSIVEMAP_UV `+n.emissiveMapUv:``,n.bumpMapUv?`#define BUMPMAP_UV `+n.bumpMapUv:``,n.normalMapUv?`#define NORMALMAP_UV `+n.normalMapUv:``,n.displacementMapUv?`#define DISPLACEMENTMAP_UV `+n.displacementMapUv:``,n.metalnessMapUv?`#define METALNESSMAP_UV `+n.metalnessMapUv:``,n.roughnessMapUv?`#define ROUGHNESSMAP_UV `+n.roughnessMapUv:``,n.anisotropyMapUv?`#define ANISOTROPYMAP_UV `+n.anisotropyMapUv:``,n.clearcoatMapUv?`#define CLEARCOATMAP_UV `+n.clearcoatMapUv:``,n.clearcoatNormalMapUv?`#define CLEARCOAT_NORMALMAP_UV `+n.clearcoatNormalMapUv:``,n.clearcoatRoughnessMapUv?`#define CLEARCOAT_ROUGHNESSMAP_UV `+n.clearcoatRoughnessMapUv:``,n.iridescenceMapUv?`#define IRIDESCENCEMAP_UV `+n.iridescenceMapUv:``,n.iridescenceThicknessMapUv?`#define IRIDESCENCE_THICKNESSMAP_UV `+n.iridescenceThicknessMapUv:``,n.sheenColorMapUv?`#define SHEEN_COLORMAP_UV `+n.sheenColorMapUv:``,n.sheenRoughnessMapUv?`#define SHEEN_ROUGHNESSMAP_UV `+n.sheenRoughnessMapUv:``,n.specularMapUv?`#define SPECULARMAP_UV `+n.specularMapUv:``,n.specularColorMapUv?`#define SPECULAR_COLORMAP_UV `+n.specularColorMapUv:``,n.specularIntensityMapUv?`#define SPECULAR_INTENSITYMAP_UV `+n.specularIntensityMapUv:``,n.transmissionMapUv?`#define TRANSMISSIONMAP_UV `+n.transmissionMapUv:``,n.thicknessMapUv?`#define THICKNESSMAP_UV `+n.thicknessMapUv:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.flatShading?`#define FLAT_SHADED`:``,n.skinning?`#define USE_SKINNING`:``,n.morphTargets?`#define USE_MORPHTARGETS`:``,n.morphNormals&&n.flatShading===!1?`#define USE_MORPHNORMALS`:``,n.morphColors?`#define USE_MORPHCOLORS`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE`:``,n.morphTargetsCount>0?`#define MORPHTARGETS_TEXTURE_STRIDE `+n.morphTextureStride:``,n.morphTargetsCount>0?`#define MORPHTARGETS_COUNT `+n.morphTargetsCount:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.sizeAttenuation?`#define USE_SIZEATTENUATION`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.useLegacyLights?`#define LEGACY_LIGHTS`:``,n.logarithmicDepthBuffer?`#define USE_LOGDEPTHBUF`:``,`uniform mat4 modelMatrix;`,`uniform mat4 modelViewMatrix;`,`uniform mat4 projectionMatrix;`,`uniform mat4 viewMatrix;`,`uniform mat3 normalMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,`#ifdef USE_INSTANCING`,`	attribute mat4 instanceMatrix;`,`#endif`,`#ifdef USE_INSTANCING_COLOR`,`	attribute vec3 instanceColor;`,`#endif`,`#ifdef USE_INSTANCING_MORPH`,`	uniform sampler2D morphTexture;`,`#endif`,`attribute vec3 position;`,`attribute vec3 normal;`,`attribute vec2 uv;`,`#ifdef USE_UV1`,`	attribute vec2 uv1;`,`#endif`,`#ifdef USE_UV2`,`	attribute vec2 uv2;`,`#endif`,`#ifdef USE_UV3`,`	attribute vec2 uv3;`,`#endif`,`#ifdef USE_TANGENT`,`	attribute vec4 tangent;`,`#endif`,`#if defined( USE_COLOR_ALPHA )`,`	attribute vec4 color;`,`#elif defined( USE_COLOR )`,`	attribute vec3 color;`,`#endif`,`#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )`,`	attribute vec3 morphTarget0;`,`	attribute vec3 morphTarget1;`,`	attribute vec3 morphTarget2;`,`	attribute vec3 morphTarget3;`,`	#ifdef USE_MORPHNORMALS`,`		attribute vec3 morphNormal0;`,`		attribute vec3 morphNormal1;`,`		attribute vec3 morphNormal2;`,`		attribute vec3 morphNormal3;`,`	#else`,`		attribute vec3 morphTarget4;`,`		attribute vec3 morphTarget5;`,`		attribute vec3 morphTarget6;`,`		attribute vec3 morphTarget7;`,`	#endif`,`#endif`,`#ifdef USE_SKINNING`,`	attribute vec4 skinIndex;`,`	attribute vec4 skinWeight;`,`#endif`,`
`].filter(ao).join(`
`),_=[go(n),`#define SHADER_TYPE `+n.shaderType,`#define SHADER_NAME `+n.shaderName,m,n.useFog&&n.fog?`#define USE_FOG`:``,n.useFog&&n.fogExp2?`#define FOG_EXP2`:``,n.alphaToCoverage?`#define ALPHA_TO_COVERAGE`:``,n.map?`#define USE_MAP`:``,n.matcap?`#define USE_MATCAP`:``,n.envMap?`#define USE_ENVMAP`:``,n.envMap?`#define `+l:``,n.envMap?`#define `+u:``,n.envMap?`#define `+d:``,f?`#define CUBEUV_TEXEL_WIDTH `+f.texelWidth:``,f?`#define CUBEUV_TEXEL_HEIGHT `+f.texelHeight:``,f?`#define CUBEUV_MAX_MIP `+f.maxMip+`.0`:``,n.lightMap?`#define USE_LIGHTMAP`:``,n.aoMap?`#define USE_AOMAP`:``,n.bumpMap?`#define USE_BUMPMAP`:``,n.normalMap?`#define USE_NORMALMAP`:``,n.normalMapObjectSpace?`#define USE_NORMALMAP_OBJECTSPACE`:``,n.normalMapTangentSpace?`#define USE_NORMALMAP_TANGENTSPACE`:``,n.emissiveMap?`#define USE_EMISSIVEMAP`:``,n.anisotropy?`#define USE_ANISOTROPY`:``,n.anisotropyMap?`#define USE_ANISOTROPYMAP`:``,n.clearcoat?`#define USE_CLEARCOAT`:``,n.clearcoatMap?`#define USE_CLEARCOATMAP`:``,n.clearcoatRoughnessMap?`#define USE_CLEARCOAT_ROUGHNESSMAP`:``,n.clearcoatNormalMap?`#define USE_CLEARCOAT_NORMALMAP`:``,n.iridescence?`#define USE_IRIDESCENCE`:``,n.iridescenceMap?`#define USE_IRIDESCENCEMAP`:``,n.iridescenceThicknessMap?`#define USE_IRIDESCENCE_THICKNESSMAP`:``,n.specularMap?`#define USE_SPECULARMAP`:``,n.specularColorMap?`#define USE_SPECULAR_COLORMAP`:``,n.specularIntensityMap?`#define USE_SPECULAR_INTENSITYMAP`:``,n.roughnessMap?`#define USE_ROUGHNESSMAP`:``,n.metalnessMap?`#define USE_METALNESSMAP`:``,n.alphaMap?`#define USE_ALPHAMAP`:``,n.alphaTest?`#define USE_ALPHATEST`:``,n.alphaHash?`#define USE_ALPHAHASH`:``,n.sheen?`#define USE_SHEEN`:``,n.sheenColorMap?`#define USE_SHEEN_COLORMAP`:``,n.sheenRoughnessMap?`#define USE_SHEEN_ROUGHNESSMAP`:``,n.transmission?`#define USE_TRANSMISSION`:``,n.transmissionMap?`#define USE_TRANSMISSIONMAP`:``,n.thicknessMap?`#define USE_THICKNESSMAP`:``,n.vertexTangents&&n.flatShading===!1?`#define USE_TANGENT`:``,n.vertexColors||n.instancingColor?`#define USE_COLOR`:``,n.vertexAlphas?`#define USE_COLOR_ALPHA`:``,n.vertexUv1s?`#define USE_UV1`:``,n.vertexUv2s?`#define USE_UV2`:``,n.vertexUv3s?`#define USE_UV3`:``,n.pointsUvs?`#define USE_POINTS_UV`:``,n.gradientMap?`#define USE_GRADIENTMAP`:``,n.flatShading?`#define FLAT_SHADED`:``,n.doubleSided?`#define DOUBLE_SIDED`:``,n.flipSided?`#define FLIP_SIDED`:``,n.shadowMapEnabled?`#define USE_SHADOWMAP`:``,n.shadowMapEnabled?`#define `+c:``,n.premultipliedAlpha?`#define PREMULTIPLIED_ALPHA`:``,n.numLightProbes>0?`#define USE_LIGHT_PROBES`:``,n.useLegacyLights?`#define LEGACY_LIGHTS`:``,n.decodeVideoTexture?`#define DECODE_VIDEO_TEXTURE`:``,n.logarithmicDepthBuffer?`#define USE_LOGDEPTHBUF`:``,`uniform mat4 viewMatrix;`,`uniform vec3 cameraPosition;`,`uniform bool isOrthographic;`,n.toneMapping===0?``:`#define TONE_MAPPING`,n.toneMapping===0?``:K.tonemapping_pars_fragment,n.toneMapping===0?``:to(`toneMapping`,n.toneMapping),n.dithering?`#define DITHERING`:``,n.opaque?`#define OPAQUE`:``,K.colorspace_pars_fragment,eo(`linearToOutputTexel`,n.outputColorSpace),n.useDepthPacking?`#define DEPTH_PACKING `+n.depthPacking:``,`
`].filter(ao).join(`
`)),o=lo(o),o=oo(o,n),o=so(o,n),s=lo(s),s=oo(s,n),s=so(s,n),o=mo(o),s=mo(s),n.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,g=[p,`#define attribute in`,`#define varying out`,`#define texture2D texture`].join(`
`)+`
`+g,_=[`#define varying in`,n.glslVersion===`300 es`?``:`layout(location = 0) out highp vec4 pc_fragColor;`,n.glslVersion===`300 es`?``:`#define gl_FragColor pc_fragColor`,`#define gl_FragDepthEXT gl_FragDepth`,`#define texture2D texture`,`#define textureCube texture`,`#define texture2DProj textureProj`,`#define texture2DLodEXT textureLod`,`#define texture2DProjLodEXT textureProjLod`,`#define textureCubeLodEXT textureLod`,`#define texture2DGradEXT textureGrad`,`#define texture2DProjGradEXT textureProjGrad`,`#define textureCubeGradEXT textureGrad`].join(`
`)+`
`+_);let y=v+g+o,b=v+_+s,x=Ja(i,i.VERTEX_SHADER,y),S=Ja(i,i.FRAGMENT_SHADER,b);i.attachShader(h,x),i.attachShader(h,S),n.index0AttributeName===void 0?n.morphTargets===!0&&i.bindAttribLocation(h,0,`position`):i.bindAttribLocation(h,0,n.index0AttributeName),i.linkProgram(h);function C(t){if(e.debug.checkShaderErrors){let n=i.getProgramInfoLog(h).trim(),r=i.getShaderInfoLog(x).trim(),a=i.getShaderInfoLog(S).trim(),o=!0,s=!0;if(i.getProgramParameter(h,i.LINK_STATUS)===!1){if(o=!1,typeof e.debug.onShaderError==`function`)e.debug.onShaderError(i,h,x,S);else{let e=$a(i,x,`vertex`),r=$a(i,S,`fragment`);console.error(`THREE.WebGLProgram: Shader Error `+i.getError()+` - VALIDATE_STATUS `+i.getProgramParameter(h,i.VALIDATE_STATUS)+`

Material Name: `+t.name+`
Material Type: `+t.type+`

Program Info Log: `+n+`
`+e+`
`+r)}}else n===``?(r===``||a===``)&&(s=!1):console.warn(`THREE.WebGLProgram: Program Info Log:`,n);s&&(t.diagnostics={runnable:o,programLog:n,vertexShader:{log:r,prefix:g},fragmentShader:{log:a,prefix:_}})}i.deleteShader(x),i.deleteShader(S),w=new qa(i,h),T=io(i,h)}let w;this.getUniforms=function(){return w===void 0&&C(this),w};let T;this.getAttributes=function(){return T===void 0&&C(this),T};let E=n.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return E===!1&&(E=i.getProgramParameter(h,Ya)),E},this.destroy=function(){r.releaseStatesOfProgram(this),i.deleteProgram(h),this.program=void 0},this.type=n.shaderType,this.name=n.shaderName,this.id=Xa++,this.cacheKey=t,this.usedTimes=1,this.program=h,this.vertexShader=x,this.fragmentShader=S,this}var Co=0,wo=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){let t=e.vertexShader,n=e.fragmentShader,r=this._getShaderStage(t),i=this._getShaderStage(n),a=this._getShaderCacheForMaterial(e);return a.has(r)===!1&&(a.add(r),r.usedTimes++),a.has(i)===!1&&(a.add(i),i.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let e of t)e.usedTimes--,e.usedTimes===0&&this.shaderCache.delete(e.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new To(e),t.set(e,n)),n}},To=class{constructor(e){this.id=Co++,this.code=e,this.usedTimes=0}};function Eo(e,t,n,r,i,a,o){let s=new on,c=new wo,l=new Set,u=[],d=i.logarithmicDepthBuffer,f=i.vertexTextures,p=i.precision,m={MeshDepthMaterial:`depth`,MeshDistanceMaterial:`distanceRGBA`,MeshNormalMaterial:`normal`,MeshBasicMaterial:`basic`,MeshLambertMaterial:`lambert`,MeshPhongMaterial:`phong`,MeshToonMaterial:`toon`,MeshStandardMaterial:`physical`,MeshPhysicalMaterial:`physical`,MeshMatcapMaterial:`matcap`,LineBasicMaterial:`basic`,LineDashedMaterial:`dashed`,PointsMaterial:`points`,ShadowMaterial:`shadow`,SpriteMaterial:`sprite`};function h(e){return l.add(e),e===0?`uv`:`uv${e}`}function g(a,s,u,g,_){let v=g.fog,y=_.geometry,b=a.isMeshStandardMaterial?g.environment:null,x=(a.isMeshStandardMaterial?n:t).get(a.envMap||b),S=x&&x.mapping===306?x.image.height:null,C=m[a.type];a.precision!==null&&(p=i.getMaxPrecision(a.precision),p!==a.precision&&console.warn(`THREE.WebGLProgram.getParameters:`,a.precision,`not supported, using`,p,`instead.`));let w=y.morphAttributes.position||y.morphAttributes.normal||y.morphAttributes.color,T=w===void 0?0:w.length,E=0;y.morphAttributes.position!==void 0&&(E=1),y.morphAttributes.normal!==void 0&&(E=2),y.morphAttributes.color!==void 0&&(E=3);let D,O,k,A;if(C){let e=ni[C];D=e.vertexShader,O=e.fragmentShader}else D=a.vertexShader,O=a.fragmentShader,c.update(a),k=c.getVertexShaderID(a),A=c.getFragmentShaderID(a);let j=e.getRenderTarget(),ee=_.isInstancedMesh===!0,M=_.isBatchedMesh===!0,N=!!a.map,P=!!a.matcap,te=!!x,ne=!!a.aoMap,re=!!a.lightMap,ie=!!a.bumpMap,ae=!!a.normalMap,F=!!a.displacementMap,I=!!a.emissiveMap,oe=!!a.metalnessMap,se=!!a.roughnessMap,ce=a.anisotropy>0,le=a.clearcoat>0,ue=a.iridescence>0,de=a.sheen>0,L=a.transmission>0,fe=ce&&!!a.anisotropyMap,pe=le&&!!a.clearcoatMap,he=le&&!!a.clearcoatNormalMap,ge=le&&!!a.clearcoatRoughnessMap,R=ue&&!!a.iridescenceMap,_e=ue&&!!a.iridescenceThicknessMap,z=de&&!!a.sheenColorMap,B=de&&!!a.sheenRoughnessMap,ve=!!a.specularMap,ye=!!a.specularColorMap,be=!!a.specularIntensityMap,xe=L&&!!a.transmissionMap,Se=L&&!!a.thicknessMap,Ce=!!a.gradientMap,we=!!a.alphaMap,Te=a.alphaTest>0,Ee=!!a.alphaHash,De=!!a.extensions,Oe=0;a.toneMapped&&(j===null||j.isXRRenderTarget===!0)&&(Oe=e.toneMapping);let ke={shaderID:C,shaderType:a.type,shaderName:a.name,vertexShader:D,fragmentShader:O,defines:a.defines,customVertexShaderID:k,customFragmentShaderID:A,isRawShaderMaterial:a.isRawShaderMaterial===!0,glslVersion:a.glslVersion,precision:p,batching:M,instancing:ee,instancingColor:ee&&_.instanceColor!==null,instancingMorph:ee&&_.morphTexture!==null,supportsVertexTextures:f,outputColorSpace:j===null?e.outputColorSpace:j.isXRRenderTarget===!0?j.texture.colorSpace:me,alphaToCoverage:!!a.alphaToCoverage,map:N,matcap:P,envMap:te,envMapMode:te&&x.mapping,envMapCubeUVHeight:S,aoMap:ne,lightMap:re,bumpMap:ie,normalMap:ae,displacementMap:f&&F,emissiveMap:I,normalMapObjectSpace:ae&&a.normalMapType===1,normalMapTangentSpace:ae&&a.normalMapType===0,metalnessMap:oe,roughnessMap:se,anisotropy:ce,anisotropyMap:fe,clearcoat:le,clearcoatMap:pe,clearcoatNormalMap:he,clearcoatRoughnessMap:ge,iridescence:ue,iridescenceMap:R,iridescenceThicknessMap:_e,sheen:de,sheenColorMap:z,sheenRoughnessMap:B,specularMap:ve,specularColorMap:ye,specularIntensityMap:be,transmission:L,transmissionMap:xe,thicknessMap:Se,gradientMap:Ce,opaque:a.transparent===!1&&a.blending===1&&a.alphaToCoverage===!1,alphaMap:we,alphaTest:Te,alphaHash:Ee,combine:a.combine,mapUv:N&&h(a.map.channel),aoMapUv:ne&&h(a.aoMap.channel),lightMapUv:re&&h(a.lightMap.channel),bumpMapUv:ie&&h(a.bumpMap.channel),normalMapUv:ae&&h(a.normalMap.channel),displacementMapUv:F&&h(a.displacementMap.channel),emissiveMapUv:I&&h(a.emissiveMap.channel),metalnessMapUv:oe&&h(a.metalnessMap.channel),roughnessMapUv:se&&h(a.roughnessMap.channel),anisotropyMapUv:fe&&h(a.anisotropyMap.channel),clearcoatMapUv:pe&&h(a.clearcoatMap.channel),clearcoatNormalMapUv:he&&h(a.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:ge&&h(a.clearcoatRoughnessMap.channel),iridescenceMapUv:R&&h(a.iridescenceMap.channel),iridescenceThicknessMapUv:_e&&h(a.iridescenceThicknessMap.channel),sheenColorMapUv:z&&h(a.sheenColorMap.channel),sheenRoughnessMapUv:B&&h(a.sheenRoughnessMap.channel),specularMapUv:ve&&h(a.specularMap.channel),specularColorMapUv:ye&&h(a.specularColorMap.channel),specularIntensityMapUv:be&&h(a.specularIntensityMap.channel),transmissionMapUv:xe&&h(a.transmissionMap.channel),thicknessMapUv:Se&&h(a.thicknessMap.channel),alphaMapUv:we&&h(a.alphaMap.channel),vertexTangents:!!y.attributes.tangent&&(ae||ce),vertexColors:a.vertexColors,vertexAlphas:a.vertexColors===!0&&!!y.attributes.color&&y.attributes.color.itemSize===4,pointsUvs:_.isPoints===!0&&!!y.attributes.uv&&(N||we),fog:!!v,useFog:a.fog===!0,fogExp2:!!v&&v.isFogExp2,flatShading:a.flatShading===!0,sizeAttenuation:a.sizeAttenuation===!0,logarithmicDepthBuffer:d,skinning:_.isSkinnedMesh===!0,morphTargets:y.morphAttributes.position!==void 0,morphNormals:y.morphAttributes.normal!==void 0,morphColors:y.morphAttributes.color!==void 0,morphTargetsCount:T,morphTextureStride:E,numDirLights:s.directional.length,numPointLights:s.point.length,numSpotLights:s.spot.length,numSpotLightMaps:s.spotLightMap.length,numRectAreaLights:s.rectArea.length,numHemiLights:s.hemi.length,numDirLightShadows:s.directionalShadowMap.length,numPointLightShadows:s.pointShadowMap.length,numSpotLightShadows:s.spotShadowMap.length,numSpotLightShadowsWithMaps:s.numSpotLightShadowsWithMaps,numLightProbes:s.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:a.dithering,shadowMapEnabled:e.shadowMap.enabled&&u.length>0,shadowMapType:e.shadowMap.type,toneMapping:Oe,useLegacyLights:e._useLegacyLights,decodeVideoTexture:N&&a.map.isVideoTexture===!0&&it.getTransfer(a.map.colorSpace)===`srgb`,premultipliedAlpha:a.premultipliedAlpha,doubleSided:a.side===2,flipSided:a.side===1,useDepthPacking:a.depthPacking>=0,depthPacking:a.depthPacking||0,index0AttributeName:a.index0AttributeName,extensionClipCullDistance:De&&a.extensions.clipCullDistance===!0&&r.has(`WEBGL_clip_cull_distance`),extensionMultiDraw:De&&a.extensions.multiDraw===!0&&r.has(`WEBGL_multi_draw`),rendererExtensionParallelShaderCompile:r.has(`KHR_parallel_shader_compile`),customProgramCacheKey:a.customProgramCacheKey()};return ke.vertexUv1s=l.has(1),ke.vertexUv2s=l.has(2),ke.vertexUv3s=l.has(3),l.clear(),ke}function _(t){let n=[];if(t.shaderID?n.push(t.shaderID):(n.push(t.customVertexShaderID),n.push(t.customFragmentShaderID)),t.defines!==void 0)for(let e in t.defines)n.push(e),n.push(t.defines[e]);return t.isRawShaderMaterial===!1&&(v(n,t),y(n,t),n.push(e.outputColorSpace)),n.push(t.customProgramCacheKey),n.join()}function v(e,t){e.push(t.precision),e.push(t.outputColorSpace),e.push(t.envMapMode),e.push(t.envMapCubeUVHeight),e.push(t.mapUv),e.push(t.alphaMapUv),e.push(t.lightMapUv),e.push(t.aoMapUv),e.push(t.bumpMapUv),e.push(t.normalMapUv),e.push(t.displacementMapUv),e.push(t.emissiveMapUv),e.push(t.metalnessMapUv),e.push(t.roughnessMapUv),e.push(t.anisotropyMapUv),e.push(t.clearcoatMapUv),e.push(t.clearcoatNormalMapUv),e.push(t.clearcoatRoughnessMapUv),e.push(t.iridescenceMapUv),e.push(t.iridescenceThicknessMapUv),e.push(t.sheenColorMapUv),e.push(t.sheenRoughnessMapUv),e.push(t.specularMapUv),e.push(t.specularColorMapUv),e.push(t.specularIntensityMapUv),e.push(t.transmissionMapUv),e.push(t.thicknessMapUv),e.push(t.combine),e.push(t.fogExp2),e.push(t.sizeAttenuation),e.push(t.morphTargetsCount),e.push(t.morphAttributeCount),e.push(t.numDirLights),e.push(t.numPointLights),e.push(t.numSpotLights),e.push(t.numSpotLightMaps),e.push(t.numHemiLights),e.push(t.numRectAreaLights),e.push(t.numDirLightShadows),e.push(t.numPointLightShadows),e.push(t.numSpotLightShadows),e.push(t.numSpotLightShadowsWithMaps),e.push(t.numLightProbes),e.push(t.shadowMapType),e.push(t.toneMapping),e.push(t.numClippingPlanes),e.push(t.numClipIntersection),e.push(t.depthPacking)}function y(e,t){s.disableAll(),t.supportsVertexTextures&&s.enable(0),t.instancing&&s.enable(1),t.instancingColor&&s.enable(2),t.instancingMorph&&s.enable(3),t.matcap&&s.enable(4),t.envMap&&s.enable(5),t.normalMapObjectSpace&&s.enable(6),t.normalMapTangentSpace&&s.enable(7),t.clearcoat&&s.enable(8),t.iridescence&&s.enable(9),t.alphaTest&&s.enable(10),t.vertexColors&&s.enable(11),t.vertexAlphas&&s.enable(12),t.vertexUv1s&&s.enable(13),t.vertexUv2s&&s.enable(14),t.vertexUv3s&&s.enable(15),t.vertexTangents&&s.enable(16),t.anisotropy&&s.enable(17),t.alphaHash&&s.enable(18),t.batching&&s.enable(19),e.push(s.mask),s.disableAll(),t.fog&&s.enable(0),t.useFog&&s.enable(1),t.flatShading&&s.enable(2),t.logarithmicDepthBuffer&&s.enable(3),t.skinning&&s.enable(4),t.morphTargets&&s.enable(5),t.morphNormals&&s.enable(6),t.morphColors&&s.enable(7),t.premultipliedAlpha&&s.enable(8),t.shadowMapEnabled&&s.enable(9),t.useLegacyLights&&s.enable(10),t.doubleSided&&s.enable(11),t.flipSided&&s.enable(12),t.useDepthPacking&&s.enable(13),t.dithering&&s.enable(14),t.transmission&&s.enable(15),t.sheen&&s.enable(16),t.opaque&&s.enable(17),t.pointsUvs&&s.enable(18),t.decodeVideoTexture&&s.enable(19),t.alphaToCoverage&&s.enable(20),e.push(s.mask)}function b(e){let t=m[e.type],n;if(t){let e=ni[t];n=Mr.clone(e.uniforms)}else n=e.uniforms;return n}function x(t,n){let r;for(let e=0,t=u.length;e<t;e++){let t=u[e];if(t.cacheKey===n){r=t,++r.usedTimes;break}}return r===void 0&&(r=new So(e,n,t,a),u.push(r)),r}function S(e){if(--e.usedTimes===0){let t=u.indexOf(e);u[t]=u[u.length-1],u.pop(),e.destroy()}}function C(e){c.remove(e)}function w(){c.dispose()}return{getParameters:g,getProgramCacheKey:_,getUniforms:b,acquireProgram:x,releaseProgram:S,releaseShaderCache:C,programs:u,dispose:w}}function Do(){let e=new WeakMap;function t(t){let n=e.get(t);return n===void 0&&(n={},e.set(t,n)),n}function n(t){e.delete(t)}function r(t,n,r){e.get(t)[n]=r}function i(){e=new WeakMap}return{get:t,remove:n,update:r,dispose:i}}function Oo(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.material.id===t.material.id?e.z===t.z?e.id-t.id:e.z-t.z:e.material.id-t.material.id:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function ko(e,t){return e.groupOrder===t.groupOrder?e.renderOrder===t.renderOrder?e.z===t.z?e.id-t.id:t.z-e.z:e.renderOrder-t.renderOrder:e.groupOrder-t.groupOrder}function Ao(){let e=[],t=0,n=[],r=[],i=[];function a(){t=0,n.length=0,r.length=0,i.length=0}function o(n,r,i,a,o,s){let c=e[t];return c===void 0?(c={id:n.id,object:n,geometry:r,material:i,groupOrder:a,renderOrder:n.renderOrder,z:o,group:s},e[t]=c):(c.id=n.id,c.object=n,c.geometry=r,c.material=i,c.groupOrder=a,c.renderOrder=n.renderOrder,c.z=o,c.group=s),t++,c}function s(e,t,a,s,c,l){let u=o(e,t,a,s,c,l);a.transmission>0?r.push(u):a.transparent===!0?i.push(u):n.push(u)}function c(e,t,a,s,c,l){let u=o(e,t,a,s,c,l);a.transmission>0?r.unshift(u):a.transparent===!0?i.unshift(u):n.unshift(u)}function l(e,t){n.length>1&&n.sort(e||Oo),r.length>1&&r.sort(t||ko),i.length>1&&i.sort(t||ko)}function u(){for(let n=t,r=e.length;n<r;n++){let t=e[n];if(t.id===null)break;t.id=null,t.object=null,t.geometry=null,t.material=null,t.group=null}}return{opaque:n,transmissive:r,transparent:i,init:a,push:s,unshift:c,finish:u,sort:l}}function jo(){let e=new WeakMap;function t(t,n){let r=e.get(t),i;return r===void 0?(i=new Ao,e.set(t,[i])):n>=r.length?(i=new Ao,r.push(i)):i=r[n],i}function n(){e=new WeakMap}return{get:t,dispose:n}}function Mo(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`DirectionalLight`:n={direction:new U,color:new G};break;case`SpotLight`:n={position:new U,direction:new U,color:new G,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case`PointLight`:n={position:new U,color:new G,distance:0,decay:0};break;case`HemisphereLight`:n={direction:new U,skyColor:new G,groundColor:new G};break;case`RectAreaLight`:n={color:new G,position:new U,halfWidth:new U,halfHeight:new U}}return e[t.id]=n,n}}}function No(){let e={};return{get:function(t){if(e[t.id]!==void 0)return e[t.id];let n;switch(t.type){case`DirectionalLight`:n={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new V};break;case`SpotLight`:n={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new V};break;case`PointLight`:n={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new V,shadowCameraNear:1,shadowCameraFar:1e3}}return e[t.id]=n,n}}}var Po=0;function Fo(e,t){return(t.castShadow?2:0)-(e.castShadow?2:0)+ +!!t.map-!!e.map}function Io(e){let t=new Mo,n=No(),r={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let e=0;e<9;e++)r.probe.push(new U);let i=new U,a=new W,o=new W;function s(i,a){let o=0,s=0,c=0;for(let e=0;e<9;e++)r.probe[e].set(0,0,0);let l=0,u=0,d=0,f=0,p=0,m=0,h=0,g=0,_=0,v=0,y=0;i.sort(Fo);let b=a===!0?Math.PI:1;for(let e=0,a=i.length;e<a;e++){let a=i[e],x=a.color,S=a.intensity,C=a.distance,w=a.shadow&&a.shadow.map?a.shadow.map.texture:null;if(a.isAmbientLight)o+=x.r*S*b,s+=x.g*S*b,c+=x.b*S*b;else if(a.isLightProbe){for(let e=0;e<9;e++)r.probe[e].addScaledVector(a.sh.coefficients[e],S);y++}else if(a.isDirectionalLight){let e=t.get(a);if(e.color.copy(a.color).multiplyScalar(a.intensity*b),a.castShadow){let e=a.shadow,t=n.get(a);t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,r.directionalShadow[l]=t,r.directionalShadowMap[l]=w,r.directionalShadowMatrix[l]=a.shadow.matrix,m++}r.directional[l]=e,l++}else if(a.isSpotLight){let e=t.get(a);e.position.setFromMatrixPosition(a.matrixWorld),e.color.copy(x).multiplyScalar(S*b),e.distance=C,e.coneCos=Math.cos(a.angle),e.penumbraCos=Math.cos(a.angle*(1-a.penumbra)),e.decay=a.decay,r.spot[d]=e;let i=a.shadow;if(a.map&&(r.spotLightMap[_]=a.map,_++,i.updateMatrices(a),a.castShadow&&v++),r.spotLightMatrix[d]=i.matrix,a.castShadow){let e=n.get(a);e.shadowBias=i.bias,e.shadowNormalBias=i.normalBias,e.shadowRadius=i.radius,e.shadowMapSize=i.mapSize,r.spotShadow[d]=e,r.spotShadowMap[d]=w,g++}d++}else if(a.isRectAreaLight){let e=t.get(a);e.color.copy(x).multiplyScalar(S),e.halfWidth.set(a.width*.5,0,0),e.halfHeight.set(0,a.height*.5,0),r.rectArea[f]=e,f++}else if(a.isPointLight){let e=t.get(a);if(e.color.copy(a.color).multiplyScalar(a.intensity*b),e.distance=a.distance,e.decay=a.decay,a.castShadow){let e=a.shadow,t=n.get(a);t.shadowBias=e.bias,t.shadowNormalBias=e.normalBias,t.shadowRadius=e.radius,t.shadowMapSize=e.mapSize,t.shadowCameraNear=e.camera.near,t.shadowCameraFar=e.camera.far,r.pointShadow[u]=t,r.pointShadowMap[u]=w,r.pointShadowMatrix[u]=a.shadow.matrix,h++}r.point[u]=e,u++}else if(a.isHemisphereLight){let e=t.get(a);e.skyColor.copy(a.color).multiplyScalar(S*b),e.groundColor.copy(a.groundColor).multiplyScalar(S*b),r.hemi[p]=e,p++}}f>0&&(e.has(`OES_texture_float_linear`)===!0?(r.rectAreaLTC1=q.LTC_FLOAT_1,r.rectAreaLTC2=q.LTC_FLOAT_2):(r.rectAreaLTC1=q.LTC_HALF_1,r.rectAreaLTC2=q.LTC_HALF_2)),r.ambient[0]=o,r.ambient[1]=s,r.ambient[2]=c;let x=r.hash;(x.directionalLength!==l||x.pointLength!==u||x.spotLength!==d||x.rectAreaLength!==f||x.hemiLength!==p||x.numDirectionalShadows!==m||x.numPointShadows!==h||x.numSpotShadows!==g||x.numSpotMaps!==_||x.numLightProbes!==y)&&(r.directional.length=l,r.spot.length=d,r.rectArea.length=f,r.point.length=u,r.hemi.length=p,r.directionalShadow.length=m,r.directionalShadowMap.length=m,r.pointShadow.length=h,r.pointShadowMap.length=h,r.spotShadow.length=g,r.spotShadowMap.length=g,r.directionalShadowMatrix.length=m,r.pointShadowMatrix.length=h,r.spotLightMatrix.length=g+_-v,r.spotLightMap.length=_,r.numSpotLightShadowsWithMaps=v,r.numLightProbes=y,x.directionalLength=l,x.pointLength=u,x.spotLength=d,x.rectAreaLength=f,x.hemiLength=p,x.numDirectionalShadows=m,x.numPointShadows=h,x.numSpotShadows=g,x.numSpotMaps=_,x.numLightProbes=y,r.version=Po++)}function c(e,t){let n=0,s=0,c=0,l=0,u=0,d=t.matrixWorldInverse;for(let t=0,f=e.length;t<f;t++){let f=e[t];if(f.isDirectionalLight){let e=r.directional[n];e.direction.setFromMatrixPosition(f.matrixWorld),i.setFromMatrixPosition(f.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(d),n++}else if(f.isSpotLight){let e=r.spot[c];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),e.direction.setFromMatrixPosition(f.matrixWorld),i.setFromMatrixPosition(f.target.matrixWorld),e.direction.sub(i),e.direction.transformDirection(d),c++}else if(f.isRectAreaLight){let e=r.rectArea[l];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),o.identity(),a.copy(f.matrixWorld),a.premultiply(d),o.extractRotation(a),e.halfWidth.set(f.width*.5,0,0),e.halfHeight.set(0,f.height*.5,0),e.halfWidth.applyMatrix4(o),e.halfHeight.applyMatrix4(o),l++}else if(f.isPointLight){let e=r.point[s];e.position.setFromMatrixPosition(f.matrixWorld),e.position.applyMatrix4(d),s++}else if(f.isHemisphereLight){let e=r.hemi[u];e.direction.setFromMatrixPosition(f.matrixWorld),e.direction.transformDirection(d),u++}}}return{setup:s,setupView:c,state:r}}function Lo(e){let t=new Io(e),n=[],r=[];function i(){n.length=0,r.length=0}function a(e){n.push(e)}function o(e){r.push(e)}function s(e){t.setup(n,e)}function c(e){t.setupView(n,e)}return{init:i,state:{lightsArray:n,shadowsArray:r,lights:t,transmissionRenderTarget:null},setupLights:s,setupLightsView:c,pushLight:a,pushShadow:o}}function Ro(e){let t=new WeakMap;function n(n,r=0){let i=t.get(n),a;return i===void 0?(a=new Lo(e),t.set(n,[a])):r>=i.length?(a=new Lo(e),i.push(a)):a=i[r],a}function r(){t=new WeakMap}return{get:n,dispose:r}}var zo=class extends Bn{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type=`MeshDepthMaterial`,this.depthPacking=L,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},Bo=class extends Bn{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type=`MeshDistanceMaterial`,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}},Vo=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Ho=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function Uo(e,t,n){let r=new Qr,i=new V,a=new V,o=new mt,s=new zo({depthPacking:fe}),l=new Bo,u={},d=n.maxTextureSize,f={0:1,1:0,2:2},p=new Fr({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new V},radius:{value:4}},vertexShader:Vo,fragmentShader:Ho}),m=p.clone();m.defines.HORIZONTAL_PASS=1;let h=new or;h.setAttribute(`position`,new Yn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let g=new wr(h,p),_=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=1;let v=this.type;this.render=function(t,n,s){if(_.enabled===!1||_.autoUpdate===!1&&_.needsUpdate===!1||t.length===0)return;let l=e.getRenderTarget(),u=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),p=e.state;p.setBlending(0),p.buffers.color.setClear(1,1,1,1),p.buffers.depth.setTest(!0),p.setScissorTest(!1);let m=v!==3&&this.type===3,h=v===3&&this.type!==3;for(let l=0,u=t.length;l<u;l++){let u=t[l],f=u.shadow;if(f===void 0){console.warn(`THREE.WebGLShadowMap:`,u,`has no shadow.`);continue}if(f.autoUpdate===!1&&f.needsUpdate===!1)continue;i.copy(f.mapSize);let g=f.getFrameExtents();if(i.multiply(g),a.copy(f.mapSize),(i.x>d||i.y>d)&&(i.x>d&&(a.x=Math.floor(d/g.x),i.x=a.x*g.x,f.mapSize.x=a.x),i.y>d&&(a.y=Math.floor(d/g.y),i.y=a.y*g.y,f.mapSize.y=a.y)),f.map===null||m===!0||h===!0){let e=this.type===3?{}:{minFilter:c,magFilter:c};f.map!==null&&f.map.dispose(),f.map=new gt(i.x,i.y,e),f.map.texture.name=u.name+`.shadowMap`,f.camera.updateProjectionMatrix()}e.setRenderTarget(f.map),e.clear();let _=f.getViewportCount();for(let e=0;e<_;e++){let t=f.getViewport(e);o.set(a.x*t.x,a.y*t.y,a.x*t.z,a.y*t.w),p.viewport(o),f.updateMatrices(u,e),r=f.getFrustum(),x(n,s,f.camera,u,this.type)}f.isPointLightShadow!==!0&&this.type===3&&y(f,s),f.needsUpdate=!1}v=this.type,_.needsUpdate=!1,e.setRenderTarget(l,u,f)};function y(n,r){let a=t.update(g);p.defines.VSM_SAMPLES!==n.blurSamples&&(p.defines.VSM_SAMPLES=n.blurSamples,m.defines.VSM_SAMPLES=n.blurSamples,p.needsUpdate=!0,m.needsUpdate=!0),n.mapPass===null&&(n.mapPass=new gt(i.x,i.y)),p.uniforms.shadow_pass.value=n.map.texture,p.uniforms.resolution.value=n.mapSize,p.uniforms.radius.value=n.radius,e.setRenderTarget(n.mapPass),e.clear(),e.renderBufferDirect(r,null,a,p,g,null),m.uniforms.shadow_pass.value=n.mapPass.texture,m.uniforms.resolution.value=n.mapSize,m.uniforms.radius.value=n.radius,e.setRenderTarget(n.map),e.clear(),e.renderBufferDirect(r,null,a,m,g,null)}function b(t,n,r,i){let a=null,o=r.isPointLight===!0?t.customDistanceMaterial:t.customDepthMaterial;if(o!==void 0)a=o;else if(a=r.isPointLight===!0?l:s,e.localClippingEnabled&&n.clipShadows===!0&&Array.isArray(n.clippingPlanes)&&n.clippingPlanes.length!==0||n.displacementMap&&n.displacementScale!==0||n.alphaMap&&n.alphaTest>0||n.map&&n.alphaTest>0){let e=a.uuid,t=n.uuid,r=u[e];r===void 0&&(r={},u[e]=r);let i=r[t];i===void 0&&(i=a.clone(),r[t]=i,n.addEventListener(`dispose`,S)),a=i}if(a.visible=n.visible,a.wireframe=n.wireframe,i===3?a.side=n.shadowSide===null?n.side:n.shadowSide:a.side=n.shadowSide===null?f[n.side]:n.shadowSide,a.alphaMap=n.alphaMap,a.alphaTest=n.alphaTest,a.map=n.map,a.clipShadows=n.clipShadows,a.clippingPlanes=n.clippingPlanes,a.clipIntersection=n.clipIntersection,a.displacementMap=n.displacementMap,a.displacementScale=n.displacementScale,a.displacementBias=n.displacementBias,a.wireframeLinewidth=n.wireframeLinewidth,a.linewidth=n.linewidth,r.isPointLight===!0&&a.isMeshDistanceMaterial===!0){let t=e.properties.get(a);t.light=r}return a}function x(n,i,a,o,s){if(n.visible===!1)return;if(n.layers.test(i.layers)&&(n.isMesh||n.isLine||n.isPoints)&&(n.castShadow||n.receiveShadow&&s===3)&&(!n.frustumCulled||r.intersectsObject(n))){n.modelViewMatrix.multiplyMatrices(a.matrixWorldInverse,n.matrixWorld);let r=t.update(n),c=n.material;if(Array.isArray(c)){let t=r.groups;for(let l=0,u=t.length;l<u;l++){let u=t[l],d=c[u.materialIndex];if(d&&d.visible){let t=b(n,d,o,s);n.onBeforeShadow(e,n,i,a,r,t,u),e.renderBufferDirect(a,null,r,t,n,u),n.onAfterShadow(e,n,i,a,r,t,u)}}}else if(c.visible){let t=b(n,c,o,s);n.onBeforeShadow(e,n,i,a,r,t,null),e.renderBufferDirect(a,null,r,t,n,null),n.onAfterShadow(e,n,i,a,r,t,null)}}let c=n.children;for(let e=0,t=c.length;e<t;e++)x(c[e],i,a,o,s)}function S(e){e.target.removeEventListener(`dispose`,S);for(let t in u){let n=u[t],r=e.target.uuid;r in n&&(n[r].dispose(),delete n[r])}}}function Wo(e){function t(){let t=!1,n=new mt,r=null,i=new mt(0,0,0,0);return{setMask:function(n){r!==n&&!t&&(e.colorMask(n,n,n,n),r=n)},setLocked:function(e){t=e},setClear:function(t,r,a,o,s){s===!0&&(t*=o,r*=o,a*=o),n.set(t,r,a,o),i.equals(n)===!1&&(e.clearColor(t,r,a,o),i.copy(n))},reset:function(){t=!1,r=null,i.set(-1,0,0,0)}}}function n(){let t=!1,n=null,r=null,i=null;return{setTest:function(t){t?I(e.DEPTH_TEST):oe(e.DEPTH_TEST)},setMask:function(r){n!==r&&!t&&(e.depthMask(r),n=r)},setFunc:function(t){if(r!==t){switch(t){case 0:e.depthFunc(e.NEVER);break;case 1:e.depthFunc(e.ALWAYS);break;case 2:e.depthFunc(e.LESS);break;case 3:e.depthFunc(e.LEQUAL);break;case 4:e.depthFunc(e.EQUAL);break;case 5:e.depthFunc(e.GEQUAL);break;case 6:e.depthFunc(e.GREATER);break;case 7:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}r=t}},setLocked:function(e){t=e},setClear:function(t){i!==t&&(e.clearDepth(t),i=t)},reset:function(){t=!1,n=null,r=null,i=null}}}function r(){let t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null;return{setTest:function(n){t||(n?I(e.STENCIL_TEST):oe(e.STENCIL_TEST))},setMask:function(r){n!==r&&!t&&(e.stencilMask(r),n=r)},setFunc:function(t,n,o){(r!==t||i!==n||a!==o)&&(e.stencilFunc(t,n,o),r=t,i=n,a=o)},setOp:function(t,n,r){(o!==t||s!==n||c!==r)&&(e.stencilOp(t,n,r),o=t,s=n,c=r)},setLocked:function(e){t=e},setClear:function(t){l!==t&&(e.clearStencil(t),l=t)},reset:function(){t=!1,n=null,r=null,i=null,a=null,o=null,s=null,c=null,l=null}}}let i=new t,a=new n,o=new r,s=new WeakMap,c=new WeakMap,l={},u={},d=new WeakMap,f=[],p=null,m=!1,h=null,g=null,_=null,v=null,y=null,b=null,x=null,S=new G(0,0,0),C=0,w=!1,T=null,E=null,D=null,O=null,k=null,A=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS),j=!1,ee=0,M=e.getParameter(e.VERSION);M.indexOf(`WebGL`)===-1?M.indexOf(`OpenGL ES`)!==-1&&(ee=parseFloat(/^OpenGL ES (\d)/.exec(M)[1]),j=ee>=2):(ee=parseFloat(/^WebGL (\d)/.exec(M)[1]),j=ee>=1);let N=null,P={},te=e.getParameter(e.SCISSOR_BOX),ne=e.getParameter(e.VIEWPORT),re=new mt().fromArray(te),ie=new mt().fromArray(ne);function ae(t,n,r,i){let a=new Uint8Array(4),o=e.createTexture();e.bindTexture(t,o),e.texParameteri(t,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(t,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let o=0;o<r;o++)t===e.TEXTURE_3D||t===e.TEXTURE_2D_ARRAY?e.texImage3D(n,0,e.RGBA,1,1,i,0,e.RGBA,e.UNSIGNED_BYTE,a):e.texImage2D(n+o,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,a);return o}let F={};F[e.TEXTURE_2D]=ae(e.TEXTURE_2D,e.TEXTURE_2D,1),F[e.TEXTURE_CUBE_MAP]=ae(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),F[e.TEXTURE_2D_ARRAY]=ae(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),F[e.TEXTURE_3D]=ae(e.TEXTURE_3D,e.TEXTURE_3D,1,1),i.setClear(0,0,0,1),a.setClear(1),o.setClear(0),I(e.DEPTH_TEST),a.setFunc(3),pe(!1),me(1),I(e.CULL_FACE),L(0);function I(t){l[t]!==!0&&(e.enable(t),l[t]=!0)}function oe(t){l[t]!==!1&&(e.disable(t),l[t]=!1)}function se(t,n){return u[t]!==n&&(e.bindFramebuffer(t,n),u[t]=n,t===e.DRAW_FRAMEBUFFER&&(u[e.FRAMEBUFFER]=n),t===e.FRAMEBUFFER&&(u[e.DRAW_FRAMEBUFFER]=n),!0)}function ce(t,n){let r=f,i=!1;if(t){r=d.get(n),r===void 0&&(r=[],d.set(n,r));let a=t.textures;if(r.length!==a.length||r[0]!==e.COLOR_ATTACHMENT0){for(let t=0,n=a.length;t<n;t++)r[t]=e.COLOR_ATTACHMENT0+t;r.length=a.length,i=!0}}else r[0]!==e.BACK&&(r[0]=e.BACK,i=!0);i&&e.drawBuffers(r)}function le(t){return p!==t&&(e.useProgram(t),p=t,!0)}let ue={100:e.FUNC_ADD,101:e.FUNC_SUBTRACT,102:e.FUNC_REVERSE_SUBTRACT};ue[103]=e.MIN,ue[104]=e.MAX;let de={200:e.ZERO,201:e.ONE,202:e.SRC_COLOR,204:e.SRC_ALPHA,210:e.SRC_ALPHA_SATURATE,208:e.DST_COLOR,206:e.DST_ALPHA,203:e.ONE_MINUS_SRC_COLOR,205:e.ONE_MINUS_SRC_ALPHA,209:e.ONE_MINUS_DST_COLOR,207:e.ONE_MINUS_DST_ALPHA,211:e.CONSTANT_COLOR,212:e.ONE_MINUS_CONSTANT_COLOR,213:e.CONSTANT_ALPHA,214:e.ONE_MINUS_CONSTANT_ALPHA};function L(t,n,r,i,a,o,s,c,l,u){if(t===0){m===!0&&(oe(e.BLEND),m=!1);return}if(m===!1&&(I(e.BLEND),m=!0),t!==5){if(t!==h||u!==w){if((g!==100||y!==100)&&(e.blendEquation(e.FUNC_ADD),g=100,y=100),u)switch(t){case 1:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.ONE,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFuncSeparate(e.ZERO,e.SRC_COLOR,e.ZERO,e.SRC_ALPHA);break;default:console.error(`THREE.WebGLState: Invalid blending: `,t)}else switch(t){case 1:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case 2:e.blendFunc(e.SRC_ALPHA,e.ONE);break;case 3:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case 4:e.blendFunc(e.ZERO,e.SRC_COLOR);break;default:console.error(`THREE.WebGLState: Invalid blending: `,t)}_=null,v=null,b=null,x=null,S.set(0,0,0),C=0,h=t,w=u}return}a||=n,o||=r,s||=i,(n!==g||a!==y)&&(e.blendEquationSeparate(ue[n],ue[a]),g=n,y=a),(r!==_||i!==v||o!==b||s!==x)&&(e.blendFuncSeparate(de[r],de[i],de[o],de[s]),_=r,v=i,b=o,x=s),(c.equals(S)===!1||l!==C)&&(e.blendColor(c.r,c.g,c.b,l),S.copy(c),C=l),h=t,w=!1}function fe(t,n){t.side===2?oe(e.CULL_FACE):I(e.CULL_FACE);let r=t.side===1;n&&(r=!r),pe(r),t.blending===1&&t.transparent===!1?L(0):L(t.blending,t.blendEquation,t.blendSrc,t.blendDst,t.blendEquationAlpha,t.blendSrcAlpha,t.blendDstAlpha,t.blendColor,t.blendAlpha,t.premultipliedAlpha),a.setFunc(t.depthFunc),a.setTest(t.depthTest),a.setMask(t.depthWrite),i.setMask(t.colorWrite);let s=t.stencilWrite;o.setTest(s),s&&(o.setMask(t.stencilWriteMask),o.setFunc(t.stencilFunc,t.stencilRef,t.stencilFuncMask),o.setOp(t.stencilFail,t.stencilZFail,t.stencilZPass)),ge(t.polygonOffset,t.polygonOffsetFactor,t.polygonOffsetUnits),t.alphaToCoverage===!0?I(e.SAMPLE_ALPHA_TO_COVERAGE):oe(e.SAMPLE_ALPHA_TO_COVERAGE)}function pe(t){T!==t&&(t?e.frontFace(e.CW):e.frontFace(e.CCW),T=t)}function me(t){t===0?oe(e.CULL_FACE):(I(e.CULL_FACE),t!==E&&(t===1?e.cullFace(e.BACK):t===2?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))),E=t}function he(t){t!==D&&(j&&e.lineWidth(t),D=t)}function ge(t,n,r){t?(I(e.POLYGON_OFFSET_FILL),(O!==n||k!==r)&&(e.polygonOffset(n,r),O=n,k=r)):oe(e.POLYGON_OFFSET_FILL)}function R(t){t?I(e.SCISSOR_TEST):oe(e.SCISSOR_TEST)}function _e(t){t===void 0&&(t=e.TEXTURE0+A-1),N!==t&&(e.activeTexture(t),N=t)}function z(t,n,r){r===void 0&&(r=N===null?e.TEXTURE0+A-1:N);let i=P[r];i===void 0&&(i={type:void 0,texture:void 0},P[r]=i),(i.type!==t||i.texture!==n)&&(N!==r&&(e.activeTexture(r),N=r),e.bindTexture(t,n||F[t]),i.type=t,i.texture=n)}function B(){let t=P[N];t!==void 0&&t.type!==void 0&&(e.bindTexture(t.type,null),t.type=void 0,t.texture=void 0)}function ve(){try{e.compressedTexImage2D.apply(e,arguments)}catch(e){console.error(`THREE.WebGLState:`,e)}}function ye(){try{e.compressedTexImage3D.apply(e,arguments)}catch(e){console.error(`THREE.WebGLState:`,e)}}function be(){try{e.texSubImage2D.apply(e,arguments)}catch(e){console.error(`THREE.WebGLState:`,e)}}function xe(){try{e.texSubImage3D.apply(e,arguments)}catch(e){console.error(`THREE.WebGLState:`,e)}}function Se(){try{e.compressedTexSubImage2D.apply(e,arguments)}catch(e){console.error(`THREE.WebGLState:`,e)}}function Ce(){try{e.compressedTexSubImage3D.apply(e,arguments)}catch(e){console.error(`THREE.WebGLState:`,e)}}function we(){try{e.texStorage2D.apply(e,arguments)}catch(e){console.error(`THREE.WebGLState:`,e)}}function Te(){try{e.texStorage3D.apply(e,arguments)}catch(e){console.error(`THREE.WebGLState:`,e)}}function Ee(){try{e.texImage2D.apply(e,arguments)}catch(e){console.error(`THREE.WebGLState:`,e)}}function De(){try{e.texImage3D.apply(e,arguments)}catch(e){console.error(`THREE.WebGLState:`,e)}}function Oe(t){re.equals(t)===!1&&(e.scissor(t.x,t.y,t.z,t.w),re.copy(t))}function ke(t){ie.equals(t)===!1&&(e.viewport(t.x,t.y,t.z,t.w),ie.copy(t))}function Ae(t,n){let r=c.get(n);r===void 0&&(r=new WeakMap,c.set(n,r));let i=r.get(t);i===void 0&&(i=e.getUniformBlockIndex(n,t.name),r.set(t,i))}function je(t,n){let r=c.get(n).get(t);s.get(n)!==r&&(e.uniformBlockBinding(n,r,t.__bindingPointIndex),s.set(n,r))}function Me(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),l={},N=null,P={},u={},d=new WeakMap,f=[],p=null,m=!1,h=null,g=null,_=null,v=null,y=null,b=null,x=null,S=new G(0,0,0),C=0,w=!1,T=null,E=null,D=null,O=null,k=null,re.set(0,0,e.canvas.width,e.canvas.height),ie.set(0,0,e.canvas.width,e.canvas.height),i.reset(),a.reset(),o.reset()}return{buffers:{color:i,depth:a,stencil:o},enable:I,disable:oe,bindFramebuffer:se,drawBuffers:ce,useProgram:le,setBlending:L,setMaterial:fe,setFlipSided:pe,setCullFace:me,setLineWidth:he,setPolygonOffset:ge,setScissorTest:R,activeTexture:_e,bindTexture:z,unbindTexture:B,compressedTexImage2D:ve,compressedTexImage3D:ye,texImage2D:Ee,texImage3D:De,updateUBOMapping:Ae,uniformBlockBinding:je,texStorage2D:we,texStorage3D:Te,texSubImage2D:be,texSubImage3D:xe,compressedTexSubImage2D:Se,compressedTexSubImage3D:Ce,scissor:Oe,viewport:ke,reset:Me}}function Go(e,t,n,r,i,m,h){let g=t.has(`WEBGL_multisampled_render_to_texture`)?t.get(`WEBGL_multisampled_render_to_texture`):null,_=typeof navigator>`u`?!1:/OculusBrowser/g.test(navigator.userAgent),v=new V,y=new WeakMap,b,x=new WeakMap,S=!1;try{S=typeof OffscreenCanvas<`u`&&new OffscreenCanvas(1,1).getContext(`2d`)!==null}catch{}function C(e,t){return S?new OffscreenCanvas(e,t):Xe(`canvas`)}function w(e,t,n){let r=1,i=xe(e);if((i.width>n||i.height>n)&&(r=n/Math.max(i.width,i.height)),r<1){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof VideoFrame<`u`&&e instanceof VideoFrame){let n=Math.floor(r*i.width),a=Math.floor(r*i.height);b===void 0&&(b=C(n,a));let o=t?C(n,a):b;return o.width=n,o.height=a,o.getContext(`2d`).drawImage(e,0,0,n,a),console.warn(`THREE.WebGLRenderer: Texture has been resized from (`+i.width+`x`+i.height+`) to (`+n+`x`+a+`).`),o}return`data`in e&&console.warn(`THREE.WebGLRenderer: Image in DataTexture is too big (`+i.width+`x`+i.height+`).`),e}return e}function T(e){return e.generateMipmaps&&e.minFilter!==1003&&e.minFilter!==1006}function E(t){e.generateMipmap(t)}function D(n,r,i,a,o=!1){if(n!==null){if(e[n]!==void 0)return e[n];console.warn(`THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '`+n+`'`)}let s=r;if(r===e.RED&&(i===e.FLOAT&&(s=e.R32F),i===e.HALF_FLOAT&&(s=e.R16F),i===e.UNSIGNED_BYTE&&(s=e.R8)),r===e.RED_INTEGER&&(i===e.UNSIGNED_BYTE&&(s=e.R8UI),i===e.UNSIGNED_SHORT&&(s=e.R16UI),i===e.UNSIGNED_INT&&(s=e.R32UI),i===e.BYTE&&(s=e.R8I),i===e.SHORT&&(s=e.R16I),i===e.INT&&(s=e.R32I)),r===e.RG&&(i===e.FLOAT&&(s=e.RG32F),i===e.HALF_FLOAT&&(s=e.RG16F),i===e.UNSIGNED_BYTE&&(s=e.RG8)),r===e.RG_INTEGER&&(i===e.UNSIGNED_BYTE&&(s=e.RG8UI),i===e.UNSIGNED_SHORT&&(s=e.RG16UI),i===e.UNSIGNED_INT&&(s=e.RG32UI),i===e.BYTE&&(s=e.RG8I),i===e.SHORT&&(s=e.RG16I),i===e.INT&&(s=e.RG32I)),r===e.RGB&&i===e.UNSIGNED_INT_5_9_9_9_REV&&(s=e.RGB9_E5),r===e.RGBA){let t=o?R:it.getTransfer(a);i===e.FLOAT&&(s=e.RGBA32F),i===e.HALF_FLOAT&&(s=e.RGBA16F),i===e.UNSIGNED_BYTE&&(s=t===`srgb`?e.SRGB8_ALPHA8:e.RGBA8),i===e.UNSIGNED_SHORT_4_4_4_4&&(s=e.RGBA4),i===e.UNSIGNED_SHORT_5_5_5_1&&(s=e.RGB5_A1)}return(s===e.R16F||s===e.R32F||s===e.RG16F||s===e.RG32F||s===e.RGBA16F||s===e.RGBA32F)&&t.get(`EXT_color_buffer_float`),s}function O(e,t){return T(e)===!0||e.isFramebufferTexture&&e.minFilter!==1003&&e.minFilter!==1006?Math.log2(Math.max(t.width,t.height))+1:e.mipmaps!==void 0&&e.mipmaps.length>0?e.mipmaps.length:e.isCompressedTexture&&Array.isArray(e.image)?t.mipmaps.length:1}function k(e){let t=e.target;t.removeEventListener(`dispose`,k),j(t),t.isVideoTexture&&y.delete(t)}function A(e){let t=e.target;t.removeEventListener(`dispose`,A),M(t)}function j(e){let t=r.get(e);if(t.__webglInit===void 0)return;let n=e.source,i=x.get(n);if(i){let r=i[t.__cacheKey];r.usedTimes--,r.usedTimes===0&&ee(e),Object.keys(i).length===0&&x.delete(n)}r.remove(e)}function ee(t){let n=r.get(t);e.deleteTexture(n.__webglTexture);let i=t.source,a=x.get(i);delete a[n.__cacheKey],h.memory.textures--}function M(t){let n=r.get(t);if(t.depthTexture&&t.depthTexture.dispose(),t.isWebGLCubeRenderTarget)for(let t=0;t<6;t++){if(Array.isArray(n.__webglFramebuffer[t]))for(let r=0;r<n.__webglFramebuffer[t].length;r++)e.deleteFramebuffer(n.__webglFramebuffer[t][r]);else e.deleteFramebuffer(n.__webglFramebuffer[t]);n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer[t])}else{if(Array.isArray(n.__webglFramebuffer))for(let t=0;t<n.__webglFramebuffer.length;t++)e.deleteFramebuffer(n.__webglFramebuffer[t]);else e.deleteFramebuffer(n.__webglFramebuffer);if(n.__webglDepthbuffer&&e.deleteRenderbuffer(n.__webglDepthbuffer),n.__webglMultisampledFramebuffer&&e.deleteFramebuffer(n.__webglMultisampledFramebuffer),n.__webglColorRenderbuffer)for(let t=0;t<n.__webglColorRenderbuffer.length;t++)n.__webglColorRenderbuffer[t]&&e.deleteRenderbuffer(n.__webglColorRenderbuffer[t]);n.__webglDepthRenderbuffer&&e.deleteRenderbuffer(n.__webglDepthRenderbuffer)}let i=t.textures;for(let t=0,n=i.length;t<n;t++){let n=r.get(i[t]);n.__webglTexture&&(e.deleteTexture(n.__webglTexture),h.memory.textures--),r.remove(i[t])}r.remove(t)}let N=0;function P(){N=0}function te(){let e=N;return e>=i.maxTextures&&console.warn(`THREE.WebGLTextures: Trying to use `+e+` texture units while this GPU supports only `+i.maxTextures),N+=1,e}function ne(e){let t=[];return t.push(e.wrapS),t.push(e.wrapT),t.push(e.wrapR||0),t.push(e.magFilter),t.push(e.minFilter),t.push(e.anisotropy),t.push(e.internalFormat),t.push(e.format),t.push(e.type),t.push(e.generateMipmaps),t.push(e.premultiplyAlpha),t.push(e.flipY),t.push(e.unpackAlignment),t.push(e.colorSpace),t.join()}function re(t,i){let a=r.get(t);if(t.isVideoTexture&&ye(t),t.isRenderTargetTexture===!1&&t.version>0&&a.__version!==t.version){let e=t.image;if(e===null)console.warn(`THREE.WebGLRenderer: Texture marked for update but no image data found.`);else if(e.complete===!1)console.warn(`THREE.WebGLRenderer: Texture marked for update but image is incomplete`);else{ue(a,t,i);return}}n.bindTexture(e.TEXTURE_2D,a.__webglTexture,e.TEXTURE0+i)}function ie(t,i){let a=r.get(t);if(t.version>0&&a.__version!==t.version){ue(a,t,i);return}n.bindTexture(e.TEXTURE_2D_ARRAY,a.__webglTexture,e.TEXTURE0+i)}function ae(t,i){let a=r.get(t);if(t.version>0&&a.__version!==t.version){ue(a,t,i);return}n.bindTexture(e.TEXTURE_3D,a.__webglTexture,e.TEXTURE0+i)}function F(t,i){let a=r.get(t);if(t.version>0&&a.__version!==t.version){de(a,t,i);return}n.bindTexture(e.TEXTURE_CUBE_MAP,a.__webglTexture,e.TEXTURE0+i)}let I={[a]:e.REPEAT,[o]:e.CLAMP_TO_EDGE,[s]:e.MIRRORED_REPEAT},oe={[c]:e.NEAREST,[l]:e.NEAREST_MIPMAP_NEAREST,[u]:e.NEAREST_MIPMAP_LINEAR,[d]:e.LINEAR,[f]:e.LINEAR_MIPMAP_NEAREST,[p]:e.LINEAR_MIPMAP_LINEAR},se={512:e.NEVER,519:e.ALWAYS,513:e.LESS,515:e.LEQUAL,514:e.EQUAL,518:e.GEQUAL,516:e.GREATER,517:e.NOTEQUAL};function ce(n,a){if(a.type===1015&&t.has(`OES_texture_float_linear`)===!1&&(a.magFilter===1006||a.magFilter===1007||a.magFilter===1005||a.magFilter===1008||a.minFilter===1006||a.minFilter===1007||a.minFilter===1005||a.minFilter===1008)&&console.warn(`THREE.WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device.`),e.texParameteri(n,e.TEXTURE_WRAP_S,I[a.wrapS]),e.texParameteri(n,e.TEXTURE_WRAP_T,I[a.wrapT]),(n===e.TEXTURE_3D||n===e.TEXTURE_2D_ARRAY)&&e.texParameteri(n,e.TEXTURE_WRAP_R,I[a.wrapR]),e.texParameteri(n,e.TEXTURE_MAG_FILTER,oe[a.magFilter]),e.texParameteri(n,e.TEXTURE_MIN_FILTER,oe[a.minFilter]),a.compareFunction&&(e.texParameteri(n,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(n,e.TEXTURE_COMPARE_FUNC,se[a.compareFunction])),t.has(`EXT_texture_filter_anisotropic`)===!0){if(a.magFilter===1003||a.minFilter!==1005&&a.minFilter!==1008||a.type===1015&&t.has(`OES_texture_float_linear`)===!1)return;if(a.anisotropy>1||r.get(a).__currentAnisotropy){let o=t.get(`EXT_texture_filter_anisotropic`);e.texParameterf(n,o.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(a.anisotropy,i.getMaxAnisotropy())),r.get(a).__currentAnisotropy=a.anisotropy}}}function le(t,n){let r=!1;t.__webglInit===void 0&&(t.__webglInit=!0,n.addEventListener(`dispose`,k));let i=n.source,a=x.get(i);a===void 0&&(a={},x.set(i,a));let o=ne(n);if(o!==t.__cacheKey){a[o]===void 0&&(a[o]={texture:e.createTexture(),usedTimes:0},h.memory.textures++,r=!0),a[o].usedTimes++;let i=a[t.__cacheKey];i!==void 0&&(a[t.__cacheKey].usedTimes--,i.usedTimes===0&&ee(n)),t.__cacheKey=o,t.__webglTexture=a[o].texture}return r}function ue(t,a,o){let s=e.TEXTURE_2D;(a.isDataArrayTexture||a.isCompressedArrayTexture)&&(s=e.TEXTURE_2D_ARRAY),a.isData3DTexture&&(s=e.TEXTURE_3D);let c=le(t,a),l=a.source;n.bindTexture(s,t.__webglTexture,e.TEXTURE0+o);let u=r.get(l);if(l.version!==u.__version||c===!0){n.activeTexture(e.TEXTURE0+o);let t=it.getPrimaries(it.workingColorSpace),r=a.colorSpace===``?null:it.getPrimaries(a.colorSpace),d=a.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,a.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,a.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,a.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,d);let f=w(a.image,!1,i.maxTextureSize);f=be(a,f);let p=m.convert(a.format,a.colorSpace),h=m.convert(a.type),g=D(a.internalFormat,p,h,a.colorSpace,a.isVideoTexture);ce(s,a);let _,v=a.mipmaps,y=a.isVideoTexture!==!0&&g!==36196,b=u.__version===void 0||c===!0,x=l.dataReady,S=O(a,f);if(a.isDepthTexture)g=e.DEPTH_COMPONENT16,a.type===1015?g=e.DEPTH_COMPONENT32F:a.type===1014?g=e.DEPTH_COMPONENT24:a.type===1020&&(g=e.DEPTH24_STENCIL8),b&&(y?n.texStorage2D(e.TEXTURE_2D,1,g,f.width,f.height):n.texImage2D(e.TEXTURE_2D,0,g,f.width,f.height,0,p,h,null));else if(a.isDataTexture){if(v.length>0){y&&b&&n.texStorage2D(e.TEXTURE_2D,S,g,v[0].width,v[0].height);for(let t=0,r=v.length;t<r;t++)_=v[t],y?x&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,_.width,_.height,p,h,_.data):n.texImage2D(e.TEXTURE_2D,t,g,_.width,_.height,0,p,h,_.data);a.generateMipmaps=!1}else y?(b&&n.texStorage2D(e.TEXTURE_2D,S,g,f.width,f.height),x&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,f.width,f.height,p,h,f.data)):n.texImage2D(e.TEXTURE_2D,0,g,f.width,f.height,0,p,h,f.data)}else if(a.isCompressedTexture){if(a.isCompressedArrayTexture){y&&b&&n.texStorage3D(e.TEXTURE_2D_ARRAY,S,g,v[0].width,v[0].height,f.depth);for(let t=0,r=v.length;t<r;t++)_=v[t],a.format===1023?y?x&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,t,0,0,0,_.width,_.height,f.depth,p,h,_.data):n.texImage3D(e.TEXTURE_2D_ARRAY,t,g,_.width,_.height,f.depth,0,p,h,_.data):p===null?console.warn(`THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):y?x&&n.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,t,0,0,0,_.width,_.height,f.depth,p,_.data,0,0):n.compressedTexImage3D(e.TEXTURE_2D_ARRAY,t,g,_.width,_.height,f.depth,0,_.data,0,0)}else{y&&b&&n.texStorage2D(e.TEXTURE_2D,S,g,v[0].width,v[0].height);for(let t=0,r=v.length;t<r;t++)_=v[t],a.format===1023?y?x&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,_.width,_.height,p,h,_.data):n.texImage2D(e.TEXTURE_2D,t,g,_.width,_.height,0,p,h,_.data):p===null?console.warn(`THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()`):y?x&&n.compressedTexSubImage2D(e.TEXTURE_2D,t,0,0,_.width,_.height,p,_.data):n.compressedTexImage2D(e.TEXTURE_2D,t,g,_.width,_.height,0,_.data)}}else if(a.isDataArrayTexture)y?(b&&n.texStorage3D(e.TEXTURE_2D_ARRAY,S,g,f.width,f.height,f.depth),x&&n.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,f.width,f.height,f.depth,p,h,f.data)):n.texImage3D(e.TEXTURE_2D_ARRAY,0,g,f.width,f.height,f.depth,0,p,h,f.data);else if(a.isData3DTexture)y?(b&&n.texStorage3D(e.TEXTURE_3D,S,g,f.width,f.height,f.depth),x&&n.texSubImage3D(e.TEXTURE_3D,0,0,0,0,f.width,f.height,f.depth,p,h,f.data)):n.texImage3D(e.TEXTURE_3D,0,g,f.width,f.height,f.depth,0,p,h,f.data);else if(a.isFramebufferTexture){if(b){if(y)n.texStorage2D(e.TEXTURE_2D,S,g,f.width,f.height);else{let t=f.width,r=f.height;for(let i=0;i<S;i++)n.texImage2D(e.TEXTURE_2D,i,g,t,r,0,p,h,null),t>>=1,r>>=1}}}else if(v.length>0){if(y&&b){let t=xe(v[0]);n.texStorage2D(e.TEXTURE_2D,S,g,t.width,t.height)}for(let t=0,r=v.length;t<r;t++)_=v[t],y?x&&n.texSubImage2D(e.TEXTURE_2D,t,0,0,p,h,_):n.texImage2D(e.TEXTURE_2D,t,g,p,h,_);a.generateMipmaps=!1}else if(y){if(b){let t=xe(f);n.texStorage2D(e.TEXTURE_2D,S,g,t.width,t.height)}x&&n.texSubImage2D(e.TEXTURE_2D,0,0,0,p,h,f)}else n.texImage2D(e.TEXTURE_2D,0,g,p,h,f);T(a)&&E(s),u.__version=l.version,a.onUpdate&&a.onUpdate(a)}t.__version=a.version}function de(t,a,o){if(a.image.length!==6)return;let s=le(t,a),c=a.source;n.bindTexture(e.TEXTURE_CUBE_MAP,t.__webglTexture,e.TEXTURE0+o);let l=r.get(c);if(c.version!==l.__version||s===!0){n.activeTexture(e.TEXTURE0+o);let t=it.getPrimaries(it.workingColorSpace),r=a.colorSpace===``?null:it.getPrimaries(a.colorSpace),u=a.colorSpace===``||t===r?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,a.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,a.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,a.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,u);let d=a.isCompressedTexture||a.image[0].isCompressedTexture,f=a.image[0]&&a.image[0].isDataTexture,p=[];for(let e=0;e<6;e++)!d&&!f?p[e]=w(a.image[e],!0,i.maxCubemapSize):p[e]=f?a.image[e].image:a.image[e],p[e]=be(a,p[e]);let h=p[0],g=m.convert(a.format,a.colorSpace),_=m.convert(a.type),v=D(a.internalFormat,g,_,a.colorSpace),y=a.isVideoTexture!==!0,b=l.__version===void 0||s===!0,x=c.dataReady,S=O(a,h);ce(e.TEXTURE_CUBE_MAP,a);let C;if(d){y&&b&&n.texStorage2D(e.TEXTURE_CUBE_MAP,S,v,h.width,h.height);for(let t=0;t<6;t++){C=p[t].mipmaps;for(let r=0;r<C.length;r++){let i=C[r];a.format===1023?y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,g,_,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,v,i.width,i.height,0,g,_,i.data):g===null?console.warn(`THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()`):y?x&&n.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,0,0,i.width,i.height,g,i.data):n.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r,v,i.width,i.height,0,i.data)}}}else{if(C=a.mipmaps,y&&b){C.length>0&&S++;let t=xe(p[0]);n.texStorage2D(e.TEXTURE_CUBE_MAP,S,v,t.width,t.height)}for(let t=0;t<6;t++)if(f){y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,p[t].width,p[t].height,g,_,p[t].data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,v,p[t].width,p[t].height,0,g,_,p[t].data);for(let r=0;r<C.length;r++){let i=C[r].image[t].image;y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,i.width,i.height,g,_,i.data):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,v,i.width,i.height,0,g,_,i.data)}}else{y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,0,0,g,_,p[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,0,v,g,_,p[t]);for(let r=0;r<C.length;r++){let i=C[r];y?x&&n.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,0,0,g,_,i.image[t]):n.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+t,r+1,v,g,_,i.image[t])}}}T(a)&&E(e.TEXTURE_CUBE_MAP),l.__version=c.version,a.onUpdate&&a.onUpdate(a)}t.__version=a.version}function L(t,i,a,o,s,c){let l=m.convert(a.format,a.colorSpace),u=m.convert(a.type),d=D(a.internalFormat,l,u,a.colorSpace);if(!r.get(i).__hasExternalTextures){let t=Math.max(1,i.width>>c),r=Math.max(1,i.height>>c);s===e.TEXTURE_3D||s===e.TEXTURE_2D_ARRAY?n.texImage3D(s,c,d,t,r,i.depth,0,l,u,null):n.texImage2D(s,c,d,t,r,0,l,u,null)}n.bindFramebuffer(e.FRAMEBUFFER,t),ve(i)?g.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,o,s,r.get(a).__webglTexture,0,B(i)):(s===e.TEXTURE_2D||s>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&s<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,o,s,r.get(a).__webglTexture,c),n.bindFramebuffer(e.FRAMEBUFFER,null)}function fe(t,n,r){if(e.bindRenderbuffer(e.RENDERBUFFER,t),n.depthBuffer&&!n.stencilBuffer){let i=e.DEPTH_COMPONENT24;if(r||ve(n)){let t=n.depthTexture;t&&t.isDepthTexture&&(t.type===1015?i=e.DEPTH_COMPONENT32F:t.type===1014&&(i=e.DEPTH_COMPONENT24));let r=B(n);ve(n)?g.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,r,i,n.width,n.height):e.renderbufferStorageMultisample(e.RENDERBUFFER,r,i,n.width,n.height)}else e.renderbufferStorage(e.RENDERBUFFER,i,n.width,n.height);e.framebufferRenderbuffer(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.RENDERBUFFER,t)}else if(n.depthBuffer&&n.stencilBuffer){let i=B(n);r&&ve(n)===!1?e.renderbufferStorageMultisample(e.RENDERBUFFER,i,e.DEPTH24_STENCIL8,n.width,n.height):ve(n)?g.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,i,e.DEPTH24_STENCIL8,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,e.DEPTH_STENCIL,n.width,n.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.RENDERBUFFER,t)}else{let t=n.textures;for(let i=0;i<t.length;i++){let a=t[i],o=m.convert(a.format,a.colorSpace),s=m.convert(a.type),c=D(a.internalFormat,o,s,a.colorSpace),l=B(n);r&&ve(n)===!1?e.renderbufferStorageMultisample(e.RENDERBUFFER,l,c,n.width,n.height):ve(n)?g.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,l,c,n.width,n.height):e.renderbufferStorage(e.RENDERBUFFER,c,n.width,n.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function pe(t,i){if(i&&i.isWebGLCubeRenderTarget)throw Error(`Depth Texture with cube render targets is not supported`);if(n.bindFramebuffer(e.FRAMEBUFFER,t),!(i.depthTexture&&i.depthTexture.isDepthTexture))throw Error(`renderTarget.depthTexture must be an instance of THREE.DepthTexture`);(!r.get(i.depthTexture).__webglTexture||i.depthTexture.image.width!==i.width||i.depthTexture.image.height!==i.height)&&(i.depthTexture.image.width=i.width,i.depthTexture.image.height=i.height,i.depthTexture.needsUpdate=!0),re(i.depthTexture,0);let a=r.get(i.depthTexture).__webglTexture,o=B(i);if(i.depthTexture.format===1026)ve(i)?g.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,a,0,o):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_ATTACHMENT,e.TEXTURE_2D,a,0);else if(i.depthTexture.format===1027)ve(i)?g.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,a,0,o):e.framebufferTexture2D(e.FRAMEBUFFER,e.DEPTH_STENCIL_ATTACHMENT,e.TEXTURE_2D,a,0);else throw Error(`Unknown depthTexture format`)}function me(t){let i=r.get(t),a=t.isWebGLCubeRenderTarget===!0;if(t.depthTexture&&!i.__autoAllocateDepthBuffer){if(a)throw Error(`target.depthTexture not supported in Cube render targets`);pe(i.__webglFramebuffer,t)}else if(a){i.__webglDepthbuffer=[];for(let r=0;r<6;r++)n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer[r]),i.__webglDepthbuffer[r]=e.createRenderbuffer(),fe(i.__webglDepthbuffer[r],t,!1)}else n.bindFramebuffer(e.FRAMEBUFFER,i.__webglFramebuffer),i.__webglDepthbuffer=e.createRenderbuffer(),fe(i.__webglDepthbuffer,t,!1);n.bindFramebuffer(e.FRAMEBUFFER,null)}function he(t,n,i){let a=r.get(t);n!==void 0&&L(a.__webglFramebuffer,t,t.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),i!==void 0&&me(t)}function ge(t){let i=t.texture,a=r.get(t),o=r.get(i);t.addEventListener(`dispose`,A);let s=t.textures,c=t.isWebGLCubeRenderTarget===!0,l=s.length>1;if(l||(o.__webglTexture===void 0&&(o.__webglTexture=e.createTexture()),o.__version=i.version,h.memory.textures++),c){a.__webglFramebuffer=[];for(let t=0;t<6;t++)if(i.mipmaps&&i.mipmaps.length>0){a.__webglFramebuffer[t]=[];for(let n=0;n<i.mipmaps.length;n++)a.__webglFramebuffer[t][n]=e.createFramebuffer()}else a.__webglFramebuffer[t]=e.createFramebuffer()}else{if(i.mipmaps&&i.mipmaps.length>0){a.__webglFramebuffer=[];for(let t=0;t<i.mipmaps.length;t++)a.__webglFramebuffer[t]=e.createFramebuffer()}else a.__webglFramebuffer=e.createFramebuffer();if(l)for(let t=0,n=s.length;t<n;t++){let n=r.get(s[t]);n.__webglTexture===void 0&&(n.__webglTexture=e.createTexture(),h.memory.textures++)}if(t.samples>0&&ve(t)===!1){a.__webglMultisampledFramebuffer=e.createFramebuffer(),a.__webglColorRenderbuffer=[],n.bindFramebuffer(e.FRAMEBUFFER,a.__webglMultisampledFramebuffer);for(let n=0;n<s.length;n++){let r=s[n];a.__webglColorRenderbuffer[n]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,a.__webglColorRenderbuffer[n]);let i=m.convert(r.format,r.colorSpace),o=m.convert(r.type),c=D(r.internalFormat,i,o,r.colorSpace,t.isXRRenderTarget===!0),l=B(t);e.renderbufferStorageMultisample(e.RENDERBUFFER,l,c,t.width,t.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+n,e.RENDERBUFFER,a.__webglColorRenderbuffer[n])}e.bindRenderbuffer(e.RENDERBUFFER,null),t.depthBuffer&&(a.__webglDepthRenderbuffer=e.createRenderbuffer(),fe(a.__webglDepthRenderbuffer,t,!0)),n.bindFramebuffer(e.FRAMEBUFFER,null)}}if(c){n.bindTexture(e.TEXTURE_CUBE_MAP,o.__webglTexture),ce(e.TEXTURE_CUBE_MAP,i);for(let n=0;n<6;n++)if(i.mipmaps&&i.mipmaps.length>0)for(let r=0;r<i.mipmaps.length;r++)L(a.__webglFramebuffer[n][r],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,r);else L(a.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+n,0);T(i)&&E(e.TEXTURE_CUBE_MAP),n.unbindTexture()}else if(l){for(let i=0,o=s.length;i<o;i++){let o=s[i],c=r.get(o);n.bindTexture(e.TEXTURE_2D,c.__webglTexture),ce(e.TEXTURE_2D,o),L(a.__webglFramebuffer,t,o,e.COLOR_ATTACHMENT0+i,e.TEXTURE_2D,0),T(o)&&E(e.TEXTURE_2D)}n.unbindTexture()}else{let r=e.TEXTURE_2D;if((t.isWebGL3DRenderTarget||t.isWebGLArrayRenderTarget)&&(r=t.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),n.bindTexture(r,o.__webglTexture),ce(r,i),i.mipmaps&&i.mipmaps.length>0)for(let n=0;n<i.mipmaps.length;n++)L(a.__webglFramebuffer[n],t,i,e.COLOR_ATTACHMENT0,r,n);else L(a.__webglFramebuffer,t,i,e.COLOR_ATTACHMENT0,r,0);T(i)&&E(r),n.unbindTexture()}t.depthBuffer&&me(t)}function _e(t){let i=t.textures;for(let a=0,o=i.length;a<o;a++){let o=i[a];if(T(o)){let i=t.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:e.TEXTURE_2D,a=r.get(o).__webglTexture;n.bindTexture(i,a),E(i),n.unbindTexture()}}}function z(t){if(t.samples>0&&ve(t)===!1){let i=t.textures,a=t.width,o=t.height,s=e.COLOR_BUFFER_BIT,c=[],l=t.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,u=r.get(t),d=i.length>1;if(d)for(let t=0;t<i.length;t++)n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,null),n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,null,0);n.bindFramebuffer(e.READ_FRAMEBUFFER,u.__webglMultisampledFramebuffer),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglFramebuffer);for(let n=0;n<i.length;n++){c.push(e.COLOR_ATTACHMENT0+n),t.depthBuffer&&c.push(l);let f=u.__ignoreDepthValues!==void 0&&u.__ignoreDepthValues;if(f===!1&&(t.depthBuffer&&(s|=e.DEPTH_BUFFER_BIT),t.stencilBuffer&&u.__isTransmissionRenderTarget!==!0&&(s|=e.STENCIL_BUFFER_BIT)),d&&e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,u.__webglColorRenderbuffer[n]),f===!0&&(e.invalidateFramebuffer(e.READ_FRAMEBUFFER,[l]),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[l])),d){let t=r.get(i[n]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,t,0)}e.blitFramebuffer(0,0,a,o,0,0,a,o,s,e.NEAREST),_&&e.invalidateFramebuffer(e.READ_FRAMEBUFFER,c)}if(n.bindFramebuffer(e.READ_FRAMEBUFFER,null),n.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),d)for(let t=0;t<i.length;t++){n.bindFramebuffer(e.FRAMEBUFFER,u.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.RENDERBUFFER,u.__webglColorRenderbuffer[t]);let a=r.get(i[t]).__webglTexture;n.bindFramebuffer(e.FRAMEBUFFER,u.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+t,e.TEXTURE_2D,a,0)}n.bindFramebuffer(e.DRAW_FRAMEBUFFER,u.__webglMultisampledFramebuffer)}}function B(e){return Math.min(i.maxSamples,e.samples)}function ve(e){let n=r.get(e);return e.samples>0&&t.has(`WEBGL_multisampled_render_to_texture`)===!0&&n.__useRenderToTexture!==!1}function ye(e){let t=h.render.frame;y.get(e)!==t&&(y.set(e,t),e.update())}function be(e,t){let n=e.colorSpace,r=e.format,i=e.type;return e.isCompressedTexture===!0||e.isVideoTexture===!0||n!==`srgb-linear`&&n!==``&&(it.getTransfer(n)===`srgb`?(r!==1023||i!==1009)&&console.warn(`THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType.`):console.error(`THREE.WebGLTextures: Unsupported texture color space:`,n)),t}function xe(e){return typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement?(v.width=e.naturalWidth||e.width,v.height=e.naturalHeight||e.height):typeof VideoFrame<`u`&&e instanceof VideoFrame?(v.width=e.displayWidth,v.height=e.displayHeight):(v.width=e.width,v.height=e.height),v}this.allocateTextureUnit=te,this.resetTextureUnits=P,this.setTexture2D=re,this.setTexture2DArray=ie,this.setTexture3D=ae,this.setTextureCube=F,this.rebindTextures=he,this.setupRenderTarget=ge,this.updateRenderTargetMipmap=_e,this.updateMultisampleRenderTarget=z,this.setupDepthRenderbuffer=me,this.setupFrameBufferTexture=L,this.useMultisampledRTT=ve}function Ko(e,t){function n(n,r=``){let i,a=it.getTransfer(r);if(n===1009)return e.UNSIGNED_BYTE;if(n===1017)return e.UNSIGNED_SHORT_4_4_4_4;if(n===1018)return e.UNSIGNED_SHORT_5_5_5_1;if(n===35902)return e.UNSIGNED_INT_5_9_9_9_REV;if(n===1010)return e.BYTE;if(n===1011)return e.SHORT;if(n===1012)return e.UNSIGNED_SHORT;if(n===1013)return e.INT;if(n===1014)return e.UNSIGNED_INT;if(n===1015)return e.FLOAT;if(n===1016)return e.HALF_FLOAT;if(n===1021)return e.ALPHA;if(n===1022)return e.RGB;if(n===1023)return e.RGBA;if(n===1024)return e.LUMINANCE;if(n===1025)return e.LUMINANCE_ALPHA;if(n===1026)return e.DEPTH_COMPONENT;if(n===1027)return e.DEPTH_STENCIL;if(n===1028)return e.RED;if(n===1029)return e.RED_INTEGER;if(n===1030)return e.RG;if(n===1031)return e.RG_INTEGER;if(n===1033)return e.RGBA_INTEGER;if(n===33776||n===33777||n===33778||n===33779){if(a===`srgb`){if(i=t.get(`WEBGL_compressed_texture_s3tc_srgb`),i!==null){if(n===33776)return i.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null}else if(i=t.get(`WEBGL_compressed_texture_s3tc`),i!==null){if(n===33776)return i.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===33777)return i.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===33778)return i.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===33779)return i.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null}if(n===35840||n===35841||n===35842||n===35843){if(i=t.get(`WEBGL_compressed_texture_pvrtc`),i!==null){if(n===35840)return i.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===35841)return i.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===35842)return i.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===35843)return i.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null}if(n===36196)return i=t.get(`WEBGL_compressed_texture_etc1`),i===null?null:i.COMPRESSED_RGB_ETC1_WEBGL;if(n===37492||n===37496){if(i=t.get(`WEBGL_compressed_texture_etc`),i!==null){if(n===37492)return a===`srgb`?i.COMPRESSED_SRGB8_ETC2:i.COMPRESSED_RGB8_ETC2;if(n===37496)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:i.COMPRESSED_RGBA8_ETC2_EAC}else return null}if(n===37808||n===37809||n===37810||n===37811||n===37812||n===37813||n===37814||n===37815||n===37816||n===37817||n===37818||n===37819||n===37820||n===37821){if(i=t.get(`WEBGL_compressed_texture_astc`),i!==null){if(n===37808)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:i.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===37809)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:i.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===37810)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:i.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===37811)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:i.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===37812)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:i.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===37813)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:i.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===37814)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:i.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===37815)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:i.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===37816)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:i.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===37817)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:i.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===37818)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:i.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===37819)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:i.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===37820)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:i.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===37821)return a===`srgb`?i.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:i.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null}if(n===36492||n===36494||n===36495){if(i=t.get(`EXT_texture_compression_bptc`),i!==null){if(n===36492)return a===`srgb`?i.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:i.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===36494)return i.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===36495)return i.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null}if(n===36283||n===36284||n===36285||n===36286){if(i=t.get(`EXT_texture_compression_rgtc`),i!==null){if(n===36492)return i.COMPRESSED_RED_RGTC1_EXT;if(n===36284)return i.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===36285)return i.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===36286)return i.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null}return n===1020?e.UNSIGNED_INT_24_8:e[n]===void 0?null:e[n]}return{convert:n}}var qo=class extends Br{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}},Jo=class extends Sn{constructor(){super(),this.isGroup=!0,this.type=`Group`}},Yo={type:`move`},Xo=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Jo,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Jo,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new U,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new U),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Jo,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new U,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new U),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:`connected`,data:e}),this}disconnect(e){return this.dispatchEvent({type:`disconnected`,data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let r=null,i=null,a=null,o=this._targetRay,s=this._grip,c=this._hand;if(e&&t.session.visibilityState!==`visible-blurred`){if(c&&e.hand){a=!0;for(let r of e.hand.values()){let e=t.getJointPose(r,n),i=this._getHandJoint(c,r);e!==null&&(i.matrix.fromArray(e.transform.matrix),i.matrix.decompose(i.position,i.rotation,i.scale),i.matrixWorldNeedsUpdate=!0,i.jointRadius=e.radius),i.visible=e!==null}let r=c.joints[`index-finger-tip`],i=c.joints[`thumb-tip`],o=r.position.distanceTo(i.position);c.inputState.pinching&&o>.025?(c.inputState.pinching=!1,this.dispatchEvent({type:`pinchend`,handedness:e.handedness,target:this})):!c.inputState.pinching&&o<=.015&&(c.inputState.pinching=!0,this.dispatchEvent({type:`pinchstart`,handedness:e.handedness,target:this}))}else s!==null&&e.gripSpace&&(i=t.getPose(e.gripSpace,n),i!==null&&(s.matrix.fromArray(i.transform.matrix),s.matrix.decompose(s.position,s.rotation,s.scale),s.matrixWorldNeedsUpdate=!0,i.linearVelocity?(s.hasLinearVelocity=!0,s.linearVelocity.copy(i.linearVelocity)):s.hasLinearVelocity=!1,i.angularVelocity?(s.hasAngularVelocity=!0,s.angularVelocity.copy(i.angularVelocity)):s.hasAngularVelocity=!1));o!==null&&(r=t.getPose(e.targetRaySpace,n),r===null&&i!==null&&(r=i),r!==null&&(o.matrix.fromArray(r.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,r.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(r.linearVelocity)):o.hasLinearVelocity=!1,r.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(r.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Yo)))}return o!==null&&(o.visible=r!==null),s!==null&&(s.visible=i!==null),c!==null&&(c.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new Jo;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},Zo=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Qo=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,$o=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t,n){if(this.texture===null){let r=new pt,i=e.properties.get(r);i.__webglTexture=t.texture,(t.depthNear!=n.depthNear||t.depthFar!=n.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=r}}render(e,t){if(this.texture!==null){if(this.mesh===null){let e=t.cameras[0].viewport,n=new Fr({vertexShader:Zo,fragmentShader:Qo,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new wr(new ti(20,20),n)}e.render(this.mesh,t)}}reset(){this.texture=null,this.mesh=null}},es=class extends be{constructor(e,t){super();let n=this,r=null,i=1,a=null,o=`local-floor`,s=1,c=null,l=null,u=null,d=null,f=null,p=null,m=new $o,g=t.getContextAttributes(),_=null,v=null,b=[],x=[],E=new V,D=null,O=new Br;O.layers.enable(1),O.viewport=new mt;let k=new Br;k.layers.enable(2),k.viewport=new mt;let A=[O,k],j=new qo;j.layers.enable(1),j.layers.enable(2);let ee=null,M=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(e){let t=b[e];return t===void 0&&(t=new Xo,b[e]=t),t.getTargetRaySpace()},this.getControllerGrip=function(e){let t=b[e];return t===void 0&&(t=new Xo,b[e]=t),t.getGripSpace()},this.getHand=function(e){let t=b[e];return t===void 0&&(t=new Xo,b[e]=t),t.getHandSpace()};function N(e){let t=x.indexOf(e.inputSource);if(t===-1)return;let n=b[t];n!==void 0&&(n.update(e.inputSource,e.frame,c||a),n.dispatchEvent({type:e.type,data:e.inputSource}))}function P(){r.removeEventListener(`select`,N),r.removeEventListener(`selectstart`,N),r.removeEventListener(`selectend`,N),r.removeEventListener(`squeeze`,N),r.removeEventListener(`squeezestart`,N),r.removeEventListener(`squeezeend`,N),r.removeEventListener(`end`,P),r.removeEventListener(`inputsourceschange`,te);for(let e=0;e<b.length;e++){let t=x[e];t!==null&&(x[e]=null,b[e].disconnect(t))}ee=null,M=null,m.reset(),e.setRenderTarget(_),f=null,d=null,u=null,r=null,v=null,se.stop(),n.isPresenting=!1,e.setPixelRatio(D),e.setSize(E.width,E.height,!1),n.dispatchEvent({type:`sessionend`})}this.setFramebufferScaleFactor=function(e){i=e,n.isPresenting===!0&&console.warn(`THREE.WebXRManager: Cannot change framebuffer scale while presenting.`)},this.setReferenceSpaceType=function(e){o=e,n.isPresenting===!0&&console.warn(`THREE.WebXRManager: Cannot change reference space type while presenting.`)},this.getReferenceSpace=function(){return c||a},this.setReferenceSpace=function(e){c=e},this.getBaseLayer=function(){return d===null?f:d},this.getBinding=function(){return u},this.getFrame=function(){return p},this.getSession=function(){return r},this.setSession=async function(l){if(r=l,r!==null){if(_=e.getRenderTarget(),r.addEventListener(`select`,N),r.addEventListener(`selectstart`,N),r.addEventListener(`selectend`,N),r.addEventListener(`squeeze`,N),r.addEventListener(`squeezestart`,N),r.addEventListener(`squeezeend`,N),r.addEventListener(`end`,P),r.addEventListener(`inputsourceschange`,te),g.xrCompatible!==!0&&await t.makeXRCompatible(),D=e.getPixelRatio(),e.getSize(E),r.renderState.layers===void 0){let n={antialias:g.antialias,alpha:!0,depth:g.depth,stencil:g.stencil,framebufferScaleFactor:i};f=new XRWebGLLayer(r,t,n),r.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),v=new gt(f.framebufferWidth,f.framebufferHeight,{format:C,type:h,colorSpace:e.outputColorSpace,stencilBuffer:g.stencil})}else{let n=null,a=null,o=null;g.depth&&(o=g.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,n=g.stencil?T:w,a=g.stencil?S:y);let s={colorFormat:t.RGBA8,depthFormat:o,scaleFactor:i};u=new XRWebGLBinding(r,t),d=u.createProjectionLayer(s),r.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),v=new gt(d.textureWidth,d.textureHeight,{format:C,type:h,depthTexture:new Bi(d.textureWidth,d.textureHeight,a,void 0,void 0,void 0,void 0,void 0,void 0,n),stencilBuffer:g.stencil,colorSpace:e.outputColorSpace,samples:g.antialias?4:0});let c=e.properties.get(v);c.__ignoreDepthValues=d.ignoreDepthValues}v.isXRRenderTarget=!0,this.setFoveation(s),c=null,a=await r.requestReferenceSpace(o),se.setContext(r),se.start(),n.isPresenting=!0,n.dispatchEvent({type:`sessionstart`})}},this.getEnvironmentBlendMode=function(){if(r!==null)return r.environmentBlendMode};function te(e){for(let t=0;t<e.removed.length;t++){let n=e.removed[t],r=x.indexOf(n);r>=0&&(x[r]=null,b[r].disconnect(n))}for(let t=0;t<e.added.length;t++){let n=e.added[t],r=x.indexOf(n);if(r===-1){for(let e=0;e<b.length;e++)if(e>=x.length){x.push(n),r=e;break}else if(x[e]===null){x[e]=n,r=e;break}if(r===-1)break}let i=b[r];i&&i.connect(n)}}let ne=new U,re=new U;function ie(e,t,n){ne.setFromMatrixPosition(t.matrixWorld),re.setFromMatrixPosition(n.matrixWorld);let r=ne.distanceTo(re),i=t.projectionMatrix.elements,a=n.projectionMatrix.elements,o=i[14]/(i[10]-1),s=i[14]/(i[10]+1),c=(i[9]+1)/i[5],l=(i[9]-1)/i[5],u=(i[8]-1)/i[0],d=(a[8]+1)/a[0],f=o*u,p=o*d,m=r/(-u+d),h=m*-u;t.matrixWorld.decompose(e.position,e.quaternion,e.scale),e.translateX(h),e.translateZ(m),e.matrixWorld.compose(e.position,e.quaternion,e.scale),e.matrixWorldInverse.copy(e.matrixWorld).invert();let g=o+m,_=s+m,v=f-h,y=p+(r-h),b=c*s/_*g,x=l*s/_*g;e.projectionMatrix.makePerspective(v,y,b,x,g,_),e.projectionMatrixInverse.copy(e.projectionMatrix).invert()}function ae(e,t){t===null?e.matrixWorld.copy(e.matrix):e.matrixWorld.multiplyMatrices(t.matrixWorld,e.matrix),e.matrixWorldInverse.copy(e.matrixWorld).invert()}this.updateCamera=function(e){if(r===null)return;m.texture!==null&&(e.near=m.depthNear,e.far=m.depthFar),j.near=k.near=O.near=e.near,j.far=k.far=O.far=e.far,(ee!==j.near||M!==j.far)&&(r.updateRenderState({depthNear:j.near,depthFar:j.far}),ee=j.near,M=j.far,O.near=ee,O.far=M,k.near=ee,k.far=M,O.updateProjectionMatrix(),k.updateProjectionMatrix(),e.updateProjectionMatrix());let t=e.parent,n=j.cameras;ae(j,t);for(let e=0;e<n.length;e++)ae(n[e],t);n.length===2?ie(j,O,k):j.projectionMatrix.copy(O.projectionMatrix),F(e,j,t)};function F(e,t,n){n===null?e.matrix.copy(t.matrixWorld):(e.matrix.copy(n.matrixWorld),e.matrix.invert(),e.matrix.multiply(t.matrixWorld)),e.matrix.decompose(e.position,e.quaternion,e.scale),e.updateMatrixWorld(!0),e.projectionMatrix.copy(t.projectionMatrix),e.projectionMatrixInverse.copy(t.projectionMatrixInverse),e.isPerspectiveCamera&&(e.fov=we*2*Math.atan(1/e.projectionMatrix.elements[5]),e.zoom=1)}this.getCamera=function(){return j},this.getFoveation=function(){if(d!==null||f!==null)return s},this.setFoveation=function(e){s=e,d!==null&&(d.fixedFoveation=e),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=e)},this.hasDepthSensing=function(){return m.texture!==null};let I=null;function oe(t,i){if(l=i.getViewerPose(c||a),p=i,l!==null){let t=l.views;f!==null&&(e.setRenderTargetFramebuffer(v,f.framebuffer),e.setRenderTarget(v));let n=!1;t.length!==j.cameras.length&&(j.cameras.length=0,n=!0);for(let r=0;r<t.length;r++){let i=t[r],a=null;if(f!==null)a=f.getViewport(i);else{let t=u.getViewSubImage(d,i);a=t.viewport,r===0&&(e.setRenderTargetTextures(v,t.colorTexture,d.ignoreDepthValues?void 0:t.depthStencilTexture),e.setRenderTarget(v))}let o=A[r];o===void 0&&(o=new Br,o.layers.enable(r),o.viewport=new mt,A[r]=o),o.matrix.fromArray(i.transform.matrix),o.matrix.decompose(o.position,o.quaternion,o.scale),o.projectionMatrix.fromArray(i.projectionMatrix),o.projectionMatrixInverse.copy(o.projectionMatrix).invert(),o.viewport.set(a.x,a.y,a.width,a.height),r===0&&(j.matrix.copy(o.matrix),j.matrix.decompose(j.position,j.quaternion,j.scale)),n===!0&&j.cameras.push(o)}let i=r.enabledFeatures;if(i&&i.includes(`depth-sensing`)){let n=u.getDepthInformation(t[0]);n&&n.isValid&&n.texture&&m.init(e,n,r.renderState)}}for(let e=0;e<b.length;e++){let t=x[e],n=b[e];t!==null&&n!==void 0&&n.update(t,i,c||a)}m.render(e,j),I&&I(t,i),i.detectedPlanes&&n.dispatchEvent({type:`planesdetected`,data:i}),p=null}let se=new $r;se.setAnimationLoop(oe),this.setAnimationLoop=function(e){I=e},this.dispose=function(){}}},ts=new an,ns=new W;function rs(e,t){function n(e,t){e.matrixAutoUpdate===!0&&e.updateMatrix(),t.value.copy(e.matrix)}function r(t,n){n.color.getRGB(t.fogColor.value,jr(e)),n.isFog?(t.fogNear.value=n.near,t.fogFar.value=n.far):n.isFogExp2&&(t.fogDensity.value=n.density)}function i(e,t,n,r,i){t.isMeshBasicMaterial||t.isMeshLambertMaterial?a(e,t):t.isMeshToonMaterial?(a(e,t),d(e,t)):t.isMeshPhongMaterial?(a(e,t),u(e,t)):t.isMeshStandardMaterial?(a(e,t),f(e,t),t.isMeshPhysicalMaterial&&p(e,t,i)):t.isMeshMatcapMaterial?(a(e,t),m(e,t)):t.isMeshDepthMaterial?a(e,t):t.isMeshDistanceMaterial?(a(e,t),h(e,t)):t.isMeshNormalMaterial?a(e,t):t.isLineBasicMaterial?(o(e,t),t.isLineDashedMaterial&&s(e,t)):t.isPointsMaterial?c(e,t,n,r):t.isSpriteMaterial?l(e,t):t.isShadowMaterial?(e.color.value.copy(t.color),e.opacity.value=t.opacity):t.isShaderMaterial&&(t.uniformsNeedUpdate=!1)}function a(r,i){r.opacity.value=i.opacity,i.color&&r.diffuse.value.copy(i.color),i.emissive&&r.emissive.value.copy(i.emissive).multiplyScalar(i.emissiveIntensity),i.map&&(r.map.value=i.map,n(i.map,r.mapTransform)),i.alphaMap&&(r.alphaMap.value=i.alphaMap,n(i.alphaMap,r.alphaMapTransform)),i.bumpMap&&(r.bumpMap.value=i.bumpMap,n(i.bumpMap,r.bumpMapTransform),r.bumpScale.value=i.bumpScale,i.side===1&&(r.bumpScale.value*=-1)),i.normalMap&&(r.normalMap.value=i.normalMap,n(i.normalMap,r.normalMapTransform),r.normalScale.value.copy(i.normalScale),i.side===1&&r.normalScale.value.negate()),i.displacementMap&&(r.displacementMap.value=i.displacementMap,n(i.displacementMap,r.displacementMapTransform),r.displacementScale.value=i.displacementScale,r.displacementBias.value=i.displacementBias),i.emissiveMap&&(r.emissiveMap.value=i.emissiveMap,n(i.emissiveMap,r.emissiveMapTransform)),i.specularMap&&(r.specularMap.value=i.specularMap,n(i.specularMap,r.specularMapTransform)),i.alphaTest>0&&(r.alphaTest.value=i.alphaTest);let a=t.get(i),o=a.envMap,s=a.envMapRotation;if(o&&(r.envMap.value=o,ts.copy(s),ts.x*=-1,ts.y*=-1,ts.z*=-1,o.isCubeTexture&&o.isRenderTargetTexture===!1&&(ts.y*=-1,ts.z*=-1),r.envMapRotation.value.setFromMatrix4(ns.makeRotationFromEuler(ts)),r.flipEnvMap.value=o.isCubeTexture&&o.isRenderTargetTexture===!1?-1:1,r.reflectivity.value=i.reflectivity,r.ior.value=i.ior,r.refractionRatio.value=i.refractionRatio),i.lightMap){r.lightMap.value=i.lightMap;let t=e._useLegacyLights===!0?Math.PI:1;r.lightMapIntensity.value=i.lightMapIntensity*t,n(i.lightMap,r.lightMapTransform)}i.aoMap&&(r.aoMap.value=i.aoMap,r.aoMapIntensity.value=i.aoMapIntensity,n(i.aoMap,r.aoMapTransform))}function o(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform))}function s(e,t){e.dashSize.value=t.dashSize,e.totalSize.value=t.dashSize+t.gapSize,e.scale.value=t.scale}function c(e,t,r,i){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.size.value=t.size*r,e.scale.value=i*.5,t.map&&(e.map.value=t.map,n(t.map,e.uvTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function l(e,t){e.diffuse.value.copy(t.color),e.opacity.value=t.opacity,e.rotation.value=t.rotation,t.map&&(e.map.value=t.map,n(t.map,e.mapTransform)),t.alphaMap&&(e.alphaMap.value=t.alphaMap,n(t.alphaMap,e.alphaMapTransform)),t.alphaTest>0&&(e.alphaTest.value=t.alphaTest)}function u(e,t){e.specular.value.copy(t.specular),e.shininess.value=Math.max(t.shininess,1e-4)}function d(e,t){t.gradientMap&&(e.gradientMap.value=t.gradientMap)}function f(e,t){e.metalness.value=t.metalness,t.metalnessMap&&(e.metalnessMap.value=t.metalnessMap,n(t.metalnessMap,e.metalnessMapTransform)),e.roughness.value=t.roughness,t.roughnessMap&&(e.roughnessMap.value=t.roughnessMap,n(t.roughnessMap,e.roughnessMapTransform)),t.envMap&&(e.envMapIntensity.value=t.envMapIntensity)}function p(e,t,r){e.ior.value=t.ior,t.sheen>0&&(e.sheenColor.value.copy(t.sheenColor).multiplyScalar(t.sheen),e.sheenRoughness.value=t.sheenRoughness,t.sheenColorMap&&(e.sheenColorMap.value=t.sheenColorMap,n(t.sheenColorMap,e.sheenColorMapTransform)),t.sheenRoughnessMap&&(e.sheenRoughnessMap.value=t.sheenRoughnessMap,n(t.sheenRoughnessMap,e.sheenRoughnessMapTransform))),t.clearcoat>0&&(e.clearcoat.value=t.clearcoat,e.clearcoatRoughness.value=t.clearcoatRoughness,t.clearcoatMap&&(e.clearcoatMap.value=t.clearcoatMap,n(t.clearcoatMap,e.clearcoatMapTransform)),t.clearcoatRoughnessMap&&(e.clearcoatRoughnessMap.value=t.clearcoatRoughnessMap,n(t.clearcoatRoughnessMap,e.clearcoatRoughnessMapTransform)),t.clearcoatNormalMap&&(e.clearcoatNormalMap.value=t.clearcoatNormalMap,n(t.clearcoatNormalMap,e.clearcoatNormalMapTransform),e.clearcoatNormalScale.value.copy(t.clearcoatNormalScale),t.side===1&&e.clearcoatNormalScale.value.negate())),t.iridescence>0&&(e.iridescence.value=t.iridescence,e.iridescenceIOR.value=t.iridescenceIOR,e.iridescenceThicknessMinimum.value=t.iridescenceThicknessRange[0],e.iridescenceThicknessMaximum.value=t.iridescenceThicknessRange[1],t.iridescenceMap&&(e.iridescenceMap.value=t.iridescenceMap,n(t.iridescenceMap,e.iridescenceMapTransform)),t.iridescenceThicknessMap&&(e.iridescenceThicknessMap.value=t.iridescenceThicknessMap,n(t.iridescenceThicknessMap,e.iridescenceThicknessMapTransform))),t.transmission>0&&(e.transmission.value=t.transmission,e.transmissionSamplerMap.value=r.texture,e.transmissionSamplerSize.value.set(r.width,r.height),t.transmissionMap&&(e.transmissionMap.value=t.transmissionMap,n(t.transmissionMap,e.transmissionMapTransform)),e.thickness.value=t.thickness,t.thicknessMap&&(e.thicknessMap.value=t.thicknessMap,n(t.thicknessMap,e.thicknessMapTransform)),e.attenuationDistance.value=t.attenuationDistance,e.attenuationColor.value.copy(t.attenuationColor)),t.anisotropy>0&&(e.anisotropyVector.value.set(t.anisotropy*Math.cos(t.anisotropyRotation),t.anisotropy*Math.sin(t.anisotropyRotation)),t.anisotropyMap&&(e.anisotropyMap.value=t.anisotropyMap,n(t.anisotropyMap,e.anisotropyMapTransform))),e.specularIntensity.value=t.specularIntensity,e.specularColor.value.copy(t.specularColor),t.specularColorMap&&(e.specularColorMap.value=t.specularColorMap,n(t.specularColorMap,e.specularColorMapTransform)),t.specularIntensityMap&&(e.specularIntensityMap.value=t.specularIntensityMap,n(t.specularIntensityMap,e.specularIntensityMapTransform))}function m(e,t){t.matcap&&(e.matcap.value=t.matcap)}function h(e,n){let r=t.get(n).light;e.referencePosition.value.setFromMatrixPosition(r.matrixWorld),e.nearDistance.value=r.shadow.camera.near,e.farDistance.value=r.shadow.camera.far}return{refreshFogUniforms:r,refreshMaterialUniforms:i}}function is(e,t,n,r){let i={},a={},o=[],s=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function c(e,t){let n=t.program;r.uniformBlockBinding(e,n)}function l(e,n){let o=i[e.id];o===void 0&&(m(e),o=u(e),i[e.id]=o,e.addEventListener(`dispose`,g));let s=n.program;r.updateUBOMapping(e,s);let c=t.render.frame;a[e.id]!==c&&(f(e),a[e.id]=c)}function u(t){let n=d();t.__bindingPointIndex=n;let r=e.createBuffer(),i=t.__size,a=t.usage;return e.bindBuffer(e.UNIFORM_BUFFER,r),e.bufferData(e.UNIFORM_BUFFER,i,a),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,n,r),r}function d(){for(let e=0;e<s;e++)if(o.indexOf(e)===-1)return o.push(e),e;return console.error(`THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached.`),0}function f(t){let n=i[t.id],r=t.uniforms,a=t.__cache;e.bindBuffer(e.UNIFORM_BUFFER,n);for(let t=0,n=r.length;t<n;t++){let n=Array.isArray(r[t])?r[t]:[r[t]];for(let r=0,i=n.length;r<i;r++){let i=n[r];if(p(i,t,r,a)===!0){let t=i.__offset,n=Array.isArray(i.value)?i.value:[i.value],r=0;for(let a=0;a<n.length;a++){let o=n[a],s=h(o);typeof o==`number`||typeof o==`boolean`?(i.__data[0]=o,e.bufferSubData(e.UNIFORM_BUFFER,t+r,i.__data)):o.isMatrix3?(i.__data[0]=o.elements[0],i.__data[1]=o.elements[1],i.__data[2]=o.elements[2],i.__data[3]=0,i.__data[4]=o.elements[3],i.__data[5]=o.elements[4],i.__data[6]=o.elements[5],i.__data[7]=0,i.__data[8]=o.elements[6],i.__data[9]=o.elements[7],i.__data[10]=o.elements[8],i.__data[11]=0):(o.toArray(i.__data,r),r+=s.storage/Float32Array.BYTES_PER_ELEMENT)}e.bufferSubData(e.UNIFORM_BUFFER,t,i.__data)}}}e.bindBuffer(e.UNIFORM_BUFFER,null)}function p(e,t,n,r){let i=e.value,a=t+`_`+n;if(r[a]===void 0)return r[a]=typeof i==`number`||typeof i==`boolean`?i:i.clone(),!0;{let e=r[a];if(typeof i==`number`||typeof i==`boolean`){if(e!==i)return r[a]=i,!0}else if(e.equals(i)===!1)return e.copy(i),!0}return!1}function m(e){let t=e.uniforms,n=0;for(let e=0,r=t.length;e<r;e++){let r=Array.isArray(t[e])?t[e]:[t[e]];for(let e=0,t=r.length;e<t;e++){let t=r[e],i=Array.isArray(t.value)?t.value:[t.value];for(let e=0,r=i.length;e<r;e++){let r=i[e],a=h(r),o=n%16;o!==0&&16-o<a.boundary&&(n+=16-o),t.__data=new Float32Array(a.storage/Float32Array.BYTES_PER_ELEMENT),t.__offset=n,n+=a.storage}}}let r=n%16;return r>0&&(n+=16-r),e.__size=n,e.__cache={},this}function h(e){let t={boundary:0,storage:0};return typeof e==`number`||typeof e==`boolean`?(t.boundary=4,t.storage=4):e.isVector2?(t.boundary=8,t.storage=8):e.isVector3||e.isColor?(t.boundary=16,t.storage=12):e.isVector4?(t.boundary=16,t.storage=16):e.isMatrix3?(t.boundary=48,t.storage=48):e.isMatrix4?(t.boundary=64,t.storage=64):e.isTexture?console.warn(`THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group.`):console.warn(`THREE.WebGLRenderer: Unsupported uniform value type.`,e),t}function g(t){let n=t.target;n.removeEventListener(`dispose`,g);let r=o.indexOf(n.__bindingPointIndex);o.splice(r,1),e.deleteBuffer(i[n.id]),delete i[n.id],delete a[n.id]}function _(){for(let t in i)e.deleteBuffer(i[t]);o=[],i={},a={}}return{bind:c,update:l,dispose:_}}var as=class{constructor(e={}){let{canvas:t=Ze(),context:n=null,depth:r=!0,stencil:i=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:s=!0,preserveDrawingBuffer:c=!1,powerPreference:l=`default`,failIfMajorPerformanceCaveat:u=!1}=e;this.isWebGLRenderer=!0;let d;if(n!==null){if(typeof WebGLRenderingContext<`u`&&n instanceof WebGLRenderingContext)throw Error(`THREE.WebGLRenderer: WebGL 1 is not supported since r163.`);d=n.getContextAttributes().alpha}else d=a;let f=new Uint32Array(4),m=new Int32Array(4),g=null,_=null,v=[],y=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=pe,this._useLegacyLights=!1,this.toneMapping=0,this.toneMappingExposure=1;let b=this,S=!1,C=0,w=0,T=null,E=-1,D=null,O=new mt,k=new mt,A=null,j=new G(0),ee=0,M=t.width,N=t.height,P=1,te=null,ne=null,re=new mt(0,0,M,N),ie=new mt(0,0,M,N),ae=!1,F=new Qr,I=!1,oe=!1,se=new W,ce=new V,le=new U,ue={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};function de(){return T===null?P:1}let L=n;function fe(e,n){let r=t.getContext(e,n);return r===null?null:r}try{let e={alpha:!0,depth:r,stencil:i,antialias:o,premultipliedAlpha:s,preserveDrawingBuffer:c,powerPreference:l,failIfMajorPerformanceCaveat:u};if(`setAttribute`in t&&t.setAttribute(`data-engine`,`three.js r163`),t.addEventListener(`webglcontextlost`,Re,!1),t.addEventListener(`webglcontextrestored`,ze,!1),t.addEventListener(`webglcontextcreationerror`,Be,!1),L===null){let t=`webgl2`;if(L=fe(t,e),L===null)throw fe(t)?Error(`Error creating WebGL context with your selected attributes.`):Error(`Error creating WebGL context.`)}}catch(e){throw console.error(`THREE.WebGLRenderer: `+e.message),e}let he,ge,R,_e,z,B,ve,ye,be,xe,Se,Ce,we,Te,Ee,De,Oe,ke,Ae,je,Me,Ne,Pe,Fe;function Ie(){he=new Pi(L),he.init(),ge=new li(L,he,e),Ne=new Ko(L,he),R=new Wo(L),_e=new Li(L),z=new Do,B=new Go(L,he,R,z,ge,Ne,_e),ve=new di(b),ye=new Ni(b),be=new ei(L),Pe=new si(L,be),xe=new Fi(L,be,_e,Pe),Se=new zi(L,xe,be,_e),Ae=new Ri(L,ge,B),De=new ui(z),Ce=new Eo(b,ve,ye,he,ge,Pe,De),we=new rs(b,z),Te=new jo,Ee=new Ro(he),ke=new oi(b,ve,ye,R,Se,d,s),Oe=new Uo(b,Se,ge),Fe=new is(L,_e,ge,R),je=new ci(L,he,_e),Me=new Ii(L,he,_e),_e.programs=Ce.programs,b.capabilities=ge,b.extensions=he,b.properties=z,b.renderLists=Te,b.shadowMap=Oe,b.state=R,b.info=_e}Ie();let Le=new es(b,L);this.xr=Le,this.getContext=function(){return L},this.getContextAttributes=function(){return L.getContextAttributes()},this.forceContextLoss=function(){let e=he.get(`WEBGL_lose_context`);e&&e.loseContext()},this.forceContextRestore=function(){let e=he.get(`WEBGL_lose_context`);e&&e.restoreContext()},this.getPixelRatio=function(){return P},this.setPixelRatio=function(e){e!==void 0&&(P=e,this.setSize(M,N,!1))},this.getSize=function(e){return e.set(M,N)},this.setSize=function(e,n,r=!0){if(Le.isPresenting){console.warn(`THREE.WebGLRenderer: Can't change size while VR device is presenting.`);return}M=e,N=n,t.width=Math.floor(e*P),t.height=Math.floor(n*P),r===!0&&(t.style.width=e+`px`,t.style.height=n+`px`),this.setViewport(0,0,e,n)},this.getDrawingBufferSize=function(e){return e.set(M*P,N*P).floor()},this.setDrawingBufferSize=function(e,n,r){M=e,N=n,P=r,t.width=Math.floor(e*r),t.height=Math.floor(n*r),this.setViewport(0,0,e,n)},this.getCurrentViewport=function(e){return e.copy(O)},this.getViewport=function(e){return e.copy(re)},this.setViewport=function(e,t,n,r){e.isVector4?re.set(e.x,e.y,e.z,e.w):re.set(e,t,n,r),R.viewport(O.copy(re).multiplyScalar(P).round())},this.getScissor=function(e){return e.copy(ie)},this.setScissor=function(e,t,n,r){e.isVector4?ie.set(e.x,e.y,e.z,e.w):ie.set(e,t,n,r),R.scissor(k.copy(ie).multiplyScalar(P).round())},this.getScissorTest=function(){return ae},this.setScissorTest=function(e){R.setScissorTest(ae=e)},this.setOpaqueSort=function(e){te=e},this.setTransparentSort=function(e){ne=e},this.getClearColor=function(e){return e.copy(ke.getClearColor())},this.setClearColor=function(){ke.setClearColor.apply(ke,arguments)},this.getClearAlpha=function(){return ke.getClearAlpha()},this.setClearAlpha=function(){ke.setClearAlpha.apply(ke,arguments)},this.clear=function(e=!0,t=!0,n=!0){let r=0;if(e){let e=!1;if(T!==null){let t=T.texture.format;e=t===1033||t===1031||t===1029}if(e){let e=T.texture.type,t=e===1009||e===1014||e===1012||e===1020||e===1017||e===1018,n=ke.getClearColor(),r=ke.getClearAlpha(),i=n.r,a=n.g,o=n.b;t?(f[0]=i,f[1]=a,f[2]=o,f[3]=r,L.clearBufferuiv(L.COLOR,0,f)):(m[0]=i,m[1]=a,m[2]=o,m[3]=r,L.clearBufferiv(L.COLOR,0,m))}else r|=L.COLOR_BUFFER_BIT}t&&(r|=L.DEPTH_BUFFER_BIT),n&&(r|=L.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),L.clear(r)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener(`webglcontextlost`,Re,!1),t.removeEventListener(`webglcontextrestored`,ze,!1),t.removeEventListener(`webglcontextcreationerror`,Be,!1),Te.dispose(),Ee.dispose(),z.dispose(),ve.dispose(),ye.dispose(),Se.dispose(),Pe.dispose(),Fe.dispose(),Ce.dispose(),Le.dispose(),Le.removeEventListener(`sessionstart`,qe),Le.removeEventListener(`sessionend`,H),Je.stop()};function Re(e){e.preventDefault(),console.log(`THREE.WebGLRenderer: Context Lost.`),S=!0}function ze(){console.log(`THREE.WebGLRenderer: Context Restored.`),S=!1;let e=_e.autoReset,t=Oe.enabled,n=Oe.autoUpdate,r=Oe.needsUpdate,i=Oe.type;Ie(),_e.autoReset=e,Oe.enabled=t,Oe.autoUpdate=n,Oe.needsUpdate=r,Oe.type=i}function Be(e){console.error(`THREE.WebGLRenderer: A WebGL context could not be created. Reason: `,e.statusMessage)}function Ve(e){let t=e.target;t.removeEventListener(`dispose`,Ve),He(t)}function He(e){Ue(e),z.remove(e)}function Ue(e){let t=z.get(e).programs;t!==void 0&&(t.forEach(function(e){Ce.releaseProgram(e)}),e.isShaderMaterial&&Ce.releaseShaderCache(e))}this.renderBufferDirect=function(e,t,n,r,i,a){t===null&&(t=ue);let o=i.isMesh&&i.matrixWorld.determinant()<0,s=it(e,t,n,r,i);R.setMaterial(r,o);let c=n.index,l=1;if(r.wireframe===!0){if(c=xe.getWireframeAttribute(n),c===void 0)return;l=2}let u=n.drawRange,d=n.attributes.position,f=u.start*l,p=(u.start+u.count)*l;a!==null&&(f=Math.max(f,a.start*l),p=Math.min(p,(a.start+a.count)*l)),c===null?d!=null&&(f=Math.max(f,0),p=Math.min(p,d.count)):(f=Math.max(f,0),p=Math.min(p,c.count));let m=p-f;if(m<0||m===1/0)return;Pe.setup(i,r,s,n,c);let h,g=je;if(c!==null&&(h=be.get(c),g=Me,g.setIndex(h)),i.isMesh)r.wireframe===!0?(R.setLineWidth(r.wireframeLinewidth*de()),g.setMode(L.LINES)):g.setMode(L.TRIANGLES);else if(i.isLine){let e=r.linewidth;e===void 0&&(e=1),R.setLineWidth(e*de()),i.isLineSegments?g.setMode(L.LINES):i.isLineLoop?g.setMode(L.LINE_LOOP):g.setMode(L.LINE_STRIP)}else i.isPoints?g.setMode(L.POINTS):i.isSprite&&g.setMode(L.TRIANGLES);if(i.isBatchedMesh)g.renderMultiDraw(i._multiDrawStarts,i._multiDrawCounts,i._multiDrawCount);else if(i.isInstancedMesh)g.renderInstances(f,m,i.count);else if(n.isInstancedBufferGeometry){let e=n._maxInstanceCount===void 0?1/0:n._maxInstanceCount,t=Math.min(n.instanceCount,e);g.renderInstances(f,m,t)}else g.render(f,m)};function We(e,t,n){e.transparent===!0&&e.side===2&&e.forceSinglePass===!1?(e.side=1,e.needsUpdate=!0,tt(e,t,n),e.side=0,e.needsUpdate=!0,tt(e,t,n),e.side=2):tt(e,t,n)}this.compile=function(e,t,n=null){n===null&&(n=e),_=Ee.get(n),_.init(),y.push(_),n.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(_.pushLight(e),e.castShadow&&_.pushShadow(e))}),e!==n&&e.traverseVisible(function(e){e.isLight&&e.layers.test(t.layers)&&(_.pushLight(e),e.castShadow&&_.pushShadow(e))}),_.setupLights(b._useLegacyLights);let r=new Set;return e.traverse(function(e){let t=e.material;if(t){if(Array.isArray(t))for(let i=0;i<t.length;i++){let a=t[i];We(a,n,e),r.add(a)}else We(t,n,e),r.add(t)}}),y.pop(),_=null,r},this.compileAsync=function(e,t,n=null){let r=this.compile(e,t,n);return new Promise(t=>{function n(){if(r.forEach(function(e){z.get(e).currentProgram.isReady()&&r.delete(e)}),r.size===0){t(e);return}setTimeout(n,10)}he.get(`KHR_parallel_shader_compile`)===null?setTimeout(n,10):n()})};let Ge=null;function Ke(e){Ge&&Ge(e)}function qe(){Je.stop()}function H(){Je.start()}let Je=new $r;Je.setAnimationLoop(Ke),typeof self<`u`&&Je.setContext(self),this.setAnimationLoop=function(e){Ge=e,Le.setAnimationLoop(e),e===null?Je.stop():Je.start()},Le.addEventListener(`sessionstart`,qe),Le.addEventListener(`sessionend`,H),this.render=function(e,t){if(t!==void 0&&t.isCamera!==!0){console.error(`THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.`);return}if(S===!0)return;e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),Le.enabled===!0&&Le.isPresenting===!0&&(Le.cameraAutoUpdate===!0&&Le.updateCamera(t),t=Le.getCamera()),e.isScene===!0&&e.onBeforeRender(b,e,t,T),_=Ee.get(e,y.length),_.init(),y.push(_),se.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),F.setFromProjectionMatrix(se),oe=this.localClippingEnabled,I=De.init(this.clippingPlanes,oe),g=Te.get(e,v.length),g.init(),v.push(g),Ye(e,t,0,b.sortObjects),g.finish(),b.sortObjects===!0&&g.sort(te,ne),this.info.render.frame++,I===!0&&De.beginShadows();let n=_.state.shadowsArray;if(Oe.render(n,e,t),I===!0&&De.endShadows(),this.info.autoReset===!0&&this.info.reset(),(Le.enabled===!1||Le.isPresenting===!1||Le.hasDepthSensing()===!1)&&ke.render(g,e),_.setupLights(b._useLegacyLights),t.isArrayCamera){let n=t.cameras;for(let t=0,r=n.length;t<r;t++){let r=n[t];Xe(g,e,r,r.viewport)}}else Xe(g,e,t);T!==null&&(B.updateMultisampleRenderTarget(T),B.updateRenderTargetMipmap(T)),e.isScene===!0&&e.onAfterRender(b,e,t),Pe.resetDefaultState(),E=-1,D=null,y.pop(),_=y.length>0?y[y.length-1]:null,v.pop(),g=v.length>0?v[v.length-1]:null};function Ye(e,t,n,r){if(e.visible===!1)return;if(e.layers.test(t.layers)){if(e.isGroup)n=e.renderOrder;else if(e.isLOD)e.autoUpdate===!0&&e.update(t);else if(e.isLight)_.pushLight(e),e.castShadow&&_.pushShadow(e);else if(e.isSprite){if(!e.frustumCulled||F.intersectsSprite(e)){r&&le.setFromMatrixPosition(e.matrixWorld).applyMatrix4(se);let t=Se.update(e),i=e.material;i.visible&&g.push(e,t,i,n,le.z,null)}}else if((e.isMesh||e.isLine||e.isPoints)&&(!e.frustumCulled||F.intersectsObject(e))){let t=Se.update(e),i=e.material;if(r&&(e.boundingSphere===void 0?(t.boundingSphere===null&&t.computeBoundingSphere(),le.copy(t.boundingSphere.center)):(e.boundingSphere===null&&e.computeBoundingSphere(),le.copy(e.boundingSphere.center)),le.applyMatrix4(e.matrixWorld).applyMatrix4(se)),Array.isArray(i)){let r=t.groups;for(let a=0,o=r.length;a<o;a++){let o=r[a],s=i[o.materialIndex];s&&s.visible&&g.push(e,t,s,n,le.z,o)}}else i.visible&&g.push(e,t,i,n,le.z,null)}}let i=e.children;for(let e=0,a=i.length;e<a;e++)Ye(i[e],t,n,r)}function Xe(e,t,n,r){let i=e.opaque,a=e.transmissive,o=e.transparent;_.setupLightsView(n),I===!0&&De.setGlobalState(b.clippingPlanes,n),a.length>0&&Qe(i,a,t,n),r&&R.viewport(O.copy(r)),i.length>0&&$e(i,t,n),a.length>0&&$e(a,t,n),o.length>0&&$e(o,t,n),R.buffers.depth.setTest(!0),R.buffers.depth.setMask(!0),R.buffers.color.setMask(!0),R.setPolygonOffset(!1)}function Qe(e,t,n,r){if((n.isScene===!0?n.overrideMaterial:null)!==null)return;if(_.state.transmissionRenderTarget===null){_.state.transmissionRenderTarget=new gt(1,1,{generateMipmaps:!0,type:he.has(`EXT_color_buffer_half_float`)||he.has(`EXT_color_buffer_float`)?x:h,minFilter:p,samples:4,stencilBuffer:i});let e=z.get(_.state.transmissionRenderTarget);e.__isTransmissionRenderTarget=!0}let a=_.state.transmissionRenderTarget;b.getDrawingBufferSize(ce),a.setSize(ce.x,ce.y);let o=b.getRenderTarget();b.setRenderTarget(a),b.getClearColor(j),ee=b.getClearAlpha(),ee<1&&b.setClearColor(16777215,.5),b.clear();let s=b.toneMapping;b.toneMapping=0,$e(e,n,r),B.updateMultisampleRenderTarget(a),B.updateRenderTargetMipmap(a);let c=!1;for(let e=0,i=t.length;e<i;e++){let i=t[e],a=i.object,o=i.geometry,s=i.material,l=i.group;if(s.side===2&&a.layers.test(r.layers)){let e=s.side;s.side=1,s.needsUpdate=!0,et(a,n,r,o,s,l),s.side=e,s.needsUpdate=!0,c=!0}}c===!0&&(B.updateMultisampleRenderTarget(a),B.updateRenderTargetMipmap(a)),b.setRenderTarget(o),b.setClearColor(j,ee),b.toneMapping=s}function $e(e,t,n){let r=t.isScene===!0?t.overrideMaterial:null;for(let i=0,a=e.length;i<a;i++){let a=e[i],o=a.object,s=a.geometry,c=r===null?a.material:r,l=a.group;o.layers.test(n.layers)&&et(o,t,n,s,c,l)}}function et(e,t,n,r,i,a){e.onBeforeRender(b,t,n,r,i,a),e.modelViewMatrix.multiplyMatrices(n.matrixWorldInverse,e.matrixWorld),e.normalMatrix.getNormalMatrix(e.modelViewMatrix),i.onBeforeRender(b,t,n,r,e,a),i.transparent===!0&&i.side===2&&i.forceSinglePass===!1?(i.side=1,i.needsUpdate=!0,b.renderBufferDirect(n,t,r,i,e,a),i.side=0,i.needsUpdate=!0,b.renderBufferDirect(n,t,r,i,e,a),i.side=2):b.renderBufferDirect(n,t,r,i,e,a),e.onAfterRender(b,t,n,r,i,a)}function tt(e,t,n){t.isScene!==!0&&(t=ue);let r=z.get(e),i=_.state.lights,a=_.state.shadowsArray,o=i.state.version,s=Ce.getParameters(e,i.state,a,t,n),c=Ce.getProgramCacheKey(s),l=r.programs;r.environment=e.isMeshStandardMaterial?t.environment:null,r.fog=t.fog,r.envMap=(e.isMeshStandardMaterial?ye:ve).get(e.envMap||r.environment),r.envMapRotation=r.environment!==null&&e.envMap===null?t.environmentRotation:e.envMapRotation,l===void 0&&(e.addEventListener(`dispose`,Ve),l=new Map,r.programs=l);let u=l.get(c);if(u!==void 0){if(r.currentProgram===u&&r.lightsStateVersion===o)return rt(e,s),u}else s.uniforms=Ce.getUniforms(e),e.onBuild(n,s,b),e.onBeforeCompile(s,b),u=Ce.acquireProgram(s,c),l.set(c,u),r.uniforms=s.uniforms;let d=r.uniforms;return(!e.isShaderMaterial&&!e.isRawShaderMaterial||e.clipping===!0)&&(d.clippingPlanes=De.uniform),rt(e,s),r.needsLights=ot(e),r.lightsStateVersion=o,r.needsLights&&(d.ambientLightColor.value=i.state.ambient,d.lightProbe.value=i.state.probe,d.directionalLights.value=i.state.directional,d.directionalLightShadows.value=i.state.directionalShadow,d.spotLights.value=i.state.spot,d.spotLightShadows.value=i.state.spotShadow,d.rectAreaLights.value=i.state.rectArea,d.ltc_1.value=i.state.rectAreaLTC1,d.ltc_2.value=i.state.rectAreaLTC2,d.pointLights.value=i.state.point,d.pointLightShadows.value=i.state.pointShadow,d.hemisphereLights.value=i.state.hemi,d.directionalShadowMap.value=i.state.directionalShadowMap,d.directionalShadowMatrix.value=i.state.directionalShadowMatrix,d.spotShadowMap.value=i.state.spotShadowMap,d.spotLightMatrix.value=i.state.spotLightMatrix,d.spotLightMap.value=i.state.spotLightMap,d.pointShadowMap.value=i.state.pointShadowMap,d.pointShadowMatrix.value=i.state.pointShadowMatrix),r.currentProgram=u,r.uniformsList=null,u}function nt(e){if(e.uniformsList===null){let t=e.currentProgram.getUniforms();e.uniformsList=qa.seqWithValue(t.seq,e.uniforms)}return e.uniformsList}function rt(e,t){let n=z.get(e);n.outputColorSpace=t.outputColorSpace,n.batching=t.batching,n.instancing=t.instancing,n.instancingColor=t.instancingColor,n.instancingMorph=t.instancingMorph,n.skinning=t.skinning,n.morphTargets=t.morphTargets,n.morphNormals=t.morphNormals,n.morphColors=t.morphColors,n.morphTargetsCount=t.morphTargetsCount,n.numClippingPlanes=t.numClippingPlanes,n.numIntersection=t.numClipIntersection,n.vertexAlphas=t.vertexAlphas,n.vertexTangents=t.vertexTangents,n.toneMapping=t.toneMapping}function it(e,t,n,r,i){t.isScene!==!0&&(t=ue),B.resetTextureUnits();let a=t.fog,o=r.isMeshStandardMaterial?t.environment:null,s=T===null?b.outputColorSpace:T.isXRRenderTarget===!0?T.texture.colorSpace:me,c=(r.isMeshStandardMaterial?ye:ve).get(r.envMap||o),l=r.vertexColors===!0&&!!n.attributes.color&&n.attributes.color.itemSize===4,u=!!n.attributes.tangent&&(!!r.normalMap||r.anisotropy>0),d=!!n.morphAttributes.position,f=!!n.morphAttributes.normal,p=!!n.morphAttributes.color,m=0;r.toneMapped&&(T===null||T.isXRRenderTarget===!0)&&(m=b.toneMapping);let h=n.morphAttributes.position||n.morphAttributes.normal||n.morphAttributes.color,g=h===void 0?0:h.length,v=z.get(r),y=_.state.lights;if(I===!0&&(oe===!0||e!==D)){let t=e===D&&r.id===E;De.setState(r,e,t)}let x=!1;r.version===v.__version?v.needsLights&&v.lightsStateVersion!==y.state.version?x=!0:v.outputColorSpace===s?i.isBatchedMesh&&v.batching===!1||!i.isBatchedMesh&&v.batching===!0||i.isInstancedMesh&&v.instancing===!1||!i.isInstancedMesh&&v.instancing===!0||i.isSkinnedMesh&&v.skinning===!1||!i.isSkinnedMesh&&v.skinning===!0||i.isInstancedMesh&&v.instancingColor===!0&&i.instanceColor===null||i.isInstancedMesh&&v.instancingColor===!1&&i.instanceColor!==null||i.isInstancedMesh&&v.instancingMorph===!0&&i.morphTexture===null||i.isInstancedMesh&&v.instancingMorph===!1&&i.morphTexture!==null?x=!0:v.envMap===c?r.fog===!0&&v.fog!==a||v.numClippingPlanes!==void 0&&(v.numClippingPlanes!==De.numPlanes||v.numIntersection!==De.numIntersection)?x=!0:v.vertexAlphas===l&&v.vertexTangents===u&&v.morphTargets===d&&v.morphNormals===f&&v.morphColors===p&&v.toneMapping===m?v.morphTargetsCount!==g&&(x=!0):x=!0:x=!0:x=!0:(x=!0,v.__version=r.version);let S=v.currentProgram;x===!0&&(S=tt(r,t,i));let C=!1,w=!1,O=!1,k=S.getUniforms(),A=v.uniforms;if(R.useProgram(S.program)&&(C=!0,w=!0,O=!0),r.id!==E&&(E=r.id,w=!0),C||D!==e){k.setValue(L,`projectionMatrix`,e.projectionMatrix),k.setValue(L,`viewMatrix`,e.matrixWorldInverse);let t=k.map.cameraPosition;t!==void 0&&t.setValue(L,le.setFromMatrixPosition(e.matrixWorld)),ge.logarithmicDepthBuffer&&k.setValue(L,`logDepthBufFC`,2/(Math.log(e.far+1)/Math.LN2)),(r.isMeshPhongMaterial||r.isMeshToonMaterial||r.isMeshLambertMaterial||r.isMeshBasicMaterial||r.isMeshStandardMaterial||r.isShaderMaterial)&&k.setValue(L,`isOrthographic`,e.isOrthographicCamera===!0),D!==e&&(D=e,w=!0,O=!0)}if(i.isSkinnedMesh){k.setOptional(L,i,`bindMatrix`),k.setOptional(L,i,`bindMatrixInverse`);let e=i.skeleton;e&&(e.boneTexture===null&&e.computeBoneTexture(),k.setValue(L,`boneTexture`,e.boneTexture,B))}i.isBatchedMesh&&(k.setOptional(L,i,`batchingTexture`),k.setValue(L,`batchingTexture`,i._matricesTexture,B));let j=n.morphAttributes;if((j.position!==void 0||j.normal!==void 0||j.color!==void 0)&&Ae.update(i,n,S),(w||v.receiveShadow!==i.receiveShadow)&&(v.receiveShadow=i.receiveShadow,k.setValue(L,`receiveShadow`,i.receiveShadow)),r.isMeshGouraudMaterial&&r.envMap!==null&&(A.envMap.value=c,A.flipEnvMap.value=c.isCubeTexture&&c.isRenderTargetTexture===!1?-1:1),r.isMeshStandardMaterial&&r.envMap===null&&t.environment!==null&&(A.envMapIntensity.value=t.environmentIntensity),w&&(k.setValue(L,`toneMappingExposure`,b.toneMappingExposure),v.needsLights&&at(A,O),a&&r.fog===!0&&we.refreshFogUniforms(A,a),we.refreshMaterialUniforms(A,r,P,N,_.state.transmissionRenderTarget),qa.upload(L,nt(v),A,B)),r.isShaderMaterial&&r.uniformsNeedUpdate===!0&&(qa.upload(L,nt(v),A,B),r.uniformsNeedUpdate=!1),r.isSpriteMaterial&&k.setValue(L,`center`,i.center),k.setValue(L,`modelViewMatrix`,i.modelViewMatrix),k.setValue(L,`normalMatrix`,i.normalMatrix),k.setValue(L,`modelMatrix`,i.matrixWorld),r.isShaderMaterial||r.isRawShaderMaterial){let e=r.uniformsGroups;for(let t=0,n=e.length;t<n;t++){let n=e[t];Fe.update(n,S),Fe.bind(n,S)}}return S}function at(e,t){e.ambientLightColor.needsUpdate=t,e.lightProbe.needsUpdate=t,e.directionalLights.needsUpdate=t,e.directionalLightShadows.needsUpdate=t,e.pointLights.needsUpdate=t,e.pointLightShadows.needsUpdate=t,e.spotLights.needsUpdate=t,e.spotLightShadows.needsUpdate=t,e.rectAreaLights.needsUpdate=t,e.hemisphereLights.needsUpdate=t}function ot(e){return e.isMeshLambertMaterial||e.isMeshToonMaterial||e.isMeshPhongMaterial||e.isMeshStandardMaterial||e.isShadowMaterial||e.isShaderMaterial&&e.lights===!0}this.getActiveCubeFace=function(){return C},this.getActiveMipmapLevel=function(){return w},this.getRenderTarget=function(){return T},this.setRenderTargetTextures=function(e,t,n){z.get(e.texture).__webglTexture=t,z.get(e.depthTexture).__webglTexture=n;let r=z.get(e);r.__hasExternalTextures=!0,r.__autoAllocateDepthBuffer=n===void 0,r.__autoAllocateDepthBuffer||he.has(`WEBGL_multisampled_render_to_texture`)===!0&&(console.warn(`THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided`),r.__useRenderToTexture=!1)},this.setRenderTargetFramebuffer=function(e,t){let n=z.get(e);n.__webglFramebuffer=t,n.__useDefaultFramebuffer=t===void 0},this.setRenderTarget=function(e,t=0,n=0){T=e,C=t,w=n;let r=!0,i=null,a=!1,o=!1;if(e){let s=z.get(e);s.__useDefaultFramebuffer===void 0?s.__webglFramebuffer===void 0?B.setupRenderTarget(e):s.__hasExternalTextures&&B.rebindTextures(e,z.get(e.texture).__webglTexture,z.get(e.depthTexture).__webglTexture):(R.bindFramebuffer(L.FRAMEBUFFER,null),r=!1);let c=e.texture;(c.isData3DTexture||c.isDataArrayTexture||c.isCompressedArrayTexture)&&(o=!0);let l=z.get(e).__webglFramebuffer;e.isWebGLCubeRenderTarget?(i=Array.isArray(l[t])?l[t][n]:l[t],a=!0):i=e.samples>0&&B.useMultisampledRTT(e)===!1?z.get(e).__webglMultisampledFramebuffer:Array.isArray(l)?l[n]:l,O.copy(e.viewport),k.copy(e.scissor),A=e.scissorTest}else O.copy(re).multiplyScalar(P).floor(),k.copy(ie).multiplyScalar(P).floor(),A=ae;if(R.bindFramebuffer(L.FRAMEBUFFER,i)&&r&&R.drawBuffers(e,i),R.viewport(O),R.scissor(k),R.setScissorTest(A),a){let r=z.get(e.texture);L.framebufferTexture2D(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,L.TEXTURE_CUBE_MAP_POSITIVE_X+t,r.__webglTexture,n)}else if(o){let r=z.get(e.texture),i=t||0;L.framebufferTextureLayer(L.FRAMEBUFFER,L.COLOR_ATTACHMENT0,r.__webglTexture,n||0,i)}E=-1},this.readRenderTargetPixels=function(e,t,n,r,i,a,o){if(!(e&&e.isWebGLRenderTarget)){console.error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.`);return}let s=z.get(e).__webglFramebuffer;if(e.isWebGLCubeRenderTarget&&o!==void 0&&(s=s[o]),s){R.bindFramebuffer(L.FRAMEBUFFER,s);try{let o=e.texture,s=o.format,c=o.type;if(s!==1023&&Ne.convert(s)!==L.getParameter(L.IMPLEMENTATION_COLOR_READ_FORMAT)){console.error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.`);return}let l=c===1016&&(he.has(`EXT_color_buffer_half_float`)||he.has(`EXT_color_buffer_float`));if(c!==1009&&Ne.convert(c)!==L.getParameter(L.IMPLEMENTATION_COLOR_READ_TYPE)&&c!==1015&&!l){console.error(`THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.`);return}t>=0&&t<=e.width-r&&n>=0&&n<=e.height-i&&L.readPixels(t,n,r,i,Ne.convert(s),Ne.convert(c),a)}finally{let e=T===null?null:z.get(T).__webglFramebuffer;R.bindFramebuffer(L.FRAMEBUFFER,e)}}},this.copyFramebufferToTexture=function(e,t,n=0){let r=2**-n,i=Math.floor(t.image.width*r),a=Math.floor(t.image.height*r);B.setTexture2D(t,0),L.copyTexSubImage2D(L.TEXTURE_2D,n,0,0,e.x,e.y,i,a),R.unbindTexture()},this.copyTextureToTexture=function(e,t,n,r=0){let i=t.image.width,a=t.image.height,o=Ne.convert(n.format),s=Ne.convert(n.type);B.setTexture2D(n,0),L.pixelStorei(L.UNPACK_FLIP_Y_WEBGL,n.flipY),L.pixelStorei(L.UNPACK_PREMULTIPLY_ALPHA_WEBGL,n.premultiplyAlpha),L.pixelStorei(L.UNPACK_ALIGNMENT,n.unpackAlignment),t.isDataTexture?L.texSubImage2D(L.TEXTURE_2D,r,e.x,e.y,i,a,o,s,t.image.data):t.isCompressedTexture?L.compressedTexSubImage2D(L.TEXTURE_2D,r,e.x,e.y,t.mipmaps[0].width,t.mipmaps[0].height,o,t.mipmaps[0].data):L.texSubImage2D(L.TEXTURE_2D,r,e.x,e.y,o,s,t.image),r===0&&n.generateMipmaps&&L.generateMipmap(L.TEXTURE_2D),R.unbindTexture()},this.copyTextureToTexture3D=function(e,t,n,r,i=0){let a=Math.round(e.max.x-e.min.x),o=Math.round(e.max.y-e.min.y),s=e.max.z-e.min.z+1,c=Ne.convert(r.format),l=Ne.convert(r.type),u;if(r.isData3DTexture)B.setTexture3D(r,0),u=L.TEXTURE_3D;else if(r.isDataArrayTexture||r.isCompressedArrayTexture)B.setTexture2DArray(r,0),u=L.TEXTURE_2D_ARRAY;else{console.warn(`THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.`);return}L.pixelStorei(L.UNPACK_FLIP_Y_WEBGL,r.flipY),L.pixelStorei(L.UNPACK_PREMULTIPLY_ALPHA_WEBGL,r.premultiplyAlpha),L.pixelStorei(L.UNPACK_ALIGNMENT,r.unpackAlignment);let d=L.getParameter(L.UNPACK_ROW_LENGTH),f=L.getParameter(L.UNPACK_IMAGE_HEIGHT),p=L.getParameter(L.UNPACK_SKIP_PIXELS),m=L.getParameter(L.UNPACK_SKIP_ROWS),h=L.getParameter(L.UNPACK_SKIP_IMAGES),g=n.isCompressedTexture?n.mipmaps[i]:n.image;L.pixelStorei(L.UNPACK_ROW_LENGTH,g.width),L.pixelStorei(L.UNPACK_IMAGE_HEIGHT,g.height),L.pixelStorei(L.UNPACK_SKIP_PIXELS,e.min.x),L.pixelStorei(L.UNPACK_SKIP_ROWS,e.min.y),L.pixelStorei(L.UNPACK_SKIP_IMAGES,e.min.z),n.isDataTexture||n.isData3DTexture?L.texSubImage3D(u,i,t.x,t.y,t.z,a,o,s,c,l,g.data):r.isCompressedArrayTexture?L.compressedTexSubImage3D(u,i,t.x,t.y,t.z,a,o,s,c,g.data):L.texSubImage3D(u,i,t.x,t.y,t.z,a,o,s,c,l,g),L.pixelStorei(L.UNPACK_ROW_LENGTH,d),L.pixelStorei(L.UNPACK_IMAGE_HEIGHT,f),L.pixelStorei(L.UNPACK_SKIP_PIXELS,p),L.pixelStorei(L.UNPACK_SKIP_ROWS,m),L.pixelStorei(L.UNPACK_SKIP_IMAGES,h),i===0&&r.generateMipmaps&&L.generateMipmap(u),R.unbindTexture()},this.initTexture=function(e){e.isCubeTexture?B.setTextureCube(e,0):e.isData3DTexture?B.setTexture3D(e,0):e.isDataArrayTexture||e.isCompressedArrayTexture?B.setTexture2DArray(e,0):B.setTexture2D(e,0),R.unbindTexture()},this.resetState=function(){C=0,w=0,T=null,R.reset(),Pe.reset()},typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}get coordinateSystem(){return ye}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=e===`display-p3`?`display-p3`:`srgb`,t.unpackColorSpace=it.workingColorSpace===`display-p3-linear`?`display-p3`:`srgb`}get useLegacyLights(){return console.warn(`THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733.`),this._useLegacyLights}set useLegacyLights(e){console.warn(`THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733.`),this._useLegacyLights=e}},os=class extends Sn{constructor(){super(),this.isScene=!0,this.type=`Scene`,this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new an,this.environmentIntensity=1,this.environmentRotation=new an,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`observe`,{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},ss=class{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e===void 0?0:e.length/t,this.usage=ve,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.version=0,this.uuid=Te()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}get updateRange(){return $e(`THREE.InterleavedBuffer: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead.`),this._updateRange}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let r=0,i=this.stride;r<i;r++)this.array[e+r]=t.array[n+r];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Te()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Te()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}},cs=new U,ls=class e{constructor(e,t,n,r=!1){this.isInterleavedBufferAttribute=!0,this.name=``,this.data=e,this.itemSize=t,this.offset=n,this.normalized=r}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)cs.fromBufferAttribute(this,t),cs.applyMatrix4(e),this.setXYZ(t,cs.x,cs.y,cs.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)cs.fromBufferAttribute(this,t),cs.applyNormalMatrix(e),this.setXYZ(t,cs.x,cs.y,cs.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)cs.fromBufferAttribute(this,t),cs.transformDirection(e),this.setXYZ(t,cs.x,cs.y,cs.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=Ge(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=Ke(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=Ke(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=Ke(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=Ke(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=Ke(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=Ge(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=Ge(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=Ge(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=Ge(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=Ke(t,this.array),n=Ke(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=Ke(t,this.array),n=Ke(n,this.array),r=Ke(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this}setXYZW(e,t,n,r,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=Ke(t,this.array),n=Ke(n,this.array),r=Ke(r,this.array),i=Ke(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=r,this.data.array[e+3]=i,this}clone(t){if(t===void 0){console.log(`THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.`);let e=[];for(let t=0;t<this.count;t++){let n=t*this.data.stride+this.offset;for(let t=0;t<this.itemSize;t++)e.push(this.data.array[n+t])}return new Yn(new this.array.constructor(e),this.itemSize,this.normalized)}return t.interleavedBuffers===void 0&&(t.interleavedBuffers={}),t.interleavedBuffers[this.data.uuid]===void 0&&(t.interleavedBuffers[this.data.uuid]=this.data.clone(t)),new e(t.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log(`THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.`);let e=[];for(let t=0;t<this.count;t++){let n=t*this.data.stride+this.offset;for(let t=0;t<this.itemSize;t++)e.push(this.data.array[n+t])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:e,normalized:this.normalized}}return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},us=new U,ds=new mt,fs=new mt,ps=new U,ms=new W,hs=new U,gs=new Bt,_s=new W,vs=new Jt,ys=class extends wr{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type=`SkinnedMesh`,this.bindMode=i,this.bindMatrix=new W,this.bindMatrixInverse=new W,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){let e=this.geometry;this.boundingBox===null&&(this.boundingBox=new St),this.boundingBox.makeEmpty();let t=e.getAttribute(`position`);for(let e=0;e<t.count;e++)this.getVertexPosition(e,hs),this.boundingBox.expandByPoint(hs)}computeBoundingSphere(){let e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new Bt),this.boundingSphere.makeEmpty();let t=e.getAttribute(`position`);for(let e=0;e<t.count;e++)this.getVertexPosition(e,hs),this.boundingSphere.expandByPoint(hs)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){let n=this.material,r=this.matrixWorld;n!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),gs.copy(this.boundingSphere),gs.applyMatrix4(r),e.ray.intersectsSphere(gs)!==!1&&(_s.copy(r).invert(),vs.copy(e.ray).applyMatrix4(_s),(this.boundingBox===null||vs.intersectsBox(this.boundingBox)!==!1)&&this._computeIntersections(e,t,vs)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let e=new mt,t=this.geometry.attributes.skinWeight;for(let n=0,r=t.count;n<r;n++){e.fromBufferAttribute(t,n);let r=1/e.manhattanLength();r===1/0?e.set(1,0,0,0):e.multiplyScalar(r),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===`attached`?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===`detached`?this.bindMatrixInverse.copy(this.bindMatrix).invert():console.warn(`THREE.SkinnedMesh: Unrecognized bindMode: `+this.bindMode)}applyBoneTransform(e,t){let n=this.skeleton,r=this.geometry;ds.fromBufferAttribute(r.attributes.skinIndex,e),fs.fromBufferAttribute(r.attributes.skinWeight,e),us.copy(t).applyMatrix4(this.bindMatrix),t.set(0,0,0);for(let e=0;e<4;e++){let r=fs.getComponent(e);if(r!==0){let i=ds.getComponent(e);ms.multiplyMatrices(n.bones[i].matrixWorld,n.boneInverses[i]),t.addScaledVector(ps.copy(us).applyMatrix4(ms),r)}}return t.applyMatrix4(this.bindMatrixInverse)}},bs=class extends Sn{constructor(){super(),this.isBone=!0,this.type=`Bone`}},xs=class extends pt{constructor(e=null,t=1,n=1,r,i,a,o,s,l=c,u=c,d,f){super(null,a,o,s,l,u,r,i,d,f),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},Ss=new W,Cs=new W,ws=class e{constructor(e=[],t=[]){this.uuid=Te(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){let e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){console.warn(`THREE.Skeleton: Number of inverse bone matrices does not match amount of bones.`),this.boneInverses=[];for(let e=0,t=this.bones.length;e<t;e++)this.boneInverses.push(new W)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){let t=new W;this.bones[e]&&t.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(t)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){let t=this.bones[e];t&&t.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){let t=this.bones[e];t&&(t.parent&&t.parent.isBone?(t.matrix.copy(t.parent.matrixWorld).invert(),t.matrix.multiply(t.matrixWorld)):t.matrix.copy(t.matrixWorld),t.matrix.decompose(t.position,t.quaternion,t.scale))}}update(){let e=this.bones,t=this.boneInverses,n=this.boneMatrices,r=this.boneTexture;for(let r=0,i=e.length;r<i;r++){let i=e[r]?e[r].matrixWorld:Cs;Ss.multiplyMatrices(i,t[r]),Ss.toArray(n,r*16)}r!==null&&(r.needsUpdate=!0)}clone(){return new e(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);let t=new Float32Array(e*e*4);t.set(this.boneMatrices);let n=new xs(t,e,e,C,b);return n.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=n,this}getBoneByName(e){for(let t=0,n=this.bones.length;t<n;t++){let n=this.bones[t];if(n.name===e)return n}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let n=0,r=e.bones.length;n<r;n++){let r=e.bones[n],i=t[r];i===void 0&&(console.warn(`THREE.Skeleton: No bone found with UUID:`,r),i=new bs),this.bones.push(i),this.boneInverses.push(new W().fromArray(e.boneInverses[n]))}return this.init(),this}toJSON(){let e={metadata:{version:4.6,type:`Skeleton`,generator:`Skeleton.toJSON`},bones:[],boneInverses:[]};e.uuid=this.uuid;let t=this.bones,n=this.boneInverses;for(let r=0,i=t.length;r<i;r++){let i=t[r];e.bones.push(i.uuid);let a=n[r];e.boneInverses.push(a.toArray())}return e}},Ts=class extends Yn{constructor(e,t,n,r=1){super(e,t,n),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=r}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},Es=new W,Ds=new W,Os=[],ks=new St,As=new W,js=new wr,Ms=new Bt,Ns=class extends wr{constructor(e,t,n){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new Ts(new Float32Array(n*16),16),this.instanceColor=null,this.morphTexture=null,this.count=n,this.boundingBox=null,this.boundingSphere=null;for(let e=0;e<n;e++)this.setMatrixAt(e,As)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new St),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Es),ks.copy(e.boundingBox).applyMatrix4(Es),this.boundingBox.union(ks)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new Bt),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let n=0;n<t;n++)this.getMatrixAt(n,Es),Ms.copy(e.boundingSphere).applyMatrix4(Es),this.boundingSphere.union(Ms)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.morphTexture!==null&&(this.morphTexture=e.morphTexture.clone()),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}getMorphAt(e,t){let n=t.morphTargetInfluences,r=this.morphTexture.source.data.data,i=e*(n.length+1)+1;for(let e=0;e<n.length;e++)n[e]=r[i+e]}raycast(e,t){let n=this.matrixWorld,r=this.count;if(js.geometry=this.geometry,js.material=this.material,js.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Ms.copy(this.boundingSphere),Ms.applyMatrix4(n),e.ray.intersectsSphere(Ms)!==!1))for(let i=0;i<r;i++){this.getMatrixAt(i,Es),Ds.multiplyMatrices(n,Es),js.matrixWorld=Ds,js.raycast(e,Os);for(let e=0,n=Os.length;e<n;e++){let n=Os[e];n.instanceId=i,n.object=this,t.push(n)}Os.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new Ts(new Float32Array(this.instanceMatrix.count*3),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}setMorphAt(e,t){let n=t.morphTargetInfluences,r=n.length+1;this.morphTexture===null&&(this.morphTexture=new xs(new Float32Array(r*this.count),r,this.count,E,b));let i=this.morphTexture.source.data.data,a=0;for(let e=0;e<n.length;e++)a+=n[e];let o=this.geometry.morphTargetsRelative?1:1-a,s=r*e;i[s]=o,i.set(n,s+1)}updateMorphTargets(){}dispose(){return this.dispatchEvent({type:`dispose`}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null),this}},Ps=class extends Bn{constructor(e){super(),this.isLineBasicMaterial=!0,this.type=`LineBasicMaterial`,this.color=new G(16777215),this.map=null,this.linewidth=1,this.linecap=`round`,this.linejoin=`round`,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},Fs=new U,Is=new U,Ls=new W,Rs=new Jt,zs=new Bt,Bs=class extends Sn{constructor(e=new or,t=new Ps){super(),this.isLine=!0,this.type=`Line`,this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let e=1,r=t.count;e<r;e++)Fs.fromBufferAttribute(t,e-1),Is.fromBufferAttribute(t,e),n[e]=n[e-1],n[e]+=Fs.distanceTo(Is);e.setAttribute(`lineDistance`,new Qn(n,1))}else console.warn(`THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),zs.copy(n.boundingSphere),zs.applyMatrix4(r),zs.radius+=i,e.ray.intersectsSphere(zs)===!1)return;Ls.copy(r).invert(),Rs.copy(e.ray).applyMatrix4(Ls);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=new U,l=new U,u=new U,d=new U,f=this.isLineSegments?2:1,p=n.index,m=n.attributes.position;if(p!==null){let n=Math.max(0,a.start),r=Math.min(p.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=f){let n=p.getX(i),r=p.getX(i+1);if(c.fromBufferAttribute(m,n),l.fromBufferAttribute(m,r),Rs.distanceSqToSegment(c,l,d,u)>s)continue;d.applyMatrix4(this.matrixWorld);let a=e.ray.origin.distanceTo(d);a<e.near||a>e.far||t.push({distance:a,point:u.clone().applyMatrix4(this.matrixWorld),index:i,face:null,faceIndex:null,object:this})}}else{let n=Math.max(0,a.start),r=Math.min(m.count,a.start+a.count);for(let i=n,a=r-1;i<a;i+=f){if(c.fromBufferAttribute(m,i),l.fromBufferAttribute(m,i+1),Rs.distanceSqToSegment(c,l,d,u)>s)continue;d.applyMatrix4(this.matrixWorld);let n=e.ray.origin.distanceTo(d);n<e.near||n>e.far||t.push({distance:n,point:u.clone().applyMatrix4(this.matrixWorld),index:i,face:null,faceIndex:null,object:this})}}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}},Vs=new U,Hs=new U,Us=class extends Bs{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type=`LineSegments`}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[];for(let e=0,r=t.count;e<r;e+=2)Vs.fromBufferAttribute(t,e),Hs.fromBufferAttribute(t,e+1),n[e]=e===0?0:n[e-1],n[e+1]=n[e]+Vs.distanceTo(Hs);e.setAttribute(`lineDistance`,new Qn(n,1))}else console.warn(`THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.`);return this}},Ws=class extends Bs{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type=`LineLoop`}},Gs=class extends Bn{constructor(e){super(),this.isPointsMaterial=!0,this.type=`PointsMaterial`,this.color=new G(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},Ks=new W,qs=new Jt,Js=new Bt,Ys=new U,Xs=class extends Sn{constructor(e=new or,t=new Gs){super(),this.isPoints=!0,this.type=`Points`,this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){let n=this.geometry,r=this.matrixWorld,i=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Js.copy(n.boundingSphere),Js.applyMatrix4(r),Js.radius+=i,e.ray.intersectsSphere(Js)===!1)return;Ks.copy(r).invert(),qs.copy(e.ray).applyMatrix4(Ks);let o=i/((this.scale.x+this.scale.y+this.scale.z)/3),s=o*o,c=n.index,l=n.attributes.position;if(c!==null){let n=Math.max(0,a.start),i=Math.min(c.count,a.start+a.count);for(let a=n,o=i;a<o;a++){let n=c.getX(a);Ys.fromBufferAttribute(l,n),Zs(Ys,n,s,r,e,t,this)}}else{let n=Math.max(0,a.start),i=Math.min(l.count,a.start+a.count);for(let a=n,o=i;a<o;a++)Ys.fromBufferAttribute(l,a),Zs(Ys,a,s,r,e,t,this)}}updateMorphTargets(){let e=this.geometry.morphAttributes,t=Object.keys(e);if(t.length>0){let n=e[t[0]];if(n!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let e=0,t=n.length;e<t;e++){let t=n[e].name||String(e);this.morphTargetInfluences.push(0),this.morphTargetDictionary[t]=e}}}}};function Zs(e,t,n,r,i,a,o){let s=qs.distanceSqToPoint(e);if(s<n){let n=new U;qs.closestPointToPoint(e,n),n.applyMatrix4(r);let c=i.ray.origin.distanceTo(n);if(c<i.near||c>i.far)return;a.push({distance:c,distanceToRay:Math.sqrt(s),point:n,index:t,face:null,object:o})}}var Qs=class extends pt{constructor(e,t,n,r,i,a,o,s,c){super(e,t,n,r,i,a,o,s,c),this.isVideoTexture=!0,this.minFilter=a===void 0?d:a,this.magFilter=i===void 0?d:i,this.generateMipmaps=!1;let l=this;function u(){l.needsUpdate=!0,e.requestVideoFrameCallback(u)}`requestVideoFrameCallback`in e&&e.requestVideoFrameCallback(u)}clone(){return new this.constructor(this.image).copy(this)}update(){let e=this.image;!(`requestVideoFrameCallback`in e)&&e.readyState>=e.HAVE_CURRENT_DATA&&(this.needsUpdate=!0)}},$s=class extends pt{constructor(e,t,n,r,i,a,o,s,c,l,u,d){super(null,a,o,s,c,l,r,i,u,d),this.isCompressedTexture=!0,this.image={width:t,height:n},this.mipmaps=e,this.flipY=!1,this.generateMipmaps=!1}},ec=class extends $s{constructor(e,t,n,r,i,a){super(e,t,n,i,a),this.isCompressedArrayTexture=!0,this.image.depth=r,this.wrapR=o}},tc=class extends $s{constructor(e,t,n){super(void 0,e[0].width,e[0].height,t,n,301),this.isCompressedCubeTexture=!0,this.isCubeTexture=!0,this.image=e}},nc=class extends pt{constructor(e,t,n,r,i,a,o,s,c){super(e,t,n,r,i,a,o,s,c),this.isCanvasTexture=!0,this.needsUpdate=!0}},rc=class e extends or{constructor(e=1,t=32,n=16,r=0,i=Math.PI*2,a=0,o=Math.PI){super(),this.type=`SphereGeometry`,this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:r,phiLength:i,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let s=Math.min(a+o,Math.PI),c=0,l=[],u=new U,d=new U,f=[],p=[],m=[],h=[];for(let f=0;f<=n;f++){let g=[],_=f/n,v=0;f===0&&a===0?v=.5/t:f===n&&s===Math.PI&&(v=-.5/t);for(let n=0;n<=t;n++){let s=n/t;u.x=-e*Math.cos(r+s*i)*Math.sin(a+_*o),u.y=e*Math.cos(a+_*o),u.z=e*Math.sin(r+s*i)*Math.sin(a+_*o),p.push(u.x,u.y,u.z),d.copy(u).normalize(),m.push(d.x,d.y,d.z),h.push(s+v,1-_),g.push(c++)}l.push(g)}for(let e=0;e<n;e++)for(let r=0;r<t;r++){let t=l[e][r+1],i=l[e][r],o=l[e+1][r],c=l[e+1][r+1];(e!==0||a>0)&&f.push(t,i,c),(e!==n-1||s<Math.PI)&&f.push(i,o,c)}this.setIndex(f),this.setAttribute(`position`,new Qn(p,3)),this.setAttribute(`normal`,new Qn(m,3)),this.setAttribute(`uv`,new Qn(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(t){return new e(t.radius,t.widthSegments,t.heightSegments,t.phiStart,t.phiLength,t.thetaStart,t.thetaLength)}},ic=class extends Bn{constructor(e){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:``},this.type=`MeshStandardMaterial`,this.color=new G(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new G(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=0,this.normalScale=new V(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new an,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap=`round`,this.wireframeLinejoin=`round`,this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:``},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},ac=class extends ic{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:``,PHYSICAL:``},this.type=`MeshPhysicalMaterial`,this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new V(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return Ee(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(e){this.ior=(1+.4*e)/(1-.4*e)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new G(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new G(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new G(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:``,PHYSICAL:``},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}};function oc(e,t,n){return!e||!n&&e.constructor===t?e:typeof t.BYTES_PER_ELEMENT==`number`?new t(e):Array.prototype.slice.call(e)}function sc(e){return ArrayBuffer.isView(e)&&!(e instanceof DataView)}function cc(e){function t(t,n){return e[t]-e[n]}let n=e.length,r=Array(n);for(let e=0;e!==n;++e)r[e]=e;return r.sort(t),r}function lc(e,t,n){let r=e.length,i=new e.constructor(r);for(let a=0,o=0;o!==r;++a){let r=n[a]*t;for(let n=0;n!==t;++n)i[o++]=e[r+n]}return i}function uc(e,t,n,r){let i=1,a=e[0];for(;a!==void 0&&a[r]===void 0;)a=e[i++];if(a===void 0)return;let o=a[r];if(o!==void 0){if(Array.isArray(o))do o=a[r],o!==void 0&&(t.push(a.time),n.push.apply(n,o)),a=e[i++];while(a!==void 0);else if(o.toArray!==void 0)do o=a[r],o!==void 0&&(t.push(a.time),o.toArray(n,n.length)),a=e[i++];while(a!==void 0);else do o=a[r],o!==void 0&&(t.push(a.time),n.push(o)),a=e[i++];while(a!==void 0)}}var dc=class{constructor(e,t,n,r){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=r===void 0?new t.constructor(n):r,this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,r=t[n],i=t[n-1];validate_interval:{seek:{let a;linear_scan:{forward_scan:if(!(e<r)){for(let a=n+2;;){if(r===void 0){if(e<i)break forward_scan;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(i=r,r=t[++n],e<r)break seek}a=t.length;break linear_scan}if(!(e>=i)){let o=t[1];e<o&&(n=2,i=o);for(let a=n-2;;){if(i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===a)break;if(r=i,i=t[--n-1],e>=i)break seek}a=n,n=0;break linear_scan}break validate_interval}for(;n<a;){let r=n+a>>>1;e<t[r]?a=r:n=r+1}if(r=t[n],i=t[n-1],i===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(r===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,i,r)}return this.interpolate_(n,i,e,r)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,i=e*r;for(let e=0;e!==r;++e)t[e]=n[i+e];return t}interpolate_(){throw Error(`call to abstract method`)}intervalChanged_(){}},fc=class extends dc{constructor(e,t,n,r){super(e,t,n,r),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:se,endingEnd:se}}intervalChanged_(e,t,n){let r=this.parameterPositions,i=e-2,a=e+1,o=r[i],s=r[a];if(o===void 0)switch(this.getSettings_().endingStart){case ce:i=e,o=2*t-n;break;case le:i=r.length-2,o=t+r[i]-r[i+1];break;default:i=e,o=n}if(s===void 0)switch(this.getSettings_().endingEnd){case ce:a=e,s=2*n-t;break;case le:a=1,s=n+r[1]-r[0];break;default:a=e-1,s=t}let c=(n-t)*.5,l=this.valueSize;this._weightPrev=c/(t-o),this._weightNext=c/(s-n),this._offsetPrev=i*l,this._offsetNext=a*l}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,p=(n-t)/(r-t),m=p*p,h=m*p,g=-d*h+2*d*m-d*p,_=(1+d)*h+(-1.5-2*d)*m+(-.5+d)*p+1,v=(-1-f)*h+(1.5+f)*m+.5*p,y=f*h-f*m;for(let e=0;e!==o;++e)i[e]=g*a[l+e]+_*a[c+e]+v*a[s+e]+y*a[u+e];return i}},pc=class extends dc{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=e*o,c=s-o,l=(n-t)/(r-t),u=1-l;for(let e=0;e!==o;++e)i[e]=a[c+e]*u+a[s+e]*l;return i}},mc=class extends dc{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e){return this.copySampleValue_(e-1)}},hc=class{constructor(e,t,n,r){if(e===void 0)throw Error(`THREE.KeyframeTrack: track name is undefined`);if(t===void 0||t.length===0)throw Error(`THREE.KeyframeTrack: no keyframes in track named `+e);this.name=e,this.times=oc(t,this.TimeBufferType),this.values=oc(n,this.ValueBufferType),this.setInterpolation(r||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:oc(e.times,Array),values:oc(e.values,Array)};let t=e.getInterpolation();t!==e.DefaultInterpolation&&(n.interpolation=t)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new mc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new pc(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new fc(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let t;switch(e){case F:t=this.InterpolantFactoryMethodDiscrete;break;case I:t=this.InterpolantFactoryMethodLinear;break;case oe:t=this.InterpolantFactoryMethodSmooth}if(t===void 0){let t=`unsupported interpolation for `+this.ValueTypeName+` keyframe track named `+this.name;if(this.createInterpolant===void 0){if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw Error(t)}return console.warn(`THREE.KeyframeTrack:`,t),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return F;case this.InterpolantFactoryMethodLinear:return I;case this.InterpolantFactoryMethodSmooth:return oe}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,r=t.length;n!==r;++n)t[n]*=e}return this}trim(e,t){let n=this.times,r=n.length,i=0,a=r-1;for(;i!==r&&n[i]<e;)++i;for(;a!==-1&&n[a]>t;)--a;if(++a,i!==0||a!==r){i>=a&&(a=Math.max(a,1),i=a-1);let e=this.getValueSize();this.times=n.slice(i,a),this.values=this.values.slice(i*e,a*e)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(console.error(`THREE.KeyframeTrack: Invalid value size in track.`,this),e=!1);let n=this.times,r=this.values,i=n.length;i===0&&(console.error(`THREE.KeyframeTrack: Track is empty.`,this),e=!1);let a=null;for(let t=0;t!==i;t++){let r=n[t];if(typeof r==`number`&&isNaN(r)){console.error(`THREE.KeyframeTrack: Time is not a valid number.`,this,t,r),e=!1;break}if(a!==null&&a>r){console.error(`THREE.KeyframeTrack: Out of order keys.`,this,t,r,a),e=!1;break}a=r}if(r!==void 0&&sc(r))for(let t=0,n=r.length;t!==n;++t){let n=r[t];if(isNaN(n)){console.error(`THREE.KeyframeTrack: Value is not a valid number.`,this,t,n),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),r=this.getInterpolation()===oe,i=e.length-1,a=1;for(let o=1;o<i;++o){let i=!1,s=e[o];if(s!==e[o+1]&&(o!==1||s!==e[0])){if(r)i=!0;else{let e=o*n,r=e-n,a=e+n;for(let o=0;o!==n;++o){let n=t[e+o];if(n!==t[r+o]||n!==t[a+o]){i=!0;break}}}}if(i){if(o!==a){e[a]=e[o];let r=o*n,i=a*n;for(let e=0;e!==n;++e)t[i+e]=t[r+e]}++a}}if(i>0){e[a]=e[i];for(let e=i*n,r=a*n,o=0;o!==n;++o)t[r+o]=t[e+o];++a}return a===e.length?(this.times=e,this.values=t):(this.times=e.slice(0,a),this.values=t.slice(0,a*n)),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,r=new n(this.name,e,t);return r.createInterpolant=this.createInterpolant,r}};hc.prototype.TimeBufferType=Float32Array,hc.prototype.ValueBufferType=Float32Array,hc.prototype.DefaultInterpolation=I;var gc=class extends hc{};gc.prototype.ValueTypeName=`bool`,gc.prototype.ValueBufferType=Array,gc.prototype.DefaultInterpolation=F,gc.prototype.InterpolantFactoryMethodLinear=void 0,gc.prototype.InterpolantFactoryMethodSmooth=void 0;var _c=class extends hc{};_c.prototype.ValueTypeName=`color`;var vc=class extends hc{};vc.prototype.ValueTypeName=`number`;var yc=class extends dc{constructor(e,t,n,r){super(e,t,n,r)}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=(n-t)/(r-t),c=e*o;for(let e=c+o;c!==e;c+=4)yt.slerpFlat(i,0,a,c-o,a,c,s);return i}},bc=class extends hc{InterpolantFactoryMethodLinear(e){return new yc(this.times,this.values,this.getValueSize(),e)}};bc.prototype.ValueTypeName=`quaternion`,bc.prototype.DefaultInterpolation=I,bc.prototype.InterpolantFactoryMethodSmooth=void 0;var xc=class extends hc{};xc.prototype.ValueTypeName=`string`,xc.prototype.ValueBufferType=Array,xc.prototype.DefaultInterpolation=F,xc.prototype.InterpolantFactoryMethodLinear=void 0,xc.prototype.InterpolantFactoryMethodSmooth=void 0;var Sc=class extends hc{};Sc.prototype.ValueTypeName=`vector`;var Cc=class{constructor(e=``,t=-1,n=[],r=ue){this.name=e,this.tracks=n,this.duration=t,this.blendMode=r,this.uuid=Te(),this.duration<0&&this.resetDuration()}static parse(e){let t=[],n=e.tracks,r=1/(e.fps||1);for(let e=0,i=n.length;e!==i;++e)t.push(Tc(n[e]).scale(r));let i=new this(e.name,e.duration,t,e.blendMode);return i.uuid=e.uuid,i}static toJSON(e){let t=[],n=e.tracks,r={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode};for(let e=0,r=n.length;e!==r;++e)t.push(hc.toJSON(n[e]));return r}static CreateFromMorphTargetSequence(e,t,n,r){let i=t.length,a=[];for(let e=0;e<i;e++){let o=[],s=[];o.push((e+i-1)%i,e,(e+1)%i),s.push(0,1,0);let c=cc(o);o=lc(o,1,c),s=lc(s,1,c),!r&&o[0]===0&&(o.push(i),s.push(s[0])),a.push(new vc(`.morphTargetInfluences[`+t[e].name+`]`,o,s).scale(1/n))}return new this(e,-1,a)}static findByName(e,t){let n=e;if(!Array.isArray(e)){let t=e;n=t.geometry&&t.geometry.animations||t.animations}for(let e=0;e<n.length;e++)if(n[e].name===t)return n[e];return null}static CreateClipsFromMorphTargetSequences(e,t,n){let r={},i=/^([\w-]*?)([\d]+)$/;for(let t=0,n=e.length;t<n;t++){let n=e[t],a=n.name.match(i);if(a&&a.length>1){let e=a[1],t=r[e];t||(r[e]=t=[]),t.push(n)}}let a=[];for(let e in r)a.push(this.CreateFromMorphTargetSequence(e,r[e],t,n));return a}static parseAnimation(e,t){if(!e)return console.error(`THREE.AnimationClip: No animation in JSONLoader data.`),null;let n=function(e,t,n,r,i){if(n.length!==0){let a=[],o=[];uc(n,a,o,r),a.length!==0&&i.push(new e(t,a,o))}},r=[],i=e.name||`default`,a=e.fps||30,o=e.blendMode,s=e.length||-1,c=e.hierarchy||[];for(let e=0;e<c.length;e++){let i=c[e].keys;if(i&&i.length!==0){if(i[0].morphTargets){let e={},t=0;for(;t<i.length;t++)if(i[t].morphTargets)for(let n=0;n<i[t].morphTargets.length;n++)e[i[t].morphTargets[n]]=-1;for(let n in e){let e=[],a=[];for(let r=0;r!==i[t].morphTargets.length;++r){let r=i[t];e.push(r.time),a.push(+(r.morphTarget===n))}r.push(new vc(`.morphTargetInfluence[`+n+`]`,e,a))}s=e.length*a}else{let a=`.bones[`+t[e].name+`]`;n(Sc,a+`.position`,i,`pos`,r),n(bc,a+`.quaternion`,i,`rot`,r),n(Sc,a+`.scale`,i,`scl`,r)}}}return r.length===0?null:new this(i,s,r,o)}resetDuration(){let e=this.tracks,t=0;for(let n=0,r=e.length;n!==r;++n){let e=this.tracks[n];t=Math.max(t,e.times[e.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e&&=this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){let e=[];for(let t=0;t<this.tracks.length;t++)e.push(this.tracks[t].clone());return new this.constructor(this.name,this.duration,e,this.blendMode)}toJSON(){return this.constructor.toJSON(this)}};function wc(e){switch(e.toLowerCase()){case`scalar`:case`double`:case`float`:case`number`:case`integer`:return vc;case`vector`:case`vector2`:case`vector3`:case`vector4`:return Sc;case`color`:return _c;case`quaternion`:return bc;case`bool`:case`boolean`:return gc;case`string`:return xc}throw Error(`THREE.KeyframeTrack: Unsupported typeName: `+e)}function Tc(e){if(e.type===void 0)throw Error(`THREE.KeyframeTrack: track type undefined, can not parse`);let t=wc(e.type);if(e.times===void 0){let t=[],n=[];uc(e.keys,t,n,`value`),e.times=t,e.values=n}return t.parse===void 0?new t(e.name,e.times,e.values,e.interpolation):t.parse(e)}var Ec={enabled:!1,files:{},add:function(e,t){this.enabled!==!1&&(this.files[e]=t)},get:function(e){if(this.enabled!==!1)return this.files[e]},remove:function(e){delete this.files[e]},clear:function(){this.files={}}},Dc=class{constructor(e,t,n){let r=this,i=!1,a=0,o=0,s,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this.itemStart=function(e){o++,i===!1&&r.onStart!==void 0&&r.onStart(e,a,o),i=!0},this.itemEnd=function(e){a++,r.onProgress!==void 0&&r.onProgress(e,a,o),a===o&&(i=!1,r.onLoad!==void 0&&r.onLoad())},this.itemError=function(e){r.onError!==void 0&&r.onError(e)},this.resolveURL=function(e){return s?s(e):e},this.setURLModifier=function(e){return s=e,this},this.addHandler=function(e,t){return c.push(e,t),this},this.removeHandler=function(e){let t=c.indexOf(e);return t!==-1&&c.splice(t,2),this},this.getHandler=function(e){for(let t=0,n=c.length;t<n;t+=2){let n=c[t],r=c[t+1];if(n.global&&(n.lastIndex=0),n.test(e))return r}return null}}},Oc=new Dc,kc=class{constructor(e){this.manager=e===void 0?Oc:e,this.crossOrigin=`anonymous`,this.withCredentials=!1,this.path=``,this.resourcePath=``,this.requestHeader={}}load(){}loadAsync(e,t){let n=this;return new Promise(function(r,i){n.load(e,r,t,i)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}};kc.DEFAULT_MATERIAL_NAME=`__DEFAULT`;var Ac={},jc=class extends Error{constructor(e,t){super(e),this.response=t}},Mc=class extends kc{constructor(e){super(e)}load(e,t,n,r){e===void 0&&(e=``),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let i=Ec.get(e);if(i!==void 0)return this.manager.itemStart(e),setTimeout(()=>{t&&t(i),this.manager.itemEnd(e)},0),i;if(Ac[e]!==void 0){Ac[e].push({onLoad:t,onProgress:n,onError:r});return}Ac[e]=[],Ac[e].push({onLoad:t,onProgress:n,onError:r});let a=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?`include`:`same-origin`}),o=this.mimeType,s=this.responseType;fetch(a).then(t=>{if(t.status===200||t.status===0){if(t.status===0&&console.warn(`THREE.FileLoader: HTTP Status 0 received.`),typeof ReadableStream>`u`||t.body===void 0||t.body.getReader===void 0)return t;let n=Ac[e],r=t.body.getReader(),i=t.headers.get(`Content-Length`)||t.headers.get(`X-File-Size`),a=i?parseInt(i):0,o=a!==0,s=0,c=new ReadableStream({start(e){t();function t(){r.read().then(({done:r,value:i})=>{if(r)e.close();else{s+=i.byteLength;let r=new ProgressEvent(`progress`,{lengthComputable:o,loaded:s,total:a});for(let e=0,t=n.length;e<t;e++){let t=n[e];t.onProgress&&t.onProgress(r)}e.enqueue(i),t()}})}}});return new Response(c)}throw new jc(`fetch for "${t.url}" responded with ${t.status}: ${t.statusText}`,t)}).then(e=>{switch(s){case`arraybuffer`:return e.arrayBuffer();case`blob`:return e.blob();case`document`:return e.text().then(e=>new DOMParser().parseFromString(e,o));case`json`:return e.json();default:if(o===void 0)return e.text();{let t=/charset="?([^;"\s]*)"?/i.exec(o),n=t&&t[1]?t[1].toLowerCase():void 0,r=new TextDecoder(n);return e.arrayBuffer().then(e=>r.decode(e))}}}).then(t=>{Ec.add(e,t);let n=Ac[e];delete Ac[e];for(let e=0,r=n.length;e<r;e++){let r=n[e];r.onLoad&&r.onLoad(t)}}).catch(t=>{let n=Ac[e];if(n===void 0)throw this.manager.itemError(e),t;delete Ac[e];for(let e=0,r=n.length;e<r;e++){let r=n[e];r.onError&&r.onError(t)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}},Nc=class extends kc{constructor(e){super(e)}load(e,t,n,r){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let i=this,a=Ec.get(e);if(a!==void 0)return i.manager.itemStart(e),setTimeout(function(){t&&t(a),i.manager.itemEnd(e)},0),a;let o=Xe(`img`);function s(){l(),Ec.add(e,this),t&&t(this),i.manager.itemEnd(e)}function c(t){l(),r&&r(t),i.manager.itemError(e),i.manager.itemEnd(e)}function l(){o.removeEventListener(`load`,s,!1),o.removeEventListener(`error`,c,!1)}return o.addEventListener(`load`,s,!1),o.addEventListener(`error`,c,!1),e.slice(0,5)!==`data:`&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),i.manager.itemStart(e),o.src=e,o}},Pc=class extends kc{constructor(e){super(e)}load(e,t,n,r){let i=this,a=new xs,s=new Mc(this.manager);return s.setResponseType(`arraybuffer`),s.setRequestHeader(this.requestHeader),s.setPath(this.path),s.setWithCredentials(i.withCredentials),s.load(e,function(e){let n;try{n=i.parse(e)}catch(e){if(r!==void 0)r(e);else{console.error(e);return}}n.image===void 0?n.data!==void 0&&(a.image.width=n.width,a.image.height=n.height,a.image.data=n.data):a.image=n.image,a.wrapS=n.wrapS===void 0?o:n.wrapS,a.wrapT=n.wrapT===void 0?o:n.wrapT,a.magFilter=n.magFilter===void 0?d:n.magFilter,a.minFilter=n.minFilter===void 0?d:n.minFilter,a.anisotropy=n.anisotropy===void 0?1:n.anisotropy,n.colorSpace!==void 0&&(a.colorSpace=n.colorSpace),n.flipY!==void 0&&(a.flipY=n.flipY),n.format!==void 0&&(a.format=n.format),n.type!==void 0&&(a.type=n.type),n.mipmaps!==void 0&&(a.mipmaps=n.mipmaps,a.minFilter=p),n.mipmapCount===1&&(a.minFilter=d),n.generateMipmaps!==void 0&&(a.generateMipmaps=n.generateMipmaps),a.needsUpdate=!0,t&&t(a,n)},n,r),a}},Fc=class extends kc{constructor(e){super(e)}load(e,t,n,r){let i=new pt,a=new Nc(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(e){i.image=e,i.needsUpdate=!0,t!==void 0&&t(i)},n,r),i}},Ic=class extends Sn{constructor(e,t=1){super(),this.isLight=!0,this.type=`Light`,this.color=new G(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),t}},Lc=new W,Rc=new U,zc=new U,Bc=class{constructor(e){this.camera=e,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new V(512,512),this.map=null,this.mapPass=null,this.matrix=new W,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Qr,this._frameExtents=new V(1,1),this._viewportCount=1,this._viewports=[new mt(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,n=this.matrix;Rc.setFromMatrixPosition(e.matrixWorld),t.position.copy(Rc),zc.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(zc),t.updateMatrixWorld(),Lc.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Lc),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(Lc)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},Vc=class extends Bc{constructor(){super(new Br(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1}updateMatrices(e){let t=this.camera,n=we*2*e.angle*this.focus,r=this.mapSize.width/this.mapSize.height,i=e.distance||t.far;(n!==t.fov||r!==t.aspect||i!==t.far)&&(t.fov=n,t.aspect=r,t.far=i,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}},Hc=class extends Ic{constructor(e,t,n=0,r=Math.PI/3,i=0,a=2){super(e,t),this.isSpotLight=!0,this.type=`SpotLight`,this.position.copy(Sn.DEFAULT_UP),this.updateMatrix(),this.target=new Sn,this.distance=n,this.angle=r,this.penumbra=i,this.decay=a,this.map=null,this.shadow=new Vc}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}},Uc=new W,Wc=new U,Gc=new U,Kc=class extends Bc{constructor(){super(new Br(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new V(4,2),this._viewportCount=6,this._viewports=[new mt(2,1,1,1),new mt(0,1,1,1),new mt(3,1,1,1),new mt(1,1,1,1),new mt(3,0,1,1),new mt(1,0,1,1)],this._cubeDirections=[new U(1,0,0),new U(-1,0,0),new U(0,0,1),new U(0,0,-1),new U(0,1,0),new U(0,-1,0)],this._cubeUps=[new U(0,1,0),new U(0,1,0),new U(0,1,0),new U(0,1,0),new U(0,0,1),new U(0,0,-1)]}updateMatrices(e,t=0){let n=this.camera,r=this.matrix,i=e.distance||n.far;i!==n.far&&(n.far=i,n.updateProjectionMatrix()),Wc.setFromMatrixPosition(e.matrixWorld),n.position.copy(Wc),Gc.copy(n.position),Gc.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(Gc),n.updateMatrixWorld(),r.makeTranslation(-Wc.x,-Wc.y,-Wc.z),Uc.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Uc)}},qc=class extends Ic{constructor(e,t,n=0,r=2){super(e,t),this.isPointLight=!0,this.type=`PointLight`,this.distance=n,this.decay=r,this.shadow=new Kc}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}},Jc=class extends Bc{constructor(){super(new fi(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},Yc=class extends Ic{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type=`DirectionalLight`,this.position.copy(Sn.DEFAULT_UP),this.updateMatrix(),this.target=new Sn,this.shadow=new Jc}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}},Xc=class{constructor(){this.isSphericalHarmonics3=!0,this.coefficients=[];for(let e=0;e<9;e++)this.coefficients.push(new U)}set(e){for(let t=0;t<9;t++)this.coefficients[t].copy(e[t]);return this}zero(){for(let e=0;e<9;e++)this.coefficients[e].set(0,0,0);return this}getAt(e,t){let n=e.x,r=e.y,i=e.z,a=this.coefficients;return t.copy(a[0]).multiplyScalar(.282095),t.addScaledVector(a[1],.488603*r),t.addScaledVector(a[2],.488603*i),t.addScaledVector(a[3],.488603*n),t.addScaledVector(a[4],n*r*1.092548),t.addScaledVector(a[5],r*i*1.092548),t.addScaledVector(a[6],.315392*(3*i*i-1)),t.addScaledVector(a[7],n*i*1.092548),t.addScaledVector(a[8],.546274*(n*n-r*r)),t}getIrradianceAt(e,t){let n=e.x,r=e.y,i=e.z,a=this.coefficients;return t.copy(a[0]).multiplyScalar(.886227),t.addScaledVector(a[1],1.023328*r),t.addScaledVector(a[2],1.023328*i),t.addScaledVector(a[3],1.023328*n),t.addScaledVector(a[4],.858086*n*r),t.addScaledVector(a[5],.858086*r*i),t.addScaledVector(a[6],.743125*i*i-.247708),t.addScaledVector(a[7],.858086*n*i),t.addScaledVector(a[8],.429043*(n*n-r*r)),t}add(e){for(let t=0;t<9;t++)this.coefficients[t].add(e.coefficients[t]);return this}addScaledSH(e,t){for(let n=0;n<9;n++)this.coefficients[n].addScaledVector(e.coefficients[n],t);return this}scale(e){for(let t=0;t<9;t++)this.coefficients[t].multiplyScalar(e);return this}lerp(e,t){for(let n=0;n<9;n++)this.coefficients[n].lerp(e.coefficients[n],t);return this}equals(e){for(let t=0;t<9;t++)if(!this.coefficients[t].equals(e.coefficients[t]))return!1;return!0}copy(e){return this.set(e.coefficients)}clone(){return new this.constructor().copy(this)}fromArray(e,t=0){let n=this.coefficients;for(let r=0;r<9;r++)n[r].fromArray(e,t+r*3);return this}toArray(e=[],t=0){let n=this.coefficients;for(let r=0;r<9;r++)n[r].toArray(e,t+r*3);return e}static getBasisAt(e,t){let n=e.x,r=e.y,i=e.z;t[0]=.282095,t[1]=.488603*r,t[2]=.488603*i,t[3]=.488603*n,t[4]=1.092548*n*r,t[5]=1.092548*r*i,t[6]=.315392*(3*i*i-1),t[7]=1.092548*n*i,t[8]=.546274*(n*n-r*r)}},Zc=class extends Ic{constructor(e=new Xc,t=1){super(void 0,t),this.isLightProbe=!0,this.sh=e}copy(e){return super.copy(e),this.sh.copy(e.sh),this}fromJSON(e){return this.intensity=e.intensity,this.sh.fromArray(e.sh),this}toJSON(e){let t=super.toJSON(e);return t.object.sh=this.sh.toArray(),t}},Qc=class{static decodeText(e){if(typeof TextDecoder<`u`)return new TextDecoder().decode(e);let t=``;for(let n=0,r=e.length;n<r;n++)t+=String.fromCharCode(e[n]);try{return decodeURIComponent(escape(t))}catch{return t}}static extractUrlBase(e){let t=e.lastIndexOf(`/`);return t===-1?`./`:e.slice(0,t+1)}static resolveURL(e,t){return typeof e!=`string`||e===``?``:(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,`$1`)),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}},$c=class extends kc{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>`u`&&console.warn(`THREE.ImageBitmapLoader: createImageBitmap() not supported.`),typeof fetch>`u`&&console.warn(`THREE.ImageBitmapLoader: fetch() not supported.`),this.options={premultiplyAlpha:`none`}}setOptions(e){return this.options=e,this}load(e,t,n,r){e===void 0&&(e=``),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let i=this,a=Ec.get(e);if(a!==void 0){if(i.manager.itemStart(e),a.then){a.then(n=>{t&&t(n),i.manager.itemEnd(e)}).catch(e=>{r&&r(e)});return}return setTimeout(function(){t&&t(a),i.manager.itemEnd(e)},0),a}let o={};o.credentials=this.crossOrigin===`anonymous`?`same-origin`:`include`,o.headers=this.requestHeader;let s=fetch(e,o).then(function(e){return e.blob()}).then(function(e){return createImageBitmap(e,Object.assign(i.options,{colorSpaceConversion:`none`}))}).then(function(n){return Ec.add(e,n),t&&t(n),i.manager.itemEnd(e),n}).catch(function(t){r&&r(t),Ec.remove(e),i.manager.itemError(e),i.manager.itemEnd(e)});Ec.add(e,s),i.manager.itemStart(e)}},el=class{constructor(e,t,n){this.binding=e,this.valueSize=n;let r,i,a;switch(t){case`quaternion`:r=this._slerp,i=this._slerpAdditive,a=this._setAdditiveIdentityQuaternion,this.buffer=new Float64Array(n*6),this._workIndex=5;break;case`string`:case`bool`:r=this._select,i=this._select,a=this._setAdditiveIdentityOther,this.buffer=Array(n*5);break;default:r=this._lerp,i=this._lerpAdditive,a=this._setAdditiveIdentityNumeric,this.buffer=new Float64Array(n*5)}this._mixBufferRegion=r,this._mixBufferRegionAdditive=i,this._setIdentity=a,this._origIndex=3,this._addIndex=4,this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,this.useCount=0,this.referenceCount=0}accumulate(e,t){let n=this.buffer,r=this.valueSize,i=e*r+r,a=this.cumulativeWeight;if(a===0){for(let e=0;e!==r;++e)n[i+e]=n[e];a=t}else{a+=t;let e=t/a;this._mixBufferRegion(n,i,0,e,r)}this.cumulativeWeight=a}accumulateAdditive(e){let t=this.buffer,n=this.valueSize,r=n*this._addIndex;this.cumulativeWeightAdditive===0&&this._setIdentity(),this._mixBufferRegionAdditive(t,r,0,e,n),this.cumulativeWeightAdditive+=e}apply(e){let t=this.valueSize,n=this.buffer,r=e*t+t,i=this.cumulativeWeight,a=this.cumulativeWeightAdditive,o=this.binding;if(this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,i<1){let e=t*this._origIndex;this._mixBufferRegion(n,r,e,1-i,t)}a>0&&this._mixBufferRegionAdditive(n,r,this._addIndex*t,1,t);for(let e=t,i=t+t;e!==i;++e)if(n[e]!==n[e+t]){o.setValue(n,r);break}}saveOriginalState(){let e=this.binding,t=this.buffer,n=this.valueSize,r=n*this._origIndex;e.getValue(t,r);for(let e=n,i=r;e!==i;++e)t[e]=t[r+e%n];this._setIdentity(),this.cumulativeWeight=0,this.cumulativeWeightAdditive=0}restoreOriginalState(){let e=this.valueSize*3;this.binding.setValue(this.buffer,e)}_setAdditiveIdentityNumeric(){let e=this._addIndex*this.valueSize,t=e+this.valueSize;for(let n=e;n<t;n++)this.buffer[n]=0}_setAdditiveIdentityQuaternion(){this._setAdditiveIdentityNumeric(),this.buffer[this._addIndex*this.valueSize+3]=1}_setAdditiveIdentityOther(){let e=this._origIndex*this.valueSize,t=this._addIndex*this.valueSize;for(let n=0;n<this.valueSize;n++)this.buffer[t+n]=this.buffer[e+n]}_select(e,t,n,r,i){if(r>=.5)for(let r=0;r!==i;++r)e[t+r]=e[n+r]}_slerp(e,t,n,r){yt.slerpFlat(e,t,e,t,e,n,r)}_slerpAdditive(e,t,n,r,i){let a=this._workIndex*i;yt.multiplyQuaternionsFlat(e,a,e,t,e,n),yt.slerpFlat(e,t,e,t,e,a,r)}_lerp(e,t,n,r,i){let a=1-r;for(let o=0;o!==i;++o){let i=t+o;e[i]=e[i]*a+e[n+o]*r}}_lerpAdditive(e,t,n,r,i){for(let a=0;a!==i;++a){let i=t+a;e[i]=e[i]+e[n+a]*r}}},tl=`\\[\\]\\.:\\/`,nl=RegExp(`[\\[\\]\\.:\\/]`,`g`),rl=`[^\\[\\]\\.:\\/]`,il=`[^`+tl.replace(`\\.`,``)+`]`,al=`((?:WC+[\\/:])*)`.replace(`WC`,rl),ol=`(WCOD+)?`.replace(`WCOD`,il),sl=`(?:\\.(WC+)(?:\\[(.+)\\])?)?`.replace(`WC`,rl),cl=`\\.(WC+)(?:\\[(.+)\\])?`.replace(`WC`,rl),ll=RegExp(`^`+al+ol+sl+cl+`$`),ul=[`material`,`materials`,`bones`,`map`],dl=class{constructor(e,t,n){let r=n||fl.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,r)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,r=this._bindings[n];r!==void 0&&r.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let r=this._targetGroup.nCachedObjects_,i=n.length;r!==i;++r)n[r].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},fl=class e{constructor(t,n,r){this.path=n,this.parsedPath=r||e.parseTrackName(n),this.node=e.findNode(t,this.parsedPath.nodeName),this.rootNode=t,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(t,n,r){return t&&t.isAnimationObjectGroup?new e.Composite(t,n,r):new e(t,n,r)}static sanitizeNodeName(e){return e.replace(/\s/g,`_`).replace(nl,``)}static parseTrackName(e){let t=ll.exec(e);if(t===null)throw Error(`PropertyBinding: Cannot parse trackName: `+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},r=n.nodeName&&n.nodeName.lastIndexOf(`.`);if(r!==void 0&&r!==-1){let e=n.nodeName.substring(r+1);ul.indexOf(e)!==-1&&(n.nodeName=n.nodeName.substring(0,r),n.objectName=e)}if(n.propertyName===null||n.propertyName.length===0)throw Error(`PropertyBinding: can not parse propertyName from trackName: `+e);return n}static findNode(e,t){if(t===void 0||t===``||t===`.`||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(e){for(let r=0;r<e.length;r++){let i=e[r];if(i.name===t||i.uuid===t)return i;let a=n(i.children);if(a)return a}return null},r=n(e.children);if(r)return r}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)e[t++]=n[r]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let r=0,i=n.length;r!==i;++r)n[r]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let t=this.node,n=this.parsedPath,r=n.objectName,i=n.propertyName,a=n.propertyIndex;if(t||(t=e.findNode(this.rootNode,n.nodeName),this.node=t),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!t){console.warn(`THREE.PropertyBinding: No target node found for track: `+this.path+`.`);return}if(r){let e=n.objectIndex;switch(r){case`materials`:if(!t.material){console.error(`THREE.PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.materials){console.error(`THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.`,this);return}t=t.material.materials;break;case`bones`:if(!t.skeleton){console.error(`THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.`,this);return}t=t.skeleton.bones;for(let n=0;n<t.length;n++)if(t[n].name===e){e=n;break}break;case`map`:if(`map`in t){t=t.map;break}if(!t.material){console.error(`THREE.PropertyBinding: Can not bind to material as node does not have a material.`,this);return}if(!t.material.map){console.error(`THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.`,this);return}t=t.material.map;break;default:if(t[r]===void 0){console.error(`THREE.PropertyBinding: Can not bind to objectName of node undefined.`,this);return}t=t[r]}if(e!==void 0){if(t[e]===void 0){console.error(`THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.`,this,t);return}t=t[e]}}let o=t[i];if(o===void 0){let e=n.nodeName;console.error(`THREE.PropertyBinding: Trying to update property for track: `+e+`.`+i+` but it wasn't found.`,t);return}let s=this.Versioning.None;this.targetObject=t,t.needsUpdate===void 0?t.matrixWorldNeedsUpdate!==void 0&&(s=this.Versioning.MatrixWorldNeedsUpdate):s=this.Versioning.NeedsUpdate;let c=this.BindingType.Direct;if(a!==void 0){if(i===`morphTargetInfluences`){if(!t.geometry){console.error(`THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.`,this);return}if(!t.geometry.morphAttributes){console.error(`THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.`,this);return}t.morphTargetDictionary[a]!==void 0&&(a=t.morphTargetDictionary[a])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=a}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][s]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};fl.Composite=dl,fl.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3},fl.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2},fl.prototype.GetterByBindingType=[fl.prototype._getValue_direct,fl.prototype._getValue_array,fl.prototype._getValue_arrayElement,fl.prototype._getValue_toArray],fl.prototype.SetterByBindingTypeAndVersioning=[[fl.prototype._setValue_direct,fl.prototype._setValue_direct_setNeedsUpdate,fl.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[fl.prototype._setValue_array,fl.prototype._setValue_array_setNeedsUpdate,fl.prototype._setValue_array_setMatrixWorldNeedsUpdate],[fl.prototype._setValue_arrayElement,fl.prototype._setValue_arrayElement_setNeedsUpdate,fl.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[fl.prototype._setValue_fromArray,fl.prototype._setValue_fromArray_setNeedsUpdate,fl.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var pl=class{constructor(e,t,n=null,r=t.blendMode){this._mixer=e,this._clip=t,this._localRoot=n,this.blendMode=r;let i=t.tracks,a=i.length,o=Array(a),s={endingStart:se,endingEnd:se};for(let e=0;e!==a;++e){let t=i[e].createInterpolant(null);o[e]=t,t.settings=s}this._interpolantSettings=s,this._interpolants=o,this._propertyBindings=Array(a),this._cacheIndex=null,this._byClipCacheIndex=null,this._timeScaleInterpolant=null,this._weightInterpolant=null,this.loop=ie,this._loopCount=-1,this._startTime=null,this.time=0,this.timeScale=1,this._effectiveTimeScale=1,this.weight=1,this._effectiveWeight=1,this.repetitions=1/0,this.paused=!1,this.enabled=!0,this.clampWhenFinished=!1,this.zeroSlopeAtStart=!0,this.zeroSlopeAtEnd=!0}play(){return this._mixer._activateAction(this),this}stop(){return this._mixer._deactivateAction(this),this.reset()}reset(){return this.paused=!1,this.enabled=!0,this.time=0,this._loopCount=-1,this._startTime=null,this.stopFading().stopWarping()}isRunning(){return this.enabled&&!this.paused&&this.timeScale!==0&&this._startTime===null&&this._mixer._isActiveAction(this)}isScheduled(){return this._mixer._isActiveAction(this)}startAt(e){return this._startTime=e,this}setLoop(e,t){return this.loop=e,this.repetitions=t,this}setEffectiveWeight(e){return this.weight=e,this._effectiveWeight=this.enabled?e:0,this.stopFading()}getEffectiveWeight(){return this._effectiveWeight}fadeIn(e){return this._scheduleFading(e,0,1)}fadeOut(e){return this._scheduleFading(e,1,0)}crossFadeFrom(e,t,n){if(e.fadeOut(t),this.fadeIn(t),n){let n=this._clip.duration,r=e._clip.duration,i=r/n,a=n/r;e.warp(1,i,t),this.warp(a,1,t)}return this}crossFadeTo(e,t,n){return e.crossFadeFrom(this,t,n)}stopFading(){let e=this._weightInterpolant;return e!==null&&(this._weightInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this}setEffectiveTimeScale(e){return this.timeScale=e,this._effectiveTimeScale=this.paused?0:e,this.stopWarping()}getEffectiveTimeScale(){return this._effectiveTimeScale}setDuration(e){return this.timeScale=this._clip.duration/e,this.stopWarping()}syncWith(e){return this.time=e.time,this.timeScale=e.timeScale,this.stopWarping()}halt(e){return this.warp(this._effectiveTimeScale,0,e)}warp(e,t,n){let r=this._mixer,i=r.time,a=this.timeScale,o=this._timeScaleInterpolant;o===null&&(o=r._lendControlInterpolant(),this._timeScaleInterpolant=o);let s=o.parameterPositions,c=o.sampleValues;return s[0]=i,s[1]=i+n,c[0]=e/a,c[1]=t/a,this}stopWarping(){let e=this._timeScaleInterpolant;return e!==null&&(this._timeScaleInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this}getMixer(){return this._mixer}getClip(){return this._clip}getRoot(){return this._localRoot||this._mixer._root}_update(e,t,n,r){if(!this.enabled){this._updateWeight(e);return}let i=this._startTime;if(i!==null){let r=(e-i)*n;r<0||n===0?t=0:(this._startTime=null,t=n*r)}t*=this._updateTimeScale(e);let a=this._updateTime(t),o=this._updateWeight(e);if(o>0){let e=this._interpolants,t=this._propertyBindings;switch(this.blendMode){case de:for(let n=0,r=e.length;n!==r;++n)e[n].evaluate(a),t[n].accumulateAdditive(o);break;case ue:default:for(let n=0,i=e.length;n!==i;++n)e[n].evaluate(a),t[n].accumulate(r,o)}}}_updateWeight(e){let t=0;if(this.enabled){t=this.weight;let n=this._weightInterpolant;if(n!==null){let r=n.evaluate(e)[0];t*=r,e>n.parameterPositions[1]&&(this.stopFading(),r===0&&(this.enabled=!1))}}return this._effectiveWeight=t,t}_updateTimeScale(e){let t=0;if(!this.paused){t=this.timeScale;let n=this._timeScaleInterpolant;if(n!==null){let r=n.evaluate(e)[0];t*=r,e>n.parameterPositions[1]&&(this.stopWarping(),t===0?this.paused=!0:this.timeScale=t)}}return this._effectiveTimeScale=t,t}_updateTime(e){let t=this._clip.duration,n=this.loop,r=this.time+e,i=this._loopCount,a=n===ae;if(e===0)return i===-1?r:a&&(i&1)==1?t-r:r;if(n===2200){i===-1&&(this._loopCount=0,this._setEndings(!0,!0,!1));handle_stop:{if(r>=t)r=t;else if(r<0)r=0;else{this.time=r;break handle_stop}this.clampWhenFinished?this.paused=!0:this.enabled=!1,this.time=r,this._mixer.dispatchEvent({type:`finished`,action:this,direction:e<0?-1:1})}}else{if(i===-1&&(e>=0?(i=0,this._setEndings(!0,this.repetitions===0,a)):this._setEndings(this.repetitions===0,!0,a)),r>=t||r<0){let n=Math.floor(r/t);r-=t*n,i+=Math.abs(n);let o=this.repetitions-i;if(o<=0)this.clampWhenFinished?this.paused=!0:this.enabled=!1,r=e>0?t:0,this.time=r,this._mixer.dispatchEvent({type:`finished`,action:this,direction:e>0?1:-1});else{if(o===1){let t=e<0;this._setEndings(t,!t,a)}else this._setEndings(!1,!1,a);this._loopCount=i,this.time=r,this._mixer.dispatchEvent({type:`loop`,action:this,loopDelta:n})}}else this.time=r;if(a&&(i&1)==1)return t-r}return r}_setEndings(e,t,n){let r=this._interpolantSettings;n?(r.endingStart=ce,r.endingEnd=ce):(r.endingStart=e?this.zeroSlopeAtStart?ce:se:le,r.endingEnd=t?this.zeroSlopeAtEnd?ce:se:le)}_scheduleFading(e,t,n){let r=this._mixer,i=r.time,a=this._weightInterpolant;a===null&&(a=r._lendControlInterpolant(),this._weightInterpolant=a);let o=a.parameterPositions,s=a.sampleValues;return o[0]=i,s[0]=t,o[1]=i+e,s[1]=n,this}},ml=new Float32Array(1),hl=class extends be{constructor(e){super(),this._root=e,this._initMemoryManager(),this._accuIndex=0,this.time=0,this.timeScale=1}_bindAction(e,t){let n=e._localRoot||this._root,r=e._clip.tracks,i=r.length,a=e._propertyBindings,o=e._interpolants,s=n.uuid,c=this._bindingsByRootAndName,l=c[s];l===void 0&&(l={},c[s]=l);for(let e=0;e!==i;++e){let i=r[e],c=i.name,u=l[c];if(u!==void 0)++u.referenceCount,a[e]=u;else{if(u=a[e],u!==void 0){u._cacheIndex===null&&(++u.referenceCount,this._addInactiveBinding(u,s,c));continue}let r=t&&t._propertyBindings[e].binding.parsedPath;u=new el(fl.create(n,c,r),i.ValueTypeName,i.getValueSize()),++u.referenceCount,this._addInactiveBinding(u,s,c),a[e]=u}o[e].resultBuffer=u.buffer}}_activateAction(e){if(!this._isActiveAction(e)){if(e._cacheIndex===null){let t=(e._localRoot||this._root).uuid,n=e._clip.uuid,r=this._actionsByClip[n];this._bindAction(e,r&&r.knownActions[0]),this._addInactiveAction(e,n,t)}let t=e._propertyBindings;for(let e=0,n=t.length;e!==n;++e){let n=t[e];n.useCount++===0&&(this._lendBinding(n),n.saveOriginalState())}this._lendAction(e)}}_deactivateAction(e){if(this._isActiveAction(e)){let t=e._propertyBindings;for(let e=0,n=t.length;e!==n;++e){let n=t[e];--n.useCount===0&&(n.restoreOriginalState(),this._takeBackBinding(n))}this._takeBackAction(e)}}_initMemoryManager(){this._actions=[],this._nActiveActions=0,this._actionsByClip={},this._bindings=[],this._nActiveBindings=0,this._bindingsByRootAndName={},this._controlInterpolants=[],this._nActiveControlInterpolants=0;let e=this;this.stats={actions:{get total(){return e._actions.length},get inUse(){return e._nActiveActions}},bindings:{get total(){return e._bindings.length},get inUse(){return e._nActiveBindings}},controlInterpolants:{get total(){return e._controlInterpolants.length},get inUse(){return e._nActiveControlInterpolants}}}}_isActiveAction(e){let t=e._cacheIndex;return t!==null&&t<this._nActiveActions}_addInactiveAction(e,t,n){let r=this._actions,i=this._actionsByClip,a=i[t];if(a===void 0)a={knownActions:[e],actionByRoot:{}},e._byClipCacheIndex=0,i[t]=a;else{let t=a.knownActions;e._byClipCacheIndex=t.length,t.push(e)}e._cacheIndex=r.length,r.push(e),a.actionByRoot[n]=e}_removeInactiveAction(e){let t=this._actions,n=t[t.length-1],r=e._cacheIndex;n._cacheIndex=r,t[r]=n,t.pop(),e._cacheIndex=null;let i=e._clip.uuid,a=this._actionsByClip,o=a[i],s=o.knownActions,c=s[s.length-1],l=e._byClipCacheIndex;c._byClipCacheIndex=l,s[l]=c,s.pop(),e._byClipCacheIndex=null;let u=o.actionByRoot,d=(e._localRoot||this._root).uuid;delete u[d],s.length===0&&delete a[i],this._removeInactiveBindingsForAction(e)}_removeInactiveBindingsForAction(e){let t=e._propertyBindings;for(let e=0,n=t.length;e!==n;++e){let n=t[e];--n.referenceCount===0&&this._removeInactiveBinding(n)}}_lendAction(e){let t=this._actions,n=e._cacheIndex,r=this._nActiveActions++,i=t[r];e._cacheIndex=r,t[r]=e,i._cacheIndex=n,t[n]=i}_takeBackAction(e){let t=this._actions,n=e._cacheIndex,r=--this._nActiveActions,i=t[r];e._cacheIndex=r,t[r]=e,i._cacheIndex=n,t[n]=i}_addInactiveBinding(e,t,n){let r=this._bindingsByRootAndName,i=this._bindings,a=r[t];a===void 0&&(a={},r[t]=a),a[n]=e,e._cacheIndex=i.length,i.push(e)}_removeInactiveBinding(e){let t=this._bindings,n=e.binding,r=n.rootNode.uuid,i=n.path,a=this._bindingsByRootAndName,o=a[r],s=t[t.length-1],c=e._cacheIndex;s._cacheIndex=c,t[c]=s,t.pop(),delete o[i],Object.keys(o).length===0&&delete a[r]}_lendBinding(e){let t=this._bindings,n=e._cacheIndex,r=this._nActiveBindings++,i=t[r];e._cacheIndex=r,t[r]=e,i._cacheIndex=n,t[n]=i}_takeBackBinding(e){let t=this._bindings,n=e._cacheIndex,r=--this._nActiveBindings,i=t[r];e._cacheIndex=r,t[r]=e,i._cacheIndex=n,t[n]=i}_lendControlInterpolant(){let e=this._controlInterpolants,t=this._nActiveControlInterpolants++,n=e[t];return n===void 0&&(n=new pc(new Float32Array(2),new Float32Array(2),1,ml),n.__cacheIndex=t,e[t]=n),n}_takeBackControlInterpolant(e){let t=this._controlInterpolants,n=e.__cacheIndex,r=--this._nActiveControlInterpolants,i=t[r];e.__cacheIndex=r,t[r]=e,i.__cacheIndex=n,t[n]=i}clipAction(e,t,n){let r=t||this._root,i=r.uuid,a=typeof e==`string`?Cc.findByName(r,e):e,o=a===null?e:a.uuid,s=this._actionsByClip[o],c=null;if(n===void 0&&(n=a===null?ue:a.blendMode),s!==void 0){let e=s.actionByRoot[i];if(e!==void 0&&e.blendMode===n)return e;c=s.knownActions[0],a===null&&(a=c._clip)}if(a===null)return null;let l=new pl(this,a,t,n);return this._bindAction(l,c),this._addInactiveAction(l,o,i),l}existingAction(e,t){let n=t||this._root,r=n.uuid,i=typeof e==`string`?Cc.findByName(n,e):e,a=i?i.uuid:e,o=this._actionsByClip[a];return o===void 0?null:o.actionByRoot[r]||null}stopAllAction(){let e=this._actions,t=this._nActiveActions;for(let n=t-1;n>=0;--n)e[n].stop();return this}update(e){e*=this.timeScale;let t=this._actions,n=this._nActiveActions,r=this.time+=e,i=Math.sign(e),a=this._accuIndex^=1;for(let o=0;o!==n;++o)t[o]._update(r,e,i,a);let o=this._bindings,s=this._nActiveBindings;for(let e=0;e!==s;++e)o[e].apply(a);return this}setTime(e){this.time=0;for(let e=0;e<this._actions.length;e++)this._actions[e].time=0;return this.update(e)}getRoot(){return this._root}uncacheClip(e){let t=this._actions,n=e.uuid,r=this._actionsByClip,i=r[n];if(i!==void 0){let e=i.knownActions;for(let n=0,r=e.length;n!==r;++n){let r=e[n];this._deactivateAction(r);let i=r._cacheIndex,a=t[t.length-1];r._cacheIndex=null,r._byClipCacheIndex=null,a._cacheIndex=i,t[i]=a,t.pop(),this._removeInactiveBindingsForAction(r)}delete r[n]}}uncacheRoot(e){let t=e.uuid,n=this._actionsByClip;for(let e in n){let r=n[e].actionByRoot[t];r!==void 0&&(this._deactivateAction(r),this._removeInactiveAction(r))}let r=this._bindingsByRootAndName[t];if(r!==void 0)for(let e in r){let t=r[e];t.restoreOriginalState(),this._removeInactiveBinding(t)}}uncacheAction(e,t){let n=this.existingAction(e,t);n!==null&&(this._deactivateAction(n),this._removeInactiveAction(n))}},gl=class e{constructor(e){this.value=e}clone(){return new e(this.value.clone===void 0?this.value:this.value.clone())}},_l=new W,vl=class{constructor(e,t,n=0,r=1/0){this.ray=new Jt(e,t),this.near=n,this.far=r,this.camera=null,this.layers=new on,this.params={Mesh:{},Line:{threshold:1},LOD:{},Points:{threshold:1},Sprite:{}}}set(e,t){this.ray.set(e,t)}setFromCamera(e,t){t.isPerspectiveCamera?(this.ray.origin.setFromMatrixPosition(t.matrixWorld),this.ray.direction.set(e.x,e.y,.5).unproject(t).sub(this.ray.origin).normalize(),this.camera=t):t.isOrthographicCamera?(this.ray.origin.set(e.x,e.y,(t.near+t.far)/(t.near-t.far)).unproject(t),this.ray.direction.set(0,0,-1).transformDirection(t.matrixWorld),this.camera=t):console.error(`THREE.Raycaster: Unsupported camera type: `+t.type)}setFromXRController(e){return _l.identity().extractRotation(e.matrixWorld),this.ray.origin.setFromMatrixPosition(e.matrixWorld),this.ray.direction.set(0,0,-1).applyMatrix4(_l),this}intersectObject(e,t=!0,n=[]){return bl(e,this,n,t),n.sort(yl),n}intersectObjects(e,t=!0,n=[]){for(let r=0,i=e.length;r<i;r++)bl(e[r],this,n,t);return n.sort(yl),n}};function yl(e,t){return e.distance-t.distance}function bl(e,t,n,r){if(e.layers.test(t.layers)&&e.raycast(t,n),r===!0){let r=e.children;for(let e=0,i=r.length;e<i;e++)bl(r[e],t,n,!0)}}var xl=class{constructor(e=1,t=0,n=0){return this.radius=e,this.phi=t,this.theta=n,this}set(e,t,n){return this.radius=e,this.phi=t,this.theta=n,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){let e=1e-6;return this.phi=Math.max(e,Math.min(Math.PI-e,this.phi)),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,n){return this.radius=Math.sqrt(e*e+t*t+n*n),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,n),this.phi=Math.acos(Ee(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};typeof __THREE_DEVTOOLS__<`u`&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent(`register`,{detail:{revision:`163`}})),typeof window<`u`&&(window.__THREE__?console.warn(`WARNING: Multiple instances of Three.js being imported.`):window.__THREE__=`163`);var Sl=window,Cl=Sl.ShadowRoot&&(Sl.ShadyCSS===void 0||Sl.ShadyCSS.nativeShadow)&&`adoptedStyleSheets`in Document.prototype&&`replace`in CSSStyleSheet.prototype,wl=Symbol(),Tl=new WeakMap,El=class{constructor(e,t,n){if(this._$cssResult$=!0,n!==wl)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(Cl&&e===void 0){let n=t!==void 0&&t.length===1;n&&(e=Tl.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),n&&Tl.set(t,e))}return e}toString(){return this.cssText}},Dl=e=>new El(typeof e==`string`?e:e+``,void 0,wl),Ol=(e,t)=>{Cl?e.adoptedStyleSheets=t.map((e=>e instanceof CSSStyleSheet?e:e.styleSheet)):t.forEach((t=>{let n=document.createElement(`style`),r=Sl.litNonce;r!==void 0&&n.setAttribute(`nonce`,r),n.textContent=t.cssText,e.appendChild(n)}))},kl=Cl?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t=``;for(let n of e.cssRules)t+=n.cssText;return Dl(t)})(e):e,Al=window,jl=Al.trustedTypes,Ml=jl?jl.emptyScript:``,Nl=Al.reactiveElementPolyfillSupport,Pl={toAttribute(e,t){switch(t){case Boolean:e=e?Ml:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let n=e;switch(t){case Boolean:n=e!==null;break;case Number:n=e===null?null:Number(e);break;case Object:case Array:try{n=JSON.parse(e)}catch{n=null}}return n}},Fl=(e,t)=>t!==e&&(t==t||e==e),Il={attribute:!0,type:String,converter:Pl,reflect:!1,hasChanged:Fl},Ll=`finalized`,Rl=class extends HTMLElement{constructor(){super(),this._$Ei=new Map,this.isUpdatePending=!1,this.hasUpdated=!1,this._$El=null,this._$Eu()}static addInitializer(e){this.finalize(),(this.h??=[]).push(e)}static get observedAttributes(){this.finalize();let e=[];return this.elementProperties.forEach(((t,n)=>{let r=this._$Ep(n,t);r!==void 0&&(this._$Ev.set(r,n),e.push(r))})),e}static createProperty(e,t=Il){if(t.state&&(t.attribute=!1),this.finalize(),this.elementProperties.set(e,t),!t.noAccessor&&!this.prototype.hasOwnProperty(e)){let n=typeof e==`symbol`?Symbol():`__`+e,r=this.getPropertyDescriptor(e,n,t);r!==void 0&&Object.defineProperty(this.prototype,e,r)}}static getPropertyDescriptor(e,t,n){return{get(){return this[t]},set(r){let i=this[e];this[t]=r,this.requestUpdate(e,i,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)||Il}static finalize(){if(this.hasOwnProperty(Ll))return!1;this[Ll]=!0;let e=Object.getPrototypeOf(this);if(e.finalize(),e.h!==void 0&&(this.h=[...e.h]),this.elementProperties=new Map(e.elementProperties),this._$Ev=new Map,this.hasOwnProperty(`properties`)){let e=this.properties,t=[...Object.getOwnPropertyNames(e),...Object.getOwnPropertySymbols(e)];for(let n of t)this.createProperty(n,e[n])}return this.elementStyles=this.finalizeStyles(this.styles),!0}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let n=new Set(e.flat(1/0).reverse());for(let e of n)t.unshift(kl(e))}else e!==void 0&&t.push(kl(e));return t}static _$Ep(e,t){let n=t.attribute;return!1===n?void 0:typeof n==`string`?n:typeof e==`string`?e.toLowerCase():void 0}_$Eu(){var e;this._$E_=new Promise((e=>this.enableUpdating=e)),this._$AL=new Map,this._$Eg(),this.requestUpdate(),(e=this.constructor.h)==null||e.forEach((e=>e(this)))}addController(e){var t;(this._$ES??=[]).push(e),this.renderRoot!==void 0&&this.isConnected&&((t=e.hostConnected)==null||t.call(e))}removeController(e){var t;(t=this._$ES)==null||t.splice(this._$ES.indexOf(e)>>>0,1)}_$Eg(){this.constructor.elementProperties.forEach(((e,t)=>{this.hasOwnProperty(t)&&(this._$Ei.set(t,this[t]),delete this[t])}))}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Ol(e,this.constructor.elementStyles),e}connectedCallback(){var e;this.renderRoot===void 0&&(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(e=this._$ES)==null||e.forEach((e=>e.hostConnected?.call(e)))}enableUpdating(e){}disconnectedCallback(){var e;(e=this._$ES)==null||e.forEach((e=>e.hostDisconnected?.call(e)))}attributeChangedCallback(e,t,n){this._$AK(e,n)}_$EO(e,t,n=Il){let r=this.constructor._$Ep(e,n);if(r!==void 0&&!0===n.reflect){let i=(n.converter?.toAttribute===void 0?Pl:n.converter).toAttribute(t,n.type);this._$El=e,i==null?this.removeAttribute(r):this.setAttribute(r,i),this._$El=null}}_$AK(e,t){let n=this.constructor,r=n._$Ev.get(e);if(r!==void 0&&this._$El!==r){let e=n.getPropertyOptions(r),i=typeof e.converter==`function`?{fromAttribute:e.converter}:e.converter?.fromAttribute===void 0?Pl:e.converter;this._$El=r,this[r]=i.fromAttribute(t,e.type),this._$El=null}}requestUpdate(e,t,n){let r=!0;e!==void 0&&(((n||=this.constructor.getPropertyOptions(e)).hasChanged||Fl)(this[e],t)?(this._$AL.has(e)||this._$AL.set(e,t),!0===n.reflect&&this._$El!==e&&(this._$EC===void 0&&(this._$EC=new Map),this._$EC.set(e,n))):r=!1),!this.isUpdatePending&&r&&(this._$E_=this._$Ej())}async _$Ej(){this.isUpdatePending=!0;try{await this._$E_}catch(e){Promise.reject(e)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var e;if(!this.isUpdatePending)return;this.hasUpdated,this._$Ei&&=(this._$Ei.forEach(((e,t)=>this[t]=e)),void 0);let t=!1,n=this._$AL;try{t=this.shouldUpdate(n),t?(this.willUpdate(n),(e=this._$ES)==null||e.forEach((e=>e.hostUpdate?.call(e))),this.update(n)):this._$Ek()}catch(e){throw t=!1,this._$Ek(),e}t&&this._$AE(n)}willUpdate(e){}_$AE(e){var t;(t=this._$ES)==null||t.forEach((e=>e.hostUpdated?.call(e))),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$Ek(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$E_}shouldUpdate(e){return!0}update(e){this._$EC!==void 0&&(this._$EC.forEach(((e,t)=>this._$EO(t,this[t],e))),this._$EC=void 0),this._$Ek()}updated(e){}firstUpdated(e){}};Rl[Ll]=!0,Rl.elementProperties=new Map,Rl.elementStyles=[],Rl.shadowRootOptions={mode:`open`},Nl?.({ReactiveElement:Rl}),(Al.reactiveElementVersions??=[]).push(`1.6.3`);var zl=window,Bl=zl.trustedTypes,Vl=Bl?Bl.createPolicy(`lit-html`,{createHTML:e=>e}):void 0,Hl=`$lit$`,Ul=`lit$${(Math.random()+``).slice(9)}$`,Wl=`?`+Ul,Gl=`<${Wl}>`,Kl=document,ql=()=>Kl.createComment(``),Jl=e=>e===null||typeof e!=`object`&&typeof e!=`function`,Yl=Array.isArray,Xl=e=>Yl(e)||typeof e?.[Symbol.iterator]==`function`,Zl=`[ 	
\f\r]`,Ql=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,$l=/-->/g,eu=/>/g,tu=RegExp(`>|${Zl}(?:([^\\s"'>=/]+)(${Zl}*=${Zl}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,`g`),nu=/'/g,ru=/"/g,iu=/^(?:script|style|textarea|title)$/i,au=(e=>(t,...n)=>({_$litType$:e,strings:t,values:n}))(1),ou=Symbol.for(`lit-noChange`),su=Symbol.for(`lit-nothing`),cu=new WeakMap,lu=Kl.createTreeWalker(Kl,129,null,!1);function uu(e,t){if(!Array.isArray(e)||!e.hasOwnProperty(`raw`))throw Error(`invalid template strings array`);return Vl===void 0?t:Vl.createHTML(t)}var du=(e,t)=>{let n=e.length-1,r=[],i,a=t===2?`<svg>`:``,o=Ql;for(let t=0;t<n;t++){let n=e[t],s,c,l=-1,u=0;for(;u<n.length&&(o.lastIndex=u,c=o.exec(n),c!==null);)u=o.lastIndex,o===Ql?c[1]===`!--`?o=$l:c[1]===void 0?c[2]===void 0?c[3]!==void 0&&(o=tu):(iu.test(c[2])&&(i=RegExp(`</`+c[2],`g`)),o=tu):o=eu:o===tu?c[0]===`>`?(o=i??Ql,l=-1):c[1]===void 0?l=-2:(l=o.lastIndex-c[2].length,s=c[1],o=c[3]===void 0?tu:c[3]===`"`?ru:nu):o===ru||o===nu?o=tu:o===$l||o===eu?o=Ql:(o=tu,i=void 0);let d=o===tu&&e[t+1].startsWith(`/>`)?` `:``;a+=o===Ql?n+Gl:l>=0?(r.push(s),n.slice(0,l)+Hl+n.slice(l)+Ul+d):n+Ul+(l===-2?(r.push(void 0),t):d)}return[uu(e,a+(e[n]||`<?>`)+(t===2?`</svg>`:``)),r]},fu=class e{constructor({strings:t,_$litType$:n},r){let i;this.parts=[];let a=0,o=0,s=t.length-1,c=this.parts,[l,u]=du(t,n);if(this.el=e.createElement(l,r),lu.currentNode=this.el.content,n===2){let e=this.el.content,t=e.firstChild;t.remove(),e.append(...t.childNodes)}for(;(i=lu.nextNode())!==null&&c.length<s;){if(i.nodeType===1){if(i.hasAttributes()){let e=[];for(let t of i.getAttributeNames())if(t.endsWith(Hl)||t.startsWith(Ul)){let n=u[o++];if(e.push(t),n!==void 0){let e=i.getAttribute(n.toLowerCase()+Hl).split(Ul),t=/([.?@])?(.*)/.exec(n);c.push({type:1,index:a,name:t[2],strings:e,ctor:t[1]===`.`?_u:t[1]===`?`?yu:t[1]===`@`?bu:gu})}else c.push({type:6,index:a})}for(let t of e)i.removeAttribute(t)}if(iu.test(i.tagName)){let e=i.textContent.split(Ul),t=e.length-1;if(t>0){i.textContent=Bl?Bl.emptyScript:``;for(let n=0;n<t;n++)i.append(e[n],ql()),lu.nextNode(),c.push({type:2,index:++a});i.append(e[t],ql())}}}else if(i.nodeType===8){if(i.data===Wl)c.push({type:2,index:a});else{let e=-1;for(;(e=i.data.indexOf(Ul,e+1))!==-1;)c.push({type:7,index:a}),e+=Ul.length-1}}a++}}static createElement(e,t){let n=Kl.createElement(`template`);return n.innerHTML=e,n}};function pu(e,t,n=e,r){var i,a;if(t===ou)return t;let o=r===void 0?n._$Cl:n._$Co?.[r],s=Jl(t)?void 0:t._$litDirective$;return o?.constructor!==s&&((i=o?._$AO)==null||i.call(o,!1),s===void 0?o=void 0:(o=new s(e),o._$AT(e,n,r)),r===void 0?n._$Cl=o:((a=n)._$Co??(a._$Co=[]))[r]=o),o!==void 0&&(t=pu(e,o._$AS(e,t.values),o,r)),t}var mu=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:n}=this._$AD,r=(e?.creationScope??Kl).importNode(t,!0);lu.currentNode=r;let i=lu.nextNode(),a=0,o=0,s=n[0];for(;s!==void 0;){if(a===s.index){let t;s.type===2?t=new hu(i,i.nextSibling,this,e):s.type===1?t=new s.ctor(i,s.name,s.strings,this,e):s.type===6&&(t=new xu(i,this,e)),this._$AV.push(t),s=n[++o]}a!==s?.index&&(i=lu.nextNode(),a++)}return lu.currentNode=Kl,r}v(e){let t=0;for(let n of this._$AV)n!==void 0&&(n.strings===void 0?n._$AI(e[t]):(n._$AI(e,n,t),t+=n.strings.length-2)),t++}},hu=class e{constructor(e,t,n,r){var i;this.type=2,this._$AH=su,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=n,this.options=r,this._$Cp=(i=r?.isConnected)==null||i}get _$AU(){return this._$AM?._$AU??this._$Cp}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=pu(this,e,t),Jl(e)?e===su||e==null||e===``?(this._$AH!==su&&this._$AR(),this._$AH=su):e!==this._$AH&&e!==ou&&this._(e):e._$litType$===void 0?e.nodeType===void 0?Xl(e)?this.T(e):this._(e):this.$(e):this.g(e)}k(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}$(e){this._$AH!==e&&(this._$AR(),this._$AH=this.k(e))}_(e){this._$AH!==su&&Jl(this._$AH)?this._$AA.nextSibling.data=e:this.$(Kl.createTextNode(e)),this._$AH=e}g(e){let{values:t,_$litType$:n}=e,r=typeof n==`number`?this._$AC(e):(n.el===void 0&&(n.el=fu.createElement(uu(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===r)this._$AH.v(t);else{let e=new mu(r,this),n=e.u(this.options);e.v(t),this.$(n),this._$AH=e}}_$AC(e){let t=cu.get(e.strings);return t===void 0&&cu.set(e.strings,t=new fu(e)),t}T(t){Yl(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,i=0;for(let a of t)i===n.length?n.push(r=new e(this.k(ql()),this.k(ql()),this,this.options)):r=n[i],r._$AI(a),i++;i<n.length&&(this._$AR(r&&r._$AB.nextSibling,i),n.length=i)}_$AR(e=this._$AA.nextSibling,t){var n;for((n=this._$AP)==null||n.call(this,!1,!0,t);e&&e!==this._$AB;){let t=e.nextSibling;e.remove(),e=t}}setConnected(e){var t;this._$AM===void 0&&(this._$Cp=e,(t=this._$AP)==null||t.call(this,e))}},gu=class{constructor(e,t,n,r,i){this.type=1,this._$AH=su,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=i,n.length>2||n[0]!==``||n[1]!==``?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=su}get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}_$AI(e,t=this,n,r){let i=this.strings,a=!1;if(i===void 0)e=pu(this,e,t,0),a=!Jl(e)||e!==this._$AH&&e!==ou,a&&(this._$AH=e);else{let r=e,o,s;for(e=i[0],o=0;o<i.length-1;o++)s=pu(this,r[n+o],t,o),s===ou&&(s=this._$AH[o]),a||=!Jl(s)||s!==this._$AH[o],s===su?e=su:e!==su&&(e+=(s??``)+i[o+1]),this._$AH[o]=s}a&&!r&&this.j(e)}j(e){e===su?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??``)}},_u=class extends gu{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===su?void 0:e}},vu=Bl?Bl.emptyScript:``,yu=class extends gu{constructor(){super(...arguments),this.type=4}j(e){e&&e!==su?this.element.setAttribute(this.name,vu):this.element.removeAttribute(this.name)}},bu=class extends gu{constructor(e,t,n,r,i){super(e,t,n,r,i),this.type=5}_$AI(e,t=this){if((e=pu(this,e,t,0)??su)===ou)return;let n=this._$AH,r=e===su&&n!==su||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,i=e!==su&&(n===su||r);r&&this.element.removeEventListener(this.name,this,n),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH==`function`?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},xu=class{constructor(e,t,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){pu(this,e)}},Su=zl.litHtmlPolyfillSupport;Su?.(fu,hu),(zl.litHtmlVersions??=[]).push(`2.8.0`);var Cu=(e,t,n)=>{let r=n?.renderBefore??t,i=r._$litPart$;if(i===void 0){let e=n?.renderBefore??null;r._$litPart$=i=new hu(t.insertBefore(ql(),e),e,void 0,n??{})}return i._$AI(e),i},wu,Tu=class extends Rl{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var e;let t=super.createRenderRoot();return(e=this.renderOptions).renderBefore??(e.renderBefore=t.firstChild),t}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=Cu(t,this.renderRoot,this.renderOptions)}connectedCallback(){var e;super.connectedCallback(),(e=this._$Do)==null||e.setConnected(!0)}disconnectedCallback(){var e;super.disconnectedCallback(),(e=this._$Do)==null||e.setConnected(!1)}render(){return ou}};Tu.finalized=!0,Tu._$litElement$=!0,(wu=globalThis.litElementHydrateSupport)==null||wu.call(globalThis,{LitElement:Tu});var Eu=globalThis.litElementPolyfillSupport;Eu?.({LitElement:Tu}),(globalThis.litElementVersions??(globalThis.litElementVersions=[])).push(`3.3.3`);var Du=navigator.xr!=null&&self.XRSession!=null&&navigator.xr.isSessionSupported!=null,Ou=Du&&self.XRSession.prototype.requestHitTestSource!=null,ku=self.ResizeObserver!=null,Au=self.IntersectionObserver!=null,ju=Ou;(()=>{let e=navigator.userAgent||navigator.vendor||self.opera,t=!1;return(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(e)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(e.substr(0,4)))&&(t=!0),t})(),/\bCrOS\b/.test(navigator.userAgent);var Mu=/android/i.test(navigator.userAgent),Nu=/iPad|iPhone|iPod/.test(navigator.userAgent)&&!self.MSStream||navigator.platform===`MacIntel`&&navigator.maxTouchPoints>1;/Safari\//.test(navigator.userAgent);var Pu=/firefox/i.test(navigator.userAgent),Fu=/OculusBrowser/.test(navigator.userAgent);Nu&&/CriOS\//.test(navigator.userAgent);var Iu=Mu&&!Pu&&!Fu,Lu=!!(window.webkit&&window.webkit.messageHandlers),Ru=(()=>{if(Nu){if(Lu)return!!/CriOS\/|EdgiOS\/|FxiOS\/|GSA\/|DuckDuckGo\//.test(navigator.userAgent);{let e=document.createElement(`a`);return!!(e.relList&&e.relList.supports&&e.relList.supports(`ar`))}}return!1})(),zu=e=>e&&e!==`null`?Vu(e):null,Bu=()=>{if(ju)return;let e=[];throw Du||e.push(`WebXR Device API`),Ou||e.push(`WebXR Hit Test API`),Error(`The following APIs are required for AR, but are missing in this browser: ${e.join(`, `)}`)},Vu=e=>new URL(e,window.location.toString()).toString(),Hu=(e,t)=>{let n=null,r=(...r)=>{n??=(e(...r),self.setTimeout(()=>n=null,t))};return r.flush=()=>{n!=null&&(self.clearTimeout(n),n=null)},r},Uu=(e,t)=>{let n=null;return(...r)=>{n!=null&&self.clearTimeout(n),n=self.setTimeout(()=>{n=null,e(...r)},t)}},Wu=(e,t,n)=>Math.max(t,Math.min(n,e)),Gu=(()=>{let e=(()=>{if(document.documentElement.getAttribute(`itemtype`)?.includes(`schema.org/SearchResultsPage`)||window.self!==window.top)return!0;let e=document.head==null?[]:Array.from(document.head.querySelectorAll(`meta`));for(let t of e)if(t.name===`viewport`)return!0;return!1})();return e||console.warn(`No <meta name="viewport"> detected; <model-viewer> will cap pixel density at 1.`),()=>e?window.devicePixelRatio:1})(),Ku=(()=>{let e=RegExp(`[?&]model-viewer-debug-mode(&|$)`);return()=>self.ModelViewerElement&&self.ModelViewerElement.debugMode||self.location&&self.location.search&&self.location.search.match(e)})(),qu=(e=0)=>new Promise(t=>setTimeout(t,e)),Ju=(e,t,n=null)=>new Promise(r=>{function i(a){(!n||n(a))&&(r(a),e.removeEventListener(t,i))}e.addEventListener(t,i)}),Yu=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Xu=.5,Zu=0,Qu=1,$u=1,ed=Symbol(`currentEnvironmentMap`),td=Symbol(`currentBackground`),nd=Symbol(`updateEnvironment`),rd=Symbol(`cancelEnvironmentUpdate`),id=e=>{var t,n,i;class a extends e{constructor(){super(...arguments),this.environmentImage=null,this.skyboxImage=null,this.shadowIntensity=Zu,this.shadowSoftness=Qu,this.exposure=$u,this.toneMapping=`auto`,this.skyboxHeight=`0`,this[t]=null,this[n]=null,this[i]=null}updated(e){super.updated(e),e.has(`shadowIntensity`)&&(this[$].setShadowIntensity(this.shadowIntensity*Xu),this[Jb]()),e.has(`shadowSoftness`)&&(this[$].setShadowSoftness(this.shadowSoftness),this[Jb]()),e.has(`exposure`)&&(this[$].exposure=this.exposure,this[Jb]()),e.has(`toneMapping`)&&(this[$].toneMapping=this.toneMapping===`commerce`||this.toneMapping===`neutral`?7:this.toneMapping===`agx`?6:4,this[Jb]()),(e.has(`environmentImage`)||e.has(`skyboxImage`))&&this[nx]()&&this[nd](),e.has(`skyboxHeight`)&&(this[$].setGroundedSkybox(),this[Jb]())}hasBakedShadow(){return this[$].bakedShadows.size>0}async[(t=ed,n=td,i=rd,nd)](){let{skyboxImage:e,environmentImage:t}=this;this[rd]!=null&&(this[rd](),this[rd]=null);let{textureUtils:n}=this[Qb];if(n==null)return;let r=this[$b].beginActivity(`environment-update`);try{let{environmentMap:i,skybox:a}=await n.generateEnvironmentMapAndSkybox(zu(e),t,e=>r(Wu(e,0,1)));this[ed]!==i&&(this[ed]=i,this.dispatchEvent(new CustomEvent(`environment-change`))),this[td]=a==null?null:a.name===i.name?i:a,this[$].setEnvironmentAndSkybox(this[ed],this[td])}catch(e){if(e instanceof Error)throw this[$].setEnvironmentAndSkybox(null,null),e}finally{r(1)}}}return Yu([r({type:String,attribute:`environment-image`})],a.prototype,`environmentImage`,void 0),Yu([r({type:String,attribute:`skybox-image`})],a.prototype,`skyboxImage`,void 0),Yu([r({type:Number,attribute:`shadow-intensity`})],a.prototype,`shadowIntensity`,void 0),Yu([r({type:Number,attribute:`shadow-softness`})],a.prototype,`shadowSoftness`,void 0),Yu([r({type:Number})],a.prototype,`exposure`,void 0),Yu([r({type:String,attribute:`tone-mapping`})],a.prototype,`toneMapping`,void 0),Yu([r({type:String,attribute:`skybox-height`})],a.prototype,`skyboxHeight`,void 0),a},ad=au`
<svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="#000000">
    <!-- NOTE(cdata): This SVG filter is a stop-gap until we can implement
         support for dynamic re-coloring of UI components -->
    <defs>
      <filter id="drop-shadow" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
        <feOffset dx="0" dy="0" result="offsetblur"/>
        <feFlood flood-color="#000000"/>
        <feComposite in2="offsetblur" operator="in"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <path filter="url(#drop-shadow)" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    <path d="M0 0h24v24H0z" fill="none"/>
</svg>`,od=au`
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="25" height="36">
    <defs>
        <path id="A" d="M.001.232h24.997V36H.001z" />
    </defs>
    <g transform="translate(-11 -4)" fill="none" fill-rule="evenodd">
        <path fill-opacity="0" fill="#fff" d="M0 0h44v44H0z" />
        <g transform="translate(11 3)">
            <path d="M8.733 11.165c.04-1.108.766-2.027 1.743-2.307a2.54 2.54 0 0 1 .628-.089c.16 0 .314.017.463.044 1.088.2 1.9 1.092 1.9 2.16v8.88h1.26c2.943-1.39 5-4.45 5-8.025a9.01 9.01 0 0 0-1.9-5.56l-.43-.5c-.765-.838-1.683-1.522-2.712-2-1.057-.49-2.226-.77-3.46-.77s-2.4.278-3.46.77c-1.03.478-1.947 1.162-2.71 2l-.43.5a9.01 9.01 0 0 0-1.9 5.56 9.04 9.04 0 0 0 .094 1.305c.03.21.088.41.13.617l.136.624c.083.286.196.56.305.832l.124.333a8.78 8.78 0 0 0 .509.953l.065.122a8.69 8.69 0 0 0 3.521 3.191l1.11.537v-9.178z" fill-opacity=".5" fill="#e4e4e4" />
            <path d="M22.94 26.218l-2.76 7.74c-.172.485-.676.8-1.253.8H12.24c-1.606 0-3.092-.68-3.98-1.82-1.592-2.048-3.647-3.822-6.11-5.27-.095-.055-.15-.137-.152-.23-.004-.1.046-.196.193-.297.56-.393 1.234-.6 1.926-.6a3.43 3.43 0 0 1 .691.069l4.922.994V10.972c0-.663.615-1.203 1.37-1.203s1.373.54 1.373 1.203v9.882h2.953c.273 0 .533.073.757.21l6.257 3.874c.027.017.045.042.07.06.41.296.586.77.426 1.22M4.1 16.614c-.024-.04-.042-.083-.065-.122a8.69 8.69 0 0 1-.509-.953c-.048-.107-.08-.223-.124-.333l-.305-.832c-.058-.202-.09-.416-.136-.624l-.13-.617a9.03 9.03 0 0 1-.094-1.305c0-2.107.714-4.04 1.9-5.56l.43-.5c.764-.84 1.682-1.523 2.71-2 1.058-.49 2.226-.77 3.46-.77s2.402.28 3.46.77c1.03.477 1.947 1.16 2.712 2l.428.5a9 9 0 0 1 1.901 5.559c0 3.577-2.056 6.636-5 8.026h-1.26v-8.882c0-1.067-.822-1.96-1.9-2.16-.15-.028-.304-.044-.463-.044-.22 0-.427.037-.628.09-.977.28-1.703 1.198-1.743 2.306v9.178l-1.11-.537C6.18 19.098 4.96 18 4.1 16.614M22.97 24.09l-6.256-3.874c-.102-.063-.218-.098-.33-.144 2.683-1.8 4.354-4.855 4.354-8.243 0-.486-.037-.964-.104-1.43a9.97 9.97 0 0 0-1.57-4.128l-.295-.408-.066-.092a10.05 10.05 0 0 0-.949-1.078c-.342-.334-.708-.643-1.094-.922-1.155-.834-2.492-1.412-3.94-1.65l-.732-.088-.748-.03a9.29 9.29 0 0 0-1.482.119c-1.447.238-2.786.816-3.94 1.65a9.33 9.33 0 0 0-.813.686 9.59 9.59 0 0 0-.845.877l-.385.437-.36.5-.288.468-.418.778-.04.09c-.593 1.28-.93 2.71-.93 4.222 0 3.832 2.182 7.342 5.56 8.938l1.437.68v4.946L5 25.64a4.44 4.44 0 0 0-.888-.086c-.017 0-.034.003-.05.003-.252.004-.503.033-.75.08a5.08 5.08 0 0 0-.237.056c-.193.046-.382.107-.568.18-.075.03-.15.057-.225.1-.25.114-.494.244-.723.405a1.31 1.31 0 0 0-.566 1.122 1.28 1.28 0 0 0 .645 1.051C4 29.925 5.96 31.614 7.473 33.563a5.06 5.06 0 0 0 .434.491c1.086 1.082 2.656 1.713 4.326 1.715h6.697c.748-.001 1.43-.333 1.858-.872.142-.18.256-.38.336-.602l2.757-7.74c.094-.26.13-.53.112-.794s-.088-.52-.203-.76a2.19 2.19 0 0 0-.821-.91" fill-opacity=".6" fill="#000" />
            <path d="M22.444 24.94l-6.257-3.874a1.45 1.45 0 0 0-.757-.211h-2.953v-9.88c0-.663-.616-1.203-1.373-1.203s-1.37.54-1.37 1.203v16.643l-4.922-.994a3.44 3.44 0 0 0-.692-.069 3.35 3.35 0 0 0-1.925.598c-.147.102-.198.198-.194.298.004.094.058.176.153.23 2.462 1.448 4.517 3.22 6.11 5.27.887 1.14 2.373 1.82 3.98 1.82h6.686c.577 0 1.08-.326 1.253-.8l2.76-7.74c.16-.448-.017-.923-.426-1.22-.025-.02-.043-.043-.07-.06z" fill="#fff" />
            <g transform="translate(0 .769)">
                <mask id="B" fill="#fff">
                    <use xlink:href="#A" />
                </mask>
                <path d="M23.993 24.992a1.96 1.96 0 0 1-.111.794l-2.758 7.74c-.08.22-.194.423-.336.602-.427.54-1.11.87-1.857.872h-6.698c-1.67-.002-3.24-.633-4.326-1.715-.154-.154-.3-.318-.434-.49C5.96 30.846 4 29.157 1.646 27.773c-.385-.225-.626-.618-.645-1.05a1.31 1.31 0 0 1 .566-1.122 4.56 4.56 0 0 1 .723-.405l.225-.1a4.3 4.3 0 0 1 .568-.18l.237-.056c.248-.046.5-.075.75-.08.018 0 .034-.003.05-.003.303-.001.597.027.89.086l3.722.752V20.68l-1.436-.68c-3.377-1.596-5.56-5.106-5.56-8.938 0-1.51.336-2.94.93-4.222.015-.03.025-.06.04-.09.127-.267.268-.525.418-.778.093-.16.186-.316.288-.468.063-.095.133-.186.2-.277L3.773 5c.118-.155.26-.29.385-.437.266-.3.544-.604.845-.877a9.33 9.33 0 0 1 .813-.686C6.97 2.167 8.31 1.59 9.757 1.35a9.27 9.27 0 0 1 1.481-.119 8.82 8.82 0 0 1 .748.031c.247.02.49.05.733.088 1.448.238 2.786.816 3.94 1.65.387.28.752.588 1.094.922a9.94 9.94 0 0 1 .949 1.078l.066.092c.102.133.203.268.295.408a9.97 9.97 0 0 1 1.571 4.128c.066.467.103.945.103 1.43 0 3.388-1.67 6.453-4.353 8.243.11.046.227.08.33.144l6.256 3.874c.37.23.645.55.82.9.115.24.185.498.203.76m.697-1.195c-.265-.55-.677-1.007-1.194-1.326l-5.323-3.297c2.255-2.037 3.564-4.97 3.564-8.114 0-2.19-.637-4.304-1.84-6.114-.126-.188-.26-.37-.4-.552-.645-.848-1.402-1.6-2.252-2.204C15.472.91 13.393.232 11.238.232A10.21 10.21 0 0 0 5.23 2.19c-.848.614-1.606 1.356-2.253 2.205-.136.18-.272.363-.398.55C1.374 6.756.737 8.87.737 11.06c0 4.218 2.407 8.08 6.133 9.842l.863.41v3.092l-2.525-.51c-.356-.07-.717-.106-1.076-.106a5.45 5.45 0 0 0-3.14.996c-.653.46-1.022 1.202-.99 1.983a2.28 2.28 0 0 0 1.138 1.872c2.24 1.318 4.106 2.923 5.543 4.772 1.26 1.62 3.333 2.59 5.55 2.592h6.698c1.42-.001 2.68-.86 3.134-2.138l2.76-7.74c.272-.757.224-1.584-.134-2.325" fill-opacity=".05" fill="#000" mask="url(#B)" />
            </g>
        </g>
    </g>
</svg>`,sd=au`
<style>
:host {
  display: block;
  position: relative;
  contain: strict;
  width: 300px;
  height: 150px;
}

.container {
  position: relative;
  overflow: hidden;
}

.userInput {
  width: 100%;
  height: 100%;
  display: none;
  position: relative;
  outline-offset: -1px;
  outline-width: 1px;
}

canvas {
  position: absolute;
  display: none;
  pointer-events: none;
  /* NOTE(cdata): Chrome 76 and below apparently have a bug
   * that causes our canvas not to display pixels unless it is
   * on its own render layer
   * @see https://github.com/google/model-viewer/pull/755#issuecomment-536597893
   */
  transform: translateZ(0);
}

.show {
  display: block;
}

/* Adapted from HTML5 Boilerplate
 *
 * @see https://github.com/h5bp/html5-boilerplate/blob/ceb4620c78fc82e13534fc44202a3f168754873f/dist/css/main.css#L122-L133 */
.screen-reader-only {
  border: 0;
  left: 0;
  top: 0;
  clip: rect(0, 0, 0, 0);
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  white-space: nowrap;
  width: 1px;
  pointer-events: none;
}

.slot {
  position: absolute;
  pointer-events: none;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.slot > * {
  pointer-events: initial;
}

.annotation-wrapper ::slotted(*) {
  opacity: var(--max-hotspot-opacity, 1);
  transition: opacity 0.3s;
}

.pointer-tumbling .annotation-wrapper ::slotted(*) {
  pointer-events: none;
}

.annotation-wrapper ::slotted(*) {
  pointer-events: initial;
}

.annotation-wrapper.hide ::slotted(*) {
  opacity: var(--min-hotspot-opacity, 0.25);
}

.slot.poster {
  display: none;
  background-color: inherit;
}

.slot.poster.show {
  display: inherit;
}

.slot.poster > * {
  pointer-events: initial;
}

.slot.poster:not(.show) > * {
  pointer-events: none;
}

#default-poster {
  width: 100%;
  height: 100%;
  /* The default poster is a <button> so we need to set display
   * to prevent it from being affected by text-align: */
  display: block;
  position: absolute;
  border: none;
  padding: 0;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  background-color: #fff0;
}

#default-progress-bar {
  display: block;
  position: relative;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
}

#default-progress-bar > .bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--progress-bar-height, 5px);
  background-color: var(--progress-bar-color, rgba(0, 0, 0, 0.4));
  transition: transform 0.09s;
  transform-origin: top left;
  transform: scaleX(0);
  overflow: hidden;
}

#default-progress-bar > .bar.hide {
  transition: opacity 0.3s 1s;
  opacity: 0;
}

.centered {
  align-items: center;
  justify-content: center;
}

.cover {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.slot.interaction-prompt {
  display: var(--interaction-prompt-display, flex);
  overflow: hidden;
  opacity: 0;
  will-change: opacity;
  transition: opacity 0.3s;
}

.slot.interaction-prompt.visible {
  opacity: 1;
}

.animated-container {
  will-change: transform, opacity;
  opacity: 0;
  transition: opacity 0.3s;
}

.slot.interaction-prompt > * {
  pointer-events: none;
}

.slot.ar-button {
  -moz-user-select: none;
  -webkit-tap-highlight-color: transparent;
  user-select: none;

  display: var(--ar-button-display, block);
}

.slot.ar-button:not(.enabled) {
  display: none;
}

.fab {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 40px;
  height: 40px;
  cursor: pointer;
  background-color: #fff;
  box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.15);
  border-radius: 100px;
}

.fab > * {
  opacity: 0.87;
}

#default-ar-button {
  position: absolute;
  bottom: 16px;
  right: 16px;
  transform: scale(var(--ar-button-scale, 1));
  transform-origin: bottom right;
}

.slot.pan-target {
  display: block;
  position: absolute;
  width: 0;
  height: 0;
  left: 50%;
  top: 50%;
  transform: translate3d(-50%, -50%, 0);
  background-color: transparent;
  opacity: 0;
  transition: opacity 0.3s;
}

#default-pan-target {
  width: 6px;
  height: 6px;
  border-radius: 6px;
  border: 1px solid white;
  box-shadow: 0px 0px 2px 1px rgba(0, 0, 0, 0.8);
}

.slot.default {
  pointer-events: none;
}

.slot.progress-bar {
  pointer-events: none;
}

.slot.exit-webxr-ar-button {
  pointer-events: none;
}

.slot.exit-webxr-ar-button:not(.enabled) {
  display: none;
}

#default-exit-webxr-ar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: env(safe-area-inset-top, 16px);
  right: 16px;
  width: 40px;
  height: 40px;
  box-sizing: border-box;
}

#default-exit-webxr-ar-button > svg {
  fill: #fff;
}
</style>
<div class="container">
  <div class="userInput" tabindex="0" role="img"
      aria-label="3D model">
      <div class="slot canvas">
        <slot name="canvas">
          <canvas></canvas>
        </slot>
      </div>

  </div>

  <!-- NOTE(cdata): We need to wrap slots because browsers without ShadowDOM
        will have their <slot> elements removed by ShadyCSS -->
  <div class="slot poster">
    <slot name="poster">
      <button type="button" id="default-poster" aria-hidden="true" aria-label="Loading 3D model"></button>
    </slot>
  </div>

  <div class="slot ar-button">
    <slot name="ar-button">
      <a id="default-ar-button" part="default-ar-button" class="fab"
          tabindex="2"
          role="button"
          href="javascript:void(0);"
          aria-label="View in your space">
        ${au`
<svg version="1.1" id="view_x5F_in_x5F_AR_x5F_icon"
	 xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="24px" height="24px"
	 viewBox="0 0 24 24" enable-background="new 0 0 24 24" xml:space="preserve">
<rect id="Bounding_Box" x="0" y="0" fill="none" width="24" height="24"/>
<g id="Art_layer">
	<path d="M3,4c0-0.55,0.45-1,1-1h2V1H4C2.35,1,1,2.35,1,4v2h2V4z"/>
	<path d="M20,3c0.55,0,1,0.45,1,1v2h2V4c0-1.65-1.35-3-3-3h-2v2H20z"/>
	<path d="M4,21c-0.55,0-1-0.45-1-1v-2H1v2c0,1.65,1.35,3,3,3h2v-2H4z"/>
	<path d="M20,21c0.55,0,1-0.45,1-1v-2h2v2c0,1.65-1.35,3-3,3h-2v-2H20z"/>
	<g>
		<path d="M18.25,7.6l-5.5-3.18c-0.46-0.27-1.04-0.27-1.5,0L5.75,7.6C5.29,7.87,5,8.36,5,8.9v6.35c0,0.54,0.29,1.03,0.75,1.3
			l5.5,3.18c0.46,0.27,1.04,0.27,1.5,0l5.5-3.18c0.46-0.27,0.75-0.76,0.75-1.3V8.9C19,8.36,18.71,7.87,18.25,7.6z M7,14.96v-4.62
			l4,2.32v4.61L7,14.96z M12,10.93L8,8.61l4-2.31l4,2.31L12,10.93z M13,17.27v-4.61l4-2.32v4.62L13,17.27z"/>
	</g>
</g>
</svg>`}
      </a>
    </slot>
  </div>

  <div class="slot pan-target">
    <slot name="pan-target">
      <div id="default-pan-target">
      </div>
    </slot>
  </div>

  <div class="slot interaction-prompt cover centered">
    <div id="prompt" class="animated-container">
      <slot name="interaction-prompt" aria-hidden="true">
        ${od}
      </slot>
    </div>
  </div>

  <div id="finger0" class="animated-container cover">
    <slot name="finger0" aria-hidden="true">
    </slot>
  </div>
  <div id="finger1" class="animated-container cover">
    <slot name="finger1" aria-hidden="true">
    </slot>
  </div>

  <div class="slot default">
    <slot></slot>

    <div class="slot progress-bar">
      <slot name="progress-bar">
        <div id="default-progress-bar" aria-hidden="true">
          <div class="bar" part="default-progress-bar"></div>
        </div>
      </slot>
    </div>

    <div class="slot exit-webxr-ar-button">
      <slot name="exit-webxr-ar-button">
        <a id="default-exit-webxr-ar-button" part="default-exit-webxr-ar-button"
            tabindex="3"
            aria-label="Exit AR"
            aria-hidden="true">
          ${ad}
        </a>
      </slot>
    </div>
  </div>
</div>
<div class="screen-reader-only" role="region" aria-label="Live announcements">
  <span id="status" role="status"></span>
</div>`,cd=e=>{Cu(sd,e)},ld=new WeakMap,ud=class extends kc{constructor(e){super(e),this.decoderPath=``,this.decoderConfig={},this.decoderBinary=null,this.decoderPending=null,this.workerLimit=4,this.workerPool=[],this.workerNextTaskID=1,this.workerSourceURL=``,this.defaultAttributeIDs={position:`POSITION`,normal:`NORMAL`,color:`COLOR`,uv:`TEX_COORD`},this.defaultAttributeTypes={position:`Float32Array`,normal:`Float32Array`,color:`Float32Array`,uv:`Float32Array`}}setDecoderPath(e){return this.decoderPath=e,this}setDecoderConfig(e){return this.decoderConfig=e,this}setWorkerLimit(e){return this.workerLimit=e,this}load(e,t,n,r){let i=new Mc(this.manager);i.setPath(this.path),i.setResponseType(`arraybuffer`),i.setRequestHeader(this.requestHeader),i.setWithCredentials(this.withCredentials),i.load(e,e=>{this.parse(e,t,r)},n,r)}parse(e,t,n=()=>{}){this.decodeDracoFile(e,t,null,null,pe).catch(n)}decodeDracoFile(e,t,n,r,i=me,a=()=>{}){let o={attributeIDs:n||this.defaultAttributeIDs,attributeTypes:r||this.defaultAttributeTypes,useUniqueIDs:!!n,vertexColorSpace:i};return this.decodeGeometry(e,o).then(t).catch(a)}decodeGeometry(e,t){let n=JSON.stringify(t);if(ld.has(e)){let t=ld.get(e);if(t.key===n)return t.promise;if(e.byteLength===0)throw Error(`THREE.DRACOLoader: Unable to re-decode a buffer with different settings. Buffer has already been transferred.`)}let r,i=this.workerNextTaskID++,a=e.byteLength,o=this._getWorker(i,a).then(n=>(r=n,new Promise((n,a)=>{r._callbacks[i]={resolve:n,reject:a},r.postMessage({type:`decode`,id:i,taskConfig:t,buffer:e},[e])}))).then(e=>this._createGeometry(e.geometry));return o.catch(()=>!0).then(()=>{r&&i&&this._releaseTask(r,i)}),ld.set(e,{key:n,promise:o}),o}_createGeometry(e){let t=new or;e.index&&t.setIndex(new Yn(e.index.array,1));for(let n=0;n<e.attributes.length;n++){let r=e.attributes[n],i=r.name,a=r.array,o=r.itemSize,s=new Yn(a,o);i===`color`&&(this._assignVertexColorSpace(s,r.vertexColorSpace),s.normalized=!(a instanceof Float32Array)),t.setAttribute(i,s)}return t}_assignVertexColorSpace(e,t){if(t!==`srgb`)return;let n=new G;for(let t=0,r=e.count;t<r;t++)n.fromBufferAttribute(e,t).convertSRGBToLinear(),e.setXYZ(t,n.r,n.g,n.b)}_loadLibrary(e,t){let n=new Mc(this.manager);return n.setPath(this.decoderPath),n.setResponseType(t),n.setWithCredentials(this.withCredentials),new Promise((t,r)=>{n.load(e,t,void 0,r)})}preload(){return this._initDecoder(),this}_initDecoder(){if(this.decoderPending)return this.decoderPending;let e=typeof WebAssembly!=`object`||this.decoderConfig.type===`js`,t=[];return e?t.push(this._loadLibrary(`draco_decoder.js`,`text`)):(t.push(this._loadLibrary(`draco_wasm_wrapper.js`,`text`)),t.push(this._loadLibrary(`draco_decoder.wasm`,`arraybuffer`))),this.decoderPending=Promise.all(t).then(t=>{let n=t[0];e||(this.decoderConfig.wasmBinary=t[1]);let r=dd.toString(),i=[`/* draco decoder */`,n,``,`/* worker */`,r.substring(r.indexOf(`{`)+1,r.lastIndexOf(`}`))].join(`
`);this.workerSourceURL=URL.createObjectURL(new Blob([i]))}),this.decoderPending}_getWorker(e,t){return this._initDecoder().then(()=>{if(this.workerPool.length<this.workerLimit){let e=new Worker(this.workerSourceURL);e._callbacks={},e._taskCosts={},e._taskLoad=0,e.postMessage({type:`init`,decoderConfig:this.decoderConfig}),e.onmessage=function(t){let n=t.data;switch(n.type){case`decode`:e._callbacks[n.id].resolve(n);break;case`error`:e._callbacks[n.id].reject(n);break;default:console.error(`THREE.DRACOLoader: Unexpected message, "`+n.type+`"`)}},this.workerPool.push(e)}else this.workerPool.sort(function(e,t){return e._taskLoad>t._taskLoad?-1:1});let n=this.workerPool[this.workerPool.length-1];return n._taskCosts[e]=t,n._taskLoad+=t,n})}_releaseTask(e,t){e._taskLoad-=e._taskCosts[t],delete e._callbacks[t],delete e._taskCosts[t]}debug(){console.log(`Task load: `,this.workerPool.map(e=>e._taskLoad))}dispose(){for(let e=0;e<this.workerPool.length;++e)this.workerPool[e].terminate();return this.workerPool.length=0,this.workerSourceURL!==``&&URL.revokeObjectURL(this.workerSourceURL),this}};function dd(){let e,t;onmessage=function(r){let i=r.data;switch(i.type){case`init`:e=i.decoderConfig,t=new Promise(function(t){e.onModuleLoaded=function(e){t({draco:e})},DracoDecoderModule(e)});break;case`decode`:let r=i.buffer,a=i.taskConfig;t.then(e=>{let t=e.draco,o=new t.Decoder;try{let e=n(t,o,new Int8Array(r),a),s=e.attributes.map(e=>e.array.buffer);e.index&&s.push(e.index.array.buffer),self.postMessage({type:`decode`,id:i.id,geometry:e},s)}catch(e){console.error(e),self.postMessage({type:`error`,id:i.id,error:e.message})}finally{t.destroy(o)}})}};function n(e,t,n,a){let o=a.attributeIDs,s=a.attributeTypes,c,l,u=t.GetEncodedGeometryType(n);if(u===e.TRIANGULAR_MESH)c=new e.Mesh,l=t.DecodeArrayToMesh(n,n.byteLength,c);else if(u===e.POINT_CLOUD)c=new e.PointCloud,l=t.DecodeArrayToPointCloud(n,n.byteLength,c);else throw Error(`THREE.DRACOLoader: Unexpected geometry type.`);if(!l.ok()||c.ptr===0)throw Error(`THREE.DRACOLoader: Decoding failed: `+l.error_msg());let d={index:null,attributes:[]};for(let n in o){let r=self[s[n]],l,u;if(a.useUniqueIDs)u=o[n],l=t.GetAttributeByUniqueId(c,u);else{if(u=t.GetAttributeId(c,e[o[n]]),u===-1)continue;l=t.GetAttribute(c,u)}let f=i(e,t,c,n,r,l);n===`color`&&(f.vertexColorSpace=a.vertexColorSpace),d.attributes.push(f)}return u===e.TRIANGULAR_MESH&&(d.index=r(e,t,c)),e.destroy(c),d}function r(e,t,n){let r=n.num_faces()*3,i=r*4,a=e._malloc(i);t.GetTrianglesUInt32Array(n,i,a);let o=new Uint32Array(e.HEAPF32.buffer,a,r).slice();return e._free(a),{array:o,itemSize:1}}function i(e,t,n,r,i,o){let s=o.num_components(),c=n.num_points()*s,l=c*i.BYTES_PER_ELEMENT,u=a(e,i),d=e._malloc(l);t.GetAttributeDataArrayForAllPoints(n,o,u,l,d);let f=new i(e.HEAPF32.buffer,d,c).slice();return e._free(d),{name:r,array:f,itemSize:s}}function a(e,t){switch(t){case Float32Array:return e.DT_FLOAT32;case Int8Array:return e.DT_INT8;case Int16Array:return e.DT_INT16;case Int32Array:return e.DT_INT32;case Uint8Array:return e.DT_UINT8;case Uint16Array:return e.DT_UINT16;case Uint32Array:return e.DT_UINT32}}}function fd(e,t){if(t===0)return console.warn(`THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles.`),e;if(t===2||t===1){let n=e.getIndex();if(n===null){let t=[],r=e.getAttribute(`position`);if(r!==void 0){for(let e=0;e<r.count;e++)t.push(e);e.setIndex(t),n=e.getIndex()}else return console.error(`THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible.`),e}let r=n.count-2,i=[];if(t===2)for(let e=1;e<=r;e++)i.push(n.getX(0)),i.push(n.getX(e)),i.push(n.getX(e+1));else for(let e=0;e<r;e++)e%2==0?(i.push(n.getX(e)),i.push(n.getX(e+1)),i.push(n.getX(e+2))):(i.push(n.getX(e+2)),i.push(n.getX(e+1)),i.push(n.getX(e)));i.length/3!==r&&console.error(`THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.`);let a=e.clone();return a.setIndex(i),a.clearGroups(),a}return console.error(`THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:`,t),e}var pd=class extends kc{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(e){return new vd(e)}),this.register(function(e){return new Dd(e)}),this.register(function(e){return new Od(e)}),this.register(function(e){return new kd(e)}),this.register(function(e){return new bd(e)}),this.register(function(e){return new xd(e)}),this.register(function(e){return new Sd(e)}),this.register(function(e){return new Cd(e)}),this.register(function(e){return new _d(e)}),this.register(function(e){return new wd(e)}),this.register(function(e){return new yd(e)}),this.register(function(e){return new Ed(e)}),this.register(function(e){return new Td(e)}),this.register(function(e){return new hd(e)}),this.register(function(e){return new Ad(e)}),this.register(function(e){return new jd(e)})}load(e,t,n,r){let i=this,a;if(this.resourcePath!==``)a=this.resourcePath;else if(this.path!==``){let t=Qc.extractUrlBase(e);a=Qc.resolveURL(t,this.path)}else a=Qc.extractUrlBase(e);this.manager.itemStart(e);let o=function(t){r?r(t):console.error(t),i.manager.itemError(e),i.manager.itemEnd(e)},s=new Mc(this.manager);s.setPath(this.path),s.setResponseType(`arraybuffer`),s.setRequestHeader(this.requestHeader),s.setWithCredentials(this.withCredentials),s.load(e,function(n){try{i.parse(n,a,function(n){t(n),i.manager.itemEnd(e)},o)}catch(e){o(e)}},n,o)}setDRACOLoader(e){return this.dracoLoader=e,this}setDDSLoader(){throw Error(`THREE.GLTFLoader: "MSFT_texture_dds" no longer supported. Please update to "KHR_texture_basisu".`)}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,n,r){let i,a={},o={},s=new TextDecoder;if(typeof e==`string`)i=JSON.parse(e);else if(e instanceof ArrayBuffer){if(s.decode(new Uint8Array(e,0,4))===Md){try{a[J.KHR_BINARY_GLTF]=new Fd(e)}catch(e){r&&r(e);return}i=JSON.parse(a[J.KHR_BINARY_GLTF].content)}else i=JSON.parse(s.decode(e))}else i=e;if(i.asset===void 0||i.asset.version[0]<2){r&&r(Error(`THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported.`));return}let c=new cf(i,{path:t||this.resourcePath||``,crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});c.fileLoader.setRequestHeader(this.requestHeader);for(let e=0;e<this.pluginCallbacks.length;e++){let t=this.pluginCallbacks[e](c);t.name||console.error(`THREE.GLTFLoader: Invalid plugin found: missing name`),o[t.name]=t,a[t.name]=!0}if(i.extensionsUsed)for(let e=0;e<i.extensionsUsed.length;++e){let t=i.extensionsUsed[e],n=i.extensionsRequired||[];switch(t){case J.KHR_MATERIALS_UNLIT:a[t]=new gd;break;case J.KHR_DRACO_MESH_COMPRESSION:a[t]=new Id(i,this.dracoLoader);break;case J.KHR_TEXTURE_TRANSFORM:a[t]=new Ld;break;case J.KHR_MESH_QUANTIZATION:a[t]=new Rd;break;default:n.indexOf(t)>=0&&o[t]===void 0&&console.warn(`THREE.GLTFLoader: Unknown extension "`+t+`".`)}}c.setExtensions(a),c.setPlugins(o),c.parse(n,r)}parseAsync(e,t){let n=this;return new Promise(function(r,i){n.parse(e,t,r,i)})}};function md(){let e={};return{get:function(t){return e[t]},add:function(t,n){e[t]=n},remove:function(t){delete e[t]},removeAll:function(){e={}}}}var J={KHR_BINARY_GLTF:`KHR_binary_glTF`,KHR_DRACO_MESH_COMPRESSION:`KHR_draco_mesh_compression`,KHR_LIGHTS_PUNCTUAL:`KHR_lights_punctual`,KHR_MATERIALS_CLEARCOAT:`KHR_materials_clearcoat`,KHR_MATERIALS_IOR:`KHR_materials_ior`,KHR_MATERIALS_SHEEN:`KHR_materials_sheen`,KHR_MATERIALS_SPECULAR:`KHR_materials_specular`,KHR_MATERIALS_TRANSMISSION:`KHR_materials_transmission`,KHR_MATERIALS_IRIDESCENCE:`KHR_materials_iridescence`,KHR_MATERIALS_ANISOTROPY:`KHR_materials_anisotropy`,KHR_MATERIALS_UNLIT:`KHR_materials_unlit`,KHR_MATERIALS_VOLUME:`KHR_materials_volume`,KHR_TEXTURE_BASISU:`KHR_texture_basisu`,KHR_TEXTURE_TRANSFORM:`KHR_texture_transform`,KHR_MESH_QUANTIZATION:`KHR_mesh_quantization`,KHR_MATERIALS_EMISSIVE_STRENGTH:`KHR_materials_emissive_strength`,EXT_MATERIALS_BUMP:`EXT_materials_bump`,EXT_TEXTURE_WEBP:`EXT_texture_webp`,EXT_TEXTURE_AVIF:`EXT_texture_avif`,EXT_MESHOPT_COMPRESSION:`EXT_meshopt_compression`,EXT_MESH_GPU_INSTANCING:`EXT_mesh_gpu_instancing`},hd=class{constructor(e){this.parser=e,this.name=J.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){let e=this.parser,t=this.parser.json.nodes||[];for(let n=0,r=t.length;n<r;n++){let r=t[n];r.extensions&&r.extensions[this.name]&&r.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,r.extensions[this.name].light)}}_loadLight(e){let t=this.parser,n=`light:`+e,r=t.cache.get(n);if(r)return r;let i=t.json,a=((i.extensions&&i.extensions[this.name]||{}).lights||[])[e],o,s=new G(16777215);a.color!==void 0&&s.setRGB(a.color[0],a.color[1],a.color[2],me);let c=a.range===void 0?0:a.range;switch(a.type){case`directional`:o=new Yc(s),o.target.position.set(0,0,-1),o.add(o.target);break;case`point`:o=new qc(s),o.distance=c;break;case`spot`:o=new Hc(s),o.distance=c,a.spot=a.spot||{},a.spot.innerConeAngle=a.spot.innerConeAngle===void 0?0:a.spot.innerConeAngle,a.spot.outerConeAngle=a.spot.outerConeAngle===void 0?Math.PI/4:a.spot.outerConeAngle,o.angle=a.spot.outerConeAngle,o.penumbra=1-a.spot.innerConeAngle/a.spot.outerConeAngle,o.target.position.set(0,0,-1),o.add(o.target);break;default:throw Error(`THREE.GLTFLoader: Unexpected light type: `+a.type)}return o.position.set(0,0,0),o.decay=2,$d(o,a),a.intensity!==void 0&&(o.intensity=a.intensity),o.name=t.createUniqueName(a.name||`light_`+e),r=Promise.resolve(o),t.cache.add(n,r),r}getDependency(e,t){if(e===`light`)return this._loadLight(t)}createNodeAttachment(e){let t=this,n=this.parser,r=n.json.nodes[e],i=(r.extensions&&r.extensions[this.name]||{}).light;return i===void 0?null:this._loadLight(i).then(function(e){return n._getNodeRef(t.cache,i,e)})}},gd=class{constructor(){this.name=J.KHR_MATERIALS_UNLIT}getMaterialType(){return Vn}extendParams(e,t,n){let r=[];e.color=new G(1,1,1),e.opacity=1;let i=t.pbrMetallicRoughness;if(i){if(Array.isArray(i.baseColorFactor)){let t=i.baseColorFactor;e.color.setRGB(t[0],t[1],t[2],me),e.opacity=t[3]}i.baseColorTexture!==void 0&&r.push(n.assignTexture(e,`map`,i.baseColorTexture,pe))}return Promise.all(r)}},_d=class{constructor(e){this.parser=e,this.name=J.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){let n=this.parser.json.materials[e];if(!n.extensions||!n.extensions[this.name])return Promise.resolve();let r=n.extensions[this.name].emissiveStrength;return r!==void 0&&(t.emissiveIntensity=r),Promise.resolve()}},vd=class{constructor(e){this.parser=e,this.name=J.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){let t=this.parser.json.materials[e];return!t.extensions||!t.extensions[this.name]?null:ac}extendMaterialParams(e,t){let n=this.parser,r=n.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();let i=[],a=r.extensions[this.name];if(a.clearcoatFactor!==void 0&&(t.clearcoat=a.clearcoatFactor),a.clearcoatTexture!==void 0&&i.push(n.assignTexture(t,`clearcoatMap`,a.clearcoatTexture)),a.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=a.clearcoatRoughnessFactor),a.clearcoatRoughnessTexture!==void 0&&i.push(n.assignTexture(t,`clearcoatRoughnessMap`,a.clearcoatRoughnessTexture)),a.clearcoatNormalTexture!==void 0&&(i.push(n.assignTexture(t,`clearcoatNormalMap`,a.clearcoatNormalTexture)),a.clearcoatNormalTexture.scale!==void 0)){let e=a.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new V(e,e)}return Promise.all(i)}},yd=class{constructor(e){this.parser=e,this.name=J.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){let t=this.parser.json.materials[e];return!t.extensions||!t.extensions[this.name]?null:ac}extendMaterialParams(e,t){let n=this.parser,r=n.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();let i=[],a=r.extensions[this.name];return a.iridescenceFactor!==void 0&&(t.iridescence=a.iridescenceFactor),a.iridescenceTexture!==void 0&&i.push(n.assignTexture(t,`iridescenceMap`,a.iridescenceTexture)),a.iridescenceIor!==void 0&&(t.iridescenceIOR=a.iridescenceIor),t.iridescenceThicknessRange===void 0&&(t.iridescenceThicknessRange=[100,400]),a.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessRange[0]=a.iridescenceThicknessMinimum),a.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessRange[1]=a.iridescenceThicknessMaximum),a.iridescenceThicknessTexture!==void 0&&i.push(n.assignTexture(t,`iridescenceThicknessMap`,a.iridescenceThicknessTexture)),Promise.all(i)}},bd=class{constructor(e){this.parser=e,this.name=J.KHR_MATERIALS_SHEEN}getMaterialType(e){let t=this.parser.json.materials[e];return!t.extensions||!t.extensions[this.name]?null:ac}extendMaterialParams(e,t){let n=this.parser,r=n.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();let i=[];t.sheenColor=new G(0,0,0),t.sheenRoughness=0,t.sheen=1;let a=r.extensions[this.name];if(a.sheenColorFactor!==void 0){let e=a.sheenColorFactor;t.sheenColor.setRGB(e[0],e[1],e[2],me)}return a.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=a.sheenRoughnessFactor),a.sheenColorTexture!==void 0&&i.push(n.assignTexture(t,`sheenColorMap`,a.sheenColorTexture,pe)),a.sheenRoughnessTexture!==void 0&&i.push(n.assignTexture(t,`sheenRoughnessMap`,a.sheenRoughnessTexture)),Promise.all(i)}},xd=class{constructor(e){this.parser=e,this.name=J.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){let t=this.parser.json.materials[e];return!t.extensions||!t.extensions[this.name]?null:ac}extendMaterialParams(e,t){let n=this.parser,r=n.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();let i=[],a=r.extensions[this.name];return a.transmissionFactor!==void 0&&(t.transmission=a.transmissionFactor),a.transmissionTexture!==void 0&&i.push(n.assignTexture(t,`transmissionMap`,a.transmissionTexture)),Promise.all(i)}},Sd=class{constructor(e){this.parser=e,this.name=J.KHR_MATERIALS_VOLUME}getMaterialType(e){let t=this.parser.json.materials[e];return!t.extensions||!t.extensions[this.name]?null:ac}extendMaterialParams(e,t){let n=this.parser,r=n.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();let i=[],a=r.extensions[this.name];t.thickness=a.thicknessFactor===void 0?0:a.thicknessFactor,a.thicknessTexture!==void 0&&i.push(n.assignTexture(t,`thicknessMap`,a.thicknessTexture)),t.attenuationDistance=a.attenuationDistance||1/0;let o=a.attenuationColor||[1,1,1];return t.attenuationColor=new G().setRGB(o[0],o[1],o[2],me),Promise.all(i)}},Cd=class{constructor(e){this.parser=e,this.name=J.KHR_MATERIALS_IOR}getMaterialType(e){let t=this.parser.json.materials[e];return!t.extensions||!t.extensions[this.name]?null:ac}extendMaterialParams(e,t){let n=this.parser.json.materials[e];if(!n.extensions||!n.extensions[this.name])return Promise.resolve();let r=n.extensions[this.name];return t.ior=r.ior===void 0?1.5:r.ior,Promise.resolve()}},wd=class{constructor(e){this.parser=e,this.name=J.KHR_MATERIALS_SPECULAR}getMaterialType(e){let t=this.parser.json.materials[e];return!t.extensions||!t.extensions[this.name]?null:ac}extendMaterialParams(e,t){let n=this.parser,r=n.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();let i=[],a=r.extensions[this.name];t.specularIntensity=a.specularFactor===void 0?1:a.specularFactor,a.specularTexture!==void 0&&i.push(n.assignTexture(t,`specularIntensityMap`,a.specularTexture));let o=a.specularColorFactor||[1,1,1];return t.specularColor=new G().setRGB(o[0],o[1],o[2],me),a.specularColorTexture!==void 0&&i.push(n.assignTexture(t,`specularColorMap`,a.specularColorTexture,pe)),Promise.all(i)}},Td=class{constructor(e){this.parser=e,this.name=J.EXT_MATERIALS_BUMP}getMaterialType(e){let t=this.parser.json.materials[e];return!t.extensions||!t.extensions[this.name]?null:ac}extendMaterialParams(e,t){let n=this.parser,r=n.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();let i=[],a=r.extensions[this.name];return t.bumpScale=a.bumpFactor===void 0?1:a.bumpFactor,a.bumpTexture!==void 0&&i.push(n.assignTexture(t,`bumpMap`,a.bumpTexture)),Promise.all(i)}},Ed=class{constructor(e){this.parser=e,this.name=J.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){let t=this.parser.json.materials[e];return!t.extensions||!t.extensions[this.name]?null:ac}extendMaterialParams(e,t){let n=this.parser,r=n.json.materials[e];if(!r.extensions||!r.extensions[this.name])return Promise.resolve();let i=[],a=r.extensions[this.name];return a.anisotropyStrength!==void 0&&(t.anisotropy=a.anisotropyStrength),a.anisotropyRotation!==void 0&&(t.anisotropyRotation=a.anisotropyRotation),a.anisotropyTexture!==void 0&&i.push(n.assignTexture(t,`anisotropyMap`,a.anisotropyTexture)),Promise.all(i)}},Dd=class{constructor(e){this.parser=e,this.name=J.KHR_TEXTURE_BASISU}loadTexture(e){let t=this.parser,n=t.json,r=n.textures[e];if(!r.extensions||!r.extensions[this.name])return null;let i=r.extensions[this.name],a=t.options.ktx2Loader;if(!a){if(n.extensionsRequired&&n.extensionsRequired.indexOf(this.name)>=0)throw Error(`THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures`);return null}return t.loadTextureImage(e,i.source,a)}},Od=class{constructor(e){this.parser=e,this.name=J.EXT_TEXTURE_WEBP,this.isSupported=null}loadTexture(e){let t=this.name,n=this.parser,r=n.json,i=r.textures[e];if(!i.extensions||!i.extensions[t])return null;let a=i.extensions[t],o=r.images[a.source],s=n.textureLoader;if(o.uri){let e=n.options.manager.getHandler(o.uri);e!==null&&(s=e)}return this.detectSupport().then(function(i){if(i)return n.loadTextureImage(e,a.source,s);if(r.extensionsRequired&&r.extensionsRequired.indexOf(t)>=0)throw Error(`THREE.GLTFLoader: WebP required by asset but unsupported.`);return n.loadTexture(e)})}detectSupport(){return this.isSupported||=new Promise(function(e){let t=new Image;t.src=`data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA`,t.onload=t.onerror=function(){e(t.height===1)}}),this.isSupported}},kd=class{constructor(e){this.parser=e,this.name=J.EXT_TEXTURE_AVIF,this.isSupported=null}loadTexture(e){let t=this.name,n=this.parser,r=n.json,i=r.textures[e];if(!i.extensions||!i.extensions[t])return null;let a=i.extensions[t],o=r.images[a.source],s=n.textureLoader;if(o.uri){let e=n.options.manager.getHandler(o.uri);e!==null&&(s=e)}return this.detectSupport().then(function(i){if(i)return n.loadTextureImage(e,a.source,s);if(r.extensionsRequired&&r.extensionsRequired.indexOf(t)>=0)throw Error(`THREE.GLTFLoader: AVIF required by asset but unsupported.`);return n.loadTexture(e)})}detectSupport(){return this.isSupported||=new Promise(function(e){let t=new Image;t.src=`data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=`,t.onload=t.onerror=function(){e(t.height===1)}}),this.isSupported}},Ad=class{constructor(e){this.name=J.EXT_MESHOPT_COMPRESSION,this.parser=e}loadBufferView(e){let t=this.parser.json,n=t.bufferViews[e];if(n.extensions&&n.extensions[this.name]){let e=n.extensions[this.name],r=this.parser.getDependency(`buffer`,e.buffer),i=this.parser.options.meshoptDecoder;if(!i||!i.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw Error(`THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files`);return null}return r.then(function(t){let n=e.byteOffset||0,r=e.byteLength||0,a=e.count,o=e.byteStride,s=new Uint8Array(t,n,r);return i.decodeGltfBufferAsync?i.decodeGltfBufferAsync(a,o,s,e.mode,e.filter).then(function(e){return e.buffer}):i.ready.then(function(){let t=new ArrayBuffer(a*o);return i.decodeGltfBuffer(new Uint8Array(t),a,o,s,e.mode,e.filter),t})})}return null}},jd=class{constructor(e){this.name=J.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){let t=this.parser.json,n=t.nodes[e];if(!n.extensions||!n.extensions[this.name]||n.mesh===void 0)return null;let r=t.meshes[n.mesh];for(let e of r.primitives)if(e.mode!==Hd.TRIANGLES&&e.mode!==Hd.TRIANGLE_STRIP&&e.mode!==Hd.TRIANGLE_FAN&&e.mode!==void 0)return null;let i=n.extensions[this.name].attributes,a=[],o={};for(let e in i)a.push(this.parser.getDependency(`accessor`,i[e]).then(t=>(o[e]=t,o[e])));return a.length<1?null:(a.push(this.parser.createNodeMesh(e)),Promise.all(a).then(e=>{let t=e.pop(),n=t.isGroup?t.children:[t],r=e[0].count,i=[];for(let e of n){let t=new W,n=new U,a=new yt,s=new U(1,1,1),c=new Ns(e.geometry,e.material,r);for(let e=0;e<r;e++)o.TRANSLATION&&n.fromBufferAttribute(o.TRANSLATION,e),o.ROTATION&&a.fromBufferAttribute(o.ROTATION,e),o.SCALE&&s.fromBufferAttribute(o.SCALE,e),c.setMatrixAt(e,t.compose(n,a,s));for(let t in o)if(t===`_COLOR_0`){let e=o[t];c.instanceColor=new Ts(e.array,e.itemSize,e.normalized)}else t!==`TRANSLATION`&&t!==`ROTATION`&&t!==`SCALE`&&e.geometry.setAttribute(t,o[t]);Sn.prototype.copy.call(c,e),this.parser.assignFinalMaterial(c),i.push(c)}return t.isGroup?(t.clear(),t.add(...i),t):i[0]}))}},Md=`glTF`,Nd=12,Pd={JSON:1313821514,BIN:5130562},Fd=class{constructor(e){this.name=J.KHR_BINARY_GLTF,this.content=null,this.body=null;let t=new DataView(e,0,Nd),n=new TextDecoder;if(this.header={magic:n.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==Md)throw Error(`THREE.GLTFLoader: Unsupported glTF-Binary header.`);if(this.header.version<2)throw Error(`THREE.GLTFLoader: Legacy binary file detected.`);let r=this.header.length-Nd,i=new DataView(e,Nd),a=0;for(;a<r;){let t=i.getUint32(a,!0);a+=4;let r=i.getUint32(a,!0);if(a+=4,r===Pd.JSON){let r=new Uint8Array(e,Nd+a,t);this.content=n.decode(r)}else if(r===Pd.BIN){let n=Nd+a;this.body=e.slice(n,n+t)}a+=t}if(this.content===null)throw Error(`THREE.GLTFLoader: JSON content not found.`)}},Id=class{constructor(e,t){if(!t)throw Error(`THREE.GLTFLoader: No DRACOLoader instance provided.`);this.name=J.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){let n=this.json,r=this.dracoLoader,i=e.extensions[this.name].bufferView,a=e.extensions[this.name].attributes,o={},s={},c={};for(let e in a){let t=qd[e]||e.toLowerCase();o[t]=a[e]}for(let t in e.attributes){let r=qd[t]||t.toLowerCase();if(a[t]!==void 0){let i=n.accessors[e.attributes[t]];c[r]=Ud[i.componentType].name,s[r]=i.normalized===!0}}return t.getDependency(`bufferView`,i).then(function(e){return new Promise(function(t,n){r.decodeDracoFile(e,function(e){for(let t in e.attributes){let n=e.attributes[t],r=s[t];r!==void 0&&(n.normalized=r)}t(e)},o,c,me,n)})})}},Ld=class{constructor(){this.name=J.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){return(t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0?e:(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),e.needsUpdate=!0,e)}},Rd=class{constructor(){this.name=J.KHR_MESH_QUANTIZATION}},zd=class extends dc{constructor(e,t,n,r){super(e,t,n,r)}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,r=this.valueSize,i=e*r*3+r;for(let e=0;e!==r;e++)t[e]=n[i+e];return t}interpolate_(e,t,n,r){let i=this.resultBuffer,a=this.sampleValues,o=this.valueSize,s=o*2,c=o*3,l=r-t,u=(n-t)/l,d=u*u,f=d*u,p=e*c,m=p-c,h=-2*f+3*d,g=f-d,_=1-h,v=g-d+u;for(let e=0;e!==o;e++){let t=a[m+e+o],n=a[m+e+s]*l,r=a[p+e+o],c=a[p+e]*l;i[e]=_*t+v*n+h*r+g*c}return i}},Bd=new yt,Vd=class extends zd{interpolate_(e,t,n,r){let i=super.interpolate_(e,t,n,r);return Bd.fromArray(i).normalize().toArray(i),i}},Hd={FLOAT:5126,FLOAT_MAT3:35675,FLOAT_MAT4:35676,FLOAT_VEC2:35664,FLOAT_VEC3:35665,FLOAT_VEC4:35666,LINEAR:9729,REPEAT:10497,SAMPLER_2D:35678,POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6,UNSIGNED_BYTE:5121,UNSIGNED_SHORT:5123},Ud={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},Wd={9728:c,9729:d,9984:l,9985:f,9986:u,9987:p},Gd={33071:o,33648:s,10497:a},Kd={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},qd={POSITION:`position`,NORMAL:`normal`,TANGENT:`tangent`,TEXCOORD_0:`uv`,TEXCOORD_1:`uv1`,TEXCOORD_2:`uv2`,TEXCOORD_3:`uv3`,COLOR_0:`color`,WEIGHTS_0:`skinWeight`,JOINTS_0:`skinIndex`},Jd={scale:`scale`,translation:`position`,rotation:`quaternion`,weights:`morphTargetInfluences`},Yd={CUBICSPLINE:void 0,LINEAR:I,STEP:F},Xd={OPAQUE:`OPAQUE`,MASK:`MASK`,BLEND:`BLEND`};function Zd(e){return e.DefaultMaterial===void 0&&(e.DefaultMaterial=new ic({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:0})),e.DefaultMaterial}function Qd(e,t,n){for(let r in n.extensions)e[r]===void 0&&(t.userData.gltfExtensions=t.userData.gltfExtensions||{},t.userData.gltfExtensions[r]=n.extensions[r])}function $d(e,t){t.extras!==void 0&&(typeof t.extras==`object`?Object.assign(e.userData,t.extras):console.warn(`THREE.GLTFLoader: Ignoring primitive type .extras, `+t.extras))}function ef(e,t,n){let r=!1,i=!1,a=!1;for(let e=0,n=t.length;e<n;e++){let n=t[e];if(n.POSITION!==void 0&&(r=!0),n.NORMAL!==void 0&&(i=!0),n.COLOR_0!==void 0&&(a=!0),r&&i&&a)break}if(!r&&!i&&!a)return Promise.resolve(e);let o=[],s=[],c=[];for(let l=0,u=t.length;l<u;l++){let u=t[l];if(r){let t=u.POSITION===void 0?e.attributes.position:n.getDependency(`accessor`,u.POSITION);o.push(t)}if(i){let t=u.NORMAL===void 0?e.attributes.normal:n.getDependency(`accessor`,u.NORMAL);s.push(t)}if(a){let t=u.COLOR_0===void 0?e.attributes.color:n.getDependency(`accessor`,u.COLOR_0);c.push(t)}}return Promise.all([Promise.all(o),Promise.all(s),Promise.all(c)]).then(function(t){let n=t[0],o=t[1],s=t[2];return r&&(e.morphAttributes.position=n),i&&(e.morphAttributes.normal=o),a&&(e.morphAttributes.color=s),e.morphTargetsRelative=!0,e})}function tf(e,t){if(e.updateMorphTargets(),t.weights!==void 0)for(let n=0,r=t.weights.length;n<r;n++)e.morphTargetInfluences[n]=t.weights[n];if(t.extras&&Array.isArray(t.extras.targetNames)){let n=t.extras.targetNames;if(e.morphTargetInfluences.length===n.length){e.morphTargetDictionary={};for(let t=0,r=n.length;t<r;t++)e.morphTargetDictionary[n[t]]=t}else console.warn(`THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.`)}}function nf(e){let t,n=e.extensions&&e.extensions[J.KHR_DRACO_MESH_COMPRESSION];if(t=n?`draco:`+n.bufferView+`:`+n.indices+`:`+rf(n.attributes):e.indices+`:`+rf(e.attributes)+`:`+e.mode,e.targets!==void 0)for(let n=0,r=e.targets.length;n<r;n++)t+=`:`+rf(e.targets[n]);return t}function rf(e){let t=``,n=Object.keys(e).sort();for(let r=0,i=n.length;r<i;r++)t+=n[r]+`:`+e[n[r]]+`;`;return t}function af(e){switch(e){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw Error(`THREE.GLTFLoader: Unsupported normalized accessor component type.`)}}function of(e){return e.search(/\.jpe?g($|\?)/i)>0||e.search(/^data\:image\/jpeg/)===0?`image/jpeg`:e.search(/\.webp($|\?)/i)>0||e.search(/^data\:image\/webp/)===0?`image/webp`:`image/png`}var sf=new W,cf=class{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new md,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let n=!1,r=!1,i=-1;typeof navigator<`u`&&(n=/^((?!chrome|android).)*safari/i.test(navigator.userAgent)===!0,r=navigator.userAgent.indexOf(`Firefox`)>-1,i=r?navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1]:-1),this.textureLoader=typeof createImageBitmap>`u`||n||r&&i<98?new Fc(this.options.manager):new $c(this.options.manager),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new Mc(this.options.manager),this.fileLoader.setResponseType(`arraybuffer`),this.options.crossOrigin===`use-credentials`&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){let n=this,r=this.json,i=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(e){return e._markDefs&&e._markDefs()}),Promise.all(this._invokeAll(function(e){return e.beforeRoot&&e.beforeRoot()})).then(function(){return Promise.all([n.getDependencies(`scene`),n.getDependencies(`animation`),n.getDependencies(`camera`)])}).then(function(t){let a={scene:t[0][r.scene||0],scenes:t[0],animations:t[1],cameras:t[2],asset:r.asset,parser:n,userData:{}};return Qd(i,a,r),$d(a,r),Promise.all(n._invokeAll(function(e){return e.afterRoot&&e.afterRoot(a)})).then(function(){for(let e of a.scenes)e.updateMatrixWorld();e(a)})}).catch(t)}_markDefs(){let e=this.json.nodes||[],t=this.json.skins||[],n=this.json.meshes||[];for(let n=0,r=t.length;n<r;n++){let r=t[n].joints;for(let t=0,n=r.length;t<n;t++)e[r[t]].isBone=!0}for(let t=0,r=e.length;t<r;t++){let r=e[t];r.mesh!==void 0&&(this._addNodeRef(this.meshCache,r.mesh),r.skin!==void 0&&(n[r.mesh].isSkinnedMesh=!0)),r.camera!==void 0&&this._addNodeRef(this.cameraCache,r.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,n){if(e.refs[t]<=1)return n;let r=n.clone(),i=(e,t)=>{let n=this.associations.get(e);n!=null&&this.associations.set(t,n);for(let[n,r]of e.children.entries())i(r,t.children[n])};return i(n,r),r.name+=`_instance_`+e.uses[t]++,r}_invokeOne(e){let t=Object.values(this.plugins);t.push(this);for(let n=0;n<t.length;n++){let r=e(t[n]);if(r)return r}return null}_invokeAll(e){let t=Object.values(this.plugins);t.unshift(this);let n=[];for(let r=0;r<t.length;r++){let i=e(t[r]);i&&n.push(i)}return n}getDependency(e,t){let n=e+`:`+t,r=this.cache.get(n);if(!r){switch(e){case`scene`:r=this.loadScene(t);break;case`node`:r=this._invokeOne(function(e){return e.loadNode&&e.loadNode(t)});break;case`mesh`:r=this._invokeOne(function(e){return e.loadMesh&&e.loadMesh(t)});break;case`accessor`:r=this.loadAccessor(t);break;case`bufferView`:r=this._invokeOne(function(e){return e.loadBufferView&&e.loadBufferView(t)});break;case`buffer`:r=this.loadBuffer(t);break;case`material`:r=this._invokeOne(function(e){return e.loadMaterial&&e.loadMaterial(t)});break;case`texture`:r=this._invokeOne(function(e){return e.loadTexture&&e.loadTexture(t)});break;case`skin`:r=this.loadSkin(t);break;case`animation`:r=this._invokeOne(function(e){return e.loadAnimation&&e.loadAnimation(t)});break;case`camera`:r=this.loadCamera(t);break;default:if(r=this._invokeOne(function(n){return n!=this&&n.getDependency&&n.getDependency(e,t)}),!r)throw Error(`Unknown type: `+e)}this.cache.add(n,r)}return r}getDependencies(e){let t=this.cache.get(e);if(!t){let n=this,r=this.json[e+(e===`mesh`?`es`:`s`)]||[];t=Promise.all(r.map(function(t,r){return n.getDependency(e,r)})),this.cache.add(e,t)}return t}loadBuffer(e){let t=this.json.buffers[e],n=this.fileLoader;if(t.type&&t.type!==`arraybuffer`)throw Error(`THREE.GLTFLoader: `+t.type+` buffer type is not supported.`);if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[J.KHR_BINARY_GLTF].body);let r=this.options;return new Promise(function(e,i){n.load(Qc.resolveURL(t.uri,r.path),e,void 0,function(){i(Error(`THREE.GLTFLoader: Failed to load buffer "`+t.uri+`".`))})})}loadBufferView(e){let t=this.json.bufferViews[e];return this.getDependency(`buffer`,t.buffer).then(function(e){let n=t.byteLength||0,r=t.byteOffset||0;return e.slice(r,r+n)})}loadAccessor(e){let t=this,n=this.json,r=this.json.accessors[e];if(r.bufferView===void 0&&r.sparse===void 0){let e=Kd[r.type],t=Ud[r.componentType],n=r.normalized===!0,i=new t(r.count*e);return Promise.resolve(new Yn(i,e,n))}let i=[];return r.bufferView===void 0?i.push(null):i.push(this.getDependency(`bufferView`,r.bufferView)),r.sparse!==void 0&&(i.push(this.getDependency(`bufferView`,r.sparse.indices.bufferView)),i.push(this.getDependency(`bufferView`,r.sparse.values.bufferView))),Promise.all(i).then(function(e){let i=e[0],a=Kd[r.type],o=Ud[r.componentType],s=o.BYTES_PER_ELEMENT,c=s*a,l=r.byteOffset||0,u=r.bufferView===void 0?void 0:n.bufferViews[r.bufferView].byteStride,d=r.normalized===!0,f,p;if(u&&u!==c){let e=Math.floor(l/u),n=`InterleavedBuffer:`+r.bufferView+`:`+r.componentType+`:`+e+`:`+r.count,c=t.cache.get(n);c||(f=new o(i,e*u,r.count*u/s),c=new ss(f,u/s),t.cache.add(n,c)),p=new ls(c,a,l%u/s,d)}else f=i===null?new o(r.count*a):new o(i,l,r.count*a),p=new Yn(f,a,d);if(r.sparse!==void 0){let t=Kd.SCALAR,n=Ud[r.sparse.indices.componentType],s=r.sparse.indices.byteOffset||0,c=r.sparse.values.byteOffset||0,l=new n(e[1],s,r.sparse.count*t),u=new o(e[2],c,r.sparse.count*a);i!==null&&(p=new Yn(p.array.slice(),p.itemSize,p.normalized));for(let e=0,t=l.length;e<t;e++){let t=l[e];if(p.setX(t,u[e*a]),a>=2&&p.setY(t,u[e*a+1]),a>=3&&p.setZ(t,u[e*a+2]),a>=4&&p.setW(t,u[e*a+3]),a>=5)throw Error(`THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.`)}}return p})}loadTexture(e){let t=this.json,n=this.options,r=t.textures[e].source,i=t.images[r],a=this.textureLoader;if(i.uri){let e=n.manager.getHandler(i.uri);e!==null&&(a=e)}return this.loadTextureImage(e,r,a)}loadTextureImage(e,t,n){let r=this,i=this.json,a=i.textures[e],o=i.images[t],s=(o.uri||o.bufferView)+`:`+a.sampler;if(this.textureCache[s])return this.textureCache[s];let c=this.loadImageSource(t,n).then(function(t){t.flipY=!1,t.name=a.name||o.name||``,t.name===``&&typeof o.uri==`string`&&o.uri.startsWith(`data:image/`)===!1&&(t.name=o.uri);let n=(i.samplers||{})[a.sampler]||{};return t.magFilter=Wd[n.magFilter]||1006,t.minFilter=Wd[n.minFilter]||1008,t.wrapS=Gd[n.wrapS]||1e3,t.wrapT=Gd[n.wrapT]||1e3,r.associations.set(t,{textures:e}),t}).catch(function(){return null});return this.textureCache[s]=c,c}loadImageSource(e,t){let n=this,r=this.json,i=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(e=>e.clone());let a=r.images[e],o=self.URL||self.webkitURL,s=a.uri||``,c=!1;if(a.bufferView!==void 0)s=n.getDependency(`bufferView`,a.bufferView).then(function(e){c=!0;let t=new Blob([e],{type:a.mimeType});return s=o.createObjectURL(t),s});else if(a.uri===void 0)throw Error(`THREE.GLTFLoader: Image `+e+` is missing URI and bufferView`);let l=Promise.resolve(s).then(function(e){return new Promise(function(n,r){let a=n;t.isImageBitmapLoader===!0&&(a=function(e){let t=new pt(e);t.needsUpdate=!0,n(t)}),t.load(Qc.resolveURL(e,i.path),a,void 0,r)})}).then(function(e){return c===!0&&o.revokeObjectURL(s),e.userData.mimeType=a.mimeType||of(a.uri),e}).catch(function(e){throw console.error(`THREE.GLTFLoader: Couldn't load texture`,s),e});return this.sourceCache[e]=l,l}assignTexture(e,t,n,r){let i=this;return this.getDependency(`texture`,n.index).then(function(a){if(!a)return null;if(n.texCoord!==void 0&&n.texCoord>0&&(a=a.clone(),a.channel=n.texCoord),i.extensions[J.KHR_TEXTURE_TRANSFORM]){let e=n.extensions===void 0?void 0:n.extensions[J.KHR_TEXTURE_TRANSFORM];if(e){let t=i.associations.get(a);a=i.extensions[J.KHR_TEXTURE_TRANSFORM].extendTexture(a,e),i.associations.set(a,t)}}return r!==void 0&&(a.colorSpace=r),e[t]=a,a})}assignFinalMaterial(e){let t=e.geometry,n=e.material,r=t.attributes.tangent===void 0,i=t.attributes.color!==void 0,a=t.attributes.normal===void 0;if(e.isPoints){let e=`PointsMaterial:`+n.uuid,t=this.cache.get(e);t||(t=new Gs,Bn.prototype.copy.call(t,n),t.color.copy(n.color),t.map=n.map,t.sizeAttenuation=!1,this.cache.add(e,t)),n=t}else if(e.isLine){let e=`LineBasicMaterial:`+n.uuid,t=this.cache.get(e);t||(t=new Ps,Bn.prototype.copy.call(t,n),t.color.copy(n.color),t.map=n.map,this.cache.add(e,t)),n=t}if(r||i||a){let e=`ClonedMaterial:`+n.uuid+`:`;r&&(e+=`derivative-tangents:`),i&&(e+=`vertex-colors:`),a&&(e+=`flat-shading:`);let t=this.cache.get(e);t||(t=n.clone(),i&&(t.vertexColors=!0),a&&(t.flatShading=!0),r&&(t.normalScale&&(t.normalScale.y*=-1),t.clearcoatNormalScale&&(t.clearcoatNormalScale.y*=-1)),this.cache.add(e,t),this.associations.set(t,this.associations.get(n))),n=t}e.material=n}getMaterialType(){return ic}loadMaterial(e){let t=this,n=this.json,r=this.extensions,i=n.materials[e],a,o={},s=i.extensions||{},c=[];if(s[J.KHR_MATERIALS_UNLIT]){let e=r[J.KHR_MATERIALS_UNLIT];a=e.getMaterialType(),c.push(e.extendParams(o,i,t))}else{let n=i.pbrMetallicRoughness||{};if(o.color=new G(1,1,1),o.opacity=1,Array.isArray(n.baseColorFactor)){let e=n.baseColorFactor;o.color.setRGB(e[0],e[1],e[2],me),o.opacity=e[3]}n.baseColorTexture!==void 0&&c.push(t.assignTexture(o,`map`,n.baseColorTexture,pe)),o.metalness=n.metallicFactor===void 0?1:n.metallicFactor,o.roughness=n.roughnessFactor===void 0?1:n.roughnessFactor,n.metallicRoughnessTexture!==void 0&&(c.push(t.assignTexture(o,`metalnessMap`,n.metallicRoughnessTexture)),c.push(t.assignTexture(o,`roughnessMap`,n.metallicRoughnessTexture))),a=this._invokeOne(function(t){return t.getMaterialType&&t.getMaterialType(e)}),c.push(Promise.all(this._invokeAll(function(t){return t.extendMaterialParams&&t.extendMaterialParams(e,o)})))}i.doubleSided===!0&&(o.side=2);let l=i.alphaMode||Xd.OPAQUE;if(l===Xd.BLEND?(o.transparent=!0,o.depthWrite=!1):(o.transparent=!1,l===Xd.MASK&&(o.alphaTest=i.alphaCutoff===void 0?.5:i.alphaCutoff)),i.normalTexture!==void 0&&a!==Vn&&(c.push(t.assignTexture(o,`normalMap`,i.normalTexture)),o.normalScale=new V(1,1),i.normalTexture.scale!==void 0)){let e=i.normalTexture.scale;o.normalScale.set(e,e)}if(i.occlusionTexture!==void 0&&a!==Vn&&(c.push(t.assignTexture(o,`aoMap`,i.occlusionTexture)),i.occlusionTexture.strength!==void 0&&(o.aoMapIntensity=i.occlusionTexture.strength)),i.emissiveFactor!==void 0&&a!==Vn){let e=i.emissiveFactor;o.emissive=new G().setRGB(e[0],e[1],e[2],me)}return i.emissiveTexture!==void 0&&a!==Vn&&c.push(t.assignTexture(o,`emissiveMap`,i.emissiveTexture,pe)),Promise.all(c).then(function(){let n=new a(o);return i.name&&(n.name=i.name),$d(n,i),t.associations.set(n,{materials:e}),i.extensions&&Qd(r,n,i),n})}createUniqueName(e){let t=fl.sanitizeNodeName(e||``);return t in this.nodeNamesUsed?t+`_`+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){let t=this,n=this.extensions,r=this.primitiveCache;function i(e){return n[J.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(e,t).then(function(n){return uf(n,e,t)})}let a=[];for(let n=0,o=e.length;n<o;n++){let o=e[n],s=nf(o),c=r[s];if(c)a.push(c.promise);else{let e;e=o.extensions&&o.extensions[J.KHR_DRACO_MESH_COMPRESSION]?i(o):uf(new or,o,t),r[s]={primitive:o,promise:e},a.push(e)}}return Promise.all(a)}loadMesh(e){let t=this,n=this.json,r=this.extensions,i=n.meshes[e],a=i.primitives,o=[];for(let e=0,t=a.length;e<t;e++){let t=a[e].material===void 0?Zd(this.cache):this.getDependency(`material`,a[e].material);o.push(t)}return o.push(t.loadGeometries(a)),Promise.all(o).then(function(n){let o=n.slice(0,n.length-1),s=n[n.length-1],c=[];for(let n=0,l=s.length;n<l;n++){let l=s[n],u=a[n],d,f=o[n];if(u.mode===Hd.TRIANGLES||u.mode===Hd.TRIANGLE_STRIP||u.mode===Hd.TRIANGLE_FAN||u.mode===void 0)d=i.isSkinnedMesh===!0?new ys(l,f):new wr(l,f),d.isSkinnedMesh===!0&&d.normalizeSkinWeights(),u.mode===Hd.TRIANGLE_STRIP?d.geometry=fd(d.geometry,1):u.mode===Hd.TRIANGLE_FAN&&(d.geometry=fd(d.geometry,2));else if(u.mode===Hd.LINES)d=new Us(l,f);else if(u.mode===Hd.LINE_STRIP)d=new Bs(l,f);else if(u.mode===Hd.LINE_LOOP)d=new Ws(l,f);else if(u.mode===Hd.POINTS)d=new Xs(l,f);else throw Error(`THREE.GLTFLoader: Primitive mode unsupported: `+u.mode);Object.keys(d.geometry.morphAttributes).length>0&&tf(d,i),d.name=t.createUniqueName(i.name||`mesh_`+e),$d(d,i),u.extensions&&Qd(r,d,u),t.assignFinalMaterial(d),c.push(d)}for(let n=0,r=c.length;n<r;n++)t.associations.set(c[n],{meshes:e,primitives:n});if(c.length===1)return i.extensions&&Qd(r,c[0],i),c[0];let l=new Jo;i.extensions&&Qd(r,l,i),t.associations.set(l,{meshes:e});for(let e=0,t=c.length;e<t;e++)l.add(c[e]);return l})}loadCamera(e){let t,n=this.json.cameras[e],r=n[n.type];if(!r){console.warn(`THREE.GLTFLoader: Missing camera parameters.`);return}return n.type===`perspective`?t=new Br(qe.radToDeg(r.yfov),r.aspectRatio||1,r.znear||1,r.zfar||2e6):n.type===`orthographic`&&(t=new fi(-r.xmag,r.xmag,r.ymag,-r.ymag,r.znear,r.zfar)),n.name&&(t.name=this.createUniqueName(n.name)),$d(t,n),Promise.resolve(t)}loadSkin(e){let t=this.json.skins[e],n=[];for(let e=0,r=t.joints.length;e<r;e++)n.push(this._loadNodeShallow(t.joints[e]));return t.inverseBindMatrices===void 0?n.push(null):n.push(this.getDependency(`accessor`,t.inverseBindMatrices)),Promise.all(n).then(function(e){let n=e.pop(),r=e,i=[],a=[];for(let e=0,o=r.length;e<o;e++){let o=r[e];if(o){i.push(o);let t=new W;n!==null&&t.fromArray(n.array,e*16),a.push(t)}else console.warn(`THREE.GLTFLoader: Joint "%s" could not be found.`,t.joints[e])}return new ws(i,a)})}loadAnimation(e){let t=this.json,n=this,r=t.animations[e],i=r.name?r.name:`animation_`+e,a=[],o=[],s=[],c=[],l=[];for(let e=0,t=r.channels.length;e<t;e++){let t=r.channels[e],n=r.samplers[t.sampler],i=t.target,u=i.node,d=r.parameters===void 0?n.input:r.parameters[n.input],f=r.parameters===void 0?n.output:r.parameters[n.output];i.node!==void 0&&(a.push(this.getDependency(`node`,u)),o.push(this.getDependency(`accessor`,d)),s.push(this.getDependency(`accessor`,f)),c.push(n),l.push(i))}return Promise.all([Promise.all(a),Promise.all(o),Promise.all(s),Promise.all(c),Promise.all(l)]).then(function(e){let t=e[0],r=e[1],a=e[2],o=e[3],s=e[4],c=[];for(let e=0,i=t.length;e<i;e++){let i=t[e],l=r[e],u=a[e],d=o[e],f=s[e];if(i===void 0)continue;i.updateMatrix&&i.updateMatrix();let p=n._createAnimationTracks(i,l,u,d,f);if(p)for(let e=0;e<p.length;e++)c.push(p[e])}return new Cc(i,void 0,c)})}createNodeMesh(e){let t=this.json,n=this,r=t.nodes[e];return r.mesh===void 0?null:n.getDependency(`mesh`,r.mesh).then(function(e){let t=n._getNodeRef(n.meshCache,r.mesh,e);return r.weights!==void 0&&t.traverse(function(e){if(e.isMesh)for(let t=0,n=r.weights.length;t<n;t++)e.morphTargetInfluences[t]=r.weights[t]}),t})}loadNode(e){let t=this.json,n=this,r=t.nodes[e],i=n._loadNodeShallow(e),a=[],o=r.children||[];for(let e=0,t=o.length;e<t;e++)a.push(n.getDependency(`node`,o[e]));let s=r.skin===void 0?Promise.resolve(null):n.getDependency(`skin`,r.skin);return Promise.all([i,Promise.all(a),s]).then(function(e){let t=e[0],n=e[1],r=e[2];r!==null&&t.traverse(function(e){e.isSkinnedMesh&&e.bind(r,sf)});for(let e=0,r=n.length;e<r;e++)t.add(n[e]);return t})}_loadNodeShallow(e){let t=this.json,n=this.extensions,r=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];let i=t.nodes[e],a=i.name?r.createUniqueName(i.name):``,o=[],s=r._invokeOne(function(t){return t.createNodeMesh&&t.createNodeMesh(e)});return s&&o.push(s),i.camera!==void 0&&o.push(r.getDependency(`camera`,i.camera).then(function(e){return r._getNodeRef(r.cameraCache,i.camera,e)})),r._invokeAll(function(t){return t.createNodeAttachment&&t.createNodeAttachment(e)}).forEach(function(e){o.push(e)}),this.nodeCache[e]=Promise.all(o).then(function(t){let o;if(o=i.isBone===!0?new bs:t.length>1?new Jo:t.length===1?t[0]:new Sn,o!==t[0])for(let e=0,n=t.length;e<n;e++)o.add(t[e]);if(i.name&&(o.userData.name=i.name,o.name=a),$d(o,i),i.extensions&&Qd(n,o,i),i.matrix!==void 0){let e=new W;e.fromArray(i.matrix),o.applyMatrix4(e)}else i.translation!==void 0&&o.position.fromArray(i.translation),i.rotation!==void 0&&o.quaternion.fromArray(i.rotation),i.scale!==void 0&&o.scale.fromArray(i.scale);return r.associations.has(o)||r.associations.set(o,{}),r.associations.get(o).nodes=e,o}),this.nodeCache[e]}loadScene(e){let t=this.extensions,n=this.json.scenes[e],r=this,i=new Jo;n.name&&(i.name=r.createUniqueName(n.name)),$d(i,n),n.extensions&&Qd(t,i,n);let a=n.nodes||[],o=[];for(let e=0,t=a.length;e<t;e++)o.push(r.getDependency(`node`,a[e]));return Promise.all(o).then(function(e){for(let t=0,n=e.length;t<n;t++)i.add(e[t]);return r.associations=(e=>{let t=new Map;for(let[e,n]of r.associations)(e instanceof Bn||e instanceof pt)&&t.set(e,n);return e.traverse(e=>{let n=r.associations.get(e);n!=null&&t.set(e,n)}),t})(i),i})}_createAnimationTracks(e,t,n,r,i){let a=[],o=e.name?e.name:e.uuid,s=[];Jd[i.path]===Jd.weights?e.traverse(function(e){e.morphTargetInfluences&&s.push(e.name?e.name:e.uuid)}):s.push(o);let c;switch(Jd[i.path]){case Jd.weights:c=vc;break;case Jd.rotation:c=bc;break;case Jd.position:case Jd.scale:c=Sc;break;default:switch(n.itemSize){case 1:c=vc;break;default:c=Sc}}let l=r.interpolation===void 0?I:Yd[r.interpolation],u=this._getArrayFromAccessor(n);for(let e=0,n=s.length;e<n;e++){let n=new c(s[e]+`.`+Jd[i.path],t.array,u,l);r.interpolation===`CUBICSPLINE`&&this._createCubicSplineTrackInterpolant(n),a.push(n)}return a}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){let e=af(t.constructor),n=new Float32Array(t.length);for(let r=0,i=t.length;r<i;r++)n[r]=t[r]*e;t=n}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(e){return new(this instanceof bc?Vd:zd)(this.times,this.values,this.getValueSize()/3,e)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}};function lf(e,t,n){let r=t.attributes,i=new St;if(r.POSITION!==void 0){let e=n.json.accessors[r.POSITION],t=e.min,a=e.max;if(t!==void 0&&a!==void 0){if(i.set(new U(t[0],t[1],t[2]),new U(a[0],a[1],a[2])),e.normalized){let t=af(Ud[e.componentType]);i.min.multiplyScalar(t),i.max.multiplyScalar(t)}}else{console.warn(`THREE.GLTFLoader: Missing min/max properties for accessor POSITION.`);return}}else return;let a=t.targets;if(a!==void 0){let e=new U,t=new U;for(let r=0,i=a.length;r<i;r++){let i=a[r];if(i.POSITION!==void 0){let r=n.json.accessors[i.POSITION],a=r.min,o=r.max;if(a!==void 0&&o!==void 0){if(t.setX(Math.max(Math.abs(a[0]),Math.abs(o[0]))),t.setY(Math.max(Math.abs(a[1]),Math.abs(o[1]))),t.setZ(Math.max(Math.abs(a[2]),Math.abs(o[2]))),r.normalized){let e=af(Ud[r.componentType]);t.multiplyScalar(e)}e.max(t)}else console.warn(`THREE.GLTFLoader: Missing min/max properties for accessor POSITION.`)}}i.expandByVector(e)}e.boundingBox=i;let o=new Bt;i.getCenter(o.center),o.radius=i.min.distanceTo(i.max)/2,e.boundingSphere=o}function uf(e,t,n){let r=t.attributes,i=[];function a(t,r){return n.getDependency(`accessor`,t).then(function(t){e.setAttribute(r,t)})}for(let t in r){let n=qd[t]||t.toLowerCase();n in e.attributes||i.push(a(r[t],n))}if(t.indices!==void 0&&!e.index){let r=n.getDependency(`accessor`,t.indices).then(function(t){e.setIndex(t)});i.push(r)}return it.workingColorSpace!==`srgb-linear`&&`COLOR_0`in r&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${it.workingColorSpace}" not supported.`),$d(e,t),lf(e,t,n),Promise.all(i).then(function(){return t.targets===void 0?e:ef(e,t.targets,n)})}var df=class{constructor(e=4){this.pool=e,this.queue=[],this.workers=[],this.workersResolve=[],this.workerStatus=0}_initWorker(e){if(!this.workers[e]){let t=this.workerCreator();t.addEventListener(`message`,this._onMessage.bind(this,e)),this.workers[e]=t}}_getIdleWorker(){for(let e=0;e<this.pool;e++)if(!(this.workerStatus&1<<e))return e;return-1}_onMessage(e,t){let n=this.workersResolve[e];if(n&&n(t),this.queue.length){let{resolve:t,msg:n,transfer:r}=this.queue.shift();this.workersResolve[e]=t,this.workers[e].postMessage(n,r)}else this.workerStatus^=1<<e}setWorkerCreator(e){this.workerCreator=e}setWorkerLimit(e){this.pool=e}postMessage(e,t){return new Promise(n=>{let r=this._getIdleWorker();r===-1?this.queue.push({resolve:n,msg:e,transfer:t}):(this._initWorker(r),this.workerStatus|=1<<r,this.workersResolve[r]=n,this.workers[r].postMessage(e,t))})}dispose(){this.workers.forEach(e=>e.terminate()),this.workersResolve.length=0,this.workers.length=0,this.queue.length=0,this.workerStatus=0}},ff=class{constructor(){this.vkFormat=0,this.typeSize=1,this.pixelWidth=0,this.pixelHeight=0,this.pixelDepth=0,this.layerCount=0,this.faceCount=1,this.supercompressionScheme=0,this.levels=[],this.dataFormatDescriptor=[{vendorId:0,descriptorType:0,descriptorBlockSize:0,versionNumber:2,colorModel:0,colorPrimaries:1,transferFunction:2,flags:0,texelBlockDimension:[0,0,0,0],bytesPlane:[0,0,0,0,0,0,0,0],samples:[]}],this.keyValue={},this.globalData=null}},pf=class{constructor(e,t,n,r){this._dataView=new DataView(e.buffer,e.byteOffset+t,n),this._littleEndian=r,this._offset=0}_nextUint8(){let e=this._dataView.getUint8(this._offset);return this._offset+=1,e}_nextUint16(){let e=this._dataView.getUint16(this._offset,this._littleEndian);return this._offset+=2,e}_nextUint32(){let e=this._dataView.getUint32(this._offset,this._littleEndian);return this._offset+=4,e}_nextUint64(){let e=this._dataView.getUint32(this._offset,this._littleEndian)+2**32*this._dataView.getUint32(this._offset+4,this._littleEndian);return this._offset+=8,e}_nextInt32(){let e=this._dataView.getInt32(this._offset,this._littleEndian);return this._offset+=4,e}_skip(e){return this._offset+=e,this}_scan(e,t=0){let n=this._offset,r=0;for(;this._dataView.getUint8(this._offset)!==t&&r<e;)r++,this._offset++;return r<e&&this._offset++,new Uint8Array(this._dataView.buffer,this._dataView.byteOffset+n,r)}};new Uint8Array([0]);var mf=[171,75,84,88,32,50,48,187,13,10,26,10];function hf(e){return typeof TextDecoder<`u`?new TextDecoder().decode(e):Buffer.from(e).toString(`utf8`)}function gf(e){let t=new Uint8Array(e.buffer,e.byteOffset,mf.length);if(t[0]!==mf[0]||t[1]!==mf[1]||t[2]!==mf[2]||t[3]!==mf[3]||t[4]!==mf[4]||t[5]!==mf[5]||t[6]!==mf[6]||t[7]!==mf[7]||t[8]!==mf[8]||t[9]!==mf[9]||t[10]!==mf[10]||t[11]!==mf[11])throw Error(`Missing KTX 2.0 identifier.`);let n=new ff,r=17*Uint32Array.BYTES_PER_ELEMENT,i=new pf(e,mf.length,r,!0);n.vkFormat=i._nextUint32(),n.typeSize=i._nextUint32(),n.pixelWidth=i._nextUint32(),n.pixelHeight=i._nextUint32(),n.pixelDepth=i._nextUint32(),n.layerCount=i._nextUint32(),n.faceCount=i._nextUint32();let a=i._nextUint32();n.supercompressionScheme=i._nextUint32();let o=i._nextUint32(),s=i._nextUint32(),c=i._nextUint32(),l=i._nextUint32(),u=i._nextUint64(),d=i._nextUint64(),f=new pf(e,mf.length+r,3*a*8,!0);for(let t=0;t<a;t++)n.levels.push({levelData:new Uint8Array(e.buffer,e.byteOffset+f._nextUint64(),f._nextUint64()),uncompressedByteLength:f._nextUint64()});let p=new pf(e,o,s,!0),m={vendorId:p._skip(4)._nextUint16(),descriptorType:p._nextUint16(),versionNumber:p._nextUint16(),descriptorBlockSize:p._nextUint16(),colorModel:p._nextUint8(),colorPrimaries:p._nextUint8(),transferFunction:p._nextUint8(),flags:p._nextUint8(),texelBlockDimension:[p._nextUint8(),p._nextUint8(),p._nextUint8(),p._nextUint8()],bytesPlane:[p._nextUint8(),p._nextUint8(),p._nextUint8(),p._nextUint8(),p._nextUint8(),p._nextUint8(),p._nextUint8(),p._nextUint8()],samples:[]},h=(m.descriptorBlockSize/4-6)/4;for(let e=0;e<h;e++){let t={bitOffset:p._nextUint16(),bitLength:p._nextUint8(),channelType:p._nextUint8(),samplePosition:[p._nextUint8(),p._nextUint8(),p._nextUint8(),p._nextUint8()],sampleLower:-1/0,sampleUpper:1/0};64&t.channelType?(t.sampleLower=p._nextInt32(),t.sampleUpper=p._nextInt32()):(t.sampleLower=p._nextUint32(),t.sampleUpper=p._nextUint32()),m.samples[e]=t}n.dataFormatDescriptor.length=0,n.dataFormatDescriptor.push(m);let g=new pf(e,c,l,!0);for(;g._offset<l;){let e=g._nextUint32(),t=g._scan(e),r=hf(t),i=g._scan(e-t.byteLength);n.keyValue[r]=r.match(/^ktx/i)?hf(i):i,g._offset%4&&g._skip(4-g._offset%4)}if(d<=0)return n;let _=new pf(e,u,d,!0),v=_._nextUint16(),y=_._nextUint16(),b=_._nextUint32(),x=_._nextUint32(),S=_._nextUint32(),C=_._nextUint32(),w=[];for(let e=0;e<a;e++)w.push({imageFlags:_._nextUint32(),rgbSliceByteOffset:_._nextUint32(),rgbSliceByteLength:_._nextUint32(),alphaSliceByteOffset:_._nextUint32(),alphaSliceByteLength:_._nextUint32()});let T=u+_._offset,E=T+b,D=E+x,O=D+S;return n.globalData={endpointCount:v,selectorCount:y,imageDescs:w,endpointsData:new Uint8Array(e.buffer,e.byteOffset+T,b),selectorsData:new Uint8Array(e.buffer,e.byteOffset+E,x),tablesData:new Uint8Array(e.buffer,e.byteOffset+D,S),extendedData:new Uint8Array(e.buffer,e.byteOffset+O,C)},n}var _f,vf,yf,bf={env:{emscripten_notify_memory_growth:function(e){yf=new Uint8Array(vf.exports.memory.buffer)}}},xf=class{init(){return _f||(_f=typeof fetch<`u`?fetch(`data:application/wasm;base64,`+Sf).then(e=>e.arrayBuffer()).then(e=>WebAssembly.instantiate(e,bf)).then(this._init):WebAssembly.instantiate(Buffer.from(Sf,`base64`),bf).then(this._init),_f)}_init(e){vf=e.instance,bf.env.emscripten_notify_memory_growth(0)}decode(e,t=0){if(!vf)throw Error(`ZSTDDecoder: Await .init() before decoding.`);let n=e.byteLength,r=vf.exports.malloc(n);yf.set(e,r),t||=Number(vf.exports.ZSTD_findDecompressedSize(r,n));let i=vf.exports.malloc(t),a=vf.exports.ZSTD_decompress(i,t,r,n),o=yf.slice(i,i+a);return vf.exports.free(r),vf.exports.free(i),o}},Sf=`AGFzbQEAAAABpQEVYAF/AX9gAn9/AGADf39/AX9gBX9/f39/AX9gAX8AYAJ/fwF/YAR/f39/AX9gA39/fwBgBn9/f39/fwF/YAd/f39/f39/AX9gAn9/AX5gAn5+AX5gAABgBX9/f39/AGAGf39/f39/AGAIf39/f39/f38AYAl/f39/f39/f38AYAABf2AIf39/f39/f38Bf2ANf39/f39/f39/f39/fwF/YAF/AX4CJwEDZW52H2Vtc2NyaXB0ZW5fbm90aWZ5X21lbW9yeV9ncm93dGgABANpaAEFAAAFAgEFCwACAQABAgIFBQcAAwABDgsBAQcAEhMHAAUBDAQEAAANBwQCAgYCBAgDAwMDBgEACQkHBgICAAYGAgQUBwYGAwIGAAMCAQgBBwUGCgoEEQAEBAEIAwgDBQgDEA8IAAcABAUBcAECAgUEAQCAAgYJAX8BQaCgwAILB2AHBm1lbW9yeQIABm1hbGxvYwAoBGZyZWUAJgxaU1REX2lzRXJyb3IAaBlaU1REX2ZpbmREZWNvbXByZXNzZWRTaXplAFQPWlNURF9kZWNvbXByZXNzAEoGX3N0YXJ0ACQJBwEAQQELASQKussBaA8AIAAgACgCBCABajYCBAsZACAAKAIAIAAoAgRBH3F0QQAgAWtBH3F2CwgAIABBiH9LC34BBH9BAyEBIAAoAgQiA0EgTQRAIAAoAggiASAAKAIQTwRAIAAQDQ8LIAAoAgwiAiABRgRAQQFBAiADQSBJGw8LIAAgASABIAJrIANBA3YiBCABIARrIAJJIgEbIgJrIgQ2AgggACADIAJBA3RrNgIEIAAgBCgAADYCAAsgAQsUAQF/IAAgARACIQIgACABEAEgAgv3AQECfyACRQRAIABCADcCACAAQQA2AhAgAEIANwIIQbh/DwsgACABNgIMIAAgAUEEajYCECACQQRPBEAgACABIAJqIgFBfGoiAzYCCCAAIAMoAAA2AgAgAUF/ai0AACIBBEAgAEEIIAEQFGs2AgQgAg8LIABBADYCBEF/DwsgACABNgIIIAAgAS0AACIDNgIAIAJBfmoiBEEBTQRAIARBAWtFBEAgACABLQACQRB0IANyIgM2AgALIAAgAS0AAUEIdCADajYCAAsgASACakF/ai0AACIBRQRAIABBADYCBEFsDwsgAEEoIAEQFCACQQN0ams2AgQgAgsWACAAIAEpAAA3AAAgACABKQAINwAICy8BAX8gAUECdEGgHWooAgAgACgCAEEgIAEgACgCBGprQR9xdnEhAiAAIAEQASACCyEAIAFCz9bTvtLHq9lCfiAAfEIfiUKHla+vmLbem55/fgsdAQF/IAAoAgggACgCDEYEfyAAKAIEQSBGBUEACwuCBAEDfyACQYDAAE8EQCAAIAEgAhBnIAAPCyAAIAJqIQMCQCAAIAFzQQNxRQRAAkAgAkEBSARAIAAhAgwBCyAAQQNxRQRAIAAhAgwBCyAAIQIDQCACIAEtAAA6AAAgAUEBaiEBIAJBAWoiAiADTw0BIAJBA3ENAAsLAkAgA0F8cSIEQcAASQ0AIAIgBEFAaiIFSw0AA0AgAiABKAIANgIAIAIgASgCBDYCBCACIAEoAgg2AgggAiABKAIMNgIMIAIgASgCEDYCECACIAEoAhQ2AhQgAiABKAIYNgIYIAIgASgCHDYCHCACIAEoAiA2AiAgAiABKAIkNgIkIAIgASgCKDYCKCACIAEoAiw2AiwgAiABKAIwNgIwIAIgASgCNDYCNCACIAEoAjg2AjggAiABKAI8NgI8IAFBQGshASACQUBrIgIgBU0NAAsLIAIgBE8NAQNAIAIgASgCADYCACABQQRqIQEgAkEEaiICIARJDQALDAELIANBBEkEQCAAIQIMAQsgA0F8aiIEIABJBEAgACECDAELIAAhAgNAIAIgAS0AADoAACACIAEtAAE6AAEgAiABLQACOgACIAIgAS0AAzoAAyABQQRqIQEgAkEEaiICIARNDQALCyACIANJBEADQCACIAEtAAA6AAAgAUEBaiEBIAJBAWoiAiADRw0ACwsgAAsMACAAIAEpAAA3AAALQQECfyAAKAIIIgEgACgCEEkEQEEDDwsgACAAKAIEIgJBB3E2AgQgACABIAJBA3ZrIgE2AgggACABKAAANgIAQQALDAAgACABKAIANgAAC/cCAQJ/AkAgACABRg0AAkAgASACaiAASwRAIAAgAmoiBCABSw0BCyAAIAEgAhALDwsgACABc0EDcSEDAkACQCAAIAFJBEAgAwRAIAAhAwwDCyAAQQNxRQRAIAAhAwwCCyAAIQMDQCACRQ0EIAMgAS0AADoAACABQQFqIQEgAkF/aiECIANBAWoiA0EDcQ0ACwwBCwJAIAMNACAEQQNxBEADQCACRQ0FIAAgAkF/aiICaiIDIAEgAmotAAA6AAAgA0EDcQ0ACwsgAkEDTQ0AA0AgACACQXxqIgJqIAEgAmooAgA2AgAgAkEDSw0ACwsgAkUNAgNAIAAgAkF/aiICaiABIAJqLQAAOgAAIAINAAsMAgsgAkEDTQ0AIAIhBANAIAMgASgCADYCACABQQRqIQEgA0EEaiEDIARBfGoiBEEDSw0ACyACQQNxIQILIAJFDQADQCADIAEtAAA6AAAgA0EBaiEDIAFBAWohASACQX9qIgINAAsLIAAL8wICAn8BfgJAIAJFDQAgACACaiIDQX9qIAE6AAAgACABOgAAIAJBA0kNACADQX5qIAE6AAAgACABOgABIANBfWogAToAACAAIAE6AAIgAkEHSQ0AIANBfGogAToAACAAIAE6AAMgAkEJSQ0AIABBACAAa0EDcSIEaiIDIAFB/wFxQYGChAhsIgE2AgAgAyACIARrQXxxIgRqIgJBfGogATYCACAEQQlJDQAgAyABNgIIIAMgATYCBCACQXhqIAE2AgAgAkF0aiABNgIAIARBGUkNACADIAE2AhggAyABNgIUIAMgATYCECADIAE2AgwgAkFwaiABNgIAIAJBbGogATYCACACQWhqIAE2AgAgAkFkaiABNgIAIAQgA0EEcUEYciIEayICQSBJDQAgAa0iBUIghiAFhCEFIAMgBGohAQNAIAEgBTcDGCABIAU3AxAgASAFNwMIIAEgBTcDACABQSBqIQEgAkFgaiICQR9LDQALCyAACy8BAn8gACgCBCAAKAIAQQJ0aiICLQACIQMgACACLwEAIAEgAi0AAxAIajYCACADCy8BAn8gACgCBCAAKAIAQQJ0aiICLQACIQMgACACLwEAIAEgAi0AAxAFajYCACADCx8AIAAgASACKAIEEAg2AgAgARAEGiAAIAJBCGo2AgQLCAAgAGdBH3MLugUBDX8jAEEQayIKJAACfyAEQQNNBEAgCkEANgIMIApBDGogAyAEEAsaIAAgASACIApBDGpBBBAVIgBBbCAAEAMbIAAgACAESxsMAQsgAEEAIAEoAgBBAXRBAmoQECENQVQgAygAACIGQQ9xIgBBCksNABogAiAAQQVqNgIAIAMgBGoiAkF8aiEMIAJBeWohDiACQXtqIRAgAEEGaiELQQQhBSAGQQR2IQRBICAAdCIAQQFyIQkgASgCACEPQQAhAiADIQYCQANAIAlBAkggAiAPS3JFBEAgAiEHAkAgCARAA0AgBEH//wNxQf//A0YEQCAHQRhqIQcgBiAQSQR/IAZBAmoiBigAACAFdgUgBUEQaiEFIARBEHYLIQQMAQsLA0AgBEEDcSIIQQNGBEAgBUECaiEFIARBAnYhBCAHQQNqIQcMAQsLIAcgCGoiByAPSw0EIAVBAmohBQNAIAIgB0kEQCANIAJBAXRqQQA7AQAgAkEBaiECDAELCyAGIA5LQQAgBiAFQQN1aiIHIAxLG0UEQCAHKAAAIAVBB3EiBXYhBAwCCyAEQQJ2IQQLIAYhBwsCfyALQX9qIAQgAEF/anEiBiAAQQF0QX9qIgggCWsiEUkNABogBCAIcSIEQQAgESAEIABIG2shBiALCyEIIA0gAkEBdGogBkF/aiIEOwEAIAlBASAGayAEIAZBAUgbayEJA0AgCSAASARAIABBAXUhACALQX9qIQsMAQsLAn8gByAOS0EAIAcgBSAIaiIFQQN1aiIGIAxLG0UEQCAFQQdxDAELIAUgDCIGIAdrQQN0awshBSACQQFqIQIgBEUhCCAGKAAAIAVBH3F2IQQMAQsLQWwgCUEBRyAFQSBKcg0BGiABIAJBf2o2AgAgBiAFQQdqQQN1aiADawwBC0FQCyEAIApBEGokACAACwkAQQFBBSAAGwsMACAAIAEoAAA2AAALqgMBCn8jAEHwAGsiCiQAIAJBAWohDiAAQQhqIQtBgIAEIAVBf2p0QRB1IQxBACECQQEhBkEBIAV0IglBf2oiDyEIA0AgAiAORkUEQAJAIAEgAkEBdCINai8BACIHQf//A0YEQCALIAhBA3RqIAI2AgQgCEF/aiEIQQEhBwwBCyAGQQAgDCAHQRB0QRB1ShshBgsgCiANaiAHOwEAIAJBAWohAgwBCwsgACAFNgIEIAAgBjYCACAJQQN2IAlBAXZqQQNqIQxBACEAQQAhBkEAIQIDQCAGIA5GBEADQAJAIAAgCUYNACAKIAsgAEEDdGoiASgCBCIGQQF0aiICIAIvAQAiAkEBajsBACABIAUgAhAUayIIOgADIAEgAiAIQf8BcXQgCWs7AQAgASAEIAZBAnQiAmooAgA6AAIgASACIANqKAIANgIEIABBAWohAAwBCwsFIAEgBkEBdGouAQAhDUEAIQcDQCAHIA1ORQRAIAsgAkEDdGogBjYCBANAIAIgDGogD3EiAiAISw0ACyAHQQFqIQcMAQsLIAZBAWohBgwBCwsgCkHwAGokAAsjAEIAIAEQCSAAhUKHla+vmLbem55/fkLj3MqV/M7y9YV/fAsQACAAQn43AwggACABNgIACyQBAX8gAARAIAEoAgQiAgRAIAEoAgggACACEQEADwsgABAmCwsfACAAIAEgAi8BABAINgIAIAEQBBogACACQQRqNgIEC0oBAX9BoCAoAgAiASAAaiIAQX9MBEBBiCBBMDYCAEF/DwsCQCAAPwBBEHRNDQAgABBmDQBBiCBBMDYCAEF/DwtBoCAgADYCACABC9cBAQh/Qbp/IQoCQCACKAIEIgggAigCACIJaiIOIAEgAGtLDQBBbCEKIAkgBCADKAIAIgtrSw0AIAAgCWoiBCACKAIIIgxrIQ0gACABQWBqIg8gCyAJQQAQKSADIAkgC2o2AgACQAJAIAwgBCAFa00EQCANIQUMAQsgDCAEIAZrSw0CIAcgDSAFayIAaiIBIAhqIAdNBEAgBCABIAgQDxoMAgsgBCABQQAgAGsQDyEBIAIgACAIaiIINgIEIAEgAGshBAsgBCAPIAUgCEEBECkLIA4hCgsgCgubAgEBfyMAQYABayINJAAgDSADNgJ8AkAgAkEDSwRAQX8hCQwBCwJAAkACQAJAIAJBAWsOAwADAgELIAZFBEBBuH8hCQwEC0FsIQkgBS0AACICIANLDQMgACAHIAJBAnQiAmooAgAgAiAIaigCABA7IAEgADYCAEEBIQkMAwsgASAJNgIAQQAhCQwCCyAKRQRAQWwhCQwCC0EAIQkgC0UgDEEZSHINAUEIIAR0QQhqIQBBACECA0AgAiAATw0CIAJBQGshAgwAAAsAC0FsIQkgDSANQfwAaiANQfgAaiAFIAYQFSICEAMNACANKAJ4IgMgBEsNACAAIA0gDSgCfCAHIAggAxAYIAEgADYCACACIQkLIA1BgAFqJAAgCQsLACAAIAEgAhALGgsQACAALwAAIAAtAAJBEHRyCy8AAn9BuH8gAUEISQ0AGkFyIAAoAAQiAEF3Sw0AGkG4fyAAQQhqIgAgACABSxsLCwkAIAAgATsAAAsDAAELigYBBX8gACAAKAIAIgVBfnE2AgBBACAAIAVBAXZqQYQgKAIAIgQgAEYbIQECQAJAIAAoAgQiAkUNACACKAIAIgNBAXENACACQQhqIgUgA0EBdkF4aiIDQQggA0EISxtnQR9zQQJ0QYAfaiIDKAIARgRAIAMgAigCDDYCAAsgAigCCCIDBEAgAyACKAIMNgIECyACKAIMIgMEQCADIAIoAgg2AgALIAIgAigCACAAKAIAQX5xajYCAEGEICEAAkACQCABRQ0AIAEgAjYCBCABKAIAIgNBAXENASADQQF2QXhqIgNBCCADQQhLG2dBH3NBAnRBgB9qIgMoAgAgAUEIakYEQCADIAEoAgw2AgALIAEoAggiAwRAIAMgASgCDDYCBAsgASgCDCIDBEAgAyABKAIINgIAQYQgKAIAIQQLIAIgAigCACABKAIAQX5xajYCACABIARGDQAgASABKAIAQQF2akEEaiEACyAAIAI2AgALIAIoAgBBAXZBeGoiAEEIIABBCEsbZ0Efc0ECdEGAH2oiASgCACEAIAEgBTYCACACIAA2AgwgAkEANgIIIABFDQEgACAFNgIADwsCQCABRQ0AIAEoAgAiAkEBcQ0AIAJBAXZBeGoiAkEIIAJBCEsbZ0Efc0ECdEGAH2oiAigCACABQQhqRgRAIAIgASgCDDYCAAsgASgCCCICBEAgAiABKAIMNgIECyABKAIMIgIEQCACIAEoAgg2AgBBhCAoAgAhBAsgACAAKAIAIAEoAgBBfnFqIgI2AgACQCABIARHBEAgASABKAIAQQF2aiAANgIEIAAoAgAhAgwBC0GEICAANgIACyACQQF2QXhqIgFBCCABQQhLG2dBH3NBAnRBgB9qIgIoAgAhASACIABBCGoiAjYCACAAIAE2AgwgAEEANgIIIAFFDQEgASACNgIADwsgBUEBdkF4aiIBQQggAUEISxtnQR9zQQJ0QYAfaiICKAIAIQEgAiAAQQhqIgI2AgAgACABNgIMIABBADYCCCABRQ0AIAEgAjYCAAsLDgAgAARAIABBeGoQJQsLgAIBA38CQCAAQQ9qQXhxQYQgKAIAKAIAQQF2ayICEB1Bf0YNAAJAQYQgKAIAIgAoAgAiAUEBcQ0AIAFBAXZBeGoiAUEIIAFBCEsbZ0Efc0ECdEGAH2oiASgCACAAQQhqRgRAIAEgACgCDDYCAAsgACgCCCIBBEAgASAAKAIMNgIECyAAKAIMIgFFDQAgASAAKAIINgIAC0EBIQEgACAAKAIAIAJBAXRqIgI2AgAgAkEBcQ0AIAJBAXZBeGoiAkEIIAJBCEsbZ0Efc0ECdEGAH2oiAygCACECIAMgAEEIaiIDNgIAIAAgAjYCDCAAQQA2AgggAkUNACACIAM2AgALIAELtwIBA38CQAJAIABBASAAGyICEDgiAA0AAkACQEGEICgCACIARQ0AIAAoAgAiA0EBcQ0AIAAgA0EBcjYCACADQQF2QXhqIgFBCCABQQhLG2dBH3NBAnRBgB9qIgEoAgAgAEEIakYEQCABIAAoAgw2AgALIAAoAggiAQRAIAEgACgCDDYCBAsgACgCDCIBBEAgASAAKAIINgIACyACECchAkEAIQFBhCAoAgAhACACDQEgACAAKAIAQX5xNgIAQQAPCyACQQ9qQXhxIgMQHSICQX9GDQIgAkEHakF4cSIAIAJHBEAgACACaxAdQX9GDQMLAkBBhCAoAgAiAUUEQEGAICAANgIADAELIAAgATYCBAtBhCAgADYCACAAIANBAXRBAXI2AgAMAQsgAEUNAQsgAEEIaiEBCyABC7kDAQJ/IAAgA2ohBQJAIANBB0wEQANAIAAgBU8NAiAAIAItAAA6AAAgAEEBaiEAIAJBAWohAgwAAAsACyAEQQFGBEACQCAAIAJrIgZBB00EQCAAIAItAAA6AAAgACACLQABOgABIAAgAi0AAjoAAiAAIAItAAM6AAMgAEEEaiACIAZBAnQiBkHAHmooAgBqIgIQFyACIAZB4B5qKAIAayECDAELIAAgAhAMCyACQQhqIQIgAEEIaiEACwJAAkACQAJAIAUgAU0EQCAAIANqIQEgBEEBRyAAIAJrQQ9Kcg0BA0AgACACEAwgAkEIaiECIABBCGoiACABSQ0ACwwFCyAAIAFLBEAgACEBDAQLIARBAUcgACACa0EPSnINASAAIQMgAiEEA0AgAyAEEAwgBEEIaiEEIANBCGoiAyABSQ0ACwwCCwNAIAAgAhAHIAJBEGohAiAAQRBqIgAgAUkNAAsMAwsgACEDIAIhBANAIAMgBBAHIARBEGohBCADQRBqIgMgAUkNAAsLIAIgASAAa2ohAgsDQCABIAVPDQEgASACLQAAOgAAIAFBAWohASACQQFqIQIMAAALAAsLQQECfyAAIAAoArjgASIDNgLE4AEgACgCvOABIQQgACABNgK84AEgACABIAJqNgK44AEgACABIAQgA2tqNgLA4AELpgEBAX8gACAAKALs4QEQFjYCyOABIABCADcD+OABIABCADcDuOABIABBwOABakIANwMAIABBqNAAaiIBQYyAgOAANgIAIABBADYCmOIBIABCADcDiOEBIABCAzcDgOEBIABBrNABakHgEikCADcCACAAQbTQAWpB6BIoAgA2AgAgACABNgIMIAAgAEGYIGo2AgggACAAQaAwajYCBCAAIABBEGo2AgALYQEBf0G4fyEDAkAgAUEDSQ0AIAIgABAhIgFBA3YiADYCCCACIAFBAXE2AgQgAiABQQF2QQNxIgM2AgACQCADQX9qIgFBAksNAAJAIAFBAWsOAgEAAgtBbA8LIAAhAwsgAwsMACAAIAEgAkEAEC4LiAQCA38CfiADEBYhBCAAQQBBKBAQIQAgBCACSwRAIAQPCyABRQRAQX8PCwJAAkAgA0EBRg0AIAEoAAAiBkGo6r5pRg0AQXYhAyAGQXBxQdDUtMIBRw0BQQghAyACQQhJDQEgAEEAQSgQECEAIAEoAAQhASAAQQE2AhQgACABrTcDAEEADwsgASACIAMQLyIDIAJLDQAgACADNgIYQXIhAyABIARqIgVBf2otAAAiAkEIcQ0AIAJBIHEiBkUEQEFwIQMgBS0AACIFQacBSw0BIAVBB3GtQgEgBUEDdkEKaq2GIgdCA4h+IAd8IQggBEEBaiEECyACQQZ2IQMgAkECdiEFAkAgAkEDcUF/aiICQQJLBEBBACECDAELAkACQAJAIAJBAWsOAgECAAsgASAEai0AACECIARBAWohBAwCCyABIARqLwAAIQIgBEECaiEEDAELIAEgBGooAAAhAiAEQQRqIQQLIAVBAXEhBQJ+AkACQAJAIANBf2oiA0ECTQRAIANBAWsOAgIDAQtCfyAGRQ0DGiABIARqMQAADAMLIAEgBGovAACtQoACfAwCCyABIARqKAAArQwBCyABIARqKQAACyEHIAAgBTYCICAAIAI2AhwgACAHNwMAQQAhAyAAQQA2AhQgACAHIAggBhsiBzcDCCAAIAdCgIAIIAdCgIAIVBs+AhALIAMLWwEBf0G4fyEDIAIQFiICIAFNBH8gACACakF/ai0AACIAQQNxQQJ0QaAeaigCACACaiAAQQZ2IgFBAnRBsB5qKAIAaiAAQSBxIgBFaiABRSAAQQV2cWoFQbh/CwsdACAAKAKQ4gEQWiAAQQA2AqDiASAAQgA3A5DiAQu1AwEFfyMAQZACayIKJABBuH8hBgJAIAVFDQAgBCwAACIIQf8BcSEHAkAgCEF/TARAIAdBgn9qQQF2IgggBU8NAkFsIQYgB0GBf2oiBUGAAk8NAiAEQQFqIQdBACEGA0AgBiAFTwRAIAUhBiAIIQcMAwUgACAGaiAHIAZBAXZqIgQtAABBBHY6AAAgACAGQQFyaiAELQAAQQ9xOgAAIAZBAmohBgwBCwAACwALIAcgBU8NASAAIARBAWogByAKEFMiBhADDQELIAYhBEEAIQYgAUEAQTQQECEJQQAhBQNAIAQgBkcEQCAAIAZqIggtAAAiAUELSwRAQWwhBgwDBSAJIAFBAnRqIgEgASgCAEEBajYCACAGQQFqIQZBASAILQAAdEEBdSAFaiEFDAILAAsLQWwhBiAFRQ0AIAUQFEEBaiIBQQxLDQAgAyABNgIAQQFBASABdCAFayIDEBQiAXQgA0cNACAAIARqIAFBAWoiADoAACAJIABBAnRqIgAgACgCAEEBajYCACAJKAIEIgBBAkkgAEEBcXINACACIARBAWo2AgAgB0EBaiEGCyAKQZACaiQAIAYLxhEBDH8jAEHwAGsiBSQAQWwhCwJAIANBCkkNACACLwAAIQogAi8AAiEJIAIvAAQhByAFQQhqIAQQDgJAIAMgByAJIApqakEGaiIMSQ0AIAUtAAohCCAFQdgAaiACQQZqIgIgChAGIgsQAw0BIAVBQGsgAiAKaiICIAkQBiILEAMNASAFQShqIAIgCWoiAiAHEAYiCxADDQEgBUEQaiACIAdqIAMgDGsQBiILEAMNASAAIAFqIg9BfWohECAEQQRqIQZBASELIAAgAUEDakECdiIDaiIMIANqIgIgA2oiDiEDIAIhBCAMIQcDQCALIAMgEElxBEAgACAGIAVB2ABqIAgQAkECdGoiCS8BADsAACAFQdgAaiAJLQACEAEgCS0AAyELIAcgBiAFQUBrIAgQAkECdGoiCS8BADsAACAFQUBrIAktAAIQASAJLQADIQogBCAGIAVBKGogCBACQQJ0aiIJLwEAOwAAIAVBKGogCS0AAhABIAktAAMhCSADIAYgBUEQaiAIEAJBAnRqIg0vAQA7AAAgBUEQaiANLQACEAEgDS0AAyENIAAgC2oiCyAGIAVB2ABqIAgQAkECdGoiAC8BADsAACAFQdgAaiAALQACEAEgAC0AAyEAIAcgCmoiCiAGIAVBQGsgCBACQQJ0aiIHLwEAOwAAIAVBQGsgBy0AAhABIActAAMhByAEIAlqIgkgBiAFQShqIAgQAkECdGoiBC8BADsAACAFQShqIAQtAAIQASAELQADIQQgAyANaiIDIAYgBUEQaiAIEAJBAnRqIg0vAQA7AAAgBUEQaiANLQACEAEgACALaiEAIAcgCmohByAEIAlqIQQgAyANLQADaiEDIAVB2ABqEA0gBUFAaxANciAFQShqEA1yIAVBEGoQDXJFIQsMAQsLIAQgDksgByACS3INAEFsIQsgACAMSw0BIAxBfWohCQNAQQAgACAJSSAFQdgAahAEGwRAIAAgBiAFQdgAaiAIEAJBAnRqIgovAQA7AAAgBUHYAGogCi0AAhABIAAgCi0AA2oiACAGIAVB2ABqIAgQAkECdGoiCi8BADsAACAFQdgAaiAKLQACEAEgACAKLQADaiEADAEFIAxBfmohCgNAIAVB2ABqEAQgACAKS3JFBEAgACAGIAVB2ABqIAgQAkECdGoiCS8BADsAACAFQdgAaiAJLQACEAEgACAJLQADaiEADAELCwNAIAAgCk0EQCAAIAYgBUHYAGogCBACQQJ0aiIJLwEAOwAAIAVB2ABqIAktAAIQASAAIAktAANqIQAMAQsLAkAgACAMTw0AIAAgBiAFQdgAaiAIEAIiAEECdGoiDC0AADoAACAMLQADQQFGBEAgBUHYAGogDC0AAhABDAELIAUoAlxBH0sNACAFQdgAaiAGIABBAnRqLQACEAEgBSgCXEEhSQ0AIAVBIDYCXAsgAkF9aiEMA0BBACAHIAxJIAVBQGsQBBsEQCAHIAYgBUFAayAIEAJBAnRqIgAvAQA7AAAgBUFAayAALQACEAEgByAALQADaiIAIAYgBUFAayAIEAJBAnRqIgcvAQA7AAAgBUFAayAHLQACEAEgACAHLQADaiEHDAEFIAJBfmohDANAIAVBQGsQBCAHIAxLckUEQCAHIAYgBUFAayAIEAJBAnRqIgAvAQA7AAAgBUFAayAALQACEAEgByAALQADaiEHDAELCwNAIAcgDE0EQCAHIAYgBUFAayAIEAJBAnRqIgAvAQA7AAAgBUFAayAALQACEAEgByAALQADaiEHDAELCwJAIAcgAk8NACAHIAYgBUFAayAIEAIiAEECdGoiAi0AADoAACACLQADQQFGBEAgBUFAayACLQACEAEMAQsgBSgCREEfSw0AIAVBQGsgBiAAQQJ0ai0AAhABIAUoAkRBIUkNACAFQSA2AkQLIA5BfWohAgNAQQAgBCACSSAFQShqEAQbBEAgBCAGIAVBKGogCBACQQJ0aiIALwEAOwAAIAVBKGogAC0AAhABIAQgAC0AA2oiACAGIAVBKGogCBACQQJ0aiIELwEAOwAAIAVBKGogBC0AAhABIAAgBC0AA2ohBAwBBSAOQX5qIQIDQCAFQShqEAQgBCACS3JFBEAgBCAGIAVBKGogCBACQQJ0aiIALwEAOwAAIAVBKGogAC0AAhABIAQgAC0AA2ohBAwBCwsDQCAEIAJNBEAgBCAGIAVBKGogCBACQQJ0aiIALwEAOwAAIAVBKGogAC0AAhABIAQgAC0AA2ohBAwBCwsCQCAEIA5PDQAgBCAGIAVBKGogCBACIgBBAnRqIgItAAA6AAAgAi0AA0EBRgRAIAVBKGogAi0AAhABDAELIAUoAixBH0sNACAFQShqIAYgAEECdGotAAIQASAFKAIsQSFJDQAgBUEgNgIsCwNAQQAgAyAQSSAFQRBqEAQbBEAgAyAGIAVBEGogCBACQQJ0aiIALwEAOwAAIAVBEGogAC0AAhABIAMgAC0AA2oiACAGIAVBEGogCBACQQJ0aiICLwEAOwAAIAVBEGogAi0AAhABIAAgAi0AA2ohAwwBBSAPQX5qIQIDQCAFQRBqEAQgAyACS3JFBEAgAyAGIAVBEGogCBACQQJ0aiIALwEAOwAAIAVBEGogAC0AAhABIAMgAC0AA2ohAwwBCwsDQCADIAJNBEAgAyAGIAVBEGogCBACQQJ0aiIALwEAOwAAIAVBEGogAC0AAhABIAMgAC0AA2ohAwwBCwsCQCADIA9PDQAgAyAGIAVBEGogCBACIgBBAnRqIgItAAA6AAAgAi0AA0EBRgRAIAVBEGogAi0AAhABDAELIAUoAhRBH0sNACAFQRBqIAYgAEECdGotAAIQASAFKAIUQSFJDQAgBUEgNgIUCyABQWwgBUHYAGoQCiAFQUBrEApxIAVBKGoQCnEgBUEQahAKcRshCwwJCwAACwALAAALAAsAAAsACwAACwALQWwhCwsgBUHwAGokACALC7UEAQ5/IwBBEGsiBiQAIAZBBGogABAOQVQhBQJAIARB3AtJDQAgBi0ABCEHIANB8ARqQQBB7AAQECEIIAdBDEsNACADQdwJaiIJIAggBkEIaiAGQQxqIAEgAhAxIhAQA0UEQCAGKAIMIgQgB0sNASADQdwFaiEPIANBpAVqIREgAEEEaiESIANBqAVqIQEgBCEFA0AgBSICQX9qIQUgCCACQQJ0aigCAEUNAAsgAkEBaiEOQQEhBQNAIAUgDk9FBEAgCCAFQQJ0IgtqKAIAIQwgASALaiAKNgIAIAVBAWohBSAKIAxqIQoMAQsLIAEgCjYCAEEAIQUgBigCCCELA0AgBSALRkUEQCABIAUgCWotAAAiDEECdGoiDSANKAIAIg1BAWo2AgAgDyANQQF0aiINIAw6AAEgDSAFOgAAIAVBAWohBQwBCwtBACEBIANBADYCqAUgBEF/cyAHaiEJQQEhBQNAIAUgDk9FBEAgCCAFQQJ0IgtqKAIAIQwgAyALaiABNgIAIAwgBSAJanQgAWohASAFQQFqIQUMAQsLIAcgBEEBaiIBIAJrIgRrQQFqIQgDQEEBIQUgBCAIT0UEQANAIAUgDk9FBEAgBUECdCIJIAMgBEE0bGpqIAMgCWooAgAgBHY2AgAgBUEBaiEFDAELCyAEQQFqIQQMAQsLIBIgByAPIAogESADIAIgARBkIAZBAToABSAGIAc6AAYgACAGKAIENgIACyAQIQULIAZBEGokACAFC8ENAQt/IwBB8ABrIgUkAEFsIQkCQCADQQpJDQAgAi8AACEKIAIvAAIhDCACLwAEIQYgBUEIaiAEEA4CQCADIAYgCiAMampBBmoiDUkNACAFLQAKIQcgBUHYAGogAkEGaiICIAoQBiIJEAMNASAFQUBrIAIgCmoiAiAMEAYiCRADDQEgBUEoaiACIAxqIgIgBhAGIgkQAw0BIAVBEGogAiAGaiADIA1rEAYiCRADDQEgACABaiIOQX1qIQ8gBEEEaiEGQQEhCSAAIAFBA2pBAnYiAmoiCiACaiIMIAJqIg0hAyAMIQQgCiECA0AgCSADIA9JcQRAIAYgBUHYAGogBxACQQF0aiIILQAAIQsgBUHYAGogCC0AARABIAAgCzoAACAGIAVBQGsgBxACQQF0aiIILQAAIQsgBUFAayAILQABEAEgAiALOgAAIAYgBUEoaiAHEAJBAXRqIggtAAAhCyAFQShqIAgtAAEQASAEIAs6AAAgBiAFQRBqIAcQAkEBdGoiCC0AACELIAVBEGogCC0AARABIAMgCzoAACAGIAVB2ABqIAcQAkEBdGoiCC0AACELIAVB2ABqIAgtAAEQASAAIAs6AAEgBiAFQUBrIAcQAkEBdGoiCC0AACELIAVBQGsgCC0AARABIAIgCzoAASAGIAVBKGogBxACQQF0aiIILQAAIQsgBUEoaiAILQABEAEgBCALOgABIAYgBUEQaiAHEAJBAXRqIggtAAAhCyAFQRBqIAgtAAEQASADIAs6AAEgA0ECaiEDIARBAmohBCACQQJqIQIgAEECaiEAIAkgBUHYAGoQDUVxIAVBQGsQDUVxIAVBKGoQDUVxIAVBEGoQDUVxIQkMAQsLIAQgDUsgAiAMS3INAEFsIQkgACAKSw0BIApBfWohCQNAIAVB2ABqEAQgACAJT3JFBEAgBiAFQdgAaiAHEAJBAXRqIggtAAAhCyAFQdgAaiAILQABEAEgACALOgAAIAYgBUHYAGogBxACQQF0aiIILQAAIQsgBUHYAGogCC0AARABIAAgCzoAASAAQQJqIQAMAQsLA0AgBUHYAGoQBCAAIApPckUEQCAGIAVB2ABqIAcQAkEBdGoiCS0AACEIIAVB2ABqIAktAAEQASAAIAg6AAAgAEEBaiEADAELCwNAIAAgCkkEQCAGIAVB2ABqIAcQAkEBdGoiCS0AACEIIAVB2ABqIAktAAEQASAAIAg6AAAgAEEBaiEADAELCyAMQX1qIQADQCAFQUBrEAQgAiAAT3JFBEAgBiAFQUBrIAcQAkEBdGoiCi0AACEJIAVBQGsgCi0AARABIAIgCToAACAGIAVBQGsgBxACQQF0aiIKLQAAIQkgBUFAayAKLQABEAEgAiAJOgABIAJBAmohAgwBCwsDQCAFQUBrEAQgAiAMT3JFBEAgBiAFQUBrIAcQAkEBdGoiAC0AACEKIAVBQGsgAC0AARABIAIgCjoAACACQQFqIQIMAQsLA0AgAiAMSQRAIAYgBUFAayAHEAJBAXRqIgAtAAAhCiAFQUBrIAAtAAEQASACIAo6AAAgAkEBaiECDAELCyANQX1qIQADQCAFQShqEAQgBCAAT3JFBEAgBiAFQShqIAcQAkEBdGoiAi0AACEKIAVBKGogAi0AARABIAQgCjoAACAGIAVBKGogBxACQQF0aiICLQAAIQogBUEoaiACLQABEAEgBCAKOgABIARBAmohBAwBCwsDQCAFQShqEAQgBCANT3JFBEAgBiAFQShqIAcQAkEBdGoiAC0AACECIAVBKGogAC0AARABIAQgAjoAACAEQQFqIQQMAQsLA0AgBCANSQRAIAYgBUEoaiAHEAJBAXRqIgAtAAAhAiAFQShqIAAtAAEQASAEIAI6AAAgBEEBaiEEDAELCwNAIAVBEGoQBCADIA9PckUEQCAGIAVBEGogBxACQQF0aiIALQAAIQIgBUEQaiAALQABEAEgAyACOgAAIAYgBUEQaiAHEAJBAXRqIgAtAAAhAiAFQRBqIAAtAAEQASADIAI6AAEgA0ECaiEDDAELCwNAIAVBEGoQBCADIA5PckUEQCAGIAVBEGogBxACQQF0aiIALQAAIQIgBUEQaiAALQABEAEgAyACOgAAIANBAWohAwwBCwsDQCADIA5JBEAgBiAFQRBqIAcQAkEBdGoiAC0AACECIAVBEGogAC0AARABIAMgAjoAACADQQFqIQMMAQsLIAFBbCAFQdgAahAKIAVBQGsQCnEgBUEoahAKcSAFQRBqEApxGyEJDAELQWwhCQsgBUHwAGokACAJC8oCAQR/IwBBIGsiBSQAIAUgBBAOIAUtAAIhByAFQQhqIAIgAxAGIgIQA0UEQCAEQQRqIQIgACABaiIDQX1qIQQDQCAFQQhqEAQgACAET3JFBEAgAiAFQQhqIAcQAkEBdGoiBi0AACEIIAVBCGogBi0AARABIAAgCDoAACACIAVBCGogBxACQQF0aiIGLQAAIQggBUEIaiAGLQABEAEgACAIOgABIABBAmohAAwBCwsDQCAFQQhqEAQgACADT3JFBEAgAiAFQQhqIAcQAkEBdGoiBC0AACEGIAVBCGogBC0AARABIAAgBjoAACAAQQFqIQAMAQsLA0AgACADT0UEQCACIAVBCGogBxACQQF0aiIELQAAIQYgBUEIaiAELQABEAEgACAGOgAAIABBAWohAAwBCwsgAUFsIAVBCGoQChshAgsgBUEgaiQAIAILtgMBCX8jAEEQayIGJAAgBkEANgIMIAZBADYCCEFUIQQCQAJAIANBQGsiDCADIAZBCGogBkEMaiABIAIQMSICEAMNACAGQQRqIAAQDiAGKAIMIgcgBi0ABEEBaksNASAAQQRqIQogBkEAOgAFIAYgBzoABiAAIAYoAgQ2AgAgB0EBaiEJQQEhBANAIAQgCUkEQCADIARBAnRqIgEoAgAhACABIAU2AgAgACAEQX9qdCAFaiEFIARBAWohBAwBCwsgB0EBaiEHQQAhBSAGKAIIIQkDQCAFIAlGDQEgAyAFIAxqLQAAIgRBAnRqIgBBASAEdEEBdSILIAAoAgAiAWoiADYCACAHIARrIQhBACEEAkAgC0EDTQRAA0AgBCALRg0CIAogASAEakEBdGoiACAIOgABIAAgBToAACAEQQFqIQQMAAALAAsDQCABIABPDQEgCiABQQF0aiIEIAg6AAEgBCAFOgAAIAQgCDoAAyAEIAU6AAIgBCAIOgAFIAQgBToABCAEIAg6AAcgBCAFOgAGIAFBBGohAQwAAAsACyAFQQFqIQUMAAALAAsgAiEECyAGQRBqJAAgBAutAQECfwJAQYQgKAIAIABHIAAoAgBBAXYiAyABa0F4aiICQXhxQQhHcgR/IAIFIAMQJ0UNASACQQhqC0EQSQ0AIAAgACgCACICQQFxIAAgAWpBD2pBeHEiASAAa0EBdHI2AgAgASAANgIEIAEgASgCAEEBcSAAIAJBAXZqIAFrIgJBAXRyNgIAQYQgIAEgAkH/////B3FqQQRqQYQgKAIAIABGGyABNgIAIAEQJQsLygIBBX8CQAJAAkAgAEEIIABBCEsbZ0EfcyAAaUEBR2oiAUEESSAAIAF2cg0AIAFBAnRB/B5qKAIAIgJFDQADQCACQXhqIgMoAgBBAXZBeGoiBSAATwRAIAIgBUEIIAVBCEsbZ0Efc0ECdEGAH2oiASgCAEYEQCABIAIoAgQ2AgALDAMLIARBHksNASAEQQFqIQQgAigCBCICDQALC0EAIQMgAUEgTw0BA0AgAUECdEGAH2ooAgAiAkUEQCABQR5LIQIgAUEBaiEBIAJFDQEMAwsLIAIgAkF4aiIDKAIAQQF2QXhqIgFBCCABQQhLG2dBH3NBAnRBgB9qIgEoAgBGBEAgASACKAIENgIACwsgAigCACIBBEAgASACKAIENgIECyACKAIEIgEEQCABIAIoAgA2AgALIAMgAygCAEEBcjYCACADIAAQNwsgAwvhCwINfwV+IwBB8ABrIgckACAHIAAoAvDhASIINgJcIAEgAmohDSAIIAAoAoDiAWohDwJAAkAgBUUEQCABIQQMAQsgACgCxOABIRAgACgCwOABIREgACgCvOABIQ4gAEEBNgKM4QFBACEIA0AgCEEDRwRAIAcgCEECdCICaiAAIAJqQazQAWooAgA2AkQgCEEBaiEIDAELC0FsIQwgB0EYaiADIAQQBhADDQEgB0EsaiAHQRhqIAAoAgAQEyAHQTRqIAdBGGogACgCCBATIAdBPGogB0EYaiAAKAIEEBMgDUFgaiESIAEhBEEAIQwDQCAHKAIwIAcoAixBA3RqKQIAIhRCEIinQf8BcSEIIAcoAkAgBygCPEEDdGopAgAiFUIQiKdB/wFxIQsgBygCOCAHKAI0QQN0aikCACIWQiCIpyEJIBVCIIghFyAUQiCIpyECAkAgFkIQiKdB/wFxIgNBAk8EQAJAIAZFIANBGUlyRQRAIAkgB0EYaiADQSAgBygCHGsiCiAKIANLGyIKEAUgAyAKayIDdGohCSAHQRhqEAQaIANFDQEgB0EYaiADEAUgCWohCQwBCyAHQRhqIAMQBSAJaiEJIAdBGGoQBBoLIAcpAkQhGCAHIAk2AkQgByAYNwNIDAELAkAgA0UEQCACBEAgBygCRCEJDAMLIAcoAkghCQwBCwJAAkAgB0EYakEBEAUgCSACRWpqIgNBA0YEQCAHKAJEQX9qIgMgA0VqIQkMAQsgA0ECdCAHaigCRCIJIAlFaiEJIANBAUYNAQsgByAHKAJINgJMCwsgByAHKAJENgJIIAcgCTYCRAsgF6chAyALBEAgB0EYaiALEAUgA2ohAwsgCCALakEUTwRAIAdBGGoQBBoLIAgEQCAHQRhqIAgQBSACaiECCyAHQRhqEAQaIAcgB0EYaiAUQhiIp0H/AXEQCCAUp0H//wNxajYCLCAHIAdBGGogFUIYiKdB/wFxEAggFadB//8DcWo2AjwgB0EYahAEGiAHIAdBGGogFkIYiKdB/wFxEAggFqdB//8DcWo2AjQgByACNgJgIAcoAlwhCiAHIAk2AmggByADNgJkAkACQAJAIAQgAiADaiILaiASSw0AIAIgCmoiEyAPSw0AIA0gBGsgC0Egak8NAQsgByAHKQNoNwMQIAcgBykDYDcDCCAEIA0gB0EIaiAHQdwAaiAPIA4gESAQEB4hCwwBCyACIARqIQggBCAKEAcgAkERTwRAIARBEGohAgNAIAIgCkEQaiIKEAcgAkEQaiICIAhJDQALCyAIIAlrIQIgByATNgJcIAkgCCAOa0sEQCAJIAggEWtLBEBBbCELDAILIBAgAiAOayICaiIKIANqIBBNBEAgCCAKIAMQDxoMAgsgCCAKQQAgAmsQDyEIIAcgAiADaiIDNgJkIAggAmshCCAOIQILIAlBEE8EQCADIAhqIQMDQCAIIAIQByACQRBqIQIgCEEQaiIIIANJDQALDAELAkAgCUEHTQRAIAggAi0AADoAACAIIAItAAE6AAEgCCACLQACOgACIAggAi0AAzoAAyAIQQRqIAIgCUECdCIDQcAeaigCAGoiAhAXIAIgA0HgHmooAgBrIQIgBygCZCEDDAELIAggAhAMCyADQQlJDQAgAyAIaiEDIAhBCGoiCCACQQhqIgJrQQ9MBEADQCAIIAIQDCACQQhqIQIgCEEIaiIIIANJDQAMAgALAAsDQCAIIAIQByACQRBqIQIgCEEQaiIIIANJDQALCyAHQRhqEAQaIAsgDCALEAMiAhshDCAEIAQgC2ogAhshBCAFQX9qIgUNAAsgDBADDQFBbCEMIAdBGGoQBEECSQ0BQQAhCANAIAhBA0cEQCAAIAhBAnQiAmpBrNABaiACIAdqKAJENgIAIAhBAWohCAwBCwsgBygCXCEIC0G6fyEMIA8gCGsiACANIARrSw0AIAQEfyAEIAggABALIABqBUEACyABayEMCyAHQfAAaiQAIAwLkRcCFn8FfiMAQdABayIHJAAgByAAKALw4QEiCDYCvAEgASACaiESIAggACgCgOIBaiETAkACQCAFRQRAIAEhAwwBCyAAKALE4AEhESAAKALA4AEhFSAAKAK84AEhDyAAQQE2AozhAUEAIQgDQCAIQQNHBEAgByAIQQJ0IgJqIAAgAmpBrNABaigCADYCVCAIQQFqIQgMAQsLIAcgETYCZCAHIA82AmAgByABIA9rNgJoQWwhECAHQShqIAMgBBAGEAMNASAFQQQgBUEESBshFyAHQTxqIAdBKGogACgCABATIAdBxABqIAdBKGogACgCCBATIAdBzABqIAdBKGogACgCBBATQQAhBCAHQeAAaiEMIAdB5ABqIQoDQCAHQShqEARBAksgBCAXTnJFBEAgBygCQCAHKAI8QQN0aikCACIdQhCIp0H/AXEhCyAHKAJQIAcoAkxBA3RqKQIAIh5CEIinQf8BcSEJIAcoAkggBygCREEDdGopAgAiH0IgiKchCCAeQiCIISAgHUIgiKchAgJAIB9CEIinQf8BcSIDQQJPBEACQCAGRSADQRlJckUEQCAIIAdBKGogA0EgIAcoAixrIg0gDSADSxsiDRAFIAMgDWsiA3RqIQggB0EoahAEGiADRQ0BIAdBKGogAxAFIAhqIQgMAQsgB0EoaiADEAUgCGohCCAHQShqEAQaCyAHKQJUISEgByAINgJUIAcgITcDWAwBCwJAIANFBEAgAgRAIAcoAlQhCAwDCyAHKAJYIQgMAQsCQAJAIAdBKGpBARAFIAggAkVqaiIDQQNGBEAgBygCVEF/aiIDIANFaiEIDAELIANBAnQgB2ooAlQiCCAIRWohCCADQQFGDQELIAcgBygCWDYCXAsLIAcgBygCVDYCWCAHIAg2AlQLICCnIQMgCQRAIAdBKGogCRAFIANqIQMLIAkgC2pBFE8EQCAHQShqEAQaCyALBEAgB0EoaiALEAUgAmohAgsgB0EoahAEGiAHIAcoAmggAmoiCSADajYCaCAKIAwgCCAJSxsoAgAhDSAHIAdBKGogHUIYiKdB/wFxEAggHadB//8DcWo2AjwgByAHQShqIB5CGIinQf8BcRAIIB6nQf//A3FqNgJMIAdBKGoQBBogB0EoaiAfQhiIp0H/AXEQCCEOIAdB8ABqIARBBHRqIgsgCSANaiAIazYCDCALIAg2AgggCyADNgIEIAsgAjYCACAHIA4gH6dB//8DcWo2AkQgBEEBaiEEDAELCyAEIBdIDQEgEkFgaiEYIAdB4ABqIRogB0HkAGohGyABIQMDQCAHQShqEARBAksgBCAFTnJFBEAgBygCQCAHKAI8QQN0aikCACIdQhCIp0H/AXEhCyAHKAJQIAcoAkxBA3RqKQIAIh5CEIinQf8BcSEIIAcoAkggBygCREEDdGopAgAiH0IgiKchCSAeQiCIISAgHUIgiKchDAJAIB9CEIinQf8BcSICQQJPBEACQCAGRSACQRlJckUEQCAJIAdBKGogAkEgIAcoAixrIgogCiACSxsiChAFIAIgCmsiAnRqIQkgB0EoahAEGiACRQ0BIAdBKGogAhAFIAlqIQkMAQsgB0EoaiACEAUgCWohCSAHQShqEAQaCyAHKQJUISEgByAJNgJUIAcgITcDWAwBCwJAIAJFBEAgDARAIAcoAlQhCQwDCyAHKAJYIQkMAQsCQAJAIAdBKGpBARAFIAkgDEVqaiICQQNGBEAgBygCVEF/aiICIAJFaiEJDAELIAJBAnQgB2ooAlQiCSAJRWohCSACQQFGDQELIAcgBygCWDYCXAsLIAcgBygCVDYCWCAHIAk2AlQLICCnIRQgCARAIAdBKGogCBAFIBRqIRQLIAggC2pBFE8EQCAHQShqEAQaCyALBEAgB0EoaiALEAUgDGohDAsgB0EoahAEGiAHIAcoAmggDGoiGSAUajYCaCAbIBogCSAZSxsoAgAhHCAHIAdBKGogHUIYiKdB/wFxEAggHadB//8DcWo2AjwgByAHQShqIB5CGIinQf8BcRAIIB6nQf//A3FqNgJMIAdBKGoQBBogByAHQShqIB9CGIinQf8BcRAIIB+nQf//A3FqNgJEIAcgB0HwAGogBEEDcUEEdGoiDSkDCCIdNwPIASAHIA0pAwAiHjcDwAECQAJAAkAgBygCvAEiDiAepyICaiIWIBNLDQAgAyAHKALEASIKIAJqIgtqIBhLDQAgEiADayALQSBqTw0BCyAHIAcpA8gBNwMQIAcgBykDwAE3AwggAyASIAdBCGogB0G8AWogEyAPIBUgERAeIQsMAQsgAiADaiEIIAMgDhAHIAJBEU8EQCADQRBqIQIDQCACIA5BEGoiDhAHIAJBEGoiAiAISQ0ACwsgCCAdpyIOayECIAcgFjYCvAEgDiAIIA9rSwRAIA4gCCAVa0sEQEFsIQsMAgsgESACIA9rIgJqIhYgCmogEU0EQCAIIBYgChAPGgwCCyAIIBZBACACaxAPIQggByACIApqIgo2AsQBIAggAmshCCAPIQILIA5BEE8EQCAIIApqIQoDQCAIIAIQByACQRBqIQIgCEEQaiIIIApJDQALDAELAkAgDkEHTQRAIAggAi0AADoAACAIIAItAAE6AAEgCCACLQACOgACIAggAi0AAzoAAyAIQQRqIAIgDkECdCIKQcAeaigCAGoiAhAXIAIgCkHgHmooAgBrIQIgBygCxAEhCgwBCyAIIAIQDAsgCkEJSQ0AIAggCmohCiAIQQhqIgggAkEIaiICa0EPTARAA0AgCCACEAwgAkEIaiECIAhBCGoiCCAKSQ0ADAIACwALA0AgCCACEAcgAkEQaiECIAhBEGoiCCAKSQ0ACwsgCxADBEAgCyEQDAQFIA0gDDYCACANIBkgHGogCWs2AgwgDSAJNgIIIA0gFDYCBCAEQQFqIQQgAyALaiEDDAILAAsLIAQgBUgNASAEIBdrIQtBACEEA0AgCyAFSARAIAcgB0HwAGogC0EDcUEEdGoiAikDCCIdNwPIASAHIAIpAwAiHjcDwAECQAJAAkAgBygCvAEiDCAepyICaiIKIBNLDQAgAyAHKALEASIJIAJqIhBqIBhLDQAgEiADayAQQSBqTw0BCyAHIAcpA8gBNwMgIAcgBykDwAE3AxggAyASIAdBGGogB0G8AWogEyAPIBUgERAeIRAMAQsgAiADaiEIIAMgDBAHIAJBEU8EQCADQRBqIQIDQCACIAxBEGoiDBAHIAJBEGoiAiAISQ0ACwsgCCAdpyIGayECIAcgCjYCvAEgBiAIIA9rSwRAIAYgCCAVa0sEQEFsIRAMAgsgESACIA9rIgJqIgwgCWogEU0EQCAIIAwgCRAPGgwCCyAIIAxBACACaxAPIQggByACIAlqIgk2AsQBIAggAmshCCAPIQILIAZBEE8EQCAIIAlqIQYDQCAIIAIQByACQRBqIQIgCEEQaiIIIAZJDQALDAELAkAgBkEHTQRAIAggAi0AADoAACAIIAItAAE6AAEgCCACLQACOgACIAggAi0AAzoAAyAIQQRqIAIgBkECdCIGQcAeaigCAGoiAhAXIAIgBkHgHmooAgBrIQIgBygCxAEhCQwBCyAIIAIQDAsgCUEJSQ0AIAggCWohBiAIQQhqIgggAkEIaiICa0EPTARAA0AgCCACEAwgAkEIaiECIAhBCGoiCCAGSQ0ADAIACwALA0AgCCACEAcgAkEQaiECIAhBEGoiCCAGSQ0ACwsgEBADDQMgC0EBaiELIAMgEGohAwwBCwsDQCAEQQNHBEAgACAEQQJ0IgJqQazQAWogAiAHaigCVDYCACAEQQFqIQQMAQsLIAcoArwBIQgLQbp/IRAgEyAIayIAIBIgA2tLDQAgAwR/IAMgCCAAEAsgAGoFQQALIAFrIRALIAdB0AFqJAAgEAslACAAQgA3AgAgAEEAOwEIIABBADoACyAAIAE2AgwgACACOgAKC7QFAQN/IwBBMGsiBCQAIABB/wFqIgVBfWohBgJAIAMvAQIEQCAEQRhqIAEgAhAGIgIQAw0BIARBEGogBEEYaiADEBwgBEEIaiAEQRhqIAMQHCAAIQMDQAJAIARBGGoQBCADIAZPckUEQCADIARBEGogBEEYahASOgAAIAMgBEEIaiAEQRhqEBI6AAEgBEEYahAERQ0BIANBAmohAwsgBUF+aiEFAn8DQEG6fyECIAMiASAFSw0FIAEgBEEQaiAEQRhqEBI6AAAgAUEBaiEDIARBGGoQBEEDRgRAQQIhAiAEQQhqDAILIAMgBUsNBSABIARBCGogBEEYahASOgABIAFBAmohA0EDIQIgBEEYahAEQQNHDQALIARBEGoLIQUgAyAFIARBGGoQEjoAACABIAJqIABrIQIMAwsgAyAEQRBqIARBGGoQEjoAAiADIARBCGogBEEYahASOgADIANBBGohAwwAAAsACyAEQRhqIAEgAhAGIgIQAw0AIARBEGogBEEYaiADEBwgBEEIaiAEQRhqIAMQHCAAIQMDQAJAIARBGGoQBCADIAZPckUEQCADIARBEGogBEEYahAROgAAIAMgBEEIaiAEQRhqEBE6AAEgBEEYahAERQ0BIANBAmohAwsgBUF+aiEFAn8DQEG6fyECIAMiASAFSw0EIAEgBEEQaiAEQRhqEBE6AAAgAUEBaiEDIARBGGoQBEEDRgRAQQIhAiAEQQhqDAILIAMgBUsNBCABIARBCGogBEEYahAROgABIAFBAmohA0EDIQIgBEEYahAEQQNHDQALIARBEGoLIQUgAyAFIARBGGoQEToAACABIAJqIABrIQIMAgsgAyAEQRBqIARBGGoQEToAAiADIARBCGogBEEYahAROgADIANBBGohAwwAAAsACyAEQTBqJAAgAgtpAQF/An8CQAJAIAJBB00NACABKAAAQbfIwuF+Rw0AIAAgASgABDYCmOIBQWIgAEEQaiABIAIQPiIDEAMNAhogAEKBgICAEDcDiOEBIAAgASADaiACIANrECoMAQsgACABIAIQKgtBAAsLrQMBBn8jAEGAAWsiAyQAQWIhCAJAIAJBCUkNACAAQZjQAGogAUEIaiIEIAJBeGogAEGY0AAQMyIFEAMiBg0AIANBHzYCfCADIANB/ABqIANB+ABqIAQgBCAFaiAGGyIEIAEgAmoiAiAEaxAVIgUQAw0AIAMoAnwiBkEfSw0AIAMoAngiB0EJTw0AIABBiCBqIAMgBkGAC0GADCAHEBggA0E0NgJ8IAMgA0H8AGogA0H4AGogBCAFaiIEIAIgBGsQFSIFEAMNACADKAJ8IgZBNEsNACADKAJ4IgdBCk8NACAAQZAwaiADIAZBgA1B4A4gBxAYIANBIzYCfCADIANB/ABqIANB+ABqIAQgBWoiBCACIARrEBUiBRADDQAgAygCfCIGQSNLDQAgAygCeCIHQQpPDQAgACADIAZBwBBB0BEgBxAYIAQgBWoiBEEMaiIFIAJLDQAgAiAFayEFQQAhAgNAIAJBA0cEQCAEKAAAIgZBf2ogBU8NAiAAIAJBAnRqQZzQAWogBjYCACACQQFqIQIgBEEEaiEEDAELCyAEIAFrIQgLIANBgAFqJAAgCAtGAQN/IABBCGohAyAAKAIEIQJBACEAA0AgACACdkUEQCABIAMgAEEDdGotAAJBFktqIQEgAEEBaiEADAELCyABQQggAmt0C4YDAQV/Qbh/IQcCQCADRQ0AIAItAAAiBEUEQCABQQA2AgBBAUG4fyADQQFGGw8LAn8gAkEBaiIFIARBGHRBGHUiBkF/Sg0AGiAGQX9GBEAgA0EDSA0CIAUvAABBgP4BaiEEIAJBA2oMAQsgA0ECSA0BIAItAAEgBEEIdHJBgIB+aiEEIAJBAmoLIQUgASAENgIAIAVBAWoiASACIANqIgNLDQBBbCEHIABBEGogACAFLQAAIgVBBnZBI0EJIAEgAyABa0HAEEHQEUHwEiAAKAKM4QEgACgCnOIBIAQQHyIGEAMiCA0AIABBmCBqIABBCGogBUEEdkEDcUEfQQggASABIAZqIAgbIgEgAyABa0GAC0GADEGAFyAAKAKM4QEgACgCnOIBIAQQHyIGEAMiCA0AIABBoDBqIABBBGogBUECdkEDcUE0QQkgASABIAZqIAgbIgEgAyABa0GADUHgDkGQGSAAKAKM4QEgACgCnOIBIAQQHyIAEAMNACAAIAFqIAJrIQcLIAcLrQMBCn8jAEGABGsiCCQAAn9BUiACQf8BSw0AGkFUIANBDEsNABogAkEBaiELIABBBGohCUGAgAQgA0F/anRBEHUhCkEAIQJBASEEQQEgA3QiB0F/aiIMIQUDQCACIAtGRQRAAkAgASACQQF0Ig1qLwEAIgZB//8DRgRAIAkgBUECdGogAjoAAiAFQX9qIQVBASEGDAELIARBACAKIAZBEHRBEHVKGyEECyAIIA1qIAY7AQAgAkEBaiECDAELCyAAIAQ7AQIgACADOwEAIAdBA3YgB0EBdmpBA2ohBkEAIQRBACECA0AgBCALRkUEQCABIARBAXRqLgEAIQpBACEAA0AgACAKTkUEQCAJIAJBAnRqIAQ6AAIDQCACIAZqIAxxIgIgBUsNAAsgAEEBaiEADAELCyAEQQFqIQQMAQsLQX8gAg0AGkEAIQIDfyACIAdGBH9BAAUgCCAJIAJBAnRqIgAtAAJBAXRqIgEgAS8BACIBQQFqOwEAIAAgAyABEBRrIgU6AAMgACABIAVB/wFxdCAHazsBACACQQFqIQIMAQsLCyEFIAhBgARqJAAgBQvjBgEIf0FsIQcCQCACQQNJDQACQAJAAkACQCABLQAAIgNBA3EiCUEBaw4DAwEAAgsgACgCiOEBDQBBYg8LIAJBBUkNAkEDIQYgASgAACEFAn8CQAJAIANBAnZBA3EiCEF+aiIEQQFNBEAgBEEBaw0BDAILIAVBDnZB/wdxIQQgBUEEdkH/B3EhAyAIRQwCCyAFQRJ2IQRBBCEGIAVBBHZB//8AcSEDQQAMAQsgBUEEdkH//w9xIgNBgIAISw0DIAEtAARBCnQgBUEWdnIhBEEFIQZBAAshBSAEIAZqIgogAksNAgJAIANBgQZJDQAgACgCnOIBRQ0AQQAhAgNAIAJBg4ABSw0BIAJBQGshAgwAAAsACwJ/IAlBA0YEQCABIAZqIQEgAEHw4gFqIQIgACgCDCEGIAUEQCACIAMgASAEIAYQXwwCCyACIAMgASAEIAYQXQwBCyAAQbjQAWohAiABIAZqIQEgAEHw4gFqIQYgAEGo0ABqIQggBQRAIAggBiADIAEgBCACEF4MAQsgCCAGIAMgASAEIAIQXAsQAw0CIAAgAzYCgOIBIABBATYCiOEBIAAgAEHw4gFqNgLw4QEgCUECRgRAIAAgAEGo0ABqNgIMCyAAIANqIgBBiOMBakIANwAAIABBgOMBakIANwAAIABB+OIBakIANwAAIABB8OIBakIANwAAIAoPCwJ/AkACQAJAIANBAnZBA3FBf2oiBEECSw0AIARBAWsOAgACAQtBASEEIANBA3YMAgtBAiEEIAEvAABBBHYMAQtBAyEEIAEQIUEEdgsiAyAEaiIFQSBqIAJLBEAgBSACSw0CIABB8OIBaiABIARqIAMQCyEBIAAgAzYCgOIBIAAgATYC8OEBIAEgA2oiAEIANwAYIABCADcAECAAQgA3AAggAEIANwAAIAUPCyAAIAM2AoDiASAAIAEgBGo2AvDhASAFDwsCfwJAAkACQCADQQJ2QQNxQX9qIgRBAksNACAEQQFrDgIAAgELQQEhByADQQN2DAILQQIhByABLwAAQQR2DAELIAJBBEkgARAhIgJBj4CAAUtyDQFBAyEHIAJBBHYLIQIgAEHw4gFqIAEgB2otAAAgAkEgahAQIQEgACACNgKA4gEgACABNgLw4QEgB0EBaiEHCyAHC0sAIABC+erQ0OfJoeThADcDICAAQgA3AxggAELP1tO+0ser2UI3AxAgAELW64Lu6v2J9eAANwMIIABCADcDACAAQShqQQBBKBAQGgviAgICfwV+IABBKGoiASAAKAJIaiECAn4gACkDACIDQiBaBEAgACkDECIEQgeJIAApAwgiBUIBiXwgACkDGCIGQgyJfCAAKQMgIgdCEol8IAUQGSAEEBkgBhAZIAcQGQwBCyAAKQMYQsXP2bLx5brqJ3wLIAN8IQMDQCABQQhqIgAgAk0EQEIAIAEpAAAQCSADhUIbiUKHla+vmLbem55/fkLj3MqV/M7y9YV/fCEDIAAhAQwBCwsCQCABQQRqIgAgAksEQCABIQAMAQsgASgAAK1Ch5Wvr5i23puef34gA4VCF4lCz9bTvtLHq9lCfkL5893xmfaZqxZ8IQMLA0AgACACSQRAIAAxAABCxc/ZsvHluuonfiADhUILiUKHla+vmLbem55/fiEDIABBAWohAAwBCwsgA0IhiCADhULP1tO+0ser2UJ+IgNCHYggA4VC+fPd8Zn2masWfiIDQiCIIAOFC+8CAgJ/BH4gACAAKQMAIAKtfDcDAAJAAkAgACgCSCIDIAJqIgRBH00EQCABRQ0BIAAgA2pBKGogASACECAgACgCSCACaiEEDAELIAEgAmohAgJ/IAMEQCAAQShqIgQgA2ogAUEgIANrECAgACAAKQMIIAQpAAAQCTcDCCAAIAApAxAgACkAMBAJNwMQIAAgACkDGCAAKQA4EAk3AxggACAAKQMgIABBQGspAAAQCTcDICAAKAJIIQMgAEEANgJIIAEgA2tBIGohAQsgAUEgaiACTQsEQCACQWBqIQMgACkDICEFIAApAxghBiAAKQMQIQcgACkDCCEIA0AgCCABKQAAEAkhCCAHIAEpAAgQCSEHIAYgASkAEBAJIQYgBSABKQAYEAkhBSABQSBqIgEgA00NAAsgACAFNwMgIAAgBjcDGCAAIAc3AxAgACAINwMICyABIAJPDQEgAEEoaiABIAIgAWsiBBAgCyAAIAQ2AkgLCy8BAX8gAEUEQEG2f0EAIAMbDwtBun8hBCADIAFNBH8gACACIAMQEBogAwVBun8LCy8BAX8gAEUEQEG2f0EAIAMbDwtBun8hBCADIAFNBH8gACACIAMQCxogAwVBun8LC6gCAQZ/IwBBEGsiByQAIABB2OABaikDAEKAgIAQViEIQbh/IQUCQCAEQf//B0sNACAAIAMgBBBCIgUQAyIGDQAgACgCnOIBIQkgACAHQQxqIAMgAyAFaiAGGyIKIARBACAFIAYbayIGEEAiAxADBEAgAyEFDAELIAcoAgwhBCABRQRAQbp/IQUgBEEASg0BCyAGIANrIQUgAyAKaiEDAkAgCQRAIABBADYCnOIBDAELAkACQAJAIARBBUgNACAAQdjgAWopAwBCgICACFgNAAwBCyAAQQA2ApziAQwBCyAAKAIIED8hBiAAQQA2ApziASAGQRRPDQELIAAgASACIAMgBSAEIAgQOSEFDAELIAAgASACIAMgBSAEIAgQOiEFCyAHQRBqJAAgBQtnACAAQdDgAWogASACIAAoAuzhARAuIgEQAwRAIAEPC0G4fyECAkAgAQ0AIABB7OABaigCACIBBEBBYCECIAAoApjiASABRw0BC0EAIQIgAEHw4AFqKAIARQ0AIABBkOEBahBDCyACCycBAX8QVyIERQRAQUAPCyAEIAAgASACIAMgBBBLEE8hACAEEFYgAAs/AQF/AkACQAJAIAAoAqDiAUEBaiIBQQJLDQAgAUEBaw4CAAECCyAAEDBBAA8LIABBADYCoOIBCyAAKAKU4gELvAMCB38BfiMAQRBrIgkkAEG4fyEGAkAgBCgCACIIQQVBCSAAKALs4QEiBRtJDQAgAygCACIHQQFBBSAFGyAFEC8iBRADBEAgBSEGDAELIAggBUEDakkNACAAIAcgBRBJIgYQAw0AIAEgAmohCiAAQZDhAWohCyAIIAVrIQIgBSAHaiEHIAEhBQNAIAcgAiAJECwiBhADDQEgAkF9aiICIAZJBEBBuH8hBgwCCyAJKAIAIghBAksEQEFsIQYMAgsgB0EDaiEHAn8CQAJAAkAgCEEBaw4CAgABCyAAIAUgCiAFayAHIAYQSAwCCyAFIAogBWsgByAGEEcMAQsgBSAKIAVrIActAAAgCSgCCBBGCyIIEAMEQCAIIQYMAgsgACgC8OABBEAgCyAFIAgQRQsgAiAGayECIAYgB2ohByAFIAhqIQUgCSgCBEUNAAsgACkD0OABIgxCf1IEQEFsIQYgDCAFIAFrrFINAQsgACgC8OABBEBBaiEGIAJBBEkNASALEEQhDCAHKAAAIAynRw0BIAdBBGohByACQXxqIQILIAMgBzYCACAEIAI2AgAgBSABayEGCyAJQRBqJAAgBgsuACAAECsCf0EAQQAQAw0AGiABRSACRXJFBEBBYiAAIAEgAhA9EAMNARoLQQALCzcAIAEEQCAAIAAoAsTgASABKAIEIAEoAghqRzYCnOIBCyAAECtBABADIAFFckUEQCAAIAEQWwsL0QIBB38jAEEQayIGJAAgBiAENgIIIAYgAzYCDCAFBEAgBSgCBCEKIAUoAgghCQsgASEIAkACQANAIAAoAuzhARAWIQsCQANAIAQgC0kNASADKAAAQXBxQdDUtMIBRgRAIAMgBBAiIgcQAw0EIAQgB2shBCADIAdqIQMMAQsLIAYgAzYCDCAGIAQ2AggCQCAFBEAgACAFEE5BACEHQQAQA0UNAQwFCyAAIAogCRBNIgcQAw0ECyAAIAgQUCAMQQFHQQAgACAIIAIgBkEMaiAGQQhqEEwiByIDa0EAIAMQAxtBCkdyRQRAQbh/IQcMBAsgBxADDQMgAiAHayECIAcgCGohCEEBIQwgBigCDCEDIAYoAgghBAwBCwsgBiADNgIMIAYgBDYCCEG4fyEHIAQNASAIIAFrIQcMAQsgBiADNgIMIAYgBDYCCAsgBkEQaiQAIAcLRgECfyABIAAoArjgASICRwRAIAAgAjYCxOABIAAgATYCuOABIAAoArzgASEDIAAgATYCvOABIAAgASADIAJrajYCwOABCwutAgIEfwF+IwBBQGoiBCQAAkACQCACQQhJDQAgASgAAEFwcUHQ1LTCAUcNACABIAIQIiEBIABCADcDCCAAQQA2AgQgACABNgIADAELIARBGGogASACEC0iAxADBEAgACADEBoMAQsgAwRAIABBuH8QGgwBCyACIAQoAjAiA2shAiABIANqIQMDQAJAIAAgAyACIARBCGoQLCIFEAMEfyAFBSACIAVBA2oiBU8NAUG4fwsQGgwCCyAGQQFqIQYgAiAFayECIAMgBWohAyAEKAIMRQ0ACyAEKAI4BEAgAkEDTQRAIABBuH8QGgwCCyADQQRqIQMLIAQoAighAiAEKQMYIQcgAEEANgIEIAAgAyABazYCACAAIAIgBmytIAcgB0J/URs3AwgLIARBQGskAAslAQF/IwBBEGsiAiQAIAIgACABEFEgAigCACEAIAJBEGokACAAC30BBH8jAEGQBGsiBCQAIARB/wE2AggCQCAEQRBqIARBCGogBEEMaiABIAIQFSIGEAMEQCAGIQUMAQtBVCEFIAQoAgwiB0EGSw0AIAMgBEEQaiAEKAIIIAcQQSIFEAMNACAAIAEgBmogAiAGayADEDwhBQsgBEGQBGokACAFC4cBAgJ/An5BABAWIQMCQANAIAEgA08EQAJAIAAoAABBcHFB0NS0wgFGBEAgACABECIiAhADRQ0BQn4PCyAAIAEQVSIEQn1WDQMgBCAFfCIFIARUIQJCfiEEIAINAyAAIAEQUiICEAMNAwsgASACayEBIAAgAmohAAwBCwtCfiAFIAEbIQQLIAQLPwIBfwF+IwBBMGsiAiQAAn5CfiACQQhqIAAgARAtDQAaQgAgAigCHEEBRg0AGiACKQMICyEDIAJBMGokACADC40BAQJ/IwBBMGsiASQAAkAgAEUNACAAKAKI4gENACABIABB/OEBaigCADYCKCABIAApAvThATcDICAAEDAgACgCqOIBIQIgASABKAIoNgIYIAEgASkDIDcDECACIAFBEGoQGyAAQQA2AqjiASABIAEoAig2AgggASABKQMgNwMAIAAgARAbCyABQTBqJAALKgECfyMAQRBrIgAkACAAQQA2AgggAEIANwMAIAAQWCEBIABBEGokACABC4cBAQN/IwBBEGsiAiQAAkAgACgCAEUgACgCBEVzDQAgAiAAKAIINgIIIAIgACkCADcDAAJ/IAIoAgAiAQRAIAIoAghBqOMJIAERBQAMAQtBqOMJECgLIgFFDQAgASAAKQIANwL04QEgAUH84QFqIAAoAgg2AgAgARBZIAEhAwsgAkEQaiQAIAMLywEBAn8jAEEgayIBJAAgAEGBgIDAADYCtOIBIABBADYCiOIBIABBADYC7OEBIABCADcDkOIBIABBADYCpOMJIABBADYC3OIBIABCADcCzOIBIABBADYCvOIBIABBADYCxOABIABCADcCnOIBIABBpOIBakIANwIAIABBrOIBakEANgIAIAFCADcCECABQgA3AhggASABKQMYNwMIIAEgASkDEDcDACABKAIIQQh2QQFxIQIgAEEANgLg4gEgACACNgKM4gEgAUEgaiQAC3YBA38jAEEwayIBJAAgAARAIAEgAEHE0AFqIgIoAgA2AiggASAAKQK80AE3AyAgACgCACEDIAEgAigCADYCGCABIAApArzQATcDECADIAFBEGoQGyABIAEoAig2AgggASABKQMgNwMAIAAgARAbCyABQTBqJAALzAEBAX8gACABKAK00AE2ApjiASAAIAEoAgQiAjYCwOABIAAgAjYCvOABIAAgAiABKAIIaiICNgK44AEgACACNgLE4AEgASgCuNABBEAgAEKBgICAEDcDiOEBIAAgAUGk0ABqNgIMIAAgAUGUIGo2AgggACABQZwwajYCBCAAIAFBDGo2AgAgAEGs0AFqIAFBqNABaigCADYCACAAQbDQAWogAUGs0AFqKAIANgIAIABBtNABaiABQbDQAWooAgA2AgAPCyAAQgA3A4jhAQs7ACACRQRAQbp/DwsgBEUEQEFsDwsgAiAEEGAEQCAAIAEgAiADIAQgBRBhDwsgACABIAIgAyAEIAUQZQtGAQF/IwBBEGsiBSQAIAVBCGogBBAOAn8gBS0ACQRAIAAgASACIAMgBBAyDAELIAAgASACIAMgBBA0CyEAIAVBEGokACAACzQAIAAgAyAEIAUQNiIFEAMEQCAFDwsgBSAESQR/IAEgAiADIAVqIAQgBWsgABA1BUG4fwsLRgEBfyMAQRBrIgUkACAFQQhqIAQQDgJ/IAUtAAkEQCAAIAEgAiADIAQQYgwBCyAAIAEgAiADIAQQNQshACAFQRBqJAAgAAtZAQF/QQ8hAiABIABJBEAgAUEEdCAAbiECCyAAQQh2IgEgAkEYbCIAQYwIaigCAGwgAEGICGooAgBqIgJBA3YgAmogAEGACGooAgAgAEGECGooAgAgAWxqSQs3ACAAIAMgBCAFQYAQEDMiBRADBEAgBQ8LIAUgBEkEfyABIAIgAyAFaiAEIAVrIAAQMgVBuH8LC78DAQN/IwBBIGsiBSQAIAVBCGogAiADEAYiAhADRQRAIAAgAWoiB0F9aiEGIAUgBBAOIARBBGohAiAFLQACIQMDQEEAIAAgBkkgBUEIahAEGwRAIAAgAiAFQQhqIAMQAkECdGoiBC8BADsAACAFQQhqIAQtAAIQASAAIAQtAANqIgQgAiAFQQhqIAMQAkECdGoiAC8BADsAACAFQQhqIAAtAAIQASAEIAAtAANqIQAMAQUgB0F+aiEEA0AgBUEIahAEIAAgBEtyRQRAIAAgAiAFQQhqIAMQAkECdGoiBi8BADsAACAFQQhqIAYtAAIQASAAIAYtAANqIQAMAQsLA0AgACAES0UEQCAAIAIgBUEIaiADEAJBAnRqIgYvAQA7AAAgBUEIaiAGLQACEAEgACAGLQADaiEADAELCwJAIAAgB08NACAAIAIgBUEIaiADEAIiA0ECdGoiAC0AADoAACAALQADQQFGBEAgBUEIaiAALQACEAEMAQsgBSgCDEEfSw0AIAVBCGogAiADQQJ0ai0AAhABIAUoAgxBIUkNACAFQSA2AgwLIAFBbCAFQQhqEAobIQILCwsgBUEgaiQAIAILkgIBBH8jAEFAaiIJJAAgCSADQTQQCyEDAkAgBEECSA0AIAMgBEECdGooAgAhCSADQTxqIAgQIyADQQE6AD8gAyACOgA+QQAhBCADKAI8IQoDQCAEIAlGDQEgACAEQQJ0aiAKNgEAIARBAWohBAwAAAsAC0EAIQkDQCAGIAlGRQRAIAMgBSAJQQF0aiIKLQABIgtBAnRqIgwoAgAhBCADQTxqIAotAABBCHQgCGpB//8DcRAjIANBAjoAPyADIAcgC2siCiACajoAPiAEQQEgASAKa3RqIQogAygCPCELA0AgACAEQQJ0aiALNgEAIARBAWoiBCAKSQ0ACyAMIAo2AgAgCUEBaiEJDAELCyADQUBrJAALowIBCX8jAEHQAGsiCSQAIAlBEGogBUE0EAsaIAcgBmshDyAHIAFrIRADQAJAIAMgCkcEQEEBIAEgByACIApBAXRqIgYtAAEiDGsiCGsiC3QhDSAGLQAAIQ4gCUEQaiAMQQJ0aiIMKAIAIQYgCyAPTwRAIAAgBkECdGogCyAIIAUgCEE0bGogCCAQaiIIQQEgCEEBShsiCCACIAQgCEECdGooAgAiCEEBdGogAyAIayAHIA4QYyAGIA1qIQgMAgsgCUEMaiAOECMgCUEBOgAPIAkgCDoADiAGIA1qIQggCSgCDCELA0AgBiAITw0CIAAgBkECdGogCzYBACAGQQFqIQYMAAALAAsgCUHQAGokAA8LIAwgCDYCACAKQQFqIQoMAAALAAs0ACAAIAMgBCAFEDYiBRADBEAgBQ8LIAUgBEkEfyABIAIgAyAFaiAEIAVrIAAQNAVBuH8LCyMAIAA/AEEQdGtB//8DakEQdkAAQX9GBEBBAA8LQQAQAEEBCzsBAX8gAgRAA0AgACABIAJBgCAgAkGAIEkbIgMQCyEAIAFBgCBqIQEgAEGAIGohACACIANrIgINAAsLCwYAIAAQAwsLqBUJAEGICAsNAQAAAAEAAAACAAAAAgBBoAgLswYBAAAAAQAAAAIAAAACAAAAJgAAAIIAAAAhBQAASgAAAGcIAAAmAAAAwAEAAIAAAABJBQAASgAAAL4IAAApAAAALAIAAIAAAABJBQAASgAAAL4IAAAvAAAAygIAAIAAAACKBQAASgAAAIQJAAA1AAAAcwMAAIAAAACdBQAASgAAAKAJAAA9AAAAgQMAAIAAAADrBQAASwAAAD4KAABEAAAAngMAAIAAAABNBgAASwAAAKoKAABLAAAAswMAAIAAAADBBgAATQAAAB8NAABNAAAAUwQAAIAAAAAjCAAAUQAAAKYPAABUAAAAmQQAAIAAAABLCQAAVwAAALESAABYAAAA2gQAAIAAAABvCQAAXQAAACMUAABUAAAARQUAAIAAAABUCgAAagAAAIwUAABqAAAArwUAAIAAAAB2CQAAfAAAAE4QAAB8AAAA0gIAAIAAAABjBwAAkQAAAJAHAACSAAAAAAAAAAEAAAABAAAABQAAAA0AAAAdAAAAPQAAAH0AAAD9AAAA/QEAAP0DAAD9BwAA/Q8AAP0fAAD9PwAA/X8AAP3/AAD9/wEA/f8DAP3/BwD9/w8A/f8fAP3/PwD9/38A/f//AP3//wH9//8D/f//B/3//w/9//8f/f//P/3//38AAAAAAQAAAAIAAAADAAAABAAAAAUAAAAGAAAABwAAAAgAAAAJAAAACgAAAAsAAAAMAAAADQAAAA4AAAAPAAAAEAAAABEAAAASAAAAEwAAABQAAAAVAAAAFgAAABcAAAAYAAAAGQAAABoAAAAbAAAAHAAAAB0AAAAeAAAAHwAAAAMAAAAEAAAABQAAAAYAAAAHAAAACAAAAAkAAAAKAAAACwAAAAwAAAANAAAADgAAAA8AAAAQAAAAEQAAABIAAAATAAAAFAAAABUAAAAWAAAAFwAAABgAAAAZAAAAGgAAABsAAAAcAAAAHQAAAB4AAAAfAAAAIAAAACEAAAAiAAAAIwAAACUAAAAnAAAAKQAAACsAAAAvAAAAMwAAADsAAABDAAAAUwAAAGMAAACDAAAAAwEAAAMCAAADBAAAAwgAAAMQAAADIAAAA0AAAAOAAAADAAEAQeAPC1EBAAAAAQAAAAEAAAABAAAAAgAAAAIAAAADAAAAAwAAAAQAAAAEAAAABQAAAAcAAAAIAAAACQAAAAoAAAALAAAADAAAAA0AAAAOAAAADwAAABAAQcQQC4sBAQAAAAIAAAADAAAABAAAAAUAAAAGAAAABwAAAAgAAAAJAAAACgAAAAsAAAAMAAAADQAAAA4AAAAPAAAAEAAAABIAAAAUAAAAFgAAABgAAAAcAAAAIAAAACgAAAAwAAAAQAAAAIAAAAAAAQAAAAIAAAAEAAAACAAAABAAAAAgAAAAQAAAAIAAAAAAAQBBkBIL5gQBAAAAAQAAAAEAAAABAAAAAgAAAAIAAAADAAAAAwAAAAQAAAAGAAAABwAAAAgAAAAJAAAACgAAAAsAAAAMAAAADQAAAA4AAAAPAAAAEAAAAAEAAAAEAAAACAAAAAAAAAABAAEBBgAAAAAAAAQAAAAAEAAABAAAAAAgAAAFAQAAAAAAAAUDAAAAAAAABQQAAAAAAAAFBgAAAAAAAAUHAAAAAAAABQkAAAAAAAAFCgAAAAAAAAUMAAAAAAAABg4AAAAAAAEFEAAAAAAAAQUUAAAAAAABBRYAAAAAAAIFHAAAAAAAAwUgAAAAAAAEBTAAAAAgAAYFQAAAAAAABwWAAAAAAAAIBgABAAAAAAoGAAQAAAAADAYAEAAAIAAABAAAAAAAAAAEAQAAAAAAAAUCAAAAIAAABQQAAAAAAAAFBQAAACAAAAUHAAAAAAAABQgAAAAgAAAFCgAAAAAAAAULAAAAAAAABg0AAAAgAAEFEAAAAAAAAQUSAAAAIAABBRYAAAAAAAIFGAAAACAAAwUgAAAAAAADBSgAAAAAAAYEQAAAABAABgRAAAAAIAAHBYAAAAAAAAkGAAIAAAAACwYACAAAMAAABAAAAAAQAAAEAQAAACAAAAUCAAAAIAAABQMAAAAgAAAFBQAAACAAAAUGAAAAIAAABQgAAAAgAAAFCQAAACAAAAULAAAAIAAABQwAAAAAAAAGDwAAACAAAQUSAAAAIAABBRQAAAAgAAIFGAAAACAAAgUcAAAAIAADBSgAAAAgAAQFMAAAAAAAEAYAAAEAAAAPBgCAAAAAAA4GAEAAAAAADQYAIABBgBcLhwIBAAEBBQAAAAAAAAUAAAAAAAAGBD0AAAAAAAkF/QEAAAAADwX9fwAAAAAVBf3/HwAAAAMFBQAAAAAABwR9AAAAAAAMBf0PAAAAABIF/f8DAAAAFwX9/38AAAAFBR0AAAAAAAgE/QAAAAAADgX9PwAAAAAUBf3/DwAAAAIFAQAAABAABwR9AAAAAAALBf0HAAAAABEF/f8BAAAAFgX9/z8AAAAEBQ0AAAAQAAgE/QAAAAAADQX9HwAAAAATBf3/BwAAAAEFAQAAABAABgQ9AAAAAAAKBf0DAAAAABAF/f8AAAAAHAX9//8PAAAbBf3//wcAABoF/f//AwAAGQX9//8BAAAYBf3//wBBkBkLhgQBAAEBBgAAAAAAAAYDAAAAAAAABAQAAAAgAAAFBQAAAAAAAAUGAAAAAAAABQgAAAAAAAAFCQAAAAAAAAULAAAAAAAABg0AAAAAAAAGEAAAAAAAAAYTAAAAAAAABhYAAAAAAAAGGQAAAAAAAAYcAAAAAAAABh8AAAAAAAAGIgAAAAAAAQYlAAAAAAABBikAAAAAAAIGLwAAAAAAAwY7AAAAAAAEBlMAAAAAAAcGgwAAAAAACQYDAgAAEAAABAQAAAAAAAAEBQAAACAAAAUGAAAAAAAABQcAAAAgAAAFCQAAAAAAAAUKAAAAAAAABgwAAAAAAAAGDwAAAAAAAAYSAAAAAAAABhUAAAAAAAAGGAAAAAAAAAYbAAAAAAAABh4AAAAAAAAGIQAAAAAAAQYjAAAAAAABBicAAAAAAAIGKwAAAAAAAwYzAAAAAAAEBkMAAAAAAAUGYwAAAAAACAYDAQAAIAAABAQAAAAwAAAEBAAAABAAAAQFAAAAIAAABQcAAAAgAAAFCAAAACAAAAUKAAAAIAAABQsAAAAAAAAGDgAAAAAAAAYRAAAAAAAABhQAAAAAAAAGFwAAAAAAAAYaAAAAAAAABh0AAAAAAAAGIAAAAAAAEAYDAAEAAAAPBgOAAAAAAA4GA0AAAAAADQYDIAAAAAAMBgMQAAAAAAsGAwgAAAAACgYDBABBpB0L2QEBAAAAAwAAAAcAAAAPAAAAHwAAAD8AAAB/AAAA/wAAAP8BAAD/AwAA/wcAAP8PAAD/HwAA/z8AAP9/AAD//wAA//8BAP//AwD//wcA//8PAP//HwD//z8A//9/AP///wD///8B////A////wf///8P////H////z////9/AAAAAAEAAAACAAAABAAAAAAAAAACAAAABAAAAAgAAAAAAAAAAQAAAAIAAAABAAAABAAAAAQAAAAEAAAABAAAAAgAAAAIAAAACAAAAAcAAAAIAAAACQAAAAoAAAALAEGgIAsDwBBQ`,Cf=new WeakMap,wf=0,Tf,Ef=class e extends kc{constructor(e){super(e),this.transcoderPath=``,this.transcoderBinary=null,this.transcoderPending=null,this.workerPool=new df,this.workerSourceURL=``,this.workerConfig=null,typeof MSC_TRANSCODER<`u`&&console.warn(`THREE.KTX2Loader: Please update to latest "basis_transcoder". "msc_basis_transcoder" is no longer supported in three.js r125+.`)}setTranscoderPath(e){return this.transcoderPath=e,this}setWorkerLimit(e){return this.workerPool.setWorkerLimit(e),this}async detectSupportAsync(e){return this.workerConfig={astcSupported:await e.hasFeatureAsync(`texture-compression-astc`),etc1Supported:await e.hasFeatureAsync(`texture-compression-etc1`),etc2Supported:await e.hasFeatureAsync(`texture-compression-etc2`),dxtSupported:await e.hasFeatureAsync(`texture-compression-bc`),bptcSupported:await e.hasFeatureAsync(`texture-compression-bptc`),pvrtcSupported:await e.hasFeatureAsync(`texture-compression-pvrtc`)},this}detectSupport(e){return e.isWebGPURenderer===!0?this.workerConfig={astcSupported:e.hasFeature(`texture-compression-astc`),etc1Supported:e.hasFeature(`texture-compression-etc1`),etc2Supported:e.hasFeature(`texture-compression-etc2`),dxtSupported:e.hasFeature(`texture-compression-bc`),bptcSupported:e.hasFeature(`texture-compression-bptc`),pvrtcSupported:e.hasFeature(`texture-compression-pvrtc`)}:(this.workerConfig={astcSupported:e.extensions.has(`WEBGL_compressed_texture_astc`),etc1Supported:e.extensions.has(`WEBGL_compressed_texture_etc1`),etc2Supported:e.extensions.has(`WEBGL_compressed_texture_etc`),dxtSupported:e.extensions.has(`WEBGL_compressed_texture_s3tc`),bptcSupported:e.extensions.has(`EXT_texture_compression_bptc`),pvrtcSupported:e.extensions.has(`WEBGL_compressed_texture_pvrtc`)||e.extensions.has(`WEBKIT_WEBGL_compressed_texture_pvrtc`)},this.workerConfig.etc1Supported=!1),this}init(){if(!this.transcoderPending){let t=new Mc(this.manager);t.setPath(this.transcoderPath),t.setWithCredentials(this.withCredentials);let n=t.loadAsync(`basis_transcoder.js`),r=new Mc(this.manager);r.setPath(this.transcoderPath),r.setResponseType(`arraybuffer`),r.setWithCredentials(this.withCredentials);let i=r.loadAsync(`basis_transcoder.wasm`);this.transcoderPending=Promise.all([n,i]).then(([t,n])=>{let r=e.BasisWorker.toString(),i=[`/* constants */`,`let _EngineFormat = `+JSON.stringify(e.EngineFormat),`let _TranscoderFormat = `+JSON.stringify(e.TranscoderFormat),`let _BasisFormat = `+JSON.stringify(e.BasisFormat),`/* basis_transcoder.js */`,t,`/* worker */`,r.substring(r.indexOf(`{`)+1,r.lastIndexOf(`}`))].join(`
`);this.workerSourceURL=URL.createObjectURL(new Blob([i])),this.transcoderBinary=n,this.workerPool.setWorkerCreator(()=>{let e=new Worker(this.workerSourceURL),t=this.transcoderBinary.slice(0);return e.postMessage({type:`init`,config:this.workerConfig,transcoderBinary:t},[t]),e})}),wf>0&&console.warn(`THREE.KTX2Loader: Multiple active KTX2 loaders may cause performance issues. Use a single KTX2Loader instance, or call .dispose() on old instances.`),wf++}return this.transcoderPending}load(e,t,n,r){if(this.workerConfig===null)throw Error("THREE.KTX2Loader: Missing initialization with `.detectSupport( renderer )`.");let i=new Mc(this.manager);i.setResponseType(`arraybuffer`),i.setWithCredentials(this.withCredentials),i.load(e,e=>{if(Cf.has(e))return Cf.get(e).promise.then(t).catch(r);this._createTexture(e).then(e=>t?t(e):null).catch(r)},n,r)}_createTextureFrom(e,t){let{faces:n,width:r,height:i,format:a,type:o,error:s,dfdFlags:c}=e;if(o===`error`)return Promise.reject(s);let l;if(t.faceCount===6)l=new tc(n,a,h);else{let e=n[0].mipmaps;l=t.layerCount>1?new ec(e,r,i,t.layerCount,a,h):new $s(e,r,i,a,h)}return l.minFilter=n[0].mipmaps.length===1?d:p,l.magFilter=d,l.generateMipmaps=!1,l.needsUpdate=!0,l.colorSpace=jf(t),l.premultiplyAlpha=!!(c&1),l}async _createTexture(e,t={}){let n=gf(new Uint8Array(e));if(n.vkFormat!==0)return Af(n);let r=t,i=this.init().then(()=>this.workerPool.postMessage({type:`transcode`,buffer:e,taskConfig:r},[e])).then(e=>this._createTextureFrom(e.data,n));return Cf.set(e,{promise:i}),i}dispose(){return this.workerPool.dispose(),this.workerSourceURL&&URL.revokeObjectURL(this.workerSourceURL),wf--,this}};Ef.BasisFormat={ETC1S:0,UASTC_4x4:1},Ef.TranscoderFormat={ETC1:0,ETC2:1,BC1:2,BC3:3,BC4:4,BC5:5,BC7_M6_OPAQUE_ONLY:6,BC7_M5:7,PVRTC1_4_RGB:8,PVRTC1_4_RGBA:9,ASTC_4x4:10,ATC_RGB:11,ATC_RGBA_INTERPOLATED_ALPHA:12,RGBA32:13,RGB565:14,BGR565:15,RGBA4444:16},Ef.EngineFormat={RGBAFormat:C,RGBA_ASTC_4x4_Format:P,RGBA_BPTC_Format:ne,RGBA_ETC2_EAC_Format:N,RGBA_PVRTC_4BPPV1_Format:j,RGBA_S3TC_DXT5_Format:k,RGB_ETC1_Format:ee,RGB_ETC2_Format:M,RGB_PVRTC_4BPPV1_Format:A,RGB_S3TC_DXT1_Format:O},Ef.BasisWorker=function(){let e,t,n,r=_EngineFormat,i=_TranscoderFormat,a=_BasisFormat;self.addEventListener(`message`,function(n){let r=n.data;switch(r.type){case`init`:e=r.config,o(r.transcoderBinary);break;case`transcode`:t.then(()=>{try{let{faces:e,buffers:t,width:n,height:i,hasAlpha:a,format:o,dfdFlags:c}=s(r.buffer);self.postMessage({type:`transcode`,id:r.id,faces:e,width:n,height:i,hasAlpha:a,format:o,dfdFlags:c},t)}catch(e){console.error(e),self.postMessage({type:`error`,id:r.id,error:e.message})}})}});function o(e){t=new Promise(t=>{n={wasmBinary:e,onRuntimeInitialized:t},BASIS(n)}).then(()=>{n.initializeBasis(),n.KTX2File===void 0&&console.warn(`THREE.KTX2Loader: Please update Basis Universal transcoder.`)})}function s(e){let t=new n.KTX2File(new Uint8Array(e));function r(){t.close(),t.delete()}if(!t.isValid())throw r(),Error(`THREE.KTX2Loader:	Invalid or unsupported .ktx2 file`);let i=t.isUASTC()?a.UASTC_4x4:a.ETC1S,o=t.getWidth(),s=t.getHeight(),c=t.getLayers()||1,l=t.getLevels(),u=t.getFaces(),f=t.getHasAlpha(),m=t.getDFDFlags(),{transcoderFormat:h,engineFormat:g}=d(i,o,s,f);if(!o||!s||!l)throw r(),Error(`THREE.KTX2Loader:	Invalid texture`);if(!t.startTranscoding())throw r(),Error(`THREE.KTX2Loader: .startTranscoding failed`);let _=[],v=[];for(let e=0;e<u;e++){let n=[];for(let i=0;i<l;i++){let a=[],o,s;for(let n=0;n<c;n++){let c=t.getImageLevelInfo(i,n,e);e===0&&i===0&&n===0&&(c.origWidth%4!=0||c.origHeight%4!=0)&&console.warn(`THREE.KTX2Loader: ETC1S and UASTC textures should use multiple-of-four dimensions.`),l>1?(o=c.origWidth,s=c.origHeight):(o=c.width,s=c.height);let u=new Uint8Array(t.getImageTranscodedSizeInBytes(i,n,0,h));if(!t.transcodeImage(u,i,n,e,h,0,-1,-1))throw r(),Error(`THREE.KTX2Loader: .transcodeImage failed.`);a.push(u)}let u=p(a);n.push({data:u,width:o,height:s}),v.push(u.buffer)}_.push({mipmaps:n,width:o,height:s,format:g})}return r(),{faces:_,buffers:v,width:o,height:s,hasAlpha:f,format:g,dfdFlags:m}}let c=[{if:`astcSupported`,basisFormat:[a.UASTC_4x4],transcoderFormat:[i.ASTC_4x4,i.ASTC_4x4],engineFormat:[r.RGBA_ASTC_4x4_Format,r.RGBA_ASTC_4x4_Format],priorityETC1S:1/0,priorityUASTC:1,needsPowerOfTwo:!1},{if:`bptcSupported`,basisFormat:[a.ETC1S,a.UASTC_4x4],transcoderFormat:[i.BC7_M5,i.BC7_M5],engineFormat:[r.RGBA_BPTC_Format,r.RGBA_BPTC_Format],priorityETC1S:3,priorityUASTC:2,needsPowerOfTwo:!1},{if:`dxtSupported`,basisFormat:[a.ETC1S,a.UASTC_4x4],transcoderFormat:[i.BC1,i.BC3],engineFormat:[r.RGB_S3TC_DXT1_Format,r.RGBA_S3TC_DXT5_Format],priorityETC1S:4,priorityUASTC:5,needsPowerOfTwo:!1},{if:`etc2Supported`,basisFormat:[a.ETC1S,a.UASTC_4x4],transcoderFormat:[i.ETC1,i.ETC2],engineFormat:[r.RGB_ETC2_Format,r.RGBA_ETC2_EAC_Format],priorityETC1S:1,priorityUASTC:3,needsPowerOfTwo:!1},{if:`etc1Supported`,basisFormat:[a.ETC1S,a.UASTC_4x4],transcoderFormat:[i.ETC1],engineFormat:[r.RGB_ETC1_Format],priorityETC1S:2,priorityUASTC:4,needsPowerOfTwo:!1},{if:`pvrtcSupported`,basisFormat:[a.ETC1S,a.UASTC_4x4],transcoderFormat:[i.PVRTC1_4_RGB,i.PVRTC1_4_RGBA],engineFormat:[r.RGB_PVRTC_4BPPV1_Format,r.RGBA_PVRTC_4BPPV1_Format],priorityETC1S:5,priorityUASTC:6,needsPowerOfTwo:!0}],l=c.sort(function(e,t){return e.priorityETC1S-t.priorityETC1S}),u=c.sort(function(e,t){return e.priorityUASTC-t.priorityUASTC});function d(t,n,o,s){let c,d,p=t===a.ETC1S?l:u;for(let r=0;r<p.length;r++){let i=p[r];if(e[i.if]&&i.basisFormat.includes(t)&&!(s&&i.transcoderFormat.length<2)&&(!i.needsPowerOfTwo||f(n)&&f(o)))return c=i.transcoderFormat[+!!s],d=i.engineFormat[+!!s],{transcoderFormat:c,engineFormat:d}}return console.warn(`THREE.KTX2Loader: No suitable compressed texture format found. Decoding to RGBA32.`),c=i.RGBA32,d=r.RGBAFormat,{transcoderFormat:c,engineFormat:d}}function f(e){return e<=2||!(e&e-1)&&e!==0}function p(e){if(e.length===1)return e[0];let t=0;for(let n=0;n<e.length;n++){let r=e[n];t+=r.byteLength}let n=new Uint8Array(t),r=0;for(let t=0;t<e.length;t++){let i=e[t];n.set(i,r),r+=i.byteLength}return n}};var Df=new Set([C,D,E]),Of={109:C,97:C,37:C,43:C,103:D,83:D,16:D,22:D,100:E,76:E,15:E,9:E,166:te,165:te},kf={109:b,97:x,37:h,43:h,103:b,83:x,16:h,22:h,100:b,76:x,15:h,9:h,166:h,165:h};async function Af(e){let{vkFormat:t}=e;if(Of[t]===void 0)throw Error(`THREE.KTX2Loader: Unsupported vkFormat.`);let n;e.supercompressionScheme===2&&(Tf||=new Promise(async e=>{let t=new xf;await t.init(),e(t)}),n=await Tf);let r=[];for(let i=0;i<e.levels.length;i++){let a=Math.max(1,e.pixelWidth>>i),o=Math.max(1,e.pixelHeight>>i),s=e.pixelDepth?Math.max(1,e.pixelDepth>>i):0,c=e.levels[i],l;if(e.supercompressionScheme===0)l=c.levelData;else if(e.supercompressionScheme===2)l=n.decode(c.levelData,c.uncompressedByteLength);else throw Error(`THREE.KTX2Loader: Unsupported supercompressionScheme.`);let u;u=kf[t]===1015?new Float32Array(l.buffer,l.byteOffset,l.byteLength/Float32Array.BYTES_PER_ELEMENT):kf[t]===1016?new Uint16Array(l.buffer,l.byteOffset,l.byteLength/Uint16Array.BYTES_PER_ELEMENT):l,r.push({data:u,width:a,height:o,depth:s})}let i;if(Df.has(Of[t]))i=e.pixelDepth===0?new xs(r[0].data,e.pixelWidth,e.pixelHeight):new vt(r[0].data,e.pixelWidth,e.pixelHeight,e.pixelDepth);else{if(e.pixelDepth>0)throw Error(`THREE.KTX2Loader: Unsupported pixelDepth.`);i=new $s(r,e.pixelWidth,e.pixelHeight)}return i.mipmaps=r,i.type=kf[t],i.format=Of[t],i.colorSpace=jf(e),i.needsUpdate=!0,Promise.resolve(i)}function jf(e){let t=e.dataFormatDescriptor[0];return t.colorPrimaries===1?t.transferFunction===2?pe:me:t.colorPrimaries===10?t.transferFunction===2?he:ge:(t.colorPrimaries===0||console.warn(`THREE.KTX2Loader: Unsupported color primaries, "${t.colorPrimaries}"`),``)}var Mf,Nf,Pf=Symbol(`retainerCount`),Ff=Symbol(`recentlyUsed`),If=Symbol(`evict`),Lf=Symbol(`evictionThreshold`),Rf=Symbol(`cache`),zf=class{constructor(e,t=5){this[Mf]=new Map,this[Nf]=[],this[Rf]=e,this[Lf]=t}set evictionThreshold(e){this[Lf]=e,this[If]()}get evictionThreshold(){return this[Lf]}get cache(){return this[Rf]}retainerCount(e){return this[Pf].get(e)||0}reset(){this[Pf].clear(),this[Ff]=[]}retain(e){this[Pf].has(e)||this[Pf].set(e,0),this[Pf].set(e,this[Pf].get(e)+1);let t=this[Ff].indexOf(e);t!==-1&&this[Ff].splice(t,1),this[Ff].unshift(e),this[If]()}release(e){this[Pf].has(e)&&this[Pf].set(e,Math.max(this[Pf].get(e)-1,0)),this[If]()}[(Mf=Pf,Nf=Ff,If)](){if(!(this[Ff].length<this[Lf]))for(let e=this[Ff].length-1;e>=this[Lf];--e){let t=this[Ff][e];this[Pf].get(t)===0&&(this[Rf].delete(t),this[Ff].splice(e,1))}}},Bf=e=>{let t=[],n=new Set;for(let r of e){let e=r,i=0;for(;n.has(e);)e=r+`.`+ ++i;n.add(e),t.push(e)}return t},Vf=e=>{let t=new Map;for(let n of e.mappings)for(let e of n.variants)t.set(e,{material:null,gltfMaterialIndex:n.material});return t},Hf=class{constructor(e){this.parser=e,this.name=`KHR_materials_variants`}afterRoot(e){let t=this.parser,n=t.json;if(n.extensions===void 0||n.extensions[this.name]===void 0)return null;let r=Bf((n.extensions[this.name].variants||[]).map(e=>e.name));for(let r of e.scenes)r.traverse(e=>{let r=e;if(!r.material)return;let i=t.associations.get(r);if(i==null||i.meshes==null||i.primitives==null)return;let a=n.meshes[i.meshes].primitives[i.primitives].extensions;a&&a[this.name]&&(r.userData.variantMaterials=Vf(a[this.name]))});return e.userData.variants=r,Promise.resolve()}},Uf,Wf;pt.DEFAULT_ANISOTROPY=4;var Gf=(e,t,n=()=>{})=>{let r=e=>{let t=e.loaded/e.total;n(Math.max(0,Math.min(1,isFinite(t)?t:1)))};return new Promise((n,i)=>{t.load(e,n,r,i)})},Kf=e=>new Promise((t,n)=>{let r=document.createElement(`script`);document.body.appendChild(r),r.onload=t,r.onerror=n,r.async=!0,r.src=e}),qf=new Map,Jf=new Map,Yf,Xf=new ud,Zf,Qf=new Ef,$f,ep,tp=Symbol(`loader`),np=Symbol(`evictionPolicy`),rp=Symbol(`GLTFInstance`),ip=class e extends be{constructor(e){super(),this[Wf]=new pd().register(e=>new Hf(e)),this[rp]=e,this[tp].setDRACOLoader(Xf),this[tp].setKTX2Loader(Qf)}static setDRACODecoderLocation(e){Yf=e,Xf.setDecoderPath(e)}static getDRACODecoderLocation(){return Yf}static setKTX2TranscoderLocation(e){Zf=e,Qf.setTranscoderPath(e)}static getKTX2TranscoderLocation(){return Zf}static setMeshoptDecoderLocation(e){$f!==e&&($f=e,ep=Kf(e).then(()=>MeshoptDecoder.ready).then(()=>MeshoptDecoder))}static getMeshoptDecoderLocation(){return $f}static initializeKTX2Loader(e){Qf.detectSupport(e)}static get cache(){return qf}static clearCache(){qf.forEach((e,t)=>{this.delete(t)}),this[np].reset()}static has(e){return qf.has(e)}static async delete(e){if(!this.has(e))return;let t=qf.get(e);Jf.delete(e),qf.delete(e),(await t).dispose()}static hasFinishedLoading(e){return!!Jf.get(e)}get[(Uf=np,Wf=tp,np)](){return this.constructor[np]}async preload(t,n,r=()=>{}){if(this[tp].setWithCredentials(e.withCredentials),this.dispatchEvent({type:`preload`,element:n,src:t}),!qf.has(t)){ep!=null&&this[tp].setMeshoptDecoder(await ep);let e=Gf(t,this[tp],e=>{r(e*.8)}),n=this[rp],i=e.then(e=>n.prepare(e)).then(e=>(r(.9),new n(e))).catch((e=>(console.error(e),new n)));qf.set(t,i)}await qf.get(t),Jf.set(t,!0),r&&r(1)}async load(e,t,n=()=>{}){await this.preload(e,t,n);let r=await(await qf.get(e)).clone();return this[np].retain(e),r.dispose=()=>{this[np].release(e)},r}};ip[Uf]=new zf(ip);var ap=class extends Sn{constructor(e=document.createElement(`div`)){super(),this.isCSS2DObject=!0,this.element=e,this.element.style.position=`absolute`,this.element.style.userSelect=`none`,this.element.setAttribute(`draggable`,!1),this.center=new V(.5,.5),this.addEventListener(`removed`,function(){this.traverse(function(e){e.element instanceof Element&&e.element.parentNode!==null&&e.element.parentNode.removeChild(e.element)})})}copy(e,t){return super.copy(e,t),this.element=e.element.cloneNode(!0),this.center=e.center,this}},op=new U,sp=new W,cp=new W,lp=new U,up=new U,dp=class{constructor(e={}){let t=this,n,r,i,a,o={objects:new WeakMap},s=e.element===void 0?document.createElement(`div`):e.element;s.style.overflow=`hidden`,this.domElement=s,this.getSize=function(){return{width:n,height:r}},this.render=function(e,t){e.matrixWorldAutoUpdate===!0&&e.updateMatrixWorld(),t.parent===null&&t.matrixWorldAutoUpdate===!0&&t.updateMatrixWorld(),sp.copy(t.matrixWorldInverse),cp.multiplyMatrices(t.projectionMatrix,sp),c(e,e,t),d(e)},this.setSize=function(e,t){n=e,r=t,i=n/2,a=r/2,s.style.width=e+`px`,s.style.height=t+`px`};function c(e,n,r){if(e.isCSS2DObject){op.setFromMatrixPosition(e.matrixWorld),op.applyMatrix4(cp);let c=e.visible===!0&&op.z>=-1&&op.z<=1&&e.layers.test(r.layers)===!0;if(e.element.style.display=c===!0?``:`none`,c===!0){e.onBeforeRender(t,n,r);let o=e.element;o.style.transform=`translate(`+-100*e.center.x+`%,`+-100*e.center.y+`%)translate(`+(op.x*i+i)+`px,`+(-op.y*a+a)+`px)`,o.parentNode!==s&&s.appendChild(o),e.onAfterRender(t,n,r)}let u={distanceToCameraSquared:l(r,e)};o.objects.set(e,u)}for(let t=0,i=e.children.length;t<i;t++)c(e.children[t],n,r)}function l(e,t){return lp.setFromMatrixPosition(e.matrixWorld),up.setFromMatrixPosition(t.matrixWorld),lp.distanceToSquared(up)}function u(e){let t=[];return e.traverse(function(e){e.isCSS2DObject&&t.push(e)}),t}function d(e){let t=u(e).sort(function(e,t){return e.renderOrder===t.renderOrder?o.objects.get(e).distanceToCameraSquared-o.objects.get(t).distanceToCameraSquared:t.renderOrder-e.renderOrder}),n=t.length;for(let e=0,r=t.length;e<r;e++)t[e].element.style.zIndex=n-e}}};function fp(e,t,n){let r=n,i=new U;return e.updateWorldMatrix(!0,!0),e.traverseVisible(e=>{let{geometry:n}=e;if(n!==void 0){let{position:a}=n.attributes;if(a!==void 0)for(let n=0,o=a.count;n<o;n++)e.isMesh?e.getVertexPosition(n,i):i.fromBufferAttribute(a,n),e.isSkinnedMesh||i.applyMatrix4(e.matrixWorld),r=t(r,i)}}),r}var pp,mp,hp,gp;function _p(e,t=1/0,n=null){mp||=new ti(2,2,1,1),hp||=new Fr({uniforms:{blitTexture:new gl(e)},vertexShader:`
			varying vec2 vUv;
			void main(){
				vUv = uv;
				gl_Position = vec4(position.xy * 1.0,0.,.999999);
			}`,fragmentShader:`
			uniform sampler2D blitTexture; 
			varying vec2 vUv;

			void main(){ 
				gl_FragColor = vec4(vUv.xy, 0, 1);
				
				#ifdef IS_SRGB
				gl_FragColor = LinearTosRGB( texture2D( blitTexture, vUv) );
				#else
				gl_FragColor = texture2D( blitTexture, vUv);
				#endif
			}`}),hp.uniforms.blitTexture.value=e,hp.defines.IS_SRGB=e.colorSpace==pe,hp.needsUpdate=!0,gp||(gp=new wr(mp,hp),gp.frustumCulled=!1);let r=new Br,i=new os;i.add(gp),n===null&&(n=pp=new as({antialias:!1}));let a=Math.min(e.image.width,t),o=Math.min(e.image.height,t);n.setSize(a,o),n.clear(),n.render(i,r);let s=document.createElement(`canvas`),c=s.getContext(`2d`);s.width=a,s.height=o,c.drawImage(n.domElement,0,0,a,o);let l=new nc(s);return l.minFilter=e.minFilter,l.magFilter=e.magFilter,l.wrapS=e.wrapS,l.wrapT=e.wrapT,l.name=e.name,pp&&=(pp.forceContextLoss(),pp.dispose(),null),l}var vp={POSITION:[`byte`,`byte normalized`,`unsigned byte`,`unsigned byte normalized`,`short`,`short normalized`,`unsigned short`,`unsigned short normalized`],NORMAL:[`byte normalized`,`short normalized`],TANGENT:[`byte normalized`,`short normalized`],TEXCOORD:[`byte`,`byte normalized`,`unsigned byte`,`short`,`short normalized`,`unsigned short`]},yp=class{constructor(){this.pluginCallbacks=[],this.register(function(e){return new zp(e)}),this.register(function(e){return new Bp(e)}),this.register(function(e){return new Up(e)}),this.register(function(e){return new Wp(e)}),this.register(function(e){return new Gp(e)}),this.register(function(e){return new Kp(e)}),this.register(function(e){return new Vp(e)}),this.register(function(e){return new Hp(e)}),this.register(function(e){return new qp(e)}),this.register(function(e){return new Jp(e)}),this.register(function(e){return new Yp(e)}),this.register(function(e){return new Xp(e)}),this.register(function(e){return new Zp(e)})}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,n,r){let i=new Rp,a=[];for(let e=0,t=this.pluginCallbacks.length;e<t;e++)a.push(this.pluginCallbacks[e](i));i.setPlugins(a),i.write(e,t,r).catch(n)}parseAsync(e,t){let n=this;return new Promise(function(r,i){n.parse(e,r,i,t)})}},Y={POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6,BYTE:5120,UNSIGNED_BYTE:5121,SHORT:5122,UNSIGNED_SHORT:5123,INT:5124,UNSIGNED_INT:5125,FLOAT:5126,ARRAY_BUFFER:34962,ELEMENT_ARRAY_BUFFER:34963,NEAREST:9728,LINEAR:9729,NEAREST_MIPMAP_NEAREST:9984,LINEAR_MIPMAP_NEAREST:9985,NEAREST_MIPMAP_LINEAR:9986,LINEAR_MIPMAP_LINEAR:9987,CLAMP_TO_EDGE:33071,MIRRORED_REPEAT:33648,REPEAT:10497},bp=`KHR_mesh_quantization`,xp={};xp[c]=Y.NEAREST,xp[l]=Y.NEAREST_MIPMAP_NEAREST,xp[u]=Y.NEAREST_MIPMAP_LINEAR,xp[d]=Y.LINEAR,xp[f]=Y.LINEAR_MIPMAP_NEAREST,xp[p]=Y.LINEAR_MIPMAP_LINEAR,xp[o]=Y.CLAMP_TO_EDGE,xp[a]=Y.REPEAT,xp[s]=Y.MIRRORED_REPEAT;var Sp={scale:`scale`,position:`translation`,quaternion:`rotation`,morphTargetInfluences:`weights`},Cp=new G,wp=12,Tp=1179937895,Ep=2,Dp=8,Op=1313821514,kp=5130562;function Ap(e,t){return e.length===t.length&&e.every(function(e,n){return e===t[n]})}function jp(e){return new TextEncoder().encode(e).buffer}function Mp(e){return Ap(e.elements,[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1])}function Np(e,t,n){let r={min:Array(e.itemSize).fill(1/0),max:Array(e.itemSize).fill(-1/0)};for(let i=t;i<t+n;i++)for(let t=0;t<e.itemSize;t++){let n;e.itemSize>4?n=e.array[i*e.itemSize+t]:(t===0?n=e.getX(i):t===1?n=e.getY(i):t===2?n=e.getZ(i):t===3&&(n=e.getW(i)),e.normalized===!0&&(n=qe.normalize(n,e.array))),r.min[t]=Math.min(r.min[t],n),r.max[t]=Math.max(r.max[t],n)}return r}function Pp(e){return Math.ceil(e/4)*4}function Fp(e,t=0){let n=Pp(e.byteLength);if(n!==e.byteLength){let r=new Uint8Array(n);if(r.set(new Uint8Array(e)),t!==0)for(let i=e.byteLength;i<n;i++)r[i]=t;return r.buffer}return e}function Ip(){return typeof document>`u`&&typeof OffscreenCanvas<`u`?new OffscreenCanvas(1,1):document.createElement(`canvas`)}function Lp(e,t){if(e.toBlob!==void 0)return new Promise(n=>e.toBlob(n,t));let n;return t===`image/jpeg`?n=.92:t===`image/webp`&&(n=.8),e.convertToBlob({type:t,quality:n})}var Rp=class{constructor(){this.plugins=[],this.options={},this.pending=[],this.buffers=[],this.byteOffset=0,this.buffers=[],this.nodeMap=new Map,this.skins=[],this.extensionsUsed={},this.extensionsRequired={},this.uids=new Map,this.uid=0,this.json={asset:{version:`2.0`,generator:`THREE.GLTFExporter`}},this.cache={meshes:new Map,attributes:new Map,attributesNormalized:new Map,materials:new Map,textures:new Map,images:new Map}}setPlugins(e){this.plugins=e}async write(e,t,n={}){this.options=Object.assign({binary:!1,trs:!1,onlyVisible:!0,maxTextureSize:1/0,animations:[],includeCustomExtensions:!1},n),this.options.animations.length>0&&(this.options.trs=!0),this.processInput(e),await Promise.all(this.pending);let r=this,i=r.buffers,a=r.json;n=r.options;let o=r.extensionsUsed,s=r.extensionsRequired,c=new Blob(i,{type:`application/octet-stream`}),l=Object.keys(o),u=Object.keys(s);if(l.length>0&&(a.extensionsUsed=l),u.length>0&&(a.extensionsRequired=u),a.buffers&&a.buffers.length>0&&(a.buffers[0].byteLength=c.size),n.binary===!0){let e=new FileReader;e.readAsArrayBuffer(c),e.onloadend=function(){let n=Fp(e.result),r=new DataView(new ArrayBuffer(Dp));r.setUint32(0,n.byteLength,!0),r.setUint32(4,kp,!0);let i=Fp(jp(JSON.stringify(a)),32),o=new DataView(new ArrayBuffer(Dp));o.setUint32(0,i.byteLength,!0),o.setUint32(4,Op,!0);let s=new ArrayBuffer(wp),c=new DataView(s);c.setUint32(0,Tp,!0),c.setUint32(4,Ep,!0);let l=wp+o.byteLength+i.byteLength+r.byteLength+n.byteLength;c.setUint32(8,l,!0);let u=new Blob([s,o,i,r,n],{type:`application/octet-stream`}),d=new FileReader;d.readAsArrayBuffer(u),d.onloadend=function(){t(d.result)}}}else if(a.buffers&&a.buffers.length>0){let e=new FileReader;e.readAsDataURL(c),e.onloadend=function(){let n=e.result;a.buffers[0].uri=n,t(a)}}else t(a)}serializeUserData(e,t){if(Object.keys(e.userData).length===0)return;let n=this.options,r=this.extensionsUsed;try{let i=JSON.parse(JSON.stringify(e.userData));if(n.includeCustomExtensions&&i.gltfExtensions){t.extensions===void 0&&(t.extensions={});for(let e in i.gltfExtensions)t.extensions[e]=i.gltfExtensions[e],r[e]=!0;delete i.gltfExtensions}Object.keys(i).length>0&&(t.extras=i)}catch(t){console.warn(`THREE.GLTFExporter: userData of '`+e.name+`' won't be serialized because of JSON.stringify error - `+t.message)}}getUID(e,t=!1){if(this.uids.has(e)===!1){let t=new Map;t.set(!0,this.uid++),t.set(!1,this.uid++),this.uids.set(e,t)}return this.uids.get(e).get(t)}isNormalizedNormalAttribute(e){if(this.cache.attributesNormalized.has(e))return!1;let t=new U;for(let n=0,r=e.count;n<r;n++)if(Math.abs(t.fromBufferAttribute(e,n).length()-1)>5e-4)return!1;return!0}createNormalizedNormalAttribute(e){let t=this.cache;if(t.attributesNormalized.has(e))return t.attributesNormalized.get(e);let n=e.clone(),r=new U;for(let e=0,t=n.count;e<t;e++)r.fromBufferAttribute(n,e),r.x===0&&r.y===0&&r.z===0?r.setX(1):r.normalize(),n.setXYZ(e,r.x,r.y,r.z);return t.attributesNormalized.set(e,n),n}applyTextureTransform(e,t){let n=!1,r={};(t.offset.x!==0||t.offset.y!==0)&&(r.offset=t.offset.toArray(),n=!0),t.rotation!==0&&(r.rotation=t.rotation,n=!0),(t.repeat.x!==1||t.repeat.y!==1)&&(r.scale=t.repeat.toArray(),n=!0),n&&(e.extensions=e.extensions||{},e.extensions.KHR_texture_transform=r,this.extensionsUsed.KHR_texture_transform=!0)}buildMetalRoughTexture(e,t){if(e===t)return e;function n(e){return e.colorSpace===`srgb`?function(e){return e<.04045?e*.0773993808:(e*.9478672986+.0521327014)**2.4}:function(e){return e}}console.warn(`THREE.GLTFExporter: Merged metalnessMap and roughnessMap textures.`),e instanceof $s&&(e=_p(e)),t instanceof $s&&(t=_p(t));let r=e?e.image:null,i=t?t.image:null,a=Math.max(r?r.width:0,i?i.width:0),o=Math.max(r?r.height:0,i?i.height:0),s=Ip();s.width=a,s.height=o;let c=s.getContext(`2d`);c.fillStyle=`#00ffff`,c.fillRect(0,0,a,o);let l=c.getImageData(0,0,a,o);if(r){c.drawImage(r,0,0,a,o);let t=n(e),i=c.getImageData(0,0,a,o).data;for(let e=2;e<i.length;e+=4)l.data[e]=t(i[e]/256)*256}if(i){c.drawImage(i,0,0,a,o);let e=n(t),r=c.getImageData(0,0,a,o).data;for(let t=1;t<r.length;t+=4)l.data[t]=e(r[t]/256)*256}c.putImageData(l,0,0);let u=(e||t).clone();return u.source=new ut(s),u.colorSpace=``,u.channel=(e||t).channel,e&&t&&e.channel!==t.channel&&console.warn(`THREE.GLTFExporter: UV channels for metalnessMap and roughnessMap textures must match.`),u}processBuffer(e){let t=this.json,n=this.buffers;return t.buffers||=[{byteLength:0}],n.push(e),0}processBufferView(e,t,n,r,i){let a=this.json;a.bufferViews||=[];let o;switch(t){case Y.BYTE:case Y.UNSIGNED_BYTE:o=1;break;case Y.SHORT:case Y.UNSIGNED_SHORT:o=2;break;default:o=4}let s=e.itemSize*o;i===Y.ARRAY_BUFFER&&(s=Math.ceil(s/4)*4);let c=Pp(r*s),l=new DataView(new ArrayBuffer(c)),u=0;for(let i=n;i<n+r;i++){for(let n=0;n<e.itemSize;n++){let r;e.itemSize>4?r=e.array[i*e.itemSize+n]:(n===0?r=e.getX(i):n===1?r=e.getY(i):n===2?r=e.getZ(i):n===3&&(r=e.getW(i)),e.normalized===!0&&(r=qe.normalize(r,e.array))),t===Y.FLOAT?l.setFloat32(u,r,!0):t===Y.INT?l.setInt32(u,r,!0):t===Y.UNSIGNED_INT?l.setUint32(u,r,!0):t===Y.SHORT?l.setInt16(u,r,!0):t===Y.UNSIGNED_SHORT?l.setUint16(u,r,!0):t===Y.BYTE?l.setInt8(u,r):t===Y.UNSIGNED_BYTE&&l.setUint8(u,r),u+=o}u%s!==0&&(u+=s-u%s)}let d={buffer:this.processBuffer(l.buffer),byteOffset:this.byteOffset,byteLength:c};return i!==void 0&&(d.target=i),i===Y.ARRAY_BUFFER&&(d.byteStride=s),this.byteOffset+=c,a.bufferViews.push(d),{id:a.bufferViews.length-1,byteLength:0}}processBufferViewImage(e){let t=this,n=t.json;return n.bufferViews||=[],new Promise(function(r){let i=new FileReader;i.readAsArrayBuffer(e),i.onloadend=function(){let e=Fp(i.result),a={buffer:t.processBuffer(e),byteOffset:t.byteOffset,byteLength:e.byteLength};t.byteOffset+=e.byteLength,r(n.bufferViews.push(a)-1)}})}processAccessor(e,t,n,r){let i=this.json,a={1:`SCALAR`,2:`VEC2`,3:`VEC3`,4:`VEC4`,9:`MAT3`,16:`MAT4`},o;if(e.array.constructor===Float32Array)o=Y.FLOAT;else if(e.array.constructor===Int32Array)o=Y.INT;else if(e.array.constructor===Uint32Array)o=Y.UNSIGNED_INT;else if(e.array.constructor===Int16Array)o=Y.SHORT;else if(e.array.constructor===Uint16Array)o=Y.UNSIGNED_SHORT;else if(e.array.constructor===Int8Array)o=Y.BYTE;else if(e.array.constructor===Uint8Array)o=Y.UNSIGNED_BYTE;else throw Error(`THREE.GLTFExporter: Unsupported bufferAttribute component type: `+e.array.constructor.name);if(n===void 0&&(n=0),(r===void 0||r===1/0)&&(r=e.count),r===0)return null;let s=Np(e,n,r),c;t!==void 0&&(c=e===t.index?Y.ELEMENT_ARRAY_BUFFER:Y.ARRAY_BUFFER);let l=this.processBufferView(e,o,n,r,c),u={bufferView:l.id,byteOffset:l.byteOffset,componentType:o,count:r,max:s.max,min:s.min,type:a[e.itemSize]};return e.normalized===!0&&(u.normalized=!0),i.accessors||=[],i.accessors.push(u)-1}processImage(e,t,n,r=`image/png`){if(e!==null){let i=this,a=i.cache,o=i.json,s=i.options,c=i.pending;a.images.has(e)||a.images.set(e,{});let l=a.images.get(e),u=r+`:flipY/`+n.toString();if(l[u]!==void 0)return l[u];o.images||=[];let d={mimeType:r},f=Ip();f.width=Math.min(e.width,s.maxTextureSize),f.height=Math.min(e.height,s.maxTextureSize);let p=f.getContext(`2d`);if(n===!0&&(p.translate(0,f.height),p.scale(1,-1)),e.data!==void 0){t!==1023&&console.error(`GLTFExporter: Only RGBAFormat is supported.`,t),(e.width>s.maxTextureSize||e.height>s.maxTextureSize)&&console.warn(`GLTFExporter: Image size is bigger than maxTextureSize`,e);let n=new Uint8ClampedArray(e.height*e.width*4);for(let t=0;t<n.length;t+=4)n[t+0]=e.data[t+0],n[t+1]=e.data[t+1],n[t+2]=e.data[t+2],n[t+3]=e.data[t+3];p.putImageData(new ImageData(n,e.width,e.height),0,0)}else if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof ImageBitmap<`u`&&e instanceof ImageBitmap||typeof OffscreenCanvas<`u`&&e instanceof OffscreenCanvas)p.drawImage(e,0,0,f.width,f.height);else throw Error(`THREE.GLTFExporter: Invalid image type. Use HTMLImageElement, HTMLCanvasElement, ImageBitmap or OffscreenCanvas.`);s.binary===!0?c.push(Lp(f,r).then(e=>i.processBufferViewImage(e)).then(e=>{d.bufferView=e})):f.toDataURL===void 0?c.push(Lp(f,r).then(e=>new FileReader().readAsDataURL(e)).then(e=>{d.uri=e})):d.uri=f.toDataURL(r);let m=o.images.push(d)-1;return l[u]=m,m}throw Error(`THREE.GLTFExporter: No valid image data found. Unable to process texture.`)}processSampler(e){let t=this.json;t.samplers||=[];let n={magFilter:xp[e.magFilter],minFilter:xp[e.minFilter],wrapS:xp[e.wrapS],wrapT:xp[e.wrapT]};return t.samplers.push(n)-1}processTexture(e){let t=this.options,n=this.cache,r=this.json;if(n.textures.has(e))return n.textures.get(e);r.textures||=[],e instanceof $s&&(e=_p(e,t.maxTextureSize));let i=e.userData.mimeType;i===`image/webp`&&(i=`image/png`);let a={sampler:this.processSampler(e),source:this.processImage(e.image,e.format,e.flipY,i)};e.name&&(a.name=e.name),this._invokeAll(function(t){t.writeTexture&&t.writeTexture(e,a)});let o=r.textures.push(a)-1;return n.textures.set(e,o),o}processMaterial(e){let t=this.cache,n=this.json;if(t.materials.has(e))return t.materials.get(e);if(e.isShaderMaterial)return console.warn(`GLTFExporter: THREE.ShaderMaterial not supported.`),null;n.materials||=[];let r={pbrMetallicRoughness:{}};e.isMeshStandardMaterial!==!0&&e.isMeshBasicMaterial!==!0&&console.warn(`GLTFExporter: Use MeshStandardMaterial or MeshBasicMaterial for best results.`);let i=e.color.toArray().concat([e.opacity]);if(Ap(i,[1,1,1,1])||(r.pbrMetallicRoughness.baseColorFactor=i),e.isMeshStandardMaterial?(r.pbrMetallicRoughness.metallicFactor=e.metalness,r.pbrMetallicRoughness.roughnessFactor=e.roughness):(r.pbrMetallicRoughness.metallicFactor=.5,r.pbrMetallicRoughness.roughnessFactor=.5),e.metalnessMap||e.roughnessMap){let t=this.buildMetalRoughTexture(e.metalnessMap,e.roughnessMap),n={index:this.processTexture(t),channel:t.channel};this.applyTextureTransform(n,t),r.pbrMetallicRoughness.metallicRoughnessTexture=n}if(e.map){let t={index:this.processTexture(e.map),texCoord:e.map.channel};this.applyTextureTransform(t,e.map),r.pbrMetallicRoughness.baseColorTexture=t}if(e.emissive){let t=e.emissive;if(Math.max(t.r,t.g,t.b)>0&&(r.emissiveFactor=e.emissive.toArray()),e.emissiveMap){let t={index:this.processTexture(e.emissiveMap),texCoord:e.emissiveMap.channel};this.applyTextureTransform(t,e.emissiveMap),r.emissiveTexture=t}}if(e.normalMap){let t={index:this.processTexture(e.normalMap),texCoord:e.normalMap.channel};e.normalScale&&e.normalScale.x!==1&&(t.scale=e.normalScale.x),this.applyTextureTransform(t,e.normalMap),r.normalTexture=t}if(e.aoMap){let t={index:this.processTexture(e.aoMap),texCoord:e.aoMap.channel};e.aoMapIntensity!==1&&(t.strength=e.aoMapIntensity),this.applyTextureTransform(t,e.aoMap),r.occlusionTexture=t}e.transparent?r.alphaMode=`BLEND`:e.alphaTest>0&&(r.alphaMode=`MASK`,r.alphaCutoff=e.alphaTest),e.side===2&&(r.doubleSided=!0),e.name!==``&&(r.name=e.name),this.serializeUserData(e,r),this._invokeAll(function(t){t.writeMaterial&&t.writeMaterial(e,r)});let a=n.materials.push(r)-1;return t.materials.set(e,a),a}processMesh(e){let t=this.cache,n=this.json,r=[e.geometry.uuid];if(Array.isArray(e.material))for(let t=0,n=e.material.length;t<n;t++)r.push(e.material[t].uuid);else r.push(e.material.uuid);let i=r.join(`:`);if(t.meshes.has(i))return t.meshes.get(i);let a=e.geometry,o;o=e.isLineSegments?Y.LINES:e.isLineLoop?Y.LINE_LOOP:e.isLine?Y.LINE_STRIP:e.isPoints?Y.POINTS:e.material.wireframe?Y.LINES:Y.TRIANGLES;let s={},c={},l=[],u=[],d={uv:`TEXCOORD_0`,uv1:`TEXCOORD_1`,uv2:`TEXCOORD_2`,uv3:`TEXCOORD_3`,color:`COLOR_0`,skinWeight:`WEIGHTS_0`,skinIndex:`JOINTS_0`},f=a.getAttribute(`normal`);f!==void 0&&!this.isNormalizedNormalAttribute(f)&&(console.warn(`THREE.GLTFExporter: Creating normalized normal attribute from the non-normalized one.`),a.setAttribute(`normal`,this.createNormalizedNormalAttribute(f)));let p=null;for(let e in a.attributes){if(e.slice(0,5)===`morph`)continue;let n=a.attributes[e];if(e=d[e]||e.toUpperCase(),/^(POSITION|NORMAL|TANGENT|TEXCOORD_\d+|COLOR_\d+|JOINTS_\d+|WEIGHTS_\d+)$/.test(e)||(e=`_`+e),t.attributes.has(this.getUID(n))){c[e]=t.attributes.get(this.getUID(n));continue}p=null;let r=n.array;e===`JOINTS_0`&&!(r instanceof Uint16Array)&&!(r instanceof Uint8Array)&&(console.warn(`GLTFExporter: Attribute "skinIndex" converted to type UNSIGNED_SHORT.`),p=new Yn(new Uint16Array(r),n.itemSize,n.normalized));let i=this.processAccessor(p||n,a);i!==null&&(e.startsWith(`_`)||this.detectMeshQuantization(e,n),c[e]=i,t.attributes.set(this.getUID(n),i))}if(f!==void 0&&a.setAttribute(`normal`,f),Object.keys(c).length===0)return null;if(e.morphTargetInfluences!==void 0&&e.morphTargetInfluences.length>0){let n=[],r=[],i={};if(e.morphTargetDictionary!==void 0)for(let t in e.morphTargetDictionary)i[e.morphTargetDictionary[t]]=t;for(let o=0;o<e.morphTargetInfluences.length;++o){let s={},c=!1;for(let e in a.morphAttributes){if(e!==`position`&&e!==`normal`){c||=(console.warn(`GLTFExporter: Only POSITION and NORMAL morph are supported.`),!0);continue}let n=a.morphAttributes[e][o],r=e.toUpperCase(),i=a.attributes[e];if(t.attributes.has(this.getUID(n,!0))){s[r]=t.attributes.get(this.getUID(n,!0));continue}let l=n.clone();if(!a.morphTargetsRelative)for(let e=0,t=n.count;e<t;e++)for(let t=0;t<n.itemSize;t++)t===0&&l.setX(e,n.getX(e)-i.getX(e)),t===1&&l.setY(e,n.getY(e)-i.getY(e)),t===2&&l.setZ(e,n.getZ(e)-i.getZ(e)),t===3&&l.setW(e,n.getW(e)-i.getW(e));s[r]=this.processAccessor(l,a),t.attributes.set(this.getUID(i,!0),s[r])}u.push(s),n.push(e.morphTargetInfluences[o]),e.morphTargetDictionary!==void 0&&r.push(i[o])}s.weights=n,r.length>0&&(s.extras={},s.extras.targetNames=r)}let m=Array.isArray(e.material);if(m&&a.groups.length===0)return null;let h=!1;if(m&&a.index===null){let e=[];for(let t=0,n=a.attributes.position.count;t<n;t++)e[t]=t;a.setIndex(e),h=!0}let g=m?e.material:[e.material],_=m?a.groups:[{materialIndex:0,start:void 0,count:void 0}];for(let e=0,n=_.length;e<n;e++){let n={mode:o,attributes:c};if(this.serializeUserData(a,n),u.length>0&&(n.targets=u),a.index!==null){let r=this.getUID(a.index);(_[e].start!==void 0||_[e].count!==void 0)&&(r+=`:`+_[e].start+`:`+_[e].count),t.attributes.has(r)?n.indices=t.attributes.get(r):(n.indices=this.processAccessor(a.index,a,_[e].start,_[e].count),t.attributes.set(r,n.indices)),n.indices===null&&delete n.indices}let r=this.processMaterial(g[_[e].materialIndex]);r!==null&&(n.material=r),l.push(n)}h===!0&&a.setIndex(null),s.primitives=l,n.meshes||=[],this._invokeAll(function(t){t.writeMesh&&t.writeMesh(e,s)});let v=n.meshes.push(s)-1;return t.meshes.set(i,v),v}detectMeshQuantization(e,t){if(this.extensionsUsed[bp])return;let n;switch(t.array.constructor){case Int8Array:n=`byte`;break;case Uint8Array:n=`unsigned byte`;break;case Int16Array:n=`short`;break;case Uint16Array:n=`unsigned short`;break;default:return}t.normalized&&(n+=` normalized`);let r=e.split(`_`,1)[0];vp[r]&&vp[r].includes(n)&&(this.extensionsUsed[bp]=!0,this.extensionsRequired[bp]=!0)}processCamera(e){let t=this.json;t.cameras||=[];let n=e.isOrthographicCamera,r={type:n?`orthographic`:`perspective`};return n?r.orthographic={xmag:e.right*2,ymag:e.top*2,zfar:e.far<=0?.001:e.far,znear:e.near<0?0:e.near}:r.perspective={aspectRatio:e.aspect,yfov:qe.degToRad(e.fov),zfar:e.far<=0?.001:e.far,znear:e.near<0?0:e.near},e.name!==``&&(r.name=e.type),t.cameras.push(r)-1}processAnimation(e,t){let n=this.json,r=this.nodeMap;n.animations||=[],e=yp.Utils.mergeMorphTargetTracks(e.clone(),t);let i=e.tracks,a=[],o=[];for(let e=0;e<i.length;++e){let n=i[e],s=fl.parseTrackName(n.name),c=fl.findNode(t,s.nodeName),l=Sp[s.propertyName];if(s.objectName===`bones`&&(c=c.isSkinnedMesh===!0?c.skeleton.getBoneByName(s.objectIndex):void 0),!c||!l)return console.warn(`THREE.GLTFExporter: Could not export animation track "%s".`,n.name),null;let u=n.values.length/n.times.length;l===Sp.morphTargetInfluences&&(u/=c.morphTargetInfluences.length);let d;n.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline===!0?(d=`CUBICSPLINE`,u/=3):d=n.getInterpolation()===2300?`STEP`:`LINEAR`,o.push({input:this.processAccessor(new Yn(n.times,1)),output:this.processAccessor(new Yn(n.values,u)),interpolation:d}),a.push({sampler:o.length-1,target:{node:r.get(c),path:l}})}return n.animations.push({name:e.name||`clip_`+n.animations.length,samplers:o,channels:a}),n.animations.length-1}processSkin(e){let t=this.json,n=this.nodeMap,r=t.nodes[n.get(e)],i=e.skeleton;if(i===void 0)return null;let a=e.skeleton.bones[0];if(a===void 0)return null;let o=[],s=new Float32Array(i.bones.length*16),c=new W;for(let t=0;t<i.bones.length;++t)o.push(n.get(i.bones[t])),c.copy(i.boneInverses[t]),c.multiply(e.bindMatrix).toArray(s,t*16);return t.skins===void 0&&(t.skins=[]),t.skins.push({inverseBindMatrices:this.processAccessor(new Yn(s,16)),joints:o,skeleton:n.get(a)}),r.skin=t.skins.length-1}processNode(e){let t=this.json,n=this.options,r=this.nodeMap;t.nodes||=[];let i={};if(n.trs){let t=e.quaternion.toArray(),n=e.position.toArray(),r=e.scale.toArray();Ap(t,[0,0,0,1])||(i.rotation=t),Ap(n,[0,0,0])||(i.translation=n),Ap(r,[1,1,1])||(i.scale=r)}else e.matrixAutoUpdate&&e.updateMatrix(),Mp(e.matrix)===!1&&(i.matrix=e.matrix.elements);if(e.name!==``&&(i.name=String(e.name)),this.serializeUserData(e,i),e.isMesh||e.isLine||e.isPoints){let t=this.processMesh(e);t!==null&&(i.mesh=t)}else e.isCamera&&(i.camera=this.processCamera(e));if(e.isSkinnedMesh&&this.skins.push(e),e.children.length>0){let t=[];for(let r=0,i=e.children.length;r<i;r++){let i=e.children[r];if(i.visible||n.onlyVisible===!1){let e=this.processNode(i);e!==null&&t.push(e)}}t.length>0&&(i.children=t)}this._invokeAll(function(t){t.writeNode&&t.writeNode(e,i)});let a=t.nodes.push(i)-1;return r.set(e,a),a}processScene(e){let t=this.json,n=this.options;t.scenes||(t.scenes=[],t.scene=0);let r={};e.name!==``&&(r.name=e.name),t.scenes.push(r);let i=[];for(let t=0,r=e.children.length;t<r;t++){let r=e.children[t];if(r.visible||n.onlyVisible===!1){let e=this.processNode(r);e!==null&&i.push(e)}}i.length>0&&(r.nodes=i),this.serializeUserData(e,r)}processObjects(e){let t=new os;t.name=`AuxScene`;for(let n=0;n<e.length;n++)t.children.push(e[n]);this.processScene(t)}processInput(e){let t=this.options;e=e instanceof Array?e:[e],this._invokeAll(function(t){t.beforeParse&&t.beforeParse(e)});let n=[];for(let t=0;t<e.length;t++)e[t]instanceof os?this.processScene(e[t]):n.push(e[t]);n.length>0&&this.processObjects(n);for(let e=0;e<this.skins.length;++e)this.processSkin(this.skins[e]);for(let n=0;n<t.animations.length;++n)this.processAnimation(t.animations[n],e[0]);this._invokeAll(function(t){t.afterParse&&t.afterParse(e)})}_invokeAll(e){for(let t=0,n=this.plugins.length;t<n;t++)e(this.plugins[t])}},zp=class{constructor(e){this.writer=e,this.name=`KHR_lights_punctual`}writeNode(e,t){if(!e.isLight)return;if(!e.isDirectionalLight&&!e.isPointLight&&!e.isSpotLight){console.warn(`THREE.GLTFExporter: Only directional, point, and spot lights are supported.`,e);return}let n=this.writer,r=n.json,i=n.extensionsUsed,a={};e.name&&(a.name=e.name),a.color=e.color.toArray(),a.intensity=e.intensity,e.isDirectionalLight?a.type=`directional`:e.isPointLight?(a.type=`point`,e.distance>0&&(a.range=e.distance)):e.isSpotLight&&(a.type=`spot`,e.distance>0&&(a.range=e.distance),a.spot={},a.spot.innerConeAngle=(1-e.penumbra)*e.angle,a.spot.outerConeAngle=e.angle),e.decay!==void 0&&e.decay!==2&&console.warn(`THREE.GLTFExporter: Light decay may be lost. glTF is physically-based, and expects light.decay=2.`),e.target&&(e.target.parent!==e||e.target.position.x!==0||e.target.position.y!==0||e.target.position.z!==-1)&&console.warn(`THREE.GLTFExporter: Light direction may be lost. For best results, make light.target a child of the light with position 0,0,-1.`),i[this.name]||(r.extensions=r.extensions||{},r.extensions[this.name]={lights:[]},i[this.name]=!0);let o=r.extensions[this.name].lights;o.push(a),t.extensions=t.extensions||{},t.extensions[this.name]={light:o.length-1}}},Bp=class{constructor(e){this.writer=e,this.name=`KHR_materials_unlit`}writeMaterial(e,t){if(!e.isMeshBasicMaterial)return;let n=this.writer.extensionsUsed;t.extensions=t.extensions||{},t.extensions[this.name]={},n[this.name]=!0,t.pbrMetallicRoughness.metallicFactor=0,t.pbrMetallicRoughness.roughnessFactor=.9}},Vp=class{constructor(e){this.writer=e,this.name=`KHR_materials_clearcoat`}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.clearcoat===0)return;let n=this.writer,r=n.extensionsUsed,i={};if(i.clearcoatFactor=e.clearcoat,e.clearcoatMap){let t={index:n.processTexture(e.clearcoatMap),texCoord:e.clearcoatMap.channel};n.applyTextureTransform(t,e.clearcoatMap),i.clearcoatTexture=t}if(i.clearcoatRoughnessFactor=e.clearcoatRoughness,e.clearcoatRoughnessMap){let t={index:n.processTexture(e.clearcoatRoughnessMap),texCoord:e.clearcoatRoughnessMap.channel};n.applyTextureTransform(t,e.clearcoatRoughnessMap),i.clearcoatRoughnessTexture=t}if(e.clearcoatNormalMap){let t={index:n.processTexture(e.clearcoatNormalMap),texCoord:e.clearcoatNormalMap.channel};n.applyTextureTransform(t,e.clearcoatNormalMap),i.clearcoatNormalTexture=t}t.extensions=t.extensions||{},t.extensions[this.name]=i,r[this.name]=!0}},Hp=class{constructor(e){this.writer=e,this.name=`KHR_materials_iridescence`}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.iridescence===0)return;let n=this.writer,r=n.extensionsUsed,i={};if(i.iridescenceFactor=e.iridescence,e.iridescenceMap){let t={index:n.processTexture(e.iridescenceMap),texCoord:e.iridescenceMap.channel};n.applyTextureTransform(t,e.iridescenceMap),i.iridescenceTexture=t}if(i.iridescenceIor=e.iridescenceIOR,i.iridescenceThicknessMinimum=e.iridescenceThicknessRange[0],i.iridescenceThicknessMaximum=e.iridescenceThicknessRange[1],e.iridescenceThicknessMap){let t={index:n.processTexture(e.iridescenceThicknessMap),texCoord:e.iridescenceThicknessMap.channel};n.applyTextureTransform(t,e.iridescenceThicknessMap),i.iridescenceThicknessTexture=t}t.extensions=t.extensions||{},t.extensions[this.name]=i,r[this.name]=!0}},Up=class{constructor(e){this.writer=e,this.name=`KHR_materials_transmission`}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.transmission===0)return;let n=this.writer,r=n.extensionsUsed,i={};if(i.transmissionFactor=e.transmission,e.transmissionMap){let t={index:n.processTexture(e.transmissionMap),texCoord:e.transmissionMap.channel};n.applyTextureTransform(t,e.transmissionMap),i.transmissionTexture=t}t.extensions=t.extensions||{},t.extensions[this.name]=i,r[this.name]=!0}},Wp=class{constructor(e){this.writer=e,this.name=`KHR_materials_volume`}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.transmission===0)return;let n=this.writer,r=n.extensionsUsed,i={};if(i.thicknessFactor=e.thickness,e.thicknessMap){let t={index:n.processTexture(e.thicknessMap),texCoord:e.thicknessMap.channel};n.applyTextureTransform(t,e.thicknessMap),i.thicknessTexture=t}i.attenuationDistance=e.attenuationDistance,i.attenuationColor=e.attenuationColor.toArray(),t.extensions=t.extensions||{},t.extensions[this.name]=i,r[this.name]=!0}},Gp=class{constructor(e){this.writer=e,this.name=`KHR_materials_ior`}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.ior===1.5)return;let n=this.writer.extensionsUsed,r={};r.ior=e.ior,t.extensions=t.extensions||{},t.extensions[this.name]=r,n[this.name]=!0}},Kp=class{constructor(e){this.writer=e,this.name=`KHR_materials_specular`}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.specularIntensity===1&&e.specularColor.equals(Cp)&&!e.specularIntensityMap&&!e.specularColorMap)return;let n=this.writer,r=n.extensionsUsed,i={};if(e.specularIntensityMap){let t={index:n.processTexture(e.specularIntensityMap),texCoord:e.specularIntensityMap.channel};n.applyTextureTransform(t,e.specularIntensityMap),i.specularTexture=t}if(e.specularColorMap){let t={index:n.processTexture(e.specularColorMap),texCoord:e.specularColorMap.channel};n.applyTextureTransform(t,e.specularColorMap),i.specularColorTexture=t}i.specularFactor=e.specularIntensity,i.specularColorFactor=e.specularColor.toArray(),t.extensions=t.extensions||{},t.extensions[this.name]=i,r[this.name]=!0}},qp=class{constructor(e){this.writer=e,this.name=`KHR_materials_sheen`}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.sheen==0)return;let n=this.writer,r=n.extensionsUsed,i={};if(e.sheenRoughnessMap){let t={index:n.processTexture(e.sheenRoughnessMap),texCoord:e.sheenRoughnessMap.channel};n.applyTextureTransform(t,e.sheenRoughnessMap),i.sheenRoughnessTexture=t}if(e.sheenColorMap){let t={index:n.processTexture(e.sheenColorMap),texCoord:e.sheenColorMap.channel};n.applyTextureTransform(t,e.sheenColorMap),i.sheenColorTexture=t}i.sheenRoughnessFactor=e.sheenRoughness,i.sheenColorFactor=e.sheenColor.toArray(),t.extensions=t.extensions||{},t.extensions[this.name]=i,r[this.name]=!0}},Jp=class{constructor(e){this.writer=e,this.name=`KHR_materials_anisotropy`}writeMaterial(e,t){if(!e.isMeshPhysicalMaterial||e.anisotropy==0)return;let n=this.writer,r=n.extensionsUsed,i={};if(e.anisotropyMap){let t={index:n.processTexture(e.anisotropyMap)};n.applyTextureTransform(t,e.anisotropyMap),i.anisotropyTexture=t}i.anisotropyStrength=e.anisotropy,i.anisotropyRotation=e.anisotropyRotation,t.extensions=t.extensions||{},t.extensions[this.name]=i,r[this.name]=!0}},Yp=class{constructor(e){this.writer=e,this.name=`KHR_materials_emissive_strength`}writeMaterial(e,t){if(!e.isMeshStandardMaterial||e.emissiveIntensity===1)return;let n=this.writer.extensionsUsed,r={};r.emissiveStrength=e.emissiveIntensity,t.extensions=t.extensions||{},t.extensions[this.name]=r,n[this.name]=!0}},Xp=class{constructor(e){this.writer=e,this.name=`EXT_materials_bump`}writeMaterial(e,t){if(!e.isMeshStandardMaterial||e.bumpScale===1&&!e.bumpMap)return;let n=this.writer,r=n.extensionsUsed,i={};if(e.bumpMap){let t={index:n.processTexture(e.bumpMap),texCoord:e.bumpMap.channel};n.applyTextureTransform(t,e.bumpMap),i.bumpTexture=t}i.bumpFactor=e.bumpScale,t.extensions=t.extensions||{},t.extensions[this.name]=i,r[this.name]=!0}},Zp=class{constructor(e){this.writer=e,this.name=`EXT_mesh_gpu_instancing`}writeNode(e,t){if(!e.isInstancedMesh)return;let n=this.writer,r=e,i=new Float32Array(r.count*3),a=new Float32Array(r.count*4),o=new Float32Array(r.count*3),s=new W,c=new U,l=new yt,u=new U;for(let e=0;e<r.count;e++)r.getMatrixAt(e,s),s.decompose(c,l,u),c.toArray(i,e*3),l.toArray(a,e*4),u.toArray(o,e*3);let d={TRANSLATION:n.processAccessor(new Yn(i,3)),ROTATION:n.processAccessor(new Yn(a,4)),SCALE:n.processAccessor(new Yn(o,3))};r.instanceColor&&(d._COLOR_0=n.processAccessor(r.instanceColor)),t.extensions=t.extensions||{},t.extensions[this.name]={attributes:d},n.extensionsUsed[this.name]=!0,n.extensionsRequired[this.name]=!0}};yp.Utils={insertKeyframe:function(e,t){let n=.001,r=e.getValueSize(),i=new e.TimeBufferType(e.times.length+1),a=new e.ValueBufferType(e.values.length+r),o=e.createInterpolant(new e.ValueBufferType(r)),s;if(e.times.length===0){i[0]=t;for(let e=0;e<r;e++)a[e]=0;s=0}else if(t<e.times[0]){if(Math.abs(e.times[0]-t)<n)return 0;i[0]=t,i.set(e.times,1),a.set(o.evaluate(t),0),a.set(e.values,r),s=0}else if(t>e.times[e.times.length-1]){if(Math.abs(e.times[e.times.length-1]-t)<n)return e.times.length-1;i[i.length-1]=t,i.set(e.times,0),a.set(e.values,0),a.set(o.evaluate(t),e.values.length),s=i.length-1}else for(let c=0;c<e.times.length;c++){if(Math.abs(e.times[c]-t)<n)return c;if(e.times[c]<t&&e.times[c+1]>t){i.set(e.times.slice(0,c+1),0),i[c+1]=t,i.set(e.times.slice(c+1),c+2),a.set(e.values.slice(0,(c+1)*r),0),a.set(o.evaluate(t),(c+1)*r),a.set(e.values.slice((c+1)*r),(c+2)*r),s=c+1;break}}return e.times=i,e.values=a,s},mergeMorphTargetTracks:function(e,t){let n=[],r={},i=e.tracks;for(let e=0;e<i.length;++e){let a=i[e],o=fl.parseTrackName(a.name),s=fl.findNode(t,o.nodeName);if(o.propertyName!==`morphTargetInfluences`||o.propertyIndex===void 0){n.push(a);continue}if(a.createInterpolant!==a.InterpolantFactoryMethodDiscrete&&a.createInterpolant!==a.InterpolantFactoryMethodLinear){if(a.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline)throw Error(`THREE.GLTFExporter: Cannot merge tracks with glTF CUBICSPLINE interpolation.`);console.warn(`THREE.GLTFExporter: Morph target interpolation mode not yet supported. Using LINEAR instead.`),a=a.clone(),a.setInterpolation(I)}let c=s.morphTargetInfluences.length,l=s.morphTargetDictionary[o.propertyIndex];if(l===void 0)throw Error(`THREE.GLTFExporter: Morph target name not found: `+o.propertyIndex);let u;if(r[s.uuid]===void 0){u=a.clone();let e=new u.ValueBufferType(c*u.times.length);for(let t=0;t<u.times.length;t++)e[t*c+l]=u.values[t];u.name=(o.nodeName||``)+`.morphTargetInfluences`,u.values=e,r[s.uuid]=u,n.push(u);continue}let d=a.createInterpolant(new a.ValueBufferType(1));u=r[s.uuid];for(let e=0;e<u.times.length;e++)u.values[e*c+l]=d.evaluate(u.times[e]);for(let e=0;e<a.times.length;e++){let t=this.insertKeyframe(u,a.times[e]);u.values[t*c+l]=a.values[e]}}return e.tracks=n,e}};var Qp=e=>e.material!==void 0&&e.userData&&e.userData.variantMaterials&&!!Array.from(e.userData.variantMaterials.values()).filter(e=>$p(e.material)),$p=e=>e&&e.isMaterial&&!Array.isArray(e),em=class{constructor(e){this.writer=e,this.name=`KHR_materials_variants`,this.variantNames=[]}beforeParse(e){let t=new Set;for(let n of e)n.traverse(e=>{if(!Qp(e))return;let n=e.userData.variantMaterials,r=e.userData.variantData;for(let[e,i]of r){let r=n.get(i.index);r&&$p(r.material)&&t.add(e)}});t.forEach(e=>this.variantNames.push(e))}writeMesh(e,t){if(!Qp(e))return;let n=e.userData,r=n.variantMaterials,i=n.variantData,a=new Map,o=new Map,s=Array.from(i.values()).sort((e,t)=>e.index-t.index);for(let[e,t]of s.entries())o.set(t.index,e);for(let e of i.values()){let t=r.get(e.index);if(!t||!$p(t.material))continue;let n=this.writer.processMaterial(t.material);a.has(n)||a.set(n,{material:n,variants:[]}),a.get(n).variants.push(o.get(e.index))}let c=Array.from(a.values()).map((e=>e.variants.sort((e,t)=>e-t)&&e)).sort((e,t)=>e.material-t.material);if(c.length===0)return;let l=$p(n.originalMaterial)?this.writer.processMaterial(n.originalMaterial):-1;for(let e of t.primitives)l>=0&&(e.material=l),e.extensions=e.extensions||{},e.extensions[this.name]={mappings:c}}afterParse(){if(this.variantNames.length===0)return;let e=this.writer.json;e.extensions=e.extensions||{};let t=this.variantNames.map(e=>({name:e}));e.extensions[this.name]={variants:t},this.writer.extensionsUsed[this.name]=!0}},tm=class{constructor(e,t,n,r,i){this.xrLight=e,this.renderer=t,this.lightProbe=n,this.xrWebGLBinding=null,this.estimationStartCallback=i,this.frameCallback=this.onXRFrame.bind(this);let a=t.xr.getSession();if(r&&`XRWebGLBinding`in window){e.environment=new Gr(16).texture;let n=t.getContext();switch(a.preferredReflectionFormat){case`srgba8`:n.getExtension(`EXT_sRGB`);break;case`rgba16f`:n.getExtension(`OES_texture_half_float`)}this.xrWebGLBinding=new XRWebGLBinding(a,n),this.lightProbe.addEventListener(`reflectionchange`,()=>{this.updateReflection()})}a.requestAnimationFrame(this.frameCallback)}updateReflection(){let e=this.renderer.properties.get(this.xrLight.environment);if(e){let t=this.xrWebGLBinding.getReflectionCubeMap(this.lightProbe);t&&(e.__webglTexture=t,this.xrLight.environment.needsPMREMUpdate=!0)}}onXRFrame(e,t){if(!this.xrLight)return;t.session.requestAnimationFrame(this.frameCallback);let n=t.getLightEstimate(this.lightProbe);if(n){this.xrLight.lightProbe.sh.fromArray(n.sphericalHarmonicsCoefficients),this.xrLight.lightProbe.intensity=1;let e=Math.max(1,Math.max(n.primaryLightIntensity.x,Math.max(n.primaryLightIntensity.y,n.primaryLightIntensity.z)));this.xrLight.directionalLight.color.setRGB(n.primaryLightIntensity.x/e,n.primaryLightIntensity.y/e,n.primaryLightIntensity.z/e),this.xrLight.directionalLight.intensity=e,this.xrLight.directionalLight.position.copy(n.primaryLightDirection),this.estimationStartCallback&&=(this.estimationStartCallback(),null)}}dispose(){this.xrLight=null,this.renderer=null,this.lightProbe=null,this.xrWebGLBinding=null}},nm=class extends Jo{constructor(e,t=!0){super(),this.lightProbe=new Zc,this.lightProbe.intensity=0,this.add(this.lightProbe),this.directionalLight=new Yc,this.directionalLight.intensity=0,this.add(this.directionalLight),this.environment=null;let n=null,r=!1;e.xr.addEventListener(`sessionstart`,()=>{let i=e.xr.getSession();`requestLightProbe`in i&&i.requestLightProbe({reflectionFormat:i.preferredReflectionFormat}).then(i=>{n=new tm(this,e,i,t,()=>{r=!0,this.dispatchEvent({type:`estimationstart`})})})}),e.xr.addEventListener(`sessionend`,()=>{n&&=(n.dispose(),null),r&&this.dispatchEvent({type:`estimationend`})}),this.dispose=()=>{n&&=(n.dispose(),null),this.remove(this.lightProbe),this.lightProbe=null,this.remove(this.directionalLight),this.directionalLight=null,this.environment=null}}},rm=1e4,im=.001,am=class{constructor(e=50){this.velocity=0,this.naturalFrequency=0,this.setDecayTime(e)}setDecayTime(e){this.naturalFrequency=1/Math.max(im,e)}update(e,t,n,r){let i=2e-4*this.naturalFrequency;if(e==null||r===0||e===t&&this.velocity===0)return t;if(n<0)return e;let a=e-t,o=this.velocity+this.naturalFrequency*a,s=a+n*o,c=Math.exp(-this.naturalFrequency*n),l=(o-this.naturalFrequency*s)*c,u=-this.naturalFrequency*(l+o*c);return Math.abs(l)<i*Math.abs(r)&&u*a>=0?(this.velocity=0,t):(this.velocity=l,t+s*c)}},om=.2,sm=.75,cm=12,lm=Math.PI/24,um=new V,dm=(e,t,n)=>{let r=t>0?n>0?0:-Math.PI/2:n>0?Math.PI/2:Math.PI;for(let i=0;i<=cm;++i)e.push(t+.17*Math.cos(r),n+.17*Math.sin(r),0,t+om*Math.cos(r),n+om*Math.sin(r),0),r+=lm},fm=class extends wr{constructor(e,t){let n=new or,r=[],i=[],{size:a,boundingBox:o}=e,s=a.x/2,c=(t===`back`?a.y:a.z)/2;dm(i,s,c),dm(i,-s,c),dm(i,-s,-c),dm(i,s,-c);let l=i.length/3;for(let e=0;e<l-2;e+=2)r.push(e,e+1,e+3,e,e+3,e+2);let u=l-2;r.push(u,u+1,1,u,1,0),n.setAttribute(`position`,new Qn(i,3)),n.setIndex(r),super(n),this.side=t;let d=this.material;switch(d.side=2,d.transparent=!0,d.opacity=0,this.goalOpacity=0,this.opacityDamper=new am,this.hitPlane=new wr(new ti(2*(s+om),2*(c+om))),this.hitPlane.visible=!1,this.hitPlane.material.side=2,this.add(this.hitPlane),o.getCenter(this.position),t){case`bottom`:this.rotateX(-Math.PI/2),this.shadowHeight=o.min.y,this.position.y=this.shadowHeight;break;case`back`:this.shadowHeight=o.min.z,this.position.z=this.shadowHeight}e.target.add(this),this.offsetHeight=0}getHit(e,t,n){um.set(t,-n),this.hitPlane.visible=!0;let r=e.positionAndNormalFromPoint(um,this.hitPlane);return this.hitPlane.visible=!1,r==null?null:r.position}getExpandedHit(e,t,n){this.hitPlane.scale.set(1e3,1e3,1e3),this.hitPlane.updateMatrixWorld();let r=this.getHit(e,t,n);return this.hitPlane.scale.set(1,1,1),r}set offsetHeight(e){e-=.001,this.side===`back`?this.position.z=this.shadowHeight+e:this.position.y=this.shadowHeight+e}get offsetHeight(){return this.side===`back`?this.position.z-this.shadowHeight:this.position.y-this.shadowHeight}set show(e){this.goalOpacity=e?sm:0}updateOpacity(e){let t=this.material;t.opacity=this.opacityDamper.update(t.opacity,this.goalOpacity,e,1),this.visible=t.opacity>0}dispose(){var e;let{geometry:t,material:n}=this.hitPlane;t.dispose(),n.dispose(),this.geometry.dispose(),this.material.dispose(),(e=this.parent)==null||e.remove(this)}},pm=(e,t)=>({type:`number`,number:e,unit:t}),mm=(()=>{let e={};return t=>{let n=t;if(n in e)return e[n];let r=[],i=0;for(;t;){if(++i>1e3){t=``;break}let e=hm(t),n=e.nodes[0];if(n==null||n.terms.length===0)break;r.push(n),t=e.remainingInput}return e[n]=r}})(),hm=(()=>{let e=/^(\-\-|[a-z\u0240-\uffff])/i,t=/^([\*\+\/]|[\-]\s)/i,n=/^[\),]/;return r=>{let i=[];for(;r.length&&(r=r.trim(),!n.test(r));)if(r[0]===`(`){let{nodes:e,remainingInput:t}=ym(r);r=t,i.push({type:`function`,name:{type:`ident`,value:`calc`},arguments:e})}else if(e.test(r)){let e=gm(r),t=e.nodes[0];if(r=e.remainingInput,r[0]===`(`){let{nodes:e,remainingInput:n}=ym(r);i.push({type:`function`,name:t,arguments:e}),r=n}else i.push(t)}else if(t.test(r))i.push({type:`operator`,value:r[0]}),r=r.slice(1);else{let{nodes:e,remainingInput:t}=r[0]===`#`?vm(r):_m(r);if(e.length===0)break;i.push(e[0]),r=t}return{nodes:[{type:`expression`,terms:i}],remainingInput:r}}})(),gm=(()=>{let e=/[^a-z0-9_\-\u0240-\uffff]/i;return t=>{let n=t.match(e),r=n==null?t:t.substr(0,n.index),i=n==null?``:t.substr(n.index);return{nodes:[{type:`ident`,value:r}],remainingInput:i}}})(),_m=(()=>{let e=/[\+\-]?(\d+[\.]\d+|\d+|[\.]\d+)([eE][\+\-]?\d+)?/,t=/^[a-z%]+/i,n=/^(m|mm|cm|rad|deg|[%])$/;return r=>{let i=r.match(e),a=i==null?`0`:i[0];r=a==null?r:r.slice(a.length);let o=r.match(t),s=o!=null&&o[0]!==``?o[0]:null,c=o==null?r:r.slice(s.length);return s!=null&&!n.test(s)&&(s=null),{nodes:[{type:`number`,number:parseFloat(a)||0,unit:s}],remainingInput:c}}})(),vm=(()=>{let e=/^[a-f0-9]*/i;return t=>{t=t.slice(1).trim();let n=t.match(e);return{nodes:n==null?[]:[{type:`hex`,value:n[0]}],remainingInput:n==null?t:t.slice(n[0].length)}}})(),ym=e=>{let t=[];for(e=e.slice(1).trim();e.length;){let n=hm(e);if(t.push(n.nodes[0]),e=n.remainingInput.trim(),e[0]===`,`)e=e.slice(1).trim();else if(e[0]===`)`){e=e.slice(1);break}}return{nodes:t,remainingInput:e}},bm=Symbol(`visitedTypes`),xm=class{constructor(e){this[bm]=e}walk(e,t){let n=e.slice();for(;n.length;){let e=n.shift();switch(this[bm].indexOf(e.type)>-1&&t(e),e.type){case`expression`:n.unshift(...e.terms);break;case`function`:n.unshift(e.name,...e.arguments)}}}},Sm=Object.freeze({type:`number`,number:0,unit:null}),Cm=(e,t=0)=>{let{number:n,unit:r}=e;if(!isFinite(n))n=t,r=`rad`;else if(e.unit===`rad`||e.unit==null)return e;return{type:`number`,number:(r===`deg`&&n!=null?n:0)*Math.PI/180,unit:`rad`}},wm=(e,t=0)=>{let{number:n,unit:r}=e;if(!isFinite(n))n=t,r=`m`;else if(e.unit===`m`)return e;let i;switch(r){default:i=1;break;case`cm`:i=1/100;break;case`mm`:i=1/1e3}return{type:`number`,number:i*n,unit:`m`}},Tm=(()=>{let e=e=>e,t={rad:e,deg:Cm,m:e,mm:wm,cm:wm};return(e,n=Sm)=>{isFinite(e.number)||(e.number=n.number,e.unit=n.unit);let{unit:r}=e;if(r==null)return e;let i=t[r];return i==null?n:i(e)}})(),Em,Dm,Om,km=Symbol(`evaluate`),Am=Symbol(`lastValue`),jm=class e{constructor(){this[Em]=null}static evaluatableFor(t,n=Sm){if(t instanceof e)return t;if(t.type===`number`)return t.unit===`%`?new Pm(t,n):t;switch(t.name.value){case`calc`:return new zm(t,n);case`env`:return new Im(t)}return Sm}static evaluate(t){return t instanceof e?t.evaluate():t}static isConstant(t){return t instanceof e?t.isConstant:!0}static applyIntrinsics(e,t){let{basis:n,keywords:r}=t,{auto:i}=r;return n.map((t,n)=>{let a=i[n]==null?t:i[n],o=e[n]?e[n]:a;if(o.type===`ident`){let e=o.value;e in r&&(o=r[e][n])}return(o==null||o.type===`ident`)&&(o=a),o.unit===`%`?pm(o.number/100*t.number,t.unit):(o=Tm(o,t),o.unit===t.unit?o:t)})}get isConstant(){return!1}evaluate(){return(!this.isConstant||this[Am]==null)&&(this[Am]=this[km]()),this[Am]}};Em=Am;var Mm=Symbol(`percentage`),Nm=Symbol(`basis`),Pm=class extends jm{constructor(e,t){super(),this[Mm]=e,this[Nm]=t}get isConstant(){return!0}[km](){return pm(this[Mm].number/100*this[Nm].number,this[Nm].unit)}},Fm=Symbol(`identNode`),Im=class extends jm{constructor(e){super(),this[Dm]=null;let t=e.arguments.length?e.arguments[0].terms[0]:null;t!=null&&t.type===`ident`&&(this[Fm]=t)}get isConstant(){return!1}[(Dm=Fm,km)](){if(this[Fm]!=null)switch(this[Fm].value){case`window-scroll-y`:return{type:`number`,number:window.pageYOffset/(Math.max(document.body.scrollHeight,document.body.offsetHeight,document.documentElement.clientHeight,document.documentElement.scrollHeight,document.documentElement.offsetHeight)-window.innerHeight)||0,unit:null}}return Sm}},Lm=/[\*\/]/,Rm=Symbol(`evaluator`),zm=class extends jm{constructor(e,t=Sm){if(super(),this[Om]=null,e.arguments.length!==1)return;let n=e.arguments[0].terms.slice(),r=[];for(;n.length;){let e=n.shift();if(r.length>0){let n=r[r.length-1];if(n.type===`operator`&&Lm.test(n.value)){let n=r.pop(),i=r.pop();if(i==null)return;r.push(new Um(n,jm.evaluatableFor(i,t),jm.evaluatableFor(e,t)));continue}}r.push(e.type===`operator`?e:jm.evaluatableFor(e,t))}for(;r.length>2;){let[e,n,i]=r.splice(0,3);if(n.type!==`operator`)return;r.unshift(new Um(n,jm.evaluatableFor(e,t),jm.evaluatableFor(i,t)))}r.length===1&&(this[Rm]=r[0])}get isConstant(){return this[Rm]==null||jm.isConstant(this[Rm])}[(Om=Rm,km)](){return this[Rm]==null?Sm:jm.evaluate(this[Rm])}},Bm=Symbol(`operator`),Vm=Symbol(`left`),Hm=Symbol(`right`),Um=class extends jm{constructor(e,t,n){super(),this[Bm]=e,this[Vm]=t,this[Hm]=n}get isConstant(){return jm.isConstant(this[Vm])&&jm.isConstant(this[Hm])}[km](){let e=Tm(jm.evaluate(this[Vm])),t=Tm(jm.evaluate(this[Hm])),{number:n,unit:r}=e,{number:i,unit:a}=t;if(a!=null&&r!=null&&a!=r)return Sm;let o=r||a,s;switch(this[Bm].value){case`+`:s=n+i;break;case`-`:s=n-i;break;case`/`:s=n/i;break;case`*`:s=n*i;break;default:return Sm}return{type:`number`,number:s,unit:o}}},Wm=Symbol(`evaluatables`),Gm=Symbol(`intrinsics`),Km=class extends jm{constructor(e,t){super(),this[Gm]=t;let n=e[0],r=n==null?[]:n.terms;this[Wm]=t.basis.map((e,t)=>{let n=r[t];return n==null?{type:`ident`,value:`auto`}:n.type===`ident`?n:jm.evaluatableFor(n,e)})}get isConstant(){for(let e of this[Wm])if(!jm.isConstant(e))return!1;return!0}[km](){let e=this[Wm].map(e=>jm.evaluate(e));return jm.applyIntrinsics(e,this[Gm]).map(e=>e.number)}},qm,Jm,Ym,Xm,Zm=Symbol(`instances`),Qm=Symbol(`activateListener`),$m=Symbol(`deactivateListener`),eh=Symbol(`notifyInstances`),th=Symbol(`notify`),nh=Symbol(`callback`),rh=class e{constructor(e){this[nh]=e}static[eh](){for(let t of e[Zm])t[th]()}static[(qm=Zm,Qm)](){window.addEventListener(`scroll`,this[eh],{passive:!0})}static[$m](){window.removeEventListener(`scroll`,this[eh])}observe(){e[Zm].size===0&&e[Qm](),e[Zm].add(this)}disconnect(){e[Zm].delete(this),e[Zm].size===0&&e[$m]()}[th](){this[nh]()}};rh[qm]=new Set;var ih=Symbol(`computeStyleCallback`),ah=Symbol(`astWalker`),oh=Symbol(`dependencies`),sh=Symbol(`onScroll`),ch=class{constructor(e){this[Jm]={},this[Ym]=new xm([`function`]),this[Xm]=()=>{this[ih]({relatedState:`window-scroll`})},this[ih]=e}observeEffectsFor(e){let t={},n=this[oh];this[ah].walk(e,e=>{let{name:r}=e,i=e.arguments[0].terms[0];if(r.value===`env`&&i!=null&&i.type===`ident`&&i.value===`window-scroll-y`&&t[`window-scroll`]==null){let e=`window-scroll`in n?n[`window-scroll`]:new rh(this[sh]);e.observe(),delete n[`window-scroll`],t[`window-scroll`]=e}});for(let e in n)n[e].disconnect();this[oh]=t}dispose(){for(let e in this[oh])this[oh][e].disconnect()}};Jm=oh,Ym=ah,Xm=sh;var lh=e=>{let t=e.observeEffects||!1,n=e.intrinsics instanceof Function?e.intrinsics:(()=>e.intrinsics);return(r,i)=>{let a=r.updated,o=r.connectedCallback,s=r.disconnectedCallback,c=Symbol(`${i}StyleEffector`),l=Symbol(`${i}StyleEvaluator`),u=Symbol(`${i}UpdateEvaluator`),d=Symbol(`${i}EvaluateAndSync`);Object.defineProperties(r,{[c]:{value:null,writable:!0},[l]:{value:null,writable:!0},[u]:{value:function(){let e=mm(this[i]);this[l]=new Km(e,n(this)),this[c]==null&&t&&(this[c]=new ch(()=>this[d]())),this[c]!=null&&this[c].observeEffectsFor(e)}},[d]:{value:function(){if(this[l]==null)return;let t=this[l].evaluate();this[e.updateHandler](t)}},updated:{value:function(e){e.has(i)&&(this[u](),this[d]()),a.call(this,e)}},connectedCallback:{value:function(){o.call(this),this.requestUpdate(i,this[i])}},disconnectedCallback:{value:function(){s.call(this),this[c]!=null&&(this[c].dispose(),this[c]=null)}}})}},uh=e=>e<.5?2*e*e:-1+(4-2*e)*e,dh=(e,t,n=uh)=>r=>e+(t-e)*n(r),fh=(e,t)=>{let n=t.map((e=>t=>e+=t)(0));return t=>{t=Wu(t,0,1),t*=n[n.length-1];let r=n.findIndex(e=>e>=t),i=r<1?0:n[r-1],a=n[r];return e[r]((t-i)/(a-i))}},ph=e=>{let t=[],n=[],r=e.initialValue;for(let i=0;i<e.keyframes.length;++i){let a=e.keyframes[i],{value:o,frames:s}=a,c=a.ease||uh,l=dh(r,o,c);t.push(l),n.push(s),r=o}return fh(t,n)},mh=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},hh=5e3,gh=ph({initialValue:0,keyframes:[{frames:5,value:-1},{frames:1,value:-1},{frames:8,value:1},{frames:1,value:1},{frames:5,value:0},{frames:18,value:0}]}),_h=ph({initialValue:0,keyframes:[{frames:1,value:1},{frames:5,value:1},{frames:1,value:0},{frames:6,value:0}]}),vh=`0deg 75deg 105%`,yh=`auto auto auto`,bh=`auto`,xh=2.2,Sh=[`front`,`right`,`back`,`left`],Ch=[`upper-`,``,`lower-`],wh=3e3,Th=`. Use mouse, touch or arrow keys to move.`,Eh={AUTO:`auto`,NONE:`none`},Dh={BASIC:`basic`,WIGGLE:`wiggle`},Oh={PAN_Y:`pan-y`,PAN_X:`pan-x`,NONE:`none`},kh=()=>({basis:[Cm(pm(30,`deg`))],keywords:{auto:[null]}}),Ah=()=>({basis:[Cm(pm(12,`deg`))],keywords:{auto:[null]}}),jh=(()=>{let e=mm(vh)[0].terms,t=Tm(e[0]),n=Tm(e[1]);return e=>{let r=e[$].idealCameraDistance();return{basis:[t,n,pm(r,`m`)],keywords:{auto:[null,null,pm(105,`%`)]}}}})(),Mh=e=>{let t=xh*e[$].boundingSphere.radius;return{basis:[pm(-1/0,`rad`),pm(Math.PI/8,`rad`),pm(t,`m`)],keywords:{auto:[null,null,null]}}},Nh=e=>{let t=new Km([],jh(e)).evaluate()[2];return{basis:[pm(1/0,`rad`),pm(Math.PI-Math.PI/8,`rad`),pm(t,`m`)],keywords:{auto:[null,null,null]}}},Ph=e=>{let t=e[$].boundingBox.getCenter(new U);return{basis:[pm(t.x,`m`),pm(t.y,`m`),pm(t.z,`m`)],keywords:{auto:[null,null,null]}}},Fh=Math.PI/2,Ih=Math.PI/3,Lh=Fh/2,Rh=2*Math.PI,zh=Symbol(`controls`),Bh=Symbol(`panElement`),Vh=Symbol(`promptElement`),Hh=Symbol(`promptAnimatedContainer`),Uh=Symbol(`fingerAnimatedContainers`),Wh=Symbol(`deferInteractionPrompt`),Gh=Symbol(`updateAria`),Kh=Symbol(`a11y`),qh=Symbol(`updateA11y`),Jh=Symbol(`updateCameraForRadius`),Yh=Symbol(`cancelPrompts`),Xh=Symbol(`onChange`),Zh=Symbol(`onPointerChange`),Qh=Symbol(`waitingToPromptUser`),$h=Symbol(`userHasInteracted`),eg=Symbol(`promptElementVisibleTime`),tg=Symbol(`lastPromptOffset`),ng=Symbol(`cancellationSource`),rg=Symbol(`lastSpherical`),ig=Symbol(`jumpCamera`),ag=Symbol(`initialized`),og=Symbol(`maintainThetaPhi`),sg=Symbol(`syncCameraOrbit`),cg=Symbol(`syncFieldOfView`),lg=Symbol(`syncCameraTarget`),ug=Symbol(`syncMinCameraOrbit`),dg=Symbol(`syncMaxCameraOrbit`),fg=Symbol(`syncMinFieldOfView`),pg=Symbol(`syncMaxFieldOfView`),mg=e=>{var t,n,i,a,o,s,c,l,u,d,f,p,m,h,g,_,v,y;class b extends e{constructor(){super(...arguments),this.cameraControls=!1,this.cameraOrbit=vh,this.cameraTarget=yh,this.fieldOfView=bh,this.minCameraOrbit=`auto`,this.maxCameraOrbit=`auto`,this.minFieldOfView=`auto`,this.maxFieldOfView=`auto`,this.interactionPromptThreshold=wh,this.interactionPrompt=Eh.AUTO,this.interactionPromptStyle=Dh.WIGGLE,this.orbitSensitivity=1,this.zoomSensitivity=1,this.panSensitivity=1,this.touchAction=Oh.NONE,this.disableZoom=!1,this.disablePan=!1,this.disableTap=!1,this.interpolationDecay=50,this.a11y=null,this[t]=this.shadowRoot.querySelector(`.interaction-prompt`),this[n]=this.shadowRoot.querySelector(`#prompt`),this[i]=[this.shadowRoot.querySelector(`#finger0`),this.shadowRoot.querySelector(`#finger1`)],this[a]=this.shadowRoot.querySelector(`.pan-target`),this[o]=0,this[s]=1/0,this[c]=!1,this[l]=!1,this[u]=wg.AUTOMATIC,this[d]=new Tg(this[$].camera,this[Kb],this[$]),this[f]=new xl,this[p]=!1,this[m]=!1,this[h]=!1,this[g]={},this[_]=()=>{let e=this[zh].changeSource;this[ng]=e,e===wg.USER_INTERACTION&&(this[$h]=!0,this[Wh]())},this[v]=()=>{this[Gh](),this[Jb]();let e=this[zh].changeSource;this.dispatchEvent(new CustomEvent(`camera-change`,{detail:{source:e}}))},this[y]=e=>{this[Gb].classList.toggle(`pointer-tumbling`,e.type===`pointer-change-start`)}}get inputSensitivity(){return this[zh].inputSensitivity}set inputSensitivity(e){this[zh].inputSensitivity=e}getCameraOrbit(){let{theta:e,phi:t,radius:n}=this[rg];return{theta:e,phi:t,radius:n,toString(){return`${this.theta}rad ${this.phi}rad ${this.radius}m`}}}getCameraTarget(){return rx(this[Qb].isPresenting?this[Qb].arRenderer.target:this[$].getTarget())}getFieldOfView(){return this[zh].getFieldOfView()}getMinimumFieldOfView(){return this[zh].options.minimumFieldOfView}getMaximumFieldOfView(){return this[zh].options.maximumFieldOfView}getIdealAspect(){return this[$].idealAspect}jumpCameraToGoal(){this[ig]=!0,this.requestUpdate(ig,!1)}resetInteractionPrompt(){this[tg]=0,this[eg]=1/0,this[$h]=!1,this[Qh]=this.interactionPrompt===Eh.AUTO&&this.cameraControls}zoom(e){let t=new WheelEvent(`wheel`,{deltaY:-30*e});this[Kb].dispatchEvent(t)}connectedCallback(){super.connectedCallback(),this[zh].addEventListener(`user-interaction`,this[Yh]),this[zh].addEventListener(`pointer-change-start`,this[Zh]),this[zh].addEventListener(`pointer-change-end`,this[Zh])}disconnectedCallback(){super.disconnectedCallback(),this[zh].removeEventListener(`user-interaction`,this[Yh]),this[zh].removeEventListener(`pointer-change-start`,this[Zh]),this[zh].removeEventListener(`pointer-change-end`,this[Zh])}updated(e){super.updated(e);let t=this[zh],n=this[$];if(e.has(`cameraControls`)&&(this.cameraControls?(t.enableInteraction(),this.interactionPrompt===Eh.AUTO&&(this[Qh]=!0)):(t.disableInteraction(),this[Wh]()),this[Kb].setAttribute(`aria-label`,this[Rb])),e.has(`disableZoom`)&&(t.disableZoom=this.disableZoom),e.has(`disablePan`)&&(t.enablePan=!this.disablePan),e.has(`disableTap`)&&(t.enableTap=!this.disableTap),(e.has(`interactionPrompt`)||e.has(`cameraControls`)||e.has(`src`))&&(this.interactionPrompt===Eh.AUTO&&this.cameraControls&&!this[$h]?this[Qh]=!0:this[Wh]()),e.has(`interactionPromptStyle`)&&(this[Hh].style.opacity=this.interactionPromptStyle==Dh.BASIC?`1`:`0`),e.has(`touchAction`)){let e=this.touchAction;t.applyOptions({touchAction:e}),t.updateTouchActionStyle()}e.has(`orbitSensitivity`)&&(t.orbitSensitivity=this.orbitSensitivity),e.has(`zoomSensitivity`)&&(t.zoomSensitivity=this.zoomSensitivity),e.has(`panSensitivity`)&&(t.panSensitivity=this.panSensitivity),e.has(`interpolationDecay`)&&(t.setDamperDecayTime(this.interpolationDecay),n.setTargetDamperDecayTime(this.interpolationDecay)),e.has(`a11y`)&&this[qh](),this[ig]===!0&&Promise.resolve().then(()=>{t.jumpToGoal(),n.jumpToGoal(),this[Xh](),this[ig]=!1})}async updateFraming(){let e=this[$],t=e.adjustedFoV(e.framedFoVDeg);await e.updateFraming();let n=e.adjustedFoV(e.framedFoVDeg),r=this[zh].getFieldOfView()/t;this[zh].setFieldOfView(n*r),this[og]=!0,this.requestUpdate(`maxFieldOfView`),this.requestUpdate(`fieldOfView`),this.requestUpdate(`minCameraOrbit`),this.requestUpdate(`maxCameraOrbit`),this.requestUpdate(`cameraOrbit`),await this.updateComplete}interact(e,t,n){let r=this[Kb],i=this[Uh];if(i[0].style.opacity===`1`){console.warn(`interact() failed because an existing interaction is running.`);return}let a=[];a.push({x:ph(t.x),y:ph(t.y)});let o=[{x:a[0].x(0),y:a[0].y(0)}];n!=null&&(a.push({x:ph(n.x),y:ph(n.y)}),o.push({x:a[1].x(0),y:a[1].y(0)}));let s=performance.now(),{width:c,height:l}=this[$],u=this.getBoundingClientRect(),d=e=>{for(let[t,n]of o.entries()){let{style:a}=i[t];a.transform=`translateX(${c*n.x}px) translateY(${l*n.y}px)`,e===`pointerdown`?a.opacity=`1`:e===`pointerup`&&(a.opacity=`0`);let o={pointerId:t-5678,pointerType:`touch`,target:r,clientX:c*n.x+u.x,clientY:l*n.y+u.y,altKey:!0};r.dispatchEvent(new PointerEvent(e,o))}},f=()=>{let t=this[ng];if(t!==wg.AUTOMATIC||!r.isConnected){for(let e of this[Uh])e.style.opacity=`0`;d(`pointercancel`),this.dispatchEvent(new CustomEvent(`interact-stopped`,{detail:{source:t}})),document.removeEventListener(`visibilitychange`,p);return}let n=Math.min(1,(performance.now()-s)/e);for(let[e,t]of o.entries())t.x=a[e].x(n),t.y=a[e].y(n);d(`pointermove`),n<1?requestAnimationFrame(f):(d(`pointerup`),this.dispatchEvent(new CustomEvent(`interact-stopped`,{detail:{source:wg.AUTOMATIC}})),document.removeEventListener(`visibilitychange`,p))},p=()=>{let e=0;document.visibilityState===`hidden`?e=performance.now()-s:s=performance.now()-e};document.addEventListener(`visibilitychange`,p),d(`pointerdown`),this[ng]=wg.AUTOMATIC,requestAnimationFrame(f)}[(t=Vh,n=Hh,i=Uh,a=Bh,o=tg,s=eg,c=$h,l=Qh,u=ng,d=zh,f=rg,p=ig,m=ag,h=og,g=Kh,cg)](e){let t=this[zh],n=this[$];n.framedFoVDeg=e[0]*180/Math.PI,t.changeSource=wg.NONE,t.setFieldOfView(n.adjustedFoV(n.framedFoVDeg)),this[Yh]()}[sg](e){let t=this[zh];if(this[og]){let{theta:t,phi:n}=this.getCameraOrbit();e[0]=t,e[1]=n,this[og]=!1}t.changeSource=wg.NONE,t.setOrbit(e[0],e[1],e[2]),this[Yh]()}[ug](e){this[zh].applyOptions({minimumAzimuthalAngle:e[0],minimumPolarAngle:e[1],minimumRadius:e[2]}),this.jumpCameraToGoal()}[dg](e){this[zh].applyOptions({maximumAzimuthalAngle:e[0],maximumPolarAngle:e[1],maximumRadius:e[2]}),this[Jh](e[2]),this.jumpCameraToGoal()}[fg](e){this[zh].applyOptions({minimumFieldOfView:e[0]*180/Math.PI}),this.jumpCameraToGoal()}[pg](e){let t=this[$].adjustedFoV(e[0]*180/Math.PI);this[zh].applyOptions({maximumFieldOfView:t}),this.jumpCameraToGoal()}[lg](e){let[t,n,r]=e;this[Qb].arRenderer.isPresenting||this[$].setTarget(t,n,r),this[zh].changeSource=wg.NONE,this[Qb].arRenderer.updateTarget(),this[Yh]()}[Yb](e,t){if(super[Yb](e,t),this[Qb].isPresenting||!this[tx]())return;let n=this[zh],r=this[$],i=performance.now();if(this[Qh]&&this.loaded&&i>this[Hb]+this.interactionPromptThreshold&&(this[Qh]=!1,this[eg]=i,this[Vh].classList.add(`visible`)),isFinite(this[eg])&&this.interactionPromptStyle===Dh.WIGGLE){let e=(i-this[eg])/hh%1,t=gh(e),a=_h(e);if(this[Hh].style.opacity=`${a}`,t!==this[tg]){let e=t*r.width*.05,i=(t-this[tg])*Math.PI/16;this[Hh].style.transform=`translateX(${e}px)`,n.changeSource=wg.AUTOMATIC,n.adjustOrbit(i,0,0),this[tg]=t}}let a=n.update(e,t),o=r.updateTarget(t);(a||o)&&this[Xh]()}[Wh](){this[Qh]=!1,this[Vh].classList.remove(`visible`),this[eg]=1/0}[Jh](e){let t=Math.max(this[$].farRadius(),e),n=Math.abs(2*t);this[zh].updateNearFar(0,n)}[Gh](){let{theta:e,phi:t}=this[zh].getCameraSpherical(this[rg]),n=(4+Math.floor((e%Rh+Lh)/Fh))%4,r=Math.floor(t/Ih),i=Sh[n],a=`${Ch[r]}${i}`,o=a;o in this[Kh]?this[Vb](this[Kh][o]):this[Vb](`View from stage ${a}`)}get[Rb](){let e=Th;return`interaction-prompt`in this[Kh]&&(e=`. ${this[Kh][`interaction-prompt`]}`),super[Rb].replace(/\.$/,``)+(this.cameraControls?e:``)}async[Zb](e){let t=this[zh],n=this[$],r=n.adjustedFoV(n.framedFoVDeg);super[Zb](e);let i=n.adjustedFoV(n.framedFoVDeg)/r,a=t.getFieldOfView()*(isFinite(i)?i:1);t.updateAspect(this[$].aspect),this.requestUpdate(`maxFieldOfView`,this.maxFieldOfView),await this.updateComplete,this[zh].setFieldOfView(a),this.jumpCameraToGoal()}[Xb](){super[Xb](),this[ag]?this[og]=!0:this[ag]=!0,this.requestUpdate(`maxFieldOfView`,this.maxFieldOfView),this.requestUpdate(`fieldOfView`,this.fieldOfView),this.requestUpdate(`minCameraOrbit`,this.minCameraOrbit),this.requestUpdate(`maxCameraOrbit`,this.maxCameraOrbit),this.requestUpdate(`cameraOrbit`,this.cameraOrbit),this.requestUpdate(`cameraTarget`,this.cameraTarget),this.jumpCameraToGoal()}[(_=Yh,v=Xh,y=Zh,qh)](){if(typeof this.a11y==`string`){if(this.a11y.startsWith(`{`))try{this[Kh]=JSON.parse(this.a11y)}catch(e){console.warn(`Error parsing a11y JSON:`,e)}else this.a11y.length>0?console.warn(`Error not supported format, should be a JSON string:`,this.a11y):this[Kh]={}}else this[Kh]=typeof this.a11y==`object`&&this.a11y!=null?Object.assign({},this.a11y):{};this[Kb].setAttribute(`aria-label`,this[Rb])}}return mh([r({type:Boolean,attribute:`camera-controls`})],b.prototype,`cameraControls`,void 0),mh([lh({intrinsics:jh,observeEffects:!0,updateHandler:sg}),r({type:String,attribute:`camera-orbit`,hasChanged:()=>!0})],b.prototype,`cameraOrbit`,void 0),mh([lh({intrinsics:Ph,observeEffects:!0,updateHandler:lg}),r({type:String,attribute:`camera-target`,hasChanged:()=>!0})],b.prototype,`cameraTarget`,void 0),mh([lh({intrinsics:kh,observeEffects:!0,updateHandler:cg}),r({type:String,attribute:`field-of-view`,hasChanged:()=>!0})],b.prototype,`fieldOfView`,void 0),mh([lh({intrinsics:Mh,updateHandler:ug}),r({type:String,attribute:`min-camera-orbit`,hasChanged:()=>!0})],b.prototype,`minCameraOrbit`,void 0),mh([lh({intrinsics:Nh,updateHandler:dg}),r({type:String,attribute:`max-camera-orbit`,hasChanged:()=>!0})],b.prototype,`maxCameraOrbit`,void 0),mh([lh({intrinsics:Ah,updateHandler:fg}),r({type:String,attribute:`min-field-of-view`,hasChanged:()=>!0})],b.prototype,`minFieldOfView`,void 0),mh([lh({intrinsics:kh,updateHandler:pg}),r({type:String,attribute:`max-field-of-view`,hasChanged:()=>!0})],b.prototype,`maxFieldOfView`,void 0),mh([r({type:Number,attribute:`interaction-prompt-threshold`})],b.prototype,`interactionPromptThreshold`,void 0),mh([r({type:String,attribute:`interaction-prompt`})],b.prototype,`interactionPrompt`,void 0),mh([r({type:String,attribute:`interaction-prompt-style`})],b.prototype,`interactionPromptStyle`,void 0),mh([r({type:Number,attribute:`orbit-sensitivity`})],b.prototype,`orbitSensitivity`,void 0),mh([r({type:Number,attribute:`zoom-sensitivity`})],b.prototype,`zoomSensitivity`,void 0),mh([r({type:Number,attribute:`pan-sensitivity`})],b.prototype,`panSensitivity`,void 0),mh([r({type:String,attribute:`touch-action`})],b.prototype,`touchAction`,void 0),mh([r({type:Boolean,attribute:`disable-zoom`})],b.prototype,`disableZoom`,void 0),mh([r({type:Boolean,attribute:`disable-pan`})],b.prototype,`disablePan`,void 0),mh([r({type:Boolean,attribute:`disable-tap`})],b.prototype,`disableTap`,void 0),mh([r({type:Number,attribute:`interpolation-decay`})],b.prototype,`interpolationDecay`,void 0),mh([r()],b.prototype,`a11y`,void 0),b},hg=.018,gg=2,_g=300,vg=new V,yg=new U,bg=Object.freeze({minimumRadius:0,maximumRadius:1/0,minimumPolarAngle:Math.PI/8,maximumPolarAngle:Math.PI-Math.PI/8,minimumAzimuthalAngle:-1/0,maximumAzimuthalAngle:1/0,minimumFieldOfView:10,maximumFieldOfView:45,touchAction:`none`}),xg=Math.PI/8,Sg=.04,Cg=10,wg={USER_INTERACTION:`user-interaction`,NONE:`none`,AUTOMATIC:`automatic`},Tg=class extends be{constructor(e,t,n){super(),this.camera=e,this.element=t,this.scene=n,this.orbitSensitivity=1,this.zoomSensitivity=1,this.panSensitivity=1,this.inputSensitivity=1,this.changeSource=wg.NONE,this._interactionEnabled=!1,this._disableZoom=!1,this.isUserPointing=!1,this.enablePan=!0,this.enableTap=!0,this.panProjection=new H,this.panPerPixel=0,this.spherical=new xl,this.goalSpherical=new xl,this.thetaDamper=new am,this.phiDamper=new am,this.radiusDamper=new am,this.logFov=Math.log(bg.maximumFieldOfView),this.goalLogFov=this.logFov,this.fovDamper=new am,this.touchMode=null,this.pointers=[],this.startTime=0,this.startPointerPosition={clientX:0,clientY:0},this.lastSeparation=0,this.touchDecided=!1,this.onContext=e=>{if(this.enablePan)e.preventDefault();else for(let e of this.pointers)this.onPointerUp(new PointerEvent(`pointercancel`,Object.assign(Object.assign({},this.startPointerPosition),{pointerId:e.id})))},this.touchModeZoom=(e,t)=>{if(!this._disableZoom){let e=this.twoTouchDistance(this.pointers[0],this.pointers[1]),t=Sg*this.zoomSensitivity*(this.lastSeparation-e)*50/this.scene.height;this.lastSeparation=e,this.userAdjustOrbit(0,0,t)}this.panPerPixel>0&&this.movePan(e,t)},this.disableScroll=e=>{e.preventDefault()},this.touchModeRotate=(e,t)=>{let{touchAction:n}=this._options;if(!this.touchDecided&&n!==`none`){this.touchDecided=!0;let r=Math.abs(e),i=Math.abs(t);if(this.changeSource===wg.USER_INTERACTION&&(n===`pan-y`&&i>r||n===`pan-x`&&r>i)){this.touchMode=null;return}this.element.addEventListener(`touchmove`,this.disableScroll,{passive:!1})}this.handleSinglePointerMove(e,t)},this.onPointerDown=e=>{if(this.pointers.length>2)return;let{element:t}=this;this.pointers.length===0&&(t.addEventListener(`pointermove`,this.onPointerMove),t.addEventListener(`pointerup`,this.onPointerUp),this.touchMode=null,this.touchDecided=!1,this.startPointerPosition.clientX=e.clientX,this.startPointerPosition.clientY=e.clientY,this.startTime=performance.now());try{t.setPointerCapture(e.pointerId)}catch{}this.pointers.push({clientX:e.clientX,clientY:e.clientY,id:e.pointerId}),this.isUserPointing=!1,e.pointerType===`touch`?(this.changeSource=e.altKey?wg.AUTOMATIC:wg.USER_INTERACTION,this.onTouchChange(e)):(this.changeSource=wg.USER_INTERACTION,this.onMouseDown(e)),this.changeSource===wg.USER_INTERACTION&&this.dispatchEvent({type:`user-interaction`})},this.onPointerMove=e=>{let t=this.pointers.find(t=>t.id===e.pointerId);if(t==null)return;if(e.pointerType===`mouse`&&e.buttons===0){this.onPointerUp(e);return}let n=this.pointers.length,r=(e.clientX-t.clientX)/n,i=(e.clientY-t.clientY)/n;(r!==0||i!==0)&&(t.clientX=e.clientX,t.clientY=e.clientY,e.pointerType===`touch`?(this.changeSource=e.altKey?wg.AUTOMATIC:wg.USER_INTERACTION,this.touchMode!==null&&this.touchMode(r,i)):(this.changeSource=wg.USER_INTERACTION,this.panPerPixel>0?this.movePan(r,i):this.handleSinglePointerMove(r,i)))},this.onPointerUp=e=>{let{element:t}=this,n=this.pointers.findIndex(t=>t.id===e.pointerId);n!==-1&&this.pointers.splice(n,1),this.panPerPixel>0&&!e.altKey&&this.resetRadius(),this.pointers.length===0?(t.removeEventListener(`pointermove`,this.onPointerMove),t.removeEventListener(`pointerup`,this.onPointerUp),t.removeEventListener(`touchmove`,this.disableScroll),this.enablePan&&this.enableTap&&this.recenter(e)):this.touchMode!==null&&this.onTouchChange(e),this.scene.element[Bh].style.opacity=0,t.style.cursor=`grab`,this.panPerPixel=0,this.isUserPointing&&this.dispatchEvent({type:`pointer-change-end`})},this.onWheel=e=>{this.changeSource=wg.USER_INTERACTION;let t=e.deltaY*(e.deltaMode==1?18:1)*Sg*this.zoomSensitivity/30;this.userAdjustOrbit(0,0,t),e.preventDefault(),this.dispatchEvent({type:`user-interaction`})},this.onKeyDown=e=>{let{changeSource:t}=this;this.changeSource=wg.USER_INTERACTION,(e.shiftKey&&this.enablePan?this.panKeyCodeHandler(e):this.orbitZoomKeyCodeHandler(e))?(e.preventDefault(),this.dispatchEvent({type:`user-interaction`})):this.changeSource=t},this._options=Object.assign({},bg),this.setOrbit(0,Math.PI/2,1),this.setFieldOfView(100),this.jumpToGoal()}get interactionEnabled(){return this._interactionEnabled}enableInteraction(){if(this._interactionEnabled===!1){let{element:e}=this;e.addEventListener(`pointerdown`,this.onPointerDown),e.addEventListener(`pointercancel`,this.onPointerUp),this._disableZoom||e.addEventListener(`wheel`,this.onWheel),e.addEventListener(`keydown`,this.onKeyDown),e.addEventListener(`touchmove`,()=>{},{passive:!1}),e.addEventListener(`contextmenu`,this.onContext),this.element.style.cursor=`grab`,this._interactionEnabled=!0,this.updateTouchActionStyle()}}disableInteraction(){if(this._interactionEnabled===!0){let{element:e}=this;e.removeEventListener(`pointerdown`,this.onPointerDown),e.removeEventListener(`pointermove`,this.onPointerMove),e.removeEventListener(`pointerup`,this.onPointerUp),e.removeEventListener(`pointercancel`,this.onPointerUp),e.removeEventListener(`wheel`,this.onWheel),e.removeEventListener(`keydown`,this.onKeyDown),e.removeEventListener(`contextmenu`,this.onContext),e.style.cursor=``,this.touchMode=null,this._interactionEnabled=!1,this.updateTouchActionStyle()}}get options(){return this._options}set disableZoom(e){this._disableZoom!=e&&(this._disableZoom=e,e===!0?this.element.removeEventListener(`wheel`,this.onWheel):this.element.addEventListener(`wheel`,this.onWheel),this.updateTouchActionStyle())}getCameraSpherical(e=new xl){return e.copy(this.spherical)}getFieldOfView(){return this.camera.fov}applyOptions(e){Object.assign(this._options,e),this.setOrbit(),this.setFieldOfView(Math.exp(this.goalLogFov))}updateNearFar(e,t){this.camera.far=t===0?2:t,this.camera.near=Math.max(e,this.camera.far/1e3),this.camera.updateProjectionMatrix()}updateAspect(e){this.camera.aspect=e,this.camera.updateProjectionMatrix()}setOrbit(e=this.goalSpherical.theta,t=this.goalSpherical.phi,n=this.goalSpherical.radius){let{minimumAzimuthalAngle:r,maximumAzimuthalAngle:i,minimumPolarAngle:a,maximumPolarAngle:o,minimumRadius:s,maximumRadius:c}=this._options,{theta:l,phi:u,radius:d}=this.goalSpherical,f=Wu(e,r,i);!isFinite(r)&&!isFinite(i)&&(this.spherical.theta=this.wrapAngle(this.spherical.theta-f)+f);let p=Wu(t,a,o),m=Wu(n,s,c);return f===l&&p===u&&m===d||!isFinite(f)||!isFinite(p)||!isFinite(m)?!1:(this.goalSpherical.theta=f,this.goalSpherical.phi=p,this.goalSpherical.radius=m,this.goalSpherical.makeSafe(),!0)}setRadius(e){this.goalSpherical.radius=e,this.setOrbit()}setFieldOfView(e){let{minimumFieldOfView:t,maximumFieldOfView:n}=this._options;e=Wu(e,t,n),this.goalLogFov=Math.log(e)}setDamperDecayTime(e){this.thetaDamper.setDecayTime(e),this.phiDamper.setDecayTime(e),this.radiusDamper.setDecayTime(e),this.fovDamper.setDecayTime(e)}adjustOrbit(e,t,n){let{theta:r,phi:i,radius:a}=this.goalSpherical,{minimumRadius:o,maximumRadius:s,minimumFieldOfView:c,maximumFieldOfView:l}=this._options,u=this.spherical.theta-r,d=Math.PI-.001,f=r-Wu(e,-d-u,d-u),p=i-t,m=n===0?0:((n>0?s:o)-a)/(Math.log(n>0?l:c)-this.goalLogFov),h=a+n*(isFinite(m)?m:(s-o)*2);if(this.setOrbit(f,p,h),n!==0){let e=this.goalLogFov+n;this.setFieldOfView(Math.exp(e))}}jumpToGoal(){this.update(0,rm)}update(e,t){if(this.isStationary())return!1;let{maximumPolarAngle:n,maximumRadius:r}=this._options,i=this.spherical.theta-this.goalSpherical.theta;return Math.abs(i)>Math.PI&&!isFinite(this._options.minimumAzimuthalAngle)&&!isFinite(this._options.maximumAzimuthalAngle)&&(this.spherical.theta-=Math.sign(i)*2*Math.PI),this.spherical.theta=this.thetaDamper.update(this.spherical.theta,this.goalSpherical.theta,t,Math.PI),this.spherical.phi=this.phiDamper.update(this.spherical.phi,this.goalSpherical.phi,t,n),this.spherical.radius=this.radiusDamper.update(this.spherical.radius,this.goalSpherical.radius,t,r),this.logFov=this.fovDamper.update(this.logFov,this.goalLogFov,t,1),this.moveCamera(),!0}updateTouchActionStyle(){let{style:e}=this.element;if(this._interactionEnabled){let{touchAction:t}=this._options;e.touchAction=this._disableZoom&&t!==`none`?`manipulation`:t}else e.touchAction=``}isStationary(){return this.goalSpherical.theta===this.spherical.theta&&this.goalSpherical.phi===this.spherical.phi&&this.goalSpherical.radius===this.spherical.radius&&this.goalLogFov===this.logFov}moveCamera(){this.spherical.makeSafe(),this.camera.position.setFromSpherical(this.spherical),this.camera.setRotationFromEuler(new an(this.spherical.phi-Math.PI/2,this.spherical.theta,0,`YXZ`)),this.camera.fov!==Math.exp(this.logFov)&&(this.camera.fov=Math.exp(this.logFov),this.camera.updateProjectionMatrix())}userAdjustOrbit(e,t,n){this.adjustOrbit(e*this.orbitSensitivity*this.inputSensitivity,t*this.orbitSensitivity*this.inputSensitivity,n*this.inputSensitivity)}wrapAngle(e){let t=(e+Math.PI)/(2*Math.PI);return(t-Math.floor(t))*2*Math.PI-Math.PI}pixelLengthToSphericalAngle(e){return 2*Math.PI*e/this.scene.height}twoTouchDistance(e,t){let{clientX:n,clientY:r}=e,{clientX:i,clientY:a}=t,o=i-n,s=a-r;return Math.sqrt(o*o+s*s)}handleSinglePointerMove(e,t){let n=this.pixelLengthToSphericalAngle(e),r=this.pixelLengthToSphericalAngle(t);this.isUserPointing===!1&&(this.isUserPointing=!0,this.dispatchEvent({type:`pointer-change-start`})),this.userAdjustOrbit(n,r,0)}initializePan(){let{theta:e,phi:t}=this.spherical,n=e-this.scene.yaw;this.panPerPixel=hg*this.panSensitivity/this.scene.height,this.panProjection.set(-Math.cos(n),-Math.cos(t)*Math.sin(n),0,0,Math.sin(t),0,Math.sin(n),-Math.cos(t)*Math.cos(n),0)}movePan(e,t){let{scene:n}=this,r=yg.set(e,t,0).multiplyScalar(this.inputSensitivity),i=this.spherical.radius*Math.exp(this.logFov)*this.panPerPixel;r.multiplyScalar(i);let a=n.getTarget();a.add(r.applyMatrix3(this.panProjection)),n.boundingSphere.clampPoint(a,a),n.setTarget(a.x,a.y,a.z)}recenter(e){if(performance.now()>this.startTime+_g||Math.abs(e.clientX-this.startPointerPosition.clientX)>gg||Math.abs(e.clientY-this.startPointerPosition.clientY)>gg)return;let{scene:t}=this,n=t.positionAndNormalFromPoint(t.getNDC(e.clientX,e.clientY));if(n==null){let{cameraTarget:e}=t.element;t.element.cameraTarget=``,t.element.cameraTarget=e,this.userAdjustOrbit(0,0,1)}else t.target.worldToLocal(n.position),t.setTarget(n.position.x,n.position.y,n.position.z)}resetRadius(){let{scene:e}=this,t=e.positionAndNormalFromPoint(vg.set(0,0));if(t==null)return;e.target.worldToLocal(t.position);let n=e.getTarget(),{theta:r,phi:i}=this.spherical,a=r-e.yaw,o=yg.set(Math.sin(i)*Math.sin(a),Math.cos(i),Math.sin(i)*Math.cos(a)),s=o.dot(t.position.sub(n));n.add(o.multiplyScalar(s)),e.setTarget(n.x,n.y,n.z),this.setOrbit(void 0,void 0,this.goalSpherical.radius-s)}onTouchChange(e){if(this.pointers.length===1)this.touchMode=this.touchModeRotate;else{if(this._disableZoom){this.touchMode=null,this.element.removeEventListener(`touchmove`,this.disableScroll);return}this.touchMode=this.touchDecided&&this.touchMode===null?null:this.touchModeZoom,this.touchDecided=!0,this.element.addEventListener(`touchmove`,this.disableScroll,{passive:!1}),this.lastSeparation=this.twoTouchDistance(this.pointers[0],this.pointers[1]),this.enablePan&&this.touchMode!=null&&(this.initializePan(),e.altKey||(this.scene.element[Bh].style.opacity=1))}}onMouseDown(e){this.panPerPixel=0,this.enablePan&&(e.button===2||e.ctrlKey||e.metaKey||e.shiftKey)&&(this.initializePan(),this.scene.element[Bh].style.opacity=1),this.element.style.cursor=`grabbing`}orbitZoomKeyCodeHandler(e){let t=!0;switch(e.key){case`PageUp`:this.userAdjustOrbit(0,0,Sg*this.zoomSensitivity);break;case`PageDown`:this.userAdjustOrbit(0,0,-1*Sg*this.zoomSensitivity);break;case`ArrowUp`:this.userAdjustOrbit(0,-xg,0);break;case`ArrowDown`:this.userAdjustOrbit(0,xg,0);break;case`ArrowLeft`:this.userAdjustOrbit(-xg,0,0);break;case`ArrowRight`:this.userAdjustOrbit(xg,0,0);break;default:t=!1}return t}panKeyCodeHandler(e){this.initializePan();let t=!0;switch(e.key){case`ArrowUp`:this.movePan(0,-10);break;case`ArrowDown`:this.movePan(0,Cg);break;case`ArrowLeft`:this.movePan(-10,0);break;case`ArrowRight`:this.movePan(Cg,0);break;default:t=!1}return t}},Eg=30,Dg=.8,Og=1.5,kg=20,Ag=1.3,jg=1/Ag,Mg=.25,Ng=10,Pg={NOT_PRESENTING:`not-presenting`,SESSION_STARTED:`session-started`,OBJECT_PLACED:`object-placed`,FAILED:`failed`},Fg={TRACKING:`tracking`,NOT_TRACKING:`not-tracking`},Ig=new U,Lg=new W,Rg=new U,zg=new Br(45,1,.1,100),Bg=class extends be{constructor(e){super(),this.renderer=e,this.currentSession=null,this.placeOnWall=!1,this.placementBox=null,this.lastTick=null,this.turntableRotation=null,this.oldShadowIntensity=null,this.frame=null,this.initialHitSource=null,this.transientHitTestSource=null,this.inputSource=null,this._presentedScene=null,this.resolveCleanup=null,this.exitWebXRButtonContainer=null,this.overlay=null,this.xrLight=null,this.tracking=!0,this.frames=0,this.initialized=!1,this.oldTarget=new U,this.placementComplete=!1,this.isTranslating=!1,this.isRotating=!1,this.isTwoFingering=!1,this.lastDragPosition=new U,this.firstRatio=0,this.lastAngle=0,this.goalPosition=new U,this.goalYaw=0,this.goalScale=1,this.xDamper=new am,this.yDamper=new am,this.zDamper=new am,this.yawDamper=new am,this.scaleDamper=new am,this.onExitWebXRButtonContainerClick=()=>this.stopPresenting(),this.onUpdateScene=()=>{this.placementBox!=null&&this.isPresenting&&(this.placementBox.dispose(),this.placementBox=new fm(this.presentedScene,this.placeOnWall?`back`:`bottom`))},this.onSelectStart=e=>{let t=this.transientHitTestSource;if(t==null)return;let n=this.frame.getHitTestResultsForTransientInput(t),r=this.presentedScene,i=this.placementBox;if(n.length===1){this.inputSource=e.inputSource;let{axes:t}=this.inputSource.gamepad,n=i.getHit(this.presentedScene,t[0],t[1]);i.show=!0,n==null?this.placeOnWall===!1&&(this.isRotating=!0,this.lastAngle=t[0]*Og):(this.isTranslating=!0,this.lastDragPosition.copy(n))}else if(n.length===2){i.show=!0,this.isTwoFingering=!0;let{separation:e}=this.fingerPolar(n);this.firstRatio=e/r.scale.x}},this.onSelectEnd=()=>{this.isTranslating=!1,this.isRotating=!1,this.isTwoFingering=!1,this.inputSource=null,this.goalPosition.y+=this.placementBox.offsetHeight*this.presentedScene.scale.x,this.placementBox.show=!1},this.threeRenderer=e.threeRenderer,this.threeRenderer.xr.enabled=!0}async resolveARSession(){Bu();let e=await navigator.xr.requestSession(`immersive-ar`,{requiredFeatures:[`hit-test`],optionalFeatures:[`dom-overlay`,`light-estimation`],domOverlay:this.overlay?{root:this.overlay}:void 0});return this.threeRenderer.xr.setReferenceSpaceType(`local`),await this.threeRenderer.xr.setSession(e),this.threeRenderer.xr.cameraAutoUpdate=!1,e}get presentedScene(){return this._presentedScene}async supportsPresentation(){try{return Bu(),await navigator.xr.isSessionSupported(`immersive-ar`)}catch(e){return console.warn(`Request to present in WebXR denied:`),console.warn(e),console.warn(`Falling back to next ar-mode`),!1}}async present(e,t=!1){this.isPresenting&&console.warn(`Cannot present while a model is already presenting`);let n=new Promise((e,t)=>{requestAnimationFrame(()=>e())});e.setHotspotsVisibility(!1),e.queueRender(),await n,this._presentedScene=e,this.overlay=e.element.shadowRoot.querySelector(`div.default`),t===!0&&(this.xrLight=new nm(this.threeRenderer),this.xrLight.addEventListener(`estimationstart`,()=>{if(!this.isPresenting||this.xrLight==null)return;let e=this.presentedScene;e.add(this.xrLight),e.environment=this.xrLight.environment}));let r=await this.resolveARSession();r.addEventListener(`end`,()=>{this.postSessionCleanup()},{once:!0});let i=e.element.shadowRoot.querySelector(`.slot.exit-webxr-ar-button`);i.classList.add(`enabled`),i.addEventListener(`click`,this.onExitWebXRButtonContainerClick),this.exitWebXRButtonContainer=i;let a=await r.requestReferenceSpace(`viewer`);this.tracking=!0,this.frames=0,this.initialized=!1,this.turntableRotation=e.yaw,this.goalYaw=e.yaw,this.goalScale=1,e.setBackground(null),this.oldShadowIntensity=e.shadowIntensity,e.setShadowIntensity(.01),this.oldTarget.copy(e.getTarget()),e.element.addEventListener(`load`,this.onUpdateScene);let o=kg*Math.PI/180,s=this.placeOnWall===!0?void 0:new XRRay(new DOMPoint(0,0,0),{x:0,y:-Math.sin(o),z:-Math.cos(o)});r.requestHitTestSource({space:a,offsetRay:s}).then(e=>{this.initialHitSource=e}),this.currentSession=r,this.placementBox=new fm(e,this.placeOnWall?`back`:`bottom`),this.placementComplete=!1,this.lastTick=performance.now(),this.dispatchEvent({type:`status`,status:Pg.SESSION_STARTED})}async stopPresenting(){if(!this.isPresenting)return;let e=new Promise(e=>{this.resolveCleanup=e});try{await this.currentSession.end(),await e}catch(e){console.warn(`Error while trying to end WebXR AR session`),console.warn(e),this.postSessionCleanup()}}get isPresenting(){return this.presentedScene!=null}get target(){return this.oldTarget}updateTarget(){let e=this.presentedScene;if(e!=null){let t=e.getTarget();this.oldTarget.copy(t),this.placeOnWall?t.z=e.boundingBox.min.z:t.y=e.boundingBox.min.y,e.setTarget(t.x,t.y,t.z)}}postSessionCleanup(){let e=this.currentSession;e!=null&&(e.removeEventListener(`selectstart`,this.onSelectStart),e.removeEventListener(`selectend`,this.onSelectEnd),this.currentSession=null);let t=this.presentedScene;if(this._presentedScene=null,t!=null){let{element:e}=t;this.xrLight!=null&&(t.remove(this.xrLight),this.xrLight.dispose(),this.xrLight=null),t.position.set(0,0,0),t.scale.set(1,1,1),t.setShadowOffset(0);let n=this.turntableRotation;n!=null&&(t.yaw=n);let r=this.oldShadowIntensity;r!=null&&t.setShadowIntensity(r),t.setEnvironmentAndSkybox(e[ed],e[td]);let i=this.oldTarget;t.setTarget(i.x,i.y,i.z),t.xrCamera=null,t.element.removeEventListener(`load`,this.onUpdateScene),t.orientHotspots(0),e.requestUpdate(`cameraTarget`),e.requestUpdate(`maxCameraOrbit`),e[Zb](e.getBoundingClientRect()),requestAnimationFrame(()=>{t.element.dispatchEvent(new CustomEvent(`camera-change`,{detail:{source:wg.NONE}}))})}this.renderer.height=0;let n=this.exitWebXRButtonContainer;n!=null&&(n.classList.remove(`enabled`),n.removeEventListener(`click`,this.onExitWebXRButtonContainerClick),this.exitWebXRButtonContainer=null);let r=this.transientHitTestSource;r!=null&&(r.cancel(),this.transientHitTestSource=null);let i=this.initialHitSource;i!=null&&(i.cancel(),this.initialHitSource=null),this.placementBox!=null&&(this.placementBox.dispose(),this.placementBox=null),this.lastTick=null,this.turntableRotation=null,this.oldShadowIntensity=null,this.frame=null,this.inputSource=null,this.overlay=null,this.resolveCleanup!=null&&this.resolveCleanup(),this.dispatchEvent({type:`status`,status:Pg.NOT_PRESENTING})}updateView(e){let t=this.presentedScene,n=this.threeRenderer.xr;n.updateCamera(zg),t.xrCamera=n.getCamera();let{elements:r}=t.getCamera().matrixWorld;if(t.orientHotspots(Math.atan2(r[1],r[5])),this.initialized||=(this.placeInitially(),!0),e.requestViewportScale&&e.recommendedViewportScale){let t=e.recommendedViewportScale;e.requestViewportScale(Math.max(t,Mg))}let i=n.getBaseLayer();if(i!=null){let t=i instanceof XRWebGLLayer?i.getViewport(e):n.getBinding().getViewSubImage(i,e).viewport;this.threeRenderer.setViewport(t.x,t.y,t.width,t.height)}}placeInitially(){let e=this.presentedScene,{position:t,element:n}=e,r=e.getCamera(),{width:i,height:a}=this.overlay.getBoundingClientRect();e.setSize(i,a),r.projectionMatrixInverse.copy(r.projectionMatrix).invert();let{theta:o,radius:s}=n.getCameraOrbit(),c=r.getWorldDirection(Ig);e.yaw=Math.atan2(-c.x,-c.z)-o,this.goalYaw=e.yaw,t.copy(r.position).add(c.multiplyScalar(s)),this.updateTarget();let l=e.getTarget();t.add(l).sub(this.oldTarget),this.goalPosition.copy(t),e.setHotspotsVisibility(!0);let{session:u}=this.frame;u.addEventListener(`selectstart`,this.onSelectStart),u.addEventListener(`selectend`,this.onSelectEnd),u.requestHitTestSourceForTransientInput({profile:`generic-touchscreen`}).then(e=>{this.transientHitTestSource=e})}getTouchLocation(){let{axes:e}=this.inputSource.gamepad,t=this.placementBox.getExpandedHit(this.presentedScene,e[0],e[1]);return t!=null&&(Ig.copy(t).sub(this.presentedScene.getCamera().position),Ig.length()>Ng)?null:t}getHitPoint(e){let t=this.threeRenderer.xr.getReferenceSpace(),n=e.getPose(t);if(n==null)return null;let r=Lg.fromArray(n.transform.matrix);return this.placeOnWall===!0&&(this.goalYaw=Math.atan2(r.elements[4],r.elements[6])),r.elements[5]>.75===this.placeOnWall?null:Rg.setFromMatrixPosition(r)}moveToFloor(e){let t=this.initialHitSource;if(t==null)return;let n=e.getHitTestResults(t);if(n.length==0)return;let r=n[0],i=this.getHitPoint(r);i!=null&&(this.placementBox.show=!0,this.isTranslating||(this.placeOnWall?this.goalPosition.copy(i):this.goalPosition.y=i.y),t.cancel(),this.initialHitSource=null,this.dispatchEvent({type:`status`,status:Pg.OBJECT_PLACED}))}fingerPolar(e){let t=e[0].inputSource.gamepad.axes,n=e[1].inputSource.gamepad.axes,r=n[0]-t[0],i=n[1]-t[1],a=Math.atan2(i,r),o=this.lastAngle-a;return o>Math.PI?o-=2*Math.PI:o<-Math.PI&&(o+=2*Math.PI),this.lastAngle=a,{separation:Math.sqrt(r*r+i*i),deltaYaw:o}}processInput(e){let t=this.transientHitTestSource;if(t==null||!this.isTranslating&&!this.isTwoFingering&&!this.isRotating)return;let n=e.getHitTestResultsForTransientInput(t),r=this.presentedScene,i=r.scale.x;if(this.isTwoFingering){if(n.length<2)this.isTwoFingering=!1;else{let{separation:e,deltaYaw:t}=this.fingerPolar(n);if(this.placeOnWall===!1&&(this.goalYaw+=t),r.canScale){let t=e/this.firstRatio;this.goalScale=t<Ag&&t>jg?1:t}}return}if(n.length===2){this.isTranslating=!1,this.isRotating=!1,this.isTwoFingering=!0;let{separation:e}=this.fingerPolar(n);this.firstRatio=e/i;return}if(this.isRotating){let e=this.inputSource.gamepad.axes[0]*Og;this.goalYaw+=e-this.lastAngle,this.lastAngle=e}else this.isTranslating&&n.forEach(e=>{if(e.inputSource!==this.inputSource)return;let t=null;if(e.results.length>0&&(t=this.getHitPoint(e.results[0])),t??=this.getTouchLocation(),t!=null){if(this.goalPosition.sub(this.lastDragPosition),this.placeOnWall===!1){let e=t.y-this.lastDragPosition.y;if(e<0){this.placementBox.offsetHeight=e/i,this.presentedScene.setShadowOffset(e);let n=Ig.copy(r.getCamera().position),a=-e/(n.y-t.y);n.multiplyScalar(a),t.multiplyScalar(1-a).add(n)}}this.goalPosition.add(t),this.lastDragPosition.copy(t)}})}moveScene(e){let t=this.presentedScene,{position:n,yaw:r}=t,i=t.boundingSphere.radius,a=this.goalPosition,o=t.scale.x,s=this.placementBox,c=wg.NONE;if(!a.equals(n)||this.goalScale!==o){c=wg.USER_INTERACTION;let{x:r,y:l,z:u}=n;r=this.xDamper.update(r,a.x,e,i),l=this.yDamper.update(l,a.y,e,i),u=this.zDamper.update(u,a.z,e,i),n.set(r,l,u);let d=this.scaleDamper.update(o,this.goalScale,e,1);if(t.scale.set(d,d,d),!this.isTranslating){let e=a.y-l;this.placementComplete&&this.placeOnWall===!1?(s.offsetHeight=e/d,t.setShadowOffset(e)):e===0&&(this.placementComplete=!0,s.show=!1,t.setShadowIntensity(Dg))}}s.updateOpacity(e),t.updateTarget(e),t.yaw=this.yawDamper.update(r,this.goalYaw,e,Math.PI),t.element.dispatchEvent(new CustomEvent(`camera-change`,{detail:{source:c}}))}onWebXRFrame(e,t){this.frame=t,++this.frames;let n=this.threeRenderer.xr.getReferenceSpace(),r=t.getViewerPose(n);r==null&&this.tracking===!0&&this.frames>Eg&&(this.tracking=!1,this.dispatchEvent({type:`tracking`,status:Fg.NOT_TRACKING}));let i=this.presentedScene;if(r==null||i==null||!i.element.loaded){this.threeRenderer.clear();return}this.tracking===!1&&(this.tracking=!0,this.dispatchEvent({type:`tracking`,status:Fg.TRACKING}));let a=!0;for(let n of r.views){if(this.updateView(n),a){this.moveToFloor(t),this.processInput(t);let n=e-this.lastTick;this.moveScene(n),this.renderer.preRender(i,e,n),this.lastTick=e,i.renderShadow(this.threeRenderer)}this.threeRenderer.render(i,i.getCamera()),a=!1}}};function Vg(e){let t=new Map,n=new Map,r=e.clone();return Hg(e,r,function(e,r){t.set(r,e),n.set(e,r)}),r.traverse(function(e){if(!e.isSkinnedMesh)return;let r=e,i=t.get(e),a=i.skeleton.bones;r.skeleton=i.skeleton.clone(),r.bindMatrix.copy(i.bindMatrix),r.skeleton.bones=a.map(function(e){return n.get(e)}),r.bind(r.skeleton,r.bindMatrix)}),r}function Hg(e,t,n){n(e,t);for(let r=0;r<e.children.length;r++)Hg(e.children[r],t.children[r],n)}var Ug=Symbol(`prepared`),Wg=Symbol(`prepare`),Gg=Symbol(`preparedGLTF`),Kg=Symbol(`clone`),qg=class{constructor(e){this[Gg]=e}static prepare(e){if(e.scene==null)throw Error(`Model does not have a scene`);if(e[Ug])return e;let t=this[Wg](e);return t[Ug]=!0,t}static[Wg](e){let{scene:t}=e,n=[t];return Object.assign(Object.assign({},e),{scene:t,scenes:n})}get parser(){return this[Gg].parser}get animations(){return this[Gg].animations}get scene(){return this[Gg].scene}get scenes(){return this[Gg].scenes}get cameras(){return this[Gg].cameras}get asset(){return this[Gg].asset}get userData(){return this[Gg].userData}clone(){let e=this.constructor;return new e(this[Kg]())}dispose(){this.scenes.forEach(e=>{e.traverse(e=>{let t=e;t.material&&((Array.isArray(t.material)?t.material:[t.material]).forEach(e=>{for(let t in e){let n=e[t];if(n instanceof pt){let e=n.source.data;e.close!=null&&e.close(),n.dispose()}}e.dispose()}),t.geometry.dispose())})})}[Kg](){let e=this[Gg],t=Vg(this.scene);Jg(t,this.scene);let n=[t],r=e.userData?Object.assign({},e.userData):{};return Object.assign(Object.assign({},e),{scene:t,scenes:n,userData:r})}},Jg=(e,t)=>{Yg(e,t,(e,t)=>{t.userData.variantMaterials!==void 0&&(e.userData.variantMaterials=new Map(t.userData.variantMaterials)),t.userData.variantData!==void 0&&(e.userData.variantData=t.userData.variantData),t.userData.originalMaterial!==void 0&&(e.userData.originalMaterial=t.userData.originalMaterial)})},Yg=(e,t,n)=>{n(e,t);for(let r=0;r<e.children.length;r++)Yg(e.children[r],t.children[r],n)},Xg=Symbol(`threeGLTF`),Zg=Symbol(`gltf`),Qg=Symbol(`gltfElementMap`),$g=Symbol(`threeObjectMap`),e_=Symbol(`parallelTraverseThreeScene`),t_=Symbol(`correlateOriginalThreeGLTF`),n_=Symbol(`correlateCloneThreeGLTF`),r_=class e{constructor(e,t,n,r){this[Xg]=e,this[Zg]=t,this[Qg]=r,this[$g]=n}static from(e,t){return t==null?this[t_](e):this[n_](e,t)}static[t_](t){let n=t.parser.json,r=t.parser.associations,i=new Map,a={name:`Default`},o={type:`materials`,index:-1};for(let e of r.keys())e instanceof Bn&&r.get(e)==null&&(o.index<0&&(n.materials??=[],o.index=n.materials.length,n.materials.push(a)),e.name=a.name,r.set(e,{materials:o.index}));for(let[e,t]of r){t&&(e.userData=e.userData||{},e.userData.associations=t);for(let r in t)if(r!=null&&r!==`primitives`){let a=r,o=(n[a]||[])[t[a]];if(o==null)continue;let s=i.get(o);s??(s=new Set,i.set(o,s)),s.add(e)}}return new e(t,n,r,i)}static[n_](t,n){let r=n.threeGLTF,i=n.gltf,a=JSON.parse(JSON.stringify(i)),o=new Map,s=new Map;for(let e=0;e<r.scenes.length;e++)this[e_](r.scenes[e],t.scenes[e],(e,t)=>{let r=n.threeObjectMap.get(e);if(r!=null){for(let e in r)if(e!=null&&e!==`primitives`){let n=e,i=r[n],c=a[n][i],l=o.get(t)||{};l[n]=i,o.set(t,l);let u=s.get(c)||new Set;u.add(t),s.set(c,u)}}});return new e(t,a,o,s)}static[e_](e,t,n){let r=(e,t)=>{if(n(e,t),e.isObject3D){let i=e,a=t;if(i.material){if(Array.isArray(i.material))for(let e=0;e<i.material.length;++e)n(i.material[e],a.material[e]);else n(i.material,a.material)}for(let n=0;n<e.children.length;++n)r(e.children[n],t.children[n])}};r(e,t)}get threeGLTF(){return this[Xg]}get gltf(){return this[Zg]}get gltfElementMap(){return this[Qg]}get threeObjectMap(){return this[$g]}},i_=Symbol(`correlatedSceneGraph`),a_=class extends qg{static[Wg](e){let t=super[Wg](e);t[i_]??(t[i_]=r_.from(t));let{scene:n}=t,r=new Bt(void 0,1/0);return n.traverse(e=>{e.renderOrder=1e3,e.frustumCulled=!1,e.name||=e.uuid;let n=e;if(n.material){let{geometry:e}=n;n.castShadow=!0,n.isSkinnedMesh&&(e.boundingSphere=r,e.boundingBox=null);let i=n.material;if(i.isMeshBasicMaterial===!0&&(i.toneMapped=!1),i.shadowSide=0,i.aoMap){let{gltf:n,threeObjectMap:r}=t[i_],a=r.get(i);if(n.materials!=null&&a!=null&&a.materials!=null){let t=n.materials[a.materials];t.occlusionTexture&&t.occlusionTexture.texCoord===0&&e.attributes.uv!=null&&e.setAttribute(`uv2`,e.attributes.uv)}}}}),t}get correlatedSceneGraph(){return this[Gg][i_]}[Kg](){let e=super[Kg](),t=new Map;return e.scene.traverse(e=>{let n=e;if(n.material){let e=n.material;if(e!=null){if(t.has(e.uuid)){n.material=t.get(e.uuid);return}n.material=e.clone(),t.set(e.uuid,n.material)}}let r=e;r.target!==void 0&&r.add(r.target)}),e[i_]=r_.from(e,this.correlatedSceneGraph),e}},o_=(e,t,n)=>{let r;switch(e){case h:r=new Uint8ClampedArray(t*n*4);break;case x:r=new Uint16Array(t*n*4);break;case y:r=new Uint32Array(t*n*4);break;case g:r=new Int8Array(t*n*4);break;case _:r=new Int16Array(t*n*4);break;case v:r=new Int32Array(t*n*4);break;case b:r=new Float32Array(t*n*4);break;default:throw Error(`Unsupported data type`)}return r},s_,c_=(e,t,n,r)=>{if(s_!==void 0)return s_;let i=new gt(1,1,r);t.setRenderTarget(i);let a=new wr(new ti,new Vn({color:16777215}));t.render(a,n),t.setRenderTarget(null);let o=o_(e,i.width,i.height);return t.readRenderTargetPixels(i,0,0,i.width,i.height,o),i.dispose(),a.geometry.dispose(),a.material.dispose(),s_=o[0]!==0,s_},l_=class e{_renderer;_rendererIsDisposable=!1;_material;_scene;_camera;_quad;_renderTarget;_width;_height;_type;_colorSpace;_supportsReadPixels=!0;constructor(t){this._width=t.width,this._height=t.height,this._type=t.type,this._colorSpace=t.colorSpace;let n={format:C,depthBuffer:!1,stencilBuffer:!1,type:this._type,colorSpace:this._colorSpace,anisotropy:t.renderTargetOptions?.anisotropy===void 0?1:t.renderTargetOptions?.anisotropy,generateMipmaps:t.renderTargetOptions?.generateMipmaps!==void 0&&t.renderTargetOptions?.generateMipmaps,magFilter:t.renderTargetOptions?.magFilter===void 0?d:t.renderTargetOptions?.magFilter,minFilter:t.renderTargetOptions?.minFilter===void 0?d:t.renderTargetOptions?.minFilter,samples:t.renderTargetOptions?.samples===void 0?void 0:t.renderTargetOptions?.samples,wrapS:t.renderTargetOptions?.wrapS===void 0?o:t.renderTargetOptions?.wrapS,wrapT:t.renderTargetOptions?.wrapT===void 0?o:t.renderTargetOptions?.wrapT};if(this._material=t.material,t.renderer?this._renderer=t.renderer:(this._renderer=e.instantiateRenderer(),this._rendererIsDisposable=!0),this._scene=new os,this._camera=new fi,this._camera.position.set(0,0,10),this._camera.left=-.5,this._camera.right=.5,this._camera.top=.5,this._camera.bottom=-.5,this._camera.updateProjectionMatrix(),!c_(this._type,this._renderer,this._camera,n)){let e;switch(this._type){case x:e=this._renderer.extensions.has(`EXT_color_buffer_float`)?b:void 0}e===void 0?(this._supportsReadPixels=!1,console.warn(`This browser dos not support toArray or toDataTexture, calls to those methods will result in an error thrown`)):(console.warn(`This browser does not support reading pixels from ${this._type} RenderTargets, switching to ${b}`),this._type=e)}this._quad=new wr(new ti,this._material),this._quad.geometry.computeBoundingBox(),this._scene.add(this._quad),this._renderTarget=new gt(this.width,this.height,n),this._renderTarget.texture.mapping=t.renderTargetOptions?.mapping===void 0?300:t.renderTargetOptions?.mapping}static instantiateRenderer(){let e=new as;return e.setSize(128,128),e}render=()=>{this._renderer.setRenderTarget(this._renderTarget);try{this._renderer.render(this._scene,this._camera)}catch(e){throw this._renderer.setRenderTarget(null),e}this._renderer.setRenderTarget(null)};toArray(){if(!this._supportsReadPixels)throw Error(`Can't read pixels in this browser`);let e=o_(this._type,this._width,this._height);return this._renderer.readRenderTargetPixels(this._renderTarget,0,0,this._width,this._height,e),e}toDataTexture(e){let t=new xs(this.toArray(),this.width,this.height,C,this._type,e?.mapping||300,e?.wrapS||1001,e?.wrapT||1001,e?.magFilter||1006,e?.minFilter||1006,e?.anisotropy||1,me);return t.generateMipmaps=e?.generateMipmaps!==void 0&&e?.generateMipmaps,t}disposeOnDemandRenderer(){this._renderer.setRenderTarget(null),this._rendererIsDisposable&&(this._renderer.dispose(),this._renderer.forceContextLoss())}dispose(e){this.disposeOnDemandRenderer(),e&&this.renderTarget.dispose(),this.material instanceof Fr&&Object.values(this.material.uniforms).forEach(e=>{e.value instanceof pt&&e.value.dispose()}),Object.values(this.material).forEach(e=>{e instanceof pt&&e.dispose()}),this.material.dispose(),this._quad.geometry.dispose()}get width(){return this._width}set width(e){this._width=e,this._renderTarget.setSize(this._width,this._height)}get height(){return this._height}set height(e){this._height=e,this._renderTarget.setSize(this._width,this._height)}get renderer(){return this._renderer}get renderTarget(){return this._renderTarget}set renderTarget(e){this._renderTarget=e,this._width=e.width,this._height=e.height}get material(){return this._material}get type(){return this._type}get colorSpace(){return this._colorSpace}},u_=`urn:iso:std:iso:ts:21496:-1\0`,d_=128,f_=8,p_=4,m_=e=>{let t=new DataView(e.buffer,e.byteOffset,e.byteLength),n=0,r=()=>{let e=t.getUint16(n);return n+=2,e},i=()=>{let e=t.getUint32(n);return n+=4,e},a=()=>{let e=t.getInt32(n);return n+=4,e},o=r();if(o!==0)throw Error(`Unsupported ISO 21496-1 minimum_version ${o}`);r();let s=t.getUint8(n++);if(s&p_)throw Error(`ISO 21496-1 metadata with HDR base image is not supported`);let c=s&d_?3:1,l=s&f_?i():void 0,u=e=>{let t=e?a():i(),n=l??i();if(n===0)throw Error(`Invalid ISO 21496-1 fraction with zero denominator`);return t/n},d=u(!1),f=u(!1);if(d>f)throw Error(`ISO 21496-1 metadata with HDR base image is not supported`);let p=[],m=[],h=[],g=[],_=[];for(let e=0;e<c;e++)p.push(u(!0)),m.push(u(!0)),h.push(u(!1)),g.push(u(!0)),_.push(u(!0));let v=e=>c===3?e:[e[0],e[0],e[0]];return{gainMapMin:v(p),gainMapMax:v(m),gamma:v(h),offsetSdr:v(g),offsetHdr:v(_),hdrCapacityMin:d,hdrCapacityMax:f}},h_=class extends Error{},g_=class extends Error{},__=Array.from(u_,e=>e.charCodeAt(0)),v_=e=>{let t=new DataView(e.buffer,e.byteOffset,e.byteLength),n=4+__.length;for(let r=0;r+n<e.length;r++){if(e[r]!==255||e[r+1]!==226||!__.every((t,n)=>e[r+4+n]===t))continue;let i=Math.min(e.length,r+2+t.getUint16(r+2));if(!(i-(r+n)<=4))try{return m_(e.subarray(r+n,i))}catch{return}}},y_=(e,t,n)=>{let r=RegExp(`${t}="([^"]*)"`,`i`).exec(e);if(r)return r[1];let i=RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`,`i`).exec(e);if(i){let e=i[1].match(/<rdf:li>([^<]*)<\/rdf:li>/g);return e&&e.length===3?e.map(e=>e.replace(/<\/?rdf:li>/g,``)):i[1].trim()}if(n!==void 0)return n;throw Error(`Can't find ${t} in gainmap metadata`)},b_=e=>{let t;t=typeof TextDecoder<`u`?new TextDecoder().decode(e):e.toString();let n=t.indexOf(`<x:xmpmeta`);for(;n!==-1;){let e=t.indexOf(`x:xmpmeta>`,n),r=t.slice(n,e+10);try{let e=y_(r,`hdrgm:GainMapMin`,`0`),t=y_(r,`hdrgm:GainMapMax`),n=y_(r,`hdrgm:Gamma`,`1`),i=y_(r,`hdrgm:OffsetSDR`,`0.015625`),a=y_(r,`hdrgm:OffsetHDR`,`0.015625`),o=/hdrgm:HDRCapacityMin="([^"]*)"/.exec(r),s=o?o[1]:`0`,c=/hdrgm:HDRCapacityMax="([^"]*)"/.exec(r);if(!c)throw Error(`Incomplete gainmap metadata`);let l=c[1];return{gainMapMin:Array.isArray(e)?e.map(e=>parseFloat(e)):[parseFloat(e),parseFloat(e),parseFloat(e)],gainMapMax:Array.isArray(t)?t.map(e=>parseFloat(e)):[parseFloat(t),parseFloat(t),parseFloat(t)],gamma:Array.isArray(n)?n.map(e=>parseFloat(e)):[parseFloat(n),parseFloat(n),parseFloat(n)],offsetSdr:Array.isArray(i)?i.map(e=>parseFloat(e)):[parseFloat(i),parseFloat(i),parseFloat(i)],offsetHdr:Array.isArray(a)?a.map(e=>parseFloat(e)):[parseFloat(a),parseFloat(a),parseFloat(a)],hdrCapacityMin:parseFloat(s),hdrCapacityMax:parseFloat(l)}}catch{}n=t.indexOf(`<x:xmpmeta`,e)}},x_=class{options;constructor(e){this.options={debug:e&&e.debug!==void 0?e.debug:!1,extractFII:e&&e.extractFII!==void 0?e.extractFII:!0,extractNonFII:e&&e.extractNonFII!==void 0?e.extractNonFII:!0}}extract(e){return new Promise((t,n)=>{let r=this.options.debug,i=new DataView(e.buffer);if(i.getUint16(0)!==65496){n(Error(`Not a valid jpeg`));return}let a=i.byteLength,o=2,s=0,c;for(;o<a;){if(++s>250){n(Error(`Found no marker after ${s} loops 😵`));return}if(i.getUint8(o)!==255){n(Error(`Not a valid marker at offset 0x${o.toString(16)}, found: 0x${i.getUint8(o).toString(16)}`));return}if(c=i.getUint8(o+1),r&&console.log(`Marker: ${c.toString(16)}`),c===226){r&&console.log(`Found APP2 marker (0xffe2)`);let e=o+4;if(i.getUint32(e)===1297106432){let r=e+4,a;if(i.getUint16(r)===18761)a=!1;else if(i.getUint16(r)===19789)a=!0;else{n(Error(`No valid endianness marker found in TIFF header`));return}if(i.getUint16(r+2,!a)!==42){n(Error(`Not valid TIFF data! (no 0x002A marker)`));return}let o=i.getUint32(r+4,!a);if(o<8){n(Error(`Not valid TIFF data! (First offset less than 8)`));return}let s=r+o,c=i.getUint16(s,!a),l=s+2,u=0;for(let e=l;e<l+12*c;e+=12)i.getUint16(e,!a)===45057&&(u=i.getUint32(e+8,!a));let d=s+2+c*12+4,f=[];for(let e=d;e<d+u*16;e+=16){let t={MPType:i.getUint32(e,!a),size:i.getUint32(e+4,!a),dataOffset:i.getUint32(e+8,!a),dependantImages:i.getUint32(e+12,!a),start:-1,end:-1,isFII:!1};t.dataOffset?(t.start=r+t.dataOffset,t.isFII=!1):(t.start=0,t.isFII=!0),t.end=t.start+t.size,f.push(t)}if(this.options.extractNonFII&&f.length){let e=new Blob([i]),n=[];for(let t of f){if(t.isFII&&!this.options.extractFII)continue;let r=e.slice(t.start,t.end+1,`image/jpeg`);n.push(r)}t(n)}}}o+=2+i.getUint16(o+2)}})}},S_=async e=>{let t=v_(e)??b_(e);if(!t)throw new g_(`Gain map XMP metadata not found`);let n=await new x_({extractFII:!0,extractNonFII:!0}).extract(e);if(n.length!==2)throw new h_(`Gain map recovery image not found`);return{sdr:new Uint8Array(await n[0].arrayBuffer()),gainMap:new Uint8Array(await n[1].arrayBuffer()),metadata:t}},C_=e=>new Promise((t,n)=>{let r=document.createElement(`img`);r.onload=()=>{t(r)},r.onerror=e=>{n(e)},r.src=URL.createObjectURL(e)}),w_=async(e,t,n)=>{let r=t?new Blob([t],{type:`image/jpeg`}):void 0,i=new Blob([e],{type:`image/jpeg`}),a,o,s=!1;if(typeof createImageBitmap>`u`){let e=await Promise.all([r?C_(r):Promise.resolve(void 0),C_(i)]);o=e[0],a=e[1],s=n===`flipY`}else{let e=await Promise.all([r?createImageBitmap(r,{imageOrientation:n||`flipY`}):Promise.resolve(void 0),createImageBitmap(i,{imageOrientation:n||`flipY`})]);o=e[0],a=e[1]}return{sdrImage:a,gainMapImage:o,needsFlip:s}},T_=(e,t,n)=>{let r=new pt(t||new ImageData(2,2),300,o,o,d,m,C,h,1,me);r.flipY=n,r.needsUpdate=!0;let i=new pt(e,300,o,o,d,m,C,h,1,pe);return i.flipY=n,i.needsUpdate=!0,{gainMap:r,sdr:i}},E_=class extends kc{_renderer;_renderTargetOptions;_internalLoadingManager;_config;constructor(e,t){super(t),this._config=e,e.renderer&&(this._renderer=e.renderer),this._internalLoadingManager=new Dc}setRenderer(e){return this._renderer=e,this}setRenderTargetOptions(e){return this._renderTargetOptions=e,this}prepareQuadRenderer(){this._renderer||console.warn(`WARNING: A Renderer was not passed to this Loader constructor or in setRenderer, the result of this Loader will need to be converted to a Data Texture with toDataTexture() before you can use it in your renderer.`);let e=this._config.createMaterial({gainMapMax:[1,1,1],gainMapMin:[0,0,0],gamma:[1,1,1],offsetHdr:[1,1,1],offsetSdr:[1,1,1],hdrCapacityMax:1,hdrCapacityMin:0,maxDisplayBoost:1,gainMap:new pt,sdr:new pt});return this._config.createQuadRenderer({width:16,height:16,type:x,colorSpace:me,material:e,renderer:this._renderer,renderTargetOptions:this._renderTargetOptions})}processImages(e,t,n){return w_(e,t,n)}createTextures(e,t,n){return T_(e,t,n)}updateQuadRenderer(e,t,n,r,i){e.width=t.width,e.height=t.height,e.material.gainMap=n,e.material.sdr=r,e.material.gainMapMin=i.gainMapMin,e.material.gainMapMax=i.gainMapMax,e.material.offsetHdr=i.offsetHdr,e.material.offsetSdr=i.offsetSdr,e.material.gamma=i.gamma,e.material.hdrCapacityMin=i.hdrCapacityMin,e.material.hdrCapacityMax=i.hdrCapacityMax,e.material.maxDisplayBoost=2**i.hdrCapacityMax,e.material.needsUpdate=!0}},D_=`
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,O_=`
// min half float value
#define HALF_FLOAT_MIN vec3( -65504, -65504, -65504 )
// max half float value
#define HALF_FLOAT_MAX vec3( 65504, 65504, 65504 )

uniform sampler2D sdr;
uniform sampler2D gainMap;
uniform vec3 gamma;
uniform vec3 offsetHdr;
uniform vec3 offsetSdr;
uniform vec3 gainMapMin;
uniform vec3 gainMapMax;
uniform float weightFactor;

varying vec2 vUv;

void main() {
  vec3 rgb = texture2D( sdr, vUv ).rgb;
  vec3 recovery = texture2D( gainMap, vUv ).rgb;
  vec3 logRecovery = pow( recovery, gamma );
  vec3 logBoost = gainMapMin * ( 1.0 - logRecovery ) + gainMapMax * logRecovery;
  vec3 hdrColor = (rgb + offsetSdr) * exp2( logBoost * weightFactor ) - offsetHdr;
  vec3 clampedHdrColor = max( HALF_FLOAT_MIN, min( HALF_FLOAT_MAX, hdrColor ));
  gl_FragColor = vec4( clampedHdrColor , 1.0 );
}
`,k_=class extends Fr{_maxDisplayBoost;_hdrCapacityMin;_hdrCapacityMax;constructor({gamma:e,offsetHdr:t,offsetSdr:n,gainMapMin:r,gainMapMax:i,maxDisplayBoost:a,hdrCapacityMin:o,hdrCapacityMax:s,sdr:c,gainMap:l}){super({name:`GainMapDecoderMaterial`,vertexShader:D_,fragmentShader:O_,uniforms:{sdr:{value:c},gainMap:{value:l},gamma:{value:new U(1/e[0],1/e[1],1/e[2])},offsetHdr:{value:new U().fromArray(t)},offsetSdr:{value:new U().fromArray(n)},gainMapMin:{value:new U().fromArray(r)},gainMapMax:{value:new U().fromArray(i)},weightFactor:{value:(Math.log2(a)-o)/(s-o)}},blending:0,depthTest:!1,depthWrite:!1}),this._maxDisplayBoost=a,this._hdrCapacityMin=o,this._hdrCapacityMax=s,this.needsUpdate=!0,this.uniformsNeedUpdate=!0}get sdr(){return this.uniforms.sdr.value}set sdr(e){this.uniforms.sdr.value=e}get gainMap(){return this.uniforms.gainMap.value}set gainMap(e){this.uniforms.gainMap.value=e}get offsetHdr(){return this.uniforms.offsetHdr.value.toArray()}set offsetHdr(e){this.uniforms.offsetHdr.value.fromArray(e)}get offsetSdr(){return this.uniforms.offsetSdr.value.toArray()}set offsetSdr(e){this.uniforms.offsetSdr.value.fromArray(e)}get gainMapMin(){return this.uniforms.gainMapMin.value.toArray()}set gainMapMin(e){this.uniforms.gainMapMin.value.fromArray(e)}get gainMapMax(){return this.uniforms.gainMapMax.value.toArray()}set gainMapMax(e){this.uniforms.gainMapMax.value.fromArray(e)}get gamma(){let e=this.uniforms.gamma.value;return[1/e.x,1/e.y,1/e.z]}set gamma(e){let t=this.uniforms.gamma.value;t.x=1/e[0],t.y=1/e[1],t.z=1/e[2]}get hdrCapacityMin(){return this._hdrCapacityMin}set hdrCapacityMin(e){this._hdrCapacityMin=e,this.calculateWeight()}get hdrCapacityMax(){return this._hdrCapacityMax}set hdrCapacityMax(e){this._hdrCapacityMax=e,this.calculateWeight()}get maxDisplayBoost(){return this._maxDisplayBoost}set maxDisplayBoost(e){this._maxDisplayBoost=Math.max(1,Math.min(65504,e)),this.calculateWeight()}calculateWeight(){let e=(Math.log2(this._maxDisplayBoost)-this._hdrCapacityMin)/(this._hdrCapacityMax-this._hdrCapacityMin);this.uniforms.weightFactor.value=Math.max(0,Math.min(1,e))}},A_=class extends E_{constructor(e,t){super({renderer:e,createMaterial:e=>new k_(e),createQuadRenderer:e=>new l_(e)},t)}async render(e,t,n,r){let{sdrImage:i,gainMapImage:a,needsFlip:o}=await this.processImages(n,r,`flipY`),{gainMap:s,sdr:c}=this.createTextures(i,a,o);this.updateQuadRenderer(e,i,s,c,t),e.render()}},j_=class extends A_{load(e,t,n,r){let i=this.prepareQuadRenderer(),a=new Mc(this._internalLoadingManager);return a.setResponseType(`arraybuffer`),a.setRequestHeader(this.requestHeader),a.setPath(this.path),a.setWithCredentials(this.withCredentials),this.manager.itemStart(e),a.load(e,async n=>{if(typeof n==`string`)throw Error(`Invalid buffer, received [string], was expecting [ArrayBuffer]`);let a=new Uint8Array(n),o,s,c;try{let e=await S_(a);o=e.sdr,s=e.gainMap,c=e.metadata}catch(t){if(t instanceof g_||t instanceof h_)console.warn(`Failure to reconstruct an HDR image from ${e}: Gain map metadata not found in the file, HDRJPGLoader will render the SDR jpeg`),c={gainMapMin:[0,0,0],gainMapMax:[1,1,1],gamma:[1,1,1],hdrCapacityMin:0,hdrCapacityMax:1,offsetHdr:[0,0,0],offsetSdr:[0,0,0]},o=a;else throw t}try{await this.render(i,c,o.buffer,s?.buffer)}catch(t){this.manager.itemError(e),typeof r==`function`&&r(t),i.disposeOnDemandRenderer();return}typeof t==`function`&&t(i),this.manager.itemEnd(e),i.disposeOnDemandRenderer()},n,t=>{this.manager.itemError(e),typeof r==`function`&&r(t)}),i}},M_=class extends Pc{constructor(e){super(e),this.type=x}parse(e){let t=function(e,t){switch(e){case 1:throw Error(`THREE.RGBELoader: Read Error: `+(t||``));case 2:throw Error(`THREE.RGBELoader: Write Error: `+(t||``));case 3:throw Error(`THREE.RGBELoader: Bad File Format: `+(t||``));default:case 4:throw Error(`THREE.RGBELoader: Memory Error: `+(t||``))}},n=function(e,t,n){t||=1024;let r=e.pos,i=-1,a=0,o=``,s=String.fromCharCode.apply(null,new Uint16Array(e.subarray(r,r+128)));for(;0>(i=s.indexOf(`
`))&&a<t&&r<e.byteLength;)o+=s,a+=s.length,r+=128,s+=String.fromCharCode.apply(null,new Uint16Array(e.subarray(r,r+128)));return-1<i&&(!1!==n&&(e.pos+=a+i+1),o+s.slice(0,i))},r=function(e){let r=/^#\?(\S+)/,i=/^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,a=/^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,o=/^\s*FORMAT=(\S+)\s*$/,s=/^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,c={valid:0,string:``,comments:``,programtype:`RGBE`,format:``,gamma:1,exposure:1,width:0,height:0},l,u;for((e.pos>=e.byteLength||!(l=n(e)))&&t(1,`no header found`),(u=l.match(r))||t(3,`bad initial token`),c.valid|=1,c.programtype=u[1],c.string+=l+`
`;l=n(e),!1!==l;){if(c.string+=l+`
`,l.charAt(0)===`#`){c.comments+=l+`
`;continue}if((u=l.match(i))&&(c.gamma=parseFloat(u[1])),(u=l.match(a))&&(c.exposure=parseFloat(u[1])),(u=l.match(o))&&(c.valid|=2,c.format=u[1]),(u=l.match(s))&&(c.valid|=4,c.height=parseInt(u[1],10),c.width=parseInt(u[2],10)),c.valid&2&&c.valid&4)break}return c.valid&2||t(3,`missing format specifier`),c.valid&4||t(3,`missing image size specifier`),c},i=function(e,n,r){let i=n;if(i<8||i>32767||e[0]!==2||e[1]!==2||e[2]&128)return new Uint8Array(e);i!==(e[2]<<8|e[3])&&t(3,`wrong scanline width`);let a=new Uint8Array(4*n*r);a.length||t(4,`unable to allocate buffer space`);let o=0,s=0,c=4*i,l=new Uint8Array(4),u=new Uint8Array(c),d=r;for(;d>0&&s<e.byteLength;){s+4>e.byteLength&&t(1),l[0]=e[s++],l[1]=e[s++],l[2]=e[s++],l[3]=e[s++],(l[0]!=2||l[1]!=2||(l[2]<<8|l[3])!=i)&&t(3,`bad rgbe scanline format`);let n=0,r;for(;n<c&&s<e.byteLength;){r=e[s++];let i=r>128;if(i&&(r-=128),(r===0||n+r>c)&&t(3,`bad scanline data`),i){let t=e[s++];for(let e=0;e<r;e++)u[n++]=t}else u.set(e.subarray(s,s+r),n),n+=r,s+=r}let f=i;for(let e=0;e<f;e++){let t=0;a[o]=u[e+t],t+=i,a[o+1]=u[e+t],t+=i,a[o+2]=u[e+t],t+=i,a[o+3]=u[e+t],o+=4}d--}return a},a=function(e,t,n,r){let i=2**(e[t+3]-128)/255;n[r+0]=e[t+0]*i,n[r+1]=e[t+1]*i,n[r+2]=e[t+2]*i,n[r+3]=1},o=function(e,t,n,r){let i=2**(e[t+3]-128)/255;n[r+0]=Kn.toHalfFloat(Math.min(e[t+0]*i,65504)),n[r+1]=Kn.toHalfFloat(Math.min(e[t+1]*i,65504)),n[r+2]=Kn.toHalfFloat(Math.min(e[t+2]*i,65504)),n[r+3]=Kn.toHalfFloat(1)},s=new Uint8Array(e);s.pos=0;let c=r(s),l=c.width,u=c.height,d=i(s.subarray(s.pos),l,u),f,p,m;switch(this.type){case b:m=d.length/4;let e=new Float32Array(m*4);for(let t=0;t<m;t++)a(d,t*4,e,t*4);f=e,p=b;break;case x:m=d.length/4;let t=new Uint16Array(m*4);for(let e=0;e<m;e++)o(d,e*4,t,e*4);f=t,p=x;break;default:throw Error(`THREE.RGBELoader: Unsupported type: `+this.type)}return{width:l,height:u,data:f,header:c.string,gamma:c.gamma,exposure:c.exposure,type:p}}setDataType(e){return this.type=e,this}load(e,t,n,r){function i(e,n){switch(e.type){case b:case x:e.colorSpace=me,e.minFilter=d,e.magFilter=d,e.generateMipmaps=!1,e.flipY=!0}t&&t(e,n)}return super.load(e,i,n,r)}},N_={topLight:{intensity:500,position:[.418,16.199,.3]},room:{position:[-.757,13.219,.717],scale:[31.713,28.305,28.591]},boxes:[{position:[-10.906,2.009,1.846],rotation:-.195,scale:[2.328,7.905,4.651]},{position:[-5.607,-.754,-.758],rotation:.994,scale:[1.97,1.534,3.955]},{position:[6.167,.857,7.803],rotation:.561,scale:[3.927,6.285,3.687]},{position:[-2.017,.018,6.124],rotation:.333,scale:[2.002,4.566,2.064]},{position:[2.291,-.756,-2.621],rotation:-.286,scale:[1.546,1.552,1.496]},{position:[-2.193,-.369,-5.547],rotation:.516,scale:[3.875,3.487,2.986]}],lights:[{intensity:50,position:[-16.116,14.37,8.208],scale:[.1,2.428,2.739]},{intensity:50,position:[-16.109,18.021,-8.207],scale:[.1,2.425,2.751]},{intensity:17,position:[14.904,12.198,-1.832],scale:[.15,4.265,6.331]},{intensity:43,position:[-.462,8.89,14.52],scale:[4.38,5.441,.088]},{intensity:20,position:[3.235,11.486,-12.541],scale:[2.5,2,.1]},{intensity:100,position:[0,20,0],scale:[1,.1,1]}]},P_={topLight:{intensity:400,position:[.5,14,.5]},room:{position:[0,13.2,0],scale:[31.5,28.5,31.5]},boxes:[{position:[-10.906,-1,1.846],rotation:-.195,scale:[2.328,7.905,4.651]},{position:[-5.607,-.754,-.758],rotation:.994,scale:[1.97,1.534,3.955]},{position:[6.167,-.16,7.803],rotation:.561,scale:[3.927,6.285,3.687]},{position:[-2.017,.018,6.124],rotation:.333,scale:[2.002,4.566,2.064]},{position:[2.291,-.756,-2.621],rotation:-.286,scale:[1.546,1.552,1.496]},{position:[-2.193,-.369,-5.547],rotation:.516,scale:[3.875,3.487,2.986]}],lights:[{intensity:80,position:[-14,10,8],scale:[.1,2.5,2.5]},{intensity:80,position:[-14,14,-4],scale:[.1,2.5,2.5]},{intensity:23,position:[14,12,0],scale:[.1,5,5]},{intensity:16,position:[0,9,14],scale:[5,5,.1]},{intensity:80,position:[7,8,-14],scale:[2.5,2.5,.1]},{intensity:80,position:[-7,16,-14],scale:[2.5,2.5,.1]},{intensity:1,position:[0,20,0],scale:[.1,.1,.1]}]},F_=class extends os{constructor(e){super(),this.position.y=-3.5;let t=new Dr;t.deleteAttribute(`uv`);let n=new ic({metalness:0,side:1}),r=new ic({metalness:0}),i=e==`legacy`?N_:P_,a=new qc(16777215,i.topLight.intensity,28,2);a.position.set(...i.topLight.position),this.add(a);let o=new wr(t,n);o.position.set(...i.room.position),o.scale.set(...i.room.scale),this.add(o);for(let e of i.boxes){let n=new wr(t,r);n.position.set(...e.position),n.rotation.set(0,e.rotation,0),n.scale.set(...e.scale),this.add(n)}for(let e of i.lights){let n=new wr(t,this.createAreaLightMaterial(e.intensity));n.position.set(...e.position),n.scale.set(...e.scale),this.add(n)}}createAreaLightMaterial(e){let t=new Vn;return t.color.setScalar(e),t}},I_=.04,L_=20,R_=/\.hdr(\.js)?$/,z_=class{constructor(e){this.threeRenderer=e,this.lottieLoaderUrl=``,this.withCredentials=!1,this._ldrLoader=null,this._imageLoader=null,this._hdrLoader=null,this._lottieLoader=null,this.generatedEnvironmentMap=null,this.generatedEnvironmentMapAlt=null,this.skyboxCache=new Map,this.blurMaterial=null,this.blurScene=null}get ldrLoader(){return this._ldrLoader??=new Fc,this._ldrLoader.setWithCredentials(this.withCredentials),this._ldrLoader}get imageLoader(){return this._imageLoader??=new j_(this.threeRenderer),this._imageLoader.setWithCredentials(this.withCredentials),this._imageLoader}get hdrLoader(){return this._hdrLoader??(this._hdrLoader=new M_,this._hdrLoader.setDataType(x)),this._hdrLoader.setWithCredentials(this.withCredentials),this._hdrLoader}async getLottieLoader(){if(this._lottieLoader==null){let{LottieLoader:t}=await e(async()=>{let{LottieLoader:e}=await import(this.lottieLoaderUrl);return{LottieLoader:e}},[]);this._lottieLoader=new t}return this._lottieLoader.setWithCredentials(this.withCredentials),this._lottieLoader}async loadImage(e){let t=await new Promise((t,n)=>this.ldrLoader.load(e,t,()=>{},n));return t.name=e,t.flipY=!1,t}async loadLottie(e,t){let n=await this.getLottieLoader();n.setQuality(t);let r=await new Promise((t,r)=>n.load(e,t,()=>{},r));return r.name=e,r}async loadEquirect(e,t=()=>{}){try{let n=R_.test(e),r=n?this.hdrLoader:this.imageLoader,i=await new Promise((n,i)=>r.load(e,e=>{let{renderTarget:t}=e;if(t!=null){let{texture:r}=t;e.dispose(!1),n(r)}else n(e)},e=>{t(e.loaded/e.total*.9)},i));return t(1),i.name=e,i.mapping=303,n||(i.colorSpace=pe),i}finally{t&&t(1)}}async generateEnvironmentMapAndSkybox(e=null,t=null,n=()=>{}){let r=t!==`legacy`;(t===`legacy`||t===`neutral`)&&(t=null),t=zu(t);let i=Promise.resolve(null),a;e&&(i=this.loadEquirectFromUrl(e,n)),a=t?this.loadEquirectFromUrl(t,n):e?this.loadEquirectFromUrl(e,n):r?this.loadGeneratedEnvironmentMapAlt():this.loadGeneratedEnvironmentMap();let[o,s]=await Promise.all([a,i]);if(o==null)throw Error(`Failed to load environment map.`);return{environmentMap:o,skybox:s}}async loadEquirectFromUrl(e,t){if(!this.skyboxCache.has(e)){let n=this.loadEquirect(e,t);this.skyboxCache.set(e,n)}return this.skyboxCache.get(e)}async GenerateEnvironmentMap(e,t){await qu();let n=this.threeRenderer,r=new Gr(256,{generateMipmaps:!1,type:x,format:C,colorSpace:me,depthBuffer:!0}),i=new Ur(.1,100,r),a=i.renderTarget.texture;a.name=t;let o=n.outputColorSpace,s=n.toneMapping;return n.toneMapping=0,n.outputColorSpace=me,i.update(n,e),this.blurCubemap(r,I_),n.toneMapping=s,n.outputColorSpace=o,a}async loadGeneratedEnvironmentMap(){return this.generatedEnvironmentMap??=this.GenerateEnvironmentMap(new F_(`legacy`),`legacy`),this.generatedEnvironmentMap}async loadGeneratedEnvironmentMapAlt(){return this.generatedEnvironmentMapAlt??=this.GenerateEnvironmentMap(new F_(`neutral`),`neutral`),this.generatedEnvironmentMapAlt}blurCubemap(e,t){if(this.blurMaterial==null){this.blurMaterial=this.getBlurShader(L_);let e=new wr(new Dr,this.blurMaterial);this.blurScene=new os,this.blurScene.add(e)}let n=e.clone();this.halfblur(e,n,t,`latitudinal`),this.halfblur(n,e,t,`longitudinal`)}halfblur(e,t,n,r){let i=e.width,a=isFinite(n)?Math.PI/(2*i):2*Math.PI/39,o=n/a,s=isFinite(n)?1+Math.floor(3*o):L_;s>L_&&console.warn(`sigmaRadians, ${n}, is too large and will clip, as it requested ${s} samples when the maximum is set to ${L_}`);let c=[],l=0;for(let e=0;e<L_;++e){let t=e/o,n=Math.exp(-t*t/2);c.push(n),e==0?l+=n:e<s&&(l+=2*n)}for(let e=0;e<c.length;e++)c[e]=c[e]/l;let u=this.blurMaterial.uniforms;u.envMap.value=e.texture,u.samples.value=s,u.weights.value=c,u.latitudinal.value=r===`latitudinal`,u.dTheta.value=a,new Ur(.1,100,t).update(this.threeRenderer,this.blurScene)}getBlurShader(e){let t=new Float32Array(e),n=new U(0,1,0);return new Fr({name:`SphericalGaussianBlur`,defines:{n:e},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:t},latitudinal:{value:!1},dTheta:{value:0},poleAxis:{value:n}},vertexShader:`
      
      varying vec3 vOutputDirection;
  
      void main() {
  
        vOutputDirection = vec3( position );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  
      }
    `,fragmentShader:`
        varying vec3 vOutputDirection;
  
        uniform samplerCube envMap;
        uniform int samples;
        uniform float weights[ n ];
        uniform bool latitudinal;
        uniform float dTheta;
        uniform vec3 poleAxis;
  
        vec3 getSample( float theta, vec3 axis ) {
  
          float cosTheta = cos( theta );
          // Rodrigues' axis-angle rotation
          vec3 sampleDirection = vOutputDirection * cosTheta
            + cross( axis, vOutputDirection ) * sin( theta )
            + axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );
  
          return vec3( textureCube( envMap, sampleDirection ) );
  
        }
  
        void main() {
  
          vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );
  
          if ( all( equal( axis, vec3( 0.0 ) ) ) ) {
  
            axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );
  
          }
  
          axis = normalize( axis );
  
          gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
          gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );
  
          for ( int i = 1; i < n; i++ ) {
  
            if ( i >= samples ) {
  
              break;
  
            }
  
            float theta = dTheta * float( i );
            gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
            gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );
  
          }
        }
      `,blending:0,depthTest:!1,depthWrite:!1,side:1})}async dispose(){for(let[,e]of this.skyboxCache)(await e).dispose();this.generatedEnvironmentMap!=null&&((await this.generatedEnvironmentMap).dispose(),this.generatedEnvironmentMap=null),this.generatedEnvironmentMapAlt!=null&&((await this.generatedEnvironmentMapAlt).dispose(),this.generatedEnvironmentMapAlt=null),this.blurMaterial!=null&&this.blurMaterial.dispose()}},B_=.2,V_=40,H_=60,U_=5,W_=[1,.79,.62,.5,.4,.31,.25],G_=3,K_=1.3,q_=class e extends be{constructor(e){super(),this.loader=new ip(a_),this.width=0,this.height=0,this.dpr=1,this.scenes=new Set,this.multipleScenesVisible=!1,this.lastTick=performance.now(),this.renderedLastFrame=!1,this.scaleStep=0,this.lastStep=G_,this.avgFrameDuration=50,this.onWebGLContextLost=e=>{this.dispatchEvent({type:`contextlost`,sourceEvent:e})},this.onWebGLContextRestored=()=>{var e;(e=this.textureUtils)==null||e.dispose(),this.textureUtils=new z_(this.threeRenderer);for(let e of this.scenes)e.element[nd]()},this.dpr=Gu(),this.canvas3D=document.createElement(`canvas`),this.canvas3D.id=`webgl-canvas`,this.canvas3D.classList.add(`show`);try{this.threeRenderer=new as({canvas:this.canvas3D,alpha:!0,antialias:!0,powerPreference:e.powerPreference,preserveDrawingBuffer:!0}),this.threeRenderer.autoClear=!0,this.threeRenderer.setPixelRatio(1),this.threeRenderer.debug={checkShaderErrors:!!e.debug,onShaderError:null},this.threeRenderer.toneMapping=4}catch(e){console.warn(e)}this.arRenderer=new Bg(this),this.textureUtils=this.canRender?new z_(this.threeRenderer):null,ip.initializeKTX2Loader(this.threeRenderer),this.canvas3D.addEventListener(`webglcontextlost`,this.onWebGLContextLost),this.canvas3D.addEventListener(`webglcontextrestored`,this.onWebGLContextRestored),this.updateRendererSize()}static get singleton(){return this._singleton||=new e({powerPreference:(self.ModelViewerElement||{}).powerPreference||`high-performance`,debug:Ku()}),this._singleton}static resetSingleton(){let t=this._singleton.dispose();for(let e of t)e.disconnectedCallback();this._singleton=new e({powerPreference:(self.ModelViewerElement||{}).powerPreference||`high-performance`,debug:Ku()});for(let e of t)e.connectedCallback()}get canRender(){return this.threeRenderer!=null}get scaleFactor(){return W_[this.scaleStep]}set minScale(e){let t=1;for(;t<W_.length&&!(W_[t]<e);)++t;this.lastStep=t-1}registerScene(e){this.scenes.add(e),e.forceRescale();let t=new V;this.threeRenderer.getSize(t),e.canvas.width=t.x,e.canvas.height=t.y,this.canRender&&this.scenes.size>0&&this.threeRenderer.setAnimationLoop((e,t)=>this.render(e,t))}unregisterScene(e){this.scenes.delete(e),this.canvas3D.parentElement===e.canvas.parentElement&&e.canvas.parentElement.removeChild(this.canvas3D),this.canRender&&this.scenes.size===0&&this.threeRenderer.setAnimationLoop(null)}displayCanvas(e){return e.element.modelIsVisible&&!this.multipleScenesVisible?this.canvas3D:e.element[qb]}countVisibleScenes(){let{canvas3D:e}=this,t=0,n=null;for(let r of this.scenes){let{element:i}=r;i.modelIsVisible&&r.externalRenderer==null&&++t,e.parentElement===r.canvas.parentElement&&(n=r)}let r=t>1;if(n!=null){let t=r&&!this.multipleScenesVisible,i=!n.element.modelIsVisible;if(t||i){let{width:t,height:r}=this.sceneSize(n);this.copyPixels(n,t,r),e.parentElement.removeChild(e)}}this.multipleScenesVisible=r}updateRendererSize(){var e;let t=Gu();if(t!==this.dpr)for(let e of this.scenes){let{element:t}=e;t[Pb](t.getBoundingClientRect())}let n=0,r=0;for(let e of this.scenes)n=Math.max(n,e.width),r=Math.max(r,e.height);if(n!==this.width||r!==this.height||t!==this.dpr){this.width=n,this.height=r,this.dpr=t,n=Math.ceil(n*t),r=Math.ceil(r*t),this.canRender&&this.threeRenderer.setSize(n,r,!1);for(let t of this.scenes){let{canvas:i}=t;i.width=n,i.height=r,t.forceRescale(),(e=t.effectRenderer)==null||e.setSize(n,r)}}}updateRendererScale(e){let t=this.scaleStep;this.avgFrameDuration+=Wu(B_*(e-this.avgFrameDuration),-5,U_),this.avgFrameDuration>H_?++this.scaleStep:this.avgFrameDuration<V_&&this.scaleStep>0&&--this.scaleStep,this.scaleStep=Math.min(this.scaleStep,this.lastStep),t!==this.scaleStep&&(this.avgFrameDuration=50)}shouldRender(e){if(e.shouldRender())e.scaleStep!=this.scaleStep&&(e.scaleStep=this.scaleStep,this.rescaleCanvas(e));else if(e.scaleStep!=0)e.scaleStep=0,this.rescaleCanvas(e);else return!1;return!0}rescaleCanvas(e){let t=W_[e.scaleStep],n=Math.ceil(this.width/t),r=Math.ceil(this.height/t),{style:i}=e.canvas;i.width=`${n}px`,i.height=`${r}px`,this.canvas3D.style.width=`${n}px`,this.canvas3D.style.height=`${r}px`;let a=this.dpr*t,o=t<1?`GPU throttling`:this.dpr===window.devicePixelRatio?``:`No meta viewport tag`;e.element.dispatchEvent(new CustomEvent(`render-scale`,{detail:{reportedDpr:window.devicePixelRatio,renderedDpr:a,minimumDpr:this.dpr*W_[this.lastStep],pixelWidth:Math.ceil(e.width*a),pixelHeight:Math.ceil(e.height*a),reason:o}}))}sceneSize(e){let{dpr:t}=this,n=W_[e.scaleStep];return{width:Math.min(Math.ceil(e.width*n*t),this.canvas3D.width),height:Math.min(Math.ceil(e.height*n*t),this.canvas3D.height)}}copyPixels(e,t,n){let r=e.context;if(r==null){console.log(`could not acquire 2d context`);return}r.clearRect(0,0,t,n),r.drawImage(this.canvas3D,0,0,t,n,0,0,t,n),e.canvas.classList.add(`show`)}orderedScenes(){let e=[];for(let t of[!1,!0])for(let n of this.scenes)n.element.modelIsVisible===t&&e.push(n);return e}get isPresenting(){return this.arRenderer.isPresenting}preRender(e,t,n){let{element:r,exposure:i,toneMapping:a}=e;r[Yb](t,n);let o=typeof i==`number`&&!Number.isNaN(i),s=r.environmentImage,c=r.skyboxImage,l=a===7&&(s===`neutral`||s===`legacy`||!s&&!c);this.threeRenderer.toneMappingExposure=(o?i:1)*(l?K_:1)}render(e,t){if(t!=null){this.arRenderer.onWebXRFrame(e,t);return}let n=e-this.lastTick;if(this.lastTick=e,!this.canRender||this.isPresenting)return;this.countVisibleScenes(),this.updateRendererSize(),this.renderedLastFrame&&=(this.updateRendererScale(n),!1);let{canvas3D:r}=this;for(let t of this.orderedScenes()){let{element:i}=t;if(!i.loaded||!i.modelIsVisible&&t.renderCount>0||(this.preRender(t,e,n),!this.shouldRender(t)))continue;if(t.externalRenderer!=null){let e=t.getCamera();e.updateMatrix();let{matrix:n,projectionMatrix:r}=e,i=n.elements.slice(),a=t.getTarget();i[12]+=a.x,i[13]+=a.y,i[14]+=a.z,t.externalRenderer.render({viewMatrix:i,projectionMatrix:r.elements});continue}if(!i.modelIsVisible&&!this.multipleScenesVisible)for(let e of this.scenes)e.element.modelIsVisible&&e.queueRender();let{width:a,height:o}=this.sceneSize(t);t.renderShadow(this.threeRenderer),this.threeRenderer.setRenderTarget(null),this.threeRenderer.setViewport(0,Math.ceil(this.height*this.dpr)-o,a,o),t.effectRenderer==null?(this.threeRenderer.autoClear=!0,this.threeRenderer.toneMapping=t.toneMapping,this.threeRenderer.render(t,t.camera)):t.effectRenderer.render(n),this.multipleScenesVisible||!t.element.modelIsVisible&&t.renderCount===0?this.copyPixels(t,a,o):r.parentElement!==t.canvas.parentElement&&(t.canvas.parentElement.appendChild(r),t.canvas.classList.remove(`show`)),t.hasRendered(),++t.renderCount,this.renderedLastFrame=!0}}dispose(){this.textureUtils!=null&&this.textureUtils.dispose(),this.threeRenderer!=null&&this.threeRenderer.dispose(),this.textureUtils=null,this.threeRenderer=null;let e=[];for(let t of this.scenes)e.push(t.element);return this.canvas3D.removeEventListener(`webglcontextlost`,this.onWebGLContextLost),this.canvas3D.removeEventListener(`webglcontextrestored`,this.onWebGLContextRestored),e}},X=Symbol(`correlatedObjects`),J_=Symbol(`onUpdate`),Y_=class{constructor(e,t=null){this[J_]=e,this[X]=t}},X_=new Vn,Z_=new ti(2,2),Q_=0,$_=Symbol(`threeTexture`),ev=Symbol(`threeTextures`),tv=class extends Y_{get[$_](){return this[X]?.values().next().value}get[ev](){return this[X]}constructor(e,t){super(e,new Set(t?[t]:[])),this[$_].image.src||(this[$_].image.src=t.name?t.name:`adhoc_image`+Q_++),this[$_].image.name||(this[$_].image.name=t&&t.image&&t.image.src?t.image.src.split(`/`).pop():`adhoc_image`)}get name(){return this[$_].image.name||``}get uri(){return this[$_].image.src}get bufferView(){return this[$_].image.bufferView}get element(){let e=this[$_];if(e&&(e.isCanvasTexture||e.isVideoTexture))return e.image}get animation(){let e=this[$_];if(e&&e.isCanvasTexture&&e.animation)return e.animation}get type(){return this.uri==null?`embedded`:`external`}set name(e){for(let t of this[ev])t.image.name=e}update(){let e=this[$_];e&&e.isCanvasTexture&&!e.animation&&(this[$_].needsUpdate=!0,this[J_]())}async createThumbnail(e,t){let n=new os;X_.map=this[$_];let r=new wr(Z_,X_);n.add(r);let i=new fi(-1,1,1,-1,0,1),{threeRenderer:a}=q_.singleton,o=new gt(e,t);a.setRenderTarget(o),a.render(n,i),a.setRenderTarget(null);let s=new Uint8Array(e*t*4);a.readRenderTargetPixels(o,0,0,e,t,s),wb.width=e,wb.height=t;let c=wb.getContext(`2d`),l=c.createImageData(e,t);return l.data.set(s),c.putImageData(l,0,0),new Promise(async(e,t)=>{wb.toBlob(n=>{if(!n)return t(`Failed to capture thumbnail.`);e(URL.createObjectURL(n))},`image/png`)})}},nv;(function(e){e[e.Nearest=9728]=`Nearest`,e[e.Linear=9729]=`Linear`,e[e.NearestMipmapNearest=9984]=`NearestMipmapNearest`,e[e.LinearMipmapNearest=9985]=`LinearMipmapNearest`,e[e.NearestMipmapLinear=9986]=`NearestMipmapLinear`,e[e.LinearMipmapLinear=9987]=`LinearMipmapLinear`})(nv||={});var rv;(function(e){e[e.ClampToEdge=33071]=`ClampToEdge`,e[e.MirroredRepeat=33648]=`MirroredRepeat`,e[e.Repeat=10497]=`Repeat`})(rv||={});var iv=new Map([[rv.Repeat,a],[rv.ClampToEdge,o],[rv.MirroredRepeat,s]]),av=new Map([[a,rv.Repeat],[o,rv.ClampToEdge],[s,rv.MirroredRepeat]]),ov=new Map([[nv.Nearest,c],[nv.Linear,d],[nv.NearestMipmapNearest,l],[nv.LinearMipmapNearest,f],[nv.NearestMipmapLinear,u],[nv.LinearMipmapLinear,p]]),sv=new Map([[c,nv.Nearest],[d,nv.Linear],[l,nv.NearestMipmapNearest],[f,nv.LinearMipmapNearest],[u,nv.NearestMipmapLinear],[p,nv.LinearMipmapLinear]]),cv=new Map([[nv.Nearest,c],[nv.Linear,d]]),lv=new Map([[c,nv.Nearest],[d,nv.Linear]]),uv=e=>sv.has(e),dv=e=>lv.has(e),fv=e=>av.has(e),pv=(e,t)=>{switch(e){case`minFilter`:return uv(t);case`magFilter`:return dv(t);case`wrapS`:case`wrapT`:return fv(t);case`rotation`:case`repeat`:case`offset`:return!0;default:throw Error(`Cannot configure property "${e}" on Sampler`)}},mv=Symbol(`threeTexture`),hv=Symbol(`threeTextures`),gv=Symbol(`setProperty`),_v=class extends Y_{get[mv](){return this[X]?.values().next().value}get[hv](){return this[X]}constructor(e,t){super(e,new Set(t?[t]:[]))}get name(){return this[mv].name||``}get minFilter(){return sv.get(this[mv].minFilter)}get magFilter(){return lv.get(this[mv].magFilter)}get wrapS(){return av.get(this[mv].wrapS)}get wrapT(){return av.get(this[mv].wrapT)}get rotation(){return this[mv].rotation}get scale(){return ix(this[mv].repeat)}get offset(){return ix(this[mv].offset)}setMinFilter(e){this[gv](`minFilter`,ov.get(e))}setMagFilter(e){this[gv](`magFilter`,cv.get(e))}setWrapS(e){this[gv](`wrapS`,iv.get(e))}setWrapT(e){this[gv](`wrapT`,iv.get(e))}setRotation(e){e??=0,this[gv](`rotation`,e)}setScale(e){e??={u:1,v:1},this[gv](`repeat`,new V(e.u,e.v))}setOffset(e){e??={u:0,v:0},this[gv](`offset`,new V(e.u,e.v))}[gv](e,t){if(pv(e,t))for(let n of this[hv])n[e]=t,n.needsUpdate=!0;this[J_]()}},vv=Symbol(`image`),yv=Symbol(`sampler`),bv=Symbol(`threeTexture`),xv=class extends Y_{constructor(e,t){super(e,new Set(t?[t]:[])),this[yv]=new _v(e,t),this[vv]=new tv(e,t)}get[bv](){return this[X]?.values().next().value}get name(){return this[bv].name||``}set name(e){for(let t of this[X])t.name=e}get sampler(){return this[yv]}get source(){return this[vv]}},Sv,Cv,wv,Tv=Symbol(`texture`),Ev=Symbol(`transform`),Dv=Symbol(`materials`),Ov=Symbol(`usage`),kv=Symbol(`onUpdate`),Av=Symbol(`activeVideo`),Z;(function(e){e[e.Base=0]=`Base`,e[e.MetallicRoughness=1]=`MetallicRoughness`,e[e.Normal=2]=`Normal`,e[e.Occlusion=3]=`Occlusion`,e[e.Emissive=4]=`Emissive`,e[e.Clearcoat=5]=`Clearcoat`,e[e.ClearcoatRoughness=6]=`ClearcoatRoughness`,e[e.ClearcoatNormal=7]=`ClearcoatNormal`,e[e.SheenColor=8]=`SheenColor`,e[e.SheenRoughness=9]=`SheenRoughness`,e[e.Transmission=10]=`Transmission`,e[e.Thickness=11]=`Thickness`,e[e.Specular=12]=`Specular`,e[e.SpecularColor=13]=`SpecularColor`,e[e.Iridescence=14]=`Iridescence`,e[e.IridescenceThickness=15]=`IridescenceThickness`,e[e.Anisotropy=16]=`Anisotropy`})(Z||={});var jv=class{constructor(e,t,n,r){this[Sv]=null,this[Cv]={rotation:0,scale:new V(1,1),offset:new V(0,0)},this[wv]=!1,n&&(this[Ev].rotation=n.rotation,this[Ev].scale.copy(n.repeat),this[Ev].offset.copy(n.offset),this[Tv]=new xv(e,n)),this[kv]=e,this[Dv]=r,this[Ov]=t}get texture(){return this[Tv]}setTexture(e){let t=e==null?null:e.source[$_],n=this[Tv]?.source[$_];if(n!=null&&n.isVideoTexture?this[Av]=!1:this[Tv]?.source.animation&&this[Tv].source.animation.removeEventListener(`enterFrame`,this[kv]),this[Tv]=e,t!=null&&t.isVideoTexture){let e=t.image;if(this[Av]=!0,e.requestVideoFrameCallback!=null){let t=()=>{this[Av]&&(this[kv](),e.requestVideoFrameCallback(t))};e.requestVideoFrameCallback(t)}else{let e=()=>{this[Av]&&(this[kv](),requestAnimationFrame(e))};requestAnimationFrame(e)}}else e?.source.animation!=null&&e.source.animation.addEventListener(`enterFrame`,this[kv]);let r=pe;if(this[Dv])for(let e of this[Dv]){switch(this[Ov]){case Z.Base:e.map=t;break;case Z.MetallicRoughness:r=me,e.metalnessMap=t,e.roughnessMap=t;break;case Z.Normal:r=me,e.normalMap=t;break;case Z.Occlusion:r=me,e.aoMap=t;break;case Z.Emissive:e.emissiveMap=t;break;case Z.Clearcoat:e.clearcoatMap=t;break;case Z.ClearcoatRoughness:e.clearcoatRoughnessMap=t;break;case Z.ClearcoatNormal:e.clearcoatNormalMap=t;break;case Z.SheenColor:e.sheenColorMap=t;break;case Z.SheenRoughness:e.sheenRoughnessMap=t;break;case Z.Transmission:e.transmissionMap=t;break;case Z.Thickness:e.thicknessMap=t;break;case Z.Specular:e.specularIntensityMap=t;break;case Z.SpecularColor:e.specularColorMap=t;break;case Z.Iridescence:e.iridescenceMap=t;break;case Z.IridescenceThickness:e.iridescenceThicknessMap=t;break;case Z.Anisotropy:e.anisotropyMap=t}e.needsUpdate=!0}t&&(t.colorSpace=r,t.rotation=this[Ev].rotation,t.repeat=this[Ev].scale,t.offset=this[Ev].offset),this[kv]()}};Sv=Tv,Cv=Ev,wv=Av;var Mv=Symbol(`threeMaterial`),Nv=Symbol(`threeMaterials`),Pv=Symbol(`baseColorTexture`),Fv=Symbol(`metallicRoughnessTexture`),Iv=class extends Y_{constructor(e,t){super(e,t);let{map:n,metalnessMap:r}=t.values().next().value;this[Pv]=new jv(e,Z.Base,n,t),this[Fv]=new jv(e,Z.MetallicRoughness,r,t)}get[Nv](){return this[X]}get[Mv](){return this[X]?.values().next().value}get baseColorFactor(){let e=[0,0,0,this[Mv].opacity];return this[Mv].color.toArray(e),e}get metallicFactor(){return this[Mv].metalness}get roughnessFactor(){return this[Mv].roughness}get baseColorTexture(){return this[Pv]}get metallicRoughnessTexture(){return this[Fv]}setBaseColorFactor(e){let t=new G;e instanceof Array?t.fromArray(e):t.set(e);for(let n of this[Nv])n.color.set(t),e instanceof Array&&e.length>3?n.opacity=e[3]:(e=[0,0,0,n.opacity],t.toArray(e));this[J_]()}setMetallicFactor(e){for(let t of this[Nv])t.metalness=e;this[J_]()}setRoughnessFactor(e){for(let t of this[Nv])t.roughness=e;this[J_]()}},Lv,Rv,zv=Symbol(`pbrMetallicRoughness`),Bv=Symbol(`normalTexture`),Vv=Symbol(`occlusionTexture`),Hv=Symbol(`emissiveTexture`),Uv=Symbol(`backingThreeMaterial`),Wv=Symbol(`applyAlphaCutoff`),Gv=Symbol(`getAlphaMode`),Kv=Symbol(`lazyLoadGLTFInfo`),qv=Symbol(`initialize`),Jv=Symbol(`getLoadedMaterial`),Q=Symbol(`ensureMaterialIsLoaded`),Yv=Symbol(`gltfIndex`),Xv=Symbol(`setActive`),Zv=Symbol(`variantIndices`),Qv=Symbol(`isActive`),$v=Symbol(`variantSet`),ey=Symbol(`modelVariants`),ty=Symbol(`name`),ny=Symbol(`pbrTextures`),ry=class extends Y_{constructor(e,t,n,r,i,a,o=void 0){super(e,i),this[Lv]=new Set,this[Rv]=new Map,this[Yv]=t,this[Qv]=n,this[ey]=r,this[ty]=a,o==null?this[qv]():this[Kv]=o}get[(Lv=$v,Rv=ny,Uv)](){return this[X].values().next().value}[qv](){let e=this[J_],t=this[X];this[zv]=new Iv(e,t);let{normalMap:n,aoMap:r,emissiveMap:i}=t.values().next().value;this[Bv]=new jv(e,Z.Normal,n,t),this[Vv]=new jv(e,Z.Occlusion,r,t),this[Hv]=new jv(e,Z.Emissive,i,t);let a=n=>{this[ny].set(n,new jv(e,n,null,t))};a(Z.Clearcoat),a(Z.ClearcoatRoughness),a(Z.ClearcoatNormal),a(Z.SheenColor),a(Z.SheenRoughness),a(Z.Transmission),a(Z.Thickness),a(Z.Specular),a(Z.SpecularColor),a(Z.Iridescence),a(Z.IridescenceThickness),a(Z.Anisotropy)}async[Jv](){if(this[Kv]!=null){let{set:e,material:t}=await this[Kv].doLazyLoad();return this[X]=e,this[qv](),this[Kv]=void 0,this.ensureLoaded=async()=>{},t}return this[X].values().next().value}colorFromRgb(e){let t=new G;return e instanceof Array?t.fromArray(e):t.set(e),t}[Q](){if(this[Kv]!=null)throw Error(`Material "${this.name}" has not been loaded, call 'await
    myMaterial.ensureLoaded()' before using an unloaded material.`)}async ensureLoaded(){await this[Jv]()}get isLoaded(){return this[Kv]==null}get isActive(){return this[Qv]}[Xv](e){this[Qv]=e}get name(){return this[ty]||``}set name(e){if(this[ty]=e,this[X]!=null)for(let t of this[X])t.name=e}get pbrMetallicRoughness(){return this[Q](),this[zv]}get normalTexture(){return this[Q](),this[Bv]}get occlusionTexture(){return this[Q](),this[Vv]}get emissiveTexture(){return this[Q](),this[Hv]}get emissiveFactor(){return this[Q](),this[Uv].emissive.toArray()}get index(){return this[Yv]}[Zv](){return this[$v]}hasVariant(e){let t=this[ey].get(e);return t!=null&&this[$v].has(t.index)}setEmissiveFactor(e){this[Q]();let t=this.colorFromRgb(e);for(let e of this[X])e.emissive.set(t);this[J_]()}[Gv](){return this[Uv].transparent?`BLEND`:this[Uv].alphaTest>0?`MASK`:`OPAQUE`}[Wv](){this[Q]();for(let e of this[X])this[Gv]()===`MASK`?e.alphaTest??=.5:e.alphaTest=void 0,e.needsUpdate=!0}setAlphaCutoff(e){this[Q]();for(let t of this[X])t.alphaTest=e,t.needsUpdate=!0;this[Wv](),this[J_]()}getAlphaCutoff(){return this[Q](),this[Uv].alphaTest}setDoubleSided(e){this[Q]();for(let t of this[X])t.side=e?2:0,t.needsUpdate=!0;this[J_]()}getDoubleSided(){return this[Q](),this[Uv].side==2}setAlphaMode(e){this[Q]();let t=(e,t)=>{e.transparent=t,e.depthWrite=!t};for(let n of this[X])t(n,e===`BLEND`),n.alphaTest=e===`MASK`?.5:void 0,n.needsUpdate=!0;this[J_]()}getAlphaMode(){return this[Q](),this[Gv]()}get emissiveStrength(){return this[Q](),this[Uv].emissiveIntensity}setEmissiveStrength(e){this[Q]();for(let t of this[X])t.emissiveIntensity=e;this[J_]()}get clearcoatFactor(){return this[Q](),this[Uv].clearcoat}get clearcoatRoughnessFactor(){return this[Q](),this[Uv].clearcoatRoughness}get clearcoatTexture(){return this[Q](),this[ny].get(Z.Clearcoat)}get clearcoatRoughnessTexture(){return this[Q](),this[ny].get(Z.ClearcoatRoughness)}get clearcoatNormalTexture(){return this[Q](),this[ny].get(Z.ClearcoatNormal)}get clearcoatNormalScale(){return this[Q](),this[Uv].clearcoatNormalScale.x}setClearcoatFactor(e){this[Q]();for(let t of this[X])t.clearcoat=e;this[J_]()}setClearcoatRoughnessFactor(e){this[Q]();for(let t of this[X])t.clearcoatRoughness=e;this[J_]()}setClearcoatNormalScale(e){this[Q]();for(let t of this[X])t.clearcoatNormalScale=new V(e,e);this[J_]()}get ior(){return this[Q](),this[Uv].ior}setIor(e){this[Q]();for(let t of this[X])t.ior=e;this[J_]()}get sheenColorFactor(){return this[Q](),this[Uv].sheenColor.toArray()}get sheenColorTexture(){return this[Q](),this[ny].get(Z.SheenColor)}get sheenRoughnessFactor(){return this[Q](),this[Uv].sheenRoughness}get sheenRoughnessTexture(){return this[Q](),this[ny].get(Z.SheenRoughness)}setSheenColorFactor(e){this[Q]();let t=this.colorFromRgb(e);for(let e of this[X])e.sheenColor.set(t),e.sheen=1;this[J_]()}setSheenRoughnessFactor(e){this[Q]();for(let t of this[X])t.sheenRoughness=e,t.sheen=1;this[J_]()}get transmissionFactor(){return this[Q](),this[Uv].transmission}get transmissionTexture(){return this[Q](),this[ny].get(Z.Transmission)}setTransmissionFactor(e){this[Q]();for(let t of this[X])t.transmission=e;this[J_]()}get thicknessFactor(){return this[Q](),this[Uv].thickness}get thicknessTexture(){return this[Q](),this[ny].get(Z.Thickness)}get attenuationDistance(){return this[Q](),this[Uv].attenuationDistance}get attenuationColor(){return this[Q](),this[Uv].attenuationColor.toArray()}setThicknessFactor(e){this[Q]();for(let t of this[X])t.thickness=e;this[J_]()}setAttenuationDistance(e){this[Q]();for(let t of this[X])t.attenuationDistance=e;this[J_]()}setAttenuationColor(e){this[Q]();let t=this.colorFromRgb(e);for(let e of this[X])e.attenuationColor.set(t);this[J_]()}get specularFactor(){return this[Q](),this[Uv].specularIntensity}get specularTexture(){return this[Q](),this[ny].get(Z.Specular)}get specularColorFactor(){return this[Q](),this[Uv].specularColor.toArray()}get specularColorTexture(){return this[Q](),this[ny].get(Z.SheenColor)}setSpecularFactor(e){this[Q]();for(let t of this[X])t.specularIntensity=e;this[J_]()}setSpecularColorFactor(e){this[Q]();let t=this.colorFromRgb(e);for(let e of this[X])e.specularColor.set(t);this[J_]()}get iridescenceFactor(){return this[Q](),this[Uv].iridescence}get iridescenceTexture(){return this[Q](),this[ny].get(Z.Iridescence)}get iridescenceIor(){return this[Q](),this[Uv].iridescenceIOR}get iridescenceThicknessMinimum(){return this[Q](),this[Uv].iridescenceThicknessRange[0]}get iridescenceThicknessMaximum(){return this[Q](),this[Uv].iridescenceThicknessRange[1]}get iridescenceThicknessTexture(){return this[Q](),this[ny].get(Z.IridescenceThickness)}setIridescenceFactor(e){this[Q]();for(let t of this[X])t.iridescence=e;this[J_]()}setIridescenceIor(e){this[Q]();for(let t of this[X])t.iridescenceIOR=e;this[J_]()}setIridescenceThicknessMinimum(e){this[Q]();for(let t of this[X])t.iridescenceThicknessRange[0]=e;this[J_]()}setIridescenceThicknessMaximum(e){this[Q]();for(let t of this[X])t.iridescenceThicknessRange[1]=e;this[J_]()}get anisotropyStrength(){return this[Q](),this[Uv].anisotropy}get anisotropyRotation(){return this[Q](),this[Uv].anisotropyRotation}get anisotropyTexture(){return this[Q](),this[ny].get(Z.Anisotropy)}setAnisotropyStrength(e){this[Q]();for(let t of this[X])t.anisotropy=e;this[J_]()}setAnisotropyRotation(e){this[Q]();for(let t of this[X])t.anisotropyRotation=e;this[J_]()}},iy=class{constructor(e){this.name=``,this.children=[],this.name=e}},ay=class extends iy{constructor(e,t,n,r){super(e.name),this.materials=new Map,this.variantToMaterialMap=new Map,this.initialMaterialIdx=0,this.activeMaterialIdx=0,this.mesh=e;let{gltf:i,threeGLTF:a,threeObjectMap:o}=r;this.parser=a.parser,this.modelVariants=n,this.mesh.userData.variantData=n;let s=o.get(e.material);s.materials==null?console.error(`Primitive (${e.name}) missing initial material reference.`):this.initialMaterialIdx=this.activeMaterialIdx=s.materials;let c=e.userData.associations||{};if(c.meshes==null){console.error(`Mesh is missing primitive index association`);return}let l=((i.meshes||[])[c.meshes].primitives||[])[c.primitives];if(l==null){console.error(`Mesh primitive definition is missing.`);return}if(l.material!=null)this.materials.set(l.material,t[l.material]);else{let e=t.findIndex(e=>e.name===`Default`);e>=0?this.materials.set(e,t[e]):console.warn(`gltfPrimitive has no material!`)}if(l.extensions&&l.extensions.KHR_materials_variants){let e=l.extensions.KHR_materials_variants,r=a.parser.json.extensions.KHR_materials_variants.variants;for(let i of e.mappings){let e=t[i.material];this.materials.set(i.material,e);for(let t of i.variants){let{name:i}=r[t];this.variantToMaterialMap.set(t,e),e[Zv]().add(t),n.has(i)||n.set(i,{name:i,index:t})}}}}async setActiveMaterial(e){let t=this.materials.get(e);if(t!=null&&e!==this.activeMaterialIdx){this.mesh.material=await t[Jv]();let{normalScale:n}=this.mesh.material;n!=null&&n.y*n.x<0!=(this.mesh.geometry.attributes.tangent==null)&&this.parser.assignFinalMaterial(this.mesh),this.activeMaterialIdx=e}return this.mesh.material}getActiveMaterial(){return this.materials.get(this.activeMaterialIdx)}getMaterial(e){return this.materials.get(e)}async enableVariant(e){if(e==null)return this.setActiveMaterial(this.initialMaterialIdx);if(this.variantToMaterialMap!=null&&this.modelVariants.has(e)){let t=this.modelVariants.get(e);return this.enableVariantHelper(t.index)}return null}async enableVariantHelper(e){if(this.variantToMaterialMap!=null&&e!=null){let t=this.variantToMaterialMap.get(e);if(t!=null)return this.setActiveMaterial(t.index)}return null}async instantiateVariants(){if(this.variantToMaterialMap!=null)for(let e of this.variantToMaterialMap.keys()){let t=this.mesh.userData.variantMaterials.get(e);if(t.material!=null)continue;let n=await this.enableVariantHelper(e);n!=null&&(t.material=n)}}get variantInfo(){return this.variantToMaterialMap}addVariant(e,t){if(!this.ensureVariantIsUnused(t))return!1;this.modelVariants.has(t)||this.modelVariants.set(t,{name:t,index:this.modelVariants.size});let n=this.modelVariants.get(t).index;return e[Zv]().add(n),this.variantToMaterialMap.set(n,e),this.materials.set(e.index,e),this.updateVariantUserData(n,e),!0}deleteVariant(e){this.variantInfo.has(e)&&(this.variantInfo.delete(e),this.mesh.userData.variantMaterials?.delete(e))}updateVariantUserData(e,t){t[Zv]().add(e),this.mesh.userData.variantData=this.modelVariants,this.mesh.userData.variantMaterials=this.mesh.userData.variantMaterials||new Map,this.mesh.userData.variantMaterials.set(e,{material:t[X].values().next().value,gltfMaterialIndex:t.index})}ensureVariantIsUnused(e){let t=this.modelVariants.get(e);return t!=null&&this.variantInfo.has(t.index)?(console.warn(`Primitive cannot add variant '${e}' for this material, it already exists.`),!1):!0}},oy,sy,cy,ly,uy,dy,fy=Symbol(`materials`),py=Symbol(`hierarchy`),my=Symbol(`roots`),hy=Symbol(`primitives`),gy=Symbol(`prepareVariantsForExport`),_y=Symbol(`switchVariant`),vy=Symbol(`materialFromPoint`),yy=Symbol(`nodeFromPoint`),by=Symbol(`nodeFromIndex`),xy=Symbol(`variantData`),Sy=Symbol(`availableVariants`),Cy=Symbol(`modelOnUpdate`),wy=Symbol(`cloneMaterial`),Ty=class{constructor(e,t,n,r){this.gltf=e,this.gltfElementMap=t,this.mapKey=n,this.doLazyLoad=r}},Ey=class{constructor(e,t=()=>{}){this[oy]=[],this[sy]=[],this[cy]=[],this[ly]=[],this[uy]=()=>{},this[dy]=new Map,this[Cy]=t;let{gltf:n,threeGLTF:r,gltfElementMap:i}=e;for(let[e,a]of n.materials.entries()){let o=i.get(a);if(o!=null)this[fy].push(new ry(t,e,!0,this[xy],o,a.name));else{let s=(n.materials||[])[e],c=e;this[fy].push(new ry(t,e,!1,this[xy],o,a.name,new Ty(n,i,s,async()=>{let e=await r.parser.getDependency(`material`,c),t=new Set;return i.set(s,t),t.add(e),{set:t,material:e}})))}}let a=new Map,o=[];for(let e of r.scene.children)o.push(e);for(;o.length>0;){let t=o.pop(),n=null;t instanceof wr?(n=new ay(t,this.materials,this[xy],e),this[hy].push(n)):n=new iy(t.name);let r=a.get(t);r==null?this[my].push(n):r.children.push(n),this[py].push(n);for(let e of t.children)o.push(e),a.set(t,n)}}get materials(){return this[fy]}[(oy=fy,sy=py,cy=my,ly=hy,uy=Cy,dy=xy,Sy)](){let e=Array.from(this[xy].values());return e.sort((e,t)=>e.index-t.index),e.map(e=>e.name)}getMaterialByName(e){let t=this[fy].filter(t=>t.name===e);return t.length>0?t[0]:null}[by](e,t){return this[py].find(n=>{if(n instanceof ay){let{meshes:r,primitives:i}=n.mesh.userData.associations;if(r==e&&i==t)return!0}return!1})??null}[yy](e){return this[py].find(t=>t instanceof ay&&t.mesh===e.object)}[vy](e){return this[yy](e).getActiveMaterial()}async[_y](e){for(let t of this[hy])await t.enableVariant(e);for(let e of this.materials)e[Xv](!1);for(let e of this[hy])this.materials[e.getActiveMaterial().index][Xv](!0)}async[gy](){let e=[];for(let t of this[hy])e.push(t.instantiateVariants());await Promise.all(e)}[wy](e,t){let n=this.materials[e];n.isLoaded||console.error(`Cloning an unloaded material,
           call 'material.ensureLoaded() before cloning the material.`);let r=n[X],i=new Set;for(let[e,n]of r.entries()){let a=n.clone();a.name=t+(r.size>1?`_inst`+e:``),i.add(a)}let a=new ry(this[Cy],this[fy].length,!1,this[xy],i,t);return this[fy].push(a),a}createMaterialInstanceForVariant(e,t,n,r=!0){let i=null;for(let r of this[hy]){let a=this[xy].get(n);a!=null&&r.variantInfo.has(a.index)||r.getMaterial(e)!=null&&(this.hasVariant(n)||this.createVariant(n),i??=this[wy](e,t),r.addVariant(i,n))}if(r&&i!=null){i[Xv](!0),this.materials[e][Xv](!1);for(let e of this[hy])e.enableVariant(n)}return i}createVariant(e){this[xy].has(e)?console.warn(`Variant '${e}'' already exists`):this[xy].set(e,{name:e,index:this[xy].size})}hasVariant(e){return this[xy].has(e)}setMaterialToVariant(e,t){if(this[Sy]().find(e=>e===t)==null){console.warn(`Can't add material to '${t}', the variant does not exist.'`);return}if(e<0||e>=this.materials.length){console.error(`setMaterialToVariant(): materialIndex is out of bounds.`);return}for(let n of this[hy]){let r=n.getMaterial(e);r!=null&&n.addVariant(r,t)}}updateVariantName(e,t){let n=this[xy].get(e);n!=null&&(n.name=t,this[xy].set(t,n),this[xy].delete(e))}deleteVariant(e){let t=this[xy].get(e);if(t!=null){for(let n of this.materials)n.hasVariant(e)&&n[$v].delete(t.index);for(let e of this[hy])e.deleteVariant(t.index);this[xy].delete(e)}}},Dy=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},Oy=Symbol(`currentGLTF`),ky=Symbol(`originalGltfJson`),Ay=Symbol(`model`),jy=Symbol(`getOnUpdateMethod`),My=Symbol(`buildTexture`),Ny=e=>{var t,n,i;class o extends e{constructor(){super(...arguments),this[t]=void 0,this[n]=null,this[i]=null,this.variantName=null,this.orientation=`0 0 0`,this.scale=`1 1 1`}get model(){return this[Ay]}get availableVariants(){return this.model?this.model[Sy]():[]}get originalGltfJson(){return this[ky]}[(t=Ay,n=Oy,i=ky,jy)](){return()=>{this[Jb]()}}[My](e){return e.colorSpace=pe,e.wrapS=a,e.wrapT=a,new xv(this[jy](),e)}async createTexture(e,t=`image/png`){let{textureUtils:n}=this[Qb],r=await n.loadImage(e);return r.userData.mimeType=t,this[My](r)}async createLottieTexture(e,t=1){let{textureUtils:n}=this[Qb],r=await n.loadLottie(e,t);return this[My](r)}createVideoTexture(e){let t=document.createElement(`video`);t.crossOrigin=this.withCredentials?`use-credentials`:`anonymous`,t.src=e,t.muted=!0,t.playsInline=!0,t.loop=!0,t.play();let n=new Qs(t);return this[My](n)}createCanvasTexture(){let e=new nc(document.createElement(`canvas`));return this[My](e)}async updated(e){if(super.updated(e),e.has(`variantName`)){let e=this[$b].beginActivity(`variant-update`);e(.1);let t=this[Ay],{variantName:n}=this;t!=null&&(await t[_y](n),this[Jb](),this.dispatchEvent(new CustomEvent(`variant-applied`))),e(1)}if(e.has(`orientation`)||e.has(`scale`)){if(!this.loaded)return;let e=this[$];e.applyTransform(),e.updateBoundingBox(),e.updateShadow(),this[Qb].arRenderer.onUpdateScene(),this[Jb]()}}[Xb](){super[Xb]();let{currentGLTF:e}=this[$];if(e!=null){let{correlatedSceneGraph:t}=e;t!=null&&e!==this[Oy]&&(this[Ay]=new Ey(t,this[jy]()),this[ky]=JSON.parse(JSON.stringify(t.gltf))),`variants`in e.userData&&this.requestUpdate(`variantName`)}this[Oy]=e}async exportScene(e){let t=this[$];return new Promise(async(n,r)=>{let i={binary:!0,onlyVisible:!0,maxTextureSize:1/0,includeCustomExtensions:!1,forceIndices:!1};Object.assign(i,e),i.animations=t.animations,i.truncateDrawRange=!0;let a=t.shadow,o=!1;a!=null&&(o=a.visible,a.visible=!1),await this[Ay][gy](),new yp().register(e=>new em(e)).parse(t.model,e=>n(new Blob([i.binary?e:JSON.stringify(e)],{type:i.binary?`application/octet-stream`:`application/json`})),()=>r(`glTF export failed`),i),a!=null&&(a.visible=o)})}materialFromPoint(e,t){let n=this[Ay];if(n==null)return null;let r=this[$],i=r.getNDC(e,t),a=r.hitFromPoint(i);return a==null||a.face==null?null:n[vy](a)}}return Dy([r({type:String,attribute:`variant-name`})],o.prototype,`variantName`,void 0),Dy([r({type:String,attribute:`orientation`})],o.prototype,`orientation`,void 0),Dy([r({type:String,attribute:`scale`})],o.prototype,`scale`,void 0),o},Py=class extends wr{constructor(){super(void 0,new Vn({depthWrite:!1})),this.height=0,this.radius=0,this.resolution=0,this.userData.noHit=!0}get map(){return this.material.map}set map(e){this.material.map=e}isUsable(){return this.height>0&&this.radius>0&&this.geometry!=null&&this.map!=null}updateGeometry(e=this.height,t=this.radius,n=128){(e!=this.height||t!=this.radius||n!=this.resolution)&&(this.height=e,this.radius=t,this.resolution=n,e>0&&t>0&&(this.geometry.dispose(),this.geometry=Fy(e,t,n)))}};function Fy(e,t,n){let r=new rc(t,2*n,n);r.scale(1,1,-1);let i=r.getAttribute(`position`),a=new U;for(let t=0;t<i.count;++t)if(a.fromBufferAttribute(i,t),a.y<0){let n=-e*3/2,r=a.y<n?-e/a.y:1-a.y*a.y/(3*n*n);a.multiplyScalar(r),a.toArray(i.array,3*t)}return i.needsUpdate=!0,r}var Iy=new U,Ly=new U,Ry=new U,zy=new H,By=new Nn,Vy=new yt,Hy=class extends ap{constructor(e){super(document.createElement(`div`)),this.normal=new U(0,1,0),this.initialized=!1,this.referenceCount=1,this.pivot=document.createElement(`div`),this.slot=document.createElement(`slot`),this.element.classList.add(`annotation-wrapper`),this.slot.name=e.name,this.element.appendChild(this.pivot),this.pivot.appendChild(this.slot),this.updatePosition(e.position),this.updateNormal(e.normal),this.surface=e.surface}get facingCamera(){return!this.element.classList.contains(`hide`)}show(){(!this.facingCamera||!this.initialized)&&this.updateVisibility(!0)}hide(){(this.facingCamera||!this.initialized)&&this.updateVisibility(!1)}increment(){this.referenceCount++}decrement(){return this.referenceCount>0&&--this.referenceCount,this.referenceCount===0}updatePosition(e){if(e==null)return;let t=mm(e)[0].terms;for(let e=0;e<3;++e)this.position.setComponent(e,Tm(t[e]).number);this.updateMatrixWorld()}updateNormal(e){if(e==null)return;let t=mm(e)[0].terms;for(let e=0;e<3;++e)this.normal.setComponent(e,t[e].number)}updateSurface(e){if(!e&&this.initialized)return;let{mesh:t,tri:n,bary:r}=this;if(t==null||n==null||r==null)return;t.getVertexPosition(n.x,Iy),t.getVertexPosition(n.y,Ly),t.getVertexPosition(n.z,Ry),Iy.toArray(zy.elements,0),Ly.toArray(zy.elements,3),Ry.toArray(zy.elements,6),this.position.copy(r).applyMatrix3(zy);let i=this.parent;i.worldToLocal(t.localToWorld(this.position)),By.set(Iy,Ly,Ry),By.getNormal(this.normal).transformDirection(t.matrixWorld);let a=i.parent;Vy.setFromAxisAngle(Iy.set(0,1,0),-a.yaw),this.normal.applyQuaternion(Vy)}orient(e){this.pivot.style.transform=`rotate(${e}rad)`}updateVisibility(e){this.element.classList.toggle(`hide`,!e),this.slot.assignedNodes().forEach(t=>{if(t.nodeType!==Node.ELEMENT_NODE)return;let n=t,r=n.dataset.visibilityAttribute;if(r!=null){let t=`data-${r}`;n.toggleAttribute(t,e)}n.dispatchEvent(new CustomEvent(`hotspot-visibility`,{detail:{visible:e}}))}),this.initialized=!0}},Uy={name:`HorizontalBlurShader`,uniforms:{tDiffuse:{value:null},h:{value:1/512}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform float h;

		varying vec2 vUv;

		void main() {

			vec4 sum = vec4( 0.0 );

			sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.051;
			sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918;
			sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.12245;
			sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.1531;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
			sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.1531;
			sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.12245;
			sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.0918;
			sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.051;

			gl_FragColor = sum;

		}`},Wy={name:`VerticalBlurShader`,uniforms:{tDiffuse:{value:null},v:{value:1/512}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform float v;

		varying vec2 vUv;

		void main() {

			vec4 sum = vec4( 0.0 );

			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918;
			sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051;

			gl_FragColor = sum;

		}`};function Gy(e,t,n){return(1-n)*e+n*t}var Ky=9,qy=2,Jy=.3,Yy=class extends Sn{constructor(e,t,n){super(),this.camera=new fi,this.renderTarget=null,this.renderTargetBlur=null,this.depthMaterial=new zo,this.horizontalBlurMaterial=new Fr(Uy),this.verticalBlurMaterial=new Fr(Wy),this.intensity=0,this.softness=1,this.boundingBox=new St,this.size=new U,this.maxDimension=0,this.isAnimated=!1,this.needsUpdate=!1;let{camera:r}=this;r.rotation.x=Math.PI/2,r.left=-.5,r.right=.5,r.bottom=-.5,r.top=.5,this.add(r);let i=new ti,a=new Vn({opacity:1,transparent:!0,side:1});this.floor=new wr(i,a),this.floor.userData.noHit=!0,r.add(this.floor),this.blurPlane=new wr(i),this.blurPlane.visible=!1,r.add(this.blurPlane),e.target.add(this),this.depthMaterial.onBeforeCompile=function(e){e.fragmentShader=e.fragmentShader.replace(`gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );`,`gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * opacity );`)},this.horizontalBlurMaterial.depthTest=!1,this.verticalBlurMaterial.depthTest=!1,this.setScene(e,t,n)}setScene(e,t,n){let{boundingBox:r,size:i,rotation:a,position:o}=this;if(this.isAnimated=e.animationNames.length>0,this.boundingBox.copy(e.boundingBox),this.size.copy(e.size),this.maxDimension=Math.max(i.x,i.y,i.z)*(this.isAnimated?qy:1),this.boundingBox.getCenter(o),n===`back`){let{min:e,max:t}=r;[e.y,e.z]=[e.z,e.y],[t.y,t.z]=[t.z,t.y],[i.y,i.z]=[i.z,i.y],a.x=Math.PI/2,a.y=Math.PI}else a.x=0,a.y=0;if(this.isAnimated){let e=r.min.y,t=r.max.y;i.y=this.maxDimension,r.expandByVector(i.subScalar(this.maxDimension).multiplyScalar(-.5)),r.min.y=e,r.max.y=t,i.set(this.maxDimension,t-e,this.maxDimension)}n===`bottom`?o.y=r.min.y:o.z=r.min.y,this.setSoftness(t)}setSoftness(e){this.softness=e;let{size:t,camera:n}=this,r=this.isAnimated?qy:1,i=r*2**(Ky-e*3);this.setMapSize(i);let a=t.y/2,o=t.y*r;n.near=0,n.far=Gy(o,a,e),this.depthMaterial.opacity=1/e,n.updateProjectionMatrix(),this.setIntensity(this.intensity),this.setOffset(0)}setMapSize(e){let{size:t}=this;this.isAnimated&&(e*=qy);let n=Math.floor(t.x>t.z?e:e*t.x/t.z),r=Math.floor(t.x>t.z?e*t.z/t.x:e),i=10+n,a=10+r;if(this.renderTarget!=null&&(this.renderTarget.width!==i||this.renderTarget.height!==a)&&(this.renderTarget.dispose(),this.renderTarget=null,this.renderTargetBlur.dispose(),this.renderTargetBlur=null),this.renderTarget==null){let e={format:C};this.renderTarget=new gt(i,a,e),this.renderTargetBlur=new gt(i,a,e),this.floor.material.map=this.renderTarget.texture}this.camera.scale.set(t.x*(1+10/n),t.z*(1+10/r),1),this.needsUpdate=!0}setIntensity(e){this.intensity=e,e>0?(this.visible=!0,this.floor.visible=!0,this.floor.material.opacity=e*Gy(Jy,1,this.softness*this.softness)):(this.visible=!1,this.floor.visible=!1)}getIntensity(){return this.intensity}setOffset(e){this.floor.position.z=-e+this.gap()}gap(){return .001*this.maxDimension}render(e,t){t.overrideMaterial=this.depthMaterial;let n=e.getClearAlpha();e.setClearAlpha(0),this.floor.visible=!1;let r=e.xr.enabled;e.xr.enabled=!1;let i=e.getRenderTarget();e.setRenderTarget(this.renderTarget),e.render(t,this.camera),t.overrideMaterial=null,this.floor.visible=!0,this.blurShadow(e),e.xr.enabled=r,e.setRenderTarget(i),e.setClearAlpha(n)}blurShadow(e){let{camera:t,horizontalBlurMaterial:n,verticalBlurMaterial:r,renderTarget:i,renderTargetBlur:a,blurPlane:o}=this;o.visible=!0,o.material=n,n.uniforms.h.value=1/this.renderTarget.width,n.uniforms.tDiffuse.value=this.renderTarget.texture,e.setRenderTarget(a),e.render(o,t),o.material=r,r.uniforms.v.value=1/this.renderTarget.height,r.uniforms.tDiffuse.value=this.renderTargetBlur.texture,e.setRenderTarget(i),e.render(o,t),o.visible=!1}dispose(){this.renderTarget!=null&&this.renderTarget.dispose(),this.renderTargetBlur!=null&&this.renderTargetBlur.dispose(),this.depthMaterial.dispose(),this.horizontalBlurMaterial.dispose(),this.verticalBlurMaterial.dispose(),this.floor.material.dispose(),this.floor.geometry.dispose(),this.blurPlane.geometry.dispose(),this.removeFromParent()}},Xy=100,Zy=new U,Qy=new U,$y=new U,eb=new vl,tb=new U,nb=new V,rb=class extends os{constructor({canvas:e,element:t,width:n,height:r}){super(),this.annotationRenderer=new dp,this.effectRenderer=null,this.schemaElement=document.createElement(`script`),this.width=1,this.height=1,this.aspect=1,this.scaleStep=0,this.renderCount=0,this.externalRenderer=null,this.camera=new Br(45,1,.1,100),this.xrCamera=null,this.url=null,this.target=new Sn,this.animationNames=[],this.boundingBox=new St,this.boundingSphere=new Bt,this.size=new U,this.idealAspect=0,this.framedFoVDeg=0,this.shadow=null,this.shadowIntensity=0,this.shadowSoftness=1,this.bakedShadows=new Set,this.exposure=1,this.toneMapping=4,this.canScale=!0,this.isDirty=!1,this.goalTarget=new U,this.targetDamperX=new am,this.targetDamperY=new am,this.targetDamperZ=new am,this._currentGLTF=null,this._model=null,this.cancelPendingSourceChange=null,this.animationsByName=new Map,this.currentAnimationAction=null,this.groundedSkybox=new Py,this.name=`ModelScene`,this.element=t,this.canvas=e,this.camera=new Br(45,1,.1,100),this.camera.name=`MainCamera`,this.add(this.target),this.setSize(n,r),this.target.name=`Target`,this.mixer=new hl(this.target);let{domElement:i}=this.annotationRenderer,{style:a}=i;a.display=`none`,a.pointerEvents=`none`,a.position=`absolute`,a.top=`0`,this.element.shadowRoot.querySelector(`.default`).appendChild(i),this.schemaElement.setAttribute(`type`,`application/ld+json`)}get context(){return this.canvas.getContext(`2d`)}getCamera(){return this.xrCamera==null?this.camera:this.xrCamera}queueRender(){this.isDirty=!0}shouldRender(){return this.isDirty}hasRendered(){this.isDirty=!1}forceRescale(){this.scaleStep=-1,this.queueRender()}async setObject(e){this.reset(),this._model=e,this.target.add(e),await this.setupScene()}async setSource(e,t=()=>{}){if(!e||e===this.url){t(1);return}if(this.reset(),this.url=e,this.externalRenderer!=null){let e=await this.externalRenderer.load(t);this.boundingSphere.radius=e.framedRadius,this.idealAspect=e.fieldOfViewAspect;return}this.cancelPendingSourceChange!=null&&(this.cancelPendingSourceChange(),this.cancelPendingSourceChange=null);let n;try{n=await new Promise(async(n,r)=>{this.cancelPendingSourceChange=()=>r();try{n(await this.element[Qb].loader.load(e,this.element,t))}catch(e){r(e)}})}catch(e){if(e==null)return;throw e}this.cancelPendingSourceChange=null,this.reset(),this.url=e,this._currentGLTF=n,n!=null&&(this._model=n.scene,this.target.add(n.scene));let{animations:r}=n,i=new Map,a=[];for(let e of r)i.set(e.name,e),a.push(e.name);this.animations=r,this.animationsByName=i,this.animationNames=a,await this.setupScene()}async setupScene(){this.applyTransform(),this.updateBoundingBox(),await this.updateFraming(),this.updateShadow(),this.setShadowIntensity(this.shadowIntensity),this.setGroundedSkybox()}reset(){this.url=null,this.renderCount=0,this.queueRender(),this.shadow!=null&&this.shadow.setIntensity(0),this.bakedShadows.clear();let{_model:e}=this;e!=null&&(e.removeFromParent(),this._model=null);let t=this._currentGLTF;t!=null&&(t.dispose(),this._currentGLTF=null),this.currentAnimationAction!=null&&(this.currentAnimationAction.stop(),this.currentAnimationAction=null),this.mixer.stopAllAction(),this.mixer.uncacheRoot(this)}dispose(){this.reset(),this.shadow!=null&&(this.shadow.dispose(),this.shadow=null),this.element[Oy]=null,this.element[ky]=null,this.element[Ay]=null}get currentGLTF(){return this._currentGLTF}setSize(e,t){if(this.width!==e||this.height!==t){if(this.width=Math.max(e,1),this.height=Math.max(t,1),this.annotationRenderer.setSize(e,t),this.aspect=this.width/this.height,this.externalRenderer!=null){let n=Gu();this.externalRenderer.resize(e*n,t*n)}this.queueRender()}}markBakedShadow(e){e.userData.noHit=!0,this.bakedShadows.add(e)}unmarkBakedShadow(e){e.userData.noHit=!1,e.visible=!0,this.bakedShadows.delete(e),this.boundingBox.expandByObject(e)}findBakedShadows(e){let t=new St;e.traverse(e=>{let n=e;if(!n.material||!n.material.transparent)return;t.setFromObject(n);let r=t.getSize(tb),i=Math.min(r.x,r.y,r.z);Math.max(r.x,r.y,r.z)<Xy*i||this.markBakedShadow(n)})}checkBakedShadows(){let{min:e,max:t}=this.boundingBox,n=new St;this.boundingBox.getSize(this.size);for(let r of this.bakedShadows)n.setFromObject(r),!(n.min.y<e.y+this.size.y/Xy&&n.min.x<=e.x&&n.max.x>=t.x&&n.min.z<=e.z&&n.max.z>=t.z)&&(n.min.z<e.z+this.size.z/Xy&&n.min.x<=e.x&&n.max.x>=t.x&&n.min.y<=e.y&&n.max.y>=t.y||this.unmarkBakedShadow(r))}applyTransform(){let{model:e}=this;if(e==null)return;let t=mm(this.element.orientation)[0].terms,n=Tm(t[0]).number,r=Tm(t[1]).number,i=Tm(t[2]).number;e.quaternion.setFromEuler(new an(r,i,n,`YXZ`));let a=mm(this.element.scale)[0].terms;e.scale.set(a[0].number,a[1].number,a[2].number)}updateBoundingBox(){let{model:e}=this;if(e==null)return;this.target.remove(e),this.findBakedShadows(e);let t=(e,t)=>e.expandByPoint(t);this.setBakedShadowVisibility(!1),this.boundingBox=fp(e,t,new St),this.boundingBox.isEmpty()&&(this.setBakedShadowVisibility(!0),this.bakedShadows.forEach(e=>this.unmarkBakedShadow(e)),this.boundingBox=fp(e,t,new St)),this.checkBakedShadows(),this.setBakedShadowVisibility(),this.boundingBox.getSize(this.size),this.target.add(e)}async updateFraming(){let{model:e}=this;if(e==null)return;this.target.remove(e),this.setBakedShadowVisibility(!1);let{center:t}=this.boundingSphere;this.element.requestUpdate(`cameraTarget`),await this.element.updateComplete,t.copy(this.getTarget());let n=(e,n)=>Math.max(e,t.distanceToSquared(n));this.boundingSphere.radius=Math.sqrt(fp(e,n,0));let r=(e,n)=>{n.sub(t);let r=Math.sqrt(n.x*n.x+n.z*n.z);return Math.max(e,r/(this.idealCameraDistance()-Math.abs(n.y)))};this.idealAspect=fp(e,r,0)/Math.tan(this.framedFoVDeg/2*Math.PI/180),this.setBakedShadowVisibility(),this.target.add(e)}setBakedShadowVisibility(e=this.shadowIntensity<=0){for(let t of this.bakedShadows)t.visible=e}idealCameraDistance(){let e=this.framedFoVDeg/2*Math.PI/180;return this.boundingSphere.radius/Math.sin(e)}adjustedFoV(e){let t=Math.tan(e/2*Math.PI/180)*Math.max(1,this.idealAspect/this.aspect);return 2*Math.atan(t)*180/Math.PI}getNDC(e,t){if(this.xrCamera!=null)nb.set(e/window.screen.width,t/window.screen.height);else{let n=this.element.getBoundingClientRect();nb.set((e-n.x)/this.width,(t-n.y)/this.height)}return nb.multiplyScalar(2).subScalar(1),nb.y*=-1,nb}getSize(){return{width:this.width,height:this.height}}setEnvironmentAndSkybox(e,t){this.element[Qb].arRenderer.presentedScene!==this&&(this.environment=e,this.setBackground(t),this.queueRender())}setBackground(e){this.groundedSkybox.map=e,this.groundedSkybox.isUsable()?(this.target.add(this.groundedSkybox),this.background=null):(this.target.remove(this.groundedSkybox),this.background=e)}farRadius(){return this.boundingSphere.radius*(this.groundedSkybox.parent==null?1:10)}setGroundedSkybox(){let e=mm(this.element.skyboxHeight)[0].terms[0],t=Tm(e).number,n=10*this.boundingSphere.radius;this.groundedSkybox.updateGeometry(t,n),this.groundedSkybox.position.y=t-(this.shadow?2*this.shadow.gap():0),this.setBackground(this.groundedSkybox.map)}setTarget(e,t,n){this.goalTarget.set(-e,-t,-n)}setTargetDamperDecayTime(e){this.targetDamperX.setDecayTime(e),this.targetDamperY.setDecayTime(e),this.targetDamperZ.setDecayTime(e)}getTarget(){return this.goalTarget.clone().multiplyScalar(-1)}jumpToGoal(){this.updateTarget(rm)}updateTarget(e){let t=this.goalTarget,n=this.target.position;if(t.equals(n))return!1;{let r=this.boundingSphere.radius/10,{x:i,y:a,z:o}=n;return i=this.targetDamperX.update(i,t.x,e,r),a=this.targetDamperY.update(a,t.y,e,r),o=this.targetDamperZ.update(o,t.z,e,r),this.groundedSkybox.position.x=-i,this.groundedSkybox.position.z=-o,this.target.position.set(i,a,o),this.target.updateMatrixWorld(),this.queueRender(),!0}}pointTowards(e,t){let{x:n,z:r}=this.position;this.yaw=Math.atan2(e-n,t-r)}get model(){return this._model}set yaw(e){this.rotation.y=e,this.groundedSkybox.rotation.y=-e,this.queueRender()}get yaw(){return this.rotation.y}set animationTime(e){this.mixer.setTime(e),this.queueShadowRender()}get animationTime(){if(this.currentAnimationAction!=null){let e=Math.max(this.currentAnimationAction._loopCount,0);return this.currentAnimationAction.loop===2202&&(e&1)==1?this.duration-this.currentAnimationAction.time:this.currentAnimationAction.time}return 0}set animationTimeScale(e){this.mixer.timeScale=e}get animationTimeScale(){return this.mixer.timeScale}get duration(){return this.currentAnimationAction!=null&&this.currentAnimationAction.getClip()?this.currentAnimationAction.getClip().duration:0}get hasActiveAnimation(){return this.currentAnimationAction!=null}playAnimation(e=null,t=0,n=ie,r=1/0){if(this._currentGLTF==null)return;let{animations:i}=this;if(i==null||i.length===0)return;let a=null;if(e!=null&&(a=this.animationsByName.get(e),a==null)){let t=parseInt(e);!isNaN(t)&&t>=0&&t<i.length&&(a=i[t])}a??=i[0];try{let{currentAnimationAction:e}=this,i=this.mixer.clipAction(a,this);this.currentAnimationAction=i,this.element.paused?this.mixer.stopAllAction():(i.paused=!1,e!=null&&i!==e?i.crossFadeFrom(e,t,!1):this.animationTimeScale>0&&this.animationTime==this.duration&&(this.animationTime=0)),i.setLoop(n,r),i.enabled=!0,i.clampWhenFinished=!0,i.play()}catch(e){console.error(e)}}stopAnimation(){this.currentAnimationAction=null,this.mixer.stopAllAction()}updateAnimation(e){this.mixer.update(e),this.queueShadowRender()}subscribeMixerEvent(e,t){this.mixer.addEventListener(e,t)}updateShadow(){let e=this.shadow;if(e!=null){let t=this.element.arPlacement===`wall`?`back`:`bottom`;e.setScene(this,this.shadowSoftness,t),e.needsUpdate=!0}}renderShadow(e){let t=this.shadow;t!=null&&t.needsUpdate==1&&(t.render(e,this),t.needsUpdate=!1)}queueShadowRender(){this.shadow!=null&&(this.shadow.needsUpdate=!0)}setShadowIntensity(e){if(this.shadowIntensity=e,this._currentGLTF!=null&&(this.setBakedShadowVisibility(),!(e<=0&&this.shadow==null))){if(this.shadow==null){let e=this.element.arPlacement===`wall`?`back`:`bottom`;this.shadow=new Yy(this,this.shadowSoftness,e)}this.shadow.setIntensity(e)}}setShadowSoftness(e){this.shadowSoftness=e,this.shadow?.setSoftness(e)}setShadowOffset(e){this.shadow?.setOffset(e)}hitFromPoint(e,t=this){return eb.setFromCamera(e,this.getCamera()),eb.intersectObject(t,!0).find(e=>e.object.visible&&!e.object.userData.noHit)}positionAndNormalFromPoint(e,t=this){let n=this.hitFromPoint(e,t);return n==null?null:{position:n.point,normal:n.face==null?eb.ray.direction.clone().multiplyScalar(-1):n.face.normal.clone().applyNormalMatrix(new H().getNormalMatrix(n.object.matrixWorld)),uv:n.uv??null}}surfaceFromPoint(e,t=this){let n=this.element.model;if(n==null)return null;let r=this.hitFromPoint(e,t);if(r==null||r.face==null)return null;let{meshes:i,primitives:a}=n[yy](r).mesh.userData.associations,o=new U,s=new U,c=new U,{a:l,b:u,c:d}=r.face,f=r.object;f.getVertexPosition(l,o),f.getVertexPosition(u,s),f.getVertexPosition(d,c);let p=new Nn(o,s,c),m=new U;return p.getBarycoord(f.worldToLocal(r.point),m),`${i} ${a} ${l} ${u} ${d} ${m.x.toFixed(3)} ${m.y.toFixed(3)} ${m.z.toFixed(3)}`}addHotspot(e){this.target.add(e),this.annotationRenderer.domElement.appendChild(e.element)}removeHotspot(e){this.target.remove(e)}forHotspots(e){let{children:t}=this.target;for(let n=0,r=t.length;n<r;n++){let r=t[n];r instanceof Hy&&e(r)}}initializeSurface(e){if(e.surface!=null&&e.mesh==null){let t=mm(e.surface)[0].terms;if(t.length!=8){console.warn(e.surface+` does not have exactly 8 numbers.`);return}let n=this.element.model[by](t[0].number,t[1].number),r=new U(t[2].number,t[3].number,t[4].number);if(n==null){console.warn(e.surface+` does not match a node/primitive in this glTF! Skipping this hotspot.`);return}let i=n.mesh.geometry.attributes.position.count;if(r.x>=i||r.y>=i||r.z>=i){console.warn(e.surface+` vertex indices out of range in this glTF! Skipping this hotspot.`);return}let a=new U(t[5].number,t[6].number,t[7].number);e.mesh=n.mesh,e.tri=r,e.bary=a}}updateSurfaceHotspots(){let e=!this.element.paused;this.forHotspots(t=>{this.initializeSurface(t),t.updateSurface(e)})}updateHotspotsVisibility(e){this.forHotspots(t=>{Zy.copy(e),Qy.setFromMatrixPosition(t.matrixWorld),Zy.sub(Qy),$y.copy(t.normal).transformDirection(this.target.matrixWorld),Zy.dot($y)<0?t.hide():t.show()})}orientHotspots(e){this.forHotspots(t=>{t.orient(e)})}setHotspotsVisibility(e){this.forHotspots(t=>{t.visible=e})}updateSchema(e){let{schemaElement:t,element:n}=this,{alt:r,poster:i,iosSrc:a}=n;if(e!=null){let n=[{"@type":`MediaObject`,contentUrl:e,encodingFormat:e.split(`.`).pop()?.toLowerCase()===`gltf`?`model/gltf+json`:`model/gltf-binary`}];a&&n.push({"@type":`MediaObject`,contentUrl:a,encodingFormat:`model/vnd.usdz+zip`}),t.textContent=JSON.stringify({"@context":`http://schema.org/`,"@type":`3DModel`,image:i??void 0,name:r??void 0,encoding:n}),document.head.appendChild(t)}else t.parentElement!=null&&t.parentElement.removeChild(t)}},ib=class extends EventTarget{constructor(){super(...arguments),this.ongoingActivities=new Set,this.totalProgress=0}get ongoingActivityCount(){return this.ongoingActivities.size}beginActivity(e){let t={progress:0,completed:!1};return this.ongoingActivities.add(t),this.ongoingActivityCount===1&&this.announceTotalProgress(t,0,e),n=>{let r;return r=Math.max(Wu(n,0,1),t.progress),r!==t.progress&&this.announceTotalProgress(t,r,e),t.progress}}announceTotalProgress(e,t,n){let r=0,i=0;t==1&&(e.completed=!0);for(let e of this.ongoingActivities){let{progress:t}=e;r+=1-t,e.completed&&i++}let a=e.progress;e.progress=t,this.totalProgress+=(t-a)*(1-this.totalProgress)/r;let o=i===this.ongoingActivityCount?1:this.totalProgress;this.dispatchEvent(new CustomEvent(`progress`,{detail:{totalProgress:o,reason:n}})),i===this.ongoingActivityCount&&(this.totalProgress=0,this.ongoingActivities.clear())}},ab=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},ob,sb,cb,lb,ub,db,fb,pb,mb,hb,gb,_b,vb,yb=10,bb=50,xb=0,Sb=300,Cb=150,wb=document.createElement(`canvas`),Tb=Symbol(`fallbackResizeHandler`),Eb=Symbol(`defaultAriaLabel`),Db=Symbol(`resizeObserver`),Ob=Symbol(`clearModelTimeout`),kb=Symbol(`onContextLost`),Ab=Symbol(`loaded`),jb=Symbol(`status`),Mb=Symbol(`onFocus`),Nb=Symbol(`onBlur`),Pb=Symbol(`updateSize`),Fb=Symbol(`intersectionObserver`),Ib=Symbol(`isElementInViewport`),Lb=Symbol(`announceModelVisibility`),Rb=Symbol(`ariaLabel`),zb=Symbol(`altDefaulted`),Bb=Symbol(`statusElement`),Vb=Symbol(`updateStatus`),Hb=Symbol(`loadedTime`),Ub=Symbol(`updateSource`),Wb=Symbol(`markLoaded`),Gb=Symbol(`container`),Kb=Symbol(`input`),qb=Symbol(`canvas`),$=Symbol(`scene`),Jb=Symbol(`needsRender`),Yb=Symbol(`tick`),Xb=Symbol(`onModelLoad`),Zb=Symbol(`onResize`),Qb=Symbol(`renderer`),$b=Symbol(`progressTracker`),ex=Symbol(`getLoaded`),tx=Symbol(`getModelIsVisible`),nx=Symbol(`shouldAttemptPreload`),rx=e=>({x:e.x,y:e.y,z:e.z,toString(){return`${this.x}m ${this.y}m ${this.z}m`}}),ix=e=>({u:e.x,v:e.y,toString(){return`${this.u} ${this.v}`}}),ax=class extends Rl{constructor(){super(),this.alt=null,this.src=null,this.withCredentials=!1,this.generateSchema=!1,this[ob]=!1,this[sb]=!1,this[cb]=0,this[lb]=``,this[ub]=null,this[db]=Uu(()=>{let e=this.getBoundingClientRect();this[Pb](e)},bb),this[fb]=Uu(e=>{let t=this.modelIsVisible;t!==e&&this.dispatchEvent(new CustomEvent(`model-visibility`,{detail:{visible:t}}))},xb),this[pb]=null,this[mb]=null,this[hb]=new ib,this[gb]=()=>{this[Bb].textContent=this[jb]},this[_b]=()=>{this[Bb].textContent=``},this[vb]=e=>{this.dispatchEvent(new CustomEvent(`error`,{detail:{type:`webglcontextlost`,sourceError:e.sourceEvent}}))},this.attachShadow({mode:`open`});let e=this.shadowRoot;cd(e),this[Gb]=e.querySelector(`.container`),this[Kb]=e.querySelector(`.userInput`),this[qb]=e.querySelector(`canvas`),this[Bb]=e.querySelector(`#status`),this[Eb]=this[Kb].getAttribute(`aria-label`);let t,n;if(this.isConnected){let e=this.getBoundingClientRect();t=e.width,n=e.height}else t=Sb,n=Cb;this[$]=new rb({canvas:this[qb],element:this,width:t,height:n}),Promise.resolve().then(()=>{this[Pb](this.getBoundingClientRect())}),ku&&(this[Db]=new ResizeObserver(e=>{if(!this[Qb].isPresenting)for(let t of e)t.target===this&&this[Pb](t.contentRect)})),Au?this[Fb]=new IntersectionObserver(e=>{for(let t of e)if(t.target===this){let e=this.modelIsVisible;this[Ib]=t.isIntersecting,this[Lb](e),this[Ib]&&!this.loaded&&this[Ub]()}},{root:null,rootMargin:`0px`,threshold:1e-5}):this[Ib]=!0}static get is(){return`model-viewer`}static set modelCacheSize(e){ip[np].evictionThreshold=e}static get modelCacheSize(){return ip[np].evictionThreshold}static set minimumRenderScale(e){e>1&&console.warn(`<model-viewer> minimumRenderScale has been clamped to a maximum value of 1.`),e<=0&&console.warn(`<model-viewer> minimumRenderScale has been clamped to a minimum value of 0.25.`),q_.singleton.minScale=e}static get minimumRenderScale(){return q_.singleton.minScale}get loaded(){return this[ex]()}get[(ob=Ib,sb=Ab,cb=Hb,lb=jb,ub=Ob,db=Tb,fb=Lb,pb=Db,mb=Fb,hb=$b,Qb)](){return q_.singleton}get modelIsVisible(){return this[tx]()}connectedCallback(){super.connectedCallback&&super.connectedCallback(),ku?this[Db].observe(this):self.addEventListener(`resize`,this[Tb]),Au&&this[Fb].observe(this),this.addEventListener(`focus`,this[Mb]),this.addEventListener(`blur`,this[Nb]);let e=this[Qb];e.addEventListener(`contextlost`,this[kb]),e.registerScene(this[$]),this[Ob]!=null&&(self.clearTimeout(this[Ob]),this[Ob]=null,this.requestUpdate(`src`,null))}disconnectedCallback(){super.disconnectedCallback&&super.disconnectedCallback(),ku?this[Db].unobserve(this):self.removeEventListener(`resize`,this[Tb]),Au&&this[Fb].unobserve(this),this.removeEventListener(`focus`,this[Mb]),this.removeEventListener(`blur`,this[Nb]);let e=this[Qb];e.removeEventListener(`contextlost`,this[kb]),e.unregisterScene(this[$]),this[Ob]=self.setTimeout(()=>{this[$].dispose(),this[Ob]=null},yb)}updated(e){super.updated(e),e.has(`src`)&&(this.src==null?(this[Ab]=!1,this[Hb]=0,this[$].reset()):this.src!==this[$].url&&(this[Ab]=!1,this[Hb]=0,this[Ub]())),e.has(`alt`)&&this[Kb].setAttribute(`aria-label`,this[Rb]),e.has(`withCredentials`)&&(ip.withCredentials=this.withCredentials,this[Qb].textureUtils.withCredentials=this.withCredentials),e.has(`generateSchema`)&&(this.generateSchema?this[$].updateSchema(this.src):this[$].updateSchema(null))}toDataURL(e,t){return this[Qb].displayCanvas(this[$]).toDataURL(e,t)}async toBlob(e){let t=e?e.mimeType:void 0,n=e?e.qualityArgument:void 0,r=e?e.idealAspect:void 0,{width:i,height:a,idealAspect:o,aspect:s}=this[$],{dpr:c,scaleFactor:l}=this[Qb],u=i*l*c,d=a*l*c,f=0,p=0;if(r===!0){if(o>s){let e=d;d=Math.round(u/o),p=(e-d)/2}else{let e=u;u=Math.round(d*o),f=(e-u)/2}}wb.width=u,wb.height=d;try{return new Promise(async(e,r)=>{wb.getContext(`2d`).drawImage(this[Qb].displayCanvas(this[$]),f,p,u,d,0,0,u,d),wb.toBlob(t=>{if(!t)return r(Error(`Unable to retrieve canvas blob`));e(t)},t,n)})}finally{this[Pb]({width:i,height:a})}}registerEffectComposer(e){e.setRenderer(this[Qb].threeRenderer),e.setMainCamera(this[$].getCamera()),e.setMainScene(this[$]),this[$].effectRenderer=e}unregisterEffectComposer(){this[$].effectRenderer=null}registerRenderer(e){this[$].externalRenderer=e}unregisterRenderer(){this[$].externalRenderer=null}get[Rb](){return this[zb]}get[zb](){return this.alt==null||this.alt===`null`?this[Eb]:this.alt}[ex](){return this[Ab]}[tx](){return this.loaded&&this[Ib]}[nx](){return!!this.src&&this[Ib]}[Pb]({width:e,height:t}){e!==0&&t!==0&&(this[Gb].style.width=`${e}px`,this[Gb].style.height=`${t}px`,this[Zb]({width:e,height:t}))}[Yb](e,t){var n;(n=this[$].effectRenderer)==null||n.beforeRender(e,t)}[Wb](){this[Ab]||(this[Ab]=!0,this[Hb]=performance.now())}[Jb](){this[$].queueRender()}[Xb](){}[Vb](e){this[jb]=e;let t=this.getRootNode();t!=null&&t.activeElement===this&&this[Bb].textContent!=e&&(this[Bb].textContent=e)}[(gb=Mb,_b=Nb,Zb)](e){this[$].setSize(e.width,e.height)}async[(vb=kb,Ub)](){let e=this[$];if(this.loaded||!this[nx]()||this.src===e.url)return;this.generateSchema&&e.updateSchema(this.src),this[Vb](`Loading`),e.stopAnimation();let t=this[$b].beginActivity(`model-load`),n=this.src;try{let r=e.setSource(n,e=>t(Wu(e,0,1)*.95)),i=this[nd]();await Promise.all([r,i]),this[Wb](),this[Xb](),this.updateComplete.then(()=>{this.dispatchEvent(new CustomEvent(`before-render`))}),await new Promise(e=>{requestAnimationFrame(()=>{requestAnimationFrame(()=>{this.dispatchEvent(new CustomEvent(`load`,{detail:{url:n}})),e()})})})}catch(e){this.dispatchEvent(new CustomEvent(`error`,{detail:{type:`loadfailure`,sourceError:e}}))}finally{t(1)}}};ab([r({type:String})],ax.prototype,`alt`,void 0),ab([r({type:String})],ax.prototype,`src`,void 0),ab([r({type:Boolean,attribute:`with-credentials`})],ax.prototype,`withCredentials`,void 0),ab([r({type:Boolean,attribute:`generate-schema`})],ax.prototype,`generateSchema`,void 0);var ox=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},sx=1e3,cx=Symbol(`changeAnimation`),lx=Symbol(`paused`),ux={repetitions:1/0,pingpong:!1},dx=e=>{var t;class n extends e{constructor(...e){super(e),this.autoplay=!1,this.animationName=void 0,this.animationCrossfadeDuration=300,this[t]=!0,this[$].subscribeMixerEvent(`loop`,e=>{let t=e.action._loopCount;this.dispatchEvent(new CustomEvent(`loop`,{detail:{count:t}}))}),this[$].subscribeMixerEvent(`finished`,()=>{this[lx]=!0,this.dispatchEvent(new CustomEvent(`finished`))})}get availableAnimations(){return this.loaded?this[$].animationNames:[]}get duration(){return this[$].duration}get paused(){return this[lx]}get currentTime(){return this[$].animationTime}set currentTime(e){this[$].animationTime=e,this[Jb]()}get timeScale(){return this[$].animationTimeScale}set timeScale(e){this[$].animationTimeScale=e}pause(){this[lx]||(this[lx]=!0,this.dispatchEvent(new CustomEvent(`pause`)))}play(e){this.availableAnimations.length>0&&(this[lx]=!1,this[cx](e),this.dispatchEvent(new CustomEvent(`play`)))}[(t=lx,Xb)](){super[Xb](),this[lx]=!0,this.animationName!=null&&this[cx](),this.autoplay&&this.play()}[Yb](e,t){super[Yb](e,t),!(this[lx]||!this[tx]()&&!this[Qb].isPresenting)&&(this[$].updateAnimation(t/sx),this[Jb]())}updated(e){super.updated(e),e.has(`autoplay`)&&this.autoplay&&this.play(),e.has(`animationName`)&&this[cx]()}[cx](e=ux){let t=e.repetitions??1/0,n=e.pingpong?ae:t===1?re:ie;this[$].playAnimation(this.animationName,this.animationCrossfadeDuration/sx,n,t),this[lx]&&(this[$].updateAnimation(0),this[Jb]())}}return ox([r({type:Boolean})],n.prototype,`autoplay`,void 0),ox([r({type:String,attribute:`animation-name`})],n.prototype,`animationName`,void 0),ox([r({type:Number,attribute:`animation-crossfade-duration`})],n.prototype,`animationCrossfadeDuration`,void 0),n},fx=Symbol(`hotspotMap`),px=Symbol(`mutationCallback`),mx=Symbol(`observer`),hx=Symbol(`addHotspot`),gx=Symbol(`removeHotspot`),_x=new W,vx=e=>{var t,n,r;class i extends e{constructor(){super(...arguments),this[t]=new Map,this[n]=e=>{e.forEach(e=>{(!(e instanceof MutationRecord)||e.type===`childList`)&&(e.addedNodes.forEach(e=>{this[hx](e)}),e.removedNodes.forEach(e=>{this[gx](e)}),this[Jb]())})},this[r]=new MutationObserver(this[px])}connectedCallback(){super.connectedCallback();for(let e=0;e<this.children.length;++e)this[hx](this.children[e]);let{ShadyDOM:e}=self;e==null?this[mx].observe(this,{childList:!0}):this[mx]=e.observeChildren(this,this[px])}disconnectedCallback(){super.disconnectedCallback();let{ShadyDOM:e}=self;e==null?this[mx].disconnect():e.unobserveChildren(this[mx])}[(t=fx,n=px,r=mx,Yb)](e,t){super[Yb](e,t);let n=this[$],{annotationRenderer:r}=n,i=n.getCamera();n.shouldRender()&&(n.updateSurfaceHotspots(),n.updateHotspotsVisibility(i.position),r.domElement.style.display=``,r.render(n,i))}updateHotspot(e){let t=this[fx].get(e.name);t!=null&&(t.updatePosition(e.position),t.updateNormal(e.normal),t.surface=e.surface,this[Jb]())}queryHotspot(e){let t=this[fx].get(e);if(t==null)return null;let n=rx(t.position),r=rx(t.normal),i=t.facingCamera,a=this[$],o=a.getCamera(),s=new U;s.setFromMatrixPosition(t.matrixWorld),s.project(o);let c=a.width/2,l=a.height/2;s.x=s.x*c+c,s.y=-(s.y*l)+l;let u=rx(new U(s.x,s.y,s.z));return!Number.isFinite(u.x)||!Number.isFinite(u.y)?null:{position:n,normal:r,canvasPosition:u,facingCamera:i}}positionAndNormalFromPoint(e,t){let n=this[$],r=n.getNDC(e,t),i=n.positionAndNormalFromPoint(r);if(i==null)return null;_x.copy(n.target.matrixWorld).invert();let a=rx(i.position.applyMatrix4(_x)),o=rx(i.normal.transformDirection(_x)),s=null;return i.uv!=null&&(s=ix(i.uv)),{position:a,normal:o,uv:s}}surfaceFromPoint(e,t){let n=this[$],r=n.getNDC(e,t);return n.surfaceFromPoint(r)}[hx](e){if(!(e instanceof HTMLElement&&e.slot.indexOf(`hotspot`)===0))return;let t=this[fx].get(e.slot);t==null?(t=new Hy({name:e.slot,position:e.dataset.position,normal:e.dataset.normal,surface:e.dataset.surface}),this[fx].set(e.slot,t),this[$].addHotspot(t)):t.increment(),this[$].queueRender()}[gx](e){if(!(e instanceof HTMLElement))return;let t=this[fx].get(e.slot);t&&(t.decrement()&&(this[$].removeHotspot(t),this[fx].delete(e.slot)),this[$].queueRender())}}return i},yx=Uint8Array,bx=Uint16Array,xx=Int32Array,Sx=new yx([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0,0]),Cx=new yx([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13,0,0]),wx=new yx([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),Tx=function(e,t){for(var n=new bx(31),r=0;r<31;++r)n[r]=t+=1<<e[r-1];for(var i=new xx(n[30]),r=1;r<30;++r)for(var a=n[r];a<n[r+1];++a)i[a]=a-n[r]<<5|r;return{b:n,r:i}},Ex=Tx(Sx,2),Dx=Ex.b,Ox=Ex.r;Dx[28]=258,Ox[258]=28;var kx=Tx(Cx,0);kx.b;for(var Ax=kx.r,jx=new bx(32768),Mx=0;Mx<32768;++Mx){var Nx=(Mx&43690)>>1|(Mx&21845)<<1;Nx=(Nx&52428)>>2|(Nx&13107)<<2,Nx=(Nx&61680)>>4|(Nx&3855)<<4,jx[Mx]=((Nx&65280)>>8|(Nx&255)<<8)>>1}for(var Px=(function(e,t,n){for(var r=e.length,i=0,a=new bx(t);i<r;++i)e[i]&&++a[e[i]-1];var o=new bx(t);for(i=1;i<t;++i)o[i]=o[i-1]+a[i-1]<<1;var s;if(n){s=new bx(1<<t);var c=15-t;for(i=0;i<r;++i)if(e[i])for(var l=i<<4|e[i],u=t-e[i],d=o[e[i]-1]++<<u,f=d|(1<<u)-1;d<=f;++d)s[jx[d]>>c]=l}else for(s=new bx(r),i=0;i<r;++i)e[i]&&(s[i]=jx[o[e[i]-1]++]>>15-e[i]);return s}),Fx=new yx(288),Mx=0;Mx<144;++Mx)Fx[Mx]=8;for(var Mx=144;Mx<256;++Mx)Fx[Mx]=9;for(var Mx=256;Mx<280;++Mx)Fx[Mx]=7;for(var Mx=280;Mx<288;++Mx)Fx[Mx]=8;for(var Ix=new yx(32),Mx=0;Mx<32;++Mx)Ix[Mx]=5;var Lx=Px(Fx,9,0),Rx=Px(Ix,5,0),zx=function(e){return(e+7)/8|0},Bx=function(e,t,n){return(t==null||t<0)&&(t=0),(n==null||n>e.length)&&(n=e.length),new yx(e.subarray(t,n))},Vx=[`unexpected EOF`,`invalid block type`,`invalid length/literal`,`invalid distance`,`stream finished`,`no stream handler`,,`no callback`,`invalid UTF-8 data`,`extra field too long`,`date not in range 1980-2099`,`filename too long`,`stream finishing`,`invalid zip data`],Hx=function(e,t,n){var r=Error(t||Vx[e]);if(r.code=e,Error.captureStackTrace&&Error.captureStackTrace(r,Hx),!n)throw r;return r},Ux=function(e,t,n){n<<=t&7;var r=t/8|0;e[r]|=n,e[r+1]|=n>>8},Wx=function(e,t,n){n<<=t&7;var r=t/8|0;e[r]|=n,e[r+1]|=n>>8,e[r+2]|=n>>16},Gx=function(e,t){for(var n=[],r=0;r<e.length;++r)e[r]&&n.push({s:r,f:e[r]});var i=n.length,a=n.slice();if(!i)return{t:Qx,l:0};if(i==1){var o=new yx(n[0].s+1);return o[n[0].s]=1,{t:o,l:1}}n.sort(function(e,t){return e.f-t.f}),n.push({s:-1,f:25001});var s=n[0],c=n[1],l=0,u=1,d=2;for(n[0]={s:-1,f:s.f+c.f,l:s,r:c};u!=i-1;)s=n[n[l].f<n[d].f?l++:d++],c=n[l!=u&&n[l].f<n[d].f?l++:d++],n[u++]={s:-1,f:s.f+c.f,l:s,r:c};for(var f=a[0].s,r=1;r<i;++r)a[r].s>f&&(f=a[r].s);var p=new bx(f+1),m=Kx(n[u-1],p,0);if(m>t){var r=0,h=0,g=m-t,_=1<<g;for(a.sort(function(e,t){return p[t.s]-p[e.s]||e.f-t.f});r<i;++r){var v=a[r].s;if(p[v]>t)h+=_-(1<<m-p[v]),p[v]=t;else break}for(h>>=g;h>0;){var y=a[r].s;p[y]<t?h-=1<<t-p[y]++-1:++r}for(;r>=0&&h;--r){var b=a[r].s;p[b]==t&&(--p[b],++h)}m=t}return{t:new yx(p),l:m}},Kx=function(e,t,n){return e.s==-1?Math.max(Kx(e.l,t,n+1),Kx(e.r,t,n+1)):t[e.s]=n},qx=function(e){for(var t=e.length;t&&!e[--t];);for(var n=new bx(++t),r=0,i=e[0],a=1,o=function(e){n[r++]=e},s=1;s<=t;++s)if(e[s]==i&&s!=t)++a;else{if(!i&&a>2){for(;a>138;a-=138)o(32754);a>2&&(o(a>10?a-11<<5|28690:a-3<<5|12305),a=0)}else if(a>3){for(o(i),--a;a>6;a-=6)o(8304);a>2&&(o(a-3<<5|8208),a=0)}for(;a--;)o(i);a=1,i=e[s]}return{c:n.subarray(0,r),n:t}},Jx=function(e,t){for(var n=0,r=0;r<t.length;++r)n+=e[r]*t[r];return n},Yx=function(e,t,n){var r=n.length,i=zx(t+2);e[i]=r&255,e[i+1]=r>>8,e[i+2]=e[i]^255,e[i+3]=e[i+1]^255;for(var a=0;a<r;++a)e[i+a+4]=n[a];return(i+4+r)*8},Xx=function(e,t,n,r,i,a,o,s,c,l,u){Ux(t,u++,n),++i[256];for(var d=Gx(i,15),f=d.t,p=d.l,m=Gx(a,15),h=m.t,g=m.l,_=qx(f),v=_.c,y=_.n,b=qx(h),x=b.c,S=b.n,C=new bx(19),w=0;w<v.length;++w)++C[v[w]&31];for(var w=0;w<x.length;++w)++C[x[w]&31];for(var T=Gx(C,7),E=T.t,D=T.l,O=19;O>4&&!E[wx[O-1]];--O);var k=l+5<<3,A=Jx(i,Fx)+Jx(a,Ix)+o,j=Jx(i,f)+Jx(a,h)+o+14+3*O+Jx(C,E)+2*C[16]+3*C[17]+7*C[18];if(c>=0&&k<=A&&k<=j)return Yx(t,u,e.subarray(c,c+l));var ee,M,N,P;if(Ux(t,u,1+(j<A)),u+=2,j<A){ee=Px(f,p,0),M=f,N=Px(h,g,0),P=h;var te=Px(E,D,0);Ux(t,u,y-257),Ux(t,u+5,S-1),Ux(t,u+10,O-4),u+=14;for(var w=0;w<O;++w)Ux(t,u+3*w,E[wx[w]]);u+=3*O;for(var ne=[v,x],re=0;re<2;++re)for(var ie=ne[re],w=0;w<ie.length;++w){var ae=ie[w]&31;Ux(t,u,te[ae]),u+=E[ae],ae>15&&(Ux(t,u,ie[w]>>5&127),u+=ie[w]>>12)}}else ee=Lx,M=Fx,N=Rx,P=Ix;for(var w=0;w<s;++w){var F=r[w];if(F>255){var ae=F>>18&31;Wx(t,u,ee[ae+257]),u+=M[ae+257],ae>7&&(Ux(t,u,F>>23&31),u+=Sx[ae]);var I=F&31;Wx(t,u,N[I]),u+=P[I],I>3&&(Wx(t,u,F>>5&8191),u+=Cx[I])}else Wx(t,u,ee[F]),u+=M[F]}return Wx(t,u,ee[256]),u+M[256]},Zx=new xx([65540,131080,131088,131104,262176,1048704,1048832,2114560,2117632]),Qx=new yx(0),$x=function(e,t,n,r,i,a){var o=a.z||e.length,s=new yx(r+o+5*(1+Math.ceil(o/7e3))+i),c=s.subarray(r,s.length-i),l=a.l,u=(a.r||0)&7;if(t){u&&(c[0]=a.r>>3);for(var d=Zx[t-1],f=d>>13,p=d&8191,m=(1<<n)-1,h=a.p||new bx(32768),g=a.h||new bx(m+1),_=Math.ceil(n/3),v=2*_,y=function(t){return(e[t]^e[t+1]<<_^e[t+2]<<v)&m},b=new xx(25e3),x=new bx(288),S=new bx(32),C=0,w=0,T=a.i||0,E=0,D=a.w||0,O=0;T+2<o;++T){var k=y(T),A=T&32767,j=g[k];if(h[A]=j,g[k]=A,D<=T){var ee=o-T;if((C>7e3||E>24576)&&(ee>423||!l)){u=Xx(e,c,0,b,x,S,w,E,O,T-O,u),E=C=w=0,O=T;for(var M=0;M<286;++M)x[M]=0;for(var M=0;M<30;++M)S[M]=0}var N=2,P=0,te=p,ne=A-j&32767;if(ee>2&&k==y(T-ne))for(var re=Math.min(f,ee)-1,ie=Math.min(32767,T),ae=Math.min(258,ee);ne<=ie&&--te&&A!=j;){if(e[T+N]==e[T+N-ne]){for(var F=0;F<ae&&e[T+F]==e[T+F-ne];++F);if(F>N){if(N=F,P=ne,F>re)break;for(var I=Math.min(ne,F-2),oe=0,M=0;M<I;++M){var se=T-ne+M&32767,ce=se-h[se]&32767;ce>oe&&(oe=ce,j=se)}}}A=j,j=h[A],ne+=A-j&32767}if(P){b[E++]=268435456|Ox[N]<<18|Ax[P];var le=Ox[N]&31,ue=Ax[P]&31;w+=Sx[le]+Cx[ue],++x[257+le],++S[ue],D=T+N,++C}else b[E++]=e[T],++x[e[T]]}}for(T=Math.max(T,D);T<o;++T)b[E++]=e[T],++x[e[T]];u=Xx(e,c,l,b,x,S,w,E,O,T-O,u),l||(a.r=u&7|c[u/8|0]<<3,u-=7,a.h=g,a.p=h,a.i=T,a.w=D)}else{for(var T=a.w||0;T<o+l;T+=65535){var de=T+65535;de>=o&&(c[u/8|0]=l,de=o),u=Yx(c,u+1,e.subarray(T,de))}a.i=o}return Bx(s,0,r+zx(u)+i)},eS=(function(){for(var e=new Int32Array(256),t=0;t<256;++t){for(var n=t,r=9;--r;)n=(n&1&&-306674912)^n>>>1;e[t]=n}return e})(),tS=function(){var e=-1;return{p:function(t){for(var n=e,r=0;r<t.length;++r)n=eS[n&255^t[r]]^n>>>8;e=n},d:function(){return~e}}},nS=function(e,t,n,r,i){if(!i&&(i={l:1},t.dictionary)){var a=t.dictionary.subarray(-32768),o=new yx(a.length+e.length);o.set(a),o.set(e,a.length),e=o,i.w=a.length}return $x(e,t.level==null?6:t.level,t.mem==null?i.l?Math.ceil(Math.max(8,Math.min(13,Math.log(e.length)))*1.5):20:12+t.mem,n,r,i)},rS=function(e,t){var n={};for(var r in e)n[r]=e[r];for(var r in t)n[r]=t[r];return n},iS=function(e,t,n){for(;n;++t)e[t]=n,n>>>=8};function aS(e,t){return nS(e,t||{},0,0)}var oS=function(e,t,n,r){for(var i in e){var a=e[i],o=t+i,s=r;Array.isArray(a)&&(s=rS(r,a[1]),a=a[0]),a instanceof yx?n[o]=[a,s]:(n[o+=`/`]=[new yx(0),s],oS(a,o,n,r))}},sS=typeof TextEncoder<`u`&&new TextEncoder,cS=typeof TextDecoder<`u`&&new TextDecoder;try{cS.decode(Qx,{stream:!0})}catch{}function lS(e,t){if(t){for(var n=new yx(e.length),r=0;r<e.length;++r)n[r]=e.charCodeAt(r);return n}if(sS)return sS.encode(e);for(var i=e.length,a=new yx(e.length+(e.length>>1)),o=0,s=function(e){a[o++]=e},r=0;r<i;++r){if(o+5>a.length){var c=new yx(o+8+(i-r<<1));c.set(a),a=c}var l=e.charCodeAt(r);l<128||t?s(l):l<2048?(s(192|l>>6),s(128|l&63)):l>55295&&l<57344?(l=65536+(l&1047552)|e.charCodeAt(++r)&1023,s(240|l>>18),s(128|l>>12&63),s(128|l>>6&63),s(128|l&63)):(s(224|l>>12),s(128|l>>6&63),s(128|l&63))}return Bx(a,0,o)}var uS=function(e){var t=0;if(e)for(var n in e){var r=e[n].length;r>65535&&Hx(9),t+=r+4}return t},dS=function(e,t,n,r,i,a,o,s){var c=r.length,l=n.extra,u=s&&s.length,d=uS(l);iS(e,t,o==null?67324752:33639248),t+=4,o!=null&&(e[t++]=20,e[t++]=n.os),e[t]=20,t+=2,e[t++]=n.flag<<1|(a<0&&8),e[t++]=i&&8,e[t++]=n.compression&255,e[t++]=n.compression>>8;var f=new Date(n.mtime==null?Date.now():n.mtime),p=f.getFullYear()-1980;if((p<0||p>119)&&Hx(10),iS(e,t,p<<25|f.getMonth()+1<<21|f.getDate()<<16|f.getHours()<<11|f.getMinutes()<<5|f.getSeconds()>>1),t+=4,a!=-1&&(iS(e,t,n.crc),iS(e,t+4,a<0?-a-2:a),iS(e,t+8,n.size)),iS(e,t+12,c),iS(e,t+14,d),t+=16,o!=null&&(iS(e,t,u),iS(e,t+6,n.attrs),iS(e,t+10,o),t+=14),e.set(r,t),t+=c,d)for(var m in l){var h=l[m],g=h.length;iS(e,t,+m),iS(e,t+2,g),e.set(h,t+4),t+=4+g}return u&&(e.set(s,t),t+=u),t},fS=function(e,t,n,r,i){iS(e,t,101010256),iS(e,t+8,n),iS(e,t+10,n),iS(e,t+12,r),iS(e,t+16,i)};function pS(e,t){t||={};var n={},r=[];oS(e,``,n,t);var i=0,a=0;for(var o in n){var s=n[o],c=s[0],l=s[1],u=l.level==0?0:8,d=lS(o),f=d.length,p=l.comment,m=p&&lS(p),h=m&&m.length,g=uS(l.extra);f>65535&&Hx(11);var _=u?aS(c,l):c,v=_.length,y=tS();y.p(c),r.push(rS(l,{size:c.length,crc:y.d(),c:_,f:d,m,u:f!=o.length||m&&p.length!=h,o:i,compression:u})),i+=30+f+g+v,a+=76+2*(f+g)+(h||0)+v}for(var b=new yx(a+22),x=i,S=a-i,C=0;C<r.length;++C){var d=r[C];dS(b,d.o,d,d.f,d.u,d.c.length);var w=30+d.f.length+uS(d.extra);b.set(d.c,d.o+w),dS(b,i,d,d.f,d.u,d.c.length,d.o,d.m),i+=16+w+(d.m?d.m.length:0)}return fS(b,i,r.length,S,x),b}var mS=class{async parse(e,t={}){t=Object.assign({ar:{anchoring:{type:`plane`},planeAnchoring:{alignment:`horizontal`}},quickLookCompatible:!1,maxTextureSize:1024},t);let n={},r=`model.usda`;n[r]=null;let i=_S();i+=vS(t);let a={},o={};e.traverseVisible(e=>{if(e.isMesh){let t=e.geometry,r=e.material;if(r.isMeshStandardMaterial){let o=`geometries/Geometry_`+t.id+`.usda`;if(!(o in n)){let e=wS(t);n[o]=bS(e)}r.uuid in a||(a[r.uuid]=r),i+=xS(e,t,r)}else console.warn(`THREE.USDZExporter: Unsupported material type (USDZ only supports MeshStandardMaterial)`,e)}else e.isCamera&&(i+=IS(e))}),i+=yS(),i+=jS(a,o,t.quickLookCompatible),n[r]=lS(i),i=null;for(let e in o){let r=o[e];r.isCompressedTexture===!0&&(r=_p(r));let i=hS(r.image,r.flipY,t.maxTextureSize),a=await new Promise(e=>i.toBlob(e,`image/png`,1));n[`textures/Texture_${e}.png`]=new Uint8Array(await a.arrayBuffer())}let s=0;for(let e in n){let t=n[e],r=34+e.length;s+=r;let i=s&63;if(i!==4){let r=64-i;n[e]=[t,{extra:{12345:new Uint8Array(r)}}]}s=t.length}return pS(n,{level:0})}};function hS(e,t,n){if(typeof HTMLImageElement<`u`&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<`u`&&e instanceof HTMLCanvasElement||typeof OffscreenCanvas<`u`&&e instanceof OffscreenCanvas||typeof ImageBitmap<`u`&&e instanceof ImageBitmap){let r=n/Math.max(e.width,e.height),i=document.createElement(`canvas`);i.width=e.width*Math.min(1,r),i.height=e.height*Math.min(1,r);let a=i.getContext(`2d`);return t===!0&&(a.translate(0,i.height),a.scale(1,-1)),a.drawImage(e,0,0,i.width,i.height),i}throw Error(`THREE.USDZExporter: No valid image data found. Unable to process texture.`)}var gS=7;function _S(){return`#usda 1.0
(
	customLayerData = {
		string creator = "Three.js USDZExporter"
	}
	defaultPrim = "Root"
	metersPerUnit = 1
	upAxis = "Y"
)

`}function vS(e){return`def Xform "Root"
{
	def Scope "Scenes" (
		kind = "sceneLibrary"
	)
	{
		def Xform "Scene" (
			customData = {
				bool preliminary_collidesWithEnvironment = 0
				string sceneName = "Scene"
			}
			sceneName = "Scene"
		)
		{
		token preliminary:anchoring:type = "${e.ar.anchoring.type}"
		token preliminary:planeAnchoring:alignment = "${e.ar.planeAnchoring.alignment}"

`}function yS(){return`
		}
	}
}

`}function bS(e){let t=_S();return t+=e,lS(t)}function xS(e,t,n){let r=`Object_`+e.id,i=SS(e.matrixWorld);return e.matrixWorld.determinant()<0&&console.warn(`THREE.USDZExporter: USDZ does not support negative scales`,e),`def Xform "${r}" (
	prepend references = @./geometries/Geometry_${t.id}.usda@</Geometry>
	prepend apiSchemas = ["MaterialBindingAPI"]
)
{
	matrix4d xformOp:transform = ${i}
	uniform token[] xformOpOrder = ["xformOp:transform"]

	rel material:binding = </Materials/Material_${n.id}>
}

`}function SS(e){let t=e.elements;return`( ${CS(t,0)}, ${CS(t,4)}, ${CS(t,8)}, ${CS(t,12)} )`}function CS(e,t){return`(${e[t+0]}, ${e[t+1]}, ${e[t+2]}, ${e[t+3]})`}function wS(e){return`
def "Geometry"
{
${TS(e)}
}
`}function TS(e){let t=e.attributes,n=t.position.count;return`
	def Mesh "Geometry"
	{
		int[] faceVertexCounts = [${ES(e)}]
		int[] faceVertexIndices = [${DS(e)}]
		normal3f[] normals = [${OS(t.normal,n)}] (
			interpolation = "vertex"
		)
		point3f[] points = [${OS(t.position,n)}]
${AS(t)}
		uniform token subdivisionScheme = "none"
	}
`}function ES(e){let t=e.index===null?e.attributes.position.count:e.index.count;return Array(t/3).fill(3).join(`, `)}function DS(e){let t=e.index,n=[];if(t!==null)for(let e=0;e<t.count;e++)n.push(t.getX(e));else{let t=e.attributes.position.count;for(let e=0;e<t;e++)n.push(e)}return n.join(`, `)}function OS(e,t){if(e===void 0)return console.warn(`USDZExporter: Normals missing.`),Array(t).fill(`(0, 0, 0)`).join(`, `);let n=[];for(let t=0;t<e.count;t++){let r=e.getX(t),i=e.getY(t),a=e.getZ(t);n.push(`(${r.toPrecision(gS)}, ${i.toPrecision(gS)}, ${a.toPrecision(gS)})`)}return n.join(`, `)}function kS(e){let t=[];for(let n=0;n<e.count;n++){let r=e.getX(n),i=e.getY(n);t.push(`(${r.toPrecision(gS)}, ${1-i.toPrecision(gS)})`)}return t.join(`, `)}function AS(e){let t=``;for(let n=0;n<4;n++){let r=n>0?n:``,i=e[`uv`+r];i!==void 0&&(t+=`
		texCoord2f[] primvars:st${r} = [${kS(i)}] (
			interpolation = "vertex"
		)`)}let n=e.color;if(n!==void 0){let e=n.count;t+=`
	color3f[] primvars:displayColor = [${OS(n,e)}] (
		interpolation = "vertex"
		)`}return t}function jS(e,t,n=!1){let r=[];for(let i in e){let a=e[i];r.push(MS(a,t,n))}return`def "Materials"
{
${r.join(``)}
}

`}function MS(e,t,n=!1){let r=[],i=[];function a(r,i,a){let o=r.source.id+`_`+r.flipY;t[o]=r;let s=r.channel>0?`st`+r.channel:`st`,c={1e3:`repeat`,1001:`clamp`,1002:`mirror`},l=r.repeat.clone(),u=r.offset.clone(),d=r.rotation,f=Math.sin(d),p=Math.cos(d);return u.y=1-u.y-l.y,n?(u.x/=l.x,u.y/=l.y,u.x+=f/l.x,u.y+=p-1):(u.x+=f*l.x,u.y+=(1-p)*l.y),`
		def Shader "PrimvarReader_${i}"
		{
			uniform token info:id = "UsdPrimvarReader_float2"
			float2 inputs:fallback = (0.0, 0.0)
			token inputs:varname = "${s}"
			float2 outputs:result
		}

		def Shader "Transform2d_${i}"
		{
			uniform token info:id = "UsdTransform2d"
			token inputs:in.connect = </Materials/Material_${e.id}/PrimvarReader_${i}.outputs:result>
			float inputs:rotation = ${(180/Math.PI*d).toFixed(gS)}
			float2 inputs:scale = ${FS(l)}
			float2 inputs:translation = ${FS(u)}
			float2 outputs:result
		}

		def Shader "Texture_${r.id}_${i}"
		{
			uniform token info:id = "UsdUVTexture"
			asset inputs:file = @textures/Texture_${o}.png@
			float2 inputs:st.connect = </Materials/Material_${e.id}/Transform2d_${i}.outputs:result>
			${a===void 0?``:`float4 inputs:scale = `+PS(a)}
			token inputs:sourceColorSpace = "${r.colorSpace===``?`raw`:`sRGB`}"
			token inputs:wrapS = "${c[r.wrapS]}"
			token inputs:wrapT = "${c[r.wrapT]}"
			float outputs:r
			float outputs:g
			float outputs:b
			float3 outputs:rgb
			${e.transparent||e.alphaTest>0?`float outputs:a`:``}
		}`}return e.side===2&&console.warn(`THREE.USDZExporter: USDZ does not support double sided materials`,e),e.map===null?r.push(`			color3f inputs:diffuseColor = ${NS(e.color)}`):(r.push(`			color3f inputs:diffuseColor.connect = </Materials/Material_${e.id}/Texture_${e.map.id}_diffuse.outputs:rgb>`),e.transparent?r.push(`			float inputs:opacity.connect = </Materials/Material_${e.id}/Texture_${e.map.id}_diffuse.outputs:a>`):e.alphaTest>0&&(r.push(`			float inputs:opacity.connect = </Materials/Material_${e.id}/Texture_${e.map.id}_diffuse.outputs:a>`),r.push(`			float inputs:opacityThreshold = ${e.alphaTest}`)),i.push(a(e.map,`diffuse`,e.color))),e.emissiveMap===null?e.emissive.getHex()>0&&r.push(`			color3f inputs:emissiveColor = ${NS(e.emissive)}`):(r.push(`			color3f inputs:emissiveColor.connect = </Materials/Material_${e.id}/Texture_${e.emissiveMap.id}_emissive.outputs:rgb>`),i.push(a(e.emissiveMap,`emissive`))),e.normalMap!==null&&(r.push(`			normal3f inputs:normal.connect = </Materials/Material_${e.id}/Texture_${e.normalMap.id}_normal.outputs:rgb>`),i.push(a(e.normalMap,`normal`))),e.aoMap!==null&&(r.push(`			float inputs:occlusion.connect = </Materials/Material_${e.id}/Texture_${e.aoMap.id}_occlusion.outputs:r>`),i.push(a(e.aoMap,`occlusion`))),e.roughnessMap!==null&&e.roughness===1?(r.push(`			float inputs:roughness.connect = </Materials/Material_${e.id}/Texture_${e.roughnessMap.id}_roughness.outputs:g>`),i.push(a(e.roughnessMap,`roughness`))):r.push(`			float inputs:roughness = ${e.roughness}`),e.metalnessMap!==null&&e.metalness===1?(r.push(`			float inputs:metallic.connect = </Materials/Material_${e.id}/Texture_${e.metalnessMap.id}_metallic.outputs:b>`),i.push(a(e.metalnessMap,`metallic`))):r.push(`			float inputs:metallic = ${e.metalness}`),e.alphaMap===null?r.push(`			float inputs:opacity = ${e.opacity}`):(r.push(`			float inputs:opacity.connect = </Materials/Material_${e.id}/Texture_${e.alphaMap.id}_opacity.outputs:r>`),r.push(`			float inputs:opacityThreshold = 0.0001`),i.push(a(e.alphaMap,`opacity`))),e.isMeshPhysicalMaterial&&(r.push(`			float inputs:clearcoat = ${e.clearcoat}`),r.push(`			float inputs:clearcoatRoughness = ${e.clearcoatRoughness}`),r.push(`			float inputs:ior = ${e.ior}`)),`
	def Material "Material_${e.id}"
	{
		def Shader "PreviewSurface"
		{
			uniform token info:id = "UsdPreviewSurface"
${r.join(`
`)}
			int inputs:useSpecularWorkflow = 0
			token outputs:surface
		}

		token outputs:surface.connect = </Materials/Material_${e.id}/PreviewSurface.outputs:surface>

${i.join(`
`)}

	}
`}function NS(e){return`(${e.r}, ${e.g}, ${e.b})`}function PS(e){return`(${e.r}, ${e.g}, ${e.b}, 1.0)`}function FS(e){return`(${e.x}, ${e.y})`}function IS(e){let t=e.name?e.name:`Camera_`+e.id,n=SS(e.matrixWorld);return e.matrixWorld.determinant()<0&&console.warn(`THREE.USDZExporter: USDZ does not support negative scales`,e),e.isOrthographicCamera?`def Camera "${t}"
		{
			matrix4d xformOp:transform = ${n}
			uniform token[] xformOpOrder = ["xformOp:transform"]

			float2 clippingRange = (${e.near.toPrecision(gS)}, ${e.far.toPrecision(gS)})
			float horizontalAperture = ${((Math.abs(e.left)+Math.abs(e.right))*10).toPrecision(gS)}
			float verticalAperture = ${((Math.abs(e.top)+Math.abs(e.bottom))*10).toPrecision(gS)}
			token projection = "orthographic"
		}
	
	`:`def Camera "${t}"
		{
			matrix4d xformOp:transform = ${n}
			uniform token[] xformOpOrder = ["xformOp:transform"]

			float2 clippingRange = (${e.near.toPrecision(gS)}, ${e.far.toPrecision(gS)})
			float focalLength = ${e.getFocalLength().toPrecision(gS)}
			float focusDistance = ${e.focus.toPrecision(gS)}
			float horizontalAperture = ${e.getFilmWidth().toPrecision(gS)}
			token projection = "perspective"
			float verticalAperture = ${e.getFilmHeight().toPrecision(gS)}
		}
	
	`}var LS=e=>t=>{try{let n=mm(t),r=(n.length?n[0].terms:[]).filter(e=>e&&e.type===`ident`).map(e=>e.value).filter(t=>e.indexOf(t)>-1);return new Set(r)}catch{}return new Set},RS=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},zS=!1,BS=!1,VS=`#model-viewer-no-ar-fallback`,HS=LS([`quick-look`,`scene-viewer`,`webxr`,`none`]),US=`webxr scene-viewer quick-look`,WS={QUICK_LOOK:`quick-look`,SCENE_VIEWER:`scene-viewer`,WEBXR:`webxr`,NONE:`none`},GS=Symbol(`arButtonContainer`),KS=Symbol(`enterARWithWebXR`),qS=Symbol(`openSceneViewer`),JS=Symbol(`openIOSARQuickLook`),YS=Symbol(`canActivateAR`),XS=Symbol(`arMode`),ZS=Symbol(`arModes`),QS=Symbol(`arAnchor`),$S=Symbol(`preload`),eC=Symbol(`onARButtonContainerClick`),tC=Symbol(`onARStatus`),nC=Symbol(`onARTracking`),rC=Symbol(`onARTap`),iC=Symbol(`selectARMode`),aC=Symbol(`triggerLoad`),oC=e=>{var t,n,i,a,o,s,c,l,u,d;class f extends e{constructor(){super(...arguments),this.ar=!1,this.arScale=`auto`,this.arPlacement=`floor`,this.arModes=US,this.iosSrc=null,this.xrEnvironment=!1,this[t]=!1,this[n]=this.shadowRoot.querySelector(`.ar-button`),this[i]=document.createElement(`a`),this[a]=new Set,this[o]=WS.NONE,this[s]=!1,this[c]=e=>{e.preventDefault(),this.activateAR()},this[l]=({status:e})=>{(e===Pg.NOT_PRESENTING||this[Qb].arRenderer.presentedScene===this[$])&&(this.setAttribute(`ar-status`,e),this.dispatchEvent(new CustomEvent(`ar-status`,{detail:{status:e}})),e===Pg.NOT_PRESENTING?this.removeAttribute(`ar-tracking`):e===Pg.SESSION_STARTED&&this.setAttribute(`ar-tracking`,Fg.TRACKING))},this[u]=({status:e})=>{this.setAttribute(`ar-tracking`,e),this.dispatchEvent(new CustomEvent(`ar-tracking`,{detail:{status:e}}))},this[d]=e=>{e.data==`_apple_ar_quicklook_button_tapped`&&this.dispatchEvent(new CustomEvent(`quick-look-button-tapped`))}}get canActivateAR(){return this[XS]!==WS.NONE}connectedCallback(){super.connectedCallback(),this[Qb].arRenderer.addEventListener(`status`,this[tC]),this.setAttribute(`ar-status`,Pg.NOT_PRESENTING),this[Qb].arRenderer.addEventListener(`tracking`,this[nC]),this[QS].addEventListener(`message`,this[rC])}disconnectedCallback(){super.disconnectedCallback(),this[Qb].arRenderer.removeEventListener(`status`,this[tC]),this[Qb].arRenderer.removeEventListener(`tracking`,this[nC]),this[QS].removeEventListener(`message`,this[rC])}update(e){super.update(e),e.has(`arScale`)&&(this[$].canScale=this.arScale!==`fixed`),e.has(`arPlacement`)&&(this[$].updateShadow(),this[Jb]()),e.has(`arModes`)&&(this[ZS]=HS(this.arModes)),(e.has(`ar`)||e.has(`arModes`)||e.has(`src`)||e.has(`iosSrc`))&&this[iC]()}async activateAR(){switch(this[XS]){case WS.QUICK_LOOK:await this[JS]();break;case WS.WEBXR:await this[KS]();break;case WS.SCENE_VIEWER:this[qS]();break;default:console.warn(`No AR Mode can be activated. This is probably due to missing configuration or device capabilities`)}}async[(t=YS,n=GS,i=QS,a=ZS,o=XS,s=$S,c=eC,l=tC,u=nC,d=rC,iC)](){let e=WS.NONE;if(this.ar){if(this.src!=null)for(let t of this[ZS]){if(t===`webxr`&&ju&&!zS&&await this[Qb].arRenderer.supportsPresentation()){e=WS.WEBXR;break}if(t===`scene-viewer`&&!BS&&(Iu||navigator.userAgentData&&navigator.userAgentData.getHighEntropyValues&&(await navigator.userAgentData.getHighEntropyValues([`formFactor`])).formFactor?.includes(`XR`))){e=WS.SCENE_VIEWER;break}if(t===`quick-look`&&Ru){e=WS.QUICK_LOOK;break}}e===WS.NONE&&this.iosSrc!=null&&Ru&&(e=WS.QUICK_LOOK)}if(e!==WS.NONE)this[GS].classList.add(`enabled`),this[GS].addEventListener(`click`,this[eC]);else if(this[GS].classList.contains(`enabled`)){this[GS].removeEventListener(`click`,this[eC]),this[GS].classList.remove(`enabled`);let e=Pg.FAILED;this.setAttribute(`ar-status`,e),this.dispatchEvent(new CustomEvent(`ar-status`,{detail:{status:e}}))}this[XS]=e}async[KS](){console.log(`Attempting to present in AR with WebXR...`),await this[aC]();try{this[GS].removeEventListener(`click`,this[eC]);let{arRenderer:e}=this[Qb];e.placeOnWall=this.arPlacement===`wall`,await e.present(this[$],this.xrEnvironment)}catch(e){console.warn(`Error while trying to present in AR with WebXR`),console.error(e),await this[Qb].arRenderer.stopPresenting(),zS=!0,console.warn(`Falling back to next ar-mode`),await this[iC](),this.activateAR()}finally{this[iC]()}}async[aC](){this.loaded||(this[$S]=!0,this[Ub](),await Ju(this,`load`),this[$S]=!1)}[nx](){return super[nx]()||this[$S]}[qS](){let e=self.location.toString(),t=new URL(e),n=new URL(this.src,e);n.hash&&=``;let r=new URLSearchParams(n.search);if(t.hash=VS,r.set(`mode`,`ar_preferred`),r.has(`disable_occlusion`)||r.set(`disable_occlusion`,`true`),this.arScale===`fixed`&&r.set(`resizable`,`false`),this.arPlacement===`wall`&&r.set(`enable_vertical_placement`,`true`),r.has(`sound`)){let t=new URL(r.get(`sound`),e);r.set(`sound`,t.toString())}if(r.has(`link`)){let t=new URL(r.get(`link`),e);r.set(`link`,t.toString())}let i=`intent://arvr.google.com/scene-viewer/1.2?${r.toString()+`&file=`+encodeURIComponent(n.toString())}#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(t.toString())};end;`;self.addEventListener(`hashchange`,()=>{self.location.hash===VS&&(BS=!0,self.history.back(),console.warn(`Error while trying to present in AR with Scene Viewer`),console.warn(`Falling back to next ar-mode`),this[iC]())},{once:!0}),this[QS].setAttribute(`href`,i),console.log(`Attempting to present in AR with Scene Viewer...`),this[QS].click()}async[JS](){let e=!this.iosSrc;this[GS].classList.remove(`enabled`);let t=e?await this.prepareUSDZ():this.iosSrc,n=new URL(t,self.location.toString());if(e){let e=self.location.toString(),t=new URL(e),r=new URL(this.src,t);r.hash&&(n.hash=r.hash)}this.arScale===`fixed`&&(n.hash&&(n.hash+=`&`),n.hash+=`allowsContentScaling=0`);let r=this[QS];r.setAttribute(`rel`,`ar`);let i=document.createElement(`img`);r.appendChild(i),r.setAttribute(`href`,n.toString()),e&&r.setAttribute(`download`,`model.usdz`),r.style.display=`none`,r.isConnected||this.shadowRoot.appendChild(r),console.log(`Attempting to present in AR with Quick Look...`),r.click(),r.removeChild(i),e&&URL.revokeObjectURL(t),this[GS].classList.add(`enabled`)}async prepareUSDZ(){let e=this[$b].beginActivity(`usdz-conversion`);await this[aC]();let{model:t,shadow:n,target:r}=this[$];if(t==null)return``;let i=!1;n!=null&&(i=n.visible,n.visible=!1),e(.2);let a=new mS;r.remove(t),t.position.copy(r.position),t.updateWorldMatrix(!1,!0);let o=await a.parse(t);t.position.set(0,0,0),r.add(t);let s=new Blob([o],{type:`model/vnd.usdz+zip`}),c=URL.createObjectURL(s);return e(1),n!=null&&(n.visible=i),c}}return RS([r({type:Boolean,attribute:`ar`})],f.prototype,`ar`,void 0),RS([r({type:String,attribute:`ar-scale`})],f.prototype,`arScale`,void 0),RS([r({type:String,attribute:`ar-placement`})],f.prototype,`arPlacement`,void 0),RS([r({type:String,attribute:`ar-modes`})],f.prototype,`arModes`,void 0),RS([r({type:String,attribute:`ios-src`})],f.prototype,`iosSrc`,void 0),RS([r({type:Boolean,attribute:`xr-environment`})],f.prototype,`xrEnvironment`,void 0),f},sC=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},cC=`https://www.gstatic.com/draco/versioned/decoders/1.5.6/`,lC=`https://www.gstatic.com/basis-universal/versioned/2021-04-15-ba1c3e4/`,uC=`https://cdn.jsdelivr.net/npm/three@0.149.0/examples/jsm/loaders/LottieLoader.js`,dC={AUTO:`auto`,MANUAL:`manual`},fC={AUTO:`auto`,LAZY:`lazy`,EAGER:`eager`},pC=Symbol(`defaultProgressBarElement`),mC=Symbol(`posterContainerElement`),hC=Symbol(`defaultPosterElement`),gC=Symbol(`shouldDismissPoster`),_C=Symbol(`hidePoster`),vC=Symbol(`modelIsRevealed`),yC=Symbol(`updateProgressBar`),bC=Symbol(`ariaLabelCallToAction`),xC=Symbol(`onProgress`),SC=e=>{var t,n,i,a,o,s,c,l;class u extends e{constructor(...e){super(...e),this.poster=null,this.reveal=dC.AUTO,this.loading=fC.AUTO,this[t]=!1,this[n]=!1,this[i]=this.shadowRoot.querySelector(`.slot.poster`),this[a]=this.shadowRoot.querySelector(`#default-poster`),this[o]=this.shadowRoot.querySelector(`#default-progress-bar > .bar`),this[s]=this[hC].getAttribute(`aria-label`),this[c]=Hu(e=>{let t=this[pC].parentNode;requestAnimationFrame(()=>{this[pC].style.transform=`scaleX(${e})`,e===0&&(t.removeChild(this[pC]),t.appendChild(this[pC])),this[pC].classList.toggle(`hide`,e===1)})},100),this[l]=e=>{let t=e.detail.totalProgress,n=e.detail.reason;t===1&&(this[yC].flush(),this.loaded&&(this[gC]||this.reveal===dC.AUTO)&&this[_C]()),this[yC](t),this.dispatchEvent(new CustomEvent(`progress`,{detail:{totalProgress:t,reason:n}}))};let r=self.ModelViewerElement||{},u=r.dracoDecoderLocation||cC;ip.setDRACODecoderLocation(u);let d=r.ktx2TranscoderLocation||lC;ip.setKTX2TranscoderLocation(d),r.meshoptDecoderLocation&&ip.setMeshoptDecoderLocation(r.meshoptDecoderLocation);let f=r.lottieLoaderLocation||uC;q_.singleton.textureUtils.lottieLoaderUrl=f}static set dracoDecoderLocation(e){ip.setDRACODecoderLocation(e)}static get dracoDecoderLocation(){return ip.getDRACODecoderLocation()}static set ktx2TranscoderLocation(e){ip.setKTX2TranscoderLocation(e)}static get ktx2TranscoderLocation(){return ip.getKTX2TranscoderLocation()}static set meshoptDecoderLocation(e){ip.setMeshoptDecoderLocation(e)}static get meshoptDecoderLocation(){return ip.getMeshoptDecoderLocation()}static set lottieLoaderLocation(e){q_.singleton.textureUtils.lottieLoaderUrl=e}static get lottieLoaderLocation(){return q_.singleton.textureUtils.lottieLoaderUrl}static mapURLs(e){q_.singleton.loader[tp].manager.setURLModifier(e)}dismissPoster(){this.loaded?this[_C]():(this[gC]=!0,this[Ub]())}showPoster(){let e=this[mC];if(e.classList.contains(`show`))return;e.classList.add(`show`),this[Kb].classList.remove(`show`);let t=this[hC];t.removeAttribute(`tabindex`),t.removeAttribute(`aria-hidden`);let n=this.modelIsVisible;this[vC]=!1,this[Lb](n)}getDimensions(){return rx(this[$].size)}getBoundingBoxCenter(){return rx(this[$].boundingBox.getCenter(new U))}connectedCallback(){super.connectedCallback(),this.loaded||this.showPoster(),this[$b].addEventListener(`progress`,this[xC])}disconnectedCallback(){super.disconnectedCallback(),this[$b].removeEventListener(`progress`,this[xC])}async updated(e){super.updated(e),e.has(`poster`)&&this.poster!=null&&(this[hC].style.backgroundImage=`url(${this.poster})`),e.has(`alt`)&&this[hC].setAttribute(`aria-label`,this[zb]),(e.has(`reveal`)||e.has(`loading`))&&this[Ub]()}[(t=vC,n=gC,i=mC,a=hC,o=pC,s=bC,c=yC,l=xC,nx)](){return!!this.src&&(this[gC]||this.loading===fC.EAGER||this.reveal===dC.AUTO&&this[Ib])}[_C](){this[gC]=!1;let e=this[mC];if(!e.classList.contains(`show`))return;e.classList.remove(`show`),this[Kb].classList.add(`show`);let t=this.modelIsVisible;this[vC]=!0,this[Lb](t);let n=this.getRootNode();n&&n.activeElement===this&&this[Kb].focus();let r=this[hC];r.setAttribute(`aria-hidden`,`true`),r.tabIndex=-1,this.dispatchEvent(new CustomEvent(`poster-dismissed`))}[tx](){return super[tx]()&&this[vC]}}return sC([r({type:String})],u.prototype,`poster`,void 0),sC([r({type:String})],u.prototype,`reveal`,void 0),sC([r({type:String})],u.prototype,`loading`,void 0),u},CC=function(e,t,n,r){var i=arguments.length,a=i<3?t:r===null?r=Object.getOwnPropertyDescriptor(t,n):r,o;if(typeof Reflect==`object`&&typeof Reflect.decorate==`function`)a=Reflect.decorate(e,t,n,r);else for(var s=e.length-1;s>=0;s--)(o=e[s])&&(a=(i<3?o(a):i>3?o(t,n,a):o(t,n))||a);return i>3&&a&&Object.defineProperty(t,n,a),a},wC=Math.PI/32,TC=3e3,EC={basis:[Cm(pm(wC,`rad`))],keywords:{auto:[null]}},DC=Symbol(`autoRotateStartTime`),OC=Symbol(`radiansPerSecond`),kC=Symbol(`syncRotationRate`),AC=Symbol(`onCameraChange`),jC=vx(Ny((e=>{var t,n,i;class a extends e{constructor(){super(...arguments),this.autoRotate=!1,this.autoRotateDelay=TC,this.rotationPerSecond=`auto`,this[t]=performance.now(),this[n]=0,this[i]=e=>{this.autoRotate&&e.detail.source===`user-interaction`&&(this[DC]=performance.now())}}connectedCallback(){super.connectedCallback(),this.addEventListener(`camera-change`,this[AC]),this[DC]=performance.now()}disconnectedCallback(){super.disconnectedCallback(),this.removeEventListener(`camera-change`,this[AC]),this[DC]=performance.now()}updated(e){super.updated(e),e.has(`autoRotate`)&&(this[DC]=performance.now())}[(t=DC,n=OC,kC)](e){this[OC]=e[0]}[Yb](e,t){if(super[Yb](e,t),!this.autoRotate||!this[tx]()||this[Qb].isPresenting)return;let n=Math.min(t,e-this[DC]-this.autoRotateDelay);n>0&&(this[$].yaw=this.turntableRotation+this[OC]*n*.001)}get turntableRotation(){return this[$].yaw}resetTurntableRotation(e=0){this[$].yaw=e}}return i=AC,CC([r({type:Boolean,attribute:`auto-rotate`})],a.prototype,`autoRotate`,void 0),CC([r({type:Number,attribute:`auto-rotate-delay`})],a.prototype,`autoRotateDelay`,void 0),CC([lh({intrinsics:EC,updateHandler:kC}),r({type:String,attribute:`rotation-per-second`})],a.prototype,`rotationPerSecond`,void 0),a})(id(mg(oC(SC(dx(ax))))))));customElements.define(`model-viewer`,jC);