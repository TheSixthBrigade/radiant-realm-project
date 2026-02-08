import { useState, useEffect } from 'react';

export interface UserProfile {
    id: number;
    email: string;
    name: string;
    identity_id: string;
    isLatticeAdmin?: boolean;
}

export function useUser(options?: { skip?: boolean }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(!options?.skip);

    useEffect(() => {
        if (options?.skip) return;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        async function fetchUser() {
            try {
                const res = await fetch('/api/auth/verify', { signal: controller.signal });
                if (res.ok) {
                    const data = await res.json();
                    if (data.authorized && data.user) {
                        setUser({
                            id: data.user.id || 0,
                            email: data.user.email || '',
                            name: data.user.name || '',
                            identity_id: data.user.identity_id || '',
                            isLatticeAdmin: data.isLatticeAdmin || false
                        });
                    }
                }
            } catch (error) {
                // AbortError or network error — user stays null
                if ((error as Error).name !== 'AbortError') {
                    console.error("Failed to fetch user:", error);
                }
            } finally {
                clearTimeout(timeoutId);
                setLoading(false);
            }
        }

        fetchUser();
        return () => { clearTimeout(timeoutId); controller.abort(); };
    }, [options?.skip]);

    return { user, loading };
}
