import apiClient from './apiClient';

export const getDashboardData = async () => {
    const response = await apiClient.get('/dashboard');
    return response.data;
};

export const sendMessage = async (message) => {
    const response = await apiClient.post('/chat', { message });
    return response.data;
};

export const getProfile = async () => {
    const response = await apiClient.get('/profile');
    return response.data;
};

export const updateProfile = async (profileData) => {
    const response = await apiClient.put('/profile', profileData);
    return response.data;
};

// Transactions
export const getTransactions = async () => {
    const response = await apiClient.get('/transactions');
    return response.data;
};

export const createTransaction = async (transactionData) => {
    const response = await apiClient.post('/transactions', transactionData);
    return response.data;
};

export const deleteTransaction = async (id) => {
    const response = await apiClient.delete(`/transactions/${id}`);
    return response.data;
};

// Investments
export const getInvestments = async () => {
    const response = await apiClient.get('/investments');
    return response.data;
};

export const createInvestment = async (investmentData) => {
    const response = await apiClient.post('/investments', investmentData);
    return response.data;
};

export const deleteInvestment = async (id) => {
    const response = await apiClient.delete(`/investments/${id}`);
    return response.data;
};

// Fraud Alerts
export const getFraudAlerts = async () => {
    const response = await apiClient.get('/fraud-alerts');
    return response.data;
};

export const createFraudAlert = async (alertData) => {
    const response = await apiClient.post('/fraud-alerts', alertData);
    return response.data;
};

export const updateFraudAlertStatus = async (id, status) => {
    const response = await apiClient.put(`/fraud-alerts/${id}`, { status });
    return response.data;
};

// AI Fraud Check (text analysis with Gemini)
export const fraudCheckWithAI = async (text) => {
    const response = await apiClient.post('/fraud-check', { text });
    return response.data;
};

// Risk Score (6-factor rule-based scoring, saved to DB)
export const fraudScoreCheck = async (payload) => {
    const response = await apiClient.post('/fraud-score', payload);
    return response.data;
};

export const getRiskHistory = async () => {
    const response = await apiClient.get('/fraud-score/history');
    return response.data;
};

