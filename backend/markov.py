import numpy as np

def run_markov(matrix, years_diff):
    """
    Computes Markov Chain transition matrix and future land demand.
    
    Args:
        matrix (list of lists): Transition matrix or raw counts.
        years_diff (int): Number of years for prediction.
        
    Returns:
        dict: Transition matrix and future demand.
    """
    try:
        P = np.array(matrix)
        
        # Normalize if not already probabilities
        if np.any(P > 1):
            row_sums = P.sum(axis=1)
            P = P / row_sums[:, np.newaxis]
            
        # Power of matrix for future prediction
        P_future = np.linalg.matrix_power(P, years_diff)
        
        return {
            "transition_matrix": P.tolist(),
            "future_probability_matrix": P_future.tolist(),
            "status": "success"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}
