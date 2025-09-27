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