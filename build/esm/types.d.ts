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
