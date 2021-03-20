const { sha3, BN } = require("web3-utils");
const abiCoder = require("web3-eth-abi");

class AbiDecoder {

  constructor() {
    this.state = {
      savedABIs: [],
      methodIDs: {},
    };
  }

  getABIs() {
    return this.state.savedABIs;
  }

  addABI(abiArray) {
    if (Array.isArray(abiArray)) {
      // Iterate new abi to generate method id"s
      abiArray.map((abi) => {
        if (abi.name) {
          const signature = sha3(
            abi.name +
              "(" +
              abi.inputs
                .map((input) => this._typeToString(input))
                .join(",") +
              ")"
          );
          if (abi.type === "event") {
            this.state.methodIDs[signature.slice(2)] = abi;
          } else {
            this.state.methodIDs[signature.slice(2, 10)] = abi;
          }
        }
      });
  
      this.state.savedABIs = this.state.savedABIs.concat(abiArray);
    } else {
      throw new Error("Expected ABI array, got " + typeof abiArray);
    }
  }

  removeABI(abiArray) {
    if (Array.isArray(abiArray)) {
      // Iterate new abi to generate method id"s
      abiArray.map((abi) => {
        if (abi.name) {
          const signature = sha3(
            abi.name +
              "(" +
              abi.inputs
                .map((input) => {
                  return input.type;
                })
                .join(",") +
              ")"
          );
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
      });
    } else {
      throw new Error("Expected ABI array, got " + typeof abiArray);
    }
  }

  getMethodIDs() {
    return this.state.methodIDs;
  }

  decodeMethod(inputData, outputData) {
    const methodID = inputData.slice(2, 10);
    const abiItem = this.state.methodIDs[methodID];
    if (abiItem) {
  
      const retData = {
        name: abiItem.name,
        params: [],
      };
  
      retData.params = this._formatReturnData(abiItem.inputs, abiCoder.decodeParameters(abiItem.inputs, inputData.slice(10)));
  
      if (abiItem.outputs && outputData) {
        retData.outputs = this._formatReturnData(abiItem.outputs, abiCoder.decodeParameters(abiItem.outputs, outputData), retData.outputs);
      }
  
      return retData;
    }
  }

  decodeLogs(logs) {
    return logs.filter(log => log.topics.length > 0).map((logItem) => {
      const methodID = logItem.topics[0].slice(2);
      const method = this.state.methodIDs[methodID];
      if (method) {
        const logData = logItem.data;
        let decodedParams = [];
        let dataIndex = 0;
        let topicsIndex = 1;
  
        let dataTypes = [];
        method.inputs.map((input) => {
          if (!input.indexed) {
            dataTypes.push(input.type);
          }
        });
  
        const decodedData = abiCoder.decodeParameters(
          dataTypes,
          logData.slice(2)
        );
  
        // Loop topic and data to get the params
        method.inputs.map((param) => {
          let decodedP = {
            name: param.name,
            type: param.type,
          };
  
          if (param.indexed) {
            decodedP.value = logItem.topics[topicsIndex];
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
          address: logItem.address,
        };
      }
    });
  }

  _typeToString(input) {
    if (input.type === "tuple") {
      return "(" + input.components.map((input) => this._typeToString(input)).join(",") + ")";
    }
    return input.type;
  }
  
  _formatReturnData(types, decoded) {
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
          parsedParam = param.map(val => new BN(val).toString());
        } else {
          parsedParam = new BN(param).toString();
        }
      }
  
      // Addresses returned by web3 are randomly cased so we need to standardize and lowercase all
      if (isAddress) {
        const isArray = Array.isArray(param);
  
        if (isArray) {
          parsedParam = param.map(_ => _.toLowerCase());
        } else {
          parsedParam = param.toLowerCase();
        }
      }
  
      returnArray.push({
        name: types[i].name,
        value: parsedParam,
        type: types[i].type,
      });
    }
    return returnArray;
  }
}

module.exports = AbiDecoder;
