import { Injectable } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class AuthService {

    getToken(): string | null{
        return sessionStorage.getItem('token');
    }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

userRole(): string {
  const token = this.getToken();
  if (!token) {
    // If there's no token, try stored rol in sessionStorage as a fallback
    const storedRol = sessionStorage.getItem('rol');
    return storedRol ? storedRol : '';
  }
  const payload = token.split('.')[1];
  try {
    const decoded = JSON.parse(atob(payload));
    // Prefer role embedded in the JWT; if missing, fallback to sessionStorage 'rol'
    return decoded.rol || sessionStorage.getItem('rol') || '';
  } catch (e) {
    const storedRol = sessionStorage.getItem('rol');
    return storedRol ? storedRol : '';
  }
}
}