"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import Link from "next/link";

function ConsentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const client_id = searchParams.get("client_id");
  const redirect_uri = searchParams.get("redirect_uri");
  const scope = searchParams.get("scope");
  const state = searchParams.get("state");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client_id) {
      setError("Missing client_id");
    } else if (!redirect_uri) {
      setError("Missing redirect_uri");
    } else {
      try {
        const url = new URL(redirect_uri);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          setError("Invalid redirect_uri protocol (must be http or https)");
        }
      } catch (e) {
        setError("Invalid redirect_uri format");
      }
    }
  }, [client_id, redirect_uri]);

  const handleApprove = () => {
    if (error || !redirect_uri) return;
    
    const authCode = "pc_auth_" + Math.random().toString(36).substring(2, 15);
    
    const target = new URL(redirect_uri);
    target.searchParams.set("code", authCode);
    if (state) {
      target.searchParams.set("state", state);
    }
    
    router.push(target.toString());
  };

  const handleDeny = () => {
    if (error || !redirect_uri) return;
    
    const target = new URL(redirect_uri);
    target.searchParams.set("error", "access_denied");
    if (state) {
      target.searchParams.set("state", state);
    }
    
    router.push(target.toString());
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-4">
        <div className="bg-white p-8 rounded-2xl border border-[#DDDDDD] max-w-md w-full text-center shadow-sm">
          <span className="text-4xl block mb-4">⚠️</span>
          <h1 className="text-[20px] font-bold mb-2 text-[#1A1F3C]" style={{ fontFamily: "var(--font-display)" }}>OAuth Error</h1>
          <p className="text-[#6B70A0] text-sm mb-8 leading-relaxed">{error}</p>
          <button 
            onClick={() => router.push("/")}
            className="btn btn-ghost w-full text-[13px]"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB] p-4">
      <div className="bg-white p-8 rounded-2xl border border-[#DDDDDD] max-w-md w-full shadow-sm">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#1A1F3C] flex items-center justify-center text-[24px]">
             🎓
          </div>
          <div>
            <h1 className="text-[20px] font-bold text-[#1A1F3C]" style={{ fontFamily: "var(--font-display)" }}>
              Authorize App
            </h1>
            <p className="text-[12px] text-[#6B70A0] uppercase tracking-wider font-medium">
              OAuth 2.0 Consent
            </p>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-[#424771] mb-6 text-[14px] leading-relaxed">
            The application with ID <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[13px] font-mono text-[#1A1F3C]">{client_id}</code> is requesting access to your PharmaCademy account.
          </p>

          <div className="space-y-4">
            <p className="text-[11px] font-bold text-[#6B70A0] uppercase tracking-widest">Requested Permissions</p>
            <div className="bg-[#FDFCFB] border border-gray-100 p-5 rounded-xl">
              <ul className="space-y-4">
                {scope?.split(" ").map(s => (
                  <li key={s} className="flex items-start gap-3 text-[13px] text-[#424771]">
                    <div className="w-5 h-5 rounded-full bg-[rgba(197,247,232,0.3)] flex items-center justify-center shrink-0 mt-0.5">
                       <span className="text-[10px] text-[#2A7A60]">✓</span>
                    </div>
                    <span>
                      {s === "profile" ? "Access your basic profile information (name, avatar)" : 
                       s === "email" ? "View your registered email address" : 
                       s === "openid" ? "Verify your identity on our platform" :
                       s.replace(/_/g, " ").charAt(0).toUpperCase() + s.replace(/_/g, " ").slice(1)}
                    </span>
                  </li>
                )) || (
                  <li className="flex items-start gap-3 text-[13px] text-[#424771]">
                    <div className="w-5 h-5 rounded-full bg-[rgba(197,247,232,0.3)] flex items-center justify-center shrink-0 mt-0.5">
                       <span className="text-[10px] text-[#2A7A60]">✓</span>
                    </div>
                    <span>Access your basic profile information</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={handleApprove}
            className="btn btn-primary w-full py-4 text-[13px] font-bold shadow-sm"
          >
            Allow Access
          </button>
          <button
            onClick={handleDeny}
            className="btn btn-ghost w-full py-4 text-[13px] font-bold"
          >
            Deny & Cancel
          </button>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-50">
          <p className="text-[11px] text-center text-[#6B70A0] leading-relaxed">
            By allowing, you authorize this app to use your information in accordance with their privacy policy and PharmaCademy's terms. You can revoke this access anytime in your <Link href="/profile" className="text-[#1A1F3C] font-bold hover:underline">Account Settings</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OAuthConsentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[rgba(26,31,60,0.1)] border-t-[#FB6F92] rounded-full animate-spin"></div>
          <div className="text-[12px] font-medium text-[#6B70A0] uppercase tracking-widest animate-pulse">
            Loading Secure Consent Screen...
          </div>
        </div>
      </div>
    }>
      <ConsentContent />
    </Suspense>
  );
}
