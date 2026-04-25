import { getToken, removeToken } from "../storage/token";
import { apiConfig } from "./config";

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

// Pour éviter les boucles infinies de vérification
let isVerifyingToken = false;
let lastTokenCheck = 0;

class ApiClient {
  private getBaseURL(): string {
    return apiConfig.getApiUrl();
  }

  private async verifyToken(): Promise<boolean> {
    const token = getToken();
    if (!token) return false;

    // Éviter les appels multiples en rafale
    const now = Date.now();
    if (isVerifyingToken || now - lastTokenCheck < 2000) {
      return !!token;
    }

    isVerifyingToken = true;
    lastTokenCheck = now;

    try {
      const baseURL = this.getBaseURL();
      const response = await fetch(`${baseURL}/api/auth/me`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        mode: "cors",
      });

      isVerifyingToken = false;
      return response.ok;
    } catch {
      isVerifyingToken = false;
      // Si l'API est inaccessible (réseau), on garde le token
      return true;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const token = getToken();
    const baseURL = this.getBaseURL();

    const headers = new Headers(options.headers);

    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    headers.set("Accept", "application/json");
    headers.set("ngrok-skip-browser-warning", "true");

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      console.log(
        `🌐 API Request: ${options.method || "GET"} ${baseURL}${endpoint}`,
      );
    }

    try {
      const response = await fetch(`${baseURL}${endpoint}`, {
        ...options,
        headers,
        mode: "cors",
      });

      if (
        typeof window !== "undefined" &&
        process.env.NODE_ENV === "development"
      ) {
        console.log(
          `📡 API Response: ${response.status} ${response.statusText}`,
        );
      }

      if (response.status === 401 && !endpoint.includes("/auth/")) {
        // Vérifier si le token est vraiment invalide
        const isValid = await this.verifyToken();

        if (!isValid) {
          removeToken();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }

        // Token valide mais 401 quand même → simple erreur d'autorisation
        return {
          data: undefined,
          error: "Accès non autorisé",
          status: 401,
        };
      }

      const data = await response.json().catch(() => null);

      return {
        data: response.ok ? data : undefined,
        error: !response.ok
          ? data?.message ||
            data?.error ||
            data?.detail ||
            "Une erreur est survenue"
          : undefined,
        status: response.status,
      };
    } catch (error) {
      console.error("❌ API Error:", error);
      return {
        error: error instanceof Error ? error.message : "Erreur réseau",
        status: 0,
      };
    }
  }

  // Le reste de la classe reste inchangé...
  async get<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "POST", body: body ? JSON.stringify(body) : undefined });
  }

  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "PUT", body: body ? JSON.stringify(body) : undefined });
  }

  async patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body: body ? JSON.stringify(body) : undefined });
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  async testConnection(url?: string): Promise<{ success: boolean; error?: string; status?: number }> {
    const testUrl = url || this.getBaseURL();
    console.log(`🔍 Test connexion API: ${testUrl}/ping`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(`${testUrl}/ping`, {
        method: "GET",
        signal: controller.signal,
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      });

      clearTimeout(timeoutId);
      const success = response.ok || response.status === 401;
      console.log(`✅ Test connexion: ${success ? "Réussi" : "Échoué"} (${response.status})`);
      return { success, status: response.status };
    } catch (error) {
      console.error("❌ Erreur test connexion:", error);
      let errorMessage = "Impossible de se connecter à l'API";
      if (error instanceof Error) {
        if (error.name === "AbortError") errorMessage = "Délai de connexion dépassé (10s)";
        else errorMessage = error.message;
      }
      return { success: false, error: errorMessage };
    }
  }

  async ping(): Promise<boolean> {
    const result = await this.testConnection();
    return result.success;
  }

  getCurrentApiUrl(): string {
    return this.getBaseURL();
  }
}

export const apiClient = new ApiClient();