// API utility functions
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://repofy-backend.onrender.com' 
  : 'http://localhost:4000';

export const checkUsernameAvailability = async (username) => {
  try {
    const response = await fetch(`${API_BASE_URL}/check-username/${username}`);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to check username');
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

export const getUserProfile = async (token) => {
  try {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch profile');
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};
