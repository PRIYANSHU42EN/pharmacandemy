"use client";

import { memo } from "react";
import Badge from "@/components/ui/Badge";

interface ContentTableProps {
  activeTab: "courses" | "subjects" | "resources";
  allResources: any[];
  resourcesLoading: boolean;
  allSubjects: any[];
  subjectsLoading: boolean;
  allCourses: any[];
  coursesLoading: boolean;
  deletingId: string | null;
  handleDelete: (id: string) => void;
  startEdit: (item: any) => void;
  currentError: any;
}

const ContentTable = memo(({
  activeTab,
  allResources,
  resourcesLoading,
  allSubjects,
  subjectsLoading,
  allCourses,
  coursesLoading,
  deletingId,
  handleDelete,
  startEdit,
  currentError
}: ContentTableProps) => {
  return (
    <div className="card overflow-hidden bg-white border border-gray-100 rounded-2xl shadow-sm">
      <table className="w-full text-left border-collapse">
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
              {allResources.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[13px] text-gray-500 font-medium">
                    {resourcesLoading ? "Loading content..." : "No content available"}
                  </td>
                </tr>
              )}
              {allResources.map(res => (
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
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button
                      onClick={() => startEdit(res)}
                      className="text-[12px] font-bold text-navy border border-navy/20 px-4 py-1.5 rounded-lg hover:bg-navy hover:text-white transition-all"
                    >
                      Edit
                    </button>
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
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button
                      onClick={() => startEdit(sub)}
                      className="text-[12px] font-bold text-navy border border-navy/20 px-4 py-1.5 rounded-lg hover:bg-navy hover:text-white transition-all"
                    >
                      Edit
                    </button>
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
              {currentError && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[13px] text-red-500 font-medium">
                    ❌ Error loading data: {currentError.message || "Unknown error"}
                  </td>
                </tr>
              )}
              {!currentError && allCourses.length === 0 && (
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
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    <button
                      onClick={() => startEdit(course)}
                      className="text-[12px] font-bold text-navy border border-navy/20 px-4 py-1.5 rounded-lg hover:bg-navy hover:text-white transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      disabled={deletingId === course.id}
                      className="text-[12px] font-bold text-red-600 border border-red-200 px-4 py-1.5 rounded-lg hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                    >
                      {deletingId === course.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
});

ContentTable.displayName = "ContentTable";
export default ContentTable;
