const express = require('express');
const categoriaCtrl = require('./../controllers_sql/categoria.controller');

const router = express.Router();

router.post('/',
	/*
		#swagger.path = '/api/categoria'
		#swagger.tags = ['Categorias']
		#swagger.summary = 'Crear categoría'
		#swagger.description = 'Crea una nueva categoría.'
		#swagger.consumes = ['application/json']
		#swagger.produces = ['application/json']
		#swagger.parameters['categoria'] = { in: 'body', required: true, description: 'Datos de la categoría', schema: { $nombre: 'Ropa' } }
		#swagger.responses[201] = { description: 'Categoría creada', schema: { status: 'OK', msg: 'Categoría creada' } }
	*/
	categoriaCtrl.createCategoria
);

router.get('/',
	/*
		#swagger.path = '/api/categoria'
		#swagger.tags = ['Categorias']
		#swagger.summary = 'Listar categorías'
		#swagger.description = 'Obtiene todas las categorías.'
		#swagger.produces = ['application/json']
		#swagger.responses[200] = { description: 'Categorías obtenidas', schema: { status: 'OK', categorias: [] } }
	*/
	categoriaCtrl.getCategorias
);

router.delete('/:id',
	/*
		#swagger.path = '/api/categoria/{id}'
		#swagger.tags = ['Categorias']
		#swagger.summary = 'Eliminar categoría'
		#swagger.description = 'Elimina una categoría por ID.'
		#swagger.parameters['id'] = { in: 'path', required: true, description: 'ID de la categoría', type: 'string' }
		#swagger.responses[200] = { description: 'Categoría eliminada', schema: { status: 'OK' } }
	*/
	categoriaCtrl.eliminarCategoria
);

module.exports = router;
