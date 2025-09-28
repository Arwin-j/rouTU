// Initialize the map
const map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [-75.1550, 39.9811],
    zoom: 16,
    pitch: 60,
    bearing: -20,
});

map.addControl(new maplibregl.NavigationControl());

// Define Class Locations
const classLocations = [
    { name: "CS101 - Engineering Hall", coords: [-75.1535, 39.9822] },
    { name: "MATH202 - Science Center", coords: [-75.1570, 39.9805] },
    { name: "HIST150 - Humanities Bldg", coords: [-75.1545, 39.9790] },
    { name: "BIO111 - Life Sciences", coords: [-75.1510, 39.9808] },
];

let routeLayerId = null;

// Plan Route Button
document.getElementById('route-btn').addEventListener('click', () => {
    const selector = document.getElementById('class-selector');
    const index = selector.value;
    if (index === "") return;

    const cls = classLocations[index];
    const start = [-75.1550, 39.9811];
    const end = cls.coords;

    // Create a new route if it doesn't exist
    if (routeLayerId) {
        map.removeLayer(routeLayerId);
        map.removeSource(routeLayerId);
    }

    const route = new maplibregl.GeoJSONSource({
        type: 'geojson',
        data: {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [start, end]
            }
        }
    });

    map.addSource(routeLayerId = 'route', route);
    map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        paint: {
            'line-color': '#9E1B34',
            'line-width': 4
        }
    });

    map.fitBounds([start, end], { padding: 50 });
});

// Add Custom Building Button
document.getElementById('add-building-btn').addEventListener('click', () => {
    const name = document.getElementById('building-name').value.trim();
    const lat = parseFloat(document.getElementById('building-lat').value);
    const lng = parseFloat(document.getElementById('building-lng').value);

    if (!name || isNaN(lat) || isNaN(lng)) {
        alert("Please enter valid name, latitude, and longitude.");
        return;
    }

    const newBuilding = { name, coords: [lng, lat] };

    // Check if the building is on campus (or valid)
    if (!isBuildingOnCampus(lat, lng)) {
        document.getElementById('error-popup').classList.remove('hidden');
        setTimeout(() => {
            document.getElementById('error-popup').classList.add('hidden');
        }, 3000);
        return;
    }

    const marker = new maplibregl.Marker({ color: '#007BFF' })
        .setLngLat([lng, lat])
        .setPopup(new maplibregl.Popup().setHTML(`<strong>${name}</strong>`))
        .addTo(map);

    classLocations.push(newBuilding);

    // Update Class Selector Dropdown
    const option = document.createElement('option');
    option.value = classLocations.length - 1;
    option.textContent = name;
    document.getElementById('class-selector').appendChild(option);
});

// Function to check if the building is on campus
function isBuildingOnCampus(lat, lng) {
    // Define campus boundary
    const campusBounds = [[-75.162, 39.978], [-75.150, 39.985]]; // Example
    return lat >= campusBounds[0][1] && lat <= campusBounds[1][1] && 
           lng >= campusBounds[0][0] && lng <= campusBounds[1][0];
}

// Class Schedule Router: Handle form submissions for schedule processing
document.getElementById('scheduleForm').addEventListener('submit', async function(event) {
    event.preventDefault(); // Prevent default form submission

    const form = event.target;
    const formData = new FormData();
    const loadingIndicator = document.getElementById('loadingIndicator');
    const resultsDiv = document.getElementById('results');

    loadingIndicator.style.display = 'inline';
    resultsDiv.innerHTML = '<p>Processing your schedule...</p>';

    let inputType;
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
        const response = await fetch('/process_schedule', {
            method: 'POST',
            body: formData // FormData handles file uploads and text
        });

        const data = await response.json();

        if (data.success) {
            resultsDiv.innerHTML = ''; // Clear previous results
            if (data.classes.length > 0) {
                data.classes.forEach((cls, index) => { // Added index here
                    resultsDiv.innerHTML += `
                        <div class="class-item">
                            <strong>${cls.class_name}</strong><br>
                            Days: ${cls.days ? cls.days.join(', ') : 'N/A'}<br>
                            Time: ${cls.start_time} - ${cls.end_time}<br>
                            Location: ${cls.full_address} (<a href="${cls.map_link}" target="_blank">View on Map</a>)<br>
                            <button class="get-route-btn"
                                    data-class-name="${cls.class_name}"
                                    data-start-time="${cls.start_time}"
                                    data-end-time="${cls.end_time}"
                                    data-location="${cls.full_address}"
                                    data-index="${index}">Get Route</button>
                            <div class="route-display" id="route-${index}"></div>
                        </div>
                    `;
                });

                // Attach event listeners to the new buttons AFTER they are added to the DOM
                document.querySelectorAll('.get-route-btn').forEach(button => {
                    button.addEventListener('click', async function() {
                        const className = this.dataset.className;
                        const startTime = this.dataset.startTime;
                        const endTime = this.dataset.endTime;
                        const location = this.dataset.location;
                        const classIndex = this.dataset.index;
                        const routeDisplayDiv = document.getElementById(`route-${classIndex}`);

                        routeDisplayDiv.innerHTML = '<p>Getting route...</p>';

                        try {
                            const routeResponse = await fetch('/get_route', { // New endpoint for routing
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    class_name: className,
                                    start_time: startTime,
                                    end_time: endTime,
                                    destination: location // Use 'destination' for clarity
                                }),
                            });

                            const routeData = await routeResponse.json();

                            if (routeData.success) {
                                routeDisplayDiv.innerHTML = `<p><strong>Route for ${className}:</strong></p><p>${routeData.route_description}</p>`;
                                if (routeData.map_embed_html) {
                                    routeDisplayDiv.innerHTML += routeData.map_embed_html;
                                } else if (routeData.map_link) {
                                    routeDisplayDiv.innerHTML += `<p><a href="${routeData.map_link}" target="_blank">View Detailed Map</a></p>`;
                                }
                            } else {
                                routeDisplayDiv.innerHTML = `<p style="color: red;">Error getting route: ${routeData.error || 'Unknown error'}</p>`;
                            }
                        } catch (routeError) {
                            console.error('Route fetch error:', routeError);
                            routeDisplayDiv.innerHTML = `<p style="color: red;">Network error while getting route: ${routeError.message}</p>`;
                        }
                    });
                });

            } else {
                resultsDiv.innerHTML = '<p>No classes found in the provided schedule.</p>';
            }
        } else {
            resultsDiv.innerHTML = `<p style="color: red;">Error: ${data.error || 'Something went wrong.'}</p>`;
        }
    } catch (error) {
        console.error('Fetch error:', error);
        resultsDiv.innerHTML = `<p style="color: red;">Network error or server issue: ${error.message}</p>`;
    } finally {
        loadingIndicator.style.display = 'none';
    }
});
