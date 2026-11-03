'use strict';
// Presentation adapter: native selects remain the single source of form values/events.
(() => {
  const records=new Map();let sequence=0,opened=null,pending=false;
  const matches=()=>[...document.querySelectorAll('#briefForm select:not([multiple])')];
  const assign=(el,key,value)=>{if(el.getAttribute(key)!==String(value))el.setAttribute(key,String(value));};
  function labelFor(select){
    const label=select.labels?.[0];if(!label)return select.getAttribute('aria-label')||'Choose an option';
    const copy=label.cloneNode(true);copy.querySelectorAll('input,select,button,textarea,.studio-select,.studio-choice-pills,.value-origin,.hint,.field-error,.optional').forEach(e=>e.remove());
    return copy.textContent.trim().replace(/\s+/g,' ')||'Choose an option';
  }
  function key(select){return JSON.stringify([select.dataset.field,select.dataset.output,select.dataset.prop,select.dataset.staticOutput,select.dataset.staticPart,select.dataset.staticKey,select.id]);}
  function syncRecord(r){
    if(r.pills)return syncPills(r);
    const name=labelFor(r.select),value=r.select.selectedOptions[0]?.textContent||'Choose…';
    if(r.text.textContent!==value)r.text.textContent=value;
    r.trigger.disabled=r.select.disabled;r.trigger.title=value;
    assign(r.trigger,'aria-label',name+': '+value);assign(r.trigger,'aria-invalid',r.select.getAttribute('aria-invalid')==='true');
    const description=r.select.getAttribute('aria-describedby');if(description)assign(r.trigger,'aria-describedby',description);else r.trigger.removeAttribute('aria-describedby');
    r.name=name;
  }
  const usePills=select=>['objective','funnelStage'].includes(select.dataset.field);
  function syncPills(r){
    const name=labelFor(r.select);assign(r.pills,'aria-label',name);assign(r.pills,'aria-invalid',r.select.getAttribute('aria-invalid')==='true');assign(r.pills,'aria-required',r.select.required);
    const signature=JSON.stringify([...r.select.options].map(o=>[o.value,o.textContent,o.disabled]));
    if(r.signature!==signature){r.signature=signature;r.pills.replaceChildren();[...r.select.options].forEach((option,index)=>{
      if(!option.value&&r.select.required)return;
      const button=document.createElement('button');button.type='button';button.className='studio-choice-pill';button.dataset.index=index;button.setAttribute('role','radio');
      const tick=document.createElement('span');tick.className='choice-tick';tick.textContent='✓';tick.setAttribute('aria-hidden','true');button.append(tick,document.createTextNode(option.textContent));
      button.addEventListener('click',()=>choosePill(r,index));button.addEventListener('keydown',e=>{
        if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();const available=[...r.pills.children].filter(b=>!b.disabled),at=available.indexOf(button),next=e.key==='Home'?0:e.key==='End'?available.length-1:(at+(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1)+available.length)%available.length;choosePill(r,Number(available[next].dataset.index));
      });r.pills.append(button);
    });}
    let hasSelected=false;for(const button of r.pills.children){const selected=Number(button.dataset.index)===r.select.selectedIndex;assign(button,'aria-checked',selected);const disabled=r.select.disabled||r.select.options[button.dataset.index].disabled;if(button.disabled!==disabled)button.disabled=disabled;button.tabIndex=selected?0:-1;hasSelected ||= selected;}
    if(!hasSelected){const first=[...r.pills.children].find(b=>!b.disabled);if(first)first.tabIndex=0;}
  }
  function choosePill(r,index){
    const select=r.select;if(select.disabled||select.options[index]?.disabled)return;const identity=key(select),changed=select.selectedIndex!==index;select.selectedIndex=index;syncPills(r);
    if(changed){select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));}
    queueMicrotask(()=>{enhance();records.get(matches().find(s=>key(s)===identity))?.pills?.querySelector('[aria-checked=true]')?.focus({preventScroll:true});});
  }
  function enhance(){
    pending=false;
    for(const [select,r] of records)if(!select.isConnected){if(opened?.record===r)close(false);records.delete(select);}
    for(const select of matches()){
      if(records.has(select)){syncRecord(records.get(select));continue;}
      const wrapper=document.createElement('span');wrapper.className='studio-select';
      select.before(wrapper);wrapper.append(select);select.classList.add('studio-select-native');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
      if(usePills(select)){
        wrapper.classList.add('studio-choice');const pills=document.createElement('span');pills.className='studio-choice-pills';pills.setAttribute('role','radiogroup');wrapper.append(pills);const r={select,pills};records.set(select,r);syncPills(r);
        select.addEventListener('change',()=>syncPills(r));select.addEventListener('input',()=>syncPills(r));select.addEventListener('focus',()=>pills.querySelector('[tabindex="0"]')?.focus({preventScroll:true}));continue;
      }
      const trigger=document.createElement('button');trigger.type='button';trigger.className='studio-select-trigger';trigger.id='studio-select-'+(++sequence);trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
      const text=document.createElement('span');text.className='studio-select-value';trigger.append(text);
      const chevron=document.createElementNS('http://www.w3.org/2000/svg','svg');chevron.setAttribute('viewBox','0 0 20 20');chevron.setAttribute('aria-hidden','true');chevron.innerHTML='<path d="m5 7 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>';trigger.append(chevron);wrapper.append(trigger);
      const r={select,trigger,text};records.set(select,r);syncRecord(r);
      trigger.addEventListener('click',()=>opened?.record===r?close():open(r));
      trigger.addEventListener('keydown',e=>{
        if(opened?.record===r)return keyboard(e);
        if(['ArrowDown','ArrowUp','Enter',' '].includes(e.key)){e.preventDefault();open(r);}
        else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();open(r,e.key);}
      });
      select.addEventListener('change',()=>syncRecord(r));select.addEventListener('input',()=>syncRecord(r));
      select.addEventListener('focus',()=>trigger.focus({preventScroll:true}));
    }
  }
  function queue(){if(!pending){pending=true;queueMicrotask(enhance);}}
  function close(restore=true){
    if(!opened)return;const {record,menu,typeTimer}=opened;clearTimeout(typeTimer);opened=null;
    record.trigger.setAttribute('aria-expanded','false');record.trigger.removeAttribute('aria-controls');record.trigger.removeAttribute('aria-activedescendant');menu.remove();
    if(restore&&record.trigger.isConnected)record.trigger.focus({preventScroll:true});
  }
  function position(){
    if(!opened)return;const {record,menu}=opened;if(!record.trigger.isConnected||!record.trigger.getClientRects().length)return close(false);
    const rect=record.trigger.getBoundingClientRect(),width=Math.min(Math.max(rect.width,[...record.select.options].some(o=>o.textContent.length>32)?320:240),innerWidth-24),below=innerHeight-rect.bottom-12,above=rect.top-12;
    const up=below<200&&above>below,available=Math.max(100,up?above:below),height=Math.min(320,available);
    menu.style.width=width+'px';menu.style.maxHeight=height+'px';menu.style.left=Math.max(12,Math.min(rect.left,innerWidth-width-12))+'px';
    menu.style.top=(up?Math.max(12,rect.top-Math.min(menu.scrollHeight,height)-6):rect.bottom+6)+'px';
  }
  function setActive(index,scroll=true){
    const o=opened;if(!o)return;o.active=index;
    for(const row of o.list.querySelectorAll('[role=option]'))row.classList.toggle('is-active',Number(row.dataset.index)===index);
    const row=o.list.querySelector('[data-index="'+index+'"]');
    for(const target of [o.record.trigger,o.search].filter(Boolean)){if(row)target.setAttribute('aria-activedescendant',row.id);else target.removeAttribute('aria-activedescendant');}
    if(scroll)row?.scrollIntoView({block:'nearest'});
  }
  function renderOptions(query=''){
    const o=opened;if(!o)return;o.list.replaceChildren();o.visible=[];let previousGroup=null;
    [...o.record.select.options].forEach((option,index)=>{
      if(option.hidden||!option.textContent.toLowerCase().includes(query.toLowerCase()))return;
      const group=option.parentElement.tagName==='OPTGROUP'?option.parentElement:null,disabled=option.disabled||group?.disabled;
      if(group&&group!==previousGroup){const heading=document.createElement('div');heading.className='studio-select-group';heading.textContent=group.label;o.list.append(heading);}previousGroup=group;
      const row=document.createElement('div');row.className='studio-select-option';row.id=o.list.id+'-'+index;row.dataset.index=index;row.setAttribute('role','option');row.setAttribute('aria-selected',String(option.selected));row.setAttribute('aria-disabled',String(!!disabled));
      const text=document.createElement('span');text.textContent=option.textContent;row.append(text);const tick=document.createElement('span');tick.className='studio-select-check';tick.textContent=option.selected?'✓':'';tick.setAttribute('aria-hidden','true');row.append(tick);
      if(!disabled){o.visible.push(index);row.addEventListener('pointermove',()=>setActive(index,false));row.addEventListener('pointerdown',e=>e.preventDefault());row.addEventListener('click',()=>choose(index));}o.list.append(row);
    });
    if(!o.list.children.length){const empty=document.createElement('p');empty.className='studio-select-empty';empty.textContent='No matching options';empty.setAttribute('role','status');o.list.append(empty);}
    setActive(o.visible.includes(o.record.select.selectedIndex)?o.record.select.selectedIndex:o.visible[0],false);position();
  }
  function choose(index){
    const o=opened;if(!o||!o.visible.includes(index))return;const {select}=o.record,identity=key(select),changed=select.selectedIndex!==index;
    close(false);select.selectedIndex=index;syncRecord(o.record);
    if(changed){select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));}
    // Selection may redraw the format-dependent requirements synchronously.
    queueMicrotask(()=>{enhance();const current=matches().find(s=>key(s)===identity);records.get(current)?.trigger.focus({preventScroll:true});});
  }
  function keyboard(e){
    const o=opened;if(!o)return;
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();return close();}
    if(e.key==='Tab'){close();return;}
    if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
      e.preventDefault();const at=o.visible.indexOf(o.active),index=e.key==='Home'?0:e.key==='End'?o.visible.length-1:e.key==='ArrowDown'?Math.min(o.visible.length-1,at+1):Math.max(0,at-1);setActive(o.visible[index]);
    }else if(e.key==='Enter'||e.key===' '&&e.target!==o.search){e.preventDefault();choose(o.active);}
    else if(e.target!==o.search&&e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();if(o.search){o.search.value+=e.key;renderOptions(o.search.value);o.search.focus();}else{clearTimeout(o.typeTimer);o.typed=(o.typed||'')+e.key.toLowerCase();setActive(o.visible.find(i=>o.record.select.options[i].textContent.toLowerCase().startsWith(o.typed)));o.typeTimer=setTimeout(()=>o.typed='',700);}}
  }
  function open(record,typed=''){
    if(record.select.disabled)return;close(false);const menu=document.createElement('div');menu.className='studio-select-menu';menu.setAttribute('popover','manual');
    const list=document.createElement('div');list.className='studio-select-options';list.id=record.trigger.id+'-list';list.setAttribute('role','listbox');list.setAttribute('aria-label',record.name);
    let search;if(record.select.options.length>6){search=document.createElement('input');search.type='search';search.className='studio-select-search';search.placeholder='Type to find…';search.setAttribute('aria-label','Search '+record.name);search.setAttribute('role','combobox');search.setAttribute('aria-autocomplete','list');search.setAttribute('aria-expanded','true');search.setAttribute('aria-controls',list.id);search.value=typed;menu.append(search);search.addEventListener('input',()=>renderOptions(search.value));search.addEventListener('keydown',keyboard);}
    menu.append(list);document.body.append(menu);opened={record,menu,list,search,visible:[],active:-1};record.trigger.setAttribute('aria-expanded','true');record.trigger.setAttribute('aria-controls',list.id);
    if(menu.showPopover)menu.showPopover();else menu.removeAttribute('popover');renderOptions(search?.value||'');position();if(search)search.focus({preventScroll:true});else if(typed)keyboard({key:typed,target:record.trigger,preventDefault(){}});
  }
  document.addEventListener('pointerdown',e=>{if(opened&&!opened.menu.contains(e.target)&&!opened.record.trigger.contains(e.target))close(false);},true);
  document.addEventListener('focusin',e=>{if(opened&&!opened.menu.contains(e.target)&&e.target!==opened.record.trigger)close(false);});
  window.addEventListener('resize',()=>close());window.addEventListener('hashchange',()=>close(false));
  document.addEventListener('scroll',e=>{if(opened&&!opened.menu.contains(e.target))position();},true);
  new MutationObserver(changes=>{if(changes.some(c=>!c.target.closest?.('.studio-select-trigger,.studio-select-menu')))queue();}).observe(document.querySelector('#main'),{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','selected','aria-invalid']});
  enhance();
})();
