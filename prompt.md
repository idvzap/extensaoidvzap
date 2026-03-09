# Alteração de código

## Credenciais por usuario

Planejo disponibilizar as credenciais de acesso por usuário, para que cada usuário tenha acesso apenas às informações dele.
Eu crio o usuario, coloco as credenciais no banco de dados, e quando o usuário fizer login, ele terá acesso apenas às informações dele.

o que vai precisar fazer:
Uma tela de criação de usuario, com os campos: nome, email, senha.
Assim que tiver preciso que tenha os campos para cadastrar o tokem da zapsing e advbox
Salvar no banco de dados, vinculado ao usuario.

Na primeira vez que abrir o app no navegador precisa fazer o login, após isso fica salvo na memoria do navegador

Todas as requisições precisam pegar do banco as credenciais do usuario, e usar para fazer a requisição na api.