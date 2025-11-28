from sklearn.linear_model import LogisticRegression
import numpy as np

def run_logistic(drivers, change_map):
    """
    Computes Logistic Regression for land change probability.
    
    Args:
        drivers (list of lists): Explanatory variables (X).
        change_map (list): Binary change map (y).
        
    Returns:
        dict: Coefficients and probability map (dummy).
    """
    try:
        X = np.array(drivers)
        y = np.array(change_map)
        
        model = LogisticRegression()
        model.fit(X, y)
        
        probs = model.predict_proba(X)[:, 1] # Probability of change (class 1)
        
        return {
            "coefficients": model.coef_.tolist(),
            "intercept": model.intercept_.tolist(),
            "probabilities": probs.tolist(),
            "status": "success"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
