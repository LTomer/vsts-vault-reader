import tl = require('vsts-task-lib/task');
import { Guid } from "guid-typescript";
import path = require('path');

function run() {
	//Get User/Password from serviceEndpoint:Generic
	let serviceEndpointID: string = tl.getInput('connectedServiceName', true);
	let serviceEndpoint: tl.EndpointAuthorization = tl.getEndpointAuthorization(serviceEndpointID, true);

	let vaultUser: string = serviceEndpoint.parameters['username'];
	let vaultPass: string = serviceEndpoint.parameters['password'];
	// url = URL.format(URL.parse(tl.getEndpointUrl(serviceEndpointID, false))); // url has a / at the end

	//Get JSON value from input
	var json = tl.getInput('json', true);

	if (!vaultUser || !vaultPass) {
		throw new Error("serviceEndpoint Not Exist");
	}

	//Login to Vault server
	let res = tl.execSync('sudo', '-E vault login -method=ldap username=' + vaultUser + ' password=' + vaultPass);	
	console.log('')
	if(res.code != 0){
		console.log('Code: ' + res.code);
		console.log('error: ' + res.error);
		
		tl.command( 'task.complete', { 'result': tl.TaskResult.Failed }, 'vault login failed')
		throw new Error('vault login failed');
	}

	let jsonObject = JSON.parse(json);

	//Values property - Get Value into variable using path & field
	let values = jsonObject['Values'];
	if(values !== undefined){
		for (var i = 0; i < values.length; i++) {
			let field: string = values[i].Field
			let path: string = values[i].Path
			let variable: string = values[i].Variable

			console.log("Load: Path=" + path + ", Field=" + field + ", Variable=" + variable);

			var val = tl.execSync('sudo', '-E vault read -field=' + field + ' ' + path);
			if(val.code != 0){
				console.log('Command Code: ' + val.code);
				console.log('Command Error: ' + val.error);
				
				tl.command( 'task.complete', { 'result': tl.TaskResult.Failed }, 'vault read failed (value)')
				throw new Error('vault read failed (value)');
			}
			else{
				console.log("##vso[task.setvariable variable=" + variable + ";issecret=true]" + val.stdout);
			}
		}
	}

	//Files property - Get Value into file using path & field, variable will contain file path
	let files = jsonObject['Files'];
	if(files !== undefined){
		let tempDirectory = tl.getVariable('agent.tempDirectory'); //get agent temp folder
		for (var i = 0; i < files.length; i++) {
			let field: string = files[i].Field
			let path: string = files[i].Path
			let variable: string = files[i].Variable

			console.log("Load File: Path=" + path + ", Field=" + field + ", Variable=" + variable);

			let filename = tempDirectory + "/" + Guid.create();
			var val = tl.execSync('sudo', '-E vault read -field=' + field + ' ' + path );

			if(val.code != 0){
				console.log('Command Code: ' + val.code);
				console.log('Command Error: ' + val.error);
				
				tl.command( 'task.complete', { 'result': tl.TaskResult.Failed }, 'vault read failed (file)')
				throw new Error('vault read failed (file)');
			}
			else{

				//write field to file
				const fs = require('fs')
				fs.writeFile(filename, val.stdout, (err) => {
					if (err) {
						tl.command( 'task.complete', { 'result': tl.TaskResult.Failed }, 'write to file - failed')
						throw new Error('write value to file - failed');
					}

					//update variable with full name
					console.log("##vso[task.setvariable variable=" + variable + ";issecret=false]" + filename);
				});
			}
		}
	}

}

run();