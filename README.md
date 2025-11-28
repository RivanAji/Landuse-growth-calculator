# Land Use Trend & Target Analyzer (v2.0)

## Overview
A modular web-based tool for analyzing land use trends using various statistical and machine learning models. Version 2.0 introduces direct file uploads for spatial (GeoTIFF) and tabular (CSV) data.

## Features
- **Trend-Oriented Planning**:
    - **Markov Chain**: Auto-calculate transition matrices from two GeoTIFFs.
    - **Regression & ARIMA**: Auto-load time series from CSV.
    - **Spatial ML**: Run Logistic Regression and Random Forest directly on uploaded Driver Rasters and Change Maps.
- **Target-Oriented Planning**: Coming Soon.

## Setup Instructions

### Prerequisites
- Python 3.8+
- GDAL (Required for `rasterio` and `geopandas`).
    - *Mac*: `brew install gdal`
    - *Windows*: Use `conda install gdal` or download wheels.

### Backend
1. Navigate to `landuse-webapp/backend`.
2. Create a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the server:
   ```bash
   uvicorn main:app --reload
   ```
   The API will be available at `http://localhost:8000`.

### Frontend
1. Navigate to `landuse-webapp/frontend`.
2. Open `index.html` in your browser.

## Usage Guide

### 1. Markov Chain Analysis
- Go to **Input Data**.
- Upload **LULC Map T1** and **LULC Map T2** (GeoTIFFs).
- Click **Auto-Generate Matrix**.
- Go to **Run Model** -> **Run Markov Chain**.

### 2. Regression / ARIMA
- Go to **Input Data**.
- Upload a **CSV file** with columns for Year and Value.
- Click **Load CSV Data**.
- Go to **Run Model** -> **Run Regression** or **Run ARIMA**.

### 3. Spatial Logistic / Random Forest
- Go to **Input Data**.
- Upload multiple **Driver Rasters** (GeoTIFFs).
- Upload a **Change Map** (GeoTIFF).
- Go to **Run Model** -> **Run Logistic (Spatial)**.

## Sample Data
You can create simple dummy GeoTIFFs using Python or QGIS to test the functionality.
