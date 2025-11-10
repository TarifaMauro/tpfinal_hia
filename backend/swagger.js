const swaggerAutogen = require('swagger-autogen')();

const doc = {
    info: {
        title: 'E-commerce - PG only',
        description: 'API documentación (versión PG-only)'
    },
    host: `localhost:3001`,
    basePath: '/',
    schemes: ['http']
};

const outputFile = './swagger_output.json';
const endpointsFiles = ['./index.js'];

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log('Swagger generated');
});
