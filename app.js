(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = matchMedia('(min-width: 900px) and (pointer: fine)');
  const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  const state = { hero: 0, heroView: 'frame', room: 0, roomView: 'space', event: 'workshop' };
  const heights = { 'window-lounge':1559, 'portrait-curtains':1351, cyclorama:1200, 'hero-blazer':1201, 'kids-corner':1200, 'kids-detail':1149, 'kids-pink':1350, 'hero-gold':1958, 'workshop-windows':1200, 'workshop-artist':1201, 'events-table':1260, disco:1350, 'couple-maternity':1329, 'family-white':1351 };
  const heroPairs = [
    { name:'Панорамные окна', space:'window-lounge', frame:'portrait-curtains', spaceAlt:'Локация White Studio с панорамными окнами, светлыми шторами и диваном', frameAlt:'Портрет девушки у светлых штор в White Studio', spaceCaption:'Свет, который меняется вместе с днём.', frameCaption:'То же пространство. Ваша история.' },
    { name:'Циклорама · 36 м²', space:'cyclorama', frame:'hero-blazer', spaceAlt:'Просторная белая циклорама White Studio', frameAlt:'Fashion-портрет на белой циклораме White Studio', spaceCaption:'Чистый фон. Полная свобода.', frameCaption:'Когда всё внимание — на вас.' }
  ];
  const rooms = [
    { name:'Циклорама', description:'36 м² чистого пространства. Белый фон без видимых границ для портретов, fashion-съёмок и ваших экспериментов.', note:'36 м² · белый фон', space:'cyclorama', frame:'hero-blazer', spaceLabel:'Пространство', frameLabel:'В кадре', spaceAlt:'Белая циклорама площадью 36 квадратных метров в White Studio', frameAlt:'Fashion-съёмка девушки на белой циклораме' },
    { name:'Панорамные окна', description:'Мягкий дневной свет, светлые ткани и уютный диван. Локация для спокойных портретов, семейных историй и праздничных съёмок.', note:'Дневной свет · сезонный декор', space:'window-lounge', frame:'portrait-curtains', spaceLabel:'Пространство', frameLabel:'В кадре', spaceAlt:'Панорамные окна, диван и праздничный декор White Studio', frameAlt:'Девушка в белом платье у штор White Studio' },
    { name:'Детская локация', description:'Мягкие фактуры, тёплые детали и уютный уголок для самых маленьких. Здесь легко быть собой и играть, пока появляются живые кадры.', note:'Мягкие фактуры · уютные детали', space:'kids-corner', frame:'kids-detail', spaceLabel:'Пространство', frameLabel:'Детали', spaceAlt:'Детская локация с зелёными шторами, игрушками и мягкими подушками', frameAlt:'Детали детской локации: плед, подушки и мягкая игрушка' },
    { name:'Цветные фоны', description:'Бумажные фоны для другого настроения. От нежных детских портретов до выразительной fashion-съёмки — выбирайте цвет под свою идею.', note:'Цветные бумажные фоны', space:'kids-pink', frame:'hero-gold', spaceLabel:'Розовый фон', frameLabel:'Красный фон', spaceAlt:'Детский портрет на розовом бумажном фоне', frameAlt:'Fashion-портрет в золотом платье на красном фоне' }
  ];
  const events = {
    workshop:{ title:'Встречаться. Вдохновляться. Создавать.', copy:'Творческие мастер-классы в красивом пространстве. Собираемся за одним столом, пробуем новое и уносим с собой больше, чем готовую работу.', first:'workshop-windows', second:'workshop-artist', firstAlt:'Стол и мольберты для творческого мастер-класса у панорамных окон', secondAlt:'Участница творческого мастер-класса в White Studio' },
    party:{ title:'Ваши люди. Ваш особенный повод.', copy:'Стильный девичник, тёплая встреча или нестандартный проект. Обсудим вашу идею и вместе придумаем, как наполнить этот день впечатлениями.', first:'events-table', second:'disco', firstAlt:'Праздничная сервировка стола в White Studio', secondAlt:'Зеркальные диско-шары и солнечные блики в студии' },
    gender:{ title:'Моменты, которых так ждёте.', copy:'Гендер-пати и встречи в ожидании малыша. Пространство для близких, искренних эмоций и фотографий, к которым захочется возвращаться.', first:'couple-maternity', second:'family-white', firstAlt:'Фотосессия пары в ожидании малыша на светлом фоне', secondAlt:'Семейная фотография в White Studio' }
  };
  const booking = {
    'Съёмка':{ title:'Давайте запланируем съёмку.', note:'Позвоните нам: подберём локацию, обсудим вашу идею, свободное время и стоимость аренды.' },
    'Событие':{ title:'Давайте создадим событие.', note:'Расскажите о формате и количестве гостей. Обсудим детали, дату и стоимость вашего события.' },
    'Сертификат':{ title:'Подарите время для себя.', note:'Позвоните нам, чтобы выбрать подарочный сертификат и уточнить его стоимость и оформление.' }
  };
  let lifecycle, lenis, lenisTick, motionContext, currentDialog, returnFocus;
  let introPlayed=false, observers=[], swaps=new Map(), galleryItems=[], galleryIndex=0, refreshFrame=0;
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
  function cancelSwap(image){
    const previous=swaps.get(image);
    if(previous){previous.cancelled=true;previous.timeline?.kill();previous.clone?.remove();}
    gsap?.killTweensOf(image);
    image.style.removeProperty('transform');image.style.removeProperty('opacity');
    (image.closest('[data-image-stage]')||image.parentElement)?.removeAttribute('aria-busy');
    swaps.delete(image);
  }
  function clearImageError(stage){stage?.querySelector('[data-image-error]')?.remove();}
  function imageError(stage,retry){
    if(!stage)return;clearImageError(stage);
    const notice=document.createElement('button');notice.type='button';notice.dataset.imageError='';notice.setAttribute('role','status');
    notice.textContent='Фото не загрузилось. Повторить';
    Object.assign(notice.style,{position:'absolute',left:'16px',right:'16px',bottom:'16px',zIndex:'3',padding:'12px 16px',font:'inherit',fontSize:'13px',lineHeight:'1.4',color:'#28221e',background:'#faf8f3',border:'1px solid #d6cec4',borderRadius:'4px',cursor:'pointer'});
    listen(notice,'click',e=>{e.preventDefault();e.stopPropagation();retry(instant(e));});stage.append(notice);
  }
  // Decode before replacement: a slow connection never exposes a blank stage.
  async function setPhoto(image,name,alt,{immediate=false,direction=1}={}){
    if(!image)return;
    cancelSwap(image);
    const swap={cancelled:false,clone:null,timeline:null};swaps.set(image,swap);
    let source=path(name);const stage=image.closest('[data-image-stage]')||image.parentElement;
    clearImageError(stage);
    stage?.setAttribute('aria-busy','true');
    const preload=new Image();preload.src=source;
    try{await preload.decode();}catch{
      if(swap.cancelled)return;
      source=path(name,480);preload.src=source;
      try{await preload.decode();}catch{
        if(!swap.cancelled){stage?.removeAttribute('aria-busy');swaps.delete(image);imageError(stage,now=>setPhoto(image,name,alt,{immediate:now,direction}));}
        return;
      }
    }
    if(swap.cancelled||lifecycle.signal.aborted)return;
    const animate=gsap&&!reduced.matches&&!immediate&&image.getAttribute('src')!==source;
    if(animate){
      const computed=getComputedStyle(image), clone=image.cloneNode(false);
      clone.removeAttribute('id');clone.removeAttribute('fetchpriority');clone.alt='';clone.setAttribute('aria-hidden','true');clone.dataset.transitionClone='';
      Object.assign(clone.style,{position:'absolute',inset:'0',width:'100%',height:'100%',objectFit:computed.objectFit,objectPosition:computed.objectPosition,zIndex:'2',pointerEvents:'none',transform:'none',opacity:'1'});
      stage.append(clone);swap.clone=clone;
    }
    image.dataset.asset=name;image.src=source;
    if(source===path(name,480))image.removeAttribute('srcset');else image.srcset=`${path(name,480)} 480w, ${source} 900w`;
    image.alt=alt;image.width=900;image.height=heights[name]||1350;
    const opener=image.closest('[data-photo]');if(opener){opener.dataset.photo=path(name,1400);opener.dataset.caption=alt;}
    stage?.removeAttribute('aria-busy');
    if(animate){
      gsap.set(image,{xPercent:5*direction});
      swap.timeline=gsap.timeline({onComplete:()=>{swap.clone?.remove();image.style.removeProperty('transform');swaps.delete(image);}})
        .to(swap.clone,{xPercent:-100*direction,duration:0.38,ease:'power3.inOut'},0)
        .to(image,{xPercent:0,duration:0.38,ease:'power3.out'},0);
    }else swaps.delete(image);
    refresh();
  }
  function renderHero(immediate=false,direction=1){
    const pair=heroPairs[state.hero],view=state.heroView;
    press('[data-hero-view]','heroView',view);text('#hero-room',pair.name);
    text('#hero-counter',`${String(state.hero+1).padStart(2,'0')} / 02`);text('#hero-caption',view==='frame'?'В кадре':'Пространство');
    setPhoto($('#hero-image'),pair[view],pair[`${view}Alt`],{immediate,direction});
  }
  function renderRoom(immediate=false,direction=1){
    const room=rooms[state.room],view=state.roomView;
    press('[data-room]','room',state.room);press('[data-room-view]','roomView',view);
    text('#room-name',room.name);text('#room-description',room.description);text('#room-note',room.note);text('#room-count',`${String(state.room+1).padStart(2,'0')} / 04`);
    $$('[data-room-view]').forEach(b=>{b.textContent=room[`${b.dataset.roomView}Label`];});
    $('#room-stage')?.classList.toggle('is-gold',room[view]==='hero-gold');
    setPhoto($('#room-image'),room[view],room[`${view}Alt`],{immediate,direction});
  }
  function renderEvent(immediate=false){
    const event=events[state.event];press('[data-event]','event',state.event);text('#event-title',event.title);text('#event-copy',event.copy);
    setPhoto($('#event-image'),event.first,event.firstAlt,{immediate});setPhoto($('#event-second-image'),event.second,event.secondAlt,{immediate});
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
    if(gsap&&!reduced.matches&&!immediate)gsap.fromTo(dialog,{y:dialog.id==='booking-dialog'?24:8,opacity:0.7},{y:0,opacity:1,duration:0.24,ease:'power3.out',clearProps:'transform,opacity',overwrite:true});
  }
  function afterClose(dialog){
    gsap?.killTweensOf(dialog);dialog.style.removeProperty('transform');dialog.style.removeProperty('opacity');
    if(currentDialog!==dialog)return;currentDialog=null;
    document.body.style.overflow=savedBodyOverflow;document.documentElement.style.overflow=savedRootOverflow;lenis?.start();
    if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;
  }
  function renderGallery(){
    const item=galleryItems[galleryIndex],image=$('#gallery-image');if(!item||!image)return;
    image.src=item.dataset.photo;image.removeAttribute('srcset');image.alt=item.dataset.caption||$('img',item)?.alt||'Фотография White Studio';
    text('#gallery-caption',image.alt);text('#gallery-count',`${String(galleryIndex+1).padStart(2,'0')} / ${String(galleryItems.length).padStart(2,'0')}`);
    [$('#gallery-prev'),$('#gallery-next')].forEach(b=>{if(b)b.disabled=galleryItems.length<2;});
    $('#gallery-dialog')?.classList.toggle('is-gold',/hero-gold/.test(item.dataset.photo));
  }
  function stepGallery(direction){if(galleryItems.length<2)return;galleryIndex=(galleryIndex+direction+galleryItems.length)%galleryItems.length;renderGallery();}
  function destroyMotion(cancelPending=false){
    motionContext?.revert();motionContext=null;
    if(lenisTick&&gsap)gsap.ticker.remove(lenisTick);lenisTick=null;lenis?.destroy();lenis=null;
    for(const [image,swap] of [...swaps])if(cancelPending||swap.timeline)cancelSwap(image);
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
    $$('[data-hero-view]').forEach(b=>listen(b,'click',e=>{if(state.heroView===b.dataset.heroView)return;state.heroView=b.dataset.heroView;renderHero(instant(e));}));
    $$('[data-hero-step]').forEach(b=>listen(b,'click',e=>{const d=Number(b.dataset.heroStep);state.hero=(state.hero+d+heroPairs.length)%heroPairs.length;renderHero(instant(e),d);}));
    swipe($('#hero-stage'),d=>{state.hero=(state.hero+d+heroPairs.length)%heroPairs.length;renderHero(false,d);});
    $$('[data-room]').forEach(b=>listen(b,'click',e=>{const next=Number(b.dataset.room);if(state.room===next)return;const d=next>state.room?1:-1;state.room=next;state.roomView='space';renderRoom(instant(e),d);}));
    $$('[data-room-view]').forEach(b=>listen(b,'click',e=>{if(state.roomView===b.dataset.roomView)return;state.roomView=b.dataset.roomView;renderRoom(instant(e));}));
    $$('[data-room-prev], [data-room-next]').forEach(b=>listen(b,'click',e=>{const d=b.hasAttribute('data-room-prev')?-1:1;state.room=(state.room+d+rooms.length)%rooms.length;state.roomView='space';renderRoom(instant(e),d);}));
    swipe($('#room-stage'),d=>{state.room=(state.room+d+rooms.length)%rooms.length;state.roomView='space';renderRoom(false,d);});
    $$('[data-event]').forEach(b=>listen(b,'click',e=>{if(!events[b.dataset.event]||state.event===b.dataset.event)return;state.event=b.dataset.event;renderEvent(instant(e));}));
    $$('[data-booking]').forEach(b=>listen(b,'click',e=>{e.preventDefault();configureBooking(b.dataset.booking);openDialog($('#booking-dialog'),b,instant(e));}));
    $$('[data-format]').forEach(b=>listen(b,'click',()=>configureBooking(b.dataset.format)));
    $$('[data-photo]').forEach(b=>listen(b,'click',e=>{e.preventDefault();const group=b.dataset.gallery;galleryItems=group?$$('[data-photo]').filter(item=>item.dataset.gallery===group):[b];galleryIndex=galleryItems.indexOf(b);renderGallery();openDialog($('#gallery-dialog'),b,instant(e));}));
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
