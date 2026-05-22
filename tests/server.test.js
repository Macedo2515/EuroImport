const request = require('supertest');
const express = require('express');
const session = require('express-session');

jest.mock('../db', () => {
    const mockQuery = jest.fn();
    return { query: mockQuery };
});

const db = require('../db');

function criarApp() {
    const app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use(session({ secret: 'test_secret', resave: false, saveUninitialized: false }));

    app.get('/api/me', (req, res) => {
        if (req.session.user) res.json({ logado: true, ...req.session.user });
        else res.json({ logado: false });
    });

    app.post('/login', (req, res) => {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ erro: 'Preenche todos os campos!' });
        db.query("SELECT * FROM utilizadores WHERE email = ?", [email], async (err, results) => {
            if (err) return res.status(500).json({ erro: 'Erro no servidor' });
            if (results.length === 0) return res.status(401).json({ erro: 'Credenciais inválidas' });
            req.session.user = { id: results[0].id, nome: results[0].nome, email: results[0].email, tipo: results[0].tipo };
            res.json({ sucesso: true, tipo: results[0].tipo });
        });
    });

    app.post('/register', (req, res) => {
        const { nome, email, password, tipo } = req.body;
        if (!nome || !email || !password) return res.status(400).json({ erro: 'Preenche todos os campos!' });
        db.query("INSERT INTO utilizadores (nome, email, password, tipo) VALUES (?, ?, ?, ?)",
            [nome, email, password, tipo || 'cliente'], (err) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Email já registado' });
                    return res.status(500).json({ erro: 'Erro ao registar' });
                }
                res.json({ sucesso: true });
            });
    });

    app.get('/api/negocios', (req, res) => {
        if (!req.session.user) return res.status(401).json({ erro: 'Não autenticado' });
        db.query("SELECT * FROM negocios", [], (err, results) => {
            if (err) return res.status(500).json({ erro: err.message });
            res.json(results);
        });
    });

    app.post('/api/negocios', (req, res) => {
        if (!req.session.user) return res.status(401).json({ erro: 'Não autenticado' });
        const { veiculo } = req.body;
        if (!veiculo) return res.status(400).json({ erro: 'Veículo obrigatório' });
        const codigo = 'EI-TEST';
        db.query("INSERT INTO negocios (codigo, cliente_id, veiculo, estado) VALUES (?, ?, ?, 'submetido')",
            [codigo, req.session.user.id, veiculo], (err) => {
                if (err) return res.status(500).json({ erro: err.message });
                res.json({ sucesso: true, codigo });
            });
    });

    app.get('/api/notificacoes', (req, res) => {
        if (!req.session.user) return res.status(401).json({ erro: 'Não autenticado' });
        db.query("SELECT * FROM notificacoes WHERE utilizador_id = ?", [req.session.user.id], (err, results) => {
            if (err) return res.status(500).json({ erro: err.message });
            res.json(results);
        });
    });

    app.get('/logout', (req, res) => { req.session.destroy(); res.json({ sucesso: true }); });

    app.get('/api/inventario', (req, res) => {
        db.query("SELECT * FROM inventario WHERE estado = 'aprovado'", [], (err, results) => {
            if (err) return res.status(500).json({ erro: err.message });
            res.json(results);
        });
    });

    app.get('/api/inventario/pendentes', (req, res) => {
        if (!req.session.user) return res.status(401).json({ erro: 'Não autenticado' });
        db.query("SELECT * FROM inventario WHERE estado = 'pendente'", [], (err, results) => {
            if (err) return res.status(500).json({ erro: err.message });
            res.json(results);
        });
    });

    app.get('/api/inventario/aguardando-direcao', (req, res) => {
        if (!req.session.user) return res.status(401).json({ erro: 'Não autenticado' });
        db.query("SELECT * FROM inventario WHERE estado = 'aguardando_direcao'", [], (err, results) => {
            if (err) return res.status(500).json({ erro: err.message });
            res.json(results);
        });
    });

    app.post('/api/inventario', (req, res) => {
        if (!req.session.user) return res.status(401).json({ erro: 'Não autenticado' });
        const { veiculo, preco } = req.body;
        if (!veiculo || !preco) return res.status(400).json({ erro: 'Campos obrigatórios em falta' });
        db.query("INSERT INTO inventario (veiculo, preco, estado) VALUES (?, ?, 'pendente')", [veiculo, preco], (err) => {
            if (err) return res.status(500).json({ erro: err.message });
            res.json({ sucesso: true });
        });
    });

    app.put('/api/inventario/:id/estado', (req, res) => {
        if (!req.session.user) return res.status(401).json({ erro: 'Não autenticado' });
        const { estado } = req.body;
        if (!estado) return res.status(400).json({ erro: 'Estado obrigatório' });
        db.query("UPDATE inventario SET estado = ? WHERE id = ?", [estado, req.params.id], (err) => {
            if (err) return res.status(500).json({ erro: err.message });
            res.json({ sucesso: true });
        });
    });

    app.delete('/api/inventario/:id', (req, res) => {
        if (!req.session.user) return res.status(401).json({ erro: 'Não autenticado' });
        db.query("DELETE FROM inventario WHERE id = ?", [req.params.id], (err) => {
            if (err) return res.status(500).json({ erro: err.message });
            res.json({ sucesso: true });
        });
    });

    return app;
}

