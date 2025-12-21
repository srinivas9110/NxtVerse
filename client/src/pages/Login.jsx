import React, { useState } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

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
            // If this line is missing, the Dashboard will kick you out.
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
        <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white relative overflow-hidden">

            {/* Background Glow */}
            <div className="fixed top-1/2 left-1/2 w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

            <div className="w-full max-w-md bg-[#18181b] border border-white/5 p-8 rounded-2xl relative z-10 shadow-2xl">

                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                        Welcome Back
                    </h1>
                    <p className="text-gray-400 text-sm">Login to access your NxtVerse dashboard.</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="group">
                        <input
                            type="email" name="email" placeholder="College Email" onChange={handleChange}
                            className="w-full p-3.5 rounded-xl bg-black/20 border border-white/10 focus:border-purple-500 outline-none transition-all placeholder:text-gray-600 text-white" required
                        />
                    </div>

                    <div className="group">
                        <input
                            type="password" name="password" placeholder="Password" onChange={handleChange}
                            className="w-full p-3.5 rounded-xl bg-black/20 border border-white/10 focus:border-purple-500 outline-none placeholder:text-gray-600 text-white transition-all" required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 p-3.5 rounded-xl font-bold transition-all disabled:opacity-50"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-gray-500">
                    Don't have an account? <Link to="/" className="text-purple-400 hover:text-white transition-colors">Sign up</Link>
                </p>
            </div>
        </div>
    );
}