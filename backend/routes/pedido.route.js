const express = require('express');
const pedidoCtrl = require('../controllers_sql/pedido.controller');

const router = express.Router();

// Crear un nuevo pedido
router.post('/',
	/*
		#swagger.path = '/api/pedido'
		#swagger.tags = ['Pedidos']
		#swagger.summary = 'Crear un nuevo pedido'
		#swagger.description = 'Permite crear un nuevo pedido.'
		#swagger.consumes = ['application/json']
		#swagger.produces = ['application/json']
		#swagger.parameters['pedido'] = { in: 'body', required: true, description: 'Datos del nuevo pedido' }
		#swagger.responses[201] = { description: 'Pedido creado exitosamente', schema: { status: 'OK', pedido: {} } }
	*/
	pedidoCtrl.createPedido
);

router.get('/',
	/*
		#swagger.path = '/api/pedido'
		#swagger.tags = ['Pedidos']
		#swagger.summary = 'Obtener todos los pedidos'
		#swagger.description = 'Devuelve una lista de todos los pedidos.'
		#swagger.produces = ['application/json']
		#swagger.responses[200] = { description: 'Lista de pedidos obtenida exitosamente' }
	*/
	pedidoCtrl.getPedidos
);

router.get('/:id',
	/*
		#swagger.path = '/api/pedido/{id}'
		#swagger.tags = ['Pedidos']
		#swagger.summary = 'Obtener pedido por ID'
		#swagger.parameters['id'] = { in: 'path', required: true, description: 'ID del pedido', type: 'string' }
	*/
	pedidoCtrl.getPedidoById
);

router.get('/user/:id',
	/*
		#swagger.path = '/api/pedido/cliente/{id}'
		#swagger.tags = ['Pedidos']
		#swagger.summary = 'Obtener pedidos por ID de cliente'
		#swagger.parameters['id'] = { in: 'path', required: true, description: 'ID del cliente', type: 'string' }
	*/
	pedidoCtrl.getPedidoByUsserId
);

router.put('/:id',
	/*
		#swagger.path = '/api/pedido/{id}'
		#swagger.tags = ['Pedidos']
		#swagger.summary = 'Actualizar pedido por ID'
		#swagger.parameters['id'] = { in: 'path', required: true, description: 'ID del pedido', type: 'string' }
	*/
	pedidoCtrl.updatePedido
);

router.delete('/:id',
	/*
		#swagger.path = '/api/pedido/{id}'
		#swagger.tags = ['Pedidos']
		#swagger.summary = 'Eliminar pedido por ID'
		#swagger.parameters['id'] = { in: 'path', required: true, description: 'ID del pedido', type: 'string' }
	*/
	pedidoCtrl.deletePedido
);

module.exports = router;
