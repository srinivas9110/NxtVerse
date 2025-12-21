import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { API_URL } from '../config';
import axios from 'axios';
import {
    Folder, FileText, FileCode, FileImage,
    ChevronRight, Upload, Plus, Trash2,
    Home, File as FileIcon, Loader, Shield, X
} from 'lucide-react';

const ResourcesPage = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [files, setFiles] = useState([]);

    // Upload States
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState("");

    // Navigation
    const [currentPath, setCurrentPath] = useState([]);
    const [contextMenu, setContextMenu] = useState(null);
    const fileInputRef = useRef(null);
    const folderInputRef = useRef(null);

    // Smart Logic State
    const currentFolderId = currentPath.length > 0 ? currentPath[currentPath.length - 1].id : null;
    const [categoryModal, setCategoryModal] = useState(null);

    // --- 1. FETCH DATA ---
    useEffect(() => {
        const initData = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const [userRes, fileRes] = await Promise.all([
                    axios.get(`${API_URL}/api/auth/getuser`, { headers: { "auth-token": token } }),
                    axios.get(`${API_URL}/api/resources/fetchall`, { headers: { "auth-token": token } })
                ]);
                setUser(userRes.data);
                setFiles(fileRes.data.map(f => ({ ...f, id: f._id })));
                setLoading(false);
            } catch (err) { console.error(err); setLoading(false); }
        };
        initData();
    }, []);

    // --- 2. HANDLERS ---

    const handleFolderSelect = (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;

        if (currentFolderId) {
            const parent = files.find(f => f.id === currentFolderId);
            processFolderUpload(selectedFiles, parent?.restrictedTo || 'ALL');
        } else {
            setCategoryModal({ type: 'folder', data: selectedFiles });
        }
        e.target.value = "";
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (currentFolderId) {
            const parent = files.find(f => f.id === currentFolderId);
            processFileUpload(file, parent?.restrictedTo || 'ALL');
        } else {
            setCategoryModal({ type: 'file', data: file });
        }
        e.target.value = "";
    };

    // --- 3. PROCESSORS ---

    const processFolderUpload = async (fileList, category) => {
        setCategoryModal(null);
        setUploading(true);
        setProgress("Creating Folder...");

        try {
            const token = localStorage.getItem('token');
            const rootFolderName = fileList[0].webkitRelativePath.split('/')[0];

            // 1. Create Root Folder
            const folderRes = await axios.post(`${API_URL}/api/resources/addfolder`, {
                name: rootFolderName,
                parentId: currentFolderId,
                restrictedTo: category
            }, { headers: { "auth-token": token } });

            const newFolderId = folderRes.data._id;
            setFiles(prev => [...prev, { ...folderRes.data, id: folderRes.data._id }]);

            // 2. Upload Files
            let count = 0;
            for (const file of fileList) {
                count++;
                setProgress(`Uploading ${count}/${fileList.length}: ${file.name}`);

                const formData = new FormData();
                formData.append('file', file);
                formData.append('parentId', newFolderId);
                formData.append('restrictedTo', category);

                await axios.post(`${API_URL}/api/resources/uploadfile`, formData, {
                    headers: { "auth-token": token }
                });
            }
            alert(`✅ Uploaded "${rootFolderName}" with ${fileList.length} files!`);
            window.location.reload();

        } catch (err) { alert("Folder upload interrupted."); }
        finally { setUploading(false); setProgress(""); }
    };

    const processFileUpload = async (file, category) => {
        setCategoryModal(null);
        setUploading(true);
        setProgress("Uploading File...");

        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('parentId', currentFolderId || 'null');
        formData.append('restrictedTo', category);

        try {
            const res = await axios.post(`${API_URL}/api/resources/uploadfile`, formData, {
                headers: { "auth-token": token }
            });
            setFiles([...files, { ...res.data, id: res.data._id }]);
            alert("✅ Uploaded!");
        } catch (err) { alert("Upload Failed"); }
        finally { setUploading(false); setProgress(""); }
    };

    // --- 4. DELETE ---
    const handleDelete = async (id, e) => {
        if (e) e.stopPropagation();
        if (!window.confirm("Delete this item? This cannot be undone.")) return;

        const token = localStorage.getItem('token');
        try {
            await axios.delete(`${API_URL}/api/resources/delete/${id}`, { headers: { "auth-token": token } });
            setFiles(files.filter(f => f.id !== id));
            setContextMenu(null);
        } catch (err) { alert("Failed to delete"); }
    };

    // --- 5. HELPERS ---
    const getContents = () => {
        if (!user) return [];
        return files.filter(file => {
            const isInside = (file.parentId == currentFolderId) || (file.parentId === null && currentFolderId === null);
            if (!isInside) return false;

            if (user.role === 'faculty') return true;
            if (!file.restrictedTo || file.restrictedTo === 'ALL') return true;

            const course = user.course ? user.course.toUpperCase() : "";
            if (file.restrictedTo === 'BTECH') return course.includes("TECH") || course.includes("ENGINEERING");
            if (file.restrictedTo === 'BSC') return (course.includes("SC") || course.includes("SCIENCE")) && !course.includes("TECH");

            return true;
        });
    };

    const handleEnterFolder = (folder) => { setCurrentPath([...currentPath, folder]); setContextMenu(null); };
    const handleBreadcrumb = (index) => { setCurrentPath(currentPath.slice(0, index + 1)); setContextMenu(null); };
    const handleFileClick = (file) => window.open(file.url, '_blank');

    const getIcon = (type, name) => {
        if (type === 'folder') return <Folder className="w-12 h-12 text-blue-400 fill-blue-400/10" />;
        if (name?.endsWith('.pdf')) return <FileText className="w-10 h-10 text-red-400" />;
        if (name?.match(/\.(jpg|jpeg|png)$/i)) return <FileImage className="w-10 h-10 text-purple-400" />;
        if (name?.match(/\.(js|html|css|py)$/i)) return <FileCode className="w-10 h-10 text-yellow-400" />;
        return <FileIcon className="w-10 h-10 text-gray-400" />;
    };

    if (loading) return <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center">Loading Repository...</div>;

    const isFaculty = user?.role === 'faculty';
    const currentContents = getContents();

    return (
        <div className="min-h-screen bg-[#09090b] text-white p-6 md:p-12 font-sans relative" onClick={() => setContextMenu(null)}>

            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-900/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-900/10 blur-[150px] rounded-full" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        Repository
                    </h1>
                    {isFaculty && (
                        <div className="flex gap-3">
                            <input type="file" ref={folderInputRef} onChange={handleFolderSelect} className="hidden" webkitdirectory="" directory="" />
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

                            {/* 📱 Mobile UI Fix: "New Folder" is hidden on mobile (hidden md:flex) */}
                            <button onClick={() => folderInputRef.current.click()} className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm border border-white/10 transition-all">
                                <Plus className="w-4 h-4" /> New Folder
                            </button>

                            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm shadow-lg transition-all" onClick={() => fileInputRef.current.click()} disabled={uploading}>
                                {uploading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                {uploading ? "Uploading..." : "Upload File"}
                            </button>
                        </div>
                    )}
                </div>

                {uploading && (
                    <div className="mb-4 bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-blue-400 text-sm flex items-center gap-3">
                        <Loader size={16} className="animate-spin" /> {progress}
                    </div>
                )}

                <div className="flex items-center gap-2 mb-6 text-sm text-gray-400 bg-white/5 p-2 rounded-xl backdrop-blur-sm border border-white/10 w-fit">
                    <button onClick={() => setCurrentPath([])} className={`p-1.5 rounded-md hover:bg-white/10 ${currentPath.length === 0 ? 'text-white' : ''}`}><Home className="w-4 h-4" /></button>
                    {currentPath.map((folder, index) => (
                        <div key={folder.id} className="flex items-center gap-1">
                            <ChevronRight className="w-3 h-3 opacity-30" />
                            <button onClick={() => handleBreadcrumb(index)} className={`px-2 py-1 rounded-md hover:bg-white/10 hover:text-white ${index === currentPath.length - 1 ? 'text-blue-400 font-medium' : ''}`}>{folder.name}</button>
                        </div>
                    ))}
                </div>

                <div className="bg-[#121214]/50 border border-white/10 rounded-2xl flex-1 p-6 min-h-[500px]">
                    {currentContents.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600">
                            <Folder className="w-16 h-16 mb-4 opacity-20" />
                            <p>This folder is empty.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {currentContents.map((item) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onContextMenu={(e) => {
                                        if (!isFaculty) return;
                                        e.preventDefault(); e.stopPropagation();
                                        setContextMenu({ x: e.clientX, y: e.clientY, itemId: item.id });
                                    }}
                                    onClick={(e) => { e.stopPropagation(); item.type === 'folder' ? handleEnterFolder(item) : handleFileClick(item); }}
                                    className="group flex flex-col items-center p-4 rounded-xl transition-all cursor-pointer hover:bg-white/5 border border-transparent hover:border-white/10 relative"
                                >
                                    <div className="mb-4 transition-transform duration-300 group-hover:-translate-y-1">{getIcon(item.type, item.name)}</div>
                                    <span className="text-xs text-gray-300 text-center truncate w-full">{item.name}</span>

                                    {isFaculty && (
                                        <>
                                            {item.restrictedTo !== 'ALL' && (
                                                <span className={`absolute top-2 left-2 text-[8px] px-1.5 py-0.5 rounded border font-bold ${item.restrictedTo === 'BTECH' ? 'bg-blue-900 text-blue-300 border-blue-700' : 'bg-green-900 text-green-300 border-green-700'}`}>
                                                    {item.restrictedTo}
                                                </span>
                                            )}

                                            <button
                                                onClick={(e) => handleDelete(item.id, e)}
                                                className="absolute top-2 right-2 p-1.5 bg-red-500/10 text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {contextMenu && isFaculty && (
                <div className="fixed z-[100] bg-[#1a1a1e] border border-white/20 shadow-2xl rounded-lg py-1 w-48 backdrop-blur-md" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleDelete(contextMenu.itemId)} className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</button>
                </div>
            )}

            {categoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#18181b] border border-white/10 w-full max-w-sm rounded-2xl p-6 relative shadow-2xl">
                        <button onClick={() => setCategoryModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>

                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Shield className="text-blue-400" size={20} /> Access Control</h3>
                        <p className="text-gray-400 text-sm mb-6">
                            Who can view this
                            <span className="text-white font-bold"> {categoryModal.type === 'folder' ? 'Folder' : 'File'}</span>?
                        </p>

                        <div className="space-y-3">
                            {[
                                { id: 'ALL', label: 'Common (Everyone)', color: 'text-gray-200' },
                                { id: 'BTECH', label: 'B.Tech Only', color: 'text-blue-400' },
                                { id: 'BSC', label: 'B.Sc Only', color: 'text-green-400' }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => categoryModal.type === 'folder' ? processFolderUpload(categoryModal.data, opt.id) : processFileUpload(categoryModal.data, opt.id)}
                                    className="w-full p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 text-left text-sm font-bold transition-all flex justify-between items-center group"
                                >
                                    <span className={opt.color}>{opt.label}</span>
                                    <ChevronRight size={16} className="opacity-0 group-hover:opacity-50 transition-opacity" />
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ResourcesPage;