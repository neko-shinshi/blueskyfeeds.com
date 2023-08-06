import * as rarePosters from './rare-posters';
import * as gordonRamses from './gordon-ramses';

export const algos = {
    [rarePosters.id]:  rarePosters.handler,
    [gordonRamses.id]: gordonRamses.handler,
}