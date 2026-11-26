/* うごくうちのコ：動かすしくみ（ページ・ハブ・OBS・デスクトップで共通）
   Uchinoko.create(canvas, {parts, params, bg, fit, follow}) → 動くキャラ
   パーツの役割：head 頭／face 顔のパーツ（頭と一緒に動き、向きでずれる）／eyeO 目（開）／eyeC 目（閉）／neck 首／body 体
     ／leg 脚（先が地面にとまる）／swing ゆれもの（ばねで揺れる）／fixed 体といっしょ／hide 表示しない
   parts：[{src or img, x, y, role, name}]（全体の座標で左上） */
(function(){
const M={mul:(m,n)=>[m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]],
  T:(x,y)=>[1,0,0,1,x,y],R:a=>[Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0],S:(x,y)=>[x,0,0,y,0,0],ap:(m,p)=>[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]],
  inv:m=>{const d=m[0]*m[3]-m[1]*m[2];return [m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d];}};
const about=(p,m)=>M.mul(M.T(p[0],p[1]),M.mul(m,M.T(-p[0],-p[1])));
const deg=Math.PI/180;
const loadImg=src=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src;});
function alphaOf(img){const sc=Math.min(1,160/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*sc)),h=Math.max(1,Math.round(img.height*sc));
  const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.drawImage(img,0,0,w,h);const d=g.getImageData(0,0,w,h).data,a=new Uint8Array(w*h);for(let i=0;i<w*h;i++)a[i]=d[i*4+3]>60?1:0;return {w,h,a};}
const eachPx=(p,f)=>{const A=p.alpha;for(let y=0;y<A.h;y++)for(let x=0;x<A.w;x++)if(A.a[y*A.w+x])f(p.x+(x+.5)*p.w/A.w,p.y+(y+.5)*p.h/A.h);};
function nearest(p,px,py){let b=null,bd=1e18;eachPx(p,(X,Y)=>{const d=(X-px)**2+(Y-py)**2;if(d<bd){bd=d;b=[X,Y];}});return b||[p.x+p.w/2,p.y+p.h/2];}
function farthest(p,px,py){let b=null,bd=-1;eachPx(p,(X,Y)=>{const d=(X-px)**2+(Y-py)**2;if(d>bd){bd=d;b=[X,Y];}});return b||[p.x+p.w/2,p.y+p.h/2];}
function comOf(p){let sx=0,sy=0,n=0;eachPx(p,(X,Y)=>{sx+=X;sy+=Y;n++;});return n?[sx/n,sy/n]:[p.x+p.w/2,p.y+p.h/2];}
const boxOf=ps=>{let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;ps.forEach(p=>{x0=Math.min(x0,p.x);y0=Math.min(y0,p.y);x1=Math.max(x1,p.x+p.w);y1=Math.max(y1,p.y+p.h);});return {x0,y0,x1,y1,cx:(x0+x1)/2,cy:(y0+y1)/2};};
const DEF={breath:50,sway:40,look:60,neck:40,blink:50,spring:55};

