from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import numpy as np
import json

# Import modules
from utils import read_raster_file, read_csv_file, compute_transition_matrix, prepare_regression_data
from markov import run_markov
from regression import run_regression
from arima import run_arima
# from logistic import run_logistic
# from random_forest import run_random_forest

app = FastAPI(title="Land Use Trend & Target Analyzer", version="2.0")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Land Use Trend & Target Analyzer API v2 is running"}

# --- Helper Endpoints for Auto-Generation ---

@app.post("/process/markov-inputs")
async def process_markov_inputs(file_t1: UploadFile = File(...), file_t2: UploadFile = File(...)):
    try:
        t1_data, _ = read_raster_file(await file_t1.read())
        t2_data, _ = read_raster_file(await file_t2.read())
        
        if t1_data.shape != t2_data.shape:
            return {"status": "error", "message": "Raster dimensions do not match."}
            
        result = compute_transition_matrix(t1_data, t2_data)
        return {"status": "success", "data": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/process/csv-data")
async def process_csv_data(file: UploadFile = File(...)):
    try:
        df = read_csv_file(await file.read())
        data = prepare_regression_data(df)
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- Main Model Endpoints (Updated) ---

class MarkovInput(BaseModel):
    matrix: List[List[float]]
    years_diff: int

@app.post("/trend/markov")
async def api_markov(data: MarkovInput):
    return run_markov(data.matrix, data.years_diff)

class RegressionInput(BaseModel):
    years: List[int]
    values: List[float]
    type: str
    periods: Optional[int] = 5

@app.post("/trend/regression")
async def api_regression(data: RegressionInput):
    return run_regression(data.years, data.values, data.type, data.periods)

class ArimaInput(BaseModel):
    data: List[float]
    periods: int

@app.post("/trend/arima")
async def api_arima(data: ArimaInput):
    return run_arima(data.data, data.periods)

# --- Spatial ML Endpoints (Direct File Upload) ---

@app.post("/trend/logistic-spatial")
async def api_logistic_spatial(
    drivers: List[UploadFile] = File(...),
    change_map: UploadFile = File(...)
):
    try:
        # Read Change Map
        y_data, _ = read_raster_file(await change_map.read())
        y_flat = y_data.flatten()
        
        # Read Drivers
        X_list = []
        for driver in drivers:
            d_data, _ = read_raster_file(await driver.read())
            if d_data.shape != y_data.shape:
                return {"status": "error", "message": f"Driver {driver.filename} dimension mismatch."}
            X_list.append(d_data.flatten())
            
        X_stack = np.column_stack(X_list)
        
        # Sampling for performance (limit to 10000 pixels for prototype)
        if len(y_flat) > 10000:
            indices = np.random.choice(len(y_flat), 10000, replace=False)
            X_sample = X_stack[indices]
            y_sample = y_flat[indices]
        else:
            X_sample = X_stack
            y_sample = y_flat

        from logistic import run_logistic
        # Reuse existing logic but with sampled data
        return run_logistic(X_sample.tolist(), y_sample.tolist())
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/trend/randomforest-spatial")
async def api_randomforest_spatial(
    drivers: List[UploadFile] = File(...),
    labels: UploadFile = File(...)
):
    try:
        # Read Labels
        y_data, _ = read_raster_file(await labels.read())
        y_flat = y_data.flatten()
        
        # Read Drivers
        X_list = []
        for driver in drivers:
            d_data, _ = read_raster_file(await driver.read())
            if d_data.shape != y_data.shape:
                return {"status": "error", "message": f"Driver {driver.filename} dimension mismatch."}
            X_list.append(d_data.flatten())
            
        X_stack = np.column_stack(X_list)
        
        # Sampling
        if len(y_flat) > 10000:
            indices = np.random.choice(len(y_flat), 10000, replace=False)
            X_sample = X_stack[indices]
            y_sample = y_flat[indices]
        else:
            X_sample = X_stack
            y_sample = y_flat

        from random_forest import run_random_forest
        return run_random_forest(X_sample.tolist(), y_sample.tolist())

    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
