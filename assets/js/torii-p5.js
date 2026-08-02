/* Procedural Senbon Torii passage — p5.js instance mode, no raster artwork. */
(()=>{
  const boot=()=>{
    const host=document.getElementById('toriiP5');
    const root=document.getElementById('omikujiSanctuary');
    if(!host||!root||typeof window.p5!=='function')return;

    let observer;
    const sketch=p=>{
      const depths=[.03,.075,.13,.205,.29,.385,.49,.605,.725,.85,.97];
      let flecks=[];
      let travel=0;
      let travelFrom=0;
      let travelTo=0;
      let travelStarted=0;
      let travelling=false;
      let lastW=0;
      let lastH=0;

      const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
      const mix=(a,b,t)=>a+(b-a)*t;
      const ease=t=>t*t*(3-2*t);
      const visible=()=>root.dataset.view==='torii';

      const makeFlecks=()=>{
        flecks=Array.from({length:520},(_,i)=>({
          x:((i*83)%521)/521,
          y:((i*193)%509)/509,
          a:3+(i%10),
          r:.25+(i%4)*.18
        }));
      };

      const resize=()=>{
        const rect=host.getBoundingClientRect();
        const width=Math.max(2,Math.round(rect.width));
        const height=Math.max(2,Math.round(rect.height));
        if(width===lastW&&height===lastH)return;
        lastW=width;
        lastH=height;
        p.resizeCanvas(width,height,true);
      };

      const paper=()=>{
        const ctx=p.drawingContext;
        const sky=ctx.createLinearGradient(0,0,0,p.height);
        sky.addColorStop(0,'#eee8dd');
        sky.addColorStop(.46,'#e6e0d4');
        sky.addColorStop(1,'#cbc4b5');
        ctx.fillStyle=sky;
        ctx.fillRect(0,0,p.width,p.height);

        p.noStroke();
        p.fill(250,239,205,52);
        p.ellipse(p.width*.5,p.height*.355,p.width*.27,p.height*.22);
        p.fill(109,98,79,9);
        p.ellipse(p.width*.04,p.height*.7,p.width*.44,p.height*.9);
        p.ellipse(p.width*.96,p.height*.69,p.width*.44,p.height*.9);
        flecks.forEach(f=>{
          p.fill(70,59,47,f.a);
          p.circle(f.x*p.width,f.y*p.height,f.r);
        });
      };

      const pathPoint=(t,side=0)=>{
        const q=Math.pow(clamp(t,0,1),1.62);
        const sway=Math.sin(t*2.25)*p.width*.012*(1-q);
        const cx=p.width*.5+sway;
        const y=mix(p.height*.385,p.height*1.055,q);
        const half=mix(p.width*.018,p.width*.355,q);
        return{x:cx+half*side,y,half,q};
      };

      const path=()=>{
        const ctx=p.drawingContext;
        const left=[];
        const right=[];
        for(let i=0;i<=30;i++){
          const t=i/30;
          left.push(pathPoint(t,-1));
          right.push(pathPoint(t,1));
        }
        const fillPath=(spread,color)=>{
          ctx.beginPath();
          left.forEach((point,i)=>i?ctx.lineTo(point.x-point.half*spread,point.y):ctx.moveTo(point.x-point.half*spread,point.y));
          [...right].reverse().forEach(point=>ctx.lineTo(point.x+point.half*spread,point.y));
          ctx.closePath();
          ctx.fillStyle=color;
          ctx.fill();
        };
        fillPath(.055,'rgba(102,91,72,.10)');
        fillPath(0,'rgba(207,198,180,.92)');

        p.noFill();
        p.stroke(112,100,80,28);
        p.strokeWeight(1);
        for(let i=0;i<17;i++){
          const t=((i/16)+travel*.24)%1;
          if(t<.035)continue;
          const l=pathPoint(t,-.96);
          const r=pathPoint(t,.96);
          const bend=Math.max(1,l.half*.035);
          p.bezier(l.x,l.y,r.x-l.half*.55,l.y+bend,r.x-l.half*.22,r.y-bend,r.x,r.y);
        }

        p.stroke(105,95,77,18);
        for(let i=0;i<13;i++){
          const t=.08+i*.071;
          const a=pathPoint(t,-.86+(i%3)*.12);
          const b=pathPoint(Math.min(1,t+.095),-.62+(i%4)*.36);
          p.line(a.x,a.y,b.x,b.y);
        }

        p.noStroke();
        for(let i=0;i<80;i++){
          const t=.08+((i*37)%79)/88;
          const point=pathPoint(t,Math.sin(i*7.3)*.82);
          p.fill(95,85,68,7+i%5);
          p.ellipse(point.x,point.y,.45+point.q*1.3,.35+point.q*.7);
        }
      };

      const washPolygon=(points,rgb,alpha,seed=0)=>{
        const ctx=p.drawingContext;
        const trace=drift=>{
          ctx.beginPath();
          points.forEach((point,index)=>{
            const x=point[0]+drift*(index%2?-.55:.55);
            const y=point[1]+drift*(index<2?.3:-.3);
            if(index===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
          });
          ctx.closePath();
        };
        /* The body is opaque; the two translucent passes are pigment texture only. */
        trace(0);
        ctx.fillStyle=`rgb(${rgb.join(',')})`;
        ctx.fill();
        for(let layer=0;layer<2;layer++){
          const drift=(layer-1)*.55+Math.sin(seed*31+layer)*.26;
          trace(drift);
          ctx.fillStyle=layer===0
            ?`rgba(91,45,39,${Math.min(.08,alpha/3200)})`
            :`rgba(241,190,155,${Math.min(.07,alpha/3600)})`;
          ctx.fill();
        }
      };

      const gate=(rawT,gateSeed)=>{
        const t=clamp(rawT,0,1);
        const q=Math.pow(t,1.52);
        const anchor=pathPoint(t,0);
        const width=mix(p.width*.068,p.width*1.5,q);
        const height=mix(p.height*.07,p.height*1.13,q);
        const cx=anchor.x;
        const base=anchor.y;
        const top=base-height;
        const post=Math.max(1.8,width*.021);
        const left=cx-width*.355;
        const right=cx+width*.355;
        const beamY=top+height*.105;
        const alpha=mix(78,222,Math.pow(t,.72));
        const depthTone=Math.pow(t,.64);
        const tint=(far,near)=>far.map((value,index)=>Math.round(mix(value,near[index],depthTone)));
        const red=tint([193,132,112],[153,66,54]);
        const redLight=tint([211,154,129],[181,78,61]);
        const ink=tint([133,121,111],[61,52,47]);

        /* shadows keep the gateway grounded instead of looking like loose sticks */
        p.noStroke();
        p.fill(50,43,37,alpha*.105);
        p.ellipse(left,base+post*.12,post*4.7,post*.75);
        p.ellipse(right,base+post*.12,post*4.7,post*.75);

        washPolygon([[left-post*.55,beamY],[left+post*.55,beamY],[left+post*.72,base],[left-post*.72,base]],red,alpha,gateSeed+.11);
        washPolygon([[right-post*.55,beamY],[right+post*.55,beamY],[right+post*.72,base],[right-post*.72,base]],red,alpha,gateSeed+.31);

        const footH=Math.max(2,height*.055);
        washPolygon([[left-post*.82,base-footH],[left+post*.82,base-footH],[left+post*.95,base],[left-post*.95,base]],ink,alpha*.78,gateSeed+.51);
        washPolygon([[right-post*.82,base-footH],[right+post*.82,base-footH],[right+post*.95,base],[right-post*.95,base]],ink,alpha*.78,gateSeed+.71);

        const lintelH=Math.max(2.2,height*.026);
        washPolygon([[cx-width*.42,beamY+height*.052],[cx+width*.42,beamY+height*.052],[cx+width*.405,beamY+height*.052+lintelH],[cx-width*.405,beamY+height*.052+lintelH]],redLight,alpha*.9,gateSeed+.25);

        /* a single curved kasagi: the complete top travels with both pillars */
        const ctx=p.drawingContext;
        const drawKasagi=(jitter,fillStyle)=>{
          ctx.beginPath();
          ctx.moveTo(cx-width*.495,top+height*.046+jitter);
          ctx.bezierCurveTo(cx-width*.31,top-height*.005+jitter,cx+width*.31,top-height*.005+jitter,cx+width*.495,top+height*.046+jitter);
          ctx.lineTo(cx+width*.47,top+height*.085+jitter);
          ctx.bezierCurveTo(cx+width*.27,top+height*.058+jitter,cx-width*.27,top+height*.058+jitter,cx-width*.47,top+height*.085+jitter);
          ctx.closePath();
          ctx.fillStyle=fillStyle;
          ctx.fill();
        };
        drawKasagi(0,`rgb(${ink.join(',')})`);
        drawKasagi(-.55,`rgba(238,222,201,${Math.min(.06,alpha/4200)})`);
        drawKasagi(.55,`rgba(44,37,34,${Math.min(.07,alpha/3600)})`);
        p.noStroke();
        p.fill(red[0],red[1],red[2]);
        p.rect(cx-width*.43,top+height*.082,width*.86,Math.max(1.5,height*.025));

        /* small centre plaque appears only when it can be read as a detail */
        if(t>.27){
          const plaqueW=Math.max(4,width*.047);
          const plaqueH=Math.max(5,height*.07);
          const plaque=tint([139,116,99],[79,61,50]);
          p.fill(plaque[0],plaque[1],plaque[2]);
          p.rect(cx-plaqueW/2,top+height*.09,plaqueW,plaqueH,Math.max(1,plaqueW*.08));
        }
      };

      const grounds=()=>{
        p.noStroke();
        for(let side of [-1,1]){
          for(let i=0;i<9;i++){
            const t=.25+i*.085;
            const point=pathPoint(t,side*(1.12+(i%3)*.11));
            const size=mix(2,15,point.q);
            p.fill(83,81,63,18+i%4*3);
            p.ellipse(point.x,point.y,size*1.7,size*.72);
            if(i%3===1){
              p.stroke(76,79,56,30);
              p.strokeWeight(Math.max(.45,size*.08));
              p.line(point.x,point.y,point.x+side*size*.25,point.y-size*1.3);
              p.line(point.x+side*size*.13,point.y-size*.68,point.x-side*size*.24,point.y-size*1.02);
              p.noStroke();
            }
          }
        }
      };

      const haze=()=>{
        p.noStroke();
        for(let i=0;i<5;i++){
          const drift=Math.sin(p.millis()*.00018+i*1.6)*p.width*.018;
          p.fill(247,241,222,13+i*2.5);
          p.ellipse(p.width*.5+drift,p.height*(.34+i*.026),p.width*(.19+i*.055),p.height*(.055+i*.025));
        }
      };

      const render=()=>{
        paper();
        grounds();
        path();
        const phase=(travel*.58)%1;
        depths
          .map((depth,index)=>({t:(depth+phase)%1,seed:index*1.731+4.1}))
          .sort((a,b)=>a.t-b.t)
          .forEach(item=>gate(item.t,item.seed));
        haze();
      };

      const api={
        pass(){
          travelFrom=travel;
          travelTo=travel+1;
          travelStarted=performance.now();
          travelling=true;
          p.loop();
        },
        reset(){
          travel=0;
          travelFrom=0;
          travelTo=0;
          travelling=false;
          resize();
          p.loop();
        },
        resize
      };
      window.amoristToriiP5=api;

      p.setup=()=>{
        const rect=host.getBoundingClientRect();
        const canvas=p.createCanvas(Math.max(2,Math.round(rect.width)),Math.max(2,Math.round(rect.height)));
        canvas.parent(host);
        canvas.elt.setAttribute('aria-hidden','true');
        p.pixelDensity(Math.min(window.devicePixelRatio||1,1.5));
        p.frameRate(60);
        p.noiseSeed(4107);
        makeFlecks();
        lastW=p.width;
        lastH=p.height;
        host.dataset.p5Ready='true';
        observer=new ResizeObserver(resize);
        observer.observe(host);
      };

      p.draw=()=>{
        resize();
        if(!visible())return;
        if(travelling){
          const t=clamp((performance.now()-travelStarted)/1900,0,1);
          travel=mix(travelFrom,travelTo,ease(t));
          if(t>=1)travelling=false;
        }
        render();
        host.dataset.p5Frame=String(p.frameCount);
        if(!travelling&&root.dataset.toriiPhase!=='idle')p.noLoop();
      };
    };

    new window.p5(sketch,host);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
