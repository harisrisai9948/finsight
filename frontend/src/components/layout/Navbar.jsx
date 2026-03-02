import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';

const Navbar = () => {
    return (
        <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <Link to="/" className="flex items-center">
                        <img src={logo} alt="Finsight" className="h-9 w-auto object-contain" />
                    </Link>
                    <div className="flex items-center gap-3">
                        <Link
                            to="/login"
                            className="text-sm font-semibold text-gray-500 hover:text-gray-800 px-4 py-2 rounded-xl transition-colors"
                        >
                            Sign In
                        </Link>
                        <Link
                            to="/register"
                            className="text-sm font-bold text-white px-5 py-2 rounded-xl transition-all hover:opacity-90 shadow-md"
                            style={{ background: 'linear-gradient(90deg, #0e6db4 0%, #00a896 60%, #6cc04a 100%)' }}
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
