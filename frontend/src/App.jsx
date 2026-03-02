import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import InvestmentsPage from './pages/InvestmentsPage';
import FraudDetectionPage from './pages/FraudDetectionPage';
import ProfilePage from './pages/ProfilePage';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './routes/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes */}
        <Route path="/app" element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route index element={<Navigate to="/app/chat" replace />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="investments" element={<InvestmentsPage />} />
            <Route path="fraud-detection" element={<FraudDetectionPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
