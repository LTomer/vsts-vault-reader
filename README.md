
### vsts-vault-reader
Login & Get Values from HashiCorp Vault Server.

* Download cli from https://www.vaultproject.io/downloads.html and install it on your build machine.
* Add Vault cli folder to path environment variable.
* In order to work with Vault by HahiCorp You need to define VAULT_ADDR environment variable.
  
   * Linux OS - Add configuration to .env (exist under agent root directory, Look at agent Capability under PWD)
      VAULT_ADDR=[Vault Server url like http://vaultserver:8200]

   * Windows OS - Add VAULT_ADDR as System variable, Value will be the server url

vault reader - major version - 0.*
* work with json

vault reader - major version - 1.*
* work with custom format: 
{DataType} => {Path} => {Field} => {TFSVar}

Path, Field - VaultReader task will take value from Path & Field
TFSVar - The value will stored in tfs variable to use in next tasks.

_DataType_
   * var - strore the value in secret tfs variable, like: password, username
   * raw - vaule will stored (as is) in file under agent temp folder (text file), tfs variable will contain the path to that file, like: pem file...
   * base64 - decode value from base64 and save the content into file under agent temp folder (binary file), tfs variable will contain the path to that file, like: pfx, cer...
            (to convert file to BASE64 you can use the script bellow)

-------------------------------------------------------
   # Convert file to BASE64
   $fn = [relevant file name include folder]

   $content = Get-Content $fn -Encoding Byte
   
   $base64 = [Convert]::ToBase64String($content)
   
   $base64 | Out-File "$fn.txt"

-------------------------------------------------------
   # Decode BASE64
   
   $fn = "[save file name + path]"
   
   $base64 = '[insert base64]'
   
   $b  = [System.Convert]::FromBase64String($base64)
   
   [System.Text.Encoding]::UTF8.GetString($b) | Out-File -FilePath $fileName
   
-------------------------------------------------------
* put the $fn.txt file content into vault.
