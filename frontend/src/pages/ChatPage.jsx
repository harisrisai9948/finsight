import { useState, useEffect, useRef } from 'react';
import { Send, User as UserIcon, Bot, ArrowUpCircle, TrendingUp, Wallet, CreditCard, Activity, Trash2, ShieldCheck, Mail, Calendar, Star, LayoutGrid, X, Upload, FileText } from 'lucide-react';

import { sendMessage, deleteTransaction, deleteInvestment, getDashboardData, fraudCheckWithAI, createTransaction, createInvestment, createFraudAlert, fraudScoreCheck } from '../api/financeService';


import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#2563EB', '#10B981', '#FACC15', '#F87171', '#8B5CF6', '#EC4899'];

const ChatPage = () => {
    // ... existing state ...
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Hello! I'm TechSiri, your universal financial command center. How can I help you today?",
            sender: 'bot',
            options: ["📊 Show Dashboard", "💸 List Transactions", "📈 View Portfolio", "🔒 Security Check"]
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [quickActions, setQuickActions] = useState(["📊 Show Dashboard", "💸 List Transactions", "📈 View Portfolio", "🔒 Security Check"]);
    const [netWorth, setNetWorth] = useState(null);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const messagesEndRef = useRef(null);
    const csvInputRef = useRef(null);
    const [csvSummary, setCsvSummary] = useState(null);
    const [csvData, setCsvData] = useState(null); // full parsed rows for follow-up queries



    const defaultOptions = ["📊 Show Dashboard", "💸 List Transactions", "📈 View Portfolio", "🔒 Security Check", "👤 My Profile", "📉 Breakdown", "💰 Check Balance", "↩️ Undo Last"];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const buildCsvContext = (rows, amtKey, descKey, dateKey, catKey, total) => {
        const preview = rows.slice(0, 8).map((r, i) =>
            `${i + 1}. ${dateKey ? r[dateKey] : ''} | ${descKey ? r[descKey] : ''} | ₹${amtKey ? Math.abs(parseFloat(r[amtKey]) || 0).toFixed(2) : '?'}${catKey ? ` | ${r[catKey]}` : ''}`
        ).join('\n');
        return `[CSV: "${rows._fileName}" • ${rows.length} transactions • Total ₹${total.toFixed(2)}]\n${preview}${rows.length > 8 ? `\n...and ${rows.length - 8} more rows` : ''}`;
    };

    const handleCSVUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target.result;
            const lines = text.trim().split('\n').filter(Boolean);
            if (lines.length < 2) {
                alert('CSV must have a header row and at least one data row.');
                return;
            }
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
            const rows = lines.slice(1).map(line => {
                const vals = line.split(',').map(v => v.trim().replace(/"/g, ''));
                const obj = {};
                headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
                return obj;
            });
            rows._fileName = file.name;
            const amtKey = headers.find(h => h.includes('amount') || h.includes('amt') || h.includes('debit') || h.includes('credit'));
            const descKey = headers.find(h => h.includes('desc') || h.includes('narration') || h.includes('particular') || h.includes('note'));
            const dateKey = headers.find(h => h.includes('date'));
            const catKey = headers.find(h => h.includes('cat') || h.includes('type') || h.includes('mode'));
            let totalAmt = 0;
            rows.forEach(r => { if (amtKey) totalAmt += parseFloat(r[amtKey]) || 0; });
            const total = Math.abs(totalAmt);
            const summary = { rows: rows.length, total, file: file.name };
            setCsvSummary(summary);
            setCsvData({ rows, amtKey, descKey, dateKey, catKey, total, fileName: file.name });
            setShowOptionsMenu(false);

            // Build the context string once (reused across chip clicks)
            const ctx = buildCsvContext(rows, amtKey, descKey, dateKey, catKey, total);

            const suggestions = [
                // ── AI Analysis ──
                { type: 'ai', emoji: '📊', label: 'Spending Breakdown', color: 'indigo', prompt: `${ctx}\n\nBreak down my spending by category. Show totals per category and which I spend most on.` },
                { type: 'ai', emoji: '📈', label: 'Monthly Trend', color: 'blue', prompt: `${ctx}\n\nAnalyze my monthly spending trend. Which month had the highest spend? Is it increasing or decreasing?` },
                { type: 'ai', emoji: '🔍', label: 'Largest Transactions', color: 'violet', prompt: `${ctx}\n\nList the top 5 largest transactions from this CSV with date, description, and amount.` },
                { type: 'ai', emoji: '💡', label: 'Saving Tips', color: 'amber', prompt: `${ctx}\n\nGive me 3 personalized money-saving tips based on this CSV.` },
                { type: 'ai', emoji: '🧠', label: 'Full AI Analysis', color: 'blue', prompt: `${ctx}\n\nGive me a complete financial analysis: spending patterns, anomalies, top categories, month-over-month, and 3 recommendations.` },
                // ── App Actions (all 4 sidebar sections) ──
                { type: 'import', emoji: '💳', label: 'Add to Transactions', color: 'green', rows, amtKey, descKey, dateKey, catKey },
                { type: 'invest', emoji: '📈', label: 'Add to Investments', color: 'blue', rows, amtKey, descKey, dateKey },
                { type: 'fraud-alert', emoji: '🛡️', label: 'Send to Fraud Detection', color: 'red', rows, amtKey, descKey, dateKey, ctx },
                { type: 'export', emoji: '💾', label: 'Export as CSV', color: 'gray', rows, amtKey, descKey, dateKey, catKey, fileName: file.name },
            ];

            const botMsg = {
                id: Date.now(),
                sender: 'bot',
                text: `📄 CSV uploaded: "${file.name}"\n📊 ${rows.length} transactions • Total ₹${total.toFixed(2)}\n\nWhat would you like to analyze?`,
                data: { type: 'csv_suggestions', suggestions, ctx },
            };
            setMessages(prev => [...prev, botMsg]);
        };
        reader.readAsText(file);
        e.target.value = '';
    };


    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const fetchNetWorth = async () => {
            try {
                const res = await getDashboardData();
                if (res) {
                    const worth = (res.balance || 0) + (res.invested || 0);
                    setNetWorth(worth);
                }
            } catch (err) {
                console.log('Could not load net worth');
            }
        };
        fetchNetWorth();
    }, []);

    // Detect if user wants a fraud check
    const extractFraudText = (msg) => {
        const lower = msg.toLowerCase();
        const fraudTriggers = [
            /check this(?:\s+(?:for\s+)?(?:fraud|scam|suspicious))?[:\-]?\s*(.*)/i,
            /is this(?:\s+a)?\s*(?:fraud|scam|fake|legitimate|legit|suspicious)[:\-]?\s*(.*)/i,
            /(?:fraud|scam|suspicious)\s*(?:or\s*not)?[:\-]\s*(.*)/i,
            /analyze(?:\s+this)?(?:\s+(?:for\s+)?(?:fraud|transaction))?[:\-]?\s*(.*)/i,
            /verify(?:\s+this)?[:\-]?\s*(.*)/i,
        ];
        for (const pattern of fraudTriggers) {
            const match = msg.match(pattern);
            if (match) {
                const extracted = (match[1] || '').trim();
                // If the extracted part is too short, use the full message
                return extracted.length > 3 ? extracted : msg;
            }
        }
        // Fallback: if message contains fraud-related keywords, use the whole message
        if (/fraud|scam|phishing|suspicious|hack|legit|legitimate/.test(lower)) {
            return msg;
        }
        return null;
    };

    const handleSend = async (e, customInput = null) => {
        if (e) e.preventDefault();
        const textToSend = customInput || input;
        if (!textToSend.trim()) return;

        const userMessage = { id: Date.now(), text: textToSend, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        if (!customInput) setInput('');
        setLoading(true);

        // Check if this is a fraud analysis request
        const fraudText = extractFraudText(textToSend);
        if (fraudText) {
            try {
                const res = await fraudCheckWithAI(fraudText);
                const botMessage = {
                    id: Date.now() + 1,
                    text: res.is_fraud
                        ? `⚠️ Fraud detected! Here's my analysis:`
                        : `🛡️ Here's my fraud analysis:`,
                    sender: 'bot',
                    options: ["🔒 Security Check", "📊 Show Dashboard", "💸 List Transactions"],
                    data: { type: 'fraud_result', result: res }
                };
                setMessages(prev => [...prev, botMessage]);
                setQuickActions(["🔒 Security Check", "📊 Show Dashboard", "Check Balance"]);
            } catch (err) {
                setMessages(prev => [...prev, {
                    id: Date.now() + 1,
                    text: "⚠️ I couldn't reach the AI fraud analyzer right now. Please try again.",
                    sender: 'bot'
                }]);
            } finally {
                setLoading(false);
            }
            return;
        }

        try {
            const res = await sendMessage(textToSend);
            const botMessage = {
                id: Date.now() + 1,
                text: res.response,
                sender: 'bot',
                options: res.options,
                data: res.data
            };
            setMessages((prev) => [...prev, botMessage]);
            if (res.options && res.options.length > 0) {
                setQuickActions(res.options);
            }
        } catch (err) {
            console.error('Chat API failed', err);
            const botMessage = {
                id: Date.now() + 1,
                text: "I'm having trouble connecting right now. Please try again later.",
                sender: 'bot'
            };
            setMessages((prev) => [...prev, botMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (type, id, description) => {
        if (!window.confirm(`Are you sure you want to delete this ${type}?`)) return;

        try {
            if (type === 'transaction') await deleteTransaction(id);
            else await deleteInvestment(id);

            const botMessage = {
                id: Date.now(),
                text: `✅ Successfully deleted ${type}: "${description}"`,
                sender: 'bot',
                options: ["📊 Show Dashboard", "💸 List Transactions"]
            };
            setMessages(prev => [...prev, botMessage]);
        } catch (err) {
            alert(`Failed to delete ${type}`);
        }
    };

    const handleActionClick = (action) => {
        handleSend(null, action);
    };

    // Widget Components
    const DashboardWidget = ({ data }) => (
        <div className="mt-4 bg-white rounded-3xl border border-gray-100 p-6 shadow-xl shadow-gray-200/20 w-full max-w-md">
            <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-blue-50/50 p-3 rounded-2xl text-center border border-blue-100">
                    <p className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest leading-tight mb-1">Balance</p>
                    <p className="text-sm font-black text-blue-900">${data.stats.balance.toLocaleString()}</p>
                </div>
                <div className="bg-red-50/50 p-3 rounded-2xl text-center border border-red-100">
                    <p className="text-[10px] text-red-600 font-extrabold uppercase tracking-widest leading-tight mb-1">Spent</p>
                    <p className="text-sm font-black text-red-900">${data.stats.spent.toLocaleString()}</p>
                </div>
                <div className="bg-green-50/50 p-3 rounded-2xl text-center border border-green-100">
                    <p className="text-[10px] text-green-600 font-extrabold uppercase tracking-widest leading-tight mb-1">Income</p>
                    <p className="text-sm font-black text-green-900">${data.stats.income.toLocaleString()}</p>
                </div>
            </div>
            <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chartData}>
                        <XAxis dataKey="name" hide />
                        <Tooltip
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                            cursor={{ fill: '#F9FAFB' }}
                        />
                        <Bar dataKey="spent" fill="#2563EB" radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    const PieChartWidget = ({ data }) => (
        <div className="mt-4 bg-white rounded-3xl border border-gray-100 p-6 shadow-xl shadow-gray-200/20 w-full max-w-md">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Spending Breakdown</h3>
            <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data.chartData}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );

    const ProfileWidget = ({ user }) => (
        <div className="mt-4 bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xl shadow-gray-200/20 w-full max-w-md">
            <div className="bg-gradient-to-r from-primary to-blue-600 p-6 text-white relative">
                <div className="absolute top-6 right-6">
                    <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 flex items-center gap-2">
                        <Star size={12} fill="white" />
                        <span className="text-[10px] font-black uppercase tracking-tighter">{user.tier}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-primary shadow-lg ring-4 ring-white/20">
                        <UserIcon size={32} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black tracking-tight">{user.name}</h3>
                        <p className="text-blue-100 text-xs font-bold opacity-80 uppercase tracking-widest">{user.tier}</p>
                    </div>
                </div>
            </div>
            <div className="p-6 space-y-4">
                <div className="flex items-center gap-4 text-gray-600">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400"><Mail size={18} /></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Email Address</p>
                        <p className="text-sm font-bold text-gray-800 leading-none">{user.email}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-gray-600">
                    <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400"><Calendar size={18} /></div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Member Since</p>
                        <p className="text-sm font-bold text-gray-800 leading-none">{user.joined}</p>
                    </div>
                </div>
                <button className="w-full bg-gray-900 text-white font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl hover:bg-black transition-all shadow-lg active:scale-95">
                    View Full Account Settings
                </button>
            </div>
        </div>
    );

    const TransactionWidget = ({ items }) => (
        <div className="mt-4 bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xl shadow-gray-200/20 w-full max-w-md">
            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Recent Activity</span>
                <span className="text-[10px] text-blue-600 font-black bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter">Live Sync</span>
            </div>
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                {items.map((item, idx) => (
                    <div key={idx} className="p-4 flex justify-between items-center hover:bg-blue-50/30 transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:shadow-sm">
                                <CreditCard size={18} />
                            </div>
                            <div>
                                <p className="text-sm font-black text-gray-800 leading-tight mb-0.5">{item.description}</p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter leading-none">{item.date} • {item.category}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <p className={`text-sm font-black ${item.amount < 0 ? 'text-red-500' : 'text-green-500'}`}>
                                {item.amount < 0 ? '-' : '+'}${Math.abs(item.amount).toLocaleString()}
                            </p>
                            <button
                                onClick={() => handleDelete('transaction', item.id, item.description)}
                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const InvestmentWidget = ({ items }) => (
        <div className="mt-4 bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-xl shadow-gray-200/20 w-full max-w-md">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex justify-between items-center text-white">
                <span className="text-xs font-black uppercase tracking-widest">Investment Portfolio</span>
                <TrendingUp size={18} className="opacity-50" />
            </div>
            <div className="p-6 space-y-4">
                {items.map((item, idx) => {
                    const profit = item.current - item.invested;
                    const isProfit = profit >= 0;
                    return (
                        <div key={idx} className="flex justify-between items-center pb-4 border-b border-gray-50 last:border-0 last:pb-0 group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                    <Activity size={18} />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-gray-800 leading-tight mb-0.5">{item.asset}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Cost: ${item.invested.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-sm font-black text-gray-900 leading-tight mb-0.5">${item.current.toLocaleString()}</p>
                                    <p className={`text-[10px] font-black uppercase tracking-tighter ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                                        {isProfit ? 'Profit' : 'Loss'} {Math.abs((profit / item.invested) * 100).toFixed(1)}%
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleDelete('investment', item.id, item.asset)}
                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const FraudResultWidget = ({ result }) => {
        const verdictConfig = {
            FRAUDULENT: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-500', text: 'text-red-700', icon: '🚨', label: 'FRAUDULENT' },
            SUSPICIOUS: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-500', text: 'text-yellow-700', icon: '⚠️', label: 'SUSPICIOUS' },
            LEGITIMATE: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-500', text: 'text-green-700', icon: '✅', label: 'LEGITIMATE' },
        };
        const cfg = verdictConfig[result.verdict] || verdictConfig.SUSPICIOUS;
        const confidence = result.confidence || 0;
        const urgencyColor = { IMMEDIATE: 'text-red-600 bg-red-50', 'WITHIN 24H': 'text-orange-600 bg-orange-50', MONITOR: 'text-yellow-600 bg-yellow-50', 'NO ACTION': 'text-green-600 bg-green-50' };
        const urgencyStyle = urgencyColor[result.urgency] || urgencyColor.MONITOR;

        return (
            <div className={`mt-4 rounded-3xl border-2 ${cfg.border} ${cfg.bg} overflow-hidden w-full max-w-md shadow-xl`}>
                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{cfg.icon}</span>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">AI Fraud Analysis</p>
                            <p className={`text-lg font-black ${cfg.text}`}>{cfg.label}</p>
                        </div>
                    </div>
                    {result.urgency && (
                        <span className={`text-[10px] font-black uppercase tracking-tighter px-3 py-1.5 rounded-full ${urgencyStyle}`}>
                            {result.urgency}
                        </span>
                    )}
                </div>

                {/* Confidence Bar */}
                <div className="px-6 pb-4">
                    <div className="flex justify-between mb-1.5">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Confidence</span>
                        <span className="text-[10px] font-black text-gray-700">{confidence}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full ${result.is_fraud ? 'bg-red-500' : confidence > 70 ? 'bg-green-500' : 'bg-yellow-400'}`}
                            style={{ width: `${confidence}%` }}
                        />
                    </div>
                </div>

                <div className="px-6 pb-4 space-y-4">
                    {/* Reason */}
                    {result.reason && (
                        <div className="bg-white/70 rounded-2xl p-4 border border-white">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Analysis</p>
                            <p className="text-sm font-bold text-gray-800 leading-relaxed">{result.reason}</p>
                        </div>
                    )}

                    {/* Signals */}
                    <div className="grid grid-cols-2 gap-3">
                        {result.fraud_signals && result.fraud_signals.length > 0 && (
                            <div className="bg-red-100/60 rounded-2xl p-3">
                                <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-2">🚩 Risk Signals</p>
                                {result.fraud_signals.map((s, i) => (
                                    <p key={i} className="text-[10px] text-red-700 font-bold leading-tight mb-1">• {s}</p>
                                ))}
                            </div>
                        )}
                        {result.genuine_signals && result.genuine_signals.length > 0 && (
                            <div className="bg-green-100/60 rounded-2xl p-3">
                                <p className="text-[9px] font-black text-green-600 uppercase tracking-widest mb-2">✅ Safe Signs</p>
                                {result.genuine_signals.map((s, i) => (
                                    <p key={i} className="text-[10px] text-green-700 font-bold leading-tight mb-1">• {s}</p>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recommendation */}
                    {result.recommendation && (
                        <div className="bg-white/80 rounded-2xl p-4 border-l-4 border-primary">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Recommended Action</p>
                            <p className="text-sm font-bold text-gray-800">{result.recommendation}</p>
                        </div>
                    )}

                    {/* AI Badge */}
                    <div className="flex items-center justify-end">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                            {result.ai_powered ? 'Powered by Gemini AI' : 'Keyword Analysis'}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)]">
            {/* Header Summary (Minimized for focus on chat) */}
            <div className="flex justify-between items-center mb-6 px-2">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">TechSiri</h1>
                    <p className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-widest">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Unified Hub Active
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white/50 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white shadow-xl shadow-gray-200/20 flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-primary rounded-xl"><Wallet size={16} /></div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1 tracking-tighter">Net Worth</p>
                            <p className="text-sm font-black text-gray-900 leading-none">
                                {netWorth !== null ? `₹${netWorth.toLocaleString()}` : '—'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto bg-gray-50/30 rounded-[40px] p-8 border border-gray-100/50 mb-6 space-y-8 no-scrollbar">
                {messages.map((m) => (
                    <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`flex max-w-[90%] ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${m.sender === 'user' ? 'ml-4 bg-primary text-white shadow-2xl shadow-blue-200 ring-4 ring-blue-50' : 'mr-4 bg-white text-gray-400 border border-gray-100 shadow-lg shadow-gray-200/30'}`}>
                                {m.sender === 'user' ? <UserIcon size={20} /> : <Bot size={20} />}
                            </div>
                            <div className="flex flex-col">
                                <div className={`p-5 rounded-[28px] ${m.sender === 'user' ? 'bg-primary text-white rounded-tr-none shadow-2xl shadow-blue-100' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100 shadow-xl shadow-gray-200/10'}`}>
                                    <p className="text-sm font-bold leading-relaxed whitespace-pre-line tracking-tight">{m.text}</p>
                                </div>
                                {/* Widget Rendering */}
                                {m.sender === 'bot' && m.data && (
                                    <div className="mt-4 transition-all animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        {m.data.type === 'dashboard_widget' && <DashboardWidget data={m.data} />}
                                        {m.data.type === 'transaction_list' && <TransactionWidget items={m.data.items} />}
                                        {m.data.type === 'investment_list' && <InvestmentWidget items={m.data.items} />}
                                        {m.data.type === 'profile_widget' && <ProfileWidget user={m.data.user} />}
                                        {m.data.type === 'pie_chart_widget' && <PieChartWidget data={m.data} />}
                                        {m.data.type === 'fraud_result' && <FraudResultWidget result={m.data.result} />}
                                        {m.data.type === 'csv_suggestions' && (() => {
                                            const colorMap = {
                                                indigo: 'hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700',
                                                blue: 'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700',
                                                violet: 'hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700',
                                                amber: 'hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700',
                                                green: 'hover:bg-green-50 hover:border-green-200 hover:text-green-700',
                                                red: 'hover:bg-red-50 hover:border-red-200 hover:text-red-700',
                                                gray: 'hover:bg-gray-100 hover:border-gray-300 hover:text-gray-800',
                                            };
                                            const handleChip = async (s) => {
                                                if (s.type === 'ai') {
                                                    const userMsg = { id: Date.now(), sender: 'user', text: `${s.emoji} ${s.label}` };
                                                    setMessages(prev => [...prev, userMsg]);
                                                    setLoading(true);
                                                    try {
                                                        const res = await sendMessage({ message: s.prompt });
                                                        setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: res.reply || res.message || 'Done.', data: res.data || null }]);
                                                    } catch { setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: 'Could not analyze. Try again.' }]); }
                                                    finally { setLoading(false); }
                                                }
                                                if (s.type === 'import') {
                                                    const cats = ['Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Other'];
                                                    const rowsToImport = s.rows.map(r => {
                                                        const amt = s.amtKey ? Math.abs(parseFloat(r[s.amtKey]) || 0) : 0;
                                                        let cat = s.catKey ? r[s.catKey] : '';
                                                        if (!cats.includes(cat)) cat = 'Other';
                                                        return { date: s.dateKey ? r[s.dateKey] : new Date().toISOString().split('T')[0], description: s.descKey ? r[s.descKey] : 'Imported', amount: amt, category: cat };
                                                    }).filter(r => r.amount > 0);
                                                    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: `💳 Add ${rowsToImport.length} rows to Transactions` }]);
                                                    setLoading(true);
                                                    let done = 0;
                                                    for (const row of rowsToImport) {
                                                        try { await createTransaction(row); done++; } catch { }
                                                    }
                                                    setLoading(false);
                                                    setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: `✅ Imported ${done} of ${rowsToImport.length} transactions → Transactions page updated!` }]);
                                                }
                                                if (s.type === 'invest') {
                                                    const rowsToInvest = s.rows.map(r => {
                                                        const amt = s.amtKey ? Math.abs(parseFloat(r[s.amtKey]) || 0) : 0;
                                                        const name = s.descKey ? r[s.descKey] : 'CSV Investment';
                                                        return { asset_name: name, amount_invested: amt, current_value: parseFloat((amt * 1.1).toFixed(2)) };
                                                    }).filter(r => r.amount_invested > 0);
                                                    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: `📈 Add ${rowsToInvest.length} rows to Investments` }]);
                                                    setLoading(true);
                                                    let done = 0;
                                                    for (const row of rowsToInvest) {
                                                        try { await createInvestment(row); done++; } catch { }
                                                    }
                                                    setLoading(false);
                                                    setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: `✅ Added ${done} of ${rowsToInvest.length} entries to Investments page!` }]);
                                                }
                                                if (s.type === 'fraud-alert') {
                                                    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: `🛡️ Send to Fraud Detection` }]);
                                                    setLoading(true);
                                                    const suspicious = ['unknown', 'overseas', 'foreign', 'unauthorized', 'duplicate', 'suspicious', 'unusual', '2am', '3am', '4am', 'midnight', 'crypto', 'wire', 'western union', 'gift card', 'lottery', 'won', 'prize', 'otp', 'verify', 'click link', 'urgent', 'phishing', 'hack', 'blocked'];
                                                    const flagged = [];
                                                    s.rows.forEach(r => {
                                                        const desc = (s.descKey ? r[s.descKey] : '').toLowerCase();
                                                        const amt = s.amtKey ? Math.abs(parseFloat(r[s.amtKey]) || 0) : 0;
                                                        const date = s.dateKey ? r[s.dateKey] : new Date().toISOString().split('T')[0];
                                                        const hits = suspicious.filter(k => desc.includes(k));
                                                        const risk = hits.length >= 2 ? 'high' : hits.length === 1 ? 'medium' : null;
                                                        if (risk) flagged.push({ description: s.descKey ? r[s.descKey] : 'CSV Row', amount: amt, date, risk, status: 'pending' });
                                                    });
                                                    let saved = 0;
                                                    for (const alert of flagged) {
                                                        try { await createFraudAlert(alert); saved++; } catch { }
                                                    }
                                                    setLoading(false);
                                                    if (saved === 0) {
                                                        setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: `✅ Fraud scan on ${s.rows.length} rows: No suspicious entries found. Nothing added to Fraud Detection.` }]);
                                                    } else {
                                                        setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: `🛡️ Fraud Detection updated! Saved ${saved} suspicious transaction(s) from ${s.rows.length} CSV rows → check Fraud Detection page!` }]);
                                                    }
                                                }
                                                if (s.type === 'export') {
                                                    const header = 'date,description,amount,category\n';
                                                    const body = s.rows.map(r => `${s.dateKey ? r[s.dateKey] : ''},${s.descKey ? r[s.descKey] : ''},${s.amtKey ? Math.abs(parseFloat(r[s.amtKey]) || 0).toFixed(2) : ''},${s.catKey ? r[s.catKey] : ''}`).join('\n');
                                                    const blob = new Blob([header + body], { type: 'text/csv' });
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a'); a.href = url; a.download = `finsight_${s.fileName || 'export'}`; a.click();
                                                    URL.revokeObjectURL(url);
                                                    setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: `💾 Exported ${s.rows.length} rows as CSV file: finsight_${s.fileName || 'export'}` }]);
                                                }
                                            };
                                            const aiChips = m.data.suggestions.filter(s => s.type === 'ai');
                                            const actionChips = m.data.suggestions.filter(s => s.type !== 'ai');
                                            return (
                                                <div className="mt-3 bg-white rounded-[24px] border border-gray-100 shadow-xl shadow-gray-100/20 overflow-hidden">
                                                    <div className="bg-gradient-to-r from-indigo-600 to-blue-500 px-5 py-3 flex items-center gap-2">
                                                        <FileText size={14} className="text-white/80" />
                                                        <span className="text-xs font-black text-white uppercase tracking-widest">What would you like to do?</span>
                                                    </div>
                                                    {/* AI Analysis section */}
                                                    <div className="px-4 pt-4 pb-2">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">🤖 AI Analysis</p>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {aiChips.map((s, i) => (
                                                                <button key={i} type="button" onClick={() => handleChip(s)}
                                                                    className={`flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-transparent rounded-2xl text-xs font-black text-gray-700 transition-all active:scale-95 text-left ${colorMap[s.color] || ''}`}>
                                                                    <span className="text-sm">{s.emoji}</span><span className="leading-tight">{s.label}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    {/* App Actions section */}
                                                    <div className="px-4 pt-2 pb-4">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">⚡ App Actions — updates all pages</p>
                                                        <div className="flex flex-col gap-2">
                                                            {actionChips.map((s, i) => (
                                                                <button key={i} type="button" onClick={() => handleChip(s)}
                                                                    className={`flex items-center gap-3 px-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-xs font-black text-gray-700 transition-all active:scale-95 text-left ${colorMap[s.color] || ''}`}>
                                                                    <span className="text-base">{s.emoji}</span>
                                                                    <div>
                                                                        <p className="font-black">{s.label}</p>
                                                                        <p className="text-[10px] font-semibold opacity-60 mt-0.5">
                                                                            {s.type === 'import' && `Save all ${s.rows?.length || 0} rows → Transactions page`}
                                                                            {s.type === 'invest' && `Save all ${s.rows?.length || 0} rows → Investments page`}
                                                                            {s.type === 'fraud-alert' && `Scan & save suspicious rows → Fraud Detection page`}
                                                                            {s.type === 'export' && `Download cleaned & normalized CSV file`}
                                                                        </p>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="flex flex-row items-center">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 mr-4 bg-white text-gray-400 border border-gray-100 shadow-lg shadow-gray-200/30">
                                <Bot size={20} />
                            </div>
                            <div className="px-6 py-5 rounded-[24px] bg-white border border-gray-100 flex items-center gap-2 shadow-xl shadow-gray-200/10">
                                <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.5s]"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions persistent bar */}
            <div className="flex overflow-x-auto gap-3 mb-6 no-scrollbar pb-2 px-1">
                {quickActions.map((action, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleActionClick(action)}
                        className="whitespace-nowrap bg-white border-2 border-transparent text-gray-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:border-primary/20 hover:text-primary hover:bg-blue-50/50 shadow-sm transition-all active:scale-95"
                    >
                        {action}
                    </button>
                ))}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="relative group">
                {/* Options Menu Popup */}
                {showOptionsMenu && (
                    <div className="absolute bottom-full mb-3 left-0 right-0 bg-white rounded-[28px] border border-gray-100 shadow-2xl shadow-gray-200/50 p-5 z-50">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">All Options</span>
                            <button type="button" onClick={() => setShowOptionsMenu(false)} className="p-1 text-gray-400 hover:text-gray-600">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {defaultOptions.map((opt, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => { handleActionClick(opt); setShowOptionsMenu(false); }}
                                    className="text-left px-4 py-3 bg-gray-50 hover:bg-blue-50 hover:text-primary text-gray-700 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                                >
                                    {opt}
                                </button>
                            ))}
                        </div>
                        {/* CSV Upload */}
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Upload Data</p>
                            <button
                                type="button"
                                onClick={() => csvInputRef.current?.click()}
                                className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 border border-indigo-100 text-indigo-700 rounded-2xl text-xs font-black transition-all active:scale-95"
                            >
                                <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Upload size={14} className="text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-black text-indigo-700">Upload CSV File</p>
                                    <p className="text-[10px] text-indigo-400 font-semibold">Bank statement · Transactions</p>
                                </div>
                                <FileText size={16} className="ml-auto text-indigo-300" />
                            </button>
                            <input
                                ref={csvInputRef}
                                type="file"
                                accept=".csv"
                                className="hidden"
                                onChange={handleCSVUpload}
                            />
                            {csvSummary && (
                                <p className="text-[10px] text-indigo-500 font-bold mt-2 text-center">
                                    ✓ {csvSummary.file} · {csvSummary.rows} rows · ₹{csvSummary.total.toFixed(2)}
                                </p>
                            )}
                        </div>
                    </div>
                )}
                <input
                    type="text"
                    placeholder="Ask command: 'Breakdown my spend', 'Undo last', 'Profile'..."
                    className="w-full bg-white rounded-[32px] border-2 border-gray-100/80 py-6 px-10 pr-36 shadow-2xl shadow-gray-200/40 outline-none focus:border-primary/20 focus:ring-[12px] focus:ring-primary/5 transition-all text-sm font-black text-gray-700 placeholder:text-gray-300 placeholder:font-bold"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                {/* Options Button */}
                <button
                    type="button"
                    onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                    className={`absolute right-24 top-4 bottom-4 w-12 rounded-[20px] flex items-center justify-center transition-all active:scale-90 ${showOptionsMenu ? 'bg-primary text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                    <LayoutGrid size={20} />
                </button>
                <button
                    type="submit"
                    className="absolute right-4 top-4 bottom-4 bg-primary text-white w-16 rounded-[24px] flex items-center justify-center hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-200 transition-all active:scale-90"
                >
                    <ArrowUpCircle size={28} />
                </button>
            </form>
        </div>
    );
};

export default ChatPage;
