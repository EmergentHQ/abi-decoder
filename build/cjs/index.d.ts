import { DecodedMethod, DecodedMethodParam } from './types';
import { Log } from 'web3-core';
import { AbiItem, AbiInput, AbiOutput } from 'web3-utils';
export declare class AbiDecoder {
    private state;
    constructor();
    getABIs(): AbiItem[];
    addABI(abiArray: AbiItem[]): void;
    removeABI(abiArray: AbiItem[]): void;
    getMethodIDs(): {
        [signature: string]: AbiItem;
    };
    decodeMethod(inputData: string, outputData?: string): DecodedMethod | undefined;
    decodeLog(log: Log): {
        name: string | undefined;
        params: DecodedMethodParam[];
        address: string;
    } | undefined;
    decodeLogs(logs: Log[]): ({
        name: string | undefined;
        params: DecodedMethodParam[];
        address: string;
    } | undefined)[];
    _typeToString(input: AbiInput): string;
    _formatReturnData(types: AbiInput[] | AbiOutput[], decoded: any): {
        name: string;
        value: string;
        type: string;
    }[];
}
