"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import LanguageSelector from "@/components/LanguageSelector";
import CodeEditor from "@/components/CodeEditor";
import QualityScore from "@/components/QualityScore";

interface GenerationResult {
  code: string;
  language: string;
  framework: string;
  qualityScore: {
    overall: number;
    maintainability: number;
    performance: number;
    security: number;
    readability: number;
  };
  suggestions: string[];
}

export default function GeneratePage() {
  const router = useRouter();
  const [sourceCode, setSourceCode] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [framework, setFramework] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refineInstructions, setRefineInstructions] = useState("");
  const [generationCount, setGenerationCount] = useState(0);

  const handleGenerate = useCallback(async () => {
    if (!sourceCode.trim()) {
      setError("Please enter source code to generate from.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceCode,
          language: selectedLanguage,
          framework: framework.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Generation failed with status ${response.status}`,
        );
      }

      const data = await response.json();
      setResult(data);
      setGenerationCount((prev) => prev + 1);
      setRefineInstructions("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during generation.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, [sourceCode, selectedLanguage, framework]);

  const handleRefine = useCallback(async () => {
    if (!result) return;
    if (!refineInstructions.trim()) {
      setError("Please enter refinement instructions.");
      return;
    }

    setIsRefining(true);
    setError(null);

    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: result.code,
          language: result.language,
          framework: result.framework,
          instructions: refineInstructions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message ||
            `Refinement failed with status ${response.status}`,
        );
      }

      const data = await response.json();
      setResult(data);
      setGenerationCount((prev) => prev + 1);
      setRefineInstructions("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during refinement.",
      );
    } finally {
      setIsRefining(false);
    }
  }, [result, refineInstructions]);

  const handleCodeChange = useCallback(
    (newCode: string) => {
      if (result) {
        setResult((prev) => (prev ? { ...prev, code: newCode } : null));
      }
    },
    [result],
  );

  const handleCopyCode = useCallback(async () => {
    if (result?.code) {
      try {
        await navigator.clipboard.writeText(result.code);
      } catch {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = result.code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
    }
  }, [result]);

  const handleDownloadCode = useCallback(() => {
    if (result?.code) {
      const extensionMap: Record<string, string> = {
        javascript: "js",
        typescript: "ts",
        python: "py",
        java: "java",
        csharp: "cs",
        cpp: "cpp",
        go: "go",
        rust: "rs",
        php: "php",
        ruby: "rb",
        swift: "swift",
        kotlin: "kt",
      };
      const ext = extensionMap[result.language] || "txt";
      const blob = new Blob([result.code], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `generated-code.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [result]);

  const handleReset = useCallback(() => {
    setSourceCode("");
    setSelectedLanguage("javascript");
    setFramework("");
    setResult(null);
    setError(null);
    setRefineInstructions("");
    setGenerationCount(0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="text-gray-400 hover:text-gray-100 transition-colors"
              aria-label="Go back to home"
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-100">
              Code Generator
            </h1>
            {generationCount > 0 && (
              <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                {generationCount} generation{generationCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button
            onClick={handleReset}
            className="text-sm text-gray-400 hover:text-gray-100 transition-colors flex items-center gap-1.5"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Reset
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Left Panel - Input */}
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
              <h2 className="text-lg font-medium text-gray-100 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
                Source Code
              </h2>

              {/* Language Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Target Language
                </label>
                <LanguageSelector
                  value={selectedLanguage}
                  onChange={setSelectedLanguage}
                  disabled={isGenerating || isRefining}
                />
              </div>

              {/* Framework Input */}
              <div>
                <label
                  htmlFor="framework"
                  className="block text-sm font-medium text-gray-400 mb-2"
                >
                  Framework / Library{" "}
                  <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  id="framework"
                  type="text"
                  value={framework}
                  onChange={(e) => setFramework(e.target.value)}
                  placeholder="e.g. React, Express, Django, Spring..."
                  disabled={isGenerating || isRefining}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                />
              </div>

              {/* Source Code Textarea */}
              <div>
                <label
                  htmlFor="sourceCode"
                  className="block text-sm font-medium text-gray-400 mb-2"
                >
                  Paste your source code or describe what to generate
                </label>
                <textarea
                  id="sourceCode"
                  value={sourceCode}
                  onChange={(e) => setSourceCode(e.target.value)}
                  placeholder="// Paste your existing code here, or describe what you want to generate...
// Example:
// function calculateTotal(items) {
//   return items.reduce((sum, item) => sum + item.price, 0);
// }"
                  disabled={isGenerating || isRefining}
                  rows={16}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-mono resize-y"
                />
                <div className="mt-1.5 flex justify-between items-center">
                  <span className="text-xs text-gray-600">
                    {sourceCode.length} characters
                  </span>
                  {sourceCode.length > 0 && (
                    <button
                      onClick={() => setSourceCode("")}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
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
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || isRefining || !sourceCode.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
              >
                {isGenerating ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
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
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
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
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Generate Code
                  </>
                )}
              </button>
            </div>

            {/* Refine Controls - shown after generation */}
            {result && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-medium text-gray-100 flex items-center gap-2">
                  <svg
                    className="w-5 h-5 text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Refine Output
                </h2>
                <div>
                  <label
                    htmlFor="refineInstructions"
                    className="block text-sm font-medium text-gray-400 mb-2"
                  >
                    Refinement Instructions
                  </label>
                  <textarea
                    id="refineInstructions"
                    value={refineInstructions}
                    onChange={(e) => setRefineInstructions(e.target.value)}
                    placeholder="Describe how you want to improve the generated code...
e.g. Add error handling, optimize for performance, add TypeScript types..."
                    disabled={isGenerating || isRefining}
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm resize-y"
                  />
                </div>
                <button
                  onClick={handleRefine}
                  disabled={
                    isGenerating || isRefining || !refineInstructions.trim()
                  }
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/40 disabled:cursor-not-allowed text-white font-medium py-2.5 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                >
                  {isRefining ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
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
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Refining...
                    </>
                  ) : (
                    <>
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
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Refine Code
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Panel - Output */}
          <div className="space-y-6">
            {result ? (
              <>
                {/* Quality Score */}
                <QualityScore
                  overall={result.qualityScore.overall}
                  maintainability={result.qualityScore.maintainability}
                  performance={result.qualityScore.performance}
                  security={result.qualityScore.security}
                  readability={result.qualityScore.readability}
                  suggestions={result.suggestions}
                />

                {/* Code Editor Output */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                      <h2 className="text-sm font-medium text-gray-300">
                        Generated Code
                      </h2>
                      <span className="text-xs bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded">
                        {result.language}
                        {result.framework && ` · ${result.framework}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyCode}
                        className="text-xs text-gray-400 hover:text-gray-100 transition-colors flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-md"
                        title="Copy code"
                      >
                        <svg
                          className="w-3.5 h-3.5"
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
                      <button
                        onClick={handleDownloadCode}
                        className="text-xs text-gray-400 hover:text-gray-100 transition-colors flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-md"
                        title="Download code"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Download
                      </button>
                    </div>
                  </div>
                  <CodeEditor
                    code={result.code}
                    language={result.language}
                    onChange={handleCodeChange}
                    readOnly={isRefining}
                  />
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-indigo-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-300 mb-2">
                  No code generated yet
                </h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  Enter your source code on the left, select a target language
                  and optional framework, then click Generate Code.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-4 w-full max-w-xs">
                  {[
                    { label: "Languages", value: "12+" },
                    { label: "Frameworks", value: "∞" },
                    { label: "Quality Score", value: "AI" },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-gray-800/50 rounded-lg p-3 text-center"
                    >
                      <div className="text-lg font-semibold text-indigo-400">
                        {stat.value}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
