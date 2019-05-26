# vsts-vault-reader
Login &amp; Get Values from HashiCorp Vault Server.

* Add Vault cli folder to path environment variable.
* In order to work with Vault by HahiCorp You need to define VAULT_ADDR environment variable.
  
   * Linux OS - Add configuration to .env (exist under agent root directory, Look at agent Capability under PWD)
      VAULT_ADDR=[Vault Server url like http://vaultserver:8200]

   * Windows OS - Add VAULT_ADDR as System variable, Value will be the server url
 
 * Windows OS - Download Vault.exe and put at folder 