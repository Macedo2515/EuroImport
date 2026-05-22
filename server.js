const express = require('express');
const app = express();
const path = require('path');
const db = require('./db');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const PORT = 3000;

// --- CONFIGURAÇÃO EMAIL ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'euro.importof@gmail.com',
        pass: 'djlpdgxadthbbomc'
    }
});

// Upload de ficheiros
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'euroimport_secret',
    resave: false,
    saveUninitialized: false
}));

// --- ROTAS DE NAVEGAÇÃO ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'Pages', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'Pages', 'register.html')));
app.get('/dashboard', (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'Pages', `dashboard-${req.session.user.tipo}.html`));
});

// --- API ME ---
app.get('/api/me', (req, res) => {
    if (req.session.user) res.json({ logado: true, ...req.session.user });
    else res.json({ logado: false });
});

app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/'); });

// --- NOTIFICAÇÃO HELPER ---
function notificar(utilizador_id, mensagem) {
    db.query("INSERT INTO notificacoes (utilizador_id, mensagem) VALUES (?, ?)", [utilizador_id, mensagem]);
}

function notificarTipo(tipo, mensagem) {
    db.query("SELECT id FROM utilizadores WHERE tipo = ?", [tipo], (err, rows) => {
        rows?.forEach(u => notificar(u.id, mensagem));
    });
}

