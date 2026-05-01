"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useAdminCourses, useAdminSubjects, useAdminResources } from "@/hooks/useFirestore";
import { auth } from "@/lib/firebase/config";
import ContentForm from "@/components/admin/ContentForm";
import ContentTable from "@/components/admin/ContentTable";

export default function AdminContentPage() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<"courses" | "subjects" | "resources">("resources");
  
  // Form state
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Data Hooks
  const { courses: allCourses, loading: coursesLoading, refresh: refreshCourses, error: coursesError } = useAdminCourses();
  const { subjects: allSubjects, loading: subjectsLoading, refresh: refreshSubjects, error: subjectsError } = useAdminSubjects(courseId);
  const { resources: allResources, loading: resourcesLoading, refresh: refreshResources, error: resourcesError } = useAdminResources(subjectId);
  
  const currentError = activeTab === "courses" ? coursesError : activeTab === "subjects" ? subjectsError : resourcesError;

  const startEdit = useCallback((item: any) => {
    setEditingId(item.id);
    setTitle(item.title || item.name || "");
    setDescription(item.description || (item.semesterNumber?.toString()) || "");
    setResType(item.type || "pdf");
    setUrl(item.url || item.code || "");
    setCourseId(item.courseId || "");
    setSubjectId(item.subjectId || "");
    setIsPremium(item.isPremium || false);
    setErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setResType("pdf");
    setUrl("");
    setCourseId("");
    setSubjectId("");
    setIsPremium(false);
    setErrors({});
  }, []);

  const handleSave = useCallback(async () => {
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
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ table: activeTab, id: editingId, payload })
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to save");
      }
      
      setSuccessMsg(editingId ? "✅ Updated successfully!" : "✅ Created successfully!");
      setErrors({});
      if (!editingId) {
        setTitle("");
        setDescription("");
        setUrl("");
        setPreview("");
      } else {
        setEditingId(null);
      }
      setSelectedFile(null);
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (e: any) {
      console.error("[Admin] Create failed:", e);
      alert("❌ Failed to save: " + (e.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  }, [isAdmin, activeTab, title, subjectId, url, courseId, description, resType, isPremium, editingId]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("bucket", "pdfs"); // Use secure PDF bucket

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { "Authorization": `Bearer ${idToken}` },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");

      // For PDFs, 'data.url' is the storage path (e.g. 123-file.pdf)
      // For images, it's the full public URL.
      setUrl(data.url);
      setSuccessMsg("✅ File uploaded successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert("❌ Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm(`Delete this ${activeTab.slice(0, -1)}? This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/admin/content?id=${id}&table=${activeTab}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${idToken}` }
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to delete");

      if (activeTab === "courses") refreshCourses();
      else if (activeTab === "subjects") refreshSubjects();
      else if (activeTab === "resources") refreshResources();
    } catch (e: any) {
      console.error("[Admin] Delete failed:", e);
      alert("❌ Delete failed: " + (e.message || "Unknown error"));
    } finally {
      setDeletingId(null);
    }
  }, [activeTab, refreshCourses, refreshSubjects, refreshResources]);

  return (
    <div className="min-h-screen pb-20">
      <ContentForm 
        activeTab={activeTab}
        title={title} setTitle={setTitle}
        description={description} setDescription={setDescription}
        resType={resType} setResType={setResType}
        url={url} setUrl={setUrl}
        preview={preview} setPreview={setPreview}
        courseId={courseId} setCourseId={setCourseId}
        subjectId={subjectId} setSubjectId={setSubjectId}
        isPremium={isPremium} setIsPremium={setIsPremium}
        isSaving={isSaving}
        errors={errors} setErrors={setErrors}
        successMsg={successMsg}
        editingId={editingId}
        handleSave={handleSave}
        handleUpload={handleUpload}
        selectedFile={selectedFile} setSelectedFile={setSelectedFile}
        isUploading={isUploading}
        cancelEdit={cancelEdit}
        allCourses={allCourses} coursesLoading={coursesLoading}
        allSubjects={allSubjects} subjectsLoading={subjectsLoading}
      />

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

        <ContentTable 
          activeTab={activeTab}
          allResources={allResources} resourcesLoading={resourcesLoading}
          allSubjects={allSubjects} subjectsLoading={subjectsLoading}
          allCourses={allCourses} coursesLoading={coursesLoading}
          deletingId={deletingId}
          handleDelete={handleDelete}
          startEdit={startEdit}
          currentError={currentError}
        />
      </div>
    </div>
  );
}
