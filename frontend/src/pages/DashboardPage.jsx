import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Wallet, CreditCard, Activity, Sparkles, RefreshCw, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getDashboardData } from '../api/financeService';

const COLORS = ['#2563EB', '#FACC15', '#10B981', '#F87171', '#8B5CF6', '#EC4899'];

const DashboardPage = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [now, setNow] = useState(new Date());

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await getDashboardData();
            if (res) setData(res);
        } catch (err) {
            console.log('Dashboard API failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        setNow(new Date());
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-gray-400 text-sm font-semibold">Loading your financial data...</p>
                </div>
            </div>
        );
    }

    const balance = data?.balance ?? 0;
    const invested = data?.invested ?? 0;
    const income = data?.income ?? 0;
    const expenses = data?.expenses ?? 0;
    const savingsPercentage = data?.savingsPercentage ?? 0;
    const healthScore = data?.healthScore ?? 0;
    const netWorth = data?.net_worth ?? (balance + invested);

    const statCards = [
        {
            label: 'Net Worth', value: `₹${netWorth.toLocaleString()}`,
            icon: <Wallet size={20} />, bg: 'bg-primary', iconBg: 'bg-blue-600',
            sub: `Balance + Investments`, positive: true,
        },
        {
            label: 'Total Income', value: `₹${income.toLocaleString()}`,
            icon: <ArrowUpRight size={20} />, bg: 'bg-white', iconBg: 'bg-green-50',
            iconColor: 'text-green-600', sub: 'This period', positive: true,
        },
        {
            label: 'Total Expenses', value: `₹${expenses.toLocaleString()}`,
            icon: <ArrowDownRight size={20} />, bg: 'bg-white', iconBg: 'bg-red-50',
            iconColor: 'text-red-500', sub: 'This period', positive: false,
        },
        {
            label: 'Health Score', value: `${healthScore}/100`,
            icon: <Activity size={20} />, bg: 'bg-white', iconBg: 'bg-yellow-50',
            iconColor: 'text-yellow-500', sub: `${savingsPercentage}% savings rate`, positive: healthScore >= 60,
        },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 border-l-4 border-primary pl-4">Financial Dashboard</h1>
                    <p className="text-sm text-gray-400 mt-1 pl-5">
                        {now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm hover:shadow-md transition-all"
                >
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* AI Suggestion */}
            {data?.ai_suggestion && (
                <div className="bg-gradient-to-r from-primary to-blue-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full translate-x-10 -translate-y-10" />
                    <div className="flex items-start gap-4 relative">
                        <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Sparkles size={20} className="text-yellow-300" />
                        </div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-blue-200 mb-1.5">AI Insight · Today's Suggestion</p>
                            <p className="text-base font-semibold leading-relaxed text-blue-50">{data.ai_suggestion}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((card) => (
                    <div
                        key={card.label}
                        className={`p-6 rounded-3xl shadow-sm border ${card.bg === 'bg-primary' ? 'bg-primary text-white border-0 shadow-xl shadow-blue-200' : 'bg-white border-gray-100'}`}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 ${card.bg === 'bg-primary' ? 'bg-white/20' : card.iconBg} rounded-xl flex items-center justify-center ${card.bg === 'bg-primary' ? 'text-white' : card.iconColor}`}>
                                {card.icon}
                            </div>
                            <span className={`text-sm font-medium uppercase tracking-wider ${card.bg === 'bg-primary' ? 'text-blue-100' : 'text-gray-500'}`}>{card.label}</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <p className={`text-3xl font-bold ${card.bg === 'bg-primary' ? 'text-white' : 'text-gray-900'}`}>{card.value}</p>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${card.bg === 'bg-primary' ? 'bg-white/20 text-white' : card.positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                                {card.sub}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Income vs Expense */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Income vs Expenses</h3>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-6">Last 6 months · Real data</p>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data?.salaryVsExpense || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dx={-10} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="salary" name="Income" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="expense" name="Expenses" fill="#FACC15" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Expense Breakdown</h3>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mb-6">By category · Real data</p>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data?.categoryBreakdown || []}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {(data?.categoryBreakdown || []).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} formatter={(value) => `₹${value.toLocaleString()}`} />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Transactions */}
            {data?.recent_transactions?.length > 0 && (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
                        <span className="text-xs font-black text-primary bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter">Live</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {data.recent_transactions.map((t) => (
                            <div key={t.id} className="px-8 py-4 flex items-center justify-between hover:bg-gray-50/60 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.amount > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                                        <CreditCard size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">{t.description}</p>
                                        <p className="text-xs text-gray-400 font-medium">{t.category} · {new Date(t.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <p className={`text-sm font-black ${t.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    ₹{Math.abs(t.amount).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
