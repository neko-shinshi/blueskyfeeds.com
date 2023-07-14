import "next-auth";

declare module "next-auth" {
    interface User {
        name: string
        avatar: string

        // Used to resume AtpSessionData
        service: string
        id: string // rename to did when using
        refreshJwt: string
        accessJwt: string
        handle: string
        email?: string
    }

    interface Session {
        user: User;
        error?: string
    }
}