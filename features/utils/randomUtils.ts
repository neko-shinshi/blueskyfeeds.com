import { v4 as uuidv4 } from 'uuid';

export const randomUuid = () => {
    return uuidv4().toString().replace(/-/g,"");
}
