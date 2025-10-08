const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limitar tamanho do JSON
app.use(express.static('.'));

// Middleware de log para debugging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// Helper functions
function validateCPF(cpf) {
    if (!cpf || typeof cpf !== 'string') return false;
    // Remove qualquer formatação
    const cleanCPF = cpf.replace(/\D/g, '');
    // Validação básica de CPF (11 dígitos)
    if (!/^\d{11}$/.test(cleanCPF)) return false;
    // Verificar se não são todos os mesmos dígitos
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    return true;
}

function validatePhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    // Remove qualquer formatação
    const cleanPhone = phone.replace(/\D/g, '');
    // Validação básica de telefone (10-11 dígitos)
    return /^\d{10,11}$/.test(cleanPhone);
}

function validateCRMV(crmv) {
    if (!crmv || typeof crmv !== 'string') return false;
    // Validação básica para CRMV (pelo menos 3 caracteres)
    return crmv.trim().length >= 3;
}

function sanitizeString(str) {
    if (!str || typeof str !== 'string') return '';
    return str.trim().substring(0, 255); // Limitar tamanho
}

// Função para hash de senha
async function hashPassword(password) {
    try {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    } catch (error) {
        console.error('Erro ao gerar hash da senha:', error);
        throw new Error('Erro interno no servidor');
    }
}

// Função para verificar senha
async function verifyPassword(password, hashedPassword) {
    try {
        return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
        console.error('Erro ao verificar senha:', error);
        return false;
    }
}

// Middleware de validação de dados
function validateRequired(fields) {
    return (req, res, next) => {
        const missing = fields.filter(field => !req.body[field] || req.body[field].toString().trim() === '');
        if (missing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Campos obrigatórios não preenchidos: ${missing.join(', ')}`
            });
        }
        next();
    };
}

// Função auxiliar para ler JSON com validação melhorada
async function readJSON(filename) {
    try {
        const data = await fs.readFile(filename, 'utf8');
        const parsedData = JSON.parse(data);
        // Garantir que sempre retorna um array
        return Array.isArray(parsedData) ? parsedData : [];
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Arquivo não existe, criar um vazio
            console.log(`Arquivo ${filename} não encontrado, criando um novo...`);
            await writeJSON(filename, []);
            return [];
        }
        console.error(`Erro ao ler ${filename}:`, error.message);
        return [];
    }
}

// Função auxiliar para escrever JSON com backup
async function writeJSON(filename, data) {
    try {
        // Criar backup se o arquivo existir
        try {
            await fs.access(filename);
            const backupName = `${filename}.backup`;
            await fs.copyFile(filename, backupName);
        } catch (e) {
            // Arquivo não existe, não há problema
        }
        
        // Escrever o novo arquivo
        await fs.writeFile(filename, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Erro ao escrever ${filename}:`, error.message);
        return false;
    }
}

// Rota simples para servir medicos.json
app.get('/api/medicos', async (req, res) => {
    try {
        const medicos = await readJSON('medicos.json');
        res.json(medicos);
    } catch (error) {
        console.error('Erro ao ler médicos:', error);
        res.status(500).json({ error: 'Erro ao carregar médicos' });
    }
});

// Rota para cadastrar médico veterinário
app.post('/api/cadastrar-medico', 
    validateRequired(['nome', 'login', 'crmv', 'contato', 'senha']),
    async (req, res) => {
        try {
            const { nome, login, crmv, contato, senha } = req.body;

            // Sanitizar dados de entrada
            const dadosLimpos = {
                nome: sanitizeString(nome),
                login: sanitizeString(login),
                crmv: sanitizeString(crmv),
                contato: sanitizeString(contato),
                senha: senha.toString()
            };

            // Validações específicas
            if (dadosLimpos.senha.length < 6) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'A senha deve ter pelo menos 6 caracteres!' 
                });
            }

            if (!validateCRMV(dadosLimpos.crmv)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'CRMV inválido!' 
                });
            }

            if (!validatePhone(dadosLimpos.contato)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Telefone inválido!' 
                });
            }

            const medicos = await readJSON('medicos.json');

            // Verificar se login já existe
            if (medicos.find(m => m.login === dadosLimpos.login)) {
                return res.status(409).json({ 
                    success: false, 
                    message: 'Login já cadastrado!' 
                });
            }

            // Verificar se CRMV já existe
            if (medicos.find(m => m.crmv === dadosLimpos.crmv)) {
                return res.status(409).json({ 
                    success: false, 
                    message: 'CRMV já cadastrado!' 
                });
            }

            // Hash da senha
            const senhaHash = await hashPassword(dadosLimpos.senha);

            // Adicionar novo médico
            const novoMedico = {
                id: Date.now(), // Adicionar ID único
                nome: dadosLimpos.nome,
                login: dadosLimpos.login,
                crmv: dadosLimpos.crmv,
                contato: dadosLimpos.contato,
                senha: senhaHash,
                dataCadastro: new Date().toISOString(),
                ativo: true
            };

            medicos.push(novoMedico);

            if (await writeJSON('medicos.json', medicos)) {
                res.status(201).json({ 
                    success: true, 
                    message: 'Médico cadastrado com sucesso!',
                    medico: { ...novoMedico, senha: undefined } // Não retornar a senha
                });
            } else {
                res.status(500).json({ 
                    success: false, 
                    message: 'Erro ao salvar dados' 
                });
            }
        } catch (error) {
            console.error('Erro ao cadastrar médico:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor' 
            });
        }
    }
);

