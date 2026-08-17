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