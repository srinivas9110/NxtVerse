import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import axios from 'axios';
import {
    LayoutGrid, Users, Calendar,
    LogOut, User, Bell, X,
    Video, FolderOpen, Trophy, MessageSquare, Brain,
    Target, Plus, Trash2, Check, Menu, Rocket,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Layout() {
    const location = useLocation();
    const navigate = useNavigate();

    // States
    const [user, setUser] = useState({ name: "Student", section: "...", role: "student", profilePic: null});
    const [requests, setRequests] = useState([]);
    const [notifications, setNotifications] = useState([]); // 🟢 NEW State
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [activeUsers, setActiveUsers] = useState(1);

    // Calendar Form State
    const [newEvent, setNewEvent] = useState({ title: '', date: '' });
    const [calendarTab, setCalendarTab] = useState('academic');

    // Widgets
    const [showCalendar, setShowCalendar] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Pulse
    const [pulseIndex, setPulseIndex] = useState(0);
    const pulseMessages = ["NxtVerse Networking", `${activeUsers} PEERS ACTIVE`, "Digital Campus"];

    const calendarRef = useRef(null);
    const notifRef = useRef(null);

    // Effects
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target)) setShowCalendar(false);
            if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifications(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => setPulseIndex(p => (p + 1) % pulseMessages.length), 4000);
        return () => clearInterval(interval);
    }, [pulseMessages.length]); 

    // DATA FETCHING
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // 1. Get User Data (Includes Notifications)
            const fetchUserData = () => {
                axios.get(`${API_URL}/api/auth/getuser`, { headers: { "auth-token": token } })
                    .then(res => {
                        setUser({ name: res.data.fullName, section: res.data.section || "S1", role: res.data.role, profilePic: res.data.profilePic });
                        // 🟢 Load Notifications from User Object
                        if(res.data.notifications) setNotifications(res.data.notifications.reverse());
                    })
                    .catch(() => { });
            };

            // 2. Fetch Requests
            const fetchReqs = () => {
                axios.get(`${API_URL}/api/users/requests/pending`, { headers: { "auth-token": token } })
                    .then(res => setRequests(res.data)).catch(() => { });
            };

            const fetchActiveCount = () => {
                axios.get(`${API_URL}/api/auth/active-count`).then(res => setActiveUsers(res.data.count)).catch(() => { });
            };

            fetchUserData();
            fetchReqs();
            fetchActiveCount();

            const reqInterval = setInterval(() => { fetchReqs(); fetchUserData(); }, 10000);
            const countInterval = setInterval(fetchActiveCount, 30000);

            return () => { clearInterval(reqInterval); clearInterval(countInterval); };
        }
    }, []);

    useEffect(() => {
        if (showCalendar) {
            const token = localStorage.getItem('token');
            axios.get(`${API_URL}/api/calendar/fetchall`, { headers: { "auth-token": token } })
                .then(res => setCalendarEvents(res.data)).catch(() => { });
        }
    }, [showCalendar]);

    // Handlers
    const handleAccept = async (id) => {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/api/users/accept/${id}`, {}, { headers: { "auth-token": token } });
        setRequests(prev => prev.filter(r => r._id !== id));
    };

    const handleReject = async (id) => {
        const token = localStorage.getItem('token');
        await axios.post(`${API_URL}/api/users/reject/${id}`, {}, { headers: { "auth-token": token } });
        setRequests(prev => prev.filter(r => r._id !== id));
    };

    const handleAddEvent = async () => {
        if (!newEvent.title || !newEvent.date) return;
        const token = localStorage.getItem('token');
        const payload = { ...newEvent, type: calendarTab };
        const res = await axios.post(`${API_URL}/api/calendar/add`, payload, { headers: { "auth-token": token } });
        setCalendarEvents([res.data, ...calendarEvents]);
        setNewEvent({ title: '', date: '' });
    };

    const handleDeleteEvent = async (id) => {
        const token = localStorage.getItem('token');
        await axios.delete(`${API_URL}/api/calendar/delete/${id}`, { headers: { "auth-token": token } });
        setCalendarEvents(prev => prev.filter(e => e._id !== id));
    };

    // Add this inside Layout component
const handleClearNotification = async (notifId) => {
    try {
        const token = localStorage.getItem('token');
        // Optimistically remove from UI
        setNotifications(prev => prev.filter(n => n._id !== notifId));
        // Call Backend
        await axios.delete(`${API_URL}/api/auth/notifications/${notifId}`, { headers: { "auth-token": token } });
    } catch (err) { console.error("Failed to clear notification"); }
};

    const isActive = (path) => location.pathname === path;
    const getImg = (path) => (!path ? null : (path.startsWith('http') ? path : `${API_URL}${path}`));

    // Combine for Counter
    const totalNotifications = requests.length + notifications.length;

    return (
        <div className="flex min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30 hide-scrollbar">
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#09090b] border-r border-white/5 transform transition-transform duration-300 md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-16 flex items-center gap-3 px-6 border-b border-white/5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <span className="font-bold text-white">N</span>
                    </div>
                    <span className="font-bold text-lg tracking-tight">NxtVerse</span>
                    <button onClick={() => setMobileMenuOpen(false)} className="md:hidden ml-auto text-gray-500"><X size={20} /></button>
                </div>
                <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-8rem)] hide-scrollbar">
                    <NavItem to="/dashboard" icon={<LayoutGrid size={18} />} label="Lobby" active={isActive('/dashboard')} />
                    <NavItem to="/network" icon={<Users size={18} />} label="Peers" active={isActive('/network')} />
                    <NavItem to="/hackathons" icon={<Trophy size={18} />} label="Hackathons" active={isActive('/hackathons')} />
                    <NavItem to="/study-rooms" icon={<Video size={18} />} label="Focus Pods" active={isActive('/study-rooms')} />
                    <NavItem to="/messages" icon={<MessageSquare size={18} />} label="Chat" active={isActive('/messages')} />
                    <NavItem to="/resources" icon={<FolderOpen size={18} />} label="Vault" active={isActive('/resources')} />
                    <NavItem to="/arise" icon={<Rocket size={18} />} label="Arise" active={isActive('/arise')} />
                    <NavItem to="/events" icon={<Calendar size={18} />} label="Events" active={isActive('/events')} />
                    <NavItem to="/clubs" icon={<Target size={18} />} label="Clubs" active={isActive('/clubs')} />
                    <NavItem to="/verse-iq" icon={<Brain size={18} />} label="Verse IQ" active={isActive('/verseIQ')} />
                    <div className="my-4 h-px bg-white/5" />
                    <NavItem to="/profile" icon={<User size={18} />} label="Profile" active={isActive('/profile')} />
                </nav>
                <div className="absolute bottom-0 w-full p-4 border-t border-white/5 bg-[#09090b]">
                    <button onClick={() => { localStorage.removeItem('token'); navigate('/login'); }} className="flex items-center gap-3 text-gray-400 hover:text-red-400 w-full px-3 py-2 rounded-lg transition-colors">
                        <LogOut size={18} /> <span className="text-sm font-medium">Logout Verse</span>
                    </button>
                </div>
            </aside>

            <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
                <div className="h-16 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-40 border-b border-white/5 flex items-center justify-between px-4 md:px-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setMobileMenuOpen(true)} className="md:hidden text-gray-400"><Menu size={24} /></button>
                        <div className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                            <div className="w-2 h-2 bg-[#6b21a8] rounded-full animate-pulse shadow-[0_0_8px_#a855f7]" />
                            <div className="overflow-hidden h-4 w-32 relative">
                                <AnimatePresence mode="wait">
                                    <motion.span key={pulseIndex} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} className="absolute inset-0 flex items-center text-[10px] font-mono font-bold text-gray-300 tracking-widest">
                                        {pulseMessages[pulseIndex]}
                                    </motion.span>
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 ml-auto">
                        <div className="relative" ref={calendarRef}>
                            <button onClick={() => { setShowCalendar(!showCalendar); setShowNotifications(false); }} className={`p-2 rounded-full transition-all ${showCalendar ? 'text-purple-400 bg-purple-500/10' : 'text-gray-400 hover:text-white'}`}>
                                <Calendar size={20} />
                            </button>
                            {showCalendar && (
                                <div className="absolute right-0 mt-4 w-80 bg-[#121214] border border-white/10 rounded-2xl shadow-2xl p-4 z-50 overflow-hidden">
                                    <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-sm text-white">Calendar</h3></div>
                                    <div className="flex p-1 bg-white/5 rounded-lg mb-4">
                                        <button onClick={() => setCalendarTab('academic')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${calendarTab === 'academic' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}>Academic</button>
                                        <button onClick={() => setCalendarTab('non-academic')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${calendarTab === 'non-academic' ? 'bg-purple-600 text-white' : 'text-gray-500'}`}>Non-Academic</button>
                                    </div>
                                    {user.role === 'faculty' && (
                                        <div className="mb-4 space-y-2 bg-white/5 p-3 rounded-xl border border-white/5">
                                            <input placeholder="Event Title" className="w-full bg-black/40 p-2 rounded text-xs text-white border border-white/10 outline-none focus:border-purple-500" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
                                            <div className="flex gap-2">
                                                <input type="date" className="bg-black/40 p-1.5 rounded text-xs text-white border border-white/10 outline-none flex-1" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} />
                                                <button onClick={handleAddEvent} className="bg-purple-600 text-white px-3 rounded text-xs font-bold"><Plus size={14} /></button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                                        {calendarEvents.filter(e => e.type === calendarTab).map(e => (
                                            <div key={e._id} className="p-3 rounded-xl bg-white/5 flex justify-between group hover:border-white/10">
                                                <div><p className="text-xs font-bold text-white">{e.title}</p><p className="text-[10px] text-gray-500 font-mono mt-0.5">{new Date(e.date).toLocaleDateString()}</p></div>
                                                {user.role === 'faculty' && <button onClick={() => handleDeleteEvent(e._id)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {showNotifications && (
    <div className="absolute right-0 mt-4 w-80 bg-[#121214] border border-white/10 rounded-2xl shadow-2xl p-4 z-50">
        <h3 className="font-bold text-sm mb-3">Signals</h3>
        <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
            
            {/* 1. EMPTY STATE */}
            {totalNotifications === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">No pending signals.</p>
            )}

            {/* 2. POD INVITES LIST (From 'notifications' state) */}
            {notifications.map((n, i) => (
                <div key={n._id || i} className="p-3 rounded-xl bg-white/5 border border-white/5 mb-2">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white">
                            {n.senderName ? n.senderName[0] : 'I'}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white">{n.senderName}</p>
                            <p className="text-[10px] text-gray-500">{n.message}</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2">
                        {/* JOIN BUTTON */}
                        <button 
                            onClick={() => {
                                setShowNotifications(false);
                                handleClearNotification(n._id); // Auto-Delete on Join
                                navigate('/study-rooms', { state: { autoJoin: true, podData: n.data } }); 
                            }} 
                            className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all"
                        >
                            <Rocket size={12} /> Join
                        </button>

                        {/* IGNORE BUTTON */}
                        <button 
                            onClick={() => handleClearNotification(n._id)} 
                            className="px-3 py-1.5 bg-white/10 hover:bg-red-500/20 hover:text-red-400 text-gray-400 text-xs font-bold rounded-lg transition-all"
                            title="Ignore Request"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>
            ))}

            {/* 3. CONNECTION REQUESTS LIST (From 'requests' state) */}
            {requests.map(r => (
                <div key={r._id} className="p-3 rounded-xl bg-white/5 flex items-center justify-between border border-white/5 mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                            {r.fullName ? r.fullName[0] : 'U'}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-white">{r.fullName}</p>
                            <p className="text-[10px] text-gray-500">Connection Request</p>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={() => handleAccept(r._id)} className="p-1.5 bg-green-500/20 text-green-500 rounded hover:bg-green-500 hover:text-black transition-all">
                            <Check size={14} />
                        </button>
                        <button onClick={() => handleReject(r._id)} className="p-1.5 bg-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white transition-all">
                            <X size={14} />
                        </button>
                    </div>
                </div>
            ))}

        </div>
    </div>
)}
                        <Link to="/profile" className="flex items-center gap-3 pl-4 border-l border-white/10">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-white leading-none">{user.name}</p>
                                <p className="text-[10px] text-gray-500">{user.role === 'faculty' ? 'Faculty' : `Student • ${user.section}`}</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 p-[2px]">
                                <div className="w-full h-full rounded-full bg-[#050505] flex items-center justify-center font-bold text-xs overflow-hidden">
                                    {user.profilePic ? <img src={getImg(user.profilePic)} alt="profile" className="w-full h-full object-cover" /> : <span className="text-white">{user.name.charAt(0)}</span>}
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
                <main className="flex-1 overflow-x-hidden"><Outlet /></main>
            </div>
        </div>
    );
}

function NavItem({ to, icon, label, active }) {
    return (
        <Link to={to} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-1 ${active ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            {icon} <span className="text-sm font-medium">{label}</span>
        </Link>
    );
}