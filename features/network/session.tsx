import {getServerSession} from "next-auth";
import {authOptions} from "pages/api/auth/[...nextauth]";
import {removeUndefined} from "features/utils/validationUtils";
import {getToken} from "next-auth/jwt";
import {rebuildAgentFromToken} from "features/utils/bsky";
import {connectToDatabase} from "features/utils/dbUtils";
import {getDbClient} from "features/utils/db";


const getSessionData = (req, res) => {
    let session = getServerSession(req, res, authOptions);
    return session? removeUndefined(session) : null;
}



export const getLoggedInData = async (req, res) => {
    const db = await connectToDatabase();
    if (!db) { return { redirect: { destination: '/500', permanent: false } } }
    let updateSession = false, agent = null;
    let [token, session] = await Promise.all([
        getToken({ req }),
        getSessionData(req, res)
    ]);

    session = removeUndefined(session);

    if (token) {
        agent = await rebuildAgentFromToken(token);
        if (!agent) {
            return {redirect: {destination: '/signout', permanent: false}};
        }
        if (agent.session.accessJwt !== token.accessJwt) {
            const {id: _id, service, sub: did, refreshJwt, accessJwt} = token;
            await db.sessions.updateOne({_id}, {$set: {service, did, refreshJwt, accessJwt}}); // Update user token info on the server
            updateSession = true;
        }
    }
    return {session, updateSession, agent, db, token};
}



export async function getLoggedInInfo (req, res) {
    try {
        const {db, helpers} = await getDbClient();
        let updateSession = false, privateAgent = null;
        let [token, session] = await Promise.all([
            getToken({ req }),
            getSessionData(req, res)
        ]);

        session = removeUndefined(session);

        if (token) {
            privateAgent = await rebuildAgentFromToken(token);
            if (!privateAgent) {
                return {redirect: {destination: '/signout', permanent: false}};
            }
            if (privateAgent.session.accessJwt !== token.accessJwt) {
                const cs = new helpers.ColumnSet(['id', 'service', 'did', 'refresh_jwt', 'access_jwt'], { table: 'user_sessions' })
                const {id, service, sub: did, refreshJwt:refresh_jwt, accessJwt:access_jwt} = token;
                await db.none(helpers.insert({id, service, did, refresh_jwt, access_jwt}, cs)+ " ON CONFLICT (id) DO UPDATE SET "+cs.assignColumns({from:"EXCLUDED", skip:['id']}));
                updateSession = true;
            }
        }
        return {session, updateSession, privateAgent, db:{db, helpers}, token};
    } catch (e) {
        console.error(e);
        return { redirect: { destination: '/500', permanent: false } }
    }
}