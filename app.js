(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 900px) and (pointer: fine)');
  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  const galleries = window.WHITE_STUDIO_GALLERIES || {};
  const booking = {
    'Съёмка':{ title:'Давайте запланируем съёмку.', note:'Все локации находятся в одном зале. Позвоните нам — подберём время, обсудим вашу идею и стоимость аренды.' },
    'Событие':{ title:'Давайте создадим событие.', note:'Расскажите о формате и количестве гостей. Обсудим детали, дату и стоимость вашего события.' },
    'Сертификат':{ title:'Подарите время для себя.', note:'Позвоните нам, чтобы выбрать подарочный сертификат и уточнить его стоимость и оформление.' }
  };
  let lifecycle, lenis, lenisTick, motionContext, currentDialog, returnFocus;
  let introPlayed=false, observers=[], galleryItems=[], galleryIndex=0, galleryRequest=0, refreshFrame=0;
  let savedBodyOverflow='', savedRootOverflow='';
  const text=(s,value)=>{const el=$(s);if(el)el.textContent=value;};
  const instant=e=>reduced.matches||!!(e&&e.type==='click'&&e.detail===0)||!!(e&&e.type==='keydown');
  const listen=(target,type,handler,options={})=>target?.addEventListener(type,handler,{...options,signal:lifecycle.signal});
  const press=(s,key,value)=>$$(s).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset[key]===String(value))));
  const path=(name,size=900)=>`assets/images/${name}-${size}.webp`;

  function refresh(){
    if(!ScrollTrigger||refreshFrame)return;
    refreshFrame=requestAnimationFrame(()=>{refreshFrame=0;ScrollTrigger.refresh();lenis?.resize();});
  }
  function clearImageError(stage){stage?.querySelector('[data-image-error]')?.remove();}
  function imageError(stage,retry){
    if(!stage)return;clearImageError(stage);
    const notice=document.createElement('button');notice.type='button';notice.dataset.imageError='';notice.setAttribute('role','status');
    notice.textContent='Фото не загрузилось. Повторить';
    Object.assign(notice.style,{position:'absolute',left:'16px',right:'16px',bottom:'16px',zIndex:'3',padding:'12px 16px',font:'inherit',fontSize:'13px',lineHeight:'1.4',color:'#28221e',background:'#faf8f3',border:'1px solid #d6cec4',borderRadius:'4px',cursor:'pointer'});
    listen(notice,'click',e=>{e.preventDefault();e.stopPropagation();retry(instant(e));});stage.append(notice);
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
    if(dialog.id==='gallery-dialog')galleryRequest++;
    document.body.style.overflow=savedBodyOverflow;document.documentElement.style.overflow=savedRootOverflow;lenis?.start();
    if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;
  }
  function galleryPhoto(button){
    const name=button.dataset.photo?.match(/\/([^/]+)-(?:480|900|1400)\.webp$/)?.[1];
    if(!name)return null;
    return Object.values(galleries).flat().find(photo=>photo.name===name)||{name,alt:button.dataset.caption||$('img',button)?.alt||'Фотография White Studio'};
  }
  function buildGalleryThumbnails(){
    const strip=$('#gallery-thumbs');if(!strip)return;strip.replaceChildren();
    const fragment=document.createDocumentFragment();
    galleryItems.forEach((item,index)=>{
      const button=document.createElement('button'),thumb=document.createElement('img');
      button.type='button';button.className='gallery-thumb';button.dataset.galleryIndex=String(index);
      button.setAttribute('aria-label',`Фото ${index+1}: ${item.alt}`);
      thumb.src=path(item.name,480);thumb.alt='';thumb.width=item.width||480;thumb.height=item.height||640;thumb.loading='lazy';thumb.decoding='async';
      button.append(thumb);fragment.append(button);
    });
    strip.append(fragment);
  }
  function openGallery(group,trigger,immediate=false){
    const selected=trigger.hasAttribute('data-photo')?galleryPhoto(trigger):null;
    galleryItems=[...(galleries[group]||[])];
    if(!galleryItems.length)galleryItems=$$('[data-photo]').filter(item=>!group||item.dataset.gallery===group).map(galleryPhoto).filter(Boolean);
    if(selected&&!galleryItems.some(item=>item.name===selected.name))galleryItems.unshift(selected);
    if(!galleryItems.length)return;
    galleryIndex=selected?Math.max(0,galleryItems.findIndex(item=>item.name===selected.name)):0;
    buildGalleryThumbnails();openDialog($('#gallery-dialog'),trigger,immediate);renderGallery();
  }
  async function renderGallery(){
    const item=galleryItems[galleryIndex],image=$('#gallery-image');if(!item||!image)return;
    const request=++galleryRequest,stage=image.parentElement;stage.setAttribute('aria-busy','true');clearImageError(stage);
    text('#gallery-caption',item.alt);text('#gallery-count',`${String(galleryIndex+1).padStart(2,'0')} / ${String(galleryItems.length).padStart(2,'0')}`);
    [$('#gallery-prev'),$('#gallery-next')].forEach(b=>{if(b)b.disabled=galleryItems.length<2;});
    $$('#gallery-thumbs [data-gallery-index]').forEach(button=>{
      if(Number(button.dataset.galleryIndex)===galleryIndex){button.setAttribute('aria-current','true');button.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});}
      else button.removeAttribute('aria-current');
    });
    let source=path(item.name,1400);const preload=new Image();preload.src=source;
    try{await preload.decode();}catch{
      if(request!==galleryRequest)return;source=path(item.name,900);preload.src=source;
      try{await preload.decode();}catch{
        if(request===galleryRequest){stage.removeAttribute('aria-busy');imageError(stage,()=>renderGallery());}return;
      }
    }
    if(request!==galleryRequest||lifecycle.signal.aborted)return;
    image.src=source;image.removeAttribute('srcset');image.alt=item.alt;image.width=item.width||preload.naturalWidth;image.height=item.height||preload.naturalHeight;image.dataset.asset=item.name;
    stage.removeAttribute('aria-busy');
    $('#gallery-dialog')?.classList.toggle('is-gold',item.name==='hero-gold');
    $('#gallery-dialog')?.classList.toggle('is-gobo',item.name==='gobo-original');
  }
  function stepGallery(direction){if(galleryItems.length<2)return;galleryIndex=(galleryIndex+direction+galleryItems.length)%galleryItems.length;renderGallery();}
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
    $$('[data-gallery-count]').forEach(el=>{el.textContent=String(galleries[el.dataset.galleryCount]?.length||0);});
    $$('[data-photo]').forEach(b=>listen(b,'click',e=>{e.preventDefault();openGallery(b.dataset.gallery,b,instant(e));}));
    $$('[data-gallery-open]').forEach(b=>listen(b,'click',e=>{e.preventDefault();openGallery(b.dataset.galleryOpen,b,instant(e));}));
    listen($('#gallery-thumbs'),'click',e=>{const button=e.target.closest('[data-gallery-index]');if(!button)return;galleryIndex=Number(button.dataset.galleryIndex);renderGallery();});
    listen($('#gallery-prev'),'click',()=>stepGallery(-1));listen($('#gallery-next'),'click',()=>stepGallery(1));swipe($('#gallery-image'),d=>stepGallery(d));
    $$('dialog').forEach(dialog=>{
      let backdropDown=false;listen(dialog,'pointerdown',e=>{backdropDown=e.target===dialog;});
      listen(dialog,'click',e=>{
        if(e.target.closest('[data-close-dialog]'))dialog.close();
        else if(backdropDown&&e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}
        backdropDown=false;
      });
      listen(dialog,'close',()=>afterClose(dialog));
      listen(dialog,'keydown',e=>{if(dialog.id==='gallery-dialog'&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){e.preventDefault();stepGallery(e.key==='ArrowRight'?1:-1);}});
    });
    swipe($('[data-sheet-handle]'),d=>{if(d===-1)$('#booking-dialog')?.close();},{vertical:true});
    setupNavigation();setupMotion();listen(reduced,'change',setupMotion);listen(desktop,'change',setupMotion);
    // Every image has reserved geometry. Refreshing on each lazy image load can
    // interrupt a browser-native anchor scroll, so only fonts/content changes refresh.
    document.fonts?.ready.then(()=>{if(!lifecycle.signal.aborted)refresh();});
    listen(document,'visibilitychange',()=>{if(document.hidden)lenis?.stop();else if(!currentDialog?.open)lenis?.start();});
  }
  function cleanup(){
    if(currentDialog?.open){const dialog=currentDialog;dialog.close();afterClose(dialog);}
    lifecycle?.abort();observers.forEach(o=>o.disconnect());observers=[];destroyMotion(true);if(refreshFrame)cancelAnimationFrame(refreshFrame);refreshFrame=0;
  }
  init();window.addEventListener('pagehide',cleanup);window.addEventListener('pageshow',e=>{if(e.persisted)init();});
})();
