import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';
import axios from 'axios';
import {
    Sword, Shield, Zap, Trophy, Crown,
    ChevronRight, Activity, X, CheckCircle2,
    AlertTriangle, Ghost, Flame, Skull
} from 'lucide-react';

// --- SOLO LEVELING STYLE HELPERS ---
const getRankStyle = (rank) => {
    switch (rank) {
        case 'S-Rank': return { color: 'text-yellow-400', border: 'border-yellow-500', shadow: 'shadow-yellow-500/50', bg: 'bg-yellow-500/10' };
        case 'A-Rank': return { color: 'text-gray-200', border: 'border-gray-300', shadow: 'shadow-gray-400/50', bg: 'bg-gray-400/10' };
        case 'B-Rank': return { color: 'text-blue-400', border: 'border-blue-500', shadow: 'shadow-blue-500/50', bg: 'bg-blue-500/10' };
        default: return { color: 'text-gray-500', border: 'border-gray-700', shadow: 'shadow-none', bg: 'bg-white/5' };
    }
};

const getShadowBadge = (count) => {
    if (count >= 50) return { name: "BERU", icon: <Crown className="w-3 h-3" />, color: "bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_#9333ea]" };
    if (count >= 20) return { name: "IGRIS", icon: <Sword className="w-3 h-3" />, color: "bg-red-700 text-white border-red-500 shadow-[0_0_15px_#dc2626]" };
    if (count >= 5) return { name: "TANK", icon: <Shield className="w-3 h-3" />, color: "bg-blue-900 text-blue-200 border-blue-700" };
    return { name: "INFANTRY", icon: <Ghost className="w-3 h-3" />, color: "bg-gray-800 text-gray-400 border-gray-600" };
};

