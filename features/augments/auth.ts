import "next-auth";

declare module "next-auth" {
    interface User {
        name: string
        avatar: string

        // Used to resume AtpSessionData
        service: string
        refreshJwt: string
        accessJwt: string
        handle: string
        sk: string
        did: string
        email?: string
    }

    interface Session {
        user: User;
        error?: string
    }
}