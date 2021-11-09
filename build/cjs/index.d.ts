import { ABI, DecodedMethod, DecodedMethodParam, LogItem } from './types';
export declare class AbiDecoder {
    private abiCoder;
    private state;
    constructor();
    getABIs(): ABI.Item[];
    addABI(abiArray: ABI.Item[]): void;
    removeABI(abiArray: ABI.Item[]): void;
    getMethodIDs(): {
        [signature: string]: ABI.Item;
    };
    decodeMethod(inputData: string, outputData?: string): DecodedMethod | undefined;
    decodeLog(log: LogItem): {
        name: string | undefined;
        params: DecodedMethodParam[];
        address: string;
    } | undefined;
    decodeLogs(logs: LogItem[]): ({
        name: string | undefined;
        params: DecodedMethodParam[];
        address: string;
    } | undefined)[];
    _typeToString(input: ABI.Input): string;
    _formatReturnData(types: ABI.Input[] | ABI.Output[], decoded: any): {
        name: string;
        value: string;
        type: string;
    }[];
}
