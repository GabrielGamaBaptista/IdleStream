# Guia de Resgate Automático de Pontos: Twitch & Kick

Este documento reúne todas as especificações técnicas, endpoints, payloads e códigos de exemplo para implementar e testar o **resgate programado e condicional de recompensas** (gastar pontos acumulados) na Twitch e na Kick.

---

## 1. Twitch: Resgate via GraphQL

Na Twitch, o resgate de recompensas personalizadas do canal (*Channel Points Custom Rewards*) é processado pelo endpoint interno de GraphQL da plataforma.

### 1.1 Especificações da Requisição

* **URL:** `https://gql.twitch.tv/gql`
* **Método:** `POST`
* **Operação:** `RedeemCustomReward`

#### Headers Obrigatórios:
```http
POST /gql HTTP/1.1
Host: gql.twitch.tv
Client-Id: kimne78kx3ncx6brgo4mv6wki5h1ko
Authorization: OAuth <SEU_OAUTH_TOKEN>
Content-Type: application/json
Origin: https://www.twitch.tv
Referer: https://www.twitch.tv/
```

> **Nota:** O `Client-Id` `kimne78kx3ncx6brgo4mv6wki5h1ko` é o identificador público da interface web oficial da Twitch.

#### Payload JSON:
```json
{
  "operationName": "RedeemCustomReward",
  "variables": {
    "input": {
      "channelID": "190359081",
      "rewardID": "ecac50be-b6a2-4c5e-964b-0866b780537f",
      "cost": 2000,
      "prompt": "",
      "textInput": ""
    }
  },
  "query": "mutation RedeemCustomReward($input: RedeemCustomRewardInput!) { redeemCustomReward(input: $input) { redemption { id status reward { id title cost } } } }"
}
```

### 1.2 Como Capturar o `channelID` e o `rewardID`

1. Abra a live do streamer no navegador logado na Twitch.
2. Pressione **F12** (DevTools) e vá para a aba **Network** (Rede).
3. No campo de filtro, digite: `gql`.
4. Abra o menu de pontos no chat da Twitch (ícone de recompensas).
5. Localize a requisição cujo payload contenha `ChannelPointsContext` ou `GetChannelPointsContext`.
6. Na resposta JSON:
   * `channel.id`: ID numérico do canal (ex.: `"190359081"`).
   * Dentro de `customRewards`: lista de todas as recompensas com seus respectivos `id` (UUID), `title` e `cost`.

### 1.3 Script de Teste em Python (Twitch)

```python
import requests

def resgatar_recompensa_twitch(oauth_token: str, channel_id: str, reward_id: str, cost: int, text_input: str = "") -> bool:
    """
    Executa o resgate de uma recompensa de pontos na Twitch via GraphQL.
    """
    url = "https://gql.twitch.tv/gql"
    
    headers = {
        "Client-Id": "kimne78kx3ncx6brgo4mv6wki5h1ko",
        "Authorization": f"OAuth {oauth_token}",
        "Content-Type": "application/json",
        "Origin": "https://www.twitch.tv",
        "Referer": "https://www.twitch.tv/"
    }
    
    payload = {
        "operationName": "RedeemCustomReward",
        "variables": {
            "input": {
                "channelID": str(channel_id),
                "rewardID": str(reward_id),
                "cost": int(cost),
                "prompt": text_input,
                "textInput": text_input
            }
        },
        "query": """
        mutation RedeemCustomReward($input: RedeemCustomRewardInput!) {
            redeemCustomReward(input: $input) {
                redemption {
                    id
                    status
                    reward {
                        id
                        title
                        cost
                    }
                }
            }
        }
        """
    }
    
    response = requests.post(url, json=payload, headers=headers)
    data = response.json()
    
    if "errors" in data and data["errors"]:
        print(f"[Twitch ERRO] Falha no resgate: {data['errors']}")
        return False
        
    redemption = data.get("data", {}).get("redeemCustomReward", {}).get("redemption")
    if redemption:
        print(f"[Twitch SUCESSO] Item resgatado! ID: {redemption.get('id')} | Status: {redemption.get('status')}")
        return True
        
    print(f"[Twitch AVISO] Resposta inesperada: {data}")
    return False

if __name__ == "__main__":
    # Dados para teste:
    TOKEN = "SEU_TOKEN_AQUI"       # Exemplo sem o prefixo OAuth (o script já adiciona)
    CANAL_ID = "12345678"          # ID numérico do streamer
    REWARD_ID = "uuid-do-item"      # UUID da recompensa
    CUSTO = 2000                   # Custo exato do item
    
    resgatar_recompensa_twitch(TOKEN, CANAL_ID, REWARD_ID, CUSTO)
```

---

## 2. Kick: Resgate via API Interna v2

Na Kick, o resgate é efetuado por um endpoint REST da API v2 interna do frontend.

### 2.1 Especificações da Requisição

* **URL:** `https://kick.com/api/v2/channels/{channel_slug}/rewards/{reward_id}/redeem`
* **Método:** `POST`

#### Headers Obrigatórios:
```http
POST /api/v2/channels/{channel_slug}/rewards/{reward_id}/redeem HTTP/1.1
Host: kick.com
Authorization: Bearer <SEU_BEARER_TOKEN>
Content-Type: application/json
Accept: application/json
Origin: https://kick.com
Referer: https://kick.com/{channel_slug}
```

### 2.2 Desafio Cloudflare e Solução

