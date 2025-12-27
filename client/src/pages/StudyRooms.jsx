import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import { JitsiMeeting } from '@jitsi/react-sdk';
import {
    Zap, Users, Clock, Plus, X, Monitor,
    Headphones, Play, Pause, LogOut, Target,
    Trash2, Volume2, Timer, Wifi, Lock, Key,
    ChevronRight, ChevronLeft, Settings, Save, CheckCircle, UserPlus, Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// 🎵 Free Lo-Fi Stream URL
const LOFI_STREAM_URL = "https://stream.zeno.fm/0r0xa792kwzuv";

// --- CUSTOM LOADER ---
const NeuralLoader = () => (
    <div className="absolute inset-0 bg-[#000000] flex flex-col items-center justify-center z-50 text-white">
        <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full animate-ping"></div>
            <div className="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin"></div>
            <div className="absolute inset-4 bg-purple-500/20 rounded-full blur-md"></div>
        </div>
        <h3 className="text-xl font-bold tracking-widest animate-pulse text-purple-200">ESTABLISHING UPLINK</h3>
        <p className="text-xs text-purple-500 font-mono mt-2">Encrypting Neural Data...</p>
    </div>
);

export default function StudyRooms() {
    const navigate = useNavigate();

    // Data States
    const [rooms, setRooms] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [connections, setConnections] = useState([]); // 🟢 For Invite System
    const [loading, setLoading] = useState(true);
    const [meetingLoaded, setMeetingLoaded] = useState(false);

    // UI States
    const [activePod, setActivePod] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showGoalModal, setShowGoalModal] = useState(false);
    const [showPasscodeModal, setShowPasscodeModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false); // 🟢 Invite Modal
    
    // Sidebar Toggle
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Selection States
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [passcodeInput, setPasscodeInput] = useState("");

    // Focus Features
    const [sessionGoal, setSessionGoal] = useState("");
    const [timer, setTimer] = useState(25 * 60);
    const [isTimerRunning, setIsTimerRunning] = useState(false);
    const [isRadioPlaying, setIsRadioPlaying] = useState(false);

    // Host Controls
    const [editLimit, setEditLimit] = useState(5);

    // Create Room Form
    const [newRoom, setNewRoom] = useState({
        name: '', subject: '', maxParticipants: 5, duration: '1 hour',
        isPrivate: false, passcode: ''
    });

    const audioRef = useRef(new Audio(LOFI_STREAM_URL));

    // 1. Fetch Data & Check Persistence
    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }
            try {
                // A. Get User
                const userRes = await axios.get(`${API_URL}/api/auth/getuser`, { headers: { "auth-token": token } });
                setCurrentUser(userRes.data);

                // B. Fetch All Users to find Connections (for Invite System)
                // In a real app, use a dedicated /connections endpoint. 
                // Here we reuse the logic from Messages.jsx
                const allUsersRes = await axios.get(`${API_URL}/api/users/fetchall`, { headers: { "auth-token": token } });
                const myConnIds = userRes.data.connections || [];
                const myConns = allUsersRes.data.filter(u => myConnIds.includes(u._id));
                setConnections(myConns);

                // C. Fetch Rooms
                const roomRes = await axios.get(`${API_URL}/api/studyrooms/fetchall`, { headers: { "auth-token": token } });
                const fetchedRooms = roomRes.data;
                setRooms(fetchedRooms);

                // 🟢 D. PERSISTENCE CHECK: Am I already in a pod?
                const savedPodId = localStorage.getItem('activePodId');
                if (savedPodId) {
                    const foundPod = fetchedRooms.find(r => r._id === savedPodId);
                    if (foundPod && foundPod.status !== 'completed') {
                        // Restore Session
                        setActivePod(foundPod);
                        setEditLimit(foundPod.maxParticipants);
                        setSessionGoal(localStorage.getItem('activePodGoal') || "Focusing...");
                        setIsTimerRunning(true);
                        setMeetingLoaded(false); // Let Jitsi reload
                    } else {
                        // Cleanup if invalid/ended
                        localStorage.removeItem('activePodId');
                        localStorage.removeItem('activePodGoal');
                    }
                }

                setLoading(false);
            } catch (err) { console.error(err); }
        };
        init();
    }, [navigate]);

    // 2. Timer Logic
    useEffect(() => {
        let interval = null;
        if (isTimerRunning && timer > 0) {
            interval = setInterval(() => setTimer(t => t - 1), 1000);
        } else if (timer === 0) {
            setIsTimerRunning(false);
            alert("⏰ Focus Session Complete! Take a break.");
        }
        return () => clearInterval(interval);
    }, [isTimerRunning, timer]);

    const toggleRadio = () => {
        if (isRadioPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(e => console.log("Audio play failed", e));
        }
        setIsRadioPlaying(!isRadioPlaying);
    };

    // 3. Room Actions
    const handleCreateRoom = async () => {
        if (!newRoom.name || !newRoom.subject) return alert("Fill all fields");
        if (newRoom.isPrivate && newRoom.passcode.length < 4) return alert("Passcode must be 4 digits");
        if (newRoom.maxParticipants < 2) return alert("Minimum 2 participants required");

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/studyrooms/create`, newRoom, { headers: { "auth-token": token } });
            setShowCreateModal(false);
            setNewRoom({ name: '', subject: '', maxParticipants: 5, duration: '1 hour', isPrivate: false, passcode: '' });
            
            // Refresh list
            const roomRes = await axios.get(`${API_URL}/api/studyrooms/fetchall`, { headers: { "auth-token": token } });
            setRooms(roomRes.data);
        } catch (err) { alert("Failed to create pod"); }
    };

    // 🟢 HOST: UPDATE LIMIT
    const handleUpdateLimit = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/studyrooms/update/${activePod._id}`, 
                { maxParticipants: editLimit }, 
                { headers: { "auth-token": token } }
            );
            alert("✅ Participant limit updated!");
            setActivePod(prev => ({...prev, maxParticipants: editLimit})); 
        } catch (err) { alert("Update failed"); }
    };

    // 🟢 HOST: EXTEND TIME (DB + Local)
    const handleExtendTime = async (minutes) => {
        try {
            const token = localStorage.getItem('token');
            // We just update the text in DB for display purposes
            // In a real strict system, you'd calculate end time.
            // Here we just append text to duration string or leave it, 
            // but updating the local timer is the critical UX part.
            
            setTimer(prev => prev + (minutes * 60)); // Extend Local Timer
            alert(`✅ Session extended by ${minutes} minutes.`);
            
            // Optional: You could send this to DB if you want to update the 'duration' label
            // await axios.put(...) 
        } catch (err) { alert("Extension failed"); }
    };

    // 🟢 HOST: SOFT END POD
    const handleEndPod = async (roomId) => {
        if (!window.confirm("End this session? (It will be marked as Completed)")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/studyrooms/end/${roomId}`, {}, { headers: { "auth-token": token } });
            
            if (activePod?._id === roomId) {
                // Clear Persistence
                localStorage.removeItem('activePodId');
                localStorage.removeItem('activePodGoal');
                setActivePod(null);
                setMeetingLoaded(false);
            }
            // Refresh list
            const roomRes = await axios.get(`${API_URL}/api/studyrooms/fetchall`, { headers: { "auth-token": token } });
            setRooms(roomRes.data);
        } catch (err) { alert("Failed to end session"); }
    };

    // 🟢 INVITE FRIEND
    const handleInvite = async (userId) => {
        // In a real app, call: axios.post(`/api/notifications/send`, { target: userId, type: 'pod_invite', podId: activePod._id })
        // For now, we simulate success
        alert("✅ Invitation sent!");
        setShowInviteModal(false);
    };

    // 4. Join Logic
    const attemptJoin = (room) => {
        if (room.status === 'completed') return; 
        setSelectedRoom(room);
        if (room.isPrivate) {
            setPasscodeInput("");
            setShowPasscodeModal(true);
        } else {
            setShowGoalModal(true);
        }
    };

    const verifyPasscode = () => {
        if (passcodeInput === selectedRoom.passcode) {
            setShowPasscodeModal(false);
            setShowGoalModal(true);
        } else {
            alert("❌ Access Denied: Invalid Passcode");
        }
    };

    const enterPod = async () => {
        if (!sessionGoal.trim()) return alert("Please set a goal for this session!");

        const token = localStorage.getItem('token');
        try {
            await axios.put(`${API_URL}/api/studyrooms/join/${selectedRoom._id}`, {}, { headers: { "auth-token": token } });

            setShowGoalModal(false);
            setActivePod(selectedRoom);
            setEditLimit(selectedRoom.maxParticipants); 
            setIsTimerRunning(true);
            setMeetingLoaded(false);

            // 🟢 SAVE SESSION TO STORAGE
            localStorage.setItem('activePodId', selectedRoom._id);
            localStorage.setItem('activePodGoal', sessionGoal);

        } catch (err) { alert("Connection Failed"); }
    };

    const leavePod = async () => {
        if (!window.confirm("Leaving already?")) return;

        const token = localStorage.getItem('token');
        try {
            await axios.put(`${API_URL}/api/studyrooms/leave/${activePod._id}`, {}, { headers: { "auth-token": token } });
        } catch (err) { console.error("Leave error", err); }

        // 🟢 CLEAR STORAGE
        localStorage.removeItem('activePodId');
        localStorage.removeItem('activePodGoal');

        setActivePod(null);
        setSessionGoal("");
        setTimer(25 * 60);
        setIsTimerRunning(false);
        setIsRadioPlaying(false);
        audioRef.current.pause();
        setMeetingLoaded(false);
        
        // Refresh list
        const roomRes = await axios.get(`${API_URL}/api/studyrooms/fetchall`, { headers: { "auth-token": token } });
        setRooms(roomRes.data);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (loading) return <div className="p-8 text-gray-500 bg-[#050505] min-h-screen">Loading Focus Hub...</div>;

    // --- VIEW: ACTIVE FOCUS POD ---
    if (activePod) {
        const isHost = currentUser._id === activePod.creatorId;

        return (
            <div className="h-screen w-full bg-black flex overflow-hidden relative font-sans text-white">
                
                {/* LEFT: VIDEO */}
                <div className={`flex-1 relative flex flex-col p-2 md:p-4 bg-[#09090b] transition-all duration-300`}>
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/10 rounded-lg animate-pulse">
                                <Wifi size={18} className="text-green-500" />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg leading-none">{activePod.name}</h2>
                                <p className="text-[10px] text-gray-500 font-mono tracking-wider">ENCRYPTED SIGNAL</p>
                            </div>
                        </div>
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all">
                            {isSidebarOpen ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                        </button>
                    </div>

                    <div className="flex-1 relative rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(124,58,237,0.05)] bg-black group">
                        {!meetingLoaded && <NeuralLoader />}
                        <JitsiMeeting
                            domain="meet.jit.si"
                            roomName={activePod.roomId}
                            configOverwrite={{
                                startWithAudioMuted: true, startWithVideoMuted: true,
                                disableDeepLinking: true, disableThirdPartyRequests: true,
                                prejoinPageEnabled: false, theme: { default: 'dark', background: '#000000' },
                                toolbarButtons: ['microphone', 'camera', 'desktop', 'fullscreen', 'chat', 'raisehand', 'tileview']
                            }}
                            userInfo={{ displayName: `${currentUser.fullName}` }}
                            onApiReady={(externalApi) => {
                                externalApi.addEventListener('videoConferenceJoined', () => setMeetingLoaded(true));
                                setTimeout(() => setMeetingLoaded(true), 5000);
                            }}
                            getIFrameRef={(iframeRef) => { iframeRef.style.height = '100%'; iframeRef.style.background = '#000000'; }}
                        />
                    </div>
                </div>

                {/* RIGHT: HUD */}
                <div className={`${isSidebarOpen ? 'w-80 p-6' : 'w-0 p-0'} bg-[#121214] border-l border-white/10 flex flex-col gap-6 shadow-2xl transition-all duration-300 overflow-hidden relative`}>
                    
                    {isSidebarOpen && (
                        <>
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Zap className="text-yellow-400" size={20} /> Focus HUD
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">Goal: <span className="text-white italic">"{sessionGoal}"</span></p>
                            </div>

                            {/* TIMER */}
                            <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/20 p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-white/10">
                                    <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${(timer / 1500) * 100}%` }}></div>
                                </div>
                                <span className="text-5xl font-mono font-bold text-white mb-2">{formatTime(timer)}</span>
                                <div className="flex gap-3">
                                    <button onClick={() => setIsTimerRunning(!isTimerRunning)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all">
                                        {isTimerRunning ? <Pause size={20} /> : <Play size={20} />}
                                    </button>
                                    <button onClick={() => setTimer(25 * 60)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"><Timer size={20} /></button>
                                </div>
                            </div>

                            {/* 🟢 ACTION: INVITE */}
                            <button onClick={() => setShowInviteModal(true)} className="w-full py-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                                <UserPlus size={18} /> Invite Peers
                            </button>

                            {/* HOST ADMIN PANEL */}
                            {isHost && (
                                <div className="bg-[#18181b] border border-white/5 p-4 rounded-xl space-y-3">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2"><Settings size={12} /> Admin Controls</h3>
                                    
                                    {/* Edit Limit */}
                                    <div className="flex items-center gap-2">
                                        <input type="number" min="2" value={editLimit} onChange={e => setEditLimit(e.target.value)} className="bg-black/40 border border-white/10 rounded px-2 py-1 w-16 text-sm text-white outline-none" />
                                        <button onClick={handleUpdateLimit} className="flex-1 bg-white/10 hover:bg-white/20 text-xs font-bold py-1.5 rounded flex items-center justify-center gap-1"><Save size={12} /> Save Limit</button>
                                    </div>

                                    {/* 🟢 Edit Duration */}
                                    <div className="flex gap-2">
                                        <button onClick={() => handleExtendTime(15)} className="flex-1 bg-white/10 hover:bg-white/20 text-xs font-bold py-1.5 rounded text-white">+15m</button>
                                        <button onClick={() => handleExtendTime(30)} className="flex-1 bg-white/10 hover:bg-white/20 text-xs font-bold py-1.5 rounded text-white">+30m</button>
                                    </div>
                                </div>
                            )}

                            {/* RADIO */}
                            <div className="bg-[#18181b] border border-white/5 p-4 rounded-xl flex items-center justify-between group hover:border-pink-500/30 transition-all mt-auto">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-full ${isRadioPlaying ? 'bg-pink-500 text-white animate-pulse' : 'bg-white/5 text-gray-400'}`}>
                                        <Headphones size={20} />
                                    </div>
                                    <div><p className="text-sm font-bold text-white">Lo-Fi Radio</p><p className="text-xs text-gray-500">Beats to study to</p></div>
                                </div>
                                <button onClick={toggleRadio} className="p-2 hover:bg-white/10 rounded-full transition-all text-gray-300 hover:text-white">
                                    {isRadioPlaying ? <Volume2 size={20} /> : <Play size={20} />}
                                </button>
                            </div>

                            {/* LEAVE/END */}
                            <div>
                                {isHost ? (
                                    <button onClick={() => handleEndPod(activePod._id)} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-900/20">
                                        <Trash2 size={18} /> End Session
                                    </button>
                                ) : (
                                    <button onClick={leavePod} className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 rounded-xl font-bold flex items-center justify-center gap-2 transition-all">
                                        <LogOut size={18} /> Leave Pod
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* MODAL: INVITE FRIENDS */}
                {showInviteModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-[#18181b] border border-white/10 p-6 rounded-3xl w-full max-w-sm relative shadow-2xl">
                            <button onClick={() => setShowInviteModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={20} /></button>
                            <h2 className="text-xl font-bold mb-4 text-white">Invite Connections</h2>
                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                {connections.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-4">No connections found.</p>
                                ) : (
                                    connections.map(user => (
                                        <div key={user._id} className="flex items-center justify-between p-3 bg-black/40 rounded-xl border border-white/5">
                                            <span className="text-sm font-bold text-gray-200">{user.fullName}</span>
                                            <button onClick={() => handleInvite(user._id)} className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all">
                                                <Send size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        );
    }

    // --- LOBBY VIEW ---
    return (
        <div className="min-h-screen bg-[#050505] text-white p-6 md:p-8 relative">
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        <Monitor className="text-purple-500" size={32} /> Focus Hub
                    </h1>
                    <p className="text-gray-400 mt-2 font-medium">Join a virtual pod, lock in your goals, and study with peers.</p>
                </div>
                <button onClick={() => setShowCreateModal(true)} className="bg-white text-black hover:bg-gray-200 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-white/5">
                    <Plus size={20} /> Launch Pod
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                {rooms.length === 0 ? (
                    <div className="col-span-full text-center py-24 bg-[#121214] border border-dashed border-white/10 rounded-3xl">
                        <Monitor size={48} className="mx-auto text-gray-700 mb-4" />
                        <p className="text-gray-500">No active pods. Be the first to start one!</p>
                    </div>
                ) : (
                    rooms.map((room) => {
                        const isMyRoom = currentUser && room.creatorId === currentUser._id;
                        const isCompleted = room.status === 'completed';

                        return (
                            <div key={room._id} className={`bg-[#121214] border border-white/5 p-6 rounded-3xl transition-all group relative overflow-hidden ${isCompleted ? 'opacity-70 grayscale' : 'hover:border-purple-500/30'}`}>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            {room.isPrivate && <Lock size={12} className="text-yellow-500" />}
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${room.isPrivate ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' : 'text-purple-400 bg-purple-500/10 border-purple-500/20'}`}>
                                                {room.subject}
                                            </span>
                                        </div>
                                        <h3 className="text-xl font-bold text-white truncate w-48">{room.name}</h3>
                                        <p className="text-xs text-gray-500 mt-1">Host: {room.creator}</p>
                                    </div>
                                    
                                    {isCompleted ? (
                                        <div className="flex items-center gap-1.5 bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20">
                                            <CheckCircle size={12} className="text-green-500" />
                                            <span className="text-xs font-bold text-green-500">Completed</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                            <span className="text-xs font-bold text-gray-300">Live</span>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3 mb-8">
                                    <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <Users size={16} className="text-gray-500" />
                                        <span>{room.activeUsers?.length || 0} / {room.maxParticipants} peers</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-gray-400">
                                        <Clock size={16} className="text-gray-500" />
                                        <span>{room.duration} session</span>
                                    </div>
                                </div>
                                
                                {!isCompleted && (
                                    <div className="flex gap-3">
                                        <button onClick={() => attemptJoin(room)} className="flex-1 py-3 bg-white/5 hover:bg-purple-600 hover:text-white text-gray-300 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 border border-white/5">
                                            {room.isPrivate ? <><Lock size={14} /> Unlock Pod</> : "Enter Pod"}
                                        </button>
                                        {isMyRoom && (
                                            <button onClick={() => handleEndPod(room._id)} className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl border border-red-500/10 transition-all" title="End Session">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#18181b] border border-white/10 p-8 rounded-3xl w-full max-w-md relative shadow-2xl">
                        <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white"><X /></button>
                        <h2 className="text-2xl font-bold mb-6 text-white">Create Focus Pod</h2>
                        <div className="space-y-4">
                            <input className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-purple-500 outline-none" placeholder="Pod Name" onChange={e => setNewRoom({ ...newRoom, name: e.target.value })} />
                            <input className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white focus:border-purple-500 outline-none" placeholder="Subject" onChange={e => setNewRoom({ ...newRoom, subject: e.target.value })} />

                            <div className="flex items-center gap-4 bg-black/20 p-3 rounded-xl border border-white/5">
                                <button onClick={() => setNewRoom({ ...newRoom, isPrivate: !newRoom.isPrivate })} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${!newRoom.isPrivate ? 'bg-white text-black' : 'text-gray-500'}`}>Public</button>
                                <button onClick={() => setNewRoom({ ...newRoom, isPrivate: !newRoom.isPrivate })} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${newRoom.isPrivate ? 'bg-yellow-500 text-black' : 'text-gray-500'}`}><Lock size={12} /> Private</button>
                            </div>

                            {newRoom.isPrivate && (
                                <input type="number" className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-500 placeholder:text-yellow-500/50 outline-none" placeholder="Set 4-Digit Passcode" onChange={e => setNewRoom({ ...newRoom, passcode: e.target.value })} />
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" min="2" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none" value={newRoom.maxParticipants} onChange={e => setNewRoom({ ...newRoom, maxParticipants: e.target.value })} />
                                <select className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white outline-none" onChange={e => setNewRoom({ ...newRoom, duration: e.target.value })}>
                                    <option value="1 hour">1 hour</option>
                                    <option value="2 hours">2 hours</option>
                                </select>
                            </div>
                            <button onClick={handleCreateRoom} className="w-full bg-purple-600 hover:bg-purple-500 py-4 rounded-xl font-bold text-white mt-2 shadow-lg">Launch Pod</button>
                        </div>
                    </div>
                </div>
            )}

            {showPasscodeModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-[#121214] border border-yellow-500/20 p-8 rounded-3xl w-full max-w-sm relative text-center">
                        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow-500"><Key size={32} /></div>
                        <h2 className="text-xl font-bold mb-2 text-white">Secure Access</h2>
                        <input autoFocus type="password" className="w-full bg-black/40 border border-yellow-500/30 rounded-xl p-4 text-white text-center outline-none focus:border-yellow-500 transition-colors mb-4 tracking-widest text-lg" placeholder="Enter Passcode" value={passcodeInput} onChange={e => setPasscodeInput(e.target.value)} />
                        <button onClick={verifyPasscode} className="w-full bg-yellow-600 hover:bg-yellow-500 text-black py-4 rounded-xl font-bold transition-all">Unlock Pod</button>
                    </div>
                </div>
            )}

            {showGoalModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-[#121214] border border-white/10 p-8 rounded-3xl w-full max-w-md relative text-center">
                        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-purple-400"><Target size={32} /></div>
                        <h2 className="text-2xl font-bold mb-2 text-white">Set Your Objective</h2>
                        <input autoFocus className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-center outline-none focus:border-purple-500 transition-colors mb-4 placeholder:text-gray-600" placeholder="I will finish..." value={sessionGoal} onChange={e => setSessionGoal(e.target.value)} onKeyDown={e => e.key === 'Enter' && enterPod()} />
                        <button onClick={enterPod} className="w-full bg-white text-black hover:bg-gray-200 py-4 rounded-xl font-bold transition-all">Enter Focus Mode</button>
                    </div>
                </div>
            )}
        </div>
    );
}