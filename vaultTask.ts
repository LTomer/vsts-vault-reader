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

	//Parser Data ( DataType => Path => Field => Var)
	var data = tl.getInput('data', true);

	let tempDirectory = tl.getVariable('agent.tempDirectory'); //get agent temp folder
	let array = data.split(/\r\n|\r|\n/);

	for (var i = 0; i < array.length; i++) {
		let index = i + 1
		let line = array[i].trim();

		let remIndex = line.indexOf("#");
		if(remIndex >= 0){
			line = line.substring(0, remIndex);
		}

		if(!line || line.length == 0){
			continue;
		}

		let l = line.split("=>");
		if(l.length != 4){
			console.log("Data not valid (line " + index + ").");
		
			tl.command( 'task.complete', { 'result': tl.TaskResult.Failed }, 'Data not valid (line ${index})')
			continue
			//throw new Error('Data not valid (line ${index})');
		}

		let type: string = l[0].trim().toLowerCase();
		let path: string = l[1].trim();
		let field: string = l[2].trim();
		let var_name: string = l[3].trim();

		console.log("Value: Line=" + index + ", Type=" + type +", Path=" + path + ", Field=" + field + ", Variable=" + var_name);

		var val = tl.execSync('sudo', '-E vault read -field=' + field + ' ' + path)  // + ' -format=table'); need new version
		if(val.code != 0){
			console.log('Command Code: ' + val.code);
			console.log('Command Error: ' + val.error);
			
			tl.command( 'task.complete', { 'result': tl.TaskResult.Failed }, 'vault read failed (value)')
			continue
			//throw new Error('vault read failed (value)');
		}

		switch(type){
			case "var":{
				console.log("##vso[task.setvariable variable=" + var_name + ";issecret=true]" + val.stdout)
				break;
			}
			case "raw":{
				let filename = tempDirectory + "/" + var_name + "-" + Guid.create();

				//write field to file
				const fs = require('fs')
				fs.writeFile(filename, val.stdout, (err) => {
					if (err) {
						tl.command( 'task.complete', { 'result': tl.TaskResult.Failed }, 'write to raw file - failed')
						throw new Error('write value to raw file - failed');
					}

					tl.execSync('chmod', '400 ' + filename)

					//update variable with full name
					console.log("##vso[task.setvariable variable=" + var_name + ";issecret=false]" + filename);
				});
				break;
			}
			case "base64":{
				let filename = tempDirectory + "/" + var_name + "-" + Guid.create();

				let buff = new Buffer(val.stdout, 'base64');

				//write field to file
				const fs = require('fs')
				fs.writeFile(filename, buff, (err) => {
					if (err) {
						tl.command( 'task.complete', { 'result': tl.TaskResult.Failed }, 'write to raw file - failed')
						throw new Error('write value to base64 file - failed');
					}

					tl.execSync('chmod', '400 ' + filename)

					//update variable with full name
					console.log("##vso[task.setvariable variable=" + var_name + ";issecret=false]" + filename);
				});

				break;
			}
			default: { 
				console.log("Vault read failed (line " + index + ")");
				tl.command( 'task.complete', { 'result': tl.TaskResult.Failed }, "Vault read failed (line " + index + ")")
				break; 
			} 
		}
	}
}

run();