describe('Euroimport Motors — Testes Automáticos', () => {
    let app;
    beforeEach(() => { app = criarApp(); jest.clearAllMocks(); });

    describe('Autenticação', () => {
        test('GET /api/me — utilizador não autenticado', async () => {
            const res = await request(app).get('/api/me');
            expect(res.statusCode).toBe(200);
            expect(res.body.logado).toBe(false);
        });
        test('POST /login — campos vazios retorna erro 400', async () => {
            const res = await request(app).post('/login').send({ email: '', password: '' });
            expect(res.statusCode).toBe(400);
        });
        test('POST /login — credenciais inválidas retorna erro 401', async () => {
            db.query.mockImplementation((sql, params, cb) => cb(null, []));
            const res = await request(app).post('/login').send({ email: 'nao@existe.com', password: '123' });
            expect(res.statusCode).toBe(401);
        });
        test('POST /login — login bem sucedido retorna sucesso', async () => {
            db.query.mockImplementation((sql, params, cb) =>
                cb(null, [{ id: 1, nome: 'Admin', email: 'admin@teste.com', password: '123', tipo: 'administrador' }])
            );
            const res = await request(app).post('/login').send({ email: 'admin@teste.com', password: '123' });
            expect(res.statusCode).toBe(200);
            expect(res.body.sucesso).toBe(true);
            expect(res.body.tipo).toBe('administrador');
        });
        test('POST /register — campos vazios retorna erro 400', async () => {
            const res = await request(app).post('/register').send({ nome: '', email: '', password: '' });
            expect(res.statusCode).toBe(400);
        });
        test('POST /register — registo bem sucedido', async () => {
            db.query.mockImplementation((sql, params, cb) => cb(null, { insertId: 5 }));
            const res = await request(app).post('/register').send({ nome: 'Teste', email: 'novo@teste.com', password: '123', tipo: 'cliente' });
            expect(res.statusCode).toBe(200);
            expect(res.body.sucesso).toBe(true);
        });
        test('POST /register — email duplicado retorna erro 409', async () => {
            db.query.mockImplementation((sql, params, cb) => cb({ code: 'ER_DUP_ENTRY' }));
            const res = await request(app).post('/register').send({ nome: 'Teste', email: 'existente@teste.com', password: '123' });
            expect(res.statusCode).toBe(409);
        });
        test('GET /logout — termina sessão', async () => {
            const res = await request(app).get('/logout');
            expect(res.statusCode).toBe(200);
            expect(res.body.sucesso).toBe(true);
        });
    });

    describe('Negócios', () => {
        test('GET /api/negocios — sem autenticação retorna 401', async () => {
            const res = await request(app).get('/api/negocios');
            expect(res.statusCode).toBe(401);
        });
        test('GET /api/negocios — autenticado retorna lista', async () => {
            const agent = request.agent(app);
            db.query.mockImplementationOnce((sql, params, cb) =>
                cb(null, [{ id: 1, nome: 'Cliente', email: 'c@c.com', password: '123', tipo: 'cliente' }])
            );
            await agent.post('/login').send({ email: 'c@c.com', password: '123' });
            db.query.mockImplementation((sql, params, cb) =>
                cb(null, [{ id: 1, codigo: 'EI-0001', veiculo: 'BMW', estado: 'submetido' }])
            );
            const res = await agent.get('/api/negocios');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
        test('POST /api/negocios — sem autenticação retorna 401', async () => {
            const res = await request(app).post('/api/negocios').send({ veiculo: 'BMW' });
            expect(res.statusCode).toBe(401);
        });
        test('POST /api/negocios — sem veículo retorna erro 400', async () => {
            const agent = request.agent(app);
            db.query.mockImplementationOnce((sql, params, cb) =>
                cb(null, [{ id: 1, nome: 'Cliente', email: 'c@c.com', password: '123', tipo: 'cliente' }])
            );
            await agent.post('/login').send({ email: 'c@c.com', password: '123' });
            const res = await agent.post('/api/negocios').send({ veiculo: '' });
            expect(res.statusCode).toBe(400);
        });
        test('POST /api/negocios — cria negócio com sucesso', async () => {
            const agent = request.agent(app);
            db.query.mockImplementationOnce((sql, params, cb) =>
                cb(null, [{ id: 1, nome: 'Cliente', email: 'c@c.com', password: '123', tipo: 'cliente' }])
            );
            await agent.post('/login').send({ email: 'c@c.com', password: '123' });
            db.query.mockImplementationOnce((sql, params, cb) => cb(null, { insertId: 1 }));
            const res = await agent.post('/api/negocios').send({ veiculo: 'BMW Serie 3 2022' });
            expect(res.statusCode).toBe(200);
            expect(res.body.sucesso).toBe(true);
        });
    });

    describe('Notificações', () => {
        test('GET /api/notificacoes — sem autenticação retorna 401', async () => {
            const res = await request(app).get('/api/notificacoes');
            expect(res.statusCode).toBe(401);
        });
        test('GET /api/notificacoes — autenticado retorna lista', async () => {
            const agent = request.agent(app);
            db.query.mockImplementationOnce((sql, params, cb) =>
                cb(null, [{ id: 1, nome: 'Cliente', email: 'c@c.com', password: '123', tipo: 'cliente' }])
            );
            await agent.post('/login').send({ email: 'c@c.com', password: '123' });
            db.query.mockImplementationOnce((sql, params, cb) =>
                cb(null, [{ id: 1, utilizador_id: 1, mensagem: 'Pedido submetido', data_criacao: new Date() }])
            );
            const res = await agent.get('/api/notificacoes');
            expect(res.statusCode).toBe(200);
            expect(res.body[0].mensagem).toBe('Pedido submetido');
        });
    });

    describe('Inventário', () => {
        test('GET /api/inventario — retorna catálogo público sem autenticação', async () => {
            db.query.mockImplementation((sql, params, cb) =>
                cb(null, [{ id: 1, veiculo: 'Porsche 911', preco: 234900, estado: 'aprovado' }])
            );
            const res = await request(app).get('/api/inventario');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
        test('GET /api/inventario/pendentes — sem autenticação retorna 401', async () => {
            const res = await request(app).get('/api/inventario/pendentes');
            expect(res.statusCode).toBe(401);
        });
        test('GET /api/inventario/pendentes — autenticado retorna lista', async () => {
            const agent = request.agent(app);
            db.query.mockImplementationOnce((sql, params, cb) =>
                cb(null, [{ id: 1, nome: 'Admin', email: 'a@a.com', password: '123', tipo: 'administrador' }])
            );
            await agent.post('/login').send({ email: 'a@a.com', password: '123' });
            db.query.mockImplementationOnce((sql, params, cb) =>
                cb(null, [{ id: 1, veiculo: 'BMW M3', preco: 95000, estado: 'pendente' }])
            );
            const res = await agent.get('/api/inventario/pendentes');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
        test('GET /api/inventario/aguardando-direcao — sem autenticação retorna 401', async () => {
            const res = await request(app).get('/api/inventario/aguardando-direcao');
            expect(res.statusCode).toBe(401);
        });
        test('POST /api/inventario — sem autenticação retorna 401', async () => {
            const res = await request(app).post('/api/inventario').send({ veiculo: 'BMW', preco: 50000 });
            expect(res.statusCode).toBe(401);
        });
        test('POST /api/inventario — campos obrigatórios em falta retorna 400', async () => {
            const agent = request.agent(app);
            db.query.mockImplementationOnce((sql, params, cb) =>
                cb(null, [{ id: 4, nome: 'Func', email: 'f@f.com', password: '123', tipo: 'funcionario' }])
            );
            await agent.post('/login').send({ email: 'f@f.com', password: '123' });
            const res = await agent.post('/api/inventario').send({ veiculo: '', preco: '' });
            expect(res.statusCode).toBe(400);
        });
        test('POST /api/inventario — adiciona veículo com sucesso', async () => {
            const agent = request.agent(app);
            db.query.mockImplementationOnce((sql, params, cb) =>
                cb(null, [{ id: 4, nome: 'Func', email: 'f@f.com', password: '123', tipo: 'funcionario' }])
            );
            await agent.post('/login').send({ email: 'f@f.com', password: '123' });
            db.query.mockImplementationOnce((sql, params, cb) => cb(null, { insertId: 1 }));
            const res = await agent.post('/api/inventario').send({ veiculo: 'Porsche 911 GT3', preco: 180000 });
            expect(res.statusCode).toBe(200);
            expect(res.body.sucesso).toBe(true);
        });
        test('PUT /api/inventario/:id/estado — sem autenticação retorna 401', async () => {
            const res = await request(app).put('/api/inventario/1/estado').send({ estado: 'aprovado' });
            expect(res.statusCode).toBe(401);
        });
        test('PUT /api/inventario/:id/estado — atualiza estado com sucesso', async () => {
            const agent = request.agent(app);
            db.query.mockImplementationOnce((sql, params, cb) =>
                cb(null, [{ id: 2, nome: 'Dir', email: 'd@d.com', password: '123', tipo: 'direcao' }])
            );
            await agent.post('/login').send({ email: 'd@d.com', password: '123' });
            db.query.mockImplementationOnce((sql, params, cb) => cb(null, { affectedRows: 1 }));
            const res = await agent.put('/api/inventario/1/estado').send({ estado: 'aprovado' });
            expect(res.statusCode).toBe(200);
            expect(res.body.sucesso).toBe(true);
        });
        test('DELETE /api/inventario/:id — sem autenticação retorna 401', async () => {
            const res = await request(app).delete('/api/inventario/1');
            expect(res.statusCode).toBe(401);
        });
        test('DELETE /api/inventario/:id — remove veículo com sucesso', async () => {
            const agent = request.agent(app);
            db.query.mockImplementationOnce((sql, params, cb) =>
                cb(null, [{ id: 4, nome: 'Func', email: 'f@f.com', password: '123', tipo: 'funcionario' }])
            );
            await agent.post('/login').send({ email: 'f@f.com', password: '123' });
            db.query.mockImplementationOnce((sql, params, cb) => cb(null, { affectedRows: 1 }));
            const res = await agent.delete('/api/inventario/1');
            expect(res.statusCode).toBe(200);
            expect(res.body.sucesso).toBe(true);
        });
    });
});