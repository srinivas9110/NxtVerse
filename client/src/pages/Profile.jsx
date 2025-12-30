import React, { useEffect, useState, useRef } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MapPin, Github, Code, Globe, Edit3, Save, Award,
    ExternalLink, Camera, MessageSquare, UserPlus,
    Crown, Calendar, X, Lock, Hexagon, Box, Check, Clock
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

// --- RANK STYLING HELPER (Matches Arise Page) ---
const getRankStyle = (rank) => {
    if (!rank) return { color: 'text-gray-500', border: 'border-gray-700', bg: 'bg-white/5' };
    const r = rank.toUpperCase();
    if (r.includes('S-RANK')) return { color: 'text-yellow-400', border: 'border-yellow-500', bg: 'bg-yellow-500/10', shadow: 'shadow-yellow-500/20' };
    if (r.includes('A-RANK')) return { color: 'text-gray-200', border: 'border-gray-300', bg: 'bg-gray-400/10', shadow: 'shadow-gray-400/20' };
    if (r.includes('B-RANK')) return { color: 'text-blue-400', border: 'border-blue-500', bg: 'bg-blue-500/10', shadow: 'shadow-blue-500/20' };
    return { color: 'text-gray-500', border: 'border-gray-700', bg: 'bg-white/5', shadow: '' };
};

