const API_URL = "http://localhost:8000";

function switchModule(moduleName) {
    document.querySelectorAll('.module').forEach(el => el.classList.remove('active'));
    document.getElementById(`${moduleName}-module`).classList.add('active');
    document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
}

// --- File Processing ---

async function processMarkovFiles() {
    const t1File = document.getElementById('file-t1').files[0];
    const t2File = document.getElementById('file-t2').files[0];

    if (!t1File || !t2File) {
        alert("Please select both T1 and T2 raster files.");
        return;
    }

    const formData = new FormData();
    formData.append('file_t1', t1File);
    formData.append('file_t2', t2File);

    try {
        document.getElementById('markov-preview').innerText = "Processing rasters...";
        const response = await fetch(`${API_URL}/process/markov-inputs`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (result.status === 'success') {
            document.getElementById('markov-matrix').value = JSON.stringify(result.data.matrix);
            document.getElementById('markov-preview').innerText = `Success! Found ${result.data.classes.length} classes.`;
        } else {
            alert("Error: " + result.message);
        }
    } catch (e) {
        alert("Error processing files: " + e.message);
    }
}

async function processCSVFile() {
    const file = document.getElementById('file-csv').files[0];
    if (!file) {
        alert("Please select a CSV file.");
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`${API_URL}/process/csv-data`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();

        if (result.status === 'success') {
            document.getElementById('regression-years').value = result.data.years.join(', ');
            document.getElementById('regression-values').value = result.data.values.join(', ');
            alert("CSV Loaded Successfully!");
        } else {
            alert("Error: " + result.message);
        }
    } catch (e) {
        alert("Error processing CSV: " + e.message);
    }
}

// --- Model Execution ---

let currentChart = null;

async function runModel(modelType) {
    const statusMsg = document.getElementById('status-msg');
    statusMsg.textContent = `Running ${modelType}...`;
    statusMsg.style.color = 'blue';

    let endpoint = "";
    let payload = {};

    try {
        if (modelType === 'markov') {
            endpoint = "/trend/markov";
            const matrixStr = document.getElementById('markov-matrix').value;
            const years = document.getElementById('markov-years').value;
            if (!matrixStr) throw new Error("Transition Matrix is empty. Upload files or enter manually.");
            payload = {
                matrix: JSON.parse(matrixStr),
                years_diff: parseInt(years || 10)
            };
        } else if (modelType === 'regression') {
            endpoint = "/trend/regression";
            const yearsStr = document.getElementById('regression-years').value;
            const valuesStr = document.getElementById('regression-values').value;
            const type = document.getElementById('regression-type').value;
            const periods = document.getElementById('arima-periods').value; // Reuse input field
            if (!yearsStr || !valuesStr) throw new Error("Years or Values empty. Upload CSV or enter manually.");
            payload = {
                years: yearsStr.split(',').map(Number),
                values: valuesStr.split(',').map(Number),
                type: type,
                periods: parseInt(periods || 5)
            };
        } else if (modelType === 'arima') {
            endpoint = "/trend/arima";
            const valuesStr = document.getElementById('regression-values').value; // Reuse values from regression input
            const periods = document.getElementById('arima-periods').value;
            if (!valuesStr) throw new Error("Values empty. Upload CSV or enter manually.");
            payload = {
                data: valuesStr.split(',').map(Number),
                periods: parseInt(periods || 5)
            };
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        handleResult(result, modelType);

    } catch (error) {
        statusMsg.textContent = `Error: ${error.message}`;
        statusMsg.style.color = 'red';
    }
}

async function runSpatialModel(modelType) {
    const statusMsg = document.getElementById('status-msg');
    statusMsg.textContent = `Uploading & Running ${modelType} (Spatial)...`;
    statusMsg.style.color = 'blue';

    const drivers = document.getElementById('file-drivers').files;
    const changeMap = document.getElementById('file-change').files[0];

    if (drivers.length === 0 || !changeMap) {
        alert("Please upload Driver Rasters and a Change Map.");
        return;
    }

    const formData = new FormData();
    for (let i = 0; i < drivers.length; i++) {
        formData.append('drivers', drivers[i]);
    }
    formData.append('change_map', changeMap);

    try {
        const response = await fetch(`${API_URL}/trend/${modelType}-spatial`, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        handleResult(result, modelType);
    } catch (error) {
        statusMsg.textContent = `Error: ${error.message}`;
        statusMsg.style.color = 'red';
    }
}

function handleResult(result, modelType) {
    const statusMsg = document.getElementById('status-msg');
    if (result.status === 'success' || !result.status) {
        statusMsg.textContent = 'Success!';
        statusMsg.style.color = 'green';
        renderResults(modelType, result);
        openTab('viz');
    } else {
        statusMsg.textContent = `Error: ${result.message}`;
        statusMsg.style.color = 'red';
    }
}

function renderResults(modelType, data) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    const resultsText = document.getElementById('results-text');

    if (currentChart) currentChart.destroy();

    resultsText.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;

    if (modelType === 'regression') {
        // Combine historical and future data
        const labels = [...data.historical_years, ...data.future_years];

        // Pad data with nulls to align series
        const histData = [...data.historical_values, ...Array(data.future_years.length).fill(null)];
        const forecastData = [...Array(data.historical_years.length).fill(null), ...data.forecast];

        // Connect the last historical point to the first forecast point visually
        // by adding the last historical value as the start of the forecast
        forecastData[data.historical_years.length - 1] = data.historical_values[data.historical_values.length - 1];

        // Prepare CI data (padded)
        const upper = [...Array(data.historical_years.length).fill(null), ...data.conf_int.map(ci => ci[1])];
        const lower = [...Array(data.historical_years.length).fill(null), ...data.conf_int.map(ci => ci[0])];

        currentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Historical Data',
                        data: histData,
                        borderColor: '#333',
                        backgroundColor: '#333',
                        pointRadius: 4,
                        fill: false,
                        zIndex: 3
                    },
                    {
                        label: 'Forecast',
                        data: forecastData,
                        borderColor: '#0066CC',
                        borderDash: [5, 5], // Dashed line for forecast
                        fill: false,
                        zIndex: 2
                    },
                    {
                        label: 'Upper Bound (95%)',
                        data: upper,
                        borderColor: 'transparent',
                        backgroundColor: 'rgba(0, 102, 204, 0.2)',
                        fill: '+1',
                        pointRadius: 0
                    },
                    {
                        label: 'Lower Bound (95%)',
                        data: lower,
                        borderColor: 'transparent',
                        backgroundColor: 'rgba(0, 102, 204, 0.2)',
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                plugins: {
                    filler: { propagate: false },
                    title: { display: true, text: `Growth Rate: ${data.growth_rate.toFixed(2)}%` }
                }
            }
        });
    } else if (modelType === 'arima') {
        // Prepare Data
        const histLen = data.historical_data.length;
        const foreLen = data.forecast.length;

        // Labels: 1 to (hist + fore)
        const labels = Array.from({ length: histLen + foreLen }, (_, i) => i + 1);

        // Historical Data (padded with nulls for forecast part)
        const histData = [...data.historical_data, ...Array(foreLen).fill(null)];

        // Forecast Data (padded with nulls for historical part)
        const forecastData = [...Array(histLen).fill(null), ...data.forecast];

        // Connect visual gap
        forecastData[histLen - 1] = data.historical_data[histLen - 1];

        // CI Data (padded)
        const upper = [...Array(histLen).fill(null), ...data.conf_int.map(ci => ci[1])];
        const lower = [...Array(histLen).fill(null), ...data.conf_int.map(ci => ci[0])];

        currentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Historical Data',
                        data: histData,
                        borderColor: '#333',
                        backgroundColor: '#333',
                        pointRadius: 3,
                        fill: false,
                        zIndex: 3
                    },
                    {
                        label: 'Forecast',
                        data: forecastData,
                        borderColor: '#00AEEF',
                        borderDash: [5, 5],
                        fill: false,
                        zIndex: 2
                    },
                    {
                        label: 'Upper Bound (95%)',
                        data: upper,
                        borderColor: 'transparent',
                        backgroundColor: 'rgba(0, 174, 239, 0.2)',
                        fill: '+1',
                        pointRadius: 0
                    },
                    {
                        label: 'Lower Bound (95%)',
                        data: lower,
                        borderColor: 'transparent',
                        backgroundColor: 'rgba(0, 174, 239, 0.2)',
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                plugins: {
                    filler: { propagate: false }
                }
            }
        });
    } else if (modelType === 'markov') {
        // Render Heatmap Table for Markov
        const matrix = data.transition_matrix;
        const numClasses = matrix.length;

        let html = '<h4>Transition Probability Matrix</h4><table style="border-collapse: collapse; width: 100%; text-align: center;">';

        // Header
        html += '<tr><th>From \\ To</th>';
        for (let i = 0; i < numClasses; i++) html += `<th>Class ${i}</th>`;
        html += '</tr>';

        // Rows
        for (let i = 0; i < numClasses; i++) {
            html += `<tr><th>Class ${i}</th>`;
            for (let j = 0; j < numClasses; j++) {
                const val = matrix[i][j];
                const bg = `rgba(0, 102, 204, ${val})`; // Blue opacity based on value
                const color = val > 0.5 ? 'white' : 'black';
                html += `<td style="background-color: ${bg}; color: ${color}; padding: 10px; border: 1px solid #ddd;">${val.toFixed(3)}</td>`;
            }
            html += '</tr>';
        }
        html += '</table>';

        // Add Future Probability Matrix
        html += '<h4 style="margin-top:20px">Future Probability Matrix (P^n)</h4><table style="border-collapse: collapse; width: 100%; text-align: center;">';
        const futureMatrix = data.future_probability_matrix;
        html += '<tr><th>From \\ To</th>';
        for (let i = 0; i < numClasses; i++) html += `<th>Class ${i}</th>`;
        html += '</tr>';
        for (let i = 0; i < numClasses; i++) {
            html += `<tr><th>Class ${i}</th>`;
            for (let j = 0; j < numClasses; j++) {
                const val = futureMatrix[i][j];
                const bg = `rgba(0, 174, 239, ${val})`; // Lighter blue
                const color = val > 0.5 ? 'white' : 'black';
                html += `<td style="background-color: ${bg}; color: ${color}; padding: 10px; border: 1px solid #ddd;">${val.toFixed(3)}</td>`;
            }
            html += '</tr>';
        }
        html += '</table>';

        resultsText.innerHTML = html; // Override JSON dump

    } else if (modelType === 'logistic' || modelType === 'randomforest') {
        // For spatial, maybe show feature importance bar chart
        if (data.feature_importances || data.coefficients) {
            const labels = data.feature_importances ?
                data.feature_importances.map((_, i) => `Driver ${i + 1}`) :
                data.coefficients[0].map((_, i) => `Driver ${i + 1}`);

            const values = data.feature_importances || data.coefficients[0];

            currentChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Importance / Coefficient',
                        data: values,
                        backgroundColor: '#0066CC'
                    }]
                }
            });
        }
    }
}

function downloadResults() {
    alert("Download functionality placeholder.");
}
function downloadChart() {
    const link = document.createElement('a');
    link.download = 'chart.png';
    link.href = document.getElementById('mainChart').toDataURL();
    link.click();
}
