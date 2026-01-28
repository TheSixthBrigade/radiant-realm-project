export const AUTH_CONFIG = {
    providers: [
        {
            id: "google",
            name: "Google",
            icon: "google",
            description: "Sign in with your organizational Google account"
        },
        {
            id: "sso",
            name: "Enterprise SSO",
            icon: "shield",
            description: "Use your corporate identity provider (SAML/OIDC)"
        }
    ],
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }
};
