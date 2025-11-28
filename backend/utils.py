import rasterio
import numpy as np
import pandas as pd
import io
from typing import List, Tuple, Dict, Any

from sklearn.metrics import confusion_matrix
from rasterio.enums import Resampling

def read_raster_file(file_bytes: bytes, max_pixels: int = 1000000) -> Tuple[np.ndarray, Dict[str, Any]]:
    """
    Reads a GeoTIFF file from bytes and returns the array and profile.
    Automatically downsamples if the image has more than max_pixels.
    """
    with rasterio.MemoryFile(file_bytes) as memfile:
        with memfile.open() as dataset:
            height = dataset.height
            width = dataset.width
            
            # Calculate decimation factor
            num_pixels = height * width
            if num_pixels > max_pixels:
                scale = (max_pixels / num_pixels) ** 0.5
                new_height = int(height * scale)
                new_width = int(width * scale)
                
                data = dataset.read(
                    1,
                    out_shape=(new_height, new_width),
                    resampling=Resampling.nearest
                )
                # Update profile to reflect new dimensions (optional, but good practice)
                profile = dataset.profile.copy()
                profile.update(height=new_height, width=new_width)
            else:
                data = dataset.read(1)
                profile = dataset.profile
                
            return data, profile

def read_csv_file(file_bytes: bytes) -> pd.DataFrame:
    """
    Reads a CSV file from bytes.
    """
    return pd.read_csv(io.BytesIO(file_bytes))

def compute_transition_matrix(t1_array: np.ndarray, t2_array: np.ndarray) -> Dict[str, Any]:
    """
    Computes the transition matrix between two raster arrays.
    Uses sklearn confusion_matrix for O(N) performance.
    """
    # Flatten arrays
    f1 = t1_array.flatten()
    f2 = t2_array.flatten()
    
    # Filter out nodata (assuming nodata is negative or specific value, here we just take valid intersection)
    # For simplicity, we assume classes are integers >= 0
    valid_mask = (f1 >= 0) & (f2 >= 0)
    f1 = f1[valid_mask]
    f2 = f2[valid_mask]
    
    # Get unique classes
    classes = np.unique(np.concatenate((f1, f2)))
    classes.sort()
    
    # Compute confusion matrix (counts)
    # labels parameter ensures we get a square matrix even if some classes are missing in one year
    matrix = confusion_matrix(f1, f2, labels=classes)
            
    # Normalize to probabilities
    row_sums = matrix.sum(axis=1)
    # Avoid division by zero
    row_sums[row_sums == 0] = 1
    prob_matrix = matrix / row_sums[:, np.newaxis]
    
    return {
        "matrix": prob_matrix.tolist(),
        "classes": classes.tolist(),
        "counts": matrix.tolist()
    }

def prepare_regression_data(df: pd.DataFrame) -> Dict[str, List]:
    """
    Extracts years and values from a dataframe.
    Assumes columns like 'Year'/'Date' and 'Value'/'Area'.
    """
    # Simple heuristic to find year and value columns
    cols = df.columns.str.lower()
    
    year_col = next((c for c in df.columns if 'year' in c.lower() or 'date' in c.lower()), df.columns[0])
    value_col = next((c for c in df.columns if 'value' in c.lower() or 'area' in c.lower() or 'pop' in c.lower()), df.columns[1])
    
    return {
        "years": df[year_col].tolist(),
        "values": df[value_col].tolist()
    }
