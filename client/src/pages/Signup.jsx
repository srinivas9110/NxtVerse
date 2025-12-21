import React, { useState } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Signup() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: '',
        collegeId: '',
        email: '',
        password: '',
        section: '',
        course: '' // Auto-filled based on ID
    });

    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // --- 🧠 LOGIC TO DETECT STREAM FROM ID ---
    const detectStream = (id) => {
        const upperId = id.toUpperCase();

        // 1. Faculty Check
        if (upperId.startsWith('NW')) return 'FACULTY';

        // 2. Student Check (Based on the 7th character: N24H01[A/B]...)
        // Index 012345[6]
        const discriminator = upperId.charAt(6);

        if (discriminator === 'A') return 'BSC';   // 'A' indicates B.Sc
        if (discriminator === 'B') return 'BTECH'; // 'B' indicates B.Tech

        // Fallback (Should be caught by validation, but just in case)
        return 'BTECH';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        // 1. Validation Regex
        // N + 2 digits + H + 2 digits + [A or B] + 4 digits
        // Example: N24H01A0268
        const studentPattern = /^N\d{2}H\d{2}[AB]\d{4}$/i;
        const facultyPattern = /^NW000\d{4}$/i;

        const isFaculty = facultyPattern.test(formData.collegeId);
        const isStudent = studentPattern.test(formData.collegeId);

        if (!isStudent && !isFaculty) {
            setLoading(false);
            setMessage("❌ Invalid ID. Must contain 'A' (B.Sc) or 'B' (B.Tech).");
            return;
        }

        // 2. Auto-Detect Stream
        const detectedCourse = detectStream(formData.collegeId);

        // Prepare final data payload
        const finalData = {
            ...formData,
            course: detectedCourse // 👈 Auto-filled here (BSC or BTECH)
        };

        try {
            const res = await axios.post(`${API_URL}/api/auth/signup`, finalData);
            setMessage("✅ " + res.data.message);
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setMessage("❌ " + (err.response?.data?.message || "Signup Failed"));
        } finally {
            setLoading(false);
        }
    };

    // Helper for Section Options
    const renderSectionOptions = () => {
        const s_batches = [];
        const ib_batches = [];
        for (let i = 1; i <= 10; i++) s_batches.push(<option key={`S${i}`} value={`S${i}`}>S{i}</option>);
        for (let i = 1; i <= 10; i++) ib_batches.push(<option key={`IB${i}`} value={`IB${i}`}>IB{i}</option>);
        return (
            <>
                <optgroup label="Standard Sections" className="bg-gray-800 text-white">{s_batches}</optgroup>
                <optgroup label="Internship Batches (IB)" className="bg-gray-800 text-white">{ib_batches}</optgroup>
            </>
        );
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-nxt-bg text-white relative overflow-hidden">
            {/* Background Effects */}
            <div className="fixed top-0 left-0 w-96 h-96 bg-nxt-accent opacity-20 blur-[120px] rounded-full -translate-x-1/2 -translate-y-1/2 animate-blob"></div>
            <div className="fixed bottom-0 right-0 w-96 h-96 bg-nxt-purple opacity-20 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2 animate-blob animation-delay-2000"></div>

            <div className="w-full max-w-md glass p-8 rounded-2xl relative z-10 m-4 shadow-2xl shadow-blue-900/20 border border-white/10">
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                        Join NxtVerse
                    </h2>
                    <p className="text-gray-400 text-sm">The exclusive network for our campus.</p>
                </div>

                {message && (
                    <div className={`mb-6 p-3 rounded-lg text-sm font-medium border text-center animate-pulse ${message.includes("✅") ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="group">
                        <input type="text" name="fullName" placeholder="Full Name" onChange={handleChange} className="w-full p-3.5 rounded-xl bg-gray-900/50 border border-white/10 focus:border-nxt-accent focus:bg-gray-900/80 outline-none transition-all placeholder:text-gray-600 text-white" required />
                    </div>

                    <div className="group">
                        <input type="text" name="collegeId" placeholder="ID Number (e.g. N24H01A0268)" onChange={handleChange} className="w-full p-3.5 rounded-xl bg-gray-900/50 border border-white/10 focus:border-nxt-accent focus:bg-gray-900/80 outline-none uppercase placeholder:text-gray-600 text-white transition-all" required />
                    </div>

                    {/* NO STREAM DROPDOWN - Logic handles it */}

                    <div className="relative group">
                        <select name="section" onChange={handleChange} defaultValue="" className="w-full p-3.5 rounded-xl bg-gray-900/50 border border-white/10 focus:border-nxt-accent focus:bg-gray-900/80 outline-none text-white appearance-none cursor-pointer transition-all" required>
                            <option value="" disabled>Select Your Section</option>
                            {renderSectionOptions()}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 group-focus-within:text-nxt-accent transition-colors">▼</div>
                    </div>

                    <div className="group">
                        <input type="email" name="email" placeholder="College Email" onChange={handleChange} className="w-full p-3.5 rounded-xl bg-gray-900/50 border border-white/10 focus:border-nxt-accent focus:bg-gray-900/80 outline-none placeholder:text-gray-600 text-white transition-all" required />
                    </div>

                    <div className="group">
                        <input type="password" name="password" placeholder="Password" onChange={handleChange} className="w-full p-3.5 rounded-xl bg-gray-900/50 border border-white/10 focus:border-nxt-accent focus:bg-gray-900/80 outline-none placeholder:text-gray-600 text-white transition-all" required />
                    </div>

                    <button type="submit" disabled={loading} className="mt-2 w-full bg-gradient-to-r from-nxt-accent to-nxt-purple hover:opacity-90 hover:scale-[1.02] active:scale-95 p-3.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? "Verifying..." : "Verify & Join Network"}
                    </button>
                </form>

                <p className="mt-8 text-center text-sm text-gray-500">
                    Already have an account? <span onClick={() => navigate('/login')} className="text-nxt-accent font-semibold cursor-pointer hover:text-white transition-colors">Login here</span>
                </p>
            </div>
        </div>
    );
}