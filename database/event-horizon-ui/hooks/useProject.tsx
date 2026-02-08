"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProjectContextType {
    currentProject: any;
    setCurrentProject: (project: any) => void;
    projects: any[];
    setProjects: (projects: any[]) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [currentProject, setCurrentProject] = useState<any>(null);
    const [projects, setProjects] = useState<any[]>([]);

    return (
        <ProjectContext.Provider value={{ currentProject, setCurrentProject, projects, setProjects }}>
            {children}
        </ProjectContext.Provider>
    );
}

export function useProject() {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider');
    }

    const getProjectApiParams = () => {
        if (!context.currentProject?.id) {
            throw new Error('No project selected');
        }
        return `projectId=${context.currentProject.id}`;
    };

    return { ...context, getProjectApiParams };
}
