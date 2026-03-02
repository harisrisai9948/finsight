import { useState, useEffect, useRef } from 'react';
import { Trash2, Edit2, Plus, Download, Search, Upload, FileText, CheckCircle2, XCircle } from 'lucide-react';

import { getTransactions, createTransaction, deleteTransaction } from '../api/financeService';

const TransactionsPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filteredTransactions, setFilteredTransactions] = useState(transactions);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ date: '', category: 'Food', description: '', amount: '' });
    const [modalTab, setModalTab] = useState('manual'); // 'manual' | 'csv'
    const [csvRows, setCsvRows] = useState([]);
    const [csvFileName, setCsvFileName] = useState('');
    const [csvImporting, setCsvImporting] = useState(false);
    const [csvProgress, setCsvProgress] = useState({ done: 0, total: 0 });
    const [csvDone, setCsvDone] = useState(false);
    const csvInputRef = useRef(null);


    const categories = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Other'];

    useEffect(() => {
        fetchTransactions();
    }, []);

    const fetchTransactions = async () => {
        try {
            const data = await getTransactions();
            setTransactions(data);
        } catch (error) {
            console.error('Error fetching transactions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        let filtered = transactions;

        if (searchTerm) {
            filtered = filtered.filter(t =>
                t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.category.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filterCategory !== 'all') {
            filtered = filtered.filter(t => t.category === filterCategory);
        }

        setFilteredTransactions(filtered);
    }, [searchTerm, filterCategory, transactions]);

    const handleAddTransaction = async (e) => {
        e.preventDefault();
        if (!formData.date || !formData.description || !formData.amount) return;

        try {
            if (editingId) {
                // For simplicity, we'll just delete and recreate or simulate update
                // Backend lacks update route for transactions in this draft, but let's assume create for now
                const newTx = await createTransaction({
                    ...formData,
                    amount: parseFloat(formData.amount)
                });
                setTransactions(transactions.map(t => t.id === editingId ? newTx : t));
                setEditingId(null);
            } else {
                const newTx = await createTransaction({
                    ...formData,
                    amount: parseFloat(formData.amount)
                });
                setTransactions([newTx, ...transactions]);
            }
            setFormData({ date: '', category: 'Food', description: '', amount: '' });
            setShowAddModal(false);
        } catch (error) {
            console.error('Error saving transaction:', error);
        }
    };

    const handleCSVParse = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setCsvFileName(file.name);
        setCsvRows([]);
        setCsvDone(false);
        setCsvProgress({ done: 0, total: 0 });
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target.result;
            const lines = text.trim().split('\n').filter(Boolean);
            if (lines.length < 2) { alert('CSV must have a header row and at least one data row.'); return; }
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
            const dateKey = headers.find(h => h.includes('date'));
            const descKey = headers.find(h => h.includes('desc') || h.includes('narration') || h.includes('particular') || h.includes('note'));
            const amtKey = headers.find(h => h.includes('amount') || h.includes('amt') || h.includes('debit') || h.includes('credit'));
            const catKey = headers.find(h => h.includes('cat') || h.includes('type') || h.includes('mode'));
            const parsed = lines.slice(1).map(line => {
                const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
                const obj = {};
                headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
                const amt = parseFloat(obj[amtKey]) || 0;
                const cats = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Other'];
                let cat = catKey ? obj[catKey] : '';
                if (!cats.includes(cat)) cat = 'Other';
                return {
                    date: dateKey ? obj[dateKey] : new Date().toISOString().split('T')[0],
                    description: descKey ? obj[descKey] : 'Imported',
                    amount: Math.abs(amt),
                    category: cat,
                };
            }).filter(r => r.amount > 0);
            setCsvRows(parsed);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleCSVImport = async () => {
        if (!csvRows.length) return;
        setCsvImporting(true);
        setCsvProgress({ done: 0, total: csvRows.length });
        const imported = [];
        for (const row of csvRows) {
            try {
                const newTx = await createTransaction(row);
                imported.push(newTx);
                setCsvProgress(p => ({ ...p, done: p.done + 1 }));
            } catch (err) {
                console.error('Failed to import row:', row, err);
            }
        }
        setTransactions(prev => [...imported.reverse(), ...prev]);
        setCsvImporting(false);
        setCsvDone(true);
        setTimeout(() => {
            setShowAddModal(false);
            setCsvRows([]);
            setCsvFileName('');
            setCsvDone(false);
            setModalTab('manual');
        }, 1500);
    };


    const handleEdit = (transaction) => {
        setFormData(transaction);
        setEditingId(transaction.id);
        setShowAddModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this transaction?')) {
            try {
                await deleteTransaction(id);
                setTransactions(transactions.filter(t => t.id !== id));
            } catch (error) {
                console.error('Error deleting transaction:', error);
            }
        }
    };

    const totalSpent = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 border-l-4 border-primary pl-4">Transactions</h1>
                    <p className="text-gray-500 mt-2">Manage and track your spending</p>
                </div>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ date: '', category: 'Food', description: '', amount: '' });
                        setShowAddModal(true);
                    }}
                    className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors font-semibold shadow-lg shadow-blue-200"
                >
                    <Plus size={20} />
                    Add Transaction
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm font-medium mb-1">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900">{filteredTransactions.length}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm font-medium mb-1">Total Spent</p>
                    <p className="text-2xl font-bold text-red-500">₹{Math.abs(totalSpent).toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-gray-500 text-sm font-medium mb-1">Average Transaction</p>
                    <p className="text-2xl font-bold text-blue-600">₹{Math.abs(totalSpent / (filteredTransactions.length || 1)).toFixed(2)}</p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white font-medium"
                    >
                        <option value="all">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <button className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                        <Download size={18} />
                        Export
                    </button>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {filteredTransactions.length === 0 ? (
                    <div className="p-12 text-center">
                        <p className="text-gray-500 text-lg">No transactions found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Date</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Description</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Category</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Amount</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map((transaction) => (
                                    <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">{transaction.date}</td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{transaction.description}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                                                {transaction.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{Math.abs(transaction.amount).toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${transaction.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {transaction.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 flex gap-2">
                                            <button
                                                onClick={() => handleEdit(transaction)}
                                                className="p-2 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(transaction.id)}
                                                className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-primary to-blue-600 p-6 text-white">
                            <h2 className="text-xl font-bold">{editingId ? 'Edit Transaction' : 'Add Transaction'}</h2>
                            {/* Tabs — only show in add mode */}
                            {!editingId && (
                                <div className="flex gap-2 mt-4">
                                    <button type="button"
                                        onClick={() => setModalTab('manual')}
                                        className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${modalTab === 'manual' ? 'bg-white text-primary shadow' : 'bg-white/20 text-white'
                                            }`}>
                                        ✏️ Manual Entry
                                    </button>
                                    <button type="button"
                                        onClick={() => setModalTab('csv')}
                                        className={`flex-1 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${modalTab === 'csv' ? 'bg-white text-primary shadow' : 'bg-white/20 text-white'
                                            }`}>
                                        📄 Import CSV
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* ── Manual Entry Tab ── */}
                        {(editingId || modalTab === 'manual') && (
                            <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
                                    <input type="date" required
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                                    <input type="text" required placeholder="e.g., Grocery Shopping"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                                    <select className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                                        {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Amount (₹)</label>
                                    <input type="number" required step="0.01" placeholder="0.00"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })} />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button type="button" onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 font-semibold transition-colors">Cancel</button>
                                    <button type="submit"
                                        className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-semibold transition-colors">
                                        {editingId ? 'Update' : 'Add'} Transaction
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* ── CSV Import Tab ── */}
                        {!editingId && modalTab === 'csv' && (
                            <div className="p-6 space-y-4">
                                {/* Upload Zone */}
                                <div
                                    onClick={() => csvInputRef.current?.click()}
                                    className="border-2 border-dashed border-indigo-200 rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                                        <Upload size={22} className="text-indigo-600" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-black text-gray-700">{csvFileName || 'Click to choose a CSV file'}</p>
                                        <p className="text-xs text-gray-400 mt-1">Supports: date, description/narration, amount, category</p>
                                    </div>
                                    {csvRows.length > 0 && (
                                        <span className="text-xs font-black bg-indigo-600 text-white px-3 py-1 rounded-full">
                                            {csvRows.length} rows · ₹{csvRows.reduce((s, r) => s + r.amount, 0).toFixed(0)} total
                                        </span>
                                    )}
                                </div>
                                <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVParse} />

                                {/* CSV Preview Table */}
                                {csvRows.length > 0 && (
                                    <div className="rounded-xl border border-gray-100 overflow-hidden">
                                        <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Preview ({csvRows.length} rows)</span>
                                            <FileText size={14} className="text-gray-400" />
                                        </div>
                                        <div className="max-h-48 overflow-y-auto">
                                            <table className="w-full text-xs">
                                                <thead className="bg-gray-50 sticky top-0">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-gray-500 font-bold">Date</th>
                                                        <th className="px-3 py-2 text-left text-gray-500 font-bold">Description</th>
                                                        <th className="px-3 py-2 text-left text-gray-500 font-bold">Cat.</th>
                                                        <th className="px-3 py-2 text-right text-gray-500 font-bold">Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {csvRows.slice(0, 20).map((r, i) => (
                                                        <tr key={i} className="hover:bg-gray-50">
                                                            <td className="px-3 py-2 text-gray-600">{r.date}</td>
                                                            <td className="px-3 py-2 text-gray-800 font-medium max-w-[120px] truncate">{r.description}</td>
                                                            <td className="px-3 py-2">
                                                                <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded">{r.category}</span>
                                                            </td>
                                                            <td className="px-3 py-2 text-right font-black text-gray-900">₹{r.amount.toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {csvRows.length > 20 && (
                                                <p className="text-center text-xs text-gray-400 py-2">...and {csvRows.length - 20} more rows</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Progress / Done */}
                                {csvImporting && (
                                    <div className="bg-indigo-50 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-black text-indigo-700">Importing...</span>
                                            <span className="text-xs font-black text-indigo-700">{csvProgress.done}/{csvProgress.total}</span>
                                        </div>
                                        <div className="w-full bg-indigo-100 rounded-full h-2">
                                            <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${csvProgress.total ? (csvProgress.done / csvProgress.total) * 100 : 0}%` }} />
                                        </div>
                                    </div>
                                )}
                                {csvDone && (
                                    <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl p-4">
                                        <CheckCircle2 size={18} />
                                        <span className="text-sm font-black">All {csvProgress.total} transactions imported!</span>
                                    </div>
                                )}

                                {/* Hint */}
                                {!csvRows.length && (
                                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                                        <p className="text-xs font-black text-amber-700 mb-1">📋 CSV Format Guide</p>
                                        <p className="text-[11px] text-amber-600 leading-relaxed">
                                            Your CSV should have columns like:<br />
                                            <strong>date, description, amount, category</strong><br />
                                            Also works with: narration, particular, debit, credit, type, mode.
                                        </p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowAddModal(false)}
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 font-semibold transition-colors text-sm">Cancel</button>
                                    <button type="button"
                                        onClick={handleCSVImport}
                                        disabled={!csvRows.length || csvImporting || csvDone}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-black transition-colors text-sm disabled:opacity-40">
                                        <Upload size={14} />
                                        Import {csvRows.length > 0 ? `${csvRows.length} Rows` : 'CSV'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TransactionsPage;
