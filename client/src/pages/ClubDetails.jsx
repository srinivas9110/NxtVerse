import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import axios from 'axios';
import YouTube from 'react-youtube';
import {
    Calendar, MapPin, Clock, Trash2, Plus, X,
    Send, Link as LinkIcon, ExternalLink, Image as ImageIcon,
    Users, Shield, CheckCircle, Search, ArrowLeft
} from 'lucide-react';

const getYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
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

    // Dashboard Modal
    const [dashboardModal, setDashboardModal] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

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

    // 2. Fetch Posts
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

    // --- ACTIONS ---

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
        } catch (err) { alert("Error registering"); }
    };

    // --- DASHBOARD ACTIONS ---
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

    // --- FEED ACTIONS ---
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
        <div className="min-h-screen bg-[#050505] text-white font-sans">

            {/* 1. HERO (Restored Video Banner) */}
            <div className="w-full h-[50vh] relative overflow-hidden bg-black group">
                {/* Back Button */}
                <button onClick={() => navigate('/clubs')} className="absolute top-6 left-6 z-30 p-3 bg-black/50 backdrop-blur-md rounded-full hover:bg-white/10 text-white transition-all">
                    <ArrowLeft size={20} />
                </button>

                <div className="absolute inset-0 pointer-events-none opacity-60 scale-[1.35]">
                    <YouTube videoId={bannerVideoId} opts={{ height: '100%', width: '100%', playerVars: { autoplay: 1, controls: 0, mute: 1, loop: 1, playlist: bannerVideoId, showinfo: 0 } }} className="w-full h-full" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent"></div>
                
                <div className="absolute bottom-0 w-full px-8 pb-10 flex items-end gap-6 z-20">
                    <div className="w-28 h-28 bg-[#18181b] rounded-2xl p-1 border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
                        {club.logo ? (
                            // 🟢 FIX: Removed 'invert' class so Original Logo shows correctly
                            <img src={club.logo} className="w-full h-full object-cover rounded-xl" alt="logo" />
                        ) : (
                            <span className="text-4xl font-bold text-purple-500">{club.name[0]}</span>
                        )}
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

                            return (
                                <div key={workshop._id} className="bg-[#121214] border border-white/5 p-6 rounded-3xl flex flex-col md:flex-row gap-6 relative overflow-hidden group hover:border-purple-500/30 transition-all">
                                    {(isFaculty || isPresident) && (
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteWorkshop(workshop._id); }} className="absolute top-4 right-4 p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all z-20"><Trash2 size={18} /></button>
                                    )}
                                    <div className="bg-[#18181b] rounded-2xl p-4 flex flex-col items-center justify-center min-w-[80px] border border-white/5">
                                        <span className="text-xs font-bold text-purple-400 uppercase">{new Date(workshop.date).toLocaleString('default', { month: 'short' })}</span>
                                        <span className="text-3xl font-black text-white">{new Date(workshop.date).getDate()}</span>
                                    </div>
                                    <div className="flex-1 z-10">
                                        <h3 className="text-2xl font-bold text-white mb-2">{workshop.title}</h3>
                                        <div className="flex gap-4 text-sm text-gray-400 mb-2">
                                            <span className="flex items-center gap-1"><Clock size={14} /> {workshop.time}</span>
                                            <span className="flex items-center gap-1"><MapPin size={14} /> {workshop.venue}</span>
                                        </div>
                                        <p className="text-gray-500 text-sm mb-4 line-clamp-2">{workshop.description}</p>
                                        <div className="flex gap-3">
                                            {isRegistered ? <button disabled className="px-6 py-2 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg font-bold flex items-center gap-2 cursor-default"><CheckCircle size={16} /> Registered</button> : <button onClick={() => handleRegister(workshop._id)} className="px-6 py-2 bg-white text-black hover:bg-gray-200 rounded-lg font-bold transition-all">Register</button>}
                                            {isOrganizer && <button onClick={() => { setDashboardModal(workshop); setSearchTerm(""); }} className="px-4 py-2 bg-[#18181b] border border-white/10 hover:bg-white/5 text-white rounded-lg font-bold flex items-center gap-2 transition-all"><Users size={16} /> Dashboard</button>}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* FEED TAB */}
                {activeTab === 'feed' && (
                    <div className="max-w-2xl mx-auto space-y-6">
                        {(isFaculty || isPresident) && (
                            <div className="bg-[#121214] p-4 rounded-xl border border-white/5 shadow-xl">
                                <textarea className="w-full bg-black/40 p-3 rounded-lg text-white mb-3 border border-white/5 resize-none focus:border-purple-500 transition-colors" placeholder={`What's happening in ${club.name}?`} value={newPost.caption} onChange={e => setNewPost({ ...newPost, caption: e.target.value })} />
                                {newPost.link && (
                                    <div className="mb-3 relative group w-fit">
                                        {newPost.link.includes('youtu') ? (
                                            <div className="h-20 aspect-video bg-red-900/20 border border-red-500/30 rounded-lg flex items-center justify-center text-red-400 text-xs font-bold"><ExternalLink size={16} className="mr-1" /> Video Link</div>
                                        ) : (<img src={newPost.link} alt="Preview" className="h-24 w-auto object-contain rounded-lg border border-white/10 bg-black" />)}
                                        <button onClick={() => setNewPost({ ...newPost, link: '' })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={12} /></button>
                                    </div>
                                )}
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

            {/* DASHBOARD MODAL */}
            {dashboardModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                    <div className="bg-[#09090b] border border-white/10 w-full max-w-2xl h-[80vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-white/10 bg-[#121214] flex justify-between items-start">
                            <div><h2 className="text-2xl font-black text-white">{dashboardModal.title}</h2><p className="text-gray-500 text-sm font-bold">{dashboardModal.attendees?.length || 0} Registered • {dashboardModal.attendees?.filter(a => a.present).length || 0} Checked In</p></div>
                            <button onClick={() => setDashboardModal(null)}><X className="text-gray-400 hover:text-white" /></button>
                        </div>
                        <div className="p-4 bg-[#09090b] border-b border-white/10"><div className="relative"><Search className="absolute left-4 top-3.5 text-gray-500" size={18} /><input autoFocus placeholder="Search..." className="w-full bg-[#121214] border border-white/10 p-3 pl-12 rounded-xl text-white outline-none focus:border-purple-500 transition-colors" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>
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
                    </div>
                </div>
            )}
        </div>
    );
}