// Define Temple University main campus bounds (southwest and northeast corners)
const campusBounds = new maplibregl.LngLatBounds(
  [-75.162, 39.978], // Southwest corner (lng, lat)
  [-75.150, 39.985]  // Northeast corner (lng, lat)
);

// Initialize MapLibre GL map with restricted bounds and zoom limits
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://tiles.stadiamaps.com/styles/osm_bright.json', // OSM Bright: shows roads, names, details
  center: [-75.1520, 39.9817], // Temple University Philadelphia main campus
  zoom: 16,
  pitch: 0,
  bearing: 0,
  antialias: true,
  maxBounds: campusBounds, // Restrict panning to campus bounds
  minZoom: 15,             // Minimum zoom level
  maxZoom: 18              // Maximum zoom level
});

// Add navigation controls
map.addControl(new maplibregl.NavigationControl());

// Add markers for sample building locations
classLocations.forEach((loc) => {
  new maplibregl.Marker({ color: '#8A1538' })
    .setLngLat(loc.coords)
    .setPopup(new maplibregl.Popup().setHTML(`<strong>${loc.name}</strong>`))
    .addTo(map);
});

map.addControl(new maplibregl.NavigationControl());

// Initial class locations
const classLocations = [
  { name: "CS101 - Engineering Hall", coords: [-75.1535, 39.9822] },
  { name: "MATH202 - Science Center", coords: [-75.1570, 39.9805] },
  { name: "HIST150 - Humanities Bldg", coords: [-75.1545, 39.9790] },
  { name: "BIO111 - Life Sciences", coords: [-75.1510, 39.9808] },
];

// Populate class-selector dropdown initially
function refreshClassSelector() {
  const selector = document.getElementById('class-selector');
  selector.innerHTML = '<option value="">-- Select Class --</option>';
  classLocations.forEach((cls, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = cls.name;
    selector.appendChild(option);
  });
}
refreshClassSelector();

// Campus bounds check (simple rectangle)
function isBuildingOnCampus(lat, lng) {
  // campusBounds coordinates as [lat, lng]
  const campusBounds = [[39.978, -75.162], [39.985, -75.150]];
  return lat >= campusBounds[0][0] && lat <= campusBounds[1][0] &&
         lng >= campusBounds[0][1] && lng <= campusBounds[1][1];
}

// Add building button logic
document.getElementById('add-building-btn').addEventListener('click', () => {
  const name = document.getElementById('building-name').value.trim();
  const lat = parseFloat(document.getElementById('building-lat').value);
  const lng = parseFloat(document.getElementById('building-lng').value);

  if (!name || isNaN(lat) || isNaN(lng)) {
    alert("Please enter valid name, latitude, and longitude.");
    return;
  }

  if (!isBuildingOnCampus(lat, lng)) {
    const popup = document.getElementById('error-popup');
    popup.style.display = 'block';
    setTimeout(() => { popup.style.display = 'none'; }, 3000);
    return;
  }

  const newBuilding = { name, coords: [lng, lat] };

  // Add marker on map
  new maplibregl.Marker({ color: '#007BFF' })
    .setLngLat([lng, lat])
    .setPopup(new maplibregl.Popup().setHTML(`<strong>${name}</strong>`))
    .addTo(map);

  classLocations.push(newBuilding);
  refreshClassSelector();

  // Clear input fields
  document.getElementById('building-name').value = '';
  document.getElementById('building-lat').value = '';
  document.getElementById('building-lng').value = '';
});

// Current route source & layer id
let currentRouteId = null;

// Helper: Draw route on map given GeoJSON LineString
function drawRoute(routeGeoJSON) {
  if (currentRouteId) {
    if (map.getLayer(currentRouteId)) map.removeLayer(currentRouteId);
    if (map.getSource(currentRouteId)) map.removeSource(currentRouteId);
  }

  currentRouteId = 'route-layer';

  map.addSource(currentRouteId, {
    type: 'geojson',
    data: routeGeoJSON,
  });

  map.addLayer({
    id: currentRouteId,
    type: 'line',
    source: currentRouteId,
    layout: {
      'line-cap': 'round',
      'line-join': 'round'
    },
    paint: {
      'line-color': '#9E1B34',
      'line-width': 4
    }
  });
}

// Function to fetch route from OSRM public server (walking)
async function fetchRoute(start, end) {
  const coords = `${start[0]},${start[1]};${end[0]},${end[1]}`;
  const url = `https://router.project-osrm.org/route/v1/walking/${coords}?overview=full&geometries=geojson`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Routing API error');
  const data = await response.json();

  if (data.code !== "Ok" || !data.routes.length) {
    throw new Error('No route found');
  }

  return data.routes[0];
}

