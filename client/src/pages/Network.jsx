import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, UserPlus, Check, Clock, Zap,
    Globe, Users, Layers, ShieldCheck, MapPin, MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Network() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('global');

    // --- 1. FETCH DATA ---
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

    // --- 2. CONNECT LOGIC ---
    const handleConnect = async (targetId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/users/connect/${targetId}`, {}, { headers: { "auth-token": token } });
            // Optimistic Update
            setCurrentUser(prev => ({ ...prev, requestsSent: [...prev.requestsSent, targetId] }));
        } catch (err) { alert("Link failed."); }
    };

    // --- 3. FILTERING ---
    if (loading || !currentUser) return (
        <div className="h-screen bg-[#050505] flex items-center justify-center text-purple-500 font-mono text-xs tracking-widest animate-pulse">
            INITIALIZING NEURAL NET...
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
        <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans selection:bg-purple-500/30 relative overflow-hidden">

            {/* Background Aesthetics */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">

                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
                    <div>
                        <h1 className="text-5xl font-bold tracking-tight text-white mb-3 flex items-center gap-3">
                            <Globe className="w-10 h-10 text-purple-500" />
                            Neural Network
                        </h1>
                        <p className="text-gray-400 max-w-lg text-lg leading-relaxed">
                            Connect with <span className="text-white font-bold">{users.length}</span> active nodes in the campus grid.
                        </p>
                    </div>

                    {/* SEARCH CAPSULE */}
                    <div className="relative group w-full md:w-96">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full opacity-20 group-hover:opacity-50 transition duration-500 blur" />
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
                                className="absolute top-1.5 bottom-1.5 bg-purple-500/20 rounded-full border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.3)]"
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
                                    onClick={() => navigate(`/profile/${user._id}`)}
                                    // ✨ THE NEON CARD STYLE ✨
                                    className="group relative bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-6 hover:border-purple-500/50 transition-all shadow-xl hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] flex flex-col items-center text-center overflow-hidden cursor-pointer"
                                >
                                    
                                    {/* STATUS PILL (Top Left - Matching Screenshot) */}
                                    <div className="w-full flex justify-start mb-6">
                                        <div className={`px-3 py-1 rounded-full text-[10px] font-bold border tracking-widest uppercase flex items-center gap-1.5 ${user.role === 'faculty'
                                            ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                            : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                            }`}>
                                            {user.role === 'faculty' ? <ShieldCheck className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                                            {user.role}
                                        </div>
                                    </div>

                                    {/* AVATAR (Circular with Gradient Ring) */}
                                    <div className="relative mb-5 group-hover:scale-105 transition-transform duration-500">
                                        <div className="w-24 h-24 rounded-full p-[2px] bg-gradient-to-br from-purple-500 to-blue-600 shadow-lg shadow-purple-900/40">
                                            <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                                                {user.profilePic ? (
                                                    <img src={`${API_URL}${user.profilePic}`} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-3xl font-bold text-white group-hover:text-purple-300 transition-colors">
                                                        {user.fullName.charAt(0)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* NAME & ID */}
                                    <div className="w-full px-2 mb-6">
                                        <h3 className="text-lg font-bold text-white mb-1 truncate w-full group-hover:text-purple-400 transition-colors" title={user.fullName}>
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
                                                    e.stopPropagation();
                                                    navigate('/messages', { state: { startChat: user } })
                                                }}
                                                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" /> Message
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
                                                    e.stopPropagation();
                                                    handleConnect(user._id)
                                                }}
                                                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 hover:border-purple-500/50 font-bold text-xs transition-all flex items-center justify-center gap-2 group/btn"
                                            >
                                                <UserPlus className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                                                Link Node
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