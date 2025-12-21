import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; // <--- CORRECT IMPORT
import {
    Upload, FileSpreadsheet, CheckCircle2,
    AlertTriangle, Save, Database, Lock,
    Terminal, ShieldAlert
} from 'lucide-react';

const AdminPage = () => {
    const navigate = useNavigate(); // <--- This function redirects users
    const [dragActive, setDragActive] = useState(false);
    const [parsedQuestions, setParsedQuestions] = useState([]);
    const [gateName, setGateName] = useState("");
    const [gateRank, setGateRank] = useState("E-Rank");
    const [status, setStatus] = useState("idle");

    // --- SECURITY CHECK (Redirects Students) ---
    useEffect(() => {
        // Check the 'arise_user' we saved in the Student Page
        const currentUser = JSON.parse(localStorage.getItem('arise_user') || '{"role":"student"}');

        // If not faculty, kick them out
        if (currentUser.role !== 'faculty') {
            alert("SYSTEM ALERT: ACCESS DENIED.\nOnly Architects can view this area.");
            navigate('/arise'); // Redirects back to Arise page
        }
    }, [navigate]);

    // --- CSV PARSER LOGIC ---
    const parseCSV = (text) => {
        try {
            const lines = text.split('\n');
            const questions = [];

            for (let i = 1; i < lines.length; i++) {
                const row = lines[i].split(',');
                if (row.length < 6) continue;

                const clean = (str) => str?.replace(/^"|"$/g, '').trim();

                questions.push({
                    id: i,
                    q: clean(row[0]),
                    options: [clean(row[1]), clean(row[2]), clean(row[3]), clean(row[4])],
                    correct: parseInt(clean(row[5])) - 1
                });
            }
            return questions;
        } catch (err) {
            console.error(err);
            return null;
        }
    };

    const handleFile = (file) => {
        setStatus("parsing");
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const data = parseCSV(text);
            if (data && data.length > 0) {
                setParsedQuestions(data);
                setStatus("success");
            } else {
                setStatus("error");
            }
        };
        reader.readAsText(file);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
        else if (e.type === "dragleave") setDragActive(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleDeploy = () => {
        if (!gateName || parsedQuestions.length === 0) {
            alert("System Error: Gate Name or Data missing.");
            return;
        }

        const newDungeon = {
            id: `g-${Date.now()}`,
            title: gateName,
            rank: gateRank,
            xpReward: parsedQuestions.length * 100,
            questions: parsedQuestions
        };

        // Save to LocalStorage
        const existing = JSON.parse(localStorage.getItem('arise_dungeons') || '{}');
        existing[newDungeon.id] = newDungeon;
        localStorage.setItem('arise_dungeons', JSON.stringify(existing));

        alert(`SUCCESS: Gate "${gateName}" has been initialized with ${parsedQuestions.length} monsters.`);
        setParsedQuestions([]);
        setGateName("");
        setStatus("idle");
    };

    return (
        <div className="min-h-screen bg-black text-green-500 font-mono p-6 md:p-12 selection:bg-green-900 selection:text-white">
            <div className="fixed inset-0 pointer-events-none opacity-10"
                style={{ backgroundImage: 'linear-gradient(#00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)', backgroundSize: '40px 40px' }}
            />

            <div className="max-w-4xl mx-auto relative z-10">
                <div className="border-b border-green-500/30 pb-6 mb-8 flex justify-between items-end">
                    <div>
                        <div className="text-xs text-green-800 font-bold tracking-widest mb-2">ACCESS LEVEL: ARCHITECT</div>
                        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                            <Terminal className="w-8 h-8" /> SYSTEM CONSOLE
                        </h1>
                    </div>
                    <div className="flex items-center gap-2 text-red-500 bg-red-500/10 px-3 py-1 rounded border border-red-500/20 text-xs font-bold">
                        <ShieldAlert className="w-4 h-4" /> ADMIN EYES ONLY
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="md:col-span-2">
                        <label className="block text-xs uppercase tracking-widest text-green-700 mb-2">Gate Title</label>
                        <input
                            type="text"
                            value={gateName}
                            onChange={(e) => setGateName(e.target.value)}
                            placeholder="Ex: The Quantum Physics Realm"
                            className="w-full bg-black border border-green-500/50 rounded p-3 text-green-400 focus:outline-none focus:border-green-400 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-xs uppercase tracking-widest text-green-700 mb-2">Difficulty</label>
                        <select
                            value={gateRank}
                            onChange={(e) => setGateRank(e.target.value)}
                            className="w-full bg-black border border-green-500/50 rounded p-3 text-green-400 focus:outline-none"
                        >
                            <option>E-Rank</option>
                            <option>B-Rank</option>
                            <option>A-Rank</option>
                            <option>S-Rank</option>
                        </select>
                    </div>
                </div>

                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-xl h-64 flex flex-col items-center justify-center transition-all mb-8 ${dragActive ? 'border-green-400 bg-green-900/10' : 'border-green-800 bg-black'}`}
                >
                    <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />

                    <AnimatePresence mode='wait'>
                        {status === 'idle' && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
                                <FileSpreadsheet className="w-12 h-12 text-green-700 mx-auto mb-4" />
                                <p className="text-lg font-bold text-green-500">INITIATE UPLOAD</p>
                                <p className="text-sm text-green-800 mt-2">Drag Blueprint (CSV) here or Click to Browse</p>
                                <p className="text-xs text-green-900 mt-4 font-mono bg-green-900/20 p-2 rounded inline-block">Format: Question, Opt1, Opt2, Opt3, Opt4, CorrectIndex(1-4)</p>
                            </motion.div>
                        )}

                        {status === 'success' && (
                            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
                                <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4 shadow-[0_0_20px_#4ade80]" />
                                <p className="text-xl font-bold text-white">BLUEPRINT ANALYZED</p>
                                <p className="text-green-500 mt-2">{parsedQuestions.length} Monsters Ready for Deployment</p>
                            </motion.div>
                        )}

                        {status === 'error' && (
                            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
                                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                                <p className="text-xl font-bold text-red-500">CORRUPTED DATA</p>
                                <p className="text-red-800 mt-2">Check CSV format and try again.</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {parsedQuestions.length > 0 && (
                    <div className="border border-green-500/30 rounded-lg p-6 bg-green-900/5">
                        <h3 className="text-xs uppercase tracking-widest text-green-700 mb-4 flex items-center gap-2">
                            <Database className="w-4 h-4" /> Deployment Preview
                        </h3>

                        <div className="space-y-2 mb-6 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {parsedQuestions.map((q, i) => (
                                <div key={i} className="flex gap-3 text-sm border-b border-green-500/10 pb-2">
                                    <span className="text-green-700 font-mono">#{i + 1}</span>
                                    <span className="text-green-400 truncate flex-1">{q.q}</span>
                                    <span className="text-green-600 text-xs whitespace-nowrap">Ans: Option {q.correct + 1}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={handleDeploy}
                                className="bg-green-600 hover:bg-green-500 text-black font-bold py-3 px-8 rounded flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(22,163,74,0.3)] hover:shadow-[0_0_30px_rgba(22,163,74,0.5)]"
                            >
                                <Save className="w-5 h-5" /> DEPLOY DUNGEON
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default AdminPage;