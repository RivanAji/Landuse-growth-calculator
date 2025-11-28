import numpy as np
from sklearn.linear_model import LinearRegression

def run_regression(years, values, type='linear', periods=5):
    """
    Computes Linear or Exponential Regression.
    
    Args:
        years (list): Time series years.
        values (list): Values (area, population, etc.).
        type (str): 'linear' or 'exponential'.
        periods (int): Number of future years to forecast.
        
    Returns:
        dict: Forecast and growth rate.
    """
    try:
        X = np.array(years).reshape(-1, 1)
        y = np.array(values)
        
        if type == 'exponential':
            # Log transform for exponential regression
            y = np.log(y)
            
        model = LinearRegression()
        model.fit(X, y)
        
        slope = model.coef_[0]
        intercept = model.intercept_
        
        # Predict for next 'periods' years
        future_years = np.arange(years[-1] + 1, years[-1] + periods + 1).reshape(-1, 1)
        future_pred = model.predict(future_years)
        
        # Calculate Confidence Intervals (95%)
        # 1. Standard Error of Estimate
        y_pred_hist = model.predict(X)
        residuals = y - y_pred_hist
        sum_squared_residuals = np.sum(residuals ** 2)
        dof = len(y) - 2
        std_err = np.sqrt(sum_squared_residuals / dof)
        
        # 2. Standard Error of Forecast
        mean_x = np.mean(X)
        sum_squared_diff_x = np.sum((X - mean_x) ** 2)
        
        conf_int = []
        t_value = 1.96 # Approx for 95% CI (z-score)
        
        for x_val in future_years.flatten():
            se_forecast = std_err * np.sqrt(1 + (1/len(y)) + ((x_val - mean_x)**2 / sum_squared_diff_x))
            margin = t_value * se_forecast
            pred = model.predict([[x_val]])[0]
            conf_int.append([pred - margin, pred + margin])
        
        if type == 'exponential':
            future_pred = np.exp(future_pred)
            # Transform CI back to original scale
            conf_int = np.exp(conf_int).tolist()
            growth_rate = (np.exp(slope) - 1) * 100
        else:
            growth_rate = slope
            
        return {
            "slope": slope,
            "intercept": intercept,
            "growth_rate": growth_rate,
            "historical_years": years,
            "historical_values": values,
            "future_years": future_years.flatten().tolist(),
            "forecast": future_pred.tolist(),
            "conf_int": conf_int if isinstance(conf_int, list) else conf_int.tolist(),
            "status": "success"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
