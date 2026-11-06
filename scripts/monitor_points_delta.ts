import fs from 'node:fs';
import path from 'node:path';

const GQL_ENDPOINT = 'https://gql.twitch.tv/gql';
const TWITCH_CLIENT_ID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';

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

async function getChannelPoints(channelLogin: string, token: string): Promise<number | null> {
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
    return typeof balance === 'number' ? balance : null;
  } catch (e) {
    return null;
  }
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const appData = process.env.APPDATA || '';
  const configPath = path.join(appData, 'com.idlestream.app', 'config.json');
  const raw = fs.readFileSync(configPath, 'utf8');
  const config = JSON.parse(raw);

  const twitchAccounts = config.accounts.filter((a: any) => a.platform === 'twitch');
  const targetChannels = ['cogu', 'rodil'];

  console.log('--- Coletando Amostra T0 (Antes) ---');
  const t0: Record<string, Record<string, number | null>> = {};

  for (const acc of twitchAccounts) {
    t0[acc.username] = {};
    for (const ch of targetChannels) {
      const pts = await getChannelPoints(ch, acc.oauth_token);
      t0[acc.username][ch] = pts;
      console.log(`[T0] ${acc.username} -> ${ch}: ${pts} pts`);
    }
  }

  console.log('\nAguardando 80 segundos para medir ciclo de acréscimo (+10 pts por canal a cada ~1-2 min)...');
  await sleep(80000);

  console.log('\n--- Coletando Amostra T1 (Depois de 80s) ---');
  for (const acc of twitchAccounts) {
    for (const ch of targetChannels) {
      const pts = await getChannelPoints(ch, acc.oauth_token);
      const prev = t0[acc.username][ch];
      const delta = (pts !== null && prev !== null) ? pts - prev : 'N/A';
      const statusIcon = typeof delta === 'number' && delta > 0 ? '🟢 +PONTOS GANHOS!' : (delta === 0 ? '🟡 Sem alteração no minuto' : '⚪');
      console.log(`[T1] ${acc.username} -> ${ch}: ${pts} pts (Delta: ${delta > 0 ? `+${delta}` : delta}) ${statusIcon}`);
    }
  }
}

main().catch(console.error);
