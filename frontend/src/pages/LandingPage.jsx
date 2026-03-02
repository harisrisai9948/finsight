import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import { MessageSquare, PieChart, Shield, Zap, ChevronRight, TrendingUp, BarChart2 } from 'lucide-react';
import logo from '../assets/logo.png';

const features = [
    { title: 'Chat-Based Tracking', description: 'Log expenses and ask finance questions just by chatting with our AI.', icon: <MessageSquare size={22} />, color: '#0e6db4' },
    { title: 'Smart Budgeting', description: 'Personalized budget plans based on your income and spending patterns.', icon: <Zap size={22} />, color: '#00a896' },
    { title: 'Live Dashboard', description: 'Interactive charts and real-time insights into your financial health.', icon: <PieChart size={22} />, color: '#6cc04a' },
    { title: 'Fraud Detection', description: 'AI-powered fraud scanner that flags suspicious transactions instantly.', icon: <Shield size={22} />, color: '#0e6db4' },
    { title: 'Investment Tracker', description: 'Monitor your portfolio and track gains/losses across all assets.', icon: <TrendingUp size={22} />, color: '#00a896' },
    { title: 'Deep Analytics', description: 'Understand where every rupee goes with category-level breakdowns.', icon: <BarChart2 size={22} />, color: '#6cc04a' },
];

const team = [
    { name: 'Alex Johnson', role: 'Founder & CEO', image: 'https://i.pravatar.cc/150?u=alex' },
    { name: 'Sarah Chen', role: 'Lead AI Engineer', image: 'https://i.pravatar.cc/150?u=sarah' },
    { name: 'Michael Smith', role: 'Financial Analyst', image: 'https://i.pravatar.cc/150?u=michael' },
];

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* ─── Hero ─── */}
            <section className="pt-36 pb-24 px-4 relative overflow-hidden">
                {/* Background blobs */}
                <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, #0e6db4, transparent 70%)' }} />
                <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, #6cc04a, transparent 70%)' }} />

                <div className="max-w-5xl mx-auto text-center relative z-10">
                    <img src={logo} alt="Finsight" className="h-20 w-auto mx-auto mb-10 object-contain" />
                    <h1 className="text-6xl md:text-7xl font-black text-gray-900 tracking-tight leading-tight mb-6">
                        Your Money,{' '}
                        <span className="text-brand-gradient">
                            Understood
                        </span>
                    </h1>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
                        AI-powered financial intelligence. Chat to track expenses, detect fraud, manage budgets, and get smart insights — all in one place.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link
                            to="/register"
                            className="inline-flex items-center justify-center gap-2 text-white px-9 py-4 rounded-2xl font-bold text-base hover:opacity-90 transition-all shadow-xl"
                            style={{ background: 'linear-gradient(90deg, #0e6db4 0%, #00a896 60%, #6cc04a 100%)' }}
                        >
                            Get Started Free <ChevronRight size={18} />
                        </Link>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center bg-white text-gray-700 border border-gray-200 px-9 py-4 rounded-2xl font-bold text-base hover:bg-gray-50 transition-all"
                        >
                            Sign In
                        </Link>
                    </div>
                </div>
            </section>

            {/* ─── Stats Bar ─── */}
            <section className="py-10 px-4">
                <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4">
                    {[
                        { val: '50K+', label: 'Transactions Analyzed' },
                        { val: '99.2%', label: 'Fraud Detection Accuracy' },
                        { val: '₹2Cr+', label: 'Saved By Users' },
                    ].map(s => (
                        <div key={s.label} className="text-center py-6 rounded-3xl bg-gray-50 border border-gray-100">
                            <p className="text-3xl font-black text-brand-gradient mb-1">{s.val}</p>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── Features ─── */}
            <section className="py-20 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-4xl font-black text-gray-900 mb-3">Everything You Need</h2>
                        <p className="text-gray-400 text-base">Built for real-world financial decisions, not just spreadsheets.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, idx) => (
                            <div key={idx} className="group bg-white p-7 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: feature.color + '18', color: feature.color }}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-black text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── CTA Banner ─── */}
            <section className="py-16 px-4">
                <div className="max-w-4xl mx-auto rounded-3xl p-12 text-center text-white shadow-2xl"
                    style={{ background: 'linear-gradient(135deg, #0e6db4 0%, #00a896 55%, #6cc04a 100%)' }}>
                    <h2 className="text-4xl font-black mb-4">Take Control Today</h2>
                    <p className="text-white/80 text-base mb-8 max-w-xl mx-auto">Join thousands of users who've upgraded their financial life with Finsight AI.</p>
                    <Link
                        to="/register"
                        className="inline-flex items-center gap-2 bg-white text-gray-900 font-black px-8 py-3.5 rounded-2xl hover:bg-gray-50 transition-all shadow-lg"
                    >
                        Start for Free <ChevronRight size={18} />
                    </Link>
                </div>
            </section>

            {/* ─── Team ─── */}
            <section className="py-20 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-14">
                        <h2 className="text-4xl font-black text-gray-900 mb-3">The Team</h2>
                        <p className="text-gray-400">Experts in finance, AI, and product design.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                        {team.map((member, idx) => (
                            <div key={idx} className="text-center group">
                                <div className="relative inline-block mb-5">
                                    <div className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                                        style={{ background: 'linear-gradient(135deg, #0e6db4, #6cc04a)', padding: 2 }} />
                                    <img src={member.image} alt={member.name}
                                        className="relative w-28 h-28 rounded-full mx-auto object-cover shadow-lg grayscale group-hover:grayscale-0 transition-all duration-300" />
                                </div>
                                <h3 className="text-base font-black text-gray-900">{member.name}</h3>
                                <p className="text-sm text-gray-400 font-medium">{member.role}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Footer ─── */}
            <footer className="border-t border-gray-100 py-10 px-4 mt-10">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <img src={logo} alt="Finsight" className="h-8 object-contain" />
                    <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Finsight. All rights reserved.</p>
                    <div className="flex gap-5">
                        {['Home', 'Features', 'Sign In', 'Sign Up'].map(l => (
                            <Link key={l} to="/" className="text-gray-400 hover:text-gray-700 text-sm font-medium transition-colors">{l}</Link>
                        ))}
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
