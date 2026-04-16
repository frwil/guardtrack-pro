import { getToken, removeToken } from "../storage/token";
import { apiConfig } from "./config";

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

class ApiClient {
  private getBaseURL(): string {
    return apiConfig.getApiUrl();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const token = getToken();
    const baseURL = this.getBaseURL();

    // Créer un objet Headers explicite
    const headers = new Headers(options.headers);

    // Définir le Content-Type par défaut
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    // ✅ Ajouter le header Accept pour les réponses JSON
    headers.set("Accept", "application/json");
    headers.set("ngrok-skip-browser-warning", "true");

    // Ajouter le token d'authentification si présent
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // ✅ Mode debug pour voir l'URL appelée (à retirer en production)
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
        // ✅ Mode CORS explicite
        mode: "cors",
        
      });

      // ✅ Log du statut pour debug
      if (
        typeof window !== "undefined" &&
        process.env.NODE_ENV === "development"
      ) {
        console.log(
          `📡 API Response: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        removeToken();
        if (typeof window !== "undefined" && !endpoint.includes("/auth/")) {
          window.location.href = "/login";
        }
      }

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

  async get<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(
    endpoint: string,
    options?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  // Méthode spéciale pour tester la connexion API sans authentification
  async testConnection(
    url?: string,
  ): Promise<{ success: boolean; error?: string; status?: number }> {
    const testUrl = url || this.getBaseURL();

    console.log(`🔍 Test connexion API: ${testUrl}/ping`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      // ✅ Pour le test de connexion, NE PAS inclure le header ngrok
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

      console.log(
        `✅ Test connexion: ${success ? "Réussi" : "Échoué"} (${response.status})`,
      );

      return {
        success,
        status: response.status,
      };
    } catch (error) {
      console.error("❌ Erreur test connexion:", error);

      let errorMessage = "Impossible de se connecter à l'API";
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMessage = "Délai de connexion dépassé (10s)";
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * ✅ Nouvelle méthode : Vérifier si l'API est accessible
   */
  async ping(): Promise<boolean> {
    const result = await this.testConnection();
    return result.success;
  }

  /**
   * ✅ Nouvelle méthode : Obtenir l'URL actuelle de l'API
   */
  getCurrentApiUrl(): string {
    return this.getBaseURL();
  }
}

export const apiClient = new ApiClient();
