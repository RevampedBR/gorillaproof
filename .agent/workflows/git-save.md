---
description: Salvar alterações no GitHub (git add, commit e push)
---

# Git Save - Salvar alterações no GitHub

Este workflow faz commit e push das suas alterações para o repositório GitHub.

## Pré-requisitos
- Git instalado em `C:\Program Files\Git\bin\git.exe`
- Credenciais configuradas no Git

## Passos

// turbo-all

### 1. Verificar alterações pendentes
```powershell
& "C:\Program Files\Git\bin\git.exe" status --short
```

### 2. Adicionar todas as alterações
```powershell
& "C:\Program Files\Git\bin\git.exe" add .
```

### 3. Fazer commit
Pergunte ao usuário qual mensagem de commit usar, ou use uma mensagem padrão descritiva:
```powershell
& "C:\Program Files\Git\bin\git.exe" commit -m "MENSAGEM_DO_COMMIT"
```

### 4. Fazer push para o GitHub
```powershell
& "C:\Program Files\Git\bin\git.exe" push origin main
```

### 5. Confirmar sucesso
```powershell
& "C:\Program Files\Git\bin\git.exe" log --oneline -1
```

## Notas
- Se o push falhar por autenticação, o usuário precisará configurar um Personal Access Token
- Use mensagens de commit descritivas seguindo o padrão: `tipo: descrição breve`
  - Exemplos: `feat: novo módulo de cotações`, `fix: correção no login`, `refactor: organização do sidebar`
