import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Producto, ProductoService } from '../../services/producto';
import { ProductoForm } from './producto-form/producto-form';
import { ToastrService } from 'ngx-toastr';
import { CategoriaForm } from './categoria-form/categoria-form';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subscription, tap } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-productos',
  standalone: true,
  imports: [CommonModule, ProductoForm, FormsModule, CategoriaForm, ReactiveFormsModule],
  templateUrl: './productos.html',
  styleUrls: ['./productos.css']
})
export class Productos implements OnInit, OnDestroy {

  productos: Producto[] = [];
  productoSeleccionado: Producto | null = null;
  busquedaControl = new FormControl('');
  private sub = new Subscription();

  // Cursor pagination
  cursor: number | null = null;
  limit = 25;
  hasNext = true;
  loading = false;

  constructor(private productoService: ProductoService, private toastr: ToastrService) {}

  ngOnInit(): void {
    // búsqueda con debounce -> reinicia todo
    this.sub.add(
      this.busquedaControl.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.resetAndLoad())
      ).subscribe()
    );

    this.resetAndLoad();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // Reiniciar cursor + productos
  resetAndLoad() {
    this.cursor = null;
    this.productos = [];
    this.hasNext = true;
    this.cargarProductos();
  }

  cargarProductos(): void {
    if (!this.hasNext || this.loading) return;

    this.loading = true;
    const q = (this.busquedaControl.value || '').toString().trim();

    this.productoService.obtenerProductosCursor(this.cursor, this.limit, q).subscribe({
      next: (resp) => {
        this.productos.push(...resp.items);
        this.cursor = resp.nextCursor;
        this.hasNext = resp.hasNext;
        this.loading = false;
      },
      error: () => {
        this.toastr.error('Error al cargar productos');
        this.loading = false;
      }
    });
  }

  // --------- CRUD ---------

  abrirModal(producto?: Producto): void {
    this.productoSeleccionado = producto ?? null;
  }

  cerrarModal(): void {
    this.productoSeleccionado = null;
  }

  guardarProducto(productoForm: FormData) {
    if (this.productoSeleccionado) {
      // actualizar
      this.productoService.actualizarProducto(this.productoSeleccionado._id, productoForm).subscribe({
        next: () => {
          this.toastr.success('Producto actualizado con éxito');
          this.cerrarModal();
          this.resetAndLoad();
        },
        error: (err) => {
          this.toastr.error(err?.error?.msg ?? 'Error al actualizar');
        }
      });

    } else {
      // crear
      this.productoService.crearProducto(productoForm).subscribe({
        next: () => {
          this.toastr.success('Producto creado con éxito');
          this.cerrarModal();
          this.resetAndLoad();
        },
        error: (err) => {
          this.toastr.error(err?.error?.msg ?? 'Error al crear');
        }
      });
    }
  }

  eliminarProducto(id: string) {
    Swal.fire({
      title: '¿Eliminar producto?',
      text: 'Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#00bcd4',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((r) => {
      if (r.isConfirmed) {
        this.productoService.eliminarProducto(id).subscribe({
          next: () => {
            this.toastr.success('Producto eliminado');
            this.resetAndLoad();
          },
          error: () => this.toastr.error('Error al eliminar')
        });
      }
    });
  }
}
