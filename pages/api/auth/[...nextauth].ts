import NextAuth, {NextAuthOptions, Session, User} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {makeCustomException} from "features/error/customException";
import {connectToDatabase} from "features/utils/dbUtils";
import {APP_PASSWORD} from "features/auth/authUtils";
import {timeAfter} from "features/utils/timeUtils";
import {testRecaptcha} from "features/utils/recaptchaUtils";
import {getAgent} from "features/utils/bsky";

const DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === "1";

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60 // 7 days
    },
    events: {
        async signOut({ token }) {
            /*
            const key = (token as any).sk?.key;
            if (key) {
                const db = await connectToDatabase();
                db.sessions.deleteOne({key});
             //   console.log(`SIGNED OUT ${token.id}`);
            }
            */
        },
    },
    pages: {
        signIn: '/my-feeds',
    },

    providers: [
        CredentialsProvider({
            name: APP_PASSWORD,
            type: "credentials",
            id: APP_PASSWORD,
            credentials: {},
            async authorize(credentials) {
                const { service, usernameOrEmail, password, captcha } = credentials as {
                    service: string
                    usernameOrEmail: string
                    password:string
                    captcha:string
                };


                // Using same window strategy as applyRateLimit
                // Window of 1 minute
                // Maximum of 10 attempts
                // Add delay after 5 attempts
                if (!global.logins) {
                    global.logins = new Map();
                }
                let sameRequest:Array<Date> = global.logins.get(usernameOrEmail) || [];
                const now = new Date();
                // Move window
                sameRequest = sameRequest.filter(x => x > now);
                const totalRequests = sameRequest.length;

                // Update window
                sameRequest.push(timeAfter(60 * 1000));
                global.logins.set(usernameOrEmail, sameRequest);

                // Reject if > 10 requests
                if (totalRequests >= 10) {
                    throw makeCustomException('429', {code: 429});
                }

                // Add artificial delay
                if (totalRequests >= 3) {
                    await new Promise(r => setTimeout(r, 500 + 300 * (totalRequests-3)));
                }

                if (!(await testRecaptcha(captcha))) {
                    throw makeCustomException('400', {code: 400});
                }

                const agent = await getAgent(service, usernameOrEmail, password);
                if (!agent) {
                    throw makeCustomException('401', {code: 400});
                }

                const {did, handle, refreshJwt, accessJwt, email} = agent.session;
                const user = await agent.getProfile({actor:did});
                const {success, data} = user;
                if (!success) {
                    throw makeCustomException('400', {code: 400});
                }
                const {displayName, avatar} = data;

                return { id:did, name:displayName||"", image:avatar||"", service, handle, refreshJwt, accessJwt, email:email || ""} as unknown as User;
            }
        }),
    ],
    callbacks: {
        async jwt({user, account, token}) {
            // Transfer data from user to token
            if (user && account) { // Initial Login
                const {
                    providerAccountId, provider: p, access_token, expires_at,
                    refresh_token // Twitter, Google
                } = account;
                if (p == APP_PASSWORD) {
                    // Use from login to skip database access
                    const {id, service, handle, refreshJwt, accessJwt, email} = user;
                    token = {...token, id, service, handle, refreshJwt, accessJwt, email};
                }
            }
            return token;
        },
        async session({session, token, user}) {
            // Transfer data from token to session
            const {id, service, handle, refreshJwt, accessJwt, email} = token;
            return {...session, user: {...session.user, id, service, handle, refreshJwt, accessJwt, email}} as Session;
        },

    },
};

export default NextAuth(authOptions);