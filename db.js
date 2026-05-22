const mysql = require('mysql2');

// Configura a ligação ao MySQL do XAMPP
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'euroimport_db',
  port: 3306
});

connection.connect((err) => {
  if (err) {
    console.error('Erro ao ligar à base de dados: ' + err.stack);
    return;
  }
  console.log('Ligado à base de dados MySQL com sucesso!');
});

module.exports = connection;