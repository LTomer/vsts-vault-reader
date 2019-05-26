

 _   _             _ _    ______               _           
| | | |           | | |   | ___ \             | |          
| | | | __ _ _   _| | |_  | |_/ /___  __ _  __| | ___ _ __ 
| | | |/ _` | | | | | __| |    // _ \/ _` |/ _` |/ _ \ '__|
\ \_/ / (_| | |_| | | |_  | |\ \  __/ (_| | (_| |  __/ |   
 \___/ \__,_|\__,_|_|\__| \_| \_\___|\__,_|\__,_|\___|_|   




You need to define HahiCorp Vault Server url to VAULT_ADDR
Linux OS - Add configuration to .env (exist under agent root directory, Look at agent Capability under PWD)
    VAULT_ADDR=[Vault Server url like http://vaultserver:8200]

Windows OS - Add VAULT_ADDR as System variable, Value will be the server url

vault reader 1v
Base64 - to use option you need to encode file to base64 and add it to vault server in specific path & field
to do it, you can use PowerShell scrip:

-------------------------------------------------------
$fn = [relevant file name include folder]

$content = Get-Content $fn -Encoding Byte
$base64 = [Convert]::ToBase64String($content)
$base64 | Out-File "$fn.txt"
-------------------------------------------------------
* put the $fn.txt file content into vault.