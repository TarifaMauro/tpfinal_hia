const express = require('express');
const cuponCtrl = require('../controllers_sql/cupon.controller');

const router = express.Router();

router.post('/',
	/*
		#swagger.path = '/api/cupon'
		#swagger.tags = ['Cupones']
		#swagger.summary = 'Crear un nuevo cupón'
	*/
	cuponCtrl.createCupon
);

router.get('/',
	/*
		#swagger.path = '/api/cupon'
		#swagger.tags = ['Cupones']
		#swagger.summary = 'Obtener todos los cupones'
	*/
	cuponCtrl.getCupones
);

router.get('/codigo/:codigo',
	/*
		#swagger.path = '/api/cupon/codigo/{codigo}'
		#swagger.tags = ['Cupones']
		#swagger.summary = 'Obtener cupón por código'
	*/
	cuponCtrl.getCuponByCodigo
);

router.get('/:id',
	/*
		#swagger.path = '/api/cupon/{id}'
		#swagger.tags = ['Cupones']
		#swagger.summary = 'Obtener cupón por ID'
	*/
	cuponCtrl.getCuponById
);

router.put('/:id',
	/*
		#swagger.path = '/api/cupon/{id}'
		#swagger.tags = ['Cupones']
		#swagger.summary = 'Actualizar cupón por ID'
	*/
	cuponCtrl.updateCupon
);

router.delete('/:id',
	/*
		#swagger.path = '/api/cupon/{id}'
		#swagger.tags = ['Cupones']
		#swagger.summary = 'Eliminar cupón por ID'
	*/
	cuponCtrl.deleteCupon
);

router.post('/apply',
	/*
		#swagger.path = '/api/cupon/aplicar'
		#swagger.tags = ['Cupones']
		#swagger.summary = 'Aplicar cupón'
	*/
	cuponCtrl.applyCupon
);

module.exports = router;
