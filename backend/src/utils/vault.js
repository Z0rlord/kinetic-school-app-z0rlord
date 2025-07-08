const axios = require('axios');
require('dotenv').config();

class VaultClient {
    constructor() {
        this.vaultUrl = process.env.VAULT_URL || 'http://localhost:8200';
        this.vaultToken = process.env.VAULT_TOKEN;
        this.vaultNamespace = process.env.VAULT_NAMESPACE || '';
        this.mountPath = process.env.VAULT_MOUNT_PATH || 'secret';
        this.isEnabled = process.env.USE_VAULT === 'true';
        
        if (this.isEnabled && !this.vaultToken) {
            console.warn('⚠️  Vault is enabled but no VAULT_TOKEN provided');
        }
    }

    // Get headers for Vault API requests
    getHeaders() {
        const headers = {
            'X-Vault-Token': this.vaultToken,
            'Content-Type': 'application/json'
        };
        
        if (this.vaultNamespace) {
            headers['X-Vault-Namespace'] = this.vaultNamespace;
        }
        
        return headers;
    }

    // Check if Vault is available and authenticated
    async isHealthy() {
        if (!this.isEnabled) return false;
        
        try {
            const response = await axios.get(`${this.vaultUrl}/v1/sys/health`, {
                timeout: 5000
            });
            return response.status === 200;
        } catch (error) {
            console.warn('⚠️  Vault health check failed:', error.message);
            return false;
        }
    }

    // Get secret from Vault
    async getSecret(path) {
        if (!this.isEnabled) {
            console.warn('⚠️  Vault not enabled, cannot retrieve secret:', path);
            return null;
        }

        try {
            const response = await axios.get(
                `${this.vaultUrl}/v1/${this.mountPath}/data/${path}`,
                {
                    headers: this.getHeaders(),
                    timeout: 10000
                }
            );

            if (response.data && response.data.data && response.data.data.data) {
                return response.data.data.data;
            }

            return null;
        } catch (error) {
            console.error(`❌ Failed to get secret from Vault: ${path}`, error.message);
            return null;
        }
    }

    // Store secret in Vault
    async putSecret(path, data) {
        if (!this.isEnabled) {
            console.warn('⚠️  Vault not enabled, cannot store secret:', path);
            return false;
        }

        try {
            await axios.post(
                `${this.vaultUrl}/v1/${this.mountPath}/data/${path}`,
                { data },
                {
                    headers: this.getHeaders(),
                    timeout: 10000
                }
            );

            console.log(`✅ Secret stored in Vault: ${path}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to store secret in Vault: ${path}`, error.message);
            return false;
        }
    }

    // Get database configuration from Vault or environment
    async getDatabaseConfig() {
        if (this.isEnabled) {
            const dbSecrets = await this.getSecret('database');
            if (dbSecrets) {
                return {
                    host: dbSecrets.DB_HOST || process.env.DB_HOST,
                    port: dbSecrets.DB_PORT || process.env.DB_PORT,
                    user: dbSecrets.DB_USER || process.env.DB_USER,
                    password: dbSecrets.DB_PASSWORD || process.env.DB_PASSWORD,
                    database: dbSecrets.DB_NAME || process.env.DB_NAME
                };
            }
        }

        // Fallback to environment variables
        return {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        };
    }

    // Get session secret from Vault or environment
    async getSessionSecret() {
        if (this.isEnabled) {
            const appSecrets = await this.getSecret('app');
            if (appSecrets && appSecrets.SESSION_SECRET) {
                return appSecrets.SESSION_SECRET;
            }
        }

        return process.env.SESSION_SECRET;
    }

    // Get email configuration from Vault or environment
    async getEmailConfig() {
        if (this.isEnabled) {
            const emailSecrets = await this.getSecret('email');
            if (emailSecrets) {
                return {
                    host: emailSecrets.EMAIL_HOST || process.env.EMAIL_HOST,
                    port: emailSecrets.EMAIL_PORT || process.env.EMAIL_PORT,
                    user: emailSecrets.EMAIL_USER || process.env.EMAIL_USER,
                    password: emailSecrets.EMAIL_PASSWORD || process.env.EMAIL_PASSWORD
                };
            }
        }

        // Fallback to environment variables
        return {
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            user: process.env.EMAIL_USER,
            password: process.env.EMAIL_PASSWORD
        };
    }

    // Initialize secrets in Vault (for setup)
    async initializeSecrets() {
        if (!this.isEnabled) {
            console.log('ℹ️  Vault not enabled, skipping secret initialization');
            return;
        }

        console.log('🔐 Initializing secrets in Vault...');

        // Database secrets
        const dbSecrets = {
            DB_HOST: process.env.DB_HOST || 'localhost',
            DB_PORT: process.env.DB_PORT || '3306',
            DB_USER: process.env.DB_USER || 'root',
            DB_PASSWORD: process.env.DB_PASSWORD || '',
            DB_NAME: process.env.DB_NAME || 'student_profile_db'
        };

        // App secrets
        const appSecrets = {
            SESSION_SECRET: process.env.SESSION_SECRET || require('crypto').randomBytes(64).toString('hex')
        };

        // Email secrets
        const emailSecrets = {
            EMAIL_HOST: process.env.EMAIL_HOST || '',
            EMAIL_PORT: process.env.EMAIL_PORT || '587',
            EMAIL_USER: process.env.EMAIL_USER || '',
            EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || ''
        };

        try {
            await this.putSecret('database', dbSecrets);
            await this.putSecret('app', appSecrets);
            await this.putSecret('email', emailSecrets);
            
            console.log('✅ Secrets initialized in Vault');
        } catch (error) {
            console.error('❌ Failed to initialize secrets in Vault:', error);
        }
    }
}

// Create singleton instance
const vaultClient = new VaultClient();

// Helper function to get configuration with Vault fallback
async function getConfig() {
    const config = {
        database: await vaultClient.getDatabaseConfig(),
        session: {
            secret: await vaultClient.getSessionSecret()
        },
        email: await vaultClient.getEmailConfig(),
        vault: {
            enabled: vaultClient.isEnabled,
            healthy: await vaultClient.isHealthy()
        }
    };

    return config;
}

module.exports = {
    VaultClient,
    vaultClient,
    getConfig
};
