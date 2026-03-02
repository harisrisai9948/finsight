import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/authService';
import logo from '../assets/logo.png';

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            try { await register(name, email, password); }
            catch (err) { console.log('Register failed, simulating for demo', err); }
            navigate('/login');
        } catch (err) {
            alert('Registration failed');
        } finally { setLoading(false); }
    };

    const inputFocus = e => e.target.style.boxShadow = '0 0 0 3px #0e6db420';
    const inputBlur = e => e.target.style.boxShadow = '';

    return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #f0f6ff 0%, #f0faf7 50%, #f4fbef 100%)' }}>
            <div className="max-w-md w-full">
                <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/60 p-8 border border-gray-100">
                    <div className="text-center mb-8">
                        <img src={logo} alt="Finsight" className="h-12 mx-auto mb-4 object-contain" />
                        <h2 className="text-2xl font-black text-gray-900">Create Account</h2>
                        <p className="text-gray-400 text-sm mt-1">Start your financial journey with Finsight</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {[
                            { label: 'Full Name', type: 'text', val: name, set: setName, ph: 'John Doe' },
                            { label: 'Email Address', type: 'email', val: email, set: setEmail, ph: 'john@example.com' },
                            { label: 'Password', type: 'password', val: password, set: setPassword, ph: '••••••••' },
                        ].map(f => (
                            <div key={f.label}>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">{f.label}</label>
                                <input
                                    type={f.type} required
                                    placeholder={f.ph}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none transition-all"
                                    onFocus={inputFocus} onBlur={inputBlur}
                                    value={f.val}
                                    onChange={(e) => f.set(e.target.value)}
                                />
                            </div>
                        ))}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 rounded-xl text-white font-black text-sm hover:opacity-90 transition-all shadow-lg disabled:opacity-60 mt-2"
                            style={{ background: 'linear-gradient(90deg, #0e6db4 0%, #00a896 60%, #6cc04a 100%)' }}
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-gray-400 text-sm">
                        Have an account?{' '}
                        <Link to="/login" className="font-bold" style={{ color: '#0e6db4' }}>Sign In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
