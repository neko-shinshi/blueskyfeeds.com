import {getServerSession} from "next-auth";
import {authOptions} from "pages/api/auth/[...nextauth]";
import {removeUndefined} from "features/utils/validationUtils";

export const getSessionData = (req, res) => {
    let session = getServerSession(req, res, authOptions);
    return session? removeUndefined(session) : null;
}