import React, { useState, useEffect, useRef } from 'react';
import { API_URL } from '../config';
import axios from 'axios';
import { MessageSquare, Send, Search, Video, MoreHorizontal, ArrowLeft, User } from 'lucide-react'; // Removed Phone import
import { useNavigate, useLocation } from 'react-router-dom';

export default function Messages() {
    const navigate = useNavigate();
    const location = useLocation();
    const [contacts, setContacts] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [currentUser, setCurrentUser] = useState(null);
    const scrollRef = useRef();

    // 1. Init: Fetch User, Contacts & Handle New Chat
    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('token');
            if (!token) { navigate('/login'); return; }

            try {
                const userRes = await axios.get(`${API_URL}/api/auth/getuser`, { headers: { "auth-token": token } });
                const myUser = userRes.data;
                setCurrentUser(myUser);

                const contactsRes = await axios.get(`${API_URL}/api/messages/conversations`, { headers: { "auth-token": token } });

                // 🛡️ FRONTEND SAFETY: Filter out myself from the list
                let currentContacts = contactsRes.data.filter(c => c._id !== myUser._id);

                if (location.state?.startChat) {
                    const newPeer = location.state.startChat;

                    // Check if this peer is already in my list
                    const exists = currentContacts.find(c => c._id === newPeer._id);

                    if (!exists) {
                        currentContacts = [newPeer, ...currentContacts];
                    }

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
    // 2. Fetch Messages when Contact Selected
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
                timestamp: new Date()
            };
            setMessages([...messages, tempMsg]);
            setNewMessage("");

            await axios.post(`${API_URL}/api/messages/send/${selectedContact._id}`, payload, {
                headers: { "auth-token": token }
            });
        } catch (err) { console.error("Send failed", err); }
    };

    return (
        // Uses h-full to fit perfectly in Layout
        <div className="flex h-full bg-[#050505] text-white overflow-hidden">

            {/* 1. CONTACTS SIDEBAR */}
            <div className={`w-full md:w-96 bg-[#09090b] border-r border-white/5 flex flex-col ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-4 border-b border-white/5 bg-[#09090b]">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <MessageSquare className="text-purple-500" /> Messages
                        </h2>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            type="text" placeholder="Search peers..."
                            className="w-full bg-[#18181b] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-purple-500 outline-none text-white"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {contacts.map(contact => (
                        <div
                            key={contact._id}
                            onClick={() => setSelectedContact(contact)}
                            className={`flex items-center gap-3 p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${selectedContact?._id === contact._id ? 'bg-white/5' : ''}`}
                        >
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-[2px]">
                                <div className="w-full h-full rounded-full bg-[#09090b] flex items-center justify-center">
                                    <span className="font-bold text-lg">{contact.fullName.charAt(0)}</span>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-200">{contact.fullName}</h3>
                                <p className="text-xs text-gray-500">{contact.role}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. CHAT AREA */}
            {selectedContact ? (
                <div className="flex-1 flex flex-col relative">

                    {/* Chat Header */}
                    <div className="h-16 px-6 border-b border-white/5 bg-[#09090b]/90 backdrop-blur-md flex items-center justify-between z-20">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSelectedContact(null)} className="md:hidden text-gray-400 hover:text-white"><ArrowLeft /></button>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-400 to-blue-500 flex items-center justify-center font-bold text-black">
                                {selectedContact.fullName.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold">{selectedContact.fullName}</h3>
                                <p className="text-xs text-green-400">Online</p>
                            </div>
                        </div>
                        <div className="flex gap-4 text-gray-400">
                            {/* Phone Icon Removed Here */}
                            <Video className="hover:text-white cursor-pointer" size={20} />
                            <MoreHorizontal className="hover:text-white cursor-pointer" size={20} />
                        </div>
                    </div>

                    {/* CHAT BODY */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-3 relative">
                        <div
                            className="absolute inset-0 z-0 opacity-40 pointer-events-none"
                            style={{
                                backgroundImage: `url('https://i.pinimg.com/originals/b0/e0/00/b0e000506fae6320af46056c41ffa6ae.jpg')`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                        ></div>

                        {messages.length === 0 && (
                            <div className="text-center mt-20 z-10 opacity-70">
                                <p className="bg-black/40 inline-block px-4 py-2 rounded-full backdrop-blur-sm text-sm">
                                    Say hello to {selectedContact.fullName}! 👋
                                </p>
                            </div>
                        )}

                        {messages.map((msg, idx) => {
                            const isMe = msg.sender === currentUser._id;
                            return (
                                <div key={idx} className={`z-10 flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div
                                        className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-md text-sm leading-relaxed relative ${isMe ? 'bg-[#005c4b] text-white rounded-tr-none' : 'bg-[#202c33] text-gray-200 rounded-tl-none'
                                            }`}
                                    >
                                        {msg.text}
                                        <p className="text-[10px] text-right opacity-60 mt-1">
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={scrollRef}></div>
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-[#09090b] border-t border-white/5 z-20">
                        <form onSubmit={handleSend} className="flex gap-2">
                            <input
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 bg-[#18181b] border border-white/10 rounded-full px-5 py-3 text-white focus:outline-none focus:border-purple-500 transition-all"
                            />
                            <button className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-full transition-transform hover:scale-105 shadow-lg shadow-purple-500/20">
                                <Send size={20} />
                            </button>
                        </form>
                    </div>

                </div>
            ) : (
                <div className="hidden md:flex flex-1 items-center justify-center flex-col text-gray-500 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-transparent pointer-events-none"></div>
                    <MessageSquare size={64} className="mb-4 opacity-20" />
                    <h2 className="text-xl font-bold text-gray-300">NxtVerse Web Chat</h2>
                    <p className="mt-2 text-sm">Send and receive messages without keeping your phone online.</p>
                </div>
            )}
        </div>
    );
}