import { Guid } from "guid-typescript";
import path = require('path');
import tl = require('azure-pipelines-task-lib/task');
import util = require("./util.js");
import { Console } from "console";

declare const Buffer

//Empty or Remark line
export function isIgnoredLine(line: string) {
    line = line.trim()
    return !line || line.length == 0 || line.startsWith('#')
}

export function massageLineHandling(line: string) {
    line = line.trim()

    if(line.startsWith('@')){
        console.log(line)
        return true
    }
    return false
}

export function variableLineHandling(index: Number, line: string, var_list: {[index: string]: string;}){
    var regexIsVariableLine = /^([A-z])([A-z0-9]*)(\s*)(<=)(\s*)[^\s]*$/g;
    if (regexIsVariableLine.exec(line) == null) 
        return false

    let arr = line.split("<=");
    let temp_key = arr[0].trim()
    let key = "{" + temp_key + "}" 
    let value = arr[1].trim()

    if( var_list[key] ){
        tl.setResult(tl.TaskResult.SucceededWithIssues, tl.loc("variableAlreadyExist", key));
    }
    else{
        var_list[key]=value
        tl.debug(tl.loc("setVariable", key));
    }
    return true
}

export async function actionLineHandling(index, line, var_list, base_url, token){
    var regexIsActionLine = /^(var|pre|raw|base64|json)(\s*=>\s*)(.*)(\s*=>\s*)(.*)(\s*=>\s*)([A-z0-9._]*)$/g;
    if(regexIsActionLine.exec(line) == null)
        return false

    let split_arr = line.split("=>");
            
    let type: string = split_arr[0].trim().toLowerCase();
    let secret_path: string = split_arr[1].trim();
    let field: string = split_arr[2].trim();
    let var_name: string = split_arr[3].trim();

    //update variable (field, path)
    for (let key in var_list) {
        let value = var_list[key]
        while(secret_path.includes(key)){
            secret_path = secret_path.replace(key, value)
        }
        while(field.includes(key)){
            field = field.replace(key, value)
        }
    }

    tl.debug(tl.loc("actionLine", index, type, path, field, var_name));

    let path_detailes;
    try{
        path_detailes = await util.getPathDetailes(base_url, secret_path, token);
        if(!path_detailes){
            tl.setResult(tl.TaskResult.Failed, tl.loc("emptySecret"));
            return true
        }
    }
    catch(error){
        tl.error(error);
        tl.setResult(tl.TaskResult.Failed, tl.loc("getSecretFail", index, error.message));
        return true
    }

    try{
        switch(type){
            case "var":{
                if(!path_detailes[field]){
                    tl.setResult(tl.TaskResult.Failed, tl.loc("fieldNotExist", index, field, type));
                    return true
                }
                tl.setVariable(var_name, String(path_detailes[field]), true)
                break;
            }
            case "pre":{
                if(field == "*"){
                    util.creatVariableFromObject(path_detailes, -2, var_name)
                }
                else
                {
                    let fields = field.split(',')

                    fields.forEach(function(value){
                        value=value.trim()
                        if(!path_detailes[value]){
                            tl.setResult(tl.TaskResult.Failed, tl.loc("fieldNotExist", index, value, type));
                            return true
                        }

                        tl.setVariable(var_name + "_" + value, String(path_detailes[value]), true)
                    });
                }
                break;
            }
            case "raw":{
                if(!path_detailes[field]){
                    tl.setResult(tl.TaskResult.Failed, tl.loc("fieldNotExist", index, field, type));
                    return true
                }
                
                let filename: string = path.join(tl.getVariable('agent.tempDirectory'), var_name + "-" + Guid.create())

                try{
                    util.writeToFile(filename, path_detailes[field]);
                    if(tl.getPlatform() != tl.Platform.Windows)
                        tl.execSync('chmod', '400 ' + filename);
                    
                    tl.setVariable(var_name, filename, false)
                }
                catch(error){
                    tl.error(error);
                    tl.setResult(tl.TaskResult.Failed, tl.loc("writeFieldToFileFail", index, type));
                }
                break;
            }
            case "base64":{
                if(!path_detailes[field]){
                    tl.setResult(tl.TaskResult.Failed, tl.loc("fieldNotExist", index, field, type));
                    return true;
                }

                let filename: string = path.join(tl.getVariable('agent.tempDirectory'), var_name + "-" + Guid.create())

                try{
                    let value = Buffer.from(path_detailes[field], 'base64' )
                    util.writeToFile(filename, value);
                    if(tl.getPlatform() != tl.Platform.Windows)
                        tl.execSync('chmod', '400 ' + filename);
                    //write field to file
                    tl.setVariable(var_name, filename, false)
                }
                catch(error){
                    tl.error(error);
                    tl.setResult(tl.TaskResult.Failed, tl.loc("writeFieldToFileFail", index, type));
                }
                break;
            }
            case "json":{
                if(!path_detailes){
                    tl.setResult(tl.TaskResult.Failed, tl.loc("dataNotExist", index, field, type));
                    return true;
                }

                if(field != '*'){
                    let isOK = util.compareObjectSchemeToFile(path_detailes, field, index)
                    if(!isOK)
                        return true
                }
                else{
                    tl.debug(tl.loc("skipCompareObject", index));
                }
                
                let filename: string = path.join(tl.getVariable('agent.tempDirectory'), var_name + "-" + Guid.create())
                
                try{
                    util.writeToFile(filename, JSON.stringify(path_detailes, null, 2));
                    tl.setVariable(var_name, filename, false)
                }
                catch(error){
                    tl.error(error);
                    tl.setResult(tl.TaskResult.Failed, tl.loc("writeFieldToFileFail", index, type));
                }
                break
            }
            default: { 
                tl.setResult(tl.TaskResult.Failed, tl.loc("actionTypeNotImplemented", index, type));
            } 
        }
    }
    catch(error){
        tl.error(error);
        tl.setResult(tl.TaskResult.Failed, tl.loc("UnknownErrorProcessType", index, type, error.message));
        tl.debug("Stack: " + error.stack)
        return true
    }
    return true
}