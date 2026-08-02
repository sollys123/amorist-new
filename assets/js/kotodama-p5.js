/* Kotodama well — procedural ink and floating words, p5.js instance mode. */
(()=>{
  const boot=()=>{
    const host=document.getElementById('kotodamaP5'),root=document.getElementById('omikujiSanctuary');
    if(!host||!root||typeof window.p5!=='function')return;
    let observer;
    const sketch=p=>{
      const chars=[...'言詞物語夢恋声心縁記章夜月花雨光頁綴紡響想願時幕'];
      let motes=[],lastW=0,lastH=0,summoning=false,summoned=false,startedAt=0;
      const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
      const mix=(a,b,t)=>a+(b-a)*t;
      const smooth=t=>t*t*(3-2*t);
      const center=()=>({x:p.width*(p.width<680?.5:.36),y:p.height*.64});
      const rebuild=()=>{motes=Array.from({length:34},(_,i)=>({char:chars[i%chars.length],seed:i*.731+.27,offset:(i*83)%337/337,speed:.72+(i%7)*.085,radius:20+(i%8)*13,size:11+(i%5)*2.2}))};
      const resize=()=>{const r=host.getBoundingClientRect(),w=Math.max(2,Math.round(r.width)),h=Math.max(2,Math.round(r.height));if(w===lastW&&h===lastH)return;lastW=w;lastH=h;p.resizeCanvas(w,h,true)};
      const paper=()=>{
        const ctx=p.drawingContext,g=ctx.createLinearGradient(0,0,p.width,p.height);g.addColorStop(0,'#ece6da');g.addColorStop(.55,'#ddd9cf');g.addColorStop(1,'#c9c7c0');ctx.fillStyle=g;ctx.fillRect(0,0,p.width,p.height);
        const c=center();p.noStroke();p.fill(67,65,69,13);p.ellipse(c.x,c.y,p.width*.54,p.height*.72);p.fill(246,238,217,28);p.ellipse(p.width*.72,p.height*.35,p.width*.42,p.height*.52);
        for(let i=0;i<330;i++){p.fill(66,60,57,3+i%7);p.circle(((i*89)%337)/337*p.width,((i*157)%349)/349*p.height,.25+(i%3)*.2)}
      };
      const inkWell=()=>{
        const c=center(),pulse=Math.sin(p.millis()*.0012)*2;p.noFill();
        for(let i=0;i<5;i++){p.stroke(65,61,69,25-i*3);p.strokeWeight(1);p.ellipse(c.x,c.y+7,p.width*(.085+i*.017)+pulse,p.height*(.026+i*.006)+pulse*.25)}
        p.noStroke();p.fill(54,52,59,35);p.ellipse(c.x,c.y+7,p.width*.15,p.height*.055);
      };
      const idleGlyph=(m,index)=>{
        const c=center(),time=p.millis()*.000035*m.speed,life=(m.offset+time)%1,y=c.y-mix(12,p.height*.47,life),x=c.x+Math.sin(life*9+m.seed*4)*m.radius*(1-life*.42),fade=Math.sin(Math.PI*life);
        p.noStroke();p.fill(65,59,65,fade*(20+(index%4)*7));p.textAlign(p.CENTER,p.CENTER);p.textFont('serif');p.textSize(m.size);p.text(m.char,x,y);
      };
      const summoningGlyph=(m,index,progress)=>{
        const delay=(index%9)*.018+(index%3)*.008,q=clamp((progress-delay)/(1-delay),0,1);
        const c=center(),sx=c.x+Math.sin(m.seed*5.7)*m.radius*2.4,sy=c.y-p.height*(.12+m.offset*.38);
        let x,y,alpha;
        if(q<.58){const t=smooth(q/.58),turn=(1-t)*m.seed*3;x=mix(sx,c.x,t)+Math.sin(turn*7)*m.radius*(1-t);y=mix(sy,c.y+4,t);alpha=mix(28,68,t)}
        else{const t=smooth((q-.58)/.42),targetX=p.width*(p.width<680?.5:.69),targetY=p.height*.36+(index%5-2)*3,turn=t*Math.PI*1.45+m.seed;x=mix(c.x,targetX,t)+Math.cos(turn)*m.radius*.72*(1-t);y=mix(c.y,targetY,t)-Math.sin(t*Math.PI)*p.height*.1;alpha=(1-t)*68}
        p.noStroke();p.fill(54,49,57,alpha);p.textAlign(p.CENTER,p.CENTER);p.textFont('serif');p.textSize(m.size*(1+q*.16));p.text(m.char,x,y);
      };
      const mist=()=>{const c=center();p.noStroke();for(let i=0;i<4;i++){const drift=Math.sin(p.millis()*.00022+i)*p.width*.018;p.fill(235,232,221,9+i*3);p.ellipse(c.x+drift,c.y-p.height*(.17+i*.06),p.width*(.15+i*.045),p.height*.07)}};
      const render=()=>{
        resize();paper();inkWell();
        if(summoning){const q=clamp((performance.now()-startedAt)/2800,0,1);motes.forEach((m,i)=>summoningGlyph(m,i,q));if(q>=1){summoning=false;summoned=true}}
        else if(!summoned)motes.forEach(idleGlyph);else mist();
        host.dataset.kotodamaFrame=String(p.frameCount);
      };
      const api={summon(){startedAt=performance.now();summoning=true;summoned=false;p.loop()},reset(){summoning=false;summoned=false;resize();p.loop()},resize,pause(){p.noLoop()}};
      window.amoristKotodamaP5=api;
      p.setup=()=>{const r=host.getBoundingClientRect(),canvas=p.createCanvas(Math.max(2,Math.round(r.width)),Math.max(2,Math.round(r.height)));canvas.parent(host);canvas.elt.setAttribute('aria-hidden','true');p.pixelDensity(Math.min(window.devicePixelRatio||1,1.5));p.frameRate(45);rebuild();lastW=p.width;lastH=p.height;observer=new ResizeObserver(resize);observer.observe(host);host.dataset.kotodamaReady='true'};
      p.draw=()=>{if(root.dataset.view!=='ink')return;render()};
    };
    new window.p5(sketch,host);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