const ArisePage = () => {
    const [user, setUser] = useState(null); // Real User Data
    const [dungeons, setDungeons] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);

    // Quiz State
    const [activeDungeon, setActiveDungeon] = useState(null);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [resultData, setResultData] = useState(null); // Store server response

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            // 1. Get User Profile
            const userRes = await axios.get(`${API_URL}/api/auth/getuser`, { headers: { "auth-token": token } });
            setUser(userRes.data);

            // 2. Get Gates
            const gateRes = await axios.get(`${API_URL}/api/arise/dungeons`, { headers: { "auth-token": token } });
            setDungeons(gateRes.data.dungeons);

            // 3. Get Leaderboard
            const leaderRes = await axios.get(`${API_URL}/api/arise/leaderboard`, { headers: { "auth-token": token } });
            setLeaderboard(leaderRes.data);

            setLoading(false);
        } catch (err) { console.error(err); setLoading(false); }
    };

    // Helper to fix image paths
    const getImg = (path) => {
        if (!path) return null;
        return (path.startsWith('http') || path.startsWith('blob')) ? path : `${API_URL}${path}`;
    };

    const enterDungeon = (dungeon) => {
        // Architect Mode Bypass
        if (user.role === 'faculty') {
            if (!window.confirm("ARCHITECT MODE: Entering simulation. Scores will not be saved.")) return;
        }
        setActiveDungeon(dungeon);
        setCurrentQIndex(0);
        setScore(0);
        setShowResult(false);
        setResultData(null);
    };

    const handleAnswer = (optionIndex) => {
        if (optionIndex === activeDungeon.questions[currentQIndex].correct) {
            setScore(prev => prev + 1);
        }

        if (currentQIndex + 1 < activeDungeon.questions.length) {
            setTimeout(() => setCurrentQIndex(prev => prev + 1), 200);
        } else {
            setTimeout(submitDungeon, 500);
        }
    };

    const submitDungeon = async () => {
        setShowResult(true);

        if (user.role === 'faculty') return; // Architects don't submit

        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${API_URL}/api/arise/clear/${activeDungeon._id}`, {
                score: score, 
                totalQuestions: activeDungeon.questions.length
            }, { headers: { "auth-token": token } });

            setResultData(res.data);
            fetchData(); // Refresh stats
        } catch (err) { console.error(err); }
    };

    if (loading) return <div className="min-h-screen bg-black text-blue-500 font-mono flex items-center justify-center">INITIALIZING SYSTEM...</div>;

    const rankStyle = getRankStyle(user.rank);
    const shadowBadge = getShadowBadge(user.shadows);

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans overflow-hidden selection:bg-purple-500/30">

            {/* Ambient Aura */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-7xl mx-auto p-6 md:p-8 relative z-10">

                {/* --- HEADER: HUNTER PROFILE --- */}
                <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-8 mb-8 gap-6 relative">

                    {user.role === 'faculty' && (
                        <Link to="/arise-admin" className="absolute top-0 right-0 z-50">
                            <button className="flex items-center gap-2 px-4 py-2 bg-red-900/20 border border-red-500/50 text-red-500 rounded hover:bg-red-500 hover:text-white transition-all text-xs font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                <Activity className="w-4 h-4" /> Architect Console
                            </button>
                        </Link>
                    )}

                    <div className="flex items-center gap-6 pt-8 md:pt-0">
                        {/* Avatar Frame (Updated with Profile Pic Logic) */}
                        <div className={`w-24 h-24 rounded-xl border-2 ${rankStyle.border} shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden group bg-black`}>
                            {user.profilePic ? (
                                <img src={getImg(user.profilePic)} alt="Hunter Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-gray-700">
                                    {user.fullName.charAt(0)}
                                </div>
                            )}
                            {/* Shadow Badge Overlay */}
                            <div className={`absolute bottom-0 w-full ${shadowBadge.color} text-[8px] font-bold text-center py-0.5 tracking-widest flex items-center justify-center gap-1`}>
                                {shadowBadge.icon} {shadowBadge.name}
                            </div>
                        </div>

                        <div>
                            <div className="flex flex-col gap-1 mb-2">
                                <p className="text-[10px] font-mono text-blue-500 tracking-[0.2em] uppercase opacity-80 animate-pulse">
                                    ARISE - THE SYSTEM NEEDS YOU TO LEVEL UP
                                </p>
                                <h1 className="text-4xl font-bold tracking-tighter text-white uppercase">
                                    {user.fullName}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded text-[10px] font-bold tracking-widest border ${rankStyle.border} ${rankStyle.color} bg-black`}>
                                        {user.rank.toUpperCase()}
                                    </span>
                                    <span className="text-[10px] text-gray-500 border border-gray-800 px-2 py-1 rounded flex items-center gap-1">
                                        <Ghost className="w-3 h-3" /> Army: {user.shadows}
                                    </span>
                                    <span className="text-[10px] text-gray-500 border border-gray-800 px-2 py-1 rounded flex items-center gap-1">
                                        <Zap className="w-3 h-3" /> Lvl: {user.level}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* --- LEFT: DIMENSIONAL GATES (8 Cols) --- */}
                    <div className="lg:col-span-8">
                        <h2 className="text-xl font-bold text-gray-400 mb-6 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-500" /> ACTIVE GATES
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {dungeons.length === 0 ? (
                                <div className="col-span-2 text-center py-12 border border-dashed border-gray-800 rounded-2xl text-gray-600 font-mono">
                                    NO GATES DETECTED IN PROXIMITY.
                                </div>
                            ) : (
                                dungeons.map((dungeon) => {
                                    const isCleared = user.clearedDungeons.includes(dungeon._id);
                                    const rankColor = dungeon.rank.includes('E') ? 'gray' : dungeon.rank.includes('B') ? 'blue' : 'red';

                                    return (
                                        <motion.div
                                            key={dungeon._id}
                                            whileHover={{ y: -5 }}
                                            onClick={() => enterDungeon(dungeon)}
                                            className={`relative h-48 bg-[#0a0a0a] border border-white/5 rounded-xl p-6 flex flex-col justify-between overflow-hidden cursor-pointer group hover:border-${rankColor}-500/50 transition-all`}
                                        >
                                            {/* Glow Effect */}
                                            <div className={`absolute inset-0 bg-gradient-to-br from-${rankColor}-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                                            <div>
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border border-${rankColor}-500/30 text-${rankColor}-400 bg-black`}>
                                                        {dungeon.rank}
                                                    </span>
                                                    {isCleared && <CheckCircle2 className="text-green-500 w-4 h-4" />}
                                                </div>
                                                <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors truncate">{dungeon.title}</h3>
                                            </div>

                                            <div className="relative z-10 flex justify-between items-end">
                                                <div className="text-xs font-mono text-gray-500 flex items-center gap-1">
                                                    <Skull className="w-3 h-3" /> {dungeon.questions.length} Enemies
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] text-gray-600 uppercase tracking-wider">Reward</span>
                                                    <span className="text-sm font-bold text-blue-400">{dungeon.xpReward} XP</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* --- RIGHT: LEADERBOARD (4 Cols) --- */}
                    <div className="lg:col-span-4">
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 sticky top-6">
                            <h3 className="text-sm font-bold text-gray-400 mb-6 flex items-center gap-2 uppercase tracking-widest">
                                <Trophy className="w-4 h-4 text-yellow-500" /> National Rankings
                            </h3>

                            <div className="space-y-4">
                                {leaderboard.map((hunter, i) => (
                                    <div key={hunter._id} className="flex items-center gap-3 pb-3 border-b border-white/5 last:border-0 group">
                                        <div className={`w-8 font-mono font-bold text-lg text-center ${i === 0 ? 'text-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' : 'text-gray-600'}`}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1">
                                            <div className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors flex items-center gap-2">
                                                {hunter.fullName}
                                                {/* Show Icon for Top Rankers */}
                                                {i === 0 && <Crown className="w-3 h-3 text-yellow-500" />}
                                            </div>
                                            <div className="text-[10px] text-gray-500 uppercase flex gap-2">
                                                <span>{hunter.rank}</span>
                                                <span className="text-purple-500">Shadows: {hunter.shadows}</span>
                                            </div>
                                        </div>
                                        <div className="text-xs font-mono text-blue-500">{hunter.xp} XP</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* --- QUIZ MODAL (THE DUNGEON) --- */}
            <AnimatePresence>
                {activeDungeon && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
                    >
                        <div className="w-full max-w-3xl">
                            {!showResult ? (
                                <div className="bg-[#0a0a0a] border border-blue-900/30 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-[0_0_50px_rgba(30,58,138,0.2)]">
                                    {/* Progress Bar */}
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gray-900">
                                        <motion.div
                                            className="h-full bg-blue-600 shadow-[0_0_10px_#2563eb]"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${((currentQIndex + 1) / activeDungeon.questions.length) * 100}%` }}
                                        />
                                    </div>

                                    <div className="flex justify-between items-center mb-8 mt-2">
                                        <span className="text-blue-500 font-mono text-xs tracking-widest uppercase animate-pulse">
                                            Gate: {activeDungeon.title}
                                        </span>
                                        <span className="text-gray-500 font-mono text-xs">
                                            Enemy {currentQIndex + 1} / {activeDungeon.questions.length}
                                        </span>
                                    </div>

                                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-10 leading-tight">
                                        {activeDungeon.questions[currentQIndex].q}
                                    </h3>

                                    <div className="space-y-4">
                                        {activeDungeon.questions[currentQIndex].options.map((opt, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleAnswer(idx)}
                                                className="w-full text-left p-5 rounded-xl bg-white/5 hover:bg-blue-600 hover:text-white border border-transparent hover:border-blue-400 transition-all duration-200 text-gray-300 group flex items-center justify-between"
                                            >
                                                <span className="flex items-center gap-4">
                                                    <span className="w-6 h-6 rounded border border-gray-600 group-hover:border-white flex items-center justify-center text-[10px] group-hover:text-white">
                                                        {String.fromCharCode(65 + idx)}
                                                    </span>
                                                    {opt}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => setActiveDungeon(null)} className="absolute top-6 right-6 p-2 text-gray-600 hover:text-white"><X className="w-6 h-6" /></button>
                                </div>
                            ) : (
                                // --- RESULT SCREEN ---
                                <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl p-12 text-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-transparent pointer-events-none" />

                                    {/* Score Logic Display */}
                                    {score / activeDungeon.questions.length > 0.5 ? (
                                        <>
                                            <div className="inline-block p-4 rounded-full bg-yellow-500/10 border border-yellow-500/50 mb-6 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                                                <Crown className="w-12 h-12 text-yellow-500" />
                                            </div>
                                            <h2 className="text-4xl font-bold text-white mb-2 tracking-tight">DUNGEON CLEARED</h2>
                                            <p className="text-blue-400 font-mono mb-8">
                                                {resultData?.msg || "Calculating Rewards..."}
                                            </p>

                                            {resultData && resultData.xpGained > 0 && (
                                                <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8">
                                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                                        <div className="text-xs text-gray-500 uppercase">XP Gained</div>
                                                        <div className="text-xl font-bold text-blue-400">+{resultData.xpGained}</div>
                                                    </div>
                                                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                                        <div className="text-xs text-gray-500 uppercase">Accuracy</div>
                                                        <div className="text-xl font-bold text-white">{Math.round((score / activeDungeon.questions.length) * 100)}%</div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            <div className="inline-block p-4 rounded-full bg-red-500/10 border border-red-500/50 mb-6 shadow-[0_0_30px_rgba(220,38,38,0.2)]">
                                                <Skull className="w-12 h-12 text-red-500" />
                                            </div>
                                            <h2 className="text-4xl font-bold text-red-500 mb-2 tracking-tight">YOU DIED</h2>
                                            <p className="text-gray-500 font-mono mb-8">The system requires greater strength.</p>
                                        </>
                                    )}

                                    <button onClick={() => { setActiveDungeon(null); fetchData(); }} className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors uppercase tracking-widest">
                                        Return to Lobby
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default ArisePage;