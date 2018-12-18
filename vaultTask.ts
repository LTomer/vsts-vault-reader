import tl = require('vsts-task-lib/task');

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
	let res = tl.execSync('sudo', 'vault login -method=ldap username=' + vaultUser + ' password=' + vaultPass);	
	console.log('')
	if(res.code != 0){
		console.log('Code: ' + res.code);
		console.log('error: ' + res.error);
		
		tl.error('vault login failed')
		tl.command( 'task.complete', { 'result': tl.TaskResult.Failed }, 'vault login failed')
	}

	let jsonObject = JSON.parse(json);
	let values = jsonObject['Values'];

	for (var i = 0; i < values.length; i++) {
		let field: string = values[i].Field
		let path: string = values[i].Path
		let variable: string = values[i].Variable

		console.log("Load: Path=" + path + ", Field=" + field + ", Variable=" + variable);

		var val = tl.execSync('sudo', 'vault read -field=' + field + ' ' + path);
		if(val.code != 0){
			console.log('Code: ' + val.code);
			console.log('error: ' + val.error);
			
			tl.error('vault read failed')
			tl.command( 'task.complete', { 'result': tl.TaskResult.Failed }, 'vault read failed')
		}
		else{
			console.log("##vso[task.setvariable variable=" + variable + ";issecret=true]" + val.stdout);
		}
	}
}

run();