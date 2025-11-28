const API_URL = "https://landuse-growth-calculator.onrender.com";

// Initialize LiteGraph
var graph;
var canvas;

document.addEventListener("DOMContentLoaded", function () {
    if (typeof LiteGraph === "undefined") {
        alert("LiteGraph library not loaded. Please check your internet connection or file paths.");
        return;
    }

    graph = new LiteGraph.LGraph();
    canvas = new LiteGraph.LGraphCanvas("#workflow-canvas", graph);

    // Initial Resize
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Start loop
    graph.start();
});

// Adjust canvas size on resize
function resizeCanvas() {
    const container = document.querySelector('.main-content');
    if (container && canvas) {
        canvas.resize(container.clientWidth, container.clientHeight);
    }
}

// --- Custom Nodes ---

// 1. Input: Raster (T1/T2)
function InputRasterNode() {
    this.addOutput("T1 File", "image/tiff");
    this.addOutput("T2 File", "image/tiff");
    this.properties = { t1_name: "", t2_name: "" };
    this.size = [220, 100];
}

InputRasterNode.title = "Input: Raster Maps";
InputRasterNode.prototype.onDrawBackground = function (ctx) {
    if (this.flags.collapsed) return;
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.fillText("T1: " + (this.properties.t1_name || "No file"), 10, 40);
    ctx.fillText("T2: " + (this.properties.t2_name || "No file"), 10, 60);

    // Draw upload button area
    ctx.fillStyle = "#333";
    ctx.fillRect(10, 70, 200, 20);
    ctx.fillStyle = "#fff";
    ctx.fillText("Click to Upload (Select 2 Files)", 30, 85);
};

InputRasterNode.prototype.onMouseDown = function (e, pos) {
    if (pos[1] > 70 && pos[1] < 90) {
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.accept = ".tif,.tiff";
        input.onchange = (e) => {
            const files = e.target.files;
            if (files.length >= 2) {
                this.t1File = files[0];
                this.t2File = files[1];
                this.properties.t1_name = files[0].name;
                this.properties.t2_name = files[1].name;
                this.setDirtyCanvas(true);
            } else {
                alert("Please select at least 2 GeoTIFF files (T1 and T2).");
            }
        };
        input.click();
        return true;
    }
};
LiteGraph.registerNodeType("input/raster", InputRasterNode);


// 2. Input: CSV (Time Series)
function InputCSVNode() {
    this.addOutput("CSV Data", "object");
    this.properties = { filename: "" };
    this.size = [200, 60];
}

InputCSVNode.title = "Input: CSV Data";
InputCSVNode.prototype.onDrawBackground = function (ctx) {
    if (this.flags.collapsed) return;
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.fillText("File: " + (this.properties.filename || "No file"), 10, 30);

    ctx.fillStyle = "#333";
    ctx.fillRect(10, 35, 180, 20);
    ctx.fillStyle = "#fff";
    ctx.fillText("Click to Upload", 60, 50);
};

InputCSVNode.prototype.onMouseDown = function (e, pos) {
    if (pos[1] > 35 && pos[1] < 55) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".csv";
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.csvFile = file;
                this.properties.filename = file.name;
                this.setDirtyCanvas(true);
                this.processCSV(file);
            }
        };
        input.click();
        return true;
    }
};

InputCSVNode.prototype.processCSV = async function (file) {
    const formData = new FormData();
    formData.append('file', file);
    try {
        const response = await fetch(`${API_URL}/process/csv-data`, { method: 'POST', body: formData });
        const result = await response.json();
        if (result.status === 'success') {
            this.csvData = result.data; // { years: [], values: [] }
            // Trigger output update
            this.setOutputData(0, this.csvData);
        }
    } catch (e) { console.error(e); }
};
LiteGraph.registerNodeType("input/csv", InputCSVNode);


// 3. Process: Regression
function ProcessRegressionNode() {
    this.addInput("CSV Data", "object");
    this.addOutput("Forecast", "object");
    this.properties = { type: "linear", periods: 5 };
    this.addWidget("combo", "Type", "linear", (v) => { this.properties.type = v; }, { values: ["linear", "exponential"] });
    this.addWidget("number", "Periods", 5, (v) => { this.properties.periods = v; });
}

