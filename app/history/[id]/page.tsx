"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface RefinementStep {
  id: string;
  stepNumber: number;
  feedback: string;
  generatedTests: string;
  qualityScore: number;
  createdAt: string;
}

interface HistoryDetail {
  id: string;
  sourceCode: string;
  language: string;
  framework: string | null;
  generatedTests: string;
  qualityScore: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  refinements: RefinementStep[];
}

type TabType = "source" | "tests" | "refinements";

export default function HistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [detail, setDetail] = useState<HistoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("source");
  const [selectedRefinement, setSelectedRefinement] =
    useState<RefinementStep | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/history/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Generation not found.");
          } else {
            const data = await response.json().catch(() => ({}));
            setError(data.error || "Failed to fetch generation details.");
          }
          return;
        }
        const data = await response.json();
        setDetail(data);
      } catch {
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80)
      return "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800";
    if (score >= 60)
      return "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800";
    return "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800";
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      processing:
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    };
    return (
      styles[status] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Loading generation details...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-100 dark:bg-red-900/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Error
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Go Back
            </button>
            <Link
              href="/history"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              View All History
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const currentTests = selectedRefinement
    ? selectedRefinement.generatedTests
    : detail.generatedTests;
  const currentScore = selectedRefinement
    ? selectedRefinement.qualityScore
    : detail.qualityScore;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400"
                aria-label="Go back"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Generation Detail
                  </h1>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(detail.status)}`}
                  >
                    {detail.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(detail.createdAt)}
                </p>
              </div>
            </div>
            <Link
              href="/history"
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
            >
              ← All History
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Meta Info & Score */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Language & Framework */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Configuration
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Language
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {detail.language}
                </span>
              </div>
              {detail.framework && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Framework
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {detail.framework}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Refinements
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {detail.refinements.length}
                </span>
              </div>
            </div>
          </div>

          {/* Quality Score */}
          <div className={`rounded-xl border p-5 ${getScoreBg(currentScore)}`}>
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Quality Score
              {selectedRefinement && (
                <span className="ml-2 text-indigo-600 dark:text-indigo-400 normal-case">
                  (Refinement #{selectedRefinement.stepNumber})
                </span>
              )}
            </h3>
            <div className="flex items-end gap-2">
              <span
                className={`text-5xl font-bold ${getScoreColor(currentScore)}`}
              >
                {currentScore}
              </span>
              <span className={`text-xl mb-1 ${getScoreColor(currentScore)}`}>
                /100
              </span>
            </div>
            <div className="mt-3 bg-white/50 dark:bg-black/20 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  currentScore >= 80
                    ? "bg-green-500"
                    : currentScore >= 60
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
                style={{ width: `${currentScore}%` }}
              />
            </div>
          </div>

          {/* Timestamps */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
              Timeline
            </h3>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Created
                </span>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(detail.createdAt)}
                </p>
              </div>
              <div>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Last Updated
                </span>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(detail.updatedAt)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              {(["source", "tests", "refinements"] as TabType[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors capitalize ${
                    activeTab === tab
                      ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  {tab === "refinements"
                    ? `Refinements (${detail.refinements.length})`
                    : tab === "tests"
                      ? "Generated Tests"
                      : "Source Code"}
                </button>
              ))}
            </nav>
          </div>

          {/* Source Code Tab */}
          {activeTab === "source" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Source Code
                </h2>
                <button
                  onClick={() => copyToClipboard(detail.sourceCode)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy
                </button>
              </div>
              <div className="relative">
                <pre className="bg-gray-950 dark:bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm leading-relaxed border border-gray-800">
                  <code>{detail.sourceCode}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Tests Tab */}
          {activeTab === "tests" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Generated Tests
                    {selectedRefinement && (
                      <span className="ml-2 text-sm font-normal text-indigo-600 dark:text-indigo-400">
                        — Refinement #{selectedRefinement.stepNumber}
                      </span>
                    )}
                  </h2>
                  {selectedRefinement && (
                    <button
                      onClick={() => setSelectedRefinement(null)}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mt-1"
                    >
                      ← Back to original tests
                    </button>
                  )}
                </div>
                <button
                  onClick={() => copyToClipboard(currentTests)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy
                </button>
              </div>
              <div className="relative">
                <pre className="bg-gray-950 dark:bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-sm leading-relaxed border border-gray-800">
                  <code>{currentTests}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Refinements Tab */}
          {activeTab === "refinements" && (
            <div className="p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                Refinement History
              </h2>
              {detail.refinements.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No refinements were made for this generation.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Original baseline */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        0
                      </span>
                    </div>
                    <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Original Generation
                        </span>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-sm font-bold ${getScoreColor(detail.qualityScore)}`}
                          >
                            Score: {detail.qualityScore}/100
                          </span>
                          <button
                            onClick={() => {
                              setSelectedRefinement(null);
                              setActiveTab("tests");
                            }}
                            className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                          >
                            View Tests
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(detail.createdAt)}
                      </p>
                    </div>
                  </div>

                  {detail.refinements.map((refinement, index) => (
                    <div key={refinement.id} className="flex items-start gap-4">
                      {/* Connector line */}
                      <div className="flex flex-col items-center">
                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 -mt-4 mb-0" />
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                            {refinement.stepNumber}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 -mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            Refinement #{refinement.stepNumber}
                          </span>
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-sm font-bold ${getScoreColor(refinement.qualityScore)}`}
                            >
                              Score: {refinement.qualityScore}/100
                            </span>
                            {index > 0 && (
                              <span
                                className={`text-xs ${
                                  refinement.qualityScore >
                                  detail.refinements[index - 1].qualityScore
                                    ? "text-green-600 dark:text-green-400"
                                    : refinement.qualityScore <
                                        detail.refinements[index - 1]
                                          .qualityScore
                                      ? "text-red-600 dark:text-red-400"
                                      : "text-gray-500 dark:text-gray-400"
                                }`}
                              >
                                {refinement.qualityScore >
                                detail.refinements[index - 1].qualityScore
                                  ? "↑"
                                  : refinement.qualityScore <
                                      detail.refinements[index - 1].qualityScore
                                    ? "↓"
                                    : "→"}
                                {Math.abs(
                                  refinement.qualityScore -
                                    detail.refinements[index - 1].qualityScore,
                                )}
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setSelectedRefinement(refinement);
                                setActiveTab("tests");
                              }}
                              className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                            >
                              View Tests
                            </button>
                          </div>
                        </div>
                        {refinement.feedback && (
                          <div className="mb-3">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                              Feedback
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-600">
                              {refinement.feedback}
                            </p>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(refinement.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <Link
            href="/history"
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to History
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            New Generation
          </Link>
        </div>
      </div>
    </div>
  );
}
