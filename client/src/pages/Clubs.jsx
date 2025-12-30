import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import {
    Users, Plus, Search, Calendar, MapPin, Clock,
    ChevronRight, Award, Trash2, Edit2, UserPlus, X, CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Clubs() {
    const navigate = useNavigate();

    // Data States
    const [clubs, setClubs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [allUsers, setAllUsers] = useState([]); // 🟢 Store for search

    // Modal States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPresidentModal, setShowPresidentModal] = useState(false);
    
    // 🟢 SEARCH STATES (These were missing)
    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [selectedSearchUser, setSelectedSearchUser] = useState(null);
    
    // Selection States
    const [selectedClub, setSelectedClub] = useState(null);

    // Form States
    const [newClub, setNewClub] = useState({
        name: '', description: '', category: 'Tech', 
        logo: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&q=80', 
        videoUrl: ''
    });

    // 1. INIT
    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }
            try {
                // Fetch Me
                const userRes = await axios.get(`${API_URL}/api/auth/getuser`, { headers: { "auth-token": token } });
                setUser(userRes.data);

                // Fetch Clubs
                const clubRes = await axios.get(`${API_URL}/api/clubs/fetchall`, { headers: { "auth-token": token } });
                setClubs(clubRes.data);

                // 🟢 PRE-FETCH USERS (For Search)
                // Only if Faculty, to avoid unnecessary load for students
                if (userRes.data.role === 'faculty') {
                    const allRes = await axios.get(`${API_URL}/api/users/fetchall`, { headers: { "auth-token": token } });
                    setAllUsers(allRes.data);
                }

                setLoading(false);
            } catch (err) { console.error(err); }
        };
        init();
    }, [navigate]);

    // 🟢 SEARCH LOGIC
    useEffect(() => {
        if (searchTerm.trim() === "") {
            setSearchResults([]);
            return;
        }
        const filtered = allUsers.filter(u => 
            u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setSearchResults(filtered.slice(0, 5)); // Limit to 5 results
    }, [searchTerm, allUsers]);

    // --- ACTIONS ---

    const handleCreateClub = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/clubs/create`, newClub, { headers: { "auth-token": token } });
            setClubs([...clubs, res.data]);
            setShowCreateModal(false);
            alert("Club Created Successfully!");
        } catch (err) { alert("Failed to create club"); }
    };

    const handleDeleteClub = async (id) => {
        if (!window.confirm("Delete this club?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/clubs/delete/${id}`, { headers: { "auth-token": token } });
            setClubs(clubs.filter(c => c._id !== id));
        } catch (err) { alert("Delete failed"); }
    };

    // 🟢 ASSIGN PRESIDENT (Updated Logic)
    const handleAssignPresident = async () => {
        if (!selectedSearchUser) return alert("Please select a student first!");
        
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/clubs/assign-president`, { 
                clubId: selectedClub._id, 
                studentId: selectedSearchUser._id // Sending ID now
            }, { headers: { "auth-token": token } });
            
            alert(res.data.message);
            setShowPresidentModal(false);
            setSelectedSearchUser(null);
            setSearchTerm("");
            
            // Refresh List
            const clubRes = await axios.get(`${API_URL}/api/clubs/fetchall`, { headers: { "auth-token": token } });
            setClubs(clubRes.data);

        } catch (err) {
            console.error(err);
            alert("❌ " + (err.response?.data?.message || "Failed to assign"));
        }
    };

    const handleRemovePresident = async (clubId) => {
        if (!window.confirm("Remove current President?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/clubs/remove-president`, { clubId }, { headers: { "auth-token": token } });
            
            // Refresh
            const clubRes = await axios.get(`${API_URL}/api/clubs/fetchall`, { headers: { "auth-token": token } });
            setClubs(clubRes.data);
            alert("President removed.");
        } catch (err) { alert("Failed"); }
    };

    if (loading) return <div className="p-8 text-gray-500 bg-[#050505] min-h-screen">Loading Clubs...</div>;

    const isFaculty = user?.role === 'faculty';

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 md:p-8 relative">
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none"></div>

            {/* HEADER */}
            <div className="flex justify-between items-end mb-8 relative z-10">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3"><Award className="text-purple-500" /> Student Clubs</h1>
                    <p className="text-gray-400 font-medium mt-1">Join a community, lead a workshop, or build a legacy.</p>
                </div>
                {isFaculty && (
                    <button onClick={() => setShowCreateModal(true)} className="bg-white text-black px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 transition-all">
                        <Plus size={18} /> New Club
                    </button>
                )}
            </div>

            {/* GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                {clubs.map(club => (
                    <div key={club._id} className="bg-[#121214] border border-white/5 rounded-2xl overflow-hidden group hover:border-purple-500/30 transition-all hover:shadow-2xl hover:shadow-purple-900/10 flex flex-col">
                        <div className="h-32 bg-gray-800 relative">
                            <img src={club.logo} alt={club.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all" />
                            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10 uppercase tracking-wider">
                                {club.category}
                            </div>
                        </div>
                        
                        <div className="p-6 flex-1 flex flex-col">
                            <h3 className="text-xl font-bold text-white mb-2">{club.name}</h3>
                            <p className="text-gray-400 text-sm line-clamp-2 mb-6 flex-1">{club.description}</p>

                            {/* President Section */}
                            <div className="bg-black/40 rounded-xl p-3 border border-white/5 mb-4 flex items-center justify-between">
                                {club.president ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-sm">
                                            {club.president.fullName[0]}
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-bold uppercase">President</p>
                                            <p className="text-sm font-bold text-white">{club.president.fullName}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-gray-500 text-sm italic">
                                        <UserPlus size={16} /> No President Assigned
                                    </div>
                                )}

                                {isFaculty && (
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => { setSelectedClub(club); setShowPresidentModal(true); }} 
                                            className="p-2 hover:bg-white/10 rounded-lg text-blue-400 transition-all" 
                                            title="Assign President"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        {club.president && (
                                            <button 
                                                onClick={() => handleRemovePresident(club._id)} 
                                                className="p-2 hover:bg-white/10 rounded-lg text-red-400 transition-all" 
                                                title="Remove President"
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button onClick={() => navigate(`/clubs/${club._id}`)} className="w-full py-3 bg-white/5 hover:bg-purple-600 hover:text-white rounded-xl font-bold text-sm text-gray-300 transition-all flex items-center justify-center gap-2 border border-white/5">
                                Explore Club <ChevronRight size={16} />
                            </button>
                            
                            {isFaculty && (
                                <button onClick={() => handleDeleteClub(club._id)} className="w-full mt-2 py-2 text-xs text-red-500 hover:text-red-400 font-bold flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={12} /> Delete Club
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* CREATE MODAL */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#18181b] border border-white/10 p-8 rounded-3xl w-full max-w-md relative shadow-2xl">
                        <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white"><X /></button>
                        <h2 className="text-2xl font-bold mb-6">Create New Club</h2>
                        <div className="space-y-4">
                            <input className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white" placeholder="Club Name" onChange={e => setNewClub({ ...newClub, name: e.target.value })} />
                            <input className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white" placeholder="Category (Tech, Art, etc)" onChange={e => setNewClub({ ...newClub, category: e.target.value })} />
                            <input className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white" placeholder="Cover Image URL" onChange={e => setNewClub({ ...newClub, logo: e.target.value })} />
                            <textarea className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white" rows="3" placeholder="Description" onChange={e => setNewClub({ ...newClub, description: e.target.value })} />
                            <button onClick={handleCreateClub} className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200">Launch Club</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 🟢 ASSIGN PRESIDENT MODAL */}
            {showPresidentModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#18181b] border border-white/10 p-8 rounded-3xl w-full max-w-md relative shadow-2xl">
                        <button onClick={() => { setShowPresidentModal(false); setSearchTerm(""); setSelectedSearchUser(null); }} className="absolute top-6 right-6 text-gray-500 hover:text-white"><X /></button>
                        <h2 className="text-xl font-bold mb-1">Assign President</h2>
                        <p className="text-xs text-gray-500 mb-6 uppercase tracking-wider font-bold">For {selectedClub?.name}</p>
                        
                        <div className="relative mb-6">
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