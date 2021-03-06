import fs = require('fs');
import path = require('path');
import tl = require('azure-pipelines-task-lib/task');
import url_util = require('url');

export function creatVariableFromObject(obj, depth = -2, path = '')
{
    if(typeof obj !== 'object'){
        tl.setVariable(path, String(obj), true)
        return
    }
    if(depth == 0)
        return

    let keys_1 = Object.keys(obj).sort();
    for (let k in keys_1)
    {
        let tmpKey = keys_1[k]
        creatVariableFromObject(obj[tmpKey], depth > 0 ? depth - 1 : - 1, path.length > 0 ? path + "_" + tmpKey : tmpKey);
    }
}

function compareObjectsSchema(o1, o2, depth = -2, path = '')
{
    if(typeof o1 !== 'object' || depth == 0)
        return true

    let keys_1 = Object.keys(o1).sort();
    let keys_2 = Object.keys(o2).sort();
    if(keys_1.length != keys_2.length){
        tl.debug(tl.loc("compareObjectNumberOfKeysNotEqual", path))
        return false
    }

    let ret = true
    for (let k in keys_1)
    {
        let tmpKey = keys_1[k]
        if(!keys_2.includes(tmpKey)){
            tl.debug(tl.loc("compareObjectKeyNotExist", tmpKey))
            return false
        }

        let isCompare: boolean = compareObjectsSchema(o1[tmpKey], o2[tmpKey], depth > 0 ? depth - 1 : - 1, path.length > 0 ? path + "." + tmpKey : tmpKey);
        if(!isCompare){
            ret = false
            return false
        }
    }
    return ret
}

export function compareObjectSchemeToFile(obj, fileName: string, index){
    let readObj
    try{
        let rawdata: string = fs.readFileSync(fileName, 'utf8').toString() 
        readObj = JSON.parse(rawdata)
    
        if(!compareObjectsSchema(obj, readObj)){
            tl.setResult(tl.TaskResult.Failed, tl.loc("secretNotEqualToSchema", index));
            return false
        }
    }
    catch(error){
        tl.error(error);
        tl.setResult(tl.TaskResult.Failed, tl.loc("loadJsonFromFileFail", index));
        return false
    }

    return true;
}

export function readFromFile(filename: string){
    if (!tl.stats(filename).isFile()) 
        throw new Error(tl.loc('invalidFilePath', filename));

    let array = fs.readFileSync(filename, 'utf8').toString().split('\n');
    return array
}

export function writeToFile(filename: string, value: any) {
    //const fs = require('fs');
    fs.writeFile(filename, value, (err) => {
        if (err) {
            throw new Error(tl.loc('writeToFileFail'));
        }
    });
}

function buildLoginUrl(base_url: string, auth_type:string, user:string, password:string){
    let data = {};
    let pathType: string

    switch(auth_type) {
        case "ldap":
            data = { "password": password }
            pathType = pathJoin("/", "/ldap/login/", user)
            break;
        case "userpass":
            data = { "password": password }
            pathType = pathJoin("/", "/userpass/login/", user)
            break;
        default:
            throw new Error(tl.loc('loginTypeNotValid'));
      }

      let url: string = pathJoin("/", base_url, "/v1/auth", pathType)

      return [url, data];
}

function pathJoin(sep: string, ...parts: any[]) {
    return parts
      .map(part => {
        const part2 = part.endsWith(sep) ? part.substring(0, part.length - 1) : part;
        return part2.startsWith(sep) ? part2.substr(1) : part2;
      })
      .join(sep);
}

export function getVaultToken(base_url: string, auth_type:string, user:string, password:string): Promise<string> {
    return new Promise((resolve, reject) => {
        let res = buildLoginUrl(base_url, auth_type, user, password);

        let url = res[0]
        let data = res[1]

        var unirest = require('unirest');
        var req = unirest('POST', url)
        .headers({
            'Content-Type': 'application/json'
        })
        .send(JSON.stringify(data))
        .end(function (res) { 
            if (res.error) 
                reject(new Error(res.error.message)); 
            
            if (!res.body.auth || !res.body.auth.client_token) 
                reject(new Error(tl.loc('tokenPropertyNotExist'))); 
                
            resolve(res.body.auth.client_token.toString());
        });
    })
}

export function getPathDetailes(base_url: string, path: string, token: string): Promise<string> {
    return new Promise((resolve, reject) => {
        let url = pathJoin("/", base_url, "/v1", path);

        var unirest = require('unirest');
        var req = unirest('GET', url)
        .headers({
            'X-Vault-Token': token
        })
        .end(function (res) { 
            if (res.error) 
                reject(new Error(res.error)); 
            
            if(!res.body.data)
                reject(new Error(tl.loc('dataOnPathNotExist'))); 

            resolve(res.body.data);
        });
    })
}