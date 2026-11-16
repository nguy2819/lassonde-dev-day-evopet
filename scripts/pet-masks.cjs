/**
 * Builds the accessory masks in public/pets/masks/ (white + alpha PNGs, 720x960)
 * used to recolour just a companion's bow tie, bandana, hat... (see lib/pets.ts).
 *
 *   node scripts/pet-masks.cjs              # write masks
 *   node scripts/pet-masks.cjs <debug-dir>  # also write magenta overlays to check them
 *
 * Each accessory is selected by hue/saturation inside a region, cleaned up with a
 * morphological close, small specks dropped and enclosed gaps filled. Re-tune CFG
 * if the artwork changes. Prints each accessory's average colour for lib/pets.ts.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- plain Node script, run without a build step
const sharp = require("sharp");
const OUT = process.argv[2];
// seeds/box in fractions of the 720x960 image; ht = hue tolerance (deg)
const CFG = {
  // hue: accessory hue; ht: tolerance; smin: min saturation; box [x0,y0,x1,y1] or ell [cx,cy,rx,ry]; holes: fill enclosed gaps
  mouse:   { hue: 12,  ht: 14, smin: .35, box: [.36,.36,.72,.51] },
  ox:      { hue: 210, ht: 14, smin: .22, box: [.27,.43,.72,.58] },
  tiger:   { hue: 157, ht: 16, smin: .25, box: [.28,.40,.68,.56] },
  rabbit:  { hue: 133, ht: 20, smin: .15, box: [.50,.44,.70,.53] },
  snake:   { hue: 44,  ht: 10, smin: .58, ell: [.46,.28,.34,.16], holes: false, vmin: .72 },
  horse:   { hue: 15,  ht: 9, smin: .45, box: [.28,.43,.78,.63], holes: false },
  goat:    { hue: 44,  ht: 12, smin: .25, box: [.38,.38,.70,.56] },
  monkey:  { hue: 356, ht: 12, smin: .55, box: [.20,.17,.38,.28] },
  rooster: { hue: 212, ht: 22, smin: .25, box: [.33,.44,.72,.59] },
  dog:     { hue: 7,   ht: 11, smin: .42, box: [.26,.36,.76,.56], holes: false },
  pig:     { hue: 167, ht: 24, smin: .15, box: [.30,.13,.56,.29] },
};
function hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360}return[h,mx?d/mx:0,mx]}
const hd=(a,b)=>{const d=Math.abs(a-b)%360;return d>180?360-d:d};
(async()=>{
  const report={};
  for (const [name,c] of Object.entries(CFG)) {
    const {data,info}=await sharp(`public/pets/${name}.webp`).removeAlpha().raw().toBuffer({resolveWithObject:true});
    const W=info.width,H=info.height,N=W*H;
    const HS=new Float32Array(N*3);
    for(let i=0;i<N;i++){const v=hsv(data[i*3],data[i*3+1],data[i*3+2]);HS[i*3]=v[0];HS[i*3+1]=v[1];HS[i*3+2]=v[2];}
    const refH=c.hue, refS=c.smin;
    const reg=c.ell?[(c.ell[0]-c.ell[2])*W,(c.ell[1]-c.ell[3])*H,(c.ell[0]+c.ell[2])*W,(c.ell[1]+c.ell[3])*H]:[c.box[0]*W,c.box[1]*H,c.box[2]*W,c.box[3]*H];
    const [bx0,by0,bx1,by1]=reg.map(Math.round);
    const inBox=(x,y)=>{if(!(x>=bx0&&x<bx1&&y>=by0&&y<by1))return false;if(!c.ell)return true;const dx=(x/W-c.ell[0])/c.ell[2],dy=(y/H-c.ell[1])/c.ell[3];return dx*dx+dy*dy<=1;};
    let m=new Uint8Array(N);
    for(let y=by0;y<by1;y++)for(let x=bx0;x<bx1;x++){const i=y*W+x;if(inBox(x,y)&&hd(HS[i*3],c.hue)<=c.ht&&HS[i*3+1]>=c.smin&&HS[i*3+2]>(c.vmin??0.15))m[i]=1;}
    // drop specks
    {const seen=new Uint8Array(N);for(let i=0;i<N;i++){if(!m[i]||seen[i])continue;const comp=[i];seen[i]=1;for(let k=0;k<comp.length;k++){const j=comp[k];const x=j%W,y=(j/W)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const t=ny*W+nx;if(m[t]&&!seen[t]){seen[t]=1;comp.push(t);}}}if(comp.length<200)for(const j of comp)m[j]=0;}}
    const morph=(src,r,dil)=>{const o=new Uint8Array(N);for(let y=by0;y<by1;y++)for(let x=bx0;x<bx1;x++){let v=dil?0:1;outer:for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(dx*dx+dy*dy>r*r)continue;const nx=x+dx,ny=y+dy;const s=(nx>=0&&ny>=0&&nx<W&&ny<H)?src[ny*W+nx]:0;if(dil&&s){v=1;break outer}if(!dil&&!s){v=0;break outer}}o[y*W+x]=v;}return o};
    m=morph(morph(m,4,true),4,false); // close
    if(c.holes!==false){
    // fill holes: background reachable from box border
    const bg=new Uint8Array(N);const st=[];
    for(let x=bx0;x<bx1;x++){for(const y of [by0,by1-1]){const i=y*W+x;if(!m[i]&&!bg[i]){bg[i]=1;st.push(i)}}}
    for(let y=by0;y<by1;y++){for(const x of [bx0,bx1-1]){const i=y*W+x;if(!m[i]&&!bg[i]){bg[i]=1;st.push(i)}}}
    while(st.length){const i=st.pop();const x=i%W,y=(i/W)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(!inBox(nx,ny))continue;const j=ny*W+nx;if(!m[j]&&!bg[j]){bg[j]=1;st.push(j)}}}
    for(let y=by0;y<by1;y++)for(let x=bx0;x<bx1;x++){const i=y*W+x;if(!bg[i]&&inBox(x,y))m[i]=1;}
    }
    m=morph(m,1,true);
    let area=0,ar=0,ag=0,ab=0;
    const alpha=Buffer.alloc(N);for(let i=0;i<N;i++){if(m[i]){alpha[i]=255;area++;ar+=data[i*3];ag+=data[i*3+1];ab+=data[i*3+2];}}
    const soft=await sharp(alpha,{raw:{width:W,height:H,channels:1}}).blur(1.6).extractChannel(0).raw().toBuffer();
    const rgba=Buffer.alloc(N*4,255);for(let i=0;i<N;i++)rgba[i*4+3]=soft[i];
    await sharp(rgba,{raw:{width:W,height:H,channels:4}}).png({compressionLevel:9,palette:false}).toFile(`public/pets/masks/${name}.png`);
    const hex='#'+[ar,ag,ab].map(v=>Math.round(v/area).toString(16).padStart(2,'0')).join('');
    report[name]={refH:Math.round(refH),refS:+refS.toFixed(2),area,hex};
    // debug overlay
    const ov=Buffer.alloc(N*4);for(let i=0;i<N;i++){ov[i*4]=255;ov[i*4+1]=0;ov[i*4+2]=255;ov[i*4+3]=Math.round(soft[i]*0.75);}
    if (OUT) await sharp(`public/pets/${name}.webp`).composite([{input:await sharp(ov,{raw:{width:W,height:H,channels:4}}).png().toBuffer()}]).png().toBuffer().then(b=>sharp(b).resize(360,480).png().toFile(`${OUT}/dbg-${name}.png`));
  }
  console.log(JSON.stringify(report,null,1));
})();
