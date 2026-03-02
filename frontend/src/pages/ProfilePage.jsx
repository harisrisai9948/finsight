import { useState, useEffect } from 'react';
import { User, Mail, DollarSign, PieChart, Save } from 'lucide-react';
import { getProfile, updateProfile } from '../api/financeService';

const ProfilePage = () => {
    const [profile, setProfile] = useState({
        name: 'John Doe',
        email: 'john@example.com',
        salary: 5000,
        budgetLimit: 4000
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await getProfile();
                if (res) setProfile(res);
            } catch (err) {
                console.error('Profile fetch failed:', err);
            }
        };
        fetchProfile();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        try {
            await updateProfile(profile);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Update failed:', err);
            alert('Update failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-10 border-l-4 border-primary pl-4">
                <h1 className="text-3xl font-bold text-gray-900 ">User Profile</h1>
                <p className="text-gray-500 mt-2">Manage your account settings and financial preferences.</p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
                <div className="bg-primary h-32 relative">
                    <div className="absolute -bottom-12 left-10">
                        <div className="w-24 h-24 bg-white rounded-3xl shadow-md flex items-center justify-center border-4 border-white text-primary">
                            <User size={48} />
                        </div>
                    </div>
                </div>

                <div className="pt-16 pb-12 px-10">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                    <User size={16} className="mr-2 text-primary" /> Full Name
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                    value={profile.name}
                                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                    <Mail size={16} className="mr-2 text-primary" /> Email Address
                                </label>
                                <input
                                    type="email"
                                    disabled
                                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 cursor-not-allowed font-medium text-gray-500"
                                    value={profile.email}
                                />
                            </div>
                            <div>
                                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                    <DollarSign size={16} className="mr-2 text-primary" /> Monthly Salary (₹)
                                </label>
                                <input
                                    type="number"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                    value={profile.salary}
                                    onChange={(e) => setProfile({ ...profile, salary: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                                    <PieChart size={16} className="mr-2 text-primary" /> Monthly Budget Limit (₹)
                                </label>
                                <input
                                    type="number"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                                    value={profile.budgetLimit}
                                    onChange={(e) => setProfile({ ...profile, budgetLimit: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                            {success && (
                                <span className="text-green-500 font-medium px-4 py-2 bg-green-50 rounded-full text-sm animate-pulse">
                                    ✓ Profile updated successfully
                                </span>
                            )}
                            <button
                                type="submit"
                                disabled={loading}
                                className={`ml-auto bg-primary text-white px-10 py-4 rounded-2xl font-bold flex items-center hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <Save size={20} className="mr-2" />
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
