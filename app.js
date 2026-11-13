(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 900px) and (pointer: fine)');
  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  const booking = {
    'Съёмка':{ title:'Давайте запланируем съёмку.', note:'Все локации находятся в одном зале. Позвоните нам — подберём время, обсудим вашу идею и стоимость аренды.' },
    'Событие':{ title:'Давайте создадим событие.', note:'Расскажите о формате и количестве гостей. Обсудим детали, дату и стоимость вашего события.' },
    'Сертификат':{ title:'Подарите время для себя.', note:'Позвоните нам, чтобы выбрать подарочный сертификат и уточнить его стоимость и оформление.' }
  };
  let lifecycle, lenis, lenisTick, motionContext, currentDialog, returnFocus;
  let introPlayed=false, observers=[], refreshFrame=0;
  let savedBodyOverflow='', savedRootOverflow='';
  const text=(s,value)=>{const el=$(s);if(el)el.textContent=value;};
  const instant=e=>reduced.matches||!!(e&&e.type==='click'&&e.detail===0)||!!(e&&e.type==='keydown');
  const listen=(target,type,handler,options={})=>target?.addEventListener(type,handler,{...options,signal:lifecycle.signal});
  const press=(s,key,value)=>$$(s).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[key]===String(value))));

  function refresh(){
    if(!ScrollTrigger||refreshFrame)return;
    refreshFrame=requestAnimationFrame(()=>{refreshFrame=0;ScrollTrigger.refresh();lenis?.resize();});
  }
  // No preventDefault: vertical scroll and pinch gestures remain native.
  function swipe(element,onSwipe,{vertical=false}={}){
    if(!element)return;let start,lastSwipe=0;
    listen(element,'pointerdown',e=>{const control=e.target.closest('button,a,input,select,textarea');if(!e.isPrimary||e.pointerType==='mouse'||control&&!control.hasAttribute('data-photo'))return;start={id:e.pointerId,x:e.clientX,y:e.clientY,time:e.timeStamp};},{passive:true});
    listen(element,'pointerup',e=>{
      if(!start||start.id!==e.pointerId)return;
      const x=e.clientX-start.x,y=e.clientY-start.y,time=Math.max(1,e.timeStamp-start.time);start=null;
      const distance=vertical?y:x,cross=vertical?x:y;
      if(Math.abs(distance)<30||Math.abs(distance)<Math.abs(cross)*1.6)return;
      if(Math.abs(distance)>=60||Math.abs(distance)/time>0.35){lastSwipe=performance.now();onSwipe(distance<0?1:-1);}
    },{passive:true});
    listen(element,'pointercancel',()=>{start=null;},{passive:true});
    listen(element,'click',e=>{if(lastSwipe&&performance.now()-lastSwipe<450){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
  }
  function configureBooking(format){
    const key=Object.hasOwn(booking,format)?format:'Съёмка';press('[data-format]','format',key);text('#booking-title',booking[key].title);text('#booking-note',booking[key].note);
  }
  function openDialog(dialog,trigger,immediate=false){
    if(!dialog||currentDialog===dialog&&dialog.open)return;
    if(currentDialog?.open){const previous=currentDialog;previous.close();afterClose(previous);}
    returnFocus=trigger||document.activeElement;currentDialog=dialog;
    savedBodyOverflow=document.body.style.overflow;savedRootOverflow=document.documentElement.style.overflow;
    document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';lenis?.stop();dialog.showModal();
    if(gsap&&!reduced.matches&&!immediate){
      const bookingSheet=dialog.id==='booking-dialog',mobileSheet=bookingSheet&&matchMedia('(max-width: 700px)').matches;
      dialog.classList.add('is-entering');
      gsap.fromTo(dialog,mobileSheet?{yPercent:100,y:0,scale:1,opacity:1}:bookingSheet?{y:28,yPercent:0,scale:0.985,opacity:0}:{y:8,yPercent:0,scale:1,opacity:0.7},
        {y:0,yPercent:0,scale:1,opacity:1,duration:bookingSheet?(mobileSheet?0.58:0.42):0.24,ease:'power3.out',clearProps:'transform,opacity',overwrite:true,onComplete:()=>dialog.classList.remove('is-entering')});
    }
  }
  function afterClose(dialog){
    gsap?.killTweensOf(dialog);dialog.classList.remove('is-entering');dialog.style.removeProperty('transform');dialog.style.removeProperty('opacity');
    if(currentDialog!==dialog)return;currentDialog=null;
    document.body.style.overflow=savedBodyOverflow;document.documentElement.style.overflow=savedRootOverflow;lenis?.start();
    if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;
  }


  // Inline collections keep visitors in the same section and preserve scroll position.
  const inlineGalleries=new Map();
  function settleInlineGallery(entry){
    entry.animation?.kill();entry.animation=null;
    gsap?.killTweensOf(entry.inner);
    entry.panel.hidden=!entry.open;entry.panel.inert=!entry.open;
    entry.panel.style.removeProperty('height');entry.panel.style.removeProperty('overflow');
    entry.inner.style.removeProperty('opacity');entry.inner.style.removeProperty('transform');
  }
  function toggleInlineGallery(group,open,trigger,immediate=false){
    const entry=inlineGalleries.get(group);if(!entry||entry.open===open)return;
    const {panel,inner,button,label}=entry;
    const currentHeight=panel.hidden?0:panel.getBoundingClientRect().height;
    entry.animation?.kill();gsap?.killTweensOf(inner);
    entry.open=open;
    button.setAttribute('aria-expanded',String(open));
    $('.gallery-toggle-label',button).textContent=open?'Свернуть фотографии':label;
    if(!open){
      if(panel.contains(document.activeElement))button.focus({preventScroll:true});
      const bounds=button.getBoundingClientRect();
      if(bounds.top<18||bounds.bottom>window.innerHeight-90){
        const destination=Math.max(0,bounds.top+window.scrollY-24);
        if(lenis)lenis.scrollTo(destination,{immediate:true,force:true});
        else window.scrollTo({top:destination,behavior:'instant'});
      }
    }
    panel.hidden=false;panel.inert=!open;
    if(!gsap||reduced.matches||immediate){settleInlineGallery(entry);refresh();return;}
    panel.style.overflow='hidden';
    entry.animation=gsap.timeline({onComplete:()=>{settleInlineGallery(entry);refresh();}})
      .fromTo(panel,{height:currentHeight},{height:open?inner.offsetHeight:0,duration:open?0.48:0.34,ease:open?'power3.out':'power2.inOut'},0);
    if(open){
      entry.animation.fromTo(inner,{opacity:0,y:12},{opacity:1,y:0,duration:0.4,ease:'power2.out'},0.04);
    }else{
      entry.animation.to(inner,{opacity:0,y:-6,duration:0.2,ease:'power2.in'},0);
    }
  }
  function setupInlineGalleries(){
    inlineGalleries.clear();
    $$('[data-gallery-open]').forEach(button=>{
      const group=button.dataset.galleryOpen,panel=document.getElementById(button.getAttribute('aria-controls'));
      if(!panel)return;
      const count=$$('.inline-gallery-photo',panel).length;
      const entry={button,panel,inner:$('.inline-gallery-inner',panel),open:button.getAttribute('aria-expanded')==='true',label:'Ещё фотографии · '+count,animation:null};
      inlineGalleries.set(group,entry);
      listen(button,'click',e=>toggleInlineGallery(group,!entry.open,button,instant(e)));
      $$('[data-gallery-close]',panel).forEach(close=>listen(close,'click',e=>toggleInlineGallery(group,false,close,instant(e))));
    });
    listen(window,'resize',()=>{for(const entry of inlineGalleries.values())if(entry.animation)settleInlineGallery(entry);refresh();});
  }
  function destroyMotion(cancelPending=false){
    motionContext?.revert();motionContext=null;
    if(lenisTick&&gsap)gsap.ticker.remove(lenisTick);lenisTick=null;lenis?.destroy();lenis=null;
  }
  function setupMotion(){
    destroyMotion();if(!gsap||reduced.matches)return;
    if(ScrollTrigger)gsap.registerPlugin(ScrollTrigger);
    if(desktop.matches&&window.Lenis){
      lenis=new window.Lenis({duration:0.85,smoothWheel:true,syncTouch:false,autoRaf:false,anchors:false});
      if(ScrollTrigger)lenis.on('scroll',ScrollTrigger.update);lenisTick=time=>lenis?.raf(time*1000);gsap.ticker.add(lenisTick);if(currentDialog?.open)lenis.stop();
    }
    motionContext=gsap.context(()=>{
      if(!introPlayed){
        // No opacity-zero first frame or preloader: all controls remain usable.
        gsap.timeline({defaults:{ease:'power3.out'}}).from($$('.hero-copy > *'),{y:18,duration:0.65,stagger:0.045,clearProps:'transform'},0).from('.hero-media',{y:14,duration:0.8,clearProps:'transform'},0);
        introPlayed=true;
      }
      if(ScrollTrigger)$$('[data-reveal], [data-reveal-heading]').forEach(el=>gsap.from(el,{y:24,opacity:0.65,duration:0.65,ease:'power3.out',clearProps:'transform,opacity',scrollTrigger:{trigger:el,start:'top 94%',once:true}}));
    });refresh();
  }
  function setupNavigation(){
    const links=$$('[data-nav][href^="#"]'),ids=[...new Set(links.map(a=>a.hash.slice(1)))],sections=ids.map(id=>document.getElementById(id)).filter(Boolean).sort((a,b)=>a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1),visible=new Map();
    const activate=id=>links.forEach(a=>{const active=a.hash===`#${id}`||(id==='about'&&a.hash==='#studio');a.classList.toggle('is-active',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
    if(sections.length)activate(sections[0].id);
    const observer=new IntersectionObserver(entries=>{entries.forEach(e=>visible.set(e.target.id,e.isIntersecting));const active=sections.find(s=>visible.get(s.id));if(active)activate(active.id);},{rootMargin:'-15% 0px -50% 0px',threshold:0});
    sections.forEach(s=>observer.observe(s));observers.push(observer);
    listen(document,'click',e=>{
      const anchor=e.target.closest('a[href^="#"]');if(!anchor||e.defaultPrevented||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
      const id=anchor.getAttribute('href').slice(1),target=id?document.getElementById(id):document.body;if(!target)return;e.preventDefault();
      const offset=parseFloat(getComputedStyle(target).scrollMarginTop)||88;
      // Mobile tabs are destination changes: land immediately, even while images decode.
      const immediately=instant(e)||!desktop.matches;
      if(lenis)lenis.scrollTo(target,{offset:-offset,immediate:instant(e),force:true});
      else window.scrollTo({top:Math.max(0,target.getBoundingClientRect().top+window.scrollY-offset),behavior:immediately?'instant':'smooth'});
      if(id){if(location.hash!==`#${id}`)history.pushState(null,'',`#${id}`);activate(id);}
      if(e.detail===0){if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
    });
  }
  function init(){
    lifecycle=new AbortController();document.documentElement.classList.add('js-ready');
    $$('[data-booking]').forEach(b=>listen(b,'click',e=>{e.preventDefault();configureBooking(b.dataset.booking);openDialog($('#booking-dialog'),b,instant(e));}));
    $$('[data-format]').forEach(b=>listen(b,'click',()=>configureBooking(b.dataset.format)));
    setupInlineGalleries();
    $$('dialog').forEach(dialog=>{
      let backdropDown=false;listen(dialog,'pointerdown',e=>{backdropDown=e.target===dialog;});
      listen(dialog,'click',e=>{
        if(e.target.closest('[data-close-dialog]'))dialog.close();
        else if(backdropDown&&e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}
        backdropDown=false;
      });
      listen(dialog,'close',()=>afterClose(dialog));
    });
    swipe($('[data-sheet-handle]'),d=>{if(d===-1)$('#booking-dialog')?.close();},{vertical:true});
    setupNavigation();setupMotion();listen(reduced,'change',()=>{for(const entry of inlineGalleries.values())settleInlineGallery(entry);setupMotion();});listen(desktop,'change',setupMotion);
    // Every image has reserved geometry. Refreshing on each lazy image load can
    // interrupt a browser-native anchor scroll, so only fonts/content changes refresh.
    document.fonts?.ready.then(()=>{if(!lifecycle.signal.aborted)refresh();});
    listen(document,'visibilitychange',()=>{if(document.hidden)lenis?.stop();else if(!currentDialog?.open)lenis?.start();});
  }
  function cleanup(){
    if(currentDialog?.open){const dialog=currentDialog;dialog.close();afterClose(dialog);}
    for(const entry of inlineGalleries.values())settleInlineGallery(entry);inlineGalleries.clear();
    lifecycle?.abort();observers.forEach(o=>o.disconnect());observers=[];destroyMotion(true);if(refreshFrame)cancelAnimationFrame(refreshFrame);refreshFrame=0;
  }
  init();window.addEventListener('pagehide',cleanup);window.addEventListener('pageshow',e=>{if(e.persisted)init();});
})();
