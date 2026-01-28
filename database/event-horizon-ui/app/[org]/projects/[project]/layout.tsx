"use client";

import { useEffect, useState } from "react";
import { useProject } from "@/hooks/useProject";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
    const { setCurrentProject, projects } = useProject();
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!params || !params.project || projects.length === 0) {
            // Wait for projects to load from RootLayout
            if (projects.length > 0) setLoading(false);
            return;
        }

        const projectSlug = params.project as string;
        const project = projects.find(p => p.slug === projectSlug);

        if (project) {
            setCurrentProject(project);
            setLoading(false);
        } else if (projects.length > 0) {
            // Project not found in loaded projects, maybe redirect to 404 or projects list
            console.error("Project not found:", projectSlug);
            router.push('/projects');
        }
    }, [params?.project, projects]);

    if (loading) {
        return (
            <div className="h-full w-full bg-[#0d0d0d] flex items-center justify-center">
                <Loader2 className="animate-spin text-[#3ecf8e]" size={32} />
            </div>
        );
    }

    return <>{children}</>;
}
