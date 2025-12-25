import React, { useState } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Hexagon, ChevronDown, Loader2 } from 'lucide-react'; // Added icons for modern feel

export default function Signup() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullName: '',
        collegeId: '',
        email: '',
        password: '',
        section: '',
        course: '' 
    });

    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // --- 🧠 LOGIC: DETECT STREAM FROM ID ---
    const detectStream = (id) => {
        const upperId = id.toUpperCase();
        if (upperId.startsWith('NW')) return 'FACULTY';
        
        const discriminator = upperId.charAt(6);
        if (discriminator === 'A') return 'BSC';   
        if (discriminator === 'B') return 'BTECH'; 
        return 'BTECH';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const studentPattern = /^N\d{2}H\d{2}[AB]\d{4}$/i;
        const facultyPattern = /^NW000\d{4}$/i;
        const isFaculty = facultyPattern.test(formData.collegeId);
        const isStudent = studentPattern.test(formData.collegeId);

        if (!isStudent && !isFaculty) {
            setLoading(false);
            setMessage("❌ Invalid ID. Format: N24H01A0268");
            return;
        }

        const detectedCourse = detectStream(formData.collegeId);
        const finalData = { ...formData, course: detectedCourse };

        try {
            const res = await axios.post(`${API_URL}/api/auth/signup`, finalData);
            setMessage("✅ " + res.data.message);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setMessage("❌ " + (err.response?.data?.message || "Signup Failed"));
        } finally {
            setLoading(false);
        }
    };

    // Helper for Section Options (Styled for Dark Mode)
    const renderSectionOptions = () => {
        const s_batches = [];
        const ib_batches = [];
        for (let i = 1; i <= 10; i++) s_batches.push(<option key={`S${i}`} value={`S${i}`} className="bg-[#121214] text-gray-300">S{i}</option>);
        for (let i = 1; i <= 10; i++) ib_batches.push(<option key={`IB${i}`} value={`IB${i}`} className="bg-[#121214] text-gray-300">IB{i}</option>);
        return (
            <>
                <optgroup label="Standard Sections" className="bg-[#09090b] text-purple-400 font-bold">{s_batches}</optgroup>
                <optgroup label="Internship Batches (IB)" className="bg-[#09090b] text-blue-400 font-bold">{ib_batches}</optgroup>
            </>
        );
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-purple-500/30">
            
            {/* Background Atmosphere */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            </div>

            <div className="w-full max-w-md bg-[#111111]/80 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10">
                
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20">
                        <Hexagon className="text-white fill-white/20" size={24} />
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight">Join NxtVerse</h2>
                    <p className="text-gray-500 text-sm mt-2">Initialize your neural link to the campus grid.</p>
                </div>

                {/* Feedback Message */}
                {message && (
                    <div className={`mb-6 p-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 ${message.includes("✅") ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                        {message}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Full Name */}
                    <div>
                        <input 
                            type="text" 
                            name="fullName" 
                            placeholder="Full Name" 
                            onChange={handleChange} 
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-purple-500 focus:bg-[#0f0f0f] outline-none transition-all" 
                            required 
                        />
                    </div>

                    {/* College ID */}
                    <div>
                        <input 
                            type="text" 
                            name="collegeId" 
                            placeholder="ID Number (e.g. N24H01A0268)" 
                            onChange={handleChange} 
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-purple-500 focus:bg-[#0f0f0f] outline-none transition-all uppercase tracking-wider font-mono" 
                            required 
                        />
                    </div>

                    {/* Section Dropdown (Fixed styling) */}
                    <div className="relative group">
                        <select 
                            name="section" 
                            onChange={handleChange} 
                            defaultValue="" 
                            className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white appearance-none cursor-pointer focus:border-purple-500 focus:bg-[#0f0f0f] outline-none transition-all" 
                            required
                        >
                            <option value="" disabled className="bg-[#121214] text-gray-500">Select Your Section</option>
                            {renderSectionOptions()}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none group-hover:text-purple-400 transition-colors" size={16} />
                    </div>

                    {/* Email */}
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

                    {/* Password */}
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
                        {loading ? <Loader2 className="animate-spin" size={20} /> : "Verify & Join Network"}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-gray-500 text-sm">
                        Already have an account?{' '}
                        <span onClick={() => navigate('/login')} className="text-purple-400 font-bold cursor-pointer hover:text-purple-300 hover:underline transition-all">
                            Login here
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
}