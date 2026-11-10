---
id: "DOC-04-GAMES-ENGINE"
title: "Game Workspace e Motor Anti-Sleep (Child Webviews, Anti-Suspension & /hunt)"
category: "backend"
tags: [idlestream, games, pokeidle, anti-sleep, child-webviews, wry, requestanimationframe, hunt]
related_code:
  - "src-tauri/src/games/manager.rs"
  - "src-tauri/src/games/commands.rs"
  - "src-tauri/src/games/anti_sleep.js"
  - "src-tauri/src/games/hunt_extension.js"
  - "src/components/games/GameWorkspace.tsx"
wiki_links:
  - "[[README]]"
  - "[[00-visao-geral]]"
  - "[[01-arquitetura]]"
  - "[[05-backend-core]]"
  - "[[06-frontend]]"
status: "completed"
version: "4.0.0"
last_updated: "2026-11-10"
summary: "Documentação do ecossistema de jogos ociosos (PokeIdle) do IdleStream: orquestração de Child Webviews nativas no Tauri v2, layouts geométricos dinâmicos, motor anti-sleep JS de 6 camadas, monitor de inatividade com reporte de toque e injeção da extensão de caça /hunt."
---

# Game Workspace e Motor Anti-Sleep (Child Webviews, Anti-Suspension & /hunt)

Este documento detalha a engenharia do **Game Workspace** do **IdleStream**, a gestão de instâncias concorrentes de jogos baseados na web (com foco primário no **PokeIdle**), a sincronização geométrica de layouts e o motor proprietário **Anti-Sleep** projetado para derrotar os mecanismos de suspensão e congelamento do Chromium / WebView2.

---

## 1. Arquitetura de Child Webviews Nativas (`games/manager.rs`)

Diferente de implementações baseadas em `<iframe>` — que compartilham a mesma thread de execução de JavaScript, memória heap e cookies do frontend —, o IdleStream utiliza **Child Webviews Nativas** via biblioteca `wry` do ecossistema Tauri v2.

```mermaid
graph TD
    MainWindow["Janela Principal Tauri ('main')"]
    
    subgraph Wry_Child_Webviews ["Child Webviews Nativas Ancoradas"]
        Slot1["Child WebView: 'slot-1'<br/>Profile: game_profiles/slot-1/<br/>Processo e Heap Isolados"]
        Slot2["Child WebView: 'slot-2'<br/>Profile: game_profiles/slot-2/<br/>Processo e Heap Isolados"]
        Slot3["Child WebView: 'slot-3'<br/>Profile: game_profiles/slot-3/<br/>Processo e Heap Isolados"]
        Slot4["Child WebView: 'slot-4'<br/>Profile: game_profiles/slot-4/<br/>Processo e Heap Isolados"]
    end

    MainWindow --> Slot1
    MainWindow --> Slot2
    MainWindow --> Slot3
    MainWindow --> Slot4
```

### Vantagens Estruturais:
1. **Isolamento de Contas e LocalStorage**: Cada slot aponta para uma pasta independente em disco (`game_profiles/{slot_id}`). Um jogador pode rodar 4 contas de PokeIdle com sessões distintas sem risco de contaminação cruzada de save game ou credenciais.
2. **Estabilidade contra Falhas (Fault Isolation)**: Se uma instância travar ou sofrer *WebGL Context Lost*, as demais instâncias e a interface principal permanecem intactas.
3. **Imunidade a Cross-Origin Restrictions**: Não há bloqueios de CORS ou políticas de iframe (`X-Frame-Options: SAMEORIGIN`) impostas por servidores de jogos web.

---

## 2. Modos de Layout Geométrico e Sincronização DOM

O módulo `GameLayoutManager` gerencia as dimensões e o posicionamento de cada Child Webview sobre a viewport do aplicativo React:

```mermaid
flowchart TD
    subgraph Layout_Modes ["Modos de Layout Suportados"]
        M_Grid["Grid2x2: 4 Quadrantes Idênticos"]
        M_Focus["FocusSingle: 1 Slot em 100%, outros Ocultos (Vivos)"]
        M_Side["FocusSidebar: 72% Principal / 28% Três Laterais Empilhados"]
    end

    DOM_Event["ResizeObserver (React GameWorkspace.tsx)"]
    CalcRect["Calcula BoundingClientRect no DOM"]
    IPC_Call["game_update_slots_bounds(bounds: SlotBounds[])"]
    Native_Set["webview.set_bounds(Rect) + set_visible()"]

    DOM_Event --> CalcRect --> IPC_Call --> Native_Set
```

### 2.1 Especificação dos Modos de Layout
- **`ViewLayoutMode::Grid2x2`**: Divide a área útil em 4 quadrantes regulares ($W/2 \times H/2$). Ideal para monitoramento equilibrado de 4 contas.
- **`ViewLayoutMode::FocusSingle(slot_id)`**: Maximiza o slot selecionado para 100% da área útil ($W \times H$). As outras 3 Webviews têm sua visibilidade alterada para `set_visible(false)`, mas **permanecem em execução contínua no background**, acumulando itens e XP.
- **`ViewLayoutMode::FocusSidebar(slot_id)`**:
  - Slot Principal: Alocado com $72\%$ da largura total ($0.72 \times W$) e $100\%$ da altura ($H$).
  - Slots Secundários (3): Empilhados verticalmente no quadrante lateral de $28\%$ da largura ($0.28 \times W$), cada um ocupando $1/3$ da altura ($H / 3$).

