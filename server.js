const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

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

function validatePhone(phone) {
    // Basic phone validation (10-11 digits)
    return /^\d{10,11}$/.test(phone);
}

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

        // Buscar nos funcionários
        const funcionarios = await readJSON('funcionarios.json');
        const funcionario = funcionarios.find(f => f.login === login);

        if (funcionario) {
            if (senha === funcionario.senha) {
                return res.json({
                    success: true,
                    user: { id: funcionario.id, nome: funcionario.nome, login: funcionario.login, contato: funcionario.contato, role: funcionario.role, tipo: 'funcionario' }
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

// Rota para salvar histórico clínico
app.put('/api/salvar-historico-clinico/:id', async (req, res) => {
    const { id } = req.params;
    const { historicoClinico } = req.body;
    
    try {
        const animais = await readJSON('animais.json');
        const petIndex = animais.findIndex(p => p.id == id);
        
        if (petIndex === -1) {
            return res.json({ success: false, message: 'Pet não encontrado' });
        }
        
        if (!animais[petIndex].exames) {
            animais[petIndex].exames = {};
        }
        
        animais[petIndex].exames.historicoClinico = historicoClinico;
        animais[petIndex].exames.dataHistorico = new Date().toLocaleString('pt-BR');
        
        if (await writeJSON('animais.json', animais)) {
            res.json({ success: true, message: 'Histórico clínico salvo com sucesso!' });
        } else {
            res.json({ success: false, message: 'Erro ao salvar histórico clínico' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para salvar vacinação
app.put('/api/salvar-vacinacao/:id', async (req, res) => {
    const { id } = req.params;
    const vacinacaoData = req.body;
    
    try {
        const animais = await readJSON('animais.json');
        const petIndex = animais.findIndex(p => p.id == id);
        
        if (petIndex === -1) {
            return res.json({ success: false, message: 'Pet não encontrado' });
        }
        
        if (!animais[petIndex].exames) {
            animais[petIndex].exames = {};
        }
        
        animais[petIndex].exames = {
            ...animais[petIndex].exames,
            ...vacinacaoData,
            dataVacinacao: new Date().toLocaleString('pt-BR')
        };
        
        if (await writeJSON('animais.json', animais)) {
            res.json({ success: true, message: 'Vacinação salva com sucesso!' });
        } else {
            res.json({ success: false, message: 'Erro ao salvar vacinação' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para salvar consultas
app.put('/api/salvar-consultas/:id', async (req, res) => {
    const { id } = req.params;
    const consultasData = req.body;
    
    try {
        const animais = await readJSON('animais.json');
        const petIndex = animais.findIndex(p => p.id == id);
        
        if (petIndex === -1) {
            return res.json({ success: false, message: 'Pet não encontrado' });
        }
        
        if (!animais[petIndex].consultas) {
            animais[petIndex].consultas = {};
        }
        
        animais[petIndex].consultas = {
            ...animais[petIndex].consultas,
            ...consultasData,
            dataAtualizacao: new Date().toLocaleString('pt-BR')
        };
        
        if (await writeJSON('animais.json', animais)) {
            res.json({ success: true, message: 'Consultas salvas com sucesso!' });
        } else {
            res.json({ success: false, message: 'Erro ao salvar consultas' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para salvar exames
app.put('/api/salvar-exames/:id', async (req, res) => {
    const { id } = req.params;
    const examesData = req.body;
    
    try {
        const animais = await readJSON('animais.json');
        const petIndex = animais.findIndex(p => p.id == id);
        
        if (petIndex === -1) {
            return res.json({ success: false, message: 'Pet não encontrado' });
        }
        
        if (!animais[petIndex].exames) {
            animais[petIndex].exames = {};
        }
        
        animais[petIndex].exames = {
            ...animais[petIndex].exames,
            ...examesData,
            dataExames: new Date().toLocaleString('pt-BR')
        };
        
        if (await writeJSON('animais.json', animais)) {
            res.json({ success: true, message: 'Exames salvos com sucesso!' });
        } else {
            res.json({ success: false, message: 'Erro ao salvar exames' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para salvar observações
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
        animais[petIndex].dataObservacoes = new Date().toLocaleString('pt-BR');
        
        if (await writeJSON('animais.json', animais)) {
            res.json({ success: true, message: 'Observações salvas com sucesso!' });
        } else {
            res.json({ success: false, message: 'Erro ao salvar observações' });
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

// Rota para salvar consultas (passadas e futuras)
app.put('/api/salvar-consultas/:id', async (req, res) => {
    const { id } = req.params;
    const { consultasPassadas, consultasFuturas } = req.body;

    try {
        const animais = await readJSON('animais.json');
        const petIndex = animais.findIndex(p => p.id == id);

        if (petIndex === -1) {
            return res.json({ success: false, message: 'Pet não encontrado' });
        }

        animais[petIndex].consultasPassadas = consultasPassadas || [];
        animais[petIndex].consultasFuturas = consultasFuturas || [];

        if (await writeJSON('animais.json', animais)) {
            res.json({ success: true, message: 'Consultas salvas com sucesso!' });
        } else {
            res.json({ success: false, message: 'Erro ao salvar consultas' });
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

// Rota para cadastrar funcionário (apenas funcionários da clínica)
app.post('/api/cadastrar-funcionario', async (req, res) => {
    const { nome, login, contato, senha, role, crmv } = req.body;

    if (!nome || !login || !contato || !senha) {
        return res.json({ success: false, message: 'Campos obrigatórios ausentes' });
    }

    try {
        // armazenamos em funcionarios.json para separar de medicos/usuarios
        const funcionarios = await readJSON('funcionarios.json');

        if (funcionarios.find(f => f.login === login)) {
            return res.json({ success: false, message: 'Login já cadastrado' });
        }

        // do not allow Estagiario to be created with a CRMV
        if (role === 'Estagiario' && crmv) {
            return res.json({ success: false, message: 'Estagiário não pode ter CRMV.' });
        }

        const novo = {
            id: Date.now(),
            nome,
            login,
            contato,
            senha,
            role,
            crmv: crmv || null,
            dataCadastro: new Date().toISOString()
        };

        funcionarios.push(novo);

        if (await writeJSON('funcionarios.json', funcionarios)) {
            res.json({ success: true, message: 'Funcionário cadastrado com sucesso', funcionario: { ...novo, senha: undefined } });
        } else {
            res.json({ success: false, message: 'Erro ao salvar funcionário' });
        }
    } catch (error) {
        console.error('Erro ao cadastrar funcionário:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para listar funcionários
app.get('/api/funcionarios', async (req, res) => {
    try {
        const funcionarios = await readJSON('funcionarios.json');
        // Não retornamos senhas
        const safe = funcionarios.map(f => ({ id: f.id, nome: f.nome, login: f.login, contato: f.contato, role: f.role, crmv: f.crmv }));
        res.json({ success: true, funcionarios: safe });
    } catch (error) {
        console.error('Erro ao carregar funcionários:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para atualizar campos de um pet (ex: localizacao)
app.put('/api/atualizar-pet/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
        const animais = await readJSON('animais.json');
        const petIndex = animais.findIndex(p => p.id == id);

        if (petIndex === -1) {
            return res.json({ success: false, message: 'Pet não encontrado' });
        }

        animais[petIndex] = {
            ...animais[petIndex],
            ...updateData
        };

        if (await writeJSON('animais.json', animais)) {
            res.json({ success: true, message: 'Pet atualizado com sucesso!', pet: animais[petIndex] });
        } else {
            res.json({ success: false, message: 'Erro ao salvar alterações' });
        }
    } catch (error) {
        console.error('Erro ao atualizar pet:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para atualizar funcionário (com regras de mudança de cargo)
app.put('/api/funcionarios/:id', async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    try {
        const funcionarios = await readJSON('funcionarios.json');
        const idx = funcionarios.findIndex(f => f.id == id);
        if (idx === -1) return res.json({ success: false, message: 'Funcionário não encontrado' });

        const current = funcionarios[idx];

    // Server-side role-change validation
        if (updateData.role && updateData.role !== current.role) {
            const from = current.role;
            const to = updateData.role;

            // If current is Medico vet, cannot be altered
            if (from === 'Medico vet') {
                return res.json({ success: false, message: 'Usuário Veterinário não pode ser alterado.' });
            }

            // Recepção and Internação cannot change role
            if ((from === 'Recepção' || from === 'Internação') && to !== from) {
                return res.json({ success: false, message: 'Funcionários de Recepção ou Internação não podem alterar o cargo.' });
            }

            // Estagiario can change only to Vet junior (no direct promotion to Medico vet)
            if (from === 'Estagiario' && to !== 'Vet junior') {
                return res.json({ success: false, message: 'Estagiário só pode mudar para Vet junior.' });
            }

            // Vet junior can change only to Medico vet
            if (from === 'Vet junior' && to !== 'Medico vet') {
                return res.json({ success: false, message: 'Vet junior só pode mudar para Medico vet.' });
            }

            // If none of the above, allow (covers allowed exact transitions)
        }

        // Apply update (do not allow changing id or dataCadastro)
        // Disallow assigning CRMV if current is Estagiario and not being promoted to a vet role
        if (current.role === 'Estagiario') {
            const targetRole = updateData.role || current.role;
            if (!(targetRole === 'Vet junior' || targetRole === 'Medico vet')) {
                // strip crmv from updateData to prevent adding it
                delete updateData.crmv;
            }
        }

        const allowed = { ...updateData };
        delete allowed.id;
        delete allowed.dataCadastro;

        funcionarios[idx] = { ...funcionarios[idx], ...allowed };

        if (await writeJSON('funcionarios.json', funcionarios)) {
            const safe = { ...funcionarios[idx] };
            delete safe.senha;
            res.json({ success: true, message: 'Funcionário atualizado com sucesso', funcionario: safe });
        } else {
            res.json({ success: false, message: 'Erro ao salvar funcionário' });
        }
    } catch (error) {
        console.error('Erro ao atualizar funcionário:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para deletar funcionário
app.delete('/api/funcionarios/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const funcionarios = await readJSON('funcionarios.json');
        const idx = funcionarios.findIndex(f => f.id == id);
        if (idx === -1) return res.json({ success: false, message: 'Funcionário não encontrado' });

        const current = funcionarios[idx];
        if (current.role === 'Medico vet') {
            return res.json({ success: false, message: 'Não é permitido excluir usuário Veterinário.' });
        }

        funcionarios.splice(idx, 1);
        if (await writeJSON('funcionarios.json', funcionarios)) {
            res.json({ success: true, message: 'Funcionário excluído com sucesso' });
        } else {
            res.json({ success: false, message: 'Erro ao excluir funcionário' });
        }
    } catch (error) {
        console.error('Erro ao excluir funcionário:', error);
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});