Qualquer requisição HTTP comum (`requests`, `urllib`, `axios`) feita diretamente para `kick.com` recebe resposta `403 Forbidden` devido à validação de TLS/impressão digital do navegador realizada pela Cloudflare.

Para contornar isso em scripts autônomos, utiliza-se a biblioteca `curl_cffi`, que emula as assinaturas de handshake TLS de um navegador real (como Chrome ou Safari).

### 2.3 Script de Teste em Python com `curl_cffi` (Kick)

Instale a dependência:
```bash
pip install curl_cffi
```

Código:
```python
from curl_cffi import requests

def resgatar_recompensa_kick(bearer_token: str, channel_slug: str, reward_id: str) -> bool:
    """
    Executa o resgate de recompensa na Kick contornando a proteção da Cloudflare.
    """
    url = f"https://kick.com/api/v2/channels/{channel_slug}/rewards/{reward_id}/redeem"
    
    headers = {
        "Authorization": f"Bearer {bearer_token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Origin": "https://kick.com",
        "Referer": f"https://kick.com/{channel_slug}"
    }
    
    # impersonate="chrome120" simula o cabeçalho TLS do Chrome
    response = requests.post(url, headers=headers, impersonate="chrome120")
    
    if response.status_code in [200, 201]:
        print(f"[Kick SUCESSO] Resgate efetuado! {response.json()}")
        return True
    else:
        print(f"[Kick ERRO] Status: {response.status_code} | Resposta: {response.text}")
        return False

if __name__ == "__main__":
    TOKEN = "SEU_BEARER_TOKEN_KICK"
    CANAL_SLUG = "nome_do_streamer"
    REWARD_ID = "id_da_recompensa"
    
    resgatar_recompensa_kick(TOKEN, CANAL_SLUG, REWARD_ID)
```

### 2.4 Teste Rápido via Console do Navegador (Kick)

Você também pode testar o resgate diretamente abrindo o console (**F12 -> Console**) na página da Kick onde já estiver logado:

```javascript
(async () => {
    const channelSlug = "nome_do_streamer";
    const rewardId = "id_da_recompensa";
    
    // Recupera o token de autenticação armazenado na sessão
    const token = localStorage.getItem('token') || '';
    
    const res = await fetch(`https://kick.com/api/v2/channels/${channelSlug}/rewards/${rewardId}/redeem`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token.replace(/"/g, '')}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });
    
    const data = await res.json();
    console.log("Resultado do Resgate Kick:", data);
})();
```

---

## 3. Modelo de Integração para Automação Condicional

Para conectar o resgate ao seu minerador/acumulador existente, implemente uma fila de gatilhos:

### 3.1 Estrutura de Configuração (`triggers.json`)

```json
{
  "gatilhos": [
    {
      "id": "resgate_vip_live_x",
      "plataforma": "twitch",
      "channel_id": "190359081",
      "channel_slug": "streamer_x",
      "reward_id": "ecac50be-b6a2-4c5e-964b-0866b780537f",
      "meta_pontos": 2000,
      "custo": 2000,
      "text_input": "",
      "executado": false
    },
    {
      "id": "resgate_kick_sound",
      "plataforma": "kick",
      "channel_slug": "streamer_kick",
      "reward_id": "987654",
      "meta_pontos": 1500,
      "custo": 1500,
      "text_input": "",
      "executado": false
    }
  ]
}
```

### 3.2 Lógica do Loop de Execução

No ponto da sua aplicação onde o saldo atual de pontos é atualizado/recebido:

```python
def verificar_e_executar_gatilhos(plataforma: str, channel_id_ou_slug: str, saldo_atual: int, gatilhos: list, auth_token: str):
    for g in gatilhos:
        if g["executado"]:
            continue
            
        mesmo_canal = (
            (plataforma == "twitch" and g.get("channel_id") == str(channel_id_ou_slug)) or
            (plataforma == "kick" and g.get("channel_slug") == str(channel_id_ou_slug))
        )
        
        if mesmo_canal and saldo_atual >= g["meta_pontos"]:
            print(f"Meta atingida ({saldo_atual} >= {g['meta_pontos']}) para o gatilho '{g['id']}'. Executando resgate...")
            
            sucesso = False
            if plataforma == "twitch":
                sucesso = resgatar_recompensa_twitch(
                    oauth_token=auth_token,
                    channel_id=g["channel_id"],
                    reward_id=g["reward_id"],
                    cost=g["custo"],
                    text_input=g.get("text_input", "")
                )
            elif plataforma == "kick":
                sucesso = resgatar_recompensa_kick(
                    bearer_token=auth_token,
                    channel_slug=g["channel_slug"],
                    reward_id=g["reward_id"]
                )
                
            if sucesso:
                g["executado"] = True
                print(f"Gatilho '{g['id']}' marcado como concluído.")
```

---

## 4. Tratamento de Erros e Casos Especiais

1. **Cooldown Ativo (`COOLDOWN_ACTIVE`):** Se a recompensa possui tempo de espera entre usos, o GraphQL da Twitch retornará um erro específico indicando que o cooldown ainda está em andamento. Deve-se manter `executado = False` e tentar no próximo ciclo.
2. **Recompensa com Entrada de Texto obrigatória:** Se a recompensa exige texto (ex.: tocar música ou enviar mensagem para o streamer), o campo `textInput` no GraphQL **não pode ser vazio**, caso contrário a Twitch rejeitará a mutação.
3. **Limite Global Esgotado:** Streamers podem configurar limite de resgates por transmissão. Se o limite for atingido, a tentativa deve ser pausada até a próxima transmissão.
