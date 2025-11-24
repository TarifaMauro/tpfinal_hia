import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Producto {
  _id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  tallas: Talla[];
  color: string;
  imagenes: string[];
  categoria: any;
}
export interface Talla{
  _id: string;
  talla: string;
  stock: number;
}

export interface Categoria {
  _id: string;
  nombre: string;
}
export interface ProductoResponse {
  status: string;
  msg: string;
  productos: Producto[];
}
export interface PaginacionRespuesta {
  items: Producto[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private API_URL = environment.apiUrl;
  // usar siempre la URL del environment para evitar rutas relativas incorrectas
  private baseUrl = this.API_URL;
  valorBusqueda = '';

  constructor(private http: HttpClient) { }

  obtenerProductos(): Observable<Producto[]> {
    return this.http.get<ProductoResponse>(`${this.API_URL}/producto`)
      .pipe(
        map(response => response.productos || []),
        catchError(error => {
          console.error('Error al obtener productos:', error);
          return of([]);
        })
      );
  }

  obtenerProductoPorId(id: string): Observable<Producto> {
    return this.http.get<Producto>(`${this.API_URL}/producto/${id}`);
  }

  obtenerProductosPorCategoria(categoriaNombre: string): Observable<Producto[]> {
    return this.http.get<ProductoResponse>(`${this.API_URL}/producto/categoria/${categoriaNombre}`)
      .pipe(
        map(response => response.productos || []),
        catchError(error => {
          console.error('Error al obtener productos por categoría:', error);
          return of([]);
        })
      );
  }

  crearProducto(producto: FormData): Observable<any>{
    return this.http.post<any>(`${this.API_URL}/producto`, producto)
      .pipe(
        map(response => response.producto)
      );
  }

actualizarProducto(id: string, producto: FormData): Observable<Producto> {
  return this.http.put<any>(`${this.API_URL}/producto/${id}`, producto)
    .pipe(
      map(response => response.producto)
    );
}

  eliminarProducto(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/producto/${id}`);
  }

  buscarPorNombre(nombre: string){
    return this.http.get<ProductoResponse>(`${this.API_URL}/producto/nombre?nombre=${nombre}`)
     .pipe(
        map(response => response.productos || []),
        catchError(error => {
          console.error('Error al obtener productos por nombre:', error);
          return of([]);
        })
      );
  }

 obtenerProductosCursor(cursor: number | null, limit: number, q: string) {
  return this.http.get<any>(`${this.API_URL}/producto/paginados?cursor=${cursor ?? ''}&limit=${limit}&q=${q}`);
}

}
