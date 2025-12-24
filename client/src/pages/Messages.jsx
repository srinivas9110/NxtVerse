import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import { 
    MessageSquare, Send, Search, Video, MoreHorizontal, 
    ArrowLeft, Users, Lock, Megaphone, Smile 
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Messages() {
    const navigate = useNavigate();
    const location = useLocation();
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [currentUser, setCurrentUser] = useState(null);
    
    // State for the "Reaction Picker" popup
    const [showReactionPicker, setShowReactionPicker] = useState(null); // Stores messageId
    
    const scrollRef = useRef();

    // 1. Init
    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }

            try {
                const userRes = await axios.get(`${API_URL}/api/auth/getuser`, { headers: { "auth-token": token } });
                setCurrentUser(userRes.data);

                const contactsRes = await axios.get(`${API_URL}/api/messages/conversations`, { headers: { "auth-token": token } });
                let currentContacts = contactsRes.data.filter(c => c._id !== userRes.data._id || c.isGroup);

                if (location.state?.startChat) {
                    const newPeer = location.state.startChat;
                    const exists = currentContacts.find(c => c._id === newPeer._id);
                    if (!exists) currentContacts = [newPeer, ...currentContacts];
                    setContacts(currentContacts);
                    setSelectedContact(newPeer);
                    window.history.replaceState({}, document.title);
                } else {
                    setContacts(currentContacts);
                }
            } catch (err) { console.error(err); }
        };
        init();
    }, [navigate, location.state]);

    // 2. Fetch Messages
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

    // 3. Auto Scroll
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // 4. Send Message
    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const payload = { text: newMessage };

            const tempMsg = {
                _id: Date.now(),
                sender: currentUser._id,
                text: newMessage,
                timestamp: new Date(),
                reactions: [] // Init empty reactions
            };
            
            setMessages([...messages, tempMsg]);
            setNewMessage("");

            await axios.post(`${API_URL}/api/messages/send/${selectedContact._id}`, payload, {
                headers: { "auth-token": token }
            });
        } catch (err) { 
            console.error("Send failed", err); 
            alert(err.response?.data?.error || "Failed to send");
        }
    };

    // 5. Handle Reaction Toggle
    const handleReaction = async (msgId, emoji) => {
        // Optimistic UI Update
        const updatedMessages = messages.map(msg => {
            if (msg._id === msgId) {
                const existingIdx = msg.reactions?.findIndex(r => r.user === currentUser._id && r.emoji === emoji);
                let newReactions = msg.reactions ? [...msg.reactions] : [];
                
                if (existingIdx > -1) {
                    newReactions.splice(existingIdx, 1); // Remove
                } else {
                    newReactions.push({ user: currentUser._id, emoji }); // Add
                }
                return { ...msg, reactions: newReactions };
            }
            return msg;
        });
        setMessages(updatedMessages);
        setShowReactionPicker(null); // Close picker

        // API Call
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_URL}/api/messages/react/${msgId}`, { emoji }, {
                headers: { "auth-token": token }
            });
        } catch (err) { console.error("Reaction failed"); }
    };

    const isAdmin = selectedContact?.isGroup 
        ? selectedContact.groupAdmins?.includes(currentUser?._id)
        : true; 

    const canChat = !selectedContact?.isAnnouncement || isAdmin;

    // Helper: Group reactions for display (e.g., { '👍': 5, '🔥': 2 })
    const getGroupedReactions = (reactions) => {
        if (!reactions) return {};
        return reactions.reduce((acc, r) => {
            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
            return acc;
        }, {});
    };

    return (
        <div className="flex h-full bg-[#050505] text-white overflow-hidden" onClick={() => setShowReactionPicker(null)}>
            {/* SIDEBAR */}
            <div className={`w-full md:w-96 bg-[#09090b] border-r border-white/5 flex flex-col ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-white/5 bg-[#09090b]">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-4"><MessageSquare className="text-purple-500" /> Messages</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input type="text" placeholder="Search..." className="w-full bg-[#18181b] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-purple-500 outline-none text-white" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {contacts.map(contact => (
                        <div key={contact._id} onClick={() => setSelectedContact(contact)} className={`flex items-center gap-3 p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${selectedContact?._id === contact._id ? 'bg-white/5' : ''}`}>
                            <div className={`w-12 h-12 rounded-full p-[2px] ${contact.isGroup ? 'bg-gradient-to-br from-yellow-500 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-purple-600'}`}>
                                <div className="w-full h-full rounded-full bg-[#09090b] flex items-center justify-center">
                                    {contact.isGroup ? <Users size={20} className="text-gray-300" /> : <span className="font-bold text-lg">{contact.fullName.charAt(0)}</span>}
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
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-black ${selectedContact.isGroup ? 'bg-gradient-to-tr from-yellow-400 to-orange-500' : 'bg-gradient-to-tr from-green-400 to-blue-500'}`}>
                                {selectedContact.isGroup ? <Users size={20} className="text-black" /> : selectedContact.fullName.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold">{selectedContact.fullName}</h3>
                                <p className="text-xs text-gray-400">{selectedContact.isGroup ? (selectedContact.isAnnouncement ? "Read Only Channel" : "Group Chat") : "Online"}</p>
                            </div>
                        </div>
                        <MoreHorizontal className="text-gray-400 cursor-pointer hover:text-white" />
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
                                <div key={idx} className={`z-10 flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] self-${isMe ? 'end' : 'start'} group relative mb-2`}>
                                    {!isMe && selectedContact.isGroup && (
                                        <span className="text-[10px] text-gray-400 ml-2 mb-1">{senderName}</span>
                                    )}
                                    
                                    <div className={`px-4 py-2 rounded-2xl shadow-md text-sm leading-relaxed relative ${isMe ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-[#202c33] text-gray-200 rounded-tl-none'}`}>
                                        {msg.text}
                                        
                                        {/* Reaction Picker Button (Shows on Hover) */}
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setShowReactionPicker(showReactionPicker === msg._id ? null : msg._id); }}
                                            className={`absolute -right-8 top-1 p-1.5 rounded-full bg-[#18181b] border border-white/10 text-gray-400 hover:text-yellow-400 hover:scale-110 transition-all opacity-0 group-hover:opacity-100 ${isMe ? '-left-8 right-auto' : ''}`}
                                        >
                                            <Smile size={14} />
                                        </button>

                                        {/* Reaction Picker Popover */}
                                        {showReactionPicker === msg._id && (
                                            <div className="absolute -top-10 left-0 bg-[#18181b] border border-white/10 rounded-full px-2 py-1 flex gap-1 shadow-xl z-50 animate-in zoom-in-95">
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
                                        <div className="flex gap-1 mt-1 flex-wrap">
                                            {Object.entries(reactions).map(([emoji, count]) => (
                                                <button 
                                                    key={emoji}
                                                    onClick={() => handleReaction(msg._id, emoji)}
                                                    className="text-[10px] bg-[#18181b] border border-white/5 rounded-full px-2 py-0.5 text-gray-300 flex items-center gap-1 hover:bg-white/10"
                                                >
                                                    <span>{emoji}</span>
                                                    <span className="font-bold">{count}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <p className="text-[9px] text-gray-500 mt-0.5 text-right w-full pr-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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