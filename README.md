
### vault-reader - Version 2.*
The Task will read secrets from HashiCorp Vault server.

Task Options:
   * Vault User - the User who connects to HashiCorp Vault Server(Service Connections).
   * Source Type:
      Inline - define instructions in multiline box.
      File Path - read the instructions from file (There is also multiline box for defining variables).

Service Connections (Generic):
Go to "Service connections" and create generic service.
Fill The relevant fields:
   Connection Name - service name.
   Server Url - will include the URL of the Vault server (i.e. http://MyVaultServer:8200).
   User Key - user that connects to the server. There are few connection types:
      format: [userTypes]\[UserName]
      UserTypes: ldap\userpass\token
   API Token - set the password\token of the user.

Instructions:
* Reamark - '#' char at the begining of the line - the task will ignore this line.
* Comment - '@' char at the begining of the line - display the line during the Build/Release process.
* Define Variables - Format: [Variable Name] <= [Value]
* Action Line - Format : [ActionType] => [Path] => [Field] => [Azure-DevOps-Variable]

##    ActionTypes:
   * var - read value from Path with specific Field into Azure-DevOps-Variable (i.e. user, password etc.).
   * raw - read value from Path with specific Field and store it into file. Azure-DevOps-Variable will contain the file location.
   * base64 - read value from Path with specific Field, decode the value and store the result into file. Azure-DevOps-Variable will contain the file location (i.e. certificate, pem etc.).
   * json - read all data from path and store it into file as json (Field - TBD). Azure-DevOps-Variable will contain the file location.

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
   
   $bytes = [Convert]::FromBase64String($base64)
   
   [System.IO.File]::WriteAllBytes($fn, $bytes)

-------------------------------------------------------
* put the $fn.txt file content into vault.
