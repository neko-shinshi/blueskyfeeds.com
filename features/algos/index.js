const rarePosters = require('./rare-posters');
const gordonRamses = require('./gordon-ramses');

module.exports =  {
    [rarePosters.id]: {
        handler: rarePosters.handler,
    },
    [gordonRamses.id]: {
        handler: gordonRamses.handler,
        generate: gordonRamses.generate
    },
};