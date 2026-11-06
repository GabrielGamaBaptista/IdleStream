import fs from 'node:fs';
import path from 'node:path';

const GQL_ENDPOINT = 'https://gql.twitch.tv/gql';
const TWITCH_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

interface Account {
  id: string;
  platform: string;
  label: string;
  username: string;
  oauth_token?: string;
  kick_session?: string;
  session_token?: string;
  enabled: boolean;
}

interface StreamConfig {
  id: string;
  channel_slug: string;
  platform: string;
  auto_start: boolean;
}

interface AppConfig {
  accounts: Account[];
  streams: StreamConfig[];
}

interface StreamerStats {
  slug: string;
  channelId?: string;
  isLive: boolean;
  streamId?: string;
  avgDurationHours: number;
  priorityRank: number;
}

async function queryTwitchGql(query: string, variables: Record<string, any>, token?: string) {
  const headers: Record<string, string> = {
    'Client-Id': TWITCH_CLIENT_ID,
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  };
  if (token) {
    const cleanToken = token.replace(/^oauth:/, '').trim();
    headers['Authorization'] = `OAuth ${cleanToken}`;
  }

  const res = await fetch(GQL_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });
  return await res.json();
}

async function checkChannel(slug: string): Promise<{ channelId?: string; isLive: boolean; streamId?: string; avgHours: number }> {
  const query = `
    query CheckChannel($login: String!) {
      user(login: $login) {
        id
        stream {
          id
          type
        }
        videos(first: 5, type: ARCHIVE, sort: TIME) {
          edges {
            node {
              lengthSeconds
            }
          }
        }
      }
    }
  `;

  try {
    const data = await queryTwitchGql(query, { login: slug.toLowerCase() });
    const user = data?.data?.user;
    if (!user) return { isLive: false, avgHours: 0 };

    const isLive = Boolean(user.stream && (user.stream.type === 'live' || !user.stream.type));
    const streamId = user.stream?.id;
    const channelId = user.id;

    const edges = user.videos?.edges || [];
    let avgHours = 0;
    if (edges.length > 0) {
      const totalSec = edges.reduce((acc: number, e: any) => acc + (e.node?.lengthSeconds || 0), 0);
      avgHours = Math.round((totalSec / edges.length / 3600) * 10) / 10;
    }

    return { channelId, isLive, streamId, avgHours };
  } catch (e) {
    return { isLive: false, avgHours: 0 };
  }
}

async function getChannelPoints(channelLogin: string, token: string): Promise<{ balance?: number; error?: string }> {
  const query = `
    query ChannelPointsBalance($channelLogin: String!) {
      channel(name: $channelLogin) {
        id
        self {
          communityPoints {
            balance
          }
        }
      }
    }
  `;
  try {
    const res = await queryTwitchGql(query, { channelLogin: channelLogin.toLowerCase() }, token);
    const balance = res?.data?.channel?.self?.communityPoints?.balance;
    if (typeof balance === 'number') {
      return { balance };
    }
    return { error: JSON.stringify(res?.errors || 'No balance returned') };
  } catch (e: any) {
    return { error: e.message };
  }
}

