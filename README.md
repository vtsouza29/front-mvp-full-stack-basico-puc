# Sistema de Eventos e Inscrições - Front-end

SPA em HTML, CSS e JavaScript puro para consumir a API de eventos.

## Como executar

1. Inicie o backend FastAPI no projeto principal:

```bash
uvicorn main:app --reload
```

2. Abra o arquivo `frontend/index.html` diretamente no navegador (duplo clique).

## Requisitos atendidos no front

- SPA sem React/Vue/Angular.
- Layout customizado com CSS próprio.
- Exibição de dados em cards e listas.
- Chamadas para todas as rotas implementadas no backend:
  - `GET /`
  - `GET /eventos`
  - `POST /eventos`
  - `GET /eventos/{evento_id}`
  - `DELETE /eventos/{evento_id}`
  - `POST /eventos/{evento_id}/inscricoes`
  - `GET /eventos/{evento_id}/inscricoes`
  - `DELETE /eventos/{evento_id}/inscricoes/{inscricao_id}`
  - `GET /participantes`
