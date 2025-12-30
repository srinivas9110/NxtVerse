import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import {
    Search, Users, ChevronRight, Settings,
    Shield, X, UserMinus, Crown,
    Trash2, PlusCircle, Image as ImageIcon, CheckCircle, Edit2, Play
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

// 🟢 NEW: Helper for Image URLs (Cloudinary vs Local)
const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path; // Cloudinary URL
    return `${API_URL}${path}`; // Local path
};

export default function Clubs() {
    const navigate = useNavigate();

    // Data State
    const [clubs, setClubs] = useState([]);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState([]);

    // UI State
    const [hoveredClub, setHoveredClub] = useState(null);
    const [manageMode, setManageMode] = useState(null); // Stores clubId for Admin Overlay
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPresidentModal, setShowPresidentModal] = useState(false);
    const hoverTimeout = useRef(null);

    // Search States (For President Assignment)
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedSearchUser, setSelectedSearchUser] = useState(null);
    const [selectedClub, setSelectedClub] = useState(null); // Stores clubId for President Assignment

    // New Club Form State
    const [newClub, setNewClub] = useState({ name: '', description: '', logo: '', videoUrl: '' });

    // 1. INIT
    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }

            try {
                const userRes = await axios.get(`${API_URL}/api/auth/getuser`, { headers: { "auth-token": token } });
                setUser(userRes.data);

                const clubsRes = await axios.get(`${API_URL}/api/clubs/fetchall`, { headers: { "auth-token": token } });
                setClubs(clubsRes.data);

                // FETCH ALL USERS (If Faculty) - For Search Bar
                if (userRes.data.role === 'faculty') {
                    const allRes = await axios.get(`${API_URL}/api/users/fetchall`, { headers: { "auth-token": token } });
                    setAllUsers(allRes.data);
                }

                setLoading(false);
            } catch (err) { console.error(err); }
        };
        init();
    }, [navigate]);

    // 2. SEARCH LOGIC (For President Modal)
    useEffect(() => {
        if (searchTerm.trim() === "") {
            setSearchResults([]);
            return;
        }
        const filtered = allUsers.filter(u => 
            u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setSearchResults(filtered.slice(0, 5));
    }, [searchTerm, allUsers]);

    // --- ACTIONS ---

    const handleCreateClub = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const clubData = { ...newClub, logo: newClub.logo || "" };
            const res = await axios.post(`${API_URL}/api/clubs/create`, clubData, { headers: { "auth-token": token } });
            setClubs([...clubs, res.data]); 
            setShowCreateModal(false);
            setNewClub({ name: '', description: '', logo: '', videoUrl: '' }); 
            alert("🎉 Club Created Successfully!");
        } catch (err) { alert("Error creating club"); }
    };

    const handleDeleteClub = async (clubId) => {
        if (!window.confirm("⚠️ Are you sure you want to delete this club?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/clubs/delete/${clubId}`, { headers: { "auth-token": token } });
            setClubs(clubs.filter(c => c._id !== clubId)); 
            alert("🗑️ Club Deleted");
        } catch (err) { alert("Error deleting club"); }
    };

    // ASSIGN PRESIDENT
    const handleAssignPresident = async () => {
        if (!selectedSearchUser) return alert("Please select a student first!");
        
        try {
            const token = localStorage.getItem('token');
            // Sending studentId (User ID) instead of email
            const res = await axios.post(`${API_URL}/api/clubs/assign-president`, { 
                clubId: selectedClub, // Use selectedClub directly (it's an ID now)
                studentId: selectedSearchUser._id 
            }, { headers: { "auth-token": token } });
            
            alert(res.data.message);
            setShowPresidentModal(false);
            setSelectedSearchUser(null);
            setSearchTerm("");
            
            // Refresh
            const clubRes = await axios.get(`${API_URL}/api/clubs/fetchall`, { headers: { "auth-token": token } });
            setClubs(clubRes.data);
            
        } catch (err) {
            alert("❌ " + (err.response?.data?.message || "Failed to assign President"));
        }
    };

    const handleRemovePresident = async (clubId) => {
        if (!window.confirm("Vacate the President position?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/clubs/remove-president`, { clubId }, { headers: { "auth-token": token } });
            
            // Refresh locally
            const updatedClubs = clubs.map(c => {
                if (c._id === clubId) return { ...c, president: null };
                return c;
            });
            setClubs(updatedClubs);
            alert("President removed.");
        } catch (err) { alert("Failed to remove."); }
    };

    // Helpers
    const handleMouseEnter = (clubId) => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        hoverTimeout.current = setTimeout(() => setHoveredClub(clubId), 200);
    };

    const handleMouseLeave = () => {
        if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
        setHoveredClub(null);
    };

    const handleRemoveVideo = async (clubId) => {
        if (!window.confirm("Remove the video banner?")) return;
        setHoveredClub(null);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/clubs/update/${clubId}`, { videoUrl: "" }, { headers: { "auth-token": token } });
            const defaultVideo = 'https://www.youtube.com/watch?v=2i8s1c2j9Q0';
            setClubs(clubs.map(c => c._id === clubId ? { ...c, videoUrl: defaultVideo } : c));
            alert("✅ Video removed");
        } catch (err) { alert("Failed to remove video."); }
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

                {user?.role === 'faculty' && (
                    <button onClick={() => setShowCreateModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-purple-900/20">
                        <PlusCircle size={20} /> Create New Club
                    </button>
                )}
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {clubs.map((club) => {
                    const videoId = getYoutubeId(club.videoUrl || 'https://www.youtube.com/watch?v=2i8s1c2j9Q0');

                    return (
                        <div key={club._id} onMouseEnter={() => handleMouseEnter(club._id)} onMouseLeave={handleMouseLeave} className="group relative bg-[#121214] border border-white/5 rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-purple-900/20 hover:-translate-y-2 flex flex-col h-[480px]">
                            
                            {/* DELETE BUTTON */}
                            {user?.role === 'faculty' && (
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteClub(club._id); }} className="absolute top-4 left-4 z-40 p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Club">
                                    <Trash2 size={16} />
                                </button>
                            )}

                            {/* 1. MEDIA LAYER */}
                            <div className="relative h-[55%] overflow-hidden bg-black z-0">
                                {hoveredClub === club._id && manageMode !== club._id ? (
                                    <div className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] pointer-events-none opacity-80">
                                        <YouTube videoId={videoId} opts={{ height: '100%', width: '100%', playerVars: { autoplay: 1, controls: 0, mute: 1, loop: 1, playlist: videoId, modestbranding: 1, rel: 0, showinfo: 0 } }} className="w-full h-full" />
                                    </div>
                                ) : (
                                    <div className="absolute inset-0">
                                        <img src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} alt="cover" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-all duration-700" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#121214] via-transparent to-transparent pointer-events-none"></div>
                                {user?.role === 'faculty' && (
                                    <button onClick={() => { setManageMode(club._id); setHoveredClub(null); }} className="absolute top-4 right-4 p-2.5 bg-black/50 backdrop-blur-md text-gray-300 hover:text-white rounded-full border border-white/10 hover:bg-purple-600 transition-all z-30">
                                        <Settings size={18} />
                                    </button>
                                )}
                            </div>

                            {/* 2. CONTENT LAYER */}
                            <div className="relative h-[45%] p-6 flex flex-col bg-[#121214] z-10">
                                <div className="absolute -top-12 right-6 z-20">
                                    {club.president ? (
                                        <div className="group/pres relative cursor-pointer" title={`President: ${club.president.fullName}`}>
                                            <div className="w-24 h-24 rounded-full border-4 border-[#121214] bg-[#18181b] overflow-hidden shadow-xl">
                                                {/* 🟢 FIX: Use getImageUrl helper */}
                                                {club.president.profilePic ? (
                                                    <img src={getImageUrl(club.president.profilePic)} alt="Pres" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600 text-2xl font-bold text-white">
                                                        {club.president.fullName?.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="absolute bottom-0 right-0 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-[#121214]">President</div>
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

                                <Link to={`/clubs/${club._id}`} className="w-full mt-2 py-3.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all group-hover:border-purple-500/30 group-hover:text-white text-gray-300">
                                    Visit HQ <ChevronRight size={16} />
                                </Link>
                            </div>

                            {/* 3. ADMIN OVERLAY (Now contains President controls) */}
                            {manageMode === club._id && (
                                <div className="absolute inset-0 bg-[#09090b]/95 backdrop-blur-md z-50 p-6 flex flex-col animate-in slide-in-from-bottom duration-300">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-lg flex items-center gap-2 text-purple-400"><Shield size={18} /> Admin Control</h3>
                                        <button onClick={() => setManageMode(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={18} /></button>
                                    </div>
                                    <div className="space-y-4 flex-1 overflow-y-auto">
                                        
                                        {/* 🟢 NEW: LEADERSHIP SECTION */}
                                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-3 tracking-wider flex items-center gap-2"><Crown size={12} /> Leadership</p>
                                            
                                            {club.president ? (
                                                <div className="flex items-center justify-between bg-black/40 p-3 rounded-lg border border-white/5 mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-xs">
                                                            {club.president.fullName.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{club.president.fullName}</p>
                                                            <p className="text-xs text-gray-500">Current President</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleRemovePresident(club._id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-full" title="Remove">
                                                        <UserMinus size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-500 mb-3">No president assigned.</p>
                                            )}

                                            <button 
                                                onClick={() => { setSelectedClub(club._id); setShowPresidentModal(true); }} 
                                                className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/50 rounded-lg text-sm text-purple-300 hover:text-white flex items-center justify-center gap-2 transition-all"
                                            >
                                                <Edit2 size={14} /> {club.president ? 'Change President' : 'Assign President'}
                                            </button>
                                        </div>

                                        <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-3 tracking-wider flex items-center gap-2"><ImageIcon size={12} /> Visuals</p>
                                            <button onClick={() => handleUpdateVideo(club._id)} className="w-full py-2 bg-black/40 hover:bg-black/60 border border-white/10 rounded-lg text-sm text-blue-400 hover:text-blue-300 flex items-center justify-center gap-2 transition-all">
                                                <Play size={14} /> Update Banner Video
                                            </button>
                                            <button onClick={() => handleRemoveVideo(club._id)} className="w-full mt-2 py-2 text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex items-center justify-center gap-2">
                                                <Trash2 size={12} /> Remove Custom Video
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* CREATE CLUB MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#121214] border border-white/10 rounded-3xl p-8 w-full max-w-md relative animate-in zoom-in-95 duration-200 shadow-2xl">
                        <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white p-2"><X size={20} /></button>
                        <h2 className="text-2xl font-bold mb-6 text-white">Create New Club</h2>
                        <form onSubmit={handleCreateClub} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Club Name</label>
                                <input type="text" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-all" placeholder="e.g. Coding Club" value={newClub.name} onChange={(e) => setNewClub({ ...newClub, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-2"><ImageIcon size={12} /> Club Logo (Image URL)</label>
                                <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-all" placeholder="https://example.com/logo.png" value={newClub.logo} onChange={(e) => setNewClub({ ...newClub, logo: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                                <textarea required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-all h-24 resize-none" placeholder="What is this club about?" value={newClub.description} onChange={(e) => setNewClub({ ...newClub, description: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Banner Video (YouTube URL)</label>
                                <input type="text" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition-all" placeholder="https://youtube.com/..." value={newClub.videoUrl} onChange={(e) => setNewClub({ ...newClub, videoUrl: e.target.value })} />
                            </div>
                            <button type="submit" className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold text-white transition-all shadow-lg shadow-purple-900/20 mt-4">🚀 Launch Club</button>
                        </form>
                    </div>
                </div>
            )}

            {/* PRESIDENT ASSIGNMENT MODAL */}
            {showPresidentModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#18181b] border border-white/10 p-8 rounded-3xl w-full max-w-md relative shadow-2xl">
                        <button onClick={() => { setShowPresidentModal(false); setSearchTerm(""); setSelectedSearchUser(null); }} className="absolute top-6 right-6 text-gray-500 hover:text-white"><X /></button>
                        <h2 className="text-xl font-bold mb-1">Assign President</h2>
                        
                        <div className="relative mb-6 mt-4">
                            <Search className="absolute left-3 top-3 text-gray-500" size={16} />
                            <input 
                                className="w-full bg-black/40 border border-white/10 p-3 pl-10 rounded-xl text-white outline-none focus:border-purple-500 transition-all" 
                                placeholder="Search Student Name..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            
                            {/* SEARCH DROPDOWN */}
                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#202022] border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                                    {searchResults.map(user => (
                                        <div 
                                            key={user._id} 
                                            onClick={() => {
                                                setSelectedSearchUser(user);
                                                setSearchTerm(user.fullName);
                                                setSearchResults([]);
                                            }}
                                            className="p-3 hover:bg-white/10 cursor-pointer flex justify-between items-center border-b border-white/5 last:border-0"
                                        >
                                            <span className="text-sm font-bold text-gray-200">{user.fullName}</span>
                                            <span className="text-xs text-gray-500">{user.email}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedSearchUser && (
                            <div className="bg-green-500/10 border border-green-500/20 p-3 rounded-xl flex items-center gap-3 mb-4">
                                <CheckCircle className="text-green-500" size={20} />
                                <div>
                                    <p className="text-xs text-green-500 font-bold uppercase">Selected Student</p>
                                    <p className="text-sm font-bold text-white">{selectedSearchUser.fullName}</p>
                                </div>
                            </div>
                        )}

                        <button onClick={handleAssignPresident} disabled={!selectedSearchUser} className="w-full bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all">
                            Confirm Assignment
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}