// --- RECUPERAÇÃO DE PASSWORD ---
app.post('/api/recuperar-password', (req, res) => {
    const { email } = req.body;
    if (!email) return res.json({ erro: 'Email obrigatório' });

    db.query("SELECT * FROM utilizadores WHERE email = ?", [email], async (err, results) => {
        if (err) return res.json({ erro: 'Erro no servidor' });
        if (results.length === 0) return res.json({ erro: 'Email não encontrado' });

        const novaPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
        const hash = await bcrypt.hash(novaPassword, 10);

        db.query("UPDATE utilizadores SET password = ? WHERE email = ?", [hash, email], async (err2) => {
            if (err2) return res.json({ erro: 'Erro ao atualizar password' });
            try {
                await transporter.sendMail({
                    from: '"Euroimport Motors" <euro.importof@gmail.com>',
                    to: email,
                    subject: 'Recuperação de Password — Euroimport Motors',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #eee; border-radius: 10px;">
                            <h2 style="color:#0b1c3f;">Recuperação de Password</h2>
                            <p>Olá <strong>${results[0].nome}</strong>,</p>
                            <p>A tua nova password é:</p>
                            <div style="background:#f4f6f9; padding:15px; border-radius:8px; font-size:20px; font-weight:bold; letter-spacing:2px; text-align:center; color:#0b1c3f; margin:20px 0;">
                                ${novaPassword}
                            </div>
                            <p>Por segurança, altera esta password após o login.</p>
                            <p style="color:#888; font-size:12px;">Euroimport Motors — Importação de Veículos Premium</p>
                        </div>
                    `
                });
                res.json({ sucesso: true });
            } catch (emailErr) {
                res.json({ erro: 'Erro ao enviar email. Tenta novamente.' });
            }
        });
    });
});

// --- API NEGÓCIOS ---
app.get('/api/negocios', (req, res) => {
    if (!req.session.user) return res.status(401).json({ erro: 'Não autenticado' });
    const { tipo, id } = req.session.user;
    let sql, params = [];
    if (tipo === 'cliente') {
        sql = `SELECT n.*, u.nome as cliente_nome FROM negocios n JOIN utilizadores u ON n.cliente_id = u.id WHERE n.cliente_id = ? ORDER BY n.data_criacao DESC`;
        params = [id];
    } else {
        sql = `SELECT n.*, u.nome as cliente_nome FROM negocios n JOIN utilizadores u ON n.cliente_id = u.id ORDER BY n.data_criacao DESC`;
    }
    db.query(sql, params, (err, results) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(results);
    });
});

app.post('/api/negocios', (req, res) => {
    if (!req.session.user) return res.status(401).json({ erro: 'Não autenticado' });
    const { veiculo } = req.body;
    const cliente_id = req.session.user.id;
    const codigo = 'EI-' + String(Date.now()).slice(-4);
    db.query("INSERT INTO negocios (codigo, cliente_id, veiculo, estado) VALUES (?, ?, ?, 'submetido')",
        [codigo, cliente_id, veiculo], (err) => {
            if (err) return res.status(500).json({ erro: err.message });
            notificarTipo('funcionario', `Novo pedido ${codigo} recebido — ${veiculo}`);
            notificarTipo('administrador', `Novo pedido ${codigo} recebido — ${veiculo}`);
            notificar(cliente_id, `O seu pedido ${codigo} foi submetido com sucesso`);
            res.json({ sucesso: true, codigo });
        });
});

app.put('/api/negocios/:id/estado', (req, res) => {
    if (!req.session.user) return res.status(401).json({ erro: 'Não autenticado' });
    const { estado, comentario, preco, preco_sinal, preco_final, motivo_renegociacao, motivo_rejeicao, documentos_validados } = req.body;

    db.query(`UPDATE negocios SET 
        estado = ?,
        comentario = COALESCE(?, comentario),
        preco = COALESCE(?, preco),
        preco_sinal = COALESCE(?, preco_sinal),
        preco_final = COALESCE(?, preco_final),
        motivo_renegociacao = COALESCE(?, motivo_renegociacao),
        motivo_rejeicao = COALESCE(?, motivo_rejeicao),
        documentos_validados = COALESCE(?, documentos_validados)
        WHERE id = ?`,
        [estado, comentario, preco, preco_sinal, preco_final, motivo_renegociacao, motivo_rejeicao, documentos_validados, req.params.id],
        (err) => {
            if (err) return res.status(500).json({ erro: err.message });
            db.query("SELECT n.*, u.id as uid, u.nome FROM negocios n JOIN utilizadores u ON n.cliente_id = u.id WHERE n.id = ?",
                [req.params.id], (err2, rows) => {
                    if (rows && rows[0]) {
                        const n = rows[0];
                        const msgs = {
                            documentos_solicitados: `Documentos solicitados para o pedido ${n.codigo}`,
                            documentos_recebidos: `Documentos recebidos para o pedido ${n.codigo}`,
                            proposta_criada: `Proposta criada para o pedido ${n.codigo}`,
                            aguardando_decisao_direcao: `Pedido ${n.codigo} aguarda decisão da Direção`,
                            renegociacao: `Pedido ${n.codigo} enviado para renegociação`,
                            proposta_enviada: `Proposta de valores enviada para o pedido ${n.codigo}`,
                            proposta_aceite: `Proposta aceite para o pedido ${n.codigo}`,
                            pagamento_sinal: `Pagamento de sinal confirmado para ${n.codigo}`,
                            em_importacao: `Importação iniciada para o pedido ${n.codigo}`,
                            pagamento_final: `Pagamento final confirmado para ${n.codigo}`,
                            concluido: `Processo ${n.codigo} concluído com sucesso!`,
                            cancelado: `Pedido ${n.codigo} foi cancelado`
                        };
                        if (msgs[estado]) {
                            notificar(n.uid, msgs[estado]);
                            notificarTipo('funcionario', msgs[estado]);
                            notificarTipo('administrador', msgs[estado]);
                            notificarTipo('direcao', msgs[estado]);
                        }
                    }
                });
            res.json({ sucesso: true });
        });
});

// --- UPLOAD DOCUMENTOS ---
app.post('/api/documentos/:negocio_id', upload.single('documento'), (req, res) => {
    if (!req.session.user) return res.status(401).json({ erro: 'Não autenticado' });
    const { negocio_id } = req.params;
    db.query("INSERT INTO documentos (negocio_id, nome, caminho) VALUES (?, ?, ?)",
        [negocio_id, req.file.originalname, req.file.filename], (err) => {
            if (err) return res.status(500).json({ erro: err.message });
            db.query("UPDATE negocios SET estado = 'documentos_recebidos' WHERE id = ?", [negocio_id]);
            notificarTipo('funcionario', `Documentos enviados para o negócio #${negocio_id}`);
            res.json({ sucesso: true });
        });
});

app.get('/api/documentos/:negocio_id', (req, res) => {
    db.query("SELECT * FROM documentos WHERE negocio_id = ?", [req.params.negocio_id], (err, results) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(results);
    });
});

// --- PAGAMENTOS ---
app.put('/api/negocios/:id/pagar-sinal', (req, res) => {
    db.query("UPDATE negocios SET sinal_pago = 1, estado = 'pagamento_sinal' WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ erro: err.message });
        notificarTipo('funcionario', `Sinal pago para negócio #${req.params.id}`);
        res.json({ sucesso: true });
    });
});

app.put('/api/negocios/:id/pagar-final', (req, res) => {
    db.query("UPDATE negocios SET pagamento_final_pago = 1, estado = 'pagamento_final' WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ erro: err.message });
        notificarTipo('funcionario', `Pagamento final recebido para negócio #${req.params.id}`);
        res.json({ sucesso: true });
    });
});

// --- NOTIFICAÇÕES ---
app.get('/api/notificacoes', (req, res) => {
    if (!req.session.user) return res.status(401).json({ erro: 'Não autenticado' });
    db.query("SELECT * FROM notificacoes WHERE utilizador_id = ? ORDER BY data_criacao DESC LIMIT 15",
        [req.session.user.id], (err, results) => {
            if (err) return res.status(500).json({ erro: err.message });
            res.json(results);
        });
});

// --- INVENTÁRIO ---
// POST — funcionário submete veículo (fica pendente)
app.post('/api/inventario', upload.single('foto'), (req, res) => {
    if (!req.session.user) return res.status(401).json({ erro: 'Não autenticado' });
    const { veiculo, preco, stock, km, cv, ano } = req.body;
    if (!veiculo || !preco) return res.status(400).json({ erro: 'Campos obrigatórios em falta' });
    const foto = req.file ? req.file.filename : null;
    const funcionario_id = req.session.user.id;
    db.query("INSERT INTO inventario (veiculo, preco, stock, foto, km, cv, estado, funcionario_id) VALUES (?, ?, ?, ?, ?, ?, 'pendente', ?)",
        [veiculo, preco, 'disponivel', foto, km || null, cv || null, funcionario_id], (err) => {
            if (err) return res.status(500).json({ erro: err.message });
            notificarTipo('administrador', `Novo veículo submetido para aprovação: ${veiculo}`);
            res.json({ sucesso: true });
        });
});

// GET — catálogo público (apenas aprovados)
app.get('/api/inventario', (req, res) => {
    db.query("SELECT * FROM inventario WHERE estado = 'aprovado' ORDER BY data_adicao DESC", (err, results) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(results);
    });
});

// GET — veículos pendentes (para administrador)
app.get('/api/inventario/pendentes', (req, res) => {
    if (!req.session.user) return res.status(401).json({ erro: 'Não autenticado' });
    db.query("SELECT i.*, u.nome as funcionario_nome FROM inventario i LEFT JOIN utilizadores u ON i.funcionario_id = u.id WHERE i.estado = 'pendente' ORDER BY i.data_adicao DESC", (err, results) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(results);
    });
});

