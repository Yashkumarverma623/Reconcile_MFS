import axios, { AxiosRequestConfig } from 'axios';

export interface ApiConnectorConfig {
  baseUrl: string;
  authToken?: string;
  resourcePath: string;
  method?: string;
  params?: Record<string, any>;
  headers?: Record<string, string>;
}

export class ApiConnectorService {
  static async fetchRecords(config: ApiConnectorConfig): Promise<any[]> {
    const { baseUrl, authToken, resourcePath, method = 'GET', params = {}, headers = {} } = config;
    const url = `${baseUrl.replace(/\/$/, '')}/${resourcePath.replace(/^\//, '')}`;

    const requestHeaders: Record<string, string> = {
      'Accept': 'application/json',
      ...headers,
    };

    if (authToken) {
      requestHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    const requestConfig: AxiosRequestConfig = {
      url,
      method,
      headers: requestHeaders,
      params,
      timeout: 10000, // 10s timeout
    };

    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const response = await axios(requestConfig);

        let data = response.data;
        if (Array.isArray(data)) {
          return data;
        } else if (data && typeof data === 'object') {
          // If response wrapped in data, items, or records
          if (Array.isArray(data.data)) return data.data;
          if (Array.isArray(data.items)) return data.items;
          if (Array.isArray(data.records)) return data.records;
          if (Array.isArray(data.results)) return data.results;
          if (Array.isArray(data.transactions)) return data.transactions;
        }

        return [data];
      } catch (err: any) {
        lastError = err;
        console.warn(`[ApiConnectorService] Attempt ${attempts} failed: ${err.message}`);
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        }
      }
    }

    throw new Error(`Failed to fetch external API records after ${maxAttempts} attempts: ${lastError?.message}`);
  }
}
