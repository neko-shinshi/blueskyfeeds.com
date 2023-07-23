import {getServerSession} from "next-auth";
import {authOptions} from "pages/api/auth/[...nextauth]";
import {removeUndefined} from "features/utils/validationUtils";
import {getToken} from "next-auth/jwt";
import {rebuildAgentFromToken} from "features/utils/bsky";
import {connectToDatabase} from "features/utils/dbUtils";


const getSessionData = (req, res) => {
    let session = getServerSession(req, res, authOptions);
    return session? removeUndefined(session) : null;
}



export const getLoggedInData = async (req, res) => {
    const db = await connectToDatabase();
    if (!db) { return { redirect: { destination: '/500', permanent: false } } }
    let updateSession = false, agent = null;
    const [token, session] = await Promise.all([
        getToken({ req }),
        getSessionData(req, res)
    ]);

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