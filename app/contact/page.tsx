"use client";

import { useState } from "react";
import Breadcrumb from "@/components/shared/Breadcrumb";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setSent(true);
      } else {
        alert(result.error || "Failed to send message. Please try again.");
      }
    } catch (err) {
      console.error("Contact form error:", err);
      alert("An error occurred. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-8 lg:py-12" style={{ background: "#F9F8F7", minHeight: "calc(100vh - 64px)" }}>
      <div className="container-main max-w-4xl">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Contact Us" },
          ]}
        />

        <div className="mt-8 p-8 lg:p-12 rounded-2xl" style={{ background: "white", border: "0.5px solid #e0e0e0" }}>
          <h1 className="text-[32px] mb-6" style={{ fontFamily: "var(--font-display)" }}>Contact Us</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <p className="text-[16px] leading-relaxed mb-8" style={{ fontFamily: "var(--font-body)", color: "var(--color-navy)" }}>
                Have questions about your subscription, a technical issue, or just want to suggest new materials? We&apos;re here to help!
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-[12px] uppercase tracking-widest font-bold mb-1" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>Support Email</h3>
                  <p className="text-[18px] font-medium" style={{ color: "var(--color-candy-rose)", fontFamily: "var(--font-display)" }}>support@cubepharm.in</p>
                </div>
                
                <div>
                  <h3 className="text-[12px] uppercase tracking-widest font-bold mb-1" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>Response Time</h3>
                  <p className="text-[15px]" style={{ color: "var(--color-navy)", fontFamily: "var(--font-body)" }}>Usually within 24–48 hours</p>
                </div>
              </div>
            </div>

            {sent ? (
              <div className="flex flex-col items-center justify-center text-center p-8 bg-green-50 rounded-xl border border-green-100">
                <span className="text-[40px] mb-4">✅</span>
                <h3 className="text-[18px] font-bold mb-2">Message Sent!</h3>
                <p className="text-[14px] opacity-70">We've received your message and will get back to you shortly.</p>
                <button onClick={() => setSent(false)} className="mt-6 text-[12px] font-medium underline">Send another message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>Your Name</label>
                  <input 
                    id="name"
                    required
                    autoComplete="name"
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-lg outline-none text-[14px]" 
                    style={{ background: "rgba(26,31,60,0.02)", border: "1px solid rgba(26,31,60,0.1)", fontFamily: "var(--font-body)" }} 
                    placeholder="Enter your name" 
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>Email Address</label>
                  <input 
                    id="email"
                    required
                    autoComplete="email"
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-lg outline-none text-[14px]" 
                    style={{ background: "rgba(26,31,60,0.02)", border: "1px solid rgba(26,31,60,0.1)", fontFamily: "var(--font-body)" }} 
                    placeholder="you@example.com" 
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-[12px] font-medium mb-1.5" style={{ color: "var(--color-mid)", fontFamily: "var(--font-body)" }}>Message</label>
                  <textarea 
                    id="message"
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-lg outline-none text-[14px] h-32 resize-none" 
                    style={{ background: "rgba(26,31,60,0.02)", border: "1px solid rgba(26,31,60,0.1)", fontFamily: "var(--font-body)" }} 
                    placeholder="How can we help you?" 
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn btn-accent w-full justify-center disabled:opacity-50"
                >
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
