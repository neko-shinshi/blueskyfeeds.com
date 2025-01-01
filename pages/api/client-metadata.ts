import {clientMetadata} from "features/utils/bsky-oauth";

export default async function handler (req, res) {
    return new Promise(async resolve => {
        res.status(200).json(clientMetadata);
    });
}