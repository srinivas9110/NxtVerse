import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import {
    Calendar, Megaphone, Trophy, Trash2,
    AlertTriangle, Radio, X, Star,
    Filter, Users, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
    const [user, setUser] = useState({ fullName: "Student", role: "student", course: "All" });
    const [announcements, setAnnouncements] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    // 🎛️ UI State
    const [activeTab, setActiveTab] = useState('All');
    const [favCategory, setFavCategory] = useState(localStorage.getItem('favCategory') || ''); // ⭐ Load Favorite
    const [showPostModal, setShowPostModal] = useState(false);

    // 📝 Forms
    const [newPost, setNewPost] = useState({ message: '', category: 'General', priority: 'Normal', targetAudience: 'All' });

    useEffect(() => {
        fetchData();
        // ⭐ Auto-switch to favorite tab if one exists
        if (favCategory && ['Hackathon', 'Academic', 'Club'].includes(favCategory)) {
            setActiveTab(favCategory);
        }
    }, []);

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
            const userRes = await axios.get(`${API_URL}/api/auth/getuser`, { headers: { "auth-token": token } });
            setUser(userRes.data);

            const annRes = await axios.get(`${API_URL}/api/announcements/fetchall`, { headers: { "auth-token": token } });
            setAnnouncements(annRes.data);

            const eventRes = await axios.get(`${API_URL}/api/calendar/fetchall`, { headers: { "auth-token": token } });
            setEvents(eventRes.data);

            setLoading(false);
        } catch (err) { console.error(err); setLoading(false); }
    };

    // ⭐ Handle Favorite Toggle
    const toggleFavorite = (category, e) => {
        e.stopPropagation(); // Prevent tab switching when clicking star
        if (favCategory === category) {
            // Un-favorite
            setFavCategory('');
            localStorage.removeItem('favCategory');
        } else {
            // Set new Favorite
            setFavCategory(category);
            localStorage.setItem('favCategory', category);
        }
    };

    const handlePostAnnouncement = async () => {
        if (!newPost.message) return alert("Message is required");
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/announcements/add`, {
                ...newPost, targetAudience: [newPost.targetAudience]
            }, { headers: { "auth-token": token } });

            setShowPostModal(false);
            setNewPost({ message: '', category: 'General', priority: 'Normal', targetAudience: 'All' });
            fetchData();
        } catch (err) { alert("Failed to post"); }
    };

    const handleDeleteAnnouncement = async (id) => {
        if (!window.confirm("Delete this post?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/announcements/delete/${id}`, { headers: { "auth-token": token } });
            setAnnouncements(prev => prev.filter(a => a._id !== id));
        } catch (err) { alert("Failed"); }
    };

    const handleDeleteEvent = async (id) => {
        if (!window.confirm("Remove this event?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/calendar/delete/${id}`, { headers: { "auth-token": token } });
            setEvents(prev => prev.filter(e => e._id !== id));
        } catch (err) { alert("Failed"); }
    };

    const getGreeting = () => {
        const h = new Date().getHours();
        return h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
    };

    const filteredAnnouncements = activeTab === 'All'
        ? announcements
        : announcements.filter(a => a.category === activeTab);

    const criticalAlerts = announcements.filter(a => a.priority === 'Critical');

    if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-gray-500 font-mono animate-pulse">Initializing Command Center...</div>;

    return (
        <div className="min-h-screen bg-[#050505] p-6 text-white font-sans relative overflow-hidden">
            <div className="fixed top-0 left-0 w-full h-[500px] bg-gradient-to-b from-purple-900/10 to-transparent pointer-events-none" />

            <div className="max-w-7xl mx-auto relative z-10 space-y-8">

                {/* 1. CRITICAL TICKER */}
                <AnimatePresence>
                    {criticalAlerts.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 animate-pulse">
                            <AlertTriangle className="text-red-500" size={20} />
                            <div className="flex-1 overflow-hidden">
                                <p className="text-red-400 font-bold text-sm truncate">CRITICAL UPDATE: {criticalAlerts[0].message}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 2. GREETING HEADER */}
                <div className="bg-[#121214] border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full group-hover:bg-purple-500/20 transition-all" />
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-4">
                        <div>
                            <h1 className="text-5xl font-bold mb-3 tracking-tight">
                                {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">{user.fullName.split(' ')[0]}</span>
                            </h1>
                            <p className="text-gray-400 text-sm font-medium italic tracking-wide">
                                "Welcome to NxtVerse - The Next Universe you dive into."
                            </p>
                        </div>
                        {user.role === 'faculty' && (
                            <button onClick={() => setShowPostModal(true)} className="bg-white text-black px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-200 transition-all shadow-lg">
                                <Megaphone size={18} /> Post Update
                            </button>
                        )}
                    </div>
                </div>

                {/* 3. MAIN WORKSPACE */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* LEFT COLUMN (70%) - FEED */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* ⭐ TABS WITH STAR FAVORITE */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-2">
                            {['All', 'Hackathon', 'Academic', 'Club'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`relative px-5 py-2.5 rounded-xl text-sm font-bold transition-all border flex items-center gap-2
                                    ${activeTab === tab ? 'bg-white text-black border-white' : 'bg-[#121214] text-gray-500 border-white/10 hover:text-white'}`}
                                >
                                    {tab}
                                    {tab !== 'All' && (
                                        <div
                                            onClick={(e) => toggleFavorite(tab, e)}
                                            className={`p-0.5 rounded-full transition-all hover:bg-white/20 ${favCategory === tab ? 'text-yellow-500' : 'text-gray-600 hover:text-yellow-400'}`}
                                            title="Mark as Favorite"
                                        >
                                            <Star size={12} fill={favCategory === tab ? "currentColor" : "none"} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Feed List */}
                        <div className="space-y-4">
                            {filteredAnnouncements.length === 0 ? (
                                <div className="text-center py-20 bg-[#121214] rounded-3xl border border-dashed border-white/10">
                                    <Radio size={48} className="mx-auto text-gray-800 mb-4" />
                                    <p className="text-gray-600 font-mono text-sm">No transmissions on this frequency.</p>
                                </div>
                            ) : (
                                filteredAnnouncements.map((ann, i) => (
                                    <motion.div
                                        key={ann._id}
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                        className={`relative bg-[#121214] border ${ann.priority === 'Critical' ? 'border-red-500/40 bg-red-500/5' : 'border-white/5'} p-6 rounded-3xl group hover:border-white/10 transition-all`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-5">
                                                {/* Icon Badge */}
                                                <div className={`mt-1 min-w-[48px] h-12 rounded-2xl flex items-center justify-center 
                                                    ${ann.category === 'Hackathon' ? 'bg-purple-500/10 text-purple-400' :
                                                        ann.category === 'Academic' ? 'bg-blue-500/10 text-blue-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                                    {ann.category === 'Hackathon' ? <Trophy size={20} /> : <Megaphone size={20} />}
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 border border-white/10 px-2 py-0.5 rounded-md">{ann.category}</span>
                                                        {ann.targetAudience.includes('All') ?
                                                            <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded-md">All Students</span> :
                                                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-md">{ann.targetAudience.join(', ')}</span>
                                                        }
                                                    </div>
                                                    <p className="text-gray-200 text-sm leading-relaxed font-normal">{ann.message}</p>
                                                    <div className="flex items-center gap-2 mt-3 text-xs text-gray-600">
                                                        <span>Posted by <span className="text-gray-400">{ann.postedBy}</span></span>
                                                        <span>•</span>
                                                        <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Faculty Delete */}
                                            {user.role === 'faculty' && (
                                                <button onClick={() => handleDeleteAnnouncement(ann._id)} className="text-gray-700 hover:text-red-500 p-2 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 size={18} /></button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* RIGHT COLUMN (30%) - UPCOMING EVENTS ONLY */}
                    <div className="space-y-6">
                        <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 h-fit sticky top-6">
                            <h3 className="font-bold text-gray-200 mb-6 flex items-center gap-2"><Calendar size={18} className="text-blue-500" /> Upcoming Events</h3>

                            <div className="relative border-l border-white/10 ml-2 space-y-8 pl-6 pb-2">
                                {events.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-xs text-gray-600 italic">No events scheduled.</p>
                                    </div>
                                ) : (
                                    events.slice(0, 5).map((evt) => (
                                        <div key={evt._id} className="relative group">
                                            {/* Dot */}
                                            <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-[#121214] border border-gray-600 group-hover:border-blue-500 group-hover:bg-blue-500 transition-all"></div>

                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-[10px] font-bold text-blue-500 uppercase mb-0.5 block">{new Date(evt.date).toLocaleDateString('default', { month: 'short', day: 'numeric' })}</span>
                                                    <h4 className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">{evt.title}</h4>
                                                    <span className="text-[10px] text-gray-600 capitalize">{evt.type}</span>
                                                </div>
                                                {user.role === 'faculty' && (
                                                    <button onClick={() => handleDeleteEvent(evt._id)} className="text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL: POST UPDATE */}
            {showPostModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#18181b] border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-2xl relative">
                        <button onClick={() => setShowPostModal(false)} className="absolute top-4 right-4 text-gray-600 hover:text-white"><X size={20} /></button>
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Megaphone size={20} className="text-purple-500" /> New Transmission</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-1.5 block ml-1">Message</label>
                                <textarea
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-purple-500 transition-all resize-none h-32"
                                    placeholder="Type your announcement here..."
                                    value={newPost.message}
                                    onChange={e => setNewPost({ ...newPost, message: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1.5 block ml-1">Category</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" onChange={e => setNewPost({ ...newPost, category: e.target.value })}>
                                        <option value="General">General</option>
                                        <option value="Hackathon">Hackathon</option>
                                        <option value="Academic">Academic</option>
                                        <option value="Club">Club</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 uppercase font-bold mb-1.5 block ml-1">Priority</label>
                                    <select className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm outline-none" onChange={e => setNewPost({ ...newPost, priority: e.target.value })}>
                                        <option value="Normal">Normal</option>
                                        <option value="Critical">Critical (Red)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-gray-500 uppercase font-bold mb-2 block ml-1">Target Audience</label>
                                <div className="flex gap-2">
                                    {['All', 'B.Sc', 'B.Tech'].map(aud => (
                                        <button
                                            key={aud}
                                            onClick={() => setNewPost({ ...newPost, targetAudience: aud })}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${newPost.targetAudience === aud ? 'bg-white text-black border-white' : 'bg-transparent text-gray-500 border-white/10 hover:border-white/30'}`}
                                        >
                                            {aud}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={handlePostAnnouncement} className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold text-white shadow-lg mt-2 hover:opacity-90 transition-all">
                                Transmit Update
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}