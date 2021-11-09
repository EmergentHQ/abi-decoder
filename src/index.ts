const abiCoder = require('web3-eth-abi')
import { sha3 } from 'web3-utils';
import BN from 'bn.js';
import { DecodedMethod, DecodedMethodParam } from './types';
import { Log } from 'web3-core';
import { AbiItem, AbiInput, AbiOutput } from 'web3-utils';

export class AbiDecoder {
  private state: {
    savedABIs: AbiItem[],
    methodIDs: { [signature: string]: AbiItem }
  };

  constructor() {
    this.state = {
      savedABIs: [],
      methodIDs: {},
    };
  }

  getABIs() {
    return this.state.savedABIs;
  }

  addABI(abiArray: AbiItem[]) {
    if (Array.isArray(abiArray)) {
      // Iterate new abi to generate method id"s
      abiArray.map((abi) => {
        if (abi.name) {
          const signature = sha3(
            abi.name +
              "(" +
              (abi.inputs || [])
                .map((input) => this._typeToString(input))
                .join(",") +
              ")"
          );
          if (signature) {
            if (abi.type === "event") {
              this.state.methodIDs[signature.slice(2)] = abi;
            } else {
              this.state.methodIDs[signature.slice(2, 10)] = abi;
            }
          }
        }
      });
  
      this.state.savedABIs = this.state.savedABIs.concat(abiArray);
    } else {
      throw new Error("Expected ABI array, got " + typeof abiArray);
    }
  }

  removeABI(abiArray: AbiItem[]) {
    if (Array.isArray(abiArray)) {
      // Iterate new abi to generate method id"s
      abiArray.map((abi) => {
        if (abi.name) {
          const signature = sha3(
            abi.name +
              "(" +
              (abi.inputs || [])
                .map((input) => {
                  return input.type;
                })
                .join(",") +
              ")"
          );
          if (signature) {
            if (abi.type === "event") {
              if (this.state.methodIDs[signature.slice(2)]) {
                delete this.state.methodIDs[signature.slice(2)];
              }
            } else {
              if (this.state.methodIDs[signature.slice(2, 10)]) {
                delete this.state.methodIDs[signature.slice(2, 10)];
              }
            }
          }
        }
      });
    } else {
      throw new Error("Expected ABI array, got " + typeof abiArray);
    }
  }

  getMethodIDs() {
    return this.state.methodIDs;
  }

  decodeMethod(inputData: string, outputData?: string): DecodedMethod | undefined {
    const methodID = inputData.slice(2, 10);
    const abiItem = this.state.methodIDs[methodID];
    if (abiItem) {
  
      if (!abiItem.name) {
        throw new Error("Missing abi item name.")
      }

      const retData: {
        name: string,
        params: DecodedMethodParam[],
        outputs?: DecodedMethodParam[]
      } = {
        name: abiItem.name,
        params: [],
      };
  
      retData.params = this._formatReturnData(abiItem.inputs || [], abiCoder.decodeParameters(abiItem.inputs || [], inputData.slice(10)));
  
      if (abiItem.outputs && outputData && outputData !== '0x') { // Add 0x check as a hack because some ERC20 tokens return a bool and some don't
        retData.outputs = this._formatReturnData(abiItem.outputs, abiCoder.decodeParameters(abiItem.outputs, outputData));
      }
  
      return retData;
    }
  }

  decodeLog(log: Log) {
    if (log.topics.length > 0) {
      const methodID = log.topics[0].slice(2);
      const method = this.state.methodIDs[methodID];
      if (method) {
        const logData = log.data;
        let decodedParams: DecodedMethodParam[] = [];
        let dataIndex = 0;
        let topicsIndex = 1;
  
        let dataTypes: string[] = [];
        (method.inputs || []).map((input) => {
          if (!input.indexed) {
            dataTypes.push(input.type);
          }
        });
  
        const decodedData = abiCoder.decodeParameters(
          dataTypes,
          logData.slice(2)
        );
  
        // Loop topic and data to get the params
        (method.inputs || []).map((param) => {
          let decodedP: {
            name: string,
            type: string,
            value?: any
          } = {
            name: param.name,
            type: param.type,
          };
  
          if (param.indexed) {
            decodedP.value = log.topics[topicsIndex];
            topicsIndex++;
          } else {
            decodedP.value = decodedData[dataIndex];
            dataIndex++;
          }
  
          if (param.type === "address") {
            decodedP.value = decodedP.value.toLowerCase();
            // 42 because len(0x) + 40
            if (decodedP.value.length > 42) {
              let toRemove = decodedP.value.length - 42;
              let temp = decodedP.value.split("");
              temp.splice(2, toRemove);
              decodedP.value = temp.join("");
            }
          }
  
          if (
            param.type === "uint256" ||
            param.type === "uint8" ||
            param.type === "int"
          ) {
            // ensure to remove leading 0x for hex numbers
            if (typeof decodedP.value === "string" && decodedP.value.startsWith("0x")) {
              decodedP.value = new BN(decodedP.value.slice(2), 16).toString(10);
            } else {
              decodedP.value = new BN(decodedP.value).toString(10);
            }
  
          }
  
          decodedParams.push(decodedP);
        });
  
        return {
          name: method.name,
          params: decodedParams,
          address: log.address,
        };
      }
    }
  }

  decodeLogs(logs: Log[]) {
    return logs.filter(log => log.topics.length > 0).map((log) => {
      return this.decodeLog(log);
    });
  }

  _typeToString(input: AbiInput): string {
    if (input.type === "tuple") {
      return "(" + (input.components || []).map((input) => this._typeToString(input)).join(",") + ")";
    }
    return input.type;
  }
  
  _formatReturnData(types: AbiInput[] | AbiOutput[], decoded: any) {
    const returnArray = [];
    for (let i = 0; i < decoded.__length__; i++) {
      let param = decoded[i];
      let parsedParam = param;
      const isUint = types[i].type.indexOf("uint") === 0;
      const isInt = types[i].type.indexOf("int") === 0;
      const isAddress = types[i].type.indexOf("address") === 0;
  
      if (isUint || isInt) {
        const isArray = Array.isArray(param);
  
        if (isArray) {
          parsedParam = param.map((val: string) => new BN(val).toString());
        } else {
          parsedParam = new BN(param).toString();
        }
      }
  
      // Addresses returned by web3 are randomly cased so we need to standardize and lowercase all
      if (isAddress) {
        const isArray = Array.isArray(param);
  
        if (isArray) {
          parsedParam = param.map((address: string) => address.toLowerCase());
        } else {
          parsedParam = param.toLowerCase();
        }
      }
  
      returnArray.push({
        name: types[i].name,
        value: parsedParam as string,
        type: types[i].type,
      });
    }
    return returnArray;
  }
}
