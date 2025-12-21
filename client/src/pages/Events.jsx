import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import {
    Play, Plus, X, Calendar, MapPin,
    Check, ChevronRight, Volume2, VolumeX, Trash2,
    ChevronDown, Users, Search, Shield, UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import YouTube from 'react-youtube';

// Helper: Extract YouTube ID
const getYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

// --- SUB-COMPONENT: EVENT MANAGER MODAL ---
const EventManager = ({ eventId, onClose, userRole }) => {
    const [data, setData] = useState(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    // Fetch full list of names/roll numbers when modal opens
    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await axios.get(`${API_URL}/api/events/${eventId}/participants`, { headers: { "auth-token": token } });
                setData(res.data);
                setLoading(false);
            } catch (err) { alert("Failed to load dashboard"); }
        };
        fetchData();
    }, [eventId]);

    // Action: Promote to Organizer
    const handlePromote = async (studentId) => {
        const token = localStorage.getItem('token');
        await axios.put(`${API_URL}/api/events/promote/${eventId}`, { studentId }, { headers: { "auth-token": token } });
        // Optimistic Update
        setData(prev => ({ ...prev, organizers: [...prev.organizers, { _id: studentId }] }));
    };

    // Action: Mark Present
    const handleCheckIn = async (studentId) => {
        const token = localStorage.getItem('token');
        await axios.put(`${API_URL}/api/events/checkin/${eventId}`, { studentId }, { headers: { "auth-token": token } });
        // Optimistic Update
        setData(prev => {
            const isPresent = prev.present.some(p => p._id === studentId || p === studentId);
            const newPresent = isPresent
                ? prev.present.filter(p => p !== studentId && p._id !== studentId)
                : [...prev.present, studentId];
            return { ...prev, present: newPresent };
        });
    };

    if (loading) return <div className="p-8 text-white">Loading Dashboard...</div>;

    // Filter list based on search
    const filteredAttendees = data.attendees.filter(u =>
        u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.collegeId.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="bg-[#09090b] border border-white/10 rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#111]">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {data.title} <span className="text-xs bg-purple-600 px-2 py-0.5 rounded text-white">Dashboard</span>
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">{data.attendees.length} Registered • {data.present.length} Checked In</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-gray-400"><X size={20} /></button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-white/10">
                    <div className="bg-[#18181b] flex items-center gap-3 px-4 py-2 rounded-lg border border-white/5">
                        <Search size={16} className="text-gray-500" />
                        <input
                            className="bg-transparent text-sm text-white w-full outline-none"
                            placeholder="Search by Name or ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {filteredAttendees.map(student => {
                        const isOrganizer = data.organizers.some(o => o._id === student._id);
                        const isPresent = data.present.some(p => p === student._id || p._id === student._id);

                        return (
                            <div key={student._id} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isPresent ? 'bg-green-500/10 border-green-500/20' : 'bg-[#121214] border-white/5'}`}>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-200">{student.fullName}</h4>
                                    <p className="text-xs text-gray-500 font-mono">{student.collegeId} • Sec {student.section}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Organizer Badge / Button */}
                                    {userRole === 'faculty' && (
                                        <button
                                            onClick={() => handlePromote(student._id)}
                                            disabled={isOrganizer}
                                            className={`p-2 rounded-md transition-colors ${isOrganizer ? 'text-yellow-500 cursor-default' : 'text-gray-600 hover:text-yellow-500 hover:bg-yellow-500/10'}`}
                                            title="Make Organizer"
                                        >
                                            <Shield size={16} fill={isOrganizer ? "currentColor" : "none"} />
                                        </button>
                                    )}

                                    {/* Attendance Toggle */}
                                    <button
                                        onClick={() => handleCheckIn(student._id)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${isPresent ? 'bg-green-500 text-black' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                    >
                                        <UserCheck size={14} />
                                        {isPresent ? "Present" : "Mark"}
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                    {filteredAttendees.length === 0 && <div className="text-center text-gray-500 text-sm mt-10">No participants found.</div>}
                </div>
            </div>
        </div>
    );
}

export default function Events() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [heroEvent, setHeroEvent] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // UI States
    const [showModal, setShowModal] = useState(false);
    const [showCatDropdown, setShowCatDropdown] = useState(false);

    // 🆕 Management Modal State
    const [manageEventId, setManageEventId] = useState(null);

    // Audio Engine
    const [player, setPlayer] = useState(null);
    const [isMuted, setIsMuted] = useState(true);

    // Form
    const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', location: '', category: 'Tech', videoUrl: '' });
    const categories = ['Tech', 'Cultural', 'Sports', 'Academic'];

    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }
            try {
                const userRes = await axios.get('http://localhost:5000/api/auth/getuser', { headers: { "auth-token": token } });
                setUser(userRes.data);

                const eventRes = await axios.get('http://localhost:5000/api/events/fetchall', { headers: { "auth-token": token } });
                const sorted = eventRes.data.sort((a, b) => new Date(a.date) - new Date(b.date));
                setEvents(sorted);

                const upcoming = sorted.filter(e => new Date(e.date) >= new Date().setHours(0, 0, 0, 0));
                const hero = upcoming.find(e => e.videoUrl) || upcoming[0];
                setHeroEvent(hero);
                setLoading(false);
            } catch (err) { console.error(err); }
        };
        init();
    }, [navigate]);

    // Audio Toggle
    const toggleAudio = () => {
        if (!player) return;
        if (isMuted) { player.unMute(); setIsMuted(false); }
        else { player.mute(); setIsMuted(true); }
    };
    const onPlayerReady = (event) => { setPlayer(event.target); event.target.mute(); event.target.playVideo(); };

    // Handlers
    const handleBroadcast = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/events/add', newEvent, { headers: { "auth-token": token } });
            window.location.reload();
        } catch (err) { alert("Signal Failed"); }
    };

    const handleRSVP = async (eventId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`http://localhost:5000/api/events/rsvp/${eventId}`, {}, { headers: { "auth-token": token } });
            const updatedEvents = events.map(e => e._id === eventId ? res.data : e);
            setEvents(updatedEvents);
            if (heroEvent && heroEvent._id === eventId) setHeroEvent(res.data);
        } catch (err) { alert("Connection Error"); }
    };

    const handleDelete = async (eventId) => {
        if (!window.confirm("Are you sure you want to delete this event?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`http://localhost:5000/api/events/delete/${eventId}`, { headers: { "auth-token": token } });
            const filtered = events.filter(e => e._id !== eventId);
            setEvents(filtered);
            if (heroEvent._id === eventId) setHeroEvent(filtered[0] || null);
        } catch (err) { alert("Failed to delete"); }
    };

    if (loading) return <div className="bg-[#050505] min-h-screen text-white p-10">Loading Stream...</div>;

    const techEvents = events.filter(e => e.category === 'Tech');
    const culturalEvents = events.filter(e => e.category === 'Cultural');
    const sportsEvents = events.filter(e => e.category === 'Sports');

    // YouTube Config
    const videoId = getYoutubeId(heroEvent?.videoUrl);
    const playerOpts = { height: '100%', width: '100%', playerVars: { autoplay: 1, controls: 0, rel: 0, showinfo: 0, mute: 1, loop: 1, playlist: videoId, modestbranding: 1 } };

    return (
        <div className="bg-[#050505] min-h-screen text-white overflow-x-hidden pb-20">
            {/* 1. HERO SECTION */}
            {heroEvent && (
                <div className="relative h-[85vh] w-full overflow-hidden group bg-black">
                    <div className="absolute inset-0 z-0 pointer-events-none scale-[1.35]">
                        {videoId ? <YouTube videoId={videoId} opts={playerOpts} onReady={onPlayerReady} className="w-full h-full" iframeClassName="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-tr from-purple-900 to-black"></div>}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/60 to-transparent"></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent"></div>
                    </div>
                    {videoId && <button onClick={toggleAudio} className="absolute top-24 right-8 z-30 p-3 bg-black/40 border border-white/20 rounded-full text-white hover:bg-white/10 transition-all backdrop-blur-md">{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>}

                    <div className="absolute bottom-32 left-8 md:left-16 z-10 max-w-2xl">
                        <div className="flex items-center gap-3 mb-4 animate-in slide-in-from-left duration-700">
                            <span className="px-3 py-1 bg-purple-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm">Featured Transmission</span>
                            <span className="text-gray-300 text-sm font-bold flex items-center gap-2"><Calendar size={14} /> {new Date(heroEvent.date).toLocaleDateString()}</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black mb-4 leading-tight drop-shadow-2xl animate-in slide-in-from-bottom duration-1000">{heroEvent.title}</h1>
                        <p className="text-lg text-gray-200 mb-8 line-clamp-3 drop-shadow-md max-w-xl animate-in fade-in duration-1000 delay-300">{heroEvent.description}</p>

                        <div className="flex items-center gap-4 animate-in fade-in duration-1000 delay-500">
                            <button onClick={() => handleRSVP(heroEvent._id)} className={`px-8 py-3 rounded-md font-bold text-lg flex items-center gap-3 transition-all ${heroEvent.attendees.includes(user._id) ? 'bg-white/20 text-white border border-white/50 hover:bg-white/30' : 'bg-white text-black hover:bg-gray-200'}`}>
                                {heroEvent.attendees.includes(user._id) ? <Check size={24} /> : <Play size={24} fill="currentColor" />}
                                {heroEvent.attendees.includes(user._id) ? 'Signal Locked' : 'Register Now'}
                            </button>

                            {/* Manage Button for Hero (If Faculty or Organizer) */}
                            {(user.role === 'faculty' || heroEvent.organizers?.includes(user._id)) && (
                                <button onClick={() => setManageEventId(heroEvent._id)} className="p-3 bg-black/50 text-white border border-white/20 rounded-md hover:bg-white/10">
                                    <Users size={24} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 2. ROWS */}
            <div className={`relative z-20 px-8 md:px-16 space-y-12 ${heroEvent ? '-mt-24' : 'pt-24'}`}>
                {user?.role === 'faculty' && (
                    <div className="flex justify-end mb-4">
                        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded font-bold transition-all shadow-lg shadow-purple-600/20"><Plus size={18} /> Transmit New Signal</button>
                    </div>
                )}
                {/* Passing setManageEventId to rows so cards can trigger modal */}
                <EventRow title="Trending Signals" events={events.slice(0, 5)} user={user} onRSVP={handleRSVP} onDelete={handleDelete} onManage={setManageEventId} />
                <EventRow title="Tech Frequency" events={techEvents} user={user} onRSVP={handleRSVP} onDelete={handleDelete} onManage={setManageEventId} />
                <EventRow title="Cultural Vibes" events={culturalEvents} user={user} onRSVP={handleRSVP} onDelete={handleDelete} onManage={setManageEventId} />
                <EventRow title="Sports & Action" events={sportsEvents} user={user} onRSVP={handleRSVP} onDelete={handleDelete} onManage={setManageEventId} />
            </div>

            {/* 3. BROADCAST MODAL */}
            {showModal && (<div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4"><div className="bg-[#09090b] p-8 rounded-xl w-full max-w-lg relative border border-white/10 shadow-2xl"><button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X /></button><h2 className="text-2xl font-bold mb-6">Transmit Signal</h2><form onSubmit={handleBroadcast} className="space-y-4"><div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase ml-1">Title</label><input className="w-full bg-[#121214] border border-white/10 p-3 rounded text-white outline-none focus:border-purple-500 transition-colors" placeholder="Event Title" onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} required /></div><div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase ml-1">YouTube URL (Trailer)</label><input className="w-full bg-[#121214] border border-white/10 p-3 rounded text-white outline-none focus:border-purple-500 transition-colors" placeholder="https://youtube.com/..." onChange={e => setNewEvent({ ...newEvent, videoUrl: e.target.value })} /></div><div className="grid grid-cols-2 gap-4"><div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase ml-1">Date</label><input type="date" style={{ colorScheme: "dark" }} className="w-full bg-[#121214] border border-white/10 p-3 rounded text-white outline-none focus:border-purple-500 transition-colors cursor-pointer" onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} required /></div><div className="space-y-1 relative"><label className="text-xs font-bold text-gray-500 uppercase ml-1">Frequency</label><div className="w-full bg-[#121214] border border-white/10 p-3 rounded text-white cursor-pointer flex justify-between items-center hover:border-white/30 transition-all" onClick={() => setShowCatDropdown(!showCatDropdown)}>{newEvent.category}<ChevronDown size={16} className={`transition-transform ${showCatDropdown ? 'rotate-180' : ''}`} /></div>{showCatDropdown && (<div className="absolute top-full left-0 w-full mt-2 bg-[#121214] border border-white/10 rounded-xl overflow-hidden shadow-xl z-50">{categories.map(cat => (<div key={cat} onClick={() => { setNewEvent({ ...newEvent, category: cat }); setShowCatDropdown(false); }} className={`p-3 text-sm font-bold cursor-pointer hover:bg-white/5 transition-colors ${newEvent.category === cat ? 'text-purple-500' : 'text-gray-400'}`}>{cat}</div>))}</div>)}</div></div><div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase ml-1">Coordinates</label><input className="w-full bg-[#121214] border border-white/10 p-3 rounded text-white outline-none focus:border-purple-500 transition-colors" placeholder="Location" onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} required /></div><div className="space-y-1"><label className="text-xs font-bold text-gray-500 uppercase ml-1">Payload</label><textarea className="w-full bg-[#121214] border border-white/10 p-3 rounded text-white outline-none focus:border-purple-500 transition-colors resize-none h-24" placeholder="Description..." onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} required /></div><button className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded font-bold transition-all shadow-lg shadow-purple-600/20">Broadcast</button></form></div></div>)}

            {/* 🆕 4. EVENT MANAGER MODAL */}
            {manageEventId && (
                <EventManager
                    eventId={manageEventId}
                    onClose={() => setManageEventId(null)}
                    userRole={user.role}
                />
            )}
        </div>
    );
}

// --- UPDATED ROW COMPONENT ---
function EventRow({ title, events, user, onRSVP, onDelete, onManage }) {
    if (events.length === 0) return null;
    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-200 flex items-center gap-2 group cursor-pointer hover:text-white transition-colors">
                {title} <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-500" />
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {events.map(event => (
                    <div key={event._id} className="snap-start shrink-0 w-[280px] bg-[#18181b] rounded-md overflow-hidden group relative hover:scale-105 transition-transform duration-300 border border-white/5 hover:border-white/20 hover:z-50 hover:shadow-2xl">
                        <div className="h-40 bg-gray-800 relative overflow-hidden">
                            {event.videoUrl ? <img src={`https://img.youtube.com/vi/${getYoutubeId(event.videoUrl)}/hqdefault.jpg`} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="thumbnail" /> : <div className={`w-full h-full bg-gradient-to-br ${event.category === 'Tech' ? 'from-purple-800 to-black' : event.category === 'Cultural' ? 'from-pink-800 to-black' : 'from-green-800 to-black'}`}></div>}
                            <span className="absolute top-2 left-2 text-[8px] font-bold uppercase tracking-widest bg-black/60 backdrop-blur-sm px-2 py-1 rounded-sm border border-white/10">{event.category}</span>

                            <div className="absolute top-2 right-2 flex gap-2">
                                {/* MANAGE BUTTON (Settings Icon) */}
                                {(user?.role === 'faculty' || event.organizers?.includes(user?._id)) && (
                                    <button onClick={(e) => { e.stopPropagation(); onManage(event._id); }} className="p-1.5 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20" title="Manage Event">
                                        <Users size={14} />
                                    </button>
                                )}
                                {/* DELETE BUTTON */}
                                {user?.role === 'faculty' && (
                                    <button onClick={(e) => { e.stopPropagation(); onDelete(event._id); }} className="p-1.5 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700" title="Delete Event">
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="p-4">
                            <h4 className="font-bold text-white truncate mb-1">{event.title}</h4>
                            <div className="flex items-center gap-3 text-xs text-gray-400 mb-3"><span className="text-green-400 font-bold">98% Match</span><span>{new Date(event.date).toLocaleDateString()}</span></div>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mb-4"><MapPin size={12} /> {event.location}</p>
                            <button onClick={() => onRSVP(event._id)} className={`w-full py-2 rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors ${event.attendees.includes(user?._id) ? 'bg-white/10 text-white' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-600/20'}`}>
                                {event.attendees.includes(user?._id) ? <Check size={14} /> : <Plus size={14} />}
                                {event.attendees.includes(user?._id) ? 'Added to List' : 'Register'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}