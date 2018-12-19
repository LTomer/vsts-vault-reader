#tfx build tasks upload --task-path ./Vault
[CmdletBinding()]
param()

#read vsts inputs
$connectedServiceName = Get-VstsInput -Name connectedServiceName -Require
$endpoint = Get-VstsEndpoint -Name $connectedServiceName #-Require

$json = Get-VstsInput -Name json | ConvertFrom-Json

if(-not $endpoint)
{
	Write-Error "Connection not exist"
	exit
}

$vaultUser = $endpoint.Auth.Parameters.Username
$vaultPass = $endpoint.Auth.Parameters.Password

#Vault login
vault login -method=ldap username=$vaultUser password=$vaultPass 2>&1
if( -not $? )
{
	$msg = $Error[0].Exception.Message
	Write-Error "vault login failed ($msg)"
    exit
}

#Get data from JSON

#Values property - Get Value into variable using path & field
foreach( $data in $json.Values ) { 
	$field = $data.Field
	$path = $data.Path
	$var = $data.Variable

	Write-Host "Load Value: Path=$path, Field=$field, Variable=$var"
	
	$val = vault read "-field=$field" $path
	if( -not $? )
	{
		$msg = $Error[0].Exception.Message
		Write-Error "vault read failed"
		exit
	}

	Write-Host ("##vso[task.setvariable variable=$var;issecret=true]$val")
}

#Files property - Get Value into file using path & field, variable will contain file path
$tempFolder = (get-childitem -Path env:AGENT_TEMPDIRECTORY).Value #get agent temp folder
foreach( $data in $json.Files ) { 
	$field = $data.Field
	$path = $data.Path
	$var = $data.Variable

	Write-Host "Load File: Path=$path, Field=$field, Variable=$var"
	
	$filename="$tempFolder\"+[guid]::NewGuid().guid

	vault read "-field=$field" $path | Out-File -FilePath $filename 2>&1
	
	if( -not $? )
	{
		$msg = $Error[0].Exception.Message
		Write-Error "vault read failed"
		exit
	}

	Write-Host ("##vso[task.setvariable variable=$var;issecret=false]$filename")
}
