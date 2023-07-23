import NextAuth, {NextAuthOptions, Session, User} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {makeCustomException} from "features/error/customException";
import {APP_PASSWORD, APP_SESSION} from "features/auth/authUtils";
import {secondsAfter} from "features/utils/timeUtils";
import {testRecaptcha} from "features/utils/recaptchaUtils";
import {getAgent} from "features/utils/bsky";
import {connectToDatabase} from "features/utils/dbUtils";
import {randomUuid} from "features/utils/randomUtils";
import {rebuildAgentFromToken} from "features/utils/bsky";

const MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

const getUserFromAgent = async (agent, db, service, oldKey="") => {
    if (!agent) {console.log("no agent");throw makeCustomException('401', {code: 400});}

    const {did, handle, refreshJwt, accessJwt, email} = agent.session;
    const {success, data} = await agent.getProfile({actor:did});
    if (!success) {throw makeCustomException('400', {code: 400});}
    const sk = randomUuid();
    let commands:any = [{insertOne: {_id: sk, did, expireAt: secondsAfter(MAX_AGE_SECONDS)}}]; // Expire same time as token
    if (oldKey !== "") {
        commands.push({ deleteOne : {filter: {_id: oldKey}} });
    }
    await db.sessions.bulkWrite(commands);
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
            const {id:_id} = token;
            if (_id) {
                const db = await connectToDatabase();
                await db.sessions.deleteOne({_id});
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
                const { id:_id } = credentials as { id: string };
                console.log("rollover", _id);
                const db = await connectToDatabase();
                console.log("has db");
                if (!db) {console.log("authorize 500");throw makeCustomException('500', {code: 500});}
                const rollover = await db.sessions.findOne({_id});
                console.log("found", rollover);
                if (!rollover) {console.log("authorize 401");throw makeCustomException('401', {code: 401});}
                const {service} = rollover;
                console.log("before login");
                const agent = await rebuildAgentFromToken(rollover);
                if (!agent) {
                    console.log("no agent");
                    await db.sessions.deleteOne({_id});
                    throw makeCustomException('401', {code: 400});
                }
                const user = await getUserFromAgent(agent, db, service, _id);
                console.log("user", user);
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
                console.log('start login', credentials);

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
                console.log("pre check")
                // Reject if > 10 requests
                if (totalRequests >= 10) {
                    console.log("1")
                    throw makeCustomException('429', {code: 429});
                }

                // Add artificial delay
                if (totalRequests >= 3) {
                    console.log(2);
                    await new Promise(r => setTimeout(r, 500 + 300 * (totalRequests-3)));
                }

                console.log("clear")

                if (!(await testRecaptcha(captcha))) {
                    throw makeCustomException('400', {code: 400});
                }

                console.log("get db")
                const db = await connectToDatabase();
                if (!db) {console.log("authorize 500");throw makeCustomException('500', {code: 500});}

                const agent = await getAgent(service, usernameOrEmail, password);
                if (!agent) {console.log("no agent");throw makeCustomException('401', {code: 400});}

                const r = await getUserFromAgent(agent, db, service);
                console.log(r);
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
                    const {service, handle, refreshJwt, accessJwt, email, sk} = user;
                    token = {...token, id:sk, service, handle, refreshJwt, accessJwt, email};
                    console.log("create token", token);
                }
            }
            return token;
        },
        async session({session, token, user}) {
            // Transfer data from token to session
            const {id:sk, handle} = token;
            const ss = {...session, user: {...session.user, sk, handle}} as Session;
            console.log("update session", ss);
            return ss;
        },

    },
};

export default NextAuth(authOptions);