// --- ARTIFACT VAULT (BADGES SYSTEM) ---
const ArtifactVault = ({ formData }) => {
    const badges = [
        {
            id: 'builder',
            label: 'Architect',
            icon: <Box size={18} />,
            color: 'text-blue-400',
            glow: 'shadow-blue-500/20',
            border: 'border-blue-500/30',
            bg: 'bg-blue-500/10',
            unlocked: formData.projects && formData.projects.length > 0,
            desc: "Uploaded at least one Project Artifact."
        },
        {
            id: 'scholar',
            label: 'High Scholar',
            icon: <Award size={18} />,
            color: 'text-yellow-400',
            glow: 'shadow-yellow-500/20',
            border: 'border-yellow-500/30',
            bg: 'bg-yellow-500/10',
            unlocked: formData.achievements && formData.achievements.length > 0,
            desc: "Recorded a Trophy or Achievement."
        },
        {
            id: 'opensource',
            label: 'Open Source',
            icon: <Github size={18} />,
            color: 'text-purple-400',
            glow: 'shadow-purple-500/20',
            border: 'border-purple-500/30',
            bg: 'bg-purple-500/10',
            unlocked: formData.links?.github && formData.links.github.length > 0,
            desc: "Connected a Neural Link to GitHub."
        },
        {
            id: 'networker',
            label: 'Node Linker',
            icon: <Globe size={18} />,
            color: 'text-green-400',
            glow: 'shadow-green-500/20',
            border: 'border-green-500/30',
            bg: 'bg-green-500/10',
            unlocked: formData.links?.portfolio && formData.links.portfolio.length > 0,
            desc: "Established a Global Portfolio Link."
        },
        {
            id: 'leader',
            label: 'Apex Leader',
            icon: <Crown size={18} />,
            color: 'text-orange-400',
            glow: 'shadow-orange-500/20',
            border: 'border-orange-500/30',
            bg: 'bg-orange-500/10',
            unlocked: formData.isPresident || formData.role === 'faculty',
            desc: "Holds a Leadership or Faculty Position."
        }
    ];

    return (
        <div className="bg-[#111111] border border-white/5 rounded-2xl p-6 mb-8 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4 relative z-10">
                <Hexagon className="w-4 h-4 text-purple-500" />
                <h3 className="text-white font-bold">Artifact Vault</h3>
                <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                    {badges.filter(b => b.unlocked).length} / {badges.length} Unlocked
                </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 relative z-10">
                {badges.map((badge, i) => (
                    <div
                        key={i}
                        className={`
                            relative group p-4 rounded-xl border flex flex-col items-center justify-center gap-3 text-center transition-all duration-500
                            ${badge.unlocked
                                ? `bg-[#0a0a0a] ${badge.border} ${badge.glow} shadow-lg hover:-translate-y-1`
                                : 'bg-[#0a0a0a] border-white/5 opacity-50 grayscale'
                            }
                        `}
                    >
                        <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center
                            ${badge.unlocked ? badge.bg : 'bg-white/5'}
                        `}>
                            {badge.unlocked ? (
                                <div className={badge.color}>{badge.icon}</div>
                            ) : (
                                <Lock size={14} className="text-gray-500" />
                            )}
                        </div>
                        <div className="space-y-0.5">
                            <h4 className={`text-xs font-bold ${badge.unlocked ? 'text-gray-200' : 'text-gray-600'}`}>
                                {badge.label}
                            </h4>
                            <p className="text-[10px] text-gray-600 font-mono">
                                {badge.unlocked ? "ACQUIRED" : "LOCKED"}
                            </p>
                        </div>
                        <div className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-xl flex items-center justify-center p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                            <p className="text-[10px] text-gray-300 leading-tight">
                                {badge.desc}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-10 -mt-10" />
        </div>
    );
};

// --- MAIN PROFILE COMPONENT ---
export default function Profile() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [loading, setLoading] = useState(true);
    const [showEditModal, setShowEditModal] = useState(false);
    const [me, setMe] = useState(null); 
    const [ledClub, setLedClub] = useState(null);

    const [formData, setFormData] = useState({
        _id: '',
        fullName: '', collegeId: '', course: '', section: '', role: '',
        bio: '', profilePic: '', bannerImg: '',
        links: { github: '', leetcode: '', portfolio: '' },
        projects: [],
        achievements: [],
        connections: [],
        rank: 'E-Rank' // Default
    });

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        if (!token) { navigate('/login'); return; }

        try {
            setLoading(true);
            const myRes = await axios.get(`${API_URL}/api/auth/getuser`, { headers: { "auth-token": token } });
            setMe(myRes.data);

            if (id && id !== myRes.data._id) {
                const otherRes = await axios.get(`${API_URL}/api/auth/getuser/${id}`, { headers: { "auth-token": token } });
                setFormData(otherRes.data);
            } else {
                setFormData(myRes.data); 
            }
            setLoading(false);
        } catch (err) { console.error(err); setLoading(false); }
    };

    useEffect(() => {
        fetchData();
    }, [id]);

    useEffect(() => {
        const checkLeadership = async () => {
            if (formData && formData._id) {
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get(`${API_URL}/api/clubs/fetchall`, { headers: { "auth-token": token } });
                    const myClub = res.data.find(c => c.president === formData._id || c.president?._id === formData._id);
                    setLedClub(myClub);
                } catch (err) { console.error(err); }
            }
        };
        checkLeadership();
    }, [formData._id]);

    const handleConnect = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/users/connect/${formData._id}`, {}, { headers: { "auth-token": token } });
            setMe(prev => ({
                ...prev,
                requestsSent: [...(prev.requestsSent || []), formData._id]
            }));
        } catch (err) {
            console.error(err);
            alert("Connection request failed.");
        }
    };

    const handleSaveChanges = async (dataToSave) => {
        try {
            const token = localStorage.getItem('token');
            const payload = {
                fullName: dataToSave.fullName,
                bio: dataToSave.bio,
                profilePic: dataToSave.profilePic,
                bannerImg: dataToSave.bannerImg,
                links: dataToSave.links,
                projects: dataToSave.projects,
                achievements: dataToSave.achievements,
            };

            await axios.put(`${API_URL}/api/auth/update`, payload, {
                headers: { "auth-token": token }
            });

            alert("✅ Profile Updated Successfully");
            setShowEditModal(false);
            window.location.reload();

        } catch (err) {
            console.error(err);
            alert("❌ Update Failed: " + (err.response?.data?.message || "Server Error"));
        }
    };

    const isOwnProfile = me && formData._id === me._id;
    const isConnected = me?.connections?.some(conn => conn === formData._id || conn._id === formData._id);
    const isSent = me?.requestsSent?.includes(formData._id);
    const isReceived = me?.requestsReceived?.includes(formData._id);

    const getImg = (path) => path ? (path.startsWith('http') || path.startsWith('blob') ? path : `${API_URL}${path}`) : null;
    
    // 🟢 DYNAMIC RANK STYLE
    const rankStyle = getRankStyle(formData.rank);

    if (loading) return (
        <div className="h-screen bg-[#050505] flex items-center justify-center text-purple-500 font-mono tracking-widest animate-pulse">
            SYSTEM BOOT...
        </div>
    );

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30 overflow-x-hidden">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px]" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* 1. LEFT COLUMN: ID CARD */}
                <div className="lg:col-span-4 lg:sticky lg:top-8 h-fit space-y-6">
                    <div className="bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative group">
                        
                        {/* Banner */}
                        <div className="h-32 bg-gradient-to-r from-gray-900 to-black relative">
                            {formData.bannerImg && <img src={getImg(formData.bannerImg)} className="w-full h-full object-cover opacity-60" />}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#111111] to-transparent" />
                        </div>

                        {/* Avatar */}
                        <div className="px-6 pb-8 relative -mt-16 text-center">
                            <div className="relative inline-block">
                                <div className="w-32 h-32 rounded-2xl p-[2px] bg-gradient-to-br from-purple-500 to-blue-500 shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                                    <div className="w-full h-full rounded-2xl bg-[#0a0a0a] overflow-hidden">
                                        {formData.profilePic ? (
                                            <img src={getImg(formData.profilePic)} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-700">
                                                {formData.fullName?.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {ledClub && (
                                    <div className="absolute -top-2 -right-2 bg-yellow-500 text-black p-1.5 rounded-lg shadow-lg" title={`President of ${ledClub.name}`}>
                                        <Zap size={16} fill="currentColor" />
                                    </div>
                                )}
                            </div>

                            <h1 className="text-2xl font-bold mt-4 text-white">{formData.fullName}</h1>
                            
                            {/* 🟢 FIXED: Dynamic Rank Badge */}
                            <div className="flex items-center justify-center gap-2 mt-1 mb-4">
                                <span className={`px-3 py-1 rounded text-[10px] font-bold tracking-widest uppercase border 
                                    ${formData.role === 'faculty' 
                                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' 
                                        : `${rankStyle.bg} ${rankStyle.border} ${rankStyle.color} ${rankStyle.shadow}`
                                    }`}>
                                    {formData.role === 'faculty' ? 'FACULTY' : formData.rank || 'E-RANK'}
                                </span>
                            </div>

                            <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                {formData.bio || "No bio data available."}
                            </p>

                            <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 mb-6 font-mono">
                                <div className="bg-white/5 p-2 rounded border border-white/5">
                                    <div className="mb-1 text-gray-300 flex justify-center"><Code size={14} /></div>
                                    {formData.course || "N/A"}
                                </div>
                                <div className="bg-white/5 p-2 rounded border border-white/5">
                                    <div className="mb-1 text-gray-300 flex justify-center"><MapPin size={14} /></div>
                                    Sec {formData.section}
                                </div>
                            </div>

                            <div className="flex justify-center gap-4 mb-8">
                                {formData.links?.github && (<a href={formData.links.github} target="_blank" className="text-gray-400 hover:text-white transition"><Github size={20} /></a>)}
                                {formData.links?.leetcode && (<a href={formData.links.leetcode} target="_blank" className="text-gray-400 hover:text-white transition"><Code size={20} /></a>)}
                                {formData.links?.portfolio && (<a href={formData.links.portfolio} target="_blank" className="text-gray-400 hover:text-white transition"><Globe size={20} /></a>)}
                            </div>

                            {isOwnProfile ? (
                                <button onClick={() => setShowEditModal(true)} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm transition-all flex items-center justify-center gap-2">
                                    <Edit3 size={16} /> Edit System
                                </button>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {isConnected ? (
                                        <button onClick={() => navigate(`/messages`, { state: { startChat: formData } })} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all">
                                            <MessageSquare size={16} /> Message
                                        </button>
                                    ) : isSent ? (
                                        <button disabled className="w-full py-3 rounded-xl bg-white/5 text-gray-500 border border-white/5 font-bold text-sm flex items-center justify-center gap-2 cursor-wait">
                                            <Clock size={16} className="animate-pulse" /> Pending
                                        </button>
                                    ) : isReceived ? (
                                        <button disabled className="w-full py-3 rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-bold text-sm flex items-center justify-center gap-2">
                                            <Check size={16} /> Accept Request
                                        </button>
                                    ) : (
                                        <button onClick={handleConnect} className="w-full py-3 rounded-xl bg-white/5 hover:bg-purple-600 hover:text-white text-gray-300 border border-white/10 hover:border-purple-500/50 font-bold text-sm transition-all flex items-center justify-center gap-2">
                                            <UserPlus size={16} /> Connect
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. RIGHT COLUMN: FEED */}
                <div className="lg:col-span-8 space-y-8">
                    <ArtifactVault formData={formData} />

                    <div>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Award className="text-yellow-500" /> Trophies & Medals
                        </h2>
                        {formData.achievements.length === 0 ? (
                            <div className="bg-[#111111] border border-white/5 rounded-2xl p-8 text-center text-gray-600 text-sm">No trophies detected.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {formData.achievements.map((ach, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-[#111111] border border-white/5 hover:border-yellow-500/30 p-4 rounded-xl flex items-start gap-3 group transition-all">
                                        <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-lg group-hover:scale-110 transition-transform"><Award size={20} /></div>
                                        <div><h4 className="font-bold text-sm text-gray-200">{ach.title}</h4><p className="text-xs text-gray-500 mt-1">{ach.date} • {ach.type}</p></div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Code className="text-blue-500" /> Project Artifacts
                        </h2>
                        {formData.projects.length === 0 ? (
                            <div className="bg-[#111111] border border-white/5 rounded-2xl p-8 text-center text-gray-600 text-sm">No artifacts uploaded.</div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {formData.projects.map((proj, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="bg-[#111111] border border-white/5 hover:border-blue-500/30 p-6 rounded-2xl group transition-all relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors" />
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{proj.title}</h3>
                                                {proj.link && (<a href={proj.link} target="_blank" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"><ExternalLink size={16} /></a>)}
                                            </div>
                                            <p className="text-sm text-gray-400 leading-relaxed max-w-2xl">{proj.description}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showEditModal && <EditModal formData={formData} setFormData={setFormData} onClose={() => setShowEditModal(false)} onSave={handleSaveChanges} />}
            </AnimatePresence>
        </div>
    );
}

function EditModal({ formData, setFormData, onClose, onSave }) {
    const avatarRef = useRef(null);
    const bannerRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const uploadedUrls = useRef({}); 

    const handleFile = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;
        const previewUrl = URL.createObjectURL(file);
        const fieldName = type === 'avatar' ? 'profilePic' : 'bannerImg';
        const oldImage = formData[fieldName];
        setFormData(prev => ({ ...prev, [fieldName]: previewUrl }));
        setIsUploading(true);
        const data = new FormData();
        data.append('file', file); 
        data.append('upload_preset', import.meta.env.VITE_UPLOAD_PRESET);
        data.append('cloud_name', import.meta.env.VITE_CLOUD_NAME);
        try {
            const cloudName = import.meta.env.VITE_CLOUD_NAME;
            const res = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, data);
            uploadedUrls.current[fieldName] = res.data.secure_url;
        } catch (err) {
            alert("Image upload failed. Please check your internet connection.");
            setFormData(prev => ({ ...prev, [fieldName]: oldImage })); 
        } finally {
            setIsUploading(false);
        }
    };

    const handleLocalSave = () => {
        const dataToSave = { ...formData, ...uploadedUrls.current };
        onSave(dataToSave);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-[#111111] border border-white/10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl custom-scrollbar">
                <div className="sticky top-0 bg-[#111111]/90 backdrop-blur-md p-6 border-b border-white/5 flex justify-between items-center z-10">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Edit3 size={20} className="text-purple-500" /> System Configuration</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-8">
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Visuals</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div onClick={() => avatarRef.current.click()} className="h-32 bg-white/5 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition group"><Camera className="mb-2 text-gray-400 group-hover:text-white" /><span className="text-xs text-gray-500">Update Avatar</span><input type="file" hidden ref={avatarRef} onChange={e => handleFile(e, 'avatar')} /></div>
                            <div onClick={() => bannerRef.current.click()} className="h-32 bg-white/5 rounded-xl border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/10 transition group"><Zap className="mb-2 text-gray-400 group-hover:text-white" /><span className="text-xs text-gray-500">Update Banner</span><input type="file" hidden ref={bannerRef} onChange={e => handleFile(e, 'banner')} /></div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Identity</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <input className="bg-[#0a0a0a] border border-white/10 p-3 rounded-lg text-sm text-white focus:border-purple-500 outline-none" placeholder="Full Name" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                            <input className="bg-[#0a0a0a] border border-white/10 p-3 rounded-lg text-sm text-white focus:border-purple-500 outline-none" placeholder="Bio / Status" value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Neural Links</h3>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 bg-[#0a0a0a] border border-white/10 p-2 rounded-lg"><Github size={16} className="text-gray-500" /><input className="bg-transparent outline-none flex-1 text-sm text-white" placeholder="GitHub URL" value={formData.links.github} onChange={e => setFormData({ ...formData, links: { ...formData.links, github: e.target.value } })} /></div>
                            <div className="flex items-center gap-2 bg-[#0a0a0a] border border-white/10 p-2 rounded-lg"><Code size={16} className="text-gray-500" /><input className="bg-transparent outline-none flex-1 text-sm text-white" placeholder="LeetCode URL" value={formData.links.leetcode} onChange={e => setFormData({ ...formData, links: { ...formData.links, leetcode: e.target.value } })} /></div>
                            <div className="flex items-center gap-2 bg-[#0a0a0a] border border-white/10 p-2 rounded-lg"><Globe size={16} className="text-gray-500" /><input className="bg-transparent outline-none flex-1 text-sm text-white" placeholder="Portfolio URL" value={formData.links.portfolio} onChange={e => setFormData({ ...formData, links: { ...formData.links, portfolio: e.target.value } })} /></div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center"><h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Artifacts</h3><button onClick={() => setFormData({ ...formData, projects: [...formData.projects, { title: '', description: '', link: '' }] })} className="text-xs bg-white/10 text-white px-2 py-1 rounded hover:bg-white/20">+ Add New</button></div>
                        {formData.projects.map((proj, i) => (
                            <div key={i} className="bg-[#0a0a0a] p-3 rounded-lg border border-white/10 space-y-2 relative">
                                <button onClick={() => { const newP = formData.projects.filter((_, idx) => idx !== i); setFormData({ ...formData, projects: newP }); }} className="absolute top-2 right-2 text-red-500 text-xs hover:text-red-400">Remove</button>
                                <input placeholder="Title" className="bg-transparent border-b border-white/10 w-full text-sm text-white pb-1 outline-none" value={proj.title} onChange={e => { const newP = [...formData.projects]; newP[i].title = e.target.value; setFormData({ ...formData, projects: newP }); }} />
                                <textarea placeholder="Description" className="bg-transparent w-full text-xs text-gray-400 outline-none" rows={2} value={proj.description} onChange={e => { const newP = [...formData.projects]; newP[i].description = e.target.value; setFormData({ ...formData, projects: newP }); }} />
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-6 border-t border-white/5 flex justify-end gap-3 sticky bottom-0 bg-[#111111]">
                    <button onClick={onClose} className="px-6 py-2 rounded-xl font-bold text-sm text-gray-400 hover:text-white transition">Cancel</button>
                    <button onClick={handleLocalSave} disabled={isUploading} className="px-8 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-500/20 transition disabled:opacity-50">
                        {isUploading ? "Uploading..." : "Save Changes"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}