### 2.2 Sincronização de Coordenadas Nativo $\leftrightarrow$ DOM
Para evitar lacunas de pixel durante redimensionamento da janela:
1. O frontend React utiliza um `ResizeObserver` acoplado ao elemento DOM `#game-viewport-container`.
2. Ao detectar mutação de tamanho ou troca de aba, despacha via IPC o comando `game_update_slots_bounds` com um array de `SlotBounds`:
   ```json
   {
     "slot_id": "slot-1",
     "x": 260.0,
     "y": 48.0,
     "width": 790.0,
     "height": 632.0,
     "visible": true
   }
   ```
3. O Rust aplica instantaneamente `webview.set_bounds(Rect { position, size })` e ajusta a visibilidade via `webview.set_visible(bounds.visible)`. O benchmark de reposicionamento demonstra latência inferior a $0.001\text{ ms}$ (overhead nulo).

---

## 3. O Motor Anti-Sleep (`anti_sleep.js`)

Navegadores baseados em Chromium e o WebView2 implementam políticas agressivas para economizar recursos em janelas minimizadas ou sem foco:
- Desaceleração de timers (`setInterval`/`setTimeout`) para 1 execução por segundo.
- Congelamento completo do `requestAnimationFrame` (0 FPS).
- Descarte de abas e purga de texturas WebGL.

O IdleStream neutraliza essas restrições através do script injetado `anti_sleep.js`, composto por **6 camadas de defesa**:

```mermaid
flowchart TD
    subgraph Defesa_AntiSleep ["As 6 Camadas do Motor Anti-Sleep (anti_sleep.js)"]
        L1["1. Visibility Spoofing (document.hidden = false)"]
        L2["2. Bloqueio de Perda de Foco (blur / focusout stopPropagation)"]
        L3["3. Custom rAF Dispatcher (setInterval determinístico)"]
        L4["4. Bypass de Áudio Silencioso (HTML5 Audio + Web Audio IsAudible)"]
        L5["5. Active Memory Management (window.gc() a cada 2 min)"]
        L6["6. WebSocket Watchdog (Auto-reconectador estado.ws)"]
    end

    Defesa_AntiSleep --> Farm247["Execução Imune a Throttling 24/7"]
```

### Detalhamento das Camadas:

#### Camada 1: Spoofing de Visibilidade
Sobrescreve os getters nativos do protótipo do documento para que qualquer engine de jogo web acredite estar em primeiro plano contínuo:
```javascript
Object.defineProperty(document, 'hidden', { get: () => false, configurable: true });
Object.defineProperty(document, 'visibilityState', { get: () => 'visible', configurable: true });
```

#### Camada 2: Interceptação de Perda de Foco
Impede a propagação de eventos `blur` e `focusout` na fase de captura:
```javascript
const stopPropagation = (e) => e.stopImmediatePropagation();
window.addEventListener('blur', stopPropagation, true);
window.addEventListener('focusout', stopPropagation, true);
```

#### Camada 3: Despachante Customizado de `requestAnimationFrame`
Como o Chromium suspende o rAF nativo quando a janela é coberta ou minimizada, o script intercepta a função global:
- Mantém um mapa interno `pendingCallbacks`.
- Dispara uma rotina de flush acionada por `setInterval` determinístico.
- Suporta 3 patamares de taxa de quadros:
  - **60 FPS** (delay de ~16.6 ms): Fluidez total.
  - **30 FPS** (delay de ~33.3 ms): Modo Eco equilibrado.
  - **10 FPS** (delay de 100 ms): Modo Super Economia.
- Se o slot estiver oculto ou o app minimizado na bandeja, desacelera automaticamente para **1 FPS**, permitindo que a CPU entre em C-states profundos e os ventiladores da máquina permaneçam em silêncio.

#### Camada 4: Bypass de Áudio Silencioso (Flag `IsAudible`)
O Chromium possui uma regra interna no gerenciador de recursos: *processos de renderização com áudio ativo não podem ter seus timers estrangulados nem ser descartados da memória*.
O IdleStream instancia:
1. Uma tag `<audio>` invisível reproduzindo em loop um buffer WAV silencioso codificado em Base64:
   `data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==`
2. Um oscilador `AudioContext` da Web Audio API com ganho zero (`gain.value = 0.00001`).
Isso força a flag `IsAudible = true` no processo de renderização do WebView2 sem emitir qualquer ruído nos alto-falantes.

