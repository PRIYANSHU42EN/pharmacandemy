"use client";

import { useState, useEffect, useMemo } from "react";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/components/providers/AuthProvider";
import { RESOURCE_TYPES } from "@/constants";
import { useCourses, useSubjects, useResources } from "@/hooks/useFirestore";
import { supabase } from "@/lib/supabase/client";
import { auth } from "@/lib/firebase/config";

export default function AdminContentPage() {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<"courses" | "subjects" | "resources">("resources");
  
  // Form state (Black Space Area)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resType, setResType] = useState("pdf");
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState("");
  const [courseId, setCourseId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Supabase Data State (Now using hooks)
  const { courses: allCourses, loading: coursesLoading } = useCourses();
  const { subjects: allSubjects, loading: subjectsLoading } = useSubjects(courseId);
  const { resources: allResources, loading: resourcesLoading } = useResources(subjectId);
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Hooks handle the fetching and real-time updates now.

  const handleCreate = async () => {
    const newErrors: Record<string, string> = {};
    if (!isAdmin) {
      alert("Unauthorized: Only admins can create content.");
      return;
    }

    if (activeTab === "resources") {
      if (!title.trim()) newErrors.title = "Title is required";
      if (!subjectId) newErrors.subjectId = "Subject is required";
      if (!url.trim()) newErrors.url = "Content link is required";
    } else if (activeTab === "subjects") {
      if (!title.trim()) newErrors.title = "Subject Name is required";
      if (!courseId) newErrors.courseId = "Course is required";
    } else if (activeTab === "courses") {
      if (!title.trim()) newErrors.title = "Course Name is required";
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    setIsSaving(true);
    
    try {
      let payload: any = {};
      
      if (activeTab === "resources") {
        payload = {
          title: title.trim(),
          description: description.trim(),
          type: resType,
          url: url.trim(),
          course_id: courseId || null,
          subject_id: subjectId,
          is_premium: isPremium,
          is_deleted: false,
          updated_at: new Date().toISOString()
        };
      } else if (activeTab === "subjects") {
        payload = {
          name: title.trim(),
          course_id: courseId,
          semester_number: parseInt(description) || 0,
          is_premium: isPremium,
          updated_at: new Date().toISOString()
        };
      } else if (activeTab === "courses") {
        payload = {
          name: title.trim(),
          code: url.trim().toLowerCase(),
          description: description.trim(),
          order: 0,
          is_active: true,
          updated_at: new Date().toISOString()
        };
      }

      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch("/api/admin/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ table: activeTab, payload }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to save");
      }

      setSuccessMsg(`✅ ${activeTab.slice(0, -1)} created successfully!`);
      setTitle("");
      setDescription("");
      setUrl("");
      setPreview("");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e: any) {
      console.error("[Admin] Create failed:", e);
      alert("❌ Failed to save: " + (e.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`Delete this ${activeTab.slice(0, -1)}? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/admin/content?id=${id}&table=${activeTab}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to delete");
      }

      console.log("[Admin] 🗑️ Deleted:", id);
    } catch (e: any) {
      console.error("[Admin] Delete failed:", e);
      alert("❌ Delete failed: " + (e.message || "Unknown error"));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredResources = allResources;

  return (
    <div className="min-h-screen pb-20">
      {/* STEP 4: BLACK SPACE AREA (Input System) */}
      <section className="bg-black text-white p-6 lg:p-10 mb-8 shadow-2xl relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="mb-8">
            <h1 className="text-[32px] font-bold mb-2 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Content Command Center
            </h1>
            <p className="text-gray-400 text-[14px]">Rapidly upload and manage platform resources</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Primary Inputs */}
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                  {activeTab === "courses" ? "Course Name" : activeTab === "subjects" ? "Subject Name" : "Resource Title"}
                </label>
                <input 
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); if(errors.title) setErrors({...errors, title: ""}); }}
                  placeholder={activeTab === "courses" ? "e.g. B.Pharm" : activeTab === "subjects" ? "e.g. Pharmacology I" : "e.g. Pharmacology Unit 1 Notes"}
                  className={`w-full bg-white/5 border rounded-xl px-5 py-4 text-[18px] font-medium outline-none transition-all placeholder:text-white/20 ${errors.title ? 'border-red-500 bg-red-500/5' : 'border-white/10 focus:border-candy-rose/50'}`}
                />
                {errors.title && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-wider">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                  {activeTab === "subjects" ? "Semester Number" : "Description / Notes"}
                </label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={activeTab === "subjects" ? "e.g. 1" : "Brief overview of the content..."}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-[14px] outline-none focus:border-candy-rose/50 transition-all placeholder:text-white/20 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {activeTab === "resources" && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Resource Type</label>
                    <select 
                      value={resType}
                      onChange={(e) => setResType(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[14px] outline-none focus:border-candy-rose/50 transition-all cursor-pointer"
                    >
                      {RESOURCE_TYPES.map(t => <option key={t.value} value={t.value} className="bg-black">{t.label}</option>)}
                    </select>
                  </div>
                )}
                {activeTab !== "courses" && (
                  <div className={activeTab === "subjects" ? "col-span-2" : ""}>
                    <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Access Level</label>
                    <div 
                      onClick={() => setIsPremium(!isPremium)}
                      className={`h-[46px] rounded-xl border flex items-center justify-center cursor-pointer transition-all ${isPremium ? 'border-candy-rose bg-candy-rose/10 text-candy-rose' : 'border-white/10 bg-white/5 text-gray-500'}`}
                    >
                      <span className="text-[13px] font-bold">{isPremium ? '👑 PREMIUM' : 'FREE ACCESS'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Link & Location Inputs */}
            <div className="space-y-6">
               <div className="grid grid-cols-2 gap-4">
                  {activeTab !== "courses" && (
                    <div className={activeTab === "subjects" ? "col-span-2" : ""}>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Course</label>
                      <select 
                        value={courseId}
                        onChange={(e) => { setCourseId(e.target.value); setSubjectId(""); if(errors.courseId) setErrors({...errors, courseId: ""}); }}
                        className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-[14px] outline-none transition-all cursor-pointer ${errors.courseId ? 'border-red-500 bg-red-500/5' : 'border-white/10 focus:border-candy-rose/50'}`}
                      >
                        <option value="" className="bg-black text-gray-500">
                          {coursesLoading 
                            ? "Loading courses..." 
                            : allCourses.length === 0 
                              ? "No courses found" 
                              : "Select Course"}
                        </option>
                        {allCourses.map(c => <option key={c.id} value={c.id} className="bg-black">{c.name}</option>)}
                      </select>
                      {errors.courseId && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-wider">{errors.courseId}</p>}
                    </div>
                  )}
                  {activeTab === "resources" && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Subject</label>
                      <select 
                        value={subjectId}
                        onChange={(e) => { setSubjectId(e.target.value); if(errors.subjectId) setErrors({...errors, subjectId: ""}); }}
                        className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-[14px] outline-none transition-all cursor-pointer ${errors.subjectId ? 'border-red-500 bg-red-500/5' : 'border-white/10 focus:border-candy-rose/50'}`}
                      >
                        <option value="" className="bg-black text-gray-500">
                          {subjectsLoading 
                            ? "Loading subjects..." 
                            : !courseId 
                              ? "Select Course First" 
                              : allSubjects.length === 0
                                ? "No subjects found"
                                : "Select Subject"}
                        </option>
                        {allSubjects.map(s => <option key={s.id} value={s.id} className="bg-black">{s.name}</option>)}
                      </select>
                      {errors.subjectId && <p className="text-[10px] text-red-500 mt-2 font-bold uppercase tracking-wider">{errors.subjectId}</p>}
                    </div>
                  )}
               </div>

               <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">
                  {activeTab === "courses" ? "Course Code" : "Main Content Link"}
                </label>
                <div className="flex flex-col gap-2">
                  <input 
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); if(errors.url) setErrors({...errors, url: ""}); }}
                    placeholder={activeTab === "courses" ? "e.g. bpharm" : "Paste G-Drive or YouTube link here..."}
                    className={`w-full bg-white/5 border rounded-xl px-5 py-3 text-[14px] outline-none transition-all placeholder:text-white/20 ${errors.url ? 'border-red-500 bg-red-500/5' : 'border-white/10 focus:border-candy-rose/50'}`}
                  />
                  {errors.url && <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">{errors.url}</p>}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2">Preview Image URL (Optional)</label>
                <input 
                  value={preview}
                  onChange={(e) => setPreview(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-[14px] outline-none focus:border-candy-rose/50 transition-all placeholder:text-white/20"
                />
              </div>

              {/* STEP 5: CREATE BUTTON */}
              <div className="pt-2">
                <button 
                  onClick={handleCreate}
                  disabled={isSaving || !title.trim() || (activeTab === "resources" && (!url.trim() || !subjectId)) || (activeTab === "subjects" && !courseId)}
                  className="w-full bg-candy-rose text-navy h-[60px] rounded-xl text-[16px] font-bold shadow-[0_10px_40px_rgba(247,197,216,0.3)] disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-navy" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      SAVING TO SUPABASE...
                    </span>
                  ) : (
                    <>
                      <span>CREATE {activeTab.slice(0, -1).toUpperCase()}</span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>
                
              {/* Success message */}
                {successMsg && (
                  <p className="text-[11px] text-center mt-3 text-green-400 font-bold tracking-widest uppercase animate-pulse">
                    {successMsg}
                  </p>
                )}
                {!successMsg && (!title.trim() || !url.trim() || !subjectId) ? (
                  <p className="text-[10px] text-center mt-4 text-gray-600 font-bold tracking-widest uppercase">
                    Missing: {!title.trim() && "Title • "} {!subjectId && "Subject • "} {!url.trim() && "Link"}
                  </p>
                ) : (
                  <p className="text-[10px] text-center mt-4 text-green-500 font-bold tracking-widest uppercase">
                    Ready to publish
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Aesthetic decoration */}
        <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] bg-candy-rose opacity-[0.03] rounded-full blur-[100px]" />
        <div className="absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] bg-candy-lavender opacity-[0.03] rounded-full blur-[100px]" />
      </section>

      {/* TABS & TABLE (Existing management view) */}
      <div className="px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
           <div className="flex gap-4">
              {["resources", "subjects", "courses"].map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t as any)}
                  className={`text-[13px] font-bold px-5 py-2 rounded-full capitalize transition-all ${activeTab === t ? 'bg-navy text-candy-rose' : 'bg-gray-100 text-gray-500'}`}
                >
                  {t}
                </button>
              ))}
           </div>
        </div>

        <div className="card overflow-hidden bg-white border border-gray-100">
           <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                 <tr>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase text-gray-400">
                      {activeTab === "courses" ? "Course Name" : activeTab === "subjects" ? "Subject Name" : "Content"}
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase text-gray-400">
                      {activeTab === "courses" ? "Code" : activeTab === "subjects" ? "Course" : "Context"}
                    </th>
                    <th className="px-6 py-4 text-[11px] font-bold uppercase text-gray-400">Status</th>
                    <th className="px-6 py-4 text-right text-[11px] font-bold uppercase text-gray-400">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {/* Resources Tab */}
                 {activeTab === "resources" && (
                   <>
                    {filteredResources.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-[13px] text-gray-500 font-medium">
                          {resourcesLoading ? "Loading content..." : "No content available"}
                        </td>
                      </tr>
                    )}
                    {filteredResources.map(res => (
                      <tr key={res.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-[14px] font-bold text-navy">{res.title}</p>
                            <p className="text-[11px] text-gray-500 uppercase">{res.type}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[12px]">{allSubjects.find(s => s.id === res.subjectId)?.name || '...'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={res.isPremium ? "rose" : "mint"}>{res.isPremium ? "Premium" : "Free"}</Badge>
                          </td>
                          <td className="px-6 py-4 text-right shadow-inner">
                            <button
                              onClick={() => handleDelete(res.id)}
                              disabled={deletingId === res.id}
                              className="text-[12px] font-bold text-red-600 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                            >
                              {deletingId === res.id ? "Deleting..." : "Delete"}
                            </button>
                          </td>
                      </tr>
                    ))}
                   </>
                 )}

                 {/* Subjects Tab */}
                 {activeTab === "subjects" && (
                   <>
                    {allSubjects.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-[13px] text-gray-500 font-medium">
                          {subjectsLoading ? "Loading subjects..." : "No subjects available"}
                        </td>
                      </tr>
                    )}
                    {allSubjects.map(sub => (
                      <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-[14px] font-bold text-navy">{sub.name}</p>
                            <p className="text-[11px] text-gray-500 uppercase">SEM {sub.semesterNumber || "?"}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[12px]">{allCourses.find(c => c.id === sub.courseId)?.name || '...'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={sub.isPremium ? "rose" : "mint"}>{sub.isPremium ? "Premium" : "Free"}</Badge>
                          </td>
                          <td className="px-6 py-4 text-right shadow-inner">
                            <button
                              onClick={() => handleDelete(sub.id)}
                              disabled={deletingId === sub.id}
                              className="text-[12px] font-bold text-red-600 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                            >
                              {deletingId === sub.id ? "Deleting..." : "Delete"}
                            </button>
                          </td>
                      </tr>
                    ))}
                   </>
                 )}

                 {/* Courses Tab */}
                 {activeTab === "courses" && (
                   <>
                    {allCourses.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-[13px] text-gray-500 font-medium">
                          {coursesLoading ? "Loading courses..." : "No courses available"}
                        </td>
                      </tr>
                    )}
                    {allCourses.map(course => (
                      <tr key={course.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-[14px] font-bold text-navy">{course.name}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[11px] text-gray-500 uppercase font-mono">{course.code || "no-code"}</p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={course.isActive ? "mint" : "peach"}>
                              {course.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-right shadow-inner">
                            <button
                              onClick={() => alert("Edit course details coming soon")}
                              className="text-[12px] font-bold text-navy border border-navy/20 px-4 py-1.5 rounded-lg hover:bg-navy hover:text-white transition-all"
                            >
                              Edit
                            </button>
                          </td>
                      </tr>
                    ))}
                   </>
                 )}
              </tbody>
           </table>
           {activeTab === "resources" && filteredResources.length === 0 && (
             <div className="py-20 text-center text-gray-300">
               {resourcesLoading ? "Loading resources..." : !subjectId ? "Select a course and subject above to view resources." : "No resources available for this subject. Use the Command Center to add some."}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
