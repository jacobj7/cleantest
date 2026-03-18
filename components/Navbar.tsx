"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname === path
      ? "text-indigo-600 font-semibold border-b-2 border-indigo-600"
      : "text-gray-600 hover:text-indigo-600 transition-colors duration-200";

  return (
    <nav className="w-full bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <svg
                className="w-8 h-8 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span className="text-xl font-bold text-gray-900">
                AI<span className="text-indigo-600">Gen</span>
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden sm:flex items-center space-x-8">
            <Link
              href="/generate"
              className={`text-sm pb-1 ${isActive("/generate")}`}
            >
              Generate
            </Link>
            <Link
              href="/history"
              className={`text-sm pb-1 ${isActive("/history")}`}
            >
              History
            </Link>
          </div>

          {/* Auth Button */}
          <div className="flex items-center space-x-4">
            {status === "loading" ? (
              <div className="w-20 h-8 bg-gray-200 animate-pulse rounded-md" />
            ) : session ? (
              <div className="flex items-center space-x-3">
                {session.user?.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? "User avatar"}
                    className="w-8 h-8 rounded-full object-cover border border-gray-200"
                  />
                )}
                <span className="hidden sm:block text-sm text-gray-700 font-medium">
                  {session.user?.name ?? session.user?.email}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-sm px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors duration-200 font-medium"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn()}
                className="text-sm px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-200 font-medium shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="sm:hidden flex items-center">
            <details className="relative">
              <summary className="list-none cursor-pointer p-2 rounded-md hover:bg-gray-100">
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </summary>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                <Link
                  href="/generate"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Generate
                </Link>
                <Link
                  href="/history"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  History
                </Link>
              </div>
            </details>
          </div>
        </div>
      </div>
    </nav>
  );
}