ProcessRegressionNode.title = "Process: Regression";
ProcessRegressionNode.prototype.onExecute = function () {
    const data = this.getInputData(0);
    if (data) {
        this.csvData = data;
    }
};
LiteGraph.registerNodeType("process/regression", ProcessRegressionNode);


// 4. Process: Markov Chain
function ProcessMarkovNode() {
    this.addInput("T1 Map", "image/tiff");
    this.addInput("T2 Map", "image/tiff");
    this.addOutput("Results", "object");
    this.properties = { years: 10 };
    this.addWidget("number", "Years", 10, (v) => { this.properties.years = v; });
}

ProcessMarkovNode.title = "Process: Markov Chain";
ProcessMarkovNode.prototype.onExecute = function () {
    // Check inputs
    const t1 = this.getInputData(0);
    const t2 = this.getInputData(1);
    // In this simplified flow, we might get file objects or just trigger signals
    // For now, we'll rely on the runGraph global function to pull data from connected InputRasterNode
};
LiteGraph.registerNodeType("process/markov", ProcessMarkovNode);


// 5. Process: ARIMA
function ProcessArimaNode() {
    this.addInput("CSV Data", "object");
    this.addOutput("Forecast", "object");
    this.properties = { periods: 5 };
    this.addWidget("number", "Periods", 5, (v) => { this.properties.periods = v; });
}
ProcessArimaNode.title = "Process: ARIMA";
LiteGraph.registerNodeType("process/arima", ProcessArimaNode);


// 6. Input: Spatial Drivers
function InputDriversNode() {
    this.addOutput("Drivers", "array");
    this.addOutput("Change Map", "image/tiff");
    this.properties = { driver_names: [], change_name: "" };
    this.size = [220, 120];
}

InputDriversNode.title = "Input: Spatial Drivers";
InputDriversNode.prototype.onDrawBackground = function (ctx) {
    if (this.flags.collapsed) return;
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.fillText("Drivers: " + (this.properties.driver_names.length + " files"), 10, 40);
    ctx.fillText("Change Map: " + (this.properties.change_name || "None"), 10, 60);

    ctx.fillStyle = "#333";
    ctx.fillRect(10, 70, 200, 20);
    ctx.fillStyle = "#fff";
    ctx.fillText("Upload Drivers", 60, 85);

    ctx.fillStyle = "#333";
    ctx.fillRect(10, 95, 200, 20);
    ctx.fillStyle = "#fff";
    ctx.fillText("Upload Change Map", 50, 110);
};

InputDriversNode.prototype.onMouseDown = function (e, pos) {
    if (pos[1] > 70 && pos[1] < 90) {
        // Upload Drivers
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.accept = ".tif,.tiff";
        input.onchange = (e) => {
            this.driverFiles = Array.from(e.target.files);
            this.properties.driver_names = this.driverFiles.map(f => f.name);
            this.setDirtyCanvas(true);
        };
        input.click();
        return true;
    } else if (pos[1] > 95 && pos[1] < 115) {
        // Upload Change Map
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".tif,.tiff";
        input.onchange = (e) => {
            this.changeFile = e.target.files[0];
            this.properties.change_name = this.changeFile.name;
            this.setDirtyCanvas(true);
        };
        input.click();
        return true;
    }
};
LiteGraph.registerNodeType("input/drivers", InputDriversNode);


// 7a. Process: Logistic Spatial
function ProcessLogisticNode() {
    this.addInput("Drivers", "array");
    this.addInput("Change Map", "image/tiff");
    this.addOutput("Probability Map", "object");
    this.properties = { model: "logistic" };
}
ProcessLogisticNode.title = "Process: Logistic";
ProcessLogisticNode.prototype.onExecute = function () {
    // Pass driver names from input to output for visualization
    const inputNode = this.getInputNode(0);
    if (inputNode && inputNode.properties.driver_names) {
        this.driverNames = inputNode.properties.driver_names;
    }
};
LiteGraph.registerNodeType("process/logistic", ProcessLogisticNode);

