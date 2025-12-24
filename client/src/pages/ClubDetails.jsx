import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import axios from 'axios';
import YouTube from 'react-youtube';
import {
    Calendar, MapPin, Clock, Trash2, Plus, X,
    Send, Link as LinkIcon, ExternalLink, Image as ImageIcon,
    Users, Shield, CheckCircle, Search, ArrowLeft, MessageSquare, Star, Zap, Settings, PlayCircle, CheckSquare
} from 'lucide-react';

const getYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

// ... (FeedbackModal Component stays exactly the same) ...
const FeedbackModal = ({ onClose, onSubmit, submitting }) => {
    const [metrics, setMetrics] = useState({ pacing: '', clarity: '', vibe: '', overall: '' });

    const Options = ({ label, options, field }) => (
        <div className="mb-6">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{label}</label>
            <div className="flex gap-2">
                {options.map(opt => (
                    <button
                        key={opt}
                        onClick={() => setMetrics({ ...metrics, [field]: opt })}
                        className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${metrics[field] === opt
                            ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20'
                            : 'bg-[#18181b] border-white/5 text-gray-400 hover:bg-white/5'
                            }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );

    const isComplete = metrics.pacing && metrics.clarity && metrics.vibe && metrics.overall;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#09090b] border border-white/10 w-full max-w-sm rounded-3xl p-6 relative animate-in zoom-in-95">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20} /></button>
                <h2 className="text-xl font-bold text-white mb-1">Quick Check-in</h2>
                <p className="text-gray-400 text-sm mb-6">How was the session? Be honest.</p>

                <Options label="🧠 Pacing" field="pacing" options={['Too Slow', 'Perfect', 'Too Fast']} />
                <Options label="💎 Clarity" field="clarity" options={['Confusing', 'Clear', 'Mind-blowing']} />
                <Options label="🔥 Vibe Check" field="vibe" options={['Sleepy', 'Okay', 'Hype']} />

                <div className="mb-8">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Overall Verdict</label>
                    <div className="flex gap-3">
                        <button onClick={() => setMetrics({ ...metrics, overall: '👍' })} className={`flex-1 py-4 rounded-xl text-2xl border transition-all ${metrics.overall === '👍' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-[#18181b] border-white/5 grayscale opacity-50'}`}>👍</button>
                        <button onClick={() => setMetrics({ ...metrics, overall: '👎' })} className={`flex-1 py-4 rounded-xl text-2xl border transition-all ${metrics.overall === '👎' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-[#18181b] border-white/5 grayscale opacity-50'}`}>👎</button>
                    </div>
                </div>

                <button
                    onClick={() => onSubmit(metrics)}
                    disabled={!isComplete || submitting}
                    className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {submitting ? "Sending..." : "Submit Feedback"}
                </button>
            </div>
        </div>
    );
};

export default function ClubDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Data
    const [club, setClub] = useState(null);
    const [workshops, setWorkshops] = useState([]);
    const [posts, setPosts] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // UI
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState('events');
    const [newPost, setNewPost] = useState({ caption: '', link: '' });
    const [newWorkshop, setNewWorkshop] = useState({ title: '', date: '', time: '', venue: '', description: '' });
    const [uploading, setUploading] = useState(false);
    const [showFeedbackModal, setShowFeedbackModal] = useState(null);
    const [statusMenuOpen, setStatusMenuOpen] = useState(null); // Which workshop's menu is open

    // Dashboard Modal
    const [dashboardModal, setDashboardModal] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [dashboardTab, setDashboardTab] = useState('attendees');

    // 1. Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            try {
                const userRes = await axios.get(`${API_URL}/api/auth/getuser`, { headers: { "auth-token": token } });
                setUser(userRes.data);
                const res = await axios.get(`${API_URL}/api/clubs/${id}`, { headers: { "auth-token": token } });
                setClub(res.data.club);
                setWorkshops(res.data.workshops);
                setLoading(false);
            } catch (err) { console.error(err); }
        };
        fetchData();
    }, [id]);

    // 2. Fetch Posts (Unchanged)
    useEffect(() => {
        if (activeTab === 'feed') {
            const fetchPosts = async () => {
                const token = localStorage.getItem('token');
                try {
                    const res = await axios.get(`${API_URL}/api/clubs/${id}/posts`, { headers: { "auth-token": token } });
                    setPosts(res.data);
                } catch (err) { console.error(err); }
            };
            fetchPosts();
        }
    }, [activeTab, id]);

    // --- WORKSHOP ACTIONS ---

    const handleUpdateStatus = async (workshopId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${API_URL}/api/clubs/workshop/${workshopId}/status`, { status: newStatus }, { headers: { "auth-token": token } });
            
            // Optimistic Update
            setWorkshops(workshops.map(w => w._id === workshopId ? { ...w, status: newStatus } : w));
            setStatusMenuOpen(null);
        } catch (err) { alert("Failed to update status"); }
    };

    const handleAddWorkshop = async () => {
        if (!newWorkshop.title || !newWorkshop.date) return alert("Title and Date required!");
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/clubs/workshop/add`, { ...newWorkshop, clubId: id }, { headers: { "auth-token": token } });
            window.location.reload();
        } catch (err) { alert("Failed to add workshop"); }
    };

    const handleDeleteWorkshop = async (workshopId) => {
        if (!window.confirm("Delete this workshop?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/clubs/workshop/${workshopId}`, { headers: { "auth-token": token } });
            setWorkshops(workshops.filter(w => w._id !== workshopId));
        } catch (err) { alert("Failed to delete"); }
    };

    const handleRegister = async (workshopId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/clubs/workshop/${workshopId}/register`, {}, { headers: { "auth-token": token } });
            alert(res.data.message);
            window.location.reload();
        } catch (err) { alert(err.response?.data?.error || "Error registering"); }
    };

    const submitFeedback = async (metrics) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/clubs/workshop/${showFeedbackModal}/feedback`, metrics, { headers: { "auth-token": token } });
            setShowFeedbackModal(null);
            alert("Feedback Sent! 🏆");
            window.location.reload();
        } catch (err) { alert("Failed to send feedback"); }
    };

    // --- DASHBOARD & FEED ACTIONS (Unchanged from previous) ---
    const handleMarkAttendance = async (workshopId, studentId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${API_URL}/api/clubs/workshop/${workshopId}/attendance`, { studentId }, { headers: { "auth-token": token } });
            const updatedData = res.data;
            setWorkshops(workshops.map(w => w._id === workshopId ? updatedData : w));
            setDashboardModal(updatedData);
        } catch (err) { alert("Attendance Failed"); }
    };

    const handleToggleOrganizer = async (workshopId, studentId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`${API_URL}/api/clubs/workshop/${workshopId}/organizer`, { studentId }, { headers: { "auth-token": token } });
            const updatedData = res.data;
            setWorkshops(workshops.map(w => w._id === workshopId ? updatedData : w));
            setDashboardModal(updatedData);
        } catch (err) { alert(err.response?.data?.error || "Failed to update"); }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        e.target.value = null;
        if (!file.type.startsWith('image/')) return alert("Upload only images directly. For videos, paste a link!");
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", import.meta.env.VITE_UPLOAD_PRESET);
        formData.append("cloud_name", import.meta.env.VITE_CLOUD_NAME);
        try {
            const res = await axios.post(`https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUD_NAME}/image/upload`, formData);
            setNewPost({ ...newPost, link: res.data.secure_url });
        } catch (err) { alert("Upload failed"); }
        finally { setUploading(false); }
    };

    const handlePostSubmit = async () => {
        if (!newPost.caption) return;
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/clubs/${id}/post`, newPost, { headers: { "auth-token": token } });
            setPosts([res.data, ...posts]);
            setNewPost({ caption: '', link: '' });
        } catch (err) { alert("Failed to post"); }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Delete this post?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/clubs/post/${postId}`, { headers: { "auth-token": token } });
            setPosts(posts.filter(p => p._id !== postId));
        } catch (err) { alert("Failed to delete"); }
    };

    if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Club HQ...</div>;

    const bannerVideoId = getYoutubeId(club.videoUrl || 'https://www.youtube.com/watch?v=2i8s1c2j9Q0');
    const isPresident = user && club.president?._id === user._id;
    const isFaculty = user?.role === 'faculty';

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans" onClick={() => setStatusMenuOpen(null)}>

            {/* 1. HERO */}
            <div className="w-full h-[50vh] relative overflow-hidden bg-black group">
                <button onClick={() => navigate('/clubs')} className="absolute top-6 left-6 z-30 p-3 bg-black/50 backdrop-blur-md rounded-full hover:bg-white/10 text-white transition-all">
                    <ArrowLeft size={20} />
                </button>
                <div className="absolute inset-0 pointer-events-none opacity-60 scale-[1.35]">
                    <YouTube videoId={bannerVideoId} opts={{ height: '100%', width: '100%', playerVars: { autoplay: 1, controls: 0, mute: 1, loop: 1, playlist: bannerVideoId, showinfo: 0 } }} className="w-full h-full" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent"></div>
                <div className="absolute bottom-0 w-full px-8 pb-10 flex items-end gap-6 z-20">
                    <div className="w-24 h-24 bg-[#18181b] rounded-2xl p-1 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
                        {club.logo ? <img src={club.logo} className="w-full h-full object-cover rounded-xl" alt="logo" /> : <span className="text-3xl font-bold text-purple-500">{club.name[0]}</span>}
                    </div>
                    <div className="flex-1 mb-2">
                        <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tight text-white">{club.name}</h1>
                        <p className="text-gray-300 max-w-2xl text-lg">{club.description}</p>
                    </div>
                </div>
            </div>

            {/* 2. TABS */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="flex gap-8 border-b border-white/10 mb-8">
                    <button onClick={() => setActiveTab('events')} className={`pb-4 font-bold relative ${activeTab === 'events' ? 'text-white' : 'text-gray-500'}`}>Workshops {activeTab === 'events' && <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-600 rounded-t-full" />}</button>
                    <button onClick={() => setActiveTab('feed')} className={`pb-4 font-bold relative ${activeTab === 'feed' ? 'text-white' : 'text-gray-500'}`}>Club Feed {activeTab === 'feed' && <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-600 rounded-t-full" />}</button>
                </div>

                {/* WORKSHOPS TAB */}
                {activeTab === 'events' && (
                    <div className="space-y-6">
                        {(isFaculty || isPresident) && !showForm && (
                            <button onClick={() => setShowForm(true)} className="w-full py-4 border border-dashed border-white/10 rounded-xl text-gray-400 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all flex items-center justify-center gap-2 font-bold uppercase tracking-widest text-sm">
                                <Plus size={18} /> Schedule Workshop
                            </button>
                        )}

                        {showForm && (
                            <div className="bg-[#121214] p-6 rounded-xl border border-white/10 space-y-4">
                                <div className="flex justify-between"><h3 className="font-bold">New Workshop</h3><button onClick={() => setShowForm(false)}><X /></button></div>
                                <input className="w-full bg-black/40 p-4 rounded-xl border border-white/10 text-white outline-none" placeholder="Workshop Title" value={newWorkshop.title} onChange={e => setNewWorkshop({ ...newWorkshop, title: e.target.value })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="date" className="bg-black/40 p-4 rounded-xl border border-white/10 text-white outline-none" style={{ colorScheme: "dark" }} value={newWorkshop.date} onChange={e => setNewWorkshop({ ...newWorkshop, date: e.target.value })} />
                                    <input className="bg-black/40 p-4 rounded-xl border border-white/10 text-white outline-none" placeholder="Time" value={newWorkshop.time} onChange={e => setNewWorkshop({ ...newWorkshop, time: e.target.value })} />
                                </div>
                                <input className="w-full bg-black/40 p-4 rounded-xl border border-white/10 text-white outline-none" placeholder="Venue" value={newWorkshop.venue} onChange={e => setNewWorkshop({ ...newWorkshop, venue: e.target.value })} />
                                <textarea className="w-full bg-black/40 p-4 rounded-xl border border-white/10 text-white outline-none resize-none" rows="3" placeholder="Description..." value={newWorkshop.description} onChange={e => setNewWorkshop({ ...newWorkshop, description: e.target.value })} />
                                <button onClick={handleAddWorkshop} className="w-full bg-purple-600 hover:bg-purple-500 py-4 rounded-xl font-bold text-white shadow-lg">Publish Workshop</button>
                            </div>
                        )}

                        {workshops.map(workshop => {
                            const isRegistered = user && workshop.attendees.some(a => a.user?._id === user._id);
                            const isOrganizer = user && (isFaculty || isPresident || workshop.organizers?.some(o => o._id === user._id));
                            const hasRated = user && workshop.attendees.find(a => a.user?._id === user._id)?.feedback?.submittedAt;
                            
                            // 🟢 NEW: Status-based Logic
                            const isLive = workshop.status === 'live';
                            const isCompleted = workshop.status === 'completed';

                            return (
                                <div key={workshop._id} className="bg-[#121214] border border-white/5 p-6 rounded-3xl flex flex-col md:flex-row gap-6 relative overflow-visible group hover:border-purple-500/30 transition-all">
                                    
                                    {/* DELETE BUTTON */}
                                    {(isFaculty || isPresident) && (
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteWorkshop(workshop._id); }} className="absolute top-4 right-4 p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all z-20"><Trash2 size={18} /></button>
                                    )}

                                    {/* DATE CARD (with Status Indicator) */}
                                    <div className="bg-[#18181b] rounded-2xl p-4 flex flex-col items-center justify-center min-w-[80px] border border-white/5 relative overflow-hidden">
                                        {isLive && <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />}
                                        {isCompleted && <div className="absolute top-0 left-0 w-full h-1 bg-green-500" />}
                                        <span className={`text-xs font-bold uppercase ${isLive ? 'text-red-500' : isCompleted ? 'text-green-500' : 'text-purple-400'}`}>
                                            {isLive ? 'LIVE' : isCompleted ? 'DONE' : new Date(workshop.date).toLocaleString('default', { month: 'short' })}
                                        </span>
                                        <span className="text-3xl font-black text-white">{new Date(workshop.date).getDate()}</span>
                                    </div>

                                    <div className="flex-1 z-10">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-2xl font-bold text-white mb-2">{workshop.title}</h3>
                                            
                                            {/* 🟢 NEW: STATUS MANAGER (President Only) */}
                                            {isOrganizer && (
                                                <div className="relative">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setStatusMenuOpen(statusMenuOpen === workshop._id ? null : workshop._id); }} 
                                                        className="p-2 bg-[#18181b] border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                                                    >
                                                        <Settings size={16} />
                                                    </button>
                                                    {statusMenuOpen === workshop._id && (
                                                        <div className="absolute top-10 right-0 w-48 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1">
                                                            <button onClick={() => handleUpdateStatus(workshop._id, 'upcoming')} className={`text-xs font-bold p-3 rounded-lg text-left hover:bg-white/5 flex items-center gap-2 ${workshop.status === 'upcoming' ? 'text-purple-400' : 'text-gray-400'}`}><Calendar size={14} /> Upcoming</button>
                                                            <button onClick={() => handleUpdateStatus(workshop._id, 'live')} className={`text-xs font-bold p-3 rounded-lg text-left hover:bg-white/5 flex items-center gap-2 ${workshop.status === 'live' ? 'text-red-500' : 'text-gray-400'}`}><PlayCircle size={14} /> Mark as Live</button>
                                                            <button onClick={() => handleUpdateStatus(workshop._id, 'completed')} className={`text-xs font-bold p-3 rounded-lg text-left hover:bg-white/5 flex items-center gap-2 ${workshop.status === 'completed' ? 'text-green-500' : 'text-gray-400'}`}><CheckSquare size={14} /> Mark Completed</button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-4 text-sm text-gray-400 mb-2">
                                            <span className="flex items-center gap-1"><Clock size={14} /> {workshop.time}</span>
                                            <span className="flex items-center gap-1"><MapPin size={14} /> {workshop.venue}</span>
                                        </div>
                                        <p className="text-gray-500 text-sm mb-4 line-clamp-2">{workshop.description}</p>

                                        <div className="flex gap-3">
                                            {/* --- 🟢 SMART BUTTON LIFECYCLE --- */}
                                            {isCompleted && isRegistered ? (
                                                hasRated ? (
                                                    <button disabled className="px-6 py-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg font-bold flex items-center gap-2 cursor-default">
                                                        <Star size={16} fill="currentColor" /> Feedback Sent
                                                    </button>
                                                ) : (
                                                    <button onClick={() => setShowFeedbackModal(workshop._id)} className="px-6 py-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-bold flex items-center gap-2 hover:opacity-90 animate-pulse">
                                                        <Star size={16} /> Rate Experience
                                                    </button>
                                                )
                                            ) : !isRegistered ? (
                                                isLive || isCompleted ? (
                                                    <button disabled className="px-6 py-2 bg-[#18181b] border border-white/5 text-gray-500 rounded-lg font-bold cursor-not-allowed">
                                                        Registration Closed
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleRegister(workshop._id)} className="px-6 py-2 bg-white text-black hover:bg-gray-200 rounded-lg font-bold transition-all">
                                                        Register
                                                    </button>
                                                )
                                            ) : (
                                                <button 
                                                    onClick={() => navigate('/messages', { 
                                                        state: { 
                                                            startChat: { 
                                                                _id: workshop.chatGroupId, 
                                                                fullName: workshop.title + " - Announcements", 
                                                                isGroup: true, 
                                                                isAnnouncement: true, 
                                                                groupAdmins: workshop.organizers.map(o => o._id) 
                                                            } 
                                                        } 
                                                    })}
                                                    className="px-6 py-2 bg-[#18181b] border border-white/10 hover:bg-white/5 text-white rounded-lg font-bold flex items-center gap-2 transition-all"
                                                >
                                                    <MessageSquare size={16} /> Open Channel
                                                </button>
                                            )}

                                            {isOrganizer && <button onClick={() => { setDashboardModal(workshop); setSearchTerm(""); setDashboardTab('attendees');}} className="px-4 py-2 bg-[#18181b] border border-white/10 hover:bg-white/5 text-white rounded-lg font-bold flex items-center gap-2 transition-all"><Users size={16} /> Dashboard</button>}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* FEED TAB (unchanged) */}
                {activeTab === 'feed' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        {(isFaculty || isPresident) && (
                            <div className="bg-[#121214] p-4 rounded-xl border border-white/5 shadow-xl">
                                <textarea className="w-full bg-black/40 p-3 rounded-lg text-white mb-3 border border-white/5 resize-none focus:border-purple-500 transition-colors" placeholder={`What's happening in ${club.name}?`} value={newPost.caption} onChange={e => setNewPost({ ...newPost, caption: e.target.value })} />
                                {newPost.link && <div className="mb-3 relative group w-fit"><img src={newPost.link} alt="Preview" className="h-24 w-auto object-contain rounded-lg border border-white/10 bg-black" /><button onClick={() => setNewPost({ ...newPost, link: '' })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={12} /></button></div>}
                                <div className="flex gap-2 items-center">
                                    <label className={`p-3 bg-white/5 hover:bg-white/10 rounded-lg cursor-pointer transition-all border border-white/5 group ${uploading ? 'opacity-50' : ''}`}>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                                        {uploading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <ImageIcon size={20} className="text-purple-400" />}
                                    </label>
                                    <div className="flex-1 relative"><LinkIcon size={16} className="absolute left-3 top-3.5 text-gray-500" /><input className="w-full bg-black/40 p-3 pl-10 rounded-lg text-white border border-white/5 text-sm focus:border-blue-500 transition-colors placeholder:text-gray-600" placeholder="Paste YouTube link..." value={newPost.link} onChange={e => setNewPost({ ...newPost, link: e.target.value })} disabled={uploading} /></div>
                                    <button onClick={handlePostSubmit} disabled={uploading || !newPost.caption} className="bg-purple-600 hover:bg-purple-500 p-3 rounded-lg text-white transition-all shadow-lg"><Send size={18} /></button>
                                </div>
                            </div>
                        )}
                        {posts.map(post => {
                            const isImage = post.mediaType === 'image';
                            const videoId = getYoutubeId(post.link);
                            return (
                                <div key={post._id} className="bg-[#121214] rounded-2xl border border-white/5 overflow-hidden">
                                    <div className="p-4 flex items-center gap-3 border-b border-white/5">
                                        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center font-bold text-white text-xs">{post.postedBy?.fullName[0]}</div>
                                        <div><p className="font-bold text-sm text-white">{post.postedBy?.fullName}</p><p className="text-xs text-gray-500">{new Date(post.createdAt).toLocaleDateString()}</p></div>
                                        {(isFaculty || isPresident) && <button onClick={() => handleDeletePost(post._id)} className="ml-auto text-gray-500 hover:text-red-500 p-2"><Trash2 size={16} /></button>}
                                    </div>
                                    <div className="p-4 text-gray-200 text-sm">{post.caption}</div>
                                    {isImage ? <div className="w-full bg-black flex justify-center border-t border-white/5"><img src={post.link} alt="Post" className="max-h-[500px] w-auto object-contain" /></div> : videoId ? <div className="aspect-video w-full"><iframe src={`https://www.youtube.com/embed/${videoId}`} className="w-full h-full" allowFullScreen title="video" /></div> : null}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* DASHBOARD MODAL (Final Version with Stats) */}
            {dashboardModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                    <div className="bg-[#09090b] border border-white/10 w-full max-w-2xl h-[80vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
                        
                        {/* HEADER */}
                        <div className="p-6 border-b border-white/10 bg-[#121214] flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-black text-white">{dashboardModal.title}</h2>
                                <p className="text-gray-500 text-sm font-bold">
                                    {dashboardModal.attendees?.length || 0} Registered • {dashboardModal.attendees?.filter(a => a.present).length || 0} Checked In
                                </p>
                            </div>
                            <button onClick={() => setDashboardModal(null)}><X className="text-gray-400 hover:text-white" /></button>
                        </div>

                        {/* TABS SWITCHER */}
                        <div className="flex border-b border-white/10">
                            <button 
                                onClick={() => setDashboardTab('attendees')} 
                                className={`flex-1 py-3 text-sm font-bold transition-colors ${dashboardTab === 'attendees' ? 'bg-[#18181b] text-white border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Attendees
                            </button>
                            <button 
                                onClick={() => setDashboardTab('stats')} 
                                className={`flex-1 py-3 text-sm font-bold transition-colors ${dashboardTab === 'stats' ? 'bg-[#18181b] text-white border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                Analytics 📊
                            </button>
                        </div>

                        {/* CONTENT AREA */}
                        {dashboardTab === 'attendees' ? (
                            <>
                                <div className="p-4 bg-[#09090b] border-b border-white/10">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-3.5 text-gray-500" size={18} />
                                        <input autoFocus placeholder="Search student..." className="w-full bg-[#121214] border border-white/10 p-3 pl-12 rounded-xl text-white outline-none focus:border-purple-500 transition-colors" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#050505]">
                                    {dashboardModal.attendees?.filter(att => att.user?.fullName.toLowerCase().includes(searchTerm.toLowerCase())).map(att => {
                                        const isOrg = dashboardModal.organizers?.some(o => o._id === att.user._id);
                                        return (
                                            <div key={att.user._id} className="flex justify-between items-center p-4 bg-[#121214] rounded-xl border border-white/5 hover:border-white/10 transition-all group">
                                                <div><h4 className="font-bold text-white text-base">{att.user.fullName}</h4><p className="text-xs text-gray-500 font-mono mt-0.5 uppercase">{att.user.collegeId}</p></div>
                                                <div className="flex items-center gap-3">
                                                    {isFaculty && <button onClick={() => handleToggleOrganizer(dashboardModal._id, att.user._id)} className={`p-2 rounded-lg transition-all ${isOrg ? 'text-purple-400 bg-purple-500/10' : 'text-gray-600 hover:text-gray-400'}`}><Shield size={18} fill={isOrg ? "currentColor" : "none"} /></button>}
                                                    <button onClick={() => handleMarkAttendance(dashboardModal._id, att.user._id)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${att.present ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-[#18181b] text-gray-400 border-white/10 hover:bg-white/5'}`}>{att.present ? "Present" : "Mark"}</button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </>
                        ) : (
                            // --- 📊 ANALYTICS TAB CONTENT ---
                            <div className="flex-1 overflow-y-auto p-6 bg-[#050505] space-y-6">
                                {(() => {
                                    // Filter out people who haven't submitted feedback yet
                                    const feedbacks = dashboardModal.attendees.map(a => a.feedback).filter(f => f && f.submittedAt);
                                    
                                    if (feedbacks.length === 0) return (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-4 opacity-50">
                                            <Star size={48} />
                                            <p>No feedback submitted yet.</p>
                                        </div>
                                    );

                                    const count = (field, value) => feedbacks.filter(f => f[field] === value).length;
                                    const total = feedbacks.length;
                                    const percent = (val) => total === 0 ? '0%' : Math.round((val / total) * 100) + '%';

                                    return (
                                        <>
                                            {/* Overall Verdict Cards */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-2xl flex items-center justify-between">
                                                    <div><p className="text-green-400 font-bold uppercase text-xs">Positive</p><p className="text-3xl font-black text-white">{count('overall', '👍')}</p></div>
                                                    <ThumbsUp size={32} className="text-green-500 opacity-50" />
                                                </div>
                                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center justify-between">
                                                    <div><p className="text-red-400 font-bold uppercase text-xs">Negative</p><p className="text-3xl font-black text-white">{count('overall', '👎')}</p></div>
                                                    <ThumbsDown size={32} className="text-red-500 opacity-50" />
                                                </div>
                                            </div>

                                            {/* Detailed Progress Bars */}
                                            <div className="space-y-4">
                                                {[
                                                    { label: '🧠 Pacing', field: 'pacing', options: ['Too Slow', 'Perfect', 'Too Fast'], colors: ['text-blue-400', 'text-green-400', 'text-orange-400'] },
                                                    { label: '💎 Clarity', field: 'clarity', options: ['Confusing', 'Clear', 'Mind-blowing'], colors: ['text-red-400', 'text-blue-400', 'text-purple-400'] },
                                                    { label: '🔥 Vibe', field: 'vibe', options: ['Sleepy', 'Okay', 'Hype'], colors: ['text-gray-400', 'text-yellow-400', 'text-orange-500'] }
                                                ].map(metric => (
                                                    <div key={metric.field} className="bg-[#121214] border border-white/5 p-4 rounded-2xl">
                                                        <h4 className="font-bold text-gray-400 text-sm mb-3 uppercase">{metric.label}</h4>
                                                        <div className="space-y-2">
                                                            {metric.options.map((opt, i) => {
                                                                const val = count(metric.field, opt);
                                                                return (
                                                                    <div key={opt} className="flex items-center gap-3">
                                                                        <span className={`text-xs font-bold w-24 truncate ${metric.colors[i]}`}>{opt}</span>
                                                                        <div className="flex-1 h-2 bg-[#18181b] rounded-full overflow-hidden">
                                                                            <div className="h-full bg-white/20 transition-all duration-500" style={{ width: percent(val), backgroundColor: 'currentColor' }}></div>
                                                                        </div>
                                                                        <span className="text-xs font-mono text-gray-500 w-8 text-right">{val}</span>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* FEEDBACK MODAL */}
            {showFeedbackModal && <FeedbackModal onClose={() => setShowFeedbackModal(null)} onSubmit={submitFeedback} submitting={false} />}
        </div>
    );
}