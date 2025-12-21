import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, UserPlus, Check, Clock, Zap,
    Globe, Users, Layers, ShieldCheck, MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Network() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('global');

    // --- 1. PRESERVED LOGIC: FETCH DATA ---
    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }

            try {
                const meRes = await axios.get(`${API_URL}/api/auth/getuser`, { headers: { "auth-token": token } });
                setCurrentUser(meRes.data);

                const res = await axios.get(`${API_URL}/api/users/fetchall`, { headers: { "auth-token": token } });
                setUsers(res.data);

                setLoading(false);
            } catch (err) { console.error(err); }
        };
        init();
    }, [navigate]);

    // --- 2. PRESERVED LOGIC: CONNECT ---
    const handleConnect = async (targetId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/users/connect/${targetId}`, {}, { headers: { "auth-token": token } });
            setCurrentUser(prev => ({ ...prev, requestsSent: [...prev.requestsSent, targetId] }));
        } catch (err) { alert("Link failed."); }
    };

    // --- 3. FILTERING ---
    if (loading || !currentUser) return (
        <div className="h-screen bg-neutral-950 flex items-center justify-center text-gray-500 font-mono text-xs tracking-widest animate-pulse">
            INITIALIZING NEXUS...
        </div>
    );

    const classmates = users.filter(u =>
        u._id !== currentUser._id &&
        u.role === 'student' &&
        u.course === currentUser.course &&
        u.section === currentUser.section
    );

    const globalUsers = users.filter(u =>
        u._id !== currentUser._id &&
        !classmates.find(c => c._id === u._id)
    );

    const isFaculty = currentUser.role === 'faculty';
    const displayList = (activeTab === 'squad' && !isFaculty) ? classmates : globalUsers;

    const filteredList = displayList.filter(u =>
        u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.collegeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.course && u.course.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-neutral-950 text-white p-6 md:p-12 font-sans selection:bg-indigo-500/30 relative overflow-hidden">

            {/* Background Aesthetics */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-indigo-900/20 rounded-full blur-[120px] opacity-40" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
                    <div>
                        <h1 className="text-5xl font-bold tracking-tight text-white mb-3 flex items-center gap-3">
                            <Globe className="w-10 h-10 text-indigo-500" />
                            The Network
                        </h1>
                        <p className="text-gray-400 max-w-lg text-lg leading-relaxed">
                            Connect with <span className="text-white font-bold">{users.length}</span> active nodes in the campus neural grid.
                        </p>
                    </div>

                    {/* SEARCH CAPSULE */}
                    <div className="relative group w-full md:w-96">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full opacity-20 group-hover:opacity-50 transition duration-500 blur" />
                        <div className="relative flex items-center bg-[#0a0a0a] rounded-full px-5 py-3 border border-white/10">
                            <Search className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                            <input
                                type="text"
                                placeholder="Search Name, ID, or Stream..."
                                className="w-full bg-transparent border-none outline-none text-white ml-3 placeholder-gray-600 text-sm font-medium"
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* --- TOGGLE SWITCH (Student Only) --- */}
                {!isFaculty && (
                    <div className="flex justify-center mb-12">
                        <div className="bg-white/5 backdrop-blur-md p-1.5 rounded-full border border-white/10 flex relative shadow-2xl">
                            <motion.div
                                layout
                                className="absolute top-1.5 bottom-1.5 bg-white/10 rounded-full border border-white/5 shadow-inner"
                                initial={false}
                                animate={{
                                    left: activeTab === 'squad' ? '6px' : '50%',
                                    width: 'calc(50% - 6px)',
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />

                            <button
                                onClick={() => setActiveTab('squad')}
                                className={`relative px-8 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-colors z-10 w-40 justify-center ${activeTab === 'squad' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <Users className="w-4 h-4" /> Squad
                            </button>
                            <button
                                onClick={() => setActiveTab('global')}
                                className={`relative px-8 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-colors z-10 w-40 justify-center ${activeTab === 'global' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <Globe className="w-4 h-4" /> Global
                            </button>
                        </div>
                    </div>
                )}

                {/* --- CARD GRID --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence>
                        {filteredList.map((user, i) => {
                            const isConnected = currentUser.connections.includes(user._id);
                            const isSent = currentUser.requestsSent.includes(user._id);
                            const isReceived = currentUser.requestsReceived.includes(user._id);

                            return (
                                <motion.div
                                    key={user._id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    // 👇 ADDED: OnClick to navigate
                                    onClick={() => navigate(`/profile/${user._id}`)}
                                    // 👇 ADDED: cursor-pointer class
                                    className="group relative bg-[#111111] border border-white/5 rounded-[2rem] p-6 hover:border-indigo-500/30 transition-all shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col items-center text-center overflow-hidden cursor-pointer"
                                >
                                    {/* STATUS PILL */}
                                    <div className="w-full flex justify-between items-start mb-6">
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold border tracking-wider uppercase flex items-center gap-1.5 ${user.role === 'faculty'
                                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                            }`}>
                                            {user.role === 'faculty' ? <ShieldCheck className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                                            {user.role}
                                        </div>
                                    </div>

                                    {/* AVATAR */}
                                    <div className="relative mb-5 group-hover:scale-105 transition-transform duration-500">
                                        <div className="w-24 h-24 rounded-full p-[2px] bg-gradient-to-b from-gray-700 to-gray-900 group-hover:from-indigo-500 group-hover:to-purple-600 transition-colors duration-500">
                                            <div className="w-full h-full rounded-full bg-[#111111] flex items-center justify-center overflow-hidden">
                                                {user.profilePic ? (
                                                    <img src={`http://localhost:5000${user.profilePic}`} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-3xl font-bold text-gray-700 group-hover:text-white transition-colors">
                                                        {user.fullName.charAt(0)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* NAME & ID */}
                                    <div className="w-full px-2 mb-6">
                                        <h3 className="text-lg font-bold text-white mb-1 truncate w-full group-hover:text-indigo-400 transition-colors" title={user.fullName}>
                                            {user.fullName}
                                        </h3>
                                        <p className="text-xs text-gray-500 font-mono tracking-wide">{user.collegeId}</p>
                                    </div>

                                    {/* STATS CAPSULE */}
                                    <div className="w-full grid grid-cols-2 gap-px bg-white/5 rounded-xl border border-white/5 overflow-hidden mb-6">
                                        <div className="py-2.5 px-3 flex items-center justify-center gap-1.5 min-w-0">
                                            <Layers className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                            <span className="text-xs text-gray-400 truncate max-w-full">
                                                {user.course || "N/A"}
                                            </span>
                                        </div>
                                        <div className="py-2.5 px-3 flex items-center justify-center gap-1.5 min-w-0 bg-white/[0.02]">
                                            <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                            <span className="text-xs text-gray-400 truncate max-w-full">
                                                Sec {user.section}
                                            </span>
                                        </div>
                                    </div>

                                    {/* ACTION BUTTON */}
                                    <div className="w-full mt-auto">
                                        {isConnected ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation(); // 👈 Prevent Card Click
                                                    navigate('/messages', { state: { startChat: user } })
                                                }}
                                                className="w-full py-3 rounded-xl bg-white text-black font-bold text-xs hover:bg-gray-200 transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/5"
                                            >
                                                Message
                                            </button>
                                        ) : isSent ? (
                                            <button disabled className="w-full py-3 rounded-xl bg-white/5 text-gray-500 font-bold text-xs border border-white/5 flex items-center justify-center gap-2 cursor-wait">
                                                <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending
                                            </button>
                                        ) : isReceived ? (
                                            <button disabled className="w-full py-3 rounded-xl bg-yellow-500/10 text-yellow-500 font-bold text-xs border border-yellow-500/20 flex items-center justify-center gap-2">
                                                <Check className="w-3.5 h-3.5" /> Accept
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation(); // 👈 Prevent Card Click
                                                    handleConnect(user._id)
                                                }}
                                                className="w-full py-3 rounded-xl bg-white/5 hover:bg-indigo-600 hover:text-white text-gray-300 border border-white/10 hover:border-indigo-500 font-bold text-xs transition-all flex items-center justify-center gap-2 group/btn"
                                            >
                                                <UserPlus className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                                                Link
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {filteredList.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 opacity-30">
                        <Users className="w-20 h-20 text-gray-500 mb-6" />
                        <p className="text-xl text-gray-400 font-light">No signals found in this sector.</p>
                    </div>
                )}
            </div>
        </div>
    );
}