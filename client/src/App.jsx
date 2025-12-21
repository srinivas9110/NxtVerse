import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout'; // <--- Import Layout
import ScrollToTop from './components/ScrollToTop';

import Signup from './pages/Signup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Network from './pages/Network';
import VerseIQ from './pages/VerseIQ';
import Events from './pages/Events';
import Profile from './pages/Profile';
import StudyRooms from './pages/StudyRooms';
import Hackathons from './pages/Hackathons';
import Messages from './pages/Messages';
import Clubs from './pages/Clubs';
import ClubDetails from './pages/ClubDetails';
import Ticket from './pages/Ticket';
import ResourcesPage from './pages/Resources';
import ArisePage from './pages/Arise';
import AriseAdmin from './pages/AriseAdmin';

export default function App() {
    return (
        <Router>
            <ScrollToTop />
            <Routes>
                {/* PUBLIC ROUTES (No Sidebar) */}
                <Route path="/" element={<Signup />} />
                <Route path="/login" element={<Login />} />

                {/* PROTECTED ROUTES (With Sidebar) */}
                {/* We wrap these pages inside the Layout component */}
                <Route element={<Layout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/network" element={<Network />} />
                    <Route path="/events" element={<Events />} />
                    <Route path="/verse-iq" element={<VerseIQ />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/profile/:id" element={<Profile />} />
                    <Route path="/study-rooms" element={<StudyRooms />} />
                    <Route path="/hackathons" element={<Hackathons />} />
                    <Route path="/arise" element={<ArisePage />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/messages/:id" element={<Messages />} />
                    <Route path="/clubs" element={<Clubs />} />
                    <Route path="/clubs/:id" element={<ClubDetails />} />
                    <Route path="/ticket/:workshopId" element={<Ticket />} />
                    <Route path="/resources" element={<ResourcesPage />} />
                    <Route path="/arise-admin" element={<AriseAdmin />} />
                </Route>

            </Routes>
        </Router>
    );
}