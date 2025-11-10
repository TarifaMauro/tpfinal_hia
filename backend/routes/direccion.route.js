const express = require('express');
const direccionCtrl = require('./../controllers_sql/direccion.controller');

const router = express.Router();

router.post('/',
	/*
		#swagger.path = '/api/direccion'
		#swagger.tags = ['Direcciones']
		#swagger.summary = 'Crear dirección'
		#swagger.description = 'Crea una nueva dirección para un usuario.'
	*/
	direccionCtrl.createDireccion
);

router.get('/',
	/*
		#swagger.path = '/api/direccion'
		#swagger.tags = ['Direcciones']
		#swagger.summary = 'Listar direcciones'
	*/
	direccionCtrl.getDirecciones
);

router.get('/:id',
	/*
		#swagger.path = '/api/direccion/{id}'
		#swagger.tags = ['Direcciones']
		#swagger.summary = 'Obtener dirección por ID'
	*/
	direccionCtrl.getDireccionById
);

router.put('/:id',
	/*
		#swagger.path = '/api/direccion/{id}'
		#swagger.tags = ['Direcciones']
		#swagger.summary = 'Actualizar dirección'
	*/
	direccionCtrl.updateDireccion
);

router.delete('/:id',
	/*
		#swagger.path = '/api/direccion/{id}'
		#swagger.tags = ['Direcciones']
		#swagger.summary = 'Eliminar dirección'
	*/
	direccionCtrl.deleteDireccion
);

module.exports = router;
