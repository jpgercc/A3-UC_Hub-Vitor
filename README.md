# Sistema Veterinário

Sistema de gestão veterinária com persistência em JSON para gerenciamento de usuários, médicos veterinários e animais.

## RESOLVER ESTES PROBLEMAS ANTES DE TUDO
- [ ] Exames não salvam de forma individual
- [ ] Limpar código inutil, caso tenha e otimizar código atual, sem remover funções usadas

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

   Ou se tiver lendo foruns de dev e tendo dor de cabeça:
   ```bash
   npm start
   ```
   
   Ou para desenvolvimento com auto-reload:
   ```bash
   npm run dev
   ```

4. **Acesse o sistema:**
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
