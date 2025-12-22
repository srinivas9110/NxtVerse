import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import {
    Search, Users, ChevronRight, Settings,
    Shield, UserPlus, Play, X, UserMinus, Crown,
    Trash2, PlusCircle // 👈 Added PlusCircle icon
} from 'lucide-react';
import YouTube from 'react-youtube';
import { useNavigate, Link } from 'react-router-dom';

// Helper for YouTube IDs
const getYoutubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export default function Clubs() {
    const navigate = useNavigate();

    // Data State
    const [clubs, setClubs] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // UI State
    const [hoveredClub, setHoveredClub] = useState(null);
    const [manageMode, setManageMode] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false); // 👈 New Modal State
    const hoverTimeout = useRef(null);

    // New Club Form State
    const [newClub, setNewClub] = useState({ name: '', description: '', logo: '', videoUrl: '' });

    // Management State
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [studentResults, setStudentResults] = useState([]);

    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }

            try {
                const userRes = await axios.get(`${API_URL}/api/auth/getuser`, { headers: { "auth-token": token } });
                setUser(userRes.data);

                const clubsRes = await axios.get(`${API_URL}/api/clubs/fetchall`, { headers: { "auth-token": token } });
                setClubs(clubsRes.data);
                setLoading(false);
            } catch (err) { console.error(err); }
        };
        init();
    }, [navigate]);

    // --- SEARCH ---
    useEffect(() => {
        if (manageMode && studentSearchTerm.length > 2) {
            const searchStudents = async () => {
                const token = localStorage.getItem('token');
                try {
                    const res = await axios.get(`${API_URL}/api/users/fetchall`, { headers: { "auth-token": token } });
                    const results = res.data.filter(u =>
                        u.fullName.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                        u.email.toLowerCase().includes(studentSearchTerm.toLowerCase())
                    );
                    setStudentResults(results.slice(0, 5));
                } catch (err) { console.error(err); }
            };
            const delayDebounceFn = setTimeout(() => searchStudents(), 300);
            return () => clearTimeout(delayDebounceFn);
        } else {
            setStudentResults([]);
        }
    }, [studentSearchTerm, manageMode]);

    // --- ACTIONS ---

    // 1. Create Club Function
    const handleCreateClub = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/clubs/create`, newClub, { headers: { "auth-token": token } });
            setClubs([...clubs, res.data]); // Add new club to list immediately
            setShowCreateModal(false);
            setNewClub({ name: '', description: '', logo: '', videoUrl: '' }); // Reset form
            alert("🎉 Club Created Successfully!");
        } catch (err) {
            alert("Error creating club");
        }
    };

    // 2. Delete Club Function
    const handleDeleteClub = async (clubId) => {
        if (!window.confirm("⚠️ Are you sure you want to delete this club? This action cannot be undone.")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/clubs/delete/${clubId}`, { headers: { "auth-token": token } });
            setClubs(clubs.filter(c => c._id !== clubId)); // Remove from list immediately
            alert("🗑️ Club Deleted");
        } catch (err) {
            alert("Error deleting club");
        }
    };

    const handleMouseEnter = (clubId) => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        hoverTimeout.current = setTimeout(() => setHoveredClub(clubId), 200);
    };

    const handleMouseLeave = () => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        setHoveredClub(null);
    };

    const handleRemoveVideo = async (clubId) => {
        if (!window.confirm("Remove the video banner? It will revert to the default theme.")) return;
        setHoveredClub(null);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/clubs/update/${clubId}`,
                { videoUrl: "" },
                { headers: { "auth-token": token } }
            );
            const defaultVideo = 'https://www.youtube.com/watch?v=2i8s1c2j9Q0';
            setClubs(clubs.map(c => c._id === clubId ? { ...c, videoUrl: defaultVideo } : c));
            alert("✅ Video removed (Reverted to Default)");
        } catch (err) { alert("Failed to remove video."); }
    };

    const handleAssignPresident = async (clubId, studentEmail) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/clubs/assign-president`, { clubId, studentEmail }, { headers: { "auth-token": token } });
            alert("👑 " + res.data.message);
            window.location.reload();
        } catch (err) { alert("Error: " + (err.response?.data?.message || "Failed")); }
    };

    const handleRemovePresident = async (clubId) => {
        if (!window.confirm("Vacate the President position?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/clubs/remove-president`, { clubId }, { headers: { "auth-token": token } });
            window.location.reload();
        } catch (err) { alert("Failed to remove."); }
    };

    const handleUpdateVideo = async (clubId) => {
        setHoveredClub(null);
        const newUrl = prompt("Enter new YouTube URL for Club Banner:");
        if (!newUrl) return;
        if (!getYoutubeId(newUrl)) { alert("❌ Invalid YouTube URL."); return; }
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/clubs/update/${clubId}`, { videoUrl: newUrl }, { headers: { "auth-token": token } });
            setClubs(clubs.map(c => c._id === clubId ? { ...c, videoUrl: newUrl } : c));
            alert("✅ Video Banner Updated!");
        } catch (err) { alert("Failed to update video."); }
    };

    if (loading) return <div className="bg-[#09090b] min-h-screen text-white p-10">Loading Network...</div>;

    return (
        <div className="min-h-screen bg-[#09090b] text-white p-6 md:p-12">
            <div className="max-w-7xl mx-auto mb-12 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold mb-2">Student Clubs</h1>
                    <p className="text-gray-400">Join a community. Lead a movement.</p>
                </div>

                {/* CREATE CLUB BUTTON (Visible to Faculty Only) */}
                {user?.role === 'faculty' && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-900/20"
                    >
                        <PlusCircle size={20} /> Create New Club
                    </button>
                )}
            </div>

            {/* EMPTY STATE */}
            {clubs.length === 0 && (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
                    <p className="text-xl text-gray-400">No clubs found.</p>
                    {user?.role === 'faculty' && <p className="text-sm text-gray-500 mt-2">Click "Create New Club" to get started.</p>}
                </div>
            )}

            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {clubs.map((club) => {
                    const videoId = getYoutubeId(club.videoUrl || 'https://www.youtube.com/watch?v=2i8s1c2j9Q0');

                    return (
                        <div
                            key={club._id}
                            onMouseEnter={() => handleMouseEnter(club._id)}
                            onMouseLeave={handleMouseLeave}
                            className="group relative bg-[#121214] border border-white/5 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-purple-900/20 hover:-translate-y-2 flex flex-col h-[480px]"
                        >
                            {/* DELETE BUTTON (Top Left - Faculty Only) */}
                            {user?.role === 'faculty' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClub(club._id); }}
                                    className="absolute top-4 left-4 z-40 p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete Club"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}

                            {/* 1. MEDIA LAYER (Background) */}
                            <div className="relative h-[55%] overflow-hidden bg-black z-0">
                                {hoveredClub === club._id && manageMode !== club._id ? (
                                    <div className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] pointer-events-none opacity-80">
                                        <YouTube
                                            videoId={videoId}
                                            opts={{
                                                height: '100%', width: '100%',
                                                playerVars: { autoplay: 1, controls: 0, mute: 1, loop: 1, playlist: videoId, modestbranding: 1, rel: 0, showinfo: 0 }
                                            }}
                                            className="w-full h-full"
                                        />
                                    </div>
                                ) : (
                                    <div className="absolute inset-0">
                                        <img
                                            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                                            alt="cover"
                                            className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-all duration-700"
                                        />
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-transparent to-transparent pointer-events-none"></div>

                                {user?.role === 'faculty' && (
                                    <button
                                        onClick={() => { setManageMode(club._id); setHoveredClub(null); }}
                                        className="absolute top-4 right-4 p-2.5 bg-black/50 backdrop-blur-md text-gray-300 hover:text-white rounded-full border border-white/10 hover:bg-purple-600 transition-all z-30"
                                    >
                                        <Settings size={18} />
                                    </button>
                                )}
                            </div>

                            {/* 2. CONTENT LAYER (Foreground) */}
                            <div className="relative h-[45%] p-6 flex flex-col bg-[#121214] z-10">
                                {/* President Badge */}
                                <div className="absolute -top-12 right-6 z-20">
                                    {club.president ? (
                                        <div className="group/pres relative cursor-pointer" title={`President: ${club.president.fullName}`}>
                                            <div className="w-24 h-24 rounded-full border-4 border-[#121214] bg-[#18181b] overflow-hidden shadow-xl">
                                                {club.president.profilePic ? (
                                                    <img src={`${API_URL}${club.president.profilePic}`} alt="Pres" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 text-2xl font-bold text-white">
                                                        {club.president.fullName?.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute bottom-0 right-0 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-[#121214]">
                                                President
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 rounded-full border-4 border-[#121214] bg-white/5 flex items-center justify-center text-gray-600 border-dashed">
                                            <Users size={24} />
                                        </div>
                                    )}
                                </div>

                                <div className="mb-auto mt-4">
                                    <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">{club.name}</h2>
                                    <p className="text-sm text-gray-400 font-medium line-clamp-2 leading-relaxed">{club.description || "Building the future."}</p>
                                </div>

                                <Link to={`/clubs/${club._id}`} className="w-full mt-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all group-hover:border-purple-500/30 group-hover:text-white text-gray-300">
                                    Visit HQ <ChevronRight size={16} />
                                </Link>
                            </div>

                            {/* 3. ADMIN OVERLAY */}
                            {manageMode === club._id && (
                                <div className="absolute inset-0 bg-[#09090b]/95 backdrop-blur-md z-50 p-6 flex flex-col animate-in slide-in-from-bottom duration-300">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-lg flex items-center gap-2 text-purple-400"><Shield size={18} /> Admin Control</h3>
                                        <button onClick={() => setManageMode(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={18} /></button>
                                    </div>
                                    <div className="space-y-4 flex-1 overflow-y-auto">
                                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-3 tracking-wider">Visuals</p>
                                            <button onClick={() => handleUpdateVideo(club._id)} className="w-full py-2 bg-black/40 hover:bg-black/60 border border-white/10 rounded-lg text-sm text-blue-400 hover:text-blue-300 flex items-center justify-center gap-2 transition-all">
                                                <Play size={14} /> Update Banner Video
                                            </button>
                                            <button onClick={() => handleRemoveVideo(club._id)} className="w-full mt-2 py-2 text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex items-center justify-center gap-2">
                                                <Trash2 size={12} /> Remove Custom Video
                                            </button>
                                        </div>
                                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-3 tracking-wider">Leadership</p>
                                            {club.president ? (
                                                <div className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-xs"><Crown size={14} /></div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{club.president.fullName}</p>
                                                            <p className="text-[10px] text-gray-500">Active</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleRemovePresident(club._id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full" title="Remove"><UserMinus size={16} /></button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="relative">
                                                        <Search size={14} className="absolute left-3 top-3 text-gray-500" />
                                                        <input className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-9 text-sm text-white" placeholder="Search Student Name..." value={studentSearchTerm} onChange={(e) => setStudentSearchTerm(e.target.value)} />
                                                    </div>
                                                    {studentResults.length > 0 && (
                                                        <div className="mt-2 space-y-1 bg-black/60 rounded-lg border border-white/10 overflow-hidden">
                                                            {studentResults.map(s => (
                                                                <button key={s._id} onClick={() => handleAssignPresident(club._id, s.email)} className="w-full text-left p-3 hover:bg-purple-600 hover:text-white text-gray-300 text-sm flex items-center justify-between transition-colors border-b border-white/5">
                                                                    <span>{s.fullName}</span><UserPlus size={14} className="opacity-50" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* --- CREATE CLUB MODAL --- */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#121214] border border-white/10 rounded-3xl p-8 w-full max-w-md relative animate-in zoom-in-95 duration-200 shadow-2xl">
                        <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white p-2">
                            <X size={20} />
                        </button>
                        <h2 className="text-2xl font-bold mb-6 text-white">Create New Club</h2>
                        <form onSubmit={handleCreateClub} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Club Name</label>
                                <input
                                    type="text" required
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-all"
                                    placeholder="e.g. Coding Club"
                                    value={newClub.name}
                                    onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                                <textarea
                                    required
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-all h-24 resize-none"
                                    placeholder="What is this club about?"
                                    value={newClub.description}
                                    onChange={(e) => setNewClub({ ...newClub, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Banner Video (YouTube URL)</label>
                                <input
                                    type="text"
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-all"
                                    placeholder="https://youtube.com/..."
                                    value={newClub.videoUrl}
                                    onChange={(e) => setNewClub({ ...newClub, videoUrl: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold text-white transition-all shadow-lg shadow-purple-900/20 mt-4">
                                🚀 Launch Club
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}