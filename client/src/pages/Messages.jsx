import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import { 
    MessageSquare, Send, Search, MoreHorizontal, 
    ArrowLeft, Users, Lock, Megaphone, Smile, Trash2
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Messages() {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Data States
    const [activeChats, setActiveChats] = useState([]); // People I've already messaged
    const [allConnections, setAllConnections] = useState([]); // All my connections (for search)
    const [messages, setMessages] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    
    // UI States
    const [selectedContact, setSelectedContact] = useState(null);
    const [newMessage, setNewMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [showReactionPicker, setShowReactionPicker] = useState(null);
    const [showMenu, setShowMenu] = useState(false); // Three-dots menu dropdown

    const scrollRef = useRef();

    // Helper: Fix Image URLs (Cloudinary vs Local)
    const getImg = (path) => {
        if (!path) return null;
        return (path.startsWith('http') || path.startsWith('blob')) ? path : `${API_URL}${path}`;
    };

    // 1. INIT: Fetch User, Active Chats, AND Connections
    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }

            try {
                // A. Get Me (to know my ID and Connections)
                const userRes = await axios.get(`${API_URL}/api/auth/getuser`, { headers: { "auth-token": token } });
                setCurrentUser(userRes.data);

                // B. Get Active Conversations (Sidebar)
                const contactsRes = await axios.get(`${API_URL}/api/messages/conversations`, { headers: { "auth-token": token } });
                const validContacts = contactsRes.data.filter(c => c._id !== userRes.data._id || c.isGroup);
                setActiveChats(validContacts);

                // C. Get All Connections (For Search)
                // We fetch all users and filter by my connection IDs.
                // Ideally, you'd have a specific /connections endpoint, but this works with your current setup.
                const allUsersRes = await axios.get(`${API_URL}/api/users/fetchall`, { headers: { "auth-token": token } });
                const myConnIds = userRes.data.connections || [];
                // Filter users who are in my connections list
                const myConns = allUsersRes.data.filter(u => myConnIds.includes(u._id));
                setAllConnections(myConns);

                // D. Handle "Start Chat" from Profile Page
                if (location.state?.startChat) {
                    const newPeer = location.state.startChat;
                    // Check if already in active chats
                    const exists = validContacts.find(c => c._id === newPeer._id);
                    if (!exists) {
                        // If not, temporarily add to active list so we can chat immediately
                        setActiveChats(prev => [newPeer, ...prev]);
                    }
                    setSelectedContact(newPeer);
                    // Clear state so refresh doesn't reset
                    window.history.replaceState({}, document.title);
                }

            } catch (err) { console.error(err); }
        };
        init();
    }, [navigate, location.state]);

    // 2. FETCH MESSAGES
    useEffect(() => {
        if (selectedContact) {
            const fetchMessages = async () => {
                const token = localStorage.getItem('token');
                try {
                    const res = await axios.get(`${API_URL}/api/messages/${selectedContact._id}`, {
                        headers: { "auth-token": token }
                    });
                    setMessages(res.data);
                } catch (err) { console.error(err); }
            };
            fetchMessages();
            const interval = setInterval(fetchMessages, 3000);
            return () => clearInterval(interval);
        }
    }, [selectedContact]);

    // 3. AUTO SCROLL
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // --- ACTIONS ---

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const payload = { text: newMessage };

            // Optimistic UI Update
            const tempMsg = {
                _id: Date.now(),
                sender: currentUser._id,
                text: newMessage,
                timestamp: new Date(),
                reactions: []
            };
            setMessages([...messages, tempMsg]);
            setNewMessage("");

            await axios.post(`${API_URL}/api/messages/send/${selectedContact._id}`, payload, {
                headers: { "auth-token": token }
            });
            
            // If this was a new chat (from search), ensure it stays in the sidebar
            if (!activeChats.find(c => c._id === selectedContact._id)) {
                setActiveChats([selectedContact, ...activeChats]);
            }

        } catch (err) { 
            console.error("Send failed", err); 
            alert(err.response?.data?.error || "Failed to send");
        }
    };

    const handleDeleteChat = async () => {
        if (!window.confirm("Are you sure you want to delete this conversation? This cannot be undone.")) return;
        
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/messages/delete/${selectedContact._id}`, {
                headers: { "auth-token": token }
            });
            
            // Remove from UI
            setActiveChats(prev => prev.filter(c => c._id !== selectedContact._id));
            setSelectedContact(null);
            setShowMenu(false);
            
        } catch (err) {
            console.error(err);
            alert("Failed to delete chat");
        }
    };

    // 5. Handle Reaction Toggle
    const handleReaction = async (msgId, emoji) => {
        const updatedMessages = messages.map(msg => {
            if (msg._id === msgId) {
                const existingIdx = msg.reactions?.findIndex(r => r.user === currentUser._id && r.emoji === emoji);
                let newReactions = msg.reactions ? [...msg.reactions] : [];
                
                if (existingIdx > -1) {
                    newReactions.splice(existingIdx, 1); 
                } else {
                    newReactions.push({ user: currentUser._id, emoji });
                }
                return { ...msg, reactions: newReactions };
            }
            return msg;
        });
        setMessages(updatedMessages);
        setShowReactionPicker(null);

        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/messages/react/${msgId}`, { emoji }, {
                headers: { "auth-token": token }
            });
        } catch (err) { console.error("Reaction failed"); }
    };

    // --- SEARCH LOGIC (WhatsApp Style) ---
    // If search term exists, show matching Active Chats AND matching Connections
    const getSidebarList = () => {
        if (!searchTerm) return activeChats;

        const lowerTerm = searchTerm.toLowerCase();
        
        // 1. Filter existing chats
        const filteredActive = activeChats.filter(c => c.fullName.toLowerCase().includes(lowerTerm));
        
        // 2. Find connections NOT in active chats matching search
        const activeIds = new Set(activeChats.map(c => c._id));
        const filteredConnections = allConnections.filter(c => 
            !activeIds.has(c._id) && 
            c.fullName.toLowerCase().includes(lowerTerm)
        );

        return [...filteredActive, ...filteredConnections];
    };

    const sidebarList = getSidebarList();

    const isAdmin = selectedContact?.isGroup 
        ? selectedContact.groupAdmins?.includes(currentUser?._id)
        : true; 
    const canChat = !selectedContact?.isAnnouncement || isAdmin;

    const getGroupedReactions = (reactions) => {
        if (!reactions) return {};
        return reactions.reduce((acc, r) => {
            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
            return acc;
        }, {});
    };

    return (
        <div className="flex h-full bg-[#050505] text-white overflow-hidden" onClick={() => { setShowReactionPicker(null); setShowMenu(false); }}>
            
            {/* SIDEBAR */}
            <div className={`w-full md:w-96 bg-[#09090b] border-r border-white/5 flex flex-col ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-white/5 bg-[#09090b]">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-4"><MessageSquare className="text-purple-500" /> Messages</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search people..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#18181b] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-purple-500 outline-none text-white transition-all" 
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {sidebarList.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-xs">No contacts found</div>
                    ) : sidebarList.map(contact => (
                        <div key={contact._id} onClick={() => { setSelectedContact(contact); setSearchTerm(""); }} className={`flex items-center gap-3 p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${selectedContact?._id === contact._id ? 'bg-white/5' : ''}`}>
                            <div className={`w-12 h-12 rounded-full p-[2px] ${contact.isGroup ? 'bg-gradient-to-br from-yellow-500 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
                                <div className="w-full h-full rounded-full bg-[#09090b] flex items-center justify-center overflow-hidden">
                                    {contact.isGroup ? (
                                        <Users size={20} className="text-gray-300" />
                                    ) : contact.profilePic ? (
                                        <img src={getImg(contact.profilePic)} alt="dp" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="font-bold text-lg">{contact.fullName.charAt(0)}</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center">
                                    <h3 className="font-bold text-gray-200 truncate">{contact.fullName}</h3>
                                    {contact.isAnnouncement && <Megaphone size={12} className="text-yellow-500 ml-2" />}
                                </div>
                                <p className="text-xs text-gray-500 truncate">{contact.isGroup ? (contact.isAnnouncement ? "📢 Announcement Channel" : "👥 Workshop Group") : contact.role}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CHAT AREA */}
            {selectedContact ? (
                <div className="flex-1 flex flex-col relative">
                    {/* Header */}
                    <div className="h-16 px-6 border-b border-white/5 bg-[#09090b]/90 backdrop-blur-md flex items-center justify-between z-20">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSelectedContact(null)} className="md:hidden text-gray-400 hover:text-white"><ArrowLeft /></button>
                            
                            {/* Header Avatar */}
                            <div className={`w-10 h-10 rounded-full p-[2px] ${selectedContact.isGroup ? 'bg-gradient-to-tr from-yellow-400 to-orange-500' : 'bg-gradient-to-tr from-green-400 to-blue-500'}`}>
                                <div className="w-full h-full rounded-full bg-[#09090b] flex items-center justify-center overflow-hidden">
                                    {selectedContact.isGroup ? (
                                        <Users size={20} className="text-white" />
                                    ) : selectedContact.profilePic ? (
                                        <img src={getImg(selectedContact.profilePic)} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="font-bold text-white">{selectedContact.fullName.charAt(0)}</span>
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="font-bold">{selectedContact.fullName}</h3>
                                <p className="text-xs text-gray-400">{selectedContact.isGroup ? (selectedContact.isAnnouncement ? "Read Only Channel" : "Group Chat") : "Online"}</p>
                            </div>
                        </div>

                        {/* THREE DOTS MENU */}
                        <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                                <MoreHorizontal />
                            </button>
                            
                            {showMenu && (
                                <div className="absolute right-0 top-10 w-48 bg-[#18181b] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                                    <button onClick={handleDeleteChat} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition-colors">
                                        <Trash2 size={16} /> Delete Chat
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chat Body */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-3 relative custom-scrollbar">
                        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[url('https://i.pinimg.com/originals/b0/e0/00/b0e000506fae6320af46056c41ffa6ae.jpg')] bg-cover bg-center"></div>

                        {messages.map((msg, idx) => {
                            const senderId = msg.sender._id || msg.sender;
                            const isMe = senderId === currentUser._id;
                            const senderName = msg.sender.fullName || "User";
                            const reactions = getGroupedReactions(msg.reactions);

                            return (
                                <div key={idx} className={`z-10 flex ${isMe ? 'justify-end' : 'justify-start'} group mb-4`}>
                                    <div className="flex flex-col max-w-[75%] relative">
                                        {!isMe && selectedContact.isGroup && (
                                            <span className="text-[10px] text-gray-400 ml-2 mb-1">{senderName}</span>
                                        )}
                                        
                                        <div className={`px-4 py-2 rounded-2xl shadow-md text-sm leading-relaxed relative ${isMe ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-[#202c33] text-gray-200 rounded-tl-none'}`}>
                                            {msg.text}
                                            <p className="text-[9px] text-right opacity-60 mt-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>

                                            {/* Reaction Picker Button */}
                                            {!isMe && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setShowReactionPicker(showReactionPicker === msg._id ? null : msg._id); }}
                                                    className="absolute -top-3 -right-3 p-1 rounded-full bg-[#18181b] border border-white/10 text-gray-400 hover:text-yellow-400 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                                                >
                                                    <Smile size={14} />
                                                </button>
                                            )}

                                            {/* Reaction Picker Popover */}
                                            {showReactionPicker === msg._id && !isMe && (
                                                <div className="absolute -top-12 left-0 bg-[#18181b] border border-white/10 rounded-full px-2 py-1 flex gap-1 shadow-xl z-50 animate-in zoom-in-95">
                                                    {['👍', '❤️', '🔥', '😂', '😮'].map(emoji => (
                                                        <button 
                                                            key={emoji} 
                                                            onClick={() => handleReaction(msg._id, emoji)}
                                                            className="hover:scale-125 transition-transform p-1 text-lg"
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Display Reactions */}
                                        {Object.keys(reactions).length > 0 && (
                                            <div className={`flex gap-1 mt-1 flex-wrap ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                {Object.entries(reactions).map(([emoji, count]) => (
                                                    <button 
                                                        key={emoji}
                                                        onClick={() => handleReaction(msg._id, emoji)}
                                                        className="text-[10px] bg-[#18181b] border border-white/5 rounded-full px-2 py-0.5 text-gray-300 flex items-center gap-1 hover:bg-white/10 shadow-sm"
                                                    >
                                                        <span>{emoji}</span>
                                                        <span className="font-bold">{count}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={scrollRef}></div>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-[#09090b] border-t border-white/5 z-20">
                        {canChat ? (
                            <form onSubmit={handleSend} className="flex gap-2">
                                <input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-[#18181b] border border-white/10 rounded-full px-5 py-3 text-white focus:outline-none focus:border-purple-500 transition-all" />
                                <button className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-full shadow-lg shadow-purple-500/20"><Send size={20} /></button>
                            </form>
                        ) : (
                            <div className="flex items-center justify-center gap-2 text-gray-500 py-2 bg-[#18181b] rounded-full border border-white/5 opacity-70 cursor-not-allowed">
                                <Lock size={16} /> <span className="text-sm font-medium">Only Admins can send messages</span>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="hidden md:flex flex-1 items-center justify-center flex-col text-gray-500 relative">
                    <MessageSquare size={64} className="mb-4 opacity-20" />
                    <h2 className="text-xl font-bold text-gray-300">NxtVerse Web Chat</h2>
                </div>
            )}
        </div>
    );
}