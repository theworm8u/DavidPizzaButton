const STORAGE_KEY="pizzaButtonGoogleApiKey";
const config={MIN_RATING_PREFERRED:4.0};
const $=id=>document.getElementById(id);
const el={button:$("pizzaButton"),status:$("status"),result:$("result"),fallback:$("fallback"),fallbackMessage:$("fallbackMessage"),fallbackLink:$("fallbackLink"),placeName:$("placeName"),placeMeta:$("placeMeta"),placeAddress:$("placeAddress"),placeLink:$("placeLink"),googleKey:$("googleKey"),saveSettings:$("saveSettings"),clearSettings:$("clearSettings")};

window.gm_authFailure=()=>setStatus("Google rejected the API key. Check referrer restrictions, API restrictions, billing, and enabled APIs.");
el.googleKey.value=localStorage.getItem(STORAGE_KEY)||"";

el.saveSettings.addEventListener("click",()=>{localStorage.setItem(STORAGE_KEY,el.googleKey.value.trim());setStatus("Google API key saved on this device.");});
el.clearSettings.addEventListener("click",()=>{localStorage.removeItem(STORAGE_KEY);el.googleKey.value="";setStatus("Google API key cleared.");});

el.button.addEventListener("click",async()=>{
  setLoading(true); hideCards();
  let coords=null;
  try{
    const apiKey=el.googleKey.value.trim()||localStorage.getItem(STORAGE_KEY);
    if(!apiKey) throw new Error("Open Settings and paste your Google Maps JavaScript API key first.");
    setStatus("Asking this device for location permission…");
    coords=await getBrowserLocation();
    setStatus("Looking for nearby pizza restaurants…");
    await loadGoogleMaps(apiKey);
    if(!window.google?.maps?.places?.PlacesService) throw new Error("Google loaded, but PlacesService is unavailable. Make sure Places API is enabled.");
    const places=await searchNearbyPizza(coords);
    if(!places.length){showFallback(coords,"No Google Places results came back nearby.");setStatus("No Places results returned, but you can open Google Maps search below.");return;}
    const selected=chooseBestPlace(places,coords);
    showPlace(selected,coords);
    setStatus("Done. Pizza found.");
  }catch(error){
    console.error(error);
    if(coords){showFallback(coords,error.message||"The app could not complete the Google Places search.");setStatus("Google Places failed, but you can open Google Maps search below.");}
    else setStatus(error.message||"Something went wrong.");
  }finally{setLoading(false);}
});

function setLoading(v){el.button.disabled=v;el.button.textContent=v?"Finding…":"Find Pizza";}
function setStatus(m){el.status.textContent=m;}
function hideCards(){el.result.classList.add("hidden");el.fallback.classList.add("hidden");}

function getBrowserLocation(){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject(new Error("This browser does not support geolocation."));return;}
    navigator.geolocation.getCurrentPosition(
      p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy_meters:Math.round(p.coords.accuracy||0)}),
      e=>{const m={1:"Location permission was denied. Allow location access and try again.",2:"Location is currently unavailable on this device.",3:"Location request timed out. Try again."};reject(new Error(m[e.code]||"Location permission was denied or unavailable."));},
      {enableHighAccuracy:true,timeout:15000,maximumAge:60000}
    );
  });
}

function loadGoogleMaps(apiKey){
  if(window.google?.maps?.places)return Promise.resolve();
  return new Promise((resolve,reject)=>{
    document.querySelector("script[data-google-maps-script]")?.remove();
    const callbackName="initPizzaButtonMaps";
    window[callbackName]=()=>resolve();
    const script=document.createElement("script");
    const params=new URLSearchParams({key:apiKey,loading:"async",libraries:"places",callback:callbackName});
    script.dataset.googleMapsScript="true";
    script.src=`https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async=true; script.defer=true;
    script.onerror=()=>reject(new Error("Google Maps failed to load. Check your API key, billing, and allowed referrers."));
    document.head.appendChild(script);
    setTimeout(()=>{if(!window.google?.maps)reject(new Error("Google Maps did not finish loading. Check API key restrictions and billing."));},12000);
  });
}

function searchNearbyPizza(coords){
  return new Promise((resolve,reject)=>{
    const map=new google.maps.Map($("mapHost"),{center:{lat:coords.latitude,lng:coords.longitude},zoom:14});
    const service=new google.maps.places.PlacesService(map);
    service.nearbySearch(
      {location:new google.maps.LatLng(coords.latitude,coords.longitude),rankBy:google.maps.places.RankBy.DISTANCE,keyword:"pizza restaurant"},
      (results,status)=>{
        if(status===google.maps.places.PlacesServiceStatus.ZERO_RESULTS){resolve([]);return;}
        if(status!==google.maps.places.PlacesServiceStatus.OK){reject(new Error(`Google Places search failed: ${status}`));return;}
        resolve((results||[]).filter(p=>p.business_status!=="CLOSED_PERMANENTLY"));
      }
    );
  });
}

function chooseBestPlace(places,coords){
  return places.map(place=>{
    const lat=place.geometry?.location?.lat?.(), lng=place.geometry?.location?.lng?.();
    const distanceMeters=lat&&lng?haversineMeters(coords.latitude,coords.longitude,lat,lng):Number.POSITIVE_INFINITY;
    return {...place,distanceMeters,score:scorePlace(place.rating||0,place.user_ratings_total||0,distanceMeters)};
  }).sort((a,b)=>{
    const ap=(a.rating||0)>=config.MIN_RATING_PREFERRED, bp=(b.rating||0)>=config.MIN_RATING_PREFERRED;
    if(ap!==bp)return ap?-1:1;
    if(b.score!==a.score)return b.score-a.score;
    return a.distanceMeters-b.distanceMeters;
  })[0];
}

function scorePlace(rating,reviews,distanceMeters){
  const reviewBoost=Math.min(Math.log10(Math.max(reviews,1)),3)*0.15;
  const distancePenalty=Math.min(distanceMeters/1000,10)*0.08;
  return rating+reviewBoost-distancePenalty;
}

function showPlace(place,coords){
  const miles=Number.isFinite(place.distanceMeters)?(place.distanceMeters/1609.344).toFixed(1):"unknown";
  el.placeName.textContent=place.name||"Pizza restaurant";
  el.placeMeta.textContent=`Rating: ${place.rating||"N/A"} ⭐ • Reviews: ${place.user_ratings_total||"N/A"} • Distance: ${miles} mi`;
  el.placeAddress.textContent=place.vicinity||"Address unavailable";
  el.placeLink.href=place.place_id?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name||"pizza")}&query_place_id=${place.place_id}`:googleMapsPizzaSearchUrl(coords);
  el.result.classList.remove("hidden");
}

function showFallback(coords,message){
  el.fallbackMessage.textContent=message;
  el.fallbackLink.href=googleMapsPizzaSearchUrl(coords);
  el.fallback.classList.remove("hidden");
}
function googleMapsPizzaSearchUrl(coords){return `https://www.google.com/maps/search/pizza+restaurant/@${coords.latitude},${coords.longitude},15z`;}
function haversineMeters(lat1,lon1,lat2,lon2){
  const r=6371000,toRad=d=>d*Math.PI/180,dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return r*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
