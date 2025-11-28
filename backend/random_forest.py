from sklearn.ensemble import RandomForestClassifier
import numpy as np

def run_random_forest(drivers, labels):
    """
    Computes Random Forest for land change likelihood.
    
    Args:
        drivers (list of lists): Explanatory variables.
        labels (list): Target labels.
        
    Returns:
        dict: Feature importance and probabilities.
    """
    try:
        X = np.array(drivers)
        y = np.array(labels)
        
        clf = RandomForestClassifier(n_estimators=100)
        clf.fit(X, y)
        
        importances = clf.feature_importances_
        probs = clf.predict_proba(X)[:, 1]
        
        return {
            "feature_importances": importances.tolist(),
            "probabilities": probs.tolist(),
            "status": "success"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
