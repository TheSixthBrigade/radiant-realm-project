"use client";

import { Loader2 } from "lucide-react";

export default function RootPage() {
    // The redirection logic is now handled in EnterpriseLayout to ensure correct Org/Project context.
    return (
        <div className="h-screen w-full bg-[#0d0d0d] flex items-center justify-center">
            <Loader2 className="animate-spin text-[#3ecf8e]" size={32} />
        </div>
    );
}
