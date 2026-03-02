import apiClient from './apiClient';

export const login = async (email, password) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);

    const response = await apiClient.post('/login', params, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
    }
    return response.data;
};

export const register = async (name, email, password) => {
    const response = await apiClient.post('/register', { name, email, password });
    return response.data;
};

export const logout = () => {
    localStorage.removeItem('token');
};

export const isAuthenticated = () => {
    return !!localStorage.getItem('token');
};
