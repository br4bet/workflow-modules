#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('🔧 Instalando dependências da GitHub Action...');

try {
  // Verificar se package.json existe
  if (existsSync('package.json')) {
    console.log('📦 Instalando dependências...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependências instaladas com sucesso!');
  } else {
    console.log('⚠️ package.json não encontrado, pulando instalação...');
  }
} catch (error) {
  console.error('❌ Erro ao instalar dependências:', error.message);
  process.exit(1);
}