async function main() {
  const appData = process.env.APPDATA || '';
  const configPath = path.join(appData, 'com.idlestream.app', 'config.json');

  if (!fs.existsSync(configPath)) {
    console.error(`Config não encontrado em: ${configPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  const config: AppConfig = JSON.parse(raw);

  const twitchAccounts = config.accounts.filter(a => a.platform === 'twitch');
  const twitchStreams = config.streams.filter(s => s.platform === 'twitch');

  console.log('================================================================');
  console.log('  🔍 DIAGNÓSTICO DO SISTEMA EM EXECUÇÃO (TWITCH LIVE & PRIORIDADE)');
  console.log('================================================================');
  console.log(`\n📌 Contas Twitch Detectadas: ${twitchAccounts.length}`);
  for (const acc of twitchAccounts) {
    const hasToken = Boolean(acc.oauth_token);
    const tokenPreview = acc.oauth_token ? `${acc.oauth_token.slice(0, 6)}...` : 'NENHUM';
    console.log(`   - [${acc.username || acc.label}] Token Presente: ${hasToken} (Início: ${tokenPreview})`);
  }

  console.log(`\n📌 Streamers Twitch Cadastrados: ${twitchStreams.length}`);
  console.log('   Analisando status ao vivo e calculando tempo médio de transmissão (uptime VOD)...');

  const statsList: StreamerStats[] = [];

  for (const s of twitchStreams) {
    const info = await checkChannel(s.channel_slug);
    statsList.push({
      slug: s.channel_slug,
      channelId: info.channelId,
      isLive: info.isLive,
      streamId: info.streamId,
      avgDurationHours: info.avgHours,
      priorityRank: 0,
    });
  }

  // Ordena por uptime médio desc
  statsList.sort((a, b) => {
    if (b.avgDurationHours !== a.avgDurationHours) {
      return b.avgDurationHours - a.avgDurationHours;
    }
    return a.slug.localeCompare(b.slug);
  });

  statsList.forEach((s, idx) => {
    s.priorityRank = idx + 1;
  });

  console.log('\n📊 FILA DE PRIORIDADE COMPUTADA (DO 1º AO ÚLTIMO POR UPTIME MÉDIO):');
  console.log('-----------------------------------------------------------------------------------------');
  console.log('| Rank | Canal            | Status    | Uptime Médio | Alocação por Conta                     |');
  console.log('-----------------------------------------------------------------------------------------');

  let activeCount = 0;
  for (const s of statsList) {
    let allocation = '🔴 Offline';
    if (s.isLive) {
      activeCount++;
      if (activeCount <= 2) {
        allocation = `🟢 ATIVO #${activeCount} (Pontuando no Slot ${activeCount})`;
      } else {
        allocation = `🟡 STANDBY VIGIL #${activeCount} (Aguardando vaga)`;
      }
    }
    const rankStr = `#${s.priorityRank}`.padEnd(4);
    const slugStr = s.slug.padEnd(16);
    const statusStr = s.isLive ? '🟢 ONLINE ' : '⚪ OFFLINE';
    const hoursStr = `${s.avgDurationHours}h/live`.padEnd(12);
    console.log(`| ${rankStr} | ${slugStr} | ${statusStr} | ${hoursStr} | ${allocation.padEnd(38)} |`);
  }
  console.log('-----------------------------------------------------------------------------------------');

  const onlineStreamers = statsList.filter(s => s.isLive);
  console.log(`\n⚡ Total de Streamers Online no momento: ${onlineStreamers.length}`);
  if (onlineStreamers.length > 0) {
    const active1 = onlineStreamers[0]?.slug;
    const active2 = onlineStreamers[1]?.slug;
    console.log(`👉 Top 1 Prioridade Online: ${active1}`);
    if (active2) {
      console.log(`👉 Top 2 Prioridade Online: ${active2}`);
    }
    if (onlineStreamers.length > 2) {
      const standbys = onlineStreamers.slice(2).map(s => s.slug).join(', ');
      console.log(`👉 Em Standby Vigil (sem consumir banda ou estourar teto): ${standbys}`);
    }
  }

  console.log('\n================================================================');
  console.log('  💰 SALDO DE PONTOS DE CANAL POR CONTA NOS STREAMERS ATIVOS');
  console.log('================================================================');

  for (const acc of twitchAccounts) {
    console.log(`\n👤 Conta: ${acc.username || acc.label}`);
    if (!acc.oauth_token) {
      console.log('   ⚠️ Nenhum token de autenticação cadastrado nesta conta.');
      continue;
    }

    if (onlineStreamers.length === 0) {
      console.log('   Nenhum streamer online no momento para consultar saldo ativo.');
      // Testa o primeiro da lista geral
      const target = statsList[0]?.slug;
      if (target) {
        const pts = await getChannelPoints(target, acc.oauth_token);
        console.log(`   Saldo em '${target}' (Offline): ${pts.balance !== undefined ? `${pts.balance} pts` : `Erro: ${pts.error}`}`);
      }
    } else {
      for (const s of onlineStreamers.slice(0, 3)) {
        const pts = await getChannelPoints(s.slug, acc.oauth_token);
        const statusLabel = s.priorityRank <= 2 ? 'Ativo' : 'Standby';
        console.log(`   - Canal: ${s.slug} (${statusLabel}) -> Saldo Atual: ${pts.balance !== undefined ? `${pts.balance.toLocaleString()} pontos` : `Erro: ${pts.error}`}`);
      }
    }
  }

  console.log('\n================================================================');
  console.log('  🎯 VALIDAÇÃO DE CONEXÃO E INTEGRIDADE TWITCH');
  console.log('================================================================');
  console.log('Testando requisição de integridade (Client-Integrity) contra a Twitch...');
  try {
    const testIntegrity = await fetch('https://gql.twitch.tv/integrity', {
      method: 'POST',
      headers: {
        'Client-Id': TWITCH_CLIENT_ID,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });
    const integrityJson = await testIntegrity.json();
    console.log(`✓ Endpoint de Integridade respondeu: token presente = ${Boolean(integrityJson?.token)}`);
  } catch (e: any) {
    console.log(`Falha ao testar integridade: ${e.message}`);
  }

  console.log('\nDiagnóstico concluído!');
}

main().catch(console.error);
