import { Injectable, Inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service'; // Ajusta la ruta según tu proyecto

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(@Inject(AuthService) private auth: AuthService, private router: Router) {}

  canActivate(): boolean {
    const role = this.auth.userRole();
    // Aceptar ambas variantes que se usan en distintos lugares: 'admin' y 'administrador'
    const allowed = ['admin', 'administrador'];

    if (!this.auth.isLoggedIn() || !allowed.includes(role)) {
      // Redirigir al home en lugar de a la ruta comodín (evita mostrar la página 404)
      this.router.navigate(['/']);
      return false;
    }
    return true;
  }
}