// GET — veículos aguardando direção
app.get('/api/inventario/aguardando-direcao', (req, res) => {
    if (!req.session.user) return res.status(401).json({ erro: 'Não autenticado' });
    db.query("SELECT i.*, u.nome as funcionario_nome FROM inventario i LEFT JOIN utilizadores u ON i.funcionario_id = u.id WHERE i.estado = 'aguardando_direcao' ORDER BY i.data_adicao DESC", (err, results) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json(results);
    });
});

// PUT — atualizar estado do inventário
app.put('/api/inventario/:id/estado', (req, res) => {
    if (!req.session.user) return res.status(401).json({ erro: 'Não autenticado' });
    const { estado } = req.body;
    db.query("SELECT i.*, u.id as func_id FROM inventario i LEFT JOIN utilizadores u ON i.funcionario_id = u.id WHERE i.id = ?",
        [req.params.id], (err, rows) => {
            if (err || !rows[0]) return res.status(500).json({ erro: 'Veículo não encontrado' });
            const v = rows[0];
            db.query("UPDATE inventario SET estado = ? WHERE id = ?", [estado, req.params.id], (err2) => {
                if (err2) return res.status(500).json({ erro: err2.message });
                if (estado === 'aguardando_direcao') {
                    notificarTipo('direcao', `Veículo ${v.veiculo} aguarda aprovação da Direção`);
                } else if (estado === 'aprovado') {
                    if (v.func_id) notificar(v.func_id, `O veículo ${v.veiculo} foi aprovado e publicado no catálogo!`);
                    notificarTipo('funcionario', `Veículo ${v.veiculo} aprovado e publicado no catálogo`);
                } else if (estado === 'rejeitado') {
                    if (v.func_id) notificar(v.func_id, `O veículo ${v.veiculo} foi rejeitado`);
                }
                res.json({ sucesso: true });
            });
        });
});

