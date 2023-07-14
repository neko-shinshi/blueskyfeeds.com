export const splitByNonAlpha = (txt) => {
    return txt.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ]/);
}

export const splitByNonAlphaDash = (txt) => {
    return txt.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ-]/);
}

export const splitByNonAlphaNumeric = (txt) => {
    return txt.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9]/);
}

export const splitByNonAlphaNumericDash = (txt) => {
    return txt.split(/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9-]/);
}