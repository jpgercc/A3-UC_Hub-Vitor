# Sistema Veterinário

Sistema de gestão veterinária com persistência em JSON para gerenciamento de usuários, médicos veterinários e animais.

## Fazer
- [ ] Limpar e melhorar o código e lógica
- [ ] As senhas são armazenadas sem criptografia
- [ ] Falta de middleware de validação
- [ ] Alguns campos obrigatórios não são validados
- [ ] Alguns endpoints não validam adequadamente os dados
- [ ] Não há controle de sessão

## Como rodar o programa pela primeira vez

### Pré-requisitos
- Node.js instalado (versão 14 ou superior)
- npm (geralmente vem com o Node.js)

### Passos para execução:

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Inicie o servidor:**
   
   ⚠️ Importante: Para que o sistema funcione, inicie o servidor executando:
   ```bash
   node server.js
   ```

   ```bash
   npm start
   ```
   
   Ou para desenvolvimento com auto-reload:
   ```bash
   npm run dev
   ```

3. **Acesse o sistema:**
   - Abra seu navegador e vá para: `http://localhost:3000`
   - O servidor será executado na porta 3000

### Scripts disponíveis:
- `npm start` - Inicia o servidor em modo produção
- `npm run dev` - Inicia o servidor em modo desenvolvimento com nodemon

## Tecnologias usadas

### Frontend/Estilo:
- Tailwind CSS para estilos pré-prontos (CDN)
- Font Awesome para ícones
- HTML5 e JavaScript vanilla

### Backend:
- Node.js
- Express.js para o servidor web
- CORS para requisições cross-origin
- bcrypt para criptografia de senhas
- Sistema de arquivos JSON para persistência de dados

## Estrutura do projeto:
- `server.js` - Servidor principal da aplicação
- `index.html` - Interface principal do sistema
- `styles.css` - Estilos customizados
- `usuarios.json` - Dados dos usuários
- `medicos.json` - Dados dos médicos veterinários
- `animais.json` - Dados dos animais
