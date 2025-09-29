const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
// const bcrypt = require('bcrypt'); // Temporarily disabled

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Helper functions
function validateCPF(cpf) {
    // Basic CPF validation (11 digits)
    return /^\d{11}$/.test(cpf);
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
    // Basic phone validation (10-11 digits)
    return /^\d{10,11}$/.test(phone);
}

// Temporarily disabled password hashing
// async function hashPassword(password) {
//     const saltRounds = 10;
//     return await bcrypt.hash(password, saltRounds);
// }

// async function comparePassword(password, hash) {
//     return await bcrypt.compare(password, hash);
// }

// Função auxiliar para ler JSON
async function readJSON(filename) {
    try {
        const data = await fs.readFile(filename, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log(`Erro ao ler ${filename}:`, error.message);
        return [];
    }
}

// Função auxiliar para escrever JSON
async function writeJSON(filename, data) {
    try {
        await fs.writeFile(filename, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.log(`Erro ao escrever ${filename}:`, error.message);
        return false;
    }
}

// Rota para login
app.post('/api/login', async (req, res) => {
    const { login, senha } = req.body;

    // Validation
    if (!login || !senha) {
        return res.json({ success: false, message: 'Login e senha são obrigatórios!' });
    }

    try {
        // Buscar nos médicos
        const medicos = await readJSON('medicos.json');
        const medico = medicos.find(m => m.login === login);

        if (medico) {
            if (senha === medico.senha) {
                return res.json({
                    success: true,
                    user: { ...medico, tipo: 'medico', senha: undefined }
                });
            }
        }

        // Buscar nos usuários (tutores)
        const usuarios = await readJSON('usuarios.json');
        const tutor = usuarios.find(u => u.login === login);

        if (tutor) {
            if (senha === tutor.senha) {
                return res.json({
                    success: true,
                    user: { ...tutor, tipo: 'tutor', senha: undefined }
                });
            }
        }

        res.json({ success: false, message: 'Usuário ou senha incorretos!' });
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para cadastrar tutor
app.post('/api/cadastrar-tutor', async (req, res) => {
    const { nome, cpf, telefone, endereco, senha } = req.body;

    // Validation
    if (!nome || !cpf || !telefone || !endereco || !senha) {
        return res.json({ success: false, message: 'Todos os campos são obrigatórios!' });
    }

    if (!validateCPF(cpf)) {
        return res.json({ success: false, message: 'CPF inválido!' });
    }

    if (!validatePhone(telefone)) {
        return res.json({ success: false, message: 'Telefone inválido!' });
    }

    if (senha.length < 6) {
        return res.json({ success: false, message: 'A senha deve ter pelo menos 6 caracteres!' });
    }

    try {
        const usuarios = await readJSON('usuarios.json');

        // Verificar se CPF já existe
        if (usuarios.find(u => u.cpf === cpf)) {
            return res.json({ success: false, message: 'CPF já cadastrado!' });
        }

        // Store plain password temporarily
        // const hashedPassword = await hashPassword(senha);

        // Adicionar novo tutor
        const novoTutor = {
            nome,
            cpf,
            telefone,
            endereco,
            login: cpf,
            senha: senha,
            dataCadastro: new Date().toISOString()
        };

        usuarios.push(novoTutor);

        if (await writeJSON('usuarios.json', usuarios)) {
            res.json({ success: true, message: 'Cadastro realizado com sucesso!' });
        } else {
            res.json({ success: false, message: 'Erro ao salvar dados' });
        }
    } catch (error) {
        console.error('Erro ao cadastrar tutor:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para cadastrar veterinário
app.post('/api/cadastrar-vet', async (req, res) => {
    const { nome, login, crmv, contato, senha } = req.body;

    // Validation
    if (!nome || !login || !crmv || !contato || !senha) {
        return res.json({ success: false, message: 'Todos os campos são obrigatórios!' });
    }

    if (senha.length < 6) {
        return res.json({ success: false, message: 'A senha deve ter pelo menos 6 caracteres!' });
    }

    if (!validatePhone(contato)) {
        return res.json({ success: false, message: 'Telefone inválido!' });
    }

    try {
        const medicos = await readJSON('medicos.json');

        // Verificar se login já existe
        if (medicos.find(m => m.login === login)) {
            return res.json({ success: false, message: 'Login já cadastrado!' });
        }

        // Verificar se CRMV já existe
        if (medicos.find(m => m.crmv === crmv)) {
            return res.json({ success: false, message: 'CRMV já cadastrado!' });
        }

        // Store plain password temporarily
        // const hashedPassword = await hashPassword(senha);

        // Adicionar novo veterinário
        const novoMedico = {
            nome,
            login,
            crmv,
            contato,
            senha: senha,
            dataCadastro: new Date().toISOString()
        };

        medicos.push(novoMedico);

        if (await writeJSON('medicos.json', medicos)) {
            res.json({ success: true, message: 'Cadastro realizado com sucesso!' });
        } else {
            res.json({ success: false, message: 'Erro ao salvar dados' });
        }
    } catch (error) {
        console.error('Erro ao cadastrar veterinário:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para salvar pet
app.post('/api/salvar-pet', async (req, res) => {
    const petData = req.body;
    
    try {
        const animais = await readJSON('animais.json');
        
        const novoPet = {
            id: Date.now(),
            ...petData,
            tag: 'green',
            anamnese: null,
            observacoes: '',
            dataCadastro: new Date().toISOString()
        };
        
        animais.push(novoPet);
        
        if (await writeJSON('animais.json', animais)) {
            res.json({ success: true, pet: novoPet });
        } else {
            res.json({ success: false, message: 'Erro ao salvar pet' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para buscar pets do tutor
app.get('/api/pets-tutor/:cpf', async (req, res) => {
    const { cpf } = req.params;
    
    try {
        const animais = await readJSON('animais.json');
        const pets = animais.filter(p => p.tutorCpf === cpf);
        res.json({ success: true, pets });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para buscar todos os pets (médico)
app.get('/api/pets', async (req, res) => {
    try {
        const animais = await readJSON('animais.json');
        res.json({ success: true, pets: animais });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para salvar anamnese
app.put('/api/salvar-anamnese/:id', async (req, res) => {
    const { id } = req.params;
    const anamneseData = req.body;
    
    try {
        const animais = await readJSON('animais.json');
        const petIndex = animais.findIndex(p => p.id == id);
        
        if (petIndex === -1) {
            return res.json({ success: false, message: 'Pet não encontrado' });
        }
        
        animais[petIndex].anamnese = {
            ...anamneseData,
            data: new Date().toLocaleString('pt-BR')
        };
        
        if (await writeJSON('animais.json', animais)) {
            res.json({ success: true, message: 'Anamnese salva com sucesso!' });
        } else {
            res.json({ success: false, message: 'Erro ao salvar anamnese' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para salvar observações médicas
app.put('/api/salvar-observacoes/:id', async (req, res) => {
    const { id } = req.params;
    const { observacoes } = req.body;
    
    try {
        const animais = await readJSON('animais.json');
        const petIndex = animais.findIndex(p => p.id == id);
        
        if (petIndex === -1) {
            return res.json({ success: false, message: 'Pet não encontrado' });
        }
        
        animais[petIndex].observacoes = observacoes;
        
        if (await writeJSON('animais.json', animais)) {
            res.json({ success: true, message: 'Observações salvas com sucesso!' });
        } else {
            res.json({ success: false, message: 'Erro ao salvar observações' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para alterar tag do pet
app.put('/api/alterar-tag/:id', async (req, res) => {
    const { id } = req.params;
    const { tag } = req.body;
    
    try {
        const animais = await readJSON('animais.json');
        const petIndex = animais.findIndex(p => p.id == id);
        
        if (petIndex === -1) {
            return res.json({ success: false, message: 'Pet não encontrado' });
        }
        
        animais[petIndex].tag = tag;
        
        if (await writeJSON('animais.json', animais)) {
            res.json({ success: true, message: 'Tag alterada com sucesso!' });
        } else {
            res.json({ success: false, message: 'Erro ao alterar tag' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Servir index.html na rota raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🐾 Sistema Veterinário rodando em http://localhost:${PORT}`);
    console.log('Para parar o servidor, pressione Ctrl+C');
});