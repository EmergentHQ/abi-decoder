export declare namespace ABI {
    type Type = "function" | "constructor" | "event" | "fallback";
    type StateMutabilityType = "pure" | "view" | "nonpayable" | "payable";
    interface Item {
        type: Type;
        anonymous?: boolean;
        constant?: boolean;
        gas?: number;
        inputs?: Input[];
        name?: string;
        outputs?: Output[];
        payable?: boolean;
        stateMutability?: StateMutabilityType;
    }
    interface Input {
        name: string;
        type: string;
        indexed?: boolean;
        components?: Input[];
        internalType?: string;
    }
    interface Output {
        name: string;
        type: string;
        components?: Output[];
        internalType?: string;
    }
}
export interface DecodedMethod {
    name: string;
    params: DecodedMethodParam[];
    outputs?: DecodedMethodParam[];
}
export interface DecodedMethodParam {
    name: string;
    type: string;
    value?: any;
}
export interface LogItem {
    transactionIndex: string;
    logIndex: string;
    blockNumber: string;
    transactionHash: string;
    blockHash: string;
    data: string;
    topics: string[];
    address: string;
}
