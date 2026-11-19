import { defineConfig } from 'vite';

// Repositórios de projeto ficam em /<repositório>/; sites de usuário ou
// organização (<nome>.github.io) ficam na raiz do domínio.
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];
const githubPagesBase = repository && !repository.toLowerCase().endsWith('.github.io')
  ? `/${repository}/`
  : '/';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === 'true' ? githubPagesBase : '/',
});
