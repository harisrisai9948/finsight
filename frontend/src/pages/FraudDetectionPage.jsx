import { useState, useEffect, useRef } from 'react';
import {
    Plus, AlertTriangle, CheckCircle, Clock, Trash2, Edit2, Shield,
    Zap, Loader2, XCircle, X, Search, ChevronDown, Activity,
    ShieldAlert, ShieldCheck, Eye, Ban, TriangleAlert, CircleCheck
} from 'lucide-react';
import { getFraudAlerts, createFraudAlert, updateFraudAlertStatus, fraudCheckWithAI, fraudScoreCheck } from '../api/financeService';


const URGENCY_CONFIG = {
    IMMEDIATE: { label: 'Act Immediately', color: 'text-red-600 bg-red-50 border-red-200', icon: <Ban size={14} />, pulse: true },
    'WITHIN 24H': { label: 'Within 24 Hours', color: 'text-orange-600 bg-orange-50 border-orange-200', icon: <TriangleAlert size={14} /> },
    MONITOR: { label: 'Keep Monitoring', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: <Eye size={14} /> },
    'NO ACTION': { label: 'No Action Needed', color: 'text-green-600 bg-green-50 border-green-200', icon: <CircleCheck size={14} /> },
};

const VERDICT_CONFIG = {
    FRAUDULENT: { bg: 'bg-red-950', border: 'border-red-800', text: 'text-red-100', badge: 'bg-red-500', label: 'FRAUDULENT' },
    SUSPICIOUS: { bg: 'bg-amber-950', border: 'border-amber-700', text: 'text-amber-100', badge: 'bg-amber-500', label: 'SUSPICIOUS' },
    LEGITIMATE: { bg: 'bg-emerald-950', border: 'border-emerald-700', text: 'text-emerald-100', badge: 'bg-emerald-500', label: 'LEGITIMATE' },
};

