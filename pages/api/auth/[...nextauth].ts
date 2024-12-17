import NextAuth, {NextAuthOptions, Session, User} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {makeCustomException} from "features/error/customException";
import {APP_PASSWORD, APP_SESSION} from "features/auth/authUtils";
import {secondsAfter} from "features/utils/timeUtils";
import {testRecaptcha} from "features/utils/recaptchaUtils";
import {getAgent} from "features/utils/bsky";
import {randomUuid} from "features/utils/randomUtils";
import {rebuildAgentFromToken} from "features/utils/bsky";
import {getDbClient} from "features/utils/db";
import {AtpAgent} from "@atproto/api";
import {IDatabase, IHelpers} from "pg-promise";
import {dateAsTimestamp} from "features/utils/types";

const MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

const getUserFromAgent = async (agent:AtpAgent, db:IDatabase<any>, helpers:IHelpers, service:string, oldKey="") => {
    if (!agent) {console.log("no agent");throw makeCustomException('401', {code: 400});}
    const {did, handle, refreshJwt, accessJwt, email} = agent.session;
    const {success, data} = await agent.getProfile({actor:did});

    if (!success) {throw makeCustomException('400', {code: 400});}
    const sk = randomUuid();
    let commands:any = [{query:"INSERT INTO user_sessions (id, did, ts) VALUES ($1, $2, $3)", values:[sk, did, dateAsTimestamp(new Date())]}];
    if (oldKey !== "") {
        commands.push({query:"DELETE FROM user_sessions WHERE id = $1", values:[oldKey]});
    }

    await db.none(helpers.concat(commands));

    const {displayName, avatar} = data;
    return { id:did, name:displayName||"", image:avatar||"", service, handle, refreshJwt, accessJwt, email:email || "", sk} as unknown as User;
}

export const authOptions: NextAuthOptions = {
    session: {
        strategy: "jwt",
        maxAge: MAX_AGE_SECONDS
    },
    events: {
        async signOut({ token }) {
            const {id} = token;
            if (id) {
                const {db} = await getDbClient();
                await db.none("DELETE FROM user_sessions WHERE id = $1", [id]);
            }
        },
    },
    pages: {
        signIn: '/my-feeds',
    },

    providers: [
        CredentialsProvider({
            name: APP_SESSION,
            type: "credentials",
            id: APP_SESSION,
            credentials: {},
            async authorize(credentials) {
                const { id } = credentials as { id: string };
                const {db, helpers} = await getDbClient();
                if (!db) {console.log("authorize 500");throw makeCustomException('500', {code: 500});}
                const rollover = await db.one("SELECT EXISTS(SELECT 1 FROM user_sessions WHERE id = $1)", [id]);
                if (!rollover) {console.log("authorize 401");throw makeCustomException('401', {code: 401});}
                const {service} = rollover;
                const agent = await rebuildAgentFromToken(rollover);
                if (!agent) {
                    console.log("no agent");
                    await db.none("DELETE FROM user_sessions WHERE id = $1", [id]);
                    throw makeCustomException('401', {code: 400});
                }
                const user = await getUserFromAgent(agent, db, helpers, service, id);
                return user;
            }
        }),
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
                sameRequest.push(secondsAfter(60 * 1000));
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

                const {db, helpers} = await getDbClient();
                if (!db) {console.log("authorize 500");throw makeCustomException('500', {code: 500});}

                const agent = await getAgent(service, usernameOrEmail, password);
                if (!agent) {console.log("no agent");throw makeCustomException('401', {code: 400});}
                const r = await getUserFromAgent(agent, db, helpers, service);
                return r;
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
                if (p == APP_PASSWORD || p === APP_SESSION) {
                    // Use from login to skip database access
                    const {service, handle, refreshJwt, accessJwt, email, sk, id:did} = user;
                    token = {...token, id:sk, service, handle, refreshJwt, accessJwt, email, did};
                }
            }
            return token;
        },
        async session({session, token, user}) {
            // Transfer data from token to session
            const {id:sk, handle, did} = token;
            const ss = {...session, user: {...session.user, sk, handle, did}} as Session;
            return ss;
        },

    },
};

export default NextAuth(authOptions);