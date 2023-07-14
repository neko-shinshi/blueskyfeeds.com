const {basicAnimalTypes, basicAnimalTypesJp} = require("./constants");

const localizeAnimalType = (animal, locale) => {
    switch (locale) {
        case "en":  return animal;
        case "jp":  return basicAnimalTypesJp[basicAnimalTypes.indexOf(animal)];
    }
}

const getLocalAnimeTitle = (animeObj, locale="en") => {
    if (!animeObj) {
        return "";
    }
    if (animeObj.names && animeObj.names[locale] && animeObj.names[locale].length > 0) {
        return animeObj.names[locale][0];
    }

    const titleObj = animeObj.title;

    switch (locale) {
        case "en":  return titleObj.english || titleObj.romaji || titleObj.native;
        case "jp":  return titleObj.native || titleObj.romaji || titleObj.english;
    }
}


const getAnimalNamesAndTitle = (animalData, titleObj, locale) => {
    const animals = getAnimalNamesFromAnime(animalData, locale);
    const title = getLocalAnimeTitle(titleObj, locale);
    switch (locale) {
        case "en":  return `${animals} from ${title}`;
        case "jp":  return `『${title}』の${animals}`;
    }
}

const getAnimalNames = (animal) => {
    return [...new Set([...(animal.names.en || []), ...(animal.names.jp || [])])];
}
const getAnimalTags = (animal) => {
    return [...new Set([...(animal.tags.en || []), ...(animal.tags.jp || [])])];
}
const getSceneTags = (scene) => {
    return [...new Set([...(scene.tags.en || []), ...(scene.tags.jp || [])])];
}


const getAnimalNamesFromAnime = (animalsArray, locale="en") => {
    const countNames = new Map();
    let names = animalsArray.map(x => x.names && x.names.en && x.names.en[0] || localizeAnimalType(x.type, locale));
    names.forEach(x => {
        countNames.set(x, 1 + (countNames.get(x) || 0));
    });
    names = [...new Set(names)].map(x => {
        if (countNames.get(x) > 1) {
            switch (locale) {
                case "en":  return `${x}s`;
                case "jp": return `${x}たち`;
            }
        }
        return x;
    });

    switch (locale) {
        case "en":  return names.join(", ");
        case "jp": return names.join("と");
    }
}

const getTimestampFromScene = (sceneData) => {
    return `${sceneData.ts.hh === "00"? "" : `${sceneData.ts.hh}:`}${sceneData.ts.mm}:${sceneData.ts.ss}`;
}

module.exports = {
    localizeAnimalType, getLocalAnimeTitle,  getAnimalNamesAndTitle, getAnimalNamesFromAnime, getTimestampFromScene, getAnimalNames, getAnimalTags, getSceneTags
}