const FraudDetectionPage = () => {
    const [fraudAlerts, setFraudAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filteredAlerts, setFilteredAlerts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ type: 'Unusual Location', description: '', amount: '', risk: 'medium' });
    const [quickCheckText, setQuickCheckText] = useState('');
    const [quickCheckResult, setQuickCheckResult] = useState(null);
    const [isChecking, setIsChecking] = useState(false);
    const textareaRef = useRef(null);

    const [riskForm, setRiskForm] = useState({
        transaction_description: '', transaction_amount: '',
        is_new_device: false, ip_address: '', country: '', city: '',
        beneficiary_added_hours_ago: '', failed_otp_attempts: 0, transaction_hour: new Date().getHours(),
    });
    const [riskResult, setRiskResult] = useState(null);
    const [isScoring, setIsScoring] = useState(false);


    useEffect(() => { fetchAlerts(); }, []);

    useEffect(() => {
        let filtered = fraudAlerts;
        if (searchTerm) {
            filtered = filtered.filter(a =>
                (a.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (a.type || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (filterStatus !== 'all') filtered = filtered.filter(a => a.status === filterStatus);
        setFilteredAlerts(filtered);
    }, [searchTerm, filterStatus, fraudAlerts]);

    const fetchAlerts = async () => {
        try {
            const data = await getFraudAlerts();
            setFraudAlerts(data);
        } catch (error) {
            console.error('Error fetching alerts:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRiskScore = async (e) => {
        e.preventDefault();
        if (!riskForm.transaction_description || !riskForm.transaction_amount) return;
        setIsScoring(true);
        setRiskResult(null);
        try {
            const payload = {
                ...riskForm,
                transaction_amount: parseFloat(riskForm.transaction_amount),
                failed_otp_attempts: parseInt(riskForm.failed_otp_attempts) || 0,
                transaction_hour: parseInt(riskForm.transaction_hour) || 12,
                beneficiary_added_hours_ago: riskForm.beneficiary_added_hours_ago !== '' ? parseFloat(riskForm.beneficiary_added_hours_ago) : null,
            };
            const result = await fraudScoreCheck(payload);
            setRiskResult(result);
        } catch (err) {
            console.error('Risk score failed', err);
        } finally {
            setIsScoring(false);
        }
    };


    const fraudTypes = ['Unusual Location', 'Duplicate Transaction', 'Large Amount', 'Suspicious Pattern', 'Foreign Transaction', 'Time Anomaly'];

    const handleAddAlert = async (e) => {
        e.preventDefault();
        if (!formData.description || !formData.amount) return;
        try {
            const payload = { ...formData, amount: parseFloat(formData.amount), status: 'flagged' };
            if (editingId) {
                const newAlert = await createFraudAlert(payload);
                setFraudAlerts(fraudAlerts.map(a => a.id === editingId ? newAlert : a));
                setEditingId(null);
            } else {
                const newAlert = await createFraudAlert(payload);
                setFraudAlerts([newAlert, ...fraudAlerts]);
            }
            setFormData({ type: 'Unusual Location', description: '', amount: '', risk: 'medium' });
            setShowAddModal(false);
        } catch (error) {
            console.error('Error saving alert:', error);
        }
    };

    const handleEdit = (alert) => { setFormData(alert); setEditingId(alert.id); setShowAddModal(true); };
    const handleDelete = (id) => { if (window.confirm('Delete this alert?')) setFraudAlerts(fraudAlerts.filter(a => a.id !== id)); };

    const handleQuickCheck = async () => {
        if (!quickCheckText.trim()) return;
        setIsChecking(true);
        setQuickCheckResult(null);
        try {
            const result = await fraudCheckWithAI(quickCheckText);
            setQuickCheckResult(result);
        } catch (err) {
            setQuickCheckResult({
                verdict: 'SUSPICIOUS', risk_level: 'medium', is_fraud: false, confidence: 0,
                fraud_signals: [], genuine_signals: [],
                reason: 'Could not connect to analysis service. Check your connection.',
                recommendation: 'Retry the analysis or contact support.',
                urgency: 'MONITOR', ai_powered: false
            });
        } finally {
            setIsChecking(false);
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            await updateFraudAlertStatus(id, newStatus);
            setFraudAlerts(fraudAlerts.map(a => a.id === id ? { ...a, status: newStatus } : a));
        } catch (error) { console.error('Error updating status:', error); }
    };

    const flaggedCount = fraudAlerts.filter(a => a.status === 'flagged').length;
    const verifiedCount = fraudAlerts.filter(a => a.status === 'verified').length;
    const safeCount = fraudAlerts.filter(a => a.status === 'safe').length;

    const verdict = quickCheckResult?.verdict || 'SUSPICIOUS';
    const vc = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.SUSPICIOUS;
    const urgencyKey = quickCheckResult?.urgency || 'MONITOR';
    const urg = URGENCY_CONFIG[urgencyKey] || URGENCY_CONFIG.MONITOR;

    const getStatusPill = (status) => {
        const map = {
            flagged: 'bg-red-100 text-red-700',
            verified: 'bg-amber-100 text-amber-700',
            safe: 'bg-emerald-100 text-emerald-700'
        };
        return map[status] || 'bg-gray-100 text-gray-600';
    };

    const getRiskDot = (risk) => {
        const map = { high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-emerald-400' };
        return map[risk] || 'bg-gray-400';
    };

    return (
        <div className="space-y-8 pb-10">

            {/* ─── Header ─── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-9 h-9 bg-red-500 rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                            <Shield size={18} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Fraud Detection</h1>
                    </div>
                    <p className="text-gray-400 text-sm ml-12">Real-time transaction threat intelligence</p>
                </div>
                <button
                    onClick={() => { setEditingId(null); setFormData({ type: 'Unusual Location', description: '', amount: '', risk: 'medium' }); setShowAddModal(true); }}
                    className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl hover:bg-gray-700 transition-all font-semibold text-sm shadow-lg"
                >
                    <Plus size={16} /> Log Alert
                </button>
            </div>

            {/* ─── Stat Bar ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Total Alerts', val: fraudAlerts.length, color: 'text-gray-900', bg: 'bg-white', border: 'border-gray-100' },
                    { label: 'Flagged', val: flaggedCount, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
                    { label: 'Under Review', val: verifiedCount, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                    { label: 'Cleared', val: safeCount, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                ].map(s => (
                    <div key={s.label} className={`${s.bg} border ${s.border} rounded-2xl p-5 shadow-sm`}>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
                        <p className={`text-3xl font-black ${s.color}`}>{s.val}</p>
                    </div>
                ))}
            </div>

            {/* ─── Transaction Risk Scorer ─── */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50 flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                        <Activity size={16} className="text-indigo-600" />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-gray-900 tracking-tight">Transaction Risk Scorer</h2>
                        <p className="text-xs text-gray-400">6-factor rule engine · Results saved to DB</p>
                    </div>
                    <span className="ml-auto text-[10px] font-black bg-indigo-600 text-white px-3 py-1 rounded-full uppercase tracking-wider">Rule Engine</span>
                </div>

                <form onSubmit={handleRiskScore} className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Description */}
                    <div className="lg:col-span-2">
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Transaction Description *</label>
                        <input type="text" required placeholder="e.g. Wire transfer to ABC Bank account"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-all"
                            value={riskForm.transaction_description}
                            onChange={e => setRiskForm({ ...riskForm, transaction_description: e.target.value })} />
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Transaction Amount (₹) *</label>
                        <input type="number" required step="0.01" placeholder="0.00"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-all"
                            value={riskForm.transaction_amount}
                            onChange={e => setRiskForm({ ...riskForm, transaction_amount: e.target.value })} />
                    </div>

                    {/* IP Address */}
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">IP Address</label>
                        <input type="text" placeholder="e.g. 192.168.1.1 or 203.154.21.5"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-all"
                            value={riskForm.ip_address}
                            onChange={e => setRiskForm({ ...riskForm, ip_address: e.target.value })} />
                    </div>

                    {/* Country */}
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Country of Origin</label>
                        <input type="text" placeholder="e.g. India, USA, Nigeria"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-all"
                            value={riskForm.country}
                            onChange={e => setRiskForm({ ...riskForm, country: e.target.value })} />
                    </div>

                    {/* City */}
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">City</label>
                        <input type="text" placeholder="e.g. Mumbai, New York"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-all"
                            value={riskForm.city}
                            onChange={e => setRiskForm({ ...riskForm, city: e.target.value })} />
                    </div>

                    {/* Beneficiary Added Hours Ago */}
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Beneficiary Added (hours ago)</label>
                        <input type="number" step="0.5" placeholder="Leave blank if existing"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-all"
                            value={riskForm.beneficiary_added_hours_ago}
                            onChange={e => setRiskForm({ ...riskForm, beneficiary_added_hours_ago: e.target.value })} />
                    </div>

                    {/* Failed OTP Attempts */}
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Failed OTP Attempts</label>
                        <select className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white"
                            value={riskForm.failed_otp_attempts}
                            onChange={e => setRiskForm({ ...riskForm, failed_otp_attempts: e.target.value })}>
                            {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                    </div>

                    {/* Transaction Hour */}
                    <div>
                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5">Transaction Hour (0–23)</label>
                        <input type="number" min="0" max="23"
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-all"
                            value={riskForm.transaction_hour}
                            onChange={e => setRiskForm({ ...riskForm, transaction_hour: e.target.value })} />
                    </div>

                    {/* New Device Toggle */}
                    <div className="flex items-center gap-3 pt-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer"
                                checked={riskForm.is_new_device}
                                onChange={e => setRiskForm({ ...riskForm, is_new_device: e.target.checked })} />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                        <span className="text-sm font-semibold text-gray-700">New / Unrecognized Device</span>
                    </div>

                    {/* Submit */}
                    <div className="lg:col-span-3 flex items-center gap-4 pt-2 border-t border-gray-50">
                        <button type="submit" disabled={isScoring}
                            className="flex items-center gap-2 bg-indigo-600 text-white font-black px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all text-sm disabled:opacity-40 shadow-md shadow-indigo-100">
                            {isScoring ? <Loader2 size={15} className="animate-spin" /> : <ShieldAlert size={15} />}
                            {isScoring ? 'Calculating...' : 'Calculate Risk Score'}
                        </button>
                        {riskResult && (
                            <button type="button" onClick={() => setRiskResult(null)}
                                className="text-gray-400 hover:text-gray-600 text-xs font-semibold flex items-center gap-1">
                                <X size={13} /> Clear
                            </button>
                        )}
                    </div>
                </form>

                {/* Risk Score Result */}
                {riskResult && (() => {
                    const lvl = riskResult.risk_level;
                    const cfg = lvl === 'High Risk'
                        ? { border: 'border-red-200', bg: 'bg-red-50', badge: 'bg-red-500', text: 'text-red-700', barColor: 'bg-red-500', actionBg: 'bg-red-600' }
                        : lvl === 'Suspicious'
                            ? { border: 'border-yellow-200', bg: 'bg-yellow-50', badge: 'bg-yellow-500', text: 'text-yellow-700', barColor: 'bg-yellow-400', actionBg: 'bg-yellow-500' }
                            : { border: 'border-emerald-200', bg: 'bg-emerald-50', badge: 'bg-emerald-500', text: 'text-emerald-700', barColor: 'bg-emerald-500', actionBg: 'bg-emerald-600' };
                    const score = riskResult.risk_score;
                    const icon = lvl === 'High Risk' ? '🚨' : lvl === 'Suspicious' ? '⚠️' : '✅';
                    return (
                        <div className={`mx-6 mb-6 rounded-2xl border-2 ${cfg.border} ${cfg.bg} overflow-hidden`}>
                            <div className="px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{icon}</span>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Risk Assessment</p>
                                        <p className={`text-xl font-black ${cfg.text}`}>{lvl}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Risk Score</p>
                                    <p className={`text-3xl font-black ${cfg.text}`}>{score}<span className="text-sm">/100</span></p>
                                </div>
                            </div>

                            {/* Score Bar */}
                            <div className="px-6 pb-4">
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div className={`h-3 rounded-full transition-all duration-700 ${cfg.barColor}`} style={{ width: `${Math.min(score, 100)}%` }} />
                                </div>
                                <div className="flex justify-between mt-1">
                                    <span className="text-[10px] text-emerald-600 font-black">SAFE 0–39</span>
                                    <span className="text-[10px] text-yellow-600 font-black">SUSPICIOUS 40–69</span>
                                    <span className="text-[10px] text-red-600 font-black">HIGH RISK 70+</span>
                                </div>
                            </div>

                            <div className="px-6 pb-6 space-y-4">
                                {/* Final Action */}
                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-black ${cfg.actionBg}`}>
                                    {riskResult.final_action === 'Block' ? '🚫 Block Transaction' : riskResult.final_action === 'Require OTP' ? '🔐 Require OTP Verification' : '✅ Approve Transaction'}
                                </div>

                                {/* Triggered Reasons */}
                                {riskResult.reasons?.length > 0 && (
                                    <div className="bg-white/70 rounded-xl p-4">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Triggered Risk Factors</p>
                                        <ul className="space-y-1.5">
                                            {riskResult.reasons.map((r, i) => (
                                                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 font-medium">
                                                    <span className="text-red-500 mt-0.5">•</span> {r}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Origin */}
                                {riskResult.origin && (
                                    <div className="grid grid-cols-3 gap-3">
                                        {Object.entries(riskResult.origin).map(([k, v]) => (
                                            <div key={k} className="bg-white/60 rounded-xl p-3 text-center">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{k.replace('_', ' ')}</p>
                                                <p className="text-xs font-bold text-gray-800">{v || '—'}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <p className="text-[10px] text-gray-400 text-right">✓ Result saved to database</p>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* ─── AI Scanner Panel ─── */}
            <div className="bg-gray-950 rounded-3xl p-6 md:p-8 border border-gray-800 shadow-2xl">
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Activity size={18} className="text-emerald-400" />
                            <h2 className="text-white font-black text-lg tracking-tight">Transaction Scanner</h2>
                            <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">Live AI</span>
                        </div>
                        <p className="text-gray-500 text-xs">Paste a message, SMS, transaction detail, or scenario. Get an expert-level verdict.</p>
                    </div>
                </div>

                <textarea
                    ref={textareaRef}
                    rows={4}
                    placeholder={`Examples:\n• "Your SBI account will be blocked. Share OTP 7821 to verify."\n• "Salary credited ₹45,000 from employer on 1st"\n• "Transaction of ₹8,000 at 2am from unknown overseas account"`}
                    className="w-full bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-600 rounded-2xl px-5 py-4 text-sm resize-none focus:outline-none focus:border-gray-500 transition-all mb-4 leading-relaxed"
                    value={quickCheckText}
                    onChange={(e) => setQuickCheckText(e.target.value)}
                    onKeyDown={(e) => { if (e.ctrlKey && e.key === 'Enter') handleQuickCheck(); }}
                />

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleQuickCheck}
                        disabled={isChecking || !quickCheckText.trim()}
                        className="flex items-center gap-2 bg-white text-gray-900 font-black px-6 py-2.5 rounded-xl hover:bg-gray-100 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                    >
                        {isChecking ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
                        {isChecking ? 'Scanning...' : 'Run Analysis'}
                    </button>
                    {quickCheckText && (
                        <button onClick={() => { setQuickCheckText(''); setQuickCheckResult(null); }} className="text-gray-600 hover:text-gray-400 text-xs font-semibold transition-colors flex items-center gap-1">
                            <X size={13} /> Clear
                        </button>
                    )}
                    <span className="ml-auto text-gray-700 text-xs hidden sm:block">Ctrl+Enter to run</span>
                </div>

                {/* ─── Result ─── */}
                {quickCheckResult && (
                    <div className={`mt-6 rounded-2xl border ${vc.border} overflow-hidden`}>
                        {/* Verdict Header */}
                        <div className={`${vc.bg} px-6 py-4 flex items-center justify-between`}>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full ${vc.badge} text-white`}>
                                    {vc.label}
                                </span>
                                <div className={`flex items-center gap-1.5 text-xs font-semibold border px-3 py-1 rounded-full ${urg.color}`}>
                                    {urg.icon}
                                    <span>{urg.label}</span>
                                    {urgencyKey === 'IMMEDIATE' && <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping ml-1" />}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-xs font-semibold ${vc.text} opacity-60`}>Confidence</p>
                                <p className={`text-2xl font-black ${vc.text}`}>{quickCheckResult.confidence}%</p>
                            </div>
                        </div>

                        {/* Confidence Bar */}
                        <div className="h-1.5 bg-gray-800">
                            <div
                                className={`h-full ${verdict === 'FRAUDULENT' ? 'bg-red-500' : verdict === 'SUSPICIOUS' ? 'bg-amber-400' : 'bg-emerald-400'} transition-all duration-700`}
                                style={{ width: `${quickCheckResult.confidence}%` }}
                            />
                        </div>

                        {/* Body */}
                        <div className="bg-gray-900 p-6 space-y-5">
                            {/* Signals */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {quickCheckResult.fraud_signals?.length > 0 && (
                                    <div>
                                        <p className="text-red-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                                            <ShieldAlert size={12} /> Risk Signals
                                        </p>
                                        <ul className="space-y-1.5">
                                            {quickCheckResult.fraud_signals.map((s, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                                                    <XCircle size={13} className="text-red-400 mt-0.5 flex-shrink-0" />
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {quickCheckResult.genuine_signals?.length > 0 && (
                                    <div>
                                        <p className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-1">
                                            <ShieldCheck size={12} /> Safe Signals
                                        </p>
                                        <ul className="space-y-1.5">
                                            {quickCheckResult.genuine_signals.map((s, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                                                    <CheckCircle size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Analysis */}
                            <div className="border-t border-gray-800 pt-4">
                                <p className="text-gray-500 text-xs font-black uppercase tracking-widest mb-2">Analyst Assessment</p>
                                <p className="text-gray-200 text-sm leading-relaxed">{quickCheckResult.reason}</p>
                            </div>

                            {/* Recommendation */}
                            <div className={`rounded-xl p-4 border ${verdict === 'FRAUDULENT' ? 'bg-red-900/30 border-red-800' : verdict === 'SUSPICIOUS' ? 'bg-amber-900/30 border-amber-800' : 'bg-emerald-900/30 border-emerald-800'}`}>
                                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">What to do</p>
                                <p className={`text-sm font-semibold ${verdict === 'FRAUDULENT' ? 'text-red-200' : verdict === 'SUSPICIOUS' ? 'text-amber-200' : 'text-emerald-200'}`}>
                                    {quickCheckResult.recommendation}
                                </p>
                            </div>

                            {quickCheckResult.ai_powered && (
                                <p className="text-gray-700 text-xs text-right">Analysis by Gemini AI · TechSiri Fraud Intelligence</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Alert Log ─── */}
            <div>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search alerts..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-gray-700 focus:outline-none focus:border-gray-400 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="appearance-none pl-4 pr-8 py-2.5 border border-gray-200 rounded-xl bg-white text-sm font-semibold text-gray-700 focus:outline-none focus:border-gray-400 transition-all cursor-pointer"
                        >
                            <option value="all">All Status</option>
                            <option value="flagged">Flagged</option>
                            <option value="verified">Under Review</option>
                            <option value="safe">Cleared</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 text-center">
                            <Loader2 size={32} className="animate-spin text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-400 text-sm">Loading alerts...</p>
                        </div>
                    ) : filteredAlerts.length === 0 ? (
                        <div className="p-14 text-center">
                            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck size={26} className="text-gray-400" />
                            </div>
                            <p className="text-gray-700 font-bold text-base">No alerts found</p>
                            <p className="text-gray-400 text-sm mt-1">Your account looks clean. We're watching.</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    {['Type', 'Description', 'Amount', 'Risk', 'Status', ''].map(h => (
                                        <th key={h} className="px-5 py-3.5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAlerts.map((alert) => (
                                    <tr key={alert.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getRiskDot(alert.risk)}`} />
                                                <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">{alert.type}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 max-w-xs">
                                            <p className="text-sm text-gray-600 truncate">{alert.description}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-sm font-black text-gray-900">₹{(alert.amount || 0).toFixed(2)}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg capitalize ${alert.risk === 'high' ? 'bg-red-50 text-red-600' :
                                                alert.risk === 'medium' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                                                }`}>{alert.risk}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <select
                                                value={alert.status}
                                                onChange={(e) => handleStatusUpdate(alert.id, e.target.value)}
                                                className={`text-xs font-bold px-3 py-1.5 rounded-lg border-0 cursor-pointer focus:outline-none ${getStatusPill(alert.status)}`}
                                            >
                                                <option value="flagged">Flagged</option>
                                                <option value="verified">Review</option>
                                                <option value="safe">Cleared</option>
                                            </select>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleEdit(alert)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg transition-colors"><Edit2 size={14} /></button>
                                                <button onClick={() => handleDelete(alert.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* ─── Add/Edit Modal ─── */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                            <h2 className="text-lg font-black text-gray-900">{editingId ? 'Edit Alert' : 'Log New Alert'}</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                <X size={18} className="text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={handleAddAlert} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Alert Type</label>
                                <select
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:border-gray-400 bg-white"
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                >
                                    {['Unusual Location', 'Duplicate Transaction', 'Large Amount', 'Suspicious Pattern', 'Foreign Transaction', 'Time Anomaly'].map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Description</label>
                                <input
                                    type="text" required placeholder="Brief description of the suspicious activity"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Amount ($)</label>
                                <input
                                    type="number" required step="0.01" placeholder="0.00"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Risk Level</label>
                                <div className="flex gap-2">
                                    {['low', 'medium', 'high'].map(r => (
                                        <button
                                            key={r} type="button"
                                            onClick={() => setFormData({ ...formData, risk: r })}
                                            className={`flex-1 py-2 rounded-xl text-xs font-black capitalize transition-all ${formData.risk === r
                                                ? r === 'high' ? 'bg-red-500 text-white' : r === 'medium' ? 'bg-amber-400 text-white' : 'bg-emerald-500 text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >{r}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors">
                                    Cancel
                                </button>
                                <button type="submit"
                                    className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 transition-colors">
                                    {editingId ? 'Update' : 'Log Alert'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FraudDetectionPage;