// --- FORMULÁRIO DE CONTACTO ---
app.post('/api/contacto', async (req, res) => {
    const { nome, email, telefone, origem, mensagem } = req.body;
    if (!nome || !email || !mensagem) return res.json({ erro: 'Preenche todos os campos obrigatórios' });
    try {
        await transporter.sendMail({
            from: '"Euroimport Motors" <euro.importof@gmail.com>',
            to: 'euro.importof@gmail.com',
            subject: `Nova mensagem de contacto — ${nome}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 30px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color:#0b1c3f;">Nova Mensagem de Contacto</h2>
                    <p><strong>Nome:</strong> ${nome}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Telefone:</strong> ${telefone}</p>
                    <p><strong>Como nos conheceu:</strong> ${origem}</p>
                    <p><strong>Mensagem:</strong></p>
                    <div style="background:#f4f6f9; padding:15px; border-radius:8px; color:#0b1c3f;">${mensagem}</div>
                </div>
            `
        });
        res.json({ sucesso: true });
    } catch (err) {
        res.json({ erro: 'Erro ao enviar mensagem.' });
    }
});

// --- PEDIDO DE PROPOSTA ---
app.post('/api/proposta', async (req, res) => {
    const { nome, email, marca, modelo, ano, orcamento, observacoes } = req.body;
    if (!nome || !email) return res.json({ erro: 'Nome e email obrigatórios' });
    try {
        await transporter.sendMail({
            from: '"Euroimport Motors" <euro.importof@gmail.com>',
            to: 'euro.importof@gmail.com',
            subject: `Nova Proposta — ${nome} — ${marca} ${modelo}`,
            html: `
                <div style="font-family:Arial,sans-serif;max-width:500px;padding:30px;border:1px solid #eee;border-radius:10px;">
                    <h2 style="color:#0b1c3f;">Novo Pedido de Proposta</h2>
                    <p><strong>Nome:</strong> ${nome}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Marca:</strong> ${marca || 'Não especificado'}</p>
                    <p><strong>Modelo:</strong> ${modelo || 'Não especificado'}</p>
                    <p><strong>Ano Mínimo:</strong> ${ano || 'Não especificado'}</p>
                    <p><strong>Orçamento:</strong> ${orcamento || 'Não especificado'}</p>
                    <p><strong>Observações:</strong> ${observacoes || 'Nenhuma'}</p>
                </div>
            `
        });
        res.json({ sucesso: true });
    } catch (err) {
        res.json({ erro: 'Erro ao enviar proposta.' });
    }
});

// --- REGISTER & LOGIN ---
app.post('/register', async (req, res) => {
    const { nome, email, password, tipo } = req.body;
    if (!nome || !email || !password) {
        return res.send("<script>alert('Preenche todos os campos!'); window.history.back();</script>");
    }
    try {
        const hash = await bcrypt.hash(password, 10);
        db.query("INSERT INTO utilizadores (nome, email, password, tipo) VALUES (?, ?, ?, ?)",
            [nome, email, hash, tipo || 'cliente'], (err) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.send("<script>alert('Este email já está registado!'); window.history.back();</script>");
                    }
                    return res.send("<script>alert('Erro ao registar!'); window.history.back();</script>");
                }
                res.send("<script>alert('Conta criada com sucesso!'); window.location.href='/login';</script>");
            });
    } catch (err) {
        res.send("<script>alert('Erro ao processar registo!'); window.history.back();</script>");
    }
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.send("<script>alert('Preenche todos os campos!'); window.history.back();</script>");
    }
    db.query("SELECT * FROM utilizadores WHERE email = ?",   [email], async (err, results) => {
        if (err) return res.send("<script>alert('Erro no servidor'); window.history.back();</script>");
        if (results.length === 0) {
            return res.send("<script>alert('Email ou Password incorretos!'); window.history.back();</script>");
        }
        const utilizador = results[0];
        try {
            const match = await bcrypt.compare(password, utilizador.password);
            if (match) {
                req.session.user = {
                    id: utilizador.id,
                    nome: utilizador.nome,
                    email: utilizador.email,
                    tipo: utilizador.tipo
                };
                res.send("<script>window.location.href='/dashboard';</script>");
            } else {
                res.send("<script>alert('Email ou Password incorretos!'); window.history.back();</script>");
            }
        } catch (err) {
            res.send("<script>alert('Erro ao verificar credenciais!'); window.history.back();</script>");
        }
    });
});

// DELETE inventário
app.delete('/api/inventario/:id', (req, res) => {
    if (!req.session.user) return res.status(401).json({ erro: 'Não autenticado' });
    db.query("DELETE FROM inventario WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json({ sucesso: true });
    });
});


app.listen(PORT, () => {
    console.log(`\x1b[32m%s\x1b[0m`, `[SERVER] Servidor a correr em http://localhost:${PORT}`);
});