// Rota para login com segurança melhorada
app.post('/api/login', 
    validateRequired(['login', 'senha']),
    async (req, res) => {
        try {
            const { login, senha } = req.body;

            // Sanitizar dados de entrada
            const loginLimpo = sanitizeString(login);
            const senhaLimpa = senha.toString();

            // Buscar nos médicos
            const medicos = await readJSON('medicos.json');
            const medico = medicos.find(m => 
                m.login === loginLimpo && m.ativo !== false
            );

            if (medico) {
                // Verificar se a senha é hash ou texto plano (compatibilidade)
                let senhaValida = false;
                if (medico.senha.startsWith('$2b$')) {
                    // Senha em hash
                    senhaValida = await verifyPassword(senhaLimpa, medico.senha);
                } else {
                    // Senha em texto plano (compatibilidade)
                    senhaValida = senhaLimpa === medico.senha;
                    
                    // Atualizar para hash se a senha estiver correta
                    if (senhaValida) {
                        try {
                            medico.senha = await hashPassword(senhaLimpa);
                            await writeJSON('medicos.json', medicos);
                        } catch (e) {
                            console.error('Erro ao atualizar hash da senha:', e);
                        }
                    }
                }

                if (senhaValida) {
                    return res.json({
                        success: true,
                        user: { 
                            id: medico.id,
                            nome: medico.nome,
                            login: medico.login,
                            crmv: medico.crmv,
                            contato: medico.contato,
                            tipo: 'medico'
                        }
                    });
                }
            }

            // Buscar nos usuários (tutores) - se necessário
            const usuarios = await readJSON('usuarios.json');
            const tutor = usuarios.find(u => 
                u.login === loginLimpo && u.ativo !== false
            );

            if (tutor) {
                // Verificar senha (mesma lógica de compatibilidade)
                let senhaValida = false;
                if (tutor.senha && tutor.senha.startsWith('$2b$')) {
                    senhaValida = await verifyPassword(senhaLimpa, tutor.senha);
                } else {
                    senhaValida = senhaLimpa === tutor.senha;
                    
                    if (senhaValida && tutor.senha) {
                        try {
                            tutor.senha = await hashPassword(senhaLimpa);
                            await writeJSON('usuarios.json', usuarios);
                        } catch (e) {
                            console.error('Erro ao atualizar hash da senha:', e);
                        }
                    }
                }

                if (senhaValida) {
                    return res.json({
                        success: true,
                        user: { 
                            id: tutor.id || tutor.cpf,
                            nome: tutor.nome,
                            cpf: tutor.cpf,
                            telefone: tutor.telefone,
                            endereco: tutor.endereco,
                            tipo: 'tutor'
                        }
                    });
                }
            }

            // Delay para prevenir ataques de força bruta
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            res.status(401).json({ 
                success: false, 
                message: 'Usuário ou senha incorretos!' 
            });
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor' 
            });
        }
    }
);

