"use client";

import { useState, useEffect } from "react";

export default function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setShowConsent(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "true");
    setShowConsent(false);
  };

  if (!showConsent) return null;

  return (
    <div 
      className="fixed bottom-6 right-6 z-50 w-full max-w-[320px] p-6 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-500"
      style={{ 
        background: "var(--color-navy)", 
        color: "var(--color-cream)",
        border: "0.5px solid rgba(255,255,255,0.1)"
      }}
    >
      <h4 className="text-[14px] font-bold mb-2" style={{ fontFamily: "var(--font-display)" }}>
        Cookie Policy 🍪
      </h4>
      <p className="text-[12px] opacity-70 mb-4 leading-relaxed">
        We use cookies to enhance your learning experience and analyze site traffic. 
        By continuing, you agree to our use of cookies.
      </p>
      <div className="flex gap-3">
        <button 
          onClick={handleAccept}
          className="flex-1 text-[11px] font-bold py-2.5 rounded-lg transition-all hover:opacity-90"
          style={{ background: "var(--color-candy-rose)", color: "var(--color-navy)" }}
        >
          Accept All
        </button>
        <button 
          onClick={() => setShowConsent(false)}
          className="flex-1 text-[11px] font-bold py-2.5 rounded-lg transition-all hover:bg-white/10"
          style={{ border: "0.5px solid rgba(255,255,255,0.2)" }}
        >
          Decline
        </button>
      </div>
    </div>
  );
}
