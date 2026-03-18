"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HistoryItem {
  id: string;
  prompt: string;
  model: string;
  createdAt: string;
  status: string;
  imageUrl?: string;
  thumbnailUrl?: string;
}

interface HistoryResponse {
  items: HistoryItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchHistory = useCallback(async (page: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      const res = await fetch(`/api/history?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to fetch history (${res.status})`,
        );
      }
      const data: HistoryResponse = await res.json();
      setHistory(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
      setCurrentPage(data.page ?? page);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(currentPage);
  }, [currentPage, fetchHistory]);

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this generation? This action cannot be undone.",
      )
    ) {
      return;
    }
    setDeletingId(id);
    try {
      const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to delete item (${res.status})`);
      }
      // Refresh current page; if it becomes empty and not first page, go back
      const newTotal = total - 1;
      const newTotalPages = Math.ceil(newTotal / PAGE_SIZE);
      if (currentPage > newTotalPages && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        fetchHistory(currentPage);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete item");
    } finally {
      setDeletingId(null);
    }
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const formatDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "failed":
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "pending":
      case "processing":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: (number | "ellipsis")[] = [];
    const delta = 2;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (
        (i === currentPage - delta - 1 && i > 1) ||
        (i === currentPage + delta + 1 && i < totalPages)
      ) {
        pages.push("ellipsis");
      }
    }

    // Deduplicate consecutive ellipsis
    const dedupedPages: (number | "ellipsis")[] = [];
    for (const p of pages) {
      if (
        p === "ellipsis" &&
        dedupedPages[dedupedPages.length - 1] === "ellipsis"
      )
        continue;
      dedupedPages.push(p);
    }

    return (
      <nav
        className="flex items-center justify-center gap-1 mt-8"
        aria-label="Pagination"
      >
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          ← Prev
        </button>

        {dedupedPages.map((page, idx) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-3 py-2 text-gray-500 dark:text-gray-400"
            >
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                page === currentPage
                  ? "bg-blue-600 text-white cursor-default"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              aria-current={page === currentPage ? "page" : undefined}
            >
              {page}
            </button>
          ),
        )}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          Next →
        </button>
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Generation History
            </h1>
            {!loading && !error && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {total === 0
                  ? "No generations yet"
                  : `${total} generation${total !== 1 ? "s" : ""} total`}
              </p>
            )}
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + New Generation
          </Link>
        </div>

        {/* Error state */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-red-500 text-lg" aria-hidden="true">
                ⚠
              </span>
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Failed to load history
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {error}
                </p>
                <button
                  onClick={() => fetchHistory(currentPage)}
                  className="mt-2 text-sm font-medium text-red-700 dark:text-red-300 underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div
            className="space-y-4"
            aria-busy="true"
            aria-label="Loading history"
          >
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
              >
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && history.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4" aria-hidden="true">
              🖼️
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No generations yet
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Start creating images to see your history here.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              Create your first generation
            </Link>
          </div>
        )}

        {/* History list */}
        {!loading && !error && history.length > 0 && (
          <>
            <ul className="space-y-4" role="list">
              {history.map((item) => (
                <li
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start gap-4 p-4">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      {item.thumbnailUrl || item.imageUrl ? (
                        <Link
                          href={`/history/${item.id}`}
                          aria-label={`View details for generation ${item.id}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.thumbnailUrl || item.imageUrl}
                            alt={
                              item.prompt
                                ? `Generated: ${item.prompt.slice(0, 50)}`
                                : "Generated image"
                            }
                            className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                            loading="lazy"
                          />
                        </Link>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                          <span className="text-2xl" aria-hidden="true">
                            🖼️
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/history/${item.id}`}
                          className="group flex-1 min-w-0"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 break-words">
                            {item.prompt || (
                              <span className="italic text-gray-400">
                                No prompt
                              </span>
                            )}
                          </p>
                        </Link>

                        {/* Status badge */}
                        {item.status && (
                          <span
                            className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(item.status)}`}
                          >
                            {item.status}
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {item.model && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <span aria-hidden="true">🤖</span>
                            {item.model}
                          </span>
                        )}
                        {item.createdAt && (
                          <time
                            dateTime={item.createdAt}
                            className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"
                          >
                            <span aria-hidden="true">🕐</span>
                            {formatDate(item.createdAt)}
                          </time>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <Link
                        href={`/history/${item.id}`}
                        className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                        aria-label={`View details for generation`}
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label={`Delete generation`}
                      >
                        {deletingId === item.id ? (
                          <span className="flex items-center gap-1">
                            <svg
                              className="animate-spin h-3 w-3"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              aria-hidden="true"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v8H4z"
                              />
                            </svg>
                            Deleting…
                          </span>
                        ) : (
                          "Delete"
                        )}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            {renderPagination()}

            {/* Page info */}
            {totalPages > 1 && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
                Page {currentPage} of {totalPages} · {total} total
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
