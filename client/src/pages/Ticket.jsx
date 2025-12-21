import React from 'react'; // React imports
import { useParams, Link, useLocation } from 'react-router-dom'; // Router imports
import QRCode from 'react-qr-code'; // QR Code library
import { ArrowLeft, Calendar, Clock, Ticket as TicketIcon } from 'lucide-react'; // Icons

export default function Ticket() {
    const { workshopId } = useParams();
    const location = useLocation();

    // 1. Get the data passed from the "View Ticket" button
    const data = location.state?.workshop;

    // Safety: If someone goes to this URL directly without clicking the button, show error
    if (!data) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white">
                <p className="mb-4 text-gray-400">No ticket data found.</p>
                <Link to="/clubs" className="text-purple-500 hover:underline">Go back to Clubs</Link>
            </div>
        );
    }

    // 2. The Data inside the QR Code (User ID + Workshop ID)
    // When Admin scans this later, they verify this data.
    const qrData = JSON.stringify({
        wid: workshopId,
        name: data.title
    });

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">

            <div className="bg-[#18181b] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden relative shadow-2xl">

                {/* TICKET HEADER */}
                <div className="bg-purple-600 p-6 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                    <h2 className="text-white font-bold text-lg relative z-10 flex items-center justify-center gap-2">
                        <TicketIcon size={20} /> EVENT PASS
                    </h2>
                    <p className="text-purple-200 text-xs relative z-10 tracking-widest uppercase mt-1">NxtVerse Official Entry</p>
                </div>

                {/* TICKET BODY */}
                <div className="p-8 flex flex-col items-center text-center relative">
                    {/* Punch Holes Effect (The semi-circles on sides) */}
                    <div className="absolute -left-3 top-0 w-6 h-6 bg-[#050505] rounded-full"></div>
                    <div className="absolute -right-3 top-0 w-6 h-6 bg-[#050505] rounded-full"></div>

                    <h1 className="text-2xl font-bold text-white mb-2 leading-tight">{data.title}</h1>
                    <p className="text-gray-400 text-sm mb-6 uppercase tracking-wide">{data.venue || "Venue TBD"}</p>

                    {/* QR CODE AREA */}
                    <div className="bg-white p-4 rounded-xl mb-6 shadow-lg">
                        <QRCode
                            value={qrData}
                            size={160}
                            fgColor="#000000"
                            bgColor="#ffffff"
                        />
                    </div>

                    <p className="text-gray-500 text-xs mb-8">Scan this code at the entrance</p>

                    {/* DETAILS GRID */}
                    <div className="w-full grid grid-cols-2 gap-4 border-t border-white/5 pt-6 text-left">
                        <div>
                            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Date</p>
                            <div className="flex items-center gap-2 text-white font-bold text-sm">
                                <Calendar size={14} className="text-purple-500" />
                                {new Date(data.date).toLocaleDateString()}
                            </div>
                        </div>
                        <div>
                            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mb-1">Time</p>
                            <div className="flex items-center gap-2 text-white font-bold text-sm">
                                <Clock size={14} className="text-purple-500" />
                                {data.time}
                            </div>
                        </div>
                    </div>

                    <Link to={`/clubs/${data.clubId}`} className="mt-8 flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-wide">
                        <ArrowLeft size={14} /> Back to Club Space
                    </Link>
                </div>
            </div>
        </div>
    );
}