const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, '..', 'Docs');
const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.md'));

console.log('🔍 Executando Bateria de Validação da Documentação Técnica...');
console.log(`📂 Diretório: ${docsDir}`);
console.log(`📄 Arquivos MD encontrados: ${files.length} (${files.join(', ')})`);

const requiredKeys = [
  'id:', 'title:', 'category:', 'tags:', 'related_code:', 
  'wiki_links:', 'status:', 'version:', 'last_updated:', 'summary:'
];

let hasErrors = false;

for (const file of files) {
  console.log(`\n------------------------------------------------------------`);
  console.log(`📘 Validando: ${file}`);
  const content = fs.readFileSync(path.join(docsDir, file), 'utf8');

  // 1. Frontmatter check
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!fmMatch) {
    console.error(`  ❌ [FALHA] Frontmatter ausente ou delimitadores incorretos!`);
    hasErrors = true;
    continue;
  }
  console.log(`  ✓ [OK] Delimitadores YAML frontmatter presentes.`);
  const fm = fmMatch[1];
  for (const key of requiredKeys) {
    if (!fm.includes(key)) {
      console.error(`  ❌ [FALHA] Campo obrigatório ausente: ${key}`);
      hasErrors = true;
    } else {
      console.log(`  ✓ [OK] Campo verificado: ${key}`);
    }
  }

  // 2. Mermaid blocks check
  const mermaidMatches = content.match(/```mermaid[\s\S]*?```/g) || [];
  console.log(`  ✓ [INFO] Total de diagramas Mermaid: ${mermaidMatches.length}`);

  mermaidMatches.forEach((m, idx) => {
    const lines = m.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const diagramHeader = lines[1] || '';
    console.log(`    📊 Diagrama #${idx + 1}: ${diagramHeader} (${lines.length - 2} instruções)`);
    
    // Check for common Mermaid label syntax traps: label with unquoted parentheses
    lines.forEach((line, lineIdx) => {
      // Check for unquoted [Text (Extra)] inside labels: e.g., id[Text (Extra)] without quotes
      const unquotedBracketsWithParens = line.match(/\b\w+\[(?!"|').*?\(.*?\).*?(?!"|')\]/);
      if (unquotedBracketsWithParens) {
        console.warn(`    ⚠️ [AVISO] Rótulo Mermaid potencialmente não protegido por aspas na linha ${lineIdx + 1}: ${line}`);
      }
    });
  });

  // 3. Wiki Links extraction
  const wikiLinks = content.match(/\[\[(.*?)\]\]/g) || [];
  console.log(`  ✓ [INFO] Wiki Links detectados (${wikiLinks.length}):`);
  wikiLinks.forEach(w => console.log(`      🔗 ${w}`));
}

if (!hasErrors) {
  console.log(`\n============================================================`);
  console.log(`✅ SUCESSO: Todos os arquivos inspecionados passaram na validação!`);
  console.log(`============================================================\n`);
  process.exit(0);
} else {
  console.error(`\n❌ ERRO: Falhas detectadas nos arquivos de documentação.`);
  process.exit(1);
}
