import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, LayoutDashboard, User, LogOut, TrendingUp, CreditCard, AlertTriangle } from 'lucide-react';
import { logout } from '../../api/authService';
import logo from '../../assets/logo.png';

const navItems = [
    { name: 'Chat', path: '/app/chat', icon: <MessageSquare size={19} /> },
    { name: 'Dashboard', path: '/app/dashboard', icon: <LayoutDashboard size={19} /> },
    { name: 'Transactions', path: '/app/transactions', icon: <CreditCard size={19} /> },
    { name: 'Investments', path: '/app/investments', icon: <TrendingUp size={19} /> },
    { name: 'Fraud Detection', path: '/app/fraud-detection', icon: <AlertTriangle size={19} /> },
    { name: 'Profile', path: '/app/profile', icon: <User size={19} /> },
];

const Sidebar = () => {
    const location = useLocation();

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    return (
        <div className="w-64 h-screen border-r border-gray-100 flex flex-col fixed left-0 top-0 bg-white shadow-sm">
            {/* Logo */}
            <div className="px-5 py-5 border-b border-gray-100">
                <img src={logo} alt="Finsight" className="h-10 w-auto object-contain" />
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const active = location.pathname === item.path;
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${active
                                    ? 'text-white shadow-md'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                }`}
                            style={active ? { background: 'linear-gradient(90deg, #0e6db4 0%, #00a896 60%, #6cc04a 100%)' } : {}}
                        >
                            <span className={active ? 'text-white' : ''}>{item.icon}</span>
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="px-3 py-4 border-t border-gray-100">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                    <LogOut size={18} />
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
