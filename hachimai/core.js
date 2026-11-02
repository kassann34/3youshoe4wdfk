/* 8枚麻雀：ルールの中身（画面や通信とは切りはなしてある。部屋主の進行・各自のガイド・テストで共通に使う）
   牌の種類 k：0〜8＝索子1〜9、9〜17＝筒子1〜9、18〜23＝生き物（風牌の代わり。人数ぶんだけ使う）、24＝つたきる（全員の役牌）
   上がりの形：8枚＝面子（順子か刻子）2つ＋雀頭1つ */
const K=25,TUT=24;
const CRE=[{id:'waso',ja:'鳥',cp:0xF1974},{id:'soweli',ja:'けもの',cp:0xF1962},{id:'kala',ja:'魚',cp:0xF1914},{id:'akesi',ja:'は虫類',cp:0xF1901},{id:'pipi',ja:'虫',cp:0xF1951},{id:'kijetesantakalu',ja:'アライグマ',cp:0xF1980}];
const isNum=k=>k<18,isHonor=k=>k>=18,suitOf=k=>k<9?0:1,numOf=k=>k%9+1;
const kindName=k=>k<9?`${numOf(k)}索`:k<18?`${numOf(k)}筒`:k<24?CRE[k-18].id:'つたきる';
const toCounts=h=>{const c=new Array(K).fill(0);h.forEach(k=>c[k]++);return c;};
const sortHand=h=>h.slice().sort((a,b)=>a-b);
// 使う牌：数牌18種類、生き物は人数ぶん（2人でも2種類）、つたきる。各4枚
function makeWall(n){const kinds=[];for(let k=0;k<18;k++)kinds.push(k);for(let i=0;i<Math.max(2,n);i++)kinds.push(18+i);kinds.push(TUT);
  const w=[];kinds.forEach(k=>{for(let i=0;i<4;i++)w.push(k);});for(let i=w.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[w[i],w[j]]=[w[j],w[i]];}return w;}
const usedKinds=n=>{const a=[];for(let k=0;k<18;k++)a.push(k);for(let i=0;i<Math.max(2,n);i++)a.push(18+i);a.push(TUT);return a;};
// ドラ：表示牌の次の牌。数牌は同じ色で9→1、字牌は 生き物…→つたきる→最初の生き物 の順にまわる
function doraOf(ind,n){if(isNum(ind))return ind%9===8?ind-8:ind+1;const hon=usedKinds(n).filter(isHonor);return hon[(hon.indexOf(ind)+1)%hon.length];}

/* 向聴数（あと何枚で聴牌か）。面子 M、搭子（あと1枚で面子）T、雀頭 P として 4-2M-T-P（M+T は2まで）。
   聴牌なら0、上がりの形なら-1 */
function shanten(c){let best=9;c=c.slice();
  const rec=(i,M,T,P)=>{while(i<K&&!c[i])i++;
    if(i>=K){const t=Math.min(T,2-M);const s=4-2*M-t-P;if(s<best)best=s;return;}
    if(c[i]>=3){c[i]-=3;rec(i,M+1,T,P);c[i]+=3;}
    if(isNum(i)&&i%9<=6&&c[i+1]&&c[i+2]){c[i]--;c[i+1]--;c[i+2]--;rec(i,M+1,T,P);c[i]++;c[i+1]++;c[i+2]++;}
    if(c[i]>=2){c[i]-=2;if(!P)rec(i,M,T,1);rec(i,M,T+1,P);c[i]+=2;}
    if(isNum(i)&&i%9<=7&&c[i+1]){c[i]--;c[i+1]--;rec(i,M,T+1,P);c[i]++;c[i+1]++;}
    if(isNum(i)&&i%9<=6&&c[i+2]){c[i]--;c[i+2]--;rec(i,M,T+1,P);c[i]++;c[i+2]++;}
    const s=c[i];c[i]=0;rec(i+1,M,T,P);c[i]=s;};
  rec(0,0,0,0);return best;}
const isComplete=h=>h.length===8&&shanten(toCounts(h))===-1;
// 7枚の手で、どの牌が来ると上がりか（待ち）
const waitsOf=(h,kinds)=>kinds.filter(k=>{const c=toCounts(h);if(c[k]>=4)return false;c[k]++;return shanten(c)===-1;});
// 7枚の手で、どの牌が来ると1歩進むか（受け入れ）。来た牌を入れて、いちばんいい牌を捨てたときに向聴数が下がるもの
function usefulOf(h,kinds){const c=toCounts(h),s0=shanten(c);return kinds.filter(k=>{if(c[k]>=4)return false;c[k]++;let ok=false;
  if(shanten(c)<s0)ok=true;else for(let d=0;d<K&&!ok;d++){if(!c[d]||d===k)continue;c[d]--;if(shanten(c)<s0)ok=true;c[d]++;}c[k]--;return ok;});}