function create(cv,opt){opt=opt||{};const g=cv.getContext('2d');
  const U={P:Object.assign({},DEF,opt.params||{}),bg:opt.bg||'trans',fit:opt.fit||.78,follow:opt.follow!==false,parts:[],rig:null,view:null,paused:false,quiet:!!opt.quiet};
  const ST={petEnd:-9,petDir:0,petSum:0,t:0,look:[0,0],lookT:[0,0],lookAt:0,ptr:null,ptrAt:-9,blinkAt:1.5,blinkEnd:0,dbl:false,by:0,bv:0,tilt:0,tiltT:0,tiltEnd:0,shake:0,stretch:0};
  U.ST=ST;
  // 骨組み：付け根の位置を決める
  U.rig=function(){const ps=U.parts.filter(p=>p.role!=='hide');if(!ps.length){U.R=null;return;}
    const by=r=>ps.filter(p=>p.role===r),all=boxOf(ps),body=by('body'),head=by('head'),neck=by('neck');
    const bc=body.length?(b=>[b.cx,b.cy])(boxOf(body)):[all.cx,all.y0+(all.y1-all.y0)*.7];
    const hb=head.length?boxOf(head):null,hc=hb?[hb.cx,hb.cy]:[all.cx,all.y0+(all.y1-all.y0)*.3];
    let nb=null,nt=null;if(neck.length){nb=nearest(neck[0],bc[0],bc[1]);nt=farthest(neck[0],nb[0],nb[1]);}
    const hp=nt||(hb?[hb.cx,hb.y1]:hc);
    ps.forEach(p=>{p.pv=null;if(p.role==='leg'){p.piv=nearest(p,bc[0],bc[1]);p.foot=farthest(p,p.piv[0],p.piv[1]);}
      if(p.role==='swing'){p.piv=nearest(p,bc[0],bc[1]);const c=comOf(p);p.com=[c[0]-p.piv[0],c[1]-p.piv[1]];p.th=0;p.om=0;}});
    U.R={bc,hc,nb,nt,hp,hw:hb?hb.x1-hb.x0:200,hh:hb?hb.y1-hb.y0:200,bb:all};};
  U.setParts=async function(list){const out=[];for(const q of list){const img=q.img||await loadImg(q.src);const p={img,src:q.src,x:q.x,y:q.y,w:q.w||img.width,h:q.h||img.height,role:q.role||'fixed',name:q.name||''};p.alpha=alphaOf(img);out.push(p);}U.parts=out;U.rig();return U;};
  function blink(now){ST.blinkEnd=now+.12;ST.dbl=Math.random()<.25;ST.blinkAt=now+1.6+Math.random()*3.5*(1.6-U.P.blink/100);}
  U.act=function(a){const now=ST.t;
    if(a==='hop'){ST.bv=-520-Math.random()*120;ST.stretch=.35;blink(now);}
    else if(a==='tilt'){ST.tiltT=(Math.random()<.5?-1:1)*16;ST.tiltEnd=now+1.3;}
    else if(a==='blink')blink(now);
    else if(a==='shake')ST.shake=1;};
  // なでる：目をつぶって、なでる向きに少し首をかしげる
  U.pet=function(dir){const now=ST.t;ST.blinkEnd=Math.max(ST.blinkEnd,now+.5);ST.dbl=false;ST.blinkAt=Math.max(ST.blinkAt,now+1.2);
    if(now-ST.petEnd>.6)ST.petSum=0;ST.petSum+=.05;ST.petEnd=now+.5;ST.petDir+=((dir||0)-ST.petDir)*.3;ST.tiltT=ST.petDir*10;ST.tiltEnd=now+.5;
    if(U.onpet)U.onpet(ST.petSum);};
  U.petting=()=>ST.t<ST.petEnd;
  // ポインタの動きから「なでている」を見つける：からすの上で、行ったり来たりしたら
  const PT=[];
  U.strokeClient=function(cx,cy){if(U.pettable===false)return false;const now=ST.t;
    if(!U.hitClient(cx,cy)){PT.length=0;return false;}
    PT.push({t:now,x:cx,y:cy});while(PT.length&&now-PT[0].t>.9)PT.shift();
    let rev=0,len=0,sx=0,sy=0;for(let i=1;i<PT.length;i++){const dx=PT[i].x-PT[i-1].x,dy=PT[i].y-PT[i-1].y;len+=Math.abs(dx)+Math.abs(dy);
      if(Math.abs(dx)>1.5){const s2=Math.sign(dx);if(sx&&s2!==sx)rev++;sx=s2;}if(Math.abs(dy)>1.5){const s3=Math.sign(dy);if(sy&&s3!==sy)rev++;sy=s3;}}
    if((rev>=2&&len>40)||U.petting()&&len>8){const l=PT[PT.length-1],f=PT[Math.max(0,PT.length-4)];U.pet(Math.sign(l.x-f.x));return true;}return false;};
  // 見てほしい点：canvas の表示上の座標（CSS px）
  U.pointAt=function(cx,cy){if(!U.view)return;const r=cv.getBoundingClientRect(),x=cx/r.width*cv.width,y=cy/r.height*cv.height;ST.ptr=M.ap(M.inv(U.view),[x,y]);ST.ptrAt=ST.t;};
  U.pointClient=function(clientX,clientY){const r=cv.getBoundingClientRect();U.pointAt(clientX-r.left,clientY-r.top);U.strokeClient(clientX,clientY);};
  // その点にキャラが描かれているか（クリックを通すかどうか）
  U.hitClient=function(clientX,clientY){const r=cv.getBoundingClientRect(),x=Math.floor((clientX-r.left)/r.width*cv.width),y=Math.floor((clientY-r.top)/r.height*cv.height);if(x<0||y<0||x>=cv.width||y>=cv.height)return false;
    try{const d=g.getImageData(Math.max(0,x-3),Math.max(0,y-3),7,7).data;for(let i=3;i<d.length;i+=4)if(d[i]>40)return true;}catch(e){}return false;};
  function step(dt){const t=ST.t+=dt,R=U.R,P=U.P;
    if(ST.petSum>1.2&&t>ST.petEnd){ST.petSum=0;ST.bv=-260;ST.stretch=.2;}// たくさんなでられたら、うれしくてぴょこっ
    if(t<ST.petEnd){ST.lookT=[ST.petDir*.25,-.35];}
    else if(U.follow&&ST.ptr&&t-ST.ptrAt<2.5){const nz=Math.max(R.hw,R.hh)*1.3;ST.lookT=[Math.max(-1,Math.min(1,(ST.ptr[0]-R.hc[0])/nz)),Math.max(-1,Math.min(1,(ST.ptr[1]-R.hc[1])/nz))];}
    else if(t>ST.lookAt){ST.lookAt=t+1.2+Math.random()*3;ST.lookT=Math.random()<.3?[0,0]:[Math.random()*2-1,(Math.random()*2-1)*.5];}
    const lk=1-Math.exp(-dt*7);ST.look[0]+=(ST.lookT[0]-ST.look[0])*lk;ST.look[1]+=(ST.lookT[1]-ST.look[1])*lk;
    if(t>ST.blinkAt&&P.blink>0)blink(t);
    if(ST.dbl&&t>ST.blinkEnd+.1&&t<ST.blinkEnd+.12){ST.blinkEnd=t+.11;ST.dbl=false;}
    const K=180,C=14;ST.bv+=(-K*ST.by-C*ST.bv)*dt;ST.by+=ST.bv*dt;ST.stretch*=Math.exp(-dt*4);
    if(t>ST.tiltEnd)ST.tiltT=0;ST.tilt+=(ST.tiltT-ST.tilt)*(1-Math.exp(-dt*8));ST.shake*=Math.exp(-dt*2.2);}
  U.draw=function(dt){const R=U.R,P=U.P,W=cv.width,Hh=cv.height;g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.clearRect(0,0,W,Hh);
    if(U.bg&&U.bg!=='trans'){g.fillStyle=U.bg;g.fillRect(0,0,W,Hh);}
    if(!R)return;step(dt);
    const t=ST.t,b=R.bb,bw=b.x1-b.x0,bh=b.y1-b.y0,sc=Math.min(W*U.fit/bw,Hh*U.fit/(bh*1.08));
    U.view=M.mul(M.T(W/2,Hh/2+bh*sc*.04),M.mul(M.S(sc,sc),M.T(-b.cx,-b.cy)));
    const q=U.quiet?.5:1;
    const br=Math.sin(t*2*Math.PI/3.2)*.018*P.breath/50*q,sw=(Math.sin(t*2*Math.PI/4.1)*2.2*P.sway/50*q+Math.sin(t*37)*ST.shake*5)*deg;
    const sq=Math.max(-.12,Math.min(.12,-ST.bv*.00018));
    // G：地面ごと（ぴょんで全体が浮く）、Bl：体だけ（呼吸・ゆらゆら・ぶるぶる）
    const G=M.mul(U.view,M.T(0,ST.by*bh/700));
    const Bl=M.mul(M.T(Math.sin(t*41)*ST.shake*bh*.012,0),about([R.bc[0],R.bc[1]+bh*.25],M.mul(M.R(sw),M.S(1+br-sq*.5,1-br+sq))));
    const B=M.mul(G,Bl),look=ST.look;
    let N=M.S(1,1),d=[0,0];
    if(R.nb){const st=1+(Math.sin(t*2*Math.PI/5.3)*.5+.5)*.12*P.neck/50*q+ST.stretch*.6+Math.max(0,look[1])*-.06;N=about(R.nb,M.mul(M.R(-look[0]*3*deg),M.S(1,st)));const p=M.ap(N,R.nt);d=[p[0]-R.nt[0],p[1]-R.nt[1]];}
    const L=P.look/60;
    const H=M.mul(B,M.mul(M.T(d[0],d[1]),about(R.hp,M.R((look[0]*7*L+ST.tilt+Math.sin(t*1.3)*1.2*q)*deg))));
    const F=M.mul(H,M.T(look[0]*R.hw*.07*L,look[1]*R.hh*.05*L));
    const closed=ST.t<ST.blinkEnd,sp=P.spring/100,dd=Math.max(dt,1e-3);
    U.parts.forEach(p=>{if(p.role!=='swing'||!p.piv)return;const w=M.ap(B,p.piv);if(!p.pv){p.pv=w;p.vv=[0,0];}
      const v=[(w[0]-p.pv[0])/dd,(w[1]-p.pv[1])/dd],a=[(v[0]-p.vv[0])/dd,(v[1]-p.vv[1])/dd];p.pv=w;p.vv=v;
      const len=Math.hypot(p.com[0],p.com[1])||1,tau=-(p.com[0]*a[1]-p.com[1]*a[0])/(len*len)*.9*sp/sc;
      p.om+=(tau-60*p.th-(4+6*(1-sp))*p.om)*dt;p.th+=p.om*dt;p.th=Math.max(-.6,Math.min(.6,p.th));});
    U.parts.forEach(p=>{if(p.role==='hide')return;if(p.role==='eyeO'&&closed)return;if(p.role==='eyeC'&&!closed)return;let m;
      switch(p.role){case 'head':m=H;break;case 'face':case 'eyeO':case 'eyeC':m=F;break;case 'neck':m=M.mul(B,N);break;
        case 'swing':m=M.mul(B,about(p.piv,M.R(p.th)));break;
        case 'leg':{const Fp=p.foot,A=p.piv,A2=M.ap(Bl,A),u=[A[0]-Fp[0],A[1]-Fp[1]],u2=[A2[0]-Fp[0],A2[1]-Fp[1]],l=Math.hypot(u[0],u[1])||1,k=Math.hypot(u2[0],u2[1])/l-1,e=[u[0]/l,u[1]/l];
          const St=[1+k*e[0]*e[0],k*e[0]*e[1],k*e[0]*e[1],1+k*e[1]*e[1],0,0],an=Math.atan2(u2[1],u2[0])-Math.atan2(u[1],u[0]);m=M.mul(G,about(Fp,M.mul(M.R(an),St)));break;}
        default:m=B;}
      g.setTransform(m[0],m[1],m[2],m[3],m[4],m[5]);g.drawImage(p.img,p.x,p.y,p.w,p.h);});
    g.setTransform(1,0,0,1,0,0);};
  let last=performance.now();
  function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;if(!U.paused)U.draw(dt);requestAnimationFrame(loop);}
  requestAnimationFrame(loop);
  return U;}
window.Uchinoko={create,loadImg};
})();
