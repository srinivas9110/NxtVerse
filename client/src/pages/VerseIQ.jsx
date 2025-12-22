import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw, Cpu, Zap, Activity, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { API_URL } from '../config';
// --- NEW IMPORTS FOR FORMATTING ---
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';

// --- SUB-COMPONENT: The "Hyper" Input Field ---
const HyperInput = ({ value, onChange, onSubmit, loading }) => {
    return (
        <div className="relative group max-w-4xl mx-auto w-full">
            {/* 1. The Spinning Gradient Border */}
            <div className={`absolute -inset-0.5 rounded-2xl opacity-75 blur-sm transition duration-1000 group-hover:duration-200 group-hover:opacity-100
                ${loading ? 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 animate-spin-fast' :
                    'bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-tilt'}`}
            />

            {/* 2. The Input Container */}
            <div className="relative flex items-center bg-black rounded-2xl leading-none">
                <input
                    type="text"
                    value={value}
                    onChange={onChange}
                    disabled={loading}
                    placeholder={loading ? "VerseIQ is processing..." : "Ask VerseIQ anything..."}
                    className="w-full bg-[#09090b] text-white p-4 pl-6 pr-14 rounded-2xl focus:outline-none placeholder:text-gray-600 font-mono text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && onSubmit(e)}
                />
                <button
                    onClick={onSubmit}
                    disabled={loading || !value.trim()}
                    className={`absolute right-2 p-2 rounded-xl transition-all duration-300
                        ${loading ? 'bg-yellow-500/10 text-yellow-500 cursor-not-allowed' :
                            'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]'}`}
                >
                    {loading ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: Copy Button for Code Blocks ---
const CopyButton = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={handleCopy} className="absolute top-2 right-2 p-1 rounded bg-white/10 hover:bg-white/20 text-gray-300 transition-all">
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
    );
};

// --- MAIN COMPONENT ---
export default function VerseIQ() {
    const navigate = useNavigate();
    const [messages, setMessages] = useState([
        { role: 'ai', text: "System Online. I am **VerseIQ** (Llama 3.1). Accessing neural database... \n\nHow can I assist you today?" }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(scrollToBottom, [messages, loading]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            if (!token) { alert("Login required."); navigate('/login'); return; }

            const response = await fetch(`${API_URL}/api/verse-iq/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'auth-token': token },
                body: JSON.stringify({ prompt: userMessage.text })
            });

            const data = await response.json();
            if (response.ok) {
                setMessages(prev => [...prev, { role: 'ai', text: data.answer }]);
            } else {
                setMessages(prev => [...prev, { role: 'ai', text: `Error: ${data.error || "Neural Link Broken"}` }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', text: "Connection Lost. Check your internet." }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#050505] text-white relative overflow-hidden font-sans selection:bg-purple-500/30">

            {/* Background Ambience */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[150px] rounded-full animate-pulse-slow" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[150px] rounded-full animate-pulse-slow delay-1000" />
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            </div>

            {/* --- HEADS UP DISPLAY (HUD) HEADER --- */}
            <div className="bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 p-4 sticky top-0 z-20">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-[#111] border border-white/10 flex items-center justify-center">
                                <Bot size={20} className={`text-purple-400 ${loading ? 'animate-pulse' : ''}`} />
                            </div>
                            {loading && <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                            </span>}
                        </div>
                        <div>
                            <h1 className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
                                VerseIQ <span className="text-[10px] font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400">V3.1</span>
                            </h1>
                            <div className="flex gap-3 text-[10px] font-mono text-gray-500">
                                <span className="flex items-center gap-1"><Cpu size={10} /> LLAMA-3</span>
                                <span className="flex items-center gap-1 text-green-500"><Activity size={10} /> ONLINE</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- CHAT STREAM --- */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar relative z-10">
                <div className="max-w-3xl mx-auto space-y-6">
                    {messages.map((msg, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border 
                                ${msg.role === 'ai' ? 'bg-[#111] border-purple-500/30' : 'bg-[#111] border-blue-500/30'}`}>
                                {msg.role === 'ai' ? <Sparkles size={14} className="text-purple-400" /> : <User size={14} className="text-blue-400" />}
                            </div>

                            {/* Message Bubble (MARKDOWN RENDERER) */}
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm md:text-base leading-relaxed shadow-lg backdrop-blur-sm border
                                ${msg.role === 'user'
                                    ? 'bg-blue-600/10 border-blue-500/20 text-blue-100 rounded-tr-sm'
                                    : 'bg-[#111]/80 border-white/10 text-gray-300 rounded-tl-sm'
                                }`}>

                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        // 1. Code Blocks
                                        code({ node, inline, className, children, ...props }) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            return !inline && match ? (
                                                <div className="relative group my-4 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                                                    <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-white/5">
                                                        <span className="text-xs text-gray-500 font-mono">{match[1]}</span>
                                                        <CopyButton text={String(children).replace(/\n$/, '')} />
                                                    </div>
                                                    <SyntaxHighlighter
                                                        style={dracula}
                                                        language={match[1]}
                                                        PreTag="div"
                                                        customStyle={{ margin: 0, padding: '1rem', background: '#09090b', fontSize: '0.85rem' }}
                                                        {...props}
                                                    >
                                                        {String(children).replace(/\n$/, '')}
                                                    </SyntaxHighlighter>
                                                </div>
                                            ) : (
                                                <code className="bg-purple-900/30 text-purple-200 px-1.5 py-0.5 rounded text-xs font-mono border border-purple-500/20" {...props}>
                                                    {children}
                                                </code>
                                            );
                                        },
                                        // 2. Headings
                                        h1: ({ node, ...props }) => <h1 className="text-xl font-bold text-white mt-6 mb-3 border-b border-white/10 pb-2" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-purple-300 mt-5 mb-2" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-base font-bold text-blue-300 mt-4 mb-2" {...props} />,
                                        // 3. Lists
                                        ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-1 text-gray-300" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-1 text-gray-300" {...props} />,
                                        li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                        // 4. Paragraphs & Strong
                                        p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                                        strong: ({ node, ...props }) => <strong className="text-white font-bold" {...props} />,
                                        a: ({ node, ...props }) => <a className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                    }}
                                >
                                    {msg.text}
                                </ReactMarkdown>

                            </div>
                        </motion.div>
                    ))}

                    {loading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                            <div className="w-8 h-8 rounded-lg bg-[#111] border border-purple-500/30 flex items-center justify-center">
                                <RefreshCw size={14} className="text-purple-400 animate-spin" />
                            </div>
                            <div className="flex items-center gap-1 h-8">
                                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
                                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-100" />
                                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-200" />
                            </div>
                        </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* --- HYPER INPUT AREA --- */}
            <div className="p-4 md:p-6 bg-[#050505]/80 backdrop-blur-xl border-t border-white/5 z-20">
                <HyperInput
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onSubmit={handleSend}
                    loading={loading}
                />
                <div className="max-w-4xl mx-auto mt-3 flex justify-center gap-4 text-[10px] text-gray-600 font-mono">
                    <span className="flex items-center gap-1 hover:text-purple-400 cursor-pointer transition"><Zap size={10} /> Fast Mode</span>
                    <span className="flex items-center gap-1 hover:text-blue-400 cursor-pointer transition"><Activity size={10} /> Real-time</span>
                    <span className="flex items-center gap-1 hover:text-green-400 cursor-pointer transition"><Cpu size={10} /> Groq Powered</span>
                </div>
            </div>

        </div>
    );
}