/* 上がりの形の分け方を全部出す。[{pair, melds:[{t:'seq'|'set',k}]}] */
function decomps(h){const c=toCounts(h),out=[];
  for(let p=0;p<K;p++){if(c[p]<2)continue;c[p]-=2;const melds=[];
    const rec=i=>{while(i<K&&!c[i])i++;if(i>=K){if(melds.length===2)out.push({pair:p,melds:melds.map(m=>({...m}))});return;}
      if(c[i]>=3){c[i]-=3;melds.push({t:'set',k:i});rec(i);melds.pop();c[i]+=3;}
      if(isNum(i)&&i%9<=6&&c[i+1]&&c[i+2]){c[i]--;c[i+1]--;c[i+2]--;melds.push({t:'seq',k:i});rec(i);melds.pop();c[i]++;c[i+1]++;c[i+2]++;}};
    rec(0);c[p]+=2;}
  return out;}
// 上がり牌がどの組に入っていたかで待ちの形が決まる
function waitShape(d,w){const r=[];if(d.pair===w)r.push('tanki');
  d.melds.forEach(m=>{if(m.t==='set'&&m.k===w)r.push('shanpon');if(m.t==='seq'&&w>=m.k&&w<=m.k+2){const p=w-m.k,s=m.k%9;r.push(p===1?'kanchan':(p===0&&s===6)||(p===2&&s===0)?'penchan':'ryanmen');}});return r;}

/* 役。ctx={win, tsumo, riichi, ippatsu, seatHonor(自分の生き物の牌), last(最後の牌), more(役を増やす), dora:[ドラの牌]}
   役ごとに1点、ドラは1枚1点。いちばん点の高い分け方を選ぶ */
const YAKU_INFO={
  riichi:['リーチ','聴牌してから「リーチ」と宣言した'],tsumo:['門前ツモ','鳴かずに、自分で引いた牌で上がった'],
  pinfu:['ピンフ','面子が順子だけ・雀頭が役牌でない・待ちが両面（2通り）'],tanyao:['タンヤオ','2〜8の数牌だけでできている（1・9・字牌なし）'],
  tut:['役牌（つたきる）','つたきるを3枚そろえた'],seat:['役牌（自分の生き物）','自分の生き物を3枚そろえた'],
  iipeiko:['一盃口','同じ順子が2つ'],toitoi:['対々和','面子が刻子だけ'],honitsu:['混一色','1種類の数牌と字牌だけ'],chinitsu:['清一色','1種類の数牌だけ'],
  haitei:['海底','山の最後の牌でツモ'],houtei:['河底','最後の捨て牌でロン'],ippatsu:['一発','リーチしてから1巡以内に上がった']};
function scoreHand(h,ctx){let best=null;
  for(const d of decomps(h)){
    for(const ws of [...new Set(waitShape(d,ctx.win))]){const y=[];
      if(ctx.riichi)y.push('riichi');if(ctx.tsumo)y.push('tsumo');
      const isYakuhai=k=>k===TUT||k===ctx.seatHonor;
      if(d.melds.every(m=>m.t==='seq')&&!isYakuhai(d.pair)&&ws==='ryanmen')y.push('pinfu');
      if(h.every(k=>isNum(k)&&k%9>=1&&k%9<=7))y.push('tanyao');
      d.melds.forEach(m=>{if(m.t==='set'&&m.k===TUT)y.push('tut');if(m.t==='set'&&m.k===ctx.seatHonor)y.push('seat');});
      if(ctx.more){
        if(d.melds.length===2&&d.melds[0].t==='seq'&&d.melds[1].t==='seq'&&d.melds[0].k===d.melds[1].k)y.push('iipeiko');
        if(d.melds.every(m=>m.t==='set'))y.push('toitoi');
        const nums=h.filter(isNum),suits=new Set(nums.map(suitOf));
        if(suits.size===1&&nums.length===8)y.push('chinitsu');else if(suits.size===1&&nums.length<8)y.push('honitsu');
        if(ctx.last&&ctx.tsumo)y.push('haitei');if(ctx.last&&!ctx.tsumo)y.push('houtei');if(ctx.ippatsu&&ctx.riichi)y.push('ippatsu');}
      const dora=h.reduce((s,k)=>s+(ctx.dora||[]).filter(x=>x===k).length,0);
      const pts=y.length+(y.length?dora:0);
      if(!best||pts>best.pts)best={yaku:y,dora,pts,decomp:d,wait:ws};}}
  return best;}
// ロンできるか（形ができていて、役が1つ以上ある）
function ronCheck(hand7,tile,ctx){const h=hand7.concat([tile]);if(!isComplete(h))return {complete:false};const s=scoreHand(h,Object.assign({},ctx,{win:tile,tsumo:false}));return {complete:true,ok:!!(s&&s.yaku.length),score:s};}
if(typeof module!=='undefined')module.exports={K,TUT,CRE,isNum,isHonor,numOf,suitOf,kindName,toCounts,sortHand,makeWall,usedKinds,doraOf,shanten,isComplete,waitsOf,usefulOf,decomps,waitShape,scoreHand,ronCheck,YAKU_INFO};
