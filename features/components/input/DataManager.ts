export default class DataManager {
    dataSources:Map<string, any>
    constructor() {
        this.dataSources = new Map();
    }
    register(id:string, get:any, set:any, validate?:any) {
        console.log("registering", id);
        this.dataSources.set(id, {get, set, validate});
    }

    set(id:string, val) {
        this.dataSources.get(id)?.set(val);
    }

    get(id:string) {
        return this.dataSources.get(id)?.get() || null;
    }
    validateHasError():boolean {
        for (const [id, {validate}] of this.dataSources.entries()) {
            console.log("checking", id)
            if (validate) {
                console.log("validating", id);
                const result = validate();
                console.log("validated", id, result);
                if (result) {
                    return true;
                }
            }
        }
        return false;
    }

    getAll() {
        let o:any = {};
        this.dataSources.forEach(({get}, key) => o[key] = get());
        return o;
    }

    pop() {
        const result = this.getAll();
        this.dataSources.clear();
        return result;
    }
}