// Rota para cadastrar tutor com validações melhoradas
app.post('/api/cadastrar-tutor', 
    validateRequired(['nome', 'cpf', 'telefone', 'endereco', 'senha']),
    async (req, res) => {
        try {
            const { nome, cpf, telefone, endereco, senha } = req.body;

            // Sanitizar dados de entrada
            const dadosLimpos = {
                nome: sanitizeString(nome),
                cpf: sanitizeString(cpf),
                telefone: sanitizeString(telefone),
                endereco: sanitizeString(endereco),
                senha: senha.toString()
            };

            // Validações específicas
            if (!validateCPF(dadosLimpos.cpf)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'CPF inválido!' 
                });
            }

            if (!validatePhone(dadosLimpos.telefone)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Telefone inválido!' 
                });
            }

            if (dadosLimpos.senha.length < 6) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'A senha deve ter pelo menos 6 caracteres!' 
                });
            }

            const usuarios = await readJSON('usuarios.json');

            // Verificar se CPF já existe
            if (usuarios.find(u => u.cpf === dadosLimpos.cpf)) {
                return res.status(409).json({ 
                    success: false, 
                    message: 'CPF já cadastrado!' 
                });
            }

            // Hash da senha
            const senhaHash = await hashPassword(dadosLimpos.senha);

            // Adicionar novo tutor
            const novoTutor = {
                id: Date.now(),
                nome: dadosLimpos.nome,
                cpf: dadosLimpos.cpf,
                telefone: dadosLimpos.telefone,
                endereco: dadosLimpos.endereco,
                login: dadosLimpos.cpf, // CPF como login
                senha: senhaHash,
                dataCadastro: new Date().toISOString(),
                ativo: true
            };

            usuarios.push(novoTutor);

            if (await writeJSON('usuarios.json', usuarios)) {
                res.status(201).json({ 
                    success: true, 
                    message: 'Cadastro realizado com sucesso!',
                    tutor: { ...novoTutor, senha: undefined } // Não retornar a senha
                });
            } else {
                res.status(500).json({ 
                    success: false, 
                    message: 'Erro ao salvar dados' 
                });
            }
        } catch (error) {
            console.error('Erro ao cadastrar tutor:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor' 
            });
        }
    }
);

// Rota duplicada removida - usar apenas /api/cadastrar-medico
// Esta rota foi removida para evitar duplicação de código
// Usar endpoint /api/cadastrar-medico que já implementa toda a funcionalidade

// Rota para salvar pet com validações melhoradas
app.post('/api/salvar-pet', 
    validateRequired(['nome', 'especie', 'tutorCpf', 'tutorNome']),
    async (req, res) => {
        try {
            const petData = req.body;
            
            // Sanitizar dados de entrada
            const dadosLimpos = {
                nome: sanitizeString(petData.nome),
                especie: sanitizeString(petData.especie),
                raca: sanitizeString(petData.raca || 'Não informado'),
                idade: Math.max(0, parseInt(petData.idade) || 0),
                sexo: sanitizeString(petData.sexo || 'Não informado'),
                peso: Math.max(0, parseFloat(petData.peso) || 0),
                tutorCpf: sanitizeString(petData.tutorCpf),
                tutorNome: sanitizeString(petData.tutorNome),
                tutorTelefone: sanitizeString(petData.tutorTelefone || ''),
                tutorEndereco: sanitizeString(petData.tutorEndereco || '')
            };

            // Validar CPF do tutor
            if (!validateCPF(dadosLimpos.tutorCpf)) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'CPF do tutor inválido!' 
                });
            }

            const animais = await readJSON('animais.json');
            
            const novoPet = {
                id: Date.now(),
                ...dadosLimpos,
                tag: 'green',
                anamnese: null,
                observacoes: '',
                consultas: {},
                exames: {},
                dataCadastro: new Date().toISOString(),
                ativo: true
            };
            
            animais.push(novoPet);
            
            if (await writeJSON('animais.json', animais)) {
                res.status(201).json({ 
                    success: true, 
                    message: 'Pet cadastrado com sucesso!',
                    pet: novoPet 
                });
            } else {
                res.status(500).json({ 
                    success: false, 
                    message: 'Erro ao salvar pet' 
                });
            }
        } catch (error) {
            console.error('Erro ao salvar pet:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Erro interno do servidor' 
            });
        }
    }
);

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