// 7b. Process: Random Forest Spatial
function ProcessRandomForestNode() {
    this.addInput("Drivers", "array");
    this.addInput("Change Map", "image/tiff");
    this.addOutput("Probability Map", "object");
    this.properties = { model: "randomforest" };
}
ProcessRandomForestNode.title = "Process: Random Forest";
ProcessRandomForestNode.prototype.onExecute = function () {
    const inputNode = this.getInputNode(0);
    if (inputNode && inputNode.properties.driver_names) {
        this.driverNames = inputNode.properties.driver_names;
    }
};
LiteGraph.registerNodeType("process/randomforest", ProcessRandomForestNode);


// 8. Output: Chart
function OutputChartNode() {
    this.addInput("Data", "object");
    this.size = [200, 100];
}

OutputChartNode.title = "Output: Chart Viz";
OutputChartNode.prototype.onDrawBackground = function (ctx) {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, this.size[0], this.size[1]);

    ctx.fillStyle = "#fff";
    ctx.fillText("Chart Visualization", 10, 20);

    if (this.lastData) {
        ctx.fillStyle = "#0f0";
        ctx.fillText("Data Ready", 10, 40);

        ctx.fillStyle = "#444";
        ctx.fillRect(10, 50, 180, 30);
        ctx.fillStyle = "#fff";
        ctx.fillText("Click to View", 60, 70);
    } else {
        ctx.fillStyle = "#f00";
        ctx.fillText("No Data", 10, 40);
    }
};

OutputChartNode.prototype.onMouseDown = function (e, pos) {
    if (this.lastData && pos[1] > 50 && pos[1] < 80) {
        // Pass driver names if available
        const inputNode = this.getInputNode(0);
        const driverNames = inputNode ? inputNode.driverNames : null;
        showChartModal(this.lastData, this.lastModelType, driverNames);
        return true;
    }
};

OutputChartNode.prototype.onExecute = function () {
    const data = this.getInputData(0);
    if (data) {
        this.lastData = data;
        // Try to infer model type from data structure if not explicitly passed
        if (data.transition_matrix) this.lastModelType = 'markov';
        else if (data.forecast) this.lastModelType = 'regression'; // or arima
        else if (data.coefficients || data.feature_importances) this.lastModelType = 'spatial';
    }
};
LiteGraph.registerNodeType("output/chart", OutputChartNode);


// 9. Output: Table
function OutputTableNode() {
    this.addInput("Data", "object");
    this.size = [200, 100];
}

OutputTableNode.title = "Output: Data Table";
OutputTableNode.prototype.onDrawBackground = function (ctx) {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, this.size[0], this.size[1]);

    ctx.fillStyle = "#fff";
    ctx.fillText("Table View", 10, 20);

    if (this.lastData) {
        ctx.fillStyle = "#0f0";
        ctx.fillText("Data Ready", 10, 40);

        ctx.fillStyle = "#444";
        ctx.fillRect(10, 50, 180, 30);
        ctx.fillStyle = "#fff";
        ctx.fillText("Click to View", 60, 70);
    } else {
        ctx.fillStyle = "#f00";
        ctx.fillText("No Data", 10, 40);
    }
};

OutputTableNode.prototype.onMouseDown = function (e, pos) {
    if (this.lastData && pos[1] > 50 && pos[1] < 80) {
        showTableModal(this.lastData, this.lastModelType);
        return true;
    }
};

OutputTableNode.prototype.onExecute = function () {
    const data = this.getInputData(0);
    if (data) {
        this.lastData = data;
        if (data.transition_matrix) this.lastModelType = 'markov';
        else if (data.forecast) this.lastModelType = 'regression';
        else if (data.coefficients || data.feature_importances) this.lastModelType = 'spatial';
    }
};
LiteGraph.registerNodeType("output/table", OutputTableNode);


