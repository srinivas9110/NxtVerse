// 1. Detect if we are running on localhost or the live server
const isLocal = window.location.hostname === "localhost";

// 2. Set the API URL dynamically
// REPLACE 'https://your-backend-url.onrender.com' LATER after Phase 2
export const API_URL = isLocal
    ? "http://localhost:5000"
    : "https://nxtverse-backend.onrender.com";