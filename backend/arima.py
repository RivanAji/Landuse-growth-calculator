import pmdarima as pm
import numpy as np

def run_arima(data, periods):
    """
    Computes ARIMA forecast.
    
    Args:
        data (list): Time series data.
        periods (int): Number of periods to forecast.
        
    Returns:
        dict: Forecast and confidence intervals.
    """
    try:
        model = pm.auto_arima(data, seasonal=False, error_action='ignore', suppress_warnings=True)
        
        forecast, conf_int = model.predict(n_periods=periods, return_conf_int=True)
        
        return {
            "historical_data": data,
            "forecast": forecast.tolist(),
            "conf_int": conf_int.tolist(),
            "status": "success"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
