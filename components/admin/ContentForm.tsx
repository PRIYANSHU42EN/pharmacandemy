"use client";

import { RESOURCE_TYPES } from "@/constants";
import { memo } from "react";

interface ContentFormProps {
  activeTab: "courses" | "subjects" | "resources";
  title: string;
  setTitle: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  resType: string;
  setResType: (val: string) => void;
  url: string;
  setUrl: (val: string) => void;
  preview: string;
  setPreview: (val: string) => void;
  courseId: string;
  setCourseId: (val: string) => void;
  subjectId: string;
  setSubjectId: (val: string) => void;
  isPremium: boolean;
  setIsPremium: (val: boolean) => void;
  isSaving: boolean;
  errors: Record<string, string>;
  setErrors: (val: any) => void;
  successMsg: string;
  editingId: string | null;
  handleSave: () => void;
  handleUpload: () => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  isUploading: boolean;
  cancelEdit: () => void;
  allCourses: any[];
  coursesLoading: boolean;
  allSubjects: any[];
  subjectsLoading: boolean;
}

const ContentForm = memo(({
  activeTab,
  title, setTitle,
  description, setDescription,
  resType, setResType,
  url, setUrl,
  preview, setPreview,
  courseId, setCourseId,
  subjectId, setSubjectId,
  isPremium, setIsPremium,
  isSaving,
  errors, setErrors,
  successMsg,
  editingId,
  handleSave,
  handleUpload,
  selectedFile, setSelectedFile,
  isUploading,
  cancelEdit,
  allCourses, coursesLoading,
  allSubjects, subjectsLoading
}: ContentFormProps) => {
  return (
    <section className="bg-black text-white p-6 lg:p-10 mb-8 shadow-2xl relative overflow-hidden rounded-2xl">
      <div className="max-w-5xl mx-auto relative z-10">
        <div className="mb-8">
          <h1 className="text-[32px] font-bold mb-2 tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
            {editingId ? "Edit Content" : "Content Command Center"}
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
                <div className="flex gap-2">
                  <input 
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); if(errors.url) setErrors({...errors, url: ""}); }}
                    placeholder={activeTab === "courses" ? "e.g. bpharm" : "Paste G-Drive or YouTube link here..."}
                    className={`flex-1 bg-white/5 border rounded-xl px-5 py-3 text-[14px] outline-none transition-all placeholder:text-white/20 ${errors.url ? 'border-red-500 bg-red-500/5' : 'border-white/10 focus:border-candy-rose/50'}`}
                  />
                  {activeTab === "resources" && (
                    <div className="relative">
                      <input 
                        type="file"
                        id="pdf-upload"
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setSelectedFile(file);
                        }}
                      />
                      <label 
                        htmlFor="pdf-upload"
                        className="h-full px-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl flex items-center justify-center cursor-pointer transition-all"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </label>
                    </div>
                  )}
                </div>
                {selectedFile && (
                  <div className="flex items-center justify-between bg-candy-rose/10 border border-candy-rose/20 rounded-lg px-4 py-2">
                    <span className="text-[12px] text-candy-rose font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                    <button 
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="text-[11px] font-bold uppercase tracking-wider text-candy-rose hover:underline disabled:opacity-50"
                    >
                      {isUploading ? "Uploading..." : "Upload Now"}
                    </button>
                  </div>
                )}
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

            {/* CREATE BUTTON */}
            <div className="pt-2">
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleSave}
                  disabled={isSaving || !title.trim() || (activeTab === "resources" && (!url.trim() || !subjectId)) || (activeTab === "subjects" && !courseId)}
                  className="w-full bg-candy-rose text-navy h-[60px] rounded-xl text-[16px] font-bold shadow-[0_10px_40px_rgba(247,197,216,0.3)] disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-navy" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      SAVING...
                    </span>
                  ) : (
                    <>
                      <span>{editingId ? "UPDATE" : "CREATE"} {activeTab.slice(0, -1).toUpperCase()}</span>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>
                
                {editingId && (
                  <button 
                    onClick={cancelEdit}
                    className="w-full bg-white/10 text-white h-[50px] rounded-xl text-[14px] font-bold hover:bg-white/20 transition-all active:scale-[0.98]"
                  >
                    CANCEL EDIT
                  </button>
                )}
              </div>
              
              {successMsg && (
                <p className="text-[11px] text-center mt-3 text-green-400 font-bold tracking-widest uppercase animate-pulse">
                  {successMsg}
                </p>
              )}
              {!successMsg && (
                (activeTab === "resources" && (!title.trim() || !url.trim() || !subjectId)) ||
                (activeTab === "subjects" && (!title.trim() || !courseId)) ||
                (activeTab === "courses" && !title.trim())
              ) ? (
                <p className="text-[10px] text-center mt-4 text-gray-600 font-bold tracking-widest uppercase">
                  Missing: 
                  {!title.trim() && " Title •"} 
                  {activeTab === "resources" && !subjectId && " Subject •"} 
                  {activeTab === "subjects" && !courseId && " Course •"}
                  {activeTab === "resources" && !url.trim() && " Link"}
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
  );
});

ContentForm.displayName = "ContentForm";
export default ContentForm;
