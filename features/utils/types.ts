import {as} from "pg-promise";

export type PGRawType = {rawType:true, toPostgres:() => string};
export const nullAsType = (type:string):PGRawType => ({
    rawType: true,
    toPostgres: () => as.format(`$1::${type}`, [null])
});

export const NULL_AS_TIMESTAMP:PGRawType = nullAsType("TIMESTAMP");

export const dateAsTimestamp = (date:Date):PGRawType => ({
    rawType: true,
    toPostgres: () => as.format('$1::TIMESTAMP', [date.toISOString()])
});

export type UserProfileView = {
    did:string,
    handle:string,
    displayName?: string,
    avatar?:string
}