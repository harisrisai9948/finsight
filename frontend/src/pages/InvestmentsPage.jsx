import { useState, useEffect } from 'react';
import { Plus, TrendingUp, AlertCircle, Trash2, Edit2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { getInvestments, createInvestment, deleteInvestment } from '../api/financeService';

const InvestmentsPage = () => {
    const [investments, setInvestments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        type: 'SIP',
        amount: '',
        duration: '',
        riskLevel: 'medium',
    });

    useEffect(() => {
        fetchInvestments();
    }, []);

    const fetchInvestments = async () => {
        try {
            const data = await getInvestments();
            setInvestments(data);
        } catch (error) {
            console.error('Error fetching investments:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const investmentChartData = [
        { month: 'Jan', value: 15000 },
        { month: 'Feb', value: 16200 },
        { month: 'Mar', value: 15800 },
        { month: 'Apr', value: 17500 },
        { month: 'May', value: 18900 },
        { month: 'Jun', value: 20100 },
    ];

    const portfolioBreakdown = [
        { name: 'SIP', value: 12500, percentage: 40 },
        { name: 'Stocks', value: 5500, percentage: 30 },
        { name: 'Savings', value: 7000, percentage: 30 },
    ];

    const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount_invested || 0), 0);
    const totalValue = investments.reduce((sum, inv) => sum + (inv.current_value || 0), 0);
    const totalReturns = totalValue - totalInvested;
    const returnPercentage = totalInvested > 0 ? ((totalReturns / totalInvested) * 100).toFixed(2) : '0.00';

    const handleAddInvestment = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.amount) return;

        try {
            const payload = {
                asset_name: formData.name,
                amount_invested: parseFloat(formData.amount),
                current_value: parseFloat(formData.amount) * 1.1 // Simulated
            };

            if (editingId) {
                const newInv = await createInvestment(payload);
                setInvestments(investments.map(i => i.id === editingId ? newInv : i));
                setEditingId(null);
            } else {
                const newInv = await createInvestment(payload);
                setInvestments([newInv, ...investments]);
            }
            setFormData({ name: '', type: 'SIP', amount: '', duration: '', riskLevel: 'medium' });
            setShowAddModal(false);
        } catch (error) {
            console.error('Error saving investment:', error);
        }
    };

    const handleEdit = (investment) => {
        setFormData(investment);
        setEditingId(investment.id);
        setShowAddModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to remove this investment?')) {
            try {
                await deleteInvestment(id);
                setInvestments(investments.filter(i => i.id !== id));
            } catch (error) {
                console.error('Error deleting investment:', error);
            }
        }
    };

    const getRiskColor = (level) => {
        switch (level) {
            case 'low': return 'bg-green-100 text-green-700';
            case 'medium': return 'bg-yellow-100 text-yellow-700';
            case 'high': return 'bg-red-100 text-red-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 border-l-4 border-primary pl-4">Investments</h1>
                    <p className="text-gray-500 mt-2">Grow your wealth with smart investments</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ name: '', type: 'SIP', amount: '', duration: '', riskLevel: 'medium' });
                        setShowAddModal(true);
                    }}
                    className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors font-semibold shadow-lg shadow-blue-200"
                >
                    <Plus size={20} />
                    Add Investment
                </button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm font-medium mb-1">Total Invested</p>
                    <p className="text-2xl font-bold text-gray-900">₹{totalInvested.toFixed(0)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm font-medium mb-1">Current Value</p>
                    <p className="text-2xl font-bold text-blue-600">₹{totalValue.toFixed(0)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm font-medium mb-1">Total Returns</p>
                    <p className="text-2xl font-bold text-green-600">₹{totalReturns.toFixed(0)}</p>
                    <span className="text-xs text-green-600 font-semibold">{returnPercentage}% gain</span>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm font-medium mb-1">Avg. Risk Level</p>
                    <p className="text-2xl font-bold text-yellow-600">Medium</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Portfolio Value Trend</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={investmentChartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                                <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={3} dot={{ fill: '#2563EB', r: 5 }} activeDot={{ r: 7 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Portfolio Breakdown</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={portfolioBreakdown}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                                <Bar dataKey="value" fill="#2563EB" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Investments List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {investments.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-gray-500 text-lg">No investments yet</p>
                        <p className="text-gray-400 text-sm mt-2">Start investing to grow your wealth</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Asset Name</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Invested</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Current Value</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Gain / Loss</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {investments.map((investment) => {
                                    const profit = investment.current_value - investment.amount_invested;
                                    const pct = investment.amount_invested ? ((profit / investment.amount_invested) * 100).toFixed(2) : 0;
                                    return (
                                        <tr key={investment.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-primary">
                                                        <TrendingUp size={18} />
                                                    </div>
                                                    <span className="font-semibold text-gray-900">{investment.asset_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{investment.amount_invested?.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{investment.current_value?.toFixed(2)}</td>
                                            <td className="px-6 py-4">
                                                <span className={`text-sm font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {profit >= 0 ? 'Gain' : 'Loss'} ₹{Math.abs(profit).toFixed(2)} ({Math.abs(pct)}%)
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 flex gap-2">
                                                <button
                                                    onClick={() => handleDelete(investment.id)}
                                                    className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Risk Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 flex gap-4">
                <AlertCircle className="text-yellow-600 flex-shrink-0" size={24} />
                <div>
                    <h4 className="font-bold text-yellow-900 mb-1">Investment Risk Disclaimer</h4>
                    <p className="text-yellow-800 text-sm">Investments carry risk of loss. Past performance does not guarantee future results. Please consult with a financial advisor before making investment decisions.</p>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="bg-gradient-to-r from-primary to-blue-600 p-6 text-white">
                            <h2 className="text-xl font-bold">{editingId ? 'Edit Investment' : 'Add Investment'}</h2>
                        </div>
                        <form onSubmit={handleAddInvestment} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Investment Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., HDFC Bank SIP"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="SIP">SIP (Systematic Investment Plan)</option>
                                    <option value="Stock">Stock</option>
                                    <option value="Index Fund">Index Fund</option>
                                    <option value="Mutual Fund">Mutual Fund</option>
                                    <option value="Bond">Bond</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹)</label>
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    placeholder="0.00"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g., 24 months"
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Risk Level</label>
                                <select
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    value={formData.riskLevel}
                                    onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                                >
                                    <option value="low">Low Risk</option>
                                    <option value="medium">Medium Risk</option>
                                    <option value="high">High Risk</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-semibold transition-colors"
                                >
                                    {editingId ? 'Update' : 'Add'} Investment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvestmentsPage;