// Show route on map from campus start to selected class location
document.getElementById('route-btn').addEventListener('click', async () => {
  const selector = document.getElementById('class-selector');
  const index = selector.value;

  if (index === "") {
    alert('Please select a class first.');
    return;
  }

  const cls = classLocations[index];
  const start = [-75.1550, 39.9811]; // Fixed campus start point
  const end = cls.coords;

  try {
    const route = await fetchRoute(start, end);
    drawRoute(route.geometry);

    // Fit map to route bounds with padding
    const bounds = route.geometry.coordinates.reduce(
      (b, coord) => b.extend(coord),
      new maplibregl.LngLatBounds(route.geometry.coordinates[0], route.geometry.coordinates[0])
    );
    map.fitBounds(bounds, { padding: 50 });

  } catch (err) {
    alert('Failed to fetch route: ' + err.message);
    console.error(err);
  }
});

// Schedule form processing (supports text, image, audio uploads)
document.getElementById('scheduleForm').addEventListener('submit', async function(event) {
  event.preventDefault();

  const form = event.target;
  const loadingIndicator = document.getElementById('loadingIndicator');
  const resultsDiv = document.getElementById('results');

  loadingIndicator.style.display = 'inline';
  resultsDiv.innerHTML = '<p>Processing your schedule...</p>';

  let inputType;
  const formData = new FormData();

  if (form.elements['imageUpload'].files.length > 0) {
    inputType = 'image';
    formData.append('file', form.elements['imageUpload'].files[0]);
  } else if (form.elements['audioUpload'].files.length > 0) {
    inputType = 'audio';
    formData.append('file', form.elements['audioUpload'].files[0]);
  } else if (form.elements['textInput'].value.trim() !== '') {
    inputType = 'text';
    formData.append('text_input', form.elements['textInput'].value.trim());
  } else {
    alert('Please provide an image, audio, or text input.');
    loadingIndicator.style.display = 'none';
    resultsDiv.innerHTML = '<p>No input provided.</p>';
    return;
  }
  formData.append('type', inputType);

  try {
    // Replace '/process_schedule' with your backend API endpoint
    const response = await fetch('/process_schedule', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();

    if (data.success) {
      resultsDiv.innerHTML = '';

      if (data.classes.length > 0) {
        data.classes.forEach((cls, index) => {
          resultsDiv.innerHTML += `
            <div class="class-item">
              <strong>${cls.class_name}</strong><br/>
              Days: ${cls.days ? cls.days.join(', ') : 'N/A'}<br/>
              Time: ${cls.start_time} - ${cls.end_time}<br/>
              Location: ${cls.full_address} (<a href="${cls.map_link}" target="_blank">View on Map</a>)<br/>
              <button class="get-route-btn"
                      data-lat="${cls.latitude}"
                      data-lng="${cls.longitude}"
                      data-class-name="${cls.class_name}"
                      data-index="${index}">
                Show Route on Map
              </button>
              <div class="route-display" id="route-${index}"></div>
            </div>
          `;
        });

        // Attach event listeners to new route buttons
        document.querySelectorAll('.get-route-btn').forEach(button => {
          button.addEventListener('click', async function() {
            const lat = parseFloat(this.dataset.lat);
            const lng = parseFloat(this.dataset.lng);
            const className = this.dataset.className;
            const idx = this.dataset.index;
            const routeDiv = document.getElementById(`route-${idx}`);

            routeDiv.innerHTML = 'Getting route...';

            try {
              const start = [-75.1550, 39.9811]; // Fixed campus start
              const end = [lng, lat];

              const route = await fetchRoute(start, end);
              drawRoute(route.geometry);

              routeDiv.innerHTML = `<em>Route displayed on map for <strong>${className}</strong>.</em>`;

              // Fit map to route bounds
              const bounds = route.geometry.coordinates.reduce(
                (b, coord) => b.extend(coord),
                new maplibregl.LngLatBounds(route.geometry.coordinates[0], route.geometry.coordinates[0])
              );
              map.fitBounds(bounds, { padding: 50 });

            } catch (error) {
              routeDiv.innerHTML = `<span style="color:red;">Failed to get route: ${error.message}</span>`;
            }
          });
        });

      } else {
        resultsDiv.innerHTML = '<p>No classes found in the schedule.</p>';
      }

    } else {
      resultsDiv.innerHTML = `<p style="color:red;">${data.message || 'Failed to process schedule.'}</p>`;
    }
  } catch (error) {
    resultsDiv.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
  } finally {
    loadingIndicator.style.display = 'none';
  }
});
