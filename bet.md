# 🎰 Mecânica de Odds (Multiplicadores) para o Bolão do Noivado

Este documento detalha o funcionamento matemático, as regras de negócios, as especificações das perguntas e os contratos das rotas da funcionalidade de **Bolão do Jantar de Noivado**. 

O bolão adota um modelo de **Mercado Dinâmico (Totalizador)**, onde as cotações (odds) das alternativas flutuam em tempo real à medida que os convidados realizam seus palpites.

---

## 📈 1. A Lógica Matemática das Odds

As odds flutuam de forma inversamente proporcional à quantidade de votos recebidos em cada opção:
*   **Favoritos:** Recebem muitos palpites $\rightarrow$ Multiplicador **menor** (menor retorno por ponto).
*   **Zebras:** Recebem poucos palpites $\rightarrow$ Multiplicador **maior** (recompensa quem apostar em palpites improváveis).

### 🧮 1.1 A Fórmula de Cálculo
A cotação de cada opção para uma pergunta específica é determinada pela seguinte fórmula:

$$\text{Odd}_{\text{opção}} = \frac{\text{Total de Votos na Pergunta}}{\text{Total de Votos na Opção}}$$

### ⚠️ 1.2 Regras para Casos Especiais (Edge Cases)
1.  **Sem palpites no sistema ($Total = 0$):**
    *   Antes que qualquer convidado vote na pergunta, a odd padrão de todas as opções será **1.00x**.
2.  **Opção com 0 votos em uma pergunta ativa ($Total > 0$ e $Votos_{\text{opção}} = 0$):**
    *   Para evitar divisão por zero (que geraria uma odd infinita), definimos o cálculo simulando a odd correspondente se a opção recebesse o próximo voto:
    
$$\text{Odd}_{\text{zebra}} = \text{Total de Votos na Pergunta} + 1$$

---

## 🎲 2. As Perguntas do Bolão (Bets)

Abaixo estão listadas as perguntas estruturais que serão cadastradas no sistema:

| Pergunta (Title) | Tipo de Dados (Type) | Regra das Opções (Options) |
| :--- | :---: | :--- |
| **"Quem vai ser padrinho?"** | `GUEST_SELECT` | Lista dinâmica de todos os convidados com presença confirmada (`will_go: true`). |
| **"Quem vai demorar mais que a noiva para chegar?"** | `GUEST_SELECT` | Lista dinâmica de todos os convidados com presença confirmada (`will_go: true`). |
| **"Quem vai comer mais pedaços de pizza?"** | `GUEST_SELECT` | Lista dinâmica de todos os convidados com presença confirmada (`will_go: true`). |
| **"Para onde vai ser a lua de mel?"** | `TEXT` | Campo de preenchimento livre (texto). O cálculo de odds se agrupa por respostas idênticas de texto. |
| **"Quantos dias de namoro o casal tem no dia da festa?"** | `NUMBER` | Campo numérico livre. O cálculo de odds se agrupa por valores numéricos idênticos. |

---

## 🛣️ 3. Referência de Rotas da API

As rotas estão montadas no prefixo `/api/bets`.

### 3.1 POST `/api/bets/questions`
Cadastra uma nova pergunta no bolão.
*   **Body (JSON):**
    ```json
    {
      "title": "Quem vai comer mais pedaços de pizza?",
      "type": "GUEST_SELECT"
    }
    ```
    *(Para perguntas de múltipla escolha fixa, opcionalmente envie `"options": ["Opção A", "Opção B"]`)*.

### 3.2 POST `/api/bets/place`
Registra o palpite de um convidado para uma pergunta.
*   **Regras de Validação e Segurança:**
    *   O convidado (`rsvpId`) deve existir no banco de dados.
    *   O convidado (`rsvpId`) deve ter confirmado presença na festa (`will_go: true`).
    *   O convidado só pode votar **uma vez por pergunta** (`@@unique([rsvpId, questionId])`). Se tentar votar novamente, receberá erro `400`.
    *   Se a pergunta for `GUEST_SELECT`, o `value` enviado deve ser o UUID de outro convidado confirmado.
    *   Se a pergunta for `NUMBER`, o `value` deve conter apenas dígitos numéricos.
*   **Body (JSON):**
    ```json
    {
      "rsvpId": "uuid-do-convidado-que-aposta",
      "questionId": "uuid-da-pergunta",
      "value": "uuid-do-candidato-votado"
    }
    ```

### 3.3 GET `/api/bets/questions`
Lista as perguntas do bolão calculando em tempo real os multiplicadores (odds) de cada alternativa baseados nos votos atuais.
*   **Response de Sucesso (JSON):**
    ```json
    {
      "status": "success",
      "count": 1,
      "data": [
        {
          "id": "uuid-da-pergunta",
          "title": "Quem vai comer mais pedaços de pizza?",
          "type": "GUEST_SELECT",
          "totalVotes": 100,
          "options": [
            {
              "value": "uuid-do-thiago",
              "label": "Thiago",
              "votes": 50,
              "odd": 2
            },
            {
              "value": "uuid-do-marcos",
              "label": "Marcos",
              "votes": 25,
              "odd": 4
            },
            {
              "value": "uuid-da-julia",
              "label": "Julia",
              "votes": 5,
              "odd": 20
            },
            {
              "value": "uuid-da-amanda",
              "label": "Amanda",
              "votes": 2,
              "odd": 50
            }
          ]
        }
      ]
    }
    ```

### 3.4 GET `/api/bets/rsvp/:rsvpId`
Retorna todos os palpites (apostas) cadastrados por um convidado específico.
*   **Regras de Validação:**
    *   O convidado (`rsvpId`) deve existir no banco de dados. Caso contrário, retorna erro `404`.
*   **Response de Sucesso (JSON):**
    ```json
    {
      "status": "success",
      "count": 2,
      "data": [
        {
          "id": "uuid-do-palpite",
          "rsvpId": "uuid-do-convidado",
          "questionId": "uuid-da-pergunta",
          "value": "valor-do-palpite"
        }
      ]
    }
    ```

