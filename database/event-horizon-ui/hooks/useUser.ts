import { useState, useEffect } from 'react';

export interface UserProfile {
    id: number;
    email: string;
    name: string;
    identity_id: string;
}

export function useUser() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchUser() {
            try {
                const res = await fetch('/api/auth/verify');
                if (res.ok) {
                    const data = await res.json();
                    if (data.authorized && data.user) {
                        setUser({
                            ...data.user,
                            identity_id: data.user.identity_id || ''
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to fetch user:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchUser();
    }, []);

    return { user, loading };
}
