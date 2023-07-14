import {globalPost} from "features/network/network";

const RECAPTCHA_URL = "https://www.google.com/recaptcha/api/siteverify";
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

export const failRecaptcha = async (req, res) => {
    if (!(await testRecaptcha(req.body.captcha))) {
        res.status(400).send({msg: "Captcha failed"});
        return true;
    }
    return false;
}

export const testRecaptcha = async (captcha) => {
    const response = await globalPost(`${RECAPTCHA_URL}?secret=${RECAPTCHA_SECRET_KEY}&response=${captcha}`, null, null);
    if (!response.data || !response.data.success) {
        console.log("captcha failed");
        return false;
    }
    return true;
}