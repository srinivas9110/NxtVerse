import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        // Instantly scroll to the top-left of the window
        window.scrollTo(0, 0);
    }, [pathname]); // This effect runs every time 'pathname' changes

    return null; // This component renders nothing visually
}