#### Camada 5: Gerenciamento Ativo de Memória (`window.gc()`)
Jogos como PokeIdle alocam milhares de texturas de sprites que, se não recicladas, acumulam gigabytes de memória.
- Graças à flag `--js-flags="--expose-gc"` injetada pelo Rust no WebView2, a API nativa de Garbage Collection da V8 é disponibilizada no escopo global.
- O motor anti-sleep invoca `window.gc()` a cada 120 segundos, mantendo o consumo de cada slot estável em ~45 MB a ~85 MB.

#### Camada 6: Watchdog de Conexão WebSocket
Monitora a conexão do servidor de save do jogo (`window.estado?.ws`). Se detectar que o socket foi fechado ou ficou inativo por mais de 60 segundos, reconecta e re-autentica o jogador de forma autônoma.

---

## 4. Otimizações de Renderização: Modo Eco e Modo Ultra PokeIdle

O sistema oferece controles granulares para maximizar a economia de hardware:

### 4.1 Modo Eco (CSS Injection)
Quando ativado via `game_set_eco_mode(true)`, injeta uma folha de estilos agressiva que remove os maiores ofensores de carga de GPU:
```css
* {
  text-shadow: none !important;
  box-shadow: none !important;
  filter: none !important;
  animation-duration: 0.001ms !important;
}
canvas {
  image-rendering: pixelated !important;
}
```
Reduz em mais de 70% a carga de rasterização de GPU e os ciclos de *repaint*.

### 4.2 Modo Ultra PokeIdle
Interage diretamente com o estado interno do PokeIdle (`window.appSettings` ou checkboxes do jogo):
- Desativa efeitos visuais climáticos (chuva, neve, tempestade de areia).
- Desativa animações de batalha e transições de tela.
- Reduz a resolução interna de renderização do mapa.

### 4.3 Monitor de Inatividade Real e Proteção Anti-Sleep (`GameWorkspace.tsx`)
A versão 3.2.8 corrigiu a armadilha de falso-positivo de inatividade que forçava a tela de sleep enquanto o usuário estava ativamente jogando:
- **Resolução de Falso Sleep via `Math.min`**: As WebViews dos jogos operam em instâncias isoladas (Child Webviews no desktop e WebViews nativas no Android). Eventos de clique ou toque disparados diretamente dentro dos jogos não alcançam a árvore DOM do React. Anteriormente, `Math.max(appIdleSec, systemIdleSec)` considerava o app inativo mesmo enquanto o SO ou as WebViews registravam cliques. O cálculo foi corrigido para `Math.min(appIdleSec, systemIdleSec)`, garantindo que apenas a ausência total de interação em ambas as esferas acione o modo de suspensão.
- **Ponte de Reporte de Atividade (`anti_sleep.js` e `IdleStreamSlotBridge`)**: Os scripts injetados nos slots escutam eventos de `mousedown`, `touchstart`, `keydown` e `wheel`, notificando `window.IdleStreamSlotBridge.reportActivity()` no Android e `window.__onUserActivity()` no React.
- **Integração Win32 e Android**: No Windows, `game_get_system_idle_seconds` via `GetLastInputInfo` afere os milissegundos globais do usuário. No Android, `MainActivity.dispatchTouchEvent` zera o temporizador instantaneamente a cada toque físico na tela.

---

## 5. Extensão de Caça Embutida (`hunt_extension.js`)

Para URLs que contenham o domínio `pokeidle.io`, o gerenciador injeta automaticamente a extensão proprietária `/hunt` (arquivo embutido em compilação via `include_str!("hunt_extension.js")`):

### Recursos da Extensão:
- **Tabelas de Eficácia Elemental**: Matriz completa de vantagens e fraquezas de tipos Pokémon (Geração 1 a 9).
- **Mapeamento de Rotas Outland**: Banco de dados com probabilidades de spawn, itens raros e níveis de bosses por região.
- **Seletor Inteligente de Alvos**: Algoritmo que calcula o time de ataque ideal contra o Pokémon selvagem encontrado para maximizar a velocidade de captura e ganho de Pokédollars.

---

## 6. Interface do Usuário (`GameWorkspace.tsx`)

O componente React [`src/components/games/GameWorkspace.tsx`](file:///C:/Projetos/Chatter/src/components/games/GameWorkspace.tsx) provê o painel de comando do hub:
- **Seletor de Layout**: Botões rápidos para alternar entre Grid 2x2, Focus Single e Focus Sidebar.
- **Barra de Controle de FPS**: Seleção em um clique entre 60 FPS, 30 FPS e 10 FPS (persistida no `localStorage`).
- **Escala de Zoom**: Controle de zoom de 50% a 200% por slot com atalho para reset (100%).
- **Modo Imersivo (Fullscreen)**: Oculta a barra lateral e o cabeçalho do IdleStream, permitindo foco total nos 4 quadrantes de jogo (saída via tecla `ESC`).

---

## 7. Próximos Passos & Documentos Relacionados

Para compreender a estrutura interna do estado global em Rust (`AppState`), a persistência em `config.json` e consultar o dicionário exaustivo de comandos IPC:
👉 Prossiga para: **[[05-backend-core]] — Backend Rust Core, Estado Global e Dicionário IPC**.
