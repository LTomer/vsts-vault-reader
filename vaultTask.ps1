#tfx build tasks upload --task-path ./Vault
[CmdletBinding()]
param()

#read vsts inputs
$connectedServiceName = Get-VstsInput -Name connectedServiceName -Require
$endpoint = Get-VstsEndpoint -Name $connectedServiceName -Require

if(-not $endpoint)
{
	Write-Error "Connection not exist"
	exit
}

#Vault login
$vaultUser = $endpoint.Auth.Parameters.Username
$vaultPass = $endpoint.Auth.Parameters.Password

vault login -method=ldap username=$vaultUser password=$vaultPass 2>&1
if( -not $? )
{
	$msg = $Error[0].Exception.Message
	Write-Error "Vault login failed - $msg"
    exit
}

#Parser Data ( DataType => Path => Field => Var)
$data = Get-VstsInput -Name "data"
$tempFolder = (get-childitem -Path env:AGENT_TEMPDIRECTORY).Value #get agent temp folder
$array = $data.Split([Environment]::NewLine)

$index=0;
foreach($line in $array){
	$index++

	$remIndex = $line.IndexOf("#")
	if($remIndex -gt -1){
		$line = $line.Substring(0, $remIndex)
	}

	if([string]::IsNullOrWhiteSpace($line)) {continue}

	$l = $line -split '=>'
	if($l.Count -ne 4) {
		Write-Error "Data not valid (line $index)."
		continue
	}

	$type = $l[0].Trim()
	$path = $l[1].Trim()
	$field = $l[2].Trim()
	$var_name = $l[3].Trim()

	Write-Host "Value: Line=$index, Type=$type, Path=$path, Field=$field, Variable=$var_name"

	$val = vault read "-field=$field" $path
	if( -not $? )
	{
		Write-Error "Vault read failed (line $index)."
		continue
	}

	switch ($type) {
		'var'{
			Write-Host ("##vso[task.setvariable variable=$var_name;issecret=true]$val")
		}
		'raw' {
			$filename="$tempFolder\$var_name-"+[guid]::NewGuid().guid
			[System.IO.File]::WriteAllText($filename, $val)
			Write-Host ("##vso[task.setvariable variable=$var_name;issecret=false]$filename")
		}
		'base64'{
			$filename="$tempFolder\$var_name-"+[guid]::NewGuid().guid

			$bytes = [Convert]::FromBase64String($val)
			[System.IO.File]::WriteAllBytes($filename, $bytes)
			Write-Host ("##vso[task.setvariable variable=$var_name;issecret=false]$filename")
		}
		Default
        {
            Write-Error "DataType not valid (line $index)."
			continue
        }
	}
}
