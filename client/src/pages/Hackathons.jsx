import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import {
    Users, Rocket, Plus, X, Sword, Github, ExternalLink,
    Sliders, TrendingUp, Trash2, Calendar,
    CheckCircle, ChevronDown, Crown, Zap, UserMinus, Eye,
    MessageSquare, UserCheck, XCircle, User, AlertTriangle, Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- SUB-COMPONENT: FACULTY GRADER ---
const FacultyGrader = ({ team, onPostScore }) => {
    const [localScores, setLocalScores] = useState({
        innovation: team.scores?.innovation || 0,
        codeQuality: team.scores?.codeQuality || 0,
        presentation: team.scores?.presentation || 0
    });

    return (
        <div className="bg-black/40 border-t border-white/5 p-4 animate-in fade-in mt-4 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <ScoreSlider label="Innovation" val={localScores.innovation} setVal={v => setLocalScores({ ...localScores, innovation: v })} />
                <ScoreSlider label="Code Quality" val={localScores.codeQuality} setVal={v => setLocalScores({ ...localScores, codeQuality: v })} />
                <ScoreSlider label="Pitch" val={localScores.presentation} setVal={v => setLocalScores({ ...localScores, presentation: v })} />
            </div>
            <button onClick={() => onPostScore(team._id, localScores)} className="w-full bg-white text-black font-bold py-2 rounded-lg hover:bg-gray-200 transition-colors shadow-lg">
                Post Score
            </button>
        </div>
    );
};

function ScoreSlider({ label, val, setVal }) {
    return (
        <div>
            <div className="flex justify-between mb-1"><label className="text-[10px] font-bold text-gray-400 uppercase">{label}</label><span className="text-xs font-bold font-mono text-white">{val}/10</span></div>
            <input type="range" min="0" max="10" value={val} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" onChange={(e) => setVal(parseInt(e.target.value))} />
        </div>
    )
}

export default function Hackathons() {
    const navigate = useNavigate();

    // Core State
    const [hackathons, setHackathons] = useState([]);
    const [activeHack, setActiveHack] = useState(null);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('squads');

    // Modals
    const [showCreateSquad, setShowCreateSquad] = useState(false);
    const [showLaunchpad, setShowLaunchpad] = useState(false);
    const [showCreateHack, setShowCreateHack] = useState(false);
    const [showManageEvent, setShowManageEvent] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

    // Applicants Modal State
    const [viewApplicants, setViewApplicants] = useState(null); 

    // Forms
    const [newSquadName, setNewSquadName] = useState("");
    const [squadRoles, setSquadRoles] = useState([]);
    const [currentRoleInput, setCurrentRoleInput] = useState("");
    const [submission, setSubmission] = useState({ title: '', repoLink: '', liveLink: '', description: '' });
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [newEvent, setNewEvent] = useState({ title: '', date: '', description: '', minTeamSize: 2, maxTeamSize: 5 });

    // 1. INIT
    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }
            try {
                const userRes = await axios.get(`${API_URL}/api/auth/getuser`, { headers: { "auth-token": token } });
                setUser(userRes.data);
                const hackRes = await axios.get(`${API_URL}/api/hackathons/fetchall`, { headers: { "auth-token": token } });
                setHackathons(hackRes.data);
                if (hackRes.data.length > 0) setActiveHack(hackRes.data[0]);
                setLoading(false);
            } catch (err) { console.error(err); }
        };
        init();
    }, [navigate]);

    // 2. FETCH TEAMS
    const fetchTeams = async () => {
        if (!activeHack) return;
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${API_URL}/api/hackathons/${activeHack._id}/teams`, { headers: { "auth-token": token } });
            const sorted = res.data.sort((a, b) => b.scores.totalScore - a.scores.totalScore);
            setTeams(sorted);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (!activeHack) { setTeams([]); return; };
        fetchTeams();
        const interval = setInterval(fetchTeams, 5000);
        return () => clearInterval(interval);
    }, [activeHack]);

    // Helpers
    const addRoleTag = () => { 
        if (currentRoleInput.trim()) { 
            // 🟢 VALIDATION: Check Role Limit
            const maxRoles = (activeHack?.teamSize?.max || 5) - 1;
            if (squadRoles.length >= maxRoles) {
                alert(`Strategy Limit Reached: You can only recruit ${maxRoles} allies.`);
                return;
            }
            setSquadRoles([...squadRoles, currentRoleInput.trim()]); 
            setCurrentRoleInput(""); 
        } 
    };
    const removeRoleTag = (index) => { setSquadRoles(squadRoles.filter((_, i) => i !== index)); };

    // --- ACTIONS ---

    const handleCreateSquad = async () => {
        if (!activeHack) return;
        const minRoles = (activeHack.teamSize?.min || 2) - 1;
        
        // 🟢 UI VALIDATION
        if (squadRoles.length < minRoles) {
            return alert(`Invalid Strategy: This hackathon requires a minimum squad size of ${activeHack.teamSize.min}. You must define at least ${minRoles} roles.`);
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/hackathons/team/create`, {
                hackathonId: activeHack._id, name: newSquadName, lookingFor: squadRoles
            }, { headers: { "auth-token": token } });
            setShowCreateSquad(false);
            setNewSquadName(""); setSquadRoles([]);
            fetchTeams();
        } catch (err) { alert(err.response?.data?.message || "Failed"); }
    };

    // APPLICATION FLOW
    const handleApply = async (teamId, role) => {
        if (!window.confirm(`Apply to join as ${role}?`)) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/hackathons/team/apply/${teamId}`, { role }, { headers: { "auth-token": token } });
            alert("✅ Application Sent!");
            fetchTeams();
        } catch (err) { alert(err.response?.data?.message || "Failed"); }
    };

    const handleAcceptRequest = async (teamId, applicantId, role) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/hackathons/team/accept/${teamId}`, { applicantId, role }, { headers: { "auth-token": token } });
            alert("✅ Member Accepted!");
            setViewApplicants(null); 
            fetchTeams();
        } catch (err) { alert(err.response?.data?.message || "Failed"); }
    };

    const handleRejectRequest = async (teamId, applicantId) => {
        if (!window.confirm("Reject this application?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/hackathons/team/reject/${teamId}`, { applicantId }, { headers: { "auth-token": token } });
            setViewApplicants(null);
            fetchTeams();
        } catch (err) { alert("Failed"); }
    };

    const handleRemoveMember = async (teamId, memberId) => {
        if (!window.confirm("Remove this member from the squad?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/hackathons/team/removeMember/${teamId}`, { memberId }, { headers: { "auth-token": token } });
            fetchTeams();
        } catch (err) { alert(err.response?.data?.message || "Failed"); }
    };

    const handleUpdateStatus = async (status) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/hackathons/${activeHack._id}/status`, { status }, { headers: { "auth-token": token } });
            setActiveHack({ ...activeHack, status: status });
            setShowManageEvent(false);
            alert(`Event is now ${status}`);
        } catch (err) { alert("Failed"); }
    };

    const handleDeleteHackathon = async () => {
        if (!window.confirm("DELETE EVENT? This will remove all teams and data.")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/hackathons/${activeHack._id}`, { headers: { "auth-token": token } });
            window.location.reload();
        } catch (err) { alert("Failed"); }
    };

    const handleSubmitProject = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/hackathons/team/submit/${selectedTeam._id}`, submission, { headers: { "auth-token": token } });
            setShowLaunchpad(false);
            alert("🚀 Project Launched!");
            fetchTeams();
        } catch (err) { 
            alert("❌ " + (err.response?.data?.message || "Submission Failed")); 
        }
    };

    const handlePostScore = async (teamId, scoreData) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/hackathons/team/score/${teamId}`, scoreData, { headers: { "auth-token": token } });
            alert("✅ Scores Updated");
            fetchTeams();
        } catch (err) { alert("Failed"); }
    };

    const handleCreateHackathon = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/api/hackathons/create`, newEvent, { headers: { "auth-token": token } });
            setHackathons(prev => [res.data, ...prev]);
            setActiveHack(res.data);
            setShowCreateHack(false);
            setNewEvent({ title: '', date: '', description: '', minTeamSize: 2, maxTeamSize: 5 });
            alert("✅ Event Published Successfully!");
        } catch (err) { 
            console.error(err);
            alert("❌ Creation Failed: " + (err.response?.data?.error || "Server Error")); 
        }
    };

    if (loading) return <div className="p-8 text-gray-500 bg-[#050505] min-h-screen">Loading The Arena...</div>;

    const isFaculty = user?.role === 'faculty';
    const isRegistrationOpen = activeHack?.status === 'upcoming';
    const userActiveTeam = teams.find(t => t.leader._id === user?._id || t.members.some(m => m.user._id === user?._id));
    const userIsActive = !!userActiveTeam;

    let engagementText = "";
    if (activeHack) {
        if (teams.length === 0) engagementText = "Be the first to forge a legacy. Create a squad now.";
        else if (teams.length > 8) engagementText = "🔥 The Arena is heating up! Squads are filling fast.";
        else if (!userIsActive) engagementText = "You are fighting alone. Find your allies.";
    }

    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 md:p-8 relative">
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none"></div>

            {/* HEADER */}
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-end mb-8 pb-6 border-b border-white/5 gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2"><Sword className="text-purple-500" size={32} /><h1 className="text-3xl font-bold">The Arena</h1></div>
                    <p className="text-gray-400 font-medium">Official Hackathon Battleground</p>
                </div>
                <div className="flex items-center gap-3">
                    {activeHack && (
                        <div className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 border ${activeHack.status === 'live' ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${activeHack.status === 'live' ? 'bg-red-500' : 'bg-blue-500'}`}></div>{activeHack.status}
                        </div>
                    )}
                    <div className="relative">
                        <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-3 bg-[#121214] border border-white/10 rounded-xl px-4 py-2.5 min-w-[200px] text-sm font-bold text-white hover:bg-[#18181b] transition-all">
                            <span className="truncate flex-1 text-left">{activeHack ? activeHack.title : "Select Event"}</span><ChevronDown size={14} />
                        </button>
                        {showDropdown && (
                            <div className="absolute top-full right-0 mt-2 w-full bg-[#121214] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                                {hackathons.map(h => (<button key={h._id} onClick={() => { setActiveHack(h); setShowDropdown(false); }} className="w-full text-left px-4 py-3 text-sm font-bold border-b border-white/5 hover:bg-white/5">{h.title}</button>))}
                            </div>
                        )}
                    </div>
                    {isFaculty && (
                        <>
                            <button onClick={() => setShowCreateHack(true)} className="bg-white/5 p-2.5 rounded-xl hover:bg-white/10"><Plus size={20} /></button>
                            <button onClick={() => setShowManageEvent(true)} className="bg-white/5 p-2.5 rounded-xl hover:bg-white/10"><Sliders size={20} /></button>
                        </>
                    )}
                </div>
            </div>

            {/* TABS & ENGAGEMENT BANNER */}
            <div className="flex flex-col md:flex-row gap-6 mb-8 relative z-10 items-start md:items-center justify-between">
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('squads')} className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'squads' ? 'bg-white text-black' : 'bg-[#121214] text-gray-500 border border-white/5'}`}><Users size={16} /> Squad Forge</button>
                    <button onClick={() => setActiveTab('grid')} className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'grid' ? 'bg-white text-black' : 'bg-[#121214] text-gray-500 border border-white/5'}`}><TrendingUp size={16} /> Podium</button>
                </div>
                {activeTab === 'squads' && activeHack && engagementText && (
                    <div className="text-xs font-bold text-purple-400 bg-purple-500/10 px-4 py-2 rounded-full border border-purple-500/20 animate-pulse flex items-center gap-2">
                        <Zap size={12} /> {engagementText}
                    </div>
                )}
            </div>

            {/* --- SQUAD FORGE --- */}
            {activeTab === 'squads' && activeHack && (
                <div className="relative z-10">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-200">Active Squads <span className="text-gray-500 text-sm ml-2">({teams.length})</span></h2>
                        {isRegistrationOpen && !userIsActive && !isFaculty && (
                            <button onClick={() => setShowCreateSquad(true)} className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-900/20 transition-all">
                                <Plus size={18} /> Forge New Squad
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {teams.map(team => {
                            const isMember = team.members.some(m => m.user._id === user._id);
                            const isLeader = team.leader._id === user._id;
                            const isFull = team.members.length >= (activeHack.teamSize?.max || 5);
                            const isMinMet = team.members.length >= (activeHack.teamSize?.min || 2);

                            // 🟢 1. Create a copy of roles looking for
                            let remainingLookingFor = [...team.lookingFor];

                            return (
                                <div key={team._id} className={`bg-[#121214] rounded-2xl p-6 border border-white/5 hover:border-purple-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-900/10 group flex flex-col h-full ${userIsActive && !isMember && !isFaculty ? 'opacity-60 grayscale' : ''}`}>

                                    {/* Card Header */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-black text-white mb-1 group-hover:text-purple-400 transition-colors">{team.name}</h3>
                                            <p className="text-xs text-gray-500 font-bold flex items-center gap-1"><Crown size={12} className="text-yellow-500" /> {team.leader.fullName}</p>
                                        </div>
                                        <div className="bg-white/5 px-2 py-1 rounded text-[10px] font-bold text-gray-400 border border-white/5">
                                            {team.members.length}/{activeHack.teamSize?.max}
                                        </div>
                                    </div>

                                    {/* Members List */}
                                    <div className="space-y-2 mb-6 flex-1">
                                        {team.members.map((m, idx) => {
                                            // 🟢 2. Remove role from list if filled
                                            const filledRoleIndex = remainingLookingFor.findIndex(r => r.toLowerCase() === m.role.toLowerCase());
                                            if (filledRoleIndex !== -1) {
                                                 remainingLookingFor.splice(filledRoleIndex, 1);
                                            }

                                            const roleApplicants = team.requests?.filter(r => r.role === m.role);
                                            const hasApplied = roleApplicants?.some(r => r.user._id === user._id);
                                            const applicantCount = roleApplicants?.length || 0;

                                            return (
                                            <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-black/40 border border-white/5 group/member">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                    <span className="text-xs font-bold text-gray-300">{m.user.fullName}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-500 uppercase font-bold">{m.role}</span>
                                                    
                                                    {/* 🟢 COMPETITIVE APPLY (Challenge) */}
                                                    {!userIsActive && isRegistrationOpen && !isFaculty && !isFull && !hasApplied && m.user._id !== user._id && m.role !== 'Leader' && (
                                                        <button onClick={() => handleApply(team._id, m.role)} className="opacity-0 group-hover/member:opacity-100 text-[9px] bg-blue-600 hover:bg-blue-500 text-white px-1.5 py-0.5 rounded transition-all">
                                                            Challenge
                                                        </button>
                                                    )}

                                                    {/* VIEW WAITLIST */}
                                                    {isLeader && applicantCount > 0 && (
                                                        <button onClick={() => setViewApplicants({ teamId: team._id, role: m.role, applicants: roleApplicants })} className="flex items-center gap-1 text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500 hover:text-white transition-all">
                                                            <User size={12} /> {applicantCount}
                                                        </button>
                                                    )}

                                                    {/* REMOVE */}
                                                    {isLeader && m.user._id !== user._id && (
                                                        <button onClick={() => handleRemoveMember(team._id, m.user._id)} className="opacity-0 group-hover/member:opacity-100 text-red-500 hover:bg-red-500/10 p-1 rounded transition-all">
                                                            <UserMinus size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )})}

                                        {/* 🟢 3. Open Roles */}
                                        {remainingLookingFor.map((role, idx) => {
                                            const roleApplicants = team.requests?.filter(r => r.role === role);
                                            const hasApplied = roleApplicants?.some(r => r.user._id === user._id);
                                            const applicantCount = roleApplicants?.length || 0;

                                            return (
                                                <div key={`role-${idx}`} className="flex justify-between items-center p-2 rounded-lg border border-dashed border-gray-700">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-pulse"></div>
                                                        <span className="text-xs font-bold text-gray-500">{role}</span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {isLeader && applicantCount > 0 && (
                                                            <button onClick={() => setViewApplicants({ teamId: team._id, role, applicants: roleApplicants })} className="flex items-center gap-1 text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2 py-1 rounded hover:bg-blue-500 hover:text-white transition-all">
                                                                <User size={12} /> {applicantCount}
                                                            </button>
                                                        )}

                                                        {!userIsActive && isRegistrationOpen && !isFaculty && !isFull && !hasApplied && (
                                                            <button onClick={() => handleApply(team._id, role)} className="text-[10px] font-bold text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 px-2 py-1 rounded transition-all">
                                                                APPLY
                                                            </button>
                                                        )}

                                                        {hasApplied && <span className="text-[10px] text-yellow-500 font-bold bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">Pending</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* ACTIONS */}
                                    {isLeader && activeHack.status === 'live' && (
                                        <>
                                            {/* 🟢 WARNING: Cannot submit if team too small */}
                                            {!isMinMet ? (
                                                <div className="w-full py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold flex items-center justify-center gap-2">
                                                    <AlertTriangle size={14} /> Need {activeHack.teamSize.min - team.members.length} More Member(s)
                                                </div>
                                            ) : (
                                                <button onClick={() => { setSelectedTeam(team); setShowLaunchpad(true); }} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2">
                                                    {team.project?.repoLink ? "Update Submission" : "Submit Project"} <Rocket size={14} />
                                                </button>
                                            )}
                                        </>
                                    )}
                                    {isFaculty && team.project?.repoLink && (
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            <a href={team.project.repoLink} target="_blank" rel="noreferrer" className="bg-white/5 py-2 rounded-lg text-center text-xs font-bold text-gray-300 hover:bg-white/10 flex items-center justify-center gap-2"><Github size={12} /> Code</a>
                                            {team.project.liveLink && <a href={team.project.liveLink} target="_blank" rel="noreferrer" className="bg-white/5 py-2 rounded-lg text-center text-xs font-bold text-green-400 hover:bg-white/10 flex items-center justify-center gap-2"><ExternalLink size={12} /> Live</a>}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ... Keep all existing Modals exactly as they were ... */}
            {/* The Modals section is unchanged from previous version, just ensure they are included */}
            
            {viewApplicants && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#18181b] border border-white/10 p-6 rounded-2xl w-full max-w-sm relative shadow-2xl">
                        <button onClick={() => setViewApplicants(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={18} /></button>
                        <h3 className="text-lg font-bold text-white mb-1">Applicants</h3>
                        <p className="text-xs text-gray-500 mb-4 uppercase font-bold">Role: {viewApplicants.role}</p>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {viewApplicants.applicants.map(req => (
                                <div key={req._id} className="flex justify-between items-center bg-black/40 p-3 rounded-lg border border-white/5">
                                    <span className="text-sm font-bold text-white">{req.user.fullName}</span>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleAcceptRequest(viewApplicants.teamId, req.user._id, viewApplicants.role)} className="p-1.5 bg-green-500/10 text-green-500 rounded hover:bg-green-500 hover:text-black transition-all" title="Accept"><CheckCircle size={16} /></button>
                                        <button onClick={() => handleRejectRequest(viewApplicants.teamId, req.user._id)} className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-black transition-all" title="Reject"><XCircle size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {showCreateSquad && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#18181b] border border-white/10 p-8 rounded-3xl w-full max-w-md relative shadow-2xl">
                        <button onClick={() => setShowCreateSquad(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X /></button>
                        <h2 className="text-xl font-bold mb-6 text-white">Assemble Squad</h2>
                        <div className="space-y-4">
                            <input className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white" placeholder="Squad Name" value={newSquadName} onChange={e => setNewSquadName(e.target.value)} />
                            
                            <div className="flex justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
                                <span>Define Roles</span>
                                <span>{squadRoles.length} / {(activeHack?.teamSize?.max || 5) - 1} slots</span>
                            </div>

                            <div>
                                <div className="flex gap-2 mb-2">
                                    <input className="flex-1 bg-black/40 border border-white/10 p-3 rounded-xl text-white text-sm" placeholder="Add Role (e.g. Designer)" value={currentRoleInput} onChange={e => setCurrentRoleInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRoleTag()} />
                                    <button onClick={addRoleTag} className="bg-white/10 px-4 rounded-xl text-white font-bold">+</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {squadRoles.map((role, i) => (<span key={i} className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs flex items-center gap-1">{role} <X size={10} className="cursor-pointer" onClick={() => removeRoleTag(i)} /></span>))}
                                </div>
                            </div>
                            <button onClick={handleCreateSquad} className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold text-white mt-2">Initialize Squad</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Launchpad, CreateHack, ManageEvent modals remain unchanged... */}
            {showLaunchpad && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#18181b] border border-white/10 p-8 rounded-3xl w-full max-w-lg relative shadow-2xl">
                        <button onClick={() => setShowLaunchpad(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X /></button>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Rocket className="text-purple-500" /> Project Submission</h2>
                        <div className="space-y-3">
                            <input className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white" placeholder="Project Title" onChange={e => setSubmission({ ...submission, title: e.target.value })} />
                            <input className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white" placeholder="GitHub Repo URL" onChange={e => setSubmission({ ...submission, repoLink: e.target.value })} />
                            <input className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white" placeholder="Live Demo URL (Optional)" onChange={e => setSubmission({ ...submission, liveLink: e.target.value })} />
                            <textarea className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white" rows="3" placeholder="Short Description..." onChange={e => setSubmission({ ...submission, description: e.target.value })} />
                            <button onClick={handleSubmitProject} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-3 rounded-xl font-bold text-white mt-2 shadow-lg">🚀 Launch Project</button>
                        </div>
                    </div>
                </div>
            )}

            {showCreateHack && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#18181b] border border-white/10 p-8 rounded-3xl w-full max-w-md relative">
                        <button onClick={() => setShowCreateHack(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X /></button>
                        <h2 className="text-xl font-bold mb-4">Create Event</h2>
                        <div className="space-y-3">
                            <input className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white" placeholder="Event Title" onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
                            <input className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white" placeholder="Date string" onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} />
                            <div className="flex gap-2">
                                <input type="number" min="1" className="w-1/2 bg-black/40 border border-white/10 p-3 rounded-xl text-white" placeholder="Min Size" onChange={e => setNewEvent({ ...newEvent, minTeamSize: e.target.value })} />
                                <input type="number" min="1" className="w-1/2 bg-black/40 border border-white/10 p-3 rounded-xl text-white" placeholder="Max Size" onChange={e => setNewEvent({ ...newEvent, maxTeamSize: e.target.value })} />
                            </div>
                            <textarea className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-white" rows="3" placeholder="Description" onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} />
                            <button onClick={handleCreateHackathon} className="w-full bg-white text-black font-bold py-3 rounded-xl mt-2">Publish Event</button>
                        </div>
                    </div>
                </div>
            )}

            {showManageEvent && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#121214] border border-white/10 p-6 rounded-2xl w-full max-w-sm relative shadow-2xl">
                        <button onClick={() => setShowManageEvent(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white"><Sliders size={20} className="text-purple-500" /> Event Settings</h2>

                        <div className="space-y-3 mb-6">
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest ml-1">Event Status</p>

                            <button onClick={() => handleUpdateStatus('upcoming')} className="w-full p-3.5 text-left rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all flex items-center gap-3 group">
                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all"><Calendar size={18} /></div>
                                <span className="font-medium text-gray-300 group-hover:text-white">Set as Upcoming</span>
                            </button>

                            <button onClick={() => handleUpdateStatus('live')} className="w-full p-3.5 text-left rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all flex items-center gap-3 group">
                                <div className="p-2 bg-red-500/10 rounded-lg text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all"><Zap size={18} /></div>
                                <span className="font-medium text-gray-300 group-hover:text-white">Set as Live</span>
                            </button>

                            <button onClick={() => handleUpdateStatus('completed')} className="w-full p-3.5 text-left rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all flex items-center gap-3 group">
                                <div className="p-2 bg-green-500/10 rounded-lg text-green-500 group-hover:bg-green-500 group-hover:text-white transition-all"><CheckCircle size={18} /></div>
                                <span className="font-medium text-gray-300 group-hover:text-white">Set as Completed</span>
                            </button>
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <button onClick={handleDeleteHackathon} className="w-full py-3 bg-red-500/5 hover:bg-red-500/10 text-red-500 border border-red-500/10 hover:border-red-500/30 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                                <Trash2 size={16} /> Delete Event
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}