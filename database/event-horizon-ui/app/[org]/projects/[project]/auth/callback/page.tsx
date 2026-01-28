"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AuthCallback() {
    const router = useRouter();

    useEffect(() => {
        // In a real GoTrue flow, the URL will have #access_token or ?code
        // We simulate the session establishment and redirect home
        console.log("Processing Auth Callback...");

        const timeout = setTimeout(() => {
            router.push("/");
        }, 1500);

        return () => clearTimeout(timeout);
    }, [router]);

    return (
        <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center">
            <div className="text-center space-y-4">
                <Loader2 className="animate-spin text-[#3ecf8e] mx-auto" size={40} />
                <h2 className="text-lg font-bold text-white tracking-widest uppercase">Verifying Quantum Identity</h2>
                <p className="text-xs text-gray-500 font-mono italic">Establishing Dilithium-authenticated session...</p>
            </div>
        </div>
    );
}