// --- Global Run Logic ---
async function runGraph() {

    // A. Run Regression / ARIMA
    const regNodes = graph.findNodesByClass(ProcessRegressionNode);
    const arimaNodes = graph.findNodesByClass(ProcessArimaNode);
    const timeSeriesNodes = [...regNodes, ...arimaNodes];

    for (const node of timeSeriesNodes) {
        const inputNode = node.getInputNode(0);
        if (inputNode && inputNode.csvData) {
            const isArima = node.type === "process/arima";
            const endpoint = isArima ? "/trend/arima" : "/trend/regression";

            const payload = isArima ? {
                data: inputNode.csvData.values,
                periods: node.properties.periods
            } : {
                years: inputNode.csvData.years,
                values: inputNode.csvData.values,
                type: node.properties.type,
                periods: node.properties.periods
            };

            try {
                const response = await fetch(`${API_URL}${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                node.setOutputData(0, result);
                triggerOutputs(node, result);
                alert(`${isArima ? 'ARIMA' : 'Regression'} Complete!`);
            } catch (e) {
                console.error(e);
                alert("Error: " + e.message);
            }
        }
    }

    // B. Run Markov
    const markovNodes = graph.findNodesByClass(ProcessMarkovNode);
    for (const node of markovNodes) {
        // Find connected InputRasterNode
        // We assume InputRasterNode has t1File and t2File
        const inputNode = node.getInputNode(0); // T1 connection
        // Ideally check both inputs, but usually they come from same node or we find the node

        if (inputNode && inputNode.t1File && inputNode.t2File) {
            // 1. Process Files to get Matrix
            const formData = new FormData();
            formData.append('file_t1', inputNode.t1File);
            formData.append('file_t2', inputNode.t2File);

            try {
                // Step 1: Get Matrix
                const res1 = await fetch(`${API_URL}/process/markov-inputs`, { method: 'POST', body: formData });
                const data1 = await res1.json();

                if (data1.status === 'success') {
                    // Step 2: Run Markov Prediction
                    const payload = {
                        matrix: data1.data.matrix,
                        years_diff: node.properties.years
                    };
                    const res2 = await fetch(`${API_URL}/trend/markov`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const result = await res2.json();
                    node.setOutputData(0, result);
                    triggerOutputs(node, result);
                    alert("Markov Chain Complete!");
                } else {
                    alert("Error processing rasters: " + data1.message);
                }
            } catch (e) {
                console.error(e);
                alert("Error running Markov: " + e.message);
            }
        }
    }

    // C. Run Spatial (Logistic & Random Forest)
    const logisticNodes = graph.findNodesByClass(ProcessLogisticNode);
    const rfNodes = graph.findNodesByClass(ProcessRandomForestNode);
    const spatialNodes = [...logisticNodes, ...rfNodes];

    for (const node of spatialNodes) {
        // Find connected InputDriversNode
        // Drivers input is index 0
        const inputNode = node.getInputNode(0);

        if (inputNode && inputNode.driverFiles && inputNode.changeFile) {
            const isLogistic = node.type === "process/logistic";
            const endpoint = isLogistic ? "/trend/logistic-spatial" : "/trend/randomforest-spatial";

            const formData = new FormData();
            // Append drivers
            inputNode.driverFiles.forEach(file => {
                formData.append('drivers', file);
            });
            // Append change map
            formData.append('change_map', inputNode.changeFile);
            // Append labels if needed (for RF, the endpoint expects 'labels' key, for Logistic 'change_map')
            // Wait, checking backend... 
            // Logistic: drivers, change_map
            // RF: drivers, labels
            // Let's adjust based on backend signature
            if (!isLogistic) {
                formData.delete('change_map');
                formData.append('labels', inputNode.changeFile);
            }

            try {
                const response = await fetch(`${API_URL}${endpoint}`, {
                    method: 'POST',
                    body: formData
                });
                const result = await response.json();

                if (result.status === 'error') {
                    alert("Error: " + result.message);
                } else {
                    node.setOutputData(0, result);
                    // Pass driver names to output
                    node.driverNames = inputNode.properties.driver_names;
                    triggerOutputs(node, result);
                    alert(`${isLogistic ? 'Logistic' : 'Random Forest'} Complete!`);
                }
            } catch (e) {
                console.error(e);
                alert("Error running Spatial Model: " + e.message);
            }
        } else {
            console.log("Missing inputs for spatial node");
        }
    }

    graph.start();
}

function triggerOutputs(node, result) {
    const outputNodes = node.getOutputNodes(0);
    if (outputNodes) {
        outputNodes.forEach(outNode => {
            outNode.lastData = result;
            // If the output node is a chart, also pass the driver names from the processing node
            if (outNode.type === "output/chart" && node.driverNames) {
                outNode.driverNames = node.driverNames;
            }
            outNode.setDirtyCanvas(true);
        });
    }
}

// Helper to add nodes from sidebar
function addNode(type) {
    var node = LiteGraph.createNode(type);
    if (node) {
        node.pos = [200, 200];
        graph.add(node);
    } else {
        console.error("Unknown node type: " + type);
    }
}

// Helper for Chart Modal
function showChartModal(data, modelType, driverNames) {
    let modal = document.getElementById('chart-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'chart-modal';
        modal.style.position = 'fixed';
        modal.style.top = '10%';
        modal.style.left = '10%';
        modal.style.width = '80%';
        modal.style.height = '80%';
        modal.style.background = 'white';
        modal.style.border = '1px solid #ccc';
        modal.style.zIndex = '1000';
        modal.style.padding = '20px';
        modal.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
        modal.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <h3>Results</h3>
                <button onclick="document.getElementById('chart-modal').style.display='none'" style="padding:5px 10px; cursor:pointer;">Close</button>
            </div>
            <div id="modal-content" style="height: 90%; width: 100%; overflow: auto;">
                <canvas id="modal-canvas"></canvas>
                <div id="modal-html"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = 'block';

    const ctx = document.getElementById('modal-canvas').getContext('2d');
    const htmlContainer = document.getElementById('modal-html');

    // Reset
    if (window.modalChart) window.modalChart.destroy();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    htmlContainer.innerHTML = "";
    document.getElementById('modal-canvas').style.display = 'block';

    // Render based on type
    if (modelType === 'markov') {
        document.getElementById('modal-canvas').style.display = 'none';
        // Render Heatmap Table
        const matrix = data.transition_matrix;
        let html = '<h4>Transition Probability Matrix</h4><table border="1" style="width:100%; text-align:center; border-collapse:collapse;">';
        for (let row of matrix) {
            html += '<tr>';
            for (let val of row) {
                const bg = `rgba(0, 102, 204, ${val})`;
                const color = val > 0.5 ? 'white' : 'black';
                html += `<td style="background:${bg}; color:${color}; padding:8px;">${val.toFixed(3)}</td>`;
            }
            html += '</tr>';
        }
        html += '</table>';
        htmlContainer.innerHTML = html;

    } else if (modelType === 'regression' || modelType === 'arima' || data.forecast) {
        // ... (Existing Chart Logic) ...
        const labels = data.historical_years ? [...data.historical_years, ...data.future_years] :
            Array.from({ length: data.historical_data.length + data.forecast.length }, (_, i) => i + 1);

        const histValues = data.historical_values || data.historical_data;
        const histData = [...histValues, ...Array(data.forecast.length).fill(null)];
        const forecastData = [...Array(histValues.length).fill(null), ...data.forecast];
        forecastData[histValues.length - 1] = histValues[histValues.length - 1]; // Connect

        // Prepare Confidence Intervals
        let upperData = [];
        let lowerData = [];
        if (data.conf_int) {
            // Fill historical part with nulls
            upperData = Array(histValues.length).fill(null);
            lowerData = Array(histValues.length).fill(null);

            // Add forecast CI
            data.conf_int.forEach(ci => {
                lowerData.push(ci[0]);
                upperData.push(ci[1]);
            });

            // Connect to last historical point (optional, but looks better if CI starts from last point)
            // For simplicity, we start CI from the first forecast point
        }

        const datasets = [
            { label: 'Historical', data: histData, borderColor: '#333', fill: false },
            { label: 'Forecast', data: forecastData, borderColor: '#0066CC', borderDash: [5, 5], fill: false }
        ];

        if (data.conf_int) {
            datasets.push({
                label: 'Upper Bound (95%)',
                data: upperData,
                borderColor: 'rgba(0, 102, 204, 0.2)',
                backgroundColor: 'rgba(0, 102, 204, 0.1)',
                pointRadius: 0,
                fill: '+1' // Fill to next dataset (Lower Bound) - requires order adjustment or plugin
                // Simple approach: just fill to bottom or use a band
            });
            datasets.push({
                label: 'Lower Bound (95%)',
                data: lowerData,
                borderColor: 'rgba(0, 102, 204, 0.2)',
                backgroundColor: 'rgba(0, 102, 204, 0.1)',
                pointRadius: 0,
                fill: false
            });
            // Note: Chart.js filling between lines can be tricky without plugins. 
            // We'll use a simple transparent fill for now or just lines.
            // Let's try filling 'Upper' to 'Lower' if we order them correctly?
            // Actually, let's just show lines for clarity as requested "upper and lower bound"
        }

        window.modalChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    } else if (modelType === 'spatial') {
        // Render Feature Importance / Coefficients
        const values = data.feature_importances || data.coefficients[0];
        // Use driver names if available, else fallback
        const labels = driverNames && driverNames.length === values.length
            ? driverNames
            : values.map((_, i) => `Driver ${i + 1}`);

        window.modalChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: data.feature_importances ? 'Feature Importance' : 'Coefficient',
                    data: values,
                    backgroundColor: '#0066CC'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }
}

// Helper for Table Modal
function showTableModal(data, modelType) {
    let modal = document.getElementById('chart-modal');
    if (!modal) {
        // Create modal if not exists (same as chart modal)
        modal = document.createElement('div');
        modal.id = 'chart-modal';
        modal.style.position = 'fixed';
        modal.style.top = '10%';
        modal.style.left = '10%';
        modal.style.width = '80%';
        modal.style.height = '80%';
        modal.style.background = 'white';
        modal.style.border = '1px solid #ccc';
        modal.style.zIndex = '1000';
        modal.style.padding = '20px';
        modal.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
        modal.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                <h3>Results</h3>
                <button onclick="document.getElementById('chart-modal').style.display='none'" style="padding:5px 10px; cursor:pointer;">Close</button>
            </div>
            <div id="modal-content" style="height: 90%; width: 100%; overflow: auto;">
                <canvas id="modal-canvas" style="display:none;"></canvas>
                <div id="modal-html"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = 'block';

    const htmlContainer = document.getElementById('modal-html');
    document.getElementById('modal-canvas').style.display = 'none';

    // Render Table
    htmlContainer.innerHTML = `<pre style="background:#f4f4f4; padding:15px;">${JSON.stringify(data, null, 2)}</pre>`;
}

// --- Documentation Logic ---

const docsData = {
    'markov': `
        <h2>Markov Chain Analysis</h2>
        <p>A <strong>Markov Chain</strong> is a stochastic model describing a sequence of possible events in which the probability of each event depends only on the state attained in the previous event.</p>
        
        <h3>Mathematical Formulation</h3>
        <p>The core of the model is the <strong>Transition Probability Matrix ($P$)</strong>, where each element $P_{ij}$ represents the probability of moving from state $i$ (e.g., Agriculture) to state $j$ (e.g., Urban) in one time step.</p>
        <p>$$ P_{ij} = P(X_{t+1} = j | X_t = i) $$</p>
        <p>Future states are predicted using matrix multiplication:</p>
        <p>$$ \pi_{t+n} = \pi_t \times P^n $$</p>
        <ul>
            <li>$\pi_t$: State distribution vector at time $t$.</li>
            <li>$P^n$: Transition matrix raised to the power of $n$ steps.</li>
        </ul>

        <h3>Interpretation</h3>
        <p>The output is a <strong>Transition Matrix</strong> (heatmap). A high value (close to 1) on the diagonal means the land use is stable. A high off-diagonal value indicates a strong trend of conversion (e.g., Forest converting to Urban).</p>
    `,
    'regression': `
        <h2>Regression Analysis</h2>
        <p>Regression estimates the relationship between a dependent variable (e.g., Urban Area) and an independent variable (Time).</p>

        <h3>Linear Regression</h3>
        <p>Models a constant rate of change.</p>
        <p>$$ y = mx + c $$</p>
        <ul>
            <li>$y$: Predicted value (Area).</li>
            <li>$x$: Time (Year).</li>
            <li>$m$: Slope (Rate of change per year).</li>
            <li>$c$: Intercept (Base value).</li>
        </ul>

        <h3>Exponential Regression</h3>
        <p>Models growth that accelerates over time (compounding).</p>
        <p>$$ y = a \cdot e^{bx} $$</p>
        <p>Linearized as: $\ln(y) = \ln(a) + bx$</p>

        <h3>Confidence Intervals</h3>
        <p>The shaded area in the chart represents the <strong>95% Confidence Interval</strong>. It indicates that we are 95% confident the true future value will fall within this range, accounting for the uncertainty in the historical trend.</p>
    `,
    'arima': `
        <h2>ARIMA (AutoRegressive Integrated Moving Average)</h2>
        <p>ARIMA is a powerful statistical class of models for forecasting time series data that shows autocorrelation.</p>

        <h3>Components</h3>
        <ul>
            <li><strong>AR (p):</strong> AutoRegressive. Uses past values to predict future values.</li>
            <li><strong>I (d):</strong> Integrated. Differencing the raw observations to make the time series stationary.</li>
            <li><strong>MA (q):</strong> Moving Average. Uses past forecast errors to predict future values.</li>
        </ul>
        <p>$$ y'_t = c + \phi_1 y'_{t-1} + \dots + \phi_p y'_{t-p} + \theta_1 \epsilon_{t-1} + \dots + \theta_q \epsilon_{t-q} + \epsilon_t $$</p>

        <h3>Interpretation</h3>
        <p>ARIMA is better than simple regression for data with complex patterns, cycles, or shocks. The forecast includes <strong>Confidence Bounds</strong> (upper and lower limits) to show the range of probable outcomes.</p>
    `,
    'logistic': `
        <h2>Logistic Regression (Spatial)</h2>
        <p>Used to model the probability of a binary outcome (e.g., Change vs. No Change) based on spatial drivers.</p>

        <h3>Formula</h3>
        <p>The probability $P$ of change occurring is modeled using the logistic function:</p>
        <p>$$ \ln\left(\frac{P}{1-P}\right) = \beta_0 + \beta_1 X_1 + \beta_2 X_2 + \dots + \beta_n X_n $$</p>
        <p>$$ P = \frac{1}{1 + e^{-(\beta_0 + \sum \beta_i X_i)}} $$</p>
        <ul>
            <li>$P$: Probability of land use change.</li>
            <li>$X_i$: Spatial drivers (e.g., Distance to Road, Slope).</li>
            <li>$\beta_i$: Coefficients indicating the strength and direction of influence.</li>
        </ul>

        <h3>Interpretation</h3>
        <p><strong>Positive Coefficient:</strong> Higher driver value increases change probability (e.g., Population Density).</p>
        <p><strong>Negative Coefficient:</strong> Higher driver value decreases change probability (e.g., Distance to Road).</p>
    `,
    'randomforest': `
        <h2>Random Forest (Spatial)</h2>
        <p>An ensemble learning method that constructs a multitude of decision trees at training time.</p>

        <h3>Algorithm</h3>
        <p>It creates many decision trees on random subsets of the data and features. The final prediction is the average (probability) of the individual trees.</p>
        <ul>
            <li><strong>Bagging:</strong> Bootstrap Aggregating to reduce variance.</li>
            <li><strong>Feature Randomness:</strong> Random subset of features for each split.</li>
        </ul>

        <h3>Feature Importance</h3>
        <p>The model calculates how much each driver contributes to reducing the impurity (Gini or Entropy) across all trees. A higher <strong>Importance Score</strong> means the driver is more critical in determining where land use change occurs.</p>
    `
};

function showDocs(type) {
    const modal = document.getElementById('docs-modal');
    const content = document.getElementById('docs-content');
    if (docsData[type]) {
        content.innerHTML = docsData[type];
        modal.style.display = "block";
    }
}

function closeDocs() {
    document.getElementById('docs-modal').style.display = "none";
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('docs-modal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}
