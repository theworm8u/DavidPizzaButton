const STORAGE_KEY = "pizzaButtonGoogleApiKey";

const config = {
  SEARCH_RADIUS_METERS: 5000,
  MIN_RATING_PREFERRED: 4.0
};

const elements = {
  button: document.getElementById("pizzaButton"),
  status: document.getElementById("status"),
  result: document.getElementById("result"),
  placeName: document.getElementById("placeName"),
  placeMeta: document.getElementById("placeMeta"),
  placeAddress: document.getElementById("placeAddress"),
  placeLink: document.getElementById("placeLink"),
  googleKey: document.getElementById("googleKey"),
  saveSettings: document.getElementById("saveSettings"),
  clearSettings: document.getElementById("clearSettings")
};

elements.googleKey.value = localStorage.getItem(STORAGE_KEY) || "";

elements.saveSettings.addEventListener("click", () => {
  localStorage.setItem(STORAGE_KEY, elements.googleKey.value.trim());
  setStatus("Google API key saved on this device.");
});

elements.clearSettings.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  elements.googleKey.value = "";
  setStatus("Google API key cleared.");
});

elements.button.addEventListener("click", async () => {
  setLoading(true);
  hideResult();

  try {
    const apiKey = elements.googleKey.value.trim() || localStorage.getItem(STORAGE_KEY);
    if (!apiKey) {
      throw new Error("Open Settings and paste your Google Maps JavaScript API key first.");
    }

    setStatus("Asking this device for location permission…");
    const coords = await getBrowserLocation();

    setStatus("Looking for nearby pizza restaurants…");
    await loadGoogleMaps(apiKey);
    const places = await searchNearbyPizza(coords);

    if (!places.length) {
      setStatus("No pizza restaurants found nearby.");
      return;
    }

    const selected = chooseBestPlace(places, coords);
    showPlace(selected, coords);
    setStatus("Done. Pizza found.");
  } catch (error) {
    console.error(error);
    setStatus(error.message || "Something went wrong.");
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

function hideResult() {
  elements.result.classList.add("hidden");
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
      () => reject(new Error("Location permission was denied or unavailable.")),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  });
}

function loadGoogleMaps(apiKey) {
  if (window.google?.maps?.places) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const params = new URLSearchParams({ key: apiKey, libraries: "places" });

    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Google Maps failed to load. Check your API key and allowed referrers."));
    document.head.appendChild(script);
  });
}

function searchNearbyPizza(coords) {
  return new Promise((resolve, reject) => {
    const serviceHost = document.getElementById("placesServiceHost");
    const service = new google.maps.places.PlacesService(serviceHost);

    service.nearbySearch(
      {
        location: new google.maps.LatLng(coords.latitude, coords.longitude),
        radius: config.SEARCH_RADIUS_METERS,
        keyword: "pizza",
        type: "restaurant"
      },
      (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
          return;
        }

        if (status !== google.maps.places.PlacesServiceStatus.OK) {
          reject(new Error(`Google Places search failed: ${status}`));
          return;
        }

        resolve(results || []);
      }
    );
  });
}

function chooseBestPlace(places, coords) {
  return places
    .map((place) => {
      const placeLat = place.geometry?.location?.lat?.();
      const placeLng = place.geometry?.location?.lng?.();
      const distanceMeters = placeLat && placeLng
        ? haversineMeters(coords.latitude, coords.longitude, placeLat, placeLng)
        : Number.POSITIVE_INFINITY;

      return {
        ...place,
        distanceMeters,
        score: scorePlace(place.rating || 0, place.user_ratings_total || 0, distanceMeters)
      };
    })
    .sort((a, b) => {
      const aPreferred = (a.rating || 0) >= config.MIN_RATING_PREFERRED;
      const bPreferred = (b.rating || 0) >= config.MIN_RATING_PREFERRED;

      if (aPreferred !== bPreferred) return aPreferred ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
      return a.distanceMeters - b.distanceMeters;
    })[0];
}

function scorePlace(rating, reviewCount, distanceMeters) {
  // POC scoring:
  // rating matters most, review count adds confidence, distance slightly penalizes far-away places.
  const reviewBoost = Math.min(Math.log10(Math.max(reviewCount, 1)), 3) * 0.15;
  const distancePenalty = Math.min(distanceMeters / 1000, 10) * 0.08;
  return rating + reviewBoost - distancePenalty;
}

function showPlace(place, coords) {
  const distanceMiles = Number.isFinite(place.distanceMeters)
    ? (place.distanceMeters / 1609.344).toFixed(1)
    : "unknown";

  elements.placeName.textContent = place.name || "Pizza restaurant";
  elements.placeMeta.textContent = `Rating: ${place.rating || "N/A"} ⭐ • Reviews: ${place.user_ratings_total || "N/A"} • Distance: ${distanceMiles} mi`;
  elements.placeAddress.textContent = place.vicinity || "Address unavailable";
  elements.placeLink.href = place.place_id
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name || "pizza")}&query_place_id=${place.place_id}`
    : `https://www.google.com/maps/search/pizza/@${coords.latitude},${coords.longitude},14z`;

  elements.result.classList.remove("hidden");
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