// Rota para buscar pet específico por ID
app.get('/api/pet/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const animais = await readJSON('animais.json');
        const pet = animais.find(p => p.id == id);
        
        if (!pet) {
            return res.json({ success: false, message: 'Pet não encontrado' });
        }
        
        res.json({ success: true, pet });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para buscar anamnese de um pet
app.get('/api/anamnese/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const animais = await readJSON('animais.json');
        const pet = animais.find(p => p.id == id);
        
        if (!pet) {
            return res.json({ success: false, message: 'Pet não encontrado' });
        }
        
        res.json({ 
            success: true, 
            anamnese: pet.anamnese || null,
            petNome: pet.nome 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para buscar observações de um pet
app.get('/api/observacoes/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const animais = await readJSON('animais.json');
        const pet = animais.find(p => p.id == id);
        
        if (!pet) {
            return res.json({ success: false, message: 'Pet não encontrado' });
        }
        
        res.json({ 
            success: true, 
            observacoes: pet.observacoes || '',
            dataObservacoes: pet.dataObservacoes || null,
            petNome: pet.nome 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para buscar consultas de um pet
app.get('/api/consultas/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const animais = await readJSON('animais.json');
        const pet = animais.find(p => p.id == id);
        
        if (!pet) {
            return res.json({ success: false, message: 'Pet não encontrado' });
        }
        
        res.json({ 
            success: true, 
            consultas: pet.consultas || {},
            petNome: pet.nome 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

// Rota para buscar exames de um pet
app.get('/api/exames/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const animais = await readJSON('animais.json');
        const pet = animais.find(p => p.id == id);
        
        if (!pet) {
            return res.json({ success: false, message: 'Pet não encontrado' });
        }
        
        res.json({ 
            success: true, 
            exames: pet.exames || {},
            petNome: pet.nome 
        });
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

// Rota para salvar consultas (POST) - para compatibilidade
app.post('/api/salvar-consultas/:petId', async (req, res) => {
    const { petId } = req.params;
    const consultasData = req.body;
    
    try {
        const animais = await readJSON('animais.json');
        const petIndex = animais.findIndex(p => p.id == petId);
        
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

// Rota para alterar tag do pet com validação melhorada
app.put('/api/alterar-tag/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { tag } = req.body;

        // Validar ID
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID do pet inválido' 
            });
        }

        // Validar tag
        const tagsValidas = ['green', 'yellow', 'red'];
        if (!tag || !tagsValidas.includes(tag)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Tag inválida. Use: green, yellow ou red' 
            });
        }

        const animais = await readJSON('animais.json');
        const petIndex = animais.findIndex(p => p.id == id && p.ativo !== false);

        if (petIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'Pet não encontrado' 
            });
        }

        animais[petIndex].tag = tag;
        animais[petIndex].dataUltimaAlteracao = new Date().toISOString();

        if (await writeJSON('animais.json', animais)) {
            res.json({ 
                success: true, 
                message: 'Tag alterada com sucesso!',
                pet: {
                    id: animais[petIndex].id,
                    nome: animais[petIndex].nome,
                    tag: animais[petIndex].tag
                }
            });
        } else {
            res.status(500).json({ 
                success: false, 
                message: 'Erro ao salvar alterações' 
            });
        }
    } catch (error) {
        console.error('Erro ao alterar tag:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor' 
        });
    }
});

// Servir index.html na rota raiz (corrigido)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Middleware para rotas não encontradas (deve vir depois de todas as rotas)
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Rota não encontrada' 
    });
});

// Middleware de tratamento de erros (deve vir por último)
app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Erro interno do servidor' 
    });
});

// Inicializar servidor com tratamento de erro
app.listen(PORT, (err) => {
    if (err) {
        console.error('❌ Erro ao iniciar servidor:', err);
        process.exit(1);
    }
    
    console.log('🚀 ========================================');
    console.log('🐾 Sistema Veterinário UC Hub');
    console.log(`🌐 Servidor rodando em http://localhost:${PORT}`);
    console.log('📊 Status: Operacional');
    console.log('🔧 Para parar o servidor: Ctrl+C');
    console.log('========================================');
    
    // Verificar se os arquivos JSON existem
    console.log('📁 Verificando arquivos de dados...');
    const arquivos = ['medicos.json', 'usuarios.json', 'animais.json'];
    
    arquivos.forEach(async (arquivo) => {
        try {
            await readJSON(arquivo);
            console.log(`✅ ${arquivo} - OK`);
        } catch (error) {
            console.log(`⚠️  ${arquivo} - Será criado automaticamente`);
        }
    });
});