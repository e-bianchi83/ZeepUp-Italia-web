(function(){
  const track=document.getElementById('occasionTrack');
  const prev=document.getElementById('occasionPrev');
  const next=document.getElementById('occasionNext');
  const current=document.getElementById('occasionCurrent');
  let index=0;
  function render(){ track.style.transform='translateX(-'+(index*100)+'%)'; current.textContent=index+1; }
  prev.addEventListener('click',function(){ index=(index+1)%2; render(); });
  next.addEventListener('click',function(){ index=(index+1)%2; render(); });
})();

(function(){
  const mapNode=document.getElementById('shopsMap');
  const shops=Array.isArray(window.ZEEPUP_SHOPS)?window.ZEEPUP_SHOPS:[];
  if(!mapNode||!window.L||!shops.length)return;

  const safe=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const map=L.map(mapNode,{zoomControl:false,scrollWheelZoom:false,minZoom:10,maxZoom:18}).setView([45.4668,9.1905],12);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{
    maxZoom:19,
    attribution:'&copy; OpenStreetMap contributors &copy; CARTO'
  }).addTo(map);
  L.control.zoom({position:'bottomright'}).addTo(map);
  map.on('focus',()=>map.scrollWheelZoom.enable());
  map.on('blur',()=>map.scrollWheelZoom.disable());

  const markerLayer=L.featureGroup().addTo(map);
  const filter=document.getElementById('mapNeighbourhood');
  const count=document.getElementById('mapVisibleCount');
  const areas=[...new Set(shops.map(shop=>shop.neighbourhood))].sort((a,b)=>a.localeCompare(b,'it'));
  areas.forEach(area=>{
    const option=document.createElement('option');
    option.value=area;
    option.textContent=area;
    filter.appendChild(option);
  });

  function preview(shop){
    return '<div class="shop-preview">'+
      '<img src="'+safe(shop.image)+'" alt="">'+
      '<div><strong>'+safe(shop.name)+'</strong><span>'+safe(shop.neighbourhood)+' · '+safe(shop.price)+'</span><small>'+safe(shop.category)+'<br>'+safe(shop.address)+', Milano</small></div></div>';
  }

  function render(area){
    markerLayer.clearLayers();
    const visible=shops.filter(shop=>area==='all'||shop.neighbourhood===area);
    visible.forEach(shop=>{
      const marker=L.circleMarker([shop.lat,shop.lng],{radius:8,color:'#fff',weight:3,fillColor:'#ff0066',fillOpacity:1,opacity:1,className:'restaurant-pin'});
      marker.on('mouseover',function(){this.setRadius(11);});
      marker.on('mouseout',function(){this.setRadius(8);});
      marker.bindTooltip(preview(shop),{direction:'top',offset:[0,-8],opacity:1,className:'shop-tooltip'});
      marker.bindPopup(preview(shop),{closeButton:false,className:'shop-popup',maxWidth:280});
      marker.addTo(markerLayer);
    });
    count.textContent=visible.length;
    if(visible.length){map.fitBounds(markerLayer.getBounds(),{padding:[42,42],maxZoom:area==='all'?12:14});}
  }

  filter.addEventListener('change',()=>render(filter.value));
  render('all');
  setTimeout(()=>map.invalidateSize(),120);
})();

(function(){
  const modal=document.getElementById('mapPreviewModal');
  const openButtons=document.querySelectorAll('[data-map-modal-open]');
  const closeButton=modal&&modal.querySelector('[data-map-modal-close]');
  const dialog=modal&&modal.querySelector('.map-preview-dialog');
  const mapNode=document.getElementById('mapPreviewMap');
  if(!modal||!openButtons.length||!closeButton||!dialog||!mapNode)return;

  let previewMap=null;
  let lastFocus=null;

  function markerIcon(kind,icon){
    return L.divIcon({
      className:'map-preview-marker',
      html:'<span class="map-preview-pin '+kind+'"><span class="material-symbols-outlined" aria-hidden="true">'+icon+'</span></span>',
      iconSize:[42,46],
      iconAnchor:[21,42]
    });
  }

  function initPreviewMap(){
    if(previewMap||!window.L)return;
    previewMap=L.map(mapNode,{zoomControl:false,scrollWheelZoom:false,minZoom:11,maxZoom:17,attributionControl:false}).setView([45.4668,9.1905],13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',{maxZoom:19}).addTo(previewMap);

    const shops=Array.isArray(window.ZEEPUP_SHOPS)?window.ZEEPUP_SHOPS:[];
    const points=shops.length?shops.slice(0,5):[
      {lat:45.4748,lng:9.1842,name:'Chef Alessandra'},
      {lat:45.4703,lng:9.1997,name:'HomeChef Maria'},
      {lat:45.4616,lng:9.1812,name:'Ravioli vicino a te'},
      {lat:45.4574,lng:9.2033,name:'Green Z'},
      {lat:45.4652,lng:9.1911,name:'ZeepUp'}
    ];
    const styles=[['pink','soup_kitchen'],['white','home'],['pink','storefront'],['green','eco'],['pink','restaurant']];
    points.forEach(function(point,index){
      const style=styles[index%styles.length];
      L.marker([point.lat,point.lng],{icon:markerIcon(style[0],style[1]),keyboard:true,title:point.name||'ZeepUp'}).addTo(previewMap);
    });
  }

  function openModal(event){
    event.preventDefault();
    lastFocus=document.activeElement;
    modal.hidden=false;
    document.body.classList.add('map-modal-open');
    requestAnimationFrame(function(){
      modal.classList.add('is-open');
      initPreviewMap();
      setTimeout(function(){if(previewMap)previewMap.invalidateSize();},80);
      closeButton.focus();
    });
  }

  function closeModal(){
    modal.classList.remove('is-open');
    document.body.classList.remove('map-modal-open');
    setTimeout(function(){
      modal.hidden=true;
      if(lastFocus)lastFocus.focus();
    },180);
  }

  openButtons.forEach(function(button){button.addEventListener('click',openModal);});
  closeButton.addEventListener('click',closeModal);
  modal.addEventListener('click',function(event){if(event.target===modal)closeModal();});
  document.addEventListener('keydown',function(event){
    if(modal.hidden)return;
    if(event.key==='Escape')closeModal();
    if(event.key==='Tab'){
      const focusable=dialog.querySelectorAll('button,[href],select,textarea,input:not([disabled]),[tabindex]:not([tabindex="-1"])');
      if(!focusable.length)return;
      const first=focusable[0];
      const last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  });
})();
