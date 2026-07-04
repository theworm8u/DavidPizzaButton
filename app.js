const SEARCH_RADIUS_METERS = 5000;

const elements = {
  button: document.getElementById("pizzaButton"),
  status: document.getElementById("status"),
  result: document.getElementById("result"),
  fallback: document.getElementById("fallback"),
  placeName: document.getElementById("placeName"),
  placeMeta: document.getElementById("placeMeta"),
  placeAddress: document.getElementById("placeAddress"),
  osmLink: document.getElementById("osmLink"),
  googleLink: document.getElementById("googleLink"),
  fallbackGoogleLink: document.getElementById("fallbackGoogleLink")
};

elements.button.addEventListener("click", async () => {
  setLoading(true);
  hideCards();

  let coords = null;

  try {
    setStatus("Asking this device for location permission…");
    coords = await getBrowserLocation();

    setStatus("Searching OpenStreetMap for nearby pizza places…");
    const places = await searchOpenStreetMapPizza(coords);

    if (!places.length) {
      showFallback(coords);
      setStatus("No pizza places found in OpenStreetMap nearby.");
      return;
    }

    const closest = chooseClosestPlace(places, coords);
    showPlace(closest, coords);
    setStatus("Done. Closest pizza place found.");
  } catch (error) {
    console.error(error);

    if (coords) {
      showFallback(coords);
      setStatus(error.message || "Something went wrong, but you can still search Google Maps below.");
    } else {
      setStatus(error.message || "Something went wrong.");
    }
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  elements.button.disabled = isLoading;
  elements.button.textContent = isLoading ? "Finding…" : "Find Pizza";
}

function setStatus(message) {
  elements.status.textContent = message;
}

function hideCards() {
  elements.result.classList.add("hidden");
  elements.fallback.classList.add("hidden");
}

function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser does not support geolocation."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy_meters: Math.round(position.coords.accuracy || 0)
        });
      },
      (error) => {
        const messages = {
          1: "Location permission was denied. Allow location access and try again.",
          2: "Location is currently unavailable on this device.",
          3: "Location request timed out. Try again."
        };
        reject(new Error(messages[error.code] || "Location permission was denied or unavailable."));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
}

async function searchOpenStreetMapPizza(coords) {
  const query = `
    [out:json][timeout:25];
    (
      node["cuisine"~"pizza",i](around:${SEARCH_RADIUS_METERS},${coords.latitude},${coords.longitude});
      way["cuisine"~"pizza",i](around:${SEARCH_RADIUS_METERS},${coords.latitude},${coords.longitude});
      relation["cuisine"~"pizza",i](around:${SEARCH_RADIUS_METERS},${coords.latitude},${coords.longitude});
      node["name"~"pizza",i](around:${SEARCH_RADIUS_METERS},${coords.latitude},${coords.longitude});
      way["name"~"pizza",i](around:${SEARCH_RADIUS_METERS},${coords.latitude},${coords.longitude});
      relation["name"~"pizza",i](around:${SEARCH_RADIUS_METERS},${coords.latitude},${coords.longitude});
    );
    out center tags;
  `;

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: new URLSearchParams({ data: query }),
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" }
  });

  if (!response.ok) {
    throw new Error("OpenStreetMap search failed. Try again in a minute.");
  }

  const data = await response.json();
  return (data.elements || [])
    .map(normalizeOsmElement)
    .filter((place) => place.latitude && place.longitude && place.name);
}

function normalizeOsmElement(element) {
  const tags = element.tags || {};
  const latitude = element.lat || element.center?.lat;
  const longitude = element.lon || element.center?.lon;

  return {
    id: `${element.type}/${element.id}`,
    name: tags.name || "Pizza place",
    latitude,
    longitude,
    cuisine: tags.cuisine || "",
    amenity: tags.amenity || "",
    street: tags["addr:street"] || "",
    houseNumber: tags["addr:housenumber"] || "",
    city: tags["addr:city"] || "",
    state: tags["addr:state"] || "",
    postcode: tags["addr:postcode"] || "",
    website: tags.website || tags["contact:website"] || ""
  };
}

function chooseClosestPlace(places, coords) {
  return places
    .map((place) => ({
      ...place,
      distanceMeters: haversineMeters(coords.latitude, coords.longitude, place.latitude, place.longitude)
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)[0];
}

function showPlace(place, coords) {
  const distanceMiles = (place.distanceMeters / 1609.344).toFixed(1);
  const address = formatAddress(place);

  elements.placeName.textContent = place.name;
  elements.placeMeta.textContent = `Distance: ${distanceMiles} mi • Source: OpenStreetMap`;
  elements.placeAddress.textContent = address || "Address not listed in OpenStreetMap";
  elements.osmLink.href = `https://www.openstreetmap.org/${place.id}`;
  elements.googleLink.href = googleMapsPizzaSearchUrl(coords);

  elements.result.classList.remove("hidden");
}

function showFallback(coords) {
  elements.fallbackGoogleLink.href = googleMapsPizzaSearchUrl(coords);
  elements.fallback.classList.remove("hidden");
}

function googleMapsPizzaSearchUrl(coords) {
  return `https://www.google.com/maps/search/best+rated+pizza/@${coords.latitude},${coords.longitude},15z`;
}

function formatAddress(place) {
  const streetAddress = [place.houseNumber, place.street].filter(Boolean).join(" ");
  return [streetAddress, place.city, place.state, place.postcode].filter(Boolean).join(", ");
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const radius = 6371000;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
