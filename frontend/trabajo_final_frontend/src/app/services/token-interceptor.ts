import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoginService } from './login';

@Injectable({
  providedIn: 'root',
})
export class TokenInterceptorService implements HttpInterceptor {
  //Este service intercepta llamadas HTTP y
  //agrega a la petición información del token de sesión almacenado en sessionStorage
  constructor(private loginService: LoginService) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const token = this.loginService.getToken();
    console.log('TOKEN: ' + token);

    // Si no hay token, no añadimos la cabecera Authorization (evita "Bearer null")
    let tokenizeReq = req;
    if (token) {
      tokenizeReq = req.clone({
        setHeaders: {
          // Agregamos la cabecera "Authorization" solo cuando existe token
          Authorization: `Bearer ${token}`,
        },
      });
    }

    // Envía la petición (modificada o original) al servidor
    return next.handle(tokenizeReq);
  }
}
