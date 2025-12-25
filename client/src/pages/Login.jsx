import React, { useState } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Hexagon, Loader2 } from 'lucide-react'; // Matches Signup iconography

export default function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Send Login Request
            const res = await axios.post(`${API_URL}/api/auth/login`, formData);

            // 2. CRITICAL STEP: Save the Token!
            localStorage.setItem('token', res.data.token);

            // 3. Go to Dashboard
            navigate('/dashboard');

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Login Failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-purple-500/30">

            {/* Background Atmosphere (Matches Signup) */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            </div>

            <div className="w-full max-w-md bg-[#111111]/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20">
                        <Hexagon className="text-white fill-white/20" size={24} />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
                    <p className="text-gray-500 text-sm mt-2">Re-establish your connection to NxtVerse.</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 bg-red-500/10 border-red-500/20 text-red-400">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email Input */}
                    <div>
                        <input
                            type="email" 
                            name="email" 
                            placeholder="College Email" 
                            onChange={handleChange}
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-purple-500 focus:bg-[#0f0f0f] outline-none transition-all" 
                            required
                        />
                    </div>

                    {/* Password Input */}
                    <div>
                        <input
                            type="password" 
                            name="password" 
                            placeholder="Password" 
                            onChange={handleChange}
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-purple-500 focus:bg-[#0f0f0f] outline-none transition-all" 
                            required
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : "Login"}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-gray-500 text-sm">
                        Don't have an account?{' '}
                        <span onClick={() => navigate('/')} className="text-purple-400 font-bold cursor-pointer hover:text-purple-300 hover:underline transition-all">
                            Sign up
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
}