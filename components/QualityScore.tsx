"use client";

import React from "react";

interface DimensionScore {
  label: string;
  score: number;
  maxScore: number;
  description?: string;
}

interface QualityScoreProps {
  overallScore: number;
  maxScore?: number;
  coverage?: number;
  correctness?: number;
  readability?: number;
  className?: string;
}

function getScoreColor(percentage: number): {
  badge: string;
  bar: string;
  text: string;
  label: string;
} {
  if (percentage >= 90) {
    return {
      badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
      bar: "bg-emerald-500",
      text: "text-emerald-700",
      label: "Excellent",
    };
  } else if (percentage >= 75) {
    return {
      badge: "bg-blue-100 text-blue-800 border-blue-200",
      bar: "bg-blue-500",
      text: "text-blue-700",
      label: "Good",
    };
  } else if (percentage >= 60) {
    return {
      badge: "bg-yellow-100 text-yellow-800 border-yellow-200",
      bar: "bg-yellow-500",
      text: "text-yellow-700",
      label: "Fair",
    };
  } else if (percentage >= 40) {
    return {
      badge: "bg-orange-100 text-orange-800 border-orange-200",
      bar: "bg-orange-500",
      text: "text-orange-700",
      label: "Poor",
    };
  } else {
    return {
      badge: "bg-red-100 text-red-800 border-red-200",
      bar: "bg-red-500",
      text: "text-red-700",
      label: "Critical",
    };
  }
}

function ScoreBar({
  score,
  maxScore,
  colorClass,
}: {
  score: number;
  maxScore: number;
  colorClass: string;
}) {
  const percentage = Math.min(100, Math.max(0, (score / maxScore) * 100));

  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-500 ease-out ${colorClass}`}
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={maxScore}
      />
    </div>
  );
}

function DimensionRow({ dimension }: { dimension: DimensionScore }) {
  const percentage = Math.min(
    100,
    Math.max(0, (dimension.score / dimension.maxScore) * 100),
  );
  const colors = getScoreColor(percentage);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            {dimension.label}
          </span>
          {dimension.description && (
            <span className="text-xs text-gray-400 hidden sm:inline">
              — {dimension.description}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold ${colors.text}`}>
            {dimension.score.toFixed(1)}
          </span>
          <span className="text-xs text-gray-400">/ {dimension.maxScore}</span>
        </div>
      </div>
      <ScoreBar
        score={dimension.score}
        maxScore={dimension.maxScore}
        colorClass={colors.bar}
      />
    </div>
  );
}

export default function QualityScore({
  overallScore,
  maxScore = 100,
  coverage,
  correctness,
  readability,
  className = "",
}: QualityScoreProps) {
  const overallPercentage = Math.min(
    100,
    Math.max(0, (overallScore / maxScore) * 100),
  );
  const overallColors = getScoreColor(overallPercentage);

  const dimensions: DimensionScore[] = [];

  if (coverage !== undefined) {
    dimensions.push({
      label: "Coverage",
      score: coverage,
      maxScore: 100,
      description: "Breadth and depth of content",
    });
  }

  if (correctness !== undefined) {
    dimensions.push({
      label: "Correctness",
      score: correctness,
      maxScore: 100,
      description: "Accuracy and factual integrity",
    });
  }

  if (readability !== undefined) {
    dimensions.push({
      label: "Readability",
      score: readability,
      maxScore: 100,
      description: "Clarity and ease of understanding",
    });
  }

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          Quality Score
        </h3>
      </div>

      {/* Overall Score */}
      <div className="px-6 py-5 flex items-center gap-5 border-b border-gray-100">
        {/* Circular Score Display */}
        <div className="relative flex-shrink-0">
          <svg
            className="w-20 h-20 -rotate-90"
            viewBox="0 0 80 80"
            aria-hidden="true"
          >
            {/* Background circle */}
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            {/* Score arc */}
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 34}`}
              strokeDashoffset={`${2 * Math.PI * 34 * (1 - overallPercentage / 100)}`}
              className={
                overallPercentage >= 90
                  ? "text-emerald-500"
                  : overallPercentage >= 75
                    ? "text-blue-500"
                    : overallPercentage >= 60
                      ? "text-yellow-500"
                      : overallPercentage >= 40
                        ? "text-orange-500"
                        : "text-red-500"
              }
              style={{ transition: "stroke-dashoffset 0.6s ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`text-xl font-bold leading-none ${overallColors.text}`}
            >
              {Math.round(overallPercentage)}
            </span>
            <span className="text-xs text-gray-400 leading-none mt-0.5">
              / 100
            </span>
          </div>
        </div>

        {/* Score Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${overallColors.badge}`}
            >
              {overallColors.label}
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {overallScore.toFixed(1)}
            <span className="text-sm font-normal text-gray-400 ml-1">
              / {maxScore}
            </span>
          </p>
          <div className="mt-2">
            <ScoreBar
              score={overallScore}
              maxScore={maxScore}
              colorClass={overallColors.bar}
            />
          </div>
        </div>
      </div>

      {/* Dimension Breakdown */}
      {dimensions.length > 0 && (
        <div className="px-6 py-5 space-y-4">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Breakdown
          </h4>
          <div className="space-y-4">
            {dimensions.map((dimension) => (
              <DimensionRow key={dimension.label} dimension={dimension} />
            ))}
          </div>
        </div>
      )}

      {/* Footer hint when no dimensions */}
      {dimensions.length === 0 && (
        <div className="px-6 py-4">
          <p className="text-xs text-gray-400 text-center">
            No dimension breakdown available
          </p>
        </div>
      )}
    </div>
  );
}
