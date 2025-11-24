import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Producto, ProductoService } from '../../services/producto';
import { ProductoForm } from './producto-form/producto-form';
import { ToastrService } from 'ngx-toastr';
import { CategoriaForm } from './categoria-form/categoria-form';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subscription, switchMap, tap } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, ProductoForm, FormsModule, CategoriaForm, ReactiveFormsModule],
  templateUrl: './productos.html',
  styleUrls: ['./productos.css']
})
export class Productos implements OnInit, OnDestroy {
  // exponer Math para la plantilla AOT
  public Math = Math;

  productos: Producto[] = [];
  productoSeleccionado: Producto | null = null;
  busquedaControl = new FormControl('');
  private sub = new Subscription();

  // Paginación server-side
  page = 1;
  pageSize = 25;
  totalItems = 0;
  totalPages = 0;
  paginasArray: number[] = [];

  constructor(private productoService: ProductoService, private toastr: ToastrService) { }

  ngOnInit(): void {
    // búsqueda que consulta al backend (debounce)
    this.sub.add(
      this.busquedaControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => { this.page = 1; this.cargarProductos(); })
      ).subscribe()
    );

    this.cargarProductos();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  cargarProductos(): void {
    const q = (this.busquedaControl.value || '').toString().trim();
    this.productoService.obtenerProductosPaginados(this.page, this.pageSize, q).subscribe({
      next: (resp) => {
        this.productos = resp.items || [];
        this.totalItems = resp.total ?? 0;
        this.totalPages = Math.max(1, Math.ceil(this.totalItems / this.pageSize));
        if (this.page > this.totalPages) {
          this.page = this.totalPages;
          // recargar correctamente la página corregida
          this.cargarProductos();
          return;
        }
        this.generarPaginasArray();
      },
      error: () => {
        this.productos = [];
        this.totalItems = 0;
        this.totalPages = 0;
        this.paginasArray = [];
      }
    });
  }

  cambiarPagina(n: number) {
    if (n < 1) n = 1;
    if (n > this.totalPages) n = this.totalPages;
    this.page = n;
    this.cargarProductos();
  }

  cambiarTamPagina() {
    this.page = 1;
    this.cargarProductos();
  }

  generarPaginasArray() {
    const maxBotones = 10;
    const paginas: number[] = [];
    let start = Math.max(1, this.page - Math.floor(maxBotones / 2));
    let end = Math.min(this.totalPages, start + maxBotones - 1);
    if (end - start < maxBotones - 1) {
      start = Math.max(1, end - maxBotones + 1);
    }
    for (let i = start; i <= end; i++) paginas.push(i);
    this.paginasArray = paginas;
  }

  abrirModal(producto?: Producto): void {
    this.productoSeleccionado = producto ?? null;
  }

  cerrarModal(): void {
    this.productoSeleccionado = null;
  }

  guardarProducto(productoForm: FormData) {
    if (this.productoSeleccionado) {
      // editar: recargar la página actual al completarse
      this.productoService.actualizarProducto(this.productoSeleccionado._id, productoForm).subscribe({
        next: () => {
          this.toastr.success('Producto actualizado con éxito');
          this.cerrarModal();
          this.cargarProductos();
        },
        error: (err) => {
          this.toastr.error(err?.error?.msg ?? 'Error al actualizar el producto');
        }
      });
    } else {
      // crear: recargar (o navegar a la última página si prefieres)
      this.productoService.crearProducto(productoForm).subscribe({
        next: () => {
          this.toastr.success('Producto creado con éxito');
          this.cerrarModal();
          this.cargarProductos();
        },
        error: (err) => {
          this.toastr.error(err?.error?.msg ?? 'Error al crear el producto');
        }
      });
    }
  }

  eliminarProducto(id: string): void {
    Swal.fire({
      title: '¿Eliminar producto?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00bcd4',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.productoService.eliminarProducto(id).subscribe({
          next: () => {
            this.toastr.success('Producto eliminado con éxito');
            // recargar página actual (backend ya refleja el cambio)
            this.cargarProductos();
          },
          error: () => this.toastr.error('Error al eliminar Producto')
        });
      }
    });
  }

  // mantener los métodos actualizar/crear si los usa otra parte
  actualizarProducto(id: string, productoActualizado: FormData): void {
    this.productoService.actualizarProducto(id, productoActualizado).subscribe({
      next: () => this.cargarProductos(),
      error: (err) => console.error(err)
    });
  }

  crearProducto(nuevoProducto: FormData): void {
    this.productoService.crearProducto(nuevoProducto).subscribe({
      next: () => this.cargarProductos(),
      error: (err) => console.error(err)
    });
  }
}
